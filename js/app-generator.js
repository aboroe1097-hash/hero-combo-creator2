import { cssToken, debounce, escapeHtml } from './utils.js';
// js/app-generator.js
import { translations } from './translations.js';
import { rankedCombos, filterCombosForSkinMode, selectNonOverlappingCombos } from './combos-db.js';
import { renderCountersToggle, getCounterCount } from './combo-counters.js';
import { hasSkin, getHeroSkins, getSkinCount, getSkinForHero, SKIN_TYPES } from './skins-db.js';
import { getSkinHeroByName } from './skin-heroes-data.js';
import {
  GENERATOR_MAX_COMBOS,
  GENERATOR_MIN_HEROES,
  GENERATOR_SELECTION_SAVE_MS,
  GENERATOR_SELECTION_STORAGE_KEY,
  GENERATOR_SELECTION_VERSION,
  GENERATOR_SKIN_OWNERSHIP_KEY,
  GENERATOR_SKIN_OWNERSHIP_LEGACY_KEY,
  GENERATOR_SKIN_OWNERSHIP_VERSION,
} from './constants.js';
import {
  HERO_ATLAS_ALL_SEASONS,
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
} from './state.js';
import { callUi, getUiFunction } from './ui-bridge.js';

const SKIN_TYPE_PRIORITY = {
  Everlasting: 0,
  Legendary: 1,
  Mythic: 2
};

let generatorSkinOwnership = null;
let generatorSelectionRestored = false;

function getSeasonIndex(season) {
  return HERO_ATLAS_ALL_SEASONS.indexOf(String(season || '').toUpperCase());
}

function getMaxSelectedSeasonIndex(seasons = []) {
  return (seasons || [])
    .map(getSeasonIndex)
    .filter(index => index >= 0)
    .reduce((max, index) => Math.max(max, index), -1);
}

function isSkinSeasonAvailable(heroOrName, seasons = generatorSelectedSeasons) {
  const hero = typeof heroOrName === 'string' ? getSkinHeroByName(heroOrName) : heroOrName;
  if (!hero) return false;
  const releaseIndex = getSeasonIndex(hero.releaseSeason || hero.season);
  if (releaseIndex < 0) return false;
  return getMaxSelectedSeasonIndex(seasons) >= releaseIndex + 1;
}

function normalizeStoredHeroList(value) {
  if (!Array.isArray(value)) return [];
  const validHeroNames = new Set(getGeneratorHeroPool(false).map(hero => hero.name));
  return [...new Set(value)]
    .filter(name => typeof name === 'string' && validHeroNames.has(name));
}

