// js/research-towers-hub.js
// Research & Towers Hub sub-tab controller for the integrated hub tab.
//
// The hub hosts three sub-tabs inside #researchTowersSection:
//   - towers:   the Specialization Towers path planner (default landing)
//   - research: the tech research tracker
//   - artifact: the Artifact tracker
//   - buildings: the Castle 26–30 / all-buildings upgrade planner
//                (js/building-upgrades.js, also mounted in Planners ▸ Castle)
//   - pdfs:     the PDF document builder (form loaded on first open)
//
// Buildings and PDFs have no markup in index.html, which has no byte headroom:
// their buttons and panels are added at boot (js/hub-pdf-tab.js).
// Both were top-level tabs before. Their sections keep their original ids
// (#specializationSection, #researchSection) so every existing deep link,
// footer link and command-palette entry still resolves; app.js maps the old
// tab names onto this hub and hands the intended sub-tab over through
// document.body.dataset.researchTowersSubtab.

import { createHubTabButton, createHubTabPanel, mountHubPdfPanel } from './hub-pdf-tab.js';

export const RESEARCH_TOWERS_SUBTABS = Object.freeze([
  'towers',
  'research',
  'artifact',
  'buildings',
  'pdfs',
]);
export const RESEARCH_TOWERS_DEFAULT_SUBTAB = 'towers';

// Which sub-tab an old tab name or hash lands on.
export const RESEARCH_TOWERS_TAB_ALIASES = Object.freeze({
  specialization: 'towers',
  towers: 'towers',
  research: 'research',
  artifact: 'artifact',
  artifacts: 'artifact',
  buildings: 'buildings',
  pdfs: 'pdfs',
});

const ADDED_SUBTABS = Object.freeze([
  {
    name: 'buildings',
    i18nKey: 'hubBuildingsTab',
    fallback: 'Buildings',
    id: 'researchTowersTabBuildings',
    panelId: 'researchTowersBuildingsSection',
  },
  {
    name: 'pdfs',
    i18nKey: 'hubPdfsTab',
    fallback: 'PDFs',
    id: 'researchTowersTabPdfs',
    panelId: 'researchTowersPdfsSection',
  },
]);

let buildingsMounted = false;

let booted = false;
let activeSubtab = RESEARCH_TOWERS_DEFAULT_SUBTAB;

export function normalizeResearchTowersSubtab(name) {
  const key = String(name || '').toLowerCase();
  const direct = RESEARCH_TOWERS_SUBTABS.find((subtab) => subtab.toLowerCase() === key);
  return direct || RESEARCH_TOWERS_TAB_ALIASES[key] || '';
}

export function getActiveResearchTowersSubtab() {
  return activeSubtab;
}

function updateSubtabHash(subtab) {
  try {
    // Keep non-subtab parameters (e.g. the Artifact node deep link) when the
    // subtab state is rewritten.
    const current = new URLSearchParams(location.hash.split('?')[1] || '');
    const next = new URLSearchParams();
    next.set('subtab', subtab);
    current.forEach((value, key) => {
      if (key !== 'subtab') next.set(key, value);
    });
    window.history.replaceState(window.history.state, '', `#researchTowers?${next}`);
  } catch {
    // Hash persistence is helpful but not required for tab interaction.
  }
}

function addSubtabs(root) {
  const bar = root.querySelector('.vts-hub-subtabs');
  if (!bar) return;
  for (const tab of ADDED_SUBTABS) {
    if (bar.querySelector(`[data-hub-subtab="${tab.name}"]`)) continue;
    bar.append(
      createHubTabButton({
        ...tab,
        attribute: 'hubSubtab',
        className: 'vts-hub-subtab',
        controls: tab.panelId,
      })
    );
    root.append(
      createHubTabPanel({
        id: tab.panelId,
        attribute: 'hubSubtabPanel',
        name: tab.name,
        className: 'vts-hub-subtab-panel',
        labelledBy: tab.id,
      })
    );
  }
  bar.classList.replace('vts-hub-subtabs--3', 'vts-hub-subtabs--5');
  // Five-across layout (two-across on phones, the last tab full width). It
  // lives with the hub rather than in the shared stylesheet, whose per-route
  // CSS budgets have no room.
  if (!document.getElementById('vtsHubSubtabs5Style')) {
    const style = document.createElement('style');
    style.id = 'vtsHubSubtabs5Style';
    style.textContent =
      '.vts-hub-subtabs--5{grid-template-columns:repeat(5,minmax(0,1fr))}' +
      '@media (max-width:1100px){.vts-hub-subtabs--5 .vts-hub-subtab{white-space:normal}}' +
      '@media (max-width:640px){.vts-hub-subtabs--5{grid-template-columns:repeat(2,minmax(0,1fr))}' +
      '.vts-hub-subtabs--5>:last-child{grid-column:1/-1}}';
    document.head.append(style);
  }
}

