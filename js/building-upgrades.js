import '../css/building-upgrades.css';
import {
  BUILDING_UPGRADE_DATA,
  CASTLE_UPGRADE_COSTS,
  CASTLE_UPGRADE_COST_SOURCE,
} from './building-upgrade-data.js';
import { currentLanguage } from './state.js';
import {
  formatBuildingUpgradesText,
  getBuildingUpgradesCopy,
  loadBuildingUpgradesCopy,
} from './i18n/building-upgrades-copy.js';
import buildingUpgradesCopyLocalesUrl from './i18n/building-upgrades-copy-locales.json?url';

const RESOURCE_META = [
  ['orichalcum', 'crystal'],
  ['gold', 'coin'],
  ['food', 'wheat'],
  ['lumber', 'wood'],
  ['charcoal', 'flame'],
  ['marble', 'stone'],
  ['iron', 'iron'],
];
const numberFormat = new Intl.NumberFormat('en-US');
const formatNumber = (value) => numberFormat.format(value);

function text(copy, key, vars) {
  return formatBuildingUpgradesText(copy[key] ?? key, vars);
}
const escapeHtml = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (char) => {
    const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return entities[char];
  });

function resourceIcon(type) {
  const common = 'viewBox="0 0 32 32" aria-hidden="true"';
  const art = {
    crystal:
      '<path d="m16 3 10 8-10 18L6 11l10-8Z"/><path d="m6 11 20 0M11 11l5 18 5-18M11 11l5-8 5 8"/>',
    coin: '<ellipse cx="16" cy="10" rx="10" ry="5"/><path d="M6 10v12c0 3 4.5 5 10 5s10-2 10-5V10M6 16c0 3 4.5 5 10 5s10-2 10-5M12 10h8m-6-3 4 6"/>',
    wheat:
      '<path d="M16 29V5m0 10c-5 0-8-3-8-7 5 0 8 3 8 7Zm0 5c5 0 8-3 8-7-5 0-8 3-8 7Zm0-11c-4 0-6-2-6-5 4 0 6 2 6 5Zm0 15c-4 0-6-2-6-5 4 0 6 2 6 5Z"/>',
    wood: '<path d="M5 10h18l4 4-4 4H5l-3-4 3-4Zm3 9h17l4 4-4 4H8l-3-4 3-4ZM9 12v4m10-4v4m-7 5v4m7-4v4"/>',
    flame:
      '<path d="M17 3c1 7-5 8-4 13 1-2 3-3 5-4 5 4 7 8 4 13-4 6-14 4-16-2-2-6 3-10 6-13 0 4 1 6 2 7 2-4 3-8 3-14Z"/>',
    stone:
      '<path d="M4 12 9 6h14l5 6-3 5H7l-3-5Zm3 7h18l3 5-3 4H7l-4-4 4-5Zm3-11v5m9-5v5m-8 9v5m8-5v5"/>',
    iron: '<path d="m4 11 4-6h16l4 6-4 6H8l-4-6Zm4 6v9h16v-9M11 22h10"/>',
  };
  return `<svg class="building-resource-icon building-resource-icon--${type}" ${common} fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${art[type]}</svg>`;
}

function buildingIcon() {
  return '<svg class="building-castle-art" viewBox="0 0 240 190" fill="none" aria-hidden="true"><path d="m28 149 15-8 8-55 20-17 18 11V44l28-24 28 24v31l18-16 23 19 8 71-13 11H43l-15-11Z" fill="#b38b55" stroke="#c9a969" stroke-width="3"/><path d="M74 79h29v73H55V97l19-18Zm62-35h31v108h-31V44Zm36 20h22v91h-22V64Z" fill="#3c4250" stroke="#d7c38e" stroke-width="3"/><path d="M110 147V53l10-14 10 14v94h-20Zm-69 0V90l10-13 10 13v57H41Zm149 0V76l10-14 10 14v71h-20Z" fill="#c6a36b" stroke="#ffe2a0" stroke-width="3"/><path d="M116 110h8v20h-8zM80 101h8v13h-8zm66-31h8v13h-8zm39 22h6v11h-6z" fill="#7dd3fc"/><path d="M29 151h184l-13 17H46l-17-17Z" fill="#1c493b" stroke="#61a989" stroke-width="3"/></svg>';
}

