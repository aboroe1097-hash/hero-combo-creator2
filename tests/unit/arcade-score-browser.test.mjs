import assert from 'node:assert/strict';
import test from 'node:test';

test('existing named-player device bests seed the durable cloud retry queue', async (t) => {
  const navigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const data = new Map([
    ['vts_arcade_profile', JSON.stringify({ name: 'Abo', state: '1097' })],
    ['vts_proto_merge_rush', '0'],
    ['vts_proto_sort_hoard', '35'],
    ['vts_proto_crystal_relay', '17'],
  ]);
  const localStorage = {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
  };

  globalThis.window = {
    localStorage,
    dispatchEvent() {},
    addEventListener() {},
  };
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: { onLine: true },
  });
  globalThis.CustomEvent = class CustomEvent {
    constructor(type, options = {}) {
      this.type = type;
      this.detail = options.detail;
    }
  };
  t.after(() => {
    delete globalThis.window;
    if (navigatorDescriptor) {
      Object.defineProperty(globalThis, 'navigator', navigatorDescriptor);
    } else {
      delete globalThis.navigator;
    }
    delete globalThis.CustomEvent;
  });

  const scores = await import(`../../js/arcade-scores.js?backfill=${Date.now()}`);
  assert.equal(scores.queueLocalBestsForSync(), 2);
  assert.deepEqual(JSON.parse(data.get('vts_arcade_pending_scores')), {
    sort_hoard: 35,
    crystal_relay: 17,
  });
  assert.equal(scores.getSyncState(), 'pending');
});

test('overall Arcade rating is the sum of each player profile game bests', async () => {
  const scores = await import(`../../js/arcade-scores.js?sum=${Date.now()}`);
  const rows = [
    {
      uid: 'u1',
      playerId: 'player-one-123',
      name: 'Abo',
      state: '1097',
      gameId: 'sort_hoard',
      score: 35,
      updatedAtMs: 1,
    },
    {
      uid: 'u1',
      playerId: 'player-one-123',
      name: 'Abo',
      state: '1097',
      gameId: 'crystal_relay',
      score: 1145,
      updatedAtMs: 2,
    },
    {
      uid: 'u1',
      playerId: 'player-two-456',
      name: 'Angel',
      state: '1097',
      gameId: 'sort_hoard',
      score: 30,
      updatedAtMs: 3,
    },
  ];
  const board = scores.buildOverallLeaderboard(rows);
  assert.equal(board.length, 2);
  assert.equal(board[0].name, 'Abo');
  assert.equal(board[0].rating, 1180);
  assert.equal(board[1].rating, 30);
});
