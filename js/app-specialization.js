// js/app-specialization.js
// Specialization Towers tab for index.html, following the in-game flow:
// column banners of badges -> tap a badge -> a node ring you learn along.
// Reuses the verified data/model/store/i18n foundation; no game data defined here.

import { currentLanguage, generatorSelectedHeroes } from './state.js';
import { escapeHtml } from './utils.js';
import { getCurrentUser, onUserChanged } from './firebase.js';
import {
  SPECIALIZATION_COLUMNS,
  SPECIALIZATION_RESEARCH,
  getSpecializationLegionSkillImage,
  getSpecializationResearchImage,
} from './specialization-towers-v2-data.js';
import {
  getSpecializationSummary,
  getColumnProgress,
  getResearchProgress,
  getResearchNodeAccess,
  toggleResearchNode,
  setResearchNodes,
  maxResearchNode,
  setResearchMedalsSpent,
  resetResearch,
} from './specialization-towers-v2-model.js';
import {
  loadSpecializationState,
  saveSpecializationState,
} from './specialization-towers-v2-store.js';
import { buildContributionTemplateRows } from './specialization-towers-v2-template.js';
import {
  SPECIALIZATION_ROUTE_IDS,
  getNextRouteResearch,
  getRouteStep,
  getRouteLabel,
  getRouteRationale,
} from './specialization-routes.js';
import {
  HERO_PLAN_DATA_REVISION,
  HERO_PLAN_MODES,
  buildHeroPlans,
  getHeroPlanRanking,
  getHeroPlanStep,
  getNextHeroPlanResearch,
} from './specialization-hero-plans.js';
import {
  specializationTowersV2Text,
  resolveSpecializationTowersV2Locale,
  getSpecializationTowersV2Direction,
} from './i18n/specialization-towers-v2/index.js';
import {
  specializationDisplayText,
  localizeSpecializationEffect,
  localizeSpecializationNodeName,
  localizeSpecializationResearchName,
} from './i18n/specialization-towers-v2/display.js';

const UI_TROOPS = ['cavalry', 'archer', 'footman'];
// Line-art glyphs drawn to match the in-game icon families, so a node here reads
// as the same kind of node it is on the phone. All inherit `currentColor`, which
// each surface tints (Might warm, Resistance blue, HP green, and so on).
function svgIcon(name, body) {
  return `<svg class="spec-glyph spec-glyph--${name}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" focusable="false" aria-hidden="true">${body}</svg>`;
}

const ICON = {
  // Crossed swords — Might and Tactical Might.
  might: svgIcon(
    'might',
    '<path d="M18.5 3.5h-2L7 14.5"/><path d="M5.5 3.5h2L17 14.5"/><path d="m7 14.5-2 2 2.5 2.5 2-2"/><path d="m17 14.5 2 2-2.5 2.5-2-2"/><path d="M4 20.5 6 18.5M20 20.5 18 18.5"/>'
  ),
  // Shield — Resistance.
  resistance: svgIcon('resistance', '<path d="M12 3 5 6v6c0 4 3 7.2 7 9 4-1.8 7-5 7-9V6z"/>'),
  // Heart — HP and Revival.
  hp: svgIcon(
    'hp',
    '<path d="M12 20s-7-4.4-7-9.4A3.8 3.8 0 0 1 12 8a3.8 3.8 0 0 1 7 2.6c0 5-7 9.4-7 9.4z"/>'
  ),
  // Starburst on a shield — the "Intel" family (Tactical Resistance).
  intel: svgIcon(
    'intel',
    '<path d="M12 3 5 6v6c0 4 3 7.2 7 9 4-1.8 7-5 7-9V6z"/><path d="M12 7.5v7M8.5 11h7M9.6 8.6l4.8 4.8M14.4 8.6l-4.8 4.8"/>'
  ),
  // Helmet — the rally-join family.
  rally: svgIcon(
    'rally',
    '<path d="M5 12a7 7 0 0 1 14 0v4.5a2.5 2.5 0 0 1-2.5 2.5H14v-3.5h-4V19H7.5A2.5 2.5 0 0 1 5 16.5z"/><path d="M12 5.5V12"/><path d="M8.5 12h7"/>'
  ),
  // Hourglass — the passive skill each research ends on.
  passive: svgIcon(
    'passive',
    '<path d="M7 3h10M7 21h10"/><path d="M7 3v3.5L12 12 7 17.5V21"/><path d="M17 3v3.5L12 12l5 5.5V21"/>'
  ),
  // Chevrons — march and combat speed.
  speed: svgIcon('speed', '<path d="m5 7 6 5-6 5"/><path d="m13 7 6 5-6 5"/>'),
  // Banner — research badge fallback where no in-game art is mapped yet.
  badge: svgIcon('badge', '<path d="M6 3h12v18l-6-4-6 4z"/>'),
  cavalry: svgIcon(
    'cavalry',
    '<path d="M6 20c0-5 2.5-8 6-8.5L14 6l-2-1 1-2 4 1.5L19 8l-2 1-1.5 3.5C17.5 14 19 16.5 19 20"/><path d="M6 20h13"/>'
  ),
  archer: svgIcon(
    'archer',
    '<path d="M5 19 19 5"/><path d="M14 5h5v5"/><path d="M5 19a12 12 0 0 1 12-12"/>'
  ),
  footman: svgIcon(
    'footman',
    '<path d="M12 3 5 6v6c0 4 3 7.2 7 9 4-1.8 7-5 7-9V6z"/><path d="M12 8v8"/>'
  ),
};

const TROOP_ICON = { cavalry: ICON.cavalry, archer: ICON.archer, footman: ICON.footman };

// Research badge glyphs by family, used only until real in-game art is mapped.
const BADGE_ICON = [
  { test: /^Training/i, icon: ICON.cavalry },
  { test: /^Encounter/i, icon: ICON.might },
  { test: /^Siege/i, icon: ICON.archer },
  { test: /^Call of Glory/i, icon: ICON.badge },
  { test: /^Defensive/i, icon: ICON.resistance },
  { test: /^Neat/i, icon: ICON.might },
  { test: /^Enhanced/i, icon: ICON.intel },
];

const CONTRIBUTION_STORAGE_KEY = 'vts_specialization_contributions';
const ROUTE_KEY = 'vts_specialization_towers_v2_route';
const EASY_MEDALS_KEY = 'vts_specialization_towers_v2_easy_medals';
const HERO_PLAN_KEY = 'vts_specialization_hero_plan';
const HERO_PLAN_MODE_KEY = 'vts_specialization_hero_plan_mode';

let root = null;
let state = null;
// Archers are the tower most players plan first, so the tab lands there.
let activeTroop = 'archer';
let view = 'overview'; // 'overview' | 'detail'
let selectedResearchId = null;
let selectedNodeId = null;
let selectedLegionColumnId = null;
let wired = false;
// Shared with the standalone planner through the same storage keys, so a route picked in
// one surface is the route the other shows.
let activeRoute = '';
let easyMedalMode = false;
// Hero-plan state: computed from the Heroes tab roster (generatorSelectedHeroes).
let heroPlanMode = 'balanced';
let heroPlans = null; // buildHeroPlans() result or null
let heroPlanRoster = []; // roster snapshot the stored plan was built from

function safeGet(key, fallback = '') {
  try {
    return localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
}

function safeSet(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage unavailable */
  }
}

function isResearchCompleteForRoute(researchId) {
  const progress = getResearchProgress(state, activeTroop, researchId);
  return progress.completedNodes >= progress.totalNodes;
}

function routeNextResearchId() {
  if (!activeRoute) return null;
  return getNextRouteResearch(activeRoute, isResearchCompleteForRoute, activeTroop);
}

// ---------------------------------------------------------------------------
// Hero plan (skill-semantics auto-path) state
// ---------------------------------------------------------------------------

function currentRoster() {
  return [...(generatorSelectedHeroes || [])].sort((a, b) => a.localeCompare(b));
}

function heroPlanForTroop(troopId) {
  return heroPlans?.plans?.[troopId] || null;
}

function heroPlanNextResearchId() {
  const plan = heroPlanForTroop(activeTroop);
  if (!plan) return null;
  return getNextHeroPlanResearch(plan, isResearchCompleteForRoute);
}

function saveHeroPlan() {
  try {
    localStorage.setItem(
      HERO_PLAN_KEY,
      JSON.stringify({
        revision: HERO_PLAN_DATA_REVISION,
        plan: heroPlans,
        roster: heroPlanRoster,
        mode: heroPlanMode,
      })
    );
  } catch {
    /* storage unavailable */
  }
}

function loadStoredHeroPlan() {
  try {
    const raw = localStorage.getItem(HERO_PLAN_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || !parsed.plan?.plans) return;
    // A cached plan is only valid for the engine that produced it. Without this
    // check a plan survives every later release untouched, because the only
    // other staleness signal is the roster changing. Keep the mode, drop the
    // stale plan, and let the bar offer a fresh build.
    heroPlanMode = HERO_PLAN_MODES.includes(parsed.mode) ? parsed.mode : 'balanced';
    safeSet(HERO_PLAN_MODE_KEY, heroPlanMode);
    if (parsed.revision !== HERO_PLAN_DATA_REVISION) {
      try {
        localStorage.removeItem(HERO_PLAN_KEY);
      } catch {
        /* storage unavailable */
      }
      return;
    }
    heroPlans = parsed.plan;
    heroPlanRoster = Array.isArray(parsed.roster) ? parsed.roster : [];
  } catch {
    /* corrupted plan storage */
  }
}

