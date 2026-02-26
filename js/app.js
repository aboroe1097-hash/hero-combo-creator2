// js/app.js - Manual + Generator, scoring, no duplicates, image + text export
import { translations } from './translations.js';
import { initFirebase, ensureAnonymousAuth, getDb } from './firebase.js';
import { initComments } from './comments.js';
import { rankedCombos } from './combos-db.js';
import { initLoyaltyCalculator } from './loyalty-calculator.js';
import { heroesExtendedData } from './heroes-info.js';

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
const manualSection        = document.getElementById('manualBuilderSection');
const generatorSection     = document.getElementById('comboGeneratorSection');
const tabManualBtn         = document.getElementById('tabManual');
const tabGeneratorBtn      = document.getElementById('tabGenerator');
const generatorHeroesEl    = document.getElementById('generatorHeroes');
const generatorResultsEl   = document.getElementById('generatorResults');
const generateCombosBtn    = document.getElementById('generateCombosBtn');
const downloadGeneratorBtn = document.getElementById('downloadGeneratorBtn');
const comboFooterBar       = document.getElementById('comboFooterBar');
const tabLoyaltyBtn        = document.getElementById('tabLoyalty');
const loyaltySection       = document.getElementById('loyaltyCalcSection');

// Filter containers
const seasonFiltersEl      = document.getElementById('seasonFilters');
const stateFiltersEl       = document.getElementById('stateFilters');
const troopFiltersEl       = document.getElementById('troopFilters');
const genSeasonFiltersEl   = document.getElementById('generatorSeasonFilters');
const genStateFiltersEl    = document.getElementById('generatorStateFilters');
const genTroopFiltersEl    = document.getElementById('generatorTroopFilters');

// --- STATE ---
let currentLanguage            = localStorage.getItem('vts_hero_lang') || 'en';

// Manual filters
let selectedSeasons            = ['S0', 'S1', 'S2', 'S3', 'S4', 'S5'];
let selectedStates             = ['Free', 'Paid'];              // Free / Paid
let selectedTypes              = ['Archers', 'Footmen', 'Cavalry', 'All']; // troop types

// Manual combo
let currentCombo               = [null, null, null];

// Generator filters
let generatorSelectedSeasons   = ['S0', 'S1', 'S2', 'S3', 'S4', 'S5'];
let generatorSelectedStates    = ['Free', 'Paid'];
let generatorSelectedTypes     = ['Archers', 'Footmen', 'Cavalry', 'All'];

// Generator selected heroes
const generatorSelectedHeroes  = new Set();

let userId = 'anonymous';
let db     = null;

// For “Share as Text”
let savedCombosCache = [];

// Touch-drag state for mobile manual builder
let touchDragHero  = null;
let touchDragGhost = null;

