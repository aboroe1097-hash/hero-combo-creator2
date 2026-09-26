import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEAD_TROOP_CLASSES,
  DEAD_TROOP_UNITS,
  DEAD_TROOP_VARIANTS,
  deadTroopActualCount,
  deadTroopMultiplier,
  deadTroopRowPower,
  deadTroopsTotalPower,
  deadTroopUnitScale,
} from '../../js/dead-troops.js';

test('the grid is three troop types times five tiers', () => {
  assert.deepEqual([...DEAD_TROOP_CLASSES], ['cavalry', 'footmen', 'archers']);
  assert.deepEqual([...DEAD_TROOP_VARIANTS], ['lofty', 't10e', 't10', 't9e', 't9']);
  assert.deepEqual([...DEAD_TROOP_UNITS], ['thousands', 'millions']);
  assert.equal(DEAD_TROOP_CLASSES.length * DEAD_TROOP_VARIANTS.length, 15);
});

test('per-unit power follows the owner\u2019s numbers', () => {
  // Lofty is T11 at 8.2; Enhanced and normal share their tier.
  assert.equal(deadTroopMultiplier('lofty'), 8.2);
  assert.equal(deadTroopMultiplier('t10e'), 7.5);
  assert.equal(deadTroopMultiplier('t10'), 7.5);
  assert.equal(deadTroopMultiplier('t9e'), 7.0);
  assert.equal(deadTroopMultiplier('t9'), 7.0);
  // An unknown tier falls to the lowest number rather than throwing.
  assert.equal(deadTroopMultiplier('nonsense'), 7);
});

test('counts are thousands by default and millions when switched', () => {
  assert.equal(deadTroopUnitScale('thousands'), 1000);
  assert.equal(deadTroopUnitScale('millions'), 1_000_000);
  // 3 thousand Lofty: 3 × 1000 × 8.2 = 24,600.
  assert.equal(deadTroopRowPower(3, { variant: 'lofty', unit: 'thousands' }), 24_600);
  // 2.5 million Archers T9: 2.5 × 1,000,000 × 7.0 = 17,500,000.
  assert.equal(deadTroopRowPower('2.5', { variant: 't9', unit: 'millions' }), 17_500_000);
  // An unknown unit behaves like the default.
  assert.equal(deadTroopRowPower(3, { variant: 'lofty' }), 24_600);
});

test('blank or hostile counts contribute zero', () => {
  for (const count of ['', '   ', 'nonsense', -5, null, undefined, NaN, {}]) {
    assert.equal(
      deadTroopRowPower(count, { variant: 't10', unit: 'thousands' }),
      0,
      JSON.stringify(String(count))
    );
  }
});

test('the total sums every cell and survives malformed rows', () => {
  const rows = [
    { variant: 'lofty', count: 1 }, // 8.2k
    { variant: 't10e', count: 2 }, // 15k
    { variant: 't10', count: '3' }, // 22.5k
    { variant: 't9e', count: 4 }, // 28k
    { variant: 't9', count: 5 }, // 35k
    { variant: 'nonsense', count: 1 }, // unknown tier -> 7k
    null,
    { variant: 'lofty', count: 'oops' },
  ];
  // 8,200 + 15,000 + 22,500 + 28,000 + 35,000 + 7,000 = 115,700
  assert.equal(deadTroopsTotalPower(rows, 'thousands'), 115_700);
  assert.equal(deadTroopsTotalPower([], 'thousands'), 0);
  assert.equal(deadTroopsTotalPower(null, 'thousands'), 0);
});

test('an entered number reports the troops it really means', () => {
  assert.equal(deadTroopActualCount(20, 'thousands'), 20_000);
  assert.equal(deadTroopActualCount('2.5', 'millions'), 2_500_000);
  assert.equal(deadTroopActualCount('', 'thousands'), 0);
  assert.equal(deadTroopActualCount('oops', 'thousands'), 0);
  assert.equal(deadTroopActualCount(-3, 'thousands'), 0);
  // The count and the power agree for the same entry.
  assert.equal(
    deadTroopActualCount(20, 'thousands') * 8.2,
    deadTroopRowPower(20, { variant: 'lofty', unit: 'thousands' })
  );
});
