import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyTowersPreset,
  buildSpecResearchTreeDefinition,
  buildTowersTreeDefinition,
  captureTowersPreset,
  towersAllocationToSelection,
  towersSelectionToAllocation,
} from '../../js/specialization-towers-v2-preset-adapter.js';
import { buildEdenTreeDefinition, edenAllocationToNodeIds, edenNodeIdsToAllocation } from '../../js/eden-preset-adapter.js';
import { createClassCardPresetTree } from '../../js/class-card-preset-adapter.js';
import { createEmptySpecializationState, getResearchSelection, getResearchUpgradeTotal } from '../../js/specialization-towers-v2-model.js';
import { getSpecializationResearch } from '../../js/specialization-towers-v2-data.js';

test('towers tree definition mirrors the research record', () => {
  const research = getSpecializationResearch('training1');
  const tree = buildTowersTreeDefinition('training1');
  assert.equal(tree.treeId, 'towers:training1');
  assert.equal(tree.name, research.name);
  assert.equal(tree.nodes.length, research.nodes.length);
  assert.equal(tree.pointsPool, getResearchUpgradeTotal(research));
  for (const node of tree.nodes) {
    assert.ok(node.maxPoints === 1 || node.maxPoints === 2);
  }
});

test('towers tree definition returns null for unknown research ids', () => {
  assert.equal(buildTowersTreeDefinition('ghost-research'), null);
});

test('towers allocation and selection round-trip', () => {
  const tree = buildTowersTreeDefinition('training1');
  const allocation = towersSelectionToAllocation(tree, [5, 5, 1]);
  assert.deepEqual(allocation, { 5: 2, 1: 1 });
  const selection = towersAllocationToSelection(tree, allocation);
  assert.deepEqual(selection, [1, 5, 5]);
});

test('towers selection ignores unknown node ids on capture', () => {
  const tree = buildTowersTreeDefinition('training1');
  const allocation = towersSelectionToAllocation(tree, [1, 999]);
  assert.deepEqual(allocation, { 1: 1 });
});

test('captureTowersPreset snapshots the current towers selection', () => {
  const state = createEmptySpecializationState();
  const applied = applyTowersPreset(state, 'footman', 'training1', { 5: 2, 2: 1 });
  const captured = captureTowersPreset(applied, 'footman', 'training1');
  assert.equal(captured.treeId, 'towers:training1');
  assert.deepEqual(captured.allocation, { 5: 2, 2: 1 });
  const selection = getResearchSelection(applied, 'footman', 'training1');
  assert.deepEqual(selection.selectedNodeIds, [2, 5, 5]);
});

test('applyTowersPreset rejects allocations outside the towers model', () => {
  const state = createEmptySpecializationState();
  assert.throws(() => applyTowersPreset(state, 'footman', 'training1', { ghost: 1 }), /no node/);
  assert.equal(applyTowersPreset(state, 'footman', 'ghost-research', {}), null);
});

test('eden adapter maps research objects to engine tree definitions', () => {
  const research = getSpecializationResearch('training1');
  const tree = buildEdenTreeDefinition(research);
  assert.equal(tree.treeId, 'towers:training1');
  assert.equal(tree.nodes.length, research.nodes.length);
  assert.deepEqual(edenNodeIdsToAllocation(tree, [1, 2]), { 1: 1, 2: 1 });
  assert.deepEqual(edenAllocationToNodeIds(tree, { 1: 1, 2: 1 }), [1, 2]);
  assert.equal(buildSpecResearchTreeDefinition(null), null);
  assert.equal(buildSpecResearchTreeDefinition({ id: '', nodes: [] }), null);
});

test('class-card adapter builds validated trees from codex-shaped cards', () => {
  const tree = createClassCardPresetTree({
    treeId: 'class-cards:architect',
    name: 'Architect cards',
    cards: [
      { id: 'a1', name: 'Blueprint', cost: 2, maxPoints: 1 },
      { id: 'a2', name: 'Site Plan', cost: 3, maxPoints: 2, requirements: ['a1'] },
    ],
  });
  assert.equal(tree.treeId, 'class-cards:architect');
  assert.equal(tree.pointsPool, 8);
  assert.deepEqual(tree.nodes[1].requirements, ['a1']);
});

test('class-card adapter rejects malformed input', () => {
  assert.throws(() => createClassCardPresetTree({ cards: [] }), /requires a treeId/);
  assert.throws(() => createClassCardPresetTree({ treeId: 'x', cards: [] }), /at least one card/);
  assert.throws(() => createClassCardPresetTree({ treeId: 'x', cards: [null] }), /must be an object/);
});
