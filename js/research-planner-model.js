import { techDatabase } from './tech-db.js';

export const PLANNER_SCHEMA = 'roc-vts.research-planner';
export const PLANNER_SCHEMA_VERSION = 1;

const VERIFIED_STATUSES = Object.freeze(['current', 'historical', 'unverified']);
const NODE_ACCESS_LEVELS = Object.freeze(['standard', 'paid', 'royal']);

export const PLANNER_COST_RESOURCES = Object.freeze([
  'resources',
  'wisdom',
  'courage',
  'warBadges',
  'gems',
  'timeSeconds',
]);

export function normalizeNodeAccess(value) {
  const access = String(value || 'standard');
  return NODE_ACCESS_LEVELS.includes(access) ? access : 'standard';
}

function emptyCosts(maxLevel) {
  const costs = {};
  for (const resource of PLANNER_COST_RESOURCES) costs[resource] = Array(maxLevel).fill(0);
  return costs;
}

function padCosts(values, maxLevel) {
  const padded = Array(maxLevel).fill(0);
  for (let i = 0; i < maxLevel && i < values.length; i++) {
    const value = Number(values[i]);
    padded[i] = Number.isFinite(value) ? value : 0;
  }
  return padded;
}

export function normalizeVerificationStatus(value) {
  const status = String(value || 'current');
  return VERIFIED_STATUSES.includes(status) ? status : 'current';
}

export function nodeTotal(costs) {
  return costs.reduce((sum, value) => sum + value, 0);
}

export function normalizeTechTree(tech) {
  if (!tech || typeof tech !== 'object' || !Array.isArray(tech.nodes)) return null;
  const familyId = String(tech.id || tech.name || '');
  if (!familyId) return null;
  const nodes = tech.nodes.map((node, index) => {
    const maxLevel = Number(node.maxLevel) > 0 ? Number(node.maxLevel) : 1;
    const costs = emptyCosts(maxLevel);
    const nodeWisdom = Array.isArray(node.wisdomCosts) ? node.wisdomCosts : [];
    const nodeCourage = Array.isArray(node.courageCosts) ? node.courageCosts : [];
    const nodeCosts = Array.isArray(node.costs) ? node.costs : [];
    if (node.costType === 'War Badge') {
      costs.warBadges = padCosts(nodeWisdom, maxLevel);
    } else if (node.costType === 'Dual' || node.costType === 'Courage') {
      costs.wisdom = padCosts(nodeWisdom, maxLevel);
      costs.courage = padCosts(nodeCourage, maxLevel);
      costs.resources = padCosts(nodeCosts, maxLevel);
    } else {
      costs.resources = padCosts(nodeCosts, maxLevel);
    }
    return Object.freeze({
      id: String(node.id || `${familyId}:node_${index + 1}`),
      name: String(node.name || node.id || `Node ${index + 1}`),
      troop: String(node.troop || 'ALL'),
      buff: String(node.buff || ''),
      maxLevel,
      costs,
      requirements: Object.freeze([]),
      requirementGroups: Object.freeze([]),
      verificationStatus: normalizeVerificationStatus(node.verificationStatus),
      access: normalizeNodeAccess(node.access),
    });
  });
  return Object.freeze({
    familyId,
    name: String(tech.name || familyId),
    season: String(tech.season || ''),
    source: 'tech-db',
    sourceNote: String(tech.unlockCondition || ''),
    nodes: Object.freeze(nodes),
    requirementStatus: 'none',
  });
}

export function resolvePositionalRelations(rawTree) {
  const subs = Array.isArray(rawTree?.subs) ? rawTree.subs : [];
  const positionToNode = new Map();
  const nodeIdByOrder = new Map();
  subs.forEach((sub, index) => {
    const id = String(sub?.gameNodeId || `${rawTree.id}:sub_${index + 1}`);
    nodeIdByOrder.set(index, id);
    const position = String(sub?.position || '').trim();
    if (/^\d+;\d+$/.test(position)) positionToNode.set(position, id);
  });

  let resolvedCount = 0;
  let relationPartCount = 0;
  const relationCount = subs.filter((sub) => typeof sub?.relation === 'string' && sub.relation.trim()).length;

  const requirementGroupsByNode = subs.map((sub, index) => {
    const raw = String(sub?.relation || '').trim();
    const groups = [];
    if (raw) {
      for (const part of raw.split('|')) {
        relationPartCount++;
        const target = positionToNode.get(part.trim());
        if (target) {
          groups.push(target);
          resolvedCount++;
        }
      }
    }
    return { index, groups };
  });

  return {
    positionToNode,
    nodeIdByOrder,
    requirementGroupsByNode,
    resolvedCount,
    relationCount,
    relationPartCount,
    requirementStatus:
      relationPartCount === 0 ? 'none' : resolvedCount === relationPartCount ? 'resolved' : 'partial',
  };
}

