import { escapeHtml } from './utils.js';
import { queueAccountSync } from './account-sync.js';
import {
  ENABLE_RESEARCH_FEATURE,
  activeTechSeasons,
  techSearchQuery,
  db,
  setActiveTechSeasons,
  setTechSearchQuery,
  getSourceCreditText,
  TechseasonColors,
  TECH_SEASON_ORDER,
  researchSection,
  currentLanguage,
} from './state.js';
// Extracted Research Calculator Module
import { techDatabase } from './tech-db.js?v=20260708_101500';
import { RESEARCH_GAME_LAYOUTS } from './research-game-layouts.js';
import { resolveResearchNodeArt } from './research-game-art.js';
import {
  describeNodeBuffProgress,
  getResearchBuffTone,
  summarizeTechBuffs,
} from './research-buffs.js';
import { appT } from './utils.js';
import { formatLocaleNumber, resolveIntlLocale } from './locale-format.js';
import {
  loadResearchLocale,
  researchEffectText,
  researchNodeText,
  researchSearchText,
  researchTreeText,
} from './i18n/research/index.js';
import '../css/research-v14.css';

const RESEARCH_PROGRESS_KEY = 'vts_research_v1';
const RESEARCH_COLLAPSED_SEASONS_KEY = 'vts_research_collapsed_seasons_v1';
const RESEARCH_EXPANDED_SEASONS_KEY = 'vts_research_expanded_seasons_v1';
let researchProgressCache = null;
let collapsedResearchSeasonsCache = null;
let expandedResearchSeasonsCache = null;
let researchCalculatorReturnFocus = null;
let researchCalculatorKeyHandler = null;
let researchLocaleRenderGeneration = 0;

function getResearchTreeName(tech) {
  return researchTreeText(tech, 'name');
}

function getResearchTreeUnlock(tech) {
  return researchTreeText(tech, 'unlockCondition');
}

function getResearchTreeResource(tech) {
  return researchTreeText(tech, 'primaryResource');
}

function getResearchTreePages(tech) {
  return researchTreeText(tech, 'pages');
}

function getResearchNodeName(tech, node) {
  return researchNodeText(tech, node, 'name');
}

function getResearchNodeBuff(tech, node) {
  return researchNodeText(tech, node, 'buff');
}

function formatResearchNumber(value) {
  return formatLocaleNumber(value, currentLanguage, { maximumFractionDigits: 2 });
}

function localizeNodeBuffProgress(tech, node, level) {
  const summary = describeNodeBuffProgress(node, level, { locale: currentLanguage });
  if (summary.status !== 'known') return summary;

  const effects = summary.effects.map((effect, index) => {
    const label = researchEffectText(tech, node, effect.label, index);
    const perLevelLabel =
      effect.perLevelLabel === 'varies/lvl'
        ? appT('researchVariesPerLevel')
        : appT('researchPerLevel', { value: effect.perLevelLabel.replace(/\/lvl$/, '') });
    return {
      ...effect,
      label,
      perLevelLabel,
      currentWithLabel: `${effect.currentLabel} ${label}`,
      maxWithLabel: `${effect.maxLabel} ${label}`,
    };
  });

  return {
    ...summary,
    effects,
    effectLabels: effects.map((effect) => effect.label),
    perLevelLabel: effects.map((effect) => effect.perLevelLabel).join(' + '),
    currentWithLabel: effects.map((effect) => effect.currentWithLabel).join(' + '),
    maxWithLabel: effects.map((effect) => effect.maxWithLabel).join(' + '),
  };
}

function getResearchScrollBehavior() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
}

function getResearchProgress() {
  if (researchProgressCache) return researchProgressCache;
  try {
    const parsed = JSON.parse(localStorage.getItem(RESEARCH_PROGRESS_KEY) || '{}');
    researchProgressCache =
      parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    researchProgressCache = {};
  }
  return researchProgressCache;
}

function researchProgressId(techId, nodeId) {
  return `${techId}:${nodeId}`;
}

function getStoredNodeLevel(techId, nodeId) {
  const progress = getResearchProgress();
  const stored = Number(progress[researchProgressId(techId, nodeId)]);
  if (Number.isFinite(stored) && stored > 0) return stored;

  const legacyKey = `tech_${techId}_${nodeId}`;
  const legacy = parseInt(localStorage.getItem(legacyKey), 10) || 0;
  if (legacy > 0) setStoredNodeLevel(techId, nodeId, legacy);
  try {
    localStorage.removeItem(legacyKey);
  } catch {}
  return legacy;
}

function setStoredNodeLevels(updates) {
  const progress = getResearchProgress();
  const legacyKeys = [];
  for (const { techId, nodeId, level } of updates) {
    const key = researchProgressId(techId, nodeId);
    const safeLevel = Math.max(0, Number(level) || 0);
    if (safeLevel > 0) progress[key] = safeLevel;
    else delete progress[key];
    legacyKeys.push(`tech_${techId}_${nodeId}`);
  }
  try {
    localStorage.setItem(RESEARCH_PROGRESS_KEY, JSON.stringify(progress));
    legacyKeys.forEach((key) => localStorage.removeItem(key));
    queueAccountSync('research');
  } catch {}
}

function setStoredNodeLevel(techId, nodeId, level) {
  setStoredNodeLevels([{ techId, nodeId, level }]);
}

function getCollapsedResearchSeasons() {
  if (collapsedResearchSeasonsCache) return collapsedResearchSeasonsCache;
  try {
    const stored =
      localStorage.getItem(RESEARCH_COLLAPSED_SEASONS_KEY) ||
      sessionStorage.getItem(RESEARCH_COLLAPSED_SEASONS_KEY) ||
      '[]';
    const parsed = JSON.parse(stored);
    collapsedResearchSeasonsCache = new Set(
      Array.isArray(parsed) ? parsed.filter((season) => TECH_SEASON_ORDER.includes(season)) : []
    );
  } catch {
    collapsedResearchSeasonsCache = new Set();
  }
  return collapsedResearchSeasonsCache;
}

function getExpandedResearchSeasons() {
  if (expandedResearchSeasonsCache) return expandedResearchSeasonsCache;
  try {
    const parsed = JSON.parse(localStorage.getItem(RESEARCH_EXPANDED_SEASONS_KEY) || '[]');
    expandedResearchSeasonsCache = new Set(
      Array.isArray(parsed) ? parsed.filter((season) => TECH_SEASON_ORDER.includes(season)) : []
    );
  } catch {
    expandedResearchSeasonsCache = new Set();
  }
  return expandedResearchSeasonsCache;
}

function persistResearchSeasonVisibility() {
  try {
    localStorage.setItem(
      RESEARCH_COLLAPSED_SEASONS_KEY,
      JSON.stringify(Array.from(getCollapsedResearchSeasons()))
    );
    localStorage.setItem(
      RESEARCH_EXPANDED_SEASONS_KEY,
      JSON.stringify(Array.from(getExpandedResearchSeasons()))
    );
    sessionStorage.removeItem(RESEARCH_COLLAPSED_SEASONS_KEY);
  } catch {}
}

function isResearchSeasonCollapsed(season) {
  if (getExpandedResearchSeasons().has(season)) return false;
  if (getCollapsedResearchSeasons().has(season)) return true;
  return isResearchSeasonComplete(season);
}

function setResearchSeasonCollapsed(season, collapsed) {
  const collapsedSeasons = getCollapsedResearchSeasons();
  const expandedSeasons = getExpandedResearchSeasons();
  if (collapsed) {
    collapsedSeasons.add(season);
    expandedSeasons.delete(season);
  } else {
    collapsedSeasons.delete(season);
    expandedSeasons.add(season);
  }
  persistResearchSeasonVisibility();
}

function getNodeLevelMedals(node, levelIndex) {
  const genericCost = (node.costs && node.costs[levelIndex]) || 0;
  const wbCost =
    (node.warBadgeCosts && node.warBadgeCosts[levelIndex]) ||
    (node.wisdomCosts && node.wisdomCosts[levelIndex]) ||
    (node.wb_costs && node.wb_costs[levelIndex]) ||
    0;
  const cmCost =
    (node.courageCosts && node.courageCosts[levelIndex]) ||
    (node.cm_costs && node.cm_costs[levelIndex]) ||
    0;

  let wb = 0;
  let cm = 0;
  if (node.costType === 'Dual') {
    wb = wbCost > 0 ? wbCost : genericCost;
    cm = cmCost;
  } else if (node.costType === 'Courage') {
    cm = genericCost > 0 ? genericCost : cmCost;
  } else if (
    node.costType === 'Wisdom' ||
    node.costType === 'War Badge' ||
    node.costType === 'War Badges'
  ) {
    wb = genericCost > 0 ? genericCost : wbCost;
  }
  return { wb, cm };
}

function getTechMedalTotals(tech) {
  let wbMax = 0;
  let wbCurrent = 0;
  let cmMax = 0;
  let cmCurrent = 0;
  let levelsMax = 0;
  let levelsCurrent = 0;

  tech.nodes.forEach((node) => {
    const savedLevel = getStoredNodeLevel(tech.id, node.id);
    levelsMax += node.maxLevel;
    levelsCurrent += savedLevel;
    for (let i = 0; i < node.maxLevel; i++) {
      const { wb, cm } = getNodeLevelMedals(node, i);
      wbMax += wb;
      cmMax += cm;
      if (i < savedLevel) {
        wbCurrent += wb;
        cmCurrent += cm;
      }
    }
  });

  const medalMax = wbMax + cmMax;
  const medalCurrent = wbCurrent + cmCurrent;
  const pct =
    medalMax > 0
      ? (medalCurrent / medalMax) * 100
      : levelsMax > 0
        ? (levelsCurrent / levelsMax) * 100
        : 0;

  return {
    wbMax,
    wbCurrent,
    cmMax,
    cmCurrent,
    medalMax,
    medalCurrent,
    pct,
    remainingWb: wbMax - wbCurrent,
    remainingCm: cmMax - cmCurrent,
  };
}

function isTechComplete(tech) {
  return (
    tech.nodes.length > 0 &&
    tech.nodes.every((node) => getStoredNodeLevel(tech.id, node.id) >= node.maxLevel)
  );
}

function getResearchSeasonTechs(season) {
  return techDatabase.filter((tech) => tech.season === season);
}

function isResearchSeasonComplete(season) {
  const seasonTechs = getResearchSeasonTechs(season);
  return seasonTechs.length > 0 && seasonTechs.every(isTechComplete);
}

function restoreResearchSeasonActionFocus(season, action, shouldRestore) {
  if (!shouldRestore) return;
  const button = Array.from(document.querySelectorAll('[data-research-season-action]')).find(
    (candidate) =>
      candidate.dataset.season === season && candidate.dataset.researchSeasonAction === action
  );
  button?.focus({ preventScroll: true });
}

function toggleResearchSeasonCollapse(event, season) {
  event.stopPropagation();
  const restoreFocus = document.activeElement === event.currentTarget;
  const isCollapsed = isResearchSeasonCollapsed(season);
  setResearchSeasonCollapsed(season, !isCollapsed);
  renderTechList();
  restoreResearchSeasonActionFocus(season, 'collapse', restoreFocus);
}

function toggleResearchSeasonMax(event, season) {
  event.stopPropagation();
  const restoreFocus = document.activeElement === event.currentTarget;
  const seasonTechs = getResearchSeasonTechs(season);
  const wasComplete = seasonTechs.length > 0 && seasonTechs.every(isTechComplete);
  const updates = seasonTechs.flatMap((tech) =>
    tech.nodes.map((node) => ({
      techId: tech.id,
      nodeId: node.id,
      level: wasComplete ? 0 : node.maxLevel,
    }))
  );
  setStoredNodeLevels(updates);
  setResearchSeasonCollapsed(season, !wasComplete);
  renderTechList();
  restoreResearchSeasonActionFocus(season, 'max', restoreFocus);
}

