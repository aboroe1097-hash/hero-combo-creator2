// js/app-specialization.js
// Specialization Towers tab for index.html, following the in-game flow:
// column banners of badges -> tap a badge -> a node ring you learn along.
// Reuses the verified data/model/store/i18n foundation; no game data defined here.

import { currentLanguage } from './state.js';
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
import {
  specializationDisplayText,
  localizeSpecializationEffect,
  localizeSpecializationNodeName,
  localizeSpecializationResearchName,
} from './i18n/specialization-towers-v2/display.js';

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
let selectedNodeId = null;
let selectedLegionColumnId = null;
let wired = false;

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
    const label = `${troopLabel(troop)} ${p}%`;
    return `<button type="button" class="spec-troop-tab${active ? ' active' : ''}" role="tab" aria-selected="${active}" aria-label="${escapeHtml(label)}" data-spec-troop="${troop}"><span class="spec-troop-icon" aria-hidden="true">${TROOP_ICON[troop]}</span><span class="spec-troop-name">${escapeHtml(troopLabel(troop))}</span><span class="spec-troop-pct">${p}%</span></button>`;
  }).join('')}</div>`;
}

function renderBadge(researchId) {
  const research = SPECIALIZATION_RESEARCH[researchId];
  const progress = getResearchProgress(state, activeTroop, researchId);
  const status = statusOf(progress);
  const image = getSpecializationResearchImage(researchId, activeTroop);
  return `
    <div class="spec-badge-wrap">
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
                      <span class="spec-contrib-node-icon" aria-hidden="true">${nodeIcon(nodeEffect)}</span>
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

function nodeButton(research, entry, x, y) {
  const node = resolveNode(research, entry);
  const disabled = entry.state === 'hidden';
  const selected = entry.nodeId === selectedNodeId;
  const localizedName = nodeName(node.name);
  const localizedEffect = effectText(node.effect);
  const tip = `${escapeHtml(localizedName)}${localizedEffect ? ' — ' + escapeHtml(localizedEffect) : ''}`;
  return `<button type="button" class="spec-ring-node" data-state="${entry.state}" data-selected="${selected}" data-spec-node="${entry.nodeId}" style="left:${x.toFixed(2)}%;top:${y.toFixed(2)}%" ${disabled ? 'disabled aria-disabled="true" ' : ''}${selected ? 'aria-current="true" ' : ''}title="${tip}" aria-label="${tip}" aria-controls="spec-node-inspector"><span aria-hidden="true">${nodeIcon(node.effect)}</span></button>`;
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
  const position = access.entries.findIndex((candidate) => candidate.nodeId === entry.nodeId) + 1;
  return `
    <section id="spec-node-inspector" class="spec-node-inspector" data-state="${entry.state}" aria-live="polite">
      <div class="spec-node-inspector-icon" aria-hidden="true">${nodeIcon(node.effect)}</div>
      <div class="spec-node-inspector-copy">
        <span class="spec-node-inspector-kicker">${escapeHtml(sp('selectedLearning'))} · ${escapeHtml(sd('nodePosition', { current: position, total: access.entries.length }))}</span>
        <h4>${escapeHtml(nodeName(node.name))}</h4>
        <div class="spec-node-inspector-buff"><span>${escapeHtml(sp('nodeBuffLabel'))}</span><strong>${escapeHtml(effectText(node.effect) || sp('nodeBuffUnknown'))}</strong></div>
      </div>
      <fieldset class="spec-node-inspector-state">
        <legend>${escapeHtml(sd('learningStatus'))}</legend>
        <div class="spec-node-state-options">
          <button type="button" data-spec-set-selected-node="unlearned" aria-pressed="${!learned}">${escapeHtml(sp('nodeNotLearned'))}</button>
          <button type="button" data-spec-set-selected-node="learned" aria-pressed="${learned}" ${canToggle ? '' : 'disabled aria-disabled="true"'}>${escapeHtml(sp('nodeLearned'))}</button>
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

function completeResearch(researchId) {
  const research = SPECIALIZATION_RESEARCH[researchId];
  if (!research) return;
  const allNodes = research.nodes.map((node) => node.id);
  if (research.passiveSkillNodeId !== null && research.passiveSkillNodeId !== undefined) {
    allNodes.push(research.passiveSkillNodeId);
  }
  state = setResearchNodes(state, activeTroop, researchId, allNodes);
  persist();
}

function onClick(event) {
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
    selectedNodeId = Number(nodeBtn.dataset.specNode);
    render();
    root?.querySelector(`[data-spec-node="${selectedNodeId}"]`)?.focus({ preventScroll: true });
    return;
  }
  const nodeState = event.target.closest('[data-spec-set-selected-node]');
  if (nodeState && selectedResearchId) {
    const access = getResearchNodeAccess(state, activeTroop, selectedResearchId);
    const learned =
      access.entries.find((entry) => entry.nodeId === selectedNodeId)?.state === 'learned';
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
  selectedResearchId = SPECIALIZATION_COLUMNS[1].researches[0];
  if (!wired) {
    root.addEventListener('click', onClick);
    root.addEventListener('change', onChange);
    window.addEventListener('vts:language-change', () => render());
    // Signing in or out changes whether the contribution fields accept input.
    try {
      onUserChanged?.(() => render());
    } catch {
      // Firebase may be unconfigured; the panel then stays in its signed-out state.
    }
    wired = true;
  }
  render();
  root.closest('#specializationSection')?.querySelector('.specialization-loading')?.remove();
}
