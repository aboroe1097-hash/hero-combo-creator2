// js/app.js
// main app

import { translations as baseTranslations } from './translations.js';
import { initFirebase, ensureAnonymousAuth, getDb } from './firebase.js';
import { initComments } from './comments.js';
import { rankedCombos } from './combos-db.js';

const translations = baseTranslations;

// DOM elements
const languageSelect = document.getElementById('languageSelect');
const availableHeroesEl = document.getElementById('availableHeroes');
const saveComboBtn = document.getElementById('saveComboBtn');
const clearComboBtn = document.getElementById('clearComboBtn');
const downloadCombosBtn = document.getElementById('downloadCombosBtn');
const shareAllCombosBtn = document.getElementById('shareAllCombosBtn');
const savedCombosEl = document.getElementById('savedCombos');
const noCombosMessage = document.getElementById('noCombosMessage');
const loadingSpinner = document.getElementById('loadingSpinner');
const messageBox = document.getElementById('messageBox');
const messageText = document.getElementById('messageText');
const messageBoxOkBtn = document.getElementById('messageBoxOkBtn');
const messageBoxCancelBtn = document.getElementById('messageBoxCancelBtn');

// mode tabs
const tabBuilder = document.getElementById('tabBuilder');
const tabGenerator = document.getElementById('tabGenerator');
const builderMode = document.getElementById('builderMode');
const generatorMode = document.getElementById('generatorMode');

// generator DOM
const ownedHeroesListEl = document.getElementById('ownedHeroesList');
const generatorResultsEl = document.getElementById('generatorResults');
const selectAllHeroesBtn = document.getElementById('selectAllHeroesBtn');
const clearAllHeroesBtn = document.getElementById('clearAllHeroesBtn');
const generateCombosBtn = document.getElementById('generateCombosBtn');

// state
let currentLanguage = 'en';
let selectedSeasons = ['S0'];
let currentCombo = [null, null, null];

let db = null;
let userId = 'anonymous';
let isAuthReady = false;
let spinnerFallbackTimer = null;
let userCombosData = []; // store heroes arrays for all saved combos (for share-all)

let ownedHeroes = new Set(); // combo-generator selection state