function recomputeHeroPlans() {
  const roster = currentRoster();
  heroPlanRoster = roster.slice();
  heroPlans = buildHeroPlans({ heroes: roster, mode: heroPlanMode });
  saveHeroPlan();
  render();
}

function heroPlanRosterChanged() {
  const roster = currentRoster();
  if (roster.length !== heroPlanRoster.length) return true;
  return roster.some((name, index) => name !== heroPlanRoster[index]);
}

function contributionNodeKey(researchId, nodeId) {
  return `${researchId}:${nodeId}`;
}

function contributionRecord(data, nodeKey) {
  if (data.nodes[nodeKey]) return data.nodes[nodeKey];
  const legacyNodeId = nodeKey.split(':').at(-1);
  data.nodes[nodeKey] = { ...(data.nodes[legacyNodeId] || {}) };
  delete data.nodes[legacyNodeId];
  return data.nodes[nodeKey];
}

function loadContributions() {
  try {
    const raw = localStorage.getItem(CONTRIBUTION_STORAGE_KEY);
    if (!raw) return { contributorName: '', nodes: {} };
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || !parsed) return { contributorName: '', nodes: {} };
    return {
      contributorName: typeof parsed.contributorName === 'string' ? parsed.contributorName : '',
      nodes: typeof parsed.nodes === 'object' && parsed.nodes ? parsed.nodes : {},
    };
  } catch {
    return { contributorName: '', nodes: {} };
  }
}

