// js/app.js - Fixed Version b2.1
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
const savedCombosEl = document.getElementById('savedCombos');
const noCombosMessage = document.getElementById('noCombosMessage');
const loadingSpinner = document.getElementById('loadingSpinner');
const messageBox = document.getElementById('messageBox');
const messageText = document.getElementById('messageText');
const messageBoxOkBtn = document.getElementById('messageBoxOkBtn');
const messageBoxCancelBtn = document.getElementById('messageBoxCancelBtn');
const shareAllCombosBtn = document.getElementById('shareAllCombosBtn');
const downloadCombosBtn = document.getElementById('downloadCombosBtn');

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
let generatorSelectedSeasons = ['S0']; // Default to Season 0 only
const generatorSelectedHeroes = new Set();
let db = null;
let userId = 'anonymous';
let isAuthReady = false;
let spinnerFallbackTimer = null;
let userCombosData = []; 

// -------------------------------------------------------------
// Heroes data (Season 0 to 4)
// -------------------------------------------------------------
const allHeroesData = [
  { name: "Jeanne d'Arc", season: "S0", imageUrl: "https://static.wixstatic.com/media/43ee96_d5f5b07c90924e6ab5b1d70e2667b693~mv2.png" },
  { name: "Isabella I", season: "S0", imageUrl: "https://static.wixstatic.com/media/43ee96_dcba45dd1c394074a0e23e3f780c6aee~mv2.png" },
  { name: "Jiguang Qi", season: "S0", imageUrl: "https://static.wixstatic.com/media/43ee96_3bb681424e034e9e8f0dea7d71c93390~mv2.png" },
  { name: "Mary Tudor", season: "S0", imageUrl: "https://static.wixstatic.com/media/43ee96_7d24a8f5148b42c68e9e183ecdf1080d~mv2.png" },
  { name: "Leonidas", season: "S0", imageUrl: "https://static.wixstatic.com/media/43ee96_f672d18c06904465a490ea4811cee798~mv2.png" },
  { name: "The Boneless", season: "S0", imageUrl: "https://static.wixstatic.com/media/43ee96_5fec4c7d62314acfb90ea624dedd08c6~mv2.png" },
  { name: "Demon Spear", season: "S0", imageUrl: "https://static.wixstatic.com/media/43ee96_39ffb285fd524cd1b7c27057b0fe4f44~mv2.png" },
  { name: "Kublai", season: "S0", imageUrl: "https://static.wixstatic.com/media/43ee96_19f2c6dda1b04b72942f1f691efd63b2~mv2.png" },
  { name: "The Heroine", season: "S0", imageUrl: "https://static.wixstatic.com/media/43ee96_80bd949738da42cc88525fd5d6dc1f81~mv2.png" },
  { name: "Queen Anne", season: "S0", imageUrl: "https://static.wixstatic.com/media/43ee96_4a70ebf4f01c444f9e238861826c0b90~mv2.png" },
  { name: "North's Rage", season: "S0", imageUrl: "https://static.wixstatic.com/media/43ee96_582201a2a5e14a29a9c186393dd0bb06~mv2.png" },
  { name: "William Wallace", season: "S0", imageUrl: "https://static.wixstatic.com/media/43ee96_860c9a1a59214245b3d65d0f1fd816de~mv2.png" },
  { name: "Yukimura Sanada", season: "S0", imageUrl: "https://static.wixstatic.com/media/43ee96_41cdaf2c39b44127b0c9ede9da2f70b7~mv2.png" },
  { name: "Heaven's Justice", season: "S0", imageUrl: "https://static.wixstatic.com/media/43ee96_c81fb50a85d14f63b0aee9977c476c6c~mv2.png" },
  { name: "Alfred", season: "S1", imageUrl: "https://static.wixstatic.com/media/43ee96_e75a942dc1c64689b140f23d905b5ca0~mv2.png" },
  { name: "Cao Cao", season: "S1", imageUrl: "https://static.wixstatic.com/media/43ee96_3998355c7cae4b70a89000ee66ad8e3f~mv2.png" },
  { name: "Charles the Great", season: "S1", imageUrl: "https://static.wixstatic.com/media/43ee96_e95b962e46204b6badbd6e63e1307582~mv2.png" },
  { name: "Black Prince", season: "S1", imageUrl: "https://static.wixstatic.com/media/43ee96_29a333b02497463f81d329056996b8a3~mv2.png" },
  { name: "Lionheart", season: "S1", imageUrl: "https://static.wixstatic.com/media/43ee96_ecf64b68a8f64ad2bd159f86f5be179c~mv2.png" },
  { name: "Al Fatih", season: "S1", imageUrl: "https://static.wixstatic.com/media/43ee96_f834a1ef8d2d4de5bba80ab40e531a6f~mv2.png" },
  { name: "Edward the Confessor", season: "S1", imageUrl: "https://static.wixstatic.com/media/43ee96_51538af01a9f4ec789127837e62dccfa~mv2.png" },
  { name: "Constantine the Great", season: "S1", imageUrl: "https://static.wixstatic.com/media/43ee96_b738599c5a0b46deb6a4abf7273f9268~mv2.png" },
  { name: "Genghis Khan", season: "S1", imageUrl: "https://static.wixstatic.com/media/43ee96_40f1c10ba0e04d4fa3e841f865cd206a~mv2.png" },
  { name: "William the Conqueror", season: "S1", imageUrl: "https://static.wixstatic.com/media/43ee96_517ee1432ce04974be78d3532e48afb3~mv2.png" },
  { name: "Inquisitor", season: "S2", imageUrl: "https://static.wixstatic.com/media/43ee96_5e9612fc176442b78c1fa6766b87473c~mv2.png" },
  { name: "BeastQueen", season: "S2", imageUrl: "https://static.wixstatic.com/media/43ee96_6883135290314469a0daee804dd03692~mv2.png" },
  { name: "Jade", season: "S2", imageUrl: "https://static.wixstatic.com/media/43ee96_61729052c05240b4b7cf34324f8ed870~mv2.png" },
  { name: "Immortal", season: "S2", imageUrl: "https://static.wixstatic.com/media/43ee96_8c4e699dedc341a7a86ae4b47d3cce71~mv2.png" },
  { name: "Peace Bringer", season: "S2", imageUrl: "https://static.wixstatic.com/media/43ee96_cfea192f7ad64a13be3fa40c516a8bce~mv2.png" },
  { name: "Witch Hunter", season: "S2", imageUrl: "https://static.wixstatic.com/media/43ee96_82ced5fbba3f489fbb04ceb4fa7cd19c~mv2.png" },
  { name: "Ramses II", season: "S2", imageUrl: "https://static.wixstatic.com/media/43ee96_2b28a06a2a1544339940724f29bf4b9d~mv2.png" },
  { name: "Octavius", season: "S2", imageUrl: "https://static.wixstatic.com/media/43ee96_eeb99bc718ad488b961bb643d4a6653f~mv2.png" },
  { name: "War Lord", season: "S3", imageUrl: "https://static.wixstatic.com/media/43ee96_bbbe6a8669d74ddea17b73af5e3cf05c~mv2.png" },
  { name: "Jane", season: "S3", imageUrl: "https://static.wixstatic.com/media/43ee96_d36c3be1d2d64747a59700bf41b8890d~mv2.png" },
  { name: "Sky Breaker", season: "S3", imageUrl: "https://static.wixstatic.com/media/43ee96_cacde74500864a0d916746fe0945c970~mv2.png" },
  { name: "Rokuboshuten", season: "S3", imageUrl: "https://static.wixstatic.com/media/43ee96_eaf3463bf3654d0e90adb41a1cb5ad4c~mv2.png" },
  { name: "Bleeding Steed", season: "S3", imageUrl: "https://static.wixstatic.com/media/43ee96_9256fc0a80284c1ab285554dbf33a4b3~mv2.png" },
  { name: "Rozen Blade", season: "S3", imageUrl: "https://static.wixstatic.com/media/43ee96_42b02c160ac849dca0dd7e4a6b472582~mv2.png" },
  { name: "Celopatrra VII", season: "S3", imageUrl: "https://static.wixstatic.com/media/43ee96_7109811bb55a47749090edcc8df9e7c6~mv2.png" },
  { name: "Ceasar", season: "S3", imageUrl: "https://static.wixstatic.com/media/43ee96_5cf26138c5174d4587fc025cd5fe399a~mv2.png" },
  { name: "Desert Storm", season: "S4", imageUrl: "https://i.ibb.co/vChW2BGG/Desert-Storm.png" },
  { name: "Soaring Hawk", season: "S4", imageUrl: "https://i.ibb.co/nsypbRHh/Soaring-hawk.png" },
  { name: "The Brave", season: "S4", imageUrl: "https://i.ibb.co/XxR25Kzy/brave.png" },
  { name: "Jade Eagle", season: "S4", imageUrl: "https://i.ibb.co/GQzRPtZf/Jade-eagle.png" },
  { name: "Immortal Guardian", season: "S4", imageUrl: "https://i.ibb.co/mr0PCzJt/Immortal-Guardian.png" },
  { name: "Divine Arrow", season: "S4", imageUrl: "https://i.ibb.co/6JcVTCnr/Divine-Arrow.png" },
  { name: "Theodora", season: "S4", imageUrl: "https://i.ibb.co/JwtYrGzN/Theodora.png" },
  { name: "King Arthur", season: "S4", imageUrl: "https://i.ibb.co/4Ryx1F6P/King-Arthur.png" }
];

