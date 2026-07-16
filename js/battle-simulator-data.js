export const DEFAULT_TROOPS = 31_000;

export const BATTLE_ROWS = Object.freeze([
  Object.freeze({ id: 'front', label: 'Front', position: 0 }),
  Object.freeze({ id: 'middle', label: 'Middle', position: 1 }),
  Object.freeze({ id: 'back', label: 'Back', position: 2 }),
]);

export const TROOP_TYPES = Object.freeze(['cavalry', 'archers', 'footmen']);
export const TROOP_TIERS = Object.freeze([9, 10]);

export const TROOP_STAT_KEYS = Object.freeze([
  'might',
  'resistance',
  'hp',
  'tacticalMight',
  'tacticalResistance',
  'damage',
  'combatSpeed',
]);

export const EDITABLE_BASE_STAT_KEYS = Object.freeze(['might', 'resistance', 'hp']);

export const STAT_INPUT_MODES = Object.freeze({
  ADD_BONUSES: 'add-bonuses',
  FINAL_TOTALS: 'final-totals',
});

const TROOP_CARD_SOURCE = 'User-provided troop card';
const SOURCE_UNAVAILABLE = 'Base source unavailable for Phase 1';

export const TROOP_STAT_METADATA = Object.freeze({
  might: Object.freeze({
    label: 'Might',
    unit: 'percent',
    baseSourceAvailable: true,
    source: `${TROOP_CARD_SOURCE} (Attack)`,
  }),
  resistance: Object.freeze({
    label: 'Resistance',
    unit: 'percent',
    baseSourceAvailable: true,
    source: `${TROOP_CARD_SOURCE} (Defense)`,
  }),
  hp: Object.freeze({
    label: 'HP',
    unit: 'percent',
    baseSourceAvailable: true,
    source: `${TROOP_CARD_SOURCE} (HP)`,
  }),
  tacticalMight: Object.freeze({
    label: 'Tactical Might',
    unit: 'percent',
    baseSourceAvailable: false,
    source: SOURCE_UNAVAILABLE,
  }),
  tacticalResistance: Object.freeze({
    label: 'Tactical Resistance',
    unit: 'percent',
    baseSourceAvailable: false,
    source: SOURCE_UNAVAILABLE,
  }),
  damage: Object.freeze({
    label: 'Damage',
    unit: 'percent',
    baseSourceAvailable: false,
    source: SOURCE_UNAVAILABLE,
  }),
  combatSpeed: Object.freeze({
    label: 'Combat Speed',
    unit: 'raw',
    baseSourceAvailable: false,
    source: SOURCE_UNAVAILABLE,
  }),
});

function createBaseStats(might, resistance, hp) {
  return Object.freeze({
    might,
    resistance,
    hp,
    tacticalMight: 0,
    tacticalResistance: 0,
    damage: 0,
    combatSpeed: 0,
  });
}

function createProfile(type, tier, might, resistance, hp) {
  return Object.freeze({
    id: `${type}-t${tier}`,
    type,
    tier,
    label: `${type.charAt(0).toUpperCase()}${type.slice(1)} T${tier}`,
    baseStats: createBaseStats(might, resistance, hp),
  });
}

export const TROOP_PROFILES = Object.freeze({
  cavalry: Object.freeze({
    9: createProfile('cavalry', 9, 88.74, 49.98, 18.36),
    10: createProfile('cavalry', 10, 92.82, 52.02, 18.36),
  }),
  archers: Object.freeze({
    9: createProfile('archers', 9, 107.1, 49.49, 13),
    10: createProfile('archers', 10, 111.18, 51.51, 13),
  }),
  footmen: Object.freeze({
    9: createProfile('footmen', 9, 71.4, 74.46, 20),
    10: createProfile('footmen', 10, 74.46, 77.52, 21),
  }),
});

function normalizeTroopType(type) {
  return String(type || '')
    .trim()
    .toLowerCase();
}

