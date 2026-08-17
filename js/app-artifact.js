// js/app-artifact.js
// Artifact Calculator Subtool for Rise of Castles
// Featuring Artifact One: Redemption Grail

import { escapeHtml } from './utils.js';
import { queueAccountSync } from './account-sync.js';
import { currentLanguage } from './state.js';
import { formatLocaleNumber } from './locale-format.js';
import {
  ARTIFACT_DATABASE,
  getAllArtifactNodes,
  getArtifactNodeById,
  calculateArtifactMetrics,
  calculateArtifactActiveBuffs,
} from './artifact-db.js';
import '../css/artifact-v14.css';

const ARTIFACT_STORAGE_KEY_PREFIX = 'vts_artifact_progress_';
const ARTIFACT_SETTINGS_KEY = 'vts_artifact_settings_v1';

let currentArtifactId = 'redemption-grail';
let nodeLevels = {};
let customRates = { dailyRGE: 4, dailyAS: 80 };
let currentViewMode = 'visual'; // 'visual' | 'table'
let currentCategoryFilter = 'all';
let searchQuery = '';
let buffsPanelExpanded = true;
let isInitialized = false;

function getStorageKey(artifactId = currentArtifactId) {
  return `${ARTIFACT_STORAGE_KEY_PREFIX}${artifactId}_v1`;
}

function loadArtifactProgress(artifactId = currentArtifactId) {
  try {
    const raw = localStorage.getItem(getStorageKey(artifactId));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        nodeLevels = parsed;
        return;
      }
    }
  } catch (err) {
    console.warn('Failed to load artifact progress', err);
  }
  nodeLevels = {};
}

function saveArtifactProgress(artifactId = currentArtifactId) {
  try {
    localStorage.setItem(getStorageKey(artifactId), JSON.stringify(nodeLevels));
    queueAccountSync();
  } catch (err) {
    console.warn('Failed to save artifact progress', err);
  }
}

function loadArtifactSettings() {
  try {
    const raw = localStorage.getItem(ARTIFACT_SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        if (parsed.dailyRGE) customRates.dailyRGE = Number(parsed.dailyRGE) || 4;
        if (parsed.dailyAS) customRates.dailyAS = Number(parsed.dailyAS) || 80;
        if (parsed.viewMode) currentViewMode = parsed.viewMode;
        if (typeof parsed.buffsExpanded === 'boolean') buffsPanelExpanded = parsed.buffsExpanded;
      }
    }
  } catch (err) {
    console.warn('Failed to load artifact settings', err);
  }
}

function saveArtifactSettings() {
  try {
    localStorage.setItem(
      ARTIFACT_SETTINGS_KEY,
      JSON.stringify({
        dailyRGE: customRates.dailyRGE,
        dailyAS: customRates.dailyAS,
        viewMode: currentViewMode,
        buffsExpanded: buffsPanelExpanded,
      })
    );
  } catch (err) {
    console.warn('Failed to save artifact settings', err);
  }
}

function formatNum(value) {
  return formatLocaleNumber(value, currentLanguage, { maximumFractionDigits: 1 });
}

function getCurrentArtifact() {
  return ARTIFACT_DATABASE.find((a) => a.id === currentArtifactId) || ARTIFACT_DATABASE[0];
}

export async function initArtifactCalculator() {
  if (isInitialized) {
    renderArtifactCalculator();
    return;
  }

  loadArtifactSettings();
  loadArtifactProgress();
  renderArtifactCalculator();
  isInitialized = true;
}

export function setNodeLevel(nodeId, level, { save = true, render = true } = {}) {
  const artifact = getCurrentArtifact();
  const node = getArtifactNodeById(nodeId, artifact);
  if (!node) return;

  const validLevel = Math.max(0, Math.min(node.maxLevel, Number(level) || 0));
  nodeLevels[nodeId] = validLevel;

  if (save) saveArtifactProgress();
  if (render) renderArtifactCalculator();
}

export function setAllNodesLevel(level, { save = true, render = true } = {}) {
  const artifact = getCurrentArtifact();
  const allNodes = getAllArtifactNodes(artifact);

  for (const node of allNodes) {
    nodeLevels[node.id] = level === 'max' ? node.maxLevel : Math.max(0, Number(level) || 0);
  }

  if (save) saveArtifactProgress();
  if (render) renderArtifactCalculator();
}

export function setTierNodesLevel(tierNumber, level, { save = true, render = true } = {}) {
  const artifact = getCurrentArtifact();
  const tier = artifact.tiers.find((t) => t.tier === tierNumber);
  if (!tier) return;

  for (const node of tier.nodes) {
    nodeLevels[node.id] = level === 'max' ? node.maxLevel : Math.max(0, Number(level) || 0);
  }

  if (save) saveArtifactProgress();
  if (render) renderArtifactCalculator();
}

