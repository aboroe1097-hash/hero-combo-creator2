import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildUpgradeSequence,
  calculatePoisonPercentage,
  formatDuration,
  getExtractionSite,
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
