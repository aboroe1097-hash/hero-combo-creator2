import { queueAccountSync } from './account-sync.js';
import {
  ARTIFACT_DATABASE,
  ARTIFACT_PROGRESS_STORAGE_KEY,
  calculateArtifactMetrics,
  formatArtifactDescription,
  getAllArtifactNodes,
  getArtifactNodeById,
  normalizeArtifactProgress,
  parseArtifactProgress,
} from './artifact-db.js';
import { artifactText, resolveArtifactLocale } from './i18n/artifact.js';
import { formatLocaleNumber } from './locale-format.js';
import { currentLanguage } from './state.js';
import { generatorSelectedHeroes } from './state.js';
import { analyzeHeroMechanics } from './specialization-hero-plans.js';
import { escapeHtml } from './utils.js';
import '../css/artifact-v14.css';

const artifact = ARTIFACT_DATABASE[0];
const RESOURCE_ICONS = Object.freeze({
  RGE: 'assets/artifact/sword/Artifacts_icon_jian.png',
  AS: 'assets/artifact/artifact-soulstone.png',
});
const VIEW_STORAGE_KEY = 'vts_artifact_view_v1';

// Positions mirror the in-game Redemption Grail tree shown in the source sheet.
// Parents describe visual paths only; the source does not publish prerequisite rules.
const NODE_LAYOUT = Object.freeze({
  rg_1_amp_a: { x: 12, y: 94, parents: ['rg_1_1a'] },
  rg_1_0: { x: 50, y: 91 },
  rg_1_amp_b: { x: 88, y: 94, parents: ['rg_1_1b'] },
  rg_1_1a: { x: 38, y: 86, parents: ['rg_1_0'] },
  rg_1_1b: { x: 62, y: 86, parents: ['rg_1_0'] },
  rg_1_2a: { x: 29, y: 77, parents: ['rg_1_1a'] },
  rg_1_2b: { x: 71, y: 77, parents: ['rg_1_1b'] },
  rg_1_3a: { x: 38, y: 67, parents: ['rg_1_2a'] },
  rg_1_3b: { x: 62, y: 67, parents: ['rg_1_2b'] },
  rg_2_0: { x: 50, y: 61, parents: ['rg_1_3a', 'rg_1_3b'] },
  rg_2_1a: { x: 39, y: 54, parents: ['rg_2_0'] },
  rg_2_1b: { x: 61, y: 54, parents: ['rg_2_0'] },
  rg_2_amp_a1: { x: 44, y: 48, parents: ['rg_2_1a'] },
  rg_2_amp_b1: { x: 56, y: 48, parents: ['rg_2_1b'] },
  rg_2_2a: { x: 27, y: 48, parents: ['rg_2_1a'] },
  rg_2_2b: { x: 73, y: 48, parents: ['rg_2_1b'] },
  rg_2_amp_a2: { x: 33, y: 41, parents: ['rg_2_2a'] },
  rg_2_amp_b2: { x: 67, y: 41, parents: ['rg_2_2b'] },
  rg_2_3a: { x: 39, y: 35, parents: ['rg_2_amp_a2'] },
  rg_2_3b: { x: 61, y: 35, parents: ['rg_2_amp_b2'] },
  rg_2_4a: { x: 16, y: 30, parents: ['rg_2_3a'] },
  rg_2_4b: { x: 84, y: 30, parents: ['rg_2_3b'] },
  rg_2_5a: { x: 7, y: 23, parents: ['rg_2_4a'] },
  rg_2_5b: { x: 93, y: 23, parents: ['rg_2_4b'] },
  rg_3_0a: { x: 6, y: 12, parents: ['rg_2_5a'] },
  rg_3_0b: { x: 94, y: 12, parents: ['rg_2_5b'] },
  rg_3_1a: { x: 19, y: 18, parents: ['rg_3_0a'] },
  rg_3_1b: { x: 81, y: 18, parents: ['rg_3_0b'] },
  rg_3_amp_a1: { x: 22, y: 25, parents: ['rg_3_1a'] },
  rg_3_amp_b1: { x: 78, y: 25, parents: ['rg_3_1b'] },
  rg_3_2a: { x: 29, y: 12, parents: ['rg_3_1a'] },
  rg_3_2b: { x: 71, y: 12, parents: ['rg_3_1b'] },
  rg_3_3a: { x: 37, y: 18, parents: ['rg_3_2a'] },
  rg_3_3b: { x: 63, y: 18, parents: ['rg_3_2b'] },
  rg_3_amp_a2: { x: 42, y: 26, parents: ['rg_3_3a'] },
  rg_3_amp_b2: { x: 58, y: 26, parents: ['rg_3_3b'] },
  rg_3_4a: { x: 43, y: 11, parents: ['rg_3_amp_a2'] },
  rg_3_4b: { x: 57, y: 11, parents: ['rg_3_amp_b2'] },
  rg_3_5ab: { x: 50, y: 21, parents: ['rg_3_4a', 'rg_3_4b'] },
  rg_4_0: { x: 50, y: 31, parents: ['rg_3_5ab'] },
});