export function setBranchNodesLevel(branchCode, level, { save = true, render = true } = {}) {
  const artifact = getCurrentArtifact();
  const allNodes = getAllArtifactNodes(artifact);

  for (const node of allNodes) {
    if (node.branch === branchCode || (branchCode === 'root' && node.category === 'apex')) {
      nodeLevels[node.id] = level === 'max' ? node.maxLevel : Math.max(0, Number(level) || 0);
    }
  }

  if (save) saveArtifactProgress();
  if (render) renderArtifactCalculator();
}

function generateShareSummary() {
  const artifact = getCurrentArtifact();
  const metrics = calculateArtifactMetrics(artifact, nodeLevels, null, customRates);
  const buffs = calculateArtifactActiveBuffs(artifact, nodeLevels);

  const lines = [
    `🏰 Rise of Castles — ${artifact.title}`,
    `📊 Overall Progress: ${metrics.completionPercent.toFixed(1)}% (${metrics.maxedNodes}/${metrics.totalNodes} Nodes Maxed)`,
    `⚜️ RGE Needed: ${formatNum(metrics.remainingRGE)} (${metrics.daysRemainingRGE} days @ ${metrics.dailyRGE}/day)`,
    `💎 Soulstones Needed: ${formatNum(metrics.remainingAS)} (${metrics.daysRemainingAS} days @ ${metrics.dailyAS}/day)`,
    `⏳ Total Estimated Time: ${metrics.daysRemainingTotal} days`,
    '',
    '⚡ Active Buffs:',
    buffs.might ? `• Might: +${buffs.might}%` : null,
    buffs.resistance ? `• Resistance: +${buffs.resistance}%` : null,
    buffs.hp ? `• HP: +${buffs.hp}%` : null,
    buffs.damage ? `• Damage: +${buffs.damage}%` : null,
    buffs.damageTaken ? `• Damage Taken: ${buffs.damageTaken}%` : null,
    buffs.combatSpeed ? `• Combat Speed: +${buffs.combatSpeed}` : null,
    buffs.tacticalMight ? `• Tactical Might: +${buffs.tacticalMight}%` : null,
    buffs.tacticalResistance ? `• Tactical Resistance: +${buffs.tacticalResistance}%` : null,
    buffs.sacredMight ? `• Basic Sacred Might: +${buffs.sacredMight}` : null,
    buffs.sacredResistance ? `• Basic Sacred Resistance: +${buffs.sacredResistance}` : null,
    buffs.fatalBlowImmunity ? '• Fatal Blow Immunity: Active' : null,
    buffs.destructiveStrikeImmunity ? `• Destructive Strike Immunity: +${buffs.destructiveStrikeImmunity}%` : null,
    buffs.artifactDamageBoost ? `• Artifact Damage Boost: +${buffs.artifactDamageBoost}%` : null,
    buffs.artifactDamageMitigation ? `• Artifact Damage Mitigation: +${buffs.artifactDamageMitigation}%` : null,
    buffs.artifactCritRate ? `• Artifact Crit Rate: +${buffs.artifactCritRate}%` : null,
  ].filter(Boolean);

  if (buffs.permanentAttributes.length > 0) {
    lines.push('', '⭐ Max Level Permanent Attributes:');
    buffs.permanentAttributes.forEach((p) => {
      lines.push(`• ${p.attribute} (${p.nodeName})`);
    });
  }

  return lines.join('\n');
}

export function copyShareSummary() {
  const text = generateShareSummary();
  navigator.clipboard?.writeText(text).then(
    () => {
      if (typeof window.showToast === 'function') {
        window.showToast('Artifact stats copied to clipboard!', 'success', 3000);
      }
    },
    () => {
      if (typeof window.showToast === 'function') {
        window.showToast('Could not copy to clipboard.', 'error', 3000);
      }
    }
  );
}

