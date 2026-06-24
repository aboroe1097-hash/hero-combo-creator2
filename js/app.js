// js/app.js - Manual + Generator, scoring, no duplicates, image + text export
import { translations, loadTranslationsForLanguage } from './translations.js';
import { initComments } from './comments.js';
import { allHeroesData } from './heroes-data.js';
import { initLoyaltyCalculator } from './loyalty-calculator.js';
import { mountGameClock, syncGameClockTitles } from './game-time.js';
import { escapeHtml, debounce, installShowToast } from './utils.js';
import { applySeo } from './seo.js';
import { initAppLoading, notifyAppReady } from './app-loading.js';
import { registerServiceWorker, setupInstallPrompt } from './pwa-register.js';
import { loadPlayerProfileFromCloud, applyRosterToGenerator } from './player-profile.js';
import { parseComboShareUrl } from './combo-share.js';
import { parseRosterShareUrl } from './roster-share.js';
import { downloadComboImage } from './app-export.js';
import { showHeroTooltip, moveHeroTooltip, hideHeroTooltip, forceHideHeroTooltip } from './app-hero-tooltip.js';
import { initUndoToasts } from './app-undo.js';
import { initErrorReporting, logClientError, flushClientErrors } from './app-error-reporting.js';
import { initWhatsNewBanner } from './app-whats-new.js';
import { initKeyboardShortcuts } from './app-shortcuts.js';
import { initUserDataPortability } from './user-data-portability.js';
import { initBugReportWidget } from './bug-widget.js';
import { DEBOUNCE_MS, HERO_DRAG_MIME } from './constants.js';

import {
  renderAvailableHeroes,
  updateComboSlotDisplay,
  updateManualComboScore,
  setupTouchDragForManualBuilder,
  setupKeyboardComboSlots,
  placeHeroInSlot,
  saveCombo,
  setupFirestoreListener
} from './app-builder.js';

import {
  renderGeneratorHeroes,
  generateBestCombos,
  generateRandomCombos,
  markGeneratorSelectionChanged,
  restoreGeneratorSelection,
  syncGeneratorSelectedCountBadge,
} from './app-generator.js';

import {
  currentLanguage,
  setCurrentLanguage,
  heroInfoEnabled,
  setHeroInfoEnabled,
  setSelectedSeasons,
  setSelectedStates,
  setSelectedTypes,
  currentCombo,
  setCurrentCombo,
  generatorSelectedSeasons,
  setGeneratorSelectedSeasons,
  generatorSelectedStates,
  setGeneratorSelectedStates,
  generatorSelectedTypes,
  setGeneratorSelectedTypes,
  setGeneratorSkinsOnly,
  generatorSelectedHeroes,
  getUserId,
  setUserId,
  savedCombosCache,
  lastGeneratedCombos,
  APP_VERSION,
  ENABLE_RESEARCH_FEATURE,
  seasonColors,
  TechseasonColors,
  TECH_SEASON_ORDER,
  HERO_ATLAS_ALL_SEASONS,
  DEFAULT_HERO_FILTER_SEASONS,
  languageSelect,
  availableHeroesEl,
  saveComboBtn,
  clearComboBtn,
  downloadCombosBtn,
  shareAllCombosBtn,
  savedCombosEl,
  noCombosMessage,
  loadingSpinner,
  messageBox,
  messageText,
  messageBoxOkBtn,
  messageBoxCancelBtn,
  manualSection,
  generatorSection,
  loyaltySection,
  youtubeSection,
  researchSection,
  tabManualBtn,
  tabGeneratorBtn,
  tabLoyaltyBtn,
  tabYouTubeBtn,
  tabResearchBtn,
  tabHeroesBtn,
  tabEdenMapBtn,
  tabStrifeBtn,
  heroesSection,
  edenMapSection,
  strifeSection,
  globalToggleRow,
  comboFooterBar,
  generatorHeroesEl,
  generatorResultsEl,
  generateCombosBtn,
  downloadGeneratorBtn,
  seasonFiltersEl,
  stateFiltersEl,
  troopFiltersEl,
  genSeasonFiltersEl,
  genStateFiltersEl,
  genTroopFiltersEl,
  paidBadgeHtml,
  paidIconHtml,
  getTroopColorClass,
  getLocalizedTroop,
  getHeroImageUrl,
  heroMatchesFilters,
  getSeasonCatchupHint,
  getSeasonCatchupItems,
  getComboRankInfo,
  getCounterLabels,
  isHeroAlreadyInCombo,
  computeStateSelection,
  computeTypeSelection,
  getCheckedValues,
  getGeneratorHeroPool,
  registerUiFunctions,
} from './state.js';

const renderAvailableHeroesDebounced = debounce(() => renderAvailableHeroes(), DEBOUNCE_MS);
const renderGeneratorHeroesDebounced = debounce(() => renderGeneratorHeroes(syncGeneratorControlState()), DEBOUNCE_MS);
const HERO_INFO_ENABLED_KEY = 'vts_hero_info_enabled';
const GENERATOR_SKIN_NUDGE_KEY = 'vts_generator_skin_nudge_seen';
const THEME_STORAGE_KEY = 'vts_theme';
let researchModulePromise = null;

function loadResearchModule() {
  if (!researchModulePromise) {
    researchModulePromise = import('./app-research.js').catch((err) => {
      researchModulePromise = null;
      throw err;
    });
  }
  return researchModulePromise;
}

function resolveDroppedHeroName(dataTransfer) {
  const rawName = dataTransfer?.getData(HERO_DRAG_MIME) || dataTransfer?.getData('text/plain') || '';
  const heroName = rawName.trim();
  return allHeroesData.some(hero => hero.name === heroName) ? heroName : '';
}

/* ===== THEME (Dark default + Light) ===== */
function getPreferredTheme() {
  const stored = localStorage.getItem(THEME_STORAGE_KEY) || localStorage.getItem('theme');
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === 'light') {
    root.setAttribute('data-theme', 'light');
  } else {
    root.removeAttribute('data-theme');
  }
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute('content', theme === 'light' ? '#f8fafc' : '#0f172a');
  }
  const btn = document.getElementById('themeToggle');
  if (btn) {
    const darkIcon = btn.querySelector('.theme-icon-dark');
    const lightIcon = btn.querySelector('.theme-icon-light');
    if (darkIcon && lightIcon) {
      if (theme === 'light') {
        darkIcon.classList.add('hidden');
        lightIcon.classList.remove('hidden');
      } else {
        darkIcon.classList.remove('hidden');
        lightIcon.classList.add('hidden');
      }
    }
  }
}

function initTheme() {
  const theme = getPreferredTheme();
  applyTheme(theme);
  if (!localStorage.getItem(THEME_STORAGE_KEY) && localStorage.getItem('theme')) {
    localStorage.setItem(THEME_STORAGE_KEY, localStorage.getItem('theme'));
    localStorage.removeItem('theme');
  }
  if (!localStorage.getItem(THEME_STORAGE_KEY) && window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', (e) => {
      if (!localStorage.getItem(THEME_STORAGE_KEY)) {
        applyTheme(e.matches ? 'light' : 'dark');
      }
    });
  }
  const setupToggle = () => {
    const btn = document.getElementById('themeToggle');
    if (!btn || btn.dataset.themeWired) return;
    btn.dataset.themeWired = '1';
    btn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
      const next = current === 'light' ? 'dark' : 'light';
      localStorage.setItem(THEME_STORAGE_KEY, next);
      localStorage.removeItem('theme');
      applyTheme(next);
    });
    const currentTheme = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    applyTheme(currentTheme);
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupToggle, { once: true });
  } else {
    setupToggle();
  }
}

