// js/app.js - Fixed & Polished Version b2.3
import { translations as baseTranslations } from './translations.js';
import { initFirebase, ensureAnonymousAuth, getDb } from './firebase.js';
import { initComments } from './comments.js';
import { rankedCombos } from './combos-db.js';

const translations = baseTranslations;

// DOM references
const languageSelect = document.getElementById('languageSelect');
const availableHeroesEl = document.getElementById('availableHeroes');
const saveComboBtn = document.getElementById('saveComboBtn');
const clearComboBtn = document.getElementById('clearComboBtn');
const downloadCombosBtn = document.getElementById('downloadCombosBtn');
const savedCombosEl = document.getElementById('savedCombos');
const noCombosMessage = document.getElementById('noCombosMessage');
const loadingSpinner = document.getElementById('loadingSpinner');
const messageBox = document.getElementById('messageBox');
const messageText = document.getElementById('messageText');
const messageBoxOkBtn = document.getElementById('messageBoxOkBtn');
const shareAllCombosBtn = document.getElementById('shareAllCombosBtn');
const downloadGeneratorBtn = document.getElementById('downloadGeneratorBtn');

const tabManualBtn = document.getElementById('tabManual');
const tabGeneratorBtn = document.getElementById('tabGenerator');
const manualSection = document.getElementById('manualBuilderSection');
const generatorSection = document.getElementById('comboGeneratorSection');

const generatorHeroesEl = document.getElementById('generatorHeroes');
const generatorSeasonFilters = document.getElementById('generatorSeasonFilters');
const generateCombosBtn = document.getElementById('generateCombosBtn');
const generatorResultsEl = document.getElementById('generatorResults');

// --- STATE ---
let currentLanguage = localStorage.getItem('vts_hero_lang') || 'en';
let selectedSeasons = ['S0']; 
let currentCombo = [null, null, null];
let generatorSelectedSeasons = ['S0']; 
const generatorSelectedHeroes = new Set();
let db = null;
let userId = 'anonymous';
let isAuthReady = false;
let userCombosData = []; 

