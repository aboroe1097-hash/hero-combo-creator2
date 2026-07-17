import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  BATTLE_ROWS,
  BATTLE_STAT_KEYS,
  DEFAULT_TROOPS,
  STAT_INPUT_MODES,
  UNIT_STAT_KEYS,
  getTroopProfile,
} from '../../js/battle-simulator-data.js';
import {
  BATTLE_BATCH_PRESETS,
  BATTLE_MODEL_ASSUMPTIONS,
  simulateBattleBatch,
} from '../../js/battle-simulator-engine.js';
import {
  calculateMedian,
  copyBattleSideSetup,
  getBatchVerdict,
  shouldDisableStrikeVariance,
  swapBattleSides,
} from '../../js/battle-simulator-app.js';
import {
  createDefaultEquipmentLoadout,
  createEquipmentSetLoadout,
} from '../../js/battle-simulator-equipment.js';
import { createEmptyResearchSnapshot } from '../../js/battle-simulator-research.js';
import { createEmptyCapturedSourceSnapshot } from '../../js/battle-simulator-setup.js';
import { runBattleBatchWorkerRequest } from '../../js/battle-simulator-worker.js';

const pageSource = readFileSync('battle-simulator.html', 'utf8');
const bootstrapSource = readFileSync('js/battle-simulator.js', 'utf8');
const appSource = readFileSync('js/battle-simulator-app.js', 'utf8');
const battleCssSource = readFileSync('css/battle-simulator.css', 'utf8');
const viteSource = readFileSync('vite.config.js', 'utf8');
const indexSource = readFileSync('index.html', 'utf8');
const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));

function between(source, start, end) {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);
  assert.notEqual(startIndex, -1, `Missing ${start}`);
  assert.notEqual(endIndex, -1, `Missing ${end}`);
  return source.slice(startIndex, endIndex);
}

function battleStats(value = 0) {
  return Object.fromEntries(BATTLE_STAT_KEYS.map((key) => [key, value]));
}

function finalBattleStats() {
  return { ...battleStats(), might: 100, resistance: 100, hp: 100 };
}

function editableFixture(type, tier, troops, bonus) {
  return {
    type,
    tier,
    troops,
    unitValues: { ...getTroopProfile(type, tier).unitStats },
    bonuses: { ...battleStats(), might: bonus },
    finals: finalBattleStats(),
  };
}

function sideFixture(type, tier, troops, bonus, customized, withEquipment = false) {
  const sideDefaults = editableFixture(type, tier, troops, bonus);
  const researchSnapshot = {
    ...createEmptyResearchSnapshot(),
    diagnostics: [{ code: 'fixture', severity: 'info', message: 'Fixture', sourceId: 'fixture' }],
  };
  const capturedSourceSnapshot = {
    ...createEmptyCapturedSourceSnapshot(),
    diagnostics: [{ code: 'fixture', severity: 'info', message: 'Fixture', sourceId: 'fixture' }],
  };
  return {
    mode: STAT_INPUT_MODES.ADD_BONUSES,
    researchEnabled: type === 'footmen',
    researchSnapshot,
    equipmentLoadout: withEquipment
      ? createEquipmentSetLoadout({ setId: 'normal.steel-cavalry', gradeId: 'gold' })
      : createDefaultEquipmentLoadout(),
    capturedSourceSnapshot,
    sideDefaults,
    rows: BATTLE_ROWS.map(({ id }, index) => ({
      id,
      ...editableFixture(type, tier, troops + index, bonus + index),
      open: index === 0,
      customized: index === 1 ? customized : false,
    })),
  };
}

function appStateFixture() {
  return {
    battleMode: 'pvp-field',
    iterations: 100,
    seed: 1097,
    strikeVariancePct: 5,
    sides: {
      A: sideFixture('footmen', 9, 31_000, 10, false),
      B: sideFixture('cavalry', 10, 42_000, 20, true, true),
    },
  };
}

