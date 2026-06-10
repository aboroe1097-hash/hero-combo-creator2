// js/app.js - Manual + Generator, scoring, no duplicates, image + text export
// --- APP CONFIG --
const APP_VERSION = "b5.0"; // Updated version for bonus system
const ENABLE_RESEARCH_FEATURE = true;

import { translations } from './translations.js';
import { initFirebase, ensureAnonymousAuth, getDb } from './firebase.js';
import { initComments } from './comments.js';
import { rankedCombos } from './combos-db.js';
import { initLoyaltyCalculator } from './loyalty-calculator.js';
import { heroesExtendedData } from './heroes-info.js';
import { techDatabase } from './tech-db.js';
import { initEdenMapPlanner } from './eden-map.js';
import { renderCountersToggle } from './combo-counters.js';
import { escapeHtml } from './utils.js';
import { allHeroesData } from './heroes-data.js';
import { heroBonusPoints } from './hero-bonuses.js';

document.addEventListener('click', (e) => {
  const btn = e.target.closest('.counter-toggle-btn');
  if (!btn) return;
  const panel = document.getElementById(btn.dataset.counterTarget);
  if (!panel) return;
  const willOpen = panel.classList.contains('hidden');
  panel.classList.toggle('hidden');
  btn.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
  btn.classList.toggle('counter-toggle-btn--open', willOpen);
});

function getHeroFinalScore(heroName, autoRating) {
  const bonus = heroBonusPoints[heroName] || 0;
  return Math.min(100, Math.max(0, autoRating + bonus));
}

// --- DOM ELEMENTS ---
const languageSelect       = document.getElementById('languageSelect');
const availableHeroesEl    = document.getElementById('availableHeroes');
const saveComboBtn         = document.getElementById('saveComboBtn');
const clearComboBtn        = document.getElementById('clearComboBtn');
const downloadCombosBtn    = document.getElementById('downloadCombosBtn');
const shareAllCombosBtn    = document.getElementById('shareAllCombosBtn');
const savedCombosEl        = document.getElementById('savedCombos');
const noCombosMessage      = document.getElementById('noCombosMessage');
const loadingSpinner       = document.getElementById('loadingSpinner');
const messageBox           = document.getElementById('messageBox');
const messageText          = document.getElementById('messageText');
const messageBoxOkBtn      = document.getElementById('messageBoxOkBtn');
const messageBoxCancelBtn  = document.getElementById('messageBoxCancelBtn');

// TABS & SECTIONS
const manualSection        = document.getElementById('manualSection');
const generatorSection     = document.getElementById('generatorSection');
const loyaltySection       = document.getElementById('loyaltySection');
const youtubeSection       = document.getElementById('youtubeSection'); 
const researchSection      = document.getElementById('researchSection'); 

const tabManualBtn         = document.getElementById('tabManual');
const tabGeneratorBtn      = document.getElementById('tabGenerator');
const tabLoyaltyBtn        = document.getElementById('tabLoyalty');
const tabYouTubeBtn        = document.getElementById('tabYouTube'); 
const tabResearchBtn       = document.getElementById('tabResearch'); 
const tabHeroesBtn         = document.getElementById('tabHeroes');
const tabEdenMapBtn        = document.getElementById('tabEdenMap');
const heroesSection        = document.getElementById('heroesSection');
const edenMapSection       = document.getElementById('edenMapSection');
const globalToggleRow      = document.getElementById('globalToggleRow'); 

const comboFooterBar       = document.getElementById('comboFooterBar');
const generatorHeroesEl    = document.getElementById('generatorHeroes');
const generatorResultsEl   = document.getElementById('generatorResults');
const generateCombosBtn    = document.getElementById('generateCombosBtn');
const downloadGeneratorBtn = document.getElementById('downloadGeneratorBtn');

// Filter containers
const seasonFiltersEl      = document.getElementById('seasonFilters');
const stateFiltersEl       = document.getElementById('stateFilters');
const troopFiltersEl       = document.getElementById('troopFilters');
const genSeasonFiltersEl   = document.getElementById('generatorSeasonFilters');
const genStateFiltersEl    = document.getElementById('generatorStateFilters');
const genTroopFiltersEl    = document.getElementById('generatorTroopFilters');

const TechseasonColors = {
  S0: '#94a3b8', // Slate
  S1: '#60a5fa', // Blue
  S2: '#c084fc', // Purple
  S3: '#fb923c', // Orange
  S4: '#facc15', // Yellow
  X1: '#f87171', // Red
  X2: '#34d399'  // Emerald
};

// --- STATE ---
let currentLanguage            = localStorage.getItem('vts_hero_lang') || 'en';
let heroInfoEnabled            = true; 
let activeTechSeasons          = new Set(['S4']); // Default research season

// Manual filters
let selectedSeasons            = ['S0', 'S1', 'S2', 'S3', 'S4', 'X1', 'X2'];
let selectedStates             = ['Free', 'Paid'];              
let selectedTypes              = ['Archers', 'Footmen', 'Cavalry', 'All']; 

// Manual combo
let currentCombo               = [null, null, null];

// Generator filters
let generatorSelectedSeasons   = ['S0', 'S1', 'S2', 'S3', 'S4', 'X1', 'X2'];
let generatorSelectedStates    = ['Free', 'Paid'];
let generatorSelectedTypes     = ['Archers', 'Footmen', 'Cavalry', 'All'];

// Generator selected heroes
const generatorSelectedHeroes  = new Set();

let userId = 'anonymous';
let db     = null;
let savedCombosCache = [];
let lastGeneratedCombos = [];
let touchDragHero  = null;
let touchDragGhost = null;

const sourceCreditText = "Data meticulously sourced from the VTS 1097 Community, Ptr, Old.Faithful, Raven G, and other contributors.";

const PAID_GEM_SVG = `<svg class="paid-gem-svg" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M10 2l2.2 4.5 5 .7-3.6 3.5.85 5L10 13.8 5.55 15.7l.85-5L2.8 7.2l5-.7L10 2z" fill="#a855f7" stroke="#fde68a" stroke-width=".7"/></svg>`;

function paidBadgeHtml(variant = 'card') {
  return `<span class="paid-badge paid-badge--${variant}" title="Paid Hero">${PAID_GEM_SVG}<span class="paid-badge-text">PAID</span></span>`;
}

