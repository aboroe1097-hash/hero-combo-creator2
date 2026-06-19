// js/app.js - Manual + Generator, scoring, no duplicates, image + text export
import { translations } from './translations.js';
import { initFirebase, ensureAnonymousAuth, getDb } from './firebase.js';
import { initComments } from './comments.js';
import { rankedCombos } from './combos-db.js';
import { initLoyaltyCalculator } from './loyalty-calculator.js';
import { heroesExtendedData } from './heroes-info.js';
import { techDatabase } from './tech-db.js';
import { mountGameClock, syncGameClockTitles } from './game-time.js';
import { renderCountersToggle, getCounterCount } from './combo-counters.js';
import { escapeHtml, appT } from './utils.js';
import { allHeroesData } from './heroes-data.js';
import { heroBonusPoints } from './hero-bonuses.js';
import { applySeo } from './seo.js';
import { renderTechNodeIconSvg, resolveTechNodeIcon } from './research-node-icons.js';
import { initAppLoading, notifyAppReady } from './app-loading.js?v=20260619_6';
import { registerServiceWorker, setupInstallPrompt } from './pwa-register.js';
import { loadPlayerProfileFromCloud, applyRosterToGenerator } from './player-profile.js';
import { parseComboShareUrl } from './combo-share.js';
import { parseRosterShareUrl } from './roster-share.js';
import { renderHeroesTab, getSynergies, formatSkillText } from './app-hero-atlas.js';
import { downloadComboImage } from './app-export.js';
import { initResearchCalculator, renderTechList, updateGlobalSummary, renderCalculator } from './app-research.js';
import { showHeroTooltip, moveHeroTooltip, hideHeroTooltip, forceHideHeroTooltip } from './app-hero-tooltip.js';

import {
  renderAvailableHeroes,
  updateComboSlotDisplay,
  updateManualComboScore,
  setupTouchDragForManualBuilder,
  saveCombo,
  setupFirestoreListener
} from './app-builder.js';

import {
  renderSkinMetaCombosTable,
  renderGeneratorHeroes,
  renderGeneratorResults,
  generateBestCombos,
  generateRandomCombos
} from './app-generator.js';

import {
  currentLanguage,
  setCurrentLanguage,
  heroInfoEnabled,
  setHeroInfoEnabled,
  activeTechSeasons,
  setActiveTechSeasons,
  techSearchQuery,
  setTechSearchQuery,
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
  userId,
  getUserId,
  setUserId,
  db,
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
  heroesSection,
  edenMapSection,
  ocrDashboardSection,
  tabOcrDashboardBtn,
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
  getComboRankInfo,
  getCounterLabels,
  isHeroAlreadyInCombo,
  computeStateSelection,
  computeTypeSelection,
  getCheckedValues,
  registerUiFunctions,
} from './state.js';

initAppLoading();

// Maintenance switch: set MAINTENANCE_MODE to true, commit, and push to show the update screen.
// Leave it false for the normal app. Preview anytime with ?maintenancePreview=1.
const MAINTENANCE_MODE = true;
const MAINTENANCE_PREVIEW_PARAM = 'maintenancePreview';
const MAINTENANCE_CONFIG = {
  kicker: 'VTS 1097 WAR ROOM',
  title: 'Down for Update',
  message: 'Hero Combo Creator is being upgraded. We are tuning the 10.0.0 layout, skins, datasets, and war tools.',
  status: 'Maintenance in progress',
};

function shouldShowMaintenanceMode() {
  try {
    return MAINTENANCE_MODE || new URLSearchParams(window.location.search).has(MAINTENANCE_PREVIEW_PARAM);
  } catch {
    return MAINTENANCE_MODE;
  }
}

