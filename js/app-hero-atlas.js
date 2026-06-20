
import { currentLanguage, selectedSeasons, db, seasonColors, HERO_ATLAS_ALL_SEASONS, paidIconHtml, heroesSection, getTroopColorClass, getLocalizedTroop, getHeroImageUrl, getComboRankInfo, getCounterLabels } from './state.js';
import { translations } from './translations.js';
import { baseRankedCombos } from './combos-db.js';
import { heroesExtendedData } from './heroes-info.js';
import { allHeroesData } from './heroes-data.js';
import { heroBonusPoints } from './hero-bonuses.js';
import { escapeHtml } from './utils.js';
import { hasSkin, getHeroSkins, getSkinCount, getHeroHiddenPower, SKIN_TYPES } from './skins-db.js';

import {
  getCombosCounteredByHero,
  getCountersAgainstHero,
  renderCounterMatchupList,
  renderCountersToggle
} from './combo-counters.js';

function getHeroFinalScore(heroName, autoRating) {
  const bonus = heroBonusPoints[heroName] || 0;
  return Math.min(100, Math.max(0, autoRating + bonus));
}

const SKILL_TYPE_TOOLTIPS = {
  'Active Skill': 'A skill that can trigger during battle when its conditions and chance roll are met.',
  'Additional Attack': 'Adds or modifies normal attacks, often creating extra hits or effects after attacks.',
  'Combat Skill': 'A castable battle skill. Some have prep time, chance to trigger, range, and target rules.',
  'Leadership Skill': 'A commander-style passive effect that usually applies as long as the hero is in the legion.',
  'Pre-Battle Skills': 'Applies before or at battle start, often setting buffs, debuffs, opening conditions, or early-round rules.',
  'Status Skill': 'A passive/status-driven skill that changes states, immunities, damage rules, or ongoing battle behavior.',
};

const SKILL_TERM_TOOLTIPS = {
  'Armor break': 'Reduces defensive value, making affected squads take more damage.',
  'Bleeding': 'A damage-over-time style status that keeps hurting the affected squad while active.',
  'Chain': 'Damage or effects can jump from one squad to another.',
  'Clarity': 'A cleansing or control-resistance state that helps remove or avoid negative effects.',
  'Combat Skill Damage': 'Damage dealt specifically by combat skills, not normal attacks.',
  'Confuse': 'Affected squad may attack or cast skills on random targets.',
  'Confused': 'Affected squad may attack or cast skills on random targets.',
  'Control Debuff': 'A disabling status such as Silence, Disarm, Suppress, or Confuse.',
  'Counter-attack': 'Deals damage back after being attacked or after a matching trigger.',
  'Counterattack': 'Deals damage back after being attacked or after a matching trigger.',
  'Cursed': 'Punishes the affected squad when it performs certain actions, often skill casting.',
  'Destructive Strike': 'A special damage effect that can bypass or punish defenses depending on the skill.',
  'Disarm': 'Prevents normal attacks while active.',
  'Disarmed': 'Prevents normal attacks while active.',
  'Dodge': 'Avoids an incoming damage instance or attack while active.',
  'Dodging': 'Avoids an incoming damage instance or attack while active.',
  'Fatal Blow': 'A special strike effect with its own chance and damage rate, often scaling with buffs.',
  'Faltering': 'A weakening status that reduces effectiveness while active.',
  'Feverish': 'A stackable buff used by some heroes to increase follow-up effects, damage, or trigger chances.',
  'First-Aid': 'Healing or recovery effect that restores troop power.',
  'First to Attack': 'Acts before enemy squads, which can unlock extra skill effects for some heroes.',
  'Flammable': 'A status that makes the target vulnerable to fire-related effects.',
  'Healing': 'Restores troop power to one or more squads.',
  'Interrupting': 'Stops a channeling or prep skill before it completes.',
  'Mass Attack': 'A normal attack state that hits additional enemy squads beyond the main target.',
  'Normal Attack': 'The basic attack a squad performs without casting a combat skill.',
  'Physical Damage': 'Damage type usually tied to normal or physical strikes.',
  'Poisoned': 'A damage-over-time status that keeps hurting the affected squad while active.',
  'Prep Skills': 'Skills that need one or more rounds of preparation before firing.',
  'Recovery': 'Restores troop power; usually shown as a recovery rate.',
  'Revived': 'Returns or restores a defeated or heavily damaged squad effect depending on the skill.',
  'Silence': 'Prevents combat skill casting while active.',
  'Silenced': 'Prevents combat skill casting while active.',
  'Skill Damage': 'Damage dealt by a skill rather than a normal attack.',
  'Sober': 'A control-immunity or cleansing state; usually protects from disabling effects for its duration.',
  'Splash': 'Damage spills onto nearby or additional squads.',
  'Suppress': 'Prevents the squad from acting or casting depending on the skill wording.',
  'Suppressed': 'Prevents the squad from acting or casting depending on the skill wording.',
  'Taunt': 'Forces or redirects enemy attacks toward the taunting squad.',
  'Taunting': 'Forces or redirects enemy attacks toward the taunting squad.',
  'Troop Recovery Block': 'Prevents affected squads from recovering troop power while active.',
  'Vulnerable': 'Affected squad takes more damage or loses protection while active.',
};

