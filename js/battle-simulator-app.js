import {
  BATTLE_STAT_KEYS,
  BATTLE_ROWS,
  DEFAULT_TROOPS,
  STAT_INPUT_MODES,
  TROOP_TIERS,
  TROOP_TYPES,
  UNIT_STAT_KEYS,
  calculateTroopStats,
  getTroopProfile,
} from './battle-simulator-data.js';
import {
  BATTLE_BATCH_PRESETS,
  BATTLE_MODEL_ASSUMPTIONS,
  BATTLE_MODEL_VERSION,
  simulateBattle,
  simulateBattleBatch,
} from './battle-simulator-engine.js';
import {
  buildBattleCalibrationFixture,
  buildBattleDebugSnapshot,
  buildBattleEventLogCsv,
  buildBattleJsonExport,
  buildBattleSummaryCsv,
  makeBattleExportFilename,
} from './battle-simulator-export.js';
import {
  BATTLE_SETUP_PRESET_STORAGE_KEY,
  MAX_BATTLE_SETUP_PRESETS,
  deleteBattleSetupPreset,
  normalizeBattleSetupPresetName,
  parseBattleSetupPresetStore,
  upsertBattleSetupPreset,
} from './battle-simulator-preset-store.js';
import {
  applySetupSnapshot,
  buildSetupSnapshot,
  parseSetupSnapshot,
} from './battle-simulator-setup.js';
import {
  BATTLE_SIMULATOR_LANGUAGE_OPTIONS,
  applyBattleSimulatorDocumentLocale,
  createBattleSimulatorTranslator,
  loadBattleSimulatorLocale,
  normalizeBattleSimulatorLocale,
  writePreferredBattleSimulatorLocale,
} from './battle-simulator-i18n.js';
import {
  cloneEquipmentLoadout,
  createDefaultEquipmentLoadout,
  createEquipmentSetLoadout,
  resolveEquipmentLoadout,
} from './battle-simulator-equipment.js';
import { EQUIPMENT_CATALOG, EQUIPMENT_GRADE_IDS } from './battle-simulator-equipment-catalog.js';
import {
  buildBattleResearchSnapshot,
  createEmptyResearchSnapshot,
} from './battle-simulator-research.js';

const APP_VERSION = '14.1.6';
const THEME_STORAGE_KEY = 'vts_theme';
const SIDE_IDS = ['A', 'B'];
const STAT_DISPLAY_ORDER = [
  'might',
  'resistance',
  'hp',
  'damage',
  'damageMitigation',
  'combatSpeed',
  'tacticalMight',
  'tacticalResistance',
];
const TACTICAL_STATS = new Set(['tacticalMight', 'tacticalResistance']);
const INVALID_CONTROL_SELECTOR = 'input:invalid, select:invalid, textarea:invalid';
const VISIBLE_EVENT_LIMIT = 300;

let root = null;
let form = null;
let state = createInitialState();
let lastRun = null;
let setupRevision = 0;
let presetStore = {};
let translator = createBattleSimulatorTranslator('en');

