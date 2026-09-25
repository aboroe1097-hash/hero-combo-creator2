import {
  BLUE_LOYALTY_SPECIALTY,
  BUILDING_DISCOUNTS,
  BUILDING_UPGRADE_COSTS,
  EDEN_OPERATION_PLAYBOOKS,
  EDEN_STRUCTURES,
  SPECIALTY_BONUS_PRESETS,
  SPECIALTY_HONOR_LEVELS,
  SPECIALTY_PRESETS,
  SPECIALTY_TREE_SCHEMA,
  TILE_LEVELS,
  TRAINING_MODES,
} from './eden-operations-data.js';

export const EDEN_OPERATIONS_STATE_VERSION = 2;
export const EDEN_OPERATIONS_STORAGE_KEY = 'vts_eden_operations_v2';
export const EDEN_OPERATIONS_LEGACY_KEYS = Object.freeze([
  'vts_eden_operations',
  'vts_eden_operations_v1',
]);

export const DEFAULT_EDEN_OPERATIONS_STATE = Object.freeze({
  version: EDEN_OPERATIONS_STATE_VERSION,
  activeTool: 'specialty',
  specialty: Object.freeze({
    presetId: 'conqueror',
    availablePoints: 73,
    allocations: Object.freeze({}),
  }),
  honor: Object.freeze({ currentLevel: 1, targetLevel: 100 }),
  training: Object.freeze({
    tileLevel: 12,
    attacks: 10,
    legions: 4,
    sessions: 4,
    days: 10,
    banner: true,
    specialtyBonus: 0.9,
  }),
  buildings: Object.freeze({
    buildingId: 'workshop',
    currentLevel: 1,
    targetLevel: 20,
    discountId: 'green',
  }),
  siege: Object.freeze({
    campLevels: Object.freeze([20, 16, 12, 10]),
    specialtyRank: 0,
    targetTileLevel: 16,
    structureId: 'capital-6',
    banner: false,
    assigned: Object.freeze({ attackers: 0, support: 0 }),
  }),
  checklist: Object.freeze({}),
});

const TOOL_IDS = new Set(['specialty', 'honor', 'training', 'buildings', 'siege']);

function finiteNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function clampNumber(value, min, max, fallback = min) {
  return Math.min(max, Math.max(min, finiteNumber(value, fallback)));
}

function integer(value, min, max, fallback) {
  return Math.round(clampNumber(value, min, max, fallback));
}

const CHECKLIST_KEYS = new Set(
  EDEN_OPERATION_PLAYBOOKS.flatMap((entry) => entry.steps.map((_, index) => `${entry.id}.${index}`))
);

function normalizeChecklist(value) {
  const result = {};
  if (!value || typeof value !== 'object') return result;
  for (const [key, done] of Object.entries(value)) {
    if (CHECKLIST_KEYS.has(key) && done === true) result[key] = true;
  }
  return result;
}

function normalizeAllocations(value) {
  const routeIds = new Set(
    SPECIALTY_TREE_SCHEMA.flatMap((tree) => tree.routes.map((route) => route.id))
  );
  const result = {};
  if (!value || typeof value !== 'object') return result;
  for (const [routeId, points] of Object.entries(value)) {
    if (routeIds.has(routeId)) result[routeId] = integer(points, 0, 130, 0);
  }
  return result;
}