let nodeLevels = {};
let searchQuery = '';
let selectedNodeId = 'sj_1001';
let view = 'tree';
let initialized = false;
let eventsBound = false;
let languageBound = false;
let centerSelectedNode = false;

function heroPathPlan() {
  const heroes = [...generatorSelectedHeroes].slice(0, 6);
  const mechanics = heroes.flatMap((hero) => [...analyzeHeroMechanics(hero).mechanics]);
  const defensive = mechanics.filter((id) =>
    ['healing', 'control', 'sober', 'evasion'].includes(id)
  ).length;
  const tactical = mechanics.filter((id) =>
    ['skillDamage', 'prepSkip', 'bleedBurn', 'vulnerable'].includes(id)
  ).length;
  const score = (node) => {
    const type = node.statType || '';
    if (/special|sacred_might|might_pct|damage/.test(type)) return 5 + mechanics.length;
    if (/tactmight/.test(type)) return 4 + tactical * 3;
    if (/hp|resist|sacred_resist/.test(type)) return 3 + defensive * 3;
    return 2;
  };
  const ordered = [];
  const seen = new Set();
  const add = (node) => {
    if (!node || seen.has(node.id)) return;
    (node.unlockRequirements || []).forEach((req) =>
      add(getArtifactNodeById(req.nodeId, artifact))
    );
    seen.add(node.id);
    ordered.push(node);
  };
  [...getAllArtifactNodes(artifact)].sort((a, b) => score(b) - score(a)).forEach(add);
  return { heroes, ordered, stepById: new Map(ordered.map((node, index) => [node.id, index + 1])) };
}

function locale() {
  return resolveArtifactLocale(currentLanguage);
}

function t(key, values = {}) {
  return artifactText(key, values, locale());
}

function fmt(value) {
  return formatLocaleNumber(value, locale(), { maximumFractionDigits: 1 });
}

function getRoot() {
  return document.getElementById('artifactToolRoot');
}

function loadProgress() {
  try {
    nodeLevels = parseArtifactProgress(localStorage.getItem(ARTIFACT_PROGRESS_STORAGE_KEY) || '');
  } catch {
    nodeLevels = {};
  }
}

function saveProgress() {
  nodeLevels = normalizeArtifactProgress(nodeLevels);
  try {
    localStorage.setItem(ARTIFACT_PROGRESS_STORAGE_KEY, JSON.stringify(nodeLevels));
    queueAccountSync('artifact-progress');
  } catch {
    // The tracker remains usable for this session when storage is unavailable.
  }
}

function loadView() {
  try {
    const stored = localStorage.getItem(VIEW_STORAGE_KEY);
    if (stored === 'tree' || stored === 'list') view = stored;
  } catch {
    // Without storage the tree view is the default every visit.
  }
}

function setView(next) {
  if (next !== 'tree' && next !== 'list') return;
  view = next;
  try {
    localStorage.setItem(VIEW_STORAGE_KEY, view);
  } catch {
    // A view preference is a convenience only.
  }
  render();
}

function setNodeLevel(nodeId, rawLevel, { render: shouldRender = true, save = true } = {}) {
  const node = getArtifactNodeById(nodeId, artifact);
  if (!node) return;
  const level = Math.max(0, Math.min(node.maxLevel, Math.trunc(Number(rawLevel)) || 0));
  const current = Number(nodeLevels[nodeId]) || 0;
  if (level > current && !requirementsMet(node)) {
    // A native range input moves its own thumb before this handler runs, so returning
    // early used to leave the control showing a level that was never applied. Re-render
    // so it snaps back to the real model value.
    if (shouldRender) render();
    return;
  }
  nodeLevels = { ...nodeLevels, [nodeId]: level };
  if (save) saveProgress();
  if (shouldRender) render();
}

function setNodeWithRequirements(nodeId, rawLevel) {
  const node = getArtifactNodeById(nodeId, artifact);
  if (!node) return;
  const visited = new Set();
  const fundRequirements = (target) => {
    if (!target || visited.has(target.id)) return;
    visited.add(target.id);
    (target.unlockRequirements || []).forEach((requirement) => {
      const prerequisite = getArtifactNodeById(requirement.nodeId, artifact);
      fundRequirements(prerequisite);
      nodeLevels[requirement.nodeId] = Math.max(
        Number(nodeLevels[requirement.nodeId]) || 0,
        requirement.minLevel
      );
    });
  };
  nodeLevels = { ...nodeLevels };
  fundRequirements(node);
  nodeLevels[node.id] = Math.max(0, Math.min(node.maxLevel, Math.trunc(Number(rawLevel)) || 0));
  saveProgress();
  render();
}

