import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BATTLE_BATCH_PRESETS,
  BATTLE_MAX_ROUNDS,
  BATTLE_MODEL_VERSION,
  calculateCasualtyRate,
  simulateBattle,
  simulateBattleBatch,
} from '../../js/battle-simulator-engine.js';

function stats(overrides = {}) {
  return {
    might: 0,
    resistance: 0,
    hp: 0,
    tacticalMight: 0,
    tacticalResistance: 0,
    damage: 0,
    combatSpeed: 0,
    ...overrides,
  };
}

function row(troops = 1_000, statOverrides = {}, metadata = {}) {
  return {
    type: 'cavalry',
    tier: 9,
    troops,
    stats: stats(statOverrides),
    ...metadata,
  };
}

function side(rows, label) {
  return { label, rows };
}

function equalBattleConfig(troops = 1_000) {
  const makeRows = () => [row(troops), row(troops), row(troops)];
  return {
    sideA: side(makeRows(), 'Alpha'),
    sideB: side(makeRows(), 'Bravo'),
  };
}

test('beta casualty formula uses Might, Damage, Resistance, and HP with a 95% clamp', () => {
  assert.equal(calculateCasualtyRate(stats(), stats()), 0.08);
  assert.equal(
    calculateCasualtyRate(stats({ might: 100, damage: 50 }), stats({ resistance: 100, hp: 50 })),
    0.08
  );
  assert.equal(calculateCasualtyRate(stats({ might: 1_000_000 }), stats()), 0.95);

  const baseRate = calculateCasualtyRate(stats({ might: 100 }), stats());
  assert.ok(calculateCasualtyRate(stats({ might: 200 }), stats()) > baseRate);
  assert.ok(calculateCasualtyRate(stats({ might: 100, damage: 25 }), stats()) > baseRate);
  assert.ok(calculateCasualtyRate(stats({ might: 100 }), stats({ resistance: 50 })) < baseRate);
  assert.ok(calculateCasualtyRate(stats({ might: 100 }), stats({ hp: 50 })) < baseRate);
});

test('Tactical Might and Tactical Resistance are recorded but inactive in Phase 1', () => {
  const base = calculateCasualtyRate(stats({ might: 100 }), stats({ resistance: 50 }));
  const tactical = calculateCasualtyRate(
    stats({ might: 100, tacticalMight: 999_999 }),
    stats({ resistance: 50, tacticalResistance: 999_999 })
  );
  assert.equal(tactical, base);
});

test('single-run simulation is deterministic by default and exposes stable summaries and logs', () => {
  const config = equalBattleConfig();
  const first = simulateBattle(config);
  const second = simulateBattle(config);

  assert.deepEqual(first, second);
  assert.equal(first.modelVersion, BATTLE_MODEL_VERSION);
  assert.equal(first.strikeVariancePct, 0);
  assert.equal(first.assumptions.randomByDefault, false);
  assert.equal(first.sides.A.initialTroops, 3_000);
  assert.equal(first.sides.B.initialTroops, 3_000);
  assert.equal(first.survivors.A + first.casualties.A, 3_000);
  assert.equal(first.survivors.B + first.casualties.B, 3_000);
  assert.ok(first.roundLog.length > 0);
  assert.ok(first.actionLog.length > 0);
});

test('higher Combat Speed owns opening initiative and dead later-group rows do not act', () => {
  const config = {
    sideA: side([row(1, { might: 1_000, combatSpeed: 100 }), row(0), row(0)], 'Fast'),
    sideB: side([row(1, { combatSpeed: 10 }), row(0), row(0)], 'Slow'),
  };

  const result = simulateBattle(config);

  assert.equal(result.openingInitiative.side, 'A');
  assert.equal(result.openingInitiative.combatSpeed, 100);
  assert.equal(result.outcome, 'A');
  assert.equal(result.rounds, 1);
  assert.equal(result.actionLog.length, 1);
  assert.equal(result.actionLog[0].attackerSide, 'A');
  assert.equal(result.actionLog[0].targetRowId, 'front');
  assert.equal(result.actionLog[0].groupType, 'opening');
});

