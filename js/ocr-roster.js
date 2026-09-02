import {
  STORAGE_KEY,
  ROSTER_KEY,
  ROSTER_SNAPSHOTS_KEY,
  BANNER_KEY,
  DUTY_LIST_KEY,
  CONTRIBUTION_KEY,
  EX_GUILD_CONTRIBUTION_KEY,
  ALLIANCE_KEY,
  ROSTER_AUTH_KEY,
  ROSTER_USERS,
  ROSTER_PASS_HASH,
  ALLIANCE_COUNT,
  state,
  $id,
  esc,
  log,
  sha256,
  trimRosterSnapshots,
  qwenVisionRequest,
  describeOcrRequestError,
  tryRepairJson,
  getSimilarity,
  getSimilarityAlphaNum,
  findBestMatch,
  compactPlayerIdentity,
  getSupportedOcrImageFiles,
  describeRejectedOcrImageFiles,
  readOcrImageDataUrl,
  expandDutyRawNames,
  getDutyCreditedNames,
} from './ocr-shared.js';
import {
  ACTIVE_EDEN_WORKSPACE,
  ACTIVE_EDEN_WORKSPACE_ID,
  edenWorkspaceMutationError,
} from './eden-workspaces.js';
import { bohMatchEntriesFromText } from './boh-match-results.js';
import { closeModal } from './ocr-render.js';
import { pushUndoAction } from './state.js';

// Season record mirrors refuse writes while the archived workspace is the
// active one, so the X1 archive's local mirrors stay exactly as loaded.
function blockArchiveMirrorWrite(action) {
  const err = edenWorkspaceMutationError(ACTIVE_EDEN_WORKSPACE_ID);
  if (!err) return false;
  console.warn(err.message, action);
  log(`${err.message} Blocked: ${action}.`, 'warn');
  if (typeof window.showToast === 'function') {
    window.showToast(`${ACTIVE_EDEN_WORKSPACE.label} is read-only.`, 'warn', 6000);
  }
  return true;
}
import { translations } from './translations.js';
import { resolveRuntimeLocale } from './locale-format.js';
import {
  canonicalizePlayerOptionNames,
  getSpecialAccountIdentityKey,
  resolveCanonicalPlayerIdentity,
  stripGuildTagsFromPlayerName,
  stripExGuildGuildTag,
  summarizeCanonicalPlayerRecords,
} from './ocr-name-normalizer.js';
import {
  buildWeightedContributionRows,
  getWeightedPlayerFamilyKey,
  getWeightedContributionRecordLabel,
  isImageSourceContributionNote,
} from './contribution-weighting.js';
import {
  normalizePlayerRegistry,
  readStoredPlayerRegistry,
  writeStoredPlayerRegistry,
} from './player-registry.js';
import {
  addContributionAliasMatch,
  collapseContributionOcrDuplicates,
  getContributionAliasMatch,
  getContributionCanonicalName,
  getContributionSnapshotIdentity,
  normalizeContributionMemberName,
  removeContributionAliasMatch,
} from './contribution-identity.js';

function adminT(key, vars = {}) {
  const lang = resolveRuntimeLocale();
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

function logRosterEvent(key, type = 'info', params = {}, options = {}) {
  return log(adminT(key, params), type, options.file || null, {
    messageKey: key,
    params,
    source: options.source || 'roster',
    localOnly: options.localOnly === true,
  });
}

function beginAdminEditSurface(scope) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent('vts:admin-edit-surface-opened', {
      detail: { scope: String(scope || 'admin-modal') },
    })
  );
}

export function loadPlayerRegistry() {
  state.playerRegistry = readStoredPlayerRegistry();
  return state.playerRegistry;
}

export async function savePlayerRegistry(registry, options = {}) {
  const normalized = normalizePlayerRegistry({
    ...normalizePlayerRegistry(registry),
    updatedAt: new Date().toISOString(),
  });
  state.playerRegistry = writeStoredPlayerRegistry(normalized);
  if (options.cloud === false) return false;
  return syncDashboardAuxiliaryRecords(options);
}

function hydrateDashboardTableLabels(root) {
  if (!root) return;
  root.querySelectorAll('table').forEach((table) => {
    table.classList.add('dash-table--stack');
    const labels = Array.from(table.querySelectorAll('thead th')).map((th) =>
      (th.textContent || '').replace(/\s+/g, ' ').trim()
    );
    if (!labels.length) return;
    table.querySelectorAll('tbody tr').forEach((row) => {
      Array.from(row.children).forEach((cell, index) => {
        if (cell.tagName === 'TD' && labels[index]) cell.dataset.label = labels[index];
      });
    });
  });
  paginateLongTables(root);
}

const TABLE_PAGE_STEP = 25;
const EX_GUILD_BACKUP_KEY = `${EX_GUILD_CONTRIBUTION_KEY}_backup`;
const DASHBOARD_CLOUD_RETRY_QUEUE_KEY = 'vts_dashboard_cloud_retry_queue';
const EX_GUILD_MATCH_LIMIT = 8;

function cloneJson(value, fallback = []) {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return fallback;
  }
}

function cloneExGuildEntries(entries) {
  return cloneJson(Array.isArray(entries) ? entries : [], []);
}

// Long roster/contribution tables are unwieldy on mobile (each row stacks to a
// full-width card). Collapse them to the first TABLE_PAGE_STEP rows and let the
// admin reveal more in 25-row increments, or expand/collapse the whole table.
function paginateLongTables(root, step = TABLE_PAGE_STEP) {
  if (!root) return;
  root.querySelectorAll('table.dash-banner-table > tbody').forEach((tbody) => {
    const table = tbody.parentElement;
    const rows = Array.from(tbody.children).filter((el) => el.tagName === 'TR');
    // Remove any control left over from a previous render of this table.
    const stale = table.nextElementSibling;
    if (stale && stale.classList && stale.classList.contains('dash-table-more-wrap'))
      stale.remove();
    if (rows.length <= step) {
      rows.forEach((row) => row.classList.remove('dash-row-hidden'));
      return;
    }
    let limit = step;
    const wrap = document.createElement('div');
    wrap.className = 'dash-table-more-wrap';
    const moreBtn = document.createElement('button');
    moreBtn.type = 'button';
    moreBtn.className = 'dash-btn dash-btn-xs dash-table-more-btn';
    const allBtn = document.createElement('button');
    allBtn.type = 'button';
    allBtn.className = 'dash-btn dash-btn-xs dash-table-all-btn';
    const apply = () => {
      rows.forEach((row, i) => row.classList.toggle('dash-row-hidden', i >= limit));
      const remaining = rows.length - limit;
      if (remaining > 0) {
        moreBtn.style.display = '';
        moreBtn.textContent = adminT('adminTableShowMore', {
          count: Math.min(step, remaining),
          hidden: remaining,
        });
        allBtn.textContent = adminT('adminTableShowAll', { count: rows.length });
      } else {
        moreBtn.style.display = 'none';
        allBtn.textContent = adminT('adminTableShowFirst', { count: step });
      }
    };
    moreBtn.addEventListener('click', () => {
      limit = Math.min(limit + step, rows.length);
      apply();
    });
    allBtn.addEventListener('click', () => {
      limit = limit >= rows.length ? step : rows.length;
      apply();
    });
    wrap.appendChild(moreBtn);
    wrap.appendChild(allBtn);
    table.insertAdjacentElement('afterend', wrap);
    apply();
  });
}

function bindAdminControls(root) {
  if (!root || root.dataset.adminControlsBound === '1') return;
  root.dataset.adminControlsBound = '1';

  const actionTarget = (event) => {
    const target = event.target?.closest?.('[data-admin-action]');
    return target && root.contains(target) ? target : null;
  };
  const integerData = (target, key) => {
    const value = Number.parseInt(target.dataset[key], 10);
    return Number.isInteger(value) ? value : null;
  };
  const updateRosterFilter = (key, value) => {
    if (key === 'alliance') state._rosterFilterAlliance = value;
    else if (key === 'status') state._rosterFilterStatus = value;
    else if (key === 'search') state._rosterSearchQ = value;
    renderRoster();
  };

  root.addEventListener('click', (event) => {
    const trigger = actionTarget(event);
    if (!trigger || trigger.matches(':disabled,[aria-disabled="true"]')) return;
    const index = integerData(trigger, 'index');
    const memberIndex = integerData(trigger, 'memberIndex');
    const snapshotIndex = integerData(trigger, 'snapshotIndex');
    switch (trigger.dataset.adminAction) {
      case 'close-modal':
        closeModal();
        break;
      case 'roster-login':
        rosterLogin();
        break;
      case 'roster-logout':
        rosterLogout();
        break;
      case 'apply-bulk-status':
        applyBulkStatus(trigger.dataset.status || 'unknown');
        break;
      case 'set-roster-status':
        if (snapshotIndex !== null && memberIndex !== null) {
          setRosterStatus(snapshotIndex, memberIndex, trigger.dataset.status || 'unknown');
        }
        break;
      case 'show-roster-snapshot':
        if (snapshotIndex !== null) showRosterSnapshotModal(snapshotIndex);
        break;
      case 'delete-roster-snapshot':
        if (snapshotIndex !== null) deleteRosterSnapshot(snapshotIndex);
        break;
      case 'configure-alliances':
        configureAlliances();
        break;
      case 'copy-roster-names':
        copyRosterNames(trigger.dataset.rosterType || 'unassigned');
        break;
      case 'toggle-roster-history': {
        const historyBody = trigger.nextElementSibling;
        historyBody?.classList.toggle('open');
        const arrow = trigger.querySelector('.dash-roster-history-arrow');
        if (arrow) arrow.textContent = historyBody?.classList.contains('open') ? '▼' : '▶';
        break;
      }
      case 'edit-banner':
        if (index !== null) showBannerForm(index);
        break;
      case 'delete-banner':
        if (index !== null) deleteBannerRecord(index);
        break;
      case 'edit-duty':
        editDutyRecord(trigger.dataset.recordId || '');
        break;
      case 'delete-duty':
        deleteDutyRecord(trigger.dataset.recordId || '');
        break;
      case 'remove-contribution-row':
        trigger.closest('.dash-contribution-match-row')?.remove();
        break;
      case 'set-contribution-primary':
        setContributionPrimary(trigger.dataset.recordId || '');
        break;
      case 'export-contribution':
        exportContributionRecords(trigger.dataset.recordId || '');
        break;
      case 'edit-contribution':
        editContributionRecord(trigger.dataset.recordId || '');
        break;
      case 'delete-contribution':
        deleteContributionRecord(trigger.dataset.recordId || '');
        break;
      case 'delete-exguild-entry':
        deleteExGuildEntry(trigger.dataset.entryId || '');
        break;
      case 'clear-exguild':
        clearExGuildData();
        break;
    }
  });

  root.addEventListener('change', (event) => {
    const trigger = actionTarget(event);
    if (!trigger || trigger.matches(':disabled')) return;
    const memberIndex = integerData(trigger, 'memberIndex');
    const snapshotIndex = integerData(trigger, 'snapshotIndex');
    switch (trigger.dataset.adminAction) {
      case 'apply-bulk-alliance':
        if (trigger.value !== '') applyBulkAlliance(Number.parseInt(trigger.value, 10));
        trigger.value = '';
        break;
      case 'set-roster-alliance':
        if (snapshotIndex !== null && memberIndex !== null) {
          setRosterAlliance(snapshotIndex, memberIndex, Number.parseInt(trigger.value, 10));
        }
        break;
      case 'toggle-bulk-check':
        if (memberIndex !== null) toggleBulkCheck(memberIndex);
        break;
      case 'toggle-bulk-select-all':
        toggleBulkSelectAll(trigger.dataset.indices || '[]');
        break;
      case 'set-roster-filter':
        updateRosterFilter(trigger.dataset.filterKey || '', trigger.value);
        break;
      case 'set-contribution-reward':
        {
          const entryIndex = integerData(trigger, 'entryIndex');
          if (entryIndex !== null) {
            setContributionReward(trigger.dataset.recordId || '', entryIndex, trigger.value);
          }
        }
        break;
    }
  });

  root.addEventListener('input', (event) => {
    const trigger = actionTarget(event);
    if (!trigger || trigger.dataset.adminAction !== 'set-roster-filter') return;
    updateRosterFilter(trigger.dataset.filterKey || '', trigger.value);
    const nextSearch = root.querySelector(
      '[data-admin-action="set-roster-filter"][data-filter-key="search"]'
    );
    if (nextSearch) {
      nextSearch.focus();
      nextSearch.setSelectionRange(nextSearch.value.length, nextSearch.value.length);
    }
  });

  root.addEventListener('keydown', (event) => {
    const trigger = actionTarget(event);
    if (!trigger || trigger.getAttribute('role') !== 'button') return;
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    trigger.click();
  });
}

function loadRoster() {
  const raw = localStorage.getItem(ROSTER_KEY);
  state.rosterNames = raw
    ? raw
        .split('\n')
        .map((n) => n.trim())
        .filter((n) => n.length > 0)
    : [];
}

function saveRoster(text) {
  if (blockArchiveMirrorWrite('save roster')) return;
  const previous = localStorage.getItem(ROSTER_KEY) || '';
  localStorage.setItem(ROSTER_KEY, text);
  loadRoster();
  if (previous !== text) {
    pushUndoAction({
      label: adminT('adminBtnRoster'),
      undo: () => {
        localStorage.setItem(ROSTER_KEY, previous);
        loadRoster();
        renderRoster();
        logRosterEvent('adminLogRosterUndo', 'success');
      },
    });
  }
}

function showRosterModal() {
  const m = $id('dashModal'),
    body = $id('dashModalBody');
  $id('dashModalTitle').textContent = adminT('adminRosterModalTitle');
  $id('dashModalSub').textContent = adminT('adminRosterModalHint');
  const rosterText = esc(localStorage.getItem(ROSTER_KEY) || '');
  body.innerHTML = `<textarea id="dashRosterInput" class="dash-input" style="height:300px;font-family:monospace;font-size:0.85rem">${rosterText}</textarea>
    <div style="margin-top:1rem;display:flex;gap:0.5rem"><button id="dashRosterSaveBtn" class="dash-btn dash-btn-primary" style="flex:1">${esc(adminT('adminRosterSave'))}</button><button id="dashRosterCancelBtn" class="dash-btn" style="flex:1">${esc(adminT('adminCancel'))}</button></div>`;
  $id('dashRosterSaveBtn').onclick = () => {
    saveRoster($id('dashRosterInput').value);
    closeModal();
  };
  $id('dashRosterCancelBtn').onclick = closeModal;
  m.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function loadRosterSnapshots() {
  try {
    const raw = localStorage.getItem(ROSTER_SNAPSHOTS_KEY);
    state.rosterSnapshots = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(state.rosterSnapshots)) state.rosterSnapshots = [];
    state.rosterSnapshots = trimRosterSnapshots(state.rosterSnapshots);
    localStorage.setItem(ROSTER_SNAPSHOTS_KEY, JSON.stringify(state.rosterSnapshots));
  } catch (e) {
    state.rosterSnapshots = [];
  }
}

function syncRosterSnapshotsToFirestore(snapshots, baseUpdated) {
  state._rosterCloudSaveQueued = Number(state._rosterCloudSaveQueued || 0) + 1;
  import('./ocr-dashboard.js')
    .then(({ saveRosterSnapshotsToFirestore }) =>
      saveRosterSnapshotsToFirestore(snapshots, baseUpdated)
    )
    .catch((err) => {
      console.error('Roster snapshot cloud sync failed:', err);
      logRosterEvent(
        'adminLogRosterCloudSaveFailed',
        'error',
        { error: err?.message || String(err || '') },
        { localOnly: true }
      );
    })
    .finally(() => {
      state._rosterCloudSaveQueued = Math.max(0, Number(state._rosterCloudSaveQueued || 0) - 1);
    });
}

function saveRosterSnapshots() {
  if (blockArchiveMirrorWrite('save roster snapshots')) return;
  state.rosterSnapshots = trimRosterSnapshots(state.rosterSnapshots);
  const snapshots = state.rosterSnapshots.slice();
  const baseUpdated = state._rosterCloudBaseUpdated ?? null;
  try {
    localStorage.setItem(ROSTER_SNAPSHOTS_KEY, JSON.stringify(snapshots));
  } catch (e) {}
  syncRosterSnapshotsToFirestore(snapshots, baseUpdated);
}

function computeRosterDiff(oldMembers, newMembers) {
  const oldSet = new Set(oldMembers.map((n) => n.trim().toLowerCase()));
  const newSet = new Set(newMembers.map((n) => n.trim().toLowerCase()));
  const stayed = [],
    joined = [],
    left = [];
  newMembers.forEach((n) => {
    const key = n.trim().toLowerCase();
    if (oldSet.has(key)) stayed.push(n.trim());
    else joined.push(n.trim());
  });
  oldMembers.forEach((n) => {
    const key = n.trim().toLowerCase();
    if (!newSet.has(key)) left.push(n.trim());
  });
  return { stayed, joined, left };
}

function takeRosterSnapshot(namesText) {
  const members = namesText
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  if (!members.length) {
    logRosterEvent('adminLogRosterNoMembers', 'warn');
    return;
  }
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10);
  const prev = state.rosterSnapshots.length
    ? state.rosterSnapshots[state.rosterSnapshots.length - 1]
    : null;
  const diff = prev ? computeRosterDiff(prev.members, members) : null;
  const snapshot = { date: dateStr, members, diff };
  state.rosterSnapshots.push(snapshot);
  saveRosterSnapshots();
  localStorage.setItem(ROSTER_KEY, namesText);
  loadRoster();
  logRosterEvent('adminLogRosterSnapshotSaved', 'success', { count: members.length });
  renderRoster();
}

function deleteRosterSnapshot(index) {
  if (!confirm(adminT('adminRosterDeleteSnapshotConfirm'))) return;
  const [removed] = state.rosterSnapshots.splice(index, 1);
  pushUndoAction({
    label: adminT('adminRosterSnapshotsTitle'),
    undo: () => {
      state.rosterSnapshots.splice(index, 0, removed);
      saveRosterSnapshots();
      renderRoster();
      logRosterEvent('adminLogRosterSnapshotRestored', 'success');
    },
  });
  saveRosterSnapshots();
  renderRoster();
  logRosterEvent('adminLogRosterSnapshotDeleted', 'warn');
}

function loadAllianceList() {
  try {
    const raw = localStorage.getItem(ALLIANCE_KEY);
    if (raw) {
      const a = JSON.parse(raw);
      if (Array.isArray(a) && a.length === ALLIANCE_COUNT) state.allianceList = a;
    }
  } catch (e) {}
}

function saveAllianceList() {
  try {
    localStorage.setItem(ALLIANCE_KEY, JSON.stringify(state.allianceList));
  } catch (e) {}
}

function loadRosterAuth() {
  try {
    state._rosterLoggedUser = localStorage.getItem(ROSTER_AUTH_KEY) || '';
  } catch (e) {
    state._rosterLoggedUser = '';
  }
}

function saveRosterAuth() {
  try {
    localStorage.setItem(ROSTER_AUTH_KEY, state._rosterLoggedUser);
  } catch (e) {}
}

async function rosterLogin() {
  const user = $id('dashRosterLoginUser')?.value;
  const pass = $id('dashRosterLoginPass')?.value;
  if (!Object.keys(ROSTER_PASS_HASH).length) {
    logRosterEvent('adminLogRosterAuthUnavailable', 'error');
    return;
  }
  if (!user || !ROSTER_PASS_HASH[user]) {
    logRosterEvent('adminLogRosterLoginInvalid', 'error');
    return;
  }
  const hashed = await sha256(pass);
  if (hashed !== ROSTER_PASS_HASH[user]) {
    logRosterEvent('adminLogRosterLoginInvalid', 'error');
    return;
  }
  state._rosterLoggedUser = user;
  saveRosterAuth();
  logRosterEvent('adminLogRosterLoginSuccess', 'success');
  const ai = state.allianceList.indexOf(user);
  if (ai >= 0) state._rosterFilterAlliance = String(ai);
  renderRoster();
}

function rosterLogout() {
  state._rosterLoggedUser = '';
  saveRosterAuth();
  renderRoster();
}

function _ensureMember(m) {
  if (typeof m === 'string')
    return { name: m, status: 'unknown', alliance: -1, verifiedBy: '', lastModified: '' };
  if (m.alliance === undefined) m.alliance = -1;
  if (m.verifiedBy === undefined) m.verifiedBy = '';
  if (m.lastModified === undefined) m.lastModified = '';
  return m;
}

function setRosterStatus(snapIndex, memberIndex, status) {
  const snap = state.rosterSnapshots[snapIndex];
  if (!snap) return;
  let m = snap.members[memberIndex];
  if (!m) return;
  m = snap.members[memberIndex] = _ensureMember(m);
  if (status === 'spy' && m.status === 'spy') status = 'unknown';
  m.status = status;
  if (state._rosterLoggedUser) {
    m.verifiedBy = state._rosterLoggedUser;
    m.lastModified = new Date().toISOString();
  }
  saveRosterSnapshots();
  renderRoster();
}

function setRosterAlliance(snapIndex, memberIndex, allianceIdx) {
  const snap = state.rosterSnapshots[snapIndex];
  if (!snap) return;
  let m = snap.members[memberIndex];
  if (!m) return;
  m = snap.members[memberIndex] = _ensureMember(m);
  m.alliance = m.alliance === allianceIdx ? -1 : allianceIdx;
  if (state._rosterLoggedUser) {
    m.verifiedBy = state._rosterLoggedUser;
    m.lastModified = new Date().toISOString();
  }
  saveRosterSnapshots();
  renderRoster();
}

function toggleBulkCheck(mi) {
  if (state._rosterSelectedIndices.has(mi)) state._rosterSelectedIndices.delete(mi);
  else state._rosterSelectedIndices.add(mi);
  renderRoster();
}

function toggleBulkSelectAll(jsonStr) {
  const indices = JSON.parse(jsonStr);
  if (state._rosterSelectedIndices.size === indices.length) state._rosterSelectedIndices.clear();
  else
    indices.forEach(function (i) {
      state._rosterSelectedIndices.add(i);
    });
  renderRoster();
}

function applyBulkStatus(status) {
  if (!state._rosterSelectedIndices.size) return;
  const snap = state.rosterSnapshots[state.rosterSnapshots.length - 1];
  state._rosterSelectedIndices.forEach(function (mi) {
    let m = snap.members[mi];
    m = snap.members[mi] = _ensureMember(m);
    m.status = status;
    if (state._rosterLoggedUser) {
      m.verifiedBy = state._rosterLoggedUser;
      m.lastModified = new Date().toISOString();
    }
  });
  state._rosterSelectedIndices.clear();
  saveRosterSnapshots();
  renderRoster();
}

function applyBulkAlliance(allianceIdx) {
  if (!state._rosterSelectedIndices.size) return;
  const snap = state.rosterSnapshots[state.rosterSnapshots.length - 1];
  state._rosterSelectedIndices.forEach(function (mi) {
    let m = snap.members[mi];
    m = snap.members[mi] = _ensureMember(m);
    m.alliance = allianceIdx;
    if (state._rosterLoggedUser) {
      m.verifiedBy = state._rosterLoggedUser;
      m.lastModified = new Date().toISOString();
    }
  });
  state._rosterSelectedIndices.clear();
  saveRosterSnapshots();
  renderRoster();
}

