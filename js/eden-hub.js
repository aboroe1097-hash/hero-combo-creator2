// js/eden-hub.js
// VTS Eden Hub sub-tab controller for the integrated Eden Map tab.
//
// The hub hosts five sub-tabs inside #edenMapRoot:
//   - bounty:   the Royal Bounty guide (default)
//   - map:      the existing Eden map planner
//   - loyalty:  the Eden Loyalty calculator, fetched from tabs/loyalty.html
//   - season:   the current Eden season (eden-x2.html), revealed only after an
//               admin publishes that workspace's projection
//   - previous: previous-season rankings (eden-x1.html) in a lazy iframe
//
// Legacy deep links (#loyalty, #edenX1) are routed here by shell-v14.js,
// which stashes the intended sub-tab in document.body.dataset.edenHubSubtab.

import { translations } from './translations.js';
import { currentLanguage } from './state.js';
import { edenWorkspaceFirestorePath, isPublishedEdenProjection } from './eden-workspaces.js';

const LOYALTY_SRC = 'tabs/loyalty.html?v=20260820_230108';
const BOUNTY_SRC = 'tabs/bounty-guide.html?v=20260820_230108';
const PLAYBOOK_SRC = 'tabs/eden-playbook.html?v=20260820_230108';
const PREVIOUS_SRC = 'eden-x1.html?embed=1';
const SEASON_SRC = 'eden-x2.html?embed=1';
const EDEN_HUB_SUBTABS = ['map', 'loyalty', 'bounty', 'playbook', 'season', 'previous'];

let booted = false;
let loyaltyLoaded = false;
let loyaltyLoading = false;
let bountyLoaded = false;
let bountyLoading = false;
let playbookLoaded = false;

function catalogFor(language) {
  // Prefer the entry page's canonical catalog: a stale-stamped import chain
  // can give this hub a second translations instance whose lazy locales are
  // never populated, leaving subtab panels on the English fallback.
  const canonical = globalThis.VTS_TRANSLATIONS || translations;
  return canonical[language] || canonical.en || {};
}

// Sub-tab fetch failures used to render hard-coded English into every locale. The hub
// already resolves copy through catalogFor(), so reuse it here.
function loadFailedMarkup(tabName) {
  const t = catalogFor(currentLanguage);
  const template = t.edenHubLoadFailed || '{tab} failed to load. Refresh and try again.';
  const message = template.replace('{tab}', tabName);
  return `<div class="tab-loading"><span>${message}</span></div>`;
}

function localizeFragment(root) {
  const t = catalogFor(currentLanguage);
  if (!root?.querySelectorAll) return;
  root.querySelectorAll('[data-i18n]').forEach((element) => {
    const key = element.getAttribute('data-i18n');
    if (t[key]) element.textContent = t[key];
  });
  root.querySelectorAll('[data-i18n-ph]').forEach((element) => {
    const key = element.getAttribute('data-i18n-ph');
    if (t[key]) element.placeholder = t[key];
  });
  root.querySelectorAll('[data-i18n-title]').forEach((element) => {
    const key = element.getAttribute('data-i18n-title');
    if (t[key]) element.title = t[key];
  });
  root.querySelectorAll('[data-i18n-aria]').forEach((element) => {
    const key = element.getAttribute('data-i18n-aria');
    if (t[key]) element.setAttribute('aria-label', t[key]);
  });
  root.querySelectorAll('[data-i18n-alt]').forEach((element) => {
    const key = element.getAttribute('data-i18n-alt');
    if (t[key]) element.setAttribute('alt', t[key]);
  });
  root.querySelectorAll('[data-i18n-badge]').forEach((element) => {
    const key = element.getAttribute('data-i18n-badge');
    if (t[key]) element.setAttribute('data-subtool-badge', t[key]);
  });
}

function refreshMapViewport() {
  // The canvas may have initialized behind the default Royal Bounty panel.
  // Wait for the browser to apply the newly visible Map panel before sizing it.
  requestAnimationFrame(() => {
    // Use the same module identity as the planner boot. A different query
    // string creates a second module instance with no canvas state to refresh.
    import('./eden-map.js?v=20260820_230108')
      .then((module) => module.refreshEdenMapViewport?.())
      .catch(() => {
        /* Eden map boot reports its own load errors. */
      });
  });
}