function renderNodeBuffProgress(summary, compact = false) {
  const statusClass = `research-buff-chip--${summary.status}`;
  const detail = escapeHtml(getBuffProgressTitle(summary));
  if (compact) {
    const text =
      summary.status === 'known'
        ? summary.effects
            .map((effect) => `${effect.currentLabel}/${effect.maxLabel} ${effect.label}`)
            .join(' + ')
        : summary.status === 'unlock'
          ? summary.currentLabel === 'Unlocked'
            ? appT('researchBuffUnlocked')
            : appT('researchBuffUnlockShort')
          : appT('researchBuffUnknownShort');
    return `<span class="research-buff-chip ${statusClass}" title="${detail}">${escapeHtml(text)}</span>`;
  }

  if (summary.status === 'known') {
    const label = summary.effectLabels.join(' + ');
    return `
            <span class="research-buff-chip ${statusClass}" title="${detail}">
                <span class="research-buff-chip-value">${escapeHtml(summary.currentLabel)}</span>
                <span class="research-buff-chip-max">/ ${escapeHtml(summary.maxLabel)}</span>
                <span class="research-buff-chip-label">${escapeHtml(label)}</span>
            </span>
            <span class="research-buff-detail">${escapeHtml(appT('researchBuffNodeDetail', { remaining: summary.remainingLabel, perLevel: summary.perLevelLabel }))}</span>
        `;
  }

  const statusLabel =
    summary.status === 'missing'
      ? appT('researchBuffValuesNeedData')
      : summary.currentLabel === 'Unlocked'
        ? appT('researchBuffUnlocked')
        : appT('researchBuffLocked');
  return `
        <span class="research-buff-chip ${statusClass}" title="${detail}">${escapeHtml(statusLabel)}</span>
        <span class="research-buff-detail">${detail}</span>
    `;
}

function getBuffProgressTitle(summary) {
  if (summary.status === 'known') {
    return appT('researchBuffKnownDetailTitle', {
      current: summary.currentWithLabel,
      max: summary.maxWithLabel,
      remaining: summary.remainingLabel,
      perLevel: summary.perLevelLabel,
    });
  }
  if (summary.status === 'unlock') {
    return appT('researchBuffUnlockDetailTitle');
  }
  return appT('researchBuffMissingDetailTitle');
}

function getTechBuffSummary(tech) {
  return summarizeTechBuffs(tech, {
    getLevel: (node) => getStoredNodeLevel(tech.id, node.id),
    getNodeName: (node) => getResearchNodeName(tech, node),
    getNodeBuff: (node) => getResearchNodeBuff(tech, node),
    getEffectLabel: (effect, node, effectIndex) =>
      researchEffectText(tech, node, effect.label, effectIndex),
    locale: currentLanguage,
  });
}

function formatResearchCount(count, singularKey, pluralKey) {
  return appT(count === 1 ? singularKey : pluralKey, { n: count });
}

function renderResearchCardBuffPreview(tech) {
  const summary = getTechBuffSummary(tech);
  const topBuffs = summary.known.slice(0, 3);
  if (!topBuffs.length) {
    if (summary.missing.length) {
      return `<div class="research-card-buff-preview research-card-buff-preview--missing">${escapeHtml(appT('researchBuffValuesNeedData'))}</div>`;
    }
    if (summary.unlocks.length) {
      return `<div class="research-card-buff-preview research-card-buff-preview--unlock">${escapeHtml(appT('researchBuffUnlockCount', { n: summary.unlocks.length }))}</div>`;
    }
    return '';
  }

  const moreCount = Math.max(0, summary.known.length - topBuffs.length);
  return `
        <div class="research-card-buff-preview" role="group" aria-label="${escapeHtml(appT('researchBuffTopBuffsAria'))}">
            ${topBuffs
              .map(
                (buff) => `
                <span class="research-card-buff-pill" title="${escapeHtml(buff.nodes.slice(0, 4).join(', '))}">
                    <strong>${escapeHtml(buff.maxLabel)}</strong> ${escapeHtml(buff.label)}
                </span>
            `
              )
              .join('')}
            ${moreCount > 0 ? `<span class="research-card-buff-more">${escapeHtml(appT('researchBuffMore', { n: moreCount }))}</span>` : ''}
        </div>
    `;
}

let researchBuffSummaryKeyHandler = null;
let researchBuffSummaryReturnFocus = null;

function closeResearchBuffSummaryModal({ restoreFocus = true } = {}) {
  document.getElementById('researchBuffSummaryModal')?.remove();
  if (researchBuffSummaryKeyHandler) {
    document.removeEventListener('keydown', researchBuffSummaryKeyHandler);
    researchBuffSummaryKeyHandler = null;
  }
  const returnFocus = researchBuffSummaryReturnFocus;
  researchBuffSummaryReturnFocus = null;
  if (restoreFocus && returnFocus?.isConnected) {
    window.requestAnimationFrame(() => returnFocus.focus());
  }
}

function renderResearchBuffSummaryModal(tech, trigger = null) {
  closeResearchBuffSummaryModal({ restoreFocus: false });
  researchBuffSummaryReturnFocus =
    trigger instanceof HTMLElement
      ? trigger
      : document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
  const summary = getTechBuffSummary(tech);
  const sColor = TechseasonColors[tech.season] || '#38bdf8';
  const knownHtml = summary.known.length
    ? summary.known
        .map((buff) => {
          const pct = buff.maxValue
            ? Math.min(100, Math.max(0, Math.abs(buff.currentValue / buff.maxValue) * 100))
            : 0;
          return `
                <article class="research-buff-summary-item" data-buff-tone="${getResearchBuffTone(buff.canonicalLabel)}" title="${escapeHtml(buff.nodes.join(', '))}">
                    <div class="research-buff-summary-meter" style="--buff-pct: ${pct.toFixed(1)}%"></div>
                    <span class="research-buff-summary-value">${escapeHtml(buff.maxLabel)}</span>
                    <span class="research-buff-summary-label">${escapeHtml(buff.label)}</span>
                    <span class="research-buff-summary-meta">${escapeHtml(
                      appT('researchBuffSummaryItemMeta', {
                        current: buff.currentLabel,
                        remaining: buff.remainingLabel,
                        nodes: buff.nodeCount,
                        nodeLabel: formatResearchCount(
                          buff.nodeCount,
                          'researchBuffNodeSingular',
                          'researchBuffNodePlural'
                        ),
                      })
                    )}</span>
                </article>
            `;
        })
        .join('')
    : `<p class="research-buff-summary-empty">${escapeHtml(appT('researchBuffSummaryEmpty'))}</p>`;
  const unlockHtml = summary.unlocks.length
    ? `<div class="research-buff-summary-section">
            <h4>${escapeHtml(appT('researchBuffUnlocksTitle'))}</h4>
            <div class="research-buff-summary-tags">
                ${summary.unlocks
                  .slice(0, 12)
                  .map((item) => `<span>${escapeHtml(item.name)}</span>`)
                  .join('')}
                ${summary.unlocks.length > 12 ? `<span>${escapeHtml(appT('researchBuffMore', { n: summary.unlocks.length - 12 }))}</span>` : ''}
            </div>
        </div>`
    : '';
  const missingHtml = summary.missing.length
    ? `<div class="research-buff-summary-section research-buff-summary-section--missing">
            <h4>${escapeHtml(appT('researchBuffNeedValuesTitle'))}</h4>
            <div class="research-buff-summary-tags">
                ${summary.missing
                  .slice(0, 12)
                  .map((item) => `<span>${escapeHtml(item.name)}</span>`)
                  .join('')}
                ${summary.missing.length > 12 ? `<span>${escapeHtml(appT('researchBuffMore', { n: summary.missing.length - 12 }))}</span>` : ''}
            </div>
        </div>`
    : '';

  const modal = document.createElement('div');
  modal.id = 'researchBuffSummaryModal';
  modal.dataset.techId = tech.id;
  modal.className = 'research-buff-summary-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'researchBuffSummaryTitle');
  modal.setAttribute('aria-describedby', 'researchBuffSummaryMeta');
  modal.innerHTML = `
        <div class="research-buff-summary-card" role="document" style="--season-color: ${sColor}">
            <div class="research-buff-summary-head">
                <div>
                    <span class="research-buff-summary-season">${escapeHtml(tech.season)}</span>
                    <h3 id="researchBuffSummaryTitle">${escapeHtml(appT('researchBuffSummaryTitle', { tech: getResearchTreeName(tech) }))}</h3>
                    <p id="researchBuffSummaryMeta">${escapeHtml(
                      appT('researchBuffSummaryMeta', {
                        buffs: summary.totals.known,
                        unlocks: summary.totals.unlocks,
                        missing: summary.totals.missing,
                      })
                    )}</p>
                </div>
                <button type="button" class="research-buff-summary-close" aria-label="${escapeHtml(appT('researchBuffCloseAria'))}">&times;</button>
            </div>
            <div class="research-buff-summary-grid">${knownHtml}</div>
            ${unlockHtml}
            ${missingHtml}
        </div>
    `;
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeResearchBuffSummaryModal();
  });
  modal
    .querySelector('.research-buff-summary-close')
    ?.addEventListener('click', closeResearchBuffSummaryModal);
  researchBuffSummaryKeyHandler = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeResearchBuffSummaryModal();
      return;
    }
    if (e.key !== 'Tab') return;
    const focusable = Array.from(
      modal.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    ).filter((element) => !element.hidden);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };
  document.addEventListener('keydown', researchBuffSummaryKeyHandler);
  document.body.appendChild(modal);
  modal.querySelector('.research-buff-summary-close')?.focus();
}

function syncTechSeasonButtons() {
  document.querySelectorAll('.tech-season-btn').forEach((btn) => {
    const season = btn.dataset.season;
    const isActive = activeTechSeasons.has(season);
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-pressed', String(isActive));
    if (isActive) {
      btn.style.setProperty('--sc', TechseasonColors[season] || '#38bdf8');
    } else {
      btn.style.removeProperty('--sc');
    }
  });
  syncResearchQuickButtons();
}

function syncResearchQuickButtons() {
  const allBtn = document.getElementById('techSeasonAllBtn');
  const currentBtn = document.getElementById('techSeasonX1Btn');
  const isAll = TECH_SEASON_ORDER.every((s) => activeTechSeasons.has(s));
  const isX1Only = activeTechSeasons.size === 1 && activeTechSeasons.has('X1');
  allBtn?.classList.toggle('active', isAll);
  currentBtn?.classList.toggle('active', isX1Only);
  allBtn?.setAttribute('aria-pressed', String(isAll));
  currentBtn?.setAttribute('aria-pressed', String(isX1Only));
}

function closeTechCalculator() {
  const container = document.getElementById('techCalculatorContainer');
  if (!container || container.classList.contains('hidden')) return;
  container.classList.add('research-calculator--closing');
  document.body.classList.remove('research-calculator-open');
  if (researchCalculatorKeyHandler) {
    document.removeEventListener('keydown', researchCalculatorKeyHandler);
    researchCalculatorKeyHandler = null;
  }
  window.setTimeout(() => {
    container.classList.add('hidden');
    container.classList.remove('research-calculator--closing');
    container.removeAttribute('aria-labelledby');
    container.removeAttribute('aria-modal');
    const returnFocus = researchCalculatorReturnFocus;
    researchCalculatorReturnFocus = null;
    if (returnFocus?.isConnected) returnFocus.focus();
  }, 200);
}

function bindResearchCalculatorDialog(container) {
  if (researchCalculatorKeyHandler) {
    document.removeEventListener('keydown', researchCalculatorKeyHandler);
  }
  researchCalculatorKeyHandler = (event) => {
    if (document.getElementById('researchBuffSummaryModal')) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closeTechCalculator();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = Array.from(
      container.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    ).filter((element) => !element.hidden && element.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };
  document.addEventListener('keydown', researchCalculatorKeyHandler);
}

function updateTechSeasons(seasons) {
  setActiveTechSeasons(new Set(seasons));
  syncTechSeasonButtons();
  renderTechList();
  closeTechCalculator();
}

function getFilteredTechTrees() {
  const q = techSearchQuery.trim().toLocaleLowerCase(resolveIntlLocale(currentLanguage));
  return techDatabase
    .filter((tech) => activeTechSeasons.has(tech.season))
    .filter((tech) => {
      if (!q) return true;
      return researchSearchText(tech).includes(q);
    })
    .sort((a, b) => {
      const si = TECH_SEASON_ORDER.indexOf(a.season) - TECH_SEASON_ORDER.indexOf(b.season);
      if (si !== 0) return si;
      const ar = a.default_pos?.row || 99;
      const br = b.default_pos?.row || 99;
      if (ar !== br) return ar - br;
      return (a.default_pos?.col || 99) - (b.default_pos?.col || 99);
    });
}

async function initResearchCalculator() {
  const researchSection = document.getElementById('researchSection');
  if (!researchSection) return;

  let requestedLocale;
  do {
    requestedLocale = currentLanguage;
    await loadResearchLocale(requestedLocale);
  } while (requestedLocale !== currentLanguage);

  if (!ENABLE_RESEARCH_FEATURE) {
    researchSection.innerHTML = `
            <div class="research-construction-card">
                <h2 class="research-construction-title">Under Construction</h2>
            </div>
        `;
    return;
  }

  const seasonBtns = document.querySelectorAll('.tech-season-btn');
  if (!seasonBtns.length) return;

  syncTechSeasonButtons();

  seasonBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const season = btn.dataset.season;
      if (activeTechSeasons.has(season)) {
        if (activeTechSeasons.size > 1) activeTechSeasons.delete(season);
      } else {
        activeTechSeasons.add(season);
      }
      syncTechSeasonButtons();
      renderTechList();
      closeTechCalculator();
    });
  });

  document.getElementById('techSeasonAllBtn')?.addEventListener('click', () => {
    updateTechSeasons(TECH_SEASON_ORDER);
  });

  document.getElementById('techSeasonX1Btn')?.addEventListener('click', () => {
    updateTechSeasons(['X1']);
  });

  const searchInput = document.getElementById('techSearchInput');
  if (searchInput) {
    let searchTimer;
    searchInput.addEventListener('input', (e) => {
      setTechSearchQuery(e.target.value);
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => renderTechList(), 180);
    });
  }

  renderTechList();

  try {
    const plannersHost = document.createElement('section');
    plannersHost.id = 'plannersSection';
    researchSection.appendChild(plannersHost);
    import('./planners-entry.js')
      .then((module) => module.initLane5Planners?.(plannersHost))
      .catch(() => {});
  } catch {
  }
}

