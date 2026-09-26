import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEAD_TROOP_CLASSES,
  DEAD_TROOP_UNITS,
  DEAD_TROOP_VARIANTS,
  deadTroopMultiplier,
  deadTroopRowPower,
  deadTroopsTotalPower,
  deadTroopUnitScale,
} from '../../js/dead-troops.js';

test('the grid covers four classes times four tier variants', () => {
  assert.deepEqual([...DEAD_TROOP_CLASSES], ['lofty', 'footmen', 'cavalry', 'archers']);
  assert.deepEqual([...DEAD_TROOP_VARIANTS], ['t10e', 't10', 't9e', 't9']);
  assert.deepEqual([...DEAD_TROOP_UNITS], ['thousands', 'millions']);
  assert.equal(DEAD_TROOP_CLASSES.length * DEAD_TROOP_VARIANTS.length, 16);
});

test('per-unit power follows the owner\u2019s numbers', () => {
  // Every Lofty row is 8.2 regardless of tier.
  for (const variant of DEAD_TROOP_VARIANTS) {
    assert.equal(deadTroopMultiplier('lofty', variant), 8.2, `lofty ${variant}`);
  }
  // Enhanced and normal share their tier: T10 is 7.5, T9 is 7.0.
  for (const className of ['footmen', 'cavalry', 'archers']) {
    assert.equal(deadTroopMultiplier(className, 't10e'), 7.5);
    assert.equal(deadTroopMultiplier(className, 't10'), 7.5);
    assert.equal(deadTroopMultiplier(className, 't9e'), 7.0);
    assert.equal(deadTroopMultiplier(className, 't9'), 7.0);
  }
});

test('counts are thousands by default and millions when switched', () => {
  assert.equal(deadTroopUnitScale('thousands'), 1000);
  assert.equal(deadTroopUnitScale('millions'), 1_000_000);
  // 3 thousand lofty T10: 3 × 1000 × 8.2 = 24,600.
  assert.equal(
    deadTroopRowPower(3, { className: 'lofty', variant: 't10', unit: 'thousands' }),
    24_600
  );
  // 2.5 million archers T9: 2.5 × 1,000,000 × 7.0 = 17,500,000.
  assert.equal(
    deadTroopRowPower('2.5', { className: 'archers', variant: 't9', unit: 'millions' }),
    17_500_000
  );
  // An unknown unit behaves like the default.
  assert.equal(deadTroopRowPower(3, { className: 'lofty', variant: 't10' }), 24_600);
});

test('blank or hostile counts contribute zero', () => {
  for (const count of ['', '   ', 'nonsense', -5, null, undefined, NaN, {}]) {
    assert.equal(
      deadTroopRowPower(count, { className: 'footmen', variant: 't10', unit: 'thousands' }),
      0,
      JSON.stringify(String(count))
    );
  }
});

test('the total sums every cell and survives malformed rows', () => {
  const rows = [
    { className: 'lofty', variant: 't10e', count: 1 }, // 8.2k
    { className: 'footmen', variant: 't9', count: 2 }, // 14k
    { className: 'cavalry', variant: 't10', count: '3' }, // 22.5k
    { className: 'archers', variant: 'nonsense', count: 5 }, // variant falls to 7.0
    { className: 'nonsense', variant: 't10', count: 1 }, // class falls to 7.5
    null,
    { className: 'lofty', variant: 't10', count: 'oops' },
  ];
  // 8,200 + 14,000 + 22,500 + 35,000 + 7,500 = 87,200
  assert.equal(deadTroopsTotalPower(rows, 'thousands'), 87_200);
  assert.equal(deadTroopsTotalPower([], 'thousands'), 0);
  assert.equal(deadTroopsTotalPower(null, 'thousands'), 0);
});