function normalizeTextField(value) {
  if (Array.isArray(value)) return value.map((part) => String(part || '')).filter(Boolean).join(', ');
  return String(value ?? '');
}

export function parseCodexResearchTree(raw) {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.subs)) return null;
  const resolution = resolvePositionalRelations(raw);
  const nodes = raw.subs.map((sub, index) => {
    const id = resolution.nodeIdByOrder.get(index) || String(sub?.gameNodeId || `${raw.id}:sub_${index + 1}`);
    const maxLevel = Number(sub?.lv) > 0 ? Number(sub?.lv) : 1;
    const rawCosts = Array.isArray(sub?.costs)
      ? sub.costs
      : String(sub?.costs || '')
          .trim()
          .split(/\s+/)
          .filter(Boolean);
    const levelCosts = rawCosts.map(Number).filter((value) => Number.isFinite(value) && value >= 0);
    const costs = emptyCosts(maxLevel);
    const padded = padCosts(levelCosts, maxLevel);
    if (sub?.mc === 'WB' || raw?.medalType === 'WB') {
      costs.warBadges = padded;
    } else {
      costs.resources = padded;
    }
    const groups = resolution.requirementGroupsByNode[index]?.groups || [];
    return Object.freeze({
      id,
      name: String(sub?.n || `Node ${index + 1}`),
      troop: normalizeTextField(sub?.t) || 'ALL',
      buff: normalizeTextField(sub?.a),
      maxLevel,
      costs,
      requirements: Object.freeze([]),
      requirementGroups: Object.freeze(groups.map((groupId) => Object.freeze([groupId]))),
      verificationStatus: sub?.verificationStatus
        ? normalizeVerificationStatus(sub.verificationStatus)
        : 'unverified',
      access: normalizeNodeAccess(sub?.access),
      gameNodeId: sub?.gameNodeId ? String(sub.gameNodeId) : '',
      sourceTotal: Number(sub?.total) || 0,
    });
  });
  const statedWarBadges = nodes.reduce((sum, node) => sum + (node.sourceTotal || 0), 0);
  return Object.freeze({
    familyId: String(raw.id || raw.name || 'codex-tree'),
    name: String(raw.name || raw.id || ''),
    season: String(raw.season || ''),
    source: 'codex',
    sourceNote: String(raw.sourceNote || raw.note || ''),
    statedTotal: Object.freeze({ warBadges: statedWarBadges }),
    nodes: Object.freeze(nodes),
    requirementStatus: resolution.requirementStatus,
  });
}

export function codexResearchNodeList(codexStore) {
  const nodes = codexStore?.datasets?.['research-costs'];
  return Array.isArray(nodes) ? nodes : [];
}

export function listCodexResearchTrees(codexStore) {
  const trees = new Map();
  for (const node of codexResearchNodeList(codexStore)) {
    const treeName = String(node?.treeName || '');
    if (!treeName || trees.has(treeName)) continue;
    trees.set(treeName, String(node?.season || ''));
  }
  return [...trees.entries()].map(([name, season]) =>
    Object.freeze({ familyId: name, name, season })
  );
}

export function familyFromCodexNodes(codexStore, treeName) {
  const nodes = codexResearchNodeList(codexStore).filter(
    (node) => String(node?.treeName || '') === String(treeName)
  );
  if (!nodes.length) return null;
  const mapped = nodes.map((node, index) => {
    const maxLevel = Number(node?.maxLevel) > 0 ? Number(node.maxLevel) : 1;
    const costs = emptyCosts(maxLevel);
    const fill = (key) =>
      padCosts(Array.isArray(node?.costs?.[key]) ? node.costs[key] : [], maxLevel);
    costs.resources = fill('resources');
    costs.warBadges = fill('warBadges');
    costs.courage = fill('courageMedals');
    costs.gems = fill('gems');
    costs.timeSeconds = fill('timeSeconds');
    const groups = (Array.isArray(node?.requirementGroups) ? node.requirementGroups : [])
      .filter((group) => Array.isArray(group) && group.length)
      .map((group) => Object.freeze(group.map(String)));
    return Object.freeze({
      id: String(node?.nodeId || `${treeName}:node_${index + 1}`),
      name: String(node?.name || `Node ${index + 1}`),
      troop: normalizeTextField(node?.troop) || 'ALL',
      buff: '',
      maxLevel,
      costs,
      requirements: Object.freeze([]),
      requirementGroups: Object.freeze(groups),
      verificationStatus: normalizeVerificationStatus(
        node?.verificationStatus || node?.provenance?.verificationStatus
      ),
      access: normalizeNodeAccess(node?.access),
      gameNodeId: node?.nodeId ? String(node.nodeId) : '',
      sourceTotal: Number(node?.totalMedals) || 0,
      sourceCredit: String(node?.sourceCredit || node?.provenance?.credit || ''),
    });
  });
  return Object.freeze({
    familyId: String(treeName),
    name: String(treeName),
    season: String(nodes[0]?.season || ''),
    source: 'codex',
    sourceNote: String(nodes[0]?.provenance?.source || ''),
    statedTotal: Object.freeze({ warBadges: 0 }),
    nodes: Object.freeze(mapped),
    requirementStatus: mapped.some((node) => node.requirementGroups.length) ? 'resolved' : 'none',
  });
}

