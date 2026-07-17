import {
  EQUIPMENT_CATALOG,
  EQUIPMENT_CATALOG_SCHEMA_VERSION,
  EQUIPMENT_DATA_STATUSES,
  EQUIPMENT_FAMILY_IDS,
  EQUIPMENT_GRADE_IDS,
  EQUIPMENT_LEGACY_SLOT_ALIASES,
  EQUIPMENT_SLOT_IDS,
} from './battle-simulator-equipment-catalog.js';
import {
  ALLOWED_EQUIPMENT_SPECIAL_RULE_IDS,
  isEquipmentSpecialRuleAllowed,
  normalizeEquipmentSpecialRuleId,
} from './battle-simulator-effects.js';
import {
  BATTLE_STAT_KEYS,
  getBattleStatUnit,
  normalizeStatSource,
} from './battle-simulator-stat-sources.js';

export const EQUIPMENT_LOADOUT_SCHEMA_VERSION = 1;

export const EQUIPMENT_LOADOUT_MODES = Object.freeze({
  NONE: 'none',
  NORMAL: 'normal',
  DRAGON_MASTER: 'dragon-master',
});

export const EQUIPMENT_COMPLETENESS = Object.freeze({
  NONE: 'none',
  IDENTITY_ONLY: 'identity-only',
  PARTIAL: 'partial',
  COMPLETE: 'complete',
  UNRESOLVED: 'unresolved',
});

export const EQUIPMENT_STAT_KEYS = BATTLE_STAT_KEYS;

export const EQUIPMENT_VERIFICATION_STATUSES = Object.freeze(['verified', 'provisional']);

const TROOP_TYPES = Object.freeze(['cavalry', 'archers', 'footmen']);
const ROW_IDS = Object.freeze(['front', 'middle', 'back']);
const MAX_LOADOUT_PIECES = 24;
const MAX_EFFECT_AMOUNT = 1_000_000;
const ID_PATTERN = /^[a-z0-9][a-z0-9._:-]{0,127}$/;
const SOURCE_ID_PATTERN = /^[a-z0-9][a-z0-9._:-]{0,127}$/;
const UNRESOLVED_CODES = new Set([
  'unknown-set',
  'mode-set-mismatch',
  'unknown-slot',
  'unknown-piece',
  'piece-slot-mismatch',
  'piece-family-mismatch',
  'unknown-grade',
]);

function requireObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object.`);
  }
  return value;
}

function requireArray(value, label, maximum = 256) {
  if (!Array.isArray(value)) throw new TypeError(`${label} must be an array.`);
  if (value.length > maximum) {
    throw new RangeError(`${label} cannot contain more than ${maximum} entries.`);
  }
  return value;
}

function boundedString(value, label, maximum = 160) {
  if (typeof value !== 'string') throw new TypeError(`${label} must be a string.`);
  const normalized = value.trim();
  if (!normalized || normalized.length > maximum) {
    throw new RangeError(`${label} must contain 1-${maximum} characters.`);
  }
  return normalized;
}

function normalizedId(value, label) {
  const normalized = boundedString(value, label, 128).toLowerCase();
  if (!ID_PATTERN.test(normalized)) {
    throw new RangeError(`${label} contains unsupported characters.`);
  }
  return normalized;
}

function normalizedSourceId(value, label) {
  const normalized = boundedString(value, label, 128).toLowerCase();
  if (!SOURCE_ID_PATTERN.test(normalized)) {
    throw new RangeError(`${label} contains unsupported characters.`);
  }
  return normalized;
}

function uniqueStrings(values, label, normalize, maximum = 64) {
  const entries = requireArray(values, label, maximum).map((value, index) =>
    normalize(value, `${label} entry ${index + 1}`)
  );
  if (new Set(entries).size !== entries.length) {
    throw new RangeError(`${label} cannot contain duplicate values.`);
  }
  return entries;
}

function boundedInteger(value, label, minimum, maximum) {
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) {
    throw new TypeError(`${label} must be a safe integer.`);
  }
  if (value < minimum || value > maximum) {
    throw new RangeError(`${label} must be between ${minimum} and ${maximum}.`);
  }
  return value;
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

function normalizeJsonData(value, label, depth = 0) {
  if (depth > 5) throw new RangeError(`${label} cannot be nested more than 5 levels.`);
  if (value === null || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError(`${label} numbers must be finite.`);
    return value;
  }
  if (typeof value === 'string') return boundedString(value, label, 512);
  if (Array.isArray(value)) {
    return requireArray(value, label, 32).map((entry, index) =>
      normalizeJsonData(entry, `${label}[${index}]`, depth + 1)
    );
  }
  const object = requireObject(value, label);
  const entries = Object.entries(object);
  if (entries.length > 32) throw new RangeError(`${label} cannot contain more than 32 fields.`);
  return Object.fromEntries(
    entries.map(([key, entry]) => {
      if (['__proto__', 'prototype', 'constructor'].includes(key.toLowerCase())) {
        throw new RangeError(`${label} contains reserved field "${key}".`);
      }
      const normalizedKey = boundedString(key, `${label} field`, 64);
      return [normalizedKey, normalizeJsonData(entry, `${label}.${normalizedKey}`, depth + 1)];
    })
  );
}

export function normalizeEquipmentSlotId(value, { preserveUnknown = true } = {}) {
  const slotId = normalizedId(value, 'Equipment slot ID');
  const known = EQUIPMENT_LEGACY_SLOT_ALIASES[slotId];
  if (known) return known;
  if (preserveUnknown) return slotId;
  throw new RangeError(`Unsupported equipment slot "${slotId}".`);
}

function normalizeStringScope(values, allowed, label) {
  if (values === undefined) return [];
  const normalized = uniqueStrings(
    values,
    label,
    (value, entryLabel) => normalizedId(value, entryLabel),
    32
  );
  for (const value of normalized) {
    if (!allowed.includes(value))
      throw new RangeError(`${label} contains unsupported value "${value}".`);
  }
  return normalized.sort();
}

function normalizeAppliesTo(value, label) {
  const scope = requireObject(value, label);
  return {
    battleModes: normalizeStringScope(
      scope.battleModes,
      ['pvp-field', 'siege'],
      `${label} battleModes`
    ),
    troopTypes: normalizeStringScope(scope.troopTypes, TROOP_TYPES, `${label} troopTypes`),
    rowIds: normalizeStringScope(scope.rowIds, ROW_IDS, `${label} rowIds`),
  };
}

function normalizeSourceRefs(value, label) {
  if (value === undefined) return [];
  return uniqueStrings(value, label, normalizedSourceId, 32).sort();
}

function normalizeVerification(value, label) {
  if (!EQUIPMENT_VERIFICATION_STATUSES.includes(value)) {
    throw new RangeError(`${label} must be one of: ${EQUIPMENT_VERIFICATION_STATUSES.join(', ')}.`);
  }
  return value;
}

function normalizeDataStatus(value, label) {
  if (!EQUIPMENT_DATA_STATUSES.includes(value)) {
    throw new RangeError(`${label} must be one of: ${EQUIPMENT_DATA_STATUSES.join(', ')}.`);
  }
  return value;
}

function normalizeEffect(rawEffect, label) {
  const effect = requireObject(rawEffect, label);
  const statKey = boundedString(effect.statKey, `${label} statKey`, 40);
  if (!EQUIPMENT_STAT_KEYS.includes(statKey)) {
    throw new RangeError(`${label} has unsupported statKey "${statKey}".`);
  }
  if (effect.operation !== 'add') throw new RangeError(`${label} operation must be "add".`);
  const expectedUnit = getBattleStatUnit(statKey);
  if (effect.unit !== expectedUnit) {
    throw new RangeError(`${label} ${statKey} unit must be "${expectedUnit}".`);
  }
  if (typeof effect.amount !== 'number' || !Number.isFinite(effect.amount)) {
    throw new TypeError(`${label} amount must be a finite number.`);
  }
  if (Math.abs(effect.amount) > MAX_EFFECT_AMOUNT) {
    throw new RangeError(`${label} amount exceeds the supported range.`);
  }
  const verification = normalizeVerification(effect.verification, `${label} verification`);
  const sourceRefs = normalizeSourceRefs(effect.sourceRefs, `${label} sourceRefs`);
  if (verification === 'verified' && sourceRefs.length === 0) {
    throw new RangeError(`${label} verified effects require at least one source reference.`);
  }
  return {
    id: normalizedId(effect.id, `${label} id`),
    label: boundedString(effect.label, `${label} label`, 160),
    statKey,
    amount: effect.amount,
    operation: 'add',
    unit: expectedUnit,
    appliesTo: normalizeAppliesTo(effect.appliesTo, `${label} appliesTo`),
    verification,
    sourceRefs,
  };
}

function normalizeEffects(value, label) {
  const effects = requireArray(value ?? [], label, 64).map((effect, index) =>
    normalizeEffect(effect, `${label} ${index + 1}`)
  );
  const ids = effects.map((effect) => effect.id);
  if (new Set(ids).size !== ids.length) throw new RangeError(`${label} has duplicate effect IDs.`);
  return effects;
}

function normalizeEnhancementLevels(value, label) {
  const levels = requireArray(value ?? [], label, 101).map((rawLevel, index) => {
    const level = requireObject(rawLevel, `${label} ${index + 1}`);
    return {
      level: boundedInteger(level.level, `${label} ${index + 1} level`, 1, 100),
      dataStatus: normalizeDataStatus(
        level.dataStatus ?? 'partial',
        `${label} ${index + 1} dataStatus`
      ),
      effects: normalizeEffects(level.effects, `${label} ${index + 1} effects`),
      sourceRefs: normalizeSourceRefs(level.sourceRefs, `${label} ${index + 1} sourceRefs`),
    };
  });
  const ids = levels.map((level) => level.level);
  if (new Set(ids).size !== ids.length) throw new RangeError(`${label} has duplicate levels.`);
  return levels.sort((left, right) => left.level - right.level);
}

function normalizeAdvancementStages(value, label) {
  const stages = requireArray(value ?? [], label, 64).map((rawStage, index) => {
    const stage = requireObject(rawStage, `${label} ${index + 1}`);
    return {
      id: normalizedId(stage.id, `${label} ${index + 1} id`),
      dataStatus: normalizeDataStatus(
        stage.dataStatus ?? 'partial',
        `${label} ${index + 1} dataStatus`
      ),
      effects: normalizeEffects(stage.effects, `${label} ${index + 1} effects`),
      sourceRefs: normalizeSourceRefs(stage.sourceRefs, `${label} ${index + 1} sourceRefs`),
    };
  });
  const ids = stages.map((stage) => stage.id);
  if (new Set(ids).size !== ids.length) throw new RangeError(`${label} has duplicate stage IDs.`);
  return stages;
}

function normalizeVariant(rawVariant, label, gradeIds) {
  const variant = requireObject(rawVariant, label);
  const gradeId = normalizedId(variant.gradeId, `${label} gradeId`);
  if (!gradeIds.includes(gradeId)) throw new RangeError(`${label} has unknown grade "${gradeId}".`);
  return {
    gradeId,
    assetPath: boundedString(variant.assetPath, `${label} assetPath`, 260),
    dataStatus: normalizeDataStatus(variant.dataStatus, `${label} dataStatus`),
    baseEffects: normalizeEffects(variant.baseEffects, `${label} baseEffects`),
    enhancementLevels: normalizeEnhancementLevels(
      variant.enhancementLevels,
      `${label} enhancementLevels`
    ),
    advancementStages: normalizeAdvancementStages(
      variant.advancementStages,
      `${label} advancementStages`
    ),
    sourceRefs: normalizeSourceRefs(variant.sourceRefs, `${label} sourceRefs`),
  };
}

function normalizeSetRequirements(rawRequirements, label, gradeIds) {
  const requirements = requireObject(rawRequirements, label);
  const requiredSlots =
    requirements.requiredSlots === 'all'
      ? [...EQUIPMENT_SLOT_IDS]
      : uniqueStrings(
          requirements.requiredSlots,
          `${label} requiredSlots`,
          (value) => normalizeEquipmentSlotId(value, { preserveUnknown: false }),
          EQUIPMENT_SLOT_IDS.length
        );
  const allowedGradeIds =
    requirements.allowedGradeIds === undefined
      ? []
      : uniqueStrings(
          requirements.allowedGradeIds,
          `${label} allowedGradeIds`,
          normalizedId,
          gradeIds.length
        );
  for (const gradeId of allowedGradeIds) {
    if (!gradeIds.includes(gradeId)) {
      throw new RangeError(`${label} has unknown allowed grade "${gradeId}".`);
    }
  }
  const minimumEnhancementLevel = boundedInteger(
    requirements.minimumEnhancementLevel ?? 0,
    `${label} minimumEnhancementLevel`,
    0,
    100
  );
  const requiredAdvancementStageId =
    requirements.requiredAdvancementStageId === null ||
    requirements.requiredAdvancementStageId === undefined
      ? null
      : normalizedId(
          requirements.requiredAdvancementStageId,
          `${label} requiredAdvancementStageId`
        );
  return {
    requiredSlots: requiredSlots.sort(
      (left, right) => EQUIPMENT_SLOT_IDS.indexOf(left) - EQUIPMENT_SLOT_IDS.indexOf(right)
    ),
    allowedGradeIds: allowedGradeIds.sort(),
    minimumEnhancementLevel,
    requiredAdvancementStageId,
  };
}

function normalizeSpecialSkill(rawSkill, label) {
  const skill = requireObject(rawSkill, label);
  const verification = normalizeVerification(skill.verification, `${label} verification`);
  const sourceRefs = normalizeSourceRefs(skill.sourceRefs, `${label} sourceRefs`);
  if (verification === 'verified' && sourceRefs.length === 0) {
    throw new RangeError(`${label} verified skills require at least one source reference.`);
  }
  return {
    id: normalizedId(skill.id, `${label} id`),
    label: boundedString(skill.label, `${label} label`, 160),
    ruleId: normalizeEquipmentSpecialRuleId(skill.ruleId, `${label} ruleId`),
    parameters: normalizeJsonData(skill.parameters ?? {}, `${label} parameters`),
    appliesTo: normalizeAppliesTo(skill.appliesTo, `${label} appliesTo`),
    verification,
    sourceRefs,
  };
}

function assertUniqueIds(entries, label) {
  const ids = entries.map((entry) => entry.id);
  if (new Set(ids).size !== ids.length) throw new RangeError(`${label} contains duplicate IDs.`);
}

export function validateEquipmentCatalog(rawCatalog = EQUIPMENT_CATALOG) {
  const catalog = requireObject(rawCatalog, 'Equipment catalog');
  if (catalog.catalogSchemaVersion !== EQUIPMENT_CATALOG_SCHEMA_VERSION) {
    throw new RangeError(
      `Unsupported equipment catalog schema version "${String(catalog.catalogSchemaVersion)}".`
    );
  }
  const catalogRevision = boundedString(catalog.catalogRevision, 'Equipment catalog revision', 80);
  const slots = uniqueStrings(
    catalog.slots,
    'Equipment catalog slots',
    (value) => normalizeEquipmentSlotId(value, { preserveUnknown: false }),
    EQUIPMENT_SLOT_IDS.length
  );
  if (
    slots.length !== EQUIPMENT_SLOT_IDS.length ||
    EQUIPMENT_SLOT_IDS.some((slotId) => !slots.includes(slotId))
  ) {
    throw new RangeError('Equipment catalog must define all six canonical equipment slots.');
  }
  const families = uniqueStrings(
    catalog.families,
    'Equipment catalog families',
    normalizedId,
    EQUIPMENT_FAMILY_IDS.length
  );
  if (families.some((family) => !EQUIPMENT_FAMILY_IDS.includes(family))) {
    throw new RangeError('Equipment catalog contains an unsupported family.');
  }
  const grades = uniqueStrings(
    catalog.grades,
    'Equipment catalog grades',
    normalizedId,
    EQUIPMENT_GRADE_IDS.length
  );
  if (grades.some((grade) => !EQUIPMENT_GRADE_IDS.includes(grade))) {
    throw new RangeError('Equipment catalog contains an unsupported grade.');
  }
  const sources = requireArray(catalog.sources, 'Equipment catalog sources', 256).map(
    (rawSource, index) => {
      const source = requireObject(rawSource, `Equipment catalog source ${index + 1}`);
      return {
        id: normalizedSourceId(source.id, `Equipment catalog source ${index + 1} id`),
        kind: normalizedId(source.kind, `Equipment catalog source ${index + 1} kind`),
        description: boundedString(
          source.description,
          `Equipment catalog source ${index + 1} description`,
          500
        ),
      };
    }
  );
  assertUniqueIds(sources, 'Equipment catalog sources');

  const sets = requireArray(catalog.sets, 'Equipment catalog sets', 64).map((rawSet, index) => {
    const set = requireObject(rawSet, `Equipment catalog set ${index + 1}`);
    const family = normalizedId(set.family, `Equipment catalog set ${index + 1} family`);
    if (!families.includes(family)) {
      throw new RangeError(`Equipment catalog set ${index + 1} has unknown family "${family}".`);
    }
    const troopAffinity = normalizedId(
      set.troopAffinity,
      `Equipment catalog set ${index + 1} troopAffinity`
    );
    if (troopAffinity !== 'all' && !TROOP_TYPES.includes(troopAffinity)) {
      throw new RangeError(`Equipment catalog set ${index + 1} has unknown troop affinity.`);
    }
    return {
      id: normalizedId(set.id, `Equipment catalog set ${index + 1} id`),
      family,
      name: boundedString(set.name, `Equipment catalog set ${index + 1} name`, 120),
      nameKey: boundedString(set.nameKey, `Equipment catalog set ${index + 1} nameKey`, 160),
      troopAffinity,
      dataStatus: normalizeDataStatus(
        set.dataStatus,
        `Equipment catalog set ${index + 1} dataStatus`
      ),
      pieceIds: uniqueStrings(
        set.pieceIds,
        `Equipment catalog set ${index + 1} pieceIds`,
        normalizedId,
        EQUIPMENT_SLOT_IDS.length
      ),
      sourceRefs: normalizeSourceRefs(
        set.sourceRefs,
        `Equipment catalog set ${index + 1} sourceRefs`
      ),
    };
  });
  assertUniqueIds(sets, 'Equipment catalog sets');
  const setIds = new Set(sets.map((set) => set.id));

  const pieces = requireArray(catalog.pieces, 'Equipment catalog pieces', 512).map(
    (rawPiece, index) => {
      const piece = requireObject(rawPiece, `Equipment catalog piece ${index + 1}`);
      const setId = normalizedId(piece.setId, `Equipment catalog piece ${index + 1} setId`);
      if (!setIds.has(setId)) {
        throw new RangeError(`Equipment catalog piece ${index + 1} has unknown set "${setId}".`);
      }
      const family = normalizedId(piece.family, `Equipment catalog piece ${index + 1} family`);
      if (!families.includes(family)) {
        throw new RangeError(
          `Equipment catalog piece ${index + 1} has unknown family "${family}".`
        );
      }
      const slotId = normalizeEquipmentSlotId(piece.slotId, { preserveUnknown: false });
      const troopAffinity = normalizedId(
        piece.troopAffinity,
        `Equipment catalog piece ${index + 1} troopAffinity`
      );
      if (troopAffinity !== 'all' && !TROOP_TYPES.includes(troopAffinity)) {
        throw new RangeError(`Equipment catalog piece ${index + 1} has unknown troop affinity.`);
      }
      const variants = requireArray(
        piece.variants,
        `Equipment catalog piece ${index + 1} variants`,
        grades.length
      ).map((variant, variantIndex) =>
        normalizeVariant(
          variant,
          `Equipment catalog piece ${index + 1} variant ${variantIndex + 1}`,
          grades
        )
      );
      const variantIds = variants.map((variant) => variant.gradeId);
      if (new Set(variantIds).size !== variantIds.length) {
        throw new RangeError(`Equipment catalog piece ${index + 1} has duplicate grades.`);
      }
      return {
        id: normalizedId(piece.id, `Equipment catalog piece ${index + 1} id`),
        setId,
        family,
        slotId,
        name: boundedString(piece.name, `Equipment catalog piece ${index + 1} name`, 160),
        nameKey: boundedString(piece.nameKey, `Equipment catalog piece ${index + 1} nameKey`, 180),
        troopAffinity,
        dataStatus: normalizeDataStatus(
          piece.dataStatus,
          `Equipment catalog piece ${index + 1} dataStatus`
        ),
        variants,
        sourceRefs: normalizeSourceRefs(
          piece.sourceRefs,
          `Equipment catalog piece ${index + 1} sourceRefs`
        ),
      };
    }
  );
  assertUniqueIds(pieces, 'Equipment catalog pieces');
  const pieceById = new Map(pieces.map((piece) => [piece.id, piece]));
  const setById = new Map(sets.map((set) => [set.id, set]));
  for (const set of sets) {
    if (set.pieceIds.length !== EQUIPMENT_SLOT_IDS.length) {
      throw new RangeError(`Equipment set "${set.id}" must contain exactly six pieces.`);
    }
    const seenSlots = new Set();
    for (const pieceId of set.pieceIds) {
      const piece = pieceById.get(pieceId);
      if (!piece || piece.setId !== set.id || piece.family !== set.family) {
        throw new RangeError(`Equipment set "${set.id}" references invalid piece "${pieceId}".`);
      }
      if (seenSlots.has(piece.slotId)) {
        throw new RangeError(
          `Equipment set "${set.id}" contains duplicate slot "${piece.slotId}".`
        );
      }
      seenSlots.add(piece.slotId);
    }
  }

  const specialSkills = requireArray(
    catalog.specialSkills,
    'Equipment catalog specialSkills',
    256
  ).map((skill, index) =>
    normalizeSpecialSkill(skill, `Equipment catalog special skill ${index + 1}`)
  );
  assertUniqueIds(specialSkills, 'Equipment catalog specialSkills');
  const specialSkillIds = new Set(specialSkills.map((skill) => skill.id));

  const setBonuses = requireArray(catalog.setBonuses, 'Equipment catalog setBonuses', 256).map(
    (rawBonus, index) => {
      const bonus = requireObject(rawBonus, `Equipment catalog set bonus ${index + 1}`);
      const setId = normalizedId(bonus.setId, `Equipment catalog set bonus ${index + 1} setId`);
      if (!setById.has(setId)) {
        throw new RangeError(
          `Equipment catalog set bonus ${index + 1} has unknown set "${setId}".`
        );
      }
      const referencedSkills = uniqueStrings(
        bonus.specialSkillIds ?? [],
        `Equipment catalog set bonus ${index + 1} specialSkillIds`,
        normalizedId,
        32
      );
      for (const skillId of referencedSkills) {
        if (!specialSkillIds.has(skillId)) {
          throw new RangeError(
            `Equipment catalog set bonus ${index + 1} references unknown skill "${skillId}".`
          );
        }
      }
      return {
        id: normalizedId(bonus.id, `Equipment catalog set bonus ${index + 1} id`),
        setId,
        label: boundedString(bonus.label, `Equipment catalog set bonus ${index + 1} label`, 160),
        dataStatus: normalizeDataStatus(
          bonus.dataStatus,
          `Equipment catalog set bonus ${index + 1} dataStatus`
        ),
        requirements: normalizeSetRequirements(
          bonus.requirements,
          `Equipment catalog set bonus ${index + 1} requirements`,
          grades
        ),
        effects: normalizeEffects(
          bonus.effects,
          `Equipment catalog set bonus ${index + 1} effects`
        ),
        specialSkillIds: referencedSkills.sort(),
        sourceRefs: normalizeSourceRefs(
          bonus.sourceRefs,
          `Equipment catalog set bonus ${index + 1} sourceRefs`
        ),
      };
    }
  );
  assertUniqueIds(setBonuses, 'Equipment catalog setBonuses');

  const sourceIds = new Set(sources.map((source) => source.id));
  const assertSourceRefs = (refs, label) => {
    for (const sourceRef of refs) {
      if (!sourceIds.has(sourceRef)) {
        throw new RangeError(`${label} references unknown source "${sourceRef}".`);
      }
    }
  };
  for (const set of sets) assertSourceRefs(set.sourceRefs, `Equipment set "${set.id}"`);
  for (const piece of pieces) {
    assertSourceRefs(piece.sourceRefs, `Equipment piece "${piece.id}"`);
    for (const variant of piece.variants) {
      assertSourceRefs(variant.sourceRefs, `Equipment variant "${piece.id}:${variant.gradeId}"`);
      for (const effect of variant.baseEffects) {
        assertSourceRefs(effect.sourceRefs, `Equipment effect "${effect.id}"`);
      }
      for (const level of variant.enhancementLevels) {
        assertSourceRefs(level.sourceRefs, `Equipment enhancement "${piece.id}:+${level.level}"`);
        for (const effect of level.effects) {
          assertSourceRefs(effect.sourceRefs, `Equipment effect "${effect.id}"`);
        }
      }
      for (const stage of variant.advancementStages) {
        assertSourceRefs(stage.sourceRefs, `Equipment advancement "${piece.id}:${stage.id}"`);
        for (const effect of stage.effects) {
          assertSourceRefs(effect.sourceRefs, `Equipment effect "${effect.id}"`);
        }
      }
    }
  }
  for (const skill of specialSkills) {
    assertSourceRefs(skill.sourceRefs, `Equipment special skill "${skill.id}"`);
  }
  for (const bonus of setBonuses) {
    assertSourceRefs(bonus.sourceRefs, `Equipment set bonus "${bonus.id}"`);
    for (const effect of bonus.effects) {
      assertSourceRefs(effect.sourceRefs, `Equipment effect "${effect.id}"`);
    }
  }

  return deepFreeze({
    catalogSchemaVersion: EQUIPMENT_CATALOG_SCHEMA_VERSION,
    catalogRevision,
    dataStatus: normalizeDataStatus(catalog.dataStatus, 'Equipment catalog dataStatus'),
    slots,
    families,
    grades,
    sources,
    sets,
    pieces,
    setBonuses,
    specialSkills,
  });
}

const VALIDATED_DEFAULT_CATALOG = validateEquipmentCatalog(EQUIPMENT_CATALOG);

function normalizedCatalog(catalog) {
  return catalog === EQUIPMENT_CATALOG
    ? VALIDATED_DEFAULT_CATALOG
    : validateEquipmentCatalog(catalog);
}

function normalizeLoadoutMode(value) {
  const mode = value ?? EQUIPMENT_LOADOUT_MODES.NONE;
  if (!Object.values(EQUIPMENT_LOADOUT_MODES).includes(mode)) {
    throw new RangeError(`Unsupported equipment loadout mode "${String(mode)}".`);
  }
  return mode;
}

function normalizeLoadoutPiece(rawPiece, index) {
  const piece = requireObject(rawPiece, `Equipment loadout piece ${index + 1}`);
  return {
    slotId: normalizeEquipmentSlotId(piece.slotId),
    pieceId: normalizedId(piece.pieceId, `Equipment loadout piece ${index + 1} pieceId`),
    gradeId: normalizedId(piece.gradeId, `Equipment loadout piece ${index + 1} gradeId`),
    enhancementLevel: boundedInteger(
      piece.enhancementLevel ?? 0,
      `Equipment loadout piece ${index + 1} enhancementLevel`,
      0,
      100
    ),
    advancementStageId:
      piece.advancementStageId === null || piece.advancementStageId === undefined
        ? null
        : normalizedId(
            piece.advancementStageId,
            `Equipment loadout piece ${index + 1} advancementStageId`
          ),
  };
}

function sortLoadoutPieces(pieces) {
  return pieces.sort((left, right) => {
    const leftIndex = EQUIPMENT_SLOT_IDS.indexOf(left.slotId);
    const rightIndex = EQUIPMENT_SLOT_IDS.indexOf(right.slotId);
    if (leftIndex >= 0 && rightIndex >= 0) return leftIndex - rightIndex;
    if (leftIndex >= 0) return -1;
    if (rightIndex >= 0) return 1;
    return left.slotId.localeCompare(right.slotId) || left.pieceId.localeCompare(right.pieceId);
  });
}

export function createDefaultEquipmentLoadout() {
  return {
    loadoutSchemaVersion: EQUIPMENT_LOADOUT_SCHEMA_VERSION,
    catalogRevisionAtSave: VALIDATED_DEFAULT_CATALOG.catalogRevision,
    mode: EQUIPMENT_LOADOUT_MODES.NONE,
    setId: null,
    pieces: [],
  };
}

export const createEmptyEquipmentLoadout = createDefaultEquipmentLoadout;

export function normalizeEquipmentLoadout(rawLoadout, { catalog = EQUIPMENT_CATALOG } = {}) {
  const validatedCatalog = normalizedCatalog(catalog);
  if (rawLoadout === null || rawLoadout === undefined) {
    return {
      ...createDefaultEquipmentLoadout(),
      catalogRevisionAtSave: validatedCatalog.catalogRevision,
    };
  }
  const loadout = requireObject(rawLoadout, 'Equipment loadout');
  const rawVersion = loadout.loadoutSchemaVersion ?? loadout.schemaVersion ?? 0;
  if (rawVersion !== 0 && rawVersion !== EQUIPMENT_LOADOUT_SCHEMA_VERSION) {
    throw new RangeError(`Unsupported equipment loadout schema version "${String(rawVersion)}".`);
  }
  const mode = normalizeLoadoutMode(loadout.mode);
  if (mode === EQUIPMENT_LOADOUT_MODES.NONE) {
    return {
      loadoutSchemaVersion: EQUIPMENT_LOADOUT_SCHEMA_VERSION,
      catalogRevisionAtSave:
        loadout.catalogRevisionAtSave === null || loadout.catalogRevisionAtSave === undefined
          ? validatedCatalog.catalogRevision
          : boundedString(loadout.catalogRevisionAtSave, 'Equipment catalog revision at save', 80),
      mode,
      setId: null,
      pieces: [],
    };
  }
  const pieces = requireArray(
    loadout.pieces ?? [],
    'Equipment loadout pieces',
    MAX_LOADOUT_PIECES
  ).map(normalizeLoadoutPiece);
  const slotIds = pieces.map((piece) => piece.slotId);
  if (new Set(slotIds).size !== slotIds.length) {
    throw new RangeError('Equipment loadout cannot contain more than one piece in the same slot.');
  }
  return {
    loadoutSchemaVersion: EQUIPMENT_LOADOUT_SCHEMA_VERSION,
    catalogRevisionAtSave:
      loadout.catalogRevisionAtSave === null || loadout.catalogRevisionAtSave === undefined
        ? validatedCatalog.catalogRevision
        : boundedString(loadout.catalogRevisionAtSave, 'Equipment catalog revision at save', 80),
    mode,
    setId: normalizedId(loadout.setId, 'Equipment loadout setId'),
    pieces: sortLoadoutPieces(pieces),
  };
}

export function parseEquipmentLoadout(jsonText, options) {
  if (typeof jsonText !== 'string') {
    throw new TypeError('Equipment loadout JSON must be provided as text.');
  }
  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch (error) {
    throw new TypeError(`Equipment loadout JSON is invalid: ${error.message}`);
  }
  return normalizeEquipmentLoadout(parsed, options);
}

export function cloneEquipmentLoadout(loadout, options) {
  return normalizeEquipmentLoadout(loadout, options);
}

export function createEquipmentSetLoadout({
  setId,
  gradeId = 'gold',
  enhancementLevel = 0,
  advancementStageId = null,
  catalog = EQUIPMENT_CATALOG,
} = {}) {
  const validatedCatalog = normalizedCatalog(catalog);
  const normalizedSetId = normalizedId(setId, 'Equipment setId');
  const normalizedGradeId = normalizedId(gradeId, 'Equipment gradeId');
  const set = validatedCatalog.sets.find((entry) => entry.id === normalizedSetId);
  if (!set) throw new RangeError(`Unknown equipment set "${normalizedSetId}".`);
  const pieces = set.pieceIds.map((pieceId) => {
    const piece = validatedCatalog.pieces.find((entry) => entry.id === pieceId);
    if (!piece.variants.some((variant) => variant.gradeId === normalizedGradeId)) {
      throw new RangeError(
        `Equipment set "${normalizedSetId}" does not have grade "${normalizedGradeId}" for every piece.`
      );
    }
    return {
      slotId: piece.slotId,
      pieceId: piece.id,
      gradeId: normalizedGradeId,
      enhancementLevel,
      advancementStageId,
    };
  });
  return normalizeEquipmentLoadout(
    {
      loadoutSchemaVersion: EQUIPMENT_LOADOUT_SCHEMA_VERSION,
      catalogRevisionAtSave: validatedCatalog.catalogRevision,
      mode: set.family,
      setId: set.id,
      pieces,
    },
    { catalog: validatedCatalog }
  );
}

function addMissingData(missingData, code, message, details = {}) {
  missingData.push({ code, message, ...details });
}

function effectContribution(effect, sourceId, catalogRevision) {
  return normalizeStatSource({
    sourceType: 'equipment',
    sourceId,
    label: effect.label,
    statKey: effect.statKey,
    amount: effect.amount,
    operation: 'add',
    unit: effect.unit,
    appliesTo: {
      battleModes: [...effect.appliesTo.battleModes],
      troopTypes: [...effect.appliesTo.troopTypes],
      rowIds: [...effect.appliesTo.rowIds],
    },
    verification: effect.verification,
    provenance: {
      catalogRevision,
      effectId: effect.id,
      sourceRefs: [...effect.sourceRefs],
    },
  });
}

function collectEffects(effects, sourceId, catalogRevision, contributions, missingData) {
  for (const effect of effects) {
    if (effect.verification !== 'verified') {
      addMissingData(
        missingData,
        'effect-not-verified',
        `${effect.label} is provisional and was not applied.`,
        { sourceId, effectId: effect.id }
      );
      continue;
    }
    contributions.push(effectContribution(effect, `${sourceId}:${effect.id}`, catalogRevision));
  }
}

function setBonusMatches(bonus, selectedPieces) {
  const bySlot = new Map(selectedPieces.map((entry) => [entry.selection.slotId, entry]));
  return bonus.requirements.requiredSlots.every((slotId) => {
    const selected = bySlot.get(slotId);
    if (!selected || selected.piece.setId !== bonus.setId) return false;
    if (
      bonus.requirements.allowedGradeIds.length > 0 &&
      !bonus.requirements.allowedGradeIds.includes(selected.selection.gradeId)
    ) {
      return false;
    }
    if (selected.selection.enhancementLevel < bonus.requirements.minimumEnhancementLevel) {
      return false;
    }
    if (
      bonus.requirements.requiredAdvancementStageId !== null &&
      selected.selection.advancementStageId !== bonus.requirements.requiredAdvancementStageId
    ) {
      return false;
    }
    return true;
  });
}

function activeSpecialSkill(skill, sourceId, catalogRevision) {
  return {
    sourceType: 'equipment',
    sourceId,
    label: skill.label,
    ruleId: skill.ruleId,
    parameters: normalizeJsonData(skill.parameters, `${skill.label} parameters`),
    appliesTo: {
      battleModes: [...skill.appliesTo.battleModes],
      troopTypes: [...skill.appliesTo.troopTypes],
      rowIds: [...skill.appliesTo.rowIds],
    },
    verification: skill.verification,
    provenance: {
      catalogRevision,
      skillId: skill.id,
      sourceRefs: [...skill.sourceRefs],
    },
  };
}

function deterministicSort(left, right) {
  return (
    left.sourceId.localeCompare(right.sourceId) ||
    String(left.statKey || left.ruleId || '').localeCompare(
      String(right.statKey || right.ruleId || '')
    )
  );
}

export function equipmentScopeMatches(appliesTo, { battleMode, troopType, rowId } = {}) {
  const normalized = normalizeAppliesTo(appliesTo, 'Equipment contribution appliesTo');
  if (normalized.battleModes.length > 0 && battleMode === undefined) return false;
  if (battleMode !== undefined) {
    const mode = normalizedId(battleMode, 'Battle mode');
    if (normalized.battleModes.length > 0 && !normalized.battleModes.includes(mode)) return false;
  }
  if (normalized.troopTypes.length > 0 && troopType === undefined) return false;
  if (troopType !== undefined) {
    const type = normalizedId(troopType, 'Troop type');
    if (!TROOP_TYPES.includes(type)) throw new RangeError(`Unsupported troop type "${type}".`);
    if (normalized.troopTypes.length > 0 && !normalized.troopTypes.includes(type)) return false;
  }
  if (normalized.rowIds.length > 0 && rowId === undefined) return false;
  if (rowId !== undefined) {
    const row = normalizedId(rowId, 'Battle row ID');
    if (!ROW_IDS.includes(row)) throw new RangeError(`Unsupported battle row "${row}".`);
    if (normalized.rowIds.length > 0 && !normalized.rowIds.includes(row)) return false;
  }
  return true;
}

export function filterEquipmentContributions(contributions, context) {
  return requireArray(contributions, 'Equipment contributions', 4096).filter((contribution) =>
    equipmentScopeMatches(requireObject(contribution, 'Equipment contribution').appliesTo, context)
  );
}

export function resolveEquipmentLoadout(
  rawLoadout,
  { catalog = EQUIPMENT_CATALOG, allowedSpecialRuleIds = ALLOWED_EQUIPMENT_SPECIAL_RULE_IDS } = {}
) {
  const validatedCatalog = normalizedCatalog(catalog);
  const loadout = normalizeEquipmentLoadout(rawLoadout, { catalog: validatedCatalog });
  const contributions = [];
  const activeSkills = [];
  const missingData = [];

  if (loadout.mode === EQUIPMENT_LOADOUT_MODES.NONE) {
    return deepFreeze({
      loadout,
      catalogRevision: validatedCatalog.catalogRevision,
      contributions,
      activeSkills,
      completeness: EQUIPMENT_COMPLETENESS.NONE,
      missingData,
      warnings: [],
    });
  }

  const setById = new Map(validatedCatalog.sets.map((set) => [set.id, set]));
  const pieceById = new Map(validatedCatalog.pieces.map((piece) => [piece.id, piece]));
  const skillById = new Map(validatedCatalog.specialSkills.map((skill) => [skill.id, skill]));
  const set = setById.get(loadout.setId);
  if (!set) {
    addMissingData(
      missingData,
      'unknown-set',
      `Equipment set "${loadout.setId}" is not available in catalog ${validatedCatalog.catalogRevision}.`,
      { setId: loadout.setId }
    );
  } else if (set.family !== loadout.mode) {
    addMissingData(
      missingData,
      'mode-set-mismatch',
      `Equipment set "${set.name}" does not match ${loadout.mode} mode.`,
      { setId: set.id }
    );
  }

  const selectedPieces = [];
  for (const selection of loadout.pieces) {
    if (!EQUIPMENT_SLOT_IDS.includes(selection.slotId)) {
      addMissingData(
        missingData,
        'unknown-slot',
        `Equipment slot "${selection.slotId}" is not supported by this catalog.`,
        { slotId: selection.slotId, pieceId: selection.pieceId }
      );
      continue;
    }
    const piece = pieceById.get(selection.pieceId);
    if (!piece) {
      addMissingData(
        missingData,
        'unknown-piece',
        `Equipment piece "${selection.pieceId}" is not available in this catalog.`,
        { slotId: selection.slotId, pieceId: selection.pieceId }
      );
      continue;
    }
    if (piece.slotId !== selection.slotId) {
      addMissingData(
        missingData,
        'piece-slot-mismatch',
        `${piece.name} cannot be equipped in the ${selection.slotId} slot.`,
        { slotId: selection.slotId, pieceId: piece.id }
      );
      continue;
    }
    if (piece.family !== loadout.mode) {
      addMissingData(
        missingData,
        'piece-family-mismatch',
        `${piece.name} does not match ${loadout.mode} mode.`,
        { slotId: selection.slotId, pieceId: piece.id }
      );
      continue;
    }
    if (piece.setId !== loadout.setId) {
      addMissingData(
        missingData,
        'piece-set-mismatch',
        `${piece.name} belongs to a different equipment set, so it cannot complete ${set?.name || loadout.setId}.`,
        { slotId: selection.slotId, pieceId: piece.id, setId: piece.setId }
      );
    }
    const variant = piece.variants.find((entry) => entry.gradeId === selection.gradeId);
    if (!variant) {
      addMissingData(
        missingData,
        'unknown-grade',
        `${piece.name} does not have a verified ${selection.gradeId} identity.`,
        { slotId: selection.slotId, pieceId: piece.id, gradeId: selection.gradeId }
      );
      continue;
    }
    const resolved = { selection, piece, variant };
    selectedPieces.push(resolved);
    const pieceSourceId = `equipment:${piece.id}:${variant.gradeId}`;

    if (variant.dataStatus === 'identity-only') {
      addMissingData(
        missingData,
        'variant-identity-only',
        `${piece.name} ${variant.gradeId} is identified, but its battle values are not captured yet.`,
        { slotId: selection.slotId, pieceId: piece.id, gradeId: variant.gradeId }
      );
    } else if (variant.dataStatus === 'partial') {
      addMissingData(
        missingData,
        'variant-partial',
        `${piece.name} ${variant.gradeId} has incomplete battle data.`,
        { slotId: selection.slotId, pieceId: piece.id, gradeId: variant.gradeId }
      );
    }
    collectEffects(
      variant.baseEffects,
      `${pieceSourceId}:base`,
      validatedCatalog.catalogRevision,
      contributions,
      missingData
    );

    if (selection.enhancementLevel > 0) {
      const level = variant.enhancementLevels.find(
        (entry) => entry.level === selection.enhancementLevel
      );
      if (!level) {
        addMissingData(
          missingData,
          'enhancement-level-unknown',
          `${piece.name} +${selection.enhancementLevel} has no exact captured battle data; no value was interpolated.`,
          {
            slotId: selection.slotId,
            pieceId: piece.id,
            enhancementLevel: selection.enhancementLevel,
          }
        );
      } else {
        if (level.dataStatus !== 'verified') {
          addMissingData(
            missingData,
            'enhancement-level-partial',
            `${piece.name} +${selection.enhancementLevel} has incomplete battle data.`,
            {
              slotId: selection.slotId,
              pieceId: piece.id,
              enhancementLevel: selection.enhancementLevel,
            }
          );
        }
        collectEffects(
          level.effects,
          `${pieceSourceId}:enhancement-${level.level}`,
          validatedCatalog.catalogRevision,
          contributions,
          missingData
        );
      }
    }

    if (selection.advancementStageId !== null) {
      const stage = variant.advancementStages.find(
        (entry) => entry.id === selection.advancementStageId
      );
      if (!stage) {
        addMissingData(
          missingData,
          'advancement-stage-unknown',
          `${piece.name} advancement "${selection.advancementStageId}" has no exact captured battle data.`,
          {
            slotId: selection.slotId,
            pieceId: piece.id,
            advancementStageId: selection.advancementStageId,
          }
        );
      } else {
        if (stage.dataStatus !== 'verified') {
          addMissingData(
            missingData,
            'advancement-stage-partial',
            `${piece.name} advancement "${stage.id}" has incomplete battle data.`,
            {
              slotId: selection.slotId,
              pieceId: piece.id,
              advancementStageId: stage.id,
            }
          );
        }
        collectEffects(
          stage.effects,
          `${pieceSourceId}:advancement-${stage.id}`,
          validatedCatalog.catalogRevision,
          contributions,
          missingData
        );
      }
    }
  }

  if (set) {
    const selectedSlots = new Set(
      selectedPieces
        .filter((entry) => entry.piece.setId === set.id)
        .map((entry) => entry.selection.slotId)
    );
    for (const slotId of EQUIPMENT_SLOT_IDS) {
      if (!selectedSlots.has(slotId)) {
        addMissingData(
          missingData,
          'piece-not-selected',
          `${set.name} has no selected ${slotId} piece.`,
          { setId: set.id, slotId }
        );
      }
    }

    for (const bonus of validatedCatalog.setBonuses.filter((entry) => entry.setId === set.id)) {
      if (!setBonusMatches(bonus, selectedPieces)) continue;
      const bonusSourceId = `equipment:set-bonus:${bonus.id}`;
      collectEffects(
        bonus.effects,
        bonusSourceId,
        validatedCatalog.catalogRevision,
        contributions,
        missingData
      );
      for (const skillId of bonus.specialSkillIds) {
        const skill = skillById.get(skillId);
        if (!skill || skill.verification !== 'verified') {
          addMissingData(
            missingData,
            'special-skill-not-verified',
            `Equipment special skill "${skillId}" is not verified and was not activated.`,
            { setBonusId: bonus.id, skillId }
          );
          continue;
        }
        if (!isEquipmentSpecialRuleAllowed(skill.ruleId, allowedSpecialRuleIds)) {
          addMissingData(
            missingData,
            'special-rule-unavailable',
            `${skill.label} uses unsupported rule "${skill.ruleId}" and was not activated.`,
            { setBonusId: bonus.id, skillId, ruleId: skill.ruleId }
          );
          continue;
        }
        activeSkills.push(
          activeSpecialSkill(
            skill,
            `${bonusSourceId}:${skill.id}`,
            validatedCatalog.catalogRevision
          )
        );
      }
    }
  }

  contributions.sort(deterministicSort);
  activeSkills.sort(deterministicSort);
  missingData.sort(
    (left, right) =>
      left.code.localeCompare(right.code) || left.message.localeCompare(right.message)
  );
  const warnings = [...new Set(missingData.map((entry) => entry.message))].sort();
  const completeness = missingData.some((entry) => UNRESOLVED_CODES.has(entry.code))
    ? EQUIPMENT_COMPLETENESS.UNRESOLVED
    : selectedPieces.length > 0 &&
        selectedPieces.every((entry) => entry.variant.dataStatus === 'identity-only') &&
        contributions.length === 0 &&
        activeSkills.length === 0
      ? EQUIPMENT_COMPLETENESS.IDENTITY_ONLY
      : missingData.length === 0
        ? EQUIPMENT_COMPLETENESS.COMPLETE
        : EQUIPMENT_COMPLETENESS.PARTIAL;

  return deepFreeze({
    loadout,
    catalogRevision: validatedCatalog.catalogRevision,
    contributions,
    activeSkills,
    completeness,
    missingData,
    warnings,
  });
}
