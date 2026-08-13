import { cssToken, debounce, escapeHtml } from './utils.js';
// js/app-generator.js
import { translations } from './translations.js';
import {
  rankedCombos,
  filterCombosForSkinMode,
  scoreComboByRank,
  selectNonOverlappingCombos,
} from './combos-db.js';
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
  generatorHeroesEl as heroesEl,
  generatorResultsEl as resultsEl,
  downloadGeneratorBtn,
} from './state.js';
import { callUi } from './ui-bridge.js';
import { comboSkinTypeText, comboToolsText } from './i18n/combo-tools/index.js';
import { formatLocaleNumber } from './locale-format.js';

export { lastGeneratedCombos };

let generatorSkinOwnership = null;
let generatorSelectionRestored = false;
let lastGeneratorRunMeta = null;

const GENERATOR_IDLE_LABEL_KEYS = Object.freeze({
  generateCombosBtn: 'generatorGenerateBtn',
  generateRandomBtn: 'generatorRandomBtn',
});

function comboCopy(id, values = {}) {
  return comboToolsText(id, values, currentLanguage);
}

function skinTypeCopy(type) {
  return comboSkinTypeText(type, currentLanguage);
}

function getSeasonIndex(season) {
  return HERO_ATLAS_ALL_SEASONS.indexOf(String(season || '').toUpperCase());
}

function getSeasonSortIndex(season) {
  const index = getSeasonIndex(season);
  return index < 0 ? Number.MAX_SAFE_INTEGER : index;
}

function getMaxSelectedSeasonIndex(seasons = []) {
  return (seasons || [])
    .map(getSeasonIndex)
    .filter((index) => index >= 0)
    .reduce((max, index) => Math.max(max, index), -1);
}

function isSkinSeasonAvailable(heroOrName, seasons = generatorSelectedSeasons) {
  const hero = typeof heroOrName === 'string' ? getSkinHeroByName(heroOrName) : heroOrName;
  if (!hero) return false;
  const releaseIndex = getSeasonIndex(hero.releaseSeason || hero.season);
  if (releaseIndex < 0) return false;
  return getMaxSelectedSeasonIndex(seasons) >= releaseIndex;
}

function normalizeStoredHeroList(value) {
  if (!Array.isArray(value)) return [];
  const validHeroNames = new Set(getGeneratorHeroPool(false).map((hero) => hero.name));
  return [...new Set(value)].filter((name) => typeof name === 'string' && validHeroNames.has(name));
}

