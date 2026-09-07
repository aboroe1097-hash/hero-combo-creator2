export const PRESET_PAYLOAD_SCHEMA = 'roc-vts.preset';
export const PRESET_PAYLOAD_VERSION = 1;

export function validateTreeDefinition(def) {
  if (!def || typeof def !== 'object' || Array.isArray(def)) {
    throw new TypeError('Preset tree must be an object.');
  }
  if (!String(def.treeId || '')) throw new TypeError('Preset tree requires a treeId.');
  if (!Array.isArray(def.nodes) || def.nodes.length === 0) {
    throw new TypeError(`Preset tree "${def.treeId}" requires at least one node.`);
  }
  const pointsPool = Number(def.pointsPool);
  if (!Number.isFinite(pointsPool) || pointsPool < 0) {
    throw new TypeError(`Preset tree "${def.treeId}" has an invalid pointsPool.`);
  }
  const seen = new Set();
  for (const node of def.nodes) {
    if (!node || typeof node !== 'object') {
      throw new TypeError(`Preset tree "${def.treeId}" has a non-object node.`);
    }
    const id = String(node.id || '');
    if (!id) throw new TypeError(`Preset tree "${def.treeId}" has a node without an id.`);
    if (seen.has(id)) throw new TypeError(`Preset tree "${def.treeId}" duplicates node "${id}".`);
    seen.add(id);
    if (!(Number(node.maxPoints) >= 0)) {
      throw new TypeError(`Preset tree "${def.treeId}" node "${id}" has an invalid maxPoints.`);
    }
  }
  for (const node of def.nodes) {
    for (const requirement of Array.isArray(node.requirements) ? node.requirements : []) {
      if (!seen.has(String(requirement))) {
        throw new TypeError(
          `Preset tree "${def.treeId}" node "${node.id}" requires unknown node "${requirement}".`
        );
      }
    }
  }
  return Object.freeze({
    treeId: String(def.treeId),
    name: String(def.name || def.treeId),
    pointsPool,
    nodes: Object.freeze(
      def.nodes.map((node) =>
        Object.freeze({
          id: String(node.id),
          name: String(node.name || node.id),
          cost: Number(node.cost) >= 0 ? Number(node.cost) : 0,
          maxPoints: Number(node.maxPoints) >= 0 ? Number(node.maxPoints) : 0,
          requirements: Object.freeze(
            (Array.isArray(node.requirements) ? node.requirements : []).map(String)
          ),
        })
      )
    ),
    presets: Object.freeze(
      Array.isArray(def.presets)
        ? def.presets.map((preset) =>
            Object.freeze({
              id: String(preset.id || preset.name || ''),
              name: String(preset.name || preset.id || ''),
              allocation: { ...(preset.allocation || {}) },
            })
          )
        : []
    ),
    checkpoints: Object.freeze(
      Array.isArray(def.checkpoints)
        ? def.checkpoints.map((checkpoint) =>
            Object.freeze({
              id: String(checkpoint.id || checkpoint.name || ''),
              name: String(checkpoint.name || checkpoint.id || ''),
              require: { ...(checkpoint.require || {}) },
            })
          )
        : []
    ),
  });
}

export function createEmptyAllocation(tree) {
  const allocation = {};
  for (const node of tree.nodes) allocation[node.id] = 0;
  return allocation;
}

export function normalizeAllocation(tree, allocation) {
  const normalized = createEmptyAllocation(tree);
  const source = allocation && typeof allocation === 'object' && !Array.isArray(allocation) ? allocation : {};
  for (const [id, value] of Object.entries(source)) {
    if (!Object.hasOwn(normalized, id)) {
      throw new TypeError(`Preset tree "${tree.treeId}" has no node "${id}".`);
    }
    const points = Number(value);
    if (!Number.isFinite(points) || points < 0) {
      throw new TypeError(`Preset tree "${tree.treeId}" node "${id}" has invalid points.`);
    }
    normalized[id] = Math.floor(points);
  }
  for (const node of tree.nodes) {
    if (normalized[node.id] > node.maxPoints) {
      throw new TypeError(
        `Preset tree "${tree.treeId}" node "${node.id}" exceeds maxPoints ${node.maxPoints}.`
      );
    }
  }
  return normalized;
}

export function computeAllocationSummary(tree, allocation) {
  const normalized = normalizeAllocation(tree, allocation);
  const perNode = tree.nodes.map((node) => {
    const points = normalized[node.id];
    return Object.freeze({
      nodeId: node.id,
      points,
      cost: node.cost * points,
    });
  });
  const spent = perNode.reduce((sum, entry) => sum + entry.cost, 0);
  return Object.freeze({
    spent,
    pool: tree.pointsPool,
    remaining: Math.max(0, tree.pointsPool - spent),
    perNode: Object.freeze(perNode),
  });
}

export function findRequirementViolations(tree, allocation) {
  const normalized = normalizeAllocation(tree, allocation);
  const violations = [];
  for (const node of tree.nodes) {
    if (normalized[node.id] <= 0) continue;
    for (const requirement of node.requirements) {
      if ((normalized[requirement] || 0) <= 0) {
        violations.push({ nodeId: node.id, requires: requirement });
      }
    }
  }
  return Object.freeze(violations);
}

export function buildPresetPayload(tree, allocation, name = '') {
  const normalized = normalizeAllocation(tree, allocation);
  const payload = {
    schema: PRESET_PAYLOAD_SCHEMA,
    version: PRESET_PAYLOAD_VERSION,
    treeId: tree.treeId,
    name: String(name || '').slice(0, 120),
    allocation: normalized,
  };
  return Object.freeze({ ...payload, allocation: Object.freeze({ ...payload.allocation }) });
}

export function parsePresetPayload(tree, payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new TypeError('Preset payload must be an object.');
  }
  if (payload.schema !== PRESET_PAYLOAD_SCHEMA || payload.version !== PRESET_PAYLOAD_VERSION) {
    throw new TypeError('Preset payload has an unsupported schema version.');
  }
  if (String(payload.treeId) !== tree.treeId) {
    throw new TypeError(
      `Preset payload targets tree "${payload.treeId}", expected "${tree.treeId}".`
    );
  }
  return {
    name: String(payload.name || '').slice(0, 120),
    allocation: normalizeAllocation(tree, payload.allocation),
  };
}

export function compareAllocations(tree, allocationA, allocationB) {
  const a = normalizeAllocation(tree, allocationA);
  const b = normalizeAllocation(tree, allocationB);
  const perNode = tree.nodes.map((node) =>
    Object.freeze({
      nodeId: node.id,
      a: a[node.id],
      b: b[node.id],
      delta: b[node.id] - a[node.id],
    })
  );
  const checkpoints = tree.checkpoints.map((checkpoint) => {
    const required = Object.entries(checkpoint.require);
    const met = (allocation) =>
      required.every(([nodeId, points]) => (allocation[nodeId] || 0) >= Number(points));
    return Object.freeze({
      id: checkpoint.id,
      name: checkpoint.name,
      required: Object.freeze({ ...checkpoint.require }),
      metA: met(a),
      metB: met(b),
    });
  });
  return Object.freeze({ perNode: Object.freeze(perNode), checkpoints: Object.freeze(checkpoints) });
}
