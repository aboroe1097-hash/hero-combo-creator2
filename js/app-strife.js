import { baseRankedCombos, scoreComboByRank } from './combos-db.js';
import { allHeroesData } from './heroes-data.js';
import {
  currentLanguage,
  seasonColors,
  getHeroImageUrl,
  getTroopColorClass,
  getLocalizedTroop,
} from './state.js';
import { translations } from './translations.js';
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
let strifeLanguageListenerWired = false;
let strifeRenderFrame = 0;

function copy(key, fallback, replacements = {}) {
  const active = translations[currentLanguage] || translations.en || {};
  const template = active[key] ?? translations.en?.[key] ?? fallback;
  return String(template).replace(/\{(\w+)\}/g, (match, token) => (
    Object.prototype.hasOwnProperty.call(replacements, token) ? String(replacements[token]) : match
  ));
}

function getTierLabel(tier) {
  return tier === STRIFE_TIERS.P2W
    ? copy('statePaid', 'Paid')
    : copy('stateFree', 'Free');
}

function getPositionLabel(position) {
  return [
    copy('skinPositionFront', 'Front'),
    copy('skinPositionMiddle', 'Middle'),
    copy('skinPositionBack', 'Back'),
  ][position] || '';
}

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
  if (!STRIFE_SEASONS.includes(entry.stage || 'S0')) return false;
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
  if (combo.source === 'manual') {
    tags.push(combo.tier === STRIFE_TIERS.P2W
      ? copy('strifeTagP2WRow', 'P2W row')
      : copy('strifeTagF2PRow', 'F2P row'));
  }
  if (combo.source === 'fallback') tags.push(copy('strifeTagComboDb', 'Combo DB'));

  const heroes = new Set(combo.heroes);
  if (heroes.has('Theodora')) tags.push(copy('strifeTagSustain', 'Sustain'));
  if (heroes.has('Beowulf') || heroes.has('King Arthur')) {
    tags.push(copy('strifeTagSkillSpam', 'Skill spam'));
  }
  if (heroes.has('Ramses II') || heroes.has('Jade Eagle')) {
    tags.push(copy('strifeTagArcherCore', 'Archer core'));
  }
  if (heroes.has('Bleeding Steed') || heroes.has('Rozen Blade')) {
    tags.push(copy('strifeTagPressure', 'Pressure'));
  }
  if (!tags.length) tags.push(copy('strifeTagRanked', 'Ranked'));
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
    displayScore: entry.score || copy('strifeManualScore', 'Manual'),
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
    ? `<img src="${escapeHtml(monster.imageUrl)}" alt="${escapeHtml(monster.name)}" width="98" height="80" crossorigin="anonymous" loading="lazy" decoding="async">`
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
      <button type="button" class="strife-monster-card${active ? ' active' : ''}" data-strife-monster="${escapeHtml(monster.id)}" aria-pressed="${active}" style="--monster-accent:${escapeHtml(monster.accent || '#67e8f9')}">
        ${renderMonsterImage(monster)}
        <span class="strife-monster-name">${escapeHtml(monster.name)}</span>
        <span class="strife-monster-formation">${escapeHtml(copy('strifeTapToPlan', 'Tap to plan'))}</span>
      </button>
    `;
  }).join('');
}

function renderStageControls(stage) {
  return STRIFE_SEASONS.map(season => {
    const active = season === stage;
    const color = seasonColors[season] || '#22d3ee';
    return `<button type="button" class="strife-stage-btn${active ? ' active' : ''}" data-strife-stage="${season}" aria-pressed="${active}" style="--stage-color:${escapeHtml(color)}">${season}</button>`;
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
    ? `<p class="strife-skill-answer"><strong>${escapeHtml(copy('strifeSkillCounter', 'Counter'))}</strong> ${escapeHtml(skill.answer)}</p>`
    : '';

  return `
    <article class="strife-skill-card">
      <div class="strife-skill-head">
        <span>${escapeHtml(copy('strifeSkillNumber', 'Skill {number}', { number: index + 1 }))}</span>
        <h4>${escapeHtml(skill.name || copy('strifeMonsterSkillFallback', 'Monster skill'))}</h4>
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
    ? `<a class="strife-source-link" href="${escapeHtml(monster.sourceUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(monster.sourceLabel || copy('strifeSourceGuide', 'Source guide'))}</a>`
    : '';
  const guideContent = guideNotes.length
    ? `
      <div class="strife-guide-notes">
        ${guideNotes.map(note => `<p>${escapeHtml(note)}</p>`).join('')}
      </div>
    `
    : `
      <div class="strife-skill-empty strife-skill-empty--compact">
        <strong>${escapeHtml(copy('strifeBattleNotesPendingTitle', 'Battle notes are still being verified'))}</strong>
        <span>${escapeHtml(copy('strifeBattleNotesPendingBody', 'Use the recommended lineup lanes below until this monster guide is ready.'))}</span>
      </div>
    `;
  const content = skills.length
    ? skills.map((skill, index) => renderMonsterSkill(skill, index)).join('')
    : `
      <div class="strife-skill-empty">
        <strong>${escapeHtml(copy('strifeMonsterIntelPendingTitle', 'Monster intel is still being verified'))}</strong>
        <span>${escapeHtml(copy('strifeMonsterIntelPendingBody', 'No verified skill notes are available for {monster} yet.', { monster: monster.name }))}</span>
      </div>
    `;

  return `
    <section class="strife-results-band strife-skills-band">
      <div class="strife-section-title">
        <h3>${escapeHtml(copy('strifeMonsterIntel', 'Monster intel'))}</h3>
        <span>${source || escapeHtml(skills.length
          ? copy('strifeNotesCount', '{n} notes', { n: skills.length })
          : copy('strifePending', 'Pending'))}</span>
      </div>
      ${guideContent}
      <div class="strife-skill-list">${content}</div>
    </section>
  `;
}