function saveContributions(data) {
  try {
    localStorage.setItem(CONTRIBUTION_STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* storage full or unavailable */
  }
}

function contributionCount(data) {
  return Object.values(data.nodes).filter(
    (node) => node?.medalCost != null || node?.reviewedMedalCost != null
  ).length;
}

function locale() {
  return resolveSpecializationTowersV2Locale(currentLanguage);
}

function sp(key, vars = {}) {
  return specializationTowersV2Text(key, vars, locale());
}

function sd(key, vars = {}) {
  return specializationDisplayText(locale(), key, vars);
}

function fmt(value) {
  const loc = locale();
  return new Intl.NumberFormat(loc === 'kr' ? 'ko' : loc).format(Number(value) || 0);
}

function pct(value) {
  return Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
}

function badgeIcon(name) {
  return BADGE_ICON.find((entry) => entry.test.test(name))?.icon || '◆';
}

function plannerSprite(asset, className = '') {
  if (!asset) return '';
  const viewBox = `${asset.column * 120} ${288 + asset.row * 129} 120 129`;
  return `<svg class="${className} specialization-planner-sprite" viewBox="${viewBox}" focusable="false"><image href="${escapeHtml(asset.src)}" width="960" height="933"></image></svg>`;
}

// Node glyph + colour family, chosen the way the game chooses its node art: the
// passive skill is an hourglass, rally-join buffs are helmets, "Intel" buffs
// (Tactical Resistance) are the starburst shield, and the rest fall back to the
// plain attribute the buff moves.
function nodeIconKind(node, passive = false) {
  if (passive) return 'passive';
  if (node?.context === 'rallyJoin') return 'rally';
  const effect = node?.effect || '';
  if (/Tactical Resistance/i.test(effect)) return 'intel';
  if (/Tactical Might|Might/i.test(effect)) return 'might';
  if (/Resistance|Defense/i.test(effect)) return 'resistance';
  if (/HP|Revival/i.test(effect)) return 'hp';
  if (/Speed|Marching/i.test(effect)) return 'speed';
  return 'badge';
}

function nodeIcon(node, passive = false) {
  return ICON[nodeIconKind(node, passive)];
}

// In game a node shows one pip per upgrade it takes. The base-attribute nodes
// (Frenzy Fighter, Tough Armor, Energetic) are the two-upgrade ones; everything
// else is a single upgrade.
function nodeUpgradeCount(node) {
  return node?.context === 'baseAttributes' ? 2 : 1;
}

function upgradePips(count, level = 0) {
  if (count < 2) return '';
  const pips = Array.from({ length: count }, (unused, index) =>
    index < level ? '<i data-filled="true"></i>' : '<i></i>'
  ).join('');
  return `<span class="spec-node-pips" aria-hidden="true">${pips}</span>`;
}

function troopLabel(troop) {
  return sp(
    troop === 'cavalry' ? 'towerCavalry' : troop === 'archer' ? 'towerArchers' : 'towerFootmen'
  );
}

function seasonLabel(value) {
  return value === 'SX1' ? sp('seasonSX1') : sp('seasonS3');
}

function researchName(research) {
  return localizeSpecializationResearchName(locale(), research.name, troopLabel(activeTroop));
}

function columnLabel(columnId) {
  return sd('columnLabel', { number: columnId });
}

function nodeName(name) {
  return localizeSpecializationNodeName(locale(), name);
}

function effectText(effect) {
  return localizeSpecializationEffect(locale(), effect);
}

function persist() {
  try {
    saveSpecializationState(state);
  } catch (error) {
    console.warn('[specialization] save failed', error);
  }
}

function statusOf(progress) {
  if (progress.isComplete) return 'complete';
  if (progress.completedNodes > 0) return 'in-progress';
  return 'unstarted';
}

/* ---------- Overview: troop tabs + column banners ---------- */

// The hero-specific plan name where the chart names heroes, generic otherwise.
function routeOptionLabel(routeId) {
  return (
    getRouteLabel(routeId, activeTroop) || sp(routeId === 'spender' ? 'routeSpender' : 'routeF2p')
  );
}

function renderSummary(summary) {
  const troop = summary.troops[activeTroop];
  const medals = summary.overall.medals;
  const medalText = medals.isExact
    ? `${fmt(medals.exactSpent)} / ${fmt(medals.totalCost)}`
    : `${fmt(medals.knownSpent)}+ / ${fmt(medals.totalCost)}`;
  const stat = (label, value, cls = '') =>
    `<div class="spec-stat"><span class="spec-stat-label">${escapeHtml(label)}</span><span class="spec-stat-value ${cls}">${value}</span></div>`;
  return `
    <div class="spec-summary">
      <div class="spec-summary-head">
        <h2 class="spec-title">${escapeHtml(sp('title'))}</h2>
        <p class="spec-subtitle">${escapeHtml(sp('subtitle'))}</p>
      </div>
      <div class="spec-tool-controls">
        <label class="spec-route-control">
          <span>${escapeHtml(sp('routeLabel'))}</span>
          <select data-spec-route-select aria-label="${escapeHtml(sp('routeLabel'))}">
            <option value="" ${activeRoute === '' ? 'selected' : ''}>${escapeHtml(sp('routeNone'))}</option>
            ${SPECIALIZATION_ROUTE_IDS.map((id) => `<option value="${id}" ${activeRoute === id ? 'selected' : ''}>${escapeHtml(routeOptionLabel(id))}</option>`).join('')}
          </select>
        </label>
        <button type="button" class="spec-easy-medals" data-spec-easy-medals aria-pressed="${easyMedalMode}">${escapeHtml(sp('easyMedalsLabel'))}</button>
      </div>
      ${renderHeroPlanBar()}
      <div class="spec-stat-row">
        ${stat(sp('currentTowerProgress'), `${pct(troop.percent)}%`)}
        ${stat(sp('fundedResearches'), `${fmt(troop.completedResearchCount)} / ${fmt(troop.totalResearchCount)}`)}
        ${stat(sp('legionSkills'), `${fmt(troop.completedColumnCount)} / ${fmt(troop.totalColumnCount)}`)}
        ${stat(sp('medalProgress'), escapeHtml(medalText), 'spec-stat-value--medals')}
      </div>
    </div>`;
}

function renderHeroPlanBar() {
  const roster = currentRoster();
  const hasStoredPlan = Boolean(heroPlans);
  const changed = hasStoredPlan && heroPlanRosterChanged();
  const modeOptions = HERO_PLAN_MODES.map(
    (mode) =>
      `<option value="${mode}" ${heroPlanMode === mode ? 'selected' : ''}>${escapeHtml(sp(`planMode${mode[0].toUpperCase()}${mode.slice(1)}`))}</option>`
  ).join('');

  if (!hasStoredPlan && roster.length === 0) {
    return `
    <div class="spec-hero-plan spec-hero-plan--empty" data-spec-hero-plan>
      <div class="spec-hero-plan-head">
        <strong class="spec-hero-plan-title">${escapeHtml(sp('planLabel'))}</strong>
        <label class="spec-plan-mode-control">
          <span class="spec-sr-only">${escapeHtml(sp('planModeLabel'))}</span>
          <select data-spec-plan-mode aria-label="${escapeHtml(sp('planModeLabel'))}">
            ${modeOptions}
          </select>
        </label>
        <button type="button" class="spec-auto-path" data-spec-auto-path>${escapeHtml(sp('planAutoPath'))}</button>
      </div>
      <p class="spec-hero-plan-note">${escapeHtml(sp('planEmptyNote'))}</p>
      <button type="button" class="spec-hero-plan-jump" data-spec-plan-go-heroes>${escapeHtml(sp('planGoToHeroes'))}</button>
    </div>`;
  }

  const plan = heroPlanForTroop(activeTroop);
  const ranking = heroPlans ? getHeroPlanRanking(heroPlans.plans) : [];
  const chips = ranking
    .map(
      (entry, index) =>
        `<button type="button" class="spec-plan-troop-chip${entry.troop === activeTroop ? ' active' : ''}" data-spec-plan-troop="${entry.troop}" title="${escapeHtml(sp('planPriority'))} #${index + 1}">
          <span class="spec-plan-troop-icon" aria-hidden="true">${TROOP_ICON[entry.troop]}</span>
          <span class="spec-plan-troop-name">${escapeHtml(troopLabel(entry.troop))}</span>
          <span class="spec-plan-troop-rank" aria-hidden="true">${'★'.repeat(Math.max(1, ranking.length - index))}</span>
        </button>`
    )
    .join('');

  const nextId = plan ? heroPlanNextResearchId() : null;
  const nextReasons = plan && nextId ? plan.reasons[nextId] || [] : [];

  return `
    <div class="spec-hero-plan" data-spec-hero-plan>
      <div class="spec-hero-plan-head">
        <strong class="spec-hero-plan-title">${escapeHtml(sp('planLabel'))}</strong>
        <span class="spec-hero-plan-roster">${escapeHtml(sp('planRosterCount', { count: heroPlanRoster.length }))}</span>
        <label class="spec-plan-mode-control">
          <span class="spec-sr-only">${escapeHtml(sp('planModeLabel'))}</span>
          <select data-spec-plan-mode aria-label="${escapeHtml(sp('planModeLabel'))}">
            ${modeOptions}
          </select>
        </label>
        <button type="button" class="spec-auto-path" data-spec-auto-path>${escapeHtml(sp('planAutoPath'))}</button>
      </div>
      <div class="spec-plan-troop-chips" aria-label="${escapeHtml(sp('planPriority'))}">${chips}</div>
      ${changed ? `<p class="spec-hero-plan-hint">${escapeHtml(sp('planRosterChanged'))}</p>` : ''}
      ${
        nextReasons.length
          ? `<div class="spec-hero-plan-why"><span class="spec-hero-plan-why-label">${escapeHtml(sp('planWhyNext'))}:</span><span>${nextReasons.map(escapeHtml).join(' · ')}</span></div>`
          : ''
      }
    </div>`;
}

function renderTroopTabs(summary) {
  return `<div class="spec-troop-tabs" role="tablist">${UI_TROOPS.map((troop) => {
    const p = pct(summary.troops[troop].percent);
    const active = troop === activeTroop;
    const label = `${troopLabel(troop)} ${p}%`;
    return `<button type="button" class="spec-troop-tab${active ? ' active' : ''}" role="tab" aria-selected="${active}" aria-label="${escapeHtml(label)}" data-spec-troop="${troop}"><span class="spec-troop-icon" aria-hidden="true">${TROOP_ICON[troop]}</span><span class="spec-troop-name">${escapeHtml(troopLabel(troop))}</span><span class="spec-troop-pct">${p}%</span></button>`;
  }).join('')}</div>`;
}

function renderBadge(researchId) {
  const research = SPECIALIZATION_RESEARCH[researchId];
  const progress = getResearchProgress(state, activeTroop, researchId);
  const status = statusOf(progress);
  const image = getSpecializationResearchImage(researchId, activeTroop);
  const plan = !activeRoute ? heroPlanForTroop(activeTroop) : null;
  const routeStep = activeRoute
    ? getRouteStep(activeRoute, researchId, activeTroop)
    : plan
      ? getHeroPlanStep(plan, researchId)
      : 0;
  const isRouteNext = activeRoute && routeNextResearchId() === researchId;
  const isPlanNext = plan && heroPlanNextResearchId() === researchId;
  const isNext = isRouteNext || isPlanNext;
  const planReasons = plan?.reasons?.[researchId] || [];
  // A picked route carries the plan author's reason for the position; the hero
  // plan carries its own. Whichever is driving the order explains itself.
  const routeReason = routeStep && activeRoute ? getRouteRationale(researchId, activeTroop) : '';
  const planTip = planReasons.length
    ? `${escapeHtml(sp('planWhyNext'))}: ${planReasons.join(' · ')}`
    : routeReason
      ? escapeHtml(routeReason)
      : '';
  return `
    <div class="spec-badge-wrap" data-route-step="${routeStep || ''}" data-route-next="${isNext ? 'true' : 'false'}"${planTip ? ` data-plan-reason="true" title="${planTip}"` : ''}>
      ${routeStep ? `<span class="spec-route-step" aria-hidden="true">${routeStep}</span>` : ''}
      ${isNext ? `<span class="spec-route-next">${escapeHtml(sp('routeNextUp'))}</span>` : ''}
      <button type="button" class="spec-badge" data-status="${status}" data-spec-research="${researchId}" aria-label="${escapeHtml(researchName(research))} ${pct(progress.percent)}%">
        <span class="spec-badge-emblem" aria-hidden="true">${image ? plannerSprite(image) : badgeIcon(research.name)}</span>
        <span class="spec-badge-name">${escapeHtml(researchName(research))}</span>
        <span class="spec-badge-pct">${pct(progress.percent)}%</span>
      </button>
      <button type="button" class="spec-badge-max${progress.isComplete ? ' is-unmax' : ''}" data-spec-quick-set="${progress.isComplete ? 'reset' : 'complete'}" data-spec-research-id="${researchId}" aria-label="${escapeHtml(`${progress.isComplete ? sp('resetLearning') : sp('completeLearning')}: ${researchName(research)}`)}" title="${escapeHtml(progress.isComplete ? sp('resetLearning') : sp('completeLearning'))}">${escapeHtml(progress.isComplete ? sd('quickUnmax') : sp('quickMax'))}</button>
    </div>`;
}

function renderBanner(columnId) {
  const column = SPECIALIZATION_COLUMNS[columnId];
  const colProgress = getColumnProgress(state, activeTroop, columnId);
  const unlocked = colProgress.legionSkillUnlocked;
  const skill = colProgress.legionSkill;
  const skillName = skill?.name || '';
  const skillImage = getSpecializationLegionSkillImage(columnId, activeTroop);
  const skillTip = unlocked
    ? `${skillName}${skill?.desc ? ` — ${skill.desc}` : ''}`
    : sd('legionLockedHint');
  return `
    <section class="spec-banner" aria-label="${escapeHtml(columnLabel(columnId))}">
      <header class="spec-banner-head">
        <span class="spec-banner-num">${columnId}</span>
        <span class="spec-banner-season">${escapeHtml(seasonLabel(column.unlockSeason))}</span>
      </header>
      <div class="spec-banner-badges">
        ${column.researches.map(renderBadge).join('')}
      </div>
      <button type="button" class="spec-crest ${unlocked ? 'is-unlocked' : 'is-locked'}" data-spec-legion="${columnId}" ${unlocked ? `aria-expanded="${selectedLegionColumnId === columnId}" aria-controls="spec-legion-inspector"` : 'disabled aria-disabled="true"'} title="${escapeHtml(skillTip)}">
        <span class="spec-crest-emblem" aria-hidden="true">${skillImage ? plannerSprite(skillImage) : unlocked ? '🏅' : '🔒'}</span>
        <span class="spec-crest-name">${escapeHtml(skillName || sp('legionSkills'))}</span>
      </button>
    </section>`;
}

function renderLegionSkillInspector() {
  if (!selectedLegionColumnId) return '';
  const progress = getColumnProgress(state, activeTroop, selectedLegionColumnId);
  const skill = progress.legionSkillUnlocked ? progress.legionSkill : null;
  if (!skill) return '';
  const skillImage = getSpecializationLegionSkillImage(selectedLegionColumnId, activeTroop);
  return `
    <section id="spec-legion-inspector" class="spec-legion-inspector" tabindex="-1" aria-live="polite">
      <span class="spec-legion-inspector-icon" aria-hidden="true">${skillImage ? plannerSprite(skillImage) : '🏅'}</span>
      <div class="spec-legion-inspector-copy">
        <span class="spec-node-inspector-kicker">${escapeHtml(sd('legionPreview'))} · ${escapeHtml(columnLabel(selectedLegionColumnId))}</span>
        <h4>${escapeHtml(skill.name)}</h4>
        <p><strong>${escapeHtml(sp('nodeBuffLabel'))}</strong> ${escapeHtml(skill.desc || sp('nodeBuffUnknown'))}</p>
        ${locale() === 'en' ? '' : `<small>${escapeHtml(sp('canonicalEnglishBadge'))}</small>`}
      </div>
      <span class="spec-legion-unlocked">${escapeHtml(sd('legionUnlocked'))}</span>
      <button type="button" class="spec-legion-close" data-spec-close-legion aria-label="${escapeHtml(sd('closePreview'))}">×</button>
    </section>`;
}

// Submitted numbers are attributed to a signed-in account rather than a typed name, so
// the per-node contributor field disappears and one node is a single number to type.
//
function getContributorIdentity() {
  const user = getCurrentUser?.();
  if (!user || user.isAnonymous) return null;
  return {
    uid: user.uid,
    label: user.displayName || user.email || user.uid,
  };
}

function renderCommunity() {
  const data = loadContributions();
  const { rows } = buildContributionTemplateRows();
  const columns = Object.values(SPECIALIZATION_COLUMNS).sort((a, b) => Number(a.id) - Number(b.id));
  const identity = getContributorIdentity();
  return `
    <section class="spec-community" data-contrib-signed-in="${identity ? 'true' : 'false'}">
      <div class="spec-community-copy">
        <h4>${escapeHtml(sp('communityDataTitle'))}</h4>
        <p>${escapeHtml(sp('communityDataDescription'))}</p>
      </div>
      ${
        identity
          ? `<p class="spec-contrib-identity">${escapeHtml(sp('communitySignedInAs', { name: identity.label }))}</p>`
          : `<p class="spec-contrib-signin"><span>${escapeHtml(sp('communitySignInRequired'))}</span><a class="spec-contrib-signin-link" href="profile.html">${escapeHtml(sp('communitySignInCta'))}</a></p>`
      }
      <span class="spec-contrib-count">${escapeHtml(sp('communityNodesWithData', { count: contributionCount(data) }))}</span>
      <div class="spec-contrib-nodes">
        ${columns
          .map((col) => {
            const colResearches = col.researches
              .map((rid) => SPECIALIZATION_RESEARCH[rid])
              .filter(Boolean);
            if (!colResearches.length) return '';
            return `<details class="spec-contrib-column">
            <summary><strong>${escapeHtml(columnLabel(col.id))}</strong></summary>
            ${colResearches
              .map((research) => {
                const rowData = rows.filter((r) => r[3] === research.id);
                if (!rowData.length) return '';
                return `<section class="spec-contrib-research">
                <h5>${escapeHtml(researchName(research))}</h5>
                ${rowData
                  .map((row) => {
                    const nodePosition = row[5];
                    const nodeId = row[6];
                    const nodeLabel = row[7];
                    const nodeEffect = row[8];
                    const nodeKey = contributionNodeKey(research.id, nodeId);
                    const saved = data.nodes[nodeKey] || data.nodes[nodeId] || {};
                    return `<div class="spec-contrib-node" data-node-id="${escapeHtml(nodeId)}" data-contribution-key="${escapeHtml(nodeKey)}">
                    <div class="spec-contrib-node-identity">
                      <span class="spec-contrib-node-icon" aria-hidden="true">${nodeIcon({ effect: nodeEffect })}</span>
                      <span><small>#${fmt(nodePosition)}</small><strong>${escapeHtml(nodeName(nodeLabel))}</strong>${nodeEffect ? `<em>${escapeHtml(effectText(nodeEffect))}</em>` : ''}</span>
                    </div>
                    <fieldset class="spec-contrib-stage">
                      <legend>${escapeHtml(sp('verificationSubmitted'))}</legend>
                      <label><span>${escapeHtml(sp('communityMedalCost'))}</span>
                        <input type="number" min="0" step="1" data-spec-node-medal="${escapeHtml(nodeKey)}" value="${saved.medalCost != null ? saved.medalCost : ''}" placeholder="${escapeHtml(sp('medalsUnknown'))}" ${identity ? '' : 'disabled'} />
                      </label>
                      ${saved.contributor ? `<p class="spec-contrib-credit">${escapeHtml(sp('communitySubmittedBy', { name: saved.contributor }))}</p>` : ''}
                    </fieldset>
                    <span class="spec-contrib-flow" aria-hidden="true">→</span>
                    <fieldset class="spec-contrib-stage spec-contrib-stage--review">
                      <legend>${escapeHtml(sp('verificationVerified'))}</legend>
                      <label><span>${escapeHtml(sp('communityReviewer'))}</span>
                        <input type="text" data-spec-node-reviewer="${escapeHtml(nodeKey)}" value="${escapeHtml(saved.reviewer || '')}" maxlength="40" placeholder="${escapeHtml(sp('communityReviewerPlaceholder'))}" ${identity ? '' : 'disabled'} />
                      </label>
                      <label><span>${escapeHtml(sp('communityMedalCost'))}</span>
                        <input type="number" min="0" step="1" data-spec-node-reviewed-medal="${escapeHtml(nodeKey)}" value="${saved.reviewedMedalCost != null ? saved.reviewedMedalCost : ''}" placeholder="${escapeHtml(sp('medalsUnknown'))}" ${identity ? '' : 'disabled'} />
                      </label>
                    </fieldset>
                  </div>`;
                  })
                  .join('')}
              </section>`;
              })
              .join('')}
          </details>`;
          })
          .join('')}
      </div>
    </section>`;
}

function renderAcknowledgments() {
  const plates = ['VTS 1097 Community'];
  return `
    <section class="spec-ack" aria-labelledby="spec-ack-title">
      <div class="spec-ack-rule" aria-hidden="true"><span class="spec-ack-seal">🏅</span></div>
      <header class="spec-ack-head">
        <h4 id="spec-ack-title">${escapeHtml(sp('ackTitle'))}</h4>
        <p class="spec-ack-intro">${escapeHtml(sp('ackIntro'))}</p>
      </header>
      <ul class="spec-ack-plates" role="list">
        ${plates
          .map(
            (
              name,
              index
            ) => `<li class="spec-ack-plate${index === 0 ? ' spec-ack-plate--lead' : ''}" style="--i:${index}">
              <span class="spec-ack-plate-crest" aria-hidden="true">${index === 0 ? '🛡️' : '◆'}</span>
              <span class="spec-ack-plate-name">${escapeHtml(name)}</span>
            </li>`
          )
          .join('')}
      </ul>
      <p class="spec-ack-tail">${escapeHtml(sp('ackTail'))}</p>
    </section>`;
}

function renderOverview(summary) {
  return `
    ${renderTroopTabs(summary)}
    <p class="spec-hint">${escapeHtml(sp('seasonPlanningNote'))}</p>
    <div class="spec-banners" role="list">
      ${Object.keys(SPECIALIZATION_COLUMNS)
        .map((id) => renderBanner(Number(id)))
        .join('')}
    </div>
    ${renderLegionSkillInspector()}
    ${renderCommunity()}
    ${renderAcknowledgments()}`;
}

/* ---------- Detail: node graph (oval ring or tactic tree) ---------- */

function resolveNode(research, entry) {
  const node = research.nodes.find((candidate) => candidate.id === entry.nodeId);
  if (node) {
    const troopOverride = node.troopSpecific?.[activeTroop];
    return {
      ...node,
      name: troopOverride?.name || node.name,
      effect: troopOverride?.effect || troopOverride?.desc || node.effect || node.desc || '',
    };
  }
  if (research.passiveSkillNodeId === entry.nodeId) {
    const passive = research.passiveSkill?.[activeTroop] || {};
    return {
      id: entry.nodeId,
      name: passive.name || sp('nodePathProgressive'),
      effect: passive.effect || passive.desc || '',
    };
  }
  return { id: entry.nodeId, name: '', effect: '' };
}

function nodeButton(research, entry, x, y, order = 0) {
  const node = resolveNode(research, entry);
  const disabled = entry.state === 'hidden';
  const selected = entry.nodeId === selectedNodeId;
  const localizedName = nodeName(node.name);
  const localizedEffect = effectText(node.effect);
  const step = order ? `${order}. ` : '';
  const tip = `${step}${escapeHtml(localizedName)}${localizedEffect ? ' — ' + escapeHtml(localizedEffect) : ''}`;
  const passive = research.passiveSkillNodeId === entry.nodeId;
  const kind = nodeIconKind(node, passive);
  // The order chip turns the graph into a plan you can read: it is the learning
  // order the research is stored in, so "learn through here" is unambiguous.
  const chip = order ? `<span class="spec-ring-num" aria-hidden="true">${order}</span>` : '';
  const upgrades = nodeUpgradeCount(node);
  return `<button type="button" class="spec-ring-node" data-state="${entry.state}" data-kind="${kind}" data-passive="${passive}" data-upgrades="${upgrades}" data-selected="${selected}" data-order="${order}" data-spec-node="${entry.nodeId}" style="left:${x.toFixed(2)}%;top:${y.toFixed(2)}%" ${disabled ? 'disabled aria-disabled="true" ' : ''}${selected ? 'aria-current="true" ' : ''}title="${tip}" aria-label="${tip}" aria-controls="spec-node-inspector"><span class="spec-ring-node-glyph" aria-hidden="true">${ICON[kind]}</span>${upgradePips(upgrades, entry.level ?? 0)}${chip}</button>`;
}

// Enhanced Tactics is a small dependency tree in-game; everything else is a
// closed oval ring. The dataset only encodes edges for progressive-reveal
// researches, so ring vs. tree is chosen by family and any prerequisite data.
function isTreeLayout(research) {
  return (
    /^Enhanced/i.test(research.name) ||
    Boolean(research.progressiveReveal) ||
    research.nodes.some((node) => Array.isArray(node.prerequisiteNodeIds))
  );
}

// Graph geometry transcribed from in-game screenshots (2026-08-12 capture, all
// graphs at 100%). `points[i]` is where dataset entry `i` sits, as a percentage
// of the graph box; `aspect` is that box's width/height so the layout keeps its
// in-game proportions instead of being squashed into a square. `edges` are node
// index pairs and `centerEdges` are nodes wired inward to the research emblem,
// which sits at `center`. Node order was verified against the screenshots by
// matching each slot's icon and the names revealed on selection.
// Researches without an entry here fall back to the generic even ellipse.
const RING_SHAPES = {
  // Single loop: entry 1 hangs off the emblem, the chain runs down the left,
  // around the bottom and up the right, ending at the passive skill on top.
  training1: {
    aspect: 0.757,
    center: { x: 49.9, y: 50.3 },
    points: [
      { x: 19.6, y: 32.3 },
      { x: 10.1, y: 50.3 },
      { x: 13.7, y: 68.3 },
      { x: 25.9, y: 82.5 },
      { x: 49.9, y: 94.2 },
      { x: 74.6, y: 82.5 },
      { x: 86.3, y: 68.3 },
      { x: 90.2, y: 50.3 },
      { x: 86.3, y: 32.3 },
      { x: 73.9, y: 18.0 },
      { x: 49.9, y: 5.8 },
    ],
    edges: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 6],
      [6, 7],
      [7, 8],
      [8, 9],
      [9, 10],
    ],
    centerEdges: [0],
  },
  // Outer loop closed through the top hub, plus two inner nodes that drop from
  // the hub into the emblem.
  encounter1: {
    aspect: 0.785,
    center: { x: 49.9, y: 48.6 },
    points: [
      { x: 66.0, y: 30.6 },
      { x: 33.6, y: 30.6 },
      { x: 49.9, y: 6.0 },
      { x: 77.8, y: 8.3 },
      { x: 90.1, y: 25.7 },
      { x: 95.5, y: 48.6 },
      { x: 83.9, y: 66.2 },
      { x: 70.2, y: 81.0 },
      { x: 30.1, y: 81.0 },
      { x: 16.4, y: 66.2 },
      { x: 6.4, y: 48.6 },
      { x: 10.1, y: 25.7 },
      { x: 22.7, y: 8.3 },
      { x: 49.9, y: 94.0 },
    ],
    edges: [
      [2, 0],
      [2, 1],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 6],
      [6, 7],
      [7, 13],
      [13, 8],
      [8, 9],
      [9, 10],
      [10, 11],
      [11, 12],
      [12, 2],
    ],
    centerEdges: [0, 1],
  },
  // Four branches off the emblem: two Resistance arms sweeping down, two Might
  // arms sweeping up and meeting at the passive skill.
  callofglory1: {
    aspect: 0.72,
    center: { x: 49.9, y: 52.7 },
    points: [
      { x: 67.4, y: 63.8 },
      { x: 90.1, y: 66.3 },
      { x: 73.9, y: 78.7 },
      { x: 73.9, y: 94.5 },
      { x: 32.5, y: 63.8 },
      { x: 10.1, y: 66.3 },
      { x: 26.3, y: 78.7 },
      { x: 26.3, y: 94.5 },
      { x: 67.4, y: 41.8 },
      { x: 83.9, y: 31.8 },
      { x: 90.1, y: 16.6 },
      { x: 71.3, y: 5.5 },
      { x: 32.5, y: 41.8 },
      { x: 15.1, y: 31.8 },
      { x: 10.1, y: 16.6 },
      { x: 28.7, y: 5.5 },
      { x: 49.9, y: 19.1 },
    ],
    edges: [
      [0, 1],
      [1, 2],
      [2, 3],
      [4, 5],
      [5, 6],
      [6, 7],
      [8, 9],
      [9, 10],
      [10, 11],
      [11, 16],
      [12, 13],
      [13, 14],
      [14, 15],
      [15, 16],
    ],
    centerEdges: [0, 4, 8, 12],
  },
  // Two mirrored wings off the scroll emblem — siege defense down the left,
  // siege attack down the right — laced together by a middle band through the
  // rally helmets, with the passive hourglass on the spine above the HP node.
  enhanced1: {
    aspect: 0.672,
    center: { x: 50.1, y: 24.1 },
    points: [
      { x: 36.1, y: 9.5 },
      { x: 12.3, y: 4.7 },
      { x: 13.7, y: 20.9 },
      { x: 20.0, y: 35.9 },
      { x: 6.4, y: 47.8 },
      { x: 7.6, y: 64.3 },
      { x: 20.2, y: 79.1 },
      { x: 6.4, y: 91.1 },
      { x: 27.5, y: 95.3 },
      { x: 27.5, y: 57.0 },
      { x: 63.7, y: 9.5 },
      { x: 87.7, y: 4.7 },
      { x: 86.6, y: 20.9 },
      { x: 80.4, y: 35.9 },
      { x: 93.8, y: 47.8 },
      { x: 92.5, y: 64.3 },
      { x: 72.7, y: 57.0 },
      { x: 80.0, y: 79.1 },
      { x: 93.8, y: 91.1 },
      { x: 72.7, y: 95.3 },
      { x: 50.1, y: 91.1 },
      { x: 50.1, y: 58.6 },
      { x: 50.1, y: 42.5 },
      { x: 50.1, y: 75.0 },
    ],
    edges: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 6],
      [6, 7],
      [7, 8],
      [4, 9],
      [9, 21],
      [10, 11],
      [11, 12],
      [12, 13],
      [13, 14],
      [14, 15],
      [15, 17],
      [17, 18],
      [18, 19],
      [14, 16],
      [16, 21],
      [22, 21],
      [21, 23],
      [23, 20],
      [20, 8],
      [20, 19],
    ],
    centerEdges: [0, 10],
  },
};

