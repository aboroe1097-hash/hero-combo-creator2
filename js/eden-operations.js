import {
  BLUE_LOYALTY_SPECIALTY,
  BUILDING_DISCOUNTS,
  BUILDING_HONOR_YIELDS,
  BUILDING_UPGRADE_COSTS,
  EDEN_OPERATIONS_DATA_VERSION,
  EDEN_OPERATIONS_SOURCES,
  EDEN_OPERATION_PLAYBOOKS,
  EDEN_OPERATION_ROLES,
  EDEN_OPERATION_STAGES,
  EDEN_STRUCTURES,
  SPECIALTY_DATA_GAPS,
  SPECIALTY_HONOR_LEVELS,
  SPECIALTY_PRESETS,
  SPECIALTY_TREE_SCHEMA,
  TILE_LEVELS,
} from './eden-operations-data.js';
import {
  calculateBuildingUpgrade,
  calculateCampUpgradeOrder,
  calculateHonorProgress,
  calculateTilingPlan,
  calculateTrainingComparison,
  checklistProgress,
  decodeEdenOperationsState,
  encodeEdenOperationsState,
  filterOperationPlaybooks,
  getSiegePlan,
  honorLevelRows,
  normalizeEdenOperationsState,
  readEdenOperationsState,
  rowsToCsv,
  specialtyAllocationSummary,
  staffingStatus,
  writeEdenOperationsState,
} from './eden-operations-model.js';
import EN_COPY from './i18n/eden-operations/en.js';
import { edenMapText, loadEdenMapLocale } from './i18n/eden-map/index.js';
import { resolveIntlLocale, resolveRuntimeLocale } from './locale-format.js';

const TOOL_META = Object.freeze([
  { id: 'specialty', icon: '🌳', key: 'toolSpecialty' },
  { id: 'honor', icon: '📈', key: 'toolHonor' },
  { id: 'training', icon: '⚔️', key: 'toolTraining' },
  { id: 'buildings', icon: '🏗️', key: 'toolBuildings' },
  { id: 'siege', icon: '🏰', key: 'toolSiege' },
]);

// English ships in the chunk as the fallback; every other locale is fetched only
// when a viewer actually uses it, so eleven packs do not ride along for everyone.
const COPY_LOADERS = Object.freeze({
  ar: () => import('./i18n/eden-operations/ar.js'),
  de: () => import('./i18n/eden-operations/de.js'),
  es: () => import('./i18n/eden-operations/es.js'),
  fr: () => import('./i18n/eden-operations/fr.js'),
  id: () => import('./i18n/eden-operations/id.js'),
  it: () => import('./i18n/eden-operations/it.js'),
  kr: () => import('./i18n/eden-operations/kr.js'),
  pt: () => import('./i18n/eden-operations/pt.js'),
  ru: () => import('./i18n/eden-operations/ru.js'),
  tr: () => import('./i18n/eden-operations/tr.js'),
  zh: () => import('./i18n/eden-operations/zh.js'),
});
const loadedCopy = new Map([['en', EN_COPY]]);

let state = null;
let mount = null;
let booted = false;
// The board's filters are a per-visit view, not part of the saved plan.
const boardFilter = { stage: 'all', role: 'all', query: '' };
const openSteps = new Set();
const BOARD_OPEN_KEY = 'vts_eden_operations_board_open';
let boardOpen = true;

function readBoardOpen() {
  try {
    return globalThis.localStorage?.getItem(BOARD_OPEN_KEY) !== '0';
  } catch {
    return true;
  }
}

function writeBoardOpen(open) {
  try {
    globalThis.localStorage?.setItem(BOARD_OPEN_KEY, open ? '1' : '0');
  } catch {
    // Storage can be blocked; the board then simply opens by default.
  }
}

function locale() {
  return resolveRuntimeLocale();
}

async function ensureCopy(language = locale()) {
  // Hub tool names (Eden Map, Eden Loyalty, Eden Pathing) come from the hub's own pack.
  await loadEdenMapLocale(language);
  if (loadedCopy.has(language) || !COPY_LOADERS[language]) return;
  try {
    loadedCopy.set(language, (await COPY_LOADERS[language]()).default);
  } catch (error) {
    // A pack that fails to load leaves the tool usable in English rather than blank.
    console.warn('Eden Operations copy unavailable for', language, error);
  }
}

function text(key, values = {}) {
  const template = loadedCopy.get(locale())?.[key] ?? EN_COPY[key] ?? key;
  return template.replace(/\{(\w+)\}/g, (match, name) => (name in values ? values[name] : match));
}

