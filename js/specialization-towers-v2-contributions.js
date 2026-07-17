import {
  SPECIALIZATION_COLUMNS,
  SPECIALIZATION_DATA_REVISION,
  SPECIALIZATION_LEGION_SKILLS,
  SPECIALIZATION_RESEARCH,
  SPECIALIZATION_TROOPS,
} from './specialization-towers-v2-data.js';
import {
  buildSpecializationSnapshot,
  getColumnProgress,
  getResearchProgress,
} from './specialization-towers-v2-model.js';

export const STAT_CONTRIBUTION_SCHEMA = 'roc-vts.stat-contributions';
export const STAT_CONTRIBUTION_SCHEMA_VERSION = 1;
export const STAT_CONTRIBUTION_PRODUCER = 'specialization-towers-v2';

function compareStableStrings(left, right) {
  const leftText = String(left);
  const rightText = String(right);
  if (leftText < rightText) return -1;
  if (leftText > rightText) return 1;
  return 0;
}

const DEFAULT_APPLIES_WHEN = Object.freeze({
  battleModes: Object.freeze(['*']),
  engagements: Object.freeze(['*']),
  events: Object.freeze(['*']),
  formations: Object.freeze(['*']),
});

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

function normalizeBonusName(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[()]/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function slug(value) {
  const result = String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return result || 'unknown';
}

function mapStat(bonusName, isFlat) {
  const name = normalizeBonusName(bonusName);
  const percentage = { operation: 'add', unit: 'percentage-point' };

  if (/^base might(?: all)?$/.test(name)) {
    return { statKey: 'unit.baseMightBonusPct', ...percentage };
  }
  if (/^base resistance(?: all)?$/.test(name)) {
    return { statKey: 'unit.baseResistanceBonusPct', ...percentage };
  }
  if (/^base hp(?: all)?$/.test(name)) {
    return { statKey: 'unit.baseHpBonusPct', ...percentage };
  }
  if (/^tactical might(?: all)?$/.test(name)) {
    return { statKey: 'battle.tacticalMightPct', ...percentage };
  }
  if (/^tactical resistance(?: all)?$/.test(name)) {
    return { statKey: 'battle.tacticalResistancePct', ...percentage };
  }
  if (/^(?:rally )?might(?: all)?$/.test(name)) {
    return { statKey: 'battle.mightPct', ...percentage };
  }
  if (/^(?:rally )?resistance(?: all)?$/.test(name)) {
    return { statKey: 'battle.resistancePct', ...percentage };
  }
  if (/^hp(?: all)?$/.test(name)) {
    return { statKey: 'battle.hpPct', ...percentage };
  }
  if (/^damage(?: all| dealt?| deal)?$/.test(name)) {
    return { statKey: 'battle.damagePct', ...percentage };
  }
  if (/^combat speed(?: all)?$/.test(name)) {
    return { statKey: 'battle.combatSpeedPoints', operation: 'add', unit: 'flat-point' };
  }
  if (/^marching speed(?: all)?$/.test(name)) {
    return {
      statKey: isFlat ? 'utility.marchingSpeedPoints' : 'utility.marchingSpeedPct',
      operation: 'add',
      unit: isFlat ? 'flat-point' : 'percentage-point',
    };
  }
  return null;
}

function normalizeContext(context) {
  const raw = typeof context === 'string' && context.trim() ? context.trim() : 'general';
  const appliesWhen = {
    battleModes: ['*'],
    engagements: ['*'],
    events: ['*'],
    formations: ['*'],
  };

  switch (raw) {
    case 'nonSiege':
      appliesWhen.engagements = ['field'];
      break;
    case 'siege':
      appliesWhen.engagements = ['siege-attack', 'siege-defense'];
      break;
    case 'siegeAttack':
    case 'siegeAttacks':
      appliesWhen.engagements = ['siege-attack'];
      break;
    case 'siegeDefense':
      appliesWhen.engagements = ['siege-defense'];
      break;
    case 'roc':
      appliesWhen.events = ['eden'];
      break;
    case 'battlefield':
      appliesWhen.events = ['boh'];
      break;
    case 'rallyJoin':
      appliesWhen.formations = ['rally-join'];
      break;
    case 'initiatingRally':
    case 'rallyLead':
      appliesWhen.formations = ['rally-lead'];
      break;
    case 'reinforcingAllies':
      appliesWhen.formations = ['reinforce'];
      break;
    default:
      break;
  }

  return { raw, appliesWhen };
}

function normalizeRowScope(row) {
  if (row === undefined || row === null || row === '' || row === 'all') return 'all';
  if (row === 'front' || row === 1 || row === '1') return 'front';
  if (row === 'middle' || row === 'mid' || row === 2 || row === '2') return 'middle';
  if (row === 'back' || row === 3 || row === '3') return 'back';
  return String(row);
}

function makeSource({ troopId, research, sourceKind, sourceId, nodeId, milestonePercent }) {
  const source = {
    type: 'specialization-tower',
    kind: sourceKind,
    troopId,
    researchId: research?.id ?? null,
    columnId: research?.column ?? Number(sourceId),
  };
  if (nodeId !== undefined) source.nodeId = nodeId;
  if (milestonePercent !== undefined) source.milestonePercent = milestonePercent;
  return source;
}

function makeBaseId({ troopId, research, sourceKind, sourceId }) {
  return [
    slug(SPECIALIZATION_DATA_REVISION),
    slug(troopId),
    research ? slug(research.id) : `column-${slug(sourceId)}`,
    slug(sourceKind),
    slug(sourceId),
  ].join('/');
}

function isConditionalBonus(bonus) {
  const name = normalizeBonusName(bonus.bonusName);
  return (
    bonus.isConditional === true ||
    bonus.context === 'skill' ||
    name.startsWith('conditional ') ||
    name.includes('unit countering') ||
    name.includes('countering vs') ||
    name.includes('damage reduction vs') ||
    name.includes('equal units') ||
    name.includes('first 2 rounds')
  );
}

function buildTarget(troopId, rowScope) {
  return {
    entityKinds: ['troop-row'],
    troopTypes: [troopId],
    rowScopes: [rowScope],
  };
}

function buildEffectEntry({
  troopId,
  research,
  sourceKind,
  sourceId,
  nodeId,
  milestonePercent,
  bonus,
  secondBonus = false,
  troopSpecific = false,
}) {
  const context = normalizeContext(bonus.context);
  const rowScope = normalizeRowScope(bonus.row);
  const baseId = makeBaseId({ troopId, research, sourceKind, sourceId });
  const variant = secondBonus ? 'second' : troopSpecific ? 'troop-specific' : 'primary';
  return {
    id: `${baseId}/${variant}/effect`,
    kind: 'effect',
    effectKey: [
      STAT_CONTRIBUTION_PRODUCER,
      slug(troopId),
      research ? slug(research.id) : `column-${slug(sourceId)}`,
      slug(sourceKind),
      slug(sourceId),
      variant,
    ].join('.'),
    source: makeSource({
      troopId,
      research,
      sourceKind,
      sourceId,
      nodeId,
      milestonePercent,
    }),
    description: String(bonus.effect || bonus.desc || bonus.name || bonus.bonusName || '').trim(),
    context: context.raw,
    appliesWhen: context.appliesWhen,
    troopTarget: troopId,
    rowScope,
    target: buildTarget(troopId, rowScope),
    secondBonus,
    troopSpecific,
    parameters: {
      bonusName: bonus.bonusName ?? null,
      bonusValue: Number.isFinite(bonus.bonusValue) ? bonus.bonusValue : null,
      isFlat: bonus.isFlat === true,
      conditional: bonus.isConditional === true || isConditionalBonus(bonus),
    },
  };
}

function buildNumericEntry({
  troopId,
  research,
  sourceKind,
  sourceId,
  nodeId,
  milestonePercent,
  bonus,
  mapping,
  secondBonus = false,
  troopSpecific = false,
}) {
  const context = normalizeContext(bonus.context);
  const rowScope = normalizeRowScope(bonus.row);
  const baseId = makeBaseId({ troopId, research, sourceKind, sourceId });
  const variant = secondBonus ? 'second' : troopSpecific ? 'troop-specific' : 'primary';
  return {
    id: `${baseId}/${variant}/${slug(mapping.statKey)}`,
    kind: 'stat',
    source: makeSource({
      troopId,
      research,
      sourceKind,
      sourceId,
      nodeId,
      milestonePercent,
    }),
    statKey: mapping.statKey,
    operation: mapping.operation,
    unit: mapping.unit,
    value: bonus.bonusValue,
    rawBonusName: String(bonus.bonusName),
    context: context.raw,
    appliesWhen: context.appliesWhen,
    troopTarget: troopId,
    rowScope,
    sourceRow: bonus.row ?? null,
    target: buildTarget(troopId, rowScope),
    secondBonus,
    troopSpecific,
  };
}

function addBonus(entries, diagnostics, options) {
  const bonus = options.bonus;
  if (isConditionalBonus(bonus)) {
    entries.push(buildEffectEntry(options));
    return;
  }

  const mapping = mapStat(bonus.bonusName, bonus.isFlat === true);
  if (!mapping || !Number.isFinite(bonus.bonusValue)) {
    const baseId = makeBaseId(options);
    const variant = options.secondBonus
      ? 'second'
      : options.troopSpecific
        ? 'troop-specific'
        : 'primary';
    diagnostics.push({
      id: `${baseId}/${variant}/unmapped`,
      code: !mapping ? 'unmapped-stat' : 'invalid-stat-value',
      severity: 'warning',
      source: makeSource(options),
      bonusName: bonus.bonusName ?? null,
      bonusValue: Number.isFinite(bonus.bonusValue) ? bonus.bonusValue : null,
      effect: String(bonus.effect || '').trim(),
      context: bonus.context ?? 'general',
      rowScope: normalizeRowScope(bonus.row),
      secondBonus: options.secondBonus === true,
      troopSpecific: options.troopSpecific === true,
    });
    return;
  }

  entries.push(buildNumericEntry({ ...options, mapping }));
}

function addNodeContributions(entries, diagnostics, troopId, research, node) {
  const troopOverride = node.troopSpecific?.[troopId] ?? null;
  const primaryBonus = troopOverride
    ? {
        ...node,
        ...troopOverride,
        context: troopOverride.context ?? node.context,
        row: troopOverride.row ?? node.row,
        isFlat: troopOverride.isFlat ?? node.isFlat,
      }
    : node;
  const baseOptions = {
    troopId,
    research,
    sourceKind: 'node',
    sourceId: node.id,
    nodeId: node.id,
  };
  addBonus(entries, diagnostics, {
    ...baseOptions,
    bonus: primaryBonus,
    troopSpecific: Boolean(troopOverride),
  });

  if (node.secondBonus) {
    addBonus(entries, diagnostics, {
      ...baseOptions,
      bonus: {
        ...node.secondBonus,
        context: node.secondBonus.context ?? node.context,
        row: node.secondBonus.row ?? node.row,
        isFlat: node.secondBonus.isFlat ?? node.isFlat,
      },
      secondBonus: true,
    });
  }
}

function addMilestoneContribution(entries, diagnostics, troopId, research, milestone) {
  addBonus(entries, diagnostics, {
    troopId,
    research,
    sourceKind: 'milestone',
    sourceId: milestone.percent,
    milestonePercent: milestone.percent,
    bonus: milestone,
  });
}

function addPassiveContribution(entries, troopId, research) {
  const passive = research.passiveSkill?.[troopId];
  if (!passive) return;
  entries.push(
    buildEffectEntry({
      troopId,
      research,
      sourceKind: 'passive',
      sourceId: research.passiveSkillNodeId,
      nodeId: research.passiveSkillNodeId,
      bonus: { ...passive, isConditional: true },
      troopSpecific: true,
    })
  );
}

function addLegionContribution(entries, troopId, columnId) {
  const skill = SPECIALIZATION_LEGION_SKILLS[columnId]?.[troopId];
  if (!skill) return;
  entries.push(
    buildEffectEntry({
      troopId,
      research: null,
      sourceKind: 'legion',
      sourceId: columnId,
      bonus: { ...skill, isConditional: true, context: skill.context ?? 'general' },
      troopSpecific: true,
    })
  );
}

function assertUniqueIds(entries) {
  const ids = new Set();
  for (const entry of entries) {
    if (ids.has(entry.id)) {
      throw new Error(`Duplicate specialization contribution ID "${entry.id}".`);
    }
    ids.add(entry.id);
  }
}

export function buildStatContributionSnapshot(state) {
  const selection = buildSpecializationSnapshot(state);
  const entries = [];
  const diagnostics = [];

  for (const troopId of SPECIALIZATION_TROOPS) {
    for (const researchId of RESEARCH_IDS) {
      const research = SPECIALIZATION_RESEARCH[researchId];
      const progress = getResearchProgress(selection, troopId, researchId);
      const selected = new Set(progress.selectedNodeIds);
      for (const node of research.nodes) {
        if (selected.has(node.id)) {
          addNodeContributions(entries, diagnostics, troopId, research, node);
        }
      }
      for (const milestone of progress.unlockedMilestones) {
        addMilestoneContribution(entries, diagnostics, troopId, research, milestone);
      }
      if (progress.passiveSelected) addPassiveContribution(entries, troopId, research);
    }

    for (const columnId of COLUMN_IDS) {
      if (getColumnProgress(selection, troopId, columnId).legionSkillUnlocked) {
        addLegionContribution(entries, troopId, columnId);
      }
    }
  }

  entries.sort((left, right) => compareStableStrings(left.id, right.id));
  diagnostics.sort((left, right) => compareStableStrings(left.id, right.id));
  assertUniqueIds(entries);
  assertUniqueIds(diagnostics);

  return {
    schema: STAT_CONTRIBUTION_SCHEMA,
    schemaVersion: STAT_CONTRIBUTION_SCHEMA_VERSION,
    producer: {
      id: STAT_CONTRIBUTION_PRODUCER,
      dataRevision: SPECIALIZATION_DATA_REVISION,
    },
    selection,
    entries,
    diagnostics,
  };
}

export function summarizeStatContributions(snapshot) {
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
    throw new TypeError('Stat contribution snapshot must be an object.');
  }
  if (snapshot.schema !== STAT_CONTRIBUTION_SCHEMA) {
    throw new RangeError(`Unsupported stat contribution schema "${String(snapshot.schema)}".`);
  }
  if (snapshot.schemaVersion !== STAT_CONTRIBUTION_SCHEMA_VERSION) {
    throw new RangeError(
      `Unsupported stat contribution schema version "${String(snapshot.schemaVersion)}".`
    );
  }
  if (!Array.isArray(snapshot.entries)) {
    throw new TypeError('Stat contribution entries must be an array.');
  }

  const byStat = {};
  const byTroop = Object.fromEntries(SPECIALIZATION_TROOPS.map((troopId) => [troopId, {}]));
  const scopedTotals = new Map();
  let statEntryCount = 0;
  let effectEntryCount = 0;

  for (const entry of snapshot.entries) {
    if (entry.kind === 'effect') {
      effectEntryCount += 1;
      continue;
    }
    if (entry.kind !== 'stat' || !Number.isFinite(entry.value)) continue;
    statEntryCount += 1;
    const nextStatTotal = (byStat[entry.statKey] || 0) + entry.value;
    if (!Number.isFinite(nextStatTotal)) {
      throw new RangeError(`Stat contribution total overflowed for "${entry.statKey}".`);
    }
    byStat[entry.statKey] = nextStatTotal;
    if (byTroop[entry.troopTarget]) {
      const nextTroopTotal =
        (byTroop[entry.troopTarget][entry.statKey] || 0) + entry.value;
      if (!Number.isFinite(nextTroopTotal)) {
        throw new RangeError(
          `Troop contribution total overflowed for "${entry.troopTarget}:${entry.statKey}".`
        );
      }
      byTroop[entry.troopTarget][entry.statKey] = nextTroopTotal;
    }
    const scopeKey = [
      entry.troopTarget,
      entry.rowScope,
      entry.context,
      entry.statKey,
      entry.unit,
    ].join('|');
    const nextScopedTotal = (scopedTotals.get(scopeKey) || 0) + entry.value;
    if (!Number.isFinite(nextScopedTotal)) {
      throw new RangeError(`Scoped contribution total overflowed for "${scopeKey}".`);
    }
    scopedTotals.set(scopeKey, nextScopedTotal);
  }

  return {
    statEntryCount,
    effectEntryCount,
    diagnosticCount: Array.isArray(snapshot.diagnostics) ? snapshot.diagnostics.length : 0,
    byStat,
    byTroop,
    byScope: [...scopedTotals.entries()]
      .sort(([left], [right]) => compareStableStrings(left, right))
      .map(([key, value]) => {
        const [troopTarget, rowScope, context, statKey, unit] = key.split('|');
        return { troopTarget, rowScope, context, statKey, unit, value };
      }),
  };
}

/**
 * Applies a final battle percentage to raw unit-card points.
 * Example: 70 points at 500% is 350, never 570 and never 420.
 */
export function resolveBasePointTotal(basePoints, battlePercent) {
  if (!Number.isFinite(basePoints) || basePoints < 0) {
    throw new TypeError('Base points must be a finite non-negative number.');
  }
  if (!Number.isFinite(battlePercent) || battlePercent < 0) {
    throw new TypeError('Battle percent must be a finite non-negative number.');
  }
  const result = basePoints * (battlePercent / 100);
  if (!Number.isFinite(result)) {
    throw new RangeError('Resolved base-point total exceeds the supported numeric range.');
  }
  return result;
}

export { DEFAULT_APPLIES_WHEN };
