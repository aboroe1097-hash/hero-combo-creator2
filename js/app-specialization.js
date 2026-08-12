// js/app-specialization.js
// Thin main-site wrapper for the canonical standalone Specialization Towers planner.
// The graph renderer lives only on specialization-towers.html; the tab keeps the
// model-driven progress summary and the community node-data contribution surface.

import { currentLanguage } from './state.js';
import { escapeHtml } from './utils.js';
import { getCurrentUser, onUserChanged } from './firebase.js';
import {
  SPECIALIZATION_COLUMNS,
  SPECIALIZATION_RESEARCH,
} from './specialization-towers-v2-data.js';
import { getSpecializationSummary } from './specialization-towers-v2-model.js';
import { loadSpecializationState } from './specialization-towers-v2-store.js';
import { buildContributionTemplateRows } from './specialization-towers-v2-template.js';
import {
  resolveSpecializationTowersV2Locale,
  getSpecializationTowersV2Direction,
  specializationTowersV2Text,
} from './i18n/specialization-towers-v2/index.js';
import {
  localizeSpecializationEffect,
  localizeSpecializationNodeName,
  localizeSpecializationResearchName,
  specializationDisplayText,
} from './i18n/specialization-towers-v2/display.js';

const UI_TROOPS = ['cavalry', 'archer', 'footman'];

const CONTRIBUTION_STORAGE_KEY = 'vts_specialization_contributions';

let root = null;
let state = null;
let activeTroop = 'cavalry';
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

function troopLabel(troop) {
  return sp(
    troop === 'cavalry' ? 'towerCavalry' : troop === 'archer' ? 'towerArchers' : 'towerFootmen'
  );
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

/* ---------- Summary + full-planner card ---------- */

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
    return `<button type="button" class="spec-troop-tab${active ? ' active' : ''}" role="tab" aria-selected="${active}" aria-label="${escapeHtml(label)}" data-spec-troop="${troop}"><span class="spec-troop-icon" aria-hidden="true">${troop === 'cavalry' ? '🐴' : troop === 'archer' ? '🏹' : '🛡️'}</span><span class="spec-troop-name">${escapeHtml(troopLabel(troop))}</span><span class="spec-troop-pct">${p}%</span></button>`;
  }).join('')}</div>`;
}

function renderPlannerCard() {
  return `
    <section class="spec-planner-card" aria-labelledby="spec-planner-card-title">
      <div class="spec-planner-card-copy">
        <h4 id="spec-planner-card-title">${escapeHtml(sp('fullPlannerTitle'))}</h4>
        <p>${escapeHtml(sp('fullPlannerHint'))}</p>
      </div>
      <a class="spec-btn spec-btn--primary spec-planner-card-link" href="specialization-towers.html" data-spec-open-planner>${escapeHtml(sp('openFullPlanner'))}</a>
    </section>`;
}

/* ---------- Community contribution surface ---------- */

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
                      <span class="spec-contrib-node-icon" aria-hidden="true">◆</span>
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

/* ---------- Root render ---------- */

function render() {
  if (!root) return;
  const summary = getSpecializationSummary(state);
  root.dir = getSpecializationTowersV2Direction(locale());
  root.innerHTML = `
    <div class="spec-tool">
      ${renderSummary(summary)}
      ${renderTroopTabs(summary)}
      <p class="spec-hint">${escapeHtml(sp('seasonPlanningNote'))}</p>
      ${renderPlannerCard()}
      ${renderCommunity()}
      ${renderAcknowledgments()}
    </div>`;
}

/* ---------- Events ---------- */

function onClick(event) {
  const troopBtn = event.target.closest('[data-spec-troop]');
  if (troopBtn) {
    activeTroop = troopBtn.dataset.specTroop;
    render();
  }
}

function onChange(event) {
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
