import {
  currentLanguage,
  selectedSeasons,
  db,
  seasonColors,
  HERO_ATLAS_ALL_SEASONS,
  paidIconHtml,
  heroesSection,
  getTroopColorClass,
  getLocalizedTroop,
  getHeroImageUrl,
  getComboRankInfo,
  getCounterLabels,
} from './state.js';
import { translations } from './translations.js';
import { baseRankedCombos } from './combos-db.js';
import { heroesExtendedData } from './heroes-info.js';
import { allHeroesData } from './heroes-data.js';
import { heroBonusPoints } from './hero-bonuses.js';
import { escapeHtml } from './utils.js';
import { hasSkin, getHeroSkins, getSkinCount, getHeroHiddenPower, SKIN_TYPES } from './skins-db.js';
import {
  getActiveHeroAtlasLocale,
  heroContentText,
  heroSkillText,
  heroUi,
  loadHeroAtlasLocale,
  normalizeHeroAtlasLocale,
} from './i18n/hero-atlas/index.js';
import {
  HERO_SKILL_TERM_HELP as SKILL_TERM_TOOLTIPS,
  HERO_SKILL_TYPE_HELP as SKILL_TYPE_TOOLTIPS,
} from './i18n/hero-atlas/help-content.js';
import '../css/hero-atlas-detail-v14.css';

import {
  getCombosCounteredByHero,
  getCountersAgainstHero,
  renderCounterMatchupList,
  renderCountersToggle,
} from './combo-counters.js';

function getHeroFinalScore(heroName, autoRating) {
  const bonus = heroBonusPoints[heroName] || 0;
  return Math.min(100, Math.max(0, autoRating + bonus));
}

function getExactSkinAssetUrl(skin) {
  const imageUrl = String(skin?.imageUrl || '')
    .trim()
    .replace(/^\.\//, '');
  return /^assets\/skins\/[a-z0-9-]+\.webp$/i.test(imageUrl) ? imageUrl : null;
}

function preferredScrollBehavior() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
}

function normalizeHelpKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

const SKILL_TYPE_HELP_BY_KEY = Object.fromEntries(
  Object.entries(SKILL_TYPE_TOOLTIPS).map(([term, desc]) => [
    normalizeHelpKey(term),
    { term, desc },
  ])
);

const SKILL_TERM_HELP_BY_KEY = Object.fromEntries(
  Object.entries(SKILL_TERM_TOOLTIPS).map(([term, desc]) => [
    normalizeHelpKey(term),
    { term, desc },
  ])
);

function renderHelpChip(label, description, className = '') {
  const safeLabel = escapeHtml(String(label || ''));
  const safeDescription = escapeHtml(String(description || ''));
  return `<span class="skill-help-chip ${className}" tabindex="0" title="${safeDescription}" aria-label="${safeLabel}: ${safeDescription}" data-tooltip="${safeDescription}">${safeLabel}</span>`;
}

function renderSkillType(type, localizedType = heroContentText(type)) {
  const info = SKILL_TYPE_HELP_BY_KEY[normalizeHelpKey(type)];
  if (!info) return `<span class="detail-skill-type">${escapeHtml(localizedType)}</span>`;
  return `<span class="detail-skill-type detail-skill-type-help">${renderHelpChip(localizedType, heroContentText(info.desc), 'skill-help-chip--type')}</span>`;
}