function requirementsMet(node) {
  return (node.unlockRequirements || []).every(
    (requirement) => (Number(nodeLevels[requirement.nodeId]) || 0) >= requirement.minLevel
  );
}

function setTierLevel(tierNumber) {
  const tier = artifact.tiers.find((entry) => entry.tier === Number(tierNumber));
  if (!tier) return;
  nodeLevels = { ...nodeLevels };
  tier.nodes.forEach((node) => {
    nodeLevels[node.id] = node.maxLevel;
  });
  saveProgress();
  render();
}

function setAllLevel(level) {
  nodeLevels = {};
  if (level === 'max') {
    getAllArtifactNodes(artifact).forEach((node) => {
      nodeLevels[node.id] = node.maxLevel;
    });
  }
  saveProgress();
  render();
}

function resourceIcon(resource, className = '') {
  return `<img class="artifact-resource-icon ${className}" src="${RESOURCE_ICONS[resource]}" alt="" aria-hidden="true" />`;
}

function levelOf(node) {
  return Math.max(0, Math.min(node.maxLevel, Number(nodeLevels[node.id]) || 0));
}

function displayCode(node) {
  return node.code.includes('amp') ? '−' : node.code.replace('.0', '');
}

/** The node's effect text at one level (1-based); the max-level text when unknown. */
function effectAt(node, level) {
  if (!node.descriptionTemplate || !node.parameters?.length || level < 1) return node.buff;
  return formatArtifactDescription(
    node.descriptionTemplate,
    node.parameters[Math.min(level, node.parameters.length) - 1]
  );
}

function stateOf(node) {
  const current = levelOf(node);
  if (current >= node.maxLevel) return 'maxed';
  if (!requirementsMet(node)) return 'locked';
  return current > 0 ? 'progress' : 'open';
}

function stateLabel(node) {
  const state = stateOf(node);
  if (state === 'maxed') return t('stateMaxed');
  if (state === 'locked') return t('stateLocked');
  return `${levelOf(node)}/${node.maxLevel}`;
}

function statCard(kind, remaining, invested, total) {
  const resource = artifact.resources[kind];
  const share = total > 0 ? Math.round((invested / total) * 100) : 0;
  return `<article class="artifact-stat artifact-stat-${kind.toLowerCase()}">
    ${resourceIcon(kind)}
    <div>
      <p class="artifact-stat-label">${escapeHtml(resource.name)} <span translate="no">${escapeHtml(resource.shortName || kind)}</span></p>
      <p class="artifact-stat-value"><strong>${fmt(remaining)}</strong> ${escapeHtml(t('remaining'))}</p>
      <div class="artifact-meter" aria-hidden="true"><span style="width:${share}%"></span></div>
      <p class="artifact-stat-note">${escapeHtml(t('invested'))}: ${fmt(invested)} / ${fmt(total)}</p>
    </div>
  </article>`;
}

function matchesSearch(node) {
  const query = searchQuery.trim().toLocaleLowerCase(locale());
  if (!query) return true;
  return [node.name, node.code, node.buff, node.permanentAttribute]
    .filter(Boolean)
    .some((value) => String(value).toLocaleLowerCase(locale()).includes(query));
}

// The tree is drawn twice in one SVG: upright for narrow screens, and turned so
// the hilt sits on the left for wide ones. CSS shows the orientation that fits.
function connectorMarkup() {
  const layoutMap = Object.fromEntries(
    getAllArtifactNodes(artifact).map((node) => [node.id, node.layout || NODE_LAYOUT[node.id]])
  );
  const segments = Object.entries(layoutMap).flatMap(([id, layout]) =>
    (layout.parents || [])
      .map((parentId) => [layoutMap[parentId], layout, id, parentId])
      .filter(([parent]) => parent)
  );
  const lit = (childId, parentId) =>
    (Number(nodeLevels[childId]) || 0) > 0 && (Number(nodeLevels[parentId]) || 0) > 0;
  const upright = segments
    .map(
      ([parent, child, id, parentId]) =>
        `<line class="${lit(id, parentId) ? 'is-lit' : ''}" x1="${parent.x}" y1="${parent.y}" x2="${child.x}" y2="${child.y}" />`
    )
    .join('');
  const turned = segments
    .map(
      ([parent, child, id, parentId]) =>
        `<line class="${lit(id, parentId) ? 'is-lit' : ''}" x1="${parent.y}" y1="${100 - parent.x}" x2="${child.y}" y2="${100 - child.x}" />`
    )
    .join('');
  return `<g class="artifact-paths-upright">${upright}</g><g class="artifact-paths-turned">${turned}</g>`;
}