const seasonColors = { S0: '#9ca3af', S1: '#3b82f6', S2: '#a855f7', S3: '#f97316', S4: '#facc15' };

// --- UTILITIES ---
function debounce(func, wait = 200) {
  let timeout;
  return (...args) => { clearTimeout(timeout); timeout = setTimeout(() => func(...args), wait); };
}

function getHeroImageUrl(heroName) {
  const hero = allHeroesData.find((h) => h.name === heroName);
  return hero?.imageUrl || `https://placehold.co/128x128/374151/e2e8f0?text=${encodeURIComponent(heroName)}`;
}

function showLoadingSpinner() {
  if (!loadingSpinner) return;
  loadingSpinner.classList.remove('hidden');
  clearTimeout(spinnerFallbackTimer);
  spinnerFallbackTimer = setTimeout(() => { if (!isAuthReady) { hideLoadingSpinner(); showMessageBox('Authentication slow. App usable offline.'); } }, 10000);
}

function hideLoadingSpinner() { if (loadingSpinner) loadingSpinner.classList.add('hidden'); }

function showMessageBox(message, onConfirm = null) {
  if (!messageBox) { alert(message); if (onConfirm) onConfirm(); return; }
  messageText.textContent = message;
  messageBox.classList.remove('hidden');
  const t = translations[currentLanguage] || translations.en;
  if (onConfirm) {
    messageBoxOkBtn.textContent = t.messageBoxConfirm || 'Confirm';
    messageBoxOkBtn.onclick = () => { messageBox.classList.add('hidden'); onConfirm(); };
    messageBoxCancelBtn.classList.remove('hidden');
    messageBoxCancelBtn.onclick = () => messageBox.classList.add('hidden');
  } else {
    messageBoxOkBtn.textContent = t.messageBoxOk || 'OK';
    messageBoxOkBtn.onclick = () => { messageBox.classList.add('hidden'); };
    messageBoxCancelBtn.classList.add('hidden');
  }
}

