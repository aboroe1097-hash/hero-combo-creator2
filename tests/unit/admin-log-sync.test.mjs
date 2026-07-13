import assert from 'node:assert/strict';
import test from 'node:test';

import { createAdminLogStore } from '../../js/admin-log-store.js';
import {
  ADMIN_LOG_COLLECTION_PATH,
  createAdminLogSync,
  serializeAdminLogForCloud,
} from '../../js/admin-log-sync.js';

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
}

function createStore() {
  return createAdminLogStore({
    storage: memoryStorage(),
    now: () => 1_700_000_000_000,
    sessionId: 'sync_test',
    schedule: () => null,
    cancelSchedule: () => {},
  });
}

function fakeFirestore(options = {}) {
  const documents = options.documents || new Map();
  const state = {
    documents,
    queryParts: [],
    snapshotNext: null,
    snapshotError: null,
    unsubscribed: false,
    transactionCount: 0,
  };
  const firestore = {
    collection: (_db, path) => ({ path }),
    doc: (collectionRef, id) => ({ path: `${collectionRef.path}/${id}`, id }),
    orderBy: (field, direction) => ({ kind: 'orderBy', field, direction }),
    limit: (count) => ({ kind: 'limit', count }),
    query: (collectionRef, ...parts) => {
      state.queryParts = parts;
      return { collectionRef, parts };
    },
    onSnapshot: (_query, next, error) => {
      state.snapshotNext = next;
      state.snapshotError = error;
      return () => {
        state.unsubscribed = true;
      };
    },
    runTransaction: async (_db, callback) => {
      state.transactionCount += 1;
      if (options.transactionError) throw options.transactionError;
      return callback({
        get: async (ref) => ({ exists: () => documents.has(ref.id) }),
        set: (ref, payload) => documents.set(ref.id, payload),
      });
    },
    serverTimestamp: () => ({ kind: 'serverTimestamp' }),
    Timestamp: { fromMillis: (millis) => ({ kind: 'timestamp', millis }) },
  };
  return { firestore, state };
}

function onlineTarget(online = true) {
  const listeners = new Map();
  return {
    navigator: { onLine: online },
    addEventListener: (name, listener) => listeners.set(name, listener),
    removeEventListener: (name) => listeners.delete(name),
    listeners,
  };
}

test('cloud serialization exposes only the strict immutable event contract', () => {
  const payload = serializeAdminLogForCloud(
    {
      id: 'event_1',
      severity: 'warn',
      source: 'cloud',
      messageKey: 'adminCloudRetryPending',
      params: { count: 2, player: 'private-player-handle' },
      fallback: 'Retry pending for private-player-handle. Snippet: raw OCR text',
      file: 'C:\\Users\\private-player-handle\\report.png',
      clientCreatedAtMs: 1234,
      sessionId: 'session_1',
      sequence: 4,
      localOnly: false,
      createdAtMs: 999,
    },
    {
      uid: 'admin-uid',
      nowMs: 2000,
      serverTimestamp: () => 'SERVER_TIME',
      Timestamp: { fromMillis: (millis) => millis },
    }
  );

  assert.deepEqual(Object.keys(payload).sort(), [
    'clientCreatedAtMs',
    'createdAt',
    'createdBy',
    'expiresAt',
    'fallback',
    'file',
    'id',
    'messageKey',
    'params',
    'sequence',
    'sessionId',
    'severity',
    'source',
  ]);
  assert.equal(payload.createdBy, 'admin-uid');
  assert.equal(payload.createdAt, 'SERVER_TIME');
  assert.equal(typeof payload.params, 'string');
  assert.deepEqual(JSON.parse(payload.params), { count: 2 });
  assert.equal(payload.fallback, 'cloud warn activity');
  assert.equal(payload.file, '');
  assert.doesNotMatch(JSON.stringify(payload), /private-player-handle|raw OCR|C:\\Users/i);
  assert.equal(payload.localOnly, undefined);
});

test('sync drains the outbox idempotently and merges the newest realtime snapshot', async () => {
  const store = createStore();
  store.record({ id: 'local_1', fallback: 'First local event' });
  store.record({ id: 'already_remote', fallback: 'Already there' });
  const documents = new Map([['already_remote', { id: 'already_remote' }]]);
  const { firestore, state } = fakeFirestore({ documents });
  const statuses = [];
  const target = onlineTarget();
  const sync = createAdminLogSync({
    db: { name: 'db' },
    firestore,
    uid: 'admin-uid',
    store,
    onStatus: (status) => statuses.push(status.status),
    onlineTarget: target,
    retryDelays: [1],
  });

  sync.start();
  await sync.flush();

  assert.equal(state.queryParts[0].field, 'createdAt');
  assert.equal(state.queryParts[0].direction, 'desc');
  assert.equal(state.queryParts[1].count, 200);
  assert.equal(documents.has('local_1'), true);
  assert.equal(state.transactionCount, 2);
  assert.equal(store.getOutbox().length, 0);

  state.snapshotNext({
    metadata: { fromCache: false },
    docs: [
      {
        id: 'remote_2',
        data: () => ({
          id: 'remote_2',
          severity: 'success',
          source: 'dashboard',
          messageKey: '',
          params: '{}',
          fallback: 'Remote success',
          file: '',
          clientCreatedAtMs: 1_700_000_001_500,
          createdAt: { toMillis: () => 1_700_000_002_500 },
          createdBy: 'admin-uid',
          sessionId: 'remote_session',
          sequence: 1,
        }),
      },
    ],
  });

  assert.equal(
    store.list({ includeCleared: true }).filter((entry) => entry.id === 'remote_2').length,
    1
  );
  assert.equal(store.list({ includeCleared: true })[0].fallback, 'Remote success');
  assert.ok(statuses.includes('live'));
  sync.stop();
  assert.equal(state.unsubscribed, true);
  assert.equal(target.listeners.has('online'), false);
});

test('offline failures retain the outbox and schedule retry without creating recursive logs', async () => {
  const store = createStore();
  store.record({ id: 'offline_1', fallback: 'Keep me pending', source: 'sync' });
  const { firestore } = fakeFirestore({ transactionError: new Error('network unavailable') });
  const statuses = [];
  const timers = [];
  const sync = createAdminLogSync({
    db: { name: 'db' },
    firestore,
    uid: 'admin-uid',
    store,
    onStatus: (status) => statuses.push(status.status),
    onlineTarget: onlineTarget(false),
    retryDelays: [1000],
    setTimer: (callback, delay) => {
      timers.push({ callback, delay });
      return timers.length;
    },
    clearTimer: () => {},
  });

  const before = store.list({ includeCleared: true }).length;
  sync.start();
  const result = await sync.flush();

  assert.equal(result.remaining, 1);
  assert.equal(store.getOutbox().length, 1);
  assert.equal(store.list({ includeCleared: true }).length, before);
  assert.ok(statuses.includes('offline'));
  assert.equal(timers[0].delay, 1000);
  sync.stop();
});

test('the Firestore path is isolated from the public dashboard document', () => {
  assert.equal(ADMIN_LOG_COLLECTION_PATH, 'vts_admin/log_store/admin_log_events');
});
