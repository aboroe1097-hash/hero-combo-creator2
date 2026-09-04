import {
  SPECIALIZATION_COLUMNS,
  SPECIALIZATION_CONTRIBUTION_SHEET_URL,
  SPECIALIZATION_CONTRIBUTION_TEMPLATE_VERSION,
  SPECIALIZATION_DATA_REVISION,
  SPECIALIZATION_LEGION_SKILLS,
  SPECIALIZATION_RESEARCH,
  SPECIALIZATION_SOURCE_METADATA,
  getSpecializationLegionSkillImage,
  getSpecializationResearchImage,
} from './specialization-towers-v2-data.js';
import {
  createEmptySpecializationState,
  getColumnProgress,
  getResearchNodeAccess,
  getResearchProgress,
  getResearchSelection,
  getSpecializationSummary,
  resetResearch,
  setResearchMedalsSpent,
  setResearchNodes,
  toggleResearchNode,
} from './specialization-towers-v2-model.js';
import {
  buildStatContributionSnapshot,
  summarizeStatContributions,
} from './specialization-towers-v2-contributions.js';
import {
  exportSpecializationJson,
  importSpecializationJson,
  loadSpecializationState,
  saveSpecializationState,
} from './specialization-towers-v2-store.js';
import {
  SPECIALIZATION_ROUTE_IDS,
  getNextRouteResearch,
  getRouteStep,
} from './specialization-routes.js';
import {
  bindSpecializationTowersV2LanguageChange,
  getSpecializationTowersV2Direction,
  loadSpecializationTowersV2Locale,
  resolveSpecializationTowersV2Locale,
  specializationTowersV2Text,
} from './i18n/specialization-towers-v2/index.js';

export const APP_VERSION = '16.0.1';
export const SPECIALIZATION_COLUMN_COUNT = 8;
export const SPECIALIZATION_RESEARCHES_PER_COLUMN = 4;
export const SPECIALIZATION_MILESTONE_PERCENTAGES = [25, 50, 75, 100];
export const SPECIALIZATION_COLUMN_SKILL_REQUIREMENTS = Object.freeze({
  requiresMedals: false,
  medalCost: 0,
  rule: 'Unlocks after all four researches reach 100%; no medals are required.',
});

const UI_TROOPS = Object.freeze(['cavalry', 'archer', 'footman']);
const COLUMN_IDS = Object.freeze(
  Object.keys(SPECIALIZATION_COLUMNS)
    .map(Number)
    .sort((left, right) => left - right)
);
const RESEARCH_IDS = Object.freeze(
  Object.values(SPECIALIZATION_RESEARCH)
    .slice()
    .sort(
      (left, right) =>
        Number(left.column) - Number(right.column) ||
        Number(left.sequence) - Number(right.sequence) ||
        String(left.id).localeCompare(String(right.id))
    )
    .map((research) => research.id)
);
const LANGUAGE_OPTIONS = Object.freeze([
  ['en', 'English'],
  ['ar', 'العربية'],
  ['de', 'Deutsch'],
  ['es', 'Español'],
  ['fr', 'Français'],
  ['id', 'Indonesia'],
  ['it', 'Italiano'],
  ['kr', '한국어'],
  ['pt', 'Português'],
  ['ru', 'Русский'],
  ['tr', 'Türkçe'],
  ['zh', '中文'],
]);
const THEME_KEY = 'vts_theme';
const LANGUAGE_KEY = 'vts_hero_lang';
const ACTIVE_TOWER_KEY = 'vts_specialization_towers_v2_active_tower';
const ROUTE_KEY = 'vts_specialization_towers_v2_route';
const EASY_MEDALS_KEY = 'vts_specialization_towers_v2_easy_medals';
const MOBILE_INSPECTOR_QUERY = '(max-width: 900px)';
const MAX_HISTORY = 60;
const TROOP_ICONS = Object.freeze({ cavalry: '♞', archer: '⌁', footman: '⬟' });
let root = null;
let state = null;
let activeTroop = 'archer';
let selectedItem = { kind: 'research', researchId: 'training1', columnId: 1 };
let locale = 'en';
let undoStack = [];
let redoStack = [];
let inspectorOpener = null;
let nodePathRestoreMode = 'desktop';
let inspectorCollapsed = false;
let toastTimer = 0;
let graphScrollFrame = 0;
let graphScrollTarget = null;
let currentGraphColumn = 1;
// '' means no suggested route is being followed.
let activeRoute = '';
// Easy medal fill lifts the "pick a node first" gate so medals can be typed straight in.
let easyMedalMode = false;
let unbindLanguageChange = () => {};

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll('`', '&#96;');
}

function plannerSprite(asset, className) {
  if (!asset) return '';
  const viewBox = `${asset.column * 120} ${288 + asset.row * 129} 120 129`;
  return `<svg class="${className} specialization-planner-sprite" viewBox="${viewBox}" focusable="false"><image href="${escapeAttribute(asset.src)}" width="960" height="933"></image></svg>`;
}

function t(key, variables = {}) {
  return specializationTowersV2Text(key, variables, locale);
}

function applyLocaleToDocument(nextLocale) {
  document.documentElement.lang = nextLocale === 'kr' ? 'ko' : nextLocale;
  document.documentElement.dir = getSpecializationTowersV2Direction(nextLocale);
  document.title = `${t('title')} | VTS 1097`;
  const skipLink = document.querySelector('.specialization-skip-link');
  if (skipLink) skipLink.textContent = t('skipToContent');
}

function formatNumber(value) {
  return new Intl.NumberFormat(locale === 'kr' ? 'ko' : locale).format(Number(value) || 0);
}

function roundedPercent(value) {
  return Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
}

function renderCircularProgress(className, value) {
  const percent = roundedPercent(value);
  return `<svg class="${className}" viewBox="0 0 32 32" aria-hidden="true" focusable="false"><circle class="specialization-circular-progress-track" cx="16" cy="16" r="13" pathLength="100"></circle><circle class="specialization-circular-progress-value" cx="16" cy="16" r="13" pathLength="100" stroke-dasharray="${percent} ${100 - percent}"></circle></svg>`;
}

function troopLabel(troopId) {
  return t(
    troopId === 'cavalry' ? 'towerCavalry' : troopId === 'archer' ? 'towerArchers' : 'towerFootmen'
  );
}

function seasonLabel(value) {
  return value === 'SX1' ? t('seasonSX1') : t('seasonS3');
}

function researchDisplayName(research, troopId) {
  if (/^Training\b/u.test(research.name)) return `${troopLabel(troopId)} ${research.name}`;
  return research.name;
}

function selectableNodeIds(research) {
  const ids = research.nodes.map((node) => node.id);
  if (research.passiveSkillNodeId !== null && research.passiveSkillNodeId !== undefined) {
    ids.push(research.passiveSkillNodeId);
  }
  return ids;
}

function statusForProgress(progress) {
  if (progress.isComplete) return 'complete';
  if (progress.completedNodes > 0) return 'in-progress';
  return 'unstarted';
}

function statusLabel(progress) {
  if (progress.isComplete) return t('statusComplete');
  if (progress.completedNodes > 0) return t('statusInProgress');
  return t('statusNotStarted');
}

function nodeAccessStatusLabel(access) {
  if (access.state === 'learned') return t('statusComplete');
  if (access.state === 'available') return t('statusAvailable');
  if (access.state === 'hidden') return t('statusHidden');
  return t('statusLocked');
}

export function isColumnSkillUnlocked(progress) {
  return Boolean(
    progress?.researches?.length === SPECIALIZATION_RESEARCHES_PER_COLUMN &&
    progress.researches.every((research) => research.isComplete)
  );
}

function safeStorageGet(key, fallback = '') {
  try {
    return globalThis.localStorage?.getItem(key) || fallback;
  } catch {
    return fallback;
  }
}

function safeStorageSet(key, value) {
  try {
    globalThis.localStorage?.setItem(key, value);
  } catch {
    // The tool remains usable when storage is unavailable.
  }
}

