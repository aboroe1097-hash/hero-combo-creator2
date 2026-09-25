// js/eden-hub.js
// VTS Eden Hub sub-tab controller for the integrated Eden Map tab.
//
// The hub hosts its map, planning, guide, and season sub-tabs inside #edenMapRoot:
//   - bounty:   the Royal Bounty guide (default)
//   - map:      the existing Eden map planner
//   - loyalty:  the Eden Loyalty calculator, fetched from tabs/loyalty.html
//   - operations: specialty, Honor, building, tiling, and siege planners
//   - season:   the current Eden season (eden-x2.html), revealed only after an
//               admin publishes that workspace's projection
//   - previous: previous-season rankings (eden-x1.html) in a lazy iframe
//   - pdfs:     the PDF document builder for the Eden tables (loaded on open)
//
// Legacy deep links (#loyalty, #edenX1) are routed here by shell-v14.js,
// which stashes the intended sub-tab in document.body.dataset.edenHubSubtab.

import { translations } from './translations.js';
import { currentLanguage } from './state.js';
import { edenWorkspaceFirestorePath, isPublishedEdenProjection } from './eden-workspaces.js';
import { mountHubPdfPanel } from './hub-pdf-tab.js';
import {
  normalizeUnknownEdenHubSubtab,
  resolveEdenHubInitialRoute,
} from './eden-hub-routing.js';

const LOYALTY_SRC = 'tabs/loyalty.html?v=20260925_230549';
const BOUNTY_SRC = 'tabs/bounty-guide.html?v=20260925_230549';
const PLAYBOOK_SRC = 'tabs/eden-playbook.html?v=20260925_230549';
const PREVIOUS_SRC = 'eden-x1.html?embed=1';
const SEASON_SRC = 'eden-x2.html?embed=1';
// How long the hub waits for the season publication check before landing on
// Royal Bounty instead. Long enough for a normal round trip, short enough that
// a dead backend is not a blank hub.
const SEASON_LANDING_TIMEOUT_MS = 2500;
// A shared season or vote link is an explicit request, so it may wait longer
// for the same check before giving up.
const SEASON_LINK_TIMEOUT_MS = 8000;
const EDEN_HUB_SUBTABS = [
  'map',
  'pathing',
  'loyalty',
  'operations',
  'bounty',
  'playbook',
  'season',
  'previous',
  'pdfs',
];

let booted = false;
let loyaltyLoaded = false;
let loyaltyLoading = false;
let bountyLoaded = false;
let bountyLoading = false;
let playbookLoaded = false;
let operationsLoaded = false;
let operationsLoading = false;
// Set once a visitor picks a sub-tab, so the deferred season landing never
// overrides a choice they already made.
let userPickedSubtab = false;

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
    import('./eden-map.js?v=20260925_230549')
      .then((module) => module.refreshEdenMapViewport?.())
      .catch(() => {
        /* Eden map boot reports its own load errors. */
      });
  });
}

function revealSubtabButton(button) {
  const bar = button.closest('.vts-eden-subtab-bar');
  if (!bar || bar.scrollWidth <= bar.clientWidth) return;
  const left = button.offsetLeft - (bar.clientWidth - button.offsetWidth) / 2;
  bar.scrollTo({ left: Math.max(0, left), behavior: 'auto' });
}

// A season opens as a full-screen pane. When someone asks for it (a click or
// a shared link), bring the pane to the top of the screen so the season fills
// it instead of starting below the hub header.
function bringPanelIntoView(panel) {
  if (!panel?.scrollIntoView) return;
  requestAnimationFrame(() => {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
    const top = panel.getBoundingClientRect().top + window.scrollY - 8;
    window.scrollTo({ top: Math.max(0, top), behavior: reduced ? 'auto' : 'smooth' });
  });
}