function activateSubTab(root, name) {
  root.querySelectorAll('[data-eden-subtab]').forEach((button) => {
    const active = button.dataset.edenSubtab === name;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', String(active));
  });
  root.querySelectorAll('[data-eden-subtab-panel]').forEach((panel) => {
    const active = panel.dataset.edenSubtabPanel === name;
    panel.classList.toggle('active', active);
    panel.hidden = !active;
  });
  if (name === 'map') refreshMapViewport();
}

async function loadLoyalty(root, panel) {
  if (loyaltyLoaded || loyaltyLoading) return;
  loyaltyLoading = true;
  try {
    const response = await fetch(LOYALTY_SRC);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    panel.innerHTML = await response.text();
    localizeFragment(panel);
    const module = await import('./loyalty-spa.js?v=20260820_230108');
    module.initLoyaltyCalculator?.();
    loyaltyLoaded = true;
  } catch (error) {
    console.warn('[eden-hub] Loyalty failed to load', error);
    panel.innerHTML = loadFailedMarkup(catalogFor(currentLanguage).tabLoyalty || 'Loyalty');
  } finally {
    loyaltyLoading = false;
  }
}

function loadFramedSeason(panel, src, title) {
  if (panel.dataset.edenHubLoaded === '1') return;
  const frame = document.createElement('iframe');
  frame.className = 'vts-eden-hub-frame';
  frame.title = title;
  frame.src = src;
  frame.setAttribute('loading', 'lazy');
  panel.appendChild(frame);
  panel.dataset.edenHubLoaded = '1';
}

function loadPrevious(panel) {
  loadFramedSeason(panel, PREVIOUS_SRC, 'Previous Seasons');
}

function loadSeason(panel) {
  const t = catalogFor(currentLanguage);
  loadFramedSeason(panel, SEASON_SRC, t.subTabSeason || 'Current Season');
}

// The current season is hidden until an admin publishes it. This reads the one
// document the public is allowed to see and fails closed: any error, missing
// document or unpublished revision leaves the sub-tab hidden, so a draft season
// is never reachable from the hub.
async function revealPublishedSeason(root) {
  const button = root.querySelector('[data-eden-subtab="season"]');
  if (!button || !button.hidden) return;
  try {
    const [{ initFirebase, ensureAnonymousAuth }, { importFirestoreLite }] = await Promise.all([
      import('./firebase-eden.js'),
      import('./firebase-sdk.js'),
    ]);
    const { configured, app } = initFirebase();
    if (!configured || !app) return;
    await ensureAnonymousAuth();
    const { getFirestore, doc, getDoc } = await importFirestoreLite();
    const snap = await getDoc(
      doc(getFirestore(app), edenWorkspaceFirestorePath('eden-x2', 'publicProjection'))
    );
    if (!snap.exists() || !isPublishedEdenProjection(snap.data())) return;
    button.hidden = false;
  } catch (error) {
    console.warn('[eden-hub] Current season availability unknown', error);
  }
}

async function loadBounty(panel) {
  if (bountyLoaded || bountyLoading) return;
  bountyLoading = true;
  try {
    const response = await fetch(BOUNTY_SRC);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    panel.innerHTML = await response.text();
    const module = await import('./bounty-guide.js?v=20260820_230108');
    const mount = panel.querySelector('#bountyGuideRoot');
    if (mount) module.renderBountyGuide(mount);
    bountyLoaded = true;
  } catch (error) {
    console.warn('[eden-hub] Royal Bounty Eden X2 guide failed to load', error);
    panel.innerHTML = loadFailedMarkup(catalogFor(currentLanguage).tabEdenBounty || 'Royal Bounty Eden X2');
  } finally {
    bountyLoading = false;
  }
}