function normalizeHelpKey(value) {
  return String(value || '').trim().toLowerCase();
}

const SKILL_TYPE_HELP_BY_KEY = Object.fromEntries(
  Object.entries(SKILL_TYPE_TOOLTIPS).map(([term, desc]) => [normalizeHelpKey(term), { term, desc }])
);

const SKILL_TERM_HELP_BY_KEY = Object.fromEntries(
  Object.entries(SKILL_TERM_TOOLTIPS).map(([term, desc]) => [normalizeHelpKey(term), { term, desc }])
);

function renderHelpChip(label, description, className = '') {
  const safeLabel = escapeHtml(String(label || ''));
  const safeDescription = escapeHtml(String(description || ''));
  return `<span class="skill-help-chip ${className}" tabindex="0" title="${safeDescription}" aria-label="${safeLabel}: ${safeDescription}" data-tooltip="${safeDescription}">${safeLabel}</span>`;
}

function renderSkillType(type) {
  const info = SKILL_TYPE_HELP_BY_KEY[normalizeHelpKey(type)];
  if (!info) return `<span class="detail-skill-type">${escapeHtml(type)}</span>`;
  return `<span class="detail-skill-type detail-skill-type-help">${renderHelpChip(type, info.desc, 'skill-help-chip--type')}</span>`;
}

function escapeRegExp(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function formatSkillText(text) {
  let counter = 0;
  const tokens = {};
  const alpha = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  
  function tokenize(html) {
    const token = `_TK${alpha[counter++]}_`;
    tokens[token] = html;
    return token;
  }

  let formatted = escapeHtml(String(text || '')).replace(/<\/?b>/gi, '').replace(/<\/?u>/gi, '');

  formatted = formatted.replace(/([+-]?\d+(?:\.\d+)?%)/g, (match) => 
    tokenize(`<span class="font-black text-sky-400 bg-sky-900/30 px-1 rounded">${match}</span>`)
  );
  
  formatted = formatted.replace(/(\d+\s*(?:turns|turn|rounds|round|times|time|layers|layer|roun|min|hr))/gi, (match) => 
    tokenize(`<span class="font-bold text-amber-400">${match}</span>`)
  );
  
  const termPattern = Object.keys(SKILL_TERM_HELP_BY_KEY)
    .map(key => SKILL_TERM_HELP_BY_KEY[key].term)
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp)
    .join('|');

  if (termPattern) {
    const termRegex = new RegExp(`(^|[^A-Za-z])(${termPattern})(?=$|[^A-Za-z])`, 'gi');
    formatted = formatted.replace(termRegex, (match, prefix, term) => {
      const info = SKILL_TERM_HELP_BY_KEY[normalizeHelpKey(term)];
      if (!info) return match;
      return `${prefix}${tokenize(renderHelpChip(term, info.desc, 'skill-help-chip--term'))}`;
    });
  }

  formatted = formatted.replace(/\b(\d+)\b/g, (match) => 
    tokenize(`<span class="font-bold text-white bg-slate-700/50 px-1 rounded mx-0.5">${match}</span>`)
  );

  for (const [token, html] of Object.entries(tokens)) {
    formatted = formatted.replace(token, html);
  }

  return formatted;
}

function renderHiddenPowerCard(hiddenPower) {
  if (!hiddenPower) return '';

  const progressText = Number.isFinite(hiddenPower.capturedVariants) && Number.isFinite(hiddenPower.totalVariants)
    ? `${hiddenPower.capturedVariants}/${hiddenPower.totalVariants} variants captured`
    : '';

  const tiersHtml = (hiddenPower.tiers || []).map(tier => `
    <div class="detail-skin-hidden-tier">
      <div class="detail-skin-hidden-tier-mark">x${escapeHtml(String(tier.collected))}</div>
      <div class="detail-skin-hidden-tier-body">
        <div class="detail-skin-hidden-tier-name">${escapeHtml(tier.name)}</div>
        <p class="detail-skin-hidden-tier-effect">${escapeHtml(tier.effect)}</p>
        ${tier.stats ? `<div class="detail-skin-hidden-stats">
          ${tier.stats.map(stat => `
            <span class="detail-skin-hidden-stat">
              <span>${escapeHtml(stat.label)}</span>
              <strong>${escapeHtml(stat.value)}</strong>
            </span>
          `).join('')}
        </div>` : ''}
      </div>
    </div>
  `).join('');

  return `
    <div class="detail-skin-card detail-skin-hidden-power-card">
      <div class="detail-skin-hidden-head">
        <div>
          <div class="detail-skin-hidden-kicker">Limited hero mechanic</div>
          <div class="detail-skin-hidden-title">${escapeHtml(hiddenPower.title || 'Biography: Hidden Power')}</div>
        </div>
        ${progressText ? `<span class="detail-skin-hidden-progress">${escapeHtml(progressText)}</span>` : ''}
      </div>
      ${hiddenPower.requirement ? `<div class="detail-skin-hidden-requirement">${escapeHtml(hiddenPower.requirement)}</div>` : ''}
      ${hiddenPower.mechanic ? `<p class="detail-skin-hidden-copy">${escapeHtml(hiddenPower.mechanic)}</p>` : ''}
      ${tiersHtml}
      ${hiddenPower.scalingNote ? `<p class="detail-skin-hidden-note">${escapeHtml(hiddenPower.scalingNote)}</p>` : ''}
    </div>`;
}

