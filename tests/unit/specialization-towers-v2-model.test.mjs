import assert from 'node:assert/strict';
import test from 'node:test';

import {
  SPECIALIZATION_COLUMNS,
  SPECIALIZATION_DATA_REVISION,
  SPECIALIZATION_RESEARCH,
} from '../../js/specialization-towers-v2-data.js';
import {
  SPECIALIZATION_STATE_SCHEMA,
  SPECIALIZATION_STATE_SCHEMA_VERSION,
  SPECIALIZATION_STATE_MAX_JSON_LENGTH,
  buildSpecializationSnapshot,
  createEmptySpecializationState,
  deriveResearchNodeAccess,
  getColumnProgress,
  getResearchNodeAccess,
  getResearchProgress,
  getNodeUpgradeCount,
  getResearchUpgradeTotal,
  getResearchSelection,
  getSpecializationSummary,
  parseSpecializationState,
  removeResearchNodeAndDependents,
  resetResearch,
  resetTower,
  serializeSpecializationState,
  setResearchMedalsSpent,
  setResearchNodes,
  toggleResearchNode,
} from '../../js/specialization-towers-v2-model.js';

// Every upgrade, not every node: base-attribute nodes take two, so they appear
// twice in a fully learned selection.
function allNodeIds(researchId) {
  const research = SPECIALIZATION_RESEARCH[researchId];
  const ids = [];
  research.nodes.forEach((node) => {
    for (let index = 0; index < getNodeUpgradeCount(node); index += 1) ids.push(node.id);
  });
  if (research.passiveSkillNodeId !== null) ids.push(research.passiveSkillNodeId);
  return ids;
}

function completeResearch(state, troopId, researchId) {
  return setResearchNodes(state, troopId, researchId, allNodeIds(researchId));
}

test('empty state uses the versioned canonical schema and deterministic research order', () => {
  const state = createEmptySpecializationState();

  assert.equal(state.schema, SPECIALIZATION_STATE_SCHEMA);
  assert.equal(state.schemaVersion, SPECIALIZATION_STATE_SCHEMA_VERSION);
  assert.equal(state.dataRevision, SPECIALIZATION_DATA_REVISION);
  assert.deepEqual(Object.keys(state.troops), ['footman', 'archer', 'cavalry']);
  assert.equal(Object.isFrozen(state), true);
  assert.equal(Object.isFrozen(state.troops.footman.researches.training1), true);
  assert.equal(serializeSpecializationState(state), serializeSpecializationState(state));
});

test('node helpers return new states, preserve the input, and normalize node order', () => {
  const initial = createEmptySpecializationState();
  const research = SPECIALIZATION_RESEARCH.training1;
  const first = research.nodes[0].id;
  const second = research.nodes[1].id;

  const selected = setResearchNodes(initial, 'cavalry', 'training1', [second, first, second]);
  assert.deepEqual(getResearchSelection(initial, 'cavalry', 'training1').selectedNodeIds, []);
  assert.deepEqual(getResearchSelection(selected, 'cavalry', 'training1').selectedNodeIds, [
    first,
    second,
  ]);

  const toggledOff = toggleResearchNode(selected, 'cavalry', 'training1', first);
  assert.deepEqual(getResearchSelection(toggledOff, 'cavalry', 'training1').selectedNodeIds, [
    second,
  ]);
  assert.notEqual(toggledOff, selected);
  assert.throws(
    () => toggleResearchNode(selected, 'cavalry', 'training1', 999_999),
    /unknown node ID/
  );
});