function treeNode(node, nextId) {
  const layout = node.layout || NODE_LAYOUT[node.id];
  if (!layout) return '';
  const current = levelOf(node);
  const state = stateOf(node);
  const selected = node.id === selectedNodeId;
  const dimmed = !matchesSearch(node);
  const progress = node.maxLevel > 0 ? current / node.maxLevel : 0;
  const label = `${node.name}, ${t('level', { current, max: node.maxLevel })}`;
  return `<button type="button" class="artifact-tree-node artifact-tree-node-${node.resource.toLowerCase()} is-${state}${selected ? ' is-selected' : ''}${current > 0 ? ' has-progress' : ''}${dimmed ? ' is-dimmed' : ''}${state === 'locked' ? ' is-locked' : ''}${state === 'maxed' ? ' is-maxed' : ''}${node.id === nextId ? ' is-next' : ''}"
    style="--node-x:${layout.x}%;--node-y:${layout.y}%;--node-progress:${progress}turn" data-artifact-action="select-node" data-node-id="${escapeHtml(node.id)}" aria-label="${escapeHtml(label)}" aria-pressed="${selected}" title="${escapeHtml(node.name)}">
      ${node.icon ? `<img class="artifact-tree-node-icon" src="${escapeHtml(node.icon)}" alt="" aria-hidden="true" />` : ''}
      <span class="artifact-tree-level" translate="no" aria-hidden="true">${state === 'locked' ? '🔒' : state === 'maxed' ? 'MAX' : `${current}/${node.maxLevel}`}</span>
    </button>`;
}

function treeMarkup(nodes, nextId) {
  return `<div class="artifact-tree-scroll"><div class="artifact-tree">
    <div class="artifact-tree-art" style="--artifact-board-image:url('${escapeHtml(artifact.boardImage)}')" aria-hidden="true"></div>
    <svg class="artifact-tree-paths" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${connectorMarkup()}</svg>
    ${nodes.map((node) => treeNode(node, nextId)).join('')}
  </div></div>
  <p class="artifact-legend" aria-hidden="true">
    <span class="artifact-legend-item is-open">${escapeHtml(t('legendOpen'))}</span>
    <span class="artifact-legend-item is-progress">${escapeHtml(t('legendProgress'))}</span>
    <span class="artifact-legend-item is-maxed">${escapeHtml(t('stateMaxed'))}</span>
    <span class="artifact-legend-item is-locked">${escapeHtml(t('stateLocked'))}</span>
  </p>`;
}

function listRow(node) {
  const current = levelOf(node);
  const state = stateOf(node);
  const remaining = node.costs.slice(current).reduce((sum, cost) => sum + cost, 0);
  const selected = node.id === selectedNodeId;
  return `<li class="artifact-row is-${state}${selected ? ' is-selected' : ''}">
    <button type="button" class="artifact-row-main" data-artifact-action="select-node" data-node-id="${escapeHtml(node.id)}" aria-pressed="${selected}">
      <span class="artifact-row-code" translate="no">${escapeHtml(displayCode(node))}</span>
      <span class="artifact-row-text"><strong>${escapeHtml(node.name)}</strong><small>${escapeHtml(node.buff)}</small></span>
    </button>
    <div class="artifact-row-level">
      <button type="button" data-artifact-action="decrease" data-step="1" data-node-id="${escapeHtml(node.id)}" aria-label="${escapeHtml(t('decreaseLevel', { name: node.name }))}" ${current === 0 ? 'disabled' : ''}>−</button>
      <span translate="no">${escapeHtml(stateLabel(node))}</span>
      <button type="button" data-artifact-action="increase" data-step="1" data-node-id="${escapeHtml(node.id)}" aria-label="${escapeHtml(t('increaseLevel', { name: node.name }))}" ${state === 'maxed' || state === 'locked' ? 'disabled' : ''}>+</button>
    </div>
    <span class="artifact-row-cost">${state === 'maxed' ? '✓' : `${resourceIcon(node.resource, 'artifact-cost-icon')}${fmt(remaining)}`}</span>
  </li>`;
}