function renderHeroSlot(heroName, positionIndex) {
  const hero = HERO_BY_NAME.get(heroName);
  const type = hero?.Type || 'All';
  const season = hero?.season || '';
  const state = hero?.State || 'Free';
  const portrait = getHeroImageUrl(heroName);
  const paid = state === 'Paid'
    ? `<span class="strife-hero-paid" title="${escapeHtml(copy('statePaid', 'Paid'))}">P</span>`
    : '';
  return `
    <div class="strife-hero-slot">
      <span class="strife-slot-role">${escapeHtml(getPositionLabel(positionIndex))}</span>
      <span class="strife-hero-frame">
        <img src="${escapeHtml(portrait)}" alt="${escapeHtml(heroName)}" width="128" height="128" crossorigin="anonymous" loading="lazy" decoding="async">
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
    ? copy('strifeTierRank', '{tier} #{rank}', { tier: getTierLabel(variant), rank: index + 1 })
    : copy('strifeReusableRank', 'Reusable #{rank}', { rank: index + 1 });
  const scoreLabel = combo.source === 'fallback'
    ? copy('strifeDatabaseRank', 'DB #{rank} · {score}', {
      rank: combo.sourceRank,
      score: combo.displayScore,
    })
    : combo.displayScore;
  const troopLabel = troopType === 'Mixed'
    ? copy('strifeTroopMixed', 'Mixed')
    : getLocalizedTroop(troopType);
  const tags = (combo.tags || []).map(tag => `<span>${escapeHtml(tag)}</span>`).join('');
  const noteMatch = combo.note?.match(/^Recommended (P2W|F2P) formation: (.+)\.$/);
  const noteText = noteMatch
    ? copy('strifeRecommendedFormation', 'Recommended {tier} formation: {heroes}.', {
      tier: noteMatch[1],
      heroes: noteMatch[2],
    })
    : combo.note;
  const note = noteText ? `<p class="strife-combo-note">${escapeHtml(noteText)}</p>` : '';

  return `
    <article class="strife-combo-card strife-combo-card--${escapeHtml(variant)}">
      <div class="strife-card-rank">
        <strong>${escapeHtml(title)}</strong>
        <span>${escapeHtml(String(scoreLabel))}</span>
      </div>
      <div class="strife-card-main">
        <div class="strife-card-heroes">
          ${combo.heroes.map((hero, slotIndex) => renderHeroSlot(hero, slotIndex)).join('')}
        </div>
        ${note}
        <div class="strife-card-foot">
          <span class="strife-troop-chip ${escapeHtml(getTroopColorClass(troopType))}">${escapeHtml(troopLabel)}</span>
          <span class="strife-tags">${tags}</span>
        </div>
      </div>
    </article>
  `;
}

function renderEmptyState(model, tierLabel) {
  return `
    <div class="strife-empty">
      <strong>${escapeHtml(copy('strifeEmptyLineupTitle', 'No verified {tier} lineup for {monster} at {stage} yet.', {
        tier: tierLabel,
        monster: model.monster.name,
        stage: model.stage,
      }))}</strong>
      <span>${escapeHtml(copy('strifeEmptyLineupBody', 'Choose an earlier stage or another monster and check again.'))}</span>
    </div>
  `;
}

function renderComboSection(title, subtitle, combos, model, variant, sourceMode) {
  const content = combos.length
    ? combos.map((combo, index) => renderComboCard(combo, index, variant)).join('')
    : renderEmptyState(model, getTierLabel(variant));
  const source = sourceMode === 'manual'
    ? copy('strifeVerifiedLineup', 'Verified monster lineup')
    : copy('strifeBestRosterMatch', 'Best available roster match');
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

function keepActiveMonsterInView() {
  if (!strifeRoot || !window.matchMedia?.('(max-width: 640px)').matches) return;
  const grid = strifeRoot.querySelector('.strife-monster-grid');
  const active = grid?.querySelector('.strife-monster-card.active');
  if (!grid || !active) return;
  const nextLeft = active.offsetLeft - ((grid.clientWidth - active.clientWidth) / 2);
  grid.scrollTo({ left: Math.max(0, nextLeft), behavior: 'auto' });
}

function renderStrifeTool() {
  if (!strifeRoot) return;
  document.querySelector('#strifeSection .strife-loading')?.remove();
  const model = getStrifeRecommendations();

  strifeRoot.innerHTML = `
    <div class="strife-header">
      <div>
        <p class="strife-eyebrow">${escapeHtml(copy('strifeEyebrow', 'Origin of Dragons'))}</p>
        <h2>${escapeHtml(copy('tabStrife', 'Strife over Dragon'))}</h2>
        <p>${escapeHtml(copy('strifeIntro', 'Pick one monster and your current stage. The same selected team can be reused across your daily attacks, so this planner shows practical F2P and P2W lanes instead of five separate slots.'))}</p>
      </div>
    </div>

    <section class="strife-control-deck strife-control-deck--monsters">
      <div class="strife-section-title">
        <h3>${escapeHtml(copy('strifeMonsterHeading', 'Monster'))}</h3>
        <span>${escapeHtml(copy('strifeChooseTarget', 'Choose one target'))}</span>
      </div>
      <div class="strife-monster-grid" role="group" aria-label="${escapeHtml(copy('strifeMonsterGroupAria', 'Strife monster target'))}">
        ${renderMonsterGrid(model.monster.id)}
      </div>
    </section>

    <section class="strife-control-deck strife-control-deck--stage">
      <div class="strife-control-row">
        <span class="strife-control-label">${escapeHtml(copy('seasonLabel', 'Season'))}</span>
        <div class="strife-stage-grid" role="group" aria-label="${escapeHtml(copy('strifeSeasonStageGroupAria', 'Strife season stage'))}">
          ${renderStageControls(model.stage)}
        </div>
      </div>
      <div class="strife-metrics" aria-label="${escapeHtml(copy('strifeMetricsAria', 'Strife recommendation metrics'))}">
        <span class="strife-metric strife-metric--selected">${escapeHtml(copy('strifeMetricSelected', '{monster} selected', { monster: model.monster.name }))}</span>
        <span class="strife-metric strife-metric--heroes"><strong>${escapeHtml(String(model.availableHeroCount))}</strong> ${escapeHtml(copy('availableHeroesTitle', 'Available Heroes'))}</span>
        <span class="strife-metric strife-metric--stages">${escapeHtml(copy('strifeMetricAvailableStages', 'Available stages: {stages}', { stages: model.availableSeasons.join(' / ') }))}</span>
      </div>
    </section>

    <section class="strife-monster-summary" style="--monster-accent:${escapeHtml(model.monster.accent || '#67e8f9')}">
      ${renderMonsterImage(model.monster, 'hero')}
      <div class="strife-monster-summary-copy">
        <div class="strife-monster-kicker">
          <p class="strife-eyebrow">${escapeHtml(copy('strifeSelectedMonster', 'Selected monster'))}</p>
          <span class="strife-monster-stage">${escapeHtml(model.stage)}</span>
        </div>
        <h3>${escapeHtml(model.monster.name)}</h3>
        <span>${escapeHtml(copy('strifeFormationOrder', 'Formation order: {front} / {middle} / {back}. Use the strongest lane you can build, then repeat that same team for the monster.', {
          front: getPositionLabel(0),
          middle: getPositionLabel(1),
          back: getPositionLabel(2),
        }))}</span>
      </div>
    </section>

    ${renderMonsterSkills(model.monster)}
    <div class="strife-lane-grid">
      ${renderComboSection(
        copy('strifeFreeCombos', 'Free combos'),
        copy('strifeAvailableHeroesAtStage', '{stage} available heroes', { stage: model.stage }),
        model.f2pCombos,
        model,
        STRIFE_TIERS.F2P,
        model.f2pSourceMode
      )}
      ${renderComboSection(
        copy('strifePaidCombos', 'Paid combos'),
        copy('strifeAvailableHeroesAtStage', '{stage} available heroes', { stage: model.stage }),
        model.p2wCombos,
        model,
        STRIFE_TIERS.P2W,
        model.p2wSourceMode
      )}
    </div>
  `;
  requestAnimationFrame(keepActiveMonsterInView);
}

function scheduleStrifeRender() {
  if (!strifeRoot || strifeRenderFrame) return;
  strifeRenderFrame = window.requestAnimationFrame(() => {
    strifeRenderFrame = 0;
    renderStrifeTool();
  });
}

function handleStrifeClick(event) {
  const monsterBtn = event.target.closest('[data-strife-monster]');
  if (monsterBtn) {
    const restoreKeyboardFocus = event.detail === 0;
    localStorage.setItem(STRIFE_MONSTER_KEY, monsterBtn.dataset.strifeMonster);
    renderStrifeTool();
    if (restoreKeyboardFocus) {
      requestAnimationFrame(() => strifeRoot?.querySelector('.strife-monster-card.active')?.focus({ preventScroll: true }));
    }
    return;
  }

  const stageBtn = event.target.closest('[data-strife-stage]');
  if (stageBtn) {
    const restoreKeyboardFocus = event.detail === 0;
    localStorage.setItem(STRIFE_STAGE_KEY, stageBtn.dataset.strifeStage);
    renderStrifeTool();
    if (restoreKeyboardFocus) {
      requestAnimationFrame(() => strifeRoot?.querySelector('.strife-stage-btn.active')?.focus({ preventScroll: true }));
    }
  }
}

export function initStrifeTool() {
  strifeRoot = document.getElementById('strifeToolRoot');
  if (!strifeRoot) return;
  if (strifeRoot.dataset.strifeWired !== '1') {
    strifeRoot.dataset.strifeWired = '1';
    strifeRoot.addEventListener('click', handleStrifeClick);
  }
  if (!strifeLanguageListenerWired) {
    strifeLanguageListenerWired = true;
    window.addEventListener('edenLanguageUpdate', scheduleStrifeRender);
  }
  renderStrifeTool();
  window.vtsRenderStrifeTool = scheduleStrifeRender;
}
import '../css/secondary-tools-v14.css';
import '../css/strife-v14.css';
