import {
  STAT_CONTRIBUTION_PRODUCER,
  STAT_CONTRIBUTION_SCHEMA,
  STAT_CONTRIBUTION_SCHEMA_VERSION,
  buildStatContributionSnapshot,
} from './specialization-towers-v2-contributions.js';
import {
  SPECIALIZATION_DATA_REVISION,
  SPECIALIZATION_RESEARCH,
} from './specialization-towers-v2-data.js';
import { normalizeStatSource } from './battle-simulator-stat-sources.js';

export const SPECIALIZATION_BATTLE_ADAPTER_REVISION = 1;

const BATTLE_STAT_MAP = Object.freeze({
  'battle.mightPct': Object.freeze({ statKey: 'might', unit: 'percent' }),
  'battle.resistancePct': Object.freeze({ statKey: 'resistance', unit: 'percent' }),
  'battle.hpPct': Object.freeze({ statKey: 'hp', unit: 'percent' }),
  'battle.tacticalMightPct': Object.freeze({ statKey: 'tacticalMight', unit: 'percent' }),
  'battle.tacticalResistancePct': Object.freeze({
    statKey: 'tacticalResistance',
    unit: 'percent',
  }),
  'battle.damagePct': Object.freeze({ statKey: 'damage', unit: 'percent' }),
  'battle.combatSpeedPoints': Object.freeze({ statKey: 'combatSpeed', unit: 'raw' }),
});

const UNIT_STAT_MAP = Object.freeze({
  'unit.baseMightBonusPct': 'attack',
  'unit.baseResistanceBonusPct': 'defense',
  'unit.baseHpBonusPct': 'hp',
});

const TROOP_IDS = Object.freeze({
  footman: 'footmen',
  footmen: 'footmen',
  infantry: 'footmen',
  archer: 'archers',
  archers: 'archers',
  cavalry: 'cavalry',
});

const CONTEXT_FIELDS = Object.freeze({
  battleMode: 'battleModes',
  engagement: 'engagements',
  event: 'events',
  formation: 'formations',
});

function compareText(left, right) {
  return String(left).localeCompare(String(right));
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

function plainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (!plainObject(value)) return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort(compareText)
      .map((key) => [key, canonical(value[key])])
  );
}

function diagnostic(code, message, details = {}) {
  return { code, message, ...details };
}

function normalizeScenario(rawContext) {
  if (rawContext === undefined || rawContext === null) return {};
  if (!plainObject(rawContext))
    throw new TypeError('Specialization scenario context must be an object.');
  const unknown = Object.keys(rawContext).filter((key) => !Object.hasOwn(CONTEXT_FIELDS, key));
  if (unknown.length > 0) {
    throw new RangeError(`Specialization scenario context has unsupported field "${unknown[0]}".`);
  }
  return Object.fromEntries(
    Object.keys(CONTEXT_FIELDS)
      .filter((key) => rawContext[key] !== undefined && rawContext[key] !== null)
      .map((key) => {
        if (typeof rawContext[key] !== 'string' || rawContext[key].trim() === '') {
          throw new TypeError(`Specialization scenario ${key} must be a non-empty string.`);
        }
        return [key, rawContext[key].trim().toLowerCase()];
      })
  );
}

function normalizeTroopId(value) {
  if (typeof value !== 'string') return null;
  return TROOP_IDS[value.trim().toLowerCase()] ?? null;
}

function normalizeRowId(value) {
  if (value === 'all' || value === undefined || value === null) return null;
  if (value === 'mid') return 'middle';
  return ['front', 'middle', 'back'].includes(value) ? value : null;
}

function normalizeAppliesWhen(value) {
  if (!plainObject(value)) throw new TypeError('Contribution appliesWhen must be an object.');
  const result = {};
  for (const filter of Object.values(CONTEXT_FIELDS)) {
    const values = value[filter];
    if (!Array.isArray(values) || values.length === 0) {
      throw new TypeError(`Contribution appliesWhen.${filter} must be a non-empty array.`);
    }
    const normalized = values.map((item) => {
      if (typeof item !== 'string' || item.trim() === '') {
        throw new TypeError(`Contribution appliesWhen.${filter} values must be strings.`);
      }
      return item.trim().toLowerCase();
    });
    result[filter] = [...new Set(normalized)].sort(compareText);
  }
  return result;
}

