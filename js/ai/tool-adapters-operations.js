// Planning adapters for the Buildings planner (Castle 26–30 and the
// all-buildings lookup) and the Eden Operations Lab / Eden Pathing rules.
//
// Every data module loads through a dynamic import, so none of it is part of
// the drawer's first download. Unknown source cells stay null: a blank sheet
// cell is reported as unknown and never filled in, summed or estimated.
import {
  AiToolInputError,
  boundedInteger,
  boundedString,
  normalizeLookupToken,
  rejectUnknownArguments,
  requirePlainArguments,
} from './tool-utils.js';

export const BUILDING_COSTS_SOURCE_ID = 'building-upgrades';
export const EDEN_OPERATIONS_SOURCE_ID = 'eden-operations';

const CASTLE_RESOURCES = Object.freeze([
  'orichalcum',
  'gold',
  'food',
  'lumber',
  'charcoal',
  'marble',
  'iron',
]);

function knownNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function buildingLevels(building) {
  return (building.levels || []).map((level) => ({
    level: level.level,
    orichalcum: knownNumber(level.cost),
    prerequisite: typeof level.prerequisite === 'string' ? level.prerequisite : null,
  }));
}

function unknownCells(levels) {
  return levels.filter((level) => level.orichalcum === null).map((level) => level.level);
}

export async function getBuildingCostsAdapter(rawArguments, context = {}) {
  const args = requirePlainArguments(rawArguments);
  rejectUnknownArguments(args, ['kind', 'building']);
  const kind = boundedString(args.kind, 'kind', { maximum: 12 });
  if (!['castle', 'building', 'list'].includes(kind)) {
    throw new AiToolInputError('malformed_arguments', 'kind must be castle, building, or list.');
  }
  const data = await (context.loadBuildingData || (() => import('../building-upgrade-data.js')))();
  const source = data.BUILDING_UPGRADE_DATA;
  const buildings = Array.isArray(source.buildings) ? source.buildings : [];
  const warnings = [
    'Community Google Sheet values for levels 26-30. A null cost or prerequisite is a blank source cell: say it is unknown and never estimate it.',
  ];
  const baseMeta = {
    sourceId: BUILDING_COSTS_SOURCE_ID,
    asOf: source.observedAt || null,
    completeness: 'complete',
  };

  if (kind === 'castle') {
    const castle = buildings.find((building) => building.id === 'castle');
    const levels = (data.CASTLE_UPGRADE_COSTS || []).map((entry) => {
      const prerequisite = castle?.levels?.find((level) => level.level === entry.toLevel);
      return {
        toLevel: entry.toLevel,
        resources: Object.fromEntries(
          CASTLE_RESOURCES.map((resource) => [resource, knownNumber(entry.resources?.[resource])])
        ),
        prerequisite:
          typeof prerequisite?.prerequisite === 'string' ? prerequisite.prerequisite : null,
      };
    });
    const totals = {};
    const unknownTotals = [];
    for (const resource of CASTLE_RESOURCES) {
      const values = levels.map((level) => level.resources[resource]);
      if (values.some((value) => value === null)) {
        totals[resource] = null;
        unknownTotals.push(resource);
      } else totals[resource] = values.reduce((sum, value) => sum + value, 0);
    }
    return {
      data: {
        kind,
        levels,
        totals26to30: totals,
        unknownTotals,
        source: {
          label: data.CASTLE_UPGRADE_COST_SOURCE?.label || null,
          url: data.CASTLE_UPGRADE_COST_SOURCE?.sourceUrl || source.sourceUrl || null,
          observedAt: data.CASTLE_UPGRADE_COST_SOURCE?.observedAt || source.observedAt || null,
        },
        planner: 'index.html#researchTowers?subtab=buildings',
      },
      meta: {
        ...baseMeta,
        filters: { kind },
        completeness: unknownTotals.length ? 'partial' : 'complete',
        warnings: [
          ...warnings,
          'Castle resources are the direct Castle costs to reach each level; they do not include the other buildings a prerequisite names.',
        ],
      },
    };
  }

  if (kind === 'list') {
    return {
      data: {
        kind,
        currency: source.currency || 'Orichalcum',
        totalOrichalcum: knownNumber(source.totalOrichalcum),
        buildings: buildings.map((building) => {
          const levels = buildingLevels(building);
          return {
            id: building.id,
            name: building.name,
            totalOrichalcum: knownNumber(building.totalOrichalcum),
            unknownLevels: unknownCells(levels),
          };
        }),
        planner: 'index.html#researchTowers?subtab=buildings',
      },
      meta: {
        ...baseMeta,
        filters: { kind },
        completeness: buildings.some((building) => knownNumber(building.totalOrichalcum) === null)
          ? 'partial'
          : 'complete',
        warnings,
      },
    };
  }

  const query = normalizeLookupToken(boundedString(args.building, 'building', { maximum: 60 }));
  const match =
    buildings.find((building) => normalizeLookupToken(building.id) === query) ||
    buildings.find((building) => normalizeLookupToken(building.name) === query) ||
    buildings.find((building) => normalizeLookupToken(building.name).includes(query));
  if (!match) {
    return {
      data: {
        kind,
        building: args.building,
        found: false,
        availableBuildings: buildings.map((building) => building.name),
      },
      meta: {
        ...baseMeta,
        filters: { kind, building: args.building },
        completeness: 'unknown',
        warnings: ['No building matched this name; use one of availableBuildings.'],
      },
    };
  }
  const levels = buildingLevels(match);
  const unknown = unknownCells(levels);
  return {
    data: {
      kind,
      found: true,
      building: {
        id: match.id,
        name: match.name,
        levels,
        totalOrichalcum: knownNumber(match.totalOrichalcum),
        bonusAtLastLevel: typeof match.bonus === 'string' ? match.bonus : null,
        unknownLevels: unknown,
      },
      planner: 'index.html#researchTowers?subtab=buildings',
    },
    meta: {
      ...baseMeta,
      filters: { kind, building: args.building },
      completeness: unknown.length ? 'partial' : 'complete',
      warnings,
    },
  };
}