function effectiveTheme(preference) {
  if (preference === 'light' || preference === 'dark') return preference;
  return globalThis.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function applyTheme(preference = safeStorageGet(THEME_KEY, 'dark')) {
  const normalized = ['light', 'dark', 'system'].includes(preference) ? preference : 'dark';
  document.documentElement.dataset.theme = effectiveTheme(normalized);
  safeStorageSet(THEME_KEY, normalized);
  return normalized;
}

function currentThemePreference() {
  return safeStorageGet(THEME_KEY, document.documentElement.dataset.theme || 'dark');
}

function iconSvg(name) {
  const paths = {
    export: '<path d="M12 3v12m0-12 4 4m-4-4L8 7M5 12v7h14v-7"/>',
    import: '<path d="M12 15V3m0 12 4-4m-4 4-4-4M5 12v7h14v-7"/>',
    undo: '<path d="M9 7 4 12l5 5M5 12h8a6 6 0 1 1 0 12"/>',
    redo: '<path d="m15 7 5 5-5 5m4-5h-8a6 6 0 1 0 0 12"/>',
    breakdown: '<path d="M4 19V9m5 10V5m5 14v-7m5 7V3"/>',
    reset: '<path d="M4 4v6h6M5.5 15a7 7 0 1 0 .8-8"/>',
    theme: '<path d="M12 3a9 9 0 1 0 9 9 7 7 0 0 1-9-9Z"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
  };
  return `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor">${paths[name] || ''}</svg>`;
}

function renderHeader() {
  const theme = currentThemePreference();
  const light = effectiveTheme(theme) === 'light';
  return `
    <header class="specialization-header">
      <div class="specialization-header-start specialization-header__brand">
        <a class="specialization-brand" href="index.html#research" aria-label="${escapeAttribute(t('back'))}">
          <span class="specialization-brand-mark" aria-hidden="true">RO</span>
        </a>
        <nav class="specialization-breadcrumbs" aria-label="${escapeAttribute(t('towerNavigation'))}">
          <a href="index.html">R.O.C. VTS</a>
          <span class="specialization-breadcrumb-separator" aria-hidden="true">›</span>
          <a href="index.html#research">${escapeHtml(t('towerNavigation'))}</a>
          <span class="specialization-breadcrumb-separator" aria-hidden="true">›</span>
          <span aria-current="page">${escapeHtml(t('title'))}</span>
        </nav>
      </div>
      <div class="specialization-header-end specialization-header__actions">
        <div class="specialization-toolbar" aria-label="${escapeAttribute(t('towerNavigation'))}">
          <div class="specialization-toolbar-group">
            <button type="button" data-specialization-action="undo" ${undoStack.length ? '' : 'disabled'} aria-label="${escapeAttribute(t('undo'))}">${iconSvg('undo')}<span>${escapeHtml(t('undo'))}</span></button>
            <button type="button" data-specialization-action="redo" ${redoStack.length ? '' : 'disabled'} aria-label="${escapeAttribute(t('redo'))}">${iconSvg('redo')}<span>${escapeHtml(t('redo'))}</span></button>
          </div>
          <div class="specialization-toolbar-group">
            <button type="button" data-specialization-action="export">${iconSvg('export')}<span>${escapeHtml(t('exportProgress'))}</span></button>
            <button type="button" data-specialization-action="import">${iconSvg('import')}<span>${escapeHtml(t('importProgress'))}</span></button>
            <button type="button" data-specialization-action="reset">${iconSvg('reset')}<span>${escapeHtml(t('resetAll'))}</span></button>
            <button type="button" data-specialization-action="breakdown">${iconSvg('breakdown')}<span>${escapeHtml(t('breakdown'))}</span></button>
          </div>
          <button type="button" class="specialization-easy-medals-toggle" data-specialization-action="easy-medals" aria-pressed="${easyMedalMode}">${escapeHtml(t('easyMedalsLabel'))}</button>
          <label class="specialization-route-control">
            <span class="specialization-route-control-label">${escapeHtml(t('routeLabel'))}</span>
            <select class="specialization-route-select" data-specialization-route-select aria-label="${escapeAttribute(t('routeLabel'))}">
              <option value="" ${activeRoute === '' ? 'selected' : ''}>${escapeHtml(t('routeNone'))}</option>
              ${SPECIALIZATION_ROUTE_IDS.map((routeId) => `<option value="${routeId}" ${activeRoute === routeId ? 'selected' : ''}>${escapeHtml(t(routeId === 'spender' ? 'routeSpender' : 'routeF2p'))}</option>`).join('')}
            </select>
          </label>
          <button type="button" data-specialization-theme-toggle aria-label="${escapeAttribute(t('themeLabel'))}" aria-pressed="${light}">${iconSvg('theme')}<span class="specialization-sr-only">${escapeHtml(t('themeLabel'))}</span></button>
          <label class="specialization-language-control">
            <span class="specialization-sr-only">${escapeHtml(t('languageLabel'))}</span>
            <select class="specialization-language-select" data-specialization-language-select aria-label="${escapeAttribute(t('languageLabel'))}">
              ${LANGUAGE_OPTIONS.map(([value, label]) => `<option value="${value}" ${value === locale ? 'selected' : ''}>${escapeHtml(label)}</option>`).join('')}
            </select>
          </label>
        </div>
      </div>
    </header>`;
}

function countUnlockedMilestones() {
  let count = 0;
  for (const troopId of UI_TROOPS) {
    for (const researchId of RESEARCH_IDS) {
      count += getResearchProgress(state, troopId, researchId).unlockedMilestones.length;
    }
  }
  return count;
}

function renderSummary(summary) {
  const overall = summary.overall;
  const percent = roundedPercent(overall.percent);
  const medalText = overall.medals.isExact
    ? `${formatNumber(overall.medals.exactSpent)} / ${formatNumber(overall.medals.totalCost)}`
    : `${formatNumber(overall.medals.knownSpent)}+ / ${formatNumber(overall.medals.totalCost)}`;
  return `
    <section class="specialization-summary" aria-label="${escapeAttribute(t('overallProgress'))}">
      <div class="specialization-summary-item">
        <span class="specialization-summary-label">${escapeHtml(t('overallProgress'))}</span>
        <div class="specialization-summary-progress">
          <strong class="specialization-summary-value">${percent}%</strong>
          ${renderCircularProgress('specialization-progress-ring', percent)}
        </div>
      </div>
      <div class="specialization-summary-item">
        <span class="specialization-summary-label">${escapeHtml(t('fundedResearches'))}</span>
        <span class="specialization-summary-value"><strong>${overall.completedResearchCount}</strong> / ${overall.totalResearchCount}</span>
      </div>
      <div class="specialization-summary-item">
        <span class="specialization-summary-label">${escapeHtml(t('milestones'))}</span>
        <span class="specialization-summary-value"><strong>${countUnlockedMilestones()}</strong> / 384</span>
      </div>
      <div class="specialization-summary-item">
        <span class="specialization-summary-label">${escapeHtml(t('legionSkills'))}</span>
        <span class="specialization-summary-value"><strong>${overall.completedColumnCount}</strong> / ${overall.totalColumnCount}</span>
      </div>
      <div class="specialization-summary-item">
        <span class="specialization-summary-label">${escapeHtml(t('medalProgress'))}</span>
        <span class="specialization-summary-value specialization-summary-value--medals" data-summary="medals">${medalText}</span>
      </div>
    </section>`;
}

function renderTowerTabs(summary) {
  return `
    <div class="specialization-tower-tabs" data-specialization-tower-tabs role="tablist" aria-label="${escapeAttribute(t('towerNavigation'))}">
      ${UI_TROOPS.map((troopId) => {
        const selected = troopId === activeTroop;
        const progress = roundedPercent(summary.troops[troopId].percent);
        return `<button type="button" class="specialization-tower-tab" data-specialization-tower="${troopId}" role="tab" aria-selected="${selected}" aria-controls="specialization-tower-panel" tabindex="${selected ? '0' : '-1'}" aria-label="${escapeAttribute(t('selectTower', { tower: troopLabel(troopId) }))}">
          <span class="specialization-tower-tab-icon" aria-hidden="true">${TROOP_ICONS[troopId]}</span>
          <span class="specialization-tower-tab-copy"><span class="specialization-tower-tab-name">${escapeHtml(troopLabel(troopId))}</span><span class="specialization-tower-tab-progress">${escapeHtml(t('progressCompleted', { completed: progress }))}</span></span>
          <span aria-hidden="true">${progress}%</span>
        </button>`;
      }).join('')}
    </div>`;
}

function columnPositionText(columnId) {
  return `${t('currentTowerProgress')} \u00b7 ${t('progressOf', {
    completed: formatNumber(columnId),
    total: formatNumber(SPECIALIZATION_COLUMN_COUNT),
  })}`;
}

function renderColumnPositionPill(columnId = currentGraphColumn) {
  const current = Math.max(1, Math.min(SPECIALIZATION_COLUMN_COUNT, Number(columnId) || 1));
  return `<div class="specialization-column-position" data-specialization-column-position role="status" aria-live="polite" aria-atomic="true" data-current-column="${current}">
    <span data-specialization-column-position-label>${escapeHtml(columnPositionText(current))}</span>
    <span class="specialization-column-position-dots" aria-hidden="true">${COLUMN_IDS.map((columnId) => `<span class="specialization-column-position-dot" data-specialization-column-dot="${columnId}" data-current="${columnId === current}"></span>`).join('')}</span>
  </div>`;
}

// A research counts as done for routing purposes once every node in it is complete.
function isResearchCompleteForRoute(researchId) {
  const progress = getResearchProgress(state, activeTroop, researchId);
  return progress.completedNodes >= progress.totalNodes;
}

function getRouteNextResearchId() {
  if (!activeRoute) return null;
  return getNextRouteResearch(activeRoute, isResearchCompleteForRoute, activeTroop);
}

function renderResearchButton(researchId, columnId) {
  const research = SPECIALIZATION_RESEARCH[researchId];
  const progress = getResearchProgress(state, activeTroop, researchId);
  const percent = roundedPercent(progress.percent);
  const routeStep = activeRoute ? getRouteStep(activeRoute, researchId, activeTroop) : 0;
  const isRouteNext = activeRoute && getRouteNextResearchId() === researchId;
  const selected = selectedItem.kind === 'research' && selectedItem.researchId === researchId;
  const stateName = statusForProgress(progress);
  const displayName = researchDisplayName(research, activeTroop);
  const image = getSpecializationResearchImage(researchId, activeTroop);
  return `
    <article class="specialization-research" data-specialization-research="${researchId}" data-route-step="${routeStep || ''}" data-route-next="${isRouteNext ? 'true' : 'false'}">
      ${routeStep ? `<span class="specialization-route-step" aria-hidden="true">${routeStep}</span>` : ''}
      ${isRouteNext ? `<span class="specialization-route-next">${escapeHtml(t('routeNextUp'))}</span>` : ''}
      <button type="button" class="specialization-research-node" data-specialization-open-research="${researchId}" data-column-id="${columnId}" data-state="${stateName}" aria-pressed="${selected}" aria-label="${escapeAttribute(t('nodeStatusAria', { name: displayName, status: statusLabel(progress), current: progress.completedNodes, maximum: progress.totalNodes }))}">
        ${renderCircularProgress('specialization-node-progress-ring', percent)}
        <span class="specialization-node-icon" aria-hidden="true">${plannerSprite(image, 'specialization-research-image')}</span>
        <span class="specialization-node-percent">${percent}%</span>
      </button>
      <strong class="specialization-skill-name">${escapeHtml(displayName)}</strong>
      <span class="specialization-node-cost" data-specialization-node-cost>${formatNumber(research.cost)}</span>
    </article>`;
}

function renderColumn(columnId) {
  const column = SPECIALIZATION_COLUMNS[columnId];
  const progress = getColumnProgress(state, activeTroop, columnId);
  const percent = roundedPercent(progress.percent);
  const unlocked = isColumnSkillUnlocked(progress);
  const skill = SPECIALIZATION_LEGION_SKILLS[columnId][activeTroop];
  const skillImage = getSpecializationLegionSkillImage(columnId, activeTroop);
  const selected = selectedItem.columnId === columnId;
  return `
    <section class="specialization-column ${selected ? 'is-selected' : ''}" data-specialization-column="${columnId}" data-selected="${selected}">
      <header class="specialization-column-header">
        <span class="specialization-column-number">${columnId}</span>
        <span class="specialization-column-title">${escapeHtml(column.name)}</span>
        <span class="specialization-column-season" title="${escapeAttribute(t('unlocksInSeason', { season: seasonLabel(column.unlockSeason) }))}">${escapeHtml(seasonLabel(column.unlockSeason))}</span>
        <div class="specialization-column-progress" data-specialization-column-progress role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}" aria-valuetext="${escapeAttribute(t('towerProgressAria', { tower: `${troopLabel(activeTroop)} ${column.name}`, completed: percent }))}">
          <progress class="specialization-column-progress-track" max="100" value="${percent}" aria-hidden="true">${percent}%</progress><span>${percent}%</span>
        </div>
      </header>
      <div class="specialization-node-list">
        ${column.researches.map((researchId) => renderResearchButton(researchId, columnId)).join('')}
      </div>
      <div class="specialization-column-skill" data-specialization-column-skill="${columnId}">
        <button type="button" class="specialization-legion-skill ${unlocked ? 'is-unlocked' : 'is-unavailable'}" data-specialization-open-column-skill="${columnId}" data-state="${unlocked ? 'unlocked' : 'locked'}" aria-label="${escapeAttribute(`${skill.name}: ${unlocked ? t('statusComplete') : t('statusLocked')}`)}">${plannerSprite(skillImage, 'specialization-legion-skill-image')}<span class="specialization-legion-skill-state" aria-hidden="true">${unlocked ? '✓' : '🔒'}</span></button>
        <strong class="specialization-skill-name">${escapeHtml(skill.name)}</strong>
        <span class="specialization-skill-status">${escapeHtml(unlocked ? t('freeUnlock') : t('statusLocked'))}</span>
      </div>
    </section>`;
}

function renderGraph() {
  const tower = troopLabel(activeTroop);
  return `
    <section class="specialization-graph-shell" id="specialization-tower-panel" role="tabpanel" aria-label="${escapeAttribute(`${tower} ${t('towerNavigation')}`)}">
      <div class="specialization-graph-scroll" data-specialization-tower-graph role="region" aria-label="${escapeAttribute(`${tower}: ${SPECIALIZATION_COLUMN_COUNT} columns`)}" tabindex="0">
        <div class="specialization-columns">
          ${COLUMN_IDS.map((columnId) => renderColumn(columnId)).join('')}
        </div>
      </div>
      ${renderColumnPositionPill()}
      <footer class="specialization-graph-footer">
        <div class="specialization-legend">
          <span>${escapeHtml(t('nodeStatus'))}:</span>
          <span class="specialization-legend-items">
            <span class="specialization-legend-key"><span class="specialization-legend-swatch specialization-legend-swatch--complete"></span>${escapeHtml(t('statusComplete'))}</span>
            <span class="specialization-legend-key"><span class="specialization-legend-swatch specialization-legend-swatch--progress"></span>${escapeHtml(t('statusInProgress'))}</span>
            <span class="specialization-legend-key"><span class="specialization-legend-swatch specialization-legend-swatch--unstarted"></span>${escapeHtml(t('statusNotStarted'))}</span>
            <span class="specialization-legend-key"><span class="specialization-legend-swatch specialization-legend-swatch--free"></span>${escapeHtml(t('freeUnlock'))}</span>
          </span>
        </div>
        <span class="specialization-medal-balance">${escapeHtml(t('seasonAvailabilityNote'))}</span>
      </footer>
    </section>`;
}

function nodeEffectForTroop(node, troopId) {
  const override = node.troopSpecific?.[troopId];
  return override?.effect || override?.desc || node.effect || node.desc || '';
}

function renderMilestones(research, progress) {
  const milestones = research.skillMilestones?.[activeTroop] || [];
  const unlocked = new Set(progress.unlockedMilestones.map((item) => Number(item.percent)));
  return `
    <section class="specialization-milestone-panel">
      <h4 class="specialization-section-label">${escapeHtml(t('milestones'))}</h4>
      <ol class="specialization-milestones specialization-milestone-list">
        ${milestones
          .map((milestone) => {
            const complete = unlocked.has(Number(milestone.percent));
            return `<li class="specialization-milestone" data-specialization-milestone="${milestone.percent}" data-status="${complete ? 'unlocked' : 'locked'}" aria-current="${complete ? 'step' : 'false'}"><span class="specialization-milestone-threshold">${milestone.percent}%</span><span class="specialization-milestone-value">${escapeHtml(milestone.effect)}</span><span aria-hidden="true">${complete ? '✓' : '○'}</span></li>`;
          })
          .join('')}
      </ol>
    </section>`;
}

function renderAttributeNode(research, node, progress, index, { passive = false, access } = {}) {
  const selected = progress.selectedNodeIds.includes(node.id);
  const effect = passive
    ? research.passiveSkill?.[activeTroop]?.effect || ''
    : nodeEffectForTroop(node, activeTroop);
  const name = passive ? research.passiveSkill?.[activeTroop]?.name || 'Passive Skill' : node.name;
  const status = nodeAccessStatusLabel(access);
  const disabled = !selected && !access.selectable;
  return `
    <button type="button" class="specialization-node" data-specialization-attribute-node="${node.id}" data-research-id="${research.id}" data-node-state="${access.state}"${access.pathBranch ? ` data-path-branch="${escapeAttribute(access.pathBranch)}"` : ''} aria-pressed="${selected}" aria-label="${escapeAttribute(`${name}: ${effect}. ${status}`)}" title="${escapeAttribute(`${name}: ${effect}`)}"${disabled ? ' disabled' : ''}>
      <span class="specialization-node-icon" aria-hidden="true">${selected ? '✓' : access.state === 'locked' ? '🔒' : index + 1}</span>
      <span class="specialization-sr-only">${escapeHtml(name)} · ${escapeHtml(effect)}</span>
      <span class="specialization-sr-only" data-specialization-node-cost>${escapeHtml(t('medalsUnknown'))}</span>
    </button>`;
}

function renderNodePathBody() {
  const research =
    SPECIALIZATION_RESEARCH[selectedItem.researchId] || SPECIALIZATION_RESEARCH.training1;
  const progress = getResearchProgress(state, activeTroop, research.id);
  const nodeAccess = getResearchNodeAccess(state, activeTroop, research.id);
  const accessById = new Map(nodeAccess.entries.map((entry) => [entry.nodeId, entry]));
  const displayName = researchDisplayName(research, activeTroop);
  const nodes = research.nodes.map((node, index) => ({
    id: node.id,
    name: node.name,
    effect: nodeEffectForTroop(node, activeTroop),
    passive: false,
    index,
  }));
  if (research.passiveSkillNodeId !== null && research.passiveSkillNodeId !== undefined) {
    nodes.push({
      id: research.passiveSkillNodeId,
      name: research.passiveSkill?.[activeTroop]?.name || 'Passive Skill',
      effect: research.passiveSkill?.[activeTroop]?.effect || '',
      passive: true,
      index: research.nodes.length,
    });
  }
  const visibleNodes = nodes
    .map((item) => ({ ...item, access: accessById.get(item.id) }))
    .filter((item) => item.access?.visible);
  const percent = roundedPercent(progress.percent);
  const isProgressive = nodeAccess.mode === 'partial-evidence';
  const layout = isProgressive ? 'evidence-branches' : visibleNodes.length > 10 ? 'grid' : 'ring';
  return `
    <div class="specialization-dialog-header"><div><h2 id="specialization-node-path-title">${escapeHtml(displayName)}</h2><small>${escapeHtml(t('nodeLevel', { current: progress.completedNodes, maximum: progress.totalNodes }))}</small></div><button type="button" data-specialization-close-dialog="node-path" aria-label="${escapeAttribute(t('closeDialog'))}">${iconSvg('close')}</button></div>
    <div class="specialization-dialog-body">
      ${isProgressive ? `<section class="specialization-path-evidence" data-specialization-path-evidence><strong>${escapeHtml(t('nodePathProgressive'))}</strong><span>${escapeHtml(t('nodePathPartialEvidence'))}</span></section>` : ''}
      <div class="specialization-node-path ${visibleNodes.length > 10 ? 'is-long' : ''}" data-layout="${layout}">
        ${visibleNodes.map((item) => renderAttributeNode(research, { id: item.id, name: item.name, effect: item.effect }, progress, item.index, { passive: item.passive, access: item.access })).join('')}
        <div class="specialization-node-path__mastery"><strong>${percent}%</strong><span>${escapeHtml(displayName)}</span></div>
      </div>
      <ol class="specialization-effect-list">
        ${visibleNodes.map((item) => `<li class="specialization-effect-row" data-node-state="${item.access.state}"><span class="specialization-node-icon" aria-hidden="true">${progress.selectedNodeIds.includes(item.id) ? '✓' : item.access.state === 'locked' ? '🔒' : item.index + 1}</span><div><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.effect)}</small></div><span class="specialization-skill-status">${escapeHtml(nodeAccessStatusLabel(item.access))}</span></li>`).join('')}
      </ol>
      ${nodeAccess.hiddenCount ? `<p class="specialization-hidden-node-count" data-specialization-hidden-node-count>${escapeHtml(t('hiddenNodeCount', { count: nodeAccess.hiddenCount }))}</p>` : ''}
      <p>${escapeHtml(t('exactMedalDataOnly'))}</p>
    </div>
    <div class="specialization-dialog-footer"><button type="button" class="specialization-action" data-specialization-close-dialog="node-path">${escapeHtml(t('close'))}</button></div>`;
}

