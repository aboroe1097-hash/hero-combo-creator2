import test from 'node:test';
import assert from 'node:assert/strict';

import { scoreComboByRank, selectNonOverlappingCombos } from '../../js/combos-db.js';

test('combo rank scoring maps first to 100 and last to 1', () => {
  assert.equal(scoreComboByRank(0, 3), '100.0');
  assert.equal(scoreComboByRank(1, 3), '50.5');
  assert.equal(scoreComboByRank(2, 3), '1.0');
});

test('non-overlap selection skips unavailable and reused heroes', () => {
  const combos = [
    { heroes: ['A', 'B', 'C'] },
    { heroes: ['A', 'D', 'E'] },
    { heroes: ['F', 'G', 'H'] },
    { heroes: ['I', 'J', 'K'] },
  ];
  const owned = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

  assert.deepEqual(selectNonOverlappingCombos(combos, owned, 5), [
    { heroes: ['A', 'B', 'C'], displayScore: '100.0' },
    { heroes: ['F', 'G', 'H'], displayScore: '34.0' },
  ]);
});

test('non-overlap selection respects the result limit', () => {
  const combos = [{ heroes: ['A', 'B', 'C'] }, { heroes: ['D', 'E', 'F'] }];

  assert.equal(
    selectNonOverlappingCombos(combos, new Set(['A', 'B', 'C', 'D', 'E', 'F']), 1).length,
    1
  );
});
