// js/eden-workspaces.js
// Eden season workspace contract shared by the admin dashboard and the public
// season pages. An EdenWorkspace isolates one season's operational records
// (attacks, duties, contributions, votes, conduct adjustments) behind its own
// Firestore paths and browser cache keys, so a new season starts empty and an
// archived season stays byte-identical instead of being overwritten.
//
// eden-x1 is the previous season: every path below is the historical one the
// live X1 data already occupies. eden-x2 is the season now running: its records
// live in dedicated eden_x2_* paths and reach the public site only through the
// allowlisted published projection.

import { normalizeRewardSettings } from './eden-reward-settings.js';

export const EDEN_WORKSPACE_IDS = Object.freeze(['eden-x1', 'eden-x2']);
export const EDEN_WORKSPACE_ID_PATTERN = /^eden-x[1-9]\d{0,3}$/;
export const EDEN_WORKSPACE_COLLECTION_PATH = 'vts_admin/eden_workspaces/records';
export const EDEN_ADMIN_WORKSPACE_STORAGE_KEY = 'vts_admin_eden_workspace';
export const EDEN_WORKSPACE_LIFECYCLES = Object.freeze(['archived', 'draft', 'active']);

const EDEN_X2_DEFAULT_SEASON = 'season-2027';

// X2 is the season now being played, so it is what the admin opens by default.
// X1 stays writable rather than archived: a finished season still needs late
// corrections, and freezing it is a deliberate act the admin performs from the
// command strip, recorded in the stored workspace record. Archiving is one-way
// once done.
const EDEN_WORKSPACE_DEFAULTS = Object.freeze({
  'eden-x1': Object.freeze({
    id: 'eden-x1',
    label: 'Eden X1',
    seasonLabel: 'Eden X1',
    lifecycle: 'active',
    active: false,
    defaultSeason: 'season-2026',
    createdAtMs: 0,
    archivedAtMs: 0,
    publication: null,
    legacy: true,
  }),
  'eden-x2': Object.freeze({
    id: 'eden-x2',
    label: 'Eden X2',
    seasonLabel: 'Eden X2',
    lifecycle: 'active',
    active: true,
    defaultSeason: EDEN_X2_DEFAULT_SEASON,
    createdAtMs: 0,
    archivedAtMs: 0,
    publication: null,
    legacy: false,
  }),
});

const EDEN_WORKSPACE_FIRESTORE_PATHS = Object.freeze({
  'eden-x1': Object.freeze({
    dashboardData: 'vts_admin/dashboard_data',
    rosterData: 'vts_admin/roster_data',
    conductAdjustments: 'vts_admin/conduct_adjustments/records',
    conductSuggestions: 'vts_admin/conduct_suggestions/records',
    votes: 'vts_admin/eden_x1_votes/records',
    voteHistory: 'vts_admin/eden_x1_vote_history/records',
    voteSettings: 'vts_admin/eden_x1_vote_settings',
    // Per workspace so a weight change in the season being played never
    // restates a finished season's scores.
    dutyPointWeights: 'vts_admin/eden_x1_duty_point_weights',
    // Reward distribution rules, per workspace for the same reason.
    rewardSettings: 'vts_admin/eden_x1_reward_settings',
    managementVotes: 'vts_admin/eden_x1_management_votes',
    publications: null,
    publicVoteResults: 'vts_admin/eden_x1_public_vote_results',
    publicProjection: null,
  }),
  'eden-x2': Object.freeze({
    dashboardData: 'vts_admin/eden_x2_dashboard_data',
    rosterData: 'vts_admin/eden_x2_roster_data',
    conductAdjustments: 'vts_admin/eden_x2_conduct_adjustments/records',
    conductSuggestions: 'vts_admin/eden_x2_conduct_suggestions/records',
    votes: 'vts_admin/eden_x2_votes/records',
    voteHistory: 'vts_admin/eden_x2_vote_history/records',
    voteSettings: 'vts_admin/eden_x2_vote_settings',
    // Per workspace so a weight change in the season being played never
    // restates a finished season's scores.
    dutyPointWeights: 'vts_admin/eden_x2_duty_point_weights',
    // Reward distribution rules, per workspace for the same reason.
    rewardSettings: 'vts_admin/eden_x2_reward_settings',
    managementVotes: 'vts_admin/eden_x2_management_votes',
    publications: 'eden_seasons/eden-x2/publications',
    publicVoteResults: 'vts_admin/eden_x2_public_vote_results',
    publicProjection: 'vts_admin/eden_x2_public_projection',
  }),
});

