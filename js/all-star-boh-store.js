import { normalizeAllStarBohEventSchedule } from './all-star-boh-schedule.js';

export const ALL_STAR_BOH_ROOT_COLLECTION = 'boh_allstar';
export const ALL_STAR_BOH_CONFIG_PATH = 'boh_allstar_config/current';
export const ALL_STAR_BOH_SCHEMA_VERSION = 1;
export const ALL_STAR_BOH_MAX_TEAMS = 6;
export const ALL_STAR_BOH_MAX_PLAYERS = 72;
export const ALL_STAR_BOH_MAX_PREFERRED_TEAMMATES = 6;
export const ALL_STAR_BOH_MAX_USABLE_HERO_NAMES = 78;
export const ALL_STAR_BOH_FIGHTING_TIME_IDS = Object.freeze(['+12', '+14', '+16']);
const ALL_STAR_BOH_STORED_FIGHTING_TIME_IDS = Object.freeze([
  '+8',
  ...ALL_STAR_BOH_FIGHTING_TIME_IDS,
  '+20',
]);
export const ALL_STAR_BOH_TEAM_NAME_PREFERENCES = Object.freeze([
  'iron-wolves',
  'storm-ravens',
  'ember-lions',
  'frost-bears',
  'night-falcons',
  'thunder-bulls',
]);
export const ALL_STAR_BOH_EPIC_SHOWDOWN_LANES = Object.freeze(['south', 'center', 'north']);
export const ALL_STAR_BOH_EPIC_SHOWDOWN_DEFAULT_TIME_SLOT_IDS = Object.freeze([
  '+6',
  '+8',
  '+10',
  '+12',
  '+14',
  '+16',
  '+18',
  '+20',
]);
const EPIC_FLEXIBILITY_VALUES = new Set(['change-roles', 'change-times', 'fixed', '']);

const MAX_ID_LENGTH = 128;
const MAX_NAME_LENGTH = 160;
const MAX_SHORT_TEXT_LENGTH = 240;
const MAX_NOTE_LENGTH = 2000;
const MAX_ARRAY_ITEMS = 120;
const MAX_SUBMISSION_BYTES = 48 * 1024;
const MAX_EPIC_PREFERENCES_BYTES = 8 * 1024;
const MAX_REVIEW_BYTES = 64 * 1024;
const MAX_DRAFT_BYTES = 640 * 1024;
const MAX_TEAM_BYTES = 256 * 1024;
const MAX_PUBLICATION_BYTES = 128 * 1024;
const MAX_PERSONAL_PLAN_BYTES = 96 * 1024;
const MAX_SCHEDULE_BYTES = 24 * 1024;
const MAX_PUBLISHED_TIMELINE_ITEMS = 8;
const MAX_CORRECTION_REASON_LENGTH = 500;
const FORBIDDEN_PERSISTED_KEY =
  /(?:base64|data[_-]?url|image[_-]?(?:bytes|data|file)|screenshot|raw[_-]?image|arraybuffer|blob|file[_-]?data|pin(?:code)?|password|secret)/i;
const DATA_URL_PATTERN = /^data:image\/[a-z0-9.+-]+;base64,/i;
const IDENTIFIER_PATTERN = /^[A-Za-z0-9_-]+$/;
const SUBMISSION_STATUS = new Set(['draft', 'submitted', 'withdrawn']);
const REVIEW_STATUS = new Set(['pending', 'verified', 'needs_changes', 'rejected']);
const FEEDBACK_STATUS = new Set(['pending', 'confirmed', 'needs_correction', 'excluded']);
const DRAFT_BALANCE_METRICS = new Set(['score', 'totalPower', 'balanced']);
const EPIC_PLANNING_LANE_OVERRIDES = new Set(['', ...ALL_STAR_BOH_EPIC_SHOWDOWN_LANES]);
const REVIEW_STAT_CORRECTION_LIMITS = Object.freeze({
  totalCastlePower: 10 ** 12,
  troopPower: 10 ** 12,
  buildingPower: 10 ** 12,
  technologyPower: 10 ** 12,
  heroCombatPower: 10 ** 12,
  dragonPower: 10 ** 12,
  unitSpecialtyPower: 10 ** 12,
  artifactPower: 10 ** 12,
  royalTechPower: 10 ** 12,
  rocLevel: 160,
});
const SUBMISSION_CORRECTION_SCHEMA_VERSION = 1;
const SUBMISSION_CORRECTION_TOP_FIELDS = Object.freeze([
  'gameName',
  'locale',
  'timezone',
  'preferredTeammates',
]);
const SUBMISSION_CORRECTION_NUMERIC_STAT_LIMITS = Object.freeze({
  totalCastlePower: 10 ** 12,
  troopPower: 10 ** 12,
  buildingPower: 10 ** 12,
  technologyPower: 10 ** 12,
  heroCombatPower: 10 ** 12,
  dragonPower: 10 ** 12,
  unitSpecialtyPower: 10 ** 12,
  artifactPower: 10 ** 12,
  royalTechPower: 10 ** 12,
  rocLevel: 160,
  level50HeroCount: 500,
});
const SUBMISSION_CORRECTION_REQUIRED_NUMERIC_STATS = new Set([
  'totalCastlePower',
  'troopPower',
  'buildingPower',
  'technologyPower',
  'heroCombatPower',
  'dragonPower',
  'unitSpecialtyPower',
  'rocLevel',
  'level50HeroCount',
]);
const SUBMISSION_CORRECTION_STATS_FIELDS = Object.freeze([
  ...Object.keys(SUBMISSION_CORRECTION_NUMERIC_STAT_LIMITS),
  't9TroopTypes',
  't10TroopTypes',
  'readySpeedHeroes',
  'troopRoster',
  'usableHeroNames',
  'researchProgressPct',
]);
const SUBMISSION_CORRECTION_COMMITMENT_FIELDS = Object.freeze([
  'availability',
  'unavailableTimes',
  'preferredRole',
  'secondaryRole',
  'canHelpLead',
  'vts1097Member',
  'contactNumber',
  'currentState',
  'joinReason',
  'fightingTimeIds',
  'teamNamePreferences',
  'canTeleport',
  'canUseVoice',
  'planCommitment',
  'notes',
]);
const SUBMISSION_CORRECTION_FORBIDDEN_KEYS = new Set([
  'playerid',
  'uid',
  'seasonid',
  'status',
  'knownnames',
  'entrymethod',
  'ocr',
  'createdat',
  'createdatms',
  'updatedat',
  'updatedatms',
  'updatedby',
  'submittedat',
  'submittedatms',
  'revision',
  'schemaversion',
  'rolepreferences',
  'eligibleroleids',
]);
const ENTRY_METHODS = new Set(['manual', 'ocr']);
const AVAILABILITY_VALUES = new Set(['all', 'most', 'backup', 'unavailable', '']);
const PREFERRED_ROLE_VALUES = new Set([
  'flexible',
  'offensive',
  'rune',
  'top',
  'bottom',
  'backup',
  '',
]);
const PUBLICATION_STATUS = new Set(['hidden', 'announcement', 'plan', 'live']);
const INSTRUCTION_SCOPES = new Set(['', 'global', 'role', 'seat', 'player']);

function own(source, key) {
  return Object.prototype.hasOwnProperty.call(source || {}, key);
}

function requireRecord(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new AllStarBohValidationError(`${label} must be an object.`);
  }
  return value;
}

function optionalRecord(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function boundedString(value, maxLength, label, options = {}) {
  const normalized = String(value ?? '')
    .normalize('NFC')
    .trim();
  if (!normalized && options.required) {
    throw new AllStarBohValidationError(`${label} is required.`);
  }
  if (normalized.length > maxLength) {
    throw new AllStarBohValidationError(`${label} exceeds ${maxLength} characters.`);
  }
  return normalized;
}

function optionalBoolean(value) {
  return typeof value === 'boolean' ? value : null;
}

function boundedNumber(value, label, options = {}) {
  if (value === '' || value === null || value === undefined) return null;
  const number =
    typeof value === 'string' ? Number(value.replaceAll(',', '').trim()) : Number(value);
  const minimum = options.minimum ?? 0;
  const maximum = options.maximum ?? Number.MAX_SAFE_INTEGER;
  if (!Number.isFinite(number) || number < minimum || number > maximum) {
    throw new AllStarBohValidationError(`${label} must be between ${minimum} and ${maximum}.`);
  }
  if (options.integer && !Number.isInteger(number)) {
    throw new AllStarBohValidationError(`${label} must be an integer.`);
  }
  return options.integer ? Math.trunc(number) : number;
}

function boundedInteger(value, label, options = {}) {
  return boundedNumber(value, label, { ...options, integer: true });
}

function requiredIdentifier(value, label, maxLength = MAX_ID_LENGTH) {
  const identifier = boundedString(value, maxLength, label, { required: true });
  if (!IDENTIFIER_PATTERN.test(identifier)) {
    throw new AllStarBohValidationError(
      `${label} may contain only letters, numbers, underscores, and hyphens.`
    );
  }
  return identifier;
}

function optionalIdentifier(value, label, maxLength = MAX_ID_LENGTH) {
  if (value === '' || value === null || value === undefined) return '';
  return requiredIdentifier(value, label, maxLength);
}

function normalizedEnum(value, allowed, fallback, label) {
  const normalized = String(value ?? fallback)
    .trim()
    .toLowerCase();
  if (!allowed.has(normalized)) {
    throw new AllStarBohValidationError(`${label} has an unsupported value.`);
  }
  return normalized;
}

function boundedStringArray(value, options = {}) {
  if (value === null || value === undefined) return [];
  if (!Array.isArray(value)) {
    throw new AllStarBohValidationError(`${options.label || 'Value'} must be an array.`);
  }
  const maxItems = options.maxItems ?? MAX_ARRAY_ITEMS;
  if (value.length > maxItems) {
    throw new AllStarBohValidationError(`${options.label || 'Value'} exceeds ${maxItems} items.`);
  }
  const seen = new Set();
  const output = [];
  for (const item of value) {
    const normalized = options.identifiers
      ? requiredIdentifier(item, options.label || 'Identifier', options.maxLength ?? MAX_ID_LENGTH)
      : boundedString(item, options.maxLength ?? MAX_SHORT_TEXT_LENGTH, options.label || 'Value');
    const key = normalized.toLocaleLowerCase();
    if (!normalized || seen.has(key)) continue;
    seen.add(key);
    output.push(normalized);
  }
  return output;
}

function normalizedUnicodePlayerName(value, label, options = {}) {
  const normalized = String(value ?? '')
    .normalize('NFKC')
    .replace(/\p{Cc}/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim();
  if (!normalized && options.required) {
    throw new AllStarBohValidationError(`${label} is required.`);
  }
  if (Array.from(normalized).length > MAX_NAME_LENGTH) {
    throw new AllStarBohValidationError(`${label} exceeds ${MAX_NAME_LENGTH} characters.`);
  }
  return normalized;
}

function boundedPlayerNameArray(value, ownName = '') {
  if (value === null || value === undefined) return [];
  if (!Array.isArray(value)) {
    throw new AllStarBohValidationError('Preferred teammates must be an array.');
  }
  if (value.length > ALL_STAR_BOH_MAX_PREFERRED_TEAMMATES) {
    throw new AllStarBohValidationError(
      `Preferred teammates exceeds ${ALL_STAR_BOH_MAX_PREFERRED_TEAMMATES} items.`
    );
  }
  const ownNameKey = normalizedUnicodePlayerName(ownName, 'Game name').toLocaleLowerCase('en');
  const seen = new Set();
  const output = [];
  for (const item of value) {
    const normalized = normalizedUnicodePlayerName(item, 'Preferred teammate name');
    const key = normalized.toLocaleLowerCase('en');
    if (!normalized || key === ownNameKey || seen.has(key)) continue;
    seen.add(key);
    output.push(normalized);
  }
  return output;
}

function normalizeEpicTimeSlotIds(
  value = ALL_STAR_BOH_EPIC_SHOWDOWN_DEFAULT_TIME_SLOT_IDS,
  label = 'Epic Showdown time slots'
) {
  const timeSlotIds = boundedStringArray(value, {
    label,
    maxItems: 24,
    maxLength: 40,
  });
  for (const timeSlotId of timeSlotIds) {
    if (!/^[A-Za-z0-9_+.:/-]+$/u.test(timeSlotId)) {
      throw new AllStarBohValidationError(`${label} contains an invalid ID.`);
    }
  }
  return timeSlotIds;
}

function boundedObjectArray(value, options) {
  if (value === null || value === undefined) return [];
  if (!Array.isArray(value)) {
    throw new AllStarBohValidationError(`${options.label} must be an array.`);
  }
  if (value.length > options.maxItems) {
    throw new AllStarBohValidationError(`${options.label} exceeds ${options.maxItems} items.`);
  }
  return value.map((item, index) => options.normalize(item, index));
}

function assertNoPrivateBinary(value, path = 'payload', seen = new Set()) {
  if (value === null || value === undefined) return;
  if (typeof value === 'string') {
    if (DATA_URL_PATTERN.test(value.trim())) {
      throw new AllStarBohValidationError(`${path} contains an image data URL.`);
    }
    return;
  }
  if (typeof value !== 'object') return;
  if (seen.has(value)) {
    throw new AllStarBohValidationError(`${path} contains a circular value.`);
  }
  seen.add(value);
  if (ArrayBuffer.isView?.(value) || value instanceof ArrayBuffer) {
    throw new AllStarBohValidationError(`${path} contains binary data.`);
  }
  for (const [key, item] of Object.entries(value)) {
    if (FORBIDDEN_PERSISTED_KEY.test(key)) {
      throw new AllStarBohValidationError(`${path}.${key} cannot be persisted.`);
    }
    assertNoPrivateBinary(item, `${path}.${key}`, seen);
  }
  seen.delete(value);
}

function jsonByteLength(value) {
  const json = JSON.stringify(value);
  if (typeof TextEncoder === 'function') return new TextEncoder().encode(json).byteLength;
  return unescape(encodeURIComponent(json)).length;
}

function assertDocumentSize(value, maxBytes, label) {
  if (jsonByteLength(value) > maxBytes) {
    throw new AllStarBohValidationError(`${label} exceeds the ${maxBytes}-byte storage limit.`);
  }
}

function cloneValue(value) {
  if (Array.isArray(value)) return value.map(cloneValue);
  if (value instanceof Date) return new Date(value.getTime());
  if (value && typeof value === 'object') {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return value;
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, cloneValue(item)]));
  }
  return value;
}

function timestampMillis(value) {
  if (value && typeof value.toMillis === 'function') {
    const millis = Number(value.toMillis());
    return Number.isFinite(millis) ? millis : null;
  }
  if (value instanceof Date) {
    const millis = value.getTime();
    return Number.isFinite(millis) ? millis : null;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0 ? Math.trunc(numeric) : null;
}

function snapshotExists(snapshot) {
  if (typeof snapshot?.exists === 'function') return snapshot.exists();
  return snapshot?.exists === true;
}

function snapshotData(snapshot) {
  if (!snapshotExists(snapshot) || typeof snapshot?.data !== 'function') return null;
  const data = snapshot.data();
  return data && typeof data === 'object' ? data : null;
}

function snapshotId(snapshot) {
  if (snapshot?.id) return String(snapshot.id);
  const path = String(snapshot?.ref?.path || snapshot?.path || '');
  return path.split('/').filter(Boolean).pop() || '';
}

function normalizeRevision(value, label = 'Expected revision') {
  const revision = Number(value);
  if (!Number.isInteger(revision) || revision < 0) {
    throw new AllStarBohValidationError(`${label} must be a non-negative integer.`);
  }
  return revision;
}

function normalizeSourceRevisionGuards(value, options = {}) {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    throw new AllStarBohValidationError(`${options.label} guards must be an array.`);
  }
  if (value.length > ALL_STAR_BOH_MAX_PLAYERS) {
    throw new AllStarBohValidationError(
      `${options.label} guards exceed ${ALL_STAR_BOH_MAX_PLAYERS} entries.`
    );
  }
  const seen = new Set();
  return value.map((entry, index) => {
    if (!Array.isArray(entry) || entry.length !== options.revisionCount + 1) {
      throw new AllStarBohValidationError(
        `${options.label} guard ${index + 1} has an invalid shape.`
      );
    }
    const targetUid = requiredIdentifier(entry[0], `${options.label} guard user ID`);
    if (seen.has(targetUid)) {
      throw new AllStarBohValidationError(`${options.label} guards contain duplicate user IDs.`);
    }
    seen.add(targetUid);
    return {
      uid: targetUid,
      revisions: entry
        .slice(1)
        .map((revision, revisionIndex) =>
          normalizeRevision(
            revision,
            `${options.label} guard ${options.revisionLabels[revisionIndex]}`
          )
        ),
    };
  });
}

function resolveExpectedRevision(input, options = {}) {
  return normalizeRevision(options.expectedRevision ?? input?.revision ?? 0);
}

function assertInputIdentity(input, expected = {}) {
  for (const [key, value] of Object.entries(expected)) {
    if (own(input, key) && String(input[key]) !== String(value)) {
      throw new AllStarBohValidationError(`${key} cannot be changed.`);
    }
  }
}

function assertStoredIdentity(raw, expected = {}) {
  for (const [key, value] of Object.entries(expected)) {
    if (raw && own(raw, key) && String(raw[key]) !== String(value)) {
      throw new AllStarBohValidationError(`Stored ${key} does not match its document path.`);
    }
  }
}

function metadataForWrite(existing, identity, expectedRevision, uid, serverTimestamp) {
  assertStoredIdentity(existing, identity);
  return {
    ...identity,
    schemaVersion: ALL_STAR_BOH_SCHEMA_VERSION,
    revision: expectedRevision + 1,
    createdAt: existing?.createdAt || serverTimestamp,
    updatedAt: serverTimestamp,
    updatedBy: uid,
  };
}

function metadataForRead(raw, identity) {
  assertStoredIdentity(raw, identity);
  return {
    ...identity,
    schemaVersion: boundedInteger(raw?.schemaVersion ?? 1, 'Schema version', {
      minimum: 1,
      maximum: 100,
    }),
    revision: normalizeRevision(raw?.revision ?? 0, 'Stored revision'),
    createdAt: raw?.createdAt || null,
    createdAtMs: timestampMillis(raw?.createdAt),
    updatedAt: raw?.updatedAt || null,
    updatedAtMs: timestampMillis(raw?.updatedAt),
    updatedBy: boundedString(raw?.updatedBy, MAX_ID_LENGTH, 'Updated by'),
  };
}

function firstDefined(source, keys) {
  for (const key of keys) {
    if (own(source, key)) return source[key];
  }
  return undefined;
}

function planningValueKey(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .trim()
    .toLocaleLowerCase('en');
}

function normalizePlanningCatalog(value, label, options = {}) {
  if (value === undefined) return null;
  const catalog = boundedStringArray(value, {
    label,
    maxItems: options.maxItems ?? MAX_ARRAY_ITEMS,
    maxLength: options.maxLength ?? MAX_NAME_LENGTH,
  });
  return catalog;
}

function normalizePlanningSelection(value, catalog, label, maxItems) {
  const selection = boundedStringArray(value || [], {
    label,
    maxItems,
    maxLength: MAX_NAME_LENGTH,
  });
  if (catalog === null) return selection;
  const allowedKeys = new Set(catalog.map(planningValueKey));
  const selectedKeys = new Set();
  for (const selected of selection) {
    const key = planningValueKey(selected);
    if (!allowedKeys.has(key)) {
      throw new AllStarBohValidationError(`${label} contains a value outside its catalog.`);
    }
    selectedKeys.add(key);
  }
  return catalog.filter((entry) => selectedKeys.has(planningValueKey(entry)));
}