function genericBuildingIcon(name) {
  const normalized = name.toLowerCase();
  if (/barrack|archery|stable|fortress|sentry|military|war/.test(normalized)) {
    return '<svg class="building-row-generic-icon" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 3 27 7v8c0 7-5 11-11 14C10 26 5 22 5 15V7l11-4Z"/><path d="m11 16 3 3 7-8"/></svg>';
  }
  if (/storage|warehouse/.test(normalized)) {
    return '<svg class="building-row-generic-icon" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m4 11 12-7 12 7v17H4V11Z"/><path d="M4 15h24M9 15v13m7-13v13m7-13v13M9 9h14"/></svg>';
  }
  if (/farm|food|mint|gather|resource/.test(normalized)) {
    return '<svg class="building-row-generic-icon" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 28V7m0 12c-5 0-8-3-8-7 5 0 8 3 8 7Zm0 3c5 0 8-3 8-7-5 0-8 3-8 7Zm-8 6 8-4 8 4"/></svg>';
  }
  if (/guild|institute|academy|workshop|university|research|laboratory/.test(normalized)) {
    return '<svg class="building-row-generic-icon" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 27h24M6 13 16 5l10 8v14H6V13Z"/><path d="M12 16h3v4h-3zm7 0h3v4h-3zm-4 11v-6h3v6"/></svg>';
  }
  return '<svg class="building-row-generic-icon" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 27h24M7 27V14l9-7 9 7v13M12 17h3v3h-3zm6 0h3v3h-3zm-4 10v-5h4v5"/><path d="m4 14 12-9 12 9"/></svg>';
}

function renderResourceCard([key, icon], amount, copy, { compact = false } = {}) {
  return `<div class="building-resource-card${compact ? ' is-compact' : ''}" data-resource="${key}">
    <span class="building-resource-card__icon">${resourceIcon(icon)}</span>
    <span class="building-resource-card__label">${copy.resources[key]}</span>
    <strong>${amount == null ? text(copy, 'notListed') : formatNumber(amount)}</strong>
  </div>`;
}

function currentLevelControl(id, label, value, copy, min = 25, max = 29) {
  const options = Array.from({ length: max - min + 1 }, (_, index) => min + index)
    .map(
      (level) =>
        `<option value="${level}"${level === value ? ' selected' : ''}>${text(copy, 'level', { level })}</option>`
    )
    .join('');
  return `<label class="building-select-control" for="${id}"><span>${label}</span><select id="${id}">${options}</select></label>`;
}

function renderCastle(currentLevel, copy) {
  const targetCosts = CASTLE_UPGRADE_COSTS.filter((item) => item.toLevel > currentLevel);
  const totals = Object.fromEntries(
    RESOURCE_META.map(([key]) => [
      key,
      targetCosts.reduce((sum, item) => sum + item.resources[key], 0),
    ])
  );
  const relevantSheetLevels =
    BUILDING_UPGRADE_DATA.buildings
      .find((building) => building.id === 'castle')
      ?.levels.filter((item) => item.level > currentLevel) || [];
  const rows = targetCosts
    .map((step) => {
      const sheetLevel = relevantSheetLevels.find((item) => item.level === step.toLevel);
      return `<article class="building-step-card">
      <header><span class="building-step-card__level">${text(copy, 'castleLevel', { level: step.toLevel })}</span><span class="building-step-card__caption">${copy.upgradeCost}</span></header>
      <div class="building-resource-grid building-resource-grid--step">${RESOURCE_META.map((resource) => renderResourceCard(resource, step.resources[resource[0]], copy, { compact: true })).join('')}</div>
      <div class="building-prerequisite"><span>${copy.sheetPrerequisite}</span><strong>${escapeHtml(sheetLevel?.prerequisite || text(copy, 'notListed'))}</strong></div>
    </article>`;
    })
    .join('');

  const steps = `${targetCosts.length} ${targetCosts.length === 1 ? copy.stepSingular : copy.stepPlural}`;

  return `<section class="building-planner-view" aria-labelledby="castlePlannerTitle">
    <div class="building-hero-card building-hero-card--castle">
      <div class="building-hero-card__art">${buildingIcon()}</div>
      <div class="building-hero-card__copy"><span class="building-eyebrow">${copy.castleProgression}</span><h2 id="castlePlannerTitle">${copy.castleTitle}</h2><p>${copy.castleIntro}</p></div>
      <div class="building-hero-card__control">${currentLevelControl('castleCurrentLevel', copy.yourCurrentCastle, currentLevel, copy)}</div>
    </div>
    <div class="building-section-heading"><div><span class="building-eyebrow">${copy.upgradeBudget}</span><h3>${copy.resourcesToCastle}</h3></div><span class="building-range-label">${text(copy, 'fromLevel', { level: currentLevel, steps })}</span></div>
    <div class="building-resource-grid building-resource-grid--totals">${RESOURCE_META.map((resource) => renderResourceCard(resource, totals[resource[0]], copy)).join('')}</div>
    <div class="building-section-heading building-section-heading--steps"><div><span class="building-eyebrow">${copy.levelByLevel}</span><h3>${copy.requirementsDirectCosts}</h3></div></div>
    <div class="building-step-list">${rows || `<p class="building-empty-state">${copy.castleMaxed}</p>`}</div>
    <p class="building-source-note"><strong>${copy.costSourceLabel}</strong> <a href="${escapeHtml(CASTLE_UPGRADE_COST_SOURCE.sourceUrl)}" target="_blank" rel="noreferrer">${copy.costSourceLink}</a>. ${copy.costSourceBody}</p>
  </section>`;
}

