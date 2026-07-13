import { readMaterialPlanState, readResearchProgressState } from './saved-state.js';
import {
  AiToolInputError,
  boolArgument,
  boundedString,
  boundedStringArray,
  finiteNonNegative,
  normalizeLookupToken,
  rejectUnknownArguments,
  requirePlainArguments,
} from './tool-utils.js';

function result(data, sourceId, options = {}) {
  return {
    data,
    meta: {
      sourceId,
      filters: options.filters || {},
      truncated: options.truncated === true,
      completeness: options.completeness || 'complete',
      warnings: options.warnings || [],
    },
  };
}

function requireSavedState(state, category, action) {
  if (!state.exists) {
    throw new AiToolInputError('missing_saved_data', `No saved ${category} data is available.`, {
      setupAction: action,
    });
  }
  if (state.malformed) {
    throw new AiToolInputError(
      'malformed_saved_data',
      `The saved ${category} data is malformed. Open the related tool and save it again.`,
      { setupAction: action }
    );
  }
}

export async function getMaterialPlanSummaryAdapter(rawArguments, context = {}) {
  const args = requirePlainArguments(rawArguments);
  rejectUnknownArguments(args, []);
  const saved = readMaterialPlanState({ storage: context.storage });
  requireSavedState(saved, 'Dragon Master plan', { id: 'open_materials', hash: '#materials' });
  const { normalizeMaterialPlan, calculateMaterialPlan } =
    await import('../material-planner-model.js');
  const plan = normalizeMaterialPlan(saved.value);
  const summary = calculateMaterialPlan(plan);
  return result(
    {
      route: plan.route,
      preset: plan.preset,
      focusedSet: plan.focusedSet,
      targetSlots: summary.targetSlots,
      completedSetCount: summary.completedSetCount,
      remainingSetCount: summary.remainingSetCount,
      totalTargetPieces: summary.totalTargetPieces,
      totalCompletedPieces: summary.totalCompletedPieces,
      totalRemainingPieces: summary.totalRemainingPieces,
      overallProgress: summary.overallProgress,
      focusedSetProgress: summary.focusedSetProgress,
      nextPiece: summary.nextPiece,
      perPieceCost: summary.route.perPiece,
      perSetFullCost: summary.perSetFullCost,
      needed: summary.needed,
      ownedResources: plan.ownedResources,
      ownedPieces: plan.ownedPieces,
      shortfall: summary.shortfall,
      coverage: summary.coverage,
      allComplete: summary.allComplete,
    },
    'dm-material-plan'
  );
}

export async function calculateDmMaterialsAdapter(rawArguments) {
  const args = requirePlainArguments(rawArguments);
  rejectUnknownArguments(args, ['route', 'sets', 'pieces', 'normalGearOwned']);
  const routeId = normalizeLookupToken(args.route);
  if (!['blue', 'purple', 'gold'].includes(routeId)) {
    throw new AiToolInputError('malformed_arguments', 'route must be blue, purple, or gold.');
  }
  const sets = args.sets === undefined ? 1 : Number(args.sets);
  const pieces = args.pieces === undefined ? sets * 6 : Number(args.pieces);
  if (!Number.isInteger(sets) || sets < 1 || sets > 5) {
    throw new AiToolInputError('malformed_arguments', 'sets must be an integer from 1 to 5.');
  }
  if (!Number.isInteger(pieces) || pieces < 1 || pieces > 30) {
    throw new AiToolInputError('malformed_arguments', 'pieces must be an integer from 1 to 30.');
  }
  const normalGearOwned = boolArgument(args.normalGearOwned, false);
  const { DM_ROUTES } = await import('../material-planner-model.js');
  const route = DM_ROUTES[routeId];
  const perPiece = normalGearOwned ? route.dmPieceResources : route.perPiece;
  const total = Object.fromEntries(
    Object.entries(perPiece).map(([resource, amount]) => [resource, amount * pieces])
  );
  return result(
    {
      route: routeId,
      sets,
      pieces,
      normalGearOwned,
      assumption: normalGearOwned
        ? `All required ${route.normalTier} normal troop gear is already crafted.`
        : `Required ${route.normalTier} normal troop gear is not yet crafted.`,
      perPiece,
      total,
      resourceLabels: {
        superDragonite: 'Super Dragonite',
        dragonite: 'Dragonite',
        gems: 'Diamonds / Gems',
      },
      exact: true,
    },
    'dm-material-requirements',
    { filters: { route: routeId, pieces, normalGearOwned } }
  );
}

function normalizeTroop(value) {
  if (value === undefined || value === null || value === '') return null;
  const token = normalizeLookupToken(value);
  if (token === 'footmen') return 'Footmen';
  if (token === 'archer' || token === 'archers') return 'Archer';
  if (token === 'cavalry') return 'Cavalry';
  if (token === 'all') return 'ALL';
  throw new AiToolInputError('malformed_arguments', `Unsupported research troop: ${value}.`);
}