test('Combat Speed affects only the Round 1 opening and later rows exchange together', () => {
  const config = {
    sideA: side(
      [
        row(1_000, { combatSpeed: 300 }),
        row(1_000, { combatSpeed: 200 }),
        row(1_000, { combatSpeed: 100 }),
      ],
      'Alpha'
    ),
    sideB: side(
      [
        row(1_000, { combatSpeed: 250 }),
        row(1_000, { combatSpeed: 150 }),
        row(1_000, { combatSpeed: 50 }),
      ],
      'Bravo'
    ),
  };

  const result = simulateBattle(config);
  const firstRound = result.roundLog[0];
  const secondRound = result.roundLog[1];

  assert.deepEqual(
    firstRound.groups.map((group) => group.groupType),
    ['opening', 'exchange']
  );
  assert.equal(firstRound.groups[0].actions.length, 1);
  assert.equal(firstRound.groups[0].actions[0].attackerRowId, 'front');
  assert.equal(firstRound.groups[0].actions[0].attackerSide, 'A');
  assert.equal(firstRound.groups[1].actions.length, 5);
  assert.equal(
    firstRound.groups
      .flatMap((group) => group.actions)
      .filter((action) => action.attackerSide === 'A' && action.attackerRowId === 'front').length,
    1
  );

  assert.equal(secondRound.groups.length, 1);
  assert.equal(secondRound.groups[0].groupType, 'exchange');
  assert.equal(secondRound.groups[0].combatSpeed, null);
  assert.equal(secondRound.groups[0].simultaneous, true);
  assert.equal(secondRound.groups[0].actions.length, 6);
  assert.deepEqual(
    [...new Set(secondRound.groups[0].actions.map((action) => action.actorCombatSpeed))].sort(
      (left, right) => right - left
    ),
    [300, 250, 200, 150, 100, 50]
  );
  assert.ok(secondRound.groups[0].actions.every((action) => action.combatSpeed === null));
});

test('exact Combat Speed ties resolve simultaneously without a Side A first-mover bias', () => {
  const config = {
    sideA: side([row(1, { combatSpeed: 50 }), row(0), row(0)], 'Alpha'),
    sideB: side([row(1, { combatSpeed: 50 }), row(0), row(0)], 'Bravo'),
  };

  const result = simulateBattle(config);

  assert.equal(result.openingInitiative.side, 'tie');
  assert.equal(result.openingInitiative.tied, true);
  assert.equal(result.openingInitiative.simultaneous, true);
  assert.equal(result.outcome, 'draw');
  assert.equal(result.reason, 'mutual-elimination');
  assert.equal(result.roundLog[0].groups[0].simultaneous, true);
  assert.equal(result.roundLog[0].groups[0].actions.length, 2);
  assert.deepEqual(
    result.roundLog[0].groups[0].actions.map((action) => action.attackerSide).sort(),
    ['A', 'B']
  );
});

test('multiple fastest rows on one side open simultaneously without reporting a side tie', () => {
  const config = {
    sideA: side(
      [row(1_000, { combatSpeed: 50 }), row(1_000, { combatSpeed: 50 }), row(1_000)],
      'Alpha'
    ),
    sideB: side([row(1_000, { combatSpeed: 40 }), row(1_000), row(1_000)], 'Bravo'),
  };

  const result = simulateBattle(config);

  assert.equal(result.openingInitiative.side, 'A');
  assert.equal(result.openingInitiative.tied, false);
  assert.equal(result.openingInitiative.simultaneous, true);
  assert.equal(result.openingInitiative.rows.length, 2);
  assert.deepEqual(
    result.openingInitiative.rows.map((row) => [row.side, row.rowId]),
    [
      ['A', 'front'],
      ['A', 'middle'],
    ]
  );
});

