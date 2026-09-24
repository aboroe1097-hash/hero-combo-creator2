import assert from 'node:assert/strict';
import test from 'node:test';

import { BUILDING_UPGRADE_COSTS, SPECIALTY_HONOR_LEVELS } from '../../js/eden-operations-data.js';
import {
  calculateBuildingUpgrade,
  calculateCampUpgradeOrder,
  calculateHonorProgress,
  calculateTilingPlan,
  calculateTrainingComparison,
  checklistProgress,
  decodeEdenOperationsState,
  encodeEdenOperationsState,
  filterOperationPlaybooks,
  getSiegePlan,
  normalizeEdenOperationsState,
  readEdenOperationsState,
  rowsToCsv,
  staffingStatus,
  writeEdenOperationsState,
} from '../../js/eden-operations-model.js';

test('source tables preserve all 20 building levels and 143 specialty levels', () => {
  assert.equal(SPECIALTY_HONOR_LEVELS.length, 143);
  assert.deepEqual(
    SPECIALTY_HONOR_LEVELS.filter((row) => row.honor == null).map((row) => row.level),
    [101, 102, 103, 104, 105, 106, 107, 108, 109, 110]
  );
  for (const costs of Object.values(BUILDING_UPGRADE_COSTS)) assert.equal(costs.length, 20);
  assert.equal(
    BUILDING_UPGRADE_COSTS.workshop.reduce((sum, value) => sum + value, 0),
    6_850_515
  );
  assert.equal(
    BUILDING_UPGRADE_COSTS.fortress.reduce((sum, value) => sum + value, 0),
    68_505_310
  );
});

test('training comparison reproduces the supplied level-12 ten-day benchmarks', () => {
  const common = { tileLevel: 12, attacks: 10, legions: 4, sessions: 4, days: 10 };
  const withoutBanner = calculateTrainingComparison({
    ...common,
    banner: false,
    specialtyBonus: 1.9,
  });
  assert.equal(Math.round(withoutBanner.find((row) => row.id === 'special').period), 20_659_200);
  assert.equal(
    Math.round(withoutBanner.find((row) => row.id === 'special').withSpecialty),
    59_911_680
  );

  const withBanner = calculateTrainingComparison({ ...common, banner: true, specialtyBonus: 1.9 });
  assert.equal(Math.round(withBanner.find((row) => row.id === 'boost').period), 24_791_040);
  assert.equal(Math.round(withBanner.find((row) => row.id === 'boost').withSpecialty), 71_894_016);
  assert.equal(Math.round(withBanner.find((row) => row.id === 'oldBoost').period), 41_318_400);
  assert.equal(
    Math.round(withBanner.find((row) => row.id === 'oldBoost').withSpecialty),
    119_823_360
  );
});

test('building discounts, tiling, and cheapest coalition-camp order are deterministic', () => {
  const workshop = calculateBuildingUpgrade({
    buildingId: 'workshop',
    currentLevel: 1,
    targetLevel: 2,
    discountId: 'green',
  });
  assert.equal(workshop.baseTotal, 685);
  assert.equal(workshop.discountedTotal, 501);

  const tiling = calculateTilingPlan({
    campLevels: [1, 1, 1, 1],
    specialtyRank: 0,
    targetTileLevel: 5,
  });
  assert.equal(tiling.totalLoyalty, 400);
  assert.equal(tiling.safeTile.level, 4);
  assert.equal(tiling.loyaltyGap, 200);

  const order = calculateCampUpgradeOrder({
    campLevels: [1, 1, 1, 1],
    specialtyRank: 0,
    targetTileLevel: 5,
  });
  assert.deepEqual(
    order.steps.map((step) => step.campId),
    ['ac1', 'ac2']
  );
  assert.equal(order.totalCost, 2900);
  assert.equal(order.finalLoyalty, 600);
});

test('honor progress exposes unavailable source rows instead of interpolating them', () => {
  const known = calculateHonorProgress(1, 20);
  assert.equal(known.calculable, true);
  assert.equal(known.required, 25_300_000);
  const gap = calculateHonorProgress(100, 105);
  assert.equal(gap.calculable, false);
  assert.deepEqual(gap.unknownLevels, [101, 102, 103, 104, 105]);
  const bridged = calculateHonorProgress(100, 111);
  assert.equal(bridged.calculable, true);
  assert.equal(bridged.required, 491_200_000);
  assert.equal(bridged.unknownLevels.length, 10);
});