function exclusionFor(appliesWhen, context) {
  for (const [contextKey, filterKey] of Object.entries(CONTEXT_FIELDS)) {
    const allowed = appliesWhen[filterKey];
    if (
      !allowed.includes('*') &&
      (!context[contextKey] || !allowed.includes(context[contextKey]))
    ) {
      return contextKey;
    }
  }
  return null;
}

function validateEntry(entry) {
  if (!plainObject(entry)) throw new TypeError('Specialization contribution must be an object.');
  if (typeof entry.id !== 'string' || entry.id.trim() === '') {
    throw new TypeError('Specialization contribution ID must be a non-empty string.');
  }
  if (!['stat', 'effect'].includes(entry.kind)) {
    throw new RangeError(`Specialization contribution "${entry.id}" has unsupported kind.`);
  }
  const troopType = normalizeTroopId(entry.troopTarget);
  if (!troopType) {
    throw new RangeError(`Specialization contribution "${entry.id}" has an unknown troop target.`);
  }
  const appliesWhen = normalizeAppliesWhen(entry.appliesWhen);
  const rowId = normalizeRowId(entry.rowScope);
  if (entry.rowScope !== 'all' && rowId === null) {
    throw new RangeError(`Specialization contribution "${entry.id}" has an unknown row scope.`);
  }
  return { entry, troopType, rowId, appliesWhen };
}

function provenance(snapshot, entry) {
  return {
    adapterRevision: SPECIALIZATION_BATTLE_ADAPTER_REVISION,
    contributionId: entry.id,
    dataRevision: snapshot.producer.dataRevision,
    specializationSource: canonical(entry.source ?? null),
  };
}

function verification() {
  return { basis: STAT_CONTRIBUTION_PRODUCER, status: 'modeled' };
}

function sourceBase(snapshot, record) {
  const { entry, troopType, rowId, appliesWhen } = record;
  return {
    sourceType: 'specialization',
    sourceId: `specialization:${entry.id}`,
    label: String(entry.rawBonusName || entry.description || entry.statKey).trim(),
    amount: entry.value,
    operation: entry.operation,
    appliesTo: {
      battleModes: appliesWhen.battleModes.includes('*') ? [] : appliesWhen.battleModes,
      troopTypes: [troopType],
      rowIds: rowId ? [rowId] : [],
    },
    verification: verification(),
    provenance: provenance(snapshot, entry),
  };
}

function unitSource(snapshot, record, statKey) {
  return {
    ...sourceBase(snapshot, record),
    statKey,
    unit: 'percent',
  };
}

function effect(snapshot, record, exclusionReason) {
  const { entry, troopType, rowId, appliesWhen } = record;
  return {
    id: entry.id,
    effectKey: typeof entry.effectKey === 'string' ? entry.effectKey : null,
    description: String(entry.description || '').trim(),
    troopType,
    rowId,
    appliesWhen,
    active: exclusionReason === null,
    exclusionReason,
    parameters: canonical(entry.parameters ?? null),
    verification: verification(),
    provenance: provenance(snapshot, entry),
  };
}

function emptyResult(revision, diagnostics = []) {
  return deepFreeze({
    sources: [],
    unitSources: [],
    effects: [],
    excluded: [],
    diagnostics: diagnostics.sort((left, right) =>
      JSON.stringify(canonical(left)).localeCompare(JSON.stringify(canonical(right)))
    ),
    summary: {
      sourceCount: 0,
      unitSourceCount: 0,
      effectCount: 0,
      activeEffectCount: 0,
      excludedCount: 0,
      totals: {},
      unitTotals: {},
    },
    revision,
  });
}