function renderResearchInspector(titleId = 'specialization-inspector-title') {
  const research =
    SPECIALIZATION_RESEARCH[selectedItem.researchId] || SPECIALIZATION_RESEARCH.training1;
  const progress = getResearchProgress(state, activeTroop, research.id);
  const nodeAccess = getResearchNodeAccess(state, activeTroop, research.id);
  const selection = getResearchSelection(state, activeTroop, research.id);
  const displayName = researchDisplayName(research, activeTroop);
  const recorded = progress.isComplete ? research.cost : selection.medalsSpent;
  const remaining = recorded === null ? null : Math.max(0, research.cost - recorded);
  const percent = roundedPercent(progress.percent);
  const image = getSpecializationResearchImage(research.id, activeTroop);
  const recordedMedalsId = `${titleId}-recorded-medals`;
  const recordedMedalsHelpId = `${titleId}-recorded-medals-help`;
  const exactMedalDataId = `${titleId}-exact-medal-data`;
  const progressGroupId = `${titleId}-progress-label`;
  const pathNoticeId = `${titleId}-path-notice`;
  const requiresExactNodeSelection = nodeAccess.mode === 'partial-evidence';
  // Easy mode trades the evidence-first gate for speed: medals can be entered before any
  // node is picked. A completed research still reports its full cost and stays read-only.
  const needsNodeBeforeMedals = progress.completedNodes === 0 && !easyMedalMode;
  const medalInputDisabled = progress.isComplete || needsNodeBeforeMedals;
  const medalDescriptionIds = [
    ...(needsNodeBeforeMedals ? [recordedMedalsHelpId] : []),
    exactMedalDataId,
  ].join(' ');
  return `
    <div class="specialization-inspector-inner">
      <div class="specialization-inspector-header">
        <h2 id="${titleId}">${escapeHtml(t('selectedLearning'))}</h2>
        <button type="button" class="specialization-inspector-close" data-specialization-close-inspector aria-label="${escapeAttribute(t('closeDialog'))}">${iconSvg('close')}</button>
      </div>
      <section class="specialization-selection-card">
        <span class="specialization-selection-icon" aria-hidden="true">${plannerSprite(image, 'specialization-selection-image')}</span>
        <div class="specialization-selection-copy"><h3>${escapeHtml(displayName)}</h3><p>${escapeHtml(troopLabel(activeTroop))}</p><div class="specialization-selection-meta"><span>${escapeHtml(SPECIALIZATION_COLUMNS[research.column].name)}</span><span>${escapeHtml(seasonLabel(SPECIALIZATION_COLUMNS[research.column].unlockSeason))}</span><span>${escapeHtml(t('nodeLevel', { current: progress.completedNodes, maximum: progress.totalNodes }))}</span></div></div>
      </section>
      <section class="specialization-progress-editor">
        <span class="specialization-field-label" id="${progressGroupId}">${escapeHtml(t('overallProgress'))}</span>
        <div class="specialization-progress-control" role="group" aria-labelledby="${progressGroupId}">
          <button type="button" data-specialization-progress-step="-1" aria-label="${escapeAttribute(t('decrementLevel', { name: displayName }))}"${requiresExactNodeSelection ? ' disabled' : ''}>−</button>
          <output>${percent}%</output>
          <button type="button" data-specialization-progress-step="1" aria-label="${escapeAttribute(t('incrementLevel', { name: displayName }))}"${requiresExactNodeSelection ? ' disabled' : ''}>+</button>
          ${SPECIALIZATION_MILESTONE_PERCENTAGES.map((value) => `<button type="button" data-specialization-progress-set="${value}" aria-pressed="${percent === value}"${requiresExactNodeSelection ? ' disabled' : ''}>${value}%</button>`).join('')}
        </div>
        ${requiresExactNodeSelection ? `<p class="specialization-inline-notice" id="${pathNoticeId}">${escapeHtml(t('pathOrderUnknown'))}</p>` : ''}
      </section>
      <button type="button" class="specialization-action specialization-breakdown-trigger" data-specialization-open-node-path>${escapeHtml(t('attributeNodes'))} · ${progress.completedNodes}/${progress.totalNodes}</button>
      ${renderMilestones(research, progress)}
      <section class="specialization-medal-field">
        <label for="${recordedMedalsId}">${escapeHtml(t('medalsRecorded'))}</label>
        <input id="${recordedMedalsId}" data-specialization-recorded-medals data-research-id="${research.id}" type="number" min="0" max="${research.cost}" step="1" value="${recorded ?? ''}" placeholder="${escapeAttribute(t('medalsUnknown'))}" aria-describedby="${medalDescriptionIds}" ${medalInputDisabled ? 'disabled' : ''} />
        ${needsNodeBeforeMedals ? `<p class="specialization-inline-notice" id="${recordedMedalsHelpId}">${escapeHtml(t('selectNodeBeforeMedals'))}</p>` : ''}
        ${
          easyMedalMode && !progress.isComplete
            ? `<div class="specialization-medal-quickfill" role="group" aria-label="${escapeAttribute(t('easyMedalsLabel'))}">
                ${[25, 50, 75, 100].map((share) => `<button type="button" data-specialization-medal-fill="${share}" data-research-id="${research.id}">${share}%</button>`).join('')}
                <button type="button" data-specialization-medal-fill="0" data-research-id="${research.id}">${escapeHtml(t('easyMedalsClear'))}</button>
              </div>`
            : ''
        }
        <div class="specialization-cost-table">
          <div class="specialization-cost-row"><span>${escapeHtml(t('medalsRequired'))}</span><strong>${formatNumber(research.cost)}</strong></div>
          <div class="specialization-cost-row"><span>${escapeHtml(t('medalsRemaining'))}</span><strong>${remaining === null ? escapeHtml(t('medalsUnknown')) : formatNumber(remaining)}</strong></div>
        </div>
        <p id="${exactMedalDataId}">${escapeHtml(t('exactMedalDataOnly'))}</p>
      </section>
      <div class="specialization-actions">
        <button type="button" class="specialization-action specialization-action--primary" data-specialization-complete-learning="${research.id}"${requiresExactNodeSelection ? ` aria-describedby="${pathNoticeId}" disabled` : ''}>${escapeHtml(t('completeLearning'))}</button>
        <button type="button" class="specialization-action" data-specialization-reset-learning="${research.id}">${escapeHtml(t('resetLearning'))}</button>
      </div>
    </div>`;
}