test('simultaneous exchanges share the current front target and retarget next round', () => {
  const lethal = { might: 10_000 };
  const config = {
    sideA: side(
      [
        row(10, { ...lethal, combatSpeed: 300 }),
        row(10, { ...lethal, combatSpeed: 200 }),
        row(10, { ...lethal, combatSpeed: 100 }),
      ],
      'Sweep'
    ),
    sideB: side([row(1), row(1), row(1)], 'Targets'),
  };

  const result = simulateBattle(config);
  const attacksByA = result.actionLog.filter((action) => action.attackerSide === 'A');

  assert.equal(result.outcome, 'A');
  assert.deepEqual(
    attacksByA.map((action) => [action.round, action.groupType, action.targetRowId]),
    [
      [1, 'opening', 'front'],
      [1, 'exchange', 'middle'],
      [1, 'exchange', 'middle'],
      [2, 'exchange', 'back'],
      [2, 'exchange', 'back'],
      [2, 'exchange', 'back'],
    ]
  );
  assert.equal(
    result.actionLog.some(
      (action) => action.attackerSide === 'B' && action.attackerRowId === 'front'
    ),
    false
  );
  assert.ok(result.actionLog.some((action) => action.attackerSide === 'B'));
});

test('swapping deterministic sides mirrors the result', () => {
  const strong = side(
    [
      row(2_000, { might: 300, damage: 25, combatSpeed: 100 }),
      row(2_000, { might: 300, damage: 25, combatSpeed: 100 }),
      row(2_000, { might: 300, damage: 25, combatSpeed: 100 }),
    ],
    'Strong'
  );
  const weak = side([row(2_000), row(2_000), row(2_000)], 'Weak');

  const forward = simulateBattle({ sideA: strong, sideB: weak });
  const reverse = simulateBattle({
    sideA: structuredClone(weak),
    sideB: structuredClone(strong),
  });

  assert.equal(forward.outcome, 'A');
  assert.equal(reverse.outcome, 'B');
  assert.equal(forward.survivors.A, reverse.survivors.B);
  assert.equal(forward.casualties.A, reverse.casualties.B);
  assert.equal(forward.survivors.B, reverse.survivors.A);
  assert.equal(forward.casualties.B, reverse.casualties.A);
});

test('a valid strike causes at least one casualty and never exceeds target troops', () => {
  const config = {
    sideA: side([row(1, { combatSpeed: 2 }), row(0), row(0)], 'Attacker'),
    sideB: side(
      [row(1, { resistance: 1_000_000, hp: 1_000_000, combatSpeed: 1 }), row(0), row(0)],
      'Defender'
    ),
  };
  const result = simulateBattle(config);

  assert.equal(result.actionLog[0].casualties, 1);
  assert.equal(result.actionLog[0].targetTroopsBefore, 1);
  assert.equal(result.actionLog[0].targetTroopsAfter, 0);
});

test('battle stops at a 200-round stalemate when both sides remain alive', () => {
  const fortifiedRows = () => [
    row(1_000_000, { resistance: 1_000_000_000_000, hp: 1_000_000_000_000 }),
    row(1_000_000, { resistance: 1_000_000_000_000, hp: 1_000_000_000_000 }),
    row(1_000_000, { resistance: 1_000_000_000_000, hp: 1_000_000_000_000 }),
  ];
  const result = simulateBattle({
    sideA: side(fortifiedRows(), 'Fort A'),
    sideB: side(fortifiedRows(), 'Fort B'),
  });

  assert.equal(result.outcome, 'stalemate');
  assert.equal(result.status, 'stalemate');
  assert.equal(result.reason, 'round-limit');
  assert.equal(result.rounds, BATTLE_MAX_ROUNDS);
  assert.ok(result.survivors.A > 0);
  assert.ok(result.survivors.B > 0);
});

test('simulation never mutates caller formations or stat objects', () => {
  const config = equalBattleConfig(100);
  const before = structuredClone(config);

  simulateBattle(config);

  assert.deepEqual(config, before);
});

