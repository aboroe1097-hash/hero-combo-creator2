import '../css/building-upgrades.css';
import {
  BUILDING_UPGRADE_DATA,
  CASTLE_UPGRADE_COSTS,
  CASTLE_UPGRADE_COST_SOURCE,
} from './building-upgrade-data.js';

const RESOURCE_META = [
  ['orichalcum', 'Orichalcum', 'crystal'],
  ['gold', 'Gold', 'coin'],
  ['food', 'Food', 'wheat'],
  ['lumber', 'Lumber', 'wood'],
  ['charcoal', 'Charcoal', 'flame'],
  ['marble', 'Marble', 'stone'],
  ['iron', 'Iron', 'iron'],
];
const numberFormat = new Intl.NumberFormat('en-US');
const formatNumber = (value) => numberFormat.format(value);
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

function renderResourceCard([key, label, icon], amount, { compact = false } = {}) {
  return `<div class="building-resource-card${compact ? ' is-compact' : ''}" data-resource="${key}">
    <span class="building-resource-card__icon">${resourceIcon(icon)}</span>
    <span class="building-resource-card__label">${label}</span>
    <strong>${amount == null ? 'Not listed' : formatNumber(amount)}</strong>
  </div>`;
}

function currentLevelControl(id, label, value, min = 25, max = 29) {
  const options = Array.from({ length: max - min + 1 }, (_, index) => min + index)
    .map(
      (level) =>
        `<option value="${level}"${level === value ? ' selected' : ''}>Level ${level}</option>`
    )
    .join('');
  return `<label class="building-select-control" for="${id}"><span>${label}</span><select id="${id}">${options}</select></label>`;
}