function medalCostAtLevel(node, index) {
  const generic = Number(node.costs?.[index]);
  const warSpecific = Number(
    node.warBadgeCosts?.[index] ?? node.wisdomCosts?.[index] ?? node.wb_costs?.[index]
  );
  const courageSpecific = Number(node.courageCosts?.[index] ?? node.cm_costs?.[index]);
  const genericKnown = Number.isFinite(generic);
  const warKnown = Number.isFinite(warSpecific);
  const courageKnown = Number.isFinite(courageSpecific);
  const type = normalizeLookupToken(node.costType);

  if (type === 'dual') {
    return {
      warBadges: warKnown ? warSpecific : genericKnown ? generic : 0,
      courageMedals: courageKnown ? courageSpecific : 0,
      known: (warKnown || genericKnown) && courageKnown,
    };
  }
  if (type === 'courage') {
    return {
      warBadges: 0,
      courageMedals: genericKnown ? generic : courageKnown ? courageSpecific : 0,
      known: genericKnown || courageKnown,
    };
  }
  if (type === 'wisdom' || type === 'war badge' || type === 'war badges') {
    return {
      warBadges: genericKnown ? generic : warKnown ? warSpecific : 0,
      courageMedals: 0,
      known: genericKnown || warKnown,
    };
  }
  return { warBadges: 0, courageMedals: 0, known: true };
}

function nodeProgressSummary(tree, node, progress) {
  const key = `${tree.id}:${node.id}`;
  const currentLevel = Math.min(node.maxLevel, Math.max(0, Number(progress?.[key]) || 0));
  const total = { warBadges: 0, courageMedals: 0 };
  const spent = { warBadges: 0, courageMedals: 0 };
  let missingCostLevels = 0;
  for (let index = 0; index < node.maxLevel; index += 1) {
    const cost = medalCostAtLevel(node, index);
    total.warBadges += cost.warBadges;
    total.courageMedals += cost.courageMedals;
    if (index < currentLevel) {
      spent.warBadges += cost.warBadges;
      spent.courageMedals += cost.courageMedals;
    }
    if (!cost.known) missingCostLevels += 1;
  }
  return {
    currentLevel,
    remainingLevels: Math.max(0, node.maxLevel - currentLevel),
    total,
    remaining: {
      warBadges: Math.max(0, total.warBadges - spent.warBadges),
      courageMedals: Math.max(0, total.courageMedals - spent.courageMedals),
    },
    missingCostLevels,
  };
}

function addCosts(target, source) {
  target.warBadges += source.warBadges;
  target.courageMedals += source.courageMedals;
}

function summarizeTree(tree, progress, troop) {
  const nodes = tree.nodes.filter((node) => !troop || node.troop === troop || node.troop === 'ALL');
  const totals = { warBadges: 0, courageMedals: 0 };
  const remaining = { warBadges: 0, courageMedals: 0 };
  let totalLevels = 0;
  let completedLevels = 0;
  let missingCostLevels = 0;
  for (const node of nodes) {
    const summary = nodeProgressSummary(tree, node, progress);
    totalLevels += node.maxLevel;
    completedLevels += summary.currentLevel;
    missingCostLevels += summary.missingCostLevels;
    addCosts(totals, summary.total);
    addCosts(remaining, summary.remaining);
  }
  return {
    id: tree.id,
    name: tree.name,
    season: tree.season,
    unlockCondition: tree.unlockCondition || null,
    primaryResource: tree.primaryResource || null,
    nodeCount: nodes.length,
    totalLevels,
    completedLevels,
    progress: totalLevels ? completedLevels / totalLevels : 0,
    knownCosts: totals,
    remainingKnownCosts: remaining,
    missingCostLevels,
  };
}

function resolveResearchTrees(techDatabase, treeIds) {
  if (!treeIds) return { trees: techDatabase, missing: [] };
  const byId = new Map(techDatabase.map((tree) => [tree.id, tree]));
  const byName = new Map(techDatabase.map((tree) => [normalizeLookupToken(tree.name), tree]));
  const trees = [];
  const missing = [];
  for (const value of treeIds) {
    const tree = byId.get(value) || byName.get(normalizeLookupToken(value));
    if (!tree) missing.push(value);
    else if (!trees.includes(tree)) trees.push(tree);
  }
  return { trees, missing };
}

function researchNodeData(tree, node, progress) {
  const summary = nodeProgressSummary(tree, node, progress);
  return {
    treeId: tree.id,
    id: node.id,
    name: node.name,
    troop: node.troop,
    buff: typeof node.buff === 'string' ? node.buff.slice(0, 260) : null,
    costType: node.costType || null,
    maxLevel: node.maxLevel,
    currentLevel: summary.currentLevel,
    remainingLevels: summary.remainingLevels,
    remainingKnownCosts: summary.remaining,
    missingCostLevels: summary.missingCostLevels,
    priority: null,
  };
}