function renderMaintenanceMode() {
  const app = document.getElementById('app');
  if (!app) return;

  document.title = `${MAINTENANCE_CONFIG.title} | Hero Combo Creator`;
  document.body.classList.add('maintenance-active');
  app.className = 'maintenance-shell app-shell--hidden';
  app.innerHTML = `
    <style>
      body.maintenance-active {
        min-height: 100vh;
        overflow: hidden;
        background:
          radial-gradient(circle at 30% 22%, rgba(34, 211, 238, 0.2), transparent 32%),
          radial-gradient(circle at 72% 36%, rgba(251, 191, 36, 0.16), transparent 34%),
          #020611;
      }
      #app.maintenance-shell,
      [data-theme="light"] #app.maintenance-shell {
        max-width: none !important;
        padding: 0 !important;
        border: 0 !important;
        border-radius: 0 !important;
        background: transparent !important;
        box-shadow: none !important;
      }
      .maintenance-shell {
        width: min(100%, 1120px);
        min-height: calc(100vh - 32px);
        margin: 0 auto;
        display: grid;
        place-items: center;
      }
      .maintenance-card {
        position: relative;
        width: min(92vw, 620px);
        padding: clamp(28px, 5vw, 54px);
        text-align: center;
        color: #e5f8ff;
        background:
          linear-gradient(135deg, rgba(34, 211, 238, 0.13), rgba(251, 191, 36, 0.09)),
          rgba(2, 6, 17, 0.88);
        border: 1px solid rgba(103, 232, 249, 0.34);
        box-shadow: 0 28px 90px rgba(0, 0, 0, 0.62), inset 0 1px 0 rgba(255,255,255,0.08);
        clip-path: polygon(18px 0, 100% 0, 100% calc(100% - 18px), calc(100% - 18px) 100%, 0 100%, 0 18px);
        overflow: hidden;
      }
      .maintenance-card::before {
        content: "";
        position: absolute;
        inset: 0;
        pointer-events: none;
        background:
          linear-gradient(90deg, rgba(34, 211, 238, 0.1) 0 1px, transparent 1px 64px),
          linear-gradient(180deg, rgba(251, 191, 36, 0.06) 0 1px, transparent 1px 64px);
        opacity: 0.38;
      }
      .maintenance-logo {
        position: relative;
        width: 92px;
        height: 92px;
        margin: 0 auto 18px;
        border-radius: 18px;
        box-shadow: 0 0 32px rgba(34, 211, 238, 0.28), 0 0 54px rgba(251, 191, 36, 0.14);
      }
      .maintenance-kicker,
      .maintenance-title,
      .maintenance-message,
      .maintenance-status {
        position: relative;
      }
      .maintenance-kicker {
        display: inline-block;
        margin-bottom: 12px;
        padding: 7px 13px;
        color: #06121d;
        background: linear-gradient(90deg, #67e8f9, #fbbf24);
        font-size: 0.68rem;
        font-weight: 950;
        letter-spacing: 0.15em;
        text-transform: uppercase;
        clip-path: polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%);
      }
      .maintenance-title {
        margin: 0;
        font-family: "Cinzel", serif;
        font-size: clamp(2.2rem, 8vw, 4.8rem);
        line-height: 0.95;
        color: #f8fdff;
        text-shadow: 0 0 28px rgba(34, 211, 238, 0.34);
      }
      .maintenance-message {
        max-width: 480px;
        margin: 18px auto 24px;
        color: #b8c7d9;
        font-size: clamp(0.95rem, 2.8vw, 1.08rem);
        line-height: 1.65;
      }
      .maintenance-status {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        padding: 10px 14px;
        color: #fef3c7;
        background: rgba(15, 23, 42, 0.68);
        border: 1px solid rgba(251, 191, 36, 0.32);
        font-size: 0.78rem;
        font-weight: 900;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }
      .maintenance-status-dot {
        width: 9px;
        height: 9px;
        border-radius: 50%;
        background: #22d3ee;
        box-shadow: 0 0 16px #22d3ee;
      }
      @media (max-width: 640px) {
        body.maintenance-active { overflow: auto; }
        .maintenance-shell { min-height: calc(100vh - 24px); }
      }
    </style>
    <section class="maintenance-card" role="status" aria-live="polite">
      <img src="images/logo.png" alt="" class="maintenance-logo" width="92" height="92" />
      <div class="maintenance-kicker">${escapeHtml(MAINTENANCE_CONFIG.kicker)}</div>
      <h1 class="maintenance-title">${escapeHtml(MAINTENANCE_CONFIG.title)}</h1>
      <p class="maintenance-message">${escapeHtml(MAINTENANCE_CONFIG.message)}</p>
      <div class="maintenance-status">
        <span class="maintenance-status-dot" aria-hidden="true"></span>
        ${escapeHtml(MAINTENANCE_CONFIG.status)}
      </div>
    </section>
  `;
}