const t = (id, values = {}) => translator.t(id, values);
const plural = (id, count, values = {}) => translator.plural(id, count, values);
const formatNumber = (value, options = {}) => translator.number(value, options);
const formatInteger = (value) => formatNumber(value, { maximumFractionDigits: 0 });
const formatPercent = (value) =>
  formatNumber(value, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const NUMBER_FORMAT = Object.freeze({
  format: (value) => formatNumber(value, { maximumFractionDigits: 2 }),
});
const INTEGER_FORMAT = Object.freeze({ format: (value) => formatInteger(value) });
const PERCENT_FORMAT = Object.freeze({ format: (value) => formatPercent(value) });
const preferredScrollBehavior = () =>
  globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';

function emptyStats(value = 0) {
  return Object.fromEntries(BATTLE_STAT_KEYS.map((key) => [key, value]));
}

function finalStatsDefaults() {
  return { ...emptyStats(0), might: 100, resistance: 100, hp: 100 };
}

function createRow(type, tier, index) {
  const unit = getTroopProfile(type, tier).unitStats;
  return {
    id: BATTLE_ROWS[index].id,
    type,
    tier,
    troops: DEFAULT_TROOPS,
    unitValues: { ...unit },
    bonuses: emptyStats(0),
    finals: finalStatsDefaults(),
    open: index === 0,
    customized: false,
  };
}

function editableFields(source) {
  return {
    type: source.type,
    tier: source.tier,
    troops: source.troops,
    unitValues: { ...source.unitValues },
    bonuses: { ...source.bonuses },
    finals: { ...source.finals },
  };
}

function editableFieldsMatch(left, right) {
  return (
    left.type === right.type &&
    left.tier === right.tier &&
    left.troops === right.troops &&
    ['unitValues', 'bonuses', 'finals'].every((bucket) =>
      (bucket === 'unitValues' ? UNIT_STAT_KEYS : BATTLE_STAT_KEYS).every((key) => {
        if (!(key in left[bucket]) && !(key in right[bucket])) return true;
        return left[bucket][key] === right[bucket][key];
      })
    )
  );
}

function createSide(defaultType, tier, rowTypes, researchEnabled = false) {
  const sideDefaultRow = createRow(defaultType, tier, 0);
  return {
    mode: STAT_INPUT_MODES.ADD_BONUSES,
    researchEnabled,
    researchSnapshot: createEmptyResearchSnapshot(),
    equipmentLoadout: createDefaultEquipmentLoadout(),
    capturedSourceSnapshot: {
      schemaVersion: 1,
      sources: [],
      excludedSources: [],
      diagnostics: [],
      catalogRevisions: {},
    },
    sideDefaults: editableFields(sideDefaultRow),
    rows: rowTypes.map((type, index) => createRow(type, tier, index)),
  };
}

function createInitialState() {
  const sideTypes = ['footmen', 'cavalry', 'archers'];
  return {
    battleMode: 'pvp-field',
    iterations: 1,
    seed: 1097,
    strikeVariancePct: 5,
    sides: {
      A: createSide('footmen', 9, sideTypes, true),
      B: createSide('footmen', 10, sideTypes, false),
    },
  };
}

function requireSideId(sideId, label) {
  if (!SIDE_IDS.includes(sideId)) {
    throw new RangeError(`${label} must be Side A or Side B.`);
  }
}

function cloneBattleSide(side) {
  const clone =
    typeof structuredClone === 'function'
      ? structuredClone(side)
      : JSON.parse(JSON.stringify(side));
  clone.equipmentLoadout = cloneEquipmentLoadout(
    side.equipmentLoadout || createDefaultEquipmentLoadout()
  );
  return clone;
}

export function copyBattleSideSetup(sourceState, fromSide = 'A', toSide = 'B') {
  requireSideId(fromSide, 'Copy source');
  requireSideId(toSide, 'Copy target');
  if (fromSide === toSide) throw new RangeError('Copy source and target must be different sides.');
  const sides = Object.fromEntries(
    SIDE_IDS.map((sideId) => [sideId, cloneBattleSide(sourceState.sides[sideId])])
  );
  sides[toSide] = cloneBattleSide(sourceState.sides[fromSide]);
  return { ...sourceState, sides };
}

export function swapBattleSides(sourceState) {
  return {
    ...sourceState,
    sides: {
      A: cloneBattleSide(sourceState.sides.B),
      B: cloneBattleSide(sourceState.sides.A),
    },
  };
}

export function shouldDisableStrikeVariance(iterations, value) {
  const numericValue = Number(value);
  const matchesStep = Math.abs(numericValue * 10 - Math.round(numericValue * 10)) < 1e-9;
  const isValid =
    value !== '' &&
    value !== null &&
    value !== undefined &&
    Number.isFinite(numericValue) &&
    numericValue >= 0 &&
    numericValue <= 25 &&
    matchesStep;
  return Number(iterations) === 1 && isValid;
}

function equipmentGradesForSet(setId) {
  if (!setId) return EQUIPMENT_GRADE_IDS;
  const set = EQUIPMENT_CATALOG.sets.find((entry) => entry.id === setId);
  if (!set) return EQUIPMENT_GRADE_IDS;
  const piece = EQUIPMENT_CATALOG.pieces.find((entry) => entry.id === set.pieceIds[0]);
  return piece?.variants.map((variant) => variant.gradeId) || EQUIPMENT_GRADE_IDS;
}

function resolveSideEquipment(sideId) {
  const side = state.sides[sideId];
  return resolveEquipmentLoadout(side?.equipmentLoadout || createDefaultEquipmentLoadout());
}

function rebuildCapturedSourceSnapshot(sideId) {
  const side = state.sides[sideId];
  if (!side) return null;
  const research =
    side.researchSnapshot || createEmptyResearchSnapshot({ battleMode: state.battleMode });
  const equipment = resolveSideEquipment(sideId);
  const researchSources = side.researchEnabled ? [...(research.sources || [])] : [];
  const disabledResearch = side.researchEnabled
    ? []
    : (research.sources || []).map((source) => ({
        ...source,
        exclusionReason: 'research-disabled',
      }));
  const equipmentDiagnostics = [
    ...(equipment.warnings || []),
    ...(equipment.missingData || []),
  ].map((entry, index) => ({
    code: entry.code || 'equipment-data-incomplete',
    severity: 'warning',
    message: entry.message || t('equipment.partialWarning'),
    sourceId: entry.pieceId || entry.sourceId || `equipment:${index + 1}`,
  }));
  side.capturedSourceSnapshot = {
    schemaVersion: 1,
    sources: [...researchSources, ...(equipment.contributions || [])],
    excludedSources: [...(research.excludedSources || []), ...disabledResearch],
    diagnostics: [...(research.diagnostics || []), ...equipmentDiagnostics],
    catalogRevisions: {
      research: research.catalogVersion || null,
      equipment: equipment.catalogRevision || null,
    },
  };
  return equipment;
}

function captureSavedResearch(sideId) {
  const side = state.sides[sideId];
  if (!side) return;
  side.researchSnapshot = buildBattleResearchSnapshot({ battleMode: state.battleMode });
  rebuildCapturedSourceSnapshot(sideId);
}

function initializeFreshSourceState() {
  captureSavedResearch('A');
  rebuildCapturedSourceSnapshot('B');
}

function automaticSourcesForSide(sideId) {
  const side = state.sides[sideId];
  if (!side?.capturedSourceSnapshot) rebuildCapturedSourceSnapshot(sideId);
  return side?.capturedSourceSnapshot?.sources || [];
}

function sideHasPartialModel(sideId) {
  const side = state.sides[sideId];
  const equipment = resolveSideEquipment(sideId);
  const research = side?.researchSnapshot || createEmptyResearchSnapshot();
  const researchPartial =
    side?.researchEnabled &&
    ((research.excludedSources?.length || 0) > 0 ||
      (research.diagnostics || []).some((entry) => entry.severity !== 'info'));
  return researchPartial || !['none', 'complete'].includes(equipment.completeness);
}

function icon(name) {
  const paths = {
    back: '<path stroke-linecap="round" stroke-linejoin="round" d="m15 18-6-6 6-6"/>',
    moon: '<path stroke-linecap="round" stroke-linejoin="round" d="M21 12.8A8.5 8.5 0 1 1 11.2 3 6.6 6.6 0 0 0 21 12.8Z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path stroke-linecap="round" d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/>',
    warning:
      '<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v4m0 4h.01M10.3 3.8 2.4 17.5A1.7 1.7 0 0 0 3.9 20h16.2a1.7 1.7 0 0 0 1.5-2.5L13.7 3.8a2 2 0 0 0-3.4 0Z"/>',
    chevron: '<path stroke-linecap="round" stroke-linejoin="round" d="m6 9 6 6 6-6"/>',
    play: '<path stroke-linecap="round" stroke-linejoin="round" d="m8 5 11 7-11 7V5Z"/>',
  };
  return `<svg aria-hidden="true" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">${paths[name] || ''}</svg>`;
}

function pageTemplate() {
  return `
    <a class="battle-skip-link" href="#battleSimulatorMain">${t('nav.skip')}</a>
    <div class="battle-app-shell">
      <header class="battle-topbar" aria-label="${t('hero.title')}">
        <a class="battle-brand" href="index.html" aria-label="${t('nav.brand')}">
          <img src="images/logo-120.webp" alt="" width="48" height="48" />
          <span class="battle-brand-copy">
            <strong>VTS 1097</strong>
            <small>${t('nav.labVersion', { version: APP_VERSION })}</small>
          </span>
        </a>
        <div class="battle-topbar-actions">
          <label class="battle-language-field">
            <span>${t('language.label')}</span>
            <select name="battleLanguage" data-battle-language autocomplete="off" aria-label="${t('language.label')}">
              ${BATTLE_SIMULATOR_LANGUAGE_OPTIONS.map(
                ({ id, label, short }) =>
                  `<option value="${id}" ${id === translator.locale ? 'selected' : ''}>${short} · ${label}</option>`
              ).join('')}
            </select>
          </label>
          <button id="battleThemeToggle" class="battle-icon-button" type="button" aria-label="${t('theme.toLight')}" aria-pressed="false">
            <span data-theme-icon="dark">${icon('moon')}</span>
            <span data-theme-icon="light" hidden>${icon('sun')}</span>
          </button>
          <a class="battle-back-link" href="index.html">${icon('back')}<span>${t('nav.back')}</span></a>
        </div>
      </header>

      <main id="battleSimulatorMain" class="battle-main">
        <section class="battle-hero" aria-labelledby="battleSimulatorTitle">
          <div>
            <p class="battle-eyebrow">${t('hero.eyebrow')}</p>
            <div class="battle-title-row">
              <h1 id="battleSimulatorTitle" tabindex="-1">${t('hero.title')}</h1>
              <span class="battle-beta-badge">${t('hero.beta')}</span>
            </div>
            <p class="battle-hero-copy">${t('hero.copy')}</p>
          </div>
          <div class="battle-phase-chips" aria-label="${t('hero.eyebrow')}">
            <span class="battle-status-chip">${t('hero.chipTroops')}</span>
            <span class="battle-status-chip">${t('hero.chipSeed')}</span>
            <span class="battle-status-chip">${t('hero.chipSources')}</span>
          </div>
        </section>

        <aside class="battle-foundation-note" aria-label="${t('notice.title')}">
          ${icon('warning')}
          <div>
            <strong>${t('notice.title')}</strong>
            <p>${t('notice.copy')}</p>
          </div>
        </aside>

        <details class="battle-assumptions battle-log-details">
          <summary><span>${t('model.summary')}</span><span>${t('model.version', { version: BATTLE_MODEL_VERSION })}</span></summary>
          <div class="battle-assumptions-body">
            <ul>
              ${Array.from({ length: 8 }, (_, index) => `<li>${t(`model.rule${index + 1}`, { rounds: BATTLE_MODEL_ASSUMPTIONS.maxRounds })}</li>`).join('')}
            </ul>
          </div>
        </details>

        <form id="battleSimulatorForm" class="battle-simulator-form" novalidate>
          ${renderRunPanel()}
          ${renderSetupToolbar()}
          <div id="battleFormations" class="battle-formations">
            ${renderSide('A')}
            ${renderSide('B')}
          </div>
          <div id="battleValidationSummary" class="battle-validation-summary" role="alert" hidden></div>
          <div class="battle-form-actions">
            <div class="battle-run-status" aria-live="polite" data-run-status></div>
            <div class="battle-result-actions">
              <button class="battle-secondary-button" type="button" data-battle-reset>${t('action.reset')}</button>
              <button class="battle-primary-button" type="submit" data-battle-run>${icon('play')}<span>${plural('run.button', 1)}</span></button>
            </div>
          </div>
        </form>

        <section id="battleResults" class="battle-results" aria-labelledby="battleResultsTitle" hidden></section>
      </main>

      <footer class="battle-footer">
        <span>${t('footer.version', { version: APP_VERSION })}</span>
        <span>${t('footer.disclaimer')}</span>
      </footer>
    </div>
    <div class="battle-toast-region" aria-live="polite" aria-atomic="true"></div>`;
}

function renderRunPanel() {
  return `
    <section class="battle-run-panel" aria-labelledby="battleRunSetupTitle">
      <div class="battle-panel-heading">
        <p class="battle-section-kicker">${t('run.kicker')}</p>
        <h2 id="battleRunSetupTitle">${t('run.title')}</h2>
        <p>${t('run.copy')}</p>
      </div>
      <fieldset class="battle-run-count">
        <legend>${t('run.simulations')}</legend>
        <div class="battle-run-options">
          ${BATTLE_BATCH_PRESETS.map(
            (count) => `
              <label class="battle-run-option">
                <input type="radio" name="battleIterations" value="${count}" ${count === state.iterations ? 'checked' : ''} />
                <span>${formatInteger(count)}<small>${count === 1 ? t('run.exact') : t('run.runs')}</small></span>
              </label>`
          ).join('')}
        </div>
      </fieldset>
      <div class="battle-run-advanced">
        <label class="battle-field">
          <span>${t('run.seed')}</span>
          <input name="battleSeed" type="number" min="0" max="4294967295" step="1" value="${state.seed}" inputmode="numeric" autocomplete="off" required />
          <small class="battle-field-hint">${t('run.seedHint')}</small>
        </label>
        <label class="battle-field">
          <span>${t('run.variance')}</span>
          <span class="battle-input-suffix">
            <input name="battleVariance" type="number" min="0" max="25" step="0.1" value="${state.strikeVariancePct}" inputmode="decimal" autocomplete="off" required disabled />
            <span>%</span>
          </span>
          <small class="battle-field-hint">${t('run.varianceHint')}</small>
        </label>
      </div>
    </section>`;
}

function renderSetupToolbar() {
  return `
    <section class="battle-setup-toolbar" aria-labelledby="battleSetupToolbarTitle">
      <div class="battle-panel-heading">
        <p class="battle-section-kicker">${t('setup.kicker')}</p>
        <h2 id="battleSetupToolbarTitle" tabindex="-1">${t('setup.title')}</h2>
        <p>${t('setup.copy')}</p>
      </div>
      <div class="battle-setup-actions" aria-label="${t('setup.fileActions')}">
        <button class="battle-secondary-button battle-side-action-button" type="button" data-copy-side-a-to-b>${t('setup.copySide')}</button>
        <button class="battle-secondary-button battle-side-action-button" type="button" data-swap-sides>${t('setup.swap')}</button>
        <button class="battle-secondary-button" type="button" data-setup-export>${t('setup.export')}</button>
        <label class="battle-file-button">
          <span>${t('setup.import')}</span>
          <input name="battleSetupFile" data-setup-file type="file" accept=".json,application/json" autocomplete="off" />
        </label>
      </div>
      <div class="battle-preset-controls">
        <label class="battle-field battle-preset-name-field">
          <span>${t('setup.presetName')}</span>
          <input name="battlePresetName" data-preset-name type="text" minlength="1" maxlength="40" autocomplete="off" placeholder="${t('setup.presetPlaceholder')}" />
        </label>
        <button class="battle-secondary-button" type="button" data-preset-save>${t('setup.savePreset')}</button>
        <label class="battle-field battle-preset-select-field">
          <span>${t('setup.savedPresets')}</span>
          <select name="battlePreset" data-preset-select autocomplete="off" aria-label="${t('setup.savedPresets')}">
            <option value="">${t('setup.choosePreset')}</option>
          </select>
        </label>
        <button class="battle-secondary-button" type="button" data-preset-load disabled>${t('setup.load')}</button>
        <button class="battle-text-button battle-danger-text-button" type="button" data-preset-delete disabled>${t('setup.delete')}</button>
      </div>
      <p class="battle-setup-hint">${t('setup.presetHint', { count: MAX_BATTLE_SETUP_PRESETS })}</p>
      <details class="battle-paste-setup">
        <summary>${t('setup.paste')}</summary>
        <div class="battle-paste-setup-body">
          <label class="battle-field">
            <span>${t('setup.json')}</span>
            <textarea name="battleSetupJson" data-setup-json rows="7" spellcheck="false" autocomplete="off" placeholder="${t('setup.jsonPlaceholder')}"></textarea>
          </label>
          <button class="battle-secondary-button" type="button" data-setup-import-paste>${t('setup.importPasted')}</button>
        </div>
      </details>
    </section>`;
}

const EQUIPMENT_SET_OPTIONS = Object.freeze([
  Object.freeze({ id: 'normal.ranger', labelKey: 'equipment.ranger' }),
  Object.freeze({ id: 'normal.dreadnaught', labelKey: 'equipment.dreadnaught' }),
  Object.freeze({ id: 'normal.steel-cavalry', labelKey: 'equipment.steelCavalry' }),
  Object.freeze({ id: 'dragon-master', labelKey: 'equipment.dm' }),
]);

function equipmentCompletenessKey(completeness) {
  if (completeness === 'identity-only') return 'equipment.identityOnly';
  if (completeness === 'partial') return 'equipment.partial';
  if (completeness === 'complete') return 'equipment.complete';
  if (completeness === 'unresolved') return 'equipment.unresolved';
  return 'equipment.none';
}

function renderLegionSources(sideId) {
  const side = state.sides[sideId];
  const research = side.researchSnapshot || createEmptyResearchSnapshot();
  const equipment = rebuildCapturedSourceSnapshot(sideId) || resolveSideEquipment(sideId);
  const loadout = equipment.loadout || createDefaultEquipmentLoadout();
  const selectedSet = loadout.setId || '';
  const selectedPiece = loadout.pieces?.[0] || null;
  const selectedGrade = selectedPiece?.gradeId || 'gold';
  const enhancementLevel = selectedPiece?.enhancementLevel || 0;
  const grades = equipmentGradesForSet(selectedSet);
  const researchCount = research.sources?.length || 0;
  const excludedCount = research.excludedSources?.length || 0;
  const researchStatus = !side.researchEnabled
    ? t('research.disabled')
    : research.savedProgress?.exists
      ? t('research.synced')
      : t('research.none');
  const pieceCount = loadout.pieces?.length || 0;
  const missingSlots = new Set(
    (equipment.missingData || []).map((entry) => entry.slotId).filter(Boolean)
  );
  const knownPieces =
    equipment.completeness === 'complete'
      ? pieceCount
      : Math.max(0, pieceCount - missingSlots.size);
  const equipmentWarning =
    equipment.completeness === 'identity-only'
      ? t('equipment.identityWarning')
      : equipment.completeness === 'partial' || equipment.completeness === 'unresolved'
        ? t('equipment.partialWarning')
        : t('equipment.noneHint');

  return `
    <section class="battle-legion-sources" aria-labelledby="side${sideId}SourcesTitle">
      <div class="battle-source-section-heading">
        <div>
          <p class="battle-section-kicker">${t('sources.title')}</p>
          <h3 id="side${sideId}SourcesTitle">${t('sources.title')}</h3>
        </div>
        <p>${t('sources.wholeLegion')}</p>
      </div>
      <div class="battle-legion-source-grid">
        <article class="battle-source-card" data-research-card="${sideId}">
          <div class="battle-source-card-heading">
            <div>
              <span class="battle-source-overline">${t('status.research')}</span>
              <h4>${t('research.title')}</h4>
            </div>
            <span class="battle-source-status ${side.researchEnabled && research.savedProgress?.exists ? 'is-active' : ''}">
              ${researchStatus}
            </span>
          </div>
          <label class="battle-source-toggle">
            <input name="side${sideId}ResearchEnabled" type="checkbox" data-research-enabled="${sideId}" autocomplete="off" ${side.researchEnabled ? 'checked' : ''} />
            <span>${t('research.enabled')}</span>
          </label>
          <div class="battle-source-card-metrics">
            <strong>${plural('research.known', researchCount)}</strong>
            <span>${excludedCount > 0 ? plural('research.excluded', excludedCount) : t('status.noIssues')}</span>
          </div>
          <p class="battle-source-help">${research.savedProgress?.exists ? t('research.synced') : t('research.emptyHint')}</p>
          ${side.mode === STAT_INPUT_MODES.FINAL_TOTALS ? `<p class="battle-inline-warning">${t('research.excludedFinal')}</p>` : ''}
          <button class="battle-secondary-button battle-compact-button" type="button" data-refresh-research="${sideId}" aria-label="${t('research.refreshAria', { side: sideId })}">${t('research.refresh')}</button>
        </article>

        <article class="battle-source-card" data-equipment-card="${sideId}">
          <div class="battle-source-card-heading">
            <div>
              <span class="battle-source-overline">${t('equipment.wholeLegion')}</span>
              <h4>${t('equipment.title')}</h4>
            </div>
            <span class="battle-source-status ${equipment.completeness === 'complete' ? 'is-active' : 'is-partial'}">${t(equipmentCompletenessKey(equipment.completeness))}</span>
          </div>
          <div class="battle-equipment-controls">
            <label class="battle-field">
              <span>${t('equipment.set')}</span>
              <select name="side${sideId}EquipmentSet" data-equipment-set="${sideId}" autocomplete="off" aria-label="${t('equipment.select', { side: sideId })}">
                <option value="">${t('equipment.none')}</option>
                ${EQUIPMENT_SET_OPTIONS.map(({ id, labelKey }) => `<option value="${id}" ${id === selectedSet ? 'selected' : ''}>${t(labelKey)}</option>`).join('')}
              </select>
            </label>
            <label class="battle-field">
              <span>${t('equipment.grade')}</span>
              <select name="side${sideId}EquipmentGrade" data-equipment-grade="${sideId}" autocomplete="off" ${selectedSet ? '' : 'disabled'}>
                ${grades.map((grade) => `<option value="${grade}" ${grade === selectedGrade ? 'selected' : ''}>${t(`equipment.grade.${grade}`)}</option>`).join('')}
              </select>
            </label>
            <label class="battle-field">
              <span>${t('equipment.enhancement')}</span>
              <span class="battle-input-prefix"><span>+</span><input name="side${sideId}EquipmentEnhancement" data-equipment-enhancement="${sideId}" type="number" min="0" max="100" step="1" inputmode="numeric" autocomplete="off" value="${enhancementLevel}" ${selectedSet ? '' : 'disabled'} /></span>
            </label>
          </div>
          <div class="battle-source-card-metrics">
            <strong>${pieceCount ? t('equipment.knownPieces', { known: knownPieces, total: pieceCount }) : t('equipment.none')}</strong>
            <span>${equipment.activeSkills?.length ? formatInteger(equipment.activeSkills.length) : t('equipment.setSkillPending')}</span>
          </div>
          <p class="battle-source-help ${equipment.completeness === 'identity-only' || equipment.completeness === 'partial' || equipment.completeness === 'unresolved' ? 'battle-inline-warning' : ''}">${equipmentWarning}</p>
        </article>
      </div>
    </section>`;
}

function renderSide(sideId) {
  const side = state.sides[sideId];
  const enteredLabel =
    side.mode === STAT_INPUT_MODES.ADD_BONUSES ? t('side.calculatedMode') : t('side.finalMode');
  return `
    <fieldset class="battle-side-panel" data-side="${sideId}">
      <legend class="battle-visually-hidden">${t('side.formation', { side: sideId })}</legend>
      <div class="battle-side-header">
        <div class="battle-side-heading">
          <p class="battle-side-kicker">${t('side.kicker', { side: sideId })}</p>
          <h2>${sideId === 'A' ? t('side.nameA') : t('side.nameB')}</h2>
          <p>${t('side.independent', { mode: enteredLabel })}</p>
        </div>
        <fieldset class="battle-mode-fieldset">
          <legend>${t('side.modeLegend', { side: sideId })}</legend>
          <div class="battle-mode-group">
            <label class="battle-mode-option">
              <input type="radio" name="side${sideId}Mode" value="${STAT_INPUT_MODES.ADD_BONUSES}" data-mode-side="${sideId}" ${side.mode === STAT_INPUT_MODES.ADD_BONUSES ? 'checked' : ''} />
              <span>${t('side.addSources')}</span>
            </label>
            <label class="battle-mode-option">
              <input type="radio" name="side${sideId}Mode" value="${STAT_INPUT_MODES.FINAL_TOTALS}" data-mode-side="${sideId}" ${side.mode === STAT_INPUT_MODES.FINAL_TOTALS ? 'checked' : ''} />
              <span>${t('side.finalTotals')}</span>
            </label>
          </div>
        </fieldset>
      </div>
      ${renderLegionSources(sideId)}
      ${renderSideDefaults(sideId)}
      <div class="battle-squad-list">
        ${side.rows.map((row, index) => renderRow(sideId, row, index)).join('')}
      </div>
    </fieldset>`;
}

function getEntityCalculation(sideId, entity, rowId = null) {
  const side = state.sides[sideId];
  const values = side.mode === STAT_INPUT_MODES.ADD_BONUSES ? entity.bonuses : entity.finals;
  if (
    BATTLE_STAT_KEYS.some((key) => values[key] === '' || !Number.isFinite(Number(values[key]))) ||
    UNIT_STAT_KEYS.some(
      (key) => entity.unitValues[key] === '' || !Number.isFinite(Number(entity.unitValues[key]))
    )
  ) {
    return null;
  }
  return calculateTroopStats({
    type: entity.type,
    tier: entity.tier,
    mode: side.mode,
    unitValues: entity.unitValues,
    values,
    sources: automaticSourcesForSide(sideId),
    context: {
      battleMode: state.battleMode,
      troopType: entity.type,
      rowId,
    },
  });
}

function getRowCalculation(sideId, row) {
  return getEntityCalculation(sideId, row, row.id);
}

function entitySummary(sideId, entity) {
  const calculation = getEntityCalculation(sideId, entity);
  if (!calculation) return t('validation.check');
  const battle = calculation.battle.totals;
  return `${t('stat.might')} ${formatStat(battle.might, 'might')} · ${t('stat.resistance')} ${formatStat(battle.resistance, 'resistance')} · ${t('stat.combatSpeed')} ${formatStat(battle.combatSpeed, 'combatSpeed')}`;
}

function rowSummary(sideId, row) {
  const calculation = getRowCalculation(sideId, row);
  if (!calculation) return t('validation.check');
  return `${t('stat.attack')} ${formatStat(calculation.effective.attack, 'attack')} · ${t('stat.defense')} ${formatStat(calculation.effective.defense, 'defense')} · ${t('stat.hp')} ${formatStat(calculation.effective.hp, 'unitHp')}`;
}

const CORE_STAT_NODES = Object.freeze([
  Object.freeze({ unitKey: 'attack', battleKey: 'might' }),
  Object.freeze({ unitKey: 'defense', battleKey: 'resistance' }),
  Object.freeze({ unitKey: 'hp', battleKey: 'hp' }),
]);

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function troopTypeLabel(type) {
  return t(`troop.${type}`);
}

function rowLabel(index) {
  return t(`row.${BATTLE_ROWS[index].id}`);
}

function profileLabel(entity) {
  return `${troopTypeLabel(entity.type)} T${entity.tier}`;
}

function statLabel(key, { battleHp = false } = {}) {
  if (key === 'hp' && battleHp) return t('stat.battleHp');
  return t(`stat.${key}`);
}

function formatStat(value, key, { empty = '—', showUnit = true } = {}) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return empty;
  const formatted = formatNumber(numeric, { maximumFractionDigits: 2 });
  if (!showUnit) return formatted;
  if (UNIT_STAT_KEYS.includes(key) || key === 'unitHp') return `${formatted} ${t('stat.points')}`;
  return key === 'combatSpeed' ? formatted : `${formatted}%`;
}