test('Battle Simulator remains a locked production entry with an empty protected mount', () => {
  assert.match(
    viteSource,
    /['"]battle-simulator['"]:\s*resolve\(__dirname,\s*'battle-simulator\.html'\)/
  );
  assert.match(pageSource, /css\/battle-simulator\.css\?v=[^"]+/);
  assert.match(pageSource, /js\/battle-simulator\.js\?v=[^"]+/);
  assert.match(pageSource, /<body class="battle-simulator-page is-locked">/);
  assert.match(pageSource, /<div id="battleSimulatorMount" hidden><\/div>/);
  assert.doesNotMatch(pageSource, /id="battleSimulatorForm"|data-battle-run|data-row-field/);
  assert.ok(
    pageSource.indexOf('js/admin-auth-config.js') < pageSource.indexOf('js/battle-simulator.js')
  );
});

test('bootstrap localizes PIN and boot copy before importing the protected app', () => {
  assert.match(bootstrapSource, /from '\.\/battle-simulator-i18n\.js'/);
  assert.doesNotMatch(bootstrapSource, /import \{ mountBattleSimulator \} from/);
  const start = between(bootstrapSource, 'async function start()', '\n}\n\nstart();');
  const localeIndex = start.indexOf('await loadBattleSimulatorLocale(locale)');
  const gateIndex = start.indexOf('await requireSensitiveAdminPin({');
  const deniedIndex = start.indexOf('if (!unlocked)');
  const appImportIndex = start.indexOf("await import('./battle-simulator-app.js')");
  assert.ok(localeIndex >= 0 && localeIndex < gateIndex);
  assert.ok(gateIndex < deniedIndex && deniedIndex < appImportIndex);
  for (const key of ['gate.kicker', 'gate.title', 'gate.prompt', 'gate.label', 'gate.error']) {
    assert.ok(start.includes(`translator.t('${key}')`), key);
  }
  assert.match(start, /await mountBattleSimulator\(mount, \{ locale \}\)/);
  assert.match(bootstrapSource, /translator\.t\('boot\.title'\)/);
  assert.match(bootstrapSource, /translator\.t\('boot\.copy'\)/);
});

test('UI state separates unit points from Battle multipliers and passes source-aware engine stats', () => {
  assert.equal(DEFAULT_TROOPS, 31_000);
  assert.deepEqual(UNIT_STAT_KEYS, ['attack', 'defense', 'hp']);
  assert.deepEqual(BATTLE_STAT_KEYS, [
    'might',
    'resistance',
    'hp',
    'tacticalMight',
    'tacticalResistance',
    'damage',
    'damageMitigation',
    'combatSpeed',
  ]);
  assert.match(appSource, /unitValues: \{ \.\.\.unit \}/);
  assert.match(appSource, /finals: finalStatsDefaults\(\)/);
  assert.match(appSource, /data-unit-stat-input/);
  assert.match(appSource, /data-side-default-unit-stat/);
  assert.match(appSource, /class="battle-stat-node is-core"/);
  assert.match(appSource, /class="battle-stat-equation"/);
  assert.match(appSource, /class="battle-stat-source-breakdown"/);
  assert.match(appSource, /sources: automaticSourcesForSide\(sideId\)/);
  assert.match(appSource, /unit: \{ \.\.\.calculation\.engineStats\.unit \}/);
  assert.match(appSource, /battle: \{ \.\.\.calculation\.engineStats\.battle \}/);
});

test('Legion sources expose saved Research and truthful whole-legion equipment completeness', () => {
  assert.match(appSource, /A: createSide\('footmen', 9, sideTypes, true\)/);
  assert.match(appSource, /B: createSide\('footmen', 10, sideTypes, false\)/);
  assert.match(appSource, /buildBattleResearchSnapshot\(\{ battleMode: state\.battleMode \}\)/);
  assert.match(appSource, /data-research-enabled/);
  assert.match(appSource, /data-refresh-research/);
  assert.match(appSource, /data-equipment-set/);
  assert.match(appSource, /data-equipment-grade/);
  assert.match(appSource, /data-equipment-enhancement/);
  assert.match(appSource, /equipment\.completeness === 'identity-only'/);
  assert.match(appSource, /equipment\.identityWarning/);
  assert.match(appSource, /equipment\.contributions/);
  assert.match(appSource, /schemaVersion: 1/);
  assert.match(appSource, /catalogRevisions:/);
});

test('copy and swap deep-clone Research, equipment, source audits, defaults, and rows', () => {
  const source = appStateFixture();
  const before = structuredClone(source);
  const copied = copyBattleSideSetup(source, 'A', 'B');

  assert.deepEqual(source, before);
  assert.deepEqual(copied.sides.B, copied.sides.A);
  assert.notStrictEqual(copied.sides.B, copied.sides.A);
  assert.notStrictEqual(copied.sides.B.researchSnapshot, copied.sides.A.researchSnapshot);
  assert.notStrictEqual(copied.sides.B.equipmentLoadout, copied.sides.A.equipmentLoadout);
  assert.notStrictEqual(
    copied.sides.B.capturedSourceSnapshot,
    copied.sides.A.capturedSourceSnapshot
  );
  assert.notStrictEqual(copied.sides.B.rows[0].unitValues, copied.sides.A.rows[0].unitValues);
  copied.sides.B.rows[0].unitValues.attack += 1;
  assert.notEqual(
    copied.sides.B.rows[0].unitValues.attack,
    copied.sides.A.rows[0].unitValues.attack
  );

  const swapped = swapBattleSides(source);
  assert.deepEqual(swapped.sides.A, before.sides.B);
  assert.deepEqual(swapped.sides.B, before.sides.A);
  assert.notStrictEqual(swapped.sides.A.equipmentLoadout, source.sides.B.equipmentLoadout);
  assert.notStrictEqual(swapped.sides.B.rows[0].finals, source.sides.A.rows[0].finals);
  assert.deepEqual(source, before);
});

test('setup, presets, copy/swap, and five diagnostic exports remain available', () => {
  for (const marker of [
    'data-copy-side-a-to-b',
    'data-swap-sides',
    'data-setup-export',
    'data-setup-file',
    'data-setup-json',
    'data-preset-save',
    'data-preset-load',
    'data-preset-delete',
  ]) {
    assert.match(appSource, new RegExp(marker));
  }
  assert.match(appSource, /buildSetupSnapshot/);
  assert.match(appSource, /parseSetupSnapshot/);
  assert.match(appSource, /applySetupSnapshot/);
  assert.match(appSource, /placeholder\.textContent\s*=\s*t\('setup\.choosePreset'\)/);
  assert.doesNotMatch(appSource, /placeholder\.textContent\s*=\s*['"]Choose a preset['"]/);
  const exportModes = Array.from(
    appSource.matchAll(/data-battle-export="([^"]+)"/g),
    (match) => match[1]
  );
  assert.deepEqual(exportModes, ['json', 'summary-csv', 'log-csv', 'copy', 'calibration']);
  assert.match(appSource, /buildBattleCalibrationFixture\(exportPayload\(\)\)/);
  assert.match(appSource, /setup:\s*lastRun\.setup/);
});

test('sticky run bar reports validation and the partial-model status without hiding Run', () => {
  assert.match(appSource, /data-run-status/);
  assert.match(appSource, /data-focus-first-invalid/);
  assert.match(appSource, /validation\.attention/);
  assert.match(appSource, /sideHasPartialModel\('A'\) \|\| sideHasPartialModel\('B'\)/);
  assert.match(appSource, /battle-run-partial-status/);
  assert.match(battleCssSource, /\.battle-form-actions\s*\{[\s\S]*?position:\s*fixed/);
  assert.match(battleCssSource, /--battle-run-bar-clearance/);
  assert.equal(shouldDisableStrikeVariance(1, 5), true);
  assert.equal(shouldDisableStrikeVariance(1, 30), false);
  assert.equal(shouldDisableStrikeVariance(100, 5), false);
});

test('source cards contain long localized status labels without overlapping adjacent cards', () => {
  const headingRules = between(battleCssSource, '.battle-source-card-heading {', '}');
  assert.match(headingRules, /display:\s*grid/);
  assert.match(headingRules, /grid-template-columns:\s*minmax\(0,\s*1fr\)/);
  assert.match(headingRules, /justify-items:\s*start/);
  assert.match(headingRules, /min-width:\s*0/);

  const titleRules = between(battleCssSource, '.battle-source-card-heading > div {', '}');
  assert.match(titleRules, /width:\s*100%/);
  assert.match(titleRules, /max-width:\s*100%/);
  assert.match(titleRules, /min-width:\s*0/);

  const statusRules = between(battleCssSource, '.battle-source-status {', '}');
  assert.match(statusRules, /display:\s*block/);
  assert.match(statusRules, /justify-self:\s*start/);
  assert.match(statusRules, /width:\s*fit-content/);
  assert.match(statusRules, /max-width:\s*100%/);
  assert.match(statusRules, /min-width:\s*0/);
  assert.match(statusRules, /overflow-wrap:\s*anywhere/);
  assert.match(statusRules, /white-space:\s*normal/);
  assert.match(statusRules, /line-height:\s*1\.35/);
});

test('equipment controls use a readable two-row desktop grid and stack below 1024px', () => {
  const controlsRules = between(battleCssSource, '.battle-equipment-controls {', '}');
  assert.match(controlsRules, /grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(
    battleCssSource,
    /\.battle-equipment-controls > \.battle-field:first-child\s*\{\s*grid-column:\s*1 \/ -1/
  );
  assert.match(
    battleCssSource,
    /@media \(max-width: 1024px\)\s*\{[\s\S]*?\.battle-equipment-controls\s*\{\s*grid-template-columns:\s*1fr/
  );
});

test('verdict banner remains deterministic and does not invent a batch winner', () => {
  assert.match(appSource, /renderVerdictBanner\(isBatch, result\)/);
  assert.match(battleCssSource, /\.battle-verdict-banner\.is-success/);
  assert.match(battleCssSource, /\.battle-verdict-banner\.is-danger/);
  assert.deepEqual(
    getBatchVerdict({
      runCount: 100,
      winCounts: { A: 87, B: 10, draw: 2, stalemate: 1 },
    }),
    {
      tone: 'is-success',
      title: 'Side A wins 87 of 100 runs (87%)',
      detail: 'Side B win rate: 10% · Draws: 2 · Stalemates: 1',
    }
  );
  assert.match(
    getBatchVerdict({
      runCount: 100,
      winCounts: { A: 50, B: 50, draw: 0, stalemate: 0 },
    }).title,
    /^No clear winner/
  );
});

test('batch controls, worker boundary, and result averages remain reproducible', () => {
  assert.deepEqual(BATTLE_BATCH_PRESETS, [1, 10, 50, 100, 500]);
  assert.equal(calculateMedian([22, 25, 26, 28, 28, 30, 30, 34, 40, 50]), 29);
  assert.equal(calculateMedian([3, 1, 2]), 2);
  assert.match(appSource, /new Worker\(new URL\('\.\/battle-simulator-worker\.js'/);

  const stats = {
    unit: { attack: 70, defense: 70, hp: 20 },
    battle: finalBattleStats(),
  };
  const workerConfig = {
    sideA: { rows: BATTLE_ROWS.map(({ id }) => ({ id, troops: 10, stats })) },
    sideB: { rows: BATTLE_ROWS.map(({ id }) => ({ id, troops: 10, stats })) },
  };
  const workerOptions = { iterations: 10, seed: 7, strikeVariancePct: 5 };
  assert.deepEqual(
    runBattleBatchWorkerRequest({ config: workerConfig, options: workerOptions }),
    simulateBattleBatch(workerConfig, workerOptions)
  );
});

test('theme, responsive RTL, reduced-motion, version, and tool navigation contracts remain intact', () => {
  assert.equal(BATTLE_MODEL_ASSUMPTIONS.tacticalStatsActive, false);
  assert.match(appSource, /const THEME_STORAGE_KEY = 'vts_theme'/);
  assert.match(appSource, /id="battleThemeToggle"/);
  assert.match(appSource, /addEventListener\('click', toggleTheme\)/);
  assert.match(appSource, /site-light\.webmanifest/);

  assert.match(packageJson.version, /^\d+\.\d+\.\d+$/u);
  assert.match(
    appSource,
    new RegExp(`const APP_VERSION = '${packageJson.version.replaceAll('.', '\\.')}'`, 'u')
  );
  assert.match(indexSource, /id="tabBattleSimulator"[\s\S]*?href="battle-simulator\.html"/);
  assert.match(
    appSource,
    /if \(theme === 'light'\)\s*\{\s*document\.documentElement\.setAttribute\('data-theme', 'light'\);\s*\} else \{\s*document\.documentElement\.removeAttribute\('data-theme'\);\s*\}/
  );
  assert.doesNotMatch(appSource, /document\.documentElement\.toggleAttribute\(['"]data-theme['"]/);
  assert.match(appSource, /data-battle-language/);
  assert.match(appSource, /name="battleLanguage" data-battle-language autocomplete="off"/);
  assert.match(appSource, /function statInputName\(/);
  assert.match(appSource, /name="\$\{statInputName\(/);
  assert.match(battleCssSource, /\.battle-language-field select\s*\{[\s\S]*?padding-block:/);
  assert.match(battleCssSource, /\.pin-gate-input:focus-visible/);
  assert.match(battleCssSource, /:dir\(rtl\) \.battle-form-actions/);
  assert.match(battleCssSource, /border-inline-start/);
  assert.match(battleCssSource, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(battleCssSource, /transition-duration: 0\.01ms !important/);
  assert.match(appSource, /preferredScrollBehavior/);
  assert.match(
    appSource,
    new RegExp(`const APP_VERSION = '${packageJson.version.replaceAll('.', '\\.')}';`)
  );
  assert.match(indexSource, /id="tabBattleSimulator"[\s\S]*?href="battle-simulator\.html"/);
});