// --- CORE UI LOGIC ---
function updateTextContent() {
  const t = translations[currentLanguage] || translations.en;
  document.getElementById('appTitle').textContent = t.appTitle;
  document.getElementById('filterBySeasonTitle').textContent = t.filterBySeasonTitle;
  document.getElementById('availableHeroesTitle').textContent = t.availableHeroesTitle;
  document.getElementById('createComboTitle').textContent = t.createComboTitle;
  document.getElementById('lastBestCombosTitle').textContent = t.lastBestCombosTitle;
  saveComboBtn.textContent = t.saveComboBtn;
  clearComboBtn.textContent = t.clearComboBtn;
  downloadCombosBtn.textContent = t.downloadCombosBtn;
  shareAllCombosBtn.textContent = t.shareAllCombosBtn;

  const genTitle = generatorSection.querySelector('h2');
  if (genTitle) genTitle.textContent = t.generatorTitle;
  const genIntro = generatorSection.querySelector('p');
  if (genIntro) genIntro.innerHTML = t.generatorIntro;
  generateCombosBtn.textContent = t.generatorGenerateBtn;

  if (generatorResultsEl.children.length === 0) {
    generatorResultsEl.classList.add('empty-results-border');
    generatorResultsEl.innerHTML = `<div class="empty-results-placeholder">${t.generatorNoHeroesSelected}</div>`;
  }
}