function sourceTypeLabel(sourceType) {
  if (sourceType === 'research') return t('stat.research');
  if (sourceType === 'equipment') return t('stat.equipment');
  if (sourceType === 'manual') return t('stat.manual');
  return sourceType ? escapeHtml(sourceType) : t('stat.automatic');
}

function sourceAmount(source) {
  const sign = source.amount > 0 ? '+' : '';
  return `${sign}${formatNumber(source.amount, { maximumFractionDigits: 2 })}${source.unit === 'percent' ? '%' : ''}`;
}

function renderStatSourceRows(calculation, battleKey, sideMode) {
  const rows = [];
  if (sideMode === STAT_INPUT_MODES.ADD_BONUSES) {
    rows.push(`
      <li class="battle-stat-source-row is-baseline">
        <span><strong>${t('stat.baseline')}</strong><small>${statLabel(battleKey, { battleHp: true })}</small></span>
        <output>${formatStat(calculation.battle.baseline[battleKey], battleKey)}</output>
      </li>`);
  } else {
    rows.push(`
      <li class="battle-stat-source-row is-override">
        <span><strong>${t('stat.override')}</strong><small>${t('stat.overrideHint')}</small></span>
        <output>${formatStat(calculation.battle.entered[battleKey], battleKey)}</output>
      </li>`);
  }

  const included = calculation.battle.includedSources
    .filter((source) => source.statKey === battleKey)
    .sort(
      (left, right) =>
        ['research', 'equipment', 'manual'].indexOf(left.sourceType) -
          ['research', 'equipment', 'manual'].indexOf(right.sourceType) ||
        left.label.localeCompare(right.label)
    );
  for (const source of included) {
    rows.push(`
      <li class="battle-stat-source-row" data-source-type="${escapeHtml(source.sourceType)}">
        <span><strong>${escapeHtml(source.label)}</strong><small>${sourceTypeLabel(source.sourceType)}</small></span>
        <output>${sourceAmount(source)}</output>
      </li>`);
  }

  const excluded = calculation.battle.excludedSources.filter(
    (source) => source.statKey === battleKey
  );
  for (const source of excluded) {
    rows.push(`
      <li class="battle-stat-source-row is-excluded" data-source-type="${escapeHtml(source.sourceType)}">
        <span><strong>${escapeHtml(source.label)}</strong><small>${t('stat.excluded')} · ${escapeHtml(source.exclusionReason || '')}</small></span>
        <output>${sourceAmount(source)}</output>
      </li>`);
  }

  return rows.join('');
}

function statInputAttributes(scope, kind, key) {
  if (kind === 'unit') {
    return scope === 'side-default'
      ? `data-side-default-unit-stat="${key}"`
      : `data-unit-stat-input="${key}"`;
  }
  return scope === 'side-default' ? `data-side-default-stat="${key}"` : `data-stat="${key}"`;
}

function statInputName(sideId, scope, entity, kind, key) {
  const target =
    scope === 'side-default' ? 'Defaults' : `${entity.id[0].toUpperCase()}${entity.id.slice(1)}`;
  const stat = `${key[0].toUpperCase()}${key.slice(1)}`;
  return `side${sideId}${target}${kind === 'unit' ? 'Unit' : 'Battle'}${stat}`;
}

function renderCoreStatNode(sideId, contextLabel, entity, calculation, core, scope) {
  const side = state.sides[sideId];
  const { unitKey, battleKey } = core;
  const entered = side.mode === STAT_INPUT_MODES.ADD_BONUSES ? entity.bonuses : entity.finals;
  const unitLabel = statLabel(unitKey);
  const battleLabel = statLabel(battleKey, { battleHp: true });
  const effective = calculation?.effective[unitKey];
  const battleTotal = calculation?.battle.totals[battleKey];
  const unitValue = entity.unitValues[unitKey];
  const maximum = 5000;
  return `
    <details class="battle-stat-node is-core" data-stat-node="${unitKey}" ${unitKey === 'attack' ? 'open' : ''}>
      <summary>
        <span><strong>${unitLabel}</strong><small>${battleLabel}</small></span>
        <output data-effective-stat="${unitKey}">${formatStat(effective, unitKey)}</output>
        <span class="battle-summary-chevron">${icon('chevron')}</span>
      </summary>
      <div class="battle-stat-node-body">
        <div class="battle-stat-equation" aria-label="${t('stat.equationAria', { base: formatNumber(unitValue), percent: formatNumber(battleTotal), effective: formatNumber(effective) })}">
          <label class="battle-stat-equation-term">
            <span>${t('stat.baseUnit', { stat: unitLabel })}</span>
            <input class="battle-stat-input" name="${statInputName(sideId, scope, entity, 'unit', unitKey)}" ${statInputAttributes(scope, 'unit', unitKey)} type="number" min="0" max="${maximum}" step="0.01" value="${unitValue}" inputmode="decimal" autocomplete="off" aria-label="${t('side.kicker', { side: sideId })} ${contextLabel} ${unitLabel}" required />
            <small>${t('stat.points')}</small>
          </label>
          <span class="battle-equation-operator" aria-hidden="true">×</span>
          <label class="battle-stat-equation-term">
            <span>${t('stat.battleTotal', { stat: battleLabel })}</span>
            <span class="battle-input-suffix">
              <input class="battle-stat-input" name="${statInputName(sideId, scope, entity, 'battle', battleKey)}" ${statInputAttributes(scope, 'battle', battleKey)} type="number" min="0" max="5000" step="0.01" value="${entered[battleKey]}" inputmode="decimal" autocomplete="off" aria-label="${t('side.kicker', { side: sideId })} ${contextLabel} ${battleLabel}" required />
              <span>${side.mode === STAT_INPUT_MODES.ADD_BONUSES ? '+' : ''}%</span>
            </span>
            <small>${side.mode === STAT_INPUT_MODES.ADD_BONUSES ? t('stat.manualHint') : t('stat.overrideHint')}</small>
          </label>
          <span class="battle-equation-operator" aria-hidden="true">=</span>
          <span class="battle-stat-equation-result">
            <span>${t('stat.effective', { stat: unitLabel })}</span>
            <output data-effective-stat="${unitKey}">${formatStat(effective, unitKey)}</output>
            <small><span data-resolved-unit="${unitKey}">${formatStat(calculation?.unit.resolved[unitKey], unitKey)}</span> × <span data-battle-total="${battleKey}">${formatStat(battleTotal, battleKey)}</span></small>
          </span>
        </div>
        <div class="battle-stat-source-breakdown" aria-label="${t('stat.sources', { stat: battleLabel })}">
          <div class="battle-stat-source-heading"><strong>${t('stat.sources', { stat: battleLabel })}</strong><span>${t('stat.knownOnly')}</span></div>
          <ul>${calculation ? renderStatSourceRows(calculation, battleKey, side.mode) : ''}</ul>
        </div>
      </div>
    </details>`;
}