test('progressive node access distinguishes available, hidden, locked, and imported nodes', () => {
  const research = {
    id: 'synthetic',
    progressiveReveal: { status: 'partial-evidence' },
    nodes: [
      { id: 1, prerequisiteNodeIds: [], pathBranch: 'left' },
      { id: 2, prerequisiteNodeIds: [1] },
      { id: 3, visibleWhenLocked: true },
      { id: 4 },
    ],
    passiveSkillNodeId: null,
  };

  const initial = deriveResearchNodeAccess(research, []);
  assert.deepEqual(
    initial.entries.map(({ nodeId, state, visible, selectable }) => ({
      nodeId,
      state,
      visible,
      selectable,
    })),
    [
      { nodeId: 1, state: 'available', visible: true, selectable: true },
      { nodeId: 2, state: 'hidden', visible: false, selectable: false },
      { nodeId: 3, state: 'locked', visible: true, selectable: false },
      { nodeId: 4, state: 'hidden', visible: false, selectable: false },
    ]
  );
  assert.equal(initial.hiddenCount, 2);
  assert.equal(initial.hasUnverifiedPath, true);

  const afterRoot = deriveResearchNodeAccess(research, [1]);
  assert.equal(afterRoot.entries.find(({ nodeId }) => nodeId === 2).state, 'available');
  const imported = deriveResearchNodeAccess(research, [4]);
  assert.deepEqual(
    imported.entries.find(({ nodeId }) => nodeId === 4),
    {
      nodeId: 4,
      passive: false,
      state: 'learned',
      visible: true,
      selectable: true,
      selected: true,
      level: 1,
      maxLevel: 1,
      prerequisitesVerified: false,
      prerequisiteNodeIds: null,
      pathBranch: null,
    }
  );
});

test('removing a prerequisite cascade-clears every explicitly dependent descendant', () => {
  const research = {
    nodes: [
      { id: 1, prerequisiteNodeIds: [] },
      { id: 2, prerequisiteNodeIds: [1] },
      { id: 3, prerequisiteNodeIds: [2] },
      { id: 4, prerequisiteNodeIds: [] },
    ],
    passiveSkillNodeId: null,
  };

  assert.deepEqual(removeResearchNodeAndDependents(research, [1, 2, 3, 4], 1), [4]);
  assert.deepEqual(removeResearchNodeAndDependents(research, [1, 2, 3, 4], 2), [1, 4]);
});

test('Enhanced Tactics IV exposes all public nodes without inventing downstream edges', () => {
  const initial = createEmptySpecializationState();
  const access = getResearchNodeAccess(initial, 'cavalry', 'enhanced4');
  assert.equal(access.mode, 'unrestricted');
  assert.equal(access.hiddenCount, 0);
  assert.equal(access.entries.length, 24);
  assert.equal(
    access.entries.every(({ visible, selectable }) => visible && selectable),
    true
  );
  assert.equal(access.entries.find(({ nodeId }) => nodeId === 1).state, 'available');
  assert.equal(access.entries.find(({ nodeId }) => nodeId === 12).state, 'available');
  assert.equal(access.entries.find(({ nodeId }) => nodeId === 24).state, 'available');

  const withPublishedNode = toggleResearchNode(initial, 'cavalry', 'enhanced4', 2);
  assert.deepEqual(
    getResearchSelection(withPublishedNode, 'cavalry', 'enhanced4').selectedNodeIds,
    [2]
  );
  assert.equal(
    getResearchNodeAccess(withPublishedNode, 'cavalry', 'enhanced4').entries.find(
      ({ nodeId }) => nodeId === 12
    ).state,
    'available'
  );
});

test('research milestones use the exact selected-node ratio, including the passive node', () => {
  const research = SPECIALIZATION_RESEARCH.training1;
  assert.notEqual(research.passiveSkillNodeId, null);
  const totalNodes = getResearchUpgradeTotal(research);
  const firstThresholdCount = Math.ceil(totalNodes * 0.25);
  let state = createEmptySpecializationState();

  const upgradeSequence = allNodeIds('training1');
  state = setResearchNodes(
    state,
    'cavalry',
    'training1',
    upgradeSequence.slice(0, firstThresholdCount - 1)
  );
  assert.equal(getResearchProgress(state, 'cavalry', 'training1').unlockedMilestones.length, 0);

  state = toggleResearchNode(
    state,
    'cavalry',
    'training1',
    upgradeSequence[firstThresholdCount - 1]
  );
  const atThreshold = getResearchProgress(state, 'cavalry', 'training1');
  assert.equal(atThreshold.completedNodes, firstThresholdCount);
  assert.equal(atThreshold.totalNodes, totalNodes);
  assert.deepEqual(
    atThreshold.unlockedMilestones.map((milestone) => milestone.percent),
    [25]
  );

  // Every regular upgrade bought, passive still missing.
  const regularOnly = setResearchNodes(
    state,
    'cavalry',
    'training1',
    upgradeSequence.filter((nodeId) => nodeId !== research.passiveSkillNodeId)
  );
  assert.equal(getResearchProgress(regularOnly, 'cavalry', 'training1').isComplete, false);
  const complete = toggleResearchNode(
    regularOnly,
    'cavalry',
    'training1',
    research.passiveSkillNodeId
  );
  const completed = getResearchProgress(complete, 'cavalry', 'training1');
  assert.equal(completed.isComplete, true);
  assert.equal(completed.passiveSelected, true);
  assert.deepEqual(
    completed.unlockedMilestones.map((milestone) => milestone.percent),
    [25, 50, 75, 100]
  );
});