function exportRosterCSV() {
  if (!state.rosterSnapshots.length) return;
  const latest = state.rosterSnapshots[state.rosterSnapshots.length - 1];
  let csv = 'Name,Status,Alliance,VerifiedBy,LastModified\n';
  latest.members.forEach(function (m) {
    const mem = _ensureMember(m);
    const a = mem.alliance >= 0 ? state.allianceList[mem.alliance] : '';
    csv +=
      '"' +
      mem.name +
      '","' +
      mem.status +
      '","' +
      a +
      '","' +
      (mem.verifiedBy || '') +
      '","' +
      (mem.lastModified || '') +
      '"\n';
  });
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'roster_export_' + new Date().toISOString().split('T')[0] + '.csv';
  a.click();
  URL.revokeObjectURL(url);
  logRosterEvent('adminLogRosterExported', 'success', {}, { source: 'export' });
}

function copyRosterNames(type) {
  if (!state.rosterSnapshots.length) return;
  const latest = state.rosterSnapshots[state.rosterSnapshots.length - 1];
  const names = latest.members
    .map(function (m) {
      return _ensureMember(m);
    })
    .filter(function (m) {
      return type === 'unassigned' ? m.alliance === -1 : m.status === type;
    })
    .map(function (m) {
      return m.name;
    })
    .join('\n');
  navigator.clipboard.writeText(names);
  logRosterEvent('adminLogRosterNamesCopied', 'success', {
    count: names.split('\n').length,
  });
}

function showRosterSnapshotModal(index) {
  const snap = state.rosterSnapshots[index];
  const diff = snap.diff;
  const m = $id('dashModal'),
    body = $id('dashModalBody');
  $id('dashModalTitle').textContent = adminT('adminRosterSnapshotTitle', { date: snap.date });
  $id('dashModalSub').textContent = adminT('adminRosterMemberCount', {
    count: snap.members.length,
  });
  let gridHtml = '';
  snap.members.forEach(function (mem) {
    const mObj = _ensureMember(mem);
    const name = mObj.name;
    const status = mObj.status;
    let cls = 'dash-roster-name';
    if (status === 'trusted') cls += ' trusted';
    if (status === 'spy') cls += ' spy';
    if (
      diff &&
      diff.joined.some(function (j) {
        return j.toLowerCase() === name.trim().toLowerCase();
      })
    )
      cls += ' joined';
    if (
      diff &&
      diff.left.some(function (l) {
        return l.toLowerCase() === name.trim().toLowerCase();
      })
    )
      cls += ' left';
    gridHtml += '<div class="' + cls + '"><span>' + esc(name) + '</span></div>';
  });
  body.innerHTML =
    '<div class="dash-roster-grid">' +
    gridHtml +
    `</div><div style="margin-top:12px;text-align:right"><button type="button" class="dash-btn" data-admin-action="close-modal">${esc(adminT('edenX1ModalClose'))}</button></div>`;
  bindAdminControls(body);
  m.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function configureAlliances() {
  const m = $id('dashModal'),
    body = $id('dashModalBody');
  $id('dashModalTitle').textContent = adminT('adminRosterConfigureAlliances');
  $id('dashModalSub').textContent = adminT('adminRosterConfigureAlliancesHint', {
    count: ALLIANCE_COUNT,
  });
  let inputsHtml = '';
  state.allianceList.forEach(function (a, i) {
    inputsHtml +=
      '<label style="display:flex;align-items:center;gap:8px;font-size:0.85rem"><span style="width:24px;font-weight:700;color:var(--text-muted)">' +
      (i + 1) +
      '</span><input id="dashAllianceInput' +
      i +
      '" class="dash-input" value="' +
      esc(a) +
      '" style="flex:1;padding:6px 10px"></label>';
  });
  body.innerHTML =
    '<div style="display:flex;flex-direction:column;gap:8px">' +
    inputsHtml +
    `<div style="display:flex;gap:8px;margin-top:8px"><button id="dashAllianceSaveBtn" class="dash-btn dash-btn-primary" style="flex:1">${esc(adminT('adminSave'))}</button><button id="dashAllianceCancelBtn" class="dash-btn" style="flex:1">${esc(adminT('adminCancel'))}</button></div></div>`;
  $id('dashAllianceSaveBtn').onclick = function () {
    for (var i = 0; i < ALLIANCE_COUNT; i++) {
      var v = $id('dashAllianceInput' + i);
      if (v && v.value.trim()) state.allianceList[i] = v.value.trim();
    }
    saveAllianceList();
    closeModal();
    renderRoster();
  };
  $id('dashAllianceCancelBtn').onclick = closeModal;
  m.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function renderRoster() {
  const body = $id('dashRosterBody');
  if (!body) return;
  bindAdminControls(body);
  if (!state.rosterSnapshots.length) {
    body.innerHTML = `<div class="dash-empty">${esc(adminT('adminRosterEmpty'))}</div>`;
    return;
  }
  const snapIndex = state.rosterSnapshots.length - 1;
  const latest = state.rosterSnapshots[snapIndex];
  const diff = latest.diff;
  const members = latest.members;
  function mn(m) {
    return typeof m === 'string' ? m : m.name;
  }
  function mstatus(m) {
    return typeof m === 'string' ? 'unknown' : m.status || 'unknown';
  }
  function malliance(m) {
    return typeof m === 'string' ? -1 : m.alliance !== undefined ? m.alliance : -1;
  }
  var trusted = 0,
    spy = 0,
    unknown = 0,
    assigned = 0;
  members.forEach(function (m) {
    var s = mstatus(m);
    if (s === 'trusted') trusted++;
    else if (s === 'spy') spy++;
    else unknown++;
    if (malliance(m) >= 0) assigned++;
  });
  var total = members.length;
  var unassigned = total - assigned;
  var ocrMap = {};
  if (state.dashData && state.dashData.players_summary) {
    state.dashData.players_summary.forEach(function (p) {
      ocrMap[p.name.toLowerCase()] = p;
    });
  }
  var filtered = [];
  members.forEach(function (m, mi) {
    var s = mstatus(m);
    var a = malliance(m);
    var name = mn(m);
    if (state._rosterFilterStatus !== 'all' && s !== state._rosterFilterStatus) return;
    if (state._rosterFilterAlliance !== 'all') {
      if (state._rosterFilterAlliance === 'unassigned' && a >= 0) return;
      if (
        state._rosterFilterAlliance !== 'unassigned' &&
        a !== parseInt(state._rosterFilterAlliance)
      )
        return;
    }
    if (
      state._rosterSearchQ &&
      name.toLowerCase().indexOf(state._rosterSearchQ.toLowerCase()) === -1
    )
      return;
    filtered.push({ mi: mi, name: name, status: s, alliance: a });
  });
  var isLoggedIn = !!state._rosterLoggedUser;
  var lockOpenIcon =
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>';
  var lockClosedIcon =
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>';
  var loginHtml = isLoggedIn
    ? '<div class="dash-roster-login-bar logged"><span class="dash-roster-login-user">' +
      lockOpenIcon +
      ' ' +
      esc(state._rosterLoggedUser) +
      `</span><button type="button" class="dash-btn dash-btn-sm" data-admin-action="roster-logout">${esc(adminT('adminRosterLogout'))}</button></div>`
    : '<div class="dash-roster-login-bar"><span>' +
      lockClosedIcon +
      ` ${esc(adminT('adminRosterLogin'))}:</span><select id="dashRosterLoginUser">` +
      ROSTER_USERS.map(function (u) {
        return '<option value="' + u + '">' + u + '</option>';
      }).join('') +
      `</select><input type="password" id="dashRosterLoginPass" aria-label="${esc(adminT('adminLoginPass'))}" placeholder="${esc(adminT('adminLoginPass'))}" value="" class="dash-input dash-roster-login-pass" style="width:90px"><button type="button" class="dash-btn dash-btn-sm" data-admin-action="roster-login">${esc(adminT('adminRosterLoginAction'))}</button></div>`;
  var bulkHtml = '';
  if (state._rosterSelectedIndices.size > 0 && isLoggedIn) {
    var allyOpts = state.allianceList
      .map(function (a, i) {
        return '<option value="' + i + '">' + esc(a) + '</option>';
      })
      .join('');
    bulkHtml =
      '<div class="dash-roster-bulk-actions"><span style="font-size:0.8rem;font-weight:bold;color:var(--brand)">' +
      state._rosterSelectedIndices.size +
      ` ${esc(adminT('adminRosterSelected'))}:</span><button type="button" class="dash-btn dash-btn-sm" data-admin-action="apply-bulk-status" data-status="trusted">${esc(adminT('adminRosterMarkTrusted'))}</button><button type="button" class="dash-btn dash-btn-sm" data-admin-action="apply-bulk-status" data-status="spy">${esc(adminT('adminRosterMarkSpy'))}</button><button type="button" class="dash-btn dash-btn-sm" data-admin-action="apply-bulk-status" data-status="unknown">${esc(adminT('adminRosterClearStatus'))}</button><select class="dash-input dash-roster-bulk-select" style="width:100px" aria-label="${esc(adminT('adminRosterAssignTo'))}" data-admin-action="apply-bulk-alliance"><option value="">${esc(adminT('adminRosterAssignTo'))}</option><option value="-1">— ${esc(adminT('adminRosterUnassign'))} —</option>` +
      allyOpts +
      '</select></div>';
  }
  var filterAllyOpts = state.allianceList
    .map(function (a, i) {
      return (
        '<option value="' +
        i +
        '"' +
        (state._rosterFilterAlliance === String(i) ? ' selected' : '') +
        '>' +
        esc(a) +
        '</option>'
      );
    })
    .join('');
  var rowsHtml = '';
  var indicesJson = JSON.stringify(
    filtered.map(function (f) {
      return f.mi;
    })
  ).replace(/"/g, '&quot;');
  filtered.forEach(function (item) {
    var mi = item.mi,
      name = item.name,
      status = item.status,
      alliance = item.alliance;
    var m = members[mi];
    var vb = typeof m === 'string' ? '' : m.verifiedBy || '';
    var lm = typeof m === 'string' ? '' : m.lastModified || '';
    var rowCls = 'dash-roster-row';
    if (status === 'trusted') rowCls += ' trusted';
    if (status === 'spy') rowCls += ' spy';
    if (
      diff &&
      diff.joined.some(function (j) {
        return j.toLowerCase() === name.trim().toLowerCase();
      })
    )
      rowCls += ' joined';
    if (
      diff &&
      diff.left.some(function (l) {
        return l.toLowerCase() === name.trim().toLowerCase();
      })
    )
      rowCls += ' left';
    var disabledAttr = isLoggedIn ? '' : 'disabled';
    var swordIcon =
      '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:2px" aria-hidden="true"><path d="M14.5 17.5 3 6V3h3l11.5 11.5"/><path d="m13 19 6-6"/><path d="m16 16 4 4"/><path d="m19 21 2-2"/></svg>';
    var pStats = ocrMap[name.toLowerCase()];
    var ocrHtml = pStats
      ? '<span style="margin-left:6px;font-size:0.7rem;color:var(--brand-light)" title="' +
        pStats.total_demolition +
        ` ${esc(adminT('adminModalThDemolition'))} / ` +
        pStats.participation_count +
        ` ${esc(adminT('adminKpiHits'))}">` +
        swordIcon +
        ' ' +
        pStats.total_demolition +
        '</span>'
      : `<span style="margin-left:6px;font-size:0.7rem;opacity:0.25" title="${esc(adminT('adminRosterNoOcrData'))}">` +
        swordIcon +
        ' —</span>';
    var auditHtml = '';
    if (vb)
      auditHtml +=
        `<span class="dash-roster-row-vb" title="${esc(adminT('adminRosterVerifiedBy', { officer: vb, date: lm ? lm.slice(0, 10) : '—' }))}">@` +
        esc(vb) +
        '</span>';
    var allySelectHtml =
      '<select class="dash-roster-row-alliance" ' +
      disabledAttr +
      ' data-admin-action="set-roster-alliance" data-snapshot-index="' +
      snapIndex +
      '" data-member-index="' +
      mi +
      '"><option value="-1">—</option>' +
      state.allianceList
        .map(function (a, ai) {
          return (
            '<option value="' +
            ai +
            '"' +
            (alliance === ai ? ' selected' : '') +
            '>' +
            esc(a) +
            '</option>'
          );
        })
        .join('') +
      '</select>';
    rowsHtml +=
      '<div class="' +
      rowCls +
      '"><label style="margin-right:8px;display:flex;align-items:center;cursor:pointer"><input type="checkbox" class="bulk-cb" data-admin-action="toggle-bulk-check" data-member-index="' +
      mi +
      '"' +
      (state._rosterSelectedIndices.has(mi) ? ' checked' : '') +
      ' ' +
      disabledAttr +
      '></label><span class="dash-roster-row-name" style="flex:1">' +
      esc(name) +
      ocrHtml +
      '</span>' +
      allySelectHtml +
      auditHtml +
      '<span class="dash-roster-row-spy' +
      (status === 'spy' ? ' active' : '') +
      '" role="button" tabindex="0" data-admin-action="set-roster-status" data-snapshot-index="' +
      snapIndex +
      '" data-member-index="' +
      mi +
      '" data-status="spy"' +
      (isLoggedIn ? '' : ' aria-disabled="true"') +
      ` title="${esc(adminT('adminRosterToggleSpy'))}">🚫</span></div>`;
  });
  var historyHtml = '';
  for (var i = state.rosterSnapshots.length - 2; i >= 0; i--) {
    var s = state.rosterSnapshots[i];
    var d = s.diff;
    historyHtml += `<div class="dash-roster-history-item"><span class="dash-roster-history-date">${esc(s.date)}</span><span class="dash-roster-history-count">${s.members.length}</span>${
      d
        ? `<span class="dash-roster-history-diff">+${d.joined.length}/-${d.left.length}</span>`
        : '<span class="dash-roster-history-diff" style="opacity:0.4">—</span>'
    }<button type="button" class="dash-btn" style="padding:2px 8px;font-size:0.7rem" data-admin-action="show-roster-snapshot" data-snapshot-index="${i}">${esc(adminT('adminRosterView'))}</button><button type="button" class="dash-banner-del-btn" data-admin-action="delete-roster-snapshot" data-snapshot-index="${i}" title="${esc(adminT('adminDelete'))}">✕</button></div>`;
  }
  if (!historyHtml)
    historyHtml = `<div style="padding:8px;font-size:0.8rem;color:var(--text-muted)">${esc(adminT('adminRosterNoOlderSnapshots'))}</div>`;
  const allSelected =
    state._rosterSelectedIndices.size > 0 && state._rosterSelectedIndices.size === filtered.length;
  body.innerHTML = `${loginHtml}
    <div class="dash-roster-summary">
      <span class="dash-roster-summary-total">${esc(adminT('adminRosterTotal', { count: total }))}</span>
      <span class="dash-roster-summary-trusted">✅ ${esc(adminT('adminRosterTrustedCount', { count: trusted }))}</span>
      <span class="dash-roster-summary-unknown">⬜ ${esc(adminT('adminRosterUnknownCount', { count: unknown }))}</span>
      <span class="dash-roster-summary-spy">🚫 ${esc(adminT('adminRosterSpyCount', { count: spy }))}</span>
      <span class="dash-roster-summary-assigned">📋 ${esc(adminT('adminRosterAssignedCount', { count: assigned }))}</span>
      <span class="dash-roster-summary-unassigned">❓ ${esc(adminT('adminRosterUnassignedCount', { count: unassigned }))}</span>
      <button type="button" class="dash-banner-del-btn" data-admin-action="delete-roster-snapshot" data-snapshot-index="${snapIndex}" title="${esc(adminT('adminRosterDeleteCurrentSnapshot'))}" style="margin-left:auto">✕</button>
    </div>
    <div class="dash-roster-toolbar">
      <div class="dash-roster-toolbar-filters">
        <label class="dash-roster-toolbar-label">${esc(adminT('adminRosterAlliance'))} <select data-admin-action="set-roster-filter" data-filter-key="alliance"><option value="all">${esc(adminT('adminRosterAll'))}</option>${filterAllyOpts}<option value="unassigned"${state._rosterFilterAlliance === 'unassigned' ? ' selected' : ''}>${esc(adminT('adminRosterUnassigned'))}</option></select></label>
        <label class="dash-roster-toolbar-label">${esc(adminT('adminRosterStatus'))} <select data-admin-action="set-roster-filter" data-filter-key="status"><option value="all">${esc(adminT('adminRosterAll'))}</option><option value="trusted"${state._rosterFilterStatus === 'trusted' ? ' selected' : ''}>${esc(adminT('adminRosterTrusted'))}</option><option value="unknown"${state._rosterFilterStatus === 'unknown' ? ' selected' : ''}>${esc(adminT('adminRosterUnknown'))}</option><option value="spy"${state._rosterFilterStatus === 'spy' ? ' selected' : ''}>${esc(adminT('adminRosterSpy'))}</option></select></label>
        <input type="text" aria-label="${esc(adminT('adminRosterSearchName'))}" placeholder="${esc(adminT('adminRosterSearchName'))}" value="${esc(state._rosterSearchQ)}" data-admin-action="set-roster-filter" data-filter-key="search" class="dash-input dash-roster-search-input" style="width:140px">
      </div>
      <div class="dash-roster-toolbar-actions">${bulkHtml}<button type="button" class="dash-btn dash-btn-sm" data-admin-action="configure-alliances" title="${esc(adminT('adminRosterEditAllianceNames'))}">⚙️</button><button type="button" class="dash-btn dash-btn-sm" data-admin-action="copy-roster-names" data-roster-type="unassigned" title="${esc(adminT('adminRosterCopyUnassigned'))}">📋 ${esc(adminT('adminRosterUnassigned'))}</button><button type="button" class="dash-btn dash-btn-sm" data-admin-action="copy-roster-names" data-roster-type="spy" title="${esc(adminT('adminRosterCopySpies'))}">📋 ${esc(adminT('adminRosterSpies'))}</button></div>
    </div>
    <div class="dash-roster-checklist">
      <div style="padding:4px 12px;border-bottom:1px solid var(--border);margin-bottom:4px;display:flex;align-items:center"><input type="checkbox" title="${esc(adminT('adminRosterSelectAllVisible'))}" data-admin-action="toggle-bulk-select-all" data-indices="${indicesJson}"${allSelected ? ' checked' : ''} style="margin-right:12px"><span style="font-size:0.75rem;color:var(--text-muted);font-weight:bold">${esc(adminT('adminRosterSelectAllVisible'))}</span></div>
      ${rowsHtml}${filtered.length === 0 ? `<div class="dash-roster-empty">${esc(adminT('adminRosterNoFilterMatches'))}</div>` : ''}
    </div>
    <div class="dash-roster-total-rows">${esc(adminT('adminRosterShowingMembers', { shown: filtered.length, total }))}</div>
    <div class="dash-roster-history"><div class="dash-roster-history-head" role="button" tabindex="0" data-admin-action="toggle-roster-history"><span>📁 ${esc(adminT('adminRosterSnapshotHistory', { count: state.rosterSnapshots.length - 1 }))}</span><span class="dash-roster-history-arrow">▶</span></div><div class="dash-roster-history-body">${historyHtml}</div></div>`;
}

function loadBannerRecords() {
  try {
    const raw = localStorage.getItem(BANNER_KEY);
    state.bannerRecords = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(state.bannerRecords)) state.bannerRecords = [];
  } catch (e) {
    state.bannerRecords = [];
  }
}

function saveBannerRecords(options = {}) {
  if (blockArchiveMirrorWrite('save banner records')) return Promise.resolve(false);
  try {
    localStorage.setItem(BANNER_KEY, JSON.stringify(state.bannerRecords));
  } catch (e) {}
  return syncDashboardAuxiliaryRecords(options);
}

function showBannerForm(existingIndex = null) {
  const m = $id('dashModal'),
    body = $id('dashModalBody');
  if (m && m.parentElement && !document.getElementById('ocrDashModalPortal')) {
    const portal = document.createElement('div');
    portal.id = 'ocrDashModalPortal';
    const fakeRoot = document.createElement('div');
    fakeRoot.id = 'ocrDashboardRoot';
    m.remove();
    fakeRoot.appendChild(m);
    portal.appendChild(fakeRoot);
    document.body.appendChild(portal);
  }
  const edit = existingIndex !== null && state.bannerRecords[existingIndex];
  beginAdminEditSurface(edit ? 'banner-edit' : 'banner-create');
  $id('dashModalTitle').textContent = adminT(edit ? 'adminBannerEditDay' : 'adminBannerNewDay');
  $id('dashModalSub').textContent = edit ? '' : adminT('adminBannerFormHint');
  const roster = state.rosterSnapshots.length
    ? state.rosterSnapshots[state.rosterSnapshots.length - 1].members
    : [];
  const memberOptions = canonicalizePlayerOptionNames(roster)
    .map((name) => `<option value="${esc(name)}">${esc(name)}</option>`)
    .join('');
  const rec = edit
    ? state.bannerRecords[existingIndex]
    : { date: new Date().toISOString().slice(0, 10), event: '', teams: {} };
  const teamNames = Object.keys(rec.teams);
  body.innerHTML = `<div class="dash-banner-form-row">
    <label>${esc(adminT('adminDutyDateLabel'))}</label>
    <input type="date" id="dashBannerFormDate" value="${rec.date}" style="flex:1">
  </div>
  <div class="dash-banner-form-row">
    <label>${esc(adminT('adminBannerEvent'))}</label>
    <input type="text" id="dashBannerFormEvent" value="${esc(rec.event || '')}" placeholder="${esc(adminT('adminBannerEventPh'))}" style="flex:1">
  </div>
  <div style="margin:1rem 0;padding:1rem;background:var(--surface);border:1px solid var(--border);border-radius:12px">
    <div style="font-size:0.75rem;font-weight:700;color:var(--text-muted);margin-bottom:0.75rem;text-transform:uppercase;letter-spacing:0.05em">${esc(adminT('adminBannerAssignments'))}</div>
    <div id="dashBannerTeamsList">
      ${
        teamNames.length
          ? teamNames
              .map(
                (team, ti) => `<div class="dash-banner-form-row" data-team-idx="${ti}">
        <label>${esc(adminT('adminBannerTeam'))}</label>
        <input type="text" class="dash-banner-team-name" value="${esc(team)}" placeholder="${esc(adminT('adminBannerTeamPh'))}" style="flex:1">
        <label style="min-width:40px">${esc(adminT('adminContributionMember'))}</label>
        <select class="dash-banner-team-members" multiple style="flex:2;min-height:60px">${memberOptions}</select>
        <button class="dash-banner-del-btn dash-banner-remove-team" style="font-size:1rem">✕</button>
      </div>`
              )
              .join('')
          : `<div style="color:var(--text-dim);font-size:0.85rem;text-align:center;padding:1rem">${esc(adminT('adminBannerNoTeams'))}</div>`
      }
    </div>
    <button id="dashBannerAddTeamBtn" class="dash-btn" style="margin-top:0.5rem;width:100%">+ ${esc(adminT('adminBannerAddTeam'))}</button>
  </div>
  <div style="display:flex;gap:0.5rem">
    <button id="dashBannerSaveBtn" class="dash-btn dash-btn-primary" style="flex:1">${esc(adminT(edit ? 'adminBannerUpdateDay' : 'adminBannerSaveDay'))}</button>
    <button id="dashBannerFormCancelBtn" class="dash-btn" style="flex:1">${esc(adminT('adminCancel'))}</button>
  </div>`;

  $id('dashBannerAddTeamBtn').onclick = () => {
    const list = $id('dashBannerTeamsList');
    const firstEmpty = list.querySelector('.dash-empty');
    if (firstEmpty) firstEmpty.remove();
    const div = document.createElement('div');
    div.className = 'dash-banner-form-row';
    div.innerHTML = `<label>${esc(adminT('adminBannerTeam'))}</label>
      <input type="text" class="dash-banner-team-name" value="" placeholder="${esc(adminT('adminBannerTeamPh'))}" style="flex:1">
      <label style="min-width:40px">${esc(adminT('adminContributionMember'))}</label>
      <select class="dash-banner-team-members" multiple style="flex:2;min-height:60px">${memberOptions}</select>
      <button class="dash-banner-del-btn dash-banner-remove-team" style="font-size:1rem">✕</button>`;
    div.querySelector('.dash-banner-remove-team').onclick = () => div.remove();
    list.appendChild(div);
  };
  document
    .querySelectorAll('.dash-banner-remove-team')
    .forEach((btn) => (btn.onclick = () => btn.closest('.dash-banner-form-row').remove()));

  $id('dashBannerSaveBtn').onclick = async () => {
    const date = $id('dashBannerFormDate').value;
    const event = $id('dashBannerFormEvent').value.trim();
    const teamRows = document.querySelectorAll('#dashBannerTeamsList .dash-banner-form-row');
    const teams = {};
    let hasError = false;
    teamRows.forEach((row) => {
      const name = row.querySelector('.dash-banner-team-name').value.trim();
      if (!name) return;
      const sel = row.querySelector('.dash-banner-team-members');
      const members = Array.from(sel.selectedOptions).map((o) => o.value);
      if (!members.length) return;
      teams[name] = members;
    });
    if (!Object.keys(teams).length) {
      alert(adminT('adminBannerTeamRequired'));
      return;
    }
    const record = { date, event, teams };
    if (edit) {
      state.bannerRecords[existingIndex] = record;
    } else {
      state.bannerRecords.push(record);
    }
    const saveBtn = $id('dashBannerSaveBtn');
    const saveLabel = saveBtn?.textContent || '';
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = adminT('edenX1VoteSavingShort');
    }
    const synced = await saveBannerRecords({ immediate: true, awaitCloud: true });
    if (keepFormOpenAfterSyncConflict(saveBtn, saveLabel)) return;
    closeModal();
    renderBanners();
    if (edit) logRosterEvent('adminLogBannerUpdated', 'success');
    else logRosterEvent('adminLogBannerSaved', 'success');
    notifySpecialListCloudResult(synced, adminT('adminBannerNewDay'));
  };
  $id('dashBannerFormCancelBtn').onclick = closeModal;
  m.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function deleteBannerRecord(index) {
  if (!confirm(adminT('adminBannerDeleteConfirm'))) return;
  state.bannerRecords.splice(index, 1);
  saveBannerRecords();
  renderBanners();
  logRosterEvent('adminLogBannerDeleted', 'warn');
}

function renderBanners() {
  const body = $id('dashBannerBody');
  if (!body) return;
  bindAdminControls(body);
  if (!state.bannerRecords.length) {
    body.innerHTML = `<div class="dash-empty">${esc(adminT('adminBannerEmptyDetailed'))}</div>`;
    return;
  }
  let html = '';
  for (let i = state.bannerRecords.length - 1; i >= 0; i--) {
    const rec = state.bannerRecords[i];
    const teamEntries = Object.entries(rec.teams);
    const totalMembers = teamEntries.reduce((s, [, m]) => s + m.length, 0);
    html += `<div class="dash-banner-card">
      <div class="dash-banner-head">
        <div class="dash-banner-date">
          <span>${esc(rec.date)}</span>
          ${rec.event ? `<span class="dash-banner-event">${esc(rec.event)}</span>` : ''}
          <span class="dash-banner-count">${esc(adminT('adminBannerTeamPlayerCount', { teams: teamEntries.length, players: totalMembers }))}</span>
        </div>
        <div style="display:flex;gap:6px">
          <button type="button" class="dash-btn" style="padding:4px 10px;font-size:0.72rem;min-height:0" data-admin-action="edit-banner" data-index="${i}">${esc(adminT('adminEdit'))}</button>
          <button type="button" class="dash-banner-del-btn" data-admin-action="delete-banner" data-index="${i}" title="${esc(adminT('adminDelete'))}">✕</button>
        </div>
      </div>
      <div class="dash-banner-body">
        <table class="dash-banner-table dash-banner-team-table">
          <thead><tr><th>${esc(adminT('adminBannerTeam'))}</th><th>${esc(adminT('adminContributionMember'))}</th><th>${esc(adminT('adminBannerCount'))}</th></tr></thead>
          <tbody>
            ${teamEntries
              .map(
                ([team, members]) => `<tr>
              <td><span class="dash-banner-team-tag" style="background:${getTeamColor(team)};color:#fff">${esc(team)}</span></td>
              <td>${members.map((m) => esc(m)).join(', ')}</td>
              <td style="text-align:right;font-weight:700;color:var(--text-muted)">${members.length}</td>
            </tr>`
              )
              .join('')}
          </tbody>
        </table>
      </div>
    </div>`;
  }
  body.innerHTML = html;
  hydrateDashboardTableLabels(body);
}

function getTeamColor(teamName) {
  const colors = {
    dawn: '#f59e0b',
    dusk: '#6366f1',
    ice: '#06b6d4',
    fire: '#ef4444',
    frost: '#0ea5e9',
    ember: '#f97316',
    storm: '#8b5cf6',
    shadow: '#6b7280',
    light: '#eab308',
    void: '#8b5cf6',
    crystal: '#14b8a6',
    iron: '#64748b',
  };
  const key = teamName.toLowerCase().trim();
  return colors[key] || `hsl(${Math.abs(hashCode(teamName)) % 360}, 55%, 50%)`;
}

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    hash = (hash << 5) - hash + c;
    hash |= 0;
  }
  return Math.abs(hash);
}

