// js/app.js
// main app

import { translations as baseTranslations } from './translations.js';
import { initFirebase, ensureAnonymousAuth, getDb } from './firebase.js';
import { initComments } from './comments.js';

const translations = baseTranslations;

// DOM elements
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

let currentLanguage = 'en';
let selectedSeasons = ['S0'];
let currentCombo = [null, null, null];

let db = null;
let userId = 'anonymous';
let isAuthReady = false;
let spinnerFallbackTimer = null;
let userCombosData = []; // store heroes arrays for all saved combos

// --- hero data -----------------------------------------------------
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
  { name: 'William the Conqueror', season: 'S1', imageUrl: 'https://static.wixstatic.com/media/43ee96_517ee1432ce04974be78d3532e48afb3~mv2.png/v1/fill/w_101,h_101,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png' },
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
  { name: 'Celopatrra VII', season: 'S3', imageUrl: 'https://static.wixstatic.com/media/43ee96_7109811bb55a47749090edcc8df9e7c6~mv2.png/v1/fill/w_101,h_101,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png' },
  { name: 'Ceasar', season: 'S3', imageUrl: 'https://static.wixstatic.com/media/43ee96_5cf26138c5174d4587fc025cd5fe399a~mv2.png/v1/fill/w_101,h_101,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png' },
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

// Simple color-coding per season (visual feedback)
const seasonColors = {
  S0: '#9ca3af', // grey
  S1: '#3b82f6', // blue
  S2: '#a855f7', // purple
  S3: '#f97316', // orange
  S4: '#facc15' // gold
};

// ------------------------------------------------------------

function showLoadingSpinner() {
  loadingSpinner.classList.remove('hidden');
  loadingSpinner.setAttribute('aria-hidden', 'false');
  clearTimeout(spinnerFallbackTimer);
  spinnerFallbackTimer = setTimeout(() => {
    if (!isAuthReady) {
      hideLoadingSpinner();
      showMessageBox(
        'Authentication is taking longer than expected. The app is usable offline; saved combos require network to sync.'
      );
    }
  }, 10000);
}
function hideLoadingSpinner() {
  clearTimeout(spinnerFallbackTimer);
  loadingSpinner.classList.add('hidden');
  loadingSpinner.setAttribute('aria-hidden', 'true');
}

function showMessageBox(message, onConfirm = null) {
  messageText.textContent = message;
  messageBox.classList.remove('hidden');
  if (onConfirm) {
    messageBoxOkBtn.textContent =
      translations[currentLanguage].messageBoxConfirm || 'Confirm';
    messageBoxOkBtn.onclick = () => {
      messageBox.classList.add('hidden');
      onConfirm();
    };
    messageBoxCancelBtn.classList.remove('hidden');
    messageBoxCancelBtn.textContent =
      translations[currentLanguage].messageBoxCancel || 'Cancel';
    messageBoxCancelBtn.onclick = () => messageBox.classList.add('hidden');
  } else {
    messageBoxOkBtn.textContent =
      translations[currentLanguage].messageBoxOk || 'OK';
    messageBoxOkBtn.onclick = () => {
      messageBox.classList.add('hidden');
    };
    messageBoxCancelBtn.classList.add('hidden');
  }
}

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

function renderAvailableHeroes() {
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

    // Desktop drag
    card.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', hero.name);
      card.classList.add('opacity-50');
    });
    card.addEventListener('dragend', () => {
      card.classList.remove('opacity-50');
    });

    // Mobile touch-drag
    card.addEventListener('touchstart', onHeroTouchStart, { passive: false });

    availableHeroesEl.appendChild(card);
  });
}

function updateComboSlotDisplay(slot, name, idx) {
  if (name) {
    slot.innerHTML = `
      <img src="${getHeroImageUrl(name)}"
           alt="${name}"
           draggable="true"
           data-hero-name="${name}"
           crossorigin="anonymous">
      <span class="bottom-2 text-white bg-black bg-opacity-50 px-2 py-1 rounded-md text-xs w-full overflow-hidden text-ellipsis whitespace-nowrap">
        ${name}
      </span>`;
    slot.classList.add('relative', 'p-0');
  } else {
    slot.innerHTML = `
      <div class="combo-slot-placeholder">
        <span class="text-5xl font-bold text-blue-400">+</span>
        <span class="text-xs text-gray-300">
          ${translations[currentLanguage]?.dragHeroHere || 'Drag Hero Here'}
        </span>
      </div>`;
    slot.classList.remove('relative', 'p-0');
  }
  updateSaveButtonState();
}