function activateSubTab(root, name) {
  root.querySelectorAll('[data-eden-subtab]').forEach((button) => {
    const active = button.dataset.edenSubtab === name;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', String(active));
    // On a phone the bar scrolls sideways; keep the open tab in view instead
    // of leaving it off-screen to the right.
    if (active) revealSubtabButton(button);
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
    const module = await import('./loyalty-spa.js?v=20260925_230549');
    module.initLoyaltyCalculator?.();
    loyaltyLoaded = true;
  } catch (error) {
    console.warn('[eden-hub] Loyalty failed to load', error);
    panel.innerHTML = loadFailedMarkup(catalogFor(currentLanguage).tabLoyalty || 'Loyalty');
  } finally {
    loyaltyLoading = false;
  }
}

// Eden Pathing loads its module (and stylesheet) only when opened. Re-running
// init on every open lets a freshly followed share link import its plan.
async function loadPathing(panel) {
  try {
    const module = await import('./eden-pathing.js');
    await module.initEdenPathing?.(panel.querySelector('#edenPathingRoot'));
  } catch (error) {
    console.warn('[eden-hub] Eden Pathing failed to load', error);
    panel.innerHTML = loadFailedMarkup('Eden Pathing');
  }
}

function loadFramedSeason(panel, src, title) {
  if (panel.dataset.edenHubLoaded === '1') {
    // Already open: a later "vote" request just moves the loaded page to its
    // ballot rather than reloading the whole season.
    if (src.endsWith('#vote')) {
      const frame = panel.querySelector('iframe');
      try {
        if (frame?.contentWindow) frame.contentWindow.location.hash = 'vote';
      } catch {
        /* cross-origin frames are never used here */
      }
    }
    return;
  }
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

function loadSeason(panel, options = {}) {
  const t = catalogFor(currentLanguage);
  loadFramedSeason(
    panel,
    options.vote ? `${SEASON_SRC}#vote` : SEASON_SRC,
    t.subTabSeason || 'Current Season'
  );
}

// The current season is hidden until an admin publishes it. This reads the one
// document the public is allowed to see and fails closed: any error, missing
// document or unpublished revision leaves the sub-tab hidden, so a draft season
// is never reachable from the hub.
async function revealPublishedSeason(root) {
  const button = root.querySelector('[data-eden-subtab="season"]');
  if (!button) return false;
  if (!button.hidden) return true;
  try {
    const [{ initFirebase, ensureAnonymousAuth }, { importFirestoreLite }] = await Promise.all([
      import('./firebase-eden.js'),
      import('./firebase-sdk.js'),
    ]);
    const { configured, app } = initFirebase();
    if (!configured || !app) return false;
    await ensureAnonymousAuth();
    const { getFirestore, doc, getDoc } = await importFirestoreLite();
    const snap = await getDoc(
      doc(getFirestore(app), edenWorkspaceFirestorePath('eden-x2', 'publicProjection'))
    );
    if (!snap.exists() || !isPublishedEdenProjection(snap.data())) return false;
    button.hidden = false;
    return true;
  } catch (error) {
    console.warn('[eden-hub] Current season availability unknown', error);
  }
  return false;
}

async function loadBounty(panel) {
  if (bountyLoaded || bountyLoading) return;
  bountyLoading = true;
  try {
    const response = await fetch(BOUNTY_SRC);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    panel.innerHTML = await response.text();
    const module = await import('./bounty-guide.js?v=20260925_230549');
    const mount = panel.querySelector('#bountyGuideRoot');
    if (mount) module.renderBountyGuide(mount);
    bountyLoaded = true;
  } catch (error) {
    console.warn('[eden-hub] Royal Bounty Eden X2 guide failed to load', error);
    panel.innerHTML = loadFailedMarkup(
      catalogFor(currentLanguage).tabEdenBounty || 'Royal Bounty Eden X2'
    );
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
    panel.innerHTML = loadFailedMarkup(
      catalogFor(currentLanguage).tabEdenPlaybook || 'Eden Playbook'
    );
  }
}

async function loadOperations(panel) {
  if (operationsLoaded || operationsLoading) return;
  operationsLoading = true;
  try {
    if (!document.getElementById('edenOperationsStyles')) {
      const stylesheet = document.createElement('link');
      stylesheet.id = 'edenOperationsStyles';
      stylesheet.rel = 'stylesheet';
      stylesheet.href = 'css/eden-operations.css';
      document.head.appendChild(stylesheet);
    }
    const module = await import('./eden-operations.js');
    module.initEdenOperations?.(panel.querySelector('#edenOperationsRoot'));
    operationsLoaded = true;
  } catch (error) {
    console.warn('[eden-hub] Eden Operations failed to load', error);
    panel.innerHTML = loadFailedMarkup('Eden Operations');
  } finally {
    operationsLoading = false;
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
    if (linked === 'season' && params.get('vote') === '1') {
      if (document.body) delete document.body.dataset.edenHubSubtab;
      return 'vote';
    }
    if (EDEN_HUB_SUBTABS.includes(linked)) {
      if (document.body) delete document.body.dataset.edenHubSubtab;
      return linked;
    }
    const intent = document.body?.dataset?.edenHubSubtab;
    if (intent) {
      delete document.body.dataset.edenHubSubtab;
      return EDEN_HUB_SUBTABS.includes(intent) || intent === 'vote' ? intent : null;
    }
  } catch {
    /* dataset unavailable */
  }
  return null;
}

// Clicking a sub-tab writes the hash so the URL matches what is on screen, but
// that must not become the hub's default: without this marker, one click on
// Royal Bounty made every later visit land there and skip the season entirely.
// history.state travels with the session but never with a shared link, so a
// pasted URL still opens the sub-tab it names.
const SUBTAB_CLICK_STATE_KEY = 'edenHubSubtabClicked';

function subTabClickedThisSession() {
  try {
    const clicked = window.history.state?.[SUBTAB_CLICK_STATE_KEY];
    return EDEN_HUB_SUBTABS.includes(clicked) ? clicked : null;
  } catch {
    return null;
  }
}

function rememberSubTabClick(name) {
  const hash = `#edenHub?subtab=${name}`;
  try {
    window.history.replaceState(
      { ...(window.history.state || {}), [SUBTAB_CLICK_STATE_KEY]: name },
      '',
      hash
    );
  } catch {
    window.history.replaceState(window.history.state, '', hash);
  }
}

function clearUnknownSubtabHash() {
  try {
    normalizeUnknownEdenHubSubtab(window.location.hash, EDEN_HUB_SUBTABS, window.history);
  } catch {
    /* history unavailable */
  }
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

  function loadPanelFor(name, panel, options = {}) {
    if (name === 'loyalty') loadLoyalty(root, panel);
    if (name === 'pathing') loadPathing(panel);
    if (name === 'operations') loadOperations(panel);
    if (name === 'bounty') loadBounty(panel);
    if (name === 'playbook') loadPlaybook(panel);
    if (name === 'previous') loadPrevious(panel);
    if (name === 'season') loadSeason(panel, options);
    if (name === 'pdfs') mountHubPdfPanel('eden', panel);
  }

  function openIntent(requested, options = {}) {
    // "vote" is the season opened straight at its ballot.
    const vote = requested === 'vote';
    const name = vote ? 'season' : requested;
    if (!EDEN_HUB_SUBTABS.includes(name)) return false;
    // A season nobody has published has no sub-tab to open: treat the intent as
    // stale rather than revealing the hidden panel.
    if (name === 'season' && root.querySelector('[data-eden-subtab="season"]')?.hidden)
      return false;
    activateSubTab(root, name);
    const panel = root.querySelector(`[data-eden-subtab-panel="${name}"]`);
    if (panel) loadPanelFor(name, panel, { vote });
    if (panel && options.scroll && (name === 'season' || name === 'previous')) {
      bringPanelIntoView(panel);
    }
    return true;
  }

  // A shared season link arrives before the publication check has answered,
  // when the season sub-tab is still hidden. Show Royal Bounty meanwhile and
  // open the season once it is confirmed — unless the visitor has already
  // picked something else.
  function openSeasonIntentWhenPublished(intent) {
    openIntent('bounty');
    void Promise.race([
      revealPublishedSeason(root),
      new Promise((resolve) => setTimeout(() => resolve(false), SEASON_LINK_TIMEOUT_MS)),
    ]).then((available) => {
      if (!available || userPickedSubtab) return;
      openIntent(intent, { scroll: true });
    });
  }

  // The season being played is the Eden Hub landing page, with Royal Bounty as
  // the fallback when no season is published. An explicit sub-tab intent still
  // wins outright.
  //
  // The season button is hidden until its publication check clears, so with no
  // intent we open Royal Bounty immediately and upgrade to the season once that
  // answer arrives. The wait is bounded, and — this is the part that matters —
  // the upgrade is abandoned the moment anyone picks a sub-tab themselves.
  // Deferring the first paint instead left the hub able to yank a panel away
  // from someone who had already clicked, which is a worse bug than a brief
  // flash of the wrong tab.
  const requested = readSubtabIntent();
  clearUnknownSubtabHash();
  // A sub-tab this session clicked is not a request for it: the click only
  // owned the URL. The hub's default stays the current season, so a visit that
  // follows a click still lands there — while a shared link, which carries no
  // history state, still opens exactly the sub-tab it names.
  const clicked = subTabClickedThisSession();
  const { intent, useCurrentSeasonDefault } = resolveEdenHubInitialRoute(
    requested,
    clicked,
    window.history
  );
  if (intent === 'season' || intent === 'vote') {
    if (!openIntent(intent, { scroll: true })) openSeasonIntentWhenPublished(intent);
  } else if (intent) {
    openIntent(intent);
    void revealPublishedSeason(root);
  }
  if (useCurrentSeasonDefault) {
    openIntent('bounty');
    void Promise.race([
      revealPublishedSeason(root),
      new Promise((resolve) => setTimeout(() => resolve(false), SEASON_LANDING_TIMEOUT_MS)),
    ]).then((available) => {
      if (!available || userPickedSubtab) return;
      openIntent('season');
    });
  }

  root.addEventListener('click', (event) => {
    const button = event.target.closest('[data-eden-subtab]');
    if (!button) return;
    userPickedSubtab = true;
    const name = button.dataset.edenSubtab;
    rememberSubTabClick(name);
    openIntent(name, { scroll: true });
  });

  // Deep links (#loyalty / #edenX1) reach the hub through the shell, which
  // stashes the sub-tab intent on document.body. The shell replaces the hash
  // without firing a second hashchange, so read the intent on the next tick.
  window.addEventListener('hashchange', () => {
    setTimeout(() => {
      const intent = readSubtabIntent();
      if (intent) {
        userPickedSubtab = true;
        if (!openIntent(intent, { scroll: true }) && (intent === 'season' || intent === 'vote')) {
          userPickedSubtab = false;
          openSeasonIntentWhenPublished(intent);
        }
        return;
      }
      clearUnknownSubtabHash();
      const hash = window.location.hash.replace(/^#/, '').split('?')[0].toLowerCase();
      // Both the canonical #edenHub and the original #edenMap land on the map.
      if (hash === 'edenmap' || hash === 'edenhub') activateSubTab(root, 'map');
    }, 0);
  });

  // Language changes re-apply the main catalog to every loaded panel; the
  // playbook re-renders its JS-built content through its own listener.
  window.addEventListener('vts:language-change', () => {
    localizeFragment(root);
  });

  // Explicit sub-tab navigation from other tools (e.g. the command palette).
  window.addEventListener('vts:eden-hub-subtab', (event) => {
    const detail = event?.detail;
    openIntent(detail === 'map' ? '' : detail);
  });
}