async function refreshResearchLocale(locale = currentLanguage) {
  const requestId = ++researchLocaleRenderGeneration;
  await loadResearchLocale(locale);
  if (requestId !== researchLocaleRenderGeneration || locale !== currentLanguage) return false;
  renderTechList();

  const container = document.getElementById('techCalculatorContainer');
  const techId = container?.dataset.techId;
  if (techId && !container.classList.contains('hidden')) {
    const tech = techDatabase.find((candidate) => candidate.id === techId);
    if (tech) renderCalculator(tech);
  }

  const summaryModal = document.getElementById('researchBuffSummaryModal');
  const summaryTechId = summaryModal?.dataset.techId;
  if (summaryTechId) {
    const tech = techDatabase.find((candidate) => candidate.id === summaryTechId);
    if (tech) renderResearchBuffSummaryModal(tech, researchBuffSummaryReturnFocus);
  }
  return true;
}

function quickMaxTech(e, techId) {
  e.stopPropagation();
  const tech = techDatabase.find((t) => t.id === techId);
  if (!tech) return;

  const wasComplete = isTechComplete(tech);
  const restoreFocus = document.activeElement === e.currentTarget;

  setStoredNodeLevels(
    tech.nodes.map((node) => ({
      techId: tech.id,
      nodeId: node.id,
      level: wasComplete ? 0 : node.maxLevel,
    }))
  );

  renderTechList();

  const calcContainer = document.getElementById('techCalculatorContainer');
  if (calcContainer && !calcContainer.classList.contains('hidden')) {
    renderCalculator(tech);
  }

  const btn = Array.from(document.querySelectorAll('.research-card-max')).find(
    (candidate) => candidate.dataset.techId === techId
  );
  if (restoreFocus) btn?.focus({ preventScroll: true });
  if (!wasComplete && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    const card = btn?.closest('.research-tech-card');
    if (card) {
      card.classList.remove('research-tech-card--completion-pulse');
      void card.offsetWidth;
      card.classList.add('research-tech-card--completion-pulse');
      window.setTimeout(() => card.classList.remove('research-tech-card--completion-pulse'), 720);
    }
  }
}

function renderTechList() {
  const container = document.getElementById('techListContainer');
  if (!container) return;

  container.classList.add('research-list--updating');

  const filteredTechs = getFilteredTechTrees();
  updateGlobalSummary(filteredTechs);

  const countEl = document.getElementById('techTreeCount');
  if (countEl) {
    countEl.textContent = appT('researchTreeCount', { n: filteredTechs.length });
  }

  container.innerHTML = '<div class="research-grid" id="techGridWrapper"></div>';
  const wrapper = document.getElementById('techGridWrapper');

  if (filteredTechs.length === 0) {
    const emptyMsg = techSearchQuery.trim() ? appT('researchNoResults') : appT('researchNoData');
    wrapper.innerHTML = `<p class="research-empty">${emptyMsg}</p>`;
    requestAnimationFrame(() => container.classList.remove('research-list--updating'));
    return;
  }

  const fragment = document.createDocumentFragment();
  let lastSeason = null;
  let currentSeasonGroup = null;
  let cardIndex = 0;
  const visibleSeasonCounts = filteredTechs.reduce((counts, tech) => {
    counts.set(tech.season, (counts.get(tech.season) || 0) + 1);
    return counts;
  }, new Map());

  filteredTechs.forEach((tech) => {
    if (tech.season !== lastSeason) {
      lastSeason = tech.season;
      const seasonComplete = isResearchSeasonComplete(tech.season);
      const isCollapsed = isResearchSeasonCollapsed(tech.season);
      const seasonGroupId = `researchSeasonCards-${tech.season}`;
      const seasonTreeCount = visibleSeasonCounts.get(tech.season) || 0;
      const seasonTreeLabel = appT('researchTreeCount', { n: seasonTreeCount });
      const collapseLabel = `${tech.season}: ${seasonTreeLabel}`;
      const maxSeasonLabel = `${seasonComplete ? appT('researchResetAll') : appT('researchMaxAll')} · ${appT('researchSeasonLabel')} ${tech.season}`;
      const header = document.createElement('div');
      header.className = `research-season-header${seasonComplete ? ' research-season-header--complete' : ''}`;
      header.dataset.season = tech.season;
      header.dataset.complete = String(seasonComplete);
      header.style.setProperty('--season-color', TechseasonColors[tech.season] || '#3b82f6');
      header.innerHTML = `
                <span class="research-season-chip">${escapeHtml(tech.season)}</span>
                <span class="research-season-line"></span>
                <span class="research-season-actions">
                    <button type="button" class="research-season-collapse" data-research-season-action="collapse" data-season="${escapeHtml(tech.season)}" aria-expanded="${!isCollapsed}" aria-controls="${seasonGroupId}" aria-label="${escapeHtml(collapseLabel)}" title="${escapeHtml(collapseLabel)}">
                        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="m6 9 6 6 6-6" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    </button>
                    <button type="button" class="research-season-max${seasonComplete ? ' research-season-max--done' : ''}" data-research-season-action="max" data-season="${escapeHtml(tech.season)}" aria-pressed="${seasonComplete}" aria-label="${escapeHtml(maxSeasonLabel)}" title="${escapeHtml(maxSeasonLabel)}">
                        ${seasonComplete ? '<svg class="research-check-icon" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>' : ''}
                        <span>${escapeHtml(seasonComplete ? appT('researchResetAll') : appT('researchMaxAll'))}</span>
                    </button>
                </span>`;
      header.querySelector('.research-season-collapse')?.addEventListener('click', (event) => {
        toggleResearchSeasonCollapse(event, tech.season);
      });
      header.querySelector('.research-season-max')?.addEventListener('click', (event) => {
        toggleResearchSeasonMax(event, tech.season);
      });
      fragment.appendChild(header);

      currentSeasonGroup = document.createElement('div');
      currentSeasonGroup.id = seasonGroupId;
      currentSeasonGroup.className = 'research-season-card-group';
      currentSeasonGroup.dataset.season = tech.season;
      currentSeasonGroup.setAttribute('role', 'group');
      currentSeasonGroup.setAttribute('aria-label', `${tech.season}: ${seasonTreeLabel}`);
      currentSeasonGroup.hidden = isCollapsed;
      fragment.appendChild(currentSeasonGroup);
    }

    const sColor = TechseasonColors[tech.season] || '#3b82f6';
    const totals = getTechMedalTotals(tech);
    const isComplete = isTechComplete(tech);
    const card = document.createElement('article');
    card.className = `research-tech-card${isComplete ? ' research-tech-card--complete' : ''}`;
    card.dataset.techId = tech.id;
    card.dataset.complete = String(isComplete);
    card.style.setProperty('--season-color', sColor);
    card.style.setProperty('--hover-color', `${sColor}40`);
    card.style.setProperty('--border-color', sColor);
    card.style.setProperty('--card-delay', `${Math.min(cardIndex * 35, 280)}ms`);
    cardIndex += 1;

    const treeName = getResearchTreeName(tech);
    const resourceLabel = getResearchTreeResource(tech) || '—';
    const progressPct = Math.min(100, Math.max(0, totals.pct));
    const progressLabel = appT('researchProgress', { pct: progressPct.toFixed(0) });
    const maxActionLabel = `${isComplete ? appT('researchClearLevel') : appT('researchCompleteTree')}: ${treeName}`;

    card.innerHTML = `
            <div class="research-card-topline">
                <span class="research-card-season">${escapeHtml(tech.season)}</span>
                <span class="research-card-pct">${escapeHtml(progressLabel)}</span>
            </div>
            <div class="research-card-head">
                <h3 class="research-card-title">${escapeHtml(treeName)}</h3>
            </div>
            <div class="research-card-meta">
                <p class="research-card-unlock"><span>${escapeHtml(appT('researchUnlock'))}</span>${escapeHtml(getResearchTreeUnlock(tech))}</p>
                <p class="research-card-resource">${escapeHtml(resourceLabel)}</p>
            </div>
            ${renderResearchCardBuffPreview(tech)}
            <div class="research-card-progress" role="progressbar" aria-label="${escapeHtml(progressLabel)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progressPct.toFixed(0)}">
                <div class="research-card-progress-bar"></div>
            </div>
            <div class="research-card-actions">
                <button type="button" class="research-card-buffs" aria-label="${escapeHtml(appT('researchBuffSummaryOpenAria', { tech: treeName }))}">${escapeHtml(appT('researchBuffButton'))}</button>
                <button type="button" class="research-card-max${isComplete ? ' research-card-max--done' : ''}" data-tech-id="${escapeHtml(tech.id)}" aria-pressed="${isComplete}" aria-label="${escapeHtml(maxActionLabel)}" title="${escapeHtml(isComplete ? appT('researchClearLevel') : appT('researchCompleteTree'))}">
                    ${isComplete ? '<svg class="research-check-icon" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>' : ''}
                    <span>${escapeHtml(isComplete ? appT('researchClearLevel') : appT('researchCompleteTree'))}</span>
                </button>
                <button type="button" class="research-card-cta">
                    <span>${escapeHtml(appT('researchOpenCalc'))}</span>
                    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none"><path d="m7.5 4.5 5.5 5.5-5.5 5.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </button>
            </div>
        `;
    card
      .querySelector('.research-card-progress-bar')
      ?.style.setProperty('--progress-pct', `${progressPct.toFixed(1)}%`);

    card.querySelector('.research-card-buffs')?.addEventListener('click', (e) => {
      renderResearchBuffSummaryModal(tech, e.currentTarget);
    });
    card.querySelector('.research-card-max')?.addEventListener('click', (e) => {
      quickMaxTech(e, tech.id);
    });

    const openCalc = () => renderCalculator(tech);
    card.querySelector('.research-card-cta')?.addEventListener('click', openCalc);
    currentSeasonGroup?.appendChild(card);
  });

  wrapper.replaceChildren(fragment);

  let sourceNote = document.getElementById('researchSourceNote');
  if (!sourceNote) {
    sourceNote = document.createElement('p');
    sourceNote.id = 'researchSourceNote';
    sourceNote.className = 'research-source-note';
    container.appendChild(sourceNote);
  }
  sourceNote.textContent = getSourceCreditText();
  requestAnimationFrame(() => container.classList.remove('research-list--updating'));
}

