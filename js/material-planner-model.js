export const DM_SLOT_IDS = ['armor', 'dagger', 'ring', 'sword', 'helmet', 'boots'];

// Canonical storage/share value. The UI localizes this only while it remains
// untouched, so user-authored plan names are never translated or rewritten.
export const DM_DEFAULT_PLAN_NAME = 'VTS DM Set Plan';

export const DM_TARGET_SET_COUNT = 5;

export const DM_SET_IDS = Object.freeze(
  Array.from({ length: DM_TARGET_SET_COUNT }, (_, index) => index + 1)
);

export const DM_TIER_IDS = Object.freeze(['white', 'green', 'blue', 'purple', 'orange', 'gold']);

export const DM_TIER_IDENTITIES = Object.freeze(
  Object.fromEntries(
    DM_TIER_IDS.map((id, index) => [
      id,
      Object.freeze({
        id,
        rank: index + 1,
        label: id.charAt(0).toUpperCase() + id.slice(1),
        translationKey: `dmPlanner${id.charAt(0).toUpperCase()}${id.slice(1)}`,
      }),
    ])
  )
);

export function getDmTierIdentity(tierId, fallbackId = 'white') {
  const normalizedTier = String(tierId || '')
    .trim()
    .toLowerCase();
  if (Object.hasOwn(DM_TIER_IDENTITIES, normalizedTier)) return DM_TIER_IDENTITIES[normalizedTier];
  const normalizedFallback = String(fallbackId || '')
    .trim()
    .toLowerCase();
  return DM_TIER_IDENTITIES[normalizedFallback] || DM_TIER_IDENTITIES.white;
}

export const DM_PRESETS = Object.freeze({
  full: Object.freeze(['armor', 'dagger', 'ring', 'sword', 'helmet', 'boots']),
  attack: Object.freeze(['armor', 'dagger', 'ring', 'sword']),
  defense: Object.freeze(['ring', 'boots', 'helmet', 'sword']),
});

export const DM_SLOT_RECIPES = Object.freeze({
  armor: Object.freeze({ archers: 1, footmen: 2, cavalry: 1 }),
  dagger: Object.freeze({ archers: 2, footmen: 1, cavalry: 1 }),
  ring: Object.freeze({ archers: 2, footmen: 1, cavalry: 1 }),
  sword: Object.freeze({ archers: 1, footmen: 2, cavalry: 1 }),
  helmet: Object.freeze({ archers: 1, footmen: 1, cavalry: 2 }),
  boots: Object.freeze({ archers: 1, footmen: 1, cavalry: 2 }),
});

export const DM_MATERIAL_STOCKPILES = Object.freeze({
  gold: Object.freeze({
    ranger: Object.freeze([10, 7, 9, 6]),
    cavalry: Object.freeze([11, 7, 8, 6]),
    dreadnaught: Object.freeze([11, 7, 8, 6]),
  }),
  purple: Object.freeze({
    ranger: Object.freeze([160, 112, 144, 96]),
    cavalry: Object.freeze([176, 112, 128, 96]),
    dreadnaught: Object.freeze([176, 112, 128, 96]),
  }),
  blue: Object.freeze({
    ranger: Object.freeze([640, 448, 576, 384]),
    cavalry: Object.freeze([704, 448, 512, 384]),
    dreadnaught: Object.freeze([704, 448, 512, 384]),
  }),
});

export const DM_NORMAL_GEAR_DRAGONITE_PER_ITEM = Object.freeze({
  blue: 140,
  purple: 696,
  gold: 17300,
});

export const DM_ROUTES = Object.freeze({
  gold: Object.freeze({
    id: 'gold',
    normalTier: 'gold',
    dmPieceResources: Object.freeze({ superDragonite: 100000, dragonite: 0, gems: 0 }),
    perPiece: Object.freeze({ superDragonite: 100000, dragonite: 69200, gems: 0 }),
    stages: Object.freeze([Object.freeze({ tier: 'gold', count: 1 })]),
  }),
  purple: Object.freeze({
    id: 'purple',
    normalTier: 'purple',
    dmPieceResources: Object.freeze({ superDragonite: 64000, dragonite: 51200, gems: 545600 }),
    perPiece: Object.freeze({ superDragonite: 64000, dragonite: 95744, gems: 545600 }),
    stages: Object.freeze([
      Object.freeze({ tier: 'purple', count: 16 }),
      Object.freeze({ tier: 'orange', count: 4 }),
      Object.freeze({ tier: 'gold', count: 1 }),
    ]),
  }),
  blue: Object.freeze({
    id: 'blue',
    normalTier: 'blue',
    dmPieceResources: Object.freeze({ superDragonite: 51200, dragonite: 40960, gems: 742176 }),
    perPiece: Object.freeze({ superDragonite: 51200, dragonite: 76800, gems: 742176 }),
    stages: Object.freeze([
      Object.freeze({ tier: 'blue', count: 64 }),
      Object.freeze({ tier: 'purple', count: 16 }),
      Object.freeze({ tier: 'orange', count: 4 }),
      Object.freeze({ tier: 'gold', count: 1 }),
    ]),
  }),
});

