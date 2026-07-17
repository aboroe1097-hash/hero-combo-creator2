import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BATTLE_ROWS,
  BATTLE_STAT_BASELINES,
  BATTLE_STAT_CONTRACT,
  BATTLE_STAT_KEYS,
  BATTLE_STAT_METADATA,
  DEFAULT_TROOPS,
  EDITABLE_BASE_STAT_KEYS,
  STAT_INPUT_MODES,
  TROOP_PROFILES,
  UNIT_STAT_KEYS,
  calculateTroopStats,
  getTroopProfile,
} from '../../js/battle-simulator-data.js';

function source(overrides = {}) {
  return {
    sourceType: 'research',
    sourceId: 'research.cavalry-might',
    label: 'Cavalry Might research',
    statKey: 'might',
    amount: 50,
    operation: 'add',
    unit: 'percent',
    appliesTo: { battleModes: ['pvp-field'], troopTypes: ['cavalry'], rowIds: [] },
    verification: { status: 'verified' },
    provenance: { source: 'test-fixture' },
    ...overrides,
  };
}

test('v2 keeps 31,000 troops and fixed Front, Middle, Back rows', () => {
  assert.equal(DEFAULT_TROOPS, 31_000);
  assert.deepEqual(
    BATTLE_ROWS.map(({ id, label, position }) => ({ id, label, position })),
    [
      { id: 'front', label: 'Front', position: 0 },
      { id: 'middle', label: 'Middle', position: 1 },
      { id: 'back', label: 'Back', position: 2 },
    ]
  );
});

test('all six troop profiles expose supplied card values as unit points, not percentages', () => {
  const expected = {
    cavalry: {
      9: { attack: 88.74, defense: 49.98, hp: 18.36 },
      10: { attack: 92.82, defense: 52.02, hp: 18.36 },
    },
    archers: {
      9: { attack: 107.1, defense: 49.49, hp: 13 },
      10: { attack: 111.18, defense: 51.51, hp: 13 },
    },
    footmen: {
      9: { attack: 71.4, defense: 74.46, hp: 20 },
      10: { attack: 74.46, defense: 77.52, hp: 21 },
    },
  };

  for (const [type, tiers] of Object.entries(expected)) {
    for (const [tier, stats] of Object.entries(tiers)) {
      const profile = getTroopProfile(type, tier);
      assert.deepEqual(profile.unitStats, stats);
      assert.equal(Object.hasOwn(profile, 'baseStats'), false);
      assert.equal(Object.isFrozen(profile.unitStats), true);
    }
  }
  assert.equal(Object.keys(TROOP_PROFILES).length, 3);
});

test('stat contract separates unit points from eight battle stats and their neutral baselines', () => {
  assert.deepEqual(UNIT_STAT_KEYS, ['attack', 'defense', 'hp']);
  assert.deepEqual(EDITABLE_BASE_STAT_KEYS, UNIT_STAT_KEYS);
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
  assert.deepEqual(BATTLE_STAT_BASELINES, {
    might: 100,
    resistance: 100,
    hp: 100,
    tacticalMight: 0,
    tacticalResistance: 0,
    damage: 0,
    damageMitigation: 0,
    combatSpeed: 0,
  });
  assert.equal(BATTLE_STAT_CONTRACT.version, 2);
  assert.equal(BATTLE_STAT_METADATA.might.label, 'Battle Might');
  assert.equal(BATTLE_STAT_METADATA.combatSpeed.unit, 'raw');
});

test('source mode adds neutral baseline, applicable automatic sources, and manual values', () => {
  const result = calculateTroopStats({
    type: 'cavalry',
    tier: 9,
    mode: STAT_INPUT_MODES.ADD_BONUSES,
    unitValues: { attack: 70 },
    values: { might: 350, resistance: 20, combatSpeed: 519 },
    sources: [source()],
    context: { battleMode: 'pvp-field', rowId: 'front' },
  });

  assert.deepEqual(result.unit.resolved, { attack: 70, defense: 49.98, hp: 18.36 });
  assert.equal(result.battle.totals.might, 500);
  assert.equal(result.battle.totals.resistance, 120);
  assert.equal(result.battle.totals.hp, 100);
  assert.equal(result.battle.totals.combatSpeed, 519);
  assert.deepEqual(result.effective, { attack: 350, defense: 59.976, hp: 18.36 });
  assert.equal(result.battle.includedSources.length, 4);
  assert.equal(result.battle.excludedSources.length, 0);
  assert.deepEqual(result.engineStats, {
    unit: result.unit.resolved,
    battle: result.battle.totals,
  });
});

test('source mode counts an exact automatic source contribution only once', () => {
  const automatic = source({
    appliesTo: { battleModes: [], troopTypes: [], rowIds: [] },
  });
  const result = calculateTroopStats({
    type: 'cavalry',
    tier: 9,
    sources: [automatic, structuredClone(automatic)],
  });

  assert.equal(result.battle.totals.might, 150);
  assert.equal(result.battle.includedSources.length, 1);
  assert.equal(result.effective.attack, 133.11);
});