function normalizeTier(tier) {
  const numeric = Number(tier);
  if (!Number.isInteger(numeric)) {
    throw new TypeError(`Troop tier must be an integer; received ${String(tier)}.`);
  }
  return numeric;
}

export function getTroopProfile(type, tier) {
  const normalizedType = normalizeTroopType(type);
  if (!TROOP_TYPES.includes(normalizedType)) {
    throw new RangeError(
      `Unsupported troop type "${String(type)}". Use one of: ${TROOP_TYPES.join(', ')}.`
    );
  }

  const normalizedTier = normalizeTier(tier);
  const profile = TROOP_PROFILES[normalizedType][normalizedTier];
  if (!profile) {
    throw new RangeError(
      `Unsupported troop tier T${normalizedTier}. Phase 1 supports: ${TROOP_TIERS.map((value) => `T${value}`).join(', ')}.`
    );
  }
  return profile;
}

function validateValues(values) {
  if (values === undefined) return {};
  if (!values || typeof values !== 'object' || Array.isArray(values)) {
    throw new TypeError('Stat values must be provided as an object.');
  }

  for (const key of Object.keys(values)) {
    if (!TROOP_STAT_KEYS.includes(key)) {
      throw new RangeError(`Unsupported troop stat "${key}".`);
    }
  }
  return values;
}

function validateBaseValues(baseValues) {
  if (baseValues === undefined) return {};
  if (!baseValues || typeof baseValues !== 'object' || Array.isArray(baseValues)) {
    throw new TypeError('Editable base values must be provided as an object.');
  }

  for (const key of Object.keys(baseValues)) {
    if (!EDITABLE_BASE_STAT_KEYS.includes(key)) {
      throw new RangeError(
        `Unsupported editable base stat "${key}". Phase 1 base editing supports: ${EDITABLE_BASE_STAT_KEYS.join(', ')}.`
      );
    }
  }
  return baseValues;
}

function validateStatValue(value, key) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    throw new TypeError(`${TROOP_STAT_METADATA[key].label} must be a finite number.`);
  }
  if (numeric < 0) {
    throw new RangeError(`${TROOP_STAT_METADATA[key].label} cannot be negative.`);
  }
  return numeric;
}

function roundStat(value) {
  const rounded = Math.round((value + Number.EPSILON) * 1_000_000) / 1_000_000;
  if (!Number.isFinite(rounded)) throw new RangeError('Calculated stat total is too large.');
  return rounded;
}

export function calculateTroopStats({
  type,
  tier,
  mode = STAT_INPUT_MODES.ADD_BONUSES,
  baseValues,
  values,
} = {}) {
  if (!Object.values(STAT_INPUT_MODES).includes(mode)) {
    throw new RangeError(
      `Unsupported stat input mode "${String(mode)}". Use "${STAT_INPUT_MODES.ADD_BONUSES}" or "${STAT_INPUT_MODES.FINAL_TOTALS}".`
    );
  }

  const profile = getTroopProfile(type, tier);
  const suppliedBaseValues = validateBaseValues(baseValues);
  const suppliedValues = validateValues(values);
  const base = { ...profile.baseStats };
  const entered = {};
  const final = {};

  for (const key of EDITABLE_BASE_STAT_KEYS) {
    if (!Object.hasOwn(suppliedBaseValues, key)) continue;
    base[key] = validateStatValue(suppliedBaseValues[key], key);
  }

  for (const key of TROOP_STAT_KEYS) {
    const fallback = mode === STAT_INPUT_MODES.ADD_BONUSES ? 0 : base[key];
    const rawValue = Object.hasOwn(suppliedValues, key) ? suppliedValues[key] : fallback;
    entered[key] = validateStatValue(rawValue, key);
    final[key] =
      mode === STAT_INPUT_MODES.ADD_BONUSES
        ? roundStat(base[key] + entered[key])
        : roundStat(entered[key]);
  }

  return {
    profile,
    mode,
    base,
    entered,
    final,
  };
}