function normalizeResearchProgress(value, catalog) {
  if (value === undefined || value === null) return {};
  const prototype = typeof value === 'object' && value ? Object.getPrototypeOf(value) : null;
  if (
    typeof value !== 'object' ||
    Array.isArray(value) ||
    (prototype !== Object.prototype && prototype !== null)
  ) {
    throw new AllStarBohValidationError('Research progress must be an object.');
  }
  const sourceByKey = new Map();
  for (const [rawId, rawValue] of Object.entries(value)) {
    const researchTreeId = boundedString(rawId, MAX_ID_LENGTH, 'Research tree ID', {
      required: true,
    });
    const key = planningValueKey(researchTreeId);
    if (['__proto__', 'prototype', 'constructor'].includes(key)) {
      throw new AllStarBohValidationError('Research progress contains an invalid tree ID.');
    }
    if (sourceByKey.has(key)) {
      throw new AllStarBohValidationError('Research progress contains a duplicate tree ID.');
    }
    sourceByKey.set(key, rawValue);
  }
  const orderedTreeIds =
    catalog === null
      ? Object.keys(value).map((researchTreeId) =>
          boundedString(researchTreeId, MAX_ID_LENGTH, 'Research tree ID', { required: true })
        )
      : catalog;
  if (catalog !== null) {
    const allowedKeys = new Set(catalog.map(planningValueKey));
    for (const key of sourceByKey.keys()) {
      if (!allowedKeys.has(key)) {
        throw new AllStarBohValidationError('Research progress contains an unknown tree ID.');
      }
    }
  }
  const progress = {};
  for (const researchTreeId of orderedTreeIds) {
    const rawValue = sourceByKey.get(planningValueKey(researchTreeId));
    if (
      rawValue === undefined ||
      rawValue === null ||
      (typeof rawValue === 'string' && !rawValue.trim())
    ) {
      continue;
    }
    progress[researchTreeId] = boundedInteger(rawValue, `Research progress for ${researchTreeId}`, {
      minimum: 0,
      maximum: 100,
    });
  }
  return progress;
}

function normalizeFightingTimeIds(value, options = {}) {
  const supportedTimeIds =
    options.allowLegacyValues === true
      ? ALL_STAR_BOH_STORED_FIGHTING_TIME_IDS
      : ALL_STAR_BOH_FIGHTING_TIME_IDS;
  const selection = boundedStringArray(value || [], {
    label: 'Fighting times',
    maxItems: supportedTimeIds.length,
    maxLength: 8,
  });
  const allowedKeys = new Set(supportedTimeIds.map(planningValueKey));
  const selectedKeys = new Set();
  for (const timeId of selection) {
    const key = planningValueKey(timeId);
    if (!allowedKeys.has(key)) {
      throw new AllStarBohValidationError('Fighting times contains an unsupported value.');
    }
    selectedKeys.add(key);
  }
  const normalized = supportedTimeIds.filter((timeId) =>
    selectedKeys.has(planningValueKey(timeId))
  );
  if (!normalized.length && options.allowLegacyEmpty) return normalized;
  if (normalized.length !== 2) {
    throw new AllStarBohValidationError('Exactly two fighting times are required.');
  }
  return normalized;
}

function normalizeStats(input = {}, options = {}) {
  const source = optionalRecord(input);
  const number = (keys, label, maximum = 10 ** 15) =>
    boundedInteger(firstDefined(source, keys), label, { minimum: 0, maximum });
  const stats = {
    totalCastlePower: number(['totalCastlePower', 'totalPower'], 'Total castle power'),
    troopPower: number(['troopPower'], 'Troop power'),
    buildingPower: number(['buildingPower'], 'Building power'),
    technologyPower: number(['technologyPower', 'techPower'], 'Technology power'),
    heroCombatPower: number(['heroCombatPower', 'heroPower'], 'Hero combat power'),
    dragonPower: number(['dragonPower', 'dragonsPower'], 'Dragon power'),
    t9TroopTypes: boundedStringArray(firstDefined(source, ['t9TroopTypes', 't9Types']) || [], {
      label: 'T10 troop types',
      maxItems: 12,
      maxLength: 60,
    }),
    t10TroopTypes: boundedStringArray(firstDefined(source, ['t10TroopTypes', 't10Types']) || [], {
      label: 'T10 troop types',
      maxItems: 3,
      maxLength: 60,
    }),
    readySpeedHeroes: boundedStringArray(
      firstDefined(source, ['readySpeedHeroes', 'speedHeroes']) || [],
      { label: 'Ready speed heroes', maxItems: 24, maxLength: 80 }
    ),
    level50HeroCount: number(['level50HeroCount', 'level50Heroes'], 'Level 50 hero count', 500),
    rocLevel: number(['rocLevel'], 'RoC level', 160),
  };
  if (source.troopRoster !== undefined) {
    stats.troopRoster = boundedStringArray(source.troopRoster || [], {
      label: 'Troop roster',
      maxItems: 60,
      maxLength: 48,
    });
  }
  for (const entry of stats.troopRoster || []) {
    if (
      !/^(?:(?:footmen|cavalry|archers)\|(?:SSS|SS|S|X|IX|VIII|VII|VI|V|IV|III|II|I)\|(?:normal|enhanced)|estimate\|(?:lofty|enhanced-t10|t10|t9))\|\d{1,10}$/u.test(
        entry
      )
    ) {
      throw new AllStarBohValidationError('Troop inventory contains an invalid row.');
    }
  }
  for (const [key, aliases, label] of [
    ['unitSpecialtyPower', ['unitSpecialtyPower', 'specialtyPower'], 'Unit specialty power'],
    ['artifactPower', ['artifactPower'], 'Artifact power'],
    ['royalTechPower', ['royalTechPower'], 'Royal Tech power'],
  ]) {
    const rawValue = firstDefined(source, aliases);
    if (rawValue === undefined || rawValue === null || rawValue === '') continue;
    stats[key] = boundedInteger(rawValue, label, { minimum: 0, maximum: 10 ** 15 });
  }
  if (options.includePlanningSignals === true) {
    stats.usableHeroNames = normalizePlanningSelection(
      source.usableHeroNames,
      normalizePlanningCatalog(options.heroNames, 'Hero catalog', {
        maxItems: ALL_STAR_BOH_MAX_USABLE_HERO_NAMES,
      }),
      'Usable heroes',
      ALL_STAR_BOH_MAX_USABLE_HERO_NAMES
    );
    stats.researchProgressPct = normalizeResearchProgress(
      source.researchProgressPct,
      normalizePlanningCatalog(options.researchTreeIds, 'Research tree catalog', {
        maxLength: MAX_ID_LENGTH,
      })
    );
  }
  if (options.includeAdminUsefulness === true) {
    stats.bohUsefulRating = boundedNumber(source.bohUsefulRating, 'BoH useful rating', {
      minimum: 0,
      maximum: 100,
    });
  }
  return stats;
}

function normalizeCommitment(input = {}, options = {}) {
  const source = optionalRecord(input);
  const teamNamePreferences = boundedStringArray(source.teamNamePreferences || [], {
    label: 'Team name preferences',
    maxItems: ALL_STAR_BOH_TEAM_NAME_PREFERENCES.length,
    identifiers: true,
  });
  if (teamNamePreferences.some((value) => !ALL_STAR_BOH_TEAM_NAME_PREFERENCES.includes(value))) {
    throw new AllStarBohValidationError('Team name preferences contain an unsupported value.');
  }
  const vts1097Member = optionalBoolean(source.vts1097Member);
  const contactNumber = boundedString(source.contactNumber, 160, 'Contact number');
  const currentState = boundedString(source.currentState, 160, 'Current state');
  const joinReason = boundedString(source.joinReason, 1000, 'VTS join reason');
  if (options.requireVtsMembership === true && vts1097Member === null) {
    throw new AllStarBohValidationError('VTS 1097 membership selection is required.');
  }
  if (vts1097Member === false && (!contactNumber || !currentState || !joinReason)) {
    throw new AllStarBohValidationError(
      'Non-VTS players must provide contact details, current state, and a join reason.'
    );
  }
  return {
    availability: normalizedEnum(source.availability, AVAILABILITY_VALUES, '', 'Availability'),
    preferredRole: normalizedEnum(
      firstDefined(source, ['preferredRole', 'role']),
      PREFERRED_ROLE_VALUES,
      '',
      'Preferred role'
    ),
    secondaryRole: normalizedEnum(
      source.secondaryRole,
      PREFERRED_ROLE_VALUES,
      '',
      'Secondary role'
    ),
    canHelpLead: optionalBoolean(source.canHelpLead),
    vts1097Member,
    contactNumber: vts1097Member === true ? '' : contactNumber,
    currentState: vts1097Member === true ? '' : currentState,
    joinReason: vts1097Member === true ? '' : joinReason,
    fightingTimeIds: normalizeFightingTimeIds(source.fightingTimeIds, {
      allowLegacyEmpty: options.requireFightingTimeIds !== true,
      allowLegacyValues: options.allowLegacyFightingTimeIds === true,
    }),
    teamNamePreferences,
    unavailableTimes: boundedString(source.unavailableTimes, 800, 'Unavailable times'),
    canTeleport: optionalBoolean(source.canTeleport),
    canUseVoice: optionalBoolean(source.canUseVoice),
    planCommitment: optionalBoolean(source.planCommitment),
    notes: boundedString(source.notes, MAX_NOTE_LENGTH, 'Player notes'),
  };
}

function normalizeOcrAudit(input = {}) {
  const source = optionalRecord(input);
  const confidence = boundedNumber(source.confidence, 'OCR confidence', {
    minimum: 0,
    maximum: 1,
  });
  const fieldConfidenceSource = optionalRecord(source.fieldConfidence);
  const fieldConfidence = {};
  for (const key of [
    'totalCastlePower',
    'troopPower',
    'buildingPower',
    'technologyPower',
    'heroCombatPower',
    'dragonPower',
    'unitSpecialtyPower',
    'artifactPower',
    'royalTechPower',
  ]) {
    if (!own(fieldConfidenceSource, key)) continue;
    fieldConfidence[key] = boundedNumber(fieldConfidenceSource[key], `OCR ${key} confidence`, {
      minimum: 0,
      maximum: 1,
    });
  }
  return {
    used: source.used === true,
    valuesConfirmed: source.valuesConfirmed === true || source.confirmed === true,
    confidence,
    warnings: boundedStringArray(source.warnings || [], {
      label: 'OCR warnings',
      maxItems: 20,
      maxLength: MAX_SHORT_TEXT_LENGTH,
    }),
    fieldConfidence,
  };
}

export function normalizeAllStarBohSubmission(input = {}, options = {}) {
  const source = requireRecord(input, 'Player submission');
  assertNoPrivateBinary(source, 'Player submission');
  const statsSource = optionalRecord(source.stats);
  const readiness = optionalRecord(source.readiness);
  const combinedStats = { ...readiness, ...statsSource };
  const rolePreferences = boundedStringArray(source.rolePreferences || [], {
    label: 'Role preferences',
    maxItems: 12,
    identifiers: true,
  });
  const preferredRole = firstDefined(optionalRecord(source.commitment), ['preferredRole', 'role']);
  if (!rolePreferences.length && preferredRole) {
    rolePreferences.push(requiredIdentifier(preferredRole, 'Preferred role'));
  }
  const secondaryRole = firstDefined(optionalRecord(source.commitment), ['secondaryRole']);
  if (secondaryRole && !rolePreferences.includes(secondaryRole)) {
    rolePreferences.push(requiredIdentifier(secondaryRole, 'Secondary role'));
  }
  const gameName = boundedString(
    firstDefined(source, ['gameName', 'accountName', 'playerName']),
    MAX_NAME_LENGTH,
    'Game name',
    { required: true }
  );
  const normalized = {
    playerId: boundedString(source.playerId, MAX_ID_LENGTH, 'Player ID'),
    gameName,
    knownNames: boundedStringArray(source.knownNames || [], {
      label: 'Known names',
      maxItems: 30,
      maxLength: MAX_NAME_LENGTH,
    }),
    preferredTeammates: boundedPlayerNameArray(source.preferredTeammates, gameName),
    locale: boundedString(source.locale, 20, 'Locale'),
    timezone: boundedString(source.timezone, 80, 'Timezone'),
    entryMethod: normalizedEnum(source.entryMethod, ENTRY_METHODS, 'manual', 'Entry method'),
    status: normalizedEnum(source.status, SUBMISSION_STATUS, 'draft', 'Submission status'),
    stats: normalizeStats(combinedStats, { ...options, includePlanningSignals: true }),
    rolePreferences,
    eligibleRoleIds: boundedStringArray(source.eligibleRoleIds || [], {
      label: 'Eligible roles',
      maxItems: 20,
      identifiers: true,
    }),
    commitment: normalizeCommitment(source.commitment, options),
    ocr: normalizeOcrAudit(source.ocr),
    submittedAtMs: boundedInteger(source.submittedAtMs, 'Submitted timestamp', {
      minimum: 0,
      maximum: Number.MAX_SAFE_INTEGER,
    }),
  };
  if (!normalized.playerId) delete normalized.playerId;
  if (
    normalized.status === 'submitted' &&
    normalized.entryMethod === 'ocr' &&
    (!normalized.ocr.used || !normalized.ocr.valuesConfirmed)
  ) {
    throw new AllStarBohValidationError(
      'Submitted OCR values must be reviewed and confirmed by the player.'
    );
  }
  assertDocumentSize(normalized, MAX_SUBMISSION_BYTES, 'Player submission');
  return normalized;
}

/** Normalize the separately revisioned Epic Showdown lane/time availability. */
export function normalizeAllStarBohEpicPreferences(input = {}, options = {}) {
  const source = requireRecord(input, 'Epic Showdown preferences');
  assertNoPrivateBinary(source, 'Epic Showdown preferences');
  const gameName = normalizedUnicodePlayerName(
    firstDefined(source, ['gameName', 'accountName', 'playerName']),
    'Epic Showdown game name',
    { required: true }
  );
  const configuredTimeSlotIds = normalizeEpicTimeSlotIds(
    options.timeSlotIds === undefined
      ? ALL_STAR_BOH_EPIC_SHOWDOWN_DEFAULT_TIME_SLOT_IDS
      : options.timeSlotIds,
    'Configured Epic Showdown time slots'
  );

  const lanePreferences = boundedStringArray(source.lanePreferences || [], {
    label: 'Epic Showdown lanes',
    maxItems: ALL_STAR_BOH_EPIC_SHOWDOWN_LANES.length,
    maxLength: 20,
  }).map((lane) => lane.toLocaleLowerCase('en'));
  if (!lanePreferences.length) {
    throw new AllStarBohValidationError('Choose at least one Epic Showdown position.');
  }
  const allowedLanes = new Set(ALL_STAR_BOH_EPIC_SHOWDOWN_LANES);
  for (const lane of lanePreferences) {
    if (!allowedLanes.has(lane)) {
      throw new AllStarBohValidationError('Epic Showdown lanes contains an unsupported value.');
    }
  }

  const configuredTimesByKey = new Map(
    configuredTimeSlotIds.map((timeSlotId) => [timeSlotId.toLocaleLowerCase('en'), timeSlotId])
  );
  const timePreferences = normalizeEpicTimeSlotIds(
    source.timePreferences || [],
    'Epic Showdown time preferences'
  ).map((timeSlotId) => {
    const configured = configuredTimesByKey.get(timeSlotId.toLocaleLowerCase('en'));
    if (!configured) {
      throw new AllStarBohValidationError(
        `Epic Showdown time preference ${timeSlotId} is not configured.`
      );
    }
    return configured;
  });
  if (!timePreferences.length) {
    throw new AllStarBohValidationError('Choose at least one Epic Showdown game time.');
  }
  const flexibilityPreference = normalizedEnum(
    source.flexibilityPreference,
    EPIC_FLEXIBILITY_VALUES,
    '',
    'Epic Showdown flexibility preference'
  );
  const normalized = {
    gameName,
    lanePreferences,
    timePreferences,
    ...(flexibilityPreference ? { flexibilityPreference } : {}),
  };
  assertDocumentSize(normalized, MAX_EPIC_PREFERENCES_BYTES, 'Epic Showdown preferences');
  return normalized;
}

function normalizeScore(input = {}) {
  const source = optionalRecord(input);
  const breakdownSource = optionalRecord(source.breakdown);
  const breakdown = {};
  const allowedBreakdownKeys = [
    'totalCastlePower',
    'troopPower',
    'buildingPower',
    'technologyPower',
    'heroCombatPower',
    'dragonPower',
    'unitSpecialtyPower',
    't9TroopType',
    'readySpeedHero',
    'level50Hero',
    'bohUsefulRating',
    'rocLevel',
    'paidUsableHero',
    'loftyTroopMillion',
    'enhancedT10TroopMillion',
    'override',
  ];
  for (const key of allowedBreakdownKeys) {
    if (!own(breakdownSource, key)) continue;
    const entrySource = breakdownSource[key];
    const entry =
      entrySource && typeof entrySource === 'object' && !Array.isArray(entrySource)
        ? entrySource
        : { points: entrySource };
    const normalizedEntry = {
      input: boundedNumber(entry.input, `Score ${key} input`, {
        minimum: -(10 ** 15),
        maximum: 10 ** 15,
      }),
      weight: boundedNumber(entry.weight, `Score ${key} weight`, {
        minimum: -(10 ** 9),
        maximum: 10 ** 9,
      }),
      divisor: boundedNumber(entry.divisor, `Score ${key} divisor`, {
        minimum: 0.000001,
        maximum: 10 ** 15,
      }),
      points: boundedNumber(entry.points, `Score ${key} points`, {
        minimum: -(10 ** 12),
        maximum: 10 ** 12,
      }),
    };
    breakdown[key] = Object.fromEntries(
      Object.entries(normalizedEntry).filter(([, value]) => value !== null)
    );
  }
  return {
    profileId: boundedString(source.profileId, MAX_ID_LENGTH, 'Score profile ID'),
    profileVersion: boundedInteger(source.profileVersion, 'Score profile version', {
      minimum: 0,
      maximum: 1_000_000,
    }),
    precision: boundedInteger(source.precision, 'Score precision', {
      minimum: 0,
      maximum: 12,
    }),
    breakdown,
    powerSubtotal: boundedNumber(source.powerSubtotal, 'Power subtotal', {
      minimum: -(10 ** 12),
      maximum: 10 ** 12,
    }),
    bonusSubtotal: boundedNumber(source.bonusSubtotal, 'Bonus subtotal', {
      minimum: -(10 ** 12),
      maximum: 10 ** 12,
    }),
    total: boundedNumber(source.total, 'Total score', {
      minimum: -(10 ** 12),
      maximum: 10 ** 12,
    }),
  };
}

function normalizeReviewStatCorrections(input) {
  if (input === null || input === undefined) return {};
  const source = requireRecord(input, 'Stat corrections');
  const output = {};
  for (const [key, maximum] of Object.entries(REVIEW_STAT_CORRECTION_LIMITS)) {
    if (!own(source, key)) continue;
    const correction = requireRecord(source[key], `${key} correction`);
    const rawCorrected = correction.corrected;
    if (
      (typeof rawCorrected !== 'number' && typeof rawCorrected !== 'string') ||
      (typeof rawCorrected === 'string' && !rawCorrected.trim())
    ) {
      throw new AllStarBohValidationError(`${key} corrected value must be a number.`);
    }
    const corrected = boundedNumber(rawCorrected, `${key} corrected value`, {
      minimum: 0,
      maximum,
    });
    if (corrected === null) {
      throw new AllStarBohValidationError(`${key} corrected value is required.`);
    }
    output[key] = {
      corrected,
      reason: boundedString(
        correction.reason,
        MAX_CORRECTION_REASON_LENGTH,
        `${key} correction reason`,
        { required: true }
      ),
    };
  }
  return output;
}

function normalizeGameNameCorrection(input) {
  if (input === null || input === undefined) return null;
  const source = requireRecord(input, 'Game name correction');
  return {
    corrected: normalizedUnicodePlayerName(source.corrected, 'Corrected game name', {
      required: true,
    }),
    reason: boundedString(
      source.reason,
      MAX_CORRECTION_REASON_LENGTH,
      'Game name correction reason',
      { required: true }
    ),
  };
}

function isForbiddenSubmissionCorrectionKey(key) {
  return SUBMISSION_CORRECTION_FORBIDDEN_KEYS.has(String(key).toLocaleLowerCase('en'));
}

function assertNoForbiddenSubmissionCorrectionKeys(source, path) {
  for (const key of Object.keys(optionalRecord(source))) {
    if (isForbiddenSubmissionCorrectionKey(key)) {
      throw new AllStarBohValidationError(`${path}.${key} cannot be corrected.`);
    }
  }
}