// -------------------------------------------------------------
// Hero Data Array
// -------------------------------------------------------------
const allHeroesData = [
  // Season 0
  { name: "Jeanne d'Arc", season: 'S0', imageUrl: 'https://static.wixstatic.com/media/43ee96_d5f5b07c90924e6ab5b1d70e2667b693~mv2.png/v1/fill/w_99,h_99,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png' },
  { name: 'Isabella I', season: 'S0', imageUrl: 'https://static.wixstatic.com/media/43ee96_dcba45dd1c394074a0e23e3f780c6aee~mv2.png/v1/fill/w_99,h_99,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png' },
  { name: 'Jiguang Qi', season: 'S0', imageUrl: 'https://static.wixstatic.com/media/43ee96_3bb681424e034e9e8f0dea7d71c93390~mv2.png/v1/fill/w_99,h_99,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png' },
  { name: 'Mary Tudor', season: 'S0', imageUrl: 'https://static.wixstatic.com/media/43ee96_7d24a8f5148b42c68e9e183ecdf1080d~mv2.png/v1/fill/w_99,h_99,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png' },
  { name: 'Leonidas', season: 'S0', imageUrl: 'https://static.wixstatic.com/media/43ee96_f672d18c06904465a490ea4811cee798~mv2.png/v1/fill/w_99,h_99,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png' },
  { name: 'The Boneless', season: 'S0', imageUrl: 'https://static.wixstatic.com/media/43ee96_5fec4c7d62314acfb90ea624dedd08c6~mv2.png/v1/fill/w_99,h_99,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png' },
  { name: 'Demon Spear', season: 'S0', imageUrl: 'https://static.wixstatic.com/media/43ee96_39ffb285fd524cd1b7c27057b0fe4f44~mv2.png/v1/fill/w_99,h_99,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png' },
  { name: 'Kublai', season: 'S0', imageUrl: 'https://static.wixstatic.com/media/43ee96_19f2c6dda1b04b72942f1f691efd63b2~mv2.png/v1/fill/w_99,h_99,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png' },
  { name: 'The Heroine', season: 'S0', imageUrl: 'https://static.wixstatic.com/media/43ee96_80bd949738da42cc88525fd5d6dc1f81~mv2.png/v1/fill/w_99,h_99,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png' },
  { name: 'Queen Anne', season: 'S0', imageUrl: 'https://static.wixstatic.com/media/43ee96_4a70ebf4f01c444f9e238861826c0b90~mv2.png/v1/fill/w_99,h_99,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png' },
  { name: "North's Rage", season: 'S0', imageUrl: 'https://static.wixstatic.com/media/43ee96_582201a2a5e14a29a9c186393dd0bb06~mv2.png/v1/fill/w_99,h_99,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png' },
  { name: 'William Wallace', season: 'S0', imageUrl: 'https://static.wixstatic.com/media/43ee96_860c9a1a59214245b3d65d0f1fd816de~mv2.png/v1/fill/w_99,h_99,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png' },
  { name: 'Yukimura Sanada', season: 'S0', imageUrl: 'https://static.wixstatic.com/media/43ee96_41cdaf2c39b44127b0c9ede9da2f70b7~mv2.png/v1/fill/w_99,h_99,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png' },
  { name: "Heaven's Justice", season: 'S0', imageUrl: 'https://static.wixstatic.com/media/43ee96_c81fb50a85d14f63b0aee9977c476c6c~mv2.png/v1/fill/w_99,h_99,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png' },
  // Season 1
  { name: 'Alfred', season: 'S1', imageUrl: 'https://static.wixstatic.com/media/43ee96_e75a942dc1c64689b140f23d905b5ca0~mv2.png/v1/fill/w_99,h_99,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png' },
  { name: 'Cao Cao', season: 'S1', imageUrl: 'https://static.wixstatic.com/media/43ee96_3998355c7cae4b70a89000ee66ad8e3f~mv2.png/v1/fill/w_126,h_126,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png' },
  { name: 'Charles the Great', season: 'S1', imageUrl: 'https://static.wixstatic.com/media/43ee96_e95b962e46204b6badbd6e63e1307582~mv2.png/v1/fill/w_99,h_99,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png' },
  { name: 'Black Prince', season: 'S1', imageUrl: 'https://static.wixstatic.com/media/43ee96_29a333b02497463f81d329056996b8a3~mv2.png/v1/fill/w_99,h_99,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png' },
  { name: 'Lionheart', season: 'S1', imageUrl: 'https://static.wixstatic.com/media/43ee96_ecf64b68a8f64ad2bd159f86f5be179c~mv2.png/v1/fill/w_99,h_99,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png' },
  { name: 'Al Fatih', season: 'S1', imageUrl: 'https://static.wixstatic.com/media/43ee96_f834a1ef8d2d4de5bba80ab40e531a6f~mv2.png/v1/fill/w_99,h_99,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png' },
  { name: 'Edward the Confessor', season: 'S1', imageUrl: 'https://static.wixstatic.com/media/43ee96_51538af01a9f4ec789127837e62dccfa~mv2.png/v1/fill/w_99,h_99,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png' },
  { name: 'Constantine the Great', season: 'S1', imageUrl: 'https://static.wixstatic.com/media/43ee96_b738599c5a0b46deb6a4abf7273f9268~mv2.png/v1/fill/w_99,h_99,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png' },
  { name: 'Genghis Khan', season: 'S1', imageUrl: 'https://static.wixstatic.com/media/43ee96_40f1c10ba0e04d4fa3e841f865cd206a~mv2.png/v1/fill/w_99,h_99,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png' },
  { name: 'William the Conqueror', season: 'S0', imageUrl: 'https://static.wixstatic.com/media/43ee96_517ee1432ce04974be78d3532e48afb3~mv2.png/v1/fill/w_101,h_101,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png' },
  // Season 2
  { name: 'Inquisitor', season: 'S2', imageUrl: 'https://static.wixstatic.com/media/43ee96_5e9612fc176442b78c1fa6766b87473c~mv2.png/v1/fill/w_101,h_101,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png' },
  { name: 'BeastQueen', season: 'S2', imageUrl: 'https://static.wixstatic.com/media/43ee96_6883135290314469a0daee804dd03692~mv2.png/v1/fill/w_101,h_101,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png' },
  { name: 'Jade', season: 'S2', imageUrl: 'https://static.wixstatic.com/media/43ee96_61729052c05240b4b7cf34324f8ed870~mv2.png/v1/fill/w_101,h_101,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png' },
  { name: 'Immortal', season: 'S2', imageUrl: 'https://static.wixstatic.com/media/43ee96_8c4e699dedc341a7a86ae4b47d3cce71~mv2.png/v1/fill/w_101,h_101,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png' },
  { name: 'Peace Bringer', season: 'S2', imageUrl: 'https://static.wixstatic.com/media/43ee96_cfea192f7ad64a13be3fa40c516a8bce~mv2.png/v1/fill/w_101,h_101,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png' },
  { name: 'Witch Hunter', season: 'S2', imageUrl: 'https://static.wixstatic.com/media/43ee96_82ced5fbba3f489fbb04ceb4fa7cd19c~mv2.png/v1/fill/w_101,h_101,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png' },
  { name: 'Ramses II', season: 'S2', imageUrl: 'https://static.wixstatic.com/media/43ee96_2b28a06a2a1544339940724f29bf4b9d~mv2.png/v1/fill/w_101,h_101,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png' },
  { name: 'Octavius', season: 'S2', imageUrl: 'https://static.wixstatic.com/media/43ee96_eeb99bc718ad488b961bb643d4a6653f~mv2.png/v1/fill/w_101,h_101,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png' },
  // Season 3
  { name: 'War Lord', season: 'S3', imageUrl: 'https://static.wixstatic.com/media/43ee96_bbbe6a8669d74ddea17b73af5e3cf05c~mv2.png/v1/fill/w_101,h_101,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png' },
  { name: 'Jane', season: 'S3', imageUrl: 'https://static.wixstatic.com/media/43ee96_d36c3be1d2d64747a59700bf41b8890d~mv2.png/v1/fill/w_101,h_101,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png' },
  { name: 'Sky Breaker', season: 'S3', imageUrl: 'https://static.wixstatic.com/media/43ee96_cacde74500864a0d916746fe0945c970~mv2.png/v1/fill/w_101,h_101,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png' },
  { name: 'Rokuboshuten', season: 'S3', imageUrl: 'https://static.wixstatic.com/media/43ee96_eaf3463bf3654d0e90adb41a1cb5ad4c~mv2.png/v1/fill/w_101,h_101,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png' },
  { name: 'Bleeding Steed', season: 'S3', imageUrl: 'https://static.wixstatic.com/media/43ee96_9256fc0a80284c1ab285554dbf33a4b3~mv2.png/v1/fill/w_101,h_101,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png' },
  { name: 'Rozen Blade', season: 'S3', imageUrl: 'https://static.wixstatic.com/media/43ee96_42b02c160ac849dca0dd7e4a6b472582~mv2.png/v1/fill/w_101,h_101,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png' },
  { name: 'Cleopatra VII', season: 'S3', imageUrl: 'https://static.wixstatic.com/media/43ee96_7109811bb55a47749090edcc8df9e7c6~mv2.png/v1/fill/w_101,h_101,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png' },
  { name: 'Caesar', season: 'S3', imageUrl: 'https://static.wixstatic.com/media/43ee96_5cf26138c5174d4587fc025cd5fe399a~mv2.png/v1/fill/w_101,h_101,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png' },
  // Season 4
  { name: 'Desert Storm', season: 'S4', imageUrl: 'https://i.ibb.co/vChW2BGG/Desert-Storm.png' },
  { name: 'Soaring Hawk', season: 'S4', imageUrl: 'https://i.ibb.co/nsypbRHh/Soaring-hawk.png' },
  { name: 'The Brave', season: 'S4', imageUrl: 'https://i.ibb.co/XxR25Kzy/brave.png' },
  { name: 'Jade Eagle', season: 'S4', imageUrl: 'https://i.ibb.co/GQzRPtZf/Jade-eagle.png' },
  { name: 'Immortal Guardian', season: 'S4', imageUrl: 'https://i.ibb.co/mr0PCzJt/Immortal-Guardian.png' },
  { name: 'Divine Arrow', season: 'S4', imageUrl: 'https://i.ibb.co/6JcVTCnr/Divine-Arrow.png' },
  { name: 'Theodora', season: 'S4', imageUrl: 'https://i.ibb.co/JwtYrGzN/Theodora.png' },
  { name: 'King Arthur', season: 'S4', imageUrl: 'https://i.ibb.co/4Ryx1F6P/King-Arthur.png' }
];