// A research keeps one graph across all three towers; the game just presents it
// at a different orientation per troop. Cavalry is the reference capture, so the
// other two are expressed as a flip of it. Researches with no entry for a troop
// render the reference orientation until that troop is captured.
const SHAPE_ORIENTATION = {
  training1: { cavalry: 'identity', archer: 'rotate180', footman: 'mirrorX' },
  callofglory1: { cavalry: 'identity', archer: 'rotate180', footman: 'identity' },
};

const ORIENT = {
  identity: (p) => p,
  mirrorX: (p) => ({ x: 100 - p.x, y: p.y }),
  mirrorY: (p) => ({ x: p.x, y: 100 - p.y }),
  rotate180: (p) => ({ x: 100 - p.x, y: 100 - p.y }),
};

function orientShape(researchId, shape) {
  const name = SHAPE_ORIENTATION[researchId]?.[activeTroop] || 'identity';
  const move = ORIENT[name] || ORIENT.identity;
  if (move === ORIENT.identity) return shape;
  return { ...shape, points: shape.points.map(move), center: move(shape.center) };
}

function getRingShape(research, access) {
  const shape = RING_SHAPES[research.id];
  if (!shape || shape.points.length !== access.entries.length) return null;
  return orientShape(research.id, shape);
}

function renderShapedRing(research, access, shape) {
  const nodes = access.entries
    .map((entry, i) => nodeButton(research, entry, shape.points[i].x, shape.points[i].y, i + 1))
    .join('');
  const lines = shape.edges
    .map(([a, b]) => {
      const from = shape.points[a];
      const to = shape.points[b];
      return `<line x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" />`;
    })
    .concat(
      (shape.centerEdges || []).map((i) => {
        const from = shape.points[i];
        return `<line x1="${from.x}" y1="${from.y}" x2="${shape.center.x}" y2="${shape.center.y}" />`;
      })
    )
    .join('');
  const progress = getResearchProgress(state, activeTroop, research.id);
  const image = getSpecializationResearchImage(research.id, activeTroop);
  return `
    <div class="spec-ring spec-ring--shaped" role="group" aria-label="${escapeHtml(researchName(research))}" style="aspect-ratio:${shape.aspect}">
      <svg class="spec-ring-path" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${lines}</svg>
      <div class="spec-ring-center" style="left:${shape.center.x}%;top:${shape.center.y}%">
        <span class="spec-ring-emblem" aria-hidden="true">${image ? plannerSprite(image) : badgeIcon(research.name)}</span>
        <span class="spec-ring-pct">${pct(progress.percent)}%</span>
      </div>
      ${nodes}
    </div>`;
}

