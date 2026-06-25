// js/state.js - Shared state hub. No imports from app.js/builder.js/generator.js.
import { translations } from './translations.js';
import { allHeroesData } from './heroes-data.js';
import { skinHeroesData } from './skin-heroes-data.js';
import { baseRankedCombos } from './combos-db.js';
import { seasonColors, TechseasonColors } from './constants.js';

// --- APP CONFIG ---
export const APP_VERSION = '12.0.0';
export const ENABLE_RESEARCH_FEATURE = true;

const runtimeState = globalThis.__vtsHeroComboRuntimeState || {};
globalThis.__vtsHeroComboRuntimeState = runtimeState;

// --- STATE ---
export let currentLanguage = localStorage.getItem('vts_hero_lang') || 'en';
export let heroInfoEnabled = true;
export let activeTechSeasons = new Set(['X1']);
export let techSearchQuery = '';

export const DEFAULT_HERO_FILTER_SEASONS = ['S0', 'S1'];

export let selectedSeasons = [...DEFAULT_HERO_FILTER_SEASONS];
export let selectedStates = ['Free', 'Paid'];
export let selectedTypes = ['Archers', 'Footmen', 'Cavalry', 'All'];

export let currentCombo = [null, null, null];
export function setCurrentCombo(v) { currentCombo = v; }

export let generatorSelectedSeasons = [...DEFAULT_HERO_FILTER_SEASONS];
export let generatorSelectedStates = ['Free', 'Paid'];
export let generatorSelectedTypes = ['Archers', 'Footmen', 'Cavalry', 'All'];
export const generatorSelectedHeroes = runtimeState.generatorSelectedHeroes || new Set();
runtimeState.generatorSelectedHeroes = generatorSelectedHeroes;
export let generatorSkinsOnly = false;

export let userId = 'anonymous';
export function getUserId() { return userId; }
export function setUserId(uid) { userId = uid; }
export let db = null;
export function setDb(d) { db = d; }

export function setCurrentLanguage(lang) { currentLanguage = lang; }
export function setHeroInfoEnabled(v) { heroInfoEnabled = v; }
export function setSelectedSeasons(v) { selectedSeasons = v; }
export function setSelectedStates(v) { selectedStates = v; }
export function setSelectedTypes(v) { selectedTypes = v; }
export function setGeneratorSelectedSeasons(v) { generatorSelectedSeasons = v; }
export function setGeneratorSelectedStates(v) { generatorSelectedStates = v; }
export function setGeneratorSelectedTypes(v) { generatorSelectedTypes = v; }
export function setGeneratorSkinsOnly(v) { generatorSkinsOnly = v; }
export function setActiveTechSeasons(v) { activeTechSeasons = v; }
export function setTechSearchQuery(v) { techSearchQuery = v; }
export function getGeneratorHeroPool(skinsOnly = generatorSkinsOnly) {
  return skinsOnly ? skinHeroesData : allHeroesData;
}
export const savedCombosCache = [];
export const lastGeneratedCombos = [];
export const undoHistoryStack = [];