const seasonColors = { S0: '#9ca3af', S1: '#3b82f6', S2: '#a855f7', S3: '#f97316', S4: '#facc15' };

// --- UTILITIES ---
function getHeroImageUrl(heroName) {
  const hero = allHeroesData.find((h) => h.name === heroName);
  return hero?.imageUrl || `https://placehold.co/128x128/374151/e2e8f0?text=${encodeURIComponent(heroName)}`;
}
function showMessageBox(message) {
  if (!messageBox) { alert(message); return; }
  messageText.textContent = message; messageBox.classList.remove('hidden');
  messageBoxOkBtn.onclick = () => messageBox.classList.add('hidden');
}

// --- TRANSLATION LOGIC (FIXED) ---
function updateTextContent() {
  const t = translations[currentLanguage] || translations.en;
  
  // Headers & Manual
  document.getElementById('appTitle').textContent = t.appTitle;
  document.getElementById('tabManual').textContent = t.tabManual;
  document.getElementById('tabGenerator').textContent = t.tabGenerator;
  document.getElementById('filterBySeasonTitle').textContent = t.filterBySeasonTitle;
  document.getElementById('availableHeroesTitle').textContent = t.availableHeroesTitle;
  document.getElementById('createComboTitle').textContent = t.createComboTitle;
  document.getElementById('lastBestCombosTitle').textContent = t.lastBestCombosTitle;
  saveComboBtn.textContent = t.saveComboBtn;
  clearComboBtn.textContent = t.clearComboBtn;
  downloadCombosBtn.textContent = t.downloadCombosBtn;
  shareAllCombosBtn.textContent = t.shareAllCombosBtn;

  // Generator
  document.getElementById('genToolTitle').textContent = t.generatorTitle;
  document.getElementById('genIntroText').innerHTML = t.generatorIntro;
  document.getElementById('genFilterTitle').textContent = t.filterBySeasonTitle;
  document.getElementById('genSelectTitle').textContent = t.generatorSelectAll;
  document.getElementById('genSelectAllBtn').textContent = t.generatorSelectAll;
  document.getElementById('genClearAllBtn').textContent = t.generatorClearAll;
  generateCombosBtn.textContent = t.generatorGenerateBtn;
  if (downloadGeneratorBtn) downloadGeneratorBtn.textContent = t.generatorDownloadBtn;

  // Season labels in Pills
  document.querySelectorAll('.filter-pill span').forEach((span, index) => {
    span.textContent = `${t.seasonLabel} ${index % 5}`;
  });

  if (generatorResultsEl.children.length === 0) {
    generatorResultsEl.innerHTML = `<div class="empty-results-placeholder">${t.generatorNoHeroesSelected}</div>`;
  }
}

