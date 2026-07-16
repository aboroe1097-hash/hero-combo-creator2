import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  BATTLE_ROWS,
  DEFAULT_TROOPS,
  EDITABLE_BASE_STAT_KEYS,
  TROOP_STAT_KEYS,
  TROOP_STAT_METADATA,
} from '../../js/battle-simulator-data.js';
import {
  BATTLE_BATCH_PRESETS,
  BATTLE_MODEL_ASSUMPTIONS,
  simulateBattleBatch,
} from '../../js/battle-simulator-engine.js';
import { calculateMedian } from '../../js/battle-simulator-app.js';
import { runBattleBatchWorkerRequest } from '../../js/battle-simulator-worker.js';

const pageSource = readFileSync('battle-simulator.html', 'utf8');
const bootstrapSource = readFileSync('js/battle-simulator.js', 'utf8');
const appSource = readFileSync('js/battle-simulator-app.js', 'utf8');
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
  assert.match(appSource, /sides:\s*\{\s*A:\s*\{[\s\S]*?B:\s*\{/);
  assert.match(appSource, /troops:\s*DEFAULT_TROOPS/);
  assert.match(appSource, /\$\{renderSide\('A'\)\}[\s\S]*?\$\{renderSide\('B'\)\}/);
  assert.match(appSource, /name="side\$\{sideId\}Mode"/);
  assert.match(appSource, /data-side="\$\{sideId\}" data-row-index="\$\{index\}"/);
  assert.match(appSource, /data-row-field="type"/);
  assert.match(appSource, /data-row-field="tier"/);
  assert.match(appSource, /data-row-field="troops"/);
  assert.match(appSource, /data-base-stat-input="\$\{key\}"/);
  assert.match(appSource, /state\.sides\[sideId\]\.rows\[rowIndex\]/);
  assert.match(appSource, /row\.baseValues\[target\.dataset\.baseStatInput\]\s*=\s*target\.value/);
  assert.match(
    appSource,
    /row\.baseValues = \{ might: preset\.might, resistance: preset\.resistance, hp: preset\.hp \}/
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

test('results offer four debugging exports with full, summary, selected-log, and copy modes', () => {
  const exportModes = Array.from(
    appSource.matchAll(/data-battle-export="([^"]+)"/g),
    (match) => match[1]
  );
  assert.deepEqual(exportModes, ['json', 'summary-csv', 'log-csv', 'copy']);
  assert.match(appSource, /buildBattleJsonExport\(exportPayload\(\)\)/);
  assert.match(appSource, /buildBattleSummaryCsv\(exportPayload\(\)\)/);
  assert.match(appSource, /buildBattleEventLogCsv\(exportPayload\(\{ selectedOnly: true \}\)\)/);
  assert.match(appSource, /copyText\(buildBattleDebugSnapshot\(exportPayload\(\)\)\)/);
  assert.match(appSource, /data-battle-export="json">Full JSON/);
  assert.match(appSource, /data-battle-export="summary-csv">Summary CSV/);
  assert.match(appSource, /data-battle-export="log-csv">Selected log CSV/);
  assert.match(appSource, /data-battle-export="copy">Copy debug/);
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

  assert.equal(packageJson.version, '14.0.12');
  assert.match(appSource, /const APP_VERSION = '14\.0\.12'/);
  assert.match(indexSource, /id="tabBattleSimulator"[\s\S]*?href="battle-simulator\.html"/);
  assert.match(
    indexSource,
    /href="battle-simulator\.html" data-i18n="tabBattleSimulator">Battle Simulator<\/a>/
  );
});