function renderAvailableHeroes() {
  if (!availableHeroesEl) return;
  availableHeroesEl.innerHTML = '';
  allHeroesData.filter(h => selectedSeasons.includes(h.season)).forEach(hero => {
    const card = document.createElement('div'); card.className = 'hero-card'; card.draggable = true;
    card.dataset.heroName = hero.name;
    const tagColor = seasonColors[hero.season] || '#f97316';
    card.innerHTML = `<span class="hero-tag" style="background:${tagColor}">${hero.season}</span>
      <img src="${getHeroImageUrl(hero.name)}" alt="${hero.name}" crossorigin="anonymous"><span class="mt-1 text-center font-bold text-xs">${hero.name}</span>`;
    card.addEventListener('dragstart', (e) => e.dataTransfer.setData('text/plain', hero.name));
    card.addEventListener('touchstart', onHeroTouchStart, { passive: false });
    availableHeroesEl.appendChild(card);
  });
}

function renderGeneratorHeroes() {
  if (!generatorHeroesEl) return;
  generatorHeroesEl.innerHTML = '';
  allHeroesData.filter(h => generatorSelectedSeasons.includes(h.season)).forEach(hero => {
    const card = document.createElement('button');
    card.className = `hero-card generator-card ${generatorSelectedHeroes.has(hero.name) ? 'generator-card-selected' : ''}`;
    card.innerHTML = `<span class="hero-tag" style="background:${seasonColors[hero.season]}">${hero.season}</span>
      <img src="${getHeroImageUrl(hero.name)}" alt="${hero.name}" crossorigin="anonymous"><span class="mt-1 text-center font-bold text-xs">${hero.name}</span>`;
    card.onclick = () => {
      if (generatorSelectedHeroes.has(hero.name)) { generatorSelectedHeroes.delete(hero.name); card.classList.remove('generator-card-selected'); }
      else { generatorSelectedHeroes.add(hero.name); card.classList.add('generator-card-selected'); }
    };
    generatorHeroesEl.appendChild(card);
  });
}

function placeHeroIntoSlot(heroName, slotEl) {
  const idx = parseInt(slotEl.dataset.slotIndex, 10);
  const t = translations[currentLanguage] || translations.en;
  if (currentCombo.includes(heroName) && currentCombo[idx] !== heroName) { showMessageBox(t.messageHeroAlreadyInSlot.replace('{heroName}', heroName)); return; }
  const oldIdx = currentCombo.indexOf(heroName);
  if (oldIdx !== -1) { currentCombo[oldIdx] = null; updateComboSlotDisplay(document.querySelector(`[data-slot-index="${oldIdx}"]`), null, oldIdx); }
  currentCombo[idx] = heroName; updateComboSlotDisplay(slotEl, heroName, idx);
}

