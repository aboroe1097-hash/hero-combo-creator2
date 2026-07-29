import { initFirebase, ensureAnonymousAuth, getFirebaseAppCheckToken, getCurrentUser, getDb } from './firebase.js';
import { createAllStarBohAccessGate } from './all-star-boh-bootstrap.js';
import { createAllStarBohAccessClient } from './all-star-boh-access.js';
import { importFirestore } from './firebase-sdk.js';
import { normalizeBohNameKey } from './all-star-boh-model.js';

const MY_PLAYER_KEY = 'boh-plan-my-player';

let gate = null;
let accessClient = null;
let currentGrant = null;
let unsubscribeSnapshot = null;
let mapperLoaded = false;
let lastStateJson = null;
let expiryTimer = null;
let playerIndex = [];
let searchRoot = null;

async function init() {
  const fb = await initFirebase();
  if (!fb) return;

  await ensureAnonymousAuth();

  const user = getCurrentUser();
  if (!user) return;

  accessClient = createAllStarBohAccessClient({
    getUser: async () => getCurrentUser(),
    getAppCheckToken: (force) => getFirebaseAppCheckToken(force),
  });

  const root = document.querySelector('main.app') || document.body;
  gate = createAllStarBohAccessGate({
    root,
    document,
    locale: document.documentElement.lang || 'en',
  });
  gate.setHandlers({ unlock: handleUnlock, retry: handleRetry });

  concealRoot(root);
  gate.showChecking();

  try {
    const grant = await accessClient.getAccessGrant({ minimumRemainingSeconds: 5 });
    if (grant) {
      await onUnlocked(grant);
    } else {
      gate.showLocked();
    }
  } catch (err) {
    gate.showError(err);
  }
}

async function handleUnlock(pin) {
  if (!accessClient) return;
  gate.showBusy();
  try {
    const grant = await accessClient.unlock(pin);
    await onUnlocked(grant);
  } catch (err) {
    gate.showError(err);
  }
}

async function handleRetry() {
  if (!accessClient) return;
  gate.showChecking();
  try {
    const grant = await accessClient.getAccessGrant({ minimumRemainingSeconds: 5 });
    if (grant) {
      await onUnlocked(grant);
    } else {
      gate.showLocked();
    }
  } catch (err) {
    gate.showError(err);
  }
}

async function onUnlocked(grant) {
  currentGrant = grant;
  gate.hide();
  const root = document.querySelector('main.app') || document.body;
  revealRoot(root);
  scheduleExpiry(grant);
  loadMapperCore();
  subscribeToPlan(grant.seasonId);
  
  // Set RTL for Arabic
  const locale = document.documentElement.lang || 'en';
  if (locale === 'ar') {
    document.documentElement.dir = 'rtl';
  }
}

function concealRoot(root) {
  root.hidden = true;
  root.setAttribute('aria-hidden', 'true');
  root.setAttribute('inert', '');
  if ('inert' in root) root.inert = true;
}

function revealRoot(root) {
  root.hidden = false;
  root.removeAttribute('aria-hidden');
  root.removeAttribute('inert');
  if ('inert' in root) root.inert = false;
}

function scheduleExpiry(grant) {
  if (expiryTimer !== null) clearTimeout(expiryTimer);
  const remainingMs = Math.max(0, grant.expiresAt * 1000 - Date.now());
  expiryTimer = setTimeout(() => {
    unsubscribeSnapshot?.();
    unsubscribeSnapshot = null;
    mapperLoaded = false;
    lastStateJson = null;
    currentGrant = null;
    const root = document.querySelector('main.app') || document.body;
    concealRoot(root);
    gate.showExpired();
  }, remainingMs);
}

function loadMapperCore() {
  if (mapperLoaded) return;
  mapperLoaded = true;
  const script = document.createElement('script');
  script.src = 'js/boh-mapper/mapper-core.js';
  script.onload = () => {
    if (lastStateJson && window.BohMapper) {
      try {
        window.BohMapper.hydrate(JSON.parse(lastStateJson));
        window.BohMapper.render();
        afterHydrate();
      } catch (err) {
        console.error('Failed to hydrate mapper state:', err);
      }
    }
  };
  document.body.appendChild(script);
}

function afterHydrate() {
  buildPlayerIndex();
  ensureSearchBar();
  restoreMyPlayerChip();
}

function buildPlayerIndex() {
  if (!window.BohMapper?.listPlayers) { playerIndex = []; return; }
  playerIndex = window.BohMapper.listPlayers().map((p) => ({
    id: p.id,
    name: p.name,
    score: p.score,
    locale: p.locale,
    key: normalizeBohNameKey(p.name),
  }));
}

