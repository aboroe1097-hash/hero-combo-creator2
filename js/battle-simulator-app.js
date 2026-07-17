import {
  BATTLE_ROWS,
  DEFAULT_TROOPS,
  STAT_INPUT_MODES,
  TROOP_STAT_KEYS,
  TROOP_STAT_METADATA,
  TROOP_TIERS,
  TROOP_TYPES,
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

const APP_VERSION = '14.0.17';
const THEME_STORAGE_KEY = 'vts_theme';
const SIDE_IDS = ['A', 'B'];
const STAT_DISPLAY_ORDER = [
  'might',
  'resistance',
  'hp',
  'damage',
  'combatSpeed',
  'tacticalMight',
  'tacticalResistance',
];
const TACTICAL_STATS = new Set(['tacticalMight', 'tacticalResistance']);
const INVALID_CONTROL_SELECTOR = 'input:invalid, select:invalid, textarea:invalid';
const VISIBLE_EVENT_LIMIT = 300;
const NUMBER_FORMAT = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
const INTEGER_FORMAT = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const PERCENT_FORMAT = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

let root = null;
let form = null;
let state = createInitialState();
let lastRun = null;
let setupRevision = 0;
let presetStore = {};

function emptyStats(value = 0) {
  return Object.fromEntries(TROOP_STAT_KEYS.map((key) => [key, value]));
}

function createRow(type, tier, index) {
  const base = getTroopProfile(type, tier).baseStats;
  return {
    id: BATTLE_ROWS[index].id,
    type,
    tier,
    troops: DEFAULT_TROOPS,
    baseValues: {
      might: base.might,
      resistance: base.resistance,
      hp: base.hp,
    },
    bonuses: emptyStats(0),
    finals: { ...base },
    open: index === 0,
    customized: false,
  };
}

function editableFields(source) {
  return {
    type: source.type,
    tier: source.tier,
    troops: source.troops,
    baseValues: { ...source.baseValues },
    bonuses: { ...source.bonuses },
    finals: { ...source.finals },
  };
}

function editableFieldsMatch(left, right) {
  return (
    left.type === right.type &&
    left.tier === right.tier &&
    left.troops === right.troops &&
    ['baseValues', 'bonuses', 'finals'].every((bucket) =>
      TROOP_STAT_KEYS.every((key) => {
        if (!(key in left[bucket]) && !(key in right[bucket])) return true;
        return left[bucket][key] === right[bucket][key];
      })
    )
  );
}

function createSide(defaultType, tier, rowTypes) {
  const sideDefaultRow = createRow(defaultType, tier, 0);
  return {
    mode: STAT_INPUT_MODES.ADD_BONUSES,
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
      A: createSide('footmen', 9, sideTypes),
      B: createSide('footmen', 10, sideTypes),
    },
  };
}

function requireSideId(sideId, label) {
  if (!SIDE_IDS.includes(sideId)) {
    throw new RangeError(`${label} must be Side A or Side B.`);
  }
}

