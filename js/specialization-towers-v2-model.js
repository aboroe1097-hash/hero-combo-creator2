import {
  SPECIALIZATION_COLUMNS,
  SPECIALIZATION_DATA_REVISION,
  SPECIALIZATION_LEGION_SKILLS,
  SPECIALIZATION_RESEARCH,
  SPECIALIZATION_TROOPS,
  getSpecializationResearch,
} from './specialization-towers-v2-data.js';

export const SPECIALIZATION_STATE_SCHEMA = 'roc-vts.specialization-towers';
export const SPECIALIZATION_STATE_SCHEMA_VERSION = 1;
export const SPECIALIZATION_STATE_MAX_JSON_LENGTH = 1_000_000;

const MAX_STRUCTURE_DEPTH = 12;
const MAX_STRUCTURE_ENTRIES = 10_000;
const MAX_SELECTED_NODE_IDS = 5_000;
const MAX_MEDALS_SPENT = 1_000_000_000;
const UNSAFE_KEYS = new Set(['__proto__', 'prototype', 'constructor']);
const NORMALIZED_STATES = new WeakSet();

function compareStableStrings(left, right) {
  const leftText = String(left);
  const rightText = String(right);
  if (leftText < rightText) return -1;
  if (leftText > rightText) return 1;
  return 0;
}

const RESEARCH_IDS = Object.freeze(
  Object.values(SPECIALIZATION_RESEARCH)
    .slice()
    .sort(
      (left, right) =>
        Number(left.column) - Number(right.column) ||
        Number(left.sequence) - Number(right.sequence) ||
        compareStableStrings(left.id, right.id)
    )
    .map((research) => research.id)
);

const COLUMN_IDS = Object.freeze(
  Object.keys(SPECIALIZATION_COLUMNS)
    .map(Number)
    .sort((left, right) => left - right)
);

