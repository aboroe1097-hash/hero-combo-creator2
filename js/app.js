// js/app.js - Final Version b2.5 with Mobile Drag Support
import { translations } from './translations.js';
import { initFirebase, ensureAnonymousAuth, getDb } from './firebase.js';
import { initComments } from './comments.js';
import { rankedCombos } from './combos-db.js';

// DOM Elements
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
const messageBoxCancelBtn = document.getElementById('messageBoxCancelBtn');
const shareAllCombosBtn = document.getElementById('shareAllCombosBtn');
const downloadGeneratorBtn = document.getElementById('downloadGeneratorBtn');
const manualSection = document.getElementById('manualBuilderSection');
const generatorSection = document.getElementById('comboGeneratorSection');
const tabManualBtn = document.getElementById('tabManual');
const tabGeneratorBtn = document.getElementById('tabGenerator');
const generatorHeroesEl = document.getElementById('generatorHeroes');
const generatorResultsEl = document.getElementById('generatorResults');
const generateCombosBtn = document.getElementById('generateCombosBtn');
const comboFooterBar = document.getElementById('comboFooterBar');

// State
let currentLanguage = localStorage.getItem('vts_hero_lang') || 'en';
let selectedSeasons = ['S0'];
let currentCombo = [null, null, null];
let generatorSelectedSeasons = ['S0'];
const generatorSelectedHeroes = new Set();
let userId = 'anonymous';
let db = null;