installShowToast();
initTheme();

function addCounterHeroesToGenerator(heroNames) {
  heroNames.filter(Boolean).forEach(name => generatorSelectedHeroes.add(name));
  renderGeneratorHeroes(syncGeneratorControlState());
  markGeneratorSelectionChanged({ immediate: true });
  if (typeof window.showToast === 'function') {
    window.showToast('Counter heroes added to Generator selection.', 'success');
  }
}

document.addEventListener('click', (e) => {
  const useCounterBtn = e.target.closest('.counter-use-btn');
  if (useCounterBtn) {
    e.preventDefault();
    e.stopPropagation();
    addCounterHeroesToGenerator((useCounterBtn.dataset.counterUse || '').split('|'));
    return;
  }

  const btn = e.target.closest('.counter-toggle-btn');
  if (!btn) return;
  const panel = document.getElementById(btn.dataset.counterTarget);
  if (!panel) return;
  const willOpen = !panel.classList.contains('counter-panel--open');
  if (willOpen) {
    panel.classList.remove('hidden', 'counter-panel--closing');
    requestAnimationFrame(() => panel.classList.add('counter-panel--open'));
  } else {
    panel.classList.remove('counter-panel--open');
    panel.classList.add('counter-panel--closing');
    const done = () => {
      panel.classList.add('hidden');
      panel.classList.remove('counter-panel--closing');
      panel.removeEventListener('transitionend', done);
    };
    panel.addEventListener('transitionend', done);
    setTimeout(done, 280);
  }
  btn.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
  btn.classList.toggle('counter-toggle-btn--open', willOpen);
});

const TAB_BTN_IDS = {
  manual: 'tabManual',
  generator: 'tabGenerator',
  heroes: 'tabHeroes',
  research: 'tabResearch',
  edenMap: 'tabEdenMap',
  strife: 'tabStrife',
  loyalty: 'tabLoyalty',
  youtube: 'tabYouTube',
};

// --- HERO HOVER TOOLTIP ---
const heroTooltip = document.createElement('div');
heroTooltip.id = 'heroTooltip';
heroTooltip.className = 'fixed z-[9999] bg-slate-900/98 backdrop-blur-md border border-slate-600 rounded-xl p-3 sm:p-4 shadow-2xl text-slate-200 w-[90vw] sm:w-[340px] md:w-[480px] lg:w-[520px] pointer-events-auto hidden opacity-0 transition-opacity duration-200 flex flex-col';
document.body.appendChild(heroTooltip);

document.addEventListener('touchstart', (e) => {
  if (!e.target.closest('.hero-card') && !heroTooltip.contains(e.target)) {
    hideHeroTooltip();
  }
}, { passive: true });





function showAboModal(message, onConfirm = null) {
  const t = translations[currentLanguage] || translations.en;
  messageText.textContent = message;
  messageBox.classList.remove('hidden');
  if (onConfirm) {
    messageBoxOkBtn.textContent = t.messageBoxConfirm || 'Confirm';
    messageBoxCancelBtn.classList.remove('hidden');
    messageBoxOkBtn.onclick = () => {
      messageBox.classList.add('hidden');
      onConfirm();
    };
    messageBoxCancelBtn.onclick = () => messageBox.classList.add('hidden');
  } else {
    messageBoxOkBtn.textContent = t.messageBoxOk || 'OK';
    messageBoxCancelBtn.classList.add('hidden');
    messageBoxOkBtn.onclick = () => messageBox.classList.add('hidden');
  }
}

// --- TOUCH DRAG & RENDER MOVED TO MODULAR FILES ---
const DEFAULT_STATE_FILTER_VALUES = ['free', 'paid'];
const DEFAULT_TROOP_FILTER_VALUES = ['All'];

function syncCheckboxValues(container, values) {
  if (!container) return;
  const wanted = new Set(values.map(v => String(v).toLowerCase()));
  container.querySelectorAll('input[type="checkbox"]').forEach(input => {
    input.checked = wanted.has(String(input.value).toLowerCase());
  });
}

function readSeasonFilterSelection(container) {
  const checked = getCheckedValues(container);
  if (checked.length > 0) return checked;
  syncCheckboxValues(container, DEFAULT_HERO_FILTER_SEASONS);
  return [...DEFAULT_HERO_FILTER_SEASONS];
}

function updateSeasonCatchupHint(container) {
  if (!container) return;
  const targetId = container.id === 'seasonFilters'
    ? 'seasonCatchupHint'
    : container.id === 'generatorSeasonFilters'
      ? 'generatorSeasonCatchupHint'
      : '';
  if (!targetId) return;
  const el = document.getElementById(targetId);
  if (!el) return;
  const items = getSeasonCatchupItems(getCheckedValues(container));
  el.innerHTML = items.map(item => `
    <span class="season-catchup-card season-catchup-card--${escapeHtml(item.season.toLowerCase())}">
      <span class="season-catchup-badge">${escapeHtml(item.season)}</span>
      <span class="season-catchup-copy">
        <strong>${escapeHtml(item.title)}</strong>
        <span>${escapeHtml(item.body)}</span>
      </span>
    </span>
  `).join('');
  el.classList.toggle('hidden', !items.length);
}

function updateAllSeasonCatchupHints() {
  updateSeasonCatchupHint(document.getElementById('seasonFilters') || seasonFiltersEl);
  updateSeasonCatchupHint(document.getElementById('generatorSeasonFilters') || genSeasonFiltersEl);
}

function readStateFilterSelection(container) {
  if (!getCheckedValues(container).length) {
    syncCheckboxValues(container, DEFAULT_STATE_FILTER_VALUES);
  }
  return computeStateSelection(container);
}

function readTroopFilterSelection(container, changedInput) {
  if (!container) return ['Archers', 'Footmen', 'Cavalry', 'All'];

  if (changedInput?.matches?.('input[type="checkbox"]')) {
    const changedValue = changedInput.value.toLowerCase();
    if (changedValue === 'all' && changedInput.checked) {
      container.querySelectorAll('input[type="checkbox"]').forEach(input => {
        input.checked = input === changedInput;
      });
    } else if (changedValue !== 'all' && changedInput.checked) {
      const allInput = Array.from(container.querySelectorAll('input[type="checkbox"]'))
        .find(input => input.value.toLowerCase() === 'all');
      if (allInput) allInput.checked = false;
    }
  }

  if (!getCheckedValues(container).length) {
    syncCheckboxValues(container, DEFAULT_TROOP_FILTER_VALUES);
  }

  return computeTypeSelection(container);
}

