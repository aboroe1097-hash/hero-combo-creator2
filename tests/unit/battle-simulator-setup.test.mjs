import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BATTLE_SETUP_PRESET_STORAGE_KEY,
  MAX_BATTLE_SETUP_PRESETS,
  deleteBattleSetupPreset,
  normalizeBattleSetupPresetName,
  parseBattleSetupPresetStore,
  upsertBattleSetupPreset,
} from '../../js/battle-simulator-preset-store.js';
import {
  SETUP_SCHEMA_VERSION,
  applySetupSnapshot,
  buildSetupSnapshot,
  parseSetupSnapshot,
  setupSnapshotToEngineConfig,
} from '../../js/battle-simulator-setup.js';

const ROW_IDS = ['front', 'middle', 'back'];
const TYPES = ['footmen', 'cavalry', 'archers'];

function stats(offset = 0) {
  return {
    might: 100 + offset,
    resistance: 80 + offset,
    hp: 30 + offset,
    tacticalMight: 20 + offset,
    tacticalResistance: 15 + offset,
    damage: 10 + offset,
    combatSpeed: 500 + offset,
  };
}

function baseValues(offset = 0) {
  return {
    might: 70 + offset,
    resistance: 50 + offset,
    hp: 20 + offset,
  };
}

function editableFields(type, tier, offset = 0) {
  return {
    type,
    tier,
    troops: 31_000 + offset,
    baseValues: baseValues(offset),
    bonuses: stats(offset),
    finals: stats(offset + 10),
  };
}

function side(sideOffset, tier, mode) {
  return {
    mode,
    sideDefaults: editableFields(TYPES[sideOffset], tier, sideOffset),
    rows: ROW_IDS.map((id, index) => ({
      id,
      ...editableFields(TYPES[index], tier, sideOffset + index),
      open: index === sideOffset,
      customized: index === 1,
    })),
  };
}

function stateFixture() {
  return {
    battleMode: 'pvp-field',
    iterations: 50,
    seed: 1097,
    strikeVariancePct: 5,
    sides: {
      A: side(0, 9, 'add-bonuses'),
      B: side(1, 10, 'final-totals'),
    },
  };
}