function ensureSearchBar() {
  if (searchRoot) return;
  searchRoot = document.createElement('div');
  searchRoot.id = 'bohFindMyName';
  searchRoot.className = 'boh-find-bar';
  searchRoot.innerHTML =
    '<div class="boh-find-bar__inner">' +
    '<label class="boh-find-bar__label" for="bohFindInput">Find my name</label>' +
    '<input id="bohFindInput" class="boh-find-bar__input" type="search" ' +
    'placeholder="Type your name…" autocomplete="off" autocapitalize="off" spellcheck="false" />' +
    '<div class="boh-find-bar__results" id="bohFindResults" role="listbox"></div>' +
    '</div>';
  document.body.appendChild(searchRoot);

  const input = searchRoot.querySelector('#bohFindInput');
  const results = searchRoot.querySelector('#bohFindResults');
  input.addEventListener('input', () => {
    const query = normalizeBohNameKey(input.value.trim());
    if (!query) { results.innerHTML = ''; return; }
    const matches = playerIndex.filter((p) => p.key.includes(query)).slice(0, 8);
    results.innerHTML = matches
      .map((p) =>
        '<div class="boh-find-bar__row" role="option" data-pid="' +
        escapeAttr(p.id) +
        '">' +
        escapeHtml(p.name) +
        '</div>'
      )
      .join('');
  });
  results.addEventListener('click', (event) => {
    const row = event.target.closest('[data-pid]');
    if (!row) return;
    const pid = row.dataset.pid;
    focusPlayer(pid);
    saveMyPlayer(pid, row.textContent);
    results.innerHTML = '';
    input.value = '';
  });
}

function focusPlayer(playerId) {
  if (window.BohMapper?.focusPlayerOrders) {
    window.BohMapper.focusPlayerOrders(playerId);
  }
}

function saveMyPlayer(id, name) {
  try {
    localStorage.setItem(MY_PLAYER_KEY, JSON.stringify({ id, name }));
  } catch (_) {}
  updateMyPlayerChip(id, name);
}

function restoreMyPlayerChip() {
  let saved = null;
  try {
    saved = JSON.parse(localStorage.getItem(MY_PLAYER_KEY) || 'null');
  } catch (_) {}
  if (!saved?.id || !saved?.name) return;

  const match = playerIndex.find((p) => p.id === saved.id);
  if (match) {
    updateMyPlayerChip(match.id, match.name);
    return;
  }
  const nameKey = normalizeBohNameKey(saved.name);
  const byName = playerIndex.find((p) => p.key === nameKey);
  if (byName) {
    saveMyPlayer(byName.id, byName.name);
    return;
  }
  try { localStorage.removeItem(MY_PLAYER_KEY); } catch (_) {}
}

function updateMyPlayerChip(id, name) {
  let chip = document.getElementById('bohMyPlayerChip');
  if (!chip) {
    chip = document.createElement('button');
    chip.id = 'bohMyPlayerChip';
    chip.type = 'button';
    chip.className = 'boh-my-chip';
    chip.addEventListener('click', () => focusPlayer(id));
    const bar = searchRoot?.querySelector('.boh-find-bar__inner');
    if (bar) bar.prepend(chip);
  }
  chip.dataset.pid = id;
  chip.textContent = 'My orders: ' + name;
  chip.onclick = () => focusPlayer(id);
}

function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function escapeAttr(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function subscribeToPlan(seasonId) {
  if (unsubscribeSnapshot) {
    unsubscribeSnapshot();
    unsubscribeSnapshot = null;
  }

  const db = getDb();
  if (!db) return;

  const { doc, onSnapshot } = await importFirestore();
  const ref = doc(db, 'boh_allstar', seasonId, 'mapper', 'current');
  let isFirstSnapshot = true;

  unsubscribeSnapshot = onSnapshot(
    ref,
    (snap) => {
      if (!snap.exists()) {
        if (isFirstSnapshot) showEmptyState();
        return;
      }
      isFirstSnapshot = false;
      const data = snap.data();
      const stateJson = data?.state;
      if (!stateJson) return;

      if (lastStateJson === stateJson) return;

      if (lastStateJson !== null) {
        showPlanUpdatedToast();
        lastStateJson = stateJson;
        if (window.BohMapper) {
          try {
            window.BohMapper.hydrate(JSON.parse(stateJson));
            window.BohMapper.render();
            buildPlayerIndex();
            restoreMyPlayerChip();
          } catch (err) {
            console.error('Failed to hydrate updated plan:', err);
          }
        }
        return;
      }

      lastStateJson = stateJson;
      if (window.BohMapper) {
        try {
          window.BohMapper.hydrate(JSON.parse(stateJson));
          window.BohMapper.render();
          afterHydrate();
        } catch (err) {
          console.error('Failed to hydrate mapper state:', err);
        }
      }
    },
    (err) => {
      console.error('Plan snapshot error:', err);
      showOfflineBanner();
    }
  );
}

function showEmptyState() {
  const content = document.getElementById('rolePlanContent');
  if (content) {
    content.innerHTML =
      '<div style="text-align:center;padding:4rem 2rem;color:var(--muted);">' +
      '<h2>No plan published yet</h2>' +
      '<p>Check back later — the plan will appear here once the admin publishes it.</p>' +
      '</div>';
  }
  const dialog = document.getElementById('rolePlanDialog');
  if (dialog) dialog.hidden = false;
}

function showPlanUpdatedToast() {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = 'Plan updated by admin';
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 4000);
}

function showOfflineBanner() {
  let banner = document.getElementById('bohOfflineBanner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'bohOfflineBanner';
    banner.setAttribute('role', 'alert');
    banner.style.cssText =
      'position:fixed;top:0;left:0;right:0;background:var(--boh-amber,#d99405);color:#000;' +
      'text-align:center;padding:8px 16px;font-size:14px;z-index:10000;';
    banner.textContent = 'Showing last loaded plan — reconnecting…';
    document.body.prepend(banner);
  }
  banner.hidden = false;
  const retry = () => {
    if (navigator.onLine) {
      banner.hidden = true;
      if (currentGrant) subscribeToPlan(currentGrant.seasonId);
    }
  };
  window.addEventListener('online', retry, { once: true });
}

init();
