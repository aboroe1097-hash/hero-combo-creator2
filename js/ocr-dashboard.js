import { 
  loadRoster, saveRoster, showRosterModal,
  loadRosterSnapshots, saveRosterSnapshots, computeRosterDiff, takeRosterSnapshot, deleteRosterSnapshot,
  loadAllianceList, saveAllianceList, loadRosterAuth, saveRosterAuth, rosterLogin, rosterLogout,
  _ensureMember, setRosterStatus, setRosterAlliance,
  toggleBulkCheck, toggleBulkSelectAll, applyBulkStatus, applyBulkAlliance,
  exportRosterCSV, copyRosterNames,
  showRosterSnapshotModal, configureAlliances, renderRoster,
  loadBannerRecords, saveBannerRecords, showBannerForm, deleteBannerRecord, renderBanners, getTeamColor, hashCode,
  loadDutyRecords, showDutyPasteForm, processDutyImages, editDutyRecord, deleteDutyRecord, renderDutyRecords,
  loadContributionRecords, showContributionPasteForm, processContributionImages, editContributionRecord,
  deleteContributionRecord, setContributionReward, exportContributionRecords, renderContributions
} from './ocr-roster.js?v=20260624_043500';

import { render, showModal, closeModal, buildPlayerSummary, animateAnalyticsCards } from './ocr-render.js?v=20260624_043500';
import { processFiles, normalizeStructureTarget, parseOcrResults, fmtDate, displayGameTime } from './ocr-engine.js?v=20260624_043500';
import { translations } from './translations.js';
// --- Serverless OCR Dashboard ---
import { initFirebase, ensureAnonymousAuth, getDb, getFirebaseAdminClaim } from './firebase.js';
import { importFirestore } from './firebase-sdk.js';
const { doc, getDoc, setDoc, onSnapshot } = await importFirestore();
import {
  STORAGE_KEY, AUTH_KEY, ROSTER_KEY, ROSTER_SNAPSHOTS_KEY, BANNER_KEY, FS_PATH, FS_ROSTER_PATH,
  ROSTER_USERS, ROSTER_AUTH_KEY, ALLIANCE_KEY, ALLIANCE_COUNT,
  LOG_KEY, AUTH_HASH, CLEAR_HASH, DELETE_HASHES, DURABILITY_TABLE,
  state, $id, esc, log, appendLogEntry, persistLog, restoreLogs,
  tryRepairJson, getSimilarity, getSimilarityAlphaNum, editDistance, findBestMatch,
  resolvePlayerNameForAttack,
  validateTotalDemolition, sha256, checkOcrService, qwenVisionRequest,
  describeOcrRequestError, getOcrRetryDelayMs, isRetryableOcrRequestError,
  formatStructureLabel, formatDatasetStructureLabel, getDatasetStructureTarget, isNameOnlyStructure,
  trimRosterSnapshots
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
state.sortCol = 'total_demolition';
state.sortDir = 'desc';
state.structureFilterKey = '';
state.cloudSyncConfigured = false;
state.cloudAdminReady = false;

let adminClaimWarningLogged = false;

// --- Roster Admin Functions (remain in dashboard scope) ---

async function initDashboardFirebase() {
  const firebase = initFirebase();
  state.cloudSyncConfigured = Boolean(firebase?.configured && firebase.db && firebase.auth);
  if (!state.cloudSyncConfigured) {
    log('Cloud sync disabled; using local storage only.', 'warn');
  }
  return state.cloudSyncConfigured;
}

async function ensureCloudSyncReady() {
  if (!state.cloudSyncConfigured) return null;
  const db = getDb();
  if (!db) return null;
  const user = await ensureAnonymousAuth();
  let hasAdminClaim = await getFirebaseAdminClaim(false);
  if (!hasAdminClaim) hasAdminClaim = await getFirebaseAdminClaim(true);
  state.cloudAdminReady = hasAdminClaim;
  if (!hasAdminClaim) {
    if (!adminClaimWarningLogged) {
      adminClaimWarningLogged = true;
      log(
        `Cloud sync needs a Firebase admin claim for UID ${user.uid}. Run npm run firebase:admin-claim with FIREBASE_ADMIN_UID=${user.uid}, then reload this page.`,
        'warn'
      );
    }
    return null;
  }
  return db;
}

// --- Sub-tab Switching ---

// --- Roster ---



// ── Sub-tab Switching ────────────────────────────────────
function switchDashSubtab(name) {
  document.querySelectorAll('#ocrDashboardRoot .dash-subtab-panel').forEach(p => p.classList.add('hidden'));
  document.querySelectorAll('#ocrDashboardRoot .dash-subtab-btn').forEach(b => {
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
    hydrateDashboardStateFromLocalStorage();
    render();
    animateAnalyticsCards();
  } else {
    state._analyticsAnimated = false;
  }
  if (name === 'roster') renderRoster();
  if (name === 'banners') renderBanners();
  if (name === 'banners' || name === 'pathers' || name === 'speedTiles' || name === 'shieldWall') renderDutyRecords();
  if (name === 'contributions') renderContributions();
}
window.switchDashSubtab = switchDashSubtab;
window.seedDashboardForSmokeTest = function(dashData, rosterSnapshots = []) {
  state.dashData = normalizeDashboardDataForCache(dashData);
  state.rosterSnapshots = Array.isArray(rosterSnapshots) ? rosterSnapshots : [];
};

function bindSubtabNavigation() {
  const nav = document.querySelector('#ocrDashboardRoot .dash-subtab-nav');
  if (nav) nav.setAttribute('role', 'tablist');
  document.querySelectorAll('#ocrDashboardRoot .dash-subtab-panel').forEach(panel => {
    panel.setAttribute('role', 'tabpanel');
  });
  document.querySelectorAll('#ocrDashboardRoot .dash-subtab-btn').forEach(btn => {
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', btn.classList.contains('dash-subtab-active') ? 'true' : 'false');
    btn.tabIndex = btn.classList.contains('dash-subtab-active') ? 0 : -1;
    if (btn.dataset.subtabBound) return;
    btn.dataset.subtabBound = '1';
    btn.onclick = () => switchDashSubtab(btn.dataset.subtab);
    btn.onkeydown = (event) => {
      if (!['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
      const tabs = Array.from(document.querySelectorAll('#ocrDashboardRoot .dash-subtab-btn'));
      const current = tabs.indexOf(btn);
      if (current < 0) return;
      event.preventDefault();
      const last = tabs.length - 1;
      const nextIndex = event.key === 'Home'
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
      if (cached?.attacks) state.dashData = normalizeDashboardDataForCache(cached);
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
  state.dashData = null;
  hydrateDashboardStateFromLocalStorage();
  render();
};

window.setOcrDashboardDataForTest = function setOcrDashboardDataForTest(dashData, rosterSnapshots = []) {
  state.dashData = normalizeDashboardDataForCache(dashData);
  state.rosterSnapshots = Array.isArray(rosterSnapshots) ? rosterSnapshots : [];
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.dashData)); } catch (e) {}
  try { localStorage.setItem(ROSTER_SNAPSHOTS_KEY, JSON.stringify(state.rosterSnapshots)); } catch (e) {}
  render();
};

// ── Roster Snapshots (local + Firestore) ──────────────────
export async function saveRosterSnapshotsToFirestore() {
  try {
    const db = await ensureCloudSyncReady();
    if (!db) return;
    const snapshots = trimRosterSnapshots(state.rosterSnapshots);
    if (snapshots.length !== state.rosterSnapshots.length) {
      state.rosterSnapshots = snapshots;
      localStorage.setItem(ROSTER_SNAPSHOTS_KEY, JSON.stringify(state.rosterSnapshots));
      log(`Roster snapshot history trimmed to ${snapshots.length} cloud-safe snapshots.`, 'warn');
    }
    await setDoc(doc(db, FS_ROSTER_PATH), { snapshots, updated: new Date().toISOString() });
  } catch (e) {
    console.error('ROSTER FIRESTORE SAVE ERROR:', e);
    log(`Roster cloud save failed: ${e?.message || e}`, 'error');
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
    const snap = await getDoc(doc(db, FS_ROSTER_PATH));
    if (snap.exists()) {
      const data = snap.data();
      if (Array.isArray(data.snapshots)) {
        state.rosterSnapshots = trimRosterSnapshots(data.snapshots);
        localStorage.setItem(ROSTER_SNAPSHOTS_KEY, JSON.stringify(state.rosterSnapshots));
      }
    }
    state._fsRosterUnsub = onSnapshot(doc(db, FS_ROSTER_PATH), (s) => {
      if (s.exists()) {
        const d = s.data();
        if (Array.isArray(d.snapshots)) {
          state.rosterSnapshots = trimRosterSnapshots(d.snapshots);
          localStorage.setItem(ROSTER_SNAPSHOTS_KEY, JSON.stringify(state.rosterSnapshots));
          renderRoster();
        }
      }
    }, (err) => console.error('ROSTER SYNC ERROR:', err));
  } catch (e) {
    console.error('ROSTER FIRESTORE LOAD ERROR:', e);
  }
}

// ── Roster Image OCR ─────────────────────────────────────
async function processRosterImages(files) {
  if (state._rosterProcessing) { log('Roster OCR already running...', 'warn'); return; }
  state._rosterProcessing = true;
  const valid = Array.from(files).filter(f => /\.(png|jpe?g)$/i.test(f.name));
  if (!valid.length) { state._rosterProcessing = false; return; }

  const prog = $id('dashRosterProgress');
  const progText = $id('dashRosterProgressText');
  if (prog) prog.classList.remove('hidden');

  log(`Scanning ${valid.length} roster screenshot(s)...`, 'info');

  let allNames = [];

  for (let i = 0; i < valid.length; i++) {
    const f = valid[i];
    if (progText) progText.textContent = `Scanning roster image ${i + 1}/${valid.length}...`;
    const base64 = await new Promise(res => {
      const r = new FileReader(); r.onload = e => res(e.target.result.split(',')[1]); r.readAsDataURL(f);
    });

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
          raw = await qwenVisionRequest([{ role: 'user', content: [
            { type: 'text', text: promptTxt },
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}` } }
          ]}]);
          if (raw?.choices?.[0]?.message?.content) break;
        } catch (e) {
          if (attempt === 3 || !isRetryableOcrRequestError(e)) throw e;
          const delayMs = getOcrRetryDelayMs(e, attempt);
          const delaySeconds = Math.max(1, Math.ceil(delayMs / 1000));
          log(`Roster OCR request failed: ${describeOcrRequestError(e)}. Retrying in ${delaySeconds}s (${attempt}/3)...`, 'warn', f.name);
          await new Promise(r => setTimeout(r, delayMs));
        }
      }

      const text = raw?.choices?.[0]?.message?.content || '';
      let names = [];
      try {
        const cleaned = text.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').trim();
        names = JSON.parse(cleaned);
      } catch (e) {
        names = text.split('\n').map(l => l.replace(/^[\d\s."'[\],]+/, '').trim()).filter(Boolean);
      }
      if (!Array.isArray(names)) names = [];
      names = names.filter(n => typeof n === 'string' && n.trim().length > 0).map(n => n.trim());
      allNames.push(...names);
    } catch (e) {
      log(`Roster OCR error: ${describeOcrRequestError(e)}`, 'error', f.name);
    }
  }

  if (prog) prog.classList.add('hidden');
  state._rosterProcessing = false;

  const unique = [...new Set(allNames.map(n => n.toLowerCase()))].map(k => allNames.find(n => n.toLowerCase() === k)).filter(Boolean).sort();

  if (!unique.length) {
    log('No member names found in the screenshot(s).', 'warn');
    alert('Could not extract any member names from the image. Check the log panel for details.');
    return;
  }

  log(`Extracted ${unique.length} unique member names from roster image(s).`, 'info');

  const prevText = state.rosterSnapshots.length ? state.rosterSnapshots[state.rosterSnapshots.length - 1].members.join('\n') : '';
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




// ── Banner Records ────────────────────────────────────────

export function isGuest() { return sessionStorage.getItem('vts_guest') === '1'; }
function isAuthed() { return (Boolean(AUTH_HASH) && localStorage.getItem(AUTH_KEY) === '1') || isGuest(); }

function dashT(key, vars = {}) {
  const lang = localStorage.getItem('vts_hero_lang') || document.documentElement.lang || 'en';
  const dictionaries = window.VTS_TRANSLATIONS || translations;
  let text = (
    dictionaries[lang]?.[key] ||
    translations[lang]?.[key] ||
    dictionaries.en?.[key] ||
    translations.en?.[key] ||
    key
  );
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
  if (document.querySelector('.dash-actions')) document.querySelector('.dash-actions').style.display = '';
  if ($id('dashUploadZone')) $id('dashUploadZone').style.display = '';
  if ($id('dashLogArea')) $id('dashLogArea').style.display = '';
  if ($id('dashApiKeyContainer')) $id('dashApiKeyContainer').style.display = 'flex';
  if ($id('dashInsightsCard')) $id('dashInsightsCard').style.display = '';
  if ($id('dashAttackHistoryCard')) $id('dashAttackHistoryCard').style.display = '';
  if (document.querySelector('.dash-kpi-grid')) document.querySelector('.dash-kpi-grid').style.display = '';
}

function removeGuestBanner() {
  const guestBanner = $id('dashGuestBanner');
  if (!guestBanner) return;
  guestBanner.classList.add('hidden');
  guestBanner.replaceChildren();
}

function returnToAdminLogin() {
  sessionStorage.removeItem('vts_guest');
  localStorage.removeItem(AUTH_KEY);
  removeGuestBanner();
  restoreAdminControls();
  const err = $id('dashLoginErr');
  if (err) err.classList.add('hidden');
  const input = $id('dashLoginPass');
  if (input) input.value = '';
  showLogin();
  window.setTimeout(() => input?.focus(), 0);
}

function renderGuestBanner(guestBanner) {
  guestBanner.className = 'dash-guest-banner';
  guestBanner.innerHTML = `
    <div class="dash-guest-copy">
      <strong>${esc(dashT('adminGuestModeTitle'))}</strong>
      <span>${esc(dashT('adminGuestModeBody'))}</span>
    </div>
    <div class="dash-guest-actions">
      <button id="dashGuestAdminBtn" class="dash-btn dash-guest-admin-btn" type="button">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
          <polyline points="10 17 15 12 10 7"/>
          <line x1="15" y1="12" x2="3" y2="12"/>
        </svg>
        <span>${esc(dashT('adminGuestLoginAdminBtn'))}</span>
      </button>
    </div>`;
  guestBanner.querySelector('#dashGuestAdminBtn')?.addEventListener('click', returnToAdminLogin);
}

function showApp() { 
  $id('dashLogin')?.classList.add('hidden'); 
  $id('dashApp')?.classList.remove('hidden'); 
  if (isGuest()) {
    hydrateDashboardStateFromLocalStorage();
    if (document.querySelector('.dash-actions')) document.querySelector('.dash-actions').style.display = 'none';
    if ($id('dashUploadZone')) $id('dashUploadZone').style.display = 'none';
    if ($id('dashLogArea')) $id('dashLogArea').style.display = 'none';
    if ($id('dashApiKeyContainer')) $id('dashApiKeyContainer').style.display = 'none';
    if ($id('dashInsightsCard')) $id('dashInsightsCard').style.display = 'none';
    if ($id('dashAttackHistoryCard')) $id('dashAttackHistoryCard').style.display = 'none';
    if (document.querySelector('.dash-kpi-grid')) document.querySelector('.dash-kpi-grid').style.display = 'none';
    
    let guestBanner = $id('dashGuestBanner');
    if (!guestBanner) {
      guestBanner = document.createElement('div');
      guestBanner.id = 'dashGuestBanner';
      guestBanner.className = 'dash-guest-banner';
      const dashContainer = $id('dashApp').querySelector('.dash-container');
      if (dashContainer) {
        dashContainer.insertBefore(guestBanner, dashContainer.firstChild);
      }
    }
    guestBanner.classList.remove('hidden');
    renderGuestBanner(guestBanner);
  } else {
    removeGuestBanner();
    restoreAdminControls();
  }
}
function showLogin() {
  if (isGuest()) {
    showApp();
    return;
  }
  removeGuestBanner();
  restoreAdminControls();
  $id('dashLogin')?.classList.remove('hidden');
  $id('dashApp')?.classList.add('hidden');
  const loginBtn = $id('dashLoginBtn');
  const guestBtn = $id('dashGuestBtn');
  const passInput = $id('dashLoginPass');
  const err = $id('dashLoginErr');
  if (!AUTH_HASH) {
    if (loginBtn) loginBtn.style.display = 'none';
    if (passInput) {
      passInput.disabled = true;
      passInput.style.display = 'none';
      passInput.placeholder = 'Admin password not configured';
    }
    if (guestBtn) {
      guestBtn.classList.add('dash-btn-primary');
      guestBtn.textContent = 'Open Guest Dashboard';
    }
    if (err) {
      err.textContent = 'Admin sign-in is not configured for this deployment. Guest mode is read-only.';
      err.classList.remove('hidden');
    }
  } else {
    if (loginBtn) {
      loginBtn.disabled = false;
      loginBtn.style.display = '';
    }
    if (passInput) {
      passInput.disabled = false;
      passInput.style.display = '';
      passInput.placeholder = dashT('adminLoginPass');
    }
    if (guestBtn) {
      guestBtn.classList.remove('dash-btn-primary');
      guestBtn.textContent = dashT('adminGuestBtn');
    }
    if (err) err.classList.add('hidden');
  }
}

function mountStructureUploadPanel() {
  const mount = $id('dashUploadStructuresMount');
  const logArea = $id('dashLogArea');
  const uploadZone = $id('dashUploadZone');
  if (!mount) return;
  if (logArea && logArea.parentElement !== mount) mount.appendChild(logArea);
  if (uploadZone && uploadZone.parentElement !== mount) mount.appendChild(uploadZone);
}

async function doLogin() {
  const p = $id('dashLoginPass').value, err = $id('dashLoginErr');
  if (!AUTH_HASH) {
    localStorage.removeItem(AUTH_KEY);
    err.textContent = 'Admin auth is not configured for this deployment.';
    err.classList.remove('hidden');
    return;
  }
  const h = await sha256(p);
  if (h === AUTH_HASH) { sessionStorage.removeItem('vts_guest'); localStorage.setItem(AUTH_KEY, '1'); err.classList.add('hidden'); showApp(); await loadData(); }
  else { err.textContent = 'Invalid access code'; err.classList.remove('hidden'); }
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

function sanitizeDashboardDataForPersistence(data) {
  if (!data || typeof data !== 'object') return data;
  const clean = { ...data };
  delete clean.logs;
  if (Array.isArray(clean.attacks)) {
    clean.attacks = clean.attacks.map((attack) => {
      if (!attack || typeof attack !== 'object') return attack;
      const copy = { ...attack };
      delete copy._validation;
      return copy;
    });
  }
  return clean;
}

export async function saveData(data) {
  state.dashData = normalizeDashboardDataForCache(data);
  if (state.dashData && typeof state.dashData === 'object') {
    delete state.dashData.logs;
  }
  const persistedData = sanitizeDashboardDataForPersistence(state.dashData);
  try { 
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persistedData));
  } catch (e) {}
  try { 
    const db = await ensureCloudSyncReady();
    if (!db) return;
    await setDoc(doc(db, FS_PATH), persistedData);
    log('Synced to cloud.', 'info'); 
  } catch (e) { 
    console.error("FIREBASE SAVE ERROR:", e);
    log('Save error: ' + (e.message || e.code), 'error'); 
  }
}

async function loadData() {
  let hadLocalData = false;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      hadLocalData = true;
      state.dashData = normalizeDashboardDataForCache(JSON.parse(saved));
      if (state.dashData && typeof state.dashData === 'object') delete state.dashData.logs;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.dashData));
      render();
    }
  } catch (e) {}
  try {
    const db = await ensureCloudSyncReady();
    if (!db) { log('Firestore not available — using local storage only.', 'warn'); return; }
    if (state._fsUnsub) state._fsUnsub();
    const snap = await getDoc(doc(db, FS_PATH));
    if (snap.exists()) {
      state.dashData = normalizeDashboardDataForCache(snap.data());
      if (state.dashData && typeof state.dashData === 'object') delete state.dashData.logs;
      try { 
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state.dashData)); 
      } catch (e) {}
      render();
    } else {
      if (!hadLocalData) {
        state.dashData = null;
        try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
        render();
      }
    }
    state._fsUnsub = onSnapshot(doc(db, FS_PATH), (snap) => {
      if (snap.exists()) {
        state.dashData = normalizeDashboardDataForCache(snap.data());
        if (state.dashData && typeof state.dashData === 'object') delete state.dashData.logs;
        try { 
          localStorage.setItem(STORAGE_KEY, JSON.stringify(state.dashData)); 
        } catch (e) {}
        render();
        const ind = $id('dashSyncIndicator');
        if (ind) {
          ind.classList.remove('hidden');
          setTimeout(() => ind.classList.add('hidden'), 3500);
        }
      }
    }, (err) => {
      console.error("FIREBASE SYNC ERROR:", err);
      log('Sync listener error: ' + (err.message || err.code), 'error');
    });
    log('Cloud sync active.', 'info');
  } catch (e) { 
    console.error("FIREBASE AUTH ERROR:", e);
    log('Load auth error: ' + (e.message || e.code), 'error'); 
  }
}

async function clearData() {
  state.dashData = null;
  try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
  try { localStorage.removeItem(LOG_KEY); } catch (e) {}
  try { 
    const db = await ensureCloudSyncReady();
    if (db) await setDoc(doc(db, FS_PATH), {}); 
  } catch (e) {}
  const out = $id('dashLogOutput'); if (out) out.innerHTML = '';
  render();
  log('Database wiped.', 'warn');
}

// --- Exports ---
function exportData() { if (!state.dashData) return; const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(state.dashData, null, 2)], { type: 'application/json' })); a.download = 'vts_admin_data.json'; a.click(); }
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
    csv += `${i + 1},"${safeName}",${p.total_demolition},${p.participation_count},${Math.round(p.total_demolition/p.participation_count)}\n`;
  });
  downloadCsv(csv, 'vts_leaderboard.csv');
}
async function exportToPng() {
  const html2canvas = await window.loadHtml2Canvas();
  const target = $id('dashApp')?.querySelector('.dash-container') || $id('dashApp');
  if (!target) return;
  html2canvas(target, { backgroundColor: '#0b0f19', scale: 2, allowTaint: false, useCORS: true }).then(c => { const a = document.createElement('a'); a.href = c.toDataURL('image/png'); a.download = 'vts_dashboard.png'; a.click(); }).catch(() => {});
}
async function exportChartPng() {
  const chart = $id('dashChart');
  if (!chart) return;
  const html2canvas = await window.loadHtml2Canvas();
  
  const card = chart.closest('.dash-card');
  const clone = card.cloneNode(true);
  
  // Remove export buttons from clone
  const cloneBtns = clone.querySelectorAll('.dash-btn');
  cloneBtns.forEach(b => b.remove());
  
  const subTitle = currentTopPerformersSubtitle();
  
  const titleH2 = clone.querySelector('h2.dash-card-title');
  if (titleH2) {
    titleH2.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" style="margin-right:10px"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> <span style="font-size:1.4rem;text-shadow:0 0 10px rgba(59,130,246,0.5)">Top Performers</span>`;
    const subDiv = document.createElement('div');
    subDiv.style.cssText = 'font-size:0.85rem; color:#94a3b8; margin-top:8px; margin-left:34px; font-weight:600; letter-spacing:0.02em;';
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
  items.forEach(item => {
     item.style.overflow = 'visible';
     item.style.borderRadius = '0';
     const bar = item.querySelector('.dash-top-bar');
     if (bar) {
       bar.style.borderRadius = '8px';
       bar.style.background = 'linear-gradient(90deg, rgba(59,130,246,0.1), rgba(59,130,246,0.3))';
     }
     const spans = item.querySelectorAll('span');
     spans.forEach(s => s.style.transform = 'translateY(1px)');
  });

  clone.style.position = 'absolute';
  clone.style.top = '0px';
  clone.style.left = '-9999px';
  clone.style.width = Math.max(card.offsetWidth, 500) + 'px'; // Ensure sufficient width for export
  clone.style.background = '#0b0f19'; // Force explicit background on clone
  clone.style.border = '1px solid rgba(255,255,255,0.05)';
  
  // Append to the root so CSS applies!
  const root = $id('ocrDashboardRoot') || document.body;
  root.querySelectorAll('[data-ocr-export-clone="true"]').forEach(node => node.remove());
  clone.dataset.ocrExportClone = 'true';
  root.appendChild(clone);

  html2canvas(clone, { backgroundColor: '#0b0f19', scale: 2 }).then(c => { 
    c.toBlob(blob => {
      const file = new File([blob], 'vts_top_performers.png', { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        // We have a share button now, maybe just download directly here unless explicitly sharing
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'vts_top_performers.png'; a.click();
      } else {
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'vts_top_performers.png'; a.click(); 
      }
    });
  }).catch(() => {}).finally(() => {
    clone.remove();
  });
}
window.shareChartImage = async function() {
  const chart = $id('dashChart');
  if (!chart) return;
  const html2canvas = await window.loadHtml2Canvas();
  const card = chart.closest('.dash-card');
  const clone = card.cloneNode(true);
  const cloneBtns = clone.querySelectorAll('.dash-btn'); cloneBtns.forEach(b => b.remove());
  const subTitle = currentTopPerformersSubtitle();
  const titleH2 = clone.querySelector('h2.dash-card-title');
  if (titleH2) {
    titleH2.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" style="margin-right:10px"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> <span style="font-size:1.4rem;text-shadow:0 0 10px rgba(59,130,246,0.5)">Top Performers</span>`;
    const subDiv = document.createElement('div'); subDiv.style.cssText = 'font-size:0.85rem; color:#94a3b8; margin-top:8px; margin-left:34px; font-weight:600; letter-spacing:0.02em;'; subDiv.textContent = subTitle;
    titleH2.parentElement.appendChild(subDiv); titleH2.parentElement.style.flexDirection = 'column'; titleH2.parentElement.style.alignItems = 'flex-start';
    titleH2.parentElement.style.borderBottom = '1px solid rgba(255,255,255,0.1)'; titleH2.parentElement.style.paddingBottom = '1rem'; titleH2.parentElement.style.marginBottom = '1rem';
  }
  const cloneChart = clone.querySelector('.dash-chart');
  if (cloneChart) cloneChart.style.gap = '0.9rem';

  const items = clone.querySelectorAll('.dash-top-item');
  items.forEach(item => {
     item.style.overflow = 'visible'; item.style.borderRadius = '0';
     const bar = item.querySelector('.dash-top-bar'); if (bar) { bar.style.borderRadius = '8px'; bar.style.background = 'linear-gradient(90deg, rgba(59,130,246,0.1), rgba(59,130,246,0.3))'; }
     const spans = item.querySelectorAll('span'); spans.forEach(s => s.style.transform = 'translateY(1px)');
  });
  clone.style.position = 'absolute'; clone.style.top = '0px'; clone.style.left = '-9999px'; clone.style.width = card.offsetWidth + 'px'; clone.style.background = '#0b0f19'; clone.style.border = '1px solid rgba(255,255,255,0.05)';
  const root = $id('ocrDashboardRoot') || document.body;
  root.querySelectorAll('[data-ocr-export-clone="true"]').forEach(node => node.remove());
  clone.dataset.ocrExportClone = 'true';
  root.appendChild(clone);
  html2canvas(clone, { backgroundColor: '#0b0f19', scale: 2 }).then(c => { 
    c.toBlob(blob => {
      const file = new File([blob], 'vts_top_performers.png', { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({ title: 'Top Performers', files: [file] }).catch(()=>{});
      } else {
        alert('Sharing not supported on this browser. Use the download button instead.');
      }
    });
  }).catch(() => {}).finally(() => { clone.remove(); });
}
function exportAttackCsv() {
  if (!state.dashData?.attacks?.length) return;
  const attacks = Array.isArray(state._lastRenderedAttacks)
    ? state._lastRenderedAttacks
    : state.dashData.attacks;
  let csv = 'Start Time (Game Time),End Time (Game Time),Structure,Level,Player Name,Rank,Demolition Value\n';
  attacks.forEach(a => {
    const date = displayGameTime(a.game_time);
    const start = a.start_time ? a.start_time.replace(/"/g, '""') : '';
    const target = getDatasetStructureTarget(a);
    (a.players||[]).forEach(p => { const safeName = p.name.replace(/"/g, '""'); csv += `"${start}","${date}","${target.structure_name}","${target.structure_level}","${safeName}",${p.rank},${p.value}\n`; });
  });
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'vts_attack_details.csv'; a.click();
}

function attackPlayers(attack) {
  return Array.isArray(attack?.players) ? attack.players : [];
}

function buildSerializablePlayerSummary(attacks) {
  return buildPlayerSummary(attacks).map(player => {
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
  let csv = 'Attack ID,Start Time (Game Time),End Time (Game Time),Structure,Level,Raw Name,Grouped Name (Master),Demolition Value,Rank\n';
  state.dashData.attacks.forEach(a => {
    const date = displayGameTime(a.game_time);
    const start = a.start_time ? a.start_time.replace(/"/g, '""') : '';
    const target = getDatasetStructureTarget(a);
    const players = attackPlayers(a);
    players.forEach(p => {
      const rawName = p.name.replace(/"/g, '""');
      const groupedName = resolvePlayerNameForAttack(p, players).replace(/"/g, '""');
      csv += `"${a.id}","${start}","${date}","${target.structure_name}","${target.structure_level}","${rawName}","${groupedName}",${p.value},${p.rank}\n`; 
    });
  });
  downloadCsv(csv, `vts_debug_export_${new Date().getTime()}.csv`);
}
function importData(file) {
  const r = new FileReader(); r.onload = e => {
    try {
      const imp = JSON.parse(e.target.result); if (!imp.attacks) throw 'Invalid';
      const m = {}; (state.dashData?.attacks||[]).forEach(a => m[a.id]=a); (imp.attacks||[]).forEach(a => m[a.id]=a);
      const sorted = Object.values(m).sort((a,b) => b.game_time.localeCompare(a.game_time));
      saveData({ last_updated: fmtDate(new Date()), total_attacks: sorted.length, attacks: sorted, players_summary: buildSerializablePlayerSummary(sorted)});
      render(); log('Import successful.', 'success');
    } catch (err) { alert('Import failed'); }
  }; r.readAsText(file);
}

// --- Render ---

async function openGuestDashboard() {
  localStorage.removeItem(AUTH_KEY);
  sessionStorage.setItem('vts_guest', '1');
  $id('dashLoginErr')?.classList.add('hidden');
  hydrateDashboardStateFromLocalStorage();
  showApp();
  render();
  await loadData();
}









export async function bootOcrDashboard() {
  if (state._booted) return; state._booted = true; loadRoster();
  if (!state._adminLanguageRefreshBound) {
    state._adminLanguageRefreshBound = true;
    window.addEventListener('vts:admin-language-change', () => {
      const guestBanner = $id('dashGuestBanner');
      if (guestBanner) renderGuestBanner(guestBanner);
      refreshRosterSnapshotLabel();
      if ($id('dashChart')) render();
      renderContributions();
    });
  }
  $id('dashLoginBtn').onclick = doLogin;
  $id('dashGuestBtn').onclick = openGuestDashboard;
  bindSubtabNavigation();
  if (!AUTH_HASH) sessionStorage.setItem('vts_guest', '1');
  if (isAuthed()) showApp(); else showLogin();
  try {
    await initDashboardFirebase();
    if (state.cloudSyncConfigured) await ensureAnonymousAuth();
  } catch (err) {
    console.warn('Cloud sync auth unavailable; continuing with local dashboard data.', err);
    state.cloudSyncConfigured = false;
  }
  loadRosterSnapshots();
  await loadRosterSnapshotsFromFirestore();
  loadBannerRecords();
  loadDutyRecords();
  loadContributionRecords();
  loadAllianceList();
  loadRosterAuth();
  mountStructureUploadPanel();
  // Keep log panel always visible
  const logArea = $id('dashLogArea'); if (logArea) logArea.classList.remove('hidden');
  restoreLogs();
  bindSubtabNavigation();
  $id('dashRefreshBtn').onclick = async () => { await loadData(); render(); };
  log('VTS Admin Dashboard loaded.', 'info');
  if (isAuthed()) {
    showApp();
    await loadData();
  } else {
    showLogin();
  }
  $id('dashRosterBtn').onclick = showRosterModal;
  const expBtn = $id('dashRosterExportBtn'); if (expBtn) expBtn.onclick = exportRosterCSV;
  bindSubtabNavigation();

  // Roster: manual snapshot button with dynamic day name
  const newSnapBtn = $id('dashRosterSnapshotBtn');
  if (newSnapBtn) {
    refreshRosterSnapshotLabel();
    newSnapBtn.onclick = () => {
      const prevText = state.rosterSnapshots.length ? state.rosterSnapshots[state.rosterSnapshots.length - 1].members.join('\n') : '';
      const input = prompt(dashT('adminRosterPastePrompt'), prevText);
      if (input !== null && input.trim()) takeRosterSnapshot(input);
    };
  }

  // ── API status watcher ──────────────────────────────────
  let ocrReady = false;
  async function updateApiStatus() {
    const result = await checkOcrService();
    ocrReady = result.configured === true;
    const els = [
      { id: 'dashRosterApiStatus', zone: 'dashRosterUploadZone', drop: 'dashRosterDropZone', input: 'dashRosterFileInput' },
      { id: 'dashApiUploadStatus', zone: 'dashUploadZone', drop: 'dashDropZone', input: 'dashFileInput' },
      { id: 'dashOcrServiceStatus' },
    ];
    els.forEach(({ id, zone, drop, input }) => {
      const statusEl = $id(id);
      const dropEl = $id(drop);
      const inputEl = $id(input);
      if (!statusEl) return;
      if (ocrReady) {
        statusEl.className = 'dash-roster-api-status dash-api-ok';
        statusEl.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg> ${esc(dashT('adminOcrServiceReady'))}`;
        if (dropEl) { dropEl.style.opacity = '1'; dropEl.style.pointerEvents = ''; }
        if (inputEl) inputEl.disabled = false;
      } else {
        statusEl.className = 'dash-roster-api-status dash-api-missing';
        const reason = result.error || dashT('adminOcrConfigureWorker');
        statusEl.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> <b>${esc(dashT('adminOcrUnavailable'))}</b> - ${esc(reason)}`;
        if (dropEl) { dropEl.style.opacity = '0.5'; dropEl.style.pointerEvents = 'none'; }
        if (inputEl) inputEl.disabled = true;
      }
    });
    return ocrReady;
  }
  function canUseOcr() {
    if (ocrReady) return true;
    updateApiStatus();
    return false;
  }

  // Run on boot and whenever key input changes
  updateApiStatus();
  const apiSaveBtn = $id('dashSaveApiBtn');
  if (apiSaveBtn) apiSaveBtn.addEventListener('click', updateApiStatus);

  // Roster: image upload
  const rosterZone = $id('dashRosterUploadZone');
  const rosterDrop = $id('dashRosterDropZone');
  const rosterInput = $id('dashRosterFileInput');
  if (rosterDrop && rosterInput) {
    rosterDrop.onclick = () => {
      if (!canUseOcr()) return;
      rosterInput.click();
    };
    rosterDrop.ondragover = e => { e.preventDefault(); rosterDrop.classList.add('dragover'); };
    rosterDrop.ondragleave = () => rosterDrop.classList.remove('dragover');
    rosterDrop.ondrop = e => {
      e.preventDefault(); rosterDrop.classList.remove('dragover');
      if (!canUseOcr()) return;
      if (e.dataTransfer.files.length) processRosterImages(e.dataTransfer.files);
    };
    rosterInput.onchange = () => {
      if (rosterInput.files.length) processRosterImages(rosterInput.files);
    };
  }

  const newBannerBtn = $id('dashBannerAddBtn'); if (newBannerBtn) newBannerBtn.onclick = () => showBannerForm();
  function bindDutyUpload(type, pasteBtnId, uploadBtnId, dropId, inputId) {
    const pasteBtn = $id(pasteBtnId);
    const uploadBtn = uploadBtnId ? $id(uploadBtnId) : null;
    const drop = dropId ? $id(dropId) : null;
    const input = inputId ? $id(inputId) : null;
    if (pasteBtn) pasteBtn.onclick = () => showDutyPasteForm(type);
    if (uploadBtn && input) uploadBtn.onclick = () => { if (!canUseOcr()) return; input.click(); };
    if (drop && input) {
      drop.onclick = event => {
        if (event.target?.tagName === 'INPUT') return;
        if (!canUseOcr()) return;
        input.click();
      };
      drop.ondragover = event => { event.preventDefault(); drop.classList.add('dragover'); };
      drop.ondragleave = () => drop.classList.remove('dragover');
      drop.ondrop = event => {
        event.preventDefault();
        drop.classList.remove('dragover');
        if (!canUseOcr()) return;
        if (event.dataTransfer.files.length) processDutyImages(type, event.dataTransfer.files);
      };
      input.onchange = () => { if (input.files.length) processDutyImages(type, input.files); };
    }
  }
  bindDutyUpload('banner', 'dashBannerListPasteBtn', 'dashBannerListUploadBtn', 'dashBannerListDropZone', 'dashBannerListFileInput');
  bindDutyUpload('pather', 'dashPatherListPasteBtn', 'dashPatherListUploadBtn', 'dashPatherListDropZone', 'dashPatherListFileInput');
  bindDutyUpload('shield_wall', 'dashShieldWallPasteBtn', null, null, null);
  renderDutyRecords();
  const contributionPasteBtn = $id('dashContributionPasteBtn');
  const contributionUploadBtn = $id('dashContributionUploadBtn');
  const contributionExportBtn = $id('dashContributionExportBtn');
  const contributionDrop = $id('dashContributionDropZone');
  const contributionInput = $id('dashContributionFileInput');
  if (contributionPasteBtn) contributionPasteBtn.onclick = showContributionPasteForm;
  if (contributionExportBtn) contributionExportBtn.onclick = () => exportContributionRecords();
  if (contributionUploadBtn && contributionInput) contributionUploadBtn.onclick = () => { if (!canUseOcr()) return; contributionInput.click(); };
  if (contributionDrop && contributionInput) {
    contributionDrop.onclick = event => {
      if (event.target?.tagName === 'INPUT') return;
      if (!canUseOcr()) return;
      contributionInput.click();
    };
    contributionDrop.ondragover = event => { event.preventDefault(); contributionDrop.classList.add('dragover'); };
    contributionDrop.ondragleave = () => contributionDrop.classList.remove('dragover');
    contributionDrop.ondrop = event => {
      event.preventDefault();
      contributionDrop.classList.remove('dragover');
      if (!canUseOcr()) return;
      if (event.dataTransfer.files.length) processContributionImages(event.dataTransfer.files);
    };
    contributionInput.onchange = () => { if (contributionInput.files.length) processContributionImages(contributionInput.files); };
  }
  renderContributions();
  const clearLogBtn = $id('dashClearLogBtn'); if (clearLogBtn) clearLogBtn.onclick = () => { $id('dashLogOutput').innerHTML = ''; try { localStorage.removeItem(LOG_KEY); } catch (e) {} };
  
  $id('dashExportMenuBtn').onclick = (e) => { e.stopPropagation(); $id('dashExportMenu').classList.toggle('active'); };
  window.addEventListener('click', () => $id('dashExportMenu').classList.remove('active'));

  $id('dashExpCsv').onclick = exportToCsv;
  $id('dashExpAttackCsv').onclick = exportAttackCsv;
  const dashExpDebug = $id('dashExpDebugCsv'); if (dashExpDebug) dashExpDebug.onclick = exportDebugCsv;
  $id('dashExpPdf').onclick = () => window.print();
  $id('dashExpPng').onclick = exportToPng;
  $id('dashExpJson').onclick = exportData;
  const chartBtn = $id('dashExportChartBtn'); if (chartBtn) chartBtn.onclick = exportChartPng;
  const shareBtn = $id('dashShareChartBtn'); if (shareBtn) shareBtn.onclick = window.shareChartImage;
  $id('dashImportBtn').onclick = () => {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json';
    inp.onchange = () => { if (inp.files.length) importData(inp.files[0]); }; inp.click();
  };

  try { localStorage.removeItem('qwen_api_key'); } catch (e) {}

  $id('dashClearDataBtn').onclick = async () => {
    if (!CLEAR_HASH) {
      alert('Admin override is not configured for this deployment.');
      return;
    }
    const code = prompt('Enter admin override code:');
    if (!code) return;
    const h = await sha256(code);
    if (h === CLEAR_HASH) clearData(); else alert('Invalid code');
  };

  $id('dashModalClose').onclick = closeModal;
  $id('dashSearch').oninput = e => { state.searchQ = e.target.value; render(); };
  $id('dashLeaderFilter').onchange = () => { state.structureFilterKey = ''; state.leaderLimit = 25; render(); };
  const tFilter = $id('dashTimeFilter');
  if (tFilter) tFilter.onchange = () => {
    state.timeFilter = tFilter.value || 'all';
    state.structureFilterKey = '';
    state.leaderLimit = 25;
    const leaderFilter = $id('dashLeaderFilter');
    if (leaderFilter) leaderFilter.value = '';
    render();
  };
  if (tFilter) state.timeFilter = tFilter.value || state.timeFilter || 'all';
  $id('dashAttackSearch').oninput = e => { state.attackSearchQ = e.target.value; render(); };
  $id('ocrDashboardRoot')?.addEventListener('click', (event) => {
    const th = event.target.closest('th[data-sort]');
    if (!th) return;
    const c = th.dataset.sort;
    state.sortDir = state.sortCol === c ? (state.sortDir === 'desc' ? 'asc' : 'desc') : 'desc';
    state.sortCol = c;
    state.leaderLimit = 25;
    render();
  });
  state.leaderPageSize = window.matchMedia?.('(min-width: 1200px)').matches ? 50 : 25;
  
  const zone = $id('dashUploadZone'), drop = $id('dashDropZone'), inp = $id('dashFileInput');
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
  drop.onclick = () => { if (!canUseOcr()) return; inp.click(); };
  drop.ondragover = e => { e.preventDefault(); drop.classList.add('dragover'); };
  drop.ondragleave = () => drop.classList.remove('dragover');
  drop.ondrop = e => { e.preventDefault(); drop.classList.remove('dragover'); if (!canUseOcr()) return; if (e.dataTransfer.files.length) processFiles(e.dataTransfer.files); };
  inp.onchange = () => { if (inp.files.length) processFiles(inp.files); };
}

window.deleteAttack = async function(attId) {
  const pwd = prompt('Enter Admin Overdrive Password to delete this structure data:');
  if (pwd === null) return;
  const hash = await sha256(pwd);
  if (!DELETE_HASHES.size || !DELETE_HASHES.has(hash)) {
    alert('Incorrect password.');
    return;
  }
  if(!attId || !state._booted || !state.dashData) return;
  const idx = state.dashData.attacks.findIndex(a => a.id === attId);
  if (idx !== -1) {
    const removed = state.dashData.attacks[idx];
    state.dashData.attacks.splice(idx, 1);
    refreshDashboardPlayerSummary();
    state.dashData.total_attacks = state.dashData.attacks.length;
    await saveData(state.dashData);
    render(); closeModal();
    log(`Deleted attack: ${formatStructureLabel(removed.structure_name, removed.structure_level)}`, 'warn');
  }
};

window.markAttackComplete = async function(attId) {
  if(!attId || !state._booted || !state.dashData) return;
  const att = state.dashData.attacks.find(a => a.id === attId);
  if(!att) return;
  att.data_complete_override = true;
  att.data_complete_override_at = new Date().toISOString();
  delete att._validation;
  await saveData(state.dashData);
  render();
  window._modalDepth = Math.max(0, (window._modalDepth || 1) - 1);
  showModal('attack', att);
  log(`Marked complete by override: ${formatStructureLabel(att.structure_name, att.structure_level)}`, 'warn');
};

window.editAttack = async function(attId) {
  if(!attId || !state._booted || !state.dashData) return;
  const att = state.dashData.attacks.find(a => a.id === attId);
  if(!att) return;
  const newName = prompt("Edit Structure Name (e.g. Capital, Gates, City):", att.structure_name);
  if(newName === null) return;
  let normalizedTarget = normalizeStructureTarget(newName.trim(), '');
  if (!isNameOnlyStructure(normalizedTarget.structure_name) && !normalizedTarget.structure_level) {
    const newLevel = prompt("Edit Structure Level (e.g. Lv.1, Lv.5):", att.structure_level);
    if(newLevel === null) return;
    normalizedTarget = normalizeStructureTarget(normalizedTarget.structure_name, newLevel.trim());
  }
  const newTime = prompt("Edit End Time (Game Time) (format: YYYY-MM-DD, HH:mm):", att.game_time);
  if(newTime === null) return;
  const newStartTime = prompt("Edit Start Time (Game Time) (Optional, leave blank if unknown):", att.start_time || "");
  if(newStartTime === null) return;
  att.structure_name = normalizedTarget.structure_name;
  att.structure_level = normalizedTarget.structure_level;
  att.game_time = newTime.trim();
  att.start_time = newStartTime.trim();
  delete att._validation;
  refreshDashboardPlayerSummary();
  await saveData(state.dashData);
  render(); showModal('attack', att);
  log(`Updated attack to: ${formatStructureLabel(att.structure_name, att.structure_level)}`, 'info');
};

window.addPlayer = async function(attId) {
  if(!attId || !state._booted || !state.dashData) return;
  const att = state.dashData.attacks.find(a => a.id === attId);
  if(!att) return;
  const pName = prompt("Enter new Player Name:");
  if(!pName) return;
  const pVal = prompt(`Enter Demolition Value for ${pName}:`);
  if(!pVal || isNaN(pVal)) return;
  
  att.players.push({ name: pName.trim(), value: Number(pVal), rank: 0 });
  att.players.sort((a,b) => b.value - a.value);
  att.players.forEach((p, i) => p.rank = i + 1);
  att.players_count = att.players.length;
  att.total_demolition = att.players.reduce((sum, p) => sum + (p.value || p.val || 0), 0);
  delete att._validation;
  
  refreshDashboardPlayerSummary();
  await saveData(state.dashData);
  render(); showModal('attack', att);
  log(`Added player ${pName} to ${att.structure_name}`, 'info');
};

window.editPlayer = async function(attId, encName) {
  if(!attId || !state._booted || !state.dashData) return;
  const att = state.dashData.attacks.find(a => a.id === attId);
  if(!att) return;
  const pName = decodeURIComponent(encName);
  const pIdx = att.players.findIndex(p => p.name === pName);
  if(pIdx === -1) return;
  
  const action = prompt(`Editing ${pName}.\nType new Demolition Value to update, or type 'DELETE' to remove this player:`, att.players[pIdx].value || att.players[pIdx].val);
  if(!action) return;
  
  if (action.trim().toUpperCase() === 'DELETE') {
     att.players.splice(pIdx, 1);
  } else {
     const pVal = Number(action);
     if(isNaN(pVal)) { alert('Invalid value'); return; }
     const newName = prompt(`Edit Player Name:`, pName);
     if (newName) att.players[pIdx].name = newName.trim();
     att.players[pIdx].value = pVal;
  }
  
  att.players.sort((a,b) => b.value - a.value);
  att.players.forEach((p, i) => p.rank = i + 1);
  att.players_count = att.players.length;
  att.total_demolition = att.players.reduce((sum, p) => sum + (p.value || p.val || 0), 0);
  delete att._validation;
  
  refreshDashboardPlayerSummary();
  await saveData(state.dashData);
  render(); showModal('attack', att);
  log(`Edited player ${pName} in ${att.structure_name}`, 'info');
};

window.showPlayer = function(pNameEncoded) {
  if (!state.dashData) return;
  const pName = decodeURIComponent(pNameEncoded);
  const masterName = findBestMatch(pName);
  const playerSummary = buildPlayerSummary(state.dashData.attacks || []);
  
  // Exact match first (using master name)
  let p = playerSummary.find(x => x.name === masterName);
  // Fallback to raw name if master fails
  if (!p) p = playerSummary.find(x => x.name === pName);
  // Fuzzy fallback: case-insensitive + trimmed
  if (!p) {
    const q = pName.trim().toLowerCase();
    p = playerSummary.find(x => x.name.trim().toLowerCase() === q);
  }
  // Last resort: partial match (handles OCR name variants)
  if (!p) {
    const q = pName.trim().toLowerCase();
    p = playerSummary.find(x =>
      x.name.toLowerCase().includes(q) || q.includes(x.name.toLowerCase())
    );
  }
  if (p) {
    showModal('player', p);
  } else {
    // Player exists in attack but not aggregated yet — build a minimal view
    const minimalPlayer = {
      name: pName,
      total_demolition: 0,
      participation_count: 0,
      attacks: [],
      _not_in_summary: true
    };
    showModal('player', minimalPlayer);
  }
};

window.showAttack = function(attId) {
  if(!state.dashData) return;
  const att = state.dashData.attacks.find(a => a.id === attId);
  if(att) showModal('attack', att);
  else closeModal();
};

window.exportPlayerReport = function(pNameEncoded) {
  if(!state.dashData) return;
  const pName = decodeURIComponent(pNameEncoded);
  const modalPlayer = window._dashCurrentPlayerReport;
  const playerSummary = buildPlayerSummary(state.dashData.attacks || []);
  const p =
    modalPlayer?.name === pName
      ? modalPlayer
      : playerSummary.find(x => x.name === pName) ||
        playerSummary.find(x => x.name === findBestMatch(pName));
  if(!p) {
    log(`No rows found for player export: ${pName}`, 'warn');
    return;
  }
  let csv = "Time,Target,Value,Rank\n";
  const sortedAttacks = [...(p.attacks || [])].sort((a,b) => (b.game_time || '').localeCompare(a.game_time || ''));
  sortedAttacks.forEach(att => {
    const time = String(displayGameTime(att.game_time)).replace(/"/g, '""');
    const target = formatDatasetStructureLabel(att).replace(/"/g, '""');
    csv += `"${time}","${target}",${att.val||att.value||0},${att.rank||''}\n`;
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
window.exportContributionRecords = exportContributionRecords;
window.renderContributions = renderContributions;
window.closeModal = closeModal;
window.renderRoster = renderRoster;
window.setRosterFilter = function(key, val) {
  if (key === 'alliance') state._rosterFilterAlliance = val;
  else if (key === 'status') state._rosterFilterStatus = val;
  else if (key === 'search') state._rosterSearchQ = val;
  renderRoster();
};
