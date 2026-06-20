import { escapeHtml } from './utils.js';
// js/app-generator.js
import { translations } from './translations.js';
import { rankedCombos, filterCombosForSkinMode, getComboSkinRequirements, selectNonOverlappingCombos } from './combos-db.js';
import { renderCountersToggle, getCounterCount } from './combo-counters.js';
import { hasSkin, getHeroSkins, getSkinCount, getSkinForHero, SKIN_TYPES } from './skins-db.js';
import { getSkinHeroByName } from './skin-heroes-data.js';
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
  getSourceCreditText,
  getGeneratorHeroPool,
  generatorHeroesEl,
  generatorResultsEl,
  downloadGeneratorBtn,
  __ui,
} from './state.js';

const SKIN_TYPE_PRIORITY = {
  Everlasting: 0,
  Legendary: 1,
  Mythic: 2
};

const GENERATOR_SKIN_OWNERSHIP_KEY = 'vts_generator_owned_skins_v1';
let generatorSkinOwnership = null;

function getStoredSkinOwnership() {
  if (generatorSkinOwnership) return generatorSkinOwnership;
  try {
    const raw = localStorage.getItem(GENERATOR_SKIN_OWNERSHIP_KEY);
    generatorSkinOwnership = raw ? JSON.parse(raw) : {};
  } catch {
    generatorSkinOwnership = {};
  }
  return generatorSkinOwnership;
}

function isGeneratorSkinOwned(heroName) {
  const ownership = getStoredSkinOwnership();
  if (Object.prototype.hasOwnProperty.call(ownership, heroName)) return ownership[heroName] !== false;
  return hasSkin(heroName);
}

function setGeneratorSkinOwned(heroName, owned) {
  const ownership = getStoredSkinOwnership();
  ownership[heroName] = Boolean(owned);
  try {
    localStorage.setItem(GENERATOR_SKIN_OWNERSHIP_KEY, JSON.stringify(ownership));
  } catch {
    // Ignore storage failures; the current render still reflects the click.
  }
}

function getGeneratorResultHeroImageUrl(heroName) {
  if (!generatorSkinsOnly || !isGeneratorSkinOwned(heroName)) return getHeroImageUrl(heroName);
  return getSkinHeroByName(heroName)?.skinImageUrl || getSkinForHero(heroName)?.imageUrl || getHeroImageUrl(heroName);
}

function showGeneratorMessage(message) {
  if (typeof __ui.showAboModal === 'function') {
    __ui.showAboModal(message);
    return;
  }
  if (typeof window.showToast === 'function') {
    window.showToast(message, 'warning');
  }
}

function setGeneratorBusy(isBusy) {
  ['generateCombosBtn', 'generateRandomBtn'].forEach(id => {
    const btn = document.getElementById(id);
    if (!btn) return;
    if (isBusy) {
      if (!btn.dataset.idleText) btn.dataset.idleText = btn.textContent;
      btn.disabled = true;
      btn.setAttribute('aria-busy', 'true');
      btn.textContent = 'Generating...';
    } else {
      btn.disabled = false;
      btn.removeAttribute('aria-busy');
      if (btn.dataset.idleText) btn.textContent = btn.dataset.idleText;
    }
  });
}

