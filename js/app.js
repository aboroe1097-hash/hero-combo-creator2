// js/app.js
// Main app (manual builder + combo generator)

import { translations as baseTranslations } from './translations.js';
import { initFirebase, ensureAnonymousAuth, getDb } from './firebase.js';
import { initComments } from './comments.js';
import { rankedCombos } from './combos-db.js'; // Integrated real meta database

const translations = baseTranslations;

// DOM references (shared)
const languageSelect = document.getElementById('languageSelect');

// Manual builder DOM
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

// Tabs + sections
const tabManualBtn = document.getElementById('tabManual');
const tabGeneratorBtn = document.getElementById('tabGenerator');
const manualSection = document.getElementById('manualBuilderSection');
const generatorSection = document.getElementById('comboGeneratorSection');

// Combo generator DOM
const generatorHeroesEl = document.getElementById('generatorHeroes');
const generatorSeasonFilters = document.getElementById('generatorSeasonFilters');
const generateCombosBtn = document.getElementById('generateCombosBtn');
const generatorResultsEl = document.getElementById('generatorResults');

// State
let currentLanguage = 'en';
let selectedSeasons = ['S0']; // manual builder default
let currentCombo = [null, null, null];

let generatorSelectedSeasons = ['S0', 'S1', 'S2', 'S3', 'S4'];
const generatorSelectedHeroes = new Set();

let db = null;
let userId = 'anonymous';
let isAuthReady = false;
let spinnerFallbackTimer = null;
let userCombosData = []; // list of heroes[] for all saved combos

// -------------------------------------------------------------
// Heroes data (shared between manual builder & generator)
// -------------------------------------------------------------
const allHeroesData = [
  // Season 0
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
  // Season 1
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
  // Season 2
  { name: "Inquisitor", season: "S2", imageUrl: "https://static.wixstatic.com/media/43ee96_5e9612fc176442b78c1fa6766b87473c~mv2.png" },
  { name: "BeastQueen", season: "S2", imageUrl: "https://static.wixstatic.com/media/43ee96_6883135290314469a0daee804dd03692~mv2.png" },
  { name: "Jade", season: "S2", imageUrl: "https://static.wixstatic.com/media/43ee96_61729052c05240b4b7cf34324f8ed870~mv2.png" },
  { name: "Immortal", season: "S2", imageUrl: "https://static.wixstatic.com/media/43ee96_8c4e699dedc341a7a86ae4b47d3cce71~mv2.png" },
  { name: "Peace Bringer", season: "S2", imageUrl: "https://static.wixstatic.com/media/43ee96_cfea192f7ad64a13be3fa40c516a8bce~mv2.png" },
  { name: "Witch Hunter", season: "S2", imageUrl: "https://static.wixstatic.com/media/43ee96_82ced5fbba3f489fbb04ceb4fa7cd19c~mv2.png" },
  { name: "Ramses II", season: "S2", imageUrl: "https://static.wixstatic.com/media/43ee96_2b28a06a2a1544339940724f29bf4b9d~mv2.png" },
  { name: "Octavius", season: "S2", imageUrl: "https://static.wixstatic.com/media/43ee96_eeb99bc718ad488b961bb643d4a6653f~mv2.png" },
  // Season 3
  { name: "War Lord", season: "S3", imageUrl: "https://static.wixstatic.com/media/43ee96_bbbe6a8669d74ddea17b73af5e3cf05c~mv2.png" },
  { name: "Jane", season: "S3", imageUrl: "https://static.wixstatic.com/media/43ee96_d36c3be1d2d64747a59700bf41b8890d~mv2.png" },
  { name: "Sky Breaker", season: "S3", imageUrl: "https://static.wixstatic.com/media/43ee96_cacde74500864a0d916746fe0945c970~mv2.png" },
  { name: "Rokuboshuten", season: "S3", imageUrl: "https://static.wixstatic.com/media/43ee96_eaf3463bf3654d0e90adb41a1cb5ad4c~mv2.png" },
  { name: "Bleeding Steed", season: "S3", imageUrl: "https://static.wixstatic.com/media/43ee96_9256fc0a80284c1ab285554dbf33a4b3~mv2.png" },
  { name: "Rozen Blade", season: "S3", imageUrl: "https://static.wixstatic.com/media/43ee96_42b02c160ac849dca0dd7e4a6b472582~mv2.png" },
  { name: "Celopatrra VII", season: "S3", imageUrl: "https://static.wixstatic.com/media/43ee96_7109811bb55a47749090edcc8df9e7c6~mv2.png" },
  { name: "Ceasar", season: "S3", imageUrl: "https://static.wixstatic.com/media/43ee96_5cf26138c5174d4587fc025cd5fe399a~mv2.png" },
  // Season 4
  { name: "Desert Storm", season: "S4", imageUrl: "https://i.ibb.co/vChW2BGG/Desert-Storm.png" },
  { name: "Soaring Hawk", season: "S4", imageUrl: "https://i.ibb.co/nsypbRHh/Soaring-hawk.png" },
  { name: "The Brave", season: "S4", imageUrl: "https://i.ibb.co/XxR25Kzy/brave.png" },
  { name: "Jade Eagle", season: "S4", imageUrl: "https://i.ibb.co/GQzRPtZf/Jade-eagle.png" },
  { name: "Immortal Guardian", season: "S4", imageUrl: "https://i.ibb.co/mr0PCzJt/Immortal-Guardian.png" },
  { name: "Divine Arrow", season: "S4", imageUrl: "https://i.ibb.co/6JcVTCnr/Divine-Arrow.png" },
  { name: "Theodora", season: "S4", imageUrl: "https://i.ibb.co/JwtYrGzN/Theodora.png" },
  { name: "King Arthur", season: "S4", imageUrl: "https://i.ibb.co/4Ryx1F6P/King-Arthur.png" }
];

