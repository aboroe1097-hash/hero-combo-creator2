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
import { escapeHtml } from './utils.js';
import { allHeroesData } from './heroes-data.js';
import { heroBonusPoints } from './hero-bonuses.js';
import { applySeo } from './seo.js';
import { renderTechNodeIconSvg, resolveTechNodeIcon } from './research-node-icons.js';
import { initAppLoading, notifyAppReady } from './app-loading.js?v=20260614_3';
import { registerServiceWorker, setupInstallPrompt } from './pwa-register.js';
import { loadPlayerProfileFromCloud, applyRosterToGenerator } from './player-profile.js';
import { parseComboShareUrl } from './combo-share.js';
import { parseRosterShareUrl } from './roster-share.js';

import {
  renderAvailableHeroes,
  updateComboSlotDisplay,
  updateManualComboScore,
  setupTouchDragForManualBuilder,
  saveCombo,
  setupFirestoreListener
} from './app-builder.js';

import {
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
  selectedSeasons,
  setSelectedSeasons,
  selectedStates,
  setSelectedStates,
  selectedTypes,
  setSelectedTypes,
  currentCombo,
  setCurrentCombo,
  generatorSelectedSeasons,
  setGeneratorSelectedSeasons,
  generatorSelectedStates,
  setGeneratorSelectedStates,
  generatorSelectedTypes,
  setGeneratorSelectedTypes,
  generatorSelectedHeroes,
  userId,
  getUserId,
  setUserId,
  db,
  savedCombosCache,
  lastGeneratedCombos,
  sourceCreditText,
  APP_VERSION,
  ENABLE_RESEARCH_FEATURE,
  seasonColors,
  TechseasonColors,
  TECH_SEASON_ORDER,
  HERO_ATLAS_ALL_SEASONS,
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

function getHeroFinalScore(heroName, autoRating) {
  const bonus = heroBonusPoints[heroName] || 0;
  return Math.min(100, Math.max(0, autoRating + bonus));
}

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

function appT(key, vars = {}) {
  let s = (translations[currentLanguage] || translations.en)[key] || translations.en[key] || key;
  Object.entries(vars).forEach(([k, v]) => { s = s.replace(`{${k}}`, String(v)); });
  return s;
}


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
heroTooltip.id = 'hero-tooltip';
heroTooltip.className = 'fixed z-[9999] bg-slate-900/98 backdrop-blur-md border border-slate-600 rounded-xl p-3 sm:p-4 shadow-2xl text-slate-200 w-[90vw] sm:w-[340px] md:w-[480px] lg:w-[520px] pointer-events-auto hidden opacity-0 transition-opacity duration-200 flex flex-col';
document.body.appendChild(heroTooltip);

document.addEventListener('touchstart', (e) => {
  if (!e.target.closest('.hero-card') && !heroTooltip.contains(e.target)) {
    hideHeroTooltip();
  }
}, { passive: true });

function formatSkillText(text) {
  let counter = 0;
  const tokens = {};
  const alpha = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  
  function tokenize(html) {
    const token = `_TK${alpha[counter++]}_`;
    tokens[token] = html;
    return token;
  }

  let formatted = text.replace(/<\/?b>/gi, '').replace(/<\/?u>/gi, '');

  formatted = formatted.replace(/([+-]?\d+(?:\.\d+)?%)/g, (match) => 
    tokenize(`<span class="font-black text-sky-400 bg-sky-900/30 px-1 rounded">${match}</span>`)
  );
  
  formatted = formatted.replace(/(\d+\s*(?:turns|turn|rounds|round|times|time|layers|layer|roun|min|hr))/gi, (match) => 
    tokenize(`<span class="font-bold text-amber-400">${match}</span>`)
  );
  
  const statuses = ['Silence', 'Silenced', 'Disarm', 'Disarmed', 'Suppress', 'Suppressed', 'Confuse', 'Confused', 'First-Aid', 'Flammable', 'Counter-attack', 'Counterattack', 'Taunting', 'Taunt', 'Dodging', 'Dodge', 'Feverish', 'Sober', 'Vulnerable', 'Armor break', 'Destructive Strike', 'Revived', 'Clarity', 'Cursed', 'Poisoned', 'Chain', 'Splash', 'Interrupting', 'Bleeding', 'bleeding', 'Faltering', 'First to Attack', 'Fatal Blow'];  
  const statusRegex = new RegExp(`\\b(${statuses.join('|')})\\b`, 'gi');
  formatted = formatted.replace(statusRegex, (match) => 
    tokenize(`<span class="font-black text-purple-400 underline decoration-purple-500/50 underline-offset-2">${match}</span>`)
  );

  formatted = formatted.replace(/\b(\d+)\b/g, (match) => 
    tokenize(`<span class="font-bold text-white bg-slate-700/50 px-1 rounded mx-0.5">${match}</span>`)
  );

  for (const [token, html] of Object.entries(tokens)) {
    formatted = formatted.replace(token, html);
  }

  return formatted;
}

function showHeroTooltip(e, heroName) {
  if (!heroInfoEnabled) return; 

  const data = heroesExtendedData[heroName];
  if (!data) return; 

  const baseData = allHeroesData.find(h => h.name === heroName);
  const troopType = baseData ? baseData.Type : 'Unknown';
  const troopColorClass = getTroopColorClass(troopType);
  const localizedTroop = getLocalizedTroop(troopType);

  let skillsHtml = data.skills.map(s => {
    const formattedDesc = formatSkillText(s.desc);
    const isEnemy = s.target.toLowerCase().includes('enemy');
    const targetColor = isEnemy ? 'text-red-400' : 'text-emerald-400';

    return `
      <div class="mb-2 bg-slate-800 p-2 sm:p-2.5 rounded-lg border border-slate-700 shadow-inner hover:border-slate-500 transition-colors">
        <div class="flex justify-between items-center mb-1.5 border-b border-slate-700/50 pb-1">
          <span class="text-[10px] sm:text-xs font-black text-slate-200 bg-slate-700 px-2 py-0.5 rounded shadow-sm tracking-wider">SKILL ${s.id}</span>
          <div class="flex gap-2">
            <span class="text-[8px] sm:text-[9.5px] text-sky-300 font-bold uppercase tracking-wider">${s.type}</span>
            ${s.range !== '-' ? `<span class="text-[8px] sm:text-[9.5px] text-slate-500 font-bold uppercase">Range: <span class="text-white bg-slate-700 px-1 rounded">${s.range}</span></span>` : ''}
          </div>
        </div>
        <p class="text-[8.5px] sm:text-[10px] ${targetColor} font-bold mb-1.5 uppercase tracking-widest flex items-center gap-1">
          <svg class="w-3 h-3 opacity-70" fill="currentColor" viewBox="0 0 20 20"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-5.029-5.912c.328-.521.529-1.134.529-1.788a4.991 4.991 0 00-1.854-3.791A3.99 3.99 0 0114 12H6a3.99 3.99 0 012.354-8.491A4.991 4.991 0 006.5 7.3c0 .654.2 1.267.529 1.788A5.972 5.972 0 002 15v3h14z"></path></svg>
          ${s.target}
        </p>
        <p class="text-[9.5px] sm:text-[11px] leading-relaxed text-slate-300">${formattedDesc}</p>
      </div>
    `;
  }).join('');

  let synergyHtml = '';
  const synergies = getSynergies(heroName);
  if (synergies.length > 0) {
    const synTags = synergies.map(syn => `
      <div class="flex items-center gap-1.5 bg-slate-900/80 px-2 py-1 rounded border border-slate-700 shadow-sm">
         <img src="${getHeroImageUrl(syn)}" crossorigin="anonymous" class="w-4 h-4 sm:w-5 sm:h-5 rounded-full border border-slate-600 object-cover">
         <span class="text-[9px] sm:text-[10px] font-bold text-sky-300 truncate max-w-[70px] sm:max-w-[90px]">${syn}</span>
      </div>
    `).join('');
    
    synergyHtml = `
      <div class="mt-2 pt-2 border-t border-slate-700/50">
        <span class="text-[8px] sm:text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-1.5 block">Best Synergies</span>
        <div class="flex flex-wrap gap-2">
          ${synTags}
        </div>
      </div>
    `;
  }

  heroTooltip.innerHTML = `
    <div class="flex justify-between items-start border-b border-slate-700 pb-3 mb-2 shrink-0">
      <div class="flex flex-col">
        <h4 class="text-base sm:text-lg font-black text-white uppercase tracking-wider drop-shadow-md pr-2">${heroName}</h4>
        <div class="flex gap-3 mt-2 bg-slate-900/50 p-2 rounded-lg border border-slate-700/50 w-fit">
          <div class="flex flex-col">
            <span class="text-[8px] sm:text-[9px] text-slate-500 font-bold uppercase tracking-widest">Placement</span>
            <span class="text-[10px] sm:text-[11px] text-emerald-400 font-bold tracking-wide">${data.placement || 'Any'}</span>
          </div>
          <div class="w-px bg-slate-700/50"></div>
          <div class="flex flex-col">
            <span class="text-[8px] sm:text-[9px] text-slate-500 font-bold uppercase tracking-widest">Troop</span>
            <span class="text-[10px] sm:text-[11px] font-bold tracking-wide ${troopColorClass}">${localizedTroop}</span>
          </div>
        </div>
      </div>
      
      <button id="closeTooltipBtn" class="lg:hidden bg-slate-800 text-slate-400 hover:text-white hover:bg-red-500 rounded-full w-8 h-8 flex items-center justify-center border border-slate-600 shadow-md transition-colors shrink-0">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
      </button>
    </div>

    <div class="flex justify-between items-center mb-2 px-1 shrink-0">
      <p class="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-widest">Min: <span class="text-amber-400 bg-amber-900/30 px-1.5 py-0.5 rounded">${data.minCopies || 34} copies</span></p>
      <p class="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-widest">Max: <span class="text-sky-400 bg-sky-900/30 px-1.5 py-0.5 rounded">${data.maxCopies || 34} copies</span></p>
    </div>

    <div class="flex flex-col gap-1.5 overflow-y-auto pr-1 flex-1 custom-scrollbar pb-2">
      ${skillsHtml || '<p class="text-xs text-slate-500 italic">No skill data available yet.</p>'}
      ${synergyHtml}
    </div>
  `;

  heroTooltip.classList.remove('hidden');
  requestAnimationFrame(() => {
    heroTooltip.classList.remove('opacity-0');
    heroTooltip.classList.add('opacity-100');
  });
  moveHeroTooltip(e);

  const closeBtn = document.getElementById('closeTooltipBtn');
  if (closeBtn) {
    closeBtn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      hideHeroTooltip();
    });
    closeBtn.addEventListener('touchstart', (ev) => {
      ev.stopPropagation();
      ev.preventDefault();
      hideHeroTooltip();
    }, { passive: false });
  }
}

function moveHeroTooltip(e) {
  if (heroTooltip.classList.contains('hidden')) return;
  const rect = heroTooltip.getBoundingClientRect();
  
  if (window.innerWidth < 1024) {
    heroTooltip.style.left = '50%';
    heroTooltip.style.top = '50%';
    heroTooltip.style.transform = 'translate(-50%, -50%)';
    heroTooltip.style.maxHeight = '90vh'; 
    return;
  }

  heroTooltip.style.transform = 'none';
  heroTooltip.style.maxHeight = '85vh';

  let clientX = e.clientX !== undefined ? e.clientX : window.innerWidth / 2;
  let clientY = e.clientY !== undefined ? e.clientY : window.innerHeight / 2;

  let x = clientX + 15;
  let y = clientY + 15;
  
  if (x + rect.width > window.innerWidth) x = clientX - rect.width - 15;
  if (y + rect.height > window.innerHeight) y = window.innerHeight - rect.height - 15;
  
  if (y < 10) y = 10;
  if (x < 10) x = 10;

  heroTooltip.style.left = `${x}px`;
  heroTooltip.style.top = `${y}px`;
}

function hideHeroTooltip() {
  heroTooltip.classList.remove('opacity-100');
  heroTooltip.classList.add('opacity-0');
  setTimeout(() => {
    if(heroTooltip.classList.contains('opacity-0')) heroTooltip.classList.add('hidden');
  }, 200);
}

function forceHideHeroTooltip() {
  heroTooltip.classList.add('hidden', 'opacity-0');
  heroTooltip.classList.remove('opacity-100');
}

