import {
  loadRoster,
  saveRoster,
  showRosterModal,
  loadRosterSnapshots,
  saveRosterSnapshots,
  computeRosterDiff,
  takeRosterSnapshot,
  deleteRosterSnapshot,
  loadAllianceList,
  saveAllianceList,
  loadRosterAuth,
  saveRosterAuth,
  rosterLogin,
  rosterLogout,
  _ensureMember,
  setRosterStatus,
  setRosterAlliance,
  toggleBulkCheck,
  toggleBulkSelectAll,
  applyBulkStatus,
  applyBulkAlliance,
  exportRosterCSV,
  copyRosterNames,
  showRosterSnapshotModal,
  configureAlliances,
  renderRoster,
  loadBannerRecords,
  saveBannerRecords,
  showBannerForm,
  deleteBannerRecord,
  renderBanners,
  getTeamColor,
  hashCode,
  loadDutyRecords,
  showDutyPasteForm,
  processDutyImages,
  editDutyRecord,
  deleteDutyRecord,
  renderDutyRecords,
  loadContributionRecords,
  loadExGuildContributions,
  loadPlayerRegistry,
  showContributionPasteForm,
  showExGuildPasteForm,
  processContributionImages,
  editContributionRecord,
  deleteContributionRecord,
  setContributionReward,
  setContributionPrimary,
  exportContributionRecords,
  renderContributions,
  deleteExGuildEntry,
  clearExGuildData,
  setExGuildMatch,
} from './ocr-roster.js';

import {
  render,
  showModal,
  closeModal,
  buildPlayerSummary,
  animateAnalyticsCards,
} from './ocr-render.js';
import {
  processFiles,
  normalizeStructureTarget,
  parseOcrResults,
  fmtDate,
  displayGameTime,
} from './ocr-engine.js';
import { translations } from './translations.js';
import {
  ACTIVE_EDEN_WORKSPACE,
  ACTIVE_EDEN_WORKSPACE_ID,
  EDEN_WORKSPACE_COLLECTION_PATH,
  buildEdenPublicProjection,
  buildEmptyEdenWorkspaceDashboard,
  edenWorkspaceFirestorePath,
  edenWorkspaceMutationError,
  edenWorkspaceStorageKey,
  isEdenWorkspaceMutable,
  getEdenWorkspace,
  parseEdenWorkspaceRecord,
  setActiveAdminWorkspaceId,
} from './eden-workspaces.js';
const ACTIVE_EDEN_WORKSPACE_DEFAULT_SEASON = ACTIVE_EDEN_WORKSPACE.defaultSeason;

// The archived Eden X1 workspace refuses every mutation: writes log a warning,
// surface a sync failure, and the caller aborts. Reads and exports stay open.
function blockEdenArchiveWrite(action = 'write') {
  const err = edenWorkspaceMutationError(ACTIVE_EDEN_WORKSPACE_ID);
  if (!err) return false;
  console.warn(err.message, action);
  log(`${err.message} Blocked: ${action}.`, 'warn');
  showCloudSyncFailure(err, `${ACTIVE_EDEN_WORKSPACE.label} is read-only`);
  return true;
}
import { formatLocaleDate, formatLocaleNumber, resolveRuntimeLocale } from './locale-format.js';
import {
  fromEdenVoteDatetimeLocal,
  isEdenVoteDeadlineExpired,
  normalizeEdenVoteClosesAt,
  toEdenVoteDatetimeLocal,
} from './eden-vote-deadline.js';
import {
  R5_ADJUSTMENT_CATEGORIES,
  R5_ADJUSTMENT_CATEGORY_KEYS,
  R5_ADJUSTMENTS_LOCAL_KEY,
  createR5Adjustment,
  createLocalR5Adjustment,
  defaultR5PointsForCategory,
  deleteR5Adjustment,
  deleteLocalR5Adjustment,
  loadR5Adjustments,
  loadLocalR5Adjustments,
  normalizeR5Adjustment,
  resolveR5PlayerIdentity,
  updateR5Adjustment,
  updateLocalR5Adjustment,
} from './ocr-adjustments.js';
import {
  EDEN_X1_CONTRIBUTION_RANKING_MODES,
  buildWeightedContributionRows,
  getWeightedContributionRecordLabel,
  normalizeEdenX1ContributionRankingMode,
  sanitizePublicR5Adjustments,
} from './contribution-weighting.js';
import {
  compactPlayerIdentity,
  resolveCanonicalPlayerIdentity,
  stripGuildTagsFromPlayerName,
} from './ocr-name-normalizer.js';
import {
  PLAYER_REGISTRY_KEY,
  normalizePlayerRegistry,
  readStoredPlayerRegistry,
  writeStoredPlayerRegistry,
} from './player-registry.js';
// Cached superadmin claim, refreshed by refreshSuperAdminSurfaces(). UI gating
// only — the rules and the callable are the real boundary.
let dashSuperAdmin = false;
import {
  applyDashboardAttackMutation,
  dashboardAttackFingerprint,
  mergeDashboardOcrAttacks,
} from './dashboard-attack-mutations.js';
import { resolveEdenVoteCandidate } from './eden-vote-candidates.js';
import { getPublicVtsPlayerProfile } from './vts-public-players.js';
import {
  classifyRemoteSnapshot,
  conductAdjustmentFingerprint,
  createAdminEditGuard,
  createRevisionWriteQueue,
  normalizeSyncRevision,
} from './admin-sync-guard.js';
import { hasUsableDashboardCache } from './dashboard-cache-policy.js';
import {
  clearAdminLogView,
  flushAdminLogPersistence,
  formatAdminLogMessage,
  getAdminLogViewCutoff,
  listAdminLogEntries,
  resetAdminLogView,
  subscribeAdminLogStore,
} from './admin-log-store.js';
import { createAdminLogSync } from './admin-log-sync.js';
// --- Serverless OCR Dashboard ---
let firebaseApiPromise = null;
let firestoreApiPromise = null;
let allianceViewModulePromise = null;
let allianceViewMountPromise = null;
let allianceViewController = null;
let allianceViewSettingsLoaded = false;
let allianceViewVoteSettingsUnsubscribe = null;
let allianceViewContributionFrame = 0;
let localAllianceViewFirestoreContext = null;
const allianceViewContributionSubscribers = new Set();
let allStarBohModulePromise = null;
let allStarBohMountPromise = null;
let allStarBohController = null;
let allStarBohAdminI18n = null;
let allStarBohResearchI18n = null;
let throneBuffsModulePromise = null;
const STALE_ASSET_RECOVERY_KEY = 'vts_admin_stale_asset_recovery_v1';
// Throne Buffs is a standing program: its history key is deliberately global,
// never scoped to the Eden season workspace, so a season rollover cannot
// move or clear the assignment history.
const THRONE_BUFFS_HISTORY_LOCAL_KEY = 'vtsThroneBuffsHistory';

function isDynamicImportLoadFailure(err) {
  const message = String(err?.message || err?.reason?.message || err || '');
  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Unable to preload/i.test(
    message
  );
}

let staleAssetRecoveryAttempted = false;

async function recoverFromStaleAssetGraph(reason) {
  if (!isDynamicImportLoadFailure(reason)) return false;

  // In-memory guard first: if sessionStorage is unavailable (e.g. blocked
  // storage), the storage guard below can never engage and reloads would loop.
  if (staleAssetRecoveryAttempted) return false;
  staleAssetRecoveryAttempted = true;

  try {
    if (sessionStorage.getItem(STALE_ASSET_RECOVERY_KEY) === '1') return false;
    sessionStorage.setItem(STALE_ASSET_RECOVERY_KEY, '1');
  } catch {}

  try {
    setLoginError(dashT('adminLoading'));
  } catch {}

  try {
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }
  } catch (err) {
    console.warn('[assets] stale admin asset cleanup failed:', err);
  }

  console.warn('[assets] refreshing admin after stale asset graph:', reason);
  window.location.reload();
  return true;
}

function loadFirebaseApi() {
  if (!firebaseApiPromise) {
    firebaseApiPromise = import('./firebase.js').catch((err) => {
      firebaseApiPromise = null;
      recoverFromStaleAssetGraph(err);
      throw err;
    });
  }
  return firebaseApiPromise;
}

function loadFirestoreApi() {
  if (!firestoreApiPromise) {
    firestoreApiPromise = import('./firebase-sdk.js')
      .then(({ importFirestore }) => importFirestore())
      .catch((err) => {
        firestoreApiPromise = null;
        recoverFromStaleAssetGraph(err);
        throw err;
      });
  }
  return firestoreApiPromise;
}
import {
  STORAGE_KEY,
  ROSTER_KEY,
  ROSTER_SNAPSHOTS_KEY,
  BANNER_KEY,
  DUTY_LIST_KEY,
  CONTRIBUTION_KEY,
  EX_GUILD_CONTRIBUTION_KEY,
  FS_PATH,
  FS_ROSTER_PATH,
  ROSTER_USERS,
  ROSTER_AUTH_KEY,
  ALLIANCE_KEY,
  ALLIANCE_COUNT,
  LOG_KEY,
  CLEAR_HASH,
  DELETE_HASHES,
  DURABILITY_TABLE,
  state,
  $id,
  esc,
  log,
  appendLogEntry,
  restoreLogs,
  tryRepairJson,
  getSimilarity,
  getSimilarityAlphaNum,
  editDistance,
  findBestMatch,
  resolvePlayerNameForAttack,
  validateTotalDemolition,
  sha256,
  checkOcrService,
  qwenVisionRequest,
  describeOcrRequestError,
  getOcrRetryDelayMs,
  isRetryableOcrRequestError,
  formatStructureLabel,
  formatDatasetStructureLabel,
  getDatasetStructureTarget,
  isNameOnlyStructure,
  trimRosterSnapshots,
  sanitizeForFirestore,
  getSupportedOcrImageFiles,
  describeRejectedOcrImageFiles,
  readOcrImageDataUrl,
  cleanDutyRawName,
  resolveDutyPlayerName,
  getDutyOperatorNote,
} from './ocr-shared.js';

// --- Mutable State (initialized locally, synced to `state` for cross-module sharing) ---
state.dashData = null;
state.searchQ = '';
state.attackSearchQ = '';
state.rosterNames = [];
state.rosterSnapshots = [];
state.bannerRecords = [];
state.dutyRecords = [];
state.contributionRecords = [];
state.exGuildContributions = [];
state.playerRegistry = readStoredPlayerRegistry();
state.r5Adjustments = [];
state.r5Season = '';
state.alliancePublicConductAdjustments = [];
state.alliancePublicConductSnapshotLoaded = false;
state.edenX1Votes = [];
state.edenX1VoteHistory = [];
state.edenX1VoteSettings = null;
let edenX1VoteSettingsVersion = 0;
let edenX1VoteSettingsSaveQueue = Promise.resolve();
state.r5EditingId = '';
state.sortCol = 'adjustedTotal';
state.sortDir = 'desc';
state.structureFilterKey = '';
state.cloudSyncConfigured = false;
state.cloudAdminReady = false;
state.cloudSyncStatus = null;
state.cloudSyncStatusDetail = '';
state.adminUser = null;
state.adminIsAdmin = false;

const DASHBOARD_CLOUD_SAVE_DEBOUNCE_MS = 1200;
const DASHBOARD_CLOUD_RETRY_QUEUE_KEY = edenWorkspaceStorageKey(
  'vts_dashboard_cloud_retry_queue',
  ACTIVE_EDEN_WORKSPACE_ID
);
const DASHBOARD_CLOUD_RETRY_LIMIT = 6;
const ADMIN_LOCAL_TEST_KEY = 'vts_admin_local_test_auth';
const DASHBOARD_CLOUD_BOOT_TIMEOUT_MS = (() => {
  let override =
    typeof globalThis !== 'undefined'
      ? Number(globalThis.VTS_DASHBOARD_CLOUD_BOOT_TIMEOUT_MS)
      : NaN;
  if (!Number.isFinite(override) && typeof localStorage !== 'undefined') {
    try {
      override = Number(localStorage.getItem('vts_dashboard_cloud_boot_timeout_ms'));
    } catch (e) {}
  }
  return Number.isFinite(override) && override > 0 ? override : 6500;
})();
const DASHBOARD_CLOUD_WRITE_TIMEOUT_MS = (() => {
  let override =
    typeof globalThis !== 'undefined'
      ? Number(globalThis.VTS_DASHBOARD_CLOUD_WRITE_TIMEOUT_MS)
      : NaN;
  if (!Number.isFinite(override) && typeof localStorage !== 'undefined') {
    try {
      override = Number(localStorage.getItem('vts_dashboard_cloud_write_timeout_ms'));
    } catch (e) {}
  }
  return Number.isFinite(override) && override > 0 ? override : 20000;
})();
const DASHBOARD_CLOUD_RETRY_FLUSH_DELAY_MS = 2500;
// Vote records are season records: they follow the active Eden workspace.
// eden-x1 keeps the historical eden_x1_* paths (read-only archive), eden-x2
// writes to dedicated eden_x2_* collections.
const EDEN_X1_VOTES_COLLECTION_PATH = edenWorkspaceFirestorePath(ACTIVE_EDEN_WORKSPACE_ID, 'votes');
const EDEN_X1_VOTE_HISTORY_COLLECTION_PATH = edenWorkspaceFirestorePath(
  ACTIVE_EDEN_WORKSPACE_ID,
  'voteHistory'
);
const EDEN_X1_VOTE_SETTINGS_DOC_PATH = edenWorkspaceFirestorePath(
  ACTIVE_EDEN_WORKSPACE_ID,
  'voteSettings'
);
const EDEN_X1_PUBLIC_VOTE_RESULTS_DOC_PATH = edenWorkspaceFirestorePath(
  ACTIVE_EDEN_WORKSPACE_ID,
  'publicVoteResults'
);
const EDEN_X1_VOTE_SETTINGS_LOCAL_KEY = edenWorkspaceStorageKey(
  'vts_eden_x1_vote_admin_settings',
  ACTIVE_EDEN_WORKSPACE_ID
);
const R5_ADJUSTMENT_SEASON_LOCAL_KEY = edenWorkspaceStorageKey(
  'vts_r5_adjustment_season',
  ACTIVE_EDEN_WORKSPACE_ID
);
const EDEN_X1_TEAM_VOTE_CATEGORY = 'team_players';
let dashboardCloudSaveTimer = null;
let dashboardCloudSaveInFlight = false;
let dashboardCloudSavePendingData = null;
let dashboardCloudSavePendingBaseRevision = null;
let dashboardCloudSavePendingVersion = 0;
let dashboardCloudSaveWaiters = [];
let dashboardCloudRetryFlushTimer = null;
let dashboardCloudRetryFlushInFlight = false;
let dashboardRenderFrame = 0;
let dashboardLocalCacheJson = '';

function readDashboardCloudRetryQueue() {
  try {
    const parsed = JSON.parse(localStorage.getItem(DASHBOARD_CLOUD_RETRY_QUEUE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter((entry) => entry?.payload) : [];
  } catch {
    return [];
  }
}

function writeDashboardCloudRetryQueue(queue) {
  try {
    const next = (Array.isArray(queue) ? queue : []).slice(-DASHBOARD_CLOUD_RETRY_LIMIT);
    if (next.length) localStorage.setItem(DASHBOARD_CLOUD_RETRY_QUEUE_KEY, JSON.stringify(next));
    else localStorage.removeItem(DASHBOARD_CLOUD_RETRY_QUEUE_KEY);
  } catch (err) {
    console.warn('Could not persist dashboard cloud retry queue', err);
  }
}

function queueDashboardCloudRetry(kind, payload, reason = '', baseRevision = null) {
  if (!payload || typeof payload !== 'object') return;
  const queue = readDashboardCloudRetryQueue().filter((entry) => entry?.kind !== kind);
  const entry = {
    kind,
    payload,
    reason: String(reason || '').slice(0, 300),
    queuedAt: new Date().toISOString(),
  };
  if (Number.isInteger(baseRevision) && baseRevision >= 0) {
    entry.baseRevision = baseRevision;
  }
  queue.push(entry);
  writeDashboardCloudRetryQueue(queue);
  setCloudSyncStatus('local', dashT('adminCloudRetryPending'));
  if (shouldAutoFlushDashboardCloudRetry(reason)) scheduleDashboardCloudRetryFlush();
}

function shouldAutoFlushDashboardCloudRetry(reason = '') {
  if (state.adminIsAdmin !== true || state.cloudSyncConfigured === false) return false;
  return !isDashboardPermissionErrorText(reason);
}

function scheduleDashboardCloudRetryFlush(delayMs = DASHBOARD_CLOUD_RETRY_FLUSH_DELAY_MS) {
  if (dashboardCloudRetryFlushTimer || dashboardCloudRetryFlushInFlight) return;
  const schedule =
    typeof window !== 'undefined' && window.setTimeout ? window.setTimeout : setTimeout;
  dashboardCloudRetryFlushTimer = schedule(async () => {
    dashboardCloudRetryFlushTimer = null;
    if (!readDashboardCloudRetryQueue().length) return;
    dashboardCloudRetryFlushInFlight = true;
    try {
      await flushDashboardCloudRetryQueue();
    } finally {
      dashboardCloudRetryFlushInFlight = false;
    }
  }, delayMs);
}

function withDashboardCloudTimeout(promise, timeoutMs, label) {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) return promise;
  let timer = null;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const err = new Error(`${label} timed out`);
      err.name = 'DashboardCloudTimeoutError';
      err.code = 'dashboard-cloud-timeout';
      reject(err);
    }, timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

function isDashboardCloudTimeout(err) {
  return err?.code === 'dashboard-cloud-timeout' || err?.name === 'DashboardCloudTimeoutError';
}

function getDashboardErrorText(err) {
  if (!err) return '';
  if (typeof err === 'string') return err;
  return `${err?.name || ''} ${err?.code || ''} ${err?.message || err || ''} ${err?.stack || ''}`;
}

function isDashboardPermissionErrorText(text) {
  return /permission-denied|permission|insufficient|admin/i.test(text);
}

function isFirestoreInternalWatchAssertion(err) {
  const text = getDashboardErrorText(err);
  return /FIRESTORE\s*\([^)]*\):\s*(?:INTERNAL\s+)?ASSERTION FAILED:\s*Unexpected state|Unexpected state\s*\(ID:\s*(?:ca9|b815)\)/i.test(
    text
  );
}

function isRecoverableDashboardCloudError(err) {
  if (isDashboardCloudTimeout(err)) return true;
  const text = getDashboardErrorText(err);
  if (isDashboardPermissionErrorText(text)) return false;
  return (
    /network|fetch|offline|unavailable|connection|closed|proxy|timeout|ERR_/i.test(text) ||
    isFirestoreInternalWatchAssertion(err)
  );
}

function handleDashboardFirestoreBackgroundError(event) {
  const err = event?.reason || event?.error || event?.message || event;
  if (!isFirestoreInternalWatchAssertion(err)) return;
  state._cloudInitPromise = null;
  if (typeof event?.preventDefault === 'function') event.preventDefault();
  if (state.cloudSyncStatus !== 'error') {
    setCloudSyncStatus('local', dashT('adminCloudLocalCache'));
  }
  console.warn(
    'Firestore background listener failed after cloud fallback; continuing with local dashboard cache.',
    err?.message || err
  );
}

let dashboardFirestoreErrorGuardInstalled = false;
function installDashboardFirestoreErrorGuard() {
  if (
    dashboardFirestoreErrorGuardInstalled ||
    typeof window === 'undefined' ||
    typeof window.addEventListener !== 'function'
  ) {
    return;
  }
  dashboardFirestoreErrorGuardInstalled = true;
  window.addEventListener('error', handleDashboardFirestoreBackgroundError);
  window.addEventListener('unhandledrejection', handleDashboardFirestoreBackgroundError);
}

function showDashboardCloudFallback(err, label = 'Cloud sync') {
  if (isRecoverableDashboardCloudError(err)) {
    state._cloudInitPromise = null;
    const message = dashT('adminCloudLocalCache');
    setCloudSyncStatus('local', message);
    logDashboardEvent('adminCloudLocalCache', 'warn', {}, { source: 'cloud' });
    return message;
  }
  return showCloudSyncFailure(err, `${label} failed`);
}

async function runDashboardCloudTaskWithTimeout(
  label,
  task,
  timeoutMs = DASHBOARD_CLOUD_BOOT_TIMEOUT_MS,
  options = {}
) {
  const operation = Promise.resolve().then(task);
  try {
    return await withDashboardCloudTimeout(operation, timeoutMs, label);
  } catch (err) {
    if (options.optional === true && isRecoverableDashboardCloudError(err)) {
      operation
        .then(() => logDashboardEvent('adminCloudSynced', 'info', {}, { source: 'cloud' }))
        .catch(() => {});
      logDashboardEvent('adminCloudSyncing', 'warn', {}, { source: 'cloud' });
      return null;
    }
    showDashboardCloudFallback(err, label);
    return null;
  }
}

installDashboardFirestoreErrorGuard();

function writeDashboardLocalCache(data) {
  try {
    const json = JSON.stringify(data);
    if (json === dashboardLocalCacheJson) return;
    localStorage.setItem(STORAGE_KEY, json);
    dashboardLocalCacheJson = json;
  } catch (e) {}
}

const AUXILIARY_RECORD_CACHES = [
  ['bannerRecords', BANNER_KEY],
  ['dutyRecords', DUTY_LIST_KEY],
  ['contributionRecords', CONTRIBUTION_KEY],
  ['exGuildContributions', EX_GUILD_CONTRIBUTION_KEY],
];
const DASHBOARD_CLOUD_FIELD_KEYS = new Set([
  'updatedAtMs',
  'syncRevision',
  'last_updated',
  'total_attacks',
  'attacks',
  'players_summary',
  'bannerRecords',
  'dutyRecords',
  'contributionRecords',
  'exGuildContributions',
  'playerRegistry',
  'r5Season',
  'publicConductAdjustments',
]);

function writeAuxiliaryLocalCaches() {
  try {
    AUXILIARY_RECORD_CACHES.forEach(([field, key]) => {
      localStorage.setItem(key, JSON.stringify(Array.isArray(state[field]) ? state[field] : []));
    });
    const registry = normalizePlayerRegistry(state.playerRegistry || readStoredPlayerRegistry());
    if (registry.players.length)
      localStorage.setItem(PLAYER_REGISTRY_KEY, JSON.stringify(registry));
  } catch (e) {}
}

function hydrateAuxiliaryRecordsFromDashboardData(data) {
  if (!data || typeof data !== 'object') return false;
  let changed = false;
  AUXILIARY_RECORD_CACHES.forEach(([field]) => {
    if (Array.isArray(data[field])) {
      state[field] = data[field];
      changed = true;
    }
  });
  if (data.playerRegistry && typeof data.playerRegistry === 'object') {
    state.playerRegistry = writeStoredPlayerRegistry(data.playerRegistry);
    changed = true;
  }
  const cloudSeason = String(data.r5Season || '').trim();
  if (cloudSeason) {
    state.r5Season = cloudSeason;
    changed = true;
  }
  if (Array.isArray(data.publicConductAdjustments)) {
    state.alliancePublicConductAdjustments = data.publicConductAdjustments;
    state.alliancePublicConductSnapshotLoaded = true;
    changed = true;
  }
  if (changed) writeAuxiliaryLocalCaches();
  if (changed) publishAllianceViewContributionModel();
  return changed;
}

function attachAuxiliaryRecords(data) {
  const base =
    data && typeof data === 'object'
      ? { ...data }
      : { last_updated: fmtDate(new Date()), total_attacks: 0, attacks: [], players_summary: [] };
  AUXILIARY_RECORD_CACHES.forEach(([field]) => {
    const records = Array.isArray(state[field]) ? state[field] : [];
    if (records.length || Array.isArray(base[field])) base[field] = records;
  });
  const registry = normalizePlayerRegistry(state.playerRegistry || readStoredPlayerRegistry());
  if (registry.players.length || base.playerRegistry) base.playerRegistry = registry;
  const r5Season = state.r5Season || getDashboardR5SeasonKey();
  base.r5Season = r5Season;
  base.publicConductAdjustments = sanitizePublicR5Adjustments(state.r5Adjustments, r5Season);
  return base;
}

function pruneDashboardCloudData(data) {
  if (!data || typeof data !== 'object') return data;
  return Object.fromEntries(
    Object.entries(data).filter(([key]) => DASHBOARD_CLOUD_FIELD_KEYS.has(key))
  );
}

function activeDashboardSubtabName() {
  return (
    document.querySelector('#ocrDashboardRoot .dash-subtab-btn.dash-subtab-active')?.dataset
      ?.subtab || 'dashboard'
  );
}

function renderDashboardSubtab(name = activeDashboardSubtabName()) {
  if (name === 'dashboard' || name === 'analytics') {
    render();
    if (name === 'analytics') animateAnalyticsCards();
    return;
  }
  if (name === 'roster') renderRoster();
  if (name === 'banners') renderBanners();
  if (name === 'banners' || name === 'pathers' || name === 'speedTiles' || name === 'shieldWall')
    renderDutyRecords();
  if (name === 'contributions') renderContributions();
  if (name === 'allianceView') void ensureAllianceViewMountedOrUpdated();
  if (name === 'allStarBoh') void ensureAllStarBohMountedOrUpdated();
  if (name === 'throneBuffs') void ensureThroneBuffsMounted();
  if (name === 'userRoles') void ensureUserRolesMounted();
  if (name === 'edenVotes') renderEdenX1VoteAdmin();
  if (name === 'conduct') renderConductAdjustments();
}

let userRolesModulePromise = null;

/**
 * Reveals the Users & Roles tab only for a superadmin. This is presentation:
 * the setUserRole callable re-checks the caller's claim server-side and
 * firestore.rules gate the audit trail independently, so hiding the button is
 * a courtesy, never the boundary.
 */
async function refreshSuperAdminSurfaces() {
  let superadmin = false;
  try {
    const { isSuperAdminAuthUser } = await import('./firebase.js');
    superadmin = await isSuperAdminAuthUser();
  } catch {
    // Treat an unreadable claim as "not a superadmin": failing closed keeps a
    // transient auth error from exposing the surface.
    superadmin = false;
  }
  dashSuperAdmin = superadmin;
  document.querySelectorAll('[data-requires-superadmin]').forEach((element) => {
    element.hidden = !superadmin;
  });
  // The two formerly PIN-gated tabs follow the same claim.
  document.querySelectorAll('[data-subtab="edenVotes"], [data-subtab="conduct"]').forEach((btn) => {
    btn.disabled = !superadmin;
    btn.title = superadmin ? '' : dashT('adminRolesSuperadminRequired');
  });
  return superadmin;
}

/**
 * Candidate accounts come from users/{uid} profiles, which only exist once
 * someone has signed in. Roles themselves are never read from there — a
 * profile document is member-writable, so treating it as authority would be an
 * escalation path. The claim is the only source of truth.
 */
async function loadRoleCandidates() {
  const { collection, getDocs } = await loadFirestoreApi();
  const db = await ensureCloudSyncReady();
  const snap = await getDocs(collection(db, 'users'));
  return snap.docs
    .map((entry) => ({
      uid: entry.id,
      displayName: String(entry.data()?.displayName || '').slice(0, 80),
      admin: entry.data()?.admin === true,
      superadmin: entry.data()?.superadmin === true,
    }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName) || a.uid.localeCompare(b.uid));
}

async function ensureUserRolesMounted() {
  if (!(await refreshSuperAdminSurfaces())) return;
  if (!userRolesModulePromise) {
    userRolesModulePromise = import('./admin-roles-controller.js').catch((error) => {
      userRolesModulePromise = null;
      void recoverFromStaleAssetGraph(error);
      throw error;
    });
  }
  try {
    const module = await userRolesModulePromise;
    const mount = $id('dashUserRolesRoot');
    if (!mount) return;
    const { callSetUserRole, currentAuthUid } = await import('./firebase.js');
    module.renderRolesController(mount, {
      currentUid: currentAuthUid(),
      listMembers: loadRoleCandidates,
      setUserRole: callSetUserRole,
      t: dashT,
    });
  } catch (error) {
    console.error('USER ROLES LOAD ERROR:', error);
    const mount = $id('dashUserRolesRoot');
    if (mount) {
      mount.innerHTML = `<div class="dash-empty" role="alert">${esc(
        dashT('adminRolesLoadFailed')
      )}</div>`;
    }
  }
}