function renderSkillInspector(titleId = 'specialization-inspector-title') {
  const columnId = Number(selectedItem.columnId) || 1;
  const columnProgress = getColumnProgress(state, activeTroop, columnId);
  const unlocked = isColumnSkillUnlocked(columnProgress);
  const skill = SPECIALIZATION_LEGION_SKILLS[columnId][activeTroop];
  const skillImage = getSpecializationLegionSkillImage(columnId, activeTroop);
  return `
    <div class="specialization-inspector-inner">
      <div class="specialization-inspector-header"><h2 id="${titleId}">${escapeHtml(t('legionSkills'))}</h2><button type="button" class="specialization-inspector-close" data-specialization-close-inspector aria-label="${escapeAttribute(t('closeDialog'))}">${iconSvg('close')}</button></div>
      <section class="specialization-selection-card">
        <span class="specialization-selection-icon" aria-hidden="true">${plannerSprite(skillImage, 'specialization-selection-image')}</span>
        <div class="specialization-selection-copy"><h3>${escapeHtml(skill.name)}</h3><p>${escapeHtml(`${troopLabel(activeTroop)} · ${SPECIALIZATION_COLUMNS[columnId].name}`)}</p><div class="specialization-selection-meta"><span>${escapeHtml(unlocked ? t('statusComplete') : t('statusLocked'))}</span><span>${escapeHtml(t('freeUnlock'))}</span></div></div>
      </section>
      <section class="specialization-inspector-summary">
        <h4>${escapeHtml(t('currentBonus'))}</h4><p>${escapeHtml(skill.desc)}</p>
      </section>
      <section class="specialization-cost-table">
        <div class="specialization-cost-row"><span>${escapeHtml(t('unlockRequirement'))}</span><strong>${columnProgress.completedResearchCount} / ${SPECIALIZATION_RESEARCHES_PER_COLUMN}</strong></div>
        <div class="specialization-cost-row"><span>${escapeHtml(t('medalsRequired'))}</span><strong>${escapeHtml(t('noMedalsRequired'))}</strong></div>
      </section>
      <p>${escapeHtml(t('legionSkillNote'))}</p>
      <button type="button" class="specialization-action" data-specialization-action="breakdown">${escapeHtml(t('breakdown'))}</button>
    </div>`;
}