function optionalCorrectionRecord(value, label) {
  if (value === null || value === undefined) return {};
  return requireRecord(value, label);
}

function normalizeSubmissionCorrectionBoolean(value, label) {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'boolean') {
    throw new AllStarBohValidationError(`${label} must be true, false, or null.`);
  }
  return value;
}

function normalizeSubmissionCorrectionNumber(value, key) {
  if (
    SUBMISSION_CORRECTION_REQUIRED_NUMERIC_STATS.has(key) &&
    (value === null || value === undefined || (typeof value === 'string' && !value.trim()))
  ) {
    throw new AllStarBohValidationError(`${key} correction is required.`);
  }
  if (value === null || value === undefined || value === '') return null;
  return boundedInteger(value, `${key} correction`, {
    minimum: 0,
    maximum: SUBMISSION_CORRECTION_NUMERIC_STAT_LIMITS[key],
  });
}

function normalizeSubmissionCorrectionTroopRoster(value) {
  const troopRoster = boundedStringArray(value || [], {
    label: 'Troop roster',
    maxItems: 60,
    maxLength: 48,
  });
  for (const entry of troopRoster) {
    if (
      !/^(?:(?:footmen|cavalry|archers)\|(?:SSS|SS|S|X|IX|VIII|VII|VI|V|IV|III|II|I)\|(?:normal|enhanced)|estimate\|(?:lofty|enhanced-t10|t10|t9))\|\d{1,10}$/u.test(
        entry
      )
    ) {
      throw new AllStarBohValidationError('Troop inventory contains an invalid row.');
    }
  }
  return troopRoster;
}

function normalizeSubmissionCorrectionTopValue(key, value) {
  if (key === 'gameName') {
    return normalizedUnicodePlayerName(value, 'Corrected game name', { required: true });
  }
  if (key === 'locale') return boundedString(value, 20, 'Corrected locale');
  if (key === 'timezone') return boundedString(value, 80, 'Corrected timezone');
  if (key === 'preferredTeammates') return boundedPlayerNameArray(value);
  return undefined;
}

function normalizeSubmissionCorrectionStats(input) {
  const source = optionalCorrectionRecord(input, 'Submission correction stats');
  const output = {};
  for (const key of SUBMISSION_CORRECTION_STATS_FIELDS) {
    if (!own(source, key)) continue;
    if (own(SUBMISSION_CORRECTION_NUMERIC_STAT_LIMITS, key)) {
      output[key] = normalizeSubmissionCorrectionNumber(source[key], key);
    } else if (key === 't9TroopTypes') {
      output[key] = boundedStringArray(source[key] || [], {
        label: 'T9 troop types',
        maxItems: 12,
        maxLength: 60,
      });
    } else if (key === 't10TroopTypes') {
      output[key] = boundedStringArray(source[key] || [], {
        label: 'T10 troop types',
        maxItems: 3,
        maxLength: 60,
      });
    } else if (key === 'readySpeedHeroes') {
      output[key] = boundedStringArray(source[key] || [], {
        label: 'Ready speed heroes',
        maxItems: 24,
        maxLength: 80,
      });
    } else if (key === 'troopRoster') {
      output[key] = normalizeSubmissionCorrectionTroopRoster(source[key]);
    } else if (key === 'usableHeroNames') {
      output[key] = boundedStringArray(source[key] || [], {
        label: 'Usable heroes',
        maxItems: ALL_STAR_BOH_MAX_USABLE_HERO_NAMES,
        maxLength: MAX_NAME_LENGTH,
      });
    } else if (key === 'researchProgressPct') {
      output[key] = normalizeResearchProgress(source[key], null);
    }
  }
  return output;
}

function normalizeSubmissionCorrectionCommitment(input) {
  const source = optionalCorrectionRecord(input, 'Submission correction commitment');
  const output = {};
  for (const key of SUBMISSION_CORRECTION_COMMITMENT_FIELDS) {
    if (!own(source, key)) continue;
    if (key === 'availability') {
      output[key] = normalizedEnum(source[key], AVAILABILITY_VALUES, '', 'Availability');
    } else if (key === 'unavailableTimes') {
      output[key] = boundedString(source[key], 800, 'Unavailable times');
    } else if (key === 'preferredRole') {
      output[key] = normalizedEnum(source[key], PREFERRED_ROLE_VALUES, '', 'Preferred role');
    } else if (key === 'secondaryRole') {
      output[key] = normalizedEnum(source[key], PREFERRED_ROLE_VALUES, '', 'Secondary role');
    } else if (key === 'canHelpLead') {
      output[key] = normalizeSubmissionCorrectionBoolean(source[key], 'Can help lead');
    } else if (key === 'vts1097Member') {
      output[key] = normalizeSubmissionCorrectionBoolean(source[key], 'VTS 1097 membership');
    } else if (key === 'contactNumber') {
      output[key] = boundedString(source[key], 160, 'Contact number');
    } else if (key === 'currentState') {
      output[key] = boundedString(source[key], 160, 'Current state');
    } else if (key === 'joinReason') {
      output[key] = boundedString(source[key], 1000, 'VTS join reason');
    } else if (key === 'fightingTimeIds') {
      output[key] = normalizeFightingTimeIds(source[key] || [], { allowLegacyEmpty: true });
    } else if (key === 'teamNamePreferences') {
      const teamNamePreferences = boundedStringArray(source[key] || [], {
        label: 'Team name preferences',
        maxItems: ALL_STAR_BOH_TEAM_NAME_PREFERENCES.length,
        identifiers: true,
      });
      if (
        teamNamePreferences.some((value) => !ALL_STAR_BOH_TEAM_NAME_PREFERENCES.includes(value))
      ) {
        throw new AllStarBohValidationError('Team name preferences contain an unsupported value.');
      }
      output[key] = teamNamePreferences;
    } else if (key === 'canTeleport') {
      output[key] = normalizeSubmissionCorrectionBoolean(source[key], 'Can teleport');
    } else if (key === 'canUseVoice') {
      output[key] = normalizeSubmissionCorrectionBoolean(source[key], 'Can use voice');
    } else if (key === 'planCommitment') {
      output[key] = normalizeSubmissionCorrectionBoolean(source[key], 'Plan commitment');
    } else if (key === 'notes') {
      output[key] = boundedString(source[key], MAX_NOTE_LENGTH, 'Player notes');
    }
  }
  return output;
}

function submissionCorrectionChangedFields(values) {
  const changedFields = [];
  for (const key of SUBMISSION_CORRECTION_TOP_FIELDS) {
    if (own(values, key)) changedFields.push(key);
  }
  for (const key of SUBMISSION_CORRECTION_STATS_FIELDS) {
    if (own(values.stats, key)) changedFields.push(`stats.${key}`);
  }
  for (const key of SUBMISSION_CORRECTION_COMMITMENT_FIELDS) {
    if (own(values.commitment, key)) changedFields.push(`commitment.${key}`);
  }
  return changedFields;
}

function normalizeSubmissionCorrection(input) {
  if (input === null || input === undefined) return null;
  const source = requireRecord(input, 'Submission correction');
  assertNoPrivateBinary(source, 'Submission correction');
  for (const key of Object.keys(source)) {
    if (['schemaVersion', 'reason', 'values', 'changedFields'].includes(key)) continue;
    if (isForbiddenSubmissionCorrectionKey(key)) {
      throw new AllStarBohValidationError(`Submission correction ${key} cannot be corrected.`);
    }
  }
  const schemaVersion = boundedInteger(
    source.schemaVersion ?? SUBMISSION_CORRECTION_SCHEMA_VERSION,
    'Submission correction schema version',
    { minimum: SUBMISSION_CORRECTION_SCHEMA_VERSION, maximum: SUBMISSION_CORRECTION_SCHEMA_VERSION }
  );
  const valuesSource = optionalCorrectionRecord(source.values, 'Submission correction values');
  assertNoForbiddenSubmissionCorrectionKeys(valuesSource, 'Submission correction values');
  assertNoForbiddenSubmissionCorrectionKeys(
    optionalRecord(valuesSource.stats),
    'Submission correction values.stats'
  );
  assertNoForbiddenSubmissionCorrectionKeys(
    optionalRecord(valuesSource.commitment),
    'Submission correction values.commitment'
  );
  const values = {};
  for (const key of SUBMISSION_CORRECTION_TOP_FIELDS) {
    if (own(valuesSource, key))
      values[key] = normalizeSubmissionCorrectionTopValue(key, valuesSource[key]);
  }
  const stats = normalizeSubmissionCorrectionStats(valuesSource.stats);
  if (Object.keys(stats).length) values.stats = stats;
  const commitment = normalizeSubmissionCorrectionCommitment(valuesSource.commitment);
  if (Object.keys(commitment).length) values.commitment = commitment;
  const changedFields = submissionCorrectionChangedFields(values);
  if (!changedFields.length) return null;
  return {
    schemaVersion,
    reason: boundedString(
      source.reason,
      MAX_CORRECTION_REASON_LENGTH,
      'Submission correction reason',
      {
        required: true,
      }
    ),
    values,
    changedFields,
  };
}

function deriveSubmissionRolePreferences(commitmentInput) {
  const commitment = optionalRecord(commitmentInput);
  const rolePreferences = [];
  for (const [value, label] of [
    [commitment.preferredRole, 'Preferred role'],
    [commitment.secondaryRole, 'Secondary role'],
  ]) {
    const role = String(value ?? '')
      .trim()
      .toLowerCase();
    if (!role || role === 'flexible') continue;
    const normalized = requiredIdentifier(role, label);
    if (!rolePreferences.includes(normalized)) rolePreferences.push(normalized);
  }
  return rolePreferences;
}

function reviewMatchesCorrectionTarget(submission, review) {
  if (!review || typeof review !== 'object' || review.stale === true) return false;
  const submissionRevision = Number(submission?.revision);
  const reviewRevision = Number(review?.submissionRevision);
  const hasSubmissionRevision = Number.isInteger(submissionRevision);
  const hasReviewRevision = Number.isInteger(reviewRevision);
  if (!hasSubmissionRevision && !hasReviewRevision) return true;
  return hasSubmissionRevision && hasReviewRevision && submissionRevision === reviewRevision;
}

export function applyAllStarBohSubmissionCorrections(submission, review) {
  const source = requireRecord(submission, 'Player submission');
  const output = cloneValue(source);
  output.stats = { ...optionalRecord(output.stats) };
  output.commitment = { ...optionalRecord(output.commitment) };
  const originalRolePreferences = cloneValue(output.rolePreferences || []);
  if (!reviewMatchesCorrectionTarget(source, review)) return output;

  const normalizedReview = normalizeAllStarBohReview(review);
  for (const key of Object.keys(REVIEW_STAT_CORRECTION_LIMITS)) {
    const correction = normalizedReview.statCorrections?.[key];
    if (!correction || correction.corrected === null || correction.corrected === undefined) {
      continue;
    }
    output.stats[key] = correction.corrected;
  }
  if (normalizedReview.gameNameCorrection) {
    output.gameName = normalizedReview.gameNameCorrection.corrected;
  }
  const correction = normalizedReview.submissionCorrection;
  if (!correction) return output;
  const correctedRoleFields =
    own(correction.values.commitment, 'preferredRole') ||
    own(correction.values.commitment, 'secondaryRole');
  for (const key of SUBMISSION_CORRECTION_TOP_FIELDS) {
    if (own(correction.values, key)) output[key] = cloneValue(correction.values[key]);
  }
  for (const key of SUBMISSION_CORRECTION_STATS_FIELDS) {
    if (own(correction.values.stats, key))
      output.stats[key] = cloneValue(correction.values.stats[key]);
  }
  for (const key of SUBMISSION_CORRECTION_COMMITMENT_FIELDS) {
    if (own(correction.values.commitment, key)) {
      output.commitment[key] = cloneValue(correction.values.commitment[key]);
    }
  }
  if (
    own(correction.values.commitment, 'vts1097Member') &&
    output.commitment.vts1097Member === true
  ) {
    const canonicalCommitment = normalizeCommitment(output.commitment, {
      allowLegacyFightingTimeIds: true,
    });
    output.commitment.contactNumber = canonicalCommitment.contactNumber;
    output.commitment.currentState = canonicalCommitment.currentState;
    output.commitment.joinReason = canonicalCommitment.joinReason;
  }
  output.rolePreferences = correctedRoleFields
    ? deriveSubmissionRolePreferences(output.commitment)
    : originalRolePreferences;
  return output;
}

export function normalizeAllStarBohReview(input = {}) {
  const source = requireRecord(input, 'Submission review');
  assertNoPrivateBinary(source, 'Submission review');
  const adjustments = own(source, 'adjustments')
    ? normalizeStats(source.adjustments, { includeAdminUsefulness: true })
    : null;
  const output = {
    submissionRevision: boundedInteger(source.submissionRevision, 'Reviewed submission revision', {
      minimum: 0,
      maximum: 1_000_000_000,
    }),
    status: normalizedEnum(source.status, REVIEW_STATUS, 'pending', 'Review status'),
    note: boundedString(firstDefined(source, ['note', 'notes']), MAX_NOTE_LENGTH, 'Review note'),
    internalNote: boundedString(source.internalNote, MAX_NOTE_LENGTH, 'Internal review note'),
    roleTags: boundedStringArray(source.roleTags || [], {
      label: 'Role tags',
      maxItems: 20,
      identifiers: true,
    }),
    locked: source.locked === true,
    score: normalizeScore(source.score),
    adjustments,
  };
  if (own(source, 'statCorrections')) {
    output.statCorrections = normalizeReviewStatCorrections(source.statCorrections);
  }
  if (own(source, 'gameNameCorrection')) {
    const gameNameCorrection = normalizeGameNameCorrection(source.gameNameCorrection);
    if (gameNameCorrection) output.gameNameCorrection = gameNameCorrection;
  }
  if (own(source, 'submissionCorrection')) {
    const submissionCorrection = normalizeSubmissionCorrection(source.submissionCorrection);
    if (submissionCorrection) output.submissionCorrection = submissionCorrection;
  }
  if (['needs_changes', 'rejected'].includes(output.status) && !output.note) {
    throw new AllStarBohValidationError(
      'Player-facing feedback is required for a correction or exclusion.'
    );
  }
  assertDocumentSize(output, MAX_REVIEW_BYTES, 'Submission review');
  return output;
}

export function normalizeAllStarBohFeedback(input = {}) {
  const source = requireRecord(input, 'Player review feedback');
  assertNoPrivateBinary(source, 'Player review feedback');
  const output = {
    status: normalizedEnum(source.status, FEEDBACK_STATUS, 'pending', 'Feedback status'),
    note: boundedString(source.note, MAX_NOTE_LENGTH, 'Feedback note'),
    submissionRevision: boundedInteger(source.submissionRevision, 'Feedback submission revision', {
      minimum: 1,
      maximum: 1_000_000_000,
    }),
    reviewRevision: boundedInteger(source.reviewRevision, 'Feedback review revision', {
      minimum: 1,
      maximum: 1_000_000_000,
    }),
  };
  if (['needs_correction', 'excluded'].includes(output.status) && !output.note) {
    throw new AllStarBohValidationError(
      'Player-facing feedback is required for a correction or exclusion.'
    );
  }
  assertDocumentSize(output, MAX_REVIEW_BYTES, 'Player review feedback');
  return output;
}

function normalizeWeights(input = {}, allowedKeys = []) {
  const source = optionalRecord(input);
  const output = {};
  for (const key of allowedKeys) {
    if (!own(source, key)) continue;
    output[key] = boundedNumber(source[key], `Weight ${key}`, {
      minimum: -1_000_000,
      maximum: 1_000_000,
    });
  }
  return output;
}

function normalizeScoringVersion(input, index = 0) {
  const source = requireRecord(input, `Scoring version ${index + 1}`);
  const flattenedWeights = optionalRecord(source.weights);
  const powerKeys = [
    'totalCastlePower',
    'troopPower',
    'buildingPower',
    'technologyPower',
    'heroCombatPower',
    'dragonPower',
    'unitSpecialtyPower',
  ];
  const bonusKeys = [
    't9TroopType',
    'readySpeedHero',
    'level50Hero',
    'bohUsefulRating',
    'rocLevel',
    'paidUsableHero',
    'loftyTroopMillion',
    'enhancedT10TroopMillion',
  ];
  return {
    id: requiredIdentifier(source.id, 'Scoring version ID'),
    version: boundedInteger(source.version, 'Scoring version', { minimum: 1, maximum: 1_000_000 }),
    label: boundedString(source.label, MAX_SHORT_TEXT_LENGTH, 'Scoring version label'),
    note: boundedString(source.note, MAX_NOTE_LENGTH, 'Scoring version note'),
    powerWeights: normalizeWeights(source.powerWeights || flattenedWeights, powerKeys),
    bonusWeights: normalizeWeights(source.bonusWeights || flattenedWeights, bonusKeys),
    powerDivisor: boundedNumber(source.powerDivisor, 'Power divisor', {
      minimum: 0.000001,
      maximum: 10 ** 15,
    }),
    precision: boundedInteger(source.precision, 'Scoring precision', {
      minimum: 0,
      maximum: 12,
    }),
  };
}

function normalizeRoleGroup(input, index = 0) {
  const source = requireRecord(input, `Role group ${index + 1}`);
  return {
    id: requiredIdentifier(firstDefined(source, ['id', 'roleGroupId']), 'Role group ID'),
    label: boundedString(source.label, MAX_NAME_LENGTH, 'Role group label', { required: true }),
    order: boundedInteger(source.order ?? index, 'Role group order', { minimum: 0, maximum: 100 }),
    color: boundedString(source.color, 40, 'Role group color'),
    capacity: boundedInteger(source.capacity, 'Role group capacity', { minimum: 0, maximum: 12 }),
  };
}

function normalizePhase(input, index = 0) {
  const source = requireRecord(input, `Phase ${index + 1}`);
  return {
    id: requiredIdentifier(source.id, 'Phase ID'),
    label: boundedString(source.label, MAX_NAME_LENGTH, 'Phase label', { required: true }),
    order: boundedInteger(source.order ?? index, 'Phase order', { minimum: 0, maximum: 100 }),
    startMinute: boundedNumber(source.startMinute, 'Phase start minute', {
      minimum: 0,
      maximum: 180,
    }),
    endMinute: boundedNumber(source.endMinute, 'Phase end minute', { minimum: 0, maximum: 180 }),
  };
}

function normalizeLegion(input, index = 0) {
  const source = requireRecord(input, `Legion ${index + 1}`);
  return {
    id: requiredIdentifier(source.id, 'Legion ID'),
    label: boundedString(source.label, MAX_NAME_LENGTH, 'Legion label', { required: true }),
    order: boundedInteger(source.order ?? index, 'Legion order', { minimum: 0, maximum: 100 }),
  };
}

function normalizeObjective(input, index = 0) {
  const source = requireRecord(input, `Objective ${index + 1}`);
  return {
    id: requiredIdentifier(source.id, 'Objective ID'),
    code: boundedString(source.code, 40, 'Objective code'),
    label: boundedString(source.label, MAX_NAME_LENGTH, 'Objective label', { required: true }),
    type: boundedString(source.type, 60, 'Objective type'),
    x: boundedNumber(source.x, 'Objective x coordinate', { minimum: 0, maximum: 100 }),
    y: boundedNumber(source.y, 'Objective y coordinate', { minimum: 0, maximum: 100 }),
  };
}