const _heroSeasonByName = new Map(allHeroesData.map(h => [h.name, h.season]));
const HERO_SEASON_INDEX = Object.fromEntries(HERO_ATLAS_ALL_SEASONS.map((s, i) => [s, i]));

function getHeroSeason(name) {
  return _heroSeasonByName.get(name) || null;
}

function getSeasonIndex(season) {
  return HERO_SEASON_INDEX[season] ?? -1;
}

function comboFitsHeroSeasonScope(combo, anchorHeroName, selectedSeasons, scope) {
  if (!combo?.heroes?.includes(anchorHeroName)) return false;
  if (scope === 'all') return true;

  const anchorSeason = getHeroSeason(anchorHeroName);
  if (!anchorSeason) return false;
  const capIdx = getSeasonIndex(anchorSeason);
  const seasonSet = new Set(normalizeHeroAtlasSeasons(selectedSeasons));

  return combo.heroes.every(hn => {
    const hs = getHeroSeason(hn);
    if (!hs) return false;
    if (getSeasonIndex(hs) > capIdx) return false;
    if (hs === 'S0') return true;
    return seasonSet.has(hs);
  });
}

function getHeroAtlasCombos(heroName, state, limit = 5) {
  const scope = state.comboScope || 'season-capped';
  const eligible = rankedCombos.filter(c =>
    comboFitsHeroSeasonScope(c, heroName, state.seasons, scope),
  );
  const total = eligible.length;
  return eligible.map((c, i) => ({
    heroes: c.heroes,
    rank: i + 1,
    score: (total > 1 ? 100 - ((i / (total - 1)) * 99) : 100).toFixed(1),
  })).slice(0, limit);
}

function getSynergies(heroName, state = _heroesTabState) {
  const scope = state.comboScope || 'season-capped';
  const containingCombos = rankedCombos.filter(c =>
    comboFitsHeroSeasonScope(c, heroName, state.seasons, scope),
  );
  const top5 = containingCombos.slice(0, 5);
  if (top5.length === 0) return [];

  const counts = {};
  top5.forEach(combo => {
    combo.heroes.forEach(h => {
      if (h !== heroName) counts[h] = (counts[h] || 0) + 1;
    });
  });

  const sortedPartners = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(entry => entry[0]);

  return sortedPartners.slice(0, 3);
}

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

// ── Custom Canvas Image Renderer ─────────────────────────────────────────────
// Draws combo results pixel-perfectly to a canvas — no html2canvas quirks.

async function loadImageCrossOrigin(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload  = () => resolve(img);
    img.onerror = () => resolve(null);    // fail gracefully
    img.src = url + (url.includes('?') ? '&' : '?') + '_cb=' + Date.now();
  });
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y,     x + w, y + r,     r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x,     y + h, x,     y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y,     x + r, y,             r);
  ctx.closePath();
}

function circleClipImage(ctx, img, cx, cy, r) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  if (img) ctx.drawImage(img, cx - r, cy - r, r * 2, r * 2);
  else {
    ctx.fillStyle = '#1e293b';
    ctx.fill();
  }
  ctx.restore();
}

async function renderCombosToCanvas(combosData, title) {
  // ── Layout constants ────────────────────────────────────
  const S        = 2;           // retina scale
  const W        = 820;         // logical width
  const PAD      = 28;          // outer padding
  const HDR_H    = 72;          // header height
  const CARD_H   = 160;         // each combo card height
  const CARD_GAP = 12;
  const FOOT_H   = 42;
  const n        = combosData.length;
  const H        = HDR_H + PAD + n * (CARD_H + CARD_GAP) - CARD_GAP + PAD + FOOT_H;

  const canvas  = document.createElement('canvas');
  canvas.width  = W * S;
  canvas.height = H * S;
  const ctx     = canvas.getContext('2d');
  ctx.scale(S, S);

  // ── Background ──────────────────────────────────────────
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0,   '#0d1628');
  bg.addColorStop(1,   '#020617');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Subtle dot grid
  ctx.fillStyle = 'rgba(37,99,235,0.04)';
  for (let gx = 0; gx < W; gx += 28)
    for (let gy = 0; gy < H; gy += 28)
      { ctx.beginPath(); ctx.arc(gx, gy, 1, 0, Math.PI*2); ctx.fill(); }

  // ── Header ──────────────────────────────────────────────
  // Logo (try to load)
  const logoImg = await loadImageCrossOrigin('images/logo.png');
  if (logoImg) {
    const lSize = 44;
    ctx.save();
    roundRect(ctx, PAD, (HDR_H - lSize) / 2, lSize, lSize, 10);
    ctx.clip();
    ctx.drawImage(logoImg, PAD, (HDR_H - lSize) / 2, lSize, lSize);
    ctx.restore();
  }
  const titleX = logoImg ? PAD + 54 : PAD;

  ctx.font = 'bold 22px Inter, system-ui, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(title, titleX, 30);

  ctx.font = '600 12px Inter, system-ui, sans-serif';
  ctx.fillStyle = '#60a5fa';
  ctx.fillText('TEAM VTS — STATE 1097  •  Rise of Castles: Ice & Fire', titleX, 50);

  // Divider
  const grad = ctx.createLinearGradient(PAD, 0, W - PAD, 0);
  grad.addColorStop(0,   'rgba(59,130,246,0.6)');
  grad.addColorStop(0.5, 'rgba(59,130,246,0.2)');
  grad.addColorStop(1,   'rgba(59,130,246,0)');
  ctx.strokeStyle = grad;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PAD, HDR_H - 1);
  ctx.lineTo(W - PAD, HDR_H - 1);
  ctx.stroke();

  // ── Combo Cards ─────────────────────────────────────────
  const IMG_R   = 54;          // hero circle radius
  const IMG_D   = IMG_R * 2;
  const HEROES  = 3;
  const NAME_H  = 18;
  const ITEM_W  = IMG_D + 20;  // horizontal space per hero
  const HEROES_BLOCK_W = HEROES * ITEM_W + (HEROES - 1) * 10;

  // Pre-load all hero images in parallel
  const allUrls = combosData.flatMap(c => c.heroes.map(n2 => getHeroImageUrl(n2)));
  const imgCache = {};
  await Promise.all([...new Set(allUrls)].map(async url => {
    imgCache[url] = await loadImageCrossOrigin(url);
  }));

  for (let i = 0; i < n; i++) {
    const combo = combosData[i];
    const cardY = HDR_H + PAD + i * (CARD_H + CARD_GAP);

    // Card background
    ctx.save();
    roundRect(ctx, PAD, cardY, W - PAD * 2, CARD_H, 16);
    const cardBg = ctx.createLinearGradient(PAD, cardY, W - PAD, cardY + CARD_H);
    cardBg.addColorStop(0, '#1e2d47');
    cardBg.addColorStop(1, '#182135');
    ctx.fillStyle = cardBg;
    ctx.fill();
    // Border
    roundRect(ctx, PAD, cardY, W - PAD * 2, CARD_H, 16);
    ctx.strokeStyle = 'rgba(51,65,85,0.8)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    // Rank badge
    const BADGE_R = 20;
    const badgeX  = PAD + 38;
    const badgeY  = cardY + CARD_H / 2;
    const badgeGrad = ctx.createRadialGradient(badgeX, badgeY - 4, 2, badgeX, badgeY, BADGE_R);
    badgeGrad.addColorStop(0, '#fb923c');
    badgeGrad.addColorStop(1, '#ea580c');
    ctx.beginPath();
    ctx.arc(badgeX, badgeY, BADGE_R, 0, Math.PI * 2);
    ctx.fillStyle = badgeGrad;
    ctx.fill();
    ctx.font = 'bold 16px Inter, system-ui, sans-serif';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText(String(i + 1), badgeX, badgeY + 5.5);
    ctx.textAlign = 'left';

    // Hero images — centred in card
    const heroesStartX = PAD + 80;
    const availW       = (W - PAD * 2) - 80 - 140; // space between badge and score
    const heroSpacing  = availW / HEROES;
    const imgCY        = cardY + CARD_H / 2 - NAME_H / 2 - 4;

    combo.heroes.forEach((heroName, hi) => {
      const cx = heroesStartX + hi * heroSpacing + heroSpacing / 2;
      const url = getHeroImageUrl(heroName);
      const img = imgCache[url];

      // Circle border glow
      ctx.save();
      ctx.shadowColor = 'rgba(59,130,246,0.35)';
      ctx.shadowBlur  = 12;
      ctx.beginPath();
      ctx.arc(cx, imgCY, IMG_R + 2, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(59,130,246,0.5)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();

      // Circular hero image
      circleClipImage(ctx, img, cx, imgCY, IMG_R);

      // Hero name label
      const nameY = imgCY + IMG_R + 14;
      ctx.font = '600 11px Inter, system-ui, sans-serif';
      ctx.fillStyle = '#93c5fd';
      ctx.textAlign = 'center';
      // Truncate long names
      let label = heroName;
      while (ctx.measureText(label).width > heroSpacing - 8 && label.length > 3)
        label = label.slice(0, -1);
      if (label !== heroName) label += '…';
      ctx.fillText(label, cx, nameY);
      ctx.textAlign = 'left';
    });

    // Score box (right side)
    const scoreX = W - PAD - 120;
    const scoreY = cardY + CARD_H / 2;
    ctx.font = '700 10px Inter, system-ui, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'center';
    ctx.letterSpacing = '2px';
    ctx.fillText('SCORE', scoreX + 50, scoreY - 14);
    ctx.letterSpacing = '0px';

    // Score value with gradient text (via fillStyle only — no gradient text on canvas)
    const score = combo.displayScore || combo.score || '—';
    ctx.font = 'bold 32px Inter, system-ui, sans-serif';
    ctx.fillStyle = i === 0 ? '#38bdf8' : i === 1 ? '#60a5fa' : i === 2 ? '#818cf8' : '#94a3b8';
    ctx.textAlign = 'center';
    ctx.fillText(String(score), scoreX + 50, scoreY + 16);
    ctx.textAlign = 'left';

    // Rank label under score
    const medals = ['🥇', '🥈', '🥉'];
    if (i < 3) {
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(medals[i], scoreX + 50, scoreY + 38);
    }
    ctx.textAlign = 'left';
  }

  // ── Footer ───────────────────────────────────────────────
  const footY = H - FOOT_H + 10;
  ctx.font = '500 11px Inter, system-ui, sans-serif';
  ctx.fillStyle = 'rgba(100,116,139,0.7)';
  ctx.textAlign = 'center';
  ctx.fillText('Generated by VTS 1097 Hero Combo Creator  •  Rise of Castles: Ice & Fire', W / 2, footY);
  ctx.fillText(new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }), W / 2, footY + 18);
  ctx.textAlign = 'left';

  return canvas;
}

async function downloadComboImage(combosData, title, filename) {
  if (!combosData || !combosData.length) return;
  if (typeof window.showToast === 'function') window.showToast('⏳ Building image…', 'info', 2000);
  try {
    const canvas = await renderCombosToCanvas(combosData, title);
    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL('image/png');
    link.click();
    if (typeof window.showToast === 'function') window.showToast('✅ Image downloaded!', 'success');
  } catch (err) {
    console.error('Canvas render error:', err);
    if (typeof window.showToast === 'function') window.showToast('❌ Image failed', 'error');
  }
}

// Keep old name so nothing else breaks
function captureElementAsImage(element, filename) {
  // Legacy fallback — only used if called directly with no data
  const h2c = window.html2canvas;
  if (!h2c) return;
  h2c(element, { backgroundColor: '#020617', useCORS: true, scale: 2 })
    .then(canvas => {
      const link = document.createElement('a');
      link.download = filename;
      link.href = canvas.toDataURL('image/png');
      link.click();
    }).catch(err => console.error('html2canvas error:', err));
}