export function verifyTreeStatedTotal(family, resource = 'warBadges') {
  return family.statedTotal?.[resource] ?? 0;
}

export function verifyTreeTotal(family, resource = 'warBadges') {
  let computed = 0;
  for (const node of family.nodes) {
    computed += nodeTotal(node.costs[resource] || []);
  }
  return computed;
}

export function buildPrerequisiteGraph(family) {
  const requirementsById = new Map();
  const orphans = [];
  for (const node of family.nodes) {
    const flat = node.requirementGroups.flatMap((group) => group);
    requirementsById.set(node.id, Object.freeze([...new Set(flat)]));
  }
  const known = new Set(family.nodes.map((node) => node.id));
  for (const node of family.nodes) {
    const requirements = requirementsById.get(node.id) || [];
    if (requirements.some((id) => !known.has(id))) orphans.push(node.id);
  }
  const visiting = new Set();
  const visited = new Set();
  const cycles = [];
  const visit = (id, path) => {
    if (visited.has(id)) return;
    if (visiting.has(id)) {
      const start = path.indexOf(id);
      if (start >= 0) cycles.push(path.slice(start).concat(id));
      return;
    }
    visiting.add(id);
    for (const next of requirementsById.get(id) || []) {
      visit(next, path.concat(id));
    }
    visiting.delete(id);
    visited.add(id);
  };
  for (const node of family.nodes) visit(node.id, []);
  return Object.freeze({
    requirementsById: Object.freeze(
      Object.fromEntries([...requirementsById.entries()].map(([id, list]) => [id, Object.freeze(list)]))
    ),
    orphans: Object.freeze(orphans),
    cycles: Object.freeze(cycles.map((cycle) => Object.freeze(cycle))),
  });
}

export function collectRequiredNodes(family, targetNodeId) {
  const nodesById = new Map(family.nodes.map((node) => [node.id, node]));
  const required = new Map();
  const visit = (id, depth) => {
    if (!nodesById.has(id) || depth > 64) return;
    const node = nodesById.get(id);
    const groups = node.requirementGroups.filter((group) => group.length);
    if (groups.length) {
      let cheapest = groups[0];
      let cheapestCost = Infinity;
      for (const group of groups) {
        const cost = group.reduce((sum, groupId) => {
          const groupNode = nodesById.get(groupId);
          const levels = groupNode ? groupNode.costs.warBadges : [0];
          return sum + (levels[0] || 0);
        }, 0);
        if (cost < cheapestCost) {
          cheapest = group;
          cheapestCost = cost;
        }
      }
      for (const groupId of cheapest) {
        if (!required.has(groupId)) {
          required.set(groupId, 1);
          visit(groupId, depth + 1);
        }
      }
    }
  };
  if (nodesById.has(targetNodeId)) visit(targetNodeId, 0);
  return required;
}

export function computeMinUnlockPath(family, targetNodeId, targetLevel = 1) {
  const nodesById = new Map(family.nodes.map((node) => [node.id, node]));
  const target = nodesById.get(targetNodeId);
  if (!target) return null;
  const level = Math.min(Math.max(Number(targetLevel) || 1, 1), target.maxLevel);
  const required = collectRequiredNodes(family, targetNodeId);
  const nodeLevels = { [targetNodeId]: level };
  for (const id of required.keys()) {
    nodeLevels[id] = Math.max(nodeLevels[id] || 0, 1);
  }
  const totals = computePlanCosts(family, nodeLevels);
  return Object.freeze({
    mode: 'min-unlock',
    nodeLevels: Object.freeze(nodeLevels),
    totals,
    requiredCount: required.size,
    target: Object.freeze({ nodeId: targetNodeId, level }),
  });
}

export function computeFullPath(family) {
  const nodeLevels = {};
  for (const node of family.nodes) nodeLevels[node.id] = node.maxLevel;
  return Object.freeze({
    mode: 'full',
    nodeLevels: Object.freeze(nodeLevels),
    totals: computePlanCosts(family, nodeLevels),
    requiredCount: family.nodes.length,
    target: null,
  });
}

