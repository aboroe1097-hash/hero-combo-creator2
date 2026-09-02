import assert from 'node:assert/strict';
import test from 'node:test';
import {
  computeCastlePlan,
  computeDiscountFactor,
  findCastleBlockers,
  normalizeCastleCatalog,
} from '../../js/castle-planner-model.js';

const catalog = {
  castleLevels: [
    { level: 25, requires: { keep: 25, wall: 24, barracks: 20 } },
    { level: 26, requires: { keep: 26, wall: 25 } },
  ],
  buildings: {
    keep: {
      name: 'Keep',
      maxLevel: 30,
      verificationStatus: 'current',
      source: 'fixture',
      credit: 'fixture',
      levels: [
        {
          level: 25,
          resources: [
            { type: 'food', amount: 100_000 },
            { type: 'marble', amount: 80_000 },
          ],
          timeMinutes: 240,
          gems: 0,
        },
        { level: 26, resources: [{ type: 'food', amount: 120_000 }], timeMinutes: 300, gems: 0 },
      ],
    },
    wall: {
      name: 'Wall',
      maxLevel: 30,
      verificationStatus: 'unverified',
      source: 'staging',
      credit: '',
      levels: [
        { level: 24, resources: [{ type: 'marble', amount: 50_000 }], timeMinutes: 120, gems: 0 },
      ],
    },
    barracks: {
      name: 'Barracks',
      maxLevel: 30,
      verificationStatus: 'current',
      source: 'fixture',
      credit: 'fixture',
      levels: [],
    },
  },
};

test('catalog normalization freezes and validates the shape', () => {
  const normalized = normalizeCastleCatalog(catalog);
  assert.equal(normalized.castleLevels.length, 2);
  assert.equal(normalized.buildings.length, 3);
  assert.equal(normalized.buildings[0].name, 'Keep');
  assert.throws(() => normalizeCastleCatalog(null), /must be an object/);
  assert.throws(
    () => normalizeCastleCatalog({ castleLevels: [{ level: 0 }], buildings: {} }),
    /valid level/
  );
});

test('findCastleBlockers lists buildings short of the target requirement', () => {
  const blockers = findCastleBlockers(catalog, { keep: 24, wall: 20, barracks: 20 }, 25);
  assert.equal(blockers.length, 2);
  const keep = blockers.find((blocker) => blocker.buildingId === 'keep');
  assert.equal(keep.requiredLevel, 25);
  assert.equal(keep.shortage, 1);
  const wall = blockers.find((blocker) => blocker.buildingId === 'wall');
  assert.equal(wall.shortage, 4);
});

test('findCastleBlockers returns null for unknown castle targets', () => {
  assert.equal(findCastleBlockers(catalog, { keep: 24 }, 99), null);
});

test('computeCastlePlan builds per-level upgrades with multiplicative discounts', () => {
  const plan = computeCastlePlan(catalog, {
    currentLevels: { keep: 24, wall: 20, barracks: 20 },
    targetCastleLevel: 25,
    discounts: { architect: 10, builder: 20, research: 0 },
  });
  assert.equal(plan.targetCastleLevel, 25);
  assert.equal(plan.blockers.length, 2);
  const keepUpgrade = plan.upgrades.find((upgrade) => upgrade.buildingId === 'keep');
  assert.equal(keepUpgrade.costs.resources[0].type, 'food');
  assert.equal(keepUpgrade.costs.resources[0].amount, Math.ceil(100_000 * 0.9 * 0.8));
  assert.equal(keepUpgrade.costs.timeMinutes, Math.ceil(240 * 0.9 * 0.8));
  assert.equal(keepUpgrade.quarantined, false);
});

test('discount factor composes multiplicatively and clamps', () => {
  assert.equal(computeDiscountFactor({ architect: 50, builder: 0, research: 0 }), 0.5);
  assert.equal(computeDiscountFactor({ architect: 0, builder: 10, research: 0 }), 0.9);
  assert.equal(computeDiscountFactor({ architect: 200, builder: -5, research: 'x' }), 0);
});

test('unverified buildings are quarantined and split out of verified totals', () => {
  const plan = computeCastlePlan(catalog, {
    currentLevels: { keep: 24, wall: 20, barracks: 20 },
    targetCastleLevel: 25,
    discounts: {},
  });
  assert.equal(plan.verified, false);
  const wallUpgrades = plan.upgrades.filter((upgrade) => upgrade.buildingId === 'wall');
  assert.equal(wallUpgrades.length, 4);
  for (const upgrade of wallUpgrades) assert.equal(upgrade.quarantined, true);
  const withData = wallUpgrades.filter((upgrade) => !upgrade.missingData);
  assert.equal(withData.length, 1);
  assert.equal(plan.totals.unverified.timeMinutes, 120);
  assert.equal(plan.totals.verified.gems, 0);
  assert.ok(plan.totals.verified.resources.some((resource) => resource.type === 'food'));
  assert.ok(plan.assumptions.length >= 3);
});

test('missing level data is flagged instead of guessed', () => {
  const plan = computeCastlePlan(catalog, {
    currentLevels: { keep: 25, wall: 25, barracks: 19 },
    targetCastleLevel: 25,
    discounts: {},
  });
  const barracksUpgrade = plan.upgrades.find((upgrade) => upgrade.buildingId === 'barracks');
  assert.equal(barracksUpgrade.missingData, true);
  assert.equal(barracksUpgrade.costs.timeMinutes, 0);
});

test('plan returns null for unknown castle targets', () => {
  assert.equal(
    computeCastlePlan(catalog, { currentLevels: {}, targetCastleLevel: 42, discounts: {} }),
    null
  );
});

test('gem costs are never discounted', () => {
  const gemCatalog = {
    castleLevels: [{ level: 2, requires: { keep: 2 } }],
    buildings: {
      keep: {
        name: 'Keep',
        maxLevel: 5,
        verificationStatus: 'current',
        source: 'fixture',
        credit: 'fixture',
        levels: [
          {
            level: 2,
            resources: [{ type: 'food', amount: 1000 }],
            timeMinutes: 60,
            gems: 100,
          },
        ],
      },
    },
  };
  const plan = computeCastlePlan(gemCatalog, {
    currentLevels: { keep: 1 },
    targetCastleLevel: 2,
    discounts: { architect: 90 },
  });
  assert.equal(plan.upgrades[0].costs.gems, 100);
  assert.equal(plan.upgrades[0].costs.resources[0].amount, Math.ceil(1000 * 0.1));
});