test('state normalizes, migrates, persists, and round-trips through a share token', () => {
  const stored = new Map([
    [
      'vts_eden_operations_v1',
      JSON.stringify({
        activeTool: 'training',
        training: { tileLevel: 99 },
        siege: { campLevels: [-2] },
      }),
    ],
  ]);
  const storage = {
    getItem: (key) => stored.get(key) ?? null,
    setItem: (key, value) => stored.set(key, value),
  };
  const migrated = readEdenOperationsState(storage);
  assert.equal(migrated.version, 2);
  assert.equal(migrated.training.tileLevel, 16);
  assert.deepEqual(migrated.siege.campLevels, [0, 1, 1, 1]);
  const saved = writeEdenOperationsState(migrated, storage);
  assert.deepEqual(decodeEdenOperationsState(encodeEdenOperationsState(saved)), saved);
  assert.deepEqual(normalizeEdenOperationsState(null).version, 2);
});

test('CSV output quotes unsafe cells and keeps numeric zeroes', () => {
  assert.equal(
    rowsToCsv(
      [{ name: 'A, B', cost: 0 }],
      [
        { key: 'name', label: 'Name' },
        { key: 'cost', label: 'Cost' },
      ]
    ),
    'Name,Cost\n"A, B",0'
  );
});

test('building costs reproduce the supplied sheet, including its rounded-up discounts', () => {
  const fortress = BUILDING_UPGRADE_COSTS.fortress;
  // Fortress is transcribed, not derived: x10 of Workshop's rounded 2.29K would be 22.90K.
  assert.equal(fortress[2], 22860);
  assert.equal(Math.round(fortress.reduce((sum, value) => sum + value, 0) / 1e4) / 100, 68.51);
  const discounted = (discountId) =>
    calculateBuildingUpgrade({
      buildingId: 'workshop',
      currentLevel: 1,
      targetLevel: 2,
      discountId,
    }).rows[0].discountedCost;
  assert.deepEqual(['green', 'green-architect', 'full-architect'].map(discounted), [501, 439, 302]);
});

test('operation board filters by stage, role, and localized search words', () => {
  const words = (entry) => (entry.id === 'honor-farming' ? 'Special Training Boost' : entry.id);
  assert.equal(filterOperationPlaybooks({}, words).length, 6);
  assert.deepEqual(
    filterOperationPlaybooks({ stage: 'war' }, words).map((entry) => entry.id),
    ['staff-objective']
  );
  assert.deepEqual(filterOperationPlaybooks({ stage: 'war', role: 'builder' }, words), []);
  assert.deepEqual(
    filterOperationPlaybooks({ query: '  boost  special ' }, words).map((entry) => entry.id),
    ['honor-farming']
  );
  assert.deepEqual(filterOperationPlaybooks({ query: 'zzz' }, words), []);
});

test('checklists and staffing counters normalize and survive a round trip', () => {
  const state = normalizeEdenOperationsState({
    checklist: { 'hold-tile.0': true, 'hold-tile.9': true, 'nope.0': true, 'hold-tile.1': 'yes' },
    siege: { structureId: 'gate-1', assigned: { attackers: 3, support: -4 } },
  });
  assert.deepEqual(state.checklist, { 'hold-tile.0': true });
  assert.deepEqual(state.siege.assigned, { attackers: 3, support: 0 });
  assert.deepEqual(decodeEdenOperationsState(encodeEdenOperationsState(state)), state);
  assert.deepEqual(
    checklistProgress({ id: 'hold-tile', steps: ['a', 'b', 'c'] }, state.checklist),
    {
      done: 1,
      total: 3,
    }
  );

  const gate = getSiegePlan('gate-1');
  assert.deepEqual(staffingStatus(gate, state.siege.assigned), {
    attackers: 3,
    support: 0,
    missingAttackers: 0,
    missingSupport: 8,
    missing: 8,
    ready: false,
  });
  assert.equal(staffingStatus(gate, { attackers: 2, support: 8 }).ready, true);
});