const _heroSeasonByName = new Map(allHeroesData.map(h => [h.name, h.season]));
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

  return combo.heroes.every(hn => {
    const hs = getHeroSeason(hn);
    if (!hs) return false;
    if (getSeasonIndex(hs) > capIdx) return false;
    if (hs === 'S0') return true;
    return seasonSet.has(hs);
  });
}

function getHeroAtlasCombos(heroName, state, limit = 5) {
  const scope = state.comboScope || 'season-capped';
  const eligible = baseRankedCombos.filter(c =>
    comboFitsHeroSeasonScope(c, heroName, state.seasons, scope),
  );
  const total = eligible.length;
  return eligible.map((c, i) => ({
    heroes: c.heroes,
    rank: i + 1,
    score: (total > 1 ? 100 - ((i / (total - 1)) * 99) : 100).toFixed(1),
  })).slice(0, limit);
}

function getSynergies(heroName, state = _heroesTabState) {
  const scope = state.comboScope || 'season-capped';
  const containingCombos = baseRankedCombos.filter(c =>
    comboFitsHeroSeasonScope(c, heroName, state.seasons, scope),
  );
  const top5 = containingCombos.slice(0, 5);
  if (top5.length === 0) return [];

  const counts = {};
  top5.forEach(combo => {
    combo.heroes.forEach(h => {
      if (h !== heroName) counts[h] = (counts[h] || 0) + 1;
    });
  });

  const sortedPartners = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(entry => entry[0]);

  return sortedPartners.slice(0, 3);
}