export async function getResearchContextAdapter(rawArguments, context = {}) {
  const args = requirePlainArguments(rawArguments);
  rejectUnknownArguments(args, ['mode', 'treeIds', 'troop', 'includeUserProgress']);
  const mode =
    args.mode === undefined ? 'catalog' : normalizeLookupToken(args.mode).replace(/ /g, '_');
  if (!['catalog', 'details', 'priorities'].includes(mode)) {
    throw new AiToolInputError(
      'malformed_arguments',
      'mode must be catalog, details, or priorities.'
    );
  }
  const treeIds =
    args.treeIds === undefined
      ? null
      : boundedStringArray(args.treeIds, 'treeIds', {
          minimum: 1,
          maximum: 8,
          item: { maximum: 80 },
        });
  if (mode === 'details' && !treeIds) {
    throw new AiToolInputError('malformed_arguments', 'details mode requires treeIds.');
  }
  const troop = normalizeTroop(args.troop);
  const includeUserProgress = boolArgument(args.includeUserProgress, false);
  let progress = {};
  if (includeUserProgress) {
    const saved = readResearchProgressState({ storage: context.storage });
    requireSavedState(saved, 'research progress', { id: 'open_research', hash: '#research' });
    progress = saved.progress;
  }

  const [{ techDatabase }, { getResearchPriority }] = await Promise.all([
    import('../tech-db.js'),
    import('../research-buffs.js'),
  ]);
  const resolved = resolveResearchTrees(techDatabase, treeIds);
  if (treeIds && !resolved.trees.length) {
    throw new AiToolInputError('missing_data', 'None of the requested research trees were found.');
  }
  const trees = resolved.trees.filter(
    (tree) => !troop || tree.nodes.some((node) => node.troop === troop || node.troop === 'ALL')
  );
  const summaries = trees.map((tree) => summarizeTree(tree, progress, troop));
  const warnings = [];
  if (resolved.missing.length) {
    warnings.push(`Unknown research trees were omitted: ${resolved.missing.join(', ')}.`);
  }
  const missingCostLevels = summaries.reduce((sum, tree) => sum + tree.missingCostLevels, 0);
  if (missingCostLevels) {
    warnings.push(
      `${missingCostLevels} medal-cost level${missingCostLevels === 1 ? '' : 's'} lack source data; totals include known costs only.`
    );
  }

  let nodes = [];
  let priorityCandidates = [];
  let truncated = false;
  if (mode === 'details') {
    const allNodes = trees.flatMap((tree) =>
      tree.nodes
        .filter((node) => !troop || node.troop === troop || node.troop === 'ALL')
        .map((node) => researchNodeData(tree, node, progress))
    );
    nodes = allNodes.slice(0, 40);
    truncated = allNodes.length > nodes.length;
  }
  if (mode === 'priorities' || (mode === 'catalog' && includeUserProgress)) {
    priorityCandidates = trees
      .flatMap((tree) =>
        tree.nodes
          .filter((node) => !troop || node.troop === troop || node.troop === 'ALL')
          .map((node) => ({
            ...researchNodeData(tree, node, progress),
            priority: getResearchPriority(node),
          }))
      )
      .filter((node) => node.remainingLevels > 0)
      .sort(
        (a, b) =>
          a.priority.rank - b.priority.rank ||
          a.missingCostLevels - b.missingCostLevels ||
          a.remainingLevels - b.remainingLevels ||
          a.name.localeCompare(b.name)
      )
      .slice(0, 12);
  }
  if (truncated) warnings.push('Node details were truncated to the first 40 matching nodes.');

  const overallLevels = summaries.reduce((sum, tree) => sum + tree.totalLevels, 0);
  const overallCompletedLevels = summaries.reduce((sum, tree) => sum + tree.completedLevels, 0);
  const compactProgressTrees = summaries.map((tree) => ({
    id: tree.id,
    name: tree.name,
    season: tree.season,
    maxed: tree.totalLevels > 0 && tree.completedLevels >= tree.totalLevels,
    progressPercent: tree.totalLevels
      ? Math.round((tree.completedLevels / tree.totalLevels) * 100)
      : 100,
    completedLevels: tree.completedLevels,
    totalLevels: tree.totalLevels,
    remainingLevels: Math.max(0, tree.totalLevels - tree.completedLevels),
  }));
  const compactSavedOverview = mode === 'catalog' && includeUserProgress;

  return result(
    {
      mode,
      troop,
      userProgressIncluded: includeUserProgress,
      overview: compactSavedOverview
        ? {
            progressPercent: overallLevels
              ? Math.round((overallCompletedLevels / overallLevels) * 100)
              : 100,
            completedLevels: overallCompletedLevels,
            totalLevels: overallLevels,
            maxedTrees: compactProgressTrees.filter((tree) => tree.maxed).length,
            remainingTrees: compactProgressTrees.filter((tree) => !tree.maxed).length,
          }
        : null,
      trees: compactSavedOverview ? compactProgressTrees : summaries.slice(0, 40),
      nodes,
      priorityCandidates,
      priorityBasis: priorityCandidates.length
        ? 'Combat-first order: damage, HP, tactical might/resistance, might/resistance, then training speed. Within a stat tier, nodes with known costs and fewer remaining levels come first. This is a deterministic planning priority, not a guaranteed battle outcome.'
        : null,
      missingCostLevels,
    },
    'research-db',
    {
      filters: { mode, treeIds: treeIds || [], troop, includeUserProgress },
      truncated: truncated || (!compactSavedOverview && summaries.length > 40),
      completeness: warnings.length ? 'partial' : 'complete',
      warnings,
    }
  );
}