export function renderArtifactCalculator() {
  const root = document.getElementById('artifactSection') || document.getElementById('artifactToolRoot');
  if (!root) return;

  const artifact = getCurrentArtifact();
  const metrics = calculateArtifactMetrics(artifact, nodeLevels, null, customRates);
  const buffs = calculateArtifactActiveBuffs(artifact, nodeLevels);

  const allNodes = getAllArtifactNodes(artifact);

  // Filter nodes based on category and search query
  const filteredNodes = allNodes.filter((node) => {
    if (currentCategoryFilter === 'skill' && node.resource !== 'RGE') return false;
    if (currentCategoryFilter === 'a' && node.branch !== 'a') return false;
    if (currentCategoryFilter === 'b' && node.branch !== 'b') return false;
    if (currentCategoryFilter === 'amp' && !node.permanentAttribute) return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = node.name.toLowerCase().includes(q);
      const matchCode = node.code.toLowerCase().includes(q);
      const matchBuff = node.buff.toLowerCase().includes(q);
      const matchPerm = node.permanentAttribute?.toLowerCase().includes(q);
      if (!matchName && !matchCode && !matchBuff && !matchPerm) return false;
    }
    return true;
  });

  const filteredNodeIds = new Set(filteredNodes.map((n) => n.id));

  root.innerHTML = `
    <div class="artifact-workspace" id="artifactWorkspace">
      <!-- Header -->
      <header class="artifact-header">
        <div class="artifact-title-group">
          <div class="artifact-badge-tag">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
            <span>Rise of Castles Artifact</span>
          </div>
          <h1 class="artifact-title">${escapeHtml(artifact.title)}</h1>
          <p class="artifact-desc">${escapeHtml(artifact.description)}</p>
        </div>

        <div class="artifact-header-actions">
          <button type="button" class="artifact-btn artifact-btn-gold" id="btnArtifactShare" title="Copy clean summary to clipboard">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span>Share Stats</span>
          </button>
          <button type="button" class="artifact-btn" id="btnArtifactMaxAll" title="Set all nodes to maximum level">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span>Max All</span>
          </button>
          <button type="button" class="artifact-btn artifact-btn-danger" id="btnArtifactResetAll" title="Reset all nodes to 0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span>Reset</span>
          </button>
        </div>
      </header>

      <!-- Key Metrics Deck -->
      <section class="artifact-metrics-grid" aria-label="Artifact Progress and Costs">
        <!-- RGE Card -->
        <div class="artifact-card artifact-card-rge">
          <div class="artifact-card-header">
            <span class="artifact-card-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2.5">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 3" />
              </svg>
              Redemption Emblems
            </span>
            <span class="artifact-card-badge artifact-badge-rge">RGE</span>
          </div>
          <div class="artifact-card-stat-main">
            <span class="artifact-stat-value">${formatNum(metrics.remainingRGE)}</span>
            <span class="artifact-stat-unit">remaining</span>
          </div>
          <div class="artifact-card-substats">
            <div class="artifact-substat-item">
              <span class="artifact-substat-label">Invested</span>
              <span class="artifact-substat-value">${formatNum(metrics.investedRGE)} / ${formatNum(metrics.totalRGE)}</span>
            </div>
            <div class="artifact-substat-item">
              <span class="artifact-substat-label">Est. Time</span>
              <span class="artifact-substat-value">${metrics.daysRemainingRGE} days</span>
            </div>
          </div>
        </div>

        <!-- AS Card -->
        <div class="artifact-card artifact-card-as">
          <div class="artifact-card-header">
            <span class="artifact-card-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2.5">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
              Artifact Soulstones
            </span>
            <span class="artifact-card-badge artifact-badge-as">AS</span>
          </div>
          <div class="artifact-card-stat-main">
            <span class="artifact-stat-value">${formatNum(metrics.remainingAS)}</span>
            <span class="artifact-stat-unit">remaining</span>
          </div>
          <div class="artifact-card-substats">
            <div class="artifact-substat-item">
              <span class="artifact-substat-label">Invested</span>
              <span class="artifact-substat-value">${formatNum(metrics.investedAS)} / ${formatNum(metrics.totalAS)}</span>
            </div>
            <div class="artifact-substat-item">
              <span class="artifact-substat-label">Est. Time</span>
              <span class="artifact-substat-value">${metrics.daysRemainingAS} days</span>
            </div>
          </div>
        </div>

        <!-- Overall Progress Card -->
        <div class="artifact-card artifact-card-progress">
          <div class="artifact-card-header">
            <span class="artifact-card-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Total Completion
            </span>
            <span class="artifact-card-badge" style="border: 1px solid rgba(16,185,129,0.4); color: #6ee7b7; background: rgba(16,185,129,0.15)">
              ${metrics.maxedNodes}/${metrics.totalNodes} Nodes
            </span>
          </div>
          <div class="artifact-card-stat-main">
            <span class="artifact-stat-value">${metrics.completionPercent.toFixed(1)}%</span>
            <span class="artifact-stat-unit">${metrics.investedLevelPoints} / ${metrics.totalLevelPoints} Levels</span>
          </div>
          <div class="artifact-progress-bar-wrap">
            <div class="artifact-progress-bar-fill" style="width: ${metrics.completionPercent}%"></div>
          </div>
          <div class="artifact-card-substats">
            <div class="artifact-substat-item">
              <span class="artifact-substat-label">Total Time Required</span>
              <span class="artifact-substat-value">${metrics.daysRemainingTotal} days</span>
            </div>
            <div class="artifact-substat-item">
              <span class="artifact-substat-label">CoP Source</span>
              <span class="artifact-substat-value">4 RGE · 80 AS/day</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Daily Earning Rates & Spender Tuning -->
      <section class="artifact-rates-bar" aria-label="Daily Earning Rates Tuning">
        <div class="artifact-rates-group">
          <span style="font-weight: 700; color: var(--art-text);">⚡ Daily CoP Earning Rates:</span>
          <div class="artifact-rate-input-wrap">
            <label class="artifact-rate-label" for="inputDailyRGE">Daily RGE:</label>
            <input type="number" id="inputDailyRGE" class="artifact-rate-input" min="1" max="500" value="${customRates.dailyRGE}" />
          </div>
          <div class="artifact-rate-input-wrap">
            <label class="artifact-rate-label" for="inputDailyAS">Daily AS:</label>
            <input type="number" id="inputDailyAS" class="artifact-rate-input" min="1" max="5000" value="${customRates.dailyAS}" />
          </div>
        </div>
        <div style="color: var(--art-text-dim); font-size: 0.76rem;">
          Default: Free-to-play baseline (4 RGE & 80 AS from Daily CoP Chests)
        </div>
      </section>

      <!-- Active Buffs & Permanent Attributes Deck -->
      <section class="artifact-buffs-panel" aria-label="Active Artifact Buffs">
        <button type="button" class="artifact-buffs-toggle" id="btnToggleBuffsPanel" aria-expanded="${buffsPanelExpanded}">
          <span style="display: flex; align-items: center; gap: 8px;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Active Stats &amp; Permanent Attributes (${buffs.permanentAttributes.length} Active)
          </span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="transform: rotate(${buffsPanelExpanded ? '180deg' : '0deg'}); transition: transform 0.2s ease;">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        ${
          buffsPanelExpanded
            ? `
          <div class="artifact-buffs-content">
            <div class="artifact-buffs-grid">
              ${buffs.might ? `<div class="artifact-buff-chip"><span class="artifact-buff-name">Might</span><span class="artifact-buff-val">+${buffs.might}%</span></div>` : ''}
              ${buffs.resistance ? `<div class="artifact-buff-chip"><span class="artifact-buff-name">Resistance</span><span class="artifact-buff-val">+${buffs.resistance}%</span></div>` : ''}
              ${buffs.hp ? `<div class="artifact-buff-chip"><span class="artifact-buff-name">HP</span><span class="artifact-buff-val">+${buffs.hp}%</span></div>` : ''}
              ${buffs.damage ? `<div class="artifact-buff-chip"><span class="artifact-buff-name">Damage Boost</span><span class="artifact-buff-val">+${buffs.damage}%</span></div>` : ''}
              ${buffs.damageTaken ? `<div class="artifact-buff-chip"><span class="artifact-buff-name">Damage Taken</span><span class="artifact-buff-val" style="color: #6ee7b7;">${buffs.damageTaken}%</span></div>` : ''}
              ${buffs.combatSpeed ? `<div class="artifact-buff-chip"><span class="artifact-buff-name">Combat Speed</span><span class="artifact-buff-val">+${buffs.combatSpeed}</span></div>` : ''}
              ${buffs.tacticalMight ? `<div class="artifact-buff-chip"><span class="artifact-buff-name">Tactical Might</span><span class="artifact-buff-val">+${buffs.tacticalMight}%</span></div>` : ''}
              ${buffs.tacticalResistance ? `<div class="artifact-buff-chip"><span class="artifact-buff-name">Tactical Resistance</span><span class="artifact-buff-val">+${buffs.tacticalResistance}%</span></div>` : ''}
              ${buffs.sacredMight ? `<div class="artifact-buff-chip"><span class="artifact-buff-name">Basic Sacred Might</span><span class="artifact-buff-val">+${buffs.sacredMight}</span></div>` : ''}
              ${buffs.sacredResistance ? `<div class="artifact-buff-chip"><span class="artifact-buff-name">Basic Sacred Resistance</span><span class="artifact-buff-val">+${buffs.sacredResistance}</span></div>` : ''}
              ${buffs.destructiveStrikeImmunity ? `<div class="artifact-buff-chip"><span class="artifact-buff-name">Destructive Strike Immunity</span><span class="artifact-buff-val">+${buffs.destructiveStrikeImmunity}%</span></div>` : ''}
              ${buffs.fatalBlowImmunity ? `<div class="artifact-buff-chip"><span class="artifact-buff-name">Fatal Blow Immunity</span><span class="artifact-buff-val" style="color: #6ee7b7;">Active</span></div>` : ''}
              ${buffs.artifactDamageBoost ? `<div class="artifact-buff-chip"><span class="artifact-buff-name">Artifact Damage Boost</span><span class="artifact-buff-val">+${buffs.artifactDamageBoost}%</span></div>` : ''}
              ${buffs.artifactDamageMitigation ? `<div class="artifact-buff-chip"><span class="artifact-buff-name">Artifact Damage Mitigation</span><span class="artifact-buff-val">+${buffs.artifactDamageMitigation}%</span></div>` : ''}
              ${buffs.artifactCritRate ? `<div class="artifact-buff-chip"><span class="artifact-buff-name">Artifact Crit Rate</span><span class="artifact-buff-val">+${buffs.artifactCritRate}%</span></div>` : ''}
              ${
                !buffs.might &&
                !buffs.resistance &&
                !buffs.hp &&
                !buffs.damage &&
                !buffs.damageTaken &&
                !buffs.combatSpeed &&
                !buffs.tacticalMight &&
                !buffs.tacticalResistance &&
                !buffs.sacredMight &&
                !buffs.sacredResistance &&
                !buffs.fatalBlowImmunity
                  ? `<div style="grid-column: 1 / -1; color: var(--art-text-dim); font-size: 0.82rem; font-style: italic;">No levels allocated yet. Level up nodes below to accumulate artifact buffs.</div>`
                  : ''
              }
            </div>

            <div class="artifact-perm-heading">Permanent Attributes (Unlocked at Max Level)</div>
            <div class="artifact-perm-list">
              ${
                allNodes
                  .filter((n) => n.permanentAttribute)
                  .map((n) => {
                    const isMax = (nodeLevels[n.id] || 0) >= n.maxLevel;
                    return `
                    <div class="artifact-perm-item ${isMax ? 'active' : 'inactive'}">
                      <span>${isMax ? '⭐' : '🔒'}</span>
                      <span style="flex: 1;"><strong>${escapeHtml(n.name)} (${n.code}):</strong> ${escapeHtml(n.permanentAttribute)}</span>
                      <span style="font-size: 0.72rem; opacity: 0.85;">${isMax ? 'ACTIVE' : `Requires Lvl ${n.maxLevel}`}</span>
                    </div>
                  `;
                  })
                  .join('')
              }
            </div>
          </div>
        `
            : ''
        }
      </section>

      <!-- Control & Filter Deck -->
      <section class="artifact-control-deck" aria-label="Filters and View Switcher">
        <div class="artifact-deck-row">
          <div class="artifact-filter-group">
            <button type="button" class="artifact-filter-pill ${currentCategoryFilter === 'all' ? 'active' : ''}" data-cat="all">All Nodes (${allNodes.length})</button>
            <button type="button" class="artifact-filter-pill ${currentCategoryFilter === 'skill' ? 'active' : ''}" data-cat="skill">Main Skills (RGE)</button>
            <button type="button" class="artifact-filter-pill ${currentCategoryFilter === 'a' ? 'active' : ''}" data-cat="a">Offensive Path (a)</button>
            <button type="button" class="artifact-filter-pill ${currentCategoryFilter === 'b' ? 'active' : ''}" data-cat="b">Defensive Path (b)</button>
            <button type="button" class="artifact-filter-pill ${currentCategoryFilter === 'amp' ? 'active' : ''}" data-cat="amp">Permanent Amplifications</button>
          </div>

          <div class="artifact-view-mode-toggle">
            <button type="button" class="artifact-mode-btn ${currentViewMode === 'visual' ? 'active' : ''}" data-mode="visual">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
              Tier Flow
            </button>
            <button type="button" class="artifact-mode-btn ${currentViewMode === 'table' ? 'active' : ''}" data-mode="table">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" />
                <line x1="3" y1="12" x2="3.01" y2="12" />
                <line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
              Table View
            </button>
          </div>
        </div>

        <div class="artifact-deck-row">
          <div class="artifact-search-box">
            <svg class="artifact-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input type="text" id="artifactSearchInput" class="artifact-search-input" placeholder="Search by name, stat (e.g. might, speed, siege)..." value="${escapeHtml(searchQuery)}" />
          </div>

          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <button type="button" class="artifact-btn" id="btnMaxOffensive" style="font-size: 0.78rem; padding: 6px 12px;">Max Offensive (a)</button>
            <button type="button" class="artifact-btn" id="btnMaxDefensive" style="font-size: 0.78rem; padding: 6px 12px;">Max Defensive (b)</button>
            <button type="button" class="artifact-btn" id="btnMaxSkills" style="font-size: 0.78rem; padding: 6px 12px;">Max RGE Skills</button>
          </div>
        </div>
      </section>

      <!-- Main Node Views -->
      ${
        currentViewMode === 'visual'
          ? renderVisualTierFlow(artifact, filteredNodeIds)
          : renderTableView(filteredNodes)
      }
    </div>
  `;

  bindEvents(root);
}

