// js/app-specialization.js
// Specialization Towers tab for index.html, following the in-game flow:
// column banners of badges -> tap a badge -> a node ring you learn along.
// Reuses the verified data/model/store/i18n foundation; no game data defined here.

import { currentLanguage } from './state.js';
import { escapeHtml } from './utils.js';
import {
  SPECIALIZATION_COLUMNS,
  SPECIALIZATION_RESEARCH,
} from './specialization-towers-v2-data.js';
import {
  getSpecializationSummary,
  getColumnProgress,
  getResearchProgress,
  getResearchNodeAccess,
  toggleResearchNode,
  setResearchNodes,
  setResearchMedalsSpent,
  resetResearch,
} from './specialization-towers-v2-model.js';
import {
  loadSpecializationState,
  saveSpecializationState,
} from './specialization-towers-v2-store.js';
import {
  specializationTowersV2Text,
  resolveSpecializationTowersV2Locale,
  getSpecializationTowersV2Direction,
} from './i18n/specialization-towers-v2/index.js';

const UI_TROOPS = ['cavalry', 'archer', 'footman'];
const TROOP_ICON = { cavalry: '🐴', archer: '🏹', footman: '🛡️' };
// Placeholder badge glyphs by research family until the real in-game art is supplied.
const BADGE_ICON = [
  { test: /^Training/i, icon: '🐴' },
  { test: /^Encounter/i, icon: '⚔️' },
  { test: /^Siege/i, icon: '🏹' },
  { test: /^Call of Glory/i, icon: '🚩' },
  { test: /^Defensive/i, icon: '🏰' },
  { test: /^Neat/i, icon: '⚔️' },
  { test: /^Enhanced/i, icon: '📜' },
];
// Placeholder node glyphs by attribute effect.
const NODE_ICON = [
  { test: /Might/i, icon: '⚔️' },
  { test: /Resistance|Defense/i, icon: '🛡️' },
  { test: /HP|Revival/i, icon: '❤️' },
  { test: /Speed/i, icon: '⏳' },
];

let root = null;
let state = null;
let activeTroop = 'cavalry';
let view = 'overview'; // 'overview' | 'detail'
let selectedResearchId = null;
let wired = false;

function locale() {
  return resolveSpecializationTowersV2Locale(currentLanguage);
}

