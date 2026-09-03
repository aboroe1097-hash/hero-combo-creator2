import assert from 'node:assert/strict';
import test from 'node:test';
import {
  PLANNER_STORAGE_KEY,
  createEmptyPlannerState,
  loadPlannerState,
  savePlannerState,
} from '../../js/research-planner-store.js';
import { parsePlannerSnapshot, serializePlannerSnapshot } from '../../js/research-planner-model.js';

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => (values.has(key) ? values.get(key) : null),
    setItem: (key, value) => values.set(key, String(value)),
    values,
  };
}

const validState = {
  schema: 'roc-vts.research-planner',
  schemaVersion: 1,
  savedAt: Date.now(),
  plans: [
    {
      familyId: 'd1956263',
      mode: 'min-unlock',
      targetNodeId: 'node_5',
      targetLevel: 3,
      currentLevels: { node_1: 1 },
    },
  ],
};

test('snapshot serialization round-trips', () => {
  const parsed = parsePlannerSnapshot(serializePlannerSnapshot(validState));
  assert.equal(parsed.schema, 'roc-vts.research-planner');
  assert.equal(parsed.schemaVersion, 1);
  assert.equal(parsed.plans.length, 1);
  assert.equal(parsed.plans[0].targetNodeId, 'node_5');
  assert.equal(parsed.plans[0].mode, 'min-unlock');
});

test('snapshot parsing rejects non-JSON and unsupported shapes', () => {
  assert.throws(() => parsePlannerSnapshot('not json'), /not valid JSON/);
  assert.throws(() => parsePlannerSnapshot('[]'), /unsupported shape/);
  assert.throws(() => parsePlannerSnapshot('null'), /unsupported shape/);
});

test('snapshot normalization drops malformed plans', () => {
  const parsed = parsePlannerSnapshot(
    JSON.stringify({
      plans: [{ bad: true }, null, 'nope', { familyId: 'ok', targetLevel: -5 }],
    })
  );
  assert.equal(parsed.plans.length, 1);
  assert.equal(parsed.plans[0].targetLevel, 1);
});

test('store saves and loads through injectable storage', () => {
  const storage = memoryStorage();
  assert.equal(savePlannerState(validState, storage), true);
  assert.ok(storage.values.has(PLANNER_STORAGE_KEY));
  const loaded = loadPlannerState(storage);
  assert.equal(loaded.plans.length, 1);
  assert.equal(loaded.plans[0].familyId, 'd1956263');
});

test('store returns empty state for missing storage', () => {
  assert.deepEqual(loadPlannerState(null), createEmptyPlannerState());
  assert.deepEqual(loadPlannerState({}), createEmptyPlannerState());
});

test('store discards corrupted JSON without crashing', () => {
  const storage = memoryStorage();
  storage.setItem(PLANNER_STORAGE_KEY, '{corrupted');
  assert.deepEqual(loadPlannerState(storage), createEmptyPlannerState());
});

test('store refuses oversized payloads', () => {
  const storage = memoryStorage();
  storage.setItem(PLANNER_STORAGE_KEY, JSON.stringify({ plans: 'x'.repeat(1_000_001) }));
  assert.deepEqual(loadPlannerState(storage), createEmptyPlannerState());
  const oversized = {
    ...validState,
    plans: [{ ...validState.plans[0], currentLevels: { x: 'y'.repeat(1_000_000) } }],
  };
  assert.equal(savePlannerState(oversized, storage), false);
});

test('save returns false without writable storage', () => {
  assert.equal(savePlannerState(validState, null), false);
  assert.equal(savePlannerState(null, memoryStorage()), false);
});