// --- HERO DATA ---
const allHeroesData = [
  { name: "Jeanne d'Arc", season: 'S0', Type:'Cavalry', State:'Paid', imageUrl: 'https://static.wixstatic.com/media/43ee96_d5f5b07c90924e6ab5b1d70e2667b693~mv2.png' },
  { name: 'Isabella I', season: 'S0', Type:'All', State:'Free', imageUrl: 'https://static.wixstatic.com/media/43ee96_dcba45dd1c394074a0e23e3f780c6aee~mv2.png' },
  { name: 'Jiguang Qi', season: 'S1',Type:'Footmen', State:'Free',  imageUrl: 'https://static.wixstatic.com/media/43ee96_3bb681424e034e9e8f0dea7d71c93390~mv2.png' },
  { name: 'Mary Tudor', season: 'S0',Type:'Cavalry', State:'Paid', imageUrl: 'https://static.wixstatic.com/media/43ee96_7d24a8f5148b42c68e9e183ecdf1080d~mv2.png' },
  { name: 'Leonidas', season: 'S0',Type:'Archers', State:'Paid', imageUrl: 'https://static.wixstatic.com/media/43ee96_f672d18c06904465a490ea4811cee798~mv2.png' },
  { name: 'The Boneless', season: 'S0',Type:'Cavalry', State:'Free', imageUrl: 'https://static.wixstatic.com/media/43ee96_5fec4c7d62314acfb90ea624dedd08c6~mv2.png' },
  { name: 'Demon Spear', season: 'S0',Type:'Footmen', State:'Free', imageUrl: 'https://static.wixstatic.com/media/43ee96_39ffb285fd524cd1b7c27057b0fe4f44~mv2.png' },
  { name: 'Kublai', season: 'S0',Type:'All', State:'Free', imageUrl: 'https://static.wixstatic.com/media/43ee96_19f2c6dda1b04b72942f1f691efd63b2~mv2.png' },
  { name: 'The Heroine', season: 'S0',Type:'All', State:'Free', imageUrl: 'https://static.wixstatic.com/media/43ee96_80bd949738da42cc88525fd5d6dc1f81~mv2.png' },
  { name: 'Queen Anne', season: 'S0',Type:'All', State:'Free', imageUrl: 'https://static.wixstatic.com/media/43ee96_4a70ebf4f01c444f9e238861826c0b90~mv2.png' },
  { name: "North's Rage", season: 'S0',Type:'All', State:'Free', imageUrl: 'https://static.wixstatic.com/media/43ee96_582201a2a5e14a29a9c186393dd0bb06~mv2.png' },
  { name: 'William Wallace', season: 'S0',Type:'All', State:'Free', imageUrl: 'https://static.wixstatic.com/media/43ee96_860c9a1a59214245b3d65d0f1fd816de~mv2.png' },
  { name: 'Yukimura Sanada', season: 'S0',Type:'All', State:'Free', imageUrl: 'https://static.wixstatic.com/media/43ee96_41cdaf2c39b44127b0c9ede9da2f70b7~mv2.png' },
  { name: "Heaven's Justice", season: 'S0',Type:'All', State:'Free', imageUrl: 'https://static.wixstatic.com/media/43ee96_c81fb50a85d14f63b0aee9977c476c6c~mv2.png' },

  { name: 'Alfred', season: 'S1',Type:'Cavalry', State:'Paid', imageUrl: 'https://static.wixstatic.com/media/43ee96_e75a942dc1c64689b140f23d905b5ca0~mv2.png' },
  { name: 'Cao Cao', season: 'S1',Type:'Footmen', State:'Free', imageUrl: 'https://static.wixstatic.com/media/43ee96_3998355c7cae4b70a89000ee66ad8e3f~mv2.png' },
  { name: 'Charles the Great', season: 'S1',Type:'Archers', State:'Free', imageUrl: 'https://static.wixstatic.com/media/43ee96_e95b962e46204b6badbd6e63e1307582~mv2.png' },
  { name: 'Black Prince', season: 'S1',Type:'Cavalry', State:'Free', imageUrl: 'https://static.wixstatic.com/media/43ee96_29a333b02497463f81d329056996b8a3~mv2.png' },
  { name: 'Lionheart', season: 'S1',Type:'Cavalry', State:'Free', imageUrl: 'https://static.wixstatic.com/media/43ee96_ecf64b68a8f64ad2bd159f86f5be179c~mv2.png' },
  { name: 'Al Fatih', season: 'S1',Type:'Archers', State:'Free', imageUrl: 'https://static.wixstatic.com/media/43ee96_f834a1ef8d2d4de5bba80ab40e531a6f~mv2.png' },
  { name: 'Edward the Confessor', season: 'S1',Type:'Archers', State:'Free', imageUrl: 'https://static.wixstatic.com/media/43ee96_51538af01a9f4ec789127837e62dccfa~mv2.png' },
  { name: 'Constantine the Great', season: 'S1',Type:'Cavalry', State:'Free', imageUrl: 'https://static.wixstatic.com/media/43ee96_b738599c5a0b46deb6a4abf7273f9268~mv2.png' },
  { name: 'Genghis Khan', season: 'S1',Type:'Footmen', State:'Free', imageUrl: 'https://static.wixstatic.com/media/43ee96_40f1c10ba0e04d4fa3e841f865cd206a~mv2.png' },
  { name: 'William the Conqueror', season: 'S0',Type:'Archers', State:'Free', imageUrl: 'https://static.wixstatic.com/media/43ee96_517ee1432ce04974be78d3532e48afb3~mv2.png' },

  { name: 'Inquisitor', season: 'S2',Type:'Archers', State:'Free', imageUrl: 'https://static.wixstatic.com/media/43ee96_5e9612fc176442b78c1fa6766b87473c~mv2.png' },
  { name: 'BeastQueen', season: 'S2',Type:'Cavalry', State:'Free', imageUrl: 'https://static.wixstatic.com/media/43ee96_6883135290314469a0daee804dd03692~mv2.png' },
  { name: 'Jade', season: 'S2',Type:'Footmen', State:'Free', imageUrl: 'https://static.wixstatic.com/media/43ee96_61729052c05240b4b7cf34324f8ed870~mv2.png' },
  { name: 'Immortal', season: 'S2',Type:'Cavalry', State:'Free', imageUrl: 'https://static.wixstatic.com/media/43ee96_8c4e699dedc341a7a86ae4b47d3cce71~mv2.png' },
  { name: 'Peace Bringer', season: 'S2',Type:'Footmen', State:'Free', imageUrl: 'https://static.wixstatic.com/media/43ee96_cfea192f7ad64a13be3fa40c516a8bce~mv2.png' },
  { name: 'Witch Hunter', season: 'S2',Type:'Archers', State:'Free', imageUrl: 'https://static.wixstatic.com/media/43ee96_82ced5fbba3f489fbb04ceb4fa7cd19c~mv2.png' },
  { name: 'Ramses II', season: 'S2',Type:'Archers', State:'Paid', imageUrl: 'https://static.wixstatic.com/media/43ee96_2b28a06a2a1544339940724f29bf4b9d~mv2.png' },
  { name: 'Octavius', season: 'S2',Type:'Cavalry', State:'Paid', imageUrl: 'https://static.wixstatic.com/media/43ee96_eeb99bc718ad488b961bb643d4a6653f~mv2.png' },

  { name: 'Che Liu', season: 'S3',Type:'Footmen', State:'Free', imageUrl: 'https://i.ibb.co/xqrtrvc1/image-2026-01-25-212407172.png' },
  { name: 'War Lord', season: 'S3',Type:'Cavalry', State:'Free', imageUrl: 'https://static.wixstatic.com/media/43ee96_bbbe6a8669d74ddea17b73af5e3cf05c~mv2.png' },
  { name: 'Jane', season: 'S3',Type:'Cavalry', State:'Free', imageUrl: 'https://static.wixstatic.com/media/43ee96_d36c3be1d2d64747a59700bf41b8890d~mv2.png' },
  { name: 'Sky Breaker', season: 'S3',Type:'Archers', State:'Free', imageUrl: 'https://static.wixstatic.com/media/43ee96_cacde74500864a0d916746fe0945c970~mv2.png' },
  { name: 'Rokuboshuten', season: 'S3',Type:'Cavalry', State:'Free', imageUrl: 'https://static.wixstatic.com/media/43ee96_eaf3463bf3654d0e90adb41a1cb5ad4c~mv2.png' },
  { name: 'Bleeding Steed', season: 'S3',Type:'Footmen', State:'Free', imageUrl: 'https://static.wixstatic.com/media/43ee96_9256fc0a80284c1ab285554dbf33a4b3~mv2.png' },
  { name: 'Rozen Blade', season: 'S3',Type:'Cavalry', State:'Free', imageUrl: 'https://static.wixstatic.com/media/43ee96_42b02c160ac849dca0dd7e4a6b472582~mv2.png' },
  { name: 'Cleopatra VII', season: 'S3',Type:'All', State:'Paid', imageUrl: 'https://static.wixstatic.com/media/43ee96_7109811bb55a47749090edcc8df9e7c6~mv2.png' },
  { name: 'Caesar', season: 'S3',Type:'Cavalry', State:'Paid', imageUrl: 'https://static.wixstatic.com/media/43ee96_5cf26138c5174d4587fc025cd5fe399a~mv2.png' },

  { name: 'Desert Storm',      season: 'S4',Type:'Footmen', State:'Free', imageUrl: 'https://i.ibb.co/vChW2BGG/Desert-Storm.png' },
  { name: 'Soaring Hawk',      season: 'S4',Type:'Footmen', State:'Free', imageUrl: 'https://i.ibb.co/nsypbRHh/Soaring-hawk.png' },
  { name: 'The Brave',         season: 'S4',Type:'Cavalry', State:'Free', imageUrl: 'https://i.ibb.co/XxR25Kzy/brave.png' },
  { name: 'Jade Eagle',        season: 'S4',Type:'Archers', State:'Free', imageUrl: 'https://i.ibb.co/GQzRPtZf/Jade-eagle.png' },
  { name: 'Immortal Guardian', season: 'S4',Type:'Archers', State:'Free', imageUrl: 'https://i.ibb.co/mr0PCzJt/Immortal-Guardian.png' },
  { name: 'Divine Arrow',      season: 'S4',Type:'Archers', State:'Free', imageUrl: 'https://i.ibb.co/6JcVTCnr/Divine-Arrow.png' },
  { name: 'Theodora',          season: 'S4',Type:'Footmen', State:'Paid', imageUrl: 'https://i.ibb.co/JwtYrGzN/Theodora.png' },
  { name: 'King Arthur',       season: 'S4',Type:'Footmen', State:'Paid', imageUrl: 'https://i.ibb.co/4Ryx1F6P/King-Arthur.png' },

  // Season 5 (X1)
  { name: 'Beowulf',      season: 'S5',Type:'Archers', State:'Paid', imageUrl: 'https://i.ibb.co/SXH67JhQ/Bewoulf.png' },
  { name: 'Hunk',         season: 'S5',Type:'Footmen', State:'Free', imageUrl: 'https://i.ibb.co/xKmkbhjc/Hunk.png' },
  { name: 'Boudica',      season: 'S5',Type:'Archers', State:'Paid', imageUrl: 'https://i.ibb.co/7HrC86g/Boudica.png' },
  { name: 'Sakura',       season: 'S5',Type:'Archers', State:'Free', imageUrl: 'https://i.ibb.co/7t82CP32/Sakura.png' },
  { name: 'Wind-Walker',  season: 'S5',Type:'Cavalry', State:'Free', imageUrl: 'https://i.ibb.co/mVwJgyfX/Wind-Walker.png' },
  { name: 'ELK',          season: 'S5',Type:'Archers', State:'Free', imageUrl: 'https://i.ibb.co/zVjfLXVT/ELK.png' },
  { name: 'Cicero',       season: 'S5',Type:'Footmen', State:'Free', imageUrl: 'https://i.ibb.co/B2bNr9Sw/Cicero.png' }
];

