import test from 'node:test';
import assert from 'node:assert/strict';

import {
  comboMeetsSkinRequirements,
  filterCombosForSkinMode,
  getComboSkinRequirements,
  rankedCombos,
  scoreComboByRank,
  selectNonOverlappingCombos,
} from '../../js/combos-db.js';

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
    { heroes: ['F', 'G', 'H'], displayScore: '1.0' },
  ]);
});

test('non-overlap scores are normalized to buildable candidates only', () => {
  const combos = [
    { heroes: ['X2A', 'X2B', 'X2C'] },
    { heroes: ['A', 'B', 'C'] },
    { heroes: ['D', 'E', 'F'] },
  ];
  const owned = ['A', 'B', 'C', 'D', 'E', 'F'];

  assert.deepEqual(selectNonOverlappingCombos(combos, owned, 5), [
    { heroes: ['A', 'B', 'C'], displayScore: '100.0' },
    { heroes: ['D', 'E', 'F'], displayScore: '1.0' },
  ]);
});

test('non-overlap selection respects the result limit', () => {
  const combos = [{ heroes: ['A', 'B', 'C'] }, { heroes: ['D', 'E', 'F'] }];

  assert.equal(
    selectNonOverlappingCombos(combos, new Set(['A', 'B', 'C', 'D', 'E', 'F']), 1).length,
    1
  );
});

test('skin codes use 3 as must, 2 as recommended, and 1 as optional', () => {
  const combo = { heroes: ['A', 'B', 'C'], skin: '321' };

  assert.deepEqual(
    getComboSkinRequirements(combo).map(({ code, requirement }) => ({ code, requirement })),
    [
      { code: '3', requirement: 'must' },
      { code: '2', requirement: 'recommended' },
      { code: '1', requirement: 'optional' },
    ]
  );
  assert.equal(
    comboMeetsSkinRequirements(combo, (hero) => hero === 'A'),
    true
  );
  assert.equal(
    comboMeetsSkinRequirements(combo, (hero) => hero === 'B'),
    false
  );
});

test('missing skin metadata and 111 behave like normal combos', () => {
  const combos = [
    { heroes: ['A', 'B', 'C'] },
    { heroes: ['D', 'E', 'F'], skin: '111' },
    { heroes: ['G', 'H', 'I'], skin: '333' },
  ];

  assert.deepEqual(filterCombosForSkinMode(combos, false), combos.slice(0, 2));
});

test('skin mode ranks Octavius Rozen Caesar above Alfred Black Prince Jeanne', () => {
  const skinCombos = filterCombosForSkinMode(rankedCombos, true, () => true);
  const comboKeys = skinCombos.map((combo) => combo.heroes.join('|'));

  assert.ok(
    comboKeys.indexOf('Octavius|Rozen Blade|Caesar') <
      comboKeys.indexOf("Alfred|Black Prince|Jeanne d'Arc")
  );
});