export function normalizeEdenOperationsState(value = {}) {
  const source = value && typeof value === 'object' ? value : {};
  const defaultState = DEFAULT_EDEN_OPERATIONS_STATE;
  const campLevels = Array.isArray(source.siege?.campLevels)
    ? source.siege.campLevels.slice(0, 4)
    : defaultState.siege.campLevels;
  while (campLevels.length < 4) campLevels.push(1);

  return {
    version: EDEN_OPERATIONS_STATE_VERSION,
    activeTool: TOOL_IDS.has(source.activeTool) ? source.activeTool : defaultState.activeTool,
    specialty: {
      presetId: SPECIALTY_PRESETS.some((preset) => preset.id === source.specialty?.presetId)
        ? source.specialty.presetId
        : defaultState.specialty.presetId,
      availablePoints: integer(
        source.specialty?.availablePoints,
        0,
        143,
        defaultState.specialty.availablePoints
      ),
      allocations: normalizeAllocations(source.specialty?.allocations),
    },
    honor: {
      currentLevel: integer(source.honor?.currentLevel, 1, 143, defaultState.honor.currentLevel),
      targetLevel: integer(source.honor?.targetLevel, 1, 143, defaultState.honor.targetLevel),
    },
    training: {
      tileLevel: integer(source.training?.tileLevel, 1, 16, defaultState.training.tileLevel),
      attacks: integer(source.training?.attacks, 1, 1000, defaultState.training.attacks),
      legions: integer(source.training?.legions, 1, 20, defaultState.training.legions),
      sessions: integer(source.training?.sessions, 1, 100, defaultState.training.sessions),
      days: integer(source.training?.days, 1, 365, defaultState.training.days),
      banner: source.training?.banner ?? defaultState.training.banner,
      specialtyBonus: clampNumber(
        source.training?.specialtyBonus,
        0,
        10,
        defaultState.training.specialtyBonus
      ),
    },
    buildings: {
      buildingId: BUILDING_UPGRADE_COSTS[source.buildings?.buildingId]
        ? source.buildings.buildingId
        : defaultState.buildings.buildingId,
      currentLevel: integer(
        source.buildings?.currentLevel,
        1,
        20,
        defaultState.buildings.currentLevel
      ),
      targetLevel: integer(
        source.buildings?.targetLevel,
        1,
        20,
        defaultState.buildings.targetLevel
      ),
      discountId: BUILDING_DISCOUNTS.some(
        (discount) => discount.id === source.buildings?.discountId
      )
        ? source.buildings.discountId
        : defaultState.buildings.discountId,
    },
    siege: {
      campLevels: campLevels.map((level) => integer(level, 0, 20, 1)),
      specialtyRank: integer(source.siege?.specialtyRank, 0, 20, defaultState.siege.specialtyRank),
      targetTileLevel: integer(
        source.siege?.targetTileLevel,
        1,
        16,
        defaultState.siege.targetTileLevel
      ),
      structureId: EDEN_STRUCTURES.some((entry) => entry.id === source.siege?.structureId)
        ? source.siege.structureId
        : defaultState.siege.structureId,
      banner: source.siege?.banner ?? defaultState.siege.banner,
      assigned: {
        attackers: integer(source.siege?.assigned?.attackers, 0, 500, 0),
        support: integer(source.siege?.assigned?.support, 0, 500, 0),
      },
    },
    checklist: normalizeChecklist(source.checklist),
  };
}

export function readEdenOperationsState(storage = globalThis.localStorage) {
  if (!storage?.getItem) return normalizeEdenOperationsState();
  for (const key of [EDEN_OPERATIONS_STORAGE_KEY, ...EDEN_OPERATIONS_LEGACY_KEYS]) {
    try {
      const raw = storage.getItem(key);
      if (!raw) continue;
      return normalizeEdenOperationsState(JSON.parse(raw));
    } catch {
      // A corrupt or older unsupported payload must never block the tool.
    }
  }
  return normalizeEdenOperationsState();
}