function wireFilterControls(container, onChange) {
  if (!container || typeof onChange !== 'function') return;
  if (container.dataset.filterWired === '1') return;
  container.dataset.filterWired = '1';

  container.addEventListener('change', (event) => {
    if (!event.target.matches('input[type="checkbox"]')) return;
    onChange(event.target);
  });
}

function wireFilterSets() {
  const manualSeasonFilters = document.getElementById('seasonFilters') || seasonFiltersEl;
  const manualStateFilters = document.getElementById('stateFilters') || stateFiltersEl;
  const manualTroopFilters = document.getElementById('troopFilters') || troopFiltersEl;
  const generatorSeasonFilters = document.getElementById('generatorSeasonFilters') || genSeasonFiltersEl;
  const generatorStateFilters = document.getElementById('generatorStateFilters') || genStateFiltersEl;
  const generatorTroopFilters = document.getElementById('generatorTroopFilters') || genTroopFiltersEl;

  wireFilterControls(manualSeasonFilters, () => {
    setSelectedSeasons(readSeasonFilterSelection(manualSeasonFilters));
    updateSeasonCatchupHint(manualSeasonFilters);
    renderAvailableHeroes();
  });

  wireFilterControls(manualStateFilters, () => {
    setSelectedStates(readStateFilterSelection(manualStateFilters));
    renderAvailableHeroes();
  });

  wireFilterControls(manualTroopFilters, (input) => {
    setSelectedTypes(readTroopFilterSelection(manualTroopFilters, input));
    renderAvailableHeroes();
  });

  wireFilterControls(generatorSeasonFilters, () => {
    updateSeasonCatchupHint(generatorSeasonFilters);
    renderGeneratorHeroes(syncGeneratorControlState());
  });

  wireFilterControls(generatorStateFilters, () => {
    renderGeneratorHeroes(syncGeneratorControlState());
  });

  wireFilterControls(generatorTroopFilters, (input) => {
    renderGeneratorHeroes(syncGeneratorControlState(input));
  });

  updateAllSeasonCatchupHints();
}

function wireGeneratorSkinToggle() {
  const genSkinToggle = document.getElementById('genSkinToggle');
  if (!genSkinToggle || genSkinToggle.dataset.skinToggleWired === '1') return;
  genSkinToggle.dataset.skinToggleWired = '1';

  const syncGeneratorSkinToggle = () => {
    hideGeneratorSkinNudge();
    renderGeneratorHeroes(syncGeneratorControlState());
  };
  genSkinToggle.addEventListener('change', syncGeneratorSkinToggle);
}

function rememberGeneratorSkinNudge() {
  try {
    localStorage.setItem(GENERATOR_SKIN_NUDGE_KEY, '1');
  } catch {}
}

function hideGeneratorSkinNudge() {
  const nudge = document.getElementById('genSkinNudge');
  if (!nudge) return;
  nudge.classList.add('hidden');
  rememberGeneratorSkinNudge();
}

function maybeShowGeneratorSkinNudge() {
  const nudge = document.getElementById('genSkinNudge');
  const genSkinToggle = document.getElementById('genSkinToggle');
  if (!nudge || genSkinToggle?.checked) return;

  try {
    if (localStorage.getItem(GENERATOR_SKIN_NUDGE_KEY) === '1') return;
  } catch {}

  nudge.classList.remove('hidden');
}

function wireGeneratorSkinNudge() {
  const nudge = document.getElementById('genSkinNudge');
  if (!nudge || nudge.dataset.skinNudgeWired === '1') return;
  nudge.dataset.skinNudgeWired = '1';

  document.getElementById('genSkinNudgeTry')?.addEventListener('click', () => {
    const genSkinToggle = document.getElementById('genSkinToggle');
    if (genSkinToggle && !genSkinToggle.checked) {
      genSkinToggle.checked = true;
      genSkinToggle.dispatchEvent(new Event('change', { bubbles: true }));
    }
    hideGeneratorSkinNudge();
  });

  document.getElementById('genSkinNudgeDismiss')?.addEventListener('click', hideGeneratorSkinNudge);
}

function wireHeroSearchInputs() {
  const manualSearch = document.getElementById('manualHeroSearch');
  if (manualSearch && manualSearch.dataset.searchWired !== '1') {
    manualSearch.dataset.searchWired = '1';
    manualSearch.addEventListener('input', renderAvailableHeroesDebounced);
  }

  const generatorSearch = document.getElementById('generatorHeroSearch');
  if (generatorSearch && generatorSearch.dataset.searchWired !== '1') {
    generatorSearch.dataset.searchWired = '1';
    generatorSearch.addEventListener('input', renderGeneratorHeroesDebounced);
  }
}

function applyHeroInfoPanelState(enabled) {
  setHeroInfoEnabled(enabled);
  localStorage.setItem(HERO_INFO_ENABLED_KEY, enabled ? '1' : '0');
  const toggle = document.getElementById('heroInfoToggle');
  const label = document.getElementById('heroInfoToggleLabel');
  if (toggle) toggle.checked = enabled;
  if (label) label.setAttribute('aria-checked', enabled ? 'true' : 'false');
  document.body.classList.toggle('hide-hero-info', !enabled);
  if (!enabled) forceHideHeroTooltip();
}

function syncGeneratorControlState(changedTroopInput = null) {
  const seasonContainer = document.getElementById('generatorSeasonFilters') || genSeasonFiltersEl;
  const stateContainer = document.getElementById('generatorStateFilters') || genStateFiltersEl;
  const troopContainer = document.getElementById('generatorTroopFilters') || genTroopFiltersEl;
  const skinsOnly = !!document.getElementById('genSkinToggle')?.checked;
  const seasons = readSeasonFilterSelection(seasonContainer);
  const states = readStateFilterSelection(stateContainer);
  const types = readTroopFilterSelection(troopContainer, changedTroopInput);

  setGeneratorSelectedSeasons(seasons);
  setGeneratorSelectedStates(states);
  setGeneratorSelectedTypes(types);
  setGeneratorSkinsOnly(skinsOnly);
  updateSeasonCatchupHint(seasonContainer);

  return { seasons, states, types, skinsOnly };
}

function getVisibleGeneratorHeroes(options = syncGeneratorControlState()) {
  const searchQuery = (document.getElementById('generatorHeroSearch')?.value || '').trim().toLowerCase();
  return getGeneratorHeroPool(options.skinsOnly)
    .filter(h => heroMatchesFilters(h, options.seasons, options.states, options.types))
    .filter(h => !searchQuery || h.name.toLowerCase().includes(searchQuery));
}

function resetGeneratorFilters() {
  const seasonContainer = document.getElementById('generatorSeasonFilters') || genSeasonFiltersEl;
  const stateContainer = document.getElementById('generatorStateFilters') || genStateFiltersEl;
  const troopContainer = document.getElementById('generatorTroopFilters') || genTroopFiltersEl;
  const searchInput = document.getElementById('generatorHeroSearch');

  syncCheckboxValues(seasonContainer, DEFAULT_HERO_FILTER_SEASONS);
  syncCheckboxValues(stateContainer, DEFAULT_STATE_FILTER_VALUES);
  syncCheckboxValues(troopContainer, DEFAULT_TROOP_FILTER_VALUES);
  if (searchInput) searchInput.value = '';

  const options = syncGeneratorControlState();
  renderGeneratorHeroes(options);
}

