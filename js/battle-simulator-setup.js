import {
  BATTLE_ROWS,
  EDITABLE_BASE_STAT_KEYS,
  STAT_INPUT_MODES,
  TROOP_STAT_KEYS,
  TROOP_TIERS,
  TROOP_TYPES,
  calculateTroopStats,
} from './battle-simulator-data.js';

export const SETUP_SCHEMA_VERSION = 1;

const SIDE_IDS = Object.freeze(['A', 'B']);
const DEFAULT_BATTLE_MODE = 'pvp-field';
const ALLOWED_ITERATIONS = Object.freeze([1, 10, 50, 100, 500]);
const UINT32_MAX = 0xffffffff;
const MAX_TROOPS = 10_000_000;
const MAX_STAT_VALUE = 5_000;
const MAX_COMBAT_SPEED = 10_000;
const MAX_STRIKE_VARIANCE_PCT = 25;

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

function normalizeBoundedNumber(value, label, maximum) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`${label} must be a finite number.`);
  }
  if (value < 0 || value > maximum) {
    throw new RangeError(`${label} must be between 0 and ${maximum}.`);
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

function normalizeStats(rawStats, keys, label) {
  const stats = requireObject(rawStats, label);
  return Object.fromEntries(
    keys.map((key) => {
      const maximum = key === 'combatSpeed' ? MAX_COMBAT_SPEED : MAX_STAT_VALUE;
      return [
        key,
        normalizeBoundedNumber(requireOwn(stats, key, label), `${label} ${key}`, maximum),
      ];
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
  if (!Object.values(STAT_INPUT_MODES).includes(value)) {
    throw new RangeError(
      `${label} has unsupported stat input mode "${String(value)}". Use "${STAT_INPUT_MODES.ADD_BONUSES}" or "${STAT_INPUT_MODES.FINAL_TOTALS}".`
    );
  }
  return value;
}

function normalizeEditableFields(rawFields, label) {
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
    baseValues: normalizeStats(
      requireOwn(fields, 'baseValues', label),
      EDITABLE_BASE_STAT_KEYS,
      `${label} base values`
    ),
    bonuses: normalizeStats(
      requireOwn(fields, 'bonuses', label),
      TROOP_STAT_KEYS,
      `${label} bonuses`
    ),
    finals: normalizeStats(
      requireOwn(fields, 'finals', label),
      TROOP_STAT_KEYS,
      `${label} final totals`
    ),
  };
}

function normalizeRow(rawRow, sideId, index) {
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
    ...normalizeEditableFields(row, label),
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

function normalizeSide(rawSide, sideId) {
  const label = `Side ${sideId}`;
  const side = requireObject(rawSide, label);
  const rows = requireOwn(side, 'rows', label);
  if (!Array.isArray(rows) || rows.length !== BATTLE_ROWS.length) {
    throw new RangeError(`${label} must contain exactly three rows: Front, Middle, Back.`);
  }

  return {
    mode: normalizeMode(requireOwn(side, 'mode', label), label),
    sideDefaults: normalizeEditableFields(
      requireOwn(side, 'sideDefaults', label),
      `${label} defaults`
    ),
    rows: rows.map((row, index) => normalizeRow(row, sideId, index)),
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
  if (typeof value !== 'string') {
    throw new TypeError('Setup battleMode must be a string.');
  }
  return value;
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
  if (version !== SETUP_SCHEMA_VERSION) {
    throw new RangeError(
      `Unsupported battle setup schema version "${String(version)}". Expected version ${SETUP_SCHEMA_VERSION}.`
    );
  }

  const sides = requireObject(requireOwn(snapshot, 'sides', 'Battle setup'), 'Battle setup sides');
  for (const sideId of SIDE_IDS) {
    requireOwn(sides, sideId, 'Battle setup sides');
  }

  return {
    setupSchemaVersion: SETUP_SCHEMA_VERSION,
    savedAt: normalizeSavedAt(snapshot.savedAt),
    battleMode: normalizeBattleMode(snapshot.battleMode),
    sides: Object.fromEntries(
      SIDE_IDS.map((sideId) => [sideId, normalizeSide(sides[sideId], sideId)])
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
      rows: side.rows.map((row) => ({
        id: row.id,
        type: row.type,
        tier: row.tier,
        troops: row.troops,
        stats: calculateTroopStats({
          type: row.type,
          tier: row.tier,
          mode: side.mode,
          baseValues: row.baseValues,
          values: side.mode === STAT_INPUT_MODES.ADD_BONUSES ? row.bonuses : row.finals,
        }).final,
      })),
    };
  };

  return {
    sideA: buildSide('A'),
    sideB: buildSide('B'),
  };
}
