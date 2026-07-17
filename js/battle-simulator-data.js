import {
  BATTLE_STAT_BASELINES,
  BATTLE_STAT_KEYS,
  getBattleStatUnit,
  normalizeStatSources,
  partitionStatSources,
  sumStatSources,
} from './battle-simulator-stat-sources.js';

export { BATTLE_STAT_BASELINES, BATTLE_STAT_KEYS };

export const DEFAULT_TROOPS = 31_000;

export const BATTLE_ROWS = Object.freeze([
  Object.freeze({ id: 'front', label: 'Front', position: 0 }),
  Object.freeze({ id: 'middle', label: 'Middle', position: 1 }),
  Object.freeze({ id: 'back', label: 'Back', position: 2 }),
]);

export const TROOP_TYPES = Object.freeze(['cavalry', 'archers', 'footmen']);
export const TROOP_TIERS = Object.freeze([9, 10]);
export const UNIT_STAT_KEYS = Object.freeze(['attack', 'defense', 'hp']);
export const MAX_UNIT_STAT_VALUE = 5_000;
export const MAX_BATTLE_STAT_VALUE = 5_000;
export const MAX_COMBAT_SPEED = 10_000;
export const BATTLE_STAT_CONTRACT_VERSION = 2;
export const BATTLE_STAT_CONTRACT = Object.freeze({
  version: BATTLE_STAT_CONTRACT_VERSION,
  unitKeys: UNIT_STAT_KEYS,
  battleKeys: BATTLE_STAT_KEYS,
  multiplierBaselines: BATTLE_STAT_BASELINES,
  derivation: Object.freeze({
    attack: 'unit.attack * battle.might / 100',
    defense: 'unit.defense * battle.resistance / 100',
    hp: 'unit.hp * battle.hp / 100',
  }),
});

// Kept as aliases while setup/UI callers migrate to the explicit v2 names.
export const TROOP_STAT_KEYS = BATTLE_STAT_KEYS;
export const EDITABLE_BASE_STAT_KEYS = UNIT_STAT_KEYS;

export const STAT_INPUT_MODES = Object.freeze({
  ADD_BONUSES: 'add-bonuses',
  SOURCE_TOTALS: 'add-bonuses',
  FINAL_TOTALS: 'final-totals',
});

const TROOP_CARD_SOURCE = 'User-provided troop card';
const SOURCE_UNAVAILABLE = 'Base source unavailable';

export const UNIT_STAT_METADATA = Object.freeze({
  attack: Object.freeze({
    label: 'Attack',
    unit: 'points',
    source: `${TROOP_CARD_SOURCE} (Attack)`,
  }),
  defense: Object.freeze({
    label: 'Defense',
    unit: 'points',
    source: `${TROOP_CARD_SOURCE} (Defense)`,
  }),
  hp: Object.freeze({
    label: 'HP',
    unit: 'points',
    source: `${TROOP_CARD_SOURCE} (HP)`,
  }),
});

export const BATTLE_STAT_METADATA = Object.freeze({
  might: Object.freeze({ label: 'Battle Might', unit: 'percent', neutral: 100 }),
  resistance: Object.freeze({ label: 'Battle Resistance', unit: 'percent', neutral: 100 }),
  hp: Object.freeze({ label: 'Battle HP', unit: 'percent', neutral: 100 }),
  tacticalMight: Object.freeze({
    label: 'Tactical Might',
    unit: 'percent',
    neutral: 0,
    source: SOURCE_UNAVAILABLE,
  }),
  tacticalResistance: Object.freeze({
    label: 'Tactical Resistance',
    unit: 'percent',
    neutral: 0,
    source: SOURCE_UNAVAILABLE,
  }),
  damage: Object.freeze({
    label: 'Damage',
    unit: 'percent',
    neutral: 0,
    source: SOURCE_UNAVAILABLE,
  }),
  damageMitigation: Object.freeze({
    label: 'Damage Mitigation',
    unit: 'percent',
    neutral: 0,
    source: SOURCE_UNAVAILABLE,
  }),
  combatSpeed: Object.freeze({
    label: 'Combat Speed',
    unit: 'raw',
    neutral: 0,
    source: SOURCE_UNAVAILABLE,
  }),
});

export const TROOP_STAT_METADATA = BATTLE_STAT_METADATA;

function createUnitStats(attack, defense, hp) {
  return Object.freeze({ attack, defense, hp });
}

function createProfile(type, tier, attack, defense, hp) {
  const unitStats = createUnitStats(attack, defense, hp);
  return Object.freeze({
    id: `${type}-t${tier}`,
    type,
    tier,
    label: `${type.charAt(0).toUpperCase()}${type.slice(1)} T${tier}`,
    unitStats,
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
      `Unsupported troop tier T${normalizedTier}. Supported tiers: ${TROOP_TIERS.map((value) => `T${value}`).join(', ')}.`
    );
  }
  return profile;
}

function requireValuesObject(values, label) {
  if (values === undefined) return {};
  if (!values || typeof values !== 'object' || Array.isArray(values)) {
    throw new TypeError(`${label} must be provided as an object.`);
  }
  return values;
}

function validateStatValue(value, label, maximum) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) throw new TypeError(`${label} must be a finite number.`);
  if (numeric < 0) throw new RangeError(`${label} cannot be negative.`);
  if (numeric > maximum) throw new RangeError(`${label} cannot exceed ${maximum}.`);
  return numeric;
}