function renderInspectorContent(titleId = 'specialization-inspector-title') {
  return selectedItem.kind === 'skill'
    ? renderSkillInspector(titleId)
    : renderResearchInspector(titleId);
}

function renderCommunityCard() {
  const link = SPECIALIZATION_CONTRIBUTION_SHEET_URL
    ? `<a class="specialization-action specialization-action--primary" href="${escapeAttribute(SPECIALIZATION_CONTRIBUTION_SHEET_URL)}" target="_blank" rel="noopener noreferrer" data-specialization-contribution-sheet>${escapeHtml(t('openContributionSheet'))}</a>`
    : `<span class="specialization-action" aria-disabled="true">${escapeHtml(t('contributionSheetPending'))}</span>`;
  return `
    <section class="specialization-summary__card specialization-community" aria-labelledby="specialization-community-title">
      <div><h2 id="specialization-community-title">${escapeHtml(t('communityDataTitle'))}</h2><p>${escapeHtml(t('communityDataDescription'))}</p><small>${escapeHtml(t('contributionInstructions'))}</small></div>
      <div class="specialization-actions">${link}<button type="button" class="specialization-action" data-specialization-action="download-template">${escapeHtml(t('downloadContributionTemplate'))}</button></div>
    </section>`;
}

function renderDialogs() {
  return `
    <dialog class="specialization-dialog" data-specialization-inspector aria-modal="true" aria-labelledby="specialization-mobile-inspector-title">
      <div data-specialization-modal-inspector-content tabindex="0">${renderInspectorContent('specialization-mobile-inspector-title')}</div>
    </dialog>
    <dialog class="specialization-dialog specialization-node-path-dialog" data-specialization-node-path-dialog aria-modal="true" aria-labelledby="specialization-node-path-title">${renderNodePathBody()}</dialog>
    <dialog class="specialization-dialog specialization-breakdown" data-specialization-breakdown-dialog aria-modal="true" aria-labelledby="specialization-breakdown-title">
      <div class="specialization-dialog-header"><h2 id="specialization-breakdown-title">${escapeHtml(t('breakdown'))}</h2><button type="button" data-specialization-close-dialog="breakdown" aria-label="${escapeAttribute(t('closeDialog'))}">${iconSvg('close')}</button></div>
      <div class="specialization-dialog-body" data-specialization-contribution-breakdown aria-label="${escapeAttribute(t('breakdownAria'))}"></div>
      <div class="specialization-dialog-footer"><button type="button" class="specialization-action" data-specialization-action="export-contributions">${escapeHtml(t('statContribution'))} JSON</button><button type="button" class="specialization-action" data-specialization-close-dialog="breakdown">${escapeHtml(t('close'))}</button></div>
    </dialog>
    <dialog class="specialization-dialog" data-specialization-reset-dialog aria-modal="true" aria-labelledby="specialization-reset-title">
      <div class="specialization-dialog-header"><h2 id="specialization-reset-title">${escapeHtml(t('confirmResetTitle'))}</h2></div>
      <div class="specialization-dialog-body"><p>${escapeHtml(t('confirmResetMessage'))}</p></div>
      <div class="specialization-dialog-footer"><button type="button" class="specialization-action" data-specialization-close-dialog="reset">${escapeHtml(t('cancel'))}</button><button type="button" class="specialization-action specialization-action--primary" data-specialization-confirm-reset>${escapeHtml(t('confirmReset'))}</button></div>
    </dialog>`;
}

function renderApp() {
  cancelGraphScrollUpdate();
  const summary = getSpecializationSummary(state);
  root.innerHTML = `
    <div class="specialization-app">
      ${renderHeader()}
      <main class="specialization-main" id="specializationWorkspace">
        <section class="specialization-intro">
          <div class="specialization-title-block"><h1>${escapeHtml(t('title'))} <span class="specialization-scope-chip">${escapeHtml(t('betaBadge'))}</span></h1><p>${escapeHtml(t('subtitle'))}</p><div class="specialization-header__meta"><span>${escapeHtml(t('sourceRevision'))}: ${escapeHtml(SPECIALIZATION_DATA_REVISION)}</span><span class="specialization-meta-separator" aria-hidden="true">·</span><span>${escapeHtml(t('canonicalEnglishBadge'))}</span></div></div>
          ${renderSummary(summary)}
        </section>
        ${renderTowerTabs(summary)}
        <section class="specialization-workspace ${inspectorCollapsed ? 'is-inspector-collapsed' : ''}">
          ${renderGraph()}
          <aside class="specialization-inspector" data-specialization-inspector-panel aria-label="${escapeAttribute(t('selectedLearning'))}" ${inspectorCollapsed ? 'hidden' : ''}>${renderInspectorContent()}</aside>
        </section>
        ${renderCommunityCard()}
        <section class="specialization-empty specialization-source-notes"><strong>${escapeHtml(t('sourceConfidence'))}: ${escapeHtml(t('confidenceVerified'))}</strong><span>${escapeHtml(t('seasonPlanningNote'))}</span><span>${escapeHtml(t('incompleteDataNote'))}</span><a href="${escapeAttribute(SPECIALIZATION_SOURCE_METADATA.currentGuideUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(t('source'))}</a></section>
      </main>
      <input type="file" accept=".json,application/json" data-specialization-import-file hidden />
      <div class="specialization-live" data-specialization-live role="status" aria-live="polite" aria-atomic="true"></div>
      <div class="specialization-toast-region"><div class="specialization-toast" data-specialization-toast aria-live="polite"></div></div>
      ${renderDialogs()}
    </div>`;
}

function revealActiveTowerTab(tabList) {
  const activeTab = tabList?.querySelector('[data-specialization-tower][aria-selected="true"]');
  if (!activeTab) return;
  const pageX = globalThis.scrollX;
  const pageY = globalThis.scrollY;
  activeTab.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'auto' });
  globalThis.scrollTo({ left: pageX, top: pageY, behavior: 'auto' });
}

function leadingVisibleColumnId(graph) {
  const columns = [...(graph?.querySelectorAll('[data-specialization-column]') || [])];
  if (!columns.length) return 1;
  const graphRect = graph.getBoundingClientRect();
  const lastColumn = columns.at(-1);
  const lastRect = lastColumn.getBoundingClientRect();
  if (lastRect.left >= graphRect.left && lastRect.right <= graphRect.right + 1) {
    return Number(lastColumn.dataset.specializationColumn);
  }
  let nearest = columns[0];
  let nearestDistance = Number.POSITIVE_INFINITY;
  for (const column of columns) {
    const rect = column.getBoundingClientRect();
    if (rect.right <= graphRect.left || rect.left >= graphRect.right) continue;
    const distance = Math.abs(rect.left - graphRect.left);
    if (distance < nearestDistance) {
      nearest = column;
      nearestDistance = distance;
    }
  }
  return Number(nearest.dataset.specializationColumn) || 1;
}