// --- CORE RENDERING ---
function renderAvailableHeroes() {
  if (!availableHeroesEl) return; availableHeroesEl.innerHTML = '';
  allHeroesData.filter(h => selectedSeasons.includes(h.season)).forEach(hero => {
    const card = document.createElement('div'); card.className = 'hero-card'; card.draggable = true;
    card.dataset.heroName = hero.name; const tagColor = seasonColors[hero.season] || '#f97316';
    card.innerHTML = `<span class="hero-tag" style="background:${tagColor}">${hero.season}</span><img src="${getHeroImageUrl(hero.name)}" alt="${hero.name}" crossorigin="anonymous"><span class="mt-1 text-center font-bold text-xs">${hero.name}</span>`;
    card.addEventListener('dragstart', (e) => e.dataTransfer.setData('text/plain', hero.name));
    availableHeroesEl.appendChild(card);
  });
}

function renderGeneratorHeroes() {
  if (!generatorHeroesEl) return; generatorHeroesEl.innerHTML = '';
  allHeroesData.filter(h => generatorSelectedSeasons.includes(h.season)).forEach(hero => {
    const card = document.createElement('button');
    card.className = `hero-card generator-card ${generatorSelectedHeroes.has(hero.name) ? 'generator-card-selected' : ''}`;
    card.innerHTML = `<span class="hero-tag" style="background:${seasonColors[hero.season]}">${hero.season}</span><img src="${getHeroImageUrl(hero.name)}" alt="${hero.name}" crossorigin="anonymous"><span class="mt-1 text-center font-bold text-xs">${hero.name}</span>`;
    card.onclick = () => { if (generatorSelectedHeroes.has(hero.name)) { generatorSelectedHeroes.delete(hero.name); card.classList.remove('generator-card-selected'); } else { generatorSelectedHeroes.add(hero.name); card.classList.add('generator-card-selected'); } };
    generatorHeroesEl.appendChild(card);
  });
}

