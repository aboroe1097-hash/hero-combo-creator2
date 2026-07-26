import assert from 'node:assert/strict';
import test from 'node:test';

import { BATTLE_STAT_CONTRACT } from '../../js/battle-simulator-data.js';
import { resolveResearchSources } from '../../js/battle-simulator-research.js';
import { resolveSpecializationBattleSources } from '../../js/battle-simulator-specialization.js';
import { buildStatContributionSnapshot } from '../../js/specialization-towers-v2-contributions.js';
import { createEmptySpecializationState } from '../../js/specialization-towers-v2-model.js';
import {
  BATTLE_SETUP_PRESET_STORAGE_KEY,
  MAX_BATTLE_SETUP_PRESETS,
  deleteBattleSetupPreset,
  normalizeBattleSetupPresetName,
  parseBattleSetupPresetStore,
  upsertBattleSetupPreset,
} from '../../js/battle-simulator-preset-store.js';
import {
  CAPTURED_SOURCE_SNAPSHOT_SCHEMA_VERSION,
  LEGACY_SETUP_SCHEMA_VERSION,
  PREVIOUS_SETUP_SCHEMA_VERSION,
  SETUP_SCHEMA_VERSION,
  applySetupSnapshot,
  buildSetupSnapshot,
  createEmptyCapturedSourceSnapshot,
  parseSetupSnapshot,
  setupSnapshotToEngineConfig,
} from '../../js/battle-simulator-setup.js';

const ROW_IDS = ['front', 'middle', 'back'];
const TYPES = ['footmen', 'cavalry', 'archers'];

function battleStats(offset = 0) {
  return {
    might: 100 + offset,
    resistance: 80 + offset,
    hp: 30 + offset,
    tacticalMight: 20 + offset,
    tacticalResistance: 15 + offset,
    damage: 10 + offset,
    damageMitigation: 5 + offset,
    combatSpeed: 500 + offset,
  };
}

function unitValues(offset = 0) {
  return { attack: 70 + offset, defense: 50 + offset, hp: 20 + offset };
}

function editableFields(type, tier, offset = 0) {
  return {
    type,
    tier,
    troops: 31_000 + offset,
    unitValues: unitValues(offset),
    bonuses: battleStats(offset),
    finals: battleStats(offset + 10),
  };
}

function researchSource(overrides = {}) {
  return {
    sourceType: 'research',
    sourceId: 'research:tree-a:node-a:0',
    label: 'Footmen Might',
    statKey: 'might',
    amount: 25,
    operation: 'add',
    unit: 'percent',
    appliesTo: {
      battleModes: ['pvp-field'],
      troopTypes: ['footmen'],
      rowIds: ['front'],
    },
    verification: 'explicit',
    provenance: { techId: 'tree-a', nodeId: 'node-a', level: 5 },
    ...overrides,
  };
}

function capturedSourceSnapshot(source = researchSource()) {
  return {
    schemaVersion: CAPTURED_SOURCE_SNAPSHOT_SCHEMA_VERSION,
    catalogRevisions: { research: 'research-2026-07-17', equipment: 'equipment-v1-empty' },
    sources: [source],
    excludedSources: [
      {
        sourceType: 'research',
        sourceId: 'research:tree-b:node-b',
        label: 'Unmodeled Siege Might',
        reason: 'missing-value',
        verification: { status: 'excluded', reason: 'missing-value' },
        provenance: { progressKey: 'tree-b:node-b', savedLevel: 7 },
      },
    ],
    diagnostics: [
      {
        code: 'research-missing-value',
        severity: 'warning',
        message: 'One saved node has no verified quantitative value.',
        sourceId: 'research:tree-c:node-c',
      },
    ],
  };
}

function researchSnapshot(source = researchSource()) {
  return {
    schemaVersion: 1,
    catalogVersion: 'research-2026-07-17',
    battleMode: 'pvp-field',
    sources: [source],
    excludedSources: [],
    diagnostics: [],
    savedProgress: { exists: true, malformed: false, entryCount: 3 },
  };
}

function side(sideOffset, tier, mode, { researchEnabled = false } = {}) {
  return {
    mode,
    researchEnabled,
    researchSnapshot: researchSnapshot(),
    equipmentLoadout: undefined,
    capturedSourceSnapshot: capturedSourceSnapshot(),
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
      A: side(0, 9, 'add-bonuses', { researchEnabled: true }),
      B: side(1, 10, 'final-totals'),
    },
  };
}

