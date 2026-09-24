// js/heroes-combos-hub.js
// Heroes & Combos Hub sub-tab controller for the integrated hub tab.
//
// The hub hosts five sub-tabs inside #heroesCombosSection:
//   - manual:    the Manual Builder
//   - generator: the Combo Generator (default landing)
//   - codex:     the Hero Atlas, Codex mode (16.0.0 flagship)
//   - heroes:    the Hero Atlas, hero mode
//   - skins:     the Hero Atlas, skin mode
//   - pdfs:      the PDF document builder (button and panel added at boot,
//                form loaded on first open — see js/hub-pdf-tab.js)
//
// Heroes and Skins were an in-panel toggle inside the Atlas; they are sub-tabs
// here, so both drive the same #heroesSection panel and differ only by the
// Atlas mode they select. The sections keep their original ids so every deep
// link, footer link and command-palette entry still resolves; app.js maps the
// old tab names onto this hub through document.body.dataset.heroesCombosSubtab.

import { createHubTabButton, createHubTabPanel, mountHubPdfPanel } from './hub-pdf-tab.js';

export const HEROES_COMBOS_SUBTABS = Object.freeze([
  'manual',
  'generator',
  'codex',
  'heroes',
  'skins',
  'pdfs',
]);
export const HEROES_COMBOS_DEFAULT_SUBTAB = 'generator';

// Sub-tabs that share one panel, and the Atlas mode each one means.
const PANEL_FOR_SUBTAB = Object.freeze({
  manual: 'manual',
  generator: 'generator',
  codex: 'heroes',
  heroes: 'heroes',
  skins: 'heroes',
  pdfs: 'pdfs',
});

// Which sub-tab BUTTON stands for each sub-tab. Codex and Skins no longer have
// buttons of their own: three adjacent tabs that all opened the same Atlas panel
// read as three separate tools, so they are modes inside the Heroes tab again.
// The names stay live here because existing deep links, footer links and
// command-palette entries use them — they now light the Heroes button and carry
// their Atlas mode with them.
const TAB_FOR_SUBTAB = Object.freeze({
  manual: 'manual',
  generator: 'generator',
  codex: 'heroes',
  heroes: 'heroes',
  skins: 'heroes',
  pdfs: 'pdfs',
});
const ATLAS_MODE_FOR_SUBTAB = Object.freeze({
  codex: 'codex',
  heroes: 'heroes',
  skins: 'skins',
});

let booted = false;
let activeSubtab = HEROES_COMBOS_DEFAULT_SUBTAB;

export function normalizeHeroesCombosSubtab(name) {
  const key = String(name || '').toLowerCase();
  return HEROES_COMBOS_SUBTABS.find((subtab) => subtab.toLowerCase() === key) || '';
}

export function getActiveHeroesCombosSubtab() {
  return activeSubtab;
}

/** The Atlas mode the current sub-tab implies, or '' when the Atlas is not shown. */
export function atlasModeForSubtab(name) {
  return ATLAS_MODE_FOR_SUBTAB[normalizeHeroesCombosSubtab(name)] || '';
}

function applySubtab(root, name) {
  const panel = PANEL_FOR_SUBTAB[name];
  const tab = TAB_FOR_SUBTAB[name] || name;
  root.querySelectorAll('[data-hub-subtab]').forEach((button) => {
    const active = button.dataset.hubSubtab === tab;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', String(active));
    button.tabIndex = active ? 0 : -1;
  });
  root.querySelectorAll('[data-hub-subtab-panel]').forEach((element) => {
    const active = element.dataset.hubSubtabPanel === panel;
    element.classList.toggle('active', active);
    element.hidden = !active;
  });
  activeSubtab = name;
}