function updateColumnPosition(graph) {
  const position = root?.querySelector('[data-specialization-column-position]');
  if (!graph || !position) return;
  const columnId = leadingVisibleColumnId(graph);
  if (currentGraphColumn === columnId) return;
  currentGraphColumn = columnId;
  position.dataset.currentColumn = String(columnId);
  const label = position.querySelector('[data-specialization-column-position-label]');
  if (label) label.textContent = columnPositionText(columnId);
  for (const dot of position.querySelectorAll('[data-specialization-column-dot]')) {
    const isCurrent = Number(dot.dataset.specializationColumnDot) === columnId;
    dot.dataset.current = String(isCurrent);
  }
}

function cancelGraphScrollUpdate() {
  if (graphScrollFrame) globalThis.cancelAnimationFrame(graphScrollFrame);
  graphScrollFrame = 0;
  graphScrollTarget = null;
}

function restoreRenderedScroll({ graphScrollLeft = 0, tabScrollLeft = 0 } = {}) {
  const graph = root.querySelector('[data-specialization-tower-graph]');
  const tabList = root.querySelector('[data-specialization-tower-tabs]');
  if (graph) graph.scrollLeft = graphScrollLeft;
  if (tabList) {
    tabList.scrollLeft = tabScrollLeft;
    revealActiveTowerTab(tabList);
  }
  updateColumnPosition(graph);
}

function refresh({ preserveScroll = true } = {}) {
  const graph = root.querySelector('[data-specialization-tower-graph]');
  const tabList = root.querySelector('[data-specialization-tower-tabs]');
  const graphScrollLeft = preserveScroll ? graph?.scrollLeft || 0 : 0;
  const tabScrollLeft = tabList?.scrollLeft || 0;
  if (!preserveScroll) currentGraphColumn = 1;
  renderApp();
  restoreRenderedScroll({ graphScrollLeft, tabScrollLeft });
}

function updateInspectorOnly() {
  const panel = root.querySelector('[data-specialization-inspector-panel]');
  const modal = root.querySelector('[data-specialization-modal-inspector-content]');
  if (panel) panel.innerHTML = renderInspectorContent('specialization-inspector-title');
  if (modal) modal.innerHTML = renderInspectorContent('specialization-mobile-inspector-title');
}

function announce(message) {
  const live = root.querySelector('[data-specialization-live]');
  if (live) live.textContent = message;
}

function toast(message) {
  const target = root.querySelector('[data-specialization-toast]');
  if (!target) return;
  globalThis.clearTimeout(toastTimer);
  target.textContent = message;
  target.classList.add('is-visible');
  toastTimer = globalThis.setTimeout(() => target.classList.remove('is-visible'), 2600);
}

function describeSpecializationControl(element) {
  if (!(element instanceof HTMLElement)) return null;
  const attributes = [...element.attributes]
    .filter((attribute) => attribute.name.startsWith('data-specialization-'))
    .map((attribute) => [attribute.name, attribute.value]);
  if (!attributes.length) return null;
  return { tagName: element.tagName.toLowerCase(), attributes };
}

function findMatchingControl(container, descriptor) {
  if (!container || !descriptor) return null;
  return [...container.querySelectorAll(descriptor.tagName)].find((element) =>
    descriptor.attributes.every(
      ([attributeName, value]) => element.getAttribute(attributeName) === value
    )
  );
}

function remember(nextState, message = '', { reopenNodePath = false, restoreControl = null } = {}) {
  const currentMobileInspector = root.querySelector('[data-specialization-inspector]');
  const mobileInspectorWasOpen = Boolean(currentMobileInspector?.open);
  const mobileInspectorScrollTop = currentMobileInspector?.querySelector(
    '[data-specialization-modal-inspector-content]'
  )?.scrollTop;
  const focusedControl =
    restoreControl instanceof HTMLElement ? restoreControl : document.activeElement;
  const focusDescriptor = describeSpecializationControl(focusedControl);
  const focusWasInDesktopInspector = Boolean(
    document.activeElement?.closest?.('[data-specialization-inspector-panel]')
  );
  undoStack.push(state);
  if (undoStack.length > MAX_HISTORY) undoStack.shift();
  redoStack = [];
  state = nextState;
  saveSpecializationState(state);
  refresh();
  if (reopenNodePath) {
    let restoreTarget = root.querySelector(
      '[data-specialization-inspector-panel] [data-specialization-open-node-path]'
    );
    if (nodePathRestoreMode === 'mobile') {
      const mobileInspector = root.querySelector('[data-specialization-inspector]');
      inspectorOpener =
        root.querySelector(`[data-specialization-open-research="${selectedItem.researchId}"]`) ||
        root.querySelector(
          `[data-specialization-open-column-skill="${Number(selectedItem.columnId)}"]`
        );
      if (mobileInspector && !mobileInspector.open) mobileInspector.showModal();
      const modalContent = mobileInspector?.querySelector(
        '[data-specialization-modal-inspector-content]'
      );
      if (typeof mobileInspectorScrollTop === 'number' && modalContent) {
        modalContent.scrollTop = mobileInspectorScrollTop;
      }
      restoreTarget = mobileInspector?.querySelector('[data-specialization-open-node-path]');
    }
    openDialog('[data-specialization-node-path-dialog]', restoreTarget);
  } else if (mobileInspectorWasOpen) {
    const mobileInspector = root.querySelector('[data-specialization-inspector]');
    inspectorOpener =
      root.querySelector(`[data-specialization-open-research="${selectedItem.researchId}"]`) ||
      root.querySelector(
        `[data-specialization-open-column-skill="${Number(selectedItem.columnId)}"]`
      );
    if (mobileInspector && !mobileInspector.open) mobileInspector.showModal();
    const modalContent = mobileInspector?.querySelector(
      '[data-specialization-modal-inspector-content]'
    );
    if (typeof mobileInspectorScrollTop === 'number' && modalContent) {
      modalContent.scrollTop = mobileInspectorScrollTop;
    }
    const focusTarget =
      findMatchingControl(mobileInspector, focusDescriptor) ||
      mobileInspector?.querySelector('[data-specialization-close-inspector]');
    focusTarget?.focus({ preventScroll: true });
    if (typeof mobileInspectorScrollTop === 'number' && modalContent) {
      modalContent.scrollTop = mobileInspectorScrollTop;
    }
  } else if (focusWasInDesktopInspector) {
    findMatchingControl(
      root.querySelector('[data-specialization-inspector-panel]'),
      focusDescriptor
    )?.focus({ preventScroll: true });
  }
  if (message) {
    toast(message);
    announce(message);
  }
}

function replaceWithoutHistory(nextState, message = '') {
  const focusDescriptor = describeSpecializationControl(document.activeElement);
  state = nextState;
  saveSpecializationState(state);
  refresh();
  findMatchingControl(root, focusDescriptor)?.focus({ preventScroll: true });
  if (message) toast(message);
}

function openInspectorModalIfNeeded(opener) {
  if (!globalThis.matchMedia?.(MOBILE_INSPECTOR_QUERY).matches) return;
  const dialog = root.querySelector('[data-specialization-inspector]');
  if (!dialog || dialog.open) return;
  inspectorOpener = opener || document.activeElement;
  dialog.showModal();
  dialog.querySelector('[data-specialization-close-inspector]')?.focus({ preventScroll: true });
}

function closeInspectorDialog() {
  const dialog = root.querySelector('[data-specialization-inspector]');
  if (dialog?.open) {
    dialog.close();
    if (inspectorOpener instanceof HTMLElement) inspectorOpener.focus({ preventScroll: true });
  } else {
    inspectorCollapsed = true;
    refresh();
    const selectedControl =
      selectedItem.kind === 'research'
        ? root.querySelector(`[data-specialization-open-research="${selectedItem.researchId}"]`)
        : root.querySelector(
            `[data-specialization-open-column-skill="${Number(selectedItem.columnId)}"]`
          );
    selectedControl?.focus({ preventScroll: true });
  }
  inspectorOpener = null;
}

function selectResearch(researchId, columnId, opener) {
  selectedItem = { kind: 'research', researchId, columnId: Number(columnId) };
  inspectorCollapsed = false;
  refresh();
  const nextOpener =
    root.querySelector(`[data-specialization-open-research="${researchId}"]`) || opener;
  openInspectorModalIfNeeded(nextOpener);
  if (!globalThis.matchMedia?.(MOBILE_INSPECTOR_QUERY).matches) {
    nextOpener?.focus({ preventScroll: true });
  }
}

function selectSkill(columnId, opener) {
  selectedItem = { kind: 'skill', columnId: Number(columnId) };
  inspectorCollapsed = false;
  refresh();
  const nextOpener =
    root.querySelector(`[data-specialization-open-column-skill="${Number(columnId)}"]`) || opener;
  openInspectorModalIfNeeded(nextOpener);
  if (!globalThis.matchMedia?.(MOBILE_INSPECTOR_QUERY).matches) {
    nextOpener?.focus({ preventScroll: true });
  }
}

