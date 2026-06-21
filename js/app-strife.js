import { baseRankedCombos, scoreComboByRank } from './combos-db.js';
import { allHeroesData } from './heroes-data.js';
import { seasonColors, getHeroImageUrl, getTroopColorClass, getLocalizedTroop } from './state.js';
import { escapeHtml } from './utils.js';
import {
  STRIFE_MONSTER_COMBOS,
  STRIFE_MONSTERS,
  STRIFE_SEASONS,
  STRIFE_TIERS,
} from './strife-db.js';

const STRIFE_STAGE_KEY = 'vts_strife_stage';
const STRIFE_MONSTER_KEY = 'vts_strife_monster';
const HERO_BY_NAME = new Map(allHeroesData.map(hero => [hero.name, hero]));
const MONSTER_BY_ID = new Map(STRIFE_MONSTERS.map(monster => [monster.id, monster]));
const FALLBACK_LIMIT = 12;

let strifeRoot = null;

function getStoredStage() {
  const stored = localStorage.getItem(STRIFE_STAGE_KEY);
  return STRIFE_SEASONS.includes(stored) ? stored : 'X1';
}

function getStoredMonsterId() {
  const stored = localStorage.getItem(STRIFE_MONSTER_KEY);
  return MONSTER_BY_ID.has(stored) ? stored : STRIFE_MONSTERS[0]?.id;
}

function getStageIndex(stage) {
  return Math.max(0, STRIFE_SEASONS.indexOf(stage));
}

function getStageSeasons(stage) {
  return STRIFE_SEASONS.slice(0, getStageIndex(stage) + 1);
}

function stageIsAllowed(entry, selectedStage) {
  const selectedIndex = getStageIndex(selectedStage);
  const startIndex = getStageIndex(entry.stage || 'S0');
  const endIndex = entry.maxStage ? getStageIndex(entry.maxStage) : STRIFE_SEASONS.length - 1;
  return startIndex <= selectedIndex && selectedIndex <= endIndex;
}

function heroAvailable(heroName, availableSeasons) {
  const hero = HERO_BY_NAME.get(heroName);
  return Boolean(hero && availableSeasons.includes(hero.season));
}

function getComboTroopType(combo) {
  const types = [...new Set(combo.heroes.map(name => HERO_BY_NAME.get(name)?.Type || 'All'))];
  const concrete = types.filter(type => type !== 'All');
  if (concrete.length === 1) return concrete[0];
  if (concrete.length === 0) return 'All';
  return 'Mixed';
}

function getComboTags(combo) {
  const tags = [];
  if (combo.source === 'manual') tags.push(combo.tier === STRIFE_TIERS.PERFECT ? 'Perfect' : 'Good Damage');
  if (combo.source === 'fallback') tags.push('Combo DB');

  const heroes = new Set(combo.heroes);
  if (heroes.has('Theodora')) tags.push('Sustain');
  if (heroes.has('Beowulf') || heroes.has('King Arthur')) tags.push('Skill Spam');
  if (heroes.has('Ramses II') || heroes.has('Jade Eagle')) tags.push('Archer Core');
  if (heroes.has('Bleeding Steed') || heroes.has('Rozen Blade')) tags.push('Pressure');
  if (!tags.length) tags.push('Ranked');
  return tags.slice(0, 4);
}

function toManualCombo(entry, index, tier) {
  const combo = {
    heroes: entry.heroes,
    tier,
    note: entry.note || '',
    source: 'manual',
    sourceRank: index + 1,
    displayScore: entry.score || 'Manual',
    troopType: entry.troopType || getComboTroopType(entry),
  };
  combo.tags = getComboTags(combo);
  return combo;
}

function getManualCombos(monsterId, stage, availableSeasons) {
  const rows = STRIFE_MONSTER_COMBOS[monsterId] || [];
  const accepted = rows.filter(entry => {
    if (!entry?.heroes || entry.heroes.length !== 3) return false;
    if (!stageIsAllowed(entry, stage)) return false;
    return entry.heroes.every(heroName => heroAvailable(heroName, availableSeasons));
  });

  return {
    perfect: accepted
      .filter(entry => entry.tier === STRIFE_TIERS.PERFECT)
      .map((entry, index) => toManualCombo(entry, index, STRIFE_TIERS.PERFECT)),
    good: accepted
      .filter(entry => entry.tier !== STRIFE_TIERS.PERFECT)
      .map((entry, index) => toManualCombo(entry, index, STRIFE_TIERS.GOOD)),
  };
}

