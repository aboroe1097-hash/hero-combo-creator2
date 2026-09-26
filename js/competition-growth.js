// js/competition-growth.js
//
// Competition #12 growth: who grew their account the most between their
// baseline and the re-upload window.
//
// Baseline, per player (owner decision):
//   1. their VtsScore upload from last season (season-2026 raceScores, the
//      28/29 July uploads), found by game name. A name match is only a
//      PROPOSAL: it is used once a superadmin has confirmed it, because folding
//      two accounts together (or giving a player someone else's history) would
//      silently decide a prize. Duplicate or ambiguous names are never
//      auto-matched;
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
import { resolveConfirmedPlayerAlias } from './vts-player-aliases.js';

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

function signupValues(submission) {
  if (!submission || typeof submission !== 'object') return null;
  return (
    readCompetitionPowerValues(submission.confirmedStats) ||
    readCompetitionPowerValues(submission.stats)
  );
}

function recordUid(record) {
  return cleanText(record?.submissionUid || record?.uid || record?.id);
}

function uploadMillis(record) {
  const updated = toMillis(record?.updatedAt ?? record?.updatedAtMs);
  return Number.isFinite(updated) ? updated : toMillis(record?.createdAt);
}

/**
 * Indexes VtsScore uploads by in-game name. Uploads from before accounts
 * existed carry no uid and must still index, so the name is the join and a
 * missing uid never drops a record. A name used by two different known
 * accounts is ambiguous: it keeps every candidate but proposes none. Each
 * entry keeps the full `uploads` history for the name, newest first.
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
  index.byUid = new Map();
  index.byExactName = new Map();
  const grouped = new Map();
  const exactGrouped = new Map();
  const add = (map, key, upload) => {
    if (!key) return;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(upload);
  };
  for (const candidate of uploads) {
    if (candidate.submissionUid && !index.byUid.has(candidate.submissionUid)) {
      index.byUid.set(candidate.submissionUid, candidate);
    }
    add(grouped, competitionNameKey(candidate.gameName), candidate);
    add(exactGrouped, normalizeName(candidate.gameName), candidate);
  }
  for (const [key, list] of grouped) index.set(key, baselineEntry(list));
  for (const [key, list] of exactGrouped) index.byExactName.set(key, baselineEntry(list));
  return index;
}

/** Keep each account's latest upload, and only propose scores with a saved
 * dead-troop breakdown so signup and re-upload totals use the same definition. */
function baselineEntry(uploads) {
  const accounts = new Set(
    uploads.map((upload) => upload.submissionUid).filter((submissionUid) => submissionUid)
  );
  const seen = new Set();
  const latestByAccount = [];
  for (const upload of uploads) {
    const identity = upload.submissionUid || 'unknown-account';
    if (seen.has(identity)) continue;
    seen.add(identity);
    latestByAccount.push(upload);
  }
  const candidates = latestByAccount.filter((upload) => upload.deadTroopCounts);
  const status = accounts.size > 1 ? 'ambiguous' : 'unique';
  return {
    status,
    candidate: status === 'unique' ? candidates[0] || null : null,
    candidates,
    uploads,
  };
}

function lookupIndex(index, key) {
  if (!key || !index) return null;
  if (index instanceof Map) return index.get(key) || null;
  return Object.prototype.hasOwnProperty.call(index, key) ? index[key] : null;
}

/**
 * The name-matched proposal for one player: 'matched' (one candidate),
 * 'ambiguous' (several, or contested by another player), or 'none'.
 */