function updateGlobalSummary(filteredTechs = null) {
  if (!filteredTechs) filteredTechs = getFilteredTechTrees();

  let totalWbMax = 0;
  let totalWbCurrent = 0;
  let totalCmMax = 0;
  let totalCmCurrent = 0;

  filteredTechs.forEach((tech) => {
    const t = getTechMedalTotals(tech);
    totalWbMax += t.wbMax;
    totalWbCurrent += t.wbCurrent;
    totalCmMax += t.cmMax;
    totalCmCurrent += t.cmCurrent;
  });

  const remainingWb = totalWbMax - totalWbCurrent;
  const remainingCm = totalCmMax - totalCmCurrent;
  const totalMedalsMax = totalWbMax + totalCmMax;
  const totalMedalsCurrent = totalWbCurrent + totalCmCurrent;
  const progressPercent = totalMedalsMax > 0 ? (totalMedalsCurrent / totalMedalsMax) * 100 : 0;

  const summaryEl = document.getElementById('globalTechSummary');
  if (!summaryEl) return;

  if (totalMedalsMax === 0 && filteredTechs.length === 0) {
    summaryEl.innerHTML = '';
    return;
  }

  const iconCM = '<img src="images/CM.png" class="research-medal-icon" alt="CM">';
  const iconWB = '<img src="images/WB.png" class="research-medal-icon" alt="WB">';

  summaryEl.innerHTML = `
        <div class="research-summary-card">
            <h3 class="research-summary-title">${appT('researchGlobalSummary')}</h3>
            <div class="research-summary-progress-wrap">
                <div class="research-summary-progress-labels">
                    <span>${appT('researchCombinedCompletion')}</span>
                    <span class="research-summary-pct">${progressPercent.toFixed(1)}%</span>
                </div>
                <div class="research-summary-progress-track">
                    <div class="research-summary-progress-fill"></div>
                </div>
            </div>
            <div class="research-summary-stats">
                ${
                  totalWbMax > 0
                    ? `
                <div class="research-summary-stat research-summary-stat-wb">
                    <span class="research-summary-stat-label">${appT('researchRemainingWb')}</span>
                    <span class="research-summary-stat-value">${iconWB} ${formatResearchNumber(remainingWb)}</span>
                    <span class="research-summary-stat-total">${appT('researchOfTotal', { n: formatResearchNumber(totalWbMax) })}</span>
                </div>`
                    : ''
                }
                ${
                  totalCmMax > 0
                    ? `
                <div class="research-summary-stat research-summary-stat-cm">
                    <span class="research-summary-stat-label">${appT('researchRemainingCm')}</span>
                    <span class="research-summary-stat-value">${iconCM} ${formatResearchNumber(remainingCm)}</span>
                    <span class="research-summary-stat-total">${appT('researchOfTotal', { n: formatResearchNumber(totalCmMax) })}</span>
                </div>`
                    : ''
                }
            </div>
        </div>
    `;
  summaryEl
    .querySelector('.research-summary-progress-fill')
    ?.style.setProperty('--progress-pct', `${progressPercent}%`);
}

function applyAutoGridToGroup(groupNodes) {
  let r = 1;
  let lastType = '';
  let colsInRow = new Set();

  groupNodes.forEach((node, i) => {
    if (node.row && node.col) {
      r = node.row;
      colsInRow.add(node.col);
      return;
    }

    let t = node.troop ? node.troop.toLowerCase() : '';
    let type = t === 'all' || t.includes('lofty') || !t ? 'ALL' : 'SPECIFIC';

    let c = 2;
    if (t.includes('footm')) c = 1;
    if (t.includes('arch')) c = 3;

    if (type !== lastType && colsInRow.size > 0) {
      r++;
      colsInRow.clear();
    }

    if (colsInRow.has(c)) {
      if (type === 'ALL') {
        if (!colsInRow.has(1)) c = 1;
        else if (!colsInRow.has(3)) c = 3;
        else {
          r++;
          colsInRow.clear();
          c = 2;
        }
      } else {
        r++;
        colsInRow.clear();
      }
    }

    if (type === 'ALL' && colsInRow.size === 0) {
      let next = groupNodes[i + 1];
      let nextIsAll =
        next &&
        (!next.troop ||
          next.troop.toLowerCase() === 'all' ||
          next.troop.toLowerCase().includes('lofty'));
      let nextNext = groupNodes[i + 2];
      let nextNextIsAll = nextNext && (!nextNext.troop || nextNext.troop.toLowerCase() === 'all');

      if (nextIsAll && (!nextNext || !nextNextIsAll)) c = 1;
    } else if (type === 'ALL' && colsInRow.has(1) && !colsInRow.has(2)) {
      c = 3;
    }

    node.row = r;
    node.col = c;
    colsInRow.add(c);
    lastType = type;
  });
}

function usesGameTreeLayout(tech) {
  if (tech.layoutMode === 'branch') return false;
  if (tech.layoutMode === 'game') return true;
  const hasTroopBranches = tech.nodes.some(
    (n) => n.b == 1 || n.b == 2 || n.b == 3 || n.b === '1' || n.b === '2' || n.b === '3'
  );
  if (hasTroopBranches) return false;
  return tech.nodes.every((n) => n.row && n.col);
}

function getGameTroopClass(troop) {
  const t = (troop || '').toLowerCase();
  if (t.includes('arch')) return 'archer';
  if (t.includes('cav')) return 'cavalry';
  if (t === 'all' || !t) return 'all';
  return 'footmen';
}

function formatGameNodeLevel(node, level) {
  if (level >= node.maxLevel) return appT('researchMaxLevel');
  return `${level}/${node.maxLevel}`;
}

function getGameNodeState(node, level) {
  if (level >= node.maxLevel) return 'complete';
  if (level > 0) return 'progress';
  return 'idle';
}

// The game unlocks a research row only once every node in the row above has at least one
// level, so the calculator enforces the same order in both directions: a locked row cannot
// be raised, and a row something above depends on cannot be cleared back to zero. Bulk
// Reset All / Complete All bypass this with { force: true }.
function getTechRowMap(tech) {
  if (tech._rowMap) return tech._rowMap;
  const rows = new Map();
  tech.nodes.forEach((node) => {
    const row = Number(node.row) || 0;
    if (!rows.has(row)) rows.set(row, []);
    rows.get(row).push(node);
  });
  Object.defineProperty(tech, '_rowMap', { value: rows, enumerable: false, writable: true });
  return rows;
}

function getAdjacentRow(tech, row, direction) {
  const rows = [...getTechRowMap(tech).keys()].sort((a, b) => a - b);
  return direction < 0
    ? rows.filter((value) => value < row).pop()
    : rows.find((value) => value > row);
}

function isRowStarted(tech, row) {
  const nodes = getTechRowMap(tech).get(row) || [];
  if (!nodes.length) return true;
  return nodes.every((node) => getStoredNodeLevel(tech.id, node.id) > 0);
}

function isNodeLocked(tech, node) {
  const previousRow = getAdjacentRow(tech, Number(node.row) || 0, -1);
  if (previousRow === undefined) return false;
  return !isRowStarted(tech, previousRow);
}

function hasStartedDependents(tech, node) {
  const nextRow = getAdjacentRow(tech, Number(node.row) || 0, 1);
  if (nextRow === undefined) return false;
  return (getTechRowMap(tech).get(nextRow) || []).some(
    (candidate) => getStoredNodeLevel(tech.id, candidate.id) > 0
  );
}

// Locking depends on sibling rows, so it is re-evaluated across the whole tree after any
// level change rather than per node.
function syncGameLockStates(rootEl, tech) {
  if (!rootEl) return;
  rootEl.querySelectorAll('.game-tech-node-wrap').forEach((wrap) => {
    const node = tech.nodes.find((candidate) => candidate.id === wrap.dataset.nodeId);
    if (!node) return;
    const locked = isNodeLocked(tech, node);
    wrap.dataset.nodeLocked = locked ? 'true' : 'false';
    const tap = wrap.querySelector('.game-tech-tap');
    if (tap) {
      tap.setAttribute('aria-disabled', locked ? 'true' : 'false');
      if (locked) tap.setAttribute('title', appT('researchRowLocked'));
      else tap.removeAttribute('title');
    }
  });
}

function getGameNodeArtState() {
  // Keep one stable sprite crop for every level; CSS communicates progress.
  return 'idle';
}

function syncGameTierState(tier) {
  if (!tier) return;
  const states = Array.from(tier.querySelectorAll('.game-tech-node-wrap')).map(
    (node) => node.dataset.nodeState
  );
  const state =
    states.length && states.every((value) => value === 'complete')
      ? 'complete'
      : states.some((value) => value === 'progress' || value === 'complete')
        ? 'progress'
        : 'idle';
  tier.dataset.tierState = state;
  const connector = tier.nextElementSibling;
  if (connector?.classList.contains('game-tree-connector')) {
    connector.dataset.pathState = state;
    connector.querySelectorAll('[data-edge-from]').forEach((edge) => {
      const sourceNode = tier.querySelector(
        `.game-tech-node-wrap[data-node-id="${edge.dataset.edgeFrom}"]`
      );
      edge.dataset.pathState = sourceNode?.dataset.nodeState || 'idle';
    });
  }
}

function syncGameNodeVisual(tech, node, level, wrapEl) {
  const wraps = wrapEl
    ? [wrapEl]
    : Array.from(document.querySelectorAll(`.game-tech-node-wrap[data-node-id="${node.id}"]`));
  wraps.forEach((wrap) => {
    const pct = node.maxLevel > 0 ? (level / node.maxLevel) * 100 : 0;
    wrap.style.setProperty('--node-pct', `${pct}%`);
    wrap.style.setProperty('--node-deg', String((pct / 100) * 360));
    const tap = wrap.querySelector('.game-tech-tap');
    const lvlEl = wrap.querySelector('.game-tech-level-badge');
    const input = wrap.querySelector('.tech-node-input');
    const maxBtn = wrap.querySelector('.game-tech-step--max');
    const nodeState = getGameNodeState(node, level);
    wrap.dataset.nodeState = nodeState;
    applyGameNodeArt(wrap, tech, node, getGameNodeArtState(node, level));
    if (lvlEl) lvlEl.textContent = formatGameNodeLevel(node, level);
    if (input) input.value = level;
    if (tap) {
      tap.setAttribute(
        'aria-label',
        `${getResearchNodeName(tech, node)}. ${appT('researchCurrentLevel')}: ${level}/${node.maxLevel}`
      );
      tap.classList.toggle('game-tech-tap--maxed', level >= node.maxLevel);
      tap.classList.toggle('game-tech-tap--progress', level > 0 && level < node.maxLevel);
    }
    if (maxBtn) {
      const isMaxed = level >= node.maxLevel;
      maxBtn.textContent = isMaxed ? '↩' : 'MAX';
      maxBtn.dataset.step = isMaxed ? '0' : 'max';
      maxBtn.classList.toggle('game-tech-step--undo', isMaxed);
    }
    syncGameTierState(wrap.closest('.game-tree-tier-block'));
  });
}

function syncGameNodeButton(tech, node, level) {
  syncGameNodeVisual(tech, node, level);
}