export function getNormalGearRequirement(routeId, slotId) {
  const route = DM_ROUTES[routeId] || DM_ROUTES.purple;
  const recipe = DM_SLOT_RECIPES[slotId] || DM_SLOT_RECIPES.armor;
  const multiplier = route.stages[0].count;
  return Object.freeze(
    Object.fromEntries(Object.entries(recipe).map(([troop, count]) => [troop, count * multiplier]))
  );
}

export function getNormalGearDragoniteRequirement(routeId, slotId) {
  const route = DM_ROUTES[routeId] || DM_ROUTES.purple;
  const itemCount = Object.values(getNormalGearRequirement(route.id, slotId)).reduce(
    (sum, count) => sum + count,
    0
  );
  return itemCount * DM_NORMAL_GEAR_DRAGONITE_PER_ITEM[route.normalTier];
}

const RESOURCE_KEYS = ['superDragonite', 'dragonite', 'gems'];

function cleanCount(value, maximum = 999999999) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.min(maximum, Math.max(0, Math.floor(numeric)));
}

function slotFlags(active = true) {
  return Object.fromEntries(DM_SLOT_IDS.map((slot) => [slot, Boolean(active)]));
}

function createMaterialSets() {
  return DM_SET_IDS.map((id) => ({ id, completed: slotFlags(false) }));
}

function cleanFocusedSet(value) {
  const numeric = Number(value);
  if (!Number.isInteger(numeric) || numeric < 1 || numeric > DM_TARGET_SET_COUNT) return 1;
  return numeric;
}

function cleanTargetSetCount(value) {
  const numeric = Number(value);
  if (!Number.isInteger(numeric)) return DM_TARGET_SET_COUNT;
  return Math.min(DM_TARGET_SET_COUNT, Math.max(1, numeric));
}

function getRawMaterialSet(rawSets, setId) {
  if (Array.isArray(rawSets)) {
    return rawSets.find((entry, index) => {
      if (!entry || typeof entry !== 'object') return false;
      const entryId = Number(entry.id ?? index + 1);
      return entryId === setId;
    });
  }
  if (!rawSets || typeof rawSets !== 'object') return null;
  return rawSets[setId] || rawSets[String(setId)] || null;
}

function copySlotCompletion(target, source) {
  if (!source || typeof source !== 'object') return;
  for (const slot of DM_SLOT_IDS) {
    target[slot] = Boolean(source[slot]);
  }
}

function syncFocusedCompletion(plan) {
  const focusedSet = plan.sets[plan.focusedSet - 1] || plan.sets[0];
  plan.focusedSet = focusedSet.id;
  // Keep the v2/v3 `completed` field as a live alias for the focused set. This
  // lets the current UI and old integrations continue toggling
  // `plan.completed[slot]` without losing the five-set campaign data.
  plan.completed = focusedSet.completed;
  return plan;
}

export function createDefaultMaterialPlan() {
  const sets = createMaterialSets();
  return syncFocusedCompletion({
    version: 4,
    name: DM_DEFAULT_PLAN_NAME,
    route: 'purple',
    preset: 'full',
    targetSets: DM_TARGET_SET_COUNT,
    focusedSet: 1,
    sets,
    selectedSlot: 'armor',
    targets: slotFlags(true),
    completed: sets[0].completed,
    ownedResources: {
      superDragonite: 0,
      dragonite: 0,
      gems: 0,
    },
    ownedPieces: Object.fromEntries(DM_SLOT_IDS.map((slot) => [slot, 0])),
    viewMode: 'set',
    breakdownOpen: false,
    enhancement: createDefaultEnhancementState(),
  });
}