export function normalizeEdenWorkspaceId(value) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase();
  return EDEN_WORKSPACE_ID_PATTERN.test(normalized) ? normalized : '';
}

export function getEdenWorkspace(workspaceId) {
  const id = normalizeEdenWorkspaceId(workspaceId) || 'eden-x2';
  if (EDEN_WORKSPACE_DEFAULTS[id]) return EDEN_WORKSPACE_DEFAULTS[id];
  const number = id.slice('eden-x'.length);
  return Object.freeze({
    id,
    label: `Eden X${number}`,
    seasonLabel: `Eden X${number}`,
    lifecycle: 'draft',
    active: false,
    defaultSeason: `season-x${number}`,
    createdAtMs: 0,
    archivedAtMs: 0,
    publication: null,
    legacy: false,
  });
}

// The hub labels its season sub-tabs from the registry rather than repeating
// "X1"/"X2" in copy: when a new season opens, flipping `active` here renames
// the tabs in every locale instead of leaving thirteen packs to chase.
export function getCurrentEdenSeasonLabel() {
  return listEdenWorkspaces().find((ws) => ws.active)?.seasonLabel || '';
}

export function getPreviousEdenSeasonLabel() {
  const past = listEdenWorkspaces().filter((ws) => !ws.active);
  return past[past.length - 1]?.seasonLabel || '';
}

export function listEdenWorkspaces(extraIds = []) {
  const ids = new Set([
    ...EDEN_WORKSPACE_IDS,
    ...extraIds.map(normalizeEdenWorkspaceId).filter(Boolean),
  ]);
  return [...ids].map(getEdenWorkspace);
}

export function edenWorkspaceFirestorePaths(workspaceId) {
  const id = normalizeEdenWorkspaceId(workspaceId) || 'eden-x2';
  if (EDEN_WORKSPACE_FIRESTORE_PATHS[id]) return EDEN_WORKSPACE_FIRESTORE_PATHS[id];
  const root = `eden_seasons/${id}`;
  return {
    dashboardData: `${root}/data/dashboard`,
    rosterData: `${root}/data/roster`,
    conductAdjustments: `${root}/conduct_adjustments`,
    conductSuggestions: `${root}/conduct_suggestions`,
    votes: `${root}/votes`,
    voteHistory: `${root}/vote_history`,
    voteSettings: `${root}/data/vote_settings`,
    dutyPointWeights: `${root}/data/duty_point_weights`,
    rewardSettings: `${root}/data/reward_settings`,
    managementVotes: `${root}/data/management_votes`,
    publications: `${root}/publications`,
    publicVoteResults: `${root}/data/public_vote_results`,
    publicProjection: `${root}/data/public_projection`,
  };
}

export function edenWorkspacePublicUrl(workspaceId, { embed = false } = {}) {
  const id = normalizeEdenWorkspaceId(workspaceId) || 'eden-x2';
  const route = EDEN_WORKSPACE_IDS.includes(id) ? `${id}.html` : 'eden-season.html';
  const params = new URLSearchParams();
  if (!EDEN_WORKSPACE_IDS.includes(id)) params.set('workspace', id);
  if (embed) params.set('embed', '1');
  return `${route}${params.size ? `?${params}` : ''}`;
}

export function edenWorkspaceFirestorePath(workspaceId, name) {
  const paths = edenWorkspaceFirestorePaths(workspaceId);
  return Object.prototype.hasOwnProperty.call(paths, name) ? paths[name] : null;
}

