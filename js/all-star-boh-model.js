/**
 * Pure domain helpers for the All-Star Battle of Honor signup, team draft, and
 * player plan. This module intentionally has no DOM, storage, OCR, or Firebase
 * dependency so every persisted value can be normalized and tested first.
 */

export const BOH_SIGNUP_SCHEMA_VERSION = 1;
export const BOH_PLAN_SCHEMA_VERSION = 1;
export const BOH_EPIC_SHOWDOWN_SCHEMA_VERSION = 1;
export const BOH_TEAM_COUNT = 6;
export const BOH_TEAM_SIZE = 12;
export const BOH_FIELD_SIZE = BOH_TEAM_COUNT * BOH_TEAM_SIZE;
export const BOH_MAX_PREFERRED_TEAMMATES = 6;
export const BOH_MAX_USABLE_HERO_NAMES = 78;
export const BOH_FIGHTING_TIME_IDS = Object.freeze(['+12', '+14', '+16']);
export const BOH_TEAM_NAME_PREFERENCES = Object.freeze([
  'iron-wolves',
  'storm-ravens',
  'ember-lions',
  'frost-bears',
  'night-falcons',
  'thunder-bulls',
]);
export const BOH_ENTRY_METHODS = Object.freeze(['manual', 'ocr']);
export const BOH_AVAILABILITY_VALUES = Object.freeze(['all', 'most', 'backup']);
export const BOH_EPIC_SHOWDOWN_LANES = Object.freeze(['south', 'center', 'north']);
export const BOH_EPIC_SHOWDOWN_DEFAULT_TIME_SLOT_IDS = Object.freeze([
  '+6',
  '+8',
  '+10',
  '+12',
  '+14',
  '+16',
  '+18',
  '+20',
]);
export const BOH_EPIC_FLEXIBILITY_PREFERENCES = Object.freeze([
  'change-roles',
  'change-times',
  'fixed',
]);
export const BOH_PREFERRED_ROLES = Object.freeze([
  'flexible',
  'offensive',
  'rune',
  'top',
  'bottom',
  'backup',
]);

const SCORE_POWER_FIELDS = Object.freeze([
  'totalCastlePower',
  'troopPower',
  'buildingPower',
  'technologyPower',
  'heroCombatPower',
  'dragonPower',
]);

const SCORE_BONUS_FIELDS = Object.freeze([
  't9TroopType',
  'readySpeedHero',
  'level50Hero',
  'bohUsefulRating',
]);

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

/**
 * Versioned reconstruction of the scoring formula used by the 2025 Google
 * Form/Main sheet. Call `createBohScoringProfile()` to obtain an editable copy.
 */
export const BOH_2025_SCORING_PROFILE = deepFreeze({
  id: 'all-star-boh-2025-v1',
  version: 1,
  label: '2025 All-Star BoH legacy formula',
  powerDivisor: 1000,
  precision: 3,
  powerWeights: {
    totalCastlePower: 0,
    troopPower: 0.05,
    buildingPower: 0.3,
    technologyPower: 0.7,
    heroCombatPower: 0.8,
    dragonPower: 1,
  },
  bonusWeights: {
    t9TroopType: 3000,
    readySpeedHero: 2500,
    level50Hero: 750,
    bohUsefulRating: 1000,
  },
});

export const BOH_DEFAULT_ROLE_GROUPS = deepFreeze([
  { id: 'offensive', label: 'Offensive Team', capacity: 4, order: 1 },
  { id: 'rune', label: 'Rune Team', capacity: 2, order: 2 },
  { id: 'top', label: 'Top Side', capacity: 3, order: 3 },
  { id: 'bottom', label: 'Bottom Side', capacity: 3, order: 4 },
]);

export const BOH_DEFAULT_PHASES = deepFreeze([
  { id: 'phase-0-5', label: '0–5 Minutes', startMinute: 0, endMinute: 5, order: 1 },
  { id: 'phase-5-10', label: '5–10 Minutes', startMinute: 5, endMinute: 10, order: 2 },
  { id: 'phase-10-15', label: '10–15 Minutes', startMinute: 10, endMinute: 15, order: 3 },
  { id: 'phase-15-30', label: '15–30 Minutes', startMinute: 15, endMinute: 30, order: 4 },
]);

export const BOH_DEFAULT_LEGIONS = deepFreeze([
  { id: 'legion-1', label: 'Legion 1', order: 1 },
  { id: 'legion-2', label: 'Legion 2', order: 2 },
]);

function modelError(code, details = {}) {
  const error = new Error(code);
  error.code = code;
  Object.assign(error, details);
  return error;
}

function asText(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .replace(/\p{Cc}/gu, '')
    .trim();
}

/** Preserve the player's Unicode spelling while making compatibility forms stable. */
export function normalizeBohName(value) {
  return asText(value).replace(/\s+/gu, ' ');
}

export function normalizeBohNameKey(value) {
  return normalizeBohName(value).toLocaleLowerCase('en');
}

function normalizeBohId(value, fallback = '') {
  const normalized = asText(value)
    .replace(/[\\/]+/g, '-')
    .replace(/\s+/gu, '-')
    .slice(0, 160);
  return normalized || fallback;
}

function compareText(left, right) {
  const a = String(left ?? '');
  const b = String(right ?? '');
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

function stableTextHash(value) {
  // Two independent 32-bit FNV-style lanes keep browser support broad while
  // making generated IDs stable for every UTF-16/Unicode game name.
  let first = 0x811c9dc5;
  let second = 0x9e3779b9;
  const text = String(value ?? '');
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    first ^= code;
    first = Math.imul(first, 0x01000193);
    second ^= code + index;
    second = Math.imul(second, 0x85ebca6b);
  }
  return `${(first >>> 0).toString(36).padStart(7, '0')}${(second >>> 0)
    .toString(36)
    .padStart(7, '0')}`;
}

export function createBohPlayerId(name, discriminator = '') {
  const nameKey = normalizeBohNameKey(name);
  const discriminatorKey = normalizeBohNameKey(discriminator);
  if (!nameKey && !discriminatorKey) throw modelError('boh_player_identity_required');
  return `boh-player-${stableTextHash(`${nameKey}|${discriminatorKey}`)}`;
}

function normalizeNumericText(value) {
  return asText(value)
    .replace(/[\u0660-\u0669]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[\u06f0-\u06f9]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0))
    .replace(/\u066b/g, '.')
    .replace(/[\u066c,_\s]/g, '');
}

function finiteNumber(value, fallback = 0) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;
  const normalized = normalizeNumericText(value);
  if (!normalized) return fallback;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function nonNegativeNumber(value) {
  return Math.max(0, finiteNumber(value));
}

function nonNegativeInteger(value) {
  return Math.max(0, Math.trunc(finiteNumber(value)));
}

function boundedInteger(value, fallback, min, max) {
  const parsed = Math.trunc(finiteNumber(value, fallback));
  return Math.max(min, Math.min(max, parsed));
}

