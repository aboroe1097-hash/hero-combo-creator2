import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BATTLE_STAT_BASELINES,
  BATTLE_STAT_KEYS,
  getBattleStatUnit,
  normalizeStatSource,
  normalizeStatSources,
  partitionStatSources,
  sumStatSources,
} from '../../js/battle-simulator-stat-sources.js';

function source(overrides = {}) {
  return {
    sourceType: 'research',
    sourceId: 'research.might-1',
    label: 'Might I',
    statKey: 'might',
    amount: 25,
    operation: 'add',
    unit: 'percent',
    appliesTo: { battleModes: [], troopTypes: [], rowIds: [] },
    verification: { status: 'verified' },
    provenance: { file: 'tech-db.js' },
    ...overrides,
  };
}

test('source module publishes the complete v2 key set and neutral baselines', () => {
  assert.deepEqual(BATTLE_STAT_KEYS, [
    'might',
    'resistance',
    'hp',
    'tacticalMight',
    'tacticalResistance',
    'damage',
    'damageMitigation',
    'combatSpeed',
  ]);
  assert.deepEqual(BATTLE_STAT_BASELINES, {
    might: 100,
    resistance: 100,
    hp: 100,
    tacticalMight: 0,
    tacticalResistance: 0,
    damage: 0,
    damageMitigation: 0,
    combatSpeed: 0,
  });
  assert.equal(getBattleStatUnit('damageMitigation'), 'percent');
  assert.equal(getBattleStatUnit('combatSpeed'), 'raw');
});

test('normalization returns the exact source record shape and detached sorted filters', () => {
  const appliesTo = {
    battleModes: ['siege', 'pvp-field', 'pvp-field'],
    troopTypes: ['cavalry'],
    rowIds: ['front'],
  };
  const raw = source({ appliesTo });
  const normalized = normalizeStatSource(raw);

  assert.deepEqual(Object.keys(normalized), [
    'sourceType',
    'sourceId',
    'label',
    'statKey',
    'amount',
    'operation',
    'unit',
    'appliesTo',
    'verification',
    'provenance',
  ]);
  assert.deepEqual(normalized.appliesTo, {
    battleModes: ['pvp-field', 'siege'],
    troopTypes: ['cavalry'],
    rowIds: ['front'],
  });
  assert.notStrictEqual(normalized.appliesTo, appliesTo);
  assert.notStrictEqual(normalized.verification, raw.verification);
  assert.equal(Object.isFrozen(normalized), true);
  assert.equal(Object.isFrozen(normalized.appliesTo.battleModes), true);
  assert.equal(Object.isFrozen(normalized.verification), true);
  assert.equal(Object.isFrozen(normalized.provenance), true);
});

test('source ordering and sums are deterministic regardless of caller order', () => {
  const sources = [
    source({ sourceId: 'z', amount: 0.1 }),
    source({ sourceId: 'a', amount: 0.2 }),
    source({ sourceId: 'm', statKey: 'damage', amount: 10 }),
  ];
  const forward = normalizeStatSources(sources);
  const reverse = normalizeStatSources([...sources].reverse());

  assert.deepEqual(forward, reverse);
  assert.deepEqual(sumStatSources(forward), sumStatSources(reverse));
  assert.equal(sumStatSources(forward).might, 0.30000000000000004);
  assert.equal(sumStatSources(forward).damage, 10);
});

test('exact duplicate source contributions collapse after canonical normalization', () => {
  const first = source({
    appliesTo: {
      battleModes: ['siege', 'pvp-field'],
      troopTypes: ['cavalry'],
      rowIds: ['front'],
    },
  });
  const sameCanonicalSource = source({
    appliesTo: {
      battleModes: ['pvp-field', 'siege', 'pvp-field'],
      troopTypes: ['cavalry', 'cavalry'],
      rowIds: ['front'],
    },
  });
  const normalized = normalizeStatSources([first, sameCanonicalSource]);

  assert.equal(normalized.length, 1);
  assert.equal(sumStatSources([first, sameCanonicalSource]).might, 25);
  assert.equal(Object.isFrozen(normalized), true);
  assert.equal(Object.isFrozen(normalized[0]), true);
});