function renderSecondaryStatNode(sideId, contextLabel, entity, calculation, key, scope) {
  const side = state.sides[sideId];
  const entered = side.mode === STAT_INPUT_MODES.ADD_BONUSES ? entity.bonuses : entity.finals;
  const label = statLabel(key, { battleHp: true });
  const inactive = TACTICAL_STATS.has(key);
  const maximum = key === 'combatSpeed' ? 10000 : 5000;
  return `
    <details class="battle-stat-node is-secondary" data-stat-node="${key}">
      <summary>
        <span><strong>${label}</strong>${inactive ? `<small class="battle-inactive-chip">${t('stat.future')}</small>` : ''}</span>
        <output data-battle-total="${key}">${formatStat(calculation?.battle.totals[key], key)}</output>
        <span class="battle-summary-chevron">${icon('chevron')}</span>
      </summary>
      <div class="battle-stat-node-body">
        <label class="battle-field battle-secondary-stat-input">
          <span>${side.mode === STAT_INPUT_MODES.ADD_BONUSES ? t('stat.manual') : t('stat.override')}</span>
          <span class="battle-input-suffix">
            <input class="battle-stat-input" name="${statInputName(sideId, scope, entity, 'battle', key)}" ${statInputAttributes(scope, 'battle', key)} type="number" min="0" max="${maximum}" step="0.01" value="${entered[key]}" inputmode="decimal" autocomplete="off" aria-label="${t('side.kicker', { side: sideId })} ${contextLabel} ${label}" required />
            <span>${key === 'combatSpeed' ? '' : '%'}</span>
          </span>
        </label>
        ${inactive ? `<p class="battle-stat-inactive-note">${t('stat.inactiveHint')}</p>` : ''}
        <div class="battle-stat-source-breakdown" aria-label="${t('stat.sources', { stat: label })}">
          <div class="battle-stat-source-heading"><strong>${t('stat.sources', { stat: label })}</strong><span>${t('stat.knownOnly')}</span></div>
          <ul>${calculation ? renderStatSourceRows(calculation, key, side.mode) : ''}</ul>
        </div>
      </div>
    </details>`;
}

function renderStatNodes(sideId, contextLabel, entity, calculation, scope) {
  const secondary = STAT_DISPLAY_ORDER.filter(
    (key) => !CORE_STAT_NODES.some((entry) => entry.battleKey === key)
  );
  return `
    <div class="battle-stat-node-groups">
      <section class="battle-stat-node-group" aria-label="${t('stat.coreGroup')}">
        <h4>${t('stat.coreGroup')}</h4>
        <div class="battle-stat-node-list">
          ${CORE_STAT_NODES.map((core) => renderCoreStatNode(sideId, contextLabel, entity, calculation, core, scope)).join('')}
        </div>
      </section>
      <section class="battle-stat-node-group" aria-label="${t('stat.secondaryGroup')}">
        <h4>${t('stat.secondaryGroup')}</h4>
        <div class="battle-stat-node-list battle-stat-secondary-list">
          ${secondary.map((key) => renderSecondaryStatNode(sideId, contextLabel, entity, calculation, key, scope)).join('')}
        </div>
      </section>
    </div>`;
}

function renderTroopControls(sideId, entity, scope, contextLabel) {
  const fieldPrefix = scope === 'side-default' ? 'data-side-default-field' : 'data-row-field';
  const target =
    scope === 'side-default' ? 'Defaults' : `${entity.id[0].toUpperCase()}${entity.id.slice(1)}`;
  return `
    <div class="battle-squad-controls">
      <label class="battle-field">
        <span>${t('field.troopType')}</span>
        <select name="side${sideId}${target}TroopType" ${fieldPrefix}="type" autocomplete="off" aria-label="${t('side.kicker', { side: sideId })} ${contextLabel} ${t('field.troopType')}">
          ${TROOP_TYPES.map((type) => `<option value="${type}" ${type === entity.type ? 'selected' : ''}>${troopTypeLabel(type)}</option>`).join('')}
        </select>
      </label>
      <label class="battle-field">
        <span>${t('field.tier')}</span>
        <select name="side${sideId}${target}Tier" ${fieldPrefix}="tier" autocomplete="off" aria-label="${t('side.kicker', { side: sideId })} ${contextLabel} ${t('field.tier')}">
          ${TROOP_TIERS.map((tier) => `<option value="${tier}" ${tier === entity.tier ? 'selected' : ''}>T${tier}</option>`).join('')}
        </select>
      </label>
      <label class="battle-field">
        <span>${t('field.troops')}</span>
        <input name="side${sideId}${target}Troops" ${fieldPrefix}="troops" type="number" min="0" max="10000000" step="1" value="${entity.troops}" inputmode="numeric" autocomplete="off" aria-label="${t('side.kicker', { side: sideId })} ${contextLabel} ${t('field.troops')}" required />
      </label>
    </div>`;
}

function renderSideDefaults(sideId) {
  const side = state.sides[sideId];
  const defaults = side.sideDefaults;
  const calculation = getEntityCalculation(sideId, defaults);
  return `
    <details class="battle-side-setup" data-side-defaults="${sideId}">
      <summary>
        <span>
          <strong>${t('rowDefaults.title')}</strong>
          <small>${t('rowDefaults.summary', { profile: profileLabel(defaults), troops: formatInteger(Number(defaults.troops) || 0), summary: entitySummary(sideId, defaults) })}</small>
        </span>
        <span class="battle-summary-chevron">${icon('chevron')}</span>
      </summary>
      <div class="battle-side-setup-body">
        ${renderTroopControls(sideId, defaults, 'side-default', t('rowDefaults.title'))}
        ${renderStatNodes(sideId, t('rowDefaults.title'), defaults, calculation, 'side-default')}
        <div class="battle-side-setup-footer">
          <p>${t('rowDefaults.warning')}</p>
          <button class="battle-secondary-button" type="button" data-apply-side-defaults="${sideId}">${t('rowDefaults.apply')}</button>
        </div>
      </div>
    </details>`;
}

function renderRow(sideId, row, index) {
  const contextLabel = rowLabel(index);
  const calculation = getRowCalculation(sideId, row);
  return `
    <details class="battle-squad-card" data-side="${sideId}" data-row-index="${index}" ${row.open ? 'open' : ''}>
      <summary class="battle-squad-summary">
        <span class="battle-row-marker">${index + 1}</span>
        <span class="battle-squad-summary-copy">
          <span class="battle-row-heading"><strong>${contextLabel} · ${profileLabel(row)}</strong><span class="battle-row-state" data-row-customized ${row.customized ? '' : 'hidden'}>${t('row.customized')}</span></span>
          <span data-row-summary>${formatInteger(Number(row.troops) || 0)} ${t('field.troops')} · ${rowSummary(sideId, row)}</span>
        </span>
        <span class="battle-summary-chevron">${icon('chevron')}</span>
      </summary>
      <div class="battle-squad-body">
        ${renderTroopControls(sideId, row, 'row', contextLabel)}
        ${renderStatNodes(sideId, contextLabel, row, calculation, 'row')}
        <div class="battle-row-footer">
          <p class="battle-tactical-note">${t('notice.copy')}</p>
          <button class="battle-text-button" type="button" data-reset-row-defaults ${row.customized ? '' : 'hidden'}>${t('row.reset')}</button>
        </div>
      </div>
    </details>`;
}

function getTheme() {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY) || localStorage.getItem('theme');
    return saved === 'light' ? 'light' : 'dark';
  } catch {
    return document.documentElement.hasAttribute('data-theme') ? 'light' : 'dark';
  }
}