// Hero Data (Standardized names)
const allHeroesData = [
  { name: "Jeanne d'Arc", season: 'S0', imageUrl: 'https://static.wixstatic.com/media/43ee96_d5f5b07c90924e6ab5b1d70e2667b693~mv2.png' },
  { name: 'Isabella I', season: 'S0', imageUrl: 'https://static.wixstatic.com/media/43ee96_dcba45dd1c394074a0e23e3f780c6aee~mv2.png' },
  { name: 'Jiguang Qi', season: 'S0', imageUrl: 'https://static.wixstatic.com/media/43ee96_3bb681424e034e9e8f0dea7d71c93390~mv2.png' },
  { name: 'Mary Tudor', season: 'S0', imageUrl: 'https://static.wixstatic.com/media/43ee96_7d24a8f5148b42c68e9e183ecdf1080d~mv2.png' },
  { name: 'Leonidas', season: 'S0', imageUrl: 'https://static.wixstatic.com/media/43ee96_f672d18c06904465a490ea4811cee798~mv2.png' },
  { name: 'The Boneless', season: 'S0', imageUrl: 'https://static.wixstatic.com/media/43ee96_5fec4c7d62314acfb90ea624dedd08c6~mv2.png' },
  { name: 'Demon Spear', season: 'S0', imageUrl: 'https://static.wixstatic.com/media/43ee96_39ffb285fd524cd1b7c27057b0fe4f44~mv2.png' },
  { name: 'Kublai', season: 'S0', imageUrl: 'https://static.wixstatic.com/media/43ee96_19f2c6dda1b04b72942f1f691efd63b2~mv2.png' },
  { name: 'The Heroine', season: 'S0', imageUrl: 'https://static.wixstatic.com/media/43ee96_80bd949738da42cc88525fd5d6dc1f81~mv2.png' },
  { name: 'Queen Anne', season: 'S0', imageUrl: 'https://static.wixstatic.com/media/43ee96_4a70ebf4f01c444f9e238861826c0b90~mv2.png' },
  { name: "North's Rage", season: 'S0', imageUrl: 'https://static.wixstatic.com/media/43ee96_582201a2a5e14a29a9c186393dd0bb06~mv2.png' },
  { name: 'William Wallace', season: 'S0', imageUrl: 'https://static.wixstatic.com/media/43ee96_860c9a1a59214245b3d65d0f1fd816de~mv2.png' },
  { name: 'Yukimura Sanada', season: 'S0', imageUrl: 'https://static.wixstatic.com/media/43ee96_41cdaf2c39b44127b0c9ede9da2f70b7~mv2.png' },
  { name: "Heaven's Justice", season: 'S0', imageUrl: 'https://static.wixstatic.com/media/43ee96_c81fb50a85d14f63b0aee9977c476c6c~mv2.png' },
  { name: 'Alfred', season: 'S1', imageUrl: 'https://static.wixstatic.com/media/43ee96_e75a942dc1c64689b140f23d905b5ca0~mv2.png' },
  { name: 'Cao Cao', season: 'S1', imageUrl: 'https://static.wixstatic.com/media/43ee96_3998355c7cae4b70a89000ee66ad8e3f~mv2.png' },
  { name: 'Charles the Great', season: 'S1', imageUrl: 'https://static.wixstatic.com/media/43ee96_e95b962e46204b6badbd6e63e1307582~mv2.png' },
  { name: 'Black Prince', season: 'S1', imageUrl: 'https://static.wixstatic.com/media/43ee96_29a333b02497463f81d329056996b8a3~mv2.png' },
  { name: 'Lionheart', season: 'S1', imageUrl: 'https://static.wixstatic.com/media/43ee96_ecf64b68a8f64ad2bd159f86f5be179c~mv2.png' },
  { name: 'Al Fatih', season: 'S1', imageUrl: 'https://static.wixstatic.com/media/43ee96_f834a1ef8d2d4de5bba80ab40e531a6f~mv2.png' },
  { name: 'Edward the Confessor', season: 'S1', imageUrl: 'https://static.wixstatic.com/media/43ee96_51538af01a9f4ec789127837e62dccfa~mv2.png' },
  { name: 'Constantine the Great', season: 'S1', imageUrl: 'https://static.wixstatic.com/media/43ee96_b738599c5a0b46deb6a4abf7273f9268~mv2.png' },
  { name: 'Genghis Khan', season: 'S1', imageUrl: 'https://static.wixstatic.com/media/43ee96_40f1c10ba0e04d4fa3e841f865cd206a~mv2.png' },
  { name: 'William the Conqueror', season: 'S1', imageUrl: 'https://static.wixstatic.com/media/43ee96_517ee1432ce04974be78d3532e48afb3~mv2.png' },
  { name: 'Inquisitor', season: 'S2', imageUrl: 'https://static.wixstatic.com/media/43ee96_5e9612fc176442b78c1fa6766b87473c~mv2.png' },
  { name: 'BeastQueen', season: 'S2', imageUrl: 'https://static.wixstatic.com/media/43ee96_6883135290314469a0daee804dd03692~mv2.png' },
  { name: 'Jade', season: 'S2', imageUrl: 'https://static.wixstatic.com/media/43ee96_61729052c05240b4b7cf34324f8ed870~mv2.png' },
  { name: 'Immortal', season: 'S2', imageUrl: 'https://static.wixstatic.com/media/43ee96_8c4e699dedc341a7a86ae4b47d3cce71~mv2.png' },
  { name: 'Peace Bringer', season: 'S2', imageUrl: 'https://static.wixstatic.com/media/43ee96_cfea192f7ad64a13be3fa40c516a8bce~mv2.png' },
  { name: 'Witch Hunter', season: 'S2', imageUrl: 'https://static.wixstatic.com/media/43ee96_82ced5fbba3f489fbb04ceb4fa7cd19c~mv2.png' },
  { name: 'Ramses II', season: 'S2', imageUrl: 'https://static.wixstatic.com/media/43ee96_2b28a06a2a1544339940724f29bf4b9d~mv2.png' },
  { name: 'Octavius', season: 'S2', imageUrl: 'https://static.wixstatic.com/media/43ee96_eeb99bc718ad488b961bb643d4a6653f~mv2.png' },
  { name: 'War Lord', season: 'S3', imageUrl: 'https://static.wixstatic.com/media/43ee96_bbbe6a8669d74ddea17b73af5e3cf05c~mv2.png' },
  { name: 'Jane', season: 'S3', imageUrl: 'https://static.wixstatic.com/media/43ee96_d36c3be1d2d64747a59700bf41b8890d~mv2.png' },
  { name: 'Sky Breaker', season: 'S3', imageUrl: 'https://static.wixstatic.com/media/43ee96_cacde74500864a0d916746fe0945c970~mv2.png' },
  { name: 'Rokuboshuten', season: 'S3', imageUrl: 'https://static.wixstatic.com/media/43ee96_eaf3463bf3654d0e90adb41a1cb5ad4c~mv2.png' },
  { name: 'Bleeding Steed', season: 'S3', imageUrl: 'https://static.wixstatic.com/media/43ee96_9256fc0a80284c1ab285554dbf33a4b3~mv2.png' },
  { name: 'Rozen Blade', season: 'S3', imageUrl: 'https://static.wixstatic.com/media/43ee96_42b02c160ac849dca0dd7e4a6b472582~mv2.png' },
  { name: 'Cleopatra VII', season: 'S3', imageUrl: 'https://static.wixstatic.com/media/43ee96_7109811bb55a47749090edcc8df9e7c6~mv2.png' },
  { name: 'Caesar', season: 'S3', imageUrl: 'https://static.wixstatic.com/media/43ee96_5cf26138c5174d4587fc025cd5fe399a~mv2.png' },
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
function getHeroImageUrl(name) {
  const h = allHeroesData.find(x => x.name === name);
  return h?.imageUrl || `https://placehold.co/128x128?text=${encodeURIComponent(name)}`;
}

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

// --- MOBILE TOUCH DRAG SUPPORT FOR MANUAL BUILDER ---

let touchDragHeroName = null;
let touchDragGhost = null;
let touchDragLastSlot = null;

function isTouchDevice() {
  return ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
}

function setupHeroTouchDrag(card, hero) {
  if (!isTouchDevice()) return;

  // On touch devices, disable native HTML5 drag to avoid conflicts
  card.draggable = false;

  card.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) return;
    e.preventDefault();

    const touch = e.touches[0];
    touchDragHeroName = hero.name;

    // Create ghost element that follows the finger
    touchDragGhost = document.createElement('div');
    touchDragGhost.className = 'hero-drag-ghost';
    touchDragGhost.innerHTML = `
      <img src="${hero.imageUrl}" alt="${hero.name}" crossorigin="anonymous">
    `;
    document.body.appendChild(touchDragGhost);
    moveHeroDragGhost(touch.clientX, touch.clientY);

    document.addEventListener('touchmove', onHeroTouchMove, { passive: false });
    document.addEventListener('touchend', onHeroTouchEnd);
    document.addEventListener('touchcancel', onHeroTouchCancel);
  });
}

