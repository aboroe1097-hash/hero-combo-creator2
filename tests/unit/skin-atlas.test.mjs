import test from 'node:test';
import assert from 'node:assert/strict';

import { SKIN_TIERS, getSkinTiers, SKIN_TYPES } from '../../js/skins-db.js';

function sumItems(steps) {
  const totals = new Map();
  for (const step of steps) {
    for (const item of step?.items || []) {
      totals.set(item.name, (totals.get(item.name) || 0) + item.qty);
    }
  }
  return totals;
}

function costsFor(tier) {
  return {
    inheriting: tier.star1To2.items,
    preserving: tier.star2To3?.items || [],
    maximize: tier.maximizeTotal,
  };
}

test('Skin Atlas exposes the three verified tiers in order', () => {
  const tiers = getSkinTiers();
  assert.equal(tiers, SKIN_TIERS);
  assert.deepEqual(
    tiers.map((tier) => tier.id),
    ['mythic', 'legendary', 'everlasting']
  );
  for (const tier of tiers) {
    assert.ok(SKIN_TYPES[tier.typeKey], `${tier.id} references a known tier color`);
    assert.equal(tier.color, SKIN_TYPES[tier.typeKey].color);
  }
});

test('Mythic tier has an inheriting cost but no preserving skill', () => {
  const mythic = SKIN_TIERS.find((tier) => tier.id === 'mythic');
  assert.equal(mythic.hasPreserving, false);
  assert.equal(mythic.star2To3, null);
  assert.deepEqual(mythic.star1To2.items, [
    { name: 'Epic Hero Medal', qty: 18 },
    { name: 'Legendary Hero Medal', qty: 9 },
    { name: 'Biography Seal', qty: 240 },
  ]);
  assert.deepEqual(mythic.knownHeroes, ['Queen Anne', 'Beast Queen']);
});

test('Skin Atlas preserves every verified star-up cost', () => {
  assert.deepEqual(costsFor(SKIN_TIERS[0]), {
    inheriting: [
      { name: 'Epic Hero Medal', qty: 18 },
      { name: 'Legendary Hero Medal', qty: 9 },
      { name: 'Biography Seal', qty: 240 },
    ],
    preserving: [],
    maximize: [
      { name: 'Biography Seal', qty: 240 },
      { name: 'Legendary Hero Medal', qty: 9 },
      { name: 'Epic Hero Medal', qty: 18 },
    ],
  });
  assert.deepEqual(costsFor(SKIN_TIERS[1]), {
    inheriting: [
      { name: 'Epic Hero Medal', qty: 32 },
      { name: 'Legendary Hero Medal', qty: 16 },
      { name: 'Biography Seal', qty: 480 },
    ],
    preserving: [
      { name: 'Legendary Hero Medal', qty: 2 },
      { name: 'Seasonal Legendary Hero Medal', qty: 2 },
      { name: 'Biography Seal', qty: 450 },
    ],
    maximize: [
      { name: 'Biography Seal', qty: 930 },
      { name: 'Epic Hero Medal', qty: 32 },
      { name: 'Legendary Hero Medal', qty: 18 },
      { name: 'Seasonal Legendary Hero Medal', qty: 2 },
    ],
  });
  assert.deepEqual(costsFor(SKIN_TIERS[2]), {
    inheriting: [
      { name: 'Epic Hero Medal', qty: 96 },
      { name: 'Legendary Hero Medal', qty: 32 },
      { name: 'Seasonal Legendary Hero Medal', qty: 4 },
      { name: 'Advanced Biography Seal', qty: 480 },
    ],
    preserving: [
      { name: 'Legendary Hero Medal', qty: 6 },
      { name: 'Seasonal Legendary Hero Medal', qty: 6 },
      { name: 'Advanced Biography Seal', qty: 280 },
    ],
    maximize: [
      { name: 'Advanced Biography Seal', qty: 760 },
      { name: 'Epic Hero Medal', qty: 96 },
      { name: 'Legendary Hero Medal', qty: 38 },
      { name: 'Seasonal Legendary Hero Medal', qty: 10 },
    ],
  });
});

test('Skin Atlas costs are positive integers without duplicate items per list', () => {
  for (const tier of SKIN_TIERS) {
    for (const items of [tier.star1To2.items, tier.star2To3?.items || [], tier.maximizeTotal]) {
      assert.equal(new Set(items.map((item) => item.name)).size, items.length, tier.id);
      for (const item of items) assert.ok(Number.isInteger(item.qty) && item.qty > 0, item.name);
    }
  }
});

test('Every tier maximize total equals its star-up steps combined', () => {
  for (const id of ['mythic', 'legendary', 'everlasting']) {
    const tier = SKIN_TIERS.find((entry) => entry.id === id);
    assert.equal(Boolean(tier.star2To3), tier.hasPreserving);
    const combined = sumItems([tier.star1To2, tier.star2To3]);
    const declared = sumItems([{ items: tier.maximizeTotal }]);
    assert.deepEqual(
      Object.fromEntries(declared),
      Object.fromEntries(combined),
      `${id} maximize total must equal inheriting + preservation`
    );
  }
});

test('Everlasting tier uses Advanced Biography Seals and lists its known heroes', () => {
  const everlasting = SKIN_TIERS.find((tier) => tier.id === 'everlasting');
  assert.ok(
    everlasting.star1To2.items.some((item) => item.name === 'Advanced Biography Seal'),
    'Everlasting inheriting cost uses Advanced Biography Seal'
  );
  assert.equal(everlasting.knownHeroes.length, 12);
  assert.ok(everlasting.knownHeroes.includes('Ramses II'));
  assert.ok(everlasting.knownHeroes.includes('Beowulf'));
});
