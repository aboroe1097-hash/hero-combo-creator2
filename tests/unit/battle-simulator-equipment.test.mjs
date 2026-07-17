import assert from 'node:assert/strict';
import test from 'node:test';

import {
  EQUIPMENT_CATALOG,
  EQUIPMENT_CATALOG_REVISION,
  EQUIPMENT_LEGACY_SLOT_ALIASES,
  EQUIPMENT_SLOT_IDS,
} from '../../js/battle-simulator-equipment-catalog.js';
import {
  EQUIPMENT_COMPLETENESS,
  cloneEquipmentLoadout,
  createDefaultEquipmentLoadout,
  createEquipmentSetLoadout,
  equipmentScopeMatches,
  filterEquipmentContributions,
  normalizeEquipmentLoadout,
  parseEquipmentLoadout,
  resolveEquipmentLoadout,
  validateEquipmentCatalog,
} from '../../js/battle-simulator-equipment.js';
import { normalizeStatSources } from '../../js/battle-simulator-stat-sources.js';

const TEST_SOURCE_ID = 'test.capture';
const TEST_RULE_ID = 'test.full-set-skill';

function effect(id, label, statKey, amount, troopTypes = ['archers']) {
  return {
    id,
    label,
    statKey,
    amount,
    operation: 'add',
    unit: statKey === 'combatSpeed' ? 'raw' : 'percent',
    appliesTo: { battleModes: ['pvp-field'], troopTypes, rowIds: [] },
    verification: 'verified',
    sourceRefs: [TEST_SOURCE_ID],
  };
}

function verifiedFixtureCatalog() {
  const catalog = structuredClone(EQUIPMENT_CATALOG);
  catalog.catalogRevision = 'test-equipment.1';
  catalog.dataStatus = 'partial';
  catalog.sources.push({
    id: TEST_SOURCE_ID,
    kind: 'test-fixture',
    description: 'Synthetic verified values used only by equipment unit tests.',
  });

  const set = catalog.sets.find((entry) => entry.id === 'normal.ranger');
  set.dataStatus = 'verified';
  for (const pieceId of set.pieceIds) {
    const piece = catalog.pieces.find((entry) => entry.id === pieceId);
    const gold = piece.variants.find((entry) => entry.gradeId === 'gold');
    piece.dataStatus = 'verified';
    gold.dataStatus = 'verified';
    gold.baseEffects = [];
    gold.enhancementLevels = [
      {
        level: 15,
        dataStatus: 'verified',
        effects: [],
        sourceRefs: [TEST_SOURCE_ID],
      },
    ];
    gold.advancementStages = [
      {
        id: 'advanced',
        dataStatus: 'verified',
        effects: [],
        sourceRefs: [TEST_SOURCE_ID],
      },
    ];
  }

  const armor = catalog.pieces.find((entry) => entry.id === 'normal.ranger.armor');
  const goldArmor = armor.variants.find((entry) => entry.gradeId === 'gold');
  goldArmor.baseEffects = [effect('test.armor.might', 'Ranger armor Might', 'might', 25)];
  goldArmor.enhancementLevels[0].effects = [
    effect('test.armor.plus15.hp', 'Ranger armor +15 HP', 'hp', 5),
  ];
  goldArmor.advancementStages[0].effects = [
    effect('test.armor.advanced.damage', 'Ranger armor advanced Damage', 'damage', 3),
  ];

  catalog.specialSkills = [
    {
      id: 'test.full-set-skill',
      label: 'Test full-set skill',
      ruleId: TEST_RULE_ID,
      parameters: { trigger: 'battle-start', stacks: 1 },
      appliesTo: { battleModes: ['pvp-field'], troopTypes: [], rowIds: [] },
      verification: 'verified',
      sourceRefs: [TEST_SOURCE_ID],
    },
  ];
  catalog.setBonuses = [
    {
      id: 'test.ranger.full-plus15',
      setId: 'normal.ranger',
      label: 'Test Ranger full +15 set',
      dataStatus: 'verified',
      requirements: {
        requiredSlots: 'all',
        allowedGradeIds: ['gold'],
        minimumEnhancementLevel: 15,
        requiredAdvancementStageId: null,
      },
      effects: [
        effect('test.ranger.set.resistance', 'Ranger set Resistance', 'resistance', 40, []),
      ],
      specialSkillIds: ['test.full-set-skill'],
      sourceRefs: [TEST_SOURCE_ID],
    },
  ];
  return catalog;
}