export function computePlanCosts(family, nodeLevels) {
  const totals = {};
  for (const resource of PLANNER_COST_RESOURCES) totals[resource] = 0;
  for (const node of family.nodes) {
    const level = Math.min(Math.max(Number(nodeLevels[node.id]) || 0, 0), node.maxLevel);
    if (!level) continue;
    for (const resource of PLANNER_COST_RESOURCES) {
      const costs = node.costs[resource] || [];
      for (let i = 0; i < level; i++) totals[resource] += costs[i] || 0;
    }
  }
  return Object.freeze(totals);
}

export function computeRemainingCosts(family, currentLevels, plan) {
  const totals = {};
  for (const resource of PLANNER_COST_RESOURCES) totals[resource] = 0;
  let verified = true;
  for (const node of family.nodes) {
    const target = Math.min(Math.max(Number(plan.nodeLevels[node.id]) || 0, 0), node.maxLevel);
    const current = Math.min(Math.max(Number(currentLevels?.[node.id]) || 0, 0), node.maxLevel);
    if (target <= current) continue;
    if (node.verificationStatus !== 'current') verified = false;
    for (const resource of PLANNER_COST_RESOURCES) {
      const costs = node.costs[resource] || [];
      for (let i = current; i < target; i++) totals[resource] += costs[i] || 0;
    }
  }
  return Object.freeze({ totals: Object.freeze(totals), verified });
}

export function listMilestones(family, plan) {
  return family.nodes
    .filter((node) => (plan.nodeLevels[node.id] || 0) >= node.maxLevel)
    .map((node) => Object.freeze({ nodeId: node.id, name: node.name, buff: node.buff }));
}

export function suggestNextBest(family, currentLevels, metric = 'cheapest-next') {
  const nodesById = new Map(family.nodes.map((node) => [node.id, node]));
  const candidates = [];
  for (const node of family.nodes) {
    const current = Math.min(Math.max(Number(currentLevels?.[node.id]) || 0, 0), node.maxLevel);
    if (current >= node.maxLevel) continue;
    const requirementsMet = (node.requirementGroups.flatMap((group) => group).length === 0 ||
      [...new Set(node.requirementGroups.flatMap((group) => group))].every((id) => {
        const required = nodesById.get(id);
        return required && (Number(currentLevels?.[id]) || 0) > 0;
      }));
    if (!requirementsMet) continue;
    let score = 0;
    if (metric === 'war-badges-next') score = node.costs.warBadges[current] || 0;
    else if (metric === 'closest-to-max') score = node.maxLevel - current;
    else score = PLANNER_COST_RESOURCES.reduce(
      (sum, resource) => sum + (node.costs[resource][current] || 0),
      0
    );
    candidates.push({ nodeId: node.id, score });
  }
  candidates.sort((a, b) => a.score - b.score || a.nodeId.localeCompare(b.nodeId));
  return candidates.map((candidate) => candidate.nodeId);
}

export function getPlannerFamily(familyId) {
  const tech = techDatabase.find((candidate) => candidate.id === familyId);
  if (tech) return normalizeTechTree(tech);
  return null;
}

export function listPlannerFamilies() {
  return techDatabase.map((tech) => {
    const family = normalizeTechTree(tech);
    return Object.freeze({ familyId: family.familyId, name: family.name, season: family.season });
  });
}

export function normalizePlannerSnapshot(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const plans = Array.isArray(value.plans) ? value.plans : [];
  return {
    schema: PLANNER_SCHEMA,
    schemaVersion: PLANNER_SCHEMA_VERSION,
    savedAt: Number(value.savedAt) || Date.now(),
    plans: plans
      .filter((plan) => plan && typeof plan === 'object' && !Array.isArray(plan))
      .filter((plan) => String(plan.familyId || ''))
      .slice(0, 100)
      .map((plan) => ({
        familyId: String(plan.familyId || ''),
        mode: plan.mode === 'full' ? 'full' : 'min-unlock',
        targetNodeId: String(plan.targetNodeId || ''),
        targetLevel: Math.max(Number(plan.targetLevel) || 1, 1),
        currentLevels: plan.currentLevels && typeof plan.currentLevels === 'object' ? { ...plan.currentLevels } : {},
      })),
  };
}

export function serializePlannerSnapshot(state, space = 0) {
  return JSON.stringify(normalizePlannerSnapshot(state), null, space);
}

export function parsePlannerSnapshot(jsonText) {
  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new TypeError('Research planner state is not valid JSON.');
  }
  const normalized = normalizePlannerSnapshot(parsed);
  if (!normalized) throw new TypeError('Research planner state has an unsupported shape.');
  return normalized;
}
