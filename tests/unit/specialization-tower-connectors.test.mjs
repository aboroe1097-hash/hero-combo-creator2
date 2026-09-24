import assert from 'node:assert/strict';
import test from 'node:test';

import { connectorReach, connectorSegment } from '../../js/specialization-tower-connectors.js';

test('reach counts only the leading run of completed researches', () => {
  assert.equal(connectorReach([true, true, false, true]), 2);
  assert.equal(connectorReach([false, true]), 0);
  assert.equal(connectorReach([true, true]), 2);
  assert.equal(connectorReach([]), 0);
  assert.equal(connectorReach(null), 0);
  assert.equal(connectorReach([1, true]), 0, 'only strict true counts as complete');
});

test('segment runs from the first research to the frontier, or the last when done', () => {
  const centers = [40, 170, 300, 430];
  assert.equal(connectorSegment(centers, 0), null);
  assert.deepEqual(connectorSegment(centers, 1), { start: 40, length: 130 });
  assert.deepEqual(connectorSegment(centers, 3), { start: 40, length: 390 });
  assert.deepEqual(connectorSegment(centers, 4), { start: 40, length: 390 });
  assert.deepEqual(connectorSegment(centers, 99), { start: 40, length: 390 });
  assert.equal(connectorSegment([40], 1), null);
  assert.equal(connectorSegment([40, 40], 1), null, 'collapsed layout draws nothing');
  assert.equal(connectorSegment([40, Number.NaN], 1), null);
});
