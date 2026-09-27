// js/competition-growth.js
//
// Competition #12 growth: who grew their account the most between their
// baseline and the re-upload window.
//
// Baseline, per player (owner decision):
//   1. their earlier VtsScore uploads, found by account id first (the upload
//      document id is the signup uid its numbers belong to, so a rename does
//      not lose them), then by exact in-game name, then by a loose key that
//      folds owner-confirmed alias spellings and decorations ("〽️ Anne〽️").
//      Accounts the owner separated stay apart, and a name or loose key shared
//      by two accounts or two current signups is never auto-matched: folding
//      two accounts together (or giving a player someone else's history) would
//      silently decide a prize;
//   2. otherwise their Competition #12 sign-up stats.
// Each row records which it used as baselineSource: 'vtsscore-2026' | 'signup'.
//
// Ranking: percentage growth of Total Castle Power, tie-broken by absolute
// growth. A player without a valid re-upload inside the window is "not
// ranked" — never ranked as zero growth.
//
// Publishing: the public projection carries the values of consenting players
// only. Winners are named whatever their consent (a winner is a winner), but
// their numbers appear only when they consented.
//
// Pure: no Firestore, no DOM, no i18n. The admin tab (vts-score-admin-view.js)
// and tests call it; the member board reads only the published projection.

import { normalizeDeadTroopCounts } from './dead-troops.js';
import { protectedVtsAccountKey, resolveConfirmedPlayerAlias } from './vts-player-aliases.js';

export const COMPETITION_BASELINE_SEASON = 'season-2026';
// Same path as js/competition-schedule.js (a test keeps them equal); repeated
// so the admin bundle does not pull the schedule module in for one string.
export const COMPETITION_SCHEDULE_DOC_PATH = 'boh_allstar_competition/current';
export const COMPETITION_BOARD_DOC_PATH = 'boh_allstar_competition/board';
export const COMPETITION_MATCHES_DOC_PATH = 'boh_allstar_competition/matches';
export const COMPETITION_BOARD_SCHEMA_VERSION = 1;
export const COMPETITION_BOARD_MAX_ROWS = 200;
export const COMPETITION_BOARD_MAX_WINNERS = 20;
export const COMPETITION_WINNER_COUNT = 3;

export const COMPETITION_GROWTH_FIELDS = Object.freeze([
  'totalCastlePower',
  'troopPower',
  'buildingPower',
  'technologyPower',
  'heroCombatPower',
  'dragonPower',
  'unitSpecialtyPower',
  'artifactPower',
  'royalTechPower',
]);

function cleanText(value) {
  return String(value ?? '')
    .normalize('NFC')
    .trim();
}

function normalizeName(value) {
  return cleanText(value)
    .replace(/^(?:\s*(?:\((?:vts|vet|s)\)|(?:vts|vet|s)\)))+\s*/iu, '')
    .replace(/\s+/gu, ' ')
    .trim()
    .toLowerCase();
}

export function competitionExactNameKey(value) {
  return normalizeName(value);
}

/**
 * The key two spellings of one account share: confirmed/taught aliases resolve
 * to their canonical name first, then case, whitespace and the "(VTS)" prefix
 * are ignored. Exact after that — no fuzzy matching.
 */
export function competitionNameKey(name) {
  const raw = cleanText(name);
  if (!raw) return '';
  return normalizeName(resolveConfirmedPlayerAlias(raw) || raw);
}

/**
 * The loosest key two spellings of one account can share: the confirmed and
 * taught aliases resolve to their canonical spelling, then case, whitespace,
 * punctuation and decoration characters are dropped ("〽️ Anne〽️" → "anne",
 * "~Sarafino~" → "sarafino"). Accounts the owner separated from their
 * look-alikes keep their protected key so decoration stripping can never fold
 * them together. The loose key is only consulted after the exact key misses,
 * and a loose key shared by two upload accounts or claimed by two current
 * signups is refused exactly like an ambiguous exact name.
 */