function normalizeInstructionContent(input = {}) {
  if (typeof input === 'string') {
    return {
      summary: boundedString(input, MAX_NOTE_LENGTH, 'Instruction summary'),
      action: '',
      target: '',
      startObjectiveId: '',
      objectiveId: '',
      targetLabel: '',
      loadout: '',
      teleport: null,
      note: '',
      priority: null,
      viaObjectiveIds: [],
      pathObjectiveIds: [],
    };
  }
  const source = optionalRecord(input);
  const rawTeleport = source.teleport;
  const output = {
    summary: boundedString(source.summary, MAX_NOTE_LENGTH, 'Instruction summary'),
    action: boundedString(
      firstDefined(source, ['action', 'actionCode']),
      100,
      'Instruction action'
    ),
    target: boundedString(source.target, MAX_SHORT_TEXT_LENGTH, 'Instruction target'),
    startObjectiveId: optionalIdentifier(source.startObjectiveId, 'Instruction start objective ID'),
    objectiveId: optionalIdentifier(
      firstDefined(source, ['objectiveId', 'targetId']),
      'Instruction objective ID'
    ),
    targetLabel: boundedString(source.targetLabel, MAX_NAME_LENGTH, 'Instruction target'),
    loadout: boundedString(source.loadout, MAX_SHORT_TEXT_LENGTH, 'Instruction loadout'),
    teleport:
      typeof rawTeleport === 'boolean'
        ? rawTeleport
        : boundedString(rawTeleport, MAX_SHORT_TEXT_LENGTH, 'Teleport instruction') || null,
    note: boundedString(source.note, MAX_NOTE_LENGTH, 'Instruction note'),
    priority: boundedInteger(source.priority, 'Instruction priority', { minimum: 0, maximum: 100 }),
    viaObjectiveIds: boundedStringArray(source.viaObjectiveIds || [], {
      label: 'Instruction via objectives',
      maxItems: 30,
      identifiers: true,
    }),
    pathObjectiveIds: boundedStringArray(source.pathObjectiveIds || [], {
      label: 'Instruction path objectives',
      maxItems: 30,
      identifiers: true,
    }),
  };
  for (const flag of ['standby', 'gatherCrystals']) {
    if (own(source, flag) && typeof source[flag] === 'boolean') output[flag] = source[flag];
  }
  return output;
}

function wildcardIdentifier(value, label, fallback = '*') {
  const candidate = value === undefined || value === null || value === '' ? fallback : value;
  return candidate === '*' ? '*' : requiredIdentifier(candidate, label);
}

function normalizeRule(input, index = 0) {
  const source = requireRecord(input, `Instruction rule ${index + 1}`);
  const instruction = normalizeInstructionContent(source.instruction || source);
  const output = {
    id: optionalIdentifier(source.id, 'Instruction rule ID'),
    teamId: wildcardIdentifier(source.teamId, 'Instruction team ID'),
    phaseId: wildcardIdentifier(source.phaseId, 'Instruction phase ID'),
    legionId: wildcardIdentifier(source.legionId, 'Instruction legion ID'),
    roleGroupId: optionalIdentifier(source.roleGroupId, 'Instruction role group ID'),
    seatNumber: boundedInteger(source.seatNumber, 'Instruction seat number', {
      minimum: 1,
      maximum: 12,
    }),
    playerId: boundedString(source.playerId, MAX_ID_LENGTH, 'Instruction player ID'),
    scope: boundedString(source.scope, 40, 'Instruction scope').toLowerCase(),
    scopeId: boundedString(source.scopeId, MAX_ID_LENGTH, 'Instruction scope ID'),
    order: boundedNumber(source.order ?? index + 1, 'Instruction order', {
      minimum: 0,
      maximum: 100_000,
    }),
    instruction,
  };
  if (!INSTRUCTION_SCOPES.has(output.scope)) {
    throw new AllStarBohValidationError('Instruction scope has an unsupported value.');
  }
  if (output.scope === 'player' && !output.playerId) {
    throw new AllStarBohValidationError('Player-scoped instructions require a player ID.');
  }
  return output;
}

function normalizeRotation(input, index = 0) {
  const source = requireRecord(input, `Rotation ${index + 1}`);
  return {
    id: optionalIdentifier(source.id, 'Rotation ID'),
    teamId: wildcardIdentifier(source.teamId, 'Rotation team ID'),
    phaseId: wildcardIdentifier(source.phaseId, 'Rotation phase ID'),
    legionId: wildcardIdentifier(source.legionId, 'Rotation legion ID'),
    playerId: boundedString(source.playerId, MAX_ID_LENGTH, 'Rotation player ID', {
      required: true,
    }),
    seatNumber: boundedInteger(
      firstDefined(source, ['seatNumber', 'toSeatNumber', 'targetSeatNumber']),
      'Rotation destination seat',
      { minimum: 1, maximum: 12 }
    ),
    roleGroupId: optionalIdentifier(source.roleGroupId, 'Rotation role group ID'),
    note: boundedString(source.note, MAX_NOTE_LENGTH, 'Rotation note'),
    order: boundedNumber(source.order ?? index + 1, 'Rotation order', {
      minimum: 0,
      maximum: 100_000,
    }),
  };
}

function normalizePlan(input = {}) {
  const source = optionalRecord(input);
  const plan = {
    schemaVersion: ALL_STAR_BOH_SCHEMA_VERSION,
    id: optionalIdentifier(source.id, 'Plan ID'),
    label: boundedString(source.label, MAX_NAME_LENGTH, 'Plan label'),
    roleGroups: boundedObjectArray(source.roleGroups || [], {
      label: 'Role groups',
      maxItems: 20,
      normalize: normalizeRoleGroup,
    }),
    phases: boundedObjectArray(source.phases || [], {
      label: 'Phases',
      maxItems: 20,
      normalize: normalizePhase,
    }),
    legions: boundedObjectArray(source.legions || [], {
      label: 'Legions',
      maxItems: 10,
      normalize: normalizeLegion,
    }),
    objectives: boundedObjectArray(source.objectives || [], {
      label: 'Objectives',
      maxItems: 100,
      normalize: normalizeObjective,
    }),
    roleDefaults: boundedObjectArray(source.roleDefaults || [], {
      label: 'Role default instructions',
      maxItems: 500,
      normalize: normalizeRule,
    }),
    seatOverrides: boundedObjectArray(source.seatOverrides || [], {
      label: 'Seat override instructions',
      maxItems: 576,
      normalize: normalizeRule,
    }),
    playerOverrides: boundedObjectArray(source.playerOverrides || [], {
      label: 'Player override instructions',
      maxItems: 576,
      normalize: normalizeRule,
    }),
    instructions: boundedObjectArray(source.instructions || [], {
      label: 'Instructions',
      maxItems: 1000,
      normalize: normalizeRule,
    }),
    rotations: boundedObjectArray(source.rotations || [], {
      label: 'Rotations',
      maxItems: 500,
      normalize: normalizeRotation,
    }),
    notes: boundedStringArray(source.notes || [], {
      label: 'Plan notes',
      maxItems: 100,
      maxLength: MAX_NOTE_LENGTH,
    }),
  };
  const objectiveIds = new Set(plan.objectives.map((objective) => objective.id));
  if (objectiveIds.size !== plan.objectives.length) {
    throw new AllStarBohValidationError('Plan objective IDs must be unique.');
  }
  for (const rule of [
    ...plan.roleDefaults,
    ...plan.seatOverrides,
    ...plan.playerOverrides,
    ...plan.instructions,
  ]) {
    for (const objectiveId of [
      rule.instruction.startObjectiveId,
      rule.instruction.objectiveId,
      ...rule.instruction.viaObjectiveIds,
      ...rule.instruction.pathObjectiveIds,
    ]) {
      if (objectiveId && !objectiveIds.has(objectiveId)) {
        throw new AllStarBohValidationError(
          `Instruction references unknown objective ${objectiveId}.`
        );
      }
    }
  }
  return plan;
}

function normalizePublishedPlan(input = {}) {
  const plan = normalizePlan(input);
  return {
    schemaVersion: plan.schemaVersion,
    id: plan.id,
    label: plan.label,
    roleGroups: plan.roleGroups,
    phases: plan.phases,
    legions: plan.legions,
    objectives: plan.objectives,
    roleDefaults: [],
    seatOverrides: [],
    playerOverrides: [],
    instructions: [],
    rotations: [],
    notes: [],
  };
}

function normalizePublishedTimelineEntry(input, index = 0) {
  const source = requireRecord(input, `Published timeline entry ${index + 1}`);
  return {
    teamId: requiredIdentifier(source.teamId, 'Timeline team ID'),
    playerId: boundedString(source.playerId, MAX_ID_LENGTH, 'Timeline player ID', {
      required: true,
    }),
    gameName: boundedString(source.gameName, MAX_NAME_LENGTH, 'Timeline player name'),
    phaseId: requiredIdentifier(source.phaseId, 'Timeline phase ID'),
    phaseLabel: boundedString(source.phaseLabel, MAX_NAME_LENGTH, 'Timeline phase label', {
      required: true,
    }),
    startMinute: boundedNumber(source.startMinute, 'Timeline start minute', {
      minimum: 0,
      maximum: 180,
    }),
    endMinute: boundedNumber(source.endMinute, 'Timeline end minute', {
      minimum: 0,
      maximum: 180,
    }),
    legionId: requiredIdentifier(source.legionId, 'Timeline Legion ID'),
    legionLabel: boundedString(source.legionLabel, MAX_NAME_LENGTH, 'Timeline Legion label', {
      required: true,
    }),
    seatNumber: boundedInteger(source.seatNumber, 'Timeline seat number', {
      minimum: 1,
      maximum: 12,
    }),
    baseSeatNumber: boundedInteger(source.baseSeatNumber, 'Timeline base seat number', {
      minimum: 1,
      maximum: 12,
    }),
    roleGroupId: requiredIdentifier(source.roleGroupId, 'Timeline role group ID'),
    roleLabel: boundedString(source.roleLabel, MAX_NAME_LENGTH, 'Timeline role label', {
      required: true,
    }),
    rotated: source.rotated === true,
    instruction: normalizeInstructionContent(source.instruction),
  };
}

function normalizePublishedTimeline(input) {
  return boundedObjectArray(input || [], {
    label: 'Published player timeline',
    maxItems: MAX_PUBLISHED_TIMELINE_ITEMS,
    normalize: normalizePublishedTimelineEntry,
  });
}

function normalizeSeat(input, index = 0, options = {}) {
  const source = requireRecord(input, `Seat ${index + 1}`);
  const seat = {
    id: optionalIdentifier(firstDefined(source, ['id', 'seatId']), 'Seat ID'),
    seatNumber: boundedInteger(
      firstDefined(source, ['seatNumber', 'number']) ?? index + 1,
      'Seat number',
      {
        minimum: 1,
        maximum: 12,
      }
    ),
    playerId: boundedString(
      firstDefined(source, ['playerId', 'uid']),
      MAX_ID_LENGTH,
      'Seat player ID'
    ),
    displayName: boundedString(
      firstDefined(source, ['displayName', 'gameName', 'name']),
      MAX_NAME_LENGTH,
      'Seat display name'
    ),
    roleGroupId: optionalIdentifier(
      firstDefined(source, ['roleGroupId', 'roleId']),
      'Seat role ID'
    ),
    roleLabel: boundedString(source.roleLabel, MAX_NAME_LENGTH, 'Seat role label'),
    side: boundedString(source.side, 60, 'Seat side'),
    lane: boundedString(source.lane, 60, 'Seat lane'),
  };
  if (!options.published) {
    seat.locked = source.locked === true;
    seat.score = boundedNumber(source.score, 'Seat score', {
      minimum: -(10 ** 12),
      maximum: 10 ** 12,
    });
  }
  return seat;
}

function validateSeats(seats) {
  const seatIds = new Set();
  const seatNumbers = new Set();
  const playerIds = new Set();
  for (const seat of seats) {
    if (seat.id && seatIds.has(seat.id)) {
      throw new AllStarBohValidationError(`Duplicate seat ID ${seat.id}.`);
    }
    if (seat.id) seatIds.add(seat.id);
    if (seatNumbers.has(seat.seatNumber)) {
      throw new AllStarBohValidationError(`Duplicate seat number ${seat.seatNumber}.`);
    }
    seatNumbers.add(seat.seatNumber);
    if (!seat.playerId) continue;
    if (playerIds.has(seat.playerId)) {
      throw new AllStarBohValidationError(`Player ${seat.playerId} occupies multiple seats.`);
    }
    playerIds.add(seat.playerId);
  }
}

function normalizeCoLeaderIds(input) {
  const coLeaderIds = boundedStringArray(input || [], {
    label: 'Team co-leaders',
    maxItems: 2,
    maxLength: MAX_ID_LENGTH,
    identifiers: true,
  });
  if (coLeaderIds.length !== (input || []).filter((value) => String(value ?? '').trim()).length) {
    throw new AllStarBohValidationError('Team co-leaders must be unique.');
  }
  return coLeaderIds;
}

function normalizeTeam(input = {}, options = {}) {
  const source = requireRecord(input, options.published ? 'Published team' : 'Draft team');
  const seats = boundedObjectArray(source.seats || source.players || source.members || [], {
    label: 'Team seats',
    maxItems: 12,
    normalize: (seat, index) => normalizeSeat(seat, index, options),
  });
  validateSeats(seats);
  const output = {
    name: boundedString(firstDefined(source, ['name', 'label']), MAX_NAME_LENGTH, 'Team name', {
      required: true,
    }),
    number: boundedInteger(source.number, 'Team number', { minimum: 1, maximum: 6 }),
    color: boundedString(source.color, 40, 'Team color'),
    captainId: boundedString(source.captainId, MAX_ID_LENGTH, 'Captain ID'),
    coLeaderIds: normalizeCoLeaderIds(source.coLeaderIds || source.coleaderIds || source.coLeaders),
    seats,
  };
  const includePlan = !options.published || options.includePlan === true;
  if (includePlan) output.plan = normalizePlan(source.plan);
  if (!options.published) {
    output.scoreTotal = boundedNumber(
      firstDefined(source, ['scoreTotal', 'totalScore']),
      'Team score total',
      { minimum: -(10 ** 12), maximum: 10 ** 12 }
    );
    output.scoreAverage = boundedNumber(
      firstDefined(source, ['scoreAverage', 'averageScore']),
      'Team score average',
      { minimum: -(10 ** 12), maximum: 10 ** 12 }
    );
    output.notes = boundedString(source.notes, MAX_NOTE_LENGTH, 'Team admin notes');
  }
  assertDocumentSize(output, options.published ? MAX_TEAM_BYTES : MAX_DRAFT_BYTES, 'Team');
  return output;
}

function normalizeDraftTeamCount(source) {
  if (!own(source, 'teamCount')) return ALL_STAR_BOH_MAX_TEAMS;
  const teamCount = boundedInteger(source.teamCount, 'Draft team count', {
    minimum: 2,
    maximum: ALL_STAR_BOH_MAX_TEAMS,
  });
  if (teamCount === null) {
    throw new AllStarBohValidationError('Draft team count is required.');
  }
  return teamCount;
}

function normalizeDraftBalanceMetric(source) {
  if (!own(source, 'balanceMetric')) return 'score';
  const balanceMetric = boundedString(source.balanceMetric, 40, 'Draft balance metric', {
    required: true,
  });
  if (!DRAFT_BALANCE_METRICS.has(balanceMetric)) {
    throw new AllStarBohValidationError('Draft balance metric has an unsupported value.');
  }
  return balanceMetric;
}

function normalizeForcedTeamAssignments(input) {
  const assignments = boundedObjectArray(input || [], {
    label: 'Forced team assignments',
    maxItems: ALL_STAR_BOH_MAX_PLAYERS,
    normalize: (item, index) => {
      const source = requireRecord(item, `Forced team assignment ${index + 1}`);
      return {
        playerId: boundedString(source.playerId, MAX_ID_LENGTH, 'Forced player ID', {
          required: true,
        }),
        teamId: requiredIdentifier(source.teamId, 'Forced team ID'),
      };
    },
  });
  const playerIds = new Set();
  for (const assignment of assignments) {
    if (playerIds.has(assignment.playerId)) {
      throw new AllStarBohValidationError(
        `Player ${assignment.playerId} has more than one forced team assignment.`
      );
    }
    playerIds.add(assignment.playerId);
  }
  return assignments;
}

function normalizeEpicPlanningOverrides(input) {
  const overrides = boundedObjectArray(input || [], {
    label: 'Epic planning overrides',
    maxItems: ALL_STAR_BOH_MAX_PLAYERS,
    normalize: (item, index) => {
      const source = requireRecord(item, `Epic planning override ${index + 1}`);
      const laneOverride = boundedString(
        source.laneOverride,
        MAX_NAME_LENGTH,
        'Epic planning lane override'
      ).toLocaleLowerCase();
      if (!EPIC_PLANNING_LANE_OVERRIDES.has(laneOverride)) {
        throw new AllStarBohValidationError('Epic planning lane override is unsupported.');
      }
      return {
        playerId: boundedString(source.playerId, MAX_ID_LENGTH, 'Epic planning player ID', {
          required: true,
        }),
        excluded: source.excluded === true,
        laneOverride,
        groupId: boundedString(source.groupId, MAX_NAME_LENGTH, 'Epic planning group'),
      };
    },
  });
  const playerIds = new Set();
  for (const override of overrides) {
    if (playerIds.has(override.playerId)) {
      throw new AllStarBohValidationError(
        `Player ${override.playerId} has more than one Epic planning override.`
      );
    }
    playerIds.add(override.playerId);
  }
  return overrides;
}

function normalizeCommitmentScoreAdjustments(input) {
  const adjustments = boundedObjectArray(input || [], {
    label: 'Commitment score adjustments',
    maxItems: ALL_STAR_BOH_MAX_PLAYERS,
    normalize: (item, index) => {
      const source = requireRecord(item, `Commitment score adjustment ${index + 1}`);
      const score = boundedInteger(source.score, 'Commitment score adjustment score', {
        minimum: 1,
        maximum: 10_000,
      });
      if (score === null) {
        throw new AllStarBohValidationError('Commitment score adjustment score is required.');
      }
      return {
        playerId: boundedString(
          source.playerId,
          MAX_ID_LENGTH,
          'Commitment score adjustment player ID',
          { required: true }
        ),
        score,
        reason: boundedString(source.reason, MAX_NOTE_LENGTH, 'Commitment score adjustment reason'),
      };
    },
  });
  const playerIds = new Set();
  for (const adjustment of adjustments) {
    const playerId = adjustment.playerId;
    if (playerIds.has(playerId)) {
      throw new AllStarBohValidationError(
        `Player ${adjustment.playerId} has more than one commitment score adjustment.`
      );
    }
    playerIds.add(playerId);
  }
  return adjustments;
}
export function normalizeAllStarBohDraft(input = {}) {
  const source = requireRecord(input, 'Admin draft');
  assertNoPrivateBinary(source, 'Admin draft');
  const scoringSource = optionalRecord(source.scoring);
  const output = {
    teamCount: normalizeDraftTeamCount(source),
    balanceMetric: normalizeDraftBalanceMetric(source),
    forcedTeamAssignments: normalizeForcedTeamAssignments(source.forcedTeamAssignments),
    epicPlanningOverrides: normalizeEpicPlanningOverrides(source.epicPlanningOverrides),
    title: boundedString(source.title, MAX_NAME_LENGTH, 'Draft title'),
    note: boundedString(source.note, MAX_NOTE_LENGTH, 'Draft note'),
    activeScoringVersionId: optionalIdentifier(
      firstDefined(scoringSource, ['activeVersionId', 'activeVersion']) ||
        source.activeScoringVersionId,
      'Active scoring version ID'
    ),
    scoringVersions: boundedObjectArray(scoringSource.versions || source.scoringVersions || [], {
      label: 'Scoring versions',
      maxItems: 30,
      normalize: normalizeScoringVersion,
    }),
    commitmentScoreAdjustments: normalizeCommitmentScoreAdjustments(
      source.commitmentScoreAdjustments
    ),
    scoreOverrides: boundedObjectArray(source.scoreOverrides || [], {
      label: 'Score overrides',
      maxItems: ALL_STAR_BOH_MAX_PLAYERS,
      normalize: (item, index) => {
        const override = requireRecord(item, `Score override ${index + 1}`);
        return {
          playerId: boundedString(override.playerId, MAX_ID_LENGTH, 'Override player ID', {
            required: true,
          }),
          score: boundedNumber(override.score, 'Override score', {
            minimum: -(10 ** 12),
            maximum: 10 ** 12,
          }),
          reason: boundedString(override.reason, MAX_NOTE_LENGTH, 'Override reason'),
        };
      },
    }),
    teamIds: boundedStringArray(source.teamIds || [], {
      label: 'Draft team IDs',
      maxItems: ALL_STAR_BOH_MAX_TEAMS,
      identifiers: true,
    }),
    playerIds: boundedStringArray(source.playerIds || [], {
      label: 'Draft player IDs',
      maxItems: ALL_STAR_BOH_MAX_PLAYERS,
      maxLength: MAX_ID_LENGTH,
    }),
    plan: normalizePlan(source.plan),
    publications: {
      announcement: source.publications?.announcement === true,
      plan: source.publications?.plan === true,
    },
  };
  assertDocumentSize(output, MAX_DRAFT_BYTES, 'Admin draft');
  return output;
}