function updateComboSlotDisplay(slot, name, idx) {
  const t = translations[currentLanguage] || translations.en;
  if (name) {
    slot.innerHTML = `<img src="${getHeroImageUrl(name)}" alt="${name}" crossorigin="anonymous"><span class="bottom-2 text-white bg-black/50 px-2 py-1 rounded text-xs w-full truncate">${name}</span>`;
    slot.classList.add('relative', 'p-0');
  } else {
    slot.innerHTML = `<div class="combo-slot-placeholder"><span class="text-5xl font-bold text-blue-400">+</span><span class="text-xs text-gray-300">${t.dragHeroHere}</span></div>`;
    slot.classList.remove('relative', 'p-0');
  }
}

// --- CUSTOM MODAL ENGINE ---
function showAboModal(message, onConfirm = null) {
  const t = translations[currentLanguage] || translations.en;
  messageText.textContent = message;
  messageBox.classList.remove('hidden');
  
  if (onConfirm) {
    messageBoxOkBtn.textContent = t.messageBoxConfirm || "Confirm";
    messageBoxCancelBtn.classList.remove('hidden');
    messageBoxOkBtn.onclick = () => { messageBox.classList.add('hidden'); onConfirm(); };
    messageBoxCancelBtn.onclick = () => messageBox.classList.add('hidden');
  } else {
    messageBoxOkBtn.textContent = t.messageBoxOk || "OK";
    messageBoxCancelBtn.classList.add('hidden');
    messageBoxOkBtn.onclick = () => messageBox.classList.add('hidden');
  }
}
// --- COMBO GENERATOR ACTIONS ---
async function downloadGeneratorResultsAsImage() {
  if (!generatorResultsEl || generatorResultsEl.children.length === 0) return;
  loadingSpinner.classList.remove('hidden');
  try {
    const canvas = await html2canvas(generatorResultsEl, { scale: 2, useCORS: true, backgroundColor: "#020617", logging: false });
    const link = document.createElement('a'); link.href = canvas.toDataURL('image/png'); link.download = 'Top_Combos.png'; link.click();
  } catch (e) { console.error(e); } finally { loadingSpinner.classList.add('hidden'); }
}

function generateBestCombos() {
  const t = translations[currentLanguage] || translations.en;
  const selected = Array.from(generatorSelectedHeroes);
  
  if (selected.length < 15) { 
    alert(t.generatorMinHeroesMessage); 
    return; 
  }

  const ownedSet = new Set(selected);
  const usedHeroesGlobal = new Set();
  const finalSelection = [];

  // 1. Loop through rankedCombos in their natural order
  for (const combo of rankedCombos) {
    if (finalSelection.length >= 5) break;

    // 2. Check if owned AND heroes are not already used in a higher combo
    const canBuild = combo.heroes.every(h => ownedSet.has(h));
    const isUnique = !combo.heroes.some(h => usedHeroesGlobal.has(h));

    if (canBuild && isUnique) {
      // Calculate a "Dynamic Score" for display (optional)
      // Top 1 gets 100, and it drops slightly for each item down the list
      const dynamicScore = 100 - rankedCombos.indexOf(combo);
      
      finalSelection.push({ ...combo, displayScore: dynamicScore });
      combo.heroes.forEach(h => usedHeroesGlobal.add(h));
    }
  }

  renderGeneratorResults(finalSelection);
// FIX: Explicitly remove the 'hidden' class so the button appears
  if (finalSelection.length > 0) {
    const downloadGeneratorBtn = document.getElementById('downloadGeneratorBtn');
    if (downloadGeneratorBtn) {
      downloadGeneratorBtn.classList.remove('hidden');
    }
  }
}
/**
 * Renders the top 5 generated combos ensuring each hero is unique.
 * Automatically calculates a display score based on the database position.
 */
