// js/app-generator.js
import { translations } from './translations.js';
import { allHeroesData } from './heroes-data.js';
import { rankedCombos } from './combos-db.js';
import { renderCountersToggle, getCounterCount } from './combo-counters.js';
import { hasSkin, getSkinCount, SKIN_TYPES } from './skins-db.js';
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
  generatorSelectedSeasons,
  generatorSelectedStates,
  generatorSelectedTypes,
  generatorSelectedHeroes,
  generatorSkinsOnly,
  lastGeneratedCombos,
  sourceCreditText,
  generatorHeroesEl,
  generatorResultsEl,
  downloadGeneratorBtn,
  __ui,
} from './state.js';

export function renderGeneratorHeroes() {
  if (!generatorHeroesEl) return;
  generatorHeroesEl.innerHTML = '';

  let filtered = allHeroesData.filter(h => heroMatchesFilters(h, generatorSelectedSeasons, generatorSelectedStates, generatorSelectedTypes));

  if (generatorSkinsOnly) {
    filtered = filtered.sort((a, b) => {
      const aHas = hasSkin(a.name);
      const bHas = hasSkin(b.name);
      if (aHas && !bHas) return -1;
      if (!aHas && bHas) return 1;
      return getSkinCount(b.name) - getSkinCount(a.name);
    });
  }

  filtered.forEach(hero => {
      const hasSkinFlag = hasSkin(hero.name);
      const skinCount = getSkinCount(hero.name);
      const skinColors = Object.values(SKIN_TYPES).map(s => s.color);
      const hasSkinClass = hasSkinFlag && generatorSkinsOnly ? ' has-skin' : '';
      const card = document.createElement('button');
      card.className = `hero-card generator-card relative${hasSkinClass} ${
        generatorSelectedHeroes.has(hero.name) ? 'generator-card-selected' : ''
      }`;
      
      const skinBadge = hasSkinFlag ? `<span class="generator-skin-badge" title="${skinCount} skin${skinCount > 1 ? 's' : ''} available" style="background:linear-gradient(135deg,${skinColors.slice(0,skinCount).join(',')})">✦${skinCount > 1 ? skinCount : ''}</span>` : '';

      card.innerHTML = `
        <span class="hero-tag" style="background:${seasonColors[hero.season]}">${hero.season}</span>
        ${hero.State === 'Paid' ? paidBadgeHtml('card') : ''}
        ${skinBadge}
        
        <div class="info-btn lg:hidden absolute top-1 right-1 w-6 h-6 bg-slate-900/90 border border-slate-600 rounded-full flex items-center justify-center z-20 text-sky-400 shadow-md hover:bg-slate-800 cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-3.5 h-3.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
            </svg>
        </div>

        <img src="${hero.imageUrl}" alt="${hero.name}" crossorigin="anonymous">
        <div class="mt-1 flex flex-col items-center leading-tight w-full px-1">
            <span class="font-bold text-[10px] text-white truncate w-full text-center">${hero.name}</span>
            <span class="font-black text-[8px] uppercase tracking-wider ${getTroopColorClass(hero.Type)}">${getLocalizedTroop(hero.Type)}</span>
        </div>
      `;
      
      card.onclick = () => {
        __ui.forceHideHeroTooltip(); 
        
        if (generatorSelectedHeroes.has(hero.name)) {
          generatorSelectedHeroes.delete(hero.name);
          card.classList.remove('generator-card-selected');
        } else {
          generatorSelectedHeroes.add(hero.name);
          card.classList.add('generator-card-selected');
        }
        
        const countBadge = document.getElementById('genSelectedCount');
        if (countBadge) {
          const n = generatorSelectedHeroes.size;
          if (n > 0) { countBadge.textContent = n + ' selected'; countBadge.classList.remove('hidden'); }
          else { countBadge.classList.add('hidden'); }
        }
      };

      card.addEventListener('pointerenter', (e) => {
        if (e.pointerType === 'touch') return; 
        __ui.showHeroTooltip(e, hero.name);
      });
      card.addEventListener('pointermove', (e) => {
        if (e.pointerType === 'touch') return;
        __ui.moveHeroTooltip(e);
      });
      card.addEventListener('pointerleave', (e) => {
        if (e.pointerType === 'touch') return;
        __ui.hideHeroTooltip();
      });

      const infoBtn = card.querySelector('.info-btn');
      if (infoBtn) {
        infoBtn.addEventListener('click', (e) => {
          e.stopPropagation(); 
          e.preventDefault();
          __ui.showHeroTooltip(e, hero.name);
        });
        infoBtn.addEventListener('touchstart', (e) => {
          e.stopPropagation(); 
        }, { passive: false });
      }

      generatorHeroesEl.appendChild(card);
    });

    let sourceNote = document.getElementById('heroesSourceNote2');
    if (!sourceNote) {
        sourceNote = document.createElement('div');
        sourceNote.id = 'heroesSourceNote2';
        sourceNote.className = "col-span-full mt-8 text-center text-[10px] sm:text-xs text-slate-500 uppercase tracking-widest border-t border-slate-800/50 pt-4 w-full";
        generatorHeroesEl.parentNode.appendChild(sourceNote);
    }
    sourceNote.innerHTML = sourceCreditText;
}

