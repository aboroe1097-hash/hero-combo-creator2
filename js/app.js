// js/app.js
// Main app (manual builder + combo generator)

import { translations as baseTranslations } from './translations.js';
import { initFirebase, ensureAnonymousAuth, getDb } from './firebase.js';
import { initComments } from './comments.js';

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

// Simple color-coding per season (visual feedback)
const seasonColors = {
  S0: '#9ca3af',
  S1: '#3b82f6',
  S2: '#a855f7',
  S3: '#f97316',
  S4: '#facc15'
};

// -------------------------------------------------------------
// Combo generator score database (simple now: heroes + score)
// You can extend this list later – just keep hero names exact.
// -------------------------------------------------------------
const comboScores = [
  {
    heroes: ['William Wallace', "Leonidas", "North's Rage"],
    score: 98
  },
  {
    heroes: ['Yukimura Sanada', 'William Wallace', 'Demon Spear'],
    score: 96
  },
  {
    heroes: ['Genghis Khan', 'Lionheart', 'Black Prince'],
    score: 95
  },
  {
    heroes: ['Desert Storm', 'Soaring Hawk', 'Immortal Guardian'],
    score: 94
  },
  {
    heroes: ['The Heroine', 'Queen Anne', "Heaven's Justice"],
    score: 93
  }
  // add more here…
];

// -------------------------------------------------------------
// Utility helpers
// -------------------------------------------------------------
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
      showMessageBox(
        'Authentication is taking longer than expected. The app is usable offline; saved combos require network to sync.'
      );
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
  if (!messageBox) {
    alert(message);
    if (onConfirm) onConfirm();
    return;
  }

  messageText.textContent = message;
  messageBox.classList.remove('hidden');

  const t = translations[currentLanguage] || translations.en;

  if (onConfirm) {
    messageBoxOkBtn.textContent = t.messageBoxConfirm || 'Confirm';
    messageBoxOkBtn.onclick = () => {
      messageBox.classList.add('hidden');
      onConfirm();
    };
    messageBoxCancelBtn.classList.remove('hidden');
    messageBoxCancelBtn.textContent = t.messageBoxCancel || 'Cancel';
    messageBoxCancelBtn.onclick = () => messageBox.classList.add('hidden');
  } else {
    messageBoxOkBtn.textContent = t.messageBoxOk || 'OK';
    messageBoxOkBtn.onclick = () => {
      messageBox.classList.add('hidden');
    };
    messageBoxCancelBtn.classList.add('hidden');
  }
}