const seasonColors = {
  S0: '#9ca3af',
  S1: '#3b82f6',
  S2: '#a855f7',
  S3: '#f97316',
  S4: '#facc15',
  S5: '#67ab69'
};

// --- HERO HOVER TOOLTIP (Optimized for Mobile) ---
// --- HERO HOVER TOOLTIP (Optimized for Mobile & PC) ---
const heroTooltip = document.createElement('div');
heroTooltip.id = 'hero-tooltip';
// ADDED: md:w-[450px], md:max-w-none for a wide, beautiful desktop view
heroTooltip.className = 'fixed z-[9999] bg-slate-900/98 backdrop-blur-md border border-slate-600 rounded-xl p-3 sm:p-4 shadow-2xl text-slate-200 w-[90vw] sm:w-80 md:w-[450px] max-w-[320px] md:max-w-none pointer-events-auto hidden opacity-0 transition-opacity duration-200 flex flex-col';
document.body.appendChild(heroTooltip);

// Close tooltip when touching anywhere else on mobile
document.addEventListener('touchstart', (e) => {
  if (!e.target.closest('.hero-card') && !heroTooltip.contains(e.target)) {
    hideHeroTooltip();
  }
}, { passive: true });

function showHeroTooltip(e, heroName) {
  const data = heroesExtendedData[heroName];
  if (!data) return; 

  const baseData = allHeroesData.find(h => h.name === heroName);
  const troopType = baseData ? baseData.Type : 'Unknown';
  const troopColorClass = getTroopColorClass(troopType);
  const localizedTroop = getLocalizedTroop(troopType);

  // ADDED: md:p-3 and md:text-xs/sm classes for better desktop readability
  let skillsHtml = data.skills.map(s => `
    <div class="mb-2 bg-slate-800 p-2 md:p-3 rounded-lg border border-slate-700 shadow-inner">
      <div class="flex justify-between items-center mb-1 border-b border-slate-700/50 pb-1">
        <span class="text-[10px] sm:text-xs md:text-[13px] font-black text-sky-400 tracking-wider">SKILL ${s.id}</span>
        <span class="text-[8px] sm:text-[10px] md:text-[11px] text-slate-400 font-bold uppercase">${s.type} | Range: <span class="text-white">${s.range}</span></span>
      </div>
      <p class="text-[8.5px] sm:text-[10px] md:text-[11px] text-amber-400 font-bold mb-1 uppercase tracking-wider">Target: <span class="text-white">${s.target}</span></p>
      <p class="text-[9.5px] sm:text-[10px] md:text-[12px] leading-snug md:leading-relaxed text-slate-300">${s.desc}</p>
    </div>
  `).join('');

  heroTooltip.innerHTML = `
    <div class="border-b border-slate-700 pb-2 mb-2 shrink-0">
      <h4 class="text-base sm:text-lg md:text-xl font-black text-white uppercase tracking-wider">${heroName}</h4>
      
      <div class="flex flex-col gap-0.5 mt-1">
        <p class="text-[10px] sm:text-[11px] md:text-xs text-emerald-400 font-bold uppercase tracking-wider">Placement: <span class="text-white">${data.placement || 'Any'}</span></p>
        <p class="text-[10px] sm:text-[11px] md:text-xs text-slate-400 font-bold uppercase tracking-wider">Troop: <span class="${troopColorClass}">${localizedTroop}</span></p>
      </div>

      <div class="flex gap-4 mt-2 bg-slate-800/50 p-1.5 md:p-2 rounded border border-slate-700/50">
        <p class="text-[9px] sm:text-[10px] md:text-[11px] text-slate-400 font-bold uppercase">Min: <span class="text-amber-400">${data.minCopies || 34} copies</span></p>
        <p class="text-[9px] sm:text-[10px] md:text-[11px] text-slate-400 font-bold uppercase">Max: <span class="text-sky-400">${data.maxCopies || 34} copies</span></p>
      </div>
    </div>
    <div class="flex flex-col gap-1 max-h-[45vh] sm:max-h-[50vh] md:max-h-[85vh] overflow-y-auto pr-1 shrink">
      ${skillsHtml || '<p class="text-xs text-slate-500 italic">No skill data available yet.</p>'}
    </div>
  `;

  heroTooltip.classList.remove('hidden');
  requestAnimationFrame(() => {
    heroTooltip.classList.remove('opacity-0');
    heroTooltip.classList.add('opacity-100');
  });
  moveHeroTooltip(e);
}