// --- TOUCH DRAG & RENDER MOVED TO MODULAR FILES ---
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
      slot.classList.add('ring-2', 'ring-blue-500', 'bg-slate-800/50'); // Highlight effect
    });
    
    slot.addEventListener('dragleave', e => {
      slot.classList.remove('ring-2', 'ring-blue-500', 'bg-slate-800/50');
    });

    slot.addEventListener('drop', e => {
      e.preventDefault();
      slot.classList.remove('ring-2', 'ring-blue-500', 'bg-slate-800/50');
      
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

  function onTabActivated(tabName) {
    if (tabName === 'edenMap' && !_edenMapReady && !_edenMapBooting) {
      _edenMapBooting = true;
      const root = document.getElementById('edenMapRoot');
      root?.classList.add('eden-map-loading');
      import('./eden-map.js')
        .then((mod) => mod.bootEdenMapPlanner())
        .then(() => {
          _edenMapReady = true;
        })
        .catch((err) => {
          console.error('Eden map failed to load', err);
          _edenMapBooting = false;
          if (typeof window.showToast === 'function') {
            window.showToast('Eden map failed to load. Refresh and try again.', 'error', 4000);
          }
        })
        .finally(() => {
          root?.classList.remove('eden-map-loading');
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
      import('./ocr-dashboard.js?v=' + new Date().getTime()).then(mod => mod.bootOcrDashboard()).catch(e => console.error('OCR dashboard load failed:', e));
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
    seasonFiltersEl.addEventListener('change', () => {
      setSelectedSeasons(getCheckedValues(seasonFiltersEl));
      if (!selectedSeasons.length) setSelectedSeasons(['S0', 'S1', 'S2', 'S3', 'S4', 'X1', 'X2']);
      renderAvailableHeroes();
    });
  }

  if (stateFiltersEl) {
    stateFiltersEl.addEventListener('change', () => {
      setSelectedStates(computeStateSelection(stateFiltersEl));
      renderAvailableHeroes();
    });
  }

  if (troopFiltersEl) {
    troopFiltersEl.addEventListener('change', () => {
      setSelectedTypes(computeTypeSelection(troopFiltersEl));
      renderAvailableHeroes();
    });
  }

  if (genSeasonFiltersEl) {
    genSeasonFiltersEl.addEventListener('change', () => {
      setGeneratorSelectedSeasons(getCheckedValues(genSeasonFiltersEl));
      if (!generatorSelectedSeasons.length) setGeneratorSelectedSeasons(['S0', 'S1', 'S2', 'S3', 'S4', 'X1', 'X2']);
      renderGeneratorHeroes();
    });
  }

  if (genStateFiltersEl) {
    genStateFiltersEl.addEventListener('change', () => {
      setGeneratorSelectedStates(computeStateSelection(genStateFiltersEl));
      renderGeneratorHeroes();
    });
  }

  if (genTroopFiltersEl) {
    genTroopFiltersEl.addEventListener('change', () => {
      setGeneratorSelectedTypes(computeTypeSelection(genTroopFiltersEl));
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

function getNodeLevelMedals(node, levelIndex) {
    const genericCost = (node.costs && node.costs[levelIndex]) || 0;
    const wbCost = (node.warBadgeCosts && node.warBadgeCosts[levelIndex])
        || (node.wisdomCosts && node.wisdomCosts[levelIndex])
        || (node.wb_costs && node.wb_costs[levelIndex]) || 0;
    const cmCost = (node.courageCosts && node.courageCosts[levelIndex])
        || (node.cm_costs && node.cm_costs[levelIndex]) || 0;

    let wb = 0;
    let cm = 0;
    if (node.costType === 'Dual') {
        wb = wbCost > 0 ? wbCost : genericCost;
        cm = cmCost;
    } else if (node.costType === 'Courage') {
        cm = genericCost > 0 ? genericCost : cmCost;
    } else if (node.costType === 'Wisdom' || node.costType === 'War Badge' || node.costType === 'War Badges') {
        wb = genericCost > 0 ? genericCost : wbCost;
    }
    return { wb, cm };
}

function getTechMedalTotals(tech) {
    let wbMax = 0;
    let wbCurrent = 0;
    let cmMax = 0;
    let cmCurrent = 0;
    let levelsMax = 0;
    let levelsCurrent = 0;

    tech.nodes.forEach((node) => {
        const savedLevel = parseInt(localStorage.getItem(`tech_${tech.id}_${node.id}`), 10) || 0;
        levelsMax += node.maxLevel;
        levelsCurrent += savedLevel;
        for (let i = 0; i < node.maxLevel; i++) {
            const { wb, cm } = getNodeLevelMedals(node, i);
            wbMax += wb;
            cmMax += cm;
            if (i < savedLevel) {
                wbCurrent += wb;
                cmCurrent += cm;
            }
        }
    });

    const medalMax = wbMax + cmMax;
    const medalCurrent = wbCurrent + cmCurrent;
    const pct = medalMax > 0
        ? (medalCurrent / medalMax) * 100
        : (levelsMax > 0 ? (levelsCurrent / levelsMax) * 100 : 0);

    return {
        wbMax, wbCurrent, cmMax, cmCurrent,
        medalMax, medalCurrent,
        pct,
        remainingWb: wbMax - wbCurrent,
        remainingCm: cmMax - cmCurrent,
    };
}

function syncTechSeasonButtons() {
    document.querySelectorAll('.tech-season-btn').forEach((btn) => {
        const season = btn.dataset.season;
        const isActive = activeTechSeasons.has(season);
        btn.classList.toggle('active', isActive);
        if (isActive) {
            btn.style.setProperty('--sc', TechseasonColors[season] || '#38bdf8');
        } else {
            btn.style.removeProperty('--sc');
        }
    });
    syncResearchQuickButtons();
}

function syncResearchQuickButtons() {
    const allBtn = document.getElementById('techSeasonAllBtn');
    const currentBtn = document.getElementById('techSeasonX1Btn');
    const isAll = TECH_SEASON_ORDER.every((s) => activeTechSeasons.has(s));
    const isX1Only = activeTechSeasons.size === 1 && activeTechSeasons.has('X1');
    allBtn?.classList.toggle('active', isAll);
    currentBtn?.classList.toggle('active', isX1Only);
}

function closeTechCalculator() {
    const container = document.getElementById('techCalculatorContainer');
    if (!container || container.classList.contains('hidden')) return;
    container.classList.add('research-calculator--closing');
    window.setTimeout(() => {
        container.classList.add('hidden');
        container.classList.remove('research-calculator--closing');
    }, 200);
}

function updateTechSeasons(seasons) {
    setActiveTechSeasons(new Set(seasons));
    syncTechSeasonButtons();
    renderTechList();
    closeTechCalculator();
}

function getFilteredTechTrees() {
    const q = techSearchQuery.trim().toLowerCase();
    return techDatabase
        .filter((tech) => activeTechSeasons.has(tech.season))
        .filter((tech) => {
            if (!q) return true;
            const hay = `${tech.name} ${tech.season} ${tech.unlockCondition} ${tech.primaryResource}`.toLowerCase();
            return hay.includes(q);
        })
        .sort((a, b) => {
            const si = TECH_SEASON_ORDER.indexOf(a.season) - TECH_SEASON_ORDER.indexOf(b.season);
            if (si !== 0) return si;
            const ar = a.default_pos?.row || 99;
            const br = b.default_pos?.row || 99;
            if (ar !== br) return ar - br;
            return (a.default_pos?.col || 99) - (b.default_pos?.col || 99);
        });
}

function initResearchCalculator() {
    const researchSection = document.getElementById('researchSection');
    if (!researchSection) return;

    if (!ENABLE_RESEARCH_FEATURE) {
        researchSection.innerHTML = `
            <div class="mb-6 text-center py-16 bg-slate-900/50 rounded-2xl border border-slate-800 shadow-inner">
                <h2 class="text-2xl sm:text-3xl font-black text-amber-400 uppercase tracking-widest mb-2 drop-shadow-md">Under Construction</h2>
            </div>
        `;
        return;
    }

    const seasonBtns = document.querySelectorAll('.tech-season-btn');
    if (!seasonBtns.length) return;

    syncTechSeasonButtons();

    seasonBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
            const season = btn.dataset.season;
            if (activeTechSeasons.has(season)) {
                if (activeTechSeasons.size > 1) activeTechSeasons.delete(season);
            } else {
                activeTechSeasons.add(season);
            }
            syncTechSeasonButtons();
            renderTechList();
            closeTechCalculator();
        });
    });

    document.getElementById('techSeasonAllBtn')?.addEventListener('click', () => {
        updateTechSeasons(TECH_SEASON_ORDER);
    });

    document.getElementById('techSeasonX1Btn')?.addEventListener('click', () => {
        updateTechSeasons(['X1']);
    });

    const searchInput = document.getElementById('techSearchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            setTechSearchQuery(e.target.value);
            renderTechList();
        });
    }

    renderTechList();
}
function renderTechList() {
    const container = document.getElementById('techListContainer');
    if (!container) return;

    container.classList.add('research-list--updating');

    if (!document.getElementById('dynamic-tech-grid-styles')) {
        const style = document.createElement('style');
        style.id = 'dynamic-tech-grid-styles';
        style.innerHTML = `
            @media (min-width: 1024px) {
                .tech-card-pos { grid-row: var(--desk-row); grid-column: var(--desk-col); }
            }
        `;
        document.head.appendChild(style);
    }

    const filteredTechs = getFilteredTechTrees();
    updateGlobalSummary(filteredTechs);

    const countEl = document.getElementById('techTreeCount');
    if (countEl) {
        countEl.textContent = appT('researchTreeCount', { n: filteredTechs.length });
    }

    container.innerHTML = '<div class="research-grid" id="techGridWrapper"></div>';
    const wrapper = document.getElementById('techGridWrapper');

    if (filteredTechs.length === 0) {
        const emptyMsg = techSearchQuery.trim()
            ? appT('researchNoResults')
            : appT('researchNoData');
        wrapper.innerHTML = `<p class="research-empty">${emptyMsg}</p>`;
        requestAnimationFrame(() => container.classList.remove('research-list--updating'));
        return;
    }

    let lastSeason = null;
    const showSeasonHeaders = activeTechSeasons.size > 1;
    let cardIndex = 0;

    filteredTechs.forEach((tech) => {
        if (showSeasonHeaders && tech.season !== lastSeason) {
            lastSeason = tech.season;
            const header = document.createElement('div');
            header.className = 'research-season-header';
            header.style.setProperty('--season-color', TechseasonColors[tech.season] || '#3b82f6');
            header.innerHTML = `<span class="research-season-chip">${tech.season}</span><span class="research-season-line"></span>`;
            wrapper.appendChild(header);
        }

        const sColor = TechseasonColors[tech.season] || '#3b82f6';
        const totals = getTechMedalTotals(tech);
        const r = tech.default_pos?.row || 'auto';
        const c = tech.default_pos?.col || 'auto';

        const card = document.createElement('div');
        card.className = 'tech-card-pos tech-card-hover research-tech-card';
        card.setAttribute('role', 'button');
        card.tabIndex = 0;
        card.style.cssText = `
            --desk-row: ${r};
            --desk-col: ${c};
            --season-color: ${sColor};
            --hover-color: ${sColor}40;
            --border-color: ${sColor};
            --card-delay: ${Math.min(cardIndex * 35, 280)}ms;
        `;
        cardIndex += 1;

        const resourceLabel = tech.primaryResource || '—';
        const progressPct = Math.min(100, Math.max(0, totals.pct));

        card.innerHTML = `
            <button type="button" class="research-card-max" onclick="quickMaxTech(event, '${tech.id}')">MAX</button>
            <div class="research-card-head">
                <h3 class="research-card-title">${tech.name}</h3>
                <span class="research-card-season">${tech.season}</span>
            </div>
            <p class="research-card-unlock">${appT('researchUnlock')}: ${tech.unlockCondition}</p>
            <p class="research-card-resource">${resourceLabel}</p>
            <div class="research-card-progress">
                <div class="research-card-progress-bar" style="width:${progressPct.toFixed(1)}%"></div>
            </div>
            <span class="research-card-pct">${appT('researchProgress', { pct: progressPct.toFixed(0) })}</span>
            <span class="research-card-cta">${appT('researchOpenCalc')}</span>
        `;

        const openCalc = () => renderCalculator(tech);
        card.addEventListener('click', openCalc);
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openCalc(); }
        });
        wrapper.appendChild(card);
    });

    let sourceNote = document.getElementById('researchSourceNote');
    if (!sourceNote) {
        sourceNote = document.createElement('p');
        sourceNote.id = 'researchSourceNote';
        sourceNote.className = 'research-source-note';
        container.appendChild(sourceNote);
    }
    sourceNote.textContent = sourceCreditText;
    requestAnimationFrame(() => container.classList.remove('research-list--updating'));
}
function updateGlobalSummary(filteredTechs = null) {
    if (!filteredTechs) filteredTechs = getFilteredTechTrees();

    let totalWbMax = 0;
    let totalWbCurrent = 0;
    let totalCmMax = 0;
    let totalCmCurrent = 0;

    filteredTechs.forEach((tech) => {
        const t = getTechMedalTotals(tech);
        totalWbMax += t.wbMax;
        totalWbCurrent += t.wbCurrent;
        totalCmMax += t.cmMax;
        totalCmCurrent += t.cmCurrent;
    });

    const remainingWb = totalWbMax - totalWbCurrent;
    const remainingCm = totalCmMax - totalCmCurrent;
    const totalMedalsMax = totalWbMax + totalCmMax;
    const totalMedalsCurrent = totalWbCurrent + totalCmCurrent;
    const progressPercent = totalMedalsMax > 0 ? (totalMedalsCurrent / totalMedalsMax) * 100 : 0;

    const summaryEl = document.getElementById('globalTechSummary');
    if (!summaryEl) return;

    if (totalMedalsMax === 0 && filteredTechs.length === 0) {
        summaryEl.innerHTML = '';
        return;
    }

    const iconCM = '<img src="images/CM.png" class="research-medal-icon" alt="CM">';
    const iconWB = '<img src="images/WB.png" class="research-medal-icon" alt="WB">';

    summaryEl.innerHTML = `
        <div class="research-summary-card">
            <h3 class="research-summary-title">${appT('researchGlobalSummary')}</h3>
            <div class="research-summary-progress-wrap">
                <div class="research-summary-progress-labels">
                    <span>${appT('researchCombinedCompletion')}</span>
                    <span class="research-summary-pct">${progressPercent.toFixed(1)}%</span>
                </div>
                <div class="research-summary-progress-track">
                    <div class="research-summary-progress-fill" style="width:${progressPercent}%"></div>
                </div>
            </div>
            <div class="research-summary-stats">
                ${totalWbMax > 0 ? `
                <div class="research-summary-stat research-summary-stat-wb">
                    <span class="research-summary-stat-label">${appT('researchRemainingWb')}</span>
                    <span class="research-summary-stat-value">${iconWB} ${remainingWb.toLocaleString()}</span>
                    <span class="research-summary-stat-total">${appT('researchOfTotal', { n: totalWbMax.toLocaleString() })}</span>
                </div>` : ''}
                ${totalCmMax > 0 ? `
                <div class="research-summary-stat research-summary-stat-cm">
                    <span class="research-summary-stat-label">${appT('researchRemainingCm')}</span>
                    <span class="research-summary-stat-value">${iconCM} ${remainingCm.toLocaleString()}</span>
                    <span class="research-summary-stat-total">${appT('researchOfTotal', { n: totalCmMax.toLocaleString() })}</span>
                </div>` : ''}
            </div>
        </div>
    `;
}