/* ===== THEME (Dark default + Light) ===== */
function getPreferredTheme() {
  const stored = localStorage.getItem('theme');
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
  if (!localStorage.getItem('theme') && window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', (e) => {
      if (!localStorage.getItem('theme')) {
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
      localStorage.setItem('theme', next);
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

initTheme();

document.addEventListener('click', (e) => {
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
  loyalty: 'tabLoyalty',
  youtube: 'tabYouTube',
  ocrDashboard: 'tabOcrDashboard',
};

// --- DATA NORMALIZER (Fixes Bug #3) ---
// Automatically patches any arrays that have 19 costs instead of 20
techDatabase.forEach(tech => {
    tech.nodes.forEach(node => {
        ['costs', 'wisdomCosts', 'courageCosts', 'wb_costs', 'cm_costs'].forEach(arrName => {
            let arr = node[arrName];
            if (arr && arr.length > 0 && arr.length < node.maxLevel) {
                let lastVal = arr[arr.length - 1];
                while (arr.length < node.maxLevel) {
                    arr.push(lastVal);
                }
            }
        });
    });
});


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

  container.addEventListener('click', (event) => {
    const pill = event.target.closest('label.filter-pill');
    if (!pill || !container.contains(pill) || event.target.matches('input[type="checkbox"]')) return;
    const input = pill.querySelector('input[type="checkbox"]');
    if (!input || input.disabled) return;

    event.preventDefault();
    input.checked = !input.checked;
    onChange(input);
  });

  container.addEventListener('change', (event) => {
    if (!event.target.matches('input[type="checkbox"]')) return;
    onChange(event.target);
  });
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
  { btn: tabLoyaltyBtn,  name: 'loyalty' },
  { btn: tabYouTubeBtn,  name: 'youtube' },
  { btn: tabOcrDashboardBtn, name: 'ocrDashboard' },
];

tabs.forEach(tab => {
  if (tab.btn) {
    tab.btn.addEventListener('click', () => switchTab(tab.name));
  }
});
  // --- RESTORED: Initialize Combo Slots & Drag-and-Drop ---
  document.querySelectorAll('.combo-slot').forEach((slot, i) => {
    // 1. Draw the initial '+' signs
    updateComboSlotDisplay(slot, null, i);

    // 2. Setup Desktop Drag-and-Drop zones
    slot.addEventListener('dragover', e => {
      e.preventDefault(); // Required to allow dropping
      slot.classList.add('drag-over'); // Highlight effect
    });
    
    slot.addEventListener('dragleave', e => {
      slot.classList.remove('drag-over');
    });

    slot.addEventListener('drop', e => {
      e.preventDefault();
      slot.classList.remove('drag-over');
      
      const heroName = e.dataTransfer.getData('text/plain');
      if (!heroName) return;

      if (isHeroAlreadyInCombo(heroName, i)) {
        const t = translations[currentLanguage] || translations.en;
        showAboModal(t.messageHeroAlreadyInSlot ? t.messageHeroAlreadyInSlot.replace('{heroName}', heroName) : 'Hero already in combo!');
        return;
      }
      
      currentCombo[i] = heroName;
      updateComboSlotDisplay(slot, heroName, i);
      updateManualComboScore();
    });
  });

  // 3. Turn on Mobile Touch Dragging
  setupTouchDragForManualBuilder();
  // --------------------------------------------------------

  if (languageSelect) {
    languageSelect.onchange = e => {
      setCurrentLanguage(e.target.value);
      localStorage.setItem('vts_hero_lang', currentLanguage);
      updateTextContent();
      renderAvailableHeroes();
      renderGeneratorHeroes();
    };
  }

  const heroInfoToggle = document.getElementById('heroInfoToggle');
  if (heroInfoToggle) {
    heroInfoToggle.addEventListener('change', (e) => {
      setHeroInfoEnabled(e.target.checked);
      forceHideHeroTooltip();
      document.body.classList.toggle('hide-hero-info', !heroInfoEnabled);
    });
  }

  let _lastTab = null;
  let _edenMapReady = false;
  let _edenMapBooting = false;
  let _heroesTabReady = false;

  const tabPanels = [
    manualSection, generatorSection, heroesSection, researchSection,
    edenMapSection, loyaltySection, youtubeSection, ocrDashboardSection,
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
            if (typeof window.showToast === 'function') {
              const t = translations[currentLanguage] || translations.en;
              window.showToast(t.edenMapLoadFailed || 'Eden map failed to load. Refresh and try again.', 'error', 4000);
            }
          })
          .finally(() => root?.classList.remove('eden-map-loading'));
      });
    }
    if (tabName === 'heroes' && !_heroesTabReady) {
      renderHeroesTab();
      _heroesTabReady = true;
    }
    if (tabName === 'youtube') {
      loadYouTubeEmbeds();
    }
    if (tabName === 'ocrDashboard') {
      loadTabTemplate('ocrDashboard').then(() => {
        import('./ocr-dashboard.js').then(mod => mod.bootOcrDashboard()).catch(e => console.error('OCR dashboard load failed:', e));
      });
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
    if (activeBtn) activeBtn.classList.replace('tab-pill-inactive', 'tab-pill-active');

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
  if (seasonFiltersEl) {
    wireFilterControls(seasonFiltersEl, () => {
      setSelectedSeasons(readSeasonFilterSelection(seasonFiltersEl));
      renderAvailableHeroes();
    });
  }

  if (stateFiltersEl) {
    wireFilterControls(stateFiltersEl, () => {
      setSelectedStates(readStateFilterSelection(stateFiltersEl));
      renderAvailableHeroes();
    });
  }

  if (troopFiltersEl) {
    wireFilterControls(troopFiltersEl, (input) => {
      setSelectedTypes(readTroopFilterSelection(troopFiltersEl, input));
      renderAvailableHeroes();
    });
  }

  if (genSeasonFiltersEl) {
    wireFilterControls(genSeasonFiltersEl, () => {
      setGeneratorSelectedSeasons(readSeasonFilterSelection(genSeasonFiltersEl));
      renderGeneratorHeroes();
    });
  }

  if (genStateFiltersEl) {
    wireFilterControls(genStateFiltersEl, () => {
      setGeneratorSelectedStates(readStateFilterSelection(genStateFiltersEl));
      renderGeneratorHeroes();
    });
  }

  if (genTroopFiltersEl) {
    wireFilterControls(genTroopFiltersEl, (input) => {
      setGeneratorSelectedTypes(readTroopFilterSelection(genTroopFiltersEl, input));
      renderGeneratorHeroes();
    });
  }

  const genSkinToggle = document.getElementById('genSkinToggle');
  if (genSkinToggle) {
    genSkinToggle.addEventListener('change', () => {
      setGeneratorSkinsOnly(genSkinToggle.checked);
      renderGeneratorHeroes();
    });
  }

  const genSelectAllBtn = document.getElementById('genSelectAllBtn');
  const genClearAllBtn  = document.getElementById('genClearAllBtn');

  const updateGenCountBadge = () => {
    const countBadge = document.getElementById('genSelectedCount');
    if (!countBadge) return;
    const n = generatorSelectedHeroes.size;
    if (n > 0) { countBadge.textContent = n + ' selected'; countBadge.classList.remove('hidden'); }
    else { countBadge.classList.add('hidden'); }
  };

  if (genSelectAllBtn) {
    genSelectAllBtn.onclick = () => {
      allHeroesData
        .filter(h => heroMatchesFilters(h, generatorSelectedSeasons, generatorSelectedStates, generatorSelectedTypes))
        .forEach(h => generatorSelectedHeroes.add(h.name));
      renderGeneratorHeroes();
      updateGenCountBadge();
    };
  }

  if (genClearAllBtn) {
    genClearAllBtn.onclick = () => {
      generatorSelectedHeroes.clear();
      renderGeneratorHeroes();
      updateGenCountBadge();
    };
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
        return { heroes, displayScore: info ? info.score : '—' };
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

  const idMap = {
    'appTitle': t.appTitle,
    'betaNote': t.betaNote,
    'tabManual': t.tabManual,
    'tabGenerator': t.tabGenerator,
    'tabLoyalty': t.tabLoyalty,
    'tabYouTube': t.tabYouTube || 'YouTube',
    'tabEdenMap': t.tabEdenMap || 'Eden Map',
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
  renderSkinMetaCombosTable();

  document.querySelectorAll('[data-i18n-label]').forEach(el => {
    const key = el.getAttribute('data-i18n-label');
    if (t[key]) el.label = t[key].replace('{version}', APP_VERSION);
  });

  document.querySelectorAll('[data-i18n-aria]').forEach(el => {
    const key = el.getAttribute('data-i18n-aria');
    if (t[key]) el.setAttribute('aria-label', t[key].replace('{version}', APP_VERSION));
  });

  window.dispatchEvent(new CustomEvent('edenLanguageUpdate'));

  applySeo(currentLanguage);

  updateManualComboScore();
  if (ENABLE_RESEARCH_FEATURE && document.getElementById('techListContainer')) {
    renderTechList();
  }
}

// --- RESEARCH CALCULATOR LOGIC ---
window.quickMaxTech = function(e, techId) {
    e.stopPropagation(); 
    const tech = techDatabase.find(t => t.id === techId);
    if(!tech) return;
    
    // Max out every node in the background
    tech.nodes.forEach(n => {
        localStorage.setItem(`tech_${tech.id}_${n.id}`, n.maxLevel);
    });
    
    updateGlobalSummary();
    renderTechList();

    // Quick visual feedback on the button
    const btn = e.target;
    const originalText = btn.innerHTML;
    btn.innerHTML = `<svg class="w-3 h-3 inline pb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg> MAXED`;
    btn.classList.replace('text-blue-300', 'text-emerald-300');
    btn.classList.replace('border-blue-500/50', 'border-emerald-500/50');
    btn.classList.replace('bg-blue-900/80', 'bg-emerald-900/80');
    
    setTimeout(() => {
        btn.innerHTML = originalText;
        btn.classList.replace('text-emerald-300', 'text-blue-300');
        btn.classList.replace('border-emerald-500/50', 'border-blue-500/50');
        btn.classList.replace('bg-emerald-900/80', 'bg-blue-900/80');
    }, 1000);
    
    // Refresh calculator UI if it's currently open
    const calcContainer = document.getElementById('techCalculatorContainer');
    if (!calcContainer.classList.contains('hidden')) {
        renderCalculator(tech);
    }
};
























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
  };
  window.addEventListener('resize', checkOverflow);
  setTimeout(checkOverflow, 100);
}