function moveHeroTooltip(e) {
  if (heroTooltip.classList.contains('hidden')) return;
  const rect = heroTooltip.getBoundingClientRect();
  
  let clientX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches.length > 0 ? e.touches[0].clientX : window.innerWidth / 2);
  let clientY = e.clientY !== undefined ? e.clientY : (e.touches && e.touches.length > 0 ? e.touches[0].clientY : window.innerHeight / 2);

  let x, y;
  if (window.innerWidth < 640) {
    x = (window.innerWidth - rect.width) / 2;
    if (clientY > window.innerHeight / 2) y = clientY - rect.height - 20;
    else y = clientY + 30;
  } else {
    x = clientX + 15;
    y = clientY + 15;
    if (x + rect.width > window.innerWidth) x = clientX - rect.width - 15;
    if (y + rect.height > window.innerHeight) y = window.innerHeight - rect.height - 15;
  }
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


// --- UTILITIES ---

// RESTORED: Fetch Image URL for slots and tables
function getHeroImageUrl(name) {
  const h = allHeroesData.find(x => x.name === name);
  return h?.imageUrl || `https://placehold.co/128x128?text=${encodeURIComponent(name)}`;
}

// Map the Hero Type to a specific color class for the cards
function getTroopColorClass(type) {
  switch(type) {
    case 'Archers': return 'text-emerald-400';
    case 'Footmen': return 'text-amber-400';
    case 'Cavalry': return 'text-sky-400';
    case 'All': return 'text-purple-400';
    default: return 'text-slate-400';
  }
}