function listMarkup() {
  return `<div class="artifact-list">${artifact.tiers
    .map((tier) => {
      const visible = tier.nodes.filter(matchesSearch);
      if (!visible.length) return '';
      const maxed = tier.nodes.filter((node) => levelOf(node) >= node.maxLevel).length;
      return `<section class="artifact-list-stage" aria-label="${escapeHtml(t('stage', { tier: tier.tier }))}">
        <header><h3>${escapeHtml(t('stage', { tier: tier.tier }))}</h3><span>${maxed}/${tier.nodes.length} ${escapeHtml(t('stateMaxed'))}</span>
          <button type="button" data-artifact-action="max-tier" data-tier="${tier.tier}">${escapeHtml(t('maxTier', { tier: tier.tier }))}</button></header>
        <ul>${visible.map(listRow).join('')}</ul>
      </section>`;
    })
    .join('')}${
    getAllArtifactNodes(artifact).some(matchesSearch)
      ? ''
      : `<p class="artifact-empty">${escapeHtml(t('noResults'))}</p>`
  }</div>`;
}

function selectedNodeMarkup() {
  const node = getArtifactNodeById(selectedNodeId, artifact) || getAllArtifactNodes(artifact)[0];
  const current = levelOf(node);
  const maxed = current === node.maxLevel;
  const locked = !requirementsMet(node);
  const remaining = node.costs.slice(current).reduce((sum, cost) => sum + cost, 0);
  const next = node.costs[current] || 0;
  const levelLabel = t('level', { current, max: node.maxLevel });
  const progress = node.maxLevel > 0 ? Math.round((current / node.maxLevel) * 100) : 0;
  const effects = [
    current > 0
      ? `<div class="artifact-effect"><span>${escapeHtml(t('effectNow'))}</span><p>${escapeHtml(effectAt(node, current))}</p></div>`
      : '',
    maxed
      ? ''
      : `<div class="artifact-effect is-next"><span>${escapeHtml(current > 0 ? t('effectNext') : t('effectFirst'))}</span><p>${escapeHtml(effectAt(node, current + 1))}</p></div>`,
  ].join('');
  const requirements = (node.unlockRequirements || [])
    .map((requirement) => {
      const parent = getArtifactNodeById(requirement.nodeId, artifact);
      const met = (Number(nodeLevels[requirement.nodeId]) || 0) >= requirement.minLevel;
      return `<li class="${met ? 'is-met' : ''}"><button type="button" data-artifact-action="select-node" data-node-id="${escapeHtml(requirement.nodeId)}">${met ? '✓' : '•'} ${escapeHtml(parent?.name || requirement.nodeId)}</button> <span>${escapeHtml(t('requiresLevel', { level: requirement.minLevel }))}</span></li>`;
    })
    .join('');
  return `<article class="artifact-node-detail is-${stateOf(node)}" data-artifact-node="${escapeHtml(node.id)}">
    <header>
      <span class="artifact-node-badge">${resourceIcon(node.resource)}<span class="artifact-node-code" translate="no">${escapeHtml(displayCode(node))}</span></span>
      <div>
        <h2>${escapeHtml(node.name)}</h2>
        <p class="artifact-node-meta"><span class="artifact-state-pill">${escapeHtml(stateLabel(node))}</span> ${escapeHtml(t('stage', { tier: node.tier }))} · <b translate="no">${escapeHtml(artifact.resources[node.resource]?.shortName || node.resource)}</b></p>
      </div>
    </header>
    <div class="artifact-node-progress" role="progressbar" aria-label="${escapeHtml(levelLabel)}" aria-valuemin="0" aria-valuemax="${node.maxLevel}" aria-valuenow="${current}"><span style="width:${progress}%"></span></div>
    <div class="artifact-effects">${effects}</div>
    ${requirements ? `<div class="artifact-prerequisite${locked ? '' : ' is-met'}"><strong>${escapeHtml(t('requires'))}</strong><ul>${requirements}</ul></div>` : ''}
    ${node.permanentAttribute ? `<p class="artifact-permanent${maxed ? ' is-active' : ''}"><strong>${escapeHtml(t('permanent'))}:</strong> ${escapeHtml(node.permanentAttribute)}</p>` : ''}
    <div class="artifact-level-line">
      <strong data-artifact-level-label>${escapeHtml(levelLabel)}</strong>
      <label class="artifact-level-number"><span class="sr-only">${escapeHtml(levelLabel)}</span><input type="number" min="0" max="${node.maxLevel}" value="${current}" inputmode="numeric" data-artifact-level-input="${escapeHtml(node.id)}" ${locked ? 'disabled' : ''} /></label>
    </div>
    <label class="sr-only" for="artifact-level-${escapeHtml(node.id)}">${escapeHtml(levelLabel)}</label>
    <input id="artifact-level-${escapeHtml(node.id)}" type="range" min="0" max="${node.maxLevel}" value="${current}" data-artifact-slider="${escapeHtml(node.id)}" aria-valuetext="${escapeHtml(levelLabel)}" ${locked ? 'disabled' : ''} />
    <div class="artifact-level-actions" aria-label="${escapeHtml(levelLabel)}">
      <button type="button" data-artifact-action="decrease" data-step="5" data-node-id="${escapeHtml(node.id)}" aria-label="${escapeHtml(t('decreaseLevel', { name: node.name }))}" ${current === 0 ? 'disabled' : ''}>−5</button>
      <button type="button" data-artifact-action="decrease" data-step="1" data-node-id="${escapeHtml(node.id)}" aria-label="${escapeHtml(t('decreaseLevel', { name: node.name }))}" ${current === 0 ? 'disabled' : ''}>−1</button>
      <button type="button" data-artifact-action="increase" data-step="1" data-node-id="${escapeHtml(node.id)}" aria-label="${escapeHtml(t('increaseLevel', { name: node.name }))}" ${maxed || locked ? 'disabled' : ''}>+1</button>
      <button type="button" data-artifact-action="increase" data-step="5" data-node-id="${escapeHtml(node.id)}" aria-label="${escapeHtml(t('increaseLevel', { name: node.name }))}" ${maxed || locked ? 'disabled' : ''}>+5</button>
      <button type="button" class="artifact-max-button" data-artifact-action="max-node-path" data-node-id="${escapeHtml(node.id)}" aria-label="${escapeHtml(t('setMax', { name: node.name }))}" ${maxed ? 'disabled' : ''}>MAX</button>
    </div>
    <dl class="artifact-cost-line">
      <div><dt>${escapeHtml(t('costNext'))}</dt><dd>${maxed ? '—' : `${resourceIcon(node.resource, 'artifact-cost-icon')}${fmt(next)}`}</dd></div>
      <div><dt>${escapeHtml(t('costToMax'))}</dt><dd>${maxed ? escapeHtml(t('maxReached')) : `${resourceIcon(node.resource, 'artifact-cost-icon')}${fmt(remaining)}`}</dd></div>
    </dl>
  </article>`;
}

