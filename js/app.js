// js/app.js - Manual + Generator, scoring, no duplicates, image + text export
import {
  translations,
  loadTranslationsForLanguage,
  applyLanguageDirection,
  createLatestLanguageLoader,
} from './translations.js';
globalThis.VTS_TRANSLATIONS = translations;
import { allHeroesData } from './heroes-data.js';
import { mountGameClock, syncGameClockTitles } from './game-time.js';
import { escapeHtml, debounce, installShowToast, resolveIntlLocale } from './utils.js';
import { applySeo } from './seo.js';
import { initAppLoading, notifyAppReady } from './app-loading.js';
import { registerServiceWorker, setupInstallPrompt } from './pwa-register.js';
import { loadPlayerProfileFromCloud, applyRosterToGenerator } from './player-profile.js';
import { parseComboShareUrl } from './combo-share.js';
import { parseRosterShareUrl } from './roster-share.js';
import {
  showHeroTooltip,
  moveHeroTooltip,
  hideHeroTooltip,
  forceHideHeroTooltip,
} from './app-hero-tooltip.js';
import { initUndoToasts } from './app-undo.js';
import { initErrorReporting, logClientError, flushClientErrors } from './app-error-reporting.js';
import { initKeyboardShortcuts } from './app-shortcuts.js';
import { DEBOUNCE_MS, HERO_DRAG_MIME } from './constants.js';
import { comboToolsText } from './i18n/combo-tools/index.js';
import { formatLocaleNumber } from './locale-format.js';