function resolveDraftTeamIds(draft) {
  const teamIds = [];
  for (const rawTeamId of draft?.teamIds || []) {
    const teamId = String(rawTeamId || '').trim();
    if (teamId && !teamIds.includes(teamId)) teamIds.push(teamId);
    if (teamIds.length === draft.teamCount) break;
  }
  for (let number = 1; teamIds.length < draft.teamCount; number += 1) {
    const fallbackTeamId = `team-${number}`;
    if (!teamIds.includes(fallbackTeamId)) teamIds.push(fallbackTeamId);
  }
  return teamIds;
}

function planReferencesPlayer(plan, playerIds) {
  return [
    ...plan.roleDefaults,
    ...plan.seatOverrides,
    ...plan.playerOverrides,
    ...plan.instructions,
    ...plan.rotations,
  ].some((item) => playerIds.has(item.playerId));
}

function removePlanPlayerReferences(plan, playerIds) {
  return {
    ...plan,
    roleDefaults: plan.roleDefaults.filter((rule) => !playerIds.has(rule.playerId)),
    seatOverrides: plan.seatOverrides.filter((rule) => !playerIds.has(rule.playerId)),
    playerOverrides: plan.playerOverrides.filter((rule) => !playerIds.has(rule.playerId)),
    instructions: plan.instructions.filter((rule) => !playerIds.has(rule.playerId)),
    rotations: plan.rotations.filter((rotation) => !playerIds.has(rotation.playerId)),
  };
}

export function normalizeAllStarBohDraftTeam(input = {}) {
  const source = requireRecord(input, 'Draft team');
  assertNoPrivateBinary(source, 'Draft team');
  return normalizeTeam(source, { published: false });
}

function normalizePublishedCurrent(input = {}) {
  const source = requireRecord(input, 'Published overview');
  assertNoPrivateBinary(source, 'Published overview');
  const output = {
    status: normalizedEnum(source.status, PUBLICATION_STATUS, 'hidden', 'Publication status'),
    eventName: boundedString(source.eventName, MAX_NAME_LENGTH, 'Event name'),
    title: boundedString(source.title, MAX_NAME_LENGTH, 'Publication title'),
    subtitle: boundedString(source.subtitle, MAX_SHORT_TEXT_LENGTH, 'Publication subtitle'),
    message: boundedString(source.message, MAX_NOTE_LENGTH, 'Publication message'),
    announcementPublished: source.announcementPublished === true,
    planPublished: source.planPublished === true || source.plansPublished === true,
    activePlanRevision: boundedInteger(source.activePlanRevision, 'Active plan revision', {
      minimum: 0,
      maximum: 1_000_000,
    }),
    teamCount: boundedInteger(source.teamCount, 'Published team count', {
      minimum: 0,
      maximum: ALL_STAR_BOH_MAX_TEAMS,
    }),
    rosterSize: boundedInteger(source.rosterSize, 'Published roster size', {
      minimum: 0,
      maximum: 12,
    }),
    teamIds: boundedStringArray(source.teamIds || [], {
      label: 'Published team IDs',
      maxItems: ALL_STAR_BOH_MAX_TEAMS,
      identifiers: true,
    }),
    phases: boundedObjectArray(source.phases || [], {
      label: 'Published phases',
      maxItems: 20,
      normalize: normalizePhase,
    }),
    legions: boundedObjectArray(source.legions || [], {
      label: 'Published legions',
      maxItems: 10,
      normalize: normalizeLegion,
    }),
  };
  if (!output.announcementPublished) {
    Object.assign(output, {
      eventName: '',
      title: '',
      subtitle: '',
      message: '',
      activePlanRevision: null,
      teamCount: 0,
      rosterSize: 0,
      teamIds: [],
      phases: [],
      legions: [],
    });
  }
  assertDocumentSize(output, MAX_PUBLICATION_BYTES, 'Published overview');
  return output;
}

export function normalizeAllStarBohPublishedTeam(input = {}) {
  const source = requireRecord(input, 'Published team');
  assertNoPrivateBinary(source, 'Published team');
  return normalizeTeam(source, { published: true, includePlan: false });
}

export function normalizeAllStarBohPublishedPlayer(input = {}, options = {}) {
  const source = requireRecord(input, 'Published player plan');
  assertNoPrivateBinary(source, 'Published player plan');
  const output = {
    playerId: boundedString(source.playerId, MAX_ID_LENGTH, 'Published player ID', {
      required: true,
    }),
    displayName: boundedString(source.displayName, MAX_NAME_LENGTH, 'Player display name'),
    teamId: requiredIdentifier(source.teamId, 'Player team ID'),
    teamName: boundedString(source.teamName, MAX_NAME_LENGTH, 'Player team name'),
    teamNumber: boundedInteger(source.teamNumber, 'Player team number', {
      minimum: 1,
      maximum: ALL_STAR_BOH_MAX_TEAMS,
    }),
    teamColor: boundedString(source.teamColor, 40, 'Player team color'),
    seatNumber: boundedInteger(source.seatNumber, 'Player seat number', {
      minimum: 1,
      maximum: 12,
    }),
    roleGroupId: optionalIdentifier(
      firstDefined(source, ['roleGroupId', 'roleId']),
      'Player role ID'
    ),
    roleLabel: boundedString(source.roleLabel, MAX_NAME_LENGTH, 'Player role label'),
    announcement: boundedString(source.announcement, MAX_NOTE_LENGTH, 'Player announcement'),
  };
  const includePlan = options.includePlan ?? (own(source, 'plan') || own(source, 'timeline'));
  if (includePlan) {
    const timeline = normalizePublishedTimeline(source.timeline);
    const referencedObjectiveIds = new Set(
      timeline.flatMap((entry) => [
        entry.instruction.startObjectiveId,
        entry.instruction.objectiveId,
        ...entry.instruction.viaObjectiveIds,
        ...entry.instruction.pathObjectiveIds,
      ])
    );
    const plan = normalizePublishedPlan(source.plan);
    const availableObjectiveIds = new Set(plan.objectives.map((objective) => objective.id));
    for (const objectiveId of referencedObjectiveIds) {
      if (objectiveId && !availableObjectiveIds.has(objectiveId)) {
        throw new AllStarBohValidationError(
          `Published timeline references unknown objective ${objectiveId}.`
        );
      }
    }
    output.plan = {
      ...plan,
      objectives: plan.objectives.filter((objective) => referencedObjectiveIds.has(objective.id)),
    };
    output.timeline = timeline;
  }
  assertDocumentSize(output, MAX_PERSONAL_PLAN_BYTES, 'Published player plan');
  return output;
}

export function getAllStarBohSeasonPath(seasonId) {
  return `${ALL_STAR_BOH_ROOT_COLLECTION}/${requiredIdentifier(seasonId, 'Season ID', 80)}`;
}

export function getAllStarBohSubmissionPath(seasonId, uid) {
  return `${getAllStarBohSeasonPath(seasonId)}/submissions/${requiredIdentifier(uid, 'User ID')}`;
}

export function getAllStarBohReviewPath(seasonId, uid) {
  return `${getAllStarBohSeasonPath(seasonId)}/reviews/${requiredIdentifier(uid, 'User ID')}`;
}

export function getAllStarBohFeedbackPath(seasonId, uid) {
  return `${getAllStarBohSeasonPath(seasonId)}/feedback/${requiredIdentifier(uid, 'User ID')}`;
}

export function getAllStarBohEpicPreferencesPath(seasonId, uid) {
  return `${getAllStarBohSeasonPath(seasonId)}/epicPreferences/${requiredIdentifier(uid, 'User ID')}`;
}

export function getAllStarBohDraftPath(seasonId) {
  return `${getAllStarBohSeasonPath(seasonId)}/drafts/current`;
}

export function getAllStarBohPublicationIndexPath(seasonId) {
  return `${getAllStarBohSeasonPath(seasonId)}/drafts/publication-index`;
}

export function getAllStarBohDraftTeamPath(seasonId, teamId) {
  return `${getAllStarBohSeasonPath(seasonId)}/draftTeams/${requiredIdentifier(teamId, 'Team ID')}`;
}

export function getAllStarBohPublishedPath(seasonId) {
  return `${getAllStarBohSeasonPath(seasonId)}/published/current`;
}

export function getAllStarBohPublishedTeamPath(seasonId, teamId) {
  return `${getAllStarBohSeasonPath(seasonId)}/publishedTeams/${requiredIdentifier(teamId, 'Team ID')}`;
}

export function getAllStarBohPublishedPlayerPath(seasonId, uid) {
  return `${getAllStarBohSeasonPath(seasonId)}/publishedPlayers/${requiredIdentifier(uid, 'User ID')}`;
}

export function getAllStarBohEventSchedulePath(seasonId) {
  return `${getAllStarBohSeasonPath(seasonId)}/schedules/current`;
}

// Compatibility alias for callers released before the event-schedule naming was made explicit.
export const getAllStarBohSchedulePath = getAllStarBohEventSchedulePath;

export class AllStarBohValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AllStarBohValidationError';
    this.code = 'all-star-boh-invalid-data';
  }
}

export class AllStarBohConflictError extends Error {
  constructor(path, expectedRevision, actualRevision) {
    super(
      `All-Star BoH data changed in another session (expected revision ${expectedRevision}, found ${actualRevision}).`
    );
    this.name = 'AllStarBohConflictError';
    this.code = 'all-star-boh-conflict';
    this.path = path;
    this.expectedRevision = expectedRevision;
    this.actualRevision = actualRevision;
  }
}

export class AllStarBohAdminRequiredError extends Error {
  constructor() {
    super('All-Star BoH administration requires the Firebase admin custom claim.');
    this.name = 'AllStarBohAdminRequiredError';
    this.code = 'all-star-boh-admin-required';
  }
}

export class AllStarBohPublishValidationError extends Error {
  constructor(message = 'The All-Star BoH publication did not pass validation.') {
    super(message);
    this.name = 'AllStarBohPublishValidationError';
    this.code = 'all-star-boh-publish-invalid';
  }
}

function resolveContext(options) {
  const context = optionalRecord(options.context);
  return {
    seasonId: requiredIdentifier(options.seasonId ?? context.seasonId, 'Season ID', 80),
    uid: requiredIdentifier(options.uid ?? context.uid, 'User ID'),
    admin: options.admin ?? context.admin,
  };
}

function validateFirestore(options, requiredMethods) {
  const firestore = optionalRecord(options.firestore);
  const missing = requiredMethods.filter((name) => typeof firestore[name] !== 'function');
  if (!options.db || missing.length) {
    throw new Error(
      `All-Star BoH store is missing ${[
        !options.db ? 'db' : '',
        ...missing.map((name) => `firestore.${name}`),
      ]
        .filter(Boolean)
        .join(', ')}.`
    );
  }
}

function documentRef(firestore, db, path) {
  return firestore.doc(db, path);
}

/** Read the single admin-only season config shared by the PIN gate and Firestore rules. */
export async function getAllStarBohActiveConfig(options = {}) {
  validateFirestore(options, ['doc', 'getDoc']);
  const snapshot = await options.firestore.getDoc(
    documentRef(options.firestore, options.db, ALL_STAR_BOH_CONFIG_PATH)
  );
  const raw = snapshotData(snapshot);
  if (!raw) {
    throw new AllStarBohValidationError('The active All-Star BoH season is not configured.');
  }
  const activeSeason = requiredIdentifier(raw.activeSeason, 'Active All-Star BoH season', 80);
  if (typeof raw.open !== 'boolean') {
    throw new AllStarBohValidationError('The All-Star BoH open setting must be a boolean.');
  }
  const grantDurationMinutes = boundedInteger(
    raw.grantDurationMinutes,
    'All-Star BoH grant duration',
    { minimum: 5, maximum: 10_080 }
  );
  if (grantDurationMinutes === null) {
    throw new AllStarBohValidationError('The All-Star BoH grant duration is required.');
  }
  return Object.freeze({ activeSeason, open: raw.open, grantDurationMinutes });
}

function collectionRef(firestore, db, path) {
  return firestore.collection(db, path);
}

function parseStoredDocument(raw, identity, normalizeContent) {
  if (!raw) return null;
  const normalized = normalizeContent(raw);
  return cloneValue({ ...normalized, ...metadataForRead(raw, identity) });
}

function createSubscriptionManager(firestore) {
  const subscriptions = new Set();

  function subscribe(ref, normalize, next, error = () => {}) {
    if (typeof next !== 'function') {
      throw new TypeError('All-Star BoH snapshot subscriptions require a callback.');
    }
    const state = { active: true, unsubscribe: null };
    const guardedNext = (snapshot) => {
      if (!state.active) return;
      try {
        next(normalize(snapshot));
      } catch (cause) {
        error(cause);
      }
    };
    const guardedError = (cause) => {
      if (state.active) error(cause);
    };
    try {
      state.unsubscribe = firestore.onSnapshot(ref, guardedNext, guardedError);
    } catch (cause) {
      state.active = false;
      throw cause;
    }
    subscriptions.add(state);
    return () => {
      if (!state.active) return;
      state.active = false;
      subscriptions.delete(state);
      try {
        state.unsubscribe?.();
      } catch {
        // Listener teardown is best-effort.
      }
    };
  }

  function stop() {
    for (const state of [...subscriptions]) {
      state.active = false;
      subscriptions.delete(state);
      try {
        state.unsubscribe?.();
      } catch {
        // Listener teardown is best-effort.
      }
    }
  }

  return { subscribe, stop };
}

async function saveRevisionedDocument(options) {
  const {
    db,
    firestore,
    ref,
    path,
    identity,
    input,
    expectedRevision,
    normalizeContent,
    maxBytes,
    uid,
  } = options;
  assertInputIdentity(input, identity);
  const content = normalizeContent(input);
  assertDocumentSize(content, maxBytes, options.label);
  let payload = null;
  await firestore.runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ref);
    const existing = snapshotData(snapshot);
    const actualRevision = existing
      ? normalizeRevision(existing.revision ?? 0, 'Stored revision')
      : 0;
    if (actualRevision !== expectedRevision) {
      throw new AllStarBohConflictError(path, expectedRevision, actualRevision);
    }
    const writeContent = { ...content };
    for (const field of options.immutableContentFields || []) {
      const existingValue = existing?.[field];
      const nextValue = writeContent[field];
      if (existingValue && nextValue && String(existingValue) !== String(nextValue)) {
        throw new AllStarBohValidationError(`${field} cannot be changed.`);
      }
      if (existingValue && !nextValue) writeContent[field] = existingValue;
      if (!existingValue && !nextValue && options.contentDefaults?.[field]) {
        writeContent[field] = options.contentDefaults[field];
      }
    }
    const serverTimestamp = firestore.serverTimestamp();
    payload = {
      ...writeContent,
      ...metadataForWrite(existing, identity, expectedRevision, uid, serverTimestamp),
    };
    transaction.set(ref, payload);
  });
  return cloneValue(payload);
}

function normalizeSubmissionDocument(raw, seasonId, uid, options = {}) {
  return parseStoredDocument(raw, { seasonId, uid }, (value) =>
    normalizeAllStarBohSubmission(value, options)
  );
}

function normalizeReviewDocument(raw, seasonId, uid) {
  return parseStoredDocument(raw, { seasonId, uid }, normalizeAllStarBohReview);
}

function normalizeFeedbackDocument(raw, seasonId, uid) {
  return parseStoredDocument(raw, { seasonId, uid }, normalizeAllStarBohFeedback);
}

function normalizeEpicPreferencesDocument(raw, seasonId, uid, timeSlotIds) {
  return parseStoredDocument(raw, { seasonId, uid }, (value) =>
    normalizeAllStarBohEpicPreferences(value, { timeSlotIds })
  );
}

function playerSafeFeedback(raw, seasonId, uid) {
  const feedback = normalizeFeedbackDocument(raw, seasonId, uid);
  return {
    status: feedback.status,
    note: feedback.note,
    submissionRevision: feedback.submissionRevision,
    reviewRevision: feedback.reviewRevision,
    revision: feedback.revision,
    updatedAt: feedback.updatedAt,
    updatedAtMs: feedback.updatedAtMs,
  };
}

function normalizeDraftDocument(raw, seasonId) {
  return parseStoredDocument(raw, { seasonId }, normalizeAllStarBohDraft);
}

function normalizeDraftTeamDocument(raw, seasonId, teamId) {
  return parseStoredDocument(raw, { seasonId, teamId }, normalizeAllStarBohDraftTeam);
}

function normalizePublishedDocument(raw, seasonId) {
  return parseStoredDocument(raw, { seasonId }, normalizePublishedCurrent);
}

function normalizePublishedTeamDocument(raw, seasonId, teamId) {
  return parseStoredDocument(raw, { seasonId, teamId }, normalizeAllStarBohPublishedTeam);
}

function normalizePublishedPlayerDocument(raw, seasonId, uid) {
  return parseStoredDocument(raw, { seasonId, uid }, normalizeAllStarBohPublishedPlayer);
}

function normalizeScheduleDocument(raw, seasonId) {
  return parseStoredDocument(raw, { seasonId }, (value) =>
    normalizeAllStarBohEventSchedule(value, { seasonId })
  );
}

function parseDocumentSnapshot(snapshot, normalize) {
  const raw = snapshotData(snapshot);
  return raw ? normalize(raw) : null;
}