// Visual feedback colors
const seasonColors = { S0: '#9ca3af', S1: '#3b82f6', S2: '#a855f7', S3: '#f97316', S4: '#facc15' };

// Utility helpers
function debounce(func, wait = 200) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

function getHeroImageUrl(heroName) {
  const hero = allHeroesData.find((h) => h.name === heroName);
  if (hero && hero.imageUrl) return hero.imageUrl;
  const encoded = encodeURIComponent(heroName.replace(/\s/g, '+'));
  return `https://placehold.co/128x128/374151/e2e8f0?text=${encoded}`;
}

function showLoadingSpinner() {
  if (!loadingSpinner) return;
  loadingSpinner.classList.remove('hidden');
  loadingSpinner.setAttribute('aria-hidden', 'false');
  clearTimeout(spinnerFallbackTimer);
  spinnerFallbackTimer = setTimeout(() => {
    if (!isAuthReady) {
      hideLoadingSpinner();
      showMessageBox('Authentication is taking longer than expected. App usable offline.');
    }
  }, 10000);
}

function hideLoadingSpinner() {
  if (!loadingSpinner) return;
  clearTimeout(spinnerFallbackTimer);
  loadingSpinner.classList.add('hidden');
  loadingSpinner.setAttribute('aria-hidden', 'true');
}

function showMessageBox(message, onConfirm = null) {
  if (!messageBox) { alert(message); if (onConfirm) onConfirm(); return; }
  messageText.textContent = message;
  messageBox.classList.remove('hidden');
  const t = translations[currentLanguage] || translations.en;
  if (onConfirm) {
    messageBoxOkBtn.textContent = t.messageBoxConfirm || 'Confirm';
    messageBoxOkBtn.onclick = () => { messageBox.classList.add('hidden'); onConfirm(); };
    messageBoxCancelBtn.classList.remove('hidden');
    messageBoxCancelBtn.textContent = t.messageBoxCancel || 'Cancel';
    messageBoxCancelBtn.onclick = () => messageBox.classList.add('hidden');
  } else {
    messageBoxOkBtn.textContent = t.messageBoxOk || 'OK';
    messageBoxOkBtn.onclick = () => { messageBox.classList.add('hidden'); };
    messageBoxCancelBtn.classList.add('hidden');
  }
}

