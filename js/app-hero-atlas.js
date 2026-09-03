import {
  currentLanguage,
  selectedSeasons,
  db,
  seasonColors,
  HERO_ATLAS_ALL_SEASONS,
  POPULATED_HERO_SEASONS,
  paidIconHtml,
  heroesSection,
  getTroopColorClass,
  getLocalizedTroop,
  getHeroImageUrl,
  getComboRankInfo,
  getCounterLabels,
} from './state.js';
import { translations } from './translations.js';
import { baseRankedCombos, filterCombosForSkinMode, rankedCombos } from './combos-db.js';
import { heroesExtendedData } from './heroes-info.js';
import { allHeroesData } from './heroes-data.js';
import { heroBonusPoints } from './hero-bonuses.js';
import { escapeHtml, formatLocaleNumber } from './utils.js';
import {
  hasSkin,
  getHeroSkins,
  getSkinForHero,
  getSkinCount,
  getHeroHiddenPower,
  getSkinTiers,
  getSkinItemIconUrl,
  getAllSkinHeroEntries,
  SKIN_TYPES,
} from './skins-db.js';
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
import { loadCodexStore } from './codex-loader.js';
import { csvFooterLines, getExportBranding } from './export-branding.js';
import { provenanceFor } from './codex-provenance.js';
import { projectSkinModeRankDeltas } from './codex-rank-projection.js';
import { eraForGameVersion, isRenderable, worstCodexStatus } from './codex-ui.js';
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
const _allHeroNames = new Set(allHeroesData.map((h) => h.name));
const HERO_SEASON_INDEX = Object.fromEntries(HERO_ATLAS_ALL_SEASONS.map((s, i) => [s, i]));
const SKIN_TYPE_ORDER = Object.freeze(Object.keys(SKIN_TYPES));

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

// ─── CODEX MODE: data access + projections ───────────────────────────────────
const CODEX_PRESETS = Object.freeze(['free', 'paid', 'skins-paid']);

function normalizeCodexPreset(value) {
  const preset = String(value || '')
    .trim()
    .toLowerCase();
  return CODEX_PRESETS.includes(preset) ? preset : 'free';
}

// Fills the module-level codex snapshot once and re-renders the Atlas when the
// payload resolves, so codex columns upgrade in place without blocking the
// local-data first paint.
async function hydrateCodexStore() {
  if (_codexRefreshApplied) return;
  if (_codexRequested) return;
  _codexRequested = true;
  try {
    const store = await loadCodexStore();
    _codexStoreSnapshot = store;
  } catch {
    _codexStoreSnapshot = null;
  }
  _codexRefreshApplied = true;
  renderHeroesTab({ suppressLocaleRefresh: true });
}

function codexLoadStatus() {
  if (_codexStoreSnapshot) return 'ready';
  return _codexRequested ? 'loading' : 'unavailable';
}

function codexHeroRecords() {
  return _codexStoreSnapshot ? _codexStoreSnapshot.datasets['heroes-codex'] || [] : [];
}

function codexDuelRecords() {
  return _codexStoreSnapshot ? _codexStoreSnapshot.datasets['duel-matrix'] || [] : [];
}

function codexHeroRecord(heroName) {
  return codexHeroRecords().find((record) => record?.heroName === heroName) || null;
}

// Lane-3 frozen access column: standard | paid | royal. Falls back to 'paid'
// for any paid-state hero the payload does not know yet.
function codexAccessFor(heroName) {
  const record = codexHeroRecord(heroName);
  const access = record?.access;
  return access === 'standard' || access === 'royal' ? access : 'paid';
}

// Skills 1-8 live ONLY in the codex payload and are never copied into
// js/heroes-info.js. This merge unions payload skills (ids 1-8, each with its
// own provenance) with the community-verified heroesExtendedData skills.
function mergeHeroSkills(heroName, ext) {
  const payloadSkills = codexHeroRecord(heroName)?.skills || [];
  const localSkills = ext?.skills || [];
  const byId = new Map();
  for (const skill of localSkills) {
    byId.set(Number(skill.id), { ...skill, sourceSurface: 'atlas' });
  }
  for (const skill of payloadSkills) {
    const id = Number(skill.id);
    if (!Number.isInteger(id)) continue;
    byId.set(id, { ...skill, sourceSurface: 'codex' });
  }
  return [...byId.values()].sort((a, b) => a.id - b.id);
}

// Read-only projection of the skin-mode rank override block in combos-db.
// Lives in js/codex-rank-projection.js (pure + unit-tested); re-exported here
// so atlas consumers keep one entry point while the module keeps a local
// binding (a bare re-export would not create one).
export { projectSkinModeRankDeltas };

// Star-up cost summary for a skin: the tier's maximizeTotal items rendered as
// "18 × Epic Hero Medal · 9 × Legendary Hero Medal · …". Mythic has no
// preserving step, so its shorter total is correct and must not be padded.
function skinStarUpCostSummary(skin) {
  const tier = getSkinTiers().find((entry) => entry.typeKey === skin?.type);
  if (!tier?.maximizeTotal?.length) return null;
  return tier.maximizeTotal
    .map(
      (item) => `${formatLocaleNumber(item.qty, currentLanguage)} × ${heroContentText(item.name)}`
    )
    .join(' · ');
}

const CODEX_STATUS_SAFE = Object.freeze(['current', 'historical', 'unverified']);

function renderVerificationChip(status, { ariaBase = '' } = {}) {
  const safeStatus = CODEX_STATUS_SAFE.includes(status) ? status : 'unverified';
  const label = heroUi(`verification${safeStatus.charAt(0).toUpperCase()}${safeStatus.slice(1)}`);
  const aria = ariaBase
    ? `aria-label="${escapeHtml(heroUi('verificationAria', { status: label }))}"`
    : '';
  return `<span class="codex-chip codex-chip--${safeStatus}" data-codex-status="${safeStatus}" ${aria}><span class="codex-chip-dot" aria-hidden="true"></span>${escapeHtml(label)}</span>`;
}

function heroCodexStatus(heroName) {
  const record = codexHeroRecord(heroName);
  if (!record) return null;
  const envelope = provenanceFor(record);
  return envelope ? envelope.verificationStatus : null;
}

function renderEraBadge(gameVersionScope) {
  const era = eraForGameVersion(gameVersionScope);
  if (!era) {
    return `<span class="codex-era-badge codex-era-badge--unknown">${escapeHtml(heroUi('duelEraUnknown'))}</span>`;
  }
  return `<span class="codex-era-badge" style="--era-color:var(${era.colorToken})">${escapeHtml(heroUi(era.eraKey))}</span>`;
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
  mode: 'heroes',
  comboScope: 'season-capped',
  sort: 'rating',
  limit: 20,
  skinView: 'tiers',
  skinSearch: '',
  skinType: 'all',
  codexPreset: 'free',
  codexSort: 'name',
};
let _heroesTabEventsWired = false;
let _heroesSearchTimer = null;
let _skinsSearchTimer = null;
let _heroesUrlParamsApplied = false;
let _heroesDetailFocusRequested = false;
let _heroesReturnFocusName = null;
let _heroLocaleRefreshToken = 0;
let _codexStoreSnapshot = null;
let _codexRefreshApplied = false;
let _codexRequested = false;