function applyTheme(theme) {
  if (theme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
  document
    .getElementById('themeColorMeta')
    ?.setAttribute('content', theme === 'light' ? '#f8fafc' : '#0f172a');
  document
    .getElementById('manifestLink')
    ?.setAttribute('href', theme === 'light' ? 'site-light.webmanifest' : 'site.webmanifest');
  const button = root?.querySelector('#battleThemeToggle');
  button?.setAttribute('aria-pressed', String(theme === 'light'));
  button?.setAttribute('aria-label', theme === 'light' ? t('theme.toDark') : t('theme.toLight'));
  button?.querySelector('[data-theme-icon="dark"]')?.toggleAttribute('hidden', theme === 'light');
  button?.querySelector('[data-theme-icon="light"]')?.toggleAttribute('hidden', theme !== 'light');
}

function toggleTheme() {
  const next = getTheme() === 'light' ? 'dark' : 'light';
  try {
    localStorage.setItem(THEME_STORAGE_KEY, next);
    localStorage.removeItem('theme');
  } catch {}
  applyTheme(next);
}

function setRunControls() {
  const iterations = Number(form?.elements.battleIterations?.value || state.iterations);
  state.iterations = iterations;
  const variance = form?.elements.battleVariance;
  if (variance) variance.disabled = shouldDisableStrikeVariance(iterations, variance.value);
  const runButton = form?.querySelector('[data-battle-run] span');
  if (runButton) runButton.textContent = plural('run.button', iterations);
  updateRunBar();
}

function sideTroopTotal(sideId) {
  return state.sides[sideId].rows.reduce((total, row) => total + Number(row.troops || 0), 0);
}

function formatCompactTroops(value) {
  if (value >= 1_000_000) return `${NUMBER_FORMAT.format(value / 1_000_000)}m`;
  if (value < 1000) return INTEGER_FORMAT.format(value);
  return `${NUMBER_FORMAT.format(value / 1000)}k`;
}

function updateRunBar() {
  const status = form?.querySelector('[data-run-status]');
  if (!status) return;
  const invalidControls = Array.from(form.querySelectorAll(INVALID_CONTROL_SELECTOR));
  if (invalidControls.length > 0) {
    const counts = { A: 0, B: 0, setup: 0 };
    for (const control of invalidControls) {
      const sideId = control.closest('.battle-side-panel')?.dataset.side;
      if (sideId === 'A' || sideId === 'B') counts[sideId] += 1;
      else counts.setup += 1;
    }
    const groups = [
      counts.A ? `${t('side.kicker', { side: 'A' })}: ${formatInteger(counts.A)}` : '',
      counts.B ? `${t('side.kicker', { side: 'B' })}: ${formatInteger(counts.B)}` : '',
      counts.setup ? `${t('run.kicker')}: ${formatInteger(counts.setup)}` : '',
    ].filter(Boolean);
    const existingButton = status.querySelector('[data-focus-first-invalid]');
    const button = existingButton || document.createElement('button');
    if (!existingButton) {
      button.className = 'battle-run-invalid-button';
      button.type = 'button';
      button.dataset.focusFirstInvalid = '';
      button.append(document.createElement('strong'), document.createElement('span'));
      status.replaceChildren(button);
    }
    const label = button.querySelector('strong');
    const nextLabel = plural('validation.attention', invalidControls.length, {
      groups: groups.join(' · '),
    });
    if (label.textContent !== nextLabel) label.textContent = nextLabel;
    const groupedCounts = button.querySelector('span');
    const nextHint = t('validation.focus');
    if (groupedCounts.textContent !== nextHint) groupedCounts.textContent = nextHint;
    return;
  }

  const summary = document.createElement('strong');
  summary.className = 'battle-run-bar-summary';
  summary.textContent = `${t('status.troopTotal', { side: 'A', troops: formatCompactTroops(sideTroopTotal('A')) })} vs ${t('status.troopTotal', { side: 'B', troops: formatCompactTroops(sideTroopTotal('B')) })} · ${plural('status.runCount', Number(state.iterations))}`;
  const partial = sideHasPartialModel('A') || sideHasPartialModel('B');
  if (partial) {
    const warning = document.createElement('span');
    warning.className = 'battle-run-partial-status';
    warning.textContent = t('status.partial');
    status.replaceChildren(summary, warning);
  } else {
    status.replaceChildren(summary);
  }
}

function markResultsStale() {
  setupRevision += 1;
  lastRun = null;
  const results = root?.querySelector('#battleResults');
  if (results) {
    results.hidden = true;
    results.replaceChildren();
  }
  updateRunBar();
}

function refreshRow(sideId, rowIndex) {
  const row = state.sides[sideId].rows[rowIndex];
  const card = form?.querySelector(
    `.battle-squad-card[data-side="${sideId}"][data-row-index="${rowIndex}"]`
  );
  if (!card) return;
  const calculation = getRowCalculation(sideId, row);
  const strong = card.querySelector('.battle-squad-summary-copy strong');
  const summary = card.querySelector('[data-row-summary]');
  const customizedBadge = card.querySelector('[data-row-customized]');
  const resetButton = card.querySelector('[data-reset-row-defaults]');
  if (strong) strong.textContent = `${rowLabel(rowIndex)} · ${profileLabel(row)}`;
  if (summary)
    summary.textContent = `${formatInteger(Number(row.troops) || 0)} ${t('field.troops')} · ${rowSummary(sideId, row)}`;
  customizedBadge?.toggleAttribute('hidden', !row.customized);
  resetButton?.toggleAttribute('hidden', !row.customized);
  for (const key of UNIT_STAT_KEYS) {
    card.querySelectorAll(`[data-effective-stat="${key}"]`).forEach((output) => {
      output.textContent = calculation ? formatStat(calculation.effective[key], key) : '—';
    });
    const resolved = card.querySelector(`[data-resolved-unit="${key}"]`);
    if (resolved)
      resolved.textContent = calculation ? formatStat(calculation.unit.resolved[key], key) : '—';
    const input = card.querySelector(`[data-unit-stat-input="${key}"]`);
    if (input && document.activeElement !== input) input.value = row.unitValues[key];
  }
  for (const key of BATTLE_STAT_KEYS) {
    card.querySelectorAll(`[data-battle-total="${key}"]`).forEach((output) => {
      output.textContent = calculation ? formatStat(calculation.battle.totals[key], key) : '—';
    });
    const sourceList = card.querySelector(
      `[data-stat-node="${key === 'might' ? 'attack' : key === 'resistance' ? 'defense' : key === 'hp' ? 'hp' : key}"] .battle-stat-source-breakdown ul`
    );
    if (sourceList && calculation) {
      sourceList.innerHTML = renderStatSourceRows(calculation, key, state.sides[sideId].mode);
    }
  }
}

function refreshSideDefaults(sideId) {
  const side = state.sides[sideId];
  const defaults = side.sideDefaults;
  const panel = form?.querySelector(`[data-side-defaults="${sideId}"]`);
  if (!panel) return;
  const calculation = getEntityCalculation(sideId, defaults);
  const summary = panel.querySelector('summary small');
  if (summary) {
    summary.textContent = t('rowDefaults.summary', {
      profile: profileLabel(defaults),
      troops: formatInteger(Number(defaults.troops) || 0),
      summary: entitySummary(sideId, defaults),
    });
  }
  for (const key of UNIT_STAT_KEYS) {
    panel.querySelectorAll(`[data-effective-stat="${key}"]`).forEach((output) => {
      output.textContent = calculation ? formatStat(calculation.effective[key], key) : '—';
    });
    const resolved = panel.querySelector(`[data-resolved-unit="${key}"]`);
    if (resolved)
      resolved.textContent = calculation ? formatStat(calculation.unit.resolved[key], key) : '—';
    const input = panel.querySelector(`[data-side-default-unit-stat="${key}"]`);
    if (input && document.activeElement !== input) input.value = defaults.unitValues[key];
  }
  for (const key of BATTLE_STAT_KEYS) {
    panel.querySelectorAll(`[data-battle-total="${key}"]`).forEach((output) => {
      output.textContent = calculation ? formatStat(calculation.battle.totals[key], key) : '—';
    });
    const sourceList = panel.querySelector(
      `[data-stat-node="${key === 'might' ? 'attack' : key === 'resistance' ? 'defense' : key === 'hp' ? 'hp' : key}"] .battle-stat-source-breakdown ul`
    );
    if (sourceList && calculation) {
      sourceList.innerHTML = renderStatSourceRows(calculation, key, state.sides[sideId].mode);
    }
  }
}

function replaceSide(sideId) {
  const current = form?.querySelector(`.battle-side-panel[data-side="${sideId}"]`);
  if (!current) return;
  const sideSetupWasOpen = current.querySelector('[data-side-defaults]')?.open === true;
  current.outerHTML = renderSide(sideId);
  const replacement = form?.querySelector(`.battle-side-panel[data-side="${sideId}"]`);
  const replacementSetup = replacement?.querySelector('[data-side-defaults]');
  if (replacementSetup) replacementSetup.open = sideSetupWasOpen;
}

function replaceRow(sideId, rowIndex) {
  const current = form?.querySelector(
    `.battle-squad-card[data-side="${sideId}"][data-row-index="${rowIndex}"]`
  );
  if (!current) return;
  current.outerHTML = renderRow(sideId, state.sides[sideId].rows[rowIndex], rowIndex);
}

function switchSideMode(sideId, nextMode) {
  const side = state.sides[sideId];
  if (side.mode === nextMode) return;
  side.mode = nextMode;
  replaceSide(sideId);
  markResultsStale();
  requestAnimationFrame(() => {
    form
      ?.querySelector(`[data-mode-side="${sideId}"][value="${nextMode}"]`)
      ?.focus({ preventScroll: true });
  });
  showToast(
    nextMode === STAT_INPUT_MODES.ADD_BONUSES
      ? t('toast.modeSources', { side: sideId })
      : t('toast.modeFinal', { side: sideId })
  );
}

function updateResearchEnabled(sideId, enabled) {
  const side = state.sides[sideId];
  if (!side) return;
  side.researchEnabled = enabled;
  if (enabled) captureSavedResearch(sideId);
  else rebuildCapturedSourceSnapshot(sideId);
  replaceSide(sideId);
  markResultsStale();
  requestAnimationFrame(() => {
    form?.querySelector(`[data-research-enabled="${sideId}"]`)?.focus({ preventScroll: true });
  });
}

function refreshSavedResearch(sideId) {
  captureSavedResearch(sideId);
  replaceSide(sideId);
  markResultsStale();
  requestAnimationFrame(() => {
    form?.querySelector(`[data-refresh-research="${sideId}"]`)?.focus({ preventScroll: true });
  });
  showToast(t('toast.researchRefresh', { side: sideId }));
}

function updateEquipmentLoadout(sideId, changedControl) {
  const side = state.sides[sideId];
  if (!side) return;
  const panel = changedControl.closest(`[data-equipment-card="${sideId}"]`);
  const setId = panel?.querySelector(`[data-equipment-set="${sideId}"]`)?.value || '';
  if (!setId) {
    side.equipmentLoadout = createDefaultEquipmentLoadout();
  } else {
    const validGrades = equipmentGradesForSet(setId);
    const requestedGrade =
      panel?.querySelector(`[data-equipment-grade="${sideId}"]`)?.value || 'gold';
    const gradeId = validGrades.includes(requestedGrade) ? requestedGrade : 'gold';
    const rawEnhancement = panel?.querySelector(`[data-equipment-enhancement="${sideId}"]`)?.value;
    const enhancementLevel = Math.max(0, Math.min(100, Number(rawEnhancement) || 0));
    side.equipmentLoadout = createEquipmentSetLoadout({
      setId,
      gradeId,
      enhancementLevel,
    });
  }
  rebuildCapturedSourceSnapshot(sideId);
  replaceSide(sideId);
  markResultsStale();
  requestAnimationFrame(() => {
    const selector = changedControl.matches('[data-equipment-set]')
      ? `[data-equipment-set="${sideId}"]`
      : changedControl.matches('[data-equipment-grade]')
        ? `[data-equipment-grade="${sideId}"]`
        : `[data-equipment-enhancement="${sideId}"]`;
    form?.querySelector(selector)?.focus({ preventScroll: true });
  });
}

function handleRowControl(target) {
  const card = target.closest('.battle-squad-card');
  if (!card) return;
  const sideId = card.dataset.side;
  const rowIndex = Number(card.dataset.rowIndex);
  const row = state.sides[sideId]?.rows[rowIndex];
  if (!row) return;

  if (target.matches('[data-row-field="type"]')) {
    row.type = target.value;
    row.unitValues = { ...getTroopProfile(row.type, row.tier).unitStats };
  } else if (target.matches('[data-row-field="tier"]')) {
    row.tier = Number(target.value);
    row.unitValues = { ...getTroopProfile(row.type, row.tier).unitStats };
  } else if (target.matches('[data-row-field="troops"]')) {
    row.troops = target.value === '' ? '' : Number(target.value);
  } else if (target.matches('[data-unit-stat-input]')) {
    row.unitValues[target.dataset.unitStatInput] = target.value === '' ? '' : Number(target.value);
  } else if (target.matches('[data-stat]')) {
    const bucket =
      state.sides[sideId].mode === STAT_INPUT_MODES.ADD_BONUSES ? row.bonuses : row.finals;
    bucket[target.dataset.stat] = target.value === '' ? '' : Number(target.value);
  } else {
    return;
  }
  row.customized = !editableFieldsMatch(row, state.sides[sideId].sideDefaults);
  refreshRow(sideId, rowIndex);
  markResultsStale();
}

function handleSideDefaultControl(target) {
  const panel = target.closest('[data-side-defaults]');
  if (!panel) return false;
  const sideId = panel.dataset.sideDefaults;
  const defaults = state.sides[sideId]?.sideDefaults;
  if (!defaults) return false;

  if (target.matches('[data-side-default-field="type"]')) {
    defaults.type = target.value;
    defaults.unitValues = { ...getTroopProfile(defaults.type, defaults.tier).unitStats };
  } else if (target.matches('[data-side-default-field="tier"]')) {
    defaults.tier = Number(target.value);
    defaults.unitValues = { ...getTroopProfile(defaults.type, defaults.tier).unitStats };
  } else if (target.matches('[data-side-default-field="troops"]')) {
    defaults.troops = target.value === '' ? '' : Number(target.value);
  } else if (target.matches('[data-side-default-unit-stat]')) {
    defaults.unitValues[target.dataset.sideDefaultUnitStat] =
      target.value === '' ? '' : Number(target.value);
  } else if (target.matches('[data-side-default-stat]')) {
    const bucket =
      state.sides[sideId].mode === STAT_INPUT_MODES.ADD_BONUSES
        ? defaults.bonuses
        : defaults.finals;
    bucket[target.dataset.sideDefaultStat] = target.value === '' ? '' : Number(target.value);
  } else {
    return false;
  }
  refreshSideDefaults(sideId);
  markResultsStale();
  return true;
}

function copySideDefaultsToRow(row, defaults) {
  Object.assign(row, editableFields(defaults));
  row.customized = false;
}

function applySideDefaults(sideId) {
  const side = state.sides[sideId];
  const panel = form?.querySelector(`[data-side-defaults="${sideId}"]`);
  const invalidControl = panel?.querySelector(INVALID_CONTROL_SELECTOR);
  if (invalidControl) {
    showValidation(t('validation.check'), invalidControl);
    return;
  }
  side.rows.forEach((row) => copySideDefaultsToRow(row, side.sideDefaults));
  replaceSide(sideId);
  markResultsStale();
  requestAnimationFrame(() => {
    form?.querySelector(`[data-apply-side-defaults="${sideId}"]`)?.focus({ preventScroll: true });
  });
  showToast(t('toast.defaults', { side: sideId }));
}

function resetRowToSideDefaults(sideId, rowIndex) {
  const side = state.sides[sideId];
  const row = side?.rows[rowIndex];
  if (!row) return;
  const defaultsPanel = form?.querySelector(`[data-side-defaults="${sideId}"]`);
  const invalidControl = defaultsPanel?.querySelector(INVALID_CONTROL_SELECTOR);
  if (invalidControl) {
    showValidation(t('validation.check'), invalidControl);
    return;
  }
  copySideDefaultsToRow(row, side.sideDefaults);
  replaceRow(sideId, rowIndex);
  markResultsStale();
  requestAnimationFrame(() => {
    form
      ?.querySelector(
        `.battle-squad-card[data-side="${sideId}"][data-row-index="${rowIndex}"] summary`
      )
      ?.focus({ preventScroll: true });
  });
  showToast(t('toast.rowReset', { side: sideId, row: rowLabel(rowIndex) }));
}

function showValidation(message, invalidControl = null) {
  const summary = form?.querySelector('#battleValidationSummary');
  if (summary) {
    summary.textContent = invalidControl?.validationMessage
      ? `${message} ${invalidControl.validationMessage}`
      : message;
    summary.hidden = false;
  }
  const details = invalidControl?.closest('details');
  if (details) details.open = true;
  form?.classList.add('is-validated');
  invalidControl?.setAttribute('aria-invalid', 'true');
  invalidControl?.focus({ preventScroll: true });
  invalidControl?.scrollIntoView({ behavior: preferredScrollBehavior(), block: 'center' });
}

function clearValidation() {
  const summary = form?.querySelector('#battleValidationSummary');
  if (summary) {
    summary.hidden = true;
    summary.textContent = '';
  }
  form?.classList.remove('is-validated');
  form?.querySelectorAll('[aria-invalid="true"]').forEach((control) => {
    control.removeAttribute('aria-invalid');
  });
}

function findFirstInvalid(scope = form, { includeSideDefaults = false } = {}) {
  return Array.from(scope?.querySelectorAll(INVALID_CONTROL_SELECTOR) || []).find(
    (control) => includeSideDefaults || !control.closest('[data-side-defaults]')
  );
}

function refreshValidationAfterInput(target) {
  if (!form?.classList.contains('is-validated')) return;
  if (target.validity?.valid) target.removeAttribute('aria-invalid');
  const nextInvalid = findFirstInvalid(form, { includeSideDefaults: true });
  if (!nextInvalid) {
    clearValidation();
    return;
  }
  nextInvalid.setAttribute('aria-invalid', 'true');
  const summary = form.querySelector('#battleValidationSummary');
  if (summary) {
    summary.textContent = `${t('validation.check')} ${t('validation.range')} ${nextInvalid.validationMessage}`;
    summary.hidden = false;
  }
}

function buildBattleConfig() {
  const sides = {};
  for (const sideId of SIDE_IDS) {
    const sideState = state.sides[sideId];
    const rows = sideState.rows.map((row, index) => {
      const troops = Number(row.troops);
      if (!Number.isSafeInteger(troops) || troops < 0) {
        throw new RangeError(
          `Side ${sideId} ${BATTLE_ROWS[index].label} needs a whole troop count of 0 or more.`
        );
      }
      const calculation = getRowCalculation(sideId, row);
      if (!calculation) {
        throw new RangeError(`Complete every stat for Side ${sideId} ${BATTLE_ROWS[index].label}.`);
      }
      return {
        id: row.id,
        type: row.type,
        tier: row.tier,
        troops,
        presetUnitStats: { ...calculation.unit.preset },
        unitStats: { ...calculation.unit.resolved },
        statInputMode: sideState.mode,
        enteredBattleStats: { ...calculation.battle.entered },
        battleStats: { ...calculation.battle.totals },
        statSources: {
          included: [...calculation.battle.includedSources],
          excluded: [...calculation.battle.excludedSources],
        },
        stats: {
          unit: { ...calculation.engineStats.unit },
          battle: { ...calculation.engineStats.battle },
        },
      };
    });
    if (rows.every((row) => row.troops === 0)) {
      throw new RangeError(`Side ${sideId} needs troops in at least one row.`);
    }
    sides[sideId] = {
      label: `Side ${sideId}`,
      capturedSourceSnapshot: structuredClone(sideState.capturedSourceSnapshot),
      rows,
    };
  }
  return { sideA: sides.A, sideB: sides.B };
}

function chooseRepresentative(batch) {
  const sorted = [...(batch.results || [])].sort(
    (left, right) => left.rounds - right.rounds || left.runNumber - right.runNumber
  );
  if (sorted.length === 0) return null;
  return sorted[Math.floor((sorted.length - 1) / 2)];
}

function getBatchStats(batch) {
  const rounds = (batch.results || []).map((result) => result.rounds).sort((a, b) => a - b);
  return {
    median: calculateMedian(rounds, batch.averageRounds),
    minimum: rounds[0] ?? batch.averageRounds,
    maximum: rounds.at(-1) ?? batch.averageRounds,
  };
}

export function calculateMedian(values, fallback = 0) {
  if (!Array.isArray(values) || values.length === 0) return fallback;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function simulateBattleBatchOffThread(config, options) {
  if (typeof Worker !== 'function') {
    return Promise.resolve(simulateBattleBatch(config, options));
  }

  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./battle-simulator-worker.js', import.meta.url), {
      type: 'module',
      name: 'vts-battle-simulator',
    });
    const finish = (callback, value) => {
      worker.terminate();
      callback(value);
    };
    worker.addEventListener(
      'message',
      (event) => {
        if (event.data?.ok) {
          finish(resolve, event.data.result);
          return;
        }
        const error = new Error(event.data?.error?.message || 'The batch worker failed.');
        error.name = event.data?.error?.name || 'Error';
        finish(reject, error);
      },
      { once: true }
    );
    worker.addEventListener(
      'error',
      (event) => finish(reject, new Error(event.message || 'The batch worker failed to load.')),
      { once: true }
    );
    worker.postMessage({ config, options });
  });
}