// --- hero data -----------------------------------------------------
const allHeroesData = [
  // Season 0
  {
    name: "Jeanne d'Arc",
    season: 'S0',
    imageUrl:
      'https://static.wixstatic.com/media/43ee96_d5f5b07c90924e6ab5b1d70e2667b693~mv2.png/v1/fill/w_99,h_99,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png'
  },
  {
    name: 'Isabella I',
    season: 'S0',
    imageUrl:
      'https://static.wixstatic.com/media/43ee96_dcba45dd1c394074a0e23e3f780c6aee~mv2.png/v1/fill/w_99,h_99,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png'
  },
  {
    name: 'Jiguang Qi',
    season: 'S0',
    imageUrl:
      'https://static.wixstatic.com/media/43ee96_3bb681424e034e9e8f0dea7d71c93390~mv2.png/v1/fill/w_99,h_99,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png'
  },
  {
    name: 'Mary Tudor',
    season: 'S0',
    imageUrl:
      'https://static.wixstatic.com/media/43ee96_7d24a8f5148b42c68e9e183ecdf1080d~mv2.png/v1/fill/w_99,h_99,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png'
  },
  {
    name: 'Leonidas',
    season: 'S0',
    imageUrl:
      'https://static.wixstatic.com/media/43ee96_f672d18c06904465a490ea4811cee798~mv2.png/v1/fill/w_99,h_99,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png'
  },
  {
    name: 'The Boneless',
    season: 'S0',
    imageUrl:
      'https://static.wixstatic.com/media/43ee96_5fec4c7d62314acfb90ea624dedd08c6~mv2.png/v1/fill/w_99,h_99,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png'
  },
  {
    name: 'Demon Spear',
    season: 'S0',
    imageUrl:
      'https://static.wixstatic.com/media/43ee96_39ffb285fd524cd1b7c27057b0fe4f44~mv2.png/v1/fill/w_99,h_99,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png'
  },
  {
    name: 'Kublai',
    season: 'S0',
    imageUrl:
      'https://static.wixstatic.com/media/43ee96_19f2c6dda1b04b72942f1f691efd63b2~mv2.png/v1/fill/w_99,h_99,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png'
  },
  {
    name: 'The Heroine',
    season: 'S0',
    imageUrl:
      'https://static.wixstatic.com/media/43ee96_80bd949738da42cc88525fd5d6dc1f81~mv2.png/v1/fill/w_99,h_99,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png'
  },
  {
    name: 'Queen Anne',
    season: 'S0',
    imageUrl:
      'https://static.wixstatic.com/media/43ee96_4a70ebf4f01c444f9e238861826c0b90~mv2.png/v1/fill/w_99,h_99,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png'
  },
  {
    name: "North's Rage",
    season: 'S0',
    imageUrl:
      'https://static.wixstatic.com/media/43ee96_582201a2a5e14a29a9c186393dd0bb06~mv2.png/v1/fill/w_99,h_99,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png'
  },
  {
    name: 'William Wallace',
    season: 'S0',
    imageUrl:
      'https://static.wixstatic.com/media/43ee96_860c9a1a59214245b3d65d0f1fd816de~mv2.png/v1/fill/w_99,h_99,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png'
  },
  {
    name: 'Yukimura Sanada',
    season: 'S0',
    imageUrl:
      'https://static.wixstatic.com/media/43ee96_41cdaf2c39b44127b0c9ede9da2f70b7~mv2.png/v1/fill/w_99,h_99,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png'
  },
  {
    name: "Heaven's Justice",
    season: 'S0',
    imageUrl:
      'https://static.wixstatic.com/media/43ee96_c81fb50a85d14f63b0aee9977c476c6c~mv2.png/v1/fill/w_99,h_99,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png'
  },
  // Season 1
  {
    name: 'Alfred',
    season: 'S1',
    imageUrl:
      'https://static.wixstatic.com/media/43ee96_e75a942dc1c64689b140f23d905b5ca0~mv2.png/v1/fill/w_99,h_99,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png'
  },
  {
    name: 'Cao Cao',
    season: 'S1',
    imageUrl:
      'https://static.wixstatic.com/media/43ee96_3998355c7cae4b70a89000ee66ad8e3f~mv2.png/v1/fill/w_126,h_126,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png'
  },
  {
    name: 'Charles the Great',
    season: 'S1',
    imageUrl:
      'https://static.wixstatic.com/media/43ee96_e95b962e46204b6badbd6e63e1307582~mv2.png/v1/fill/w_99,h_99,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png'
  },
  {
    name: 'Black Prince',
    season: 'S1',
    imageUrl:
      'https://static.wixstatic.com/media/43ee96_29a333b02497463f81d329056996b8a3~mv2.png/v1/fill/w_99,h_99,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png'
  },
  {
    name: 'Lionheart',
    season: 'S1',
    imageUrl:
      'https://static.wixstatic.com/media/43ee96_ecf64b68a8f64ad2bd159f86f5be179c~mv2.png/v1/fill/w_99,h_99,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png'
  },
  {
    name: 'Al Fatih',
    season: 'S1',
    imageUrl:
      'https://static.wixstatic.com/media/43ee96_f834a1ef8d2d4de5bba80ab40e531a6f~mv2.png/v1/fill/w_99,h_99,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png'
  },
  {
    name: 'Edward the Confessor',
    season: 'S1',
    imageUrl:
      'https://static.wixstatic.com/media/43ee96_51538af01a9f4ec789127837e62dccfa~mv2.png/v1/fill/w_99,h_99,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png'
  },
  {
    name: 'Constantine the Great',
    season: 'S1',
    imageUrl:
      'https://static.wixstatic.com/media/43ee96_b738599c5a0b46deb6a4abf7273f9268~mv2.png/v1/fill/w_99,h_99,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png'
  },
  {
    name: 'Genghis Khan',
    season: 'S1',
    imageUrl:
      'https://static.wixstatic.com/media/43ee96_40f1c10ba0e04d4fa3e841f865cd206a~mv2.png/v1/fill/w_99,h_99,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png'
  },
  {
    name: 'William the Conqueror',
    season: 'S1',
    imageUrl:
      'https://static.wixstatic.com/media/43ee96_517ee1432ce04974be78d3532e48afb3~mv2.png/v1/fill/w_101,h_101,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png'
  },
  // Season 2
  {
    name: 'Inquisitor',
    season: 'S2',
    imageUrl:
      'https://static.wixstatic.com/media/43ee96_5e9612fc176442b78c1fa6766b87473c~mv2.png/v1/fill/w_101,h_101,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png'
  },
  {
    name: 'BeastQueen',
    season: 'S2',
    imageUrl:
      'https://static.wixstatic.com/media/43ee96_6883135290314469a0daee804dd03692~mv2.png/v1/fill/w_101,h_101,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png'
  },
  {
    name: 'Jade',
    season: 'S2',
    imageUrl:
      'https://static.wixstatic.com/media/43ee96_61729052c05240b4b7cf34324f8ed870~mv2.png/v1/fill/w_101,h_101,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png'
  },
  {
    name: 'Immortal',
    season: 'S2',
    imageUrl:
      'https://static.wixstatic.com/media/43ee96_8c4e699dedc341a7a86ae4b47d3cce71~mv2.png/v1/fill/w_101,h_101,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png'
  },
  {
    name: 'Peace Bringer',
    season: 'S2',
    imageUrl:
      'https://static.wixstatic.com/media/43ee96_cfea192f7ad64a13be3fa40c516a8bce~mv2.png/v1/fill/w_101,h_101,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png'
  },
  {
    name: 'Witch Hunter',
    season: 'S2',
    imageUrl:
      'https://static.wixstatic.com/media/43ee96_82ced5fbba3f489fbb04ceb4fa7cd19c~mv2.png/v1/fill/w_101,h_101,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png'
  },
  {
    name: 'Ramses II',
    season: 'S2',
    imageUrl:
      'https://static.wixstatic.com/media/43ee96_2b28a06a2a1544339940724f29bf4b9d~mv2.png/v1/fill/w_101,h_101,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png'
  },
  {
    name: 'Octavius',
    season: 'S2',
    imageUrl:
      'https://static.wixstatic.com/media/43ee96_eeb99bc718ad488b961bb643d4a6653f~mv2.png/v1/fill/w_101,h_101,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png'
  },
  // Season 3
  {
    name: 'War Lord',
    season: 'S3',
    imageUrl:
      'https://static.wixstatic.com/media/43ee96_bbbe6a8669d74ddea17b73af5e3cf05c~mv2.png/v1/fill/w_101,h_101,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png'
  },
  {
    name: 'Jane',
    season: 'S3',
    imageUrl:
      'https://static.wixstatic.com/media/43ee96_d36c3be1d2d64747a59700bf41b8890d~mv2.png/v1/fill/w_101,h_101,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png'
  },
  {
    name: 'Sky Breaker',
    season: 'S3',
    imageUrl:
      'https://static.wixstatic.com/media/43ee96_cacde74500864a0d916746fe0945c970~mv2.png/v1/fill/w_101,h_101,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png'
  },
  {
    name: 'Rokuboshuten',
    season: 'S3',
    imageUrl:
      'https://static.wixstatic.com/media/43ee96_eaf3463bf3654d0e90adb41a1cb5ad4c~mv2.png/v1/fill/w_101,h_101,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png'
  },
  {
    name: 'Bleeding Steed',
    season: 'S3',
    imageUrl:
      'https://static.wixstatic.com/media/43ee96_9256fc0a80284c1ab285554dbf33a4b3~mv2.png/v1/fill/w_101,h_101,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png'
  },
  {
    name: 'Rozen Blade',
    season: 'S3',
    imageUrl:
      'https://static.wixstatic.com/media/43ee96_42b02c160ac849dca0dd7e4a6b472582~mv2.png/v1/fill/w_101,h_101,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png'
  },
  {
    name: 'Celopatrra VII',
    season: 'S3',
    imageUrl:
      'https://static.wixstatic.com/media/43ee96_7109811bb55a47749090edcc8df9e7c6~mv2.png/v1/fill/w_101,h_101,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png'
  },
  {
    name: 'Ceasar',
    season: 'S3',
    imageUrl:
      'https://static.wixstatic.com/media/43ee96_5cf26138c5174d4587fc025cd5fe399a~mv2.png/v1/fill/w_101,h_101,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png'
  },
  // Season 4
  {
    name: 'Desert Storm',
    season: 'S4',
    imageUrl: 'https://i.ibb.co/vChW2BGG/Desert-Storm.png'
  },
  {
    name: 'Soaring Hawk',
    season: 'S4',
    imageUrl: 'https://i.ibb.co/nsypbRHh/Soaring-hawk.png'
  },
  {
    name: 'The Brave',
    season: 'S4',
    imageUrl: 'https://i.ibb.co/XxR25Kzy/brave.png'
  },
  {
    name: 'Jade Eagle',
    season: 'S4',
    imageUrl: 'https://i.ibb.co/GQzRPtZf/Jade-eagle.png'
  },
  {
    name: 'Immortal Guardian',
    season: 'S4',
    imageUrl: 'https://i.ibb.co/mr0PCzJt/Immortal-Guardian.png'
  },
  {
    name: 'Divine Arrow',
    season: 'S4',
    imageUrl: 'https://i.ibb.co/6JcVTCnr/Divine-Arrow.png'
  },
  {
    name: 'Theodora',
    season: 'S4',
    imageUrl: 'https://i.ibb.co/JwtYrGzN/Theodora.png'
  },
  {
    name: 'King Arthur',
    season: 'S4',
    imageUrl: 'https://i.ibb.co/4Ryx1F6P/King-Arthur.png'
  }
];

