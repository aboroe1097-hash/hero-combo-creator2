// js/app-builder.js
import { translations } from './translations.js';
import { allHeroesData } from './heroes-data.js';
import { renderCountersToggle, getCounterCount } from './combo-counters.js';
import {
  currentLanguage,
  heroMatchesFilters,
  seasonColors,
  paidBadgeHtml,
  getTroopColorClass,
  getLocalizedTroop,
  forceHideHeroTooltip,
  showHeroTooltip,
  moveHeroTooltip,
  hideHeroTooltip,
  getHeroImageUrl,
  getComboRankInfo,
  getCounterLabels,
  showAboModal,
  selectedSeasons,
  selectedStates,
  selectedTypes,
  currentCombo,
  sourceCreditText,
  availableHeroesEl,
  loadingSpinner,
  savedCombosEl,
  noCombosMessage,
  getUserId,
  isHeroAlreadyInCombo,
} from './app.js';
import { getDb } from './firebase.js';

let db = null;
const savedCombosCache = [];
let touchDragHero = null;
let touchDragGhost = null;

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
}

export function setupTouchDragForManualBuilder() {
  document.addEventListener('touchmove', (e) => {
    if (!touchDragHero || !touchDragGhost) return;
    const touch = e.touches && e.touches[0];
    if (!touch) return;
    e.preventDefault();
    const w = touchDragGhost.offsetWidth || 80;
    const h = touchDragGhost.offsetHeight || 80;
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

    if (isHeroAlreadyInCombo(touchDragHero, idx)) {
      const t = translations[currentLanguage] || translations.en;
      showAboModal(t.manualNoDuplicateHero || 'This hero is already used in your current combo.');
      touchDragHero = null;
      return;
    }
    currentCombo[idx] = touchDragHero;
    updateComboSlotDisplay(slot, touchDragHero, idx);
    updateManualComboScore();
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
  availableHeroesEl.innerHTML = '';
  allHeroesData
    .filter(h => heroMatchesFilters(h, selectedSeasons, selectedStates, selectedTypes))
    .forEach(hero => {
      const card = document.createElement('div');
      card.className = 'hero-card relative';
      card.draggable = true;
      card.dataset.heroName = hero.name;

      const tagColor = seasonColors[hero.season] || '#f97316';
      card.innerHTML = `
        <span class="hero-tag" style="background:${tagColor}">${hero.season}</span>
        ${hero.State === 'Paid' ? paidBadgeHtml('card') : ''}
        
        <div class="info-btn lg:hidden absolute top-1 right-1 w-6 h-6 bg-slate-900/90 border border-slate-600 rounded-full flex items-center justify-center z-20 text-sky-400 shadow-md cursor-pointer hover:bg-slate-800">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-3.5 h-3.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
            </svg>
        </div>

        <img src="${hero.imageUrl}" alt="${hero.name}">
        <div class="mt-1 flex flex-col items-center leading-tight w-full px-1">
            <span class="font-bold text-[10px] text-white truncate w-full text-center">${hero.name}</span>
            <span class="font-black text-[8px] uppercase tracking-wider ${getTroopColorClass(hero.Type)}">${getLocalizedTroop(hero.Type)}</span>
        </div>
      `;

      card.addEventListener('dragstart', e => {
        forceHideHeroTooltip();
        e.dataTransfer.setData('text/plain', hero.name);
      });

      card.addEventListener('touchstart', (e) => {
        forceHideHeroTooltip();
        const touch = e.touches && e.touches[0];
        touchDragHero = hero.name;
        createTouchGhost(card, touch);
      }, { passive: true });

      card.addEventListener('pointerenter', (e) => {
        if (e.pointerType === 'touch') return; 
        showHeroTooltip(e, hero.name);
      });
      card.addEventListener('pointermove', (e) => {
        if (e.pointerType === 'touch') return;
        moveHeroTooltip(e);
      });
      card.addEventListener('pointerleave', (e) => {
        if (e.pointerType === 'touch') return;
        hideHeroTooltip();
      });

      const infoBtn = card.querySelector('.info-btn');
      if (infoBtn) {
        infoBtn.addEventListener('click', (e) => {
          e.stopPropagation(); 
          e.preventDefault();
          showHeroTooltip(e, hero.name);
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
  sourceNote.innerHTML = sourceCreditText;
  
  const countEl = document.getElementById('manualHeroCount');
  if (countEl) {
    const count = availableHeroesEl.querySelectorAll('.hero-card').length;
    countEl.textContent = count + ' hero' + (count !== 1 ? 's' : '');
  }
}

export function updateComboSlotDisplay(slot, name, idx) {
  const t = translations[currentLanguage] || translations.en;
  if (name) {
    slot.innerHTML = `
      <img src="${getHeroImageUrl(name)}" alt="${name}" crossorigin="anonymous">
      <span class="absolute bottom-0 left-0 right-0 text-white bg-black/70 px-1 py-1 text-[10px] w-full truncate text-center font-bold">
        ${name}
      </span>`;
    slot.classList.add('relative', 'p-0');
  } else {
    slot.innerHTML = `
      <div class="combo-slot-placeholder h-full flex flex-col items-center justify-center gap-1">
        <span class="font-bold text-blue-400/60 text-3xl leading-none">+</span>
        <span data-i18n="dragHeroHere" class="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">
          ${t.dragHeroHere}
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
    return;
  }

  scoreBox.className = 'mt-3 gen-score-panel manual-combo-scorebox';
  const label = t.generatorScoreLabel || 'Score:';
  const scoreHtml = info
    ? `<div class="gen-score-main">
        <span class="text-[10px] uppercase tracking-widest text-slate-400">${label}</span>
        <span class="text-lg font-black text-sky-400">${info.score}</span>
        <span class="text-slate-400 text-[11px] sm:text-xs">(#${info.rank})</span>
      </div>`
    : '';
  scoreBox.innerHTML = `${scoreHtml}${renderCountersToggle(currentCombo, getComboRankInfo, getHeroImageUrl, getCounterLabels())}`;
}

export async function saveCombo() {
  const t = translations[currentLanguage] || translations.en;
  if (currentCombo.includes(null)) {
    showAboModal(t.messagePleaseDrag3Heroes);
    return;
  }
  loadingSpinner.classList.remove('hidden');
  try {
    const { collection, addDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js');
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
    if (typeof window.showToast === 'function') window.showToast('✅ Combo saved!', 'success');
  } catch (err) {
    console.error(err);
    if (typeof window.showToast === 'function') window.showToast('❌ Could not save combo', 'error');
  } finally {
    loadingSpinner.classList.add('hidden');
  }
}

export async function setupFirestoreListener() {
  const _db = getDb();
  const userId = getUserId();
  if (!_db || !userId) return;
  db = _db;

  const { collection, query, orderBy, limit, onSnapshot, deleteDoc, doc } = await import('https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js');

  const q = query(
    collection(db, `users/${userId}/bestCombos`),
    orderBy('timestamp', 'desc'),
    limit(100)
  );

  onSnapshot(q, snap => {
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
          <img src="${getHeroImageUrl(name)}">
          <span>${name}</span>
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
              <span class="text-[10px] uppercase tracking-widest text-slate-400">${label}</span>
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
        showAboModal(
          translations[currentLanguage].messageConfirmRemoveCombo,
          async () => {
            await deleteDoc(doc(db, `users/${userId}/bestCombos`, d.id));
          }
        );

      row.appendChild(delBtn);
      savedCombosEl.appendChild(row);
      counter++;
    });
  });
}