async function runSimulations() {
  clearValidation();
  const firstInvalid = findFirstInvalid(form, { includeSideDefaults: true });
  if (firstInvalid) {
    showValidation(
      'Check the highlighted value. Every field must stay within its allowed range.',
      firstInvalid
    );
    return;
  }

  let config;
  try {
    config = buildBattleConfig();
  } catch (error) {
    showValidation(error.message || 'The formation setup is incomplete.');
    return;
  }

  const iterations = Number(form.elements.battleIterations.value);
  const seed = Number(form.elements.battleSeed.value);
  const variance = iterations === 1 ? 0 : Number(form.elements.battleVariance.value);
  state.iterations = iterations;
  state.seed = seed;
  state.strikeVariancePct = Number(form.elements.battleVariance.value);
  let setup;
  try {
    setup = buildSetupSnapshot(state);
  } catch (error) {
    showValidation(error.message || 'The complete setup could not be captured for export.');
    return;
  }
  const runRevision = setupRevision;
  const runButton = form.querySelector('[data-battle-run]');
  const runStatus = form.querySelector('[data-run-status]');
  form.setAttribute('aria-busy', 'true');
  if (runButton) runButton.disabled = true;
  if (runStatus) {
    runStatus.textContent =
      iterations === 1
        ? t('run.resolving')
        : t('run.running', { count: INTEGER_FORMAT.format(iterations) });
  }
  await new Promise((resolve) => requestAnimationFrame(() => resolve()));

  try {
    if (iterations === 1) {
      const result = simulateBattle(config, { seed, strikeVariancePct: 0, includeEventLog: true });
      lastRun = {
        mode: 'single',
        iterations,
        seed,
        variance: 0,
        config,
        result,
        selectedResult: result,
        representative: null,
        setup,
      };
    } else {
      const result = await simulateBattleBatchOffThread(config, {
        iterations,
        seed,
        strikeVariancePct: variance,
        includeResults: true,
        includeEventLogs: false,
      });
      if (runRevision !== setupRevision) {
        showToast('Setup changed while the batch was running. Run it again for current results.');
        return;
      }
      const representative = chooseRepresentative(result);
      const selectedSimulation = representative
        ? simulateBattle(config, {
            seed: representative.seed,
            strikeVariancePct: variance,
            includeEventLog: true,
          })
        : null;
      const selectedResult = selectedSimulation
        ? { ...selectedSimulation, runNumber: representative.runNumber }
        : null;
      lastRun = {
        mode: 'batch',
        iterations,
        seed,
        variance,
        config,
        result,
        selectedResult,
        representative,
        setup,
      };
    }
    renderResults();
  } catch (error) {
    console.error('[battle-simulator] simulation failed', error);
    showValidation(error.message || 'The simulation could not complete.');
  } finally {
    form.removeAttribute('aria-busy');
    if (runButton) runButton.disabled = false;
    setRunControls();
  }
}

function outcomeName(outcome) {
  if (outcome === 'A' || outcome === 'B') return t('results.sideWins', { side: outcome });
  if (outcome === 'draw') return t('results.draw');
  return t('results.stalemate');
}

function outcomeCard(label, value, detail, color) {
  return `<article class="battle-outcome-card" style="--metric-color:${color}"><span class="battle-outcome-label">${label}</span><strong>${value}</strong><small>${detail}</small></article>`;
}

function metricCard(label, value, detail = '') {
  return `<article class="battle-metric-card"><span class="battle-outcome-label">${label}</span><strong>${value}</strong><small>${detail}</small></article>`;
}

export function getBatchVerdict(result) {
  const runCount = Number(result.runCount || 0);
  const counts = {
    A: Number(result.winCounts?.A || 0),
    B: Number(result.winCounts?.B || 0),
    draw: Number(result.winCounts?.draw || 0),
    stalemate: Number(result.winCounts?.stalemate || 0),
  };
  const rate = (outcome) => (runCount > 0 ? Math.round((counts[outcome] / runCount) * 100) : 0);
  const highestCount = Math.max(...Object.values(counts));
  const leaders = Object.keys(counts).filter((outcome) => counts[outcome] === highestCount);
  const detail = `${t('results.rate', { side: 'A', rate: rate('A') })} · ${t('results.rate', { side: 'B', rate: rate('B') })} · ${t('results.draws', { count: counts.draw })} · ${t('results.stalemates', { count: counts.stalemate })}`;

  if (leaders.length !== 1) {
    return {
      tone: 'is-neutral',
      title: t('results.noWinner', { count: runCount }),
      detail,
    };
  }

  const leader = leaders[0];
  if (leader === 'draw') {
    return {
      tone: 'is-neutral',
      title: t('results.drawRuns', {
        wins: counts.draw,
        count: runCount,
        rate: rate('draw'),
      }),
      detail,
    };
  }
  if (leader === 'stalemate') {
    return {
      tone: 'is-neutral',
      title: t('results.stalemateRuns', {
        wins: counts.stalemate,
        count: runCount,
        rate: rate('stalemate'),
      }),
      detail,
    };
  }

  const loserSide = leader === 'A' ? 'B' : 'A';
  return {
    tone: leader === 'A' ? 'is-success' : 'is-danger',
    title: t('results.sideWinsRuns', {
      side: leader,
      wins: counts[leader],
      count: runCount,
      rate: rate(leader),
    }),
    detail: `${t('results.rate', { side: loserSide, rate: rate(loserSide) })} · ${t('results.draws', { count: counts.draw })} · ${t('results.stalemates', { count: counts.stalemate })}`,
  };
}

function renderVerdictBanner(isBatch, result) {
  if (!isBatch) {
    if (result.outcome === 'A' || result.outcome === 'B') {
      const tone = result.outcome === 'A' ? 'is-success' : 'is-danger';
      return `<div class="battle-verdict-banner ${tone}" role="status"><strong>${t('results.winsRounds', { side: result.outcome, rounds: formatInteger(result.rounds) })}</strong></div>`;
    }
    const verdict =
      result.outcome === 'draw'
        ? t('results.draw')
        : t('results.cap', { rounds: BATTLE_MODEL_ASSUMPTIONS.maxRounds });
    return `<div class="battle-verdict-banner is-neutral" role="status"><strong>${verdict}</strong></div>`;
  }

  const verdict = getBatchVerdict(result);
  return `
    <div class="battle-verdict-banner ${verdict.tone}" role="status">
      <strong>${verdict.title}</strong>
      <span>${verdict.detail}</span>
    </div>`;
}

