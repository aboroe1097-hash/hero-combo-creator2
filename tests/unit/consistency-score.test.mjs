import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CONSISTENCY_CONFIDENT_HITS,
  compareConsistencyScores,
  scoreConsistencyValues,
} from '../../js/consistency-score.js';

test('consistency scoring ignores inactive zero-value rows', () => {
  assert.equal(scoreConsistencyValues([0, 0, 0]), null);
  assert.equal(scoreConsistencyValues([5000]), null);
});

test('consistency scoring caps perfect steadiness until activity is meaningful', () => {
  const twoHits = scoreConsistencyValues([1000, 1000]);
  const fullSample = scoreConsistencyValues(
    Array.from({ length: CONSISTENCY_CONFIDENT_HITS }, () => 1000)
  );

  assert.equal(twoHits.basePercent, 100);
  assert.ok(twoHits.percent < 100);
  assert.equal(fullSample.percent, 100);
});

test('consistency sorting favors meaningful steady activity over tiny samples', () => {
  const tinyPerfect = scoreConsistencyValues([100, 100]);
  const usefulSteady = scoreConsistencyValues([950, 1000, 1050, 980, 1020]);

  assert.ok(compareConsistencyScores(usefulSteady, tinyPerfect) < 0);
});