export function restoreGeneratorSelection() {
  if (generatorSelectionRestored) return;
  generatorSelectionRestored = true;
  try {
    const raw = localStorage.getItem(GENERATOR_SELECTION_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    const heroes = parsed?._version === GENERATOR_SELECTION_VERSION ? parsed.heroes : parsed;
    normalizeStoredHeroList(heroes).forEach((name) => generatorSelectedHeroes.add(name));
  } catch {
    // Ignore stale or malformed local selections.
  }
}

export function persistGeneratorSelection() {
  try {
    localStorage.setItem(
      GENERATOR_SELECTION_STORAGE_KEY,
      JSON.stringify({
        _version: GENERATOR_SELECTION_VERSION,
        heroes: Array.from(generatorSelectedHeroes),
      })
    );
  } catch {
    // Local storage can fail in private browsing or quota exhaustion.
  }
}

const persistGeneratorSelectionDebounced = debounce(
  persistGeneratorSelection,
  GENERATOR_SELECTION_SAVE_MS
);

export function syncGeneratorSelectedCountBadge() {
  const countBadge = document.getElementById('genSelectedCount');
  if (!countBadge) return;
  const n = generatorSelectedHeroes.size;
  if (n > 0) {
    countBadge.textContent = comboCopy('generator.selected', { n });
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
  if (
    parsed?._version === GENERATOR_SKIN_OWNERSHIP_VERSION &&
    parsed.heroes &&
    typeof parsed.heroes === 'object'
  ) {
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
  if (Object.prototype.hasOwnProperty.call(ownership, heroName))
    return ownership[heroName] !== false;
  return hasSkin(heroName);
}

function setGeneratorSkinOwned(heroName, owned) {
  const ownership = getStoredSkinOwnership();
  ownership[heroName] = Boolean(owned);
  try {
    localStorage.setItem(
      GENERATOR_SKIN_OWNERSHIP_KEY,
      JSON.stringify({
        _version: GENERATOR_SKIN_OWNERSHIP_VERSION,
        heroes: ownership,
      })
    );
  } catch {
    // Ignore storage failures; the current render still reflects the click.
  }
}

function getGeneratorResultHeroImageUrl(heroName) {
  if (!generatorSkinsOnly || !isGeneratorSkinOwned(heroName, generatorSelectedSeasons))
    return getHeroImageUrl(heroName);
  return (
    getSkinHeroByName(heroName)?.skinImageUrl ||
    getSkinForHero(heroName)?.imageUrl ||
    getHeroImageUrl(heroName)
  );
}

function getStableSkinMotionValues(heroName, offset = 0) {
  const text = String(heroName || '');
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 31 + text.charCodeAt(i) + offset) % 9973;
  }
  return {
    delay: -((hash % 320) / 100),
    duration: 2.85 + (hash % 95) / 100,
    shift: ((hash % 7) - 3) * 0.45,
    scale: 1.015 + (hash % 5) * 0.006,
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
  if (skinGradient)
    el.style.setProperty('--skin-badge-bg', `linear-gradient(135deg, ${skinGradient})`);
}

function setGeneratorBusy(isBusy) {
  const t = translations[currentLanguage] || translations.en;
  ['generateCombosBtn', 'generateRandomBtn'].forEach((id) => {
    const btn = document.getElementById(id);
    if (!btn) return;
    const idleText = t[GENERATOR_IDLE_LABEL_KEYS[id]] || btn.dataset.idleText || btn.textContent;
    btn.dataset.idleText = idleText;
    if (isBusy) {
      btn.disabled = true;
      btn.setAttribute('aria-busy', 'true');
      btn.textContent = comboCopy('generator.generating');
    } else {
      btn.disabled = false;
      btn.removeAttribute('aria-busy');
      btn.textContent = idleText;
    }
  });
}

export function renderGeneratorHeroes(options = {}) {
  if (!heroesEl) return;
  const fragment = document.createDocumentFragment();
  const t = translations[currentLanguage] || translations.en;

  const activeSeasons = options.seasons || generatorSelectedSeasons;
  const activeStates = options.states || generatorSelectedStates;
  const activeTypes = options.types || generatorSelectedTypes;
  const activeSkinsOnly = options.skinsOnly ?? generatorSkinsOnly;
  const searchQuery = (document.getElementById('generatorHeroSearch')?.value || '')
    .trim()
    .toLowerCase();

  const pool = getGeneratorHeroPool(activeSkinsOnly);
  // Skin mode is the default view, so the grid keeps one stable seasonal order
  // instead of floating skinned heroes to the top.
  const filtered = pool
    .filter((h) => heroMatchesFilters(h, activeSeasons, activeStates, activeTypes))
    .filter((h) => !searchQuery || h.name.toLowerCase().includes(searchQuery))
    .sort((a, b) => {
      const aSeason = getSeasonSortIndex(a.season);
      const bSeason = getSeasonSortIndex(b.season);
      if (aSeason !== bSeason) return aSeason - bSeason;
      return a.name.localeCompare(b.name);
    });

  filtered.forEach((hero) => {
    const skinSeasonAvailable = isSkinSeasonAvailable(hero, activeSeasons);
    const hasSkinFlag =
      (activeSkinsOnly ? Boolean(hero.hasSkin || hasSkin(hero.name)) : hasSkin(hero.name)) &&
      skinSeasonAvailable;
    const skinOwned =
      activeSkinsOnly && hasSkinFlag && isGeneratorSkinOwned(hero.name, activeSeasons);
    const heroSkinsList = getHeroSkins(hero.name);
    const primarySkin =
      activeSkinsOnly && hasSkinFlag
        ? {
            name: hero.skinName || getSkinForHero(hero.name)?.name,
            type: hero.skinType || getSkinForHero(hero.name)?.type,
          }
        : getSkinForHero(hero.name);
    const skinCount = getSkinCount(hero.name);
    const skinTypeInfo =
      activeSkinsOnly && hasSkinFlag
        ? {
            label: hero.skinType || primarySkin?.type,
            color:
              hero.skinTypeColor ||
              (primarySkin ? (SKIN_TYPES[primarySkin.type] || SKIN_TYPES.Mythic).color : null),
            icon:
              hero.skinTypeIcon ||
              (primarySkin ? (SKIN_TYPES[primarySkin.type] || SKIN_TYPES.Mythic).icon : null),
          }
        : primarySkin
          ? SKIN_TYPES[primarySkin.type] || SKIN_TYPES.Mythic
          : null;
    const skinColors = heroSkinsList.length
      ? heroSkinsList.map((skin) => (SKIN_TYPES[skin.type] || SKIN_TYPES.Mythic).color)
      : Object.values(SKIN_TYPES).map((s) => s.color);
    const normalSkinBadgeColors =
      skinCount > 1
        ? skinColors.slice(0, skinCount).join(',')
        : `${skinColors[0] || '#f59e0b'},#fbbf24`;
    const portraitUrl = skinOwned ? hero.skinImageUrl || hero.imageUrl : hero.imageUrl;
    const skinPriorityClass = activeSkinsOnly
      ? skinOwned
        ? ' skin-priority-card skin-animated-portrait has-skin skin-owned'
        : ' skin-mode-card'
      : '';
    const card = document.createElement('div');
    card.className = `hero-card generator-card season-${cssToken(hero.season)}${skinPriorityClass} ${
      generatorSelectedHeroes.has(hero.name) ? 'generator-card-selected' : ''
    }`;
    if (skinOwned) applySkinMotion(card, hero.name);
    card.dataset.heroName = hero.name;
    card.dataset.heroSeason = hero.season;
    card.dataset.heroTroop = hero.Type;
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-pressed', generatorSelectedHeroes.has(hero.name) ? 'true' : 'false');
    const originTag =
      hero.releaseSeason && hero.releaseSeason !== hero.season
        ? `<span class="hero-origin-tag" title="${escapeHtml(comboCopy('builder.originalRelease', { season: hero.releaseSeason }))}">${escapeHtml(hero.releaseSeason)}</span>`
        : '';

    const skinBadgeTitle = escapeHtml(
      primarySkin
        ? `${primarySkin.name} (${skinTypeCopy(skinTypeInfo?.label || primarySkin.type)}) — ${skinOwned ? comboCopy('generator.skin') : comboCopy('generator.base')}`
        : comboCopy(
            skinCount === 1 ? 'generator.skinAvailableOne' : 'generator.skinAvailableMany',
            { n: skinCount }
          )
    );
    const skinIconLabel = skinTypeInfo?.icon || `S${skinCount > 1 ? skinCount : ''}`;
    const skinBadgeLabel = escapeHtml(
      skinOwned && skinTypeInfo ? skinTypeInfo.icon : `S${skinCount > 1 ? skinCount : ''}`
    );
    const skinBadgeVars = {
      skinColor: skinOwned && skinTypeInfo ? skinTypeInfo.color : skinColors[0] || '#f59e0b',
      skinGradient:
        skinOwned && skinTypeInfo ? `${skinTypeInfo.color}, #fbbf24` : normalSkinBadgeColors,
    };
    const skinBadge =
      hasSkinFlag && !activeSkinsOnly
        ? `<span class="generator-skin-badge${skinOwned ? ' generator-skin-badge--priority' : ''}" title="${skinBadgeTitle}">${skinBadgeLabel}</span>`
        : '';
    const skinToggle =
      activeSkinsOnly && hasSkinFlag
        ? `<span class="generator-skin-toggle${skinOwned ? ' generator-skin-badge--priority is-on' : ''}" role="switch" tabindex="0" aria-checked="${skinOwned ? 'true' : 'false'}" aria-label="${escapeHtml(comboCopy(skinOwned ? 'generator.turnOffSkin' : 'generator.turnOnSkin', { hero: hero.name }))}" title="${escapeHtml(comboCopy(skinOwned ? 'generator.usingSkin' : 'generator.usingBase'))}" data-skin-owned="${skinOwned ? 'true' : 'false'}"><span class="generator-skin-toggle-icon">${escapeHtml(skinIconLabel)}</span> <span class="generator-skin-toggle-state">${escapeHtml(comboCopy(skinOwned ? 'generator.skin' : 'generator.base'))}</span></span>`
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
        
        <button type="button" class="info-btn" aria-label="${escapeHtml((t.manualBuilderHeroInfoAria || 'View details for {hero}').replace('{hero}', hero.name))}" title="${escapeHtml((t.manualBuilderHeroInfoAria || 'View details for {hero}').replace('{hero}', hero.name))}">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="info-btn-svg" aria-hidden="true" focusable="false">
                <path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
            </svg>
        </button>

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
      } else {
        generatorSelectedHeroes.add(hero.name);
        card.classList.add('generator-card-selected');
        card.setAttribute('aria-pressed', 'true');
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
      infoBtn.addEventListener(
        'touchstart',
        (e) => {
          e.stopPropagation();
        },
        { passive: false }
      );
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
          skinsOnly: activeSkinsOnly,
        });
      };
      ['pointerdown', 'pointerup', 'touchstart'].forEach((eventName) => {
        skinToggleEl.addEventListener(
          eventName,
          (e) => {
            e.stopPropagation();
          },
          { passive: false }
        );
      });
      skinToggleEl.addEventListener('click', toggleSkin);
      skinToggleEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') toggleSkin(e);
      });
    }

    fragment.appendChild(card);
  });

  heroesEl.replaceChildren(fragment);

  let sourceNote = document.getElementById('heroesSourceNote2');
  if (!sourceNote) {
    sourceNote = document.createElement('div');
    sourceNote.id = 'heroesSourceNote2';
    sourceNote.className = 'generator-source-note';
    heroesEl.parentNode.appendChild(sourceNote);
  }
  sourceNote.textContent = getSourceCreditText();
}

