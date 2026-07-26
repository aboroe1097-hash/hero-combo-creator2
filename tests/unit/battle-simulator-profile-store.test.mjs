import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createDefaultEquipmentLoadout,
  createEquipmentSetLoadout,
} from '../../js/battle-simulator-equipment.js';
import { EQUIPMENT_EFFECT_OVERRIDE_SCHEMA_VERSION } from '../../js/battle-simulator-equipment-overrides.js';
import {
  BATTLE_PROFILE_OVERRIDE_SCHEMA_VERSION,
  BATTLE_PROFILE_OVERRIDE_STORAGE_KEY,
  createBattleProfileOverride,
  hasSavedEquipmentProfile,
  parseBattleProfileOverride,
  readBattleProfileOverride,
  writeBattleProfileOverride,
} from '../../js/battle-simulator-profile-store.js';

const SAVED_AT = '2026-07-26T12:34:56.789Z';

function emptyOverrides(overrides = []) {
  return {
    overrideSchemaVersion: EQUIPMENT_EFFECT_OVERRIDE_SCHEMA_VERSION,
    overrides,
  };
}

function provisionalOverride(overrides = {}) {
  return {
    id: 'observed.ranger.might',
    setId: 'normal.ranger',
    label: 'Observed Ranger Might',
    statKey: 'might',
    amount: 12.5,
    operation: 'add',
    unit: 'percent',
    appliesTo: { battleModes: [], troopTypes: [], rowIds: [] },
    verification: { status: 'provisional', basis: 'user-observed' },
    ...overrides,
  };
}

function createStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    read(key) {
      return values.get(key);
    },
  };
}

function createProfile(overrides = {}) {
  return createBattleProfileOverride({
    equipmentLoadout: createEquipmentSetLoadout({ setId: 'normal.ranger' }),
    equipmentEffectOverrides: emptyOverrides([provisionalOverride()]),
    savedAt: SAVED_AT,
    ...overrides,
  });
}

test('profile overrides use the dedicated versioned key and round-trip canonical JSON', () => {
  assert.equal(BATTLE_PROFILE_OVERRIDE_STORAGE_KEY, 'vts_battle_simulator_profile_override_v1');
  assert.equal(BATTLE_PROFILE_OVERRIDE_SCHEMA_VERSION, 1);
  const profile = createProfile();
  const storage = createStorage();

  const written = writeBattleProfileOverride(profile, storage);
  assert.deepEqual(written, profile);
  assert.deepEqual(JSON.parse(storage.read(BATTLE_PROFILE_OVERRIDE_STORAGE_KEY)), profile);
  assert.deepEqual(readBattleProfileOverride(storage), { profile, error: null });
  assert.deepEqual(parseBattleProfileOverride(JSON.stringify(profile)), profile);
});

test('null and blank profile text represent no saved override', () => {
  assert.equal(parseBattleProfileOverride(null), null);
  assert.equal(parseBattleProfileOverride(''), null);
  assert.equal(parseBattleProfileOverride(' \n\t '), null);
  assert.deepEqual(readBattleProfileOverride(createStorage()), {
    profile: null,
    error: null,
  });
});

test('corrupt JSON, unsupported schemas, and noncanonical timestamps are rejected', () => {
  assert.throws(() => parseBattleProfileOverride('{bad'), /JSON is invalid/i);
  assert.throws(
    () => parseBattleProfileOverride(JSON.stringify({ ...createProfile(), schemaVersion: 99 })),
    /unsupported.*schema/i
  );
  for (const savedAt of ['not-a-date', '2026-07-26T12:34:56Z', '2026-07-26']) {
    assert.throws(
      () => parseBattleProfileOverride(JSON.stringify({ ...createProfile(), savedAt })),
      /canonical ISO timestamp/i
    );
  }
});

test('invalid equipment and oversized JSON are rejected instead of partially saved', () => {
  assert.throws(
    () =>
      createBattleProfileOverride({
        equipmentLoadout: { mode: 'normal', setId: null, pieces: [] },
        equipmentEffectOverrides: emptyOverrides(),
        savedAt: SAVED_AT,
      }),
    /setId/i
  );
  assert.throws(
    () =>
      createBattleProfileOverride({
        equipmentLoadout: createDefaultEquipmentLoadout(),
        equipmentEffectOverrides: emptyOverrides([
          provisionalOverride({ verification: { status: 'verified', basis: 'catalog' } }),
        ]),
        savedAt: SAVED_AT,
      }),
    /invalid equipment effect overrides/i
  );
  assert.throws(() => parseBattleProfileOverride(`"${'x'.repeat(128 * 1024)}"`), /cannot exceed/i);
});

test('storage read failures and corrupt records fail closed without throwing', () => {
  const missingStorage = readBattleProfileOverride(null);
  assert.equal(missingStorage.profile, null);
  assert.ok(missingStorage.error instanceof Error);
  const unavailable = readBattleProfileOverride({
    getItem() {
      throw new Error('blocked');
    },
  });
  assert.equal(unavailable.profile, null);
  assert.match(unavailable.error.message, /blocked/);

  const corrupt = readBattleProfileOverride(
    createStorage({ [BATTLE_PROFILE_OVERRIDE_STORAGE_KEY]: '{bad' })
  );
  assert.equal(corrupt.profile, null);
  assert.ok(corrupt.error instanceof Error);
});

test('write failures throw and normalized profiles are deeply immutable and detached', () => {
  const rawLoadout = createEquipmentSetLoadout({ setId: 'normal.ranger' });
  const rawOverrides = emptyOverrides([provisionalOverride()]);
  const profile = createBattleProfileOverride({
    equipmentLoadout: rawLoadout,
    equipmentEffectOverrides: rawOverrides,
    savedAt: SAVED_AT,
  });

  rawLoadout.pieces[0].pieceId = 'changed';
  rawOverrides.overrides[0].amount = 999;
  assert.notEqual(profile.equipmentLoadout.pieces[0].pieceId, 'changed');
  assert.equal(profile.equipmentEffectOverrides.overrides[0].amount, 12.5);
  assert.equal(Object.isFrozen(profile), true);
  assert.equal(Object.isFrozen(profile.equipmentLoadout.pieces), true);
  assert.equal(Object.isFrozen(profile.equipmentLoadout.pieces[0]), true);
  assert.equal(Object.isFrozen(profile.equipmentEffectOverrides.overrides[0].appliesTo), true);

  assert.throws(() => writeBattleProfileOverride(profile, null), /unavailable/i);
  assert.throws(
    () =>
      writeBattleProfileOverride(profile, {
        setItem() {
          throw new Error('quota');
        },
      }),
    /quota/
  );
});

test('saved equipment detection requires a set, pieces, or a provisional override', () => {
  const empty = createBattleProfileOverride({
    equipmentLoadout: createDefaultEquipmentLoadout(),
    equipmentEffectOverrides: emptyOverrides(),
    savedAt: SAVED_AT,
  });
  const overrideOnly = createBattleProfileOverride({
    equipmentLoadout: createDefaultEquipmentLoadout(),
    equipmentEffectOverrides: emptyOverrides([provisionalOverride()]),
    savedAt: SAVED_AT,
  });

  assert.equal(hasSavedEquipmentProfile(empty), false);
  assert.equal(hasSavedEquipmentProfile(createProfile()), true);
  assert.equal(hasSavedEquipmentProfile(overrideOnly), true);
  assert.equal(hasSavedEquipmentProfile({}), false);
});
