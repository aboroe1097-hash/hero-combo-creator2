import { normalizeEquipmentLoadout } from './battle-simulator-equipment.js';
import {
  BATTLE_STAT_KEYS,
  getBattleStatUnit,
  normalizeStatSource,
} from './battle-simulator-stat-sources.js';

export const EQUIPMENT_EFFECT_OVERRIDE_SCHEMA_VERSION = 1;

export const EQUIPMENT_EFFECT_OVERRIDE_ASSUMPTIONS = Object.freeze({
  authority: 'User-observed values are provisional and never alter the canonical identity catalog.',
  matching:
    'Set-only records match the whole set; piece constraints match at least one equipped piece.',
  enhancement:
    'Enhancement and advancement constraints are exact observations, never interpolated.',
  failure:
    'Invalid, conflicting, or non-matching records contribute no battle stats.',
});

export const EQUIPMENT_EFFECT_OVERRIDE_COVERAGE = Object.freeze({
  catalogData: 'identity-only',
  operations: Object.freeze(['add']),
  verification: Object.freeze({ status: 'provisional', basis: 'user-observed' }),
  constraints: Object.freeze([
    'setId',
    'pieceId',
    'slotId',
    'gradeId',
    'enhancementLevel',
    'advancementStageId',
  ]),
  applicability: Object.freeze(['battleModes', 'troopTypes', 'rowIds']),
});

const ID_PATTERN = /^[a-z0-9][a-z0-9._:-]{0,127}$/;
const MAX_OVERRIDES = 512;
const MAX_AMOUNT = 1_000_000;
const MAX_LABEL_LENGTH = 160;
const MAX_NOTE_LENGTH = 500;
const MAX_SOURCE_REF_LENGTH = 500;
const BATTLE_MODES = Object.freeze(['pvp-field', 'siege']);
const TROOP_TYPES = Object.freeze(['cavalry', 'archers', 'footmen']);
const ROW_IDS = Object.freeze(['front', 'middle', 'back']);
const OVERRIDE_FIELDS = new Set([
  'id',
  'setId',
  'pieceId',
  'slotId',
  'gradeId',
  'enhancementLevel',
  'advancementStageId',
  'label',
  'statKey',
  'amount',
  'operation',
  'unit',
  'appliesTo',
  'verification',
  'note',
  'sourceRef',
]);

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

function requirePlainObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object.`);
  }
  return value;
}

function normalizeText(value, label, maximum) {
  if (typeof value !== 'string') throw new TypeError(`${label} must be a string.`);
  const normalized = value.trim();
  if (!normalized || normalized.length > maximum) {
    throw new RangeError(`${label} must contain 1-${maximum} characters.`);
  }
  return normalized;
}

function normalizeId(value, label) {
  const normalized = normalizeText(value, label, 128).toLowerCase();
  if (!ID_PATTERN.test(normalized)) {
    throw new RangeError(`${label} contains unsupported characters.`);
  }
  return normalized;
}

function normalizeOptionalId(value, label) {
  return value === undefined || value === null ? null : normalizeId(value, label);
}

function normalizeOptionalText(value, label, maximum) {
  return value === undefined || value === null ? null : normalizeText(value, label, maximum);
}

function normalizeScopeList(value, allowed, label) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new TypeError(`${label} must be an array.`);
  if (value.length > allowed.length) {
    throw new RangeError(`${label} contains too many entries.`);
  }
  const normalized = value.map((entry) => normalizeId(entry, `${label} entry`));
  if (new Set(normalized).size !== normalized.length) {
    throw new RangeError(`${label} cannot contain duplicate values.`);
  }
  for (const entry of normalized) {
    if (!allowed.includes(entry)) {
      throw new RangeError(`${label} contains unsupported value "${entry}".`);
    }
  }
  return normalized.sort();
}

function normalizeAppliesTo(value) {
  const appliesTo =
    value === undefined || value === null
      ? {}
      : requirePlainObject(value, 'Equipment override appliesTo');
  const unknown = Object.keys(appliesTo).filter(
    (key) => !['battleModes', 'troopTypes', 'rowIds'].includes(key)
  );
  if (unknown.length > 0) {
    throw new RangeError(`Equipment override appliesTo has unsupported field "${unknown[0]}".`);
  }
  return {
    battleModes: normalizeScopeList(
      appliesTo.battleModes,
      BATTLE_MODES,
      'Equipment override battleModes'
    ),
    troopTypes: normalizeScopeList(
      appliesTo.troopTypes,
      TROOP_TYPES,
      'Equipment override troopTypes'
    ),
    rowIds: normalizeScopeList(appliesTo.rowIds, ROW_IDS, 'Equipment override rowIds'),
  };
}

function normalizeVerification(value) {
  const verification = requirePlainObject(value, 'Equipment override verification');
  if (verification.status !== 'provisional' || verification.basis !== 'user-observed') {
    throw new RangeError(
      'Equipment override verification must be provisional and user-observed.'
    );
  }
  const unknown = Object.keys(verification).filter(
    (key) => !['status', 'basis'].includes(key)
  );
  if (unknown.length > 0) {
    throw new RangeError(
      `Equipment override verification has unsupported field "${unknown[0]}".`
    );
  }
  return { status: 'provisional', basis: 'user-observed' };
}

function overrideSortKey(override) {
  return JSON.stringify([
    override.id,
    override.setId,
    override.pieceId,
    override.slotId,
    override.gradeId,
    override.enhancementLevel,
    override.advancementStageId,
    override.statKey,
    override.appliesTo,
  ]);
}

function diagnostic(code, message, details = {}) {
  return deepFreeze({ code, message, ...details });
}

function diagnosticSort(left, right) {
  return (
    String(left.overrideId ?? '').localeCompare(String(right.overrideId ?? '')) ||
    left.code.localeCompare(right.code) ||
    (left.index ?? -1) - (right.index ?? -1) ||
    left.message.localeCompare(right.message)
  );
}

export function normalizeEquipmentEffectOverride(rawOverride) {
  const override = requirePlainObject(rawOverride, 'Equipment effect override');
  const unknown = Object.keys(override).filter((key) => !OVERRIDE_FIELDS.has(key));
  if (unknown.length > 0) {
    throw new RangeError(`Equipment effect override has unsupported field "${unknown[0]}".`);
  }

  const statKey = normalizeText(override.statKey, 'Equipment override statKey', 40);
  if (!BATTLE_STAT_KEYS.includes(statKey)) {
    throw new RangeError(`Equipment override has unsupported statKey "${statKey}".`);
  }
  if (override.operation !== 'add') {
    throw new RangeError('Equipment override operation must be "add".');
  }
  const expectedUnit = getBattleStatUnit(statKey);
  if (override.unit !== expectedUnit) {
    throw new RangeError(`Equipment override ${statKey} unit must be "${expectedUnit}".`);
  }
  if (typeof override.amount !== 'number' || !Number.isFinite(override.amount)) {
    throw new TypeError('Equipment override amount must be a finite number.');
  }
  if (Math.abs(override.amount) > MAX_AMOUNT) {
    throw new RangeError(`Equipment override amount must be between -${MAX_AMOUNT} and ${MAX_AMOUNT}.`);
  }
  if (
    override.enhancementLevel !== undefined &&
    override.enhancementLevel !== null &&
    (!Number.isSafeInteger(override.enhancementLevel) ||
      override.enhancementLevel < 0 ||
      override.enhancementLevel > 100)
  ) {
    throw new RangeError('Equipment override enhancementLevel must be an integer from 0 to 100.');
  }

  return deepFreeze({
    id: normalizeId(override.id, 'Equipment override ID'),
    setId: normalizeId(override.setId, 'Equipment override setId'),
    pieceId: normalizeOptionalId(override.pieceId, 'Equipment override pieceId'),
    slotId: normalizeOptionalId(override.slotId, 'Equipment override slotId'),
    gradeId: normalizeOptionalId(override.gradeId, 'Equipment override gradeId'),
    enhancementLevel:
      override.enhancementLevel === undefined || override.enhancementLevel === null
        ? null
        : override.enhancementLevel,
    advancementStageId: normalizeOptionalId(
      override.advancementStageId,
      'Equipment override advancementStageId'
    ),
    label: normalizeText(override.label, 'Equipment override label', MAX_LABEL_LENGTH),
    statKey,
    amount: override.amount,
    operation: 'add',
    unit: expectedUnit,
    appliesTo: normalizeAppliesTo(override.appliesTo),
    verification: normalizeVerification(override.verification),
    note: normalizeOptionalText(override.note, 'Equipment override note', MAX_NOTE_LENGTH),
    sourceRef: normalizeOptionalText(
      override.sourceRef,
      'Equipment override sourceRef',
      MAX_SOURCE_REF_LENGTH
    ),
  });
}

function emptyNormalization(diagnostics = []) {
  return deepFreeze({
    overrideSchemaVersion: EQUIPMENT_EFFECT_OVERRIDE_SCHEMA_VERSION,
    overrides: [],
    diagnostics: diagnostics.sort(diagnosticSort),
  });
}

export function normalizeEquipmentEffectOverrides(rawDocument) {
  let document;
  try {
    document = requirePlainObject(rawDocument, 'Equipment effect override document');
  } catch (error) {
    return emptyNormalization([diagnostic('invalid-document', error.message)]);
  }
  if (document.overrideSchemaVersion !== EQUIPMENT_EFFECT_OVERRIDE_SCHEMA_VERSION) {
    return emptyNormalization([
      diagnostic(
        'unsupported-schema-version',
        `Unsupported equipment effect override schema version "${String(
          document.overrideSchemaVersion
        )}".`
      ),
    ]);
  }
  if (!Array.isArray(document.overrides)) {
    return emptyNormalization([
      diagnostic('invalid-overrides', 'Equipment effect overrides must be an array.'),
    ]);
  }
  if (document.overrides.length > MAX_OVERRIDES) {
    return emptyNormalization([
      diagnostic(
        'too-many-overrides',
        `Equipment effect overrides cannot contain more than ${MAX_OVERRIDES} entries.`
      ),
    ]);
  }

  const diagnostics = [];
  const records = [];
  document.overrides.forEach((rawOverride, index) => {
    try {
      records.push({ override: normalizeEquipmentEffectOverride(rawOverride), index });
    } catch (error) {
      diagnostics.push(
        diagnostic('invalid-override', error.message, {
          index,
          overrideId:
            rawOverride && typeof rawOverride.id === 'string' ? rawOverride.id.trim() : null,
        })
      );
    }
  });

  const groups = new Map();
  for (const record of records) {
    const group = groups.get(record.override.id) ?? [];
    group.push(record);
    groups.set(record.override.id, group);
  }
  const accepted = [];
  for (const [overrideId, group] of groups) {
    const canonical = new Set(group.map(({ override }) => JSON.stringify(override)));
    if (canonical.size > 1) {
      diagnostics.push(
        diagnostic(
          'conflicting-override',
          `Equipment effect override "${overrideId}" has conflicting records; none were applied.`,
          { overrideId }
        )
      );
      continue;
    }
    accepted.push(group[0].override);
    if (group.length > 1) {
      diagnostics.push(
        diagnostic(
          'duplicate-override',
          `Equipment effect override "${overrideId}" was repeated and applied once.`,
          { overrideId, duplicateCount: group.length - 1 }
        )
      );
    }
  }

  accepted.sort((left, right) => overrideSortKey(left).localeCompare(overrideSortKey(right)));
  diagnostics.sort(diagnosticSort);
  return deepFreeze({
    overrideSchemaVersion: EQUIPMENT_EFFECT_OVERRIDE_SCHEMA_VERSION,
    overrides: accepted,
    diagnostics,
  });
}

