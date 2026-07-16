import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  BATTLE_ROWS,
  DEFAULT_TROOPS,
  EDITABLE_BASE_STAT_KEYS,
  STAT_INPUT_MODES,
  TROOP_STAT_KEYS,
  TROOP_STAT_METADATA,
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

function editableFixture(type, tier, troops, bonus) {
  const base = getTroopProfile(type, tier).baseStats;
  return {
    type,
    tier,
    troops,
    baseValues: { might: base.might, resistance: base.resistance, hp: base.hp },
    bonuses: Object.fromEntries(TROOP_STAT_KEYS.map((key) => [key, key === 'might' ? bonus : 0])),
    finals: { ...base },
  };
}

function sideFixture(type, tier, troops, bonus, customized) {
  const sideDefaults = editableFixture(type, tier, troops, bonus);
  return {
    mode: STAT_INPUT_MODES.ADD_BONUSES,
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
      B: sideFixture('cavalry', 10, 42_000, 20, true),
    },
  };
}

test('Battle Simulator is a production entry whose locked HTML contains only an empty mount', () => {
  assert.match(
    viteSource,
    /['"]battle-simulator['"]:\s*resolve\(__dirname,\s*'battle-simulator\.html'\)/
  );
  assert.match(pageSource, /<link rel="stylesheet" href="css\/_tokens\.css\?v=[^"]+" \/>/);
  assert.match(pageSource, /<link rel="stylesheet" href="css\/battle-simulator\.css\?v=[^"]+" \/>/);
  assert.match(
    pageSource,
    /<script type="module" src="js\/battle-simulator\.js\?v=[^"]+"><\/script>/
  );

  const maintenanceIndex = pageSource.indexOf('js/maintenance-config.js');
  const themeIndex = pageSource.indexOf('js/theme-prepaint.js');
  const authConfigIndex = pageSource.indexOf('js/admin-auth-config.js');
  const bootstrapIndex = pageSource.indexOf('js/battle-simulator.js');
  assert.ok(maintenanceIndex >= 0);
  assert.ok(maintenanceIndex < themeIndex);
  assert.ok(themeIndex < authConfigIndex);
  assert.ok(authConfigIndex < bootstrapIndex, 'PIN config must load before the module bootstrap');

  assert.match(pageSource, /<body class="battle-simulator-page is-locked">/);
  assert.match(pageSource, /<div id="battleSimulatorMount" hidden><\/div>/);
  assert.doesNotMatch(pageSource, /id="battleSimulatorForm"/);
  assert.doesNotMatch(pageSource, /id="battleThemeToggle"/);
  assert.doesNotMatch(pageSource, /data-battle-run|data-battle-export|data-row-field/);
});

test('bootstrap uses the exact Beta Tester gate and imports simulator code only after unlock', () => {
  assert.match(
    bootstrapSource,
    /import \{ requireSensitiveAdminPin \} from '\.\/admin-pin-gate\.js'/
  );
  assert.doesNotMatch(bootstrapSource, /import \{ mountBattleSimulator \} from/);

  const start = between(bootstrapSource, 'async function start()', '\n}\n\nstart();');
  const gateIndex = start.indexOf('await requireSensitiveAdminPin({');
  const deniedIndex = start.indexOf('if (!unlocked)');
  const appImportIndex = start.indexOf("await import('./battle-simulator-app.js')");
  assert.ok(gateIndex >= 0);
  assert.ok(gateIndex < deniedIndex);
  assert.ok(deniedIndex < appImportIndex);
  assert.match(
    start.slice(deniedIndex, appImportIndex),
    /location\.assign\('index\.html'\);\s*return;/
  );
  assert.equal(
    bootstrapSource.match(/import\('\.\/battle-simulator-app\.js'\)/g)?.length,
    1,
    'the protected app has one post-unlock import path'
  );

  assert.match(start, /title:\s*'Beta Testers Only'/);
  assert.match(
    start,
    /prompt:\s*\n?\s*'Only Beta Testers are allowed to access the Battle Simulator\. Enter the beta tester PIN to continue\.'/
  );
  assert.match(start, /label:\s*'Beta tester PIN'/);
  assert.match(start, /error:\s*'Incorrect PIN\. Access is limited to Beta Testers\.'/);
  assert.match(start, /cancel:\s*'Back to tools'/);
  assert.match(start, /unlock:\s*'Enter beta'/);
  assert.match(start, /unconfiguredTitle:\s*'Beta Testers Only'/);
});