test('same source identity and applicability reject conflicting contribution records', () => {
  const conflict = /Conflicting duplicate stat source "research:research\.might-1" for might/i;

  assert.throws(() => normalizeStatSources([source(), source({ amount: 30 })]), conflict);
  assert.throws(
    () => normalizeStatSources([source(), source({ operation: 'multiply' })]),
    conflict
  );
  assert.throws(() => normalizeStatSources([source(), source({ unit: 'raw' })]), conflict);
  assert.throws(
    () => normalizeStatSources([source(), source({ provenance: { file: 'other.js' } })]),
    conflict
  );
});

test('matching source IDs remain independent across stats and canonical applicability scopes', () => {
  const normalized = normalizeStatSources([
    source(),
    source({ statKey: 'damage', unit: 'percent' }),
    source({ appliesTo: { battleModes: ['pvp-field'], troopTypes: [], rowIds: [] } }),
  ]);

  assert.equal(normalized.length, 3);
});

test('source summation rejects finite inputs whose accumulated total overflows', () => {
  assert.throws(
    () =>
      sumStatSources([
        source({ sourceId: 'max-a', amount: Number.MAX_VALUE }),
        source({ sourceId: 'max-b', amount: Number.MAX_VALUE }),
      ]),
    /total for might is too large/i
  );
});

test('applicability filters battle mode, troop type, and row id independently', () => {
  const sources = [
    source({ sourceId: 'all' }),
    source({
      sourceId: 'mode',
      appliesTo: { battleModes: ['siege'], troopTypes: [], rowIds: [] },
    }),
    source({
      sourceId: 'troop',
      appliesTo: { battleModes: [], troopTypes: ['footmen'], rowIds: [] },
    }),
    source({
      sourceId: 'row',
      appliesTo: { battleModes: [], troopTypes: [], rowIds: ['middle'] },
    }),
  ];
  const result = partitionStatSources(sources, {
    battleMode: 'pvp-field',
    troopType: 'cavalry',
    rowId: 'front',
  });

  assert.deepEqual(
    result.included.map((item) => item.sourceId),
    ['all']
  );
  assert.deepEqual(
    Object.fromEntries(result.excluded.map((item) => [item.sourceId, item.exclusionReason])),
    { mode: 'battle-mode', row: 'row', troop: 'troop-type' }
  );
});

test('source validation rejects malformed operations, units, filters, metadata, and cycles', () => {
  assert.throws(() => normalizeStatSource(source({ operation: 'multiply' })), /must be "add"/);
  assert.throws(
    () => normalizeStatSource(source({ statKey: 'combatSpeed', unit: 'percent' })),
    /must use unit "raw"/
  );
  assert.throws(() => normalizeStatSource(source({ statKey: 'load' })), /Unsupported battle stat/);
  assert.throws(() => normalizeStatSource(source({ amount: Infinity })), /finite number/);
  assert.throws(
    () => normalizeStatSource(source({ appliesTo: { battleModes: 'pvp-field' } })),
    /must be an array/
  );
  assert.throws(
    () => normalizeStatSource(source({ provenance: { value: undefined } })),
    /JSON-compatible/
  );

  const cyclic = {};
  cyclic.self = cyclic;
  assert.throws(
    () => normalizeStatSource(source({ verification: cyclic })),
    /must not contain cycles/
  );
});

test('source metadata is depth, entry, and string bounded and recursively frozen', () => {
  const nestedMetadata = { level: { values: [{ source: 'verified' }] } };
  const normalized = normalizeStatSource(
    source({ verification: nestedMetadata, provenance: nestedMetadata })
  );
  assert.equal(Object.isFrozen(normalized.verification.level), true);
  assert.equal(Object.isFrozen(normalized.verification.level.values), true);
  assert.equal(Object.isFrozen(normalized.verification.level.values[0]), true);

  let tooDeep = 'leaf';
  for (let depth = 0; depth < 8; depth += 1) tooDeep = { next: tooDeep };
  assert.throws(
    () => normalizeStatSource(source({ verification: tooDeep })),
    /must not exceed 6 nested levels/i
  );

  const tooMany = Object.fromEntries(
    Array.from({ length: 101 }, (_, index) => [`entry${index}`, index])
  );
  assert.throws(
    () => normalizeStatSource(source({ provenance: tooMany })),
    /must not exceed 100 entries/i
  );
  assert.throws(
    () => normalizeStatSource(source({ verification: 'x'.repeat(2_001) })),
    /strings must not exceed 2000 characters/i
  );
});