function selectVisibleGeneratorHeroes() {
  const options = syncGeneratorControlState();
  const visibleHeroes = getVisibleGeneratorHeroes(options);
  const selectAll = () => {
    visibleHeroes.forEach(h => generatorSelectedHeroes.add(h.name));
    renderGeneratorHeroes(options);
    markGeneratorSelectionChanged({ immediate: true });
  };

  if (!visibleHeroes.length) {
    showAboModal('No visible heroes match the current filters.');
    return;
  }

  selectAll();
}

function applyFilterSelection(container, input) {
  if (!container) return;
  if (container.id === 'seasonFilters') {
    setSelectedSeasons(readSeasonFilterSelection(container));
    updateSeasonCatchupHint(container);
    renderAvailableHeroes();
  } else if (container.id === 'stateFilters') {
    setSelectedStates(readStateFilterSelection(container));
    renderAvailableHeroes();
  } else if (container.id === 'troopFilters') {
    setSelectedTypes(readTroopFilterSelection(container, input));
    renderAvailableHeroes();
  } else if (container.id === 'generatorSeasonFilters') {
    updateSeasonCatchupHint(container);
    renderGeneratorHeroes(syncGeneratorControlState());
  } else if (container.id === 'generatorStateFilters') {
    renderGeneratorHeroes(syncGeneratorControlState());
  } else if (container.id === 'generatorTroopFilters') {
    renderGeneratorHeroes(syncGeneratorControlState(input));
  }
}

function wireGlobalControlDelegates() {
  if (document.documentElement.dataset.vtsControlDelegatesWired === '1') return;
  document.documentElement.dataset.vtsControlDelegatesWired = '1';
  let suppressClick = false;

  document.addEventListener('pointerdown', (event) => {
    const heroInfoLabel = event.target.closest?.('#heroInfoToggleLabel');
    if (heroInfoLabel) {
      const toggle = document.getElementById('heroInfoToggle');
      if (!toggle || toggle.disabled) return;
      event.preventDefault();
      event.stopPropagation();
      suppressClick = true;
      window.setTimeout(() => { suppressClick = false; }, 350);
      applyHeroInfoPanelState(!toggle.checked);
      return;
    }

    const skinLabel = event.target.closest?.('#genSkinToggleLabel');
    if (skinLabel) {
      const toggle = document.getElementById('genSkinToggle');
      if (!toggle || toggle.disabled) return;
      event.preventDefault();
      event.stopPropagation();
      suppressClick = true;
      window.setTimeout(() => { suppressClick = false; }, 350);
      toggle.checked = !toggle.checked;
      hideGeneratorSkinNudge();
      renderGeneratorHeroes(syncGeneratorControlState());
      return;
    }

    const pill = event.target.closest?.('label.filter-pill');
    const container = pill?.closest?.('#seasonFilters, #stateFilters, #troopFilters, #generatorSeasonFilters, #generatorStateFilters, #generatorTroopFilters');
    if (!pill || !container) return;
    const input = pill.querySelector('input[type="checkbox"]');
    if (!input || input.disabled) return;
    event.preventDefault();
    event.stopPropagation();
    suppressClick = true;
    window.setTimeout(() => { suppressClick = false; }, 350);
    input.checked = !input.checked;
    applyFilterSelection(container, input);
  }, true);

  document.addEventListener('click', (event) => {
    const heroInfoLabel = event.target.closest?.('#heroInfoToggleLabel');
    if (heroInfoLabel) {
      if (suppressClick) {
        event.preventDefault();
        event.stopPropagation();
      }
      return;
    }

    const skinLabel = event.target.closest?.('#genSkinToggleLabel');
    if (skinLabel) {
      const toggle = document.getElementById('genSkinToggle');
      if (suppressClick) {
        event.preventDefault();
        event.stopPropagation();
      }
      window.setTimeout(() => {
        if (!toggle) return;
        renderGeneratorHeroes(syncGeneratorControlState());
      }, 0);
      return;
    }

    const pill = event.target.closest?.('label.filter-pill');
    const container = pill?.closest?.('#seasonFilters, #stateFilters, #troopFilters, #generatorSeasonFilters, #generatorStateFilters, #generatorTroopFilters');
    if (!pill || !container) return;
    const input = pill.querySelector('input[type="checkbox"]');
    if (suppressClick) {
      event.preventDefault();
      event.stopPropagation();
    }
    window.setTimeout(() => applyFilterSelection(container, input), 0);
  }, true);
}