// Manual builder logic
function renderAvailableHeroes() {
  if (!availableHeroesEl) return;
  availableHeroesEl.innerHTML = '';
  const chosen = allHeroesData.filter((h) => selectedSeasons.includes(h.season));
  chosen.forEach((hero) => {
    const card = document.createElement('div');
    card.className = 'hero-card';
    card.draggable = true;
    card.dataset.heroName = hero.name;
    const tagColor = seasonColors[hero.season] || '#f97316';
    card.innerHTML = `
      <span class="hero-tag" style="background:${tagColor}">${hero.season}</span>
      <img src="${getHeroImageUrl(hero.name)}" alt="${hero.name}" loading="lazy" crossorigin="anonymous">
      <span class="mt-1">${hero.name}</span>
    `;
    card.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/plain', hero.name); card.classList.add('opacity-50'); });
    card.addEventListener('dragend', () => card.classList.remove('opacity-50'));
    card.addEventListener('touchstart', onHeroTouchStart, { passive: false });
    availableHeroesEl.appendChild(card);
  });
}

function updateComboSlotDisplay(slot, name, idx) {
  const t = translations[currentLanguage] || translations.en;
  if (name) {
    slot.innerHTML = `<img src="${getHeroImageUrl(name)}" alt="${name}" draggable="true" data-hero-name="${name}" crossorigin="anonymous">
      <span class="bottom-2 text-white bg-black bg-opacity-50 px-2 py-1 rounded-md text-xs w-full overflow-hidden text-ellipsis whitespace-nowrap">${name}</span>`;
    slot.classList.add('relative', 'p-0');
  } else {
    slot.innerHTML = `<div class="combo-slot-placeholder"><span class="text-5xl font-bold text-blue-400">+</span>
      <span class="text-xs text-gray-300">${t.dragHeroHere || 'Drag Hero Here'}</span></div>`;
    slot.classList.remove('relative', 'p-0');
  }
  updateSaveButtonState();
}

function updateSaveButtonState() {
  if (!saveComboBtn) return;
  saveComboBtn.disabled = !isAuthReady || currentCombo.includes(null);
}

function placeHeroIntoSlot(heroName, slotEl) {
  const idx = parseInt(slotEl.dataset.slotIndex, 10);
  const t = translations[currentLanguage] || translations.en;
  if (currentCombo.includes(heroName) && currentCombo[idx] !== heroName) {
    showMessageBox((t.messageHeroAlreadyInSlot || 'Hero already in slot.').replace('{heroName}', heroName));
    return;
  }
  const oldIdx = currentCombo.indexOf(heroName);
  if (oldIdx !== -1 && oldIdx !== idx) {
    currentCombo[oldIdx] = null;
    const oldSlot = document.querySelector(`[data-slot-index="${oldIdx}"]`);
    if (oldSlot) updateComboSlotDisplay(oldSlot, null, oldIdx);
  }
  currentCombo[idx] = heroName;
  updateComboSlotDisplay(slotEl, heroName, idx);
}

function initComboSlots() {
  document.querySelectorAll('.combo-slot').forEach((slot) => {
    const idx = parseInt(slot.dataset.slotIndex, 10);
    updateComboSlotDisplay(slot, null, idx);
    slot.addEventListener('dragover', (e) => { e.preventDefault(); slot.classList.add('drag-over'); });
    slot.addEventListener('dragleave', () => slot.classList.remove('drag-over'));
    slot.addEventListener('drop', (e) => {
      e.preventDefault(); slot.classList.remove('drag-over');
      placeHeroIntoSlot(e.dataTransfer.getData('text/plain'), slot);
    });
  });
}

// Mobile touch handling
const touchDragState = { heroName: null, ghostEl: null, active: false };
function onHeroTouchStart(e) {
  const card = e.currentTarget; const name = card.dataset.heroName; if (!name) return;
  const touch = e.touches[0]; touchDragState.heroName = name; touchDragState.active = true;
  const ghost = document.createElement('div');
  ghost.style.cssText = `position:fixed; left:${touch.clientX - 40}px; top:${touch.clientY - 40}px; width:80px; height:80px; border-radius:999px; pointer-events:none; z-index:2000; box-shadow:0 10px 25px rgba(0,0,0,0.6); overflow:hidden;`;
  ghost.innerHTML = `<img src="${getHeroImageUrl(name)}" style="width:100%;height:100%;object-fit:cover;" />`;
  document.body.appendChild(ghost); touchDragState.ghostEl = ghost;
  card.classList.add('opacity-50');
  document.addEventListener('touchmove', onTouchMove, { passive: false });
  document.addEventListener('touchend', onTouchEnd);
  e.preventDefault();
}

