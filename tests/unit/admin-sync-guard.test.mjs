import test from 'node:test';
import assert from 'node:assert/strict';

import {
  classifyRemoteSnapshot,
  conductAdjustmentFingerprint,
  createAdminEditGuard,
  createRevisionWriteQueue,
  normalizeSyncRevision,
} from '../../js/admin-sync-guard.js';

test('sync revisions reject malformed values and classify stale snapshots', () => {
  assert.equal(normalizeSyncRevision('7'), 7);
  assert.equal(normalizeSyncRevision(-1), 0);
  assert.equal(normalizeSyncRevision(2.5), 0);
  assert.equal(
    classifyRemoteSnapshot({ currentRevision: 8, incomingRevision: 7, editing: false }),
    'stale'
  );
  assert.equal(
    classifyRemoteSnapshot({ currentRevision: 8, incomingRevision: 8, editing: true }),
    'duplicate'
  );
  assert.equal(
    classifyRemoteSnapshot({ currentRevision: 8, incomingRevision: 9, editing: true }),
    'defer'
  );
  assert.equal(
    classifyRemoteSnapshot({ currentRevision: 8, incomingRevision: 9, editing: false }),
    'apply'
  );
});

test('admin edit guard freezes the save base and keeps the newest remote snapshot', () => {
  const guard = createAdminEditGuard();
  guard.begin('banner-form', 11);
  assert.equal(guard.shouldDeferRemoteSnapshot(), true);
  guard.focus('banner-form', 11);
  guard.markDirty('banner-form', 12);

  assert.equal(guard.expectedBaseRevision(99), 11);
  assert.equal(guard.shouldDeferRemoteSnapshot(), true);

  guard.defer({ syncRevision: 12, marker: 'first' });
  guard.defer({ syncRevision: 14, marker: 'newest' });
  guard.defer({ syncRevision: 13, marker: 'stale' });

  assert.deepEqual(guard.peekDeferred(), { syncRevision: 14, marker: 'newest' });
  assert.equal(guard.state().hasDeferredSnapshot, true);
  assert.equal(guard.finish().marker, 'newest');
  assert.deepEqual(guard.state(), {
    active: false,
    dirty: false,
    focused: false,
    scope: '',
    baseRevision: null,
    deferredRevision: 0,
    hasDeferredSnapshot: false,
  });
});

test('successful writes discard only deferred snapshots covered by their revision', () => {
  const guard = createAdminEditGuard();
  guard.focus('duty-form', 20);
  guard.markDirty();
  guard.defer({ syncRevision: 21 });
  guard.dropDeferredThrough(20);
  assert.equal(guard.state().hasDeferredSnapshot, true);
  guard.dropDeferredThrough(21);
  assert.equal(guard.state().hasDeferredSnapshot, false);
});

test('conduct fingerprints detect concurrent record edits independent of timestamp shape', () => {
  const base = {
    id: 'row-1',
    season: 'season-2026',
    playerKey: 'alice',
    playerName: 'Alice',
    points: 2,
    category: 'banner_help',
    note: 'original',
    createdAt: { toMillis: () => 1_750_000_000_000 },
    createdBy: 'admin-1',
  };
  const sameTimestamp = {
    ...base,
    createdAt: { seconds: 1_750_000_000, nanoseconds: 0 },
  };
  assert.equal(conductAdjustmentFingerprint(base), conductAdjustmentFingerprint(sameTimestamp));
  assert.notEqual(
    conductAdjustmentFingerprint(base),
    conductAdjustmentFingerprint({ ...base, note: 'changed elsewhere' })
  );
});

test('revision write queue serializes rapid saves and rebases only on its own successes', async () => {
  const calls = [];
  let idleCount = 0;
  const queue = createRevisionWriteQueue(
    async (payload, baseRevision) => {
      calls.push({ payload, baseRevision });
      return { ok: true, revision: `revision-${payload}` };
    },
    { onIdle: () => (idleCount += 1) }
  );

  const first = queue.enqueue('one', 'revision-0');
  const second = queue.enqueue('two', 'revision-0');
  const third = queue.enqueue('three', 'revision-0');
  await Promise.all([first, second, third]);

  assert.deepEqual(calls, [
    { payload: 'one', baseRevision: 'revision-0' },
    { payload: 'two', baseRevision: 'revision-one' },
    { payload: 'three', baseRevision: 'revision-two' },
  ]);
  assert.equal(idleCount, 1);
  assert.equal(queue.state().pending, 0);
});

test('revision write queue does not rebase after a rejected write', async () => {
  const calls = [];
  const queue = createRevisionWriteQueue(async (payload, baseRevision) => {
    calls.push({ payload, baseRevision });
    return payload === 'conflict'
      ? { ok: false, revision: 'remote-revision' }
      : { ok: true, revision: 'local-revision' };
  });

  await Promise.all([
    queue.enqueue('conflict', 'opened-revision'),
    queue.enqueue('retry', 'opened-revision'),
  ]);

  assert.deepEqual(calls, [
    { payload: 'conflict', baseRevision: 'opened-revision' },
    { payload: 'retry', baseRevision: 'opened-revision' },
  ]);
});