export function parseEquipmentEffectOverrides(jsonText) {
  if (typeof jsonText !== 'string') {
    return emptyNormalization([
      diagnostic('invalid-json', 'Equipment effect override JSON must be provided as text.'),
    ]);
  }
  try {
    return normalizeEquipmentEffectOverrides(JSON.parse(jsonText));
  } catch (error) {
    return emptyNormalization([
      diagnostic('invalid-json', `Equipment effect override JSON is invalid: ${error.message}`),
    ]);
  }
}

export function serializeEquipmentEffectOverrides(rawDocument, spacing = 2) {
  const normalized = normalizeEquipmentEffectOverrides(rawDocument);
  if (normalized.diagnostics.some(({ code }) => code !== 'duplicate-override')) {
    throw new RangeError('Cannot serialize invalid or conflicting equipment effect overrides.');
  }
  return JSON.stringify(
    {
      overrideSchemaVersion: EQUIPMENT_EFFECT_OVERRIDE_SCHEMA_VERSION,
      overrides: normalized.overrides,
    },
    null,
    spacing
  );
}

function pieceMatches(piece, override) {
  return (
    (override.pieceId === null || piece.pieceId === override.pieceId) &&
    (override.slotId === null || piece.slotId === override.slotId) &&
    (override.gradeId === null || piece.gradeId === override.gradeId) &&
    (override.enhancementLevel === null ||
      piece.enhancementLevel === override.enhancementLevel) &&
    (override.advancementStageId === null ||
      piece.advancementStageId === override.advancementStageId)
  );
}