function sp(key, vars = {}) {
  return specializationTowersV2Text(key, vars, locale());
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

function nodeIcon(effect) {
  return NODE_ICON.find((entry) => entry.test.test(effect || ''))?.icon || '◆';
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
  if (/^Training\b/u.test(research.name)) return `${troopLabel(activeTroop)} ${research.name}`;
  return research.name;
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
      <div class="spec-stat-row">
        ${stat(sp('currentTowerProgress'), `${pct(troop.percent)}%`)}
        ${stat(sp('fundedResearches'), `${fmt(troop.completedResearchCount)} / ${fmt(troop.totalResearchCount)}`)}
        ${stat(sp('legionSkills'), `${fmt(troop.completedColumnCount)} / ${fmt(troop.totalColumnCount)}`)}
        ${stat(sp('medalProgress'), escapeHtml(medalText), 'spec-stat-value--medals')}
      </div>
    </div>`;
}

function renderTroopTabs(summary) {
  return `<div class="spec-troop-tabs" role="tablist">${UI_TROOPS.map((troop) => {
    const p = pct(summary.troops[troop].percent);
    const active = troop === activeTroop;
    return `<button type="button" class="spec-troop-tab${active ? ' active' : ''}" role="tab" aria-selected="${active}" data-spec-troop="${troop}"><span class="spec-troop-icon" aria-hidden="true">${TROOP_ICON[troop]}</span><span class="spec-troop-name">${escapeHtml(troopLabel(troop))}</span><span class="spec-troop-pct">${p}%</span></button>`;
  }).join('')}</div>`;
}

function renderBadge(researchId) {
  const research = SPECIALIZATION_RESEARCH[researchId];
  const progress = getResearchProgress(state, activeTroop, researchId);
  const status = statusOf(progress);
  return `
    <button type="button" class="spec-badge" data-status="${status}" data-spec-research="${researchId}" aria-label="${escapeHtml(researchName(research))} ${pct(progress.percent)}%">
      <span class="spec-badge-emblem" aria-hidden="true">${badgeIcon(research.name)}</span>
      <span class="spec-badge-name">${escapeHtml(researchName(research))}</span>
      <span class="spec-badge-pct">${pct(progress.percent)}%</span>
    </button>`;
}

function renderBanner(columnId) {
  const column = SPECIALIZATION_COLUMNS[columnId];
  const colProgress = getColumnProgress(state, activeTroop, columnId);
  const unlocked = colProgress.legionSkillUnlocked;
  const skillName = unlocked && colProgress.legionSkill ? colProgress.legionSkill.name : '';
  return `
    <section class="spec-banner" aria-label="${escapeHtml(column.name)}">
      <header class="spec-banner-head">
        <span class="spec-banner-num">${columnId}</span>
        <span class="spec-banner-season">${escapeHtml(seasonLabel(column.unlockSeason))}</span>
      </header>
      <div class="spec-banner-badges">
        ${column.researches.map(renderBadge).join('')}
      </div>
      <button type="button" class="spec-crest ${unlocked ? 'is-unlocked' : 'is-locked'}" data-spec-legion="${columnId}" ${unlocked ? '' : 'disabled'} title="${escapeHtml(sp('legionSkills'))}">
        <span class="spec-crest-emblem" aria-hidden="true">${unlocked ? '🏅' : '🔒'}</span>
        <span class="spec-crest-name">${escapeHtml(skillName || sp('legionSkills'))}</span>
      </button>
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
    </div>`;
}

/* ---------- Detail: node ring for one research ---------- */

function renderRing(research, access) {
  const entries = access.entries;
  const n = entries.length || 1;
  const nodes = entries
    .map((entry, i) => {
      const node =
        research.nodes.find((candidate) => candidate.id === entry.nodeId) ||
        (research.passiveSkillNodeId === entry.nodeId
          ? { id: entry.nodeId, name: sp('nodePathProgressive'), effect: '' }
          : { id: entry.nodeId, name: '', effect: '' });
      const angle = (-90 + (360 / n) * i) * (Math.PI / 180);
      const left = 50 + 40 * Math.cos(angle);
      const top = 50 + 42 * Math.sin(angle);
      const disabled = entry.state === 'locked' || entry.state === 'hidden';
      return `
        <button type="button" class="spec-ring-node" data-state="${entry.state}" data-spec-node="${entry.nodeId}" style="left:${left.toFixed(2)}%;top:${top.toFixed(2)}%" ${disabled ? 'disabled aria-disabled="true"' : ''} title="${escapeHtml(node.name)}${node.effect ? ' — ' + escapeHtml(node.effect) : ''}" aria-pressed="${entry.state === 'learned'}">
          <span aria-hidden="true">${nodeIcon(node.effect)}</span>
        </button>`;
    })
    .join('');
  const progress = getResearchProgress(state, activeTroop, research.id);
  return `
    <div class="spec-ring" role="group" aria-label="${escapeHtml(researchName(research))}">
      <svg class="spec-ring-path" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <ellipse cx="50" cy="50" rx="40" ry="42" />
      </svg>
      <div class="spec-ring-center">
        <span class="spec-ring-emblem" aria-hidden="true">${badgeIcon(research.name)}</span>
        <span class="spec-ring-pct">${pct(progress.percent)}%</span>
      </div>
      ${nodes}
    </div>`;
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
            return `<li data-status="${done ? 'done' : 'todo'}"><span class="spec-milestone-pct">${m.percent}%</span><span class="spec-milestone-effect">${escapeHtml(m.effect)}</span><span aria-hidden="true">${done ? '✓' : '○'}</span></li>`;
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
          <span>${escapeHtml(column.name)} · ${escapeHtml(seasonLabel(column.unlockSeason))} · ${escapeHtml(sp('nodeLevel', { current: progress.completedNodes, maximum: progress.totalNodes }))}</span>
        </div>
      </header>
      ${renderRing(research, access)}
      <section class="spec-detail-section spec-medal-field">
        <label for="spec-medals-input">${escapeHtml(sp('medalsRecorded'))}</label>
        <input id="spec-medals-input" type="number" min="0" max="${research.cost}" step="1" value="${recorded ?? ''}" placeholder="${escapeHtml(sp('medalsUnknown'))}" data-spec-medals ${progress.isComplete ? 'disabled' : ''} />
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
  const summary = getSpecializationSummary(state);
  root.dir = getSpecializationTowersV2Direction(locale());
  root.innerHTML = `
    <div class="spec-tool" data-view="${view}">
      ${renderSummary(summary)}
      ${view === 'detail' && selectedResearchId ? renderDetail() : renderOverview(summary)}
    </div>`;
  if (view === 'detail') {
    root.querySelector('.spec-back')?.focus({ preventScroll: true });
  }
}

/* ---------- Events ---------- */

function openDetail(researchId) {
  selectedResearchId = researchId;
  view = 'detail';
  render();
}

function backToOverview() {
  view = 'overview';
  render();
}

function onClick(event) {
  const troopBtn = event.target.closest('[data-spec-troop]');
  if (troopBtn) {
    activeTroop = troopBtn.dataset.specTroop;
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
  const nodeBtn = event.target.closest('[data-spec-node]');
  if (nodeBtn && !nodeBtn.disabled && selectedResearchId) {
    toggleResearchNode(state, activeTroop, selectedResearchId, Number(nodeBtn.dataset.specNode));
    persist();
    render();
    return;
  }
  if (event.target.closest('[data-spec-complete]') && selectedResearchId) {
    const research = SPECIALIZATION_RESEARCH[selectedResearchId];
    const allNodes = research.nodes.map((node) => node.id);
    if (research.passiveSkillNodeId !== null && research.passiveSkillNodeId !== undefined) {
      allNodes.push(research.passiveSkillNodeId);
    }
    setResearchNodes(state, activeTroop, selectedResearchId, allNodes);
    persist();
    render();
    return;
  }
  if (event.target.closest('[data-spec-reset]') && selectedResearchId) {
    resetResearch(state, activeTroop, selectedResearchId);
    persist();
    render();
  }
}

function onChange(event) {
  const medals = event.target.closest('[data-spec-medals]');
  if (medals && selectedResearchId) {
    const raw = medals.value.trim();
    const value = raw === '' ? null : Math.max(0, Number(raw) || 0);
    setResearchMedalsSpent(state, activeTroop, selectedResearchId, value);
    persist();
    render();
  }
}

export function initSpecializationTool() {
  root = document.getElementById('specializationToolRoot');
  if (!root) return;
  state = loadSpecializationState();
  view = 'overview';
  selectedResearchId = SPECIALIZATION_COLUMNS[1].researches[0];
  if (!wired) {
    root.addEventListener('click', onClick);
    root.addEventListener('change', onChange);
    window.addEventListener('vts:language-change', () => render());
    wired = true;
  }
  render();
}