function pulseGameNodeWrap(wrapEl) {
  if (!wrapEl || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  wrapEl.classList.remove('game-tech-node-wrap--pulse');
  void wrapEl.offsetWidth;
  wrapEl.classList.add('game-tech-node-wrap--pulse');
  window.setTimeout(() => wrapEl.classList.remove('game-tech-node-wrap--pulse'), 320);
}

function applyGameNodeArt(wrap, tech, node, preferredState) {
  const artTarget = wrap.querySelector('.game-tech-art');
  if (!artTarget) return;
  const resolution = resolveResearchNodeArt(
    {
      treeId: tech.id,
      nodeId: node.id,
      preferredState,
      nodeName: node.name,
      buff: node.buff,
      troop: node.troop,
    },
    techDatabase
  );
  const art = resolution.art;
  wrap.dataset.requestedArtState = preferredState;
  wrap.dataset.artProvenance = resolution.provenance;
  wrap.dataset.artRequestedKey = resolution.requestedKey;
  wrap.dataset.artSourceKey = resolution.sourceKey;
  wrap.dataset.artMatchedState = resolution.matchedState || '';
  if (!art) {
    wrap.dataset.exactArt = 'unavailable';
    artTarget.hidden = true;
    artTarget.style.backgroundImage = 'none';
    delete artTarget.dataset.observedState;
    delete artTarget.dataset.palette;
    return;
  }

  const [sourceWidth, sourceHeight] = art.sourceDimensions;
  const [x, y, width, height] = art.rect;
  const cssWidthLimit = Math.min(Number(art.maxCssPx) || 76, 76);
  const scale = Math.min(cssWidthLimit / width, 58 / height);
  const cssWidth = width * scale;
  const cssHeight = height * scale;
  artTarget.hidden = false;
  artTarget.style.width = `${cssWidth}px`;
  artTarget.style.height = `${cssHeight}px`;
  artTarget.style.backgroundImage = `url("${art.source}")`;
  artTarget.style.backgroundSize = `${sourceWidth * scale}px ${sourceHeight * scale}px`;
  artTarget.style.backgroundPosition = `${-x * scale}px ${-y * scale}px`;
  artTarget.dataset.observedState = art.observedState;
  artTarget.dataset.palette = art.palette;
  wrap.dataset.exactArt = resolution.provenance === 'exact-node-state' ? 'available' : 'fallback';
}

function buildFallbackGameRows(nodes) {
  const rows = new Map();
  nodes.forEach((node) => {
    const row = Number(node.row || node.Row || node.page || 1);
    if (!rows.has(row)) rows.set(row, []);
    rows.get(row).push(node);
  });
  return Array.from(rows.entries())
    .sort(([a], [b]) => a - b)
    .map(([, rowNodes]) => {
      rowNodes.sort((a, b) => Number(a.col || a.column || 2) - Number(b.col || b.column || 2));
      const columns =
        rowNodes.length === 1
          ? [2]
          : rowNodes.length === 2
            ? [1, 3]
            : rowNodes.map((node, index) => Number(node.col || node.column || index + 1));
      return { nodes: rowNodes.map((node) => node.id), columns };
    });
}

function resolveResearchGameLayout(tech) {
  const configured = RESEARCH_GAME_LAYOUTS[tech.id];
  if (!configured) {
    const pageGroups = new Map();
    tech.nodes.forEach((node) => {
      const page = Number(node.page || 1);
      if (!pageGroups.has(page)) pageGroups.set(page, []);
      pageGroups.get(page).push(node);
    });
    return {
      theme: 'amber',
      sections: Array.from(pageGroups.entries())
        .sort(([a], [b]) => a - b)
        .map(([page, nodes]) => ({
          id: `part-${page}`,
          label:
            getResearchTreePages(tech)?.[page - 1] || appT('researchGamePartShort', { n: page }),
          rows: buildFallbackGameRows(nodes),
        })),
    };
  }

  const validIds = new Set(tech.nodes.map((node) => node.id));
  const placed = new Set();
  const sections = configured.sections
    .map((section) => ({
      ...section,
      rows: section.rows
        .map((row) => {
          const entries = row.nodes
            .map((nodeId, index) => ({ nodeId, column: row.columns?.[index] }))
            .filter(({ nodeId }) => validIds.has(nodeId));
          entries.forEach(({ nodeId }) => placed.add(nodeId));
          return {
            nodes: entries.map(({ nodeId }) => nodeId),
            columns: entries.map(({ column }, index) => Number(column) || index + 1),
          };
        })
        .filter((row) => row.nodes.length),
    }))
    .filter((section) => section.rows.length);

  const remaining = tech.nodes.filter((node) => !placed.has(node.id));
  if (remaining.length) {
    sections.push({
      id: 'database-continuation-auto',
      label: appT('researchGameSequenceHint'),
      rows: buildFallbackGameRows(remaining),
    });
  }

  return { ...configured, sections };
}

function getResearchSectionLabel(section, index) {
  if (section?.labelKey) {
    const translated = appT(section.labelKey);
    if (translated && translated !== section.labelKey) return translated;
    const source = section.id || section.labelKey.replace(/^researchSection/, '');
    return source
      .replace(/[-_]+/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }
  return section?.label || appT('researchGamePartShort', { n: index + 1 });
}

function buildInferredGameConnectorHtml(fromCount, toCount, state, isSectionBoundary = false) {
  const relation =
    fromCount === toCount
      ? fromCount > 1
        ? 'lanes'
        : 'single'
      : fromCount < toCount
        ? 'fan'
        : 'merge';
  return `<div class="game-tree-connector game-tree-connector--${relation}${isSectionBoundary ? ' game-tree-connector--section' : ''}" data-path-state="${state}" data-from-count="${fromCount}" data-to-count="${toCount}" aria-hidden="true"><span></span></div>`;
}

function getGameRowColumn(row, nodeId) {
  const index = row.nodes.indexOf(nodeId);
  return index >= 0 ? Math.min(3, Math.max(1, Number(row.columns?.[index]) || index + 1)) : null;
}

function buildGameConnectorHtml(tech, fromRow, toRow, edges, state, isSectionBoundary = false) {
  const authoredEdges = (edges || []).filter(
    ([fromNodeId, toNodeId]) => fromRow.nodes.includes(fromNodeId) && toRow.nodes.includes(toNodeId)
  );
  if (!authoredEdges.length) {
    return buildInferredGameConnectorHtml(
      fromRow.nodes.length,
      toRow.nodes.length,
      state,
      isSectionBoundary
    );
  }

  const paths = authoredEdges
    .map(([fromNodeId, toNodeId]) => {
      const fromColumn = getGameRowColumn(fromRow, fromNodeId);
      const toColumn = getGameRowColumn(toRow, toNodeId);
      const fromX = fromColumn * 200 - 100;
      const toX = toColumn * 200 - 100;
      const sourceNode = tech.nodes.find((node) => node.id === fromNodeId);
      const sourceLevel = sourceNode ? getStoredNodeLevel(tech.id, sourceNode.id) : 0;
      const pathState = sourceNode ? getGameNodeState(sourceNode, sourceLevel) : 'idle';
      return `<path d="M ${fromX} 0 V 50 H ${toX} V 100" data-edge-from="${escapeHtml(fromNodeId)}" data-edge-to="${escapeHtml(toNodeId)}" data-path-state="${pathState}" vector-effect="non-scaling-stroke"></path>`;
    })
    .join('');

  return `<svg class="game-tree-connector game-tree-connector--authored${isSectionBoundary ? ' game-tree-connector--section' : ''}" data-path-state="${state}" viewBox="0 0 600 100" preserveAspectRatio="none" aria-hidden="true">${paths}</svg>`;
}

function buildGameTreeTierHtml(tech, row, tierIndex, nextRow, edges, isSectionBoundary = false) {
  const nodesInRow = row.nodes
    .map((nodeId, index) => {
      const node = tech.nodes.find((candidate) => candidate.id === nodeId);
      return node ? { ...node, _displayCol: Number(row.columns?.[index]) || index + 1 } : null;
    })
    .filter(Boolean);
  const tierState = nodesInRow.every(
    (node) => getStoredNodeLevel(tech.id, node.id) >= node.maxLevel
  )
    ? 'complete'
    : nodesInRow.some((node) => getStoredNodeLevel(tech.id, node.id) > 0)
      ? 'progress'
      : 'idle';
  const slots = [null, null, null];
  nodesInRow.forEach((node) => {
    const column = Math.min(3, Math.max(1, node._displayCol || 2));
    slots[column - 1] = node;
  });

  let html = `<section class="game-tree-tier-block" data-tier-state="${tierState}" data-tier-index="${tierIndex}"><div class="game-tree-tier" data-row-count="${nodesInRow.length}">`;
  slots.forEach((node) => {
    if (!node) {
      html += '<span class="game-tree-slot" aria-hidden="true"></span>';
      return;
    }
    const level = getStoredNodeLevel(tech.id, node.id);
    const troopClass = getGameTroopClass(node.troop);
    const nodeState = getGameNodeState(node, level);
    html += `
          <article class="tech-node-container game-tech-node-wrap game-tech-node-wrap--${troopClass}"
            data-node-id="${escapeHtml(node.id)}" data-node-col="${node._displayCol || 2}" data-node-state="${nodeState}">
            <button type="button" class="game-tech-tap game-tech-tap--${troopClass}" aria-label="${escapeHtml(getResearchNodeName(tech, node))}. ${escapeHtml(appT('researchCurrentLevel'))}: ${level}/${node.maxLevel}">
              <span class="game-tech-medallion" aria-hidden="true">
                <span class="game-tech-art"></span>
                <span class="game-tech-level-badge">${formatGameNodeLevel(node, level)}</span>
              </span>
              <span class="game-tech-name" title="${escapeHtml(getResearchNodeName(tech, node))}">${escapeHtml(getResearchNodeName(tech, node))}</span>
            </button>
            <input type="number" class="tech-node-input" min="0" max="${node.maxLevel}" value="${level}" tabindex="-1" aria-hidden="true" hidden>
            <div class="node-cost-display game-tech-cost-pill" hidden aria-hidden="true"></div>
            <div class="node-buff-display game-tech-buff-pill" hidden aria-hidden="true"></div>
          </article>`;
  });
  html += '</div></section>';
  if (nextRow)
    html += buildGameConnectorHtml(tech, row, nextRow, edges, tierState, isSectionBoundary);
  return html;
}

function renderGameTreeLayoutHtml(tech, layout) {
  const flatRows = layout.sections.flatMap((section, sectionIndex) =>
    section.rows.map((row, rowIndex) => ({
      section,
      sectionIndex,
      row,
      rowIndex,
    }))
  );
  let tierIndex = 0;
  return `<div class="research-game-tree" data-tree-theme="${escapeHtml(layout.theme || 'amber')}">${layout.sections
    .map((section, sectionIndex) => {
      const sectionRows = section.rows
        .map((row, rowIndex) => {
          const flatIndex = flatRows.findIndex(
            (entry) => entry.sectionIndex === sectionIndex && entry.rowIndex === rowIndex
          );
          const nextEntry = flatRows[flatIndex + 1];
          tierIndex += 1;
          return buildGameTreeTierHtml(
            tech,
            row,
            tierIndex,
            nextEntry?.row || null,
            layout.edges,
            Boolean(nextEntry && nextEntry.sectionIndex !== sectionIndex)
          );
        })
        .join('');
      return `<section id="researchSection-${escapeHtml(section.id)}" class="research-game-section" data-research-section="${escapeHtml(section.id)}">
          <header class="research-game-section-heading">
            <span>${escapeHtml(appT('researchGamePartShort', { n: sectionIndex + 1 }))}</span>
            <h4>${escapeHtml(getResearchSectionLabel(section, sectionIndex))}</h4>
          </header>
          ${sectionRows}
        </section>`;
    })
    .join('')}</div>`;
}

function bindGameNodePress(el, { onTap, onLong, longMs = 480 } = {}) {
  let timer = null;
  let longFired = false;
  const clear = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };
  el.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    longFired = false;
    clear();
    if (onLong) {
      timer = window.setTimeout(() => {
        longFired = true;
        onLong();
      }, longMs);
    }
  });
  el.addEventListener('pointerup', clear);
  el.addEventListener('pointerleave', clear);
  el.addEventListener('pointercancel', clear);
  el.addEventListener('click', (e) => {
    e.preventDefault();
    if (longFired) {
      longFired = false;
      return;
    }
    onTap?.(e);
  });
}

function bindResearchTabArrowKeys(tabs) {
  const orderedTabs = Array.from(tabs);
  orderedTabs.forEach((tab, index) => {
    tab.addEventListener('keydown', (event) => {
      const keyDirection = document.documentElement.dir === 'rtl' ? -1 : 1;
      let nextIndex = null;
      if (event.key === 'ArrowRight') nextIndex = index + keyDirection;
      if (event.key === 'ArrowLeft') nextIndex = index - keyDirection;
      if (event.key === 'Home') nextIndex = 0;
      if (event.key === 'End') nextIndex = orderedTabs.length - 1;
      if (nextIndex === null) return;
      event.preventDefault();
      const nextTab = orderedTabs[(nextIndex + orderedTabs.length) % orderedTabs.length];
      nextTab?.focus();
      nextTab?.click();
    });
  });
}

