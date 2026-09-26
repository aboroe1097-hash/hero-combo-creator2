// Competition #12 growth board, built on the server.
//
// The vtsScore Function builds the consent-filtered public projection directly
// from current records whenever the board is requested.
//
// Owner decisions (2026-09-26):
//   - Baseline: each player's LATEST VtsScore upload from ANY earlier season,
//     else their Competition #12 sign-up stats.
//   - Matching: the same account UID wins; otherwise a unique exact game name
//     (ignoring case, spacing and the "(VTS)" prefix) is used. An ambiguous
//     name uses sign-up stats.
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

/** 'vtsscore-2026' keeps the label the board already shows; other seasons are 'vtsscore-prior'. */
export function baselineSourceForSeason(seasonId) {
  return seasonId === COMPETITION_LEGACY_BASELINE_SEASON ? 'vtsscore-2026' : 'vtsscore-prior';
}

function newestFirst(left, right) {
  return right.uploadedAt - left.uploadedAt || left.seasonId.localeCompare(right.seasonId);
}

/**
 * Indexes every earlier season's VtsScore uploads by in-game name. Uploads from
 * before accounts existed carry no uid, so the name is the primary join and a
 * missing uid never drops a record; a name used by two different known accounts
 * is still not a safe match.
 * @param {Array<{seasonId: string, raceScores: object[]}>} priorSeasons
 * @returns {{byName: Map, byUid: Map}} byName: name key -> {status, candidate, candidates, uploads};
 *   byUid: submissionUid -> that account's latest upload.
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
        uploadedAt: Number.isFinite(uploadedAt) ? uploadedAt : 0,
      });
    }
  }
  uploads.sort(newestFirst);
  const byUid = new Map();
  const grouped = new Map();
  for (const upload of uploads) {
    if (upload.submissionUid && !byUid.has(upload.submissionUid)) {
      byUid.set(upload.submissionUid, upload);
    }
    const key = competitionExactNameKey(upload.gameName);
    if (!key) continue;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(upload);
  }
  const byName = new Map();
  for (const [key, list] of grouped) {
    // Only distinct known accounts make a name ambiguous: uid-less uploads are
    // the pre-account era and cannot prove a second account used the name.
    const accounts = new Set(
      list.map((upload) => upload.submissionUid).filter((submissionUid) => submissionUid)
    );
    const unique = accounts.size <= 1;
    const candidates = [];
    const seen = new Set();
    for (const upload of list) {
      const identity = upload.submissionUid || `${upload.seasonId}:${upload.uploadedAt}`;
      if (seen.has(identity)) continue;
      seen.add(identity);
      candidates.push(upload);
    }
    byName.set(key, {
      status: unique ? 'unique' : 'ambiguous',
      candidate: unique ? list[0] : null,
      candidates,
      uploads: list,
    });
  }
  return { byName, byUid };
}

/**
 * The baseline one player is measured from.
 * @returns {{values: object|null, source: string|null, seasonId: string|null, match: object}}
 */
export function resolveServerBaseline(player, { index, contestedKeys } = {}) {
  const key = competitionExactNameKey(player?.gameName);
  const entry = key ? index?.byName?.get(key) || null : null;
  const contested = contestedKeys instanceof Set && contestedKeys.has(key);
  // The in-game name is the match: uploads from before accounts existed only
  // carry a name. The uid is a last resort for records whose name changed.
  const exactName = entry?.status === 'unique' && !contested ? entry.candidate : null;
  const sameAccount = exactName ? null : index?.byUid?.get(recordUid(player)) || null;
  const chosen = exactName || sameAccount;
  const match = {
    status: chosen ? 'matched' : entry ? 'ambiguous' : 'none',
    decision: chosen ? 'vtsscore' : 'signup',
    how: exactName ? 'exact-name' : sameAccount ? 'uid' : 'none',
  };
  if (chosen) {
    return {
      values: { ...chosen.values },
      source: baselineSourceForSeason(chosen.seasonId),
      seasonId: chosen.seasonId,
      match,
    };
  }
  const values = signupValues(player);
  return { values, source: values ? 'signup' : null, seasonId: null, match };
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

/** Copy of js/competition-growth.js computeGrowthRow(). */
export function computeGrowthRow(player, { baseline, raceScore = null, window = null } = {}) {
  const submissionUid = recordUid(player);
  const gameName = cleanText(player?.gameName) || cleanText(raceScore?.gameName) || submissionUid;
  const consent = player?.commitment?.publicComparisonConsent === true;
  const baselineValues = baseline?.values || null;
  const finalValues =
    raceScore && Number(raceScore.schemaVersion) === 2
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

function nameKeysClaimedTwice(players) {
  const seen = new Map();
  for (const player of players) {
    const key = competitionExactNameKey(player?.gameName);
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
  return players.map((player) => {
    const submissionUid = recordUid(player);
    const raceScore = scores.get(submissionUid) || null;
    const baseline = resolveServerBaseline(player, {
      index,
      contestedKeys,
    });
    const row = computeGrowthRow(player, { baseline, raceScore, window });
    // Everything this name ever uploaded, newest first: the current-season
    // upload plus every earlier season's uploads matched by in-game name.
    const key = competitionExactNameKey(player?.gameName);
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
    const entry = key ? index?.byName?.get(key) || null : null;
    // An ambiguous name is an unsafe match: another account's uploads must
    // never be published under it. Only a unique, unclaimed name carries
    // history; the row's own current upload always stays.
    const safeHistory = entry && entry.status === 'unique' && !contestedKeys.has(key);
    const priorUploads = safeHistory ? entry.uploads : [];
    for (const upload of priorUploads) {
      uploads.push({
        seasonId: upload.seasonId,
        uploadedAt: upload.uploadedAt,
        values: upload.values,
      });
    }
    uploads.sort(newestFirst);
    return { ...row, uploads };
  });
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
