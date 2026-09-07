import assert from 'node:assert/strict';
import test from 'node:test';

import {
  EQUIPMENT_EFFECT_OVERRIDE_ASSUMPTIONS,
  EQUIPMENT_EFFECT_OVERRIDE_COVERAGE,
  EQUIPMENT_EFFECT_OVERRIDE_SCHEMA_VERSION,
  normalizeEquipmentEffectOverride,
  normalizeEquipmentEffectOverrides,
  parseEquipmentEffectOverrides,
  resolveEquipmentEffectOverrides,
  serializeEquipmentEffectOverrides,
} from '../../js/battle-simulator-equipment-overrides.js';

function loadout(overrides = {}) {
  return {
    loadoutSchemaVersion: 1,
    catalogRevisionAtSave: 'identity-test',
    mode: 'normal',
    setId: 'normal.ranger',
    pieces: [
      {
        slotId: 'weapon',
        pieceId: 'normal.ranger.weapon',
        gradeId: 'gold',
        enhancementLevel: 20,
        advancementStageId: 'star-1',
      },
      {
        slotId: 'helmet',
        pieceId: 'normal.ranger.helmet',
        gradeId: 'purple',
        enhancementLevel: 10,
        advancementStageId: null,
      },
    ],
    ...overrides,
  };
}

function override(overrides = {}) {
  return {
    id: 'observed.ranger.weapon.might',
    setId: 'normal.ranger',
    pieceId: 'normal.ranger.weapon',
    label: 'Observed Ranger weapon Might',
    statKey: 'might',
    amount: 12.5,
    operation: 'add',
    unit: 'percent',
    appliesTo: { battleModes: [], troopTypes: [], rowIds: [] },
    verification: { status: 'provisional', basis: 'user-observed' },
    ...overrides,
  };
}

function document(...overrides) {
  return {
    overrideSchemaVersion: EQUIPMENT_EFFECT_OVERRIDE_SCHEMA_VERSION,
    overrides,
  };
}

test('normal and Dragon Master identities match without consulting catalog stats', () => {
  const normal = resolveEquipmentEffectOverrides(loadout(), document(override()));
  assert.equal(normal.sources.length, 1);
  assert.equal(normal.sources[0].amount, 12.5);
  assert.deepEqual(normal.sources[0].verification, {
    basis: 'user-observed',
    status: 'provisional',
  });

  const dragonMasterLoadout = loadout({
    mode: 'dragon-master',
    setId: 'dragon-master',
    pieces: [
      {
        slotId: 'weapon',
        pieceId: 'dragon-master.weapon',
        gradeId: 'gold',
        enhancementLevel: 0,
        advancementStageId: null,
      },
    ],
  });
  const dmOverride = override({
    id: 'observed.dm.damage',
    setId: 'dragon-master',
    pieceId: 'dragon-master.weapon',
    statKey: 'damage',
    label: 'Observed Dragon Master damage',
  });
  assert.equal(
    resolveEquipmentEffectOverrides(dragonMasterLoadout, document(dmOverride)).sources.length,
    1
  );
});

test('grade, enhancement, and advancement constraints require an exact observed identity', () => {
  const exact = override({
    gradeId: 'gold',
    enhancementLevel: 20,
    advancementStageId: 'star-1',
  });
  assert.equal(resolveEquipmentEffectOverrides(loadout(), document(exact)).sources.length, 1);

  for (const changed of [
    { gradeId: 'purple' },
    { enhancementLevel: 19 },
    { advancementStageId: 'star-2' },
    { slotId: 'helmet' },
  ]) {
    const result = resolveEquipmentEffectOverrides(loadout(), document({ ...exact, ...changed }));
    assert.equal(result.sources.length, 0);
    assert.equal(result.diagnostics[0].code, 'constraint-mismatch');
  }
});

test('a set-only override acts as a wildcard set bonus', () => {
  const setBonus = override({
    id: 'observed.ranger.set.hp',
    pieceId: undefined,
    statKey: 'hp',
    label: 'Observed Ranger set HP',
  });
  const result = resolveEquipmentEffectOverrides(loadout(), document(setBonus));
  assert.equal(result.sources.length, 1);
  assert.equal(result.sources[0].statKey, 'hp');
});

test('applicability scope is normalized into the emitted battle stat source', () => {
  const scoped = override({
    appliesTo: {
      battleModes: ['siege', 'pvp-field'],
      troopTypes: ['footmen'],
      rowIds: ['back'],
    },
  });
  const result = resolveEquipmentEffectOverrides(loadout(), document(scoped));
  assert.deepEqual(result.sources[0].appliesTo, {
    battleModes: ['pvp-field', 'siege'],
    troopTypes: ['footmen'],
    rowIds: ['back'],
  });
});

test('invalid records fail closed with diagnostics', () => {
  const invalids = [
    override({ id: 'bad space' }),
    override({ id: 'bad-stat', statKey: 'attack' }),
    override({ id: 'bad-amount', amount: Infinity }),
    override({ id: 'bad-operation', operation: 'multiply' }),
    override({ id: 'bad-unit', unit: 'raw' }),
    override({ id: 'bad-verification', verification: { status: 'verified', basis: 'catalog' } }),
    override({ id: 'bad-scope', appliesTo: { battleModes: ['arena'] } }),
  ];
  const result = resolveEquipmentEffectOverrides(loadout(), document(...invalids));
  assert.equal(result.sources.length, 0);
  assert.equal(result.diagnostics.length, invalids.length);
  assert.ok(result.diagnostics.every(({ code }) => code === 'invalid-override'));
});