export function writeEdenOperationsState(state, storage = globalThis.localStorage) {
  const normalized = normalizeEdenOperationsState(state);
  storage?.setItem?.(EDEN_OPERATIONS_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export function specialtyAllocationSummary(state) {
  const allocations = normalizeAllocations(state?.allocations);
  const allocated = Object.values(allocations).reduce((sum, value) => sum + value, 0);
  const available = integer(state?.availablePoints, 0, 143, 0);
  return { allocations, allocated, available, remaining: available - allocated };
}

export function milestoneStatus(points, route) {
  if (route.advanced != null && points >= route.advanced) return 'advanced';
  if (points >= route.essential) return 'essential';
  if (points >= route.critical) return 'critical';
  return 'planned';
}

export function calculateHonorProgress(currentLevel, targetLevel) {
  const current = integer(currentLevel, 1, 143, 1);
  const target = integer(targetLevel, 1, 143, 143);
  const low = Math.min(current, target);
  const high = Math.max(current, target);
  const currentRow = SPECIALTY_HONOR_LEVELS[current - 1];
  const targetRow = SPECIALTY_HONOR_LEVELS[target - 1];
  const unknownLevels = SPECIALTY_HONOR_LEVELS.slice(low - 1, high).filter(
    (row) => row.honor == null
  );
  const calculable = currentRow?.cumulative != null && targetRow?.cumulative != null;
  return {
    current,
    target,
    currentRow,
    targetRow,
    direction: target >= current ? 'forward' : 'backward',
    required: calculable ? Math.abs(targetRow.cumulative - currentRow.cumulative) : null,
    calculable,
    unknownLevels: unknownLevels.map((row) => row.level),
  };
}

export function calculateTrainingComparison(settings = {}) {
  const tileLevel = integer(settings.tileLevel, 1, 16, 12);
  const baseHonor = TILE_LEVELS[tileLevel - 1].honor;
  const attacks = integer(settings.attacks, 1, 1000, 10);
  const legions = integer(settings.legions, 1, 20, 4);
  const sessions = integer(settings.sessions, 1, 100, 4);
  const days = integer(settings.days, 1, 365, 10);
  const specialtyBonus = clampNumber(settings.specialtyBonus, 0, 10, 0);
  const banner = Boolean(settings.banner);

  return Object.values(TRAINING_MODES).map((mode) => {
    const effectiveFactor = mode.actionFactor + (banner ? mode.bannerActionFactor : 0);
    const honorPerAttack = baseHonor * effectiveFactor;
    const perSession = honorPerAttack * attacks * legions;
    const daily = perSession * sessions;
    const period = daily * days;
    return {
      ...mode,
      tileLevel,
      baseHonor,
      effectiveFactor,
      honorPerAttack,
      perSession,
      daily,
      period,
      withSpecialty: period * (1 + specialtyBonus),
    };
  });
}

export function calculateBuildingUpgrade(settings = {}) {
  const buildingId = BUILDING_UPGRADE_COSTS[settings.buildingId] ? settings.buildingId : 'workshop';
  const costs = BUILDING_UPGRADE_COSTS[buildingId];
  const currentLevel = integer(settings.currentLevel, 1, 20, 1);
  const targetLevel = integer(settings.targetLevel, 1, 20, 20);
  const discount =
    BUILDING_DISCOUNTS.find((entry) => entry.id === settings.discountId) ?? BUILDING_DISCOUNTS[0];
  const start = Math.min(currentLevel, targetLevel);
  const end = Math.max(currentLevel, targetLevel);
  const rows = [];
  for (let level = start + 1; level <= end; level += 1) {
    const baseCost = costs[level - 1];
    rows.push({
      level,
      baseCost,
      // The source sheet rounds discounted materials up (685 at 27% prints 501),
      // which is also the safe direction for a player budgeting materials.
      discountedCost: Math.ceil(baseCost * (1 - discount.rate)),
    });
  }
  return {
    buildingId,
    currentLevel,
    targetLevel,
    discount,
    rows,
    baseTotal: rows.reduce((sum, row) => sum + row.baseCost, 0),
    discountedTotal: rows.reduce((sum, row) => sum + row.discountedCost, 0),
  };
}

export function calculateTilingPlan(settings = {}) {
  const campLevels = (settings.campLevels || [1, 1, 1, 1])
    .slice(0, 4)
    .map((level) => integer(level, 0, 20, 1));
  while (campLevels.length < 4) campLevels.push(1);
  const specialtyRank = integer(settings.specialtyRank, 0, 20, 0);
  const specialty = BLUE_LOYALTY_SPECIALTY[specialtyRank];
  const campLoyalty = campLevels.reduce((sum, level) => sum + level * 100, 0);
  const totalLoyalty = campLoyalty + specialty.extraLoyalty;
  const safeTile = [...TILE_LEVELS].reverse().find((tile) => totalLoyalty >= tile.loyalty);
  const targetTileLevel = integer(settings.targetTileLevel, 1, 16, 16);
  const targetTile = TILE_LEVELS[targetTileLevel - 1];
  return {
    campLevels,
    specialtyRank,
    specialty,
    campLoyalty,
    totalLoyalty,
    safeTile,
    targetTile,
    loyaltyGap: Math.max(0, targetTile.loyalty - totalLoyalty),
  };
}

export function calculateCampUpgradeOrder(settings = {}) {
  const result = calculateTilingPlan(settings);
  const levels = [...result.campLevels];
  const steps = [];
  let totalLoyalty = result.totalLoyalty;
  while (totalLoyalty < result.targetTile.loyalty) {
    const candidates = levels
      .map((level, index) => ({
        index,
        nextLevel: level + 1,
        cost: level < 20 ? BUILDING_UPGRADE_COSTS[`ac${index + 1}`][level] : Infinity,
      }))
      .filter((entry) => Number.isFinite(entry.cost))
      .sort((a, b) => a.cost - b.cost || a.index - b.index);
    if (!candidates.length) break;
    const next = candidates[0];
    levels[next.index] = next.nextLevel;
    totalLoyalty += 100;
    steps.push({
      campId: `ac${next.index + 1}`,
      campNumber: next.index + 1,
      level: next.nextLevel,
      cost: next.cost,
      resultingLoyalty: totalLoyalty,
    });
  }
  return {
    ...result,
    finalCampLevels: levels,
    finalLoyalty: totalLoyalty,
    reached: totalLoyalty >= result.targetTile.loyalty,
    steps,
    totalCost: steps.reduce((sum, step) => sum + step.cost, 0),
  };
}

export function getSiegePlan(structureId, banner = false) {
  const structure = EDEN_STRUCTURES.find((entry) => entry.id === structureId) ?? EDEN_STRUCTURES[0];
  return {
    structure,
    banner: Boolean(banner),
    attackers: banner ? structure.bannerAttackers : structure.attackers,
    support: banner ? structure.bannerSupport : structure.support,
  };
}

// Staffing progress for the objective counters: how many more players each
// side still needs before the published minimum is met.
export function staffingStatus(plan, assigned = {}) {
  const attackers = integer(assigned.attackers, 0, 500, 0);
  const support = integer(assigned.support, 0, 500, 0);
  const missingAttackers = Math.max(0, plan.attackers - attackers);
  const missingSupport = Math.max(0, plan.support - support);
  return {
    attackers,
    support,
    missingAttackers,
    missingSupport,
    missing: missingAttackers + missingSupport,
    ready: missingAttackers === 0 && missingSupport === 0,
  };
}

export function checklistProgress(playbook, checklist = {}) {
  let done = 0;
  playbook.steps.forEach((_, index) => {
    if (checklist[`${playbook.id}.${index}`]) done += 1;
  });
  return { done, total: playbook.steps.length };
}

// `describe` returns the localized words a viewer can search for (title,
// summary, steps, tag labels), so search works in every language pack.
export function filterOperationPlaybooks(filters = {}, describe = () => '') {
  const stage = filters.stage || 'all';
  const role = filters.role || 'all';
  const terms = String(filters.query || '')
    .toLocaleLowerCase()
    .split(/\s+/u)
    .filter(Boolean);
  return EDEN_OPERATION_PLAYBOOKS.filter((entry) => {
    if (stage !== 'all' && entry.stage !== stage) return false;
    if (role !== 'all' && !entry.roles.includes(role)) return false;
    if (!terms.length) return true;
    const haystack = String(describe(entry)).toLocaleLowerCase();
    return terms.every((term) => haystack.includes(term));
  });
}

export function buildingCostRows() {
  return Array.from({ length: 20 }, (_, index) => {
    const level = index + 1;
    const row = { level };
    for (const [buildingId, costs] of Object.entries(BUILDING_UPGRADE_COSTS)) {
      row[buildingId] = costs[index];
    }
    return row;
  });
}

export function honorLevelRows() {
  return SPECIALTY_HONOR_LEVELS.map((row, index, rows) => ({
    ...row,
    difference:
      row.honor != null && index > 0 && rows[index - 1].honor != null
        ? row.honor - rows[index - 1].honor
        : index === 0
          ? 0
          : null,
  }));
}

function csvCell(value) {
  if (value == null) return '';
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function rowsToCsv(rows, columns) {
  const header = columns.map((column) => csvCell(column.label)).join(',');
  const body = rows.map((row) => columns.map((column) => csvCell(row[column.key])).join(','));
  return [header, ...body].join('\n');
}

function bytesToBase64(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  if (typeof btoa === 'function') return btoa(binary);
  return Buffer.from(bytes).toString('base64');
}

function base64ToBytes(value) {
  const padded =
    value.replaceAll('-', '+').replaceAll('_', '/') + '==='.slice((value.length + 3) % 4);
  const binary =
    typeof atob === 'function' ? atob(padded) : Buffer.from(padded, 'base64').toString('binary');
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export function encodeEdenOperationsState(state) {
  const bytes = new TextEncoder().encode(JSON.stringify(normalizeEdenOperationsState(state)));
  return bytesToBase64(bytes).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '');
}

export function decodeEdenOperationsState(value) {
  const json = new TextDecoder().decode(base64ToBytes(value));
  return normalizeEdenOperationsState(JSON.parse(json));
}

export function trainingBenchmarkPresets() {
  return SPECIALTY_BONUS_PRESETS;
}

// ---------------------------------------------------------------------------
// Shared staffing counters (Firestore: eden_operations/current)
//
// The assigned-player counters used to live only in this device's localStorage.
// They are alliance business, so they moved to one shared document: any signed-in
// member reads it, an admin writes it, and the rules validate the shape. The
// helpers below are pure, so a value is normalized and bounded before it reaches
// Firestore or a screen, and the same bounds are mirrored in firestore.rules.

export const EDEN_OPERATIONS_SHARED_PATH = Object.freeze(['eden_operations', 'current']);
/** Both sides of the wire agree on these bounds: the model and the rules. */
export const MAX_SHARED_ASSIGNED = 500;
export const MAX_SHARED_OBJECTIVES = 40;
export const EDEN_OPERATIONS_SHARED_CACHE_KEY = 'vts_eden_operations_counts_v1';

const SHARED_SIDES = Object.freeze(['attackers', 'support']);
const OBJECTIVE_IDS = new Set(EDEN_STRUCTURES.map((entry) => entry.id));
const OBJECTIVE_KEY_PATTERN = /^[a-z0-9-]{1,32}(:banner)?$/;

/** The key one objective's counters live under: the structure, and its banner variant. */
export function objectiveKey(structureId, banner = false) {
  const id = OBJECTIVE_IDS.has(structureId) ? structureId : EDEN_STRUCTURES[0].id;
  return `${id}${banner ? ':banner' : ''}`;
}

/** True when a key names an objective this build knows about. */
export function isObjectiveKey(key) {
  if (typeof key !== 'string' || !OBJECTIVE_KEY_PATTERN.test(key)) return false;
  return OBJECTIVE_IDS.has(key.replace(/:banner$/, ''));
}

/** Counts that came from Firestore, the cache or an older build, made safe. */
export function normalizeSharedCounts(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const counts = {};
  for (const [key, value] of Object.entries(source)) {
    if (!isObjectiveKey(key) || !value || typeof value !== 'object') continue;
    counts[key] = {
      attackers: integer(value.attackers, 0, MAX_SHARED_ASSIGNED, 0),
      support: integer(value.support, 0, MAX_SHARED_ASSIGNED, 0),
    };
    if (Object.keys(counts).length >= MAX_SHARED_OBJECTIVES) break;
  }
  return counts;
}

/** One objective's counters; zeroes until the alliance counts it. */
export function sharedCountsFor(counts, key) {
  const entry = counts && typeof counts === 'object' ? counts[key] : null;
  return {
    attackers: integer(entry?.attackers, 0, MAX_SHARED_ASSIGNED, 0),
    support: integer(entry?.support, 0, MAX_SHARED_ASSIGNED, 0),
  };
}

/** A copy with one side of one objective set, clamped to the shared bounds. */
export function withSharedCount(counts, key, side, value) {
  const normalized = normalizeSharedCounts(counts);
  if (!isObjectiveKey(key) || !SHARED_SIDES.includes(side)) return normalized;
  return {
    ...normalized,
    [key]: {
      ...sharedCountsFor(normalized, key),
      [side]: integer(value, 0, MAX_SHARED_ASSIGNED, 0),
    },
  };
}

/** The counters after a click: the current value plus the button's delta. */
export function applySharedDelta(counts, key, side, delta) {
  const current = sharedCountsFor(counts, key);
  return withSharedCount(counts, key, side, current[side] + Number(delta || 0));
}

/** The write payload the rules accept: known keys, bounded integers, no extras. */
export function sharedCountsPayload(counts) {
  const payload = {};
  for (const [key, value] of Object.entries(normalizeSharedCounts(counts))) {
    payload[key] = { attackers: value.attackers, support: value.support };
  }
  return payload;
}

/** Every objective key this build can write; firestore.rules lists the same set. */
export function sharedObjectiveKeys() {
  return EDEN_STRUCTURES.flatMap((entry) => [entry.id, `${entry.id}:banner`]);
}