test('catalog exposes four verified identities and six canonical game slots', () => {
  const catalog = validateEquipmentCatalog(EQUIPMENT_CATALOG);
  assert.equal(catalog.catalogRevision, EQUIPMENT_CATALOG_REVISION);
  assert.deepEqual(catalog.slots, EQUIPMENT_SLOT_IDS);
  assert.deepEqual(
    catalog.sets.map((set) => set.id),
    ['normal.ranger', 'normal.dreadnaught', 'normal.steel-cavalry', 'dragon-master']
  );
  assert.equal(catalog.pieces.length, 24);
  assert.equal(EQUIPMENT_LEGACY_SLOT_ALIASES.dagger, 'accessory');
  assert.equal(EQUIPMENT_LEGACY_SLOT_ALIASES.ring, 'amulet');
  assert.equal(EQUIPMENT_LEGACY_SLOT_ALIASES.sword, 'weapon');
});

test('default None loadout resolves without sources or warnings', () => {
  const loadout = createDefaultEquipmentLoadout();
  const resolved = resolveEquipmentLoadout(loadout);
  assert.equal(loadout.mode, 'none');
  assert.equal(resolved.completeness, EQUIPMENT_COMPLETENESS.NONE);
  assert.deepEqual(resolved.contributions, []);
  assert.deepEqual(resolved.activeSkills, []);
  assert.deepEqual(resolved.missingData, []);
  assert.deepEqual(resolved.warnings, []);
});

test('identity-only equipment is selectable but does not turn unknown values into zero sources', () => {
  const loadout = createEquipmentSetLoadout({ setId: 'normal.steel-cavalry', gradeId: 'gold' });
  const roundTrip = parseEquipmentLoadout(JSON.stringify(loadout));
  const resolved = resolveEquipmentLoadout(roundTrip);
  assert.equal(roundTrip.pieces.length, 6);
  assert.equal(resolved.completeness, EQUIPMENT_COMPLETENESS.IDENTITY_ONLY);
  assert.equal(resolved.contributions.length, 0);
  assert.equal(resolved.activeSkills.length, 0);
  assert.equal(
    resolved.missingData.filter((entry) => entry.code === 'variant-identity-only').length,
    6
  );
  assert.match(resolved.warnings[0], /battle values are not captured yet/i);
});

test('bounded unknown future identities round-trip and resolve inactive', () => {
  const raw = {
    loadoutSchemaVersion: 1,
    catalogRevisionAtSave: 'future.9',
    mode: 'normal',
    setId: 'normal.future-set',
    pieces: [
      {
        slotId: 'relic-slot',
        pieceId: 'normal.future-set.relic',
        gradeId: 'mythic',
        enhancementLevel: 77,
        advancementStageId: 'awakened',
      },
    ],
  };
  const normalized = normalizeEquipmentLoadout(raw);
  const roundTrip = parseEquipmentLoadout(JSON.stringify(normalized));
  assert.deepEqual(roundTrip, normalized);
  assert.equal(roundTrip.setId, 'normal.future-set');
  assert.equal(roundTrip.pieces[0].slotId, 'relic-slot');
  assert.equal(roundTrip.pieces[0].gradeId, 'mythic');
  const resolved = resolveEquipmentLoadout(roundTrip);
  assert.equal(resolved.completeness, EQUIPMENT_COMPLETENESS.UNRESOLVED);
  assert.deepEqual(resolved.contributions, []);
  assert.ok(resolved.missingData.some((entry) => entry.code === 'unknown-set'));
  assert.ok(resolved.missingData.some((entry) => entry.code === 'unknown-slot'));
});

