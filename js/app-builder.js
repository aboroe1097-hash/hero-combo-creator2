import { cssToken, escapeHtml } from './utils.js';
// js/app-builder.js
import { translations } from './translations.js';
let builderFirestoreUnsub = null;
import { allHeroesData } from './heroes-data.js';
import { importFirestore } from './firebase-sdk.js';
import { renderCountersToggle, getCounterCount } from './combo-counters.js';
import {
  currentLanguage,
  heroMatchesFilters,
  seasonColors,
  paidBadgeHtml,
  getTroopColorClass,
  getLocalizedTroop,
  getHeroImageUrl,
  getComboRankInfo,
  getCounterLabels,
  selectedSeasons,
  selectedStates,
  selectedTypes,
  currentCombo,
  getSourceCreditText,
  availableHeroesEl,
  loadingSpinner,
  savedCombosEl,
  noCombosMessage,
  getUserId,
  isHeroAlreadyInCombo,
  pushUndoAction,
  savedCombosCache,
} from './state.js';
import { callUi } from './ui-bridge.js';
import { HERO_DRAG_MIME } from './constants.js';

let db = null;
let touchDragHero = null;
let touchDragGhost = null;
let keyboardSelectedHero = null;

function getKnownHero(name) {
  return allHeroesData.find(hero => hero.name === name) || null;
}

function announceManualCombo(message) {
  let live = document.getElementById('manualComboLiveRegion');
  if (!live) {
    live = document.createElement('div');
    live.id = 'manualComboLiveRegion';
    live.className = 'sr-only';
    live.setAttribute('aria-live', 'polite');
    live.setAttribute('aria-atomic', 'true');
    document.body.appendChild(live);
  }
  live.textContent = message;
}

function restoreComboSlot(idx, heroName) {
  currentCombo[idx] = heroName || null;
  const slot = document.querySelector(`.combo-slot[data-slot-index="${idx}"]`);
  if (slot) updateComboSlotDisplay(slot, currentCombo[idx], idx);
  updateManualComboScore();
  announceManualCombo(
    currentCombo[idx]
      ? `${currentCombo[idx]} restored to combo slot ${idx + 1}.`
      : `Combo slot ${idx + 1} restored to empty.`
  );
}

export function placeHeroInSlot(slot, heroName, idx) {
  if (!slot || !heroName || Number.isNaN(idx)) return;
  if (isHeroAlreadyInCombo(heroName, idx)) {
    const t = translations[currentLanguage] || translations.en;
    callUi('showAboModal', t.manualNoDuplicateHero || 'This hero is already used in your current combo.');
    announceManualCombo(`${heroName} is already in this combo.`);
    return;
  }
  const previousHero = currentCombo[idx] || null;
  if (previousHero && previousHero !== heroName) {
    pushUndoAction({
      label: `Combo slot ${idx + 1}`,
      message: `Combo slot ${idx + 1} changed.`,
      undo: () => restoreComboSlot(idx, previousHero),
    });
  }
  currentCombo[idx] = heroName;
  updateComboSlotDisplay(slot, heroName, idx);
  updateManualComboScore();
  announceManualCombo(`${heroName} placed in combo slot ${idx + 1}.`);
}

function createTouchGhost(card, touch) {
  if (!card || !touch) return;
  if (touchDragGhost && touchDragGhost.parentNode) {
    touchDragGhost.parentNode.removeChild(touchDragGhost);
  }
  const rect = card.getBoundingClientRect();
  const ghost = card.cloneNode(true);
  
  ghost.style.position = 'fixed';
  ghost.style.margin = '0';
  ghost.style.left = `${rect.left}px`;
  ghost.style.top  = `${rect.top}px`;
  ghost.style.width  = `${rect.width}px`;
  ghost.style.height = `${rect.height}px`;
  ghost.style.minWidth  = `${rect.width}px`;
  ghost.style.maxWidth  = `${rect.width}px`;
  ghost.style.boxSizing = 'border-box';
  ghost.style.opacity = '0.9';
  ghost.style.pointerEvents = 'none';
  ghost.style.zIndex = '9999';
  ghost.style.transform = 'scale(1.05)';
  ghost.style.boxShadow = '0 10px 25px rgba(0,0,0,0.6)';
  
  document.body.appendChild(ghost);
  touchDragGhost = ghost;
  touchDragGhost._dragW = rect.width;
  touchDragGhost._dragH = rect.height;
}

