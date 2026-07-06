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
  mergeSeededR5Adjustments,
  normalizeR5Adjustment,
  normalizeR5AdjustmentRecords,
  resolveR5PlayerIdentity,
  updateLocalR5Adjustment,
  updateR5Adjustment,
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

  assert.equal(sarafina.playerName, '~Sarafina~');
  assert.equal(sarafino.playerName, '~Sarafino~');
  assert.notEqual(sarafina.playerKey, sarafino.playerKey);
  assert.equal(undead.playerName, 'Undead_Banner');
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
  const sarafinaKey = resolveR5PlayerIdentity('Sarafina~').playerKey;
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

  assert.equal(bonusMap.get(sarafinaKey), 500);
  assert.equal(bonusMap.get(sarafinoKey), -200);
  assert.equal(bonusMap.get(resolveR5PlayerIdentity('UNDEAD').playerKey), 300);
  assert.equal(
    [...bonusMap.values()].reduce((sum, points) => sum + points, 0),
    600
  );
});

test('R5 adjustment record batches skip malformed historical cloud rows', () => {
  const season = 'season-cloud';
  const rows = normalizeR5AdjustmentRecords(
    [
      { season, player: '~Sarafino~', points: 1, category: 'banner_help' },
      { season, player: 'UNDEAD', points: 20000, category: 'extra_effort' },
      { season, player: 'Kika', points: -1, category: 'path_block' },
    ],
    { season }
  );

  assert.deepEqual(
    rows.map((row) => [row.playerKey, row.points]),
    [
      [resolveR5PlayerIdentity('~Sarafino~').playerKey, 1],
      [resolveR5PlayerIdentity('Kika').playerKey, -1],
    ]
  );
});

test('R5 seeded 12.4.1 road support points merge without double-counting cloud rows', () => {
  const seeded = mergeSeededR5Adjustments([], 'season-2026');

  assert.deepEqual(
    seeded.map((row) => [row.playerName, row.points, row.category, row.note]),
    [
      ['Феечка))', 1, 'connected_road', 'Help with Connecting Roads to Structures'],
      ['Obliterated', 1, 'connected_road', 'Help with Connecting Roads to Structures'],
    ]
  );

  const merged = mergeSeededR5Adjustments(
    [
      {
        season: 'season-2026',
        player: 'Obliterated',
        points: 1,
        category: 'connected_road',
        note: 'Cloud copy of road help',
      },
    ],
    'season-2026'
  );

  assert.equal(merged.filter((row) => row.playerName === 'Obliterated').length, 1);
  assert.equal(mergeSeededR5Adjustments([], 'season-2027').length, 0);
});

