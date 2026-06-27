import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = {
  VTS_ADMIN_AUTH: {},
};
globalThis.localStorage = {
  getItem: () => null,
  setItem: () => {},
};
globalThis.document = {
  getElementById: () => null,
  querySelector: () => null,
  querySelectorAll: () => [],
};

const {
  R5_ADJUSTMENT_CATEGORIES,
  aggregateR5Bonuses,
  applyR5AdjustmentsToPlayerTotals,
  buildAdjustedGiftRanking,
  defaultR5PointsForCategory,
  normalizeR5Adjustment,
  resolveR5PlayerIdentity,
} = await import('../../js/ocr-adjustments.js');

test('R5 adjustment categories expose editable merit and penalty defaults', () => {
  assert.equal(R5_ADJUSTMENT_CATEGORIES.banner_help.type, 'merit');
  assert.equal(R5_ADJUSTMENT_CATEGORIES.path_block.type, 'penalty');
  assert.ok(defaultR5PointsForCategory('connected_road') > 0);
  assert.ok(defaultR5PointsForCategory('toxicity') < 0);
});

test('R5 player identity uses the shared canonical name resolver', () => {
  const sarafina = resolveR5PlayerIdentity('(Vts)Sarafina~');
  const sarafino = resolveR5PlayerIdentity('~Sarafino~');
  const undead = resolveR5PlayerIdentity('Undead_Banner');

  assert.equal(sarafina.playerKey, sarafino.playerKey);
  assert.equal(undead.playerName, 'UNDEAD');
});

test('R5 adjustments normalize defaults, notes, and signed integer points', () => {
  const adjustment = normalizeR5Adjustment({
    season: 'eden-x1-2026',
    player: '(s) Angel Banner',
    category: 'banner_help',
    note: '  connected the road  ',
  });

  assert.equal(adjustment.season, 'eden-x1-2026');
  assert.equal(adjustment.playerName, 'ANGEL');
  assert.equal(adjustment.points, defaultR5PointsForCategory('banner_help'));
  assert.equal(adjustment.note, 'connected the road');
  assert.throws(() => normalizeR5Adjustment({ season: 'x1', player: 'Kika', points: 1.5 }));
});

test('R5 aggregation is scoped per season and sums merit plus penalty rows', () => {
  const season = '2026-x1';
  const sarafinoKey = resolveR5PlayerIdentity('~Sarafino~').playerKey;
  const bonusMap = aggregateR5Bonuses(
    [
      { season, player: 'Sarafina~', points: 25000, category: 'connected_road' },
      { season, player: '~Sarafino~', points: -5000, category: 'ignored_coordination' },
      { season: '2026-x2', player: '~Sarafino~', points: 999999, category: 'extra_effort' },
      { season, player: 'UNDEAD', points: 8000, category: 'extra_effort' },
    ],
    season
  );

  assert.equal(bonusMap.get(sarafinoKey), 20000);
  assert.equal(bonusMap.get(resolveR5PlayerIdentity('UNDEAD').playerKey), 8000);
  assert.equal(
    [...bonusMap.values()].reduce((sum, points) => sum + points, 0),
    28000
  );
});

test('R5 adjusted ranking uses adjusted total without mutating OCR total', () => {
  const rows = [
    { name: 'Kika', total_demolition: 120000, participation_count: 3 },
    { name: '~Sarafino~', total_demolition: 100000, participation_count: 2 },
    { name: 'UNDEAD', total_demolition: 50000, participation_count: 1 },
  ];
  const adjustments = [
    { season: 'season-a', player: 'Sarafina~', points: 40000, category: 'connected_road' },
    { season: 'season-a', player: 'UNDEAD', points: -10000, category: 'path_block' },
  ];

  const adjusted = applyR5AdjustmentsToPlayerTotals(rows, adjustments, 'season-a');
  const sarafino = adjusted.find((row) => row.name === '~Sarafino~');
  const undead = adjusted.find((row) => row.name === 'UNDEAD');

  assert.equal(sarafino.total_demolition, 100000);
  assert.equal(sarafino.bonusR5, 40000);
  assert.equal(sarafino.adjustedTotal, 140000);
  assert.equal(undead.adjustedTotal, 40000);

  const ranking = buildAdjustedGiftRanking(rows, adjustments, 'season-a');
  assert.deepEqual(
    ranking.map((row) => [row.name, row.adjustedRank, row.adjustedTotal]),
    [
      ['~Sarafino~', 1, 140000],
      ['Kika', 2, 120000],
      ['UNDEAD', 3, 40000],
    ]
  );
});