function renderRing(research, access) {
  const shape = getRingShape(research, access);
  if (shape) return renderShapedRing(research, access, shape);
  const entries = access.entries;
  const n = entries.length || 1;
  const nodes = entries
    .map((entry, i) => {
      const angle = (-90 + (360 / n) * i) * (Math.PI / 180);
      const x = 50 + 40 * Math.cos(angle);
      const y = 50 + 42 * Math.sin(angle);
      return nodeButton(research, entry, x, y);
    })
    .join('');
  const progress = getResearchProgress(state, activeTroop, research.id);
  const image = getSpecializationResearchImage(research.id, activeTroop);
  return `
    <div class="spec-ring" role="group" aria-label="${escapeHtml(researchName(research))}">
      <svg class="spec-ring-path" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <ellipse cx="50" cy="50" rx="40" ry="42" />
      </svg>
      <div class="spec-ring-center">
        <span class="spec-ring-emblem" aria-hidden="true">${image ? plannerSprite(image) : badgeIcon(research.name)}</span>
        <span class="spec-ring-pct">${pct(progress.percent)}%</span>
      </div>
      ${nodes}
    </div>`;
}

function renderTree(research, access) {
  const entries = access.entries;
  const nodeById = new Map(research.nodes.map((node) => [node.id, node]));
  const hasEdges = research.nodes.some(
    (node) => Array.isArray(node.prerequisiteNodeIds) && node.prerequisiteNodeIds.length
  );

  let tiers;
  if (hasEdges) {
    const depthCache = new Map();
    const depthOf = (id, seen = new Set()) => {
      if (depthCache.has(id)) return depthCache.get(id);
      const prereqs = nodeById.get(id)?.prerequisiteNodeIds;
      let d = 0;
      if (Array.isArray(prereqs) && prereqs.length && !seen.has(id)) {
        seen.add(id);
        d = 1 + Math.max(...prereqs.map((p) => depthOf(p, seen)));
      }
      depthCache.set(id, d);
      return d;
    };
    const byDepth = new Map();
    entries.forEach((entry) => {
      const d = depthOf(entry.nodeId);
      if (!byDepth.has(d)) byDepth.set(d, []);
      byDepth.get(d).push(entry);
    });
    tiers = [...byDepth.keys()].sort((a, b) => a - b).map((d) => byDepth.get(d));
  } else {
    tiers = [];
    for (let i = 0; i < entries.length; i += 3) tiers.push(entries.slice(i, i + 3));
  }

  const total = tiers.length;
  const pos = new Map();
  const nodesHtml = tiers
    .map((tier, t) => {
      const y = ((t + 0.6) / (total + 0.2)) * 100;
      return tier
        .map((entry, j) => {
          const x = ((j + 0.5) / tier.length) * 100;
          pos.set(entry.nodeId, { x, y });
          return nodeButton(research, entry, x, y);
        })
        .join('');
    })
    .join('');

  const lines = [];
  tiers.forEach((tier, t) => {
    if (t === 0) return;
    const above = tiers[t - 1];
    tier.forEach((entry) => {
      const to = pos.get(entry.nodeId);
      const prereqs = nodeById.get(entry.nodeId)?.prerequisiteNodeIds;
      let targets;
      if (Array.isArray(prereqs) && prereqs.length) {
        targets = prereqs.map((pid) => pos.get(pid)).filter(Boolean);
      } else {
        // No edge data: wire to the nearest node in the tier above.
        const nearest = above.reduce((best, e) => {
          const p = pos.get(e.nodeId);
          if (!p) return best;
          return !best || Math.abs(p.x - to.x) < Math.abs(best.x - to.x) ? p : best;
        }, null);
        targets = nearest ? [nearest] : [];
      }
      targets.forEach((from) => {
        lines.push(`<line x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" />`);
      });
    });
  });

  const progress = getResearchProgress(state, activeTroop, research.id);
  return `
    <div class="spec-ring spec-ring--tree" role="group" aria-label="${escapeHtml(researchName(research))}">
      <svg class="spec-ring-path" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${lines.join('')}</svg>
      ${nodesHtml}
      <span class="spec-tree-pct">${pct(progress.percent)}%</span>
    </div>`;
}