function validateSnapshot(snapshot) {
  if (!plainObject(snapshot))
    throw new TypeError('Specialization contribution snapshot must be an object.');
  if (snapshot.schema !== STAT_CONTRIBUTION_SCHEMA) {
    throw new RangeError(
      `Unsupported specialization contribution schema "${String(snapshot.schema)}".`
    );
  }
  if (snapshot.schemaVersion !== STAT_CONTRIBUTION_SCHEMA_VERSION) {
    throw new RangeError(
      `Unsupported specialization contribution schema version "${String(snapshot.schemaVersion)}".`
    );
  }
  if (
    !plainObject(snapshot.producer) ||
    snapshot.producer.id !== STAT_CONTRIBUTION_PRODUCER ||
    typeof snapshot.producer.dataRevision !== 'string'
  ) {
    throw new TypeError('Specialization contribution producer metadata is invalid.');
  }
  if (!Array.isArray(snapshot.entries) || !Array.isArray(snapshot.diagnostics)) {
    throw new TypeError('Specialization contribution entries and diagnostics must be arrays.');
  }
}

export function adaptSpecializationBattleSources(rawSnapshot, rawContext = {}) {
  let context;
  try {
    context = normalizeScenario(rawContext);
    validateSnapshot(rawSnapshot);
  } catch (error) {
    return emptyResult(
      plainObject(rawSnapshot?.producer) ? (rawSnapshot.producer.dataRevision ?? null) : null,
      [diagnostic('invalid-input', error.message)]
    );
  }

  const diagnostics = rawSnapshot.diagnostics.map((item, index) =>
    diagnostic(
      typeof item?.code === 'string' ? item.code : 'producer-diagnostic',
      typeof item?.message === 'string'
        ? item.message
        : 'The specialization producer excluded an unsupported contribution.',
      { producerDiagnosticIndex: index, provenance: canonical(item) }
    )
  );
  const sources = [];
  const unitSources = [];
  const effects = [];
  const excluded = [];
  const groups = new Map();

  rawSnapshot.entries.forEach((entry, index) => {
    const id = typeof entry?.id === 'string' ? entry.id : `invalid-${index}`;
    const group = groups.get(id) ?? [];
    group.push({ entry, index });
    groups.set(id, group);
  });

  for (const [id, group] of [...groups].sort(([left], [right]) => compareText(left, right))) {
    let records;
    try {
      const variants = new Set(group.map(({ entry }) => JSON.stringify(canonical(entry))));
      if (variants.size > 1) {
        diagnostics.push(
          diagnostic('conflicting-contribution', `Contribution "${id}" has conflicting records.`, {
            contributionId: id,
          })
        );
        excluded.push({ id, kind: 'unknown', reason: 'conflicting-contribution' });
        continue;
      }
      if (group.length > 1) {
        diagnostics.push(
          diagnostic(
            'duplicate-contribution',
            `Contribution "${id}" was repeated and applied once.`,
            {
              contributionId: id,
              duplicateCount: group.length - 1,
            }
          )
        );
      }
      records = validateEntry(group[0].entry);
    } catch (error) {
      diagnostics.push(
        diagnostic('invalid-contribution', error.message, {
          contributionId: id,
          index: group[0].index,
        })
      );
      excluded.push({
        id,
        kind: group[0].entry?.kind ?? 'unknown',
        reason: 'invalid-contribution',
      });
      continue;
    }

    const contextReason = exclusionFor(records.appliesWhen, context);
    if (records.entry.kind === 'effect') {
      effects.push(effect(rawSnapshot, records, contextReason));
      if (contextReason) {
        diagnostics.push(
          diagnostic('context-mismatch', `Contribution "${id}" does not match ${contextReason}.`, {
            contributionId: id,
            contextField: contextReason,
          })
        );
        excluded.push({
          id,
          kind: 'effect',
          reason: 'context-mismatch',
          contextField: contextReason,
        });
      }
      continue;
    }

    if (
      typeof records.entry.value !== 'number' ||
      !Number.isFinite(records.entry.value) ||
      records.entry.operation !== 'add'
    ) {
      diagnostics.push(
        diagnostic('invalid-contribution', `Contribution "${id}" has invalid numeric semantics.`, {
          contributionId: id,
        })
      );
      excluded.push({ id, kind: 'stat', reason: 'invalid-contribution' });
      continue;
    }
    const battleMapping = BATTLE_STAT_MAP[records.entry.statKey];
    const mappedUnitStat = UNIT_STAT_MAP[records.entry.statKey];
    if (!battleMapping && !mappedUnitStat) {
      diagnostics.push(
        diagnostic('unmapped-stat', `Contribution "${id}" has no battle stat mapping.`, {
          contributionId: id,
          statKey: records.entry.statKey,
        })
      );
      excluded.push({ id, kind: 'stat', reason: 'unmapped-stat' });
      continue;
    }
    if (contextReason) {
      diagnostics.push(
        diagnostic('context-mismatch', `Contribution "${id}" does not match ${contextReason}.`, {
          contributionId: id,
          contextField: contextReason,
        })
      );
      excluded.push({ id, kind: 'stat', reason: 'context-mismatch', contextField: contextReason });
      continue;
    }

    try {
      if (mappedUnitStat) {
        unitSources.push(unitSource(rawSnapshot, records, mappedUnitStat));
      } else {
        const base = sourceBase(rawSnapshot, records);
        sources.push(
          normalizeStatSource({
            ...base,
            statKey: battleMapping.statKey,
            unit: battleMapping.unit,
          })
        );
      }
    } catch (error) {
      diagnostics.push(diagnostic('invalid-contribution', error.message, { contributionId: id }));
      excluded.push({ id, kind: 'stat', reason: 'invalid-contribution' });
    }
  }

  const sortSources = (left, right) =>
    compareText(left.sourceId, right.sourceId) || compareText(left.statKey, right.statKey);
  sources.sort(sortSources);
  unitSources.sort(sortSources);
  effects.sort((left, right) => compareText(left.id, right.id));
  excluded.sort(
    (left, right) => compareText(left.id, right.id) || compareText(left.reason, right.reason)
  );
  diagnostics.sort((left, right) =>
    JSON.stringify(canonical(left)).localeCompare(JSON.stringify(canonical(right)))
  );

  const totals = {};
  for (const source of sources)
    totals[source.statKey] = (totals[source.statKey] ?? 0) + source.amount;
  const unitTotals = {};
  for (const source of unitSources) {
    unitTotals[source.statKey] = (unitTotals[source.statKey] ?? 0) + source.amount;
  }
  return deepFreeze({
    sources,
    unitSources,
    effects,
    excluded,
    diagnostics,
    summary: {
      sourceCount: sources.length,
      unitSourceCount: unitSources.length,
      effectCount: effects.length,
      activeEffectCount: effects.filter(({ active }) => active).length,
      excludedCount: excluded.length,
      totals,
      unitTotals,
    },
    revision: rawSnapshot.producer.dataRevision,
  });
}