function renderVisualTierFlow(artifact, filteredNodeIds) {
  return artifact.tiers
    .map((tier) => {
      const tierNodes = tier.nodes.filter((n) => filteredNodeIds.has(n.id));
      if (tierNodes.length === 0) return '';

      const rootNodes = tierNodes.filter((n) => n.branch === 'root');
      const branchANodes = tierNodes.filter((n) => n.branch === 'a');
      const branchBNodes = tierNodes.filter((n) => n.branch === 'b');
      const sharedNodes = tierNodes.filter((n) => n.branch === 'shared');

      return `
      <section class="artifact-tier-block" data-tier="${tier.tier}">
        <div class="artifact-tier-header">
          <div class="artifact-tier-title-wrap">
            <span class="artifact-tier-badge">${tier.tier}</span>
            <div>
              <h2 class="artifact-tier-title">${escapeHtml(tier.name)}</h2>
              <div style="color: var(--art-text-muted); font-size: 0.78rem;">${escapeHtml(tier.subtitle)}</div>
            </div>
          </div>
          <div class="artifact-tier-quick-btns">
            <button type="button" class="artifact-btn btn-tier-max" data-tier="${tier.tier}" style="font-size: 0.76rem; padding: 5px 10px;">Max Tier ${tier.tier}</button>
            <button type="button" class="artifact-btn artifact-btn-danger btn-tier-reset" data-tier="${tier.tier}" style="font-size: 0.76rem; padding: 5px 10px;">Reset</button>
          </div>
        </div>

        <div class="artifact-tier-body">
          ${
            rootNodes.length > 0
              ? `
            <div style="margin-bottom: 20px;">
              ${rootNodes.map((node) => renderNodeCard(node)).join('')}
            </div>
          `
              : ''
          }

          ${
            branchANodes.length > 0 || branchBNodes.length > 0
              ? `
            <div class="artifact-branch-columns">
              ${
                branchANodes.length > 0
                  ? `
                <div class="artifact-branch-column">
                  <div class="artifact-branch-header artifact-branch-header-a">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Branch A (Offensive &amp; Might)
                  </div>
                  ${branchANodes.map((node) => renderNodeCard(node)).join('')}
                </div>
              `
                  : ''
              }

              ${
                branchBNodes.length > 0
                  ? `
                <div class="artifact-branch-column">
                  <div class="artifact-branch-header artifact-branch-header-b">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    Branch B (Defensive &amp; Resistance)
                  </div>
                  ${branchBNodes.map((node) => renderNodeCard(node)).join('')}
                </div>
              `
                  : ''
              }
            </div>
          `
              : ''
          }

          ${
            sharedNodes.length > 0
              ? `
            <div style="margin-top: 20px;">
              <div class="artifact-branch-header" style="border-bottom-color: rgba(255,255,255,0.2); margin-bottom: 12px;">
                Shared Combat Attributes
              </div>
              ${sharedNodes.map((node) => renderNodeCard(node)).join('')}
            </div>
          `
              : ''
          }
        </div>
      </section>
    `;
    })
    .join('');
}

