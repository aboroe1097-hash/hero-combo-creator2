import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BATTLE_EXPORT_SCHEMA_VERSION,
  buildBattleDebugSnapshot,
  buildBattleEventLogCsv,
  buildBattleJsonExport,
  buildBattleSummaryCsv,
  makeBattleExportFilename,
} from '../../js/battle-simulator-export.js';

const GENERATED_AT = '2026-07-16T00:48:45.000Z';

function config(overrides = {}) {
  return {
    label: 'Baseline',
    sides: {
      sideA: {
        rows: [
          { id: 'A1', troops: 31_000 },
          { id: 'A2', troops: 31_000 },
        ],
      },
      sideB: {
        rows: [
          { id: 'B1', troops: 31_000 },
          { id: 'B2', troops: 31_000 },
        ],
      },
    },
    ...overrides,
  };
}

function model() {
  return {
    version: 'troops-v1',
    assumptions: ['Tactical stats are recorded but inactive.', 'No troop-type counters.'],
    baseStrikeRate: 0.08,
  };
}

function singleResult(overrides = {}) {
  return {
    winner: 'sideA',
    rounds: 4,
    sideA: { survivors: 40_000, casualties: 22_000 },
    sideB: { survivors: 0, casualties: 62_000 },
    events: [
      {
        round: 1,
        speedGroup: 519,
        attacker: { side: 'A', row: 'front' },
        target: { side: 'B', row: 'front' },
        targetTroopsBefore: 31_000,
        casualties: 1_250,
        targetTroopsAfter: 29_750,
        status: 'active',
      },
    ],
    ...overrides,
  };
}

function exportInput(result, overrides = {}) {
  return {
    config: config(),
    model: model(),
    result,
    generatedAt: GENERATED_AT,
    ...overrides,
  };
}

test('full JSON export has a stable ordered envelope for a single run', () => {
  const json = buildBattleJsonExport(exportInput(singleResult(), { seed: 42, variance: 0 }));
  const parsed = JSON.parse(json);

  assert.equal(parsed.schemaVersion, BATTLE_EXPORT_SCHEMA_VERSION);
  assert.equal(parsed.generatedAt, GENERATED_AT);
  assert.equal(parsed.model.version, 'troops-v1');
  assert.deepEqual(parsed.model.assumptions, [
    'Tactical stats are recorded but inactive.',
    'No troop-type counters.',
  ]);
  assert.equal(parsed.runMode, 'single');
  assert.equal(parsed.seed, 42);
  assert.equal(parsed.variance, 0);
  assert.equal(parsed.results.winner, 'sideA');
  assert.deepEqual(Object.keys(parsed), [
    'schemaVersion',
    'generatedAt',
    'model',
    'config',
    'runMode',
    'seed',
    'variance',
    'results',
  ]);
});

test('full JSON is deterministic even when nested input keys have a different order', () => {
  const first = buildBattleJsonExport(
    exportInput({ winner: 'draw', rounds: 3, nested: { zebra: 1, alpha: 2 } })
  );
  const second = buildBattleJsonExport({
    generatedAt: GENERATED_AT,
    result: { nested: { alpha: 2, zebra: 1 }, rounds: 3, winner: 'draw' },
    model: { baseStrikeRate: 0.08, assumptions: model().assumptions, version: 'troops-v1' },
    config: {
      sides: config().sides,
      label: 'Baseline',
    },
  });

  assert.equal(second, first);
});