function renderGeneratorResults(bestCombos) {
  const t = translations[currentLanguage] || translations.en;
  generatorResultsEl.innerHTML = '';
  generatorResultsEl.classList.remove('empty-results-border');

  if (bestCombos.length === 0) {
    generatorResultsEl.classList.add('empty-results-border');
    generatorResultsEl.innerHTML = `<p class="text-sm text-slate-300 text-center w-full py-8">${t.generatorNoCombosAvailable}</p>`;
    return;
  }

  // Display only the top 5 unique combos found
  bestCombos.forEach((combo, i) => {
    const card = document.createElement('div');
    card.className = 'generated-combo-card';

    // HERO SLOTS CONTAINER
    const slots = document.createElement('div');
    slots.className = 'saved-combo-slots';
    
    combo.heroes.forEach(name => {
      const item = document.createElement('div');
      item.className = 'saved-combo-slot-item';
      // Crossorigin anonymous is required for html2canvas to capture the images
      item.innerHTML = `
        <img src="${getHeroImageUrl(name)}" alt="${name}" crossorigin="anonymous">
        <span class="text-[10px] sm:text-xs text-sky-300 font-bold truncate px-1">${name}</span>
      `;
      slots.appendChild(item);
    });

    // RANK NUMBER BADGE (Perfectly Centered for Captures)
    card.innerHTML = `<span class="saved-combo-number bg-amber-400 text-slate-900">${i + 1}</span>`;
    card.appendChild(slots);

    // SCORE DISPLAY (Uses calculated score from database order)
    const scoreBox = document.createElement('div');
    scoreBox.className = 'flex flex-col items-center justify-center ml-4 pr-2';
    scoreBox.innerHTML = `
      <span class="text-[10px] uppercase tracking-widest text-slate-400">${t.generatorScoreLabel}</span>
      <span class="text-lg font-black text-sky-400">${combo.displayScore}</span>
    `;
    
    card.appendChild(scoreBox);
    generatorResultsEl.appendChild(card);
  });
}

// --- FIRESTORE ---
async function setupFirestoreListener() {
  const _db = getDb(); if (!_db || !userId) return; db = _db;
  const { collection, query, orderBy, limit, onSnapshot, deleteDoc, doc } = await import('https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js');
  const userCombosRef = collection(db, `users/${userId}/bestCombos`);
  onSnapshot(query(userCombosRef, orderBy('timestamp', 'desc'), limit(100)), (snap) => {
    savedCombosEl.innerHTML = ''; noCombosMessage.classList.toggle('hidden', !snap.empty);
    let counter = 1;
    snap.forEach((d) => {
      const heroes = d.data().heroes || [];
      const row = document.createElement('div'); row.className = 'saved-combo-display';
      row.innerHTML = `<span class="saved-combo-number">${counter}</span><div class="saved-combo-slots"></div>`;
      const slots = row.querySelector('.saved-combo-slots');
      heroes.forEach(name => { const item = document.createElement('div'); item.className = 'saved-combo-slot-item'; item.innerHTML = `<img src="${getHeroImageUrl(name)}"><span>${name}</span>`; slots.appendChild(item); });
      const delBtn = document.createElement('button'); delBtn.className = 'remove-combo-btn'; delBtn.textContent = 'X'; 
      delBtn.onclick = async () => { if(confirm('Delete?')) await deleteDoc(doc(userCombosRef, d.id)); }; row.appendChild(delBtn);
      savedCombosEl.appendChild(row); counter++;
    });
  }, (err) => { if (err.message.includes('quota')) showMessageBox("Hourly limit reached for the VTS database. Try again in an hour."); });
}