const DUTY_TYPES = {
  banner: {
    labelKey: 'adminBannerListTitle',
    singularKey: 'adminDutyBannerSingular',
    bodyId: 'dashBannerListBody',
    progressId: 'dashBannerListProgress',
    progressTextId: 'dashBannerListProgressText',
  },
  pather: {
    labelKey: 'adminPatherListTitle',
    singularKey: 'adminDutyPlanSingular',
    bodyId: 'dashPatherListBody',
    progressId: 'dashPatherListProgress',
    progressTextId: 'dashPatherListProgressText',
    recordTypes: ['pather', 'speed_tile'],
  },
  speed_tile: {
    labelKey: 'adminPatherListTitle',
    singularKey: 'adminDutyPlanSingular',
    bodyId: 'dashPatherListBody',
    progressId: 'dashPatherListProgress',
    progressTextId: 'dashPatherListProgressText',
  },
  shield_wall: {
    labelKey: 'adminShieldWallTitle',
    singularKey: 'adminDutyShieldWallSingular',
    bodyId: 'dashShieldWallBody',
  },
};

function dutyLabel(type) {
  const meta = DUTY_TYPES[type];
  return meta ? adminT(meta.labelKey) : '';
}

function dutySingular(type) {
  const meta = DUTY_TYPES[type];
  return meta ? adminT(meta.singularKey) : '';
}

function loadDutyRecords() {
  try {
    const raw = localStorage.getItem(DUTY_LIST_KEY);
    state.dutyRecords = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(state.dutyRecords)) state.dutyRecords = [];
  } catch (e) {
    state.dutyRecords = [];
  }
}

function saveDutyRecords(options = {}) {
  if (blockArchiveMirrorWrite('save duty records')) return Promise.resolve(false);
  try {
    localStorage.setItem(DUTY_LIST_KEY, JSON.stringify(state.dutyRecords));
  } catch (e) {}
  return syncDashboardAuxiliaryRecords(options);
}

function getRosterMemberName(member) {
  if (!member) return '';
  if (typeof member === 'string') return member.trim();
  return String(member.name || '').trim();
}

function getRosterDatabaseNames() {
  const names = [];
  const latest = state.rosterSnapshots.length
    ? state.rosterSnapshots[state.rosterSnapshots.length - 1]
    : null;
  if (latest && Array.isArray(latest.members)) {
    latest.members.forEach((member) => {
      const name = getRosterMemberName(member);
      if (name) names.push(name);
    });
  }
  if (Array.isArray(state.rosterNames)) {
    state.rosterNames.forEach((name) => {
      const text = String(name || '').trim();
      if (text) names.push(text);
    });
  }
  return canonicalizePlayerOptionNames(names);
}

function normalizeDutyName(name) {
  return compactPlayerIdentity(name);
}

function getDutySuggestions(rawName) {
  const roster = getRosterDatabaseNames();
  const raw = String(rawName || '').trim();
  if (!raw || !roster.length) return [];
  const canonical = findBestMatch(raw, 55);
  const rows = roster.map((name) => {
    const compactScore = getSimilarityAlphaNum(raw, name);
    const textScore = getSimilarity(raw.toLowerCase(), name.toLowerCase());
    const canonicalBoost = canonical === name ? 0.15 : 0;
    return { name, score: Math.min(1, Math.max(compactScore, textScore) + canonicalBoost) };
  });
  if (canonical && !rows.some((row) => row.name === canonical))
    rows.push({ name: canonical, score: 0.75 });
  return rows.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name)).slice(0, 8);
}

function getDutyMatchStatus(rawName, confirmedName) {
  if (!confirmedName) return 'unmatched';
  const rawKey = normalizeDutyName(rawName);
  const confirmedKey = normalizeDutyName(confirmedName);
  if (rawKey && rawKey === confirmedKey) return 'exact';
  const score = Math.max(
    getSimilarityAlphaNum(rawName, confirmedName),
    getSimilarity(String(rawName || '').toLowerCase(), String(confirmedName || '').toLowerCase())
  );
  if (score >= 0.72) return 'likely';
  if (score >= 0.45) return 'weak';
  return 'manual';
}

function parseDutyNamesFromText(text) {
  return parseDutyEntriesFromText(text).map((entry) => entry.name);
}

function normalizeDutyUsageTime(rawTime) {
  const text = String(rawTime || '').trim();
  if (!text) return '';
  const match = text.match(/^(\d{1,2})(?:[.:](\d{1,2}))?$/);
  if (!match) return text;
  const hour = Number(match[1]);
  const minute = Number(match[2] || 0);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return text;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return text;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function normalizeDutyGameTime(rawTime) {
  const text = String(rawTime || '').trim();
  if (!text) return '';
  const normalized = normalizeDutyUsageTime(text.replace(/\s*GT$/i, ''));
  return normalized ? `${normalized} GT` : text;
}

function splitDutyTargetAndName(text) {
  const raw = String(text || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!raw) return { target: '', name: '' };
  const match = raw.match(
    /^(?:(gate|gates|bridge|bridges|town|capital|stronghold|checkpoint|check\s*point)\s*(?:l|lv|lvl|level)?\s*\d*|(?:team)\s*\d+)(?:\s+(team\s*\d+))?\s+(.+)$/i
  );
  if (!match) return { target: '', name: raw };
  const target = [match[1] || '', match[2] || '']
    .map((part) => String(part || '').trim())
    .filter(Boolean)
    .join(' ');
  const name = String(match[3] || '').trim();
  return name ? { target, name } : { target: '', name: raw };
}

function parseDutyEntryFromLine(line, context = {}) {
  let text = String(line || '')
    .replace(/^\s*[-*\u2022]+/, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return null;
  if (/^@all\b/i.test(text)) return null;
  if (/^speed\s+tile\s+order:?$/i.test(text)) return null;

  let order = '';
  const orderMatch = text.match(/^(\d+)[.)-]\s*/);
  if (orderMatch) {
    order = orderMatch[1];
    text = text.slice(orderMatch[0].length).trim();
  }

  let usageTime = '';
  const timeMatch = text.match(/^\+?\s*(\d{1,2}(?:[.:]\d{1,2})?)\b/);
  if (timeMatch) {
    usageTime = normalizeDutyUsageTime(timeMatch[1]);
    text = text.slice(timeMatch[0].length).trim();
  } else if (!order) {
    text = text.replace(/^\s*\d+[.)-]\s*/, '').trim();
  }

  const checked = /[✅✓✔]/.test(text);
  text = text
    .replace(/[✅✓✔]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  let pad = '';
  text = text
    .replace(/\[Pad:\s*([^\]]+)\]/i, (_, value) => {
      pad = String(value || '').trim();
      return ' ';
    })
    .replace(/\s+/g, ' ')
    .trim();

  const bracketValues = [];
  text = text
    .replace(/\[([^\]]+)\]/g, (_, value) => {
      const clean = String(value || '').trim();
      if (clean) bracketValues.push(clean);
      return ' ';
    })
    .replace(/\s+/g, ' ')
    .trim();

  let name = '';
  const atMatch = text.match(/@(.+)$/);
  if (atMatch) {
    name = atMatch[1].trim();
    text = text.slice(0, atMatch.index).trim();
  } else {
    const split = splitDutyTargetAndName(text);
    name = split.name;
    text = split.target;
  }

  const target = text.replace(/\s+/g, ' ').trim();
  name = name.replace(/^@+/, '').trim();
  if (!name || name.length <= 1) return null;
  return {
    name,
    original: line,
    usageTime,
    target,
    group: context.group || '',
    groupCount: context.groupCount || '',
    order,
    pad,
    checked,
    allowedColors: bracketValues.join(', '),
  };
}

function parseDutyEntriesFromText(text) {
  const entries = [];
  const context = { group: '', groupCount: '' };
  String(text || '')
    .split(/\r?\n|,/)
    .forEach((line) => {
      const groupMatch = String(line || '')
        .trim()
        .match(/^([^:[\]]+):(?:\s*\[([^\]]+)\])?\s*$/);
      if (groupMatch && !/^\d+[.)-]/.test(String(line || '').trim())) {
        context.group = groupMatch[1].trim();
        context.groupCount = String(groupMatch[2] || '').trim();
        return;
      }
      const entry = parseDutyEntryFromLine(line, context);
      if (entry) entries.push(entry);
    });
  const seen = new Set();
  return entries.filter((entry) => {
    const key =
      `${entry.name}|${entry.usageTime}|${entry.target}|${entry.group}|${entry.order}|${entry.pad}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function parseDutyEntriesFromOcrText(text) {
  return parseDutyEntriesFromText(text).filter(
    (entry) => entry.usageTime || entry.target || String(entry.original || '').includes('@')
  );
}

function showDutyPasteForm(type) {
  const meta = DUTY_TYPES[type];
  if (!meta) return;
  const label = dutyLabel(type);
  const text = prompt(adminT('adminDutyPastePrompt', { label }), '');
  if (text === null) return;
  const entries = parseDutyEntriesFromText(text);
  if (!entries.length) {
    logRosterEvent('adminDutyNoNamesLog', 'warn', { label }, { localOnly: true });
    return;
  }
  showDutyConfirmModal(type, entries, adminT('adminDutyManualPaste'));
}

function normalizeDutyEntries(input) {
  const rows = Array.isArray(input) ? input : [];
  return rows
    .map((item) => {
      if (item && typeof item === 'object') {
        const original = String(item.original || item.name || '').trim();
        const name = String(item.name || item.original || item.confirmed || '').trim();
        return {
          name,
          original: original || name,
          confirmed: String(item.confirmed || '').trim(),
          usageTime: normalizeDutyUsageTime(item.usageTime || item.usage_time || item.time || ''),
          target: String(item.target || item.structure || item.location || '').trim(),
          group: String(item.group || item.color || item.tileColor || item.tile_color || '').trim(),
          groupCount: String(
            item.groupCount || item.group_count || item.count || item.capacity || ''
          ).trim(),
          order: String(item.order || item.index || '').trim(),
          pad: String(item.pad || item.padLocation || item.pad_location || '').trim(),
          checked: Boolean(item.checked || item.done || item.confirmedUsage),
          allowedColors: Array.isArray(item.allowedColors || item.allowed_colors)
            ? (item.allowedColors || item.allowed_colors).join(', ')
            : String(item.allowedColors || item.allowed_colors || '').trim(),
          status: item.status || '',
        };
      }
      const name = String(item || '').trim();
      return {
        name,
        original: name,
        confirmed: '',
        usageTime: '',
        target: '',
        group: '',
        groupCount: '',
        order: '',
        pad: '',
        checked: false,
        allowedColors: '',
        status: '',
      };
    })
    .filter((entry) => entry.name);
}

function renderDutyMatchRows(entries) {
  return entries
    .map((entry, index) => {
      const rawName = entry.name;
      const suggestions = getDutySuggestions(rawName);
      const best = entry.confirmed || suggestions[0]?.name || '';
      const status = getDutyMatchStatus(rawName, best);
      const options = [`<option value="">${esc(adminT('adminDutyMatchUnmatchedOption'))}</option>`]
        .concat(
          suggestions.map(
            (row) =>
              `<option value="${esc(row.name)}"${row.name === best ? ' selected' : ''}>${esc(row.name)} (${Math.round(row.score * 100)}%)</option>`
          )
        )
        .join('');
      return `<div class="dash-duty-match-row" data-raw="${esc(entry.original || rawName)}" data-name="${esc(rawName)}" data-order="${esc(entry.order || '')}" data-checked="${entry.checked ? '1' : ''}" data-allowed-colors="${esc(entry.allowedColors || '')}">
      <div class="dash-duty-raw"><div class="dash-duty-raw-meta"><span>${esc(adminT('adminDutyUploaded'))} #${index + 1}</span><button class="dash-duty-remove-row" type="button" data-duty-remove-row>${esc(adminT('adminDelete'))}</button></div><strong>${esc(rawName)}</strong><small>${esc(status)}</small></div>
      <label class="dash-match-field"><span class="dash-match-label">${esc(adminT('adminDutyRosterMatch'))}</span><select class="dash-duty-match-select" name="dutyMatch[]">${options}</select></label>
      <label class="dash-match-field"><span class="dash-match-label">${esc(adminT('adminDutyManualCorrectionPh'))}</span><input class="dash-duty-manual-input" name="dutyManualName[]" type="text" placeholder="${esc(adminT('adminDutyManualCorrectionPh'))}" value="${entry.confirmed && !suggestions.some((row) => row.name === entry.confirmed) ? esc(entry.confirmed) : ''}" autocomplete="off"></label>
      <label class="dash-match-field"><span class="dash-match-label">${esc(adminT('adminDutyTime'))}</span><input class="dash-duty-time-input" name="dutyTime[]" type="text" inputmode="numeric" placeholder="HH:MM" value="${esc(entry.usageTime || '')}" title="${esc(adminT('adminDutyUsageTimeTitle'))}" autocomplete="off"></label>
      <label class="dash-match-field"><span class="dash-match-label">${esc(adminT('adminDutyTarget'))}</span><input class="dash-duty-target-input" name="dutyTarget[]" type="text" placeholder="${esc(adminT('adminDutyTarget'))}" value="${esc(entry.target || '')}" title="${esc(adminT('adminDutyTargetTitle'))}" autocomplete="off"></label>
      <label class="dash-match-field"><span class="dash-match-label">${esc(adminT('adminDutyGroup'))}</span><input class="dash-duty-group-input" name="dutyGroup[]" type="text" placeholder="${esc(adminT('adminDutyGroup'))}" value="${esc(entry.group || '')}" title="${esc(adminT('adminDutyGroupTitle'))}" autocomplete="off"></label>
      <label class="dash-match-field"><span class="dash-match-label">${esc(adminT('adminDutyPad'))}</span><input class="dash-duty-pad-input" name="dutyPad[]" type="text" placeholder="${esc(adminT('adminDutyPad'))}" value="${esc(entry.pad || '')}" title="${esc(adminT('adminDutyPadTitle'))}" autocomplete="off"></label>
    </div>`;
    })
    .join('');
}

function showDutyConfirmModal(type, names, sourceLabel = '', existingRecordId = null) {
  const meta = DUTY_TYPES[type];
  if (!meta) return;
  const cleanEntries = normalizeDutyEntries(names);
  if (!cleanEntries.length) return;
  const existingRecord = existingRecordId
    ? state.dutyRecords.find((record) => record.id === existingRecordId)
    : null;
  beginAdminEditSurface(existingRecord ? 'duty-edit' : 'duty-create');
  const m = $id('dashModal'),
    body = $id('dashModalBody');
  const label = dutyLabel(type);
  const singular = dutySingular(type);
  $id('dashModalTitle').textContent = adminT(
    existingRecord ? 'adminDutyEditTitle' : 'adminDutyConfirmTitle',
    { label }
  );
  $id('dashModalSub').textContent = adminT('adminDutyConfirmSub', { count: cleanEntries.length });
  body.innerHTML = `<div class="dash-banner-form-row">
    <label>${esc(adminT('adminDutyDateLabel'))}</label>
    <input type="date" id="dashDutyDate" name="dutyDate" value="${existingRecord?.date || new Date().toISOString().slice(0, 10)}" style="flex:1">
  </div>
  <div class="dash-banner-form-row">
    <label>${esc(adminT('adminDutyNoteLabel'))}</label>
    <input type="text" id="dashDutyNote" name="dutyNote" value="${esc(existingRecord?.note || sourceLabel)}" placeholder="${esc(adminT('adminDutyNotePh'))}" autocomplete="off" style="flex:1">
  </div>
  <div class="dash-banner-form-row">
    <label>${esc(adminT('adminDutyGameTimeLabel'))}</label>
    <input type="text" id="dashDutyGameTime" name="dutyGameTime" value="${esc(existingRecord?.gameTime || '')}" placeholder="${esc(adminT('adminDutyGameTimePh'))}" inputmode="numeric" autocomplete="off" style="flex:1">
  </div>
  <div class="dash-duty-match-list">${renderDutyMatchRows(cleanEntries)}</div>
  <div style="display:flex;gap:0.5rem;margin-top:1rem">
    <button id="dashDutySaveBtn" class="dash-btn dash-btn-primary" style="flex:1">${esc(adminT(existingRecord ? 'adminDutyUpdateRecord' : 'adminDutySaveRecord', { singular }))}</button>
    <button id="dashDutyCancelBtn" class="dash-btn" style="flex:1">${esc(adminT('adminCancel'))}</button>
  </div>`;
  const updateDutyDraftCount = () => {
    const count = body.querySelectorAll('.dash-duty-match-row').length;
    $id('dashModalSub').textContent = adminT('adminDutyConfirmSub', { count });
    const saveBtn = $id('dashDutySaveBtn');
    if (saveBtn) saveBtn.disabled = count === 0;
  };
  body.querySelector('.dash-duty-match-list')?.addEventListener('click', (event) => {
    if (!event.target.closest('[data-duty-remove-row]')) return;
    event.target.closest('.dash-duty-match-row')?.remove();
    updateDutyDraftCount();
  });
  updateDutyDraftCount();
  $id('dashDutySaveBtn').onclick = async () => {
    const entries = Array.from(body.querySelectorAll('.dash-duty-match-row')).map((row) => {
      const original = row.dataset.raw || '';
      const rawName = row.dataset.name || original;
      const manual = row.querySelector('.dash-duty-manual-input')?.value.trim() || '';
      const selected = row.querySelector('.dash-duty-match-select')?.value || '';
      const confirmed = manual || selected;
      const usageTime = normalizeDutyUsageTime(
        row.querySelector('.dash-duty-time-input')?.value || ''
      );
      const target = row.querySelector('.dash-duty-target-input')?.value.trim() || '';
      const group = row.querySelector('.dash-duty-group-input')?.value.trim() || '';
      const pad = row.querySelector('.dash-duty-pad-input')?.value.trim() || '';
      const order = row.dataset.order || '';
      const checked = row.dataset.checked === '1';
      const allowedColors = row.dataset.allowedColors || '';
      return {
        name: rawName,
        original,
        confirmed,
        usageTime,
        target,
        group,
        order,
        pad,
        checked,
        allowedColors,
        status: getDutyMatchStatus(rawName, confirmed),
        note: '',
      };
    });
    if (!entries.length) {
      logRosterEvent('adminDutyNoNamesLog', 'warn', { label }, { localOnly: true });
      updateDutyDraftCount();
      return;
    }
    const record = {
      id: existingRecord?.id || `${type}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type,
      date: $id('dashDutyDate')?.value || new Date().toISOString().slice(0, 10),
      gameTime: normalizeDutyGameTime($id('dashDutyGameTime')?.value || ''),
      note: $id('dashDutyNote')?.value.trim() || '',
      entries,
      createdAt: existingRecord?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    if (existingRecord) {
      const index = state.dutyRecords.findIndex((item) => item.id === existingRecord.id);
      if (index >= 0) state.dutyRecords[index] = record;
    } else {
      state.dutyRecords.push(record);
    }
    const saveBtn = $id('dashDutySaveBtn');
    const saveLabel = saveBtn?.textContent || '';
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = adminT('edenX1VoteSavingShort');
    }
    const synced = await saveDutyRecords({ immediate: true, awaitCloud: true });
    if (keepFormOpenAfterSyncConflict(saveBtn, saveLabel)) return;
    closeModal();
    renderDutyRecords();
    refreshDashboardOverview();
    if (existingRecord) {
      logRosterEvent(
        'adminDutyUpdatedLog',
        'success',
        { label, count: entries.length },
        { localOnly: true }
      );
    } else {
      logRosterEvent(
        'adminDutySavedLog',
        'success',
        { label, count: entries.length },
        { localOnly: true }
      );
    }
    notifySpecialListCloudResult(synced, label);
  };
  $id('dashDutyCancelBtn').onclick = closeModal;
  m.classList.add('active');
  document.body.style.overflow = 'hidden';
}