// Browser cache keys are namespaced per workspace. eden-x1 keeps the
// historical keys so the archive's cached views and the legacy admin mirrors
// keep working untouched; every other workspace gets a suffixed key.
export function edenWorkspaceStorageKey(baseKey, workspaceId) {
  const id = normalizeEdenWorkspaceId(workspaceId);
  if (!id || id === 'eden-x1') return String(baseKey);
  return `${baseKey}__${id}`;
}

export function isEdenWorkspaceArchived(workspace) {
  return workspace?.lifecycle === 'archived';
}

// The workspace a write guard should judge: the caller's resolved view when it
// read one, otherwise the shipped default. Archiving only exists in the stored
// record, so passing the view is what makes an ended season actually read-only.
function resolveEdenWorkspaceView(workspaceId, resolved) {
  const id = normalizeEdenWorkspaceId(workspaceId);
  if (resolved && normalizeEdenWorkspaceId(resolved.id) === id) return resolved;
  return getEdenWorkspace(workspaceId);
}

// Returns an Error when the given workspace refuses mutations (any season an
// admin has archived), or null when writes are allowed. Callers log/announce
// the error and abort the save; the archived records stay untouched.
export function edenWorkspaceMutationError(workspaceId, resolved = null) {
  const ws = resolveEdenWorkspaceView(workspaceId, resolved);
  if (!isEdenWorkspaceArchived(ws)) return null;
  return new Error(`${ws.label} is an archived season: its records are read-only.`);
}

export function isEdenWorkspaceMutable(workspaceId, resolved = null) {
  return !isEdenWorkspaceArchived(resolveEdenWorkspaceView(workspaceId, resolved));
}

export function normalizeEdenWorkspacePublication(value) {
  if (!value || typeof value !== 'object') return null;
  const revision = Number(value.revision);
  if (!Number.isFinite(revision) || revision < 1) return null;
  return {
    revision: Math.floor(revision),
    publishedAtMs: Number(value.publishedAtMs) || 0,
    updatedBy: String(value.updatedBy || ''),
  };
}

// Merges a stored workspace record over the static defaults. Unknown or
// malformed fields fall back to the defaults, so a malformed cloud record can
// never silently change a season's lifecycle.
//
// Archiving is one-way: once a stored record marks a workspace archived, no
// later record can return it to a writable state. That keeps the rollover
// guarantee — a finished season stays frozen — without pretending X1 is already
// finished before the admin says so.
export function parseEdenWorkspaceRecord(record) {
  if (!record || typeof record !== 'object') return null;
  const id = normalizeEdenWorkspaceId(record.id);
  if (!id) return null;
  const defaults = getEdenWorkspace(id);
  const lifecycle = EDEN_WORKSPACE_LIFECYCLES.includes(record.lifecycle)
    ? record.lifecycle
    : defaults.lifecycle;
  const archived = lifecycle === 'archived' || defaults.lifecycle === 'archived';
  return {
    ...defaults,
    lifecycle: archived ? 'archived' : lifecycle,
    active: archived ? false : record.active === true,
    createdAtMs: Number(record.createdAtMs) || defaults.createdAtMs,
    archivedAtMs: Number(record.archivedAtMs) || defaults.archivedAtMs,
    // A legacy season has no published projection of its own; the archive route
    // renders it directly.
    publication: defaults.legacy ? null : normalizeEdenWorkspacePublication(record.publication),
  };
}

export function getActiveAdminWorkspaceId() {
  try {
    const stored = globalThis.localStorage?.getItem(EDEN_ADMIN_WORKSPACE_STORAGE_KEY);
    return normalizeEdenWorkspaceId(stored) || 'eden-x2';
  } catch {
    return 'eden-x2';
  }
}

// Resolved once per module graph load. The admin page reloads on a workspace
// switch, so a single module-scope snapshot is always the current workspace.
export const ACTIVE_EDEN_WORKSPACE_ID = getActiveAdminWorkspaceId();
export const ACTIVE_EDEN_WORKSPACE = getEdenWorkspace(ACTIVE_EDEN_WORKSPACE_ID);

