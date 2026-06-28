import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = {
  VTS_ADMIN_AUTH: {},
};
const localStorageData = new Map();
globalThis.localStorage = {
  getItem: (key) => localStorageData.get(key) ?? null,
  setItem: (key, value) => localStorageData.set(key, String(value)),
  removeItem: (key) => localStorageData.delete(key),
};
globalThis.document = {
  getElementById: () => null,
  querySelector: () => null,
  querySelectorAll: () => [],
};

const {
  R5_ADJUSTMENT_CATEGORIES,
  R5_ADJUSTMENTS_LOCAL_KEY,
  aggregateR5Bonuses,
  applyR5AdjustmentsToPlayerTotals,
  buildAdjustedGiftRanking,
  createLocalR5Adjustment,
  deleteLocalR5Adjustment,
  defaultR5PointsForCategory,
  loadLocalR5Adjustments,
  normalizeR5Adjustment,
  resolveR5PlayerIdentity,
  updateLocalR5Adjustment,
} = await import('../../js/ocr-adjustments.js');

test('R5 adjustment categories expose editable merit and penalty defaults', () => {
  assert.equal(R5_ADJUSTMENT_CATEGORIES.banner_help.type, 'merit');
  assert.equal(R5_ADJUSTMENT_CATEGORIES.path_block.type, 'penalty');
  assert.equal(R5_ADJUSTMENT_CATEGORIES.grant_premium.type, 'flag');
  assert.equal(defaultR5PointsForCategory('grant_premium'), 0);
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
      { season, player: 'Sarafina~', points: 500, category: 'connected_road' },
      { season, player: '~Sarafino~', points: -200, category: 'ignored_coordination' },
      { season: '2026-x2', player: '~Sarafino~', points: 999, category: 'extra_effort' },
      { season, player: 'UNDEAD', points: 300, category: 'extra_effort' },
    ],
    season
  );

  assert.equal(bonusMap.get(sarafinoKey), 300);
  assert.equal(bonusMap.get(resolveR5PlayerIdentity('UNDEAD').playerKey), 300);
  assert.equal(
    [...bonusMap.values()].reduce((sum, points) => sum + points, 0),
    600
  );
});

test('R5 adjusted ranking uses adjusted total without mutating OCR total', () => {
  const rows = [
    { name: 'Kika', total_demolition: 120000, participation_count: 3 },
    { name: '~Sarafino~', total_demolition: 100000, participation_count: 2 },
    { name: 'UNDEAD', total_demolition: 50000, participation_count: 1 },
  ];
  const adjustments = [
    { season: 'season-a', player: 'Sarafina~', points: 400, category: 'connected_road' },
    { season: 'season-a', player: 'UNDEAD', points: -100, category: 'path_block' },
  ];

  const adjusted = applyR5AdjustmentsToPlayerTotals(rows, adjustments, 'season-a');
  const sarafino = adjusted.find((row) => row.name === '~Sarafino~');
  const undead = adjusted.find((row) => row.name === 'UNDEAD');

  assert.equal(sarafino.total_demolition, 100000);
  assert.equal(sarafino.bonusR5, 400);
  assert.equal(sarafino.adjustedTotal, 100400);
  assert.equal(undead.adjustedTotal, 49900);

  const ranking = buildAdjustedGiftRanking(rows, adjustments, 'season-a');
  assert.deepEqual(
    ranking.map((row) => [row.name, row.adjustedRank, row.adjustedTotal]),
    [
      ['Kika', 1, 120000],
      ['~Sarafino~', 2, 100400],
      ['UNDEAD', 3, 49900],
    ]
  );
});

test('R5 local adjustments persist when Firebase is unavailable', () => {
  localStorageData.delete(R5_ADJUSTMENTS_LOCAL_KEY);

  const created = createLocalR5Adjustment({
    season: 'season-local',
    player: '~Sarafino~',
    category: 'connected_road',
    note: '  local road help  ',
  });

  assert.match(created.id, /^local_r5_/);
  assert.equal(created.createdBy, 'local-admin');
  assert.equal(created.points, defaultR5PointsForCategory('connected_road'));
  assert.equal(loadLocalR5Adjustments('season-local').length, 1);

  const updated = updateLocalR5Adjustment(created.id, {
    player: 'UNDEAD',
    category: 'path_block',
    points: -500,
    note: 'blocked path',
  });

  assert.equal(updated.playerName, 'UNDEAD');
  assert.equal(updated.points, -500);
  assert.equal(updated.note, 'blocked path');
  assert.equal(loadLocalR5Adjustments('season-local')[0].playerName, 'UNDEAD');

  assert.equal(deleteLocalR5Adjustment(created.id), true);
  assert.equal(loadLocalR5Adjustments('season-local').length, 0);
});
