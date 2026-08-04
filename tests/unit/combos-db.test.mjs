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

const X8_AVAILABILITY_SOURCE = 'rocacademy-free-noskin-x8-name-match-2026-07-25';
const X8_AVAILABLE_HEROES = [
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

test('X8 availability import contains 82 valid name-matched base formations', () => {
  const imported = rankedCombos.filter((combo) => combo.source === X8_AVAILABILITY_SOURCE);
  const validHeroNames = new Set(allHeroesData.map((hero) => hero.name));
  const targetHeroNames = new Set(X8_AVAILABLE_HEROES);

  assert.equal(imported.length, 82);
  assert.equal(new Set(imported.map((combo) => combo.heroes.join('|'))).size, 82);
  imported.forEach((combo) => {
    assert.equal(combo.heroes.length, 3);
    assert.ok(combo.heroes.every((hero) => validHeroNames.has(hero)));
    assert.ok(combo.heroes.some((hero) => targetHeroNames.has(hero)));
    assert.match(combo.sourceTier, /^[SABC]$/);
    assert.equal(Number.isFinite(combo.sourceScore), true);
    assert.equal(Object.hasOwn(combo, 'skin'), false);
  });
});

test('X8-only ownership produces the all-catch-up archer formation', () => {
  const selected = selectNonOverlappingCombos(rankedCombos, X8_AVAILABLE_HEROES, 5);

  assert.ok(selected.some((combo) => combo.heroes.join('|') === 'Eidolon|Warden|Ashen Verdict'));
});

test('name-matched import restores a buildable Cyrus formation', () => {
  const selected = selectNonOverlappingCombos(rankedCombos, ['Cyrus', 'Ragnar', 'Caesar'], 5);

  assert.equal(selected[0]?.heroes.join('|'), 'Cyrus|Ragnar|Caesar');
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

test('fresh ROC import contains 32 curated A/B/S formations with valid heroes', () => {
  const ROC_FRESH_SOURCE = 'roc-combos-2026-08-02';
  const imported = rankedCombos.filter((combo) => combo.source === ROC_FRESH_SOURCE);
  const validHeroNames = new Set(allHeroesData.map((hero) => hero.name));

  assert.equal(imported.length, 32);
  assert.equal(new Set(imported.map((combo) => combo.heroes.join('|'))).size, 25);
  imported.forEach((combo) => {
    assert.equal(combo.heroes.length, 3);
    assert.ok(combo.heroes.every((hero) => validHeroNames.has(hero)));
    assert.match(combo.sourceTier, /^[SAB]$/);
    assert.equal(Number.isFinite(combo.sourceScore), true);
  });
  assert.equal(
    imported.filter((combo) => !combo.skin).length,
    7,
    'exactly 7 noskin base entries enter the shared database'
  );
  assert.equal(
    imported.filter((combo) => combo.skin === '222').length,
    25,
    'exactly 25 skin-mode entries stay gated to skin mode'
  );
});

test('fresh noskin entries appear in base mode and fresh skin entries stay gated', () => {
  const ROC_FRESH_SOURCE = 'roc-combos-2026-08-02';
  const fresh = rankedCombos.filter((combo) => combo.source === ROC_FRESH_SOURCE);
  const freshInBase = fresh.filter((combo) => baseRankedCombos.includes(combo));

  assert.equal(freshInBase.length, 7);
  assert.ok(freshInBase.every((combo) => !combo.skin));
  assert.equal(
    fresh.filter((combo) => combo.skin).every((combo) => !baseRankedCombos.includes(combo)),
    true,
    'skin-gated fresh entries must not leak into the base database'
  );
});

test('fresh Alexander Bleeding Steed Theodora is buildable from owned heroes', () => {
  const selected = selectNonOverlappingCombos(
    rankedCombos,
    ['Alexander', 'Bleeding Steed', 'Theodora'],
    5
  );

  assert.equal(selected[0]?.heroes.join('|'), 'Alexander|Bleeding Steed|Theodora');
});