function renderNodeGraph(research, access) {
  // A transcribed shape always wins: it is the real in-game graph, so it beats
  // both the generic ellipse and the inferred tree fallback.
  const shape = getRingShape(research, access);
  if (shape) return renderShapedRing(research, access, shape);
  return isTreeLayout(research) ? renderTree(research, access) : renderRing(research, access);
}

function renderSelectedNode(research, access) {
  const entry = access.entries.find((candidate) => candidate.nodeId === selectedNodeId);
  if (!entry) return '';
  const node = resolveNode(research, entry);
  const nodeKey = contributionNodeKey(research.id, entry.nodeId);
  const contributionData = loadContributions();
  const saved = contributionData.nodes[nodeKey] || contributionData.nodes[entry.nodeId] || {};
  const knownMedals = saved.reviewedMedalCost ?? saved.medalCost ?? null;
  const learned = entry.state === 'learned';
  const canToggle = learned || entry.selectable;
  const maxLevel = entry.maxLevel ?? nodeUpgradeCount(node);
  const level = entry.level ?? (learned ? maxLevel : 0);
  const position = access.entries.findIndex((candidate) => candidate.nodeId === entry.nodeId) + 1;
  return `
    <section id="spec-node-inspector" class="spec-node-inspector" data-state="${entry.state}" aria-live="polite">
      <div class="spec-node-inspector-icon" data-kind="${nodeIconKind(node, research.passiveSkillNodeId === entry.nodeId)}" aria-hidden="true">${nodeIcon(node, research.passiveSkillNodeId === entry.nodeId)}</div>
      <div class="spec-node-inspector-copy">
        <span class="spec-node-inspector-kicker">${escapeHtml(sp('selectedLearning'))} · ${escapeHtml(sd('nodePosition', { current: position, total: access.entries.length }))}</span>
        <h4>${escapeHtml(nodeName(node.name))}${maxLevel > 1 ? ` <span class="spec-node-upgrade-tag">${level}/${maxLevel}</span>${upgradePips(maxLevel, level)}` : ''}</h4>
        <div class="spec-node-inspector-buff"><span>${escapeHtml(sp('nodeBuffLabel'))}</span><strong>${escapeHtml(effectText(node.effect) || sp('nodeBuffUnknown'))}</strong></div>
      </div>
      <fieldset class="spec-node-inspector-state">
        <legend>${escapeHtml(sd('learningStatus'))}</legend>
        <div class="spec-node-state-options">
          <button type="button" data-spec-set-selected-node="unlearned" aria-pressed="${!learned}">${escapeHtml(sp('nodeNotLearned'))}</button>
          <button type="button" data-spec-set-selected-node="learned" aria-pressed="${learned}" ${canToggle ? '' : 'disabled aria-disabled="true"'}>${escapeHtml(sp('nodeLearned'))}</button>
          ${maxLevel > 1 ? `<button type="button" class="spec-node-max" data-spec-max-node aria-label="${escapeHtml(`${sp('quickMax')}: ${nodeName(node.name)}`)}" ${learned ? 'disabled aria-disabled="true"' : ''}>${escapeHtml(sp('quickMax'))}</button>` : ''}
        </div>
      </fieldset>
      <div class="spec-node-medal-status${knownMedals === null ? ' is-unknown' : ''}">
        <span class="spec-node-info" aria-hidden="true">i</span>
        <p>${knownMedals === null ? escapeHtml(sp('nodeMedalHelp')) : `${escapeHtml(sp('communityMedalCost'))}: <strong>${fmt(knownMedals)}</strong>`}</p>
        ${knownMedals === null ? `<button type="button" class="spec-node-help" data-spec-help-node>${escapeHtml(sp('helpFillNodeMedals'))}</button>` : ''}
      </div>
    </section>`;
}

function renderMilestones(research) {
  const milestones = research.skillMilestones?.[activeTroop] || [];
  if (!milestones.length) return '';
  const progress = getResearchProgress(state, activeTroop, research.id);
  return `
    <section class="spec-detail-section">
      <h4>${escapeHtml(sp('milestones'))}</h4>
      <ol class="spec-milestones">
        ${milestones
          .map((m) => {
            const done = progress.completedNodes * 100 >= Number(m.percent) * progress.totalNodes;
            return `<li data-status="${done ? 'done' : 'todo'}"><span class="spec-milestone-pct">${m.percent}%</span><span class="spec-milestone-effect">${escapeHtml(effectText(m.effect))}</span><span aria-hidden="true">${done ? '✓' : '○'}</span></li>`;
          })
          .join('')}
      </ol>
    </section>`;
}