function renderResults({ focus = true, scroll = true } = {}) {
  if (!lastRun) return;
  const resultsElement = root.querySelector('#battleResults');
  const isBatch = lastRun.mode === 'batch';
  const result = lastRun.result;
  const selected = lastRun.selectedResult;
  const initialA = lastRun.config.sideA.rows.reduce((sum, row) => sum + row.troops, 0);
  const initialB = lastRun.config.sideB.rows.reduce((sum, row) => sum + row.troops, 0);
  let outcomeHtml = '';
  let metricsHtml = '';
  let heading = '';
  let subheading = '';

  if (isBatch) {
    const stats = getBatchStats(result);
    heading = plural('results.complete', result.runCount);
    subheading = `Batch seed ${result.seed} · ±${NUMBER_FORMAT.format(result.strikeVariancePct)}% per-hit variance · representative run #${lastRun.representative?.runNumber || 1} (seed ${lastRun.representative?.seed ?? result.seed})`;
    outcomeHtml = [
      outcomeCard(
        t('results.sideWins', { side: 'A' }),
        PERCENT_FORMAT.format((result.winRates.A || 0) * 100) + '%',
        plural('status.runCount', result.winCounts.A),
        'var(--battle-side-a)'
      ),
      outcomeCard(
        t('results.sideWins', { side: 'B' }),
        PERCENT_FORMAT.format((result.winRates.B || 0) * 100) + '%',
        plural('status.runCount', result.winCounts.B),
        'var(--battle-side-b)'
      ),
      outcomeCard(
        t('results.draws', { count: '' }).replace(': ', ''),
        PERCENT_FORMAT.format((result.winRates.draw || 0) * 100) + '%',
        plural('status.runCount', result.winCounts.draw),
        'var(--ff-warning)'
      ),
      outcomeCard(
        t('results.stalemates', { count: '' }).replace(': ', ''),
        PERCENT_FORMAT.format((result.winRates.stalemate || 0) * 100) + '%',
        plural('status.runCount', result.winCounts.stalemate),
        'var(--ff-text-dim)'
      ),
    ].join('');
    metricsHtml = [
      metricCard(
        t('results.averageRounds'),
        NUMBER_FORMAT.format(result.averageRounds),
        t('results.median', { value: NUMBER_FORMAT.format(stats.median) })
      ),
      metricCard(
        t('results.roundRange'),
        `${stats.minimum}–${stats.maximum}`,
        t('results.shortLong')
      ),
      metricCard(
        t('results.avgSideLeft', { side: 'A' }),
        INTEGER_FORMAT.format(result.averageTotalSurvivors.A),
        t('results.casualties', { count: INTEGER_FORMAT.format(result.averageTotalCasualties.A) })
      ),
      metricCard(
        t('results.avgSideLeft', { side: 'B' }),
        INTEGER_FORMAT.format(result.averageTotalSurvivors.B),
        t('results.casualties', { count: INTEGER_FORMAT.format(result.averageTotalCasualties.B) })
      ),
    ].join('');
  } else {
    heading = outcomeName(result.outcome);
    subheading = `Completed in ${result.rounds} round${result.rounds === 1 ? '' : 's'} · seed ${result.seed} · exact mode`;
    outcomeHtml = [
      outcomeCard(
        t('results.outcome'),
        outcomeName(result.outcome),
        result.reason.replaceAll('-', ' '),
        result.outcome === 'A'
          ? 'var(--battle-side-a)'
          : result.outcome === 'B'
            ? 'var(--battle-side-b)'
            : 'var(--ff-warning)'
      ),
      outcomeCard(
        t('results.rounds'),
        INTEGER_FORMAT.format(result.rounds),
        t('results.maximum', { count: BATTLE_MODEL_ASSUMPTIONS.maxRounds }),
        'var(--ff-seasonal)'
      ),
      outcomeCard(
        t('results.sideLeft', { side: 'A' }),
        INTEGER_FORMAT.format(result.survivors.A),
        t('results.casualties', { count: INTEGER_FORMAT.format(result.casualties.A) }),
        'var(--battle-side-a)'
      ),
      outcomeCard(
        t('results.sideLeft', { side: 'B' }),
        INTEGER_FORMAT.format(result.survivors.B),
        t('results.casualties', { count: INTEGER_FORMAT.format(result.casualties.B) }),
        'var(--battle-side-b)'
      ),
    ].join('');
    metricsHtml = [
      metricCard(
        t('results.initiative'),
        result.openingInitiative?.side === 'tie'
          ? t('results.speedTie')
          : t('side.kicker', { side: result.openingInitiative?.side || '—' }),
        t('results.combatSpeed', {
          value: NUMBER_FORMAT.format(result.openingInitiative?.combatSpeed || 0),
        })
      ),
      metricCard(
        t('results.survival', { side: 'A' }),
        PERCENT_FORMAT.format(initialA ? (result.survivors.A / initialA) * 100 : 0) + '%',
        t('results.deployed', { count: INTEGER_FORMAT.format(initialA) })
      ),
      metricCard(
        t('results.survival', { side: 'B' }),
        PERCENT_FORMAT.format(initialB ? (result.survivors.B / initialB) * 100 : 0) + '%',
        t('results.deployed', { count: INTEGER_FORMAT.format(initialB) })
      ),
      metricCard(t('results.model'), BATTLE_MODEL_VERSION, t('results.foundation')),
    ].join('');
  }

  const survivalA = isBatch ? result.averageTotalSurvivors.A : result.survivors.A;
  const survivalB = isBatch ? result.averageTotalSurvivors.B : result.survivors.B;
  resultsElement.innerHTML = `
    <div class="battle-results-panel">
      <div class="battle-results-heading">
        <div>
          <p class="battle-section-kicker">${t('results.kicker')}</p>
          <h2 id="battleResultsTitle" tabindex="-1">${heading}</h2>
          <p>${subheading}</p>
        </div>
        <div class="battle-result-actions" role="group" aria-label="${t('results.exportGroup')}">
          <button class="battle-export-button" type="button" data-battle-export="json">${t('results.fullJson')}</button>
          <button class="battle-export-button" type="button" data-battle-export="summary-csv">${t('results.summaryCsv')}</button>
          <button class="battle-export-button" type="button" data-battle-export="log-csv">${t('results.logCsv')}</button>
          <button class="battle-export-button" type="button" data-battle-export="copy">${t('results.copyDebug')}</button>
          <button class="battle-export-button" type="button" data-battle-export="calibration">${t('results.calibration')}</button>
        </div>
      </div>
      ${renderVerdictBanner(isBatch, result)}
      ${sideHasPartialModel('A') || sideHasPartialModel('B') ? `<aside class="battle-results-partial" role="note"><strong>${t('status.partial')}</strong><span>${t('results.partialNotice')}</span></aside>` : ''}
      <div class="battle-outcome-grid">${outcomeHtml}</div>
      <div class="battle-metric-grid">${metricsHtml}</div>
      <div class="battle-survival-board" aria-label="${isBatch ? t('results.averageSurvivors') : t('results.survivors')}">
        ${renderSurvivalRow('A', survivalA, initialA, 'var(--battle-side-a)', isBatch)}
        ${renderSurvivalRow('B', survivalB, initialB, 'var(--battle-side-b)', isBatch)}
      </div>
      ${renderEventLog(selected, isBatch)}
      <p class="battle-model-note">Formula: ${BATTLE_MODEL_ASSUMPTIONS.formula}. This provisional formula and the batch variance are exported with every debug file so later model changes remain traceable.</p>
    </div>`;
  resultsElement.hidden = false;
  const logDetails = resultsElement.querySelector('[data-battle-log]');
  logDetails?.addEventListener(
    'toggle',
    () => {
      if (!logDetails.open || logDetails.dataset.hydrated === 'true') return;
      const content = logDetails.querySelector('[data-battle-log-content]');
      if (content) content.innerHTML = renderEventLogTable(selected);
      logDetails.dataset.hydrated = 'true';
    },
    { once: true }
  );
  if (focus) resultsElement.querySelector('#battleResultsTitle')?.focus({ preventScroll: true });
  if (scroll) {
    resultsElement.scrollIntoView({ behavior: preferredScrollBehavior(), block: 'start' });
  }
}

function renderSurvivalRow(sideId, surviving, initial, color, average) {
  const percentage = initial ? Math.max(0, Math.min(100, (surviving / initial) * 100)) : 0;
  return `
    <div class="battle-survival-row">
      <strong>${t('side.kicker', { side: sideId })}</strong>
      <span class="battle-survival-track"><span class="battle-survival-fill" style="--bar-color:${color};width:${percentage}%"></span></span>
      <output>${average ? `${t('results.averageShort')} ` : ''}${INTEGER_FORMAT.format(surviving)} / ${INTEGER_FORMAT.format(initial)}</output>
    </div>`;
}

function renderEventLog(result, _representative) {
  const actions = result?.actionLog || [];
  if (actions.length === 0) {
    return `<p class="battle-model-note">${t('results.noLog')}</p>`;
  }
  return `
    <details class="battle-log-details" data-battle-log>
      <summary><span>${t('results.log')}</span><span>${formatInteger(actions.length)}</span></summary>
      <div class="battle-log-table-wrap" data-battle-log-content tabindex="0" role="region" aria-label="${t('results.logRegion')}">
        <p class="battle-model-note">Open this log to render the first ${Math.min(actions.length, VISIBLE_EVENT_LIMIT)} strikes. Full event data remains available in Selected log CSV.</p>
      </div>
    </details>`;
}

function renderEventLogTable(result) {
  const actions = result?.actionLog || [];
  const visibleActions = actions.slice(0, VISIBLE_EVENT_LIMIT);
  const truncatedNote =
    actions.length > visibleActions.length
      ? `<p class="battle-model-note">Showing ${visibleActions.length} of ${actions.length} strikes for smooth rendering. Selected log CSV exports all ${actions.length}.</p>`
      : '';
  return `
    ${truncatedNote}
    <table class="battle-log-table">
      <caption class="battle-visually-hidden">Battle strikes in action order</caption>
      <thead><tr><th scope="col">Round</th><th scope="col">Phase</th><th scope="col">Row speed</th><th scope="col">Attacker</th><th scope="col">Target</th><th scope="col">Before</th><th scope="col">Losses</th><th scope="col">After</th><th scope="col">Roll</th></tr></thead>
      <tbody>${visibleActions
        .map(
          (action) =>
            `<tr><td>${action.round}</td><td>${action.groupType === 'opening' ? 'Opening' : 'Exchange'}</td><td>${NUMBER_FORMAT.format(action.actorCombatSpeed ?? action.combatSpeed ?? 0)}</td><td>${action.attackerSide} · ${action.attackerRowLabel}</td><td>${action.defenderSide} · ${action.targetRowLabel}</td><td>${INTEGER_FORMAT.format(action.targetTroopsBefore)}</td><td>−${INTEGER_FORMAT.format(action.casualties)}</td><td>${INTEGER_FORMAT.format(action.targetTroopsAfter)}</td><td>×${NUMBER_FORMAT.format(action.strikeMultiplier)}</td></tr>`
        )
        .join('')}</tbody>
    </table>`;
}

function exportPayload({ selectedOnly = false } = {}) {
  const result = selectedOnly
    ? lastRun.selectedResult
    : lastRun.mode === 'batch'
      ? { ...lastRun.result, selectedResult: lastRun.selectedResult }
      : lastRun.result;
  return {
    config: lastRun.config,
    setup: lastRun.setup,
    model: {
      appVersion: APP_VERSION,
      version: BATTLE_MODEL_VERSION,
      assumptions: BATTLE_MODEL_ASSUMPTIONS,
    },
    result,
    runMode: selectedOnly ? 'selected-run' : lastRun.mode,
    seed: lastRun.seed,
    variance: lastRun.variance,
  };
}