test('column skill unlocks for free only after all four researches reach 100%', () => {
  const column = SPECIALIZATION_COLUMNS[1];
  assert.equal(column.researches.length, 4);
  let state = createEmptySpecializationState();

  for (const researchId of column.researches.slice(0, 3)) {
    state = completeResearch(state, 'footman', researchId);
  }
  const incomplete = getColumnProgress(state, 'footman', 1);
  assert.equal(incomplete.completedResearchCount, 3);
  assert.equal(incomplete.legionSkillUnlocked, false);
  assert.equal(incomplete.legionSkill, null);

  state = completeResearch(state, 'footman', column.researches[3]);
  const complete = getColumnProgress(state, 'footman', 1);
  assert.equal(complete.completedResearchCount, 4);
  assert.equal(complete.percent, 100);
  assert.equal(complete.legionSkillUnlocked, true);
  assert.equal(typeof complete.legionSkill.desc, 'string');
});

test('medal totals never estimate partial research cost', () => {
  const research = SPECIALIZATION_RESEARCH.training1;
  let state = toggleResearchNode(
    createEmptySpecializationState(),
    'archer',
    'training1',
    research.nodes[0].id
  );

  let medals = getSpecializationSummary(state).troops.archer.medals;
  assert.equal(medals.knownSpent, 0);
  assert.equal(medals.exactSpent, null);
  assert.equal(medals.unknownPartialCount, 1);
  assert.equal(medals.isExact, false);
  assert.equal(medals.coverage, 0);
  assert.equal(medals.coverageBasis, 'active-research');

  state = setResearchMedalsSpent(state, 'archer', 'training1', 137);
  medals = getSpecializationSummary(state).troops.archer.medals;
  assert.equal(medals.knownSpent, 137);
  assert.equal(medals.exactSpent, 137);
  assert.equal(medals.unknownPartialCount, 0);
  assert.equal(medals.coverage, 1);

  state = completeResearch(state, 'archer', 'training1');
  medals = getSpecializationSummary(state).troops.archer.medals;
  assert.equal(medals.knownSpent, research.cost);
  assert.equal(medals.completedResearchCount, 1);
});

test('clearing the last selected node also clears stale partial medal data', () => {
  const nodeId = SPECIALIZATION_RESEARCH.training1.nodes[0].id;
  let state = toggleResearchNode(createEmptySpecializationState(), 'footman', 'training1', nodeId);
  state = setResearchMedalsSpent(state, 'footman', 'training1', 25);
  state = toggleResearchNode(state, 'footman', 'training1', nodeId);

  assert.deepEqual(getResearchSelection(state, 'footman', 'training1'), {
    selectedNodeIds: [],
    medalsSpent: null,
  });
});

test('changing an active node selection invalidates its previously recorded exact medals', () => {
  const [firstNode, secondNode] = SPECIALIZATION_RESEARCH.training1.nodes;
  let state = setResearchNodes(createEmptySpecializationState(), 'cavalry', 'training1', [
    firstNode.id,
  ]);
  state = setResearchMedalsSpent(state, 'cavalry', 'training1', 250);

  state = setResearchNodes(state, 'cavalry', 'training1', [firstNode.id, secondNode.id]);

  assert.deepEqual(getResearchSelection(state, 'cavalry', 'training1'), {
    selectedNodeIds: [firstNode.id, secondNode.id],
    medalsSpent: null,
  });
  const medals = getSpecializationSummary(state).troops.cavalry.medals;
  assert.equal(medals.exactSpent, null);
  assert.equal(medals.unknownPartialCount, 1);
  assert.equal(medals.isExact, false);
});