function updateComboSlotDisplay(slot, name, idx) {
  const t = translations[currentLanguage] || translations.en;
  if (name) {
    slot.innerHTML = `<img src="${getHeroImageUrl(name)}" alt="${name}" crossorigin="anonymous">
      <span class="bottom-2 text-white bg-black/50 px-2 py-1 rounded text-xs w-full truncate">${name}</span>`;
    slot.classList.add('relative', 'p-0');
  } else {
    slot.innerHTML = `<div class="combo-slot-placeholder"><span class="text-5xl font-bold text-blue-400">+</span><span class="text-xs text-gray-300">${t.dragHeroHere}</span></div>`;
    slot.classList.remove('relative', 'p-0');
  }
  saveComboBtn.disabled = !isAuthReady || currentCombo.includes(null);
}

// --- GENERATOR LOGIC ---
function generateBestCombos() {
  const t = translations[currentLanguage] || translations.en;
  const selected = Array.from(generatorSelectedHeroes);
  if (selected.length < 15) { showMessageBox(t.generatorMinHeroesMessage || 'Select 15 heroes.'); return; }
  const ownedSet = new Set(selected);
  const eligible = rankedCombos.filter(c => c.heroes.every(h => ownedSet.has(h)));
  eligible.sort((a, b) => (b.score || 0) - (a.score || 0));
  renderGeneratorResults(eligible);
}

function renderGeneratorResults(bestCombos) {
  const t = translations[currentLanguage] || translations.en;
  generatorResultsEl.innerHTML = '';
  generatorResultsEl.classList.remove('empty-results-border');

  if (bestCombos.length === 0) {
    generatorResultsEl.classList.add('empty-results-border');
    generatorResultsEl.innerHTML = `<p class="text-sm text-slate-300 text-center w-full py-8">${t.generatorNoCombosAvailable}</p>`;
    return;
  }

  for (let i = 0; i < 5; i++) {
    const combo = bestCombos[i];
    const card = document.createElement('div'); card.className = 'generated-combo-card';
    if (combo) {
      const slots = document.createElement('div'); slots.className = 'saved-combo-slots';
      combo.heroes.forEach(name => {
        const item = document.createElement('div'); item.className = 'saved-combo-slot-item';
        item.innerHTML = `<img src="${getHeroImageUrl(name)}" alt="${name}" crossorigin="anonymous"><span>${name}</span>`;
        slots.appendChild(item);
      });
      card.innerHTML = `<span class="saved-combo-number bg-amber-400 text-slate-900">${i + 1}</span>`;
      card.appendChild(slots);
      const score = document.createElement('div'); score.className = 'text-sm font-semibold text-sky-300 ml-4 whitespace-nowrap';
      score.textContent = `${t.generatorScoreLabel} ${combo.score}`; card.appendChild(score);
    } else {
      card.innerHTML = `<p class="text-xs text-slate-400 text-center w-full italic">${t.generatorEmptySlotLabel}</p>`;
    }
    generatorResultsEl.appendChild(card);
  }
}

