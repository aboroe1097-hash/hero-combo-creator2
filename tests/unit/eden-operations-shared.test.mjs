import assert from 'node:assert/strict';
import test from 'node:test';

import {
  EDEN_OPERATIONS_SHARED_CACHE_KEY,
  applySharedDelta,
  isObjectiveKey,
  normalizeSharedCounts,
  objectiveKey,
  sharedCountsFor,
  sharedCountsPayload,
  sharedObjectiveKeys,
} from '../../js/eden-operations-model.js';
import { readCachedSharedCounts, writeCachedSharedCounts } from '../../js/eden-operations-cloud.js';
import { EDEN_STRUCTURES } from '../../js/eden-operations-data.js';

const structureIds = EDEN_STRUCTURES.map((entry) => entry.id);

function fakeStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
    get size() {
      return data.size;
    },
  };
}

test('an objective key is the structure id, plus a banner variant', () => {
  assert.equal(objectiveKey('gate-3'), 'gate-3');
  assert.equal(objectiveKey('gate-3', true), 'gate-3:banner');
  // An unknown structure falls back to the catalogue's first entry, so a stale
  // saved plan can never write a key the rules reject.
  assert.equal(objectiveKey('not-a-structure'), structureIds[0]);
  assert.ok(isObjectiveKey('city-2:banner'));
  assert.ok(!isObjectiveKey('city-9'));
  assert.ok(!isObjectiveKey('gate-1:banner:extra'));
  assert.ok(!isObjectiveKey(''));
  assert.deepEqual(sharedObjectiveKeys(), [...structureIds.flatMap((id) => [id, `${id}:banner`])]);
});

test('counts from Firestore, the cache or an old build are normalized and bounded', () => {
  assert.deepEqual(
    normalizeSharedCounts({
      'gate-3': { attackers: 4000, support: -5 },
      'gate-3:banner': { attackers: '7', support: null },
      'not-an-objective': { attackers: 3, support: 3 },
      'city-1': 'nonsense',
      junk: null,
    }),
    {
      'gate-3': { attackers: 500, support: 0 },
      'gate-3:banner': { attackers: 7, support: 0 },
    }
  );
  assert.deepEqual(normalizeSharedCounts(null), {});
  assert.deepEqual(normalizeSharedCounts('nope'), {});
});

test('one side of one objective moves without touching the rest', () => {
  const start = { 'gate-3': { attackers: 5, support: 5 }, 'city-1': { attackers: 2, support: 1 } };
  const bumped = applySharedDelta(start, 'gate-3', 'attackers', 1);
  assert.deepEqual(bumped['gate-3'], { attackers: 6, support: 5 });
  assert.deepEqual(bumped['city-1'], { attackers: 2, support: 1 }, 'other objectives stay');
  assert.deepEqual(start['gate-3'], { attackers: 5, support: 5 }, 'input is not mutated');

  // Bounds hold at both ends, and an unknown key or side is refused outright.
  assert.equal(applySharedDelta(start, 'gate-3', 'attackers', 9999)['gate-3'].attackers, 500);
  assert.equal(applySharedDelta({}, 'gate-3', 'attackers', -3)['gate-3'].attackers, 0);
  assert.deepEqual(applySharedDelta(start, 'nope', 'attackers', 1), normalizeSharedCounts(start));
  assert.deepEqual(applySharedDelta(start, 'gate-3', 'wizards', 1), normalizeSharedCounts(start));

  assert.deepEqual(sharedCountsFor({}, 'gate-3'), { attackers: 0, support: 0 });
  assert.deepEqual(sharedCountsFor(start, 'gate-3'), { attackers: 5, support: 5 });
});

test('the write payload carries known keys and whole numbers only', () => {
  assert.deepEqual(sharedCountsPayload({ 'gate-3': { attackers: 1.6, support: '2' } }), {
    'gate-3': { attackers: 2, support: 2 },
  });
  assert.deepEqual(sharedCountsPayload({ nope: { attackers: 1, support: 1 } }), {});
  const payload = sharedCountsPayload({ 'gate-3': { attackers: 1, support: 1 } });
  assert.deepEqual(Object.keys(payload['gate-3']), ['attackers', 'support']);
});

test('the last shared snapshot is cached, and a broken cache reads as empty', () => {
  const storage = fakeStorage();
  writeCachedSharedCounts({ 'gate-3': { attackers: 3, support: 4 } }, storage);
  assert.deepEqual(readCachedSharedCounts(storage), { 'gate-3': { attackers: 3, support: 4 } });

  // Offline reads fall back to this cache, so it must survive junk, a refused
  // write and no storage at all.
  const broken = fakeStorage({ [EDEN_OPERATIONS_SHARED_CACHE_KEY]: '{not json' });
  assert.deepEqual(readCachedSharedCounts(broken), {});
  assert.deepEqual(readCachedSharedCounts(undefined), {});
  const hostile = fakeStorage({
    [EDEN_OPERATIONS_SHARED_CACHE_KEY]: JSON.stringify({ 'gate-3': { attackers: 'x' } }),
  });
  assert.deepEqual(readCachedSharedCounts(hostile), { 'gate-3': { attackers: 0, support: 0 } });
  const refusing = {
    getItem: () => null,
    setItem: () => {
      throw new Error('quota');
    },
  };
  writeCachedSharedCounts({ 'gate-3': { attackers: 1, support: 1 } }, refusing);
  assert.deepEqual(readCachedSharedCounts(refusing), {});
});
