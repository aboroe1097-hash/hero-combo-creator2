import { baseRankedCombos, scoreComboByRank } from './combos-db.js';
import { allHeroesData } from './heroes-data.js';
import { seasonColors, getHeroImageUrl, getTroopColorClass, getLocalizedTroop } from './state.js';
import { escapeHtml } from './utils.js';

const STRIFE_STAGE_KEY = 'vts_strife_stage';
const STRIFE_POOL_KEY = 'vts_strife_pool';
const STRIFE_SEASONS = ['S0', 'S1', 'S2', 'S3', 'S4', 'X1', 'X2', 'X8'];
const HERO_BY_NAME = new Map(allHeroesData.map(hero => [hero.name, hero]));

let strifeRoot = null;

function getStoredStage() {
  const stored = localStorage.getItem(STRIFE_STAGE_KEY);
  return STRIFE_SEASONS.includes(stored) ? stored : 'X1';
}

function getStoredPool() {
  return localStorage.getItem(STRIFE_POOL_KEY) === 'free' ? 'free' : 'all';
}

function getStageSeasons(stage) {
  const end = Math.max(0, STRIFE_SEASONS.indexOf(stage));
  return STRIFE_SEASONS.slice(0, end + 1);
}

function heroAvailable(heroName, availableSeasons, poolMode) {
  const hero = HERO_BY_NAME.get(heroName);
  if (!hero) return false;
  if (!availableSeasons.includes(hero.season)) return false;
  return poolMode !== 'free' || String(hero.State || 'Free').toLowerCase() !== 'paid';
}

function getComboTroopType(combo) {
  const types = [...new Set(combo.heroes.map(name => HERO_BY_NAME.get(name)?.Type || 'All'))];
  const concrete = types.filter(type => type !== 'All');
  if (concrete.length === 1) return concrete[0];
  if (concrete.length === 0) return 'All';
  return 'Mixed';
}

function getComboTags(combo) {
  const heroes = new Set(combo.heroes);
  const tags = [];
  if (heroes.has('Theodora')) tags.push('Sustain');
  if (heroes.has('Beowulf') || heroes.has('King Arthur')) tags.push('Skill Spam');
  if (heroes.has('Ramses II') || heroes.has('Jade Eagle')) tags.push('Archer Core');
  if (heroes.has('Bleeding Steed') || heroes.has('Rozen Blade')) tags.push('Pressure');
  if (!tags.length) tags.push('Ranked');
  return tags.slice(0, 3);
}

export function getStrifeRecommendations(stage = getStoredStage(), poolMode = getStoredPool()) {
  const availableSeasons = getStageSeasons(stage);
  const availableHeroes = allHeroesData.filter(hero => heroAvailable(hero.name, availableSeasons, poolMode));
  const availableHeroNames = new Set(availableHeroes.map(hero => hero.name));
  const totalRanked = baseRankedCombos.length;
  const candidates = baseRankedCombos
    .map((combo, index) => ({
      ...combo,
      globalRank: index + 1,
      displayScore: scoreComboByRank(index, totalRanked),
      troopType: getComboTroopType(combo),
      tags: getComboTags(combo),
    }))
    .filter(combo => combo.heroes.every(hero => availableHeroNames.has(hero)));

  const usedHeroes = new Set();
  const dailyPlan = [];
  for (const combo of candidates) {
    if (dailyPlan.length >= 5) break;
    if (combo.heroes.some(hero => usedHeroes.has(hero))) continue;
    dailyPlan.push(combo);
    combo.heroes.forEach(hero => usedHeroes.add(hero));
  }

  const stageHeroCount = availableHeroes.filter(hero => hero.season === stage).length;
  return {
    stage,
    poolMode,
    availableSeasons,
    availableHeroCount: availableHeroes.length,
    stageHeroCount,
    candidateCount: candidates.length,
    dailyPlan,
    rankedList: candidates.slice(0, 18),
  };
}

function renderStageControls(stage) {
  return STRIFE_SEASONS.map(season => {
    const active = season === stage;
    const color = seasonColors[season] || '#22d3ee';
    return `<button type="button" class="strife-stage-btn${active ? ' active' : ''}" data-strife-stage="${season}" style="--stage-color:${escapeHtml(color)}">${season}</button>`;
  }).join('');
}

function renderPoolControls(poolMode) {
  return `
    <button type="button" class="strife-pool-btn${poolMode === 'all' ? ' active' : ''}" data-strife-pool="all">All heroes</button>
    <button type="button" class="strife-pool-btn${poolMode === 'free' ? ' active' : ''}" data-strife-pool="free">Free only</button>
  `;
}

