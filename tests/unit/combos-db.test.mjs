import test from 'node:test';
import assert from 'node:assert/strict';

import { allHeroesData } from '../../js/heroes-data.js';
import {
  baseRankedCombos,
  comboMeetsSkinRequirements,
  filterCombosForSkinMode,
  getComboSkinRequirements,
  rankedCombos,
  scoreComboByRank,
  selectNonOverlappingCombos,
} from '../../js/combos-db.js';

// Seasons up to X2 are in scope for the combo database; X8 heroes are excluded for now.
const X8_HEROES = [
  'Bjorn',
  'Skanda',
  'Liberator',
  'Ashen Verdict',
  'Warden',
  'Warhammer',
  'Eidolon',
  'Scarlet Reaver',
  'Rainforest Ranger',
  'Fortuneteller',
  'Ragnar',
  'Cyrus',
];

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

test('every combo uses known hero names and no X8 hero', () => {
  const validHeroNames = new Set(allHeroesData.map((hero) => hero.name));
  const excluded = new Set(X8_HEROES);

  assert.ok(rankedCombos.length > 0);
  rankedCombos.forEach((combo) => {
    assert.equal(combo.heroes.length, 3);
    assert.ok(
      combo.heroes.every((hero) => validHeroNames.has(hero)),
      `unknown hero name in ${combo.heroes.join('|')}`
    );
    assert.ok(
      combo.heroes.every((hero) => !excluded.has(hero)),
      `X8 hero is out of scope for now: ${combo.heroes.join('|')}`
    );
  });
});

test('no two entries share the same heroes and skin code', () => {
  // A duplicate renders two identical counter buttons and breaks strict-mode selectors
  // in the browser smoke tests. A trio may still appear twice with different skin codes.
  const counts = new Map();

  rankedCombos.forEach((combo) => {
    const key = `${combo.heroes.join('|')}#${combo.skin || ''}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  });

  const duplicates = [...counts].filter(([, count]) => count > 1).map(([key]) => key);
  assert.deepEqual(duplicates, [], `duplicate combo entries: ${duplicates.join(', ')}`);
});

test('entries carry only heroes, an optional skin code, and an optional note', () => {
  const allowed = new Set(['heroes', 'skin', 'note']);

  rankedCombos.forEach((combo) => {
    Object.keys(combo).forEach((key) => {
      assert.ok(allowed.has(key), `unexpected field "${key}" on ${combo.heroes.join('|')}`);
    });
    if (combo.skin !== undefined) {
      assert.match(combo.skin, /^[123]{3}$/, `bad skin code on ${combo.heroes.join('|')}`);
    }
    if (combo.note !== undefined) {
      assert.equal(typeof combo.note, 'string');
    }
  });
});

test('X8-free ownership still produces a buildable formation', () => {
  const selected = selectNonOverlappingCombos(
    rankedCombos,
    ['Alexander', 'Bleeding Steed', 'Theodora'],
    5
  );

  assert.equal(selected[0]?.heroes.join('|'), 'Alexander|Bleeding Steed|Theodora');
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

test('the curated 222 skin-mode formations survive as plain entries', () => {
  const key = (combo) => combo.heroes.join('|');
  const skinned = rankedCombos.filter((combo) => combo.skin === '222');

  assert.equal(skinned.length, 25);
  assert.equal(new Set(skinned.map(key)).size, 25);
});

test('the seven no-skin counterparts stay available in base mode', () => {
  const key = (combo) => combo.heroes.join('|');
  const wanted = [
    'Alexander|Bleeding Steed|Theodora',
    'Hunk|Cleopatra VII|Alexander',
    'King Arthur|Bleeding Steed|Alexander',
    'The Brave|Rozen Blade|The Avalanche',
    'Bleeding Steed|Cleopatra VII|Alexander',
    "Black Prince|Jeanne d'Arc|Lionheart",
    'Hunk|Bleeding Steed|Alexander',
  ];

  wanted.forEach((entry) => {
    assert.ok(
      baseRankedCombos.some((combo) => key(combo) === entry && !combo.skin),
      `missing no-skin base entry ${entry}`
    );
  });
});

test('skin-gated entries stay out of the base database', () => {
  const gated = rankedCombos.filter((combo) => combo.skin && combo.skin !== '111');

  assert.ok(gated.length > 0);
  assert.ok(
    gated.every((combo) => !baseRankedCombos.includes(combo)),
    'skin-gated entries must not leak into the base database'
  );
  assert.equal(baseRankedCombos.length, rankedCombos.length - gated.length);
});

test('fresh Alexander Bleeding Steed Theodora is buildable from owned heroes', () => {
  const selected = selectNonOverlappingCombos(
    rankedCombos,
    ['Alexander', 'Bleeding Steed', 'Theodora'],
    5
  );

  assert.equal(selected[0]?.heroes.join('|'), 'Alexander|Bleeding Steed|Theodora');
});