async function saveCombo() {
  const t = translations[currentLanguage] || translations.en;
  if (currentCombo.includes(null)) return showMessageBox(t.messagePleaseDrag3Heroes);
  loadingSpinner.classList.remove('hidden');
  try {
    const { collection, addDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js');
    await addDoc(collection(db, `users/${userId}/bestCombos`), { heroes: [...currentCombo], heroesKey: currentCombo.slice().sort().join(','), authorId: userId, timestamp: serverTimestamp() });
    currentCombo = [null, null, null]; document.querySelectorAll('.combo-slot').forEach((s, i) => updateComboSlotDisplay(s, null, i));
  } catch (e) { if (e.message.includes('quota')) showMessageBox("Hourly limit reached."); } finally { loadingSpinner.classList.add('hidden'); }
}

// --- UI WIRING ---
function wireUIActions() {
  languageSelect.value = currentLanguage;
  languageSelect.onchange = (e) => { currentLanguage = e.target.value; localStorage.setItem('vts_hero_lang', currentLanguage); updateTextContent(); renderGeneratorHeroes(); };
 const handleTabSwitch = (isManual) => {
  const minH = Math.max(window.innerHeight * 0.7, 700) + "px";
  manualSection.style.minHeight = minH;
  generatorSection.style.minHeight = minH;

  // Toggle sections
  manualSection.classList.toggle('hidden', !isManual);
  generatorSection.classList.toggle('hidden', isManual);

  // Toggle Sticky Footer visibility
  const footerBar = document.getElementById('comboFooterBar');
  if (footerBar) {
    // Show sticky bar only for Manual Builder
    footerBar.style.display = isManual ? 'block' : 'none';
  }

  // Update tab button styles
  tabManualBtn.className = isManual ? 'tab-pill tab-pill-active' : 'tab-pill tab-pill-inactive';
  tabGeneratorBtn.className = isManual ? 'tab-pill tab-pill-inactive' : 'tab-pill tab-pill-active';
};
  tabManualBtn.onclick = () => handleTabSwitch(true); tabGeneratorBtn.onclick = () => handleTabSwitch(false);
  document.getElementById('seasonFilters').onchange = (e) => { if (e.target.checked) selectedSeasons.push(e.target.value); else selectedSeasons = selectedSeasons.filter(s => s !== e.target.value); renderAvailableHeroes(); };
  generatorSeasonFilters.onchange = (e) => { const val = e.target.value; if (e.target.checked) { if (!generatorSelectedSeasons.includes(val)) generatorSelectedSeasons.push(val); } else { generatorSelectedSeasons = generatorSelectedSeasons.filter(s => s !== val); } renderGeneratorHeroes(); };
  document.getElementById('genSelectAllBtn').onclick = () => { allHeroesData.filter(h => generatorSelectedSeasons.includes(h.season)).forEach(h => generatorSelectedHeroes.add(h.name)); renderGeneratorHeroes(); };
  document.getElementById('genClearAllBtn').onclick = () => { generatorSelectedHeroes.clear(); renderGeneratorHeroes(); };
  saveComboBtn.onclick = saveCombo; generateCombosBtn.onclick = generateBestCombos; downloadGeneratorBtn.onclick = downloadGeneratorResultsAsImage;
}

// --- INIT ---
(async function main() {
  wireUIActions(); updateTextContent(); renderAvailableHeroes(); renderGeneratorHeroes();
  document.querySelectorAll('.combo-slot').forEach((slot, i) => {
    updateComboSlotDisplay(slot, null, i);
    slot.addEventListener('dragover', (e) => e.preventDefault());
    slot.addEventListener('drop', (e) => { e.preventDefault(); const name = e.dataTransfer.getData('text/plain'); const idx = parseInt(slot.dataset.slotIndex); currentCombo[idx] = name; updateComboSlotDisplay(slot, name, idx); });
  });
  try {
    initFirebase(); const user = await ensureAnonymousAuth(); isAuthReady = true; userId = user.uid; db = getDb();
    setupFirestoreListener(); initComments().catch(err => console.error(err));
  } catch (err) { console.error(err); } finally { hideLoadingSpinner(); }
})();