// simple color-coding per season (visual feedback)
const seasonColors = {
  S0: '#9ca3af', // grey
  S1: '#3b82f6', // blue
  S2: '#a855f7', // purple
  S3: '#f97316', // orange
  S4: '#facc15'  // gold
};

function getCurrentLanguage() {
  return currentLanguage;
}

// ------------------------------------------------------------
// helpers / UI
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

// ------------------------------------------------------------
// Mode switching (builder vs generator)
// ------------------------------------------------------------
function setMode(mode) {
  const isBuilder = mode === 'builder';

  if (builderMode) {
    builderMode.classList.toggle('hidden', !isBuilder);
  }
  if (generatorMode) {
    generatorMode.classList.toggle('hidden', isBuilder);
  }
  if (tabBuilder) {
    tabBuilder.classList.toggle('bg-blue-600', isBuilder);
    tabBuilder.classList.toggle('text-white', isBuilder);
    tabBuilder.classList.toggle('bg-gray-700', !isBuilder);
    tabBuilder.classList.toggle('text-gray-200', !isBuilder);
  }
  if (tabGenerator) {
    tabGenerator.classList.toggle('bg-blue-600', !isBuilder);
    tabGenerator.classList.toggle('text-white', !isBuilder);
    tabGenerator.classList.toggle('bg-gray-700', isBuilder);
    tabGenerator.classList.toggle('text-gray-200', isBuilder);
  }
}