function applyAutoGridToGroup(groupNodes) {
    let r = 1;
    let lastType = '';
    let colsInRow = new Set();

    groupNodes.forEach((node, i) => {
        if (node.row && node.col) {
            r = node.row;
            colsInRow.add(node.col);
            return;
        }

        let t = node.troop ? node.troop.toLowerCase() : '';
        let type = (t === 'all' || t.includes('lofty') || !t) ? 'ALL' : 'SPECIFIC';
        
        let c = 2; 
        if (t.includes('footm')) c = 1; 
        if (t.includes('arch')) c = 3;  

        if (type !== lastType && colsInRow.size > 0) {
            r++;
            colsInRow.clear();
        }

        if (colsInRow.has(c)) {
            if (type === 'ALL') {
                if (!colsInRow.has(1)) c = 1;
                else if (!colsInRow.has(3)) c = 3;
                else { r++; colsInRow.clear(); c = 2; }
            } else {
                r++;
                colsInRow.clear();
            }
        }

        if (type === 'ALL' && colsInRow.size === 0) {
            let next = groupNodes[i + 1];
            let nextIsAll = next && (!next.troop || next.troop.toLowerCase() === 'all' || next.troop.toLowerCase().includes('lofty'));
            let nextNext = groupNodes[i + 2];
            let nextNextIsAll = nextNext && (!nextNext.troop || nextNext.troop.toLowerCase() === 'all');
            
            if (nextIsAll && (!nextNext || !nextNextIsAll)) c = 1; 
        } else if (type === 'ALL' && colsInRow.has(1) && !colsInRow.has(2)) {
             c = 3; 
        }

        node.row = r;
        node.col = c;
        colsInRow.add(c);
        lastType = type;
    });
}

function usesGameTreeLayout(tech) {
    if (tech.layoutMode === 'branch') return false;
    if (tech.layoutMode === 'game') return true;
    const hasTroopBranches = tech.nodes.some(
        (n) => n.b == 1 || n.b == 2 || n.b == 3 || n.b === '1' || n.b === '2' || n.b === '3'
    );
    if (hasTroopBranches) return false;
    return tech.nodes.every((n) => n.row && n.col);
}

function getGameTroopClass(troop) {
    const t = (troop || '').toLowerCase();
    if (t.includes('arch')) return 'archer';
    if (t.includes('cav')) return 'cavalry';
    if (t === 'all' || !t) return 'all';
    return 'footmen';
}

function getStoredNodeLevel(techId, nodeId) {
    return parseInt(localStorage.getItem(`tech_${techId}_${nodeId}`), 10) || 0;
}

function formatGameNodeLevel(node, level) {
    if (level >= node.maxLevel) return 'MAX';
    return `${level}/${node.maxLevel}`;
}

function syncGameNodeVisual(node, level, wrapEl) {
    const wraps = wrapEl
        ? [wrapEl]
        : Array.from(document.querySelectorAll(`.game-tech-node-wrap[data-node-id="${node.id}"]`));
    wraps.forEach((wrap) => {
        const pct = node.maxLevel > 0 ? (level / node.maxLevel) * 100 : 0;
        wrap.style.setProperty('--node-pct', `${pct}%`);
        wrap.style.setProperty('--node-deg', String((pct / 100) * 360));
        const tap = wrap.querySelector('.game-tech-tap');
        const lvlEl = wrap.querySelector('.game-tech-level-badge');
        const input = wrap.querySelector('.tech-node-input');
        const maxBtn = wrap.querySelector('.game-tech-step--max');
        if (lvlEl) lvlEl.textContent = formatGameNodeLevel(node, level);
        if (input) input.value = level;
        if (tap) {
            tap.setAttribute('aria-label', `${node.name}: level ${level} of ${node.maxLevel}`);
            tap.classList.toggle('game-tech-tap--maxed', level >= node.maxLevel);
            tap.classList.toggle('game-tech-tap--progress', level > 0 && level < node.maxLevel);
        }
        if (maxBtn) {
            const isMaxed = level >= node.maxLevel;
            maxBtn.textContent = isMaxed ? '↩' : 'MAX';
            maxBtn.dataset.step = isMaxed ? '0' : 'max';
            maxBtn.classList.toggle('game-tech-step--undo', isMaxed);
        }
    });
}

function syncGameNodeButton(node, level) {
    syncGameNodeVisual(node, level);
}

function pulseGameNodeWrap(wrapEl) {
    if (!wrapEl) return;
    wrapEl.classList.remove('game-tech-node-wrap--pulse');
    void wrapEl.offsetWidth;
    wrapEl.classList.add('game-tech-node-wrap--pulse');
    window.setTimeout(() => wrapEl.classList.remove('game-tech-node-wrap--pulse'), 320);
}

function buildGameTreeTierHtml(nodesInRow) {
    const slots = [null, null, null];
    nodesInRow.forEach((node) => {
        const col = Math.min(3, Math.max(1, node.col || 2)) - 1;
        slots[col] = node;
    });
    const wideConnector = nodesInRow.length >= 3 ? ' game-tree-connector--wide' : '';
    let html = '<div class="game-tree-tier">';
    slots.forEach((node, idx) => {
        if (node) {
            const level = getStoredNodeLevel(node._techId || node.techId, node.id);
            const troopClass = getGameTroopClass(node.troop);
            const shortName = node.name.replace(/\s+(I|II|III|IV)$/i, '').trim();
            const pct = node.maxLevel > 0 ? (level / node.maxLevel) * 100 : 0;
            const tapState = level >= node.maxLevel
                ? ' game-tech-tap--maxed'
                : level > 0 ? ' game-tech-tap--progress' : '';
            const maxLabel = level >= node.maxLevel ? '↩' : 'MAX';
            const maxStep = level >= node.maxLevel ? '0' : 'max';
            const maxUndo = level >= node.maxLevel ? ' game-tech-step--undo' : '';
            const iconMeta = resolveTechNodeIcon(node);
            html += `
              <div class="tech-node-container game-tech-node-wrap game-tech-node-wrap--${troopClass}"
                style="--node-col:${node.col || idx + 1}; --node-pct:${pct}%; --node-deg:${(pct / 100) * 360}; --node-icon-tint:${iconMeta.tint}"
                data-node-id="${node.id}" data-icon-id="${iconMeta.id}">
                <button type="button" class="game-tech-tap game-tech-tap--${troopClass}${tapState}"
                  aria-label="${escapeHtml(node.name)}: level ${level} of ${node.maxLevel}">
                  <span class="game-tech-medallion" aria-hidden="true">
                    <span class="game-tech-ring"></span>
                    <span class="game-tech-core">
                      <span class="game-tech-icon">${renderTechNodeIconSvg(node)}</span>
                    </span>
                    <span class="game-tech-level-badge">${formatGameNodeLevel(node, level)}</span>
                  </span>
                </button>
                <div class="game-tech-stepper" role="group" aria-label="${escapeHtml(node.name)} level controls">
                  <button type="button" class="game-tech-step" data-step="-1" aria-label="Decrease level">−</button>
                  <button type="button" class="game-tech-step game-tech-step--max${maxUndo}" data-step="${maxStep}">${maxLabel}</button>
                  <button type="button" class="game-tech-step" data-step="1" aria-label="Increase level">+</button>
                </div>
                <div class="node-cost-display game-tech-cost-pill" aria-live="polite"></div>
                <span class="game-tech-name" title="${escapeHtml(node.name)}">${escapeHtml(shortName)}</span>
                <input type="number" class="tech-node-input" min="0" max="${node.maxLevel}" value="${level}" tabindex="-1" aria-hidden="true" hidden>
              </div>`;
        } else {
            html += '<span class="game-tree-slot" aria-hidden="true"></span>';
        }
    });
    html += `</div><div class="game-tree-connector${wideConnector}" aria-hidden="true"></div>`;
    return html;
}

function renderGameTreePageHtml(tech, pageNodes) {
    const rowMap = {};
    pageNodes.forEach((node) => {
        const row = node.row || 1;
        if (!rowMap[row]) rowMap[row] = [];
        rowMap[row].push({ ...node, _techId: tech.id });
    });
    const rowKeys = Object.keys(rowMap).map(Number).sort((a, b) => a - b);
    let html = '<div class="research-game-tree">';
    rowKeys.forEach((rk, i) => {
        rowMap[rk].sort((a, b) => (a.col || 0) - (b.col || 0));
        html += buildGameTreeTierHtml(rowMap[rk]);
        if (i === rowKeys.length - 1) {
            html = html.replace(/<div class="game-tree-connector[^"]*"[^>]*><\/div>$/, '');
        }
    });
    html += '</div>';
    return html;
}

function bindGameNodePress(el, { onTap, onLong, longMs = 480 } = {}) {
    let timer = null;
    let longFired = false;
    const clear = () => {
        if (timer) {
            clearTimeout(timer);
            timer = null;
        }
    };
    el.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        longFired = false;
        clear();
        if (onLong) {
            timer = window.setTimeout(() => {
                longFired = true;
                onLong();
            }, longMs);
        }
    });
    el.addEventListener('pointerup', clear);
    el.addEventListener('pointerleave', clear);
    el.addEventListener('pointercancel', clear);
    el.addEventListener('click', (e) => {
        e.preventDefault();
        if (longFired) {
            longFired = false;
            return;
        }
        onTap?.(e);
    });
}