// ---------------------------------------------------------------------------
// Eden Operations Lab and Eden Pathing

async function defaultReadSharedCounts() {
  const [firebase, { importFirestore }] = await Promise.all([
    import('../firebase.js'),
    import('../firebase-sdk.js'),
  ]);
  const setup = firebase.initFirebase();
  if (!setup?.configured || !setup.db) return { readable: false, reason: 'not_configured' };
  await firebase.ensureAnonymousAuth();
  const { doc, getDoc } = await importFirestore();
  try {
    const snapshot = await getDoc(doc(setup.db, 'eden_operations', 'current'));
    return { readable: true, counts: snapshot.exists() ? snapshot.data()?.counts || {} : null };
  } catch (error) {
    return {
      readable: false,
      reason: String(error?.code || '').includes('permission-denied')
        ? 'not_signed_in'
        : 'unavailable',
    };
  }
}

function objective(model, structure, banner, counts) {
  const plan = model.getSiegePlan(structure.id, banner);
  const key = model.objectiveKey(structure.id, banner);
  const assigned = counts ? model.sharedCountsFor(counts, key) : null;
  const status = assigned ? model.staffingStatus(plan, assigned) : null;
  return {
    key,
    structure: structure.id,
    group: structure.group,
    level: structure.level,
    banner,
    requiredAttackers: plan.attackers,
    requiredSupport: plan.support,
    assignedAttackers: status ? status.attackers : null,
    assignedSupport: status ? status.support : null,
    missing: status ? status.missing : null,
    ready: status ? status.ready : null,
  };
}