// ─── HEROES TAB: detail view + auto-ranking ───────────────────────────────────
function computeHeroRankings() {
  const total = baseRankedCombos.length;
  const stats = {};

  allHeroesData.forEach(hero => {
    stats[hero.name] = { appearances: 0, weightedScore: 0, topComboRank: Infinity };
  });

  baseRankedCombos.forEach((combo, idx) => {
    const score = total > 1 ? 100 - ((idx / (total - 1)) * 99) : 100;
    (combo.heroes || []).forEach(heroName => {
      const s = stats[heroName];
      if (s) {
        s.appearances++;
        s.weightedScore += score;
        if (idx + 1 < s.topComboRank) s.topComboRank = idx + 1;
      }
    });
  });

  allHeroesData.forEach(h => {
    const s = stats[h.name];
    let autoRating = s.appearances > 0
      ? ((s.weightedScore / s.appearances) * 0.6 + (s.appearances / total * 100) * 0.4)
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
  limit: 20
};
let _heroesTabEventsWired = false;
let _heroesSearchTimer = null;
let _heroesUrlParamsApplied = false;

function normalizeTroopParam(value) {
  const v = String(value || '').trim().toLowerCase();
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
    const seasons = seasonParam.split(',').map(s => s.trim().toUpperCase()).filter(s => HERO_ATLAS_ALL_SEASONS.includes(s));
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
  if (selected && allHeroesData.some(h => h.name.toLowerCase() === selected.toLowerCase())) {
    _heroesTabState.selected = allHeroesData.find(h => h.name.toLowerCase() === selected.toLowerCase()).name;
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
  const picked = HERO_ATLAS_ALL_SEASONS.filter(s => (seasons || []).includes(s));
  return picked.length ? picked : [...HERO_ATLAS_ALL_SEASONS];
}

function getFilteredHeroes(state = _heroesTabState) {
  const { seasons, troop, state: heroState, search } = state;
  const q = (search || '').trim().toLowerCase();
  const seasonSet = new Set(normalizeHeroAtlasSeasons(seasons));
  let filtered = allHeroesData.filter(h => seasonSet.has(h.season));
  if (troop !== 'all') filtered = filtered.filter(h => h.Type === troop || h.Type === 'All');
  if (heroState !== 'all') filtered = filtered.filter(h => h.State === heroState);
  if (q) filtered = filtered.filter(h => h.name.toLowerCase().includes(q));
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
      const aRank = aStats.topComboRank === Infinity ? Number.MAX_SAFE_INTEGER : (aStats.topComboRank || Number.MAX_SAFE_INTEGER);
      const bRank = bStats.topComboRank === Infinity ? Number.MAX_SAFE_INTEGER : (bStats.topComboRank || Number.MAX_SAFE_INTEGER);
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
  const header = ['Name', 'Season', 'Original Season', 'Troop', 'State', 'Rating', 'Appearances', 'Best Rank', 'Skins'];
  const lines = [header.map(csvCell).join(',')];
  rows.forEach(hero => {
    const s = stats[hero.name] || {};
    lines.push([
      hero.name,
      hero.season,
      hero.releaseSeason || '',
      hero.Type,
      hero.State || 'Free',
      s.finalRating > 0 ? Math.min(100, s.finalRating).toFixed(1) : '',
      s.appearances || 0,
      s.topComboRank !== Infinity ? s.topComboRank : '',
      getSkinCount(hero.name)
    ].map(csvCell).join(','));
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
    window.showToast(`Exported ${rows.length} heroes to CSV.`, 'success');
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
    ? HERO_ATLAS_ALL_SEASONS.filter(s => set.has(s))
    : [...HERO_ATLAS_ALL_SEASONS];
}

function syncHeroSelectionWithFilters() {
  if (!_heroesTabState.selected) return;
  const filtered = getFilteredHeroes();
  if (!filtered.some(h => h.name === _heroesTabState.selected)) {
    _heroesTabState.selected = null;
  }
}

function selectHeroInAtlas(name) {
  if (!name) return;
  _heroesTabState.selected = _heroesTabState.selected === name ? null : name;
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
      _heroesTabState.selected = pickHero.dataset.heroPick;
      updateHeroAtlasUrlParams();
      renderHeroesTab();
      return;
    }

    if (e.target.closest('[data-hero-close]')) {
      _heroesTabState.selected = null;
      updateHeroAtlasUrlParams();
      renderHeroesTab();
      return;
    }

    const sectionBtn = e.target.closest('[data-detail-section]');
    if (sectionBtn) {
      const target = container.querySelector(`#detail-section-${sectionBtn.dataset.detailSection}`);
      target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      container.querySelectorAll('[data-detail-section]').forEach(btn => {
        btn.classList.toggle('active', btn === sectionBtn);
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

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !_heroesTabState.selected) return;
    if (document.getElementById('heroesSection')?.classList.contains('hidden')) return;
    _heroesTabState.selected = null;
    updateHeroAtlasUrlParams();
    renderHeroesTab();
  });
}

function renderHeroesTab() {
  const container = document.getElementById('heroesTabContent');
  if (!container) return;
  applyHeroAtlasUrlParams();

  wireHeroesTabEvents(container);

  const searchHadFocus = document.activeElement?.id === 'heroesTabSearch';
  const searchCaret = document.getElementById('heroesTabSearch')?.selectionStart ?? null;

  const stats = computeHeroRankings();
  const { seasons: selectedSeasons, troop, state, search, selected, view, comboScope, sort } = _heroesTabState;
  const t = translations[currentLanguage] || translations.en;

  const troops = ['all','Archers','Footmen','Cavalry'];
  const states = ['all','Free','Paid'];
  const filtered = getFilteredHeroes();
  const filtersActive = heroesFiltersActive();
  const normalizedSeasons = normalizeHeroAtlasSeasons(selectedSeasons);
  const allSeasonsSelected = normalizedSeasons.length === HERO_ATLAS_ALL_SEASONS.length;

  const seasonTabsHtml = `
    <button type="button" class="hero-tab-season ${allSeasonsSelected ? 'active' : ''}" data-hero-season="all" title="Select all seasons">
      All
    </button>
    ${HERO_ATLAS_ALL_SEASONS.map(s => `
    <button type="button" class="hero-tab-season ${normalizedSeasons.includes(s) ? 'active' : ''}" data-hero-season="${s}"
      ${seasonColors[s] ? `style="--sc:${seasonColors[s]}"` : ''}>
      ${s}
    </button>`).join('')}`;

  const troopPillsHtml = troops.map(tr => `
    <button type="button" class="heroes-filter-pill ${troop === tr ? 'active' : ''}" data-hero-troop="${tr}">
      ${tr === 'all' ? 'All troops' : getLocalizedTroop(tr)}
    </button>`).join('');

  const statePillsHtml = states.map(st => `
    <button type="button" class="heroes-filter-pill ${state === st ? 'active' : ''}" data-hero-state="${st}">
      ${st === 'all' ? 'All' : st}
    </button>`).join('');

  if (view === 'ranking') {
    const ranked = getSortedHeroes(filtered, stats, sort);

    const visibleRanked = ranked.slice(0, _heroesTabState.limit);
    const rowsHtml = visibleRanked.length ? visibleRanked.map((hero, i) => {
      const s = stats[hero.name] || {};
      const finalPct = Math.min(100, s.finalRating || 0).toFixed(0);
      const tagColor = seasonColors[hero.season] || '#f97316';
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '';
      const rankNumber = i < 3 ? medal : `${i + 1}`;
      const rankClass = i < 3 ? 'rank-medal' : 'rank-medal rank-medal--num';
      return `
        <div class="hero-rank-row ${selected === hero.name ? 'selected' : ''}" data-hero-name="${escapeHtml(hero.name)}">
          <span class="${rankClass}">${rankNumber}</span>
          <img class="rank-img" src="${escapeHtml(hero.imageUrl)}" alt="${escapeHtml(hero.name)}" onerror="this.src='images/logo.png'">
          <div class="rank-info">
            <div class="rank-name">
              ${escapeHtml(hero.name)}
              ${hero.State === 'Paid' ? paidIconHtml() : ''}
            </div>
            <div class="rank-meta">
              <span style="color:${tagColor};font-weight:800;">${hero.season}</span>
              ${hero.releaseSeason && hero.releaseSeason !== hero.season ? `<span class="rank-apps">Original ${escapeHtml(hero.releaseSeason)}</span>` : ''}
              <span class="rank-troop ${getTroopColorClass(hero.Type)}">${getLocalizedTroop(hero.Type)}</span>
              ${s.appearances ? `<span class="rank-apps">${s.appearances} combo${s.appearances!==1?'s':''}</span>` : '<span class="rank-apps rank-apps-zero">Not ranked</span>'}
            </div>
            <div class="rank-bar-wrap">
              <div class="rank-bar" style="width:${finalPct}%;background:${tagColor};"></div>
            </div>
          </div>
          <div class="rank-score ${s.finalRating > 0 ? 'has-score' : 'no-score'}">${s.finalRating > 0 ? finalPct : '—'}</div>
        </div>`;
    }).join('') : '<p class="text-sm text-slate-500 italic p-4 text-center">No heroes match your filters.</p>';

    const showMoreHtml = ranked.length > _heroesTabState.limit ? `
      <div class="flex justify-center p-4">
        <button type="button" class="hero-tab-show-more bg-slate-800 hover:bg-slate-700 text-slate-300 px-6 py-2 rounded-full text-sm font-bold transition">
          Show More (${ranked.length - _heroesTabState.limit} remaining)
        </button>
      </div>` : '';

    let detailHtml = '';
    if (selected) {
      const hero = allHeroesData.find(h => h.name === selected);
      const ext  = heroesExtendedData[selected];
      const s    = stats[selected] || {};
      const tagColor = hero ? (seasonColors[hero.season] || '#f97316') : '#f97316';
      const synergies = getSynergies(selected, _heroesTabState);
      const heroCombos = getHeroAtlasCombos(selected, _heroesTabState);
      const comboScopeHint = comboScope === 'season-capped'
        ? (t.heroesComboScopeHint || 'Combos using heroes up to {season} within your season filters.')
            .replace('{season}', hero?.season || '')
        : (t.heroesComboScopeAllHint || 'All ranked combos from the full database.');
      const heroCounterWins = getCombosCounteredByHero(selected);
      const heroCounterLosses = getCountersAgainstHero(selected);
      const hasHeroCounters = heroCounterWins.length > 0 || heroCounterLosses.length > 0;
      const heroCountersHtml = hasHeroCounters ? `
        <div class="hero-counter-section-grid">
          <div class="hero-counter-column">
            <div class="hero-counter-subhead">This hero counters</div>
            ${renderCounterMatchupList(heroCounterWins, getComboRankInfo, getHeroImageUrl, getCounterLabels(), {
              limit: 6,
              label: 'Counter path',
              targetLabel: 'Target',
              counterLabel: 'Counter lineup',
              emptyText: 'No known lineups yet'
            })}
          </div>
          <div class="hero-counter-column">
            <div class="hero-counter-subhead">This hero is countered by</div>
            ${renderCounterMatchupList(heroCounterLosses, getComboRankInfo, getHeroImageUrl, getCounterLabels(), {
              limit: 6,
              label: 'Threat',
              targetLabel: 'Hero lineup',
              counterLabel: 'Counter lineup',
              emptyText: 'No known counters yet'
            })}
          </div>
        </div>` : '';

      const combosHtml = heroCombos.map(c => `
        <div class="detail-combo-row">
          <div class="detail-combo-top">
            <span class="detail-combo-rank">#${c.rank}</span>
            <div class="detail-combo-scorebox">
              <span class="detail-combo-score-lbl">Score</span>
              <span class="detail-combo-score">${parseFloat(c.score).toFixed(1)}</span>
            </div>
          </div>
          <div class="detail-combo-heroes">
            ${c.heroes.map(hn => `
              <button type="button" class="detail-combo-hero${hn === selected ? ' is-viewed' : ''}" data-hero-pick="${escapeHtml(hn)}" title="${escapeHtml(hn)}">
                <img src="${getHeroImageUrl(hn)}" alt="${escapeHtml(hn)}" loading="lazy">
                <span>${escapeHtml(hn)}</span>
              </button>`).join('')}
          </div>
          ${renderCountersToggle(c.heroes, getComboRankInfo, getHeroImageUrl, getCounterLabels())}
        </div>`).join('');

      const skillsHtml = ext ? ext.skills.map(sk => `
        <div class="detail-skill">
          <div class="detail-skill-header">
            <span class="detail-skill-id">SKILL ${sk.id}</span>
            ${renderSkillType(sk.type)}
            ${sk.range && sk.range !== '-' ? `<span class="detail-skill-range">Range ${sk.range}</span>` : ''}
          </div>
          <p class="detail-skill-target ${sk.target.toLowerCase().includes('enemy') ? 'enemy' : 'ally'}">${sk.target}</p>
          <p class="detail-skill-desc">${formatSkillText(sk.desc)}</p>
        </div>`).join('') : '<p class="text-xs text-slate-500 italic">Skill data not yet available.</p>';

      const heroSkinsList = getHeroSkins(selected);
      const hiddenPower = getHeroHiddenPower(selected);
      const hiddenPowerHtml = renderHiddenPowerCard(hiddenPower);
      const skinsHtml = heroSkinsList.length > 0 ? heroSkinsList.map(skin => {
        const typeInfo = SKIN_TYPES[skin.type] || SKIN_TYPES.Mythic;
        const ba = skin.bioAttributes;
        const mba = skin.maxBioAttributes;
        const inheritingSkillRef = skin.inheritingSkill?.replacesSlot ? `Skill ${skin.inheritingSkill.replacesSlot}` : 'Base skill';
        const inheritingFrom = skin.inheritingSkill?.fromSkill || inheritingSkillRef;
        const inheritingName = skin.inheritingSkill?.name || 'Inheriting skill';
        return `
        <div class="detail-skin-card">
          <div class="detail-skin-header">
            <span class="detail-skin-name">${escapeHtml(skin.name)}</span>
            <span class="detail-skin-type" style="color:${typeInfo.color};border-color:${typeInfo.color}">${escapeHtml(typeInfo.label || skin.type)}</span>
          </div>
          ${skin.fullName ? `<div class="detail-skin-subtitle">${escapeHtml(skin.fullName)}</div>` : ''}
          ${skin.starStages ? `<div class="detail-skin-stage-track">
            ${skin.starStages.map(stage => `
              <div class="detail-skin-stage">
                <span class="detail-skin-stage-num">Star ${stage.star}</span>
                <span class="detail-skin-stage-title">${escapeHtml(stage.title)}</span>
                <span class="detail-skin-stage-detail">${escapeHtml(stage.detail)}</span>
              </div>
            `).join('')}
          </div>` : ''}
          <div class="detail-skin-attributes">
            <div class="detail-skin-attr-title">Star 1 - Biography Attributes</div>
            ${skin.biographyAttributes?.effectiveOn ? `<div class="detail-skin-effect">Effective on: ${escapeHtml(skin.biographyAttributes.effectiveOn)}</div>` : ''}
            ${skin.biographyAttributes?.attributes ? `<div class="detail-skin-attr-grid">
              ${skin.biographyAttributes.attributes.map(attr => `
                <span class="detail-skin-attr">${escapeHtml(attr.label)}: <span class="detail-skin-max">${escapeHtml(attr.value)}</span></span>
              `).join('')}
            </div>` : ''}
            <div class="detail-skin-attr-grid ${skin.biographyAttributes?.attributes ? 'detail-skin-attr-grid--legacy-hidden' : ''}">
              <span class="detail-skin-attr">Might: ${ba.might}% <span class="detail-skin-max">→ ${mba.might}%</span></span>
              <span class="detail-skin-attr">Resistance: ${ba.resistance}% <span class="detail-skin-max">→ ${mba.resistance}%</span></span>
              <span class="detail-skin-attr">Tac. Might: ${ba.tacticalMight}% <span class="detail-skin-max">→ ${mba.tacticalMight}%</span></span>
              <span class="detail-skin-attr">Tac. Res: ${ba.tacticalResistance}% <span class="detail-skin-max">→ ${mba.tacticalResistance}%</span></span>
              <span class="detail-skin-attr">HP: ${ba.hp}% <span class="detail-skin-max">→ ${mba.hp}%</span></span>
              <span class="detail-skin-attr">Damage: ${ba.damage}% <span class="detail-skin-max">→ ${mba.damage}%</span></span>
            </div>
          </div>
          <div class="detail-skin-skill">
            <div class="detail-skin-skill-title">Star 2 - Inheriting Skill</div>
            <div class="detail-skin-skill-name">${escapeHtml(inheritingName)}</div>
            <div class="detail-skin-effect">Upgrades ${escapeHtml(inheritingSkillRef)}: ${escapeHtml(inheritingFrom)} -> ${escapeHtml(inheritingName)}</div>
            ${skin.inheritingSkill.worksOn ? `<div class="detail-skin-effect">Works on: ${escapeHtml(skin.inheritingSkill.worksOn)} | Range ${escapeHtml(String(skin.inheritingSkill.effectiveRange))} | Target: ${escapeHtml(skin.inheritingSkill.target)}</div>` : ''}
            ${skin.inheritingSkill.influencedBy ? `<div class="detail-skin-effect">Influenced by: ${escapeHtml(skin.inheritingSkill.influencedBy)}</div>` : ''}
            <p class="detail-skin-skill-desc">${escapeHtml(skin.inheritingSkill.description)}</p>
            <div class="detail-skin-levels">
              ${(skin.inheritingSkill.levels || []).map(lv => `
                <div class="detail-skin-level">
                  <span class="detail-skin-level-num">★${lv.level}</span>
                  <span>${escapeHtml(lv.desc)}</span>
                </div>`).join('')}
            </div>
          </div>
          <div class="detail-skin-skill">
            <div class="detail-skin-skill-title">Star 3 - Preserving Skill</div>
            <div class="detail-skin-skill-name">${escapeHtml(skin.preservingSkill.name)}</div>
            ${skin.preservingSkill.type ? `<div class="detail-skin-effect">${escapeHtml(skin.preservingSkill.type)} | Range ${escapeHtml(String(skin.preservingSkill.effectiveRange))} | Target: ${escapeHtml(skin.preservingSkill.target)}</div>` : ''}
            <p class="detail-skin-skill-desc">${escapeHtml(skin.preservingSkill.description)}</p>
            ${skin.preservingSkill.dynamicIconNote ? `<p class="detail-skin-skill-desc detail-skin-motion-note">${escapeHtml(skin.preservingSkill.dynamicIconNote)}</p>` : ''}
          </div>
        </div>`;
      }).join('') : '';

      const detailNavHtml = `
        <nav class="detail-nav" aria-label="Hero detail sections">
          ${synergies.length > 0 ? '<button type="button" class="detail-nav-btn active" data-detail-section="synergies">Synergies</button>' : ''}
          <button type="button" class="detail-nav-btn ${synergies.length === 0 ? 'active' : ''}" data-detail-section="combos">Combos</button>
          ${hasHeroCounters ? '<button type="button" class="detail-nav-btn" data-detail-section="counters">Counters</button>' : ''}
          ${heroSkinsList.length > 0 ? '<button type="button" class="detail-nav-btn" data-detail-section="skins">Skins</button>' : ''}
          <button type="button" class="detail-nav-btn" data-detail-section="skills">Skills</button>
        </nav>`;

      detailHtml = `
        <div class="hero-detail-panel">
          <button type="button" class="heroes-mobile-back" data-hero-close>← Back to ranking</button>
          <button type="button" class="detail-close" data-hero-close aria-label="Close hero detail">✕</button>
          <div class="detail-header">
            <img class="detail-img" src="${hero?.imageUrl}" alt="${escapeHtml(selected)}" onerror="this.src='images/logo.png'">
            <div class="detail-meta">
              <div class="detail-name">${escapeHtml(selected)}${hero?.State==='Paid' ? paidIconHtml() : ''}</div>
              <div class="detail-tags">
                <span class="detail-season-tag" style="background:${tagColor};color:#000">${hero?.season}</span>
                ${hero?.releaseSeason && hero.releaseSeason !== hero.season ? `<span class="detail-season-tag detail-origin-season-tag">Original ${escapeHtml(hero.releaseSeason)}</span>` : ''}
                <span class="detail-troop-tag ${getTroopColorClass(hero?.Type)}">${getLocalizedTroop(hero?.Type||'All')}</span>
                <span class="detail-state-tag ${hero?.State==='Paid'?'paid':'free'}">${hero?.State||'Free'}</span>
              </div>
              <div class="detail-stats-row">
                <div class="detail-stat"><div class="detail-stat-lbl">Rating</div><div class="detail-stat-val" style="color:${tagColor}">${s.finalRating>0?Math.min(100,s.finalRating).toFixed(1):'—'}</div></div>
                <div class="detail-stat"><div class="detail-stat-lbl">Combos</div><div class="detail-stat-val">${s.appearances||0}</div></div>
                <div class="detail-stat"><div class="detail-stat-lbl">Best Rank</div><div class="detail-stat-val">${s.topComboRank!==Infinity?'#'+s.topComboRank:'—'}</div></div>
                ${ext ? `<div class="detail-stat"><div class="detail-stat-lbl">Min Copies</div><div class="detail-stat-val">${ext.minCopies||34}</div></div>` : ''}
              </div>
            </div>
          </div>
          ${detailNavHtml}

          ${synergies.length > 0 ? `
          <div id="detail-section-synergies" class="detail-section-block">
            <div class="detail-section-title">Best Synergies</div>
            <div class="detail-synergies">
              ${synergies.map(syn => `
                <button type="button" class="detail-syn-item" data-hero-pick="${escapeHtml(syn)}" title="View ${escapeHtml(syn)}">
                  <img src="${getHeroImageUrl(syn)}" alt="${escapeHtml(syn)}" loading="lazy">
                  <span>${escapeHtml(syn)}</span>
                </button>`).join('')}
            </div>
          </div>` : ''}

          <div id="detail-section-combos" class="detail-section-block">
            <div class="detail-section-head">
              <div class="detail-section-title">${t.heroesTopCombos || 'Top Combos'}</div>
              <div class="heroes-combo-scope" role="group" aria-label="${t.heroesComboScopeLabel || 'Combo season scope'}">
                <button type="button" class="heroes-combo-scope-btn ${comboScope === 'season-capped' ? 'active' : ''}" data-combo-scope="season-capped">
                  ${(t.heroesComboScopeCapped || 'Up to {season}').replace('{season}', hero?.season || '')}
                </button>
                <button type="button" class="heroes-combo-scope-btn ${comboScope === 'all' ? 'active' : ''}" data-combo-scope="all">
                  ${t.heroesComboScopeAll || 'All best'}
                </button>
              </div>
            </div>
            <p class="heroes-combo-scope-hint">${comboScopeHint}</p>
            <div class="detail-combos">${combosHtml || `<p class="text-xs text-slate-500 italic">${t.heroesNoCombos || 'No ranked combos yet.'}</p>`}</div>
          </div>

          ${hasHeroCounters ? `
          <div id="detail-section-counters" class="detail-section-block">
            <div class="detail-section-title">Counters involving ${escapeHtml(selected)}</div>
            ${heroCountersHtml}
          </div>` : ''}

          <div id="detail-section-skills" class="detail-section-block">
            <div class="detail-section-title">${t.heroesSkillsTitle || 'Skills'}</div>
            <div class="detail-skills">${skillsHtml}</div>
          </div>

          ${heroSkinsList.length > 0 ? `
          <div id="detail-section-skins" class="detail-section-block">
            <div class="detail-section-title">${t.heroesBioSkinsTitle || 'Bio Skins'} <span class="detail-skin-count">${heroSkinsList.length}</span></div>
            <div class="detail-skins">${skinsHtml}${hiddenPowerHtml}</div>
          </div>` : ''}
        </div>`;
    }

    const clearFiltersHtml = filtersActive
      ? `<button type="button" class="heroes-clear-filters" data-heroes-clear-filters>${t.heroesClearFilters || 'Clear filters'}</button>`
      : '';
    const heroCountLabel = filtered.length === 1 ? (t.heroCountOne || '{n} hero') : (t.heroCountMany || '{n} heroes');

    container.innerHTML = `
      <div class="heroes-tab-inner${selected ? ' heroes-tab-inner--detail-open' : ''}">
        <div class="heroes-toolbar-sticky">
          <div class="heroes-toolbar">
            <div class="hero-search-wrap heroes-search-field">
              <svg class="hero-search-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 15.803a7.5 7.5 0 0 0 10.607 0Z"/></svg>
              <input id="heroesTabSearch" class="hero-search-input" type="search" placeholder="${escapeHtml(t.heroSearchPh || 'Search heroes...')}" value="${escapeHtml(search)}" autocomplete="off" />
            </div>
            <span class="heroes-count-badge">${escapeHtml(heroCountLabel.replace('{n}', filtered.length))}</span>
            <label class="heroes-sort-control" title="Sort visible heroes">
              <span>Sort</span>
              <select id="heroesSortSelect">
                <option value="rating"${sort === 'rating' ? ' selected' : ''}>Rating</option>
                <option value="appearances"${sort === 'appearances' ? ' selected' : ''}>Appearances</option>
                <option value="best-rank"${sort === 'best-rank' ? ' selected' : ''}>Best rank</option>
                <option value="name"${sort === 'name' ? ' selected' : ''}>Name</option>
              </select>
            </label>
            <button type="button" class="heroes-export-btn" data-heroes-export>Export CSV</button>
            ${clearFiltersHtml}
          </div>
          <div class="heroes-filter-pills heroes-filter-pills--troop">${troopPillsHtml}</div>
          <div class="heroes-filter-pills heroes-filter-pills--state">${statePillsHtml}</div>
          <p class="heroes-season-hint">${t.heroesSeasonHint || 'Seasons - select multiple'}</p>
          <div class="heroes-season-tabs" role="group" aria-label="Filter by season (multi-select)">${seasonTabsHtml}</div>
        </div>
        <div class="heroes-layout ${selected ? 'has-detail' : ''}">
          <div class="heroes-ranking-list" role="list">
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
      const selectedRow = container.querySelector('.hero-rank-row.selected');
      if (selectedRow) {
        selectedRow.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
      if (selected && window.innerWidth < 900) {
        container.querySelector('.hero-detail-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }
}

export { renderHeroesTab, getSynergies, formatSkillText };