test('summary CSV computes single-run outcomes and side averages', () => {
  const csv = buildBattleSummaryCsv(exportInput(singleResult(), { seed: 'fixed' }));
  const [header, row] = csv.split('\n');

  assert.match(header, /^schema_version,generated_at,model_version,run_mode,seed,variance,/);
  assert.match(header, /average_side_a_survivors,average_side_b_survivors/);
  assert.match(
    row,
    /^1,2026-07-16T00:48:45\.000Z,troops-v1,single,fixed,,1,1,1,0,0,0,0,0,0,4,40000,0,40000,22000,62000,84000,/
  );
  assert.match(row, /"\{""label"":""Baseline""/);
});

test('batch summary prefers aggregate totals and averages when run logs are sampled', () => {
  const result = {
    iterations: 100,
    seed: 77,
    variance: { casualtySpread: 0.05 },
    outcomes: {
      sideA: { count: 55, rate: 0.55 },
      sideB: { count: 35, rate: 0.35 },
      draw: { count: 5, rate: 0.05 },
      stalemate: { count: 5, rate: 0.05 },
    },
    averages: {
      rounds: 8.25,
      sideA: { survivors: 12_300, casualties: 49_700 },
      sideB: { survivors: 9_800, casualties: 52_200 },
    },
    runs: [singleResult()],
  };
  const csv = buildBattleSummaryCsv(exportInput(result));
  const row = csv.split('\n')[1];

  assert.match(
    row,
    /,batch,77,"\{""casualtySpread"":0\.05\}",100,55,0\.55,35,0\.35,5,0\.05,5,0\.05,8\.25,12300,9800,22100,49700,52200,101900,/
  );
});

test('batch summary accepts the engine A/B aggregate contract without individual results', () => {
  const result = {
    runCount: 50,
    seed: 123,
    strikeVariancePct: 5,
    outcomes: {
      A: { count: 30, rate: 0.6 },
      B: { count: 15, rate: 0.3 },
      draw: { count: 2, rate: 0.04 },
      stalemate: { count: 3, rate: 0.06 },
    },
    averageRounds: 9.5,
    averageTotalSurvivors: { A: 15_000, B: 8_000 },
    averageTotalCasualties: { A: 78_000, B: 85_000 },
  };
  const csv = buildBattleSummaryCsv(exportInput(result));
  const row = csv.split('\n')[1];

  assert.match(
    row,
    /,batch,123,5,50,30,0\.6,15,0\.3,2,0\.04,3,0\.06,9\.5,15000,8000,23000,78000,85000,163000,/
  );
});

test('event-log CSV flattens run and round data with RFC-style CSV escaping', () => {
  const result = {
    iterations: 2,
    runs: [
      singleResult({
        runNumber: 7,
        seed: 101,
        events: [
          {
            round: 1,
            actionGroup: 'fast, group',
            combatSpeed: '519, "boosted"',
            attacker: 'A, "Alpha"\nfront',
            target: 'B/front',
            troopsBefore: 31_000,
            casualties: 1_000,
            troopsAfter: 30_000,
            strikeMultiplier: 0.98,
            casualtyRate: 0.12,
            status: 'active',
          },
        ],
      }),
      {
        runNumber: 12,
        seed: 202,
        winner: 'sideB',
        roundLog: [
          {
            round: 2,
            speedGroups: [
              {
                group: 3,
                combatSpeed: 400,
                actions: [
                  {
                    attacker: { label: 'B/back' },
                    target: { id: 'A-middle' },
                    targetTroopsBefore: 20,
                    casualties: 20,
                    targetTroopsAfter: 0,
                    strikeMultiplier: 1,
                    casualtyRate: 0.2,
                    targetEliminated: true,
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  };
  const csv = buildBattleEventLogCsv(exportInput(result));
  const lines = csv.split('\n');

  assert.equal(
    lines[0],
    'run_index,run_seed,round,action_group,combat_speed,attacker,target,troops_before,casualties,troops_after,strike_multiplier,casualty_rate,status'
  );
  assert.match(
    csv,
    /7,101,1,"fast, group","519, ""boosted""","A, ""Alpha""\nfront",B\/front,31000,1000,30000,0\.98,0\.12,active/
  );
  assert.match(csv, /12,202,2,3,400,B\/back,A-middle,20,20,0,1,0\.2,eliminated/);
});

test('event-log CSV uses actor combat speed for an engine exchange action', () => {
  const csv = buildBattleEventLogCsv(
    exportInput({
      winner: 'A',
      runNumber: 42,
      seed: 123,
      rounds: 1,
      actionLog: [
        {
          round: 1,
          group: 2,
          combatSpeed: null,
          actorCombatSpeed: 519,
          attackerSide: 'A',
          attackerRowId: 'front',
          attackerRowLabel: 'Front',
          defenderSide: 'B',
          targetRowId: 'middle',
          targetRowLabel: 'Middle',
          targetTroopsBefore: 100,
          casualties: 100,
          targetTroopsAfter: 0,
          strikeMultiplier: 0.975,
          casualtyRate: 0.23456,
        },
      ],
    })
  );

  assert.match(csv, /\n42,123,1,2,519,A\/Front,B\/Middle,100,100,0,0\.975,0\.23456,eliminated$/);
});

test('object-shaped engine assumptions remain structured in JSON and readable in text', () => {
  const input = exportInput(singleResult(), {
    model: {
      version: 'phase1-beta-1',
      assumptions: { tacticalStatsActive: false, randomByDefault: false },
    },
  });
  const parsed = JSON.parse(buildBattleJsonExport(input));
  const text = buildBattleDebugSnapshot(input);

  assert.deepEqual(parsed.model.assumptions, {
    randomByDefault: false,
    tacticalStatsActive: false,
  });
  assert.match(text, /Assumptions: \{"randomByDefault":false,"tacticalStatsActive":false\}/);
});

test('event-log CSV returns only its deterministic header when logs are unavailable', () => {
  const csv = buildBattleEventLogCsv(
    exportInput({
      iterations: 50,
      outcomes: { sideA: 25, sideB: 25, draw: 0, stalemate: 0 },
      averages: { rounds: 7 },
    })
  );

  assert.equal(
    csv,
    'run_index,run_seed,round,action_group,combat_speed,attacker,target,troops_before,casualties,troops_after,strike_multiplier,casualty_rate,status'
  );
});

test('debug snapshot is concise and reports aggregate batch diagnostics', () => {
  const text = buildBattleDebugSnapshot(
    exportInput({
      iterations: 10,
      outcomes: { sideA: 6, sideB: 3, draw: 1, stalemate: 0 },
      averageRounds: 5.5,
      averageSideASurvivors: 100,
      averageSideBSurvivors: 50,
      averageSideACasualties: 20,
      averageSideBCasualties: 70,
    })
  );

  assert.match(text, /^Battle Simulator debug snapshot\nGenerated: 2026-07-16T00:48:45\.000Z/);
  assert.match(text, /Run: batch · 10 simulations/);
  assert.match(text, /Side A 6 \(60%\).*Side B 3 \(30%\).*Draw 1 \(10%\)/);
  assert.match(text, /Averages: 5\.5 rounds · survivors A\/B 100\/50 · casualties A\/B 20\/70/);
  assert.ok(text.split('\n').length <= 8);
});

test('all export modes recursively remove PIN, auth, token, secret, and storage fields', () => {
  const result = singleResult({
    pin: 'do-not-export-pin',
    nested: {
      adminPinHash: 'do-not-export-hash',
      authToken: 'do-not-export-token',
      authenticationState: 'do-not-export-auth-state',
      apiKey: 'do-not-export-api-key',
      localStorage: { gate: 'do-not-export-storage' },
    },
  });
  const input = exportInput(result, {
    config: config({ password: 'do-not-export-password' }),
    model: { ...model(), credentials: 'do-not-export-credentials' },
  });
  const outputs = [
    buildBattleJsonExport(input),
    buildBattleSummaryCsv(input),
    buildBattleEventLogCsv(input),
    buildBattleDebugSnapshot(input),
  ];

  for (const output of outputs) {
    assert.doesNotMatch(output, /do-not-export/i);
  }
});

test('filename helper sanitizes mode and uses format-appropriate extensions', () => {
  assert.equal(
    makeBattleExportFilename({
      kind: 'summary',
      mode: 'Batch 100 / noisy',
      generatedAt: GENERATED_AT,
    }),
    'vts-battle-simulator-summary-batch-100-noisy-2026-07-16T00-48-45-000Z.csv'
  );
  assert.equal(
    makeBattleExportFilename({ kind: 'events', mode: 'single', generatedAt: GENERATED_AT }),
    'vts-battle-simulator-event-log-single-2026-07-16T00-48-45-000Z.csv'
  );
  assert.equal(
    makeBattleExportFilename({ kind: 'debug', mode: 'single', generatedAt: () => GENERATED_AT }),
    'vts-battle-simulator-debug-single-2026-07-16T00-48-45-000Z.txt'
  );
});