function requireRecord(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object.`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError(`${label} must be a plain object.`);
  }
  return value;
}

function assertSafeStructure(value, label = 'Specialization state') {
  let entryCount = 0;

  function visit(candidate, depth) {
    if (depth > MAX_STRUCTURE_DEPTH) {
      throw new RangeError(`${label} is nested too deeply.`);
    }
    if (typeof candidate === 'number' && !Number.isFinite(candidate)) {
      throw new TypeError(`${label} contains a non-finite number.`);
    }
    if (typeof candidate === 'string' && candidate.length > SPECIALIZATION_STATE_MAX_JSON_LENGTH) {
      throw new RangeError(`${label} contains an oversized string.`);
    }
    if (!candidate || typeof candidate !== 'object') return;

    if (Array.isArray(candidate)) {
      entryCount += candidate.length;
      if (entryCount > MAX_STRUCTURE_ENTRIES) {
        throw new RangeError(`${label} contains too many entries.`);
      }
      for (const item of candidate) visit(item, depth + 1);
      return;
    }

    requireRecord(candidate, label);
    const entries = Object.entries(candidate);
    entryCount += entries.length;
    if (entryCount > MAX_STRUCTURE_ENTRIES) {
      throw new RangeError(`${label} contains too many entries.`);
    }
    for (const [key, item] of entries) {
      if (UNSAFE_KEYS.has(key)) {
        throw new TypeError(`${label} contains unsafe key "${key}".`);
      }
      visit(item, depth + 1);
    }
  }

  visit(value, 0);
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

function requireTroopId(troopId) {
  if (typeof troopId !== 'string' || !SPECIALIZATION_TROOPS.includes(troopId)) {
    throw new RangeError(
      `Unknown specialization troop "${String(troopId)}". Expected one of: ${SPECIALIZATION_TROOPS.join(', ')}.`
    );
  }
  return troopId;
}

function requireResearch(researchId) {
  const research = getSpecializationResearch(researchId);
  if (!research) {
    throw new RangeError(`Unknown specialization research "${String(researchId)}".`);
  }
  return research;
}

function getSelectableNodeIds(research) {
  const ids = research.nodes.map((node) => node.id);
  if (research.passiveSkillNodeId !== null && research.passiveSkillNodeId !== undefined) {
    ids.push(research.passiveSkillNodeId);
  }
  return ids;
}

export const SPECIALIZATION_NODE_ACCESS_STATES = Object.freeze({
  learned: 'learned',
  available: 'available',
  locked: 'locked',
  hidden: 'hidden',
});

function getResearchNodeDefinitions(research) {
  const nodes = research.nodes.map((node) => ({ ...node, passive: false }));
  if (research.passiveSkillNodeId !== null && research.passiveSkillNodeId !== undefined) {
    nodes.push({ id: research.passiveSkillNodeId, passive: true });
  }
  return nodes;
}

/**
 * How many upgrades a node takes in game. The base-attribute nodes (Frenzy
 * Fighter, Tough Armor, Energetic) take two; everything else takes one. Progress
 * is counted in upgrades rather than node icons, so a research with a
 * base-attribute node is not complete until both of its upgrades are bought.
 */
export function getNodeUpgradeCount(node) {
  return node?.context === 'baseAttributes' ? 2 : 1;
}

function getUpgradeCounts(research) {
  const counts = new Map();
  getResearchNodeDefinitions(research).forEach((node) => {
    counts.set(node.id, getNodeUpgradeCount(node));
  });
  return counts;
}

export function getResearchUpgradeTotal(research) {
  let total = 0;
  getUpgradeCounts(research).forEach((count) => {
    total += count;
  });
  return total;
}

/** Levels held per node id. A selection lists a node once per bought upgrade. */
function countSelectedLevels(selectedNodeIds) {
  const levels = new Map();
  selectedNodeIds.forEach((nodeId) => levels.set(nodeId, (levels.get(nodeId) || 0) + 1));
  return levels;
}

/**
 * Derives presentation-only node access from canonical evidence. Missing prerequisite
 * metadata is never treated as an inferred edge. A research explicitly marked as
 * partial evidence hides those unverified nodes until their reveal rule is confirmed;
 * legacy researches remain freely selectable.
 */
export function deriveResearchNodeAccess(research, selectedNodeIds = []) {
  if (!research || typeof research !== 'object' || !Array.isArray(research.nodes)) {
    throw new TypeError('Research node access requires a research record.');
  }
  if (!Array.isArray(selectedNodeIds)) {
    throw new TypeError('Research node access selectedNodeIds must be an array.');
  }

  const levels = countSelectedLevels(selectedNodeIds);
  const upgradeCounts = getUpgradeCounts(research);
  // A node counts as a satisfied prerequisite once it is fully upgraded.
  const selected = new Set(
    [...levels.entries()]
      .filter(([nodeId, level]) => level >= (upgradeCounts.get(nodeId) || 1))
      .map(([nodeId]) => nodeId)
  );
  const partialEvidence = research.progressiveReveal?.status === 'partial-evidence';
  const entries = getResearchNodeDefinitions(research).map((node) => {
    const maxLevel = upgradeCounts.get(node.id) || 1;
    const level = Math.min(levels.get(node.id) || 0, maxLevel);
    const learned = level >= maxLevel;
    const hasExplicitPrerequisites = Array.isArray(node.prerequisiteNodeIds);
    const prerequisitesSatisfied =
      hasExplicitPrerequisites &&
      node.prerequisiteNodeIds.every((prerequisiteId) => selected.has(prerequisiteId));

    let state = SPECIALIZATION_NODE_ACCESS_STATES.available;
    let visible = true;
    let selectable = true;

    if (learned) {
      state = SPECIALIZATION_NODE_ACCESS_STATES.learned;
    } else if (hasExplicitPrerequisites && prerequisitesSatisfied) {
      state = SPECIALIZATION_NODE_ACCESS_STATES.available;
    } else if (hasExplicitPrerequisites) {
      visible = node.visibleWhenLocked === true;
      selectable = false;
      state = visible
        ? SPECIALIZATION_NODE_ACCESS_STATES.locked
        : SPECIALIZATION_NODE_ACCESS_STATES.hidden;
    } else if (partialEvidence) {
      visible = node.visibleWhenLocked === true;
      selectable = false;
      state = visible
        ? SPECIALIZATION_NODE_ACCESS_STATES.locked
        : SPECIALIZATION_NODE_ACCESS_STATES.hidden;
    }

    return Object.freeze({
      nodeId: node.id,
      passive: node.passive,
      state,
      visible,
      selectable,
      selected: learned,
      level,
      maxLevel,
      prerequisitesVerified: hasExplicitPrerequisites,
      prerequisiteNodeIds: hasExplicitPrerequisites ? node.prerequisiteNodeIds.slice() : null,
      pathBranch: typeof node.pathBranch === 'string' ? node.pathBranch : null,
    });
  });

  const counts = Object.freeze(
    Object.fromEntries(
      Object.values(SPECIALIZATION_NODE_ACCESS_STATES).map((state) => [
        state,
        entries.filter((entry) => entry.state === state).length,
      ])
    )
  );

  return Object.freeze({
    mode: partialEvidence ? 'partial-evidence' : 'unrestricted',
    entries: Object.freeze(entries),
    counts,
    hiddenCount: counts.hidden,
    hasUnverifiedPath: partialEvidence && entries.some((entry) => !entry.prerequisitesVerified),
  });
}

export function removeResearchNodeAndDependents(research, selectedNodeIds, nodeId) {
  if (!research || typeof research !== 'object' || !Array.isArray(research.nodes)) {
    throw new TypeError('Dependent node removal requires a research record.');
  }
  if (!Array.isArray(selectedNodeIds)) {
    throw new TypeError('Dependent node removal selectedNodeIds must be an array.');
  }

  const selected = new Set(selectedNodeIds);
  const removed = new Set([nodeId]);
  selected.delete(nodeId);

  let changed = true;
  while (changed) {
    changed = false;
    for (const node of getResearchNodeDefinitions(research)) {
      if (!selected.has(node.id) || !Array.isArray(node.prerequisiteNodeIds)) continue;
      if (!node.prerequisiteNodeIds.some((prerequisiteId) => removed.has(prerequisiteId))) {
        continue;
      }
      selected.delete(node.id);
      removed.add(node.id);
      changed = true;
    }
  }

  // Survivors keep every upgrade level they held; only dropped nodes lose theirs.
  const levels = countSelectedLevels(selectedNodeIds);
  const kept = [];
  getSelectableNodeIds(research).forEach((candidateId) => {
    if (!selected.has(candidateId)) return;
    const held = levels.get(candidateId) || 1;
    for (let index = 0; index < held; index += 1) kept.push(candidateId);
  });
  return kept;
}

function normalizeSelectedNodeIds(value, research, label) {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new TypeError(`${label} selectedNodeIds must be an array.`);
  if (value.length > MAX_SELECTED_NODE_IDS) {
    throw new RangeError(`${label} selectedNodeIds is oversized.`);
  }

  const selectableIds = getSelectableNodeIds(research);
  const selectableSet = new Set(selectableIds);
  const upgradeCounts = getUpgradeCounts(research);
  const levels = new Map();
  for (const nodeId of value) {
    if (!Number.isSafeInteger(nodeId) || nodeId < 0) {
      throw new TypeError(`${label} node IDs must be non-negative safe integers.`);
    }
    if (!selectableSet.has(nodeId)) {
      throw new RangeError(`${label} contains unknown node ID ${nodeId}.`);
    }
    levels.set(nodeId, (levels.get(nodeId) || 0) + 1);
  }
  // A node appears once per bought upgrade, clamped to what it can hold, and
  // always in node order so the stored shape stays canonical.
  const normalized = [];
  selectableIds.forEach((nodeId) => {
    const held = Math.min(levels.get(nodeId) || 0, upgradeCounts.get(nodeId) || 1);
    for (let index = 0; index < held; index += 1) normalized.push(nodeId);
  });
  return normalized;
}

function normalizeMedalsSpent(value, research, label) {
  if (value === undefined || value === null) return undefined;
  if (!Number.isSafeInteger(value) || value < 0 || value > MAX_MEDALS_SPENT) {
    throw new TypeError(`${label} medalsSpent must be a non-negative safe integer.`);
  }
  if (Number.isFinite(research.cost) && value > research.cost) {
    throw new RangeError(`${label} medalsSpent cannot exceed the full research cost.`);
  }
  return value;
}

function normalizeResearchState(value, research, label) {
  const source = value === undefined ? {} : requireRecord(value, label);
  const selectedNodeIds = normalizeSelectedNodeIds(source.selectedNodeIds, research, label);
  const normalized = {
    selectedNodeIds,
  };
  const medalsSpent = normalizeMedalsSpent(source.medalsSpent, research, label);
  if (selectedNodeIds.length > 0 && medalsSpent !== undefined) {
    normalized.medalsSpent = medalsSpent;
  }
  return normalized;
}

function normalizeState(rawState, { requireEnvelope = true } = {}) {
  const source = requireRecord(rawState, 'Specialization state');
  assertSafeStructure(source);

  if (requireEnvelope) {
    if (source.schema !== SPECIALIZATION_STATE_SCHEMA) {
      throw new RangeError(
        `Unsupported specialization schema "${String(source.schema)}". Expected "${SPECIALIZATION_STATE_SCHEMA}".`
      );
    }
    if (source.schemaVersion !== SPECIALIZATION_STATE_SCHEMA_VERSION) {
      throw new RangeError(
        `Unsupported specialization schema version "${String(source.schemaVersion)}". Expected version ${SPECIALIZATION_STATE_SCHEMA_VERSION}.`
      );
    }
  }

  if (source.dataRevision !== undefined && typeof source.dataRevision !== 'string') {
    throw new TypeError('Specialization dataRevision must be a string when provided.');
  }

  const rawTroops = source.troops === undefined ? {} : requireRecord(source.troops, 'Troops');
  const troops = {};
  for (const troopId of SPECIALIZATION_TROOPS) {
    const rawTroop =
      rawTroops[troopId] === undefined ? {} : requireRecord(rawTroops[troopId], troopId);
    const rawResearches =
      rawTroop.researches === undefined
        ? {}
        : requireRecord(rawTroop.researches, `${troopId} researches`);
    const researches = {};
    for (const researchId of RESEARCH_IDS) {
      const research = SPECIALIZATION_RESEARCH[researchId];
      researches[researchId] = normalizeResearchState(
        rawResearches[researchId],
        research,
        `${troopId} ${researchId}`
      );
    }
    troops[troopId] = { researches };
  }

  const normalized = deepFreeze({
    schema: SPECIALIZATION_STATE_SCHEMA,
    schemaVersion: SPECIALIZATION_STATE_SCHEMA_VERSION,
    dataRevision: SPECIALIZATION_DATA_REVISION,
    troops,
  });
  NORMALIZED_STATES.add(normalized);
  return normalized;
}

function createRawEmptyState() {
  return {
    schema: SPECIALIZATION_STATE_SCHEMA,
    schemaVersion: SPECIALIZATION_STATE_SCHEMA_VERSION,
    dataRevision: SPECIALIZATION_DATA_REVISION,
    troops: Object.fromEntries(
      SPECIALIZATION_TROOPS.map((troopId) => [
        troopId,
        {
          researches: Object.fromEntries(
            RESEARCH_IDS.map((researchId) => [researchId, { selectedNodeIds: [] }])
          ),
        },
      ])
    ),
  };
}

function buildResearchProgress(normalized, troopId, researchId) {
  const research = requireResearch(researchId);
  const selection = normalized.troops[troopId].researches[researchId];
  const passiveSkillNodeId = research.passiveSkillNodeId ?? null;
  const passiveSelected =
    passiveSkillNodeId !== null && selection.selectedNodeIds.includes(passiveSkillNodeId);
  const regularSelectedNodes = selection.selectedNodeIds.filter(
    (nodeId) => nodeId !== passiveSkillNodeId
  ).length;
  // Counted in upgrades, not node icons: a base-attribute node is two of these.
  const completedNodes = selection.selectedNodeIds.length;
  const totalNodes = getResearchUpgradeTotal(research);
  const ratio = totalNodes ? completedNodes / totalNodes : 0;
  const percent = ratio * 100;
  const isComplete = totalNodes > 0 && completedNodes === totalNodes;
  const unlockedMilestones = (research.skillMilestones?.[troopId] || []).filter(
    (milestone) => completedNodes * 100 >= Number(milestone.percent) * totalNodes
  );
  const hasRecordedMedals = Object.hasOwn(selection, 'medalsSpent');
  const medalCoverage =
    completedNodes === 0 || isComplete || hasRecordedMedals ? 'exact' : 'unknown';

  return {
    troopId,
    researchId,
    selectedNodeIds: selection.selectedNodeIds.slice(),
    completedNodes,
    selectedNodeCount: completedNodes,
    regularSelectedNodes,
    totalNodes,
    totalNodeCount: totalNodes,
    ratio,
    percent,
    passiveSkillNodeId,
    passiveSelected,
    isComplete,
    complete: isComplete,
    unlockedMilestones: unlockedMilestones.slice(),
    recordedMedals: hasRecordedMedals ? selection.medalsSpent : null,
    medalsSpent: hasRecordedMedals ? selection.medalsSpent : null,
    medalCoverage,
  };
}

function buildMedalSummary(normalized, troopIds) {
  let totalCost = 0;
  let knownSpent = 0;
  let completedResearchCount = 0;
  let partialResearchCount = 0;
  let unknownPartialCount = 0;
  let totalResearchCount = 0;

  for (const troopId of troopIds) {
    for (const researchId of RESEARCH_IDS) {
      const research = SPECIALIZATION_RESEARCH[researchId];
      const progress = buildResearchProgress(normalized, troopId, researchId);
      const selection = normalized.troops[troopId].researches[researchId];
      totalCost += Number(research.cost) || 0;
      totalResearchCount += 1;

      if (progress.isComplete) {
        completedResearchCount += 1;
        knownSpent += Number(research.cost) || 0;
      } else if (progress.completedNodes > 0) {
        partialResearchCount += 1;
        if (Object.hasOwn(selection, 'medalsSpent')) knownSpent += selection.medalsSpent;
        else unknownPartialCount += 1;
      }
    }
  }

  const knownResearchCount = totalResearchCount - unknownPartialCount;
  const activeResearchCount = completedResearchCount + partialResearchCount;
  const knownActiveResearchCount = activeResearchCount - unknownPartialCount;
  const coverage = activeResearchCount ? knownActiveResearchCount / activeResearchCount : 1;
  const isExact = unknownPartialCount === 0;
  return {
    totalCost,
    knownSpent,
    exactSpent: isExact ? knownSpent : null,
    exactRemaining: isExact ? totalCost - knownSpent : null,
    isExact,
    completedResearchCount,
    partialResearchCount,
    unknownPartialCount,
    knownResearchCount,
    totalResearchCount,
    activeResearchCount,
    knownActiveResearchCount,
    coverage,
    coveragePercent: coverage * 100,
    coverageBasis: 'active-research',
  };
}

export function createEmptySpecializationState() {
  return normalizeState(createRawEmptyState());
}

export function buildSpecializationSnapshot(state) {
  if (state && typeof state === 'object' && NORMALIZED_STATES.has(state)) return state;
  return normalizeState(state);
}

export function parseSpecializationState(jsonText) {
  if (typeof jsonText !== 'string') {
    throw new TypeError('Specialization JSON must be provided as text.');
  }
  if (jsonText.length > SPECIALIZATION_STATE_MAX_JSON_LENGTH) {
    throw new RangeError('Specialization JSON is oversized.');
  }

  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch (error) {
    throw new TypeError(`Specialization JSON is invalid: ${error.message}`);
  }
  return normalizeState(parsed);
}

export function serializeSpecializationState(state, space = 0) {
  if (!Number.isSafeInteger(space) || space < 0 || space > 10) {
    throw new RangeError('JSON indentation must be an integer between 0 and 10.');
  }
  return JSON.stringify(buildSpecializationSnapshot(state), null, space);
}

export function getResearchSelection(state, troopId, researchId) {
  requireTroopId(troopId);
  requireResearch(researchId);
  const normalized = buildSpecializationSnapshot(state);
  const selection = normalized.troops[troopId].researches[researchId];
  return {
    selectedNodeIds: selection.selectedNodeIds.slice(),
    medalsSpent: Object.hasOwn(selection, 'medalsSpent') ? selection.medalsSpent : null,
  };
}

export function getResearchProgress(state, troopId, researchId) {
  requireTroopId(troopId);
  requireResearch(researchId);
  return buildResearchProgress(buildSpecializationSnapshot(state), troopId, researchId);
}

export function getResearchNodeAccess(state, troopId, researchId) {
  requireTroopId(troopId);
  const research = requireResearch(researchId);
  const normalized = buildSpecializationSnapshot(state);
  return deriveResearchNodeAccess(
    research,
    normalized.troops[troopId].researches[researchId].selectedNodeIds
  );
}

export function getColumnProgress(state, troopId, columnId) {
  requireTroopId(troopId);
  const normalized = buildSpecializationSnapshot(state);
  const normalizedColumnId = Number(columnId);
  const column = SPECIALIZATION_COLUMNS[normalizedColumnId];
  if (!column) throw new RangeError(`Unknown specialization column "${String(columnId)}".`);

  const researches = column.researches.map((researchId) =>
    buildResearchProgress(normalized, troopId, researchId)
  );
  const completedNodes = researches.reduce((sum, progress) => sum + progress.completedNodes, 0);
  const totalNodes = researches.reduce((sum, progress) => sum + progress.totalNodes, 0);
  const completedResearchCount = researches.filter((progress) => progress.isComplete).length;
  const isComplete = researches.length === 4 && completedResearchCount === researches.length;
  const ratio = totalNodes ? completedNodes / totalNodes : 0;

  return {
    troopId,
    columnId: normalizedColumnId,
    researches,
    completedNodes,
    totalNodes,
    completedResearchCount,
    totalResearchCount: researches.length,
    ratio,
    percent: ratio * 100,
    isComplete,
    complete: isComplete,
    legionSkillUnlocked: isComplete,
    legionSkill: isComplete
      ? (SPECIALIZATION_LEGION_SKILLS[normalizedColumnId]?.[troopId] ?? null)
      : null,
  };
}

export function getSpecializationSummary(state) {
  const normalized = buildSpecializationSnapshot(state);
  const troops = {};
  let overallCompletedNodes = 0;
  let overallTotalNodes = 0;
  let overallCompletedResearches = 0;
  let overallCompletedColumns = 0;

  for (const troopId of SPECIALIZATION_TROOPS) {
    const researches = RESEARCH_IDS.map((researchId) =>
      buildResearchProgress(normalized, troopId, researchId)
    );
    const columns = COLUMN_IDS.map((columnId) => getColumnProgress(normalized, troopId, columnId));
    const completedNodes = researches.reduce((sum, progress) => sum + progress.completedNodes, 0);
    const totalNodes = researches.reduce((sum, progress) => sum + progress.totalNodes, 0);
    const completedResearchCount = researches.filter((progress) => progress.isComplete).length;
    const completedColumnCount = columns.filter((progress) => progress.isComplete).length;
    const ratio = totalNodes ? completedNodes / totalNodes : 0;
    troops[troopId] = {
      completedNodes,
      totalNodes,
      ratio,
      percent: ratio * 100,
      completedResearchCount,
      totalResearchCount: researches.length,
      completedColumnCount,
      totalColumnCount: columns.length,
      medals: buildMedalSummary(normalized, [troopId]),
    };
    overallCompletedNodes += completedNodes;
    overallTotalNodes += totalNodes;
    overallCompletedResearches += completedResearchCount;
    overallCompletedColumns += completedColumnCount;
  }

  const ratio = overallTotalNodes ? overallCompletedNodes / overallTotalNodes : 0;
  return {
    dataRevision: SPECIALIZATION_DATA_REVISION,
    troops,
    overall: {
      completedNodes: overallCompletedNodes,
      totalNodes: overallTotalNodes,
      ratio,
      percent: ratio * 100,
      completedResearchCount: overallCompletedResearches,
      totalResearchCount: RESEARCH_IDS.length * SPECIALIZATION_TROOPS.length,
      completedColumnCount: overallCompletedColumns,
      totalColumnCount: COLUMN_IDS.length * SPECIALIZATION_TROOPS.length,
      medals: buildMedalSummary(normalized, SPECIALIZATION_TROOPS),
    },
  };
}

function replaceResearchState(normalized, troopId, researchId, selection) {
  return normalizeState({
    ...normalized,
    troops: {
      ...normalized.troops,
      [troopId]: {
        ...normalized.troops[troopId],
        researches: {
          ...normalized.troops[troopId].researches,
          [researchId]: selection,
        },
      },
    },
  });
}

export function setResearchNodes(state, troopId, researchId, nodeIds) {
  requireTroopId(troopId);
  const research = requireResearch(researchId);
  const normalized = buildSpecializationSnapshot(state);
  const current = normalized.troops[troopId].researches[researchId];
  const selectedNodeIds = normalizeSelectedNodeIds(nodeIds, research, `${troopId} ${researchId}`);
  const selectionUnchanged =
    selectedNodeIds.length === current.selectedNodeIds.length &&
    selectedNodeIds.every((nodeId, index) => nodeId === current.selectedNodeIds[index]);
  const nextSelection = { selectedNodeIds };
  if (selectionUnchanged && current.medalsSpent !== undefined) {
    nextSelection.medalsSpent = current.medalsSpent;
  }
  return replaceResearchState(normalized, troopId, researchId, nextSelection);
}

export function toggleResearchNode(state, troopId, researchId, nodeId) {
  requireTroopId(troopId);
  const research = requireResearch(researchId);
  const normalized = buildSpecializationSnapshot(state);
  const current = normalized.troops[troopId].researches[researchId];
  const selectableIds = getSelectableNodeIds(research);
  if (!Number.isSafeInteger(nodeId) || !selectableIds.includes(nodeId)) {
    throw new RangeError(`${troopId} ${researchId} contains unknown node ID ${String(nodeId)}.`);
  }
  const access = deriveResearchNodeAccess(research, current.selectedNodeIds).entries.find(
    (entry) => entry.nodeId === nodeId
  );
  // Toggling walks a node's upgrades: each call buys the next one, and calling
  // it on a fully upgraded node clears the node (and anything depending on it).
  if (access && access.level >= access.maxLevel) {
    return setResearchNodes(
      normalized,
      troopId,
      researchId,
      removeResearchNodeAndDependents(research, current.selectedNodeIds, nodeId)
    );
  }
  if (!access?.selectable) {
    throw new RangeError(
      `${troopId} ${researchId} node ID ${String(nodeId)} is not currently available.`
    );
  }
  return setResearchNodes(normalized, troopId, researchId, [...current.selectedNodeIds, nodeId]);
}

/** Buys every remaining upgrade on a node in one step. */
export function maxResearchNode(state, troopId, researchId, nodeId) {
  requireTroopId(troopId);
  const research = requireResearch(researchId);
  const normalized = buildSpecializationSnapshot(state);
  const current = normalized.troops[troopId].researches[researchId];
  const access = deriveResearchNodeAccess(research, current.selectedNodeIds).entries.find(
    (entry) => entry.nodeId === nodeId
  );
  if (!access) {
    throw new RangeError(`${troopId} ${researchId} contains unknown node ID ${String(nodeId)}.`);
  }
  if (access.level >= access.maxLevel) return normalized;
  if (!access.selectable) {
    throw new RangeError(
      `${troopId} ${researchId} node ID ${String(nodeId)} is not currently available.`
    );
  }
  const missing = access.maxLevel - access.level;
  const next = [...current.selectedNodeIds, ...Array.from({ length: missing }, () => nodeId)];
  return setResearchNodes(normalized, troopId, researchId, next);
}

export function setResearchMedalsSpent(state, troopId, researchId, valueOrNull) {
  requireTroopId(troopId);
  const research = requireResearch(researchId);
  const normalized = buildSpecializationSnapshot(state);
  const current = normalized.troops[troopId].researches[researchId];
  const next = { selectedNodeIds: current.selectedNodeIds.slice() };
  const medalsSpent = normalizeMedalsSpent(valueOrNull, research, `${troopId} ${researchId}`);
  if (medalsSpent !== undefined) next.medalsSpent = medalsSpent;
  return replaceResearchState(normalized, troopId, researchId, next);
}

export function resetResearch(state, troopId, researchId) {
  requireTroopId(troopId);
  requireResearch(researchId);
  return replaceResearchState(buildSpecializationSnapshot(state), troopId, researchId, {
    selectedNodeIds: [],
  });
}

export function resetTower(state, troopId) {
  requireTroopId(troopId);
  const normalized = buildSpecializationSnapshot(state);
  return normalizeState({
    ...normalized,
    troops: {
      ...normalized.troops,
      [troopId]: createRawEmptyState().troops[troopId],
    },
  });
}