function loadThroneBuffsHistory() {
  try {
    const raw = localStorage.getItem(THRONE_BUFFS_HISTORY_LOCAL_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('THRONE BUFFS HISTORY LOAD ERROR:', error);
    return [];
  }
}

function saveThroneBuffsHistory(record) {
  const history = loadThroneBuffsHistory();
  const index = history.findIndex((item) => item?.weekKey === record.weekKey);
  if (index >= 0) history[index] = record;
  else history.push(record);
  try {
    localStorage.setItem(THRONE_BUFFS_HISTORY_LOCAL_KEY, JSON.stringify(history));
  } catch (error) {
    console.warn('THRONE BUFFS HISTORY SAVE ERROR:', error);
  }
}

async function ensureThroneBuffsMounted() {
  if (!throneBuffsModulePromise) {
    throneBuffsModulePromise = import('./admin-throne-buffs.js').catch((error) => {
      throneBuffsModulePromise = null;
      void recoverFromStaleAssetGraph(error);
      throw error;
    });
  }
  try {
    const module = await throneBuffsModulePromise;
    const mount = $id('dashThroneRoot');
    if (!mount) return;
    // The Throne Buffs UI reads its strings through the dashboard's own
    // translator, so publish it once for the module's embedded t() helper.
    window.dashT = dashT;
    module.renderThroneBuffs(mount, {
      history: loadThroneBuffsHistory(),
      rosterMembers: Array.isArray(state.rosterNames)
        ? state.rosterNames.map((name) => ({ name }))
        : [],
      onSave: saveThroneBuffsHistory,
    });
  } catch (error) {
    console.error('THRONE BUFFS LOAD ERROR:', error);
    const mount = $id('dashThroneRoot');
    if (mount) {
      mount.innerHTML = `<div class="dash-empty" role="alert">${esc(
        dashT('adminThroneEmptyHistory')
      )}</div>`;
    }
  }
}

const CONDUCT_CATEGORY_I18N_KEYS = {
  banner_help: 'adminConductCategoryBannerHelp',
  connected_road: 'adminConductCategoryConnectedRoad',
  extra_effort: 'adminConductCategoryExtraEffort',
  merit_other: 'adminConductCategoryMeritOther',
  path_block: 'adminConductCategoryPathBlock',
  toxicity: 'adminConductCategoryToxicity',
  ignored_coordination: 'adminConductCategoryIgnoredCoordination',
  penalty_other: 'adminConductCategoryPenaltyOther',
  forfeit_premium: 'adminConductCategoryForfeitPremium',
  grant_premium: 'adminConductCategoryGrantPremium',
};

const CONDUCT_MANUAL_PLAYER_VALUE = '__manual_conduct_player__';

function getDashboardR5SeasonKey() {
  try {
    const saved = localStorage.getItem(R5_ADJUSTMENT_SEASON_LOCAL_KEY);
    if (saved) return saved;
  } catch (e) {}
  return ACTIVE_EDEN_WORKSPACE_DEFAULT_SEASON || `season-${new Date().getUTCFullYear()}`;
}

state.r5Season = state.r5Season || getDashboardR5SeasonKey();

function canonicalEdenVoterKey(voterName, storedVoterKey = '') {
  const rawVoterKey = String(storedVoterKey || '').trim();
  const cleanVoterName = stripGuildTagsFromPlayerName(voterName);
  const publicProfile =
    getPublicVtsPlayerProfile(voterName) ||
    getPublicVtsPlayerProfile(cleanVoterName) ||
    getPublicVtsPlayerProfile(rawVoterKey);
  const identitySource = String(publicProfile?.name || cleanVoterName || rawVoterKey).trim();
  try {
    return resolveCanonicalPlayerIdentity(identitySource).playerKey || rawVoterKey;
  } catch {
    return rawVoterKey || compactPlayerIdentity(voterName);
  }
}

function normalizeEdenX1VoteRecord(record = {}) {
  const voterName = String(record.voterName || '').trim();
  const voterKey = canonicalEdenVoterKey(voterName, record.voterKey);
  const rawCandidateNames = Array.isArray(record.candidateNames)
    ? record.candidateNames
    : [record.candidateName, record.candidateName2, record.candidateName3, record.candidateName4];
  const rawCandidateKeys = Array.isArray(record.candidateKeys)
    ? record.candidateKeys
    : [record.candidateKey, record.candidateKey2, record.candidateKey3, record.candidateKey4];
  const candidates = rawCandidateNames
    .map((name, index) => {
      const candidateName = String(name || '').trim();
      const candidateKey = String(
        rawCandidateKeys[index] || compactPlayerIdentity(candidateName)
      ).trim();
      return { candidateKey, candidateName };
    })
    .filter((candidate) => candidate.candidateName && candidate.candidateKey)
    .slice(0, 4);
  const candidateNames = candidates.map((candidate) => candidate.candidateName);
  const candidateKeys = candidates.map((candidate) => candidate.candidateKey);
  return {
    id: String(record.id || '').trim(),
    season: String(record.season || '').trim(),
    category: String(record.category || '').trim(),
    voterKey,
    voterName,
    candidateKey: candidateKeys[0] || '',
    candidateName: candidateNames[0] || '',
    candidateKeys,
    candidateNames,
    candidates,
    voterAuthUid: String(record.voterAuthUid || '').trim(),
    updatedAt: record.updatedAt || '',
  };
}

function edenVoteUpdatedAtMs(record) {
  const raw = record?.updatedAt || record?.createdAt;
  if (typeof raw?.toMillis === 'function') return raw.toMillis();
  if (typeof raw?.toDate === 'function') return raw.toDate().getTime();
  return Date.parse(raw || '') || 0;
}

function edenX1VoteCanonicalId(vote) {
  return `${vote?.season || ''}__${vote?.category || EDEN_X1_TEAM_VOTE_CATEGORY}__${vote?.voterKey || ''}`;
}

function shouldReplaceEdenX1Vote(current, next) {
  const currentTime = edenVoteUpdatedAtMs(current);
  const nextTime = edenVoteUpdatedAtMs(next);
  if (nextTime !== currentTime) return nextTime > currentTime;
  return next.id === edenX1VoteCanonicalId(next) && current.id !== edenX1VoteCanonicalId(current);
}

function dedupeEdenX1Votes(votes = []) {
  const latestByVoter = new Map();
  votes.map(normalizeEdenX1VoteRecord).forEach((vote) => {
    const key = `${vote.season}|${vote.category}|${vote.voterKey}`;
    if (!vote.season || !vote.category || !vote.voterKey) return;
    const current = latestByVoter.get(key);
    if (!current || shouldReplaceEdenX1Vote(current, vote)) latestByVoter.set(key, vote);
  });
  return [...latestByVoter.values()];
}

function edenVoteUpdatedAtLabel(record) {
  const raw = record?.updatedAt || record?.createdAt;
  const date =
    typeof raw?.toDate === 'function'
      ? raw.toDate()
      : typeof raw === 'string'
        ? new Date(raw)
        : null;
  if (!date || Number.isNaN(date.getTime())) return 'pending';
  return formatLocaleDate(date, getDashboardLang(), {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function currentEdenVoteSeason() {
  return state.r5Season || getDashboardR5SeasonKey();
}

function defaultEdenX1VoteSettings() {
  return {
    season: currentEdenVoteSeason(),
    votingOpen: true,
    allowEditing: true,
    showPublicResults: false,
    showVoterNames: false,
    contributionRankingMode: EDEN_X1_CONTRIBUTION_RANKING_MODES.EXTENDED,
    closesAt: '',
  };
}

function normalizeEdenX1VoteSettings(settings = {}) {
  const defaults = defaultEdenX1VoteSettings();
  return {
    ...defaults,
    season: String(settings.season || defaults.season),
    votingOpen: settings.votingOpen !== false,
    allowEditing: settings.allowEditing !== false,
    showPublicResults: settings.showPublicResults === true,
    showVoterNames: settings.showVoterNames === true,
    contributionRankingMode: normalizeEdenX1ContributionRankingMode(
      settings.contributionRankingMode
    ),
    closesAt: normalizeEdenVoteClosesAt(settings.closesAt),
  };
}

function hasEdenX1VoteSeasonMismatch(settings = {}) {
  const settingsSeason = String(settings?.season || '').trim();
  const currentSeason = String(currentEdenVoteSeason() || '').trim();
  return Boolean(settingsSeason && currentSeason && settingsSeason !== currentSeason);
}

function formatEdenX1VoteDeadlineDate(closesAt) {
  const normalized = normalizeEdenVoteClosesAt(closesAt);
  if (!normalized) return '';
  return formatLocaleDate(normalized, getDashboardLang(), {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function readLocalEdenX1VoteSettings() {
  try {
    return normalizeEdenX1VoteSettings(
      JSON.parse(localStorage.getItem(EDEN_X1_VOTE_SETTINGS_LOCAL_KEY) || 'null') || {}
    );
  } catch {
    return defaultEdenX1VoteSettings();
  }
}

function writeLocalEdenX1VoteSettings(settings) {
  try {
    localStorage.setItem(
      EDEN_X1_VOTE_SETTINGS_LOCAL_KEY,
      JSON.stringify(normalizeEdenX1VoteSettings(settings))
    );
  } catch (err) {
    console.warn('Could not persist Eden X1 vote settings locally', err);
  }
}

function normalizeEdenX1VoteHistoryRecord(record = {}) {
  const voterName = String(record.voterName || '').trim();
  const voterKey = String(record.voterKey || compactPlayerIdentity(voterName)).trim();
  const beforeNames = Array.isArray(record.previousCandidateNames)
    ? record.previousCandidateNames.map((name) => String(name || '').trim()).filter(Boolean)
    : [];
  const afterNames = Array.isArray(record.candidateNames)
    ? record.candidateNames.map((name) => String(name || '').trim()).filter(Boolean)
    : [];
  return {
    id: String(record.id || '').trim(),
    voteId: String(record.voteId || '').trim(),
    season: String(record.season || '').trim(),
    category: String(record.category || '').trim(),
    voterKey,
    voterName,
    previousCandidateNames: beforeNames,
    candidateNames: afterNames,
    action: String(record.action || '').trim(),
    createdAt: record.createdAt || '',
  };
}

function renderEdenX1VoteSettings() {
  const settings = normalizeEdenX1VoteSettings(
    state.edenX1VoteSettings || readLocalEdenX1VoteSettings()
  );
  state.edenX1VoteSettings = settings;
  const seasonMismatch = hasEdenX1VoteSeasonMismatch(settings);
  const currentSeason = currentEdenVoteSeason();
  const setChecked = (id, value) => {
    const input = $id(id);
    if (input) input.checked = Boolean(value);
  };
  setChecked('dashEdenVoteOpenToggle', settings.votingOpen);
  setChecked('dashEdenVoteEditingToggle', settings.allowEditing);
  setChecked('dashEdenVotePublicResultsToggle', settings.showPublicResults);
  setChecked('dashEdenVoteShowNamesToggle', settings.showVoterNames);
  setChecked(
    'dashEdenContributionModeExtended',
    settings.contributionRankingMode === EDEN_X1_CONTRIBUTION_RANKING_MODES.EXTENDED
  );
  setChecked(
    'dashEdenContributionModeDefault',
    settings.contributionRankingMode === EDEN_X1_CONTRIBUTION_RANKING_MODES.DEFAULT
  );
  const contributionModeStatus = $id('dashEdenContributionModeStatus');
  if (contributionModeStatus) {
    const modeLabel = dashT(
      settings.contributionRankingMode === EDEN_X1_CONTRIBUTION_RANKING_MODES.DEFAULT
        ? 'adminEdenContributionModeDefault'
        : 'adminEdenContributionModeExtended'
    );
    contributionModeStatus.textContent = dashT('adminEdenContributionModeActive', {
      mode: modeLabel,
    });
  }
  const seasonMismatchPanel = $id('dashEdenVoteSeasonMismatch');
  if (seasonMismatchPanel) seasonMismatchPanel.hidden = !seasonMismatch;
  const seasonMismatchHint = $id('dashEdenVoteSeasonMismatchHint');
  if (seasonMismatchHint) {
    seasonMismatchHint.textContent = dashT('adminEdenVotesSeasonMismatchHint', {
      storedSeason: settings.season,
      currentSeason,
    });
  }
  seasonMismatchPanel
    ?.closest('.dash-eden-vote-admin-options')
    ?.querySelectorAll('input, button:not(#dashEdenVoteActivateSeasonBtn)')
    .forEach((control) => (control.disabled = seasonMismatch));
  const deadlineInput = $id('dashEdenVoteClosesAtInput');
  if (deadlineInput) {
    deadlineInput.value = toEdenVoteDatetimeLocal(settings.closesAt);
    deadlineInput.setCustomValidity('');
  }
  const clearDeadline = $id('dashEdenVoteClearDeadlineBtn');
  if (clearDeadline) clearDeadline.disabled = seasonMismatch || !settings.closesAt;
  const deadlinePreview = $id('dashEdenVoteDeadlinePreview');
  const deadlineDate = formatEdenX1VoteDeadlineDate(settings.closesAt);
  const deadlineExpired = isEdenVoteDeadlineExpired(settings.closesAt);
  if (deadlinePreview) {
    deadlinePreview.textContent = !deadlineDate
      ? dashT('adminEdenVotesDeadlineNone')
      : dashT(
          deadlineExpired ? 'adminEdenVotesDeadlineExpired' : 'adminEdenVotesDeadlineScheduled',
          { date: deadlineDate }
        );
    deadlinePreview.dataset.state = deadlineExpired
      ? 'expired'
      : settings.closesAt
        ? 'active'
        : 'none';
  }
  const status = $id('dashEdenVoteSettingsStatus');
  if (status) {
    status.textContent = seasonMismatch
      ? dashT('adminEdenVotesSeasonMismatchTitle')
      : deadlineExpired
        ? dashT('adminEdenVotesDeadlineExpired', { date: deadlineDate })
        : settings.votingOpen
          ? dashT('adminEdenVotesSettingsOpen')
          : dashT('adminEdenVotesSettingsClosed');
  }
}

function renderEdenX1VoteHistory() {
  const host = $id('dashEdenVoteHistory');
  if (!host) return;
  const season = currentEdenVoteSeason();
  const history = (Array.isArray(state.edenX1VoteHistory) ? state.edenX1VoteHistory : [])
    .map(normalizeEdenX1VoteHistoryRecord)
    .filter(
      (entry) =>
        entry.category === EDEN_X1_TEAM_VOTE_CATEGORY &&
        (!season || entry.season === season) &&
        entry.voterName
    )
    .sort((a, b) => edenVoteUpdatedAtMs(b) - edenVoteUpdatedAtMs(a));
  if (!history.length) {
    host.innerHTML = `<div class="dash-empty">${esc(dashT('adminEdenVotesHistoryEmpty'))}</div>`;
    return;
  }
  host.innerHTML = `<div class="dash-duty-summary-table-wrap">
    <table class="dash-duty-summary-table dash-eden-vote-history-table">
      <thead><tr><th>${esc(dashT('adminVoteVoter'))}</th><th>${esc(dashT('adminEdenVotesHistoryBefore'))}</th><th>${esc(dashT('adminEdenVotesHistoryAfter'))}</th><th>${esc(dashT('adminEdenVotesHistoryAction'))}</th><th>${esc(dashT('adminVoteUpdated'))}</th></tr></thead>
      <tbody>${history
        .map(
          (entry) => `<tr>
            <td><strong class="dash-duty-cell-value">${esc(entry.voterName)}</strong></td>
            <td><span class="dash-duty-cell-value">${esc(entry.previousCandidateNames.join(', ') || '--')}</span></td>
            <td><span class="dash-duty-cell-value">${esc(entry.candidateNames.join(', ') || '--')}</span></td>
            <td><span class="dash-duty-cell-value">${esc(entry.action || '--')}</span></td>
            <td><span class="dash-duty-cell-value dash-duty-times">${esc(edenVoteUpdatedAtLabel(entry))}</span></td>
          </tr>`
        )
        .join('')}</tbody>
    </table>
  </div>`;
  hydrateConductSummaryTableLabels(host);
}

function renderEdenX1VoteAdmin() {
  renderEdenX1VoteSettings();
  renderEdenX1VoteResults();
  renderEdenX1VoteHistory();
}

function collectEdenX1VoteTotals(votes, season) {
  const dedupedVotes = dedupeEdenX1Votes(votes).filter(
    (vote) =>
      vote.category === EDEN_X1_TEAM_VOTE_CATEGORY &&
      (!season || vote.season === season) &&
      vote.voterName &&
      vote.candidates.length
  );
  const totals = new Map();
  let totalSelections = 0;
  dedupedVotes.forEach((vote) => {
    const countedFamilyKeys = new Set();
    vote.candidates.forEach((candidate) => {
      const resolved = resolveEdenVoteCandidate(candidate);
      const familyKey =
        resolved.familyKey || resolved.playerKey || compactPlayerIdentity(resolved.rawName);
      if (!familyKey || countedFamilyKeys.has(familyKey)) return;
      countedFamilyKeys.add(familyKey);
      totalSelections += 1;
      if (!totals.has(familyKey)) {
        totals.set(familyKey, {
          candidateName: resolved.canonicalName || resolved.rawName,
          playerKey: resolved.playerKey || familyKey,
          familyKey,
          count: 0,
          voters: new Map(),
          latest: 0,
          variants: new Map(),
        });
      }
      const row = totals.get(familyKey);
      row.count += 1;
      row.voters.set(vote.voterKey || vote.voterName, vote.voterName);
      row.latest = Math.max(row.latest, edenVoteUpdatedAtMs(vote));
      const rawName = resolved.rawName || candidate.candidateKey || 'Unknown';
      row.variants.set(rawName, (row.variants.get(rawName) || 0) + 1);
    });
  });
  return {
    dedupedVotes,
    totalSelections,
    totalRows: [...totals.values()].sort(
      (a, b) =>
        b.count - a.count || b.latest - a.latest || a.candidateName.localeCompare(b.candidateName)
    ),
  };
}

function buildEdenX1PublicVoteResults(settings = state.edenX1VoteSettings) {
  const normalizedSettings = normalizeEdenX1VoteSettings(settings || {});
  const season = normalizedSettings.season || currentEdenVoteSeason();
  const { totalRows } = collectEdenX1VoteTotals(state.edenX1Votes || [], season);
  return {
    season,
    published: normalizedSettings.showPublicResults === true,
    rankings: normalizedSettings.showPublicResults
      ? totalRows.slice(0, 100).map((row) => ({
          playerName: row.candidateName,
          playerKey: row.playerKey,
          familyKey: row.familyKey,
          votes: row.count,
          voters: row.voters.size,
        }))
      : [],
  };
}

async function publishEdenX1PublicVoteResults(settings = state.edenX1VoteSettings) {
  if (blockEdenArchiveWrite('publish public vote results')) return false;
  if (hasEdenX1VoteSeasonMismatch(settings)) return false;
  if (state.adminIsAdmin !== true) return false;
  const db = await ensureCloudSyncReady();
  if (!db) return false;
  const { doc, serverTimestamp, setDoc } = await loadFirestoreApi();
  await setDoc(doc(db, EDEN_X1_PUBLIC_VOTE_RESULTS_DOC_PATH), {
    ...buildEdenX1PublicVoteResults(settings),
    updatedAt: serverTimestamp(),
    updatedBy: state.adminUser?.uid || '',
  });
  return true;
}

function renderEdenX1VoteResults() {
  const host = $id('dashEdenVoteResults');
  if (!host) return;
  const season = currentEdenVoteSeason();
  const votes = Array.isArray(state.edenX1Votes) ? state.edenX1Votes : [];
  const { dedupedVotes, totalSelections, totalRows } = collectEdenX1VoteTotals(votes, season);
  if (!dedupedVotes.length) {
    host.innerHTML = `<div class="dash-empty">${esc(dashT('adminEdenVotesEmpty'))}</div>`;
    return;
  }
  const ballotRows = dedupedVotes
    .slice()
    .sort(
      (a, b) =>
        edenVoteUpdatedAtMs(b) - edenVoteUpdatedAtMs(a) || a.voterName.localeCompare(b.voterName)
    );

  host.innerHTML = `<div class="dash-duty-upload-summary">
    <div class="dash-duty-summary-kpis dash-vote-summary-kpis">
      <div class="dash-duty-summary-kpi"><strong>${totalSelections}</strong><span>${esc(dashT('adminVotesLabel'))}</span></div>
      <div class="dash-duty-summary-kpi"><strong>${totalRows.length}</strong><span>${esc(dashT('adminCandidatesLabel'))}</span></div>
      <div class="dash-duty-summary-kpi"><strong>${esc(season)}</strong><span>${esc(dashT('adminSeasonLabel'))}</span></div>
    </div>
    <div class="dash-duty-summary-table-wrap">
      <h3 class="dash-modal-section-label">${esc(dashT('adminVoteCandidateTotals'))}</h3>
      <table class="dash-duty-summary-table dash-vote-summary-table">
        <thead><tr><th>#</th><th>${esc(dashT('adminVoteCandidate'))}</th><th>${esc(dashT('adminVotesLabel'))}</th><th>${esc(dashT('adminVoteVoters'))}</th><th>${esc(dashT('adminVoteMatchedFrom'))}</th></tr></thead>
        <tbody>${totalRows
          .map(
            (row, index) => `<tr data-eden-vote-candidate="${esc(row.familyKey)}">
              <td>${index + 1}</td>
              <td><strong class="dash-duty-cell-value">${esc(row.candidateName)}</strong></td>
              <td><span class="dash-duty-cell-value dash-positive">${row.count}</span></td>
              <td>
                <details class="dash-vote-voters" data-eden-vote-voters="${esc(row.familyKey)}">
                  <summary aria-label="${esc(dashT('adminVoteShowVotersAria', { count: row.voters.size }))}">${row.voters.size}</summary>
                  <ul>${[...row.voters.values()]
                    .sort((a, b) => a.localeCompare(b))
                    .map((name) => `<li>${esc(name)}</li>`)
                    .join('')}</ul>
                </details>
              </td>
              <td><span class="dash-duty-cell-value">${esc(
                [...row.variants.entries()]
                  .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
                  .map(([name, count]) => `${name} (${count})`)
                  .join(', ')
              )}</span></td>
            </tr>`
          )
          .join('')}</tbody>
      </table>
    </div>
    <div class="dash-duty-summary-table-wrap">
      <h3 class="dash-modal-section-label">${esc(dashT('adminVoteBallots'))}</h3>
      <table class="dash-duty-summary-table">
        <thead><tr><th>${esc(dashT('adminVoteVoter'))}</th><th>${esc(dashT('adminVoteSelection'))}</th><th>${esc(dashT('adminVoteUpdated'))}</th></tr></thead>
        <tbody>${ballotRows
          .map(
            (vote) => `<tr>
              <td><strong class="dash-duty-cell-value">${esc(vote.voterName)}</strong></td>
              <td><span class="dash-duty-cell-value">${esc(vote.candidateNames.join(', '))}</span></td>
              <td><span class="dash-duty-cell-value dash-duty-times">${esc(edenVoteUpdatedAtLabel(vote))}</span></td>
            </tr>`
          )
          .join('')}</tbody>
      </table>
    </div>
  </div>`;
  hydrateConductSummaryTableLabels(host);
}

// Debug/audit export of the currently loaded Eden X1 Team-Player ballots.
// One row per candidate selection so the sheet can be sorted by candidate to
// spot typos/near-duplicates. The canonical and family columns are display-only
// audit fields; stored candidate names and keys remain unchanged in Firestore.
function exportEdenX1VotesCsv() {
  const season = currentEdenVoteSeason();
  const votes = dedupeEdenX1Votes(Array.isArray(state.edenX1Votes) ? state.edenX1Votes : []).filter(
    (vote) =>
      vote.category === EDEN_X1_TEAM_VOTE_CATEGORY &&
      (!season || vote.season === season) &&
      vote.voterName &&
      vote.candidates.length
  );
  if (!votes.length) {
    alert(dashT('adminEdenVotesExportEmpty'));
    return 0;
  }
  const csvCell = (value) => {
    const text = String(value ?? '');
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const header = [
    'season',
    'voterName',
    'voterKey',
    'voterAuthUid',
    'choiceRank',
    'candidateName',
    'candidateKey',
    'candidateNameNormalized',
    'candidateCanonicalName',
    'candidateFamilyKey',
    'updatedAt',
    'voteId',
  ];
  const rows = [header.join(',')];
  votes
    .slice()
    .sort(
      (a, b) =>
        a.voterName.localeCompare(b.voterName) || edenVoteUpdatedAtMs(b) - edenVoteUpdatedAtMs(a)
    )
    .forEach((vote) => {
      vote.candidates.forEach((candidate, index) => {
        const resolved = resolveEdenVoteCandidate(candidate);
        rows.push(
          [
            vote.season,
            vote.voterName,
            vote.voterKey,
            vote.voterAuthUid,
            index + 1,
            candidate.candidateName,
            candidate.candidateKey,
            compactPlayerIdentity(candidate.candidateName),
            resolved.canonicalName,
            resolved.familyKey,
            edenVoteUpdatedAtLabel(vote),
            vote.id,
          ]
            .map(csvCell)
            .join(',')
        );
      });
    });
  const stamp = new Date().toISOString().slice(0, 10);
  downloadCsv(rows.join('\n'), `eden-x1-votes-${safeCsvFilename(season) || 'season'}-${stamp}.csv`);
  return votes.length;
}

// Console/debug helper: dumps the raw deduped vote records for name matching.
window.exportEdenX1Votes = exportEdenX1VotesCsv;

async function loadEdenX1Votes() {
  const host = $id('dashEdenVoteResults');
  if (!host) return false;
  if (state.adminIsAdmin !== true) {
    renderEdenX1VoteAdmin();
    return false;
  }
  try {
    const db = await ensureCloudSyncReady();
    if (!db) {
      renderEdenX1VoteAdmin();
      return false;
    }
    const { collection, getDocs, query, where } = await loadFirestoreApi();
    const season = currentEdenVoteSeason();
    const ref = collection(db, EDEN_X1_VOTES_COLLECTION_PATH);
    const snapshot = await getDocs(season ? query(ref, where('season', '==', season)) : ref);
    const votes = [];
    snapshot.forEach((docSnap) =>
      votes.push(normalizeEdenX1VoteRecord({ id: docSnap.id, ...docSnap.data() }))
    );
    state.edenX1Votes = dedupeEdenX1Votes(votes);
    renderEdenX1VoteAdmin();
    return true;
  } catch (err) {
    console.error('EDEN X1 VOTE LOAD ERROR:', err);
    host.innerHTML = `<div class="dash-empty">${esc(dashT('adminEdenVotesLoadFailed', { error: err?.message || err || dashT('edenX1UnknownError') }))}</div>`;
    showCloudSyncFailure(err, 'Eden X1 vote load failed');
    return false;
  }
}

async function loadEdenX1VoteHistory() {
  if (!$id('dashEdenVoteHistory')) return false;
  if (state.adminIsAdmin !== true) {
    renderEdenX1VoteHistory();
    return false;
  }
  try {
    const db = await ensureCloudSyncReady();
    if (!db) {
      renderEdenX1VoteHistory();
      return false;
    }
    const { collection, getDocs, query, where } = await loadFirestoreApi();
    const season = currentEdenVoteSeason();
    const ref = collection(db, EDEN_X1_VOTE_HISTORY_COLLECTION_PATH);
    const snapshot = await getDocs(season ? query(ref, where('season', '==', season)) : ref);
    const history = [];
    snapshot.forEach((docSnap) => history.push(normalizeEdenX1VoteHistoryRecord(docSnap.data())));
    state.edenX1VoteHistory = history;
    renderEdenX1VoteHistory();
    return true;
  } catch (err) {
    console.error('EDEN X1 VOTE HISTORY LOAD ERROR:', err);
    const host = $id('dashEdenVoteHistory');
    if (host) {
      host.innerHTML = `<div class="dash-empty">${esc(dashT('adminEdenVotesHistoryLoadFailed', { error: err?.message || err || dashT('edenX1UnknownError') }))}</div>`;
    }
    showCloudSyncFailure(err, 'Eden X1 vote history load failed');
    return false;
  }
}

async function loadEdenX1VoteSettings() {
  state.edenX1VoteSettings = readLocalEdenX1VoteSettings();
  renderEdenX1VoteSettings();
  publishAllianceViewContributionModel();
  if (state.adminIsAdmin !== true) return false;
  const loadVersion = edenX1VoteSettingsVersion;
  try {
    const db = await ensureCloudSyncReady();
    if (!db) return false;
    const { doc, getDoc } = await loadFirestoreApi();
    const snap = await getDoc(doc(db, EDEN_X1_VOTE_SETTINGS_DOC_PATH));
    if (snap.exists() && loadVersion === edenX1VoteSettingsVersion) {
      state.edenX1VoteSettings = normalizeEdenX1VoteSettings(snap.data());
      writeLocalEdenX1VoteSettings(state.edenX1VoteSettings);
      renderEdenX1VoteSettings();
      publishAllianceViewContributionModel();
    }
    return true;
  } catch (err) {
    console.error('EDEN X1 VOTE SETTINGS LOAD ERROR:', err);
    return false;
  }
}

async function saveEdenX1VoteSettings(nextSettings) {
  if (blockEdenArchiveWrite('save vote settings')) return false;
  edenX1VoteSettingsVersion += 1;
  const settings = normalizeEdenX1VoteSettings(nextSettings);
  state.edenX1VoteSettings = settings;
  writeLocalEdenX1VoteSettings(settings);
  renderEdenX1VoteSettings();
  publishAllianceViewContributionModel();
  if (state.adminIsAdmin !== true) return false;
  const persistLatestSettings = async () => {
    try {
      const db = await ensureCloudSyncReady();
      if (!db) return false;
      const latestSettings = normalizeEdenX1VoteSettings(state.edenX1VoteSettings || settings);
      const { doc, serverTimestamp, setDoc } = await loadFirestoreApi();
      await setDoc(doc(db, EDEN_X1_VOTE_SETTINGS_DOC_PATH), {
        ...latestSettings,
        updatedAt: serverTimestamp(),
        updatedBy: state.adminUser?.uid || '',
      });
      if (latestSettings.showPublicResults) await loadEdenX1Votes();
      await publishEdenX1PublicVoteResults(latestSettings);
      const status = $id('dashEdenVoteSettingsStatus');
      if (status) status.textContent = dashT('adminEdenVotesSettingsSaved');
      return true;
    } catch (err) {
      console.error('EDEN X1 VOTE SETTINGS SAVE ERROR:', err);
      const status = $id('dashEdenVoteSettingsStatus');
      if (status)
        status.textContent = `${dashT('adminEdenVotesSettingsSaveFailed')}: ${err?.message || err}`;
      showCloudSyncFailure(err, 'Eden X1 vote settings save failed');
      return false;
    }
  };
  edenX1VoteSettingsSaveQueue = edenX1VoteSettingsSaveQueue.then(
    persistLatestSettings,
    persistLatestSettings
  );
  return edenX1VoteSettingsSaveQueue;
}

async function activateCurrentEdenX1VoteSeason() {
  if (blockEdenArchiveWrite('activate vote season')) return false;
  const previousSettings = normalizeEdenX1VoteSettings(
    state.edenX1VoteSettings || readLocalEdenX1VoteSettings()
  );
  if (!hasEdenX1VoteSeasonMismatch(previousSettings)) {
    renderEdenX1VoteSettings();
    return true;
  }
  const saved = await saveEdenX1VoteSettings({
    ...previousSettings,
    season: currentEdenVoteSeason(),
    votingOpen: false,
    allowEditing: false,
    showPublicResults: false,
    showVoterNames: false,
    closesAt: '',
  });
  if (!saved && !isLocalAdminTestBypass()) {
    // The settings write can succeed before publishing the companion results
    // document fails. Re-read cloud authority instead of blindly restoring the
    // stale season locally.
    await loadEdenX1VoteSettings();
    const status = $id('dashEdenVoteSettingsStatus');
    if (status) status.textContent = dashT('adminEdenVotesSettingsSaveFailed');
    return false;
  }
  return true;
}

async function loadEdenX1VoteAdminData() {
  renderEdenX1VoteAdmin();
  await Promise.all([loadEdenX1VoteSettings(), loadEdenX1Votes(), loadEdenX1VoteHistory()]);
  renderEdenX1VoteAdmin();
}

async function refreshEdenX1VoteAdminData() {
  await loadEdenX1VoteAdminData();
  if (state.edenX1VoteSettings?.showPublicResults === true) {
    await publishEdenX1PublicVoteResults(state.edenX1VoteSettings);
  }
}

function bindEdenX1VoteAdminControls() {
  if (bindEdenX1VoteAdminControls.bound) return;
  bindEdenX1VoteAdminControls.bound = true;
  $id('dashEdenVoteRefreshBtn')?.addEventListener('click', () => refreshEdenX1VoteAdminData());
  $id('dashEdenVoteExportBtn')?.addEventListener('click', () => exportEdenX1VotesCsv());
  $id('dashEdenVoteActivateSeasonBtn')?.addEventListener('click', () =>
    activateCurrentEdenX1VoteSeason()
  );
  [
    ['dashEdenVoteOpenToggle', 'votingOpen'],
    ['dashEdenVoteEditingToggle', 'allowEditing'],
    ['dashEdenVotePublicResultsToggle', 'showPublicResults'],
    ['dashEdenVoteShowNamesToggle', 'showVoterNames'],
  ].forEach(([id, key]) => {
    $id(id)?.addEventListener('change', (event) => {
      saveEdenX1VoteSettings({
        ...(state.edenX1VoteSettings || readLocalEdenX1VoteSettings()),
        [key]: Boolean(event.target.checked),
      });
    });
  });
  document.querySelectorAll('input[name="edenContributionRankingMode"]').forEach((input) => {
    input.addEventListener('change', (event) => {
      if (!event.target.checked) return;
      saveEdenX1VoteSettings({
        ...(state.edenX1VoteSettings || readLocalEdenX1VoteSettings()),
        contributionRankingMode: normalizeEdenX1ContributionRankingMode(event.target.value),
      });
    });
  });
  const deadlineInput = $id('dashEdenVoteClosesAtInput');
  const persistDeadline = () => {
    if (!deadlineInput) return;
    deadlineInput.setCustomValidity('');
    const closesAt = fromEdenVoteDatetimeLocal(deadlineInput.value);
    if (deadlineInput.value && !closesAt) {
      deadlineInput.setCustomValidity(dashT('adminEdenVotesDeadlineInvalid'));
      deadlineInput.reportValidity();
      return;
    }
    const currentSettings = normalizeEdenX1VoteSettings(
      state.edenX1VoteSettings || readLocalEdenX1VoteSettings()
    );
    if (hasEdenX1VoteSeasonMismatch(currentSettings)) {
      renderEdenX1VoteSettings();
      return;
    }
    if (currentSettings.closesAt === closesAt) {
      renderEdenX1VoteSettings();
      return;
    }
    saveEdenX1VoteSettings({ ...currentSettings, closesAt });
  };
  deadlineInput?.addEventListener('input', () => deadlineInput.setCustomValidity(''));
  deadlineInput?.addEventListener('change', persistDeadline);
  $id('dashEdenVoteSaveDeadlineBtn')?.addEventListener('click', persistDeadline);
  $id('dashEdenVoteClearDeadlineBtn')?.addEventListener('click', () => {
    if (!deadlineInput) return;
    deadlineInput.value = '';
    persistDeadline();
  });
}

function formatSignedPoints(points) {
  const n = Number(points || 0);
  if (!n) return '0';
  return `${n > 0 ? '+' : '-'}${formatLocaleNumber(Math.abs(n), getDashboardLang())}`;
}

function conductCategoryLabel(categoryKey) {
  const key = String(categoryKey || '');
  return (
    dashT(CONDUCT_CATEGORY_I18N_KEYS[key] || '') || R5_ADJUSTMENT_CATEGORIES[key]?.label || key
  );
}

function conductCreatedAtLabel(record) {
  const raw = record?.createdAt;
  const date =
    typeof raw?.toDate === 'function'
      ? raw.toDate()
      : typeof raw === 'string'
        ? new Date(raw)
        : null;
  if (!date || Number.isNaN(date.getTime())) return dashT('adminConductDatePending');
  return formatLocaleDate(date, getDashboardLang(), {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function conductCreatedAtMs(record) {
  const raw = record?.createdAt;
  if (typeof raw?.toMillis === 'function') return raw.toMillis();
  if (typeof raw?.toDate === 'function') return raw.toDate().getTime();
  return Date.parse(raw || '') || 0;
}

function hydrateConductSummaryTableLabels(root) {
  if (!root) return;
  root.querySelectorAll('table').forEach((table) => {
    table.classList.add('dash-table--stack');
    const labels = Array.from(table.querySelectorAll('thead th')).map((th) =>
      (th.textContent || '').replace(/\s+/g, ' ').trim()
    );
    table.querySelectorAll('tbody tr').forEach((row) => {
      Array.from(row.children).forEach((cell, index) => {
        if (cell.tagName === 'TD' && labels[index]) cell.dataset.label = labels[index];
      });
    });
  });
}

function collectConductPlayerSummary(rows) {
  const byPlayer = new Map();
  rows.forEach((record) => {
    const playerName = String(record?.playerName || '').trim();
    const playerKey = String(record?.playerKey || compactPlayerIdentity(playerName)).trim();
    if (!playerKey || !playerName) return;
    if (!byPlayer.has(playerKey)) {
      byPlayer.set(playerKey, {
        playerName,
        entries: 0,
        points: 0,
        categoryCounts: new Map(),
        latestMs: 0,
        latestLabel: dashT('adminConductDatePending'),
      });
    }
    const row = byPlayer.get(playerKey);
    const points = Number(record.points || 0);
    row.entries += 1;
    row.points += Number.isFinite(points) ? points : 0;
    const categoryKey = String(record.category || '').trim();
    if (categoryKey) {
      row.categoryCounts.set(categoryKey, (row.categoryCounts.get(categoryKey) || 0) + 1);
    }
    const createdMs = conductCreatedAtMs(record);
    if (createdMs >= row.latestMs) {
      row.latestMs = createdMs;
      row.latestLabel = conductCreatedAtLabel(record);
    }
  });
  return Array.from(byPlayer.values()).sort(
    (a, b) =>
      b.points - a.points || b.entries - a.entries || a.playerName.localeCompare(b.playerName)
  );
}

function formatConductCategoryBreakdown(categoryCounts) {
  const parts = Array.from(categoryCounts || [])
    .sort(
      (a, b) => b[1] - a[1] || conductCategoryLabel(a[0]).localeCompare(conductCategoryLabel(b[0]))
    )
    .map(([categoryKey, count]) => `${conductCategoryLabel(categoryKey)} ${count}`);
  if (!parts.length) return '<span style="color:var(--text-dim)">--</span>';
  return parts.map(esc).join(' / ');
}

function renderConductMatchedPlayerCell(row) {
  const playerName = row?.playerName || '';
  return `<span class="dash-duty-player-stack">
    <strong class="dash-duty-cell-value">${esc(playerName)}</strong>
    <span class="dash-duty-match-confirm"><span>${esc(dashT('adminExGuildMatchTo'))}</span><b>${esc(playerName)}</b></span>
  </span>`;
}

function renderConductSummary(rows) {
  const host = $id('dashConductSummary');
  if (!host) return;
  if (!rows.length) {
    host.innerHTML = '';
    return;
  }
  const summaryRows = collectConductPlayerSummary(rows);
  const totalPoints = rows.reduce((sum, record) => {
    const points = Number(record.points || 0);
    return sum + (Number.isFinite(points) ? points : 0);
  }, 0);
  const bonusRows = rows.filter((record) => Number(record.points || 0) > 0).length;
  const penaltyRows = rows.filter((record) => Number(record.points || 0) < 0).length;
  const latestRow = rows.reduce((latest, record) => {
    return conductCreatedAtMs(record) > conductCreatedAtMs(latest) ? record : latest;
  }, rows[0]);
  host.innerHTML = `<div class="dash-duty-upload-summary">
    <div class="dash-duty-summary-kpis">
      <div class="dash-duty-summary-kpi"><strong>${rows.length}</strong><span>${esc(dashT('adminSummaryEntries'))}</span></div>
      <div class="dash-duty-summary-kpi"><strong>${esc(formatSignedPoints(totalPoints))}</strong><span>${esc(dashT('adminSummaryPoints'))}</span></div>
      <div class="dash-duty-summary-kpi"><strong>${bonusRows}</strong><span>${esc(dashT('adminSummaryBonus'))}</span></div>
      <div class="dash-duty-summary-kpi"><strong>${penaltyRows}</strong><span>${esc(dashT('adminSummaryPenalty'))}</span></div>
      <div class="dash-duty-summary-kpi"><strong>${summaryRows.length}</strong><span>${esc(dashT('adminSummaryPlayers'))}</span></div>
      <div class="dash-duty-summary-kpi"><strong>${esc(conductCreatedAtLabel(latestRow))}</strong><span>${esc(dashT('adminSummaryLatest'))}</span></div>
    </div>
    <div class="dash-duty-summary-table-wrap">
      <table class="dash-duty-summary-table">
        <thead><tr><th>${esc(dashT('adminDutySummaryPlayer'))}</th><th>${esc(dashT('adminConductPoints'))}</th><th>${esc(dashT('adminDutySummaryEntries'))}</th><th>${esc(dashT('adminConductCategory'))}</th><th>${esc(dashT('adminDutySummaryTimes'))}</th></tr></thead>
        <tbody>${summaryRows
          .map((row) => {
            const pointsClass = row.points >= 0 ? 'dash-positive' : 'dash-negative';
            return `<tr>
          <td>${renderConductMatchedPlayerCell(row)}</td>
          <td><span class="dash-duty-cell-value ${pointsClass}">${esc(formatSignedPoints(row.points))}</span></td>
          <td><span class="dash-duty-cell-value">${row.entries}</span></td>
          <td><span class="dash-duty-cell-value dash-duty-status-breakdown">${formatConductCategoryBreakdown(row.categoryCounts)}</span></td>
          <td><span class="dash-duty-cell-value dash-duty-times">${esc(row.latestLabel)}</span></td>
        </tr>`;
          })
          .join('')}</tbody>
      </table>
    </div>
  </div>`;
  hydrateConductSummaryTableLabels(host);
}

function setConductStatus(message = '', type = 'info') {
  const el = $id('dashConductStatus');
  if (!el) return;
  el.textContent = message;
  el.className = `dash-upload-status ${message ? type : 'hidden'}`;
}

function readRosterDisplayName(member) {
  if (!member) return '';
  if (typeof member === 'string') return stripGuildTagsFromPlayerName(member);
  return stripGuildTagsFromPlayerName(member.name || '');
}

function collectConductPlayerOptions() {
  const players = new Map();
  const addPlayer = (name) => {
    const cleanName = stripGuildTagsFromPlayerName(name);
    if (!cleanName) return;
    try {
      const identity = resolveR5PlayerIdentity({ name: cleanName });
      players.set(identity.playerKey, identity.playerName);
    } catch (e) {}
  };

  const latestRoster = state.rosterSnapshots?.length
    ? state.rosterSnapshots[state.rosterSnapshots.length - 1]?.members || []
    : [];
  latestRoster.forEach((member) => addPlayer(readRosterDisplayName(member)));
  (state.rosterNames || []).forEach(addPlayer);
  (state._lastRenderedAdjustedPlayerSummary || state._lastRenderedPlayerSummary || []).forEach(
    (row) => addPlayer(row.name)
  );
  (state.exGuildContributions || []).forEach((row) => addPlayer(row.playerName));
  (state.r5Adjustments || []).forEach((row) => addPlayer(row.playerName));

  return [...players.entries()]
    .map(([playerKey, playerName]) => ({ playerKey, playerName }))
    .sort((a, b) => a.playerName.localeCompare(b.playerName));
}

function getConductPlayerSearchParts() {
  const rawQuery = ($id('dashConductPlayerSearchInput')?.value || '').trim();
  return {
    rawQuery,
    textQuery: rawQuery.toLowerCase(),
    compactQuery: compactPlayerIdentity(rawQuery),
  };
}

function conductPlayerOptionMatches(row, textQuery, compactQuery) {
  if (!textQuery && !compactQuery) return true;
  const playerName = String(row?.playerName || '');
  const playerKey = String(row?.playerKey || '');
  return (
    playerName.toLowerCase().includes(textQuery) ||
    compactPlayerIdentity(playerName).includes(compactQuery) ||
    playerKey.includes(compactQuery)
  );
}

function setConductPlayerSearchExpanded(expanded, options = {}) {
  const input = $id('dashConductPlayerSearchInput');
  const button = $id('dashConductPlayerSearchBtn');
  if (!input) return;
  input.classList.toggle('hidden', !expanded);
  button?.setAttribute('aria-expanded', expanded ? 'true' : 'false');
  if (!expanded) {
    input.value = '';
    renderConductPlayerOptions($id('dashConductPlayer')?.value || '');
  } else if (options.focus) {
    requestAnimationFrame(() => {
      input.focus();
      input.select();
    });
  }
}

function syncConductManualPlayerInput(options = {}) {
  const select = $id('dashConductPlayer');
  const input = $id('dashConductManualPlayerInput');
  if (!select || !input) return;
  const manual = select.value === CONDUCT_MANUAL_PLAYER_VALUE;
  input.classList.toggle('hidden', !manual);
  if (!manual) {
    input.value = '';
    input.setAttribute('aria-invalid', 'false');
    return;
  }
  if (options.prefill && !input.value.trim()) input.value = options.prefill;
  if (options.focus) {
    requestAnimationFrame(() => {
      input.focus();
      input.select();
    });
  }
}

function conductManualPlayerOptionHtml() {
  return `<option value="${CONDUCT_MANUAL_PLAYER_VALUE}">${esc(dashT('adminConductManualPlayerOption'))}</option>`;
}

function renderConductPlayerOptions(preferredPlayerKey = '') {
  const select = $id('dashConductPlayer');
  if (!select) return;
  const options = state._conductPlayerOptions || [];
  const { rawQuery, textQuery, compactQuery } = getConductPlayerSearchParts();
  const filtered = options.filter((row) =>
    conductPlayerOptionMatches(row, textQuery, compactQuery)
  );
  select.innerHTML = [
    ...filtered.map(
      (row) =>
        `<option value="${esc(row.playerKey)}" data-player-name="${esc(row.playerName)}">${esc(row.playerName)}</option>`
    ),
    conductManualPlayerOptionHtml(),
  ].join('');
  const nextValue = filtered.some((row) => row.playerKey === preferredPlayerKey)
    ? preferredPlayerKey
    : preferredPlayerKey === CONDUCT_MANUAL_PLAYER_VALUE || !filtered.length
      ? CONDUCT_MANUAL_PLAYER_VALUE
      : filtered[0]?.playerKey || CONDUCT_MANUAL_PLAYER_VALUE;
  select.value = nextValue;
  syncConductManualPlayerInput({
    prefill: nextValue === CONDUCT_MANUAL_PLAYER_VALUE ? rawQuery : '',
  });
}

function renderConductPlayerPicker() {
  const select = $id('dashConductPlayer');
  if (!select) return;
  const previous = select.value;
  const options = collectConductPlayerOptions();
  const signature = options.map((row) => `${row.playerKey}:${row.playerName}`).join('|');
  select.dataset.signature = signature;
  state._conductPlayerOptions = options;
  renderConductPlayerOptions(previous);
}

function renderConductCategoryPicker() {
  const select = $id('dashConductCategory');
  if (!select) return;
  const previous = select.value;
  const signature = R5_ADJUSTMENT_CATEGORY_KEYS.map(
    (key) => `${key}:${conductCategoryLabel(key)}`
  ).join('|');
  if (select.dataset.signature !== signature) {
    select.dataset.signature = signature;
    select.innerHTML = R5_ADJUSTMENT_CATEGORY_KEYS.map(
      (key) => `<option value="${esc(key)}">${esc(conductCategoryLabel(key))}</option>`
    ).join('');
  }
  select.value = R5_ADJUSTMENT_CATEGORY_KEYS.includes(previous) ? previous : 'banner_help';
}

function resetConductForm() {
  state.r5EditingId = '';
  state._r5EditingFingerprint = '';
  const form = $id('dashConductForm');
  if (form) form.reset();
  setConductPlayerSearchExpanded(false);
  renderConductCategoryPicker();
  renderConductPlayerPicker();
  const category = $id('dashConductCategory')?.value || 'banner_help';
  const points = $id('dashConductPoints');
  if (points) points.value = defaultR5PointsForCategory(category);
  $id('dashConductCancelEditBtn')?.classList.add('hidden');
  const saveLabel = $id('dashConductSaveBtn')?.querySelector('span');
  if (saveLabel) saveLabel.textContent = dashT('adminConductSave');
  finishAdminEditSession();
}

function startConductEdit(id) {
  const record = (state.r5Adjustments || []).find((item) => item.id === id);
  if (!record) return;
  adminEditGuard.begin('conduct-form', dashboardCloudBaseRevision);
  state.r5EditingId = id;
  state._r5EditingFingerprint = conductAdjustmentFingerprint(record);
  setConductPlayerSearchExpanded(false);
  renderConductPlayerPicker();
  renderConductCategoryPicker();
  const player = $id('dashConductPlayer');
  if (player) player.value = record.playerKey;
  syncConductManualPlayerInput();
  const category = $id('dashConductCategory');
  if (category) category.value = record.category;
  const points = $id('dashConductPoints');
  if (points) points.value = record.points;
  const note = $id('dashConductNote');
  if (note) note.value = record.note || '';
  $id('dashConductCancelEditBtn')?.classList.remove('hidden');
  const saveLabel = $id('dashConductSaveBtn')?.querySelector('span');
  if (saveLabel) saveLabel.textContent = dashT('adminConductUpdate');
}

function renderConductAdjustments() {
  const list = $id('dashConductList');
  if (!list) return;
  renderConductCategoryPicker();
  renderConductPlayerPicker();
  const seasonEl = $id('dashConductSeason');
  if (seasonEl) seasonEl.textContent = dashT('adminConductSeasonLabel', { season: state.r5Season });
  const category = $id('dashConductCategory')?.value || 'banner_help';
  const points = $id('dashConductPoints');
  if (points && !points.value) points.value = defaultR5PointsForCategory(category);

  const searchEl = $id('dashConductSearch');
  const searchQuery = (searchEl?.value || '').trim().toLowerCase();

  const rows = (Array.isArray(state.r5Adjustments) ? state.r5Adjustments : [])
    .filter(
      (record) =>
        record?.season === state.r5Season &&
        (!searchQuery || (record.playerName || '').toLowerCase().includes(searchQuery))
    )
    .slice()
    .sort((a, b) => {
      const aMs =
        typeof a.createdAt?.toMillis === 'function'
          ? a.createdAt.toMillis()
          : Date.parse(a.createdAt || '') || 0;
      const bMs =
        typeof b.createdAt?.toMillis === 'function'
          ? b.createdAt.toMillis()
          : Date.parse(b.createdAt || '') || 0;
      return bMs - aMs;
    });

  renderConductSummary(rows);
  if (!rows.length) {
    list.innerHTML = `<div class="dash-empty">${esc(dashT('adminConductEmpty'))}</div>`;
    return;
  }
  list.innerHTML = rows
    .map((record) => {
      const pointsValue = Number(record.points || 0);
      return `<article class="dash-conduct-row">
        <div>
          <strong>${esc(record.playerName)}</strong>
          <span>${esc(conductCategoryLabel(record.category))} Â· ${esc(conductCreatedAtLabel(record))}</span>
          ${record.note ? `<p>${esc(record.note)}</p>` : ''}
        </div>
        <div class="dash-conduct-row-actions">
          <b class="${pointsValue >= 0 ? 'dash-positive' : 'dash-negative'}">${formatSignedPoints(pointsValue)}</b>
          <button class="dash-btn dash-btn-xs" type="button" data-conduct-edit="${esc(record.id)}">${esc(dashT('adminEdit'))}</button>
          <button class="dash-btn dash-btn-xs dash-btn-danger" type="button" data-conduct-delete="${esc(record.id)}">${esc(dashT('adminDelete'))}</button>
        </div>
      </article>`;
    })
    .join('');

  list.querySelectorAll('[data-conduct-edit]').forEach((btn) => {
    btn.addEventListener('click', () => startConductEdit(btn.dataset.conductEdit));
  });
  list.querySelectorAll('[data-conduct-delete]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.conductDelete;
      if (!id || !confirm(dashT('adminConductDeleteConfirm'))) return;
      try {
        if (state.cloudSyncConfigured === false) {
          deleteLocalR5Adjustment(id);
        } else {
          const current = (state.r5Adjustments || []).find((record) => record.id === id);
          await deleteR5Adjustment(id, {
            expectedFingerprint: conductAdjustmentFingerprint(current),
          });
        }
        state.r5Adjustments = (state.r5Adjustments || []).filter((record) => record.id !== id);
        refreshAlliancePublicConductAdjustments();
        renderConductAdjustments();
        await savePublicConductSnapshot();
        render();
        setConductStatus(dashT('adminConductDeleted'), 'success');
      } catch (err) {
        setConductStatus(
          showCloudSyncFailure(err, 'Bonus team effort points delete failed'),
          'error'
        );
      }
    });
  });
}

function hasLocalConductAdjustments() {
  try {
    const rows = JSON.parse(localStorage.getItem(R5_ADJUSTMENTS_LOCAL_KEY) || '[]');
    return Array.isArray(rows) && rows.length > 0;
  } catch {
    return false;
  }
}

function refreshAlliancePublicConductAdjustments() {
  state.alliancePublicConductAdjustments = sanitizePublicR5Adjustments(
    state.r5Adjustments,
    state.r5Season
  );
  state.alliancePublicConductSnapshotLoaded = true;
  publishAllianceViewContributionModel();
}

async function loadConductAdjustmentsForSeason() {
  state.r5Season = state.r5Season || getDashboardR5SeasonKey();
  if (state.cloudSyncConfigured === false) {
    state.r5Adjustments = loadLocalR5Adjustments(state.r5Season);
    refreshAlliancePublicConductAdjustments();
    renderConductAdjustments();
    return;
  }
  if (!state.adminIsAdmin && !hasLocalConductAdjustments()) return;
  try {
    state.r5Adjustments = await loadR5Adjustments(state.r5Season);
    refreshAlliancePublicConductAdjustments();
    renderConductAdjustments();
  } catch (err) {
    showCloudSyncFailure(err, 'Conduct adjustments load failed');
  }
}

async function savePublicConductSnapshot() {
  if (blockEdenArchiveWrite('save conduct snapshot')) return false;
  const canCloudSave = state.cloudSyncConfigured !== false && state.adminIsAdmin === true;
  return saveDashboardAuxiliaryRecords({
    cloud: canCloudSave,
    immediate: true,
    awaitCloud: canCloudSave,
  });
}

function bindConductControls() {
  const form = $id('dashConductForm');
  if (!form || form.dataset.bound) return;
  form.dataset.bound = '1';
  const category = $id('dashConductCategory');
  category?.addEventListener('change', () => {
    const points = $id('dashConductPoints');
    if (points) points.value = defaultR5PointsForCategory(category.value);
  });
  $id('dashConductCancelEditBtn')?.addEventListener('click', resetConductForm);
  $id('dashConductSearch')?.addEventListener('input', () => renderConductAdjustments());
  const playerSearchButton = $id('dashConductPlayerSearchBtn');
  const playerSearchInput = $id('dashConductPlayerSearchInput');
  playerSearchButton?.addEventListener('click', () => {
    const expanded = playerSearchInput && !playerSearchInput.classList.contains('hidden');
    setConductPlayerSearchExpanded(!expanded, { focus: !expanded });
  });
  playerSearchInput?.addEventListener('input', () => {
    renderConductPlayerOptions($id('dashConductPlayer')?.value || '');
  });
  playerSearchInput?.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      setConductPlayerSearchExpanded(false);
      $id('dashConductPlayer')?.focus();
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      $id('dashConductPlayer')?.focus();
    }
  });
  $id('dashConductPlayer')?.addEventListener('change', () =>
    syncConductManualPlayerInput({ focus: true })
  );
  $id('dashConductManualPlayerInput')?.addEventListener('input', (event) => {
    event.target.setAttribute('aria-invalid', 'false');
  });
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const player = $id('dashConductPlayer');
    const selected = player?.selectedOptions?.[0];
    const categoryKey = $id('dashConductCategory')?.value || 'merit_other';
    const points = $id('dashConductPoints')?.value;
    const note = $id('dashConductNote')?.value || '';
    const manualPlayerInput = $id('dashConductManualPlayerInput');
    player?.setAttribute('aria-invalid', 'false');
    manualPlayerInput?.setAttribute('aria-invalid', 'false');
    let playerKey = player?.value || '';
    let playerName = selected?.dataset.playerName || selected?.textContent || '';
    if (playerKey === CONDUCT_MANUAL_PLAYER_VALUE) {
      const manualName = ($id('dashConductManualPlayerInput')?.value || '').trim();
      if (!manualName) {
        setConductStatus(dashT('adminConductNoPlayers'), 'warn');
        manualPlayerInput?.setAttribute('aria-invalid', 'true');
        manualPlayerInput?.focus();
        return;
      }
      try {
        const identity = resolveR5PlayerIdentity({ name: manualName });
        playerKey = identity.playerKey;
        playerName = identity.playerName;
      } catch (err) {
        setConductStatus(err?.message || dashT('adminConductNoPlayers'), 'warn');
        return;
      }
    }
    if (!playerKey || !playerName) {
      setConductStatus(dashT('adminConductNoPlayers'), 'warn');
      player?.setAttribute('aria-invalid', 'true');
      player?.focus();
      return;
    }
    try {
      setConductStatus(dashT('adminConductSaving'), 'info');
      if (state.r5EditingId) {
        const patch = {
          playerKey,
          playerName,
          category: categoryKey,
          points,
          note,
        };
        if (state.cloudSyncConfigured === false) {
          updateLocalR5Adjustment(state.r5EditingId, patch);
        } else {
          await updateR5Adjustment(state.r5EditingId, patch, {
            expectedFingerprint: state._r5EditingFingerprint,
          });
        }
        setConductStatus(dashT('adminConductUpdated'), 'success');
      } else {
        const record = {
          season: state.r5Season,
          playerKey,
          playerName,
          category: categoryKey,
          points,
          note,
        };
        if (state.cloudSyncConfigured === false) {
          createLocalR5Adjustment(record);
        } else {
          await createR5Adjustment(record);
        }
        setConductStatus(dashT('adminConductSaved'), 'success');
      }
      resetConductForm();
      await loadConductAdjustmentsForSeason();
      await savePublicConductSnapshot();
      render();
    } catch (err) {
      setConductStatus(showCloudSyncFailure(err, 'Bonus team effort points save failed'), 'error');
    }
  });
}

export function scheduleDashboardRender() {
  publishAllianceViewContributionModel();
  if (dashboardRenderFrame) return;
  const run = () => {
    dashboardRenderFrame = 0;
    renderDashboardSubtab();
  };
  if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
    dashboardRenderFrame = window.requestAnimationFrame(run);
  } else {
    dashboardRenderFrame = setTimeout(run, 0);
  }
}

// --- Roster Admin Functions (remain in dashboard scope) ---

async function initDashboardFirebase() {
  const { initFirebase } = await loadFirebaseApi();
  const firebase = initFirebase();
  state.cloudSyncConfigured = Boolean(firebase?.configured && firebase.db && firebase.auth);
  if (!state.cloudSyncConfigured) {
    logDashboardEvent('adminCloudLocalCache', 'warn', {}, { source: 'cloud' });
  }
  return state.cloudSyncConfigured;
}

async function ensureDashboardCloudInitialized() {
  if (!state._cloudInitPromise) {
    state._cloudInitPromise = (async () => {
      try {
        return await initDashboardFirebase();
      } catch (err) {
        console.warn('Cloud sync unavailable; continuing with local dashboard data.', err);
        state.cloudSyncConfigured = false;
        return false;
      }
    })();
  }
  return state._cloudInitPromise;
}

async function waitForAdminAuthUser(timeoutMs = 4000, options = {}) {
  const { getCurrentUser, isAdminAuthUser, onUserChanged } = await loadFirebaseApi();
  if (await isAdminAuthUser(state.adminUser, options)) return state.adminUser;
  const currentUser = getCurrentUser();
  if (await isAdminAuthUser(currentUser, options)) return currentUser;

  return new Promise((resolve) => {
    let done = false;
    let unsubscribe = () => {};
    const finish = (user = null) => {
      if (done) return;
      done = true;
      clearTimeout(timeout);
      try {
        unsubscribe();
      } catch (e) {}
      resolve(user);
    };
    const timeout = setTimeout(() => finish(null), timeoutMs);
    unsubscribe = onUserChanged((user) => {
      Promise.resolve(isAdminAuthUser(user, options))
        .then((isAdmin) => {
          if (isAdmin) finish(user);
        })
        .catch(() => {});
    });
  });
}

async function ensureCloudSyncReady() {
  await ensureDashboardCloudInitialized();
  if (!state.cloudSyncConfigured) return null;
  const { getCurrentUser, getDb, isAdminAuthUser } = await loadFirebaseApi();
  const db = getDb();
  if (!db) return null;
  // Validate the same custom claim Firestore enforces. Keeping the session
  // object avoids a transient auth-state callback from downgrading an active
  // admin before its persisted token is visible through getCurrentUser().
  let currentUser = null;
  if (await isAdminAuthUser(state.adminUser)) {
    currentUser = state.adminUser;
  } else {
    const liveUser = getCurrentUser();
    if (await isAdminAuthUser(liveUser)) currentUser = liveUser;
  }
  if (!currentUser && state.adminIsAdmin === true) {
    const waited = await waitForAdminAuthUser(4000);
    if (await isAdminAuthUser(waited)) currentUser = waited;
  }
  if (!currentUser) {
    // Transient probe miss: mark cloud not-ready but do NOT tear down the admin
    // session. Nulling state.adminUser/adminIsAdmin here poisons every later
    // write until a full re-login, which is exactly the failure we hit.
    state.cloudAdminReady = false;
    setCloudSyncStatus('error', dashT('adminCloudAdminRequired'));
    return null;
  }
  state.adminUser = currentUser;
  state.adminIsAdmin = true;
  state.cloudAdminReady = true;
  return db;
}

function cloneAllianceViewTestValue(value) {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function getLocalAllianceViewFirestoreContext() {
  if (localAllianceViewFirestoreContext) return localAllianceViewFirestoreContext;
  const documents = new Map([
    [
      'boh_allstar_config/current',
      { activeSeason: 'season-2026', open: true, grantDurationMinutes: 720 },
    ],
  ]);
  const listeners = new Map();
  let transactionQueue = Promise.resolve();

  const documentSnapshotFor = (path) => ({
    id: path.split('/').pop(),
    exists: () => documents.has(path),
    data: () => cloneAllianceViewTestValue(documents.get(path)),
  });
  const collectionSnapshotFor = (path) => {
    const prefix = `${path}/`;
    return {
      docs: [...documents.keys()]
        .filter(
          (documentPath) =>
            documentPath.startsWith(prefix) && !documentPath.slice(prefix.length).includes('/')
        )
        .map(documentSnapshotFor),
      forEach(callback) {
        this.docs.forEach(callback);
      },
    };
  };
  const snapshotFor = (reference) =>
    reference.kind === 'collection'
      ? collectionSnapshotFor(reference.path)
      : documentSnapshotFor(reference.path);
  const notifyPath = (path) => {
    const documentReference = { kind: 'doc', path };
    for (const listener of listeners.get(`doc:${path}`) || []) {
      listener(snapshotFor(documentReference));
    }
    const collectionPath = path.split('/').slice(0, -1).join('/');
    const collectionReference = { kind: 'collection', path: collectionPath };
    for (const listener of listeners.get(`collection:${collectionPath}`) || []) {
      listener(snapshotFor(collectionReference));
    }
  };
  const firestore = {
    doc: (_db, path) => ({ kind: 'doc', path: String(path) }),
    collection: (_db, path) => ({ kind: 'collection', path: String(path) }),
    getDoc: async (reference) => snapshotFor(reference),
    getDocs: async (reference) => snapshotFor(reference),
    onSnapshot: (reference, onNext) => {
      const key = `${reference.kind || 'doc'}:${reference.path}`;
      const pathListeners = listeners.get(key) || new Set();
      pathListeners.add(onNext);
      listeners.set(key, pathListeners);
      queueMicrotask(() => onNext(snapshotFor(reference)));
      return () => {
        pathListeners.delete(onNext);
        if (!pathListeners.size) listeners.delete(key);
      };
    },
    runTransaction: (_db, handler) => {
      const run = async () => {
        const writes = new Map();
        const transaction = {
          get: async (reference) => snapshotFor(reference),
          set: (reference, value) => writes.set(reference.path, cloneAllianceViewTestValue(value)),
          delete: (reference) => writes.set(reference.path, undefined),
        };
        const result = await handler(transaction);
        for (const [path, value] of writes) {
          if (value === undefined) documents.delete(path);
          else documents.set(path, value);
        }
        for (const path of writes.keys()) notifyPath(path);
        return result;
      };
      transactionQueue = transactionQueue.then(run, run);
      return transactionQueue;
    },
    serverTimestamp: () => new Date(),
  };
  const user = {
    uid: 'local-alliance-view-admin',
    getIdTokenResult: async () => ({ claims: { admin: true, superadmin: true } }),
  };
  localAllianceViewFirestoreContext = { db: { kind: 'local-alliance-view' }, user, firestore };
  return localAllianceViewFirestoreContext;
}

window.getVtsAdminFirestoreContext = async function () {
  if (isLocalAdminTestBypass()) return getLocalAllianceViewFirestoreContext();
  const db = await ensureCloudSyncReady();
  if (!db) throw new Error(dashT('adminCloudAdminRequired'));
  return {
    db,
    user: state.adminUser,
    firestore: await loadFirestoreApi(),
  };
};

// --- Sub-tab Switching ---

// --- Roster ---

// Ã¢â€â‚¬Ã¢â€â‚¬ Sub-tab Switching Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
// These two were behind a shared PIN, which protected nothing: firestore.rules
// had no concept of it, so any admin could read and write eden vote settings
// and conduct adjustments directly. They are now gated on the superadmin claim,
// which the rules and the setUserRole callable enforce independently.
const SUPERADMIN_DASH_SUBTABS = new Set(['edenVotes', 'conduct', 'userRoles']);

function switchDashSubtab(name) {
  if (SUPERADMIN_DASH_SUBTABS.has(name) && !dashSuperAdmin) {
    // Fail closed and say why, rather than doing nothing and looking broken.
    window.showToast?.(dashT('adminRolesSuperadminRequired'), 'error', 6000);
    return;
  }
  document
    .querySelectorAll('#ocrDashboardRoot .dash-subtab-panel')
    .forEach((p) => p.classList.add('hidden'));
  document.querySelectorAll('#ocrDashboardRoot .dash-subtab-btn').forEach((b) => {
    b.classList.remove('dash-subtab-active');
    b.setAttribute('aria-selected', 'false');
    b.tabIndex = -1;
  });
  const panel = $id('dashSubtab' + name.charAt(0).toUpperCase() + name.slice(1));
  if (panel) panel.classList.remove('hidden');
  const btn = document.querySelector(`#ocrDashboardRoot .dash-subtab-btn[data-subtab="${name}"]`);
  if (btn) {
    btn.classList.add('dash-subtab-active');
    btn.setAttribute('aria-selected', 'true');
    btn.tabIndex = 0;
  }
  // On mobile the grouped rail becomes a fixed bottom dock. Only the nav of
  // the active scope can dock; the other nav stays in the page flow so its
  // tabs remain reachable on a phone.
  const activeNav = btn?.closest('.dash-subtab-nav') || null;
  document.querySelectorAll('#ocrDashboardRoot .dash-subtab-nav').forEach((nav) => {
    nav.classList.toggle('dash-subtab-nav-docked', nav === activeNav);
  });
  if (name !== 'analytics') state._analyticsAnimated = false;
  // Let the newly selected panel paint before any data-heavy table/chart work.
  // Previously every hidden admin panel rendered synchronously inside the click.
  requestAnimationFrame(() => requestAnimationFrame(() => renderDashboardSubtab(name)));
  if (name === 'edenVotes') {
    if (state.adminIsAdmin === true) loadEdenX1VoteAdminData();
  }
}
window.switchDashSubtab = switchDashSubtab;
window.seedDashboardForSmokeTest = function (dashData, rosterSnapshots = []) {
  state.dashData = normalizeDashboardDataForCache(dashData);
  state.rosterSnapshots = Array.isArray(rosterSnapshots) ? rosterSnapshots : [];
};

function bindSubtabNavigation() {
  // Each labelled group is its own tablist, so arrow-key roving focus stays
  // inside one area instead of walking the whole former 11-tab rail.
  document
    .querySelectorAll('#ocrDashboardRoot .dash-subtab-group-tabs')
    .forEach((group) => group.setAttribute('role', 'tablist'));
  const nav = document.querySelector(
    '#ocrDashboardRoot .dash-subtab-nav:not(.dash-subtab-nav-grouped)'
  );
  if (nav) nav.setAttribute('role', 'tablist');
  document.querySelectorAll('#ocrDashboardRoot .dash-subtab-panel').forEach((panel) => {
    panel.setAttribute('role', 'tabpanel');
  });
  const initiallyActiveNav = document
    .querySelector('#ocrDashboardRoot .dash-subtab-btn.dash-subtab-active')
    ?.closest('.dash-subtab-nav');
  document.querySelectorAll('#ocrDashboardRoot .dash-subtab-nav').forEach((navEl) => {
    navEl.classList.toggle('dash-subtab-nav-docked', navEl === initiallyActiveNav);
  });
  document.querySelectorAll('#ocrDashboardRoot .dash-subtab-btn').forEach((btn) => {
    btn.setAttribute('role', 'tab');
    btn.setAttribute(
      'aria-selected',
      btn.classList.contains('dash-subtab-active') ? 'true' : 'false'
    );
    btn.tabIndex = btn.classList.contains('dash-subtab-active') ? 0 : -1;
    if (btn.dataset.subtabBound) return;
    btn.dataset.subtabBound = '1';
    btn.onclick = () => switchDashSubtab(btn.dataset.subtab);
    btn.onkeydown = (event) => {
      if (!['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'].includes(event.key))
        return;
      const scope = btn.closest('[role="tablist"]') || document;
      const tabs = Array.from(scope.querySelectorAll('.dash-subtab-btn'));
      const current = tabs.indexOf(btn);
      if (current < 0) return;
      event.preventDefault();
      const last = tabs.length - 1;
      const nextIndex =
        event.key === 'Home'
          ? 0
          : event.key === 'End'
            ? last
            : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
              ? (current - 1 + tabs.length) % tabs.length
              : (current + 1) % tabs.length;
      tabs[nextIndex]?.focus();
      tabs[nextIndex]?.click();
    };
  });
}

// --- Eden workspace command strip ---
// The strip shows the selected workspace's lifecycle and publication state and
// hosts the safe season actions. Switching workspaces persists the choice and
// reloads, which disposes every Firestore listener and re-resolves all
// workspace-scoped paths and cache keys in one step.
let edenWorkspaceCloudRecord = null;

function currentEdenWorkspaceView() {
  return parseEdenWorkspaceRecord(edenWorkspaceCloudRecord) || ACTIVE_EDEN_WORKSPACE;
}

function edenWorkspaceLifecycleI18nKey(lifecycle) {
  if (lifecycle === 'archived') return 'adminWorkspaceLifecycleArchived';
  if (lifecycle === 'active') return 'adminWorkspaceLifecycleActive';
  return 'adminWorkspaceLifecycleDraft';
}

function refreshEdenWorkspaceStrip() {
  const select = $id('dashWorkspaceSelect');
  if (select) select.value = ACTIVE_EDEN_WORKSPACE_ID;
  const ws = currentEdenWorkspaceView();
  const lifecycleBadge = $id('dashWorkspaceLifecycle');
  if (lifecycleBadge) {
    lifecycleBadge.dataset.lifecycle = ws.lifecycle;
    lifecycleBadge.textContent = ws.legacy
      ? `${dashT('adminWorkspaceLifecycleArchived')} · ${dashT('adminWorkspaceReadonlyBadge')}`
      : dashT(edenWorkspaceLifecycleI18nKey(ws.lifecycle));
  }
  const publication = $id('dashWorkspacePublication');
  const publishBtn = $id('dashWorkspacePublishBtn');
  const unpublishBtn = $id('dashWorkspaceUnpublishBtn');
  if (publication) {
    if (ws.legacy) {
      publication.hidden = true;
    } else {
      publication.hidden = false;
      publication.dataset.published = ws.publication ? 'true' : 'false';
      publication.textContent = ws.publication
        ? dashT('adminWorkspacePublishState', { n: ws.publication.revision })
        : dashT('adminWorkspaceUnpublishedState');
    }
  }
  if (publishBtn) {
    publishBtn.hidden = ws.legacy;
    publishBtn.setAttribute(
      'aria-label',
      ws.publication
        ? dashT('adminWorkspaceRepublishBtn', { workspace: ws.label })
        : dashT('adminWorkspacePublishBtn')
    );
  }
  if (unpublishBtn) unpublishBtn.hidden = ws.legacy || !ws.publication;
}

async function loadEdenWorkspaceCloudRecord() {
  if (ACTIVE_EDEN_WORKSPACE.legacy) {
    edenWorkspaceCloudRecord = null;
    refreshEdenWorkspaceStrip();
    return;
  }
  try {
    const db = await ensureCloudSyncReady();
    if (!db) return;
    const { doc, getDoc } = await loadFirestoreApi();
    const snap = await getDoc(doc(db, EDEN_WORKSPACE_COLLECTION_PATH, ACTIVE_EDEN_WORKSPACE_ID));
    edenWorkspaceCloudRecord = snap.exists() ? snap.data() : null;
  } catch (err) {
    console.warn('Eden workspace record unavailable:', err?.message || err);
  }
  refreshEdenWorkspaceStrip();
}

async function readEdenWorkspaceRosterSnapshots(db) {
  try {
    const { doc, getDoc } = await loadFirestoreApi();
    const snap = await getDoc(
      doc(db, edenWorkspaceFirestorePath(ACTIVE_EDEN_WORKSPACE_ID, 'rosterData'))
    );
    const data = snap.exists() ? snap.data() : null;
    return Array.isArray(data?.snapshots) ? data.snapshots : [];
  } catch {
    return [];
  }
}

async function publishActiveEdenWorkspace({ unpublish = false } = {}) {
  if (ACTIVE_EDEN_WORKSPACE.legacy) return false;
  if (state.adminIsAdmin !== true) {
    showCloudSyncFailure(new Error(dashT('adminCloudAdminRequired')), 'Publish blocked');
    return false;
  }
  const ws = currentEdenWorkspaceView();
  const confirmKey = unpublish ? 'adminWorkspaceUnpublishConfirm' : 'adminWorkspacePublishConfirm';
  if (!window.confirm(dashT(confirmKey, { workspace: ws.label }))) return false;
  try {
    const db = await ensureCloudSyncReady();
    if (!db) throw new Error(dashT('adminCloudLocalCache'));
    const { doc, getDoc, setDoc, serverTimestamp } = await loadFirestoreApi();
    const projectionRef = doc(
      db,
      edenWorkspaceFirestorePath(ACTIVE_EDEN_WORKSPACE_ID, 'publicProjection')
    );
    const previousSnap = await getDoc(projectionRef);
    const previous = previousSnap.exists() ? previousSnap.data() : null;
    const previousRevision = Number(previous?.revision) || 0;
    let rosterSnapshots = [];
    let publicVoteResults = {};
    if (!unpublish) {
      rosterSnapshots = await readEdenWorkspaceRosterSnapshots(db);
      const settings = normalizeEdenX1VoteSettings(state.edenX1VoteSettings || {});
      if (settings.showPublicResults && typeof buildEdenX1PublicVoteResults === 'function') {
        publicVoteResults = buildEdenX1PublicVoteResults(settings);
      }
    }
    const projection = buildEdenPublicProjection({
      workspace: ACTIVE_EDEN_WORKSPACE_ID,
      revision: unpublish ? Math.max(1, previousRevision) : previousRevision + 1,
      published: !unpublish,
      updatedBy: state.adminUser?.uid || '',
      dashboardData: unpublish
        ? buildEmptyEdenWorkspaceDashboard(ACTIVE_EDEN_WORKSPACE.defaultSeason)
        : state.dashData || buildEmptyEdenWorkspaceDashboard(ACTIVE_EDEN_WORKSPACE.defaultSeason),
      voteSettings: unpublish ? {} : normalizeEdenX1VoteSettings(state.edenX1VoteSettings || {}),
      publicVoteResults,
      rosterSnapshots,
    });
    await setDoc(projectionRef, projection);
    await setDoc(doc(db, EDEN_WORKSPACE_COLLECTION_PATH, ACTIVE_EDEN_WORKSPACE_ID), {
      id: ACTIVE_EDEN_WORKSPACE_ID,
      lifecycle: unpublish ? 'draft' : 'active',
      active: !unpublish,
      createdAtMs: ws.createdAtMs || Date.now(),
      publication: unpublish
        ? null
        : {
            revision: projection.revision,
            publishedAtMs: projection.publishedAtMs,
            updatedBy: projection.updatedBy,
          },
      updatedAt: serverTimestamp(),
      updatedBy: state.adminUser?.uid || '',
    });
    edenWorkspaceCloudRecord = null;
    await loadEdenWorkspaceCloudRecord();
    logDashboardEvent(
      unpublish ? 'adminLogWorkspaceUnpublished' : 'adminLogWorkspacePublished',
      'success',
      { workspace: ws.label, revision: String(projection.revision) },
      { source: 'workspace' }
    );
    if (typeof window.showToast === 'function') {
      window.showToast(
        unpublish
          ? dashT('adminWorkspaceUnpublishedToast')
          : dashT('adminWorkspacePublishedToast', { n: projection.revision }),
        'success',
        6000
      );
    }
    return true;
  } catch (err) {
    showCloudSyncFailure(err, 'Workspace publish failed');
    if (typeof window.showToast === 'function') {
      window.showToast(
        dashT('adminWorkspacePublishFailedToast', { error: err?.message || err }),
        'error',
        9000
      );
    }
    return false;
  }
}

async function exportActiveEdenWorkspaceSnapshot() {
  const ws = currentEdenWorkspaceView();
  try {
    const db = await ensureCloudSyncReady();
    const { doc, getDoc, collection, getDocs } = await loadFirestoreApi();
    const paths = edenWorkspaceFirestorePathsForExport();
    const readDoc = async (path) => {
      if (!path) return null;
      const snap = await getDoc(doc(db, path));
      return snap.exists() ? snap.data() : null;
    };
    const readCollection = async (path) => {
      if (!path) return [];
      const snap = await getDocs(collection(db, path));
      return snap.docs.map((entry) => ({ id: entry.id, data: entry.data() }));
    };
    const snapshot = {
      schema: 'vts-eden-workspace-snapshot-v1',
      workspace: ws.id,
      label: ws.label,
      exportedAt: new Date().toISOString(),
      docs: {
        dashboardData: await readDoc(paths.dashboardData),
        rosterData: await readDoc(paths.rosterData),
        voteSettings: await readDoc(paths.voteSettings),
        publicVoteResults: await readDoc(paths.publicVoteResults),
        publicProjection: await readDoc(paths.publicProjection),
        votes: await readCollection(paths.votes),
        voteHistory: await readCollection(paths.voteHistory),
        conductAdjustments: await readCollection(paths.conductAdjustments),
      },
    };
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vts-${ws.id}-snapshot-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    if (typeof window.showToast === 'function') {
      window.showToast(dashT('adminWorkspaceSnapshotToast'), 'success', 5000);
    }
    logDashboardEvent(
      'adminLogWorkspaceSnapshot',
      'success',
      { workspace: ws.label },
      { source: 'workspace' }
    );
  } catch (err) {
    console.error('Workspace snapshot export failed:', err);
    showCloudSyncFailure(err, 'Workspace snapshot failed');
    if (typeof window.showToast === 'function') {
      window.showToast(
        dashT('adminWorkspacePublishFailedToast', { error: err?.message || err }),
        'error',
        9000
      );
    }
  }
}

function edenWorkspaceFirestorePathsForExport() {
  return {
    dashboardData: edenWorkspaceFirestorePath(ACTIVE_EDEN_WORKSPACE_ID, 'dashboardData'),
    rosterData: edenWorkspaceFirestorePath(ACTIVE_EDEN_WORKSPACE_ID, 'rosterData'),
    voteSettings: edenWorkspaceFirestorePath(ACTIVE_EDEN_WORKSPACE_ID, 'voteSettings'),
    publicVoteResults: edenWorkspaceFirestorePath(ACTIVE_EDEN_WORKSPACE_ID, 'publicVoteResults'),
    publicProjection: edenWorkspaceFirestorePath(ACTIVE_EDEN_WORKSPACE_ID, 'publicProjection'),
    votes: edenWorkspaceFirestorePath(ACTIVE_EDEN_WORKSPACE_ID, 'votes'),
    voteHistory: edenWorkspaceFirestorePath(ACTIVE_EDEN_WORKSPACE_ID, 'voteHistory'),
    conductAdjustments: edenWorkspaceFirestorePath(ACTIVE_EDEN_WORKSPACE_ID, 'conductAdjustments'),
  };
}

function bindEdenWorkspaceStrip() {
  const select = $id('dashWorkspaceSelect');
  if (select && !select.dataset.bound) {
    select.dataset.bound = '1';
    select.value = ACTIVE_EDEN_WORKSPACE_ID;
    select.onchange = () => {
      const next = select.value;
      if (!next || next === ACTIVE_EDEN_WORKSPACE_ID) return;
      if (
        !window.confirm(
          dashT('adminWorkspaceSwitchConfirm', { workspace: getEdenWorkspaceLabel(next) })
        )
      ) {
        select.value = ACTIVE_EDEN_WORKSPACE_ID;
        return;
      }
      setActiveAdminWorkspaceId(next);
      if (typeof window.showToast === 'function') {
        window.showToast(
          dashT('adminWorkspaceSwitchToast', { workspace: getEdenWorkspaceLabel(next) }),
          'info',
          4000
        );
      }
      setTimeout(() => window.location.reload(), 350);
    };
  }
  const publishBtn = $id('dashWorkspacePublishBtn');
  if (publishBtn && !publishBtn.dataset.bound) {
    publishBtn.dataset.bound = '1';
    publishBtn.onclick = () => {
      void publishActiveEdenWorkspace();
    };
  }
  const unpublishBtn = $id('dashWorkspaceUnpublishBtn');
  if (unpublishBtn && !unpublishBtn.dataset.bound) {
    unpublishBtn.dataset.bound = '1';
    unpublishBtn.onclick = () => {
      void publishActiveEdenWorkspace({ unpublish: true });
    };
  }
  const snapshotBtn = $id('dashWorkspaceSnapshotBtn');
  if (snapshotBtn && !snapshotBtn.dataset.bound) {
    snapshotBtn.dataset.bound = '1';
    snapshotBtn.onclick = () => {
      void exportActiveEdenWorkspaceSnapshot();
    };
  }
  refreshEdenWorkspaceStrip();
}

function getEdenWorkspaceLabel(workspaceId) {
  return getEdenWorkspace(workspaceId).label;
}

function hydrateDashboardStateFromLocalStorage() {
  if (!Array.isArray(state.dashData?.attacks) || !state.dashData.attacks.length) {
    try {
      const cached = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (
        cached?.attacks ||
        cached?.bannerRecords ||
        cached?.dutyRecords ||
        cached?.contributionRecords
      ) {
        state.dashData = normalizeDashboardDataForCache(cached);
        hydrateAuxiliaryRecordsFromDashboardData(state.dashData);
      }
    } catch (e) {}
  }
  if (!state.rosterSnapshots?.length) {
    try {
      const cachedRoster = JSON.parse(localStorage.getItem(ROSTER_SNAPSHOTS_KEY) || '[]');
      if (Array.isArray(cachedRoster)) state.rosterSnapshots = cachedRoster;
    } catch (e) {}
  }
  return hasUsableDashboardCache(state.dashData);
}

window.refreshOcrDashboardFromStorage = function refreshOcrDashboardFromStorage() {
  hydrateDashboardStateFromLocalStorage();
  scheduleDashboardRender();
};

window.setOcrDashboardDataForTest = function setOcrDashboardDataForTest(
  dashData,
  rosterSnapshots = [],
  r5Adjustments = []
) {
  state.dashData = normalizeDashboardDataForCache(dashData);
  hydrateAuxiliaryRecordsFromDashboardData(state.dashData);
  state.rosterSnapshots = Array.isArray(rosterSnapshots) ? rosterSnapshots : [];
  state.r5Season = state.r5Season || getDashboardR5SeasonKey();
  state.r5Adjustments = (Array.isArray(r5Adjustments) ? r5Adjustments : [])
    .map((record) => {
      try {
        return normalizeR5Adjustment(record, { season: record?.season || state.r5Season });
      } catch (e) {
        return null;
      }
    })
    .filter(Boolean);
  refreshAlliancePublicConductAdjustments();
  writeDashboardLocalCache(attachAuxiliaryRecords(state.dashData));
  try {
    localStorage.setItem(ROSTER_SNAPSHOTS_KEY, JSON.stringify(state.rosterSnapshots));
  } catch (e) {}
  renderConductAdjustments();
  render();
};

window.setEdenX1VotesForTest = function setEdenX1VotesForTest(
  votes = [],
  history = [],
  settings = null
) {
  state.edenX1Votes = dedupeEdenX1Votes(Array.isArray(votes) ? votes : []);
  state.edenX1VoteHistory = (Array.isArray(history) ? history : []).map(
    normalizeEdenX1VoteHistoryRecord
  );
  if (settings) state.edenX1VoteSettings = normalizeEdenX1VoteSettings(settings);
  publishAllianceViewContributionModel();
  renderEdenX1VoteAdmin();
};

window.getAllianceViewStateForTest = function getAllianceViewStateForTest() {
  return isLocalAdminTestBypass() ? allianceViewController?.getState?.() || null : null;
};

// Ã¢â€â‚¬Ã¢â€â‚¬ Roster Snapshots (local + Firestore) Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
const ROSTER_SNAPSHOTS_BACKUP_KEY = 'vts_roster_snapshots_backup_v1';

function rosterCloudUpdated(data) {
  return String(data?.updated || '');
}

function backupRosterSnapshots(snapshots, reason) {
  if (!Array.isArray(snapshots) || !snapshots.length) return;
  try {
    localStorage.setItem(
      ROSTER_SNAPSHOTS_BACKUP_KEY,
      JSON.stringify({ savedAt: new Date().toISOString(), reason, snapshots })
    );
  } catch (e) {}
}

function applyRosterCloudData(data) {
  if (!Array.isArray(data?.snapshots)) return false;
  state.rosterSnapshots = trimRosterSnapshots(data.snapshots);
  state._rosterCloudBaseUpdated = rosterCloudUpdated(data);
  state._rosterDeferredCloudData = null;
  state._rosterCloudConflict = false;
  localStorage.setItem(ROSTER_SNAPSHOTS_KEY, JSON.stringify(state.rosterSnapshots));
  renderRoster();
  return true;
}

function createRosterCloudConflictError(cloudData) {
  const error = new Error(rosterCloudConflictMessage());
  error.name = 'RosterCloudConflictError';
  error.code = 'roster-cloud-conflict';
  error.cloudData = cloudData;
  return error;
}

const rosterCloudConflictMessage = () => dashT('adminCloudStaleWriteSkipped');

function cloneRosterSnapshots(snapshots) {
  try {
    if (typeof structuredClone === 'function') return structuredClone(snapshots);
    return JSON.parse(JSON.stringify(snapshots));
  } catch {
    return snapshots.slice();
  }
}

function nextRosterCloudUpdated(cloudUpdated) {
  const cloudMs = Date.parse(cloudUpdated);
  return new Date(Math.max(Date.now(), Number.isFinite(cloudMs) ? cloudMs + 1 : 0)).toISOString();
}

async function writeRosterSnapshotsToFirestore({ snapshots, sourceLength }, baseUpdated) {
  try {
    const db = await ensureCloudSyncReady();
    if (!db) return { ok: false };
    const { doc, runTransaction } = await loadFirestoreApi();
    if (snapshots.length !== sourceLength) {
      logDashboardEvent(
        'adminLogRosterTrimmed',
        'warn',
        { count: snapshots.length },
        { source: 'roster' }
      );
    }
    const ref = doc(db, FS_ROSTER_PATH);
    let writtenData = null;
    await runTransaction(db, async (transaction) => {
      const current = await transaction.get(ref);
      const cloudData = current.exists() ? current.data() : null;
      const cloudUpdated = rosterCloudUpdated(cloudData);
      const expectedUpdated = baseUpdated === null ? null : String(baseUpdated);
      if (
        (cloudData && (expectedUpdated === null || expectedUpdated !== cloudUpdated)) ||
        (!cloudData && expectedUpdated !== null && expectedUpdated !== '')
      ) {
        throw createRosterCloudConflictError(cloudData);
      }
      writtenData = sanitizeForFirestore({
        snapshots,
        updated: nextRosterCloudUpdated(cloudUpdated),
      });
      transaction.set(ref, writtenData);
    });
    state._rosterCloudBaseUpdated = rosterCloudUpdated(writtenData);
    return { ok: true, revision: state._rosterCloudBaseUpdated };
  } catch (e) {
    console.error('ROSTER FIRESTORE SAVE ERROR:', e);
    if (e?.code === 'roster-cloud-conflict') {
      backupRosterSnapshots(snapshots, 'cloud-conflict');
      state._rosterCloudConflict = true;
      if (e.cloudData) state._rosterDeferredCloudData = e.cloudData;
      setCloudSyncStatus('error', e.message);
      logDashboardEvent('adminCloudStaleWriteSkipped', 'warn', {}, { source: 'roster' });
      if (typeof window.showToast === 'function') window.showToast(e.message, 'warn', 9000);
      return { ok: false };
    }
    showCloudSyncFailure(e, 'Roster cloud save failed');
    return { ok: false };
  }
}

function reconcileDeferredRosterCloudData() {
  const deferred = state._rosterDeferredCloudData;
  if (!deferred) return;
  const incomingUpdated = rosterCloudUpdated(deferred);
  const currentUpdated = String(state._rosterCloudBaseUpdated || '');
  if (!incomingUpdated || incomingUpdated <= currentUpdated) {
    state._rosterDeferredCloudData = null;
    return;
  }
  if (state._rosterCloudConflict) return;
  state._rosterCloudConflict = true;
  backupRosterSnapshots(state.rosterSnapshots, 'cloud-conflict');
  setCloudSyncStatus('error', rosterCloudConflictMessage());
  logDashboardEvent('adminCloudStaleWriteSkipped', 'warn', {}, { source: 'roster' });
  if (typeof window.showToast === 'function') {
    window.showToast(rosterCloudConflictMessage(), 'warn', 9000);
  }
}

const rosterCloudWriteQueue = createRevisionWriteQueue(writeRosterSnapshotsToFirestore, {
  onIdle() {
    state._rosterCloudSaveInFlight = false;
    reconcileDeferredRosterCloudData();
  },
});

export function saveRosterSnapshotsToFirestore(
  snapshotInput = state.rosterSnapshots,
  baseUpdated = state._rosterCloudBaseUpdated ?? null
) {
  if (blockEdenArchiveWrite('save roster snapshots')) return Promise.resolve(false);
  const sourceSnapshots = cloneRosterSnapshots(Array.isArray(snapshotInput) ? snapshotInput : []);
  const snapshots = trimRosterSnapshots(sourceSnapshots);
  state._rosterCloudSaveInFlight = true;
  return rosterCloudWriteQueue
    .enqueue({ snapshots, sourceLength: sourceSnapshots.length }, baseUpdated)
    .then((result) => result?.ok === true);
}
async function loadRosterSnapshotsFromFirestore() {
  if (state._fsRosterUnsub) {
    state._fsRosterUnsub();
    state._fsRosterUnsub = null;
  }
  try {
    const db = await ensureCloudSyncReady();
    if (!db) return;
    const { doc, getDoc, onSnapshot } = await loadFirestoreApi();
    const snap = await getDoc(doc(db, FS_ROSTER_PATH));
    if (snap.exists()) {
      const data = snap.data();
      if (Array.isArray(data.snapshots)) {
        if (JSON.stringify(state.rosterSnapshots) !== JSON.stringify(data.snapshots)) {
          backupRosterSnapshots(state.rosterSnapshots, 'cloud-refresh');
        }
        applyRosterCloudData(data);
      }
    }
    state._fsRosterUnsub = onSnapshot(
      doc(db, FS_ROSTER_PATH),
      (s) => {
        if (s.exists()) {
          const d = s.data();
          if (Array.isArray(d.snapshots)) {
            if (
              state._rosterCloudSaveInFlight ||
              Number(state._rosterCloudSaveQueued || 0) > 0 ||
              rosterCloudWriteQueue.state().pending > 0
            ) {
              state._rosterDeferredCloudData = d;
              return;
            }
            if (rosterCloudUpdated(d) === state._rosterCloudBaseUpdated) return;
            applyRosterCloudData(d);
          }
        }
      },
      (err) => {
        if (state._signingOut) return;
        console.error('ROSTER SYNC ERROR:', err);
        showCloudSyncFailure(err, 'Roster sync listener error');
      }
    );
  } catch (e) {
    if (state._signingOut) return;
    console.error('ROSTER FIRESTORE LOAD ERROR:', e);
    showCloudSyncFailure(e, 'Roster cloud load failed');
  }
}

// Ã¢â€â‚¬Ã¢â€â‚¬ Roster Image OCR Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
async function processRosterImages(files) {
  if (state._rosterProcessing) {
    logDashboardEvent('adminLogRosterAlreadyRunning', 'warn', {}, { source: 'roster' });
    return;
  }
  state._rosterProcessing = true;
  const valid = getSupportedOcrImageFiles(files);
  if (!valid.length) {
    const rejected = describeRejectedOcrImageFiles(files);
    const params = rejected.length ? { files: rejected.slice(0, 3).join(', ') } : {};
    if (rejected.length) {
      logDashboardEvent('adminRosterUnsupportedImageStatus', 'warn', params, {
        source: 'roster',
        localOnly: true,
      });
    } else {
      logDashboardEvent('adminRosterNoImageSelectedStatus', 'warn', {}, { source: 'roster' });
    }
    state._rosterProcessing = false;
    return;
  }

  const prog = $id('dashRosterProgress');
  const progText = $id('dashRosterProgressText');
  if (prog) prog.classList.remove('hidden');

  logDashboardEvent(
    'adminRosterScanningImagesLog',
    'info',
    { count: valid.length },
    { source: 'roster' }
  );

  let allNames = [];

  for (let i = 0; i < valid.length; i++) {
    const f = valid[i];
    if (progText)
      progText.textContent = dashT('adminRosterScanningImageProgress', {
        current: i + 1,
        total: valid.length,
      });
    const imageUrl = await readOcrImageDataUrl(f);

    try {
      const promptTxt = `You are analyzing a game alliance roster or member list screenshot.

Extract ALL player names visible in the image. Return them as a flat JSON array of strings.

RULES:
- Output ONLY valid JSON: an array of strings like ["Name1", "Name2", ...]
- Do NOT wrap in markdown blocks. No commentary.
- Include alliance/clan tags if visible (e.g. "[VTS]PlayerName").
- Remove duplicate names.
- Ignore headers, column titles, rank numbers, power levels, or any non-name text.
- If no names are clearly visible, return [].

JSON SCHEMA: ["Player One", "Player Two", "Player Three"]`;

      let raw = null;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          raw = await qwenVisionRequest([
            {
              role: 'user',
              content: [
                { type: 'text', text: promptTxt },
                { type: 'image_url', image_url: { url: imageUrl } },
              ],
            },
          ]);
          if (raw?.choices?.[0]?.message?.content) break;
        } catch (e) {
          if (attempt === 3 || !isRetryableOcrRequestError(e)) throw e;
          const delayMs = getOcrRetryDelayMs(e, attempt);
          const delaySeconds = Math.max(1, Math.ceil(delayMs / 1000));
          logDashboardEvent(
            'adminRosterOcrRetryLog',
            'warn',
            {
              error: describeOcrRequestError(e, dashT),
              seconds: delaySeconds,
              attempt,
              total: 3,
            },
            { file: f.name, source: 'ocr', localOnly: true }
          );
          await new Promise((r) => setTimeout(r, delayMs));
        }
      }

      const text = raw?.choices?.[0]?.message?.content || '';
      let names = [];
      try {
        const cleaned = text
          .replace(/```(?:json)?\s*/gi, '')
          .replace(/```/g, '')
          .trim();
        names = JSON.parse(cleaned);
      } catch (e) {
        names = text
          .split('\n')
          .map((l) => l.replace(/^[\d\s."'[\],]+/, '').trim())
          .filter(Boolean);
      }
      if (!Array.isArray(names)) names = [];
      names = names
        .filter((n) => typeof n === 'string' && n.trim().length > 0)
        .map((n) => n.trim());
      allNames.push(...names);
    } catch (e) {
      logDashboardEvent(
        'adminRosterOcrErrorLog',
        'error',
        { error: describeOcrRequestError(e, dashT) },
        { file: f.name, source: 'ocr', localOnly: true }
      );
    }
  }

  if (prog) prog.classList.add('hidden');
  state._rosterProcessing = false;

  const unique = [...new Set(allNames.map((n) => n.toLowerCase()))]
    .map((k) => allNames.find((n) => n.toLowerCase() === k))
    .filter(Boolean)
    .sort();

  if (!unique.length) {
    logDashboardEvent('adminLogRosterNoNames', 'warn', {}, { source: 'roster' });
    alert(dashT('adminRosterExtractFailedAlert'));
    return;
  }

  logDashboardEvent(
    'adminLogRosterExtracted',
    'info',
    { count: unique.length },
    { source: 'roster' }
  );

  const prevText = state.rosterSnapshots.length
    ? state.rosterSnapshots[state.rosterSnapshots.length - 1].members.join('\n')
    : '';
  const input = prompt(
    dashT('adminRosterReviewExtractedPrompt', { count: unique.length }),
    unique.join('\n')
  );
  if (input !== null && input.trim()) {
    takeRosterSnapshot(input);
  } else {
    logDashboardEvent('adminLogRosterCancelled', 'warn', {}, { source: 'roster' });
  }
}

// Ã¢â€â‚¬Ã¢â€â‚¬ Banner Records Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

function isLocalAdminTestBypass() {
  if (typeof location === 'undefined') return false;
  const localHosts = new Set(['localhost', '127.0.0.1', '::1']);
  return (
    localHosts.has(location.hostname) &&
    (globalThis.VTS_ADMIN_LOCAL_TEST_AUTH === true ||
      localStorage.getItem(ADMIN_LOCAL_TEST_KEY) === '1')
  );
}

function isAuthed() {
  return state.adminIsAdmin === true || isLocalAdminTestBypass();
}

function getAdminLoginUsername() {
  return String($id('dashLoginUser')?.value || '').trim();
}

function getAdminLoginPassword() {
  return String($id('dashLoginPass')?.value || '');
}

function setLoginError(message = '') {
  const err = $id('dashLoginErr');
  if (!err) return;
  err.textContent = message;
  err.classList.toggle('hidden', !message);
  ['dashLoginUser', 'dashLoginPass'].forEach((id) => {
    $id(id)?.setAttribute('aria-invalid', message ? 'true' : 'false');
  });
}

function setLoginBusy(busy) {
  const loginBtn = $id('dashLoginBtn');
  if (!loginBtn) return;
  loginBtn.disabled = busy;
  loginBtn.setAttribute('aria-busy', busy ? 'true' : 'false');
  loginBtn.textContent = busy ? dashT('adminConnectingAuth') : dashT('adminLoginBtn');
}

function describeAdminAuthError(err) {
  const text = `${err?.code || ''} ${err?.message || err || ''}`;
  if (
    /auth\/invalid-credential|auth\/wrong-password|auth\/user-not-found|auth\/invalid-login-credentials/i.test(
      text
    )
  ) {
    return dashT('adminLoginInvalid');
  }
  if (/auth\/too-many-requests/i.test(text)) return dashT('adminLoginTooMany');
  if (/auth\/operation-not-allowed/i.test(text)) return dashT('adminLoginEmailDisabled');
  return err?.message || String(err || dashT('adminLoginFailed'));
}

let connectingTimer = null;
let connectingProgressValue = 0;
let _isConnecting = false;

async function completeConnectingProgress(statusMsg = '') {
  setConnectingProgress(96, statusMsg || dashT('adminConnectingData'), { immediate: true });
  await new Promise((resolve) => requestAnimationFrame(resolve));
  setConnectingProgress(100, '', { force: true, immediate: true });
}

function showConnecting(statusMsg = '') {
  _isConnecting = true;
  $id('dashLogin')?.classList.add('hidden');
  $id('dashApp')?.classList.add('hidden');
  const overlay = $id('dashConnecting');
  if (overlay) {
    overlay.classList.remove('hidden');
    overlay.setAttribute('aria-busy', 'true');
  }
  const status = $id('dashConnectingStatus');
  if (status) status.textContent = statusMsg;
  connectingProgressValue = 4;
  setConnectingProgress(connectingProgressValue);
  if (connectingTimer) clearTimeout(connectingTimer);
  connectingTimer = setTimeout(() => {
    console.warn('Connecting overlay exceeded 12s - forcing dashboard open.');
    hideConnecting();
    if (isAuthed()) {
      showApp();
      render();
    } else showLogin();
  }, 12000);
}
function hideConnecting() {
  _isConnecting = false;
  if (connectingTimer) {
    clearTimeout(connectingTimer);
    connectingTimer = null;
  }
  const overlay = $id('dashConnecting');
  if (!overlay) return;
  overlay.classList.add('hidden');
  overlay.removeAttribute('aria-busy');
}
function setConnectingStatus(msg) {
  const status = $id('dashConnectingStatus');
  if (status) status.textContent = msg || '';
}
function setConnectingProgress(pct, statusMsg, options = {}) {
  const fill = $id('dashConnectingBarFill');
  const pctEl = $id('dashConnectingBarPct');
  const clamped = Math.max(0, Math.min(100, pct));
  connectingProgressValue = options.force ? clamped : Math.max(connectingProgressValue, clamped);
  if (fill) {
    if (options.immediate === true) fill.style.transition = 'none';
    fill.style.width = `${connectingProgressValue}%`;
    if (options.immediate === true) {
      void fill.offsetWidth;
      fill.style.removeProperty('transition');
    }
  }
  if (pctEl) pctEl.textContent = `${Math.floor(connectingProgressValue)}%`;
  if (statusMsg) setConnectingStatus(statusMsg);
}
function updateLastSynced() {
  const el = $id('dashUpdated');
  if (!el) return;
  const time = formatLocaleDate(new Date(), getDashboardLang(), {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  el.textContent = ' - ' + dashT('adminLastSynced', { time });
}
function setRefreshNeedsCloud(needsCloud) {
  const btn = $id('dashRefreshBtn');
  if (!btn) return;
  btn.classList.toggle('dash-refresh-needed', Boolean(needsCloud));
  if (needsCloud) btn.title = dashT('adminCloudRefreshHint');
  else btn.removeAttribute('title');
}
function renderCloudSyncStatus() {
  const status = state.cloudSyncStatus;
  const statusEl = $id('dashCloudStatus');
  const textEl = $id('dashCloudStatusText');
  const bannerEl = $id('dashCloudBanner');
  const bannerTextEl = $id('dashCloudBannerText');
  const bannerBtn = $id('dashCloudBannerBtn');
  if (!statusEl || !textEl) return;
  if (!status) {
    statusEl.classList.add('hidden');
    bannerEl?.classList.add('hidden');
    setRefreshNeedsCloud(false);
    return;
  }
  const textKeys = {
    syncing: 'adminCloudSyncing',
    live: 'adminCloudSynced',
    local: 'adminCloudLocalCache',
    error: 'adminCloudSyncError',
  };
  const key = textKeys[status] || textKeys.syncing;
  const detail = state.cloudSyncStatusDetail || '';
  statusEl.dataset.state = status;
  textEl.textContent = dashT(key);
  if (detail) {
    statusEl.title = detail;
  } else {
    statusEl.removeAttribute('title');
  }
  statusEl.classList.remove('hidden');
  const needsCloud = status === 'local' || status === 'error';
  setRefreshNeedsCloud(needsCloud);

  if (bannerEl && bannerTextEl) {
    bannerEl.dataset.state = status;
    bannerTextEl.textContent = detail || dashT(status === 'local' ? 'adminCloudRetryPending' : key);
    bannerEl.classList.toggle('hidden', !needsCloud);
    if (bannerBtn) {
      // When the failure is an auth/permission issue, the button re-opens the
      // login screen (see handler below), so label it accordingly.
      const needsLogin = status === 'error' && !state.adminIsAdmin;
      const btnKey = needsLogin ? 'adminLoginBtn' : 'adminBtnRefresh';
      const btnSpan = bannerBtn.querySelector('[data-i18n]') || bannerBtn;
      btnSpan.setAttribute('data-i18n', btnKey);
      btnSpan.textContent = dashT(btnKey);
    }
  }
  if (bannerBtn && bannerBtn.dataset.cloudBannerWired !== '1') {
    bannerBtn.dataset.cloudBannerWired = '1';
    bannerBtn.addEventListener('click', () => {
      if (state.cloudSyncStatus === 'error' && !state.adminIsAdmin) {
        showLogin();
        return;
      }
      $id('dashRefreshBtn')?.click();
    });
  }
}
function setCloudSyncStatus(status, detail = '') {
  state.cloudSyncStatus = status;
  state.cloudSyncStatusDetail = detail || '';
  renderCloudSyncStatus();
}
function describeCloudSyncError(err) {
  const text = `${err?.code || ''} ${err?.message || err || ''}`;
  if (/permission-denied|permission|insufficient|admin/i.test(text)) {
    return dashT('adminCloudAdminRequired');
  }
  if (
    /app ?check.*(?:missing|unavailable)|missing.*app ?check|unavailable.*app ?check/i.test(text)
  ) {
    return dashT('adminOcrUnavailable');
  }
  if (/Firebase not initialized|missing|config/i.test(text)) {
    return dashT('edenX1NoFirebase');
  }
  if (isRecoverableDashboardCloudError(err)) {
    return dashT('adminCloudLocalCache');
  }
  return err?.message || err?.code || String(err || dashT('adminCloudSyncError'));
}
function showCloudSyncFailure(err) {
  const message = describeCloudSyncError(err);
  const recoverable = isRecoverableDashboardCloudError(err);
  if (recoverable) state._cloudInitPromise = null;
  setCloudSyncStatus(recoverable ? 'local' : 'error', message);
  if (recoverable) {
    logDashboardEvent('adminCloudLocalCache', 'warn', {}, { source: 'cloud' });
  } else {
    logDashboardEvent('adminCloudSyncError', 'error', {}, { source: 'cloud' });
  }
  if (!_isConnecting && typeof window.showToast === 'function')
    window.showToast(message, recoverable ? 'info' : 'error', 7000);
  return message;
}
function setRefreshBusy(busy) {
  const btn = $id('dashRefreshBtn');
  if (!btn) return;
  btn.disabled = busy;
  btn.classList.toggle('dash-btn-busy', busy);
  btn.setAttribute('aria-busy', busy ? 'true' : 'false');
}

function getDashboardLang() {
  return resolveRuntimeLocale();
}

function dashT(key, vars = {}) {
  const lang = getDashboardLang();
  const dictionaries = window.VTS_TRANSLATIONS || translations;
  let text =
    dictionaries[lang]?.[key] ||
    translations[lang]?.[key] ||
    dictionaries.en?.[key] ||
    translations.en?.[key] ||
    key;
  Object.entries(vars).forEach(([name, value]) => {
    text = text.replaceAll(`{${name}}`, String(value));
  });
  return text;
}

function allStarBohAdminT(key, vars = {}) {
  if (typeof allStarBohAdminI18n?.adminAllStarBohText === 'function') {
    return allStarBohAdminI18n.adminAllStarBohText(key, vars, getDashboardLang());
  }
  const domainTranslator = window.VTS_ALL_STAR_BOH_TRANSLATE || window.allStarBohText;
  if (typeof domainTranslator === 'function') {
    try {
      const translated = domainTranslator(key, vars, getDashboardLang());
      if (translated && translated !== key) return translated;
    } catch (error) {
      console.warn('ALL-STAR BOH ADMIN TRANSLATION ERROR:', error);
    }
  }
  return dashT(key, vars);
}

function logDashboardEvent(key, type = 'info', params = {}, options = {}) {
  return log(dashT(key, params), type, options.file || null, {
    messageKey: key,
    params,
    source: options.source || 'dashboard',
    localOnly: options.localOnly === true,
  });
}

let adminLogSyncController = null;
let adminLogControlsBound = false;
let adminLogSyncState = 'local';
let adminLogRenderFrame = null;

function formatAdminLogTime(entry) {
  if (entry?.legacyTime) return entry.legacyTime;
  const millis = Number(entry?.createdAtMs) || Number(entry?.clientCreatedAtMs) || 0;
  if (!millis) return '--:--:--';
  try {
    return formatLocaleDate(millis, getDashboardLang(), {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return new Date(millis).toISOString().slice(11, 19);
  }
}

function getFilteredAdminLogEntries() {
  return listAdminLogEntries({
    query: $id('dashLogSearch')?.value || '',
    severity: $id('dashLogSeverity')?.value || 'all',
    limit: 200,
  });
}

function adminLogSourceLabel(entry) {
  const labels = [];
  if (entry?.source && entry.source !== 'system') labels.push(entry.source);
  if (entry?.file) labels.push(entry.file);
  return labels.join(' · ');
}

function renderAdminActivityTerminal() {
  const out = $id('dashLogOutput');
  if (!out) return;
  const entries = getFilteredAdminLogEntries();
  if (!$id('dashTerminalBody')?.hidden) {
    const wasNearBottom = out.scrollHeight - out.scrollTop - out.clientHeight < 36;
    const fragment = document.createDocumentFragment();
    [...entries].reverse().forEach((entry) => {
      appendLogEntry(fragment, {
        ...entry,
        time: formatAdminLogTime(entry),
        file: adminLogSourceLabel(entry),
        msg: formatAdminLogMessage(entry, dashT),
      });
    });
    out.replaceChildren(fragment);
    if (wasNearBottom) out.scrollTop = out.scrollHeight;
  }

  const totalVisible = listAdminLogEntries({ limit: 200 }).length;
  const severeCount = listAdminLogEntries({ limit: 200 }).filter(
    (entry) => entry.severity === 'warn' || entry.severity === 'error'
  ).length;
  const summary = $id('dashTerminalSummary');
  const count = $id('dashTerminalCount');
  const severe = $id('dashTerminalSevereCount');
  const empty = $id('dashTerminalEmpty');
  const restore = $id('dashRestoreLogViewBtn');
  if (summary)
    summary.textContent = dashT('adminTerminalSummary', {
      count: formatLocaleNumber(totalVisible, getDashboardLang()),
    });
  if (count) {
    count.textContent = dashT('adminTerminalCount', {
      count: formatLocaleNumber(entries.length, getDashboardLang()),
      limit: formatLocaleNumber(200, getDashboardLang()),
    });
  }
  if (severe) {
    severe.textContent = dashT('adminTerminalWarnings', {
      count: formatLocaleNumber(severeCount, getDashboardLang()),
    });
    severe.hidden = severeCount === 0;
  }
  if (empty) empty.hidden = entries.length > 0;
  if (restore) restore.hidden = getAdminLogViewCutoff() === 0;
}

function scheduleAdminActivityTerminalRender() {
  if (adminLogRenderFrame !== null) return;
  adminLogRenderFrame = requestAnimationFrame(() => {
    adminLogRenderFrame = null;
    renderAdminActivityTerminal();
  });
}

function setAdminLogActionStatus(message) {
  const status = $id('dashTerminalActionStatus');
  if (status) status.textContent = message || '';
}

function setAdminLogSyncStatus(status, detail = '') {
  adminLogSyncState = status || 'local';
  const el = $id('dashTerminalSyncStatus');
  if (!el) return;
  const labels = {
    connecting: 'adminTerminalStatusConnecting',
    syncing: 'adminTerminalStatusSyncing',
    live: 'adminTerminalStatusLive',
    offline: 'adminTerminalStatusOffline',
    error: 'adminTerminalStatusError',
    local: 'adminTerminalStatusLocal',
  };
  el.dataset.state = adminLogSyncState;
  el.textContent = dashT(labels[adminLogSyncState] || labels.local);
  if (detail) el.title = detail;
  else el.removeAttribute('title');
}

function adminLogEntriesAsText(entries) {
  return [...entries]
    .reverse()
    .map((entry) => {
      const source = adminLogSourceLabel(entry);
      return `[${formatAdminLogTime(entry)}] [${entry.severity.toUpperCase()}]${source ? ` [${source}]` : ''} ${formatAdminLogMessage(entry, dashT)}`;
    })
    .join('\n');
}

async function copyAdminLogView() {
  const text = adminLogEntriesAsText(getFilteredAdminLogEntries());
  if (!text) {
    setAdminLogActionStatus(dashT('adminTerminalNothingToCopy'));
    return;
  }
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    textarea.remove();
  }
  setAdminLogActionStatus(dashT('adminTerminalCopied'));
}

function exportAdminLogView() {
  const events = getFilteredAdminLogEntries();
  downloadJson(
    {
      schema: 'vts-admin-activity-v1',
      exportedAt: new Date().toISOString(),
      syncState: adminLogSyncState,
      events,
    },
    `vts-admin-activity-${exportTimestampForFilename()}.json`
  );
  setAdminLogActionStatus(
    dashT('adminTerminalExported', {
      count: formatLocaleNumber(events.length, getDashboardLang()),
    })
  );
}

function bindAdminLogControls() {
  if (adminLogControlsBound) return;
  adminLogControlsBound = true;
  const body = $id('dashTerminalBody');
  const toggle = $id('dashTerminalToggle');
  toggle?.addEventListener('click', () => {
    const expanded = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!expanded));
    if (body) body.hidden = expanded;
    if (!expanded) renderAdminActivityTerminal();
  });
  $id('dashLogSearch')?.addEventListener('input', renderAdminActivityTerminal);
  $id('dashLogSeverity')?.addEventListener('change', renderAdminActivityTerminal);
  $id('dashCopyLogBtn')?.addEventListener('click', () => void copyAdminLogView());
  $id('dashExportLogBtn')?.addEventListener('click', exportAdminLogView);

  const clearLogBtn = $id('dashClearLogBtn');
  if (clearLogBtn)
    clearLogBtn.onclick = () => {
      if (!window.confirm(dashT('adminTerminalClearConfirm'))) return;
      clearAdminLogView();
      setAdminLogActionStatus(dashT('adminTerminalCleared'));
      renderAdminActivityTerminal();
    };
  $id('dashRestoreLogViewBtn')?.addEventListener('click', () => {
    resetAdminLogView();
    setAdminLogActionStatus(dashT('adminTerminalRestored'));
    renderAdminActivityTerminal();
  });

  subscribeAdminLogStore(scheduleAdminActivityTerminalRender);
  window.addEventListener('pagehide', flushAdminLogPersistence);
  renderAdminActivityTerminal();
}

function stopAdminLogCloudSync() {
  adminLogSyncController?.stop();
  adminLogSyncController = null;
  setAdminLogSyncStatus('local');
}

async function startAdminLogCloudSync() {
  stopAdminLogCloudSync();
  if (state.adminIsAdmin !== true || !state.adminUser?.uid) return;
  setAdminLogSyncStatus('connecting');
  try {
    const db = await ensureCloudSyncReady();
    if (!db || state.adminIsAdmin !== true || !state.adminUser?.uid) {
      setAdminLogSyncStatus('local');
      return;
    }
    const firestore = await loadFirestoreApi();
    adminLogSyncController = createAdminLogSync({
      db,
      firestore,
      uid: state.adminUser.uid,
      onStatus: ({ status, detail }) => setAdminLogSyncStatus(status, detail),
    });
    adminLogSyncController.start();
  } catch (error) {
    setAdminLogSyncStatus('error', error?.message || error);
  }
}

function refreshRosterSnapshotLabel() {
  const btn = $id('dashRosterSnapshotBtn');
  const label = btn?.querySelector('span');
  if (!label) return;
  const dayName = formatLocaleDate(new Date(), getDashboardLang(), { weekday: 'long' });
  label.textContent = dashT('adminRosterNewSnapshotDated', { day: dayName });
}

function restoreAdminControls() {
  if (document.querySelector('.dash-actions'))
    document.querySelector('.dash-actions').style.display = '';
  if ($id('dashUploadZone')) $id('dashUploadZone').style.display = '';
  if ($id('dashLogArea')) $id('dashLogArea').style.display = '';
  if ($id('dashApiKeyContainer')) $id('dashApiKeyContainer').style.display = 'flex';
  if ($id('dashInsightsCard')) $id('dashInsightsCard').style.display = '';
  if ($id('dashAttackHistoryCard')) $id('dashAttackHistoryCard').style.display = '';
  if (document.querySelector('.dash-kpi-grid'))
    document.querySelector('.dash-kpi-grid').style.display = '';
}

function showApp() {
  hideConnecting();
  $id('dashLogin')?.classList.add('hidden');
  $id('dashApp')?.classList.remove('hidden');
  restoreAdminControls();
}
function showLogin() {
  stopAdminLogCloudSync();
  hideConnecting();
  restoreAdminControls();
  $id('dashLogin')?.classList.remove('hidden');
  $id('dashApp')?.classList.add('hidden');
  const loginBtn = $id('dashLoginBtn');
  const userInput = $id('dashLoginUser');
  const passInput = $id('dashLoginPass');
  if (loginBtn) {
    loginBtn.disabled = false;
    loginBtn.style.display = '';
    loginBtn.textContent = dashT('adminLoginBtn');
  }
  if (userInput) {
    userInput.disabled = false;
    userInput.style.display = '';
    if (!userInput.value) userInput.value = '1097';
  }
  if (passInput) {
    passInput.disabled = false;
    passInput.style.display = '';
    passInput.placeholder = dashT('adminLoginPass');
  }
}

function mountStructureUploadPanel() {
  const mount = $id('dashUploadStructuresMount');
  const uploadZone = $id('dashUploadZone');
  if (!mount) return;
  if (uploadZone && uploadZone.parentElement !== mount) mount.appendChild(uploadZone);
}

async function doLogin() {
  const usernameInput = $id('dashLoginUser');
  const passwordInput = $id('dashLoginPass');
  const username = getAdminLoginUsername();
  const password = getAdminLoginPassword();
  setLoginError('');
  if (!username) {
    usernameInput?.focus();
    usernameInput?.reportValidity?.();
    return;
  }
  if (!password) {
    passwordInput?.focus();
    passwordInput?.reportValidity?.();
    return;
  }
  setLoginBusy(true);
  state._signingOut = false;
  showConnecting(dashT('adminConnectingAuth'));
  setConnectingProgress(10, dashT('adminConnectingAuth'));
  try {
    const { signInWithUsername, isAdminAuthUser } = await loadFirebaseApi();
    setConnectingProgress(18, dashT('adminConnectingAuth'));
    const credential = await signInWithUsername(username, password);
    setConnectingProgress(32, dashT('adminConnectingAuth'));
    state.adminUser = credential.user;
    state.adminIsAdmin = await isAdminAuthUser(credential.user, { forceRefresh: true });
    setConnectingProgress(42, dashT('adminConnectingData'));
    if (!state.adminIsAdmin) {
      const { signOutUser } = await loadFirebaseApi();
      await signOutUser();
      throw new Error(dashT('adminCloudAdminRequired'));
    }
    await openAdminDashboardAfterAuth({ preferCloudFirst: true });
  } catch (e) {
    console.error('Dashboard sign-in failed', e);
    if (await recoverFromStaleAssetGraph(e)) return;
    state.adminUser = null;
    state.adminIsAdmin = false;
    setLoginError(describeAdminAuthError(e));
    showLogin();
  } finally {
    setLoginBusy(false);
  }
}

async function doSignOut() {
  // Mark an explicit sign-out so the auth-state listener doesn't try to restore
  // the session or reopen the dashboard when the user flips to null. Cleared on
  // the next sign-in (doLogin).
  state._signingOut = true;
  allStarBohController?.destroy?.();
  allStarBohController = null;
  allianceViewController?.destroy?.();
  allianceViewController = null;
  allianceViewSettingsLoaded = false;
  if (typeof allianceViewVoteSettingsUnsubscribe === 'function') {
    try {
      allianceViewVoteSettingsUnsubscribe();
    } catch {}
  }
  allianceViewVoteSettingsUnsubscribe = null;
  allianceViewContributionSubscribers.clear();
  stopAdminLogCloudSync();
  if (state._fsUnsub) {
    try {
      state._fsUnsub();
    } catch (e) {}
    state._fsUnsub = null;
  }
  if (state._fsRosterUnsub) {
    try {
      state._fsRosterUnsub();
    } catch (e) {}
    state._fsRosterUnsub = null;
  }
  state._cloudInitPromise = null;
  try {
    const { signOutUser } = await loadFirebaseApi();
    await signOutUser();
  } catch (e) {
    console.warn('Admin sign-out failed', e);
  }
  state.adminUser = null;
  state.adminIsAdmin = false;
  state.cloudAdminReady = false;
  setCloudSyncStatus(null);
  showLogin();
}

async function openAdminDashboardAfterAuth(options = {}) {
  if (state._adminDashboardOpening) return;
  state._adminDashboardOpening = true;
  document.body.classList.add('admin-has-subtool-dock');
  const preferCloudFirst = options.preferCloudFirst === true && state.adminIsAdmin === true;
  const hasLocalCache = hydrateDashboardStateFromLocalStorage();
  try {
    if (hasLocalCache) {
      showApp();
      setCloudSyncStatus('syncing');
      scheduleDashboardRender();
    } else {
      showConnecting(dashT('adminConnectingData'));
      setConnectingProgress(45, dashT('adminConnectingData'));
    }
    if (preferCloudFirst) {
      const secondaryLoads = Promise.allSettled([
        runDashboardCloudTaskWithTimeout('Roster cloud load', loadRosterSnapshotsFromFirestore),
        runDashboardCloudTaskWithTimeout(
          'Bonus team effort points cloud load',
          loadConductAdjustmentsForSeason,
          DASHBOARD_CLOUD_BOOT_TIMEOUT_MS,
          { optional: true }
        ),
      ]).then(() => scheduleDashboardRender());
      await loadData({
        preferCloudFirst: true,
        cloudTimeoutMs: DASHBOARD_CLOUD_BOOT_TIMEOUT_MS,
      });
      void secondaryLoads;
      void runDashboardCloudTaskWithTimeout(
        'Queued cloud sync',
        flushDashboardCloudRetryQueue,
        Math.min(DASHBOARD_CLOUD_BOOT_TIMEOUT_MS, DASHBOARD_CLOUD_WRITE_TIMEOUT_MS)
      );
      if (!hasLocalCache) setConnectingProgress(88, dashT('adminConnectingData'));
    } else {
      if (!hasLocalCache) setConnectingProgress(64, dashT('adminConnectingData'));
      await loadData({ preferCloudFirst: false });
      if (!hasLocalCache) setConnectingProgress(88, dashT('adminConnectingData'));
      if (readDashboardCloudRetryQueue().length) {
        setCloudSyncStatus('local', dashT('adminCloudRetryPending'));
      }
    }
    if (!hasLocalCache) {
      await completeConnectingProgress(dashT('adminConnectingData'));
      showApp();
      scheduleDashboardRender();
    }
    void loadEdenWorkspaceCloudRecord();
    void startAdminLogCloudSync();
  } finally {
    state._adminDashboardOpening = false;
  }
}

// --- Persistence ---
function normalizeDashboardDataForCache(data) {
  if (!data || typeof data !== 'object') return data;
  const attacks = Array.isArray(data.attacks) ? data.attacks : [];
  if (!attacks.length) return data;
  return {
    ...data,
    total_attacks: data.total_attacks ?? attacks.length,
    players_summary: buildSerializablePlayerSummary(attacks),
  };
}

function dashboardNumericValue(value, fallback = 0) {
  const n = typeof value === 'string' ? Number(value.replace(/,/g, '').trim()) : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function dashboardUniqueStructureCount(player) {
  if (player?.unique_structures instanceof Set) return player.unique_structures.size;
  if (Array.isArray(player?.unique_structures)) return player.unique_structures.length;
  return dashboardNumericValue(player?.unique_structures_count ?? player?.unique_structures);
}

function compactDashboardPlayerSummary(playersSummary = []) {
  return (Array.isArray(playersSummary) ? playersSummary : [])
    .map((player) => {
      const name = String(
        player?.name || player?.playerName || player?.display_player_name || ''
      ).trim();
      if (!name) return null;
      return {
        name,
        total_demolition: dashboardNumericValue(
          player?.total_demolition ?? player?.totalDemolition ?? player?.value
        ),
        participation_count: dashboardNumericValue(
          player?.participation_count ?? player?.participationCount
        ),
        unique_structures_count: dashboardUniqueStructureCount(player),
      };
    })
    .filter(Boolean);
}

function sanitizeDashboardDataForPersistence(data) {
  if (!data || typeof data !== 'object') return data;
  const clean = pruneDashboardCloudData(attachAuxiliaryRecords(data));
  delete clean.logs;
  if (Array.isArray(clean.attacks)) {
    clean.attacks = clean.attacks.map((attack) => {
      if (!attack || typeof attack !== 'object') return attack;
      const copy = { ...attack };
      delete copy._validation;
      return copy;
    });
  }
  const summarySource =
    Array.isArray(clean.players_summary) && clean.players_summary.length
      ? clean.players_summary
      : Array.isArray(clean.attacks) && clean.attacks.length
        ? buildSerializablePlayerSummary(clean.attacks)
        : [];
  clean.players_summary = compactDashboardPlayerSummary(summarySource);
  return sanitizeForFirestore(clean);
}

// --- Cloud revision guard --------------------------------------------------
// Client clocks cannot identify the latest real data. Full dashboard writes
// must begin from the same cloud revision they read, or they become backups.
const DASHBOARD_LOCAL_BACKUP_KEY = 'vts_ocr_dashboard_backup_v1';
let dashboardCloudBaseRevision = null;
let dashboardLoadGeneration = 0;
let dashboardAuxiliarySaveInFlight = false;
let dashboardDeferredConflictRevision = 0;
const adminEditGuard = createAdminEditGuard();

const dashboardEditConflictMessage = () => dashT('adminCloudStaleWriteSkipped');

function getProtectedAdminEditControl(target) {
  const control = target?.closest?.('input, textarea, select, [contenteditable="true"]');
  if (!control || control.disabled) return null;
  if (control.matches('input[type="file"], input[type="button"], input[type="submit"]'))
    return null;
  if (!control.closest('#dashModalBody, #dashConductForm')) return null;
  return control;
}

function adminEditScope(control) {
  if (control?.closest('#dashConductForm')) return 'conduct-form';
  return $id('dashModalTitle')?.textContent?.trim() || 'admin-modal';
}

function surfaceDeferredDashboardConflict(cloudData) {
  const revision = dashboardSyncRevision(cloudData);
  state._dashboardLastSaveConflict = true;
  setCloudSyncStatus('error', dashboardEditConflictMessage());
  if (revision !== dashboardDeferredConflictRevision) {
    dashboardDeferredConflictRevision = revision;
    logDashboardEvent('adminCloudStaleWriteSkipped', 'warn', {}, { source: 'cloud' });
    if (typeof window.showToast === 'function') {
      window.showToast(dashboardEditConflictMessage(), 'warn', 9000);
    }
  }
}

function finishAdminEditSession({ applyDeferred = true } = {}) {
  const deferred = adminEditGuard.finish();
  dashboardDeferredConflictRevision = 0;
  if (applyDeferred && deferred) {
    applyDashboardCloudSnapshot(deferred, { schedule: true });
    setCloudSyncStatus('live');
    updateLastSynced();
  }
  return deferred;
}

function bindAdminEditGuard() {
  if (state._adminEditGuardBound || typeof document === 'undefined') return;
  state._adminEditGuardBound = true;
  document.addEventListener(
    'focusin',
    (event) => {
      const control = getProtectedAdminEditControl(event.target);
      if (!control) return;
      adminEditGuard.focus(adminEditScope(control), dashboardCloudBaseRevision);
    },
    true
  );
  const markDirty = (event) => {
    const control = getProtectedAdminEditControl(event.target);
    if (!control) return;
    adminEditGuard.markDirty(adminEditScope(control), dashboardCloudBaseRevision);
  };
  document.addEventListener('input', markDirty, true);
  document.addEventListener('change', markDirty, true);
  document.addEventListener(
    'focusout',
    () => {
      queueMicrotask(() => {
        if (getProtectedAdminEditControl(document.activeElement)) return;
        if ($id('dashModal')?.classList.contains('active')) return;
        if (adminEditGuard.state().scope === 'conduct-form' && state.r5EditingId) return;
        adminEditGuard.blur();
        if (!adminEditGuard.state().dirty) finishAdminEditSession();
      });
    },
    true
  );
  window.addEventListener('vts:admin-edit-surface-opened', (event) => {
    adminEditGuard.begin(event.detail?.scope || 'admin-modal', dashboardCloudBaseRevision);
  });
  window.addEventListener('vts:admin-edit-surface-closed', () => finishAdminEditSession());
}

function applyDashboardRemoteSnapshot(cloudData, { schedule = true } = {}) {
  const incomingRevision = dashboardSyncRevision(cloudData);
  const decision = classifyRemoteSnapshot({
    currentRevision: dashboardCloudBaseRevision,
    incomingRevision,
    editing: adminEditGuard.shouldDeferRemoteSnapshot(),
  });
  if (decision === 'stale' || decision === 'duplicate') return false;
  if (decision === 'defer') {
    adminEditGuard.defer(cloudData, incomingRevision);
    if (!dashboardCloudSaveInFlight && !dashboardAuxiliarySaveInFlight) {
      surfaceDeferredDashboardConflict(cloudData);
    }
    return false;
  }
  return applyDashboardCloudSnapshot(cloudData, { schedule });
}

function prepareForManualDashboardRefresh() {
  const editState = adminEditGuard.state();
  if (!editState.active && !editState.hasDeferredSnapshot) return true;
  if (editState.dirty || editState.hasDeferredSnapshot) {
    const confirmed = window.confirm(dashT('adminUnsavedRefreshConfirm'));
    if (!confirmed) return false;
    backupDashboardSnapshot(attachAuxiliaryRecords(state.dashData));
  }
  finishAdminEditSession({ applyDeferred: false });
  state._dashboardLastSaveConflict = false;
  return true;
}

function parseDashboardLastUpdatedMs(value) {
  // fmtDate format: "dd/mm/yyyy, DayName, HH:MM GT" (local clock).
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4}),[^,]*,\s*(\d{1,2}):(\d{2})/.exec(
    String(value || '').trim()
  );
  if (!m) return 0;
  const ts = new Date(
    Number(m[3]),
    Number(m[2]) - 1,
    Number(m[1]),
    Number(m[4]),
    Number(m[5])
  ).getTime();
  return Number.isFinite(ts) ? ts : 0;
}

function dashboardDataTimestampMs(data) {
  if (!data || typeof data !== 'object') return 0;
  const stamped = Number(data.updatedAtMs);
  if (Number.isFinite(stamped) && stamped > 0) return stamped;
  return parseDashboardLastUpdatedMs(data.last_updated);
}

function withDashboardTimestamp(data, fallbackTimestamp = Date.now()) {
  if (!data || typeof data !== 'object') return data;
  return {
    ...data,
    updatedAtMs: dashboardDataTimestampMs(data) || fallbackTimestamp,
  };
}

function dashboardSyncRevision(data) {
  return normalizeSyncRevision(data?.syncRevision);
}

function noteDashboardCloudBase(data) {
  const revision = dashboardSyncRevision(data);
  if (dashboardCloudBaseRevision === null || revision >= dashboardCloudBaseRevision) {
    dashboardCloudBaseRevision = revision;
  }
  return revision;
}

function dashboardAttackCount(data) {
  if (!data || typeof data !== 'object') return 0;
  if (Array.isArray(data.attacks) && data.attacks.length) return data.attacks.length;
  const n = Number(data.total_attacks);
  return Number.isFinite(n) ? n : 0;
}

// Keeps the newest known-good snapshot; never lets an older snapshot replace
// a newer backup.
function backupDashboardSnapshot(data) {
  try {
    const candidateTs = dashboardDataTimestampMs(data);
    const existing = JSON.parse(localStorage.getItem(DASHBOARD_LOCAL_BACKUP_KEY) || 'null');
    if (existing?.data && dashboardDataTimestampMs(existing.data) >= candidateTs) return;
    localStorage.setItem(
      DASHBOARD_LOCAL_BACKUP_KEY,
      JSON.stringify({ savedAt: new Date().toISOString(), data })
    );
  } catch (err) {
    console.warn('Could not store dashboard backup snapshot', err);
  }
}

function dashboardSnapshotsDiffer(first, second) {
  if (!first || !second) return Boolean(first || second);
  const firstRevision = dashboardSyncRevision(first);
  const secondRevision = dashboardSyncRevision(second);
  if (firstRevision || secondRevision) return firstRevision !== secondRevision;
  return (
    dashboardDataTimestampMs(first) !== dashboardDataTimestampMs(second) ||
    dashboardAttackCount(first) !== dashboardAttackCount(second)
  );
}

function preserveLocalDashboardConflict(localData, cloudData) {
  if (!localData || !dashboardSnapshotsDiffer(localData, cloudData)) return false;
  backupDashboardSnapshot(localData);
  return true;
}

function applyDashboardCloudSnapshot(cloudData, { schedule = false } = {}) {
  state.dashData = normalizeDashboardDataForCache(cloudData);
  noteDashboardCloudBase(state.dashData);
  hydrateAuxiliaryRecordsFromDashboardData(state.dashData);
  if (state.dashData && typeof state.dashData === 'object') delete state.dashData.logs;
  writeDashboardLocalCache(attachAuxiliaryRecords(state.dashData));
  if (schedule) scheduleDashboardRender();
  else render();
  return true;
}

function restoreDashboardLocalFallback(localData) {
  if (!localData || state.dashData) {
    if (state.dashData) logDashboardEvent('adminCloudLocalCache', 'warn', {}, { source: 'cloud' });
    return false;
  }
  state.dashData = normalizeDashboardDataForCache(localData);
  hydrateAuxiliaryRecordsFromDashboardData(state.dashData);
  if (state.dashData && typeof state.dashData === 'object') delete state.dashData.logs;
  render();
  return true;
}

// A write conflict preserves the cloud snapshot and keeps the local payload as a backup.
function createDashboardCloudConflictError(cloudData = null) {
  const err = new Error('Cloud data changed before this device could save.');
  err.name = 'DashboardCloudConflictError';
  err.code = 'dashboard-cloud-conflict';
  err.cloudData = cloudData;
  return err;
}

function isDashboardCloudConflict(err) {
  return err?.code === 'dashboard-cloud-conflict' || err?.name === 'DashboardCloudConflictError';
}

function handleDashboardCloudConflict(localData, err) {
  backupDashboardSnapshot(localData);
  state._dashboardLastSaveConflict = true;
  if (err?.cloudData && adminEditGuard.shouldDeferRemoteSnapshot()) {
    adminEditGuard.defer(err.cloudData, dashboardSyncRevision(err.cloudData));
  } else if (err?.cloudData) {
    applyDashboardCloudSnapshot(err.cloudData, { schedule: true });
  }
  setCloudSyncStatus('error', dashboardEditConflictMessage());
  logDashboardEvent('adminCloudStaleWriteSkipped', 'warn', {}, { source: 'cloud' });
  if (typeof window.showToast === 'function') {
    window.showToast(dashT('adminCloudStaleWriteSkipped'), 'warn', 9000);
  }
}

async function writeDashboardSnapshotToCloud(db, firestore, payload, baseRevision) {
  if (blockEdenArchiveWrite('dashboard cloud write')) return null;
  const { doc, runTransaction } = firestore;
  const expectedBaseRevision =
    Number.isInteger(baseRevision) && baseRevision >= 0 ? baseRevision : null;
  const preparedPayload = sanitizeForFirestore({ ...(payload || {}) });
  let writtenPayload = null;

  await runTransaction(db, async (transaction) => {
    const ref = doc(db, FS_PATH);
    const snap = await transaction.get(ref);
    const cloudData = snap.exists() ? normalizeDashboardDataForCache(snap.data()) : null;
    const cloudRevision = cloudData ? dashboardSyncRevision(cloudData) : 0;

    if (
      (cloudData && (expectedBaseRevision === null || expectedBaseRevision !== cloudRevision)) ||
      (!cloudData && expectedBaseRevision !== null && expectedBaseRevision !== 0)
    ) {
      throw createDashboardCloudConflictError(cloudData);
    }

    writtenPayload = {
      ...preparedPayload,
      updatedAtMs: Math.max(
        Date.now(),
        dashboardDataTimestampMs(preparedPayload),
        dashboardDataTimestampMs(cloudData) + 1
      ),
      syncRevision: cloudRevision + 1,
    };
    transaction.set(ref, writtenPayload);
  });

  noteDashboardCloudBase(writtenPayload);
  return writtenPayload;
}

function createDashboardAttackMutationError(reason) {
  const messages = {
    'missing-dashboard': dashT('adminCloudLocalCache'),
    missing: dashT('adminCloudStaleWriteSkipped'),
    changed: dashT('adminCloudStaleWriteSkipped'),
    'id-collision': dashT('adminCloudStaleWriteSkipped'),
    'invalid-mutation': dashT('adminInvalidValue'),
  };
  const error = new Error(messages[reason] || dashT('adminCloudSyncError'));
  error.name = 'DashboardAttackMutationError';
  error.code = `dashboard-attack-${reason}`;
  return error;
}

function buildDashboardAttackMutationSnapshot(sourceData, mutation) {
  const source =
    sourceData && typeof sourceData === 'object'
      ? sourceData
      : { last_updated: fmtDate(new Date()), total_attacks: 0, attacks: [], players_summary: [] };
  const mutationResult = applyDashboardAttackMutation(source.attacks, mutation);
  return {
    ...mutationResult,
    data: {
      ...source,
      attacks: mutationResult.attacks,
      total_attacks: mutationResult.attacks.length,
      players_summary: buildSerializablePlayerSummary(mutationResult.attacks),
    },
  };
}

async function writeDashboardAttackMutationToCloud(db, firestore, mutation) {
  const { doc, runTransaction } = firestore;
  let writtenPayload = null;
  let mutationResult = null;

  await runTransaction(db, async (transaction) => {
    const ref = doc(db, FS_PATH);
    const snap = await transaction.get(ref);
    const cloudData = snap.exists() ? normalizeDashboardDataForCache(snap.data()) : null;
    if (!cloudData) throw createDashboardAttackMutationError('missing-dashboard');

    mutationResult = buildDashboardAttackMutationSnapshot(cloudData, mutation);
    if (!mutationResult.applied) {
      if (mutation.type === 'delete' && mutationResult.reason === 'missing') {
        writtenPayload = cloudData;
        return;
      }
      throw createDashboardAttackMutationError(mutationResult.reason);
    }

    // A mutation rebuilds the rich in-memory player summary, including each
    // player's hit list. Persist through the compact serializer so a one-field
    // structure edit never duplicates the complete attack history in Firestore.
    const preparedPayload = sanitizeDashboardDataForPersistence({
      ...cloudData,
      ...mutationResult.data,
    });
    const cloudRevision = dashboardSyncRevision(cloudData);
    writtenPayload = {
      ...preparedPayload,
      updatedAtMs: Math.max(Date.now(), dashboardDataTimestampMs(cloudData) + 1),
      syncRevision: cloudRevision + 1,
    };
    transaction.set(ref, writtenPayload);
  });

  if (writtenPayload) noteDashboardCloudBase(writtenPayload);
  return {
    data: writtenPayload,
    applied: Boolean(mutationResult?.applied),
    reason: mutationResult?.reason || '',
  };
}

async function writeDashboardOcrUploadToCloud(db, firestore, incomingAttacks) {
  const { doc, runTransaction } = firestore;
  let writtenPayload = null;

  await runTransaction(db, async (transaction) => {
    const ref = doc(db, FS_PATH);
    const snap = await transaction.get(ref);
    const cloudData = snap.exists()
      ? normalizeDashboardDataForCache(snap.data())
      : { last_updated: fmtDate(new Date()), attacks: [], players_summary: [] };
    const attacks = mergeDashboardOcrAttacks(cloudData.attacks, incomingAttacks);
    const preparedPayload = sanitizeDashboardDataForPersistence({
      ...cloudData,
      last_updated: fmtDate(new Date()),
      attacks,
      total_attacks: attacks.length,
      players_summary: buildSerializablePlayerSummary(attacks),
    });
    const cloudRevision = dashboardSyncRevision(cloudData);
    writtenPayload = {
      ...preparedPayload,
      updatedAtMs: Math.max(Date.now(), dashboardDataTimestampMs(cloudData) + 1),
      syncRevision: cloudRevision + 1,
    };
    transaction.set(ref, writtenPayload);
  });

  noteDashboardCloudBase(writtenPayload);
  return writtenPayload;
}

export async function saveDashboardOcrUpload(localData, incomingAttacks = []) {
  if (blockEdenArchiveWrite('save OCR upload')) return false;
  state.dashData = normalizeDashboardDataForCache(localData);
  const persistedData = sanitizeDashboardDataForPersistence(state.dashData);
  state.dashData = normalizeDashboardDataForCache(persistedData);
  writeDashboardLocalCache(persistedData);
  writeAuxiliaryLocalCaches();

  if (!state.adminIsAdmin) {
    showCloudSyncFailure(new Error(dashT('adminCloudAdminRequired')), 'OCR upload blocked');
    return false;
  }

  try {
    setCloudSyncStatus('syncing');
    const awaitCloud = (promise, label) =>
      withDashboardCloudTimeout(promise, DASHBOARD_CLOUD_WRITE_TIMEOUT_MS, label);
    const db = await awaitCloud(ensureCloudSyncReady(), 'OCR cloud connection');
    if (!db) {
      showCloudSyncFailure(new Error(dashT('adminCloudAdminRequired')), 'OCR upload blocked');
      return false;
    }
    const firestore = await awaitCloud(loadFirestoreApi(), 'Firestore module load');
    const writtenPayload = await awaitCloud(
      writeDashboardOcrUploadToCloud(db, firestore, incomingAttacks),
      'OCR cloud merge'
    );
    applyDashboardCloudSnapshot(writtenPayload, { schedule: true });
    setCloudSyncStatus('live');
    logDashboardEvent('adminLogCloudSaved', 'info', {}, { source: 'ocr' });
    updateLastSynced();
    return true;
  } catch (error) {
    console.error('FIREBASE OCR MERGE ERROR:', error);
    showCloudSyncFailure(error, 'OCR cloud merge failed');
    return false;
  }
}

async function saveDashboardAttackMutation(mutation) {
  if (blockEdenArchiveWrite('edit attack record')) {
    return { ok: false, error: edenWorkspaceMutationError(ACTIVE_EDEN_WORKSPACE_ID) };
  }
  if (state.cloudSyncConfigured === false) {
    const localResult = buildDashboardAttackMutationSnapshot(state.dashData, mutation);
    if (!localResult.applied) {
      const error = createDashboardAttackMutationError(localResult.reason);
      showCloudSyncFailure(error, 'Dashboard change failed');
      return { ok: false, error };
    }
    state.dashData = normalizeDashboardDataForCache(localResult.data);
    await saveData(state.dashData, { cloud: false });
    return { ok: true, applied: true };
  }

  try {
    setCloudSyncStatus('syncing');
    const awaitCloud = (promise, label) =>
      withDashboardCloudTimeout(promise, DASHBOARD_CLOUD_WRITE_TIMEOUT_MS, label);
    const db = await awaitCloud(ensureCloudSyncReady(), 'Dashboard cloud connection');
    if (!db) {
      const error = new Error(dashT('adminCloudAdminRequired'));
      showCloudSyncFailure(error, 'Dashboard change blocked');
      return { ok: false, error };
    }
    const firestore = await awaitCloud(loadFirestoreApi(), 'Firestore module load');
    const result = await awaitCloud(
      writeDashboardAttackMutationToCloud(db, firestore, mutation),
      'Dashboard change'
    );
    applyDashboardCloudSnapshot(result.data, { schedule: true });
    setCloudSyncStatus('live');
    updateLastSynced();
    return { ok: true, applied: result.applied };
  } catch (error) {
    console.error('FIREBASE ATTACK MUTATION ERROR:', error);
    showCloudSyncFailure(error, 'Dashboard change failed');
    return { ok: false, error };
  }
}

function isFirestorePermissionDenied(err) {
  const text = `${err?.code || ''} ${err?.message || err || ''}`;
  return /permission-denied|insufficient permissions/i.test(text);
}

function isFirestoreDocumentTooLarge(err) {
  const text = `${err?.code || ''} ${err?.message || err || ''}`;
  return /maximum allowed size|exceeds the maximum|document .*size/i.test(text);
}

function buildDashboardCloudRepairPayload(auxiliaryPayload = null) {
  const base =
    state.dashData && typeof state.dashData === 'object'
      ? { ...state.dashData }
      : { last_updated: fmtDate(new Date()), total_attacks: 0, attacks: [], players_summary: [] };
  const payload = sanitizeDashboardDataForPersistence(
    auxiliaryPayload && typeof auxiliaryPayload === 'object'
      ? { ...base, ...auxiliaryPayload }
      : base
  );
  return withDashboardTimestamp(payload, dashboardDataTimestampMs(base) || 1);
}

async function writeAuxiliaryPayloadToCloud(db, firestore, auxiliaryPayload, baseRevision) {
  const { doc, runTransaction } = firestore;
  const payload = withDashboardTimestamp(auxiliaryPayload);
  const expectedBaseRevision =
    Number.isInteger(baseRevision) && baseRevision >= 0 ? baseRevision : null;
  try {
    let mergedCloudPayload = null;
    await runTransaction(db, async (transaction) => {
      const ref = doc(db, FS_PATH);
      const snap = await transaction.get(ref);
      const cloudData = snap.exists() ? normalizeDashboardDataForCache(snap.data()) : null;
      const cloudRevision = cloudData ? dashboardSyncRevision(cloudData) : 0;
      if (
        (cloudData && (expectedBaseRevision === null || expectedBaseRevision !== cloudRevision)) ||
        (!cloudData && expectedBaseRevision !== null && expectedBaseRevision !== 0)
      ) {
        throw createDashboardCloudConflictError(cloudData);
      }
      const sourcePayload = cloudData ? payload : buildDashboardCloudRepairPayload(payload);
      const nextPayload = {
        ...sourcePayload,
        updatedAtMs: Math.max(
          Date.now(),
          dashboardDataTimestampMs(sourcePayload),
          dashboardDataTimestampMs(cloudData) + 1
        ),
        syncRevision: cloudRevision + 1,
      };
      if (cloudData) transaction.set(ref, nextPayload, { merge: true });
      else transaction.set(ref, nextPayload);
      mergedCloudPayload = { ...(cloudData || {}), ...nextPayload };
    });
    noteDashboardCloudBase(mergedCloudPayload);
    return { repaired: false, data: mergedCloudPayload };
  } catch (err) {
    if (!isFirestorePermissionDenied(err) && !isFirestoreDocumentTooLarge(err)) throw err;
    // Repair the complete snapshot through the same revision fence.
    const repairPayload = buildDashboardCloudRepairPayload(payload);
    const writtenPayload = await writeDashboardSnapshotToCloud(
      db,
      firestore,
      repairPayload,
      expectedBaseRevision
    );
    state.dashData = normalizeDashboardDataForCache(writtenPayload);
    writeDashboardLocalCache(writtenPayload);
    writeAuxiliaryLocalCaches();
    return { repaired: true, data: writtenPayload };
  }
}

function getAuxiliaryRecordPayload() {
  const r5Season = state.r5Season || getDashboardR5SeasonKey();
  return sanitizeForFirestore({
    updatedAtMs: Date.now(),
    last_updated: fmtDate(new Date()),
    bannerRecords: Array.isArray(state.bannerRecords) ? state.bannerRecords : [],
    dutyRecords: Array.isArray(state.dutyRecords) ? state.dutyRecords : [],
    contributionRecords: Array.isArray(state.contributionRecords) ? state.contributionRecords : [],
    exGuildContributions: Array.isArray(state.exGuildContributions)
      ? state.exGuildContributions
      : [],
    playerRegistry: normalizePlayerRegistry(state.playerRegistry || readStoredPlayerRegistry()),
    r5Season,
    publicConductAdjustments: sanitizePublicR5Adjustments(state.r5Adjustments, r5Season),
  });
}

function resolveDashboardCloudSaveWaiters(maxVersion, result) {
  const ready = [];
  const waiting = [];
  dashboardCloudSaveWaiters.forEach((waiter) => {
    if (waiter.version <= maxVersion) ready.push(waiter);
    else waiting.push(waiter);
  });
  dashboardCloudSaveWaiters = waiting;
  ready.forEach((waiter) => waiter.resolve(result));
}

function queueDashboardCloudSaveFlush(delayMs = DASHBOARD_CLOUD_SAVE_DEBOUNCE_MS) {
  if (dashboardCloudSaveTimer) clearTimeout(dashboardCloudSaveTimer);
  dashboardCloudSaveTimer = window.setTimeout(() => {
    dashboardCloudSaveTimer = null;
    flushDashboardCloudSave();
  }, delayMs);
}

async function flushDashboardCloudRetryQueue() {
  const queued = readDashboardCloudRetryQueue();
  if (!queued.length) return true;

  try {
    setCloudSyncStatus('syncing');
    const awaitCloud = (promise, label) =>
      withDashboardCloudTimeout(promise, DASHBOARD_CLOUD_WRITE_TIMEOUT_MS, label);
    const db = await awaitCloud(ensureCloudSyncReady(), 'Queued cloud connection');
    if (!db) {
      setCloudSyncStatus('local', dashT('adminCloudRetryPending'));
      return false;
    }

    const firestore = await awaitCloud(loadFirestoreApi(), 'Firestore module load');
    const remaining = [];
    for (const entry of queued) {
      try {
        // A queued write is a snapshot from the moment it failed — possibly
        // days old. Never let it overwrite a cloud doc that other devices
        // have updated since (this exact replay erased three days of uploads
        // once). The entry is dropped, not retried: it can only get staler.
        if (entry.kind === 'auxiliary') {
          await awaitCloud(
            writeAuxiliaryPayloadToCloud(db, firestore, entry.payload, entry.baseRevision),
            'Queued auxiliary cloud write'
          );
        } else {
          await awaitCloud(
            writeDashboardSnapshotToCloud(db, firestore, entry.payload, entry.baseRevision),
            'Queued dashboard cloud write'
          );
        }
      } catch (err) {
        if (isDashboardCloudConflict(err)) {
          const localData =
            entry.kind === 'auxiliary'
              ? sanitizeDashboardDataForPersistence({ ...(state.dashData || {}), ...entry.payload })
              : entry.payload;
          handleDashboardCloudConflict(localData, err, `Queued ${entry.kind || 'dashboard'} save`);
          logDashboardEvent('adminCloudStaleQueueDropped', 'warn', {}, { source: 'cloud' });
          continue;
        }
        remaining.push(entry);
        console.warn('Dashboard queued cloud write failed', err);
      }
    }
    writeDashboardCloudRetryQueue(remaining);
    if (remaining.length) {
      setCloudSyncStatus('local', dashT('adminCloudRetryPending'));
      return false;
    }
    setCloudSyncStatus('live');
    logDashboardEvent('adminLogQueuedSynced', 'success', {}, { source: 'cloud' });
    updateLastSynced();
    return true;
  } catch (err) {
    showCloudSyncFailure(err, 'Queued cloud sync failed');
    return false;
  }
}

async function flushDashboardCloudSave() {
  if (dashboardCloudSaveInFlight || !dashboardCloudSavePendingData) return false;
  if (dashboardCloudSaveTimer) {
    clearTimeout(dashboardCloudSaveTimer);
    dashboardCloudSaveTimer = null;
  }
  const persistedData = dashboardCloudSavePendingData;
  const baseRevision = dashboardCloudSavePendingBaseRevision;
  const version = dashboardCloudSavePendingVersion;
  dashboardCloudSavePendingData = null;
  dashboardCloudSavePendingBaseRevision = null;
  dashboardCloudSaveInFlight = true;
  const awaitCloud = (promise, label) =>
    withDashboardCloudTimeout(promise, DASHBOARD_CLOUD_WRITE_TIMEOUT_MS, label);
  let result = false;
  let committedRevision = null;
  try {
    setCloudSyncStatus('syncing');
    const db = await awaitCloud(ensureCloudSyncReady(), 'Dashboard cloud connection');
    if (!db) {
      setCloudSyncStatus('local');
      queueDashboardCloudRetry(
        'dashboard',
        persistedData,
        dashT('adminCloudAdminRequired'),
        baseRevision
      );
      showCloudSyncFailure(new Error(dashT('adminCloudAdminRequired')), 'Save blocked');
      return false;
    }
    const firestore = await awaitCloud(loadFirestoreApi(), 'Firestore module load');
    const writtenPayload = await awaitCloud(
      writeDashboardSnapshotToCloud(db, firestore, persistedData, baseRevision),
      'Dashboard cloud save'
    );
    committedRevision = dashboardSyncRevision(writtenPayload);
    state.dashData = normalizeDashboardDataForCache(writtenPayload);
    writeDashboardLocalCache(writtenPayload);
    setCloudSyncStatus('live');
    logDashboardEvent('adminLogCloudSaved', 'info', {}, { source: 'cloud' });
    result = true;
    return true;
  } catch (e) {
    if (isDashboardCloudConflict(e)) {
      handleDashboardCloudConflict(persistedData, e);
      return false;
    }
    console.error('FIREBASE SAVE ERROR:', e);
    queueDashboardCloudRetry(
      'dashboard',
      persistedData,
      e?.message || e?.code || 'save failed',
      baseRevision
    );
    showCloudSyncFailure(e, 'Save error');
    return false;
  } finally {
    dashboardCloudSaveInFlight = false;
    resolveDashboardCloudSaveWaiters(version, result);
    if (dashboardCloudSavePendingData) {
      // A coalesced follow-up can advance only after this transaction really
      // succeeded. A failure forces it through the conflict path instead.
      dashboardCloudSavePendingBaseRevision = result ? committedRevision : null;
      queueDashboardCloudSaveFlush();
    }
  }
}

function scheduleDashboardCloudSave(persistedData, options = {}) {
  dashboardCloudSavePendingData = persistedData;
  dashboardCloudSavePendingBaseRevision = dashboardCloudSaveInFlight
    ? null
    : dashboardCloudBaseRevision;
  const version = ++dashboardCloudSavePendingVersion;
  setCloudSyncStatus('syncing');
  const promise = new Promise((resolve) => {
    dashboardCloudSaveWaiters.push({ version, resolve });
  });
  if (!dashboardCloudSaveInFlight) {
    queueDashboardCloudSaveFlush(options.immediate ? 0 : DASHBOARD_CLOUD_SAVE_DEBOUNCE_MS);
  }
  return promise;
}

export async function saveData(data, options = {}) {
  if (blockEdenArchiveWrite('save dashboard data')) return false;
  state.dashData = normalizeDashboardDataForCache(data);
  if (state.dashData && typeof state.dashData === 'object') {
    delete state.dashData.logs;
  }
  const persistedData = sanitizeDashboardDataForPersistence(state.dashData);
  if (persistedData && typeof persistedData === 'object') {
    // Kept for display and legacy cache migration; revision fencing controls
    // whether this full snapshot may replace the current cloud document.
    persistedData.updatedAtMs = Date.now();
  }
  state.dashData = normalizeDashboardDataForCache(persistedData);
  writeDashboardLocalCache(persistedData);
  writeAuxiliaryLocalCaches();
  if (options.cloud === false) return false;
  if (!state.adminIsAdmin) {
    queueDashboardCloudRetry(
      'dashboard',
      persistedData,
      dashT('adminCloudAdminRequired'),
      dashboardCloudBaseRevision
    );
    showCloudSyncFailure(new Error(dashT('adminCloudAdminRequired')), 'Save blocked');
    return false;
  }
  const requestedBaseRevision = dashboardCloudSaveInFlight ? null : dashboardCloudBaseRevision;
  const cloudSave = scheduleDashboardCloudSave(persistedData, {
    immediate: options.immediate === true,
  });
  if (options.awaitCloud === true) {
    try {
      return await withDashboardCloudTimeout(
        cloudSave,
        DASHBOARD_CLOUD_WRITE_TIMEOUT_MS,
        'Dashboard cloud save'
      );
    } catch (err) {
      queueDashboardCloudRetry(
        'dashboard',
        persistedData,
        err?.message || err?.code || 'save timed out',
        requestedBaseRevision
      );
      showDashboardCloudFallback(err, 'Dashboard cloud save');
      return false;
    }
  }
  return false;
}

export async function saveDashboardAuxiliaryRecords(options = {}) {
  state._dashboardLastSaveConflict = false;
  const baseRevision = adminEditGuard.expectedBaseRevision(dashboardCloudBaseRevision);
  const sourceData =
    state.dashData && typeof state.dashData === 'object'
      ? state.dashData
      : { last_updated: fmtDate(new Date()), total_attacks: 0, attacks: [], players_summary: [] };
  const localData = sanitizeDashboardDataForPersistence(sourceData);
  state.dashData = normalizeDashboardDataForCache(localData);
  writeDashboardLocalCache(localData);
  writeAuxiliaryLocalCaches();
  if (options.cloud === false) return false;
  dashboardAuxiliarySaveInFlight = true;
  try {
    const awaitCloud = (promise, label) =>
      withDashboardCloudTimeout(promise, DASHBOARD_CLOUD_WRITE_TIMEOUT_MS, label);
    setCloudSyncStatus('syncing');
    const db = await awaitCloud(ensureCloudSyncReady(), 'Special list cloud connection');
    if (!db) {
      setCloudSyncStatus('local');
      queueDashboardCloudRetry(
        'auxiliary',
        getAuxiliaryRecordPayload(),
        dashT('adminCloudAdminRequired'),
        baseRevision
      );
      showCloudSyncFailure(
        new Error(dashT('adminCloudAdminRequired')),
        'Special list save blocked'
      );
      return false;
    }
    const firestore = await awaitCloud(loadFirestoreApi(), 'Firestore module load');
    const auxiliaryPayload = getAuxiliaryRecordPayload();
    const result = await awaitCloud(
      writeAuxiliaryPayloadToCloud(db, firestore, auxiliaryPayload, baseRevision),
      'Special list cloud save'
    );
    adminEditGuard.dropDeferredThrough(dashboardSyncRevision(result.data));
    setCloudSyncStatus('live');
    if (result.repaired)
      logDashboardEvent('adminLogCloudDocumentRepaired', 'warn', {}, { source: 'cloud' });
    updateLastSynced();
    return true;
  } catch (e) {
    console.error('FIREBASE AUXILIARY SAVE ERROR:', e);
    if (isDashboardCloudConflict(e)) {
      handleDashboardCloudConflict(localData, e, 'Special list cloud save');
      return false;
    }
    queueDashboardCloudRetry(
      'auxiliary',
      getAuxiliaryRecordPayload(),
      e?.message || e?.code || 'auxiliary save failed',
      baseRevision
    );
    showCloudSyncFailure(e, 'Special list cloud save failed');
    return false;
  } finally {
    dashboardAuxiliarySaveInFlight = false;
  }
}

window.syncDashboardAuxiliaryRecordsToCloud = saveDashboardAuxiliaryRecords;
window.didDashboardAuxiliarySaveConflict = () => state._dashboardLastSaveConflict === true;

async function loadData(options = {}) {
  const loadGeneration = ++dashboardLoadGeneration;
  const isCurrentLoad = () => loadGeneration === dashboardLoadGeneration;
  const preferCloudFirst = options.preferCloudFirst === true && state.adminIsAdmin === true;
  const cloudTimeoutMs = Number.isFinite(options.cloudTimeoutMs)
    ? options.cloudTimeoutMs
    : preferCloudFirst
      ? DASHBOARD_CLOUD_BOOT_TIMEOUT_MS
      : 0;
  const awaitCloud = (promise, label) => withDashboardCloudTimeout(promise, cloudTimeoutMs, label);
  if (isAuthed()) setCloudSyncStatus('syncing');
  let hadLocalData = false;
  let localData = null;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      dashboardLocalCacheJson = saved;
      localData = normalizeDashboardDataForCache(JSON.parse(saved));
      hadLocalData = hasUsableDashboardCache(localData);
      if (!preferCloudFirst) {
        hydrateAuxiliaryRecordsFromDashboardData(localData);
        state.dashData = localData;
        if (state.dashData && typeof state.dashData === 'object') delete state.dashData.logs;
        writeDashboardLocalCache(attachAuxiliaryRecords(state.dashData));
        render();
      }
    }
  } catch (e) {}
  if (!preferCloudFirst && state.adminIsAdmin !== true) {
    setCloudSyncStatus('local');
    logDashboardEvent('adminCloudAdminRequired', 'warn', {}, { source: 'cloud' });
    return;
  }
  try {
    const db = await awaitCloud(ensureCloudSyncReady(), 'Dashboard cloud connection');
    if (!isCurrentLoad()) return;
    if (!db) {
      if (preferCloudFirst && localData) {
        restoreDashboardLocalFallback(localData);
      }
      setCloudSyncStatus('local');
      logDashboardEvent('adminLogFirestoreLocalOnly', 'warn', {}, { source: 'cloud' });
      return;
    }
    const firestore = await awaitCloud(loadFirestoreApi(), 'Firestore module load');
    const { doc, getDoc, onSnapshot } = firestore;
    if (!isCurrentLoad()) return;
    const snap = await awaitCloud(getDoc(doc(db, FS_PATH)), 'Dashboard cloud read');
    if (!isCurrentLoad()) return;
    if (snap.exists()) {
      const cloudData = normalizeDashboardDataForCache(snap.data());
      noteDashboardCloudBase(cloudData);
      // A readable cloud snapshot is authoritative. Any differing local copy
      // is kept as a backup, never offered as an automatic overwrite.
      const localCandidate = state.dashData || localData;
      if (preserveLocalDashboardConflict(localCandidate, cloudData)) {
        logDashboardEvent('adminLogCloudCacheReplaced', 'warn', {}, { source: 'cloud' });
      }
      applyDashboardCloudSnapshot(cloudData, { schedule: true });
      setCloudSyncStatus('live');
    } else {
      if (hadLocalData && localData) {
        const seedData = state.dashData || localData;
        state.dashData = seedData;
        hydrateAuxiliaryRecordsFromDashboardData(state.dashData);
        if (state.dashData && typeof state.dashData === 'object') delete state.dashData.logs;
        render();
        const seedPayload = withDashboardTimestamp(
          sanitizeDashboardDataForPersistence(seedData),
          Date.now()
        );
        try {
          const writtenPayload = await awaitCloud(
            writeDashboardSnapshotToCloud(db, firestore, seedPayload, 0),
            'Dashboard cloud seed'
          );
          if (!isCurrentLoad()) return;
          state.dashData = normalizeDashboardDataForCache(writtenPayload);
          writeDashboardLocalCache(writtenPayload);
          setCloudSyncStatus('live');
          logDashboardEvent('adminLogCloudCacheUploaded', 'success', {}, { source: 'cloud' });
        } catch (err) {
          if (!isDashboardCloudConflict(err)) throw err;
          handleDashboardCloudConflict(seedData, err, 'Dashboard cloud seed');
        }
      } else {
        state.dashData = null;
        try {
          localStorage.removeItem(STORAGE_KEY);
          dashboardLocalCacheJson = '';
        } catch (e) {}
        render();
        setCloudSyncStatus('live');
      }
    }
    if (!isCurrentLoad()) return;
    if (state._fsUnsub) state._fsUnsub();
    state._fsUnsub = onSnapshot(
      doc(db, FS_PATH),
      (snap) => {
        if (snap.exists()) {
          const cloudData = normalizeDashboardDataForCache(snap.data());
          applyDashboardRemoteSnapshot(cloudData, { schedule: true });
          updateLastSynced();
          if (!adminEditGuard.state().hasDeferredSnapshot) setCloudSyncStatus('live');
          const ind = $id('dashSyncIndicator');
          if (ind) {
            ind.classList.remove('hidden');
            setTimeout(() => ind.classList.add('hidden'), 3500);
          }
        }
      },
      (err) => {
        if (state._signingOut) return;
        console.error('FIREBASE SYNC ERROR:', err);
        showCloudSyncFailure(err, 'Sync listener error');
      }
    );
    logDashboardEvent('adminCloudSynced', 'info', {}, { source: 'cloud' });
    updateLastSynced();
  } catch (e) {
    if (state._signingOut) return;
    if (!isCurrentLoad()) return;
    console.error('FIREBASE AUTH ERROR:', e);
    if (preferCloudFirst && localData) {
      restoreDashboardLocalFallback(localData);
      setCloudSyncStatus('local', e.message || e.code || '');
      if (isDashboardCloudTimeout(e)) {
        state._cloudInitPromise = null;
        logDashboardEvent('adminLogCloudLoadTimeout', 'warn', {}, { source: 'cloud' });
      } else {
        logDashboardEvent('adminLogCloudLoadFailed', 'warn', {}, { source: 'cloud' });
      }
      return;
    }
    showCloudSyncFailure(e, 'Load auth error');
  }
}

async function clearData() {
  if (blockEdenArchiveWrite('clear workspace data')) return;
  state.dashData = null;
  try {
    localStorage.removeItem(STORAGE_KEY);
    dashboardLocalCacheJson = '';
  } catch (e) {}
  clearAdminLogView();
  try {
    setCloudSyncStatus('syncing');
    const db = await ensureCloudSyncReady();
    if (db) {
      const firestore = await loadFirestoreApi();
      const clearedPayload = {
        updatedAtMs: Date.now(),
        last_updated: fmtDate(new Date()),
        total_attacks: 0,
        attacks: [],
        players_summary: [],
      };
      const writtenPayload = await writeDashboardSnapshotToCloud(
        db,
        firestore,
        clearedPayload,
        dashboardCloudBaseRevision
      );
      state.dashData = normalizeDashboardDataForCache(writtenPayload);
      writeDashboardLocalCache(writtenPayload);
      setCloudSyncStatus('live');
    } else {
      setCloudSyncStatus('local');
    }
  } catch (e) {
    showCloudSyncFailure(e, 'Clear cloud data failed');
  }
  renderAdminActivityTerminal();
  render();
  logDashboardEvent('adminLogDatabaseCleared', 'warn', {}, { source: 'dashboard' });
}

// --- Exports ---
const ADMIN_EXPORT_STORAGE_KEYS = [
  STORAGE_KEY,
  ROSTER_KEY,
  ROSTER_SNAPSHOTS_KEY,
  BANNER_KEY,
  DUTY_LIST_KEY,
  CONTRIBUTION_KEY,
  EX_GUILD_CONTRIBUTION_KEY,
  PLAYER_REGISTRY_KEY,
  ALLIANCE_KEY,
  LOG_KEY,
  R5_ADJUSTMENTS_LOCAL_KEY,
  R5_ADJUSTMENT_SEASON_LOCAL_KEY,
];

const ADMIN_EXPORT_COLUMNS = [
  ['Dataset', 'dataset'],
  ['Record ID', 'recordId'],
  ['Date', 'date'],
  ['Type', 'type'],
  ['Player', 'player'],
  ['Guild', 'guild'],
  ['Rank', 'rank'],
  ['Reward', 'reward'],
  ['Metric', 'metric'],
  ['Value', 'value'],
  ['Structure', 'structure'],
  ['Level', 'level'],
  ['Target', 'target'],
  ['Group', 'group'],
  ['Time', 'time'],
  ['Status', 'status'],
  ['Note', 'note'],
  ['Raw JSON', 'rawJson'],
];

function exportTimestampForFilename() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function stringifyForExport(value) {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch (e) {
    return String(value);
  }
}

function csvCell(value) {
  return `"${stringifyForExport(value).replace(/"/g, '""')}"`;
}

function rowsToCsv(columnDefs, rows) {
  return [
    columnDefs.map(([label]) => csvCell(label)).join(','),
    ...rows.map((row) => columnDefs.map(([, key]) => csvCell(row[key])).join(',')),
  ].join('\n');
}

function downloadJson(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function parseStorageJson(raw) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function readStorageSnapshot() {
  const snapshot = {};
  ADMIN_EXPORT_STORAGE_KEYS.forEach((key) => {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return;
      snapshot[key] = {
        bytes: raw.length,
        parsed: parseStorageJson(raw),
        raw,
      };
    } catch (e) {
      snapshot[key] = { error: e?.message || String(e) };
    }
  });
  return snapshot;
}

function countEntries(records) {
  return (Array.isArray(records) ? records : []).reduce(
    (sum, record) => sum + (Array.isArray(record?.entries) ? record.entries.length : 0),
    0
  );
}

function buildAdminDatasetCounts() {
  const attacks = Array.isArray(state.dashData?.attacks) ? state.dashData.attacks : [];
  return {
    attacks: attacks.length,
    attackPlayers: attacks.reduce(
      (sum, attack) => sum + (Array.isArray(attack?.players) ? attack.players.length : 0),
      0
    ),
    playerSummaryRows: Array.isArray(state.dashData?.players_summary)
      ? state.dashData.players_summary.length
      : 0,
    rosterNames: Array.isArray(state.rosterNames) ? state.rosterNames.length : 0,
    rosterSnapshots: Array.isArray(state.rosterSnapshots) ? state.rosterSnapshots.length : 0,
    bannerRecords: Array.isArray(state.bannerRecords) ? state.bannerRecords.length : 0,
    dutyRecords: Array.isArray(state.dutyRecords) ? state.dutyRecords.length : 0,
    dutyEntries: countEntries(state.dutyRecords),
    contributionRecords: Array.isArray(state.contributionRecords)
      ? state.contributionRecords.length
      : 0,
    contributionEntries: countEntries(state.contributionRecords),
    exGuildContributions: Array.isArray(state.exGuildContributions)
      ? state.exGuildContributions.length
      : 0,
    conductAdjustments: Array.isArray(state.r5Adjustments) ? state.r5Adjustments.length : 0,
    alliances: Array.isArray(state.allianceList) ? state.allianceList.length : 0,
  };
}

function buildWeightedContributionExportModel() {
  return buildWeightedContributionRows({
    contributionRecords: state.contributionRecords,
    dutyRecords: state.dutyRecords,
    r5Adjustments: state.r5Adjustments,
    season: state.r5Season,
    exGuildContributions: state.exGuildContributions,
  });
}

function stableAllianceViewSourceId(row) {
  const sourceName = String(row?.sourceName || row?.playerName || '')
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .trim();
  const playerKey = String(row?.playerKey || compactPlayerIdentity(sourceName)).trim();
  const fingerprint = `${sourceName}\u241f${playerKey}`;
  return `eden_${(hashCode(fingerprint) >>> 0).toString(36)}`;
}

function buildAllianceViewContributionModel() {
  const conductAdjustments = state.alliancePublicConductSnapshotLoaded
    ? state.alliancePublicConductAdjustments
    : state.r5Adjustments;
  const weightedModel = buildWeightedContributionRows({
    contributionRecords: state.contributionRecords,
    dutyRecords: state.dutyRecords,
    r5Adjustments: conductAdjustments,
    season: state.r5Season,
    exGuildContributions: state.exGuildContributions,
  });
  const settings = normalizeEdenX1VoteSettings(
    state.edenX1VoteSettings || readLocalEdenX1VoteSettings()
  );
  const activeMode =
    settings.contributionRankingMode === EDEN_X1_CONTRIBUTION_RANKING_MODES.DEFAULT
      ? 'base'
      : 'extended';
  const sourceOccurrences = new Map();
  const rows = weightedModel.rows.map((row) => {
    const baseSourceId = stableAllianceViewSourceId(row);
    const occurrence = (sourceOccurrences.get(baseSourceId) || 0) + 1;
    sourceOccurrences.set(baseSourceId, occurrence);
    return {
      ...row,
      sourceId: occurrence === 1 ? baseSourceId : `${baseSourceId}_${occurrence}`,
      activeScore: activeMode === 'base' ? row.contributionRewardScore : row.weightedScore,
    };
  });
  return {
    season: state.r5Season || getDashboardR5SeasonKey(),
    activeMode,
    rankingMode: settings.contributionRankingMode,
    record: weightedModel.record
      ? {
          id: weightedModel.record.id || '',
          date: weightedModel.record.date || '',
          label: getWeightedContributionRecordLabel(weightedModel.record),
        }
      : null,
    playerRegistry: normalizePlayerRegistry(state.playerRegistry || readStoredPlayerRegistry()),
    rows,
  };
}

function subscribeAllianceViewContributionModel(listener) {
  if (typeof listener !== 'function') return () => {};
  allianceViewContributionSubscribers.add(listener);
  return () => allianceViewContributionSubscribers.delete(listener);
}

async function ensureAllianceViewVoteSettingsSubscription() {
  if (allianceViewVoteSettingsUnsubscribe || isLocalAdminTestBypass()) return true;
  if (state.adminIsAdmin !== true) return false;
  const db = await ensureCloudSyncReady();
  if (!db) return false;
  const { doc, onSnapshot } = await loadFirestoreApi();
  const reference = doc(db, EDEN_X1_VOTE_SETTINGS_DOC_PATH);
  allianceViewVoteSettingsUnsubscribe = onSnapshot(
    reference,
    (snapshot) => {
      allianceViewSettingsLoaded = true;
      if (!snapshot.exists()) return;
      edenX1VoteSettingsVersion += 1;
      state.edenX1VoteSettings = normalizeEdenX1VoteSettings(snapshot.data());
      writeLocalEdenX1VoteSettings(state.edenX1VoteSettings);
      renderEdenX1VoteSettings();
      publishAllianceViewContributionModel();
    },
    (error) => {
      allianceViewVoteSettingsUnsubscribe = null;
      allianceViewSettingsLoaded = false;
      console.warn('ALLIANCE VIEW VOTE SETTINGS SUBSCRIPTION ERROR:', error);
    }
  );
  return typeof allianceViewVoteSettingsUnsubscribe === 'function';
}

function publishAllianceViewContributionModel() {
  if (!allianceViewContributionSubscribers.size || allianceViewContributionFrame) return;
  const notify = () => {
    allianceViewContributionFrame = 0;
    const model = buildAllianceViewContributionModel();
    for (const listener of allianceViewContributionSubscribers) {
      try {
        listener(model);
      } catch (error) {
        console.warn('Alliance View contribution refresh failed', error);
      }
    }
  };
  allianceViewContributionFrame =
    typeof requestAnimationFrame === 'function'
      ? requestAnimationFrame(notify)
      : setTimeout(notify, 0);
}

async function ensureAllianceViewMountedOrUpdated() {
  if (allianceViewController) {
    void ensureAllianceViewVoteSettingsSubscription();
    allianceViewController.setContributionModel(buildAllianceViewContributionModel());
    return allianceViewController;
  }
  if (allianceViewMountPromise) return allianceViewMountPromise;
  allianceViewMountPromise = (async () => {
    if (!allianceViewSettingsLoaded) {
      if (state.adminIsAdmin === true || !state.edenX1VoteSettings) {
        allianceViewSettingsLoaded = await loadEdenX1VoteSettings();
      } else {
        allianceViewSettingsLoaded = true;
      }
    }
    await ensureAllianceViewVoteSettingsSubscription();
    if (!allianceViewModulePromise) {
      allianceViewModulePromise = import('./admin-alliance-view.js').catch((error) => {
        allianceViewModulePromise = null;
        void recoverFromStaleAssetGraph(error);
        throw error;
      });
    }
    const module = await allianceViewModulePromise;
    allianceViewController = await module.initializeAdminAllianceView({
      container: $id('dashAllianceViewRoot'),
      t: dashT,
      getFirestoreContext: () => window.getVtsAdminFirestoreContext(),
      getContributionModel: buildAllianceViewContributionModel,
      subscribeContributionModel: subscribeAllianceViewContributionModel,
    });
    allianceViewController.setContributionModel(buildAllianceViewContributionModel());
    return allianceViewController;
  })()
    .catch((error) => {
      console.error('ALLIANCE VIEW LOAD ERROR:', error);
      const root = $id('dashAllianceViewRoot');
      if (root) {
        root.innerHTML = `<div class="dash-empty" role="alert">${esc(
          dashT('adminAllianceViewUnavailable')
        )}</div>`;
      }
      return null;
    })
    .finally(() => {
      allianceViewMountPromise = null;
    });
  return allianceViewMountPromise;
}

async function getAllStarBohAdminStoreOptions(storeModule) {
  const context = await window.getVtsAdminFirestoreContext();
  const uid = String(context?.user?.uid || '').trim();
  const tokenResult = await context?.user?.getIdTokenResult?.();
  const admin = tokenResult?.claims?.admin === true;
  if (!uid || !admin) throw new Error(dashT('adminCloudAdminRequired'));
  if (typeof storeModule?.getAllStarBohActiveConfig !== 'function') {
    throw new Error(allStarBohAdminT('adminBohUnavailable'));
  }
  const config = await storeModule.getAllStarBohActiveConfig({
    db: context.db,
    firestore: context.firestore,
  });
  return {
    db: context.db,
    firestore: context.firestore,
    seasonId: config.activeSeason,
    uid,
    admin,
  };
}

async function ensureAllStarBohMountedOrUpdated() {
  if (allStarBohController) {
    await allStarBohController.refresh?.();
    return allStarBohController;
  }
  if (allStarBohMountPromise) return allStarBohMountPromise;
  allStarBohMountPromise = (async () => {
    if (!allStarBohModulePromise) {
      allStarBohModulePromise = Promise.all([
        import('./admin-all-star-boh.js'),
        import('./all-star-boh-store.js'),
        import('./i18n/admin-all-star-boh/index.js'),
        import('./heroes-data.js'),
        import('./tech-db.js'),
        import('./i18n/research/index.js'),
        import('../css/admin-all-star-boh.css'),
      ]).catch((error) => {
        allStarBohModulePromise = null;
        void recoverFromStaleAssetGraph(error);
        throw error;
      });
    }
    const [adminModule, storeModule, i18nModule, heroModule, researchModule, researchI18nModule] =
      await allStarBohModulePromise;
    allStarBohAdminI18n = i18nModule;
    allStarBohResearchI18n = researchI18nModule;
    await Promise.all([
      i18nModule.loadAdminAllStarBohLocale(getDashboardLang()),
      researchI18nModule.loadResearchLocale(getDashboardLang()),
    ]);
    allStarBohController = await adminModule.initializeAdminAllStarBoh($id('dashAllStarBohRoot'), {
      t: allStarBohAdminT,
      locale: getDashboardLang(),
      heroMetadata: heroModule.allHeroesData || [],
      researchMetadata: () =>
        (researchModule.techDatabase || []).map((tree) => ({
          id: tree.id,
          label: researchI18nModule.researchTreeText(tree, 'name', getDashboardLang()),
        })),
      createStore: async () => {
        const adminStore = storeModule.createAllStarBohAdminStore({
          ...(await getAllStarBohAdminStoreOptions(storeModule)),
          heroNames: (heroModule.allHeroesData || []).map((hero) => hero.name),
          researchTreeIds: (researchModule.techDatabase || []).map((tree) => tree.id),
        });
        return adminModule.createAdminAllStarBohStoreAdapter(adminStore, {
          paidUsableHeroNames: (heroModule.allHeroesData || [])
            .filter((hero) => hero.State === 'Paid')
            .map((hero) => hero.name),
          validatePublication: adminModule.validateAdminAllStarBohPublicationBundle,
          onError: (error, context) =>
            console.error('ALL-STAR BOH ADMIN LIVE REFRESH ERROR:', context?.action, error),
        });
      },
    });
    return allStarBohController;
  })()
    .catch((error) => {
      console.error('ALL-STAR BOH ADMIN LOAD ERROR:', error);
      const root = $id('dashAllStarBohRoot');
      if (root) {
        root.setAttribute('aria-busy', 'false');
        root.innerHTML = `<div class="dash-empty" role="alert">${esc(
          allStarBohAdminT('adminBohUnavailable')
        )}</div>`;
      }
      return null;
    })
    .finally(() => {
      allStarBohMountPromise = null;
    });
  return allStarBohMountPromise;
}

function contributionRewardExportLabel(tier) {
  return (
    {
      guild_master: dashT('adminContributionRewardGuildMaster'),
      core: dashT('adminContributionRewardCore'),
      power_house: dashT('adminContributionRewardPowerHouse'),
      members: dashT('adminContributionRewardMembers'),
      premium: dashT('adminContributionRewardPremium'),
      standard: dashT('adminContributionRewardStandard'),
      review: dashT('adminContributionRewardReview'),
      none: dashT('adminContributionRewardNone'),
    }[tier] || dashT('adminContributionRewardAuto')
  );
}

function buildAdminFullBackup() {
  const dashboard = attachAuxiliaryRecords(state.dashData);
  return {
    ...dashboard,
    schema: 'vts-admin-full-export-v1',
    exportedAt: new Date().toISOString(),
    counts: buildAdminDatasetCounts(),
    dashboard,
    roster: {
      names: Array.isArray(state.rosterNames) ? state.rosterNames : [],
      snapshots: Array.isArray(state.rosterSnapshots) ? state.rosterSnapshots : [],
    },
    banners: Array.isArray(state.bannerRecords) ? state.bannerRecords : [],
    dutyRecords: Array.isArray(state.dutyRecords) ? state.dutyRecords : [],
    contributionRecords: Array.isArray(state.contributionRecords) ? state.contributionRecords : [],
    exGuildContributions: Array.isArray(state.exGuildContributions)
      ? state.exGuildContributions
      : [],
    playerRegistry: normalizePlayerRegistry(state.playerRegistry || readStoredPlayerRegistry()),
    conductAdjustments: Array.isArray(state.r5Adjustments) ? state.r5Adjustments : [],
    r5Season: state.r5Season || getDashboardR5SeasonKey(),
    alliances: Array.isArray(state.allianceList) ? state.allianceList : [],
    logs: listAdminLogEntries({ includeCleared: true, limit: 500 }),
  };
}

function buildAdminDebugBundle() {
  const weightedModel = buildWeightedContributionExportModel();
  return {
    ...buildAdminFullBackup(),
    schema: 'vts-admin-debug-export-v1',
    debug: {
      app: {
        userAgent: navigator.userAgent,
        language: getDashboardLang(),
        location: location.href,
      },
      cloud: {
        configured: state.cloudSyncConfigured === true,
        adminReady: state.cloudAdminReady === true,
        status: state.cloudSyncStatus || '',
        detail: state.cloudSyncStatusDetail || '',
      },
      filters: {
        searchQ: state.searchQ || '',
        attackSearchQ: state.attackSearchQ || '',
        timeFilter: state.timeFilter || '',
        structureFilterKey: state.structureFilterKey || '',
        sortCol: state.sortCol || '',
        sortDir: state.sortDir || '',
        leaderLimit: state.leaderLimit || '',
      },
      rendered: {
        attacks: Array.isArray(state._lastRenderedAttacks) ? state._lastRenderedAttacks : [],
        playerSummary: Array.isArray(state._lastRenderedPlayerSummary)
          ? state._lastRenderedPlayerSummary
          : [],
        adjustedPlayerSummary: Array.isArray(state._lastRenderedAdjustedPlayerSummary)
          ? state._lastRenderedAdjustedPlayerSummary
          : [],
        filterLabel: state._lastRenderedFilterLabel || '',
        timeLabel: state._lastRenderedTimeLabel || '',
      },
      derived: {
        weightedContribution: {
          recordLabel: getWeightedContributionRecordLabel(weightedModel.record),
          premiumCutoff: weightedModel.premiumCutoff,
          weights: weightedModel.weights,
          max: weightedModel.max,
          rows: weightedModel.rows,
        },
      },
      localStorage: readStorageSnapshot(),
    },
  };
}

function pushAdminExportRow(rows, dataset, values = {}) {
  rows.push({
    dataset,
    recordId: values.recordId || '',
    date: values.date || '',
    type: values.type || '',
    player: values.player || '',
    guild: values.guild || '',
    rank: values.rank ?? '',
    reward: values.reward || '',
    metric: values.metric || '',
    value: values.value ?? '',
    structure: values.structure || '',
    level: values.level || '',
    target: values.target || '',
    group: values.group || '',
    time: values.time || '',
    status: values.status || '',
    note: values.note || '',
    rawJson: values.rawJson === undefined ? '' : stringifyForExport(values.rawJson),
  });
}

function buildWeightedContributionCsvRows() {
  const model = buildWeightedContributionExportModel();
  return (model.rows || []).map((row) => ({
    player: row.playerName,
    currentRank: row.currentRank ? `#${row.currentRank}` : '',
    currentReward: contributionRewardExportLabel(row.currentReward),
    contributionScore: row.contributionScore,
    exGuildContribution: row.contributionExGuild || 0,
    shieldWalls: row.shieldWalls,
    pathers: row.pathers,
    banners: row.banners,
    conductBonus: row.conductBonus,
    dutyPoints: row.dutyPoints,
    conductPoints: row.conductPoints,
    weightedScore: row.weightedScore,
    finalRank: `#${row.finalRank}`,
    finalReward: contributionRewardExportLabel(row.finalReward),
    sourceName: row.sourceName,
    playerKey: row.playerKey,
  }));
}

function buildAdminAllDataRows() {
  const rows = [];
  const attacks = Array.isArray(state.dashData?.attacks) ? state.dashData.attacks : [];
  attacks.forEach((attack) => {
    const target = getDatasetStructureTarget(attack);
    const attackDate = displayGameTime(attack.game_time);
    pushAdminExportRow(rows, 'attack', {
      recordId: attack.id || '',
      date: attackDate,
      type: 'structure_attack',
      metric: 'total_demolition',
      value: attack.total_demolition || '',
      structure: target.structure_name,
      level: target.structure_level,
      time: attack.start_time || '',
      rawJson: attack,
    });
    attackPlayers(attack).forEach((player) => {
      pushAdminExportRow(rows, 'attack_player', {
        recordId: attack.id || '',
        date: attackDate,
        type: 'structure_attack',
        player: player.name || '',
        rank: player.rank || '',
        metric: 'demolition',
        value: player.value || '',
        structure: target.structure_name,
        level: target.structure_level,
        time: attack.start_time || '',
        rawJson: player,
      });
    });
  });

  const playerSummary = Array.isArray(state._lastRenderedPlayerSummary)
    ? state._lastRenderedPlayerSummary
    : Array.isArray(state.dashData?.players_summary)
      ? state.dashData.players_summary
      : [];
  playerSummary.forEach((player, index) => {
    pushAdminExportRow(rows, 'leaderboard_player', {
      recordId: `leaderboard-${index + 1}`,
      type: 'leaderboard',
      player: player.name || '',
      rank: index + 1,
      metric: 'total_demolition',
      value: player.total_demolition || 0,
      rawJson: player,
    });
  });

  (Array.isArray(state.rosterNames) ? state.rosterNames : []).forEach((name, index) => {
    pushAdminExportRow(rows, 'roster_name', {
      recordId: `roster-name-${index + 1}`,
      type: 'roster',
      player: name,
      metric: 'roster_index',
      value: index + 1,
      rawJson: name,
    });
  });

  (Array.isArray(state.rosterSnapshots) ? state.rosterSnapshots : []).forEach(
    (snapshot, sIndex) => {
      const members = Array.isArray(snapshot?.members) ? snapshot.members : [];
      members.forEach((member, memberIndex) => {
        pushAdminExportRow(rows, 'roster_snapshot_member', {
          recordId: snapshot?.id || snapshot?.createdAt || `roster-snapshot-${sIndex + 1}`,
          date: snapshot?.date || snapshot?.createdAt || '',
          type: 'roster_snapshot',
          player: readRosterDisplayName(member),
          guild: member?.alliance || '',
          rank: member?.rank || '',
          metric: 'snapshot_member_index',
          value: memberIndex + 1,
          status: member?.status || '',
          rawJson: member,
        });
      });
    }
  );

  (Array.isArray(state.bannerRecords) ? state.bannerRecords : []).forEach((record, index) => {
    Object.entries(record?.teams || {}).forEach(([team, members]) => {
      (Array.isArray(members) ? members : []).forEach((member) => {
        pushAdminExportRow(rows, 'banner_assignment', {
          recordId: record?.id || `banner-${index + 1}`,
          date: record?.date || '',
          type: 'banner',
          player: member,
          group: team,
          metric: 'assignment_count',
          value: 1,
          note: record?.event || '',
          rawJson: { record, team, member },
        });
      });
    });
  });

  (Array.isArray(state.dutyRecords) ? state.dutyRecords : []).forEach((record) => {
    (Array.isArray(record?.entries) ? record.entries : []).forEach((entry) => {
      pushAdminExportRow(rows, 'duty_entry', {
        recordId: record?.id || '',
        date: record?.date || '',
        type: record?.type || '',
        player: entry?.confirmed || entry?.name || entry?.original || '',
        metric: 'duty_count',
        value: 1,
        target: entry?.target || '',
        group: entry?.group || '',
        time: entry?.usageTime || record?.gameTime || '',
        status: entry?.status || '',
        note: entry?.note || record?.note || '',
        rawJson: entry,
      });
    });
  });

  (Array.isArray(state.contributionRecords) ? state.contributionRecords : []).forEach((record) => {
    (Array.isArray(record?.entries) ? record.entries : []).forEach((entry) => {
      pushAdminExportRow(rows, 'contribution_entry', {
        recordId: record?.id || '',
        date: record?.date || '',
        type: record?.isPrimary ? 'primary_contribution' : 'contribution',
        player: entry?.name || '',
        guild: entry?.guild || '',
        rank: entry?.rank || '',
        reward: entry?.rewardOverride || entry?.reward || '',
        metric: 'contribution',
        value: entry?.contribution || entry?.value || '',
        status: entry?.position || '',
        note: record?.note || '',
        rawJson: entry,
      });
    });
  });

  (Array.isArray(state.exGuildContributions) ? state.exGuildContributions : []).forEach(
    (entry, index) => {
      pushAdminExportRow(rows, 'ex_guild_contribution', {
        recordId: entry?.id || `ex-guild-${index + 1}`,
        date: entry?.createdAt || '',
        type: 'ex_guild',
        player: entry?.playerName || entry?.name || '',
        metric: 'contribution',
        value: entry?.contribution || entry?.value || '',
        status: entry?.status || '',
        rawJson: entry,
      });
    }
  );

  (Array.isArray(state.r5Adjustments) ? state.r5Adjustments : []).forEach((adjustment) => {
    pushAdminExportRow(rows, 'conduct_adjustment', {
      recordId: adjustment?.id || '',
      date: adjustment?.createdAt || '',
      type: adjustment?.category || '',
      player: adjustment?.playerName || '',
      metric: 'conduct_bonus',
      value: adjustment?.points || 0,
      status: adjustment?.season || '',
      note: adjustment?.note || '',
      rawJson: adjustment,
    });
  });

  (Array.isArray(state.allianceList) ? state.allianceList : []).forEach((alliance, index) => {
    pushAdminExportRow(rows, 'alliance', {
      recordId: `alliance-${index + 1}`,
      type: 'alliance',
      guild: alliance,
      metric: 'alliance_index',
      value: index + 1,
      rawJson: alliance,
    });
  });

  buildWeightedContributionCsvRows().forEach((row) => {
    pushAdminExportRow(rows, 'weighted_contribution', {
      recordId: row.playerKey,
      type: 'weighted_contribution',
      player: row.player,
      rank: row.finalRank,
      reward: row.finalReward,
      metric: 'weighted_score',
      value: row.weightedScore,
      status: row.currentRank,
      rawJson: row,
    });
  });

  return rows;
}

function exportData() {
  downloadJson(
    buildAdminFullBackup(),
    `vts_admin_full_backup_${exportTimestampForFilename()}.json`
  );
}

function exportAdminDebugJson() {
  downloadJson(
    buildAdminDebugBundle(),
    `vts_admin_debug_bundle_${exportTimestampForFilename()}.json`
  );
}

function exportWeightedContributionCsv() {
  const rows = buildWeightedContributionCsvRows();
  if (!rows.length) return;
  const columns = [
    ['Player', 'player'],
    ['Current rank', 'currentRank'],
    ['Current reward', 'currentReward'],
    ['Contribution score', 'contributionScore'],
    ['Ex-guild contribution', 'exGuildContribution'],
    ['#Shield Walls', 'shieldWalls'],
    ['#Pathers', 'pathers'],
    ['#Banners', 'banners'],
    ['Bonus Team Effort (R5)', 'conductBonus'],
    ['Duty points', 'dutyPoints'],
    ['Bonus Team Effort points', 'conductPoints'],
    ['Weighted score', 'weightedScore'],
    ['Final rank', 'finalRank'],
    ['Final reward', 'finalReward'],
    ['Source name', 'sourceName'],
    ['Player key', 'playerKey'],
  ];
  downloadCsv(
    rowsToCsv(columns, rows),
    `vts_weighted_contribution_${exportTimestampForFilename()}.csv`
  );
}

function exportAdminAllDataCsv() {
  const rows = buildAdminAllDataRows();
  if (!rows.length) return;
  downloadCsv(
    rowsToCsv(ADMIN_EXPORT_COLUMNS, rows),
    `vts_admin_all_data_${exportTimestampForFilename()}.csv`
  );
}

function currentTopPerformersSubtitle() {
  const scope = state._lastRenderedFilterLabel || dashT('adminChartTop');
  const timeLabel =
    state._lastRenderedTimeLabel ||
    (state.timeFilter === 'daily'
      ? dashT('adminTimeTodayShort')
      : state.timeFilter === 'weekly'
        ? dashT('adminTimeWeekShort')
        : dashT('adminTimeAll'));
  return `${scope} \u00b7 ${timeLabel}`;
}

function exportToCsv() {
  if (!state.dashData?.players_summary && !state.dashData?.attacks?.length) return;
  const players = Array.isArray(state._lastRenderedPlayerSummary)
    ? state._lastRenderedPlayerSummary
    : state.dashData?.attacks?.length
      ? buildSerializablePlayerSummary(state.dashData.attacks)
      : state.dashData.players_summary;
  let csv = 'Rank,Member Name,Total Demolition,Hits,Avg per Hit\n';
  players.forEach((p, i) => {
    const safeName = p.name.replace(/"/g, '""');
    csv += `${i + 1},"${safeName}",${p.total_demolition},${p.participation_count},${Math.round(p.total_demolition / p.participation_count)}\n`;
  });
  downloadCsv(csv, 'vts_leaderboard.csv');
}

function loadHtml2Canvas() {
  const pageLoader = window.loadHtml2Canvas;
  if (typeof pageLoader === 'function' && pageLoader !== loadHtml2Canvas) return pageLoader();
  if (window._h2cPromise) return window._h2cPromise;
  window._h2cPromise = new Promise((resolve, reject) => {
    if (typeof window.html2canvas === 'function') {
      resolve(window.html2canvas);
      return;
    }
    const existing = document.querySelector('script[data-html2canvas-loader="true"]');
    const script = existing || document.createElement('script');
    script.dataset.html2canvasLoader = 'true';
    script.src = 'https://html2canvas.hertzen.com/dist/html2canvas.min.js';
    script.async = true;
    script.onload = () => {
      if (typeof window.html2canvas === 'function') resolve(window.html2canvas);
      else reject(new Error('html2canvas loaded without exposing window.html2canvas'));
    };
    script.onerror = () => reject(new Error('Could not load html2canvas.'));
    if (!existing) document.head.appendChild(script);
  });
  return window._h2cPromise;
}
if (typeof window.loadHtml2Canvas !== 'function') window.loadHtml2Canvas = loadHtml2Canvas;

async function exportToPng() {
  const html2canvas = await loadHtml2Canvas();
  const target = $id('dashApp')?.querySelector('.dash-container') || $id('dashApp');
  if (!target) return;
  html2canvas(target, { backgroundColor: '#0b0f19', scale: 2, allowTaint: false, useCORS: true })
    .then((c) => {
      const a = document.createElement('a');
      a.href = c.toDataURL('image/png');
      a.download = 'vts_dashboard.png';
      a.click();
    })
    .catch(() => {});
}
async function exportChartPng() {
  const chart = $id('dashChart');
  if (!chart) return;
  const html2canvas = await loadHtml2Canvas();

  const card = chart.closest('.dash-card');
  const clone = card.cloneNode(true);

  // Remove export buttons from clone
  const cloneBtns = clone.querySelectorAll('.dash-btn');
  cloneBtns.forEach((b) => b.remove());

  const subTitle = currentTopPerformersSubtitle();

  const titleH2 = clone.querySelector('h2.dash-card-title');
  if (titleH2) {
    titleH2.innerHTML = `<svg class="dash-export-title-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> <span class="dash-export-title-text">${esc(dashT('adminChartTop'))}</span>`;
    const subDiv = document.createElement('div');
    subDiv.className = 'dash-export-subtitle';
    subDiv.textContent = subTitle;
    titleH2.parentElement.appendChild(subDiv);
    titleH2.parentElement.style.flexDirection = 'column';
    titleH2.parentElement.style.alignItems = 'flex-start';
    titleH2.parentElement.style.borderBottom = '1px solid rgba(255,255,255,0.1)';
    titleH2.parentElement.style.paddingBottom = '1rem';
    titleH2.parentElement.style.marginBottom = '1rem';
  }

  const cloneChart = clone.querySelector('.dash-chart');
  if (cloneChart) cloneChart.style.gap = '0.9rem';

  const items = clone.querySelectorAll('.dash-top-item');
  items.forEach((item) => {
    item.style.overflow = 'visible';
    item.style.borderRadius = '0';
    const bar = item.querySelector('.dash-top-bar');
    if (bar) {
      bar.style.borderRadius = '8px';
      bar.style.background = 'linear-gradient(90deg, rgba(59,130,246,0.1), rgba(59,130,246,0.3))';
    }
    const spans = item.querySelectorAll('span');
    spans.forEach((s) => (s.style.transform = 'translateY(1px)'));
  });

  clone.style.position = 'absolute';
  clone.style.top = '0px';
  clone.style.left = '-9999px';
  clone.style.width = Math.max(card.offsetWidth, 500) + 'px'; // Ensure sufficient width for export
  clone.style.background = '#0b0f19'; // Force explicit background on clone
  clone.style.border = '1px solid rgba(255,255,255,0.05)';

  // Append to the root so CSS applies!
  const root = $id('ocrDashboardRoot') || document.body;
  root.querySelectorAll('[data-ocr-export-clone="true"]').forEach((node) => node.remove());
  clone.dataset.ocrExportClone = 'true';
  root.appendChild(clone);

  html2canvas(clone, { backgroundColor: '#0b0f19', scale: 2 })
    .then((c) => {
      c.toBlob((blob) => {
        const file = new File([blob], 'vts_top_performers.png', { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          // We have a share button now, maybe just download directly here unless explicitly sharing
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = 'vts_top_performers.png';
          a.click();
        } else {
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = 'vts_top_performers.png';
          a.click();
        }
      });
    })
    .catch(() => {})
    .finally(() => {
      clone.remove();
    });
}
window.shareChartImage = async function () {
  const chart = $id('dashChart');
  if (!chart) return;
  const html2canvas = await loadHtml2Canvas();
  const card = chart.closest('.dash-card');
  const clone = card.cloneNode(true);
  const cloneBtns = clone.querySelectorAll('.dash-btn');
  cloneBtns.forEach((b) => b.remove());
  const subTitle = currentTopPerformersSubtitle();
  const titleH2 = clone.querySelector('h2.dash-card-title');
  if (titleH2) {
    titleH2.innerHTML = `<svg class="dash-export-title-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> <span class="dash-export-title-text">${esc(dashT('adminChartTop'))}</span>`;
    const subDiv = document.createElement('div');
    subDiv.className = 'dash-export-subtitle';
    subDiv.textContent = subTitle;
    titleH2.parentElement.appendChild(subDiv);
    titleH2.parentElement.style.flexDirection = 'column';
    titleH2.parentElement.style.alignItems = 'flex-start';
    titleH2.parentElement.style.borderBottom = '1px solid rgba(255,255,255,0.1)';
    titleH2.parentElement.style.paddingBottom = '1rem';
    titleH2.parentElement.style.marginBottom = '1rem';
  }
  const cloneChart = clone.querySelector('.dash-chart');
  if (cloneChart) cloneChart.style.gap = '0.9rem';

  const items = clone.querySelectorAll('.dash-top-item');
  items.forEach((item) => {
    item.style.overflow = 'visible';
    item.style.borderRadius = '0';
    const bar = item.querySelector('.dash-top-bar');
    if (bar) {
      bar.style.borderRadius = '8px';
      bar.style.background = 'linear-gradient(90deg, rgba(59,130,246,0.1), rgba(59,130,246,0.3))';
    }
    const spans = item.querySelectorAll('span');
    spans.forEach((s) => (s.style.transform = 'translateY(1px)'));
  });
  clone.style.position = 'absolute';
  clone.style.top = '0px';
  clone.style.left = '-9999px';
  clone.style.width = card.offsetWidth + 'px';
  clone.style.background = '#0b0f19';
  clone.style.border = '1px solid rgba(255,255,255,0.05)';
  const root = $id('ocrDashboardRoot') || document.body;
  root.querySelectorAll('[data-ocr-export-clone="true"]').forEach((node) => node.remove());
  clone.dataset.ocrExportClone = 'true';
  root.appendChild(clone);
  html2canvas(clone, { backgroundColor: '#0b0f19', scale: 2 })
    .then((c) => {
      c.toBlob((blob) => {
        const file = new File([blob], 'vts_top_performers.png', { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          navigator.share({ title: dashT('adminChartTop'), files: [file] }).catch(() => {});
        } else {
          alert(dashT('adminShareUnsupported'));
        }
      });
    })
    .catch(() => {})
    .finally(() => {
      clone.remove();
    });
};
function exportAttackCsv() {
  if (!state.dashData?.attacks?.length) return;
  const attacks = Array.isArray(state._lastRenderedAttacks)
    ? state._lastRenderedAttacks
    : state.dashData.attacks;
  let csv =
    'Start Time (Game Time),End Time (Game Time),Structure,Level,Player Name,Rank,Demolition Value\n';
  attacks.forEach((a) => {
    const date = displayGameTime(a.game_time);
    const start = a.start_time ? a.start_time.replace(/"/g, '""') : '';
    const target = getDatasetStructureTarget(a);
    (a.players || []).forEach((p) => {
      const safeName = p.name.replace(/"/g, '""');
      csv += `"${start}","${date}","${target.structure_name}","${target.structure_level}","${safeName}",${p.rank},${p.value}\n`;
    });
  });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = 'vts_attack_details.csv';
  a.click();
}

function attackPlayers(attack) {
  return Array.isArray(attack?.players) ? attack.players : [];
}

function buildSerializablePlayerSummary(attacks) {
  return buildPlayerSummary(attacks).map((player) => {
    const uniqueCount = player.unique_structures_count ?? player.unique_structures?.size ?? 0;
    const { unique_structures, ...serializable } = player;
    return {
      ...serializable,
      unique_structures_count: uniqueCount,
    };
  });
}

function refreshDashboardPlayerSummary() {
  if (!state.dashData) return;
  state.dashData.players_summary = buildSerializablePlayerSummary(state.dashData.attacks || []);
}

function downloadCsv(csv, filename) {
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
    link.remove();
  }, 0);
}

function safeCsvFilename(name) {
  return (
    String(name || 'player')
      .normalize('NFKD')
      .replace(/[^\p{L}\p{N}]+/gu, '_')
      .replace(/^_+|_+$/g, '') || 'player'
  );
}

function exportDebugCsv() {
  if (!state.dashData?.attacks?.length) return;
  let csv =
    'Attack ID,Start Time (Game Time),End Time (Game Time),Structure,Level,Raw Name,Grouped Name (Master),Demolition Value,Rank\n';
  state.dashData.attacks.forEach((a) => {
    const date = displayGameTime(a.game_time);
    const start = a.start_time ? a.start_time.replace(/"/g, '""') : '';
    const target = getDatasetStructureTarget(a);
    const players = attackPlayers(a);
    players.forEach((p) => {
      const rawName = p.name.replace(/"/g, '""');
      const groupedName = resolvePlayerNameForAttack(p, players).replace(/"/g, '""');
      csv += `"${a.id}","${start}","${date}","${target.structure_name}","${target.structure_level}","${rawName}","${groupedName}",${p.value},${p.rank}\n`;
    });
  });
  downloadCsv(csv, `vts_debug_export_${new Date().getTime()}.csv`);
}

// Banner/Pather duty-record debug export. Mirrors exportDebugCsv so the same weekly
// name-dedup loop applies to Viber-sourced duty data. Shows Raw -> Cleaned -> Grouped.
function exportDutyDebugCsv() {
  const records = Array.isArray(state.dutyRecords) ? state.dutyRecords : [];
  if (!records.length) return;
  const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  let csv =
    'Date,Type,Upload ID,Raw Name,Cleaned Name,Grouped Name (Master),Operator/Banner Note,Confirmed Name,Match Status,Target,Group,Time\n';
  records.forEach((rec) => {
    const entries = Array.isArray(rec.entries) ? rec.entries : [];
    entries.forEach((e) => {
      const raw = e.name || e.original || '';
      csv +=
        [
          q(rec.date),
          q(rec.type),
          q(rec.id || rec.createdAt || ''),
          q(raw),
          q(cleanDutyRawName(raw)),
          q(resolveDutyPlayerName(raw)),
          q(getDutyOperatorNote(raw)),
          q(e.confirmed || ''),
          q(e.status || ''),
          q(e.target),
          q(e.group),
          q(e.usageTime || rec.gameTime || ''),
        ].join(',') + '\n';
    });
  });
  downloadCsv(csv, `vts_duty_debug_export_${new Date().getTime()}.csv`);
}
function importData(file) {
  const r = new FileReader();
  r.onload = (e) => {
    try {
      const imp = JSON.parse(e.target.result);
      if (!imp.attacks) throw 'Invalid';
      const m = {};
      (state.dashData?.attacks || []).forEach((a) => (m[a.id] = a));
      (imp.attacks || []).forEach((a) => (m[a.id] = a));
      const sorted = Object.values(m).sort((a, b) => b.game_time.localeCompare(a.game_time));
      saveData({
        last_updated: fmtDate(new Date()),
        total_attacks: sorted.length,
        attacks: sorted,
        players_summary: buildSerializablePlayerSummary(sorted),
      });
      render();
      logDashboardEvent('adminLogImportSuccessful', 'success', {}, { source: 'import' });
    } catch (err) {
      alert(dashT('adminImportFailed'));
    }
  };
  r.readAsText(file);
}

// --- Render ---

function scheduleAdminLanguageRefresh() {
  const token = (state._adminLanguageRefreshToken || 0) + 1;
  state._adminLanguageRefreshToken = token;
  refreshRosterSnapshotLabel();
  renderCloudSyncStatus();
  renderAdminActivityTerminal();
  setAdminLogSyncStatus(adminLogSyncState);
  if (allStarBohAdminI18n?.loadAdminAllStarBohLocale) {
    void Promise.all([
      allStarBohAdminI18n.loadAdminAllStarBohLocale(getDashboardLang()),
      allStarBohResearchI18n?.loadResearchLocale?.(getDashboardLang()),
    ]).then(() => allStarBohController?.refreshLanguage?.(allStarBohAdminT, getDashboardLang()));
  } else {
    allStarBohController?.refreshLanguage?.(allStarBohAdminT, getDashboardLang());
  }
  allianceViewController?.refreshLanguage?.(dashT);
  requestAnimationFrame(() => {
    if (state._adminLanguageRefreshToken !== token) return;
    renderDashboardSubtab();
  });
}

export async function bootOcrDashboard() {
  if (state._booted) return;
  state._booted = true;
  bindAdminEditGuard();
  loadRoster();
  if (!state._adminLanguageRefreshBound) {
    state._adminLanguageRefreshBound = true;
    window.addEventListener('vts:admin-language-change', scheduleAdminLanguageRefresh);
  }
  const loginForm = $id('dashLoginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', (event) => {
      event.preventDefault();
      doLogin();
    });
  } else {
    $id('dashLoginBtn').onclick = doLogin;
  }
  $id('dashSignOutBtn')?.addEventListener('click', doSignOut);
  const loginUser = $id('dashLoginUser');
  if (loginUser && !loginUser.value) loginUser.value = '1097';
  bindSubtabNavigation();
  bindEdenWorkspaceStrip();
  bindConductControls();
  bindExGuildControls();
  loadRosterSnapshots();
  loadBannerRecords();
  loadDutyRecords();
  loadContributionRecords();
  loadExGuildContributions();
  loadPlayerRegistry();
  loadAllianceList();
  loadRosterAuth();
  mountStructureUploadPanel();
  // Keep log panel always visible
  const logArea = $id('dashLogArea');
  if (logArea) logArea.classList.remove('hidden');
  restoreLogs();
  bindAdminLogControls();
  bindSubtabNavigation();
  bindConductControls();
  $id('dashRefreshBtn').onclick = async () => {
    if (!prepareForManualDashboardRefresh()) return;
    setRefreshBusy(true);
    try {
      await Promise.allSettled([
        loadData({ preferCloudFirst: state.adminIsAdmin === true }),
        state.adminIsAdmin === true
          ? runDashboardCloudTaskWithTimeout(
              'Bonus team effort points cloud load',
              loadConductAdjustmentsForSeason,
              DASHBOARD_CLOUD_BOOT_TIMEOUT_MS,
              { optional: true }
            )
          : loadConductAdjustmentsForSeason(),
        state.adminIsAdmin === true
          ? runDashboardCloudTaskWithTimeout(
              'Roster snapshot cloud load',
              loadRosterSnapshotsFromFirestore,
              DASHBOARD_CLOUD_BOOT_TIMEOUT_MS,
              { optional: true }
            )
          : Promise.resolve(null),
      ]);
      if (state.adminIsAdmin === true) {
        await runDashboardCloudTaskWithTimeout(
          'Queued cloud sync',
          flushDashboardCloudRetryQueue,
          Math.min(DASHBOARD_CLOUD_BOOT_TIMEOUT_MS, DASHBOARD_CLOUD_WRITE_TIMEOUT_MS)
        );
      }
      // Let the busy state paint before the heavy synchronous dashboard
      // render; without this the page appears frozen with no feedback.
      await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));
      render();
    } catch (e) {
      console.error('Refresh failed:', e);
    } finally {
      setRefreshBusy(false);
    }
  };
  logDashboardEvent('adminLogDashboardLoaded', 'info', {}, { source: 'system' });
  const initializeAdminSession = async () => {
    if (isLocalAdminTestBypass()) {
      state.adminUser = { uid: 'local-test-admin' };
      state.adminIsAdmin = false;
      try {
        await openAdminDashboardAfterAuth({ preferCloudFirst: false });
      } catch (e) {
        console.error('Local admin test dashboard load failed during boot', e);
      }
      return;
    }

    showConnecting(dashT('adminConnectingInit'));
    try {
      const configured = await ensureDashboardCloudInitialized();
      if (configured) {
        const { onUserChanged, getCurrentUser, isAdminAuthUser, waitForAuthReady } =
          await loadFirebaseApi();
        await waitForAuthReady();
        if (!state._adminAuthUnsub) {
          state._adminAuthUnsub = onUserChanged(async (user) => {
            // An explicit sign-out is in progress: never try to restore the
            // session or reopen the dashboard (that caused the auto re-login).
            if (state._signingOut) {
              state.adminUser = null;
              state.adminIsAdmin = false;
              showLogin();
              return;
            }
            if (!user) {
              const restoredUser = await waitForAdminAuthUser(1500);
              if (restoredUser && !state._signingOut) {
                state.adminUser = restoredUser;
                state.adminIsAdmin = true;
                await openAdminDashboardAfterAuth({ preferCloudFirst: true });
                return;
              }
              state.adminUser = null;
              state.adminIsAdmin = false;
              showLogin();
              return;
            }
            try {
              const wasAdmin = state.adminIsAdmin === true;
              const candidateIsAdmin = await isAdminAuthUser(user);
              if (!candidateIsAdmin) {
                const restoredUser = wasAdmin ? await waitForAdminAuthUser(1500) : null;
                if (restoredUser) {
                  state.adminUser = restoredUser;
                  state.adminIsAdmin = true;
                  await openAdminDashboardAfterAuth({ preferCloudFirst: true });
                  return;
                }
                setLoginError(dashT('adminCloudAdminRequired'));
                showLogin();
                return;
              }
              state.adminUser = user;
              state.adminIsAdmin = true;
              await openAdminDashboardAfterAuth({ preferCloudFirst: true });
            } catch (e) {
              console.error('Admin auth listener failed', e);
              state.adminUser = null;
              state.adminIsAdmin = false;
              setLoginError(describeAdminAuthError(e));
              showLogin();
            }
          });
        }
        const restoredUser = await waitForAdminAuthUser(1500);
        const currentUser = restoredUser || getCurrentUser();
        if (currentUser && (await isAdminAuthUser(currentUser))) {
          state.adminUser = currentUser;
          state.adminIsAdmin = true;
          await openAdminDashboardAfterAuth({ preferCloudFirst: true });
        }
      } else {
        setLoginError(dashT('adminLoginFirebaseUnavailable'));
      }
    } catch (e) {
      console.error('Admin auth boot failed', e);
      setLoginError(describeAdminAuthError(e));
      showLogin();
    }
  };
  const rosterBtn = $id('dashRosterBtn');
  if (rosterBtn) rosterBtn.onclick = showRosterModal;
  const expBtn = $id('dashRosterExportBtn');
  if (expBtn) expBtn.onclick = exportRosterCSV;
  bindSubtabNavigation();
  bindConductControls();

  // Roster: manual snapshot button with dynamic day name
  const newSnapBtn = $id('dashRosterSnapshotBtn');
  if (newSnapBtn) {
    refreshRosterSnapshotLabel();
    newSnapBtn.onclick = () => {
      const prevText = state.rosterSnapshots.length
        ? state.rosterSnapshots[state.rosterSnapshots.length - 1].members.join('\n')
        : '';
      const input = prompt(dashT('adminRosterPastePrompt'), prevText);
      if (input !== null && input.trim()) takeRosterSnapshot(input);
    };
  }

  // Ã¢â€â‚¬Ã¢â€â‚¬ API status watcher Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  let ocrReady = false;
  let lastLoggedOcrStatusKey = '';
  function summarizeOcrStatusReason(reason) {
    const text = String(reason || '').trim();
    if (!text) return dashT('adminOcrConfigureWorker');
    if (
      /VITE_RECAPTCHA_SITE_KEY|site key is missing|recaptcha enterprise site key is missing/i.test(
        text
      )
    )
      return dashT('adminOcrUnavailable');
    if (/debug token/i.test(text)) return dashT('adminOcrUnavailable');
    if (/app ?check|appcheck|recaptcha/i.test(text)) return dashT('adminOcrUnavailable');
    if (/origin not allowed|allowed_origins|not currently allowed/i.test(text))
      return dashT('adminOcrOriginBlockedError', { origin: window.location.origin });
    if (/dashscope_api_key/i.test(text)) return dashT('adminOcrConfigureWorker');
    if (/worker status\s+40[13]|unauthorized|forbidden/i.test(text))
      return dashT('adminOcrWorkerPermissionError');
    return text.length > 64 ? `${text.slice(0, 61)}...` : text;
  }

  function currentOcrStatusReason() {
    const statusEl =
      $id('dashOcrServiceStatus') || $id('dashApiUploadStatus') || $id('dashRosterApiStatus');
    return (
      statusEl?.dataset?.errorDetail ||
      statusEl?.getAttribute?.('aria-label') ||
      dashT('adminOcrConfigureWorker')
    );
  }

  function setInlineStatus(id, message, type = 'error') {
    const el = $id(id);
    if (!el) return;
    el.className = `dash-upload-status ${type}`;
    el.textContent = message;
    el.classList.remove('hidden');
  }

  function clearInlineStatus(id) {
    const el = $id(id);
    if (!el) return;
    el.classList.add('hidden');
    el.textContent = '';
  }

  function showOcrBlockedFeedback(options = {}) {
    const reason = currentOcrStatusReason();
    const summary = summarizeOcrStatusReason(reason);
    const detail = summary && summary !== reason ? `${summary}: ${reason}` : summary;
    const message = `${dashT('adminOcrUnavailable')} - ${detail}`;
    if (options.statusId) setInlineStatus(options.statusId, message, 'error');
    if (typeof window.showToast === 'function') {
      window.showToast(`${dashT('adminOcrUnavailable')}: ${summary}`, 'error', 5000);
    }
  }

  async function updateApiStatus(options = {}) {
    const result = await checkOcrService(options);
    ocrReady = result.configured === true;
    const els = [
      {
        id: 'dashRosterApiStatus',
        zone: 'dashRosterUploadZone',
        drop: 'dashRosterDropZone',
        input: 'dashRosterFileInput',
      },
      {
        id: 'dashApiUploadStatus',
        zone: 'dashUploadZone',
        drop: 'dashDropZone',
        input: 'dashFileInput',
      },
      { id: 'dashOcrServiceStatus' },
    ];
    els.forEach(({ id, zone, drop, input }) => {
      const statusEl = $id(id);
      const dropEl = $id(drop);
      const inputEl = $id(input);
      if (!statusEl) return;
      if (ocrReady) {
        statusEl.className = 'dash-roster-api-status dash-api-ok';
        statusEl.removeAttribute('title');
        statusEl.setAttribute('aria-label', dashT('adminOcrServiceReady'));
        delete statusEl.dataset.errorDetail;
        statusEl.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg> ${esc(dashT('adminOcrServiceReady'))}`;
        if (dropEl) {
          dropEl.style.opacity = '1';
          dropEl.style.pointerEvents = '';
        }
        if (inputEl) inputEl.disabled = false;
      } else {
        statusEl.className = 'dash-roster-api-status dash-api-missing';
        const reason = result.error || dashT('adminOcrConfigureWorker');
        statusEl.removeAttribute('title');
        statusEl.setAttribute('aria-label', `${dashT('adminOcrUnavailable')}: ${reason}`);
        statusEl.dataset.errorDetail = reason;
        statusEl.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> <b>${esc(dashT('adminOcrUnavailable'))}</b><span class="dash-api-reason">${esc(summarizeOcrStatusReason(reason))}</span>`;
        if (dropEl) {
          dropEl.style.opacity = '0.5';
          dropEl.style.pointerEvents = 'none';
        }
        if (inputEl) inputEl.disabled = true;
      }
    });
    const reason = result.error || dashT('adminOcrConfigureWorker');
    const statusKey = ocrReady ? 'ready' : `unavailable:${reason}`;
    if (options.forceLog === true || statusKey !== lastLoggedOcrStatusKey) {
      lastLoggedOcrStatusKey = statusKey;
      if (ocrReady) {
        logDashboardEvent('adminOcrServiceReady', 'success', {}, { source: 'ocr' });
      } else {
        logDashboardEvent(
          'adminOcrUnavailable',
          'warn',
          {},
          {
            source: 'ocr',
            localOnly: true,
          }
        );
      }
    }
    return ocrReady;
  }
  function canUseOcr(options = {}) {
    if (ocrReady) return true;
    showOcrBlockedFeedback(options);
    updateApiStatus({ forceLog: true, verifyAppCheckToken: true }).then((ready) => {
      if (!ready) showOcrBlockedFeedback(options);
    });
    return false;
  }

  function bindExGuildControls() {
    const exGuildPasteBtn = $id('dashExGuildPasteBtn');
    const exGuildUploadBtn = $id('dashExGuildUploadBtn');
    const exGuildInput = $id('dashExGuildFileInput');
    if (exGuildPasteBtn) exGuildPasteBtn.onclick = showExGuildPasteForm;
    if (exGuildUploadBtn && exGuildInput) {
      exGuildUploadBtn.onclick = () => {
        if (!canUseOcr({ statusId: 'dashContributionStatus' })) return;
        exGuildInput.value = '';
        exGuildInput.click();
      };
      exGuildUploadBtn.onkeydown = (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        if (!canUseOcr({ statusId: 'dashContributionStatus' })) return;
        exGuildInput.value = '';
        exGuildInput.click();
      };
      exGuildInput.onchange = () => {
        const files = Array.from(exGuildInput.files || []);
        exGuildInput.value = '';
        if (files.length) processContributionImages(files, 'exguild');
      };
    }
  }

  // OCR readiness is checked after the interactive dashboard/session is ready
  // so App Check and the Worker probe cannot compete with initial controls.
  const apiSaveBtn = $id('dashSaveApiBtn');
  if (apiSaveBtn)
    apiSaveBtn.addEventListener('click', () =>
      updateApiStatus({ verifyAppCheckToken: true, forceLog: true })
    );

  // Roster: image upload
  const rosterZone = $id('dashRosterUploadZone');
  const rosterDrop = $id('dashRosterDropZone');
  const rosterInput = $id('dashRosterFileInput');
  if (rosterDrop && rosterInput) {
    rosterDrop.onclick = () => {
      if (!canUseOcr()) return;
      rosterInput.value = '';
      rosterInput.click();
    };
    rosterDrop.ondragover = (e) => {
      e.preventDefault();
      rosterDrop.classList.add('dragover');
    };
    rosterDrop.ondragleave = () => rosterDrop.classList.remove('dragover');
    rosterDrop.ondrop = (e) => {
      e.preventDefault();
      rosterDrop.classList.remove('dragover');
      if (!canUseOcr()) return;
      if (e.dataTransfer.files.length) processRosterImages(e.dataTransfer.files);
    };
    rosterInput.onchange = () => {
      const files = Array.from(rosterInput.files || []);
      rosterInput.value = '';
      if (files.length) processRosterImages(files);
    };
    rosterInput.oninput = rosterInput.onchange;
  }

  const newBannerBtn = $id('dashBannerAddBtn');
  if (newBannerBtn) newBannerBtn.onclick = () => showBannerForm();
  function bindDutyUpload(type, pasteBtnId, uploadBtnId, dropId, inputId) {
    const pasteBtn = $id(pasteBtnId);
    const uploadBtn = uploadBtnId ? $id(uploadBtnId) : null;
    const drop = dropId ? $id(dropId) : null;
    const input = inputId ? $id(inputId) : null;
    if (pasteBtn) pasteBtn.onclick = () => showDutyPasteForm(type);
    const openDutyImagePicker = () => {
      if (!input) return;
      if (!canUseOcr()) return;
      input.value = '';
      input.click();
    };
    if (uploadBtn && input) uploadBtn.onclick = openDutyImagePicker;
    if (drop && input) {
      drop.onclick = (event) => {
        if (event.target?.tagName === 'INPUT') return;
        openDutyImagePicker();
      };
      drop.onkeydown = (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        openDutyImagePicker();
      };
      drop.ondragover = (event) => {
        event.preventDefault();
        drop.classList.add('dragover');
      };
      drop.ondragleave = () => drop.classList.remove('dragover');
      drop.ondrop = (event) => {
        event.preventDefault();
        drop.classList.remove('dragover');
        if (!canUseOcr()) return;
        if (event.dataTransfer.files.length) processDutyImages(type, event.dataTransfer.files);
      };
      input.onchange = () => {
        const files = Array.from(input.files || []);
        input.value = '';
        if (files.length) processDutyImages(type, files);
      };
      input.oninput = input.onchange;
    }
  }
  bindDutyUpload(
    'banner',
    'dashBannerListPasteBtn',
    'dashBannerListUploadBtn',
    'dashBannerListDropZone',
    'dashBannerListFileInput'
  );
  bindDutyUpload(
    'pather',
    'dashPatherListPasteBtn',
    'dashPatherListUploadBtn',
    'dashPatherListDropZone',
    'dashPatherListFileInput'
  );
  bindDutyUpload('shield_wall', 'dashShieldWallPasteBtn', null, null, null);
  const contributionPasteBtn = $id('dashContributionPasteBtn');
  const contributionUploadBtn = $id('dashContributionUploadBtn');
  const contributionExportBtn = $id('dashContributionExportBtn');
  const contributionDrop = $id('dashContributionDropZone');
  const contributionInput = $id('dashContributionFileInput');
  let contributionPickerPending = false;
  let contributionSelectionHandledAt = 0;
  let contributionNoSelectionTimer = 0;
  function clearContributionNoSelectionTimer() {
    if (!contributionNoSelectionTimer) return;
    window.clearTimeout(contributionNoSelectionTimer);
    contributionNoSelectionTimer = 0;
  }
  function showContributionNoSelectionStatus() {
    contributionNoSelectionTimer = 0;
    if (!contributionPickerPending) return;
    const files = Array.from(contributionInput?.files || []);
    if (files.length) {
      contributionPickerPending = false;
      contributionInput.value = '';
      clearInlineStatus('dashContributionStatus');
      processContributionImages(files);
      return;
    }
    contributionPickerPending = false;
    setInlineStatus(
      'dashContributionStatus',
      dashT('adminContributionNoImageSelectedStatus'),
      'warn'
    );
    logDashboardEvent('adminContributionNoImageSelectedStatus', 'warn', {}, { source: 'ocr' });
  }
  function scheduleContributionNoSelectionStatus() {
    clearContributionNoSelectionTimer();
    contributionNoSelectionTimer = window.setTimeout(showContributionNoSelectionStatus, 1500);
  }
  function startContributionImagePicker(event, options = {}) {
    if (!canUseOcr({ statusId: 'dashContributionStatus' })) {
      event?.preventDefault?.();
      contributionPickerPending = false;
      return false;
    }
    clearContributionNoSelectionTimer();
    contributionPickerPending = true;
    contributionInput.value = '';
    setInlineStatus(
      'dashContributionStatus',
      dashT('adminContributionOpeningPickerStatus'),
      'info'
    );
    logDashboardEvent('adminContributionOpeningPickerStatus', 'info', {}, { source: 'ocr' });
    if (options.programmatic === true) contributionInput.click();
    return true;
  }
  if (contributionPasteBtn) contributionPasteBtn.onclick = showContributionPasteForm;
  if (contributionExportBtn) contributionExportBtn.onclick = () => exportContributionRecords();
  if (contributionUploadBtn && contributionInput) {
    contributionUploadBtn.onclick = (event) => {
      const isNativeLabelTrigger = contributionUploadBtn.tagName === 'LABEL';
      startContributionImagePicker(event, { programmatic: !isNativeLabelTrigger });
    };
    contributionUploadBtn.onkeydown = (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      startContributionImagePicker(event, { programmatic: true });
    };
  }
  if (contributionDrop && contributionInput) {
    contributionDrop.onclick = (event) => {
      if (event.target?.tagName === 'INPUT') return;
      startContributionImagePicker(event, { programmatic: true });
    };
    contributionDrop.onkeydown = (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      startContributionImagePicker(event, { programmatic: true });
    };
    contributionDrop.ondragover = (event) => {
      event.preventDefault();
      contributionDrop.classList.add('dragover');
    };
    contributionDrop.ondragleave = () => contributionDrop.classList.remove('dragover');
    contributionDrop.ondrop = (event) => {
      event.preventDefault();
      contributionDrop.classList.remove('dragover');
      if (!canUseOcr({ statusId: 'dashContributionStatus' })) return;
      clearInlineStatus('dashContributionStatus');
      if (event.dataTransfer.files.length) processContributionImages(event.dataTransfer.files);
    };
    function handleContributionFileSelection(event) {
      const files = Array.from(contributionInput.files || []);
      if (!files.length && event?.type === 'input') return;
      const now = Date.now();
      if (!files.length && now - contributionSelectionHandledAt < 1000) return;
      contributionSelectionHandledAt = now;
      if (files.length) {
        clearContributionNoSelectionTimer();
        contributionPickerPending = false;
        contributionInput.value = '';
        clearInlineStatus('dashContributionStatus');
        processContributionImages(files);
      } else {
        scheduleContributionNoSelectionStatus();
      }
    }
    contributionInput.onchange = handleContributionFileSelection;
    contributionInput.oninput = handleContributionFileSelection;
    contributionInput.oncancel = () => {
      if (!contributionPickerPending) return;
      scheduleContributionNoSelectionStatus();
    };
  }
  bindEdenX1VoteAdminControls();
  $id('dashExportMenuBtn').onclick = (e) => {
    e.stopPropagation();
    $id('dashExportMenu').classList.toggle('active');
  };
  window.addEventListener('click', () => $id('dashExportMenu').classList.remove('active'));

  $id('dashExpCsv').onclick = exportToCsv;
  $id('dashExpAttackCsv').onclick = exportAttackCsv;
  const dashExpDebug = $id('dashExpDebugCsv');
  if (dashExpDebug) dashExpDebug.onclick = exportDebugCsv;
  const dashExpDutyDebug = $id('dashExpDutyDebugCsv');
  if (dashExpDutyDebug) dashExpDutyDebug.onclick = exportDutyDebugCsv;
  const dashExpWeighted = $id('dashExpWeightedCsv');
  if (dashExpWeighted) dashExpWeighted.onclick = exportWeightedContributionCsv;
  const dashExpAllData = $id('dashExpAllDataCsv');
  if (dashExpAllData) dashExpAllData.onclick = exportAdminAllDataCsv;
  $id('dashExpPdf').onclick = () => window.print();
  $id('dashExpPng').onclick = exportToPng;
  $id('dashExpJson').onclick = exportData;
  const dashExpDebugJson = $id('dashExpDebugJson');
  if (dashExpDebugJson) dashExpDebugJson.onclick = exportAdminDebugJson;
  const chartBtn = $id('dashExportChartBtn');
  if (chartBtn) chartBtn.onclick = exportChartPng;
  const shareBtn = $id('dashShareChartBtn');
  if (shareBtn) shareBtn.onclick = window.shareChartImage;
  $id('dashImportBtn').onclick = () => {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = '.json';
    inp.onchange = () => {
      if (inp.files.length) importData(inp.files[0]);
    };
    inp.click();
  };

  try {
    localStorage.removeItem('qwen_api_key');
  } catch (e) {}

  $id('dashClearDataBtn').onclick = async () => {
    if (!CLEAR_HASH) {
      alert(dashT('adminOverrideUnavailable'));
      return;
    }
    const code = prompt(dashT('adminOverrideCodePrompt'));
    if (!code) return;
    const h = await sha256(code);
    if (h === CLEAR_HASH) clearData();
    else alert(dashT('adminOverrideInvalidCode'));
  };

  $id('dashModalClose').onclick = closeModal;
  $id('dashSearch').oninput = (e) => {
    state.searchQ = e.target.value;
    scheduleDashboardRender();
  };
  $id('dashLeaderFilter').onchange = () => {
    state.structureFilterKey = '';
    state.leaderLimit = 20;
    render();
  };
  const tFilter = $id('dashTimeFilter');
  if (tFilter)
    tFilter.onchange = () => {
      state.timeFilter = tFilter.value || 'all';
      state.structureFilterKey = '';
      state.leaderLimit = 20;
      const leaderFilter = $id('dashLeaderFilter');
      if (leaderFilter) leaderFilter.value = '';
      render();
    };
  if (tFilter) state.timeFilter = tFilter.value || state.timeFilter || 'all';
  $id('dashAttackSearch').oninput = (e) => {
    state.attackSearchQ = e.target.value;
    scheduleDashboardRender();
  };
  $id('ocrDashboardRoot')?.addEventListener('click', (event) => {
    const th = event.target.closest('th[data-sort]');
    if (!th) return;
    const c = th.dataset.sort;
    state.sortDir = state.sortCol === c ? (state.sortDir === 'desc' ? 'asc' : 'desc') : 'desc';
    state.sortCol = c;
    state.leaderLimit = 20;
    render();
  });
  state.leaderPageSize = window.matchMedia?.('(min-width: 1200px)').matches ? 40 : 20;

  const zone = $id('dashUploadZone'),
    drop = $id('dashDropZone'),
    inp = $id('dashFileInput');
  zone.classList.remove('hidden'); // Restore old visibility
  $id('dashUploadBtn').onclick = () => switchDashSubtab('uploadStructures');
  const cancelBtn = $id('dashCancelOcrBtn');
  if (cancelBtn) {
    cancelBtn.onclick = () => {
      state._ocrCancelRequested = true;
      state._ocrAbortController?.abort?.();
      logDashboardEvent('adminLogOcrCancelling', 'warn', {}, { source: 'ocr' });
    };
  }
  const openStructureImagePicker = () => {
    if (!canUseOcr()) return;
    inp.value = '';
    inp.click();
  };
  drop.onclick = openStructureImagePicker;
  drop.onkeydown = (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    openStructureImagePicker();
  };
  drop.ondragover = (e) => {
    e.preventDefault();
    drop.classList.add('dragover');
  };
  drop.ondragleave = () => drop.classList.remove('dragover');
  drop.ondrop = (e) => {
    e.preventDefault();
    drop.classList.remove('dragover');
    if (!canUseOcr()) return;
    if (e.dataTransfer.files.length) processFiles(e.dataTransfer.files);
  };
  inp.onchange = () => {
    const files = Array.from(inp.files || []);
    inp.value = '';
    if (files.length) processFiles(files);
  };
  inp.oninput = inp.onchange;

  // Bind every control before auth/cache restoration can reveal the app. Hidden
  // feature tabs render on first activation through renderDashboardSubtab().
  await initializeAdminSession();
  void updateApiStatus();
}

window.deleteAttack = async function (attId) {
  const pwd = prompt(dashT('adminDeleteAttackPasswordPrompt'));
  if (pwd === null) return;
  const hash = await sha256(pwd);
  if (!DELETE_HASHES.size || !DELETE_HASHES.has(hash)) {
    alert(dashT('adminIncorrectPassword'));
    return;
  }
  if (!attId || !state._booted || !state.dashData) return;
  const removed = state.dashData.attacks.find((attack) => attack.id === attId);
  if (!removed) return;
  const result = await saveDashboardAttackMutation({
    type: 'delete',
    attackId: attId,
    expectedFingerprint: dashboardAttackFingerprint(removed),
  });
  if (!result.ok) return;
  render();
  closeModal();
  if (result.applied) logDashboardEvent('adminLogAttackDeleted', 'warn');
  else logDashboardEvent('adminLogAttackAlreadyDeleted', 'warn');
};

window.markAttackComplete = async function (attId) {
  if (!attId || !state._booted || !state.dashData) return;
  const att = state.dashData.attacks.find((a) => a.id === attId);
  if (!att) return;
  att.data_complete_override = true;
  att.data_complete_override_at = new Date().toISOString();
  delete att._validation;
  await saveData(state.dashData);
  render();
  window._overlayStack = Math.max(0, (window._overlayStack || 1) - 1);
  showModal('attack', att);
  logDashboardEvent('adminLogAttackMarkedComplete', 'warn');
};

window.editAttack = async function (attId) {
  if (!attId || !state._booted || !state.dashData) return;
  const att = state.dashData.attacks.find((a) => a.id === attId);
  if (!att) return;
  const expectedFingerprint = dashboardAttackFingerprint(att);
  const newName = prompt(dashT('adminEditStructureNamePrompt'), att.structure_name);
  if (newName === null) return;
  let normalizedTarget = normalizeStructureTarget(newName.trim(), '');
  if (!isNameOnlyStructure(normalizedTarget.structure_name) && !normalizedTarget.structure_level) {
    const newLevel = prompt(dashT('adminEditStructureLevelPrompt'), att.structure_level);
    if (newLevel === null) return;
    normalizedTarget = normalizeStructureTarget(normalizedTarget.structure_name, newLevel.trim());
  }
  const newTime = prompt(dashT('adminEditEndTimePrompt'), att.game_time);
  if (newTime === null) return;
  const newStartTime = prompt(dashT('adminEditStartTimePrompt'), att.start_time || '');
  if (newStartTime === null) return;
  const originalId = att.id;
  const timestamp = String(originalId || '').match(/_(\d{10,})$/)?.[1];
  const nextId = timestamp
    ? `${normalizedTarget.structure_name.replace(/\s+/g, '_')}_${normalizedTarget.structure_level}_${timestamp}`
    : originalId;
  const patch = {
    id: nextId,
    structure_name: normalizedTarget.structure_name,
    structure_level: normalizedTarget.structure_level,
    raw_structure_name: normalizedTarget.structure_name,
    raw_structure_level: normalizedTarget.structure_level,
    display_structure_name: normalizedTarget.structure_name,
    display_structure_level: normalizedTarget.structure_level,
    game_time: newTime.trim(),
    start_time: newStartTime.trim(),
  };
  const result = await saveDashboardAttackMutation({
    type: 'edit',
    attackId: originalId,
    expectedFingerprint,
    patch,
  });
  if (!result.ok) return;
  const savedAttack = state.dashData.attacks.find((attack) => attack.id === nextId);
  render();
  if (savedAttack) showModal('attack', savedAttack);
  logDashboardEvent('adminLogAttackUpdated', 'info');
};

window.addPlayer = async function (attId) {
  if (!attId || !state._booted || !state.dashData) return;
  const att = state.dashData.attacks.find((a) => a.id === attId);
  if (!att) return;
  const pName = prompt(dashT('adminNewPlayerNamePrompt'));
  if (!pName) return;
  const pVal = prompt(dashT('adminPlayerDemolitionPrompt', { player: pName }));
  if (!pVal || isNaN(pVal)) return;

  att.players.push({ name: pName.trim(), value: Number(pVal), rank: 0 });
  att.players.sort((a, b) => b.value - a.value);
  att.players.forEach((p, i) => (p.rank = i + 1));
  att.players_count = att.players.length;
  att.total_demolition = att.players.reduce((sum, p) => sum + (p.value || p.val || 0), 0);
  delete att._validation;

  refreshDashboardPlayerSummary();
  await saveData(state.dashData);
  render();
  showModal('attack', att);
  logDashboardEvent('adminLogPlayerAdded', 'info');
};

window.editPlayer = async function (attId, encName) {
  if (!attId || !state._booted || !state.dashData) return;
  const att = state.dashData.attacks.find((a) => a.id === attId);
  if (!att) return;
  const pName = decodeURIComponent(encName);
  const pIdx = att.players.findIndex((p) => p.name === pName);
  if (pIdx === -1) return;

  const action = prompt(
    dashT('adminEditPlayerValuePrompt', { player: pName }),
    att.players[pIdx].value || att.players[pIdx].val
  );
  if (!action) return;

  if (action.trim().toUpperCase() === 'DELETE') {
    att.players.splice(pIdx, 1);
  } else {
    const pVal = Number(action);
    if (isNaN(pVal)) {
      alert(dashT('adminInvalidValue'));
      return;
    }
    const newName = prompt(dashT('adminEditPlayerNamePrompt'), pName);
    if (newName) att.players[pIdx].name = newName.trim();
    att.players[pIdx].value = pVal;
  }

  att.players.sort((a, b) => b.value - a.value);
  att.players.forEach((p, i) => (p.rank = i + 1));
  att.players_count = att.players.length;
  att.total_demolition = att.players.reduce((sum, p) => sum + (p.value || p.val || 0), 0);
  delete att._validation;

  refreshDashboardPlayerSummary();
  await saveData(state.dashData);
  render();
  showModal('attack', att);
  logDashboardEvent('adminLogPlayerEdited', 'info');
};

window.showPlayer = function (pNameEncoded) {
  if (!state.dashData) return;
  const pName = decodeURIComponent(pNameEncoded);
  const masterName = findBestMatch(pName);
  const playerSummary = buildPlayerSummary(state.dashData.attacks || []);

  // Exact match first (using master name)
  let p = playerSummary.find((x) => x.name === masterName);
  // Fallback to raw name if master fails
  if (!p) p = playerSummary.find((x) => x.name === pName);
  // Fuzzy fallback: case-insensitive + trimmed
  if (!p) {
    const q = pName.trim().toLowerCase();
    p = playerSummary.find((x) => x.name.trim().toLowerCase() === q);
  }
  // Last resort: partial match (handles OCR name variants)
  if (!p) {
    const q = pName.trim().toLowerCase();
    p = playerSummary.find(
      (x) => x.name.toLowerCase().includes(q) || q.includes(x.name.toLowerCase())
    );
  }
  if (p) {
    showModal('player', p);
  } else {
    // Player exists in attack but not aggregated yet Ã¢â‚¬â€ build a minimal view
    const minimalPlayer = {
      name: pName,
      total_demolition: 0,
      participation_count: 0,
      attacks: [],
      _not_in_summary: true,
    };
    showModal('player', minimalPlayer);
  }
};

window.showAttack = function (attId) {
  if (!state.dashData) return;
  const att = state.dashData.attacks.find((a) => a.id === attId);
  if (att) showModal('attack', att);
  else closeModal();
};

window.exportPlayerReport = function (pNameEncoded) {
  if (!state.dashData) return;
  const pName = decodeURIComponent(pNameEncoded);
  const modalPlayer = window._dashCurrentPlayerReport;
  const playerSummary = buildPlayerSummary(state.dashData.attacks || []);
  const p =
    modalPlayer?.name === pName
      ? modalPlayer
      : playerSummary.find((x) => x.name === pName) ||
        playerSummary.find((x) => x.name === findBestMatch(pName));
  if (!p) {
    logDashboardEvent('adminLogPlayerExportEmpty', 'warn', {}, { source: 'export' });
    return;
  }
  let csv = 'Time,Target,Value,Rank\n';
  const sortedAttacks = [...(p.attacks || [])].sort((a, b) =>
    (b.game_time || '').localeCompare(a.game_time || '')
  );
  sortedAttacks.forEach((att) => {
    const time = String(displayGameTime(att.game_time)).replace(/"/g, '""');
    const target = formatDatasetStructureLabel(att).replace(/"/g, '""');
    csv += `"${time}","${target}",${att.val || att.value || 0},${att.rank || ''}\n`;
  });
  downloadCsv(csv, `VTS_Report_${safeCsvFilename(pName)}.csv`);
};

window.rosterLogin = rosterLogin;
window.rosterLogout = rosterLogout;
window.setRosterStatus = setRosterStatus;
window.setRosterAlliance = setRosterAlliance;
window.toggleBulkCheck = toggleBulkCheck;
window.toggleBulkSelectAll = toggleBulkSelectAll;
window.applyBulkStatus = applyBulkStatus;
window.applyBulkAlliance = applyBulkAlliance;
window.copyRosterNames = copyRosterNames;
window.showRosterSnapshotModal = showRosterSnapshotModal;
window.configureAlliances = configureAlliances;
window.deleteRosterSnapshot = deleteRosterSnapshot;
window.showBannerForm = showBannerForm;
window.deleteBannerRecord = deleteBannerRecord;
window.editDutyRecord = editDutyRecord;
window.deleteDutyRecord = deleteDutyRecord;
window.renderDutyRecords = renderDutyRecords;
window.editContributionRecord = editContributionRecord;
window.deleteContributionRecord = deleteContributionRecord;
window.setContributionReward = setContributionReward;
window.setContributionPrimary = setContributionPrimary;
window.exportContributionRecords = exportContributionRecords;
window.renderContributions = renderContributions;
window.deleteExGuildEntry = deleteExGuildEntry;
window.clearExGuildData = clearExGuildData;
window.setExGuildMatch = setExGuildMatch;
window.closeModal = closeModal;
window.renderRoster = renderRoster;
window.setRosterFilter = function (key, val) {
  if (key === 'alliance') state._rosterFilterAlliance = val;
  else if (key === 'status') state._rosterFilterStatus = val;
  else if (key === 'search') state._rosterSearchQ = val;
  renderRoster();
};