function overrideMatches(loadout, override) {
  if (loadout.setId !== override.setId) return false;
  const hasPieceConstraint =
    override.pieceId !== null ||
    override.slotId !== null ||
    override.gradeId !== null ||
    override.enhancementLevel !== null ||
    override.advancementStageId !== null;
  return !hasPieceConstraint || loadout.pieces.some((piece) => pieceMatches(piece, override));
}

function overrideToStatSource(override) {
  const provenance = {
    overrideSchemaVersion: EQUIPMENT_EFFECT_OVERRIDE_SCHEMA_VERSION,
    overrideId: override.id,
  };
  if (override.note !== null) provenance.note = override.note;
  if (override.sourceRef !== null) provenance.sourceRef = override.sourceRef;
  return normalizeStatSource({
    sourceType: 'equipment-override',
    sourceId: `equipment-override:${override.id}`,
    label: override.label,
    statKey: override.statKey,
    amount: override.amount,
    operation: override.operation,
    unit: override.unit,
    appliesTo: override.appliesTo,
    verification: override.verification,
    provenance,
  });
}

export function resolveEquipmentEffectOverrides(rawLoadout, rawDocument) {
  const normalized = normalizeEquipmentEffectOverrides(rawDocument);
  const diagnostics = [...normalized.diagnostics];
  let loadout;
  try {
    loadout = normalizeEquipmentLoadout(rawLoadout);
  } catch (error) {
    diagnostics.push(diagnostic('invalid-loadout', error.message));
    return deepFreeze({
      sources: [],
      diagnostics: diagnostics.sort(diagnosticSort),
      assumptions: EQUIPMENT_EFFECT_OVERRIDE_ASSUMPTIONS,
      coverage: EQUIPMENT_EFFECT_OVERRIDE_COVERAGE,
    });
  }

  const sources = [];
  for (const override of normalized.overrides) {
    if (!overrideMatches(loadout, override)) {
      diagnostics.push(
        diagnostic(
          'constraint-mismatch',
          `Equipment effect override "${override.id}" does not match the equipped loadout.`,
          { overrideId: override.id }
        )
      );
      continue;
    }
    sources.push(overrideToStatSource(override));
  }
  sources.sort(
    (left, right) =>
      left.sourceId.localeCompare(right.sourceId) || left.statKey.localeCompare(right.statKey)
  );
  diagnostics.sort(diagnosticSort);
  return deepFreeze({
    sources,
    diagnostics,
    assumptions: EQUIPMENT_EFFECT_OVERRIDE_ASSUMPTIONS,
    coverage: EQUIPMENT_EFFECT_OVERRIDE_COVERAGE,
  });
}