test('reset helpers clear only the requested research or troop tower', () => {
  const training = SPECIALIZATION_RESEARCH.training1;
  const encounter = SPECIALIZATION_RESEARCH.encounter1;
  let state = toggleResearchNode(
    createEmptySpecializationState(),
    'footman',
    'training1',
    training.nodes[0].id
  );
  state = toggleResearchNode(state, 'footman', 'encounter1', encounter.nodes[0].id);
  state = toggleResearchNode(state, 'archer', 'training1', training.nodes[0].id);
  state = setResearchMedalsSpent(state, 'footman', 'training1', 1);

  const oneReset = resetResearch(state, 'footman', 'training1');
  assert.deepEqual(getResearchSelection(oneReset, 'footman', 'training1'), {
    selectedNodeIds: [],
    medalsSpent: null,
  });
  assert.equal(getResearchProgress(oneReset, 'footman', 'encounter1').completedNodes, 1);

  const towerReset = resetTower(oneReset, 'footman');
  assert.equal(getResearchProgress(towerReset, 'footman', 'encounter1').completedNodes, 0);
  assert.equal(getResearchProgress(towerReset, 'archer', 'training1').completedNodes, 1);
});

test('JSON parser round-trips, drops unknown optional fields, and normalizes deterministically', () => {
  const initial = toggleResearchNode(
    createEmptySpecializationState(),
    'cavalry',
    'training1',
    SPECIALIZATION_RESEARCH.training1.nodes[0].id
  );
  const raw = JSON.parse(serializeSpecializationState(initial));
  raw.futureTopLevel = { enabled: true };
  raw.troops.cavalry.futureTowerSetting = 'later';
  raw.troops.cavalry.researches.training1.futureResearchSetting = 25;
  raw.troops.cavalry.researches.futureResearch = { selectedNodeIds: [1] };

  const parsed = parseSpecializationState(JSON.stringify(raw));
  assert.equal('futureTopLevel' in parsed, false);
  assert.equal('futureTowerSetting' in parsed.troops.cavalry, false);
  assert.equal('futureResearchSetting' in parsed.troops.cavalry.researches.training1, false);
  assert.equal('futureResearch' in parsed.troops.cavalry.researches, false);
  assert.equal(serializeSpecializationState(parsed), serializeSpecializationState(initial));
});

test('parser rejects wrong envelopes, unsafe values, non-finite values, and oversized input', () => {
  const valid = JSON.parse(serializeSpecializationState(createEmptySpecializationState()));
  assert.throws(
    () => parseSpecializationState(JSON.stringify({ ...valid, schema: 'other' })),
    /Unsupported specialization schema/
  );
  assert.throws(
    () => parseSpecializationState(JSON.stringify({ ...valid, schemaVersion: 2 })),
    /schema version/
  );
  assert.throws(() => parseSpecializationState('{not-json'), /invalid/);
  assert.throws(
    () => parseSpecializationState(' '.repeat(SPECIALIZATION_STATE_MAX_JSON_LENGTH + 1)),
    /oversized/
  );
  assert.throws(
    () =>
      parseSpecializationState(
        `{"schema":"${SPECIALIZATION_STATE_SCHEMA}","schemaVersion":1,"__proto__":{},"troops":{}}`
      ),
    /unsafe key/
  );

  const direct = createEmptySpecializationState();
  const invalidNumber = {
    ...direct,
    troops: {
      ...direct.troops,
      footman: {
        researches: {
          ...direct.troops.footman.researches,
          training1: { selectedNodeIds: [], medalsSpent: Number.POSITIVE_INFINITY },
        },
      },
    },
  };
  assert.throws(() => buildSpecializationSnapshot(invalidNumber), /non-finite/);

  const unknownNode = JSON.parse(serializeSpecializationState(direct));
  unknownNode.troops.footman.researches.training1.selectedNodeIds = [999_999];
  assert.throws(() => parseSpecializationState(JSON.stringify(unknownNode)), /unknown node ID/);
});