export function setActiveAdminWorkspaceId(workspaceId) {
  const id = normalizeEdenWorkspaceId(workspaceId);
  if (!id) return false;
  try {
    globalThis.localStorage?.setItem(EDEN_ADMIN_WORKSPACE_STORAGE_KEY, id);
    return true;
  } catch {
    return false;
  }
}

// --- X2 empty-season bootstrap ---

export function buildEmptyEdenWorkspaceDashboard(season = EDEN_X2_DEFAULT_SEASON) {
  return {
    updatedAtMs: 0,
    syncRevision: 0,
    last_updated: '',
    date: '',
    total_attacks: 0,
    attacks: [],
    players_summary: [],
    bannerRecords: [],
    dutyRecords: [],
    contributionRecords: [],
    exGuildContributions: [],
    playerRegistry: {},
    r5Season: String(season || EDEN_X2_DEFAULT_SEASON),
    publicConductAdjustments: [],
  };
}

// --- Published public projection ---
//
// The public Eden X2 page never reads working admin documents. Publishing
// copies ONLY the fields below into eden_x2_public_projection; anything the
// admin keeps privately (raw OCR banner/duty working lists, internal sync
// bookkeeping) stays out by construction.

export const EDEN_PROJECTION_DASHBOARD_FIELDS = Object.freeze([
  'updatedAtMs',
  'syncRevision',
  'last_updated',
  'date',
  'total_attacks',
  'attacks',
  'players_summary',
  'contributionRecords',
  'dutyRecords',
  'exGuildContributions',
  'playerRegistry',
  'r5Season',
  'publicConductAdjustments',
]);

export const EDEN_PROJECTION_VOTE_SETTINGS_FIELDS = Object.freeze([
  'season',
  'votingOpen',
  'allowEditing',
  'showPublicResults',
  // The members' ballot and the R4/R5 sheet publish on their own switches. The
  // aggregate above is still carried so a reader that only knows the old field
  // keeps working.
  'showMemberResults',
  'showManagementResults',
  'showMemberVoteCounts',
  'showManagementVoteCounts',
  'showVoterNames',
  'contributionRankingMode',
  'closesAt',
  'updatedAt',
]);

function pickAllowlisted(source, fields) {
  const out = {};
  fields.forEach((field) => {
    if (source && source[field] !== undefined) out[field] = source[field];
  });
  return out;
}

export function stripUndefined(value) {
  if (value === undefined) return undefined;
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefined(item)).filter((item) => item !== undefined);
  }
  const out = {};
  Object.entries(value).forEach(([key, val]) => {
    const cleaned = stripUndefined(val);
    if (cleaned !== undefined) out[key] = cleaned;
  });
  return out;
}

export function buildEdenPublicProjection(options = {}) {
  const {
    workspace = 'eden-x2',
    revision = 1,
    published = true,
    updatedBy = '',
    dashboardData = null,
    voteSettings = null,
    publicVoteResults = null,
    rosterSnapshots = null,
    publishedAtMs = Date.now(),
    scoring = null,
    rewardSettings = null,
    managementVotes = null,
  } = options;
  const ws = getEdenWorkspace(workspace);
  if (ws.legacy) {
    throw new Error('The archived Eden X1 workspace publishes no projection.');
  }
  const dashboardSource = dashboardData || buildEmptyEdenWorkspaceDashboard(ws.defaultSeason);
  const season = String(dashboardSource.r5Season || ws.defaultSeason);
  return stripUndefined({
    schemaVersion: 1,
    workspace: ws.id,
    season,
    published: published === true,
    revision: Math.max(1, Math.floor(Number(revision) || 1)),
    publishedAtMs: Number(publishedAtMs) || Date.now(),
    updatedBy: String(updatedBy || ''),
    dashboard: pickAllowlisted(dashboardSource, EDEN_PROJECTION_DASHBOARD_FIELDS),
    rosterSnapshots: Array.isArray(rosterSnapshots) ? rosterSnapshots : [],
    voteSettings: pickAllowlisted(voteSettings || {}, EDEN_PROJECTION_VOTE_SETTINGS_FIELDS),
    publicVoteResults: projectEdenVoteResults(publicVoteResults, voteSettings),
    // The admin's scoring rules travel with the season so the public page ranks
    // players the same way. Absent on older publishes; readers then keep their
    // previous behaviour.
    scoring: normalizeEdenProjectionScoring(scoring),
    // The reward distribution travels too: the public page has to show the same
    // slot counts and the same guild-master holder the publishing admin chose.
    rewardSettings: normalizeEdenProjectionRewardSettings(rewardSettings),
    managementVotes: projectEdenManagementVotes(managementVotes, voteSettings),
  });
}