async function processDutyImages(type, files) {
  const meta = DUTY_TYPES[type];
  if (!meta) return;
  const label = dutyLabel(type);
  if (state._dutyProcessing) {
    logRosterEvent('adminDutyOcrAlreadyRunning', 'warn');
    return;
  }
  const valid = getSupportedOcrImageFiles(files);
  if (!valid.length) {
    const rejected = describeRejectedOcrImageFiles(files);
    if (rejected.length) {
      logRosterEvent(
        'adminLogDutyUnsupportedFiles',
        'warn',
        { count: rejected.length },
        { localOnly: true }
      );
    } else {
      logRosterEvent('adminDutyNoImageSelectedLog', 'warn', { label }, { localOnly: true });
    }
    return;
  }
  state._dutyProcessing = true;
  const progress = meta.progressId ? $id(meta.progressId) : null;
  const progressText = meta.progressTextId ? $id(meta.progressTextId) : null;
  if (progress) progress.classList.remove('hidden');
  logRosterEvent(
    'adminDutyScanningImagesLog',
    'info',
    { count: valid.length, label },
    { localOnly: true }
  );
  let allEntries = [];
  for (let i = 0; i < valid.length; i++) {
    const file = valid[i];
    if (progressText)
      progressText.textContent = adminT('adminDutyScanningImageProgress', {
        label,
        current: i + 1,
        total: valid.length,
      });
    const imageUrl = await readOcrImageDataUrl(file);
    try {
      const promptTxt = `Extract duty usage rows from this ${label} screenshot.

Return ONLY valid JSON in this shape:
{"entries":[{"name":"Name One","time":"23:25","target":"Gate l5","group":"Pink","order":"1","pad":"1253:645","checked":true,"allowedColors":"Red, light blue, brown"}]}

Rules:
- Include every visible player name or nickname.
- When a row starts with a time like +23.25, +23:55, +2, +2.35, +3, +4, or +8, convert it to HH:MM as the "time" field.
- Put the structure or assignment between the time and name in "target", for example "Gate l5", "Gate l2", or "bridge".
- For speed tile plans, preserve section headings like Pink, Yellow, Light Green, Dark Green, or Other as "group"; preserve list order numbers as "order"; preserve [Pad: 1253:645] as "pad"; preserve color brackets as "allowedColors"; set "checked" true when a green check mark is visible.
- If the row has no target, use an empty string.
- Ignore headers, roles, scores, alliance names, and decorative text.
- Preserve symbols and spacing in names when visible.
- Remove duplicates.
- If no player names are visible, return {"entries":[]}.`;
      const raw = await qwenVisionRequest([
        {
          role: 'user',
          content: [
            { type: 'text', text: promptTxt },
            { type: 'image_url', image_url: { url: imageUrl } },
          ],
        },
      ]);
      const text = raw?.choices?.[0]?.message?.content || '';
      const cleaned = text
        .replace(/```(?:json)?\s*/gi, '')
        .replace(/```/g, '')
        .trim();
      let parsed;
      try {
        parsed = tryRepairJson(cleaned);
      } catch (e) {
        parsed = parseDutyEntriesFromText(cleaned);
      }
      const entries = Array.isArray(parsed)
        ? parsed.every((item) => typeof item === 'string')
          ? parseDutyEntriesFromText(parsed.join('\n'))
          : normalizeDutyEntries(parsed)
        : Array.isArray(parsed?.entries)
          ? normalizeDutyEntries(parsed.entries)
          : Array.isArray(parsed?.names)
            ? parseDutyEntriesFromText(parsed.names.join('\n'))
            : [];
      allEntries.push(...(entries.length ? entries : parseDutyEntriesFromOcrText(cleaned)));
    } catch (e) {
      logRosterEvent(
        'adminDutyOcrErrorLog',
        'error',
        {
          label,
          file: file.name,
          error: describeOcrRequestError(e, adminT),
        },
        { file: file.name, localOnly: true }
      );
    }
  }
  if (progress) progress.classList.add('hidden');
  state._dutyProcessing = false;
  const unique = normalizeDutyEntries(allEntries);
  if (!unique.length) {
    logRosterEvent('adminDutyNoNamesInImagesLog', 'warn', { label }, { localOnly: true });
    alert(adminT('adminDutyExtractFailedAlert', { label }));
    return;
  }
  showDutyConfirmModal(type, unique, valid.map((f) => f.name).join(', '));
}

function editDutyRecord(id) {
  const record = state.dutyRecords.find((item) => item.id === id);
  if (!record) return;
  const entries = (record.entries || []).map((entry) => ({
    ...entry,
    name: entry.name || entry.confirmed || entry.original || '',
  }));
  showDutyConfirmModal(record.type, entries, record.note || '', record.id);
}

function deleteDutyRecord(id) {
  const index = state.dutyRecords.findIndex((record) => record.id === id);
  if (index < 0) return;
  if (!confirm(adminT('adminDutyDeleteConfirm'))) return;
  state.dutyRecords.splice(index, 1);
  saveDutyRecords();
  renderDutyRecords();
  refreshDashboardOverview();
  logRosterEvent('adminDutyDeletedLog', 'warn');
}

function dutyRecordTypesFor(type) {
  const meta = DUTY_TYPES[type];
  return meta?.recordTypes || [type];
}

function dutyRecordsForType(type) {
  const recordTypes = dutyRecordTypesFor(type);
  return (state.dutyRecords || []).filter((record) => recordTypes.includes(record.type));
}

function summarizeDutyValues(values, limit = 3) {
  const clean = Array.from(
    new Set(values.map((value) => String(value || '').trim()).filter(Boolean))
  );
  if (!clean.length) return '<span style="color:var(--text-dim)">--</span>';
  const visible = clean.slice(0, limit).map(esc).join(', ');
  return clean.length > limit ? `${visible} +${clean.length - limit}` : visible;
}

const DUTY_SUMMARY_STATUS_KEYS = ['exact', 'manual', 'likely', 'weak', 'unmatched'];
const DUTY_SUMMARY_STATUS_LABELS = Object.freeze({
  exact: 'Exact',
  manual: 'Manual',
  likely: 'Likely',
  weak: 'Weak',
  unmatched: 'Unmatched',
});

function normalizeDutySummaryStatus(value) {
  const status = String(value || '')
    .trim()
    .toLowerCase();
  if (!status) return '';
  if (status === 'exact' || status === 'matched') return 'exact';
  if (status === 'likely') return 'likely';
  if (status === 'weak') return 'weak';
  if (status === 'manual' || status === 'review') return 'manual';
  if (status === 'unmatched') return 'unmatched';
  return 'manual';
}

function getDutyEntrySummaryStatus(entry) {
  const explicit = normalizeDutySummaryStatus(entry?.status);
  if (explicit) return explicit;
  const raw = entry?.original || entry?.name || '';
  const confirmed = entry?.confirmed || entry?.name || '';
  return normalizeDutySummaryStatus(getDutyMatchStatus(raw, confirmed)) || 'unmatched';
}

function emptyDutySummaryStatusCounts() {
  return Object.fromEntries(DUTY_SUMMARY_STATUS_KEYS.map((key) => [key, 0]));
}

function buildDutySummaryStatusCounts(records = []) {
  const counts = emptyDutySummaryStatusCounts();
  records.forEach((record) => {
    const status = getDutyEntrySummaryStatus(record);
    counts[status] = (counts[status] || 0) + 1;
  });
  return counts;
}

function dutySummaryReviewCount(row) {
  const counts = row?.statusCounts || {};
  return DUTY_SUMMARY_STATUS_KEYS.filter((key) => key !== 'exact').reduce(
    (sum, key) => sum + (counts[key] || 0),
    0
  );
}

function formatDutyStatusBreakdown(counts = {}) {
  const parts = DUTY_SUMMARY_STATUS_KEYS.filter((key) => counts[key]).map(
    (key) => `${DUTY_SUMMARY_STATUS_LABELS[key]} ${counts[key]}`
  );
  if (!parts.length) return '<span style="color:var(--text-dim)">--</span>';
  return parts.map(esc).join(' / ');
}

function getDutyEntryCreditedNames(entry) {
  const raw = entry?.name || entry?.original || '';
  const confirmed = String(entry?.confirmed || '').trim();
  return confirmed ? getDutyCreditedNames(raw, confirmed) : expandDutyRawNames(raw);
}

function resolveDutySummaryIdentity(name) {
  try {
    const identity = resolveCanonicalPlayerIdentity(name);
    return {
      ...identity,
      playerKey: getSpecialAccountIdentityKey(identity.playerName, identity.playerKey),
    };
  } catch {
    const playerName = String(name || '').trim();
    const playerKey = getSpecialAccountIdentityKey(playerName, compactPlayerIdentity(playerName));
    return playerKey ? { playerKey, playerName } : null;
  }
}

function collectDutyPlayerSummary(records) {
  const rows = [];
  records.forEach((record) => {
    const entries = Array.isArray(record.entries) ? record.entries : [];
    entries.forEach((entry) => {
      // Confirmed rows still go through the duty resolver so owner/operator
      // dual credit and special account identity stay consistent.
      const credited = getDutyEntryCreditedNames(entry);
      credited.forEach((name) => {
        rows.push({
          ...entry,
          name,
          time: entry.usageTime || record.gameTime,
          status: getDutyEntrySummaryStatus(entry),
        });
      });
    });
  });
  return summarizeCanonicalPlayerRecords(rows, {
    timeField: 'time',
    preserveSpecialAccounts: true,
  }).map((row) => ({
    ...row,
    statusCounts: buildDutySummaryStatusCounts(row.records),
  }));
}

function buildDutyContributionLookup() {
  const model = buildWeightedContributionRows({
    contributionRecords: state.contributionRecords,
    dutyRecords: state.dutyRecords,
    r5Adjustments: state.r5Adjustments,
    season: state.r5Season,
    exGuildContributions: state.exGuildContributions,
  });
  const byPlayerKey = new Map();
  const byFamilyKey = new Map();
  (model.rows || []).forEach((row) => {
    if (!row?.playerKey) return;
    byPlayerKey.set(row.playerKey, row);
    const familyKey = getWeightedPlayerFamilyKey(row.playerKey);
    if (!familyKey) return;
    if (row.isPrimaryAccount || !byFamilyKey.has(familyKey)) {
      byFamilyKey.set(familyKey, row);
    }
  });
  return { record: model.record, byPlayerKey, byFamilyKey };
}

function getDutyContributionTarget(row, lookup) {
  if (!row?.playerKey || !lookup) return null;
  const familyKey = getWeightedPlayerFamilyKey(row.playerKey);
  return (
    (familyKey ? lookup.byFamilyKey.get(familyKey) : null) ||
    lookup.byPlayerKey.get(row.playerKey) ||
    null
  );
}

function renderDutyContributionTarget(row, lookup) {
  const recordEntries = Array.isArray(lookup?.record?.entries) ? lookup.record.entries : [];
  if (!recordEntries.length) {
    return `<span class="dash-duty-contribution-miss">${esc(adminT('adminDutyContributionNoSnapshot'))}</span>`;
  }
  const target = getDutyContributionTarget(row, lookup);
  if (!target) {
    return `<span class="dash-duty-contribution-miss">${esc(adminT('adminDutyContributionNoMatch'))}</span>`;
  }
  const name = target.playerName || target.sourceName || '';
  const rank = target.currentRank ? `<small>#${esc(target.currentRank)}</small>` : '';
  const familyCredit =
    target.playerKey !== row.playerKey
      ? `<small>${esc(adminT('adminDutyContributionFamilyCredit'))}</small>`
      : '';
  return `<span class="dash-duty-contribution-target"><strong>${esc(name)}</strong>${rank}${familyCredit}</span>`;
}

function summarizeDutySourceNames(row) {
  const playerKey = String(row?.playerKey || '').trim();
  const seen = new Set();
  const names = [];
  (Array.isArray(row?.records) ? row.records : []).forEach((record) => {
    const raw = String(record?.original || record?.rawName || record?.name || '').trim();
    if (!raw) return;
    const rawKey = compactPlayerIdentity(raw);
    if (rawKey && rawKey === playerKey) return;
    const sourceKey = rawKey || raw.toLowerCase();
    if (seen.has(sourceKey)) return;
    seen.add(sourceKey);
    names.push(raw);
  });
  return names;
}

function renderDutyMatchedPlayerCell(row) {
  const playerName = row?.playerName || '';
  const sources = summarizeDutySourceNames(row).slice(0, 3);
  const sourceHtml = sources.length
    ? `<small class="dash-duty-source-names">${esc(adminT('adminDutyUploaded'))}: ${summarizeDutyValues(sources, 3)}</small>`
    : '';
  return `<span class="dash-duty-player-stack">
    <strong class="dash-duty-cell-value">${esc(playerName)}</strong>
    <span class="dash-duty-match-confirm"><span>${esc(adminT('adminExGuildMatchTo'))}</span><b>${esc(playerName)}</b></span>
    ${sourceHtml}
  </span>`;
}

function renderDutyPlayerSummary(type, hostId, contributionLookup = buildDutyContributionLookup()) {
  const host = $id(hostId);
  if (!host) return;
  const records = dutyRecordsForType(type).slice().reverse();
  if (!records.length) {
    host.innerHTML = '';
    return;
  }
  const rows = collectDutyPlayerSummary(records);
  const totalRows = rows.reduce((sum, row) => sum + row.entries, 0);
  const reviewRows = rows.reduce((sum, row) => sum + dutySummaryReviewCount(row), 0);
  const latest = records[0]?.date || '--';
  host.innerHTML = `<div class="dash-duty-upload-summary">
    <div class="dash-duty-summary-kpis">
      <div class="dash-duty-summary-kpi"><strong>${records.length}</strong><span>${esc(adminT('adminSummaryUploads'))}</span></div>
      <div class="dash-duty-summary-kpi"><strong>${totalRows}</strong><span>${esc(adminT('adminSummaryEntries'))}</span></div>
      <div class="dash-duty-summary-kpi"><strong>${reviewRows}</strong><span>${esc(adminT('adminSummaryReview'))}</span></div>
      <div class="dash-duty-summary-kpi"><strong>${rows.length}</strong><span>${esc(adminT('adminSummaryPlayers'))}</span></div>
      <div class="dash-duty-summary-kpi"><strong>${esc(latest)}</strong><span>${esc(adminT('adminSummaryLatest'))}</span></div>
    </div>
    <div class="dash-duty-summary-table-wrap">
      <table class="dash-duty-summary-table">
        <thead><tr><th>${esc(adminT('adminDutySummaryPlayer'))}</th><th>${esc(adminT('adminDutyContributionTarget'))}</th><th>${esc(adminT('adminDutySummaryEntries'))}</th><th>${esc(adminT('adminDutyStatus'))}</th><th>${esc(adminT('adminDutySummaryTimes'))}</th></tr></thead>
        <tbody>${rows
          .map(
            (row) => `<tr>
          <td>${renderDutyMatchedPlayerCell(row)}</td>
          <td><span class="dash-duty-cell-value">${renderDutyContributionTarget(row, contributionLookup)}</span></td>
          <td><span class="dash-duty-cell-value">${row.entries}</span></td>
          <td><span class="dash-duty-cell-value dash-duty-status-breakdown">${formatDutyStatusBreakdown(row.statusCounts)}</span></td>
          <td><span class="dash-duty-cell-value dash-duty-times">${summarizeDutyValues(row.times, 8)}</span></td>
        </tr>`
          )
          .join('')}</tbody>
      </table>
    </div>
  </div>`;
  hydrateDashboardTableLabels(host);
}
function renderDutyType(type) {
  const meta = DUTY_TYPES[type];
  const body = meta ? $id(meta.bodyId) : null;
  if (!meta || !body) return;
  bindAdminControls(body);
  const recordTypes = meta.recordTypes || [type];
  const records = (state.dutyRecords || [])
    .filter((record) => recordTypes.includes(record.type))
    .slice()
    .reverse();
  if (!records.length) {
    body.innerHTML = `<div class="dash-empty">${esc(adminT('adminDutyEmptyRecords', { label: dutyLabel(type) }))}</div>`;
    return;
  }
  body.innerHTML = records
    .map((record) => {
      const entries = Array.isArray(record.entries) ? record.entries : [];
      const confirmed = entries.filter((entry) => entry.confirmed).length;
      const weak = entries.filter(
        (entry) => entry.status === 'weak' || entry.status === 'unmatched'
      ).length;
      const rawNote = String(record.note || '').trim();
      const displayNote = getContributionDisplayNote(rawNote, entries.length);
      return `<div class="dash-banner-card">
      <div class="dash-banner-head">
        <div class="dash-banner-date">
          <span>${esc(record.date || '')}</span>
          <span class="dash-banner-event">${esc(dutySingular(record.type) || dutySingular(type))}</span>
          ${record.gameTime ? `<span class="dash-banner-event">${esc(record.gameTime)}</span>` : ''}
          ${displayNote ? `<span class="dash-banner-event" title="${esc(rawNote)}">${esc(displayNote)}</span>` : ''}
          <span class="dash-banner-count">${esc(adminT('adminDutyMatchedCount', { confirmed, total: entries.length }))}${weak ? `, ${esc(adminT('adminDutyReviewCount', { count: weak }))}` : ''}</span>
        </div>
        <div style="display:flex;gap:6px">
          <button type="button" class="dash-btn" style="padding:4px 10px;font-size:0.72rem;min-height:0" data-admin-action="edit-duty" data-record-id="${esc(record.id)}">${esc(adminT('adminEdit'))}</button>
          <button type="button" class="dash-banner-del-btn" data-admin-action="delete-duty" data-record-id="${esc(record.id)}" title="${esc(adminT('adminDelete'))}">x</button>
        </div>
      </div>
      <div class="dash-banner-body">
        <table class="dash-banner-table dash-duty-detail-table">
          <thead><tr><th>${esc(adminT('adminDutyGroup'))}</th><th>${esc(adminT('adminDutyOrder'))}</th><th>${esc(adminT('adminDutyTime'))}</th><th>${esc(adminT('adminDutyTarget'))}</th><th>${esc(adminT('adminDutyPad'))}</th><th>${esc(adminT('adminDutyUploaded'))}</th><th>${esc(adminT('adminDutyRosterMatch'))}</th><th>${esc(adminT('adminDutyStatus'))}</th></tr></thead>
          <tbody>${entries
            .map(
              (entry) => `<tr>
            <td><span class="dash-duty-cell-value">${entry.group ? esc(entry.group) : '<span style="color:var(--text-dim)">--</span>'}</span></td>
            <td><span class="dash-duty-cell-value">${entry.order ? esc(entry.order) : entry.checked ? 'checked' : '<span style="color:var(--text-dim)">--</span>'}</span></td>
            <td><span class="dash-duty-cell-value">${entry.usageTime ? esc(entry.usageTime) : '<span style="color:var(--text-dim)">--</span>'}</span></td>
            <td><span class="dash-duty-cell-value">${entry.target ? esc(entry.target) : '<span style="color:var(--text-dim)">--</span>'}</span></td>
            <td><span class="dash-duty-cell-value">${entry.pad ? esc(entry.pad) : entry.allowedColors ? esc(entry.allowedColors) : '<span style="color:var(--text-dim)">--</span>'}</span></td>
            <td><span class="dash-duty-cell-value">${esc(entry.original || entry.name || '')}</span></td>
            <td><span class="dash-duty-cell-value">${entry.confirmed ? esc(entry.confirmed) : `<span style="color:var(--text-dim)">${esc(adminT('adminDutyUnmatched'))}</span>`}</span></td>
            <td><span class="dash-duty-cell-value">${esc(entry.status || 'unmatched')}</span></td>
          </tr>`
            )
            .join('')}</tbody>
        </table>
      </div>
    </div>`;
    })
    .join('');
  hydrateDashboardTableLabels(body);
}

function renderDutySummary() {
  const host = $id('dashDutySummary');
  if (!host) return;
  const counts = new Map();
  (state.dutyRecords || []).forEach((record) => {
    (record.entries || []).forEach((entry) => {
      const credited = getDutyEntryCreditedNames(entry);
      credited.forEach((name) => {
        const identity = resolveDutySummaryIdentity(name);
        if (!identity) return;
        if (!counts.has(identity.playerKey))
          counts.set(identity.playerKey, {
            name: identity.playerName,
            total: 0,
            banner: 0,
            pather: 0,
            speed_tile: 0,
            shield_wall: 0,
          });
        const row = counts.get(identity.playerKey);
        row.total += 1;
        if (row[record.type] !== undefined) row[record.type] += 1;
      });
    });
  });
  const rows = Array.from(counts.values())
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name))
    .slice(0, 12);
  host.innerHTML = rows.length
    ? rows
        .map(
          (row) =>
            `<div class="dash-duty-summary-row"><strong>${esc(row.name)}</strong><span>${esc(adminT('adminDutyTotalLabel', { count: row.total }))}</span><small>B ${row.banner} / ${esc(adminT('adminDutyPlanAbbrev'))} ${row.pather + row.speed_tile} / ${esc(adminT('adminDutyShieldWallAbbrev'))} ${row.shield_wall}</small></div>`
        )
        .join('')
    : `<div class="dash-empty">${esc(adminT('adminDutySummaryEmpty'))}</div>`;
}

function renderDutyRecords() {
  const contributionLookup = buildDutyContributionLookup();
  renderDutyPlayerSummary('banner', 'dashBannerListSummary', contributionLookup);
  renderDutyPlayerSummary('pather', 'dashPatherListSummary', contributionLookup);
  renderDutyPlayerSummary('shield_wall', 'dashShieldWallListSummary', contributionLookup);
  renderDutyType('banner');
  renderDutyType('pather');
  renderDutyType('shield_wall');
  renderDutySummary();
}

function loadContributionRecords() {
  try {
    const raw = localStorage.getItem(CONTRIBUTION_KEY);
    state.contributionRecords = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(state.contributionRecords)) state.contributionRecords = [];
  } catch (e) {
    state.contributionRecords = [];
  }
}

function saveContributionRecords(options = {}) {
  if (blockArchiveMirrorWrite('save contribution records')) return Promise.resolve(false);
  try {
    localStorage.setItem(CONTRIBUTION_KEY, JSON.stringify(state.contributionRecords || []));
  } catch (e) {}
  return syncDashboardAuxiliaryRecords(options);
}