export function resolveSpecializationBattleSources(state, context = {}) {
  let snapshot;
  try {
    snapshot = buildStatContributionSnapshot(state);
  } catch (error) {
    return emptyResult(null, [diagnostic('invalid-state', error.message)]);
  }
  return adaptSpecializationBattleSources(snapshot, context);
}

function canonicalCombatSpeedIdentity(entry) {
  const source = entry?.provenance?.specializationSource;
  const research = SPECIALIZATION_RESEARCH[source?.researchId];
  const passive = research?.passiveSkill?.cavalry;
  if (
    !research ||
    research.passiveSkillNodeId === null ||
    passive?.name !== 'Movement in Unison' ||
    passive?.effect !== 'When all are Cavalry, Combat Speed +10' ||
    passive?.isAttribute !== true ||
    passive?.context !== 'general' ||
    passive?.bonusName !== 'Combat Speed (All Cavalry)' ||
    passive?.bonusValue !== 10 ||
    passive?.isFlat !== true
  ) {
    return null;
  }

  const nodeId = research.passiveSkillNodeId;
  const contributionId =
    `${SPECIALIZATION_DATA_REVISION}/cavalry/${research.id}/passive/` +
    `${nodeId}/troop-specific/effect`;
  const effectKey = [
    STAT_CONTRIBUTION_PRODUCER,
    'cavalry',
    research.id,
    'passive',
    nodeId,
    'troop-specific',
  ].join('.');
  const expectedProvenance = {
    adapterRevision: SPECIALIZATION_BATTLE_ADAPTER_REVISION,
    contributionId,
    dataRevision: SPECIALIZATION_DATA_REVISION,
    specializationSource: {
      columnId: research.column,
      kind: 'passive',
      nodeId,
      researchId: research.id,
      troopId: 'cavalry',
      type: 'specialization-tower',
    },
  };
  if (
    entry?.id !== contributionId ||
    entry?.effectKey !== effectKey ||
    JSON.stringify(canonical(entry?.provenance)) !==
      JSON.stringify(canonical(expectedProvenance))
  ) {
    return null;
  }
  return { contributionId };
}

