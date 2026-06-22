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
const REUSABLE_CANDIDATE_LIMIT = 6;
const STRIFE_RELEASE_ORDER = ['S0', 'S1', 'S2', 'S3', 'S4', 'X1', 'X2', 'X3', 'X4', 'X5', 'X6', 'X7', 'X8'];

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

function getReleaseStageIndex(stage) {
  const idx = STRIFE_RELEASE_ORDER.indexOf(stage);
  return idx === -1 ? 0 : idx;
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
  if (!hero) return false;
  const selectedStage = availableSeasons[availableSeasons.length - 1] || 'S0';
  return getReleaseStageIndex(hero.releaseSeason || hero.season) <= getReleaseStageIndex(selectedStage);
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
  if (combo.source === 'manual') tags.push(combo.tier === STRIFE_TIERS.P2W ? 'P2W Row' : 'F2P Row');
  if (combo.source === 'fallback') tags.push('Combo DB');

  const heroes = new Set(combo.heroes);
  if (heroes.has('Theodora')) tags.push('Sustain');
  if (heroes.has('Beowulf') || heroes.has('King Arthur')) tags.push('Skill Spam');
  if (heroes.has('Ramses II') || heroes.has('Jade Eagle')) tags.push('Archer Core');
  if (heroes.has('Bleeding Steed') || heroes.has('Rozen Blade')) tags.push('Pressure');
  if (!tags.length) tags.push('Ranked');
  return tags.slice(0, 4);
}

function comboHasPaidHero(combo) {
  return combo.heroes.some(heroName => HERO_BY_NAME.get(heroName)?.State === 'Paid');
}

function comboIsFreeFriendly(combo) {
  return combo.heroes.every(heroName => HERO_BY_NAME.get(heroName)?.State !== 'Paid');
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
    f2p: accepted
      .filter(entry => entry.tier !== STRIFE_TIERS.P2W)
      .map((entry, index) => toManualCombo(entry, index, STRIFE_TIERS.F2P)),
    p2w: accepted
      .filter(entry => entry.tier === STRIFE_TIERS.P2W)
      .map((entry, index) => toManualCombo(entry, index, STRIFE_TIERS.P2W)),
  };
}