function renderNodeCard(node) {
  const currentLvl = Math.max(0, Math.min(node.maxLevel, Number(nodeLevels[node.id]) || 0));
  const isMax = currentLvl >= node.maxLevel;
  const isRGE = node.resource === 'RGE';

  const nextCost = !isMax ? node.costs[currentLvl] : 0;
  const remainingCost = node.costs.slice(currentLvl).reduce((sum, c) => sum + c, 0);

  return `
    <div class="artifact-node-card ${isMax ? 'maxed' : ''} ${node.branch === 'root' ? 'root-skill' : ''}" data-node-id="${node.id}">
      <div class="artifact-node-top">
        <div class="artifact-node-title-group">
          <span class="artifact-node-code-tag">${escapeHtml(node.code)}</span>
          <h3 class="artifact-node-name">${escapeHtml(node.name)}</h3>
        </div>
        <span class="artifact-node-res-badge ${isRGE ? 'artifact-badge-rge' : 'artifact-badge-as'}">
          ${node.resource}
        </span>
      </div>

      <p class="artifact-node-desc">${escapeHtml(node.buff)}</p>

      ${
        node.permanentAttribute
          ? `
        <div class="artifact-node-perm-badge ${isMax ? 'active' : ''}">
          <span>${isMax ? '⭐' : '🔒'}</span>
          <span><strong>Permanent:</strong> ${escapeHtml(node.permanentAttribute)}</span>
        </div>
      `
          : ''
      }

      <div class="artifact-node-controls">
        <div class="artifact-stepper-row">
          <div class="artifact-level-display">
            <span class="artifact-level-current ${isMax ? 'maxed' : ''}">Lvl ${currentLvl}</span>
            <span class="artifact-level-max">/ ${node.maxLevel}</span>
          </div>

          <div class="artifact-btn-group">
            <button type="button" class="artifact-step-btn btn-node-dec" data-node-id="${node.id}" ${currentLvl === 0 ? 'disabled' : ''} title="Decrease Level">-</button>
            <button type="button" class="artifact-step-btn btn-node-inc" data-node-id="${node.id}" ${isMax ? 'disabled' : ''} title="Increase Level">+</button>
            <button type="button" class="artifact-quick-lvl-btn btn-node-max" data-node-id="${node.id}" title="Set to Max">MAX</button>
            <button type="button" class="artifact-quick-lvl-btn btn-node-zero" data-node-id="${node.id}" title="Reset to 0">0</button>
          </div>
        </div>

        <input type="range" class="artifact-slider node-level-slider" data-node-id="${node.id}" min="0" max="${node.maxLevel}" value="${currentLvl}" />

        <div class="artifact-node-cost-info">
          <span>${!isMax ? `Next Level: ${nextCost} ${node.resource}` : 'Max Level Reached'}</span>
          <span>${!isMax ? `To Max: ${remainingCost} ${node.resource}` : '100%'}</span>
        </div>
      </div>
    </div>
  `;
}

