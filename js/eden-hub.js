// js/eden-hub.js
// VTS Eden Hub sub-tab controller for the integrated Eden Map tab.
//
// The hub hosts three sub-tabs inside #edenMapRoot:
//   - map:      the existing Eden map planner (default)
//   - loyalty:  the Eden Loyalty calculator, fetched from tabs/loyalty.html
//   - previous: previous-season rankings (eden-x1.html) in a lazy iframe
//
// Legacy deep links (#loyalty, #edenX1) are routed here by shell-v14.js,
// which stashes the intended sub-tab in document.body.dataset.edenHubSubtab.

import { translations } from './translations.js';
import { currentLanguage } from './state.js';

const LOYALTY_SRC = 'tabs/loyalty.html?v=20260813_061728';
const BOUNTY_SRC = 'tabs/bounty-guide.html?v=20260813_061728';
const PREVIOUS_SRC = 'eden-x1.html';

let booted = false;
let loyaltyLoaded = false;
let loyaltyLoading = false;
let bountyLoaded = false;
let bountyLoading = false;

function localizeFragment(root) {
  const t = translations[currentLanguage] || translations.en || {};
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
}

async function loadLoyalty(root, panel) {
  if (loyaltyLoaded || loyaltyLoading) return;
  loyaltyLoading = true;
  try {
    const response = await fetch(LOYALTY_SRC);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    panel.innerHTML = await response.text();
    localizeFragment(panel);
    const module = await import('./loyalty-spa.js?v=20260813_061728');
    module.initLoyaltyCalculator?.();
    loyaltyLoaded = true;
  } catch (error) {
    console.warn('[eden-hub] Loyalty failed to load', error);
    panel.innerHTML = `<div class="tab-loading"><span>Loyalty failed to load. Refresh and try again.</span></div>`;
  } finally {
    loyaltyLoading = false;
  }
}

function loadPrevious(panel) {
  if (panel.dataset.edenHubLoaded === '1') return;
  const frame = document.createElement('iframe');
  frame.className = 'vts-eden-hub-frame';
  frame.title = 'Previous Seasons';
  frame.src = PREVIOUS_SRC;
  frame.setAttribute('loading', 'lazy');
  panel.appendChild(frame);
  panel.dataset.edenHubLoaded = '1';
}

async function loadBounty(panel) {
  if (bountyLoaded || bountyLoading) return;
  bountyLoading = true;
  try {
    const response = await fetch(BOUNTY_SRC);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    panel.innerHTML = await response.text();
    const module = await import('./bounty-guide.js?v=20260813_061728');
    const mount = panel.querySelector('#bountyGuideRoot');
    if (mount) module.renderBountyGuide(mount);
    bountyLoaded = true;
  } catch (error) {
    console.warn('[eden-hub] Royal Bounty guide failed to load', error);
    panel.innerHTML = `<div class="tab-loading"><span>Royal Bounty failed to load. Refresh and try again.</span></div>`;
  } finally {
    bountyLoading = false;
  }
}

function readSubtabIntent() {
  try {
    const intent = document.body?.dataset?.edenHubSubtab;
    if (intent) {
      delete document.body.dataset.edenHubSubtab;
      return intent === 'loyalty' ? 'loyalty' : 'previous';
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

  function openIntent(name) {
    if (name !== 'loyalty' && name !== 'bounty' && name !== 'previous') return;
    activateSubTab(root, name);
    const panel = root.querySelector(`[data-eden-subtab-panel="${name}"]`);
    if (!panel) return;
    if (name === 'loyalty') loadLoyalty(root, panel);
    if (name === 'bounty') loadBounty(panel);
    if (name === 'previous') loadPrevious(panel);
  }

  const initialIntent = readSubtabIntent();
  if (initialIntent) openIntent(initialIntent);

  root.addEventListener('click', (event) => {
    const button = event.target.closest('[data-eden-subtab]');
    if (!button) return;
    const name = button.dataset.edenSubtab;
    activateSubTab(root, name);
    const panel = root.querySelector(`[data-eden-subtab-panel="${name}"]`);
    if (!panel) return;
    if (name === 'loyalty') loadLoyalty(root, panel);
    if (name === 'bounty') loadBounty(panel);
    if (name === 'previous') loadPrevious(panel);
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
      if (hash === 'edenmap') activateSubTab(root, 'map');
    }, 0);
  });

  // Explicit sub-tab navigation from other tools (e.g. the command palette).
  window.addEventListener('vts:eden-hub-subtab', (event) => {
    const detail = event?.detail;
    openIntent(
      detail === 'loyalty' || detail === 'bounty' || detail === 'previous' ? detail : ''
    );
  });
}