test('both three-row sides own independent troop, mode, and editable base-stat controls', () => {
  assert.equal(DEFAULT_TROOPS, 31_000);
  assert.deepEqual(
    BATTLE_ROWS.map(({ id }) => id),
    ['front', 'middle', 'back']
  );
  assert.deepEqual(EDITABLE_BASE_STAT_KEYS, ['might', 'resistance', 'hp']);
  assert.deepEqual(TROOP_STAT_KEYS, [
    'might',
    'resistance',
    'hp',
    'tacticalMight',
    'tacticalResistance',
    'damage',
    'combatSpeed',
  ]);
  for (const key of EDITABLE_BASE_STAT_KEYS) {
    assert.equal(TROOP_STAT_METADATA[key].baseSourceAvailable, true, key);
  }

  assert.match(appSource, /const SIDE_IDS = \['A', 'B'\]/);
  assert.match(
    appSource,
    /sides:\s*\{\s*A:\s*createSide\('footmen', 9, sideTypes\),\s*B:\s*createSide\('footmen', 10, sideTypes\)/
  );
  assert.match(appSource, /troops:\s*DEFAULT_TROOPS/);
  assert.match(appSource, /\$\{renderSide\('A'\)\}[\s\S]*?\$\{renderSide\('B'\)\}/);
  assert.match(appSource, /name="side\$\{sideId\}Mode"/);
  assert.match(appSource, /data-side="\$\{sideId\}" data-row-index="\$\{index\}"/);
  assert.match(appSource, /data-row-field="type"/);
  assert.match(appSource, /data-row-field="tier"/);
  assert.match(appSource, /data-row-field="troops"/);
  assert.match(appSource, /'data-base-stat-input'/);
  assert.match(appSource, /state\.sides\[sideId\]\.rows\[rowIndex\]/);
  assert.match(appSource, /row\.baseValues\[target\.dataset\.baseStatInput\]\s*=\s*target\.value/);
  assert.match(
    appSource,
    /row\.baseValues = \{ might: preset\.might, resistance: preset\.resistance, hp: preset\.hp \}/
  );
});

test('side setup applies deep-copied defaults while rows expose explicit override state', () => {
  assert.match(appSource, /battleMode:\s*'pvp-field'/);
  assert.match(appSource, /sideDefaults:\s*editableFields\(sideDefaultRow\)/);
  assert.match(appSource, /customized:\s*false/);
  assert.match(appSource, /Side setup \(applies to all rows\)/);
  assert.match(appSource, /data-side-default-field="type"/);
  assert.match(appSource, /data-side-default-field="tier"/);
  assert.match(appSource, /data-side-default-field="troops"/);
  assert.match(appSource, /data-side-default-base-stat/);
  assert.match(appSource, /data-side-default-stat/);
  assert.match(appSource, /data-apply-side-defaults="\$\{sideId\}"/);
  assert.match(appSource, /Apply to all rows overwrites every row, including customized ones\./);
  assert.match(appSource, /data-row-customized/);
  assert.match(appSource, />Customized<\/span>/);
  assert.match(appSource, /data-reset-row-defaults/);
  assert.match(appSource, />Reset to side defaults<\/button>/);
  assert.match(
    appSource,
    /row\.customized = !editableFieldsMatch\(row, state\.sides\[sideId\]\.sideDefaults\)/
  );
  assert.match(appSource, /Object\.assign\(row, editableFields\(defaults\)\)/);
  assert.match(
    appSource,
    /side\.rows\.forEach\(\(row\) => copySideDefaultsToRow\(row, side\.sideDefaults\)\)/
  );
});

test('copy and swap helpers are canonical, non-mutating, and alias-free', () => {
  const source = appStateFixture();
  const before = structuredClone(source);
  const copied = copyBattleSideSetup(source, 'A', 'B');

  assert.deepEqual(source, before);
  assert.deepEqual(copied.sides.B, copied.sides.A);
  assert.notStrictEqual(copied.sides.B, copied.sides.A);
  assert.notStrictEqual(copied.sides.B.sideDefaults, copied.sides.A.sideDefaults);
  assert.notStrictEqual(copied.sides.B.rows, copied.sides.A.rows);
  assert.notStrictEqual(copied.sides.B.rows[0].bonuses, copied.sides.A.rows[0].bonuses);
  assert.equal(copied.sides.B.rows[1].customized, copied.sides.A.rows[1].customized);
  copied.sides.B.rows[0].troops += 1;
  assert.notEqual(copied.sides.B.rows[0].troops, copied.sides.A.rows[0].troops);
  assert.deepEqual(source, before);

  const swapped = swapBattleSides(source);
  assert.deepEqual(swapped.sides.A, before.sides.B);
  assert.deepEqual(swapped.sides.B, before.sides.A);
  assert.notStrictEqual(swapped.sides.A, source.sides.B);
  assert.notStrictEqual(swapped.sides.B.rows[0].finals, source.sides.A.rows[0].finals);
  assert.equal(swapped.sides.A.rows[1].customized, true);
  assert.equal(swapped.battleMode, 'pvp-field');
  assert.deepEqual(source, before);

  const inProgress = appStateFixture();
  inProgress.strikeVariancePct = '';
  inProgress.sides.A.rows[0].troops = '';
  const copiedInProgress = copyBattleSideSetup(inProgress, 'A', 'B');
  assert.equal(copiedInProgress.strikeVariancePct, '');
  assert.equal(copiedInProgress.sides.B.rows[0].troops, '');
  assert.notStrictEqual(copiedInProgress.sides.B, inProgress.sides.A);
  assert.notStrictEqual(
    copiedInProgress.sides.B.rows[0].bonuses,
    inProgress.sides.A.rows[0].bonuses
  );
});

test('setup toolbar supports file and paste import plus safe browser-local named presets', () => {
  assert.match(appSource, /buildSetupSnapshot/);
  assert.match(appSource, /parseSetupSnapshot/);
  assert.match(appSource, /applySetupSnapshot/);
  assert.match(appSource, /data-setup-export>Export setup<\/button>/);
  assert.match(appSource, /data-copy-side-a-to-b>Copy A → B<\/button>/);
  assert.match(appSource, /data-swap-sides>Swap sides<\/button>/);
  assert.match(appSource, /data-setup-file type="file" accept="\.json,application\/json"/);
  assert.match(appSource, /data-setup-json/);
  assert.match(appSource, /data-setup-import-paste>Import pasted JSON<\/button>/);
  assert.match(appSource, /Setup imported/);
  assert.match(appSource, /battle-setup-\$\{date\.toISOString\(\)\.slice\(0, 10\)\}\.json/);
  assert.match(appSource, /BATTLE_SETUP_PRESET_STORAGE_KEY/);
  assert.match(appSource, /normalizeBattleSetupPresetName/);
  assert.match(appSource, /upsertBattleSetupPreset/);
  assert.match(appSource, /deleteBattleSetupPreset/);
  assert.match(appSource, /data-preset-name/);
  assert.match(appSource, /data-preset-save>Save preset<\/button>/);
  assert.match(appSource, /data-preset-select/);
  assert.match(appSource, /data-preset-load disabled>Load<\/button>/);
  assert.match(appSource, /data-preset-delete disabled>Delete<\/button>/);
  assert.match(appSource, /localStorage\.setItem\(BATTLE_SETUP_PRESET_STORAGE_KEY/);
  assert.match(appSource, /Saved presets were unavailable or corrupted/);
  assert.match(appSource, /Browser storage may be full or unavailable/);
  assert.match(appSource, /option\.textContent = name/);

  const importSetup = between(
    appSource,
    'function importSetupText(jsonText)',
    '\n}\n\nasync function importSetupFile'
  );
  assert.ok(importSetup.indexOf('parseSetupSnapshot(jsonText)') >= 0);
  assert.ok(
    importSetup.indexOf('parseSetupSnapshot(jsonText)') <
      importSetup.indexOf('applySetupSnapshot(state, snapshot)')
  );
  assert.ok(
    importSetup.indexOf('applySetupSnapshot(state, snapshot)') <
      importSetup.indexOf("replaceSetupState(nextState, 'Setup imported')")
  );
});

test('fixed run bar stays live, groups invalid sides, and focuses the first invalid field', () => {
  const updateRunBar = between(
    appSource,
    'function updateRunBar()',
    '\n}\n\nfunction markResultsStale'
  );
  assert.match(appSource, /data-run-status/);
  assert.match(appSource, /data-focus-first-invalid/);
  assert.match(appSource, /Side A:\s*\$\{counts\.A\}/);
  assert.match(appSource, /Side B:\s*\$\{counts\.B\}/);
  assert.match(
    appSource,
    /field\$\{invalidControls\.length === 1 \? ' needs' : 's need'\} attention/
  );
  assert.match(appSource, /A: \$\{formatCompactTroops\(sideTroopTotal\('A'\)\)\} troops vs B:/);
  assert.match(appSource, /findFirstInvalid\(form, \{ includeSideDefaults: true \}\)/);
  assert.match(battleCssSource, /\.battle-form-actions\s*\{[\s\S]*?position:\s*fixed/);
  assert.match(battleCssSource, /--battle-run-bar-clearance/);
  assert.match(
    battleCssSource,
    /\.battle-toast-region\s*\{[\s\S]*?bottom:\s*max\(var\(--battle-run-bar-clearance\)/
  );
  assert.equal(shouldDisableStrikeVariance(1, 5), true);
  assert.equal(shouldDisableStrikeVariance(1, 30), false);
  assert.equal(shouldDisableStrikeVariance(1, 0.05), false);
  assert.equal(shouldDisableStrikeVariance(100, 5), false);
  assert.match(
    appSource,
    /variance\.disabled = shouldDisableStrikeVariance\(iterations, variance\.value\)/
  );
  assert.match(updateRunBar, /const existingButton = status\.querySelector/);
  assert.match(
    updateRunBar,
    /const button = existingButton \|\| document\.createElement\('button'\)/
  );
  assert.match(updateRunBar, /if \(!existingButton\) \{[\s\S]*?status\.replaceChildren\(button\)/);
  assert.equal(
    (updateRunBar.match(/status\.replaceChildren\(button\)/g) || []).length,
    1,
    'blur/change refreshes must preserve the mounted invalid-summary button through pointerup'
  );
});

test('verdict banner reports dominant outcomes without inventing a winner', () => {
  assert.match(appSource, /Side \$\{result\.outcome\} wins in \$\{result\.rounds\} rounds/);
  assert.match(appSource, /'Draw'/);
  assert.match(appSource, /Stalemate \(\$\{BATTLE_MODEL_ASSUMPTIONS\.maxRounds\} round cap\)/);
  assert.match(appSource, /renderVerdictBanner\(isBatch, result\)/);
  assert.match(battleCssSource, /\.battle-verdict-banner\.is-success/);
  assert.match(battleCssSource, /\.battle-verdict-banner\.is-danger/);
  assert.match(battleCssSource, /\.battle-verdict-banner\.is-neutral/);

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
      winCounts: { A: 0, B: 0, draw: 100, stalemate: 0 },
    }).title,
    /^Draw in 100 of 100 runs \(100%\)$/
  );
  assert.match(
    getBatchVerdict({
      runCount: 100,
      winCounts: { A: 50, B: 50, draw: 0, stalemate: 0 },
    }).title,
    /^No clear winner/
  );
  assert.match(
    getBatchVerdict({
      runCount: 100,
      winCounts: { A: 20, B: 10, draw: 25, stalemate: 45 },
    }).title,
    /^Stalemate in 45 of 100 runs \(45%\)$/
  );
});

test('batch controls expose every requested preset, reproducibility inputs, and averages', () => {
  assert.deepEqual(BATTLE_BATCH_PRESETS, [1, 10, 50, 100, 500]);
  assert.match(appSource, /BATTLE_BATCH_PRESETS\.map\(/);
  assert.match(appSource, /name="battleIterations" value="\$\{count\}"/);
  assert.match(appSource, /name="battleSeed"/);
  assert.match(appSource, /name="battleVariance"/);
  assert.match(
    appSource,
    /simulateBattleBatchOffThread\(config,\s*\{[\s\S]*?iterations,[\s\S]*?seed,[\s\S]*?strikeVariancePct:\s*variance/
  );
  assert.match(appSource, /Batch averages use seeded/);
  assert.match(appSource, /result\.winRates\.A/);
  assert.match(appSource, /result\.winRates\.B/);
  assert.match(appSource, /result\.averageRounds/);
  assert.match(appSource, /result\.averageTotalSurvivors\.A/);
  assert.match(appSource, /result\.averageTotalSurvivors\.B/);
  assert.match(appSource, /result\.averageTotalCasualties\.A/);
  assert.match(appSource, /result\.averageTotalCasualties\.B/);
  assert.equal(calculateMedian([22, 25, 26, 28, 28, 30, 30, 34, 40, 50]), 29);
  assert.equal(calculateMedian([3, 1, 2]), 2);
  assert.match(
    appSource,
    /new Worker\(new URL\('\.\/battle-simulator-worker\.js', import\.meta\.url\)/
  );

  const emptyStats = Object.fromEntries(TROOP_STAT_KEYS.map((key) => [key, 0]));
  const workerConfig = {
    sideA: {
      rows: BATTLE_ROWS.map(({ id }) => ({ id, troops: 10, stats: { ...emptyStats } })),
    },
    sideB: {
      rows: BATTLE_ROWS.map(({ id }) => ({ id, troops: 10, stats: { ...emptyStats } })),
    },
  };
  const workerOptions = { iterations: 10, seed: 7, strikeVariancePct: 5 };
  assert.deepEqual(
    runBattleBatchWorkerRequest({ config: workerConfig, options: workerOptions }),
    simulateBattleBatch(workerConfig, workerOptions),
    'the worker boundary must preserve deterministic batch output'
  );
});

test('results offer five debugging exports including a calibration fixture', () => {
  const exportModes = Array.from(
    appSource.matchAll(/data-battle-export="([^"]+)"/g),
    (match) => match[1]
  );
  assert.deepEqual(exportModes, ['json', 'summary-csv', 'log-csv', 'copy', 'calibration']);
  assert.match(appSource, /buildBattleJsonExport\(exportPayload\(\)\)/);
  assert.match(appSource, /buildBattleSummaryCsv\(exportPayload\(\)\)/);
  assert.match(appSource, /buildBattleEventLogCsv\(exportPayload\(\{ selectedOnly: true \}\)\)/);
  assert.match(appSource, /copyText\(buildBattleDebugSnapshot\(exportPayload\(\)\)\)/);
  assert.match(appSource, /buildBattleCalibrationFixture\(exportPayload\(\)\)/);
  assert.match(appSource, /setup:\s*lastRun\.setup/);
  assert.match(appSource, /data-battle-export="json">Full JSON/);
  assert.match(appSource, /data-battle-export="summary-csv">Summary CSV/);
  assert.match(appSource, /data-battle-export="log-csv">Selected log CSV/);
  assert.match(appSource, /data-battle-export="copy">Copy debug/);
  assert.match(appSource, /data-battle-export="calibration">Calibration fixture/);
  assert.match(appSource, /data-battle-log-content/);
  assert.match(appSource, /const VISIBLE_EVENT_LIMIT = 300/);
  assert.match(appSource, /Selected log CSV exports all/);
});

test('Phase 1 copy keeps tactical stats inactive and retains theme, version, and navigation contracts', () => {
  assert.equal(BATTLE_MODEL_ASSUMPTIONS.tacticalStatsActive, false);
  assert.equal(BATTLE_MODEL_ASSUMPTIONS.casualtyRateCap, 0.95);
  assert.equal(BATTLE_MODEL_ASSUMPTIONS.maxRounds, 200);
  assert.match(
    appSource,
    /Tactical Might and Tactical Resistance are saved but inactive until hero skills arrive\./
  );
  assert.match(appSource, /class="battle-inactive-chip">Future/);
  assert.match(appSource, /const THEME_STORAGE_KEY = 'vts_theme'/);
  assert.match(appSource, /id="battleThemeToggle"/);
  assert.match(appSource, /addEventListener\('click', toggleTheme\)/);
  assert.match(appSource, /site-light\.webmanifest/);

  assert.equal(packageJson.version, '14.0.11');
  assert.match(appSource, /const APP_VERSION = '14\.0\.11'/);
  assert.match(indexSource, /id="tabBattleSimulator"[\s\S]*?href="battle-simulator\.html"/);
  assert.match(
    indexSource,
    /href="battle-simulator\.html" data-i18n="tabBattleSimulator">Battle Simulator<\/a>/
  );
});
