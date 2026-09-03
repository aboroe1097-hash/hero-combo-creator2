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

export const EDEN_WORKSPACE_IDS = Object.freeze(['eden-x1', 'eden-x2']);
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
    publicVoteResults: 'vts_admin/eden_x2_public_vote_results',
    publicProjection: 'vts_admin/eden_x2_public_projection',
  }),
});

export function normalizeEdenWorkspaceId(value) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase();
  return EDEN_WORKSPACE_IDS.includes(normalized) ? normalized : '';
}

export function getEdenWorkspace(workspaceId) {
  const id = normalizeEdenWorkspaceId(workspaceId) || 'eden-x2';
  return EDEN_WORKSPACE_DEFAULTS[id];
}

export function listEdenWorkspaces() {
  return EDEN_WORKSPACE_IDS.map((id) => EDEN_WORKSPACE_DEFAULTS[id]);
}

export function edenWorkspaceFirestorePaths(workspaceId) {
  const id = normalizeEdenWorkspaceId(workspaceId) || 'eden-x2';
  return EDEN_WORKSPACE_FIRESTORE_PATHS[id];
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

// Returns an Error when the given workspace refuses mutations (any season an
// admin has archived), or null when writes are allowed. Callers log/announce
// the error and abort the save; the archived records stay untouched.
export function edenWorkspaceMutationError(workspaceId) {
  const ws = getEdenWorkspace(workspaceId);
  if (!isEdenWorkspaceArchived(ws)) return null;
  return new Error(`${ws.label} is an archived season: its records are read-only.`);
}

export function isEdenWorkspaceMutable(workspaceId) {
  return !isEdenWorkspaceArchived(getEdenWorkspace(workspaceId));
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
  const defaults = EDEN_WORKSPACE_DEFAULTS[id];
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
    publicVoteResults:
      publicVoteResults && typeof publicVoteResults === 'object' ? publicVoteResults : {},
  });
}

export function isPublishedEdenProjection(value) {
  return Boolean(value && typeof value === 'object' && value.published === true && value.workspace);
}