function paidIconHtml() {
  return `<span class="paid-icon-inline" title="Paid Hero">${PAID_GEM_SVG}</span>`;
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
const seasonColors = {
  S0: '#9ca3af',
  S1: '#3b82f6',
  S2: '#a855f7',
  S3: '#f97316',
  S4: '#facc15',
  X1: '#f87171',
  X2: '#34d399'  // Emerald Green
};

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

// --- UTILITIES ---

function getHeroImageUrl(name) {
  const h = allHeroesData.find(x => x.name === name);
  return h?.imageUrl || `https://placehold.co/128x128?text=${encodeURIComponent(name)}`;
}

function getTroopColorClass(type) {
  switch(type) {
    case 'Archers': return 'text-emerald-400';
    case 'Footmen': return 'text-amber-400';
    case 'Cavalry': return 'text-sky-400';
    case 'All': return 'text-purple-400';
    default: return 'text-slate-400';
  }
}

function getLocalizedTroop(type) {
  const t = translations[currentLanguage] || translations.en;
  if (type === 'Archers') return t.troopArchers || type;
  if (type === 'Footmen') return t.troopFootmen || type;
  if (type === 'Cavalry') return t.troopCavalry || type;
  if (type === 'All') return t.troopAll || type;
  return type;
}

function getCheckedValues(container) {
  if (!container) return [];
  return Array.from(container.querySelectorAll('input[type="checkbox"]:checked'))
    .map(i => i.value);
}

function computeStateSelection(container) {
  const raw = getCheckedValues(container).map(v => v.toLowerCase());
  const set = new Set();
  if (raw.length === 0) return ['Free', 'Paid'];
  if (raw.some(v => v.includes('paid') && v.includes('free'))) {
    set.add('Free'); set.add('Paid');
  }
  if (raw.some(v => v === 'free')) set.add('Free');
  if (raw.some(v => v === 'paid')) set.add('Paid');
  if (set.size === 0) { set.add('Free'); set.add('Paid'); }
  return Array.from(set);
}

function computeTypeSelection(container) {
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

function heroMatchesFilters(hero, seasonsArr, statesArr, typesArr) {
  if (!seasonsArr || seasonsArr.length === 0) return false;
  if (!seasonsArr.includes(hero.season)) return false;
  
  // Safe case-insensitive state matching
  const heroState = (hero.State || 'Free').toLowerCase();
  const lowerStatesArr = (statesArr || []).map(s => s.toLowerCase());
  if (lowerStatesArr.length && !lowerStatesArr.includes(heroState)) return false;
  
  const heroType = hero.Type || 'All';
  if (!typesArr || !typesArr.length) return true;
  if (heroType === 'All' || typesArr.includes('All')) return true;
  return typesArr.includes(heroType);
}

function getComboRankInfo(heroes) {
  if (!Array.isArray(heroes) || heroes.length !== 3) return null;
  const userSorted = [...heroes].slice().sort();
  const total = rankedCombos.length;
  for (let i = 0; i < total; i++) {
    const combo = rankedCombos[i];
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

function isHeroAlreadyInCombo(name, ignoreIndex = -1) {
  return currentCombo.some((h, idx) => h === name && idx !== ignoreIndex);
}

function getSynergies(heroName) {
  const containingCombos = rankedCombos.filter(c => c.heroes && c.heroes.includes(heroName));
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

// --- TOUCH DRAG (MOBILE) ---
function createTouchGhost(card, touch) {
  if (!card || !touch) return;
  if (touchDragGhost && touchDragGhost.parentNode) {
    touchDragGhost.parentNode.removeChild(touchDragGhost);
  }
  const rect = card.getBoundingClientRect();
  const ghost = card.cloneNode(true);
  
  ghost.style.position = 'fixed';
  ghost.style.margin = '0';
  ghost.style.left = `${rect.left}px`;
  ghost.style.top  = `${rect.top}px`;
  ghost.style.width  = `${rect.width}px`;
  ghost.style.height = `${rect.height}px`;
  ghost.style.minWidth  = `${rect.width}px`;
  ghost.style.maxWidth  = `${rect.width}px`;
  ghost.style.boxSizing = 'border-box';
  ghost.style.opacity = '0.9';
  ghost.style.pointerEvents = 'none';
  ghost.style.zIndex = '9999';
  ghost.style.transform = 'scale(1.05)';
  ghost.style.boxShadow = '0 10px 25px rgba(0,0,0,0.6)';
  
  document.body.appendChild(ghost);
  touchDragGhost = ghost;
}

function setupTouchDragForManualBuilder() {
  document.addEventListener('touchmove', (e) => {
    if (!touchDragHero || !touchDragGhost) return;
    const touch = e.touches && e.touches[0];
    if (!touch) return;
    e.preventDefault();
    const w = touchDragGhost.offsetWidth || 80;
    const h = touchDragGhost.offsetHeight || 80;
    touchDragGhost.style.left = `${touch.clientX - w / 2}px`;
    touchDragGhost.style.top  = `${touch.clientY - h / 2}px`;
  }, { passive: false });

  document.addEventListener('touchend', (e) => {
    if (!touchDragHero) return;
    const touch = e.changedTouches && e.changedTouches[0];
    if (touchDragGhost && touchDragGhost.parentNode) {
      touchDragGhost.parentNode.removeChild(touchDragGhost);
    }
    touchDragGhost = null;
    if (!touch) { touchDragHero = null; return; }
    const targetElement = document.elementFromPoint(touch.clientX, touch.clientY);
    if (!targetElement) { touchDragHero = null; return; }
    const slot = targetElement.closest && targetElement.closest('.combo-slot');
    if (!slot) { touchDragHero = null; return; }
    const idx = parseInt(slot.dataset.slotIndex, 10);
    if (Number.isNaN(idx)) { touchDragHero = null; return; }

    if (isHeroAlreadyInCombo(touchDragHero, idx)) {
      const t = translations[currentLanguage] || translations.en;
      showAboModal(t.manualNoDuplicateHero || 'This hero is already used in your current combo.');
      touchDragHero = null;
      return;
    }
    currentCombo[idx] = touchDragHero;
    updateComboSlotDisplay(slot, touchDragHero, idx);
    updateManualComboScore();
    touchDragHero = null;
  }, { passive: true });

  document.addEventListener('touchcancel', () => {
    if (touchDragGhost && touchDragGhost.parentNode) {
      touchDragGhost.parentNode.removeChild(touchDragGhost);
    }
    touchDragGhost = null;
    touchDragHero  = null;
  }, { passive: true });
}

// --- RENDERING: MANUAL BUILDER ---

function renderAvailableHeroes() {
  if (!availableHeroesEl) return;
  const t = translations[currentLanguage] || translations.en;
  availableHeroesEl.innerHTML = '';
  allHeroesData
    .filter(h => heroMatchesFilters(h, selectedSeasons, selectedStates, selectedTypes))
    .forEach(hero => {
      const card = document.createElement('div');
      card.className = 'hero-card relative';
      card.draggable = true;
      card.dataset.heroName = hero.name;

      const tagColor = seasonColors[hero.season] || '#f97316';
      card.innerHTML = `
        <span class="hero-tag" style="background:${tagColor}">${hero.season}</span>
        ${hero.State === 'Paid' ? paidBadgeHtml('card') : ''}
        
        <div class="info-btn lg:hidden absolute top-1 right-1 w-6 h-6 bg-slate-900/90 border border-slate-600 rounded-full flex items-center justify-center z-20 text-sky-400 shadow-md cursor-pointer hover:bg-slate-800">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-3.5 h-3.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
            </svg>
        </div>

        <img src="${hero.imageUrl}" alt="${hero.name}">
        <div class="mt-1 flex flex-col items-center leading-tight w-full px-1">
            <span class="font-bold text-[10px] text-white truncate w-full text-center">${hero.name}</span>
            <span class="font-black text-[8px] uppercase tracking-wider ${getTroopColorClass(hero.Type)}">${getLocalizedTroop(hero.Type)}</span>
        </div>
      `;

      card.addEventListener('dragstart', e => {
        forceHideHeroTooltip();
        e.dataTransfer.setData('text/plain', hero.name);
      });

      card.addEventListener('touchstart', (e) => {
        forceHideHeroTooltip();
        const touch = e.touches && e.touches[0];
        touchDragHero = hero.name;
        createTouchGhost(card, touch);
      }, { passive: true });

      card.addEventListener('pointerenter', (e) => {
        if (e.pointerType === 'touch') return; 
        showHeroTooltip(e, hero.name);
      });
      card.addEventListener('pointermove', (e) => {
        if (e.pointerType === 'touch') return;
        moveHeroTooltip(e);
      });
      card.addEventListener('pointerleave', (e) => {
        if (e.pointerType === 'touch') return;
        hideHeroTooltip();
      });

      const infoBtn = card.querySelector('.info-btn');
      if (infoBtn) {
        infoBtn.addEventListener('click', (e) => {
          e.stopPropagation(); 
          e.preventDefault();
          showHeroTooltip(e, hero.name);
        });
        infoBtn.addEventListener('touchstart', (e) => {
          e.stopPropagation(); 
        }, { passive: false });
      }

      card.style.animationDelay = (availableHeroesEl.children.length * 0.025) + 's';
      availableHeroesEl.appendChild(card);
    });

  let sourceNote = document.getElementById('heroesSourceNote1');
  if (!sourceNote) {
      sourceNote = document.createElement('div');
      sourceNote.id = 'heroesSourceNote1';
      sourceNote.className = "col-span-full mt-8 text-center text-[10px] sm:text-xs text-slate-500 uppercase tracking-widest border-t border-slate-800/50 pt-4 w-full";
      availableHeroesEl.parentNode.appendChild(sourceNote);
  }
  sourceNote.innerHTML = sourceCreditText;
  // Update hero count badge
  const countEl = document.getElementById('manualHeroCount');
  if (countEl) {
    const count = availableHeroesEl.querySelectorAll('.hero-card').length;
    countEl.textContent = count + ' hero' + (count !== 1 ? 's' : '');
  }
}

function updateComboSlotDisplay(slot, name, idx) {
  const t = translations[currentLanguage] || translations.en;
  if (name) {
    slot.innerHTML = `
      <img src="${getHeroImageUrl(name)}" alt="${name}" crossorigin="anonymous">
      <span class="absolute bottom-0 left-0 right-0 text-white bg-black/70 px-1 py-1 text-[10px] w-full truncate text-center font-bold">
        ${name}
      </span>`;
    slot.classList.add('relative', 'p-0');
  } else {
    slot.innerHTML = `
      <div class="combo-slot-placeholder h-full flex flex-col items-center justify-center gap-1">
        <span class="font-bold text-blue-400/60 text-3xl leading-none">+</span>
        <span data-i18n="dragHeroHere" class="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">
          ${t.dragHeroHere}
        </span>
      </div>`;
    slot.classList.remove('relative', 'p-0');
  }
}

function updateManualComboScore() {
  const t = translations[currentLanguage] || translations.en;
  const bar = document.getElementById('comboFooterBar');
  if (!bar) return;

  let scoreBox = document.getElementById('manualComboScoreBox');
  if (!scoreBox) {
    scoreBox = document.createElement('div');
    scoreBox.id = 'manualComboScoreBox';
    scoreBox.className = 'mt-3 text-xs sm:text-sm text-sky-300 text-center hidden';
    const buttonsRow = document.getElementById('comboButtonsRow');
    if (buttonsRow) bar.insertBefore(scoreBox, buttonsRow);
    else bar.appendChild(scoreBox);
  }

  if (currentCombo.includes(null)) {
    scoreBox.textContent = '';
    scoreBox.classList.add('hidden');
    return;
  }

  const info = getComboRankInfo(currentCombo);
  scoreBox.classList.remove('hidden');

  if (!info) {
    scoreBox.textContent = t.manualComboNotRanked || 'This combo is not in the ranked database.';
  } else {
    const label = t.generatorScoreLabel || 'Score:';
    scoreBox.innerHTML = `
      <span class="uppercase tracking-widest text-slate-400 mr-2">${label}</span>
      <span class="font-black text-sky-400 text-base sm:text-lg">${info.score}</span>
      <span class="ml-2 text-slate-400 text-[11px] sm:text-xs">(#${info.rank})</span>
    `;
  }
}

// --- RENDERING: GENERATOR ---

function renderGeneratorHeroes() {
  if (!generatorHeroesEl) return;
  generatorHeroesEl.innerHTML = '';
  allHeroesData
    .filter(h => heroMatchesFilters(h, generatorSelectedSeasons, generatorSelectedStates, generatorSelectedTypes))
    .forEach(hero => {
      const card = document.createElement('button');
      card.className = `hero-card generator-card relative ${
        generatorSelectedHeroes.has(hero.name) ? 'generator-card-selected' : ''
      }`;
      
      card.innerHTML = `
        <span class="hero-tag" style="background:${seasonColors[hero.season]}">${hero.season}</span>
        ${hero.State === 'Paid' ? paidBadgeHtml('card') : ''}
        
        <div class="info-btn lg:hidden absolute top-1 right-1 w-6 h-6 bg-slate-900/90 border border-slate-600 rounded-full flex items-center justify-center z-20 text-sky-400 shadow-md hover:bg-slate-800 cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-3.5 h-3.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
            </svg>
        </div>

        <img src="${hero.imageUrl}" alt="${hero.name}" crossorigin="anonymous">
        <div class="mt-1 flex flex-col items-center leading-tight w-full px-1">
            <span class="font-bold text-[10px] text-white truncate w-full text-center">${hero.name}</span>
            <span class="font-black text-[8px] uppercase tracking-wider ${getTroopColorClass(hero.Type)}">${getLocalizedTroop(hero.Type)}</span>
        </div>
      `;
      
      card.onclick = () => {
        forceHideHeroTooltip(); 
        
        if (generatorSelectedHeroes.has(hero.name)) {
          generatorSelectedHeroes.delete(hero.name);
          card.classList.remove('generator-card-selected');
        } else {
          generatorSelectedHeroes.add(hero.name);
          card.classList.add('generator-card-selected');
        }
        // Update selected count badge
        const countBadge = document.getElementById('genSelectedCount');
        if (countBadge) {
          const n = generatorSelectedHeroes.size;
          if (n > 0) { countBadge.textContent = n + ' selected'; countBadge.classList.remove('hidden'); }
          else { countBadge.classList.add('hidden'); }
        }
      };

      card.addEventListener('pointerenter', (e) => {
        if (e.pointerType === 'touch') return; 
        showHeroTooltip(e, hero.name);
      });
      card.addEventListener('pointermove', (e) => {
        if (e.pointerType === 'touch') return;
        moveHeroTooltip(e);
      });
      card.addEventListener('pointerleave', (e) => {
        if (e.pointerType === 'touch') return;
        hideHeroTooltip();
      });

      const infoBtn = card.querySelector('.info-btn');
      if (infoBtn) {
        infoBtn.addEventListener('click', (e) => {
          e.stopPropagation(); 
          e.preventDefault();
          showHeroTooltip(e, hero.name);
        });
        infoBtn.addEventListener('touchstart', (e) => {
          e.stopPropagation(); 
        }, { passive: false });
      }

      generatorHeroesEl.appendChild(card);
    });

    let sourceNote = document.getElementById('heroesSourceNote2');
    if (!sourceNote) {
        sourceNote = document.createElement('div');
        sourceNote.id = 'heroesSourceNote2';
        sourceNote.className = "col-span-full mt-8 text-center text-[10px] sm:text-xs text-slate-500 uppercase tracking-widest border-t border-slate-800/50 pt-4 w-full";
        generatorHeroesEl.parentNode.appendChild(sourceNote);
    }
    sourceNote.innerHTML = sourceCreditText;
}

function renderGeneratorResults(bestCombos) {
  const t = translations[currentLanguage] || translations.en;
  generatorResultsEl.innerHTML = '';

  bestCombos.forEach((combo, i) => {
    const card = document.createElement('div');
    card.className = 'generated-combo-card';

    const slots = document.createElement('div');
    slots.className = 'saved-combo-slots';

    combo.heroes.forEach(name => {
      const item = document.createElement('div');
      item.className = 'saved-combo-slot-item';
      item.style.cursor = 'pointer';
      const img = document.createElement('img');
      img.src = getHeroImageUrl(name);
      img.crossOrigin = 'anonymous';
      img.style.transition = 'transform 0.18s ease, box-shadow 0.18s ease';
      const label = document.createElement('span');
      label.className = 'text-[10px] text-sky-300 font-bold truncate px-1';
      label.textContent = name;
      item.appendChild(img);
      item.appendChild(label);
      // Desktop: hover tooltip
      item.addEventListener('pointerenter', (e) => {
        if (e.pointerType === 'touch') return;
        img.style.transform = 'scale(1.12)';
        img.style.boxShadow = '0 0 18px rgba(56,189,248,0.45)';
        showHeroTooltip(e, name);
      });
      item.addEventListener('pointermove', (e) => {
        if (e.pointerType === 'touch') return;
        moveHeroTooltip(e);
      });
      item.addEventListener('pointerleave', (e) => {
        if (e.pointerType === 'touch') return;
        img.style.transform = '';
        img.style.boxShadow = '';
        hideHeroTooltip();
      });
      // Mobile: tap to show tooltip
      item.addEventListener('click', () => {
        const rect = item.getBoundingClientRect();
        const fakeEvent = { clientX: rect.left + rect.width / 2, clientY: rect.top };
        showHeroTooltip(fakeEvent, name);
      });
      slots.appendChild(item);
    });

    card.innerHTML = `
      <span class="saved-combo-number bg-amber-400 text-slate-900">${i + 1}</span>
    `;
    card.appendChild(slots);

    const scoreBox = document.createElement('div');
    scoreBox.className = 'gen-score-panel';
    scoreBox.innerHTML = `
      <div class="gen-score-main">
        <span class="text-[10px] uppercase tracking-widest text-slate-400">${t.generatorScoreLabel}</span>
        <span class="text-lg font-black text-sky-400">${combo.displayScore}</span>
      </div>
      ${renderCountersToggle(combo.heroes, getComboRankInfo, getHeroImageUrl, true)}
    `;
    card.appendChild(scoreBox);

    generatorResultsEl.appendChild(card);
  });
}

// --- LOGIC ---

async function saveCombo() {
  const t = translations[currentLanguage] || translations.en;
  if (currentCombo.includes(null)) {
    showAboModal(t.messagePleaseDrag3Heroes);
    return;
  }
  loadingSpinner.classList.remove('hidden');
  try {
    const { collection, addDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js');
    await addDoc(collection(db, `users/${userId}/bestCombos`), {
      heroes: [...currentCombo],
      timestamp: serverTimestamp()
    });
    currentCombo = [null, null, null];
    document.querySelectorAll('.combo-slot')
      .forEach((slot, i) => updateComboSlotDisplay(slot, null, i));
    updateManualComboScore();
    if (typeof window.showToast === 'function') window.showToast('✅ Combo saved!', 'success');
  } catch (err) {
    console.error(err);
    if (typeof window.showToast === 'function') window.showToast('❌ Could not save combo', 'error');
  } finally {
    loadingSpinner.classList.add('hidden');
  }
}

function generateBestCombos() {
  const t = translations[currentLanguage] || translations.en;
  const selected = Array.from(generatorSelectedHeroes);

  if (selected.length < 12) { 
    showAboModal(t.generatorMinHeroesMessage || "Select at least 12 heroes to generate best combos.");
    return;
  }

  const ownedSet = new Set(selected);
  const usedHeroesGlobal = new Set();
  const finalSelection = [];
  const total = rankedCombos.length;

  for (let i = 0; i < total; i++) {
    const combo = rankedCombos[i];
    if (finalSelection.length >= 5) break;
    const canBuild = combo.heroes.every(h => ownedSet.has(h));
    const isUnique = !combo.heroes.some(h => usedHeroesGlobal.has(h));

    if (canBuild && isUnique) {
      let rawScore = 100;
      if (total > 1) {
        rawScore = 100 - ((i / (total - 1)) * 99);
      }
      finalSelection.push({ ...combo, displayScore: rawScore.toFixed(1) });
      combo.heroes.forEach(h => usedHeroesGlobal.add(h));
    }
  }

  lastGeneratedCombos = finalSelection;
  renderGeneratorResults(finalSelection);

  if (finalSelection.length > 0) {
    downloadGeneratorBtn.classList.remove('hidden');
    if (typeof window.showToast === 'function') window.showToast(`🎯 Found ${finalSelection.length} best combo${finalSelection.length > 1 ? 's' : ''}!`, 'success');
  } else {
    downloadGeneratorBtn.classList.add('hidden');
  }
}

function generateRandomCombos() {
  const t = translations[currentLanguage] || translations.en;
  const selected = Array.from(generatorSelectedHeroes);
  if (selected.length < 3) {
    showAboModal(t.messagePleaseDrag3Heroes || "Select at least 3 heroes!");
    return;
  }

  const ownedSet = new Set(selected);
  const total = rankedCombos.length;

  const validCombos = rankedCombos
    .map((combo, index) => {
        let rawScore = 100;
        if (total > 1) {
          rawScore = 100 - ((index / (total - 1)) * 99);
        }
        return {
          ...combo,
          originalIndex: index,
          displayScore: rawScore.toFixed(1)
        };
    })
    .filter(combo => combo.heroes.every(h => ownedSet.has(h)));

  if (validCombos.length === 0) {
    showAboModal(t.generatorNoCombosAvailable || "No ranked combos found.");
    return;
  }

  for (let i = validCombos.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [validCombos[i], validCombos[j]] = [validCombos[j], validCombos[i]];
  }

  const randomSelection = [];
  const usedHeroesGlobal = new Set();

  for (const combo of validCombos) {
    if (randomSelection.length >= 5) break;
    const isUnique = !combo.heroes.some(h => usedHeroesGlobal.has(h));
    if (isUnique) {
      randomSelection.push(combo);
      combo.heroes.forEach(h => usedHeroesGlobal.add(h));
    }
  }

  randomSelection.sort((a, b) => parseFloat(b.displayScore) - parseFloat(a.displayScore));

  if (randomSelection.length === 0) {
     showAboModal(t.generatorNoCombosAvailable || "No ranked combos found.");
  } else {
     lastGeneratedCombos = randomSelection;
     renderGeneratorResults(randomSelection);
     downloadGeneratorBtn.classList.remove('hidden');
  }
}

async function setupFirestoreListener() {
  const _db = getDb();
  if (!_db || !userId) return;
  db = _db;

  const { collection, query, orderBy, limit, onSnapshot, deleteDoc, doc } = await import('https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js');

  const q = query(
    collection(db, `users/${userId}/bestCombos`),
    orderBy('timestamp', 'desc'),
    limit(100)
  );

  onSnapshot(q, snap => {
    savedCombosCache = [];
    savedCombosEl.innerHTML = '';
    noCombosMessage.classList.toggle('hidden', !snap.empty);

    let counter = 1;
    snap.forEach(d => {
      const heroes = d.data().heroes || [];
      savedCombosCache.push(heroes);

      const row = document.createElement('div');
      row.className = 'saved-combo-display';
      row.innerHTML = `
        <span class="saved-combo-number">${counter}</span>
        <div class="saved-combo-slots"></div>
      `;

      const slots = row.querySelector('.saved-combo-slots');
      heroes.forEach(name => {
        const item = document.createElement('div');
        item.className = 'saved-combo-slot-item';
        item.innerHTML = `
          <img src="${getHeroImageUrl(name)}">
          <span>${name}</span>
        `;
        slots.appendChild(item);
      });

      const rankInfo = getComboRankInfo(heroes);
      if (rankInfo) {
        const t = translations[currentLanguage] || translations.en;
        const label = t.generatorScoreLabel || 'Score:';
        const scoreBox = document.createElement('div');
        scoreBox.className = 'gen-score-panel saved-combo-scorebox';
        scoreBox.innerHTML = `
          <div class="gen-score-main">
            <span class="text-[10px] uppercase tracking-widest text-slate-400">${label}</span>
            <span class="text-lg font-black text-sky-400">${rankInfo.score}</span>
          </div>
          ${renderCountersToggle(heroes, getComboRankInfo, getHeroImageUrl, true)}
        `;
        row.appendChild(scoreBox);
      }

      const delBtn = document.createElement('button');
      delBtn.className = 'remove-combo-btn';
      delBtn.textContent = 'X';
      delBtn.onclick = () =>
        showAboModal(
          translations[currentLanguage].messageConfirmRemoveCombo,
          async () => {
            await deleteDoc(doc(db, `users/${userId}/bestCombos`, d.id));
          }
        );

      row.appendChild(delBtn);
      savedCombosEl.appendChild(row);
      counter++;
    });
  });
}
// --- UI WIRING ---
function wireUIActions() {
  // === TAB BUTTON HANDLERS ===
const tabs = [
  { btn: tabManualBtn,   name: 'manual' },
  { btn: tabGeneratorBtn,name: 'generator' },
  { btn: tabEdenMapBtn,  name: 'edenMap' },
  { btn: tabLoyaltyBtn,  name: 'loyalty' },
  { btn: tabYouTubeBtn,  name: 'youtube' },
  { btn: tabResearchBtn, name: 'research' },
  { btn: tabHeroesBtn,   name: 'heroes' }
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
      currentLanguage = e.target.value;
      localStorage.setItem('vts_hero_lang', currentLanguage);
      updateTextContent();
      renderAvailableHeroes();
      renderGeneratorHeroes();
    };
  }

  const heroInfoToggle = document.getElementById('heroInfoToggle');
  if (heroInfoToggle) {
    heroInfoToggle.addEventListener('change', (e) => {
      heroInfoEnabled = e.target.checked;
      forceHideHeroTooltip();
      document.body.classList.toggle('hide-hero-info', !heroInfoEnabled);
    });
  }

  let _lastTab = null;
  let _isAnimating = false;
  let _edenMapReady = false;
  let _heroesTabReady = false;

  const tabPanels = [
    manualSection, generatorSection, edenMapSection,
    loyaltySection, youtubeSection, researchSection, heroesSection
  ];

  function loadYouTubeEmbeds() {
    document.querySelectorAll('#youtubeSection iframe[data-src]').forEach((iframe) => {
      if (!iframe.src && iframe.dataset.src) {
        iframe.src = iframe.dataset.src;
      }
    });
  }

  function onTabActivated(tabName) {
    if (tabName === 'edenMap' && !_edenMapReady) {
      initEdenMapPlanner();
      _edenMapReady = true;
    }
    if (tabName === 'heroes' && !_heroesTabReady) {
      renderHeroesTab();
      _heroesTabReady = true;
    }
    if (tabName === 'youtube') {
      loadYouTubeEmbeds();
    }
  }

  function switchTab(tabName, force = false) {
    if (_isAnimating) return;
    if (!force && tabName === _lastTab) return;

    const currentSection = document.querySelector('section.tab-panel:not(.hidden)');
    const targetSection = document.getElementById(`${tabName}Section`);

    const applyTab = () => {
      tabPanels.forEach(sec => {
        if (sec) {
          sec.classList.add('hidden');
          sec.classList.remove('tab-exit');
        }
      });
      if (comboFooterBar) comboFooterBar.classList.add('hidden');

      document.querySelectorAll('.tab-pill').forEach(btn => btn.classList.replace('tab-pill-active', 'tab-pill-inactive'));
      const activeBtn = document.getElementById(`tab${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`);
      if (activeBtn) activeBtn.classList.replace('tab-pill-inactive', 'tab-pill-active');

      if (targetSection) {
        targetSection.classList.remove('hidden');
        void targetSection.offsetWidth;
      }

      if (tabName === 'manual' || tabName === 'generator') {
        if (globalToggleRow) globalToggleRow.classList.remove('hidden');
      } else if (globalToggleRow) {
        globalToggleRow.classList.add('hidden');
      }

      if (tabName === 'manual' && comboFooterBar) {
        comboFooterBar.classList.remove('hidden');
      }

      onTabActivated(tabName);
      _lastTab = tabName;
      _isAnimating = false;
    };

    if (!currentSection || currentSection === targetSection) {
      applyTab();
      return;
    }

    _isAnimating = true;
    currentSection.classList.add('tab-exit');
    setTimeout(applyTab, 250);
  }
  if (seasonFiltersEl) {
    seasonFiltersEl.addEventListener('change', () => {
      selectedSeasons = getCheckedValues(seasonFiltersEl);
      if (!selectedSeasons.length) selectedSeasons = ['S0', 'S1', 'S2', 'S3', 'S4', 'X1', 'X2'];
      renderAvailableHeroes();
    });
  }

  if (stateFiltersEl) {
    stateFiltersEl.addEventListener('change', () => {
      selectedStates = computeStateSelection(stateFiltersEl);
      renderAvailableHeroes();
    });
  }

  if (troopFiltersEl) {
    troopFiltersEl.addEventListener('change', () => {
      selectedTypes = computeTypeSelection(troopFiltersEl);
      renderAvailableHeroes();
    });
  }

  if (genSeasonFiltersEl) {
    genSeasonFiltersEl.addEventListener('change', () => {
      generatorSelectedSeasons = getCheckedValues(genSeasonFiltersEl);
      if (!generatorSelectedSeasons.length) generatorSelectedSeasons = ['S0', 'S1', 'S2', 'S3', 'S4', 'X1', 'X2'];
      renderGeneratorHeroes();
    });
  }

  if (genStateFiltersEl) {
    genStateFiltersEl.addEventListener('change', () => {
      generatorSelectedStates = computeStateSelection(genStateFiltersEl);
      renderGeneratorHeroes();
    });
  }

  if (genTroopFiltersEl) {
    genTroopFiltersEl.addEventListener('change', () => {
      generatorSelectedTypes = computeTypeSelection(genTroopFiltersEl);
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
      currentCombo = [null, null, null];
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

  document.querySelectorAll('[data-i18n-label]').forEach(el => {
    const key = el.getAttribute('data-i18n-label');
    if (t[key]) el.label = t[key].replace('{version}', APP_VERSION);
  });

  document.querySelectorAll('[data-i18n-aria]').forEach(el => {
    const key = el.getAttribute('data-i18n-aria');
    if (t[key]) el.setAttribute('aria-label', t[key].replace('{version}', APP_VERSION));
  });

  window.dispatchEvent(new CustomEvent('edenLanguageUpdate'));

  updateManualComboScore();
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

    seasonBtns.forEach(btn => {
        const season = btn.dataset.season;
        
        if (activeTechSeasons.has(season)) {
            btn.classList.remove('bg-slate-700', 'text-slate-300');
            btn.classList.add('bg-blue-600', 'text-white');
        } else {
            btn.classList.add('bg-slate-700', 'text-slate-300');
            btn.classList.remove('bg-blue-600', 'text-white');
        }

        btn.addEventListener('click', (e) => {
            if (activeTechSeasons.has(season)) {
                if (activeTechSeasons.size > 1) { 
                    activeTechSeasons.delete(season);
                    e.target.classList.remove('bg-blue-600', 'text-white');
                    e.target.classList.add('bg-slate-700', 'text-slate-300');
                }
            } else {
                activeTechSeasons.add(season);
                e.target.classList.remove('bg-slate-700', 'text-slate-300');
                e.target.classList.add('bg-blue-600', 'text-white');
            }

            renderTechList();
            document.getElementById('techCalculatorContainer').classList.add('hidden'); 
        });
    });

    renderTechList();
}
function renderTechList() {
    const container = document.getElementById('techListContainer');
    
    // Inject dynamic CSS to handle explicit Row/Col placements securely
    if (!document.getElementById('dynamic-tech-grid-styles')) {
        const style = document.createElement('style');
        style.id = 'dynamic-tech-grid-styles';
        style.innerHTML = `
            @media (min-width: 1024px) {
                .tech-card-pos {
                    grid-row: var(--desk-row);
                    grid-column: var(--desk-col);
                }
            }
            .tech-card-hover:hover {
                box-shadow: 0 10px 25px var(--hover-color) !important;
                border-color: var(--border-color) !important;
                transform: translateY(-2px);
            }
        `;
        document.head.appendChild(style);
    }

    // Grid capped at exactly 4 columns (lg:grid-cols-4)
    container.innerHTML = '<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 w-full relative" id="techGridWrapper"></div>';
    const wrapper = document.getElementById('techGridWrapper');

    const filteredTechs = techDatabase.filter(tech => activeTechSeasons.has(tech.season));
    updateGlobalSummary(filteredTechs);

    if (filteredTechs.length === 0) {
        wrapper.innerHTML = `<p class="text-slate-500 italic col-span-full text-center py-4">No research data available for selected seasons.</p>`;
        return;
    }

    filteredTechs.forEach(tech => {
        const card = document.createElement('div');
        
        // Grab the vibrant color for this specific season
        const sColor = TechseasonColors[tech.season] || '#3b82f6';
        
        // Extract default position if it exists, otherwise auto-place
        const r = tech.default_pos?.row || 'auto';
        const c = tech.default_pos?.col || 'auto';

        card.className = "tech-card-pos tech-card-hover bg-slate-800 p-4 rounded-xl border border-slate-700 cursor-pointer transition-all duration-300 flex flex-col justify-between relative overflow-hidden group w-full";
        
        // Feed the explicit coordinates and colors to the CSS
        card.style.cssText = `
            --desk-row: ${r}; 
            --desk-col: ${c}; 
            --hover-color: ${sColor}40; 
            --border-color: ${sColor};
            border-top: 4px solid ${sColor};
        `;
        
        card.innerHTML = `
            <button class="absolute top-3 right-3 bg-slate-900 hover:brightness-125 border text-[10px] font-black px-2 py-1 rounded shadow cursor-pointer uppercase z-20 transition-all" style="border-color: ${sColor}80; color: ${sColor}" onclick="quickMaxTech(event, '${tech.id}')">MAX</button>
            
            <div class="pr-12 relative z-10">
                <h3 class="text-lg sm:text-xl font-black text-white uppercase tracking-widest leading-tight drop-shadow-sm">${tech.name}</h3>
                <span class="text-[10px] sm:text-xs font-black px-2 py-0.5 rounded text-slate-900 mt-2 inline-block shadow-sm" style="background-color: ${sColor};">${tech.season}</span>
            </div>
            
            <p class="text-[10px] sm:text-xs text-amber-400 mt-3 mb-4 font-bold uppercase tracking-wider line-clamp-2 leading-snug relative z-10">Unlock: ${tech.unlockCondition}</p>
            
            <button class="font-black py-2 sm:py-2.5 rounded-lg text-xs w-full mt-auto transition-all uppercase tracking-widest text-slate-900 shadow-md group-hover:scale-[1.02]" style="background-color: ${sColor};">Open Calculator</button>
            
            <div class="absolute -bottom-12 -right-12 w-36 h-36 rounded-full blur-3xl opacity-20 pointer-events-none transition-opacity group-hover:opacity-40" style="background-color: ${sColor};"></div>
        `;
        
        card.onclick = () => renderCalculator(tech);
        wrapper.appendChild(card);
    });

    let sourceNote = document.getElementById('researchSourceNote');
    if (!sourceNote) {
        sourceNote = document.createElement('div');
        sourceNote.id = 'researchSourceNote';
        sourceNote.className = "col-span-full mt-8 text-center text-[10px] sm:text-xs text-slate-500 uppercase tracking-widest border-t border-slate-800/50 pt-4 w-full";
        container.appendChild(sourceNote);
    }
    sourceNote.innerHTML = sourceCreditText;
}
function updateGlobalSummary(filteredTechs = null) {
    if (!filteredTechs) {
        filteredTechs = techDatabase.filter(tech => activeTechSeasons.has(tech.season));
    }
    
    let totalWbMax = 0, totalWbCurrent = 0;
    let totalCmMax = 0, totalCmCurrent = 0;
    
    filteredTechs.forEach(tech => {
        tech.nodes.forEach(node => {
            const savedLevel = parseInt(localStorage.getItem(`tech_${tech.id}_${node.id}`)) || 0;
            
            for (let i = 0; i < node.maxLevel; i++) {
                let genericCost = (node.costs && node.costs[i]) || 0;
                let wbCost = (node.warBadgeCosts && node.warBadgeCosts[i]) || (node.wisdomCosts && node.wisdomCosts[i]) || (node.wb_costs && node.wb_costs[i]) || 0;
                let cmCost = (node.courageCosts && node.courageCosts[i]) || (node.cm_costs && node.cm_costs[i]) || 0;

                let nodeWb = 0;
                let nodeCm = 0;

                if (node.costType === "Dual") {
                    nodeWb = wbCost > 0 ? wbCost : genericCost;
                    nodeCm = cmCost;
                } else if (node.costType === "Courage") {
                    nodeCm = genericCost > 0 ? genericCost : cmCost;
                } else if (node.costType === "Wisdom" || node.costType === "War Badge" || node.costType === "War Badges") {
                    nodeWb = genericCost > 0 ? genericCost : wbCost;
                }
                
                totalWbMax += nodeWb;
                totalCmMax += nodeCm;
                
                if (i < savedLevel) {
                    totalWbCurrent += nodeWb;
                    totalCmCurrent += nodeCm;
                }
            }
        });
    });
    
    let remainingWb = totalWbMax - totalWbCurrent;
    let remainingCm = totalCmMax - totalCmCurrent;
    
    let totalMedalsMax = totalWbMax + totalCmMax;
    let totalMedalsCurrent = totalWbCurrent + totalCmCurrent;
    let progressPercent = totalMedalsMax > 0 ? (totalMedalsCurrent / totalMedalsMax) * 100 : 0;
    
    let summaryEl = document.getElementById('globalTechSummary');
    if (!summaryEl) {
        summaryEl = document.createElement('div');
        summaryEl.id = 'globalTechSummary';
        summaryEl.className = 'mb-4 sm:mb-6';
        const container = document.getElementById('techListContainer');
        container.parentNode.insertBefore(summaryEl, container);
    }
    
    if (totalMedalsMax === 0) {
        summaryEl.innerHTML = '';
        return;
    }

    const iconCM = `<img src="images/CM.png" class="w-4 h-4 sm:w-8 sm:h-8 inline-block align-middle mr-1 sm:mr-2 object-contain" alt="CM">`;
    const iconWB = `<img src="images/WB.png" class="w-4 h-4 sm:w-8 sm:h-8 inline-block align-middle mr-1 sm:mr-2 object-contain" alt="WB">`;

    summaryEl.innerHTML = `
        <div class="bg-gradient-to-br from-slate-900 to-slate-800 p-3 sm:p-6 rounded-xl sm:rounded-2xl border-2 border-blue-500/20 shadow-2xl relative overflow-hidden">
            <h3 class="text-sm sm:text-lg font-black text-white uppercase tracking-widest mb-2 sm:mb-4 flex items-center gap-1.5 sm:gap-2 relative z-10">
                <svg class="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                Global Needs Summary
            </h3>
            
            <div class="mb-3 sm:mb-5 relative z-10">
                <div class="flex justify-between items-end mb-1 sm:mb-2">
                    <span class="text-[9px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest">Combined Completion</span>
                    <span class="text-base sm:text-xl font-black text-sky-400 drop-shadow-md tabular-nums">${progressPercent.toFixed(1)}%</span>
                </div>
                <div class="w-full bg-slate-950 rounded-full h-3 sm:h-5 border border-slate-700/50 overflow-hidden shadow-inner">
                    <div class="bg-gradient-to-r from-blue-600 to-sky-400 h-full rounded-full transition-all duration-500 ease-out" style="width: ${progressPercent}%"></div>
                </div>
            </div>

            <div class="grid grid-cols-2 gap-2 sm:gap-4 relative z-10">
                ${totalWbMax > 0 ? `
                <div class="bg-slate-950/60 p-2 sm:p-4 rounded-lg sm:rounded-xl border border-purple-500/30 flex flex-col justify-center shadow-inner tabular-nums">
                    <span class="text-[8px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-0.5 sm:mb-1.5">Remaining WB</span>
                    <span class="flex items-center text-base sm:text-3xl font-black text-purple-400">${iconWB} ${remainingWb.toLocaleString()}</span>
                    <span class="text-[8px] sm:text-xs text-slate-500 font-semibold mt-1 sm:mt-1.5 w-full">of ${totalWbMax.toLocaleString()} total</span>
                </div>
                ` : ''}
                
                ${totalCmMax > 0 ? `
                <div class="bg-slate-950/60 p-2 sm:p-4 rounded-lg sm:rounded-xl border border-blue-500/30 flex flex-col justify-center shadow-inner tabular-nums">
                    <span class="text-[8px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-0.5 sm:mb-1.5">Remaining CM</span>
                    <span class="flex items-center text-base sm:text-3xl font-black text-blue-400">${iconCM} ${remainingCm.toLocaleString()}</span>
                    <span class="text-[8px] sm:text-xs text-slate-500 font-semibold mt-1 sm:mt-1.5 w-full">of ${totalCmMax.toLocaleString()} total</span>
                </div>
                ` : ''}
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
function renderCalculator(tech) {
    const container = document.getElementById('techCalculatorContainer');
    container.classList.remove('hidden');

    // 1. Cleanly normalize the manual Row/Col/Branch tags from the DB. 
    // ZERO auto-guessing logic here.
    tech.nodes.forEach((node) => {
        if (node.Row !== undefined) node.row = node.Row;
        if (node.column !== undefined) node.col = node.column;
        if (node.branch !== undefined) node.b = node.branch;
    });

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
        <div class="flex flex-col border-b border-slate-700 pb-3 sm:pb-4 mb-3 sm:mb-4">
            <div class="flex justify-between items-start mb-3 sm:mb-4">
                <div>
                    <h3 class="text-lg sm:text-2xl font-black text-sky-400 uppercase tracking-widest drop-shadow-md">${tech.name} <span class="text-slate-500 text-sm sm:text-lg ml-1 sm:ml-2 tracking-normal">(${tech.season})</span></h3>
                    <p class="text-[10px] sm:text-sm text-slate-400 mt-0.5 sm:mt-1 font-semibold uppercase tracking-wide">Primary Cost: <span class="text-white">${tech.primaryResource}</span></p>
                </div>
                <button id="closeCalcBtn" class="text-slate-400 hover:text-white bg-slate-800 hover:bg-red-500/80 p-1.5 sm:p-2.5 rounded-full transition-colors border border-slate-600 shadow-md shrink-0">
                    <svg class="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
            </div>
            
            <div class="flex gap-2 sm:gap-3 mt-1 sm:mt-2">
                <button id="resetAllTechBtn" class="flex-1 bg-red-900/30 hover:bg-red-800/50 text-red-400 border border-red-500/30 font-bold py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[9px] sm:text-xs uppercase tracking-widest transition-all shadow-sm">
                    Reset All
                </button>
                <button id="maxAllTechBtn" class="flex-1 bg-emerald-900/30 hover:bg-emerald-800/50 text-emerald-400 border border-emerald-500/30 font-bold py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[9px] sm:text-xs uppercase tracking-widest transition-all shadow-sm">
                    Max All
                </button>
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
            <div class="flex gap-2 sm:gap-4 mt-4 sm:mt-6 mb-6 sm:mb-8 relative z-10 w-full justify-center max-w-[800px] px-2">
                <button class="branch-tab-btn active flex-1 py-2 sm:py-3 px-1 sm:px-2 rounded-lg sm:rounded-xl bg-blue-600 text-white font-black tracking-widest text-[9px] sm:text-xs border border-blue-400/50 shadow-[0_0_15px_rgba(59,130,246,0.5)] transition-all flex flex-col items-center gap-1" data-target="branch_1">
                    <span class="text-lg sm:text-2xl font-black leading-none">+</span> <span class="uppercase">Footmen</span>
                </button>
                <button class="branch-tab-btn flex-1 py-2 sm:py-3 px-1 sm:px-2 rounded-lg sm:rounded-xl bg-slate-800 text-slate-400 font-bold tracking-widest text-[9px] sm:text-xs border border-slate-700 hover:bg-slate-700 transition-all flex flex-col items-center gap-1" data-target="branch_2">
                    <span class="text-lg sm:text-2xl font-black leading-none">+</span> <span class="uppercase">Cavalry</span>
                </button>
                <button class="branch-tab-btn flex-1 py-2 sm:py-3 px-1 sm:px-2 rounded-lg sm:rounded-xl bg-slate-800 text-slate-400 font-bold tracking-widest text-[9px] sm:text-xs border border-slate-700 hover:bg-slate-700 transition-all flex flex-col items-center gap-1" data-target="branch_3">
                    <span class="text-lg sm:text-2xl font-black leading-none">+</span> <span class="uppercase">Archer</span>
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
        <div class="bg-gradient-to-r from-slate-900 to-slate-800 p-3 sm:p-6 rounded-xl sm:rounded-2xl border-2 border-amber-600/40 shadow-[0_0_20px_rgba(217,119,6,0.15)] flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4">
            <div class="flex flex-col">
                <span class="text-[11px] sm:text-sm text-amber-500 font-bold uppercase tracking-widest mb-0.5 sm:mb-1">Tree Total</span>
                <span class="text-[10px] sm:text-sm text-slate-400">Total remaining for this specific tree</span>
            </div>
            <div id="totalTechCost" class="flex flex-col items-start sm:items-end gap-1.5 sm:gap-2 tabular-nums">
                </div>
        </div>
    `;

    container.innerHTML = html;
    document.getElementById('closeCalcBtn').onclick = () => container.classList.add('hidden');

    const branchTabs = container.querySelectorAll('.branch-tab-btn');
    const branchContents = container.querySelectorAll('.branch-content');
    
    branchTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            branchTabs.forEach(t => {
                t.classList.remove('bg-blue-600', 'text-white', 'shadow-[0_0_15px_rgba(59,130,246,0.5)]', 'border-blue-400/50', 'active', 'font-black');
                t.classList.add('bg-slate-800', 'text-slate-400', 'border-slate-700', 'font-bold');
            });
            branchContents.forEach(c => c.classList.add('hidden'));

            tab.classList.add('bg-blue-600', 'text-white', 'shadow-[0_0_15px_rgba(59,130,246,0.5)]', 'border-blue-400/50', 'active', 'font-black');
            tab.classList.remove('bg-slate-800', 'text-slate-400', 'border-slate-700', 'font-bold');
            
            container.querySelector('#' + tab.dataset.target).classList.remove('hidden');
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
        if (!container) return;
        
        const input = container.querySelector('.tech-node-input');
        const display = container.querySelector('.node-cost-display');
        const currentLevel = parseInt(input.value) || 0;
        
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

        if (node.costType === "Dual") {
            display.innerHTML = `
                <span class="flex items-center justify-between w-full text-purple-300 font-bold bg-purple-900/30 px-1 sm:px-2 py-0.5 sm:py-1 rounded border border-purple-500/30">${iconWB} <span>${nodeWisdom.toLocaleString()}</span></span>
                <span class="flex items-center justify-between w-full text-blue-300 font-bold bg-blue-900/30 px-1 sm:px-2 py-0.5 sm:py-1 rounded border border-blue-500/30 mt-1">${iconCM} <span>${nodeCourage.toLocaleString()}</span></span>
            `;
        } else if (node.costType === "Courage") {
            display.innerHTML = `<span class="flex items-center justify-between w-full text-blue-300 font-bold bg-blue-900/30 px-1 sm:px-2 py-0.5 sm:py-1 rounded border border-blue-500/30">${iconCM} <span>${nodeCourage.toLocaleString()}</span></span>`;
        } else if (node.costType === "Wisdom" || node.costType === "War Badge" || node.costType === "War Badges") {
            display.innerHTML = `<span class="flex items-center justify-between w-full text-purple-300 font-bold bg-purple-900/30 px-1 sm:px-2 py-0.5 sm:py-1 rounded border border-purple-500/30">${iconWB} <span>${nodeWisdom.toLocaleString()}</span></span>`;
        } else {
            display.innerHTML = `<span class="flex items-center justify-between w-full text-amber-400 font-bold bg-amber-900/30 px-1 sm:px-2 py-0.5 sm:py-1 rounded border border-amber-500/30">${iconRes} <span>${nodeOther.toLocaleString()}</span></span>`;
        }

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

const HERO_ATLAS_ALL_SEASONS = ['S0', 'S1', 'S2', 'S3', 'S4', 'X1', 'X2'];

let _heroesTabState = {
  seasons: [...HERO_ATLAS_ALL_SEASONS],
  troop: 'all',
  state: 'all',
  search: '',
  selected: null,
  view: 'ranking',
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
  const { seasons: selectedSeasons, troop, state, search, selected, view } = _heroesTabState;

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
      const rankNumber = i < 3 ? medal : `#${i+1}`;
      return `
        <div class="hero-rank-row ${selected === hero.name ? 'selected' : ''}" data-hero-name="${escapeHtml(hero.name)}">
          <span class="rank-medal">${rankNumber}</span>
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
      const synergies = getSynergies(selected);

      const heroCombos = rankedCombos
        .map((c,i) => ({...c, rank: i+1, score:(rankedCombos.length>1?100-((i/(rankedCombos.length-1))*99):100).toFixed(1)}))
        .filter(c => c.heroes && c.heroes.includes(selected))
        .slice(0, 5);

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
          ${renderCountersToggle(c.heroes, getComboRankInfo, getHeroImageUrl, true)}
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
            <div class="detail-section-title">Top Combos</div>
            <div class="detail-combos">${combosHtml || '<p class="text-xs text-slate-500 italic">No ranked combos yet.</p>'}</div>
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

// --- INITIALIZE EVERYTHING ---
async function startApp() {
    // 1. Setup UI & Render Heroes
    updateTextContent();
    renderAvailableHeroes();
    renderGeneratorHeroes();
    wireUIActions();
    console.log('wireUIActions finished, tabs should be clickable');
    // 2. Start the Local Calculators
    initResearchCalculator();
    
    // RESTORED: Wake up the Loyalty Calculator!
    if (typeof initLoyaltyCalculator === 'function') {
        initLoyaltyCalculator();
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

  // Hide buttons if not needed (on desktop)
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

// Call this after your existing DOM setup
initTabScroll();
  
    // 3. Initialize Firebase & User Data
    try {
        await initFirebase();
        const user = await ensureAnonymousAuth();
        
        // RESTORED: Assign the actual Firebase User ID so your saved combos work!
        if (user && user.uid) {
            userId = user.uid;
        }
        
        setupFirestoreListener();
        
        // RESTORED: Wake up the Comments section!
        if (typeof initComments === 'function') {
            initComments();
        }
        
    } catch (error) {
        console.warn("Firebase could not initialize (might be offline or missing config).", error);
    }
}

// Fire it up!
startApp();