function renderBuildingRow(building, currentLevel, copy) {
  const levels = building.levels.filter((item) => item.level > currentLevel);
  const knownTotal = levels.reduce(
    (sum, item) => sum + (typeof item.cost === 'number' ? item.cost : 0),
    0
  );
  const missing = levels.filter((item) => item.cost == null).length;
  const costSummary = missing
    ? text(copy, 'summaryKnown', { known: formatNumber(knownTotal), missing })
    : formatNumber(knownTotal);
  const levelLines = levels
    .map(
      (item) => `<div class="building-level-line">
    <span class="building-level-line__target">${text(copy, 'level', { level: item.level })}</span>
    <strong>${item.cost == null ? `<span class="building-unknown">${text(copy, 'notListed')}</span>` : formatNumber(item.cost)}</strong>
    <span class="building-level-line__prerequisite">${escapeHtml(item.prerequisite || copy.noPrerequisite)}</span>
  </div>`
    )
    .join('');
  return `<details class="building-row-card" data-building-name="${escapeHtml(building.name.toLowerCase())}">
    <summary><span class="building-row-icon" aria-hidden="true">${genericBuildingIcon(building.name)}</span><span class="building-row-name"><strong>${escapeHtml(building.name)}</strong><small>${text(copy, 'sourceRow', { row: building.sourceNo })}</small></span><span class="building-row-total${missing ? ' is-incomplete' : ''}"><small>${missing ? copy.partialTotal : copy.selectedLevels}</small><strong>${costSummary}</strong></span><span class="building-row-chevron" aria-hidden="true">⌄</span></summary>
    <div class="building-row-details"><div class="building-level-list">${levelLines || `<p class="building-empty-state">${copy.noLevelsRemain}</p>`}</div><p class="building-bonus"><span>${copy.bonusAt30}</span><strong>${escapeHtml(building.bonus || text(copy, 'notListed'))}</strong></p></div>
  </details>`;
}

function renderAllBuildings(currentLevel, copy, search = '') {
  const sourceRowCount = BUILDING_UPGRADE_DATA.sourceRowCount;
  const selectedLevels = [26, 27, 28, 29, 30].filter((level) => level > currentLevel);
  const allCosts = BUILDING_UPGRADE_DATA.buildings.flatMap((building) =>
    building.levels.filter((item) => selectedLevels.includes(item.level))
  );
  const knownTotal = allCosts.reduce(
    (sum, item) => sum + (typeof item.cost === 'number' ? item.cost : 0),
    0
  );
  const missingCells = allCosts.filter((item) => item.cost == null).length;
  const summary = missingCells
    ? text(copy, 'summaryKnown', { known: formatNumber(knownTotal), missing: missingCells })
    : text(copy, 'summaryOrichalcum', { known: formatNumber(knownTotal) });

  return `<section class="building-planner-view" aria-labelledby="allBuildingsTitle">
    <div class="building-hero-card building-hero-card--list">
      <div class="building-hero-card__art building-hero-card__art--monogram"><span>${sourceRowCount}</span><small>${copy.buildingsUnit}</small></div>
      <div class="building-hero-card__copy"><span class="building-eyebrow">${copy.communitySheet}</span><h2 id="allBuildingsTitle">${copy.allBuildingsTitle}</h2><p>${copy.allBuildingsIntro}</p></div>
      <div class="building-hero-card__control">${currentLevelControl('allBuildingsCurrentLevel', copy.yourCurrentLevel, currentLevel, copy)}</div>
    </div>
    <div class="building-budget-banner"><div><span class="building-eyebrow">${copy.knownSourceCosts}${selectedLevels.length ? text(copy, 'knownCostsRange', { from: selectedLevels[0] }) : ''}</span><strong>${summary}</strong></div><span>${text(copy, 'buildingsCount', { count: sourceRowCount })}</span></div>
    ${missingCells ? `<p class="building-data-warning" role="status"><strong>${copy.missingWarningStrong}</strong> ${copy.missingWarningBody}</p>` : ''}
    <div class="building-list-toolbar"><label class="building-search-control"><span class="building-search-icon" aria-hidden="true">⌕</span><input id="buildingSearch" type="search" value="${escapeHtml(search)}" placeholder="${escapeHtml(copy.searchPlaceholder)}" aria-label="${escapeHtml(copy.searchPlaceholder)}"></label><span data-building-count>${text(copy, 'countOf', { shown: sourceRowCount, total: sourceRowCount })}</span></div>
    <div class="building-row-list">${BUILDING_UPGRADE_DATA.buildings.map((building) => renderBuildingRow(building, currentLevel, copy)).join('')}<p class="building-empty-state" data-building-empty hidden>${copy.noMatches}</p></div>
    <p class="building-data-warning"><strong>${text(copy, 'sheetTotalsStrong', { total: formatNumber(BUILDING_UPGRADE_DATA.totalOrichalcum) })}</strong> ${text(copy, 'sheetTotalsBody', { listed: formatNumber(BUILDING_UPGRADE_DATA.buildings.reduce((sum, building) => sum + (building.totalOrichalcum || 0), 0)) })}</p>
    <details class="building-source-note building-source-note--sheet"><summary>${copy.aboutSource}</summary><p>${escapeHtml(BUILDING_UPGRADE_DATA.sourceCaveat)}</p><p>${copy.dataLabel} <a href="${escapeHtml(BUILDING_UPGRADE_DATA.sourceUrl)}" target="_blank" rel="noreferrer">${copy.googleSheet}</a> ${text(copy, 'observedLine', { date: BUILDING_UPGRADE_DATA.observedAt })}</p><p>${copy.genericIcons}</p></details>
  </section>`;
}