test('final-total mode applies 70 points at 500% as 350 and excludes automatic sources', () => {
  const result = calculateTroopStats({
    type: 'footmen',
    tier: 9,
    mode: STAT_INPUT_MODES.FINAL_TOTALS,
    unitValues: { attack: 70 },
    values: { might: 500, resistance: 390, hp: 250, damageMitigation: 25 },
    sources: [source({ appliesTo: { battleModes: [], troopTypes: [], rowIds: [] } })],
  });

  assert.equal(result.battle.totals.might, 500);
  assert.equal(result.effective.attack, 350);
  assert.equal(result.effective.defense, 290.394);
  assert.equal(result.effective.hp, 50);
  assert.equal(result.battle.includedSources.length, 0);
  assert.equal(result.battle.excludedSources.length, 1);
  assert.equal(result.battle.excludedSources[0].exclusionReason, 'final-total-override');
});

test('non-applicable sources remain informational and do not alter source-mode totals', () => {
  const result = calculateTroopStats({
    type: 'archers',
    tier: 10,
    sources: [source()],
    context: { battleMode: 'pvp-field', rowId: 'back' },
  });

  assert.equal(result.battle.totals.might, 100);
  assert.equal(result.battle.includedSources.length, 0);
  assert.equal(result.battle.excludedSources[0].exclusionReason, 'troop-type');
});

test('canonical unit overrides remain independent and never mutate input', () => {
  const unitValues = { attack: 90, defense: 60, hp: 25 };
  const before = structuredClone(unitValues);
  const result = calculateTroopStats({
    type: 'cavalry',
    tier: 9,
    unitValues,
    values: { might: 400 },
  });

  assert.deepEqual(result.unit.entered, { attack: 90, defense: 60, hp: 25 });
  assert.deepEqual(result.unit.resolved, { attack: 90, defense: 60, hp: 25 });
  assert.equal(result.battle.totals.might, 500);
  assert.equal(result.effective.attack, 450);
  assert.deepEqual(unitValues, before);
});

test('calculation enforces finite maxima and derives maximum effective stats without overflow', () => {
  const maximum = calculateTroopStats({
    type: 'footmen',
    tier: 9,
    mode: STAT_INPUT_MODES.FINAL_TOTALS,
    unitValues: { attack: 5_000, defense: 5_000, hp: 5_000 },
    values: { might: 5_000, resistance: 5_000, hp: 5_000, combatSpeed: 10_000 },
  });
  assert.deepEqual(maximum.effective, { attack: 250_000, defense: 250_000, hp: 250_000 });
  assert.ok(Object.values(maximum.effective).every(Number.isFinite));

  assert.throws(
    () =>
      calculateTroopStats({
        type: 'footmen',
        tier: 9,
        unitValues: { attack: 5_001 },
      }),
    /Attack cannot exceed 5000/
  );
  assert.throws(
    () => calculateTroopStats({ type: 'footmen', tier: 9, values: { might: 5_001 } }),
    /Battle Might cannot exceed 5000/
  );
  assert.throws(
    () => calculateTroopStats({ type: 'footmen', tier: 9, values: { combatSpeed: 10_001 } }),
    /Combat Speed cannot exceed 10000/
  );
  assert.throws(
    () =>
      calculateTroopStats({
        type: 'footmen',
        tier: 9,
        sources: [
          source({
            amount: 5_000,
            appliesTo: { battleModes: [], troopTypes: [], rowIds: [] },
          }),
        ],
      }),
    /Battle Might cannot exceed 5000/
  );
});

test('calculation validation rejects ambiguous, unsupported, negative, and non-finite input', () => {
  assert.throws(() => getTroopProfile('mage', 9), /Unsupported troop type/);
  assert.throws(() => getTroopProfile('cavalry', 8), /Unsupported troop tier/);
  assert.throws(
    () => calculateTroopStats({ type: 'cavalry', tier: 9, mode: 'mystery' }),
    /Unsupported stat input mode/
  );
  assert.throws(
    () =>
      calculateTroopStats({
        type: 'cavalry',
        tier: 9,
        unitValues: { might: 90 },
      }),
    /Unsupported unit stat "might"/
  );
  assert.throws(
    () => calculateTroopStats({ type: 'cavalry', tier: 9, values: { might: -1 } }),
    /cannot be negative/
  );
  assert.throws(
    () => calculateTroopStats({ type: 'cavalry', tier: 9, values: { might: Infinity } }),
    /finite number/
  );
  assert.throws(
    () => calculateTroopStats({ type: 'cavalry', tier: 9, values: { marchingSpeed: 26 } }),
    /Unsupported battle stat/
  );
});