function renderGameNodeInspector(rootEl, tech, node) {
  const inspector = rootEl.querySelector('.research-node-inspector');
  if (!inspector) return;
  if (!node) {
    // With nothing selected this panel used to be an empty box beside a tall tree.
    // Show where the tree actually stands instead.
    inspector.dataset.hasSelection = 'false';
    const totals = tech.nodes.reduce(
      (acc, candidate) => {
        const level = getStoredNodeLevel(tech.id, candidate.id);
        acc.levels += level;
        acc.maxLevels += candidate.maxLevel;
        if (level >= candidate.maxLevel) acc.done += 1;
        else if (level > 0) acc.started += 1;
        return acc;
      },
      { levels: 0, maxLevels: 0, done: 0, started: 0 }
    );
    const percent = totals.maxLevels ? Math.round((totals.levels / totals.maxLevels) * 100) : 0;
    const nextNode = tech.nodes.find(
      (candidate) =>
        getStoredNodeLevel(tech.id, candidate.id) < candidate.maxLevel &&
        !isNodeLocked(tech, candidate)
    );
    inspector.innerHTML = `
      <p class="research-node-inspector-prompt">${escapeHtml(appT('researchSelectNodePrompt'))}</p>
      <dl class="research-node-inspector-overview">
        <div><dt>${escapeHtml(appT('researchProgress', { pct: percent }))}</dt><dd>${percent}%</dd></div>
        <div><dt>${escapeHtml(appT('researchNodesComplete'))}</dt><dd>${totals.done} / ${tech.nodes.length}</dd></div>
        ${totals.started ? `<div><dt>${escapeHtml(appT('researchNodesStarted'))}</dt><dd>${totals.started}</dd></div>` : ''}
        ${nextNode ? `<div><dt>${escapeHtml(appT('researchNextAvailable'))}</dt><dd>${escapeHtml(getResearchNodeName(tech, nextNode))}</dd></div>` : ''}
      </dl>`;
    return;
  }

  const updater = rootEl._researchGameUpdaters?.get(node.id);
  const level = updater?.getLevel() ?? getStoredNodeLevel(tech.id, node.id);
  const wrap = rootEl.querySelector(`.game-tech-node-wrap[data-node-id="${node.id}"]`);
  const remainingHtml = wrap?.querySelector('.node-cost-display')?.innerHTML || '';
  const nodeName = getResearchNodeName(tech, node);
  const buffHtml = renderNodeBuffProgress(localizeNodeBuffProgress(tech, node, level));
  const artResolution = resolveResearchNodeArt(
    {
      treeId: tech.id,
      nodeId: node.id,
      preferredState: getGameNodeArtState(node, level),
      nodeName: node.name,
      buff: node.buff,
      troop: node.troop,
    },
    techDatabase
  );
  inspector.dataset.hasSelection = 'true';
  inspector.dataset.nodeState = getGameNodeState(node, level);
  inspector.style.setProperty(
    '--inspector-pct',
    `${node.maxLevel > 0 ? (level / node.maxLevel) * 100 : 0}%`
  );
  const locked = isNodeLocked(tech, node);
  const blockClear = level > 0 && hasStartedDependents(tech, node);
  inspector.dataset.nodeLocked = locked ? 'true' : 'false';
  inspector.dataset.artProvenance = artResolution.provenance;
  inspector.dataset.artRequestedKey = artResolution.requestedKey;
  inspector.dataset.artSourceKey = artResolution.sourceKey;
  inspector.innerHTML = `
      <div class="research-node-inspector-head">
        <div>
          <span class="research-node-inspector-kicker">${escapeHtml(appT('researchCurrentLevel'))}</span>
          <h4>${escapeHtml(nodeName)}</h4>
        </div>
        <button type="button" class="research-node-inspector-close" aria-label="${escapeHtml(appT('researchCloseCalculator'))}">
          <svg aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18 18 6M6 6l12 12"/></svg>
        </button>
      </div>
      <div class="research-node-inspector-level"><strong>${level}</strong><span>/ ${node.maxLevel}</span></div>
      <div class="research-node-inspector-controls" role="group" aria-label="${escapeHtml(appT('researchNodeLevelControlsAria', { node: nodeName }))}">
        <button type="button" data-inspector-action="decrease" aria-label="${escapeHtml(appT('researchDecreaseLevelAria', { node: nodeName }))}"${level <= 0 || blockClear ? ' disabled' : ''}>−</button>
        <button type="button" data-inspector-action="clear"${level <= 0 || blockClear ? ' disabled' : ''}>${escapeHtml(appT('researchClearLevel'))}</button>
        <button type="button" data-inspector-action="half"${locked ? ' disabled' : ''}>${escapeHtml(appT('researchSetHalf'))}</button>
        <button type="button" data-inspector-action="max"${locked ? ' disabled' : ''}>${escapeHtml(appT('researchSetMax'))}</button>
        <button type="button" data-inspector-action="increase" aria-label="${escapeHtml(appT('researchIncreaseLevelAria', { node: nodeName }))}"${level >= node.maxLevel || locked ? ' disabled' : ''}>+</button>
      </div>
      ${locked ? `<p class="research-node-inspector-lock">${escapeHtml(appT('researchRowLocked'))}</p>` : ''}
      ${blockClear ? `<p class="research-node-inspector-lock">${escapeHtml(appT('researchRowLockedClear'))}</p>` : ''}
      <div class="research-node-inspector-detail">
        <div><span>${escapeHtml(appT('researchRemaining'))}</span><div class="research-node-inspector-cost">${remainingHtml}</div></div>
        <div class="research-node-inspector-buff">${buffHtml}</div>
      </div>`;

  inspector.querySelector('.research-node-inspector-close')?.addEventListener('click', () => {
    rootEl.dataset.selectedNodeId = '';
    rootEl
      .querySelectorAll('.game-tech-node-wrap.is-selected')
      .forEach((element) => element.classList.remove('is-selected'));
    renderGameNodeInspector(rootEl, tech, null);
  });
  inspector.querySelectorAll('[data-inspector-action]').forEach((button) => {
    button.addEventListener('click', () => {
      const action = button.dataset.inspectorAction;
      const current = updater?.getLevel() ?? level;
      if (action === 'decrease') updater?.updateLevel(current - 1);
      if (action === 'increase') updater?.updateLevel(current + 1);
      if (action === 'clear') updater?.updateLevel(0);
      // Half rounds down, so a 10-level node lands on 5 and a 15-level node on 7.
      if (action === 'half') updater?.updateLevel(Math.floor(node.maxLevel / 2));
      if (action === 'max') updater?.updateLevel(node.maxLevel);
    });
  });
}

function wireGameTechNodeContainers(rootEl, tech) {
  const updateFns = [];
  const updaterMap = new Map();
  rootEl._researchGameUpdaters = updaterMap;
  rootEl.querySelectorAll('.game-tech-node-wrap').forEach((wrap) => {
    const input = wrap.querySelector('.tech-node-input');
    const tap = wrap.querySelector('.game-tech-tap');
    const nodeId = wrap.dataset.nodeId;
    const node = tech.nodes.find((n) => n.id === nodeId);
    if (!input || !node) return;

    const max = parseInt(input.max, 10);
    let current = parseInt(input.value, 10) || 0;
    wrap.style.setProperty('--node-col', wrap.dataset.nodeCol || node.col || 2);
    syncGameNodeVisual(tech, node, current, wrap);

    const updateLevel = (val, { pulse = true, recalculate = true, force = false } = {}) => {
      let v = typeof val === 'string' && val === 'max' ? max : parseInt(val, 10);
      if (isNaN(v) || v < 0) v = 0;
      if (v > max) v = max;
      if (!force) {
        if (v > current && isNodeLocked(tech, node)) return;
        if (v === 0 && current > 0 && hasStartedDependents(tech, node)) return;
      }
      const changed = v !== current;
      current = v;
      input.value = v;
      setStoredNodeLevel(tech.id, nodeId, v);
      syncGameNodeVisual(tech, node, v, wrap);
      if (changed && pulse) pulseGameNodeWrap(wrap);
      if (recalculate) {
        calculateTechTotals(tech);
        syncGameLockStates(rootEl, tech);
        if (rootEl.dataset.selectedNodeId === node.id) renderGameNodeInspector(rootEl, tech, node);
      }
    };

    const updater = { nodeId, updateLevel, max, getLevel: () => current };
    updateFns.push(updater);
    updaterMap.set(nodeId, updater);

    if (tap) {
      bindGameNodePress(tap, {
        onTap: () => {
          rootEl.dataset.selectedNodeId = node.id;
          rootEl
            .querySelectorAll('.game-tech-node-wrap.is-selected')
            .forEach((element) => element.classList.remove('is-selected'));
          wrap.classList.add('is-selected');
          if (current < max) updateLevel(current + 1);
          renderGameNodeInspector(rootEl, tech, node);
        },
      });
    }
  });
  return updateFns;
}

function renderGameCalculator(tech, container) {
  const layout = resolveResearchGameLayout(tech);
  const sectionNav =
    layout.sections.length > 1
      ? `<nav class="research-game-section-nav" aria-label="${escapeHtml(appT('researchContinuousNavigationAria'))}">${layout.sections
          .map(
            (section, index) => `
            <button type="button" data-research-section-target="${escapeHtml(section.id)}">
              <span>${escapeHtml(appT('researchGamePartShort', { n: index + 1 }))}</span>
              <strong>${escapeHtml(getResearchSectionLabel(section, index))}</strong>
            </button>`
          )
          .join('')}</nav>`
      : '';

  container.innerHTML = `
      <div class="research-calc-top">
        <div class="research-calc-header">
          <div>
            <h3 id="researchCalculatorTitle" class="research-calc-title" tabindex="-1">${escapeHtml(getResearchTreeName(tech))} <span class="research-calc-season">(${tech.season})</span></h3>
            <p class="research-calc-sub">${escapeHtml(appT('researchPrimaryCost'))}: <span class="research-calc-primary">${escapeHtml(getResearchTreeResource(tech))}</span></p>
          </div>
          <button type="button" id="closeCalcBtn" class="research-calc-close" aria-label="${escapeHtml(appT('researchCloseCalculator'))}">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
        <div class="research-calc-actions">
          <button type="button" id="resetAllTechBtn" class="research-calc-btn research-calc-btn--reset">${escapeHtml(appT('researchResetAll'))}</button>
          <button type="button" id="maxAllTechBtn" class="research-calc-btn research-calc-btn--max">${escapeHtml(appT('researchMaxAll'))}</button>
        </div>
      </div>
      <div class="research-calc-scrollport custom-scrollbar">
        <div class="research-game-shell" data-tree-theme="${escapeHtml(layout.theme || 'amber')}">
          <div class="research-game-titlebar"><span class="research-game-title">${escapeHtml(appT('researchContinuousNavigationAria'))}</span></div>
          ${sectionNav}
          <div class="research-game-workspace">
            <div class="research-game-tree-viewport">${renderGameTreeLayoutHtml(tech, layout)}</div>
            <aside class="research-node-inspector" aria-label="${escapeHtml(appT('researchInspectorAria'))}" data-has-selection="false">
              <p class="research-node-inspector-prompt">${escapeHtml(appT('researchSelectNodePrompt'))}</p>
            </aside>
          </div>
          <p class="research-game-footer">${appT('researchGameHint')}</p>
        </div>
      </div>
      <div class="research-calc-total">
        <div class="research-tree-total-copy">
          <span class="research-tree-total-label">${escapeHtml(appT('researchTreeTotal'))}</span>
          <span class="research-tree-total-hint">${escapeHtml(appT('researchTreeTotalHint'))}</span>
        </div>
        <div class="research-total-groups">
          <div class="research-total-group research-total-group--spent">
            <span class="research-total-group-label">${escapeHtml(appT('researchTreeSpent'))}</span>
            <div id="spentTechCost" class="research-total-costs"></div>
          </div>
          <div class="research-total-group research-total-group--remaining">
            <span class="research-total-group-label">${escapeHtml(appT('researchRemaining'))}</span>
            <div id="totalTechCost" class="research-total-costs"></div>
          </div>
        </div>
      </div>`;

  container.setAttribute('role', 'dialog');
  container.setAttribute('aria-modal', 'true');
  container.setAttribute('aria-labelledby', 'researchCalculatorTitle');
  bindResearchCalculatorDialog(container);
  requestAnimationFrame(() => {
    const scrollport = container.querySelector('.research-calc-scrollport');
    if (scrollport) scrollport.scrollTop = 0;
    container.querySelector('#researchCalculatorTitle')?.focus({ preventScroll: true });
  });
  document.getElementById('closeCalcBtn').onclick = closeTechCalculator;

  const updateFns = wireGameTechNodeContainers(container, tech);
  syncGameLockStates(container, tech);

  container.querySelectorAll('[data-research-section-target]').forEach((button) => {
    button.addEventListener('click', () => {
      const target = container.querySelector(
        `[data-research-section="${button.dataset.researchSectionTarget}"]`
      );
      const scrollport = container.querySelector('.research-calc-scrollport');
      if (!target || !scrollport) return;
      const top =
        target.getBoundingClientRect().top -
        scrollport.getBoundingClientRect().top +
        scrollport.scrollTop;
      scrollport.scrollTo({ top: Math.max(0, top - 8), behavior: getResearchScrollBehavior() });
    });
  });

  document.getElementById('resetAllTechBtn')?.addEventListener('click', () => {
    updateFns.forEach((updater) =>
      updater.updateLevel(0, { pulse: false, recalculate: false, force: true })
    );
    calculateTechTotals(tech);
    syncGameLockStates(container, tech);
    const selected = tech.nodes.find((node) => node.id === container.dataset.selectedNodeId);
    if (selected) renderGameNodeInspector(container, tech, selected);
  });
  document.getElementById('maxAllTechBtn')?.addEventListener('click', () => {
    updateFns.forEach((updater) =>
      updater.updateLevel(updater.max, { pulse: false, recalculate: false, force: true })
    );
    calculateTechTotals(tech);
    syncGameLockStates(container, tech);
    const selected = tech.nodes.find((node) => node.id === container.dataset.selectedNodeId);
    if (selected) renderGameNodeInspector(container, tech, selected);
  });
  calculateTechTotals(tech);
}