export function loadExGuildContributions() {
  try {
    const raw = localStorage.getItem(EX_GUILD_CONTRIBUTION_KEY);
    state.exGuildContributions = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(state.exGuildContributions)) state.exGuildContributions = [];
  } catch (e) {
    state.exGuildContributions = [];
  }
}

function saveExGuildContributions(options = {}) {
  if (blockArchiveMirrorWrite('save ex-guild contributions')) return Promise.resolve(false);
  try {
    localStorage.setItem(
      EX_GUILD_CONTRIBUTION_KEY,
      JSON.stringify(state.exGuildContributions || [])
    );
  } catch (e) {}
  return syncDashboardAuxiliaryRecords(options);
}

function backupExGuildContributions(reason = 'edit') {
  const entries = cloneExGuildEntries(state.exGuildContributions);
  if (!entries.length) return;
  try {
    localStorage.setItem(
      EX_GUILD_BACKUP_KEY,
      JSON.stringify({ createdAt: new Date().toISOString(), reason, entries })
    );
  } catch (e) {}
}

function normalizeRecoverableExGuildCandidate(source, label, createdAt = '') {
  const entries = Array.isArray(source?.entries)
    ? source.entries
    : Array.isArray(source)
      ? source
      : [];
  const cleanEntries = cloneExGuildEntries(entries).filter(
    (entry) => entry && typeof entry === 'object' && (entry.playerName || entry.name)
  );
  if (!cleanEntries.length) return null;
  return { label, createdAt: source?.createdAt || createdAt || '', entries: cleanEntries };
}

function readStoredJson(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function getRecoverableExGuildCandidate() {
  const candidates = [];
  const backup = normalizeRecoverableExGuildCandidate(
    readStoredJson(EX_GUILD_BACKUP_KEY),
    'local backup'
  );
  if (backup) candidates.push(backup);

  const dashboardCache = readStoredJson(STORAGE_KEY);
  const cached = normalizeRecoverableExGuildCandidate(
    dashboardCache?.exGuildContributions,
    'dashboard cache',
    dashboardCache?.last_updated || ''
  );
  if (cached) candidates.push(cached);

  const retryQueue = readStoredJson(DASHBOARD_CLOUD_RETRY_QUEUE_KEY, []);
  if (Array.isArray(retryQueue)) {
    retryQueue.forEach((entry) => {
      const candidate = normalizeRecoverableExGuildCandidate(
        entry?.payload?.exGuildContributions,
        'pending cloud retry',
        entry?.createdAt || ''
      );
      if (candidate) candidates.push(candidate);
    });
  }

  return candidates.sort((a, b) =>
    String(b.createdAt || '').localeCompare(String(a.createdAt || ''))
  )[0];
}

async function restoreExGuildBackup() {
  const candidate = getRecoverableExGuildCandidate();
  if (!candidate?.entries?.length) {
    if (typeof window.showToast === 'function')
      window.showToast(adminT('adminExGuildBackupMissing'), 'warn', 3000);
    return;
  }
  state.exGuildContributions = cloneExGuildEntries(candidate.entries).map((entry) => ({
    id: entry.id || `exg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    playerName: entry.playerName || entry.name || '',
    contribution: entry.contribution || entry.value || entry.points || 0,
    sourceNote: entry.sourceNote || entry.note || candidate.label,
    matchedName: entry.matchedName || '',
  }));
  await saveExGuildContributions({ immediate: true, awaitCloud: true });
  renderContributions();
  refreshDashboardOverview();
  logRosterEvent('adminLogExGuildRestored', 'success', {
    count: state.exGuildContributions.length,
  });
  if (typeof window.showToast === 'function')
    window.showToast(adminT('adminExGuildRestored'), 'success', 2500);
}

function safeCompactPlayerIdentity(name) {
  try {
    return compactPlayerIdentity(name);
  } catch {
    return '';
  }
}

function normalizeExGuildSearchText(value) {
  return String(value || '')
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function buildExGuildMatchTargets(primaryRecord) {
  const targetMap = new Map();
  const primaryKeys = new Set();
  const primaryId = primaryRecord?.id || '';

  const addTarget = (rawName, meta = {}) => {
    const clean = stripGuildTagsFromPlayerName(String(rawName || '')).trim();
    if (!clean) return;
    const compact = safeCompactPlayerIdentity(clean);
    const key = compact || normalizeExGuildSearchText(clean);
    if (!key) return;
    const existing = targetMap.get(key);
    const priority = meta.priority ?? 9;
    const next = {
      key,
      value: clean,
      searchText: normalizeExGuildSearchText(clean),
      compact,
      rank: meta.rank || existing?.rank || '',
      guild: meta.guild || existing?.guild || '',
      recordLabel: meta.recordLabel || existing?.recordLabel || '',
      source: meta.source || existing?.source || adminT('adminContributionTitle'),
      priority,
    };
    if (existing && existing.priority <= priority) {
      targetMap.set(key, {
        ...existing,
        rank: existing.rank || next.rank,
        guild: existing.guild || next.guild,
        recordLabel: existing.recordLabel || next.recordLabel,
      });
    } else {
      targetMap.set(key, next);
    }
    if (meta.primary && compact) primaryKeys.add(compact);
  };

  (Array.isArray(state.contributionRecords) ? state.contributionRecords : []).forEach(
    (record, recordIndex) => {
      const recordLabel = getContributionRecordLabel(record, recordIndex);
      const isPrimary = Boolean(primaryId && record.id === primaryId);
      (Array.isArray(record.entries) ? record.entries : []).forEach((entry) => {
        addTarget(entry.name, {
          rank: entry.rank,
          guild: entry.guild,
          recordLabel,
          source: isPrimary
            ? adminT('adminExGuildSourceBaseContribution')
            : adminT('adminExGuildSourceContributionList'),
          priority: isPrimary ? 0 : 2,
          primary: isPrimary,
        });
      });
    }
  );
  (state.rosterNames || []).forEach((name) =>
    addTarget(name, {
      source: adminT('adminExGuildSourceRoster'),
      priority: 4,
      primary: false,
    })
  );

  return {
    primaryKeys,
    targets: Array.from(targetMap.values()).sort(
      (a, b) => a.priority - b.priority || String(a.value).localeCompare(String(b.value))
    ),
  };
}

function getPrimaryContributionRecord() {
  const records = Array.isArray(state.contributionRecords) ? state.contributionRecords : [];
  return records.find((record) => record.isPrimary) || records[records.length - 1] || null;
}

function getExGuildMatchContext() {
  const { primaryKeys, targets } = buildExGuildMatchTargets(getPrimaryContributionRecord());
  return { primaryKeys, targets };
}

function resolveExGuildMatch(entry, context = {}) {
  const cleanName = stripExGuildGuildTag(entry?.playerName || entry?.name || '');
  const manualMatch = String(entry?.matchedName || '').trim();
  let autoKey = '';
  try {
    autoKey = compactPlayerIdentity(cleanName);
  } catch {}
  const targets = Array.isArray(context.targets) ? context.targets : [];
  const primaryKeys = context.primaryKeys instanceof Set ? context.primaryKeys : new Set();
  const autoMatch = targets.find((target) => target.compact && target.compact === autoKey);
  const matchedName =
    manualMatch || (primaryKeys.has(autoKey) ? autoMatch?.value || cleanName : '');
  return {
    cleanName,
    manualMatch,
    autoKey,
    matchedName,
    exportName: matchedName || cleanName,
  };
}

function buildExGuildDebuffNames() {
  const context = getExGuildMatchContext();
  const seen = new Set();
  return (Array.isArray(state.exGuildContributions) ? state.exGuildContributions : [])
    .map((entry) => resolveExGuildMatch(entry, context).exportName.trim())
    .filter((name) => {
      if (!name) return false;
      const key = safeCompactPlayerIdentity(name) || normalizeExGuildSearchText(name);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function scoreExGuildMatchTarget(target, query, compactQuery) {
  if (!query && !compactQuery) return target.priority;
  if (target.searchText === query || (compactQuery && target.compact === compactQuery)) return 0;
  if (target.searchText.startsWith(query)) return 1;
  if (compactQuery && target.compact.startsWith(compactQuery)) return 2;
  if (target.searchText.includes(query)) return 3;
  if (compactQuery && target.compact.includes(compactQuery)) return 4;
  return Infinity;
}

function findExGuildMatchTargets(query) {
  const normalized = normalizeExGuildSearchText(query);
  const compact = safeCompactPlayerIdentity(query);
  return (state._exGuildMatchTargets || [])
    .map((target) => ({ target, score: scoreExGuildMatchTarget(target, normalized, compact) }))
    .filter((row) => Number.isFinite(row.score))
    .sort(
      (a, b) =>
        a.score - b.score ||
        a.target.priority - b.target.priority ||
        String(a.target.value).localeCompare(String(b.target.value))
    )
    .slice(0, EX_GUILD_MATCH_LIMIT)
    .map((row) => row.target);
}

function hideExGuildMatchResults(combo) {
  const results = combo?.querySelector('[data-exguild-match-results]');
  if (!results) return;
  results.hidden = true;
  results.innerHTML = '';
}

function showExGuildMatchResults(input) {
  const combo = input?.closest('[data-exguild-match]');
  const results = combo?.querySelector('[data-exguild-match-results]');
  if (!combo || !results) return;
  const matches = findExGuildMatchTargets(input.value);
  if (!matches.length) {
    results.hidden = false;
    results.innerHTML = `<div class="dash-xg-empty">${esc(adminT('adminExGuildNoContributionNames'))}</div>`;
    return;
  }
  results.hidden = false;
  results.innerHTML = matches
    .map(
      (
        target
      ) => `<button type="button" class="dash-xg-option" data-exguild-match-option data-value="${esc(target.value)}">
        <strong>${esc(target.value)}</strong>
        <span>${target.rank ? `#${esc(target.rank)} · ` : ''}${esc(target.guild || target.source)}${target.recordLabel ? ` · ${esc(target.recordLabel)}` : ''}</span>
      </button>`
    )
    .join('');
}

function commitExGuildMatchInput(input) {
  const id = input?.dataset?.entryId || '';
  if (!id) return;
  setExGuildMatch(id, input.value);
}

function bindExGuildMatchSearch(host) {
  if (host.dataset.exguildSearchBound === '1') return;
  host.dataset.exguildSearchBound = '1';
  host.addEventListener('focusin', (event) => {
    const input = event.target.closest('[data-exguild-match-input]');
    if (input) showExGuildMatchResults(input);
  });
  host.addEventListener('input', (event) => {
    const input = event.target.closest('[data-exguild-match-input]');
    if (input) showExGuildMatchResults(input);
  });
  host.addEventListener('keydown', (event) => {
    const input = event.target.closest('[data-exguild-match-input]');
    if (!input) return;
    if (event.key === 'Escape') {
      hideExGuildMatchResults(input.closest('[data-exguild-match]'));
      return;
    }
    if (event.key !== 'Enter') return;
    const option = input
      .closest('[data-exguild-match]')
      ?.querySelector('[data-exguild-match-option]');
    if (!option) return;
    event.preventDefault();
    input.value = option.dataset.value || '';
    commitExGuildMatchInput(input);
  });
  host.addEventListener('click', (event) => {
    const option = event.target.closest('[data-exguild-match-option]');
    if (option) {
      const combo = option.closest('[data-exguild-match]');
      const input = combo?.querySelector('[data-exguild-match-input]');
      if (input) {
        input.value = option.dataset.value || '';
        commitExGuildMatchInput(input);
      }
      return;
    }
    const clear = event.target.closest('[data-exguild-clear-match]');
    if (clear) {
      const combo = clear.closest('[data-exguild-match]');
      const input = combo?.querySelector('[data-exguild-match-input]');
      if (input) {
        input.value = '';
        commitExGuildMatchInput(input);
      }
    }
  });
  host.addEventListener('focusout', (event) => {
    const input = event.target.closest('[data-exguild-match-input]');
    if (!input) return;
    window.setTimeout(() => {
      const combo = input.closest('[data-exguild-match]');
      if (combo?.contains(document.activeElement)) return;
      hideExGuildMatchResults(combo);
      commitExGuildMatchInput(input);
    }, 120);
  });
}

function deleteExGuildEntry(id) {
  const previous = cloneExGuildEntries(state.exGuildContributions);
  const removed = previous.find((e) => e.id === id);
  if (!removed) return;
  backupExGuildContributions('delete-row');
  state.exGuildContributions = previous.filter((e) => e.id !== id);
  saveExGuildContributions();
  renderContributions();
  refreshDashboardOverview();
  pushUndoAction({
    label: adminT('adminExGuildRowLabel'),
    message: adminT('adminExGuildRowDeleted'),
    undo: async () => {
      state.exGuildContributions = previous;
      await saveExGuildContributions({ immediate: true, awaitCloud: true });
      renderContributions();
      refreshDashboardOverview();
      logRosterEvent('adminLogExGuildRowRestored', 'success');
    },
  });
}

function clearExGuildData() {
  const previous = cloneExGuildEntries(state.exGuildContributions);
  if (!previous.length) return;
  if (!confirm(`${adminT('adminExGuildClearAll')} (${previous.length})?`)) return;
  backupExGuildContributions('clear-all');
  state.exGuildContributions = [];
  saveExGuildContributions();
  renderContributions();
  refreshDashboardOverview();
  pushUndoAction({
    label: adminT('adminExGuildDataLabel'),
    message: adminT('adminExGuildEntriesCleared', { count: previous.length }),
    undo: async () => {
      state.exGuildContributions = previous;
      await saveExGuildContributions({ immediate: true, awaitCloud: true });
      renderContributions();
      refreshDashboardOverview();
      logRosterEvent('adminLogExGuildDataRestored', 'success');
    },
  });
}

// Manually map an ex-guild entry to a current roster player (empty = unmatched).
// The matched player receives the ex-guild contribution in the weighted table.
function setExGuildMatch(id, name) {
  const entry = (state.exGuildContributions || []).find((e) => e.id === id);
  if (!entry) return;
  const next = String(name || '').trim();
  if (String(entry.matchedName || '').trim() === next) return;
  entry.matchedName = next;
  saveExGuildContributions();
  renderContributions();
  refreshDashboardOverview();
}

function exportExGuildDebuffList() {
  const names = buildExGuildDebuffNames();
  if (!names.length) return;
  const blob = new Blob([`${names.join('\n')}\n`], { type: 'text/plain;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `vts_ex_guild_debuff_${new Date().toISOString().slice(0, 10)}.txt`;
  a.click();
  URL.revokeObjectURL(url);
  logRosterEvent(
    'adminExGuildDebuffExportedLog',
    'success',
    { count: names.length },
    { source: 'export' }
  );
}

function parseContributionValue(value) {
  const text = String(value || '').replace(/[^\d]/g, '');
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatContributionValue(value) {
  return parseContributionValue(value).toLocaleString();
}

function formatSignedContributionValue(value) {
  const parsed = Number(value || 0);
  const sign = parsed >= 0 ? '+' : '-';
  return `${sign}${formatContributionValue(Math.abs(parsed))}`;
}

function safeContributionFilenamePart(value) {
  return (
    String(value || 'snapshot')
      .replace(/[^a-z0-9_-]+/gi, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'snapshot'
  );
}

function refreshDashboardOverview() {
  if (typeof window.refreshOcrDashboardFromStorage === 'function') {
    window.refreshOcrDashboardFromStorage();
  }
}

async function syncDashboardAuxiliaryRecords(options = {}) {
  if (typeof window.syncDashboardAuxiliaryRecordsToCloud === 'function') {
    return window.syncDashboardAuxiliaryRecordsToCloud(options);
  }
  return false;
}

function notifySpecialListCloudResult(ok, label) {
  if (ok) return;
  const message = adminT('adminSpecialListSavedLocalOnly', { label });
  logRosterEvent('adminLogSpecialListLocalOnly', 'warn');
  alert(message);
}

function keepFormOpenAfterSyncConflict(saveButton, originalLabel) {
  if (typeof window.didDashboardAuxiliarySaveConflict !== 'function') return false;
  if (!window.didDashboardAuxiliarySaveConflict()) return false;
  if (saveButton) {
    saveButton.disabled = false;
    saveButton.textContent = originalLabel;
  }
  return true;
}

function normalizeRewardTier(value) {
  const tier = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '-');
  if (tier === 'premium' || tier === 'top' || tier === 'top-premium') return 'premium';
  if (tier === 'standard' || tier === 'normal') return 'standard';
  if (tier === 'review' || tier === 'manual') return 'review';
  if (tier === 'none' || tier === 'no-reward' || tier === 'skip') return 'none';
  return '';
}

function getContributionReward(entry, record) {
  const override = normalizeRewardTier(entry?.rewardOverride || entry?.reward);
  if (override) return override;
  const rank = Number(entry?.rank || 0);
  const cutoff = Number(record?.premiumCutoff || record?.premiumSlots || 20);
  return rank > 0 && rank <= cutoff ? 'premium' : 'standard';
}

function getContributionRewardLabel(tier) {
  return (
    {
      guild_master: adminT('adminContributionRewardGuildMaster'),
      core: adminT('adminContributionRewardCore'),
      power_house: adminT('adminContributionRewardPowerHouse'),
      members: adminT('adminContributionRewardMembers'),
      premium: adminT('adminContributionRewardPremium'),
      standard: adminT('adminContributionRewardStandard'),
      review: adminT('adminContributionRewardReview'),
      none: adminT('adminContributionRewardNone'),
    }[tier] || adminT('adminContributionRewardAuto')
  );
}

function normalizeContributionEntries(input) {
  const rows = Array.isArray(input) ? input : [];
  const seen = new Set();
  const normalized = rows
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const rank = Number(
        String(item.rank || item.order || item.index || '').replace(/[^\d]/g, '')
      );
      const name = normalizeContributionMemberName(
        item.name || item.member || item.player || item.members || ''
      );
      const guild = String(item.guild || item.alliance || item.team || '')
        .replace(/^guild\s*[:：]\s*/i, '')
        .trim();
      const contribution = parseContributionValue(
        item.contribution || item.value || item.points || item.total || item.score
      );
      const position = String(item.position || item.role || item.title || '').trim();
      const rewardOverride = normalizeRewardTier(item.rewardOverride || item.reward || '');
      if (!name || !contribution) return null;
      return {
        rank: Number.isFinite(rank) && rank > 0 ? rank : '',
        name,
        guild,
        contribution,
        position,
        rewardOverride,
      };
    })
    .filter(Boolean)
    .filter((entry) => {
      const key =
        `${entry.rank}|${compactPlayerIdentity(entry.name)}|${entry.contribution}|${entry.guild}`.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  return collapseContributionOcrDuplicates(normalized).sort(
    (a, b) => Number(a.rank || 9999) - Number(b.rank || 9999) || b.contribution - a.contribution
  );
}

function parseContributionEntriesFromText(text) {
  const entries = [];
  String(text || '')
    .split(/\r?\n/)
    .forEach((line) => {
      let row = String(line || '')
        .replace(/\s+/g, ' ')
        .trim();
      if (!row || /^(total contribution|members|contribution|position|my ranking)$/i.test(row))
        return;
      let rank = '';
      const rankMatch = row.match(/^#?\s*(\d{1,4})[\s.)-]+(.+)$/);
      if (rankMatch) {
        rank = Number(rankMatch[1]);
        row = rankMatch[2].trim();
      }
      const numericMatches = Array.from(row.matchAll(/\b\d{1,3}(?:,\d{3})+\b|\b\d{4,}\b/g));
      if (!numericMatches.length) return;
      const valueMatch = numericMatches[numericMatches.length - 1];
      const contribution = parseContributionValue(valueMatch[0]);
      if (!contribution) return;
      let guild = '';
      let beforeValue = row
        .slice(0, valueMatch.index)
        .trim()
        .replace(/[|,;:-]+$/g, '')
        .trim();
      const guildMatch = beforeValue.match(/\bGuild\s*[:：]\s*(.+)$/i);
      if (guildMatch) {
        guild = String(guildMatch[1] || '').trim();
        beforeValue = beforeValue.slice(0, guildMatch.index).trim();
      }
      const afterValue = row
        .slice(valueMatch.index + valueMatch[0].length)
        .replace(/^[|,;:-]+/g, '')
        .trim();
      const name = beforeValue.replace(/\bGuild\s*[:：].*$/i, '').trim();
      if (!name) return;
      entries.push({ rank, name, guild, contribution, position: afterValue, rewardOverride: '' });
    });
  return normalizeContributionEntries(entries);
}

function renderContributionMatchRows(entries, mode = 'normal') {
  if (mode === 'exguild') {
    return entries
      .map(
        (entry, index) => `<div class="dash-contribution-match-row">
      <label class="dash-match-field"><span class="dash-match-label">${esc(adminT('adminContributionMember'))}</span><input class="dash-contribution-name-input" name="contributionName[]" type="text" placeholder="${esc(adminT('adminContributionMemberNamePh'))}" value="${esc(entry.name || '')}" autocomplete="off"></label>
      <label class="dash-match-field"><span class="dash-match-label">${esc(adminT('adminContributionValue'))}</span><input class="dash-contribution-value-input" name="contributionValue[]" type="text" inputmode="numeric" placeholder="${esc(adminT('adminContributionValuePh'))}" value="${entry.contribution ? esc(formatContributionValue(entry.contribution)) : ''}" autocomplete="off"></label>
      <button class="dash-banner-del-btn" type="button" title="${esc(adminT('adminContributionRemoveRow'))}" data-admin-action="remove-contribution-row">x</button>
    </div>`
      )
      .join('');
  }
  return entries
    .map(
      (entry, index) => `<div class="dash-contribution-match-row">
    <label class="dash-match-field"><span class="dash-match-label">${esc(adminT('adminContributionRank'))}</span><input class="dash-contribution-rank-input" name="contributionRank[]" type="number" min="1" inputmode="numeric" placeholder="#" value="${esc(entry.rank || '')}"></label>
    <label class="dash-match-field"><span class="dash-match-label">${esc(adminT('adminContributionMember'))}</span><input class="dash-contribution-name-input" name="contributionName[]" type="text" placeholder="${esc(adminT('adminContributionMemberNamePh'))}" value="${esc(entry.name || '')}" autocomplete="off"></label>
    <label class="dash-match-field"><span class="dash-match-label">${esc(adminT('adminContributionGuild'))}</span><input class="dash-contribution-guild-input" name="contributionGuild[]" type="text" placeholder="${esc(adminT('adminContributionGuildPh'))}" value="${esc(entry.guild || '')}" autocomplete="off"></label>
    <label class="dash-match-field"><span class="dash-match-label">${esc(adminT('adminContributionValue'))}</span><input class="dash-contribution-value-input" name="contributionValue[]" type="text" inputmode="numeric" placeholder="${esc(adminT('adminContributionValuePh'))}" value="${entry.contribution ? esc(formatContributionValue(entry.contribution)) : ''}" autocomplete="off"></label>
    <label class="dash-match-field"><span class="dash-match-label">${esc(adminT('adminContributionPosition'))}</span><input class="dash-contribution-position-input" name="contributionPosition[]" type="text" placeholder="${esc(adminT('adminContributionPositionPh'))}" value="${esc(entry.position || '')}" autocomplete="off"></label>
    <label class="dash-match-field"><span class="dash-match-label">${esc(adminT('adminContributionReward'))}</span><select class="dash-contribution-reward-input" name="contributionReward[]" title="${esc(adminT('adminContributionRewardOverrideTitle'))}">
      <option value=""${!entry.rewardOverride ? ' selected' : ''}>${esc(adminT('adminContributionRewardAuto'))}</option>
      <option value="premium"${entry.rewardOverride === 'premium' ? ' selected' : ''}>${esc(adminT('adminContributionRewardPremium'))}</option>
      <option value="standard"${entry.rewardOverride === 'standard' ? ' selected' : ''}>${esc(adminT('adminContributionRewardStandard'))}</option>
      <option value="review"${entry.rewardOverride === 'review' ? ' selected' : ''}>${esc(adminT('adminContributionRewardReview'))}</option>
      <option value="none"${entry.rewardOverride === 'none' ? ' selected' : ''}>${esc(adminT('adminContributionRewardNone'))}</option>
    </select></label>
    <button class="dash-banner-del-btn" type="button" title="${esc(adminT('adminContributionRemoveRow'))}" data-admin-action="remove-contribution-row">x</button>
  </div>`
    )
    .join('');
}

function showContributionConfirmModal(
  entries,
  sourceLabel = '',
  existingRecordId = null,
  mode = 'normal'
) {
  const cleanEntries = normalizeContributionEntries(entries);
  if (!cleanEntries.length) return;
  const isExGuild = mode === 'exguild';
  const existingRecord = existingRecordId
    ? state.contributionRecords.find((record) => record.id === existingRecordId)
    : null;
  beginAdminEditSurface(
    isExGuild
      ? 'ex-guild-contribution-create'
      : existingRecord
        ? 'contribution-edit'
        : 'contribution-create'
  );
  const m = $id('dashModal'),
    body = $id('dashModalBody');
  $id('dashModalTitle').textContent = isExGuild
    ? adminT('adminExGuildConfirmTitle')
    : existingRecord
      ? adminT('adminContributionEditTitle')
      : adminT('adminContributionConfirmTitle');
  $id('dashModalSub').textContent = adminT('adminContributionModalSub', {
    count: cleanEntries.length,
  });
  body.innerHTML =
    (isExGuild
      ? ''
      : `<div class="dash-banner-form-row">
    <label>${esc(adminT('adminContributionDateLabel'))}</label>
    <input type="date" id="dashContributionDate" name="contributionDate" value="${existingRecord?.date || new Date().toISOString().slice(0, 10)}" style="flex:1">
  </div>
  <div class="dash-banner-form-row">
    <label>${esc(adminT('adminContributionNoteLabel'))}</label>
    <input type="text" id="dashContributionNote" name="contributionNote" value="${esc(getContributionDisplayNote(existingRecord?.note || sourceLabel, cleanEntries.length))}" placeholder="${esc(adminT('adminContributionNotePh'))}" autocomplete="off" style="flex:1">
  </div>
  <div class="dash-banner-form-row">
    <label>${esc(adminT('adminContributionPremiumLabel'))}</label>
    <input type="number" id="dashContributionPremiumCutoff" name="premiumCutoff" min="1" max="100" inputmode="numeric" value="${esc(existingRecord?.premiumCutoff || 20)}" style="width:110px">
    <span class="dash-form-hint">${esc(adminT('adminContributionPremiumHint'))}</span>
  </div>`) +
    `<div class="dash-contribution-match-head">${
      isExGuild
        ? `<span>${esc(adminT('adminContributionMember'))}</span><span>${esc(adminT('adminContributionValue'))}</span><span></span>`
        : `<span>${esc(adminT('adminContributionRank'))}</span><span>${esc(adminT('adminContributionMember'))}</span><span>${esc(adminT('adminContributionGuild'))}</span><span>${esc(adminT('adminContributionValue'))}</span><span>${esc(adminT('adminContributionPosition'))}</span><span>${esc(adminT('adminContributionReward'))}</span><span></span>`
    }
  </div>
  <div class="dash-contribution-match-list">${renderContributionMatchRows(existingRecord?.entries || cleanEntries, mode)}</div>
  <div id="dashContributionModalError" class="dash-upload-status hidden" role="alert" aria-live="assertive" tabindex="-1"></div>
  <div style="display:flex;gap:0.5rem;margin-top:1rem;flex-wrap:wrap">
    <button id="dashContributionAddRowBtn" class="dash-btn" type="button">${esc(adminT(isExGuild ? 'adminExGuildAddRow' : 'adminContributionAddRow'))}</button>
    <button id="dashContributionSaveBtn" class="dash-btn dash-btn-primary" style="flex:1">${esc(isExGuild ? adminT('adminExGuildSaveList') : existingRecord ? adminT('adminContributionUpdateList') : adminT('adminContributionSaveList'))}</button>
    <button id="dashContributionCancelBtn" class="dash-btn" style="flex:1">${esc(adminT('adminCancel'))}</button>
  </div>`;
  bindAdminControls(body);
  $id('dashContributionAddRowBtn').onclick = () => {
    const list = body.querySelector('.dash-contribution-match-list');
    const emptyRow = isExGuild
      ? [{ name: '', contribution: '' }]
      : [{ rank: '', name: '', guild: '', contribution: '', position: '', rewardOverride: '' }];
    list.insertAdjacentHTML('beforeend', renderContributionMatchRows(emptyRow, mode));
  };
  $id('dashContributionSaveBtn').onclick = async () => {
    const rowElements = Array.from(body.querySelectorAll('.dash-contribution-match-row'));
    const modalError = $id('dashContributionModalError');
    modalError?.classList.add('hidden');
    if (modalError) modalError.textContent = '';
    rowElements.forEach((row) => {
      row
        .querySelectorAll('input, select')
        .forEach((control) => control.setAttribute('aria-invalid', 'false'));
    });
    const rows = rowElements.map((row) => {
      const base = {
        name: row.querySelector('.dash-contribution-name-input')?.value || '',
        contribution: row.querySelector('.dash-contribution-value-input')?.value || '',
      };
      if (isExGuild) return base;
      return {
        ...base,
        rank: row.querySelector('.dash-contribution-rank-input')?.value || '',
        guild: row.querySelector('.dash-contribution-guild-input')?.value || '',
        position: row.querySelector('.dash-contribution-position-input')?.value || '',
        rewardOverride: row.querySelector('.dash-contribution-reward-input')?.value || '',
      };
    });
    const normalized = normalizeContributionEntries(rows);
    if (!normalized.length) {
      let firstInvalid = null;
      rowElements.forEach((row) => {
        const nameInput = row.querySelector('.dash-contribution-name-input');
        const valueInput = row.querySelector('.dash-contribution-value-input');
        if (!nameInput?.value.trim()) {
          nameInput?.setAttribute('aria-invalid', 'true');
          firstInvalid ||= nameInput;
        }
        if (!parseContributionValue(valueInput?.value)) {
          valueInput?.setAttribute('aria-invalid', 'true');
          firstInvalid ||= valueInput;
        }
      });
      if (modalError) {
        modalError.textContent = adminT('adminContributionNoValidRowsAlert');
        modalError.className = 'dash-upload-status error';
      }
      (firstInvalid || modalError)?.focus();
      return;
    }
    if (isExGuild) {
      const sourceNote = $id('dashContributionNote')?.value.trim() || sourceLabel;
      state.exGuildContributions ??= [];
      normalized.forEach((entry) => {
        state.exGuildContributions.push({
          id: `exg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          playerName: entry.name || '',
          contribution: entry.contribution || entry.value || 0,
          sourceNote,
        });
      });
      const saveBtn = $id('dashContributionSaveBtn');
      const saveLabel = saveBtn?.textContent || '';
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = `${saveLabel}…`;
      }
      const synced = await saveExGuildContributions({ immediate: true, awaitCloud: true });
      if (keepFormOpenAfterSyncConflict(saveBtn, saveLabel)) return;
      closeModal();
      renderContributions();
      refreshDashboardOverview();
      logRosterEvent('adminExGuildSavedLog', 'success', { count: normalized.length });
      notifySpecialListCloudResult(synced, adminT('adminExGuildTab'));
      return;
    }
    const record = {
      id:
        existingRecord?.id ||
        `contribution_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      date: $id('dashContributionDate')?.value || new Date().toISOString().slice(0, 10),
      note: $id('dashContributionNote')?.value.trim() || '',
      premiumCutoff: Math.max(1, Number($id('dashContributionPremiumCutoff')?.value || 20)),
      entries: normalized,
      isPrimary: existingRecord ? existingRecord.isPrimary === true : true,
      createdAt: existingRecord?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    if (existingRecord) {
      const index = state.contributionRecords.findIndex((item) => item.id === existingRecord.id);
      if (index >= 0) state.contributionRecords[index] = record;
    } else {
      state.contributionRecords.forEach((item) => {
        item.isPrimary = false;
      });
      state.contributionRecords.push(record);
    }
    const saveBtn = $id('dashContributionSaveBtn');
    const saveLabel = saveBtn?.textContent || '';
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = `${saveLabel}…`;
    }
    const synced = await saveContributionRecords({ immediate: true, awaitCloud: true });
    if (keepFormOpenAfterSyncConflict(saveBtn, saveLabel)) return;
    closeModal();
    renderContributions();
    renderDutyRecords();
    refreshDashboardOverview();
    if (existingRecord) {
      logRosterEvent('adminContributionUpdatedLog', 'success', {
        count: normalized.length,
      });
    } else {
      logRosterEvent('adminContributionSavedLog', 'success', {
        count: normalized.length,
      });
    }
    notifySpecialListCloudResult(synced, adminT('adminContributionsTab'));
  };
  $id('dashContributionCancelBtn').onclick = closeModal;
  m.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function showContributionPasteForm() {
  const text = prompt(adminT('adminContributionPastePrompt'), '');
  if (text === null) return;
  const entries = parseContributionEntriesFromText(text);
  if (!entries.length) {
    logRosterEvent('adminContributionNoRowsLog', 'warn');
    return;
  }
  showContributionConfirmModal(entries, adminT('adminContributionManualPaste'));
}

function showExGuildPasteForm() {
  const text = prompt(adminT('adminExGuildPastePrompt'), '');
  if (text === null) return;
  const entries = parseContributionEntriesFromText(text);
  if (!entries.length) {
    logRosterEvent('adminContributionNoRowsLog', 'warn');
    return;
  }
  showContributionConfirmModal(entries, adminT('adminExGuildManualPaste'), null, 'exguild');
}

function setContributionUploadStatus(message, type = 'error') {
  const el = $id('dashContributionStatus');
  if (!el) return;
  el.className = `dash-upload-status ${type}`;
  el.textContent = message;
  el.classList.remove('hidden');
}

function clearContributionUploadStatus() {
  const el = $id('dashContributionStatus');
  if (!el) return;
  el.classList.add('hidden');
  el.textContent = '';
}

// Reads the Combat Progress score list off a team leader's screenshots.
//
// Leaders capture the same board two or three times as they scroll, so this
// returns every row it sees and leaves de-duplication to
// normalizeBohMatchEntries(), which keeps one row per player.
async function runBohMatchOcr(files, options = {}) {
  const valid = getSupportedOcrImageFiles(files);
  if (!valid.length) {
    const rejected = describeRejectedOcrImageFiles(files);
    return {
      entries: [],
      scanned: 0,
      error: rejected.length
        ? adminT('adminContributionUnsupportedImageStatus', {
            files: rejected.slice(0, 3).join(', '),
          })
        : adminT('adminContributionNoImageSelectedStatus'),
    };
  }

  const rows = [];
  let blockingError = '';
  for (let i = 0; i < valid.length; i++) {
    const file = valid[i];
    options.onProgress?.({ current: i + 1, total: valid.length, file: file.name });
    try {
      const imageUrl = await readOcrImageDataUrl(file);
      const promptTxt = `Extract the team score list from this Rise of Castles "Combat Progress" battleground screenshot.

Return ONLY valid JSON in this shape:
{"entries":[{"rank":1,"name":"GoodnesGraycious","score":16279}]}

Rules:
- Include every visible member row of the currently selected side's list, including partially scrolled rows.
- Use the number at the far left of the row as "rank".
- Use the number at the far right of the row as "score", digits only, no separators.
- Put only the player name text in "name"; preserve symbols, spacing, decorative brackets, and non-Latin characters exactly.
- Ignore the two alliance banners at the top, the total scores, per-minute rates, deployed member counts, teleports, territory coverage, the Blue/Red tabs, avatars, buttons, the phone status bar, and any decorative text.
- If no member rows are visible, return {"entries":[]}.`;
      const raw = await qwenVisionRequest([
        {
          role: 'user',
          content: [
            { type: 'text', text: promptTxt },
            { type: 'image_url', image_url: { url: imageUrl } },
          ],
        },
      ]);
      const text = raw?.choices?.[0]?.message?.content || '';
      const cleaned = text
        .replace(/```(?:json)?\s*/gi, '')
        .replace(/```/g, '')
        .trim();
      let parsed = null;
      try {
        parsed = tryRepairJson(cleaned);
      } catch {
        parsed = null;
      }
      const entries = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed?.entries)
          ? parsed.entries
          : [];
      if (entries.length) rows.push(...entries);
      else rows.push(...bohMatchEntriesFromText(cleaned));
    } catch (e) {
      const errorMessage = describeOcrRequestError(e, adminT);
      if (!blockingError) blockingError = errorMessage;
      if (e?.localConfiguration) break;
    }
  }

  return { entries: rows, scanned: valid.length, error: rows.length ? '' : blockingError };
}

async function processContributionImages(files, mode = 'normal') {
  if (state._contributionProcessing) {
    logRosterEvent('adminContributionOcrRunningLog', 'warn');
    return;
  }
  const valid = getSupportedOcrImageFiles(files);
  if (!valid.length) {
    const rejected = describeRejectedOcrImageFiles(files);
    const message = rejected.length
      ? adminT('adminContributionUnsupportedImageStatus', {
          files: rejected.slice(0, 3).join(', '),
        })
      : adminT('adminContributionNoImageSelectedStatus');
    if (rejected.length) {
      logRosterEvent(
        'adminLogContributionUnsupportedFiles',
        'warn',
        { count: rejected.length },
        { localOnly: true }
      );
    } else {
      logRosterEvent('adminContributionNoImageSelectedStatus', 'warn');
    }
    setContributionUploadStatus(message, 'warn');
    return;
  }
  state._contributionProcessing = true;
  clearContributionUploadStatus();
  const progress = $id('dashContributionProgress');
  const progressText = $id('dashContributionProgressText');
  if (progress) progress.classList.remove('hidden');
  logRosterEvent('adminContributionScanningImagesLog', 'info', { count: valid.length });
  let allEntries = [];
  let blockingError = '';
  for (let i = 0; i < valid.length; i++) {
    const file = valid[i];
    if (progressText)
      progressText.textContent = adminT('adminContributionScanningImageProgress', {
        current: i + 1,
        total: valid.length,
      });
    try {
      const imageUrl = await readOcrImageDataUrl(file);
      const promptTxt = `Extract Total Contribution leaderboard rows from this Rise of Castles screenshot.

Return ONLY valid JSON in this shape:
{"entries":[{"rank":1,"name":"(Vts)Player Name","guild":"VTS X1","contribution":192983,"position":"Guild master"}]}

Rules:
- Include every visible member row, including a bottom "My Ranking" row if visible.
- Use the number at the far left as "rank".
- Use the number in the Contribution column as "contribution".
- Put only the player/member text in "name"; move any Guild: text into "guild".
- Put role text from the Position column, such as Guild master, into "position".
- Preserve symbols, spacing, and non-Latin characters in names.
- Ignore title bars, phone time, avatars, buttons, headers, and decorative text.
- If no contribution rows are visible, return {"entries":[]}.`;
      const raw = await qwenVisionRequest([
        {
          role: 'user',
          content: [
            { type: 'text', text: promptTxt },
            { type: 'image_url', image_url: { url: imageUrl } },
          ],
        },
      ]);
      const text = raw?.choices?.[0]?.message?.content || '';
      const cleaned = text
        .replace(/```(?:json)?\s*/gi, '')
        .replace(/```/g, '')
        .trim();
      let parsed;
      try {
        parsed = tryRepairJson(cleaned);
      } catch (e) {
        parsed = { entries: parseContributionEntriesFromText(cleaned) };
      }
      const entries = Array.isArray(parsed)
        ? normalizeContributionEntries(parsed)
        : Array.isArray(parsed?.entries)
          ? normalizeContributionEntries(parsed.entries)
          : [];
      allEntries.push(...entries);
    } catch (e) {
      const errorMessage = describeOcrRequestError(e, adminT);
      logRosterEvent(
        'adminContributionOcrErrorLog',
        'error',
        { file: file.name, error: errorMessage },
        { file: file.name, localOnly: true }
      );
      if (!blockingError) blockingError = errorMessage;
      if (e?.localConfiguration) break;
    }
  }
  if (progress) progress.classList.add('hidden');
  state._contributionProcessing = false;
  const unique = normalizeContributionEntries(allEntries);
  if (!unique.length) {
    logRosterEvent('adminContributionNoRowsInImagesLog', 'warn');
    if (blockingError) {
      const message = adminT('adminContributionOcrBlockedStatus', { error: blockingError });
      setContributionUploadStatus(message, 'error');
      if (typeof window.showToast === 'function')
        window.showToast(adminT('adminContributionOcrBlockedToast'), 'error', 5000);
    } else {
      setContributionUploadStatus(adminT('adminContributionNoRowsInImagesLog'), 'warn');
      alert(adminT('adminContributionExtractFailedAlert'));
    }
    return;
  }
  clearContributionUploadStatus();
  showContributionConfirmModal(unique, valid.map((f) => f.name).join(', '), null, mode);
}

function setContributionReward(recordId, entryIndex, rewardTier) {
  const record = state.contributionRecords.find((item) => item.id === recordId);
  if (!record || !Array.isArray(record.entries) || !record.entries[entryIndex]) return;
  record.entries[entryIndex].rewardOverride = normalizeRewardTier(rewardTier);
  record.updatedAt = new Date().toISOString();
  saveContributionRecords();
  renderContributions();
  refreshDashboardOverview();
}

function editContributionRecord(id) {
  const record = state.contributionRecords.find((item) => item.id === id);
  if (!record) return;
  showContributionConfirmModal(record.entries || [], record.note || '', record.id);
}

function deleteContributionRecord(id) {
  const index = state.contributionRecords.findIndex((record) => record.id === id);
  if (index < 0) return;
  if (!confirm(adminT('adminContributionDeleteConfirm'))) return;
  state.contributionRecords.splice(index, 1);
  saveContributionRecords();
  renderContributions();
  renderDutyRecords();
  refreshDashboardOverview();
  logRosterEvent('adminContributionDeletedLog', 'warn');
}

function setContributionPrimary(id) {
  (state.contributionRecords || []).forEach((record) => {
    record.isPrimary = record.id === id;
  });
  saveContributionRecords();
  renderContributions();
  renderDutyRecords();
  refreshDashboardOverview();
}

function buildContributionCsv(recordId = '') {
  const records = (state.contributionRecords || []).filter(
    (record) => !recordId || record.id === recordId
  );
  const lines = [
    [
      adminT('adminContributionCsvRecordDate'),
      adminT('adminContributionNoteLabel'),
      adminT('adminContributionRank'),
      adminT('adminContributionMemberName'),
      adminT('adminContributionGuild'),
      adminT('adminContributionValue'),
      adminT('adminContributionPosition'),
      adminT('adminContributionReward'),
      adminT('adminContributionOverride'),
    ],
  ];
  records.forEach((record) => {
    normalizeContributionEntries(record.entries || []).forEach((entry) => {
      const reward = getContributionReward(entry, record);
      lines.push([
        record.date || '',
        record.note || '',
        entry.rank || '',
        entry.name || '',
        entry.guild || '',
        entry.contribution || '',
        entry.position || '',
        getContributionRewardLabel(reward),
        normalizeRewardTier(entry.rewardOverride) ? adminT('adminYes') : adminT('adminNo'),
      ]);
    });
  });
  return lines
    .map((row) => row.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
}

function exportContributionRecords(recordId = '') {
  if (!state.contributionRecords?.length) return;
  const csv = buildContributionCsv(recordId);
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `vts_total_contribution_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  logRosterEvent('adminContributionSheetExportedLog', 'success', {}, { source: 'export' });
}