function calculateAllResearchRemaining(techDatabase, progress) {
  const remaining = { warBadges: 0, courageMedals: 0 };
  let missingCostLevels = 0;
  for (const tree of techDatabase) {
    for (const node of tree.nodes) {
      const summary = nodeProgressSummary(tree, node, progress);
      addCosts(remaining, summary.remaining);
      missingCostLevels += summary.missingCostLevels;
    }
  }
  return { remaining, missingCostLevels };
}

function daysFor(remaining, daily) {
  if (remaining <= 0) return 0;
  if (daily <= 0) return null;
  return Math.ceil(remaining / daily);
}

export async function estimateResearchEtaAdapter(rawArguments, context = {}) {
  const args = requirePlainArguments(rawArguments);
  rejectUnknownArguments(args, ['dailyWarBadges', 'dailyCourageMedals']);
  if (!Object.prototype.hasOwnProperty.call(args, 'dailyWarBadges')) {
    throw new AiToolInputError(
      'missing_required_input',
      'dailyWarBadges is required; progress alone cannot produce an ETA.'
    );
  }
  if (!Object.prototype.hasOwnProperty.call(args, 'dailyCourageMedals')) {
    throw new AiToolInputError(
      'missing_required_input',
      'dailyCourageMedals is required; progress alone cannot produce an ETA.'
    );
  }
  const dailyWarBadges = finiteNonNegative(args.dailyWarBadges, 'dailyWarBadges');
  const dailyCourageMedals = finiteNonNegative(args.dailyCourageMedals, 'dailyCourageMedals');
  const saved = readResearchProgressState({ storage: context.storage });
  requireSavedState(saved, 'research progress', { id: 'open_research', hash: '#research' });
  const { techDatabase } = await import('../tech-db.js');
  const { remaining, missingCostLevels } = calculateAllResearchRemaining(
    techDatabase,
    saved.progress
  );
  const warBadgeDays = daysFor(remaining.warBadges, dailyWarBadges);
  const courageMedalDays = daysFor(remaining.courageMedals, dailyCourageMedals);
  const reachable = warBadgeDays !== null && courageMedalDays !== null;
  const warnings = [];
  if (missingCostLevels) {
    warnings.push(
      `${missingCostLevels} medal-cost levels lack source data; the ETA covers known costs only.`
    );
  }
  if (!reachable) {
    warnings.push('A positive daily income is required for every remaining medal type.');
  }
  return result(
    {
      explicitDailyIncome: { warBadges: dailyWarBadges, courageMedals: dailyCourageMedals },
      remainingKnownCosts: remaining,
      days: { warBadges: warBadgeDays, courageMedals: courageMedalDays },
      estimatedDays: reachable ? Math.max(warBadgeDays, courageMedalDays) : null,
      reachable,
      basis: 'ceil(remaining known medal cost / explicit daily income)',
    },
    'research-db',
    {
      filters: { dailyWarBadges, dailyCourageMedals },
      completeness: warnings.length ? 'partial' : 'complete',
      warnings,
    }
  );
}