function getFallbackCombos(stage, availableSeasons, tier) {
  const availableHeroNames = new Set(
    allHeroesData
      .filter(hero => heroAvailable(hero.name, availableSeasons))
      .map(hero => hero.name)
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
    .filter(combo => (tier === STRIFE_TIERS.P2W ? comboHasPaidHero(combo) : comboIsFreeFriendly(combo)))
    .slice(0, REUSABLE_CANDIDATE_LIMIT)
    .map(combo => ({ ...combo, tier, stage }));
}

export function getStrifeRecommendations(monsterId = getStoredMonsterId(), stage = getStoredStage()) {
  const selectedMonsterId = MONSTER_BY_ID.has(monsterId) ? monsterId : getStoredMonsterId();
  const monster = MONSTER_BY_ID.get(selectedMonsterId) || STRIFE_MONSTERS[0];
  const selectedStage = STRIFE_SEASONS.includes(stage) ? stage : getStoredStage();
  const availableSeasons = getStageSeasons(selectedStage);
  const availableHeroes = allHeroesData.filter(hero => heroAvailable(hero.name, availableSeasons));
  const manual = getManualCombos(monster.id, selectedStage, availableSeasons);
  const f2pCombos = manual.f2p.length ? manual.f2p : getFallbackCombos(selectedStage, availableSeasons, STRIFE_TIERS.F2P);
  const p2wCombos = manual.p2w.length ? manual.p2w : getFallbackCombos(selectedStage, availableSeasons, STRIFE_TIERS.P2W);

  return {
    monster,
    stage: selectedStage,
    availableSeasons,
    availableHeroCount: availableHeroes.length,
    f2pCombos,
    p2wCombos,
    f2pSourceMode: manual.f2p.length ? 'manual' : 'fallback',
    p2wSourceMode: manual.p2w.length ? 'manual' : 'fallback',
    candidateCount: f2pCombos.length + p2wCombos.length,
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
        <span class="strife-monster-formation">Tap to plan</span>
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

function getMonsterSkills(monster) {
  return Array.isArray(monster?.skills)
    ? monster.skills.filter(skill => skill && (skill.name || skill.effect || skill.answer))
    : [];
}

function getMonsterGuideNotes(monster) {
  return Array.isArray(monster?.guideNotes) ? monster.guideNotes.filter(Boolean) : [];
}

function renderMonsterSkill(skill, index) {
  const meta = [skill.timing, skill.target].filter(Boolean);
  const tags = Array.isArray(skill.tags) ? skill.tags.filter(Boolean) : [];
  const effect = skill.effect ? `<p>${escapeHtml(skill.effect)}</p>` : '';
  const answer = skill.answer
    ? `<p class="strife-skill-answer"><strong>Counter</strong>${escapeHtml(skill.answer)}</p>`
    : '';

  return `
    <article class="strife-skill-card">
      <div class="strife-skill-head">
        <span>Skill ${index + 1}</span>
        <h4>${escapeHtml(skill.name || 'Monster Skill')}</h4>
      </div>
      ${meta.length ? `<div class="strife-skill-meta">${meta.map(item => `<span>${escapeHtml(item)}</span>`).join('')}</div>` : ''}
      <div class="strife-skill-body">
        ${effect}
        ${answer}
      </div>
      ${tags.length ? `<div class="strife-tags">${tags.map(tag => `<span>${escapeHtml(tag)}</span>`).join('')}</div>` : ''}
    </article>
  `;
}

function renderMonsterSkills(monster) {
  const skills = getMonsterSkills(monster);
  const guideNotes = getMonsterGuideNotes(monster);
  const source = monster.sourceUrl
    ? `<a class="strife-source-link" href="${escapeHtml(monster.sourceUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(monster.sourceLabel || 'Source guide')}</a>`
    : '';
  const guideContent = guideNotes.length
    ? `
      <div class="strife-guide-notes">
        ${guideNotes.map(note => `<p>${escapeHtml(note)}</p>`).join('')}
      </div>
    `
    : `
      <div class="strife-skill-empty strife-skill-empty--compact">
        <strong>Manual notes pending</strong>
        <span>Add monster-specific counters here as we test them.</span>
      </div>
    `;
  const content = skills.length
    ? skills.map((skill, index) => renderMonsterSkill(skill, index)).join('')
    : `
      <div class="strife-skill-empty">
        <strong>Skill data pending</strong>
        <span>No skill notes recorded for ${escapeHtml(monster.name)} yet.</span>
      </div>
    `;

  return `
    <section class="strife-results-band strife-skills-band">
      <div class="strife-section-title">
        <h3>Monster Intel</h3>
        <span>${source || (skills.length ? `${skills.length} notes` : 'Pending')}</span>
      </div>
      ${guideContent}
      <div class="strife-skill-list">${content}</div>
    </section>
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
        ${escapeHtml(season)} / ${escapeHtml(getLocalizedTroop(type))}
      </span>
    </div>
  `;
}

function renderComboCard(combo, index, variant = STRIFE_TIERS.F2P) {
  const troopType = combo.troopType || 'Mixed';
  const title = combo.source === 'manual'
    ? `${variant === STRIFE_TIERS.P2W ? 'P2W' : 'F2P'} #${index + 1}`
    : `Reusable #${index + 1}`;
  const scoreLabel = combo.source === 'fallback'
    ? `DB #${combo.sourceRank} - ${combo.displayScore}`
    : combo.displayScore;
  const tags = (combo.tags || []).map(tag => `<span>${escapeHtml(tag)}</span>`).join('');
  const note = combo.note ? `<p class="strife-combo-note">${escapeHtml(combo.note)}</p>` : '';

  return `
    <article class="strife-combo-card strife-combo-card--${escapeHtml(variant)}">
      <div class="strife-card-rank">
        <strong>${escapeHtml(title)}</strong>
        <span>${escapeHtml(String(scoreLabel))}</span>
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
      <span>Add manual rows in strife-db.js when we have tested this monster.</span>
    </div>
  `;
}

function renderComboSection(title, subtitle, combos, model, variant, sourceMode) {
  const content = combos.length
    ? combos.map((combo, index) => renderComboCard(combo, index, variant)).join('')
    : renderEmptyState(model, title);
  const source = sourceMode === 'manual' ? 'Manual monster rows' : 'Filtered combo DB fallback';
  return `
    <section class="strife-results-band strife-results-band--${escapeHtml(variant)}">
      <div class="strife-section-title">
        <h3>${escapeHtml(title)}</h3>
        <span>${escapeHtml(subtitle)} - ${escapeHtml(source)}</span>
      </div>
      <div class="strife-ranked-list">${content}</div>
    </section>
  `;
}

function renderStrifeTool() {
  if (!strifeRoot) return;
  const model = getStrifeRecommendations();

  strifeRoot.innerHTML = `
    <div class="strife-header">
      <div>
        <p class="strife-eyebrow">Origin of Dragons</p>
        <h2>Strife over Dragon</h2>
        <p>Pick one monster and your current stage. The same selected team can be reused across your daily attacks, so this planner shows practical F2P and P2W lanes instead of five separate slots.</p>
      </div>
    </div>

    <section class="strife-control-deck">
      <div class="strife-section-title">
        <h3>Monster</h3>
        <span>Choose one target</span>
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
        <span><strong>One combo</strong> can repeat</span>
        <span><strong>${model.availableSeasons.join(' / ')}</strong></span>
      </div>
    </section>

    <section class="strife-monster-summary">
      ${renderMonsterImage(model.monster, 'hero')}
      <div>
        <p class="strife-eyebrow">Selected monster</p>
        <h3>${escapeHtml(model.monster.name)}</h3>
        <span>Formation order: Front / Middle / Back. Use the strongest lane you can build, then repeat that same team for the monster.</span>
      </div>
    </section>

    ${renderMonsterSkills(model.monster)}
    <div class="strife-lane-grid">
      ${renderComboSection('Free Combos', `${model.stage} available heroes`, model.f2pCombos, model, STRIFE_TIERS.F2P, model.f2pSourceMode)}
      ${renderComboSection('Paid Combos', `${model.stage} available heroes`, model.p2wCombos, model, STRIFE_TIERS.P2W, model.p2wSourceMode)}
    </div>
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