function snapshotFixture() {
  return buildSetupSnapshot(stateFixture());
}

function legacySnapshotFixture() {
  const legacy = snapshotFixture();
  legacy.setupSchemaVersion = LEGACY_SETUP_SCHEMA_VERSION;
  for (const side of Object.values(legacy.sides)) {
    delete side.researchEnabled;
    delete side.researchSnapshot;
    delete side.equipmentLoadout;
    delete side.capturedSourceSnapshot;
    for (const fields of [side.sideDefaults, ...side.rows]) {
      fields.baseValues = {
        might: fields.unitValues.attack,
        resistance: fields.unitValues.defense,
        hp: fields.unitValues.hp,
      };
      delete fields.unitValues;
      delete fields.bonuses.damageMitigation;
      delete fields.finals.damageMitigation;
    }
  }
  return legacy;
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

test('v3 build, stringify, parse, and apply round-trip complete source-aware setup', () => {
  const state = deepFreeze(stateFixture());
  const before = structuredClone(state);
  const snapshot = buildSetupSnapshot(state);

  assert.equal(snapshot.setupSchemaVersion, 3);
  assert.deepEqual(snapshot.scenarioContext, {
    battleMode: 'pvp-field',
    engagement: 'field',
    event: '*',
    formation: '*',
  });
  assert.deepEqual(snapshot.assumptions, { acknowledged: false, diagnostics: [] });
  assert.equal(snapshot.savedAt, null);
  assert.equal(snapshot.sides.A.researchEnabled, true);
  assert.equal(snapshot.sides.B.researchEnabled, false);
  assert.deepEqual(Object.keys(snapshot.sides.A.rows[0].unitValues), ['attack', 'defense', 'hp']);
  assert.equal(snapshot.sides.A.rows[0].bonuses.damageMitigation, 5);
  assert.equal(snapshot.sides.A.equipmentLoadout.mode, 'none');
  assert.equal(snapshot.sides.A.capturedSourceSnapshot.sources.length, 1);
  assert.equal(snapshot.sides.A.researchSnapshot.sources.length, 1);
  assert.deepEqual(snapshot.sides.A.researchSnapshot.savedProgress, {
    exists: true,
    malformed: false,
    entryCount: 3,
  });
  assert.equal(snapshot.sides.A.capturedSourceSnapshot.excludedSources[0].reason, 'missing-value');

  snapshot.savedAt = '2026-07-17T00:00:00.000Z';
  const parsed = parseSetupSnapshot(JSON.stringify(snapshot));
  const current = deepFreeze({ ...stateFixture(), transientView: { selectedResult: 7 } });
  const applied = applySetupSnapshot(current, deepFreeze(parsed));

  assert.deepEqual(applied.transientView, { selectedResult: 7 });
  assert.deepEqual(applied.sides, parsed.sides);
  assert.notStrictEqual(applied.sides, parsed.sides);
  assert.notStrictEqual(applied.sides.A.rows[0].unitValues, parsed.sides.A.rows[0].unitValues);
  assert.notStrictEqual(
    applied.sides.A.capturedSourceSnapshot.sources[0],
    parsed.sides.A.capturedSourceSnapshot.sources[0]
  );
  assert.deepEqual(state, before);
});

test('v1 snapshots migrate to v3 unit points, safe empty integrations, and correct mode semantics', () => {
  const legacy = legacySnapshotFixture();
  const parsed = parseSetupSnapshot(JSON.stringify(legacy));

  assert.equal(parsed.setupSchemaVersion, SETUP_SCHEMA_VERSION);
  assert.deepEqual(parsed.sides.A.rows[0].unitValues, { attack: 70, defense: 50, hp: 20 });
  assert.equal(parsed.sides.A.rows[0].bonuses.damageMitigation, 0);
  assert.equal(parsed.sides.A.researchEnabled, false);
  assert.equal(parsed.sides.A.equipmentLoadout.mode, 'none');
  assert.deepEqual(parsed.sides.A.equipmentEffectOverrides.overrides, []);
  assert.equal(parsed.sides.A.rows[0].heroName, null);
  assert.deepEqual(parsed.sides.A.rows[0].skillIds, []);
  assert.deepEqual(parsed.sides.A.capturedSourceSnapshot.sources, []);
  assert.deepEqual(parsed.sides.A.researchSnapshot.sources, []);
  assert.deepEqual(parsed.sides.A.researchSnapshot.savedProgress, {
    exists: false,
    malformed: false,
    entryCount: 0,
  });

  const config = setupSnapshotToEngineConfig(parsed);
  assert.deepEqual(config.sideA.rows[0].stats.unit, { attack: 70, defense: 50, hp: 20 });
  assert.equal(config.sideA.rows[0].stats.battle.might, 200);
  assert.equal(config.sideA.rows[0].statBreakdown.effective.attack, 140);
  assert.equal(config.sideB.rows[0].stats.battle.might, 111);
  assert.equal(
    config.sideB.rows[0].statBreakdown.effective.attack,
    Number(((71 * 111) / 100).toFixed(6))
  );
});

test('parser canonicalizes unknown keys at every setup and stat layer', () => {
  const raw = snapshotFixture();
  raw.futureTopLevel = true;
  raw.sides.C = { future: true };
  raw.sides.A.futureSide = true;
  raw.sides.A.rows[0].futureRow = true;
  raw.sides.A.rows[0].unitValues.lethalDamage = 25;
  raw.sides.A.rows[0].bonuses.lethalDamage = 25;
  raw.sides.A.sideDefaults.finals.lethalDamage = 25;
  raw.sides.A.capturedSourceSnapshot.sources.push(
    researchSource({
      sourceId: 'future:lethal-damage',
      statKey: 'lethalDamage',
      label: 'Future lethal damage',
    })
  );

  const parsed = parseSetupSnapshot(JSON.stringify(raw));
  assert.deepEqual(Object.keys(parsed), [
    'setupSchemaVersion',
    'savedAt',
    'battleMode',
    'scenarioContext',
    'assumptions',
    'sides',
    'runOptions',
  ]);
  assert.deepEqual(Object.keys(parsed.sides), ['A', 'B']);
  assert.equal(Object.hasOwn(parsed.sides.A, 'futureSide'), false);
  assert.equal(Object.hasOwn(parsed.sides.A.rows[0], 'futureRow'), false);
  assert.equal(Object.hasOwn(parsed.sides.A.rows[0].unitValues, 'lethalDamage'), false);
  assert.equal(Object.hasOwn(parsed.sides.A.rows[0].bonuses, 'lethalDamage'), false);
  assert.equal(Object.hasOwn(parsed.sides.A.sideDefaults.finals, 'lethalDamage'), false);
  assert.equal(
    parsed.sides.A.capturedSourceSnapshot.sources.some(({ statKey }) => statKey === 'lethalDamage'),
    false
  );
});

test('captured sources are bounded, deterministic, detached, and reject sensitive provenance', () => {
  const raw = snapshotFixture();
  raw.sides.A.capturedSourceSnapshot.sources = [
    researchSource({ sourceId: 'research:z', amount: 10 }),
    researchSource({ sourceId: 'research:a', amount: 20 }),
  ];
  const parsed = parseSetupSnapshot(JSON.stringify(raw));
  assert.deepEqual(
    parsed.sides.A.capturedSourceSnapshot.sources.map(({ sourceId }) => sourceId),
    ['research:a', 'research:z']
  );
  assert.deepEqual(parsed.sides.A.capturedSourceSnapshot.catalogRevisions, {
    research: 'research-2026-07-17',
    equipment: 'equipment-v1-empty',
  });

  const sensitive = snapshotFixture();
  sensitive.sides.A.capturedSourceSnapshot.sources[0].provenance.localStorage = {
    vts_sensitive_admin_pin_ok: '1',
  };
  assert.throws(() => parseSetupSnapshot(JSON.stringify(sensitive)), /sensitive field/i);

  const duplicate = snapshotFixture();
  duplicate.sides.A.capturedSourceSnapshot.sources.push(
    structuredClone(duplicate.sides.A.capturedSourceSnapshot.sources[0])
  );
  assert.throws(() => parseSetupSnapshot(JSON.stringify(duplicate)), /duplicate source/i);

  const oversized = snapshotFixture();
  oversized.sides.A.capturedSourceSnapshot.diagnostics = Array.from(
    { length: 1_025 },
    (_, index) => ({ code: `d-${index}`, severity: 'info', message: 'bounded', sourceId: null })
  );
  assert.throws(() => parseSetupSnapshot(JSON.stringify(oversized)), /at most 1024/i);
});

test('live Research snapshots preserve saved-progress status and generic excluded diagnostics', () => {
  const state = stateFixture();
  const resolved = resolveResearchSources({
    progress: { 'future-tree:future-node': 11 },
    battleMode: 'pvp-field',
  });
  state.sides.A.researchSnapshot = resolved;
  state.sides.A.capturedSourceSnapshot = {
    schemaVersion: CAPTURED_SOURCE_SNAPSHOT_SCHEMA_VERSION,
    catalogRevisions: { research: resolved.catalogVersion, equipment: null },
    sources: resolved.sources,
    excludedSources: resolved.excludedSources,
    diagnostics: resolved.diagnostics,
  };

  const snapshot = buildSetupSnapshot(state);
  assert.deepEqual(snapshot.sides.A.researchSnapshot.savedProgress, {
    exists: true,
    malformed: false,
    entryCount: 1,
  });
  assert.deepEqual(
    snapshot.sides.A.researchSnapshot.excludedSources.map(({ reason }) => reason),
    ['unknown-saved-key']
  );
  assert.equal(
    snapshot.sides.A.capturedSourceSnapshot.excludedSources[0].provenance.savedLevel,
    11
  );
  assert.match(snapshot.sides.A.capturedSourceSnapshot.diagnostics[0].sourceId, /^research:/);
});

test('setup-to-engine config supplies nested stats, captured sources, and detached provenance', () => {
  const snapshot = deepFreeze(snapshotFixture());
  const before = structuredClone(snapshot);
  const config = setupSnapshotToEngineConfig(snapshot);
  const front = config.sideA.rows[0];
  const middle = config.sideA.rows[1];

  assert.equal(config.battleMode, 'pvp-field');
  assert.deepEqual(config.statContract, BATTLE_STAT_CONTRACT);
  assert.deepEqual(front.stats.unit, { attack: 70, defense: 50, hp: 20 });
  assert.equal(front.stats.battle.might, 225, '100 baseline + 100 manual + 25 Research');
  assert.equal(front.statBreakdown.effective.attack, 157.5);
  assert.equal(front.statBreakdown.battle.includedSources.length, 9);
  assert.equal(middle.stats.battle.might, 201, 'row-filtered Research does not apply');
  assert.ok(
    middle.statBreakdown.battle.excludedSources.some(
      ({ sourceId, exclusionReason }) =>
        sourceId === 'research:tree-a:node-a:0' && exclusionReason === 'troop-type'
    )
  );
  assert.deepEqual(snapshot, before);
  assert.notStrictEqual(config.sideA.equipmentLoadout, snapshot.sides.A.equipmentLoadout);
  assert.notStrictEqual(front.stats, snapshot.sides.A.rows[0].bonuses);
});

test('v3 persists scenario, heroes, specialization captures, and equipment override documents', () => {
  const snapshot = snapshotFixture();
  snapshot.scenarioContext = {
    battleMode: 'pvp-field',
    engagement: 'siege-attack',
    event: 'eden',
    formation: 'rally-lead',
  };
  snapshot.assumptions = {
    acknowledged: true,
    diagnostics: [
      {
        code: 'coverage-partial',
        severity: 'warning',
        message: 'Partial clauses ignored.',
        sourceId: null,
      },
    ],
  };
  snapshot.sides.A.rows[0].heroName = "Jeanne d'Arc";
  snapshot.sides.A.rows[0].skillIds = ['2', '8'];
  snapshot.sides.A.equipmentEffectOverrides = {
    overrideSchemaVersion: 1,
    overrides: [],
  };
  snapshot.sides.A.specializationCapture = {
    snapshot: { schema: 'fixture', entries: [] },
    result: {
      sources: [],
      unitSources: [
        {
          sourceType: 'specialization',
          sourceId: 'specialization:unit-attack',
          label: 'Unit Attack',
          statKey: 'attack',
          amount: 10,
          operation: 'add',
          unit: 'percent',
          appliesTo: { battleModes: ['pvp-field'], troopTypes: ['footmen'], rowIds: ['front'] },
        },
      ],
      effects: [{ id: 'fixture-effect', active: true }],
      excluded: [],
      diagnostics: [],
      summary: {},
      revision: 'fixture',
    },
  };

  const parsed = parseSetupSnapshot(JSON.stringify(snapshot));
  const config = setupSnapshotToEngineConfig(parsed);
  assert.equal(parsed.setupSchemaVersion, 3);
  assert.equal(parsed.sides.A.rows[0].heroName, "Jeanne d'Arc");
  assert.deepEqual(parsed.sides.A.rows[0].skillIds, ['2', '8']);
  assert.equal(parsed.assumptions.acknowledged, true);
  assert.equal(config.sideA.scenarioContext.engagement, 'siege-attack');
  assert.equal(config.sideA.unitSources.length, 1);
  assert.equal(config.sideA.effects[0].id, 'fixture-effect');
  assert.equal(config.sideA.rows[0].stats.unit.attack, 77);
});

test('canonical specialization captures retain bounded depth and sensitive-key guards', () => {
  const state = createEmptySpecializationState();
  const snapshot = snapshotFixture();
  snapshot.sides.A.specializationCapture = {
    snapshot: buildStatContributionSnapshot(state),
    result: resolveSpecializationBattleSources(state),
  };
  assert.doesNotThrow(() => parseSetupSnapshot(JSON.stringify(snapshot)));

  const sensitive = structuredClone(snapshot);
  sensitive.sides.A.specializationCapture.snapshot.producer.localStorage = {
    secret: 'not allowed',
  };
  assert.throws(() => parseSetupSnapshot(JSON.stringify(sensitive)), /sensitive field/i);

  const tooDeep = structuredClone(snapshot);
  let cursor = tooDeep.sides.A.specializationCapture.snapshot;
  for (let index = 0; index < 11; index += 1) {
    cursor.nested = {};
    cursor = cursor.nested;
  }
  assert.throws(
    () => parseSetupSnapshot(JSON.stringify(tooDeep)),
    /must not exceed 10 nested levels/i
  );
});

test('scenario context defaults for legacy snapshots and rejects unsupported values', () => {
  const legacy = legacySnapshotFixture();
  delete legacy.battleMode;
  delete legacy.scenarioContext;
  assert.equal(parseSetupSnapshot(JSON.stringify(legacy)).battleMode, 'pvp-field');

  const previous = snapshotFixture();
  previous.setupSchemaVersion = PREVIOUS_SETUP_SCHEMA_VERSION;
  delete previous.scenarioContext;
  delete previous.assumptions;
  assert.equal(parseSetupSnapshot(JSON.stringify(previous)).setupSchemaVersion, 3);

  const invalid = snapshotFixture();
  invalid.scenarioContext.engagement = 'space';
  assert.throws(() => parseSetupSnapshot(JSON.stringify(invalid)), /Scenario engagement/i);
});

test('parser rejects unsupported versions, malformed formations, values, and source contracts', () => {
  assert.throws(() => parseSetupSnapshot('{bad json'), /json is invalid/i);
  assert.throws(() => parseSetupSnapshot({}), /provided as text/i);

  const wrongVersion = snapshotFixture();
  wrongVersion.setupSchemaVersion = 4;
  assert.throws(() => parseSetupSnapshot(JSON.stringify(wrongVersion)), /unsupported.*schema/i);

  const missingSide = snapshotFixture();
  delete missingSide.sides.B;
  assert.throws(
    () => parseSetupSnapshot(JSON.stringify(missingSide)),
    /missing required field "B"/i
  );

  const shortRows = snapshotFixture();
  shortRows.sides.A.rows.pop();
  assert.throws(() => parseSetupSnapshot(JSON.stringify(shortRows)), /exactly three rows/i);

  const misordered = snapshotFixture();
  [misordered.sides.A.rows[0], misordered.sides.A.rows[1]] = [
    misordered.sides.A.rows[1],
    misordered.sides.A.rows[0],
  ];
  assert.throws(() => parseSetupSnapshot(JSON.stringify(misordered)), /row id "front"/i);

  const badType = snapshotFixture();
  badType.sides.A.rows[0].type = 'mages';
  assert.throws(() => parseSetupSnapshot(JSON.stringify(badType)), /unsupported troop type/i);

  const missingUnit = snapshotFixture();
  delete missingUnit.sides.A.rows[0].unitValues.attack;
  assert.throws(() => parseSetupSnapshot(JSON.stringify(missingUnit)), /attack.*finite number/i);

  const missingBattleStat = snapshotFixture();
  delete missingBattleStat.sides.A.rows[0].finals.hp;
  assert.throws(
    () => parseSetupSnapshot(JSON.stringify(missingBattleStat)),
    /missing required field "hp"/i
  );

  const badResearchFlag = snapshotFixture();
  badResearchFlag.sides.A.researchEnabled = 'true';
  assert.throws(() => parseSetupSnapshot(JSON.stringify(badResearchFlag)), /must be a boolean/i);

  const badSavedProgress = snapshotFixture();
  badSavedProgress.sides.A.researchSnapshot.savedProgress.entryCount = 2_001;
  assert.throws(() => parseSetupSnapshot(JSON.stringify(badSavedProgress)), /entryCount.*between/i);

  const badSourceUnit = snapshotFixture();
  badSourceUnit.sides.A.capturedSourceSnapshot.sources[0].unit = 'points';
  assert.throws(
    () => parseSetupSnapshot(JSON.stringify(badSourceUnit)),
    /must use unit "percent"/i
  );

  const badEquipment = snapshotFixture();
  badEquipment.sides.A.equipmentLoadout.loadoutSchemaVersion = 99;
  assert.throws(
    () => parseSetupSnapshot(JSON.stringify(badEquipment)),
    /equipment loadout schema/i
  );

  const invalidRun = snapshotFixture();
  invalidRun.runOptions.iterations = 7;
  assert.throws(() => parseSetupSnapshot(JSON.stringify(invalidRun)), /iterations must be one of/i);
});

test('preset helpers canonicalize mixed v1/v2 stores without mutation', () => {
  assert.equal(BATTLE_SETUP_PRESET_STORAGE_KEY, 'vts_battle_sim_setups');
  assert.equal(MAX_BATTLE_SETUP_PRESETS, 20);
  assert.equal(normalizeBattleSetupPresetName('  My setup  '), 'My setup');
  assert.throws(() => normalizeBattleSetupPresetName('__proto__'), /reserved/i);
  assert.throws(() => normalizeBattleSetupPresetName('x'.repeat(41)), /1 and 40/i);

  const v2 = snapshotFixture();
  const v1 = legacySnapshotFixture();
  const parsed = parseBattleSetupPresetStore(JSON.stringify({ Legacy: v1, Current: v2 }));
  assert.equal(parsed.Legacy.setupSchemaVersion, SETUP_SCHEMA_VERSION);
  assert.equal(parsed.Current.setupSchemaVersion, SETUP_SCHEMA_VERSION);
  assert.deepEqual(parsed.Legacy.sides.A.rows[0].unitValues, {
    attack: 70,
    defense: 50,
    hp: 20,
  });

  const source = deepFreeze({ Existing: v2 });
  const before = structuredClone(source);
  const updated = upsertBattleSetupPreset(source, 'New', v1);
  assert.deepEqual(source, before);
  assert.equal(updated.New.setupSchemaVersion, SETUP_SCHEMA_VERSION);
  assert.notStrictEqual(updated.Existing, source.Existing);
  assert.deepEqual(Object.keys(deleteBattleSetupPreset(updated, ' Existing ')), ['New']);
  assert.deepEqual(parseBattleSetupPresetStore(null), {});
});

test('preset store retains inert names, enforces its limit, and rejects corruption', () => {
  const markup = '<img src=x onerror=alert(1)>';
  const stored = upsertBattleSetupPreset({}, markup, snapshotFixture());
  assert.equal(Object.hasOwn(stored, markup), true);
  assert.deepEqual(parseBattleSetupPresetStore(JSON.stringify(stored)), stored);

  let full = {};
  for (let index = 1; index <= MAX_BATTLE_SETUP_PRESETS; index += 1) {
    full = upsertBattleSetupPreset(full, `Preset ${index}`, snapshotFixture());
  }
  assert.equal(
    Object.keys(upsertBattleSetupPreset(full, 'Preset 1', snapshotFixture())).length,
    20
  );
  assert.throws(() => upsertBattleSetupPreset(full, 'Preset 21', snapshotFixture()), /at most 20/i);
  assert.throws(() => parseBattleSetupPresetStore('{bad'), /JSON is invalid/i);
  assert.throws(() => parseBattleSetupPresetStore('[]'), /JSON object/i);
  assert.throws(
    () =>
      parseBattleSetupPresetStore(
        JSON.stringify({ Alpha: snapshotFixture(), ' Alpha ': snapshotFixture() })
      ),
    /duplicate name/i
  );
});

test('empty captured source snapshots are fresh canonical values', () => {
  const first = createEmptyCapturedSourceSnapshot();
  const second = createEmptyCapturedSourceSnapshot();
  assert.deepEqual(first, second);
  assert.notStrictEqual(first, second);
  assert.notStrictEqual(first.sources, second.sources);
});