function moveResearchCalculatorToPortal(container) {
  let portal = document.getElementById('researchWorkspacePortal');
  if (!portal) {
    portal = document.createElement('div');
    portal.id = 'researchWorkspacePortal';
    portal.className = 'research-v14-workspace';
    document.body.appendChild(portal);
  }
  if (container.parentElement !== portal) portal.appendChild(container);
}

function renderCalculator(tech) {
  const container = document.getElementById('techCalculatorContainer');
  moveResearchCalculatorToPortal(container);
  container.dataset.techId = tech.id;
  const activeElement = document.activeElement;
  if (activeElement instanceof HTMLElement && !container.contains(activeElement)) {
    researchCalculatorReturnFocus = activeElement;
  }
  container.classList.remove('hidden', 'research-calculator--closing');
  document.body.classList.add('research-calculator-open');

  // 1. Cleanly normalize the manual Row/Col/Branch tags from the DB.
  // ZERO auto-guessing logic here.
  tech.nodes.forEach((node) => {
    if (node.Row !== undefined) node.row = node.Row;
    if (node.column !== undefined) node.col = node.column;
    if (node.branch !== undefined) node.b = node.branch;
  });

  if (usesGameTreeLayout(tech)) {
    renderGameCalculator(tech, container);
    return;
  }

  const trunkNodes = tech.nodes.filter((n) => !n.b);
  const b1Nodes = tech.nodes.filter((n) => n.b == 1 || n.b === '1');
  const b2Nodes = tech.nodes.filter((n) => n.b == 2 || n.b === '2');
  const b3Nodes = tech.nodes.filter((n) => n.b == 3 || n.b === '3');
  const branchGroups = [b1Nodes, b2Nodes, b3Nodes];

  [trunkNodes, ...branchGroups].forEach((group) => {
    if (group.length) applyAutoGridToGroup(group);
  });

  const canRenderBranchesAsLanes =
    branchGroups.filter((group) => group.length).length >= 2 &&
    branchGroups.every((group) => {
      const seenRows = new Set();
      return group.every((node) => {
        const row = Number(node.row);
        if (!Number.isFinite(row) || seenRows.has(row)) return false;
        seenRows.add(row);
        return true;
      });
    });

  const branchLaneNodes = canRenderBranchesAsLanes
    ? branchGroups.flatMap((group, index) =>
        group.map((node) => ({
          ...node,
          col: index + 1,
          _displayCol: index + 1,
        }))
      )
    : [];

  const buildNodeHtml = (node) => {
    const savedLevel = getStoredNodeLevel(tech.id, node.id);
    const isMaxed = savedLevel === node.maxLevel;

    const maxedContainerClass = isMaxed ? ' research-node-card--maxed' : '';

    let quickButtonsHtml = `<button class="quick-set-btn research-quick-btn" data-val="0">0</button>`;
    if (node.maxLevel >= 5)
      quickButtonsHtml += `<button class="quick-set-btn research-quick-btn" data-val="5">5</button>`;
    if (node.maxLevel >= 10)
      quickButtonsHtml += `<button class="quick-set-btn research-quick-btn" data-val="10">10</button>`;
    if (node.maxLevel >= 15)
      quickButtonsHtml += `<button class="quick-set-btn research-quick-btn" data-val="15">15</button>`;
    if (node.maxLevel >= 20)
      quickButtonsHtml += `<button class="quick-set-btn research-quick-btn" data-val="20">20</button>`;

    // Smart Toggle Button
    let toggleText = isMaxed ? appT('researchClearLevel') : appT('researchMaxLevel');
    let toggleVal = isMaxed ? 0 : node.maxLevel;
    const toggleStateClass = isMaxed ? ' research-max-toggle--undo' : '';

    quickButtonsHtml += `<button class="quick-set-btn max-toggle-btn research-quick-btn research-max-toggle${toggleStateClass}" data-val="${toggleVal}">${toggleText}</button>`;

    const colAttr =
      node._displayCol || node.col ? ` data-node-col="${node._displayCol || node.col}"` : '';
    const safeName = escapeHtml(getResearchNodeName(tech, node));
    const safeBuff = escapeHtml(getResearchNodeBuff(tech, node));
    const buffSummary = localizeNodeBuffProgress(tech, node, savedLevel);

    return `
            <div class="research-tree-node-cell"${colAttr}>
                <div class="tech-node-container research-node-card${maxedContainerClass}" data-node-id="${node.id}" data-node-state="${getGameNodeState(node, savedLevel)}">
                    <div class="research-node-head">
                        <div class="research-node-copy">
                            <span class="research-node-title">${safeName}</span>
                            <span class="research-node-buff">${safeBuff}</span>
                            <span class="node-buff-display research-node-buff-progress" aria-live="polite">${renderNodeBuffProgress(buffSummary)}</span>
                        </div>
                        <div class="research-node-remaining">
                            <span class="research-node-remaining-label">${escapeHtml(appT('researchRemaining'))}</span>
                            <div class="node-cost-display research-node-costs"></div>
                        </div>
                    </div>
                    
                    <div class="research-node-controls">
                        <div class="research-node-slider-row">
                            <div class="research-node-level">
                                <span class="research-node-mini-label">${escapeHtml(appT('researchLevelShort'))}</span>
                                <input type="number" min="0" max="${node.maxLevel}" value="${savedLevel}" class="tech-node-input research-node-input">
                            </div>
                            <input type="range" min="0" max="${node.maxLevel}" value="${savedLevel}" class="tech-node-slider research-node-slider">
                            <div class="research-node-max">
                                <span class="research-node-mini-label">${escapeHtml(appT('researchMaxLevel'))}</span>
                                <span class="research-node-max-value">${node.maxLevel}</span>
                            </div>
                        </div>
                        <div class="research-node-quick-row">
                            ${quickButtonsHtml}
                        </div>
                    </div>
                </div>
            </div>
        `;
  };

  const renderNodeGroup = (nodes, options = {}) => {
    const { preserveDisplayCols = false } = options;
    let rowGroups = {};
    nodes.forEach((node) => {
      if (!rowGroups[node.row]) rowGroups[node.row] = [];
      rowGroups[node.row].push(node);
    });
    const rKeys = Object.keys(rowGroups)
      .map(Number)
      .sort((a, b) => a - b);

    let gHtml = '<div class="research-tree-group">';
    rKeys.forEach((rk, i) => {
      const rNodes = rowGroups[rk];
      rNodes.sort((a, b) => (a._displayCol || a.col || 0) - (b._displayCol || b.col || 0));

      const rowLayoutClass =
        rNodes.length === 1
          ? ' research-tree-row--single'
          : rNodes.length === 2
            ? ' research-tree-row--pair'
            : '';
      if (rNodes.length === 1 && !(preserveDisplayCols && rNodes[0]._displayCol))
        rNodes[0]._displayCol = 2;
      if (rNodes.length === 2 && !preserveDisplayCols) {
        rNodes[0]._displayCol = 1;
        rNodes[1]._displayCol = 3;
      }
      gHtml += `<div class="research-tree-row${rowLayoutClass}" data-row-count="${rNodes.length}">`;
      rNodes.forEach((n) => (gHtml += buildNodeHtml(n)));
      gHtml += `</div>`;

      if (i < rKeys.length - 1) {
        gHtml += `
                    <div class="research-tree-connector">
                        <div class="research-tree-connector-line"></div>
                    </div>`;
      }
    });
    gHtml += '</div>';
    return gHtml;
  };

  let html = `
        <div class="research-calc-top">
            <div class="research-calc-header">
                <div>
                    <h3 id="researchCalculatorTitle" class="research-calc-title" tabindex="-1">${escapeHtml(getResearchTreeName(tech))} <span class="research-calc-season">(${escapeHtml(tech.season)})</span></h3>
                    <p class="research-calc-sub">${escapeHtml(appT('researchPrimaryCost'))}: <span class="research-calc-primary">${escapeHtml(getResearchTreeResource(tech))}</span></p>
                </div>
                <button type="button" id="closeCalcBtn" class="research-calc-close" aria-label="${escapeHtml(appT('researchCloseCalculator'))}">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
            </div>
            <div class="research-calc-actions">
                <button type="button" id="resetAllTechBtn" class="research-calc-btn research-calc-btn--reset">${escapeHtml(appT('researchResetAll'))}</button>
                <button type="button" id="maxAllTechBtn" class="research-calc-btn research-calc-btn--max">${escapeHtml(appT('researchMaxAll'))}</button>
            </div>
        </div>
        
        <div class="research-calc-scrollport custom-scrollbar">
          <div class="research-tree-scroll${canRenderBranchesAsLanes ? ' research-tree-scroll--lanes' : ''}">
    `;

  let treeHtml = `<div class="research-tree-root">`;

  if (trunkNodes.length) {
    treeHtml += renderNodeGroup(trunkNodes);
  }

  const hasBranches = b1Nodes.length || b2Nodes.length || b3Nodes.length;
  if (hasBranches) {
    if (trunkNodes.length) {
      treeHtml += `
                <div class="research-tree-connector research-tree-connector--short">
                    <div class="research-tree-connector-line"></div>
                </div>
            `;
    }

    if (canRenderBranchesAsLanes) {
      treeHtml += `
                <div class="research-branch-segment research-branch-segment--lanes" aria-label="${escapeHtml(appT('researchTroopBranchesAria'))}">
                    <div class="research-branch-btn research-branch-label">
                        <span>+</span><span>${escapeHtml(appT('researchTroopBranchFootmen'))}</span>
                    </div>
                    <div class="research-branch-btn research-branch-label">
                        <span>+</span><span>${escapeHtml(appT('researchTroopBranchCavalry'))}</span>
                    </div>
                    <div class="research-branch-btn research-branch-label">
                        <span>+</span><span>${escapeHtml(appT('researchTroopBranchArchers'))}</span>
                    </div>
                </div>
                <div class="branch-content research-branch-content research-branch-content--lanes">
                    ${renderNodeGroup(branchLaneNodes, { preserveDisplayCols: true })}
                </div>
            `;
    } else {
      treeHtml += `
                <div class="research-branch-segment" role="tablist">
                    <button type="button" id="researchBranchTab1" class="research-branch-btn branch-tab-btn active" role="tab" aria-selected="true" aria-controls="branch_1" data-target="branch_1" aria-label="${escapeHtml(appT('researchBranchTabAria', { branch: appT('researchTroopBranchFootmen') }))}">
                        <span>+</span><span>${escapeHtml(appT('researchTroopBranchFootmen'))}</span>
                    </button>
                    <button type="button" id="researchBranchTab2" class="research-branch-btn branch-tab-btn" role="tab" aria-selected="false" aria-controls="branch_2" tabindex="-1" data-target="branch_2" aria-label="${escapeHtml(appT('researchBranchTabAria', { branch: appT('researchTroopBranchCavalry') }))}">
                        <span>+</span><span>${escapeHtml(appT('researchTroopBranchCavalry'))}</span>
                    </button>
                    <button type="button" id="researchBranchTab3" class="research-branch-btn branch-tab-btn" role="tab" aria-selected="false" aria-controls="branch_3" tabindex="-1" data-target="branch_3" aria-label="${escapeHtml(appT('researchBranchTabAria', { branch: appT('researchTroopBranchArchers') }))}">
                        <span>+</span><span>${escapeHtml(appT('researchTroopBranchArchers'))}</span>
                    </button>
                </div>
            `;

      treeHtml += `
                <div id="branch_1" class="branch-content research-branch-content" role="tabpanel" aria-labelledby="researchBranchTab1">
                    ${b1Nodes.length ? renderNodeGroup(b1Nodes) : `<p class="research-empty-note">${escapeHtml(appT('researchNoNodesInBranch'))}</p>`}
                </div>
                <div id="branch_2" class="branch-content research-branch-content hidden" role="tabpanel" aria-labelledby="researchBranchTab2" hidden>
                    ${b2Nodes.length ? renderNodeGroup(b2Nodes) : `<p class="research-empty-note">${escapeHtml(appT('researchNoNodesInBranch'))}</p>`}
                </div>
                <div id="branch_3" class="branch-content research-branch-content hidden" role="tabpanel" aria-labelledby="researchBranchTab3" hidden>
                    ${b3Nodes.length ? renderNodeGroup(b3Nodes) : `<p class="research-empty-note">${escapeHtml(appT('researchNoNodesInBranch'))}</p>`}
                </div>
            `;
    }
  }

  treeHtml += `</div></div></div>`;

  html += treeHtml;

  html += `
        <div class="research-calc-total">
            <div class="research-tree-total-copy">
                <span class="research-tree-total-label">${escapeHtml(appT('researchTreeTotal'))}</span>
                <span class="research-tree-total-hint">${escapeHtml(appT('researchTreeTotalHint'))}</span>
            </div>
            <div class="research-total-groups">
                <div class="research-total-group research-total-group--spent">
                    <span class="research-total-group-label">${escapeHtml(appT('researchTreeSpent'))}</span>
                    <div id="spentTechCost" class="research-total-costs"></div>
                </div>
                <div class="research-total-group research-total-group--remaining">
                    <span class="research-total-group-label">${escapeHtml(appT('researchRemaining'))}</span>
                    <div id="totalTechCost" class="research-total-costs"></div>
                </div>
            </div>
        </div>
    `;

  container.innerHTML = html;
  container.setAttribute('role', 'dialog');
  container.setAttribute('aria-modal', 'true');
  container.setAttribute('aria-labelledby', 'researchCalculatorTitle');
  bindResearchCalculatorDialog(container);
  requestAnimationFrame(() => {
    container.scrollIntoView({ behavior: getResearchScrollBehavior(), block: 'start' });
    container.querySelector('#researchCalculatorTitle')?.focus({ preventScroll: true });
  });
  document.getElementById('closeCalcBtn').onclick = closeTechCalculator;

  const branchTabs = container.querySelectorAll('.branch-tab-btn');
  const branchContents = container.querySelectorAll('.branch-content');

  branchTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      branchTabs.forEach((t) => {
        const isActive = t === tab;
        t.classList.toggle('active', isActive);
        t.setAttribute('aria-selected', String(isActive));
        t.tabIndex = isActive ? 0 : -1;
      });
      branchContents.forEach((c) => {
        c.classList.add('hidden');
        c.hidden = true;
      });
      tab.classList.add('active');
      const activePanel = container.querySelector('#' + tab.dataset.target);
      activePanel?.classList.remove('hidden');
      if (activePanel) activePanel.hidden = false;
    });
  });
  bindResearchTabArrowKeys(branchTabs);

  const containers = container.querySelectorAll('.tech-node-container');
  const updateFns = [];

  containers.forEach((cont) => {
    const slider = cont.querySelector('.tech-node-slider');
    const input = cont.querySelector('.tech-node-input');
    const maxBtn = cont.querySelector('.max-toggle-btn');
    const nodeId = cont.dataset.nodeId;

    const updateLevel = (val, { recalculate = true } = {}) => {
      let v = parseInt(val);
      const max = parseInt(input.max);
      if (isNaN(v) || v < 0) v = 0;
      if (v > max) v = max;

      slider.value = v;
      input.value = v;
      setStoredNodeLevel(tech.id, nodeId, v);

      // Keep the card's three-state styling in step with the game-tree view.
      cont.dataset.nodeState = v >= max ? 'complete' : v > 0 ? 'progress' : 'idle';

      // Dynamic Gray-out & Button Swap
      if (v === max) {
        cont.classList.add('research-node-card--maxed');
        if (maxBtn) {
          maxBtn.dataset.val = 0;
          maxBtn.textContent = appT('researchClearLevel');
          maxBtn.className =
            'quick-set-btn max-toggle-btn research-quick-btn research-max-toggle research-max-toggle--undo';
        }
      } else {
        cont.classList.remove('research-node-card--maxed');
        if (maxBtn) {
          maxBtn.dataset.val = max;
          maxBtn.textContent = appT('researchMaxLevel');
          maxBtn.className = 'quick-set-btn max-toggle-btn research-quick-btn research-max-toggle';
        }
      }

      if (recalculate) calculateTechTotals(tech);
    };

    updateFns.push({ nodeId, updateLevel, max: parseInt(input.max) });

    slider.addEventListener('input', (e) => updateLevel(e.target.value));
    input.addEventListener('input', (e) => updateLevel(e.target.value));

    cont.addEventListener('click', (e) => {
      const btn = e.target.closest('.quick-set-btn');
      if (btn) updateLevel(btn.dataset.val);
    });
  });

  document.getElementById('resetAllTechBtn').addEventListener('click', () => {
    updateFns.forEach((obj) => obj.updateLevel(0, { recalculate: false }));
    calculateTechTotals(tech);
  });

  document.getElementById('maxAllTechBtn').addEventListener('click', () => {
    updateFns.forEach((obj) => obj.updateLevel(obj.max, { recalculate: false }));
    calculateTechTotals(tech);
  });

  calculateTechTotals(tech);
}