// --- INITIALIZE EVERYTHING ---
async function startApp() {
    try {
    await safeInit('updateTextContent', () => updateTextContent());
    safeInit('gameClock', () => mountGameClock(document.getElementById('globalGameClock'), { compact: true, showUae: false }));
    safeInit('renderAvailableHeroes', () => renderAvailableHeroes());
    safeInit('renderSkinMetaCombosTable', () => renderSkinMetaCombosTable());
    safeInit('renderGeneratorHeroes', () => renderGeneratorHeroes());
    safeInit('wireUIActions', () => wireUIActions());
    safeInit('initResearchCalculator', () => initResearchCalculator());
    safeInit('initTabScroll', () => initTabScroll());

    safeInit('registerServiceWorker', () => registerServiceWorker());
    const comboShare = safeInit('parseComboShareUrl', () => parseComboShareUrl());
    if (comboShare) {
      console.log('Loaded shared combos from URL', comboShare);
    }
    const rosterShare = safeInit('parseRosterShareUrl', () => parseRosterShareUrl());
    if (rosterShare) {
      safeInit('applyRosterShare', () => applyRosterToGenerator(rosterShare, generatorSelectedHeroes));
    }

    await safeInit('firebase', async () => {
        await initFirebase();
        const user = await ensureAnonymousAuth();
        if (user && user.uid) {
            setUserId(user.uid);
        }
        setupFirestoreListener();
        const cloudProfile = await loadPlayerProfileFromCloud();
        if (cloudProfile && cloudProfile.roster) {
          applyRosterToGenerator(cloudProfile.roster, generatorSelectedHeroes);
        }
        if (typeof initComments === 'function') {
            initComments();
        }
    });
    } finally {
        await notifyAppReady();
    }
}