export function competitionLooseNameKey(value) {
  const raw = cleanText(value);
  if (!raw) return '';
  const canonical = resolveConfirmedPlayerAlias(raw) || raw;
  const key = canonical
    .normalize('NFKC')
    .replace(/[^\p{L}\p{N}]+/gu, '')
    .toLowerCase();
  return protectedVtsAccountKey(raw, key);
}

function toMillis(value) {
  if (value == null) return NaN;
  if (typeof value === 'number') return value;
  if (value instanceof Date) return value.getTime();
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value === 'string') return Date.parse(value);
  if (typeof value.seconds === 'number') {
    return value.seconds * 1000 + Math.floor(Number(value.nanoseconds || 0) / 1e6);
  }
  return NaN;
}

function powerNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(typeof value === 'string' ? value.replaceAll(',', '') : value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

/**
 * The nine power values of a stats/powerValues map, or null when it has no
 * positive Total Castle Power (growth percentages need one).
 */
export function readCompetitionPowerValues(source) {
  if (!source || typeof source !== 'object') return null;
  const values = {};
  for (const field of COMPETITION_GROWTH_FIELDS) {
    values[field] =
      field === 'totalCastlePower'
        ? powerNumber(source.totalCastlePower ?? source.totalPower)
        : powerNumber(source[field]);
  }
  return values.totalCastlePower > 0 ? values : null;
}

/**
 * A sign-up's baseline values plus whether they are alive-only. Sign-ups from
 * before the dead-troop split existed (16.6.2) have no `deadTroopCounts`, so
 * their stats are the game's alive reading, not the competition total.
 */
function signupBaseline(submission) {
  for (const source of [submission?.confirmedStats, submission?.stats]) {
    const values = readCompetitionPowerValues(source);
    if (!values) continue;
    return { values, aliveOnly: !normalizeDeadTroopCounts(source?.deadTroopCounts) };
  }
  return { values: null, aliveOnly: false };
}

function recordUid(record) {
  return cleanText(record?.submissionUid || record?.uid || record?.id);
}

function uploadMillis(record) {
  const updated = toMillis(record?.updatedAt ?? record?.updatedAtMs);
  return Number.isFinite(updated) ? updated : toMillis(record?.createdAt);
}

/**
 * Indexes VtsScore uploads three ways, and matching tries them in order:
 *   1. by exact in-game name;
 *   2. by alias-resolved name (confirmed/taught aliases, then normalisation);
 *   3. by loose name — confirmed aliases resolved and decorations dropped —
 *      for spellings like "〽️ Anne〽️".
 * A name used by two different known accounts is ambiguous: it keeps every
 * candidate but proposes none. Each entry keeps its full `uploads` history,
 * newest first.
 * @returns {Map<string, {status: 'unique'|'ambiguous', candidates: Array, uploads: Array}>}
 */
export function buildVtsScoreBaselineIndex(raceScores = []) {
  const uploads = [];
  for (const record of Array.isArray(raceScores) ? raceScores : []) {
    const values = readCompetitionPowerValues(record?.powerValues);
    const gameName = cleanText(record?.gameName);
    if (!values) continue;
    const uploadedAt = uploadMillis(record);
    uploads.push({
      submissionUid: recordUid(record),
      gameName,
      values,
      deadTroopCounts: normalizeDeadTroopCounts(record?.deadTroopCounts),
      seasonId: cleanText(record?.seasonId),
      uploadedAt: Number.isFinite(uploadedAt) ? uploadedAt : 0,
    });
  }
  // Newest first, so the admin preview proposes the latest upload from any
  // earlier season no matter what order the records arrive in.
  uploads.sort(
    (left, right) =>
      right.uploadedAt - left.uploadedAt || left.seasonId.localeCompare(right.seasonId)
  );
  const index = new Map();
  index.byExactName = new Map();
  index.byLooseName = new Map();
  const grouped = new Map();
  const exactGrouped = new Map();
  const looseGrouped = new Map();
  const add = (map, key, upload) => {
    if (!key) return;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(upload);
  };
  for (const candidate of uploads) {
    add(grouped, competitionNameKey(candidate.gameName), candidate);
    add(exactGrouped, normalizeName(candidate.gameName), candidate);
    add(looseGrouped, competitionLooseNameKey(candidate.gameName), candidate);
  }
  for (const [key, list] of grouped) index.set(key, baselineEntry(list));
  for (const [key, list] of exactGrouped) index.byExactName.set(key, baselineEntry(list));
  for (const [key, list] of looseGrouped) index.byLooseName.set(key, baselineEntry(list));
  return index;
}

/**
 * Keep each account's latest upload. Matching is by in-game name alone, because
 * uploads from before member accounts existed carry no usable uid; a saved
 * dead-troop breakdown is optional history, not a matching requirement. A name
 * used by two different known accounts keeps every candidate but proposes none.
 */
function baselineEntry(uploads) {
  const accounts = new Set(
    uploads.map((upload) => upload.submissionUid).filter((submissionUid) => submissionUid)
  );
  const seen = new Set();
  const latest = [];
  for (const upload of uploads) {
    const identity = upload.submissionUid || 'legacy-name';
    if (seen.has(identity)) continue;
    seen.add(identity);
    latest.push(upload);
  }
  const status = accounts.size > 1 ? 'ambiguous' : 'unique';
  return {
    status,
    candidate: status === 'unique' ? latest[0] || null : null,
    candidates: latest,
    uploads,
  };
}

function lookupIndex(index, key) {
  if (!key || !index) return null;
  if (index instanceof Map) return index.get(key) || null;
  return Object.prototype.hasOwnProperty.call(index, key) ? index[key] : null;
}

/**
 * The proposal for one player, by in-game name only: the exact name first,
 * then the loose key that folds owner-confirmed aliases and decorations.
 * 'matched' (one candidate), 'ambiguous' (several, or contested by another
 * player), or 'none'.
 */
export function proposeBaselineMatch(
  player,
  index,
  { contestedKeys, contestedLooseKeys, autoMatch = false } = {}
) {
  const key = autoMatch ? normalizeName(player?.gameName) : competitionNameKey(player?.gameName);
  const source = autoMatch && index?.byExactName instanceof Map ? index.byExactName : index;
  const entry = lookupIndex(source, key);
  const contested = contestedKeys instanceof Set && contestedKeys.has(key);
  // Uploads from before accounts existed carry no uid, so the name joins stay
  // for exactly the records the account join cannot reach. Ambiguous or
  // contested names are refused rather than guessed — and a name another
  // signup also claims is surfaced as ambiguous even without any candidates,
  // so the admin table shows the conflict instead of a silent dash.
  if (entry?.candidates?.length && entry.status === 'unique' && !contested) {
    return {
      status: 'matched',
      key,
      candidates: entry.candidates,
      matchType: autoMatch ? 'exact-name' : null,
    };
  }
  if (entry?.candidates?.length || contested) {
    return {
      status: 'ambiguous',
      key,
      candidates: entry?.candidates || [],
      matchType: autoMatch ? 'exact-name' : null,
    };
  }
  // Last resort: the loose key folds confirmed alias spellings and
  // decorations, and refuses a key two upload accounts or two signups share.
  const looseKey = competitionLooseNameKey(player?.gameName);
  const looseEntry = lookupIndex(index?.byLooseName, looseKey);
  const looseContested = contestedLooseKeys instanceof Set && contestedLooseKeys.has(looseKey);
  if (looseEntry?.candidates?.length && looseEntry.status === 'unique' && !looseContested) {
    return {
      status: 'matched',
      key: looseKey,
      candidates: looseEntry.candidates,
      matchType: 'loose-name',
    };
  }
  if (looseEntry?.candidates?.length || looseContested) {
    return {
      status: 'ambiguous',
      key: looseKey,
      candidates: looseEntry?.candidates || [],
      matchType: 'loose-name',
    };
  }
  return { status: 'none', key, candidates: [] };
}

/**
 * The baseline a player is measured from.
 * @param {object} player the Competition #12 submission ({submissionUid, gameName, stats})
 * @param {object} options
 * @param {Map|object} options.vtsScore2026ByName index from buildVtsScoreBaselineIndex()
 * @param {object} [options.signup] the sign-up record (defaults to the player)
 * @param {object} [options.confirmation] the superadmin decision for this player:
 *   {decision: 'vtsscore'|'signup', matchedSubmissionUid}
 * @param {Set<string>} [options.contestedKeys] name keys claimed by several players
 * @returns {{values: object|null, source: 'vtsscore-2026'|'signup'|null, match: object}}
 */
export function resolveBaseline(player, options = {}) {
  const proposal = proposeBaselineMatch(player, options.vtsScore2026ByName, options);
  const confirmation = options.confirmation || null;
  const decision = cleanText(confirmation?.decision);
  const confirmedUid = cleanText(confirmation?.matchedSubmissionUid);
  const confirmed =
    decision === 'vtsscore'
      ? proposal.candidates.find((candidate) => candidate.submissionUid === confirmedUid) || null
      : null;
  const automatic =
    options.autoMatch === true && decision !== 'signup' && proposal.status === 'matched'
      ? proposal.candidates[0]
      : null;
  const selected = confirmed || automatic;
  const match = {
    status: proposal.status,
    decision:
      decision === 'signup'
        ? 'signup'
        : confirmed || automatic
          ? 'vtsscore'
          : decision === 'vtsscore'
            ? 'pending'
            : 'pending',
    confirmed: Boolean(confirmed),
    automatic: Boolean(automatic && !confirmed),
    matchType: proposal.matchType || null,
    candidate: selected || (proposal.status === 'matched' ? proposal.candidates[0] : null),
    candidates: proposal.candidates,
  };
  if (selected) {
    const source =
      selected.seasonId && selected.seasonId !== COMPETITION_BASELINE_SEASON
        ? 'vtsscore-prior'
        : 'vtsscore-2026';
    return {
      values: { ...selected.values },
      source,
      match,
      // A pre-16.6.2 upload has no dead-troop split: its values are the alive
      // reading. The board keeps every record's saved totals, so this flag
      // only drives the baseline note.
      aliveOnly: !selected.deadTroopCounts,
    };
  }
  const signup = signupBaseline(options.signup ?? player);
  return {
    values: signup.values,
    source: signup.values ? 'signup' : null,
    match,
    aliveOnly: signup.values ? signup.aliveOnly : false,
  };
}

function growthOf(baseline, final) {
  if (baseline === null || final === null) return { abs: null, pct: null };
  const abs = final - baseline;
  return { abs, pct: baseline > 0 ? (abs / baseline) * 100 : null };
}

/** One pairwise comparison for every category, plus its total-power growth. */
function growthStep(from, to) {
  const fields = {};
  for (const field of COMPETITION_GROWTH_FIELDS) {
    const start = from?.[field] ?? null;
    const end = to?.[field] ?? null;
    fields[field] = { from: start, to: end, ...growthOf(start, end) };
  }
  const total = fields.totalCastlePower;
  return { fields, growthAbs: total.abs, growthPct: total.pct };
}

function inWindow(ms, window) {
  if (!window) return true;
  const opens = toMillis(window.reuploadOpensAt ?? window.opensAt);
  const closes = toMillis(window.reuploadClosesAt ?? window.closesAt);
  if (!Number.isFinite(opens) || !Number.isFinite(closes)) return true;
  return Number.isFinite(ms) && ms >= opens && ms < closes;
}

/**
 * One player's growth row. The competition ranks sign-up -> final upload;
 * last season -> now is the personal growth tracker that rides along. Which
 * metric is ranked is decided in applyGrowthMode() once every row is known:
 * the tracker holds the board until the first final upload lands.
 * @param {object} player Competition #12 submission
 * @param {object} context
 * @param {{values: object|null, source: string|null, match?: object}} context.baseline from resolveBaseline()
 * @param {object|null} context.raceScore the player's current-season upload
 * @param {object} [context.window] {opensAt, closesAt}, or the schedule document (its
 *   reuploadOpensAt/reuploadClosesAt are used)
 */
export function computeGrowthRow(player, { baseline, raceScore = null, window = null } = {}) {
  const submissionUid = recordUid(player);
  const gameName = cleanText(player?.gameName) || cleanText(raceScore?.gameName) || submissionUid;
  const consent = player?.commitment?.publicComparisonConsent === true;
  const baselineValues = baseline?.values || null;
  // Only an earlier season's upload is the tracker's far side; a sign-up
  // baseline is the competition baseline, not last season's data.
  const lastSeasonValues = baselineValues && baseline?.source !== 'signup' ? baselineValues : null;
  const reuploadValues =
    raceScore &&
    Number(raceScore.schemaVersion) === 2 &&
    normalizeDeadTroopCounts(raceScore.deadTroopCounts)
      ? readCompetitionPowerValues(raceScore.powerValues)
      : null;
  // The three waypoints a player can have: last season's upload, today's
  // sign-up record, and the final upload once its window opens.
  const signupValues = readCompetitionPowerValues(player?.confirmedStats || player?.stats || null);
  let finalProblem = null;
  if (!raceScore) finalProblem = 'no-reupload';
  else if (!reuploadValues) finalProblem = 'invalid-reupload';
  else if (!inWindow(uploadMillis(raceScore), window)) finalProblem = 'outside-window';
  const usableReupload = finalProblem ? null : reuploadValues;
  // Waypoint values are the competition numbers as saved: dead troops are
  // already folded into Troop Power and Total Power when the record was saved,
  // so every pair compares full totals — dead troops are part of the player's
  // power and are never stripped back out.
  const steps = {
    baselineToSignup:
      lastSeasonValues && signupValues ? growthStep(lastSeasonValues, signupValues) : null,
    signupToReupload:
      signupValues && usableReupload ? growthStep(signupValues, usableReupload) : null,
    baselineToReupload:
      lastSeasonValues && usableReupload ? growthStep(lastSeasonValues, usableReupload) : null,
  };
  const tracker = steps.baselineToReupload || steps.baselineToSignup;
  const competition = steps.signupToReupload;
  const fields = {};
  for (const field of COMPETITION_GROWTH_FIELDS) {
    const base = tracker?.fields?.[field]?.from ?? null;
    const final = tracker?.fields?.[field]?.to ?? null;
    fields[field] = { baseline: base, final, ...growthOf(base, final) };
  }
  return {
    submissionUid,
    gameName,
    consent,
    baselineSource: baselineValues ? baseline.source : null,
    baselineAliveOnly: baseline?.aliveOnly === true,
    finalSource:
      steps.signupToReupload || steps.baselineToReupload
        ? 'reupload'
        : signupValues
          ? 'signup'
          : null,
    waypoints: { signup: signupValues, reupload: usableReupload },
    steps,
    match: baseline?.match || null,
    trackerAbs: tracker ? tracker.growthAbs : null,
    trackerPct: tracker ? tracker.growthPct : null,
    competitionAbs: competition ? competition.growthAbs : null,
    competitionPct: competition ? competition.growthPct : null,
    finalProblem,
    // Replaced by applyGrowthMode() with the ranked metric's fields.
    fields,
    growthAbs: tracker ? tracker.growthAbs : null,
    growthPct: tracker ? tracker.growthPct : null,
    notRankedReason: tracker ? null : 'no-baseline',
  };
}

/**
 * Picks the ranked metric for a whole board: the competition (sign-up -> final
 * upload) as soon as one valid final upload exists, otherwise the personal
 * growth tracker (last season -> now) so the board stays alive until the
 * re-upload window opens. Each row's growth fields then describe that metric.
 */
export function applyGrowthMode(rows = []) {
  const list = Array.isArray(rows) ? rows : [];
  const mode = list.some((row) => row.competitionAbs != null || row.competitionPct != null)
    ? 'competition'
    : 'tracker';
  return list.map((row) => {
    const step =
      mode === 'competition'
        ? row.steps?.signupToReupload || null
        : row.steps?.baselineToReupload || row.steps?.baselineToSignup || null;
    const fields = {};
    for (const field of COMPETITION_GROWTH_FIELDS) {
      const entry = step?.fields?.[field];
      // Without a ranked step the sign-up still ships as the displayed
      // baseline, so a pending member can see where they start.
      const base = step ? (entry?.from ?? null) : (row.waypoints?.signup?.[field] ?? null);
      const final = step ? (entry?.to ?? null) : null;
      fields[field] = { baseline: base, final, ...growthOf(base, final) };
    }
    return {
      ...row,
      mode,
      fields,
      growthAbs: step ? step.growthAbs : null,
      growthPct: step ? step.growthPct : null,
      notRankedReason: step
        ? null
        : mode === 'competition'
          ? row.finalProblem || 'no-baseline'
          : 'no-baseline',
    };
  });
}

function nameKeysClaimedTwice(players, keyFor = competitionNameKey) {
  const seen = new Map();
  for (const player of players) {
    const key = keyFor(player?.gameName);
    if (key) seen.set(key, (seen.get(key) || 0) + 1);
  }
  return new Set([...seen].filter(([, count]) => count > 1).map(([key]) => key));
}

/**
 * Every submitted Competition #12 player's growth row.
 * @param {object} input
 * @param {object[]} input.submissions current-season submissions
 * @param {object[]} input.raceScores current-season uploads (keyed by submissionUid)
 * @param {object[]} input.baselineRaceScores season-2026 uploads
 * @param {object} [input.confirmations] {[submissionUid]: {decision, matchedSubmissionUid}}
 * @param {object} [input.window] the re-upload window
 */
export function buildCompetitionGrowthRows({
  submissions = [],
  raceScores = [],
  baselineRaceScores = [],
  confirmations = {},
  window = null,
  autoMatch = false,
  seasonId = '',
} = {}) {
  const players = (Array.isArray(submissions) ? submissions : []).filter(
    (submission) => cleanText(submission?.status) === 'submitted' && recordUid(submission)
  );
  const scores = new Map(
    (Array.isArray(raceScores) ? raceScores : []).map((score) => [recordUid(score), score])
  );
  const index = buildVtsScoreBaselineIndex(baselineRaceScores);
  const nameKey = autoMatch ? (name) => normalizeName(name) : competitionNameKey;
  const contestedKeys = nameKeysClaimedTwice(players, nameKey);
  const contestedLooseKeys = nameKeysClaimedTwice(players, competitionLooseNameKey);
  // Every submitted player's growth row, with the mode applied once the whole
  // set is known.
  return applyGrowthMode(
    players.map((player) => {
      const submissionUid = recordUid(player);
      const raceScore = scores.get(submissionUid) || null;
      const baseline = resolveBaseline(player, {
        vtsScore2026ByName: index,
        contestedKeys,
        contestedLooseKeys,
        confirmation: confirmations?.[submissionUid] || null,
        autoMatch,
      });
      const row = computeGrowthRow(player, { baseline, raceScore, window });
      // Everything this player ever uploaded, newest first: the current-season
      // upload plus the earlier uploads matched by in-game name.
      const key = nameKey(player?.gameName);
      const looseKey = competitionLooseNameKey(player?.gameName);
      const uploads = [];
      if (raceScore) {
        const values = readCompetitionPowerValues(raceScore?.powerValues);
        const uploadedAt = uploadMillis(raceScore);
        if (values) {
          uploads.push({
            seasonId: cleanText(seasonId),
            uploadedAt: Number.isFinite(uploadedAt) ? uploadedAt : 0,
            values,
          });
        }
      }
      const seenUploads = new Set();
      const pushUploads = (entry) => {
        for (const upload of entry?.uploads || []) {
          const identity = `${upload.seasonId}:${upload.submissionUid}:${upload.uploadedAt}`;
          if (seenUploads.has(identity)) continue;
          seenUploads.add(identity);
          uploads.push({
            seasonId: upload.seasonId,
            uploadedAt: upload.uploadedAt,
            values: upload.values,
          });
        }
      };
      const exactEntry = lookupIndex(
        autoMatch && index?.byExactName instanceof Map ? index.byExactName : index,
        key
      );
      if (exactEntry && exactEntry.status !== 'ambiguous' && !contestedKeys.has(key)) {
        pushUploads(exactEntry);
      } else {
        const looseEntry = lookupIndex(index?.byLooseName, looseKey);
        if (looseEntry && looseEntry.status !== 'ambiguous' && !contestedLooseKeys.has(looseKey)) {
          pushUploads(looseEntry);
        }
      }
      uploads.sort(
        (left, right) =>
          right.uploadedAt - left.uploadedAt || left.seasonId.localeCompare(right.seasonId)
      );
      return { ...row, uploads };
    })
  );
}

function byName(left, right) {
  return left.gameName.localeCompare(right.gameName, 'en', { sensitivity: 'base' });
}

/**
 * Orders the rankable rows (growth % desc, then absolute growth desc) and gives
 * equal rows the same rank (1, 1, 3). Rows without growth go to notRanked.
 */
export function rankCompetitionGrowth(rows = []) {
  const list = Array.isArray(rows) ? rows : [];
  const rankable = list.filter(
    (row) =>
      !row.notRankedReason && Number.isFinite(row.growthPct) && Number.isFinite(row.growthAbs)
  );
  const notRanked = list
    .filter((row) => !rankable.includes(row))
    .map((row) => ({
      ...row,
      rank: null,
      tied: false,
      notRankedReason: row.notRankedReason || 'no-baseline',
    }))
    .sort(byName);
  const sorted = [...rankable].sort(
    (left, right) =>
      right.growthPct - left.growthPct || right.growthAbs - left.growthAbs || byName(left, right)
  );
  const same = (a, b) =>
    Boolean(a && b && a.growthPct === b.growthPct && a.growthAbs === b.growthAbs);
  const ranked = [];
  sorted.forEach((row, position) => {
    const previous = ranked[position - 1];
    const rank = previous && same(previous, row) ? previous.rank : position + 1;
    ranked.push({ ...row, rank, tied: false });
  });
  ranked.forEach((row, position) => {
    row.tied = same(ranked[position - 1], row) || same(ranked[position + 1], row);
  });
  return { ranked, notRanked };
}

function round(value, digits) {
  if (!Number.isFinite(value)) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

/**
 * The public board contains only consenting players, including its rankings,
 * winners and counts.
 * @param {object[]|{ranked: object[], notRanked: object[]}} input rows or a ranking
 * @param {object} options
 * @param {string} options.seasonId
 * @param {string} [options.publishedAt] ISO time (defaults to now)
 * @param {number} [options.winnerCount]
 */
export function buildGrowthBoardProjection(input, options = {}) {
  const ranking = Array.isArray(input) ? rankCompetitionGrowth(input) : input;
  const ranked = Array.isArray(ranking?.ranked) ? ranking.ranked : [];
  const notRanked = Array.isArray(ranking?.notRanked) ? ranking.notRanked : [];
  const publicRanking = rankCompetitionGrowth(ranked.filter((row) => row.consent === true));
  const publicNotRanked = notRanked.filter((row) => row.consent === true);
  const winnerCount = Math.max(
    1,
    Math.trunc(Number(options.winnerCount) || COMPETITION_WINNER_COUNT)
  );
  const publicGrowth = (row) => ({
    growthPct: round(row.growthPct, 4),
    growthAbs: round(row.growthAbs, 0),
  });
  // Every upload a name ever had: the row's own history, newest first.
  const uploadHistory = (row) =>
    (Array.isArray(row.uploads) ? row.uploads : []).slice(0, 12).map((upload) => ({
      seasonId: cleanText(upload.seasonId),
      uploadedAt: Number.isFinite(upload.uploadedAt) ? upload.uploadedAt : 0,
      values: Object.fromEntries(
        Object.entries(upload.values || {})
          .filter(([, value]) => Number.isFinite(value))
          .map(([field, value]) => [field, round(value, 0)])
      ),
    }));
  const projectValues = (values) => {
    if (!values) return null;
    const out = {};
    for (const field of COMPETITION_GROWTH_FIELDS) {
      if (Number.isFinite(values[field])) out[field] = round(values[field], 0);
    }
    return Object.keys(out).length ? out : null;
  };
  const projectStep = (step) => {
    if (!step) return null;
    const fields = {};
    for (const field of COMPETITION_GROWTH_FIELDS) {
      const entry = step.fields?.[field];
      if (!entry) continue;
      fields[field] = {
        abs: Number.isFinite(entry.abs) ? round(entry.abs, 0) : null,
        pct: Number.isFinite(entry.pct) ? round(entry.pct, 4) : null,
      };
    }
    return {
      growthAbs: Number.isFinite(step.growthAbs) ? round(step.growthAbs, 0) : null,
      growthPct: Number.isFinite(step.growthPct) ? round(step.growthPct, 4) : null,
      fields,
    };
  };
  // Ranked and unranked names alike carry their history: an opted-in member
  // without a valid re-upload still has earlier uploads worth showing.
  const rows = [...publicRanking.ranked, ...publicNotRanked]
    .slice(0, COMPETITION_BOARD_MAX_ROWS)
    .map((row) => {
      const fields = {};
      for (const field of COMPETITION_GROWTH_FIELDS) {
        const entry = row.fields?.[field];
        // Baseline values ship even without a re-upload: an opted-in member
        // whose comparison is still pending can at least see where they start.
        const baseline = Number.isFinite(entry?.baseline) ? round(entry.baseline, 0) : null;
        const final = Number.isFinite(entry?.final) ? round(entry.final, 0) : null;
        if (baseline === null && final === null) continue;
        fields[field] = {
          baseline,
          final,
          abs: Number.isFinite(entry?.abs) ? round(entry.abs, 0) : null,
          pct: Number.isFinite(entry?.pct) ? round(entry.pct, 4) : null,
        };
      }
      return {
        rank: Number.isFinite(row.rank) ? row.rank : null,
        gameName: row.gameName,
        baselineSource: row.baselineSource,
        baselineAliveOnly: row.baselineAliveOnly === true,
        finalSource: row.finalSource || null,
        waypoints: {
          signup: projectValues(row.waypoints?.signup),
          reupload: projectValues(row.waypoints?.reupload),
        },
        steps: {
          baselineToSignup: projectStep(row.steps?.baselineToSignup),
          signupToReupload: projectStep(row.steps?.signupToReupload),
          baselineToReupload: projectStep(row.steps?.baselineToReupload),
        },
        ...publicGrowth(row),
        fields,
        uploads: uploadHistory(row),
      };
    });
  const winners = publicRanking.ranked
    .filter((row) => row.rank <= winnerCount)
    .slice(0, COMPETITION_BOARD_MAX_WINNERS)
    .map((row) => ({
      rank: row.rank,
      gameName: row.gameName,
      ...publicGrowth(row),
    }));
  return {
    schemaVersion: COMPETITION_BOARD_SCHEMA_VERSION,
    seasonId: cleanText(options.seasonId),
    publishedAt: cleanText(options.publishedAt) || new Date().toISOString(),
    // Which comparison the ranks use: the competition once any final upload
    // exists, the personal growth tracker until then.
    mode: [...ranked, ...notRanked].find((row) => row.mode)?.mode || 'tracker',
    rows,
    winners,
    notRanked: publicNotRanked.length,
  };
}