export function renderGeneratorHeroes(options = {}) {
  if (!generatorHeroesEl) return;
  generatorHeroesEl.innerHTML = '';

  const activeSeasons = options.seasons || generatorSelectedSeasons;
  const activeStates = options.states || generatorSelectedStates;
  const activeTypes = options.types || generatorSelectedTypes;
  const activeSkinsOnly = options.skinsOnly ?? generatorSkinsOnly;
  const searchQuery = (document.getElementById('generatorHeroSearch')?.value || '').trim().toLowerCase();

  const pool = getGeneratorHeroPool(activeSkinsOnly);
  let filtered = pool
    .filter(h => heroMatchesFilters(h, activeSeasons, activeStates, activeTypes))
    .filter(h => !searchQuery || h.name.toLowerCase().includes(searchQuery));

  if (activeSkinsOnly) {
    filtered = filtered.sort((a, b) => {
      const aHas = Boolean(a.hasSkin);
      const bHas = Boolean(b.hasSkin);
      if (aHas && !bHas) return -1;
      if (!aHas && bHas) return 1;
      if (aHas && bHas) {
        const aPriority = SKIN_TYPE_PRIORITY[a.skinType] ?? 99;
        const bPriority = SKIN_TYPE_PRIORITY[b.skinType] ?? 99;
        if (aPriority !== bPriority) return aPriority - bPriority;
      }
      return a.name.localeCompare(b.name);
    });
  }

  filtered.forEach(hero => {
      const hasSkinFlag = activeSkinsOnly ? Boolean(hero.hasSkin || hasSkin(hero.name)) : hasSkin(hero.name);
      const skinOwned = activeSkinsOnly && hasSkinFlag && isGeneratorSkinOwned(hero.name);
      const heroSkinsList = getHeroSkins(hero.name);
      const primarySkin = activeSkinsOnly && hasSkinFlag
        ? {
          name: hero.skinName || getSkinForHero(hero.name)?.name,
          type: hero.skinType || getSkinForHero(hero.name)?.type
        }
        : getSkinForHero(hero.name);
      const skinCount = getSkinCount(hero.name);
      const skinTypeInfo = activeSkinsOnly && hasSkinFlag
        ? {
          label: hero.skinType || primarySkin?.type,
          color: hero.skinTypeColor || (primarySkin ? (SKIN_TYPES[primarySkin.type] || SKIN_TYPES.Mythic).color : null),
          icon: hero.skinTypeIcon || (primarySkin ? (SKIN_TYPES[primarySkin.type] || SKIN_TYPES.Mythic).icon : null)
        }
        : (primarySkin ? (SKIN_TYPES[primarySkin.type] || SKIN_TYPES.Mythic) : null);
      const skinColors = heroSkinsList.length
        ? heroSkinsList.map(skin => (SKIN_TYPES[skin.type] || SKIN_TYPES.Mythic).color)
        : Object.values(SKIN_TYPES).map(s => s.color);
      const normalSkinBadgeColors = skinCount > 1
        ? skinColors.slice(0, skinCount).join(',')
        : `${skinColors[0] || '#f59e0b'},#fbbf24`;
      const portraitUrl = skinOwned
        ? (hero.skinImageUrl || hero.imageUrl)
        : hero.imageUrl;
      const skinPriorityClass = activeSkinsOnly
        ? (skinOwned ? ' skin-priority-card skin-animated-portrait has-skin skin-owned' : ' skin-mode-card')
        : '';
      const card = document.createElement('div');
      card.className = `hero-card generator-card relative season-${String(hero.season || '').toLowerCase()}${skinPriorityClass} ${
        generatorSelectedHeroes.has(hero.name) ? 'generator-card-selected' : ''
      }`;
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.setAttribute('aria-pressed', generatorSelectedHeroes.has(hero.name) ? 'true' : 'false');
      card.setAttribute('aria-label', `${generatorSelectedHeroes.has(hero.name) ? 'Deselect' : 'Select'} ${hero.name}`);
      const originTag = hero.releaseSeason && hero.releaseSeason !== hero.season
        ? `<span class="hero-origin-tag" title="Original release ${escapeHtml(hero.releaseSeason)}">${escapeHtml(hero.releaseSeason)}</span>`
        : '';

      const skinBadgeTitle = escapeHtml(primarySkin
        ? `${primarySkin.name} (${skinTypeInfo?.label || primarySkin.type})${skinOwned ? '' : ' available'}`
        : `${skinCount} skin${skinCount > 1 ? 's' : ''} available`);
      const skinBadgeLabel = escapeHtml(skinOwned && skinTypeInfo ? skinTypeInfo.icon : `S${skinCount > 1 ? skinCount : ''}`);
      const skinBadgeStyle = skinOwned && skinTypeInfo
        ? `--skin-color:${skinTypeInfo.color};background:linear-gradient(135deg,${skinTypeInfo.color},#fbbf24);`
        : `background:linear-gradient(135deg,${normalSkinBadgeColors})`;
      const skinBadge = hasSkinFlag && !activeSkinsOnly
        ? `<span class="generator-skin-badge${skinOwned ? ' generator-skin-badge--priority' : ''}" title="${skinBadgeTitle}" style="${skinBadgeStyle}">${skinBadgeLabel}</span>`
        : '';
      const skinToggle = activeSkinsOnly && hasSkinFlag
        ? `<span class="generator-skin-toggle generator-skin-badge${skinOwned ? ' generator-skin-badge--priority is-on' : ''}" role="switch" tabindex="0" aria-checked="${skinOwned ? 'true' : 'false'}" aria-label="${skinOwned ? `Turn off skin icon for ${escapeHtml(hero.name)}` : `Turn on skin icon for ${escapeHtml(hero.name)}`}" title="${skinOwned ? 'Using skin icon for this hero' : 'Using base icon for this hero'}" data-skin-owned="${skinOwned ? 'true' : 'false'}" style="${skinBadgeStyle}">${skinBadgeLabel}</span>`
        : '';

      card.innerHTML = `
        <span class="hero-tag" style="background:${seasonColors[hero.season]}">${hero.season}</span>
        ${originTag}
        ${hero.State === 'Paid' ? paidBadgeHtml('card') : ''}
        ${skinBadge}
        ${skinToggle}
        
        <div class="info-btn lg:hidden absolute top-1 right-1 w-6 h-6 bg-slate-900/90 border border-slate-600 rounded-full flex items-center justify-center z-20 text-sky-400 shadow-md hover:bg-slate-800 cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-3.5 h-3.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
            </svg>
        </div>

        <span class="hero-portrait-frame">
          <img src="${escapeHtml(portraitUrl)}" alt="${escapeHtml(hero.name)}" crossorigin="anonymous" loading="lazy">
        </span>
        <div class="mt-1 flex flex-col items-center leading-tight w-full px-1">
            <span class="font-bold text-[10px] text-white truncate w-full text-center">${escapeHtml(hero.name)}</span>
            <span class="font-black text-[8px] uppercase tracking-wider ${getTroopColorClass(hero.Type)}">${getLocalizedTroop(hero.Type)}</span>
        </div>
      `;
      
      card.onclick = (e) => {
        if (e.target.closest('.generator-skin-toggle')) return;
        __ui.forceHideHeroTooltip(); 
        
        if (generatorSelectedHeroes.has(hero.name)) {
          generatorSelectedHeroes.delete(hero.name);
          card.classList.remove('generator-card-selected');
          card.setAttribute('aria-pressed', 'false');
          card.setAttribute('aria-label', `Select ${hero.name}`);
        } else {
          generatorSelectedHeroes.add(hero.name);
          card.classList.add('generator-card-selected');
          card.setAttribute('aria-pressed', 'true');
          card.setAttribute('aria-label', `Deselect ${hero.name}`);
        }
        
        const countBadge = document.getElementById('genSelectedCount');
        if (countBadge) {
          const n = generatorSelectedHeroes.size;
          if (n > 0) { countBadge.textContent = n + ' selected'; countBadge.classList.remove('hidden'); }
          else { countBadge.classList.add('hidden'); }
        }
      };
      card.addEventListener('keydown', (e) => {
        if (e.target.closest('.generator-skin-toggle')) return;
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        card.click();
      });

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

      const skinToggleEl = card.querySelector('.generator-skin-toggle');
      if (skinToggleEl) {
        const toggleSkin = (e) => {
          e.stopPropagation();
          e.preventDefault();
          const nextOwned = skinToggleEl.dataset.skinOwned !== 'true';
          setGeneratorSkinOwned(hero.name, nextOwned);
          renderGeneratorHeroes({
            seasons: activeSeasons,
            states: activeStates,
            types: activeTypes,
            skinsOnly: activeSkinsOnly
          });
        };
        ['pointerdown', 'pointerup', 'touchstart'].forEach(eventName => {
          skinToggleEl.addEventListener(eventName, (e) => {
            e.stopPropagation();
          }, { passive: false });
        });
        skinToggleEl.addEventListener('click', toggleSkin);
        skinToggleEl.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') toggleSkin(e);
        });
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
    sourceNote.textContent = getSourceCreditText();
}

export function renderGeneratorResults(bestCombos, meta = {}) {
  const t = translations[currentLanguage] || translations.en;
  generatorResultsEl.innerHTML = '';

  if (Number.isFinite(meta.durationMs)) {
    const summary = document.createElement('div');
    summary.className = 'generator-run-meta';
    summary.textContent = `Generated ${bestCombos.length} combo${bestCombos.length === 1 ? '' : 's'} in ${meta.durationMs} ms`;
    generatorResultsEl.appendChild(summary);
  }

  bestCombos.forEach((combo, i) => {
    const card = document.createElement('div');
    card.className = `generated-combo-card${i === 0 ? ' generated-combo-card--top' : ''}`;
    card.style.setProperty('--result-delay', `${i * 70}ms`);

    const slots = document.createElement('div');
    slots.className = 'saved-combo-slots';

    combo.heroes.forEach(name => {
      const item = document.createElement('div');
      item.className = 'saved-combo-slot-item';
      item.style.cursor = 'pointer';
      const img = document.createElement('img');
      img.src = getGeneratorResultHeroImageUrl(name);
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

    if (combo.note) {
      const skinNote = document.createElement('div');
      skinNote.className = 'generated-skin-overlay-note';
      const skinRequirements = getComboSkinRequirements(combo)
        .filter(item => item.requirement && item.requirement !== 'none')
        .map(item => `${item.hero}: ${item.requirement}`)
        .join(' | ');
      skinNote.textContent = skinRequirements ? `${combo.note} (${skinRequirements})` : combo.note;
      card.appendChild(skinNote);
    }

    const scoreBox = document.createElement('div');
    scoreBox.className = 'gen-score-panel';
    const counterCount = getCounterCount(combo.heroes);
    const counterBadge = counterCount
      ? `<span class="counter-summary-badge">${counterCount} counters known</span>`
      : `<span class="counter-summary-badge counter-summary-badge--empty">No known counters</span>`;
    scoreBox.innerHTML = `
      <div class="gen-score-main">
        <span class="text-[10px] uppercase tracking-widest text-slate-400">${t.generatorScoreLabel}</span>
        <span class="text-lg font-black text-sky-400">${combo.displayScore}</span>
        ${counterBadge}
      </div>
    `;
    card.appendChild(scoreBox);

    const counterRow = document.createElement('div');
    counterRow.className = 'generated-counter-row';
    counterRow.innerHTML = renderCountersToggle(combo.heroes, getComboRankInfo, getGeneratorResultHeroImageUrl, getCounterLabels(), {
      showEmpty: true,
      showUseAction: true,
      context: 'generator',
    });
    card.appendChild(counterRow);

    generatorResultsEl.appendChild(card);
  });
}

export function generateBestCombos() {
  const t = translations[currentLanguage] || translations.en;
  const selected = Array.from(generatorSelectedHeroes);

  if (selected.length < 12) { 
    showGeneratorMessage(t.generatorMinHeroesMessage || "Select at least 12 heroes to generate best combos.");
    return;
  }

  setGeneratorBusy(true);
  const startedAt = performance.now();

  try {
    const sourceCombos = filterCombosForSkinMode(rankedCombos, generatorSkinsOnly, isGeneratorSkinOwned);
    const finalSelection = selectNonOverlappingCombos(sourceCombos, selected, 5);

    const durationMs = Math.max(1, Math.round(performance.now() - startedAt));
    lastGeneratedCombos.length = 0;
    lastGeneratedCombos.push(...finalSelection);
    renderGeneratorResults(finalSelection, { durationMs });

    if (finalSelection.length > 0) {
      downloadGeneratorBtn.classList.remove('hidden');
      if (typeof window.showToast === 'function') {
        const key = finalSelection.length === 1 ? 'generatorFoundComboOne' : 'generatorFoundComboMany';
        const message = (t[key] || 'Found {n} best combos!').replace('{n}', finalSelection.length);
        window.showToast(`${message} Generated in ${durationMs} ms.`, 'success');
      }
    } else {
      downloadGeneratorBtn.classList.add('hidden');
    }
  } finally {
    setGeneratorBusy(false);
  }
}

export function generateRandomCombos() {
  const t = translations[currentLanguage] || translations.en;
  const selected = Array.from(generatorSelectedHeroes);
  if (selected.length < 3) {
    showGeneratorMessage(t.messagePleaseDrag3Heroes || "Select at least 3 heroes!");
    return;
  }

  setGeneratorBusy(true);
  const startedAt = performance.now();

  try {
    const ownedSet = new Set(selected);
    const sourceCombos = filterCombosForSkinMode(rankedCombos, generatorSkinsOnly, isGeneratorSkinOwned);
    const total = sourceCombos.length;

    const validCombos = sourceCombos
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
      showGeneratorMessage(t.generatorNoCombosAvailable || "No ranked combos found.");
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
       showGeneratorMessage(t.generatorNoCombosAvailable || "No ranked combos found.");
    } else {
       const durationMs = Math.max(1, Math.round(performance.now() - startedAt));
       lastGeneratedCombos.length = 0;
       lastGeneratedCombos.push(...randomSelection);
       renderGeneratorResults(randomSelection, { durationMs });
       downloadGeneratorBtn.classList.remove('hidden');
       if (typeof window.showToast === 'function') {
         window.showToast(`Generated ${randomSelection.length} random combos in ${durationMs} ms.`, 'success');
       }
    }
  } finally {
    setGeneratorBusy(false);
  }
}
