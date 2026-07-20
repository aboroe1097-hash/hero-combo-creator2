import assert from 'node:assert/strict';
import test from 'node:test';

import { heroCatalogFor, troopEstimateTotals } from '../../js/all-star-boh.js';
import { allHeroesData } from '../../js/heroes-data.js';

test('aggregate troop estimates override legacy rows regardless of order', () => {
  const aggregateRows = [
    'estimate|lofty|11000000',
    'estimate|enhanced-t10|12000000',
    'estimate|t10|13000000',
    'estimate|t9|14000000',
  ];
  const legacyRows = [
    'cavalry|S|normal|1000000',
    'archers|SS|enhanced|2000000',
    'footmen|SSS|normal|3000000',
    'cavalry|X|enhanced|4000000',
    'archers|X|normal|5000000',
    'footmen|IX|enhanced|6000000',
  ];
  const aggregateTotals = new Map([
    ['lofty', 11000000],
    ['enhanced-t10', 12000000],
    ['t10', 13000000],
    ['t9', 14000000],
  ]);

  assert.deepEqual(troopEstimateTotals([...aggregateRows, ...legacyRows]), aggregateTotals);
  assert.deepEqual(troopEstimateTotals([...legacyRows, ...aggregateRows]), aggregateTotals);
  assert.deepEqual(
    troopEstimateTotals(legacyRows),
    new Map([
      ['lofty', 6000000],
      ['enhanced-t10', 4000000],
      ['t10', 5000000],
      ['t9', 6000000],
    ])
  );
});

test('hero picker catalog keeps active-roster parity and falls back to supported canonical seasons', () => {
  const catalog = heroCatalogFor({ options: { heroes: allHeroesData } });

  assert.deepEqual(
    catalog.map(({ name }) => name),
    allHeroesData.map(({ name }) => name)
  );
  assert.equal(catalog.find(({ name }) => name === 'Cyrus')?.season, 'X8');
  assert.equal(catalog.find(({ name }) => name === 'Bjorn')?.season, 'X4');

  const synthetic = heroCatalogFor({
    options: {
      heroes: [
        { name: 'Release Wins', season: 'X8', releaseSeason: 'X2' },
        { name: 'Canonical Fallback', season: 'X8', releaseSeason: 'SP' },
        { name: 'Unsupported', season: 'SP', releaseSeason: 'SP' },
      ],
    },
  });
  assert.deepEqual(
    synthetic.map(({ name, season }) => [name, season]),
    [
      ['Release Wins', 'X2'],
      ['Canonical Fallback', 'X8'],
    ]
  );
});