export function initBuildingUpgrades(host) {
  const root = host || document.getElementById('buildingUpgradesRoot');
  if (!root) return false;

  let activeMode = 'castle';
  let castleLevel = 25;
  let allBuildingsLevel = 25;
  let search = '';
  let copy = getBuildingUpgradesCopy('en');
  let localeRequest = 0;

  // The search box filters the rendered rows in place. Rebuilding the list on every
  // keystroke destroyed the input that was being typed into, so the caret had to be
  // restored by hand after each render.
  const applyBuildingFilter = () => {
    const query = search.trim().toLowerCase();
    let shown = 0;
    root.querySelectorAll('.building-row-card').forEach((row) => {
      const matches = !query || String(row.dataset.buildingName || '').includes(query);
      row.hidden = !matches;
      if (matches) shown += 1;
    });
    const count = root.querySelector('[data-building-count]');
    if (count) {
      count.textContent = text(copy, 'countOf', {
        shown,
        total: BUILDING_UPGRADE_DATA.sourceRowCount,
      });
    }
    const empty = root.querySelector('[data-building-empty]');
    if (empty) empty.hidden = shown > 0;
  };

  const render = () => {
    const content =
      activeMode === 'castle'
        ? renderCastle(castleLevel, copy)
        : renderAllBuildings(allBuildingsLevel, copy, search);
    root.innerHTML = `<div class="building-upgrades-tool">
      <header class="building-tool-header"><div><span class="building-eyebrow">${copy.plannerEyebrow}</span><h2>${copy.buildingsHeading}</h2><p>${copy.buildingsIntro}</p></div><div class="building-tool-mark" aria-hidden="true">${buildingIcon()}</div></header>
      <div class="building-mode-switch" role="group" aria-label="${escapeHtml(copy.plannerAria)}">
        <button type="button" aria-pressed="${activeMode === 'castle'}" class="${activeMode === 'castle' ? 'is-active' : ''}" data-building-mode="castle">${copy.modeCastle}</button>
        <button type="button" aria-pressed="${activeMode === 'all'}" class="${activeMode === 'all' ? 'is-active' : ''}" data-building-mode="all">${copy.modeAll}</button>
      </div>
      <div class="building-mode-content">${content}</div>
    </div>`;
    root.querySelectorAll('[data-building-mode]').forEach((button) => {
      button.addEventListener('click', () => {
        activeMode = button.dataset.buildingMode;
        render();
      });
    });
    root.querySelector('#castleCurrentLevel')?.addEventListener('change', (event) => {
      castleLevel = Number(event.target.value);
      render();
    });
    root.querySelector('#allBuildingsCurrentLevel')?.addEventListener('change', (event) => {
      allBuildingsLevel = Number(event.target.value);
      render();
    });
    root.querySelector('#buildingSearch')?.addEventListener('input', (event) => {
      search = event.target.value;
      applyBuildingFilter();
    });
    if (activeMode === 'all') applyBuildingFilter();
  };

  const updateLanguage = async () => {
    const requestId = ++localeRequest;
    const locale = currentLanguage;
    const nextCopy = await loadBuildingUpgradesCopy(locale, buildingUpgradesCopyLocalesUrl);
    if (requestId !== localeRequest) return;
    copy = nextCopy;
    render();
  };

  if (root.__buildingLangHandler) {
    window.removeEventListener('edenLanguageUpdate', root.__buildingLangHandler);
  }
  root.__buildingLangHandler = updateLanguage;
  window.addEventListener('edenLanguageUpdate', root.__buildingLangHandler);

  render();
  void updateLanguage();
  return true;
}