function wireGameTechNodeContainers(rootEl, tech) {
    const updateFns = [];
    rootEl.querySelectorAll('.game-tech-node-wrap').forEach((wrap) => {
        const input = wrap.querySelector('.tech-node-input');
        const tap = wrap.querySelector('.game-tech-tap');
        const nodeId = wrap.dataset.nodeId;
        const node = tech.nodes.find((n) => n.id === nodeId);
        if (!input || !node) return;

        const max = parseInt(input.max, 10);
        let current = parseInt(input.value, 10) || 0;

        const updateLevel = (val, { pulse = true } = {}) => {
            let v = typeof val === 'string' && val === 'max' ? max : parseInt(val, 10);
            if (isNaN(v) || v < 0) v = 0;
            if (v > max) v = max;
            const changed = v !== current;
            current = v;
            input.value = v;
            localStorage.setItem(`tech_${tech.id}_${nodeId}`, v);
            syncGameNodeVisual(node, v, wrap);
            if (changed && pulse) pulseGameNodeWrap(wrap);
            calculateTechTotals(tech);
        };

        const bump = (delta) => {
            if (delta > 0 && current >= max) {
                pulseGameNodeWrap(wrap);
                return;
            }
            updateLevel(current + delta);
        };

        updateFns.push({ nodeId, updateLevel, max });

        if (tap) {
            bindGameNodePress(tap, {
                onTap: () => bump(1),
                onLong: () => updateLevel(max),
            });
        }

        wrap.querySelectorAll('.game-tech-step').forEach((btn) => {
            const step = btn.dataset.step;
            if (step === '-1') {
                bindGameNodePress(btn, {
                    onTap: () => bump(-1),
                    onLong: () => updateLevel(0),
                    longMs: 520,
                });
                return;
            }
            bindGameNodePress(btn, {
                onTap: () => {
                    if (step === 'max') updateLevel(max);
                    else if (step === '0') updateLevel(0);
                    else bump(parseInt(step, 10) || 0);
                },
            });
        });
    });
    return updateFns;
}

