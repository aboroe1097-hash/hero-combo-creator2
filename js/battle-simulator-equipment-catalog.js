export const EQUIPMENT_CATALOG_SCHEMA_VERSION = 1;
export const EQUIPMENT_CATALOG_REVISION = '2026-07-17.1';

export const EQUIPMENT_SLOT_IDS = Object.freeze([
  'armor',
  'accessory',
  'amulet',
  'weapon',
  'helmet',
  'boots',
]);

export const EQUIPMENT_LEGACY_SLOT_ALIASES = Object.freeze({
  armor: 'armor',
  dagger: 'accessory',
  accessory: 'accessory',
  ring: 'amulet',
  amulet: 'amulet',
  sword: 'weapon',
  weapon: 'weapon',
  helmet: 'helmet',
  boots: 'boots',
});

export const EQUIPMENT_FAMILY_IDS = Object.freeze(['normal', 'dragon-master']);
export const EQUIPMENT_GRADE_IDS = Object.freeze(['blue', 'purple', 'orange', 'gold']);
export const EQUIPMENT_DATA_STATUSES = Object.freeze(['identity-only', 'partial', 'verified']);

const IDENTITY_SOURCE_REFS = Object.freeze(['repo.dm-equipment-assets', 'repo.dm-equipment-names']);

const SET_DEFINITIONS = Object.freeze([
  Object.freeze({
    id: 'normal.ranger',
    family: 'normal',
    name: 'Ranger',
    nameKey: 'equipment.set.normal.ranger',
    troopAffinity: 'archers',
    assetSetId: 'ranger',
    grades: Object.freeze(['blue', 'purple', 'gold']),
    pieceNames: Object.freeze({
      armor: "Ranger's Suit",
      accessory: "Ranger's Heart",
      amulet: "Ranger's Soul",
      weapon: "Ranger's Long Bow",
      helmet: "Ranger's Headband",
      boots: "Ranger's Boots",
    }),
  }),
  Object.freeze({
    id: 'normal.dreadnaught',
    family: 'normal',
    name: 'Dreadnaught',
    nameKey: 'equipment.set.normal.dreadnaught',
    troopAffinity: 'footmen',
    assetSetId: 'dreadnaught',
    grades: Object.freeze(['blue', 'purple', 'gold']),
    pieceNames: Object.freeze({
      armor: "Dreadnaught's Ebony Plate",
      accessory: "Dreadnaught's Bulwark",
      amulet: "Dreadnaught's Calling",
      weapon: "Dreadnaught's Sabre",
      helmet: "Dreadnaught's Crown",
      boots: "Dreadnaught's Treads",
    }),
  }),
  Object.freeze({
    id: 'normal.steel-cavalry',
    family: 'normal',
    name: 'Steel Cavalry',
    nameKey: 'equipment.set.normal.steel-cavalry',
    troopAffinity: 'cavalry',
    assetSetId: 'steel-cavalry',
    grades: Object.freeze(['blue', 'purple', 'gold']),
    pieceNames: Object.freeze({
      armor: 'Steel Cavalry Golden Plate',
      accessory: 'Steel Cavalry Cowl',
      amulet: 'Steel Cavalry Jade Belt',
      weapon: 'Steel Cavalry Ranseur',
      helmet: 'Steel Cavalry Feathered Helm',
      boots: 'Steel Cavalry Greaves',
    }),
  }),
  Object.freeze({
    id: 'dragon-master',
    family: 'dragon-master',
    name: 'Dragon Master',
    nameKey: 'equipment.set.dragon-master',
    troopAffinity: 'all',
    assetSetId: 'dragon-master',
    grades: Object.freeze(['blue', 'purple', 'orange', 'gold']),
    pieceNames: Object.freeze({
      armor: "Dragon Master's Breastplate",
      accessory: "Dragon Master's Stiletto",
      amulet: "Dragon Master's Golden Belt",
      weapon: "Dragon Master's Blade",
      helmet: "Dragon Master's Crown",
      boots: "Dragon Master's Sabatons",
    }),
  }),
]);

function createPieceId(setId, slotId) {
  return `${setId}.${slotId}`;
}

function createPieceNameKey(setId, slotId) {
  return `equipment.piece.${setId}.${slotId}`;
}

function createVariants(setDefinition, slotId) {
  return setDefinition.grades.map((gradeId) =>
    Object.freeze({
      gradeId,
      assetPath: `assets/dm/equipment/${setDefinition.assetSetId}/${gradeId}/${slotId}.${gradeId === 'orange' ? 'jpg' : 'png'}`,
      dataStatus: 'identity-only',
      baseEffects: Object.freeze([]),
      enhancementLevels: Object.freeze([]),
      advancementStages: Object.freeze([]),
      sourceRefs: IDENTITY_SOURCE_REFS,
    })
  );
}

function createPieces(setDefinition) {
  return EQUIPMENT_SLOT_IDS.map((slotId) =>
    Object.freeze({
      id: createPieceId(setDefinition.id, slotId),
      setId: setDefinition.id,
      family: setDefinition.family,
      slotId,
      name: setDefinition.pieceNames[slotId],
      nameKey: createPieceNameKey(setDefinition.id, slotId),
      troopAffinity: setDefinition.troopAffinity,
      dataStatus: 'identity-only',
      variants: Object.freeze(createVariants(setDefinition, slotId)),
      sourceRefs: IDENTITY_SOURCE_REFS,
    })
  );
}

const PIECES = Object.freeze(
  SET_DEFINITIONS.flatMap((setDefinition) => createPieces(setDefinition))
);

const SETS = Object.freeze(
  SET_DEFINITIONS.map((setDefinition) =>
    Object.freeze({
      id: setDefinition.id,
      family: setDefinition.family,
      name: setDefinition.name,
      nameKey: setDefinition.nameKey,
      troopAffinity: setDefinition.troopAffinity,
      dataStatus: 'identity-only',
      pieceIds: Object.freeze(
        EQUIPMENT_SLOT_IDS.map((slotId) => createPieceId(setDefinition.id, slotId))
      ),
      sourceRefs: IDENTITY_SOURCE_REFS,
    })
  )
);

export const EQUIPMENT_CATALOG = Object.freeze({
  catalogSchemaVersion: EQUIPMENT_CATALOG_SCHEMA_VERSION,
  catalogRevision: EQUIPMENT_CATALOG_REVISION,
  dataStatus: 'identity-only',
  slots: EQUIPMENT_SLOT_IDS,
  families: EQUIPMENT_FAMILY_IDS,
  grades: EQUIPMENT_GRADE_IDS,
  sources: Object.freeze([
    Object.freeze({
      id: 'repo.dm-equipment-assets',
      kind: 'repository-art',
      description: 'Captured in-game equipment art stored under assets/dm/equipment.',
    }),
    Object.freeze({
      id: 'repo.dm-equipment-names',
      kind: 'repository-catalog',
      description: 'Verified equipment and set identities used by the Dragon Master planner.',
    }),
  ]),
  sets: SETS,
  pieces: PIECES,
  setBonuses: Object.freeze([]),
  specialSkills: Object.freeze([]),
});