function onTouchMove(e) {
  if (!touchDragState.active || !touchDragState.ghostEl) return;
  const touch = e.touches[0]; const g = touchDragState.ghostEl;
  g.style.left = `${touch.clientX - 40}px`; g.style.top = `${touch.clientY - 40}px`;
  const el = document.elementFromPoint(touch.clientX, touch.clientY);
  document.querySelectorAll('.combo-slot').forEach(s => s.classList.remove('drag-over'));
  const slot = el?.closest('.combo-slot'); if (slot) slot.classList.add('drag-over');
  e.preventDefault();
}

function onTouchEnd(e) {
  const heroName = touchDragState.heroName; touchDragState.ghostEl?.remove();
  touchDragState.heroName = null; touchDragState.ghostEl = null; touchDragState.active = false;
  document.removeEventListener('touchmove', onTouchMove); document.removeEventListener('touchend', onTouchEnd);
  document.querySelectorAll('.hero-card').forEach(c => c.classList.remove('opacity-50'));
  document.querySelectorAll('.combo-slot').forEach(s => s.classList.remove('drag-over'));
  const touch = e.changedTouches?.[0]; if (!touch || !heroName) return;
  const slot = document.elementFromPoint(touch.clientX, touch.clientY)?.closest('.combo-slot');
  if (slot) placeHeroIntoSlot(heroName, slot);
}

// Firestore operations
async function setupFirestoreListener() {
  try {
    const _db = getDb(); if (!_db || !userId) return; db = _db;
    const { collection, query, orderBy, limit, onSnapshot, deleteDoc, doc } = await import('https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js');
    const userCombosRef = collection(db, `users/${userId}/bestCombos`);
    const q = query(userCombosRef, orderBy('timestamp', 'desc'), limit(100));
    onSnapshot(q, (snap) => {
      savedCombosEl.innerHTML = ''; noCombosMessage.classList.toggle('hidden', !snap.empty); userCombosData = [];
      let count = 1;
      snap.forEach((d) => {
        const heroes = d.data().heroes || []; userCombosData.push(heroes);
        const row = document.createElement('div'); row.className = 'saved-combo-display';
        row.innerHTML = `<span class="saved-combo-number">${count}</span><div class="saved-combo-slots"></div>`;
        const slotsContainer = row.querySelector('.saved-combo-slots');
        heroes.forEach(name => {
          const item = document.createElement('div'); item.className = 'saved-combo-slot-item';
          item.innerHTML = `<img src="${getHeroImageUrl(name)}" alt="${name}" crossorigin="anonymous"><span>${name}</span>`;
          slotsContainer.appendChild(item);
        });
        const actions = document.createElement('div'); actions.className = 'saved-combo-actions';
        const shareBtn = document.createElement('button'); shareBtn.className = 'share-combo-btn'; shareBtn.textContent = '⇪'; shareBtn.onclick = () => shareCombo(heroes);
        const delBtn = document.createElement('button'); delBtn.className = 'remove-combo-btn'; delBtn.textContent = 'X';
        delBtn.onclick = () => showMessageBox('Remove combo?', async () => { try { await deleteDoc(doc(userCombosRef, d.id)); } catch (err) { console.error(err); } });
        actions.append(shareBtn, delBtn); row.appendChild(actions); savedCombosEl.appendChild(row); count++;
      });
    });
  } catch (e) { console.error(e); }
}