function escapeRegExp(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function formatSkillText(text, localizedText = text) {
  let counter = 0;
  const tokens = {};
  const alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

  function tokenize(html) {
    const token = `_TK${alpha[counter++]}_`;
    tokens[token] = html;
    return token;
  }

  let formatted = escapeHtml(
    String(localizedText || '')
      .replace(/<\/?b>/gi, '')
      .replace(/<\/?u>/gi, '')
  );

  formatted = formatted.replace(/([+-]?\d+(?:\.\d+)?%)/g, (match) =>
    tokenize(`<span class="skill-value skill-value--percent">${match}</span>`)
  );

  formatted = formatted.replace(
    /(\d+\s*(?:turns|turn|rounds|round|times|time|layers|layer|roun|min|hr))/gi,
    (match) => tokenize(`<span class="skill-value skill-value--duration">${match}</span>`)
  );

  const localizedTermHelp = Object.values(SKILL_TERM_HELP_BY_KEY).map((info) => ({
    canonical: info.term,
    term: heroContentText(info.term),
    desc: heroContentText(info.desc),
  }));
  const localizedTermHelpByKey = Object.fromEntries(
    localizedTermHelp.map((info) => [normalizeHelpKey(info.term), info])
  );
  const termPattern = localizedTermHelp
    .map((info) => info.term)
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp)
    .join('|');

  if (termPattern) {
    const termRegex = new RegExp(`(^|[^\\p{L}\\p{N}])(${termPattern})(?=$|[^\\p{L}\\p{N}])`, 'giu');
    formatted = formatted.replace(termRegex, (match, prefix, term) => {
      const info = localizedTermHelpByKey[normalizeHelpKey(term)];
      if (!info) return match;
      return `${prefix}${tokenize(renderHelpChip(term, info.desc, 'skill-help-chip--term'))}`;
    });
  }

  formatted = formatted.replace(/(?<!&#)\b(\d+)\b/g, (match) =>
    tokenize(`<span class="skill-value skill-value--number">${match}</span>`)
  );

  for (const [token, html] of Object.entries(tokens)) {
    formatted = formatted.replace(token, html);
  }

  return formatted;
}

function renderHiddenPowerCard(hiddenPower) {
  if (!hiddenPower) return '';

  const progressText =
    Number.isFinite(hiddenPower.capturedVariants) && Number.isFinite(hiddenPower.totalVariants)
      ? heroUi('variantsCaptured', {
          captured: hiddenPower.capturedVariants,
          total: hiddenPower.totalVariants,
        })
      : '';

  const tiersHtml = (hiddenPower.tiers || [])
    .map(
      (tier) => `
    <div class="detail-skin-hidden-tier">
      <div class="detail-skin-hidden-tier-mark">x${escapeHtml(String(tier.collected))}</div>
      <div class="detail-skin-hidden-tier-body">
        <div class="detail-skin-hidden-tier-name">${escapeHtml(heroContentText(tier.name))}</div>
        <p class="detail-skin-hidden-tier-effect">${escapeHtml(heroContentText(tier.effect))}</p>
        ${
          tier.stats
            ? `<div class="detail-skin-hidden-stats">
          ${tier.stats
            .map(
              (stat) => `
            <span class="detail-skin-hidden-stat">
              <span>${escapeHtml(heroContentText(stat.label))}</span>
              <strong>${escapeHtml(stat.value)}</strong>
            </span>
          `
            )
            .join('')}
        </div>`
            : ''
        }
      </div>
    </div>
  `
    )
    .join('');

  return `
    <div class="detail-skin-card detail-skin-hidden-power-card">
      <div class="detail-skin-hidden-head">
        <div>
          <div class="detail-skin-hidden-kicker">${escapeHtml(heroUi('limitedHeroMechanic'))}</div>
          <div class="detail-skin-hidden-title">${escapeHtml(heroContentText(hiddenPower.title || 'Biography: Hidden Power'))}</div>
        </div>
        ${progressText ? `<span class="detail-skin-hidden-progress">${escapeHtml(progressText)}</span>` : ''}
      </div>
      ${hiddenPower.requirement ? `<div class="detail-skin-hidden-requirement">${escapeHtml(heroContentText(hiddenPower.requirement))}</div>` : ''}
      ${hiddenPower.mechanic ? `<p class="detail-skin-hidden-copy">${escapeHtml(heroContentText(hiddenPower.mechanic))}</p>` : ''}
      ${tiersHtml}
      ${hiddenPower.scalingNote ? `<p class="detail-skin-hidden-note">${escapeHtml(heroContentText(hiddenPower.scalingNote))}</p>` : ''}
    </div>`;
}

const _heroSeasonByName = new Map(allHeroesData.map((h) => [h.name, h.season]));
const HERO_SEASON_INDEX = Object.fromEntries(HERO_ATLAS_ALL_SEASONS.map((s, i) => [s, i]));

function getHeroSeason(name) {
  return _heroSeasonByName.get(name) || null;
}

function getSeasonIndex(season) {
  return HERO_SEASON_INDEX[season] ?? -1;
}

function comboFitsHeroSeasonScope(combo, anchorHeroName, selectedSeasons, scope) {
  if (!combo?.heroes?.includes(anchorHeroName)) return false;
  if (scope === 'all') return true;

  const anchorSeason = getHeroSeason(anchorHeroName);
  if (!anchorSeason) return false;
  const capIdx = getSeasonIndex(anchorSeason);
  const seasonSet = new Set(normalizeHeroAtlasSeasons(selectedSeasons));

  return combo.heroes.every((hn) => {
    const hs = getHeroSeason(hn);
    if (!hs) return false;
    if (getSeasonIndex(hs) > capIdx) return false;
    if (hs === 'S0') return true;
    return seasonSet.has(hs);
  });
}

function getHeroAtlasCombos(heroName, state, limit = 5) {
  const scope = state.comboScope || 'season-capped';
  const eligible = baseRankedCombos.filter((c) =>
    comboFitsHeroSeasonScope(c, heroName, state.seasons, scope)
  );
  const total = eligible.length;
  return eligible
    .map((c, i) => ({
      heroes: c.heroes,
      rank: i + 1,
      score: (total > 1 ? 100 - (i / (total - 1)) * 99 : 100).toFixed(1),
    }))
    .slice(0, limit);
}

function getSynergies(heroName, state = _heroesTabState) {
  const scope = state.comboScope || 'season-capped';
  const containingCombos = baseRankedCombos.filter((c) =>
    comboFitsHeroSeasonScope(c, heroName, state.seasons, scope)
  );
  const top5 = containingCombos.slice(0, 5);
  if (top5.length === 0) return [];

  const counts = {};
  top5.forEach((combo) => {
    combo.heroes.forEach((h) => {
      if (h !== heroName) counts[h] = (counts[h] || 0) + 1;
    });
  });

  const sortedPartners = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map((entry) => entry[0]);

  return sortedPartners.slice(0, 3);
}

// ─── HEROES TAB: detail view + auto-ranking ───────────────────────────────────
function computeHeroRankings() {
  const total = baseRankedCombos.length;
  const stats = {};

  allHeroesData.forEach((hero) => {
    stats[hero.name] = { appearances: 0, weightedScore: 0, topComboRank: Infinity };
  });

  baseRankedCombos.forEach((combo, idx) => {
    const score = total > 1 ? 100 - (idx / (total - 1)) * 99 : 100;
    (combo.heroes || []).forEach((heroName) => {
      const s = stats[heroName];
      if (s) {
        s.appearances++;
        s.weightedScore += score;
        if (idx + 1 < s.topComboRank) s.topComboRank = idx + 1;
      }
    });
  });

  allHeroesData.forEach((h) => {
    const s = stats[h.name];
    let autoRating =
      s.appearances > 0
        ? (s.weightedScore / s.appearances) * 0.6 + (s.appearances / total) * 100 * 0.4
        : 0;
    s.autoRating = autoRating;
    s.finalRating = getHeroFinalScore(h.name, autoRating);
  });

  return stats;
}

let _heroesTabState = {
  seasons: [...HERO_ATLAS_ALL_SEASONS],
  troop: 'all',
  state: 'all',
  search: '',
  selected: null,
  view: 'ranking',
  comboScope: 'season-capped',
  sort: 'rating',
  limit: 20,
};
let _heroesTabEventsWired = false;
let _heroesSearchTimer = null;
let _heroesUrlParamsApplied = false;
let _heroesDetailFocusRequested = false;
let _heroesReturnFocusName = null;
let _heroLocaleRefreshToken = 0;

async function refreshHeroAtlasLocale(locale = currentLanguage) {
  const normalized = normalizeHeroAtlasLocale(locale);
  const token = ++_heroLocaleRefreshToken;
  await loadHeroAtlasLocale(normalized);
  if (
    token !== _heroLocaleRefreshToken ||
    normalized !== normalizeHeroAtlasLocale(currentLanguage)
  )
    return;
  if (getActiveHeroAtlasLocale() !== normalized) {
    renderHeroesTab({ suppressLocaleRefresh: true });
    return;
  }
  renderHeroesTab();
}

function normalizeTroopParam(value) {
  const v = String(value || '')
    .trim()
    .toLowerCase();
  if (!v || v === 'all') return 'all';
  if (v.startsWith('arch')) return 'Archers';
  if (v.startsWith('foot')) return 'Footmen';
  if (v.startsWith('cav')) return 'Cavalry';
  return 'all';
}

function applyHeroAtlasUrlParams() {
  if (_heroesUrlParamsApplied) return;
  _heroesUrlParamsApplied = true;
  const params = new URLSearchParams(window.location.search);
  const seasonParam = params.get('season') || params.get('seasons');
  if (seasonParam) {
    const seasons = seasonParam
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter((s) => HERO_ATLAS_ALL_SEASONS.includes(s));
    if (seasons.length) _heroesTabState.seasons = seasons;
  }
  if (params.has('troop')) _heroesTabState.troop = normalizeTroopParam(params.get('troop'));
  if (params.has('state')) {
    const state = params.get('state');
    _heroesTabState.state = ['Free', 'Paid'].includes(state) ? state : 'all';
  }
  const search = params.get('heroSearch') || params.get('search') || '';
  if (search) _heroesTabState.search = search;
  const selected = params.get('hero');
  if (selected && allHeroesData.some((h) => h.name.toLowerCase() === selected.toLowerCase())) {
    _heroesTabState.selected = allHeroesData.find(
      (h) => h.name.toLowerCase() === selected.toLowerCase()
    ).name;
  }
}

function updateHeroAtlasUrlParams() {
  const params = new URLSearchParams(window.location.search);
  const normalizedSeasons = normalizeHeroAtlasSeasons(_heroesTabState.seasons);
  if (normalizedSeasons.length === HERO_ATLAS_ALL_SEASONS.length) params.delete('season');
  else params.set('season', normalizedSeasons.join(','));

  if (_heroesTabState.troop === 'all') params.delete('troop');
  else params.set('troop', _heroesTabState.troop.toLowerCase());

  if (_heroesTabState.state === 'all') params.delete('state');
  else params.set('state', _heroesTabState.state);

  if ((_heroesTabState.search || '').trim()) params.set('search', _heroesTabState.search.trim());
  else params.delete('search');

  if (_heroesTabState.selected) params.set('hero', _heroesTabState.selected);
  else params.delete('hero');

  const next = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}${window.location.hash}`;
  window.history.replaceState(null, '', next);
}

function normalizeHeroAtlasSeasons(seasons) {
  const picked = HERO_ATLAS_ALL_SEASONS.filter((s) => (seasons || []).includes(s));
  return picked.length ? picked : [...HERO_ATLAS_ALL_SEASONS];
}

function getFilteredHeroes(state = _heroesTabState) {
  const { seasons, troop, state: heroState, search } = state;
  const q = (search || '').trim().toLowerCase();
  const seasonSet = new Set(normalizeHeroAtlasSeasons(seasons));
  let filtered = allHeroesData.filter((h) => seasonSet.has(h.season));
  if (troop !== 'all') filtered = filtered.filter((h) => h.Type === troop || h.Type === 'All');
  if (heroState !== 'all') filtered = filtered.filter((h) => h.State === heroState);
  if (q) filtered = filtered.filter((h) => h.name.toLowerCase().includes(q));
  return filtered;
}

function getSortedHeroes(heroes, stats, sort = _heroesTabState.sort) {
  return [...heroes].sort((a, b) => {
    const aStats = stats[a.name] || {};
    const bStats = stats[b.name] || {};
    if (sort === 'appearances') {
      return (bStats.appearances || 0) - (aStats.appearances || 0) || a.name.localeCompare(b.name);
    }
    if (sort === 'best-rank') {
      const aRank =
        aStats.topComboRank === Infinity
          ? Number.MAX_SAFE_INTEGER
          : aStats.topComboRank || Number.MAX_SAFE_INTEGER;
      const bRank =
        bStats.topComboRank === Infinity
          ? Number.MAX_SAFE_INTEGER
          : bStats.topComboRank || Number.MAX_SAFE_INTEGER;
      return aRank - bRank || a.name.localeCompare(b.name);
    }
    if (sort === 'name') {
      return a.name.localeCompare(b.name);
    }
    return (bStats.finalRating || 0) - (aStats.finalRating || 0) || a.name.localeCompare(b.name);
  });
}

function csvCell(value) {
  const raw = value == null ? '' : String(value);
  return /[",\n]/.test(raw) ? `"${raw.replace(/"/g, '""')}"` : raw;
}