import {
  renderGeneratorHeroes,
  generateBestCombos,
  generateRandomCombos,
  markGeneratorSelectionChanged,
  restoreGeneratorSelection,
  syncGeneratorSelectedCountBadge,
  refreshGeneratorLocalization,
  restoreSharedGeneratorResults,
  lastGeneratedCombos,
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
  setManualSkinsOnly,
  generatorSelectedHeroes,
  getUserId,
  setUserId,
  savedCombosCache,
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
  materialsSection,
  arcadeSection,
  allStarBohSection,
  tabManualBtn,
  tabGeneratorBtn,
  tabLoyaltyBtn,
  tabYouTubeBtn,
  tabResearchBtn,
  tabMaterialsBtn,
  tabHeroesBtn,
  tabEdenMapBtn,
  tabStrifeBtn,
  tabSpecializationBtn,
  tabArcadeBtn,
  tabAllStarBohBtn,
  heroesSection,
  edenMapSection,
  strifeSection,
  specializationSection,
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

let manualModeReady = false;
let manualBuilderModule = null;
let manualBuilderModulePromise = null;
let savedComboCloudReady = false;

function loadManualBuilderModule() {
  if (!manualBuilderModulePromise) {
    manualBuilderModulePromise = import('./app-builder.js')
      .then((module) => {
        manualBuilderModule = module;
        return module;
      })
      .catch((error) => {
        manualBuilderModulePromise = null;
        reportDynamicImportFailure(error);
        throw error;
      });
  }
  return manualBuilderModulePromise;
}

const renderAvailableHeroesDebounced = debounce(() => {
  if (manualModeReady) manualBuilderModule?.renderAvailableHeroes();
}, DEBOUNCE_MS);
const renderGeneratorHeroesDebounced = debounce(
  () => renderGeneratorHeroes(syncGeneratorControlState()),
  DEBOUNCE_MS
);
const HERO_INFO_ENABLED_KEY = 'vts_hero_info_enabled';
const GENERATOR_SKIN_NUDGE_KEY = 'vts_generator_skin_nudge_seen';
const THEME_STORAGE_KEY = 'vts_theme';
const THEME_CHROME_COLORS = { light: '#f8fafc', dark: '#0f172a' };
const THEME_MANIFESTS = { light: 'site-light.webmanifest', dark: 'site.webmanifest' };
let researchModulePromise = null;
let materialModulePromise = null;
let exportModulePromise = null;
let arcadeModulePromise = null;
let loyaltyModulePromise = null;

function reportDynamicImportFailure(error) {
  window.VTS_ASSET_RECOVERY?.reportFailure?.(error, '');
}

function loadResearchModule() {
  if (!researchModulePromise) {
    researchModulePromise = import('./app-research.js?v=20260718_115825').catch((err) => {
      researchModulePromise = null;
      reportDynamicImportFailure(err);
      throw err;
    });
  }
  return researchModulePromise;
}

function loadMaterialModule() {
  if (!materialModulePromise) {
    materialModulePromise = import('./material-calculator.js').catch((err) => {
      materialModulePromise = null;
      reportDynamicImportFailure(err);
      throw err;
    });
  }
  return materialModulePromise;
}

function loadLoyaltyModule() {
  if (!loyaltyModulePromise) {
    loyaltyModulePromise = import('./loyalty-spa.js?v=20260718_115825').catch((error) => {
      loyaltyModulePromise = null;
      reportDynamicImportFailure(error);
      throw error;
    });
  }
  return loyaltyModulePromise;
}

function loadExportModule() {
  if (!exportModulePromise) {
    exportModulePromise = import('./app-export.js?v=20260718_115825').catch((error) => {
      exportModulePromise = null;
      reportDynamicImportFailure(error);
      throw error;
    });
  }
  return exportModulePromise;
}

function loadArcadeModule() {
  if (!arcadeModulePromise) {
    arcadeModulePromise = import('./arcade-spa.js?v=20260718_115825').catch((error) => {
      arcadeModulePromise = null;
      reportDynamicImportFailure(error);
      throw error;
    });
  }
  return arcadeModulePromise;
}

function resolveDroppedHeroName(dataTransfer) {
  const rawName =
    dataTransfer?.getData(HERO_DRAG_MIME) || dataTransfer?.getData('text/plain') || '';
  const heroName = rawName.trim();
  return allHeroesData.some((hero) => hero.name === heroName) ? heroName : '';
}

/* ===== THEME (Dark default + Light) ===== */
function getPreferredTheme() {
  const stored = localStorage.getItem(THEME_STORAGE_KEY) || localStorage.getItem('theme');
  if (stored === 'light' || stored === 'dark') return stored;
  return 'dark';
}

function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === 'light') {
    root.setAttribute('data-theme', 'light');
  } else {
    root.removeAttribute('data-theme');
  }
  const meta =
    document.getElementById('themeColorMeta') || document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute('content', THEME_CHROME_COLORS[theme] || THEME_CHROME_COLORS.dark);
  }
  const manifest =
    document.getElementById('manifestLink') || document.querySelector('link[rel="manifest"]');
  if (manifest) {
    manifest.setAttribute('href', THEME_MANIFESTS[theme] || THEME_MANIFESTS.dark);
  }
  const btn = document.getElementById('themeToggle');
  if (btn) {
    btn.setAttribute('aria-pressed', theme === 'light' ? 'true' : 'false');
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
  const setupToggle = () => {
    const btn = document.getElementById('themeToggle');
    if (!btn || btn.dataset.themeWired) return;
    btn.dataset.themeWired = '1';
    btn.addEventListener('click', () => {
      const current =
        document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
      const next = current === 'light' ? 'dark' : 'light';
      localStorage.setItem(THEME_STORAGE_KEY, next);
      localStorage.removeItem('theme');
      applyTheme(next);
    });
    const currentTheme =
      document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
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
  heroNames.filter(Boolean).forEach((name) => generatorSelectedHeroes.add(name));
  renderGeneratorHeroes(syncGeneratorControlState());
  markGeneratorSelectionChanged({ immediate: true });
  if (typeof window.showToast === 'function') {
    window.showToast(comboToolsText('app.counterHeroesAdded', {}, currentLanguage), 'success');
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
  materials: 'tabMaterials',
  edenMap: 'tabEdenMap',
  strife: 'tabStrife',
  specialization: 'tabSpecialization',
  loyalty: 'tabLoyalty',
  youtube: 'tabYouTube',
  arcade: 'tabArcade',
  allStarBoh: 'tabAllStarBoh',
};

function getHomeNavigationScrollBehavior(preferredBehavior = 'smooth') {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    ? 'auto'
    : preferredBehavior;
}

function syncTabA11yState(activeTabName = '') {
  Object.entries(TAB_BTN_IDS).forEach(([tabName, buttonId]) => {
    const btn = document.getElementById(buttonId);
    const panel = document.getElementById(`${tabName}Section`);
    const selected = tabName === activeTabName;
    if (btn) {
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-selected', selected ? 'true' : 'false');
      btn.setAttribute('aria-pressed', selected ? 'true' : 'false');
      if (panel) btn.setAttribute('aria-controls', panel.id);
    }
    if (panel) {
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-hidden', selected ? 'false' : 'true');
      if (btn) panel.setAttribute('aria-labelledby', buttonId);
    }
  });
}

// --- HERO HOVER TOOLTIP ---
const heroTooltip = document.createElement('div');
heroTooltip.id = 'heroTooltip';
heroTooltip.className =
  'hero-tooltip-shell hero-tooltip-shell--interactive hero-tooltip-shell--hidden hidden';
heroTooltip.style.zIndex = '5000';
document.body.appendChild(heroTooltip);

document.addEventListener(
  'touchstart',
  (e) => {
    if (!e.target.closest('.hero-card') && !heroTooltip.contains(e.target)) {
      hideHeroTooltip();
    }
  },
  { passive: true }
);

// --- OVERLAY STACKING ---
window._overlayStack = 0;

function pushOverlay() {
  window._overlayStack = (window._overlayStack || 0) + 1;
  return 9990 + window._overlayStack;
}

function popOverlay() {
  window._overlayStack = Math.max(0, (window._overlayStack || 1) - 1);
}

window.pushOverlay = pushOverlay;
window.popOverlay = popOverlay;

function showAboModal(message, onConfirm = null) {
  const t = translations[currentLanguage] || translations.en;
  messageText.textContent = message;
  const z = pushOverlay();
  messageBox.style.zIndex = z;
  messageBox.classList.remove('hidden');
  const cleanup = () => {
    messageBox.classList.add('hidden');
    popOverlay();
  };
  if (onConfirm) {
    messageBoxOkBtn.textContent = t.messageBoxConfirm || 'Confirm';
    messageBoxCancelBtn.classList.remove('hidden');
    messageBoxOkBtn.onclick = () => {
      cleanup();
      onConfirm();
    };
    messageBoxCancelBtn.onclick = cleanup;
  } else {
    messageBoxOkBtn.textContent = t.messageBoxOk || 'OK';
    messageBoxCancelBtn.classList.add('hidden');
    messageBoxOkBtn.onclick = cleanup;
  }
}

// --- TOUCH DRAG & RENDER MOVED TO MODULAR FILES ---
const DEFAULT_STATE_FILTER_VALUES = ['free', 'paid'];
const DEFAULT_TROOP_FILTER_VALUES = ['All'];

function syncCheckboxValues(container, values) {
  if (!container) return;
  const wanted = new Set(values.map((v) => String(v).toLowerCase()));
  container.querySelectorAll('input[type="checkbox"]').forEach((input) => {
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
  const targetId =
    container.id === 'seasonFilters'
      ? 'seasonCatchupHint'
      : container.id === 'generatorSeasonFilters'
        ? 'generatorSeasonCatchupHint'
        : '';
  if (!targetId) return;
  const el = document.getElementById(targetId);
  if (!el) return;
  const items = getSeasonCatchupItems(getCheckedValues(container));
  el.innerHTML = items
    .map(
      (item) => `
    <span class="season-catchup-card season-catchup-card--${escapeHtml(item.season.toLowerCase())}">
      <span class="season-catchup-badge">${escapeHtml(item.season)}</span>
      <span class="season-catchup-copy">
        <strong>${escapeHtml(item.title)}</strong>
        <span>${escapeHtml(item.body)}</span>
      </span>
    </span>
  `
    )
    .join('');
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
      container.querySelectorAll('input[type="checkbox"]').forEach((input) => {
        input.checked = input === changedInput;
      });
    } else if (changedValue !== 'all' && changedInput.checked) {
      const allInput = Array.from(container.querySelectorAll('input[type="checkbox"]')).find(
        (input) => input.value.toLowerCase() === 'all'
      );
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
  const generatorSeasonFilters =
    document.getElementById('generatorSeasonFilters') || genSeasonFiltersEl;
  const generatorStateFilters =
    document.getElementById('generatorStateFilters') || genStateFiltersEl;
  const generatorTroopFilters =
    document.getElementById('generatorTroopFilters') || genTroopFiltersEl;

  wireFilterControls(manualSeasonFilters, () => {
    setSelectedSeasons(readSeasonFilterSelection(manualSeasonFilters));
    updateSeasonCatchupHint(manualSeasonFilters);
    if (manualModeReady) manualBuilderModule?.renderAvailableHeroes();
  });

  wireFilterControls(manualStateFilters, () => {
    setSelectedStates(readStateFilterSelection(manualStateFilters));
    if (manualModeReady) manualBuilderModule?.renderAvailableHeroes();
  });

  wireFilterControls(manualTroopFilters, (input) => {
    setSelectedTypes(readTroopFilterSelection(manualTroopFilters, input));
    if (manualModeReady) manualBuilderModule?.renderAvailableHeroes();
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

function syncManualSkinMode() {
  const manualSkinToggle = document.getElementById('manualSkinToggle');
  setManualSkinsOnly(!!manualSkinToggle?.checked);
  if (manualModeReady) manualBuilderModule?.renderAvailableHeroes();
  document.querySelectorAll('.combo-slot').forEach((slot, idx) => {
    manualBuilderModule?.updateComboSlotDisplay(slot, currentCombo[idx], idx);
  });
}

function wireManualSkinToggle() {
  const manualSkinToggle = document.getElementById('manualSkinToggle');
  if (!manualSkinToggle || manualSkinToggle.dataset.skinToggleWired === '1') return;
  manualSkinToggle.dataset.skinToggleWired = '1';
  syncManualSkinMode();
  manualSkinToggle.addEventListener('change', syncManualSkinMode);
}

function renderManualLoadError() {
  if (!manualSection || manualSection.querySelector('.manual-builder-load-error')) return;
  const t = translations[currentLanguage] || translations.en;
  const error = document.createElement('div');
  error.className = 'tab-load-error manual-builder-load-error';
  error.setAttribute('role', 'alert');
  const message = document.createElement('span');
  message.textContent = (t.moduleLoadFailed || '{name} failed to load').replace(
    '{name}',
    t.tabManual || 'Manual'
  );
  const retry = document.createElement('button');
  retry.type = 'button';
  retry.className = 'tab-load-error-link';
  retry.textContent = t.edenX1Retry || 'Retry';
  retry.addEventListener('click', () => {
    error.remove();
    void initManualMode();
  });
  error.append(message, document.createTextNode(' '), retry);
  manualSection.prepend(error);
  requestAnimationFrame(() => retry.focus({ preventScroll: true }));
}

async function initManualMode() {
  if (manualModeReady) return;
  try {
    const builder = await loadManualBuilderModule();
    if (manualModeReady) return;
    manualSection?.querySelector('.manual-builder-load-error')?.remove();
    manualModeReady = true;
    wireManualSkinToggle();
    document.querySelectorAll('.combo-slot').forEach((slot, index) => {
      builder.updateComboSlotDisplay(slot, currentCombo[index], index);
      slot.addEventListener('dragover', (event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
        slot.classList.add('drag-over');
      });
      slot.addEventListener('dragleave', () => slot.classList.remove('drag-over'));
      slot.addEventListener('drop', (event) => {
        event.preventDefault();
        slot.classList.remove('drag-over');
        const heroName = resolveDroppedHeroName(event.dataTransfer);
        if (heroName) builder.placeHeroInSlot(slot, heroName, index);
      });
    });
    builder.setupTouchDragForManualBuilder();
    builder.setupKeyboardComboSlots();
    builder.renderAvailableHeroes();
    builder.updateManualComboScore();
    if (savedComboCloudReady) await builder.setupFirestoreListener();
  } catch (error) {
    console.error('Manual builder failed to load', error);
    manualModeReady = false;
    renderManualLoadError();
  }
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
  if (toggle) toggle.checked = enabled;
  document.body.classList.toggle('hide-hero-info', !enabled);
  const track = document.querySelector('#heroInfoToggleLabel .toggle-track');
  const thumb = document.querySelector('#heroInfoToggleLabel .toggle-thumb');
  if (track) track.classList.toggle('checked', enabled);
  if (thumb) thumb.classList.toggle('checked', enabled);
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
  const searchQuery = (document.getElementById('generatorHeroSearch')?.value || '')
    .trim()
    .toLowerCase();
  return getGeneratorHeroPool(options.skinsOnly)
    .filter((h) => heroMatchesFilters(h, options.seasons, options.states, options.types))
    .filter((h) => !searchQuery || h.name.toLowerCase().includes(searchQuery));
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
    visibleHeroes.forEach((h) => generatorSelectedHeroes.add(h.name));
    renderGeneratorHeroes(options);
    markGeneratorSelectionChanged({ immediate: true });
  };

  if (!visibleHeroes.length) {
    showAboModal(comboToolsText('app.noVisibleHeroes', {}, currentLanguage));
    return;
  }

  selectAll();
}

// --- UI WIRING ---
const requestAppLanguage = createLatestLanguageLoader((lang) => {
  const loadedLanguage = translations[lang] ? lang : 'en';
  setCurrentLanguage(loadedLanguage);
  applyLanguageDirection(loadedLanguage);
  updateTextContent();
  if (manualModeReady) {
    manualBuilderModule?.renderAvailableHeroes();
    manualBuilderModule?.refreshManualComboLocalization?.();
  }
  renderGeneratorHeroes(syncGeneratorControlState());
  refreshGeneratorLocalization();
  if (typeof window.vtsRenderStrifeTool === 'function') window.vtsRenderStrifeTool();
});

function wireUIActions({ preserveInitialHash = false } = {}) {
  // === TAB BUTTON HANDLERS ===
  const tabs = [
    { btn: tabManualBtn, name: 'manual' },
    { btn: tabGeneratorBtn, name: 'generator' },
    { btn: tabHeroesBtn, name: 'heroes' },
    { btn: tabResearchBtn, name: 'research' },
    { btn: tabMaterialsBtn, name: 'materials' },
    { btn: tabEdenMapBtn, name: 'edenMap' },
    { btn: tabStrifeBtn, name: 'strife' },
    { btn: tabSpecializationBtn, name: 'specialization' },
    { btn: tabLoyaltyBtn, name: 'loyalty' },
    { btn: tabYouTubeBtn, name: 'youtube' },
    { btn: tabArcadeBtn, name: 'arcade' },
    { btn: tabAllStarBohBtn, name: 'allStarBoh' },
  ];
  const validTabNames = new Set(tabs.map((tab) => tab.name));

  tabs.forEach((tab) => {
    if (tab.btn) {
      tab.btn.addEventListener('click', () =>
        switchTab(tab.name, false, { scrollToSection: true })
      );
    }
  });
  wireFilterSets();
  wireGeneratorSkinToggle();
  wireGeneratorSkinNudge();
  wireHeroSearchInputs();

  if (languageSelect) {
    languageSelect.onchange = async (e) => {
      const requestedLanguage = e.target.value || 'en';
      localStorage.setItem('vts_hero_lang', requestedLanguage);
      await requestAppLanguage(requestedLanguage);
    };
  }

  const heroInfoToggle = document.getElementById('heroInfoToggle');
  if (heroInfoToggle && heroInfoToggle.dataset.heroInfoWired !== '1') {
    heroInfoToggle.dataset.heroInfoWired = '1';
    const storedHeroInfo = localStorage.getItem(HERO_INFO_ENABLED_KEY);
    applyHeroInfoPanelState(
      storedHeroInfo === null ? heroInfoToggle.checked : storedHeroInfo !== '0'
    );

    heroInfoToggle.addEventListener('change', (e) => {
      applyHeroInfoPanelState(e.target.checked);
    });
  }

  let _lastTab = null;
  let _edenMapReady = false;
  let _edenMapBooting = false;
  let _heroesTabReady = false;
  let _heroesTabBooting = false;
  let _researchReady = false;
  let _researchBooting = false;
  let _materialsReady = false;
  let _materialsBooting = false;
  let _strifeReady = false;
  let _strifeBooting = false;
  let _specializationReady = false;
  let _specializationBooting = false;
  let _youtubeReady = false;
  let _youtubeBooting = false;
  let _arcadeReady = false;
  let _arcadeBooting = false;
  let _allStarBohReady = false;
  let _allStarBohBooting = false;

  const tabPanels = [
    manualSection,
    generatorSection,
    heroesSection,
    researchSection,
    materialsSection,
    edenMapSection,
    strifeSection,
    specializationSection,
    loyaltySection,
    youtubeSection,
    arcadeSection,
    allStarBohSection,
  ];

  const _tabTemplatesLoaded = {};

  function renderTabLoadError(root, tabName) {
    if (!root) return;
    const t = translations[currentLanguage] || translations.en;
    const tabLabel = tabs.find((tab) => tab.name === tabName)?.btn?.textContent?.trim() || tabName;
    const message = (t.moduleLoadFailed || '{name} failed to load').replace('{name}', tabLabel);
    const error = document.createElement('div');
    error.className = 'tab-load-error';
    error.setAttribute('role', 'alert');
    const messageText = document.createElement('span');
    messageText.textContent = message;
    const retry = document.createElement('button');
    retry.type = 'button';
    retry.className = 'tab-load-error-link';
    retry.textContent = t.edenX1Retry || 'Retry';
    retry.addEventListener('click', () => window.location.reload());
    error.append(messageText, document.createTextNode(' '), retry);
    root.replaceChildren(error);
    requestAnimationFrame(() => retry.focus({ preventScroll: true }));
  }

  async function loadTabTemplate(tabName) {
    const section = document.getElementById(`${tabName}Section`);
    if (!section || _tabTemplatesLoaded[tabName]) return;
    const src = section.dataset.tabSrc;
    if (!src) {
      _tabTemplatesLoaded[tabName] = true;
      return;
    }
    try {
      const res = await fetch(src);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();
      section.innerHTML = html;
      _tabTemplatesLoaded[tabName] = true;
      updateTextContent();
    } catch (err) {
      console.warn(`[Tab] Failed to load template for ${tabName}:`, err);
      renderTabLoadError(section, tabName);
    }
  }

  function isDynamicImportLoadFailure(err) {
    const message = String(err?.message || err || '');
    return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(
      message
    );
  }

  function recoverFromStaleAssetGraph(reason) {
    return window.VTS_ASSET_RECOVERY?.reportFailure?.(reason, '') || false;
  }

  function onTabActivated(tabName) {
    if (tabName === 'manual') {
      initManualMode();
    }
    if (tabName === 'edenMap' && !_edenMapReady && !_edenMapBooting) {
      _edenMapBooting = true;
      loadTabTemplate('edenMap').then(() => {
        const root = document.getElementById('edenMapRoot');
        root?.classList.add('eden-map-loading');
        import('./eden-map.js?v=20260718_115825')
          .then((mod) => mod.bootEdenMapPlanner())
          .then(() => {
            _edenMapReady = true;
          })
          .catch((err) => {
            console.error('Eden map failed to load', err);
            _edenMapBooting = false;
            if (isDynamicImportLoadFailure(err)) {
              recoverFromStaleAssetGraph(err);
              return;
            }
            if (typeof window.showToast === 'function') {
              const t = translations[currentLanguage] || translations.en;
              window.showToast(
                t.edenMapLoadFailed || 'Eden map failed to load. Refresh and try again.',
                'error',
                4000
              );
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
      import('./app-hero-atlas.js?v=20260718_115825')
        .then((mod) => {
          mod.renderHeroesTab();
          _heroesTabReady = true;
        })
        .catch((err) => {
          _heroesTabBooting = false;
          console.error('Hero Atlas failed to load', err);
          if (typeof window.showToast === 'function') {
            const t = translations[currentLanguage] || translations.en;
            window.showToast(
              t.moduleLoadFailed?.replace('{name}', 'Hero Atlas') || 'Hero Atlas failed to load.',
              'error',
              4000
            );
          }
        });
    }
    if (tabName === 'research' && !_researchReady) {
      if (_researchBooting) return;
      _researchBooting = true;
      loadResearchModule()
        .then(async (mod) => {
          await mod.initResearchCalculator();
          _researchReady = true;
        })
        .catch((err) => {
          _researchBooting = false;
          console.error('Research failed to load', err);
          if (typeof window.showToast === 'function') {
            const t = translations[currentLanguage] || translations.en;
            window.showToast(
              t.moduleLoadFailed?.replace('{name}', 'Research') || 'Research failed to load.',
              'error',
              4000
            );
          }
        });
    }
    if (tabName === 'materials' && !_materialsReady) {
      if (_materialsBooting) return;
      _materialsBooting = true;
      loadMaterialModule()
        .then(async (mod) => {
          await mod.initMaterialCalculator();
          _materialsReady = true;
        })
        .catch((err) => {
          console.error('DM Materials failed to load', err);
          if (isDynamicImportLoadFailure(err)) {
            recoverFromStaleAssetGraph(err);
            return;
          }
          const root = document.getElementById('materialCalculatorRoot');
          renderTabLoadError(root, 'materials');
          if (typeof window.showToast === 'function') {
            const t = translations[currentLanguage] || translations.en;
            window.showToast(
              t.moduleLoadFailed?.replace('{name}', 'DM Materials') ||
                'DM Materials failed to load.',
              'error',
              4000
            );
          }
        })
        .finally(() => {
          _materialsBooting = false;
        });
    }
    if (tabName === 'strife' && !_strifeReady) {
      if (_strifeBooting) return;
      _strifeBooting = true;
      import('./app-strife.js?v=20260718_115825')
        .then((mod) => mod.initStrifeTool())
        .then(() => {
          _strifeReady = true;
        })
        .catch((err) => {
          _strifeBooting = false;
          console.error('Strife tool failed to load', err);
          if (typeof window.showToast === 'function') {
            const t = translations[currentLanguage] || translations.en;
            window.showToast(
              t.moduleLoadFailed?.replace('{name}', 'Strife') || 'Strife failed to load.',
              'error',
              4000
            );
          }
        });
    }
    if (tabName === 'specialization' && !_specializationReady) {
      if (_specializationBooting) return;
      _specializationBooting = true;
      import('./app-specialization.js')
        .then((mod) => mod.initSpecializationTool())
        .then(() => {
          _specializationReady = true;
        })
        .catch((err) => {
          _specializationBooting = false;
          console.error('Specialization tool failed to load', err);
          if (typeof window.showToast === 'function') {
            const t = translations[currentLanguage] || translations.en;
            window.showToast(
              t.moduleLoadFailed?.replace('{name}', 'Specialization') ||
                'Specialization failed to load.',
              'error',
              4000
            );
          }
        });
    }
    if (tabName === 'youtube' && !_youtubeReady && !_youtubeBooting) {
      _youtubeBooting = true;
      import('./youtube-v14.js?v=20260718_115825')
        .then((mod) => {
          mod.initYouTubeLibrary();
          _youtubeReady = true;
        })
        .catch((err) => {
          console.error('YouTube guide library failed to load', err);
          if (typeof window.showToast === 'function') {
            const t = translations[currentLanguage] || translations.en;
            window.showToast(
              t.moduleLoadFailed?.replace('{name}', 'YouTube') ||
                'YouTube guide library failed to load.',
              'error',
              4000
            );
          }
        })
        .finally(() => {
          _youtubeBooting = false;
        });
    }
    if (tabName === 'arcade' && !_arcadeReady && !_arcadeBooting) {
      _arcadeBooting = true;
      loadArcadeModule()
        .then((module) => {
          module.initArcadeSpa();
          _arcadeReady = true;
        })
        .catch((error) => {
          console.error('Arcade failed to load', error);
          renderTabLoadError(arcadeSection, 'arcade');
        })
        .finally(() => {
          _arcadeBooting = false;
        });
    }
    if (tabName === 'allStarBoh' && !_allStarBohReady && !_allStarBohBooting) {
      _allStarBohBooting = true;
      loadTabTemplate('allStarBoh')
        .then(() => import('./all-star-boh-bootstrap.js'))
        .then((module) => module.bootAllStarBohTab())
        .then(() => {
          _allStarBohReady = true;
        })
        .catch((error) => {
          console.error('All-Star BoH member hub failed to load', error);
          if (isDynamicImportLoadFailure(error)) {
            recoverFromStaleAssetGraph(error);
            return;
          }
          renderTabLoadError(allStarBohSection, 'allStarBoh');
        })
        .finally(() => {
          _allStarBohBooting = false;
        });
    }
    if (tabName === 'loyalty') {
      Promise.all([loadTabTemplate('loyalty'), loadLoyaltyModule()])
        .then(([, module]) => module.initLoyaltyCalculator())
        .catch((error) => {
          console.error('Loyalty calculator failed to load', error);
          renderTabLoadError(loyaltySection, 'loyalty');
        });
    }
  }

  function scrollToTabStart(targetSection) {
    if (!targetSection) return;
    const nav = document.querySelector('.tool-nav-shell');
    const navStyle = nav ? window.getComputedStyle(nav) : null;
    const navIsSticky = navStyle?.position === 'sticky';
    const navOffset = navIsSticky ? nav.getBoundingClientRect().height + 14 : 10;
    const top = Math.max(0, targetSection.getBoundingClientRect().top + window.scrollY - navOffset);
    window.scrollTo({ top, behavior: getHomeNavigationScrollBehavior() });
  }

  function switchTab(tabName, force = false, options = {}) {
    if (!force && tabName === _lastTab) return;

    const targetSection = document.getElementById(`${tabName}Section`);

    tabPanels.forEach((sec) => {
      if (sec) sec.classList.add('hidden');
    });
    if (comboFooterBar) comboFooterBar.classList.add('hidden');

    document.querySelectorAll('.tab-pill').forEach((btn) => {
      btn.classList.replace('tab-pill-active', 'tab-pill-inactive');
    });
    const activeBtn = document.getElementById(
      TAB_BTN_IDS[tabName] || `tab${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`
    );
    if (activeBtn) {
      activeBtn.classList.replace('tab-pill-inactive', 'tab-pill-active');
      requestAnimationFrame(() => keepActiveTabInView(activeBtn));
    }
    syncTabA11yState(tabName);

    if (targetSection) {
      targetSection.classList.remove('hidden');
      window.VTSLoaderV14?.enhance?.(targetSection);
    }
    document.documentElement.removeAttribute('data-initial-tab-pending');

    if (tabName === 'manual' || tabName === 'generator') {
      if (globalToggleRow) globalToggleRow.classList.remove('hidden');
    } else if (globalToggleRow) {
      globalToggleRow.classList.add('hidden');
    }

    if (tabName === 'manual' && comboFooterBar) {
      comboFooterBar.classList.remove('hidden');
    }

    document.body.dataset.activeTab = tabName;
    document.body.classList.toggle('tab-manual-active', tabName === 'manual');
    document.body.classList.toggle(
      'tab-combo-active',
      tabName === 'manual' || tabName === 'generator'
    );
    document.body.classList.toggle('tab-strife-active', tabName === 'strife');
    document.body.classList.toggle(
      'tab-specialization-active',
      tabName === 'specialization'
    );

    onTabActivated(tabName);
    _lastTab = tabName;
    if (options.scrollToSection) {
      requestAnimationFrame(() => scrollToTabStart(targetSection));
    }
    try {
      if (!options.preserveHash && window.location.hash !== '#' + tabName) {
        history.replaceState({ tab: tabName }, '', '#' + tabName);
      }
    } catch {}
  }
  window.vtsSwitchTab = switchTab;
  window.vtsTabNames = validTabNames;
  document.querySelectorAll('[data-footer-tab]').forEach((link) => {
    if (link.dataset.footerTabBound) return;
    link.dataset.footerTabBound = '1';
    link.addEventListener('click', (event) => {
      const tabName = link.dataset.footerTab || '';
      if (!validTabNames.has(tabName)) return;
      event.preventDefault();
      switchTab(tabName, true, { scrollToSection: true });
    });
  });
  initKeyboardShortcuts({ switchTab });
  wireFilterSets();
  wireGeneratorSkinToggle();
  wireGeneratorSkinNudge();

  const genSelectAllBtn = document.getElementById('genSelectAllBtn');
  const genClearAllBtn = document.getElementById('genClearAllBtn');
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

  if (saveComboBtn) {
    saveComboBtn.onclick = async () => {
      const builder = await loadManualBuilderModule();
      await builder.saveCombo();
    };
  }

  if (clearComboBtn) {
    clearComboBtn.onclick = async () => {
      const builder = await loadManualBuilderModule();
      setCurrentCombo([null, null, null]);
      document
        .querySelectorAll('.combo-slot')
        .forEach((slot, i) => builder.updateComboSlotDisplay(slot, null, i));
      builder.updateManualComboScore();
    };
  }

  if (generateCombosBtn) generateCombosBtn.onclick = generateBestCombos;

  const generateRandomBtn = document.getElementById('generateRandomBtn');
  if (generateRandomBtn) generateRandomBtn.onclick = generateRandomCombos;

  if (downloadCombosBtn) {
    downloadCombosBtn.onclick = async () => {
      const t = translations[currentLanguage] || translations.en;
      if (!savedCombosCache || !savedCombosCache.length) {
        showAboModal(t.noCombosMessage || 'No combos saved yet!');
        return;
      }
      // Build combo data format compatible with canvas renderer
      const comboData = savedCombosCache.map((heroes, idx) => {
        const info = getComboRankInfo(heroes);
        return { heroes, displayScore: info ? info.score : '—' };
      });
      const { downloadComboImage } = await loadExportModule();
      await downloadComboImage(
        comboData,
        t.lastBestCombosTitle || 'Last Best Combos',
        'vts-last-best-combos.png'
      );
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
        const scoreText = info
          ? ` (${t.generatorScoreLabel || 'Score:'} ${formatLocaleNumber(info.score, currentLanguage, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}, #${formatLocaleNumber(info.rank, currentLanguage)})`
          : '';
        text += `${formatLocaleNumber(idx + 1, currentLanguage)}. ${heroes.join(' / ')}${scoreText}\n`;
      });

      try {
        if (navigator.share) {
          await navigator.share({ text });
        } else if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(text);
          showAboModal(
            t.shareCombosCopied || 'Combos copied to clipboard. You can paste them anywhere.'
          );
        } else {
          showAboModal(text);
        }
      } catch (err) {
        console.error(err);
      }
    };
  }

  if (downloadGeneratorBtn) {
    downloadGeneratorBtn.onclick = async () => {
      const t = translations[currentLanguage] || translations.en;
      if (!lastGeneratedCombos || !lastGeneratedCombos.length) {
        showAboModal(t.generatorNoCombosAvailable || 'No ranked combos found.');
        return;
      }
      const { downloadComboImage } = await loadExportModule();
      await downloadComboImage(
        lastGeneratedCombos,
        t.generatorTitle || 'Best Combos',
        'vts-generator-results.png'
      );
    };
  }
  const hashTab = window.location.hash?.replace('#', '').split('?')[0];
  const startTab = validTabNames.has(hashTab) ? hashTab : 'generator';
  switchTab(startTab, true, {
    scrollToSection: startTab !== 'generator',
    preserveHash: preserveInitialHash,
  });
}

// --- TRANSLATIONS / TEXT ---
function setLocalizedTextPreservingDecorations(el, text) {
  const normalized = String(text ?? '');
  const nestedLabel = Array.from(el.children || []).find((child) =>
    child.matches?.('[data-i18n], [data-shell-label], [data-tab-label]')
  );

  if (nestedLabel) {
    nestedLabel.textContent = normalized;
    return;
  }

  const directTextNodes = Array.from(el.childNodes || []).filter(
    (node) => node.nodeType === 3 && node.textContent.trim()
  );
  if (directTextNodes.length) {
    directTextNodes[0].textContent = normalized;
    directTextNodes.slice(1).forEach((node) => node.remove());
    return;
  }

  el.textContent = normalized;
}

function updateTextContent() {
  const t = translations[currentLanguage] || translations.en;

  // RTL support for Arabic
  document.documentElement.dir = currentLanguage === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.lang = resolveIntlLocale(currentLanguage);
  if (languageSelect) languageSelect.value = currentLanguage;

  const idMap = {
    appTitle: t.appTitle,
    betaNote: t.betaNote,
    tabManual: t.tabManual,
    tabGenerator: t.tabGenerator,
    tabLoyalty: t.tabLoyalty,
    tabYouTube: t.tabYouTube || 'YouTube',
    tabEdenMap: t.tabEdenMap || 'Eden Map',
    tabStrife: t.tabStrife || 'Strife over Dragon',
    tabSpecialization: t.tabSpecialization || 'Specialization',
    tabHeroes: t.tabHeroes || 'Hero Atlas',
    tabResearch: t.tabResearch || 'Research',
    tabMaterialsLabel: t.tabMaterials || translations.en.tabMaterials,
    researchTitle: t.researchTitle,
    researchDesc: t.researchDesc,
    filterBySeasonTitle: t.filterBySeasonTitle,
    availableHeroesTitle: t.availableHeroesTitle,
    createComboTitle: t.createComboTitle,
    lastBestCombosTitle: t.lastBestCombosTitle,
    noCombosMessage: t.noCombosMessage,
    genToolTitle: t.generatorTitle,
    genIntroText: t.generatorIntro,
    genFilterTitle: t.filterBySeasonTitle,
    genSelectTitle: t.genSelectTitle,
    calcLoyaltyBtn: t.calcUpgradesBtn,
    saveComboBtn: t.saveComboBtn,
    clearComboBtn: t.clearComboBtn,
    downloadCombosBtn: t.downloadCombosBtn,
    shareAllCombosBtn: t.shareAllCombosBtn,
    genSelectAllBtn: t.generatorSelectAll,
    genClearAllBtn: t.generatorClearAll,
    generateCombosBtn: t.generatorGenerateBtn,
    downloadGeneratorBtn: t.generatorDownloadBtn,
    generateRandomBtn: t.generatorRandomBtn,
  };

  for (const [id, text] of Object.entries(idMap)) {
    const el = document.getElementById(id);
    if (el && text) {
      setLocalizedTextPreservingDecorations(el, text.replace('{version}', APP_VERSION));
    }
  }

  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (t[key]) {
      setLocalizedTextPreservingDecorations(el, t[key].replace('{version}', APP_VERSION));
    }
  });

  document.querySelectorAll('[data-i18n-ph]').forEach((el) => {
    const key = el.getAttribute('data-i18n-ph');
    if (t[key]) {
      el.placeholder = t[key].replace('{version}', APP_VERSION);
    }
  });

  document.querySelectorAll('[data-i18n-title]').forEach((el) => {
    const key = el.getAttribute('data-i18n-title');
    if (t[key]) el.title = t[key].replace('{version}', APP_VERSION);
  });
  syncGameClockTitles();

  document.querySelectorAll('[data-i18n-label]').forEach((el) => {
    const key = el.getAttribute('data-i18n-label');
    if (t[key]) el.label = t[key].replace('{version}', APP_VERSION);
  });

  document.querySelectorAll('[data-i18n-aria]').forEach((el) => {
    const key = el.getAttribute('data-i18n-aria');
    if (t[key]) el.setAttribute('aria-label', t[key].replace('{version}', APP_VERSION));
  });

  updateAllSeasonCatchupHints();
  window.dispatchEvent(new CustomEvent('edenLanguageUpdate'));
  window.dispatchEvent(
    new CustomEvent('vts:language-change', { detail: { lang: currentLanguage } })
  );

  applySeo(currentLanguage);

  if (manualModeReady) manualBuilderModule?.updateManualComboScore();
  if (
    ENABLE_RESEARCH_FEATURE &&
    document.getElementById('techListContainer') &&
    !researchSection?.classList.contains('hidden')
  ) {
    loadResearchModule()
      .then((mod) => mod.refreshResearchLocale(currentLanguage))
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
    scrollContainer.scrollBy({
      left: -scrollStep(),
      behavior: getHomeNavigationScrollBehavior(),
    });
  });
  rightBtn?.addEventListener('click', () => {
    scrollContainer.scrollBy({
      left: scrollStep(),
      behavior: getHomeNavigationScrollBehavior(),
    });
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
    scrollContainer.scrollBy({
      left: delta,
      behavior: getHomeNavigationScrollBehavior(behavior),
    });
  }
}

// --- INITIALIZE EVERYTHING ---
async function startApp() {
  try {
    await safeInit('loadTranslations', () => loadTranslationsForLanguage(currentLanguage));
    await safeInit('updateTextContent', () => updateTextContent());
    safeInit('errorReporting', () => initErrorReporting());
    safeInit('undoToasts', () => initUndoToasts());
    safeInit('gameClock', () =>
      mountGameClock(document.getElementById('globalGameClock'), { compact: true, showUae: false })
    );
    await new Promise((r) => requestAnimationFrame(r));
    safeInit('restoreGeneratorSelection', () => restoreGeneratorSelection());
    safeInit('renderGeneratorHeroes', () => renderGeneratorHeroes(syncGeneratorControlState()));
    safeInit('syncGeneratorSelectedCountBadge', () => syncGeneratorSelectedCountBadge());
    // Decode explicit share intent before the initial tab switch can normalize
    // the location hash to #generator.
    const comboShare = safeInit('parseComboShareUrl', () => parseComboShareUrl());
    const rosterShare = safeInit('parseRosterShareUrl', () => parseRosterShareUrl());
    safeInit('wireUIActions', () =>
      wireUIActions({ preserveInitialHash: Boolean(comboShare || rosterShare) })
    );
    safeInit('initTabScroll', () => initTabScroll());

    safeInit('registerServiceWorker', () => registerServiceWorker());
    if (comboShare) {
      const validHeroNames = new Set(allHeroesData.map((hero) => hero.name));
      const validSharedCombos = comboShare.filter((combo) =>
        combo.heroes.every((heroName) => validHeroNames.has(heroName))
      );
      if (validSharedCombos.length) {
        safeInit('renderComboShare', () => restoreSharedGeneratorResults(validSharedCombos));
        window.vtsSwitchTab?.('generator', true, {
          scrollToSection: true,
          preserveHash: true,
        });
      }
    }
    if (rosterShare) {
      const validHeroNames = new Set(allHeroesData.map((hero) => hero.name));
      const validSharedRoster = rosterShare.filter((heroName) => validHeroNames.has(heroName));
      if (validSharedRoster.length) {
        safeInit('applyRosterShare', () =>
          applyRosterToGenerator(validSharedRoster, generatorSelectedHeroes)
        );
        const sharedSeasons = new Set(
          allHeroesData
            .filter((hero) => validSharedRoster.includes(hero.name))
            .map((hero) => hero.season)
        );
        syncCheckboxValues(
          document.getElementById('generatorSeasonFilters') || genSeasonFiltersEl,
          [...sharedSeasons]
        );
        renderGeneratorHeroes(syncGeneratorControlState());
        markGeneratorSelectionChanged({ immediate: true });
        window.vtsSwitchTab?.('generator', true, {
          scrollToSection: true,
          preserveHash: true,
        });
      }
    }

    safeInit('firebase', () => {
      const fn = async () => {
        const { initFirebase, ensureAnonymousAuth } = await import('./firebase.js');
        const firebase = await initFirebase();
        if (!firebase.configured) return;
        const user = await ensureAnonymousAuth();
        if (user && user.uid) {
          setUserId(user.uid);
        }
        savedComboCloudReady = true;
        if (manualModeReady) {
          const builder = await loadManualBuilderModule();
          await builder.setupFirestoreListener();
        }
        const cloudProfile = await loadPlayerProfileFromCloud();
        // An explicit roster share link is the user's current intent. Do not
        // replace it moments later with an asynchronously loaded cloud roster.
        if (!rosterShare && cloudProfile && cloudProfile.roster) {
          applyRosterToGenerator(cloudProfile.roster, generatorSelectedHeroes);
          markGeneratorSelectionChanged({ immediate: true });
        }
        flushClientErrors();
      };
      if (typeof requestIdleCallback === 'function') {
        requestIdleCallback(() => fn(), { timeout: 3000 });
      } else {
        setTimeout(() => fn(), 0);
      }
    });
    safeInit('keyboardAwareLayout', () => initKeyboardAwareLayout());
    window.addEventListener('hashchange', () => {
      const tab = window.location.hash?.replace('#', '').split('?')[0];
      const targetSection = tab ? document.getElementById(`${tab}Section`) : null;
      if (tab && targetSection?.classList.contains('hidden') && window.vtsTabNames?.has?.(tab)) {
        window.vtsSwitchTab?.(tab, true);
      }
    });
  } finally {
    await notifyAppReady();
    window.VTS_ASSET_RECOVERY?.markBootComplete?.();
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
      return result.catch((err) => {
        console.warn(`[${name}] async init failed:`, err);
        logClientError(`safeInit:${name}`, err);
        if (typeof window.showToast === 'function') {
          const t = translations[currentLanguage] || translations.en;
          window.showToast(
            (t.moduleLoadFailed || '{name} failed to load').replace('{name}', name),
            'warn',
            3000
          );
        }
      });
    }
    return result;
  } catch (err) {
    console.warn(`[${name}] init failed:`, err);
    logClientError(`safeInit:${name}`, err);
    if (typeof window.showToast === 'function') {
      const t = translations[currentLanguage] || translations.en;
      window.showToast(
        (t.moduleLoadFailed || '{name} failed to load').replace('{name}', name),
        'warn',
        3000
      );
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

  startApp().catch((err) => console.error('[global] startApp failed:', err));
} else {
  console.error('[global] startApp not defined — module import may have failed');
}