async function saveCombo() {
  const t = translations[currentLanguage] || translations.en;
  if (currentCombo.includes(null)) { showMessageBox(t.messagePleaseDrag3Heroes || 'Select 3 heroes first!'); return; }
  if (!isAuthReady || !db) { showMessageBox(t.messageAuthNotReady || 'Auth not ready.'); return; }
  showLoadingSpinner();
  try {
    const { collection, query, where, getDocs, addDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js');
    const heroes = [...currentCombo]; const heroesKey = heroes.slice().sort().join(',');
    const userCombosRef = collection(db, `users/${userId}/bestCombos`);
    const dupSnap = await getDocs(query(userCombosRef, where('heroesKey', '==', heroesKey)));
    if (!dupSnap.empty) { showMessageBox(t.messageComboAlreadySaved || 'Combo already saved!'); return; }
    await addDoc(userCombosRef, { heroes, heroesKey, authorId: userId, timestamp: serverTimestamp() });
    showMessageBox(t.messageComboSavedSuccess || 'Combo saved!');
    currentCombo = [null, null, null]; document.querySelectorAll('.combo-slot').forEach((slot, idx) => updateComboSlotDisplay(slot, null, idx));
  } catch (e) { showMessageBox('Error saving combo.'); } finally { hideLoadingSpinner(); }
}

// Sharing & Generator
async function shareCombo(heroes) {
  const text = `VTS 1097 Combo: ${heroes.join(' | ')}`;
  if (navigator.share) await navigator.share({ title: 'My Combo', text });
  else { await navigator.clipboard.writeText(text); showMessageBox('Copied to clipboard!'); }
}

async function downloadCombosAsImage() {
  const t = translations[currentLanguage] || translations.en;
  showLoadingSpinner();
  try {
    if (!savedCombosEl?.children.length) { showMessageBox(t.messageNoCombosToDownload || 'No combos to download.'); return; }
    const buttons = document.querySelectorAll('.remove-combo-btn, .share-combo-btn');
    buttons.forEach(b => b.style.display = 'none');
    const canvas = await html2canvas(savedCombosEl, { scale: 2, useCORS: true, allowTaint: true });
    buttons.forEach(b => b.style.display = '');
    const link = document.createElement('a'); link.href = canvas.toDataURL('image/png'); link.download = 'hero_combos.png'; link.click();
    showMessageBox(t.messageCombosDownloadedSuccess || 'Downloaded!');
  } catch (e) { showMessageBox('Download error.'); } finally { hideLoadingSpinner(); }
}

// Generator rendering
function renderGeneratorHeroes() {
  if (!generatorHeroesEl) return; generatorHeroesEl.innerHTML = '';
  allHeroesData.filter(h => generatorSelectedSeasons.includes(h.season)).forEach(hero => {
    const card = document.createElement('button'); card.className = `hero-card generator-card ${generatorSelectedHeroes.has(hero.name) ? 'generator-card-selected' : ''}`;
    card.innerHTML = `<span class="hero-tag" style="background:${seasonColors[hero.season]}">${hero.season}</span>
      <img src="${getHeroImageUrl(hero.name)}" alt="${hero.name}" crossorigin="anonymous"><span class="mt-1">${hero.name}</span>`;
    card.onclick = () => {
      if (generatorSelectedHeroes.has(hero.name)) { generatorSelectedHeroes.delete(hero.name); card.classList.remove('generator-card-selected'); }
      else { generatorSelectedHeroes.add(hero.name); card.classList.add('generator-card-selected'); }
    };
    generatorHeroesEl.appendChild(card);
  });
}

function renderGeneratorResults(bestCombos) {
  generatorResultsEl.innerHTML = '';
  const selectedCount = generatorSelectedHeroes.size;
  const summary = document.createElement('p'); summary.className = 'text-sm text-slate-300 mb-2';
  summary.textContent = `Selected ${selectedCount} heroes. Showing top 5 available combos.`;
  generatorResultsEl.appendChild(summary);
  for (let i = 0; i < 5; i++) {
    const combo = bestCombos[i]; const card = document.createElement('div'); card.className = 'generated-combo-card';
    if (combo) {
      const slots = document.createElement('div'); slots.className = 'saved-combo-slots';
      combo.heroes.forEach(name => {
        const item = document.createElement('div'); item.className = 'saved-combo-slot-item';
        item.innerHTML = `<img src="${getHeroImageUrl(name)}" alt="${name}" crossorigin="anonymous"><span>${name}</span>`;
        slots.appendChild(item);
      });
      card.innerHTML = `<span class="saved-combo-number bg-amber-400 text-slate-900">${i + 1}</span>`;
      card.appendChild(slots);
      const score = document.createElement('div'); score.className = 'mt-3 md:mt-0 md:ml-4 text-sm font-semibold text-sky-300';
      score.textContent = `Score: ${combo.score}`; card.appendChild(score);
    } else {
      card.innerHTML = '<p class="text-sm text-slate-300 text-center w-full">No available combo for this slot.</p>';
    }
    generatorResultsEl.appendChild(card);
  }
}

function generateBestCombos() {
  const t = translations[currentLanguage] || translations.en;
  const selectedHeroes = Array.from(generatorSelectedHeroes);
  if (selectedHeroes.length < 15) { showMessageBox(t.generatorMinHeroesMessage || 'Select 15 heroes.'); return; }
  const ownedSet = new Set(selectedHeroes);
  const eligibleCombos = rankedCombos.filter(c => c.heroes.every(h => ownedSet.has(h))); // Uses meta DB
  eligibleCombos.sort((a, b) => (b.score || 0) - (a.score || 0));
  renderGeneratorResults(eligibleCombos);
}

// UI wiring
function switchToManual() { tabManualBtn.className = 'tab-pill tab-pill-active'; tabGeneratorBtn.className = 'tab-pill tab-pill-inactive'; manualSection.classList.remove('hidden'); generatorSection.classList.add('hidden'); }
function switchToGenerator() { tabGeneratorBtn.className = 'tab-pill tab-pill-active'; tabManualBtn.className = 'tab-pill tab-pill-inactive'; manualSection.classList.add('hidden'); generatorSection.classList.remove('hidden'); }

function wireUIActions() {
  languageSelect.onchange = (e) => { currentLanguage = e.target.value; updateTextContent(); };
  document.getElementById('seasonFilters').onchange = (e) => {
    if (e.target.checked) selectedSeasons.push(e.target.value);
    else selectedSeasons = selectedSeasons.filter(s => s !== e.target.value);
    debouncedRenderManualHeroes();
  };
  generatorSeasonFilters.onchange = (e) => {
    if (e.target.checked) generatorSelectedSeasons.push(e.target.value);
    else generatorSelectedSeasons = generatorSelectedSeasons.filter(s => s !== e.target.value);
    renderGeneratorHeroes();
  };
  clearComboBtn.onclick = () => { currentCombo = [null, null, null]; document.querySelectorAll('.combo-slot').forEach((s, i) => updateComboSlotDisplay(s, null, i)); };
  saveComboBtn.onclick = saveCombo; downloadCombosBtn.onclick = downloadCombosAsImage;
  if (shareAllCombosBtn) shareAllCombosBtn.onclick = () => showMessageBox('Sharing not implemented for "All" yet.');
  tabManualBtn.onclick = switchToManual; tabGeneratorBtn.onclick = switchToGenerator;
  generateCombosBtn.onclick = generateBestCombos;
}

function updateTextContent() {
  const t = translations[currentLanguage] || translations.en;
  document.getElementById('appTitle').textContent = t.appTitle;
  document.getElementById('filterBySeasonTitle').textContent = t.filterBySeasonTitle;
  document.getElementById('availableHeroesTitle').textContent = t.availableHeroesTitle;
  document.getElementById('createComboTitle').textContent = t.createComboTitle;
  document.getElementById('lastBestCombosTitle').textContent = t.lastBestCombosTitle;
}

const debouncedRenderManualHeroes = debounce(() => renderAvailableHeroes(), 150);

// Init
(async function main() {
  showLoadingSpinner(); renderAvailableHeroes(); renderGeneratorHeroes(); initComboSlots(); wireUIActions(); updateTextContent(); switchToManual();
  try {
    initFirebase(); const user = await ensureAnonymousAuth();
    isAuthReady = true; userId = user.uid || 'anonymous'; db = getDb();
    updateSaveButtonState(); setupFirestoreListener();
    initComments().catch(err => console.error(err));
  } catch (err) { console.error(err); } finally { hideLoadingSpinner(); }
})();