function exportHeroAtlasCsv() {
  const stats = computeHeroRankings();
  const rows = getSortedHeroes(getFilteredHeroes(), stats);
  const header = [
    heroUi('name'),
    heroUi('season'),
    `${heroUi('original')} ${heroUi('season')}`,
    heroUi('troop'),
    heroUi('state'),
    heroUi('rating'),
    heroUi('appearances'),
    heroUi('bestRank'),
    heroUi('skins'),
  ];
  const lines = [header.map(csvCell).join(',')];
  rows.forEach((hero) => {
    const s = stats[hero.name] || {};
    lines.push(
      [
        hero.name,
        hero.season,
        hero.releaseSeason || '',
        getLocalizedTroop(hero.Type),
        heroUi(hero.State === 'Paid' ? 'paid' : 'free'),
        s.finalRating > 0 ? Math.min(100, s.finalRating).toFixed(1) : '',
        s.appearances || 0,
        s.topComboRank !== Infinity ? s.topComboRank : '',
        getSkinCount(hero.name),
      ]
        .map(csvCell)
        .join(',')
    );
  });
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `hero-atlas-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  if (typeof window.showToast === 'function') {
    window.showToast(heroUi('exportedHeroes', { n: rows.length }), 'success');
  }
}

function heroesFiltersActive(state = _heroesTabState) {
  const { seasons, troop, state: heroState, search } = state;
  const normalized = normalizeHeroAtlasSeasons(seasons);
  const allSeasonsSelected = normalized.length === HERO_ATLAS_ALL_SEASONS.length;
  return !allSeasonsSelected || troop !== 'all' || heroState !== 'all' || !!(search || '').trim();
}

function toggleHeroAtlasSeason(seasonKey) {
  if (seasonKey === 'all') {
    _heroesTabState.seasons = [...HERO_ATLAS_ALL_SEASONS];
    return;
  }
  const set = new Set(normalizeHeroAtlasSeasons(_heroesTabState.seasons));
  if (set.has(seasonKey)) set.delete(seasonKey);
  else set.add(seasonKey);
  _heroesTabState.seasons = set.size
    ? HERO_ATLAS_ALL_SEASONS.filter((s) => set.has(s))
    : [...HERO_ATLAS_ALL_SEASONS];
}

function syncHeroSelectionWithFilters() {
  if (!_heroesTabState.selected) return;
  const filtered = getFilteredHeroes();
  if (!filtered.some((h) => h.name === _heroesTabState.selected)) {
    _heroesTabState.selected = null;
  }
}

function selectHeroInAtlas(name) {
  if (!name) return;
  const isClosing = _heroesTabState.selected === name;
  _heroesDetailFocusRequested = !isClosing;
  _heroesReturnFocusName = isClosing ? name : null;
  _heroesTabState.selected = isClosing ? null : name;
  updateHeroAtlasUrlParams();
  renderHeroesTab();
}

function wireHeroesTabEvents(container) {
  if (_heroesTabEventsWired || !container) return;
  _heroesTabEventsWired = true;

  container.addEventListener('click', (e) => {
    const seasonBtn = e.target.closest('[data-hero-season]');
    if (seasonBtn) {
      toggleHeroAtlasSeason(seasonBtn.dataset.heroSeason);
      syncHeroSelectionWithFilters();
      updateHeroAtlasUrlParams();
      renderHeroesTab();
      return;
    }

    const troopBtn = e.target.closest('[data-hero-troop]');
    if (troopBtn) {
      _heroesTabState.troop = troopBtn.dataset.heroTroop;
      syncHeroSelectionWithFilters();
      updateHeroAtlasUrlParams();
      renderHeroesTab();
      return;
    }

    const stateBtn = e.target.closest('[data-hero-state]');
    if (stateBtn) {
      _heroesTabState.state = stateBtn.dataset.heroState;
      syncHeroSelectionWithFilters();
      updateHeroAtlasUrlParams();
      renderHeroesTab();
      return;
    }

    const clearBtn = e.target.closest('[data-heroes-clear-filters]');
    if (clearBtn) {
      _heroesTabState.seasons = [...HERO_ATLAS_ALL_SEASONS];
      _heroesTabState.troop = 'all';
      _heroesTabState.state = 'all';
      _heroesTabState.search = '';
      _heroesTabState.sort = 'rating';
      _heroesTabState.limit = 20;
      syncHeroSelectionWithFilters();
      updateHeroAtlasUrlParams();
      renderHeroesTab();
      return;
    }

    const rankRow = e.target.closest('[data-hero-name]');
    if (rankRow) {
      selectHeroInAtlas(rankRow.dataset.heroName);
      return;
    }

    const scopeBtn = e.target.closest('[data-combo-scope]');
    if (scopeBtn) {
      _heroesTabState.comboScope = scopeBtn.dataset.comboScope;
      renderHeroesTab();
      return;
    }

    const pickHero = e.target.closest('[data-hero-pick]');
    if (pickHero) {
      e.stopPropagation();
      _heroesDetailFocusRequested = true;
      _heroesReturnFocusName = null;
      _heroesTabState.selected = pickHero.dataset.heroPick;
      updateHeroAtlasUrlParams();
      renderHeroesTab();
      return;
    }

    if (e.target.closest('[data-hero-close]')) {
      _heroesReturnFocusName = _heroesTabState.selected;
      _heroesDetailFocusRequested = false;
      _heroesTabState.selected = null;
      updateHeroAtlasUrlParams();
      renderHeroesTab();
      return;
    }

    const sectionBtn = e.target.closest('[data-detail-section]');
    if (sectionBtn) {
      const target = container.querySelector(`#detail-section-${sectionBtn.dataset.detailSection}`);
      target?.scrollIntoView({ behavior: preferredScrollBehavior(), block: 'start' });
      container.querySelectorAll('[data-detail-section]').forEach((btn) => {
        const isActive = btn === sectionBtn;
        btn.classList.toggle('active', isActive);
        if (isActive) btn.setAttribute('aria-current', 'location');
        else btn.removeAttribute('aria-current');
      });
      return;
    }

    if (e.target.closest('.hero-tab-show-more')) {
      _heroesTabState.limit += 20;
      renderHeroesTab();
      return;
    }

    if (e.target.closest('[data-heroes-export]')) {
      exportHeroAtlasCsv();
      return;
    }
  });

  container.addEventListener('change', (e) => {
    if (e.target.id !== 'heroesSortSelect') return;
    _heroesTabState.sort = e.target.value;
    _heroesTabState.limit = 20;
    updateHeroAtlasUrlParams();
    renderHeroesTab();
  });

  container.addEventListener('input', (e) => {
    if (e.target.id !== 'heroesTabSearch') return;
    clearTimeout(_heroesSearchTimer);
    _heroesSearchTimer = setTimeout(() => {
      _heroesTabState.search = e.target.value;
      _heroesTabState.limit = 20;
      syncHeroSelectionWithFilters();
      updateHeroAtlasUrlParams();
      renderHeroesTab();
    }, 180);
  });

  container.addEventListener(
    'error',
    (event) => {
      const image = event.target;
      if (image?.matches?.('img[data-skin-art]')) {
        image.hidden = true;
        const artFrame = image.closest('[data-skin-art-frame]');
        artFrame?.classList.add('is-missing');
        artFrame
          ?.closest('.detail-skin-showcase')
          ?.classList.add('detail-skin-showcase--text-only');
        return;
      }
      if (!image?.matches?.('img[data-fallback-src]')) return;
      const fallbackSrc = image.dataset.fallbackSrc;
      image.removeAttribute('data-fallback-src');
      if (fallbackSrc) image.src = fallbackSrc;
    },
    true
  );

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !_heroesTabState.selected) return;
    if (document.getElementById('heroesSection')?.classList.contains('hidden')) return;
    _heroesReturnFocusName = _heroesTabState.selected;
    _heroesDetailFocusRequested = false;
    _heroesTabState.selected = null;
    updateHeroAtlasUrlParams();
    renderHeroesTab();
  });
}

