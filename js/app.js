// main app
import { translations as baseTranslations } from './translations.js';
import { initFirebase, ensureAnonymousAuth, getDb } from './firebase.js';

// keep a local combined translations object (allow future i18n expansion)
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

let currentLanguage = 'en';
let selectedSeasons = ['S0'];
let currentCombo = [null, null, null];

let db = null;
let userId = 'anonymous';
let isAuthReady = false;
let spinnerFallbackTimer = null;

// Data (copied from original file)
const allHeroesData = [
            // Season 0
            { name: "Jeanne d'Arc", season: "S0", imageUrl: "https://static.wixstatic.com/media/43ee96_d5f5b07c90924e6ab5b1d70e2667b693~mv2.png/v1/fill/w_99,h_99,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png" },
            { name: "Isabella I", season: "S0", imageUrl: "https://static.wixstatic.com/media/43ee96_dcba45dd1c394074a0e23e3f780c6aee~mv2.png/v1/fill/w_99,h_99,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png" },
            { name: "Jiguang Qi", season: "S0", imageUrl: "https://static.wixstatic.com/media/43ee96_3bb681424e034e9e8f0dea7d71c93390~mv2.png/v1/fill/w_99,h_99,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png" },
            { name: "Mary Tudor", season: "S0", imageUrl: "https://static.wixstatic.com/media/43ee96_7d24a8f5148b42c68e9e183ecdf1080d~mv2.png/v1/fill/w_99,h_99,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png" },
            { name: "Leonidas", season: "S0", imageUrl: "https://static.wixstatic.com/media/43ee96_f672d18c06904465a490ea4811cee798~mv2.png/v1/fill/w_99,h_99,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png" },
            { name: "The Boneless", season: "S0", imageUrl: "https://static.wixstatic.com/media/43ee96_5fec4c7d62314acfb90ea624dedd08c6~mv2.png/v1/fill/w_99,h_99,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png" },
            { name: "Demon Spear", season: "S0", imageUrl: "https://static.wixstatic.com/media/43ee96_39ffb285fd524cd1b7c27057b0fe4f44~mv2.png/v1/fill/w_99,h_99,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png" },
            { name: "Kublai", season: "S0", imageUrl: "https://static.wixstatic.com/media/43ee96_19f2c6dda1b04b72942f1f691efd63b2~mv2.png/v1/fill/w_99,h_99,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png" },
            { name: "The Heroine", season: "S0", imageUrl: "https://static.wixstatic.com/media/43ee96_80bd949738da42cc88525fd5d6dc1f81~mv2.png/v1/fill/w_99,h_99,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png" },
            { name: "Queen Anne", season: "S0", imageUrl: "https://static.wixstatic.com/media/43ee96_4a70ebf4f01c444f9e238861826c0b90~mv2.png/v1/fill/w_99,h_99,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png" },
            { name: "North's Rage", season: "S0", imageUrl: "https://static.wixstatic.com/media/43ee96_582201a2a5e14a29a9c186393dd0bb06~mv2.png/v1/fill/w_99,h_99,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png" },
            { name: "William Wallace", season: "S0", imageUrl: "https://static.wixstatic.com/media/43ee96_860c9a1a59214245b3d65d0f1fd816de~mv2.png/v1/fill/w_99,h_99,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png" },
            { name: "Yukimura Sanada", season: "S0", imageUrl: "https://static.wixstatic.com/media/43ee96_41cdaf2c39b44127b0c9ede9da2f70b7~mv2.png/v1/fill/w_99,h_99,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png" },
            { name: "Heaven's Justice", season: "S0", imageUrl: "https://static.wixstatic.com/media/43ee96_c81fb50a85d14f63b0aee9977c476c6c~mv2.png/v1/fill/w_99,h_99,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png" },
            // Season 1
            { name: "Alfred", season: "S1", imageUrl: "https://static.wixstatic.com/media/43ee96_e75a942dc1c64689b140f23d905b5ca0~mv2.png/v1/fill/w_99,h_99,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png" },
            { name: "Cao Cao", season: "S1", imageUrl: "https://static.wixstatic.com/media/43ee96_3998355c7cae4b70a89000ee66ad8e3f~mv2.png/v1/fill/w_126,h_126,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png" },
            { name: "Charles the Great", season: "S1", imageUrl: "https://static.wixstatic.com/media/43ee96_e95b962e46204b6badbd6e63e1307582~mv2.png/v1/fill/w_99,h_99,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png" },
            { name: "Black Prince", season: "S1", imageUrl: "https://static.wixstatic.com/media/43ee96_29a333b02497463f81d329056996b8a3~mv2.png/v1/fill/w_99,h_99,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png" },
            { name: "Lionheart", season: "S1", imageUrl: "https://static.wixstatic.com/media/43ee96_ecf64b68a8f64ad2bd159f86f5be179c~mv2.png/v1/fill/w_99,h_99,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png" },
            { name: "Al Fatih", season: "S1", imageUrl: "https://static.wixstatic.com/media/43ee96_f834a1ef8d2d4de5bba80ab40e531a6f~mv2.png/v1/fill/w_99,h_99,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png" },
            { name: "Edward the Confessor", season: "S1", imageUrl: "https://static.wixstatic.com/media/43ee96_51538af01a9f4ec789127837e62dccfa~mv2.png/v1/fill/w_99,h_99,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png" },
            { name: "Constantine the Great", season: "S1", imageUrl: "https://static.wixstatic.com/media/43ee96_b738599c5a0b46deb6a4abf7273f9268~mv2.png/v1/fill/w_99,h_99,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png" },
            { name: "Genghis Khan", season: "S1", imageUrl: "https://static.wixstatic.com/media/43ee96_40f1c10ba0e04d4fa3e841f865cd206a~mv2.png/v1/fill/w_99,h_99,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png" },
            { name: "William the Conqueror", season: "S1", imageUrl: "https://static.wixstatic.com/media/43ee96_517ee1432ce04974be78d3532e48afb3~mv2.png/v1/fill/w_101,h_101,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png" },
            // Season 2
            { name: "Inquisitor", season: "S2", imageUrl: "https://static.wixstatic.com/media/43ee96_5e9612fc176442b78c1fa6766b87473c~mv2.png/v1/fill/w_101,h_101,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png" },
            { name: "BeastQueen", season: "S2", imageUrl: "https://static.wixstatic.com/media/43ee96_6883135290314469a0daee804dd03692~mv2.png/v1/fill/w_101,h_101,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png" },
            { name: "Jade", season: "S2", imageUrl: "https://static.wixstatic.com/media/43ee96_61729052c05240b4b7cf34324f8ed870~mv2.png/v1/fill/w_101,h_101,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png" },
            { name: "Immortal", season: "S2", imageUrl: "https://static.wixstatic.com/media/43ee96_8c4e699dedc341a7a86ae4b47d3cce71~mv2.png/v1/fill/w_101,h_101,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png" },
            { name: "Peace Bringer", season: "S2", imageUrl: "https://static.wixstatic.com/media/43ee96_cfea192f7ad64a13be3fa40c516a8bce~mv2.png/v1/fill/w_101,h_101,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png" },
            { name: "Witch Hunter", season: "S2", imageUrl: "https://static.wixstatic.com/media/43ee96_82ced5fbba3f489fbb04ceb4fa7cd19c~mv2.png/v1/fill/w_101,h_101,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png" },
            { name: "Ramses II", season: "S2", imageUrl: "https://static.wixstatic.com/media/43ee96_2b28a06a2a1544339940724f29bf4b9d~mv2.png/v1/fill/w_101,h_101,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png" },
            { name: "Octavius", season: "S2", imageUrl: "https://static.wixstatic.com/media/43ee96_eeb99bc718ad488b961bb643d4a6653f~mv2.png/v1/fill/w_101,h_101,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png" },
            // Season 3
            { name: "War Lord", season: "S3", imageUrl: "https://static.wixstatic.com/media/43ee96_bbbe6a8669d74ddea17b73af5e3cf05c~mv2.png/v1/fill/w_101,h_101,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png" },
            { name: "Jane", season: "S3", imageUrl: "https://static.wixstatic.com/media/43ee96_d36c3be1d2d64747a59700bf41b8890d~mv2.png/v1/fill/w_101,h_101,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png" },
            { name: "Sky Breaker", season: "S3", imageUrl: "https://static.wixstatic.com/media/43ee96_cacde74500864a0d916746fe0945c970~mv2.png/v1/fill/w_101,h_101,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png" },
            { name: "Rokuboshuten", season: "S3", imageUrl: "https://static.wixstatic.com/media/43ee96_eaf3463bf3654d0e90adb41a1cb5ad4c~mv2.png/v1/fill/w_101,h_101,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png" },
            { name: "Bleeding Steed", season: "S3", imageUrl: "https://static.wixstatic.com/media/43ee96_9256fc0a80284c1ab285554dbf33a4b3~mv2.png/v1/fill/w_101,h_101,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png" },
            { name: "Rozen Blade", season: "S3", imageUrl: "https://static.wixstatic.com/media/43ee96_42b02c160ac849dca0dd7e4a6b472582~mv2.png/v1/fill/w_101,h_101,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png" },
            { name: "Celopatrra VII", season: "S3", imageUrl: "https://static.wixstatic.com/media/43ee96_7109811bb55a47749090edcc8df9e7c6~mv2.png/v1/fill/w_101,h_101,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png" },
            { name: "Ceasar", season: "S3", imageUrl: "https://static.wixstatic.com/media/43ee96_5cf26138c5174d4587fc025cd5fe399a~mv2.png/v1/fill/w_101,h_101,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/GettyImages-591216789.png" },
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

function showLoadingSpinner() {
  loadingSpinner.classList.remove('hidden');
  loadingSpinner.setAttribute('aria-hidden', 'false');
  // fallback: if the spinner is still visible after 10 seconds, hide and show a notice
  clearTimeout(spinnerFallbackTimer);
  spinnerFallbackTimer = setTimeout(() => {
    if (!isAuthReady) {
      hideLoadingSpinner();
      showMessageBox("Authentication is taking longer than expected. The app is usable offline; saved combos require network to sync.");
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
    messageBoxOkBtn.textContent = translations[currentLanguage].messageBoxConfirm || "Confirm";
    messageBoxOkBtn.onclick = () => { messageBox.classList.add('hidden'); onConfirm(); };
    messageBoxCancelBtn.classList.remove('hidden');
    messageBoxCancelBtn.textContent = translations[currentLanguage].messageBoxCancel || "Cancel";
    messageBoxCancelBtn.onclick = () => messageBox.classList.add('hidden');
  } else {
    messageBoxOkBtn.textContent = translations[currentLanguage].messageBoxOk || "OK";
    messageBoxOkBtn.onclick = () => { messageBox.classList.add('hidden'); };
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
  const hero = allHeroesData.find(h => h.name === heroName);
  if (hero && hero.imageUrl) return hero.imageUrl;
  const encoded = encodeURIComponent(heroName.replace(/\s/g, '+'));
  return `https://placehold.co/128x128/374151/e2e8f0?text=${encoded}`;
}

function renderAvailableHeroes() {
  availableHeroesEl.innerHTML = '';
  const chosen = allHeroesData.filter(h => selectedSeasons.includes(h.season));
  chosen.forEach(hero => {
    const card = document.createElement('div');
    card.className = 'hero-card';
    card.draggable = true;
    card.dataset.heroName = hero.name;
    card.innerHTML = `<img src="${getHeroImageUrl(hero.name)}" alt="${hero.name}" loading="lazy" crossorigin="anonymous"><span class="mt-1">${hero.name}</span>`;
    availableHeroesEl.appendChild(card);
  });
}

function updateComboSlotDisplay(slot, name, idx) {
  if (name) {
    slot.innerHTML = `<img src="${getHeroImageUrl(name)}" alt="${name}" draggable="true" data-hero-name="${name}" crossorigin="anonymous"><span class="bottom-2 text-white bg-black bg-opacity-50 px-2 py-1 rounded-md text-xs w-full overflow-hidden text-ellipsis whitespace-nowrap">${name}</span>`;
    slot.classList.add('relative', 'p-0');
  } else {
    slot.innerHTML = `<div class="flex flex-col items-center justify-center h-full w-full"><span class="text-6xl font-bold text-blue-400">+</span><span class="text-sm text-gray-400 mt-2">${translations[currentLanguage]?.dragHeroHere || 'Drag Hero Here'}</span></div>`;
    slot.classList.remove('relative', 'p-0');
  }
  updateSaveButtonState();
}

function updateSaveButtonState() {
  saveComboBtn.disabled = !isAuthReady || currentCombo.includes(null);
}

function initComboSlots() {
  document.querySelectorAll('.combo-slot').forEach((slot) => {
    const idx = parseInt(slot.dataset.slotIndex);
    updateComboSlotDisplay(slot, null, idx);

    slot.addEventListener('dragover', (e) => { e.preventDefault(); slot.classList.add('drag-over'); });
    slot.addEventListener('dragleave', () => slot.classList.remove('drag-over'));
    slot.addEventListener('drop', (e) => {
      e.preventDefault();
      slot.classList.remove('drag-over');
      const name = e.dataTransfer.getData('text/plain');
      if (!name) return;
      const idx = parseInt(slot.dataset.slotIndex);
      if (currentCombo.includes(name) && currentCombo[idx] !== name) {
        showMessageBox((translations[currentLanguage]?.messageHeroAlreadyInSlot || 'Already in slot').replace("{heroName}", name));
        return;
      }
      const oldIdx = currentCombo.indexOf(name);
      if (oldIdx !== -1) {
        currentCombo[oldIdx] = null;
        const oldSlot = document.querySelector(`[data-slot-index="${oldIdx}"]`);
        if (oldSlot) updateComboSlotDisplay(oldSlot, null, oldIdx);
      }
      currentCombo[idx] = name;
      updateComboSlotDisplay(slot, name, idx);
    });
  });

  // global dragstart/dragend
  document.addEventListener('dragstart', (e) => {
    const target = e.target.closest('.hero-card') || e.target.closest('.combo-slot img');
    if (target) {
      const name = target.dataset.heroName || target.dataset['heroName'];
      if (name) e.dataTransfer.setData('text/plain', name);
      if (target.classList.contains('hero-card')) target.classList.add('opacity-50');
    }
  });
  document.addEventListener('dragend', (e) => {
    const c = e.target.closest('.hero-card');
    if (c) c.classList.remove('opacity-50');
  });
}

async function setupFirestoreListener() {
  try {
    const _db = getDb();
    if (!_db) return;
    db = _db;
    // real-time listener using modular Firestore functions (import inside to avoid large top-level imports)
    const { collection, query, orderBy, onSnapshot, deleteDoc, doc } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js");

    const q = query(collection(db, `users/${userId}/bestCombos`), orderBy("timestamp", "asc"));
    onSnapshot(q, (snap) => {
      savedCombosEl.innerHTML = '';
      noCombosMessage.classList.toggle('hidden', !snap.empty);
      let count = 1;
      snap.forEach(d => {
        const data = d.data();
        const row = document.createElement('div');
        row.className = 'saved-combo-display';
        row.innerHTML = `<span class="saved-combo-number">${count}</span><div class="saved-combo-slots"></div>`;
        data.heroes.forEach(name => {
          const item = document.createElement('div');
          item.className = 'saved-combo-slot-item';
          item.innerHTML = `<img src="${getHeroImageUrl(name)}" alt="${name}" crossorigin="anonymous"><span>${name}</span>`;
          row.querySelector('.saved-combo-slots').appendChild(item);
        });

        const btn = document.createElement('button');
        btn.className = 'remove-combo-btn';
        btn.textContent = 'X';
        btn.onclick = () => showMessageBox(translations[currentLanguage]?.messageConfirmRemoveCombo || 'Confirm remove?', async () => {
          showLoadingSpinner();
          try {
            await deleteDoc(doc(db, `users/${userId}/bestCombos`, d.id));
          } catch (err) {
            console.error("Delete error", err);
            showMessageBox((translations[currentLanguage]?.messageErrorRemovingCombo || 'Error removing') + ' ' + (err.message || err));
          } finally {
            hideLoadingSpinner();
          }
        });

        row.appendChild(btn);
        savedCombosEl.appendChild(row);
        count++;
      });
    }, (err) => {
      console.error("Snapshot listener error:", err);
      hideLoadingSpinner();
      showMessageBox((translations[currentLanguage]?.messageErrorLoadingCombos || 'Error loading combos') + ' ' + (err.message || err));
    });
  } catch (e) {
    console.error("setupFirestoreListener error", e);
  }
}

async function saveCombo() {
  if (currentCombo.includes(null)) {
    showMessageBox(translations[currentLanguage]?.messagePleaseDrag3Heroes || 'Please drag 3 heroes');
    return;
  }
  if (!isAuthReady) { showMessageBox(translations[currentLanguage]?.messageAuthNotReady || 'Auth not ready'); return; }

  showLoadingSpinner();
  try {
    const { collection, getDocs, addDoc, serverTimestamp } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js");
    const ref = collection(db, `users/${userId}/bestCombos`);
    const snap = await getDocs(ref);
    const existing = snap.docs.map(d => [...d.data().heroes].sort().join(','));
    if (existing.includes([...currentCombo].sort().join(','))) {
      showMessageBox(translations[currentLanguage]?.messageComboAlreadySaved || 'Already saved');
    } else {
      await addDoc(ref, { heroes: currentCombo, timestamp: serverTimestamp() });
      showMessageBox(translations[currentLanguage]?.messageComboSavedSuccess || 'Saved!');
      // clear current combo after save (optional)
      currentCombo = [null, null, null];
      document.querySelectorAll('.combo-slot').forEach((s, i) => updateComboSlotDisplay(s, null, i));
    }
  } catch (e) {
    console.error(e);
    showMessageBox((translations[currentLanguage]?.messageErrorSavingCombo || 'Error saving') + ' ' + (e.message || e));
  } finally {
    hideLoadingSpinner();
  }
}

async function downloadCombosAsImage() {
  const t = translations[currentLanguage];
  showLoadingSpinner();
  try {
    if (!savedCombosEl || savedCombosEl.children.length === 0) {
      showMessageBox(t?.messageNoCombosToDownload || 'No combos to download');
      return;
    }
    // temporarily hide remove buttons for clean capture
    const buttons = document.querySelectorAll('.remove-combo-btn');
    buttons.forEach(b => b.style.display = 'none');

    const canvas = await html2canvas(savedCombosEl, { scale: 2, useCORS: true, allowTaint: true, logging: false });
    buttons.forEach(b => b.style.display = '');

    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = 'hero_combos.png';
    link.click();
    showMessageBox(t?.messageCombosDownloadedSuccess || 'Downloaded!');
  } catch (e) {
    console.error(e);
    showMessageBox((t?.messageErrorDownloadingCombos || 'Download error') + ' ' + (e.message || e));
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
    if (e.target.checked) selectedSeasons.push(val);
    else selectedSeasons = selectedSeasons.filter(s => s !== val);
    debouncedRender();
  });

  clearComboBtn.addEventListener('click', () => {
    currentCombo = [null, null, null];
    document.querySelectorAll('.combo-slot').forEach((s, i) => updateComboSlotDisplay(s, null, i));
  });

  saveComboBtn.addEventListener('click', saveCombo);
  downloadCombosBtn.addEventListener('click', downloadCombosAsImage);

  // delegate dragging from hero cards
  availableHeroesEl.addEventListener('dragstart', (e) => {
    const card = e.target.closest('.hero-card');
    if (!card) return;
    const name = card.dataset.heroName;
    if (name) e.dataTransfer.setData('text/plain', name);
    card.classList.add('opacity-50');
  });
  availableHeroesEl.addEventListener('dragend', (e) => {
    const card = e.target.closest('.hero-card');
    if (card) card.classList.remove('opacity-50');
  });
}

function updateTextContent() {
  const t = translations[currentLanguage] || translations['en'];
  document.getElementById('appTitle').textContent = t.appTitle;
  document.getElementById('filterBySeasonTitle').textContent = t.filterBySeasonTitle;
  document.getElementById('availableHeroesTitle').textContent = t.availableHeroesTitle;
  document.getElementById('createComboTitle').textContent = t.createComboTitle;
  document.getElementById('lastBestCombosTitle').textContent = t.lastBestCombosTitle;
  if (noCombosMessage) noCombosMessage.textContent = t.noCombosMessage;
  saveComboBtn.textContent = t.saveComboBtn;
  clearComboBtn.textContent = t.clearComboBtn;
  downloadCombosBtn.textContent = t.downloadCombosBtn;

  document.querySelectorAll('.combo-slot').forEach((slot, idx) => {
    if (currentCombo[idx] === null) updateComboSlotDisplay(slot, null, idx);
  });
}

const debouncedRender = debounce(() => renderAvailableHeroes(), 150);

// main init
(async function main() {
  showLoadingSpinner();

  // render UI skeleton fast
  renderAvailableHeroes();
  initComboSlots();
  wireUIActions();
  updateTextContent();

  try {
    const fb = initFirebase();
    // ensure auth - will sign in anonymously if needed
    const user = await ensureAnonymousAuth();
    isAuthReady = true;
    userId = user.uid || 'anonymous';
    db = getDb();

    // now enable the save button if applicable
    updateSaveButtonState();

    // setup realtime listener
    setupFirestoreListener();
  } catch (err) {
    console.error("Firebase/auth init error:", err);
    // show a message but allow UI to be used (it will work locally; saving requires network)
    showMessageBox((translations[currentLanguage]?.messageFirebaseInitError || 'Firebase init error') + ' ' + (err.message || err));
  } finally {
    hideLoadingSpinner();
  }
})();