function renderTableView(nodes) {
  return `
    <div class="artifact-table-container">
      <table class="artifact-table">
        <thead>
          <tr>
            <th>Code</th>
            <th>Node Name</th>
            <th>Resource</th>
            <th>Level</th>
            <th>Buff</th>
            <th>Permanent Attribute</th>
            <th>Cost To Max</th>
            <th>Quick Actions</th>
          </tr>
        </thead>
        <tbody>
          ${nodes
            .map((node) => {
              const currentLvl = Math.max(0, Math.min(node.maxLevel, Number(nodeLevels[node.id]) || 0));
              const isMax = currentLvl >= node.maxLevel;
              const remainingCost = node.costs.slice(currentLvl).reduce((sum, c) => sum + c, 0);

              return `
              <tr class="${isMax ? 'row-maxed' : ''}">
                <td><span class="artifact-node-code-tag">${escapeHtml(node.code)}</span></td>
                <td><strong>${escapeHtml(node.name)}</strong></td>
                <td><span class="artifact-node-res-badge ${node.resource === 'RGE' ? 'artifact-badge-rge' : 'artifact-badge-as'}">${node.resource}</span></td>
                <td>
                  <span style="font-weight: 700; color: ${isMax ? '#10b981' : 'var(--art-text)'};">
                    ${currentLvl} / ${node.maxLevel}
                  </span>
                </td>
                <td style="max-width: 260px; color: var(--art-text-muted); font-size: 0.78rem;">${escapeHtml(node.buff)}</td>
                <td style="max-width: 220px; font-size: 0.78rem; color: ${isMax ? '#fef08a' : 'var(--art-text-dim)'};">
                  ${node.permanentAttribute ? (isMax ? '⭐ ' : '🔒 ') + escapeHtml(node.permanentAttribute) : '—'}
                </td>
                <td style="font-weight: 600; color: var(--art-text-muted);">${isMax ? 'Maxed' : `${remainingCost} ${node.resource}`}</td>
                <td>
                  <div class="artifact-btn-group">
                    <button type="button" class="artifact-step-btn btn-node-dec" data-node-id="${node.id}" ${currentLvl === 0 ? 'disabled' : ''}>-</button>
                    <button type="button" class="artifact-step-btn btn-node-inc" data-node-id="${node.id}" ${isMax ? 'disabled' : ''}>+</button>
                    <button type="button" class="artifact-quick-lvl-btn btn-node-max" data-node-id="${node.id}">MAX</button>
                    <button type="button" class="artifact-quick-lvl-btn btn-node-zero" data-node-id="${node.id}">0</button>
                  </div>
                </td>
              </tr>
            `;
            })
            .join('')}
        </tbody>
      </table>
    </div>
  `;
}

