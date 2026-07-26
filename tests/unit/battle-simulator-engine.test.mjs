import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEFAULT_BATTLE_COEFFICIENTS,
  normalizeBattleCoefficients,
} from '../../js/battle-simulator-coefficients.js';
import {
  BATTLE_BATCH_PRESETS,
  BATTLE_MAX_ROUNDS,
  BATTLE_MODEL_ASSUMPTIONS,
  BATTLE_MODEL_VERSION,
  calculateCasualtyRate,
  simulateBattle,
  simulateBattleBatch,
} from '../../js/battle-simulator-engine.js';
import { BATTLE_EFFECT_RUNTIME_VERSION } from '../../js/battle-simulator-effect-runtime.js';

function stats(overrides = {}) {
  const {
    attack = 70,
    defense = 70,
    unitHp = 20,
    might = 100,
    resistance = 100,
    hp = 100,
    ...battleOverrides
  } = overrides;
  return {
    unit: { attack, defense, hp: unitHp },
    battle: {
      might,
      resistance,
      hp,
      tacticalMight: 0,
      tacticalResistance: 0,
      damage: 0,
      damageMitigation: 0,
      combatSpeed: 0,
      ...battleOverrides,
    },
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

function runtimeEffect(overrides = {}) {
  const definition = {
    id: 'runtime-effect',
    version: BATTLE_EFFECT_RUNTIME_VERSION,
    phase: 'before-action',
    source: 'A:front',
    target: { type: 'enemy-front', count: 1, range: 2 },
    type: 'damage',
    chance: 1,
    conditions: [],
    amount: 10,
    ...overrides,
  };
  if (
    ['status', 'stat-modifier', 'dot', 'cleanse'].includes(definition.type) &&
    !Object.hasOwn(overrides, 'amount')
  ) {
    delete definition.amount;
  }
  return definition;
}

test('battle coefficients fill defaults, reject invalid input, and return a frozen object', () => {
  const normalized = normalizeBattleCoefficients({ damageScale: 2 });
  const boundaries = normalizeBattleCoefficients({
    baseCasualtyRate: 1,
    mightScale: 10,
    hpExponent: 10,
    casualtyRateCap: 1,
  });

  assert.deepEqual(normalized, { ...DEFAULT_BATTLE_COEFFICIENTS, damageScale: 2 });
  assert.equal(Object.isFrozen(normalized), true);
  assert.equal(boundaries.baseCasualtyRate, 1);
  assert.equal(boundaries.mightScale, 10);
  assert.equal(boundaries.hpExponent, 10);
  assert.equal(boundaries.casualtyRateCap, 1);
  assert.throws(
    () => normalizeBattleCoefficients({ unknownCoefficient: 1 }),
    /Unknown battle coefficient/
  );
  assert.throws(
    () => normalizeBattleCoefficients({ mightScale: Number.NaN }),
    /must be a finite number/
  );
  assert.throws(
    () => normalizeBattleCoefficients({ hpExponent: Number.POSITIVE_INFINITY }),
    /must be a finite number/
  );
  assert.throws(() => normalizeBattleCoefficients({ mightScale: '2' }), /must be a finite number/);
  assert.throws(
    () => normalizeBattleCoefficients({ damageScale: null }),
    /must be a finite number/
  );
  assert.throws(
    () => normalizeBattleCoefficients({ resistanceExponent: true }),
    /must be a finite number/
  );
  assert.throws(
    () => normalizeBattleCoefficients({ mightScale: undefined }),
    /must be a finite number/
  );
  assert.throws(
    () => normalizeBattleCoefficients({ baseCasualtyRate: 0 }),
    /greater than 0 and at most 1/
  );
  assert.throws(
    () => normalizeBattleCoefficients({ casualtyRateCap: 1.01 }),
    /greater than 0 and at most 1/
  );
  assert.throws(
    () => normalizeBattleCoefficients({ resistanceScale: 10.01 }),
    /greater than 0 and at most 10/
  );
});

test('omitted coefficients and explicit defaults produce bit-identical results', () => {
  const config = equalBattleConfig();
  const options = { seed: 42, strikeVariancePct: 5, includeEventLog: false };
  const implicit = simulateBattle(config, options);
  const explicit = simulateBattle(config, {
    ...options,
    coefficients: DEFAULT_BATTLE_COEFFICIENTS,
  });
  const emptyDefaults = simulateBattle(config, {
    ...options,
    coefficients: {},
  });
  const partialDefaults = simulateBattle(config, {
    ...options,
    coefficients: { mightScale: DEFAULT_BATTLE_COEFFICIENTS.mightScale },
  });
  const implicitBatch = simulateBattleBatch(config, {
    iterations: 2,
    seed: 42,
    strikeVariancePct: 5,
    includeResults: true,
  });
  const explicitBatch = simulateBattleBatch(config, {
    iterations: 2,
    seed: 42,
    strikeVariancePct: 5,
    includeResults: true,
    coefficients: DEFAULT_BATTLE_COEFFICIENTS,
  });

  assert.deepEqual(implicit, explicit);
  assert.deepEqual(implicit, emptyDefaults);
  assert.deepEqual(implicit, partialDefaults);
  assert.deepEqual(implicitBatch, explicitBatch);
  assert.equal(implicit.modelVersion, BATTLE_MODEL_VERSION);
  assert.strictEqual(implicit.assumptions, BATTLE_MODEL_ASSUMPTIONS);
  assert.deepEqual(implicit.coefficients, DEFAULT_BATTLE_COEFFICIENTS);
  assert.equal(Object.isFrozen(implicit.coefficients), true);
});

test('seed 42 preserves the v2 engine golden result', () => {
  const result = simulateBattle(equalBattleConfig(), {
    seed: 42,
    strikeVariancePct: 5,
    includeEventLog: false,
  });

  assert.deepEqual(
    {
      winner: result.winner,
      rounds: result.rounds,
      survivors: result.survivors,
      casualties: result.casualties,
    },
    {
      winner: 'B',
      rounds: 50,
      survivors: { A: 0, B: 112 },
      casualties: { A: 3_000, B: 2_888 },
    }
  );
});

test('custom coefficients change battle results and identify single and batch models', () => {
  const config = equalBattleConfig();
  const options = { seed: 42, strikeVariancePct: 5, includeEventLog: false };
  const baseline = simulateBattle(config, options);
  const custom = simulateBattle(config, {
    ...options,
    coefficients: { baseCasualtyRate: 0.16 },
  });
  const batch = simulateBattleBatch(config, {
    iterations: 2,
    seed: 42,
    strikeVariancePct: 5,
    includeResults: true,
    coefficients: { baseCasualtyRate: 0.16 },
  });

  assert.notDeepEqual(
    { rounds: custom.rounds, survivors: custom.survivors, casualties: custom.casualties },
    { rounds: baseline.rounds, survivors: baseline.survivors, casualties: baseline.casualties }
  );
  assert.notEqual(custom.outcome, baseline.outcome);
  assert.equal(custom.modelVersion, `${BATTLE_MODEL_VERSION}+custom-coefficients`);
  assert.equal(custom.coefficients.baseCasualtyRate, 0.16);
  assert.equal(Object.isFrozen(custom.coefficients), true);
  assert.equal(batch.modelVersion, `${BATTLE_MODEL_VERSION}+custom-coefficients`);
  assert.deepEqual(batch.coefficients, custom.coefficients);
  assert.ok(batch.results.every((result) => result.modelVersion === batch.modelVersion));
});

test('overflowing custom-exponent arithmetic falls back to finite deterministic rates', () => {
  const extremeStats = {
    might: 5_000,
    resistance: 5_000,
    hp: 5_000,
    damage: 5_000,
  };
  const config = {
    sideA: side([row(1, extremeStats), row(0), row(0)], 'Extreme A'),
    sideB: side([row(1, extremeStats), row(0), row(0)], 'Extreme B'),
  };
  const coefficients = {
    mightExponent: 10,
    damageExponent: 10,
    resistanceExponent: 10,
    hpExponent: 10,
  };
  const first = simulateBattle(config, { seed: 42, coefficients });
  const second = simulateBattle(config, { seed: 42, coefficients });

  assert.deepEqual(first, second);
  assert.deepEqual(first.survivors, { A: 0, B: 0 });
  assert.deepEqual(first.casualties, { A: 1, B: 1 });
  assert.ok(first.actionLog.every((action) => Number.isFinite(action.casualtyRate)));
});

test('single and batch assumptions report the normalized custom casualty-rate cap', () => {
  const config = equalBattleConfig(100);
  const coefficients = { casualtyRateCap: 0.4 };
  const single = simulateBattle(config, { coefficients });
  const batch = simulateBattleBatch(config, {
    iterations: 2,
    includeResults: true,
    coefficients,
  });

  assert.equal(single.assumptions.casualtyRateCap, 0.4);
  assert.equal(Object.isFrozen(single.assumptions), true);
  assert.equal(batch.assumptions.casualtyRateCap, 0.4);
  assert.equal(Object.isFrozen(batch.assumptions), true);
  assert.ok(
    batch.results.every(
      (result) => result.assumptions.casualtyRateCap === 0.4 && Object.isFrozen(result.assumptions)
    )
  );
});

test('v2 casualty formula uses effective unit points, damage mitigation, and the 95% clamp', () => {
  assert.equal(BATTLE_MODEL_ASSUMPTIONS.statContractVersion, 2);
  assert.equal(BATTLE_MODEL_ASSUMPTIONS.hpReference, 20);
  assert.ok(Math.abs(calculateCasualtyRate(stats(), stats()) - 0.08) < 1e-12);
  assert.ok(
    Math.abs(calculateCasualtyRate(stats({ might: 500 }), stats()) - 0.4) < 1e-12,
    '70 Attack points at 500% Battle Might resolves to 350 effective Attack'
  );
  assert.equal(calculateCasualtyRate(stats({ might: 5_000 }), stats()), 0.95);

  const baseRate = calculateCasualtyRate(stats(), stats());
  assert.ok(calculateCasualtyRate(stats({ might: 200 }), stats()) > baseRate);
  assert.ok(calculateCasualtyRate(stats({ damage: 25 }), stats()) > baseRate);
  assert.ok(calculateCasualtyRate(stats(), stats({ resistance: 200 })) < baseRate);
  assert.ok(calculateCasualtyRate(stats(), stats({ hp: 200 })) < baseRate);
  assert.ok(calculateCasualtyRate(stats(), stats({ damageMitigation: 25 })) < baseRate);
});

test('Tactical Might and Tactical Resistance are recorded but inactive in v2', () => {
  const base = calculateCasualtyRate(stats({ might: 100 }), stats({ resistance: 50 }));
  const tactical = calculateCasualtyRate(
    stats({ might: 100, tacticalMight: 5_000 }),
    stats({ resistance: 50, tacticalResistance: 5_000 })
  );
  assert.equal(tactical, base);
});

test('zero effective Attack yields zero casualties instead of the old one-casualty minimum', () => {
  const config = {
    sideA: side([row(100, { attack: 0, combatSpeed: 10 }), row(0), row(0)], 'No attack'),
    sideB: side([row(100, { attack: 0, combatSpeed: 5 }), row(0), row(0)], 'No counterattack'),
  };
  const result = simulateBattle(config, { includeEventLog: true });

  assert.equal(calculateCasualtyRate(stats({ attack: 0 }), stats()), 0);
  assert.equal(result.outcome, 'stalemate');
  assert.equal(result.rounds, BATTLE_MAX_ROUNDS);
  assert.ok(result.actionLog.every((action) => action.casualties === 0));
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

test('no-effect formations preserve the legacy model and result surface exactly', () => {
  const config = equalBattleConfig();
  const baseline = simulateBattle(config, { seed: 42, strikeVariancePct: 5 });
  const explicitEmpty = simulateBattle(
    { ...config, effectDefinitions: [] },
    { seed: 42, strikeVariancePct: 5, effectDefinitions: [] }
  );

  assert.deepEqual(explicitEmpty, baseline);
  assert.equal(baseline.modelVersion, BATTLE_MODEL_VERSION);
  assert.equal(Object.hasOwn(baseline, 'effectEvents'), false);
  assert.equal(Object.hasOwn(baseline, 'effectDiagnostics'), false);
});

test('known hero effects are seeded, deterministic, and publish the effect model only when active', () => {
  const config = equalBattleConfig();
  config.sideA.rows[0] = row(1_000, {}, { type: 'footmen', heroName: 'Jiguang Qi', skillIds: [2] });

  const first = simulateBattle(config, { seed: 9, strikeVariancePct: 5 });
  const second = simulateBattle(config, { seed: 9, strikeVariancePct: 5 });

  assert.deepEqual(first, second);
  assert.equal(
    first.modelVersion,
    `${BATTLE_MODEL_VERSION}+effects-${BATTLE_EFFECT_RUNTIME_VERSION}`
  );
  assert.equal(first.effectRuntimeVersion, BATTLE_EFFECT_RUNTIME_VERSION);
  assert.ok(first.effectEvents.some(({ effectId }) => effectId === 'A:front:2:damage:1'));
  assert.deepEqual(first.effectDiagnostics, []);
});

test('a seeded hero loadout remains symmetric when the complete sides are swapped', () => {
  const enhanced = side(
    [
      row(1_000, {}, { type: 'footmen', heroName: 'Jiguang Qi', skillIds: [2] }),
      row(1_000, {}, { type: 'footmen' }),
      row(1_000, {}, { type: 'footmen' }),
    ],
    'Enhanced'
  );
  const plain = side([row(1_000, {}, { type: 'footmen' }), row(1_000), row(1_000)], 'Plain');

  const forward = simulateBattle({ sideA: enhanced, sideB: plain }, { seed: 99 });
  const reverse = simulateBattle(
    { sideA: structuredClone(plain), sideB: structuredClone(enhanced) },
    { seed: 99 }
  );

  assert.equal(forward.outcome, 'A');
  assert.equal(reverse.outcome, 'B');
  assert.equal(forward.survivors.A, reverse.survivors.B);
  assert.equal(forward.casualties.A, reverse.casualties.B);
  assert.equal(forward.survivors.B, reverse.survivors.A);
  assert.equal(forward.casualties.B, reverse.casualties.A);
});

test('unsupported hero projections return diagnostics without executing or changing the model', () => {
  const config = equalBattleConfig();
  config.sideA.rows[0] = row(1_000, {}, { type: 'footmen', heroName: 'Jiguang Qi', skillIds: [5] });
  const withUnsupported = simulateBattle(config, { seed: 42 });
  const withoutHero = simulateBattle(equalBattleConfig(), { seed: 42 });

  assert.equal(withUnsupported.modelVersion, BATTLE_MODEL_VERSION);
  assert.deepEqual(withUnsupported.survivors, withoutHero.survivors);
  assert.deepEqual(withUnsupported.casualties, withoutHero.casualties);
  assert.deepEqual(withUnsupported.effectEvents, []);
  assert.equal(withUnsupported.effectDiagnostics[0].code, 'skill-not-executable');
});

test('runtime status, healing, DoT, and stat modifiers map through troop state conservatively', () => {
  const config = equalBattleConfig(1_000);
  const effects = [
    runtimeEffect({
      id: 'opening-disarm',
      phase: 'battle-start',
      type: 'status',
      status: 'disarm',
      duration: 1,
      stacks: 1,
      maxStacks: 1,
    }),
    runtimeEffect({
      id: 'burn',
      phase: 'battle-start',
      type: 'dot',
      status: 'burn',
      amount: 10,
      duration: 2,
      stacks: 1,
      maxStacks: 1,
    }),
    runtimeEffect({
      id: 'recovery',
      phase: 'after-damage',
      target: { type: 'self', count: 1, range: 0 },
      type: 'heal',
      amount: 5,
    }),
    runtimeEffect({
      id: 'might',
      phase: 'battle-start',
      target: { type: 'self', count: 1, range: 0 },
      type: 'stat-modifier',
      stat: 'attack',
      amount: 35,
      duration: 2,
      stacks: 1,
      maxStacks: 1,
    }),
  ];
  const result = simulateBattle(config, { seed: 7, effectDefinitions: effects });

  assert.equal(
    result.actionLog.some(
      ({ round, attackerSide, attackerRowId }) =>
        round === 1 && attackerSide === 'B' && attackerRowId === 'front'
    ),
    false
  );
  assert.ok(
    result.effectEvents.some(({ type, status }) => type === 'status' && status === 'disarm')
  );
  assert.ok(result.effectEvents.some(({ type }) => type === 'heal'));
  assert.ok(result.effectEvents.some(({ type }) => type === 'dot-tick'));
  assert.ok(
    result.effectEvents.some(({ type, stat }) => type === 'stat-modifier' && stat === 'attack')
  );
  assert.ok(
    result.sides.A.rows.every(({ survivingTroops }) => Number.isSafeInteger(survivingTroops))
  );
  assert.ok(
    result.sides.B.rows.every(({ survivingTroops }) => Number.isSafeInteger(survivingTroops))
  );
});

test('post-normal effects do not break simultaneous normal exchange allocation', () => {
  const config = {
    sideA: side([row(1), row(0), row(0)], 'A'),
    sideB: side([row(1), row(0), row(0)], 'B'),
  };
  const result = simulateBattle(config, {
    effectDefinitions: [
      runtimeEffect({
        phase: 'after-normal-attack',
        amount: 1_000,
      }),
    ],
  });

  assert.equal(result.outcome, 'draw');
  assert.equal(result.roundLog[0].groups[0].actions.length, 2);
  assert.deepEqual(
    result.roundLog[0].groups[0].actions.map(({ casualties }) => casualties),
    [1, 1]
  );
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
  const lethal = { might: 5_000 };
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
      [row(1, { resistance: 5_000, hp: 5_000, combatSpeed: 1 }), row(0), row(0)],
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
    row(1_000_000, { resistance: 5_000, hp: 5_000 }),
    row(1_000_000, { resistance: 5_000, hp: 5_000 }),
    row(1_000_000, { resistance: 5_000, hp: 5_000 }),
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

test('engine requires the complete nested v2 stat contract and rejects legacy finalStats', () => {
  const complete = stats();
  const missingUnit = structuredClone(complete);
  delete missingUnit.unit.attack;
  const missingBattle = structuredClone(complete);
  delete missingBattle.battle.damageMitigation;

  assert.throws(
    () => calculateCasualtyRate(missingUnit, complete),
    /missing required field "attack"/i
  );
  assert.throws(
    () => calculateCasualtyRate(complete, missingBattle),
    /missing required field "damageMitigation"/i
  );
  assert.throws(
    () =>
      calculateCasualtyRate({ unitStats: complete.unit, battleStats: complete.battle }, complete),
    /missing required field "unit"/i
  );

  const legacyRow = { type: 'cavalry', tier: 9, troops: 1, finalStats: complete };
  assert.throws(
    () =>
      simulateBattle({
        sideA: side([legacyRow, row(0), row(0)], 'Legacy'),
        sideB: side([row(1), row(0), row(0)], 'Current'),
      }),
    /stats must be provided as an object/i
  );
});

test('engine bounds stat values and row troops while preserving safe maximum side totals', () => {
  assert.throws(
    () => calculateCasualtyRate(stats({ attack: 5_001 }), stats()),
    /unit attack cannot exceed 5000/i
  );
  assert.throws(
    () => calculateCasualtyRate(stats({ might: 5_001 }), stats()),
    /battle might cannot exceed 5000/i
  );
  assert.throws(
    () => calculateCasualtyRate(stats({ combatSpeed: 10_001 }), stats()),
    /battle combatSpeed cannot exceed 10000/i
  );

  const overCap = equalBattleConfig();
  overCap.sideA.rows[0].troops = 10_000_001;
  assert.throws(() => simulateBattle(overCap), /troops cannot exceed 10000000/i);

  const maxRows = () => [row(10_000_000), row(10_000_000), row(10_000_000)];
  const zeroRows = () => [row(0), row(0), row(0)];
  const result = simulateBattle({
    sideA: side(maxRows(), 'Maximum'),
    sideB: side(zeroRows(), 'Empty'),
  });
  assert.equal(result.sides.A.initialTroops, 30_000_000);
  assert.equal(Number.isSafeInteger(result.sides.A.initialTroops), true);
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