function bonusesMarkup() {
  const nodes = getAllArtifactNodes(artifact).filter((node) => node.permanentAttribute);
  const active = nodes.filter((node) => levelOf(node) >= node.maxLevel).length;
  return `<section class="artifact-bonuses" aria-labelledby="artifactBonusesTitle">
    <header><h2 id="artifactBonusesTitle">${escapeHtml(t('permanentBonuses'))}</h2><span>${escapeHtml(t('bonusesActive', { active, total: nodes.length }))}</span></header>
    <p>${escapeHtml(t('permanentAttributes'))}</p>
    <ul>${nodes
      .map((node) => {
        const on = levelOf(node) >= node.maxLevel;
        return `<li><button type="button" class="artifact-bonus${on ? ' is-active' : ''}" data-artifact-action="select-node" data-node-id="${escapeHtml(node.id)}">
          <span aria-hidden="true">${on ? '★' : '☆'}</span>
          <span><strong>${escapeHtml(node.permanentAttribute)}</strong><small>${escapeHtml(node.name)} · ${escapeHtml(on ? t('active') : t('requiresLevel', { level: node.maxLevel }))}</small></span>
        </button></li>`;
      })
      .join('')}</ul>
  </section>`;
}

function render() {
  const root = getRoot();
  if (!root) return;
  const previousTree = root.querySelector('.artifact-tree-scroll');
  const previousTreeScroll = previousTree ? previousTree.scrollLeft : null;
  const metrics = calculateArtifactMetrics(artifact, nodeLevels);
  const completion = metrics.completionPercent.toFixed(1);
  const nodes = getAllArtifactNodes(artifact);
  const path = heroPathPlan();
  const nextPathNode = path.ordered.find((node) => levelOf(node) < node.maxLevel);

  root.dir = locale() === 'ar' ? 'rtl' : 'ltr';
  root.innerHTML = `<div class="artifact-workspace">
    <header class="artifact-hero">
      <img class="artifact-hero-icon" src="${RESOURCE_ICONS.RGE}" alt="" aria-hidden="true" />
      <div class="artifact-hero-copy"><p class="artifact-kicker">${escapeHtml(t('badge'))} · ${escapeHtml(artifact.subtitle || '')}</p><h1>${escapeHtml(artifact.title)}</h1><p>${escapeHtml(artifact.description)}</p></div>
      <div class="artifact-primary-actions">
        <button type="button" data-artifact-action="share-view">${escapeHtml(t('sharePath'))}</button>
        <button type="button" data-artifact-action="max-all">${escapeHtml(t('maxAll'))}</button>
        <button type="button" class="artifact-danger" data-artifact-action="reset-all">${escapeHtml(t('resetAll'))}</button>
      </div>
    </header>

    <section class="artifact-stats" aria-label="${escapeHtml(t('completion'))}">
      ${statCard('RGE', metrics.remainingRGE, metrics.investedRGE, metrics.totalRGE)}
      ${statCard('AS', metrics.remainingAS, metrics.investedAS, metrics.totalAS)}
      <article class="artifact-stat artifact-stat-progress">
        <span class="artifact-ring" style="--ring:${completion}" aria-hidden="true"><b>${Math.round(metrics.completionPercent)}%</b></span>
        <div>
          <p class="artifact-stat-label">${escapeHtml(t('completion'))}</p>
          <p class="artifact-stat-value"><strong>${metrics.maxedNodes}/${metrics.totalNodes}</strong> ${escapeHtml(t('nodes'))}</p>
          <div class="artifact-meter" role="progressbar" aria-label="${escapeHtml(t('completion'))}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${completion}"><span style="width:${completion}%"></span></div>
          <p class="artifact-stat-note">${fmt(metrics.investedLevelPoints)} / ${fmt(metrics.totalLevelPoints)} ${escapeHtml(t('levels'))}</p>
        </div>
      </article>
    </section>

    <div class="artifact-toolbar">
      <div class="artifact-view-switch" role="group" aria-label="${escapeHtml(t('viewLabel'))}">
        <button type="button" data-artifact-action="view" data-view="tree" aria-pressed="${view === 'tree'}">${escapeHtml(t('viewTree'))}</button>
        <button type="button" data-artifact-action="view" data-view="list" aria-pressed="${view === 'list'}">${escapeHtml(t('viewList'))}</button>
      </div>
      <label class="artifact-search"><span class="sr-only">${escapeHtml(t('searchLabel'))}</span>
        <input id="artifact-search" type="search" autocomplete="off" placeholder="${escapeHtml(t('searchPlaceholder'))}" value="${escapeHtml(searchQuery)}" />
      </label>
      <section class="artifact-hero-path" aria-label="${escapeHtml(t('heroPathAria'))}" title="${escapeHtml(path.heroes.length ? t('heroPathDescSelected') : t('heroPathDescEmpty'))}">
        <span class="artifact-hero-path-label">${escapeHtml(t('heroPathNext'))} · <em>${path.heroes.length ? escapeHtml(path.heroes.join(', ')) : escapeHtml(t('heroPathBalanced'))}</em></span>
        <button type="button" data-artifact-action="select-node" data-node-id="${escapeHtml(nextPathNode?.id || path.ordered[0]?.id)}">${escapeHtml(nextPathNode?.name || t('heroPathComplete'))}</button>
      </section>
    </div>

    <div class="artifact-game-layout is-${view}">
      <section class="artifact-board" aria-label="${escapeHtml(artifact.title)}">
        ${view === 'list' ? listMarkup() : treeMarkup(nodes, nextPathNode?.id)}
      </section>
      <aside class="artifact-inspector">
        ${selectedNodeMarkup()}
        <div class="artifact-tier-actions" role="group" aria-label="${escapeHtml(t('maxStage'))}">
          <span>${escapeHtml(t('maxStage'))}</span>
          ${artifact.tiers.map((tier) => `<button type="button" data-artifact-action="max-tier" data-tier="${tier.tier}" aria-label="${escapeHtml(t('maxTier', { tier: tier.tier }))}">${tier.tier}</button>`).join('')}
        </div>
      </aside>
    </div>

    ${bonusesMarkup()}
    <p class="artifact-source-note">${escapeHtml(artifact.farmingNote)}</p>
    <div class="sr-only" aria-live="polite" data-artifact-status></div>
  </div>`;
  const treeScroll = root.querySelector('.artifact-tree-scroll');
  if (treeScroll) {
    const selectedNode = treeScroll.querySelector('.artifact-tree-node.is-selected');
    if (previousTreeScroll === null || centerSelectedNode) {
      treeScroll.scrollLeft = Math.max(
        0,
        (selectedNode?.offsetLeft || treeScroll.scrollWidth / 2) - treeScroll.clientWidth / 2
      );
    } else {
      treeScroll.scrollLeft = previousTreeScroll;
    }
    centerSelectedNode = false;
  }
}

