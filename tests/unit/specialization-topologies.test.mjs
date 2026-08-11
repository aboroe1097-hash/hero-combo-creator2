import test from 'node:test';
import assert from 'node:assert/strict';

import { SPECIALIZATION_RESEARCH } from '../../js/specialization-towers-v2-data.js';
import {
  SPECIALIZATION_TOPOLOGIES,
  getTopologyNodeIds,
  hasSpecializationTopology,
} from '../../js/specialization-topologies.js';

test('every topology covers its research exactly once', () => {
  for (const [researchId, topology] of Object.entries(SPECIALIZATION_TOPOLOGIES)) {
    const research = SPECIALIZATION_RESEARCH[researchId];
    assert.ok(research, `${researchId} is not a known research`);

    const ids = getTopologyNodeIds(researchId);
    const realIds = research.nodes.map((node) => node.id);

    assert.equal(
      new Set(ids).size,
      ids.length,
      `${researchId} lists a node more than once in its topology`
    );
    assert.deepEqual(
      [...ids].sort((a, b) => a - b),
      [...realIds].sort((a, b) => a - b),
      `${researchId} topology must cover every node of the research and no others`
    );
    assert.ok(topology.groups.length > 0, `${researchId} has no groups`);
  }
});

test('each group anchor is the loop headline node', () => {
  for (const [researchId, topology] of Object.entries(SPECIALIZATION_TOPOLOGIES)) {
    const byId = new Map(SPECIALIZATION_RESEARCH[researchId].nodes.map((n) => [n.id, n]));
    for (const group of topology.groups) {
      const anchor = byId.get(group.anchorNodeId);
      assert.ok(anchor, `${researchId}/${group.id} anchor ${group.anchorNodeId} does not exist`);
      // An anchor is either an immunity passive or the loop's big Vitality/HP node.
      const isPassive = /Immunity/i.test(anchor.effect || '');
      const isVitality =
        /Vitality/i.test(anchor.name || '') || /HP \+10%/.test(anchor.effect || '');
      assert.ok(
        isPassive || isVitality,
        `${researchId}/${group.id} anchor "${anchor.name}" (${anchor.effect}) is neither an immunity passive nor a Vitality node`
      );
      assert.ok(
        !group.loopNodeIds.includes(group.anchorNodeId),
        `${researchId}/${group.id} anchor must not also sit in the loop`
      );
    }
  }
});

test('Neat Formation III splits into front, mid and back rows of equal size', () => {
  const topology = SPECIALIZATION_TOPOLOGIES.neat3;
  assert.equal(topology.shape, 'triple-loop');
  assert.deepEqual(
    topology.groups.map((group) => group.row),
    ['front', 'mid', 'back']
  );
  const sizes = topology.groups.map((group) => group.loopNodeIds.length);
  assert.deepEqual(sizes, [10, 10, 10], 'the three rows are identical 10-node loops');

  // The row names in the source data must agree with the row each group claims.
  const byId = new Map(SPECIALIZATION_RESEARCH.neat3.nodes.map((n) => [n.id, n]));
  assert.match(byId.get(topology.groups[0].anchorNodeId).name, /Vanguard/i);
  assert.match(byId.get(topology.groups[2].anchorNodeId).name, /Rearguard/i);
});

test('only the pilot researches carry a topology so far', () => {
  assert.deepEqual(Object.keys(SPECIALIZATION_TOPOLOGIES).sort(), [
    'encounter4',
    'neat3',
    'training7',
  ]);
  assert.equal(hasSpecializationTopology('training1'), false);
});