export function restoreGeneratorSelection() {
  if (generatorSelectionRestored) return;
  generatorSelectionRestored = true;
  try {
    const raw = localStorage.getItem(GENERATOR_SELECTION_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    const heroes = parsed?._version === GENERATOR_SELECTION_VERSION
      ? parsed.heroes
      : parsed;
    normalizeStoredHeroList(heroes).forEach(name => generatorSelectedHeroes.add(name));
  } catch {
    // Ignore stale or malformed local selections.
  }
}

export function persistGeneratorSelection() {
  try {
    localStorage.setItem(GENERATOR_SELECTION_STORAGE_KEY, JSON.stringify({
      _version: GENERATOR_SELECTION_VERSION,
      heroes: Array.from(generatorSelectedHeroes),
    }));
  } catch {
    // Local storage can fail in private browsing or quota exhaustion.
  }
}

const persistGeneratorSelectionDebounced = debounce(persistGeneratorSelection, GENERATOR_SELECTION_SAVE_MS);

export function syncGeneratorSelectedCountBadge() {
  const countBadge = document.getElementById('genSelectedCount');
  if (!countBadge) return;
  const n = generatorSelectedHeroes.size;
  if (n > 0) {
    countBadge.textContent = `${n} selected`;
    countBadge.classList.remove('hidden');
  } else {
    countBadge.classList.add('hidden');
  }
}

export function markGeneratorSelectionChanged({ immediate = false } = {}) {
  syncGeneratorSelectedCountBadge();
  if (immediate) persistGeneratorSelection();
  else persistGeneratorSelectionDebounced();
}

function parseSkinOwnership(raw) {
  if (!raw) return null;
  const parsed = JSON.parse(raw);
  if (parsed?._version === GENERATOR_SKIN_OWNERSHIP_VERSION && parsed.heroes && typeof parsed.heroes === 'object') {
    return parsed.heroes;
  }
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
  return null;
}

function getStoredSkinOwnership() {
  if (generatorSkinOwnership) return generatorSkinOwnership;
  try {
    generatorSkinOwnership =
      parseSkinOwnership(localStorage.getItem(GENERATOR_SKIN_OWNERSHIP_KEY)) ||
      parseSkinOwnership(localStorage.getItem(GENERATOR_SKIN_OWNERSHIP_LEGACY_KEY)) ||
      {};
  } catch {
    generatorSkinOwnership = {};
  }
  return generatorSkinOwnership;
}

function isGeneratorSkinOwned(heroName, seasons = generatorSelectedSeasons) {
  if (!isSkinSeasonAvailable(heroName, seasons)) return false;
  const ownership = getStoredSkinOwnership();
  if (Object.prototype.hasOwnProperty.call(ownership, heroName)) return ownership[heroName] !== false;
  return hasSkin(heroName);
}

function setGeneratorSkinOwned(heroName, owned) {
  const ownership = getStoredSkinOwnership();
  ownership[heroName] = Boolean(owned);
  try {
    localStorage.setItem(GENERATOR_SKIN_OWNERSHIP_KEY, JSON.stringify({
      _version: GENERATOR_SKIN_OWNERSHIP_VERSION,
      heroes: ownership,
    }));
  } catch {
    // Ignore storage failures; the current render still reflects the click.
  }
}

function getGeneratorResultHeroImageUrl(heroName) {
  if (!generatorSkinsOnly || !isGeneratorSkinOwned(heroName, generatorSelectedSeasons)) return getHeroImageUrl(heroName);
  return getSkinHeroByName(heroName)?.skinImageUrl || getSkinForHero(heroName)?.imageUrl || getHeroImageUrl(heroName);
}

function getStableSkinMotionValues(heroName, offset = 0) {
  const text = String(heroName || '');
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 31 + text.charCodeAt(i) + offset) % 9973;
  }
  return {
    delay: -((hash % 320) / 100),
    duration: 2.85 + ((hash % 95) / 100),
    shift: ((hash % 7) - 3) * 0.45,
    scale: 1.015 + ((hash % 5) * 0.006),
  };
}

function applySkinMotion(el, heroName, offset = 0) {
  const motion = getStableSkinMotionValues(heroName, offset);
  el.style.setProperty('--skin-anim-delay', `${motion.delay.toFixed(2)}s`);
  el.style.setProperty('--skin-anim-duration', `${motion.duration.toFixed(2)}s`);
  el.style.setProperty('--skin-anim-shift', `${motion.shift.toFixed(2)}px`);
  el.style.setProperty('--skin-anim-scale', motion.scale.toFixed(3));
}

function applyGeneratorBadgeVars(el, { skinColor, skinGradient } = {}) {
  if (!el) return;
  if (skinColor) el.style.setProperty('--skin-color', skinColor);
  if (skinGradient) el.style.setProperty('--skin-badge-bg', `linear-gradient(135deg, ${skinGradient})`);
}