function bindEvents(root) {
  // Share
  root.querySelector('#btnArtifactShare')?.addEventListener('click', () => copyShareSummary());

  // Max All / Reset All
  root.querySelector('#btnArtifactMaxAll')?.addEventListener('click', () => setAllNodesLevel('max'));
  root.querySelector('#btnArtifactResetAll')?.addEventListener('click', () => setAllNodesLevel(0));

  // Branch Quick Buttons
  root.querySelector('#btnMaxOffensive')?.addEventListener('click', () => setBranchNodesLevel('a', 'max'));
  root.querySelector('#btnMaxDefensive')?.addEventListener('click', () => setBranchNodesLevel('b', 'max'));
  root.querySelector('#btnMaxSkills')?.addEventListener('click', () => setBranchNodesLevel('root', 'max'));

  // Buffs Panel Toggle
  root.querySelector('#btnToggleBuffsPanel')?.addEventListener('click', () => {
    buffsPanelExpanded = !buffsPanelExpanded;
    saveArtifactSettings();
    renderArtifactCalculator();
  });

  // Daily Rates input
  const inputRGE = root.querySelector('#inputDailyRGE');
  if (inputRGE) {
    inputRGE.addEventListener('change', (e) => {
      customRates.dailyRGE = Math.max(1, Number(e.target.value) || 4);
      saveArtifactSettings();
      renderArtifactCalculator();
    });
  }

  const inputAS = root.querySelector('#inputDailyAS');
  if (inputAS) {
    inputAS.addEventListener('change', (e) => {
      customRates.dailyAS = Math.max(1, Number(e.target.value) || 80);
      saveArtifactSettings();
      renderArtifactCalculator();
    });
  }

  // Category Filters
  root.querySelectorAll('.artifact-filter-pill').forEach((btn) => {
    btn.addEventListener('click', () => {
      currentCategoryFilter = btn.dataset.cat;
      renderArtifactCalculator();
    });
  });

  // View Mode Switcher
  root.querySelectorAll('.artifact-mode-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      currentViewMode = btn.dataset.mode;
      saveArtifactSettings();
      renderArtifactCalculator();
    });
  });

  // Search input
  const searchInput = root.querySelector('#artifactSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value || '';
      renderArtifactCalculator();
      const nextInput = root.querySelector('#artifactSearchInput');
      if (nextInput) {
        nextInput.focus();
        nextInput.setSelectionRange(nextInput.value.length, nextInput.value.length);
      }
    });
  }

  // Tier Max / Reset buttons
  root.querySelectorAll('.btn-tier-max').forEach((btn) => {
    btn.addEventListener('click', () => setTierNodesLevel(Number(btn.dataset.tier), 'max'));
  });

  root.querySelectorAll('.btn-tier-reset').forEach((btn) => {
    btn.addEventListener('click', () => setTierNodesLevel(Number(btn.dataset.tier), 0));
  });

  // Node Buttons (Inc / Dec / Max / Zero)
  root.querySelectorAll('.btn-node-inc').forEach((btn) => {
    btn.addEventListener('click', () => {
      const nodeId = btn.dataset.nodeId;
      const cur = Number(nodeLevels[nodeId]) || 0;
      setNodeLevel(nodeId, cur + 1);
    });
  });

  root.querySelectorAll('.btn-node-dec').forEach((btn) => {
    btn.addEventListener('click', () => {
      const nodeId = btn.dataset.nodeId;
      const cur = Number(nodeLevels[nodeId]) || 0;
      setNodeLevel(nodeId, cur - 1);
    });
  });

  root.querySelectorAll('.btn-node-max').forEach((btn) => {
    btn.addEventListener('click', () => {
      const nodeId = btn.dataset.nodeId;
      const node = getArtifactNodeById(nodeId, getCurrentArtifact());
      if (node) setNodeLevel(nodeId, node.maxLevel);
    });
  });

  root.querySelectorAll('.btn-node-zero').forEach((btn) => {
    btn.addEventListener('click', () => {
      const nodeId = btn.dataset.nodeId;
      setNodeLevel(nodeId, 0);
    });
  });

  // Sliders
  root.querySelectorAll('.node-level-slider').forEach((slider) => {
    slider.addEventListener('input', (e) => {
      const nodeId = slider.dataset.nodeId;
      setNodeLevel(nodeId, Number(e.target.value), { save: false, render: false });
      // Live feedback in card without full re-render on each drag
      const card = slider.closest('.artifact-node-card');
      if (card) {
        const curSpan = card.querySelector('.artifact-level-current');
        if (curSpan) curSpan.textContent = `Lvl ${e.target.value}`;
      }
    });

    slider.addEventListener('change', (e) => {
      const nodeId = slider.dataset.nodeId;
      setNodeLevel(nodeId, Number(e.target.value));
    });
  });
}