function getFallbackCombos(stage, availableSeasons) {
  const availableHeroNames = new Set(
    allHeroesData.filter(hero => availableSeasons.includes(hero.season)).map(hero => hero.name)
  );
  const totalRanked = baseRankedCombos.length;

  return baseRankedCombos
    .map((combo, index) => {
      const enriched = {
        ...combo,
        source: 'fallback',
        sourceRank: index + 1,
        displayScore: scoreComboByRank(index, totalRanked),
        troopType: getComboTroopType(combo),
      };
      enriched.tags = getComboTags(enriched);
      return enriched;
    })
    .filter(combo => combo.heroes.every(hero => availableHeroNames.has(hero)))
    .slice(0, FALLBACK_LIMIT)
    .map(combo => ({ ...combo, stage }));
}

export function getStrifeRecommendations(monsterId = getStoredMonsterId(), stage = getStoredStage()) {
  const selectedMonsterId = MONSTER_BY_ID.has(monsterId) ? monsterId : getStoredMonsterId();
  const monster = MONSTER_BY_ID.get(selectedMonsterId) || STRIFE_MONSTERS[0];
  const selectedStage = STRIFE_SEASONS.includes(stage) ? stage : getStoredStage();
  const availableSeasons = getStageSeasons(selectedStage);
  const availableHeroes = allHeroesData.filter(hero => availableSeasons.includes(hero.season));
  const manual = getManualCombos(monster.id, selectedStage, availableSeasons);
  const hasManualRows = manual.perfect.length > 0 || manual.good.length > 0;
  const fallback = hasManualRows ? [] : getFallbackCombos(selectedStage, availableSeasons);

  return {
    monster,
    stage: selectedStage,
    availableSeasons,
    availableHeroCount: availableHeroes.length,
    perfectCombos: manual.perfect,
    goodCombos: hasManualRows ? manual.good : fallback,
    sourceMode: hasManualRows ? 'manual' : 'fallback',
    recommendationCount: manual.perfect.length + manual.good.length + fallback.length,
  };
}

function renderMonsterImage(monster, size = 'card') {
  const initial = monster.name.slice(0, 1).toUpperCase();
  const image = monster.imageUrl
    ? `<img src="${escapeHtml(monster.imageUrl)}" alt="${escapeHtml(monster.name)}" crossorigin="anonymous" loading="lazy">`
    : `<span class="strife-monster-initial">${escapeHtml(initial)}</span>`;
  return `
    <span class="strife-monster-art strife-monster-art--${escapeHtml(size)}" style="--monster-accent:${escapeHtml(monster.accent || '#67e8f9')}">
      ${image}
    </span>
  `;
}

function renderMonsterGrid(selectedMonsterId) {
  return STRIFE_MONSTERS.map(monster => {
    const active = monster.id === selectedMonsterId;
    return `
      <button type="button" class="strife-monster-card${active ? ' active' : ''}" data-strife-monster="${escapeHtml(monster.id)}" style="--monster-accent:${escapeHtml(monster.accent || '#67e8f9')}">
        ${renderMonsterImage(monster)}
        <span class="strife-monster-name">${escapeHtml(monster.name)}</span>
        <span class="strife-monster-formation">Front / Mid / Back</span>
      </button>
    `;
  }).join('');
}

function renderStageControls(stage) {
  return STRIFE_SEASONS.map(season => {
    const active = season === stage;
    const color = seasonColors[season] || '#22d3ee';
    return `<button type="button" class="strife-stage-btn${active ? ' active' : ''}" data-strife-stage="${season}" style="--stage-color:${escapeHtml(color)}">${season}</button>`;
  }).join('');
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
        ${escapeHtml(season)} / ${escapeHtml(getLocalizedTroop(type))}
      </span>
    </div>
  `;
}

function renderComboCard(combo, index, variant = 'good') {
  const troopType = combo.troopType || 'Mixed';
  const title = combo.source === 'manual'
    ? `${variant === STRIFE_TIERS.PERFECT ? 'Perfect' : 'Good'} #${index + 1}`
    : `DB #${combo.sourceRank}`;
  const tags = (combo.tags || []).map(tag => `<span>${escapeHtml(tag)}</span>`).join('');
  const note = combo.note ? `<p class="strife-combo-note">${escapeHtml(combo.note)}</p>` : '';

  return `
    <article class="strife-combo-card strife-combo-card--${escapeHtml(variant)}">
      <div class="strife-card-rank">
        <strong>${escapeHtml(title)}</strong>
        <span>${escapeHtml(String(combo.displayScore))}</span>
      </div>
      <div class="strife-card-main">
        <div class="strife-card-heroes">
          ${combo.heroes.map((hero, slotIndex) => renderHeroSlot(hero, ['Front', 'Middle', 'Back'][slotIndex])).join('')}
        </div>
        ${note}
        <div class="strife-card-foot">
          <span class="strife-troop-chip ${escapeHtml(getTroopColorClass(troopType))}">${escapeHtml(troopType)}</span>
          <span class="strife-tags">${tags}</span>
        </div>
      </div>
    </article>
  `;
}