function updateSaveButtonState() {
  saveComboBtn.disabled = !isAuthReady || currentCombo.includes(null);
}

function placeHeroIntoSlot(heroName, slotEl) {
  if (!heroName || !slotEl) return;
  const idx = parseInt(slotEl.dataset.slotIndex, 10);
  if (Number.isNaN(idx)) return;

  if (currentCombo.includes(heroName) && currentCombo[idx] !== heroName) {
    showMessageBox(
      (translations[currentLanguage]?.messageHeroAlreadyInSlot ||
        'This hero is already in a slot: {heroName}.').replace(
        '{heroName}',
        heroName
      )
    );
    return;
  }

  const oldIdx = currentCombo.indexOf(heroName);
  if (oldIdx !== -1 && oldIdx !== idx) {
    currentCombo[oldIdx] = null;
    const oldSlot = document.querySelector(
      `[data-slot-index="${oldIdx}"]`
    );
    if (oldSlot) updateComboSlotDisplay(oldSlot, null, oldIdx);
  }

  currentCombo[idx] = heroName;
  updateComboSlotDisplay(slotEl, heroName, idx);
}

function initComboSlots() {
  document.querySelectorAll('.combo-slot').forEach((slot) => {
    const idx = parseInt(slot.dataset.slotIndex, 10);
    updateComboSlotDisplay(slot, null, idx);

    slot.addEventListener('dragover', (e) => {
      e.preventDefault();
      slot.classList.add('drag-over');
    });
    slot.addEventListener('dragleave', () =>
      slot.classList.remove('drag-over')
    );
    slot.addEventListener('drop', (e) => {
      e.preventDefault();
      slot.classList.remove('drag-over');
      const name = e.dataTransfer.getData('text/plain');
      placeHeroIntoSlot(name, slot);
    });
  });
}

// ------------------------------------------------------------
// Mobile touch drag–drop
// ------------------------------------------------------------
const touchDragState = {
  heroName: null,
  ghostEl: null,
  active: false
};

function onHeroTouchStart(e) {
  const card = e.currentTarget;
  const name = card.dataset.heroName;
  if (!name) return;

  const touch = e.touches[0];
  touchDragState.heroName = name;
  touchDragState.active = true;

  const ghost = document.createElement('div');
  ghost.style.position = 'fixed';
  ghost.style.left = `${touch.clientX - 40}px`;
  ghost.style.top = `${touch.clientY - 40}px`;
  ghost.style.width = '80px';
  ghost.style.height = '80px';
  ghost.style.borderRadius = '999px';
  ghost.style.pointerEvents = 'none';
  ghost.style.zIndex = '2000';
  ghost.style.boxShadow = '0 10px 25px rgba(0,0,0,0.6)';
  ghost.style.overflow = 'hidden';
  ghost.innerHTML = `<img src="${getHeroImageUrl(
    name
  )}" style="width:100%;height:100%;object-fit:cover;" />`;
  document.body.appendChild(ghost);

  touchDragState.ghostEl = ghost;

  card.classList.add('opacity-50');

  document.addEventListener('touchmove', onTouchMove, { passive: false });
  document.addEventListener('touchend', onTouchEnd);
  document.addEventListener('touchcancel', onTouchEnd);

  e.preventDefault();
}

function onTouchMove(e) {
  if (!touchDragState.active || !touchDragState.ghostEl) return;

  const touch = e.touches[0];
  const g = touchDragState.ghostEl;
  g.style.left = `${touch.clientX - 40}px`;
  g.style.top = `${touch.clientY - 40}px`;

  const el = document.elementFromPoint(touch.clientX, touch.clientY);
  document
    .querySelectorAll('.combo-slot')
    .forEach((s) => s.classList.remove('drag-over'));
  const slot = el && el.closest && el.closest('.combo-slot');
  if (slot) slot.classList.add('drag-over');

  e.preventDefault();
}