// ------------------------------------------------------------
// Available heroes grid
// ------------------------------------------------------------
function renderAvailableHeroes() {
  availableHeroesEl.innerHTML = '';
  const chosen = allHeroesData.filter((h) =>
    selectedSeasons.includes(h.season)
  );
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
      <div class="combo-slot-placeholder flex flex-col items-center justify-center h-full w-full">
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
  if (!saveComboBtn) return;
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
    slot.addEventListener('dragleave', () => slot.classList.remove('drag-over'));
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
// Firestore listen + save (per-user bestCombos)
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

    // IMPORTANT: ascending so first combo saved is #1, next is #2, etc.
    const q = query(userCombosRef, orderBy('timestamp', 'asc'), limit(100));

    onSnapshot(
      q,
      (snap) => {
        savedCombosEl.innerHTML = '';
        noCombosMessage.classList.toggle('hidden', !snap.empty);
        userCombosData = []; // reset cached combos

        let count = 1;
        snap.forEach((d) => {
          const data = d.data();
          const heroes = data.heroes || [];
          userCombosData.push(heroes);

          const row = document.createElement('div');
          row.className = 'saved-combo-display';
          row.innerHTML =
            `<span class="saved-combo-number">${count}</span>` +
            `<div class="saved-combo-slots"></div>`;

          const slotsContainer = row.querySelector('.saved-combo-slots');
          heroes.forEach((name) => {
            const item = document.createElement('div');
            item.className = 'saved-combo-slot-item';
            item.innerHTML =
              `<img src="${getHeroImageUrl(name)}" alt="${name}" crossorigin="anonymous">` +
              `<span>${name}</span>`;
            slotsContainer.appendChild(item);
          });

          const actions = document.createElement('div');
          actions.className = 'saved-combo-actions';

          // Share button (per combo text)
          const shareBtn = document.createElement('button');
          shareBtn.className = 'share-combo-btn';
          shareBtn.title = 'Share this combo';
          shareBtn.textContent = '⇪';
          shareBtn.onclick = () => shareCombo(heroes);
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

// ------------------------------------------------------------
// Sharing helpers
// ------------------------------------------------------------

// Share ALL saved combos as a single text blob
async function shareAllCombos() {
  if (!userCombosData || userCombosData.length === 0) {
    showMessageBox('No saved combos to share yet.');
    return;
  }

  const lines = ['VTS 1097 – Saved Hero Combos'];
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
      showMessageBox('All combos copied to clipboard – paste into chat!');
    } catch (e) {
      console.error('clipboard error', e);
      alert(text);
    }
  } else {
    alert(text);
  }
}

// Share a given heroes array as text (per saved combo)
async function shareCombo(heroes) {
  if (!heroes || heroes.length === 0) {
    showMessageBox('Nothing to share – this combo is empty.');
    return;
  }

  const text = `VTS 1097 – Hero Combo:\n${heroes.join(
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
        showMessageBox('Could not share this combo.');
      }
    }
  } else if (navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text);
      showMessageBox('Combo text copied to clipboard – paste it into chat!');
    } catch (e) {
      console.error('clipboard error', e);
      alert(text);
    }
  } else {
    alert(text);
  }
}

// ------------------------------------------------------------
// Download combos as image
// ------------------------------------------------------------
async function downloadCombosAsImage() {
  const t = translations[currentLanguage];
  showLoadingSpinner();
  try {
    if (!savedCombosEl || savedCombosEl.children.length === 0) {
      showMessageBox(t?.messageNoCombosToDownload || 'No combos to download');
      return;
    }

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
    showMessageBox(t?.messageCombosDownloadedSuccess || 'Downloaded!');
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

// ------------------------------------------------------------
// Combo Generator logic
// ------------------------------------------------------------
function getCurrentLanguage() {
  return currentLanguage;
}

// ---------------------------------------------
// Combo Generator: hero cards + season filters
// ---------------------------------------------
function initComboGenerator() {
  if (!generatorMode || !ownedHeroesListEl || !generatorResultsEl) return;

  const t = translations[getCurrentLanguage()] || translations.en;

  // keep track of which seasons are shown in the generator
  let generatorSelectedSeasons = new Set(['S0', 'S1', 'S2', 'S3', 'S4']);

  // --- build a season filter bar inside generator (only once) ---
  let filtersWrapper = document.getElementById(
    'generatorSeasonFiltersWrapper'
  );
  if (!filtersWrapper) {
    filtersWrapper = document.createElement('div');
    filtersWrapper.id = 'generatorSeasonFiltersWrapper';
    filtersWrapper.className = 'mb-4';

    filtersWrapper.innerHTML = `
      <h3 id="generatorFilterBySeasonTitle"
          class="text-lg font-semibold mb-2 text-gray-200">
        ${t.generatorFilterBySeasonTitle ||
          t.filterBySeasonTitle ||
          'Filter by Season'}
      </h3>
      <div id="generatorSeasonFiltersRow"
           class="flex flex-wrap gap-3"></div>
    `;

    // insert the filter bar just above the hero list in generator mode
    generatorMode.insertBefore(filtersWrapper, ownedHeroesListEl);

    const filtersRow = filtersWrapper.querySelector(
      '#generatorSeasonFiltersRow'
    );
    ['S0', 'S1', 'S2', 'S3', 'S4'].forEach((season) => {
      const label = document.createElement('label');
      label.className = 'inline-flex items-center';

      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.value = season;
      cb.checked = true;
      cb.className = 'form-checkbox h-5 w-5 text-blue-600';

      cb.addEventListener('change', () => {
        if (cb.checked) {
          generatorSelectedSeasons.add(season);
        } else {
          generatorSelectedSeasons.delete(season);
        }
        renderOwnedHeroList();
      });

      const span = document.createElement('span');
      span.className = 'ml-2 text-gray-300';
      span.textContent = season.replace('S', 'Season ');

      label.appendChild(cb);
      label.appendChild(span);
      filtersRow.appendChild(label);
    });
  }

  // helper to visually mark selected cards
  function setCardSelected(card, selected) {
    if (selected) {
      card.style.outline = '2px solid #22c55e';
      card.style.boxShadow = '0 0 0 2px rgba(34,197,94,0.4)';
      card.style.opacity = '1';
    } else {
      card.style.outline = '';
      card.style.boxShadow = '';
      card.style.opacity = '';
    }
  }

  // --- render hero cards (like manual builder) but click to select ---
  function renderOwnedHeroList() {
    ownedHeroesListEl.innerHTML = '';

    const filteredHeroes = allHeroesData.filter((h) =>
      generatorSelectedSeasons.has(h.season)
    );

    filteredHeroes.forEach((hero) => {
      const card = document.createElement('div');
      card.className = 'hero-card cursor-pointer';
      card.dataset.heroName = hero.name;

      const tagColor = seasonColors[hero.season] || '#f97316';

      card.innerHTML = `
        <span class="hero-tag" style="background:${tagColor}">${hero.season}</span>
        <img src="${getHeroImageUrl(hero.name)}"
             alt="${hero.name}"
             loading="lazy"
             crossorigin="anonymous">
        <span class="mt-1">${hero.name}</span>
      `;

      // initial highlight if already in ownedHeroes
      const isSelected = ownedHeroes.has(hero.name);
      setCardSelected(card, isSelected);

      // click to toggle selection
      card.addEventListener('click', () => {
        if (ownedHeroes.has(hero.name)) {
          ownedHeroes.delete(hero.name);
          setCardSelected(card, false);
        } else {
          ownedHeroes.add(hero.name);
          setCardSelected(card, true);
        }
      });

      ownedHeroesListEl.appendChild(card);
    });
  }

  // --- generate up to 5 best combos for selected heroes ---
  function generateBestCombos() {
    const t2 = translations[getCurrentLanguage()] || translations.en;
    generatorResultsEl.innerHTML = '';

    const minHeroes = 15;
    if (ownedHeroes.size < minHeroes) {
      const msgTemplate =
        t2.generatorTooFewHeroes ||
        'Select at least {minHeroes} heroes to generate 5 combos.';
      const msg = msgTemplate.replace('{minHeroes}', String(minHeroes));
      generatorResultsEl.innerHTML = `
        <p class="text-sm text-red-400">${msg}</p>
      `;
      return;
    }

    const ownedList = Array.from(ownedHeroes);
    const ownedSet = new Set(ownedList);

    const buildable = rankedCombos
      .filter(
        (combo) =>
          combo.heroes &&
          combo.heroes.length === 3 &&
          combo.heroes.every((h) => ownedSet.has(h))
      )
      .sort((a, b) => (b.score || 0) - (a.score || 0));

    if (buildable.length === 0) {
      const msg =
        t2.generatorNoCombosAvailable ||
        'No ranked combos available for this selection yet. Try selecting more heroes.';
      generatorResultsEl.innerHTML = `
        <p class="text-sm text-yellow-300">${msg}</p>
      `;
      return;
    }

    const comboLabel = t2.generatorComboLabel || 'Combo';
    const scoreLabel = t2.generatorScoreLabel || 'Score:';
    const emptyMsgTemplate =
      t2.generatorEmptySlotMessage ||
      'No combo for slot #{slot}. Add more heroes to your squad.';

    const maxSlots = 5;

    for (let i = 0; i < maxSlots; i++) {
      const card = document.createElement('div');
      card.className =
        'bg-gray-800 rounded-xl p-4 mb-3 shadow-md border border-gray-700';

      const titleRow = document.createElement('div');
      titleRow.className = 'flex items-center justify-between mb-2';

      const left = document.createElement('div');
      left.className = 'flex items-center gap-2';

      const badge = document.createElement('span');
      badge.className =
        'inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-600 text-xs font-bold';
      badge.textContent = `#${i + 1}`;

      const label = document.createElement('span');
      label.className = 'font-semibold text-sm';
      label.textContent = `${comboLabel} ${i + 1}`;

      left.appendChild(badge);
      left.appendChild(label);
      titleRow.appendChild(left);

      if (i < buildable.length) {
        const combo = buildable[i];
        const scoreEl = document.createElement('span');
        scoreEl.className = 'text-xs text-amber-300 font-semibold';
        scoreEl.textContent = `${scoreLabel} ${combo.score ?? 0}`;
        titleRow.appendChild(scoreEl);
        card.appendChild(titleRow);

        const heroesRow = document.createElement('div');
        heroesRow.className = 'flex flex-wrap gap-3 mt-2';

        combo.heroes.forEach((hName) => {
          const tile = document.createElement('div');
          tile.className =
            'flex flex-col items-center justify-center w-20';

          tile.innerHTML = `
            <div class="w-16 h-16 rounded-lg overflow-hidden border border-gray-600 mb-1">
              <img src="${getHeroImageUrl(hName)}"
                   alt="${hName}"
                   class="w-full h-full object-cover"
                   crossorigin="anonymous">
            </div>
            <span class="text-[11px] text-center text-blue-100 truncate w-full">
              ${hName}
            </span>
          `;
          heroesRow.appendChild(tile);
        });

        card.appendChild(heroesRow);
      } else {
        // placeholder card for missing #4/#5
        card.appendChild(titleRow);
        const emptyMsg = emptyMsgTemplate.replace(
          '{slot}',
          String(i + 1)
        );
        const info = document.createElement('p');
        info.className = 'text-xs text-gray-400 mt-2';
        info.textContent = emptyMsg;
        card.appendChild(info);
      }

      generatorResultsEl.appendChild(card);
    }
  }

  // --- wire buttons for select all / clear / generate ---
  if (selectAllHeroesBtn) {
    selectAllHeroesBtn.onclick = () => {
      const filteredHeroes = allHeroesData.filter((h) =>
        generatorSelectedSeasons.has(h.season)
      );
      filteredHeroes.forEach((h) => ownedHeroes.add(h.name));
      renderOwnedHeroList(); // refresh highlighting
    };
  }

  if (clearAllHeroesBtn) {
    clearAllHeroesBtn.onclick = () => {
      ownedHeroes.clear();
      renderOwnedHeroList();
    };
  }

  if (generateCombosBtn) {
    generateCombosBtn.onclick = generateBestCombos;
  }

  // initial render: show all heroes, all seasons checked
  renderOwnedHeroList();
}
// ------------------------------------------------------------
// Wire UI actions
// ------------------------------------------------------------
function wireUIActions() {
  if (languageSelect) {
    languageSelect.addEventListener('change', (e) => {
      currentLanguage = e.target.value;
      updateTextContent();
    });
  }

  const seasonFiltersEl = document.getElementById('seasonFilters');
  if (seasonFiltersEl) {
    seasonFiltersEl.addEventListener('change', (e) => {
      const val = e.target.value;
      if (!val) return;
      if (e.target.checked) {
        if (!selectedSeasons.includes(val)) selectedSeasons.push(val);
      } else {
        selectedSeasons = selectedSeasons.filter((s) => s !== val);
      }
      debouncedRender();
    });
  }

  if (clearComboBtn) {
    clearComboBtn.addEventListener('click', () => {
      currentCombo = [null, null, null];
      document
        .querySelectorAll('.combo-slot')
        .forEach((s, i) => updateComboSlotDisplay(s, null, i));
    });
  }

  if (saveComboBtn) {
    saveComboBtn.addEventListener('click', saveCombo);
  }
  if (downloadCombosBtn) {
    downloadCombosBtn.addEventListener('click', downloadCombosAsImage);
  }
  if (shareAllCombosBtn) {
    shareAllCombosBtn.addEventListener('click', shareAllCombos);
  }

  // mode tabs
  if (tabBuilder) {
    tabBuilder.addEventListener('click', () => setMode('builder'));
  }
  if (tabGenerator) {
    tabGenerator.addEventListener('click', () => setMode('generator'));
  }
}

function updateTextContent() {
  const t = translations[currentLanguage] || translations['en'];
  const appTitleEl = document.getElementById('appTitle');
  if (appTitleEl) appTitleEl.textContent = t.appTitle;

  const filterTitleEl = document.getElementById('filterBySeasonTitle');
  if (filterTitleEl) filterTitleEl.textContent = t.filterBySeasonTitle;

  const availTitleEl = document.getElementById('availableHeroesTitle');
  if (availTitleEl) availTitleEl.textContent = t.availableHeroesTitle;

  const createTitleEl = document.getElementById('createComboTitle');
  if (createTitleEl) createTitleEl.textContent = t.createComboTitle;

  const lastBestTitleEl = document.getElementById('lastBestCombosTitle');
  if (lastBestTitleEl) lastBestTitleEl.textContent = t.lastBestCombosTitle;

  if (noCombosMessage) noCombosMessage.textContent = t.noCombosMessage;

  if (saveComboBtn) saveComboBtn.textContent = t.saveComboBtn;
  if (clearComboBtn) clearComboBtn.textContent = t.clearComboBtn;
  if (downloadCombosBtn) downloadCombosBtn.textContent = t.downloadCombosBtn;

  // generator translations (if present)
  const genTitleEl = document.getElementById('generatorTitle');
  if (genTitleEl && t.generatorTitle) genTitleEl.textContent = t.generatorTitle;
  const genIntroEl = document.getElementById('generatorIntro');
  if (genIntroEl && t.generatorIntro) genIntroEl.textContent = t.generatorIntro;
  if (selectAllHeroesBtn && t.generatorSelectAll) {
    selectAllHeroesBtn.textContent = t.generatorSelectAll;
  }
  if (clearAllHeroesBtn && t.generatorClearAll) {
    clearAllHeroesBtn.textContent = t.generatorClearAll;
  }
  if (generateCombosBtn && t.generatorGenerateBtn) {
    generateCombosBtn.textContent = t.generatorGenerateBtn;
  }

  // refresh empty slots language
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
  initComboGenerator();
  setMode('builder');

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