export function normalizeMaterialPlan(raw) {
  const next = createDefaultMaterialPlan();
  if (!raw || typeof raw !== 'object') return next;

  if (typeof raw.name === 'string' && raw.name.trim()) next.name = raw.name.trim().slice(0, 80);
  if (raw.route in DM_ROUTES) next.route = raw.route;
  if (raw.preset in DM_PRESETS) next.preset = raw.preset;
  next.targetSets = cleanTargetSetCount(raw.targetSets);
  if (DM_SLOT_IDS.includes(raw.selectedSlot)) next.selectedSlot = raw.selectedSlot;
  if (raw.viewMode === 'set' || raw.viewMode === 'slot') next.viewMode = raw.viewMode;
  next.breakdownOpen = Boolean(raw.breakdownOpen);

  for (const slot of DM_SLOT_IDS) {
    if (raw.targets && typeof raw.targets === 'object')
      next.targets[slot] = Boolean(raw.targets[slot]);
  }

  const hasCampaignSets = DM_SET_IDS.some((setId) => {
    const rawSet = getRawMaterialSet(raw.sets, setId);
    return rawSet && typeof rawSet === 'object';
  });
  next.focusedSet = hasCampaignSets
    ? Math.min(cleanFocusedSet(raw.focusedSet), next.targetSets)
    : 1;
  for (const setId of DM_SET_IDS) {
    const rawSet = getRawMaterialSet(raw.sets, setId);
    copySlotCompletion(next.sets[setId - 1].completed, rawSet?.completed);
  }

  if (!hasCampaignSets && raw.completed && typeof raw.completed === 'object') {
    copySlotCompletion(next.sets[0].completed, raw.completed);
  }

  syncFocusedCompletion(next);

  if (!next.targets[next.selectedSlot]) {
    next.selectedSlot = DM_SLOT_IDS.find((slot) => next.targets[slot]) || 'armor';
  }

  for (const key of RESOURCE_KEYS) {
    next.ownedResources[key] = cleanCount(raw.ownedResources?.[key]);
  }
  for (const slot of DM_SLOT_IDS) {
    next.ownedPieces[slot] = cleanCount(raw.ownedPieces?.[slot], 99);
  }

  // Enhancement is additive (introduced in plan v3). Older saved plans have no
  // `enhancement` field and safely fall back to the default advancement state.
  next.enhancement = normalizeEnhancementState(raw.enhancement);

  return next;
}

export function focusMaterialSet(plan, setId) {
  const next = normalizeMaterialPlan(plan);
  next.focusedSet = Math.min(cleanFocusedSet(setId), next.targetSets);
  return syncFocusedCompletion(next);
}

export function toggleSelectedMaterialPieceCompletion(plan) {
  const next = normalizeMaterialPlan(plan);
  const selectedSlot = next.selectedSlot;
  const wasComplete = next.completed[selectedSlot];
  next.completed[selectedSlot] = !wasComplete;

  if (wasComplete) return next;

  const selectedIndex = DM_SLOT_IDS.indexOf(selectedSlot);
  const nextSlot = DM_SLOT_IDS.slice(selectedIndex + 1).find(
    (slot) => next.targets[slot] && !next.completed[slot]
  );
  if (nextSlot) {
    next.selectedSlot = nextSlot;
    return next;
  }

  for (let setId = next.focusedSet + 1; setId <= next.targetSets; setId += 1) {
    const set = next.sets[setId - 1];
    const firstUnfinishedSlot = DM_SLOT_IDS.find(
      (slot) => next.targets[slot] && !set.completed[slot]
    );
    if (!firstUnfinishedSlot) continue;
    next.focusedSet = setId;
    next.selectedSlot = firstUnfinishedSlot;
    return syncFocusedCompletion(next);
  }

  return next;
}

export function applyMaterialPreset(plan, presetId) {
  const preset = DM_PRESETS[presetId];
  if (!preset) return normalizeMaterialPlan(plan);
  const next = normalizeMaterialPlan(plan);
  next.preset = presetId;
  for (const slot of DM_SLOT_IDS) {
    next.targets[slot] = preset.includes(slot);
  }
  if (!next.targets[next.selectedSlot]) next.selectedSlot = preset[0] || 'armor';
  return syncFocusedCompletion(next);
}