export function renderGeneratorResults(bestCombos, meta = {}) {
  const t = translations[currentLanguage] || translations.en;
  const topScore = Math.max(
    1,
    ...bestCombos
      .map((combo) => Number.parseFloat(combo.displayScore))
      .filter((score) => Number.isFinite(score))
  );

  const countMessage = meta.countMessage || formatResultCount(bestCombos.length);
  const duration = Number.isFinite(meta.durationMs) ? `<span> · ${meta.durationMs} ms</span>` : '';
  const recovery = bestCombos.length
    ? ''
    : `<div class="generator-empty-state generator-recovery-state"><strong>${escapeHtml(meta.emptyMessage || t.generatorNoCombosAvailable || 'No ranked combos found.')}</strong><button type="button" class="selection-action-btn selection-action-btn--reset">${escapeHtml(t.genSelectTitle || 'Select Your Heroes')}</button></div>`;
  resultsEl.innerHTML = `<div class="generator-run-meta" aria-hidden="true">${escapeHtml(countMessage)}${duration}</div>${recovery}`;

  if (!bestCombos.length) {
    resultsEl
      .querySelector('.generator-recovery-state button')
      ?.addEventListener('click', focusHeroSelection);
    return;
  }

  bestCombos.forEach((combo, i) => {
    const card = document.createElement('div');
    card.className = `generated-combo-card${i === 0 ? ' generated-combo-card--top' : ''}`;
    card.style.setProperty('--result-delay', `${i * 70}ms`);

    const slots = document.createElement('div');
    slots.className = 'saved-combo-slots';

    combo.heroes.forEach((name) => {
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
      ? `<span class="counter-summary-badge counter-summary-badge--action" role="button" tabindex="0" title="${escapeHtml(comboCopy('generator.showCounterDetails'))}">${escapeHtml(comboCopy(counterCount === 1 ? 'generator.countersKnownOne' : 'generator.countersKnownMany', { n: counterCount }))} <span class="counter-summary-chevron" aria-hidden="true"></span></span>`
      : `<span class="counter-summary-badge counter-summary-badge--empty">${escapeHtml(comboCopy('generator.noKnownCounters'))}</span>`;
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
    counterRow.innerHTML = renderCountersToggle(
      combo.heroes,
      getComboRankInfo,
      getGeneratorResultHeroImageUrl,
      getCounterLabels(),
      {
        showEmpty: false,
        showUseAction: true,
        context: 'generator',
      }
    );
    if (counterRow.innerHTML.trim()) card.appendChild(counterRow);

    const actionBadge = scoreBox.querySelector('.counter-summary-badge--action');
    const openCounters = () => counterRow.querySelector('.counter-toggle-btn')?.click();
    actionBadge?.addEventListener('click', openCounters);
    actionBadge?.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      openCounters();
    });

    resultsEl.appendChild(card);
  });
}