function renderGameCalculator(tech, container) {
    const pages = tech.treePages || null;
    const pageGroups = {};
    tech.nodes.forEach((node) => {
        const p = node.page || 1;
        if (!pageGroups[p]) pageGroups[p] = [];
        pageGroups[p].push(node);
    });
    const pageIds = Object.keys(pageGroups).map(Number).sort((a, b) => a - b);

    const pageTabsHtml = pages && pageIds.length > 1
        ? `<div class="research-page-tabs" role="tablist">${pageIds.map((pid, i) =>
            `<button type="button" class="research-page-tab${i === 0 ? ' active' : ''}" role="tab" data-game-page="${pid}" aria-selected="${i === 0}">${escapeHtml(pages[pid - 1] || `Page ${pid}`)}</button>`
          ).join('')}</div>`
        : '';

    const pagesHtml = pageIds.map((pid, i) =>
        `<div class="research-game-page${i === 0 ? ' active' : ''}" data-game-page-panel="${pid}" role="tabpanel">${renderGameTreePageHtml(tech, pageGroups[pid])}</div>`
    ).join('');

    container.innerHTML = `
      <div class="research-calc-top">
        <div class="research-calc-header">
          <div>
            <h3 class="research-calc-title">${escapeHtml(tech.name)} <span class="research-calc-season">(${tech.season})</span></h3>
            <p class="research-calc-sub">Primary Cost: <span class="text-white">${escapeHtml(tech.primaryResource)}</span></p>
          </div>
          <button type="button" id="closeCalcBtn" class="research-calc-close" aria-label="Close calculator">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
        <div class="research-calc-actions">
          <button type="button" id="resetAllTechBtn" class="research-calc-btn research-calc-btn--reset">Reset All</button>
          <button type="button" id="maxAllTechBtn" class="research-calc-btn research-calc-btn--max">Max All</button>
        </div>
      </div>
      <div class="research-game-shell">
        <div class="research-game-titlebar"><span class="research-game-title">${escapeHtml(tech.name)}</span></div>
        ${pageTabsHtml}
        <div class="research-game-tree-viewport">${pagesHtml}</div>
        <p class="research-game-footer">${appT('researchGameHint')}</p>
      </div>
      <div class="research-calc-total">
        <div class="flex flex-col">
          <span class="text-[11px] sm:text-sm text-amber-500 font-bold uppercase tracking-widest mb-0.5 sm:mb-1">Tree Total</span>
          <span class="text-[10px] sm:text-sm text-slate-400">Total remaining for this specific tree</span>
        </div>
        <div id="totalTechCost" class="flex flex-col items-start sm:items-end gap-1.5 sm:gap-2 tabular-nums"></div>
      </div>`;

    requestAnimationFrame(() => container.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    document.getElementById('closeCalcBtn').onclick = closeTechCalculator;

    const updateFns = wireGameTechNodeContainers(container, tech);

    container.querySelectorAll('.research-page-tab').forEach((tab) => {
        tab.addEventListener('click', () => {
            const pid = tab.dataset.gamePage;
            container.querySelectorAll('.research-page-tab').forEach((t) => {
                t.classList.toggle('active', t === tab);
                t.setAttribute('aria-selected', t === tab ? 'true' : 'false');
            });
            container.querySelectorAll('.research-game-page').forEach((p) => {
                p.classList.toggle('active', p.dataset.gamePagePanel === pid);
            });
        });
    });

    document.getElementById('resetAllTechBtn')?.addEventListener('click', () => updateFns.forEach((o) => o.updateLevel(0)));
    document.getElementById('maxAllTechBtn')?.addEventListener('click', () => updateFns.forEach((o) => o.updateLevel(o.max)));
    calculateTechTotals(tech);
}

function renderCalculator(tech) {
    const container = document.getElementById('techCalculatorContainer');
    container.classList.remove('hidden', 'research-calculator--closing');

    // 1. Cleanly normalize the manual Row/Col/Branch tags from the DB. 
    // ZERO auto-guessing logic here.
    tech.nodes.forEach((node) => {
        if (node.Row !== undefined) node.row = node.Row;
        if (node.column !== undefined) node.col = node.column;
        if (node.branch !== undefined) node.b = node.branch;
    });

    if (usesGameTreeLayout(tech)) {
        renderGameCalculator(tech, container);
        return;
    }

    const trunkNodes = tech.nodes.filter(n => !n.b);
    const b1Nodes = tech.nodes.filter(n => n.b == 1 || n.b === '1');
    const b2Nodes = tech.nodes.filter(n => n.b == 2 || n.b === '2');
    const b3Nodes = tech.nodes.filter(n => n.b == 3 || n.b === '3');

    [trunkNodes, b1Nodes, b2Nodes, b3Nodes].forEach(group => {
        if (group.length) applyAutoGridToGroup(group);
    });

    const buildNodeHtml = (node) => {
        const savedLevel = parseInt(localStorage.getItem(`tech_${tech.id}_${node.id}`)) || 0;
        const isMaxed = savedLevel === node.maxLevel;
        
        // Dynamic classes based on max status
        const maxedContainerStyle = isMaxed ? 'opacity-50 saturate-0 border-slate-800 shadow-none' : 'border-slate-700 hover:border-slate-500 shadow-xl';
        
        let quickButtonsHtml = `<button class="quick-set-btn px-1.5 sm:px-2 py-0.5 sm:py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-[9px] sm:text-[10px] font-bold transition-colors" data-val="0">0</button>`;
        if (node.maxLevel >= 5) quickButtonsHtml += `<button class="quick-set-btn px-1.5 sm:px-2 py-0.5 sm:py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-[9px] sm:text-[10px] font-bold transition-colors" data-val="5">5</button>`;
        if (node.maxLevel >= 10) quickButtonsHtml += `<button class="quick-set-btn px-1.5 sm:px-2 py-0.5 sm:py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-[9px] sm:text-[10px] font-bold transition-colors" data-val="10">10</button>`;
        if (node.maxLevel >= 15) quickButtonsHtml += `<button class="quick-set-btn px-1.5 sm:px-2 py-0.5 sm:py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-[9px] sm:text-[10px] font-bold transition-colors" data-val="15">15</button>`;
        if (node.maxLevel >= 20) quickButtonsHtml += `<button class="quick-set-btn px-1.5 sm:px-2 py-0.5 sm:py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-[9px] sm:text-[10px] font-bold transition-colors" data-val="20">20</button>`;
        
        // Smart Toggle Button
        let toggleText = isMaxed ? 'UNDO' : 'MAX';
        let toggleVal = isMaxed ? 0 : node.maxLevel;
        let toggleColor = isMaxed ? 'bg-slate-700 border-slate-500 hover:bg-slate-600 text-white' : 'bg-blue-900/50 border-blue-500/50 hover:bg-blue-800/70 text-blue-300';
        
        quickButtonsHtml += `<button class="quick-set-btn max-toggle-btn px-1.5 sm:px-2 py-0.5 sm:py-1 ${toggleColor} border rounded text-[9px] sm:text-[10px] font-black transition-colors" data-val="${toggleVal}">${toggleText}</button>`;

        let colClass = node.col ? `sm:col-start-${node.col}` : '';

        return `
            <div class="${colClass} flex justify-center w-full relative z-10">
                <div class="tech-node-container flex flex-col bg-slate-800/95 w-full sm:w-[310px] max-w-[340px] shrink-0 p-3 sm:p-5 rounded-xl sm:rounded-2xl border relative transition-all ${maxedContainerStyle}" data-node-id="${node.id}">
                    <div class="flex justify-between items-start mb-2 sm:mb-3">
                        <div class="pr-2 flex-1 min-w-0">
                            <span class="text-[13px] sm:text-base font-black text-white block leading-tight drop-shadow-sm break-words whitespace-normal">${node.name}</span>
                            <span class="text-[9px] sm:text-[11px] text-sky-400 font-semibold uppercase tracking-wider mt-0.5 sm:mt-1 block break-words whitespace-normal">${node.buff}</span>
                        </div>
                        <div class="flex flex-col items-end text-right shrink-0 min-w-[70px] sm:min-w-[90px]">
                            <span class="text-[8px] sm:text-[10px] uppercase tracking-widest text-slate-500 mb-1 font-bold">Remaining</span>
                            <div class="node-cost-display flex flex-col w-full gap-1 sm:gap-1.5 tabular-nums text-right text-[10px] sm:text-xs">
                            </div>
                        </div>
                    </div>
                    
                    <div class="flex flex-col gap-1.5 sm:gap-2 mt-auto">
                        <div class="flex items-center gap-2 sm:gap-4 bg-slate-900/80 p-1.5 sm:p-3 rounded-lg sm:rounded-xl border border-slate-700/50 shadow-inner">
                            <div class="flex flex-col items-center justify-center min-w-[40px] sm:min-w-[50px]">
                                <span class="text-[7px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Lvl</span>
                                <input type="number" min="0" max="${node.maxLevel}" value="${savedLevel}" class="tech-node-input w-10 sm:w-14 bg-slate-800 border border-slate-600 rounded text-center text-white font-black py-0.5 sm:py-1 text-[10px] sm:text-sm outline-none focus:border-blue-500 focus:bg-slate-700 transition-colors">
                            </div>
                            <input type="range" min="0" max="${node.maxLevel}" value="${savedLevel}" class="tech-node-slider flex-1 h-1.5 sm:h-2 bg-slate-700 rounded-full appearance-none cursor-pointer outline-none" style="accent-color: #3b82f6;">
                            <div class="flex flex-col items-center justify-center min-w-[25px] sm:min-w-[35px] px-1">
                                <span class="text-[7px] sm:text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Max</span>
                                <span class="text-[10px] sm:text-sm font-black text-slate-400">${node.maxLevel}</span>
                            </div>
                        </div>
                        <div class="flex justify-between gap-1 w-full mt-0.5 sm:mt-1">
                            ${quickButtonsHtml}
                        </div>
                    </div>
                </div>
            </div>
        `;
    };

    const renderNodeGroup = (nodes) => {
        let rowGroups = {};
        nodes.forEach(node => {
            if (!rowGroups[node.row]) rowGroups[node.row] = [];
            rowGroups[node.row].push(node);
        });
        const rKeys = Object.keys(rowGroups).map(Number).sort((a,b)=>a-b);
        
        let gHtml = '<div class="flex flex-col items-center w-full px-2">';
        rKeys.forEach((rk, i) => {
            const rNodes = rowGroups[rk];
            rNodes.sort((a,b) => a.col - b.col);
            
            gHtml += `<div class="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6 relative z-10 w-full max-w-[1000px] mb-3 sm:mb-4">`;
            rNodes.forEach(n => gHtml += buildNodeHtml(n));
            gHtml += `</div>`;
            
            if (i < rKeys.length - 1) {
                gHtml += `
                    <div class="flex flex-col items-center w-full relative z-0 -my-4 sm:-my-6 pointer-events-none opacity-70">
                        <div class="w-[2px] sm:w-[3px] h-6 sm:h-10 bg-gradient-to-b from-sky-500/60 via-sky-500/30 to-transparent shadow-[0_0_8px_rgba(14,165,233,0.5)] rounded-full"></div>
                    </div>`;
            }
        });
        gHtml += '</div>';
        return gHtml;
    };

    let html = `
        <div class="research-calc-top">
            <div class="research-calc-header">
                <div>
                    <h3 class="research-calc-title">${tech.name} <span class="research-calc-season">(${tech.season})</span></h3>
                    <p class="research-calc-sub">Primary Cost: <span class="text-white">${tech.primaryResource}</span></p>
                </div>
                <button type="button" id="closeCalcBtn" class="research-calc-close" aria-label="Close calculator">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
            </div>
            <div class="research-calc-actions">
                <button type="button" id="resetAllTechBtn" class="research-calc-btn research-calc-btn--reset">Reset All</button>
                <button type="button" id="maxAllTechBtn" class="research-calc-btn research-calc-btn--max">Max All</button>
            </div>
        </div>
        
        <div class="overflow-x-hidden overflow-y-auto max-h-[60vh] custom-scrollbar bg-slate-950/40 rounded-xl sm:rounded-2xl border border-slate-800 shadow-inner relative mb-3 sm:mb-4">
    `;

    let treeHtml = `<div class="flex flex-col items-center py-4 sm:py-6 w-full relative">`;
    
    if (trunkNodes.length) {
        treeHtml += renderNodeGroup(trunkNodes);
    }
    
    const hasBranches = b1Nodes.length || b2Nodes.length || b3Nodes.length;
    if (hasBranches) {
        if (trunkNodes.length) {
            treeHtml += `
                <div class="flex flex-col items-center w-full relative z-0 -my-2 sm:-my-4 pointer-events-none opacity-70">
                    <div class="w-[2px] sm:w-[3px] h-6 sm:h-10 bg-gradient-to-b from-sky-500/60 via-sky-500/30 to-transparent shadow-[0_0_8px_rgba(14,165,233,0.5)] rounded-full"></div>
                </div>
            `;
        }

        treeHtml += `
            <div class="research-branch-segment relative z-10 px-2">
                <button type="button" class="research-branch-btn branch-tab-btn active" data-target="branch_1">
                    <span>+</span><span>Footmen</span>
                </button>
                <button type="button" class="research-branch-btn branch-tab-btn" data-target="branch_2">
                    <span>+</span><span>Cavalry</span>
                </button>
                <button type="button" class="research-branch-btn branch-tab-btn" data-target="branch_3">
                    <span>+</span><span>Archer</span>
                </button>
            </div>
        `;

        treeHtml += `
            <div id="branch_1" class="branch-content w-full flex flex-col items-center animate-fade-in">
                ${b1Nodes.length ? renderNodeGroup(b1Nodes) : '<p class="text-slate-500 italic">No nodes in this branch</p>'}
            </div>
            <div id="branch_2" class="branch-content w-full flex flex-col items-center hidden">
                ${b2Nodes.length ? renderNodeGroup(b2Nodes) : '<p class="text-slate-500 italic">No nodes in this branch</p>'}
            </div>
            <div id="branch_3" class="branch-content w-full flex flex-col items-center hidden">
                ${b3Nodes.length ? renderNodeGroup(b3Nodes) : '<p class="text-slate-500 italic">No nodes in this branch</p>'}
            </div>
        `;
    }
    
    treeHtml += `</div></div>`; 

    html += treeHtml;

    html += `
        <div class="research-calc-total">
            <div class="flex flex-col">
                <span class="text-[11px] sm:text-sm text-amber-500 font-bold uppercase tracking-widest mb-0.5 sm:mb-1">Tree Total</span>
                <span class="text-[10px] sm:text-sm text-slate-400">Total remaining for this specific tree</span>
            </div>
            <div id="totalTechCost" class="flex flex-col items-start sm:items-end gap-1.5 sm:gap-2 tabular-nums"></div>
        </div>
    `;

    container.innerHTML = html;
    requestAnimationFrame(() => {
        container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    document.getElementById('closeCalcBtn').onclick = closeTechCalculator;

    const branchTabs = container.querySelectorAll('.branch-tab-btn');
    const branchContents = container.querySelectorAll('.branch-content');

    branchTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            branchTabs.forEach(t => t.classList.remove('active'));
            branchContents.forEach(c => c.classList.add('hidden'));
            tab.classList.add('active');
            container.querySelector('#' + tab.dataset.target)?.classList.remove('hidden');
        });
    });

    const containers = container.querySelectorAll('.tech-node-container');
    const updateFns = []; 

    containers.forEach(cont => {
        const slider = cont.querySelector('.tech-node-slider');
        const input = cont.querySelector('.tech-node-input');
        const maxBtn = cont.querySelector('.max-toggle-btn');
        const nodeId = cont.dataset.nodeId;

        const updateLevel = (val) => {
            let v = parseInt(val);
            const max = parseInt(input.max);
            if (isNaN(v) || v < 0) v = 0;
            if (v > max) v = max;
            
            slider.value = v;
            input.value = v;
            localStorage.setItem(`tech_${tech.id}_${nodeId}`, v);

            // Dynamic Gray-out & Button Swap
            if (v === max) {
                cont.classList.remove('border-slate-700', 'hover:border-slate-500', 'shadow-xl');
                cont.classList.add('opacity-50', 'saturate-0', 'border-slate-800', 'shadow-none');
                if (maxBtn) {
                    maxBtn.dataset.val = 0;
                    maxBtn.innerHTML = 'UNDO';
                    maxBtn.className = 'quick-set-btn max-toggle-btn px-1.5 sm:px-2 py-0.5 sm:py-1 bg-slate-700 border border-slate-500 hover:bg-slate-600 text-white rounded text-[9px] sm:text-[10px] font-black transition-colors';
                }
            } else {
                cont.classList.add('border-slate-700', 'hover:border-slate-500', 'shadow-xl');
                cont.classList.remove('opacity-50', 'saturate-0', 'border-slate-800', 'shadow-none');
                if (maxBtn) {
                    maxBtn.dataset.val = max;
                    maxBtn.innerHTML = 'MAX';
                    maxBtn.className = 'quick-set-btn max-toggle-btn px-1.5 sm:px-2 py-0.5 sm:py-1 bg-blue-900/50 border border-blue-500/50 hover:bg-blue-800/70 text-blue-300 rounded text-[9px] sm:text-[10px] font-black transition-colors';
                }
            }

            calculateTechTotals(tech);
        };
        
        updateFns.push({ nodeId, updateLevel, max: parseInt(input.max) });

        slider.addEventListener('input', (e) => updateLevel(e.target.value));
        input.addEventListener('input', (e) => updateLevel(e.target.value));
        
        cont.addEventListener('click', (e) => {
            const btn = e.target.closest('.quick-set-btn');
            if (btn) updateLevel(btn.dataset.val);
        });
    });

    document.getElementById('resetAllTechBtn').addEventListener('click', () => {
        updateFns.forEach(obj => obj.updateLevel(0));
    });

    document.getElementById('maxAllTechBtn').addEventListener('click', () => {
        updateFns.forEach(obj => obj.updateLevel(obj.max));
    });

    calculateTechTotals(tech);
    container.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function calculateTechTotals(tech) {
    let grandTotalCourage = 0;
    let grandTotalWisdom = 0;
    let grandTotalOther = 0;
    
    const iconCM = `<img src="images/CM.png" class="w-3 h-3 sm:w-5 sm:h-5 inline-block object-contain shrink-0" alt="CM">`;
    const iconWB = `<img src="images/WB.png" class="w-3 h-3 sm:w-5 sm:h-5 inline-block object-contain shrink-0" alt="WB">`;
    const iconRes = `<svg class="w-3 h-3 sm:w-5 sm:h-5 text-amber-400 inline-block shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 2a4 4 0 00-4 4v1H5a1 1 0 00-.994.89l-1 9A1 1 0 004 18h12a1 1 0 00.994-1.11l-1-9A1 1 0 0015 7h-1V6a4 4 0 00-4-4zm2 5V6a2 2 0 10-4 0v1h4zm-6 3a1 1 0 112 0 1 1 0 01-2 0zm7-1a1 1 0 100 2 1 1 0 000-2z" clip-rule="evenodd"/></svg>`;

    tech.nodes.forEach(node => {
        const container = document.querySelector(`.tech-node-container[data-node-id="${node.id}"]`);
        const input = container?.querySelector('.tech-node-input');
        const display = container?.querySelector('.node-cost-display');
        const currentLevel = input
            ? (parseInt(input.value, 10) || 0)
            : getStoredNodeLevel(tech.id, node.id);

        let nodeWisdom = 0;
        let nodeCourage = 0;
        let nodeOther = 0;

        for (let i = currentLevel; i < node.maxLevel; i++) {
            let genericCost = (node.costs && node.costs[i]) || 0;
            let wbCost = (node.warBadgeCosts && node.warBadgeCosts[i]) || (node.wisdomCosts && node.wisdomCosts[i]) || (node.wb_costs && node.wb_costs[i]) || 0;
            let cmCost = (node.courageCosts && node.courageCosts[i]) || (node.cm_costs && node.cm_costs[i]) || 0;

            if (node.costType === "Dual") {
                nodeWisdom += wbCost > 0 ? wbCost : genericCost;
                nodeCourage += cmCost;
            } else if (node.costType === "Courage") {
                nodeCourage += genericCost > 0 ? genericCost : cmCost;
            } else if (node.costType === "Wisdom" || node.costType === "War Badge" || node.costType === "War Badges") {
                nodeWisdom += genericCost > 0 ? genericCost : wbCost;
            } else {
                nodeOther += genericCost;
            }
        }

        if (display) {
            const isGamePill = display.classList.contains('game-tech-cost-pill');
            const remainingTotal = nodeWisdom + nodeCourage + nodeOther;
            if (isGamePill && remainingTotal === 0) {
                display.innerHTML = '';
            } else if (node.costType === "Dual") {
                display.innerHTML = isGamePill
                    ? `<span class="game-tech-pill game-tech-pill--wb">${iconWB}<span>${nodeWisdom.toLocaleString()}</span></span><span class="game-tech-pill game-tech-pill--cm">${iconCM}<span>${nodeCourage.toLocaleString()}</span></span>`
                    : `<span class="flex items-center justify-between w-full text-purple-300 font-bold bg-purple-900/30 px-1 sm:px-2 py-0.5 sm:py-1 rounded border border-purple-500/30">${iconWB} <span>${nodeWisdom.toLocaleString()}</span></span><span class="flex items-center justify-between w-full text-blue-300 font-bold bg-blue-900/30 px-1 sm:px-2 py-0.5 sm:py-1 rounded border border-blue-500/30 mt-1">${iconCM} <span>${nodeCourage.toLocaleString()}</span></span>`;
            } else if (node.costType === "Courage") {
                display.innerHTML = isGamePill
                    ? `<span class="game-tech-pill game-tech-pill--cm">${iconCM}<span>${nodeCourage.toLocaleString()}</span></span>`
                    : `<span class="flex items-center justify-between w-full text-blue-300 font-bold bg-blue-900/30 px-1 sm:px-2 py-0.5 sm:py-1 rounded border border-blue-500/30">${iconCM} <span>${nodeCourage.toLocaleString()}</span></span>`;
            } else if (node.costType === "Wisdom" || node.costType === "War Badge" || node.costType === "War Badges") {
                display.innerHTML = isGamePill
                    ? `<span class="game-tech-pill game-tech-pill--wb">${iconWB}<span>${nodeWisdom.toLocaleString()}</span></span>`
                    : `<span class="flex items-center justify-between w-full text-purple-300 font-bold bg-purple-900/30 px-1 sm:px-2 py-0.5 sm:py-1 rounded border border-purple-500/30">${iconWB} <span>${nodeWisdom.toLocaleString()}</span></span>`;
            } else {
                display.innerHTML = isGamePill
                    ? `<span class="game-tech-pill game-tech-pill--res">${iconRes}<span>${nodeOther.toLocaleString()}</span></span>`
                    : `<span class="flex items-center justify-between w-full text-amber-400 font-bold bg-amber-900/30 px-1 sm:px-2 py-0.5 sm:py-1 rounded border border-amber-500/30">${iconRes} <span>${nodeOther.toLocaleString()}</span></span>`;
            }
        }

        syncGameNodeButton(node, currentLevel);

        grandTotalWisdom += nodeWisdom;
        grandTotalCourage += nodeCourage;
        grandTotalOther += nodeOther;
    });

    const totalContainer = document.getElementById('totalTechCost');
    let hasBoth = (grandTotalCourage > 0 && grandTotalWisdom > 0);
    let isDualString = tech.primaryResource.includes("Dual");

    if (isDualString || hasBoth) {
        totalContainer.innerHTML = `
            <span class="flex items-center justify-between w-full sm:w-auto gap-2 sm:gap-4 text-base sm:text-2xl font-black text-purple-300 bg-purple-900/40 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border border-purple-500/50 shadow-inner">
                <span class="flex items-center">${iconWB} <span class="ml-1 sm:ml-2 text-[10px] sm:text-sm font-bold text-purple-400 uppercase tracking-widest hidden sm:inline">War Badges</span><span class="ml-1 sm:ml-2 text-[10px] sm:text-sm font-bold text-purple-400 uppercase tracking-widest sm:hidden">WB</span></span> 
                <span>${grandTotalWisdom.toLocaleString()}</span>
            </span>
            <span class="flex items-center justify-between w-full sm:w-auto gap-2 sm:gap-4 text-base sm:text-2xl font-black text-blue-300 bg-blue-900/40 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border border-blue-500/50 shadow-inner mt-2 sm:mt-0">
                <span class="flex items-center">${iconCM} <span class="ml-1 sm:ml-2 text-[10px] sm:text-sm font-bold text-blue-400 uppercase tracking-widest hidden sm:inline">Courage Medals</span><span class="ml-1 sm:ml-2 text-[10px] sm:text-sm font-bold text-blue-400 uppercase tracking-widest sm:hidden">CM</span></span> 
                <span>${grandTotalCourage.toLocaleString()}</span>
            </span>
        `;
    } else if (grandTotalWisdom > 0 || tech.primaryResource.includes("Wisdom") || tech.primaryResource.includes("War Badge")) {
        totalContainer.innerHTML = `
            <span class="flex items-center justify-between w-full sm:w-auto gap-2 sm:gap-4 text-base sm:text-2xl font-black text-purple-300 bg-purple-900/40 px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg border border-purple-500/50 shadow-inner">
                <span class="flex items-center">${iconWB} <span class="ml-1 sm:ml-2 text-[10px] sm:text-sm font-bold text-purple-400 uppercase tracking-widest hidden sm:inline">War Badges</span><span class="ml-1 sm:ml-2 text-[10px] sm:text-sm font-bold text-purple-400 uppercase tracking-widest sm:hidden">WB</span></span> 
                <span>${grandTotalWisdom.toLocaleString()}</span>
            </span>
        `;
    } else if (grandTotalCourage > 0 || tech.primaryResource.includes("Courage")) {
        totalContainer.innerHTML = `
            <span class="flex items-center justify-between w-full sm:w-auto gap-2 sm:gap-4 text-base sm:text-2xl font-black text-blue-300 bg-blue-900/40 px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg border border-blue-500/50 shadow-inner">
                <span class="flex items-center">${iconCM} <span class="ml-1 sm:ml-2 text-[10px] sm:text-sm font-bold text-blue-400 uppercase tracking-widest hidden sm:inline">Courage Medals</span><span class="ml-1 sm:ml-2 text-[10px] sm:text-sm font-bold text-blue-400 uppercase tracking-widest sm:hidden">CM</span></span> 
                <span>${grandTotalCourage.toLocaleString()}</span>
            </span>
        `;
    } else {
        totalContainer.innerHTML = `
            <span class="flex items-center justify-between w-full sm:w-auto gap-2 sm:gap-4 text-base sm:text-2xl font-black text-amber-400 bg-amber-900/40 px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg border border-amber-500/50 shadow-inner">
                <span class="flex items-center">${iconRes} <span class="ml-1 sm:ml-2 text-[10px] sm:text-sm font-bold text-amber-500 uppercase tracking-widest hidden sm:inline">Resources</span><span class="ml-1 sm:ml-2 text-[10px] sm:text-sm font-bold text-amber-500 uppercase tracking-widest sm:hidden">Res</span></span> 
                <span>${grandTotalOther.toLocaleString()}</span>
            </span>
        `;
    }
    
    updateGlobalSummary();
}