function showGeneratorMessage(message) {
  const showAboModal = getUiFunction('showAboModal');
  if (showAboModal) {
    showAboModal(message);
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
      const aHas = Boolean(a.hasSkin && isSkinSeasonAvailable(a, activeSeasons));
      const bHas = Boolean(b.hasSkin && isSkinSeasonAvailable(b, activeSeasons));
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
      const skinSeasonAvailable = isSkinSeasonAvailable(hero, activeSeasons);
      const hasSkinFlag = (activeSkinsOnly ? Boolean(hero.hasSkin || hasSkin(hero.name)) : hasSkin(hero.name)) && skinSeasonAvailable;
      const skinOwned = activeSkinsOnly && hasSkinFlag && isGeneratorSkinOwned(hero.name, activeSeasons);
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
      card.className = `hero-card generator-card relative season-${cssToken(hero.season)}${skinPriorityClass} ${
        generatorSelectedHeroes.has(hero.name) ? 'generator-card-selected' : ''
      }`;
      if (skinOwned) applySkinMotion(card, hero.name);
      card.dataset.heroName = hero.name;
      card.dataset.heroSeason = hero.season;
      card.dataset.heroTroop = hero.Type;
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.setAttribute('aria-pressed', generatorSelectedHeroes.has(hero.name) ? 'true' : 'false');
      card.setAttribute('aria-label', `${generatorSelectedHeroes.has(hero.name) ? 'Deselect' : 'Select'} ${hero.name}`);
      const originTag = hero.releaseSeason && hero.releaseSeason !== hero.season
        ? `<span class="hero-origin-tag" title="Original release ${escapeHtml(hero.releaseSeason)}">${escapeHtml(hero.releaseSeason)}</span>`
        : '';

      const skinBadgeTitle = escapeHtml(primarySkin
        ? `${primarySkin.name} (${skinTypeInfo?.label || primarySkin.type})${skinOwned ? ' on' : ' off'}`
        : `${skinCount} skin${skinCount > 1 ? 's' : ''} available`);
      const skinIconLabel = skinTypeInfo?.icon || `S${skinCount > 1 ? skinCount : ''}`;
      const skinBadgeLabel = escapeHtml(skinOwned && skinTypeInfo ? skinTypeInfo.icon : `S${skinCount > 1 ? skinCount : ''}`);
      const skinBadgeVars = {
        skinColor: skinOwned && skinTypeInfo ? skinTypeInfo.color : (skinColors[0] || '#f59e0b'),
        skinGradient: skinOwned && skinTypeInfo
          ? `${skinTypeInfo.color}, #fbbf24`
          : normalSkinBadgeColors,
      };
      const skinBadge = hasSkinFlag && !activeSkinsOnly
        ? `<span class="generator-skin-badge${skinOwned ? ' generator-skin-badge--priority' : ''}" title="${skinBadgeTitle}">${skinBadgeLabel}</span>`
        : '';
      const skinToggle = activeSkinsOnly && hasSkinFlag
        ? `<span class="generator-skin-toggle${skinOwned ? ' generator-skin-badge--priority is-on' : ''}" role="switch" tabindex="0" aria-checked="${skinOwned ? 'true' : 'false'}" aria-label="${skinOwned ? `Turn off skin icon for ${escapeHtml(hero.name)}` : `Turn on skin icon for ${escapeHtml(hero.name)}`}" title="${skinOwned ? 'Using skin icon for this hero' : 'Using base icon for this hero'}" data-skin-owned="${skinOwned ? 'true' : 'false'}"><span class="generator-skin-toggle-icon">${escapeHtml(skinIconLabel)}</span> <span class="generator-skin-toggle-state">${skinOwned ? 'Skin' : 'Base'}</span></span>`
        : '';
      card.style.setProperty('--hero-season-color', seasonColors[hero.season] || '#f97316');

      card.innerHTML = `
        <div class="hero-card-badges">
          <span class="hero-tag">${escapeHtml(hero.season)}</span>
          <span class="hero-card-badge-spacer"></span>
          ${skinBadge}
          ${skinToggle}
          ${hero.State === 'Paid' ? paidBadgeHtml('card') : ''}
        </div>
        ${originTag}
        
        <div class="info-btn">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="info-btn-svg">
                <path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
            </svg>
        </div>

        <span class="hero-portrait-frame">
          <img src="${escapeHtml(portraitUrl)}" alt="${escapeHtml(hero.name)}" crossorigin="anonymous" loading="lazy">
        </span>
        <div class="hero-card-copy">
            <span class="hero-card-name">${escapeHtml(hero.name)}</span>
            <span class="hero-card-type ${escapeHtml(getTroopColorClass(hero.Type))}">${escapeHtml(getLocalizedTroop(hero.Type))}</span>
        </div>
      `;

      card.querySelectorAll('.generator-skin-badge, .generator-skin-toggle').forEach((el) => {
        applyGeneratorBadgeVars(el, skinBadgeVars);
      });
      
      card.onclick = (e) => {
        if (e.target.closest('.generator-skin-toggle')) return;
        callUi('forceHideHeroTooltip');
        
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
        
        markGeneratorSelectionChanged();
      };
      card.addEventListener('keydown', (e) => {
        if (e.target.closest('.generator-skin-toggle')) return;
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        card.click();
      });

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
        sourceNote.className = "generator-source-note";
        generatorHeroesEl.parentNode.appendChild(sourceNote);
    }
    sourceNote.textContent = getSourceCreditText();
}