// --- FIRESTORE LISTENER & SAVER (FIXED NaN & QUOTA) ---
async function setupFirestoreListener() {
  const _db = getDb(); if (!_db || !userId) return; db = _db;
  const { collection, query, orderBy, limit, onSnapshot, deleteDoc, doc } = await import('https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js');
  const userCombosRef = collection(db, `users/${userId}/bestCombos`);
  
  onSnapshot(query(userCombosRef, orderBy('timestamp', 'desc'), limit(100)), (snap) => {
    savedCombosEl.innerHTML = ''; noCombosMessage.classList.toggle('hidden', !snap.empty);
    userCombosData = [];
    
    // FIX: Use counter to avoid NaN issues
    let counter = 1;
    snap.forEach((d) => {
      const heroes = d.data().heroes || []; userCombosData.push(heroes);
      const row = document.createElement('div'); row.className = 'saved-combo-display';
      row.innerHTML = `<span class="saved-combo-number">${counter}</span><div class="saved-combo-slots"></div>`;
      const slotsContainer = row.querySelector('.saved-combo-slots');
      heroes.forEach(name => { const item = document.createElement('div'); item.className = 'saved-combo-slot-item'; item.innerHTML = `<img src="${getHeroImageUrl(name)}" alt="${name}" crossorigin="anonymous"><span>${name}</span>`; slotsContainer.appendChild(item); });
      const delBtn = document.createElement('button'); delBtn.className = 'remove-combo-btn'; delBtn.textContent = 'X'; 
      delBtn.onclick = async () => { if(confirm('Delete combo?')) await deleteDoc(doc(userCombosRef, d.id)); }; 
      row.appendChild(delBtn); savedCombosEl.appendChild(row);
      counter++;
    });
  }, (err) => {
    if (err.message && err.message.includes('quota')) {
      showMessageBox("Database limit reached for this hour. Saved combos will reappear once the quota resets.");
    }
  });
}