test('R5 adjusted ranking uses adjusted total without mutating OCR total', () => {
  const rows = [
    { name: 'Kika', total_demolition: 120000, participation_count: 3 },
    { name: '~Sarafina~', total_demolition: 100000, participation_count: 2 },
    { name: 'UNDEAD', total_demolition: 50000, participation_count: 1 },
  ];
  const adjustments = [
    { season: 'season-a', player: 'Sarafina~', points: 400, category: 'connected_road' },
    { season: 'season-a', player: 'UNDEAD', points: -100, category: 'path_block' },
  ];

  const adjusted = applyR5AdjustmentsToPlayerTotals(rows, adjustments, 'season-a');
  const sarafina = adjusted.find((row) => row.name === '~Sarafina~');
  const undead = adjusted.find((row) => row.name === 'UNDEAD');

  assert.equal(sarafina.total_demolition, 100000);
  assert.equal(sarafina.bonusR5, 400);
  assert.equal(sarafina.adjustedTotal, 100400);
  assert.equal(undead.adjustedTotal, 49900);

  const ranking = buildAdjustedGiftRanking(rows, adjustments, 'season-a');
  assert.deepEqual(
    ranking.map((row) => [row.name, row.adjustedRank, row.adjustedTotal]),
    [
      ['Kika', 1, 120000],
      ['~Sarafina~', 2, 100400],
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

test('updateR5Adjustment creates a missing cloud doc (uid + serverTimestamp)', async () => {
  const SERVER_TS = { __ts: 'server' };
  let written = null;
  const firestore = {
    doc: (_db, path, id) => ({ path, id }),
    getDoc: async () => ({ exists: () => false, data: () => undefined }),
    setDoc: async (ref, record) => {
      written = { ref, record };
    },
    serverTimestamp: () => SERVER_TS,
  };
  // A record only ever written locally while cloud sync was blocked.
  const seeded = createLocalR5Adjustment({
    id: 'local-only-1',
    season: 'eden-x1-2026',
    playerName: 'Феечка))',
    playerKey: 'feechka',
    category: 'connected_road',
    points: 2,
    note: 'old',
  });
  window.getVtsAdminFirestoreContext = () => ({
    db: {},
    user: { uid: 'admin-uid-123' },
    firestore,
  });
  try {
    const record = await updateR5Adjustment(seeded.id, {
      playerKey: 'feechka',
      playerName: 'Феечка))',
      category: 'connected_road',
      points: 5,
      note: 'updated',
    });
    assert.ok(written, 'a missing cloud doc should be written via setDoc');
    assert.equal(written.ref.id, 'local-only-1');
    assert.equal(
      written.record.createdBy,
      'admin-uid-123',
      'create rule needs createdBy == auth.uid'
    );
    assert.equal(written.record.createdAt, SERVER_TS, 'create uses serverTimestamp()');
    assert.equal(written.record.points, 5);
    assert.equal(written.record.note, 'updated');
    assert.equal(written.record.season, seeded.season);
    assert.equal(record.createdBy, 'admin-uid-123');
  } finally {
    delete window.getVtsAdminFirestoreContext;
  }
});

test('updateR5Adjustment preserves createdAt/createdBy when the cloud doc exists', async () => {
  const CREATED_AT = { toMillis: () => 123456789 };
  let written = null;
  const firestore = {
    doc: (_db, path, id) => ({ path, id }),
    getDoc: async () => ({
      exists: () => true,
      data: () => ({
        id: 'cloud-9',
        season: 'eden-x1-2026',
        playerKey: 'feechka',
        playerName: 'Феечка))',
        points: 2,
        category: 'connected_road',
        note: 'old',
        createdAt: CREATED_AT,
        createdBy: 'original-admin-uid',
      }),
    }),
    setDoc: async (ref, record) => {
      written = { ref, record };
    },
    serverTimestamp: () => ({ __ts: 'server' }),
  };
  // A different editor uid must NOT overwrite createdBy/createdAt (the update
  // rule requires both unchanged).
  window.getVtsAdminFirestoreContext = () => ({
    db: {},
    user: { uid: 'different-uid' },
    firestore,
  });
  try {
    await updateR5Adjustment('cloud-9', {
      playerKey: 'feechka',
      playerName: 'Феечка))',
      category: 'connected_road',
      points: 7,
      note: 'edited',
    });
    assert.ok(written);
    assert.equal(written.record.createdAt, CREATED_AT, 'createdAt must stay unchanged on update');
    assert.equal(
      written.record.createdBy,
      'original-admin-uid',
      'createdBy must stay unchanged on update'
    );
    assert.equal(written.record.points, 7);
    assert.equal(written.record.note, 'edited');
  } finally {
    delete window.getVtsAdminFirestoreContext;
  }
});

test('updateR5Adjustment repairs historical cloud metadata on edit', async () => {
  const SERVER_TS = { __ts: 'server' };
  let written = null;
  const firestore = {
    doc: (_db, path, id) => ({ path, id }),
    getDoc: async () => ({
      exists: () => true,
      data: () => ({
        id: 'seeded-cloud-1',
        season: 'season-2026',
        playerKey: 'feechka',
        playerName: 'Феечка))',
        points: 1,
        category: 'connected_road',
        note: 'seeded',
        createdAt: '2026-07-06T00:00:00.000Z',
        createdBy: 'release-12.4.1',
      }),
    }),
    setDoc: async (ref, record) => {
      written = { ref, record };
    },
    serverTimestamp: () => SERVER_TS,
  };
  window.getVtsAdminFirestoreContext = () => ({
    db: {},
    user: { uid: 'admin-uid-123' },
    firestore,
  });
  try {
    await updateR5Adjustment('seeded-cloud-1', {
      playerKey: 'feechka',
      playerName: 'Феечка))',
      category: 'connected_road',
      points: 2,
      note: 'edited seeded',
    });
    assert.ok(written);
    assert.equal(written.record.createdAt, SERVER_TS, 'historical string timestamps are repaired');
    assert.equal(
      written.record.createdBy,
      'admin-uid-123',
      'historical release creators are repaired'
    );
    assert.equal(written.record.points, 2);
  } finally {
    delete window.getVtsAdminFirestoreContext;
  }
});
