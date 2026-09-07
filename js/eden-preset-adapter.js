import { buildSpecResearchTreeDefinition } from './specialization-towers-v2-preset-adapter.js';
import { normalizeAllocation } from './preset-engine-model.js';

export function buildEdenTreeDefinition(research) {
  return buildSpecResearchTreeDefinition(research);
}

export function edenAllocationToNodeIds(tree, allocation) {
  const normalized = normalizeAllocation(tree, allocation);
  const nodeIds = [];
  for (const node of tree.nodes) {
    if (normalized[node.id] > 0) nodeIds.push(Number(node.id));
  }
  return nodeIds;
}

export function edenNodeIdsToAllocation(tree, nodeIds) {
  const knownIds = new Set(tree.nodes.map((node) => node.id));
  const allocation = {};
  for (const nodeId of nodeIds) {
    const id = String(nodeId);
    if (!knownIds.has(id)) continue;
    allocation[id] = 1;
  }
  return allocation;
}