function summarizeContributionImageSourceNote(note, rowCount = 0) {
  const raw = String(note || '').trim();
  if (!raw) return '';
  const parts = raw.split(/\s*,\s*/).filter(Boolean);
  const imageParts = parts.filter((part) => isImageSourceContributionNote(part));
  const extensionMatches = raw.match(/\.(?:jpe?g|png|webp|heic|gif)\b/gi) || [];
  const isImageSource = imageParts.length > 1 || isImageSourceContributionNote(raw);
  if (!isImageSource) return raw;
  const count = imageParts.length || extensionMatches.length;
  const label = adminT('adminUploadedScreenshots', { count: Math.max(1, count) });
  return rowCount
    ? `${label} - ${adminT('adminContributionRowsCount', { count: rowCount })}`
    : label;
}

function getContributionDisplayNote(note, rowCount = 0) {
  const raw = String(note || '').trim();
  if (!raw) return '';
  const sourceSummary = summarizeContributionImageSourceNote(raw, rowCount);
  if (sourceSummary !== raw) return sourceSummary;
  return raw.length > 120 ? `${raw.slice(0, 96).trim()}...` : raw;
}

function getContributionRecordLabel(record, fallbackIndex = 0) {
  const date = record?.date || `Snapshot ${fallbackIndex + 1}`;
  const count = normalizeContributionEntries(record?.entries || []).length;
  const note = getContributionDisplayNote(record?.note, count);
  return `${date}${note ? ` - ${note}` : ''} (${count} rows)`;
}

function getContributionCanonicalDisplayName(name) {
  try {
    return resolveCanonicalPlayerIdentity(name).playerName;
  } catch {
    return getContributionCanonicalName(name, state.playerRegistry || readStoredPlayerRegistry());
  }
}

function getContributionIdentity(entry) {
  const canonicalName = getContributionCanonicalDisplayName(entry?.name);
  return getContributionSnapshotIdentity(
    { ...entry, name: canonicalName },
    state.playerRegistry || readStoredPlayerRegistry(),
    { defaultGuild: 'VTS X1' }
  );
}

const contributionComparisonFilters = {
  member: '',
  rank: '',
  baseline: '',
  final: '',
  gain: '',
  reward: '',
  status: 'all',
};
let contributionComparisonFilterTimer = 0;
const contributionAliasMatchQueue = new Map();

function contributionComparisonRowsMatchingFilters(rows) {
  const textMatches = (value, query) =>
    !query ||
    String(value || '')
      .toLocaleLowerCase()
      .includes(String(query).trim().toLocaleLowerCase());
  const minimumMatches = (value, minimum) =>
    minimum === '' || !Number.isFinite(Number(minimum)) || Number(value) >= Number(minimum);

  return rows.filter((row) => {
    const memberText = `${row.canonicalName} ${row.name} ${row.baseName} ${row.finalName} ${row.guild}`;
    const rankText = `${row.baseRank || ''} ${row.finalRank || ''} ${row.rankDelta || ''}`;
    const rewardText = `${getContributionRewardLabel(row.rewardBefore)} ${getContributionRewardLabel(row.rewardAfter)}`;
    const statusMatches =
      contributionComparisonFilters.status === 'all' ||
      (contributionComparisonFilters.status === 'needs-match'
        ? row.status === 'new' || row.status === 'missing'
        : contributionComparisonFilters.status === 'manual'
          ? row.matchSource === 'manual'
          : contributionComparisonFilters.status === 'auto'
            ? row.matchSource === 'auto'
            : row.status === contributionComparisonFilters.status);
    return (
      textMatches(memberText, contributionComparisonFilters.member) &&
      textMatches(rankText, contributionComparisonFilters.rank) &&
      minimumMatches(row.baseValue, contributionComparisonFilters.baseline) &&
      minimumMatches(row.finalValue, contributionComparisonFilters.final) &&
      minimumMatches(row.delta, contributionComparisonFilters.gain) &&
      textMatches(rewardText, contributionComparisonFilters.reward) &&
      statusMatches
    );
  });
}

