import { normalizeAllocation, validateTreeDefinition } from './preset-engine-model.js';
import {
  getNodeUpgradeCount,
  getResearchSelection,
  getResearchUpgradeTotal,
  setResearchNodes,
} from './specialization-towers-v2-model.js';
import { getSpecializationResearch } from './specialization-towers-v2-data.js';

export function buildSpecResearchTreeDefinition(research) {
  if (!research || typeof research !== 'object' || !Array.isArray(research.nodes)) return null;
  const researchId = String(research.id || research.name || '');
  if (!researchId) return null;
  const nodes = research.nodes.map((node) => ({
    id: String(node.id),
    name: String(node.name || `Node ${node.id}`),
    cost: 1,
    maxPoints: getNodeUpgradeCount(node),
    requirements: Array.isArray(node.prerequisiteNodeIds)
      ? node.prerequisiteNodeIds.map(String)
      : [],
  }));
  return validateTreeDefinition({
    treeId: `towers:${researchId}`,
    name: String(research.name || researchId),
    pointsPool: getResearchUpgradeTotal(research),
    nodes,
  });
}

export function buildTowersTreeDefinition(researchId) {
  const research = getSpecializationResearch(researchId);
  if (!research) return null;
  return buildSpecResearchTreeDefinition(research);
}

export function towersSelectionToAllocation(tree, selectedNodeIds) {
  const knownIds = new Set(tree.nodes.map((node) => node.id));
  const allocation = {};
  for (const nodeId of selectedNodeIds) {
    const id = String(nodeId);
    if (!knownIds.has(id)) continue;
    allocation[id] = (allocation[id] || 0) + 1;
  }
  return allocation;
}

export function towersAllocationToSelection(tree, allocation) {
  const normalized = normalizeAllocation(tree, allocation);
  const selection = [];
  for (const node of tree.nodes) {
    const points = normalized[node.id];
    for (let i = 0; i < points; i++) selection.push(Number(node.id));
  }
  return selection;
}

export function captureTowersPreset(state, troopId, researchId) {
  const tree = buildTowersTreeDefinition(researchId);
  if (!tree) return null;
  const selection = getResearchSelection(state, troopId, researchId);
  return {
    treeId: tree.treeId,
    name: tree.name,
    allocation: towersSelectionToAllocation(tree, selection.selectedNodeIds),
  };
}

export function applyTowersPreset(state, troopId, researchId, allocation) {
  const tree = buildTowersTreeDefinition(researchId);
  if (!tree) return null;
  const selection = towersAllocationToSelection(tree, allocation);
  return setResearchNodes(state, troopId, researchId, selection);
}