// --- UI WIRING ---
function wireUIActions() {
  // === TAB BUTTON HANDLERS ===
const tabs = [
  { btn: tabManualBtn,   name: 'manual' },
  { btn: tabGeneratorBtn,name: 'generator' },
  { btn: tabHeroesBtn,   name: 'heroes' },
  { btn: tabResearchBtn, name: 'research' },
  { btn: tabEdenMapBtn,  name: 'edenMap' },
  { btn: tabStrifeBtn,   name: 'strife' },
  { btn: tabLoyaltyBtn,  name: 'loyalty' },
  { btn: tabYouTubeBtn,  name: 'youtube' },
];

tabs.forEach(tab => {
  if (tab.btn) {
    tab.btn.addEventListener('click', () => switchTab(tab.name));
  }
});
  wireGlobalControlDelegates();
  wireFilterSets();
  wireGeneratorSkinToggle();
  wireGeneratorSkinNudge();
  wireHeroSearchInputs();

  // --- RESTORED: Initialize Combo Slots & Drag-and-Drop ---
  document.querySelectorAll('.combo-slot').forEach((slot, i) => {
    // 1. Draw the initial '+' signs
    updateComboSlotDisplay(slot, null, i);

    // 2. Setup Desktop Drag-and-Drop zones
    slot.addEventListener('dragover', e => {
      e.preventDefault(); // Required to allow dropping
      e.dataTransfer.dropEffect = 'copy';
      slot.classList.add('drag-over'); // Highlight effect
    });
    
    slot.addEventListener('dragleave', e => {
      slot.classList.remove('drag-over');
    });

    slot.addEventListener('drop', e => {
      e.preventDefault();
      slot.classList.remove('drag-over');
      
      const heroName = resolveDroppedHeroName(e.dataTransfer);
      if (!heroName) return;

      placeHeroInSlot(slot, heroName, i);
    });
  });

  // 3. Turn on Mobile Touch Dragging
  setupTouchDragForManualBuilder();
  setupKeyboardComboSlots();
  // --------------------------------------------------------

  if (languageSelect) {
    languageSelect.onchange = async e => {
      setCurrentLanguage(e.target.value);
      localStorage.setItem('vts_hero_lang', currentLanguage);
      await loadTranslationsForLanguage(currentLanguage);
      updateTextContent();
      renderAvailableHeroes();
      renderGeneratorHeroes(syncGeneratorControlState());
      if (typeof window.vtsRenderStrifeTool === 'function') window.vtsRenderStrifeTool();
    };
  }

  const heroInfoToggle = document.getElementById('heroInfoToggle');
  const heroInfoToggleLabel = document.getElementById('heroInfoToggleLabel');
  if (heroInfoToggle && heroInfoToggle.dataset.heroInfoWired !== '1') {
    heroInfoToggle.dataset.heroInfoWired = '1';
    const storedHeroInfo = localStorage.getItem(HERO_INFO_ENABLED_KEY);
    applyHeroInfoPanelState(storedHeroInfo === null ? heroInfoToggle.checked : storedHeroInfo !== '0');

    heroInfoToggle.addEventListener('change', (e) => {
      applyHeroInfoPanelState(e.target.checked);
    });

    heroInfoToggleLabel?.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      applyHeroInfoPanelState(!heroInfoToggle.checked);
    });
  }

  let _lastTab = null;
  let _edenMapReady = false;
  let _edenMapBooting = false;
  let _heroesTabReady = false;
  let _heroesTabBooting = false;
  let _researchReady = false;
  let _researchBooting = false;
  let _strifeReady = false;
  let _strifeBooting = false;

  const tabPanels = [
    manualSection, generatorSection, heroesSection, researchSection,
    edenMapSection, strifeSection, loyaltySection, youtubeSection,
  ];

  function loadYouTubeEmbeds() {
    document.querySelectorAll('#youtubeSection iframe[data-src]').forEach((iframe) => {
      const srcAttr = iframe.getAttribute('src');
      if ((!srcAttr || srcAttr === '') && iframe.dataset.src) {
        iframe.src = iframe.dataset.src;
      }
    });
  }

  const _tabTemplatesLoaded = {};

  async function loadTabTemplate(tabName) {
    const section = document.getElementById(`${tabName}Section`);
    if (!section || _tabTemplatesLoaded[tabName]) return;
    const src = section.dataset.tabSrc;
    if (!src) { _tabTemplatesLoaded[tabName] = true; return; }
    try {
      const res = await fetch(src);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();
      section.innerHTML = html;
      _tabTemplatesLoaded[tabName] = true;
      updateTextContent();
    } catch (err) {
      console.warn(`[Tab] Failed to load template for ${tabName}:`, err);
      section.innerHTML = `<div class="p-8 text-center text-sm text-red-400">Failed to load this tab. <button onclick="location.reload()" class="underline">Reload</button></div>`;
    }
  }

  function isDynamicImportLoadFailure(err) {
    const message = String(err?.message || err || '');
    return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(message);
  }

  async function recoverFromStaleAssetGraph(reason) {
    const storageKey = 'vts_stale_asset_recovery_v1';
    try {
      if (sessionStorage.getItem(storageKey) === '1') return false;
      sessionStorage.setItem(storageKey, '1');
    } catch {}

    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      }
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.update()));
      }
    } catch (err) {
      console.warn('[assets] stale asset recovery cleanup failed:', err);
    }

    console.warn('[assets] refreshing after stale asset graph:', reason);
    window.location.reload();
    return true;
  }

  function onTabActivated(tabName) {
    if (tabName === 'edenMap' && !_edenMapReady && !_edenMapBooting) {
      _edenMapBooting = true;
      loadTabTemplate('edenMap').then(() => {
        const root = document.getElementById('edenMapRoot');
        root?.classList.add('eden-map-loading');
        import('./eden-map.js')
          .then((mod) => mod.bootEdenMapPlanner())
          .then(() => { _edenMapReady = true; })
          .catch((err) => {
            console.error('Eden map failed to load', err);
            _edenMapBooting = false;
            if (isDynamicImportLoadFailure(err)) {
              recoverFromStaleAssetGraph(err);
              return;
            }
            if (typeof window.showToast === 'function') {
              const t = translations[currentLanguage] || translations.en;
              window.showToast(t.edenMapLoadFailed || 'Eden map failed to load. Refresh and try again.', 'error', 4000);
            }
          })
          .finally(() => root?.classList.remove('eden-map-loading'));
      });
    }
    if (tabName === 'generator') {
      maybeShowGeneratorSkinNudge();
    }
    if (tabName === 'heroes' && !_heroesTabReady) {
      if (_heroesTabBooting) return;
      _heroesTabBooting = true;
      import('./app-hero-atlas.js')
        .then((mod) => {
          mod.renderHeroesTab();
          _heroesTabReady = true;
        })
        .catch((err) => {
          _heroesTabBooting = false;
          console.error('Hero Atlas failed to load', err);
          if (typeof window.showToast === 'function') {
            const t = translations[currentLanguage] || translations.en;
            window.showToast(t.moduleLoadFailed?.replace('{name}', 'Hero Atlas') || 'Hero Atlas failed to load.', 'error', 4000);
          }
        });
    }
    if (tabName === 'research' && !_researchReady) {
      if (_researchBooting) return;
      _researchBooting = true;
      loadResearchModule()
        .then((mod) => {
          mod.initResearchCalculator();
          _researchReady = true;
        })
        .catch((err) => {
          _researchBooting = false;
          console.error('Research failed to load', err);
          if (typeof window.showToast === 'function') {
            const t = translations[currentLanguage] || translations.en;
            window.showToast(t.moduleLoadFailed?.replace('{name}', 'Research') || 'Research failed to load.', 'error', 4000);
          }
        });
    }
    if (tabName === 'strife' && !_strifeReady) {
      if (_strifeBooting) return;
      _strifeBooting = true;
      import('./app-strife.js')
        .then((mod) => {
          mod.initStrifeTool();
          _strifeReady = true;
        })
        .catch((err) => {
          _strifeBooting = false;
          console.error('Strife tool failed to load', err);
          if (typeof window.showToast === 'function') {
            const t = translations[currentLanguage] || translations.en;
            window.showToast(t.moduleLoadFailed?.replace('{name}', 'Strife') || 'Strife failed to load.', 'error', 4000);
          }
        });
    }
    if (tabName === 'youtube') {
      loadYouTubeEmbeds();
    }
    if (tabName === 'loyalty') {
      loadTabTemplate('loyalty').then(() => {
        if (typeof initLoyaltyCalculator === 'function') initLoyaltyCalculator();
      });
    }
  }

  function switchTab(tabName, force = false) {
    if (!force && tabName === _lastTab) return;

    const targetSection = document.getElementById(`${tabName}Section`);

    tabPanels.forEach((sec) => {
      if (sec) sec.classList.add('hidden');
    });
    if (comboFooterBar) comboFooterBar.classList.add('hidden');

    document.querySelectorAll('.tab-pill').forEach((btn) => btn.classList.replace('tab-pill-active', 'tab-pill-inactive'));
    const activeBtn = document.getElementById(TAB_BTN_IDS[tabName] || `tab${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`);
    if (activeBtn) {
      activeBtn.classList.replace('tab-pill-inactive', 'tab-pill-active');
      requestAnimationFrame(() => keepActiveTabInView(activeBtn));
    }

    if (targetSection) targetSection.classList.remove('hidden');

    if (tabName === 'manual' || tabName === 'generator') {
      if (globalToggleRow) globalToggleRow.classList.remove('hidden');
    } else if (globalToggleRow) {
      globalToggleRow.classList.add('hidden');
    }

    if (tabName === 'manual' && comboFooterBar) {
      comboFooterBar.classList.remove('hidden');
    }

    document.body.classList.toggle('tab-manual-active', tabName === 'manual');
    document.body.classList.toggle('tab-combo-active', tabName === 'manual' || tabName === 'generator');

    onTabActivated(tabName);
    _lastTab = tabName;
  }
  window.vtsSwitchTab = switchTab;
  initKeyboardShortcuts({ switchTab });
  wireFilterSets();
  wireGeneratorSkinToggle();
  wireGeneratorSkinNudge();

  const genSelectAllBtn = document.getElementById('genSelectAllBtn');
  const genClearAllBtn  = document.getElementById('genClearAllBtn');
  const genResetFiltersBtn = document.getElementById('genResetFiltersBtn');

  if (genSelectAllBtn) {
    genSelectAllBtn.onclick = selectVisibleGeneratorHeroes;
  }

  if (genClearAllBtn) {
    genClearAllBtn.onclick = () => {
      generatorSelectedHeroes.clear();
      renderGeneratorHeroes(syncGeneratorControlState());
      markGeneratorSelectionChanged({ immediate: true });
    };
  }

  if (genResetFiltersBtn) {
    genResetFiltersBtn.onclick = resetGeneratorFilters;
  }

  if (saveComboBtn) saveComboBtn.onclick = saveCombo;
  
  if (clearComboBtn) {
    clearComboBtn.onclick = () => {
      setCurrentCombo([null, null, null]);
      document.querySelectorAll('.combo-slot')
        .forEach((slot, i) => updateComboSlotDisplay(slot, null, i));
      updateManualComboScore();
    };
  }
  
  if (generateCombosBtn) generateCombosBtn.onclick = generateBestCombos;
  
  const generateRandomBtn = document.getElementById('generateRandomBtn');
  if (generateRandomBtn) generateRandomBtn.onclick = generateRandomCombos;

  if (downloadCombosBtn) {
    downloadCombosBtn.onclick = () => {
      const t = translations[currentLanguage] || translations.en;
      if (!savedCombosCache || !savedCombosCache.length) {
        showAboModal(t.noCombosMessage || 'No combos saved yet!');
        return;
      }
      // Build combo data format compatible with canvas renderer
      const comboData = savedCombosCache.map((heroes, idx) => {
        const info = getComboRankInfo(heroes);
        return { heroes, displayScore: info ? info.score : 'â€”' };
      });
      downloadComboImage(comboData, t.lastBestCombosTitle || 'Last Best Combos', 'vts-last-best-combos.png');
    };
  }

  if (shareAllCombosBtn) {
    shareAllCombosBtn.onclick = async () => {
      const t = translations[currentLanguage] || translations.en;
      if (!savedCombosCache.length) {
        showAboModal(t.noCombosMessage || 'No combos saved yet!');
        return;
      }

      let text = `${t.lastBestCombosTitle || 'Last Best Combos'}\n\n`;
      savedCombosCache.forEach((heroes, idx) => {
        const info = getComboRankInfo(heroes);
        const scoreText = info ? ` (Score: ${info.score}, #${info.rank})` : '';
        text += `${idx + 1}. ${heroes.join(' / ')}${scoreText}\n`;
      });

      try {
        if (navigator.share) {
          await navigator.share({ text });
        } else if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(text);
          showAboModal(t.shareCombosCopied || 'Combos copied to clipboard. You can paste them anywhere.');
        } else {
          showAboModal(text);
        }
      } catch (err) {
        console.error(err);
      }
    };
  }

  if (downloadGeneratorBtn) {
    downloadGeneratorBtn.onclick = () => {
      const t = translations[currentLanguage] || translations.en;
      if (!lastGeneratedCombos || !lastGeneratedCombos.length) {
        showAboModal(t.generatorNoCombosAvailable || 'No ranked combos found.');
        return;
      }
      downloadComboImage(lastGeneratedCombos, t.generatorTitle || 'Best Combos', 'vts-generator-results.png');
    };
  }
  switchTab('generator', true);
}

