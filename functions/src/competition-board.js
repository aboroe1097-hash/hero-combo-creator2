// Competition #12 growth board, built on the server.
//
// The vtsScore Function builds the consent-filtered public projection directly
// from current records whenever the board is requested.
//
// Owner decisions (2026-09-26; the account-uid join was reverted on
// 2026-09-27 after one browser/account uploading for several people — e.g. a
// member filing for a friend — showed the id is not identity):
//   - Competition ranking: Total Power growth from the sign-up to the final
//     upload; the earlier-season comparison is the personal growth tracker
//     that ranks the board until finals land.
//   - Matching: a unique in-game name binds the tracker — exact (case,
//     spacing and the "(VTS)" prefix ignored), then the loose key with
//     confirmed aliases resolved and decorations dropped. An ambiguous or
//     twice-claimed name uses sign-up stats and reports as ambiguous.
//
// computeGrowthRow(), rankCompetitionGrowth() and buildGrowthBoardProjection()
// are copies of js/competition-growth.js (the Functions package cannot import
// from the site); tests/unit/competition-board-server.test.mjs asserts that
// both produce the same board for the same rows.
//
// Dependencies are injected so the logic is unit-tested without the Admin SDK.

import {
  ALL_STAR_BOH_CONFIG_DOC_PATH,
  COMPETITION_SCHEDULE_DOC_PATH,
  normalizeCompetitionSchedule,
} from './competition-phase.js';
import { protectedVtsAccountKey, resolveConfirmedPlayerAlias } from './player-aliases.js';

export const COMPETITION_BOARD_SCHEMA_VERSION = 1;
export const COMPETITION_BOARD_MAX_ROWS = 200;
export const COMPETITION_BOARD_MAX_WINNERS = 20;
export const COMPETITION_WINNER_COUNT = 3;
// The season whose uploads the browser labels "2026 VtsScore".
export const COMPETITION_LEGACY_BASELINE_SEASON = 'season-2026';
const MAX_PRIOR_SEASONS = 20;
const MAX_RECORDS_PER_SEASON = 500;
const SEASON_PATTERN = /^[A-Za-z0-9_-]{1,80}$/u;

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
export const COMPETITION_DEAD_TROOP_COUNT_KEYS = Object.freeze([
  'FootmenLofty',
  'FootmenT10',
  'FootmenT10Enhanced',
  'FootmenT9',
  'FootmenT9Enhanced',
  'CavalryLofty',
  'CavalryT10',
  'CavalryT10Enhanced',
  'CavalryT9',
  'CavalryT9Enhanced',
  'ArchersLofty',
  'ArchersT10',
  'ArchersT10Enhanced',
  'ArchersT9',
  'ArchersT9Enhanced',
]);
const DEAD_TROOP_MAX_COUNT = 1_000_000_000_000;

export class CompetitionBoardError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = 'CompetitionBoardError';
    this.status = status;
    this.code = code;
  }
}

function cleanText(value) {
  return String(value ?? '')
    .normalize('NFC')
    .trim();
}

/** Exact name key: case, whitespace and the "(VTS)" prefix are ignored; nothing else. */
export function competitionExactNameKey(name) {
  return cleanText(name)
    .replace(/^(?:\s*(?:\((?:vts|vet|s)\)|(?:vts|vet|s)\)))+\s*/iu, '')
    .replace(/\s+/gu, ' ')
    .trim()
    .toLowerCase();
}

/**
 * The loosest key two spellings of one account can share: the confirmed and
 * taught aliases resolve to their canonical spelling, then case, whitespace,
 * punctuation and decoration characters are dropped ("〽️ Anne〽️" → "anne",
 * "~Sarafino~" → "sarafino"). Accounts the owner separated from their
 * look-alikes keep their protected key. The loose key is only consulted after
 * the account and exact joins miss, and a loose key shared by two upload
 * accounts or claimed by two current signups is refused like any ambiguity.
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

/** Copy of js/competition-growth.js readCompetitionPowerValues(). */
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

export function readCompetitionDeadTroopCounts(source) {
  if (!source || typeof source !== 'object' || Array.isArray(source)) return null;
  const keys = Object.keys(source);
  if (
    keys.length !== COMPETITION_DEAD_TROOP_COUNT_KEYS.length ||
    keys.some((key) => !COMPETITION_DEAD_TROOP_COUNT_KEYS.includes(key))
  ) {
    return null;
  }
  const counts = {};
  for (const key of COMPETITION_DEAD_TROOP_COUNT_KEYS) {
    const value = source[key];
    if (!Number.isSafeInteger(value) || value < 0 || value > DEAD_TROOP_MAX_COUNT) return null;
    counts[key] = value;
  }
  return counts;
}

