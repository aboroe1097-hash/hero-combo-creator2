import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BATTLE_ROWS,
  DEFAULT_TROOPS,
  EDITABLE_BASE_STAT_KEYS,
  STAT_INPUT_MODES,
  TROOP_PROFILES,
  TROOP_STAT_KEYS,
  TROOP_STAT_METADATA,
  calculateTroopStats,
  getTroopProfile,
} from '../../js/battle-simulator-data.js';

test('Phase 1 uses 31,000 troops and fixed Front, Middle, Back rows', () => {
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

test('all six supported troop profiles match the supplied T9 and T10 cards', () => {
  const expected = {
    cavalry: {
      9: { might: 88.74, resistance: 49.98, hp: 18.36 },
      10: { might: 92.82, resistance: 52.02, hp: 18.36 },
    },
    archers: {
      9: { might: 107.1, resistance: 49.49, hp: 13 },
      10: { might: 111.18, resistance: 51.51, hp: 13 },
    },
    footmen: {
      9: { might: 71.4, resistance: 74.46, hp: 20 },
      10: { might: 74.46, resistance: 77.52, hp: 21 },
    },
  };

  for (const [type, tiers] of Object.entries(expected)) {
    for (const [tier, stats] of Object.entries(tiers)) {
      const profile = getTroopProfile(type, tier);
      assert.deepEqual(
        {
          might: profile.baseStats.might,
          resistance: profile.baseStats.resistance,
          hp: profile.baseStats.hp,
        },
        stats
      );
      assert.deepEqual(
        {
          tacticalMight: profile.baseStats.tacticalMight,
          tacticalResistance: profile.baseStats.tacticalResistance,
          damage: profile.baseStats.damage,
          combatSpeed: profile.baseStats.combatSpeed,
        },
        { tacticalMight: 0, tacticalResistance: 0, damage: 0, combatSpeed: 0 }
      );
    }
  }

  assert.equal(Object.keys(TROOP_PROFILES).length, 3);
});

test('unavailable Phase 1 base stat sources are explicit and Combat Speed stays raw', () => {
  for (const key of ['tacticalMight', 'tacticalResistance', 'damage', 'combatSpeed']) {
    assert.equal(TROOP_STAT_METADATA[key].baseSourceAvailable, false);
    assert.match(TROOP_STAT_METADATA[key].source, /unavailable/i);
  }
  assert.equal(TROOP_STAT_METADATA.combatSpeed.unit, 'raw');
  assert.equal(TROOP_STAT_METADATA.might.baseSourceAvailable, true);
  assert.equal(TROOP_STAT_KEYS.length, 7);
});

test('add-bonuses mode derives the exact Cav T9 88.74 + 300 = 388.74 total', () => {
  const result = calculateTroopStats({
    type: 'cavalry',
    tier: 9,
    mode: STAT_INPUT_MODES.ADD_BONUSES,
    values: { might: 300, resistance: 12, combatSpeed: 519 },
  });

  assert.equal(result.base.might, 88.74);
  assert.equal(result.entered.might, 300);
  assert.equal(result.final.might, 388.74);
  assert.equal(result.final.resistance, 61.98);
  assert.equal(result.final.combatSpeed, 519);
  assert.equal(result.final.tacticalMight, 0);
});

test('editable Cav T9 base Might supports the exact 90 + 300 = 390 calculation', () => {
  const result = calculateTroopStats({
    type: 'cavalry',
    tier: 9,
    mode: STAT_INPUT_MODES.ADD_BONUSES,
    baseValues: { might: 90 },
    values: { might: 300 },
  });

  assert.deepEqual(EDITABLE_BASE_STAT_KEYS, ['might', 'resistance', 'hp']);
  assert.equal(result.profile.baseStats.might, 88.74);
  assert.equal(result.base.might, 90);
  assert.equal(result.entered.might, 300);
  assert.equal(result.final.might, 390);
  assert.equal(result.base.tacticalMight, 0);
  assert.equal(result.base.tacticalResistance, 0);
  assert.equal(result.base.damage, 0);
  assert.equal(result.base.combatSpeed, 0);
});

test('otherwise-equivalent rows calculate independently from their own editable base values', () => {
  const shared = {
    type: 'archers',
    tier: 10,
    mode: STAT_INPUT_MODES.ADD_BONUSES,
    values: { might: 100, resistance: 200, hp: 50 },
  };
  const sideA = calculateTroopStats({
    ...shared,
    baseValues: { might: 111.18, resistance: 51.51, hp: 13 },
  });
  const sideB = calculateTroopStats({
    ...shared,
    baseValues: { might: 140, resistance: 80, hp: 25 },
  });

  assert.deepEqual(sideA.final, {
    might: 211.18,
    resistance: 251.51,
    hp: 63,
    tacticalMight: 0,
    tacticalResistance: 0,
    damage: 0,
    combatSpeed: 0,
  });
  assert.deepEqual(sideB.final, {
    might: 240,
    resistance: 280,
    hp: 75,
    tacticalMight: 0,
    tacticalResistance: 0,
    damage: 0,
    combatSpeed: 0,
  });
});

test('final-totals mode uses entered totals directly and defaults omitted totals to base', () => {
  const result = calculateTroopStats({
    type: 'footmen',
    tier: 10,
    mode: STAT_INPUT_MODES.FINAL_TOTALS,
    values: {
      might: 390,
      tacticalMight: 571.32,
      tacticalResistance: 156.3,
      damage: 28,
      combatSpeed: 519,
    },
  });

  assert.equal(result.final.might, 390);
  assert.equal(result.final.resistance, 77.52);
  assert.equal(result.final.hp, 21);
  assert.equal(result.final.tacticalMight, 571.32);
  assert.equal(result.final.tacticalResistance, 156.3);
  assert.equal(result.final.damage, 28);
  assert.equal(result.final.combatSpeed, 519);
});

test('an entered final total remains direct and independent of an edited base value', () => {
  const result = calculateTroopStats({
    type: 'cavalry',
    tier: 9,
    mode: STAT_INPUT_MODES.FINAL_TOTALS,
    baseValues: { might: 90, resistance: 60, hp: 25 },
    values: { might: 390, resistance: 420, hp: 180 },
  });

  assert.deepEqual(
    { might: result.base.might, resistance: result.base.resistance, hp: result.base.hp },
    { might: 90, resistance: 60, hp: 25 }
  );
  assert.deepEqual(
    { might: result.final.might, resistance: result.final.resistance, hp: result.final.hp },
    { might: 390, resistance: 420, hp: 180 }
  );
});

test('stat calculation is pure and does not mutate the caller values or frozen profile', () => {
  const values = { might: 300 };
  const baseValues = { might: 90, resistance: 60, hp: 25 };
  const before = structuredClone(values);
  const baseBefore = structuredClone(baseValues);
  const profile = getTroopProfile('cavalry', 9);

  calculateTroopStats({ type: 'cavalry', tier: 9, baseValues, values });

  assert.deepEqual(values, before);
  assert.deepEqual(baseValues, baseBefore);
  assert.equal(Object.isFrozen(profile), true);
  assert.equal(Object.isFrozen(profile.baseStats), true);
  assert.equal(profile.baseStats.might, 88.74);
});

test('profile and stat validation fail clearly on unsupported or unsafe input', () => {
  assert.throws(() => getTroopProfile('mage', 9), /Unsupported troop type/);
  assert.throws(() => getTroopProfile('cavalry', 8), /Unsupported troop tier/);
  assert.throws(
    () => calculateTroopStats({ type: 'cavalry', tier: 9, mode: 'mystery' }),
    /Unsupported stat input mode/
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
    /Unsupported troop stat/
  );
  assert.throws(
    () => calculateTroopStats({ type: 'cavalry', tier: 9, baseValues: { might: -1 } }),
    /cannot be negative/
  );
  assert.throws(
    () => calculateTroopStats({ type: 'cavalry', tier: 9, baseValues: { resistance: Infinity } }),
    /finite number/
  );
  assert.throws(
    () => calculateTroopStats({ type: 'cavalry', tier: 9, baseValues: { tacticalMight: 10 } }),
    /Unsupported editable base stat/
  );
});