// --- TRANSLATIONS / TEXT ---
function updateTextContent() {
  const t = translations[currentLanguage] || translations.en;
  
  // RTL support for Arabic
  document.documentElement.dir = (currentLanguage === 'ar') ? 'rtl' : 'ltr';
  document.documentElement.lang = currentLanguage;
  if (languageSelect) languageSelect.value = currentLanguage;

  const idMap = {
    'appTitle': t.appTitle,
    'betaNote': t.betaNote,
    'tabManual': t.tabManual,
    'tabGenerator': t.tabGenerator,
    'tabLoyalty': t.tabLoyalty,
    'tabYouTube': t.tabYouTube || 'YouTube',
    'tabEdenMap': t.tabEdenMap || 'Eden Map',
    'tabStrife': t.tabStrife || 'Strife over Dragon',
    'tabHeroes': t.tabHeroes || 'Hero Atlas',
    'tabResearch': t.tabResearch || 'Research',
    'tabOcrDashboard': t.tabOcrDashboard || 'VTS Admin',
    'researchTitle': t.researchTitle,
    'researchDesc': t.researchDesc,
    'filterBySeasonTitle': t.filterBySeasonTitle,
    'availableHeroesTitle': t.availableHeroesTitle,
    'createComboTitle': t.createComboTitle,
    'lastBestCombosTitle': t.lastBestCombosTitle,
    'noCombosMessage': t.noCombosMessage,
    'genToolTitle': t.generatorTitle,
    'genIntroText': t.generatorIntro,
    'genFilterTitle': t.filterBySeasonTitle,
    'genSelectTitle': t.genSelectTitle,
    'calcLoyaltyBtn': t.calcUpgradesBtn,
    'saveComboBtn': t.saveComboBtn,
    'clearComboBtn': t.clearComboBtn,
    'downloadCombosBtn': t.downloadCombosBtn,
    'shareAllCombosBtn': t.shareAllCombosBtn,
    'genSelectAllBtn': t.generatorSelectAll,
    'genClearAllBtn': t.generatorClearAll,
    'generateCombosBtn': t.generatorGenerateBtn,
    'downloadGeneratorBtn': t.generatorDownloadBtn,
    'generateRandomBtn': t.generatorRandomBtn
  };

  for (const [id, text] of Object.entries(idMap)) {
    const el = document.getElementById(id);
    if (el && text) {
      el.textContent = text.replace('{version}', APP_VERSION);
    }
  }

  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (t[key]) {
      el.textContent = t[key].replace('{version}', APP_VERSION);
    }
  });

  document.querySelectorAll('[data-i18n-ph]').forEach(el => {
    const key = el.getAttribute('data-i18n-ph');
    if (t[key]) {
      el.placeholder = t[key].replace('{version}', APP_VERSION);
    }
  });

  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    if (t[key]) el.title = t[key].replace('{version}', APP_VERSION);
  });
  syncGameClockTitles();

  document.querySelectorAll('[data-i18n-label]').forEach(el => {
    const key = el.getAttribute('data-i18n-label');
    if (t[key]) el.label = t[key].replace('{version}', APP_VERSION);
  });

  document.querySelectorAll('[data-i18n-aria]').forEach(el => {
    const key = el.getAttribute('data-i18n-aria');
    if (t[key]) el.setAttribute('aria-label', t[key].replace('{version}', APP_VERSION));
  });

  updateAllSeasonCatchupHints();
  window.dispatchEvent(new CustomEvent('edenLanguageUpdate'));

  applySeo(currentLanguage);

  updateManualComboScore();
  if (ENABLE_RESEARCH_FEATURE && document.getElementById('techListContainer') && !researchSection?.classList.contains('hidden')) {
    loadResearchModule()
      .then((mod) => mod.renderTechList())
      .catch((err) => console.warn('[research] refresh failed:', err));
  }
}