// Returns the next state without committing it, so callers can chain another edit
// (easy medal fill sets node count and medals in one history entry).
function setResearchCompletionState(baseState, troopId, researchId, targetCount) {
  const ids = selectableNodeIds(SPECIALIZATION_RESEARCH[researchId]);
  const count = Math.max(0, Math.min(ids.length, Number(targetCount) || 0));
  return setResearchNodes(baseState, troopId, researchId, ids.slice(0, count));
}

function setResearchCompletion(researchId, targetCount) {
  const research = SPECIALIZATION_RESEARCH[researchId];
  const next = setResearchCompletionState(state, activeTroop, researchId, targetCount);
  const progress = getResearchProgress(next, activeTroop, researchId);
  remember(
    next,
    t('learningUpdated', {
      name: researchDisplayName(research, activeTroop),
      level: roundedPercent(progress.percent),
    })
  );
}

function downloadText(filename, text, type = 'application/json;charset=utf-8') {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function exportProgress() {
  downloadText('specialization-towers-v2-progress.json', exportSpecializationJson(state));
  toast(t('exportSuccess'));
}

function exportContributions() {
  const snapshot = buildStatContributionSnapshot(state);
  downloadText('specialization-towers-v2-contributions.json', JSON.stringify(snapshot, null, 2));
  toast(t('exportSuccess'));
}

function csvCell(value) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

export function getContributionInitialVisibility(research, node) {
  if (Array.isArray(node?.prerequisiteNodeIds)) {
    if (node.prerequisiteNodeIds.length === 0) return 'available';
    return node.visibleWhenLocked ? 'visible_locked' : 'hidden_until_prerequisites';
  }
  if (node?.visibleWhenLocked) return 'visible_locked';
  if (research?.progressiveReveal?.status === 'partial-evidence') return 'hidden_unverified';
  if (research?.progressiveReveal?.status === 'catalog-complete-path-unverified') {
    return 'available';
  }
  return '';
}

export function buildContributionTemplateRows() {
  const headers = [
    'template_version',
    'season',
    'column',
    'research_id',
    'research_name',
    'node_position',
    'node_id',
    'node_name',
    'current_effect',
    'footman_effect',
    'archer_effect',
    'cavalry_effect',
    'medal_cost',
    'initial_visibility',
    'prerequisite_node_ids',
    'reveal_after_node_ids',
    'path_branch',
    'evidence_url',
    'evidence_reference',
    'contributor',
    'verification_status',
    'notes',
  ];
  const rows = [];
  for (const researchId of RESEARCH_IDS) {
    const research = SPECIALIZATION_RESEARCH[researchId];
    const column = SPECIALIZATION_COLUMNS[research.column];
    research.nodes.forEach((node, index) => {
      rows.push([
        SPECIALIZATION_CONTRIBUTION_TEMPLATE_VERSION,
        column.unlockSeason,
        research.column,
        research.id,
        research.name,
        index + 1,
        node.id,
        node.name,
        node.effect || '',
        nodeEffectForTroop(node, 'footman'),
        nodeEffectForTroop(node, 'archer'),
        nodeEffectForTroop(node, 'cavalry'),
        '',
        getContributionInitialVisibility(research, node),
        Array.isArray(node.prerequisiteNodeIds) ? node.prerequisiteNodeIds.join('|') : '',
        Array.isArray(node.prerequisiteNodeIds) ? node.prerequisiteNodeIds.join('|') : '',
        node.pathBranch || '',
        '',
        research.progressiveReveal ? 'public-planner-app-js;game-screenshot-2026-07-17' : '',
        '',
        t('verificationMissing'),
        '',
      ]);
    });
    if (research.passiveSkillNodeId !== null && research.passiveSkillNodeId !== undefined) {
      rows.push([
        SPECIALIZATION_CONTRIBUTION_TEMPLATE_VERSION,
        column.unlockSeason,
        research.column,
        research.id,
        research.name,
        research.nodes.length + 1,
        research.passiveSkillNodeId,
        'Passive Skill',
        '',
        research.passiveSkill?.footman?.effect || '',
        research.passiveSkill?.archer?.effect || '',
        research.passiveSkill?.cavalry?.effect || '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        t('verificationMissing'),
        '',
      ]);
    }
  }
  return Object.freeze({
    headers: Object.freeze(headers.slice()),
    rows: Object.freeze(rows.map((row) => Object.freeze(row.slice()))),
  });
}

export function buildContributionTemplateCsv() {
  const { headers, rows } = buildContributionTemplateRows();
  return `\uFEFF${[headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n')}`;
}

function downloadContributionTemplate() {
  downloadText(
    'specialization-tower-node-data-template.csv',
    buildContributionTemplateCsv(),
    'text/csv;charset=utf-8'
  );
  toast(t('contributionTemplateDownloaded'));
}

function renderContributionBreakdown() {
  const snapshot = buildStatContributionSnapshot(state);
  const summary = summarizeStatContributions(snapshot);
  const target = root.querySelector('[data-specialization-contribution-breakdown]');
  if (!target) return;
  const scoped = summary.byScope;
  target.innerHTML = `
    <div class="specialization-inspector-summary"><strong>${summary.statEntryCount} ${escapeHtml(t('statContribution'))}</strong><span>${summary.effectEntryCount} effects</span><span>${summary.diagnosticCount} diagnostics</span></div>
    <div class="specialization-breakdown-list">
      ${scoped.length ? scoped.map((row) => `<div class="specialization-breakdown-row"><div><strong>${escapeHtml(row.statKey)}</strong><small>${escapeHtml(`${row.troopTarget} · ${row.rowScope} · ${row.context}`)}</small></div><span>${escapeHtml(`${row.value} ${row.unit}`)}</span></div>`).join('') : `<p class="specialization-empty-state">${escapeHtml(t('noStatContributions'))}</p>`}
    </div>`;
}

function openDialog(selector, opener = document.activeElement) {
  const dialog = root.querySelector(selector);
  if (!dialog || dialog.open) return;
  dialog.dataset.returnFocus = 'true';
  dialog._restoreTarget = opener;
  dialog.showModal();
  dialog.querySelector('button, [href], input, select')?.focus({ preventScroll: true });
}

function openNodePathDialog(opener) {
  nodePathRestoreMode = opener?.closest('[data-specialization-inspector]') ? 'mobile' : 'desktop';
  openDialog('[data-specialization-node-path-dialog]', opener);
}

function closeDialog(dialog) {
  if (!dialog) return;
  const restoreTarget = dialog._restoreTarget;
  dialog.close();
  if (restoreTarget instanceof HTMLElement) restoreTarget.focus({ preventScroll: true });
  dialog._restoreTarget = null;
}

function handleToolbarAction(action, trigger) {
  if (action === 'easy-medals') {
    easyMedalMode = !easyMedalMode;
    safeStorageSet(EASY_MEDALS_KEY, easyMedalMode ? '1' : '');
    refresh({ preserveScroll: true });
    toast(easyMedalMode ? t('easyMedalsOn') : t('easyMedalsOff'));
    return;
  }
  if (action === 'undo') {
    if (!undoStack.length) return toast(t('undoUnavailable'));
    redoStack.push(state);
    replaceWithoutHistory(undoStack.pop());
    return;
  }
  if (action === 'redo') {
    if (!redoStack.length) return toast(t('redoUnavailable'));
    undoStack.push(state);
    replaceWithoutHistory(redoStack.pop());
    return;
  }
  if (action === 'export') return exportProgress();
  if (action === 'export-contributions') return exportContributions();
  if (action === 'import') return root.querySelector('[data-specialization-import-file]')?.click();
  if (action === 'download-template') return downloadContributionTemplate();
  if (action === 'breakdown') {
    renderContributionBreakdown();
    openDialog('[data-specialization-breakdown-dialog]', trigger);
    return;
  }
  if (action === 'reset') openDialog('[data-specialization-reset-dialog]', trigger);
}

function handleClick(event) {
  const target = event.target.closest('button, a');
  if (!target || !root.contains(target)) return;
  const tower = target.dataset.specializationTower;
  if (tower) {
    activeTroop = tower;
    currentGraphColumn = 1;
    safeStorageSet(ACTIVE_TOWER_KEY, tower);
    selectedItem = {
      kind: 'research',
      researchId: SPECIALIZATION_COLUMNS[1].researches[0],
      columnId: 1,
    };
    refresh({ preserveScroll: false });
    root.querySelector(`[data-specialization-tower="${tower}"]`)?.focus({ preventScroll: true });
    return;
  }
  if (target.dataset.specializationMedalFill) {
    // The model drops medalsSpent unless nodes are selected, so a quick fill sets both:
    // "I am roughly N% through this" means N% of the nodes and N% of the medals.
    const researchId = target.dataset.researchId;
    const share = Number(target.dataset.specializationMedalFill);
    const research = SPECIALIZATION_RESEARCH[researchId];
    const total = selectableNodeIds(research).length;
    const nodeCount = share === 0 ? 0 : Math.ceil((share / 100) * total);
    let nextState = setResearchCompletionState(state, activeTroop, researchId, nodeCount);
    const cost = Number(research?.cost) || 0;
    const medals = share === 0 ? null : Math.round((cost * share) / 100);
    try {
      nextState = setResearchMedalsSpent(nextState, activeTroop, researchId, medals);
    } catch {
      // A rejected medal value still leaves the node selection applied.
    }
    remember(
      nextState,
      t('learningUpdated', {
        name: researchDisplayName(research, activeTroop),
        level: share,
      })
    );
    return;
  }
  if (target.dataset.specializationOpenResearch) {
    selectResearch(target.dataset.specializationOpenResearch, target.dataset.columnId, target);
    return;
  }
  if (target.dataset.specializationOpenColumnSkill) {
    selectSkill(target.dataset.specializationOpenColumnSkill, target);
    return;
  }
  if (target.hasAttribute('data-specialization-open-node-path')) {
    openNodePathDialog(target);
    return;
  }
  if (target.hasAttribute('data-specialization-attribute-node')) {
    const researchId = target.dataset.researchId;
    const nodeId = Number(target.dataset.specializationAttributeNode);
    const nextState = toggleResearchNode(state, activeTroop, researchId, nodeId);
    remember(
      nextState,
      t('learningUpdated', {
        name: researchDisplayName(SPECIALIZATION_RESEARCH[researchId], activeTroop),
        level: roundedPercent(getResearchProgress(nextState, activeTroop, researchId).percent),
      }),
      { reopenNodePath: true }
    );
    return;
  }
  if (target.dataset.specializationProgressStep) {
    const researchId = selectedItem.researchId;
    const current = getResearchProgress(state, activeTroop, researchId).completedNodes;
    setResearchCompletion(researchId, current + Number(target.dataset.specializationProgressStep));
    return;
  }
  if (target.dataset.specializationProgressSet) {
    const researchId = selectedItem.researchId;
    const total = getResearchProgress(state, activeTroop, researchId).totalNodes;
    setResearchCompletion(
      researchId,
      Math.ceil((Number(target.dataset.specializationProgressSet) / 100) * total)
    );
    return;
  }
  if (target.dataset.specializationCompleteLearning) {
    const researchId = target.dataset.specializationCompleteLearning;
    setResearchCompletion(
      researchId,
      selectableNodeIds(SPECIALIZATION_RESEARCH[researchId]).length
    );
    return;
  }
  if (target.dataset.specializationResetLearning) {
    const researchId = target.dataset.specializationResetLearning;
    remember(
      resetResearch(state, activeTroop, researchId),
      t('learningUpdated', {
        name: researchDisplayName(SPECIALIZATION_RESEARCH[researchId], activeTroop),
        level: 0,
      })
    );
    return;
  }
  if (target.dataset.specializationAction) {
    handleToolbarAction(target.dataset.specializationAction, target);
    return;
  }
  if (target.hasAttribute('data-specialization-theme-toggle')) {
    const next = effectiveTheme(currentThemePreference()) === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    refresh();
    root.querySelector('[data-specialization-theme-toggle]')?.focus({ preventScroll: true });
    return;
  }
  if (target.hasAttribute('data-specialization-close-inspector')) {
    closeInspectorDialog();
    return;
  }
  if (target.dataset.specializationCloseDialog) {
    closeDialog(target.closest('dialog'));
    return;
  }
  if (target.hasAttribute('data-specialization-confirm-reset')) {
    const dialog = target.closest('dialog');
    closeDialog(dialog);
    const focusDescriptor = describeSpecializationControl(document.activeElement);
    undoStack.push(state);
    redoStack = [];
    state = createEmptySpecializationState();
    saveSpecializationState(state);
    refresh({ preserveScroll: false });
    findMatchingControl(root, focusDescriptor)?.focus({ preventScroll: true });
    toast(t('resetSuccess'));
  }
}

function handleChange(event) {
  const target = event.target;
  if (target.matches('[data-specialization-route-select]')) {
    activeRoute = SPECIALIZATION_ROUTE_IDS.includes(target.value) ? target.value : '';
    safeStorageSet(ROUTE_KEY, activeRoute);
    refresh({ preserveScroll: true });
    return;
  }
  if (target.matches('[data-specialization-language-select]')) {
    const nextLocale = resolveSpecializationTowersV2Locale(target.value);
    safeStorageSet(LANGUAGE_KEY, nextLocale);
    globalThis.dispatchEvent(
      new CustomEvent('vts:language-change', { detail: { lang: nextLocale } })
    );
    return;
  }
  if (target.matches('[data-specialization-recorded-medals]')) {
    const researchId = target.dataset.researchId;
    const value = target.value.trim() === '' ? null : Number(target.value);
    try {
      remember(
        setResearchMedalsSpent(state, activeTroop, researchId, value),
        t('learningUpdated', {
          name: researchDisplayName(SPECIALIZATION_RESEARCH[researchId], activeTroop),
          level: roundedPercent(getResearchProgress(state, activeTroop, researchId).percent),
        }),
        { restoreControl: target }
      );
    } catch {
      updateInspectorOnly();
    }
  }
}

async function handleImport(event) {
  const input = event.target;
  if (!input.matches('[data-specialization-import-file]') || !input.files?.[0]) return;
  try {
    const imported = importSpecializationJson(await input.files[0].text());
    undoStack.push(state);
    redoStack = [];
    replaceWithoutHistory(imported, t('importSuccess'));
  } catch {
    toast(t('importInvalid'));
  } finally {
    input.value = '';
  }
}

function handleKeydown(event) {
  const tab = event.target.closest('[data-specialization-tower]');
  if (!tab) return;
  const tabs = [...root.querySelectorAll('[data-specialization-tower]')];
  const current = tabs.indexOf(tab);
  let next = current;
  if (event.key === 'ArrowRight') next = (current + 1) % tabs.length;
  else if (event.key === 'ArrowLeft') next = (current - 1 + tabs.length) % tabs.length;
  else if (event.key === 'Home') next = 0;
  else if (event.key === 'End') next = tabs.length - 1;
  else return;
  event.preventDefault();
  const nextTroop = tabs[next].dataset.specializationTower;
  tabs[next].click();
  root.querySelector(`[data-specialization-tower="${nextTroop}"]`)?.focus({ preventScroll: true });
}

function handleScroll(event) {
  const graph = event.target;
  if (!(graph instanceof HTMLElement) || !graph.matches('[data-specialization-tower-graph]'))
    return;
  graphScrollTarget = graph;
  if (graphScrollFrame) return;
  graphScrollFrame = globalThis.requestAnimationFrame(() => {
    const latestGraph = graphScrollTarget;
    graphScrollFrame = 0;
    graphScrollTarget = null;
    if (latestGraph === root?.querySelector('[data-specialization-tower-graph]')) {
      updateColumnPosition(latestGraph);
    }
  });
}

function handleDialogCancel(event) {
  if (!(event.target instanceof HTMLDialogElement)) return;
  event.preventDefault();
  if (event.target.hasAttribute('data-specialization-inspector')) closeInspectorDialog();
  else closeDialog(event.target);
}

function bindEvents() {
  root.addEventListener('click', handleClick);
  root.addEventListener('change', handleChange);
  root.addEventListener('change', (event) => void handleImport(event));
  root.addEventListener('keydown', handleKeydown);
  root.addEventListener('scroll', handleScroll, true);
  root.addEventListener('cancel', handleDialogCancel, true);
}

async function initialize() {
  const requested = resolveSpecializationTowersV2Locale(
    safeStorageGet(LANGUAGE_KEY, document.documentElement.lang || 'en')
  );
  await loadSpecializationTowersV2Locale(requested);
  locale = requested;
  applyLocaleToDocument(locale);
  applyTheme();
  renderApp();
  restoreRenderedScroll();
  bindEvents();
  unbindLanguageChange = bindSpecializationTowersV2LanguageChange(({ locale: nextLocale }) => {
    const focusDescriptor = describeSpecializationControl(document.activeElement);
    locale = nextLocale;
    applyLocaleToDocument(nextLocale);
    refresh();
    findMatchingControl(root, focusDescriptor)?.focus({ preventScroll: true });
  }, globalThis);
}

export function mountSpecializationTowers(mount) {
  if (!(mount instanceof HTMLElement)) {
    throw new TypeError('mountSpecializationTowers requires an HTML element.');
  }
  root = mount;
  state = loadSpecializationState();
  const storedTower = safeStorageGet(ACTIVE_TOWER_KEY, 'archer');
  activeTroop = UI_TROOPS.includes(storedTower) ? storedTower : 'archer';
  const storedRoute = safeStorageGet(ROUTE_KEY, '');
  activeRoute = SPECIALIZATION_ROUTE_IDS.includes(storedRoute) ? storedRoute : '';
  easyMedalMode = safeStorageGet(EASY_MEDALS_KEY, '') === '1';
  currentGraphColumn = 1;
  selectedItem = {
    kind: 'research',
    researchId: SPECIALIZATION_COLUMNS[1].researches[0],
    columnId: 1,
  };
  void initialize().catch((error) => {
    console.error('[specialization-towers-v2-app] initialization failed', error);
    root.textContent = 'Specialization Towers could not start.';
  });
  return () => {
    unbindLanguageChange();
    cancelGraphScrollUpdate();
    root?.removeEventListener('cancel', handleDialogCancel, true);
    root?.replaceChildren();
    root = null;
  };
}