export function proposeBaselineMatch(player, index, { contestedKeys, autoMatch = false } = {}) {
  const key = autoMatch ? normalizeName(player?.gameName) : competitionNameKey(player?.gameName);
  const source = autoMatch && index?.byExactName instanceof Map ? index.byExactName : index;
  const entry = lookupIndex(source, key);
  const contested = contestedKeys instanceof Set && contestedKeys.has(key);
  // The in-game name is the match: uploads from before accounts existed only
  // carry a name. The uid is a last resort for records whose name changed.
  if (entry?.candidates?.length && entry.status === 'unique' && !contested) {
    return {
      status: 'matched',
      key,
      candidates: entry.candidates,
      matchType: autoMatch ? 'exact-name' : null,
    };
  }
  const sameAccount =
    autoMatch && index?.byUid instanceof Map ? index.byUid.get(recordUid(player)) : null;
  if (sameAccount?.deadTroopCounts) {
    return { status: 'matched', key, candidates: [sameAccount], matchType: 'uid' };
  }
  if (entry?.candidates?.length) {
    return {
      status: 'ambiguous',
      key,
      candidates: entry.candidates,
      matchType: autoMatch ? 'exact-name' : null,
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
    return { values: { ...selected.values }, source, match };
  }
  const values = signupValues(options.signup ?? player);
  return { values, source: values ? 'signup' : null, match };
}

function growthOf(baseline, final) {
  if (baseline === null || final === null) return { abs: null, pct: null };
  const abs = final - baseline;
  return { abs, pct: baseline > 0 ? (abs / baseline) * 100 : null };
}

function inWindow(ms, window) {
  if (!window) return true;
  const opens = toMillis(window.reuploadOpensAt ?? window.opensAt);
  const closes = toMillis(window.reuploadClosesAt ?? window.closesAt);
  if (!Number.isFinite(opens) || !Number.isFinite(closes)) return true;
  return Number.isFinite(ms) && ms >= opens && ms < closes;
}

/**
 * One player's growth row.
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
  const finalValues =
    raceScore &&
    Number(raceScore.schemaVersion) === 2 &&
    normalizeDeadTroopCounts(raceScore.deadTroopCounts)
      ? readCompetitionPowerValues(raceScore.powerValues)
      : null;
  let notRankedReason = null;
  if (!raceScore) notRankedReason = 'no-reupload';
  else if (!finalValues) notRankedReason = 'invalid-reupload';
  else if (!inWindow(uploadMillis(raceScore), window)) notRankedReason = 'outside-window';
  else if (!baselineValues) notRankedReason = 'no-baseline';
  const usableFinal = notRankedReason ? null : finalValues;
  const fields = {};
  for (const field of COMPETITION_GROWTH_FIELDS) {
    const base = baselineValues?.[field] ?? null;
    const final = usableFinal?.[field] ?? null;
    fields[field] = { baseline: base, final, ...growthOf(base, final) };
  }
  const total = fields.totalCastlePower;
  return {
    submissionUid,
    gameName,
    consent,
    baselineSource: baselineValues ? baseline.source : null,
    match: baseline?.match || null,
    fields,
    growthAbs: notRankedReason ? null : total.abs,
    growthPct: notRankedReason ? null : total.pct,
    notRankedReason,
  };
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
  return players.map((player) => {
    const submissionUid = recordUid(player);
    const raceScore = scores.get(submissionUid) || null;
    const baseline = resolveBaseline(player, {
      vtsScore2026ByName: index,
      contestedKeys,
      confirmation: confirmations?.[submissionUid] || null,
      autoMatch,
    });
    const row = computeGrowthRow(player, { baseline, raceScore, window });
    // Everything this name ever uploaded, newest first: the current-season
    // upload plus every earlier upload matched by in-game name.
    const key = nameKey(player?.gameName);
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
    const historyEntry = key && lookupIndex(index, key);
    const safeHistory =
      Boolean(historyEntry) &&
      historyEntry.status !== 'ambiguous' &&
      !contestedKeys.has(key);
    const priorUploads = safeHistory ? historyEntry.uploads || [] : [];
    for (const upload of priorUploads) {
      uploads.push({
        seasonId: upload.seasonId,
        uploadedAt: upload.uploadedAt,
        values: upload.values,
      });
    }
    uploads.sort(
      (left, right) =>
        right.uploadedAt - left.uploadedAt || left.seasonId.localeCompare(right.seasonId)
    );
    return { ...row, uploads };
  });
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
  // Ranked and unranked names alike carry their history: an opted-in member
  // without a valid re-upload still has earlier uploads worth showing.
  const rows = [...publicRanking.ranked, ...publicNotRanked]
    .slice(0, COMPETITION_BOARD_MAX_ROWS)
    .map((row) => {
      const fields = {};
      for (const field of COMPETITION_GROWTH_FIELDS) {
        const entry = row.fields?.[field];
        if (!Number.isFinite(entry?.abs)) continue;
        fields[field] = { abs: round(entry.abs, 0), pct: round(entry.pct, 4) };
      }
      return {
        rank: Number.isFinite(row.rank) ? row.rank : null,
        gameName: row.gameName,
        baselineSource: row.baselineSource,
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
    rows,
    winners,
    notRanked: publicNotRanked.length,
  };
}