export function setupTouchDragForManualBuilder() {
  document.addEventListener('touchmove', (e) => {
    if (!touchDragHero || !touchDragGhost) return;
    const touch = e.touches && e.touches[0];
    if (!touch) return;
    e.preventDefault();
    const w = touchDragGhost._dragW || 80;
    const h = touchDragGhost._dragH || 80;
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

    placeHeroInSlot(slot, touchDragHero, idx);
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

export function renderAvailableHeroes() {
  if (!availableHeroesEl) return;
  const t = translations[currentLanguage] || translations.en;
  const searchQuery = (document.getElementById('manualHeroSearch')?.value || '').trim().toLowerCase();
  availableHeroesEl.innerHTML = '';
  allHeroesData
    .filter(h => heroMatchesFilters(h, selectedSeasons, selectedStates, selectedTypes))
    .filter(h => !searchQuery || h.name.toLowerCase().includes(searchQuery))
    .forEach(hero => {
      const card = document.createElement('div');
      card.className = `hero-card relative season-${cssToken(hero.season)}`;
      card.draggable = true;
      card.dataset.heroName = hero.name;
      card.tabIndex = 0;
      card.setAttribute('role', 'button');
      card.setAttribute('aria-label', `Select ${hero.name} for a combo slot`);

      const tagColor = seasonColors[hero.season] || '#f97316';
      const originTag = hero.releaseSeason && hero.releaseSeason !== hero.season
        ? `<span class="hero-origin-tag" title="Original release ${escapeHtml(hero.releaseSeason)}">${escapeHtml(hero.releaseSeason)}</span>`
        : '';
      card.innerHTML = `
        <div class="hero-card-badges">
          <span class="hero-tag" style="background:${escapeHtml(tagColor)}">${escapeHtml(hero.season)}</span>
          <span class="hero-card-badge-spacer"></span>
          ${hero.State === 'Paid' ? paidBadgeHtml('card') : ''}
        </div>
        ${originTag}
        
        <div class="info-btn lg:hidden absolute top-1 right-1 w-6 h-6 bg-slate-900/90 border border-slate-600 rounded-full flex items-center justify-center z-20 text-sky-400 shadow-md cursor-pointer hover:bg-slate-800">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-3.5 h-3.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
            </svg>
        </div>

        <span class="hero-portrait-frame">
          <img src="${escapeHtml(hero.imageUrl || getHeroImageUrl(hero.name))}" alt="${escapeHtml(hero.name)}" loading="lazy" draggable="false">
        </span>
        <div class="hero-card-copy">
            <span class="hero-card-name">${escapeHtml(hero.name)}</span>
            <span class="hero-card-type ${escapeHtml(getTroopColorClass(hero.Type))}">${escapeHtml(getLocalizedTroop(hero.Type))}</span>
        </div>
      `;

      card.addEventListener('dragstart', e => {
        callUi('forceHideHeroTooltip');
        e.dataTransfer.clearData();
        e.dataTransfer.effectAllowed = 'copy';
        e.dataTransfer.setData(HERO_DRAG_MIME, hero.name);
        e.dataTransfer.setData('text/plain', hero.name);
      });

      card.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        keyboardSelectedHero = hero.name;
        announceManualCombo(`${hero.name} selected. Focus a combo slot and press Enter to place.`);
        document.querySelector('.combo-slot')?.focus();
      });

      card.addEventListener('touchstart', (e) => {
        callUi('forceHideHeroTooltip');
        const touch = e.touches && e.touches[0];
        touchDragHero = hero.name;
        createTouchGhost(card, touch);
      }, { passive: true });

      card.addEventListener('pointerenter', (e) => {
        if (e.pointerType === 'touch') return; 
        callUi('showHeroTooltip', e, hero.name);
      });
      card.addEventListener('pointermove', (e) => {
        if (e.pointerType === 'touch') return;
        callUi('moveHeroTooltip', e);
      });
      card.addEventListener('pointerleave', (e) => {
        if (e.pointerType === 'touch') return;
        callUi('hideHeroTooltip');
      });

      const infoBtn = card.querySelector('.info-btn');
      if (infoBtn) {
        infoBtn.addEventListener('click', (e) => {
          e.stopPropagation(); 
          e.preventDefault();
          callUi('showHeroTooltip', e, hero.name);
        });
        infoBtn.addEventListener('touchstart', (e) => {
          e.stopPropagation(); 
        }, { passive: false });
      }

      card.style.animationDelay = (availableHeroesEl.children.length * 0.025) + 's';
      availableHeroesEl.appendChild(card);
    });

  let sourceNote = document.getElementById('heroesSourceNote1');
  if (!sourceNote) {
      sourceNote = document.createElement('div');
      sourceNote.id = 'heroesSourceNote1';
      sourceNote.className = "col-span-full mt-8 text-center text-[10px] sm:text-xs text-slate-500 uppercase tracking-widest border-t border-slate-800/50 pt-4 w-full";
      availableHeroesEl.parentNode.appendChild(sourceNote);
  }
  sourceNote.textContent = getSourceCreditText();
  
  const countEl = document.getElementById('manualHeroCount');
  if (countEl) {
    const count = availableHeroesEl.querySelectorAll('.hero-card').length;
    const label = count === 1 ? (t.heroCountOne || '{n} hero') : (t.heroCountMany || '{n} heroes');
    countEl.textContent = label.replace('{n}', count);
  }
}

export function updateComboSlotDisplay(slot, name, idx) {
  const t = translations[currentLanguage] || translations.en;
  const hero = name ? getKnownHero(name) : null;
  if (name && !hero) {
    currentCombo[idx] = null;
    name = null;
  }
  if (name) {
    slot.dataset.heroName = name;
    slot.setAttribute('aria-label', `Combo slot ${idx + 1}: ${name}. Press Delete to clear.`);
    slot.innerHTML = `
      <img src="${escapeHtml(hero.imageUrl || getHeroImageUrl(name))}" alt="${escapeHtml(name)}" crossorigin="anonymous" loading="lazy" draggable="false">
      <span class="absolute bottom-0 left-0 right-0 text-white bg-black/70 px-1 py-1 text-[10px] w-full truncate text-center font-bold">
        ${escapeHtml(name)}
      </span>`;
    slot.classList.add('relative', 'p-0');
  } else {
    delete slot.dataset.heroName;
    slot.setAttribute('aria-label', `Combo slot ${idx + 1}: empty. Select a hero, then press Enter here to place.`);
    slot.innerHTML = `
      <div class="combo-slot-placeholder h-full flex flex-col items-center justify-center gap-1">
        <span class="font-bold text-blue-400/60 text-3xl leading-none">+</span>
        <span data-i18n="dragHeroHere" class="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">
          ${escapeHtml(t.dragHeroHere)}
        </span>
      </div>`;
    slot.classList.remove('relative', 'p-0');
  }
}

export function updateManualComboScore() {
  const t = translations[currentLanguage] || translations.en;
  const bar = document.getElementById('comboFooterBar');
  if (!bar) return;

  let scoreBox = document.getElementById('manualComboScoreBox');
  if (!scoreBox) {
    scoreBox = document.createElement('div');
    scoreBox.id = 'manualComboScoreBox';
    scoreBox.className = 'mt-3 gen-score-panel manual-combo-scorebox hidden';
    scoreBox.setAttribute('role', 'status');
    scoreBox.setAttribute('aria-live', 'polite');
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
  const counterCount = getCounterCount(currentCombo);
  scoreBox.classList.remove('hidden');

  if (!info && !counterCount) {
    scoreBox.className = 'mt-3 text-xs sm:text-sm text-sky-300 text-center';
    scoreBox.textContent = t.manualComboNotRanked || 'This combo is not in the ranked database.';
    announceManualCombo(scoreBox.textContent);
    return;
  }

  scoreBox.className = 'mt-3 gen-score-panel manual-combo-scorebox';
  const label = t.generatorScoreLabel || 'Score:';
  const scoreHtml = info
    ? `<div class="gen-score-main">
        <span class="text-[10px] uppercase tracking-widest text-slate-400">${escapeHtml(label)}</span>
        <span class="text-lg font-black text-sky-400">${info.score}</span>
        <span class="text-slate-400 text-[11px] sm:text-xs">(#${info.rank})</span>
      </div>`
    : '';
  scoreBox.innerHTML = `${scoreHtml}${renderCountersToggle(currentCombo, getComboRankInfo, getHeroImageUrl, getCounterLabels())}`;
  if (info) announceManualCombo(`Combo score ${info.score}, rank ${info.rank}.`);
}

export function setupKeyboardComboSlots() {
  document.querySelectorAll('.combo-slot').forEach((slot, idx) => {
    if (slot.dataset.keyboardWired === '1') return;
    slot.dataset.keyboardWired = '1';
    slot.tabIndex = 0;
    slot.setAttribute('role', 'button');
    slot.addEventListener('keydown', (e) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        currentCombo[idx] = null;
        updateComboSlotDisplay(slot, null, idx);
        updateManualComboScore();
        announceManualCombo(`Combo slot ${idx + 1} cleared.`);
        return;
      }
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      if (keyboardSelectedHero) {
        placeHeroInSlot(slot, keyboardSelectedHero, idx);
        return;
      }
      announceManualCombo('Select a hero card first, then focus this slot to place it.');
    });
  });
}