export function renderGeneratorResults(bestCombos) {
  const t = translations[currentLanguage] || translations.en;
  generatorResultsEl.innerHTML = '';

  bestCombos.forEach((combo, i) => {
    const card = document.createElement('div');
    card.className = 'generated-combo-card';

    const slots = document.createElement('div');
    slots.className = 'saved-combo-slots';

    combo.heroes.forEach(name => {
      const item = document.createElement('div');
      item.className = 'saved-combo-slot-item';
      item.style.cursor = 'pointer';
      const img = document.createElement('img');
      img.src = getHeroImageUrl(name);
      img.crossOrigin = 'anonymous';
      img.style.transition = 'transform 0.18s ease, box-shadow 0.18s ease';
      const label = document.createElement('span');
      label.className = 'text-[10px] text-sky-300 font-bold truncate px-1';
      label.textContent = name;
      item.appendChild(img);
      item.appendChild(label);
      
      item.addEventListener('pointerenter', (e) => {
        if (e.pointerType === 'touch') return;
        img.style.transform = 'scale(1.12)';
        img.style.boxShadow = '0 0 18px rgba(56,189,248,0.45)';
        __ui.showHeroTooltip(e, name);
      });
      item.addEventListener('pointermove', (e) => {
        if (e.pointerType === 'touch') return;
        __ui.moveHeroTooltip(e);
      });
      item.addEventListener('pointerleave', (e) => {
        if (e.pointerType === 'touch') return;
        img.style.transform = '';
        img.style.boxShadow = '';
        __ui.hideHeroTooltip();
      });
      
      item.addEventListener('click', () => {
        const rect = item.getBoundingClientRect();
        const fakeEvent = { clientX: rect.left + rect.width / 2, clientY: rect.top };
        __ui.showHeroTooltip(fakeEvent, name);
      });
      slots.appendChild(item);
    });

    card.innerHTML = `
      <span class="saved-combo-number bg-amber-400 text-slate-900">${i + 1}</span>
    `;
    card.appendChild(slots);

    const scoreBox = document.createElement('div');
    scoreBox.className = 'gen-score-panel';
    scoreBox.innerHTML = `
      <div class="gen-score-main">
        <span class="text-[10px] uppercase tracking-widest text-slate-400">${t.generatorScoreLabel}</span>
        <span class="text-lg font-black text-sky-400">${combo.displayScore}</span>
      </div>
      ${renderCountersToggle(combo.heroes, getComboRankInfo, getHeroImageUrl, getCounterLabels())}
    `;
    card.appendChild(scoreBox);

    generatorResultsEl.appendChild(card);
  });
}

export function generateBestCombos() {
  const t = translations[currentLanguage] || translations.en;
  const selected = Array.from(generatorSelectedHeroes);

  if (selected.length < 12) { 
    __ui.showAboModal(t.generatorMinHeroesMessage || "Select at least 12 heroes to generate best combos.");
    return;
  }

  const ownedSet = new Set(selected);
  const usedHeroesGlobal = new Set();
  const finalSelection = [];
  const total = rankedCombos.length;

  for (let i = 0; i < total; i++) {
    const combo = rankedCombos[i];
    if (finalSelection.length >= 5) break;
    const canBuild = combo.heroes.every(h => ownedSet.has(h));
    const isUnique = !combo.heroes.some(h => usedHeroesGlobal.has(h));

    if (canBuild && isUnique) {
      let rawScore = 100;
      if (total > 1) {
        rawScore = 100 - ((i / (total - 1)) * 99);
      }
      finalSelection.push({ ...combo, displayScore: rawScore.toFixed(1) });
      combo.heroes.forEach(h => usedHeroesGlobal.add(h));
    }
  }

  lastGeneratedCombos.length = 0;
  lastGeneratedCombos.push(...finalSelection);
  renderGeneratorResults(finalSelection);

  if (finalSelection.length > 0) {
    downloadGeneratorBtn.classList.remove('hidden');
    if (typeof window.showToast === 'function') window.showToast(`🎯 Found ${finalSelection.length} best combo${finalSelection.length > 1 ? 's' : ''}!`, 'success');
  } else {
    downloadGeneratorBtn.classList.add('hidden');
  }
}

export function generateRandomCombos() {
  const t = translations[currentLanguage] || translations.en;
  const selected = Array.from(generatorSelectedHeroes);
  if (selected.length < 3) {
    __ui.showAboModal(t.messagePleaseDrag3Heroes || "Select at least 3 heroes!");
    return;
  }

  const ownedSet = new Set(selected);
  const total = rankedCombos.length;

  const validCombos = rankedCombos
    .map((combo, index) => {
        let rawScore = 100;
        if (total > 1) {
          rawScore = 100 - ((index / (total - 1)) * 99);
        }
        return {
          ...combo,
          originalIndex: index,
          displayScore: rawScore.toFixed(1)
        };
    })
    .filter(combo => combo.heroes.every(h => ownedSet.has(h)));

  if (validCombos.length === 0) {
    __ui.showAboModal(t.generatorNoCombosAvailable || "No ranked combos found.");
    return;
  }

  for (let i = validCombos.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [validCombos[i], validCombos[j]] = [validCombos[j], validCombos[i]];
  }

  const randomSelection = [];
  const usedHeroesGlobal = new Set();

  for (const combo of validCombos) {
    if (randomSelection.length >= 5) break;
    const isUnique = !combo.heroes.some(h => usedHeroesGlobal.has(h));
    if (isUnique) {
      randomSelection.push(combo);
      combo.heroes.forEach(h => usedHeroesGlobal.add(h));
    }
  }

  randomSelection.sort((a, b) => parseFloat(b.displayScore) - parseFloat(a.displayScore));

  if (randomSelection.length === 0) {
     __ui.showAboModal(t.generatorNoCombosAvailable || "No ranked combos found.");
  } else {
     lastGeneratedCombos.length = 0;
     lastGeneratedCombos.push(...randomSelection);
     renderGeneratorResults(randomSelection);
     downloadGeneratorBtn.classList.remove('hidden');
  }
}