function normalizeStringList(value, options = {}) {
  let entries;
  if (Array.isArray(value)) entries = value;
  else if (value instanceof Set) entries = [...value];
  else if (typeof value === 'string') entries = value.split(/[,;|\n]+/u);
  else entries = value === undefined || value === null ? [] : [value];

  const ignored = new Set((options.ignore || []).map(normalizeBohNameKey));
  const seen = new Set();
  return entries.map(normalizeBohName).filter((entry) => {
    const key = normalizeBohNameKey(entry);
    if (!key || ignored.has(key) || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeTroopRoster(value) {
  const values = Array.isArray(value) ? value : [];
  if (values.length > 60)
    throw modelError('boh_signup_list_too_long', { field: 'troopRoster', maxItems: 60 });
  const seen = new Set();
  return values
    .map((entry) => String(entry || '').trim())
    .filter((entry) => {
      if (
        !/^(?:(?:footmen|cavalry|archers)\|(?:SSS|SS|S|X|IX|VIII|VII|VI|V|IV|III|II|I)\|(?:normal|enhanced)|estimate\|(?:lofty|enhanced-t10|t10|t9))\|\d{1,10}$/u.test(
          entry
        )
      ) {
        throw modelError('boh_signup_catalog_value_invalid', { field: 'troopRoster' });
      }
      if (seen.has(entry)) return false;
      seen.add(entry);
      return true;
    });
}

function normalizePlanningCatalog(value, field, options = {}) {
  if (value === undefined) return null;
  if (!Array.isArray(value)) throw modelError('boh_signup_catalog_invalid', { field });
  const catalog = normalizeStringList(value);
  if (options.maxItems && catalog.length > options.maxItems) {
    throw modelError('boh_signup_catalog_too_long', { field, maxItems: options.maxItems });
  }
  catalog.forEach((entry) => {
    if (Array.from(entry).length > 160) {
      throw modelError('boh_signup_field_too_long', { field, maxLength: 160 });
    }
  });
  return catalog;
}

function normalizeCatalogSelection(value, catalog, field, maxItems) {
  const selection = normalizeStringList(value);
  if (selection.length > maxItems) {
    throw modelError('boh_signup_list_too_long', { field, maxItems });
  }
  selection.forEach((entry) => {
    if (Array.from(entry).length > 160) {
      throw modelError('boh_signup_field_too_long', { field, maxLength: 160 });
    }
  });
  if (catalog === null) return selection;
  const catalogByKey = new Map(catalog.map((entry) => [normalizeBohNameKey(entry), entry]));
  const selectedKeys = new Set();
  selection.forEach((entry) => {
    const key = normalizeBohNameKey(entry);
    if (!catalogByKey.has(key)) throw modelError('boh_signup_catalog_value_invalid', { field });
    selectedKeys.add(key);
  });
  return catalog.filter((entry) => selectedKeys.has(normalizeBohNameKey(entry)));
}

function normalizeResearchProgress(value, catalog) {
  if (value === undefined || value === null) return {};
  const prototype = typeof value === 'object' && value ? Object.getPrototypeOf(value) : null;
  if (
    typeof value !== 'object' ||
    Array.isArray(value) ||
    (prototype !== Object.prototype && prototype !== null)
  ) {
    throw modelError('boh_signup_research_progress_invalid');
  }
  const sourceEntries = Object.entries(value);
  const sourceByKey = new Map();
  sourceEntries.forEach(([rawId, rawValue]) => {
    const id = normalizeBohName(rawId);
    if (!id || Array.from(id).length > 160) {
      throw modelError('boh_signup_research_tree_invalid', { researchTreeId: rawId });
    }
    const key = normalizeBohNameKey(id);
    if (['__proto__', 'prototype', 'constructor'].includes(key)) {
      throw modelError('boh_signup_research_tree_invalid', { researchTreeId: id });
    }
    if (sourceByKey.has(key)) {
      throw modelError('boh_signup_research_tree_duplicate', { researchTreeId: id });
    }
    sourceByKey.set(key, rawValue);
  });

  const orderedIds = catalog === null ? sourceEntries.map(([id]) => normalizeBohName(id)) : catalog;
  if (catalog !== null) {
    const allowedKeys = new Set(catalog.map(normalizeBohNameKey));
    for (const key of sourceByKey.keys()) {
      if (!allowedKeys.has(key)) {
        throw modelError('boh_signup_research_tree_invalid');
      }
    }
  }

  const progress = {};
  orderedIds.forEach((researchTreeId) => {
    const rawValue = sourceByKey.get(normalizeBohNameKey(researchTreeId));
    if (
      rawValue === undefined ||
      rawValue === null ||
      (typeof rawValue === 'string' && !rawValue.trim())
    ) {
      return;
    }
    const normalizedValue =
      typeof rawValue === 'number' ? rawValue : Number(normalizeNumericText(rawValue));
    if (!Number.isInteger(normalizedValue) || normalizedValue < 0 || normalizedValue > 100) {
      throw modelError('boh_signup_research_progress_invalid', { researchTreeId });
    }
    progress[researchTreeId] = normalizedValue;
  });
  return progress;
}

function normalizeFightingTimeIds(value, options = {}) {
  const requested = normalizeStringList(value);
  const allowedByKey = new Map(
    BOH_FIGHTING_TIME_IDS.map((timeId) => [normalizeBohNameKey(timeId), timeId])
  );
  const selectedKeys = new Set();
  requested.forEach((timeId) => {
    const key = normalizeBohNameKey(timeId);
    if (!allowedByKey.has(key)) {
      throw modelError('boh_signup_fighting_time_invalid', { timeId });
    }
    selectedKeys.add(key);
  });
  const normalized = BOH_FIGHTING_TIME_IDS.filter((timeId) =>
    selectedKeys.has(normalizeBohNameKey(timeId))
  );
  if (normalized.length === 0 && options.allowLegacyEmpty) return normalized;
  if (normalized.length !== 2) {
    throw modelError('boh_signup_fighting_times_required', { required: 2 });
  }
  return normalized;
}

function normalizePreferredTeammates(value, ownName = '') {
  const preferredTeammates = normalizeStringList(value, { ignore: [ownName] });
  if (preferredTeammates.length > BOH_MAX_PREFERRED_TEAMMATES) {
    throw modelError('boh_signup_list_too_long', {
      field: 'preferredTeammates',
      maxItems: BOH_MAX_PREFERRED_TEAMMATES,
    });
  }
  preferredTeammates.forEach((name) => {
    if (Array.from(name).length > 160) {
      throw modelError('boh_signup_field_too_long', {
        field: 'preferredTeammates',
        maxLength: 160,
      });
    }
  });
  return preferredTeammates;
}

function normalizeEpicTimeSlotCatalog(value = BOH_EPIC_SHOWDOWN_DEFAULT_TIME_SLOT_IDS) {
  const entries = normalizeStringList(value);
  if (entries.length > 24) {
    throw modelError('boh_epic_time_slot_catalog_too_long', { maxItems: 24 });
  }
  entries.forEach((timeSlotId) => {
    if (Array.from(timeSlotId).length > 40 || !/^[A-Za-z0-9_+.:/-]+$/u.test(timeSlotId)) {
      throw modelError('boh_epic_time_slot_invalid', { timeSlotId });
    }
  });
  return entries;
}

/** Normalize the selectable Epic Showdown time IDs supplied by season config. */
export function normalizeBohEpicShowdownTimeSlotIds(
  value = BOH_EPIC_SHOWDOWN_DEFAULT_TIME_SLOT_IDS
) {
  return normalizeEpicTimeSlotCatalog(value);
}

/**
 * Canonical, independent Epic Showdown availability. It is deliberately not
 * part of the All-Star signup so changing it cannot affect signup review state.
 */
export function normalizeBohEpicShowdownPreferences(input = {}, options = {}) {
  const source = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const gameName = normalizeBohName(
    firstDefined(source.gameName, source.accountName, source.playerName)
  );
  if (!gameName) throw modelError('boh_epic_game_name_required');
  if (Array.from(gameName).length > 160) {
    throw modelError('boh_epic_game_name_too_long', { maxLength: 160 });
  }
  const configuredTimeSlotIds = normalizeEpicTimeSlotCatalog(
    options.timeSlotIds === undefined
      ? BOH_EPIC_SHOWDOWN_DEFAULT_TIME_SLOT_IDS
      : options.timeSlotIds
  );
  const allowedLanes = new Set(BOH_EPIC_SHOWDOWN_LANES);
  const lanePreferences = normalizeStringList(source.lanePreferences).map((lane) =>
    lane.toLocaleLowerCase('en')
  );
  if (!lanePreferences.length) {
    throw modelError('boh_epic_lane_required', { field: 'lanePreferences' });
  }
  lanePreferences.forEach((lane) => {
    if (!allowedLanes.has(lane)) throw modelError('boh_epic_lane_invalid', { lane });
  });

  const configuredTimesByKey = new Map(
    configuredTimeSlotIds.map((timeSlotId) => [timeSlotId.toLocaleLowerCase('en'), timeSlotId])
  );
  const timePreferences = normalizeStringList(source.timePreferences).map((timeSlotId) => {
    const configured = configuredTimesByKey.get(timeSlotId.toLocaleLowerCase('en'));
    if (!configured) {
      throw modelError('boh_epic_time_slot_not_configured', { timeSlotId });
    }
    return configured;
  });
  if (!timePreferences.length) {
    throw modelError('boh_epic_time_required', { field: 'timePreferences' });
  }
  const flexibilityPreference = normalizedEnum(
    source.flexibilityPreference,
    BOH_EPIC_FLEXIBILITY_PREFERENCES,
    '',
    'flexibilityPreference'
  );
  return {
    schemaVersion: BOH_EPIC_SHOWDOWN_SCHEMA_VERSION,
    gameName,
    lanePreferences,
    timePreferences,
    ...(flexibilityPreference ? { flexibilityPreference } : {}),
  };
}

function firstDefined(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== '');
}

function boundedPlainText(value, maxLength, field, options = {}) {
  if (value === undefined || value === null) return '';
  let normalized = String(value).normalize('NFKC').replace(/\r\n?/g, '\n');
  normalized = normalized.replace(/\p{Cc}/gu, (character) => {
    if (options.multiline && character === '\n') return '\n';
    return ' ';
  });
  normalized = options.multiline
    ? normalized
        .split('\n')
        .map((line) => line.replace(/\s+/gu, ' ').trim())
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
    : normalized.replace(/\s+/gu, ' ').trim();
  if (Array.from(normalized).length > maxLength) {
    throw modelError('boh_signup_field_too_long', { field, maxLength });
  }
  return normalized;
}

function normalizedEnum(value, allowed, fallback, field) {
  const normalized = asText(value || fallback).toLocaleLowerCase('en');
  if (!normalized) return fallback;
  if (!allowed.includes(normalized)) {
    throw modelError('boh_signup_enum_invalid', { field, value: normalized });
  }
  return normalized;
}

function optionalBoolean(value, field) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'boolean') return value;
  if (value === 1) return true;
  if (value === 0) return false;
  const normalized = asText(value).toLocaleLowerCase('en');
  if (['true', 'yes', 'on', '1'].includes(normalized)) return true;
  if (['false', 'no', 'off', '0'].includes(normalized)) return false;
  throw modelError('boh_signup_boolean_invalid', { field });
}

function timestampOrNull(value) {
  if (value === undefined || value === null || value === '') return null;
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.getTime() : null;
  if (typeof value?.toMillis === 'function') {
    const milliseconds = Number(value.toMillis());
    return Number.isFinite(milliseconds) ? Math.trunc(milliseconds) : null;
  }
  const numeric = Number(value);
  if (Number.isFinite(numeric)) return Math.trunc(numeric);
  const parsed = Date.parse(String(value));
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Canonical structured submission. Image payloads and OCR transport fields are
 * deliberately not copied into this result.
 */
export function normalizeBohSignup(input = {}, options = {}) {
  const rawStats = input.stats && typeof input.stats === 'object' ? input.stats : input;
  const rawCommitment =
    input.commitment && typeof input.commitment === 'object' ? input.commitment : {};
  const gameName = normalizeBohName(
    firstDefined(input.gameName, input.playerName, input.name, rawStats.gameName)
  );
  const explicitId = normalizeBohId(firstDefined(input.playerId, input.id, input.uid));
  if (!gameName && !explicitId && !options.allowPartial) {
    throw modelError('boh_player_identity_required');
  }
  const playerId =
    explicitId ||
    (gameName
      ? createBohPlayerId(gameName, firstDefined(input.identityDiscriminator, input.server))
      : '');
  const displayName = gameName || explicitId;
  const t9TroopTypes = normalizeStringList(
    firstDefined(rawStats.t9TroopTypes, input.t9TroopTypes, rawStats.t9Types),
    { ignore: ['none', 'no t9', 't8', 'n/a'] }
  );
  const t10TroopTypes = normalizeStringList(
    firstDefined(rawStats.t10TroopTypes, input.t10TroopTypes, rawStats.t10Types),
    { ignore: ['none', 'all', 'n/a'] }
  );
  const troopRoster = normalizeTroopRoster(firstDefined(rawStats.troopRoster, input.troopRoster));
  const readySpeedHeroes = normalizeStringList(
    firstDefined(rawStats.readySpeedHeroes, input.readySpeedHeroes, rawStats.speedHeroes),
    { ignore: ['none', 'n/a'] }
  );
  const heroNames = normalizePlanningCatalog(options.heroNames, 'heroNames', {
    maxItems: BOH_MAX_USABLE_HERO_NAMES,
  });
  const usableHeroNames = normalizeCatalogSelection(
    firstDefined(rawStats.usableHeroNames, input.usableHeroNames),
    heroNames,
    'usableHeroNames',
    BOH_MAX_USABLE_HERO_NAMES
  );
  const researchTreeIds = normalizePlanningCatalog(options.researchTreeIds, 'researchTreeIds');
  const researchProgressPct = normalizeResearchProgress(
    firstDefined(rawStats.researchProgressPct, input.researchProgressPct),
    researchTreeIds
  );
  const knownNames = normalizeStringList([
    displayName,
    ...(Array.isArray(input.knownNames) ? input.knownNames : []),
    ...(Array.isArray(input.aliases) ? input.aliases : []),
  ]);
  const preferredTeammates = normalizePreferredTeammates(
    firstDefined(input.preferredTeammates, rawCommitment.preferredTeammates),
    displayName
  );
  const preferredRole = normalizedEnum(
    firstDefined(input.preferredRole, rawCommitment.preferredRole, rawCommitment.role),
    BOH_PREFERRED_ROLES,
    '',
    'preferredRole'
  );
  const secondaryRole = normalizedEnum(
    firstDefined(input.secondaryRole, rawCommitment.secondaryRole),
    BOH_PREFERRED_ROLES,
    '',
    'secondaryRole'
  );
  const rolePreferences = normalizeStringList(
    firstDefined(input.rolePreferences, rawStats.rolePreferences)
  ).map((role) => normalizeBohId(role));
  if (!rolePreferences.length && preferredRole) rolePreferences.push(preferredRole);
  if (secondaryRole && !rolePreferences.includes(secondaryRole))
    rolePreferences.push(secondaryRole);
  const eligibleRoleIds = normalizeStringList(
    firstDefined(input.eligibleRoleIds, input.eligibleRoles, rawStats.eligibleRoleIds)
  ).map((role) => normalizeBohId(role));
  const fightingTimeIds = normalizeFightingTimeIds(
    firstDefined(input.fightingTimeIds, rawCommitment.fightingTimeIds),
    { allowLegacyEmpty: options.requireFightingTimeIds !== true }
  );

  return {
    schemaVersion: BOH_SIGNUP_SCHEMA_VERSION,
    playerId,
    gameName: displayName,
    knownNames,
    preferredTeammates,
    locale: boundedPlainText(input.locale, 20, 'locale'),
    timezone: boundedPlainText(input.timezone, 80, 'timezone'),
    entryMethod: normalizedEnum(input.entryMethod, BOH_ENTRY_METHODS, 'manual', 'entryMethod'),
    stats: {
      totalCastlePower: nonNegativeNumber(
        firstDefined(rawStats.totalCastlePower, rawStats.totalPower, input.totalCastlePower)
      ),
      troopPower: nonNegativeNumber(firstDefined(rawStats.troopPower, input.troopPower)),
      buildingPower: nonNegativeNumber(firstDefined(rawStats.buildingPower, input.buildingPower)),
      technologyPower: nonNegativeNumber(
        firstDefined(rawStats.technologyPower, rawStats.techPower, input.technologyPower)
      ),
      heroCombatPower: nonNegativeNumber(
        firstDefined(rawStats.heroCombatPower, rawStats.heroPower, input.heroCombatPower)
      ),
      dragonPower: nonNegativeNumber(
        firstDefined(rawStats.dragonPower, rawStats.dragonsPower, input.dragonPower)
      ),
      unitSpecialtyPower: nonNegativeNumber(
        firstDefined(rawStats.unitSpecialtyPower, rawStats.specialtyPower)
      ),
      ...(rawStats.artifactPower == null
        ? {}
        : { artifactPower: nonNegativeNumber(rawStats.artifactPower) }),
      ...(rawStats.royalTechPower == null
        ? {}
        : { royalTechPower: nonNegativeNumber(rawStats.royalTechPower) }),
      t9TroopTypes,
      t10TroopTypes,
      troopRoster,
      readySpeedHeroes,
      usableHeroNames,
      researchProgressPct,
      level50HeroCount: Array.isArray(rawStats.level50Heroes)
        ? rawStats.level50Heroes.length
        : nonNegativeInteger(
            firstDefined(
              rawStats.level50HeroCount,
              rawStats.numberOfLevel50Heroes,
              input.level50HeroCount
            )
          ),
      rocLevel: nonNegativeInteger(firstDefined(rawStats.rocLevel, input.rocLevel)),
    },
    rolePreferences,
    eligibleRoleIds,
    commitment: {
      availability: normalizedEnum(
        firstDefined(input.availability, rawCommitment.availability),
        BOH_AVAILABILITY_VALUES,
        '',
        'availability'
      ),
      preferredRole,
      secondaryRole,
      canHelpLead: optionalBoolean(
        firstDefined(input.canHelpLead, rawCommitment.canHelpLead),
        'canHelpLead'
      ),
      vts1097Member: optionalBoolean(
        firstDefined(input.vts1097Member, rawCommitment.vts1097Member),
        'vts1097Member'
      ),
      contactNumber: boundedPlainText(
        firstDefined(input.contactNumber, rawCommitment.contactNumber),
        160,
        'contactNumber'
      ),
      currentState: boundedPlainText(
        firstDefined(input.currentState, rawCommitment.currentState),
        160,
        'currentState'
      ),
      joinReason: boundedPlainText(
        firstDefined(input.joinReason, rawCommitment.joinReason),
        1000,
        'joinReason',
        { multiline: true }
      ),
      fightingTimeIds,
      teamNamePreferences: normalizeCatalogSelection(
        firstDefined(input.teamNamePreferences, rawCommitment.teamNamePreferences),
        BOH_TEAM_NAME_PREFERENCES,
        'teamNamePreferences',
        BOH_TEAM_NAME_PREFERENCES.length
      ),
      unavailableTimes: boundedPlainText(
        firstDefined(input.unavailableTimes, rawCommitment.unavailableTimes),
        800,
        'unavailableTimes'
      ),
      canTeleport: optionalBoolean(
        firstDefined(input.canTeleport, rawCommitment.canTeleport),
        'canTeleport'
      ),
      canUseVoice: optionalBoolean(
        firstDefined(input.canUseVoice, rawCommitment.canUseVoice),
        'canUseVoice'
      ),
      planCommitment: optionalBoolean(
        firstDefined(input.planCommitment, rawCommitment.planCommitment),
        'planCommitment'
      ),
      notes: boundedPlainText(
        firstDefined(input.playerNotes, rawCommitment.notes, rawCommitment.playerNotes),
        2000,
        'playerNotes',
        { multiline: true }
      ),
    },
    submittedAtMs: timestampOrNull(firstDefined(input.submittedAtMs, input.submittedAt)),
  };
}

export function createBohScoringProfile(overrides = {}) {
  const source = overrides && typeof overrides === 'object' ? overrides : {};
  const base = BOH_2025_SCORING_PROFILE;
  const powerWeights = {};
  SCORE_POWER_FIELDS.forEach((field) => {
    powerWeights[field] = finiteNumber(
      source.powerWeights?.[field] ?? source.weights?.[field],
      base.powerWeights[field]
    );
  });
  const bonusWeights = {};
  SCORE_BONUS_FIELDS.forEach((field) => {
    bonusWeights[field] = finiteNumber(
      source.bonusWeights?.[field] ?? source.weights?.[field],
      base.bonusWeights[field]
    );
  });
  const powerDivisor = finiteNumber(source.powerDivisor, base.powerDivisor);
  if (!(powerDivisor > 0)) throw modelError('boh_score_power_divisor_invalid');
  return {
    id: normalizeBohId(source.id, base.id),
    version: Math.max(1, nonNegativeInteger(source.version || base.version)),
    label: normalizeBohName(source.label || base.label),
    powerDivisor,
    precision: boundedInteger(source.precision, base.precision, 0, 6),
    powerWeights,
    bonusWeights,
  };
}

export const normalizeBohScoringProfile = createBohScoringProfile;

function roundScore(value, precision) {
  const factor = 10 ** precision;
  return Math.round((finiteNumber(value) + Number.EPSILON) * factor) / factor;
}

function adminUsefulnessRating(options = {}) {
  if (options.adminUsefulnessRating === undefined || options.adminUsefulnessRating === null) {
    return 0;
  }
  const rating = finiteNumber(options.adminUsefulnessRating, Number.NaN);
  if (!Number.isFinite(rating) || rating < 0 || rating > 100) {
    throw modelError('boh_admin_usefulness_rating_invalid');
  }
  return rating;
}

export function scoreBohSignup(input, profileInput = BOH_2025_SCORING_PROFILE, options = {}) {
  const signup = normalizeBohSignup(input, options);
  const profile = createBohScoringProfile(profileInput);
  const breakdown = {};

  SCORE_POWER_FIELDS.forEach((field) => {
    const sourceValue = signup.stats[field];
    const weight = profile.powerWeights[field];
    breakdown[field] = {
      input: sourceValue,
      weight,
      divisor: profile.powerDivisor,
      points: roundScore((sourceValue * weight) / profile.powerDivisor, profile.precision),
    };
  });

  const bonusInputs = {
    t9TroopType: signup.stats.t10TroopTypes?.length || signup.stats.t9TroopTypes.length,
    readySpeedHero: signup.stats.readySpeedHeroes.length,
    level50Hero: signup.stats.level50HeroCount,
    // This value is intentionally accepted only through the admin scorer call.
    // Player submissions never own or normalize a usefulness adjustment.
    bohUsefulRating: adminUsefulnessRating(options),
  };
  SCORE_BONUS_FIELDS.forEach((field) => {
    const sourceValue = bonusInputs[field];
    const weight = profile.bonusWeights[field];
    breakdown[field] = {
      input: sourceValue,
      weight,
      points: roundScore(sourceValue * weight, profile.precision),
    };
  });

  const powerSubtotal = roundScore(
    SCORE_POWER_FIELDS.reduce((total, field) => total + breakdown[field].points, 0),
    profile.precision
  );
  const bonusSubtotal = roundScore(
    SCORE_BONUS_FIELDS.reduce((total, field) => total + breakdown[field].points, 0),
    profile.precision
  );
  return {
    profileId: profile.id,
    profileVersion: profile.version,
    precision: profile.precision,
    breakdown,
    powerSubtotal,
    bonusSubtotal,
    total: roundScore(powerSubtotal + bonusSubtotal, profile.precision),
  };
}

export function normalizeBohRoleGroups(input = BOH_DEFAULT_ROLE_GROUPS, options = {}) {
  const rosterSize = Math.max(1, nonNegativeInteger(options.rosterSize || BOH_TEAM_SIZE));
  const source = Array.isArray(input) && input.length ? input : BOH_DEFAULT_ROLE_GROUPS;
  const seen = new Set();
  const groups = source
    .map((entry, index) => {
      const candidate =
        typeof entry === 'string' ? { id: entry, label: entry, capacity: 1 } : entry || {};
      const label = normalizeBohName(candidate.label || candidate.name || candidate.id);
      const id = normalizeBohId(candidate.id || label, `role-${index + 1}`);
      const capacity = nonNegativeInteger(candidate.capacity ?? candidate.seats ?? 0);
      if (!label) throw modelError('boh_role_label_required', { roleId: id });
      if (!capacity) throw modelError('boh_role_capacity_invalid', { roleId: id });
      if (seen.has(id)) throw modelError('boh_role_id_duplicate', { roleId: id });
      seen.add(id);
      return {
        id,
        label,
        capacity,
        order: finiteNumber(candidate.order, index + 1),
      };
    })
    .sort((left, right) => left.order - right.order || compareText(left.id, right.id));
  const seatCount = groups.reduce((total, group) => total + group.capacity, 0);
  if (seatCount !== rosterSize) {
    throw modelError('boh_role_capacity_total_invalid', {
      expected: rosterSize,
      actual: seatCount,
    });
  }
  return groups;
}

export function createBohSeatTemplate(roleGroups = BOH_DEFAULT_ROLE_GROUPS, options = {}) {
  const groups = normalizeBohRoleGroups(roleGroups, options);
  const seats = [];
  groups.forEach((group) => {
    for (let roleSeat = 1; roleSeat <= group.capacity; roleSeat += 1) {
      seats.push({
        seatNumber: seats.length + 1,
        roleGroupId: group.id,
        roleLabel: group.label,
        roleSeat,
      });
    }
  });
  return seats;
}

function normalizedRoleIds(value) {
  return normalizeStringList(value).map((entry) => normalizeBohId(entry));
}

function coverageInputForPlayer(options, playerId) {
  const source = options.roleCoverage;
  if (source instanceof Map) return source.get(playerId);
  if (source && typeof source === 'object') return source[playerId];
  return undefined;
}

function normalizeBohDraftPlayer(input, options = {}) {
  const signupSource = input.signup
    ? {
        ...input.signup,
        playerId: firstDefined(input.playerId, input.id, input.signup.playerId, input.signup.id),
        gameName: firstDefined(
          input.gameName,
          input.name,
          input.signup.gameName,
          input.signup.name
        ),
      }
    : input;
  const signup = normalizeBohSignup(signupSource, options);
  const externalCoverage = coverageInputForPlayer(options, signup.playerId);
  const coverage = Array.isArray(externalCoverage)
    ? { eligibleRoleIds: externalCoverage }
    : externalCoverage && typeof externalCoverage === 'object'
      ? externalCoverage
      : {};
  const eligibleRoleIds = normalizedRoleIds(
    firstDefined(
      coverage.eligibleRoleIds,
      coverage.eligibleRoles,
      input.eligibleRoleIds,
      input.eligibleRoles,
      signup.eligibleRoleIds
    )
  );
  const rolePreferences = normalizedRoleIds(
    firstDefined(
      coverage.rolePreferences,
      coverage.preferredRoles,
      input.rolePreferences,
      signup.rolePreferences
    )
  );
  const suppliedBreakdown = input.scoreBreakdown || input.scoring || null;
  let score;
  let scoreBreakdown;
  if (input.score !== undefined && input.score !== null && input.score !== '') {
    score = finiteNumber(input.score);
    scoreBreakdown = suppliedBreakdown;
  } else if (suppliedBreakdown && Number.isFinite(Number(suppliedBreakdown.total))) {
    score = finiteNumber(suppliedBreakdown.total);
    scoreBreakdown = suppliedBreakdown;
  } else {
    scoreBreakdown = scoreBohSignup(signup, options.scoringProfile, options);
    score = scoreBreakdown.total;
  }
  return {
    playerId: signup.playerId,
    gameName: signup.gameName,
    signup,
    score,
    scoreBreakdown,
    eligibleRoleIds,
    rolePreferences,
  };
}

function normalizeTeamDefinitions(input, teamCount) {
  const source =
    Array.isArray(input) && input.length
      ? input
      : Array.from({ length: teamCount }, (_, index) => ({
          id: `team-${index + 1}`,
          label: `Team ${index + 1}`,
          number: index + 1,
        }));
  if (source.length !== teamCount) {
    throw modelError('boh_team_count_invalid', { expected: teamCount, actual: source.length });
  }
  const seen = new Set();
  return source.map((entry, index) => {
    const candidate = typeof entry === 'string' ? { id: entry, label: entry } : entry || {};
    const id = normalizeBohId(candidate.id || candidate.teamId, `team-${index + 1}`);
    if (seen.has(id)) throw modelError('boh_team_id_duplicate', { teamId: id });
    seen.add(id);
    return {
      id,
      label: normalizeBohName(candidate.label || candidate.name || `Team ${index + 1}`),
      number: nonNegativeInteger(candidate.number) || index + 1,
    };
  });
}

function lockEntries(input) {
  if (!input) return [];
  if (input instanceof Map) {
    return [...input.entries()].map(([playerId, value]) => ({ playerId, value }));
  }
  if (Array.isArray(input)) {
    return input.map((value) => ({ playerId: value?.playerId || value?.id, value }));
  }
  if (typeof input === 'object') {
    return Object.entries(input).map(([playerId, value]) => ({ playerId, value }));
  }
  throw modelError('boh_locked_assignments_invalid');
}

function normalizeLockedAssignments(input, teams, seatTemplate) {
  const teamById = new Map(teams.map((team) => [team.id, team]));
  const teamByNumber = new Map(teams.map((team) => [team.number, team]));
  const roleIds = new Set(seatTemplate.map((seat) => seat.roleGroupId));
  const locks = new Map();
  lockEntries(input).forEach(({ playerId: rawPlayerId, value }) => {
    const candidate =
      typeof value === 'string' || typeof value === 'number' ? { teamId: value } : value || {};
    const playerId = normalizeBohId(rawPlayerId || candidate.playerId || candidate.id);
    if (!playerId) throw modelError('boh_locked_player_required');
    if (locks.has(playerId)) throw modelError('boh_locked_player_duplicate', { playerId });
    const rawTeam = firstDefined(candidate.teamId, candidate.team, candidate.teamNumber);
    let team = teamById.get(normalizeBohId(rawTeam));
    if (!team && Number.isFinite(Number(rawTeam))) team = teamByNumber.get(Number(rawTeam));
    if (!team) throw modelError('boh_locked_team_unknown', { playerId, teamId: rawTeam });
    const seatNumber = candidate.seatNumber
      ? nonNegativeInteger(candidate.seatNumber)
      : candidate.seat
        ? nonNegativeInteger(candidate.seat)
        : null;
    if (seatNumber && !seatTemplate.some((seat) => seat.seatNumber === seatNumber)) {
      throw modelError('boh_locked_seat_unknown', { playerId, seatNumber });
    }
    const roleGroupId = candidate.roleGroupId
      ? normalizeBohId(candidate.roleGroupId)
      : candidate.roleId
        ? normalizeBohId(candidate.roleId)
        : null;
    if (roleGroupId && !roleIds.has(roleGroupId)) {
      throw modelError('boh_locked_role_unknown', { playerId, roleGroupId });
    }
    const seatRole = seatTemplate.find((seat) => seat.seatNumber === seatNumber)?.roleGroupId;
    if (seatRole && roleGroupId && seatRole !== roleGroupId) {
      throw modelError('boh_locked_seat_role_conflict', {
        playerId,
        seatNumber,
        roleGroupId,
      });
    }
    locks.set(playerId, {
      playerId,
      teamId: team.id,
      seatNumber,
      roleGroupId: roleGroupId || seatRole || null,
    });
  });
  return locks;
}

function rolePreferenceRank(player, roleGroupId) {
  const index = player.rolePreferences.indexOf(roleGroupId);
  return index < 0 ? player.rolePreferences.length + 1 : index;
}

function createDraftSlots(teams, seatTemplate) {
  return teams.flatMap((team, teamIndex) =>
    seatTemplate.map((seat) => ({
      ...seat,
      teamId: team.id,
      teamIndex,
      slotId: `${team.id}:${seat.seatNumber}`,
    }))
  );
}

function slotAllowedForPlayer(player, slot, lock, knownRoleIds) {
  if (lock?.teamId && lock.teamId !== slot.teamId) return false;
  if (lock?.seatNumber && lock.seatNumber !== slot.seatNumber) return false;
  if (lock?.roleGroupId && lock.roleGroupId !== slot.roleGroupId) return false;
  if (player.eligibleRoleIds.length) {
    const knownEligibility = player.eligibleRoleIds.filter((roleId) => knownRoleIds.has(roleId));
    if (!knownEligibility.includes(slot.roleGroupId)) return false;
  }
  return true;
}

function teamScoreTotals(slots, slotToPlayer, playersById, teamCount) {
  const totals = Array.from({ length: teamCount }, () => 0);
  slots.forEach((slot, index) => {
    const playerId = slotToPlayer[index];
    if (playerId) totals[slot.teamIndex] += playersById.get(playerId)?.score || 0;
  });
  return totals;
}

function optimizeDraftSwaps({ slots, slotToPlayer, playerToSlot, allowedSlots, playersById }) {
  const totalScore = [...playersById.values()].reduce((sum, player) => sum + player.score, 0);
  const mean = totalScore / BOH_TEAM_COUNT;
  const maxPasses = 2000;
  for (let pass = 0; pass < maxPasses; pass += 1) {
    const totals = teamScoreTotals(slots, slotToPlayer, playersById, BOH_TEAM_COUNT);
    let best = null;
    for (let leftIndex = 0; leftIndex < slots.length; leftIndex += 1) {
      const leftSlot = slots[leftIndex];
      const leftPlayerId = slotToPlayer[leftIndex];
      const leftPlayer = playersById.get(leftPlayerId);
      if (!leftPlayer) continue;
      for (let rightIndex = leftIndex + 1; rightIndex < slots.length; rightIndex += 1) {
        const rightSlot = slots[rightIndex];
        if (leftSlot.teamIndex === rightSlot.teamIndex) continue;
        const rightPlayerId = slotToPlayer[rightIndex];
        const rightPlayer = playersById.get(rightPlayerId);
        if (!rightPlayer) continue;
        if (!allowedSlots.get(leftPlayerId)?.has(rightIndex)) continue;
        if (!allowedSlots.get(rightPlayerId)?.has(leftIndex)) continue;

        const oldPenalty =
          (totals[leftSlot.teamIndex] - mean) ** 2 + (totals[rightSlot.teamIndex] - mean) ** 2;
        const leftNext = totals[leftSlot.teamIndex] - leftPlayer.score + rightPlayer.score;
        const rightNext = totals[rightSlot.teamIndex] - rightPlayer.score + leftPlayer.score;
        const newPenalty = (leftNext - mean) ** 2 + (rightNext - mean) ** 2;
        const improvement = oldPenalty - newPenalty;
        if (!(improvement > 1e-9)) continue;

        const currentPreference =
          rolePreferenceRank(leftPlayer, leftSlot.roleGroupId) +
          rolePreferenceRank(rightPlayer, rightSlot.roleGroupId);
        const nextPreference =
          rolePreferenceRank(leftPlayer, rightSlot.roleGroupId) +
          rolePreferenceRank(rightPlayer, leftSlot.roleGroupId);
        const candidate = {
          leftIndex,
          rightIndex,
          improvement,
          preferenceDelta: nextPreference - currentPreference,
          key: `${leftPlayerId}|${rightPlayerId}|${leftSlot.slotId}|${rightSlot.slotId}`,
        };
        if (
          !best ||
          candidate.improvement > best.improvement + 1e-9 ||
          (Math.abs(candidate.improvement - best.improvement) <= 1e-9 &&
            (candidate.preferenceDelta < best.preferenceDelta ||
              (candidate.preferenceDelta === best.preferenceDelta &&
                compareText(candidate.key, best.key) < 0)))
        ) {
          best = candidate;
        }
      }
    }
    if (!best) break;
    const leftPlayerId = slotToPlayer[best.leftIndex];
    const rightPlayerId = slotToPlayer[best.rightIndex];
    slotToPlayer[best.leftIndex] = rightPlayerId;
    slotToPlayer[best.rightIndex] = leftPlayerId;
    playerToSlot.set(leftPlayerId, best.rightIndex);
    playerToSlot.set(rightPlayerId, best.leftIndex);
  }
}

/**
 * Deterministically allocates exactly 72 unique players into six 12-seat teams.
 * `eligibleRoleIds` are hard constraints; `rolePreferences` are soft ordering.
 * Locked assignments may pin a player to a team, role, or exact seat.
 */
export function balanceBohTeams(playersInput = [], options = {}) {
  const teamCount = BOH_TEAM_COUNT;
  const rosterSize = BOH_TEAM_SIZE;
  if (!Array.isArray(playersInput) || playersInput.length !== BOH_FIELD_SIZE) {
    throw modelError('boh_field_size_invalid', {
      expected: BOH_FIELD_SIZE,
      actual: Array.isArray(playersInput) ? playersInput.length : 0,
    });
  }
  const roleGroups = normalizeBohRoleGroups(options.roleGroups, { rosterSize });
  const seatTemplate = createBohSeatTemplate(roleGroups, { rosterSize });
  const teams = normalizeTeamDefinitions(options.teams, teamCount);
  const players = playersInput.map((player) => normalizeBohDraftPlayer(player, options));
  const playersById = new Map();
  players.forEach((player) => {
    if (!player.playerId) throw modelError('boh_player_identity_required');
    if (playersById.has(player.playerId)) {
      throw modelError('boh_player_id_duplicate', { playerId: player.playerId });
    }
    playersById.set(player.playerId, player);
  });
  const locks = normalizeLockedAssignments(options.lockedAssignments, teams, seatTemplate);
  locks.forEach((lock, playerId) => {
    if (!playersById.has(playerId)) {
      throw modelError('boh_locked_player_unknown', { playerId });
    }
  });

  const knownRoleIds = new Set(roleGroups.map((group) => group.id));
  players.forEach((player) => {
    const unknown = player.eligibleRoleIds.filter((roleId) => !knownRoleIds.has(roleId));
    if (unknown.length) {
      throw modelError('boh_player_role_unknown', { playerId: player.playerId, roleIds: unknown });
    }
  });

  const slots = createDraftSlots(teams, seatTemplate);
  const allowedSlots = new Map();
  players.forEach((player) => {
    const lock = locks.get(player.playerId);
    const allowed = slots
      .map((slot, index) => ({ slot, index }))
      .filter(({ slot }) => slotAllowedForPlayer(player, slot, lock, knownRoleIds))
      .sort((left, right) => {
        const roleOrder =
          rolePreferenceRank(player, left.slot.roleGroupId) -
          rolePreferenceRank(player, right.slot.roleGroupId);
        return roleOrder || left.index - right.index;
      })
      .map(({ index }) => index);
    if (!allowed.length) {
      throw modelError('boh_player_has_no_available_seat', { playerId: player.playerId });
    }
    allowedSlots.set(player.playerId, new Set(allowed));
    player._orderedSlots = allowed;
  });

  const orderedPlayers = players.slice().sort((left, right) => {
    const constrained = left._orderedSlots.length - right._orderedSlots.length;
    if (constrained) return constrained;
    const preferenceCount = left.rolePreferences.length - right.rolePreferences.length;
    if (preferenceCount) return preferenceCount;
    const scoreOrder = right.score - left.score;
    return scoreOrder || compareText(left.playerId, right.playerId);
  });
  const slotToPlayer = Array.from({ length: slots.length }, () => null);
  const playerToSlot = new Map();

  function trySeat(player, seenSlots, seenPlayers) {
    if (seenPlayers.has(player.playerId)) return false;
    seenPlayers.add(player.playerId);
    for (const slotIndex of player._orderedSlots) {
      if (seenSlots.has(slotIndex)) continue;
      seenSlots.add(slotIndex);
      const occupantId = slotToPlayer[slotIndex];
      if (!occupantId) {
        slotToPlayer[slotIndex] = player.playerId;
        playerToSlot.set(player.playerId, slotIndex);
        return true;
      }
      const occupant = playersById.get(occupantId);
      if (occupant && trySeat(occupant, seenSlots, seenPlayers)) {
        slotToPlayer[slotIndex] = player.playerId;
        playerToSlot.set(player.playerId, slotIndex);
        return true;
      }
    }
    return false;
  }

  const unmatched = [];
  orderedPlayers.forEach((player) => {
    if (!trySeat(player, new Set(), new Set())) unmatched.push(player.playerId);
  });
  if (unmatched.length || playerToSlot.size !== players.length) {
    throw modelError('boh_role_coverage_unavailable', { unmatchedPlayerIds: unmatched });
  }

  optimizeDraftSwaps({ slots, slotToPlayer, playerToSlot, allowedSlots, playersById });

  const resultTeams = teams.map((team, teamIndex) => {
    const assignments = slots
      .map((slot, slotIndex) => ({ slot, slotIndex, playerId: slotToPlayer[slotIndex] }))
      .filter(({ slot }) => slot.teamIndex === teamIndex)
      .map(({ slot, playerId }) => {
        const player = playersById.get(playerId);
        return {
          playerId,
          gameName: player.gameName,
          score: player.score,
          scoreBreakdown: player.scoreBreakdown,
          signup: player.signup,
          seatNumber: slot.seatNumber,
          roleGroupId: slot.roleGroupId,
          roleLabel: slot.roleLabel,
          rolePreferred:
            !player.rolePreferences.length || player.rolePreferences.includes(slot.roleGroupId),
          locked: locks.has(playerId),
        };
      })
      .sort((left, right) => left.seatNumber - right.seatNumber);
    const totalScore = roundScore(
      assignments.reduce((total, assignment) => total + assignment.score, 0),
      3
    );
    return {
      ...team,
      players: assignments,
      totalScore,
      averageScore: roundScore(totalScore / rosterSize, 3),
    };
  });
  const totals = resultTeams.map((team) => team.totalScore);
  const meanTeamScore = roundScore(
    totals.reduce((total, score) => total + score, 0) / teamCount,
    3
  );
  const validation = validateBohTeamAssignments(resultTeams, {
    roleGroups,
    expectedPlayerIds: players.map((player) => player.playerId),
  });
  if (!validation.valid) {
    throw modelError('boh_balanced_result_invalid', { validation });
  }
  return {
    teamCount,
    rosterSize,
    fieldSize: BOH_FIELD_SIZE,
    roleGroups,
    teams: resultTeams,
    meanTeamScore,
    minTeamScore: Math.min(...totals),
    maxTeamScore: Math.max(...totals),
    scoreSpread: roundScore(Math.max(...totals) - Math.min(...totals), 3),
    validation,
  };
}

/** Return structured errors instead of accepting an incomplete or duplicate field. */
export function validateBohTeamAssignments(teamsInput = [], options = {}) {
  const errors = [];
  let roleGroups;
  try {
    roleGroups = normalizeBohRoleGroups(options.roleGroups, { rosterSize: BOH_TEAM_SIZE });
  } catch (error) {
    return {
      valid: false,
      errors: [{ code: error.code || 'boh_role_configuration_invalid' }],
      teamCount: Array.isArray(teamsInput) ? teamsInput.length : 0,
      playerCount: 0,
    };
  }
  const seatTemplate = createBohSeatTemplate(roleGroups);
  const expectedRoleBySeat = new Map(
    seatTemplate.map((seat) => [seat.seatNumber, seat.roleGroupId])
  );
  const teams = Array.isArray(teamsInput) ? teamsInput : [];
  if (teams.length !== BOH_TEAM_COUNT) {
    errors.push({ code: 'boh_team_count_invalid', expected: BOH_TEAM_COUNT, actual: teams.length });
  }
  const seenTeams = new Set();
  const seenPlayers = new Map();
  let playerCount = 0;
  teams.forEach((team, teamIndex) => {
    const teamId = normalizeBohId(team?.id || team?.teamId, `team-${teamIndex + 1}`);
    if (seenTeams.has(teamId)) errors.push({ code: 'boh_team_id_duplicate', teamId });
    seenTeams.add(teamId);
    const players = Array.isArray(team?.players)
      ? team.players
      : Array.isArray(team?.members)
        ? team.members
        : [];
    playerCount += players.length;
    if (players.length !== BOH_TEAM_SIZE) {
      errors.push({
        code: 'boh_team_size_invalid',
        teamId,
        expected: BOH_TEAM_SIZE,
        actual: players.length,
      });
    }
    const seenSeats = new Set();
    const roleCounts = new Map(roleGroups.map((group) => [group.id, 0]));
    players.forEach((player) => {
      const playerId = normalizeBohId(player?.playerId || player?.id || player?.signup?.playerId);
      if (!playerId) {
        errors.push({ code: 'boh_player_identity_required', teamId });
      } else if (seenPlayers.has(playerId)) {
        errors.push({
          code: 'boh_player_id_duplicate',
          playerId,
          teamId,
          firstTeamId: seenPlayers.get(playerId),
        });
      } else {
        seenPlayers.set(playerId, teamId);
      }
      const seatNumber = nonNegativeInteger(player?.seatNumber || player?.seat);
      if (!expectedRoleBySeat.has(seatNumber)) {
        errors.push({ code: 'boh_seat_number_invalid', teamId, playerId, seatNumber });
      } else if (seenSeats.has(seatNumber)) {
        errors.push({ code: 'boh_seat_number_duplicate', teamId, seatNumber });
      } else {
        seenSeats.add(seatNumber);
      }
      const expectedRole = expectedRoleBySeat.get(seatNumber);
      const roleGroupId = normalizeBohId(player?.roleGroupId || expectedRole);
      if (expectedRole && roleGroupId !== expectedRole) {
        errors.push({
          code: 'boh_seat_role_mismatch',
          teamId,
          playerId,
          seatNumber,
          expectedRole,
          actualRole: roleGroupId,
        });
      }
      if (roleCounts.has(roleGroupId)) {
        roleCounts.set(roleGroupId, roleCounts.get(roleGroupId) + 1);
      }
    });
    roleGroups.forEach((group) => {
      if (roleCounts.get(group.id) !== group.capacity) {
        errors.push({
          code: 'boh_role_coverage_invalid',
          teamId,
          roleGroupId: group.id,
          expected: group.capacity,
          actual: roleCounts.get(group.id),
        });
      }
    });
  });
  if (playerCount !== BOH_FIELD_SIZE) {
    errors.push({ code: 'boh_field_size_invalid', expected: BOH_FIELD_SIZE, actual: playerCount });
  }
  if (options.expectedPlayerIds) {
    const expected = new Set(options.expectedPlayerIds.map((value) => normalizeBohId(value)));
    expected.forEach((playerId) => {
      if (!seenPlayers.has(playerId)) errors.push({ code: 'boh_player_missing', playerId });
    });
    seenPlayers.forEach((_, playerId) => {
      if (!expected.has(playerId)) errors.push({ code: 'boh_player_unexpected', playerId });
    });
  }
  return {
    valid: errors.length === 0,
    errors,
    teamCount: teams.length,
    playerCount,
    uniquePlayerCount: seenPlayers.size,
  };
}

function normalizeJsonValue(value, depth = 0) {
  if (depth > 8 || value === undefined || typeof value === 'function') return undefined;
  if (value === null || typeof value === 'boolean') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value === 'string') return value.normalize('NFKC').trim();
  if (Array.isArray(value)) {
    return value
      .map((entry) => normalizeJsonValue(entry, depth + 1))
      .filter((entry) => entry !== undefined);
  }
  if (typeof value === 'object') {
    const output = {};
    Object.entries(value).forEach(([key, entry]) => {
      const safeKey = asText(key);
      const safeValue = normalizeJsonValue(entry, depth + 1);
      if (safeKey && safeValue !== undefined) output[safeKey] = safeValue;
    });
    return output;
  }
  return undefined;
}

function normalizeBohInstruction(value) {
  if (typeof value === 'string') return { summary: value.normalize('NFKC').trim() };
  const normalized = normalizeJsonValue(value);
  return normalized && typeof normalized === 'object' && !Array.isArray(normalized)
    ? normalized
    : {};
}

function normalizeBohPhases(input) {
  const source = Array.isArray(input) && input.length ? input : BOH_DEFAULT_PHASES;
  const seen = new Set();
  return source
    .map((entry, index) => {
      const candidate = entry || {};
      const startMinute = finiteNumber(candidate.startMinute ?? candidate.start, 0);
      const endMinute = finiteNumber(candidate.endMinute ?? candidate.end, startMinute);
      const id = normalizeBohId(candidate.id, `phase-${startMinute}-${endMinute}`);
      if (seen.has(id)) throw modelError('boh_phase_id_duplicate', { phaseId: id });
      if (!(endMinute > startMinute) || startMinute < 0) {
        throw modelError('boh_phase_range_invalid', { phaseId: id });
      }
      seen.add(id);
      return {
        id,
        label: normalizeBohName(candidate.label || `${startMinute}–${endMinute} Minutes`),
        startMinute,
        endMinute,
        order: finiteNumber(candidate.order, index + 1),
      };
    })
    .sort(
      (left, right) =>
        left.order - right.order ||
        left.startMinute - right.startMinute ||
        compareText(left.id, right.id)
    );
}

function normalizeBohLegions(input) {
  const source = Array.isArray(input) && input.length ? input : BOH_DEFAULT_LEGIONS;
  const seen = new Set();
  return source
    .map((entry, index) => {
      const candidate = typeof entry === 'string' ? { id: entry, label: entry } : entry || {};
      const id = normalizeBohId(candidate.id, `legion-${index + 1}`);
      if (seen.has(id)) throw modelError('boh_legion_id_duplicate', { legionId: id });
      seen.add(id);
      return {
        id,
        label: normalizeBohName(candidate.label || candidate.name || `Legion ${index + 1}`),
        order: finiteNumber(candidate.order, index + 1),
      };
    })
    .sort((left, right) => left.order - right.order || compareText(left.id, right.id));
}

function objectiveCoordinate(value, axis, objectiveId) {
  if (value === undefined || value === null || value === '') return null;
  const coordinate = Number(value);
  if (!Number.isFinite(coordinate) || coordinate < 0 || coordinate > 100) {
    throw modelError('boh_objective_coordinate_invalid', { objectiveId, axis });
  }
  return coordinate;
}

/** Normalize admin-authored schematic anchors without inventing map positions. */
export function normalizeBohObjectives(input = []) {
  if (!Array.isArray(input)) throw modelError('boh_objectives_invalid');
  if (input.length > 64) throw modelError('boh_objective_count_invalid', { maximum: 64 });
  const seen = new Set();
  return input.map((entry, index) => {
    const candidate = entry || {};
    const id = normalizeBohId(candidate.id || candidate.objectiveId, `objective-${index + 1}`);
    if (seen.has(id)) throw modelError('boh_objective_id_duplicate', { objectiveId: id });
    seen.add(id);
    const code = boundedPlainText(candidate.code, 24, 'objectiveCode');
    const label = boundedPlainText(
      candidate.label || candidate.name || code || id,
      120,
      'objectiveLabel'
    );
    return {
      id,
      code,
      label,
      type: boundedPlainText(candidate.type || candidate.kind || 'objective', 32, 'objectiveType'),
      x: objectiveCoordinate(candidate.x, 'x', id),
      y: objectiveCoordinate(candidate.y, 'y', id),
      order: finiteNumber(candidate.order, index + 1),
    };
  });
}

function ruleReference(value, known, type) {
  const id = normalizeBohId(value || '*', '*');
  if (id !== '*' && !known.has(id)) {
    throw modelError(`boh_${type}_unknown`, { [`${type}Id`]: id });
  }
  return id;
}

function normalizePlanRules(source, type, context) {
  if (!source) return [];
  const records = Array.isArray(source)
    ? source
    : Object.entries(source).map(([id, value]) => ({ id, ...(value || {}) }));
  return records.map((entry, index) => {
    const candidate = entry || {};
    const base = {
      id: normalizeBohId(candidate.id, `${type}-${index + 1}`),
      phaseId: ruleReference(
        candidate.phaseId || candidate.phase || '*',
        context.phaseIds,
        'phase'
      ),
      legionId: ruleReference(
        candidate.legionId || candidate.legion || '*',
        context.legionIds,
        'legion'
      ),
      teamId: candidate.teamId ? normalizeBohId(candidate.teamId) : '*',
      order: finiteNumber(candidate.order, index + 1),
      instruction: normalizeBohInstruction(
        candidate.instruction ?? candidate.instructions ?? candidate.content ?? candidate.text
      ),
    };
    if (type === 'role-default') {
      const roleGroupId = normalizeBohId(candidate.roleGroupId || candidate.roleId);
      if (!context.roleIds.has(roleGroupId)) {
        throw modelError('boh_role_unknown', { roleGroupId });
      }
      base.roleGroupId = roleGroupId;
    } else if (type === 'seat-override') {
      const seatNumber = nonNegativeInteger(candidate.seatNumber || candidate.seat);
      if (seatNumber < 1 || seatNumber > context.rosterSize) {
        throw modelError('boh_seat_number_invalid', { seatNumber });
      }
      base.seatNumber = seatNumber;
    } else if (type === 'player-override') {
      const playerId = normalizeBohId(candidate.playerId || candidate.id);
      if (!playerId) throw modelError('boh_player_identity_required');
      base.playerId = playerId;
    }
    return base;
  });
}

function normalizeRotations(source, context) {
  if (!source) return [];
  const records = Array.isArray(source) ? source : Object.values(source);
  return records.map((entry, index) => {
    const candidate = entry || {};
    const playerId = normalizeBohId(candidate.playerId || candidate.id);
    const seatNumber = nonNegativeInteger(
      candidate.seatNumber || candidate.targetSeatNumber || candidate.seat
    );
    if (!playerId) throw modelError('boh_rotation_player_required');
    if (seatNumber < 1 || seatNumber > context.rosterSize) {
      throw modelError('boh_rotation_seat_invalid', { playerId, seatNumber });
    }
    return {
      id: normalizeBohId(candidate.rotationId || candidate.id, `rotation-${index + 1}`),
      phaseId: ruleReference(
        candidate.phaseId || candidate.phase || '*',
        context.phaseIds,
        'phase'
      ),
      legionId: ruleReference(
        candidate.legionId || candidate.legion || '*',
        context.legionIds,
        'legion'
      ),
      teamId: candidate.teamId ? normalizeBohId(candidate.teamId) : '*',
      playerId,
      seatNumber,
      order: finiteNumber(candidate.order, index + 1),
    };
  });
}

/** Normalize and validate the admin-editable phase/Legion plan document. */
export function normalizeBohPlan(input = {}) {
  const roleGroups = normalizeBohRoleGroups(input.roleGroups);
  const phases = normalizeBohPhases(input.phases);
  const legions = normalizeBohLegions(input.legions);
  const objectives = normalizeBohObjectives(input.objectives);
  const context = {
    roleIds: new Set(roleGroups.map((role) => role.id)),
    phaseIds: new Set(phases.map((phase) => phase.id)),
    legionIds: new Set(legions.map((legion) => legion.id)),
    rosterSize: BOH_TEAM_SIZE,
  };
  const planId = normalizeBohId(input.id || input.planId, 'all-star-boh-plan');
  return {
    schemaVersion: BOH_PLAN_SCHEMA_VERSION,
    id: planId,
    label: normalizeBohName(input.label || input.name || 'All-Star BoH Team Plan'),
    roleGroups,
    phases,
    legions,
    objectives,
    roleDefaults: normalizePlanRules(
      input.roleDefaults || input.roleInstructions,
      'role-default',
      context
    ),
    instructions: normalizePlanRules(
      input.instructions || input.globalInstructions,
      'global',
      context
    ),
    seatOverrides: normalizePlanRules(input.seatOverrides, 'seat-override', context),
    playerOverrides: normalizePlanRules(input.playerOverrides, 'player-override', context),
    rotations: normalizeRotations(input.rotations, context),
  };
}

function ruleSpecificity(rule, context) {
  return (
    (rule.teamId === context.teamId ? 4 : 0) +
    (rule.phaseId === context.phaseId ? 2 : 0) +
    (rule.legionId === context.legionId ? 1 : 0)
  );
}

function ruleMatches(rule, context) {
  return (
    (rule.teamId === '*' || rule.teamId === context.teamId) &&
    (rule.phaseId === '*' || rule.phaseId === context.phaseId) &&
    (rule.legionId === '*' || rule.legionId === context.legionId)
  );
}

function matchingRules(rules, context, predicate) {
  return rules
    .filter((rule) => ruleMatches(rule, context) && predicate(rule))
    .sort(
      (left, right) =>
        ruleSpecificity(left, context) - ruleSpecificity(right, context) ||
        left.order - right.order ||
        compareText(left.id, right.id)
    );
}

function mergeInstructions(target, source) {
  const output = { ...target };
  Object.entries(source || {}).forEach(([key, value]) => {
    output[key] = normalizeJsonValue(value);
  });
  return output;
}

/**
 * Resolve one instruction with deterministic precedence:
 * global < role default < seat override < player override. Wildcards apply
 * before more specific phase, Legion, and team rules inside each layer.
 */
export function resolveBohInstruction(planInput, contextInput = {}) {
  const plan = normalizeBohPlan(planInput);
  const context = {
    teamId: normalizeBohId(contextInput.teamId, '*'),
    phaseId: normalizeBohId(contextInput.phaseId),
    legionId: normalizeBohId(contextInput.legionId),
    roleGroupId: normalizeBohId(contextInput.roleGroupId),
    seatNumber: nonNegativeInteger(contextInput.seatNumber),
    playerId: normalizeBohId(contextInput.playerId),
  };
  if (!plan.phases.some((phase) => phase.id === context.phaseId)) {
    throw modelError('boh_phase_unknown', { phaseId: context.phaseId });
  }
  if (!plan.legions.some((legion) => legion.id === context.legionId)) {
    throw modelError('boh_legion_unknown', { legionId: context.legionId });
  }
  const layers = [
    ['global', matchingRules(plan.instructions, context, () => true)],
    [
      'role',
      matchingRules(plan.roleDefaults, context, (rule) => rule.roleGroupId === context.roleGroupId),
    ],
    [
      'seat',
      matchingRules(plan.seatOverrides, context, (rule) => rule.seatNumber === context.seatNumber),
    ],
    [
      'player',
      matchingRules(plan.playerOverrides, context, (rule) => rule.playerId === context.playerId),
    ],
  ];
  let instruction = {};
  const sources = [];
  layers.forEach(([level, rules]) => {
    rules.forEach((rule) => {
      instruction = mergeInstructions(instruction, rule.instruction);
      sources.push({ level, ruleId: rule.id });
    });
  });
  return { instruction, sources };
}

function normalizedTeamAssignments(team, plan) {
  const source = Array.isArray(team?.players)
    ? team.players
    : Array.isArray(team?.members)
      ? team.members
      : [];
  const seatTemplate = createBohSeatTemplate(plan.roleGroups);
  const seatByNumber = new Map(seatTemplate.map((seat) => [seat.seatNumber, seat]));
  const seenPlayers = new Set();
  const seenSeats = new Set();
  return source
    .map((entry) => {
      const playerId = normalizeBohId(entry?.playerId || entry?.id || entry?.signup?.playerId);
      const seatNumber = nonNegativeInteger(entry?.seatNumber || entry?.seat);
      if (!playerId) throw modelError('boh_player_identity_required');
      if (seenPlayers.has(playerId)) throw modelError('boh_player_id_duplicate', { playerId });
      if (!seatByNumber.has(seatNumber)) {
        throw modelError('boh_seat_number_invalid', { playerId, seatNumber });
      }
      if (seenSeats.has(seatNumber)) {
        throw modelError('boh_seat_number_duplicate', { seatNumber });
      }
      seenPlayers.add(playerId);
      seenSeats.add(seatNumber);
      const seat = seatByNumber.get(seatNumber);
      return {
        playerId,
        gameName: normalizeBohName(entry?.gameName || entry?.name || entry?.signup?.gameName),
        seatNumber,
        roleGroupId: seat.roleGroupId,
        roleLabel: seat.roleLabel,
        baseSeatNumber: seatNumber,
      };
    })
    .sort((left, right) => left.seatNumber - right.seatNumber);
}

function matchingRotations(plan, context) {
  return plan.rotations
    .filter((rotation) => ruleMatches(rotation, context))
    .sort(
      (left, right) =>
        ruleSpecificity(left, context) - ruleSpecificity(right, context) ||
        left.order - right.order ||
        compareText(left.id, right.id)
    );
}

/** Apply phase/Legion rotations as swaps so no player or seat can be duplicated. */
export function projectBohPhaseAssignments(planInput, team, phaseIdInput, legionIdInput) {
  const plan = normalizeBohPlan(planInput);
  const teamId = normalizeBohId(team?.id || team?.teamId, 'team');
  const phaseId = normalizeBohId(phaseIdInput);
  const legionId = normalizeBohId(legionIdInput);
  if (!plan.phases.some((phase) => phase.id === phaseId)) {
    throw modelError('boh_phase_unknown', { phaseId });
  }
  if (!plan.legions.some((legion) => legion.id === legionId)) {
    throw modelError('boh_legion_unknown', { legionId });
  }
  const assignments = normalizedTeamAssignments(team, plan).map((entry) => ({ ...entry }));
  const bySeat = new Map(assignments.map((entry) => [entry.seatNumber, entry]));
  const byPlayer = new Map(assignments.map((entry) => [entry.playerId, entry]));
  const seatTemplate = createBohSeatTemplate(plan.roleGroups);
  const seatByNumber = new Map(seatTemplate.map((seat) => [seat.seatNumber, seat]));
  const context = { teamId, phaseId, legionId };
  matchingRotations(plan, context).forEach((rotation) => {
    const moving = byPlayer.get(rotation.playerId);
    if (!moving) {
      throw modelError('boh_rotation_player_not_in_team', {
        playerId: rotation.playerId,
        teamId,
      });
    }
    const target = bySeat.get(rotation.seatNumber);
    if (!target || target === moving) return;
    const previousSeatNumber = moving.seatNumber;
    const targetSeatNumber = target.seatNumber;
    const previousSeat = seatByNumber.get(previousSeatNumber);
    const targetSeat = seatByNumber.get(targetSeatNumber);

    moving.seatNumber = targetSeatNumber;
    moving.roleGroupId = targetSeat.roleGroupId;
    moving.roleLabel = targetSeat.roleLabel;
    target.seatNumber = previousSeatNumber;
    target.roleGroupId = previousSeat.roleGroupId;
    target.roleLabel = previousSeat.roleLabel;
    bySeat.set(previousSeatNumber, target);
    bySeat.set(targetSeatNumber, moving);
  });
  return [...bySeat.values()]
    .sort((left, right) => left.seatNumber - right.seatNumber)
    .map((entry) => ({
      ...entry,
      rotated: entry.seatNumber !== entry.baseSeatNumber,
    }));
}

/**
 * Build the exact personal timeline used by the player UI. When no Legion is
 * selected, both Legion alternatives are returned for every configured phase.
 */
export function projectBohPlayerTimeline(planInput, team, playerIdInput, options = {}) {
  const plan = normalizeBohPlan(planInput);
  const playerId = normalizeBohId(playerIdInput);
  const teamId = normalizeBohId(team?.id || team?.teamId, 'team');
  const selectedLegion = options.legionId ? normalizeBohId(options.legionId) : null;
  const legions = selectedLegion
    ? plan.legions.filter((legion) => legion.id === selectedLegion)
    : plan.legions;
  if (selectedLegion && !legions.length) {
    throw modelError('boh_legion_unknown', { legionId: selectedLegion });
  }
  const entries = [];
  legions.forEach((legion) => {
    plan.phases.forEach((phase) => {
      const assignments = projectBohPhaseAssignments(plan, team, phase.id, legion.id);
      const assignment = assignments.find((entry) => entry.playerId === playerId);
      if (!assignment) {
        throw modelError('boh_player_not_in_team', { playerId, teamId });
      }
      const resolved = resolveBohInstruction(plan, {
        teamId,
        phaseId: phase.id,
        legionId: legion.id,
        roleGroupId: assignment.roleGroupId,
        seatNumber: assignment.seatNumber,
        playerId,
      });
      entries.push({
        teamId,
        playerId,
        gameName: assignment.gameName,
        phaseId: phase.id,
        phaseLabel: phase.label,
        startMinute: phase.startMinute,
        endMinute: phase.endMinute,
        legionId: legion.id,
        legionLabel: legion.label,
        seatNumber: assignment.seatNumber,
        baseSeatNumber: assignment.baseSeatNumber,
        roleGroupId: assignment.roleGroupId,
        roleLabel: assignment.roleLabel,
        rotated: assignment.rotated,
        instruction: resolved.instruction,
        instructionSources: resolved.sources,
      });
    });
  });
  return entries;
}

/** Validate plan references and, optionally, every projected team/player step. */
export function validateBohPlan(planInput, options = {}) {
  const errors = [];
  let plan;
  try {
    plan = normalizeBohPlan(planInput);
  } catch (error) {
    return { valid: false, errors: [{ code: error.code || 'boh_plan_invalid' }] };
  }
  const teams = options.teams || (options.team ? [options.team] : []);
  teams.forEach((team) => {
    let assignments;
    try {
      assignments = normalizedTeamAssignments(team, plan);
    } catch (error) {
      errors.push({ code: error.code || 'boh_team_assignment_invalid', teamId: team?.id });
      return;
    }
    assignments.forEach((assignment) => {
      try {
        const timeline = projectBohPlayerTimeline(plan, team, assignment.playerId);
        if (options.requireInstructions) {
          timeline.forEach((entry) => {
            if (!Object.keys(entry.instruction).length) {
              errors.push({
                code: 'boh_instruction_missing',
                teamId: team?.id,
                playerId: assignment.playerId,
                phaseId: entry.phaseId,
                legionId: entry.legionId,
              });
            }
          });
        }
      } catch (error) {
        errors.push({
          code: error.code || 'boh_plan_projection_invalid',
          teamId: team?.id,
          playerId: assignment.playerId,
        });
      }
    });
  });
  return { valid: errors.length === 0, errors, plan };
}