test('exact duplicates apply once while conflicting stable IDs apply nothing', () => {
  const exact = override();
  const duplicate = resolveEquipmentEffectOverrides(loadout(), document(exact, { ...exact }));
  assert.equal(duplicate.sources.length, 1);
  assert.equal(duplicate.diagnostics[0].code, 'duplicate-override');

  const conflict = resolveEquipmentEffectOverrides(
    loadout(),
    document(exact, { ...exact, amount: 99 })
  );
  assert.equal(conflict.sources.length, 0);
  assert.equal(conflict.diagnostics[0].code, 'conflicting-override');
});

test('set and piece mismatches emit diagnostics and never emit sources', () => {
  const result = resolveEquipmentEffectOverrides(
    loadout(),
    document(
      override({ id: 'wrong-set', setId: 'normal.dreadnaught' }),
      override({ id: 'wrong-piece', pieceId: 'normal.ranger.armor' })
    )
  );
  assert.equal(result.sources.length, 0);
  assert.deepEqual(
    result.diagnostics.map(({ code }) => code),
    ['constraint-mismatch', 'constraint-mismatch']
  );
});

test('normalization and resolution order are deterministic', () => {
  const alpha = override({ id: 'alpha', amount: 1 });
  const zulu = override({ id: 'zulu', amount: 2 });
  const forward = resolveEquipmentEffectOverrides(loadout(), document(zulu, alpha));
  const reverse = resolveEquipmentEffectOverrides(loadout(), document(alpha, zulu));
  assert.deepEqual(forward, reverse);
  assert.deepEqual(
    forward.sources.map(({ sourceId }) => sourceId),
    ['equipment-override:alpha', 'equipment-override:zulu']
  );
});

test('serialization and parsing round-trip the canonical versioned document', () => {
  const raw = document(
    override({
      note: 'Captured from the equipment panel.',
      sourceRef: 'user-capture-2026-07-26',
    })
  );
  const serialized = serializeEquipmentEffectOverrides(raw);
  const parsed = parseEquipmentEffectOverrides(serialized);
  assert.deepEqual(parsed.overrides, normalizeEquipmentEffectOverrides(raw).overrides);
  assert.equal(parsed.overrideSchemaVersion, EQUIPMENT_EFFECT_OVERRIDE_SCHEMA_VERSION);
  assert.deepEqual(parsed.diagnostics, []);
});

test('normalization and resolution detach and freeze outputs without mutating inputs', () => {
  const rawOverride = override({
    appliesTo: { battleModes: ['siege'], troopTypes: [], rowIds: [] },
  });
  const rawDocument = document(rawOverride);
  const before = structuredClone(rawDocument);
  const normalized = normalizeEquipmentEffectOverride(rawOverride);
  const resolved = resolveEquipmentEffectOverrides(loadout(), rawDocument);

  assert.deepEqual(rawDocument, before);
  assert.notStrictEqual(normalized, rawOverride);
  assert.notStrictEqual(normalized.appliesTo, rawOverride.appliesTo);
  assert.equal(Object.isFrozen(normalized), true);
  assert.equal(Object.isFrozen(normalized.appliesTo.battleModes), true);
  assert.equal(Object.isFrozen(resolved), true);
  assert.equal(Object.isFrozen(resolved.sources), true);
});

test('empty documents and empty equipment identity produce no effects', () => {
  const empty = resolveEquipmentEffectOverrides(loadout(), document());
  assert.deepEqual(empty.sources, []);
  assert.deepEqual(empty.diagnostics, []);

  const noEquipment = {
    loadoutSchemaVersion: 1,
    catalogRevisionAtSave: 'identity-test',
    mode: 'none',
    setId: null,
    pieces: [],
  };
  const result = resolveEquipmentEffectOverrides(noEquipment, document(override()));
  assert.deepEqual(result.sources, []);
  assert.equal(result.diagnostics[0].code, 'constraint-mismatch');
});

test('schema failures, bad JSON, and invalid loadouts fail closed', () => {
  assert.equal(
    normalizeEquipmentEffectOverrides({ overrideSchemaVersion: 99, overrides: [] }).diagnostics[0]
      .code,
    'unsupported-schema-version'
  );
  assert.equal(parseEquipmentEffectOverrides('{').diagnostics[0].code, 'invalid-json');
  const invalidLoadout = resolveEquipmentEffectOverrides(
    { mode: 'normal', setId: null, pieces: [] },
    document(override())
  );
  assert.deepEqual(invalidLoadout.sources, []);
  assert.equal(invalidLoadout.diagnostics[0].code, 'invalid-loadout');
});

test('published assumptions and coverage make provisional limits explicit', () => {
  assert.match(EQUIPMENT_EFFECT_OVERRIDE_ASSUMPTIONS.authority, /provisional/i);
  assert.equal(EQUIPMENT_EFFECT_OVERRIDE_COVERAGE.catalogData, 'identity-only');
  assert.deepEqual(EQUIPMENT_EFFECT_OVERRIDE_COVERAGE.operations, ['add']);
});