async function saveCombo() {
  const t = translations[currentLanguage] || translations.en;
  if (currentCombo.includes(null)) return showMessageBox(t.messagePleaseDrag3Heroes);
  
  showLoadingSpinner();
  try {
    const { collection, addDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js');
    
    await addDoc(collection(db, `users/${userId}/bestCombos`), {
      heroes: [...currentCombo],
      heroesKey: currentCombo.slice().sort().join(','),
      authorId: userId,
      timestamp: serverTimestamp()
    });

    currentCombo = [null, null, null];
    document.querySelectorAll('.combo-slot').forEach((s, i) => updateComboSlotDisplay(s, null, i));
  } catch (e) {
    console.error('Save failed:', e);
    // User-friendly quota message
    if (e.message && e.message.includes('quota')) {
      showMessageBox("Hourly limit reached for the VTS community. Please try saving again in one hour.");
    } else {
      showMessageBox(t.messageErrorSavingCombo || "Error saving combo.");
    }
  } finally {
    hideLoadingSpinner();
  }
}

// --- UI WIRING & TOUCH ---
const touchDragState = { heroName: null, ghostEl: null, active: false };
function onHeroTouchStart(e) {
  const name = e.currentTarget.dataset.heroName; if (!name) return;
  const touch = e.touches[0]; touchDragState.heroName = name; touchDragState.active = true;
  const ghost = document.createElement('div');
  ghost.style.cssText = `position:fixed; left:${touch.clientX - 40}px; top:${touch.clientY - 40}px; width:80px; height:80px; border-radius:999px; pointer-events:none; z-index:2000; box-shadow:0 10px 25px rgba(0,0,0,0.6); overflow:hidden;`;
  ghost.innerHTML = `<img src="${getHeroImageUrl(name)}" style="width:100%;height:100%;object-fit:cover;" />`;
  document.body.appendChild(ghost); touchDragState.ghostEl = ghost;
  e.currentTarget.classList.add('opacity-50');
  document.addEventListener('touchmove', onTouchMove, { passive: false });
  document.addEventListener('touchend', onTouchEnd);
  e.preventDefault();
}
function onTouchMove(e) {
  if (!touchDragState.active) return;
  const touch = e.touches[0]; touchDragState.ghostEl.style.left = `${touch.clientX - 40}px`; touchDragState.ghostEl.style.top = `${touch.clientY - 40}px`;
  const slot = document.elementFromPoint(touch.clientX, touch.clientY)?.closest('.combo-slot');
  document.querySelectorAll('.combo-slot').forEach(s => s.classList.remove('drag-over'));
  if (slot) slot.classList.add('drag-over');
  e.preventDefault();
}
function onTouchEnd(e) {
  const heroName = touchDragState.heroName; touchDragState.ghostEl?.remove(); touchDragState.active = false;
  document.removeEventListener('touchmove', onTouchMove);
  document.querySelectorAll('.hero-card').forEach(c => c.classList.remove('opacity-50'));
  const touch = e.changedTouches?.[0]; if (!touch || !heroName) return;
  const slot = document.elementFromPoint(touch.clientX, touch.clientY)?.closest('.combo-slot');
  if (slot) placeHeroIntoSlot(heroName, slot);
}

function wireUIActions() {
  languageSelect.value = currentLanguage;
  languageSelect.onchange = (e) => { currentLanguage = e.target.value; localStorage.setItem('vts_hero_lang', currentLanguage); updateTextContent(); renderGeneratorHeroes(); };

  const handleTabSwitch = (showManual) => {
    const minH = Math.max(window.innerHeight * 0.7, 700) + "px";
    manualSection.style.minHeight = minH; generatorSection.style.minHeight = minH;
    manualSection.classList.toggle('hidden', !showManual); generatorSection.classList.toggle('hidden', showManual);
    tabManualBtn.className = showManual ? 'tab-pill tab-pill-active' : 'tab-pill tab-pill-inactive';
    tabGeneratorBtn.className = showManual ? 'tab-pill tab-pill-inactive' : 'tab-pill tab-pill-active';
  };
  tabManualBtn.onclick = () => handleTabSwitch(true);
  tabGeneratorBtn.onclick = () => handleTabSwitch(false);

  document.getElementById('seasonFilters').onchange = (e) => {
    if (e.target.checked) selectedSeasons.push(e.target.value);
    else selectedSeasons = selectedSeasons.filter(s => s !== e.target.value);
    renderAvailableHeroes();
  };

  generatorSeasonFilters.onchange = (e) => {
    const val = e.target.value;
    if (e.target.checked) { if (!generatorSelectedSeasons.includes(val)) generatorSelectedSeasons.push(val); }
    else { generatorSelectedSeasons = generatorSelectedSeasons.filter(s => s !== val); }
    renderGeneratorHeroes();
  };

  document.getElementById('genSelectAllBtn').onclick = () => {
    allHeroesData.filter(h => generatorSelectedSeasons.includes(h.season)).forEach(h => generatorSelectedHeroes.add(h.name));
    renderGeneratorHeroes();
  };
  document.getElementById('genClearAllBtn').onclick = () => { generatorSelectedHeroes.clear(); renderGeneratorHeroes(); };

  saveComboBtn.onclick = saveCombo;
  clearComboBtn.onclick = () => { currentCombo = [null, null, null]; document.querySelectorAll('.combo-slot').forEach((s, i) => updateComboSlotDisplay(s, null, i)); };
  generateCombosBtn.onclick = generateBestCombos;
}

// --- INIT ---
(async function main() {
  showLoadingSpinner();
  wireUIActions(); updateTextContent(); renderAvailableHeroes(); renderGeneratorHeroes();
  document.querySelectorAll('.combo-slot').forEach((slot, i) => {
    updateComboSlotDisplay(slot, null, i);
    slot.addEventListener('dragover', (e) => { e.preventDefault(); slot.classList.add('drag-over'); });
    slot.addEventListener('dragleave', () => slot.classList.remove('drag-over'));
    slot.addEventListener('drop', (e) => { e.preventDefault(); slot.classList.remove('drag-over'); placeHeroIntoSlot(e.dataTransfer.getData('text/plain'), slot); });
  });

  try {
    initFirebase(); const user = await ensureAnonymousAuth();
    isAuthReady = true; userId = user.uid; db = getDb();
    setupFirestoreListener(); // Fetches previously saved combos & fixes numbers
    initComments().catch(err => console.error(err));
  } catch (err) { console.error('Init Error:', err); } finally { hideLoadingSpinner(); }
})();