function announce(message) {
  const status = getRoot()?.querySelector('[data-artifact-status]');
  if (status) status.textContent = message;
}

function bindEvents() {
  const root = getRoot();
  if (!root || eventsBound) return;
  eventsBound = true;

  root.addEventListener('click', (event) => {
    const button = event.target.closest('[data-artifact-action]');
    if (!button) return;
    const action = button.dataset.artifactAction;
    const nodeId = button.dataset.nodeId;

    if (action === 'view') setView(button.dataset.view);
    if (action === 'select-node') {
      selectedNodeId = nodeId;
      centerSelectedNode = true;
      render();
      history.replaceState(
        history.state,
        '',
        `#researchTowers?subtab=artifact&node=${encodeURIComponent(nodeId)}`
      );
      if (window.matchMedia('(max-width: 1000px)').matches) {
        root.querySelector('.artifact-node-detail')?.scrollIntoView({ block: 'nearest' });
      }
    }
    if (action === 'share-view') {
      const url = location.href;
      void (async () => {
        try {
          if (navigator.share) {
            await navigator.share({ title: artifact.title, url });
          } else {
            await navigator.clipboard?.writeText(url);
            if (typeof window.showToast === 'function') {
              window.showToast(t('sharePathCopied'));
            }
          }
        } catch (error) {
          if (error?.name !== 'AbortError') console.warn('[artifact] Unable to share path', error);
        }
      })();
    }
    if (action === 'max-all') setAllLevel('max');
    if (action === 'reset-all' && window.confirm(t('resetConfirm'))) setAllLevel(0);
    if (action === 'max-tier') {
      setTierLevel(button.dataset.tier);
      announce(t('maxTier', { tier: button.dataset.tier }));
    }
    if (action === 'decrease')
      setNodeLevel(nodeId, (Number(nodeLevels[nodeId]) || 0) - (Number(button.dataset.step) || 1));
    if (action === 'increase')
      setNodeLevel(nodeId, (Number(nodeLevels[nodeId]) || 0) + (Number(button.dataset.step) || 1));
    if (action === 'max-node') {
      const node = getArtifactNodeById(nodeId, artifact);
      if (node) setNodeLevel(nodeId, node.maxLevel);
    }
    if (action === 'max-node-path') {
      const node = getArtifactNodeById(nodeId, artifact);
      if (node) setNodeWithRequirements(nodeId, node.maxLevel);
    }
    // A re-render replaces the clicked control; keep keyboard focus on its twin.
    if (['decrease', 'increase', 'view', 'max-tier'].includes(action)) {
      const selector = `[data-artifact-action="${action}"]${nodeId ? `[data-node-id="${CSS.escape(nodeId)}"]` : ''}${button.dataset.step ? `[data-step="${button.dataset.step}"]` : ''}${button.dataset.view ? `[data-view="${button.dataset.view}"]` : ''}${button.dataset.tier ? `[data-tier="${button.dataset.tier}"]` : ''}`;
      const twin = root.querySelector(
        `${button.closest('.artifact-row') ? '.artifact-row ' : button.closest('.artifact-inspector') ? '.artifact-inspector ' : ''}${selector}`
      );
      if (twin && !twin.disabled) twin.focus({ preventScroll: true });
    }
  });

  root.addEventListener('input', (event) => {
    if (event.target.id === 'artifact-search') {
      searchQuery = event.target.value;
      const exact = getAllArtifactNodes(artifact).find(matchesSearch);
      if (exact) selectedNodeId = exact.id;
      render();
      const input = root.querySelector('#artifact-search');
      input?.focus({ preventScroll: true });
      input?.setSelectionRange(searchQuery.length, searchQuery.length);
      return;
    }
    if (event.target.matches('[data-artifact-slider]')) {
      const nodeId = event.target.dataset.artifactSlider;
      const node = getArtifactNodeById(nodeId, artifact);
      setNodeLevel(nodeId, event.target.value, { render: false, save: false });
      const label = event.target
        .closest('.artifact-node-detail')
        ?.querySelector('[data-artifact-level-label]');
      const levelText = t('level', { current: event.target.value, max: node?.maxLevel || 0 });
      if (label) label.textContent = levelText;
      event.target.setAttribute('aria-valuetext', levelText);
    }
  });

  root.addEventListener('change', (event) => {
    if (event.target.matches('[data-artifact-level-input]')) {
      setNodeWithRequirements(event.target.dataset.artifactLevelInput, event.target.value);
      return;
    }
    if (event.target.matches('[data-artifact-slider]')) {
      setNodeLevel(event.target.dataset.artifactSlider, event.target.value);
    }
  });
}

export async function initArtifactCalculator() {
  document.querySelector('#artifactSection .artifact-loading')?.remove();
  if (!initialized) {
    loadProgress();
    loadView();
    const linkedNode = new URLSearchParams(location.hash.split('?')[1] || '').get('node');
    if (getArtifactNodeById(linkedNode, artifact)) selectedNodeId = linkedNode;
    initialized = true;
  }
  bindEvents();
  render();

  if (!languageBound) {
    languageBound = true;
    window.addEventListener('vts:language-change', () => render());
  }
}

export { setNodeLevel };