export function adaptSpecializationEffectsToRuntime({ sideA, sideB } = {}) {
  const definitions = [];
  const diagnostics = [];

  for (const [sideId, side] of [
    ['A', sideA],
    ['B', sideB],
  ]) {
    const rows = Array.isArray(side?.rows) ? side.rows : [];
    const effects = Array.isArray(side?.effects) ? side.effects : [];
    const allCavalry =
      rows.length === 3 &&
      rows.every((row) => plainObject(row) && normalizeTroopId(row.type) === 'cavalry');
    const activeCombatSpeedIds = new Set();

    effects.forEach((entry, effectIndex) => {
      const contributionId =
        typeof entry?.id === 'string' && entry.id.trim()
          ? entry.id.trim()
          : `unknown-${effectIndex + 1}`;
      const context = {
        side: sideId,
        contributionId,
        provenance: canonical(entry?.provenance ?? null),
      };
      const source = entry?.provenance?.specializationSource;
      const parameters = entry?.parameters;
      const canonicalIdentity = canonicalCombatSpeedIdentity(entry);
      const verifiedPassive =
        entry?.active === true &&
        entry?.exclusionReason === null &&
        entry?.verification?.basis === STAT_CONTRIBUTION_PRODUCER &&
        entry?.verification?.status === 'modeled' &&
        canonicalIdentity !== null;
      const exactCombatSpeed =
        plainObject(parameters) &&
        entry?.description === 'When all are Cavalry, Combat Speed +10' &&
        parameters.bonusName === 'Combat Speed (All Cavalry)' &&
        parameters.bonusValue === 10 &&
        parameters.conditional === true &&
        parameters.isFlat === true &&
        entry?.troopType === 'cavalry' &&
        entry?.rowId === null &&
        source?.type === 'specialization-tower';

      if (!verifiedPassive || !exactCombatSpeed) {
        diagnostics.push(
          diagnostic(
            entry?.active === false
              ? 'inactive-specialization-effect'
              : 'unsupported-specialization-effect',
            'The specialization effect is inactive or lacks the exact verified battle semantics.',
            context
          )
        );
        return;
      }
      if (!allCavalry) {
        diagnostics.push(
          diagnostic(
            'specialization-formation-mismatch',
            'Combat Speed (All Cavalry) requires all three configured rows to be Cavalry.',
            context
          )
        );
        return;
      }
      activeCombatSpeedIds.add(canonicalIdentity.contributionId);
    });

    if (activeCombatSpeedIds.size > 0) {
      [...activeCombatSpeedIds].sort(compareText).forEach((contributionId) => {
        rows.forEach((row, rowIndex) => {
          const rowId = ['front', 'middle', 'back'][rowIndex];
          definitions.push({
            id: `specialization:${sideId}:${contributionId}:${rowId}`,
            version: '1.0.0',
            phase: 'round-start',
            source: `${sideId}:${rowId}`,
            target: { type: 'self', count: 1, range: 0 },
            type: 'stat-modifier',
            chance: 1,
            conditions: [],
            stat: 'combatSpeed',
            amount: 10,
            duration: 1,
            stacks: 1,
            maxStacks: activeCombatSpeedIds.size,
          });
        });
      });
    }
  }

  definitions.sort((left, right) => compareText(left.id, right.id));
  diagnostics.sort((left, right) =>
    JSON.stringify(canonical(left)).localeCompare(JSON.stringify(canonical(right)))
  );
  return deepFreeze({ definitions, diagnostics });
}
