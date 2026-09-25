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

// X8 lanes (any lane with an X8 hero) are either placed inside the list with the Combos
// Planner (npm run combos:plan), directly above the S0-X2 lane they outrank, or left in
// the X8 block that ends the database, ordered by the source score in each note.
const X8_HEROES = new Set(
  allHeroesData.filter((hero) => hero.season === 'X8').map((hero) => hero.name)
);
const usesX8Hero = (combo) => combo.heroes.some((hero) => X8_HEROES.has(hero));

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

test('every combo uses known hero names', () => {
  const validHeroNames = new Set(allHeroesData.map((hero) => hero.name));

  assert.ok(rankedCombos.length > 0);
  rankedCombos.forEach((combo) => {
    assert.equal(combo.heroes.length, 3);
    assert.ok(
      combo.heroes.every((hero) => validHeroNames.has(hero)),
      `unknown hero name in ${combo.heroes.join('|')}`
    );
  });
});

test('only X8 lanes follow the last S0-X2 lane', () => {
  const lastShared = rankedCombos.findLastIndex((combo) => !usesX8Hero(combo));

  assert.ok(rankedCombos.some(usesX8Hero), 'expected the X8 lanes to be present');
  assert.ok(
    rankedCombos.slice(lastShared + 1).every(usesX8Hero),
    'the end block mixes X8 lanes with S0-X2 lanes'
  );
});

test('catch-up notes record tier and score, and the unplaced X8 block stays in score order', () => {
  const note = /X8 catch-up lane, ([SABC]) tier \(source score (\d+(?:\.\d+)?)\)\.$/;
  rankedCombos
    .filter((combo) => usesX8Hero(combo) && /catch-up/.test(combo.note || ''))
    .forEach((combo) =>
      assert.match(combo.note, note, `bad catch-up note on ${combo.heroes.join('|')}`)
    );

  const lastShared = rankedCombos.findLastIndex((combo) => !usesX8Hero(combo));
  const scores = rankedCombos
    .slice(lastShared + 1)
    .map((combo) => note.exec(combo.note || ''))
    .filter(Boolean)
    .map((match) => Number(match[2]));

  assert.deepEqual(
    scores,
    [...scores].sort((a, b) => b - a),
    'the unplaced X8 block must stay ordered by source score'
  );
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
  // Guards that the imported curated set is still present. New 222 lanes may be added by
  // hand, so this checks survival rather than an exact count, which would break on every
  // legitimate addition.
  const CURATED_222 = [
    'The Brave|Rozen Blade|The Avalanche',
    'King Arthur|Bleeding Steed|Alexander',
    'Boudica|Jade Eagle|Ramses II',
    'Hunk|Bleeding Steed|Alexander',
    'Hunk|Cleopatra VII|Alexander',
    'The Brave|Rozen Blade|Immortal',
    'King Arthur|Bleeding Steed|Jade Eagle',
    "Black Prince|Jeanne d'Arc|Lionheart",
    'Bleeding Steed|Cleopatra VII|Alexander',
    "The Brave|Jeanne d'Arc|The Avalanche",
    'The Brave|Ramses II|Beowulf',
    'Black Prince|The Brave|Lionheart',
    'The Brave|Alfred|The Avalanche',
    'Boudica|Sakura|ELK',
    'Octavius|Black Prince|Lionheart',
    'Hunk|Boudica|Ramses II',
    "Jeanne d'Arc|Constantine the Great|Lionheart",
    'BeastQueen|Black Prince|Immortal',
    'War Lord|The Brave|The Avalanche',
    'The Brave|Black Prince|Immortal',
    "War Lord|Jeanne d'Arc|The Avalanche",
    'Hunk|Cleopatra VII|Caesar',
    'BeastQueen|Cleopatra VII|Immortal',
    'King Arthur|Cleopatra VII|Jade Eagle',
  ];

  const key = (combo) => combo.heroes.join('|');
  const skinned = rankedCombos.filter((combo) => combo.skin === '222');
  const present = new Set(skinned.map(key));

  const missing = CURATED_222.filter((entry) => !present.has(entry));
  assert.deepEqual(missing, [], `curated 222 lanes went missing: ${missing.join(', ')}`);
  assert.equal(present.size, skinned.length, 'every 222 lane is a distinct hero trio');
  assert.ok(skinned.length >= CURATED_222.length);
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

test('only must-own skin lanes stay out of the base database', () => {
  // A "must own" slot (3) makes a lane unplayable without the skin, so it is hidden in
  // normal mode. A "recommended" slot (2) only makes the lane stronger, so it stays
  // visible; gating on 2 as well used to hide the highest-ranked lanes from everyone.
  const mustOwn = rankedCombos.filter((combo) => /3/.test(combo.skin || ''));
  const recommendedOnly = rankedCombos.filter((combo) => /^[12]+$/.test(combo.skin || 'x'));

  assert.ok(mustOwn.length > 0);
  assert.ok(recommendedOnly.length > 0);
  assert.ok(
    mustOwn.every((combo) => !baseRankedCombos.includes(combo)),
    'must-own skin lanes must not leak into the base database'
  );
  assert.ok(
    recommendedOnly.every((combo) => baseRankedCombos.includes(combo)),
    'recommended-skin lanes stay available in normal mode'
  );
  assert.equal(baseRankedCombos.length, rankedCombos.length - mustOwn.length);
});

test('fresh Alexander Bleeding Steed Theodora is buildable from owned heroes', () => {
  const selected = selectNonOverlappingCombos(
    rankedCombos,
    ['Alexander', 'Bleeding Steed', 'Theodora'],
    5
  );

  assert.equal(selected[0]?.heroes.join('|'), 'Alexander|Bleeding Steed|Theodora');
});