// -------------------------------------------------------------
// Manual builder: heroes grid + drag/drop
// -------------------------------------------------------------
function renderAvailableHeroes() {
  if (!availableHeroesEl) return;
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
      <img src="${getHeroImageUrl(hero.name)}"
           alt="${hero.name}"
           loading="lazy"
           crossorigin="anonymous">
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
  const t = translations[currentLanguage] || translations.en;

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
          ${t.dragHeroHere || 'Drag Hero Here'}
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

  const t = translations[currentLanguage] || translations.en;

  // Prevent duplicates in different slots
  if (currentCombo.includes(heroName) && currentCombo[idx] !== heroName) {
    showMessageBox(
      (t.messageHeroAlreadyInSlot ||
        'This hero is already in another slot: {heroName}.').replace(
        '{heroName}',
        heroName
      )
    );
    return;
  }

  // If hero already in another slot, clear it first
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

// -------------------------------------------------------------
// Mobile touch drag–drop (manual builder)
// -------------------------------------------------------------
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

// -------------------------------------------------------------
// Firestore listen + save (manual builder)
// -------------------------------------------------------------
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
    // newest first so latest saved combo is #1
    const q = query(userCombosRef, orderBy('timestamp', 'desc'), limit(100));

    onSnapshot(
      q,
      (snap) => {
        savedCombosEl.innerHTML = '';
        noCombosMessage.classList.toggle('hidden', !snap.empty);
        userCombosData = [];

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

          // per-combo share button
          const shareBtn = document.createElement('button');
          shareBtn.className = 'share-combo-btn';
          shareBtn.title = 'Share this combo';
          shareBtn.textContent = '⇪';
          shareBtn.onclick = () => shareCombo(heroes);
          actions.appendChild(shareBtn);

          // delete button
          const delBtn = document.createElement('button');
          delBtn.className = 'remove-combo-btn';
          delBtn.textContent = 'X';
          delBtn.onclick = () =>
            showMessageBox(
              (translations[currentLanguage]?.messageConfirmRemoveCombo ||
                'Remove this combo?'),
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
  const t = translations[currentLanguage] || translations.en;

  if (currentCombo.includes(null)) {
    showMessageBox(
      t.messagePleaseDrag3Heroes ||
        'Please drag 3 heroes to form a complete combo before saving!'
    );
    return;
  }

  if (!isAuthReady || !db || !userId) {
    showMessageBox(
      t.messageAuthNotReady || 'Authentication not ready yet. Please wait.'
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
        t.messageComboAlreadySaved || 'This exact combo is already saved!'
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
      t.messageComboSavedSuccess || 'Combo saved successfully!'
    );

    currentCombo = [null, null, null];
    document
      .querySelectorAll('.combo-slot')
      .forEach((slot, idx) => updateComboSlotDisplay(slot, null, idx));
  } catch (e) {
    console.error('saveCombo error:', e);
    showMessageBox(
      (t.messageErrorSavingCombo || 'Error saving combo: ') + (e.message || e)
    );
  } finally {
    hideLoadingSpinner();
  }
}

// -------------------------------------------------------------
// Sharing helpers (manual builder)
// -------------------------------------------------------------
async function shareAllCombos() {
  const t = translations[currentLanguage] || translations.en;

  if (!userCombosData || userCombosData.length === 0) {
    showMessageBox(
      t.messageNoCombosToDownload ||
        'No saved combos to share yet. Save some first!'
    );
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
      // fall through to clipboard
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

// -------------------------------------------------------------
// Download all combos as image (manual builder)
// -------------------------------------------------------------
async function downloadCombosAsImage() {
  const t = translations[currentLanguage] || translations.en;
  showLoadingSpinner();
  try {
    if (!savedCombosEl || savedCombosEl.children.length === 0) {
      showMessageBox(
        t.messageNoCombosToDownload ||
          'No combos to download. Please save some combos first!'
      );
      return;
    }
    // hide small buttons for clean capture
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
      t.messageCombosDownloadedSuccess || 'Combos downloaded successfully!'
    );
  } catch (e) {
    console.error(e);
    showMessageBox(
      (t.messageErrorDownloadingCombos || 'Error downloading combos: ') +
        (e.message || e)
    );
  } finally {
    hideLoadingSpinner();
  }
}

// -------------------------------------------------------------
// Combo Generator: render heroes as cards, build top 5
// -------------------------------------------------------------
function renderGeneratorHeroes() {
  if (!generatorHeroesEl) return;
  generatorHeroesEl.innerHTML = '';

  const heroes = allHeroesData.filter((h) =>
    generatorSelectedSeasons.includes(h.season)
  );

  heroes.forEach((hero) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'hero-card generator-card';
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

    // highlight if already selected
    if (generatorSelectedHeroes.has(hero.name)) {
      card.classList.add('generator-card-selected');
    }

    card.addEventListener('click', () => {
      if (generatorSelectedHeroes.has(hero.name)) {
        generatorSelectedHeroes.delete(hero.name);
        card.classList.remove('generator-card-selected');
      } else {
        generatorSelectedHeroes.add(hero.name);
        card.classList.add('generator-card-selected');
      }
    });

    generatorHeroesEl.appendChild(card);
  });
}

function renderGeneratorResults(bestCombos) {
  generatorResultsEl.innerHTML = '';

  const selectedCount = generatorSelectedHeroes.size;

  // show header summary
  const summary = document.createElement('p');
  summary.className = 'text-sm text-slate-300 mb-2';
  summary.textContent = `You selected ${selectedCount} hero${
    selectedCount === 1 ? '' : 'es'
  }. Showing up to top 5 available combos.`;
  generatorResultsEl.appendChild(summary);

  for (let i = 0; i < 5; i++) {
    const rank = i + 1;
    const combo = bestCombos[i];

    const card = document.createElement('div');
    card.className = 'generated-combo-card';

    if (combo) {
      const number = document.createElement('span');
      number.className =
        'saved-combo-number flex-shrink-0 bg-amber-400 text-slate-900';
      number.textContent = rank;

      const slots = document.createElement('div');
      slots.className = 'saved-combo-slots';

      combo.heroes.forEach((name) => {
        const item = document.createElement('div');
        item.className = 'saved-combo-slot-item';
        item.innerHTML =
          `<img src="${getHeroImageUrl(name)}" alt="${name}" crossorigin="anonymous">` +
          `<span>${name}</span>`;
        slots.appendChild(item);
      });

      const scoreEl = document.createElement('div');
      scoreEl.className =
        'mt-3 md:mt-0 md:ml-4 text-sm font-semibold text-sky-300';
      scoreEl.textContent = `Score: ${combo.score}`;

      card.appendChild(number);
      card.appendChild(slots);
      card.appendChild(scoreEl);
    } else {
      // placeholder: no combo for this rank
      const placeholderText = document.createElement('p');
      placeholderText.className =
        'text-sm text-slate-300 text-center w-full';
      placeholderText.textContent =
        'No available combo for this slot yet – select more heroes or expand the database.';
      card.appendChild(placeholderText);
    }

    generatorResultsEl.appendChild(card);
  }
}

function generateBestCombos() {
  const t = translations[currentLanguage] || translations.en;

  const selectedHeroes = Array.from(generatorSelectedHeroes);
  if (selectedHeroes.length < 15) {
    showMessageBox(
      t.generatorNeedMoreHeroes ||
        'Please select at least 15 heroes to generate 5 combos.'
    );
    return;
  }

  const ownedSet = new Set(selectedHeroes);

  // Filter DB combos where the user owns all 3 heroes
  const eligibleCombos = comboScores.filter((c) =>
    c.heroes.every((h) => ownedSet.has(h))
  );

  // Sort by score desc
  eligibleCombos.sort((a, b) => (b.score || 0) - (a.score || 0));

  renderGeneratorResults(eligibleCombos);
}

// -------------------------------------------------------------
// Tabs + text content
// -------------------------------------------------------------
function switchToManual() {
  tabManualBtn.classList.add('tab-pill-active');
  tabManualBtn.classList.remove('tab-pill-inactive');
  tabGeneratorBtn.classList.remove('tab-pill-active');
  tabGeneratorBtn.classList.add('tab-pill-inactive');

  manualSection.classList.remove('hidden');
  generatorSection.classList.add('hidden');
}

function switchToGenerator() {
  tabGeneratorBtn.classList.add('tab-pill-active');
  tabGeneratorBtn.classList.remove('tab-pill-inactive');
  tabManualBtn.classList.remove('tab-pill-active');
  tabManualBtn.classList.add('tab-pill-inactive');

  manualSection.classList.add('hidden');
  generatorSection.classList.remove('hidden');
}

function wireUIActions() {
  // language
  languageSelect.addEventListener('change', (e) => {
    currentLanguage = e.target.value;
    updateTextContent();
  });

  // manual season filters
  document.getElementById('seasonFilters').addEventListener('change', (e) => {
    const val = e.target.value;
    if (!val) return;
    if (e.target.checked) {
      if (!selectedSeasons.includes(val)) selectedSeasons.push(val);
    } else {
      selectedSeasons = selectedSeasons.filter((s) => s !== val);
    }
    debouncedRenderManualHeroes();
  });

  // generator season filters
  generatorSeasonFilters.addEventListener('change', (e) => {
    const val = e.target.value;
    if (!val) return;
    if (e.target.checked) {
      if (!generatorSelectedSeasons.includes(val))
        generatorSelectedSeasons.push(val);
    } else {
      generatorSelectedSeasons = generatorSelectedSeasons.filter(
        (s) => s !== val
      );
    }
    renderGeneratorHeroes();
  });

  // manual buttons
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

  // tabs
  tabManualBtn.addEventListener('click', switchToManual);
  tabGeneratorBtn.addEventListener('click', switchToGenerator);

  // generator button
  generateCombosBtn.addEventListener('click', generateBestCombos);
}

function updateTextContent() {
  const t = translations[currentLanguage] || translations.en;

  const appTitleEl = document.getElementById('appTitle');
  if (appTitleEl) appTitleEl.textContent = t.appTitle;

  document.getElementById('filterBySeasonTitle').textContent =
    t.filterBySeasonTitle;
  document.getElementById('availableHeroesTitle').textContent =
    t.availableHeroesTitle;
  document.getElementById('createComboTitle').textContent = t.createComboTitle;
  document.getElementById('lastBestCombosTitle').textContent =
    t.lastBestCombosTitle;

  if (noCombosMessage) noCombosMessage.textContent = t.noCombosMessage;
  if (saveComboBtn) saveComboBtn.textContent = t.saveComboBtn;
  if (clearComboBtn) clearComboBtn.textContent = t.clearComboBtn;
  if (downloadCombosBtn) downloadCombosBtn.textContent = t.downloadCombosBtn;

  // refresh empty slots placeholder text
  document.querySelectorAll('.combo-slot').forEach((slot, idx) => {
    if (currentCombo[idx] === null) updateComboSlotDisplay(slot, null, idx);
  });
}

const debouncedRenderManualHeroes = debounce(() => renderAvailableHeroes(), 150);

// -------------------------------------------------------------
// Main init
// -------------------------------------------------------------
(async function main() {
  showLoadingSpinner();

  renderAvailableHeroes();
  renderGeneratorHeroes();
  initComboSlots();
  wireUIActions();
  updateTextContent();
  switchToManual();

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
    const t = translations[currentLanguage] || translations.en;
    showMessageBox(
      (t.messageFirebaseInitError || 'Firebase initialization error:') +
        ' ' +
        (err.message || err)
    );
  } finally {
    hideLoadingSpinner();
  }
})();