function updateSubtabHash(subtab) {
  try {
    // Share-intent hashes carry their own payload and must survive the
    // generator subtab opening underneath them (#combo=..., #roster=...).
    const base = (window.location.hash || '').replace(/^#/, '').split('?')[0].toLowerCase();
    if (base.startsWith('combo=') || base.startsWith('roster=')) return;
    window.history.replaceState(window.history.state, '', `#heroesCombos?subtab=${subtab}`);
  } catch {
    /* URL state is progressive enhancement. */
  }
}

export function openHeroesCombosSubtab(name, { notify = true } = {}) {
  const subtab = normalizeHeroesCombosSubtab(name) || HEROES_COMBOS_DEFAULT_SUBTAB;
  const root = document.getElementById('heroesCombosSection');
  if (!root) return '';
  applySubtab(root, subtab);
  updateSubtabHash(subtab);
  if (subtab === 'pdfs') mountHubPdfPanel('heroes', document.getElementById('heroesPdfsSection'));
  if (notify) {
    try {
      window.dispatchEvent(
        new CustomEvent('vts:heroes-combos-subtab', {
          detail: { subtab, atlasMode: atlasModeForSubtab(subtab) },
        })
      );
    } catch {
      /* CustomEvent unavailable */
    }
  }
  return subtab;
}

export function readHeroesCombosIntent() {
  try {
    const intent = document.body?.dataset?.heroesCombosSubtab;
    if (intent) {
      delete document.body.dataset.heroesCombosSubtab;
      return normalizeHeroesCombosSubtab(intent);
    }
    return normalizeHeroesCombosSubtab(
      new URLSearchParams(location.hash.split('?')[1] || '').get('subtab')
    );
  } catch {
    return '';
  }
}

// index.html has no byte headroom, so the PDFs tab is added here.
function addPdfsTab(root) {
  const bar = root.querySelector('.vts-hub-subtabs');
  if (!bar || bar.querySelector('[data-hub-subtab="pdfs"]')) return;
  bar.append(
    createHubTabButton({
      name: 'pdfs',
      i18nKey: 'hubPdfsTab',
      fallback: 'PDFs',
      attribute: 'hubSubtab',
      className: 'vts-hub-subtab',
      controls: 'heroesPdfsSection',
      id: 'heroesCombosTabPdfs',
    })
  );
  bar.classList.replace('vts-hub-subtabs--3', 'vts-hub-subtabs--4');
  root.append(
    createHubTabPanel({
      id: 'heroesPdfsSection',
      attribute: 'hubSubtabPanel',
      name: 'pdfs',
      className: 'vts-hub-subtab-panel',
      labelledBy: 'heroesCombosTabPdfs',
    })
  );
}

export function bootHeroesCombosHub() {
  if (booted) return;
  const root = document.getElementById('heroesCombosSection');
  if (!root) return;
  booted = true;
  addPdfsTab(root);

  // Only the bar's own buttons, never a [data-hub-subtab] that some future
  // panel content might carry.
  const bar = root.querySelector('.vts-hub-subtabs');
  bar?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-hub-subtab]');
    if (!button) return;
    openHeroesCombosSubtab(button.dataset.hubSubtab);
  });

  bar?.addEventListener('keydown', (event) => {
    const button = event.target.closest('[data-hub-subtab]');
    if (!button) return;
    const back = event.key === 'ArrowLeft' || event.key === 'ArrowUp';
    const forward = event.key === 'ArrowRight' || event.key === 'ArrowDown';
    if (!back && !forward) return;
    event.preventDefault();
    const index = HEROES_COMBOS_SUBTABS.indexOf(button.dataset.hubSubtab);
    const next =
      (index + (forward ? 1 : -1) + HEROES_COMBOS_SUBTABS.length) % HEROES_COMBOS_SUBTABS.length;
    const target = HEROES_COMBOS_SUBTABS[next];
    openHeroesCombosSubtab(target);
    bar.querySelector(`[data-hub-subtab="${target}"]`)?.focus({ preventScroll: true });
  });

  const intent = readHeroesCombosIntent();
  openHeroesCombosSubtab(intent || HEROES_COMBOS_DEFAULT_SUBTAB);
}