// The Buildings planner is the same module Planners ▸ Castle mounts; it gets
// its own host here and loads on first open.
function mountBuildings(panel) {
  if (!panel || buildingsMounted) return;
  buildingsMounted = true;
  const host = document.createElement('div');
  host.className = 'building-upgrades-host';
  panel.replaceChildren(host);
  import('./building-upgrades.js')
    .then((module) => module.initBuildingUpgrades(host))
    .catch((error) => {
      buildingsMounted = false;
      console.warn('[research-towers-hub] Buildings planner failed to load', error);
    });
}

function applySubtab(root, name) {
  root.querySelectorAll('[data-hub-subtab]').forEach((button) => {
    const active = button.dataset.hubSubtab === name;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', String(active));
    // Only the selected tab stays in the tab sequence; the arrow keys move
    // between them, which is the expected pattern for a tablist.
    button.tabIndex = active ? 0 : -1;
  });
  root.querySelectorAll('[data-hub-subtab-panel]').forEach((panel) => {
    const active = panel.dataset.hubSubtabPanel === name;
    panel.classList.toggle('active', active);
    panel.hidden = !active;
  });
  activeSubtab = name;
}

/**
 * Show a sub-tab and let the rest of the app know, so the owning tool can boot
 * itself lazily the first time its panel is revealed.
 */
export function openResearchTowersSubtab(name, { notify = true } = {}) {
  const subtab = normalizeResearchTowersSubtab(name) || RESEARCH_TOWERS_DEFAULT_SUBTAB;
  const root = document.getElementById('researchTowersSection');
  if (!root) return '';
  applySubtab(root, subtab);
  if (subtab === 'buildings')
    mountBuildings(document.getElementById('researchTowersBuildingsSection'));
  if (subtab === 'pdfs') {
    mountHubPdfPanel('research', document.getElementById('researchTowersPdfsSection'));
  }
  if (notify) {
    try {
      window.dispatchEvent(new CustomEvent('vts:research-towers-subtab', { detail: { subtab } }));
    } catch {
      /* CustomEvent unavailable */
    }
  }
  return subtab;
}

/** The sub-tab a deep link asked for, consumed once. */
export function readResearchTowersIntent() {
  try {
    const intent = document.body?.dataset?.researchTowersSubtab;
    if (intent) {
      delete document.body.dataset.researchTowersSubtab;
      return normalizeResearchTowersSubtab(intent);
    }
    return normalizeResearchTowersSubtab(
      new URLSearchParams(location.hash.split('?')[1] || '').get('subtab')
    );
  } catch {
    return '';
  }
}

export function bootResearchTowersHub() {
  if (booted) return;
  const root = document.getElementById('researchTowersSection');
  if (!root) return;
  booted = true;
  addSubtabs(root);

  root.addEventListener('click', (event) => {
    const button = event.target.closest('[data-hub-subtab]');
    if (!button) return;
    const subtab = openResearchTowersSubtab(button.dataset.hubSubtab);
    updateSubtabHash(subtab);
  });

  // Arrow-key navigation across the two tabs, per the tablist pattern.
  root.addEventListener('keydown', (event) => {
    const button = event.target.closest('[data-hub-subtab]');
    if (!button) return;
    const back = event.key === 'ArrowLeft' || event.key === 'ArrowUp';
    const forward = event.key === 'ArrowRight' || event.key === 'ArrowDown';
    if (!back && !forward) return;
    event.preventDefault();
    const index = RESEARCH_TOWERS_SUBTABS.indexOf(button.dataset.hubSubtab);
    const next =
      (index + (forward ? 1 : -1) + RESEARCH_TOWERS_SUBTABS.length) %
      RESEARCH_TOWERS_SUBTABS.length;
    const target = RESEARCH_TOWERS_SUBTABS[next];
    openResearchTowersSubtab(target);
    updateSubtabHash(target);
    root.querySelector(`[data-hub-subtab="${target}"]`)?.focus({ preventScroll: true });
  });

  // A link to another sub-tab while the hub is already open (the More sheet's
  // Buildings entry, for one) changes only the query, so follow it here.
  window.addEventListener('hashchange', () => {
    const [base, query] = window.location.hash.replace(/^#/, '').split('?');
    if (String(base).toLowerCase() !== 'researchtowers') return;
    const wanted = normalizeResearchTowersSubtab(new URLSearchParams(query || '').get('subtab'));
    if (wanted && wanted !== activeSubtab) openResearchTowersSubtab(wanted);
  });

  const intent = readResearchTowersIntent();
  openResearchTowersSubtab(intent || RESEARCH_TOWERS_DEFAULT_SUBTAB);
}
