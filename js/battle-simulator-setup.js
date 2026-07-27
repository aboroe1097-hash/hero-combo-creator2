import {
  BATTLE_ROWS,
  BATTLE_STAT_CONTRACT,
  BATTLE_STAT_KEYS,
  STAT_INPUT_MODES,
  TROOP_TIERS,
  TROOP_TYPES,
  UNIT_STAT_KEYS,
  calculateTroopStats,
} from './battle-simulator-data.js';
import {
  EQUIPMENT_LOADOUT_SCHEMA_VERSION,
  createDefaultEquipmentLoadout,
  normalizeEquipmentLoadout,
} from './battle-simulator-equipment.js';
import { createEmptyResearchSnapshot as createLiveEmptyResearchSnapshot } from './battle-simulator-research.js';
import {
  EQUIPMENT_EFFECT_OVERRIDE_SCHEMA_VERSION,
  normalizeEquipmentEffectOverrides,
} from './battle-simulator-equipment-overrides.js';
import { buildSpecializationSnapshot } from './specialization-towers-v2-model.js';

export { EQUIPMENT_LOADOUT_SCHEMA_VERSION };

export const SETUP_SCHEMA_VERSION = 3;
export const LEGACY_SETUP_SCHEMA_VERSION = 1;
export const PREVIOUS_SETUP_SCHEMA_VERSION = 2;
export const RESEARCH_SNAPSHOT_SCHEMA_VERSION = 1;
export const CAPTURED_SOURCE_SNAPSHOT_SCHEMA_VERSION = 1;

const SIDE_IDS = Object.freeze(['A', 'B']);
const DEFAULT_BATTLE_MODE = 'pvp-field';
const DEFAULT_SCENARIO_CONTEXT = Object.freeze({
  battleMode: DEFAULT_BATTLE_MODE,
  engagement: 'field',
  event: '*',
  formation: '*',
});
const SCENARIO_VALUES = Object.freeze({
  battleMode: Object.freeze(['pvp-field']),
  engagement: Object.freeze(['field', 'siege-attack', 'siege-defense']),
  event: Object.freeze(['*', 'eden', 'boh']),
  formation: Object.freeze(['*', 'rally-lead', 'rally-join', 'reinforce']),
});
const ALLOWED_ITERATIONS = Object.freeze([1, 10, 50, 100, 500]);
const DIAGNOSTIC_SEVERITIES = Object.freeze(['info', 'warning', 'error']);
const UINT32_MAX = 0xffffffff;
const MAX_TROOPS = 10_000_000;
const MAX_STAT_VALUE = 5_000;
const MAX_COMBAT_SPEED = 10_000;
const MAX_STRIKE_VARIANCE_PCT = 25;
const MAX_SOURCE_RECORDS = 1_024;
const MAX_DIAGNOSTICS = 1_024;
const MAX_TEXT_LENGTH = 512;
const MAX_IDENTIFIER_LENGTH = 128;
const MAX_SOURCE_ID_LENGTH = 256;
const MAX_RESEARCH_ENTRIES = 2_000;
const MAX_PROFILE_LABEL_LENGTH = 48;
const MAX_METADATA_DEPTH = 6;
const MAX_SPECIALIZATION_METADATA_DEPTH = 10;
const MAX_METADATA_ENTRIES = 2_048;
const RAW_BATTLE_STATS = new Set(['combatSpeed']);

function requireObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object.`);
  }
  return value;
}

function requireOwn(object, key, label) {
  if (!Object.hasOwn(object, key)) {
    throw new TypeError(`${label} is missing required field "${key}".`);
  }
  return object[key];
}

function normalizeBoundedNumber(value, label, maximum, minimum = 0) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`${label} must be a finite number.`);
  }
  if (value < minimum || value > maximum) {
    throw new RangeError(`${label} must be between ${minimum} and ${maximum}.`);
  }
  return value;
}

function normalizeSafeInteger(value, label, minimum, maximum) {
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) {
    throw new TypeError(`${label} must be a safe integer.`);
  }
  if (value < minimum || value > maximum) {
    throw new RangeError(`${label} must be between ${minimum} and ${maximum}.`);
  }
  return value;
}

function normalizeText(value, label, { nullable = false, maximum = MAX_TEXT_LENGTH } = {}) {
  if (nullable && (value === null || value === undefined)) return null;
  if (typeof value !== 'string' || value.trim() === '') {
    throw new TypeError(`${label} must be a non-empty string.`);
  }
  const normalized = value.trim();
  if (normalized.length > maximum) {
    throw new RangeError(`${label} must contain at most ${maximum} characters.`);
  }
  return normalized;
}

function normalizeOptionalText(value, label, maximum = MAX_IDENTIFIER_LENGTH) {
  return normalizeText(value, label, { nullable: true, maximum });
}

function normalizeUnitValues(rawValues, label) {
  const values = requireObject(rawValues, label);
  const candidates = {
    attack: Object.hasOwn(values, 'attack') ? values.attack : values.might,
    defense: Object.hasOwn(values, 'defense') ? values.defense : values.resistance,
    hp: values.hp,
  };
  return Object.fromEntries(
    UNIT_STAT_KEYS.map((key) => [
      key,
      normalizeBoundedNumber(requireOwn(candidates, key, label), `${label} ${key}`, MAX_STAT_VALUE),
    ])
  );
}

function normalizeBattleStats(rawStats, label, { legacy = false } = {}) {
  const stats = requireObject(rawStats, label);
  return Object.fromEntries(
    BATTLE_STAT_KEYS.map((key) => {
      const maximum = key === 'combatSpeed' ? MAX_COMBAT_SPEED : MAX_STAT_VALUE;
      const fallback = key === 'damageMitigation' && legacy ? 0 : undefined;
      const value = Object.hasOwn(stats, key) ? stats[key] : fallback;
      if (value === undefined) requireOwn(stats, key, label);
      return [key, normalizeBoundedNumber(value, `${label} ${key}`, maximum)];
    })
  );
}

function normalizeTroopType(value, label) {
  if (typeof value !== 'string') {
    throw new TypeError(`${label} troop type must be a string.`);
  }
  const type = value.trim().toLowerCase();
  if (!TROOP_TYPES.includes(type)) {
    throw new RangeError(
      `${label} has unsupported troop type "${value}". Use one of: ${TROOP_TYPES.join(', ')}.`
    );
  }
  return type;
}

function normalizeTroopTier(value, label) {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new TypeError(`${label} troop tier must be an integer.`);
  }
  if (!TROOP_TIERS.includes(value)) {
    throw new RangeError(
      `${label} has unsupported troop tier T${value}. Use one of: ${TROOP_TIERS.map((tier) => `T${tier}`).join(', ')}.`
    );
  }
  return value;
}

function normalizeMode(value, label) {
  if (![STAT_INPUT_MODES.ADD_BONUSES, STAT_INPUT_MODES.FINAL_TOTALS].includes(value)) {
    throw new RangeError(
      `${label} has unsupported stat input mode "${String(value)}". Use "${STAT_INPUT_MODES.ADD_BONUSES}" or "${STAT_INPUT_MODES.FINAL_TOTALS}".`
    );
  }
  return value;
}

function isSensitiveMetadataKey(key) {
  const words = String(key)
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  const compact = words.join('');
  return (
    compact.includes('localstorage') ||
    compact.includes('sessionstorage') ||
    words.some((word) =>
      [
        'pin',
        'password',
        'passcode',
        'secret',
        'credential',
        'token',
        'auth',
        'authorization',
      ].some((sensitive) => word === sensitive || word.startsWith(sensitive))
    )
  );
}

function normalizeMetadata(
  value,
  label,
  depth = 0,
  ancestors = new WeakSet(),
  maximumDepth = MAX_METADATA_DEPTH
) {
  if (value === null || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError(`${label} must contain finite numbers.`);
    return value;
  }
  if (typeof value === 'string') {
    if (value.length > MAX_TEXT_LENGTH) {
      throw new RangeError(`${label} strings must contain at most ${MAX_TEXT_LENGTH} characters.`);
    }
    return value;
  }
  if (!value || typeof value !== 'object') {
    throw new TypeError(`${label} must contain only JSON-compatible values.`);
  }
  if (depth >= maximumDepth) {
    throw new RangeError(`${label} must not exceed ${maximumDepth} nested levels.`);
  }
  if (ancestors.has(value)) throw new TypeError(`${label} must not contain cycles.`);
  ancestors.add(value);

  if (Array.isArray(value)) {
    if (value.length > MAX_METADATA_ENTRIES) {
      throw new RangeError(`${label} arrays may contain at most ${MAX_METADATA_ENTRIES} entries.`);
    }
    const normalized = value.map((item) =>
      normalizeMetadata(item, label, depth + 1, ancestors, maximumDepth)
    );
    ancestors.delete(value);
    return normalized;
  }

  const entries = Object.keys(value).sort();
  if (entries.length > MAX_METADATA_ENTRIES) {
    throw new RangeError(`${label} objects may contain at most ${MAX_METADATA_ENTRIES} fields.`);
  }
  const normalized = {};
  for (const key of entries) {
    if (isSensitiveMetadataKey(key)) {
      throw new TypeError(`${label} must not contain sensitive field "${key}".`);
    }
    normalized[key] = normalizeMetadata(value[key], label, depth + 1, ancestors, maximumDepth);
  }
  ancestors.delete(value);
  return normalized;
}

function normalizeStringArray(value, label, allowedValues = null) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new TypeError(`${label} must be an array.`);
  if (value.length > MAX_METADATA_ENTRIES) {
    throw new RangeError(`${label} may contain at most ${MAX_METADATA_ENTRIES} values.`);
  }
  const normalized = [
    ...new Set(
      value.map((entry) => normalizeText(entry, label, { maximum: MAX_IDENTIFIER_LENGTH }))
    ),
  ].sort((left, right) => left.localeCompare(right));
  if (allowedValues) {
    for (const entry of normalized) {
      if (!allowedValues.includes(entry)) {
        throw new RangeError(`${label} contains unsupported value "${entry}".`);
      }
    }
  }
  return normalized;
}

function normalizeAppliesTo(value, label) {
  const appliesTo = value === undefined || value === null ? {} : requireObject(value, label);
  return {
    battleModes: normalizeStringArray(appliesTo.battleModes, `${label} battleModes`),
    troopTypes: normalizeStringArray(appliesTo.troopTypes, `${label} troopTypes`, TROOP_TYPES),
    rowIds: normalizeStringArray(
      appliesTo.rowIds ?? appliesTo.rows,
      `${label} rowIds`,
      BATTLE_ROWS.map(({ id }) => id)
    ),
  };
}

function normalizeStatSource(rawSource, label, { excluded = false } = {}) {
  const source = requireObject(rawSource, label);
  const statKey = normalizeText(requireOwn(source, 'statKey', label), `${label} statKey`, {
    maximum: MAX_IDENTIFIER_LENGTH,
  });
  // Future stat sources are ignored by older setup readers instead of crashing imports.
  if (!BATTLE_STAT_KEYS.includes(statKey)) return null;
  const operation = normalizeText(requireOwn(source, 'operation', label), `${label} operation`, {
    maximum: 24,
  });
  if (operation !== 'add') throw new RangeError(`${label} operation must be "add".`);
  const expectedUnit = RAW_BATTLE_STATS.has(statKey) ? 'raw' : 'percent';
  const unit = normalizeText(requireOwn(source, 'unit', label), `${label} unit`, { maximum: 24 });
  if (unit !== expectedUnit) {
    throw new RangeError(`${label} ${statKey} must use unit "${expectedUnit}".`);
  }

  const normalized = {
    sourceType: normalizeText(requireOwn(source, 'sourceType', label), `${label} sourceType`, {
      maximum: MAX_IDENTIFIER_LENGTH,
    }),
    sourceId: normalizeText(requireOwn(source, 'sourceId', label), `${label} sourceId`, {
      maximum: MAX_SOURCE_ID_LENGTH,
    }),
    label: normalizeText(requireOwn(source, 'label', label), `${label} label`),
    statKey,
    amount: normalizeBoundedNumber(
      requireOwn(source, 'amount', label),
      `${label} amount`,
      MAX_STAT_VALUE,
      -MAX_STAT_VALUE
    ),
    operation: 'add',
    unit,
    appliesTo: normalizeAppliesTo(source.appliesTo, `${label} appliesTo`),
    verification: normalizeMetadata(source.verification ?? null, `${label} verification`),
    provenance: normalizeMetadata(source.provenance ?? null, `${label} provenance`),
  };
  if (excluded) {
    normalized.exclusionReason = normalizeText(
      requireOwn(source, 'exclusionReason', label),
      `${label} exclusionReason`
    );
  }
  return normalized;
}

function normalizeExcludedSource(rawSource, label) {
  const source = requireObject(rawSource, label);
  const normalized = {
    sourceType: normalizeText(requireOwn(source, 'sourceType', label), `${label} sourceType`, {
      maximum: MAX_IDENTIFIER_LENGTH,
    }),
    sourceId: normalizeText(requireOwn(source, 'sourceId', label), `${label} sourceId`, {
      maximum: MAX_SOURCE_ID_LENGTH,
    }),
    label: normalizeText(requireOwn(source, 'label', label), `${label} label`),
    reason: normalizeText(
      source.reason ?? requireOwn(source, 'exclusionReason', label),
      `${label} reason`
    ),
    verification: normalizeMetadata(source.verification ?? null, `${label} verification`),
    provenance: normalizeMetadata(source.provenance ?? null, `${label} provenance`),
  };

  if (source.statKey !== undefined) {
    normalized.statKey = normalizeText(source.statKey, `${label} statKey`, {
      maximum: MAX_IDENTIFIER_LENGTH,
    });
  }
  if (source.amount !== undefined) {
    normalized.amount = normalizeBoundedNumber(
      source.amount,
      `${label} amount`,
      MAX_STAT_VALUE,
      -MAX_STAT_VALUE
    );
  }
  if (source.operation !== undefined) {
    const operation = normalizeText(source.operation, `${label} operation`, { maximum: 24 });
    if (operation !== 'add') throw new RangeError(`${label} operation must be "add".`);
    normalized.operation = 'add';
  }
  if (source.unit !== undefined) {
    const unit = normalizeText(source.unit, `${label} unit`, { maximum: 24 });
    if (!['percent', 'raw'].includes(unit)) {
      throw new RangeError(`${label} unit must be "percent" or "raw".`);
    }
    if (normalized.statKey && BATTLE_STAT_KEYS.includes(normalized.statKey)) {
      const expectedUnit = RAW_BATTLE_STATS.has(normalized.statKey) ? 'raw' : 'percent';
      if (unit !== expectedUnit) {
        throw new RangeError(`${label} ${normalized.statKey} must use unit "${expectedUnit}".`);
      }
    }
    normalized.unit = unit;
  }
  if (source.appliesTo !== undefined) {
    normalized.appliesTo = normalizeAppliesTo(source.appliesTo, `${label} appliesTo`);
  }
  return normalized;
}

function sourceSortKey(source) {
  return JSON.stringify([
    source.sourceType,
    source.sourceId,
    source.statKey,
    source.amount,
    source.appliesTo,
    source.reason ?? source.exclusionReason ?? '',
  ]);
}

function normalizeSourceRecords(value, label, { excluded = false } = {}) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new TypeError(`${label} must be an array.`);
  if (value.length > MAX_SOURCE_RECORDS) {
    throw new RangeError(`${label} may contain at most ${MAX_SOURCE_RECORDS} records.`);
  }
  const normalized = value
    .map((source, index) => normalizeStatSource(source, `${label} ${index + 1}`, { excluded }))
    .filter(Boolean)
    .sort((left, right) => sourceSortKey(left).localeCompare(sourceSortKey(right)));
  const ids = new Set();
  for (const source of normalized) {
    const identity = `${source.sourceType}:${source.sourceId}:${source.statKey}`;
    if (ids.has(identity))
      throw new RangeError(`${label} contains duplicate source "${identity}".`);
    ids.add(identity);
  }
  return normalized;
}

function normalizeExcludedSourceRecords(value, label) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new TypeError(`${label} must be an array.`);
  if (value.length > MAX_SOURCE_RECORDS) {
    throw new RangeError(`${label} may contain at most ${MAX_SOURCE_RECORDS} records.`);
  }
  return value
    .map((source, index) => normalizeExcludedSource(source, `${label} ${index + 1}`))
    .sort((left, right) => sourceSortKey(left).localeCompare(sourceSortKey(right)));
}

function normalizeDiagnostics(value, label) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new TypeError(`${label} must be an array.`);
  if (value.length > MAX_DIAGNOSTICS) {
    throw new RangeError(`${label} may contain at most ${MAX_DIAGNOSTICS} records.`);
  }
  return value
    .map((entry, index) => {
      const diagnostic = requireObject(entry, `${label} ${index + 1}`);
      const severity = normalizeText(
        requireOwn(diagnostic, 'severity', `${label} ${index + 1}`),
        `${label} ${index + 1} severity`,
        { maximum: 16 }
      );
      if (!DIAGNOSTIC_SEVERITIES.includes(severity)) {
        throw new RangeError(`${label} ${index + 1} has unsupported severity "${severity}".`);
      }
      return {
        code: normalizeText(
          requireOwn(diagnostic, 'code', `${label} ${index + 1}`),
          `${label} ${index + 1} code`,
          { maximum: MAX_IDENTIFIER_LENGTH }
        ),
        severity,
        message: normalizeText(
          requireOwn(diagnostic, 'message', `${label} ${index + 1}`),
          `${label} ${index + 1} message`
        ),
        sourceId: normalizeOptionalText(
          diagnostic.sourceId,
          `${label} ${index + 1} sourceId`,
          MAX_SOURCE_ID_LENGTH
        ),
      };
    })
    .sort((left, right) =>
      JSON.stringify([left.severity, left.code, left.sourceId, left.message]).localeCompare(
        JSON.stringify([right.severity, right.code, right.sourceId, right.message])
      )
    );
}

function normalizeCatalogRevisions(value, label) {
  const revisions = value === undefined || value === null ? {} : requireObject(value, label);
  return {
    research: normalizeOptionalText(revisions.research, `${label} research`),
    equipment: normalizeOptionalText(revisions.equipment, `${label} equipment`),
  };
}

export function createEmptyCapturedSourceSnapshot() {
  return {
    schemaVersion: CAPTURED_SOURCE_SNAPSHOT_SCHEMA_VERSION,
    catalogRevisions: { research: null, equipment: null },
    sources: [],
    excludedSources: [],
    diagnostics: [],
  };
}

function normalizeCapturedSourceSnapshot(value, label) {
  if (value === undefined || value === null) return createEmptyCapturedSourceSnapshot();
  const snapshot = requireObject(value, label);
  const schemaVersion = requireOwn(snapshot, 'schemaVersion', label);
  if (schemaVersion !== CAPTURED_SOURCE_SNAPSHOT_SCHEMA_VERSION) {
    throw new RangeError(
      `${label} schemaVersion must be ${CAPTURED_SOURCE_SNAPSHOT_SCHEMA_VERSION}.`
    );
  }
  return {
    schemaVersion: CAPTURED_SOURCE_SNAPSHOT_SCHEMA_VERSION,
    catalogRevisions: normalizeCatalogRevisions(snapshot.catalogRevisions, `${label} revisions`),
    sources: normalizeSourceRecords(snapshot.sources, `${label} sources`),
    excludedSources: normalizeExcludedSourceRecords(
      snapshot.excludedSources,
      `${label} excluded sources`
    ),
    diagnostics: normalizeDiagnostics(snapshot.diagnostics, `${label} diagnostics`),
  };
}

export function createEmptyResearchSnapshot(battleMode = DEFAULT_BATTLE_MODE) {
  return createLiveEmptyResearchSnapshot({ battleMode });
}

function normalizeSavedProgress(value, label) {
  const progress = requireObject(value, label);
  const exists = requireOwn(progress, 'exists', label);
  const malformed = requireOwn(progress, 'malformed', label);
  if (typeof exists !== 'boolean') throw new TypeError(`${label} exists must be a boolean.`);
  if (typeof malformed !== 'boolean') {
    throw new TypeError(`${label} malformed must be a boolean.`);
  }
  return {
    exists,
    malformed,
    entryCount: normalizeSafeInteger(
      requireOwn(progress, 'entryCount', label),
      `${label} entryCount`,
      0,
      MAX_RESEARCH_ENTRIES
    ),
  };
}

function normalizeResearchSnapshot(value, label, battleMode) {
  if (value === undefined || value === null) return createEmptyResearchSnapshot(battleMode);
  const snapshot = requireObject(value, label);
  const schemaVersion = requireOwn(snapshot, 'schemaVersion', label);
  if (schemaVersion !== RESEARCH_SNAPSHOT_SCHEMA_VERSION) {
    throw new RangeError(`${label} schemaVersion must be ${RESEARCH_SNAPSHOT_SCHEMA_VERSION}.`);
  }
  const normalizedMode = normalizeBattleMode(snapshot.battleMode ?? battleMode);
  return {
    schemaVersion: RESEARCH_SNAPSHOT_SCHEMA_VERSION,
    catalogVersion: normalizeOptionalText(snapshot.catalogVersion, `${label} catalogVersion`),
    battleMode: normalizedMode,
    sources: normalizeSourceRecords(snapshot.sources, `${label} sources`),
    excludedSources: normalizeExcludedSourceRecords(
      snapshot.excludedSources,
      `${label} excluded sources`
    ),
    diagnostics: normalizeDiagnostics(snapshot.diagnostics, `${label} diagnostics`),
    savedProgress: normalizeSavedProgress(
      snapshot.savedProgress ??
        createLiveEmptyResearchSnapshot({ battleMode: normalizedMode }).savedProgress,
      `${label} savedProgress`
    ),
  };
}

export function createEmptyEquipmentLoadout() {
  return createDefaultEquipmentLoadout();
}

function normalizeEditableFields(rawFields, label, { legacy = false } = {}) {
  const fields = requireObject(rawFields, label);
  return {
    type: normalizeTroopType(requireOwn(fields, 'type', label), label),
    tier: normalizeTroopTier(requireOwn(fields, 'tier', label), label),
    troops: normalizeSafeInteger(
      requireOwn(fields, 'troops', label),
      `${label} troops`,
      0,
      MAX_TROOPS
    ),
    unitValues: normalizeUnitValues(
      requireOwn(fields, legacy ? 'baseValues' : 'unitValues', label),
      `${label} unit values`
    ),
    bonuses: normalizeBattleStats(requireOwn(fields, 'bonuses', label), `${label} bonuses`, {
      legacy,
    }),
    finals: normalizeBattleStats(requireOwn(fields, 'finals', label), `${label} final totals`, {
      legacy,
    }),
  };
}

function normalizeRow(rawRow, sideId, index, options) {
  const rowDefinition = BATTLE_ROWS[index];
  const label = `Side ${sideId} ${rowDefinition.label} row`;
  const row = requireObject(rawRow, label);
  const id = requireOwn(row, 'id', label);
  if (id !== rowDefinition.id) {
    throw new RangeError(
      `${label} must use row id "${rowDefinition.id}"; received "${String(id)}".`
    );
  }

  const normalized = {
    id: rowDefinition.id,
    ...normalizeEditableFields(row, label, options),
    heroName: normalizeOptionalText(row.heroName, `${label} heroName`),
    skillIds: normalizeStringArray(row.skillIds, `${label} skillIds`),
    open: index === 0,
    customized: false,
  };
  if (Object.hasOwn(row, 'open')) {
    if (typeof row.open !== 'boolean') throw new TypeError(`${label} open must be a boolean.`);
    normalized.open = row.open;
  }
  if (Object.hasOwn(row, 'customized')) {
    if (typeof row.customized !== 'boolean') {
      throw new TypeError(`${label} customized must be a boolean.`);
    }
    normalized.customized = row.customized;
  }
  return normalized;
}

function createEmptyEquipmentEffectOverrides() {
  return {
    overrideSchemaVersion: EQUIPMENT_EFFECT_OVERRIDE_SCHEMA_VERSION,
    overrides: [],
    diagnostics: [],
  };
}

function normalizeEquipmentOverrides(value) {
  if (value === undefined || value === null) return createEmptyEquipmentEffectOverrides();
  return structuredClone(normalizeEquipmentEffectOverrides(value));
}

export function createDefaultBattleProfileDraft(sideId) {
  if (!SIDE_IDS.includes(sideId)) {
    throw new RangeError(
      'Battle profile draft sideId must be one of: ' + SIDE_IDS.join(', ') + '.'
    );
  }
  return {
    label: 'Side ' + sideId + ' Profile',
    sources: {
      research: true,
      equipment: true,
      towers: true,
    },
    researchOverrides: [],
    towersApplied: false,
  };
}

function normalizeBattleProfileSources(value, label) {
  const sources = value === undefined || value === null ? {} : requireObject(value, label);
  return Object.fromEntries(
    ['research', 'equipment', 'towers'].map((key) => {
      const enabled = sources[key] ?? true;
      if (typeof enabled !== 'boolean') {
        throw new TypeError(label + ' ' + key + ' must be a boolean.');
      }
      return [key, enabled];
    })
  );
}

function normalizeResearchOverrides(value, label) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new TypeError(label + ' must be an array.');
  if (value.length > MAX_RESEARCH_ENTRIES) {
    throw new RangeError(label + ' may contain at most ' + MAX_RESEARCH_ENTRIES + ' overrides.');
  }
  const normalized = value
    .map((entry, index) => {
      const overrideLabel = label + ' ' + (index + 1);
      const override = requireObject(entry, overrideLabel);
      return {
        sourceId: normalizeText(
          requireOwn(override, 'sourceId', overrideLabel),
          overrideLabel + ' sourceId',
          { maximum: MAX_SOURCE_ID_LENGTH }
        ),
        amount: normalizeBoundedNumber(
          requireOwn(override, 'amount', overrideLabel),
          overrideLabel + ' amount',
          MAX_STAT_VALUE
        ),
      };
    })
    .sort((left, right) => left.sourceId.localeCompare(right.sourceId));
  const sourceIds = new Set();
  for (const override of normalized) {
    if (sourceIds.has(override.sourceId)) {
      throw new RangeError(label + ' contains duplicate sourceId ' + override.sourceId + '.');
    }
    sourceIds.add(override.sourceId);
  }
  return normalized;
}

function normalizeBattleProfileDraft(value, sideId, label) {
  if (value === undefined || value === null) return createDefaultBattleProfileDraft(sideId);
  const draft = requireObject(value, label);
  const defaults = createDefaultBattleProfileDraft(sideId);
  const normalized = {
    label: normalizeText(draft.label ?? defaults.label, label + ' label', {
      maximum: MAX_PROFILE_LABEL_LENGTH,
    }),
    sources: normalizeBattleProfileSources(draft.sources, label + ' sources'),
    researchOverrides: normalizeResearchOverrides(
      draft.researchOverrides,
      label + ' researchOverrides'
    ),
    towersApplied: draft.towersApplied ?? false,
  };
  if (typeof normalized.towersApplied !== 'boolean') {
    throw new TypeError(label + ' towersApplied must be a boolean.');
  }
  if (draft.equipmentLoadout !== undefined && draft.equipmentLoadout !== null) {
    normalized.equipmentLoadout = normalizeEquipmentLoadout(draft.equipmentLoadout);
  }
  if (draft.equipmentEffectOverrides !== undefined && draft.equipmentEffectOverrides !== null) {
    normalized.equipmentEffectOverrides = normalizeEquipmentOverrides(
      draft.equipmentEffectOverrides
    );
  }
  if (draft.towerState !== undefined && draft.towerState !== null) {
    normalized.towerState = structuredClone(buildSpecializationSnapshot(draft.towerState));
  }
  return normalized;
}

function createEmptySpecializationCapture() {
  return {
    snapshot: null,
    result: {
      sources: [],
      unitSources: [],
      effects: [],
      excluded: [],
      diagnostics: [],
      summary: {
        sourceCount: 0,
        unitSourceCount: 0,
        effectCount: 0,
        activeEffectCount: 0,
        excludedCount: 0,
        totals: {},
        unitTotals: {},
      },
      revision: null,
    },
  };
}

function normalizeSpecializationCapture(value, label) {
  if (value === undefined || value === null) return createEmptySpecializationCapture();
  const capture = requireObject(value, label);
  return {
    snapshot:
      capture.snapshot === undefined || capture.snapshot === null
        ? null
        : normalizeMetadata(
            capture.snapshot,
            `${label} snapshot`,
            0,
            new WeakSet(),
            MAX_SPECIALIZATION_METADATA_DEPTH
          ),
    result:
      capture.result === undefined || capture.result === null
        ? createEmptySpecializationCapture().result
        : normalizeMetadata(
            capture.result,
            `${label} result`,
            0,
            new WeakSet(),
            MAX_SPECIALIZATION_METADATA_DEPTH
          ),
  };
}

function normalizeSide(rawSide, sideId, battleMode, { legacy = false } = {}) {
  const label = `Side ${sideId}`;
  const side = requireObject(rawSide, label);
  const rows = requireOwn(side, 'rows', label);
  if (!Array.isArray(rows) || rows.length !== BATTLE_ROWS.length) {
    throw new RangeError(`${label} must contain exactly three rows: Front, Middle, Back.`);
  }
  const researchEnabled = legacy ? false : requireOwn(side, 'researchEnabled', label);
  if (typeof researchEnabled !== 'boolean') {
    throw new TypeError(`${label} researchEnabled must be a boolean.`);
  }

  return {
    mode: normalizeMode(requireOwn(side, 'mode', label), label),
    profileDraft: normalizeBattleProfileDraft(side.profileDraft, sideId, label + ' profile draft'),
    researchEnabled,
    researchSnapshot: normalizeResearchSnapshot(
      side.researchSnapshot,
      `${label} research snapshot`,
      battleMode
    ),
    equipmentLoadout: normalizeEquipmentLoadout(side.equipmentLoadout),
    equipmentEffectOverrides: normalizeEquipmentOverrides(side.equipmentEffectOverrides),
    specializationCapture: normalizeSpecializationCapture(
      side.specializationCapture,
      `${label} specialization capture`
    ),
    capturedSourceSnapshot: normalizeCapturedSourceSnapshot(
      side.capturedSourceSnapshot,
      `${label} captured source snapshot`
    ),
    sideDefaults: normalizeEditableFields(
      requireOwn(side, 'sideDefaults', label),
      `${label} defaults`,
      { legacy }
    ),
    rows: rows.map((row, index) => normalizeRow(row, sideId, index, { legacy })),
  };
}

function normalizeSavedAt(value) {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string' || value.trim() === '' || !Number.isFinite(Date.parse(value))) {
    throw new TypeError('Setup savedAt must be null or a valid ISO date-time string.');
  }
  if (new Date(value).toISOString() !== value) {
    throw new TypeError('Setup savedAt must use ISO date-time format.');
  }
  return value;
}

function normalizeBattleMode(value) {
  if (value === undefined) return DEFAULT_BATTLE_MODE;
  if (typeof value !== 'string') throw new TypeError('Setup battleMode must be a string.');
  return value;
}

function normalizeScenarioContext(value, fallbackBattleMode = DEFAULT_BATTLE_MODE) {
  const context = value === undefined || value === null ? {} : requireObject(value, 'Scenario');
  const normalized = {
    battleMode: context.battleMode ?? fallbackBattleMode,
    engagement: context.engagement ?? DEFAULT_SCENARIO_CONTEXT.engagement,
    event: context.event ?? DEFAULT_SCENARIO_CONTEXT.event,
    formation: context.formation ?? DEFAULT_SCENARIO_CONTEXT.formation,
  };
  for (const [key, allowed] of Object.entries(SCENARIO_VALUES)) {
    if (typeof normalized[key] !== 'string' || !allowed.includes(normalized[key])) {
      throw new RangeError(`Scenario ${key} must be one of: ${allowed.join(', ')}.`);
    }
  }
  return normalized;
}

function normalizeAssumptions(value) {
  const assumptions =
    value === undefined || value === null ? {} : requireObject(value, 'Setup assumptions');
  const acknowledged = assumptions.acknowledged ?? false;
  if (typeof acknowledged !== 'boolean') {
    throw new TypeError('Setup assumptions acknowledged must be a boolean.');
  }
  return {
    acknowledged,
    diagnostics: normalizeDiagnostics(assumptions.diagnostics, 'Setup assumption diagnostics'),
  };
}

function normalizeRunOptions(rawRunOptions) {
  const runOptions = requireObject(rawRunOptions, 'Setup runOptions');
  const iterations = normalizeSafeInteger(
    requireOwn(runOptions, 'iterations', 'Setup runOptions'),
    'Setup iterations',
    1,
    500
  );
  if (!ALLOWED_ITERATIONS.includes(iterations)) {
    throw new RangeError(
      `Setup iterations must be one of: ${ALLOWED_ITERATIONS.join(', ')}; received ${iterations}.`
    );
  }
  return {
    iterations,
    seed: normalizeSafeInteger(
      requireOwn(runOptions, 'seed', 'Setup runOptions'),
      'Setup seed',
      0,
      UINT32_MAX
    ),
    strikeVariancePct: normalizeBoundedNumber(
      requireOwn(runOptions, 'strikeVariancePct', 'Setup runOptions'),
      'Setup strike variance',
      MAX_STRIKE_VARIANCE_PCT
    ),
  };
}

function normalizeSetupSnapshot(rawSnapshot) {
  const snapshot = requireObject(rawSnapshot, 'Battle setup');
  const version = requireOwn(snapshot, 'setupSchemaVersion', 'Battle setup');
  if (
    ![LEGACY_SETUP_SCHEMA_VERSION, PREVIOUS_SETUP_SCHEMA_VERSION, SETUP_SCHEMA_VERSION].includes(
      version
    )
  ) {
    throw new RangeError(
      `Unsupported battle setup schema version "${String(version)}". Expected version ${LEGACY_SETUP_SCHEMA_VERSION} or ${SETUP_SCHEMA_VERSION}.`
    );
  }
  const battleMode = normalizeBattleMode(
    snapshot.battleMode ?? snapshot.scenarioContext?.battleMode
  );
  const scenarioContext = normalizeScenarioContext(snapshot.scenarioContext, battleMode);
  const sides = requireObject(requireOwn(snapshot, 'sides', 'Battle setup'), 'Battle setup sides');
  for (const sideId of SIDE_IDS) requireOwn(sides, sideId, 'Battle setup sides');
  const legacy = version === LEGACY_SETUP_SCHEMA_VERSION;

  return {
    setupSchemaVersion: SETUP_SCHEMA_VERSION,
    savedAt: normalizeSavedAt(snapshot.savedAt),
    battleMode: scenarioContext.battleMode,
    scenarioContext,
    assumptions: normalizeAssumptions(snapshot.assumptions),
    sides: Object.fromEntries(
      SIDE_IDS.map((sideId) => [
        sideId,
        normalizeSide(sides[sideId], sideId, battleMode, { legacy }),
      ])
    ),
    runOptions: normalizeRunOptions(requireOwn(snapshot, 'runOptions', 'Battle setup')),
  };
}

export function buildSetupSnapshot(state) {
  const source = requireObject(state, 'Battle simulator state');
  return normalizeSetupSnapshot({
    setupSchemaVersion: SETUP_SCHEMA_VERSION,
    savedAt: null,
    battleMode: source.battleMode ?? DEFAULT_BATTLE_MODE,
    scenarioContext: source.scenarioContext ?? {
      ...DEFAULT_SCENARIO_CONTEXT,
      battleMode: source.battleMode ?? DEFAULT_BATTLE_MODE,
    },
    assumptions: source.assumptions,
    sides: requireOwn(source, 'sides', 'Battle simulator state'),
    runOptions: {
      iterations: requireOwn(source, 'iterations', 'Battle simulator state'),
      seed: requireOwn(source, 'seed', 'Battle simulator state'),
      strikeVariancePct: requireOwn(source, 'strikeVariancePct', 'Battle simulator state'),
    },
  });
}

export function parseSetupSnapshot(jsonText) {
  if (typeof jsonText !== 'string') {
    throw new TypeError('Battle setup JSON must be provided as text.');
  }
  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch (error) {
    throw new TypeError(`Battle setup JSON is invalid: ${error.message}`);
  }
  return normalizeSetupSnapshot(parsed);
}

export function applySetupSnapshot(state, snapshot) {
  const currentState = requireObject(state, 'Battle simulator state');
  const normalized = normalizeSetupSnapshot(snapshot);
  return {
    ...currentState,
    battleMode: normalized.battleMode,
    scenarioContext: normalized.scenarioContext,
    assumptions: normalized.assumptions,
    iterations: normalized.runOptions.iterations,
    seed: normalized.runOptions.seed,
    strikeVariancePct: normalized.runOptions.strikeVariancePct,
    sides: normalized.sides,
  };
}

export function setupSnapshotToEngineConfig(snapshot) {
  const normalized = normalizeSetupSnapshot(snapshot);
  const buildSide = (sideId) => {
    const side = normalized.sides[sideId];
    return {
      label: `Side ${sideId}`,
      researchEnabled: side.researchEnabled,
      researchSnapshot: normalizeResearchSnapshot(
        side.researchSnapshot,
        `Side ${sideId} research snapshot`,
        normalized.battleMode
      ),
      equipmentLoadout: normalizeEquipmentLoadout(side.equipmentLoadout),
      equipmentEffectOverrides: normalizeEquipmentOverrides(side.equipmentEffectOverrides),
      capturedSourceSnapshot: normalizeCapturedSourceSnapshot(
        side.capturedSourceSnapshot,
        `Side ${sideId} captured source snapshot`
      ),
      specializationCapture: normalizeSpecializationCapture(
        side.specializationCapture,
        `Side ${sideId} specialization capture`
      ),
      rows: side.rows.map((row) => {
        const unitSources = side.specializationCapture.result?.unitSources || [];
        const calculation = calculateTroopStats({
          type: row.type,
          tier: row.tier,
          mode: side.mode,
          unitValues: row.unitValues,
          values: side.mode === STAT_INPUT_MODES.ADD_BONUSES ? row.bonuses : row.finals,
          sources: side.capturedSourceSnapshot.sources,
          unitSources,
          context: {
            battleMode: normalized.battleMode,
            troopType: row.type,
            rowId: row.id,
          },
        });
        return {
          id: row.id,
          heroName: row.heroName,
          skillIds: [...row.skillIds],
          type: row.type,
          tier: row.tier,
          troops: row.troops,
          stats: calculation.engineStats,
          statBreakdown: {
            unit: calculation.unit,
            battle: {
              ...calculation.battle,
              excludedSources: [
                ...calculation.battle.excludedSources,
                ...side.capturedSourceSnapshot.excludedSources,
              ],
            },
            effective: calculation.effective,
          },
        };
      }),
      unitSources: structuredClone(side.specializationCapture.result?.unitSources || []),
      effects: structuredClone(side.specializationCapture.result?.effects || []),
      scenarioContext: structuredClone(normalized.scenarioContext),
    };
  };

  return {
    battleMode: normalized.battleMode,
    statContract: BATTLE_STAT_CONTRACT,
    sideA: buildSide('A'),
    sideB: buildSide('B'),
  };
}