function renderHeroesTab({ suppressLocaleRefresh = false } = {}) {
  const container = document.getElementById('heroesTabContent');
  if (!container) return;
  if (
    !suppressLocaleRefresh &&
    getActiveHeroAtlasLocale() !== normalizeHeroAtlasLocale(currentLanguage)
  ) {
    void refreshHeroAtlasLocale(currentLanguage);
  }
  applyHeroAtlasUrlParams();

  wireHeroesTabEvents(container);

  const searchHadFocus = document.activeElement?.id === 'heroesTabSearch';
  const searchCaret = document.getElementById('heroesTabSearch')?.selectionStart ?? null;

  const stats = computeHeroRankings();
  const {
    seasons: selectedSeasons,
    troop,
    state,
    search,
    selected,
    view,
    comboScope,
    sort,
  } = _heroesTabState;
  const t = translations[currentLanguage] || translations.en;

  const troops = ['all', 'Archers', 'Footmen', 'Cavalry'];
  const states = ['all', 'Free', 'Paid'];
  const filtered = getFilteredHeroes();
  const filtersActive = heroesFiltersActive();
  const normalizedSeasons = normalizeHeroAtlasSeasons(selectedSeasons);
  const allSeasonsSelected = normalizedSeasons.length === HERO_ATLAS_ALL_SEASONS.length;

  const seasonTabsHtml = `
    <button type="button" class="hero-tab-season ${allSeasonsSelected ? 'active' : ''}" data-hero-season="all" aria-pressed="${allSeasonsSelected}" title="${escapeHtml(heroUi('selectAllSeasons'))}">
      ${escapeHtml(heroUi('all'))}
    </button>
    ${HERO_ATLAS_ALL_SEASONS.map(
      (s) => `
    <button type="button" class="hero-tab-season ${normalizedSeasons.includes(s) ? 'active' : ''}" data-hero-season="${s}" aria-pressed="${normalizedSeasons.includes(s)}"
      ${seasonColors[s] ? `style="--sc:${seasonColors[s]}"` : ''}>
      ${s}
    </button>`
    ).join('')}`;

  const troopPillsHtml = troops
    .map(
      (tr) => `
    <button type="button" class="heroes-filter-pill ${troop === tr ? 'active' : ''}" data-hero-troop="${tr}" aria-pressed="${troop === tr}">
      ${tr === 'all' ? escapeHtml(heroUi('allTroops')) : getLocalizedTroop(tr)}
    </button>`
    )
    .join('');

  const statePillsHtml = states
    .map(
      (st) => `
    <button type="button" class="heroes-filter-pill ${state === st ? 'active' : ''}" data-hero-state="${st}" aria-pressed="${state === st}">
      ${escapeHtml(st === 'all' ? heroUi('all') : heroUi(st === 'Free' ? 'free' : 'paid'))}
    </button>`
    )
    .join('');

  if (view === 'ranking') {
    const ranked = getSortedHeroes(filtered, stats, sort);

    const visibleRanked = ranked.slice(0, _heroesTabState.limit);
    const rowsHtml = visibleRanked.length
      ? visibleRanked
          .map((hero, i) => {
            const s = stats[hero.name] || {};
            const finalPct = Math.min(100, s.finalRating || 0).toFixed(0);
            const tagColor = seasonColors[hero.season] || '#f97316';
            const podiumClass =
              i === 0
                ? ' rank-medal--gold'
                : i === 1
                  ? ' rank-medal--silver'
                  : i === 2
                    ? ' rank-medal--bronze'
                    : '';
            const rankNumber = `${i + 1}`;
            const rankClass = `rank-medal rank-medal--num${podiumClass}`;
            return `
        <button type="button" class="hero-rank-row ${selected === hero.name ? 'selected' : ''}" data-hero-name="${escapeHtml(hero.name)}" aria-pressed="${selected === hero.name}">
          <span class="${rankClass}">${rankNumber}</span>
          <img class="rank-img" src="${escapeHtml(hero.imageUrl)}" alt="${escapeHtml(hero.name)}" width="36" height="36" loading="lazy" decoding="async" data-fallback-src="images/logo.png">
          <span class="rank-info">
            <span class="rank-name">
              ${escapeHtml(hero.name)}
              ${hero.State === 'Paid' ? paidIconHtml() : ''}
            </span>
            <span class="rank-meta">
              <span style="color:${tagColor};font-weight:800;">${hero.season}</span>
              ${hero.releaseSeason && hero.releaseSeason !== hero.season ? `<span class="rank-apps">${escapeHtml(heroUi('original'))} ${escapeHtml(hero.releaseSeason)}</span>` : ''}
              <span class="rank-troop ${getTroopColorClass(hero.Type)}">${getLocalizedTroop(hero.Type)}</span>
              ${s.appearances ? `<span class="rank-apps">${escapeHtml(heroUi(s.appearances === 1 ? 'comboOne' : 'comboMany', { n: s.appearances }))}</span>` : `<span class="rank-apps rank-apps-zero">${escapeHtml(heroUi('notRanked'))}</span>`}
            </span>
            <span class="rank-bar-wrap">
              <span class="rank-bar" style="width:${finalPct}%;background:${tagColor};"></span>
            </span>
          </span>
          <span class="rank-score ${s.finalRating > 0 ? 'has-score' : 'no-score'}">${s.finalRating > 0 ? finalPct : '—'}</span>
        </button>`;
          })
          .join('')
      : `<p class="hero-atlas-empty">${escapeHtml(heroUi('noHeroesMatch'))}</p>`;

    const showMoreHtml =
      ranked.length > _heroesTabState.limit
        ? `
      <div class="hero-tab-show-more-wrap">
        <button type="button" class="hero-tab-show-more">
          ${escapeHtml(heroUi('showMore'))} (${ranked.length - _heroesTabState.limit} ${escapeHtml(heroUi('remaining'))})
        </button>
      </div>`
        : '';

    let detailHtml = '';
    if (selected) {
      const hero = allHeroesData.find((h) => h.name === selected);
      const ext = heroesExtendedData[selected];
      const s = stats[selected] || {};
      const tagColor = hero ? seasonColors[hero.season] || '#f97316' : '#f97316';
      const synergies = getSynergies(selected, _heroesTabState);
      const heroCombos = getHeroAtlasCombos(selected, _heroesTabState);
      const comboScopeHint =
        comboScope === 'season-capped'
          ? (
              t.heroesComboScopeHint ||
              'Combos using heroes up to {season} within your season filters.'
            ).replace('{season}', hero?.season || '')
          : t.heroesComboScopeAllHint || 'All ranked combos from the full database.';
      const heroCounterWins = getCombosCounteredByHero(selected);
      const heroCounterLosses = getCountersAgainstHero(selected);
      const hasHeroCounters = heroCounterWins.length > 0 || heroCounterLosses.length > 0;
      const counterLimit = 6;
      const renderCounterCount = (count) =>
        heroUi(count === 1 ? 'pathOne' : 'pathMany', {
          n: `${Math.min(count, counterLimit)}${count > counterLimit ? ` / ${count}` : ''}`,
        });
      const heroCountersHtml = hasHeroCounters
        ? `
        <div class="hero-counter-section-grid">
          <section class="hero-counter-column" aria-labelledby="hero-counter-wins-title">
            <div class="hero-counter-column-head">
              <h5 id="hero-counter-wins-title" class="hero-counter-subhead">${escapeHtml(heroUi('thisHeroCounters'))}</h5>
              <span class="hero-counter-count">${renderCounterCount(heroCounterWins.length)}</span>
            </div>
            ${renderCounterMatchupList(
              heroCounterWins,
              getComboRankInfo,
              getHeroImageUrl,
              getCounterLabels(),
              {
                limit: counterLimit,
                label: heroUi('counterPath'),
                targetLabel: heroUi('target'),
                counterLabel: heroUi('counterLineup'),
                emptyText: heroUi('noKnownLineups'),
              }
            )}
          </section>
          <section class="hero-counter-column" aria-labelledby="hero-counter-losses-title">
            <div class="hero-counter-column-head">
              <h5 id="hero-counter-losses-title" class="hero-counter-subhead">${escapeHtml(heroUi('counteredBy'))}</h5>
              <span class="hero-counter-count">${renderCounterCount(heroCounterLosses.length)}</span>
            </div>
            ${renderCounterMatchupList(
              heroCounterLosses,
              getComboRankInfo,
              getHeroImageUrl,
              getCounterLabels(),
              {
                limit: counterLimit,
                label: heroUi('threat'),
                targetLabel: heroUi('heroLineup'),
                counterLabel: heroUi('counterLineup'),
                emptyText: heroUi('noKnownCounters'),
              }
            )}
          </section>
        </div>`
        : '';

      const combosHtml = heroCombos
        .map(
          (c) => `
        <article class="detail-combo-row" aria-label="${escapeHtml(heroUi('comboRankAria', { rank: c.rank, score: parseFloat(c.score).toFixed(1) }))}">
          <div class="detail-combo-top">
            <span class="detail-combo-rank">#${c.rank}</span>
            <div class="detail-combo-scorebox">
              <span class="detail-combo-score-lbl">${escapeHtml(heroUi('score'))}</span>
              <span class="detail-combo-score">${parseFloat(c.score).toFixed(1)}</span>
            </div>
          </div>
          <div class="detail-combo-heroes">
            ${c.heroes
              .map(
                (hn) => `
              <button type="button" class="detail-combo-hero${hn === selected ? ' is-viewed' : ''}" data-hero-pick="${escapeHtml(hn)}" title="${escapeHtml(hn)}">
                <img src="${escapeHtml(getHeroImageUrl(hn))}" alt="${escapeHtml(hn)}" width="48" height="48" loading="lazy" decoding="async">
                <span>${escapeHtml(hn)}</span>
              </button>`
              )
              .join('')}
          </div>
          ${renderCountersToggle(c.heroes, getComboRankInfo, getHeroImageUrl, getCounterLabels())}
        </article>`
        )
        .join('');

      const skillsHtml = ext
        ? ext.skills
            .map((sk) => {
              const canonicalTarget = String(sk.target || 'Target not captured');
              const skillTarget =
                heroSkillText(selected, sk, 'target') || heroUi('targetNotCaptured');
              const skillType = heroSkillText(selected, sk, 'type');
              const skillDescription = heroSkillText(selected, sk, 'desc');
              const targetClass = canonicalTarget.toLowerCase().includes('enemy')
                ? 'enemy'
                : 'ally';
              return `
        <article class="detail-skill" aria-label="${escapeHtml(heroUi('skill'))} ${escapeHtml(String(sk.id))}">
          <div class="detail-skill-rail" aria-hidden="true">${escapeHtml(String(sk.id).padStart(2, '0'))}</div>
          <div class="detail-skill-body">
            <div class="detail-skill-header">
              <span class="detail-skill-id">${escapeHtml(heroUi('skill'))} ${escapeHtml(String(sk.id))}</span>
              ${renderSkillType(sk.type, skillType)}
              ${sk.range && sk.range !== '-' ? `<span class="detail-skill-range">${escapeHtml(heroUi('range'))} ${escapeHtml(String(sk.range))}</span>` : ''}
            </div>
            <p class="detail-skill-target ${targetClass}">${escapeHtml(skillTarget)}</p>
            <p class="detail-skill-desc">${formatSkillText(sk.desc, skillDescription)}</p>
          </div>
        </article>`;
            })
            .join('')
        : `<p class="hero-detail-empty">${escapeHtml(heroUi('skillDataUnavailable'))}</p>`;

      const heroSkinsList = getHeroSkins(selected);
      const hiddenPower = getHeroHiddenPower(selected);
      const hiddenPowerHtml = renderHiddenPowerCard(hiddenPower);
      const skinsHtml =
        heroSkinsList.length > 0
          ? heroSkinsList
              .map((skin) => {
                const typeInfo = SKIN_TYPES[skin.type] || SKIN_TYPES.Mythic;
                const ba = skin.bioAttributes || {};
                const mba = skin.maxBioAttributes || {};
                const skinAssetUrl = getExactSkinAssetUrl(skin);
                const skinMeta = [
                  skin.rarity && skin.rarity !== skin.type ? skin.rarity : null,
                  skin.combatStyle,
                  skin.troopType,
                ].filter(Boolean);
                const inheritingSkillRef = skin.inheritingSkill?.replacesSlot
                  ? `${heroUi('skill')} ${skin.inheritingSkill.replacesSlot}`
                  : heroUi('baseSkill');
                const inheritingFrom = skin.inheritingSkill?.fromSkill || inheritingSkillRef;
                const inheritingName = skin.inheritingSkill?.name || heroUi('inheritingSkill');
                return `
        <article class="detail-skin-card" style="--skin-accent:${escapeHtml(typeInfo.color)}">
          <div class="detail-skin-showcase${skinAssetUrl ? '' : ' detail-skin-showcase--text-only'}">
            ${
              skinAssetUrl
                ? `
            <figure class="detail-skin-art" data-skin-art-frame>
              <span class="detail-skin-art-halo" aria-hidden="true"></span>
              <img src="${escapeHtml(skinAssetUrl)}" alt="${escapeHtml(heroUi('skinIconAlt', { hero: selected, skin: skin.name }))}" width="144" height="144" loading="lazy" decoding="async" data-skin-art>
            </figure>`
                : ''
            }
            <div class="detail-skin-intro">
              <div class="detail-skin-kicker">${escapeHtml(t.heroesBioSkinsTitle || 'Bio Skins')}</div>
              <div class="detail-skin-header">
                <h5 class="detail-skin-name">${escapeHtml(skin.name)}</h5>
                <span class="detail-skin-type" style="color:${escapeHtml(typeInfo.color)};border-color:${escapeHtml(typeInfo.color)}">${escapeHtml(heroContentText(typeInfo.label || skin.type))}</span>
              </div>
              ${skin.title ? `<p class="detail-skin-title">${escapeHtml(heroContentText(skin.title))}</p>` : ''}
              ${skin.fullName && skin.fullName !== skin.name ? `<p class="detail-skin-subtitle">${escapeHtml(heroContentText(skin.fullName))}</p>` : ''}
              ${skinMeta.length ? `<div class="detail-skin-meta">${skinMeta.map((item) => `<span>${escapeHtml(heroContentText(String(item)))}</span>`).join('')}</div>` : ''}
              ${skin.detailsStatus ? `<span class="detail-skin-status detail-skin-status--${escapeHtml(skin.detailsStatus)}">${escapeHtml(heroContentText(skin.detailsStatus))}</span>` : ''}
          ${
            skin.starStages
              ? `<div class="detail-skin-stage-track">
            ${skin.starStages
              .map(
                (stage) => `
              <div class="detail-skin-stage">
                <span class="detail-skin-stage-num">${escapeHtml(heroUi('star'))} ${stage.star}</span>
                <span class="detail-skin-stage-title">${escapeHtml(heroContentText(stage.title))}</span>
                <span class="detail-skin-stage-detail">${escapeHtml(heroContentText(stage.detail))}</span>
              </div>
            `
              )
              .join('')}
          </div>`
              : ''
          }
            </div>
          </div>
          <div class="detail-skin-feature-grid">
          <section class="detail-skin-feature detail-skin-attributes">
            <div class="detail-skin-attr-title">${escapeHtml(heroUi('star'))} 1 - ${escapeHtml(heroUi('biographyAttributes'))}</div>
            ${skin.biographyAttributes?.effectiveOn ? `<div class="detail-skin-effect">${escapeHtml(heroUi('effectiveOn'))}: ${escapeHtml(heroContentText(skin.biographyAttributes.effectiveOn))}</div>` : ''}
            ${
              skin.biographyAttributes?.attributes
                ? `<div class="detail-skin-attr-grid">
              ${skin.biographyAttributes.attributes
                .map(
                  (attr) => `
                <span class="detail-skin-attr">${escapeHtml(heroContentText(attr.label))}: <span class="detail-skin-max">${escapeHtml(heroContentText(attr.value))}</span></span>
              `
                )
                .join('')}
            </div>`
                : ''
            }
            <div class="detail-skin-attr-grid ${skin.biographyAttributes?.attributes ? 'detail-skin-attr-grid--legacy-hidden' : ''}">
              <span class="detail-skin-attr">${escapeHtml(heroUi('might'))}: ${ba.might}% <span class="detail-skin-max">→ ${mba.might}%</span></span>
              <span class="detail-skin-attr">${escapeHtml(heroUi('resistance'))}: ${ba.resistance}% <span class="detail-skin-max">→ ${mba.resistance}%</span></span>
              <span class="detail-skin-attr">${escapeHtml(heroUi('tacticalMight'))}: ${ba.tacticalMight}% <span class="detail-skin-max">→ ${mba.tacticalMight}%</span></span>
              <span class="detail-skin-attr">${escapeHtml(heroUi('tacticalResistance'))}: ${ba.tacticalResistance}% <span class="detail-skin-max">→ ${mba.tacticalResistance}%</span></span>
              <span class="detail-skin-attr">${escapeHtml(heroUi('hp'))}: ${ba.hp}% <span class="detail-skin-max">→ ${mba.hp}%</span></span>
              <span class="detail-skin-attr">${escapeHtml(heroUi('damage'))}: ${ba.damage}% <span class="detail-skin-max">→ ${mba.damage}%</span></span>
            </div>
            ${skin.biographyAttributes?.status ? `<p class="detail-skin-feature-note">${escapeHtml(heroContentText(skin.biographyAttributes.status))}</p>` : ''}
          </section>
          <section class="detail-skin-feature detail-skin-skill">
            <div class="detail-skin-skill-title">${escapeHtml(heroUi('star2Inheriting'))}</div>
            <div class="detail-skin-skill-name">${escapeHtml(heroContentText(inheritingName))}</div>
            <div class="detail-skin-effect">${escapeHtml(heroUi('upgrades'))} ${escapeHtml(inheritingSkillRef)}: ${escapeHtml(heroContentText(inheritingFrom))} -> ${escapeHtml(heroContentText(inheritingName))}</div>
            <div class="detail-skin-skill-meta">
              ${skin.inheritingSkill.type ? `<span>${escapeHtml(heroContentText(skin.inheritingSkill.type))}</span>` : ''}
              ${skin.inheritingSkill.maxLevel ? `<span>Lv.${escapeHtml(String(skin.inheritingSkill.maxLevel))}</span>` : ''}
            </div>
            ${skin.inheritingSkill.worksOn ? `<div class="detail-skin-effect">${escapeHtml(heroUi('worksOn'))}: ${escapeHtml(heroContentText(skin.inheritingSkill.worksOn))} | ${escapeHtml(heroUi('range'))} ${escapeHtml(String(skin.inheritingSkill.effectiveRange))} | ${escapeHtml(heroUi('target'))}: ${escapeHtml(heroContentText(skin.inheritingSkill.target))}</div>` : ''}
            ${skin.inheritingSkill.influencedBy ? `<div class="detail-skin-effect">${escapeHtml(heroUi('influencedBy'))}: ${escapeHtml(heroContentText(skin.inheritingSkill.influencedBy))}</div>` : ''}
            <p class="detail-skin-skill-desc">${escapeHtml(heroContentText(skin.inheritingSkill.description))}</p>
            <div class="detail-skin-levels">
              ${(skin.inheritingSkill.levels || [])
                .map(
                  (lv) => `
                <div class="detail-skin-level">
                  <span class="detail-skin-level-num">★${lv.level}</span>
                  <span>${escapeHtml(heroContentText(lv.desc))}</span>
                </div>`
                )
                .join('')}
            </div>
            ${skin.iconBehavior?.star2 ? `<p class="detail-skin-feature-note">${escapeHtml(heroContentText(skin.iconBehavior.star2))}</p>` : ''}
          </section>
          <section class="detail-skin-feature detail-skin-skill">
            <div class="detail-skin-skill-title">${escapeHtml(heroUi('star3Preserving'))}</div>
            <div class="detail-skin-skill-name">${escapeHtml(heroContentText(skin.preservingSkill.name))}</div>
            ${skin.preservingSkill.type ? `<div class="detail-skin-effect">${escapeHtml(heroContentText(skin.preservingSkill.type))} | ${escapeHtml(heroUi('range'))} ${escapeHtml(String(skin.preservingSkill.effectiveRange))} | ${escapeHtml(heroUi('target'))}: ${escapeHtml(heroContentText(skin.preservingSkill.target))}</div>` : ''}
            <p class="detail-skin-skill-desc">${escapeHtml(heroContentText(skin.preservingSkill.description))}</p>
            ${skin.preservingSkill.dynamicIconNote ? `<p class="detail-skin-skill-desc detail-skin-motion-note">${escapeHtml(heroContentText(skin.preservingSkill.dynamicIconNote))}</p>` : ''}
            ${skin.iconBehavior?.star3 && skin.iconBehavior.star3 !== skin.preservingSkill.dynamicIconNote ? `<p class="detail-skin-feature-note detail-skin-motion-note">${escapeHtml(heroContentText(skin.iconBehavior.star3))}</p>` : ''}
          </section>
          </div>
        </article>`;
              })
              .join('')
          : '';

      const firstDetailSection =
        synergies.length > 0 ? 'synergies' : heroSkinsList.length > 0 ? 'skins' : 'skills';
      const detailNavHtml = `
        <nav class="detail-nav" aria-label="${escapeHtml(heroUi('heroDetailSections'))}">
          ${synergies.length > 0 ? `<button type="button" class="detail-nav-btn active" data-detail-section="synergies" aria-current="location">${escapeHtml(heroUi('synergies'))}</button>` : ''}
          ${heroSkinsList.length > 0 ? `<button type="button" class="detail-nav-btn ${firstDetailSection === 'skins' ? 'active' : ''}" data-detail-section="skins"${firstDetailSection === 'skins' ? ' aria-current="location"' : ''}>${escapeHtml(t.heroesBioSkinsTitle || 'Bio Skins')}</button>` : ''}
          <button type="button" class="detail-nav-btn ${firstDetailSection === 'skills' ? 'active' : ''}" data-detail-section="skills"${firstDetailSection === 'skills' ? ' aria-current="location"' : ''}>${escapeHtml(t.heroesSkillsTitle || 'Skills')}</button>
          <button type="button" class="detail-nav-btn" data-detail-section="combos">${escapeHtml(t.heroesTopCombos || 'Top Combos')}</button>
          ${hasHeroCounters ? `<button type="button" class="detail-nav-btn" data-detail-section="counters">${escapeHtml(heroUi('counters'))}</button>` : ''}
        </nav>`;

      detailHtml = `
        <article class="hero-detail-panel hero-atlas-detail-v14" style="--hero-accent:${escapeHtml(tagColor)}" aria-labelledby="hero-detail-title">
          <button type="button" class="heroes-mobile-back" data-hero-close>${escapeHtml(heroUi('backToRanking'))}</button>
          <button type="button" class="detail-close" data-hero-close aria-label="${escapeHtml(heroUi('closeHeroDetail'))}">${escapeHtml(heroUi('close'))}</button>
          <header class="detail-header">
            <img class="detail-img" src="${escapeHtml(hero?.imageUrl || '')}" alt="${escapeHtml(selected)}" width="72" height="72" decoding="async" data-fallback-src="images/logo.png">
            <div class="detail-meta">
              <div class="detail-eyebrow">${escapeHtml(t.tabHeroes || 'Hero Atlas')}</div>
              <h3 id="hero-detail-title" class="detail-name" tabindex="-1">${escapeHtml(selected)}${hero?.State === 'Paid' ? paidIconHtml() : ''}</h3>
              <div class="detail-tags">
                <span class="detail-season-tag" style="background:${tagColor};color:#000">${hero?.season}</span>
                ${hero?.releaseSeason && hero.releaseSeason !== hero.season ? `<span class="detail-season-tag detail-origin-season-tag">${escapeHtml(heroUi('original'))} ${escapeHtml(hero.releaseSeason)}</span>` : ''}
                <span class="detail-troop-tag ${getTroopColorClass(hero?.Type)}">${getLocalizedTroop(hero?.Type || 'All')}</span>
                <span class="detail-state-tag ${hero?.State === 'Paid' ? 'paid' : 'free'}">${escapeHtml(heroUi(hero?.State === 'Paid' ? 'paid' : 'free'))}</span>
              </div>
              <div class="detail-stats-row">
                <div class="detail-stat"><div class="detail-stat-lbl">${escapeHtml(heroUi('rating'))}</div><div class="detail-stat-val" style="color:${tagColor}">${s.finalRating > 0 ? Math.min(100, s.finalRating).toFixed(1) : '—'}</div></div>
                <div class="detail-stat"><div class="detail-stat-lbl">${escapeHtml(heroUi('combos'))}</div><div class="detail-stat-val">${s.appearances || 0}</div></div>
                <div class="detail-stat"><div class="detail-stat-lbl">${escapeHtml(heroUi('bestRank'))}</div><div class="detail-stat-val">${s.topComboRank !== Infinity ? '#' + s.topComboRank : '—'}</div></div>
                ${ext ? `<div class="detail-stat"><div class="detail-stat-lbl">${escapeHtml(heroUi('minCopies'))}</div><div class="detail-stat-val">${ext.minCopies || 34}</div></div>` : ''}
              </div>
            </div>
          </header>
          ${detailNavHtml}

          <div class="detail-content">
            ${
              synergies.length > 0
                ? `
            <section id="detail-section-synergies" class="detail-section-block detail-section-block--overview" aria-labelledby="detail-title-synergies">
              <h4 id="detail-title-synergies" class="detail-section-title">${escapeHtml(heroUi('bestSynergies'))}</h4>
              <div class="detail-synergies">
                ${synergies
                  .map(
                    (syn) => `
                  <button type="button" class="detail-syn-item" data-hero-pick="${escapeHtml(syn)}" title="${escapeHtml(heroUi('viewHero', { hero: syn }))}">
                    <img src="${escapeHtml(getHeroImageUrl(syn))}" alt="${escapeHtml(syn)}" width="48" height="48" loading="lazy" decoding="async">
                    <span>${escapeHtml(syn)}</span>
                  </button>`
                  )
                  .join('')}
              </div>
            </section>`
                : ''
            }

            ${
              heroSkinsList.length > 0
                ? `
            <section id="detail-section-skins" class="detail-section-block detail-section-block--skins" aria-labelledby="detail-title-skins">
              <h4 id="detail-title-skins" class="detail-section-title">${escapeHtml(t.heroesBioSkinsTitle || 'Bio Skins')} <span class="detail-skin-count">${heroSkinsList.length}</span></h4>
              <div class="detail-skins">${skinsHtml}${hiddenPowerHtml}</div>
            </section>`
                : ''
            }

            <section id="detail-section-skills" class="detail-section-block detail-section-block--skills" aria-labelledby="detail-title-skills">
              <h4 id="detail-title-skills" class="detail-section-title">${escapeHtml(t.heroesSkillsTitle || 'Skills')}</h4>
              <div class="detail-skills" data-skill-count="${ext?.skills?.length || 0}">${skillsHtml}</div>
            </section>

            <section id="detail-section-combos" class="detail-section-block detail-section-block--combos" aria-labelledby="detail-title-combos">
              <div class="detail-section-head">
                <h4 id="detail-title-combos" class="detail-section-title">${escapeHtml(t.heroesTopCombos || 'Top Combos')}</h4>
                <div class="heroes-combo-scope" role="group" aria-label="${escapeHtml(t.heroesComboScopeLabel || 'Combo season scope')}">
                  <button type="button" class="heroes-combo-scope-btn ${comboScope === 'season-capped' ? 'active' : ''}" data-combo-scope="season-capped" aria-pressed="${comboScope === 'season-capped'}">
                    ${escapeHtml((t.heroesComboScopeCapped || 'Up to {season}').replace('{season}', hero?.season || ''))}
                  </button>
                  <button type="button" class="heroes-combo-scope-btn ${comboScope === 'all' ? 'active' : ''}" data-combo-scope="all" aria-pressed="${comboScope === 'all'}">
                    ${escapeHtml(t.heroesComboScopeAll || 'All best')}
                  </button>
                </div>
              </div>
              <p class="heroes-combo-scope-hint">${escapeHtml(comboScopeHint)}</p>
              <div class="detail-combos">${combosHtml || `<p class="hero-detail-empty">${escapeHtml(t.heroesNoCombos || 'No ranked combos yet.')}</p>`}</div>
            </section>

            ${
              hasHeroCounters
                ? `
            <section id="detail-section-counters" class="detail-section-block detail-section-block--counters" aria-labelledby="detail-title-counters">
              <h4 id="detail-title-counters" class="detail-section-title">${escapeHtml(heroUi('countersInvolving', { hero: selected }))}</h4>
              ${heroCountersHtml}
            </section>`
                : ''
            }
          </div>
        </article>`;
    }

    const clearFiltersHtml = filtersActive
      ? `<button type="button" class="heroes-clear-filters" data-heroes-clear-filters>${t.heroesClearFilters || 'Clear filters'}</button>`
      : '';
    const heroCountLabel =
      filtered.length === 1 ? t.heroCountOne || '{n} hero' : t.heroCountMany || '{n} heroes';

    container.innerHTML = `
      <div class="heroes-tab-inner${selected ? ' heroes-tab-inner--detail-open' : ''}">
        <div class="heroes-toolbar-sticky">
          <div class="heroes-toolbar">
            <div class="hero-search-wrap heroes-search-field">
              <svg class="hero-search-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 15.803a7.5 7.5 0 0 0 10.607 0Z"/></svg>
              <input id="heroesTabSearch" name="heroesSearch" class="hero-search-input" type="search" placeholder="${escapeHtml(t.heroSearchPh || 'Search heroes...')}" aria-label="${escapeHtml(t.heroSearchPh || 'Search heroes...')}" value="${escapeHtml(search)}" autocomplete="off" spellcheck="false" />
            </div>
            <div class="heroes-toolbar-actions">
              <span class="heroes-count-badge">${escapeHtml(heroCountLabel.replace('{n}', filtered.length))}</span>
              <label class="heroes-sort-control" title="${escapeHtml(heroUi('sortVisibleHeroes'))}">
                <span>${escapeHtml(heroUi('sort'))}</span>
                <select id="heroesSortSelect">
                  <option value="rating"${sort === 'rating' ? ' selected' : ''}>${escapeHtml(heroUi('rating'))}</option>
                  <option value="appearances"${sort === 'appearances' ? ' selected' : ''}>${escapeHtml(heroUi('appearances'))}</option>
                  <option value="best-rank"${sort === 'best-rank' ? ' selected' : ''}>${escapeHtml(heroUi('bestRank'))}</option>
                  <option value="name"${sort === 'name' ? ' selected' : ''}>${escapeHtml(heroUi('name'))}</option>
                </select>
              </label>
              <button type="button" class="heroes-export-btn" data-heroes-export>${escapeHtml(heroUi('exportCsv'))}</button>
              ${clearFiltersHtml}
            </div>
          </div>
          <div class="heroes-filter-deck">
            <div class="heroes-filter-pills heroes-filter-pills--troop">${troopPillsHtml}</div>
            <div class="heroes-filter-pills heroes-filter-pills--state">${statePillsHtml}</div>
            <p class="heroes-season-hint">${t.heroesSeasonHint || 'Seasons - select multiple'}</p>
            <div class="heroes-season-tabs" role="group" aria-label="${escapeHtml(heroUi('seasonFilterAria'))}">${seasonTabsHtml}</div>
          </div>
        </div>
        <div class="heroes-layout ${selected ? 'has-detail' : ''}">
          <div class="heroes-ranking-list">
            ${rowsHtml}
            ${showMoreHtml}
          </div>
          ${selected ? detailHtml : ''}
        </div>
      </div>`;

    if (searchHadFocus) {
      const searchInput = document.getElementById('heroesTabSearch');
      if (searchInput) {
        searchInput.focus();
        if (searchCaret != null) {
          searchInput.setSelectionRange(searchCaret, searchCaret);
        }
      }
    }

    requestAnimationFrame(() => {
      const scrollBehavior = preferredScrollBehavior();
      if (_heroesReturnFocusName && !selected) {
        const returnRow = [...container.querySelectorAll('[data-hero-name]')].find(
          (row) => row.dataset.heroName === _heroesReturnFocusName
        );
        returnRow?.focus({ preventScroll: true });
        returnRow?.scrollIntoView({ block: 'nearest', behavior: scrollBehavior });
        _heroesReturnFocusName = null;
      }
      const selectedRow = container.querySelector('.hero-rank-row.selected');
      if (selectedRow) {
        selectedRow.scrollIntoView({ block: 'nearest', behavior: scrollBehavior });
      }
      if (selected && window.innerWidth < 900) {
        container
          .querySelector('.hero-detail-panel')
          ?.scrollIntoView({ behavior: scrollBehavior, block: 'start' });
      }
      if (_heroesDetailFocusRequested && selected) {
        const focusTarget =
          window.innerWidth < 900
            ? container.querySelector('.heroes-mobile-back')
            : container.querySelector('#hero-detail-title');
        focusTarget?.focus({ preventScroll: true });
        _heroesDetailFocusRequested = false;
      }
    });
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('vts:language-change', (event) => {
    void refreshHeroAtlasLocale(event.detail?.lang || currentLanguage);
  });
}

export { renderHeroesTab, refreshHeroAtlasLocale, getSynergies, formatSkillText };