export function pushUndoAction(action) {
  if (!action || typeof action.undo !== 'function') return;
  undoHistoryStack.push({
    id: action.id || `undo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    label: action.label || 'Change',
    message: action.message || '',
    undo: action.undo,
    createdAt: Date.now(),
  });
  if (undoHistoryStack.length > 12) undoHistoryStack.shift();
  window.dispatchEvent(new CustomEvent('vts:undo-available', {
    detail: undoHistoryStack[undoHistoryStack.length - 1],
  }));
}

export async function undoLastAction() {
  const action = undoHistoryStack.pop();
  if (!action) return false;
  await action.undo();
  return action;
}

export function getSourceCreditText() {
  const lang = localStorage.getItem('vts_hero_lang') || currentLanguage || 'en';
  const t = translations[lang] || translations.en;
  return t.sourceCreditText || translations.en.sourceCreditText || "Data meticulously sourced from the VTS 1097 Community, Ptr, Old.Faithful, Raven G, and other contributors.";
}

// --- COLORS (defined in constants.js, re-exported for convenience) ---
export { seasonColors, TechseasonColors };
export const TECH_SEASON_ORDER = ['S0', 'S1', 'S2', 'S3', 'S4', 'X1', 'X2'];

export const HERO_ATLAS_ALL_SEASONS = ['S0', 'S1', 'S2', 'S3', 'S4', 'X1', 'X2', 'X8'];

const SEASON_CATCHUP_HINT_KEYS = {
  X1: 'seasonCatchupX1',
  X2: 'seasonCatchupX2',
  X8: 'seasonCatchupX8',
};

export function getSeasonCatchupHint(seasons = []) {
  return getSeasonCatchupItems(seasons).map(item => item.text).join(' ');
}

export function getSeasonCatchupItems(seasons = []) {
  const lang = localStorage.getItem('vts_hero_lang') || currentLanguage || 'en';
  const t = translations[lang] || translations.en;
  const en = translations.en || {};
  const ordered = HERO_ATLAS_ALL_SEASONS.filter(season => seasons.includes(season));
  return ordered
    .map(season => {
      const key = SEASON_CATCHUP_HINT_KEYS[season];
      const text = key ? (t[key] || en[key] || '') : '';
      const parts = text.split(':');
      return {
        season,
        text,
        title: parts.length > 1 ? parts.shift().trim() : season,
        body: parts.length > 0 ? parts.join(':').trim() : text,
      };
    })
    .filter(item => item.text);
}

const PAID_GEM_SVG = `<svg class="paid-gem-svg" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M10 2l2.2 4.5 5 .7-3.6 3.5.85 5L10 13.8 5.55 15.7l.85-5L2.8 7.2l5-.7L10 2z" fill="#a855f7" stroke="#fde68a" stroke-width=".7"/></svg>`;

export function paidBadgeHtml(variant = 'card') {
  return `<span class="paid-badge paid-badge--${variant}" title="Paid Hero">${PAID_GEM_SVG}<span class="paid-badge-text">PAID</span></span>`;
}

export function paidIconHtml() {
  return `<span class="paid-icon-inline" title="Paid Hero">${PAID_GEM_SVG}</span>`;
}

// --- DOM ELEMENTS ---
export const languageSelect = document.getElementById('languageSelect');
export const availableHeroesEl = document.getElementById('availableHeroes');
export const saveComboBtn = document.getElementById('saveComboBtn');
export const clearComboBtn = document.getElementById('clearComboBtn');
export const downloadCombosBtn = document.getElementById('downloadCombosBtn');
export const shareAllCombosBtn = document.getElementById('shareAllCombosBtn');
export const savedCombosEl = document.getElementById('savedCombos');
export const noCombosMessage = document.getElementById('noCombosMessage');
export const loadingSpinner = document.getElementById('loadingSpinner');
export const messageBox = document.getElementById('messageBox');
export const messageText = document.getElementById('messageText');
export const messageBoxOkBtn = document.getElementById('messageBoxOkBtn');
export const messageBoxCancelBtn = document.getElementById('messageBoxCancelBtn');

export const manualSection = document.getElementById('manualSection');
export const generatorSection = document.getElementById('generatorSection');
export const loyaltySection = document.getElementById('loyaltySection');
export const youtubeSection = document.getElementById('youtubeSection');
export const researchSection = document.getElementById('researchSection');

export const tabManualBtn = document.getElementById('tabManual');
export const tabGeneratorBtn = document.getElementById('tabGenerator');
export const tabLoyaltyBtn = document.getElementById('tabLoyalty');
export const tabYouTubeBtn = document.getElementById('tabYouTube');
export const tabResearchBtn = document.getElementById('tabResearch');
export const tabHeroesBtn = document.getElementById('tabHeroes');
export const tabEdenMapBtn = document.getElementById('tabEdenMap');
export const tabStrifeBtn = document.getElementById('tabStrife');
export const heroesSection = document.getElementById('heroesSection');
export const edenMapSection = document.getElementById('edenMapSection');
export const strifeSection = document.getElementById('strifeSection');
export const ocrDashboardSection = document.getElementById('ocrDashboardSection');
export const tabOcrDashboardBtn = document.getElementById('tabOcrDashboard');
export const globalToggleRow = document.getElementById('globalToggleRow');

export const comboFooterBar = document.getElementById('comboFooterBar');
export const generatorHeroesEl = document.getElementById('generatorHeroes');
export const generatorResultsEl = document.getElementById('generatorResults');
export const generateCombosBtn = document.getElementById('generateCombosBtn');
export const downloadGeneratorBtn = document.getElementById('downloadGeneratorBtn');

export const seasonFiltersEl = document.getElementById('seasonFilters');
export const stateFiltersEl = document.getElementById('stateFilters');
export const troopFiltersEl = document.getElementById('troopFilters');
export const genSeasonFiltersEl = document.getElementById('generatorSeasonFilters');
export const genStateFiltersEl = document.getElementById('generatorStateFilters');
export const genTroopFiltersEl = document.getElementById('generatorTroopFilters');

// --- UTILITY FUNCTIONS ---

export function getTroopColorClass(type) {
  switch (type) {
    case 'Archers': return 'text-emerald-400';
    case 'Footmen': return 'text-amber-400';
    case 'Cavalry': return 'text-sky-400';
    case 'All': return 'text-purple-400';
    default: return 'text-slate-400';
  }
}

export function getLocalizedTroop(type) {
  const t = translations[currentLanguage] || translations.en;
  if (type === 'Archers') return t.troopArchers || type;
  if (type === 'Footmen') return t.troopFootmen || type;
  if (type === 'Cavalry') return t.troopCavalry || type;
  if (type === 'All') return t.troopAll || type;
  return type;
}

export function getHeroImageUrl(name) {
  const h = allHeroesData.find(x => x.name === name);
  return h?.imageUrl || `https://placehold.co/128x128?text=${encodeURIComponent(name)}`;
}

export function heroMatchesFilters(hero, seasonsArr, statesArr, typesArr) {
  if (!seasonsArr || seasonsArr.length === 0) return false;
  if (!seasonsArr.includes(hero.season)) return false;
  const heroState = (hero.State || 'Free').toLowerCase();
  const lowerStatesArr = (statesArr || []).map(s => s.toLowerCase());
  if (lowerStatesArr.length && !lowerStatesArr.includes(heroState)) return false;
  const heroType = hero.Type || 'All';
  if (!typesArr || !typesArr.length) return true;
  if (heroType === 'All' || typesArr.includes('All')) return true;
  return typesArr.includes(heroType);
}

export function getComboRankInfo(heroes) {
  if (!Array.isArray(heroes) || heroes.length !== 3) return null;
  const userSorted = [...heroes].slice().sort();
  const total = baseRankedCombos.length;
  for (let i = 0; i < total; i++) {
    const combo = baseRankedCombos[i];
    if (!combo.heroes || combo.heroes.length !== 3) continue;
    const comboSorted = [...combo.heroes].slice().sort();
    if (
      comboSorted[0] === userSorted[0] &&
      comboSorted[1] === userSorted[1] &&
      comboSorted[2] === userSorted[2]
    ) {
      const rank = i + 1;
      let rawScore = 100;
      if (total > 1) rawScore = 100 - ((i / (total - 1)) * 99);
      return { rank, score: rawScore.toFixed(1), index: i };
    }
  }
  return null;
}

export function isHeroAlreadyInCombo(name, ignoreIndex = -1) {
  return currentCombo.some((h, idx) => h === name && idx !== ignoreIndex);
}

export function getCounterLabels() {
  const t = translations[currentLanguage] || translations.en;
  return {
    toggle: t.countersToggle || 'Counters ({n})',
    title: t.countersTitle || 'Counters',
    score: t.countersScore || 'Score',
    hide: t.countersHide || 'Hide counters',
  };
}

export function getCheckedValues(container) {
  if (!container) return [];
  return Array.from(container.querySelectorAll('input[type="checkbox"]:checked')).map(i => i.value);
}

export function computeStateSelection(container) {
  const raw = getCheckedValues(container).map(v => v.toLowerCase());
  const set = new Set();
  if (raw.length === 0) return ['Free', 'Paid'];
  if (raw.some(v => v.includes('paid') && v.includes('free'))) { set.add('Free'); set.add('Paid'); }
  if (raw.some(v => v === 'free')) set.add('Free');
  if (raw.some(v => v === 'paid')) set.add('Paid');
  if (set.size === 0) { set.add('Free'); set.add('Paid'); }
  return Array.from(set);
}

export function computeTypeSelection(container) {
  const raw = getCheckedValues(container).map(v => v.toLowerCase());
  if (raw.length === 0) return ['Archers', 'Footmen', 'Cavalry', 'All'];
  const hasAll = raw.some(v => v.includes('all') || v.includes('cavalry or archers'));
  if (hasAll) return ['Archers', 'Footmen', 'Cavalry', 'All'];
  const set = new Set();
  if (raw.some(v => v.includes('archers'))) set.add('Archers');
  if (raw.some(v => v.includes('footmen'))) set.add('Footmen');
  if (raw.some(v => v.includes('cavalry'))) set.add('Cavalry');
  if (set.size === 0) return ['Archers', 'Footmen', 'Cavalry', 'All'];
  return Array.from(set);
}

// --- UI FUNCTION REGISTRY ---
// Complex UI functions that live in app.js are registered here
// to break the circular import cycle.
export const __ui = runtimeState.__ui || {};
runtimeState.__ui = __ui;

export function registerUiFunctions(fns) {
  Object.assign(__ui, fns);
}