async function loadPlaybook(panel) {
  if (playbookLoaded) return;
  try {
    const response = await fetch(PLAYBOOK_SRC);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    panel.innerHTML = await response.text();
    localizeFragment(panel);
    const module = await import('./eden-playbook.js');
    module.initEdenPlaybook?.(panel);
    playbookLoaded = true;
  } catch (error) {
    console.warn('[eden-hub] Eden playbook failed to load', error);
    panel.innerHTML = loadFailedMarkup(catalogFor(currentLanguage).tabEdenPlaybook || 'Eden Playbook');
  }
}

function readSubtabIntent() {
  try {
    // The canonical hash is the freshest signal. A subtab button clicked
    // before the lazy controller arrived stashes its intent on the body
    // dataset and that value can go stale (e.g. the playbook's loyalty tool
    // link then navigates to #edenHub?subtab=loyalty). Always prefer an
    // explicit subtab in the hash and clear the stale stash when we win.
    const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
    const linked = params.get('subtab');
    if (EDEN_HUB_SUBTABS.includes(linked)) {
      if (document.body) delete document.body.dataset.edenHubSubtab;
      return linked;
    }
    const intent = document.body?.dataset?.edenHubSubtab;
    if (intent) {
      delete document.body.dataset.edenHubSubtab;
      return EDEN_HUB_SUBTABS.includes(intent) ? intent : null;
    }
  } catch {
    /* dataset unavailable */
  }
  return null;
}

export function bootEdenHub() {
  if (booted) return;
  const root = document.getElementById('edenMapRoot');
  if (!root) return;
  booted = true;
  // From here on the hub's own click handler owns subtab activation. The
  // shell-side pre-boot click catcher checks this marker so it never stashes
  // a stale intent after the hub has already consumed the boot intent.
  root.dataset.edenHubBooted = '1';

  function loadPanelFor(name, panel) {
    if (name === 'loyalty') loadLoyalty(root, panel);
    if (name === 'bounty') loadBounty(panel);
    if (name === 'playbook') loadPlaybook(panel);
    if (name === 'previous') loadPrevious(panel);
    if (name === 'season') loadSeason(panel);
  }

  function openIntent(name) {
    if (!EDEN_HUB_SUBTABS.includes(name)) return;
    // A season nobody has published has no sub-tab to open: treat the intent as
    // stale rather than revealing the hidden panel.
    if (name === 'season' && root.querySelector('[data-eden-subtab="season"]')?.hidden) return;
    activateSubTab(root, name);
    const panel = root.querySelector(`[data-eden-subtab-panel="${name}"]`);
    if (panel) loadPanelFor(name, panel);
  }

  // Royal Bounty is the Eden Hub landing page; the map remains one click away
  // and legacy sub-tab intents still take precedence.
  openIntent(readSubtabIntent() || 'bounty');
  void revealPublishedSeason(root);

  root.addEventListener('click', (event) => {
    const button = event.target.closest('[data-eden-subtab]');
    if (!button) return;
    const name = button.dataset.edenSubtab;
    window.history.replaceState(window.history.state, '', `#edenHub?subtab=${name}`);
    activateSubTab(root, name);
    const panel = root.querySelector(`[data-eden-subtab-panel="${name}"]`);
    if (panel) loadPanelFor(name, panel);
  });

  // Deep links (#loyalty / #edenX1) reach the hub through the shell, which
  // stashes the sub-tab intent on document.body. The shell replaces the hash
  // without firing a second hashchange, so read the intent on the next tick.
  window.addEventListener('hashchange', () => {
    setTimeout(() => {
      const intent = readSubtabIntent();
      if (intent) {
        openIntent(intent);
        return;
      }
      const hash = window.location.hash.replace(/^#/, '').split('?')[0].toLowerCase();
      // Both the canonical #edenHub and the original #edenMap land on the map.
      if (hash === 'edenmap' || hash === 'edenhub') activateSubTab(root, 'map');
    }, 0);
  });

  // Language changes re-apply the main catalog to every loaded panel; the
  // playbook re-renders its JS-built content through its own listener.
  window.addEventListener('vts:language-change', () => localizeFragment(root));

  // Explicit sub-tab navigation from other tools (e.g. the command palette).
  window.addEventListener('vts:eden-hub-subtab', (event) => {
    const detail = event?.detail;
    openIntent(detail === 'map' ? '' : detail);
  });
}