function roundStat(value) {
  const rounded = Math.round((value + Number.EPSILON) * 1_000_000) / 1_000_000;
  if (!Number.isFinite(rounded)) throw new RangeError('Calculated stat total is too large.');
  return rounded;
}

function applyPercent(points, percent, label) {
  const effective = (points / 100) * percent;
  if (!Number.isFinite(effective)) throw new RangeError(`${label} effective value is too large.`);
  return roundStat(effective);
}

function normalizeUnitOverrides(rawValues) {
  const values = requireValuesObject(rawValues, 'Unit stat values');
  for (const key of Object.keys(values)) {
    if (!UNIT_STAT_KEYS.includes(key)) throw new RangeError(`Unsupported unit stat "${key}".`);
  }

  const mapped = {};
  for (const key of UNIT_STAT_KEYS) {
    if (values[key] !== undefined) {
      mapped[key] = validateStatValue(
        values[key],
        UNIT_STAT_METADATA[key].label,
        MAX_UNIT_STAT_VALUE
      );
    }
  }
  return mapped;
}

function normalizeBattleValues(rawValues, mode) {
  const values = requireValuesObject(rawValues, 'Battle stat values');
  for (const key of Object.keys(values)) {
    if (!BATTLE_STAT_KEYS.includes(key)) throw new RangeError(`Unsupported battle stat "${key}".`);
  }
  return Object.fromEntries(
    BATTLE_STAT_KEYS.map((key) => {
      const fallback = mode === STAT_INPUT_MODES.FINAL_TOTALS ? BATTLE_STAT_BASELINES[key] : 0;
      const value = Object.hasOwn(values, key) ? values[key] : fallback;
      const maximum = key === 'combatSpeed' ? MAX_COMBAT_SPEED : MAX_BATTLE_STAT_VALUE;
      return [key, validateStatValue(value, BATTLE_STAT_METADATA[key].label, maximum)];
    })
  );
}

function createManualSources(values) {
  return BATTLE_STAT_KEYS.filter((key) => values[key] !== 0).map((key) => ({
    sourceType: 'manual',
    sourceId: `manual.${key}`,
    label: `Manual ${BATTLE_STAT_METADATA[key].label}`,
    statKey: key,
    amount: values[key],
    operation: 'add',
    unit: getBattleStatUnit(key),
    appliesTo: { battleModes: [], troopTypes: [], rowIds: [] },
    verification: { status: 'user-entered' },
    provenance: { origin: 'battle-simulator' },
  }));
}

function markFinalOverride(source) {
  return Object.freeze({ ...source, exclusionReason: 'final-total-override' });
}

export function calculateTroopStats({
  type,
  tier,
  mode = STAT_INPUT_MODES.ADD_BONUSES,
  unitValues,
  values,
  sources = [],
  context = {},
} = {}) {
  if (![STAT_INPUT_MODES.ADD_BONUSES, STAT_INPUT_MODES.FINAL_TOTALS].includes(mode)) {
    throw new RangeError(
      `Unsupported stat input mode "${String(mode)}". Use "${STAT_INPUT_MODES.ADD_BONUSES}" or "${STAT_INPUT_MODES.FINAL_TOTALS}".`
    );
  }
  const profile = getTroopProfile(type, tier);
  const enteredUnit = normalizeUnitOverrides(unitValues);
  const resolvedUnit = { ...profile.unitStats, ...enteredUnit };
  const enteredBattle = normalizeBattleValues(values, mode);
  const sourceContext = {
    ...context,
    troopType: context.troopType ?? context.type ?? profile.type,
  };
  const automatic = partitionStatSources(sources, sourceContext);
  let includedSources;
  let excludedSources;
  let totals;

  if (mode === STAT_INPUT_MODES.ADD_BONUSES) {
    includedSources = normalizeStatSources([
      ...automatic.included,
      ...createManualSources(enteredBattle),
    ]);
    excludedSources = automatic.excluded;
    const additions = sumStatSources(includedSources);
    totals = Object.fromEntries(
      BATTLE_STAT_KEYS.map((key) => {
        const maximum = key === 'combatSpeed' ? MAX_COMBAT_SPEED : MAX_BATTLE_STAT_VALUE;
        const total = roundStat(
          validateStatValue(
            BATTLE_STAT_BASELINES[key] + additions[key],
            BATTLE_STAT_METADATA[key].label,
            maximum
          )
        );
        return [key, total];
      })
    );
  } else {
    includedSources = Object.freeze([]);
    excludedSources = Object.freeze([
      ...automatic.included.map(markFinalOverride),
      ...automatic.excluded,
    ]);
    totals = { ...enteredBattle };
  }

  const effective = {
    attack: applyPercent(resolvedUnit.attack, totals.might, 'Attack'),
    defense: applyPercent(resolvedUnit.defense, totals.resistance, 'Defense'),
    hp: applyPercent(resolvedUnit.hp, totals.hp, 'HP'),
  };

  return {
    profile,
    mode,
    unit: {
      preset: { ...profile.unitStats },
      entered: { ...enteredUnit },
      resolved: { ...resolvedUnit },
    },
    battle: {
      baseline: { ...BATTLE_STAT_BASELINES },
      entered: { ...enteredBattle },
      totals: { ...totals },
      includedSources: [...includedSources],
      excludedSources: [...excludedSources],
    },
    effective,
    engineStats: {
      unit: { ...resolvedUnit },
      battle: { ...totals },
    },
  };
}