// Fetch localized version of the troop type text
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
  const heroState = hero.State || 'Free';
  if (statesArr && statesArr.length && !statesArr.includes(heroState)) return false;
  const heroType = hero.Type || 'All';
  if (!typesArr || !typesArr.length) return true;
  if (heroType === 'All') return true; 
  if (typesArr.includes('All')) return true;
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

function captureElementAsImage(element, filename) {
  if (!element) return;
  const h2c = window.html2canvas;
  if (!h2c) {
    console.warn('html2canvas not available');
    return;
  }
  h2c(element, {
    backgroundColor: '#020617',
    useCORS: true,
    scale: window.devicePixelRatio > 1 ? 2 : 1.5
  }).then(canvas => {
    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }).catch(err => console.error('Error creating image', err));
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
  ghost.style.left = `${rect.left}px`;
  ghost.style.top  = `${rect.top}px`;
  ghost.style.width  = `${rect.width}px`;
  ghost.style.height = `${rect.height}px`;
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
      card.className = 'hero-card';
      card.draggable = true;
      card.dataset.heroName = hero.name;
      
      card.addEventListener('mouseenter', (e) => showHeroTooltip(e, hero.name));
      card.addEventListener('mousemove', moveHeroTooltip);
      card.addEventListener('mouseleave', hideHeroTooltip);

      const tagColor = seasonColors[hero.season] || '#f97316';
      // ADDED: Troop type tag below the name
      card.innerHTML = `
        <span class="hero-tag" style="background:${tagColor}">${hero.season}</span>
        <img src="${hero.imageUrl}" alt="${hero.name}">
        <div class="mt-1 flex flex-col items-center leading-tight w-full px-1">
            <span class="font-bold text-[10px] text-white truncate w-full text-center">${hero.name}</span>
            <span class="font-black text-[8px] uppercase tracking-wider ${getTroopColorClass(hero.Type)}">${getLocalizedTroop(hero.Type)}</span>
        </div>
      `;

      card.addEventListener('dragstart', e => {
        e.dataTransfer.setData('text/plain', hero.name);
      });

      card.addEventListener('touchstart', (e) => {
        const touch = e.touches && e.touches[0];
        touchDragHero = hero.name;
        createTouchGhost(card, touch);
      }, { passive: true });

      card.addEventListener('click', () => {
        if (isHeroAlreadyInCombo(hero.name)) {
          showAboModal(t.manualNoDuplicateHero || 'This hero is already used in your current combo.');
          return;
        }
        const emptyIndex = currentCombo.indexOf(null);
        if (emptyIndex === -1) {
          showAboModal(t.messagePleaseDrag3Heroes || 'Please use Clear to reset your combo first.');
          return;
        }
        currentCombo[emptyIndex] = hero.name;
        const slots = document.querySelectorAll('.combo-slot');
        const targetSlot = slots[emptyIndex];
        if (targetSlot) {
          updateComboSlotDisplay(targetSlot, hero.name, emptyIndex);
          updateManualComboScore();
        }
      });
      availableHeroesEl.appendChild(card);
    });
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
      card.className = `hero-card generator-card ${
        generatorSelectedHeroes.has(hero.name) ? 'generator-card-selected' : ''
      }`;
      
      // ADDED: Troop type tag below the name
      card.innerHTML = `
        <span class="hero-tag" style="background:${seasonColors[hero.season]}">${hero.season}</span>
        <img src="${hero.imageUrl}" alt="${hero.name}" crossorigin="anonymous">
        <div class="mt-1 flex flex-col items-center leading-tight w-full px-1">
            <span class="font-bold text-[10px] text-white truncate w-full text-center">${hero.name}</span>
            <span class="font-black text-[8px] uppercase tracking-wider ${getTroopColorClass(hero.Type)}">${getLocalizedTroop(hero.Type)}</span>
        </div>
      `;
      card.onclick = () => {
        if (generatorSelectedHeroes.has(hero.name)) {
          generatorSelectedHeroes.delete(hero.name);
          card.classList.remove('generator-card-selected');
        } else {
          generatorSelectedHeroes.add(hero.name);
          card.classList.add('generator-card-selected');
        }
      };
      card.addEventListener('mouseenter', (e) => showHeroTooltip(e, hero.name));
      card.addEventListener('mousemove', moveHeroTooltip);
      card.addEventListener('mouseleave', hideHeroTooltip);
      generatorHeroesEl.appendChild(card);
    });
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
      item.innerHTML = `
        <img src="${getHeroImageUrl(name)}" crossorigin="anonymous">
        <span class="text-[10px] text-sky-300 font-bold truncate px-1">${name}</span>
      `;
      slots.appendChild(item);
    });

    card.innerHTML = `
      <span class="saved-combo-number bg-amber-400 text-slate-900">${i + 1}</span>
    `;
    card.appendChild(slots);

    const scoreBox = document.createElement('div');
    scoreBox.className = 'flex flex-col items-center justify-center ml-4 pr-2';
    scoreBox.innerHTML = `
      <span class="text-[10px] uppercase tracking-widest text-slate-400">
        ${t.generatorScoreLabel}
      </span>
      <span class="text-lg font-black text-sky-400">${combo.displayScore}</span>
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
  } catch (err) {
    console.error(err);
  } finally {
    loadingSpinner.classList.add('hidden');
  }
}

function generateBestCombos() {
  const t = translations[currentLanguage] || translations.en;
  const selected = Array.from(generatorSelectedHeroes);

  if (selected.length < 12) { 
    showAboModal(t.generatorMinHeroesMessage || "Select at least 12 heroes.");
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

  renderGeneratorResults(finalSelection);

  if (finalSelection.length > 0) {
    downloadGeneratorBtn.classList.remove('hidden');
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
        scoreBox.className = 'flex flex-col items-center justify-center ml-4 pr-2 saved-combo-scorebox';
        scoreBox.innerHTML = `
          <span class="text-[10px] uppercase tracking-widest text-slate-400">${label}</span>
          <span class="text-lg font-black text-sky-400">${rankInfo.score}</span>
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
  if (languageSelect) {
    languageSelect.onchange = e => {
      currentLanguage = e.target.value;
      localStorage.setItem('vts_hero_lang', currentLanguage);
      updateTextContent();
      renderAvailableHeroes();
      renderGeneratorHeroes();
    };
  }

  const switchTab = (tabName) => {
    if (manualSection) manualSection.classList.add('hidden');
    if (generatorSection) generatorSection.classList.add('hidden');
    if (loyaltySection) loyaltySection.classList.add('hidden');
    if (comboFooterBar) comboFooterBar.style.display = 'none';

    if (tabManualBtn) tabManualBtn.className = 'tab-pill tab-pill-inactive';
    if (tabGeneratorBtn) tabGeneratorBtn.className = 'tab-pill tab-pill-inactive';
    if (tabLoyaltyBtn) tabLoyaltyBtn.className = 'tab-pill tab-pill-inactive';

    if (tabName === 'manual') {
      if (manualSection) manualSection.classList.remove('hidden');
      if (comboFooterBar) comboFooterBar.style.display = 'block';
      if (tabManualBtn) tabManualBtn.className = 'tab-pill tab-pill-active';
    } else if (tabName === 'generator') {
      if (generatorSection) generatorSection.classList.remove('hidden');
      if (tabGeneratorBtn) tabGeneratorBtn.className = 'tab-pill tab-pill-active';
    } else if (tabName === 'loyalty') {
      if (loyaltySection) loyaltySection.classList.remove('hidden');
      if (tabLoyaltyBtn) tabLoyaltyBtn.className = 'tab-pill tab-pill-active';
    }
  };

  if (tabManualBtn) tabManualBtn.onclick = () => switchTab('manual');
  if (tabGeneratorBtn) tabGeneratorBtn.onclick = () => switchTab('generator');
  if (tabLoyaltyBtn) tabLoyaltyBtn.onclick = () => switchTab('loyalty');

  if (seasonFiltersEl) {
    seasonFiltersEl.addEventListener('change', () => {
      selectedSeasons = getCheckedValues(seasonFiltersEl);
      if (!selectedSeasons.length) selectedSeasons = ['S0', 'S1', 'S2', 'S3', 'S4', 'S5'];
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
      if (!generatorSelectedSeasons.length) generatorSelectedSeasons = ['S0', 'S1', 'S2', 'S3', 'S4', 'S5'];
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

  if (genSelectAllBtn) {
    genSelectAllBtn.onclick = () => {
      allHeroesData
        .filter(h => heroMatchesFilters(h, generatorSelectedSeasons, generatorSelectedStates, generatorSelectedTypes))
        .forEach(h => generatorSelectedHeroes.add(h.name));
      renderGeneratorHeroes();
    };
  }

  if (genClearAllBtn) {
    genClearAllBtn.onclick = () => {
      generatorSelectedHeroes.clear();
      renderGeneratorHeroes();
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
      if (!savedCombosEl || !savedCombosEl.children.length) {
        showAboModal(t.noCombosMessage || 'No combos saved yet!');
        return;
      }
      captureElementAsImage(savedCombosEl, 'vts-last-best-combos.png');
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
      if (!generatorResultsEl || !generatorResultsEl.children.length) {
        showAboModal(t.generatorNoCombosAvailable || 'No ranked combos found.');
        return;
      }
      captureElementAsImage(generatorResultsEl, 'vts-generator-results.png');
    };
  }
}

// --- TRANSLATIONS / TEXT ---

async function updateTextContent() {
  const t = translations[currentLanguage] || translations.en;

  const idMap = {
    'appTitle': t.appTitle,
    'tabManual': t.tabManual,
    'tabGenerator': t.tabGenerator,
    'tabLoyalty': t.tabLoyalty,
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
    if (el && text) el.textContent = text;
  }

  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (t[key]) el.textContent = t[key];
  });

  document.querySelectorAll('[data-i18n-ph]').forEach(el => {
    const key = el.getAttribute('data-i18n-ph');
    if (t[key]) el.placeholder = t[key];
  });

  updateManualComboScore();
}