export function createAllStarBohPlayerStore(options = {}) {
  validateFirestore(options, ['doc', 'getDoc', 'onSnapshot', 'runTransaction', 'serverTimestamp']);
  const { seasonId, uid } = resolveContext(options);
  const { db, firestore } = options;
  const subscriptions = createSubscriptionManager(firestore);
  const heroNames = normalizePlanningCatalog(options.heroNames, 'Hero catalog', {
    maxItems: ALL_STAR_BOH_MAX_USABLE_HERO_NAMES,
  });
  const researchTreeIds = normalizePlanningCatalog(
    options.researchTreeIds,
    'Research tree catalog',
    { maxLength: MAX_ID_LENGTH }
  );
  const submissionPlanningOptions = Object.freeze({
    ...(heroNames === null ? {} : { heroNames: Object.freeze(heroNames) }),
    ...(researchTreeIds === null ? {} : { researchTreeIds: Object.freeze(researchTreeIds) }),
  });
  const submissionReadOptions = Object.freeze({
    ...submissionPlanningOptions,
    allowLegacyFightingTimeIds: true,
  });
  const epicTimeSlotIds = Object.freeze(
    normalizeEpicTimeSlotIds(
      options.epicTimeSlotIds === undefined
        ? ALL_STAR_BOH_EPIC_SHOWDOWN_DEFAULT_TIME_SLOT_IDS
        : options.epicTimeSlotIds,
      'Configured Epic Showdown time slots'
    )
  );
  const submissionPath = getAllStarBohSubmissionPath(seasonId, uid);
  const submissionRef = documentRef(firestore, db, submissionPath);
  const feedbackRef = documentRef(firestore, db, getAllStarBohFeedbackPath(seasonId, uid));
  const epicPreferencesPath = getAllStarBohEpicPreferencesPath(seasonId, uid);
  const epicPreferencesRef = documentRef(firestore, db, epicPreferencesPath);
  const schedulePath = getAllStarBohEventSchedulePath(seasonId);
  const scheduleRef = documentRef(firestore, db, schedulePath);

  async function getSubmission() {
    const snapshot = await firestore.getDoc(submissionRef);
    return parseDocumentSnapshot(snapshot, (raw) =>
      normalizeSubmissionDocument(raw, seasonId, uid, submissionReadOptions)
    );
  }

  async function saveSubmission(input, saveOptions = {}) {
    const authenticatedSubmission = requireRecord(input, 'Player submission');
    if (authenticatedSubmission.playerId && authenticatedSubmission.playerId !== uid) {
      throw new AllStarBohValidationError('playerId cannot be changed.');
    }
    return saveRevisionedDocument({
      db,
      firestore,
      ref: submissionRef,
      path: submissionPath,
      identity: { seasonId, uid },
      input: authenticatedSubmission,
      expectedRevision: resolveExpectedRevision(input, saveOptions),
      normalizeContent: (value) =>
        normalizeAllStarBohSubmission(value, {
          ...submissionPlanningOptions,
          requireFightingTimeIds: true,
          requireVtsMembership: true,
        }),
      maxBytes: MAX_SUBMISSION_BYTES,
      label: 'Player submission',
      uid,
      immutableContentFields: ['playerId'],
      contentDefaults: { playerId: uid },
    });
  }

  function subscribeSubmission(next, error) {
    return subscriptions.subscribe(
      submissionRef,
      (snapshot) =>
        parseDocumentSnapshot(snapshot, (raw) =>
          normalizeSubmissionDocument(raw, seasonId, uid, submissionReadOptions)
        ),
      next,
      error
    );
  }

  async function getSubmissionFeedback() {
    const snapshot = await firestore.getDoc(feedbackRef);
    return parseDocumentSnapshot(snapshot, (raw) => playerSafeFeedback(raw, seasonId, uid));
  }

  function subscribeSubmissionFeedback(next, error) {
    return subscriptions.subscribe(
      feedbackRef,
      (snapshot) =>
        parseDocumentSnapshot(snapshot, (raw) => playerSafeFeedback(raw, seasonId, uid)),
      next,
      error
    );
  }

  async function getEpicShowdownPreferences() {
    const snapshot = await firestore.getDoc(epicPreferencesRef);
    return parseDocumentSnapshot(snapshot, (raw) =>
      normalizeEpicPreferencesDocument(raw, seasonId, uid, epicTimeSlotIds)
    );
  }

  async function saveEpicShowdownPreferences(input, saveOptions = {}) {
    const preferences = requireRecord(input, 'Epic Showdown preferences');
    return saveRevisionedDocument({
      db,
      firestore,
      ref: epicPreferencesRef,
      path: epicPreferencesPath,
      identity: { seasonId, uid },
      input: preferences,
      expectedRevision: resolveExpectedRevision(input, saveOptions),
      normalizeContent: (value) =>
        normalizeAllStarBohEpicPreferences(value, { timeSlotIds: epicTimeSlotIds }),
      maxBytes: MAX_EPIC_PREFERENCES_BYTES,
      label: 'Epic Showdown preferences',
      uid,
    });
  }

  function subscribeEpicShowdownPreferences(next, error) {
    return subscriptions.subscribe(
      epicPreferencesRef,
      (snapshot) =>
        parseDocumentSnapshot(snapshot, (raw) =>
          normalizeEpicPreferencesDocument(raw, seasonId, uid, epicTimeSlotIds)
        ),
      next,
      error
    );
  }

  async function getPublication() {
    const ref = documentRef(firestore, db, getAllStarBohPublishedPath(seasonId));
    const snapshot = await firestore.getDoc(ref);
    return parseDocumentSnapshot(snapshot, (raw) => normalizePublishedDocument(raw, seasonId));
  }

  function subscribePublication(next, error) {
    const ref = documentRef(firestore, db, getAllStarBohPublishedPath(seasonId));
    return subscriptions.subscribe(
      ref,
      (snapshot) =>
        parseDocumentSnapshot(snapshot, (raw) => normalizePublishedDocument(raw, seasonId)),
      next,
      error
    );
  }

  async function getPublishedTeam(teamIdInput) {
    const teamId = requiredIdentifier(teamIdInput, 'Team ID');
    const ref = documentRef(firestore, db, getAllStarBohPublishedTeamPath(seasonId, teamId));
    const snapshot = await firestore.getDoc(ref);
    return parseDocumentSnapshot(snapshot, (raw) =>
      normalizePublishedTeamDocument(raw, seasonId, teamId)
    );
  }

  function subscribePublishedTeam(teamIdInput, next, error) {
    const teamId = requiredIdentifier(teamIdInput, 'Team ID');
    const ref = documentRef(firestore, db, getAllStarBohPublishedTeamPath(seasonId, teamId));
    return subscriptions.subscribe(
      ref,
      (snapshot) =>
        parseDocumentSnapshot(snapshot, (raw) =>
          normalizePublishedTeamDocument(raw, seasonId, teamId)
        ),
      next,
      error
    );
  }

  async function getPersonalPlan() {
    const ref = documentRef(firestore, db, getAllStarBohPublishedPlayerPath(seasonId, uid));
    const snapshot = await firestore.getDoc(ref);
    return parseDocumentSnapshot(snapshot, (raw) =>
      normalizePublishedPlayerDocument(raw, seasonId, uid)
    );
  }

  function subscribePersonalPlan(next, error) {
    const ref = documentRef(firestore, db, getAllStarBohPublishedPlayerPath(seasonId, uid));
    return subscriptions.subscribe(
      ref,
      (snapshot) =>
        parseDocumentSnapshot(snapshot, (raw) =>
          normalizePublishedPlayerDocument(raw, seasonId, uid)
        ),
      next,
      error
    );
  }

  async function getEventSchedule() {
    const snapshot = await firestore.getDoc(scheduleRef);
    return parseDocumentSnapshot(snapshot, (raw) => normalizeScheduleDocument(raw, seasonId));
  }

  function subscribeEventSchedule(next, error) {
    return subscriptions.subscribe(
      scheduleRef,
      (snapshot) =>
        parseDocumentSnapshot(snapshot, (raw) => normalizeScheduleDocument(raw, seasonId)),
      next,
      error
    );
  }

  return Object.freeze({
    seasonId,
    uid,
    epicTimeSlotIds,
    getSubmission,
    saveSubmission,
    subscribeSubmission,
    getSubmissionFeedback,
    subscribeSubmissionFeedback,
    getEpicShowdownPreferences,
    saveEpicShowdownPreferences,
    subscribeEpicShowdownPreferences,
    getPublication,
    subscribePublication,
    getPublishedTeam,
    subscribePublishedTeam,
    getPersonalPlan,
    subscribePersonalPlan,
    getEventSchedule,
    subscribeEventSchedule,
    getSchedule: getEventSchedule,
    subscribeSchedule: subscribeEventSchedule,
    stop: subscriptions.stop,
  });
}

function entriesFromCollectionSnapshot(snapshot) {
  if (Array.isArray(snapshot?.docs)) return snapshot.docs;
  const docs = [];
  if (typeof snapshot?.forEach === 'function')
    snapshot.forEach((docSnapshot) => docs.push(docSnapshot));
  return docs;
}

function normalizeBundleEntries(input, options) {
  const entries = Array.isArray(input)
    ? input.map((value) => [value?.[options.idField], value])
    : Object.entries(optionalRecord(input));
  if (entries.length > options.maximum) {
    throw new AllStarBohPublishValidationError(
      `A publication is limited to ${options.maximum} ${options.label}.`
    );
  }
  const output = new Map();
  for (const [keyInput, valueInput] of entries) {
    const value = requireRecord(valueInput, `Published ${options.label}`);
    const key = requiredIdentifier(keyInput || value[options.idField], options.idLabel);
    if (own(value, options.idField) && String(value[options.idField]) !== key) {
      throw new AllStarBohPublishValidationError(
        `${options.idLabel} does not match its publication key.`
      );
    }
    if (output.has(key)) {
      throw new AllStarBohPublishValidationError(`Duplicate ${options.idLabel}: ${key}.`);
    }
    output.set(key, options.normalize(value));
  }
  return output;
}

function instructionHasContent(instruction = {}) {
  return Object.entries(instruction).some(([key, value]) => {
    if ((key === 'standby' || key === 'gatherCrystals') && value === false) return false;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'string') return value.trim().length > 0;
    return value !== null && value !== undefined;
  });
}

function validatePersonalPlanProjection(current, teamId, player) {
  const phaseById = new Map(current.phases.map((phase) => [phase.id, phase]));
  const legionById = new Map(current.legions.map((legion) => [legion.id, legion]));
  const planPhaseIds = new Set(player.plan?.phases.map((phase) => phase.id) || []);
  const planLegionIds = new Set(player.plan?.legions.map((legion) => legion.id) || []);
  if (
    planPhaseIds.size !== phaseById.size ||
    [...phaseById.keys()].some((phaseId) => !planPhaseIds.has(phaseId)) ||
    planLegionIds.size !== legionById.size ||
    [...legionById.keys()].some((legionId) => !planLegionIds.has(legionId))
  ) {
    throw new AllStarBohPublishValidationError(
      `Player ${player.playerId} requires the published four-phase, two-Legion plan metadata.`
    );
  }

  const expectedKeys = new Set();
  for (const legionId of legionById.keys()) {
    for (const phaseId of phaseById.keys()) expectedKeys.add(`${legionId}:${phaseId}`);
  }
  const actualKeys = new Set();
  for (const entry of player.timeline || []) {
    const key = `${entry.legionId}:${entry.phaseId}`;
    const phase = phaseById.get(entry.phaseId);
    const legion = legionById.get(entry.legionId);
    if (!phase || !legion || actualKeys.has(key)) {
      throw new AllStarBohPublishValidationError(
        `Player ${player.playerId} timeline must contain each phase and Legion exactly once.`
      );
    }
    actualKeys.add(key);
    if (entry.teamId !== teamId || entry.playerId !== player.playerId) {
      throw new AllStarBohPublishValidationError(
        `Player ${player.playerId} timeline identity does not match its personal projection.`
      );
    }
    if (
      entry.phaseLabel !== phase.label ||
      entry.startMinute !== phase.startMinute ||
      entry.endMinute !== phase.endMinute ||
      entry.legionLabel !== legion.label
    ) {
      throw new AllStarBohPublishValidationError(
        `Player ${player.playerId} timeline metadata differs from the published plan.`
      );
    }
    if (entry.baseSeatNumber !== player.seatNumber) {
      throw new AllStarBohPublishValidationError(
        `Player ${player.playerId} timeline base seat does not match its published seat.`
      );
    }
    if (!instructionHasContent(entry.instruction)) {
      throw new AllStarBohPublishValidationError(
        `Player ${player.playerId} timeline has an empty instruction for ${entry.phaseId} and ${entry.legionId}.`
      );
    }
  }
  if (
    actualKeys.size !== expectedKeys.size ||
    [...expectedKeys].some((key) => !actualKeys.has(key))
  ) {
    throw new AllStarBohPublishValidationError(
      `Player ${player.playerId} timeline requires all eight phase and Legion assignments.`
    );
  }
}

function validatePublicationReferences(current, teams, players) {
  if (current.planPublished && !current.announcementPublished) {
    throw new AllStarBohPublishValidationError(
      'A team plan cannot be published before the team announcement.'
    );
  }
  if (!current.announcementPublished) {
    if (current.status !== 'hidden') {
      throw new AllStarBohPublishValidationError(
        'An unpublished season overview must remain hidden.'
      );
    }
    if (teams.size || players.size) {
      throw new AllStarBohPublishValidationError(
        'Hidden publication state cannot include member roster projections.'
      );
    }
    return;
  }
  if (current.planPublished && !['plan', 'live'].includes(current.status)) {
    throw new AllStarBohPublishValidationError(
      'A published plan requires plan or live publication status.'
    );
  }
  if (!current.planPublished && !['announcement', 'live'].includes(current.status)) {
    throw new AllStarBohPublishValidationError(
      'A team announcement requires announcement or live publication status.'
    );
  }
  const teamCount = teams.size;
  if (teamCount < 2 || teamCount > ALL_STAR_BOH_MAX_TEAMS) {
    throw new AllStarBohPublishValidationError(
      `A team announcement requires between 2 and ${ALL_STAR_BOH_MAX_TEAMS} teams.`
    );
  }
  const expectedPlayerCount = teamCount * 12;
  if (players.size !== expectedPlayerCount) {
    throw new AllStarBohPublishValidationError(
      `A ${teamCount}-team announcement requires exactly ${expectedPlayerCount} player projections.`
    );
  }
  if (current.teamCount !== null && current.teamCount !== teamCount) {
    throw new AllStarBohPublishValidationError(
      `Published team count must match the ${teamCount} published teams.`
    );
  }
  if (
    current.teamIds.length > 0 &&
    (current.teamIds.length !== teamCount || current.teamIds.some((teamId) => !teams.has(teamId)))
  ) {
    throw new AllStarBohPublishValidationError(
      'Published team IDs must match the published team documents.'
    );
  }
  if (current.rosterSize !== null && current.rosterSize !== 12) {
    throw new AllStarBohPublishValidationError('Published roster size must be 12.');
  }
  if (current.planPublished && (current.phases.length !== 4 || current.legions.length !== 2)) {
    throw new AllStarBohPublishValidationError(
      'A published plan requires exactly four phases and two Legions.'
    );
  }

  const assignedPlayers = new Set();
  const projectionByPlayerId = new Map();
  for (const [uid, player] of players) {
    if (projectionByPlayerId.has(player.playerId)) {
      throw new AllStarBohPublishValidationError(
        `Player ${player.playerId} has more than one personal projection.`
      );
    }
    projectionByPlayerId.set(player.playerId, { uid, player });
  }
  const teamNumbers = new Set();
  for (const [teamId, team] of teams) {
    if (teamNumbers.has(team.number)) {
      throw new AllStarBohPublishValidationError(
        `Published team number ${team.number} is duplicated.`
      );
    }
    teamNumbers.add(team.number);
    if (team.seats.length !== 12) {
      throw new AllStarBohPublishValidationError(`Team ${teamId} must contain exactly 12 seats.`);
    }
    const teamPlayerIds = new Set();
    for (const seat of team.seats) {
      if (!seat.playerId || !seat.roleGroupId) {
        throw new AllStarBohPublishValidationError(
          `Every seat in team ${teamId} requires a player and role.`
        );
      }
      if (assignedPlayers.has(seat.playerId)) {
        throw new AllStarBohPublishValidationError(
          `Player ${seat.playerId} is assigned to more than one published seat.`
        );
      }
      assignedPlayers.add(seat.playerId);
      teamPlayerIds.add(seat.playerId);
      if (!projectionByPlayerId.has(seat.playerId)) {
        throw new AllStarBohPublishValidationError(
          `Player ${seat.playerId} has no personal published plan.`
        );
      }
      if (projectionByPlayerId.get(seat.playerId).player.teamId !== teamId) {
        throw new AllStarBohPublishValidationError(
          `Player ${seat.playerId} points to a different published team.`
        );
      }
      const personal = projectionByPlayerId.get(seat.playerId).player;
      if (
        personal.seatNumber !== seat.seatNumber ||
        personal.teamNumber !== team.number ||
        personal.teamName !== team.name ||
        personal.roleGroupId !== seat.roleGroupId
      ) {
        throw new AllStarBohPublishValidationError(
          `Player ${seat.playerId} personal projection does not match the published seat.`
        );
      }
      if (personal.displayName && seat.displayName && personal.displayName !== seat.displayName) {
        throw new AllStarBohPublishValidationError(
          `Player ${seat.playerId} display name differs between team and personal projections.`
        );
      }
      if (current.planPublished) validatePersonalPlanProjection(current, teamId, personal);
    }
    if (!team.captainId || !teamPlayerIds.has(team.captainId)) {
      throw new AllStarBohPublishValidationError(
        `Team ${teamId} requires a captain assigned to one of its seats.`
      );
    }
    for (const coLeaderId of team.coLeaderIds) {
      if (coLeaderId === team.captainId) {
        throw new AllStarBohPublishValidationError(
          `Team ${teamId} co-leader cannot be the captain.`
        );
      }
      if (!teamPlayerIds.has(coLeaderId)) {
        throw new AllStarBohPublishValidationError(
          `Team ${teamId} co-leader ${coLeaderId} must be assigned to one of its seats.`
        );
      }
    }
  }
  for (const [uid, player] of players) {
    if (!teams.has(player.teamId)) {
      throw new AllStarBohPublishValidationError(
        `Player projection ${uid} points to missing team ${player.teamId}.`
      );
    }
    if (!assignedPlayers.has(player.playerId)) {
      throw new AllStarBohPublishValidationError(
        `Player ${player.playerId} has a personal plan but no published seat.`
      );
    }
  }
  if (assignedPlayers.size !== expectedPlayerCount) {
    throw new AllStarBohPublishValidationError(
      `Published seats must contain ${expectedPlayerCount} unique players.`
    );
  }
}