function renderCastle(currentLevel) {
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
      <header><span class="building-step-card__level">Castle ${step.toLevel}</span><span class="building-step-card__caption">Upgrade cost</span></header>
      <div class="building-resource-grid building-resource-grid--step">${RESOURCE_META.map((resource) => renderResourceCard(resource, step.resources[resource[0]], { compact: true })).join('')}</div>
      <div class="building-prerequisite"><span>Sheet prerequisite</span><strong>${escapeHtml(sheetLevel?.prerequisite || 'Not listed')}</strong></div>
    </article>`;
    })
    .join('');

  return `<section class="building-planner-view" aria-labelledby="castlePlannerTitle">
    <div class="building-hero-card building-hero-card--castle">
      <div class="building-hero-card__art">${buildingIcon()}</div>
      <div class="building-hero-card__copy"><span class="building-eyebrow">Castle progression</span><h2 id="castlePlannerTitle">Castle levels 26–30</h2><p>Plan direct Castle costs across all seven resources, with the matching Orichalcum prerequisite note from the community sheet.</p></div>
      <div class="building-hero-card__control">${currentLevelControl('castleCurrentLevel', 'Your current Castle', currentLevel)}</div>
    </div>
    <div class="building-section-heading"><div><span class="building-eyebrow">Upgrade budget</span><h3>Resources to Castle 30</h3></div><span class="building-range-label">From level ${currentLevel} · ${targetCosts.length} step${targetCosts.length === 1 ? '' : 's'}</span></div>
    <div class="building-resource-grid building-resource-grid--totals">${RESOURCE_META.map((resource) => renderResourceCard(resource, totals[resource[0]])).join('')}</div>
    <div class="building-section-heading building-section-heading--steps"><div><span class="building-eyebrow">Level by level</span><h3>Requirements and direct costs</h3></div></div>
    <div class="building-step-list">${rows || '<p class="building-empty-state">Castle is already level 30.</p>'}</div>
    <p class="building-source-note"><strong>Cost source:</strong> <a href="${escapeHtml(CASTLE_UPGRADE_COST_SOURCE.sourceUrl)}" target="_blank" rel="noreferrer">ROCAcademy Castle Upgrade Costs</a>. Figures are direct Castle costs; prerequisite buildings are not included. The source notes that accumulated totals may vary with current building levels.</p>
  </section>`;
}

function renderBuildingRow(building, currentLevel) {
  const levels = building.levels.filter((item) => item.level > currentLevel);
  const knownTotal = levels.reduce(
    (sum, item) => sum + (typeof item.cost === 'number' ? item.cost : 0),
    0
  );
  const missing = levels.filter((item) => item.cost == null).length;
  const costSummary = missing
    ? `${formatNumber(knownTotal)} known · ${missing} level${missing === 1 ? '' : 's'} missing`
    : formatNumber(knownTotal);
  const levelLines = levels
    .map(
      (item) => `<div class="building-level-line">
    <span class="building-level-line__target">Level ${item.level}</span>
    <strong>${item.cost == null ? '<span class="building-unknown">Not listed</span>' : formatNumber(item.cost)}</strong>
    <span class="building-level-line__prerequisite">${escapeHtml(item.prerequisite || 'No prerequisite listed')}</span>
  </div>`
    )
    .join('');
  return `<details class="building-row-card" data-building-name="${escapeHtml(building.name.toLowerCase())}">
    <summary><span class="building-row-icon" aria-hidden="true">${genericBuildingIcon(building.name)}</span><span class="building-row-name"><strong>${escapeHtml(building.name)}</strong><small>Source row ${building.sourceNo}</small></span><span class="building-row-total${missing ? ' is-incomplete' : ''}"><small>${missing ? 'Partial total' : 'Selected levels'}</small><strong>${costSummary}</strong></span><span class="building-row-chevron" aria-hidden="true">⌄</span></summary>
    <div class="building-row-details"><div class="building-level-list">${levelLines || '<p class="building-empty-state">No levels remain in this plan.</p>'}</div><p class="building-bonus"><span>Bonus at level 30</span><strong>${escapeHtml(building.bonus || 'Not listed')}</strong></p></div>
  </details>`;
}

function renderAllBuildings(currentLevel, search = '') {
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
    ? `${formatNumber(knownTotal)} known · ${missingCells} cost cells missing`
    : `${formatNumber(knownTotal)} Orichalcum`;

  return `<section class="building-planner-view" aria-labelledby="allBuildingsTitle">
    <div class="building-hero-card building-hero-card--list">
      <div class="building-hero-card__art building-hero-card__art--monogram"><span>${sourceRowCount}</span><small>buildings</small></div>
      <div class="building-hero-card__copy"><span class="building-eyebrow">Community upgrade sheet</span><h2 id="allBuildingsTitle">All building upgrades</h2><p>Compare Orichalcum costs, prerequisites and level 30 bonuses across the buildings listed in the source sheet.</p></div>
      <div class="building-hero-card__control">${currentLevelControl('allBuildingsCurrentLevel', 'Your current level', currentLevel)}</div>
    </div>
    <div class="building-budget-banner"><div><span class="building-eyebrow">Known source costs${selectedLevels.length ? ` · levels ${selectedLevels[0]}–30` : ''}</span><strong>${summary}</strong></div><span>${sourceRowCount} buildings</span></div>
    ${missingCells ? `<p class="building-data-warning" role="status"><strong>Some costs are missing in the source.</strong> Missing cells remain unknown and are not counted as zero; displayed totals are partial.</p>` : ''}
    <div class="building-list-toolbar"><label class="building-search-control"><span class="building-search-icon" aria-hidden="true">⌕</span><input id="buildingSearch" type="search" value="${escapeHtml(search)}" placeholder="Search buildings" aria-label="Search buildings"></label><span data-building-count>${sourceRowCount} of ${sourceRowCount}</span></div>
    <div class="building-row-list">${BUILDING_UPGRADE_DATA.buildings.map((building) => renderBuildingRow(building, currentLevel)).join('')}<p class="building-empty-state" data-building-empty hidden>No buildings match this search.</p></div>
    <p class="building-data-warning"><strong>The sheet’s displayed total is ${formatNumber(BUILDING_UPGRADE_DATA.totalOrichalcum)}.</strong> The listed building totals add to ${formatNumber(BUILDING_UPGRADE_DATA.buildings.reduce((sum, building) => sum + (building.totalOrichalcum || 0), 0))}; the sheet formula omits Market and Institute.</p>
    <details class="building-source-note building-source-note--sheet"><summary>About the source data</summary><p>${escapeHtml(BUILDING_UPGRADE_DATA.sourceCaveat)}</p><p>Data: <a href="${escapeHtml(BUILDING_UPGRADE_DATA.sourceUrl)}" target="_blank" rel="noreferrer">Google Sheet</a> · observed ${escapeHtml(BUILDING_UPGRADE_DATA.observedAt)} · credited to Raven G.</p><p>Every building mark here is a generic symbol drawn for this tool; no external icon set is loaded.</p></details>
  </section>`;
}

export function initBuildingUpgrades(host) {
  const root = host || document.getElementById('buildingUpgradesRoot');
  if (!root) return false;

  let activeMode = 'castle';
  let castleLevel = 25;
  let allBuildingsLevel = 25;
  let search = '';

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
      count.textContent = `${shown} of ${BUILDING_UPGRADE_DATA.sourceRowCount}`;
    }
    const empty = root.querySelector('[data-building-empty]');
    if (empty) empty.hidden = shown > 0;
  };

  const render = () => {
    const content =
      activeMode === 'castle'
        ? renderCastle(castleLevel)
        : renderAllBuildings(allBuildingsLevel, search);
    root.innerHTML = `<div class="building-upgrades-tool">
      <header class="building-tool-header"><div><span class="building-eyebrow">Rise of Castles · Upgrade planner</span><h2>Buildings</h2><p>Plan Castle 26–30 and calculate Orichalcum across all listed buildings.</p></div><div class="building-tool-mark" aria-hidden="true">${buildingIcon()}</div></header>
      <div class="building-mode-switch" role="group" aria-label="Building upgrade planner">
        <button type="button" aria-pressed="${activeMode === 'castle'}" class="${activeMode === 'castle' ? 'is-active' : ''}" data-building-mode="castle">Castle 26–30</button>
        <button type="button" aria-pressed="${activeMode === 'all'}" class="${activeMode === 'all' ? 'is-active' : ''}" data-building-mode="all">All buildings</button>
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

  render();
  return true;
}