function safeInit(name, fn) {
  try {
    const result = fn();
    if (result && typeof result.catch === 'function') {
      return result.catch(err => {
        console.warn(`[${name}] async init failed:`, err);
        if (typeof window.showToast === 'function') {
          const t = translations[currentLanguage] || translations.en;
          window.showToast((t.moduleLoadFailed || '{name} failed to load').replace('{name}', name), 'warn', 3000);
        }
      });
    }
    return result;
  } catch (err) {
    console.warn(`[${name}] init failed:`, err);
    if (typeof window.showToast === 'function') {
      const t = translations[currentLanguage] || translations.en;
      window.showToast((t.moduleLoadFailed || '{name} failed to load').replace('{name}', name), 'warn', 3000);
    }
    return undefined;
  }
}

async function startMaintenanceMode() {
  renderMaintenanceMode();
  safeInit('registerServiceWorker', () => registerServiceWorker());
  await notifyAppReady({ skipIntro: true });
}

// Fire it up!
window.addEventListener('error', (e) => {
  console.error('[global] Uncaught error:', e.error || e.message);
});
window.addEventListener('unhandledrejection', (e) => {
  console.error('[global] Unhandled promise rejection:', e.reason);
});
if (shouldShowMaintenanceMode()) {
  startMaintenanceMode().catch(err => console.error('[global] maintenance mode failed:', err));
} else if (typeof startApp === 'function') {
  setupInstallPrompt();

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
  console.error('[global] startApp not defined — module import may have failed');
}