export function createAllStarBohAdminStore(options = {}) {
  validateFirestore(options, [
    'doc',
    'collection',
    'getDoc',
    'getDocs',
    'onSnapshot',
    'runTransaction',
    'serverTimestamp',
  ]);
  const context = resolveContext(options);
  const { seasonId, uid } = context;
  const { db, firestore } = options;
  const subscriptions = createSubscriptionManager(firestore);
  const heroNames = normalizePlanningCatalog(options.heroNames, 'Hero catalog', {
    maxItems: ALL_STAR_BOH_MAX_USABLE_HERO_NAMES,
  });
  const researchTreeIds = normalizePlanningCatalog(
    options.researchTreeIds,
    'Research tree catalog',
    { maxLength: MAX_ID_LENGTH }
  );
  const submissionPlanningOptions = Object.freeze({
    ...(heroNames === null ? {} : { heroNames: Object.freeze(heroNames) }),
    ...(researchTreeIds === null ? {} : { researchTreeIds: Object.freeze(researchTreeIds) }),
  });
  const submissionReadOptions = Object.freeze({
    ...submissionPlanningOptions,
    allowLegacyFightingTimeIds: true,
  });
  const epicTimeSlotIds = Object.freeze(
    normalizeEpicTimeSlotIds(
      options.epicTimeSlotIds === undefined
        ? ALL_STAR_BOH_EPIC_SHOWDOWN_DEFAULT_TIME_SLOT_IDS
        : options.epicTimeSlotIds,
      'Configured Epic Showdown time slots'
    )
  );
  const adminCheck = options.isAdmin;

  async function ensureAdmin() {
    const allowed =
      typeof adminCheck === 'function'
        ? await adminCheck({ seasonId, uid })
        : context.admin === true;
    if (allowed !== true) throw new AllStarBohAdminRequiredError();
  }

  function submissionsRef() {
    return collectionRef(firestore, db, `${getAllStarBohSeasonPath(seasonId)}/submissions`);
  }

  function parseSubmissionCollection(snapshot) {
    return entriesFromCollectionSnapshot(snapshot)
      .map((docSnapshot) => {
        const targetUid = requiredIdentifier(snapshotId(docSnapshot), 'Submission user ID');
        const raw = snapshotData(docSnapshot);
        if (!raw) return null;
        return normalizeSubmissionDocument(raw, seasonId, targetUid, submissionReadOptions);
      })
      .filter(Boolean);
  }

  async function listSubmissions() {
    await ensureAdmin();
    const snapshot = await firestore.getDocs(submissionsRef());
    return cloneValue(parseSubmissionCollection(snapshot));
  }

  async function subscribeSubmissions(next, error) {
    await ensureAdmin();
    return subscriptions.subscribe(submissionsRef(), parseSubmissionCollection, next, error);
  }

  async function deleteSubmission(targetUidInput, deleteOptions = {}) {
    await ensureAdmin();
    const targetUid = requiredIdentifier(targetUidInput, 'Submission user ID');
    const expectedRevision = normalizeRevision(
      deleteOptions.expectedRevision ?? 0,
      'Expected submission revision'
    );
    const submissionPath = getAllStarBohSubmissionPath(seasonId, targetUid);
    const submissionRef = documentRef(firestore, db, submissionPath);
    const reviewRef = documentRef(firestore, db, getAllStarBohReviewPath(seasonId, targetUid));
    const feedbackRef = documentRef(firestore, db, getAllStarBohFeedbackPath(seasonId, targetUid));
    const draftPath = getAllStarBohDraftPath(seasonId);
    const draftRef = documentRef(firestore, db, draftPath);
    await firestore.runTransaction(db, async (transaction) => {
      const submissionSnapshot = await transaction.get(submissionRef);
      const draftSnapshot = await transaction.get(draftRef);
      const submission = snapshotData(submissionSnapshot);
      if (!submission) {
        throw new AllStarBohValidationError('The selected signup no longer exists.');
      }
      assertStoredIdentity(submission, { seasonId, uid: targetUid });
      const storedPlayerId = own(submission, 'playerId')
        ? requiredIdentifier(submission.playerId, 'Stored submission player ID')
        : targetUid;
      const playerIds = new Set([targetUid, storedPlayerId]);
      const existingDraft = snapshotData(draftSnapshot);
      if (existingDraft) assertStoredIdentity(existingDraft, { seasonId });
      const draft = existingDraft ? normalizeAllStarBohDraft(existingDraft) : null;
      const teamRefs = new Map(
        (draft ? resolveDraftTeamIds(draft) : []).map((teamId) => [
          teamId,
          documentRef(firestore, db, getAllStarBohDraftTeamPath(seasonId, teamId)),
        ])
      );
      const teamSnapshots = new Map(
        await Promise.all(
          [...teamRefs].map(async ([teamId, ref]) => [teamId, await transaction.get(ref)])
        )
      );
      const actualRevision = normalizeRevision(
        submission.revision ?? 0,
        'Stored submission revision'
      );
      if (actualRevision !== expectedRevision) {
        throw new AllStarBohConflictError(submissionPath, expectedRevision, actualRevision);
      }

      const nextDraft = draft
        ? {
            ...draft,
            playerIds: draft.playerIds.filter((playerId) => !playerIds.has(playerId)),
            forcedTeamAssignments: draft.forcedTeamAssignments.filter(
              (assignment) => !playerIds.has(assignment.playerId)
            ),
            commitmentScoreAdjustments: draft.commitmentScoreAdjustments.filter(
              (adjustment) => !playerIds.has(adjustment.playerId)
            ),
            scoreOverrides: draft.scoreOverrides.filter(
              (override) => !playerIds.has(override.playerId)
            ),
            plan: {
              ...removePlanPlayerReferences(draft.plan, playerIds),
            },
          }
        : null;
      const draftChanged = Boolean(draft && JSON.stringify(nextDraft) !== JSON.stringify(draft));
      const changedTeams = new Map();
      for (const [teamId, teamSnapshot] of teamSnapshots) {
        const existingTeam = snapshotData(teamSnapshot);
        if (!existingTeam) continue;
        assertStoredIdentity(existingTeam, { seasonId, teamId });
        const team = normalizeAllStarBohDraftTeam(existingTeam);
        const hasPlayerSeat = team.seats.some((seat) => playerIds.has(seat.playerId));
        const hasPlayerCaptain = playerIds.has(team.captainId);
        const hasPlayerPlanReference = planReferencesPlayer(team.plan, playerIds);
        if (!hasPlayerSeat && !hasPlayerCaptain && !hasPlayerPlanReference) continue;
        const seats = team.seats.map((seat) =>
          playerIds.has(seat.playerId)
            ? { ...seat, playerId: '', displayName: '', locked: false, score: null }
            : seat
        );
        const occupiedScores = seats
          .filter((seat) => seat.playerId && Number.isFinite(seat.score))
          .map((seat) => seat.score);
        changedTeams.set(teamId, {
          existingTeam,
          team: {
            ...team,
            captainId: hasPlayerCaptain ? '' : team.captainId,
            seats,
            plan: removePlanPlayerReferences(team.plan, playerIds),
            scoreTotal: occupiedScores.reduce((total, score) => total + score, 0),
            scoreAverage: occupiedScores.length
              ? occupiedScores.reduce((total, score) => total + score, 0) / occupiedScores.length
              : 0,
          },
        });
      }

      const serverTimestamp = firestore.serverTimestamp();
      if (draftChanged) {
        const draftRevision = normalizeRevision(
          existingDraft.revision ?? 0,
          'Stored draft revision'
        );
        transaction.set(draftRef, {
          ...nextDraft,
          ...metadataForWrite(existingDraft, { seasonId }, draftRevision, uid, serverTimestamp),
        });
      }
      for (const [teamId, details] of changedTeams) {
        const teamRevision = normalizeRevision(
          details.existingTeam.revision ?? 0,
          `Stored ${teamId} revision`
        );
        transaction.set(teamRefs.get(teamId), {
          ...normalizeAllStarBohDraftTeam(details.team),
          ...metadataForWrite(
            details.existingTeam,
            { seasonId, teamId },
            teamRevision,
            uid,
            serverTimestamp
          ),
        });
      }
      transaction.delete(submissionRef);
      transaction.delete(reviewRef);
      transaction.delete(feedbackRef);
    });
    return Object.freeze({ uid: targetUid, deleted: true });
  }

  function epicPreferencesCollectionRef() {
    return collectionRef(firestore, db, `${getAllStarBohSeasonPath(seasonId)}/epicPreferences`);
  }

  function parseEpicPreferencesCollection(snapshot) {
    return entriesFromCollectionSnapshot(snapshot)
      .map((docSnapshot) => {
        const targetUid = requiredIdentifier(snapshotId(docSnapshot), 'Epic preferences user ID');
        const raw = snapshotData(docSnapshot);
        if (!raw) return null;
        return normalizeEpicPreferencesDocument(raw, seasonId, targetUid, epicTimeSlotIds);
      })
      .filter(Boolean);
  }

  async function getEpicShowdownPreferencesList() {
    await ensureAdmin();
    const snapshot = await firestore.getDocs(epicPreferencesCollectionRef());
    return cloneValue(parseEpicPreferencesCollection(snapshot));
  }

  async function subscribeEpicShowdownPreferences(next, error) {
    await ensureAdmin();
    return subscriptions.subscribe(
      epicPreferencesCollectionRef(),
      parseEpicPreferencesCollection,
      next,
      error
    );
  }

  async function getPublication() {
    await ensureAdmin();
    const ref = documentRef(firestore, db, getAllStarBohPublishedPath(seasonId));
    const snapshot = await firestore.getDoc(ref);
    return parseDocumentSnapshot(snapshot, (raw) => normalizePublishedDocument(raw, seasonId));
  }

  async function getEventSchedule() {
    await ensureAdmin();
    const path = getAllStarBohEventSchedulePath(seasonId);
    const snapshot = await firestore.getDoc(documentRef(firestore, db, path));
    return parseDocumentSnapshot(snapshot, (raw) => normalizeScheduleDocument(raw, seasonId));
  }

  async function subscribeEventSchedule(next, error) {
    await ensureAdmin();
    const ref = documentRef(firestore, db, getAllStarBohEventSchedulePath(seasonId));
    return subscriptions.subscribe(
      ref,
      (snapshot) =>
        parseDocumentSnapshot(snapshot, (raw) => normalizeScheduleDocument(raw, seasonId)),
      next,
      error
    );
  }

  async function saveEventSchedule(input, saveOptions = {}) {
    await ensureAdmin();
    if (!Array.isArray(saveOptions.teamIds)) {
      throw new AllStarBohValidationError('Event schedule team IDs must be an array.');
    }
    const teamIds = boundedStringArray(saveOptions.teamIds, {
      label: 'Event schedule team IDs',
      maxItems: ALL_STAR_BOH_MAX_TEAMS,
      maxLength: MAX_ID_LENGTH,
      identifiers: true,
    });
    if (teamIds.length !== saveOptions.teamIds.length) {
      throw new AllStarBohValidationError('Event schedule team IDs must be unique.');
    }
    const path = getAllStarBohEventSchedulePath(seasonId);
    return saveRevisionedDocument({
      db,
      firestore,
      ref: documentRef(firestore, db, path),
      path,
      identity: { seasonId },
      input: requireRecord(input, 'Event schedule'),
      expectedRevision: resolveExpectedRevision(input, saveOptions),
      normalizeContent: (value) => {
        const schedule = normalizeAllStarBohEventSchedule(value, { seasonId });
        const allowedTeamIds = new Set(teamIds);
        for (const gameTime of schedule.teamGameTimes) {
          if (!allowedTeamIds.has(gameTime.teamId)) {
            throw new AllStarBohValidationError(
              `Event schedule team ${gameTime.teamId} is not part of this season.`
            );
          }
        }
        return schedule;
      },
      maxBytes: MAX_SCHEDULE_BYTES,
      label: 'Event schedule',
      uid,
    });
  }

  async function subscribePublication(next, error) {
    await ensureAdmin();
    const ref = documentRef(firestore, db, getAllStarBohPublishedPath(seasonId));
    return subscriptions.subscribe(
      ref,
      (snapshot) =>
        parseDocumentSnapshot(snapshot, (raw) => normalizePublishedDocument(raw, seasonId)),
      next,
      error
    );
  }

  async function getReview(targetUidInput) {
    await ensureAdmin();
    const targetUid = requiredIdentifier(targetUidInput, 'Review user ID');
    const reviewRef = documentRef(firestore, db, getAllStarBohReviewPath(seasonId, targetUid));
    const submissionRef = documentRef(
      firestore,
      db,
      getAllStarBohSubmissionPath(seasonId, targetUid)
    );
    const [reviewSnapshot, submissionSnapshot] = await Promise.all([
      firestore.getDoc(reviewRef),
      firestore.getDoc(submissionRef),
    ]);
    const review = parseDocumentSnapshot(reviewSnapshot, (raw) =>
      normalizeReviewDocument(raw, seasonId, targetUid)
    );
    if (!review) return null;
    const submission = snapshotData(submissionSnapshot);
    const submissionRevision = submission
      ? normalizeRevision(submission.revision ?? 0, 'Stored submission revision')
      : null;
    return cloneValue({
      ...review,
      stale: submissionRevision === null || review.submissionRevision !== submissionRevision,
      currentSubmissionRevision: submissionRevision,
    });
  }

  async function subscribeReview(targetUidInput, next, error) {
    await ensureAdmin();
    const targetUid = requiredIdentifier(targetUidInput, 'Review user ID');
    if (typeof next !== 'function') {
      throw new TypeError('All-Star BoH review subscriptions require a callback.');
    }
    const reviewRef = documentRef(firestore, db, getAllStarBohReviewPath(seasonId, targetUid));
    const submissionRef = documentRef(
      firestore,
      db,
      getAllStarBohSubmissionPath(seasonId, targetUid)
    );
    let reviewReady = false;
    let submissionReady = false;
    let review = null;
    let submissionRevision = null;
    const emit = () => {
      if (!reviewReady || !submissionReady) return;
      next(
        review
          ? cloneValue({
              ...review,
              stale:
                submissionRevision === null || review.submissionRevision !== submissionRevision,
              currentSubmissionRevision: submissionRevision,
            })
          : null
      );
    };
    const unsubscribeReview = subscriptions.subscribe(
      reviewRef,
      (snapshot) =>
        parseDocumentSnapshot(snapshot, (raw) => normalizeReviewDocument(raw, seasonId, targetUid)),
      (value) => {
        reviewReady = true;
        review = value;
        emit();
      },
      error
    );
    let unsubscribeSubmission;
    try {
      unsubscribeSubmission = subscriptions.subscribe(
        submissionRef,
        (snapshot) => {
          const raw = snapshotData(snapshot);
          if (!raw) return null;
          assertStoredIdentity(raw, { seasonId, uid: targetUid });
          return normalizeRevision(raw.revision ?? 0, 'Stored submission revision');
        },
        (value) => {
          submissionReady = true;
          submissionRevision = value;
          emit();
        },
        error
      );
    } catch (cause) {
      unsubscribeReview();
      throw cause;
    }
    return () => {
      unsubscribeReview();
      unsubscribeSubmission();
    };
  }

  async function saveReview(targetUidInput, input, saveOptions = {}) {
    await ensureAdmin();
    const targetUid = requiredIdentifier(targetUidInput, 'Review user ID');
    const reviewInput = requireRecord(input, 'Submission review');
    const normalizedReviewInput = normalizeAllStarBohReview(reviewInput);
    const inputHasSubmissionCorrection = own(reviewInput, 'submissionCorrection');
    const expectedRevision = resolveExpectedRevision(reviewInput, saveOptions);
    const expectedSubmissionRevisionInput =
      saveOptions.submissionRevision ?? reviewInput.submissionRevision;
    if (expectedSubmissionRevisionInput === null || expectedSubmissionRevisionInput === undefined) {
      throw new AllStarBohValidationError(
        'Reviews require the submission revision that was reviewed.'
      );
    }
    const expectedSubmissionRevision = normalizeRevision(
      expectedSubmissionRevisionInput,
      'Expected submission revision'
    );
    const reviewPath = getAllStarBohReviewPath(seasonId, targetUid);
    const submissionPath = getAllStarBohSubmissionPath(seasonId, targetUid);
    const feedbackPath = getAllStarBohFeedbackPath(seasonId, targetUid);
    const reviewRef = documentRef(firestore, db, reviewPath);
    const submissionRef = documentRef(firestore, db, submissionPath);
    const feedbackRef = documentRef(firestore, db, feedbackPath);
    let payload = null;
    let feedbackPayload = null;
    await firestore.runTransaction(db, async (transaction) => {
      const reviewSnapshot = await transaction.get(reviewRef);
      const submissionSnapshot = await transaction.get(submissionRef);
      const feedbackSnapshot = await transaction.get(feedbackRef);
      const existingReview = snapshotData(reviewSnapshot);
      const submission = snapshotData(submissionSnapshot);
      const existingFeedback = snapshotData(feedbackSnapshot);
      const actualReviewRevision = existingReview
        ? normalizeRevision(existingReview.revision ?? 0, 'Stored review revision')
        : 0;
      if (actualReviewRevision !== expectedRevision) {
        throw new AllStarBohConflictError(reviewPath, expectedRevision, actualReviewRevision);
      }
      if (!submission) {
        throw new AllStarBohValidationError('A review requires an existing player submission.');
      }
      assertStoredIdentity(submission, { seasonId, uid: targetUid });
      const actualSubmissionRevision = normalizeRevision(
        submission.revision ?? 0,
        'Stored submission revision'
      );
      if (expectedSubmissionRevision !== actualSubmissionRevision) {
        throw new AllStarBohConflictError(
          submissionPath,
          expectedSubmissionRevision,
          actualSubmissionRevision
        );
      }
      const content = { ...normalizedReviewInput };
      if (
        !inputHasSubmissionCorrection &&
        existingReview &&
        existingReview.stale !== true &&
        existingReview.submissionRevision === actualSubmissionRevision &&
        own(existingReview, 'submissionCorrection')
      ) {
        const existingSubmissionCorrection =
          normalizeAllStarBohReview(existingReview).submissionCorrection;
        if (existingSubmissionCorrection)
          content.submissionCorrection = existingSubmissionCorrection;
      }
      assertDocumentSize(content, MAX_REVIEW_BYTES, 'Submission review');
      const normalizedSubmission = normalizeSubmissionDocument(
        submission,
        seasonId,
        targetUid,
        submissionReadOptions
      );
      const effectiveSubmission = applyAllStarBohSubmissionCorrections(normalizedSubmission, {
        ...content,
        submissionRevision: actualSubmissionRevision,
      });
      normalizeAllStarBohSubmission(effectiveSubmission, {
        ...submissionPlanningOptions,
        requireFightingTimeIds: true,
        requireVtsMembership: true,
        allowLegacyFightingTimeIds: true,
      });

      const serverTimestamp = firestore.serverTimestamp();
      payload = {
        ...content,
        submissionRevision: actualSubmissionRevision,
        ...metadataForWrite(
          existingReview,
          { seasonId, uid: targetUid },
          expectedRevision,
          uid,
          serverTimestamp
        ),
      };
      const feedbackRevision = existingFeedback
        ? normalizeRevision(existingFeedback.revision ?? 0, 'Stored feedback revision')
        : 0;
      const feedbackStatus = {
        verified: 'confirmed',
        needs_changes: 'needs_correction',
        rejected: 'excluded',
        pending: 'pending',
      }[content.status];
      const feedbackMetadata = metadataForWrite(
        existingFeedback,
        { seasonId, uid: targetUid },
        feedbackRevision,
        uid,
        serverTimestamp
      );
      delete feedbackMetadata.updatedBy;
      feedbackPayload = {
        status: feedbackStatus || 'pending',
        note: content.note,
        submissionRevision: actualSubmissionRevision,
        reviewRevision: expectedRevision + 1,
        ...feedbackMetadata,
      };
      transaction.set(reviewRef, payload);
      transaction.set(feedbackRef, feedbackPayload);
    });
    return cloneValue({
      ...payload,
      stale: false,
      currentSubmissionRevision: payload.submissionRevision,
    });
  }

  async function getDraft() {
    await ensureAdmin();
    const path = getAllStarBohDraftPath(seasonId);
    const snapshot = await firestore.getDoc(documentRef(firestore, db, path));
    return parseDocumentSnapshot(snapshot, (raw) => normalizeDraftDocument(raw, seasonId));
  }

  async function subscribeDraft(next, error) {
    await ensureAdmin();
    const ref = documentRef(firestore, db, getAllStarBohDraftPath(seasonId));
    return subscriptions.subscribe(
      ref,
      (snapshot) => parseDocumentSnapshot(snapshot, (raw) => normalizeDraftDocument(raw, seasonId)),
      next,
      error
    );
  }

  async function saveDraft(input, saveOptions = {}) {
    await ensureAdmin();
    const path = getAllStarBohDraftPath(seasonId);
    return saveRevisionedDocument({
      db,
      firestore,
      ref: documentRef(firestore, db, path),
      path,
      identity: { seasonId },
      input: requireRecord(input, 'Admin draft'),
      expectedRevision: resolveExpectedRevision(input, saveOptions),
      normalizeContent: normalizeAllStarBohDraft,
      maxBytes: MAX_DRAFT_BYTES,
      label: 'Admin draft',
      uid,
    });
  }

  async function getDraftTeam(teamIdInput) {
    await ensureAdmin();
    const teamId = requiredIdentifier(teamIdInput, 'Team ID');
    const path = getAllStarBohDraftTeamPath(seasonId, teamId);
    const snapshot = await firestore.getDoc(documentRef(firestore, db, path));
    return parseDocumentSnapshot(snapshot, (raw) =>
      normalizeDraftTeamDocument(raw, seasonId, teamId)
    );
  }

  async function subscribeDraftTeam(teamIdInput, next, error) {
    await ensureAdmin();
    const teamId = requiredIdentifier(teamIdInput, 'Team ID');
    const ref = documentRef(firestore, db, getAllStarBohDraftTeamPath(seasonId, teamId));
    return subscriptions.subscribe(
      ref,
      (snapshot) =>
        parseDocumentSnapshot(snapshot, (raw) => normalizeDraftTeamDocument(raw, seasonId, teamId)),
      next,
      error
    );
  }

  async function saveDraftTeam(teamIdInput, input, saveOptions = {}) {
    await ensureAdmin();
    const teamId = requiredIdentifier(teamIdInput, 'Team ID');
    const path = getAllStarBohDraftTeamPath(seasonId, teamId);
    return saveRevisionedDocument({
      db,
      firestore,
      ref: documentRef(firestore, db, path),
      path,
      identity: { seasonId, teamId },
      input: requireRecord(input, 'Draft team'),
      expectedRevision: resolveExpectedRevision(input, saveOptions),
      normalizeContent: normalizeAllStarBohDraftTeam,
      maxBytes: MAX_TEAM_BYTES,
      label: 'Draft team',
      uid,
    });
  }

  async function saveDraftBundle(bundleInput, saveOptions = {}) {
    await ensureAdmin();
    const bundle = requireRecord(bundleInput, 'Draft bundle');
    assertNoPrivateBinary(bundle, 'Draft bundle');
    const hasDraft = own(bundle, 'draft') && bundle.draft !== null && bundle.draft !== undefined;
    const teamEntries = Object.entries(optionalRecord(bundle.teams)).sort(([left], [right]) =>
      left.localeCompare(right)
    );
    if (!hasDraft && !teamEntries.length) {
      throw new AllStarBohValidationError('A draft bundle requires a draft or at least one team.');
    }
    if (teamEntries.length > ALL_STAR_BOH_MAX_TEAMS) {
      throw new AllStarBohValidationError(
        `A draft bundle is limited to ${ALL_STAR_BOH_MAX_TEAMS} teams.`
      );
    }

    let draft = null;
    let expectedDraftRevision = null;
    if (hasDraft) {
      if (!own(saveOptions, 'expectedDraftRevision')) {
        throw new AllStarBohValidationError(
          'A draft bundle requires an explicit expected draft revision.'
        );
      }
      const draftInput = requireRecord(bundle.draft, 'Admin draft');
      assertInputIdentity(draftInput, { seasonId });
      draft = normalizeAllStarBohDraft(draftInput);
      assertDocumentSize(draft, MAX_DRAFT_BYTES, 'Admin draft');
      expectedDraftRevision = normalizeRevision(
        saveOptions.expectedDraftRevision,
        'Expected draft revision'
      );
    }

    const expectedTeamRevisions = optionalRecord(saveOptions.expectedTeamRevisions);
    const suppliedTeamRevisionIds = Object.keys(expectedTeamRevisions).sort();
    const requestedTeamIds = teamEntries.map(([teamId]) => teamId).sort();
    if (
      suppliedTeamRevisionIds.length !== requestedTeamIds.length ||
      requestedTeamIds.some((teamId, index) => suppliedTeamRevisionIds[index] !== teamId)
    ) {
      throw new AllStarBohValidationError(
        'A draft bundle requires exactly one expected revision for every supplied team.'
      );
    }
    const teams = new Map();
    const assignedPlayerIds = new Set();
    for (const [teamIdInput, teamInputValue] of teamEntries) {
      const teamId = requiredIdentifier(teamIdInput, 'Team ID');
      const teamInput = requireRecord(teamInputValue, `Draft team ${teamId}`);
      assertInputIdentity(teamInput, { seasonId, teamId });
      const team = normalizeAllStarBohDraftTeam(teamInput);
      assertDocumentSize(team, MAX_TEAM_BYTES, `Draft team ${teamId}`);
      for (const seat of team.seats) {
        if (!seat.playerId) continue;
        if (assignedPlayerIds.has(seat.playerId)) {
          throw new AllStarBohValidationError(
            `Player ${seat.playerId} occupies multiple teams in the draft bundle.`
          );
        }
        assignedPlayerIds.add(seat.playerId);
      }
      const expectedRevision = normalizeRevision(
        expectedTeamRevisions[teamId],
        `Expected revision for team ${teamId}`
      );
      teams.set(teamId, { team, expectedRevision });
    }

    const expectedSubmissionRevisions = normalizeSourceRevisionGuards(
      saveOptions.expectedSubmissionRevisions,
      {
        label: 'Submission source',
        revisionCount: 1,
        revisionLabels: ['revision'],
      }
    );
    const expectedReviewRevisions = normalizeSourceRevisionGuards(
      saveOptions.expectedReviewRevisions,
      {
        label: 'Review source',
        revisionCount: 2,
        revisionLabels: ['revision', 'submission revision'],
      }
    );

    const draftPath = hasDraft ? getAllStarBohDraftPath(seasonId) : null;
    const draftRef = hasDraft ? documentRef(firestore, db, draftPath) : null;
    const teamRefs = new Map(
      [...teams.keys()].map((teamId) => [
        teamId,
        documentRef(firestore, db, getAllStarBohDraftTeamPath(seasonId, teamId)),
      ])
    );
    const submissionRefs = new Map(
      expectedSubmissionRevisions.map((guard) => [
        guard.uid,
        documentRef(firestore, db, getAllStarBohSubmissionPath(seasonId, guard.uid)),
      ])
    );
    const reviewRefs = new Map(
      expectedReviewRevisions.map((guard) => [
        guard.uid,
        documentRef(firestore, db, getAllStarBohReviewPath(seasonId, guard.uid)),
      ])
    );
    let result = null;
    await firestore.runTransaction(db, async (transaction) => {
      const [draftSnapshot, teamSnapshotEntries, submissionSnapshotEntries, reviewSnapshotEntries] =
        await Promise.all([
          draftRef ? transaction.get(draftRef) : Promise.resolve(null),
          Promise.all(
            [...teamRefs].map(async ([teamId, ref]) => [teamId, await transaction.get(ref)])
          ),
          Promise.all(
            [...submissionRefs].map(async ([targetUid, ref]) => [
              targetUid,
              await transaction.get(ref),
            ])
          ),
          Promise.all(
            [...reviewRefs].map(async ([targetUid, ref]) => [targetUid, await transaction.get(ref)])
          ),
        ]);
      const teamSnapshots = new Map(teamSnapshotEntries);
      const submissionSnapshots = new Map(submissionSnapshotEntries);
      const reviewSnapshots = new Map(reviewSnapshotEntries);

      const existingDraft = draftSnapshot ? snapshotData(draftSnapshot) : null;
      if (hasDraft) {
        const actualRevision = existingDraft
          ? normalizeRevision(existingDraft.revision ?? 0, 'Stored draft revision')
          : 0;
        if (actualRevision !== expectedDraftRevision) {
          throw new AllStarBohConflictError(draftPath, expectedDraftRevision, actualRevision);
        }
      }
      const existingTeams = new Map();
      for (const [teamId, details] of teams) {
        const existing = snapshotData(teamSnapshots.get(teamId));
        const actualRevision = existing
          ? normalizeRevision(existing.revision ?? 0, `Stored ${teamId} revision`)
          : 0;
        if (actualRevision !== details.expectedRevision) {
          throw new AllStarBohConflictError(
            getAllStarBohDraftTeamPath(seasonId, teamId),
            details.expectedRevision,
            actualRevision
          );
        }
        existingTeams.set(teamId, existing);
      }
      for (const guard of expectedSubmissionRevisions) {
        const existing = snapshotData(submissionSnapshots.get(guard.uid));
        if (!existing) {
          throw new AllStarBohConflictError(
            getAllStarBohSubmissionPath(seasonId, guard.uid),
            guard.revisions[0],
            0
          );
        }
        assertStoredIdentity(existing, { seasonId, uid: guard.uid });
        const actualRevision = existing
          ? normalizeRevision(existing.revision ?? 0, 'Stored submission source revision')
          : 0;
        if (actualRevision !== guard.revisions[0]) {
          throw new AllStarBohConflictError(
            getAllStarBohSubmissionPath(seasonId, guard.uid),
            guard.revisions[0],
            actualRevision
          );
        }
      }
      for (const guard of expectedReviewRevisions) {
        const existing = snapshotData(reviewSnapshots.get(guard.uid));
        if (existing) assertStoredIdentity(existing, { seasonId, uid: guard.uid });
        const actualRevision = existing
          ? normalizeRevision(existing.revision ?? 0, 'Stored review source revision')
          : 0;
        if (actualRevision !== guard.revisions[0]) {
          throw new AllStarBohConflictError(
            getAllStarBohReviewPath(seasonId, guard.uid),
            guard.revisions[0],
            actualRevision
          );
        }
        const actualSubmissionRevision = existing
          ? normalizeRevision(
              existing.submissionRevision ?? 0,
              'Stored reviewed submission revision'
            )
          : 0;
        if (actualSubmissionRevision !== guard.revisions[1]) {
          throw new AllStarBohConflictError(
            getAllStarBohReviewPath(seasonId, guard.uid),
            guard.revisions[1],
            actualSubmissionRevision
          );
        }
      }

      const serverTimestamp = firestore.serverTimestamp();
      const draftPayload = hasDraft
        ? {
            ...draft,
            ...metadataForWrite(
              existingDraft,
              { seasonId },
              expectedDraftRevision,
              uid,
              serverTimestamp
            ),
          }
        : null;
      const teamPayloads = {};
      for (const [teamId, details] of teams) {
        teamPayloads[teamId] = {
          ...details.team,
          ...metadataForWrite(
            existingTeams.get(teamId),
            { seasonId, teamId },
            details.expectedRevision,
            uid,
            serverTimestamp
          ),
        };
      }

      if (draftRef) transaction.set(draftRef, draftPayload);
      for (const [teamId, ref] of teamRefs) transaction.set(ref, teamPayloads[teamId]);
      result = {
        ...(draftPayload ? { draft: draftPayload } : {}),
        teams: teamPayloads,
      };
    });
    return cloneValue(result);
  }

  async function publish(bundleInput, publishOptions = {}) {
    await ensureAdmin();
    const bundle = requireRecord(bundleInput, 'Publication bundle');
    assertNoPrivateBinary(bundle, 'Publication bundle');
    const expectedRevision = resolveExpectedRevision(bundle.current || bundle, publishOptions);
    const nextRevision = expectedRevision + 1;
    const current = normalizePublishedCurrent(bundle.current || {});
    current.activePlanRevision = current.planPublished ? nextRevision : null;
    const teams = normalizeBundleEntries(bundle.teams, {
      idField: 'teamId',
      idLabel: 'Team ID',
      label: 'teams',
      maximum: ALL_STAR_BOH_MAX_TEAMS,
      normalize: normalizeAllStarBohPublishedTeam,
    });
    const players = normalizeBundleEntries(bundle.players, {
      idField: 'uid',
      idLabel: 'Player ID',
      label: 'players',
      maximum: ALL_STAR_BOH_MAX_PLAYERS,
      normalize: (player) =>
        normalizeAllStarBohPublishedPlayer(player, { includePlan: current.planPublished }),
    });
    validatePublicationReferences(current, teams, players);
    let sourceDraftRevision = null;
    const sourceTeamRevisions = new Map();
    if (current.announcementPublished) {
      sourceDraftRevision = normalizeRevision(
        publishOptions.sourceDraftRevision ?? bundle.sourceDraftRevision,
        'Source draft revision'
      );
      const suppliedTeamRevisions = optionalRecord(
        publishOptions.sourceTeamRevisions ?? bundle.sourceTeamRevisions
      );
      for (const teamId of teams.keys()) {
        if (!own(suppliedTeamRevisions, teamId)) {
          throw new AllStarBohValidationError(
            `Source draft revision is required for team ${teamId}.`
          );
        }
        sourceTeamRevisions.set(
          teamId,
          normalizeRevision(suppliedTeamRevisions[teamId], `Source revision for team ${teamId}`)
        );
      }
    }
    current.teamCount = current.announcementPublished ? teams.size : 0;
    current.rosterSize = current.announcementPublished ? 12 : 0;
    const validationHooks = [options.validatePublication, publishOptions.validate].filter(
      (hook, index, hooks) => typeof hook === 'function' && hooks.indexOf(hook) === index
    );
    if (current.planPublished && !validationHooks.length) {
      throw new AllStarBohPublishValidationError(
        'Plan publication requires the complete model validation hook.'
      );
    }
    const sanitizedBundle = cloneValue({
      current: { ...current, teamIds: [...teams.keys()] },
      teams: Object.fromEntries(teams),
      players: Object.fromEntries(players),
    });
    for (const validationHook of validationHooks) {
      const result = await validationHook(cloneValue(sanitizedBundle));
      if (result === false || result?.valid === false) {
        throw new AllStarBohPublishValidationError(
          result?.message || result?.errors?.[0] || undefined
        );
      }
    }
    const currentPath = getAllStarBohPublishedPath(seasonId);
    const currentRef = documentRef(firestore, db, currentPath);
    const publicationIndexPath = getAllStarBohPublicationIndexPath(seasonId);
    const publicationIndexRef = documentRef(firestore, db, publicationIndexPath);
    let resultBundle = null;

    await firestore.runTransaction(db, async (transaction) => {
      const currentSnapshot = await transaction.get(currentRef);
      const publicationIndexSnapshot = await transaction.get(publicationIndexRef);
      const existingCurrent = snapshotData(currentSnapshot);
      const existingPublicationIndex = snapshotData(publicationIndexSnapshot);
      const actualRevision = existingCurrent
        ? normalizeRevision(existingCurrent.revision ?? 0, 'Stored revision')
        : 0;
      if (actualRevision !== expectedRevision) {
        throw new AllStarBohConflictError(currentPath, expectedRevision, actualRevision);
      }
      if (existingPublicationIndex) {
        assertStoredIdentity(existingPublicationIndex, { seasonId });
        const actualIndexRevision = normalizeRevision(
          existingPublicationIndex.revision ?? 0,
          'Stored publication index revision'
        );
        if (actualIndexRevision !== actualRevision) {
          throw new AllStarBohConflictError(
            publicationIndexPath,
            actualRevision,
            actualIndexRevision
          );
        }
      }

      const teamRefs = new Map(
        [...teams.keys()].map((teamId) => [
          teamId,
          documentRef(firestore, db, getAllStarBohPublishedTeamPath(seasonId, teamId)),
        ])
      );
      const playerRefs = new Map(
        [...players.keys()].map((playerId) => [
          playerId,
          documentRef(firestore, db, getAllStarBohPublishedPlayerPath(seasonId, playerId)),
        ])
      );
      const submissionRefs = new Map(
        [...players.keys()].map((projectionUid) => [
          projectionUid,
          documentRef(firestore, db, getAllStarBohSubmissionPath(seasonId, projectionUid)),
        ])
      );
      const reviewRefs = new Map(
        [...players.keys()].map((projectionUid) => [
          projectionUid,
          documentRef(firestore, db, getAllStarBohReviewPath(seasonId, projectionUid)),
        ])
      );
      const sourceDraftRef = current.announcementPublished
        ? documentRef(firestore, db, getAllStarBohDraftPath(seasonId))
        : null;
      const sourceDraftTeamRefs = new Map(
        current.announcementPublished
          ? [...teams.keys()].map((teamId) => [
              teamId,
              documentRef(firestore, db, getAllStarBohDraftTeamPath(seasonId, teamId)),
            ])
          : []
      );
      const existingTeams = new Map();
      const existingPlayers = new Map();
      const submissionOwners = new Map();
      const submissionReviews = new Map();
      const sourceDraft = sourceDraftRef
        ? snapshotData(await transaction.get(sourceDraftRef))
        : null;
      const sourceDraftTeams = new Map();
      for (const [teamId, ref] of teamRefs) {
        existingTeams.set(teamId, snapshotData(await transaction.get(ref)));
      }
      for (const [playerId, ref] of playerRefs) {
        existingPlayers.set(playerId, snapshotData(await transaction.get(ref)));
      }
      for (const [projectionUid, ref] of submissionRefs) {
        submissionOwners.set(projectionUid, snapshotData(await transaction.get(ref)));
      }
      for (const [projectionUid, ref] of reviewRefs) {
        submissionReviews.set(projectionUid, snapshotData(await transaction.get(ref)));
      }
      for (const [teamId, ref] of sourceDraftTeamRefs) {
        sourceDraftTeams.set(teamId, snapshotData(await transaction.get(ref)));
      }

      if (current.announcementPublished) {
        const actualDraftRevision = sourceDraft
          ? normalizeRevision(sourceDraft.revision ?? 0, 'Stored draft revision')
          : 0;
        if (actualDraftRevision !== sourceDraftRevision) {
          throw new AllStarBohConflictError(
            getAllStarBohDraftPath(seasonId),
            sourceDraftRevision,
            actualDraftRevision
          );
        }
        for (const [teamId, expectedTeamRevision] of sourceTeamRevisions) {
          const sourceTeam = sourceDraftTeams.get(teamId);
          const actualTeamRevision = sourceTeam
            ? normalizeRevision(sourceTeam.revision ?? 0, `Stored ${teamId} draft revision`)
            : 0;
          if (actualTeamRevision !== expectedTeamRevision) {
            throw new AllStarBohConflictError(
              getAllStarBohDraftTeamPath(seasonId, teamId),
              expectedTeamRevision,
              actualTeamRevision
            );
          }
        }
      }

      for (const [projectionUid, player] of players) {
        const submission = submissionOwners.get(projectionUid);
        const review = submissionReviews.get(projectionUid);
        if (!submission) {
          throw new AllStarBohPublishValidationError(
            `Player projection ${projectionUid} has no submitted signup.`
          );
        }
        assertStoredIdentity(submission, { seasonId, uid: projectionUid });
        if (submission.status !== 'submitted' || submission.playerId !== player.playerId) {
          throw new AllStarBohPublishValidationError(
            `Player projection ${projectionUid} does not match its submitted signup.`
          );
        }
        const submissionRevision = normalizeRevision(
          submission.revision ?? 0,
          `Stored submission revision for ${projectionUid}`
        );
        if (!review) {
          throw new AllStarBohPublishValidationError(
            `Player projection ${projectionUid} has no verified review.`
          );
        }
        assertStoredIdentity(review, { seasonId, uid: projectionUid });
        const normalizedReview = normalizeAllStarBohReview(review);
        if (
          normalizedReview.status !== 'verified' ||
          normalizedReview.submissionRevision !== submissionRevision
        ) {
          throw new AllStarBohPublishValidationError(
            `Player projection ${projectionUid} does not have a current verified review.`
          );
        }
      }

      const serverTimestamp = firestore.serverTimestamp();
      const currentPayload = {
        ...current,
        teamIds: [...teams.keys()],
        ...metadataForWrite(existingCurrent, { seasonId }, expectedRevision, uid, serverTimestamp),
      };
      const teamPayloads = {};
      const playerPayloads = {};
      for (const [teamId, team] of teams) {
        const existing = existingTeams.get(teamId);
        assertStoredIdentity(existing, { seasonId, teamId });
        teamPayloads[teamId] = {
          ...team,
          seasonId,
          teamId,
          schemaVersion: ALL_STAR_BOH_SCHEMA_VERSION,
          revision: nextRevision,
          createdAt: existing?.createdAt || serverTimestamp,
          updatedAt: serverTimestamp,
          updatedBy: uid,
        };
      }
      for (const [playerId, player] of players) {
        const existing = existingPlayers.get(playerId);
        assertStoredIdentity(existing, { seasonId, uid: playerId });
        playerPayloads[playerId] = {
          ...player,
          seasonId,
          uid: playerId,
          schemaVersion: ALL_STAR_BOH_SCHEMA_VERSION,
          revision: nextRevision,
          createdAt: existing?.createdAt || serverTimestamp,
          updatedAt: serverTimestamp,
          updatedBy: uid,
        };
      }

      const previousTeamIds = boundedStringArray(existingCurrent?.teamIds || [], {
        label: 'Previous team IDs',
        maxItems: ALL_STAR_BOH_MAX_TEAMS,
        identifiers: true,
      });
      const previousPlayerIds = boundedStringArray(
        existingPublicationIndex?.playerIds || existingCurrent?.playerIds || [],
        {
          label: 'Previous player IDs',
          maxItems: ALL_STAR_BOH_MAX_PLAYERS,
          identifiers: true,
        }
      );
      const publicationIndexPayload = {
        playerIds: [...players.keys()],
        teamIds: [...teams.keys()],
        ...metadataForWrite(
          existingPublicationIndex,
          { seasonId },
          expectedRevision,
          uid,
          serverTimestamp
        ),
      };
      transaction.set(currentRef, currentPayload);
      transaction.set(publicationIndexRef, publicationIndexPayload);
      for (const [teamId, ref] of teamRefs) transaction.set(ref, teamPayloads[teamId]);
      for (const [playerId, ref] of playerRefs) transaction.set(ref, playerPayloads[playerId]);
      for (const staleTeamId of previousTeamIds.filter((teamId) => !teams.has(teamId))) {
        transaction.delete(
          documentRef(firestore, db, getAllStarBohPublishedTeamPath(seasonId, staleTeamId))
        );
      }
      for (const stalePlayerId of previousPlayerIds.filter((playerId) => !players.has(playerId))) {
        transaction.delete(
          documentRef(firestore, db, getAllStarBohPublishedPlayerPath(seasonId, stalePlayerId))
        );
      }
      resultBundle = { current: currentPayload, teams: teamPayloads, players: playerPayloads };
    });

    return cloneValue(resultBundle);
  }

  return Object.freeze({
    seasonId,
    uid,
    epicTimeSlotIds,
    listSubmissions,
    subscribeSubmissions,
    deleteSubmission,
    getEpicShowdownPreferencesList,
    subscribeEpicShowdownPreferences,
    getPublication,
    subscribePublication,
    getEventSchedule,
    subscribeEventSchedule,
    saveEventSchedule,
    getSchedule: getEventSchedule,
    subscribeSchedule: subscribeEventSchedule,
    saveSchedule: saveEventSchedule,
    getReview,
    subscribeReview,
    saveReview,
    getDraft,
    subscribeDraft,
    saveDraft,
    getDraftTeam,
    subscribeDraftTeam,
    saveDraftTeam,
    saveDraftBundle,
    publish,
    stop: subscriptions.stop,
  });
}

export const createBohPlayerStore = createAllStarBohPlayerStore;
export const createBohAdminStore = createAllStarBohAdminStore;