function scrollBehavior() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
}

function focusHeroSelection() {
  const target =
    heroesEl?.querySelector('.generator-card-selected') ||
    document.getElementById('generatorHeroSearch') ||
    heroesEl;
  target?.focus({ preventScroll: true });
  target?.scrollIntoView({ behavior: scrollBehavior(), block: 'center' });
}

function formatResultCount(count) {
  const t = translations[currentLanguage] || translations.en;
  const key = count === 1 ? 'generatorFoundComboOne' : 'generatorFoundComboMany';
  const fallback = count === 1 ? 'Found {n} combo' : 'Found {n} combos';
  return (t[key] || fallback).replace('{n}', formatLocaleNumber(count, currentLanguage));
}

function updateGeneratorRunStatus(countMessage) {
  const liveStatus = document.getElementById('generatorRunStatus');
  if (liveStatus) liveStatus.textContent = countMessage;
}

function getSourceCombos() {
  return filterCombosForSkinMode(rankedCombos, generatorSkinsOnly, isGeneratorSkinOwned);
}

function selectRandomCombos(selected) {
  const owned = new Set(selected);
  const validCombos = getSourceCombos()
    .filter((combo) => combo.heroes.every((hero) => owned.has(hero)))
    .map((combo, index, eligible) => ({
      ...combo,
      originalIndex: index,
      displayScore: scoreComboByRank(index, eligible.length),
    }));

  for (let i = validCombos.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [validCombos[i], validCombos[j]] = [validCombos[j], validCombos[i]];
  }

  const combos = [];
  const usedHeroes = new Set();
  for (const combo of validCombos) {
    if (combos.length >= GENERATOR_MAX_COMBOS) break;
    if (combo.heroes.some((hero) => usedHeroes.has(hero))) continue;
    combos.push(combo);
    combo.heroes.forEach((hero) => usedHeroes.add(hero));
  }
  return combos.sort((a, b) => parseFloat(b.displayScore) - parseFloat(a.displayScore));
}