function moveHeroDragGhost(x, y) {
  if (!touchDragGhost) return;
  touchDragGhost.style.left = x + 'px';
  touchDragGhost.style.top = y + 'px';
}

function clearHeroSlotHover() {
  if (touchDragLastSlot) {
    touchDragLastSlot.classList.remove('combo-slot-hover');
    touchDragLastSlot = null;
  }
}

function onHeroTouchMove(e) {
  if (!touchDragHeroName || !touchDragGhost) return;
  const touch = e.touches[0];
  if (!touch) return;

  // Prevent scrolling while dragging
  e.preventDefault();

  moveHeroDragGhost(touch.clientX, touch.clientY);

  const elem = document.elementFromPoint(touch.clientX, touch.clientY);
  const slot = elem && elem.closest ? elem.closest('.combo-slot') : null;

  if (slot !== touchDragLastSlot) {
    clearHeroSlotHover();
    if (slot) {
      slot.classList.add('combo-slot-hover');
      touchDragLastSlot = slot;
    }
  }
}

function finishHeroTouchDrop(targetSlot) {
  if (!targetSlot || !touchDragHeroName) return;
  const idx = parseInt(targetSlot.dataset.slotIndex, 10);
  if (isNaN(idx)) return;

  currentCombo[idx] = touchDragHeroName;
  updateComboSlotDisplay(targetSlot, touchDragHeroName, idx);
}

function cleanupHeroTouchDrag() {
  clearHeroSlotHover();
  if (touchDragGhost && touchDragGhost.parentNode) {
    touchDragGhost.parentNode.removeChild(touchDragGhost);
  }
  touchDragGhost = null;
  touchDragHeroName = null;
}

function onHeroTouchEnd(e) {
  const touch = e.changedTouches[0];
  const elem = document.elementFromPoint(touch.clientX, touch.clientY);
  const slot = elem && elem.closest ? elem.closest('.combo-slot') : null;

  if (slot) {
    finishHeroTouchDrop(slot);
  }

  cleanupHeroTouchDrag();
  document.removeEventListener('touchmove', onHeroTouchMove);
  document.removeEventListener('touchend', onHeroTouchEnd);
  document.removeEventListener('touchcancel', onHeroTouchCancel);
}