// Split one node's cost across the currencies it uses, over the level range [from, to).
// Remaining uses [currentLevel, maxLevel); spent uses [0, currentLevel).
function sumNodeCostRange(node, from, to) {
  let wisdom = 0;
  let courage = 0;
  let other = 0;

  for (let i = from; i < to; i++) {
    const genericCost = (node.costs && node.costs[i]) || 0;
    const wbCost =
      (node.warBadgeCosts && node.warBadgeCosts[i]) ||
      (node.wisdomCosts && node.wisdomCosts[i]) ||
      (node.wb_costs && node.wb_costs[i]) ||
      0;
    const cmCost =
      (node.courageCosts && node.courageCosts[i]) || (node.cm_costs && node.cm_costs[i]) || 0;

    if (node.costType === 'Dual') {
      wisdom += wbCost > 0 ? wbCost : genericCost;
      courage += cmCost;
    } else if (node.costType === 'Courage') {
      courage += genericCost > 0 ? genericCost : cmCost;
    } else if (
      node.costType === 'Wisdom' ||
      node.costType === 'War Badge' ||
      node.costType === 'War Badges'
    ) {
      wisdom += genericCost > 0 ? genericCost : wbCost;
    } else {
      other += genericCost;
    }
  }

  return { wisdom, courage, other };
}

function calculateTechTotals(tech) {
  let grandTotalCourage = 0;
  let grandTotalWisdom = 0;
  let grandTotalOther = 0;
  let grandSpentCourage = 0;
  let grandSpentWisdom = 0;
  let grandSpentOther = 0;

  const iconCM = `<img src="images/CM.png" class="research-cost-icon" alt="CM">`;
  const iconWB = `<img src="images/WB.png" class="research-cost-icon" alt="WB">`;
  const iconRes = '';

  tech.nodes.forEach((node) => {
    const container = document.querySelector(`.tech-node-container[data-node-id="${node.id}"]`);
    const input = container?.querySelector('.tech-node-input');
    const display = container?.querySelector('.node-cost-display');
    const buffDisplay = container?.querySelector('.node-buff-display');
    const currentLevel = input
      ? parseInt(input.value, 10) || 0
      : getStoredNodeLevel(tech.id, node.id);

    const remaining = sumNodeCostRange(node, currentLevel, node.maxLevel);
    const spent = sumNodeCostRange(node, 0, currentLevel);
    const nodeWisdom = remaining.wisdom;
    const nodeCourage = remaining.courage;
    const nodeOther = remaining.other;

    if (display) {
      const isGamePill = display.classList.contains('game-tech-cost-pill');
      const remainingTotal = nodeWisdom + nodeCourage + nodeOther;
      if (isGamePill && remainingTotal === 0) {
        display.innerHTML = '';
      } else if (node.costType === 'Dual') {
        display.innerHTML = isGamePill
          ? `<span class="game-tech-pill game-tech-pill--wb">${iconWB}<span>${formatResearchNumber(nodeWisdom)}</span></span><span class="game-tech-pill game-tech-pill--cm">${iconCM}<span>${formatResearchNumber(nodeCourage)}</span></span>`
          : `<span class="research-node-cost-row research-node-cost-row--wb">${iconWB}<span>${formatResearchNumber(nodeWisdom)}</span></span><span class="research-node-cost-row research-node-cost-row--cm">${iconCM}<span>${formatResearchNumber(nodeCourage)}</span></span>`;
      } else if (node.costType === 'Courage') {
        display.innerHTML = isGamePill
          ? `<span class="game-tech-pill game-tech-pill--cm">${iconCM}<span>${formatResearchNumber(nodeCourage)}</span></span>`
          : `<span class="research-node-cost-row research-node-cost-row--cm">${iconCM}<span>${formatResearchNumber(nodeCourage)}</span></span>`;
      } else if (
        node.costType === 'Wisdom' ||
        node.costType === 'War Badge' ||
        node.costType === 'War Badges'
      ) {
        display.innerHTML = isGamePill
          ? `<span class="game-tech-pill game-tech-pill--wb">${iconWB}<span>${formatResearchNumber(nodeWisdom)}</span></span>`
          : `<span class="research-node-cost-row research-node-cost-row--wb">${iconWB}<span>${formatResearchNumber(nodeWisdom)}</span></span>`;
      } else {
        display.innerHTML = isGamePill
          ? `<span class="game-tech-pill game-tech-pill--res">${iconRes}<span>${formatResearchNumber(nodeOther)}</span></span>`
          : `<span class="research-node-cost-row research-node-cost-row--res">${iconRes}<span>${formatResearchNumber(nodeOther)}</span></span>`;
      }
    }

    if (buffDisplay) {
      const compact = buffDisplay.classList.contains('game-tech-buff-pill');
      buffDisplay.innerHTML = renderNodeBuffProgress(
        localizeNodeBuffProgress(tech, node, currentLevel),
        compact
      );
    }

    syncGameNodeButton(tech, node, currentLevel);

    grandTotalWisdom += nodeWisdom;
    grandTotalCourage += nodeCourage;
    grandTotalOther += nodeOther;
    grandSpentWisdom += spent.wisdom;
    grandSpentCourage += spent.courage;
    grandSpentOther += spent.other;
  });

  // Which currencies this tree uses is a property of the tree, not of how far the player
  // has progressed, so remaining and spent must show the same set of currencies. Deciding
  // it from the remaining totals alone would hide War Badges once a tree is fully maxed.
  const usesWisdom =
    grandTotalWisdom > 0 ||
    grandSpentWisdom > 0 ||
    tech.primaryResource.includes('Wisdom') ||
    tech.primaryResource.includes('War Badge');
  const usesCourage =
    grandTotalCourage > 0 || grandSpentCourage > 0 || tech.primaryResource.includes('Courage');
  const isDual = tech.primaryResource.includes('Dual') || (usesWisdom && usesCourage);

  const renderCostSummary = (wisdom, courage, other) => {
    const wbHtml = `
            <span class="research-cost-summary research-cost-summary--wb">
                <span class="research-cost-summary-label">${iconWB}<span class="research-cost-summary-label-full">${escapeHtml(appT('researchWarBadges'))}</span><span class="research-cost-summary-label-short">${escapeHtml(appT('researchWarBadgesShort'))}</span></span>
                <span>${formatResearchNumber(wisdom)}</span>
            </span>`;
    const cmHtml = `
            <span class="research-cost-summary research-cost-summary--cm">
                <span class="research-cost-summary-label">${iconCM}<span class="research-cost-summary-label-full">${escapeHtml(appT('researchCourageMedals'))}</span><span class="research-cost-summary-label-short">${escapeHtml(appT('researchCourageMedalsShort'))}</span></span>
                <span>${formatResearchNumber(courage)}</span>
            </span>`;

    if (isDual) return `${wbHtml}${cmHtml}`;
    if (usesWisdom) return wbHtml;
    if (usesCourage) return cmHtml;
    return `
            <span class="research-cost-summary research-cost-summary--res">
                <span class="research-cost-summary-label"><span class="research-cost-summary-label-full">${escapeHtml(appT('researchResources'))}</span><span class="research-cost-summary-label-short">${escapeHtml(appT('researchResourcesShort'))}</span></span>
                <span>${formatResearchNumber(other)}</span>
            </span>`;
  };

  const totalContainer = document.getElementById('totalTechCost');
  if (totalContainer) {
    totalContainer.innerHTML = renderCostSummary(
      grandTotalWisdom,
      grandTotalCourage,
      grandTotalOther
    );
  }

  const spentContainer = document.getElementById('spentTechCost');
  if (spentContainer) {
    spentContainer.innerHTML = renderCostSummary(
      grandSpentWisdom,
      grandSpentCourage,
      grandSpentOther
    );
  }

  updateGlobalSummary();
}

window.closeTechCalculator = closeTechCalculator;
window.syncTechSeasonButtons = syncTechSeasonButtons;
window.syncResearchQuickButtons = syncResearchQuickButtons;

export {
  initResearchCalculator,
  refreshResearchLocale,
  renderTechList,
  updateGlobalSummary,
  renderCalculator,
};