// --- MAIN ---

(async function main() {
  wireUIActions();
  await updateTextContent();

  if (seasonFiltersEl) {
    const seasons = getCheckedValues(seasonFiltersEl);
    if (seasons.length) selectedSeasons = seasons;
  }
  if (stateFiltersEl)   selectedStates = computeStateSelection(stateFiltersEl);
  if (troopFiltersEl)   selectedTypes  = computeTypeSelection(troopFiltersEl);

  if (genSeasonFiltersEl) {
    const gSeasons = getCheckedValues(genSeasonFiltersEl);
    if (gSeasons.length) generatorSelectedSeasons = gSeasons;
  }
  if (genStateFiltersEl) generatorSelectedStates = computeStateSelection(genStateFiltersEl);
  if (genTroopFiltersEl) generatorSelectedTypes  = computeTypeSelection(genTroopFiltersEl);

  renderAvailableHeroes();
  renderGeneratorHeroes();

  setupTouchDragForManualBuilder();
  initLoyaltyCalculator();
  
  tabGeneratorBtn.click();

  document.querySelectorAll('.combo-slot').forEach((slot, i) => {
    slot.dataset.slotIndex = i;
    updateComboSlotDisplay(slot, null, i);

    slot.addEventListener('dragover', e => e.preventDefault());
    slot.addEventListener('drop', e => {
      e.preventDefault();
      const name = e.dataTransfer.getData('text/plain');
      const idx  = parseInt(slot.dataset.slotIndex, 10);

      if (isHeroAlreadyInCombo(name, idx)) {
        const t = translations[currentLanguage] || translations.en;
        showAboModal(t.manualNoDuplicateHero || 'This hero is already used in your current combo.');
        return;
      }

      currentCombo[idx] = name;
      updateComboSlotDisplay(slot, name, idx);
      updateManualComboScore();
    });
  });

  try {
    initFirebase();
    const user = await ensureAnonymousAuth();
    userId = user.uid;
    db = getDb();
    setupFirestoreListener();
    initComments();
  } catch (err) {
    console.error(err);
  }
})();