function buildContributionComparison(baseRecord, finalRecord) {
  const registry = state.playerRegistry || readStoredPlayerRegistry();
  const baseMap = new Map();
  const finalMap = new Map();
  normalizeContributionEntries(baseRecord?.entries || []).forEach((entry) => {
    const key = getContributionIdentity(entry);
    if (key !== '|') baseMap.set(key, entry);
  });
  normalizeContributionEntries(finalRecord?.entries || []).forEach((entry) => {
    const key = getContributionIdentity(entry);
    if (key !== '|') finalMap.set(key, entry);
  });
  const keys = new Set([...baseMap.keys(), ...finalMap.keys()]);
  return Array.from(keys)
    .map((key) => {
      const base = baseMap.get(key);
      const final = finalMap.get(key);
      const baseValue = parseContributionValue(base?.contribution);
      const finalValue = parseContributionValue(final?.contribution);
      const baseRank = Number(base?.rank || 0);
      const finalRank = Number(final?.rank || 0);
      const rewardBefore = base ? getContributionReward(base, baseRecord) : '';
      const rewardAfter = final ? getContributionReward(final, finalRecord) : '';
      const displayName = final?.name || base?.name || '';
      const manualMatch = final ? getContributionAliasMatch(registry, final.name) : null;
      const matchSource =
        base && final ? (manualMatch ? 'manual' : base.name !== final.name ? 'auto' : 'exact') : '';
      return {
        key,
        name: displayName,
        canonicalName: getContributionCanonicalDisplayName(displayName),
        baseName: base?.name || '',
        finalName: final?.name || '',
        guild: final?.guild || base?.guild || '',
        baseRank,
        finalRank,
        rankDelta: baseRank && finalRank ? baseRank - finalRank : 0,
        baseValue,
        finalValue,
        delta: finalValue - baseValue,
        rewardBefore,
        rewardAfter,
        matchSource,
        status: base && final ? 'tracked' : final ? 'new' : 'missing',
      };
    })
    .sort(
      (a, b) => b.delta - a.delta || b.finalValue - a.finalValue || a.name.localeCompare(b.name)
    );
}

function getSelectedContributionCompareRecords() {
  const baseId = $id('dashContributionCompareBase')?.value || '';
  const finalId = $id('dashContributionCompareFinal')?.value || '';
  const records = state.contributionRecords || [];
  return {
    baseRecord: records.find((record) => record.id === baseId) || null,
    finalRecord: records.find((record) => record.id === finalId) || null,
  };
}

function buildContributionComparisonCsv(baseRecord, finalRecord) {
  const rows = buildContributionComparison(baseRecord, finalRecord);
  const lines = [
    [
      adminT('adminContributionMemberName'),
      adminT('adminContributionGuild'),
      adminT('adminContributionBaselineRank'),
      adminT('adminContributionFinalRank'),
      adminT('adminContributionRankMovement'),
      adminT('adminContributionBaselineContribution'),
      adminT('adminContributionFinalContribution'),
      adminT('adminContributionDelta'),
      adminT('adminContributionBaselineReward'),
      adminT('adminContributionFinalReward'),
      adminT('adminContributionStatus'),
    ],
  ];
  rows.forEach((row) => {
    lines.push([
      row.name,
      row.guild,
      row.baseRank || '',
      row.finalRank || '',
      row.rankDelta || '',
      row.baseValue || '',
      row.finalValue || '',
      row.delta || 0,
      row.rewardBefore ? getContributionRewardLabel(row.rewardBefore) : '',
      row.rewardAfter ? getContributionRewardLabel(row.rewardAfter) : '',
      `${adminT(`adminContributionStatus${row.status.charAt(0).toUpperCase()}${row.status.slice(1)}`)}${row.matchSource === 'manual' ? ` - ${adminT('adminContributionManualMatch')}` : row.matchSource === 'auto' ? ` - ${adminT('adminContributionAutoMatch')}` : ''}`,
    ]);
  });
  return lines
    .map((line) => line.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
}

function exportContributionComparison() {
  const { baseRecord, finalRecord } = getSelectedContributionCompareRecords();
  if (!baseRecord || !finalRecord || baseRecord.id === finalRecord.id) return;
  const csv = buildContributionComparisonCsv(baseRecord, finalRecord);
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `vts_contribution_delta_${safeContributionFilenamePart(baseRecord.date || 'baseline')}_to_${safeContributionFilenamePart(finalRecord.date || 'final')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  logRosterEvent('adminContributionComparisonExportedLog', 'success', {}, { source: 'export' });
}

function renderContributionComparison() {
  const host = $id('dashContributionComparePanel');
  if (!host) return;
  const records = Array.isArray(state.contributionRecords) ? state.contributionRecords : [];
  if (records.length < 2) {
    host.innerHTML = `<div class="dash-contribution-compare-empty">${esc(adminT('adminContributionCompareEmpty'))}</div>`;
    return;
  }
  const sorted = records
    .slice()
    .sort(
      (a, b) =>
        String(a.date || '').localeCompare(String(b.date || '')) ||
        String(a.createdAt || '').localeCompare(String(b.createdAt || ''))
    );
  const baseDefault = sorted[0]?.id || '';
  const finalDefault = sorted[sorted.length - 1]?.id || '';
  const selectedBase = $id('dashContributionCompareBase')?.value || baseDefault;
  const selectedFinal = $id('dashContributionCompareFinal')?.value || finalDefault;
  const options = sorted
    .map(
      (record, index) =>
        `<option value="${esc(record.id)}">${esc(getContributionRecordLabel(record, index))}</option>`
    )
    .join('');
  host.innerHTML = `<div class="dash-contribution-compare-card">
    <div class="dash-contribution-compare-head">
      <div>
        <strong>${esc(adminT('adminContributionCompareTitle'))}</strong>
        <span>${esc(adminT('adminContributionCompareSubtitle'))}</span>
      </div>
      <button id="dashContributionCompareExportBtn" class="dash-btn">${esc(adminT('adminContributionExportDelta'))}</button>
    </div>
    <div class="dash-contribution-compare-controls">
      <label>${esc(adminT('adminContributionBaseline'))} <select id="dashContributionCompareBase">${options}</select></label>
      <label>${esc(adminT('adminContributionFinal'))} <select id="dashContributionCompareFinal">${options}</select></label>
    </div>
    <div id="dashContributionCompareBody"></div>
  </div>`;
  const baseSelect = $id('dashContributionCompareBase');
  const finalSelect = $id('dashContributionCompareFinal');
  if (baseSelect)
    baseSelect.value = sorted.some((record) => record.id === selectedBase)
      ? selectedBase
      : baseDefault;
  if (finalSelect)
    finalSelect.value = sorted.some((record) => record.id === selectedFinal)
      ? selectedFinal
      : finalDefault;
  const renderSelected = () => {
    const { baseRecord, finalRecord } = getSelectedContributionCompareRecords();
    const body = $id('dashContributionCompareBody');
    if (!body) return;
    if (!baseRecord || !finalRecord || baseRecord.id === finalRecord.id) {
      body.innerHTML = `<div class="dash-empty">${esc(adminT('adminContributionChooseDifferent'))}</div>`;
      return;
    }
    const rows = buildContributionComparison(baseRecord, finalRecord);
    const filteredRows = contributionComparisonRowsMatchingFilters(rows);
    const totalDelta = rows.reduce((sum, row) => sum + row.delta, 0);
    const newCount = rows.filter((row) => row.status === 'new').length;
    const missingCount = rows.filter((row) => row.status === 'missing').length;
    const premiumMoved = rows.filter((row) => row.rewardBefore !== row.rewardAfter).length;
    const missingRows = rows.filter((row) => row.status === 'missing');
    const missingCandidates = Array.from(
      new Map(missingRows.map((row) => [row.canonicalName.toLocaleLowerCase(), row])).values()
    );
    const matchControl = (row, index) => {
      if (row.status !== 'new' || !missingCandidates.length) return '';
      const listId = `dashContributionAliasList${index}`;
      const queued = contributionAliasMatchQueue.get(row.key);
      const options = missingCandidates
        .map(
          (candidate) =>
            `<option value="${esc(candidate.canonicalName)}" label="${esc(candidate.name !== candidate.canonicalName ? candidate.name : candidate.guild || '')}"></option>`
        )
        .join('');
      return `<div class="dash-contribution-alias-match">
        <label><span>${esc(adminT('adminContributionMatchOldName'))}</span>
          <input type="search" list="${listId}" data-contribution-alias-old value="${esc(queued?.oldName || '')}" placeholder="${esc(adminT('adminContributionSearchOldName'))}" autocomplete="off" />
          <datalist id="${listId}">${options}</datalist>
        </label>
        <button type="button" class="dash-btn dash-btn-xs${queued ? ' dash-btn-primary' : ''}" data-contribution-alias-queue data-contribution-alias-key="${esc(row.key)}" data-contribution-alias-new="${esc(row.name)}" data-contribution-alias-guild="${esc(row.guild)}">${esc(adminT(queued ? 'adminContributionMatchQueued' : 'adminContributionMatchQueue'))}</button>
      </div>`;
    };
    const undoControl = (row) => {
      if (row.status !== 'tracked' || !row.finalName) return '';
      const match = getContributionAliasMatch(
        state.playerRegistry || readStoredPlayerRegistry(),
        row.finalName
      );
      if (!match) return '';
      return `<button type="button" class="dash-btn dash-btn-xs dash-contribution-alias-undo" data-contribution-alias-undo="${esc(row.finalName)}">${esc(adminT('adminContributionMatchUndo'))}</button>`;
    };
    body.innerHTML = `<div class="dash-contribution-compare-stats">
      <span>${esc(adminT('adminContributionDelta'))} <strong class="${totalDelta >= 0 ? 'dash-positive' : 'dash-negative'}">${formatSignedContributionValue(totalDelta)}</strong></span>
      <span>${esc(adminT('adminContributionNew'))} <strong>${newCount}</strong></span>
      <span>${esc(adminT('adminContributionMissing'))} <strong>${missingCount}</strong></span>
      <span>${esc(adminT('adminContributionRewardChanges'))} <strong>${premiumMoved}</strong></span>
    </div>
    <div class="dash-contribution-alias-batch">
      <span>${esc(adminT('adminContributionMatchesQueued', { count: contributionAliasMatchQueue.size }))}</span>
      <button type="button" class="dash-btn dash-btn-primary" data-contribution-alias-save${contributionAliasMatchQueue.size ? '' : ' disabled'}>${esc(adminT('adminContributionSaveMatches', { count: contributionAliasMatchQueue.size }))}</button>
      <button type="button" class="dash-btn" data-contribution-alias-clear${contributionAliasMatchQueue.size ? '' : ' disabled'}>${esc(adminT('adminContributionClearMatches'))}</button>
    </div>
    <div class="dash-contribution-filter-tools">
      <label><span>${esc(adminT('adminContributionMember'))}</span><input type="search" data-contribution-filter="member" value="${esc(contributionComparisonFilters.member)}" placeholder="${esc(adminT('adminSearchPh'))}" /></label>
      <label><span>${esc(adminT('adminContributionStatus'))}</span><select data-contribution-filter="status"><option value="all"${contributionComparisonFilters.status === 'all' ? ' selected' : ''}>${esc(adminT('adminContributionFilterAll'))}</option><option value="needs-match"${contributionComparisonFilters.status === 'needs-match' ? ' selected' : ''}>${esc(adminT('adminContributionNeedsMatching'))}</option><option value="manual"${contributionComparisonFilters.status === 'manual' ? ' selected' : ''}>${esc(adminT('adminContributionManualMatch'))}</option><option value="auto"${contributionComparisonFilters.status === 'auto' ? ' selected' : ''}>${esc(adminT('adminContributionAutoMatch'))}</option><option value="new"${contributionComparisonFilters.status === 'new' ? ' selected' : ''}>${esc(adminT('adminContributionStatusNew'))}</option><option value="missing"${contributionComparisonFilters.status === 'missing' ? ' selected' : ''}>${esc(adminT('adminContributionStatusMissing'))}</option><option value="tracked"${contributionComparisonFilters.status === 'tracked' ? ' selected' : ''}>${esc(adminT('adminContributionStatusTracked'))}</option></select></label>
      <span>${filteredRows.length}/${rows.length}</span>
    </div>
    <div class="dash-contribution-compare-table-wrap">
      <table class="dash-banner-table dash-contribution-compare-table">
        <thead><tr><th>${esc(adminT('adminContributionMember'))}</th><th>${esc(adminT('adminContributionRank'))}</th><th style="text-align:right">${esc(adminT('adminContributionBaseline'))}</th><th style="text-align:right">${esc(adminT('adminContributionFinal'))}</th><th style="text-align:right">${esc(adminT('adminContributionGain'))}</th><th>${esc(adminT('adminContributionReward'))}</th><th>${esc(adminT('adminContributionStatus'))}</th></tr>
        <tr class="dash-contribution-filter-row"><th><input type="search" data-contribution-filter="member" value="${esc(contributionComparisonFilters.member)}" aria-label="${esc(adminT('adminContributionMember'))}" /></th><th><input type="search" data-contribution-filter="rank" value="${esc(contributionComparisonFilters.rank)}" aria-label="${esc(adminT('adminContributionRank'))}" /></th><th><input type="number" data-contribution-filter="baseline" value="${esc(contributionComparisonFilters.baseline)}" placeholder="≥" aria-label="${esc(adminT('adminContributionBaseline'))}" /></th><th><input type="number" data-contribution-filter="final" value="${esc(contributionComparisonFilters.final)}" placeholder="≥" aria-label="${esc(adminT('adminContributionFinal'))}" /></th><th><input type="number" data-contribution-filter="gain" value="${esc(contributionComparisonFilters.gain)}" placeholder="≥" aria-label="${esc(adminT('adminContributionGain'))}" /></th><th><input type="search" data-contribution-filter="reward" value="${esc(contributionComparisonFilters.reward)}" aria-label="${esc(adminT('adminContributionReward'))}" /></th><th><select data-contribution-filter="status" aria-label="${esc(adminT('adminContributionStatus'))}"><option value="all"${contributionComparisonFilters.status === 'all' ? ' selected' : ''}>${esc(adminT('adminContributionFilterAll'))}</option><option value="needs-match"${contributionComparisonFilters.status === 'needs-match' ? ' selected' : ''}>${esc(adminT('adminContributionNeedsMatching'))}</option><option value="manual"${contributionComparisonFilters.status === 'manual' ? ' selected' : ''}>${esc(adminT('adminContributionManualMatch'))}</option><option value="auto"${contributionComparisonFilters.status === 'auto' ? ' selected' : ''}>${esc(adminT('adminContributionAutoMatch'))}</option><option value="new"${contributionComparisonFilters.status === 'new' ? ' selected' : ''}>${esc(adminT('adminContributionStatusNew'))}</option><option value="missing"${contributionComparisonFilters.status === 'missing' ? ' selected' : ''}>${esc(adminT('adminContributionStatusMissing'))}</option><option value="tracked"${contributionComparisonFilters.status === 'tracked' ? ' selected' : ''}>${esc(adminT('adminContributionStatusTracked'))}</option></select></th></tr></thead>
        <tbody>${filteredRows
          .slice(0, 30)
          .map(
            (row, index) => `<tr>
          <td><strong>${esc(row.canonicalName || row.name)}</strong>${row.finalName && row.finalName !== row.canonicalName ? `<small>${esc(adminT('adminContributionCurrentName', { name: row.finalName }))}</small>` : ''}${row.baseName && row.finalName && row.baseName !== row.finalName ? `<small>${esc(adminT('adminContributionPreviouslyName', { name: row.baseName }))}</small>` : ''}${row.guild ? `<small>${esc(row.guild)}</small>` : ''}${undoControl(row)}${matchControl(row, index)}</td>
          <td>${row.baseRank || '--'} -> ${row.finalRank || '--'}${row.rankDelta ? `<em class="${row.rankDelta > 0 ? 'up' : 'down'}">${row.rankDelta > 0 ? '+' : ''}${row.rankDelta}</em>` : ''}</td>
          <td style="text-align:right">${formatContributionValue(row.baseValue)}</td>
          <td style="text-align:right">${formatContributionValue(row.finalValue)}</td>
          <td style="text-align:right" class="${row.delta >= 0 ? 'dash-positive' : 'dash-negative'}">${formatSignedContributionValue(row.delta)}</td>
          <td>${row.rewardBefore ? getContributionRewardLabel(row.rewardBefore) : '--'} -> ${row.rewardAfter ? getContributionRewardLabel(row.rewardAfter) : '--'}</td>
          <td><span class="dash-contribution-status dash-contribution-status-${row.status}">${esc(adminT(`adminContributionStatus${row.status.charAt(0).toUpperCase()}${row.status.slice(1)}`))}</span>${row.matchSource === 'manual' ? `<small class="dash-contribution-match-source dash-contribution-match-source-manual">${esc(adminT('adminContributionManualMatch'))}</small>` : row.matchSource === 'auto' ? `<small class="dash-contribution-match-source dash-contribution-match-source-auto">${esc(adminT('adminContributionAutoMatch'))}</small>` : ''}</td>
        </tr>`
          )
          .join('')}</tbody>
      </table>
    </div>`;
    hydrateDashboardTableLabels(body);
    body.querySelectorAll('[data-contribution-filter]').forEach((control) => {
      const applyFilter = () => {
        const key = control.dataset.contributionFilter;
        if (!Object.prototype.hasOwnProperty.call(contributionComparisonFilters, key)) return;
        contributionComparisonFilters[key] = control.value || (key === 'status' ? 'all' : '');
        clearTimeout(contributionComparisonFilterTimer);
        const selectionStart = control.selectionStart;
        contributionComparisonFilterTimer = window.setTimeout(
          () => {
            renderSelected();
            const next = body.querySelector(`[data-contribution-filter="${key}"]`);
            next?.focus();
            if (typeof next?.setSelectionRange === 'function' && Number.isInteger(selectionStart)) {
              next.setSelectionRange(selectionStart, selectionStart);
            }
          },
          control.tagName === 'SELECT' ? 0 : 160
        );
      };
      control.addEventListener('input', applyFilter);
      control.addEventListener('change', applyFilter);
    });
    body.querySelectorAll('[data-contribution-alias-queue]').forEach((button) => {
      button.addEventListener('click', () => {
        const container = button.closest('.dash-contribution-alias-match');
        const oldInput = container?.querySelector('[data-contribution-alias-old]');
        const requestedOldName = oldInput?.value || '';
        const queueKey = button.dataset.contributionAliasKey || '';
        const newName = button.dataset.contributionAliasNew || '';
        const newGuild = button.dataset.contributionAliasGuild || '';
        const oldRow = missingCandidates.find(
          (row) =>
            row.canonicalName.toLocaleLowerCase() === requestedOldName.trim().toLocaleLowerCase()
        );
        const oldName = oldRow?.canonicalName || '';
        if (!queueKey || !oldName || !newName) {
          oldInput?.setCustomValidity(adminT('adminContributionChooseOldName'));
          oldInput?.reportValidity();
          return;
        }
        oldInput?.setCustomValidity('');
        contributionAliasMatchQueue.set(queueKey, { oldName, newName, newGuild });
        renderSelected();
      });
    });
    body.querySelector('[data-contribution-alias-clear]')?.addEventListener('click', () => {
      contributionAliasMatchQueue.clear();
      renderSelected();
    });
    body
      .querySelector('[data-contribution-alias-save]')
      ?.addEventListener('click', async (event) => {
        const button = event.currentTarget;
        if (!contributionAliasMatchQueue.size) return;
        button.disabled = true;
        try {
          let registry = state.playerRegistry || readStoredPlayerRegistry();
          contributionAliasMatchQueue.forEach((match) => {
            registry = addContributionAliasMatch(registry, match.oldName, match.newName);
          });
          const count = contributionAliasMatchQueue.size;
          await savePlayerRegistry(registry);
          logRosterEvent(
            'adminContributionAliasBatchMatchedLog',
            'success',
            { count },
            { source: 'contribution-compare' }
          );
          contributionAliasMatchQueue.clear();
          if (typeof window.showToast === 'function') {
            window.showToast(
              adminT('adminContributionAliasBatchMatchedToast', { count }),
              'success',
              3200
            );
          }
          renderSelected();
        } catch (error) {
          button.disabled = false;
          if (typeof window.showToast === 'function') {
            window.showToast(
              adminT('adminContributionAliasMatchFailedToast', {
                reason: error?.message || adminT('edenX1UnknownError'),
              }),
              'error',
              5000
            );
          }
        }
      });
    body.querySelectorAll('[data-contribution-alias-undo]').forEach((button) => {
      button.addEventListener('click', async () => {
        const newName = button.dataset.contributionAliasUndo || '';
        if (!newName) return;
        button.disabled = true;
        try {
          const registry = removeContributionAliasMatch(
            state.playerRegistry || readStoredPlayerRegistry(),
            newName
          );
          await savePlayerRegistry(registry);
          logRosterEvent(
            'adminContributionAliasRemovedLog',
            'success',
            { newName },
            { source: 'contribution-compare' }
          );
          if (typeof window.showToast === 'function') {
            window.showToast(
              adminT('adminContributionAliasRemovedToast', { newName }),
              'success',
              3200
            );
          }
          renderSelected();
        } catch (error) {
          button.disabled = false;
          if (typeof window.showToast === 'function') {
            window.showToast(
              adminT('adminContributionAliasMatchFailedToast', {
                reason: error?.message || adminT('edenX1UnknownError'),
              }),
              'error',
              5000
            );
          }
        }
      });
    });
  };
  const changeComparedSnapshots = () => {
    contributionAliasMatchQueue.clear();
    renderSelected();
  };
  baseSelect?.addEventListener('change', changeComparedSnapshots);
  finalSelect?.addEventListener('change', changeComparedSnapshots);
  $id('dashContributionCompareExportBtn').onclick = exportContributionComparison;
  renderSelected();
}

function formatConductContributionBonus(value) {
  return Number(value || 0) ? formatSignedContributionValue(value) : '0';
}

function weightedContributionBonusTotal(row) {
  return (
    Number(row?.shieldWalls || 0) +
    Number(row?.pathers || 0) +
    Number(row?.banners || 0) +
    Number(row?.conductBonus || 0)
  );
}

const WEIGHTED_CONTRIBUTION_COMPACT_KEY = 'vts_weighted_contribution_compact';

function isWeightedContributionCompactView() {
  try {
    return localStorage.getItem(WEIGHTED_CONTRIBUTION_COMPACT_KEY) === '1';
  } catch {
    // Some restricted browser contexts block localStorage; default to the full table.
    return false;
  }
}

function setWeightedContributionCompactView(enabled) {
  try {
    localStorage.setItem(WEIGHTED_CONTRIBUTION_COMPACT_KEY, enabled ? '1' : '0');
  } catch {
    // Keep the in-page toggle usable even when localStorage is unavailable.
  }
  document
    .querySelectorAll('#ocrDashboardRoot .dash-contribution-weighted-card')
    .forEach((card) => {
      card.classList.toggle('dash-weighted-compact', enabled);
      card.querySelectorAll('[data-weighted-compact-toggle]').forEach((button) => {
        button.setAttribute('aria-pressed', enabled ? 'true' : 'false');
        button.textContent = adminT(enabled ? 'edenX1FullView' : 'edenX1CompactView');
      });
    });
}

function renderWeightedContributionViewToggle(compact) {
  return `<button class="dash-btn dash-btn-xs dash-weighted-view-toggle" type="button" data-weighted-compact-toggle aria-pressed="${compact ? 'true' : 'false'}">${esc(adminT(compact ? 'edenX1FullView' : 'edenX1CompactView'))}</button>`;
}

function bindWeightedContributionViewToggle(host) {
  const compact = isWeightedContributionCompactView();
  host
    .querySelectorAll('.dash-contribution-weighted-card')
    .forEach((card) => card.classList.toggle('dash-weighted-compact', compact));
  host.querySelectorAll('[data-weighted-compact-toggle]').forEach((button) => {
    button.addEventListener('click', () => {
      setWeightedContributionCompactView(!isWeightedContributionCompactView());
    });
  });
}

function renderWeightedScorePopover(row, index, prefix = 'dashContributionWeightedScoreTip') {
  const tooltipId = `${prefix}-${index}`;
  const dutyCount = row.banners + row.pathers + row.shieldWalls;
  const dutyNote = adminT('edenX1DutyFormula', {
    banners: row.banners,
    pathers: row.pathers,
    shieldWalls: row.shieldWalls,
    count: dutyCount,
  });
  const conductNote = adminT('edenX1ConductFormula', {
    conduct: formatConductContributionBonus(row.conductBonus),
  });
  return `<button class="dash-weighted-score-trigger" type="button" aria-describedby="${tooltipId}" aria-label="${esc(adminT('edenX1WeightedBreakdownAria', { player: row.playerName }))}">
    <span class="dash-weighted-score-value">${row.weightedScore.toFixed(1)}</span>
    <span id="${tooltipId}" class="dash-weighted-score-popover" role="tooltip">
      <strong>${esc(adminT('edenX1WeightedBreakdownTitle'))}</strong>
      <span><span>${esc(adminT('edenX1BreakdownContribution'))}</span><b>${formatContributionValue(row.contributionScore)}</b></span>
      <span><span>${esc(adminT('adminThDemo'))}<small>${formatContributionValue(row.totalDemolition)} ÷ 20</small></span><b>${formatContributionValue(row.demolitionPoints)}</b></span>
      <span><span>${esc(adminT('edenX1BreakdownExGuild'))}</span><b>${formatContributionValue(row.contributionExGuild || 0)}</b></span>
      <span><span>${esc(adminT('edenX1BreakdownDuty'))}<small>${esc(dutyNote)}</small></span><b>${formatContributionValue(row.dutyPoints || 0)}</b></span>
      <span><span>${esc(adminT('edenX1BreakdownConductPoints'))}<small>${esc(conductNote)}</small></span><b>${formatSignedContributionValue(row.conductPoints || 0)}</b></span>
      <span class="dash-weighted-score-popover-total"><span>${esc(adminT('edenX1BreakdownTotal'))}</span><b>${row.weightedScore.toFixed(1)}</b></span>
    </span>
  </button>`;
}

function sortedContributionWeightedRows(rows) {
  const sort = state._contributionWeightedSort;
  if (!sort || !sort.col) return rows;
  const accessors = {
    player: (row) => row.playerName,
    currentRank: (row) => (row.currentRank ? Number(row.currentRank) : 999999),
    reward: (row) => getContributionRewardLabel(row.currentReward),
    contribution: (row) => parseContributionValue(row.contributionScore),
    demolition: (row) => parseContributionValue(row.totalDemolition),
    exGuild: (row) => parseContributionValue(row.contributionExGuild),
    shieldWalls: (row) => Number(row.shieldWalls || 0),
    pathers: (row) => Number(row.pathers || 0),
    banners: (row) => Number(row.banners || 0),
    conduct: (row) => Number(row.conductBonus || 0),
    total: weightedContributionBonusTotal,
    weighted: (row) => Number(row.weightedScore || 0),
    finalRank: (row) => row.finalRank || 999999,
    finalReward: (row) => getContributionRewardLabel(row.finalReward),
  };
  const get = accessors[sort.col];
  if (!get) return rows;
  const sorted = rows.slice().sort((a, b) => {
    const av = get(a);
    const bv = get(b);
    if (typeof av === 'string' || typeof bv === 'string')
      return String(av).localeCompare(String(bv));
    return av - bv;
  });
  return sort.dir === 'asc' ? sorted : sorted.reverse();
}

function contributionWeightedSearchNumber(value) {
  const n = Number(value || 0);
  const safe = Number.isFinite(n) ? n : 0;
  return [String(safe), safe.toLocaleString()].join(' ');
}

function contributionWeightedSearchText(row) {
  return [
    row.playerName,
    row.sourceName,
    row.playerKey,
    row.currentRank ? `#${row.currentRank}` : '',
    row.finalRank ? `#${row.finalRank}` : '',
    getContributionRewardLabel(row.currentReward),
    getContributionRewardLabel(row.finalReward),
    contributionWeightedSearchNumber(row.contributionScore),
    contributionWeightedSearchNumber(row.totalDemolition),
    contributionWeightedSearchNumber(row.demolitionPoints),
    contributionWeightedSearchNumber(row.contributionExGuild),
    contributionWeightedSearchNumber(row.shieldWalls),
    contributionWeightedSearchNumber(row.pathers),
    contributionWeightedSearchNumber(row.banners),
    contributionWeightedSearchNumber(row.conductBonus),
    contributionWeightedSearchNumber(weightedContributionBonusTotal(row)),
    contributionWeightedSearchNumber(row.weightedScore),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function filterContributionWeightedRows(rows) {
  const query = String(state._contributionWeightedSearchQ || '')
    .trim()
    .toLowerCase();
  if (!query) return rows;
  return rows.filter((row) => contributionWeightedSearchText(row).includes(query));
}

function setContributionWeightedSort(col) {
  const cur = state._contributionWeightedSort || {};
  if (cur.col === col) {
    state._contributionWeightedSort = { col, dir: cur.dir === 'asc' ? 'desc' : 'asc' };
  } else {
    const ascFirst = ['player', 'currentRank', 'reward', 'finalRank', 'finalReward'].includes(col);
    state._contributionWeightedSort = { col, dir: ascFirst ? 'asc' : 'desc' };
  }
  renderWeightedContributionTable();
}

function updateContributionWeightedSortGlyphs(host) {
  const sort = state._contributionWeightedSort;
  host.querySelectorAll('th[data-contribution-weighted-sort]').forEach((th) => {
    th.querySelector('.dash-sort-glyph')?.remove();
    th.removeAttribute('aria-sort');
    if (!sort || th.dataset.contributionWeightedSort !== sort.col) return;
    th.setAttribute('aria-sort', sort.dir === 'asc' ? 'ascending' : 'descending');
    const glyph = document.createElement('span');
    glyph.className = 'dash-sort-glyph';
    glyph.textContent = sort.dir === 'asc' ? ' ^' : ' v';
    th.appendChild(glyph);
  });
}

function bindContributionWeightedSort(host) {
  host.querySelectorAll('th[data-contribution-weighted-sort]').forEach((th) => {
    th.addEventListener('click', () =>
      setContributionWeightedSort(th.dataset.contributionWeightedSort)
    );
    th.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      setContributionWeightedSort(th.dataset.contributionWeightedSort);
    });
  });
  updateContributionWeightedSortGlyphs(host);
}