function onTouchEnd(e) {
  const heroName = touchDragState.heroName;
  const ghost = touchDragState.ghostEl;

  if (ghost) ghost.remove();
  touchDragState.heroName = null;
  touchDragState.ghostEl = null;
  touchDragState.active = false;

  document.removeEventListener('touchmove', onTouchMove);
  document.removeEventListener('touchend', onTouchEnd);
  document.removeEventListener('touchcancel', onTouchEnd);

  document
    .querySelectorAll('.hero-card')
    .forEach((c) => c.classList.remove('opacity-50'));

  document
    .querySelectorAll('.combo-slot')
    .forEach((s) => s.classList.remove('drag-over'));

  const touch = e.changedTouches && e.changedTouches[0];
  if (!touch || !heroName) return;

  const el = document.elementFromPoint(touch.clientX, touch.clientY);
  const slot = el && el.closest && el.closest('.combo-slot');
  if (slot) {
    placeHeroIntoSlot(heroName, slot);
  }
}

// ------------------------------------------------------------
// Firestore listen + save
// ------------------------------------------------------------

async function setupFirestoreListener() {
  try {
    const _db = getDb();
    if (!_db || !userId) return;
    db = _db;

    const {
      collection,
      query,
      orderBy,
      limit,
      onSnapshot,
      deleteDoc,
      doc
    } = await import(
      'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js'
    );

    const userCombosRef = collection(db, `users/${userId}/bestCombos`);

    // CHANGED: order by ascending so first saved combo is #1, next is #2, etc.
    const q = query(userCombosRef, orderBy('timestamp', 'asc'), limit(100));

    onSnapshot(
      q,
      (snap) => {
        savedCombosEl.innerHTML = '';
        noCombosMessage.classList.toggle('hidden', !snap.empty);
        userCombosData = []; // reset cached combos

        let count = 1;
        const t = translations[currentLanguage] || translations.en;

        snap.forEach((d) => {
          const data = d.data();
          userCombosData.push(data.heroes || []); // cache for share-all
          const row = document.createElement('div');
          row.className = 'saved-combo-display';
          row.innerHTML =
            `<span class="saved-combo-number">${count}</span>` +
            `<div class="saved-combo-slots"></div>`;

          const slotsContainer = row.querySelector('.saved-combo-slots');
          (data.heroes || []).forEach((name) => {
            const item = document.createElement('div');
            item.className = 'saved-combo-slot-item';
            item.innerHTML =
              `<img src="${getHeroImageUrl(name)}" alt="${name}" crossorigin="anonymous">` +
              `<span>${name}</span>`;
            slotsContainer.appendChild(item);
          });

          const actions = document.createElement('div');
          actions.className = 'saved-combo-actions';

          // Share button (text share)
          const shareBtn = document.createElement('button');
          shareBtn.className = 'share-combo-btn';
          shareBtn.title = t.shareComboTooltip || 'Share this combo as text';
          shareBtn.textContent = '⇪';
          shareBtn.onclick = () => shareCombo(data.heroes || []);
          actions.appendChild(shareBtn);

          // Delete button
          const delBtn = document.createElement('button');
          delBtn.className = 'remove-combo-btn';
          delBtn.textContent = 'X';
          delBtn.onclick = () =>
            showMessageBox(
              translations[currentLanguage]?.messageConfirmRemoveCombo ||
                'Remove this combo?',
              async () => {
                showLoadingSpinner();
                try {
                  await deleteDoc(doc(userCombosRef, d.id));
                } catch (err) {
                  console.error('Delete error', err);
                  showMessageBox(
                    (translations[currentLanguage]?.messageErrorRemovingCombo ||
                      'Error removing combo: ') + (err.message || err)
                  );
                } finally {
                  hideLoadingSpinner();
                }
              }
            );
          actions.appendChild(delBtn);

          row.appendChild(actions);
          savedCombosEl.appendChild(row);
          count++;
        });
      },
      (err) => {
        console.error('Snapshot listener error:', err);
        hideLoadingSpinner();
        showMessageBox(
          (translations[currentLanguage]?.messageErrorLoadingCombos ||
            'Error loading combos: ') + (err.message || err)
        );
      }
    );
  } catch (e) {
    console.error('setupFirestoreListener error', e);
  }
}

