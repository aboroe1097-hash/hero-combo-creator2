import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildUpgradeSequence,
  calculateAllianceCenterUpgradeMaterials,
  calculateLoyaltyTargetMaterials,
  calculatePoisonPercentage,
  formatDuration,
  getExtractionSite,
  getLoyaltyRequirementForSite,
} from '../../js/loyalty-calculator.js';

test('loyalty thresholds resolve the highest unlocked extraction site', () => {
  assert.equal(getExtractionSite(0), 'T2');
  assert.equal(getExtractionSite(199), 'T2');
  assert.equal(getExtractionSite(200), 'T4');
  assert.equal(getExtractionSite(7200), 'T15');
  assert.equal(getExtractionSite(8000), 'T16');
});

test('duration formatter rounds to seconds and pads minutes/seconds', () => {
  assert.equal(formatDuration(1.5), '1h 30m 00s');
  assert.equal(formatDuration(0.001), '0h 00m 04s');
});

test('poison percentage caps at max loyalty and computes next tiers', () => {
  assert.deepEqual(calculatePoisonPercentage(8000), { next: '0.0', afterNext: '0.0' });
  assert.deepEqual(calculatePoisonPercentage(190), { next: '0.7', afterNext: '0.7' });
  assert.deepEqual(calculatePoisonPercentage(700), { next: '19.6', afterNext: '45.6' });
});

test('exact Eden tables expose tile loyalty and per-building material requirements', () => {
  assert.deepEqual(getLoyaltyRequirementForSite('t12'), { site: 'T12', loyalty: 4800 });
  assert.equal(getLoyaltyRequirementForSite('T17'), null);

  const building = calculateAllianceCenterUpgradeMaterials('AC1', 17, 20);
  assert.equal(building.totalMaterialUnits, 3_540_000);
  assert.deepEqual(
    building.steps.map((step) => step.materialUnits),
    [972_000, 1_167_000, 1_401_000]
  );
});

test('target-tile material plan chooses the cheapest available camp upgrades', () => {
  const plan = calculateLoyaltyTargetMaterials({
    acLevels: [10, 10, 10, 10],
    targetSite: 'T12',
    savedUnits: 100_000,
  });
  assert.equal(plan.targetLoyalty, 4800);
  assert.equal(plan.additionalLoyaltyNeeded, 800);
  assert.equal(plan.steps.length, 8);
  assert.equal(plan.finalLoyalty, 4800);
  assert.equal(plan.savedUnitsApplied, 100_000);
  assert.equal(plan.remainingMaterialUnits, plan.totalMaterialUnits - 100_000);
  assert.equal(
    plan.totalMaterialUnits,
    plan.steps.reduce((sum, step) => sum + step.materialUnits, 0)
  );
});

test('upgrade sequence spends saved units before processing time', () => {
  globalThis.localStorage = {
    getItem: () => null,
  };

  const result = buildUpgradeSequence({
    ac1Level: 19,
    ac2Level: 20,
    ac3Level: 20,
    ac4Level: 20,
    currentLoyalty: 7900,
    savedUnits: 1_401_000,
    processingTime: 1,
    possibleProcessingDaily: 24_000,
    safeHourlyRate: 1000,
  });

  assert.equal(result.error, undefined);
  assert.equal(result.upgradeSequence.length, 1);
  assert.equal(result.upgradeSequence[0].building, 'AC1');
  assert.equal(result.upgradeSequence[0].level, 20);
  assert.equal(result.upgradeSequence[0].hours, 0);
  assert.equal(result.upgradeSequence[0].newLoyalty, 8000);
});