// --- Tab scroll buttons ---
function initTabScroll() {
  const scrollContainer = document.getElementById('tabNavScroll');
  const leftBtn = document.getElementById('tabScrollLeft');
  const rightBtn = document.getElementById('tabScrollRight');
  if (!scrollContainer) return;

  const scrollStep = () => {
    const cardWidth = scrollContainer.querySelector('.tab-pill')?.offsetWidth || 100;
    return cardWidth + 12;
  };

  leftBtn?.addEventListener('click', () => {
    scrollContainer.scrollBy({ left: -scrollStep(), behavior: 'smooth' });
  });
  rightBtn?.addEventListener('click', () => {
    scrollContainer.scrollBy({ left: scrollStep(), behavior: 'smooth' });
  });

  const checkOverflow = () => {
    const hasOverflow = scrollContainer.scrollWidth > scrollContainer.clientWidth;
    if (leftBtn && rightBtn) {
      leftBtn.style.display = hasOverflow ? 'flex' : 'none';
      rightBtn.style.display = hasOverflow ? 'flex' : 'none';
    }
    keepActiveTabInView(scrollContainer.querySelector('.tab-pill-active'), 'auto');
  };
  window.addEventListener('resize', checkOverflow);
  setTimeout(checkOverflow, 100);
}

function keepActiveTabInView(activeBtn, behavior = 'smooth') {
  const scrollContainer = document.getElementById('tabNavScroll');
  if (!scrollContainer || !activeBtn) return;

  const containerRect = scrollContainer.getBoundingClientRect();
  const activeRect = activeBtn.getBoundingClientRect();
  const safeInset = 16;
  let delta = 0;

  if (activeRect.left < containerRect.left + safeInset) {
    delta = activeRect.left - containerRect.left - safeInset;
  } else if (activeRect.right > containerRect.right - safeInset) {
    delta = activeRect.right - containerRect.right + safeInset;
  }

  if (Math.abs(delta) > 1) {
    scrollContainer.scrollBy({ left: delta, behavior });
  }
}

function initQuickTour() {
  const storageKey = 'vts_quick_tour_done';
  try {
    if (localStorage.getItem(storageKey) === '1') return;
  } catch {}

  const steps = [
    { selector: '#tabManual', title: 'Manual Builder', body: 'Pick three heroes and check their ranked score, counters, and save options.' },
    { selector: '#tabGenerator', title: 'Combo Generator', body: 'Select your owned heroes, then generate your strongest non-overlapping lineups.' },
    { selector: '#tabHeroes', title: 'Hero Atlas', body: 'Browse hero ratings, skills, skins, counters, and top ranked pairings.' },
    { selector: '#tabResearch', title: 'Research', body: 'Plan tech upgrades, compare costs, and keep your research path organized.' },
    { selector: '#tabEdenMap', title: 'Eden Map', body: 'Plan routes, inspect structures, and prepare Eden season movement.' },
    { selector: '#tabStrife', title: 'Strife over Dragon', body: 'Pick a monster and stage to see matchup formations.' },
    { selector: '#tabLoyalty', title: 'Eden Loyalty', body: 'Calculate loyalty upgrades and extraction progress before spending resources.' },
    { selector: '#tabYouTube', title: 'YouTube', body: 'Jump to community videos and learning resources when you want examples.' },
    { selector: '#tabOcrDashboard', title: 'VTS Admin', body: 'Open roster, attack analytics, banner records, and admin review tools.' }
  ].filter(step => document.querySelector(step.selector));
  if (!steps.length) return;

  let index = 0;
  const overlay = document.createElement('div');
  overlay.className = 'quick-tour-overlay hidden';
  overlay.innerHTML = `
    <div class="quick-tour-backdrop"></div>
    <div class="quick-tour-spotlight"></div>
    <section class="quick-tour-card" role="dialog" aria-modal="true" aria-live="polite">
      <div class="quick-tour-kicker"></div>
      <h3 class="quick-tour-title"></h3>
      <p class="quick-tour-body"></p>
      <div class="quick-tour-dots"></div>
      <div class="quick-tour-actions">
        <button type="button" class="quick-tour-skip">Skip tour</button>
        <button type="button" class="quick-tour-next">Next</button>
      </div>
    </section>`;
  document.body.appendChild(overlay);

  const card = overlay.querySelector('.quick-tour-card');
  const spotlight = overlay.querySelector('.quick-tour-spotlight');
  const title = overlay.querySelector('.quick-tour-title');
  const body = overlay.querySelector('.quick-tour-body');
  const kicker = overlay.querySelector('.quick-tour-kicker');
  const dots = overlay.querySelector('.quick-tour-dots');
  const nextBtn = overlay.querySelector('.quick-tour-next');

  function clamp(n, min, max) {
    return Math.min(Math.max(n, min), max);
  }

  function placeTourCard(target) {
    const rect = target.getBoundingClientRect();
    const pad = 8;
    const gap = window.innerWidth >= 1024 ? 10 : 14;
    const margin = 16;
    const isWide = window.innerWidth >= 1024;
    const cardWidth = Math.min(isWide ? 340 : 390, window.innerWidth - margin * 2);
    const spotlightWidth = Math.max(42, Math.min(rect.width + pad * 2, window.innerWidth - margin * 2));
    const spotlightHeight = Math.max(34, Math.min(rect.height + pad * 2, window.innerHeight - margin * 2));

    spotlight.style.left = `${clamp(rect.left - pad, margin, window.innerWidth - spotlightWidth - margin)}px`;
    spotlight.style.top = `${clamp(rect.top - pad, margin, window.innerHeight - spotlightHeight - margin)}px`;
    spotlight.style.width = `${spotlightWidth}px`;
    spotlight.style.height = `${spotlightHeight}px`;
    spotlight.style.borderRadius = `${Math.min(18, Math.max(12, rect.height / 2))}px`;

    card.style.width = `${cardWidth}px`;
    card.style.left = '0px';
    card.style.top = '0px';

    const cardHeight = Math.min(card.offsetHeight || 190, window.innerHeight - margin * 2);
    const canPlaceBelow = rect.bottom + gap + cardHeight <= window.innerHeight - margin;
    const canPlaceAbove = rect.top - gap - cardHeight >= margin;
    const canPlaceRight = rect.right + gap + cardWidth <= window.innerWidth - margin;
    const canPlaceLeft = rect.left - gap - cardWidth >= margin;

    let left = rect.left + rect.width / 2 - cardWidth / 2;
    let top = rect.bottom + gap;

    if (canPlaceBelow) {
      top = rect.bottom + gap;
    } else if (canPlaceAbove) {
      top = rect.top - gap - cardHeight;
    } else if (canPlaceRight) {
      left = rect.right + gap;
      top = rect.top + rect.height / 2 - cardHeight / 2;
    } else if (canPlaceLeft) {
      left = rect.left - gap - cardWidth;
      top = rect.top + rect.height / 2 - cardHeight / 2;
    } else {
      top = window.innerHeight - cardHeight - margin;
    }

    card.style.left = `${clamp(left, margin, window.innerWidth - cardWidth - margin)}px`;
    card.style.top = `${clamp(top, margin, window.innerHeight - cardHeight - margin)}px`;
  }

  function finishTour() {
    overlay.classList.add('hidden');
    document.querySelectorAll('.quick-tour-target').forEach(el => el.classList.remove('quick-tour-target'));
    try { localStorage.setItem(storageKey, '1'); } catch {}
  }

  function renderStep() {
    const step = steps[index];
    const target = document.querySelector(step.selector);
    if (!target) {
      finishTour();
      return;
    }
    document.querySelectorAll('.quick-tour-target').forEach(el => el.classList.remove('quick-tour-target'));
    target.classList.add('quick-tour-target');
    title.textContent = step.title;
    body.textContent = step.body;
    kicker.textContent = `Step ${index + 1} of ${steps.length}`;
    dots.innerHTML = steps.map((_, i) => `<span class="${i === index ? 'active' : ''}"></span>`).join('');
    nextBtn.textContent = index === steps.length - 1 ? 'Done' : 'Next';
    const isTabTarget = target.closest('#tabNavScroll') || target.classList.contains('tab-pill');
    target.scrollIntoView({ behavior: 'auto', block: isTabTarget ? 'nearest' : 'center', inline: 'center' });
    requestAnimationFrame(() => placeTourCard(target));
    window.setTimeout(() => placeTourCard(target), 80);
  }

  overlay.querySelector('.quick-tour-skip')?.addEventListener('click', finishTour);
  overlay.querySelector('.quick-tour-backdrop')?.addEventListener('click', finishTour);
  nextBtn?.addEventListener('click', () => {
    if (index >= steps.length - 1) finishTour();
    else {
      index++;
      renderStep();
    }
  });
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !overlay.classList.contains('hidden')) finishTour();
  });
  window.addEventListener('resize', () => {
    if (!overlay.classList.contains('hidden')) renderStep();
  });

  setTimeout(() => {
    overlay.classList.remove('hidden');
    renderStep();
  }, 900);
}