test('legacy planner slots migrate to canonical game slots', () => {
  const loadout = normalizeEquipmentLoadout({
    mode: 'normal',
    setId: 'normal.ranger',
    pieces: [
      {
        slotId: 'dagger',
        pieceId: 'normal.ranger.accessory',
        gradeId: 'gold',
        enhancementLevel: 0,
      },
      {
        slotId: 'ring',
        pieceId: 'normal.ranger.amulet',
        gradeId: 'gold',
        enhancementLevel: 0,
      },
      {
        slotId: 'sword',
        pieceId: 'normal.ranger.weapon',
        gradeId: 'gold',
        enhancementLevel: 0,
      },
    ],
  });
  assert.deepEqual(
    loadout.pieces.map((piece) => piece.slotId),
    ['accessory', 'amulet', 'weapon']
  );
});

test('verified fixture effects use the common normalized source contract and safe scopes', () => {
  const catalog = verifiedFixtureCatalog();
  const loadout = createEquipmentSetLoadout({
    setId: 'normal.ranger',
    gradeId: 'gold',
    enhancementLevel: 15,
    catalog,
  });
  const resolved = resolveEquipmentLoadout(loadout, {
    catalog,
    allowedSpecialRuleIds: [TEST_RULE_ID],
  });
  assert.equal(resolved.completeness, EQUIPMENT_COMPLETENESS.COMPLETE);
  assert.deepEqual(normalizeStatSources(resolved.contributions), resolved.contributions);
  const armorSource = resolved.contributions.find((source) => source.statKey === 'might');
  assert.deepEqual(Object.keys(armorSource), [
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
  assert.equal(armorSource.unit, 'percent');
  assert.equal(armorSource.amount, 25);
  assert.equal(
    equipmentScopeMatches(armorSource.appliesTo, { battleMode: 'pvp-field', troopType: 'archers' }),
    true
  );
  assert.equal(
    equipmentScopeMatches(armorSource.appliesTo, { battleMode: 'pvp-field', troopType: 'footmen' }),
    false
  );
  assert.equal(equipmentScopeMatches(armorSource.appliesTo, {}), false);
  assert.equal(
    filterEquipmentContributions(resolved.contributions, {
      battleMode: 'pvp-field',
      troopType: 'footmen',
    }).some((source) => source.statKey === 'might'),
    false
  );
});

test('full exact +15 set activates its bonus and allowlisted skill exactly once', () => {
  const catalog = verifiedFixtureCatalog();
  const loadout = createEquipmentSetLoadout({
    setId: 'normal.ranger',
    gradeId: 'gold',
    enhancementLevel: 15,
    catalog,
  });
  const resolved = resolveEquipmentLoadout(loadout, {
    catalog,
    allowedSpecialRuleIds: [TEST_RULE_ID],
  });
  assert.equal(
    resolved.contributions.filter((source) => source.statKey === 'resistance').length,
    1
  );
  assert.equal(resolved.activeSkills.length, 1);
  assert.equal(resolved.activeSkills[0].ruleId, TEST_RULE_ID);
});

test('partial or mixed sets cannot activate a full-set bonus', () => {
  const catalog = verifiedFixtureCatalog();
  const loadout = createEquipmentSetLoadout({
    setId: 'normal.ranger',
    gradeId: 'gold',
    enhancementLevel: 15,
    catalog,
  });
  loadout.pieces[0].pieceId = 'normal.steel-cavalry.armor';
  const resolved = resolveEquipmentLoadout(loadout, {
    catalog,
    allowedSpecialRuleIds: [TEST_RULE_ID],
  });
  assert.equal(resolved.activeSkills.length, 0);
  assert.equal(
    resolved.contributions.some((source) => source.statKey === 'resistance'),
    false
  );
  assert.equal(resolved.completeness, EQUIPMENT_COMPLETENESS.PARTIAL);
  assert.ok(resolved.missingData.some((entry) => entry.code === 'piece-set-mismatch'));
});

test('enhancement resolution requires an exact level and never interpolates', () => {
  const catalog = verifiedFixtureCatalog();
  const loadout = createEquipmentSetLoadout({
    setId: 'normal.ranger',
    gradeId: 'gold',
    enhancementLevel: 14,
    catalog,
  });
  const resolved = resolveEquipmentLoadout(loadout, {
    catalog,
    allowedSpecialRuleIds: [TEST_RULE_ID],
  });
  assert.equal(
    resolved.contributions.some((source) => source.statKey === 'hp'),
    false
  );
  assert.equal(resolved.activeSkills.length, 0);
  assert.equal(
    resolved.missingData.filter((entry) => entry.code === 'enhancement-level-unknown').length,
    6
  );
  assert.match(resolved.warnings.join(' '), /no value was interpolated/i);
});

test('catalog enhancement tables reject level zero because base effects own unenhanced data', () => {
  const catalog = verifiedFixtureCatalog();
  const armor = catalog.pieces.find((entry) => entry.id === 'normal.ranger.armor');
  armor.variants.find((entry) => entry.gradeId === 'gold').enhancementLevels[0].level = 0;

  assert.throws(() => validateEquipmentCatalog(catalog), /level must be between 1 and 100/i);
});

test('advancement stages resolve only by exact ID', () => {
  const catalog = verifiedFixtureCatalog();
  const loadout = createEquipmentSetLoadout({
    setId: 'normal.ranger',
    gradeId: 'gold',
    enhancementLevel: 15,
    catalog,
  });
  loadout.pieces.find((piece) => piece.slotId === 'armor').advancementStageId = 'advanced';
  const resolved = resolveEquipmentLoadout(loadout, {
    catalog,
    allowedSpecialRuleIds: [TEST_RULE_ID],
  });
  assert.equal(
    resolved.contributions.some((source) => source.statKey === 'damage'),
    true
  );

  loadout.pieces.find((piece) => piece.slotId === 'armor').advancementStageId = 'future-stage';
  const unresolved = resolveEquipmentLoadout(loadout, {
    catalog,
    allowedSpecialRuleIds: [TEST_RULE_ID],
  });
  assert.equal(
    unresolved.contributions.some((source) => source.statKey === 'damage'),
    false
  );
  assert.ok(unresolved.missingData.some((entry) => entry.code === 'advancement-stage-unknown'));
});

test('special skills remain inactive until their engine rule is allowlisted', () => {
  const catalog = verifiedFixtureCatalog();
  const loadout = createEquipmentSetLoadout({
    setId: 'normal.ranger',
    gradeId: 'gold',
    enhancementLevel: 15,
    catalog,
  });
  const denied = resolveEquipmentLoadout(loadout, { catalog });
  assert.equal(denied.activeSkills.length, 0);
  assert.ok(denied.missingData.some((entry) => entry.code === 'special-rule-unavailable'));

  const allowed = resolveEquipmentLoadout(loadout, {
    catalog,
    allowedSpecialRuleIds: [TEST_RULE_ID],
  });
  assert.equal(allowed.activeSkills.length, 1);
});

test('loadout cloning is deep and resolution order is deterministic', () => {
  const catalog = verifiedFixtureCatalog();
  const original = createEquipmentSetLoadout({
    setId: 'normal.ranger',
    gradeId: 'gold',
    enhancementLevel: 15,
    catalog,
  });
  const cloned = cloneEquipmentLoadout(original, { catalog });
  cloned.pieces[0].enhancementLevel = 4;
  assert.equal(original.pieces[0].enhancementLevel, 15);

  const reversed = cloneEquipmentLoadout(original, { catalog });
  reversed.pieces.reverse();
  const first = resolveEquipmentLoadout(original, {
    catalog,
    allowedSpecialRuleIds: [TEST_RULE_ID],
  });
  const second = resolveEquipmentLoadout(reversed, {
    catalog,
    allowedSpecialRuleIds: [TEST_RULE_ID],
  });
  assert.deepEqual(second.contributions, first.contributions);
  assert.deepEqual(second.activeSkills, first.activeSkills);
  assert.deepEqual(second.missingData, first.missingData);
});
