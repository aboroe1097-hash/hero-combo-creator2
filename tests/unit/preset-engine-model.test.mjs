import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildPresetPayload,
  compareAllocations,
  computeAllocationSummary,
  createEmptyAllocation,
  findRequirementViolations,
  normalizeAllocation,
  parsePresetPayload,
  validateTreeDefinition,
} from '../../js/preset-engine-model.js';

const treeDef = {
  treeId: 'towers-cavalry',
  name: 'Cavalry towers',
  pointsPool: 100,
  nodes: [
    { id: 'root', name: 'Root', cost: 10, maxPoints: 5, requirements: [] },
    { id: 'aoe', name: 'AoE', cost: 20, maxPoints: 3, requirements: ['root'] },
    { id: 'siege', name: 'Siege', cost: 15, maxPoints: 4, requirements: ['aoe'] },
  ],
  presets: [
    { id: 'starter', name: 'Starter', allocation: { root: 3, aoe: 2, siege: 0 } },
  ],
  checkpoints: [{ id: 'first-aoe', name: 'First AoE', require: { aoe: 1 } }],
};

test('validateTreeDefinition freezes and normalizes a valid tree', () => {
  const tree = validateTreeDefinition(treeDef);
  assert.equal(tree.treeId, 'towers-cavalry');
  assert.equal(tree.pointsPool, 100);
  assert.equal(tree.nodes.length, 3);
  assert.equal(tree.nodes[1].requirements[0], 'root');
});

test('validateTreeDefinition rejects invalid definitions', () => {
  assert.throws(() => validateTreeDefinition(null), /must be an object/);
  assert.throws(() => validateTreeDefinition({ treeId: '', nodes: [] }), /requires a treeId/);
  assert.throws(() => validateTreeDefinition({ treeId: 'x', nodes: [] }), /at least one node/);
  assert.throws(
    () =>
      validateTreeDefinition({
        treeId: 'x',
        nodes: [
          { id: 'a', maxPoints: 1 },
          { id: 'a', maxPoints: 1 },
        ],
        pointsPool: 0,
      }),
    /duplicates node/
  );
  assert.throws(
    () =>
      validateTreeDefinition({
        treeId: 'x',
        nodes: [{ id: 'a', maxPoints: 1, requirements: ['ghost'] }],
        pointsPool: 0,
      }),
    /unknown node/
  );
  assert.throws(
    () => validateTreeDefinition({ treeId: 'x', nodes: [{ id: 'a' }], pointsPool: -1 }),
    /invalid pointsPool/
  );
});

test('allocation math computes spent and remaining', () => {
  const tree = validateTreeDefinition(treeDef);
  const allocation = { root: 4, aoe: 2, siege: 1 };
  const summary = computeAllocationSummary(tree, allocation);
  assert.equal(summary.spent, 4 * 10 + 2 * 20 + 1 * 15);
  assert.equal(summary.remaining, 100 - summary.spent);
  assert.equal(summary.perNode.length, 3);
});

test('normalizeAllocation rejects unknown nodes and overspend', () => {
  const tree = validateTreeDefinition(treeDef);
  assert.throws(() => normalizeAllocation(tree, { ghost: 1 }), /no node "ghost"/);
  assert.throws(() => normalizeAllocation(tree, { root: 99 }), /exceeds maxPoints/);
  assert.throws(() => normalizeAllocation(tree, { root: -1 }), /invalid points/);
  assert.deepEqual(createEmptyAllocation(tree), { root: 0, aoe: 0, siege: 0 });
});

test('requirement violations flag points above unmet requirements', () => {
  const tree = validateTreeDefinition(treeDef);
  assert.deepEqual(findRequirementViolations(tree, { root: 0, aoe: 2, siege: 0 }), [
    { nodeId: 'aoe', requires: 'root' },
  ]);
  assert.deepEqual(findRequirementViolations(tree, { root: 1, aoe: 1, siege: 1 }), []);
});

test('preset payload round-trips and rejects tampering', () => {
  const tree = validateTreeDefinition(treeDef);
  const payload = buildPresetPayload(tree, { root: 3, aoe: 1, siege: 0 }, 'My build');
  assert.equal(payload.schema, 'roc-vts.preset');
  assert.equal(payload.version, 1);
  const parsed = parsePresetPayload(tree, payload);
  assert.equal(parsed.name, 'My build');
  assert.deepEqual(parsed.allocation, { root: 3, aoe: 1, siege: 0 });
  assert.throws(
    () => parsePresetPayload(tree, { ...payload, treeId: 'other-tree' }),
    /targets tree "other-tree"/
  );
  assert.throws(
    () => parsePresetPayload(tree, { ...payload, schema: 'roc-vts.old', version: 0 }),
    /unsupported schema version/
  );
  assert.throws(
    () => parsePresetPayload(tree, { ...payload, allocation: { ghost: 1 } }),
    /no node "ghost"/
  );
});

test('compareAllocations diffs per node and evaluates checkpoints', () => {
  const tree = validateTreeDefinition(treeDef);
  const diff = compareAllocations(tree, { root: 1, aoe: 0, siege: 0 }, { root: 2, aoe: 1, siege: 0 });
  const root = diff.perNode.find((entry) => entry.nodeId === 'root');
  assert.equal(root.delta, 1);
  const checkpoint = diff.checkpoints.find((entry) => entry.id === 'first-aoe');
  assert.equal(checkpoint.metA, false);
  assert.equal(checkpoint.metB, true);
});