function rankedVoteRows(rows, showCounts) {
  const sorted = rows
    .filter((row) => row && typeof row.playerName === 'string' && row.playerName.trim())
    .sort((a, b) =>
      a.votes == null && b.votes == null
        ? Number(a.rank || 0) - Number(b.rank || 0)
        : Number(b.votes || 0) - Number(a.votes || 0)
    );
  let rank = 0;
  let previousVotes;
  return sorted.map((row, index) => {
    const votes = Number(row.votes || 0);
    if (votes !== previousVotes) rank = index + 1;
    previousVotes = votes;
    const identity = {
      playerName: String(row.playerName || '').slice(0, 100),
      rank: row.votes == null && Number.isInteger(row.rank) ? row.rank : rank,
    };
    for (const key of ['playerKey', 'familyKey']) {
      if (typeof row[key] === 'string') identity[key] = row[key].slice(0, 160);
    }
    if (showCounts && row.votes != null) {
      identity.votes = votes;
      if (Number.isFinite(row.voters)) identity.voters = row.voters;
    }
    return identity;
  });
}

export function projectEdenVoteResults(results, settings = {}) {
  settings = settings || {};
  if (!results || typeof results !== 'object') return {};
  const visible = settings.showMemberResults ?? settings.showPublicResults ?? true;
  return {
    season: String(results.season || settings.season || '').slice(0, 40),
    published: visible && results.published === true,
    rankings:
      visible && results.published === true
        ? rankedVoteRows(
            (Array.isArray(results.rankings) ? results.rankings : []).slice(0, 100),
            settings.showMemberVoteCounts !== false
          )
        : [],
  };
}

export function projectEdenManagementVotes(rows, settings = {}) {
  settings = settings || {};
  if ((settings.showManagementResults ?? settings.showPublicResults ?? true) === false) return [];
  return rankedVoteRows(
    normalizeEdenManagementVotes(rows),
    settings.showManagementVoteCounts !== false
  );
}

export function normalizeEdenManagementVotes(value) {
  const rows = Array.isArray(value) ? value : Array.isArray(value?.rows) ? value.rows : [];
  return rows.slice(0, 1000).flatMap((row) => {
    const playerName = String(row?.playerName || '')
      .trim()
      .slice(0, 100);
    const votes = Number(row?.votes);
    return playerName && Number.isFinite(votes) && votes >= 0 && votes <= 1e9
      ? [{ playerName, votes }]
      : [];
  });
}

export function normalizeEdenProjectionRewardSettings(settings) {
  if (!settings || typeof settings !== 'object') return undefined;
  return normalizeRewardSettings(settings);
}

export function normalizeEdenProjectionScoring(scoring) {
  if (!scoring || typeof scoring !== 'object') return undefined;
  const out = {};
  if (scoring.dutyPointWeights && typeof scoring.dutyPointWeights === 'object') {
    out.dutyPointWeights = scoring.dutyPointWeights;
  }
  if (typeof scoring.includeDemolitionPoints === 'boolean') {
    out.includeDemolitionPoints = scoring.includeDemolitionPoints;
  }
  // Whole-score multipliers travel with the season like the duty grid does, so
  // the public page ranks players the way the admin that published it did.
  for (const key of ['contributionWeight', 'formPointWeight']) {
    const value = Number(scoring[key]);
    if (Number.isFinite(value) && value >= 0 && value <= 10) out[key] = value;
  }
  return Object.keys(out).length ? out : undefined;
}

export function isPublishedEdenProjection(value) {
  return Boolean(value && typeof value === 'object' && value.published === true && value.workspace);
}
