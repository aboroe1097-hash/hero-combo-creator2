export const BATTLE_STAT_KEYS = Object.freeze([
  'might',
  'resistance',
  'hp',
  'tacticalMight',
  'tacticalResistance',
  'damage',
  'damageMitigation',
  'combatSpeed',
]);

export const BATTLE_STAT_BASELINES = Object.freeze({
  might: 100,
  resistance: 100,
  hp: 100,
  tacticalMight: 0,
  tacticalResistance: 0,
  damage: 0,
  damageMitigation: 0,
  combatSpeed: 0,
});

const RAW_STAT_KEYS = new Set(['combatSpeed']);
const FILTER_KEYS = Object.freeze(['battleModes', 'troopTypes', 'rowIds']);
const MAX_SOURCE_TEXT_LENGTH = 500;
const MAX_METADATA_DEPTH = 6;
const MAX_METADATA_ENTRIES = 100;
const MAX_METADATA_STRING_LENGTH = 2_000;

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function requirePlainObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object.`);
  }
  return value;
}

function normalizeRequiredText(value, label) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new TypeError(`${label} must be a non-empty string.`);
  }
  const normalized = value.trim();
  if (normalized.length > MAX_SOURCE_TEXT_LENGTH) {
    throw new RangeError(`${label} must not exceed ${MAX_SOURCE_TEXT_LENGTH} characters.`);
  }
  return normalized;
}

function normalizeAmount(value, label) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`${label} must be a finite number.`);
  }
  return value;
}

function cloneSerializable(
  value,
  label,
  { ancestors = new WeakSet(), depth = 0, budget = { entries: 0 } } = {}
) {
  if (depth > MAX_METADATA_DEPTH) {
    throw new RangeError(`${label} must not exceed ${MAX_METADATA_DEPTH} nested levels.`);
  }
  if (value === null || ['string', 'number', 'boolean'].includes(typeof value)) {
    if (typeof value === 'number' && !Number.isFinite(value)) {
      throw new TypeError(`${label} must contain only finite numbers.`);
    }
    if (typeof value === 'string' && value.length > MAX_METADATA_STRING_LENGTH) {
      throw new RangeError(
        `${label} strings must not exceed ${MAX_METADATA_STRING_LENGTH} characters.`
      );
    }
    return value;
  }
  if (typeof value !== 'object') {
    throw new TypeError(`${label} must contain only JSON-compatible values.`);
  }
  if (ancestors.has(value)) throw new TypeError(`${label} must not contain cycles.`);

  ancestors.add(value);
  if (Array.isArray(value)) {
    budget.entries += value.length;
    if (budget.entries > MAX_METADATA_ENTRIES) {
      throw new RangeError(`${label} must not exceed ${MAX_METADATA_ENTRIES} entries.`);
    }
    const output = value.map((item) =>
      cloneSerializable(item, label, { ancestors, depth: depth + 1, budget })
    );
    ancestors.delete(value);
    return Object.freeze(output);
  }

  const output = {};
  const keys = Object.keys(value).sort(compareText);
  budget.entries += keys.length;
  if (budget.entries > MAX_METADATA_ENTRIES) {
    throw new RangeError(`${label} must not exceed ${MAX_METADATA_ENTRIES} entries.`);
  }
  for (const key of keys) {
    if (key.length > MAX_METADATA_STRING_LENGTH) {
      throw new RangeError(
        `${label} keys must not exceed ${MAX_METADATA_STRING_LENGTH} characters.`
      );
    }
    output[key] = cloneSerializable(value[key], label, {
      ancestors,
      depth: depth + 1,
      budget,
    });
  }
  ancestors.delete(value);
  return Object.freeze(output);
}

function normalizeFilterValues(value, label) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new TypeError(`${label} must be an array.`);
  return [...new Set(value.map((item) => normalizeRequiredText(item, label)))].sort(compareText);
}

function normalizeAppliesTo(rawAppliesTo) {
  if (rawAppliesTo === undefined || rawAppliesTo === null) {
    return Object.freeze({ battleModes: [], troopTypes: [], rowIds: [] });
  }
  const appliesTo = requirePlainObject(rawAppliesTo, 'Stat source appliesTo');
  return Object.freeze(
    Object.fromEntries(
      FILTER_KEYS.map((key) => [key, Object.freeze(normalizeFilterValues(appliesTo[key], key))])
    )
  );
}

function normalizeContext(context = {}) {
  if (context === undefined || context === null) return {};
  const raw = requirePlainObject(context, 'Stat source context');
  return {
    battleMode: raw.battleMode === undefined ? undefined : String(raw.battleMode),
    troopType:
      raw.troopType === undefined && raw.type === undefined
        ? undefined
        : String(raw.troopType ?? raw.type),
    rowId: raw.rowId === undefined ? undefined : String(raw.rowId),
  };
}

function sourceSortKey(source) {
  return JSON.stringify([
    source.sourceType,
    source.sourceId,
    source.statKey,
    source.label,
    source.amount,
    source.operation,
    source.unit,
    source.appliesTo,
    source.verification,
    source.provenance,
  ]);
}

function sourceIdentityKey(source) {
  return JSON.stringify([source.sourceType, source.sourceId, source.statKey, source.appliesTo]);
}

function validateStatSourceSemantics(source, index) {
  if (source.operation !== 'add') {
    throw new RangeError(`Stat source ${index + 1} operation must be "add".`);
  }

  const expectedUnit = getBattleStatUnit(source.statKey);
  if (source.unit !== expectedUnit) {
    throw new RangeError(`${source.statKey} sources must use unit "${expectedUnit}".`);
  }
  return source;
}

function buildStatSourceCandidate(rawSource, index) {
  const source = requirePlainObject(rawSource, `Stat source ${index + 1}`);
  const statKey = normalizeRequiredText(source.statKey, `Stat source ${index + 1} statKey`);
  if (!BATTLE_STAT_KEYS.includes(statKey)) {
    throw new RangeError(`Unsupported battle stat "${statKey}".`);
  }

  return Object.freeze({
    sourceType: normalizeRequiredText(source.sourceType, `Stat source ${index + 1} sourceType`),
    sourceId: normalizeRequiredText(source.sourceId, `Stat source ${index + 1} sourceId`),
    label: normalizeRequiredText(source.label, `Stat source ${index + 1} label`),
    statKey,
    amount: normalizeAmount(source.amount, `Stat source ${index + 1} amount`),
    operation: source.operation,
    unit: normalizeRequiredText(source.unit, `Stat source ${index + 1} unit`),
    appliesTo: normalizeAppliesTo(source.appliesTo),
    verification: cloneSerializable(source.verification ?? null, 'Stat source verification'),
    provenance: cloneSerializable(source.provenance ?? null, 'Stat source provenance'),
  });
}

export function getBattleStatUnit(statKey) {
  if (!BATTLE_STAT_KEYS.includes(statKey)) {
    throw new RangeError(`Unsupported battle stat "${String(statKey)}".`);
  }
  return RAW_STAT_KEYS.has(statKey) ? 'raw' : 'percent';
}

export function normalizeStatSource(rawSource, index = 0) {
  return validateStatSourceSemantics(buildStatSourceCandidate(rawSource, index), index);
}

export function normalizeStatSources(rawSources = []) {
  if (!Array.isArray(rawSources)) throw new TypeError('Stat sources must be an array.');
  const normalized = rawSources
    .map((source, index) => ({ source: buildStatSourceCandidate(source, index), index }))
    .sort((left, right) => compareText(sourceSortKey(left.source), sourceSortKey(right.source)));
  const uniqueByIdentity = new Map();

  for (const record of normalized) {
    const { source } = record;
    const identity = sourceIdentityKey(source);
    const existing = uniqueByIdentity.get(identity);
    if (!existing) {
      uniqueByIdentity.set(identity, record);
      continue;
    }
    if (sourceSortKey(existing.source) !== sourceSortKey(source)) {
      throw new RangeError(
        `Conflicting duplicate stat source "${source.sourceType}:${source.sourceId}" for ${source.statKey}; records with the same identity and applicability must be identical.`
      );
    }
  }

  return Object.freeze(
    [...uniqueByIdentity.values()].map(({ source, index }) =>
      validateStatSourceSemantics(source, index)
    )
  );
}

export function getStatSourceExclusionReason(source, rawContext = {}) {
  const context = normalizeContext(rawContext);
  const checks = [
    ['battleModes', context.battleMode, 'battle-mode'],
    ['troopTypes', context.troopType, 'troop-type'],
    ['rowIds', context.rowId, 'row'],
  ];
  for (const [filterKey, value, reason] of checks) {
    const allowed = source.appliesTo[filterKey];
    if (allowed.length > 0 && (value === undefined || !allowed.includes(value))) return reason;
  }
  return null;
}

export function partitionStatSources(rawSources = [], context = {}) {
  const included = [];
  const excluded = [];
  for (const source of normalizeStatSources(rawSources)) {
    const exclusionReason = getStatSourceExclusionReason(source, context);
    if (exclusionReason) excluded.push(Object.freeze({ ...source, exclusionReason }));
    else included.push(source);
  }
  return Object.freeze({
    included: Object.freeze(included),
    excluded: Object.freeze(excluded),
  });
}

export function sumStatSources(rawSources = []) {
  const totals = Object.fromEntries(BATTLE_STAT_KEYS.map((key) => [key, 0]));
  for (const source of normalizeStatSources(rawSources)) {
    const next = totals[source.statKey] + source.amount;
    if (!Number.isFinite(next)) {
      throw new RangeError(`Stat source total for ${source.statKey} is too large.`);
    }
    totals[source.statKey] = next;
  }
  return totals;
}