function runGenerator(min, messageKey, fallback, select) {
  const t = translations[currentLanguage] || translations.en;
  const selected = [...generatorSelectedHeroes];
  lastGeneratedCombos.length = 0;
  resultsEl.replaceChildren();
  downloadGeneratorBtn?.classList.add('hidden');

  let combos = [];
  let durationMs;
  const emptyMessage =
    selected.length < min
      ? t[messageKey] || fallback
      : t.generatorNoCombosAvailable || 'No ranked combos found.';
  const emptyMessageKey = selected.length < min ? messageKey : 'generatorNoCombosAvailable';
  const emptyMessageFallback = selected.length < min ? fallback : 'No ranked combos found.';
  if (selected.length >= min) {
    setGeneratorBusy(true);
    const startedAt = performance.now();
    try {
      combos = select(selected);
      durationMs = Math.max(1, Math.round(performance.now() - startedAt));
    } finally {
      setGeneratorBusy(false);
    }
  }

  const countMessage = formatResultCount(combos.length);
  lastGeneratedCombos.push(...combos);
  lastGeneratorRunMeta = { durationMs, emptyMessageKey, emptyMessageFallback };
  renderGeneratorResults(combos, { durationMs, emptyMessage, countMessage });
  updateGeneratorRunStatus(countMessage);
  downloadGeneratorBtn?.classList.toggle('hidden', combos.length === 0);
  resultsEl.setAttribute('tabindex', '-1');
  resultsEl.focus({ preventScroll: true });
  resultsEl.scrollIntoView({
    behavior: scrollBehavior(),
    block: 'start',
  });
}

export function generateBestCombos() {
  runGenerator(
    GENERATOR_MIN_HEROES,
    'generatorMinHeroesMessage',
    `Select at least ${GENERATOR_MIN_HEROES} heroes to generate best combos.`,
    (selected) => selectNonOverlappingCombos(getSourceCombos(), selected, GENERATOR_MAX_COMBOS)
  );
}

export function generateRandomCombos() {
  runGenerator(3, 'messagePleaseDrag3Heroes', 'Select at least 3 heroes!', selectRandomCombos);
}

export function restoreSharedGeneratorResults(combos) {
  const restored = Array.isArray(combos) ? combos : [];
  lastGeneratedCombos.length = 0;
  lastGeneratedCombos.push(...restored);
  lastGeneratorRunMeta = {
    durationMs: undefined,
    emptyMessageKey: 'generatorNoCombosAvailable',
    emptyMessageFallback: 'No ranked combos found.',
  };
  const countMessage = formatResultCount(restored.length);
  renderGeneratorResults(restored, { countMessage });
  updateGeneratorRunStatus(countMessage);
  downloadGeneratorBtn?.classList.toggle('hidden', restored.length === 0);
}

export function refreshGeneratorLocalization() {
  syncGeneratorSelectedCountBadge();
  const t = translations[currentLanguage] || translations.en;
  for (const [id, key] of Object.entries(GENERATOR_IDLE_LABEL_KEYS)) {
    const button = document.getElementById(id);
    const idleText = t[key];
    if (!button || !idleText) continue;
    button.dataset.idleText = idleText;
    if (button.getAttribute('aria-busy') !== 'true') button.textContent = idleText;
  }
  if (!resultsEl || !lastGeneratorRunMeta) return;
  const countMessage = formatResultCount(lastGeneratedCombos.length);
  const emptyMessage =
    t[lastGeneratorRunMeta.emptyMessageKey] || lastGeneratorRunMeta.emptyMessageFallback;
  renderGeneratorResults(lastGeneratedCombos, {
    durationMs: lastGeneratorRunMeta.durationMs,
    emptyMessage,
    countMessage,
  });
}
