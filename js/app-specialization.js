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
import { buildContributionTemplateRows } from './specialization-towers-v2-template.js';
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

const CONTRIBUTION_STORAGE_KEY = 'vts_specialization_contributions';

let root = null;
let state = null;
let activeTroop = 'cavalry';
let view = 'overview'; // 'overview' | 'detail'
let selectedResearchId = null;
let wired = false;

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

function renderCommunity() {
  const data = loadContributions();
  const { headers, rows } = buildContributionTemplateRows();
  const columns = Object.values(SPECIALIZATION_COLUMNS).sort((a, b) => Number(a.id) - Number(b.id));
  return `
    <section class="spec-community">
      <div class="spec-community-copy">
        <h4>${escapeHtml(sp('communityDataTitle'))}</h4>
        <p>${escapeHtml(sp('communityDataDescription'))}</p>
      </div>
      <div class="spec-contrib-name-row">
        <label>
          <span>${escapeHtml(sp('contributorName'))}</span>
          <input class="spec-contrib-name-input" type="text" data-spec-contrib-name value="${escapeHtml(data.contributorName)}" maxlength="40" placeholder="${escapeHtml(sp('contributorNamePlaceholder'))}" />
        </label>
        <span class="spec-contrib-count">${escapeHtml(sp('nodesWithData', { count: Object.keys(data.nodes).filter((k) => data.nodes[k]?.medalCost != null).length }))}</span>
      </div>
      <div class="spec-contrib-nodes">
        ${columns.map((col) => {
          const colResearches = col.researches.map((rid) => SPECIALIZATION_RESEARCH[rid]).filter(Boolean);
          if (!colResearches.length) return '';
          return `<details class="spec-contrib-column">
            <summary><strong>${escapeHtml(col.name)}</strong></summary>
            ${colResearches.map((research) => {
              const rowData = rows.filter((r) => r[3] === research.id);
              if (!rowData.length) return '';
              return `<section class="spec-contrib-research">
                <h5>${escapeHtml(research.name)}</h5>
                ${rowData.map((row) => {
                  const nodeId = row[6];
                  const nodeName = row[7];
                  const saved = data.nodes[nodeId] || {};
                  return `<div class="spec-contrib-node" data-node-id="${escapeHtml(nodeId)}">
                    <span class="spec-contrib-node-name">${escapeHtml(nodeName)}</span>
                    <label><span>${escapeHtml(sp('medalCost'))}</span>
                      <input type="number" min="0" step="1" class="spec-contrib-medal" data-spec-node-medal="${escapeHtml(nodeId)}" value="${saved.medalCost != null ? saved.medalCost : ''}" placeholder="${escapeHtml(sp('medalsUnknown'))}" />
                    </label>
                    <label><span>${escapeHtml(sp('reviewer'))}</span>
                      <input type="text" class="spec-contrib-reviewer" data-spec-node-reviewer="${escapeHtml(nodeId)}" value="${escapeHtml(saved.reviewer || '')}" maxlength="40" placeholder="${escapeHtml(sp('reviewerPlaceholder'))}" />
                    </label>
                  </div>`;
                }).join('')}
              </section>`;
            }).join('')}
          </details>`;
        }).join('')}
      </div>
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
    ${renderCommunity()}`;
}

/* ---------- Detail: node graph (oval ring or tactic tree) ---------- */

function resolveNode(research, entry) {
  return (
    research.nodes.find((candidate) => candidate.id === entry.nodeId) ||
    (research.passiveSkillNodeId === entry.nodeId
      ? { id: entry.nodeId, name: sp('nodePathProgressive'), effect: '' }
      : { id: entry.nodeId, name: '', effect: '' })
  );
}

function nodeButton(research, entry, x, y) {
  const node = resolveNode(research, entry);
  const disabled = entry.state === 'locked' || entry.state === 'hidden';
  const tip = `${escapeHtml(node.name)}${node.effect ? ' — ' + escapeHtml(node.effect) : ''}`;
  return `<button type="button" class="spec-ring-node" data-state="${entry.state}" data-spec-node="${entry.nodeId}" style="left:${x.toFixed(2)}%;top:${y.toFixed(2)}%" ${disabled ? 'disabled aria-disabled="true"' : ''} title="${tip}" aria-pressed="${entry.state === 'learned'}"><span aria-hidden="true">${nodeIcon(node.effect)}</span></button>`;
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

function renderRing(research, access) {
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
  return isTreeLayout(research) ? renderTree(research, access) : renderRing(research, access);
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
      ${renderNodeGraph(research, access)}
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
  if (event.target.closest('[data-spec-contrib-name]')) {
    return; // handled by change event
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
    return;
  }
  const nameInput = event.target.closest('[data-spec-contrib-name]');
  if (nameInput) {
    const data = loadContributions();
    data.contributorName = nameInput.value.trim();
    saveContributions(data);
    return;
  }
  const medalInput = event.target.closest('[data-spec-node-medal]');
  if (medalInput) {
    const nodeId = medalInput.dataset.specNodeMedal;
    const raw = medalInput.value.trim();
    const data = loadContributions();
    if (!data.nodes[nodeId]) data.nodes[nodeId] = {};
    data.nodes[nodeId].medalCost = raw === '' ? null : Math.max(0, Number(raw) || 0);
    saveContributions(data);
    const countEl = root?.querySelector('.spec-contrib-count');
    if (countEl) {
      const allData = loadContributions();
      countEl.textContent = sp('nodesWithData', { count: Object.keys(allData.nodes).filter((k) => allData.nodes[k]?.medalCost != null).length });
    }
    return;
  }
  const reviewerInput = event.target.closest('[data-spec-node-reviewer]');
  if (reviewerInput) {
    const nodeId = reviewerInput.dataset.specNodeReviewer;
    const data = loadContributions();
    if (!data.nodes[nodeId]) data.nodes[nodeId] = {};
    data.nodes[nodeId].reviewer = reviewerInput.value.trim();
    saveContributions(data);
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