export async function saveCombo() {
  const t = translations[currentLanguage] || translations.en;
  if (currentCombo.includes(null)) {
    callUi('showAboModal', t.messagePleaseDrag3Heroes);
    return;
  }
  loadingSpinner.classList.remove('hidden');
  try {
    const { collection, addDoc, serverTimestamp } = await importFirestore();
    await addDoc(collection(db, `users/${getUserId()}/bestCombos`), {
      heroes: [...currentCombo],
      timestamp: serverTimestamp()
    });
    // Reset combo array elements in place
    currentCombo[0] = null;
    currentCombo[1] = null;
    currentCombo[2] = null;
    document.querySelectorAll('.combo-slot')
      .forEach((slot, i) => updateComboSlotDisplay(slot, null, i));
    updateManualComboScore();
    if (typeof window.showToast === 'function') window.showToast(t.toastComboSaved || t.messageComboSavedSuccess || 'Combo saved!', 'success');
  } catch (err) {
    console.error(err);
    if (typeof window.showToast === 'function') window.showToast(t.toastComboSaveFailed || 'Could not save combo', 'error');
  } finally {
    loadingSpinner.classList.add('hidden');
  }
}

export async function setupFirestoreListener() {
  const { getDb } = await import('./firebase.js');
  const _db = getDb();
  const userId = getUserId();
  if (!_db || !userId) return;
  db = _db;

  const { collection, query, orderBy, limit, onSnapshot, deleteDoc, doc } = await importFirestore();

  const q = query(
    collection(db, `users/${userId}/bestCombos`),
    orderBy('timestamp', 'desc'),
    limit(100)
  );

  if (builderFirestoreUnsub) builderFirestoreUnsub();
  builderFirestoreUnsub = onSnapshot(q, snap => {
    savedCombosCache.length = 0;
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
          <img src="${escapeHtml(getHeroImageUrl(name))}" alt="${escapeHtml(name)}" loading="lazy">
          <span>${escapeHtml(name)}</span>
        `;
        slots.appendChild(item);
      });

      const rankInfo = getComboRankInfo(heroes);
      const counterCount = getCounterCount(heroes);
      if (rankInfo || counterCount) {
        const t = translations[currentLanguage] || translations.en;
        const label = t.generatorScoreLabel || 'Score:';
        const scoreBox = document.createElement('div');
        scoreBox.className = 'gen-score-panel saved-combo-scorebox';
        const scoreHtml = rankInfo
          ? `<div class="gen-score-main">
              <span class="text-[10px] uppercase tracking-widest text-slate-400">${escapeHtml(label)}</span>
              <span class="text-lg font-black text-sky-400">${rankInfo.score}</span>
            </div>`
          : '';
        scoreBox.innerHTML = `${scoreHtml}${renderCountersToggle(heroes, getComboRankInfo, getHeroImageUrl, getCounterLabels())}`;
        row.appendChild(scoreBox);
      }

      const delBtn = document.createElement('button');
      delBtn.className = 'remove-combo-btn';
      delBtn.textContent = 'X';
      delBtn.onclick = () =>
        callUi(
          'showAboModal',
          translations[currentLanguage].messageConfirmRemoveCombo,
          async () => {
            pushUndoAction({
              label: 'Saved combo',
              undo: async () => {
                const { collection, addDoc, serverTimestamp } = await importFirestore();
                await addDoc(collection(db, `users/${userId}/bestCombos`), {
                  heroes: [...heroes],
                  timestamp: serverTimestamp(),
                });
              },
            });
            await deleteDoc(doc(db, `users/${userId}/bestCombos`, d.id));
          }
        );

      row.appendChild(delBtn);
      savedCombosEl.appendChild(row);
      counter++;
    });
  });
}
