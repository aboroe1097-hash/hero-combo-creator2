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
  /* keep the same hero objects used previously — truncated here in the snippet for brevity */
  // I will include a subset for brevity, but in your local copy paste the full array
  { name: "Jeanne d'Arc", season: "S0", imageUrl: "https://static.wixstatic.com/media/43ee96_d5f5b07c90924e6ab5b1d70e2667b693~mv2.png" },
  { name: "Isabella I", season: "S0", imageUrl: "https://static.wixstatic.com/media/43ee96_dcba45dd1c394074a0e23e3f780c6aee~mv2.png" },
  { name: "Alfred", season: "S1", imageUrl: "https://static.wixstatic.com/media/43ee96_e75a942dc1c64689b140f23d905b5ca0~mv2.png" },
  { name: "Genghis Khan", season: "S1", imageUrl: "https://static.wixstatic.com/media/43ee96_40f1c10ba0e04d4fa3e841f865cd206a~mv2.png" },
  { name: "Desert Storm", season: "S4", imageUrl: "https://i.ibb.co/vChW2BGG/Desert-Storm.png" },
  { name: "King Arthur", season: "S4", imageUrl: "https://i.ibb.co/4Ryx1F6P/King-Arthur.png" }
  // add the rest of heroes exactly as needed
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