function multiplyResources(resources, multiplier) {
  return Object.fromEntries(RESOURCE_KEYS.map((key) => [key, resources[key] * multiplier]));
}

export function calculateMaterialPlan(inputPlan) {
  const plan = normalizeMaterialPlan(inputPlan);
  const route = DM_ROUTES[plan.route];
  const targetSlots = DM_SLOT_IDS.filter((slot) => plan.targets[slot]);
  const activeSets = plan.sets.slice(0, plan.targetSets);
  const setSummaries = activeSets.map((set) => {
    const completedSlots = targetSlots.filter((slot) => set.completed[slot]);
    const remainingSlots = targetSlots.filter((slot) => !set.completed[slot]);
    const targetPieceCount = targetSlots.length;
    const completedPieceCount = completedSlots.length;
    return {
      setId: set.id,
      completedSlots,
      remainingSlots,
      targetPieceCount,
      completedPieceCount,
      remainingPieceCount: remainingSlots.length,
      progress: targetPieceCount ? completedPieceCount / targetPieceCount : 1,
      complete: targetPieceCount > 0 && remainingSlots.length === 0,
    };
  });
  const focusedSetSummary = setSummaries[plan.focusedSet - 1] || setSummaries[0];
  const campaignSetSummaries = activeSets.map((set) => {
    const completedSlots = DM_SLOT_IDS.filter((slot) => set.completed[slot]);
    return {
      setId: set.id,
      completedSlots,
      remainingSlots: DM_SLOT_IDS.filter((slot) => !set.completed[slot]),
      completedPieceCount: completedSlots.length,
      remainingPieceCount: DM_SLOT_IDS.length - completedSlots.length,
      progress: completedSlots.length / DM_SLOT_IDS.length,
      complete: completedSlots.length === DM_SLOT_IDS.length,
    };
  });
  const completedSlots = focusedSetSummary.completedSlots;
  const remainingSlots = focusedSetSummary.remainingSlots;
  const totalTargetPieces = targetSlots.length * plan.targetSets;
  const totalCompletedPieces = setSummaries.reduce(
    (sum, summary) => sum + summary.completedPieceCount,
    0
  );
  const totalRemainingPieces = Math.max(0, totalTargetPieces - totalCompletedPieces);
  const completedSetNumbers = setSummaries
    .filter((summary) => summary.complete)
    .map((summary) => summary.setId);
  const remainingSetNumbers = setSummaries
    .filter((summary) => !summary.complete)
    .map((summary) => summary.setId);
  const needed = multiplyResources(route.perPiece, totalRemainingPieces);
  const fullCost = multiplyResources(route.perPiece, totalTargetPieces);
  const perSetFullCost = multiplyResources(route.perPiece, targetSlots.length);
  const shortfall = Object.fromEntries(
    RESOURCE_KEYS.map((key) => [key, Math.max(0, needed[key] - plan.ownedResources[key])])
  );
  const coverage = Object.fromEntries(
    RESOURCE_KEYS.map((key) => {
      if (needed[key] === 0) return [key, 1];
      return [key, Math.min(1, plan.ownedResources[key] / needed[key])];
    })
  );
  const overallProgress = totalTargetPieces ? totalCompletedPieces / totalTargetPieces : 1;
  const campaignCompletedPieces = campaignSetSummaries.reduce(
    (sum, summary) => sum + summary.completedPieceCount,
    0
  );
  const campaignTotalPieces = DM_SLOT_IDS.length * plan.targetSets;
  const campaignRemainingPieces = Math.max(0, campaignTotalPieces - campaignCompletedPieces);
  const campaignCompletedSetNumbers = campaignSetSummaries
    .filter((summary) => summary.complete)
    .map((summary) => summary.setId);
  const campaignProgress = campaignCompletedPieces / campaignTotalPieces;
  const campaignAllComplete = campaignRemainingPieces === 0;
  const focusedSetProgress = focusedSetSummary.progress;
  const nextSlot = remainingSlots[0] || null;
  const nextSetSummary = setSummaries.find((summary) => summary.remainingSlots.length > 0) || null;
  const nextPiece = nextSetSummary
    ? { setId: nextSetSummary.setId, slot: nextSetSummary.remainingSlots[0] }
    : null;

  const ownedBySlot = Object.fromEntries(
    targetSlots.map((slot) => [slot, Math.min(plan.targetSets, plan.ownedPieces[slot])])
  );
  const completeFullSetCount = targetSlots.length
    ? Math.min(...targetSlots.map((slot) => ownedBySlot[slot]))
    : 0;
  const remainingFullSetCount = Math.max(0, plan.targetSets - completeFullSetCount);
  const remainingBySlot = Object.fromEntries(
    targetSlots.map((slot) => [slot, Math.max(0, plan.targetSets - ownedBySlot[slot])])
  );
  const remainingPieceCountToTarget = Object.values(remainingBySlot).reduce(
    (sum, count) => sum + count,
    0
  );
  const resourceNeedToTarget = multiplyResources(route.perPiece, remainingPieceCountToTarget);
  const shortfallAfterStockpile = Object.fromEntries(
    RESOURCE_KEYS.map((key) => [
      key,
      Math.max(0, resourceNeedToTarget[key] - plan.ownedResources[key]),
    ])
  );
  const inventorySummary = {
    ownedBySlot,
    completeFullSetCount,
    remainingFullSetCount,
    remainingBySlot,
    remainingPieceCountToTarget,
    resourceNeedToTarget,
    shortfallAfterStockpile,
  };
  return {
    plan,
    route,
    targetSlots,
    setSummaries,
    focusedSetSummary,
    campaignSetSummaries,
    completedSlots,
    remainingSlots,
    targetSetCount: plan.targetSets,
    completedSetNumbers,
    remainingSetNumbers,
    completedSetCount: completedSetNumbers.length,
    remainingSetCount: remainingSetNumbers.length,
    totalTargetPieces,
    totalCompletedPieces,
    totalRemainingPieces,
    needed,
    fullCost,
    perSetFullCost,
    shortfall,
    coverage,
    overallProgress,
    campaignTotalPieces,
    campaignCompletedPieces,
    campaignRemainingPieces,
    campaignCompletedSetNumbers,
    campaignCompletedSetCount: campaignCompletedSetNumbers.length,
    campaignProgress,
    campaignAllComplete,
    enhancementUnlocked: campaignAllComplete,
    focusedSetProgress,
    nextSlot,
    nextPiece,
    inventorySummary,
    allComplete: totalTargetPieces > 0 && totalRemainingPieces === 0,
  };
}

