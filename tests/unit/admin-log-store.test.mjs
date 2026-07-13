import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ADMIN_LOG_LOCAL_LIMIT,
  ADMIN_LOG_OUTBOX_LIMIT,
  ADMIN_LOG_STORAGE_KEY,
  createAdminLogEventId,
  createAdminLogStore,
  formatAdminLogMessage,
} from '../../js/admin-log-store.js';

function memoryStorage(seed = {}) {
  const values = new Map(Object.entries(seed));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
    values,
  };
}

function createStore(options = {}) {
  return createAdminLogStore({
    storage: options.storage || memoryStorage(),
    now: options.now || (() => 1_700_000_000_000),
    sessionId: options.sessionId || 'test_session',
    schedule: () => null,
    cancelSchedule: () => {},
  });
}

test('legacy terminal entries stay local while new entries are structured and redacted', () => {
  const storage = memoryStorage({
    [ADMIN_LOG_STORAGE_KEY]: JSON.stringify([
      { time: '10:00:00', msg: 'Legacy warning', type: 'warn', file: 'old.png' },
    ]),
  });
  const store = createStore({ storage });

  const restored = store.restore();
  assert.equal(restored.length, 1);
  assert.equal(restored[0].localOnly, true);
  assert.equal(store.getOutbox().length, 0);

  const entry = store.record({
    severity: 'error',
    source: 'ocr',
    fallback: 'token=very-secret Bearer abc.def.ghi Snippet: private OCR text\n    at hidden-stack',
    file: 'C:\\Users\\Admin\\screenshots\\attack.png',
  });

  assert.equal(entry.severity, 'error');
  assert.equal(entry.source, 'ocr');
  assert.equal(entry.file, 'attack.png');
  assert.match(entry.fallback, /token=\[redacted\]/i);
  assert.match(entry.fallback, /Bearer \[redacted\]/);
  assert.match(entry.fallback, /Snippet: \[redacted\]/);
  assert.doesNotMatch(entry.fallback, /private OCR text|hidden-stack|very-secret/);
  assert.equal(store.getOutbox().length, 1);
});

test('event ids are deterministic and the local ring and outbox stay bounded', () => {
  assert.equal(
    createAdminLogEventId({ clientCreatedAtMs: 123456, sessionId: 'device-a', sequence: 7 }),
    createAdminLogEventId({ clientCreatedAtMs: 123456, sessionId: 'device-a', sequence: 7 })
  );

  let nowMs = 1_700_000_000_000;
  const store = createStore({ now: () => nowMs++, sessionId: 'bounded' });
  for (let index = 0; index < ADMIN_LOG_LOCAL_LIMIT + 25; index += 1) {
    store.record({ fallback: `Entry ${index}`, severity: index % 2 ? 'info' : 'success' });
  }

  assert.equal(
    store.list({ includeCleared: true, limit: ADMIN_LOG_LOCAL_LIMIT + 100 }).length,
    ADMIN_LOG_LOCAL_LIMIT
  );
  assert.equal(store.getOutbox().length, ADMIN_LOG_OUTBOX_LIMIT);
});

test('remote merges deduplicate by id and authoritative server time controls ordering', () => {
  const store = createStore();
  const local = store.record({ id: 'shared_event_1', fallback: 'Pending', severity: 'info' });
  store.record({ id: 'local_event_2', fallback: 'Local newer', clientCreatedAtMs: 200 });

  store.ingestRemote([
    {
      ...local,
      fallback: 'Synced',
      createdAt: { toMillis: () => 300 },
      createdBy: 'admin-uid',
    },
  ]);

  const entries = store.list({ includeCleared: true, limit: 10 });
  assert.equal(entries.filter((entry) => entry.id === 'shared_event_1').length, 1);
  assert.equal(entries[0].id, 'shared_event_1');
  assert.equal(entries[0].fallback, 'Synced');
  assert.equal(entries[0].createdBy, 'admin-uid');
  assert.equal(
    store.getOutbox().some((entry) => entry.id === 'shared_event_1'),
    false
  );
});

test('Clear View is non-destructive and filters and translated messages remain available', () => {
  let nowMs = 1000;
  const storage = memoryStorage();
  const store = createStore({ storage, now: () => nowMs });
  store.record({
    severity: 'warn',
    source: 'cloud',
    messageKey: 'adminCloudRetryPending',
    params: { count: 2 },
    fallback: 'Retry pending',
  });

  assert.equal(store.list({ severity: 'warn', query: 'retry' }).length, 1);
  assert.equal(
    formatAdminLogMessage(store.list()[0], (key) =>
      key === 'adminCloudRetryPending' ? 'Reintento pendiente' : key
    ),
    'Reintento pendiente'
  );

  store.clearView(nowMs);
  assert.equal(store.list().length, 0);
  assert.equal(store.list({ includeCleared: true }).length, 1);

  nowMs += 1;
  store.record({ severity: 'success', fallback: 'New event' });
  assert.deepEqual(
    store.list().map((entry) => entry.fallback),
    ['New event']
  );

  store.resetView();
  assert.equal(store.list().length, 2);
  store.flush();
  assert.equal(JSON.parse(storage.getItem(ADMIN_LOG_STORAGE_KEY)).length, 2);
});