// --- INITIALIZE EVERYTHING ---
async function startApp() {
    try {
    await safeInit('loadTranslations', () => loadTranslationsForLanguage(currentLanguage));
    await safeInit('updateTextContent', () => updateTextContent());
    safeInit('errorReporting', () => initErrorReporting());
    safeInit('undoToasts', () => initUndoToasts());
    safeInit('whatsNew', () => initWhatsNewBanner(APP_VERSION));
    safeInit('userDataPortability', () => initUserDataPortability());
    safeInit('bugReportWidget', () => initBugReportWidget());
    safeInit('gameClock', () => mountGameClock(document.getElementById('globalGameClock'), { compact: true, showUae: false }));
    await new Promise(r => requestAnimationFrame(r));
    safeInit('renderAvailableHeroes', () => renderAvailableHeroes());
    await new Promise(r => requestAnimationFrame(r));
    safeInit('restoreGeneratorSelection', () => restoreGeneratorSelection());
    safeInit('renderGeneratorHeroes', () => renderGeneratorHeroes(syncGeneratorControlState()));
    safeInit('syncGeneratorSelectedCountBadge', () => syncGeneratorSelectedCountBadge());
    safeInit('wireUIActions', () => wireUIActions());
    safeInit('initTabScroll', () => initTabScroll());

    safeInit('registerServiceWorker', () => registerServiceWorker());
    safeInit('parseComboShareUrl', () => parseComboShareUrl());
    const rosterShare = safeInit('parseRosterShareUrl', () => parseRosterShareUrl());
    if (rosterShare) {
      safeInit('applyRosterShare', () => applyRosterToGenerator(rosterShare, generatorSelectedHeroes));
      markGeneratorSelectionChanged({ immediate: true });
    }

    await safeInit('firebase', async () => {
        const { initFirebase, ensureAnonymousAuth } = await import('./firebase.js');
        const firebase = await initFirebase();
        if (!firebase.configured) return;
        const user = await ensureAnonymousAuth();
        if (user && user.uid) {
            setUserId(user.uid);
        }
        setupFirestoreListener();
        const cloudProfile = await loadPlayerProfileFromCloud();
        if (cloudProfile && cloudProfile.roster) {
          applyRosterToGenerator(cloudProfile.roster, generatorSelectedHeroes);
          markGeneratorSelectionChanged({ immediate: true });
        }
        flushClientErrors();
    });
    safeInit('comments', () => initComments());
    safeInit('quickTour', () => initQuickTour());
    safeInit('keyboardAwareLayout', () => initKeyboardAwareLayout());
    } finally {
        await notifyAppReady();
    }
}

function initKeyboardAwareLayout() {
  if (!window.visualViewport) return;
  const vv = window.visualViewport;
  function sync() {
    const keyboardOpen = vv.height < window.innerHeight * 0.85;
    document.body.classList.toggle('keyboard-open', keyboardOpen);
  }
  vv.addEventListener('resize', sync);
  window.addEventListener('scroll', sync, { passive: true });
  sync();
}

function safeInit(name, fn) {
  try {
    const result = fn();
    if (result && typeof result.catch === 'function') {
      return result.catch(err => {
        console.warn(`[${name}] async init failed:`, err);
        logClientError(`safeInit:${name}`, err);
        if (typeof window.showToast === 'function') {
          const t = translations[currentLanguage] || translations.en;
          window.showToast((t.moduleLoadFailed || '{name} failed to load').replace('{name}', name), 'warn', 3000);
        }
      });
    }
    return result;
  } catch (err) {
    console.warn(`[${name}] init failed:`, err);
    logClientError(`safeInit:${name}`, err);
    if (typeof window.showToast === 'function') {
      const t = translations[currentLanguage] || translations.en;
      window.showToast((t.moduleLoadFailed || '{name} failed to load').replace('{name}', name), 'warn', 3000);
    }
    return undefined;
  }
}

// Fire it up!
window.addEventListener('error', (e) => {
  console.error('[global] Uncaught error:', e.error || e.message);
});
window.addEventListener('unhandledrejection', (e) => {
  console.error('[global] Unhandled promise rejection:', e.reason);
});
if (window.VTS_MAINTENANCE_ACTIVE) {
  document.body?.classList.remove('app-booting');
} else if (typeof startApp === 'function') {
  initAppLoading();
  setupInstallPrompt();
  window.showAboModal = showAboModal;

  // Register UI functions for builder/generator modules
  registerUiFunctions({
    showHeroTooltip,
    moveHeroTooltip,
    hideHeroTooltip,
    forceHideHeroTooltip,
    showAboModal,
  });

  startApp().catch(err => console.error('[global] startApp failed:', err));
} else {
  console.error('[global] startApp not defined â€” module import may have failed');
}