function formatNumber(value, maximumFractionDigits = 1) {
  if (value == null || !Number.isFinite(Number(value))) return '—';
  return new Intl.NumberFormat(resolveIntlLocale(locale()), {
    notation: Math.abs(Number(value)) >= 100000 ? 'compact' : 'standard',
    maximumFractionDigits,
  }).format(Number(value));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function field(label, control, extra = '') {
  return `<label class="eden-ops-field ${extra}"><span>${label}</span>${control}</label>`;
}

function numberInput(path, value, min, max, step = 1) {
  return `<input data-ops-field="${path}" type="number" inputmode="decimal" min="${min}" max="${max}" step="${step}" value="${value}">`;
}

function selectInput(path, value, options) {
  return `<select data-ops-field="${path}">${options
    .map(
      (option) =>
        `<option value="${escapeHtml(option.value)}"${String(option.value) === String(value) ? ' selected' : ''}>${escapeHtml(option.label)}</option>`
    )
    .join('')}</select>`;
}

function metric(label, value, tone = '') {
  return `<div class="eden-ops-metric ${tone}"><span>${label}</span><strong>${value}</strong></div>`;
}

function sourceStatus(status) {
  if (status === 'published-rounded') return text('sourcePublished');
  if (status === 'calculated-from-rounded-source') return text('sourceCalculated');
  return text('sourceUnavailable');
}

function updateHashTool(toolId) {
  const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
  params.set('subtab', 'operations');
  params.set('tool', toolId);
  history.replaceState(history.state, '', `#edenHub?${params.toString()}`);
}

function saveAndRender() {
  state = writeEdenOperationsState(state);
  render();
}

function setNested(path, rawValue, inputType) {
  const parts = path.split('.');
  let target = state;
  for (const part of parts.slice(0, -1)) target = target[part];
  const key = parts.at(-1);
  target[key] = inputType === 'checkbox' ? Boolean(rawValue) : rawValue;
  state = normalizeEdenOperationsState(state);
}

function renderSpecialty() {
  const summary = specialtyAllocationSummary(state.specialty);
  const activePreset = SPECIALTY_PRESETS.find((preset) => preset.id === state.specialty.presetId);
  return `
    <section class="eden-ops-workspace" aria-labelledby="edenOpsSpecialtyTitle">
      <div class="eden-ops-section-head">
        <div><p class="eden-ops-kicker">${text('kickerSpecialty')}</p><h3 id="edenOpsSpecialtyTitle">${text(TOOL_META[0].key)}</h3></div>
        <div class="eden-ops-export-actions"><button data-ops-action="csv">${text('csv')}</button><button data-ops-action="png">${text('png')}</button></div>
      </div>
      <p class="eden-ops-note">${text('topologyNote')}</p>
      <div class="eden-ops-controls eden-ops-controls--compact">
        ${field(text('preset'), selectInput('specialty.presetId', state.specialty.presetId, SPECIALTY_PRESETS.map((preset) => ({ value: preset.id, label: dataText(`preset.${preset.id}.name`, preset.name) }))))}
        ${field(text('availablePoints'), numberInput('specialty.availablePoints', state.specialty.availablePoints, 0, 143))}
      </div>
      <article class="eden-ops-preset eden-ops-tone-${activePreset.tone}">
        <div><strong>${escapeHtml(dataText(`preset.${activePreset.id}.name`, activePreset.name))}</strong><p>${escapeHtml(dataText(`preset.${activePreset.id}.summary`, activePreset.summary))}</p></div>
        <div class="eden-ops-milestones"><span>${text('critical')} ${activePreset.critical}</span><span>${text('essential')} ${activePreset.essential}</span><span>${text('advanced')} ${activePreset.advanced}</span></div>
      </article>
      <div class="eden-ops-metrics">
        ${metric(text('availablePoints'), formatNumber(summary.available))}
        ${metric(text('allocated'), formatNumber(summary.allocated))}
        ${metric(summary.remaining < 0 ? text('over') : text('remaining'), formatNumber(Math.abs(summary.remaining)), summary.remaining < 0 ? 'danger' : 'good')}
      </div>
      <div class="eden-ops-tree-grid">
        ${SPECIALTY_TREE_SCHEMA.map(
          (tree) => `<section class="eden-ops-tree eden-ops-tree--${tree.id}">
            <header><span class="eden-ops-tree-orb" aria-hidden="true"></span><div><h4>${escapeHtml(dataText(`tree.${tree.id}.name`, tree.name))}</h4><p>${escapeHtml(dataText(`tree.${tree.id}.purpose`, tree.purpose))}</p></div></header>
            <div class="eden-ops-route-list">
              ${tree.routes
                .map((route) => {
                  const points = summary.allocations[route.id] || 0;
                  const chips = ['critical', 'essential', 'advanced']
                    .filter((tier) => route[tier] != null)
                    .map(
                      (tier) =>
                        `<button type="button" data-ops-milestone="${route.id}:${route[tier]}" aria-pressed="${points >= route[tier]}">${text(tier)} ${route[tier]}</button>`
                    )
                    .join('');
                  return `<article class="eden-ops-route${activePreset.routeOrder.includes(route.id) ? ' is-focus' : ''}">
                    <div class="eden-ops-route-copy"><strong>${escapeHtml(dataText(`route.${route.id}.name`, route.name))}</strong><span>${escapeHtml(dataText(`route.${route.id}.summary`, route.summary))}</span>${route.caution ? `<small>⚠ ${escapeHtml(dataText(`route.${route.id}.caution`, route.caution))}</small>` : ''}</div>
                    <label><span>${text('routePoints')}</span><input data-ops-route="${route.id}" type="number" min="0" max="130" value="${points}"></label>
                    <div class="eden-ops-route-track" style="--progress:${Math.min(100, (points / (route.advanced || route.essential)) * 100)}%"><i></i></div>
                    <div class="eden-ops-route-next">${chips}</div>
                  </article>`;
                })
                .join('')}
            </div>
          </section>`
        ).join('')}
      </div>
    </section>`;
}

function renderHonor() {
  const result = calculateHonorProgress(state.honor.currentLevel, state.honor.targetLevel);
  const rows = honorLevelRows();
  return `<section class="eden-ops-workspace" aria-labelledby="edenOpsHonorTitle">
    <div class="eden-ops-section-head"><div><p class="eden-ops-kicker">1—143</p><h3 id="edenOpsHonorTitle">${text(TOOL_META[1].key)}</h3></div><div class="eden-ops-export-actions"><button data-ops-action="csv">${text('csv')}</button><button data-ops-action="png">${text('png')}</button></div></div>
    <div class="eden-ops-controls eden-ops-controls--compact">
      ${field(text('currentLevel'), numberInput('honor.currentLevel', state.honor.currentLevel, 1, 143))}
      ${field(text('targetLevel'), numberInput('honor.targetLevel', state.honor.targetLevel, 1, 143))}
    </div>
    <div class="eden-ops-metrics">
      ${metric(text('honorRequired'), result.calculable ? formatNumber(result.required, 2) : text('unknown'), result.calculable ? 'accent' : 'danger')}
      ${metric(text('currentTotal'), formatNumber(result.currentRow.cumulative, 2))}
      ${metric(text('targetTotal'), formatNumber(result.targetRow.cumulative, 2))}
    </div>
    ${result.unknownLevels.length ? `<p class="eden-ops-warning">⚠ ${text('unknownGap')}</p>` : ''}
    <div class="eden-ops-honor-chart" aria-label="${text('honorChartLabel')}">
      ${rows.filter((row) => row.level % 10 === 0 || row.level === 1 || row.level === 143).map((row) => `<div title="${text('levelShort')} ${row.level}: ${formatNumber(row.cumulative)}"><i style="height:${row.cumulative ? Math.max(3, (row.cumulative / 4_905_100_000) * 100) : 2}%"></i><span>${row.level}</span></div>`).join('')}
    </div>
    <div class="eden-ops-table-wrap eden-ops-table-wrap--tall"><table><thead><tr><th>${text('level')}</th><th>${text('honor')}</th><th>${text('difference')}</th><th>${text('cumulative')}</th><th>${text('status')}</th></tr></thead><tbody>
      ${rows.map((row) => `<tr class="${row.honor == null ? 'is-unknown' : ''}"><td>${row.level}</td><td>${formatNumber(row.honor, 2)}</td><td>${formatNumber(row.difference, 2)}</td><td>${formatNumber(row.cumulative, 2)}</td><td>${sourceStatus(row.status === 'published-rounded' ? row.cumulativeStatus : row.status)}</td></tr>`).join('')}
    </tbody></table></div>
  </section>`;
}

function renderTraining() {
  const comparison = calculateTrainingComparison(state.training);
  return `<section class="eden-ops-workspace" aria-labelledby="edenOpsTrainingTitle">
    <div class="eden-ops-section-head"><div><p class="eden-ops-kicker">${text('kickerTraining')}</p><h3 id="edenOpsTrainingTitle">${text(TOOL_META[2].key)}</h3></div><div class="eden-ops-export-actions"><button data-ops-action="csv">${text('csv')}</button><button data-ops-action="png">${text('png')}</button></div></div>
    <div class="eden-ops-controls">
      ${field(text('tileLevel'), selectInput('training.tileLevel', state.training.tileLevel, TILE_LEVELS.map((tile) => ({ value: tile.level, label: `T${tile.level} · ${formatNumber(tile.honor)} ${text('honorUnit')}` }))))}
      ${field(text('attacks'), numberInput('training.attacks', state.training.attacks, 1, 1000))}
      ${field(text('legions'), numberInput('training.legions', state.training.legions, 1, 20))}
      ${field(text('sessions'), numberInput('training.sessions', state.training.sessions, 1, 100))}
      ${field(text('days'), numberInput('training.days', state.training.days, 1, 365))}
      ${field(text('specialtyBonus'), selectInput('training.specialtyBonus', state.training.specialtyBonus, [0, 0.3, 0.9, 1.9].map((value) => ({ value, label: `${Math.round(value * 100)}%` }))))}
      ${field(text('banner'), `<input data-ops-field="training.banner" type="checkbox"${state.training.banner ? ' checked' : ''}>`, 'eden-ops-field--check')}
    </div>
    <p class="eden-ops-note">${text('trainingFormula')}</p>
    <div class="eden-ops-mode-grid">${comparison.map((row) => `<article class="eden-ops-mode eden-ops-mode--${row.id}"><span>${escapeHtml(dataText(`mode.${row.id}`, row.name))}</span><strong>${formatNumber(row.withSpecialty, 2)}</strong><small>${state.training.days} ${text('days')} · ${Math.round(state.training.specialtyBonus * 100)}%</small></article>`).join('')}</div>
    <div class="eden-ops-table-wrap"><table><thead><tr><th>${text('mode')}</th><th>${text('perAttack')}</th><th>${text('perSession')}</th><th>${text('daily')}</th><th>${text('period')}</th><th>${text('boosted')}</th></tr></thead><tbody>
      ${comparison.map((row) => `<tr><th>${escapeHtml(dataText(`mode.${row.id}`, row.name))}</th><td>${formatNumber(row.honorPerAttack, 2)}</td><td>${formatNumber(row.perSession, 2)}</td><td>${formatNumber(row.daily, 2)}</td><td>${formatNumber(row.period, 2)}</td><td><strong>${formatNumber(row.withSpecialty, 2)}</strong></td></tr>`).join('')}
    </tbody></table></div>
  </section>`;
}

function dataText(key, fallback) {
  return loadedCopy.get(locale())?.[key] ?? EN_COPY[key] ?? fallback;
}

function buildingLabel(id) {
  if (id.startsWith('ac')) return text('buildingCamp', { n: id.slice(2) });
  return id === 'fortress' ? text('buildingFortress') : text('buildingWorkshop');
}

function structureLabel(entry) {
  const group = dataText(`group.${entry.group}`, entry.group);
  return entry.level ? `${group} ${text('levelShort')} ${entry.level}` : group;
}

function sourceKindLabel(status) {
  if (status === 'community-guidance') return text('statusCommunityGuidance');
  if (status === 'community-sheet') return text('statusCommunitySheet');
  return status;
}

function renderBuildings() {
  const result = calculateBuildingUpgrade(state.buildings);
  const honorUnknown = BUILDING_HONOR_YIELDS[result.buildingId] == null;
  return `<section class="eden-ops-workspace" aria-labelledby="edenOpsBuildingsTitle">
    <div class="eden-ops-section-head"><div><p class="eden-ops-kicker">${text('kickerBuildings')}</p><h3 id="edenOpsBuildingsTitle">${text(TOOL_META[3].key)}</h3></div><div class="eden-ops-export-actions"><button data-ops-action="csv">${text('csv')}</button><button data-ops-action="png">${text('png')}</button></div></div>
    <div class="eden-ops-controls eden-ops-controls--compact">
      ${field(text('building'), selectInput('buildings.buildingId', state.buildings.buildingId, Object.keys(BUILDING_UPGRADE_COSTS).map((id) => ({ value: id, label: buildingLabel(id) }))))}
      ${field(text('currentLevel'), numberInput('buildings.currentLevel', state.buildings.currentLevel, 1, 20))}
      ${field(text('targetLevel'), numberInput('buildings.targetLevel', state.buildings.targetLevel, 1, 20))}
      ${field(text('discount'), selectInput('buildings.discountId', state.buildings.discountId, BUILDING_DISCOUNTS.map((entry) => ({ value: entry.id, label: dataText(`discount.${entry.id}`, entry.label) }))))}
    </div>
    <div class="eden-ops-metrics">${metric(text('baseTotal'), formatNumber(result.baseTotal, 2))}${metric(text('discountedTotal'), formatNumber(result.discountedTotal, 2), 'accent')}${metric(text('saved'), formatNumber(result.baseTotal - result.discountedTotal, 2), 'good')}</div>
    ${honorUnknown ? `<p class="eden-ops-warning">⚠ ${text('honorYieldUnknown')}</p>` : ''}
    <div class="eden-ops-table-wrap"><table><thead><tr><th>${text('upgradeTo')}</th><th>${text('baseCost')}</th><th>${text('discountedCost')}</th><th>${text('saved')}</th></tr></thead><tbody>
      ${result.rows.map((row) => `<tr><td>${buildingLabel(result.buildingId)} ${text('levelShort')} ${row.level}</td><td>${formatNumber(row.baseCost, 2)}</td><td>${formatNumber(row.discountedCost, 2)}</td><td>${formatNumber(row.baseCost - row.discountedCost, 2)}</td></tr>`).join('') || `<tr><td colspan="4">—</td></tr>`}
    </tbody></table></div>
  </section>`;
}

function renderSiege() {
  const tiling = calculateTilingPlan(state.siege);
  const order = calculateCampUpgradeOrder(state.siege);
  const siege = getSiegePlan(state.siege.structureId, state.siege.banner);
  const staffing = staffingStatus(siege, state.siege.assigned);
  return `<section class="eden-ops-workspace" aria-labelledby="edenOpsSiegeTitle">
    <div class="eden-ops-section-head"><div><p class="eden-ops-kicker">${text('kickerSiege')}</p><h3 id="edenOpsSiegeTitle">${text(TOOL_META[4].key)}</h3></div><div class="eden-ops-export-actions"><button data-ops-action="csv">${text('csv')}</button><button data-ops-action="png">${text('png')}</button></div></div>
    <div class="eden-ops-controls">
      ${state.siege.campLevels.map((level, index) => field(`AC ${index + 1}`, numberInput(`siege.campLevels.${index}`, level, 0, 20))).join('')}
      ${field(text('specialtyRank'), selectInput('siege.specialtyRank', state.siege.specialtyRank, BLUE_LOYALTY_SPECIALTY.map((entry) => ({ value: entry.rank, label: `${entry.rank} · +${entry.extraLoyalty}` }))))}
      ${field(text('targetTile'), selectInput('siege.targetTileLevel', state.siege.targetTileLevel, TILE_LEVELS.map((tile) => ({ value: tile.level, label: `T${tile.level} · ${tile.loyalty}` }))))}
    </div>
    <div class="eden-ops-metrics">${metric(text('totalLoyalty'), formatNumber(tiling.totalLoyalty), 'accent')}${metric(text('safeTile'), `T${tiling.safeTile.level}`, 'good')}${metric(text('gap'), formatNumber(tiling.loyaltyGap), tiling.loyaltyGap ? 'danger' : 'good')}</div>
    <div class="eden-ops-split">
      <article class="eden-ops-card"><h4>${text('upgradeOrder')}</h4>${order.steps.length ? `<ol class="eden-ops-order">${order.steps.map((step) => `<li><strong>AC ${step.campNumber} → ${text('levelShort')} ${step.level}</strong><span>${formatNumber(step.cost)} · ${formatNumber(step.resultingLoyalty)} ${text('loyalty')}</span></li>`).join('')}</ol><p class="eden-ops-total">${text('cost')}: <strong>${formatNumber(order.totalCost, 2)}</strong></p>` : `<p class="eden-ops-empty-inline">✓ ${text('noUpgrades')}</p>`}${hubLink('loyalty')}</article>
      <article class="eden-ops-card"><h4>${text('structure')}</h4>
        <div class="eden-ops-controls eden-ops-controls--stack">
          ${field(text('structure'), selectInput('siege.structureId', state.siege.structureId, EDEN_STRUCTURES.map((entry) => ({ value: entry.id, label: structureLabel(entry) }))))}
          ${field(text('banner'), `<input data-ops-field="siege.banner" type="checkbox"${state.siege.banner ? ' checked' : ''}>`, 'eden-ops-field--check')}
        </div>
        <dl class="eden-ops-objective"><div><dt>${text('loyalty')}</dt><dd>${formatNumber(siege.structure.loyalty)}</dd></div><div><dt>${text('durability')}</dt><dd>${formatNumber(siege.structure.durability)}</dd></div><div><dt>${text('damageDurability')}</dt><dd>${formatNumber(siege.structure.damageDurability)}</dd></div><div><dt>${text('attackers')}</dt><dd>${formatNumber(siege.attackers)}</dd></div><div><dt>${text('support')}</dt><dd>${formatNumber(siege.support)}</dd></div></dl>
        ${renderStaffing(siege, staffing)}
        ${hubLink('map')}
      </article>
    </div>
  </section>`;
}

function counterRow(side, value, required) {
  const label = text(side);
  const progress = required ? Math.min(100, (value / required) * 100) : 100;
  return `<div class="eden-ops-counter${value >= required ? ' is-met' : ''}"><span>${label}</span><div class="eden-ops-counter-controls"><button type="button" data-ops-count="${side}:-1" aria-label="${escapeHtml(`− ${label}`)}"${value <= 0 ? ' disabled' : ''}>−</button><output aria-live="polite"><strong>${formatNumber(value)}</strong> / ${formatNumber(required)}</output><button type="button" data-ops-count="${side}:1" aria-label="${escapeHtml(`+ ${label}`)}">+</button></div><i class="eden-ops-counter-track" style="--progress:${progress}%"><b></b></i></div>`;
}

function renderStaffing(siege, staffing) {
  return `<section class="eden-ops-staffing" aria-label="${escapeHtml(text('assigned'))}"><h5>${text('assigned')}${staffing.ready ? ' <span class="eden-ops-staff-ok">✓</span>' : ''}</h5>${counterRow('attackers', staffing.attackers, siege.attackers)}${counterRow('support', staffing.support, siege.support)}${staffing.ready ? '' : `<p class="eden-ops-staff-status">${text('staffMissing', { count: formatNumber(staffing.missing) })}</p>`}</section>`;
}

const HUB_LINKS = Object.freeze({
  map: { key: 'subTabMap', icon: '🗺️' },
  loyalty: { key: 'subTabLoyalty', icon: '🛡️' },
});

function hubLink(subtab) {
  const link = HUB_LINKS[subtab];
  return `<a class="eden-ops-hub-link" href="#edenHub?subtab=${subtab}"><span aria-hidden="true">${link.icon}</span>${escapeHtml(edenMapText(link.key, {}, locale()))}<span aria-hidden="true" class="eden-ops-arrow">→</span></a>`;
}

function toolName(toolId) {
  return text(TOOL_META.find((tool) => tool.id === toolId).key);
}

function playbookWords(entry) {
  return [
    text(`op.${entry.id}.title`),
    ...entry.steps.map((step) => text(step)),
    text(`stage.${entry.stage}`),
    ...entry.roles.map((role) => text(`role.${role}`)),
    toolName(entry.tool),
  ].join(' ');
}

function renderPlaybook(entry) {
  const progress = checklistProgress(entry, state.checklist);
  const complete = progress.done === progress.total;
  const steps = entry.steps
    .map((step, index) => {
      const key = `${entry.id}.${index}`;
      return `<li><label><input type="checkbox" data-ops-check="${key}"${state.checklist[key] ? ' checked' : ''}><span>${escapeHtml(text(step))}</span></label></li>`;
    })
    .join('');
  return `<article class="eden-ops-op${complete ? ' is-complete' : ''}${entry.tool === state.activeTool ? ' is-current' : ''}"><header><span class="eden-ops-op-icon" aria-hidden="true">${entry.icon}</span><h4>${escapeHtml(text(`op.${entry.id}.title`))}</h4></header><div class="eden-ops-tags"><span class="eden-ops-tag eden-ops-tag--${entry.stage}">${text(`stage.${entry.stage}`)}</span>${entry.roles.map((role) => `<span class="eden-ops-tag">${text(`role.${role}`)}</span>`).join('')}</div><details${openSteps.has(entry.id) ? ' open' : ''} data-ops-steps="${entry.id}"><summary><span>${text('step')}</span><span class="eden-ops-progress">✓ ${progress.done}/${progress.total}</span></summary><ol class="eden-ops-steps">${steps}</ol></details><div class="eden-ops-op-actions"><button type="button" class="eden-ops-primary" data-ops-tool="${entry.tool}" data-ops-open="${entry.id}">${toolName(entry.tool)}<span aria-hidden="true" class="eden-ops-arrow">→</span></button></div></article>`;
}

function renderBoardList() {
  const matches = filterOperationPlaybooks(boardFilter, playbookWords);
  const count = `<p class="eden-ops-count" role="status">${matches.length}/${EDEN_OPERATION_PLAYBOOKS.length}</p>`;
  if (!matches.length) {
    return `${count}<div class="eden-ops-empty"><span aria-hidden="true">🔎</span><strong>${text('emptyTitle')}</strong><button type="button" data-ops-action="clear-filters">${text('reset')}</button></div>`;
  }
  return `${count}<div class="eden-ops-op-grid">${matches.map(renderPlaybook).join('')}</div>`;
}

function chipGroup(kind, label, values) {
  return `<div class="eden-ops-chip-group" role="group" aria-label="${escapeHtml(label)}"><span>${label}</span>${['all', ...values]
    .map(
      (value) =>
        `<button type="button" data-ops-${kind}="${value}" aria-pressed="${boardFilter[kind] === value}">${value === 'all' ? text('filterAll') : text(`${kind}.${value}`)}</button>`
    )
    .join('')}</div>`;
}

function renderBoard() {
  // A collapsible board: returning planners can fold it away and keep the
  // calculators near the top; the choice is a per-viewer convenience.
  return `<details class="eden-ops-board" data-ops-board${boardOpen ? ' open' : ''}><summary><h3>${text('boardTitle')}</h3><span class="eden-ops-chevron" aria-hidden="true"></span></summary><div class="eden-ops-board-head"><label class="eden-ops-search"><span aria-hidden="true">⌕</span><input type="search" data-ops-search value="${escapeHtml(boardFilter.query)}" placeholder="${escapeHtml(text('searchLabel'))}…" aria-label="${escapeHtml(text('searchLabel'))}" autocomplete="off"></label><div class="eden-ops-filters">${chipGroup('stage', text('filterStage'), EDEN_OPERATION_STAGES)}${chipGroup('role', text('filterRole'), EDEN_OPERATION_ROLES)}</div></div><div class="eden-ops-board-list">${renderBoardList()}</div></details>`;
}

// Hub-wide labels ("VTS Eden Hub", the "SOON" badge) come from the site
// catalog, so this section and the hub's sub-tab bar always agree.
function siteText(key, fallback) {
  const catalog = globalThis.VTS_TRANSLATIONS || {};
  return (catalog[locale()] || catalog.en || {})[key] || fallback;
}

function renderMoreTools() {
  const mapText = (key) => escapeHtml(edenMapText(key, {}, locale()));
  return `<section class="eden-ops-more" aria-labelledby="edenOpsMoreTitle"><h3 id="edenOpsMoreTitle">${escapeHtml(siteText('tabEdenMap', 'VTS Eden Hub'))}</h3><div class="eden-ops-more-grid"><a class="eden-ops-more-card" href="#edenHub?subtab=map"><span aria-hidden="true">🗺️</span><strong>${mapText('subTabMap')}</strong></a><a class="eden-ops-more-card" href="#edenHub?subtab=loyalty"><span aria-hidden="true">🛡️</span><strong>${mapText('subTabLoyalty')}</strong></a><a class="eden-ops-more-card" href="#edenHub?subtab=pathing"><span aria-hidden="true">🧭</span><strong>${mapText('subTabPathing')}</strong><small>${mapText('subTabPathingDesc')}</small></a></div></section>`;
}

function renderSources() {
  return `<details class="eden-ops-sources"><summary>${text('sources')}</summary><div class="eden-ops-source-grid">${Object.values(EDEN_OPERATIONS_SOURCES).map((source) => `<a href="${escapeHtml(source.url || '#')}" target="_blank" rel="noreferrer"><strong>${escapeHtml(source.title)}</strong>${source.author ? `<em>${escapeHtml(source.author)}</em>` : ''}<span>${escapeHtml(sourceKindLabel(source.status))}</span></a>`).join('')}</div><ul>${SPECIALTY_DATA_GAPS.map((gap, index) => `<li>${escapeHtml(dataText(`gap.${index}`, gap))}</li>`).join('')}</ul><small>${text('dataset')} ${EDEN_OPERATIONS_DATA_VERSION}</small></details>`;
}

// Re-rendering replaces the markup, so remember which control had focus and
// hand it back; otherwise every counter or chip press drops keyboard focus.
const FOCUS_ATTRIBUTES = ['data-ops-check', 'data-ops-count', 'data-ops-milestone', 'data-ops-stage', 'data-ops-role', 'data-ops-action'];

function focusSelector() {
  const active = document.activeElement;
  if (!active || !mount?.contains(active)) return null;
  if (active.matches('.eden-ops-tool-nav [data-ops-tool]')) return `.eden-ops-tool-nav [data-ops-tool="${active.dataset.opsTool}"]`;
  const attribute = FOCUS_ATTRIBUTES.find((name) => active.hasAttribute(name));
  return attribute ? `[${attribute}="${active.getAttribute(attribute)}"]` : null;
}

function render() {
  if (!mount || !state) return;
  const refocus = focusSelector();
  mount.dir = locale() === 'ar' ? 'rtl' : 'ltr';
  const renderer = {
    specialty: renderSpecialty,
    honor: renderHonor,
    training: renderTraining,
    buildings: renderBuildings,
    siege: renderSiege,
  }[state.activeTool];
  mount.innerHTML = `<div class="eden-ops-shell">
    <header class="eden-ops-hero"><div><p class="eden-ops-kicker">${text('eyebrow')}</p><h2>${text('title')}</h2><p>${text('intro')}</p><ol class="eden-ops-how"><li>${text('how1')}</li><li>${text('how2')}</li><li>${text('how3')}</li></ol><span>${text('advisory')}</span></div><div class="eden-ops-plan-actions"><button data-ops-action="share">${text('share')}</button><button data-ops-action="export">${text('export')}</button><button data-ops-action="import">${text('import')}</button><button data-ops-action="reset">${text('reset')}</button><input data-ops-import type="file" accept="application/json,.json" hidden></div></header>
    ${renderBoard()}
    <nav class="eden-ops-tool-nav" role="tablist" aria-label="${text('toolNavLabel')}">${TOOL_META.map((tool) => `<button type="button" role="tab" aria-selected="${tool.id === state.activeTool}" class="${tool.id === state.activeTool ? 'active' : ''}" data-ops-tool="${tool.id}"><span aria-hidden="true">${tool.icon}</span>${text(tool.key)}</button>`).join('')}</nav>
    <div class="eden-ops-live sr-only" role="status" aria-live="polite"></div>
    ${renderer()}
    ${renderMoreTools()}
    ${renderSources()}
  </div>`;
  if (refocus) mount.querySelector(refocus)?.focus({ preventScroll: true });
}

function announce(message, type = 'info') {
  const live = mount?.querySelector('.eden-ops-live');
  if (live) live.textContent = message;
  globalThis.showToast?.(message, type, 2200);
}

function download(name, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function exportTable() {
  if (state.activeTool === 'honor') {
    return {
      name: 'eden-specialty-honor-1-143',
      columns: [
        { key: 'level', label: text('level') },
        { key: 'honor', label: text('honor') },
        { key: 'difference', label: text('difference') },
        { key: 'cumulative', label: text('cumulative') },
        { key: 'status', label: text('status') },
      ],
      rows: honorLevelRows(),
    };
  }
  if (state.activeTool === 'buildings') {
    const rows = Array.from({ length: 20 }, (_, index) => {
      const row = { level: index + 1 };
      for (const [id, costs] of Object.entries(BUILDING_UPGRADE_COSTS)) row[id] = costs[index];
      for (const discount of BUILDING_DISCOUNTS.slice(1)) {
        row[`workshop_${discount.id}`] = Math.ceil(BUILDING_UPGRADE_COSTS.workshop[index] * (1 - discount.rate));
        row[`fortress_${discount.id}`] = Math.ceil(BUILDING_UPGRADE_COSTS.fortress[index] * (1 - discount.rate));
      }
      return row;
    });
    return {
      name: 'eden-building-material-costs',
      columns: [
        { key: 'level', label: text('level') },
        ...Object.keys(BUILDING_UPGRADE_COSTS).map((key) => ({ key, label: buildingLabel(key) })),
        ...BUILDING_DISCOUNTS.slice(1).flatMap((discount) => [
          { key: `workshop_${discount.id}`, label: `${text('buildingWorkshop')} ${dataText(`discount.${discount.id}`, discount.label)}` },
          { key: `fortress_${discount.id}`, label: `${text('buildingFortress')} ${dataText(`discount.${discount.id}`, discount.label)}` },
        ]),
      ],
      rows,
    };
  }
  if (state.activeTool === 'training') {
    return {
      name: 'eden-honor-mode-comparison',
      columns: [
        { key: 'name', label: text('mode') },
        { key: 'honorPerAttack', label: text('perAttack') },
        { key: 'perSession', label: text('perSession') },
        { key: 'daily', label: text('daily') },
        { key: 'period', label: text('period') },
        { key: 'withSpecialty', label: text('boosted') },
      ],
      rows: calculateTrainingComparison(state.training).map((row) => ({ ...row, name: dataText(`mode.${row.id}`, row.name) })),
    };
  }
  if (state.activeTool === 'siege') {
    const order = calculateCampUpgradeOrder(state.siege);
    return {
      name: 'eden-tiling-upgrade-order',
      columns: [
        { key: 'campNumber', label: text('camp') },
        { key: 'level', label: text('upgradeTo') },
        { key: 'cost', label: text('baseCost') },
        { key: 'resultingLoyalty', label: text('resultingLoyalty') },
      ],
      rows: order.steps,
    };
  }
  const summary = specialtyAllocationSummary(state.specialty);
  return {
    name: 'eden-specialty-route-plan',
    columns: [
      { key: 'tree', label: text('tree') },
      { key: 'route', label: text('route') },
      { key: 'points', label: text('routePoints') },
      { key: 'critical', label: text('critical') },
      { key: 'essential', label: text('essential') },
      { key: 'advanced', label: text('advanced') },
    ],
    rows: SPECIALTY_TREE_SCHEMA.flatMap((tree) => tree.routes.map((route) => ({ tree: dataText(`tree.${tree.id}.name`, tree.name), route: dataText(`route.${route.id}.name`, route.name), points: summary.allocations[route.id] || 0, critical: route.critical, essential: route.essential, advanced: route.advanced }))),
  };
}

function downloadPng() {
  const table = exportTable();
  const rows = table.rows.slice(0, 30);
  const width = 1500;
  const rowHeight = 38;
  const height = 130 + (rows.length + 1) * rowHeight;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  context.fillStyle = '#07111f';
  context.fillRect(0, 0, width, height);
  context.fillStyle = '#e7f5ff';
  context.font = '700 28px system-ui';
  context.fillText(table.name.replaceAll('-', ' ').toUpperCase(), 30, 48);
  context.fillStyle = '#7dd3fc';
  context.font = '16px system-ui';
  context.fillText(`VTS Eden Operations · ${EDEN_OPERATIONS_DATA_VERSION}`, 30, 78);
  const colWidth = (width - 60) / table.columns.length;
  context.font = '600 14px system-ui';
  table.columns.forEach((column, index) => context.fillText(column.label.slice(0, 22), 30 + index * colWidth, 118));
  context.font = '14px system-ui';
  rows.forEach((row, rowIndex) => {
    context.fillStyle = rowIndex % 2 ? '#0f1f32' : '#0b1728';
    context.fillRect(20, 128 + rowIndex * rowHeight, width - 40, rowHeight);
    context.fillStyle = '#dbeafe';
    table.columns.forEach((column, colIndex) => {
      const value = row[column.key];
      context.fillText(String(value ?? '—').slice(0, 24), 30 + colIndex * colWidth, 153 + rowIndex * rowHeight);
    });
  });
  const link = document.createElement('a');
  link.download = `${table.name}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

async function copyShareLink() {
  const url = new URL(window.location.href);
  const params = new URLSearchParams(url.hash.split('?')[1] || '');
  params.set('subtab', 'operations');
  params.set('tool', state.activeTool);
  params.set('plan', encodeEdenOperationsState(state));
  url.hash = `edenHub?${params.toString()}`;
  await navigator.clipboard.writeText(url.toString());
  history.replaceState(history.state, '', url);
  announce(text('shareCopied'), 'success');
}

function bindEvents() {
  mount.addEventListener('click', async (event) => {
    const tool = event.target.closest('[data-ops-tool]');
    if (tool) {
      state.activeTool = tool.dataset.opsTool;
      writeEdenOperationsState(state);
      updateHashTool(state.activeTool);
      if (tool.dataset.opsOpen) openSteps.add(tool.dataset.opsOpen);
      render();
      // Opening from a card moves focus (and the view) to the planner's tab.
      if (tool.dataset.opsOpen) mount.querySelector(`.eden-ops-tool-nav [data-ops-tool="${state.activeTool}"]`)?.focus();
      return;
    }
    const filter = event.target.closest('[data-ops-stage], [data-ops-role]');
    if (filter) {
      const kind = filter.hasAttribute('data-ops-stage') ? 'stage' : 'role';
      boardFilter[kind] = filter.getAttribute(`data-ops-${kind}`);
      render();
      return;
    }
    const milestone = event.target.closest('[data-ops-milestone]');
    if (milestone) {
      const [routeId, points] = milestone.dataset.opsMilestone.split(':');
      state.specialty.allocations[routeId] = Number(points);
      saveAndRender();
      return;
    }
    const counter = event.target.closest('[data-ops-count]');
    if (counter) {
      const [side, delta] = counter.dataset.opsCount.split(':');
      state.siege.assigned[side] = (state.siege.assigned[side] || 0) + Number(delta);
      saveAndRender();
      return;
    }
    const action = event.target.closest('[data-ops-action]')?.dataset.opsAction;
    if (!action) return;
    if (action === 'clear-filters') {
      Object.assign(boardFilter, { stage: 'all', role: 'all', query: '' });
      render();
      mount.querySelector('[data-ops-search]')?.focus();
      return;
    }
    if (action === 'share') await copyShareLink();
    if (action === 'export') download('eden-operations-plan.json', JSON.stringify(state, null, 2), 'application/json');
    if (action === 'import') mount.querySelector('[data-ops-import]')?.click();
    if (action === 'reset') {
      state = normalizeEdenOperationsState();
      saveAndRender();
      announce(text('resetDone'), 'success');
    }
    if (action === 'csv') {
      const table = exportTable();
      download(`${table.name}.csv`, rowsToCsv(table.rows, table.columns), 'text/csv;charset=utf-8');
    }
    if (action === 'png') downloadPng();
  });

  mount.addEventListener('input', (event) => {
    if (!event.target.matches('[data-ops-search]')) return;
    boardFilter.query = event.target.value;
    // Only the result list changes, so the search box keeps focus and caret.
    const list = mount.querySelector('.eden-ops-board-list');
    if (list) list.innerHTML = renderBoardList();
  });

  mount.addEventListener(
    'toggle',
    (event) => {
      if (event.target.hasAttribute?.('data-ops-board')) {
        boardOpen = event.target.open;
        writeBoardOpen(boardOpen);
        return;
      }
      const id = event.target.dataset?.opsSteps;
      if (!id) return;
      if (event.target.open) openSteps.add(id);
      else openSteps.delete(id);
    },
    true
  );

  mount.addEventListener('change', (event) => {
    const input = event.target;
    if (input.matches('[data-ops-check]')) {
      const key = input.dataset.opsCheck;
      if (input.checked) state.checklist[key] = true;
      else delete state.checklist[key];
      saveAndRender();
      return;
    }
    if (input.matches('[data-ops-field]')) {
      const raw = input.type === 'checkbox' ? input.checked : input.value;
      setNested(input.dataset.opsField, raw, input.type);
      saveAndRender();
      return;
    }
    if (input.matches('[data-ops-route]')) {
      state.specialty.allocations[input.dataset.opsRoute] = Number(input.value);
      saveAndRender();
      return;
    }
    if (input.matches('[data-ops-import]') && input.files?.[0]) {
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        try {
          state = normalizeEdenOperationsState(JSON.parse(String(reader.result)));
          saveAndRender();
          announce(text('importDone'), 'success');
        } catch {
          announce(text('invalidImport'), 'error');
        }
      });
      reader.readAsText(input.files[0]);
    }
  });

  mount.addEventListener('keydown', (event) => {
    const current = event.target.closest('.eden-ops-tool-nav [data-ops-tool]');
    if (!current || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    const buttons = [...mount.querySelectorAll('.eden-ops-tool-nav [data-ops-tool]')];
    // In RTL the visual order flips, so the arrow keys flip with it.
    const forward = event.key === (mount.dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight');
    const direction = forward ? 1 : -1;
    buttons[(buttons.indexOf(current) + direction + buttons.length) % buttons.length].focus();
  });
}

function readShareState() {
  try {
    const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
    const shared = params.get('plan');
    if (shared) return decodeEdenOperationsState(shared);
    const tool = params.get('tool');
    const saved = readEdenOperationsState();
    if (TOOL_META.some((entry) => entry.id === tool)) saved.activeTool = tool;
    return saved;
  } catch {
    return readEdenOperationsState();
  }
}

export function initEdenOperations(root = document.getElementById('edenOperationsRoot')) {
  if (!root || root.dataset.edenOperationsBooted === '1') return;
  mount = root;
  root.dataset.edenOperationsBooted = '1';
  state = readShareState();
  boardOpen = readBoardOpen();
  // Start with the open planner's checklist expanded; the rest stay scannable.
  for (const entry of EDEN_OPERATION_PLAYBOOKS) {
    if (entry.tool === state.activeTool) openSteps.add(entry.id);
  }
  booted = true;
  bindEvents();
  render();
  // Paint English immediately, then repaint once the viewer's pack arrives.
  void ensureCopy().then(() => booted && render());
  window.addEventListener('edenLanguageUpdate', () => booted && render());
  window.addEventListener('vts:language-change', async () => {
    await ensureCopy();
    if (booted) render();
  });
}
