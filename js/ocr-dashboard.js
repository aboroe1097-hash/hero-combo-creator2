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
  buildWeightedContributionRows,
  getWeightedContributionRecordLabel,
  sanitizePublicR5Adjustments,
} from './contribution-weighting.js';
import { compactPlayerIdentity, stripGuildTagsFromPlayerName } from './ocr-name-normalizer.js';
import {
  PLAYER_REGISTRY_KEY,
  normalizePlayerRegistry,
  readStoredPlayerRegistry,
  writeStoredPlayerRegistry,
} from './player-registry.js';
// --- Serverless OCR Dashboard ---
let firebaseApiPromise = null;
let firestoreApiPromise = null;

function loadFirebaseApi() {
  if (!firebaseApiPromise) firebaseApiPromise = import('./firebase.js');
  return firebaseApiPromise;
}

function loadFirestoreApi() {
  if (!firestoreApiPromise) {
    firestoreApiPromise = import('./firebase-sdk.js').then(({ importFirestore }) =>
      importFirestore()
    );
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
  persistLog,
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
state.edenX1Votes = [];
state.edenX1VoteHistory = [];
state.edenX1VoteSettings = null;
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
const DASHBOARD_CLOUD_RETRY_QUEUE_KEY = 'vts_dashboard_cloud_retry_queue';
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
const EDEN_X1_VOTES_COLLECTION_PATH = 'vts_admin/eden_x1_votes/records';
const EDEN_X1_VOTE_HISTORY_COLLECTION_PATH = 'vts_admin/eden_x1_vote_history/records';
const EDEN_X1_VOTE_SETTINGS_DOC_PATH = 'vts_admin/eden_x1_vote_settings';
const EDEN_X1_VOTE_SETTINGS_LOCAL_KEY = 'vts_eden_x1_vote_admin_settings';
const EDEN_X1_TEAM_VOTE_CATEGORY = 'team_players';
let dashboardCloudSaveTimer = null;
let dashboardCloudSaveInFlight = false;
let dashboardCloudSavePendingData = null;
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

function queueDashboardCloudRetry(kind, payload, reason = '') {
  if (!payload || typeof payload !== 'object') return;
  const queue = readDashboardCloudRetryQueue().filter((entry) => entry?.kind !== kind);
  queue.push({
    kind,
    payload,
    reason: String(reason || '').slice(0, 300),
    queuedAt: new Date().toISOString(),
  });
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
    log(`${label} unavailable; showing local dashboard cache.`, 'warn');
    return message;
  }
  return showCloudSyncFailure(err, `${label} failed`);
}

async function runDashboardCloudTaskWithTimeout(
  label,
  task,
  timeoutMs = DASHBOARD_CLOUD_BOOT_TIMEOUT_MS
) {
  try {
    return await withDashboardCloudTimeout(Promise.resolve().then(task), timeoutMs, label);
  } catch (err) {
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
  'last_updated',
  'total_attacks',
  'attacks',
  'players_summary',
  'logs',
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
  if (changed) writeAuxiliaryLocalCaches();
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

function renderAuxiliaryRecords() {
  renderBanners();
  renderDutyRecords();
  renderContributions();
  renderConductAdjustments();
  renderEdenX1VoteAdmin();
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
    const saved = localStorage.getItem('vts_r5_adjustment_season');
    if (saved) return saved;
  } catch (e) {}
  return `season-${new Date().getUTCFullYear()}`;
}

state.r5Season = state.r5Season || getDashboardR5SeasonKey();

function normalizeEdenX1VoteRecord(record = {}) {
  const voterName = String(record.voterName || '').trim();
  const voterKey = String(record.voterKey || compactPlayerIdentity(voterName)).trim();
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

function edenVoteUpdatedAtLabel(record) {
  const raw = record?.updatedAt || record?.createdAt;
  const date =
    typeof raw?.toDate === 'function'
      ? raw.toDate()
      : typeof raw === 'string'
        ? new Date(raw)
        : null;
  if (!date || Number.isNaN(date.getTime())) return 'pending';
  return date.toLocaleString(localStorage.getItem('vts_hero_lang') || 'en', {
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
  };
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
  const setChecked = (id, value) => {
    const input = $id(id);
    if (input) input.checked = Boolean(value);
  };
  setChecked('dashEdenVoteOpenToggle', settings.votingOpen);
  setChecked('dashEdenVoteEditingToggle', settings.allowEditing);
  setChecked('dashEdenVotePublicResultsToggle', settings.showPublicResults);
  setChecked('dashEdenVoteShowNamesToggle', settings.showVoterNames);
  const status = $id('dashEdenVoteSettingsStatus');
  if (status) {
    status.textContent = settings.votingOpen
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

function renderEdenX1VoteResults() {
  const host = $id('dashEdenVoteResults');
  if (!host) return;
  const season = currentEdenVoteSeason();
  const votes = (Array.isArray(state.edenX1Votes) ? state.edenX1Votes : [])
    .map(normalizeEdenX1VoteRecord)
    .filter(
      (vote) =>
        vote.category === EDEN_X1_TEAM_VOTE_CATEGORY &&
        (!season || vote.season === season) &&
        vote.voterName &&
        vote.candidates.length
    );
  if (!votes.length) {
    host.innerHTML = '<div class="dash-empty">No votes yet.</div>';
    return;
  }

  const totals = new Map();
  votes.forEach((vote) => {
    vote.candidates.forEach((candidate) => {
      const key = candidate.candidateKey || compactPlayerIdentity(candidate.candidateName);
      if (!totals.has(key)) {
        totals.set(key, {
          candidateName: candidate.candidateName,
          count: 0,
          voters: new Set(),
          latest: 0,
        });
      }
      const row = totals.get(key);
      row.count += 1;
      row.voters.add(vote.voterKey || vote.voterName);
      row.latest = Math.max(row.latest, edenVoteUpdatedAtMs(vote));
    });
  });
  const totalSelections = votes.reduce((sum, vote) => sum + vote.candidates.length, 0);
  const totalRows = [...totals.values()].sort(
    (a, b) =>
      b.count - a.count || b.latest - a.latest || a.candidateName.localeCompare(b.candidateName)
  );
  const ballotRows = votes
    .slice()
    .sort(
      (a, b) =>
        edenVoteUpdatedAtMs(b) - edenVoteUpdatedAtMs(a) || a.voterName.localeCompare(b.voterName)
    );

  host.innerHTML = `<div class="dash-duty-upload-summary">
    <div class="dash-duty-summary-kpis">
      <div class="dash-duty-summary-kpi"><strong>${totalSelections}</strong><span>votes</span></div>
      <div class="dash-duty-summary-kpi"><strong>${totalRows.length}</strong><span>candidates</span></div>
      <div class="dash-duty-summary-kpi"><strong>${esc(season)}</strong><span>season</span></div>
    </div>
    <div class="dash-duty-summary-table-wrap">
      <h3 class="dash-modal-section-label">${esc(dashT('adminVoteCandidateTotals'))}</h3>
      <table class="dash-duty-summary-table">
        <thead><tr><th>#</th><th>Candidate</th><th>Votes</th><th>Voters</th></tr></thead>
        <tbody>${totalRows
          .map(
            (row, index) => `<tr>
              <td>${index + 1}</td>
              <td><strong class="dash-duty-cell-value">${esc(row.candidateName)}</strong></td>
              <td><span class="dash-duty-cell-value dash-positive">${row.count}</span></td>
              <td><span class="dash-duty-cell-value dash-duty-times">${row.voters.size}</span></td>
            </tr>`
          )
          .join('')}</tbody>
      </table>
    </div>
    <div class="dash-duty-summary-table-wrap">
      <h3 class="dash-modal-section-label">${esc(dashT('adminVoteBallots'))}</h3>
      <table class="dash-duty-summary-table">
        <thead><tr><th>Voter</th><th>Vote</th><th>Updated</th></tr></thead>
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
    snapshot.forEach((docSnap) => votes.push(normalizeEdenX1VoteRecord(docSnap.data())));
    state.edenX1Votes = votes;
    renderEdenX1VoteAdmin();
    return true;
  } catch (err) {
    console.error('EDEN X1 VOTE LOAD ERROR:', err);
    host.innerHTML = `<div class="dash-empty">Vote results could not load: ${esc(err?.message || err || 'unknown error')}</div>`;
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
      host.innerHTML = `<div class="dash-empty">Vote history could not load: ${esc(err?.message || err || 'unknown error')}</div>`;
    }
    showCloudSyncFailure(err, 'Eden X1 vote history load failed');
    return false;
  }
}

async function loadEdenX1VoteSettings() {
  state.edenX1VoteSettings = readLocalEdenX1VoteSettings();
  renderEdenX1VoteSettings();
  if (state.adminIsAdmin !== true) return false;
  try {
    const db = await ensureCloudSyncReady();
    if (!db) return false;
    const { doc, getDoc } = await loadFirestoreApi();
    const snap = await getDoc(doc(db, EDEN_X1_VOTE_SETTINGS_DOC_PATH));
    if (snap.exists()) {
      state.edenX1VoteSettings = normalizeEdenX1VoteSettings(snap.data());
      writeLocalEdenX1VoteSettings(state.edenX1VoteSettings);
      renderEdenX1VoteSettings();
    }
    return true;
  } catch (err) {
    console.error('EDEN X1 VOTE SETTINGS LOAD ERROR:', err);
    return false;
  }
}

async function saveEdenX1VoteSettings(nextSettings) {
  const settings = normalizeEdenX1VoteSettings(nextSettings);
  state.edenX1VoteSettings = settings;
  writeLocalEdenX1VoteSettings(settings);
  renderEdenX1VoteSettings();
  if (state.adminIsAdmin !== true) return false;
  try {
    const db = await ensureCloudSyncReady();
    if (!db) return false;
    const { doc, serverTimestamp, setDoc } = await loadFirestoreApi();
    await setDoc(doc(db, EDEN_X1_VOTE_SETTINGS_DOC_PATH), {
      ...settings,
      updatedAt: serverTimestamp(),
      updatedBy: state.adminUser?.uid || '',
    });
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
}

async function loadEdenX1VoteAdminData() {
  renderEdenX1VoteAdmin();
  await Promise.all([loadEdenX1VoteSettings(), loadEdenX1Votes(), loadEdenX1VoteHistory()]);
  renderEdenX1VoteAdmin();
}

function bindEdenX1VoteAdminControls() {
  if (bindEdenX1VoteAdminControls.bound) return;
  bindEdenX1VoteAdminControls.bound = true;
  $id('dashEdenVoteRefreshBtn')?.addEventListener('click', () => loadEdenX1VoteAdminData());
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
}

function formatSignedPoints(points) {
  const n = Number(points || 0);
  if (!n) return '0';
  return `${n > 0 ? '+' : '-'}${Math.abs(n).toLocaleString()}`;
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
  return date.toLocaleString(localStorage.getItem('vts_hero_lang') || 'en', {
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
      <div class="dash-duty-summary-kpi"><strong>${rows.length}</strong><span>entries</span></div>
      <div class="dash-duty-summary-kpi"><strong>${esc(formatSignedPoints(totalPoints))}</strong><span>points</span></div>
      <div class="dash-duty-summary-kpi"><strong>${bonusRows}</strong><span>bonus</span></div>
      <div class="dash-duty-summary-kpi"><strong>${penaltyRows}</strong><span>penalty</span></div>
      <div class="dash-duty-summary-kpi"><strong>${summaryRows.length}</strong><span>players</span></div>
      <div class="dash-duty-summary-kpi"><strong>${esc(conductCreatedAtLabel(latestRow))}</strong><span>latest</span></div>
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
}

function startConductEdit(id) {
  const record = (state.r5Adjustments || []).find((item) => item.id === id);
  if (!record) return;
  state.r5EditingId = id;
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
          await deleteR5Adjustment(id);
        }
        state.r5Adjustments = (state.r5Adjustments || []).filter((record) => record.id !== id);
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

async function loadConductAdjustmentsForSeason() {
  state.r5Season = state.r5Season || getDashboardR5SeasonKey();
  if (state.cloudSyncConfigured === false) {
    state.r5Adjustments = loadLocalR5Adjustments(state.r5Season);
    renderConductAdjustments();
    return;
  }
  if (!state.adminIsAdmin && !hasLocalConductAdjustments()) return;
  try {
    state.r5Adjustments = await loadR5Adjustments(state.r5Season);
    renderConductAdjustments();
  } catch (err) {
    showCloudSyncFailure(err, 'Conduct adjustments load failed');
  }
}

async function savePublicConductSnapshot() {
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
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const player = $id('dashConductPlayer');
    const selected = player?.selectedOptions?.[0];
    const categoryKey = $id('dashConductCategory')?.value || 'merit_other';
    const points = $id('dashConductPoints')?.value;
    const note = $id('dashConductNote')?.value || '';
    let playerKey = player?.value || '';
    let playerName = selected?.dataset.playerName || selected?.textContent || '';
    if (playerKey === CONDUCT_MANUAL_PLAYER_VALUE) {
      const manualName = ($id('dashConductManualPlayerInput')?.value || '').trim();
      if (!manualName) {
        setConductStatus(dashT('adminConductNoPlayers'), 'warn');
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
          await updateR5Adjustment(state.r5EditingId, patch);
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
  if (dashboardRenderFrame) return;
  const run = () => {
    dashboardRenderFrame = 0;
    render();
    renderAuxiliaryRecords();
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
    log(dashT('adminCloudLocalCache'), 'warn');
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
  const { getCurrentUser, isPasswordAuthUser, onUserChanged } = await loadFirebaseApi();
  if (await isPasswordAuthUser(state.adminUser, options)) return state.adminUser;
  const currentUser = getCurrentUser();
  if (await isPasswordAuthUser(currentUser, options)) return currentUser;

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
      Promise.resolve(isPasswordAuthUser(user, options))
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
  const { getCurrentUser, getDb, isPasswordAuthUser } = await loadFirebaseApi();
  const db = getDb();
  if (!db) return null;
  // Validate the SAME account we hand back to callers. state.adminUser is the
  // session whose token Firestore actually uses; prefer it because a token
  // refresh can transiently blank getCurrentUser()'s providerData, which sends
  // the password check down a flaky network path (getIdTokenResult) that can
  // wrongly report "not password" on a slow/cold connection.
  let currentUser = null;
  if (await isPasswordAuthUser(state.adminUser)) {
    currentUser = state.adminUser;
  } else {
    const liveUser = getCurrentUser();
    if (await isPasswordAuthUser(liveUser)) currentUser = liveUser;
  }
  if (!currentUser && state.adminIsAdmin === true) {
    const waited = await waitForAdminAuthUser(4000);
    if (await isPasswordAuthUser(waited)) currentUser = waited;
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

window.getVtsAdminFirestoreContext = async function () {
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
function switchDashSubtab(name) {
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
  if (name === 'analytics') {
    render();
    animateAnalyticsCards();
  } else {
    state._analyticsAnimated = false;
  }
  if (name === 'roster') renderRoster();
  if (name === 'banners') renderBanners();
  if (name === 'banners' || name === 'pathers' || name === 'speedTiles' || name === 'shieldWall')
    renderDutyRecords();
  if (name === 'contributions') {
    renderContributions();
  }
  if (name === 'edenVotes') {
    renderEdenX1VoteAdmin();
    if (state.adminIsAdmin === true) loadEdenX1VoteAdminData();
  }
  if (name === 'conduct') renderConductAdjustments();
}
window.switchDashSubtab = switchDashSubtab;
window.seedDashboardForSmokeTest = function (dashData, rosterSnapshots = []) {
  state.dashData = normalizeDashboardDataForCache(dashData);
  state.rosterSnapshots = Array.isArray(rosterSnapshots) ? rosterSnapshots : [];
};

function bindSubtabNavigation() {
  const nav = document.querySelector('#ocrDashboardRoot .dash-subtab-nav');
  if (nav) nav.setAttribute('role', 'tablist');
  document.querySelectorAll('#ocrDashboardRoot .dash-subtab-panel').forEach((panel) => {
    panel.setAttribute('role', 'tabpanel');
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
      const tabs = Array.from(document.querySelectorAll('#ocrDashboardRoot .dash-subtab-btn'));
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
  state.edenX1Votes = (Array.isArray(votes) ? votes : []).map(normalizeEdenX1VoteRecord);
  state.edenX1VoteHistory = (Array.isArray(history) ? history : []).map(
    normalizeEdenX1VoteHistoryRecord
  );
  if (settings) state.edenX1VoteSettings = normalizeEdenX1VoteSettings(settings);
  renderEdenX1VoteAdmin();
};

// Ã¢â€â‚¬Ã¢â€â‚¬ Roster Snapshots (local + Firestore) Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
export async function saveRosterSnapshotsToFirestore() {
  try {
    const db = await ensureCloudSyncReady();
    if (!db) return;
    const { doc, setDoc } = await loadFirestoreApi();
    const snapshots = trimRosterSnapshots(state.rosterSnapshots);
    if (snapshots.length !== state.rosterSnapshots.length) {
      state.rosterSnapshots = snapshots;
      localStorage.setItem(ROSTER_SNAPSHOTS_KEY, JSON.stringify(state.rosterSnapshots));
      log(`Roster snapshot history trimmed to ${snapshots.length} cloud-safe snapshots.`, 'warn');
    }
    await setDoc(
      doc(db, FS_ROSTER_PATH),
      sanitizeForFirestore({ snapshots, updated: new Date().toISOString() })
    );
  } catch (e) {
    console.error('ROSTER FIRESTORE SAVE ERROR:', e);
    showCloudSyncFailure(e, 'Roster cloud save failed');
  }
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
        state.rosterSnapshots = trimRosterSnapshots(data.snapshots);
        localStorage.setItem(ROSTER_SNAPSHOTS_KEY, JSON.stringify(state.rosterSnapshots));
      }
    }
    state._fsRosterUnsub = onSnapshot(
      doc(db, FS_ROSTER_PATH),
      (s) => {
        if (s.exists()) {
          const d = s.data();
          if (Array.isArray(d.snapshots)) {
            state.rosterSnapshots = trimRosterSnapshots(d.snapshots);
            localStorage.setItem(ROSTER_SNAPSHOTS_KEY, JSON.stringify(state.rosterSnapshots));
            renderRoster();
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
    log('Roster OCR already running...', 'warn');
    return;
  }
  state._rosterProcessing = true;
  const valid = getSupportedOcrImageFiles(files);
  if (!valid.length) {
    const rejected = describeRejectedOcrImageFiles(files);
    log(
      rejected.length
        ? dashT('adminRosterUnsupportedImageStatus', {
            files: rejected.slice(0, 3).join(', '),
          })
        : dashT('adminRosterNoImageSelectedStatus'),
      'warn'
    );
    state._rosterProcessing = false;
    return;
  }

  const prog = $id('dashRosterProgress');
  const progText = $id('dashRosterProgressText');
  if (prog) prog.classList.remove('hidden');

  log(dashT('adminRosterScanningImagesLog', { count: valid.length }), 'info');

  let allNames = [];

  for (let i = 0; i < valid.length; i++) {
    const f = valid[i];
    if (progText) progText.textContent = `Scanning roster image ${i + 1}/${valid.length}...`;
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
          log(
            dashT('adminRosterOcrRetryLog', {
              error: describeOcrRequestError(e, dashT),
              seconds: delaySeconds,
              attempt,
              total: 3,
            }),
            'warn',
            f.name
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
      log(
        dashT('adminRosterOcrErrorLog', { error: describeOcrRequestError(e, dashT) }),
        'error',
        f.name
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
    log('No member names found in the screenshot(s).', 'warn');
    alert('Could not extract any member names from the image. Check the log panel for details.');
    return;
  }

  log(`Extracted ${unique.length} unique member names from roster image(s).`, 'info');

  const prevText = state.rosterSnapshots.length
    ? state.rosterSnapshots[state.rosterSnapshots.length - 1].members.join('\n')
    : '';
  const input = prompt(
    `Edit extracted member names (one per line):\n${unique.length} names found from image.`,
    unique.join('\n')
  );
  if (input !== null && input.trim()) {
    takeRosterSnapshot(input);
  } else {
    log('Roster snapshot cancelled.', 'warn');
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
}

function setLoginBusy(busy) {
  const loginBtn = $id('dashLoginBtn');
  if (!loginBtn) return;
  loginBtn.disabled = busy;
  loginBtn.textContent = busy ? '...' : dashT('adminLoginBtn');
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
let connectingProgressTimer = null;
let connectingProgressValue = 0;
let connectingProgressCap = 92;
let _isConnecting = false;

function stopConnectingProgressLoop() {
  if (connectingProgressTimer) {
    clearInterval(connectingProgressTimer);
    connectingProgressTimer = null;
  }
}

function startConnectingProgressLoop() {
  stopConnectingProgressLoop();
  connectingProgressTimer = setInterval(() => {
    const overlay = $id('dashConnecting');
    if (!overlay || overlay.classList.contains('hidden')) return;
    if (connectingProgressValue >= connectingProgressCap) return;
    const remaining = connectingProgressCap - connectingProgressValue;
    const step = Math.max(0.25, Math.min(1.6, remaining * 0.08));
    setConnectingProgress(connectingProgressValue + step);
  }, 260);
}

async function completeConnectingProgress(statusMsg = '') {
  connectingProgressCap = 100;
  setConnectingProgress(98, statusMsg || dashT('adminConnectingData'), { cap: 100 });
  await new Promise((resolve) => setTimeout(resolve, 180));
  setConnectingProgress(100, '', { cap: 100, force: true });
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
  connectingProgressCap = 88;
  setConnectingProgress(connectingProgressValue);
  startConnectingProgressLoop();
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
  stopConnectingProgressLoop();
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
  if (Number.isFinite(options.cap)) connectingProgressCap = options.cap;
  const clamped = Math.max(0, Math.min(100, pct));
  connectingProgressValue = options.force ? clamped : Math.max(connectingProgressValue, clamped);
  if (fill) fill.style.width = `${connectingProgressValue}%`;
  if (pctEl) pctEl.textContent = `${Math.floor(connectingProgressValue)}%`;
  if (statusMsg) setConnectingStatus(statusMsg);
}
function updateLastSynced() {
  const el = $id('dashUpdated');
  if (!el) return;
  const lang = localStorage.getItem('vts_hero_lang') || document.documentElement.lang || 'en';
  const time = new Intl.DateTimeFormat(lang, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date());
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
    return 'App Check token missing; sync will retry automatically.';
  }
  if (/Firebase not initialized|missing|config/i.test(text)) {
    return 'Firebase is not configured for this deployment.';
  }
  if (isRecoverableDashboardCloudError(err)) {
    return dashT('adminCloudLocalCache');
  }
  return err?.message || err?.code || String(err || dashT('adminCloudSyncError'));
}
function showCloudSyncFailure(err, prefix = 'Cloud sync failed') {
  const message = describeCloudSyncError(err);
  const recoverable = isRecoverableDashboardCloudError(err);
  if (recoverable) state._cloudInitPromise = null;
  setCloudSyncStatus(recoverable ? 'local' : 'error', message);
  const lang = getDashboardLang();
  log(lang === 'en' ? `${prefix}: ${message}` : message, recoverable ? 'warn' : 'error');
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
  return localStorage.getItem('vts_hero_lang') || document.documentElement.lang || 'en';
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

function refreshRosterSnapshotLabel() {
  const btn = $id('dashRosterSnapshotBtn');
  const label = btn?.querySelector('span');
  if (!label) return;
  const lang = localStorage.getItem('vts_hero_lang') || document.documentElement.lang || 'en';
  const dayName = new Intl.DateTimeFormat(lang, { weekday: 'long' }).format(new Date());
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
  const username = getAdminLoginUsername();
  const password = getAdminLoginPassword();
  if (!username) {
    setLoginError('Enter the admin username.');
    return;
  }
  if (!password) {
    setLoginError('Enter the admin password.');
    return;
  }
  setLoginError('');
  setLoginBusy(true);
  state._signingOut = false;
  showConnecting(dashT('adminConnectingAuth'));
  setConnectingProgress(30, dashT('adminConnectingAuth'));
  try {
    const { signInWithUsername, isAdminAuthUser } = await loadFirebaseApi();
    const credential = await signInWithUsername(username, password);
    state.adminUser = credential.user;
    state.adminIsAdmin = await isAdminAuthUser(credential.user, { forceRefresh: true });
    if (!state.adminIsAdmin) {
      const { signOutUser } = await loadFirebaseApi();
      await signOutUser();
      throw new Error(dashT('adminCloudAdminRequired'));
    }
    await openAdminDashboardAfterAuth({ preferCloudFirst: true });
  } catch (e) {
    console.error('Dashboard sign-in failed', e);
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
  const preferCloudFirst = options.preferCloudFirst === true && state.adminIsAdmin === true;
  try {
    showConnecting(dashT('adminConnectingData'));
    setConnectingProgress(45, dashT('adminConnectingData'), { cap: 92 });
    if (preferCloudFirst) {
      await Promise.allSettled([
        runDashboardCloudTaskWithTimeout('Roster cloud load', loadRosterSnapshotsFromFirestore),
        loadData({
          preferCloudFirst: true,
          cloudTimeoutMs: DASHBOARD_CLOUD_BOOT_TIMEOUT_MS,
        }),
        runDashboardCloudTaskWithTimeout(
          'Bonus team effort points cloud load',
          loadConductAdjustmentsForSeason
        ),
        runDashboardCloudTaskWithTimeout('Eden X1 vote admin load', loadEdenX1VoteAdminData),
      ]);
      await runDashboardCloudTaskWithTimeout(
        'Queued cloud sync',
        flushDashboardCloudRetryQueue,
        Math.min(DASHBOARD_CLOUD_BOOT_TIMEOUT_MS, DASHBOARD_CLOUD_WRITE_TIMEOUT_MS)
      );
    } else {
      hydrateDashboardStateFromLocalStorage();
      await loadData({ preferCloudFirst: false });
      if (readDashboardCloudRetryQueue().length) {
        setCloudSyncStatus('local', dashT('adminCloudRetryPending'));
      }
    }
    await completeConnectingProgress(dashT('adminConnectingData'));
    showApp();
    render();
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
  return sanitizeDashboardDataForPersistence(
    auxiliaryPayload && typeof auxiliaryPayload === 'object'
      ? { ...base, ...auxiliaryPayload }
      : base
  );
}

async function writeAuxiliaryPayloadToCloud(db, firestore, auxiliaryPayload) {
  const { doc, setDoc } = firestore;
  try {
    await setDoc(doc(db, FS_PATH), auxiliaryPayload, { merge: true });
    return { repaired: false };
  } catch (err) {
    if (!isFirestorePermissionDenied(err) && !isFirestoreDocumentTooLarge(err)) throw err;
    const repairPayload = buildDashboardCloudRepairPayload(auxiliaryPayload);
    await setDoc(doc(db, FS_PATH), repairPayload);
    state.dashData = normalizeDashboardDataForCache(repairPayload);
    writeDashboardLocalCache(repairPayload);
    writeAuxiliaryLocalCaches();
    return { repaired: true };
  }
}

function getAuxiliaryRecordPayload() {
  const r5Season = state.r5Season || getDashboardR5SeasonKey();
  return sanitizeForFirestore({
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
    const { doc, setDoc } = firestore;
    const remaining = [];
    for (const entry of queued) {
      try {
        if (entry.kind === 'auxiliary') {
          await awaitCloud(
            writeAuxiliaryPayloadToCloud(db, firestore, entry.payload),
            'Queued auxiliary cloud write'
          );
        } else {
          await awaitCloud(
            setDoc(doc(db, FS_PATH), sanitizeDashboardDataForPersistence(entry.payload)),
            'Queued dashboard cloud write'
          );
        }
      } catch (err) {
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
    log('Queued cloud writes synced.', 'success');
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
  const version = dashboardCloudSavePendingVersion;
  dashboardCloudSavePendingData = null;
  dashboardCloudSaveInFlight = true;
  const awaitCloud = (promise, label) =>
    withDashboardCloudTimeout(promise, DASHBOARD_CLOUD_WRITE_TIMEOUT_MS, label);
  let result = false;
  try {
    setCloudSyncStatus('syncing');
    const db = await awaitCloud(ensureCloudSyncReady(), 'Dashboard cloud connection');
    if (!db) {
      setCloudSyncStatus('local');
      queueDashboardCloudRetry('dashboard', persistedData, dashT('adminCloudAdminRequired'));
      showCloudSyncFailure(new Error(dashT('adminCloudAdminRequired')), 'Save blocked');
      return false;
    }
    const { doc, setDoc } = await awaitCloud(loadFirestoreApi(), 'Firestore module load');
    await awaitCloud(setDoc(doc(db, FS_PATH), persistedData), 'Dashboard cloud save');
    setCloudSyncStatus('live');
    log('Synced to cloud.', 'info');
    result = true;
    return true;
  } catch (e) {
    console.error('FIREBASE SAVE ERROR:', e);
    queueDashboardCloudRetry('dashboard', persistedData, e?.message || e?.code || 'save failed');
    showCloudSyncFailure(e, 'Save error');
    return false;
  } finally {
    dashboardCloudSaveInFlight = false;
    resolveDashboardCloudSaveWaiters(version, result);
    if (dashboardCloudSavePendingData) queueDashboardCloudSaveFlush();
  }
}

function scheduleDashboardCloudSave(persistedData, options = {}) {
  dashboardCloudSavePendingData = persistedData;
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
  state.dashData = normalizeDashboardDataForCache(data);
  if (state.dashData && typeof state.dashData === 'object') {
    delete state.dashData.logs;
  }
  const persistedData = sanitizeDashboardDataForPersistence(state.dashData);
  state.dashData = normalizeDashboardDataForCache(persistedData);
  writeDashboardLocalCache(persistedData);
  writeAuxiliaryLocalCaches();
  if (options.cloud === false) return false;
  if (!state.adminIsAdmin) {
    queueDashboardCloudRetry('dashboard', persistedData, dashT('adminCloudAdminRequired'));
    showCloudSyncFailure(new Error(dashT('adminCloudAdminRequired')), 'Save blocked');
    return false;
  }
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
        err?.message || err?.code || 'save timed out'
      );
      showDashboardCloudFallback(err, 'Dashboard cloud save');
      return false;
    }
  }
  return false;
}

export async function saveDashboardAuxiliaryRecords(options = {}) {
  const sourceData =
    state.dashData && typeof state.dashData === 'object'
      ? state.dashData
      : { last_updated: fmtDate(new Date()), total_attacks: 0, attacks: [], players_summary: [] };
  const localData = sanitizeDashboardDataForPersistence(sourceData);
  state.dashData = normalizeDashboardDataForCache(localData);
  writeDashboardLocalCache(localData);
  writeAuxiliaryLocalCaches();
  if (options.cloud === false) return false;
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
        dashT('adminCloudAdminRequired')
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
      writeAuxiliaryPayloadToCloud(db, firestore, auxiliaryPayload),
      'Special list cloud save'
    );
    setCloudSyncStatus('live');
    if (result.repaired) log('Cloud dashboard document repaired and special lists synced.', 'warn');
    updateLastSynced();
    return true;
  } catch (e) {
    console.error('FIREBASE AUXILIARY SAVE ERROR:', e);
    queueDashboardCloudRetry(
      'auxiliary',
      getAuxiliaryRecordPayload(),
      e?.message || e?.code || 'auxiliary save failed'
    );
    showCloudSyncFailure(e, 'Special list cloud save failed');
    return false;
  }
}

window.syncDashboardAuxiliaryRecordsToCloud = saveDashboardAuxiliaryRecords;

async function loadData(options = {}) {
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
      hadLocalData = true;
      dashboardLocalCacheJson = saved;
      localData = normalizeDashboardDataForCache(JSON.parse(saved));
      hydrateAuxiliaryRecordsFromDashboardData(localData);
      if (!preferCloudFirst) {
        state.dashData = localData;
        if (state.dashData && typeof state.dashData === 'object') delete state.dashData.logs;
        writeDashboardLocalCache(attachAuxiliaryRecords(state.dashData));
        render();
      }
    }
  } catch (e) {}
  if (!preferCloudFirst && state.adminIsAdmin !== true) {
    setCloudSyncStatus('local');
    log(dashT('adminCloudAdminRequired'), 'warn');
    return;
  }
  try {
    const db = await awaitCloud(ensureCloudSyncReady(), 'Dashboard cloud connection');
    if (!db) {
      if (preferCloudFirst && localData) {
        state.dashData = localData;
        hydrateAuxiliaryRecordsFromDashboardData(state.dashData);
        if (state.dashData && typeof state.dashData === 'object') delete state.dashData.logs;
        render();
      }
      setCloudSyncStatus('local');
      log('Firestore not available Ã¢â‚¬â€ using local storage only.', 'warn');
      return;
    }
    const { doc, getDoc, setDoc, onSnapshot } = await awaitCloud(
      loadFirestoreApi(),
      'Firestore module load'
    );
    if (state._fsUnsub) state._fsUnsub();
    const snap = await awaitCloud(getDoc(doc(db, FS_PATH)), 'Dashboard cloud read');
    if (snap.exists()) {
      const cloudData = normalizeDashboardDataForCache(snap.data());
      state.dashData = cloudData;
      hydrateAuxiliaryRecordsFromDashboardData(state.dashData);
      if (state.dashData && typeof state.dashData === 'object') delete state.dashData.logs;
      writeDashboardLocalCache(attachAuxiliaryRecords(state.dashData));
      render();
      setCloudSyncStatus('live');
    } else {
      if (hadLocalData && localData) {
        state.dashData = localData;
        hydrateAuxiliaryRecordsFromDashboardData(state.dashData);
        if (state.dashData && typeof state.dashData === 'object') delete state.dashData.logs;
        render();
        await awaitCloud(
          setDoc(doc(db, FS_PATH), sanitizeDashboardDataForPersistence(localData)),
          'Dashboard cloud seed'
        );
        setCloudSyncStatus('live');
        log('Uploaded local dashboard cache to cloud.', 'success');
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
    state._fsUnsub = onSnapshot(
      doc(db, FS_PATH),
      (snap) => {
        if (snap.exists()) {
          state.dashData = normalizeDashboardDataForCache(snap.data());
          hydrateAuxiliaryRecordsFromDashboardData(state.dashData);
          if (state.dashData && typeof state.dashData === 'object') delete state.dashData.logs;
          writeDashboardLocalCache(attachAuxiliaryRecords(state.dashData));
          scheduleDashboardRender();
          updateLastSynced();
          setCloudSyncStatus('live');
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
    log(dashT('adminCloudSynced'), 'info');
    updateLastSynced();
  } catch (e) {
    if (state._signingOut) return;
    console.error('FIREBASE AUTH ERROR:', e);
    if (preferCloudFirst && localData) {
      state.dashData = localData;
      hydrateAuxiliaryRecordsFromDashboardData(state.dashData);
      if (state.dashData && typeof state.dashData === 'object') delete state.dashData.logs;
      render();
      setCloudSyncStatus('local', e.message || e.code || '');
      if (isDashboardCloudTimeout(e)) {
        state._cloudInitPromise = null;
        log('Cloud load timed out; showing local dashboard cache.', 'warn');
      } else {
        log('Cloud load failed; showing local dashboard cache.', 'warn');
      }
      return;
    }
    showCloudSyncFailure(e, 'Load auth error');
  }
}

async function clearData() {
  state.dashData = null;
  try {
    localStorage.removeItem(STORAGE_KEY);
    dashboardLocalCacheJson = '';
  } catch (e) {}
  try {
    localStorage.removeItem(LOG_KEY);
  } catch (e) {}
  try {
    setCloudSyncStatus('syncing');
    const db = await ensureCloudSyncReady();
    if (db) {
      const { doc, setDoc } = await loadFirestoreApi();
      await setDoc(doc(db, FS_PATH), {});
      setCloudSyncStatus('live');
    } else {
      setCloudSyncStatus('local');
    }
  } catch (e) {
    showCloudSyncFailure(e, 'Clear cloud data failed');
  }
  const out = $id('dashLogOutput');
  if (out) out.innerHTML = '';
  render();
  log('Database wiped.', 'warn');
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
  'vts_r5_adjustment_season',
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
    logs: parseStorageJson(localStorage.getItem(LOG_KEY)) || [],
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
        language: localStorage.getItem('vts_hero_lang') || document.documentElement.lang || 'en',
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
  const scope = state._lastRenderedFilterLabel || 'Global Top Performers';
  const timeLabel =
    state._lastRenderedTimeLabel ||
    (state.timeFilter === 'daily'
      ? 'Today'
      : state.timeFilter === 'weekly'
        ? 'This Week'
        : 'All Time');
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
          alert('Sharing not supported on this browser. Use the download button instead.');
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
      log('Import successful.', 'success');
    } catch (err) {
      alert('Import failed');
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
  requestAnimationFrame(() => {
    if (state._adminLanguageRefreshToken !== token) return;
    if ($id('dashChart')) render();
    const refreshSecondaryPanels = () => {
      if (state._adminLanguageRefreshToken !== token) return;
      renderContributions();
      renderConductAdjustments();
    };
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(refreshSecondaryPanels, { timeout: 300 });
    } else {
      setTimeout(refreshSecondaryPanels, 0);
    }
  });
}

export async function bootOcrDashboard() {
  if (state._booted) return;
  state._booted = true;
  loadRoster();
  if (!state._adminLanguageRefreshBound) {
    state._adminLanguageRefreshBound = true;
    window.addEventListener('vts:admin-language-change', scheduleAdminLanguageRefresh);
  }
  $id('dashLoginBtn').onclick = doLogin;
  $id('dashSignOutBtn')?.addEventListener('click', doSignOut);
  const loginUser = $id('dashLoginUser');
  if (loginUser && !loginUser.value) loginUser.value = '1097';
  bindSubtabNavigation();
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
  bindSubtabNavigation();
  bindConductControls();
  $id('dashRefreshBtn').onclick = async () => {
    setRefreshBusy(true);
    try {
      await Promise.allSettled([
        loadData({ preferCloudFirst: state.adminIsAdmin === true }),
        state.adminIsAdmin === true
          ? runDashboardCloudTaskWithTimeout(
              'Bonus team effort points cloud load',
              loadConductAdjustmentsForSeason
            )
          : loadConductAdjustmentsForSeason(),
      ]);
      if (state.adminIsAdmin === true) {
        await runDashboardCloudTaskWithTimeout(
          'Queued cloud sync',
          flushDashboardCloudRetryQueue,
          Math.min(DASHBOARD_CLOUD_BOOT_TIMEOUT_MS, DASHBOARD_CLOUD_WRITE_TIMEOUT_MS)
        );
      }
      render();
    } catch (e) {
      console.error('Refresh failed:', e);
    } finally {
      setRefreshBusy(false);
    }
  };
  log('VTS Admin Dashboard loaded.', 'info');
  if (isLocalAdminTestBypass()) {
    state.adminUser = { uid: 'local-test-admin' };
    state.adminIsAdmin = false;
    try {
      await openAdminDashboardAfterAuth({ preferCloudFirst: false });
    } catch (e) {
      console.error('Local admin test dashboard load failed during boot', e);
    }
  } else {
    showConnecting(dashT('adminConnectingInit'));
    try {
      const configured = await ensureDashboardCloudInitialized();
      if (configured) {
        const { onUserChanged, getCurrentUser, isPasswordAuthUser, waitForAuthReady } =
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
              const candidateIsAdmin = await isPasswordAuthUser(user);
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
        if (currentUser && (await isPasswordAuthUser(currentUser))) {
          state.adminUser = currentUser;
          state.adminIsAdmin = true;
          await openAdminDashboardAfterAuth({ preferCloudFirst: true });
        }
      } else {
        setLoginError('Firebase is not configured for admin sign-in.');
      }
    } catch (e) {
      console.error('Admin auth boot failed', e);
      setLoginError(describeAdminAuthError(e));
      showLogin();
    }
  }
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
      return 'App Check site key missing';
    if (/debug token/i.test(text)) return 'App Check debug token needed';
    if (/app ?check|appcheck|recaptcha/i.test(text)) return 'App Check token blocked';
    if (/origin not allowed|allowed_origins|not currently allowed/i.test(text))
      return 'Local origin blocked';
    if (/dashscope_api_key/i.test(text)) return 'Worker API key missing';
    if (/worker status\s+40[13]|unauthorized|forbidden/i.test(text))
      return 'Worker authorization blocked';
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
    const summary = summarizeOcrStatusReason(reason);
    const statusKey = ocrReady ? 'ready' : `unavailable:${reason}`;
    if (options.forceLog === true || statusKey !== lastLoggedOcrStatusKey) {
      lastLoggedOcrStatusKey = statusKey;
      if (ocrReady) {
        log(dashT('adminOcrServiceReady'), 'success');
      } else {
        const detail = summary && summary !== reason ? `${summary} - ${reason}` : summary;
        log(`${dashT('adminOcrUnavailable')} - ${detail}`, 'warn');
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

  // Run on boot and whenever key input changes
  updateApiStatus();
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
    if (uploadBtn && input)
      uploadBtn.onclick = () => {
        if (!canUseOcr()) return;
        input.value = '';
        input.click();
      };
    if (drop && input) {
      drop.onclick = (event) => {
        if (event.target?.tagName === 'INPUT') return;
        if (!canUseOcr()) return;
        input.value = '';
        input.click();
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
  renderDutyRecords();
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
    log(dashT('adminContributionNoImageSelectedStatus'), 'warn');
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
    log(dashT('adminContributionOpeningPickerStatus'), 'info');
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
  renderContributions();
  renderEdenX1VoteAdmin();
  bindEdenX1VoteAdminControls();
  const clearLogBtn = $id('dashClearLogBtn');
  if (clearLogBtn)
    clearLogBtn.onclick = () => {
      $id('dashLogOutput').innerHTML = '';
      try {
        localStorage.removeItem(LOG_KEY);
      } catch (e) {}
    };

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
      alert('Admin override is not configured for this deployment.');
      return;
    }
    const code = prompt('Enter admin override code:');
    if (!code) return;
    const h = await sha256(code);
    if (h === CLEAR_HASH) clearData();
    else alert('Invalid code');
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
      log('Cancelling OCR scan...', 'warn');
    };
  }
  drop.onclick = () => {
    if (!canUseOcr()) return;
    inp.value = '';
    inp.click();
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
}

window.deleteAttack = async function (attId) {
  const pwd = prompt('Enter Admin Overdrive Password to delete this structure data:');
  if (pwd === null) return;
  const hash = await sha256(pwd);
  if (!DELETE_HASHES.size || !DELETE_HASHES.has(hash)) {
    alert('Incorrect password.');
    return;
  }
  if (!attId || !state._booted || !state.dashData) return;
  const idx = state.dashData.attacks.findIndex((a) => a.id === attId);
  if (idx !== -1) {
    const removed = state.dashData.attacks[idx];
    state.dashData.attacks.splice(idx, 1);
    refreshDashboardPlayerSummary();
    state.dashData.total_attacks = state.dashData.attacks.length;
    await saveData(state.dashData);
    render();
    closeModal();
    log(
      `Deleted attack: ${formatStructureLabel(removed.structure_name, removed.structure_level)}`,
      'warn'
    );
  }
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
  log(
    `Marked complete by override: ${formatStructureLabel(att.structure_name, att.structure_level)}`,
    'warn'
  );
};

window.editAttack = async function (attId) {
  if (!attId || !state._booted || !state.dashData) return;
  const att = state.dashData.attacks.find((a) => a.id === attId);
  if (!att) return;
  const newName = prompt('Edit Structure Name (e.g. Capital, Gates, City):', att.structure_name);
  if (newName === null) return;
  let normalizedTarget = normalizeStructureTarget(newName.trim(), '');
  if (!isNameOnlyStructure(normalizedTarget.structure_name) && !normalizedTarget.structure_level) {
    const newLevel = prompt('Edit Structure Level (e.g. Lv.1, Lv.5):', att.structure_level);
    if (newLevel === null) return;
    normalizedTarget = normalizeStructureTarget(normalizedTarget.structure_name, newLevel.trim());
  }
  const newTime = prompt('Edit End Time (Game Time) (format: YYYY-MM-DD, HH:mm):', att.game_time);
  if (newTime === null) return;
  const newStartTime = prompt(
    'Edit Start Time (Game Time) (Optional, leave blank if unknown):',
    att.start_time || ''
  );
  if (newStartTime === null) return;
  att.structure_name = normalizedTarget.structure_name;
  att.structure_level = normalizedTarget.structure_level;
  att.raw_structure_name = normalizedTarget.structure_name;
  att.raw_structure_level = normalizedTarget.structure_level;
  att.display_structure_name = normalizedTarget.structure_name;
  att.display_structure_level = normalizedTarget.structure_level;
  const timestamp = String(att.id || '').match(/_(\d{10,})$/)?.[1];
  if (timestamp) {
    att.id = `${normalizedTarget.structure_name.replace(/\s+/g, '_')}_${normalizedTarget.structure_level}_${timestamp}`;
  }
  att.game_time = newTime.trim();
  att.start_time = newStartTime.trim();
  delete att._validation;
  refreshDashboardPlayerSummary();
  await saveData(state.dashData);
  render();
  showModal('attack', att);
  log(
    `Updated attack to: ${formatStructureLabel(att.structure_name, att.structure_level)}`,
    'info'
  );
};

window.addPlayer = async function (attId) {
  if (!attId || !state._booted || !state.dashData) return;
  const att = state.dashData.attacks.find((a) => a.id === attId);
  if (!att) return;
  const pName = prompt('Enter new Player Name:');
  if (!pName) return;
  const pVal = prompt(`Enter Demolition Value for ${pName}:`);
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
  log(`Added player ${pName} to ${att.structure_name}`, 'info');
};

window.editPlayer = async function (attId, encName) {
  if (!attId || !state._booted || !state.dashData) return;
  const att = state.dashData.attacks.find((a) => a.id === attId);
  if (!att) return;
  const pName = decodeURIComponent(encName);
  const pIdx = att.players.findIndex((p) => p.name === pName);
  if (pIdx === -1) return;

  const action = prompt(
    `Editing ${pName}.\nType new Demolition Value to update, or type 'DELETE' to remove this player:`,
    att.players[pIdx].value || att.players[pIdx].val
  );
  if (!action) return;

  if (action.trim().toUpperCase() === 'DELETE') {
    att.players.splice(pIdx, 1);
  } else {
    const pVal = Number(action);
    if (isNaN(pVal)) {
      alert('Invalid value');
      return;
    }
    const newName = prompt(`Edit Player Name:`, pName);
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
  log(`Edited player ${pName} in ${att.structure_name}`, 'info');
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
    log(`No rows found for player export: ${pName}`, 'warn');
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