export async function calculateEdenLoyaltyAdapter(rawArguments) {
  const args = requirePlainArguments(rawArguments);
  rejectUnknownArguments(args, [
    'acLevels',
    'bonusPoints',
    'savedUnits',
    'campHourlyProduction',
    'processingTimeHours',
    'unitsPerPatch',
    'numPatches',
    'includeUpgradePlan',
  ]);
  if (!Array.isArray(args.acLevels) || args.acLevels.length !== 4) {
    throw new AiToolInputError(
      'malformed_arguments',
      'acLevels must contain exactly four Alliance Center levels.'
    );
  }
  const acLevels = args.acLevels.map((value, index) => {
    const level = finiteNonNegative(value, `acLevels[${index}]`);
    if (!Number.isInteger(level) || level > 20) {
      throw new AiToolInputError(
        'malformed_arguments',
        `acLevels[${index}] must be an integer from 0 to 20.`
      );
    }
    return level;
  });
  const bonusPoints = finiteNonNegative(args.bonusPoints ?? 0, 'bonusPoints');
  const savedUnits = finiteNonNegative(args.savedUnits ?? 0, 'savedUnits');
  const campHourlyProduction = finiteNonNegative(
    args.campHourlyProduction ?? 0,
    'campHourlyProduction'
  );
  const processingTimeHours = finiteNonNegative(
    args.processingTimeHours ?? 0,
    'processingTimeHours'
  );
  const unitsPerPatch = finiteNonNegative(args.unitsPerPatch ?? 0, 'unitsPerPatch');
  const numPatches = finiteNonNegative(args.numPatches ?? 0, 'numPatches');
  const includeUpgradePlan = boolArgument(args.includeUpgradePlan, false);
  if (!Number.isInteger(numPatches)) {
    throw new AiToolInputError('malformed_arguments', 'numPatches must be an integer.');
  }
  if (
    includeUpgradePlan &&
    (!campHourlyProduction || !processingTimeHours || !unitsPerPatch || !numPatches)
  ) {
    throw new AiToolInputError(
      'missing_required_input',
      'An upgrade plan requires positive campHourlyProduction, processingTimeHours, unitsPerPatch, and numPatches.'
    );
  }

  const { calculateLoyaltyInputs, calculatePoisonPercentage, buildUpgradeSequence } =
    await import('../loyalty-calculator.js');
  const calculation = calculateLoyaltyInputs({
    ac1Level: acLevels[0],
    ac2Level: acLevels[1],
    ac3Level: acLevels[2],
    ac4Level: acLevels[3],
    bonusPoints,
    savedUnits,
    campHourlyProduction,
    processingTimeHours,
    unitsPerPatch,
    numPatches,
  });
  const plan = includeUpgradePlan ? buildUpgradeSequence(calculation) : null;
  if (plan?.error) throw new AiToolInputError('malformed_arguments', plan.error);
  const steps = Array.isArray(plan?.upgradeSequence) ? plan.upgradeSequence : [];

  return result(
    {
      acLevels,
      bonusPoints,
      bonusLoyalty: calculation.bonusLoyalty,
      currentLoyalty: calculation.currentLoyalty,
      extractionSite: calculation.extractionSite,
      poisonToNextSites: calculatePoisonPercentage(calculation.currentLoyalty),
      production: includeUpgradePlan
        ? {
            campHourly: calculation.campHourlyProduction,
            campDaily: calculation.campDailyProduction,
            maxProcessingDaily: calculation.possibleProcessingDaily,
            effectiveHourly: calculation.safeHourlyRate,
            isSurplus: calculation.isSurplus,
            balanceDifference: calculation.balanceDiff,
          }
        : null,
      upgradePlan: includeUpgradePlan
        ? {
            totalSteps: steps.length,
            totalHours: plan.cumulativeTime,
            nextSteps: steps.slice(0, 12),
          }
        : null,
      action: { id: 'open_loyalty', label: 'Open Loyalty Calculator', hash: '#loyalty' },
    },
    'eden-loyalty-calculator',
    {
      filters: { includeUpgradePlan },
      truncated: steps.length > 12,
      warnings: steps.length > 12 ? ['Upgrade steps were limited to the next 12.'] : [],
    }
  );
}