export function encodeMaterialPlan(plan) {
  const normalized = normalizeMaterialPlan(plan);
  const json = JSON.stringify(normalized);
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function decodeMaterialPlan(value) {
  if (typeof value !== 'string' || !value || value.length > 6000) return null;
  try {
    const padded = value
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(Math.ceil(value.length / 4) * 4, '=');
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    return normalizeMaterialPlan(JSON.parse(new TextDecoder().decode(bytes)));
  } catch {
    return null;
  }
}

/* -------------------------------------------------------------------------
   Dragon Master enhancement / advancement planner (+5 … +25).
   Separate from crafting. Milestone figures are CUMULATIVE one-piece totals
   required to reach each level from +0 (confirmed by owner + Redbull 1097
   source, 2026-07-12 — see docs/dm-enhancement-source-data.md). Six-piece
   totals are derived as exactly 6× one-piece. The supplied +10 to +11 capture
   adds one verified intermediate point; all other unknown intermediate levels
   are floored to the nearest verified cumulative point, never interpolated.
   ------------------------------------------------------------------------- */

export const DM_ENHANCE_RESOURCE_KEYS = Object.freeze([
  'superDragonCore',
  'exoticCrystal',
  'dragonCrystal',
]);

export const DM_ENHANCE_LEVELS = Object.freeze([0, 5, 10, 11, 15, 20, 25]);

export const DM_ENHANCE_MILESTONES = Object.freeze({
  0: Object.freeze({ superDragonCore: 0, exoticCrystal: 0, dragonCrystal: 0 }),
  5: Object.freeze({ superDragonCore: 25200, exoticCrystal: 0, dragonCrystal: 0 }),
  10: Object.freeze({ superDragonCore: 75700, exoticCrystal: 6000, dragonCrystal: 0 }),
  11: Object.freeze({ superDragonCore: 88700, exoticCrystal: 7600, dragonCrystal: 8 }),
  15: Object.freeze({ superDragonCore: 178700, exoticCrystal: 15000, dragonCrystal: 200 }),
  20: Object.freeze({ superDragonCore: 284500, exoticCrystal: 50200, dragonCrystal: 500 }),
  25: Object.freeze({ superDragonCore: 395300, exoticCrystal: 86700, dragonCrystal: 818 }),
});

function floorToMilestone(level) {
  const numeric = Number(level);
  if (!Number.isFinite(numeric) || numeric <= 0) return 0;
  let milestone = 0;
  for (const candidate of DM_ENHANCE_LEVELS) {
    if (candidate <= numeric) milestone = candidate;
    else break;
  }
  return milestone;
}

function normalizeEnhancementLevel(level, fallback) {
  const numeric = Number(level);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(25, Math.max(0, Math.floor(numeric)));
}

function zeroEnhanceResources() {
  return Object.fromEntries(DM_ENHANCE_RESOURCE_KEYS.map((key) => [key, 0]));
}

export function getEnhancementCumulative(level, pieceCount = 1) {
  const base = DM_ENHANCE_MILESTONES[floorToMilestone(level)] || DM_ENHANCE_MILESTONES[0];
  const pieces = cleanCount(pieceCount);
  return Object.fromEntries(DM_ENHANCE_RESOURCE_KEYS.map((key) => [key, base[key] * pieces]));
}

export function computeEnhancementNeed({
  currentLevel = 0,
  targetLevel = 25,
  pieceCount = 1,
  currentLevels,
  owned = {},
} = {}) {
  const current = floorToMilestone(currentLevel);
  const target = floorToMilestone(targetLevel);
  const individualLevels = Array.isArray(currentLevels)
    ? currentLevels.map((level) => floorToMilestone(level))
    : null;
  const pieces = individualLevels?.length || cleanCount(pieceCount);
  const currentCumulative = individualLevels
    ? individualLevels.reduce((total, level) => {
        const cumulative = getEnhancementCumulative(level);
        for (const key of DM_ENHANCE_RESOURCE_KEYS) total[key] += cumulative[key];
        return total;
      }, zeroEnhanceResources())
    : getEnhancementCumulative(current, pieces);
  const targetCumulative = getEnhancementCumulative(target, pieces);
  const reachable = individualLevels
    ? individualLevels.some((level) => target > level)
    : target > current;
  const needed = Object.fromEntries(
    DM_ENHANCE_RESOURCE_KEYS.map((key) => [
      key,
      individualLevels
        ? individualLevels.reduce(
            (total, level) =>
              total +
              Math.max(
                0,
                getEnhancementCumulative(target)[key] - getEnhancementCumulative(level)[key]
              ),
            0
          )
        : reachable
          ? Math.max(0, targetCumulative[key] - currentCumulative[key])
          : 0,
    ])
  );
  const cleanedOwned = Object.fromEntries(
    DM_ENHANCE_RESOURCE_KEYS.map((key) => [key, cleanCount(owned?.[key])])
  );
  const shortfall = Object.fromEntries(
    DM_ENHANCE_RESOURCE_KEYS.map((key) => [key, Math.max(0, needed[key] - cleanedOwned[key])])
  );
  return {
    currentLevel: current,
    targetLevel: target,
    pieceCount: pieces,
    reachable,
    current: { level: current, cumulative: currentCumulative },
    target: { level: target, cumulative: targetCumulative },
    needed,
    owned: cleanedOwned,
    shortfall,
  };
}

export function createDefaultEnhancementState() {
  return {
    currentLevel: 0,
    currentLevels: Object.fromEntries(DM_SLOT_IDS.map((slot) => [slot, 0])),
    targetLevel: 20,
    scope: 'set',
    owned: zeroEnhanceResources(),
  };
}

function normalizeEnhancementState(raw) {
  const next = createDefaultEnhancementState();
  if (!raw || typeof raw !== 'object') return next;
  next.currentLevel = normalizeEnhancementLevel(raw.currentLevel, next.currentLevel);
  next.targetLevel = normalizeEnhancementLevel(raw.targetLevel, next.targetLevel);
  next.scope = raw.scope === 'piece' ? 'piece' : 'set';
  for (const slot of DM_SLOT_IDS) {
    next.currentLevels[slot] = normalizeEnhancementLevel(
      raw.currentLevels?.[slot],
      next.currentLevel
    );
  }
  for (const key of DM_ENHANCE_RESOURCE_KEYS) next.owned[key] = cleanCount(raw.owned?.[key]);
  return next;
}