// ─── HEROES TAB: detail view + auto-ranking ───────────────────────────────────
function computeHeroRankings() {
  const total = rankedCombos.length;
  const stats = {};

  allHeroesData.forEach(hero => {
    stats[hero.name] = { appearances: 0, weightedScore: 0, topComboRank: Infinity };
  });

  rankedCombos.forEach((combo, idx) => {
    const score = total > 1 ? 100 - ((idx / (total - 1)) * 99) : 100;
    (combo.heroes || []).forEach(heroName => {
      const s = stats[heroName];
      if (s) {
        s.appearances++;
        s.weightedScore += score;
        if (idx + 1 < s.topComboRank) s.topComboRank = idx + 1;
      }
    });
  });

  allHeroesData.forEach(h => {
    const s = stats[h.name];
    let autoRating = s.appearances > 0
      ? ((s.weightedScore / s.appearances) * 0.6 + (s.appearances / total * 100) * 0.4)
      : 0;
    s.autoRating = autoRating;
    s.finalRating = getHeroFinalScore(h.name, autoRating);
  });

  return stats;
}

let _heroesTabState = {
  seasons: [...HERO_ATLAS_ALL_SEASONS],
  troop: 'all',
  state: 'all',
  search: '',
  selected: null,
  view: 'ranking',
  comboScope: 'season-capped',
};
let _heroesTabEventsWired = false;
let _heroesSearchTimer = null;

function normalizeHeroAtlasSeasons(seasons) {
  const picked = HERO_ATLAS_ALL_SEASONS.filter(s => (seasons || []).includes(s));
  return picked.length ? picked : [...HERO_ATLAS_ALL_SEASONS];
}

function getFilteredHeroes(state = _heroesTabState) {
  const { seasons, troop, state: heroState, search } = state;
  const q = (search || '').trim().toLowerCase();
  const seasonSet = new Set(normalizeHeroAtlasSeasons(seasons));
  let filtered = allHeroesData.filter(h => seasonSet.has(h.season));
  if (troop !== 'all') filtered = filtered.filter(h => h.Type === troop || h.Type === 'All');
  if (heroState !== 'all') filtered = filtered.filter(h => h.State === heroState);
  if (q) filtered = filtered.filter(h => h.name.toLowerCase().includes(q));
  return filtered;
}

function heroesFiltersActive(state = _heroesTabState) {
  const { seasons, troop, state: heroState, search } = state;
  const normalized = normalizeHeroAtlasSeasons(seasons);
  const allSeasonsSelected = normalized.length === HERO_ATLAS_ALL_SEASONS.length;
  return !allSeasonsSelected || troop !== 'all' || heroState !== 'all' || !!(search || '').trim();
}

function toggleHeroAtlasSeason(seasonKey) {
  if (seasonKey === 'all') {
    _heroesTabState.seasons = [...HERO_ATLAS_ALL_SEASONS];
    return;
  }
  const set = new Set(normalizeHeroAtlasSeasons(_heroesTabState.seasons));
  if (set.has(seasonKey)) set.delete(seasonKey);
  else set.add(seasonKey);
  _heroesTabState.seasons = set.size
    ? HERO_ATLAS_ALL_SEASONS.filter(s => set.has(s))
    : [...HERO_ATLAS_ALL_SEASONS];
}

function syncHeroSelectionWithFilters() {
  if (!_heroesTabState.selected) return;
  const filtered = getFilteredHeroes();
  if (!filtered.some(h => h.name === _heroesTabState.selected)) {
    _heroesTabState.selected = null;
  }
}

function selectHeroInAtlas(name) {
  if (!name) return;
  _heroesTabState.selected = _heroesTabState.selected === name ? null : name;
  renderHeroesTab();
}

function wireHeroesTabEvents(container) {
  if (_heroesTabEventsWired || !container) return;
  _heroesTabEventsWired = true;

  container.addEventListener('click', (e) => {
    const seasonBtn = e.target.closest('[data-hero-season]');
    if (seasonBtn) {
      toggleHeroAtlasSeason(seasonBtn.dataset.heroSeason);
      syncHeroSelectionWithFilters();
      renderHeroesTab();
      return;
    }

    const troopBtn = e.target.closest('[data-hero-troop]');
    if (troopBtn) {
      _heroesTabState.troop = troopBtn.dataset.heroTroop;
      syncHeroSelectionWithFilters();
      renderHeroesTab();
      return;
    }

    const stateBtn = e.target.closest('[data-hero-state]');
    if (stateBtn) {
      _heroesTabState.state = stateBtn.dataset.heroState;
      syncHeroSelectionWithFilters();
      renderHeroesTab();
      return;
    }

    const clearBtn = e.target.closest('[data-heroes-clear-filters]');
    if (clearBtn) {
      _heroesTabState.seasons = [...HERO_ATLAS_ALL_SEASONS];
      _heroesTabState.troop = 'all';
      _heroesTabState.state = 'all';
      _heroesTabState.search = '';
      syncHeroSelectionWithFilters();
      renderHeroesTab();
      return;
    }

    const rankRow = e.target.closest('[data-hero-name]');
    if (rankRow) {
      selectHeroInAtlas(rankRow.dataset.heroName);
      return;
    }

    const scopeBtn = e.target.closest('[data-combo-scope]');
    if (scopeBtn) {
      _heroesTabState.comboScope = scopeBtn.dataset.comboScope;
      renderHeroesTab();
      return;
    }

    const pickHero = e.target.closest('[data-hero-pick]');
    if (pickHero) {
      e.stopPropagation();
      _heroesTabState.selected = pickHero.dataset.heroPick;
      renderHeroesTab();
      return;
    }

    if (e.target.closest('[data-hero-close]')) {
      _heroesTabState.selected = null;
      renderHeroesTab();
      return;
    }

    const sectionBtn = e.target.closest('[data-detail-section]');
    if (sectionBtn) {
      const target = container.querySelector(`#detail-section-${sectionBtn.dataset.detailSection}`);
      target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      container.querySelectorAll('[data-detail-section]').forEach(btn => {
        btn.classList.toggle('active', btn === sectionBtn);
      });
      return;
    }

  });

  container.addEventListener('input', (e) => {
    if (e.target.id !== 'heroesTabSearch') return;
    clearTimeout(_heroesSearchTimer);
    _heroesSearchTimer = setTimeout(() => {
      _heroesTabState.search = e.target.value;
      syncHeroSelectionWithFilters();
      renderHeroesTab();
    }, 180);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !_heroesTabState.selected) return;
    if (heroesSection?.classList.contains('hidden')) return;
    _heroesTabState.selected = null;
    renderHeroesTab();
  });
}