function renderEmptyState(model, tierLabel) {
  return `
    <div class="strife-empty">
      <strong>No ${escapeHtml(tierLabel)} rows for ${escapeHtml(model.monster.name)} at ${escapeHtml(model.stage)} yet.</strong>
      <span>No manual rows configured.</span>
    </div>
  `;
}

function renderComboSection(title, subtitle, combos, model, variant) {
  const content = combos.length
    ? combos.map((combo, index) => renderComboCard(combo, index, variant)).join('')
    : renderEmptyState(model, title);
  return `
    <section class="strife-results-band">
      <div class="strife-section-title">
        <h3>${escapeHtml(title)}</h3>
        <span>${escapeHtml(subtitle)}</span>
      </div>
      <div class="strife-ranked-list">${content}</div>
    </section>
  `;
}

function renderStrifeTool() {
  if (!strifeRoot) return;
  const model = getStrifeRecommendations();
  const sourceLabel = model.sourceMode === 'manual' ? 'Monster table' : 'Combo DB fallback';

  strifeRoot.innerHTML = `
    <div class="strife-header">
      <div>
        <p class="strife-eyebrow">Origin of Dragons</p>
        <h2>Strife over Dragon</h2>
        <p>Monster-specific formation tables for each season stage.</p>
      </div>
      <div class="strife-source-card">
        <strong>${model.recommendationCount}</strong>
        <span>${escapeHtml(sourceLabel)}</span>
      </div>
    </div>

    <section class="strife-control-deck">
      <div class="strife-section-title">
        <h3>Monster</h3>
        <span>10 targets</span>
      </div>
      <div class="strife-monster-grid" role="group" aria-label="Strife monster target">
        ${renderMonsterGrid(model.monster.id)}
      </div>
    </section>

    <section class="strife-control-deck">
      <div class="strife-control-row">
        <span class="strife-control-label">Season stage</span>
        <div class="strife-stage-grid" role="group" aria-label="Strife season stage">
          ${renderStageControls(model.stage)}
        </div>
      </div>
      <div class="strife-metrics" aria-label="Strife recommendation metrics">
        <span><strong>${escapeHtml(model.monster.name)}</strong> selected</span>
        <span><strong>${model.availableHeroCount}</strong> heroes available</span>
        <span><strong>${model.availableSeasons.join(' / ')}</strong></span>
      </div>
    </section>

    <section class="strife-monster-summary">
      ${renderMonsterImage(model.monster, 'hero')}
      <div>
        <p class="strife-eyebrow">Selected monster</p>
        <h3>${escapeHtml(model.monster.name)}</h3>
        <span>Formation order: Front / Middle / Back</span>
      </div>
    </section>

    ${renderComboSection('Perfect Combination', model.sourceMode === 'manual' ? model.stage : 'Manual table pending', model.perfectCombos, model, STRIFE_TIERS.PERFECT)}
    ${renderComboSection(model.sourceMode === 'manual' ? 'Good Damage' : 'General Combo Fallback', model.stage, model.goodCombos, model, STRIFE_TIERS.GOOD)}
  `;
}

function handleStrifeClick(event) {
  const monsterBtn = event.target.closest('[data-strife-monster]');
  if (monsterBtn) {
    localStorage.setItem(STRIFE_MONSTER_KEY, monsterBtn.dataset.strifeMonster);
    renderStrifeTool();
    return;
  }

  const stageBtn = event.target.closest('[data-strife-stage]');
  if (stageBtn) {
    localStorage.setItem(STRIFE_STAGE_KEY, stageBtn.dataset.strifeStage);
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