async function saveCombo() {
  if (currentCombo.includes(null)) {
    showMessageBox(
      translations[currentLanguage]?.messagePleaseDrag3Heroes ||
        'Please drag 3 heroes'
    );
    return;
  }

  if (!isAuthReady || !db || !userId) {
    showMessageBox(
      translations[currentLanguage]?.messageAuthNotReady ||
        'Authentication not ready yet.'
    );
    return;
  }

  showLoadingSpinner();

  try {
    const {
      collection,
      query,
      where,
      getDocs,
      addDoc,
      serverTimestamp
    } = await import(
      'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js'
    );

    const heroes = [...currentCombo];
    const heroesKey = heroes.slice().sort().join(',');

    const userCombosRef = collection(db, `users/${userId}/bestCombos`);

    const dupQuery = query(userCombosRef, where('heroesKey', '==', heroesKey));
    const dupSnap = await getDocs(dupQuery);

    if (!dupSnap.empty) {
      showMessageBox(
        translations[currentLanguage]?.messageComboAlreadySaved ||
          'This combo is already saved.'
      );
      return;
    }

    await addDoc(userCombosRef, {
      heroes,
      heroesKey,
      authorId: userId,
      timestamp: serverTimestamp()
    });

    showMessageBox(
      translations[currentLanguage]?.messageComboSavedSuccess || 'Saved!'
    );

    currentCombo = [null, null, null];
    document
      .querySelectorAll('.combo-slot')
      .forEach((slot, idx) => updateComboSlotDisplay(slot, null, idx));
  } catch (e) {
    console.error('saveCombo error:', e);
    showMessageBox(
      (translations[currentLanguage]?.messageErrorSavingCombo ||
        'Error saving combo: ') + (e.message || e)
    );
  } finally {
    hideLoadingSpinner();
  }
}

// Share ALL saved combos as a single text blob
async function shareAllCombos() {
  const t = translations[currentLanguage] || translations.en;

  if (!userCombosData || userCombosData.length === 0) {
    showMessageBox(
      t.messageNoCombosToShare ||
        'No combos to share. Please save at least one combo first!'
    );
    return;
  }

  const header = t.lastBestCombosTitle || 'Saved Hero Combos';
  const lines = [`${header} – VTS 1097`];

  userCombosData.forEach((heroes, idx) => {
    const row =
      heroes && heroes.length ? heroes.join('  |  ') : '(empty combo)';
    lines.push(`#${idx + 1}: ${row}`);
  });
  lines.push('');
  lines.push(`Create yours here: ${location.href}`);

  const text = lines.join('\n');

  if (navigator.share) {
    try {
      await navigator.share({
        title: 'My Hero Combos',
        text
      });
      return;
    } catch (e) {
      if (!e || e.name !== 'AbortError') {
        console.error('navigator.share error', e);
      }
      // fall through to clipboard / alert
    }
  }

  if (navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text);
      showMessageBox(
        t.messageShareTextCopied ||
          'Share text copied. You can paste it into your chat or group.'
      );
    } catch (e) {
      console.error('clipboard error', e);
      showMessageBox(
        t.messageShareFailed || 'Sharing failed. Please try again.'
      );
    }
  } else {
    alert(text);
  }
}

// Share a given heroes array as text (used per saved combo)
async function shareCombo(heroes) {
  const t = translations[currentLanguage] || translations.en;

  if (!heroes || heroes.length === 0) {
    showMessageBox(
      t.messageNoCombosToShare ||
        'No combos to share. Please save at least one combo first!'
    );
    return;
  }

  const title = t.appTitle || 'Hero Combo Creator';
  const text = `${title} – Hero Combo:\n${heroes.join(
    '  |  '
  )}\n\nTry it on the Hero Combo Creator: ${location.href}`;

  if (navigator.share) {
    try {
      await navigator.share({
        title: 'My Hero Combo',
        text
      });
    } catch (e) {
      if (e && e.name !== 'AbortError') {
        console.error('navigator.share error', e);
        showMessageBox(
          t.messageShareFailed || 'Sharing failed. Please try again.'
        );
      }
    }
  } else if (navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text);
      showMessageBox(
        t.messageShareTextCopied ||
          'Share text copied. You can paste it into your chat or group.'
      );
    } catch (e) {
      console.error('clipboard error', e);
      showMessageBox(
        t.messageShareFailed || 'Sharing failed. Please try again.'
      );
    }
  } else {
    alert(text);
  }
}