export async function getEdenOperationsAdapter(rawArguments, context = {}) {
  const args = requirePlainArguments(rawArguments);
  rejectUnknownArguments(args, ['kind', 'tiles', 'structure', 'banner']);
  const kind = boundedString(args.kind, 'kind', { maximum: 20 });
  if (!['pathing_rule', 'staffing'].includes(kind)) {
    throw new AiToolInputError('malformed_arguments', 'kind must be pathing_rule or staffing.');
  }

  if (kind === 'pathing_rule') {
    const tiles =
      args.tiles === undefined
        ? null
        : boundedInteger(args.tiles, 'tiles', { minimum: 0, maximum: 100_000 });
    const pathing = await (
      context.loadPathingModel || (() => import('../eden-pathing-model.js'))
    )();
    const perPather = pathing.DEFAULT_TILES_PER_PATHER;
    return {
      data: {
        kind,
        tilesPerPather: perPather,
        rule: `One pather per started block of ${perPather} tiles: pathers = ceil(tiles / ${perPather}). Tiles are the ground the route occupies, so ground walked twice counts once.`,
        tiles,
        pathersNeeded: tiles === null ? null : pathing.estimatePathers(tiles, perPather),
        tool: 'index.html#edenHub?subtab=pathing',
      },
      meta: {
        sourceId: EDEN_OPERATIONS_SOURCE_ID,
        filters: { kind, tiles },
        completeness: 'complete',
        warnings: [
          `${perPather} tiles per pather is the alliance rule the officers confirmed; Eden Pathing counts a drawn route's tiles on the terrain grid.`,
        ],
      },
    };
  }

  const banner = args.banner === undefined ? null : args.banner === true;
  if (args.banner !== undefined && typeof args.banner !== 'boolean') {
    throw new AiToolInputError('malformed_arguments', 'banner must be a boolean.');
  }
  const [model, data] = await Promise.all([
    (context.loadOperationsModel || (() => import('../eden-operations-model.js')))(),
    (context.loadOperationsData || (() => import('../eden-operations-data.js')))(),
  ]);
  const structures = data.EDEN_STRUCTURES || [];
  let selected = structures;
  if (args.structure !== undefined) {
    const id = normalizeLookupToken(boundedString(args.structure, 'structure', { maximum: 32 }));
    selected = structures.filter((entry) => entry.id === id.replace(/\s+/gu, '-'));
    if (!selected.length) {
      throw new AiToolInputError(
        'malformed_arguments',
        `structure must be one of ${structures.map((entry) => entry.id).join(', ')}.`
      );
    }
  }

  let shared;
  try {
    shared = await (context.readSharedCounts || defaultReadSharedCounts)();
  } catch {
    shared = { readable: false, reason: 'unavailable' };
  }
  const counts = shared?.readable ? shared.counts || {} : null;
  const banners = banner === null ? [false, true] : [banner];
  const objectives = [];
  for (const structure of selected) {
    for (const flag of banners) {
      const entry = objective(model, structure, flag, counts);
      // Without a structure filter, list only objectives the alliance is counting.
      if (args.structure === undefined && counts && !counts[entry.key]) continue;
      objectives.push(entry);
    }
  }
  const warnings = [
    'Required attackers and support are the published minimums per objective; banner objectives need fewer players.',
  ];
  if (!shared?.readable) {
    warnings.push(
      'The shared staffing counters could not be read, so only the published requirements are shown. Assigned counts are unknown, not zero.'
    );
  } else if (shared.counts === null) {
    warnings.push('The alliance has not counted any objective yet.');
  }
  return {
    data: {
      kind,
      countersReadable: Boolean(shared?.readable),
      unreadableReason: shared?.readable ? null : shared?.reason || 'unavailable',
      objectives: objectives.slice(0, 26),
      tool: 'index.html#edenHub?subtab=operations',
    },
    meta: {
      sourceId: EDEN_OPERATIONS_SOURCE_ID,
      filters: { kind, structure: args.structure ?? null, banner },
      truncated: objectives.length > 26,
      completeness: shared?.readable ? 'complete' : 'partial',
      warnings,
    },
  };
}