async function refreshHeroAtlasLocale(locale = currentLanguage) {
  const normalized = normalizeHeroAtlasLocale(locale);
  const token = ++_heroLocaleRefreshToken;
  await loadHeroAtlasLocale(normalized);
  if (token !== _heroLocaleRefreshToken || normalized !== normalizeHeroAtlasLocale(currentLanguage))
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
  // The legacy ?atlas=skins deep link still works, but the Heroes & Combos
  // hub is the canonical mode source: only an explicit URL parameter may
  // override the mode, otherwise a hub-selected mode could be clobbered by
  // the first render racing ahead of setHeroAtlasMode.
  if (params.has('atlas')) {
    const atlasMode = params.get('atlas');
    _heroesTabState.mode =
      atlasMode === 'skins' ? 'skins' : atlasMode === 'codex' ? 'codex' : 'heroes';
  }
  if (params.has('codexPreset')) {
    _heroesTabState.codexPreset = normalizeCodexPreset(params.get('codexPreset'));
  }
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

/**
 * Show the Atlas in hero, skin, or codex mode. The Heroes & Combos Hub calls
 * this when its Codex / Heroes / Skins sub-tabs are selected; the Atlas no
 * longer carries its own toggle. Returns true when the mode actually changed.
 */
export function setHeroAtlasMode(mode) {
  const next = mode === 'skins' ? 'skins' : mode === 'codex' ? 'codex' : 'heroes';
  if (_heroesTabState.mode === next) return false;
  _heroesTabState.mode = next;
  updateHeroAtlasUrlParams();
  renderHeroesTab();
  return true;
}

function updateHeroAtlasUrlParams() {
  const params = new URLSearchParams(window.location.search);
  // The hub subtab is the canonical mode source. Keep accepting the legacy
  // ?atlas=skins input above, but do not duplicate it in newly shared URLs.
  params.delete('atlas');
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

  // Codex preset is written only inside codex mode and removed on exit,
  // mirroring the ?state handling for hero mode.
  if (_heroesTabState.mode === 'codex' && _heroesTabState.codexPreset !== 'free') {
    params.set('codexPreset', _heroesTabState.codexPreset);
  } else {
    params.delete('codexPreset');
  }

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

function exportCodexCsv(stats) {
  const { codexPreset } = _heroesTabState;
  const skinModeDeltas = projectSkinModeRankDeltas(
    baseRankedCombos,
    filterCombosForSkinMode(rankedCombos, true, () => true),
    allHeroesData.map((hero) => hero.name)
  );
  const seasonSet = new Set(normalizeHeroAtlasSeasons(_heroesTabState.seasons));
  const query = (_heroesTabState.search || '').trim().toLowerCase();
  let rows = [];
  if (codexPreset === 'free') {
    rows = allHeroesData.filter((hero) => hero.State === 'Free');
  } else if (codexPreset === 'paid') {
    rows = allHeroesData.filter((hero) => hero.State === 'Paid');
  } else {
    rows = allHeroesData.filter(
      (hero) => getHeroSkins(hero.name).length > 0 || hero.State === 'Paid'
    );
  }
  rows = rows.filter((hero) => seasonSet.has(hero.season));
  if (query) rows = rows.filter((hero) => hero.name.toLowerCase().includes(query));
  rows = codexSortHeroes(rows, stats, codexPreset, skinModeDeltas);

  const header =
    codexPreset === 'free'
      ? [
          heroUi('name'),
          heroUi('season'),
          heroUi('troop'),
          heroUi('rating'),
          heroUi('bestRank'),
          heroUi('skins'),
          heroUi('codexColVerification'),
        ]
      : codexPreset === 'paid'
        ? [
            heroUi('name'),
            heroUi('season'),
            heroUi('troop'),
            heroUi('codexColAccess'),
            heroUi('rating'),
            heroUi('skins'),
            heroUi('codexColVerification'),
          ]
        : [
            heroUi('name'),
            heroUi('codexColSkinType'),
            heroUi('codexColStarCost'),
            heroUi('limitedHeroMechanic'),
            heroUi('codexColRankDelta'),
            heroUi('codexColVerification'),
          ];

  const lines = [header.map(csvCell).join(',')];
  rows.forEach((hero) => {
    const s = stats[hero.name] || {};
    const status = heroCodexStatus(hero.name) || '';
    if (codexPreset === 'free') {
      lines.push(
        [
          hero.name,
          hero.season,
          getLocalizedTroop(hero.Type),
          s.finalRating > 0 ? Math.min(100, s.finalRating).toFixed(1) : '',
          s.topComboRank !== Infinity ? s.topComboRank : '',
          getSkinCount(hero.name),
          status,
        ]
          .map(csvCell)
          .join(',')
      );
    } else if (codexPreset === 'paid') {
      lines.push(
        [
          hero.name,
          hero.season,
          getLocalizedTroop(hero.Type),
          codexAccessFor(hero.name),
          s.finalRating > 0 ? Math.min(100, s.finalRating).toFixed(1) : '',
          getSkinCount(hero.name),
          status,
        ]
          .map(csvCell)
          .join(',')
      );
    } else {
      const skin = getSkinForHero(hero.name);
      lines.push(
        [
          hero.name,
          skin?.type || '',
          skinStarUpCostSummary(skin) || '',
          getHeroHiddenPower(hero.name) ? 'yes' : '',
          skinModeDeltas.get(hero.name) || 0,
          status,
        ]
          .map(csvCell)
          .join(',')
      );
    }
  });
  const brandedCodex = `${lines.join('\n')}\n${csvFooterLines(
    getExportBranding({ verificationStatus: 'current' })
  )
    .map((line) => `# ${line}`)
    .join('\n')}\n`;
  const blob = new Blob([brandedCodex], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `hero-codex-${codexPreset}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  if (typeof window.showToast === 'function') {
    window.showToast(heroUi('codexExportCsv', { preset: codexPreset }), 'success');
  }
}

function exportHeroAtlasCsv() {
  const stats = computeHeroRankings();
  if (_heroesTabState.mode === 'codex') {
    exportCodexCsv(stats);
    return;
  }
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
  const brandedAtlas = `${lines.join('\n')}\n${csvFooterLines(getExportBranding())
    .map((line) => `# ${line}`)
    .join('\n')}\n`;
  const blob = new Blob([brandedAtlas], { type: 'text/csv;charset=utf-8' });
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
  const allSeasonsSelected = normalized.length === POPULATED_HERO_SEASONS.length;
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

/**
 * Opens a hero's detail panel no matter which Atlas mode is showing. From the
 * Skins sub-tab the detail panel only exists in hero mode, so the hub is moved
 * to the Heroes sub-tab first to keep the chrome and the panel in sync.
 */
function openHeroDetailFromAnyMode(heroName) {
  _heroesDetailFocusRequested = true;
  _heroesReturnFocusName = null;
  _heroesTabState.selected = heroName;
  updateHeroAtlasUrlParams();
  if (_heroesTabState.mode !== 'skins') {
    renderHeroesTab();
    return;
  }
  import('./heroes-combos-hub.js')
    .then((mod) => {
      const opened = mod?.openHeroesCombosSubtab?.('heroes');
      if (!opened) setHeroAtlasMode('heroes');
    })
    .catch(() => setHeroAtlasMode('heroes'));
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

    const skinsViewBtn = e.target.closest('[data-skins-view]');
    if (skinsViewBtn) {
      _heroesTabState.skinView = skinsViewBtn.dataset.skinsView === 'gallery' ? 'gallery' : 'tiers';
      renderHeroesTab();
      return;
    }

    const skinsTypeBtn = e.target.closest('[data-skins-type]');
    if (skinsTypeBtn) {
      _heroesTabState.skinType = skinsTypeBtn.dataset.skinsType;
      renderHeroesTab();
      return;
    }

    const scopeBtn = e.target.closest('[data-combo-scope]');
    if (scopeBtn) {
      _heroesTabState.comboScope = scopeBtn.dataset.comboScope;
      renderHeroesTab();
      return;
    }

    const codexPresetBtn = e.target.closest('[data-codex-preset]');
    if (codexPresetBtn) {
      _heroesTabState.codexPreset = normalizeCodexPreset(codexPresetBtn.dataset.codexPreset);
      _heroesTabState.codexSort = 'name';
      _heroesTabState.limit = 20;
      updateHeroAtlasUrlParams();
      renderHeroesTab();
      return;
    }

    const pickHero = e.target.closest('[data-hero-pick]');
    if (pickHero) {
      e.stopPropagation();
      openHeroDetailFromAnyMode(pickHero.dataset.heroPick);
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
    if (_heroesTabState.mode === 'codex') {
      _heroesTabState.codexSort = e.target.value;
    } else {
      _heroesTabState.sort = e.target.value;
    }
    _heroesTabState.limit = 20;
    updateHeroAtlasUrlParams();
    renderHeroesTab();
  });

  container.addEventListener('input', (e) => {
    if (e.target.id === 'heroesTabSearch') {
      clearTimeout(_heroesSearchTimer);
      _heroesSearchTimer = setTimeout(() => {
        _heroesTabState.search = e.target.value;
        _heroesTabState.limit = 20;
        syncHeroSelectionWithFilters();
        updateHeroAtlasUrlParams();
        renderHeroesTab();
      }, 180);
      return;
    }
    if (e.target.id === 'skinsGallerySearch') {
      clearTimeout(_skinsSearchTimer);
      _skinsSearchTimer = setTimeout(() => {
        _heroesTabState.skinSearch = e.target.value;
        renderHeroesTab();
      }, 180);
    }
  });

  container.addEventListener(
    'load',
    (event) => {
      const image = event.target;
      if (image?.matches?.('img[data-skin-item-art]')) {
        image.parentElement?.classList.add('has-art');
      }
    },
    true
  );

  container.addEventListener(
    'error',
    (event) => {
      const image = event.target;
      if (image?.matches?.('img[data-skin-item-art]')) {
        const slot = image.parentElement;
        image.remove();
        slot?.classList.add('skin-item-icon--empty');
        return;
      }
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

function skinItemMonogram(name) {
  const words = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!words.length) return '';
  return words
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
}

/**
 * Cost item icon slot. Real in-game art swaps in automatically once
 * assets/skins/items/<iconId>.webp exists; until then the slot keeps a
 * monogram placeholder so the layout already reserves space for the icons.
 */
function renderSkinItemIcon(item) {
  const iconUrl = getSkinItemIconUrl(item);
  const monogram = skinItemMonogram(item?.name || '');
  return `
    <span class="skin-item-icon${iconUrl ? '' : ' skin-item-icon--empty'}" title="${escapeHtml(heroUi('skinItemIconPlaceholder'))}" aria-hidden="true">
      <span class="skin-item-icon-fallback">${escapeHtml(monogram)}</span>
      ${
        iconUrl
          ? `<img class="skin-item-icon-img" src="${escapeHtml(iconUrl)}" alt="" width="28" height="28" loading="lazy" decoding="async" data-skin-item-art>`
          : ''
      }
    </span>`;
}

function renderSkinReqList(items) {
  if (!Array.isArray(items) || !items.length) return '';
  return `<ul class="skin-req-list">${items
    .map(
      (item) =>
        `<li class="skin-req-item"><span class="skin-req-left">${renderSkinItemIcon(item)}<span class="skin-req-name">${escapeHtml(heroContentText(item.name))}</span></span><bdi class="skin-req-qty">×${escapeHtml(formatLocaleNumber(item.qty, currentLanguage))}</bdi></li>`
    )
    .join('')}</ul>`;
}

function renderSkinStarStep({ label, sublabel, body }) {
  return `
    <div class="skin-star-step">
      <div class="skin-star-head">
        <span class="skin-star-glyph" aria-hidden="true">★</span>
        <span class="skin-star-badge">${escapeHtml(label)}</span>
        <span class="skin-star-title">${escapeHtml(sublabel)}</span>
      </div>
      <div class="skin-star-body">${body}</div>
    </div>`;
}

function renderTierHeroChip(name) {
  if (!_allHeroNames.has(name)) {
    return `<bdi class="skin-tier-hero-chip" dir="auto" translate="no">${escapeHtml(name)}</bdi>`;
  }
  return `<button type="button" class="skin-tier-hero-chip skin-tier-hero-chip--link" data-hero-pick="${escapeHtml(name)}" title="${escapeHtml(heroUi('viewHero', { hero: name }))}"><bdi dir="auto" translate="no">${escapeHtml(name)}</bdi></button>`;
}

function renderSkinTierCard(tier) {
  const starWord = heroUi('star');
  const starLabel = (value) => `${starWord} ${formatLocaleNumber(value, currentLanguage)}`;
  const typeInfo = SKIN_TYPES[tier.typeKey] || SKIN_TYPES.Mythic;
  const star1 = renderSkinStarStep({
    label: starLabel(1),
    sublabel: heroUi('biographyAttributes'),
    body: `<p class="skin-star-note">${escapeHtml(heroContentText(tier.star1?.unlock || ''))}</p>`,
  });
  const star2 = renderSkinStarStep({
    label: starLabel(2),
    sublabel: heroUi('star2Inheriting'),
    body: renderSkinReqList(tier.star1To2?.items),
  });
  const star3 = tier.hasPreserving
    ? renderSkinStarStep({
        label: starLabel(3),
        sublabel: heroUi('star3Preserving'),
        body: renderSkinReqList(tier.star2To3?.items),
      })
    : renderSkinStarStep({
        label: starLabel(3),
        sublabel: heroUi('star3Preserving'),
        body: `<p class="skin-star-note skin-star-note--none">${escapeHtml(heroUi('skinNoPreserving'))}</p>`,
      });

  const heroesBlock = tier.knownHeroes.length
    ? `<div class="skin-tier-heroes">
        <span class="skin-tier-heroes-label">${escapeHtml(heroUi('skinKnownHeroes'))}</span>
        <div class="skin-tier-hero-chips">${tier.knownHeroes.map(renderTierHeroChip).join('')}</div>
      </div>`
    : tier.heroesNote
      ? `<p class="skin-tier-heroes-note">${escapeHtml(heroContentText(tier.heroesNote))}</p>`
      : '';

  return `
    <article class="skin-tier-card" style="--skin-accent:${escapeHtml(tier.color)}">
      <header class="skin-tier-head">
        <span class="skin-tier-badge" aria-hidden="true">${escapeHtml(typeInfo.icon)}</span>
        <div class="skin-tier-title-row">
          <h3 class="skin-tier-name">${escapeHtml(heroContentText(tier.name))}</h3>
          <span class="skin-tier-rank">${escapeHtml(heroContentText(tier.rank))}</span>
        </div>
        <p class="skin-tier-summary">${escapeHtml(heroContentText(tier.summary))}</p>
      </header>
      <div class="skin-star-track">${star1}${star2}${star3}</div>
      <section class="skin-tier-section skin-tier-maximize">
        <h4 class="skin-tier-section-title">${escapeHtml(heroUi('skinMaximizeCost'))}</h4>
        ${renderSkinReqList(tier.maximizeTotal)}
      </section>
      <section class="skin-tier-section skin-tier-acquire">
        <h4 class="skin-tier-section-title">${escapeHtml(heroUi('skinAcquisition'))}</h4>
        <ul class="skin-acquire-list">${tier.acquisition
          .map((line) => `<li>${escapeHtml(heroContentText(line))}</li>`)
          .join('')}</ul>
      </section>
      ${heroesBlock}
    </article>`;
}

function renderSkinAtlasIntro() {
  const tiers = getSkinTiers();
  const totalSkins = getAllSkinHeroEntries().length;
  const itemCount = new Set(
    tiers.flatMap((tier) =>
      [...(tier.star1To2?.items || []), ...(tier.star2To3?.items || [])].map((item) => item.name)
    )
  ).size;
  return `
    <header class="skin-atlas-intro">
      <div class="skin-atlas-intro-copy">
        <h2 id="skinAtlasHeading">${escapeHtml(heroUi('skinAtlasTitle'))}</h2>
        <p>${escapeHtml(heroUi('skinAtlasDescription'))}</p>
      </div>
      <div class="skin-atlas-facts" aria-label="${escapeHtml(heroUi('skinAtlasFactsAria'))}">
        <span class="skin-atlas-fact">${escapeHtml(heroUi('skinAtlasTierCount', { n: tiers.length }))}</span>
        <span class="skin-atlas-fact">${escapeHtml(heroUi('skinGalleryCount', { n: totalSkins }))}</span>
        <span class="skin-atlas-fact">${escapeHtml(heroUi('skinAtlasItemCount', { n: itemCount }))}</span>
      </div>
    </header>`;
}

function renderSkinAtlas() {
  const tiers = getSkinTiers();
  return `
    <section class="skin-atlas" aria-labelledby="skinAtlasHeading">
      ${renderSkinAtlasIntro()}
      <div class="skin-atlas-grid">${tiers.map(renderSkinTierCard).join('')}</div>
    </section>`;
}

function getSkinGalleryTypes() {
  const present = new Set(getAllSkinHeroEntries().map((entry) => entry.skin.type));
  return SKIN_TYPE_ORDER.filter((type) => present.has(type));
}

function renderSkinGalleryCard(entry, hero) {
  const { heroName, skin } = entry;
  const typeInfo = SKIN_TYPES[skin.type] || SKIN_TYPES.Mythic;
  const assetUrl = getExactSkinAssetUrl(skin);
  const status = skin.detailsStatus
    ? heroContentText(skin.detailsStatus)
    : heroUi('skinDetailsComplete');
  const statusClass = skin.detailsStatus ? skin.detailsStatus : 'complete';
  const monogram = Array.from(String(heroName).trim())[0]?.toUpperCase() || '';
  const season = hero?.season;
  return `
  <button type="button" class="skin-gallery-card" data-hero-pick="${escapeHtml(heroName)}" style="--skin-accent:${escapeHtml(typeInfo.color)}" aria-label="${escapeHtml(heroUi('viewHero', { hero: heroName }))}">
    <span class="skin-gallery-art" data-skin-art-frame>
      <span class="skin-gallery-monogram" aria-hidden="true">${escapeHtml(monogram)}</span>
      ${
        assetUrl
          ? `<img src="${escapeHtml(assetUrl)}" alt="" width="64" height="64" loading="lazy" decoding="async" data-skin-art>`
          : ''
      }
    </span>
    <span class="skin-gallery-body">
      <span class="skin-gallery-hero">${escapeHtml(heroName)}</span>
      <span class="skin-gallery-meta">
        <span class="skin-gallery-type">${escapeHtml(heroContentText(typeInfo.label || skin.type))}</span>
        <span class="skin-gallery-status skin-gallery-status--${escapeHtml(statusClass)}">${escapeHtml(status)}</span>
        ${season ? `<span class="skin-gallery-season" style="--sc:${escapeHtml(seasonColors[season] || '#f97316')}">${escapeHtml(season)}</span>` : ''}
      </span>
    </span>
  </button>`;
}

function renderSkinGallery() {
  const { skinSearch, skinType } = _heroesTabState;
  const query = (skinSearch || '').trim().toLowerCase();
  const heroByName = new Map(allHeroesData.map((h) => [h.name, h]));
  let entries = getAllSkinHeroEntries()
    .map((entry) => ({ ...entry, hero: heroByName.get(entry.heroName) || null }))
    .sort((a, b) => a.heroName.localeCompare(b.heroName));
  if (skinType !== 'all') {
    entries = entries.filter((entry) => entry.skin.type === skinType);
  }
  if (query) {
    entries = entries.filter((entry) => {
      const typeInfo = SKIN_TYPES[entry.skin.type] || SKIN_TYPES.Mythic;
      return (
        entry.heroName.toLowerCase().includes(query) ||
        String(entry.skin.name || '')
          .toLowerCase()
          .includes(query) ||
        String(typeInfo.label || '')
          .toLowerCase()
          .includes(query)
      );
    });
  }
  const cardsHtml = entries.length
    ? entries.map((entry) => renderSkinGalleryCard(entry, entry.hero)).join('')
    : `<p class="skin-gallery-empty">${escapeHtml(heroUi('skinGalleryEmpty'))}</p>`;
  return `
    <section class="skin-gallery" aria-labelledby="skinGalleryHeading">
      <header class="skin-gallery-intro">
        <h2 id="skinGalleryHeading">${escapeHtml(heroUi('skinGalleryTitle'))}</h2>
        <p>${escapeHtml(heroUi('skinGalleryDescription'))}</p>
      </header>
      <div class="skin-gallery-grid">${cardsHtml}</div>
    </section>`;
}

function renderSkinsView() {
  const { skinView, skinSearch, skinType } = _heroesTabState;
  const view = skinView === 'gallery' ? 'gallery' : 'tiers';
  const totalSkins = getAllSkinHeroEntries().length;

  const galleryToolsHtml =
    view === 'gallery'
      ? `
    <div class="skins-gallery-tools">
      <div class="hero-search-wrap skins-gallery-search">
        <svg class="hero-search-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 15.803a7.5 7.5 0 0 0 10.607 0Z"/></svg>
        <input id="skinsGallerySearch" class="hero-search-input" type="search" placeholder="${escapeHtml(heroUi('skinGallerySearchPh'))}" aria-label="${escapeHtml(heroUi('skinGallerySearchPh'))}" value="${escapeHtml(skinSearch)}" autocomplete="off" spellcheck="false" />
      </div>
      <div class="skins-type-pills" role="group" aria-label="${escapeHtml(heroUi('skinTypeFilterAria'))}">
        <button type="button" class="skins-type-pill ${skinType === 'all' ? 'active' : ''}" data-skins-type="all" aria-pressed="${skinType === 'all'}">${escapeHtml(heroUi('all'))}</button>
        ${getSkinGalleryTypes()
          .map(
            (type) => `
        <button type="button" class="skins-type-pill ${skinType === type ? 'active' : ''}" data-skins-type="${type}" aria-pressed="${skinType === type}">${escapeHtml(heroContentText((SKIN_TYPES[type] || {}).label || type))}</button>`
          )
          .join('')}
      </div>
      <span class="skins-gallery-count" aria-live="polite">${escapeHtml(heroUi('skinGalleryCount', { n: totalSkins }))}</span>
    </div>`
      : '';

  return `
      <div class="heroes-tab-inner heroes-tab-inner--skins heroes-tab-inner--skin-${view}">
        <div class="heroes-toolbar-sticky heroes-toolbar-sticky--skins">
          <div class="skins-view-bar">
            <div class="skins-view-toggle" role="group" aria-label="${escapeHtml(heroUi('skinsViewAria'))}">
              <button type="button" class="skins-view-btn ${view === 'tiers' ? 'active' : ''}" data-skins-view="tiers" aria-pressed="${view === 'tiers'}">${escapeHtml(heroUi('skinsViewTierGuide'))}</button>
              <button type="button" class="skins-view-btn ${view === 'gallery' ? 'active' : ''}" data-skins-view="gallery" aria-pressed="${view === 'gallery'}">${escapeHtml(heroUi('skinsViewGallery'))}</button>
            </div>
            <span class="skins-total-chip">${escapeHtml(heroUi('skinGalleryCount', { n: totalSkins }))}</span>
          </div>
          ${galleryToolsHtml}
        </div>
        ${view === 'gallery' ? renderSkinGallery() : renderSkinAtlas()}
      </div>`;
}

function lineupIncludesHero(record, heroName) {
  const lineup = record?.lineup || {};
  return (
    (Array.isArray(lineup.attacker) && lineup.attacker.includes(heroName)) ||
    (Array.isArray(lineup.defender) && lineup.defender.includes(heroName))
  );
}

function duelRecordsForHero(heroName) {
  return codexDuelRecords().filter((record) => lineupIncludesHero(record, heroName));
}

function renderDuelRecordCard(record) {
  const envelope = provenanceFor(record);
  const status = envelope ? envelope.verificationStatus : 'unverified';
  const battleCount = Number(record.battleCount) || 0;
  const wins = Number(record.wins) || 0;
  const winRate = battleCount > 0 ? (wins / battleCount) * 100 : 0;
  const ci = record.confidenceInterval || {};
  const ciLabel =
    Number.isFinite(ci.lo) && Number.isFinite(ci.hi)
      ? `aria-label="${escapeHtml(heroUi('duelCIAria', { lo: Math.round(ci.lo * 100), hi: Math.round(ci.hi * 100) }))}"`
      : '';
  const opponents = [
    ...(Array.isArray(record.lineup?.attacker) ? record.lineup.attacker : []),
    ...(Array.isArray(record.lineup?.defender) ? record.lineup.defender : []),
  ].filter((name) => name !== undefined);
  const opponentsHtml = opponents
    .map(
      (name) => `
      <button type="button" class="duel-lineup-hero" data-hero-pick="${escapeHtml(name)}" title="${escapeHtml(heroUi('viewHero', { hero: name }))}">
        <img src="${escapeHtml(getHeroImageUrl(name))}" alt="${escapeHtml(name)}" width="28" height="28" loading="lazy" decoding="async">
        <span>${escapeHtml(name)}</span>
      </button>`
    )
    .join('');
  return `
    <article class="duel-record-card duel-record-card--${status}" data-duel-status="${status}">
      <div class="duel-record-head">
        ${renderEraBadge(record.sourceGameVersion)}
        <span class="duel-record-count">${escapeHtml(heroUi('duelRecordCount', { n: formatLocaleNumber(battleCount, currentLanguage) }))}</span>
        ${renderVerificationChip(status)}
      </div>
      <div class="duel-record-bar" ${ciLabel} title="${escapeHtml(heroUi('duelWinRate'))}">
        <span class="duel-record-bar-label">${escapeHtml(heroUi('duelWinRate'))}</span>
        <span class="duel-record-bar-track"><span class="duel-record-bar-fill" style="width:${winRate.toFixed(1)}%"></span></span>
        <span class="duel-record-bar-value">${winRate.toFixed(1)}%</span>
      </div>
      <div class="duel-record-lineups">${opponentsHtml}</div>
      ${record.inclusionCriteria ? `<p class="duel-record-criteria">${escapeHtml(String(record.inclusionCriteria))}</p>` : ''}
      ${envelope ? `<p class="duel-record-credit">${escapeHtml(envelope.source)} · ${escapeHtml(envelope.credit)} · ${escapeHtml(envelope.captureDate)}</p>` : ''}
    </article>`;
}

function renderDuelSection(heroName) {
  const records = duelRecordsForHero(heroName);
  if (!records.length) {
    return `
    <section id="detail-section-duels" class="detail-section-block detail-section-block--duels" aria-labelledby="detail-title-duels">
      <h4 id="detail-title-duels" class="detail-section-title">${escapeHtml(heroUi('duelsTitle'))}</h4>
      <p class="hero-detail-empty">${escapeHtml(heroUi('duelNoData'))}</p>
    </section>`;
  }
  const verified = records.filter(
    (record) => isRenderable(record) && provenanceFor(record).verificationStatus !== 'unverified'
  );
  const unverified = records.filter(
    (record) => !isRenderable(record) || provenanceFor(record).verificationStatus === 'unverified'
  );
  const unverifiedHtml = unverified.length
    ? `
    <details class="duel-evidence-group">
      <summary>${escapeHtml(heroUi('duelEvidenceOnly'))} (${unverified.length})</summary>
      <div class="duel-record-list">${unverified.map(renderDuelRecordCard).join('')}</div>
    </details>`
    : '';
  return `
    <section id="detail-section-duels" class="detail-section-block detail-section-block--duels" aria-labelledby="detail-title-duels">
      <h4 id="detail-title-duels" class="detail-section-title">${escapeHtml(heroUi('duelsTitle'))}</h4>
      <div class="duel-record-list">${verified.map(renderDuelRecordCard).join('')}</div>
      ${unverifiedHtml}
    </section>`;
}

function renderHeroDetailPanel(selected, stats, t) {
  const hero = allHeroesData.find((h) => h.name === selected);
  const ext = heroesExtendedData[selected];
  const s = stats[selected] || {};
  const tagColor = hero ? seasonColors[hero.season] || '#f97316' : '#f97316';
  const synergies = getSynergies(selected, _heroesTabState);
  const heroCombos = getHeroAtlasCombos(selected, _heroesTabState);
  const comboScope = _heroesTabState.comboScope;
  const comboScopeHint =
    comboScope === 'season-capped'
      ? (
          t.heroesComboScopeHint || 'Combos using heroes up to {season} within your season filters.'
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

  const mergedSkills = mergeHeroSkills(selected, ext);
  const skillsHtml = mergedSkills.length
    ? mergedSkills
        .map((sk) => {
          const canonicalTarget = String(sk.target || 'Target not captured');
          const skillTarget = heroSkillText(selected, sk, 'target') || heroUi('targetNotCaptured');
          const skillType = heroSkillText(selected, sk, 'type');
          const skillDescription = heroSkillText(selected, sk, 'desc');
          const targetClass = canonicalTarget.toLowerCase().includes('enemy') ? 'enemy' : 'ally';
          const skillStatus =
            sk.sourceSurface === 'codex'
              ? provenanceFor(sk)?.verificationStatus || 'unverified'
              : 'current';
          const translationChip =
            sk.sourceSurface === 'codex' && normalizeHeroAtlasLocale(currentLanguage) !== 'en'
              ? `<span class="codex-chip codex-chip--translation" title="${escapeHtml(heroUi('skillTranslationMissing'))}">EN</span>`
              : '';
          return `
        <article class="detail-skill" aria-label="${escapeHtml(heroUi('skill'))} ${escapeHtml(String(sk.id))}">
          <div class="detail-skill-rail" aria-hidden="true">${escapeHtml(String(sk.id).padStart(2, '0'))}</div>
          <div class="detail-skill-body">
            <div class="detail-skill-header">
              <span class="detail-skill-id">${escapeHtml(heroUi('skill'))} ${escapeHtml(String(sk.id))}</span>
              ${renderSkillType(sk.type, skillType)}
              ${sk.range && sk.range !== '-' ? `<span class="detail-skill-range">${escapeHtml(heroUi('range'))} ${escapeHtml(String(sk.range))}</span>` : ''}
              ${renderVerificationChip(skillStatus, { ariaBase: heroUi('skillVerification', { status: skillStatus }) })}
              ${translationChip}
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

  const duelRecords = duelRecordsForHero(selected);
  const firstDetailSection =
    synergies.length > 0 ? 'synergies' : heroSkinsList.length > 0 ? 'skins' : 'skills';
  const detailNavHtml = `
        <nav class="detail-nav" aria-label="${escapeHtml(heroUi('heroDetailSections'))}">
          ${synergies.length > 0 ? `<button type="button" class="detail-nav-btn active" data-detail-section="synergies" aria-current="location">${escapeHtml(heroUi('synergies'))}</button>` : ''}
          ${heroSkinsList.length > 0 ? `<button type="button" class="detail-nav-btn ${firstDetailSection === 'skins' ? 'active' : ''}" data-detail-section="skins"${firstDetailSection === 'skins' ? ' aria-current="location"' : ''}>${escapeHtml(t.heroesBioSkinsTitle || 'Bio Skins')}</button>` : ''}
          <button type="button" class="detail-nav-btn ${firstDetailSection === 'skills' ? 'active' : ''}" data-detail-section="skills"${firstDetailSection === 'skills' ? ' aria-current="location"' : ''}>${escapeHtml(t.heroesSkillsTitle || 'Skills')}</button>
          <button type="button" class="detail-nav-btn" data-detail-section="combos">${escapeHtml(t.heroesTopCombos || 'Top Combos')}</button>
          <button type="button" class="detail-nav-btn" data-detail-section="duels">${escapeHtml(heroUi('duelsTitle'))}</button>
          ${hasHeroCounters ? `<button type="button" class="detail-nav-btn" data-detail-section="counters">${escapeHtml(heroUi('counters'))}</button>` : ''}
        </nav>`;

  const heroRecord = codexHeroRecord(selected);
  const headerStatus = worstCodexStatus([heroRecord, ...duelRecords].filter(Boolean));
  const headerChip = heroRecord
    ? `<span class="detail-codex-chip">${renderVerificationChip(headerStatus)}</span>`
    : '';

  return `
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
                ${headerChip}
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
              <div class="detail-skills" data-skill-count="${mergedSkills.length || 0}">${skillsHtml}</div>
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

            ${renderDuelSection(selected)}

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

function codexSortHeroes(heroes, stats, preset, deltas) {
  const sort = _heroesTabState.codexSort || 'name';
  return [...heroes].sort((a, b) => {
    const aStats = stats[a.name] || {};
    const bStats = stats[b.name] || {};
    if (sort === 'season') {
      return getSeasonIndex(a.season) - getSeasonIndex(b.season) || a.name.localeCompare(b.name);
    }
    if (sort === 'rating') {
      return (bStats.finalRating || 0) - (aStats.finalRating || 0) || a.name.localeCompare(b.name);
    }
    if (sort === 'access') {
      const rank = { standard: 0, paid: 1, royal: 2 };
      const aAccess = codexAccessFor(a.name);
      const bAccess = codexAccessFor(b.name);
      return rank[aAccess] - rank[bAccess] || a.name.localeCompare(b.name);
    }
    if (sort === 'skin-type') {
      const aSkin = getSkinForHero(a.name);
      const bSkin = getSkinForHero(b.name);
      return (
        String(aSkin?.type || '').localeCompare(String(bSkin?.type || '')) ||
        a.name.localeCompare(b.name)
      );
    }
    if (sort === 'rank-delta') {
      return (deltas.get(b.name) || 0) - (deltas.get(a.name) || 0) || a.name.localeCompare(b.name);
    }
    return a.name.localeCompare(b.name);
  });
}

function codexAccessLabel(heroName) {
  const access = codexAccessFor(heroName);
  const key =
    access === 'royal' ? 'accessRoyal' : access === 'standard' ? 'accessStandard' : 'accessPaid';
  return `<span class="codex-access codex-access--${access}">${escapeHtml(heroUi(key))}</span>`;
}

function renderCodexRow(hero, stats, preset, skinModeDeltas) {
  const s = stats[hero.name] || {};
  const status = heroCodexStatus(hero.name);
  const verification = status
    ? renderVerificationChip(status)
    : `<span class="codex-chip-placeholder" aria-hidden="true">—</span>`;
  const seasonMeta = `
    <span class="codex-season" style="--sc:${seasonColors[hero.season] || '#f97316'}">${hero.season}</span>
    ${hero.releaseSeason && hero.releaseSeason !== hero.season ? `<span class="codex-origin">${escapeHtml(heroUi('original'))} ${escapeHtml(hero.releaseSeason)}</span>` : ''}`;
  if (preset === 'free') {
    const finalPct = Math.min(100, s.finalRating || 0).toFixed(0);
    return `
    <button type="button" class="hero-rank-row hero-codex-row" data-hero-name="${escapeHtml(hero.name)}" aria-pressed="false">
      <img class="rank-img" src="${escapeHtml(hero.imageUrl)}" alt="${escapeHtml(hero.name)}" width="36" height="36" loading="lazy" decoding="async" data-fallback-src="images/logo.png">
      <span class="codex-col-name">${escapeHtml(hero.name)}</span>
      <span class="codex-col-season">${seasonMeta}</span>
      <span class="codex-col-troop">${getLocalizedTroop(hero.Type)}</span>
      <span class="codex-col-rating">${s.finalRating > 0 ? finalPct : '—'}</span>
      <span class="codex-col-rank">${s.topComboRank !== Infinity ? '#' + s.topComboRank : '—'}</span>
      <span class="codex-col-skins">${getSkinCount(hero.name)}</span>
      <span class="codex-col-verify">${verification}</span>
    </button>`;
  }
  if (preset === 'paid') {
    return `
    <button type="button" class="hero-rank-row hero-codex-row" data-hero-name="${escapeHtml(hero.name)}" aria-pressed="false">
      <img class="rank-img" src="${escapeHtml(hero.imageUrl)}" alt="${escapeHtml(hero.name)}" width="36" height="36" loading="lazy" decoding="async" data-fallback-src="images/logo.png">
      <span class="codex-col-name">${escapeHtml(hero.name)}${paidIconHtml()}</span>
      <span class="codex-col-season">${seasonMeta}</span>
      <span class="codex-col-troop">${getLocalizedTroop(hero.Type)}</span>
      <span class="codex-col-access">${codexAccessLabel(hero.name)}</span>
      <span class="codex-col-rating">${s.finalRating > 0 ? Math.min(100, s.finalRating).toFixed(0) : '—'}</span>
      <span class="codex-col-skins">${getSkinCount(hero.name)}</span>
      <span class="codex-col-verify">${verification}</span>
    </button>`;
  }
  const skin = getSkinForHero(hero.name);
  const skinType = skin ? SKIN_TYPES[skin.type] || SKIN_TYPES.Mythic : null;
  const starCost = skin ? skinStarUpCostSummary(skin) : null;
  const hiddenPower = getHeroHiddenPower(hero.name);
  const delta = skinModeDeltas.get(hero.name) || 0;
  return `
    <button type="button" class="hero-rank-row hero-codex-row" data-hero-name="${escapeHtml(hero.name)}" aria-pressed="false">
      <img class="rank-img" src="${escapeHtml(hero.imageUrl)}" alt="${escapeHtml(hero.name)}" width="36" height="36" loading="lazy" decoding="async" data-fallback-src="images/logo.png">
      <span class="codex-col-name">${escapeHtml(hero.name)}</span>
      <span class="codex-col-skin">${skin ? `<span class="codex-skin-type" style="--skin-accent:${escapeHtml(skinType?.color || '')}">${escapeHtml(skinType?.icon || '')} ${escapeHtml(heroContentText(skinType?.label || skin.type))}</span>` : '—'}</span>
      <span class="codex-col-starcost" title="${starCost ? escapeHtml(starCost) : ''}">${starCost ? escapeHtml(starCost) : '—'}</span>
      <span class="codex-col-hiddenpower">${hiddenPower ? '●' : '—'}</span>
      <span class="codex-col-rankdelta">${delta > 0 ? `<span class="codex-rank-delta">+${delta}</span>` : '—'}</span>
      <span class="codex-col-verify">${verification}</span>
    </button>`;
}

function renderCodexView() {
  const { codexPreset } = _heroesTabState;
  const t = translations[currentLanguage] || translations.en;
  const stats = computeHeroRankings();
  const query = (_heroesTabState.search || '').trim().toLowerCase();
  const normalizedSeasons = normalizeHeroAtlasSeasons(_heroesTabState.seasons);
  const seasonSet = new Set(normalizedSeasons);
  const skinModeDeltas = projectSkinModeRankDeltas(
    baseRankedCombos,
    filterCombosForSkinMode(rankedCombos, true, () => true),
    allHeroesData.map((hero) => hero.name)
  );

  let heroes = [];
  if (codexPreset === 'free') {
    heroes = allHeroesData.filter((hero) => hero.State === 'Free');
  } else if (codexPreset === 'paid') {
    heroes = allHeroesData.filter((hero) => hero.State === 'Paid');
  } else {
    heroes = allHeroesData.filter(
      (hero) => getHeroSkins(hero.name).length > 0 || hero.State === 'Paid'
    );
  }
  heroes = heroes.filter((hero) => seasonSet.has(hero.season));
  if (query) heroes = heroes.filter((hero) => hero.name.toLowerCase().includes(query));

  const sorted = codexSortHeroes(heroes, stats, codexPreset, skinModeDeltas);
  const visible = sorted.slice(0, _heroesTabState.limit);

  const sortOptions =
    codexPreset === 'free'
      ? [
          ['name', heroUi('name')],
          ['season', heroUi('season')],
          ['rating', heroUi('rating')],
        ]
      : codexPreset === 'paid'
        ? [
            ['name', heroUi('name')],
            ['season', heroUi('season')],
            ['access', heroUi('codexColAccess')],
          ]
        : [
            ['name', heroUi('name')],
            ['skin-type', heroUi('codexColSkinType')],
            ['rank-delta', heroUi('codexColRankDelta')],
          ];

  const emptyKey =
    codexPreset === 'free'
      ? 'codexEmptyFree'
      : codexPreset === 'paid'
        ? 'codexEmptyPaid'
        : 'codexEmptySkinsPaid';

  const rowsHtml = visible.length
    ? visible.map((hero) => renderCodexRow(hero, stats, codexPreset, skinModeDeltas)).join('')
    : `<p class="hero-atlas-empty">${escapeHtml(heroUi(emptyKey))}</p>`;

  const showMoreHtml =
    sorted.length > _heroesTabState.limit
      ? `
      <div class="hero-tab-show-more-wrap">
        <button type="button" class="hero-tab-show-more">
          ${escapeHtml(heroUi('showMore'))} (${sorted.length - _heroesTabState.limit} ${escapeHtml(heroUi('remaining'))})
        </button>
      </div>`
      : '';

  const headHtml =
    codexPreset === 'free'
      ? `
    <span class="codex-col-name">${escapeHtml(heroUi('name'))}</span>
    <span class="codex-col-season">${escapeHtml(heroUi('season'))}</span>
    <span class="codex-col-troop">${escapeHtml(heroUi('troop'))}</span>
    <span class="codex-col-rating">${escapeHtml(heroUi('rating'))}</span>
    <span class="codex-col-rank">${escapeHtml(heroUi('bestRank'))}</span>
    <span class="codex-col-skins">${escapeHtml(heroUi('skins'))}</span>
    <span class="codex-col-verify">${escapeHtml(heroUi('codexColVerification'))}</span>`
      : codexPreset === 'paid'
        ? `
    <span class="codex-col-name">${escapeHtml(heroUi('name'))}</span>
    <span class="codex-col-season">${escapeHtml(heroUi('season'))}</span>
    <span class="codex-col-troop">${escapeHtml(heroUi('troop'))}</span>
    <span class="codex-col-access">${escapeHtml(heroUi('codexColAccess'))}</span>
    <span class="codex-col-rating">${escapeHtml(heroUi('rating'))}</span>
    <span class="codex-col-skins">${escapeHtml(heroUi('skins'))}</span>
    <span class="codex-col-verify">${escapeHtml(heroUi('codexColVerification'))}</span>`
        : `
    <span class="codex-col-name">${escapeHtml(heroUi('name'))}</span>
    <span class="codex-col-skin">${escapeHtml(heroUi('codexColSkinType'))}</span>
    <span class="codex-col-starcost">${escapeHtml(heroUi('codexColStarCost'))}</span>
    <span class="codex-col-hiddenpower">${escapeHtml(heroUi('limitedHeroMechanic'))}</span>
    <span class="codex-col-rankdelta">${escapeHtml(heroUi('codexColRankDelta'))}</span>
    <span class="codex-col-verify">${escapeHtml(heroUi('codexColVerification'))}</span>`;

  const loadStatus = codexLoadStatus();
  void hydrateCodexStore();

  return `
    <div class="heroes-tab-inner heroes-tab-inner--codex" data-codex-state="${loadStatus}">
      <div class="heroes-toolbar-sticky heroes-toolbar-sticky--codex">
        <div class="heroes-toolbar">
          <div class="hero-search-wrap heroes-search-field">
            <svg class="hero-search-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 15.803a7.5 7.5 0 0 0 10.607 0Z"/></svg>
            <input id="heroesTabSearch" name="heroesSearch" class="hero-search-input" type="search" placeholder="${escapeHtml(t.heroSearchPh || 'Search heroes...')}" aria-label="${escapeHtml(t.heroSearchPh || 'Search heroes...')}" value="${escapeHtml(_heroesTabState.search)}" autocomplete="off" spellcheck="false" />
          </div>
          <div class="heroes-toolbar-actions">
            <span class="heroes-count-badge">${heroes.length}</span>
            <label class="heroes-sort-control" title="${escapeHtml(heroUi('codexSort'))}">
              <span>${escapeHtml(heroUi('sort'))}</span>
              <select id="heroesSortSelect">
                ${sortOptions
                  .map(
                    ([value, label]) =>
                      `<option value="${value}"${_heroesTabState.codexSort === value ? ' selected' : ''}>${escapeHtml(label)}</option>`
                  )
                  .join('')}
              </select>
            </label>
            <button type="button" class="heroes-export-btn" data-heroes-export>${escapeHtml(heroUi('exportCsv'))}</button>
          </div>
        </div>
        <div class="heroes-filter-deck heroes-filter-deck--codex">
          <div class="heroes-filter-pills heroes-filter-pills--codex" role="group" aria-label="${escapeHtml(heroUi('codexModeName'))}">
            ${CODEX_PRESETS.map(
              (preset) => `
            <button type="button" class="heroes-filter-pill ${codexPreset === preset ? 'active' : ''}" data-codex-preset="${preset}" aria-pressed="${codexPreset === preset}">
              ${escapeHtml(heroUi(preset === 'free' ? 'codexPresetFree' : preset === 'paid' ? 'codexPresetPaid' : 'codexPresetSkinsPaid'))}
            </button>`
            ).join('')}
          </div>
          <p class="heroes-season-hint">${escapeHtml(heroUi('codexModeHint'))}</p>
          <div class="heroes-season-tabs" role="group" aria-label="${escapeHtml(heroUi('seasonFilterAria'))}">
            ${normalizedSeasons
              .map(
                (s) => `
            <button type="button" class="hero-tab-season ${seasonSet.has(s) ? 'active' : ''}" data-hero-season="${s}" aria-pressed="${seasonSet.has(s)}"
              ${seasonColors[s] ? `style="--sc:${seasonColors[s]}"` : ''}>${s}</button>`
              )
              .join('')}
          </div>
        </div>
      </div>
      <div class="codex-table" aria-label="${escapeHtml(heroUi('codexModeName'))}">
        <div class="codex-table-head" aria-hidden="true">${headHtml}</div>
        <div class="codex-table-body">${rowsHtml}</div>
      </div>
      ${showMoreHtml}
    </div>`;
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
  const gallerySearchHadFocus = document.activeElement?.id === 'skinsGallerySearch';
  const gallerySearchCaret = document.getElementById('skinsGallerySearch')?.selectionStart ?? null;

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

  const mode = _heroesTabState.mode || 'heroes';
  if (mode === 'skins') {
    container.innerHTML = renderSkinsView();
    if (gallerySearchHadFocus) {
      const galleryInput = document.getElementById('skinsGallerySearch');
      if (galleryInput) {
        galleryInput.focus();
        if (gallerySearchCaret != null) {
          galleryInput.setSelectionRange(gallerySearchCaret, gallerySearchCaret);
        }
      }
    }
    return;
  }

  if (mode === 'codex') {
    container.innerHTML = renderCodexView();
    if (searchHadFocus) {
      const searchInput = document.getElementById('heroesTabSearch');
      if (searchInput) {
        searchInput.focus();
        if (searchCaret != null) searchInput.setSelectionRange(searchCaret, searchCaret);
      }
    }
    return;
  }

  const troops = ['all', 'Archers', 'Footmen', 'Cavalry'];
  const states = ['all', 'Free', 'Paid'];
  const filtered = getFilteredHeroes();
  const filtersActive = heroesFiltersActive();
  const normalizedSeasons = normalizeHeroAtlasSeasons(selectedSeasons);
  const allSeasonsSelected = normalizedSeasons.length === POPULATED_HERO_SEASONS.length;

  const seasonTabsHtml = `
    <button type="button" class="hero-tab-season ${allSeasonsSelected ? 'active' : ''}" data-hero-season="all" aria-pressed="${allSeasonsSelected}" title="${escapeHtml(heroUi('selectAllSeasons'))}">
      ${escapeHtml(heroUi('all'))}
    </button>
    ${POPULATED_HERO_SEASONS.map(
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

    const detailHtml = selected ? renderHeroDetailPanel(selected, stats, t) : '';

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