// ------------------------------------------------------------

async function downloadCombosAsImage() {
  const t = translations[currentLanguage];
  showLoadingSpinner();
  try {
    if (!savedCombosEl || savedCombosEl.children.length === 0) {
      showMessageBox(
        t?.messageNoCombosToDownload || 'No combos to download'
      );
      return;
    }
    // hide buttons for clean capture
    const buttons = document.querySelectorAll(
      '.remove-combo-btn, .share-combo-btn'
    );
    buttons.forEach((b) => (b.style.display = 'none'));

    const canvas = await html2canvas(savedCombosEl, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false
    });
    buttons.forEach((b) => (b.style.display = ''));

    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = 'hero_combos.png';
    link.click();
    showMessageBox(
      t?.messageCombosDownloadedSuccess || 'Downloaded!'
    );
  } catch (e) {
    console.error(e);
    showMessageBox(
      (t?.messageErrorDownloadingCombos || 'Download error') +
        ' ' +
        (e.message || e)
    );
  } finally {
    hideLoadingSpinner();
  }
}

function wireUIActions() {
  languageSelect.addEventListener('change', (e) => {
    currentLanguage = e.target.value;
    updateTextContent();
  });

  document.getElementById('seasonFilters').addEventListener('change', (e) => {
    const val = e.target.value;
    if (!val) return;
    if (e.target.checked) {
      if (!selectedSeasons.includes(val)) selectedSeasons.push(val);
    } else {
      selectedSeasons = selectedSeasons.filter((s) => s !== val);
    }
    debouncedRender();
  });

  clearComboBtn.addEventListener('click', () => {
    currentCombo = [null, null, null];
    document
      .querySelectorAll('.combo-slot')
      .forEach((s, i) => updateComboSlotDisplay(s, null, i));
  });

  saveComboBtn.addEventListener('click', saveCombo);
  downloadCombosBtn.addEventListener('click', downloadCombosAsImage);
  if (shareAllCombosBtn) {
    shareAllCombosBtn.addEventListener('click', shareAllCombos);
  }
}

function updateTextContent() {
  const t = translations[currentLanguage] || translations.en;
  document.getElementById('appTitle').textContent = t.appTitle;
  document.getElementById('filterBySeasonTitle').textContent =
    t.filterBySeasonTitle;
  document.getElementById('availableHeroesTitle').textContent =
    t.availableHeroesTitle;
  document.getElementById('createComboTitle').textContent = t.createComboTitle;
  document.getElementById('lastBestCombosTitle').textContent =
    t.lastBestCombosTitle;
  if (noCombosMessage) noCombosMessage.textContent = t.noCombosMessage;
  saveComboBtn.textContent = t.saveComboBtn;
  clearComboBtn.textContent = t.clearComboBtn;
  downloadCombosBtn.textContent = t.downloadCombosBtn;
  if (shareAllCombosBtn) {
    shareAllCombosBtn.textContent = t.shareAllCombosBtn;
  }

  document.querySelectorAll('.combo-slot').forEach((slot, idx) => {
    if (currentCombo[idx] === null) updateComboSlotDisplay(slot, null, idx);
  });
}

const debouncedRender = debounce(() => renderAvailableHeroes(), 150);

// ------------------------------------------------------------
// main init
// ------------------------------------------------------------
(async function main() {
  showLoadingSpinner();

  renderAvailableHeroes();
  initComboSlots();
  wireUIActions();
  updateTextContent();

  try {
    initFirebase();
    const user = await ensureAnonymousAuth();
    isAuthReady = true;
    userId = user.uid || 'anonymous';
    db = getDb();
    updateSaveButtonState();
    setupFirestoreListener();
    initComments().catch((err) =>
      console.error('[comments] init caught', err)
    );
  } catch (err) {
    console.error('Firebase/auth init error:', err);
    showMessageBox(
      (translations[currentLanguage]?.messageFirebaseInitError ||
        'Firebase init error') + ' ' + (err.message || err)
    );
  } finally {
    hideLoadingSpinner();
  }
})();