export async function calculateEdenUpgradeMaterialsAdapter(rawArguments) {
  const args = requirePlainArguments(rawArguments);
  rejectUnknownArguments(args, [
    'kind',
    'targetSite',
    'acLevels',
    'bonusPoints',
    'savedUnits',
    'building',
    'currentLevel',
    'targetLevel',
  ]);
  const kind = boundedString(args.kind, 'kind', { maximum: 30 });
  if (!['site_requirement', 'site_materials', 'building_materials'].includes(kind)) {
    throw new AiToolInputError('malformed_arguments', `Unsupported Eden material query: ${kind}.`);
  }

  const loyalty = await import('../loyalty-calculator.js');
  const action = { id: 'open_loyalty', label: 'Open Loyalty Calculator', hash: '#loyalty' };

  if (kind === 'site_requirement') {
    const targetSite = boundedString(args.targetSite, 'targetSite', { maximum: 3 }).toUpperCase();
    const requirement = loyalty.getLoyaltyRequirementForSite(targetSite);
    if (!requirement) {
      throw new AiToolInputError('malformed_arguments', 'targetSite must be T1 through T16.');
    }
    return result(
      { kind, targetSite: requirement.site, requiredLoyalty: requirement.loyalty, action },
      'eden-loyalty-calculator',
      { filters: { kind, targetSite } }
    );
  }

  if (kind === 'building_materials') {
    const building = boundedString(args.building, 'building', { maximum: 3 }).toUpperCase();
    if (!['AC1', 'AC2', 'AC3', 'AC4'].includes(building)) {
      throw new AiToolInputError('malformed_arguments', 'building must be AC1, AC2, AC3, or AC4.');
    }
    const currentLevel = finiteNonNegative(args.currentLevel, 'currentLevel');
    const targetLevel = finiteNonNegative(args.targetLevel, 'targetLevel');
    if (
      !Number.isInteger(currentLevel) ||
      !Number.isInteger(targetLevel) ||
      currentLevel > 20 ||
      targetLevel > 20 ||
      targetLevel < currentLevel
    ) {
      throw new AiToolInputError(
        'malformed_arguments',
        'Alliance Center levels must be integers from 0 to 20 and targetLevel cannot be lower than currentLevel.'
      );
    }
    const plan = loyalty.calculateAllianceCenterUpgradeMaterials(
      building,
      currentLevel,
      targetLevel
    );
    return result(
      { kind, ...plan, materialUnit: 'Eden upgrade materials', action },
      'eden-loyalty-calculator',
      { filters: { kind, building, currentLevel, targetLevel } }
    );
  }

  if (!Array.isArray(args.acLevels) || args.acLevels.length !== 4) {
    throw new AiToolInputError(
      'malformed_arguments',
      'acLevels must contain exactly four Alliance Center levels.'
    );
  }
  const acLevels = args.acLevels.map((value, index) => {
    const level = finiteNonNegative(value, `acLevels[${index}]`);
    if (!Number.isInteger(level) || level > 20) {
      throw new AiToolInputError(
        'malformed_arguments',
        `acLevels[${index}] must be an integer from 0 to 20.`
      );
    }
    return level;
  });
  const targetSite = boundedString(args.targetSite, 'targetSite', { maximum: 3 }).toUpperCase();
  const bonusPoints = finiteNonNegative(args.bonusPoints ?? 0, 'bonusPoints');
  const savedUnits = finiteNonNegative(args.savedUnits ?? 0, 'savedUnits');
  const plan = loyalty.calculateLoyaltyTargetMaterials({
    acLevels,
    targetSite,
    bonusPoints,
    savedUnits,
  });
  const steps = plan.steps.slice(0, 12);
  return result(
    {
      kind,
      ...plan,
      steps,
      totalSteps: plan.steps.length,
      materialUnit: 'Eden upgrade materials',
      action,
    },
    'eden-loyalty-calculator',
    {
      filters: { kind, targetSite, acLevels, bonusPoints },
      truncated: plan.steps.length > steps.length,
      warnings:
        plan.steps.length > steps.length ? ['Upgrade steps were limited to the next 12.'] : [],
    }
  );
}

function edenRowSummary(row) {
  return {
    playerName: row.playerName,
    playerKey: row.playerKey || null,
    familyKey: row.familyKey || null,
    finalRank: row.finalRank,
    weightedScore: row.weightedScore,
    contribution: row.contribution,
    exGuildContribution: row.exGuildContribution,
    duties: {
      shieldWalls: row.shieldWalls,
      pathers: row.pathers,
      banners: row.banners,
    },
    conductBonus: row.conductBonus,
    baseReward: row.baseReward,
    finalReward: row.finalReward,
    rewardReason: row.rewardReason,
  };
}

function edenSupportTotal(row) {
  return (
    Number(row.shieldWalls || 0) +
    Number(row.pathers || 0) +
    Number(row.banners || 0) +
    Number(row.conductBonus || 0)
  );
}

function edenRewardRows(rows) {
  const supportRows = rows
    .filter((row) => edenSupportTotal(row) > 0)
    .slice()
    .sort(
      (a, b) =>
        b.weightedScore - a.weightedScore ||
        edenSupportTotal(b) - edenSupportTotal(a) ||
        a.finalRank - b.finalRank
    )
    .slice(0, 4);
  const support = supportRows.map((row, index) => ({
    ...edenRowSummary(row),
    rewardSlot: index + 1,
    plannedReward: index === 0 ? 'guild_master' : 'core',
  }));
  const supportKeys = new Set(supportRows.map((row) => row.playerKey || row.playerName));
  const contribution = [];
  let rewardSlot = 0;
  for (const row of rows
    .filter(
      (candidate) =>
        candidate.currentRank && !supportKeys.has(candidate.playerKey || candidate.playerName)
    )
    .slice()
    .sort((a, b) => b.weightedScore - a.weightedScore || a.finalRank - b.finalRank)) {
    if (row.rewardReason === 'forfeit_premium') {
      if (rewardSlot < 10) {
        contribution.push({
          ...edenRowSummary(row),
          rewardSlot: null,
          plannedReward: 'none',
          skipped: true,
        });
      }
      continue;
    }
    if (rewardSlot >= 10) break;
    rewardSlot += 1;
    contribution.push({
      ...edenRowSummary(row),
      rewardSlot,
      plannedReward: 'core',
      skipped: false,
    });
  }
  return { contribution, support };
}