function renderDetail() {
  const research = SPECIALIZATION_RESEARCH[selectedResearchId];
  const progress = getResearchProgress(state, activeTroop, selectedResearchId);
  const access = getResearchNodeAccess(state, activeTroop, selectedResearchId);
  const column = SPECIALIZATION_COLUMNS[research.column];
  const recorded = progress.isComplete ? research.cost : progress.recordedMedals;
  const remaining =
    recorded === null || recorded === undefined ? null : Math.max(0, research.cost - recorded);
  return `
    <div class="spec-detail">
      <header class="spec-detail-bar">
        <button type="button" class="spec-back" data-spec-back aria-label="${escapeHtml(sp('back'))}">‹</button>
        <div class="spec-detail-title">
          <h3>${escapeHtml(researchName(research))}</h3>
          <span>${escapeHtml(columnLabel(column.id))} · ${escapeHtml(seasonLabel(column.unlockSeason))} · ${escapeHtml(sp('nodeLevel', { current: progress.completedNodes, maximum: progress.totalNodes }))}</span>
        </div>
      </header>
      <div class="spec-node-guide"><strong>${escapeHtml(sd('chooseNodeTitle'))}</strong><span>${escapeHtml(sd('chooseNodeHint'))}</span></div>
      ${renderNodeGraph(research, access)}
      ${renderSelectedNode(research, access)}
      <section class="spec-detail-section spec-medal-field">
        <label for="spec-medals-input">${escapeHtml(sp('medalsRecorded'))}</label>
        <input id="spec-medals-input" type="number" min="0" max="${research.cost}" step="1" value="${recorded ?? ''}" placeholder="${escapeHtml(sp('medalsUnknown'))}" data-spec-medals ${progress.isComplete ? 'disabled' : ''} />
        ${
          easyMedalMode && !progress.isComplete
            ? `<div class="spec-medal-quickfill" role="group" aria-label="${escapeHtml(sp('easyMedalsLabel'))}">
                ${[25, 50, 75, 100].map((share) => `<button type="button" data-spec-medal-fill="${share}" data-spec-research-id="${research.id}">${share}%</button>`).join('')}
                <button type="button" data-spec-medal-fill="0" data-spec-research-id="${research.id}">${escapeHtml(sp('easyMedalsClear'))}</button>
              </div>`
            : ''
        }
        <div class="spec-cost-table">
          <div class="spec-cost-row"><span>${escapeHtml(sp('medalsRequired'))}</span><strong>${fmt(research.cost)}</strong></div>
          <div class="spec-cost-row"><span>${escapeHtml(sp('medalsRemaining'))}</span><strong>${remaining === null ? escapeHtml(sp('medalsUnknown')) : fmt(remaining)}</strong></div>
        </div>
      </section>
      ${renderMilestones(research)}
      <div class="spec-detail-actions">
        <button type="button" class="spec-btn spec-btn--primary" data-spec-complete>${escapeHtml(sp('completeLearning'))}</button>
        <button type="button" class="spec-btn" data-spec-reset>${escapeHtml(sp('resetLearning'))} (${progress.completedNodes}/${progress.totalNodes})</button>
      </div>
    </div>`;
}

/* ---------- Root render ---------- */

function render() {
  if (!root) return;
  // render() replaces the whole subtree, which would otherwise collapse any contribution
  // column the reader had expanded. Carry the open ones across.
  const openColumns = new Set(
    Array.from(root.querySelectorAll('.spec-contrib-column[open]'), (element) =>
      element.querySelector('summary')?.textContent?.trim()
    ).filter(Boolean)
  );
  const summary = getSpecializationSummary(state);
  root.dir = getSpecializationTowersV2Direction(locale());
  root.innerHTML = `
    <div class="spec-tool" data-view="${view}">
      ${renderSummary(summary)}
      ${view === 'detail' && selectedResearchId ? renderDetail() : renderOverview(summary)}
    </div>`;
  if (openColumns.size) {
    root.querySelectorAll('.spec-contrib-column').forEach((element) => {
      const label = element.querySelector('summary')?.textContent?.trim();
      if (label && openColumns.has(label)) element.open = true;
    });
  }
}

/* ---------- Events ---------- */

function openDetail(researchId) {
  selectedResearchId = researchId;
  const access = getResearchNodeAccess(state, activeTroop, researchId);
  selectedNodeId = access.entries.find((entry) => entry.state !== 'hidden')?.nodeId ?? null;
  view = 'detail';
  render();
  root?.querySelector('.spec-back')?.focus({ preventScroll: true });
}

function backToOverview() {
  view = 'overview';
  render();
}

function focusContributionNode(researchId, nodeId) {
  const nodeKey = contributionNodeKey(researchId, nodeId);
  view = 'overview';
  render();
  const row = root?.querySelector(`[data-contribution-key="${nodeKey}"]`);
  if (!row) return;
  const column = row.closest('details');
  if (column) column.open = true;
  row.scrollIntoView({
    behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    block: 'center',
  });
  row.querySelector('[data-spec-node-medal]')?.focus({ preventScroll: true });
}

function refreshNodeSelection() {
  if (!root || !selectedResearchId) return;
  root.querySelectorAll('[data-spec-node]').forEach((button) => {
    const isSelected = Number(button.dataset.specNode) === selectedNodeId;
    button.dataset.selected = String(isSelected);
    if (isSelected) button.setAttribute('aria-current', 'true');
    else button.removeAttribute('aria-current');
  });
  const research = SPECIALIZATION_RESEARCH[selectedResearchId];
  const access = getResearchNodeAccess(state, activeTroop, selectedResearchId);
  const inspector = root.querySelector('#spec-node-inspector');
  if (inspector && research) inspector.outerHTML = renderSelectedNode(research, access);
  root.querySelector(`[data-spec-node="${selectedNodeId}"]`)?.focus({ preventScroll: true });
}

function onKeyDown(event) {
  if (!event.target.closest?.('[data-spec-node]')) return;
  const back = event.key === 'ArrowLeft' || event.key === 'ArrowUp';
  const forward = event.key === 'ArrowRight' || event.key === 'ArrowDown';
  if (!back && !forward) return;
  if (moveSelectionAlongPath(forward ? 1 : -1)) event.preventDefault();
}

// Toggling from the graph keeps the node selected, so a second click undoes the
// first without the pointer ever leaving the node.
function toggleSelectedNode(nodeId) {
  const access = getResearchNodeAccess(state, activeTroop, selectedResearchId);
  const entry = access.entries.find((candidate) => candidate.nodeId === nodeId);
  if (!entry || (entry.state !== 'learned' && !entry.selectable)) return;
  state = toggleResearchNode(state, activeTroop, selectedResearchId, nodeId);
  persist();
  render();
  root?.querySelector(`[data-spec-node="${nodeId}"]`)?.focus({ preventScroll: true });
}

// "I am here on the path": everything up to and including this node is learned,
// everything after it is not. One gesture instead of clicking a dozen nodes.
function setProgressThroughNode(nodeId) {
  const access = getResearchNodeAccess(state, activeTroop, selectedResearchId);
  const index = access.entries.findIndex((entry) => entry.nodeId === nodeId);
  if (index < 0) return;
  const ids = access.entries.slice(0, index + 1).map((entry) => entry.nodeId);
  state = setResearchNodes(state, activeTroop, selectedResearchId, ids);
  selectedNodeId = nodeId;
  persist();
  render();
  root?.querySelector(`[data-spec-node="${nodeId}"]`)?.focus({ preventScroll: true });
}

// Arrow keys walk the learning order rather than the DOM, so the graph is usable
// without a pointer whatever shape it is drawn in.
function moveSelectionAlongPath(step) {
  if (!selectedResearchId) return false;
  const access = getResearchNodeAccess(state, activeTroop, selectedResearchId);
  const entries = access.entries.filter((entry) => entry.state !== 'hidden');
  if (!entries.length) return false;
  const current = entries.findIndex((entry) => entry.nodeId === selectedNodeId);
  const next = current < 0 ? 0 : (current + step + entries.length) % entries.length;
  selectedNodeId = entries[next].nodeId;
  refreshNodeSelection();
  return true;
}

function completeResearch(researchId) {
  const research = SPECIALIZATION_RESEARCH[researchId];
  if (!research) return;
  // Every upgrade, not every node: a base-attribute node is listed twice.
  const allNodes = [];
  research.nodes.forEach((node) => {
    for (let index = 0; index < nodeUpgradeCount(node); index += 1) allNodes.push(node.id);
  });
  if (research.passiveSkillNodeId !== null && research.passiveSkillNodeId !== undefined) {
    allNodes.push(research.passiveSkillNodeId);
  }
  state = setResearchNodes(state, activeTroop, researchId, allNodes);
  persist();
}