function downloadText(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function exportFilename(kind, extension) {
  return makeBattleExportFilename({
    kind,
    mode: lastRun.mode,
    generatedAt: new Date(),
    extension,
  });
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  textarea.remove();
}

async function handleExport(kind) {
  if (!lastRun) return;
  try {
    if (kind === 'json') {
      downloadText(
        buildBattleJsonExport(exportPayload()),
        exportFilename('full-debug', 'json'),
        'application/json;charset=utf-8'
      );
      showToast('Full debug JSON exported.');
    } else if (kind === 'summary-csv') {
      downloadText(
        buildBattleSummaryCsv(exportPayload()),
        exportFilename('summary', 'csv'),
        'text/csv;charset=utf-8'
      );
      showToast('Summary CSV exported.');
    } else if (kind === 'log-csv') {
      downloadText(
        buildBattleEventLogCsv(exportPayload({ selectedOnly: true })),
        exportFilename('selected-run-log', 'csv'),
        'text/csv;charset=utf-8'
      );
      showToast('Selected run event log exported.');
    } else if (kind === 'copy') {
      await copyText(buildBattleDebugSnapshot(exportPayload()));
      showToast('Debug snapshot copied.');
    } else if (kind === 'calibration') {
      downloadText(
        buildBattleCalibrationFixture(exportPayload()),
        exportFilename('calibration', 'json'),
        'application/json;charset=utf-8'
      );
      showToast('Calibration fixture exported. Add the observed battle report values by hand.');
    }
  } catch (error) {
    console.error('[battle-simulator] export failed', error);
    showToast('Export failed. The simulation result is still available on screen.');
  }
}

function buildDatedSetupSnapshot() {
  return { ...buildSetupSnapshot(state), savedAt: new Date().toISOString() };
}

function setupExportFilename(date = new Date()) {
  return `battle-setup-${date.toISOString().slice(0, 10)}.json`;
}

function exportSetup() {
  try {
    const snapshot = buildDatedSetupSnapshot();
    downloadText(
      JSON.stringify(snapshot, null, 2),
      setupExportFilename(new Date(snapshot.savedAt)),
      'application/json;charset=utf-8'
    );
    showToast('Battle setup exported.');
  } catch (error) {
    console.error('[battle-simulator] setup export failed', error);
    showToast(error.message || 'Battle setup export failed.');
  }
}

function replaceSetupState(nextState, message) {
  setupRevision += 1;
  state = nextState;
  SIDE_IDS.forEach((sideId) => rebuildCapturedSourceSnapshot(sideId));
  lastRun = null;
  root.innerHTML = pageTemplate();
  bindUI();
  applyTheme(getTheme());
  const heading = root.querySelector('#battleSetupToolbarTitle');
  heading?.focus({ preventScroll: true });
  heading?.scrollIntoView({ behavior: preferredScrollBehavior(), block: 'start' });
  showToast(message);
}

function importSetupText(jsonText) {
  const snapshot = parseSetupSnapshot(jsonText);
  const nextState = applySetupSnapshot(state, snapshot);
  replaceSetupState(nextState, t('toast.setupImported'));
}

async function importSetupFile(input) {
  const file = input.files?.[0];
  if (!file) return;
  try {
    importSetupText(await file.text());
  } catch (error) {
    console.error('[battle-simulator] setup import failed', error);
    showToast(error.message || 'The setup file could not be imported.');
  } finally {
    input.value = '';
  }
}

function readPresetStore() {
  try {
    return {
      store: parseBattleSetupPresetStore(localStorage.getItem(BATTLE_SETUP_PRESET_STORAGE_KEY)),
      error: null,
    };
  } catch (error) {
    console.warn('[battle-simulator] saved setup presets unavailable', error);
    return {
      store: {},
      error: 'Saved presets were unavailable or corrupted and have been treated as empty.',
    };
  }
}

function writePresetStore(nextStore) {
  localStorage.setItem(BATTLE_SETUP_PRESET_STORAGE_KEY, JSON.stringify(nextStore));
}

function refreshPresetSelect(selectedName = '') {
  const select = form?.querySelector('[data-preset-select]');
  if (!select) return;
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = t('setup.choosePreset');
  select.replaceChildren(placeholder);
  const names = Object.keys(presetStore).sort((left, right) => left.localeCompare(right));
  for (const name of names) {
    const option = document.createElement('option');
    option.value = name;
    option.textContent = name;
    select.appendChild(option);
  }
  select.value = names.includes(selectedName) ? selectedName : '';
  updatePresetButtons();
}

function updatePresetButtons() {
  const selectedName = form?.querySelector('[data-preset-select]')?.value || '';
  const hasSelection = Boolean(selectedName && Object.hasOwn(presetStore, selectedName));
  const loadButton = form?.querySelector('[data-preset-load]');
  const deleteButton = form?.querySelector('[data-preset-delete]');
  if (loadButton) loadButton.disabled = !hasSelection;
  if (deleteButton) deleteButton.disabled = !hasSelection;
}

function saveNamedPreset() {
  const nameInput = form?.querySelector('[data-preset-name]');
  try {
    const name = normalizeBattleSetupPresetName(nameInput?.value || '');
    const nextStore = upsertBattleSetupPreset(presetStore, name, buildDatedSetupSnapshot());
    writePresetStore(nextStore);
    presetStore = nextStore;
    if (nameInput) nameInput.value = name;
    refreshPresetSelect(name);
    showToast(`Preset “${name}” saved.`);
  } catch (error) {
    console.error('[battle-simulator] preset save failed', error);
    const storageFailure = /quota|security/i.test(error?.name || '') || !error?.message;
    showToast(
      storageFailure
        ? 'Could not save the preset. Browser storage may be full or unavailable.'
        : error.message
    );
  }
}

function loadNamedPreset() {
  const name = form?.querySelector('[data-preset-select]')?.value || '';
  if (!name || !Object.hasOwn(presetStore, name)) {
    showToast('Choose a saved preset first.');
    return;
  }
  try {
    const snapshot = parseSetupSnapshot(JSON.stringify(presetStore[name]));
    const nextState = applySetupSnapshot(state, snapshot);
    replaceSetupState(nextState, `Preset “${name}” loaded.`);
  } catch (error) {
    console.error('[battle-simulator] preset load failed', error);
    showToast(error.message || 'The saved preset could not be loaded.');
  }
}

function deleteNamedPreset() {
  const name = form?.querySelector('[data-preset-select]')?.value || '';
  if (!name || !Object.hasOwn(presetStore, name)) {
    showToast('Choose a saved preset first.');
    return;
  }
  try {
    const nextStore = deleteBattleSetupPreset(presetStore, name);
    writePresetStore(nextStore);
    presetStore = nextStore;
    refreshPresetSelect();
    showToast(`Preset “${name}” deleted.`);
  } catch (error) {
    console.error('[battle-simulator] preset delete failed', error);
    showToast('Could not delete the preset from browser storage.');
  }
}

function showToast(message) {
  const region = root?.querySelector('.battle-toast-region');
  if (!region) return;
  const toast = document.createElement('div');
  toast.className = 'battle-toast';
  toast.textContent = message;
  region.appendChild(toast);
  setTimeout(() => toast.remove(), 2600);
}

function resetSetup() {
  setupRevision += 1;
  state = createInitialState();
  initializeFreshSourceState();
  lastRun = null;
  root.innerHTML = pageTemplate();
  bindUI();
  applyTheme(getTheme());
  const title = root.querySelector('#battleSimulatorTitle');
  title?.focus({ preventScroll: true });
  title?.scrollIntoView({ behavior: preferredScrollBehavior(), block: 'start' });
  showToast(t('toast.reset'));
}

async function changeLanguage(locale) {
  const normalized = normalizeBattleSimulatorLocale(locale);
  await loadBattleSimulatorLocale(normalized);
  translator = createBattleSimulatorTranslator(normalized);
  writePreferredBattleSimulatorLocale(normalized);
  applyBattleSimulatorDocumentLocale(document, normalized);
  const keepResults = Boolean(lastRun);
  root.innerHTML = pageTemplate();
  bindUI();
  applyTheme(getTheme());
  if (keepResults) renderResults({ focus: false, scroll: false });
  requestAnimationFrame(() => {
    root.querySelector(`[data-battle-language]`)?.focus({ preventScroll: true });
  });
}

function bindUI() {
  form = root.querySelector('#battleSimulatorForm');
  root.querySelector('#battleThemeToggle')?.addEventListener('click', toggleTheme);
  root.querySelector('[data-battle-language]')?.addEventListener('change', (event) => {
    changeLanguage(event.target.value).catch((error) => {
      console.error('[battle-simulator] language change failed', error);
    });
  });
  form?.addEventListener('submit', (event) => {
    event.preventDefault();
    runSimulations();
  });
  form?.addEventListener('input', (event) => {
    const target = event.target;
    refreshValidationAfterInput(target);
    if (target.name === 'battleSeed') {
      state.seed = target.value === '' ? '' : Number(target.value);
      markResultsStale();
    } else if (target.name === 'battleVariance') {
      state.strikeVariancePct = target.value === '' ? '' : Number(target.value);
      setRunControls();
      markResultsStale();
    } else {
      if (!handleSideDefaultControl(target)) handleRowControl(target);
    }
  });
  form?.addEventListener('change', (event) => {
    const target = event.target;
    if (target.matches('[data-setup-file]')) {
      importSetupFile(target);
    } else if (target.matches('[data-research-enabled]')) {
      updateResearchEnabled(target.dataset.researchEnabled, target.checked);
    } else if (
      target.matches('[data-equipment-set], [data-equipment-grade], [data-equipment-enhancement]')
    ) {
      const sideId =
        target.dataset.equipmentSet ||
        target.dataset.equipmentGrade ||
        target.dataset.equipmentEnhancement;
      updateEquipmentLoadout(sideId, target);
    } else if (target.matches('[data-preset-select]')) {
      updatePresetButtons();
    } else if (target.name === 'battleIterations') {
      state.iterations = Number(target.value);
      setRunControls();
      markResultsStale();
    } else if (target.matches('[data-mode-side]')) {
      switchSideMode(target.dataset.modeSide, target.value);
    } else {
      if (!handleSideDefaultControl(target)) handleRowControl(target);
    }
  });
  form?.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.matches('[data-focus-first-invalid]')) {
      const firstInvalid = findFirstInvalid(form, { includeSideDefaults: true });
      if (firstInvalid) {
        showValidation('Check the highlighted value.', firstInvalid);
      }
    } else if (button.matches('[data-copy-side-a-to-b]')) {
      try {
        replaceSetupState(copyBattleSideSetup(state, 'A', 'B'), 'Side A copied to Side B.');
      } catch (error) {
        console.error('[battle-simulator] side copy failed', error);
        showToast(error.message || 'Side A could not be copied.');
      }
    } else if (button.matches('[data-swap-sides]')) {
      try {
        replaceSetupState(swapBattleSides(state), 'Sides A and B swapped.');
      } catch (error) {
        console.error('[battle-simulator] side swap failed', error);
        showToast(error.message || 'The sides could not be swapped.');
      }
    } else if (button.matches('[data-refresh-research]')) {
      refreshSavedResearch(button.dataset.refreshResearch);
    } else if (button.matches('[data-setup-export]')) {
      exportSetup();
    } else if (button.matches('[data-setup-import-paste]')) {
      try {
        importSetupText(form.querySelector('[data-setup-json]')?.value || '');
      } catch (error) {
        console.error('[battle-simulator] pasted setup import failed', error);
        showToast(error.message || 'The pasted setup could not be imported.');
      }
    } else if (button.matches('[data-preset-save]')) {
      saveNamedPreset();
    } else if (button.matches('[data-preset-load]')) {
      loadNamedPreset();
    } else if (button.matches('[data-preset-delete]')) {
      deleteNamedPreset();
    } else if (button.matches('[data-apply-side-defaults]')) {
      applySideDefaults(button.dataset.applySideDefaults);
    } else if (button.matches('[data-reset-row-defaults]')) {
      const card = button.closest('.battle-squad-card');
      if (card) resetRowToSideDefaults(card.dataset.side, Number(card.dataset.rowIndex));
    }
  });
  form?.addEventListener(
    'toggle',
    (event) => {
      const details = event.target.closest?.('.battle-squad-card');
      if (!details) return;
      const row = state.sides[details.dataset.side]?.rows[Number(details.dataset.rowIndex)];
      if (row) row.open = details.open;
    },
    true
  );
  form?.querySelector('[data-battle-reset]')?.addEventListener('click', resetSetup);
  root.querySelector('#battleResults')?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-battle-export]');
    if (button) handleExport(button.dataset.battleExport);
  });
  refreshPresetSelect();
  setRunControls();
}

export async function mountBattleSimulator(target, { locale = 'en' } = {}) {
  if (!target) throw new Error('Battle Simulator mount element is missing.');
  const normalizedLocale = normalizeBattleSimulatorLocale(locale);
  await loadBattleSimulatorLocale(normalizedLocale);
  translator = createBattleSimulatorTranslator(normalizedLocale);
  applyBattleSimulatorDocumentLocale(document, normalizedLocale);
  root = target;
  state = createInitialState();
  initializeFreshSourceState();
  const storedPresets = readPresetStore();
  presetStore = storedPresets.store;
  root.innerHTML = pageTemplate();
  bindUI();
  applyTheme(getTheme());
  root.querySelector('#battleSimulatorTitle')?.focus({ preventScroll: true });
  if (storedPresets.error) showToast(storedPresets.error);
}
