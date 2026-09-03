import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildGiftLevelEstimate,
  validateGiftLevelEstimate,
} from '../../js/gift-level-estimator.js';

test('estimate computes per-level and total costs', () => {
  const estimate = buildGiftLevelEstimate({
    targetLevel: 3,
    perLevelCosts: [10, 20, 30, 40],
    currencyLabel: 'gift levels',
  });
  assert.equal(estimate.targetLevel, 3);
  assert.deepEqual(estimate.estimate.perLevel, [10, 20, 30]);
  assert.equal(estimate.estimate.total, 60);
  assert.equal(estimate.currencyLabel, 'gift levels');
});

test('estimate clamps target level to the supplied model', () => {
  const estimate = buildGiftLevelEstimate({
    targetLevel: 99,
    perLevelCosts: [5, 5],
  });
  assert.equal(estimate.targetLevel, 2);
  assert.equal(estimate.estimate.total, 10);
});

test('estimate is explicitly labelled and states assumptions and a disclaimer', () => {
  const estimate = buildGiftLevelEstimate({
    targetLevel: 1,
    perLevelCosts: [10],
    assumptions: ['Costs captured 2026-09-02 from the game client.'],
  });
  assert.equal(estimate.kind, 'gift-level-estimate');
  assert.equal(estimate.labelled, true);
  assert.ok(estimate.disclaimer.includes('Estimate only'));
  assert.deepEqual(estimate.assumptions, ['Costs captured 2026-09-02 from the game client.']);
});

test('empty assumptions fall back to an explicit default assumption', () => {
  const estimate = buildGiftLevelEstimate({ targetLevel: 1, perLevelCosts: [10] });
  assert.equal(estimate.assumptions.length, 1);
  assert.match(estimate.assumptions[0], /verify against the game/);
});

test('hard rule: estimates never reference players, alliances, members, or rankings', () => {
  assert.throws(
    () => buildGiftLevelEstimate({ targetLevel: 1, perLevelCosts: [1], playerName: 'x' }),
    /never attached to named players/
  );
  assert.throws(
    () => buildGiftLevelEstimate({ targetLevel: 1, perLevelCosts: [1], alliance: 'VTS' }),
    /never attached to named players/
  );
  assert.throws(
    () => buildGiftLevelEstimate({ targetLevel: 1, perLevelCosts: [1], member: 'x' }),
    /never attached to named players/
  );
  assert.throws(
    () => buildGiftLevelEstimate({ targetLevel: 1, perLevelCosts: [1], rank: 1 }),
    /never attached to named players/
  );
});

test('invalid inputs throw with actionable messages', () => {
  assert.throws(() => buildGiftLevelEstimate(null), /must be an object/);
  assert.throws(
    () => buildGiftLevelEstimate({ targetLevel: 1, perLevelCosts: [] }),
    /per-level cost/
  );
  assert.throws(
    () => buildGiftLevelEstimate({ targetLevel: 1, perLevelCosts: [-1] }),
    /per-level cost/
  );
});

test('validator accepts compliant estimates', () => {
  const estimate = buildGiftLevelEstimate({ targetLevel: 2, perLevelCosts: [10, 20] });
  assert.deepEqual(validateGiftLevelEstimate(estimate), []);
});

test('validator rejects tampered or de-labelled estimates', () => {
  const estimate = buildGiftLevelEstimate({ targetLevel: 2, perLevelCosts: [10, 20] });
  const deLabelled = { ...estimate, labelled: false };
  assert.ok(validateGiftLevelEstimate(deLabelled).some((error) => /label/.test(error)));
  const deKinded = { ...estimate, kind: 'ranking' };
  assert.ok(validateGiftLevelEstimate(deKinded).some((error) => /kind/.test(error)));
  const withPlayer = { ...estimate, player: 'someone' };
  assert.ok(validateGiftLevelEstimate(withPlayer).some((error) => /player/.test(error)));
  const withAllianceText = { ...estimate, note: 'best alliance NA' };
  assert.ok(
    validateGiftLevelEstimate(withAllianceText).some((error) => /must not reference/.test(error))
  );
  assert.deepEqual(validateGiftLevelEstimate(null), ['Estimate must be an object.']);
});