function renderHeroSlot(heroName, position) {
  const hero = HERO_BY_NAME.get(heroName);
  const type = hero?.Type || 'All';
  const season = hero?.season || '';
  const state = hero?.State || 'Free';
  const portrait = getHeroImageUrl(heroName);
  const paid = state === 'Paid'
    ? '<span class="strife-hero-paid" title="Paid hero">P</span>'
    : '';
  return `
    <div class="strife-hero-slot">
      <span class="strife-slot-role">${position}</span>
      <span class="strife-hero-frame">
        <img src="${escapeHtml(portrait)}" alt="${escapeHtml(heroName)}" crossorigin="anonymous" loading="lazy">
        ${paid}
      </span>
      <span class="strife-hero-name">${escapeHtml(heroName)}</span>
      <span class="strife-hero-meta ${escapeHtml(getTroopColorClass(type))}">
        ${escapeHtml(season)} · ${escapeHtml(getLocalizedTroop(type))}
      </span>
    </div>
  `;
}

function renderComboCard(combo, index, variant = 'plan') {
  const troopType = combo.troopType || 'Mixed';
  const title = variant === 'plan' ? `Attack ${index + 1}` : `Rank #${combo.globalRank}`;
  const tags = (combo.tags || []).map(tag => `<span>${escapeHtml(tag)}</span>`).join('');
  return `
    <article class="strife-combo-card strife-combo-card--${variant}">
      <div class="strife-card-rank">
        <strong>${escapeHtml(title)}</strong>
        <span>${escapeHtml(combo.displayScore)} score</span>
      </div>
      <div class="strife-card-heroes">
        ${combo.heroes.map((hero, slotIndex) => renderHeroSlot(hero, ['Front', 'Middle', 'Back'][slotIndex])).join('')}
      </div>
      <div class="strife-card-foot">
        <span class="strife-troop-chip ${escapeHtml(getTroopColorClass(troopType))}">${escapeHtml(troopType)}</span>
        <span class="strife-db-rank">DB #${combo.globalRank}</span>
        <span class="strife-tags">${tags}</span>
      </div>
    </article>
  `;
}

function renderEmptyState(model) {
  return `
    <div class="strife-empty">
      <strong>No ranked Strife teams for ${escapeHtml(model.stage)} yet.</strong>
      <span>Try All heroes, or move the stage forward while we expand the database.</span>
    </div>
  `;
}

function renderStrifeTool() {
  if (!strifeRoot) return;
  const model = getStrifeRecommendations();
  const planHtml = model.dailyPlan.length
    ? model.dailyPlan.map((combo, index) => renderComboCard(combo, index, 'plan')).join('')
    : renderEmptyState(model);
  const listHtml = model.rankedList.length
    ? model.rankedList.map((combo, index) => renderComboCard(combo, index, 'ranked')).join('')
    : renderEmptyState(model);

  strifeRoot.innerHTML = `
    <div class="strife-header">
      <div>
        <p class="strife-eyebrow">Origin of Dragons</p>
        <h2>Strife Over Dragon</h2>
        <p>Five daily attacks. Season-stage recommendations from the VTS combo database.</p>
      </div>
      <div class="strife-source-card">
        <strong>${model.dailyPlan.length || 0}/5</strong>
        <span>daily teams</span>
      </div>
    </div>

    <div class="strife-control-deck">
      <div class="strife-control-row">
        <span class="strife-control-label">Season stage</span>
        <div class="strife-stage-grid" role="group" aria-label="Strife season stage">
          ${renderStageControls(model.stage)}
        </div>
      </div>
      <div class="strife-control-row strife-control-row--compact">
        <span class="strife-control-label">Hero pool</span>
        <div class="strife-pool-grid" role="group" aria-label="Strife hero pool">
          ${renderPoolControls(model.poolMode)}
        </div>
      </div>
      <div class="strife-metrics" aria-label="Strife recommendation metrics">
        <span><strong>${model.availableHeroCount}</strong> heroes</span>
        <span><strong>${model.candidateCount}</strong> combos</span>
        <span><strong>${model.stageHeroCount}</strong> ${model.stage} heroes</span>
      </div>
    </div>

    <section class="strife-results-band">
      <div class="strife-section-title">
        <h3>Best 5 Attacks</h3>
        <span>No hero overlap</span>
      </div>
      <div class="strife-plan-grid">${planHtml}</div>
    </section>

    <section class="strife-results-band">
      <div class="strife-section-title">
        <h3>Ranked Backup List</h3>
        <span>Top available formations</span>
      </div>
      <div class="strife-ranked-list">${listHtml}</div>
    </section>
  `;
}

function handleStrifeClick(event) {
  const stageBtn = event.target.closest('[data-strife-stage]');
  if (stageBtn) {
    localStorage.setItem(STRIFE_STAGE_KEY, stageBtn.dataset.strifeStage);
    renderStrifeTool();
    return;
  }

  const poolBtn = event.target.closest('[data-strife-pool]');
  if (poolBtn) {
    localStorage.setItem(STRIFE_POOL_KEY, poolBtn.dataset.strifePool);
    renderStrifeTool();
  }
}

export function initStrifeTool() {
  strifeRoot = document.getElementById('strifeToolRoot');
  if (!strifeRoot) return;
  if (strifeRoot.dataset.strifeWired !== '1') {
    strifeRoot.dataset.strifeWired = '1';
    strifeRoot.addEventListener('click', handleStrifeClick);
  }
  renderStrifeTool();
  window.vtsRenderStrifeTool = renderStrifeTool;
}
