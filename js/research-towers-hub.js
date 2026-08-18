// js/research-towers-hub.js
// Research & Towers Hub sub-tab controller for the integrated hub tab.
//
// The hub hosts three sub-tabs inside #researchTowersSection:
//   - towers:   the Specialization Towers path planner (default landing)
//   - research: the tech research tracker
//   - artifact: the Artifact tracker
//
// Both were top-level tabs before. Their sections keep their original ids
// (#specializationSection, #researchSection) so every existing deep link,
// footer link and command-palette entry still resolves; app.js maps the old
// tab names onto this hub and hands the intended sub-tab over through
// document.body.dataset.researchTowersSubtab.

export const RESEARCH_TOWERS_SUBTABS = Object.freeze(['towers', 'research', 'artifact']);
export const RESEARCH_TOWERS_DEFAULT_SUBTAB = 'towers';

// Which sub-tab an old tab name or hash lands on.
export const RESEARCH_TOWERS_TAB_ALIASES = Object.freeze({
  specialization: 'towers',
  towers: 'towers',
  research: 'research',
  artifact: 'artifact',
  artifacts: 'artifact',
});

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

  const intent = readResearchTowersIntent();
  openResearchTowersSubtab(intent || RESEARCH_TOWERS_DEFAULT_SUBTAB);
}