function edenVoteRewardRows(publicData, rewardRows, rows) {
  const reservedKeys = new Set();
  const reservedFamilies = new Set();
  const reserve = (row) => {
    if (row?.playerKey) reservedKeys.add(row.playerKey);
    if (row?.familyKey) reservedFamilies.add(row.familyKey);
  };
  rewardRows.support.forEach(reserve);
  rewardRows.contribution.filter((row) => !row.skipped).forEach(reserve);
  rows.filter((row) => row.rewardReason === 'forfeit_premium').forEach(reserve);
  const available = (row) =>
    !reservedKeys.has(row?.playerKey) && (!row?.familyKey || !reservedFamilies.has(row.familyKey));
  const management = (publicData.managementVoteResults?.rankings || [])
    .filter(available)
    .slice(0, 3)
    .map((row, index) => ({ ...row, rewardSlot: index + 1, plannedReward: 'core' }));
  management.forEach(reserve);
  const teamSource =
    publicData.publicVoteResults?.published === true
      ? publicData.publicVoteResults?.rankings || []
      : [];
  const team = teamSource
    .filter(available)
    .slice(0, 3)
    .map((row, index) => ({ ...row, rewardSlot: index + 1, plannedReward: 'core' }));
  return { management, team };
}

async function resolveEdenPublicData(context) {
  if (context.edenPublicData && typeof context.edenPublicData === 'object') {
    return context.edenPublicData;
  }
  const { loadEdenPublicData } = await import('./eden-public-data.js');
  return loadEdenPublicData();
}

