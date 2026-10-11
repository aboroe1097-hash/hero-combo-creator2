import { readVtsScoreRequest, VtsScoreError, VTS_SCORE_POWER_FIELDS } from './vts-score.js';
import {
  COMPETITION_SCHEDULE_DOC_PATH,
  normalizeCompetitionSchedule,
} from './competition-phase.js';

const ACTIONS = new Set(['power-baseline', 'power-final']);
const META_KEYS = [
  'action',
  'expectedRevision',
  'signupRevision',
  'reason',
  'acceptLate',
  'method',
];
const SCORE_KEYS = [
  'seasonId',
  'submissionUid',
  'gameName',
  'powerValues',
  'deadTroopCounts',
  'ocr',
];
const error = (status, code, message) => new VtsScoreError(status, code, message);
const data = (snapshot) => snapshot?.exists && snapshot.data();
const revision = (record) => (Number.isSafeInteger(record?.revision) ? record.revision : 0);

export function isCompetitionAdminEntryAction(action) {
  return ACTIONS.has(action);
}

export function readCompetitionAdminEntry(body) {
  const keys = [...META_KEYS, ...SCORE_KEYS].sort();
  if (
    !body ||
    Object.keys(body).sort().join('|') !== keys.join('|') ||
    !ACTIONS.has(body.action) ||
    !['manual', 'screenshot'].includes(body.method) ||
    typeof body.acceptLate !== 'boolean' ||
    ![body.expectedRevision, body.signupRevision].every(
      (value) => Number.isSafeInteger(value) && value >= 0
    ) ||
    typeof body.reason !== 'string' ||
    !body.reason.trim() ||
    body.reason.length > 1000
  ) {
    throw error(400, 'invalid_request', 'Review the values and provide a reason.');
  }
  const scoreBody = Object.fromEntries(SCORE_KEYS.map((key) => [key, body[key]]));
  const score = readVtsScoreRequest({
    headers: { 'content-type': 'application/json' },
    body: scoreBody,
  });
  return {
    ...score,
    ...Object.fromEntries(META_KEYS.map((key) => [key, body[key]])),
    reason: body.reason.trim(),
  };
}

// Called only after bohSignupAdmin verifies origin, revoked-token status,
// App Check and the authoritative admin claim. Member writes remain unchanged.
export async function saveCompetitionAdminEntry(dependencies, callerUid, input) {
  const nowMs = Math.trunc(Number((dependencies.now || Date.now)()));
  const configRef = dependencies.db.doc('boh_allstar_config/current');
  const signupRef = dependencies.db.doc(
    `boh_allstar/${input.seasonId}/submissions/${input.submissionUid}`
  );
  const final = input.action === 'power-final';
  const targetRef = final
    ? dependencies.db.doc(`boh_allstar/${input.seasonId}/raceScores/${input.submissionUid}`)
    : signupRef;
  let saved;
  await dependencies.db.runTransaction(async (transaction) => {
    const [configSnap, signupSnap, targetSnap, scheduleSnap] = await Promise.all([
      transaction.get(configRef),
      transaction.get(signupRef),
      final ? transaction.get(targetRef) : Promise.resolve(null),
      transaction.get(dependencies.db.doc(COMPETITION_SCHEDULE_DOC_PATH)),
    ]);
    if (data(configSnap)?.activeSeason !== input.seasonId)
      throw error(409, 'season_not_active', 'Reload the active competition season.');
    const signup = data(signupSnap);
    if (!signup || signup.status !== 'submitted')
      throw error(404, 'not_found', 'That signup was not found.');
    if (signup.gameName !== input.gameName)
      throw error(409, 'signup_changed', 'The signup identity changed. Reload before saving.');
    const existing = final ? data(targetSnap) : signup;
    if (revision(existing) !== input.expectedRevision || revision(signup) !== input.signupRevision)
      throw error(
        409,
        'revision_conflict',
        'Another operator changed this record. Reload before saving.'
      );
    const schedule = normalizeCompetitionSchedule(data(scheduleSnap));
    let acceptedLate = false;
    if (final && schedule?.seasonId === input.seasonId) {
      if (nowMs < schedule.reuploadOpensAt)
        throw error(
          403,
          'upload_not_started',
          'Final results cannot be saved before re-upload opens.'
        );
      acceptedLate = nowMs >= schedule.reuploadClosesAt;
      if (acceptedLate && !input.acceptLate)
        throw error(
          409,
          'late_confirmation_required',
          'Explicitly approve this late final result.'
        );
    }
    const adminEntry = {
      schemaVersion: 1,
      byUid: callerUid,
      atMs: nowMs,
      reason: input.reason,
      method: input.method,
      acceptedLate,
      previousPowerValues: existing
        ? Object.fromEntries(
            VTS_SCORE_POWER_FIELDS.map((field) => [
              field,
              (existing.powerValues || existing.confirmedStats || existing.stats)?.[field] ?? null,
            ])
          )
        : null,
      ...(final
        ? {}
        : {
            memberOwned:
              existing.adminEntry?.memberOwned ??
              (!existing.updatedBy || existing.updatedBy === existing.uid),
          }),
    };
    const timestamp = dependencies.serverTimestamp();
    const powers = { ...input.powerValues, deadTroopCounts: input.deadTroopCounts };
    saved = final
      ? {
          schemaVersion: 2,
          seasonId: input.seasonId,
          submissionUid: input.submissionUid,
          gameName: signup.gameName,
          baselineSubmissionRevision: revision(signup),
          powerValues: input.powerValues,
          deadTroopCounts: input.deadTroopCounts,
          ocr: input.ocr,
          submittedByUid: existing?.submittedByUid || callerUid,
          createdAt: existing?.createdAt || timestamp,
        }
      : {
          ...signup,
          stats: { ...signup.stats, ...powers },
          ...(signup.confirmedStats
            ? { confirmedStats: { ...signup.confirmedStats, ...powers } }
            : {}),
        };
    saved = {
      ...saved,
      revision: revision(existing) + 1,
      updatedAt: timestamp,
      updatedBy: callerUid,
      adminEntry,
    };
    transaction.set(targetRef, saved);
  });
  return { submissionUid: input.submissionUid, revision: saved.revision };
}