export function deadTroopPowerFromCounts(source) {
  const counts = readCompetitionDeadTroopCounts(source);
  if (!counts) return null;
  return COMPETITION_DEAD_TROOP_COUNT_KEYS.reduce((total, key) => {
    const multiplier = key.endsWith('Lofty') ? 8.2 : /T10/u.test(key) ? 7.5 : 7;
    return total + Math.round(counts[key] * multiplier);
  }, 0);
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
    return { values, aliveOnly: !readCompetitionDeadTroopCounts(source?.deadTroopCounts) };
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

/** 'vtsscore-2026' keeps the label the board already shows; other seasons are 'vtsscore-prior'. */
export function baselineSourceForSeason(seasonId) {
  return seasonId === COMPETITION_LEGACY_BASELINE_SEASON ? 'vtsscore-2026' : 'vtsscore-prior';
}

function newestFirst(left, right) {
  return right.uploadedAt - left.uploadedAt || left.seasonId.localeCompare(right.seasonId);
}

// Only distinct known accounts make a name ambiguous: uid-less uploads are
// the pre-account era and cannot prove a second account used the name.
function baselineEntryFor(list) {
  const accounts = new Set(
    list.map((upload) => upload.submissionUid).filter((submissionUid) => submissionUid)
  );
  const latest = [];
  const seen = new Set();
  for (const upload of list) {
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
    uploads: list,
  };
}

/**
 * Indexes every earlier season's VtsScore uploads by in-game name. Matching
 * tries the exact name (case, spacing and the "(VTS)" prefix ignored) first,
 * then the loose key with confirmed aliases resolved and decorations dropped.
 * A name used by two different known accounts is not a safe match and keeps
 * every candidate without proposing one.
 * @param {Array<{seasonId: string, raceScores: object[]}>} priorSeasons
 * @returns {{byName: Map, byLoose: Map}}
 */
export function buildPriorSeasonBaselineIndex(priorSeasons = []) {
  const uploads = [];
  for (const season of Array.isArray(priorSeasons) ? priorSeasons : []) {
    const seasonId = cleanText(season?.seasonId);
    if (!SEASON_PATTERN.test(seasonId)) continue;
    for (const record of Array.isArray(season?.raceScores) ? season.raceScores : []) {
      const values = readCompetitionPowerValues(record?.powerValues);
      const gameName = cleanText(record?.gameName);
      if (!values || !gameName) continue;
      const uploadedAt = uploadMillis(record);
      uploads.push({
        seasonId,
        submissionUid: recordUid(record),
        gameName,
        values,
        deadTroopCounts: readCompetitionDeadTroopCounts(record?.deadTroopCounts),
        uploadedAt: Number.isFinite(uploadedAt) ? uploadedAt : 0,
      });
    }
  }
  uploads.sort(newestFirst);
  const grouped = new Map();
  const looseGrouped = new Map();
  const add = (map, key, upload) => {
    if (!key) return;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(upload);
  };
  for (const upload of uploads) {
    add(grouped, competitionExactNameKey(upload.gameName), upload);
    add(looseGrouped, competitionLooseNameKey(upload.gameName), upload);
  }
  const byName = new Map();
  for (const [key, list] of grouped) byName.set(key, baselineEntryFor(list));
  const byLoose = new Map();
  for (const [key, list] of looseGrouped) byLoose.set(key, baselineEntryFor(list));
  return { byName, byLoose };
}

/**
 * The baseline one player is measured from, by in-game name: the exact name
 * first, then the loose key that folds confirmed aliases and decorations.
 * @returns {{values: object|null, source: string|null, seasonId: string|null, match: object}}
 */
export function resolveServerBaseline(player, { index, contestedKeys, contestedLooseKeys } = {}) {
  const key = competitionExactNameKey(player?.gameName);
  const entry = key ? index?.byName?.get(key) || null : null;
  const contested = contestedKeys instanceof Set && contestedKeys.has(key);
  // Uploads from before accounts existed carry no uid, so the name joins stay
  // for exactly the records the account join cannot reach. Ambiguous or
  // contested names are refused rather than guessed.
  const exactChosen = entry?.status === 'unique' && !contested ? entry.candidate : null;
  const looseKey = competitionLooseNameKey(player?.gameName);
  const looseEntry = looseKey ? index?.byLoose?.get(looseKey) || null : null;
  const looseContested = contestedLooseKeys instanceof Set && contestedLooseKeys.has(looseKey);
  const looseChosen =
    !entry?.candidates?.length && looseEntry?.status === 'unique' && !looseContested
      ? looseEntry.candidate
      : null;
  const chosen = exactChosen || looseChosen;
  const match = {
    status: chosen
      ? 'matched'
      : entry?.candidates?.length || looseEntry?.candidates?.length || contested || looseContested
        ? 'ambiguous'
        : 'none',
    decision: chosen ? 'vtsscore' : 'signup',
    how: exactChosen ? 'exact-name' : looseChosen ? 'loose-name' : 'none',
  };
  if (chosen) {
    return {
      values: { ...chosen.values },
      source: baselineSourceForSeason(chosen.seasonId),
      seasonId: chosen.seasonId,
      // A pre-16.6.2 upload has no dead-troop split: its values are the alive
      // reading. The board keeps every record's saved totals, so this flag
      // only drives the baseline note.
      aliveOnly: !chosen.deadTroopCounts,
      match,
    };
  }
  const signup = signupBaseline(player);
  return {
    values: signup.values,
    source: signup.values ? 'signup' : null,
    seasonId: null,
    aliveOnly: signup.values ? signup.aliveOnly : false,
    match,
  };
}

function growthOf(baseline, final) {
  if (baseline === null || final === null) return { abs: null, pct: null };
  const abs = final - baseline;
  return { abs, pct: baseline > 0 ? (abs / baseline) * 100 : null };
}

/** Copy of js/competition-growth.js growthStep(). */
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
 * Copy of js/competition-growth.js computeGrowthRow(). The competition ranks
 * sign-up -> final upload; last season -> now is the personal growth tracker
 * that rides along. applyGrowthMode() picks the ranked metric.
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
    readCompetitionDeadTroopCounts(raceScore.deadTroopCounts)
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
 * Copy of js/competition-growth.js applyGrowthMode(). Picks the ranked metric
 * for a whole board: the competition (sign-up -> final upload) as soon as one
 * valid final upload exists, otherwise the personal growth tracker so the
 * board stays alive until the re-upload window opens.
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

function nameKeysClaimedTwice(players, keyFor = competitionExactNameKey) {
  const seen = new Map();
  for (const player of players) {
    const key = keyFor(player?.gameName);
    if (key) seen.set(key, (seen.get(key) || 0) + 1);
  }
  return new Set([...seen].filter(([, count]) => count > 1).map(([key]) => key));
}

/** Every submitted player's growth row, with server baseline rules. */
export function buildServerGrowthRows({
  submissions = [],
  raceScores = [],
  priorSeasons = [],
  window = null,
  seasonId = '',
} = {}) {
  const players = (Array.isArray(submissions) ? submissions : []).filter(
    (submission) => cleanText(submission?.status) === 'submitted' && recordUid(submission)
  );
  const scores = new Map(
    (Array.isArray(raceScores) ? raceScores : []).map((score) => [recordUid(score), score])
  );
  const index = buildPriorSeasonBaselineIndex(priorSeasons);
  const contestedKeys = nameKeysClaimedTwice(players);
  const contestedLooseKeys = nameKeysClaimedTwice(players, competitionLooseNameKey);
  // Every submitted player's growth row, with the ranked metric applied once
  // the whole set is known.
  return applyGrowthMode(
    players.map((player) => {
      const submissionUid = recordUid(player);
      const raceScore = scores.get(submissionUid) || null;
      const baseline = resolveServerBaseline(player, {
        index,
        contestedKeys,
        contestedLooseKeys,
      });
      const row = computeGrowthRow(player, { baseline, raceScore, window });
      // Everything this player ever uploaded, newest first: the current-season
      // upload plus the earlier uploads joined by account first, then name.
      const key = competitionExactNameKey(player?.gameName);
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
      const exactEntry = key ? index?.byName?.get(key) || null : null;
      // An ambiguous name is an unsafe match: another account's uploads must
      // never be published under it. Only a unique, unclaimed match carries
      // history; the row's own current upload always stays.
      const safeExact =
        exactEntry?.status === 'unique' && !contestedKeys.has(key) ? exactEntry : null;
      const looseEntry = index?.byLoose?.get(looseKey) || null;
      const safeLoose =
        !exactEntry?.candidates?.length &&
        looseEntry?.status === 'unique' &&
        !contestedLooseKeys.has(looseKey)
          ? looseEntry
          : null;
      pushUploads(safeExact || safeLoose);
      uploads.sort(newestFirst);
      return { ...row, uploads };
    })
  );
}

function byName(left, right) {
  return left.gameName.localeCompare(right.gameName, 'en', { sensitivity: 'base' });
}

/** Copy of js/competition-growth.js rankCompetitionGrowth(). */
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

/** Copy of js/competition-growth.js buildGrowthBoardProjection(). */
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

function snapshotData(snapshot) {
  if (!snapshot) return null;
  const exists = typeof snapshot.exists === 'boolean' ? snapshot.exists : snapshot.exists?.();
  return exists && typeof snapshot.data === 'function' ? snapshot.data() : null;
}

function docsWithId(snapshot) {
  return (snapshot?.docs || [])
    .slice(0, MAX_RECORDS_PER_SEASON)
    .map((doc) => ({ ...(doc.data?.() || {}), id: doc.id }));
}

/** The active season and schedule for the live board. */
export async function readCompetitionBoardHead(db) {
  const [configSnapshot, scheduleSnapshot] = await Promise.all([
    db.doc(ALL_STAR_BOH_CONFIG_DOC_PATH).get(),
    db.doc(COMPETITION_SCHEDULE_DOC_PATH).get(),
  ]);
  const seasonId = cleanText(snapshotData(configSnapshot)?.activeSeason);
  if (!SEASON_PATTERN.test(seasonId)) {
    throw new CompetitionBoardError(409, 'season_not_configured', 'No active season.');
  }
  const schedule = normalizeCompetitionSchedule(snapshotData(scheduleSnapshot));
  return {
    seasonId,
    schedule: schedule && schedule.seasonId === seasonId ? schedule : null,
  };
}

/**
 * Reads everything the board needs from Firestore (Admin SDK shape).
 * @returns {Promise<{seasonId, schedule, submissions, raceScores, priorSeasons}>}
 */
export async function readCompetitionBoardInputs(db, head = null) {
  const top = head || (await readCompetitionBoardHead(db));
  const { seasonId } = top;
  const seasonRefs = await db.collection('boh_allstar').listDocuments();
  const priorIds = seasonRefs
    .map((ref) => ref.id)
    .filter((id) => id !== seasonId && SEASON_PATTERN.test(id))
    .sort()
    .reverse()
    .slice(0, MAX_PRIOR_SEASONS);
  const [submissions, raceScores, ...priorScores] = await Promise.all([
    db.collection(`boh_allstar/${seasonId}/submissions`).get(),
    db.collection(`boh_allstar/${seasonId}/raceScores`).get(),
    ...priorIds.map((id) => db.collection(`boh_allstar/${id}/raceScores`).get()),
  ]);
  return {
    ...top,
    submissions: docsWithId(submissions),
    raceScores: docsWithId(raceScores),
    priorSeasons: priorIds.map((id, index) => ({
      seasonId: id,
      raceScores: docsWithId(priorScores[index]),
    })),
  };
}

/** Builds the board from read inputs; pure. */
export function buildCompetitionBoardFromInputs(inputs, { nowMs = Date.now() } = {}) {
  const rows = buildServerGrowthRows({
    submissions: inputs.submissions,
    raceScores: inputs.raceScores,
    priorSeasons: inputs.priorSeasons,
    window: inputs.schedule,
    seasonId: inputs.seasonId,
  });
  const ranking = rankCompetitionGrowth(rows);
  const board = buildGrowthBoardProjection(ranking, {
    seasonId: inputs.seasonId,
    publishedAt: new Date(nowMs).toISOString(),
  });
  const sources = { signup: 0, 'vtsscore-2026': 0, 'vtsscore-prior': 0 };
  for (const row of rows) {
    if (row.baselineSource && row.baselineSource in sources) sources[row.baselineSource] += 1;
  }
  return {
    board,
    summary: {
      seasonId: inputs.seasonId,
      players: rows.length,
      ranked: ranking.ranked.length,
      notRanked: ranking.notRanked.length,
      publicRows: board.rows.length,
      winners: board.winners.map((winner) => winner.gameName),
      baselineSources: sources,
      priorSeasons: (inputs.priorSeasons || []).map((season) => season.seasonId),
    },
  };
}