test('single-run validation rejects malformed formations, values, seed, and variance', () => {
  const valid = equalBattleConfig(100);
  assert.throws(
    () => simulateBattle({ sideA: side([row()], 'Short'), sideB: valid.sideB }),
    /exactly three rows/
  );
  assert.throws(
    () =>
      simulateBattle({
        sideA: side([row(-1), row(), row()], 'Negative'),
        sideB: valid.sideB,
      }),
    /cannot be negative/
  );
  assert.throws(
    () =>
      simulateBattle({
        sideA: side([row(1.5), row(), row()], 'Fraction'),
        sideB: valid.sideB,
      }),
    /safe integer/
  );
  assert.throws(() => simulateBattle(valid, { seed: -1 }), /Seed must be between/);
  assert.throws(() => simulateBattle(valid, { strikeVariancePct: 101 }), /between 0 and 100/);
});

test('batch presets include 1, 10, 50, 100, and 500 and the largest preset runs', () => {
  assert.deepEqual(BATTLE_BATCH_PRESETS, [1, 10, 50, 100, 500]);
  const tiny = {
    sideA: side([row(1), row(0), row(0)], 'A'),
    sideB: side([row(1), row(0), row(0)], 'B'),
  };
  const batch = simulateBattleBatch(tiny, { iterations: 500, seed: 7 });

  assert.equal(batch.runCount, 500);
  assert.equal(batch.runSeeds.length, 500);
  assert.equal(Object.hasOwn(batch, 'results'), false);
});

test('seeded batch simulation is exactly reproducible, including optional event logs', () => {
  const config = equalBattleConfig(300);
  const options = {
    iterations: 10,
    seed: 123_456,
    strikeVariancePct: 5,
    includeResults: true,
    includeEventLogs: true,
  };

  const first = simulateBattleBatch(config, options);
  const second = simulateBattleBatch(config, options);

  assert.deepEqual(first, second);
  assert.equal(first.results.length, 10);
  assert.ok(first.results.every((result) => result.actionLog.length > 0));
  assert.equal(first.strikeVariancePct, 5);
});

test('different batch seeds produce different per-hit samples', () => {
  const config = equalBattleConfig(300);
  const options = {
    iterations: 10,
    strikeVariancePct: 50,
    includeResults: true,
    includeEventLogs: true,
  };
  const first = simulateBattleBatch(config, { ...options, seed: 111 });
  const second = simulateBattleBatch(config, { ...options, seed: 222 });

  assert.notDeepEqual(
    first.results.map((result) => result.actionLog[0].strikeMultiplier),
    second.results.map((result) => result.actionLog[0].strikeMultiplier)
  );
});

test('one-run batch averages and outcome counts match its corresponding single run', () => {
  const config = equalBattleConfig(300);
  const single = simulateBattle(config, {
    seed: 42,
    strikeVariancePct: 5,
    includeEventLog: false,
  });
  const batch = simulateBattleBatch(config, {
    iterations: 1,
    seed: 42,
    strikeVariancePct: 5,
    includeResults: true,
  });

  assert.equal(batch.runCount, 1);
  assert.equal(batch.winCounts[single.outcome], 1);
  assert.equal(batch.winRates[single.outcome], 1);
  assert.equal(batch.averageRounds, single.rounds);
  assert.deepEqual(batch.averageTotalSurvivors, single.survivors);
  assert.deepEqual(batch.averageTotalCasualties, single.casualties);
  assert.equal(batch.results[0].actionLog.length, 0);
  assert.equal(
    Object.values(batch.winCounts).reduce((sum, count) => sum + count, 0),
    1
  );
  assert.equal(
    Object.values(batch.winRates).reduce((sum, rate) => sum + rate, 0),
    1
  );
});

test('batch validation rejects invalid iteration counts, variance, and seeds', () => {
  const config = equalBattleConfig(100);
  assert.throws(() => simulateBattleBatch(config, { iterations: 0 }), /between 1 and 500/);
  assert.throws(() => simulateBattleBatch(config, { iterations: 501 }), /between 1 and 500/);
  assert.throws(() => simulateBattleBatch(config, { iterations: 1.5 }), /must be an integer/);
  assert.throws(() => simulateBattleBatch(config, { strikeVariancePct: -1 }), /between 0 and 100/);
  assert.throws(() => simulateBattleBatch(config, { seed: 2 ** 32 }), /Seed must be between/);
});