function renderHeroesTab() {
  const container = document.getElementById('heroesTabContent');
  if (!container) return;

  wireHeroesTabEvents(container);

  const searchHadFocus = document.activeElement?.id === 'heroesTabSearch';
  const searchCaret = document.getElementById('heroesTabSearch')?.selectionStart ?? null;

  const stats = computeHeroRankings();
  const { seasons: selectedSeasons, troop, state, search, selected, view, comboScope } = _heroesTabState;
  const t = translations[currentLanguage] || translations.en;

  const troops = ['all','Archers','Footmen','Cavalry'];
  const states = ['all','Free','Paid'];
  const filtered = getFilteredHeroes();
  const filtersActive = heroesFiltersActive();
  const normalizedSeasons = normalizeHeroAtlasSeasons(selectedSeasons);
  const allSeasonsSelected = normalizedSeasons.length === HERO_ATLAS_ALL_SEASONS.length;

  const seasonTabsHtml = `
    <button type="button" class="hero-tab-season ${allSeasonsSelected ? 'active' : ''}" data-hero-season="all" title="Select all seasons">
      All
    </button>
    ${HERO_ATLAS_ALL_SEASONS.map(s => `
    <button type="button" class="hero-tab-season ${normalizedSeasons.includes(s) ? 'active' : ''}" data-hero-season="${s}"
      ${seasonColors[s] ? `style="--sc:${seasonColors[s]}"` : ''}>
      ${s}
    </button>`).join('')}`;

  const troopPillsHtml = troops.map(tr => `
    <button type="button" class="heroes-filter-pill ${troop === tr ? 'active' : ''}" data-hero-troop="${tr}">
      ${tr === 'all' ? 'All troops' : getLocalizedTroop(tr)}
    </button>`).join('');

  const statePillsHtml = states.map(st => `
    <button type="button" class="heroes-filter-pill ${state === st ? 'active' : ''}" data-hero-state="${st}">
      ${st === 'all' ? 'All' : st}
    </button>`).join('');

  if (view === 'ranking') {
    const ranked = [...filtered].sort((a,b) => (stats[b.name]?.finalRating || 0) - (stats[a.name]?.finalRating || 0));

    const rowsHtml = ranked.length ? ranked.map((hero, i) => {
      const s = stats[hero.name] || {};
      const finalPct = Math.min(100, s.finalRating || 0).toFixed(0);
      const tagColor = seasonColors[hero.season] || '#f97316';
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '';
      const rankNumber = i < 3 ? medal : `${i + 1}`;
      const rankClass = i < 3 ? 'rank-medal' : 'rank-medal rank-medal--num';
      return `
        <div class="hero-rank-row ${selected === hero.name ? 'selected' : ''}" data-hero-name="${escapeHtml(hero.name)}">
          <span class="${rankClass}">${rankNumber}</span>
          <img class="rank-img" src="${escapeHtml(hero.imageUrl)}" alt="${escapeHtml(hero.name)}" onerror="this.src='images/logo.png'">
          <div class="rank-info">
            <div class="rank-name">
              ${escapeHtml(hero.name)}
              ${hero.State === 'Paid' ? paidIconHtml() : ''}
            </div>
            <div class="rank-meta">
              <span style="color:${tagColor};font-weight:800;">${hero.season}</span>
              <span class="rank-troop ${getTroopColorClass(hero.Type)}">${getLocalizedTroop(hero.Type)}</span>
              ${s.appearances ? `<span class="rank-apps">${s.appearances} combo${s.appearances!==1?'s':''}</span>` : '<span class="rank-apps rank-apps-zero">Not ranked</span>'}
            </div>
            <div class="rank-bar-wrap">
              <div class="rank-bar" style="width:${finalPct}%;background:${tagColor};"></div>
            </div>
          </div>
          <div class="rank-score ${s.finalRating > 0 ? 'has-score' : 'no-score'}">${s.finalRating > 0 ? finalPct : '—'}</div>
        </div>`;
    }).join('') : '<p class="text-sm text-slate-500 italic p-4 text-center">No heroes match your filters.</p>';

    // Detail panel for selected hero
    let detailHtml = '';
    if (selected) {
      const hero = allHeroesData.find(h => h.name === selected);
      const ext  = heroesExtendedData[selected];
      const s    = stats[selected] || {};
      const tagColor = hero ? (seasonColors[hero.season] || '#f97316') : '#f97316';
      const synergies = getSynergies(selected, _heroesTabState);
      const heroCombos = getHeroAtlasCombos(selected, _heroesTabState);
      const comboScopeHint = comboScope === 'season-capped'
        ? (t.heroesComboScopeHint || 'Combos using heroes up to {season} within your season filters.')
            .replace('{season}', hero?.season || '')
        : (t.heroesComboScopeAllHint || 'All ranked combos from the full database.');

      const combosHtml = heroCombos.map(c => `
        <div class="detail-combo-row">
          <div class="detail-combo-top">
            <span class="detail-combo-rank">#${c.rank}</span>
            <div class="detail-combo-scorebox">
              <span class="detail-combo-score-lbl">Score</span>
              <span class="detail-combo-score">${parseFloat(c.score).toFixed(1)}</span>
            </div>
          </div>
          <div class="detail-combo-heroes">
            ${c.heroes.map(hn => `
              <button type="button" class="detail-combo-hero${hn === selected ? ' is-viewed' : ''}" data-hero-pick="${escapeHtml(hn)}" title="${escapeHtml(hn)}">
                <img src="${getHeroImageUrl(hn)}" alt="${escapeHtml(hn)}">
                <span>${escapeHtml(hn)}</span>
              </button>`).join('')}
          </div>
          ${renderCountersToggle(c.heroes, getComboRankInfo, getHeroImageUrl, getCounterLabels())}
        </div>`).join('');

      const skillsHtml = ext ? ext.skills.map(sk => `
        <div class="detail-skill">
          <div class="detail-skill-header">
            <span class="detail-skill-id">SKILL ${sk.id}</span>
            <span class="detail-skill-type">${sk.type}</span>
            ${sk.range && sk.range !== '-' ? `<span class="detail-skill-range">Range ${sk.range}</span>` : ''}
          </div>
          <p class="detail-skill-target ${sk.target.toLowerCase().includes('enemy') ? 'enemy' : 'ally'}">${sk.target}</p>
          <p class="detail-skill-desc">${formatSkillText(sk.desc)}</p>
        </div>`).join('') : '<p class="text-xs text-slate-500 italic">Skill data not yet available.</p>';

      const detailNavHtml = `
        <nav class="detail-nav" aria-label="Hero detail sections">
          ${synergies.length > 0 ? '<button type="button" class="detail-nav-btn active" data-detail-section="synergies">Synergies</button>' : ''}
          <button type="button" class="detail-nav-btn ${synergies.length === 0 ? 'active' : ''}" data-detail-section="combos">Combos</button>
          <button type="button" class="detail-nav-btn" data-detail-section="skills">Skills</button>
        </nav>`;

      detailHtml = `
        <div class="hero-detail-panel">
          <button type="button" class="heroes-mobile-back" data-hero-close>← Back to ranking</button>
          <button type="button" class="detail-close" data-hero-close aria-label="Close hero detail">✕</button>
          <div class="detail-header">
            <img class="detail-img" src="${hero?.imageUrl}" alt="${escapeHtml(selected)}" onerror="this.src='images/logo.png'">
            <div class="detail-meta">
              <div class="detail-name">${escapeHtml(selected)}${hero?.State==='Paid' ? paidIconHtml() : ''}</div>
              <div class="detail-tags">
                <span class="detail-season-tag" style="background:${tagColor};color:#000">${hero?.season}</span>
                <span class="detail-troop-tag ${getTroopColorClass(hero?.Type)}">${getLocalizedTroop(hero?.Type||'All')}</span>
                <span class="detail-state-tag ${hero?.State==='Paid'?'paid':'free'}">${hero?.State||'Free'}</span>
              </div>
              <div class="detail-stats-row">
                <div class="detail-stat"><div class="detail-stat-lbl">Rating</div><div class="detail-stat-val" style="color:${tagColor}">${s.finalRating>0?Math.min(100,s.finalRating).toFixed(1):'—'}</div></div>
                <div class="detail-stat"><div class="detail-stat-lbl">Combos</div><div class="detail-stat-val">${s.appearances||0}</div></div>
                <div class="detail-stat"><div class="detail-stat-lbl">Best Rank</div><div class="detail-stat-val">${s.topComboRank!==Infinity?'#'+s.topComboRank:'—'}</div></div>
                ${ext ? `<div class="detail-stat"><div class="detail-stat-lbl">Min Copies</div><div class="detail-stat-val">${ext.minCopies||34}</div></div>` : ''}
              </div>
            </div>
          </div>
          ${detailNavHtml}

          ${synergies.length > 0 ? `
          <div id="detail-section-synergies" class="detail-section-block">
            <div class="detail-section-title">Best Synergies</div>
            <div class="detail-synergies">
              ${synergies.map(syn => `
                <button type="button" class="detail-syn-item" data-hero-pick="${escapeHtml(syn)}" title="View ${escapeHtml(syn)}">
                  <img src="${getHeroImageUrl(syn)}" alt="${escapeHtml(syn)}">
                  <span>${escapeHtml(syn)}</span>
                </button>`).join('')}
            </div>
          </div>` : ''}

          <div id="detail-section-combos" class="detail-section-block">
            <div class="detail-section-head">
              <div class="detail-section-title">${t.heroesTopCombos || 'Top Combos'}</div>
              <div class="heroes-combo-scope" role="group" aria-label="${t.heroesComboScopeLabel || 'Combo season scope'}">
                <button type="button" class="heroes-combo-scope-btn ${comboScope === 'season-capped' ? 'active' : ''}" data-combo-scope="season-capped">
                  ${(t.heroesComboScopeCapped || 'Up to {season}').replace('{season}', hero?.season || '')}
                </button>
                <button type="button" class="heroes-combo-scope-btn ${comboScope === 'all' ? 'active' : ''}" data-combo-scope="all">
                  ${t.heroesComboScopeAll || 'All best'}
                </button>
              </div>
            </div>
            <p class="heroes-combo-scope-hint">${comboScopeHint}</p>
            <div class="detail-combos">${combosHtml || `<p class="text-xs text-slate-500 italic">${t.heroesNoCombos || 'No ranked combos yet.'}</p>`}</div>
          </div>

          <div id="detail-section-skills" class="detail-section-block">
            <div class="detail-section-title">Skills</div>
            <div class="detail-skills">${skillsHtml}</div>
          </div>
        </div>`;
    }

    const clearFiltersHtml = filtersActive
      ? `<button type="button" class="heroes-clear-filters" data-heroes-clear-filters>Clear filters</button>`
      : '';

    container.innerHTML = `
      <div class="heroes-tab-inner${selected ? ' heroes-tab-inner--detail-open' : ''}">
        <div class="heroes-toolbar-sticky">
          <div class="heroes-toolbar">
            <div class="hero-search-wrap heroes-search-field">
              <svg class="hero-search-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 15.803a7.5 7.5 0 0 0 10.607 0Z"/></svg>
              <input id="heroesTabSearch" class="hero-search-input" type="search" placeholder="Search heroes..." value="${escapeHtml(search)}" autocomplete="off" />
            </div>
            <span class="heroes-count-badge">${filtered.length} hero${filtered.length !== 1 ? 'es' : ''}</span>
            ${clearFiltersHtml}
          </div>
          <div class="heroes-filter-pills heroes-filter-pills--troop">${troopPillsHtml}</div>
          <div class="heroes-filter-pills heroes-filter-pills--state">${statePillsHtml}</div>
          <p class="heroes-season-hint">Seasons — select multiple</p>
          <div class="heroes-season-tabs" role="group" aria-label="Filter by season (multi-select)">${seasonTabsHtml}</div>
        </div>
        <div class="heroes-layout ${selected ? 'has-detail' : ''}">
          <div class="heroes-ranking-list" role="list">${rowsHtml}</div>
          ${selected ? detailHtml : ''}
        </div>
      </div>`;

    if (searchHadFocus) {
      const searchInput = document.getElementById('heroesTabSearch');
      if (searchInput) {
        searchInput.focus();
        if (searchCaret != null) {
          searchInput.setSelectionRange(searchCaret, searchCaret);
        }
      }
    }

    requestAnimationFrame(() => {
      const selectedRow = container.querySelector('.hero-rank-row.selected');
      if (selectedRow) {
        selectedRow.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
      if (selected && window.innerWidth < 900) {
        container.querySelector('.hero-detail-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
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
  };
  window.addEventListener('resize', checkOverflow);
  setTimeout(checkOverflow, 100);
}

// --- INITIALIZE EVERYTHING ---
async function startApp() {
    try {
    updateTextContent();
    mountGameClock(document.getElementById('globalGameClock'), { compact: true, showUae: false });
    renderAvailableHeroes();
    renderGeneratorHeroes();
    wireUIActions();
    initResearchCalculator();
    if (typeof initLoyaltyCalculator === 'function') {
        initLoyaltyCalculator();
    }
    initTabScroll();

    registerServiceWorker();
    const comboShare = parseComboShareUrl();
    if (comboShare) {
      console.log('Loaded shared combos from URL', comboShare);
    }
    const rosterShare = parseRosterShareUrl();
    if (rosterShare) {
      applyRosterToGenerator(rosterShare, generatorSelectedHeroes);
    }

    try {
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
    } catch (error) {
        console.warn("Firebase could not initialize (might be offline or missing config).", error);
    }
    } finally {
        await notifyAppReady();
    }
}

setupInstallPrompt();

// Register UI functions for builder/generator modules
registerUiFunctions({
  showHeroTooltip,
  moveHeroTooltip,
  hideHeroTooltip,
  forceHideHeroTooltip,
  showAboModal,
});

// Fire it up!
startApp();