function cloneBattleSide(side) {
  return {
    mode: side.mode,
    sideDefaults: editableFields(side.sideDefaults),
    rows: side.rows.map((row) => ({
      id: row.id,
      ...editableFields(row),
      open: row.open,
      customized: row.customized,
    })),
  };
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
    <a class="battle-skip-link" href="#battleSimulatorMain">Skip to simulator</a>
    <div class="battle-app-shell">
      <header class="battle-topbar" aria-label="Battle Simulator header">
        <a class="battle-brand" href="index.html" aria-label="VTS 1097 tool hub">
          <img src="images/logo-120.webp" alt="" width="48" height="48" />
          <span class="battle-brand-copy">
            <strong>VTS 1097</strong>
            <small>Battle Lab · v${APP_VERSION}</small>
          </span>
        </a>
        <div class="battle-topbar-actions">
          <button id="battleThemeToggle" class="battle-icon-button" type="button" aria-label="Switch to light theme" aria-pressed="false">
            <span data-theme-icon="dark">${icon('moon')}</span>
            <span data-theme-icon="light" hidden>${icon('sun')}</span>
          </button>
          <a class="battle-back-link" href="index.html">${icon('back')}<span>Back to tools</span></a>
        </div>
      </header>

      <main id="battleSimulatorMain" class="battle-main">
        <section class="battle-hero" aria-labelledby="battleSimulatorTitle">
          <div>
            <p class="battle-eyebrow">Phase 1 · Troop foundation</p>
            <div class="battle-title-row">
              <h1 id="battleSimulatorTitle" tabindex="-1">Battle Simulator</h1>
              <span class="battle-beta-badge">BETA</span>
            </div>
            <p class="battle-hero-copy">
              Compare two independent three-row formations using T9 and T10 Footmen, Cavalry, and Archers. Every row keeps its own final combat stats.
            </p>
          </div>
          <div class="battle-phase-chips" aria-label="Phase 1 scope">
            <span class="battle-status-chip">31,000 default per row</span>
            <span class="battle-status-chip">Seeded batch runs</span>
            <span class="battle-status-chip">No heroes yet</span>
          </div>
        </section>

        <aside class="battle-foundation-note" aria-label="Experimental model notice">
          ${icon('warning')}
          <div>
            <strong>Foundation model — not an exact game replica yet</strong>
            <p>Phase 1 models troop basic attacks only. Heroes, skills, equipment, dragon, troop counters, and tactical skill damage are intentionally excluded.</p>
          </div>
        </aside>

        <details class="battle-assumptions battle-log-details">
          <summary><span>How this beta resolves a round</span><span>Model ${BATTLE_MODEL_VERSION}</span></summary>
          <div class="battle-assumptions-body">
            <ul>
              <li>Every living row attacks the enemy’s first living row.</li>
              <li>Combat Speed selects only the opening hit in Round 1; exact-speed ties open simultaneously.</li>
              <li>After the opener, remaining rows exchange simultaneously; later rounds are simultaneous exchanges.</li>
              <li>Might, Resistance, HP, and Damage affect troop basic attacks.</li>
              <li>Casualty rate is capped at 95%; casualties are floored, with at least 1 per valid hit and never more than the target row.</li>
              <li>A battle that has not resolved after ${BATTLE_MODEL_ASSUMPTIONS.maxRounds} rounds ends as a round-limit stalemate.</li>
              <li>Tactical Might and Tactical Resistance are saved but inactive until hero skills arrive.</li>
              <li>Batch runs use a visible seed and optional per-hit variance, so results can be reproduced.</li>
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
              <button class="battle-secondary-button" type="button" data-battle-reset>Reset setup</button>
              <button class="battle-primary-button" type="submit" data-battle-run>${icon('play')}<span>Run 1 simulation</span></button>
            </div>
          </div>
        </form>

        <section id="battleResults" class="battle-results" aria-labelledby="battleResultsTitle" hidden></section>
      </main>

      <footer class="battle-footer">
        <span>VTS 1097 · Battle Simulator Beta · v${APP_VERSION}</span>
        <span>Free fan-made community tool · Not affiliated with Camel Games</span>
      </footer>
    </div>
    <div class="battle-toast-region" aria-live="polite" aria-atomic="true"></div>`;
}

function renderRunPanel() {
  return `
    <section class="battle-run-panel" aria-labelledby="battleRunSetupTitle">
      <div class="battle-panel-heading">
        <p class="battle-section-kicker">Simulation control</p>
        <h2 id="battleRunSetupTitle">Run one battle or a reproducible batch</h2>
        <p>Batch averages use seeded ±5% strike variance by default. Set variance to 0% for repeated exact runs.</p>
      </div>
      <fieldset class="battle-run-count">
        <legend>Simulations</legend>
        <div class="battle-run-options">
          ${BATTLE_BATCH_PRESETS.map(
            (count) => `
              <label class="battle-run-option">
                <input type="radio" name="battleIterations" value="${count}" ${count === state.iterations ? 'checked' : ''} />
                <span>${count}<small>${count === 1 ? 'Exact' : 'runs'}</small></span>
              </label>`
          ).join('')}
        </div>
      </fieldset>
      <div class="battle-run-advanced">
        <label class="battle-field">
          <span>Seed</span>
          <input name="battleSeed" type="number" min="0" max="4294967295" step="1" value="${state.seed}" inputmode="numeric" autocomplete="off" required />
          <small class="battle-field-hint">Reuse this seed to reproduce a batch.</small>
        </label>
        <label class="battle-field">
          <span>Strike variance</span>
          <span class="battle-input-suffix">
            <input name="battleVariance" type="number" min="0" max="25" step="0.1" value="${state.strikeVariancePct}" inputmode="decimal" autocomplete="off" required disabled />
            <span>%</span>
          </span>
          <small class="battle-field-hint">Applied per hit only in batch mode.</small>
        </label>
      </div>
    </section>`;
}

function renderSetupToolbar() {
  return `
    <section class="battle-setup-toolbar" aria-labelledby="battleSetupToolbarTitle">
      <div class="battle-panel-heading">
        <p class="battle-section-kicker">Setup</p>
        <h2 id="battleSetupToolbarTitle" tabindex="-1">Move and reuse complete battle setups</h2>
        <p>Setup files and named presets retain both stat-entry modes, side defaults, row overrides, and run controls.</p>
      </div>
      <div class="battle-setup-actions" aria-label="Setup file actions">
        <button class="battle-secondary-button battle-side-action-button" type="button" data-copy-side-a-to-b>Copy A → B</button>
        <button class="battle-secondary-button battle-side-action-button" type="button" data-swap-sides>Swap sides</button>
        <button class="battle-secondary-button" type="button" data-setup-export>Export setup</button>
        <label class="battle-file-button">
          <span>Import setup</span>
          <input data-setup-file type="file" accept=".json,application/json" />
        </label>
      </div>
      <div class="battle-preset-controls">
        <label class="battle-field battle-preset-name-field">
          <span>Preset name</span>
          <input data-preset-name type="text" minlength="1" maxlength="40" autocomplete="off" placeholder="e.g. Field test 1" />
        </label>
        <button class="battle-secondary-button" type="button" data-preset-save>Save preset</button>
        <label class="battle-field battle-preset-select-field">
          <span>Saved presets</span>
          <select data-preset-select aria-label="Saved battle setup presets">
            <option value="">Choose a preset</option>
          </select>
        </label>
        <button class="battle-secondary-button" type="button" data-preset-load disabled>Load</button>
        <button class="battle-text-button battle-danger-text-button" type="button" data-preset-delete disabled>Delete</button>
      </div>
      <p class="battle-setup-hint">Presets stay in this browser only. Save up to ${MAX_BATTLE_SETUP_PRESETS}; use Export setup to move one to another device.</p>
      <details class="battle-paste-setup">
        <summary>Paste setup JSON</summary>
        <div class="battle-paste-setup-body">
          <label class="battle-field">
            <span>Setup JSON</span>
            <textarea data-setup-json rows="7" spellcheck="false" autocomplete="off" placeholder="Paste a Battle Simulator setup snapshot here"></textarea>
          </label>
          <button class="battle-secondary-button" type="button" data-setup-import-paste>Import pasted JSON</button>
        </div>
      </details>
    </section>`;
}

function renderSide(sideId) {
  const side = state.sides[sideId];
  const enteredLabel = side.mode === STAT_INPUT_MODES.ADD_BONUSES ? 'Extra' : 'Final input';
  return `
    <fieldset class="battle-side-panel" data-side="${sideId}">
      <legend class="battle-visually-hidden">Side ${sideId} formation</legend>
      <div class="battle-side-header">
        <div class="battle-side-heading">
          <p class="battle-side-kicker">Side ${sideId}</p>
          <h2>${sideId === 'A' ? 'Ice Formation' : 'Fire Formation'}</h2>
          <p>Independent row stats · ${enteredLabel} mode</p>
        </div>
        <fieldset class="battle-mode-fieldset">
          <legend>Stat entry for Side ${sideId}</legend>
          <div class="battle-mode-group">
            <label class="battle-mode-option">
              <input type="radio" name="side${sideId}Mode" value="${STAT_INPUT_MODES.ADD_BONUSES}" data-mode-side="${sideId}" ${side.mode === STAT_INPUT_MODES.ADD_BONUSES ? 'checked' : ''} />
              <span>Add bonuses</span>
            </label>
            <label class="battle-mode-option">
              <input type="radio" name="side${sideId}Mode" value="${STAT_INPUT_MODES.FINAL_TOTALS}" data-mode-side="${sideId}" ${side.mode === STAT_INPUT_MODES.FINAL_TOTALS ? 'checked' : ''} />
              <span>Enter final totals</span>
            </label>
          </div>
        </fieldset>
      </div>
      ${renderSideDefaults(sideId)}
      <div class="battle-squad-list">
        ${side.rows.map((row, index) => renderRow(sideId, row, index)).join('')}
      </div>
    </fieldset>`;
}

function renderSideDefaults(sideId) {
  const side = state.sides[sideId];
  const defaults = side.sideDefaults;
  const calculation = getEntityCalculation(sideId, defaults);
  const profile = getTroopProfile(defaults.type, defaults.tier);
  const entered = side.mode === STAT_INPUT_MODES.ADD_BONUSES ? defaults.bonuses : defaults.finals;
  const enteredLabel = side.mode === STAT_INPUT_MODES.ADD_BONUSES ? 'Extra' : 'Final input';
  return `
    <details class="battle-side-setup" data-side-defaults="${sideId}">
      <summary>
        <span>
          <strong>Side setup (applies to all rows)</strong>
          <small>${profile.label} · ${INTEGER_FORMAT.format(Number(defaults.troops) || 0)} troops · ${entitySummary(sideId, defaults)}</small>
        </span>
        <span class="battle-summary-chevron">${icon('chevron')}</span>
      </summary>
      <div class="battle-side-setup-body">
        <div class="battle-squad-controls">
          <label class="battle-field">
            <span>Troop type</span>
            <select data-side-default-field="type" aria-label="Side ${sideId} default troop type">
              ${TROOP_TYPES.map((type) => `<option value="${type}" ${type === defaults.type ? 'selected' : ''}>${type === 'cavalry' ? 'Cavalry' : type === 'archers' ? 'Archers' : 'Footmen'}</option>`).join('')}
            </select>
          </label>
          <label class="battle-field">
            <span>Tier</span>
            <select data-side-default-field="tier" aria-label="Side ${sideId} default troop tier">
              ${TROOP_TIERS.map((tier) => `<option value="${tier}" ${tier === defaults.tier ? 'selected' : ''}>T${tier}</option>`).join('')}
            </select>
          </label>
          <label class="battle-field">
            <span>Troops</span>
            <input data-side-default-field="troops" type="number" min="0" max="10000000" step="1" value="${defaults.troops}" inputmode="numeric" autocomplete="off" aria-label="Side ${sideId} default troop count" required />
          </label>
        </div>
        <div class="battle-stat-table-wrap">
          <table class="battle-stat-table">
            <caption class="battle-visually-hidden">Side ${sideId} default final combat stats</caption>
            <thead><tr><th scope="col">Stat</th><th scope="col">Base</th><th scope="col">${enteredLabel}</th><th scope="col">Final</th></tr></thead>
            <tbody>
              ${STAT_DISPLAY_ORDER.map((key) => renderStatRow(sideId, 'side default', defaults, key, profile, calculation, entered[key], 'side-default')).join('')}
            </tbody>
          </table>
        </div>
        <div class="battle-side-setup-footer">
          <p>Apply to all rows overwrites every row, including customized ones.</p>
          <button class="battle-secondary-button" type="button" data-apply-side-defaults="${sideId}">Apply to all rows</button>
        </div>
      </div>
    </details>`;
}

function formatStat(value, key, { empty = '—' } = {}) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return empty;
  const formatted = NUMBER_FORMAT.format(numeric);
  return TROOP_STAT_METADATA[key].unit === 'percent' ? `${formatted}%` : formatted;
}

function getEntityCalculation(sideId, entity) {
  const side = state.sides[sideId];
  const values = side.mode === STAT_INPUT_MODES.ADD_BONUSES ? entity.bonuses : entity.finals;
  if (
    TROOP_STAT_KEYS.some((key) => values[key] === '' || !Number.isFinite(Number(values[key]))) ||
    ['might', 'resistance', 'hp'].some(
      (key) => entity.baseValues[key] === '' || !Number.isFinite(Number(entity.baseValues[key]))
    )
  ) {
    return null;
  }
  return calculateTroopStats({
    type: entity.type,
    tier: entity.tier,
    mode: side.mode,
    baseValues: entity.baseValues,
    values,
  });
}

function getRowCalculation(sideId, row) {
  return getEntityCalculation(sideId, row);
}

function entitySummary(sideId, entity) {
  const calculation = getEntityCalculation(sideId, entity);
  if (!calculation) return 'Complete the stats';
  const { final } = calculation;
  return `M ${formatStat(final.might, 'might')} · R ${formatStat(final.resistance, 'resistance')} · HP ${formatStat(final.hp, 'hp')} · SPD ${formatStat(final.combatSpeed, 'combatSpeed')}`;
}

function rowSummary(sideId, row) {
  return entitySummary(sideId, row).replace('Complete the stats', 'Complete the row stats');
}

function renderRow(sideId, row, index) {
  const side = state.sides[sideId];
  const rowDefinition = BATTLE_ROWS[index];
  const calculation = getRowCalculation(sideId, row);
  const profile = getTroopProfile(row.type, row.tier);
  const entered = side.mode === STAT_INPUT_MODES.ADD_BONUSES ? row.bonuses : row.finals;
  const enteredLabel = side.mode === STAT_INPUT_MODES.ADD_BONUSES ? 'Extra' : 'Final input';
  return `
    <details class="battle-squad-card" data-side="${sideId}" data-row-index="${index}" ${row.open ? 'open' : ''}>
      <summary class="battle-squad-summary">
        <span class="battle-row-marker">${index + 1}</span>
        <span class="battle-squad-summary-copy">
          <span class="battle-row-heading"><strong>${rowDefinition.label} · ${profile.label}</strong><span class="battle-row-state" data-row-customized ${row.customized ? '' : 'hidden'}>Customized</span></span>
          <span data-row-summary>${INTEGER_FORMAT.format(Number(row.troops) || 0)} troops · ${rowSummary(sideId, row)}</span>
        </span>
        <span class="battle-summary-chevron">${icon('chevron')}</span>
      </summary>
      <div class="battle-squad-body">
        <div class="battle-squad-controls">
          <label class="battle-field">
            <span>Troop type</span>
            <select data-row-field="type" aria-label="Side ${sideId} ${rowDefinition.label} troop type">
              ${TROOP_TYPES.map((type) => `<option value="${type}" ${type === row.type ? 'selected' : ''}>${type === 'cavalry' ? 'Cavalry' : type === 'archers' ? 'Archers' : 'Footmen'}</option>`).join('')}
            </select>
          </label>
          <label class="battle-field">
            <span>Tier</span>
            <select data-row-field="tier" aria-label="Side ${sideId} ${rowDefinition.label} troop tier">
              ${TROOP_TIERS.map((tier) => `<option value="${tier}" ${tier === row.tier ? 'selected' : ''}>T${tier}</option>`).join('')}
            </select>
          </label>
          <label class="battle-field">
            <span>Troops</span>
            <input data-row-field="troops" type="number" min="0" max="10000000" step="1" value="${row.troops}" inputmode="numeric" autocomplete="off" aria-label="Side ${sideId} ${rowDefinition.label} troop count" required />
          </label>
        </div>
        <div class="battle-stat-table-wrap">
          <table class="battle-stat-table">
            <caption class="battle-visually-hidden">Side ${sideId} ${rowDefinition.label} final combat stats</caption>
            <thead><tr><th scope="col">Stat</th><th scope="col">Base</th><th scope="col">${enteredLabel}</th><th scope="col">Final</th></tr></thead>
            <tbody>
              ${STAT_DISPLAY_ORDER.map((key) => renderStatRow(sideId, rowDefinition.label, row, key, profile, calculation, entered[key], 'row')).join('')}
            </tbody>
          </table>
        </div>
        <div class="battle-row-footer">
          <p class="battle-tactical-note">Attack/Might, Defense/Resistance, and HP start from the selected tier preset but remain independently editable for each player row. * A dash means the troop card did not supply a base; its calculation baseline is zero. Tactical stats are saved for future phases.</p>
          <button class="battle-text-button" type="button" data-reset-row-defaults ${row.customized ? '' : 'hidden'}>Reset to side defaults</button>
        </div>
      </div>
    </details>`;
}

function renderStatRow(
  sideId,
  contextLabel,
  entity,
  key,
  profile,
  calculation,
  enteredValue,
  scope
) {
  const metadata = TROOP_STAT_METADATA[key];
  const inactive = TACTICAL_STATS.has(key);
  const displayLabel =
    key === 'might'
      ? 'Might / Attack'
      : key === 'resistance'
        ? 'Resistance / Defense'
        : metadata.label;
  const baseAttribute =
    scope === 'side-default' ? 'data-side-default-base-stat' : 'data-base-stat-input';
  const statAttribute = scope === 'side-default' ? 'data-side-default-stat' : 'data-stat';
  const baseText = metadata.baseSourceAvailable
    ? `<input class="battle-stat-input battle-base-input" ${baseAttribute}="${key}" type="number" min="0" max="5000" step="0.01" value="${entity.baseValues[key]}" inputmode="decimal" autocomplete="off" aria-label="Side ${sideId} ${contextLabel} editable base ${metadata.label}" title="Preset ${formatStat(profile.baseStats[key], key)} · ${metadata.source}" required />`
    : '<span class="battle-base-value">—*</span>';
  const finalText = calculation ? formatStat(calculation.final[key], key) : '—';
  const modeLabel =
    state.sides[sideId].mode === STAT_INPUT_MODES.ADD_BONUSES ? 'extra bonus' : 'final total';
  const enteredColumnLabel =
    state.sides[sideId].mode === STAT_INPUT_MODES.ADD_BONUSES ? 'Extra' : 'Final input';
  const maximum = key === 'combatSpeed' ? 10000 : 5000;
  return `
    <tr data-stat-row="${key}">
      <th scope="row">
        <span class="battle-stat-label">${displayLabel}${inactive ? '<span class="battle-inactive-chip">Future</span>' : ''}</span>
      </th>
      <td data-base-stat="${key}" data-mobile-label="Base">${baseText}</td>
      <td data-mobile-label="${enteredColumnLabel}">
        <input class="battle-stat-input" ${statAttribute}="${key}" type="number" min="0" max="${maximum}" step="0.01" value="${enteredValue}" inputmode="decimal" autocomplete="off" aria-label="Side ${sideId} ${contextLabel} ${metadata.label} ${modeLabel}" required />
      </td>
      <td data-mobile-label="Final"><output class="battle-final-value" data-final-stat="${key}">${finalText}</output></td>
    </tr>`;
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
  document.documentElement.toggleAttribute('data-theme', theme === 'light');
  document
    .getElementById('themeColorMeta')
    ?.setAttribute('content', theme === 'light' ? '#f8fafc' : '#0f172a');
  document
    .getElementById('manifestLink')
    ?.setAttribute('href', theme === 'light' ? 'site-light.webmanifest' : 'site.webmanifest');
  const button = root?.querySelector('#battleThemeToggle');
  button?.setAttribute('aria-pressed', String(theme === 'light'));
  button?.setAttribute('aria-label', `Switch to ${theme === 'light' ? 'dark' : 'light'} theme`);
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
  if (runButton)
    runButton.textContent = `Run ${iterations} simulation${iterations === 1 ? '' : 's'}`;
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
      counts.A ? `Side A: ${counts.A}` : '',
      counts.B ? `Side B: ${counts.B}` : '',
      counts.setup ? `Run setup: ${counts.setup}` : '',
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
    const nextLabel = `${groups.join(' · ')} field${invalidControls.length === 1 ? ' needs' : 's need'} attention`;
    if (label.textContent !== nextLabel) label.textContent = nextLabel;
    const groupedCounts = button.querySelector('span');
    const nextHint = 'Focus the first highlighted field';
    if (groupedCounts.textContent !== nextHint) groupedCounts.textContent = nextHint;
    return;
  }

  const summary = document.createElement('strong');
  summary.className = 'battle-run-bar-summary';
  summary.textContent = `A: ${formatCompactTroops(sideTroopTotal('A'))} troops vs B: ${formatCompactTroops(sideTroopTotal('B'))} troops · ${INTEGER_FORMAT.format(Number(state.iterations))} run${Number(state.iterations) === 1 ? '' : 's'}`;
  status.replaceChildren(summary);
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
  const profile = getTroopProfile(row.type, row.tier);
  const strong = card.querySelector('.battle-squad-summary-copy strong');
  const summary = card.querySelector('[data-row-summary]');
  const customizedBadge = card.querySelector('[data-row-customized]');
  const resetButton = card.querySelector('[data-reset-row-defaults]');
  if (strong) strong.textContent = `${BATTLE_ROWS[rowIndex].label} · ${profile.label}`;
  if (summary)
    summary.textContent = `${INTEGER_FORMAT.format(Number(row.troops) || 0)} troops · ${rowSummary(sideId, row)}`;
  customizedBadge?.toggleAttribute('hidden', !row.customized);
  resetButton?.toggleAttribute('hidden', !row.customized);
  for (const key of STAT_DISPLAY_ORDER) {
    const base = card.querySelector(`[data-base-stat="${key}"]`);
    const final = card.querySelector(`[data-final-stat="${key}"]`);
    if (base) {
      if (TROOP_STAT_METADATA[key].baseSourceAvailable) {
        const input = base.querySelector('[data-base-stat-input]');
        if (input && document.activeElement !== input) input.value = row.baseValues[key];
        if (input) {
          input.title = `Preset ${formatStat(profile.baseStats[key], key)} · ${TROOP_STAT_METADATA[key].source}`;
        }
      } else {
        base.textContent = '—*';
        base.title = TROOP_STAT_METADATA[key].source;
      }
    }
    if (final) final.textContent = calculation ? formatStat(calculation.final[key], key) : '—';
  }
}

function refreshSideDefaults(sideId) {
  const side = state.sides[sideId];
  const defaults = side.sideDefaults;
  const panel = form?.querySelector(`[data-side-defaults="${sideId}"]`);
  if (!panel) return;
  const calculation = getEntityCalculation(sideId, defaults);
  const profile = getTroopProfile(defaults.type, defaults.tier);
  const summary = panel.querySelector('summary small');
  if (summary) {
    summary.textContent = `${profile.label} · ${INTEGER_FORMAT.format(Number(defaults.troops) || 0)} troops · ${entitySummary(sideId, defaults)}`;
  }
  for (const key of STAT_DISPLAY_ORDER) {
    const base = panel.querySelector(`[data-base-stat="${key}"]`);
    const final = panel.querySelector(`[data-final-stat="${key}"]`);
    if (base) {
      if (TROOP_STAT_METADATA[key].baseSourceAvailable) {
        const input = base.querySelector('[data-side-default-base-stat]');
        if (input && document.activeElement !== input) input.value = defaults.baseValues[key];
        if (input) {
          input.title = `Preset ${formatStat(profile.baseStats[key], key)} · ${TROOP_STAT_METADATA[key].source}`;
        }
      } else {
        base.textContent = '—*';
        base.title = TROOP_STAT_METADATA[key].source;
      }
    }
    if (final) final.textContent = calculation ? formatStat(calculation.final[key], key) : '—';
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
      ? `Side ${sideId}: restored its saved bonus inputs.`
      : `Side ${sideId}: restored its saved final-total inputs.`
  );
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
    const preset = getTroopProfile(row.type, row.tier).baseStats;
    row.baseValues = { might: preset.might, resistance: preset.resistance, hp: preset.hp };
  } else if (target.matches('[data-row-field="tier"]')) {
    row.tier = Number(target.value);
    const preset = getTroopProfile(row.type, row.tier).baseStats;
    row.baseValues = { might: preset.might, resistance: preset.resistance, hp: preset.hp };
  } else if (target.matches('[data-row-field="troops"]')) {
    row.troops = target.value === '' ? '' : Number(target.value);
  } else if (target.matches('[data-base-stat-input]')) {
    row.baseValues[target.dataset.baseStatInput] = target.value === '' ? '' : Number(target.value);
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
    const preset = getTroopProfile(defaults.type, defaults.tier).baseStats;
    defaults.baseValues = { might: preset.might, resistance: preset.resistance, hp: preset.hp };
  } else if (target.matches('[data-side-default-field="tier"]')) {
    defaults.tier = Number(target.value);
    const preset = getTroopProfile(defaults.type, defaults.tier).baseStats;
    defaults.baseValues = { might: preset.might, resistance: preset.resistance, hp: preset.hp };
  } else if (target.matches('[data-side-default-field="troops"]')) {
    defaults.troops = target.value === '' ? '' : Number(target.value);
  } else if (target.matches('[data-side-default-base-stat]')) {
    defaults.baseValues[target.dataset.sideDefaultBaseStat] =
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
    showValidation(`Complete the Side ${sideId} defaults before applying them.`, invalidControl);
    return;
  }
  side.rows.forEach((row) => copySideDefaultsToRow(row, side.sideDefaults));
  replaceSide(sideId);
  markResultsStale();
  requestAnimationFrame(() => {
    form?.querySelector(`[data-apply-side-defaults="${sideId}"]`)?.focus({ preventScroll: true });
  });
  showToast(`Side ${sideId} defaults applied to all rows.`);
}

function resetRowToSideDefaults(sideId, rowIndex) {
  const side = state.sides[sideId];
  const row = side?.rows[rowIndex];
  if (!row) return;
  const defaultsPanel = form?.querySelector(`[data-side-defaults="${sideId}"]`);
  const invalidControl = defaultsPanel?.querySelector(INVALID_CONTROL_SELECTOR);
  if (invalidControl) {
    showValidation(
      `Complete the Side ${sideId} defaults before resetting this row.`,
      invalidControl
    );
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
  showToast(`Side ${sideId} ${BATTLE_ROWS[rowIndex].label} reset to side defaults.`);
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
  invalidControl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
    summary.textContent = `Check the highlighted value. Every field must stay within its allowed range. ${nextInvalid.validationMessage}`;
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
        presetStats: { ...calculation.profile.baseStats },
        baseStats: { ...calculation.base },
        statInputMode: sideState.mode,
        enteredStats: { ...calculation.entered },
        stats: { ...calculation.final },
      };
    });
    if (rows.every((row) => row.troops === 0)) {
      throw new RangeError(`Side ${sideId} needs troops in at least one row.`);
    }
    sides[sideId] = { label: `Side ${sideId}`, rows };
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
        ? 'Resolving the exact scenario...'
        : `Running ${INTEGER_FORMAT.format(iterations)} seeded simulations without blocking this page...`;
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
  if (outcome === 'A') return 'Side A wins';
  if (outcome === 'B') return 'Side B wins';
  if (outcome === 'draw') return 'Draw';
  return 'Round-limit stalemate';
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
  const detail = `Side A win rate: ${rate('A')}% · Side B win rate: ${rate('B')}% · Draws: ${counts.draw} · Stalemates: ${counts.stalemate}`;

  if (leaders.length !== 1) {
    return {
      tone: 'is-neutral',
      title: `No clear winner across ${runCount} runs`,
      detail,
    };
  }

  const leader = leaders[0];
  if (leader === 'draw') {
    return {
      tone: 'is-neutral',
      title: `Draw in ${counts.draw} of ${runCount} runs (${rate('draw')}%)`,
      detail,
    };
  }
  if (leader === 'stalemate') {
    return {
      tone: 'is-neutral',
      title: `Stalemate in ${counts.stalemate} of ${runCount} runs (${rate('stalemate')}%)`,
      detail,
    };
  }

  const loserSide = leader === 'A' ? 'B' : 'A';
  return {
    tone: leader === 'A' ? 'is-success' : 'is-danger',
    title: `Side ${leader} wins ${counts[leader]} of ${runCount} runs (${rate(leader)}%)`,
    detail: `Side ${loserSide} win rate: ${rate(loserSide)}% · Draws: ${counts.draw} · Stalemates: ${counts.stalemate}`,
  };
}

function renderVerdictBanner(isBatch, result) {
  if (!isBatch) {
    if (result.outcome === 'A' || result.outcome === 'B') {
      const tone = result.outcome === 'A' ? 'is-success' : 'is-danger';
      return `<div class="battle-verdict-banner ${tone}" role="status"><strong>Side ${result.outcome} wins in ${result.rounds} rounds</strong></div>`;
    }
    const verdict =
      result.outcome === 'draw'
        ? 'Draw'
        : `Stalemate (${BATTLE_MODEL_ASSUMPTIONS.maxRounds} round cap)`;
    return `<div class="battle-verdict-banner is-neutral" role="status"><strong>${verdict}</strong></div>`;
  }

  const verdict = getBatchVerdict(result);
  return `
    <div class="battle-verdict-banner ${verdict.tone}" role="status">
      <strong>${verdict.title}</strong>
      <span>${verdict.detail}</span>
    </div>`;
}

function renderResults() {
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
    heading = `${result.runCount} simulations complete`;
    subheading = `Batch seed ${result.seed} · ±${NUMBER_FORMAT.format(result.strikeVariancePct)}% per-hit variance · representative run #${lastRun.representative?.runNumber || 1} (seed ${lastRun.representative?.seed ?? result.seed})`;
    outcomeHtml = [
      outcomeCard(
        'Side A wins',
        PERCENT_FORMAT.format((result.winRates.A || 0) * 100) + '%',
        `${result.winCounts.A} runs`,
        'var(--battle-side-a)'
      ),
      outcomeCard(
        'Side B wins',
        PERCENT_FORMAT.format((result.winRates.B || 0) * 100) + '%',
        `${result.winCounts.B} runs`,
        'var(--battle-side-b)'
      ),
      outcomeCard(
        'Draws',
        PERCENT_FORMAT.format((result.winRates.draw || 0) * 100) + '%',
        `${result.winCounts.draw} runs`,
        'var(--ff-warning)'
      ),
      outcomeCard(
        'Stalemates',
        PERCENT_FORMAT.format((result.winRates.stalemate || 0) * 100) + '%',
        `${result.winCounts.stalemate} runs`,
        'var(--ff-text-dim)'
      ),
    ].join('');
    metricsHtml = [
      metricCard(
        'Average rounds',
        NUMBER_FORMAT.format(result.averageRounds),
        `Median ${NUMBER_FORMAT.format(stats.median)}`
      ),
      metricCard('Round range', `${stats.minimum}–${stats.maximum}`, 'Shortest to longest'),
      metricCard(
        'Avg. Side A left',
        INTEGER_FORMAT.format(result.averageTotalSurvivors.A),
        `${INTEGER_FORMAT.format(result.averageTotalCasualties.A)} casualties`
      ),
      metricCard(
        'Avg. Side B left',
        INTEGER_FORMAT.format(result.averageTotalSurvivors.B),
        `${INTEGER_FORMAT.format(result.averageTotalCasualties.B)} casualties`
      ),
    ].join('');
  } else {
    heading = outcomeName(result.outcome);
    subheading = `Completed in ${result.rounds} round${result.rounds === 1 ? '' : 's'} · seed ${result.seed} · exact mode`;
    outcomeHtml = [
      outcomeCard(
        'Outcome',
        outcomeName(result.outcome),
        result.reason.replaceAll('-', ' '),
        result.outcome === 'A'
          ? 'var(--battle-side-a)'
          : result.outcome === 'B'
            ? 'var(--battle-side-b)'
            : 'var(--ff-warning)'
      ),
      outcomeCard(
        'Rounds',
        INTEGER_FORMAT.format(result.rounds),
        `Maximum 200`,
        'var(--ff-seasonal)'
      ),
      outcomeCard(
        'Side A left',
        INTEGER_FORMAT.format(result.survivors.A),
        `${INTEGER_FORMAT.format(result.casualties.A)} casualties`,
        'var(--battle-side-a)'
      ),
      outcomeCard(
        'Side B left',
        INTEGER_FORMAT.format(result.survivors.B),
        `${INTEGER_FORMAT.format(result.casualties.B)} casualties`,
        'var(--battle-side-b)'
      ),
    ].join('');
    metricsHtml = [
      metricCard(
        'Opening initiative',
        result.openingInitiative?.side === 'tie'
          ? 'Speed tie'
          : `Side ${result.openingInitiative?.side || '—'}`,
        `Combat Speed ${NUMBER_FORMAT.format(result.openingInitiative?.combatSpeed || 0)}`
      ),
      metricCard(
        'Side A survival',
        PERCENT_FORMAT.format(initialA ? (result.survivors.A / initialA) * 100 : 0) + '%',
        `${INTEGER_FORMAT.format(initialA)} deployed`
      ),
      metricCard(
        'Side B survival',
        PERCENT_FORMAT.format(initialB ? (result.survivors.B / initialB) * 100 : 0) + '%',
        `${INTEGER_FORMAT.format(initialB)} deployed`
      ),
      metricCard('Model', BATTLE_MODEL_VERSION, 'Troop-only foundation'),
    ].join('');
  }

  const survivalA = isBatch ? result.averageTotalSurvivors.A : result.survivors.A;
  const survivalB = isBatch ? result.averageTotalSurvivors.B : result.survivors.B;
  resultsElement.innerHTML = `
    <div class="battle-results-panel">
      <div class="battle-results-heading">
        <div>
          <p class="battle-section-kicker">Battle output</p>
          <h2 id="battleResultsTitle" tabindex="-1">${heading}</h2>
          <p>${subheading}</p>
        </div>
        <div class="battle-result-actions" role="group" aria-label="Export results">
          <button class="battle-export-button" type="button" data-battle-export="json">Full JSON</button>
          <button class="battle-export-button" type="button" data-battle-export="summary-csv">Summary CSV</button>
          <button class="battle-export-button" type="button" data-battle-export="log-csv">Selected log CSV</button>
          <button class="battle-export-button" type="button" data-battle-export="copy">Copy debug</button>
          <button class="battle-export-button" type="button" data-battle-export="calibration">Calibration fixture</button>
        </div>
      </div>
      ${renderVerdictBanner(isBatch, result)}
      <div class="battle-outcome-grid">${outcomeHtml}</div>
      <div class="battle-metric-grid">${metricsHtml}</div>
      <div class="battle-survival-board" aria-label="${isBatch ? 'Average surviving troops' : 'Surviving troops'}">
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
  resultsElement.querySelector('#battleResultsTitle')?.focus({ preventScroll: true });
  resultsElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderSurvivalRow(sideId, surviving, initial, color, average) {
  const percentage = initial ? Math.max(0, Math.min(100, (surviving / initial) * 100)) : 0;
  return `
    <div class="battle-survival-row">
      <strong>Side ${sideId}</strong>
      <span class="battle-survival-track"><span class="battle-survival-fill" style="--bar-color:${color};width:${percentage}%"></span></span>
      <output>${average ? 'Avg. ' : ''}${INTEGER_FORMAT.format(surviving)} / ${INTEGER_FORMAT.format(initial)}</output>
    </div>`;
}

function renderEventLog(result, representative) {
  const actions = result?.actionLog || [];
  if (actions.length === 0) {
    return '<p class="battle-model-note">No event log is available for this result.</p>';
  }
  return `
    <details class="battle-log-details" data-battle-log>
      <summary><span>${representative ? 'Representative run event log' : 'Round event log'}</span><span>${actions.length} strikes</span></summary>
      <div class="battle-log-table-wrap" data-battle-log-content tabindex="0" role="region" aria-label="Battle strikes in action order">
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
  lastRun = null;
  root.innerHTML = pageTemplate();
  bindUI();
  applyTheme(getTheme());
  const heading = root.querySelector('#battleSetupToolbarTitle');
  heading?.focus({ preventScroll: true });
  heading?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  showToast(message);
}

function importSetupText(jsonText) {
  const snapshot = parseSetupSnapshot(jsonText);
  const nextState = applySetupSnapshot(state, snapshot);
  replaceSetupState(nextState, 'Setup imported');
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
  placeholder.textContent = 'Choose a preset';
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
  lastRun = null;
  root.innerHTML = pageTemplate();
  bindUI();
  applyTheme(getTheme());
  const title = root.querySelector('#battleSimulatorTitle');
  title?.focus({ preventScroll: true });
  title?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  showToast('Setup reset to troop presets.');
}

function bindUI() {
  form = root.querySelector('#battleSimulatorForm');
  root.querySelector('#battleThemeToggle')?.addEventListener('click', toggleTheme);
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

export function mountBattleSimulator(target) {
  if (!target) throw new Error('Battle Simulator mount element is missing.');
  root = target;
  const storedPresets = readPresetStore();
  presetStore = storedPresets.store;
  root.innerHTML = pageTemplate();
  bindUI();
  applyTheme(getTheme());
  root.querySelector('#battleSimulatorTitle')?.focus({ preventScroll: true });
  if (storedPresets.error) showToast(storedPresets.error);
}