function renderWeightedContributionTable() {
  const host = $id('dashContributionWeightedPanel');
  if (!host) return;

  const model = buildWeightedContributionRows({
    contributionRecords: state.contributionRecords,
    dutyRecords: state.dutyRecords,
    r5Adjustments: state.r5Adjustments,
    season: state.r5Season,
    exGuildContributions: state.exGuildContributions,
    demolitionRecords: state.dashData?.attacks,
  });
  const rows = model.rows || [];

  if (!rows.length) {
    host.innerHTML = '';
    return;
  }

  const recordLabel = getWeightedContributionRecordLabel(model.record);
  const compactView = isWeightedContributionCompactView();
  const visibleRows = sortedContributionWeightedRows(filterContributionWeightedRows(rows));
  host.innerHTML = `<div class="dash-contribution-compare-card dash-contribution-weighted-card ${compactView ? 'dash-weighted-compact' : ''}">
    <div class="dash-contribution-compare-head">
      <div>
        <strong>${esc(adminT('edenX1WeightedTitle'))}</strong>
        <span>${esc(recordLabel || adminT('edenX1PageTitle'))} &middot; ${esc(adminT('adminContributionPremiumSlots', { count: model.premiumCutoff }))}</span>
      </div>
      <div class="dash-weighted-table-controls">
        <label class="dash-search-wrap dash-weighted-search" for="dashContributionWeightedSearch">
          <svg class="dash-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input id="dashContributionWeightedSearch" name="weightedContributionSearch" class="dash-search-input" type="search" value="${esc(state._contributionWeightedSearchQ || '')}" placeholder="${esc(adminT('adminSearchPh'))}" aria-label="${esc(adminT('adminSearchPh'))}" autocomplete="off" spellcheck="false" />
        </label>
        ${renderWeightedContributionViewToggle(compactView)}
      </div>
    </div>
    <div class="dash-contribution-compare-table-wrap">
      <table class="dash-banner-table dash-contribution-compare-table dash-contribution-weighted-table">
        <thead><tr><th data-contribution-weighted-sort="player" tabindex="0">${esc(adminT('adminContributionMember'))}</th><th class="dash-weighted-detail-col" data-contribution-weighted-sort="currentRank" tabindex="0">${esc(adminT('adminContributionRank'))}</th><th class="dash-weighted-detail-col" data-contribution-weighted-sort="reward" tabindex="0">${esc(adminT('adminContributionReward'))}</th><th class="dash-weighted-detail-col" style="text-align:right" data-contribution-weighted-sort="contribution" tabindex="0">${esc(adminT('edenX1ThContribution'))}</th><th class="dash-weighted-detail-col" style="text-align:right" data-contribution-weighted-sort="demolition" tabindex="0">${esc(adminT('adminThDemo'))}</th><th class="dash-weighted-detail-col" style="text-align:right" data-contribution-weighted-sort="exGuild" tabindex="0">${esc(adminT('edenX1ThExGuild'))}</th><th class="dash-weighted-detail-col" style="text-align:right" data-contribution-weighted-sort="shieldWalls" tabindex="0">${esc(adminT('edenX1ThShieldWalls'))}</th><th class="dash-weighted-detail-col" style="text-align:right" data-contribution-weighted-sort="pathers" tabindex="0">${esc(adminT('edenX1ThPathers'))}</th><th class="dash-weighted-detail-col" style="text-align:right" data-contribution-weighted-sort="banners" tabindex="0">${esc(adminT('edenX1ThBanners'))}</th><th class="dash-weighted-detail-col" style="text-align:right" data-contribution-weighted-sort="conduct" tabindex="0">${esc(adminT('edenX1ThConduct'))}</th><th class="dash-weighted-detail-col" style="text-align:right" data-contribution-weighted-sort="total" tabindex="0">${esc(adminT('edenX1ThTotal'))}</th><th style="text-align:right" data-contribution-weighted-sort="weighted" tabindex="0">${esc(adminT('edenX1ThWeightedScore'))}</th><th data-contribution-weighted-sort="finalRank" tabindex="0">${esc(adminT('adminContributionFinalRank'))}</th><th data-contribution-weighted-sort="finalReward" tabindex="0">${esc(adminT('adminContributionFinalReward'))}</th></tr></thead>
        <tbody>${
          visibleRows.length
            ? visibleRows
                .map(
                  (row, index) => `<tr>
          <td><strong>${esc(row.playerName)}</strong></td>
          <td class="dash-weighted-detail-col">${row.currentRank ? `#${esc(row.currentRank)}` : '--'}</td>
          <td class="dash-weighted-detail-col">${esc(getContributionRewardLabel(row.currentReward))}</td>
          <td class="dash-weighted-detail-col" style="text-align:right">${formatContributionValue(row.contributionScore)}</td>
          <td class="dash-weighted-detail-col" style="text-align:right">${formatContributionValue(row.totalDemolition)}</td>
          <td class="dash-weighted-detail-col" style="text-align:right">${formatContributionValue(row.contributionExGuild || 0)}</td>
          <td class="dash-weighted-detail-col" style="text-align:right">${row.shieldWalls}</td>
          <td class="dash-weighted-detail-col" style="text-align:right">${row.pathers}</td>
          <td class="dash-weighted-detail-col" style="text-align:right">${row.banners}</td>
          <td class="dash-weighted-detail-col ${row.conductBonus >= 0 ? 'dash-positive' : 'dash-negative'}" style="text-align:right">${formatConductContributionBonus(row.conductBonus)}</td>
          <td class="dash-weighted-detail-col" style="text-align:right">${weightedContributionBonusTotal(row).toLocaleString()}</td>
          <td class="dash-weighted-score-cell" style="text-align:right">${renderWeightedScorePopover(row, index)}</td>
          <td>#${row.finalRank}</td>
          <td>${esc(getContributionRewardLabel(row.finalReward))}</td>
        </tr>`
                )
                .join('')
            : `<tr><td colspan="14" class="dash-empty">${esc(adminT('edenX1NoRows'))}</td></tr>`
        }</tbody>
      </table>
    </div>
  </div>`;
  bindWeightedContributionViewToggle(host);
  const search = $id('dashContributionWeightedSearch');
  if (search) {
    search.oninput = (event) => {
      state._contributionWeightedSearchQ = event.target.value || '';
      renderWeightedContributionTable();
      const nextSearch = $id('dashContributionWeightedSearch');
      if (nextSearch) {
        nextSearch.focus();
        nextSearch.setSelectionRange(nextSearch.value.length, nextSearch.value.length);
      }
    };
  }
  hydrateDashboardTableLabels(host);
  bindContributionWeightedSort(host);
}

function renderContributions() {
  const body = $id('dashContributionBody');
  renderContributionComparison();
  renderWeightedContributionTable();
  if (!body) return;
  bindAdminControls(body);
  const records = Array.isArray(state.contributionRecords)
    ? state.contributionRecords.slice().reverse()
    : [];
  if (!records.length) {
    body.innerHTML = `<div class="dash-empty">${esc(adminT('adminContributionEmptyDetailed'))}</div>`;
    return;
  }
  body.innerHTML = records
    .map((record) => {
      const entries = normalizeContributionEntries(record.entries || []);
      const total = entries.reduce(
        (sum, entry) => sum + parseContributionValue(entry.contribution),
        0
      );
      const premiumCount = entries.filter(
        (entry) => getContributionReward(entry, record) === 'premium'
      ).length;
      const isPrimary = record.isPrimary === true;
      const rawNote = String(record.note || '').trim();
      const displayNote = getContributionDisplayNote(rawNote, entries.length);
      return `<div class="dash-banner-card dash-contribution-card ${isPrimary ? 'dash-contribution-primary' : ''}">
      <div class="dash-banner-head">
        <div class="dash-banner-date">
          <span style="cursor:pointer" role="button" tabindex="0" data-admin-action="set-contribution-primary" data-record-id="${esc(record.id)}" title="${esc(adminT(isPrimary ? 'adminContributionPrimaryTitle' : 'adminContributionSetPrimaryTitle'))}">${isPrimary ? '★' : '☆'}</span>
          <span>${esc(record.date || '')}</span>
          ${displayNote ? `<span class="dash-banner-event" title="${esc(rawNote)}">${esc(displayNote)}</span>` : ''}
          <span class="dash-banner-count">${esc(adminT('adminContributionRowsCount', { count: entries.length }))}</span>
          <span class="dash-banner-count">${esc(adminT('adminContributionTotalCount', { total: formatContributionValue(total) }))}</span>
          <span class="dash-contribution-premium-pill">${esc(adminT('adminContributionPremiumCount', { count: premiumCount }))}</span>
        </div>
        <div class="dash-contribution-card-actions">
          <button type="button" class="dash-btn dash-btn-xs" data-admin-action="export-contribution" data-record-id="${esc(record.id)}">${esc(adminT('adminBtnExport'))}</button>
          <button type="button" class="dash-btn dash-btn-xs" data-admin-action="edit-contribution" data-record-id="${esc(record.id)}">${esc(adminT('adminEdit'))}</button>
          <button type="button" class="dash-banner-del-btn" data-admin-action="delete-contribution" data-record-id="${esc(record.id)}" title="${esc(adminT('adminDelete'))}" aria-label="${esc(adminT('adminDelete'))}">x</button>
        </div>
      </div>
      <div class="dash-banner-body">
        <table class="dash-banner-table dash-table--stack dash-contribution-table">
          <thead><tr><th>${esc(adminT('adminContributionRank'))}</th><th>${esc(adminT('adminContributionMember'))}</th><th>${esc(adminT('adminContributionGuild'))}</th><th style="text-align:right">${esc(adminT('adminContributionValue'))}</th><th>${esc(adminT('adminContributionPosition'))}</th><th>${esc(adminT('adminContributionReward'))}</th></tr></thead>
          <tbody>${entries
            .map((entry, index) => {
              const reward = getContributionReward(entry, record);
              return `<tr>
              <td class="dash-contribution-rank">${entry.rank ? `#${esc(entry.rank)}` : '--'}</td>
              <td><strong>${esc(stripGuildTagsFromPlayerName(entry.name || ''))}</strong></td>
              <td>${entry.guild ? esc(entry.guild) : '<span style="color:var(--text-dim)">--</span>'}</td>
              <td style="text-align:right;font-weight:800;color:var(--brand-light)">${formatContributionValue(entry.contribution)}</td>
              <td>${entry.position ? esc(entry.position) : '<span style="color:var(--text-dim)">--</span>'}</td>
              <td>
                <select class="dash-contribution-reward-select dash-contribution-reward-${reward}" name="contributionRewardOverride" aria-label="${esc(adminT('adminContributionReward'))}" data-admin-action="set-contribution-reward" data-record-id="${esc(record.id)}" data-entry-index="${index}">
                  <option value=""${!normalizeRewardTier(entry.rewardOverride) ? ' selected' : ''}>${esc(getContributionRewardLabel(reward))}${normalizeRewardTier(entry.rewardOverride) ? '' : ` ${esc(adminT('adminContributionAutoSuffix'))}`}</option>
                  <option value="premium"${normalizeRewardTier(entry.rewardOverride) === 'premium' ? ' selected' : ''}>${esc(adminT('adminContributionRewardPremium'))}</option>
                  <option value="standard"${normalizeRewardTier(entry.rewardOverride) === 'standard' ? ' selected' : ''}>${esc(adminT('adminContributionRewardStandard'))}</option>
                  <option value="review"${normalizeRewardTier(entry.rewardOverride) === 'review' ? ' selected' : ''}>${esc(adminT('adminContributionRewardReview'))}</option>
                  <option value="none"${normalizeRewardTier(entry.rewardOverride) === 'none' ? ' selected' : ''}>${esc(adminT('adminContributionRewardNone'))}</option>
                </select>
              </td>
            </tr>`;
            })
            .join('')}</tbody>
        </table>
      </div>
    </div>`;
    })
    .join('');
  hydrateDashboardTableLabels(body);
  renderExGuildTable();
}

function renderExGuildTable() {
  const host = $id('dashExGuildBody');
  if (!host) return;
  bindAdminControls(host);
  const entries = state.exGuildContributions || [];
  const { primaryKeys, targets } = getExGuildMatchContext();
  state._exGuildMatchTargets = targets;
  if (!entries.length) {
    const recoverable = getRecoverableExGuildCandidate();
    host.innerHTML = `<div class="dash-empty dash-exguild-empty">
      <span>${esc(adminT('adminExGuildEmpty'))}</span>
      ${
        recoverable
          ? `<button id="dashExGuildRestoreBtn" class="dash-btn dash-btn-soft" type="button">${esc(adminT('adminExGuildRestoreBackup', { count: recoverable.entries.length, label: recoverable.label }))}</button>`
          : ''
      }
    </div>`;
    $id('dashExGuildRestoreBtn')?.addEventListener('click', restoreExGuildBackup);
    return;
  }
  const rowsHtml = entries
    .map((entry) => {
      const { cleanName, manualMatch, matchedName } = resolveExGuildMatch(entry, {
        primaryKeys,
        targets,
      });
      const matchedLabel = `${adminT('adminExGuildMatchTo')}: ${matchedName}`;
      const matched = Boolean(matchedName);
      const statusBadge = matched
        ? `<span class="dash-badge dash-badge-ok dash-badge-match-tip" tabindex="0" role="status" aria-label="${esc(matchedLabel)}" data-match-tooltip="${esc(matchedLabel)}">${esc(adminT('adminExGuildMatched'))}</span>`
        : `<span class="dash-badge">${esc(adminT('adminExGuildUnmatched'))}</span>`;
      return `<tr>
        <td><strong>${esc(cleanName)}</strong></td>
        <td style="text-align:right;font-weight:800">${formatContributionValue(entry.contribution)}</td>
        <td style="font-size:0.72rem;color:var(--text-dim)">${esc(entry.sourceNote || '')}</td>
        <td>${statusBadge}</td>
        <td>
          <div class="dash-xg-box" data-exguild-match>
            <input type="text" name="exGuildMatch" class="dash-input dash-xg-input" data-exguild-match-input data-entry-id="${esc(entry.id)}" value="${esc(manualMatch)}" placeholder="${esc(adminT('adminExGuildMatchSearchPh'))}" aria-label="${esc(adminT('adminExGuildMatchSearchPh'))}" autocomplete="off" spellcheck="false">
            <button type="button" class="dash-banner-del-btn dash-xg-clear" data-exguild-clear-match title="${esc(adminT('adminExGuildClearMatch'))}" aria-label="${esc(adminT('adminExGuildClearMatch'))}">x</button>
            <div class="dash-xg-results" data-exguild-match-results hidden></div>
          </div>
        </td>
        <td><button type="button" class="dash-banner-del-btn" data-admin-action="delete-exguild-entry" data-entry-id="${esc(entry.id)}" title="${esc(adminT('adminDelete'))}">x</button></td>
      </tr>`;
    })
    .join('');
  host.innerHTML = `<div class="dash-xg-tools">
    <span>${esc(adminT('adminExGuildSearchableNames', { count: targets.length }))}</span>
    <button id="dashExGuildDebuffExportInlineBtn" class="dash-btn dash-btn-xs dash-btn-soft" type="button">${esc(adminT('adminExGuildExportDebuff'))}</button>
  </div>
  <table class="dash-banner-table dash-table--stack dash-xg-table">
    <thead><tr><th>${esc(adminT('adminContributionMember'))}</th><th style="text-align:right">${esc(adminT('adminContributionValue'))}</th><th>${esc(adminT('adminContributionNoteLabel'))}</th><th>${esc(adminT('adminExGuildStatus'))}</th><th>${esc(adminT('adminExGuildMatchTo'))}</th><th></th></tr></thead>
    <tbody>${rowsHtml}</tbody>
  </table>
  <div style="margin-top:0.5rem">
    <button type="button" class="dash-btn" data-admin-action="clear-exguild" style="font-size:0.75rem">${esc(adminT('adminExGuildClearAll'))}</button>
  </div>`;
  bindExGuildMatchSearch(host);
  $id('dashExGuildDebuffExportInlineBtn')?.addEventListener('click', exportExGuildDebuffList);
  hydrateDashboardTableLabels(host);
}

export {
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
  saveDutyRecords,
  showDutyPasteForm,
  showDutyConfirmModal,
  processDutyImages,
  editDutyRecord,
  deleteDutyRecord,
  renderDutyRecords,
  loadContributionRecords,
  saveContributionRecords,
  showContributionPasteForm,
  showExGuildPasteForm,
  showContributionConfirmModal,
  processContributionImages,
  runBohMatchOcr,
  editContributionRecord,
  deleteContributionRecord,
  setContributionReward,
  setContributionPrimary,
  exportContributionRecords,
  exportExGuildDebuffList,
  renderContributions,
  deleteExGuildEntry,
  clearExGuildData,
  setExGuildMatch,
};