export async function getEdenContextAdapter(rawArguments, context = {}) {
  const args = requirePlainArguments(rawArguments);
  rejectUnknownArguments(args, ['kind', 'season', 'playerName', 'offset', 'limit']);
  let kind = normalizeLookupToken(boundedString(args.kind, 'kind', { maximum: 40 })).replace(
    / /g,
    '_'
  );
  if (kind === 'saved_ballot_status' || kind === 'saved_ballot') {
    throw new AiToolInputError(
      'unsupported_data',
      'Saved Eden ballots are not available to the assistant in v1.'
    );
  }
  if (
    ![
      'overview',
      'guide',
      'scoring_rules',
      'rankings',
      'player',
      'rewards',
      'voting',
      'published_status',
    ].includes(kind)
  ) {
    throw new AiToolInputError('unsupported_data', 'Unsupported Eden context kind.');
  }
  const season =
    args.season === undefined
      ? ''
      : boundedString(args.season, 'season', { maximum: 40 }).toLowerCase();
  const action = { id: 'open_eden_x1', label: 'Open Eden X1', hash: '#eden-x1' };

  if (kind === 'guide') {
    return result(
      {
        kind,
        season: season || 'X1',
        howToPlay: [
          'Build contribution through the season and help with banners, paths, and shield walls.',
          'Public ranking combines contribution, credited duties, and public conduct adjustments.',
          'Team voting accepts one to four unique teammates while voting is open.',
          'The planned Top 20 flow is 4 Support, 10 Contribution, 3 Management, then 3 Team vote rewards; higher-priority winners are skipped from later tracks.',
        ],
        action,
      },
      'eden-guide'
    );
  }

  if (kind === 'scoring_rules') {
    const { WEIGHTED_CONTRIBUTION_WEIGHTS, DEFAULT_WEIGHTED_CONTRIBUTION_PREMIUM_CUTOFF } =
      await import('../contribution-weighting.js');
    return result(
      {
        kind,
        weights: { ...WEIGHTED_CONTRIBUTION_WEIGHTS },
        defaultPremiumCutoff: DEFAULT_WEIGHTED_CONTRIBUTION_PREMIUM_CUTOFF,
        calculation:
          'weightedScore = contribution + ex-guild contribution + 10,000 per credited banner/path/shield wall + 10,000 per conduct point',
        rankTiers: [
          { ranks: '1-20', reward: 'core' },
          { ranks: '21-110', reward: 'power_house' },
          { ranks: '111-200', reward: 'members' },
          { ranks: '201+', reward: 'standard' },
        ],
        action,
      },
      'eden-scoring-rules'
    );
  }

  const publicData = await resolveEdenPublicData(context);
  const rows = Array.isArray(publicData.rows) ? publicData.rows : [];
  const publicResults = publicData.publicVoteResults || {};
  const warnings = [];
  if (
    season &&
    publicData.season &&
    normalizeLookupToken(season) !== normalizeLookupToken(publicData.season)
  ) {
    warnings.push(`The current public data is for ${publicData.season}, not ${season}.`);
  }
  const base = {
    kind,
    available: true,
    season: publicData.season || season || 'X1',
    asOf: publicData.asOf || null,
    action,
  };

  if (kind === 'published_status') {
    return result(
      {
        ...base,
        published: publicResults.published === true,
        totalBallots: Math.max(0, Math.floor(Number(publicResults.totalBallots) || 0)),
        rankingCount: Array.isArray(publicResults.rankings) ? publicResults.rankings.length : 0,
        resultsAsOf: publicResults.asOf || null,
      },
      'eden-public-status',
      { filters: { season }, completeness: warnings.length ? 'partial' : 'complete', warnings }
    );
  }

  if (kind === 'overview') {
    return result(
      {
        ...base,
        rankedPlayers: rows.length,
        attackCount: Number(publicData.attackCount) || 0,
        leaderboard: rows.slice(0, 10).map(edenRowSummary),
        managementVoteLeaderboard: (publicData.managementVoteResults?.rankings || []).slice(0, 5),
        teamVoteLeaderboard:
          publicResults.published === true ? (publicResults.rankings || []).slice(0, 5) : [],
        voting: {
          open: publicData.voting?.votingOpen !== false,
          closesAt: publicData.voting?.closesAt || null,
          publishedResults: publicResults.published === true,
        },
      },
      'eden-public-overview',
      { filters: { season }, completeness: warnings.length ? 'partial' : 'complete', warnings }
    );
  }

  if (kind === 'rankings') {
    const offset =
      args.offset === undefined ? 0 : Math.floor(finiteNonNegative(args.offset, 'offset'));
    const limit =
      args.limit === undefined
        ? 10
        : Math.min(25, Math.max(1, Math.floor(finiteNonNegative(args.limit, 'limit'))));
    return result(
      {
        ...base,
        total: rows.length,
        offset,
        limit,
        rankings: rows.slice(offset, offset + limit).map(edenRowSummary),
      },
      'eden-public-rankings',
      {
        filters: { season, offset, limit },
        truncated: offset + limit < rows.length,
        completeness: warnings.length ? 'partial' : 'complete',
        warnings,
      }
    );
  }

  if (kind === 'player') {
    const playerName = boundedString(args.playerName, 'playerName', { maximum: 100 });
    const token = normalizeLookupToken(playerName);
    const exact = rows.find((row) => normalizeLookupToken(row.playerName) === token);
    const similar = exact
      ? []
      : rows
          .filter((row) => normalizeLookupToken(row.playerName).includes(token))
          .slice(0, 5)
          .map((row) => row.playerName);
    return result(
      {
        ...base,
        requestedPlayer: playerName,
        player: exact ? edenRowSummary(exact) : null,
        similar,
      },
      'eden-public-player',
      {
        filters: { season, playerName },
        completeness: exact ? 'complete' : 'partial',
        warnings: exact ? warnings : [...warnings, 'No exact public leaderboard player matched.'],
      }
    );
  }

  if (kind === 'rewards') {
    const rewardRows = edenRewardRows(rows);
    const voteRewardRows = edenVoteRewardRows(publicData, rewardRows, rows);
    return result(
      {
        ...base,
        distribution: {
          contribution:
            '10 Core reward slots, excluding support winners; forfeited premium rows are skipped.',
          support: 'Top support row receives Guild Master; support rows 2-4 receive Core.',
          management:
            'Top 3 eligible management-vote names after Support and Contribution winners are reserved.',
          team: 'Top 3 eligible public team-vote names after earlier reward-track winners are reserved.',
          rankTiers: '1-20 Core, 21-110 Power House, 111-200 Members, 201+ Standard.',
        },
        ...rewardRows,
        ...voteRewardRows,
      },
      'eden-public-rewards',
      { filters: { season }, completeness: warnings.length ? 'partial' : 'complete', warnings }
    );
  }

  const closesAt = publicData.voting?.closesAt || null;
  const deadlineMs = closesAt ? Date.parse(closesAt) : 0;
  const closed =
    publicData.voting?.votingOpen === false || (deadlineMs > 0 && deadlineMs <= Date.now());
  return result(
    {
      ...base,
      open: !closed,
      manuallyOpen: publicData.voting?.votingOpen !== false,
      allowEditing: publicData.voting?.allowEditing !== false,
      closesAt,
      rules:
        'Choose 1-4 unique VTS teammates. You may edit only while voting is open and editing is allowed.',
      help: 'Open Eden X1, enter your name, choose one to four unique teammates, review each resolved name, then submit.',
      publicResults: {
        published: publicResults.published === true,
        totalBallots: Number(publicResults.totalBallots) || 0,
        rankings:
          publicResults.published === true ? (publicResults.rankings || []).slice(0, 25) : [],
      },
      managementResults: {
        available: publicData.managementVoteResults?.available === true,
        totalBallots: Number(publicData.managementVoteResults?.totalBallots) || 0,
        totalVotes: Number(publicData.managementVoteResults?.totalVotes) || 0,
        rankings: (publicData.managementVoteResults?.rankings || []).slice(0, 25),
      },
    },
    'eden-public-voting',
    {
      filters: { season },
      completeness: warnings.length ? 'partial' : 'complete',
      warnings,
    }
  );
}