function snapshotFixture() {
  return buildSetupSnapshot(stateFixture());
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

test('build, stringify, parse, and apply round-trip the complete simulator setup', () => {
  const state = deepFreeze(stateFixture());
  const stateBefore = structuredClone(state);
  const snapshot = buildSetupSnapshot(state);

  assert.equal(snapshot.setupSchemaVersion, SETUP_SCHEMA_VERSION);
  assert.equal(snapshot.savedAt, null);
  assert.equal(snapshot.battleMode, 'pvp-field');
  assert.deepEqual(snapshot.runOptions, {
    iterations: state.iterations,
    seed: state.seed,
    strikeVariancePct: state.strikeVariancePct,
  });
  assert.deepEqual(snapshot.sides, state.sides);

  snapshot.savedAt = '2026-07-16T00:00:00.000Z';
  const parsed = parseSetupSnapshot(JSON.stringify(snapshot));
  const currentState = deepFreeze({ ...stateFixture(), transientView: { selectedResult: 7 } });
  const currentBefore = structuredClone(currentState);
  const applied = applySetupSnapshot(currentState, deepFreeze(parsed));

  assert.deepEqual(
    applied,
    { ...stateBefore, transientView: { selectedResult: 7 } },
    'setup fields replace state while unrelated top-level state survives'
  );
  assert.deepEqual(state, stateBefore);
  assert.deepEqual(currentState, currentBefore);
  assert.notStrictEqual(applied.sides, parsed.sides);
  assert.notStrictEqual(applied.sides.A.rows[0], parsed.sides.A.rows[0]);
  assert.notStrictEqual(applied.sides.A.rows[0].bonuses, parsed.sides.A.rows[0].bonuses);
});

test('parseSetupSnapshot returns a canonical snapshot and ignores future extra keys', () => {
  const raw = snapshotFixture();
  raw.futureTopLevel = { enabled: true };
  raw.sides.C = { future: true };
  raw.sides.A.futureSideField = 'ignored';
  raw.sides.A.sideDefaults.futureDefaultField = 'ignored';
  raw.sides.A.rows[0].futureRowField = 'ignored';
  raw.sides.A.rows[0].bonuses.futureStat = 999;
  raw.sides.A.sideDefaults.baseValues.lethalDamage = 999;
  raw.sides.A.sideDefaults.finals.lethalDamage = 999;
  raw.sides.A.rows[0].baseValues.lethalDamage = 999;
  raw.sides.A.rows[0].bonuses.lethalDamage = 999;
  const parsed = parseSetupSnapshot(JSON.stringify(raw));

  assert.deepEqual(Object.keys(parsed), [
    'setupSchemaVersion',
    'savedAt',
    'battleMode',
    'sides',
    'runOptions',
  ]);
  assert.deepEqual(Object.keys(parsed.sides), ['A', 'B']);
  assert.equal(Object.hasOwn(parsed.sides.A, 'futureSideField'), false);
  assert.equal(Object.hasOwn(parsed.sides.A.sideDefaults, 'futureDefaultField'), false);
  assert.equal(Object.hasOwn(parsed.sides.A.rows[0], 'futureRowField'), false);
  assert.equal(Object.hasOwn(parsed.sides.A.rows[0].bonuses, 'futureStat'), false);
  assert.equal(Object.hasOwn(parsed.sides.A.sideDefaults.baseValues, 'lethalDamage'), false);
  assert.equal(Object.hasOwn(parsed.sides.A.sideDefaults.finals, 'lethalDamage'), false);
  assert.equal(Object.hasOwn(parsed.sides.A.rows[0].baseValues, 'lethalDamage'), false);
  assert.equal(Object.hasOwn(parsed.sides.A.rows[0].bonuses, 'lethalDamage'), false);
});

test('battleMode defaults for older snapshots, rejects non-strings, and preserves future modes', () => {
  const legacy = snapshotFixture();
  delete legacy.battleMode;
  assert.equal(parseSetupSnapshot(JSON.stringify(legacy)).battleMode, 'pvp-field');

  const future = snapshotFixture();
  future.battleMode = 'siege';
  const parsedFuture = parseSetupSnapshot(JSON.stringify(future));
  assert.equal(parsedFuture.battleMode, 'siege');
  assert.equal(
    applySetupSnapshot({ ...stateFixture(), battleMode: 'pvp-field' }, parsedFuture).battleMode,
    'siege'
  );

  const invalid = snapshotFixture();
  invalid.battleMode = 7;
  assert.throws(() => parseSetupSnapshot(JSON.stringify(invalid)), {
    name: 'TypeError',
    message: /battleMode must be a string/i,
  });
});

test('setupSnapshotToEngineConfig converts each side using its active stat input mode', () => {
  const config = setupSnapshotToEngineConfig(snapshotFixture());

  assert.deepEqual(config.sideA.rows[0], {
    id: 'front',
    type: 'footmen',
    tier: 9,
    troops: 31_000,
    stats: {
      might: 170,
      resistance: 130,
      hp: 50,
      tacticalMight: 20,
      tacticalResistance: 15,
      damage: 10,
      combatSpeed: 500,
    },
  });
  assert.deepEqual(config.sideB.rows[0], {
    id: 'front',
    type: 'footmen',
    tier: 10,
    troops: 31_001,
    stats: {
      might: 111,
      resistance: 91,
      hp: 41,
      tacticalMight: 31,
      tacticalResistance: 26,
      damage: 21,
      combatSpeed: 511,
    },
  });
});

test('setupSnapshotToEngineConfig preserves canonical row order and returns detached data', () => {
  const snapshot = deepFreeze(snapshotFixture());
  const before = structuredClone(snapshot);
  const config = setupSnapshotToEngineConfig(snapshot);

  assert.deepEqual(config, {
    sideA: {
      label: 'Side A',
      rows: config.sideA.rows,
    },
    sideB: {
      label: 'Side B',
      rows: config.sideB.rows,
    },
  });
  assert.deepEqual(
    config.sideA.rows.map((row) => row.id),
    ROW_IDS
  );
  assert.deepEqual(
    config.sideB.rows.map((row) => row.id),
    ROW_IDS
  );
  assert.deepEqual(snapshot, before);
  assert.notStrictEqual(config.sideA.rows, snapshot.sides.A.rows);
  assert.notStrictEqual(config.sideA.rows[0], snapshot.sides.A.rows[0]);
  assert.notStrictEqual(config.sideA.rows[0].stats, snapshot.sides.A.rows[0].bonuses);
  assert.deepEqual(Object.keys(config.sideA.rows[0]), ['id', 'type', 'tier', 'troops', 'stats']);
});

test('setupSnapshotToEngineConfig tolerates future battle modes and drops unknown stats', () => {
  const snapshot = snapshotFixture();
  snapshot.battleMode = 'siege';
  snapshot.sides.A.rows[0].bonuses.lethalDamage = 25;
  snapshot.sides.A.rows[0].finals.damageMitigation = 30;
  snapshot.sides.B.rows[0].baseValues.lethalDamage = 5;

  const config = setupSnapshotToEngineConfig(snapshot);

  assert.equal(Object.hasOwn(config.sideA.rows[0].stats, 'lethalDamage'), false);
  assert.equal(Object.hasOwn(config.sideA.rows[0].stats, 'damageMitigation'), false);
  assert.equal(Object.hasOwn(config.sideB.rows[0].stats, 'lethalDamage'), false);
});

test('parseSetupSnapshot rejects bad JSON and missing or unsupported schema versions', () => {
  assert.throws(() => parseSetupSnapshot('{bad json'), {
    name: 'TypeError',
    message: /battle setup json is invalid/i,
  });
  assert.throws(() => parseSetupSnapshot({}), {
    name: 'TypeError',
    message: /provided as text/i,
  });

  const missing = snapshotFixture();
  delete missing.setupSchemaVersion;
  assert.throws(() => parseSetupSnapshot(JSON.stringify(missing)), {
    name: 'TypeError',
    message: /missing required field "setupSchemaVersion"/i,
  });

  const wrong = snapshotFixture();
  wrong.setupSchemaVersion = 2;
  assert.throws(() => parseSetupSnapshot(JSON.stringify(wrong)), {
    name: 'RangeError',
    message: /unsupported battle setup schema version/i,
  });
});

test('parseSetupSnapshot requires both sides and exactly ordered Front, Middle, Back rows', () => {
  const missingSide = snapshotFixture();
  delete missingSide.sides.B;
  assert.throws(() => parseSetupSnapshot(JSON.stringify(missingSide)), {
    name: 'TypeError',
    message: /missing required field "B"/,
  });

  const missingRows = snapshotFixture();
  delete missingRows.sides.A.rows;
  assert.throws(() => parseSetupSnapshot(JSON.stringify(missingRows)), {
    name: 'TypeError',
    message: /missing required field "rows"/i,
  });

  const shortRows = snapshotFixture();
  shortRows.sides.A.rows.pop();
  assert.throws(() => parseSetupSnapshot(JSON.stringify(shortRows)), {
    name: 'RangeError',
    message: /exactly three rows/i,
  });

  const misorderedRows = snapshotFixture();
  [misorderedRows.sides.A.rows[0], misorderedRows.sides.A.rows[1]] = [
    misorderedRows.sides.A.rows[1],
    misorderedRows.sides.A.rows[0],
  ];
  assert.throws(() => parseSetupSnapshot(JSON.stringify(misorderedRows)), {
    name: 'RangeError',
    message: /must use row id "front"/i,
  });
});

test('parseSetupSnapshot rejects unsupported troop types, tiers, and entry modes', () => {
  const badType = snapshotFixture();
  badType.sides.A.rows[0].type = 'mages';
  assert.throws(() => parseSetupSnapshot(JSON.stringify(badType)), {
    name: 'RangeError',
    message: /unsupported troop type "mages"/i,
  });

  const badTier = snapshotFixture();
  badTier.sides.B.sideDefaults.tier = 11;
  assert.throws(() => parseSetupSnapshot(JSON.stringify(badTier)), {
    name: 'RangeError',
    message: /unsupported troop tier T11/i,
  });

  const badMode = snapshotFixture();
  badMode.sides.A.mode = 'combined';
  assert.throws(() => parseSetupSnapshot(JSON.stringify(badMode)), {
    name: 'RangeError',
    message: /unsupported stat input mode/i,
  });
});

test('parseSetupSnapshot strictly validates stats, troops, flags, and run options', () => {
  const cases = [
    {
      mutate: (value) => {
        value.sides.A.rows[0].bonuses.might = null;
      },
      error: TypeError,
      message: /might must be a finite number/i,
    },
    {
      mutate: (value) => {
        value.sides.A.rows[0].bonuses.might = '100';
      },
      error: TypeError,
      message: /might must be a finite number/i,
    },
    {
      mutate: (value) => {
        value.sides.A.rows[0].bonuses.might = false;
      },
      error: TypeError,
      message: /might must be a finite number/i,
    },
    {
      mutate: (value) => {
        value.sides.A.rows[0].bonuses.might = -1;
      },
      error: RangeError,
      message: /might must be between 0 and 5000/i,
    },
    {
      mutate: (value) => {
        value.sides.A.rows[0].finals.combatSpeed = 10_001;
      },
      error: RangeError,
      message: /combatSpeed must be between 0 and 10000/i,
    },
    {
      mutate: (value) => {
        value.sides.A.rows[0].troops = 1.5;
      },
      error: TypeError,
      message: /troops must be a safe integer/i,
    },
    {
      mutate: (value) => {
        value.sides.A.rows[0].customized = 'false';
      },
      error: TypeError,
      message: /customized must be a boolean/i,
    },
    {
      mutate: (value) => {
        value.runOptions.iterations = 7;
      },
      error: RangeError,
      message: /iterations must be one of/i,
    },
    {
      mutate: (value) => {
        value.runOptions.seed = 0x1_0000_0000;
      },
      error: RangeError,
      message: /seed must be between/i,
    },
    {
      mutate: (value) => {
        value.runOptions.strikeVariancePct = 26;
      },
      error: RangeError,
      message: /strike variance must be between 0 and 25/i,
    },
    {
      mutate: (value) => {
        value.savedAt = 'July 16, 2026';
      },
      error: TypeError,
      message: /ISO date-time format/i,
    },
  ];

  for (const { mutate, error, message } of cases) {
    const snapshot = snapshotFixture();
    mutate(snapshot);
    assert.throws(() => parseSetupSnapshot(JSON.stringify(snapshot)), {
      name: error.name,
      message,
    });
  }

  const missingStat = snapshotFixture();
  delete missingStat.sides.A.rows[0].finals.hp;
  assert.throws(() => parseSetupSnapshot(JSON.stringify(missingStat)), {
    name: 'TypeError',
    message: /missing required field "hp"/i,
  });

  const overflowingNumberJson = JSON.stringify(snapshotFixture()).replace(
    '"might":100',
    '"might":1e999'
  );
  assert.throws(() => parseSetupSnapshot(overflowingNumberJson), {
    name: 'TypeError',
    message: /might must be a finite number/i,
  });
});

test('preset names are trimmed and constrained to 1 through 40 characters', () => {
  assert.equal(BATTLE_SETUP_PRESET_STORAGE_KEY, 'vts_battle_sim_setups');
  assert.equal(MAX_BATTLE_SETUP_PRESETS, 20);
  assert.equal(normalizeBattleSetupPresetName('  My cavalry setup  '), 'My cavalry setup');
  assert.throws(() => normalizeBattleSetupPresetName('   '), RangeError);
  assert.throws(() => normalizeBattleSetupPresetName('x'.repeat(41)), RangeError);
  assert.throws(() => normalizeBattleSetupPresetName(1097), TypeError);
  for (const reserved of ['__proto__', 'prototype', 'constructor', ' Constructor ']) {
    assert.throws(() => normalizeBattleSetupPresetName(reserved), /reserved/i);
  }
});

test('preset store helpers validate snapshots and never mutate the source store', () => {
  const snapshot = snapshotFixture();
  snapshot.savedAt = '2026-07-16T00:00:00.000Z';
  const source = deepFreeze({ Existing: snapshot });
  const before = structuredClone(source);

  const updated = upsertBattleSetupPreset(source, '  New setup  ', snapshotFixture());
  assert.deepEqual(source, before);
  assert.deepEqual(Object.keys(updated), ['Existing', 'New setup']);
  assert.notStrictEqual(updated.Existing, source.Existing);
  assert.equal(updated['New setup'].setupSchemaVersion, SETUP_SCHEMA_VERSION);

  const parsed = parseBattleSetupPresetStore(JSON.stringify(updated));
  assert.deepEqual(parsed, updated);
  assert.deepEqual(parseBattleSetupPresetStore(null), {});
  assert.deepEqual(parseBattleSetupPresetStore(''), {});

  const deleted = deleteBattleSetupPreset(updated, ' Existing ');
  assert.deepEqual(Object.keys(deleted), ['New setup']);
  assert.deepEqual(Object.keys(updated), ['Existing', 'New setup']);
});

test('preset store preserves markup names as inert object keys', () => {
  const withMarkup = upsertBattleSetupPreset({}, '<img src=x onerror=alert(1)>', snapshotFixture());

  assert.equal(Object.hasOwn(withMarkup, '<img src=x onerror=alert(1)>'), true);
  assert.equal(Object.getPrototypeOf(withMarkup), Object.prototype);
  assert.deepEqual(parseBattleSetupPresetStore(JSON.stringify(withMarkup)), withMarkup);
});

test('preset store allows replacement at the limit but rejects a twenty-first name', () => {
  let store = {};
  for (let index = 1; index <= MAX_BATTLE_SETUP_PRESETS; index += 1) {
    store = upsertBattleSetupPreset(store, `Preset ${index}`, snapshotFixture());
  }
  assert.equal(Object.keys(store).length, MAX_BATTLE_SETUP_PRESETS);

  const replaced = upsertBattleSetupPreset(store, 'Preset 1', snapshotFixture());
  assert.equal(Object.keys(replaced).length, MAX_BATTLE_SETUP_PRESETS);
  assert.throws(
    () => upsertBattleSetupPreset(store, 'Preset 21', snapshotFixture()),
    /at most 20/i
  );
});

test('preset store rejects corrupted JSON, duplicate trimmed names, and invalid snapshots', () => {
  assert.throws(() => parseBattleSetupPresetStore('{bad'), {
    name: 'TypeError',
    message: /preset store JSON is invalid/i,
  });
  assert.throws(() => parseBattleSetupPresetStore('[]'), {
    name: 'TypeError',
    message: /must be a JSON object/i,
  });

  const duplicateNames = Object.fromEntries([
    ['Alpha', snapshotFixture()],
    [' Alpha ', snapshotFixture()],
  ]);
  assert.throws(() => parseBattleSetupPresetStore(JSON.stringify(duplicateNames)), {
    name: 'RangeError',
    message: /duplicate name "Alpha"/i,
  });

  const invalidSnapshot = snapshotFixture();
  invalidSnapshot.sides.A.rows[0].type = 'mages';
  assert.throws(
    () => parseBattleSetupPresetStore(JSON.stringify({ Broken: invalidSnapshot })),
    /Preset "Broken" is invalid.*unsupported troop type/is
  );
});