function onHeroTouchCancel() {
  cleanupHeroTouchDrag();
  document.removeEventListener('touchmove', onHeroTouchMove);
  document.removeEventListener('touchend', onHeroTouchEnd);
  document.removeEventListener('touchcancel', onHeroTouchCancel);
}

// --- RENDERING FUNCTIONS (Restored) ---
function renderAvailableHeroes() {
  if (!availableHeroesEl) return;

  availableHeroesEl.innerHTML = '';
  allHeroesData
    .filter(h => selectedSeasons.includes(h.season))
    .forEach(hero => {
      const card = document.createElement('div');
      card.className = 'hero-card';
      card.draggable = true;
      card.dataset.heroName = hero.name;

      const tagColor = seasonColors[hero.season] || '#f97316';
      card.innerHTML = `
        <span class="hero-tag" style="background:${tagColor}">${hero.season}</span>
        <img src="${hero.imageUrl}" alt="${hero.name}">
        <span class="mt-1 text-center font-bold text-xs">${hero.name}</span>
      `;

      // Desktop drag & drop
      card.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', hero.name);
      });

      // Mobile drag via touch events (no tap-to-place)
      setupHeroTouchDrag(card, hero);

      availableHeroesEl.appendChild(card);
    });
}

function renderGeneratorHeroes() {
  if (!generatorHeroesEl) return;
  generatorHeroesEl.innerHTML = '';
  allHeroesData.filter(h => generatorSelectedSeasons.includes(h.season)).forEach(hero => {
    const card = document.createElement('button');
    card.className = `hero-card generator-card ${generatorSelectedHeroes.has(hero.name) ? 'generator-card-selected' : ''}`;
    card.innerHTML = `<span class="hero-tag" style="background:${seasonColors[hero.season]}">${hero.season}</span><img src="${getHeroImageUrl(hero.name)}" alt="${hero.name}" crossorigin="anonymous"><span class="mt-1 text-center font-bold text-xs">${hero.name}</span>`;
    card.onclick = () => {
      if (generatorSelectedHeroes.has(hero.name)) {
        generatorSelectedHeroes.delete(hero.name);
        card.classList.remove('generator-card-selected');
      } else {
        generatorSelectedHeroes.add(hero.name);
        card.classList.add('generator-card-selected');
      }
    };
    generatorHeroesEl.appendChild(card);
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
    slot.classList.add('relative', 'p-0', 'border-solid', 'border-emerald-500'); // Added border feedback
  } else {
    slot.innerHTML = `
      <div class="combo-slot-placeholder h-full flex flex-col items-center justify-center gap-1">
        <span class="font-bold text-blue-400/60 text-3xl leading-none">+</span>
        <span class="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">
          ${t.dragHeroHere}
        </span>
      </div>`;
    slot.classList.remove('relative', 'p-0', 'border-emerald-500');
  }
}

// --- LOGIC FUNCTIONS ---
async function saveCombo() {
  const t = translations[currentLanguage] || translations.en;
  if (currentCombo.includes(null)) return showAboModal(t.messagePleaseDrag3Heroes);
  loadingSpinner.classList.remove('hidden');
  try {
    const { collection, addDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js');
    await addDoc(collection(db, `users/${userId}/bestCombos`), {
      heroes: [...currentCombo],
      timestamp: serverTimestamp()
    });
    currentCombo = [null, null, null];
    document.querySelectorAll('.combo-slot').forEach((s, i) => updateComboSlotDisplay(s, null, i));
  } catch (e) { console.error(e); } finally { loadingSpinner.classList.add('hidden'); }
}

function generateBestCombos() {
  const t = translations[currentLanguage] || translations.en;
  const selected = Array.from(generatorSelectedHeroes);
  if (selected.length < 15) { showAboModal(t.generatorMinHeroesMessage); return; }

  const ownedSet = new Set(selected);
  const usedHeroesGlobal = new Set();
  const finalSelection = [];

  for (const combo of rankedCombos) {
    if (finalSelection.length >= 5) break;
    const canBuild = combo.heroes.every(h => ownedSet.has(h));
    const isUnique = !combo.heroes.some(h => usedHeroesGlobal.has(h));

    if (canBuild && isUnique) {
      const score = 100 - rankedCombos.indexOf(combo);
      finalSelection.push({ ...combo, displayScore: score });
      combo.heroes.forEach(h => usedHeroesGlobal.add(h));
    }
  }
  renderGeneratorResults(finalSelection);
  if (finalSelection.length > 0) downloadGeneratorBtn.classList.remove('hidden');
}

function renderGeneratorResults(bestCombos) {
  const t = translations[currentLanguage] || translations.en;
  generatorResultsEl.innerHTML = '';
  bestCombos.forEach((combo, i) => {
    const card = document.createElement('div');
    card.className = 'generated-combo-card'; // CSS Handles spacing

    const slots = document.createElement('div');
    slots.className = 'saved-combo-slots';
    combo.heroes.forEach(name => {
      const item = document.createElement('div');
      item.className = 'saved-combo-slot-item';
      item.innerHTML = `<img src="${getHeroImageUrl(name)}" crossorigin="anonymous"><span class="text-[10px] text-sky-300 font-bold truncate px-1">${name}</span>`;
      slots.appendChild(item);
    });

    card.innerHTML = `<span class="saved-combo-number bg-amber-400 text-slate-900">${i + 1}</span>`;
    card.appendChild(slots);
    const scoreBox = document.createElement('div');
    scoreBox.className = 'flex flex-col items-center justify-center ml-4 pr-2';
    scoreBox.innerHTML = `<span class="text-[10px] uppercase tracking-widest text-slate-400">${t.generatorScoreLabel}</span><span class="text-lg font-black text-sky-400">${combo.displayScore}</span>`;
    card.appendChild(scoreBox);
    generatorResultsEl.appendChild(card);
  });
}

// --- FIRESTORE ---
async function setupFirestoreListener() {
  const _db = getDb(); if (!_db || !userId) return; db = _db;
  const { collection, query, orderBy, limit, onSnapshot, deleteDoc, doc } = await import('https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js');
  const q = query(collection(db, `users/${userId}/bestCombos`), orderBy('timestamp', 'desc'), limit(100));

  onSnapshot(q, (snap) => {
    savedCombosEl.innerHTML = '';
    noCombosMessage.classList.toggle('hidden', !snap.empty);
    let counter = 1; // FIX: Manual counter fixes NaN
    snap.forEach((d) => {
      const heroes = d.data().heroes || [];
      const row = document.createElement('div');
      row.className = 'saved-combo-display';
      row.innerHTML = `<span class="saved-combo-number">${counter}</span><div class="saved-combo-slots"></div>`;
      const slots = row.querySelector('.saved-combo-slots');
      heroes.forEach(name => {
        const item = document.createElement('div');
        item.className = 'saved-combo-slot-item';
        item.innerHTML = `<img src="${getHeroImageUrl(name)}"><span>${name}</span>`;
        slots.appendChild(item);
      });
      const delBtn = document.createElement('button');
      delBtn.className = 'remove-combo-btn'; delBtn.textContent = 'X';
      delBtn.onclick = () => showAboModal(translations[currentLanguage].messageConfirmRemoveCombo, async () => {
        await deleteDoc(doc(db, `users/${userId}/bestCombos`, d.id));
      });
      row.appendChild(delBtn);
      savedCombosEl.appendChild(row);
      counter++;
    });
  });
}

// --- UI WIRING ---
function wireUIActions() {
  languageSelect.onchange = (e) => {
    currentLanguage = e.target.value;
    localStorage.setItem('vts_hero_lang', currentLanguage);
    updateTextContent();
    renderGeneratorHeroes();
  };

  const handleTabSwitch = (isManual) => {
    manualSection.classList.toggle('hidden', !isManual);
    generatorSection.classList.toggle('hidden', isManual);
    if (comboFooterBar) comboFooterBar.style.display = isManual ? 'block' : 'none';
    tabManualBtn.className = isManual ? 'tab-pill tab-pill-active' : 'tab-pill tab-pill-inactive';
    tabGeneratorBtn.className = isManual ? 'tab-pill tab-pill-inactive' : 'tab-pill tab-pill-active';
  };

  tabManualBtn.onclick = () => handleTabSwitch(true);
  tabGeneratorBtn.onclick = () => handleTabSwitch(false);

  // DEFENSIVE FIX for null element errors
  const seasonFilters = document.getElementById('seasonFilters');
  if (seasonFilters) {
    seasonFilters.onchange = (e) => {
      if (e.target.checked) selectedSeasons.push(e.target.value);
      else selectedSeasons = selectedSeasons.filter(s => s !== e.target.value);
      renderAvailableHeroes();
    };
  }

  const genSeasonFilters = document.getElementById('generatorSeasonFilters');
  if (genSeasonFilters) {
    genSeasonFilters.onchange = (e) => {
      if (e.target.checked) generatorSelectedSeasons.push(e.target.value);
      else generatorSelectedSeasons = generatorSelectedSeasons.filter(s => s !== e.target.value);
      renderGeneratorHeroes();
    };
  }

  document.getElementById('genSelectAllBtn').onclick = () => {
    allHeroesData.filter(h => generatorSelectedSeasons.includes(h.season)).forEach(h => generatorSelectedHeroes.add(h.name));
    renderGeneratorHeroes();
  };
  document.getElementById('genClearAllBtn').onclick = () => {
    generatorSelectedHeroes.clear();
    renderGeneratorHeroes();
  };

  saveComboBtn.onclick = saveCombo;
  generateCombosBtn.onclick = generateBestCombos;
}

// --- INITIALIZATION ---
async function updateTextContent() {
  const t = translations[currentLanguage] || translations.en;

  // Top & tabs
  document.getElementById('appTitle').textContent = t.appTitle;
  document.getElementById('tabManual').textContent = t.tabManual;
  document.getElementById('tabGenerator').textContent = t.tabGenerator;

  // Manual builder headings
  document.getElementById('filterBySeasonTitle').textContent = t.filterBySeasonTitle;
  document.getElementById('availableHeroesTitle').textContent = t.availableHeroesTitle;
  document.getElementById('createComboTitle').textContent = t.createComboTitle;
  document.getElementById('lastBestCombosTitle').textContent = t.lastBestCombosTitle;
  document.getElementById('noCombosMessage').textContent = t.noCombosMessage;

  // Manual builder buttons
  if (saveComboBtn) saveComboBtn.textContent = t.saveComboBtn;
  if (clearComboBtn) clearComboBtn.textContent = t.clearComboBtn;
  if (downloadCombosBtn) downloadCombosBtn.textContent = t.downloadCombosBtn;
  if (shareAllCombosBtn) shareAllCombosBtn.textContent = t.shareAllCombosBtn;

  // Generator section headings
  const genToolTitle   = document.getElementById('genToolTitle');
  const genIntroText   = document.getElementById('genIntroText');
  const genFilterTitle = document.getElementById('genFilterTitle');

  if (genToolTitle)   genToolTitle.textContent   = t.generatorTitle;
  if (genIntroText)   genIntroText.textContent   = t.generatorIntro;
  if (genFilterTitle) genFilterTitle.textContent = t.filterBySeasonTitle;

  // Generator buttons
  const genSelectAllBtn   = document.getElementById('genSelectAllBtn');
  const genClearAllBtn    = document.getElementById('genClearAllBtn');

  if (genSelectAllBtn)       genSelectAllBtn.textContent       = t.generatorSelectAll;
  if (genClearAllBtn)        genClearAllBtn.textContent        = t.generatorClearAll;
  if (generateCombosBtn)     generateCombosBtn.textContent     = t.generatorGenerateBtn;
  if (downloadGeneratorBtn)  downloadGeneratorBtn.textContent  = t.generatorDownloadBtn;
}

(async function main() {
  wireUIActions();
  updateTextContent();
  renderAvailableHeroes();
  renderGeneratorHeroes();

  // DEFAULT LANDING: Combo Generator
  tabGeneratorBtn.click();

  document.querySelectorAll('.combo-slot').forEach((slot, i) => {
    updateComboSlotDisplay(slot, null, i);
    slot.addEventListener('dragover', (e) => e.preventDefault());
    slot.addEventListener('drop', (e) => {
      e.preventDefault();
      const name = e.dataTransfer.getData('text/plain');
      currentCombo[parseInt(slot.dataset.slotIndex)] = name;
      updateComboSlotDisplay(slot, name, parseInt(slot.dataset.slotIndex, 10));
    });
  });

  try {
    initFirebase();
    const user = await ensureAnonymousAuth();
    userId = user.uid;
    db = getDb();
    setupFirestoreListener();
    initComments();
  } catch (err) { console.error(err); }
})();