function onClick(event) {
  if (event.target.closest('[data-spec-easy-medals]')) {
    easyMedalMode = !easyMedalMode;
    safeSet(EASY_MEDALS_KEY, easyMedalMode ? '1' : '');
    render();
    return;
  }
  if (event.target.closest('[data-spec-auto-path]')) {
    recomputeHeroPlans();
    return;
  }
  if (event.target.closest('[data-spec-plan-go-heroes]')) {
    if (typeof window.vtsSwitchTab === 'function') {
      window.vtsSwitchTab('heroes', false, { scrollToSection: true });
    }
    return;
  }
  const planTroop = event.target.closest('[data-spec-plan-troop]');
  if (planTroop) {
    const troop = planTroop.dataset.specPlanTroop;
    if (UI_TROOPS.includes(troop)) {
      activeTroop = troop;
      selectedLegionColumnId = null;
      render();
    }
    return;
  }
  const medalFill = event.target.closest('[data-spec-medal-fill]');
  if (medalFill) {
    // The model drops medalsSpent unless nodes are selected, so a quick fill sets the
    // node count and the medals together: "I am roughly N% through this".
    const researchId = medalFill.dataset.specResearchId;
    const research = SPECIALIZATION_RESEARCH[researchId];
    const share = Number(medalFill.dataset.specMedalFill);
    const ids = research.nodes.map((node) => node.id);
    const count = share === 0 ? 0 : Math.ceil((share / 100) * ids.length);
    state = setResearchNodes(state, activeTroop, researchId, ids.slice(0, count));
    const medals = share === 0 ? null : Math.round((Number(research.cost) || 0) * (share / 100));
    try {
      state = setResearchMedalsSpent(state, activeTroop, researchId, medals);
    } catch {
      // A rejected medal value still leaves the node selection applied.
    }
    persist();
    render();
    return;
  }
  const troopBtn = event.target.closest('[data-spec-troop]');
  if (troopBtn) {
    activeTroop = troopBtn.dataset.specTroop;
    selectedLegionColumnId = null;
    render();
    return;
  }
  const badge = event.target.closest('[data-spec-research]');
  if (badge) {
    openDetail(badge.dataset.specResearch);
    return;
  }
  if (event.target.closest('[data-spec-back]')) {
    backToOverview();
    return;
  }
  const quickSet = event.target.closest('[data-spec-quick-set]');
  if (quickSet) {
    const researchId = quickSet.dataset.specResearchId;
    if (quickSet.dataset.specQuickSet === 'reset') {
      state = resetResearch(state, activeTroop, researchId);
      selectedLegionColumnId = null;
      persist();
    } else {
      completeResearch(researchId);
    }
    render();
    return;
  }
  const legion = event.target.closest('[data-spec-legion]');
  if (legion && !legion.disabled) {
    const columnId = Number(legion.dataset.specLegion);
    selectedLegionColumnId = selectedLegionColumnId === columnId ? null : columnId;
    render();
    (selectedLegionColumnId
      ? root?.querySelector('#spec-legion-inspector')
      : root?.querySelector(`[data-spec-legion="${columnId}"]`)
    )?.focus({ preventScroll: true });
    return;
  }
  if (event.target.closest('[data-spec-close-legion]')) {
    const columnId = selectedLegionColumnId;
    selectedLegionColumnId = null;
    render();
    root?.querySelector(`[data-spec-legion="${columnId}"]`)?.focus({ preventScroll: true });
    return;
  }
  const nodeBtn = event.target.closest('[data-spec-node]');
  if (nodeBtn && !nodeBtn.disabled && selectedResearchId) {
    const nodeId = Number(nodeBtn.dataset.specNode);
    // Three gestures on one control, cheapest to most powerful:
    //   shift/ctrl-click  -> set the whole path's progress to this node
    //   click the node you already have selected -> step its upgrades
    //   click any other node -> select it
    if (event.shiftKey || event.ctrlKey || event.metaKey) {
      setProgressThroughNode(nodeId);
      return;
    }
    if (nodeId === selectedNodeId) {
      toggleSelectedNode(nodeId);
      return;
    }
    selectedNodeId = nodeId;
    // Selecting must not rebuild the tab. A full render replaces every node
    // button and resizes the inspector underneath, which moves the graph out
    // from under the pointer — that is what made a second click land on
    // nothing. Patch the selection in place instead.
    refreshNodeSelection();
    return;
  }
  if (event.target.closest('[data-spec-max-node]') && selectedResearchId) {
    state = maxResearchNode(state, activeTroop, selectedResearchId, selectedNodeId);
    persist();
    render();
    return;
  }
  const nodeState = event.target.closest('[data-spec-set-selected-node]');
  if (nodeState && selectedResearchId) {
    const access = getResearchNodeAccess(state, activeTroop, selectedResearchId);
    const learned =
      access.entries.find((entry) => entry.nodeId === selectedNodeId)?.state === 'learned';
    // "Learned" on a two-upgrade node means fully upgraded, so buy the rest.
    if (!learned && nodeState.dataset.specSetSelectedNode === 'learned') {
      state = maxResearchNode(state, activeTroop, selectedResearchId, selectedNodeId);
      persist();
      render();
      root
        ?.querySelector('[data-spec-set-selected-node="learned"]')
        ?.focus({ preventScroll: true });
      return;
    }
    const wantsLearned = nodeState.dataset.specSetSelectedNode === 'learned';
    if (learned !== wantsLearned) {
      state = toggleResearchNode(state, activeTroop, selectedResearchId, selectedNodeId);
      persist();
      render();
    }
    root
      ?.querySelector(`[data-spec-set-selected-node="${wantsLearned ? 'learned' : 'unlearned'}"]`)
      ?.focus({ preventScroll: true });
    return;
  }
  if (event.target.closest('[data-spec-help-node]') && selectedResearchId) {
    focusContributionNode(selectedResearchId, selectedNodeId);
    return;
  }
  if (event.target.closest('[data-spec-complete]') && selectedResearchId) {
    completeResearch(selectedResearchId);
    render();
    return;
  }
  if (event.target.closest('[data-spec-reset]') && selectedResearchId) {
    state = resetResearch(state, activeTroop, selectedResearchId);
    persist();
    render();
  }
}

function onChange(event) {
  const planModeSelect = event.target.closest('[data-spec-plan-mode]');
  if (planModeSelect) {
    heroPlanMode = HERO_PLAN_MODES.includes(planModeSelect.value)
      ? planModeSelect.value
      : 'balanced';
    safeSet(HERO_PLAN_MODE_KEY, heroPlanMode);
    if (heroPlans) {
      heroPlans = buildHeroPlans({ heroes: heroPlanRoster, mode: heroPlanMode });
      saveHeroPlan();
      render();
    }
    return;
  }
  const routeSelect = event.target.closest('[data-spec-route-select]');
  if (routeSelect) {
    activeRoute = SPECIALIZATION_ROUTE_IDS.includes(routeSelect.value) ? routeSelect.value : '';
    safeSet(ROUTE_KEY, activeRoute);
    render();
    return;
  }
  const medals = event.target.closest('[data-spec-medals]');
  if (medals && selectedResearchId) {
    const raw = medals.value.trim();
    const value = raw === '' ? null : Math.max(0, Number(raw) || 0);
    state = setResearchMedalsSpent(state, activeTroop, selectedResearchId, value);
    persist();
    render();
    return;
  }
  const medalInput = event.target.closest('[data-spec-node-medal]');
  if (medalInput) {
    const identity = getContributorIdentity();
    // Where accounts exist, only a signed-in one may submit. The input is also disabled
    // in that state, so this is the belt to that braces.
    if (!identity) {
      medalInput.value = '';
      return;
    }
    const nodeId = medalInput.dataset.specNodeMedal;
    const raw = medalInput.value.trim();
    const data = loadContributions();
    const record = contributionRecord(data, nodeId);
    record.medalCost = raw === '' ? null : Math.max(0, Number(raw) || 0);
    record.contributor = record.medalCost === null ? '' : identity.label;
    record.contributorUid = record.medalCost === null ? '' : identity.uid;
    saveContributions(data);
    const countEl = root?.querySelector('.spec-contrib-count');
    if (countEl) {
      const allData = loadContributions();
      countEl.textContent = sp('communityNodesWithData', {
        count: contributionCount(allData),
      });
    }
    return;
  }
  const reviewerInput = event.target.closest('[data-spec-node-reviewer]');
  if (reviewerInput) {
    const nodeId = reviewerInput.dataset.specNodeReviewer;
    const data = loadContributions();
    contributionRecord(data, nodeId).reviewer = reviewerInput.value.trim();
    saveContributions(data);
    return;
  }
  const reviewedMedalInput = event.target.closest('[data-spec-node-reviewed-medal]');
  if (reviewedMedalInput) {
    const nodeId = reviewedMedalInput.dataset.specNodeReviewedMedal;
    const raw = reviewedMedalInput.value.trim();
    const data = loadContributions();
    contributionRecord(data, nodeId).reviewedMedalCost =
      raw === '' ? null : Math.max(0, Number(raw) || 0);
    saveContributions(data);
    const countEl = root?.querySelector('.spec-contrib-count');
    if (countEl) {
      countEl.textContent = sp('communityNodesWithData', { count: contributionCount(data) });
    }
  }
}

export function initSpecializationTool() {
  root = document.getElementById('specializationToolRoot');
  if (!root) return;
  state = loadSpecializationState();
  view = 'overview';
  const storedRoute = safeGet(ROUTE_KEY, '');
  activeRoute = SPECIALIZATION_ROUTE_IDS.includes(storedRoute) ? storedRoute : '';
  easyMedalMode = safeGet(EASY_MEDALS_KEY, '') === '1';
  heroPlanMode = HERO_PLAN_MODES.includes(safeGet(HERO_PLAN_MODE_KEY, 'balanced'))
    ? safeGet(HERO_PLAN_MODE_KEY, 'balanced')
    : 'balanced';
  loadStoredHeroPlan();
  selectedResearchId = SPECIALIZATION_COLUMNS[1].researches[0];
  if (!wired) {
    root.addEventListener('click', onClick);
    root.addEventListener('change', onChange);
    root.addEventListener('keydown', onKeyDown);
    window.addEventListener('vts:language-change', () => render());
    // Signing in or out changes whether the contribution fields accept input. Firebase
    // also fires this once on boot with the state we already render, so only re-render
    // when the identity actually changed - a needless rebuild discards UI state.
    try {
      let lastIdentityKey = getContributorIdentity()?.uid || '';
      onUserChanged?.(() => {
        const nextKey = getContributorIdentity()?.uid || '';
        if (nextKey === lastIdentityKey) return;
        lastIdentityKey = nextKey;
        render();
      });
    } catch {
      // Firebase may be unconfigured; the panel then stays in its signed-out state.
    }
    wired = true;
  }
  render();
  root.closest('#specializationSection')?.querySelector('.specialization-loading')?.remove();
}