export function renderGeneratorResults(bestCombos, meta = {}) {
  const t = translations[currentLanguage] || translations.en;
  generatorResultsEl.innerHTML = '';
  const topScore = Math.max(
    1,
    ...bestCombos
      .map(combo => Number.parseFloat(combo.displayScore))
      .filter(score => Number.isFinite(score))
  );

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
      const isSkinResult = generatorSkinsOnly && isGeneratorSkinOwned(name) && hasSkin(name);
      const item = document.createElement('div');
      item.className = `saved-combo-slot-item${isSkinResult ? ' saved-combo-slot-item--skin' : ''}`;
      if (isSkinResult) applySkinMotion(item, name, i + 17);
      item.style.cursor = 'pointer';
      const img = document.createElement('img');
      img.src = getGeneratorResultHeroImageUrl(name);
      img.crossOrigin = 'anonymous';
      const label = document.createElement('span');
      label.className = 'gen-combo-slot-label';
      label.textContent = name;
      item.appendChild(img);
      item.appendChild(label);
      
      item.addEventListener('pointerenter', (e) => {
        if (e.pointerType === 'touch') return;
        item.classList.add('saved-combo-slot-item--hover');
        callUi('showHeroTooltip', e, name);
      });
      item.addEventListener('pointermove', (e) => {
        if (e.pointerType === 'touch') return;
        callUi('moveHeroTooltip', e);
      });
      item.addEventListener('pointerleave', (e) => {
        if (e.pointerType === 'touch') return;
        item.classList.remove('saved-combo-slot-item--hover');
        callUi('hideHeroTooltip');
      });
      
      item.addEventListener('click', () => {
        const rect = item.getBoundingClientRect();
        const fakeEvent = { clientX: rect.left + rect.width / 2, clientY: rect.top };
        callUi('showHeroTooltip', fakeEvent, name);
      });
      slots.appendChild(item);
    });

    card.innerHTML = `
      <span class="saved-combo-number">${i + 1}</span>
    `;
    card.appendChild(slots);

    const scoreBox = document.createElement('div');
    scoreBox.className = 'gen-score-panel';
    const counterCount = getCounterCount(combo.heroes);
    const scoreValue = Number.parseFloat(combo.displayScore);
    const scorePct = Number.isFinite(scoreValue)
      ? Math.max(4, Math.min(100, (scoreValue / topScore) * 100))
      : 0;
    scoreBox.style.setProperty('--score-pct', `${scorePct.toFixed(1)}%`);
    const counterBadge = counterCount
      ? `<span class="counter-summary-badge counter-summary-badge--action" role="button" tabindex="0" title="Show counter details">${counterCount} counters known <span class="counter-summary-chevron" aria-hidden="true"></span></span>`
      : `<span class="counter-summary-badge counter-summary-badge--empty">No known counters</span>`;
    scoreBox.innerHTML = `
      <div class="gen-score-main">
        <span class="gen-score-meta">${escapeHtml(t.generatorScoreLabel)}</span>
        <span class="gen-score-value">${combo.displayScore}</span>
        <span class="gen-score-bar" aria-hidden="true"><span></span></span>
        ${counterBadge}
      </div>
    `;
    card.appendChild(scoreBox);

    const counterRow = document.createElement('div');
    counterRow.className = 'generated-counter-row generated-counter-row--badge-only';
    counterRow.innerHTML = renderCountersToggle(combo.heroes, getComboRankInfo, getGeneratorResultHeroImageUrl, getCounterLabels(), {
      showEmpty: false,
      showUseAction: true,
      context: 'generator',
    });
    if (counterRow.innerHTML.trim()) card.appendChild(counterRow);

    const actionBadge = scoreBox.querySelector('.counter-summary-badge--action');
    const openCounters = () => counterRow.querySelector('.counter-toggle-btn')?.click();
    actionBadge?.addEventListener('click', openCounters);
    actionBadge?.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      openCounters();
    });

    generatorResultsEl.appendChild(card);
  });
}

export function generateBestCombos() {
  const t = translations[currentLanguage] || translations.en;
  const selected = Array.from(generatorSelectedHeroes);

  if (selected.length < GENERATOR_MIN_HEROES) { 
    showGeneratorMessage(t.generatorMinHeroesMessage || `Select at least ${GENERATOR_MIN_HEROES} heroes to generate best combos.`);
    return;
  }

  setGeneratorBusy(true);
  const startedAt = performance.now();

  try {
    const sourceCombos = filterCombosForSkinMode(rankedCombos, generatorSkinsOnly, heroName => isGeneratorSkinOwned(heroName, generatorSelectedSeasons));
    const finalSelection = selectNonOverlappingCombos(sourceCombos, selected, GENERATOR_MAX_COMBOS);

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
    const sourceCombos = filterCombosForSkinMode(rankedCombos, generatorSkinsOnly, heroName => isGeneratorSkinOwned(heroName, generatorSelectedSeasons));
    const validCombos = sourceCombos
      .filter(combo => combo.heroes.every(h => ownedSet.has(h)))
      .map((combo, index, eligible) => {
        let rawScore = 100;
        if (eligible.length > 1) {
          rawScore = 100 - ((index / (eligible.length - 1)) * 99);
        }
        return {
          ...combo,
          originalIndex: index,
          displayScore: rawScore.toFixed(1),
        };
      });

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
      if (randomSelection.length >= GENERATOR_MAX_COMBOS) break;
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
