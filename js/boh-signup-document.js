// js/boh-signup-document.js
//
// The persisted Eden registration, as one contract shared by three writers:
//
//   * the member form on vtsscore.html (browser, owner-only Firestore rule),
//   * the admin manual add/edit surface (the bohSignupAdmin Cloud Function),
//   * firestore.rules, which pins the document shape key by key.
//
// Everything here is pure: no DOM, no Firestore, no network. The form reader
// and writer below work against any element whose `value` / `checked` /
// `dataset` / `querySelectorAll` behave like a DOM node's, so the field
// contract itself is unit-testable without a browser.

import {
  BOH_AVAILABILITY_VALUES,
  BOH_ENTRY_METHODS,
  BOH_FIGHTING_TIME_IDS,
  BOH_MAX_PREFERRED_TEAMMATES,
  BOH_MAX_USABLE_HERO_NAMES,
  BOH_PREFERRED_ROLES,
  BOH_SIGNUP_SCHEMA_VERSION,
  BOH_TEAM_NAME_PREFERENCES,
  normalizeBohName,
  normalizeBohSignup,
} from './all-star-boh-model.js';

export const BOH_SIGNUP_STATUS_VALUES = Object.freeze(['draft', 'submitted', 'withdrawn']);
export const BOH_SIGNUP_MAX_DOCUMENT_BYTES = 48 * 1024;

// The keys firestore.rules requires on every signup document. Kept as a list
// rather than a spread of the normalized signup so a rules change is a visible
// one-line edit here, and so the unit test can diff it against the rules file.
export const BOH_SIGNUP_REQUIRED_DOCUMENT_KEYS = Object.freeze([
  'playerId',
  'gameName',
  'knownNames',
  'locale',
  'timezone',
  'entryMethod',
  'status',
  'stats',
  'rolePreferences',
  'eligibleRoleIds',
  'commitment',
  'ocr',
  'submittedAtMs',
  'seasonId',
  'uid',
  'schemaVersion',
  'revision',
  'createdAt',
  'updatedAt',
  'updatedBy',
]);

export const BOH_SIGNUP_OPTIONAL_DOCUMENT_KEYS = Object.freeze(['preferredTeammates']);

export const BOH_SIGNUP_STAT_REQUIRED_FIELDS = Object.freeze([
  'totalCastlePower',
  'troopPower',
  'buildingPower',
  'technologyPower',
  'heroCombatPower',
  'dragonPower',
  'unitSpecialtyPower',
  't9TroopTypes',
  'readySpeedHeroes',
  'level50HeroCount',
  'rocLevel',
]);

export const BOH_SIGNUP_COMMITMENT_REQUIRED_KEYS = Object.freeze([
  'availability',
  'preferredRole',
  'fightingTimeIds',
  'teamNamePreferences',
  'vts1097Member',
  'contactNumber',
  'currentState',
  'joinReason',
  'notes',
]);

const MAX_POWER = 10 ** 12;
const MAX_POWER_DOCUMENT_VALUE = 10 ** 15;
const MAX_TEXT_LENGTH = 160;
const MAX_UNKNOWN_TEXT_LENGTH = 4000;

export class BohSignupDocumentError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'BohSignupDocumentError';
    this.code = code;
    Object.assign(this, details);
  }
}

function documentError(code, message, details) {
  return new BohSignupDocumentError(code, message, details);
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function textValue(value) {
  return String(value ?? '')
    .normalize('NFC')
    .trim();
}

function isFiniteNonNegativeInteger(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

/* ------------------------------------------------------------------ *
 * DOM field contract
 *
 * Every input carries `data-boh-field="<dotted path>"`, where the path is a
 * path into the object `normalizeBohSignup()` accepts. Repeated paths collect
 * into an array (the two fighting-time picks), checkboxes read as booleans, and
 * `data-boh-boolean="true"` turns a select's "true"/"false" into a real
 * boolean — which is what `commitment.vts1097Member` has to be.
 * ------------------------------------------------------------------ */

export const BOH_SIGNUP_FIELD_PATHS = Object.freeze({
  gameName: 'gameName',
  powerValues: Object.freeze([
    'stats.totalCastlePower',
    'stats.troopPower',
    'stats.buildingPower',
    'stats.technologyPower',
    'stats.heroCombatPower',
    'stats.dragonPower',
    'stats.unitSpecialtyPower',
    // Optional under the signup/rules contract. Blank values must stay absent
    // rather than becoming zero.
    'stats.artifactPower',
  ]),
  troopLists: Object.freeze([
    'stats.t9TroopTypes',
    'stats.t10TroopTypes',
    'stats.readySpeedHeroes',
  ]),
  troopCounts: Object.freeze(['stats.level50HeroCount', 'stats.rocLevel']),
  roles: Object.freeze(['commitment.preferredRole', 'commitment.secondaryRole']),
  availability: 'commitment.availability',
  fightingTimes: 'commitment.fightingTimeIds',
  bohTimeSlots: 'commitment.bohTimeSlots',
  epicTimeSlots: 'commitment.epicTimeSlots',
  publicComparisonConsent: 'commitment.publicComparisonConsent',
  member: 'commitment.vts1097Member',
  texts: Object.freeze([
    'commitment.contactNumber',
    'commitment.currentState',
    'commitment.joinReason',
    'commitment.notes',
  ]),
});

function fieldElements(root) {
  const found = root?.querySelectorAll?.('[data-boh-field]');
  return found ? Array.from(found) : [];
}

function elementValue(element) {
  if (element?.type === 'checkbox') return Boolean(element.checked);
  const raw = element?.value;
  // An ordered choice list kept in one hidden input ("+20,+8"): the slot
  // pickers write it, and the order is the member's preference.
  if (element?.dataset?.bohList === 'true') {
    return String(raw ?? '')
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);
  }
  if (element?.dataset?.bohBoolean === 'true') {
    const text = typeof raw === 'string' ? raw.trim() : '';
    if (text === '') return null;
    return text === 'true' ? true : false;
  }
  return typeof raw === 'string' ? raw : String(raw ?? '');
}

function setPathValue(target, path, value) {
  const segments = String(path).split('.');
  const last = segments.pop();
  let cursor = target;
  for (const segment of segments) {
    if (!isPlainObject(cursor[segment])) cursor[segment] = {};
    cursor = cursor[segment];
  }
  if (Object.prototype.hasOwnProperty.call(cursor, last)) {
    // A repeated path is a choice list, not a scalar: the two fighting-time
    // picks share one path and `normalizeFightingTimeIds` expects both of them.
    cursor[last] = [].concat(cursor[last], value);
    return;
  }
  cursor[last] = value;
}

function pathValue(source, path) {
  const segments = String(path).split('.');
  let cursor = source;
  for (const segment of segments) {
    if (!isPlainObject(cursor)) return undefined;
    cursor = cursor[segment];
  }
  return cursor;
}

/** Reads the form into the raw object `normalizeBohSignup()` accepts. */
export function readBohSignupFormValues(root) {
  const values = {};
  for (const element of fieldElements(root)) {
    const path = textValue(element?.dataset?.bohField);
    if (!path) continue;
    const value = elementValue(element);
    // This optional field is omitted by the signup model for null, while an
    // empty string is normalized to zero. Preserve blank as absent.
    const normalizedValue =
      path === 'stats.artifactPower' && typeof value === 'string' && !value.trim()
        ? null
        : value;
    setPathValue(values, path, normalizedValue);
  }
  return values;
}

function writePathValue(root, path, value) {
  const elements = fieldElements(root).filter(
    (element) => textValue(element?.dataset?.bohField) === path
  );
  if (!elements.length) return false;
  if (Array.isArray(value) && elements.length === 1 && elements[0].dataset?.bohList === 'true') {
    elements[0].value = value.map((part) => String(part)).join(',');
    elements[0].dispatchEvent?.(new Event('change', { bubbles: true }));
    return true;
  }
  if (Array.isArray(value)) {
    elements.forEach((element, index) => {
      element.value =
        value[index] === undefined || value[index] === null ? '' : String(value[index]);
    });
    return true;
  }
  elements.forEach((element) => {
    if (element.type === 'checkbox') {
      element.checked = value === true;
      return;
    }
    if (element.dataset?.bohBoolean === 'true') {
      element.value = value === true ? 'true' : value === false ? 'false' : '';
      return;
    }
    element.value = value === undefined || value === null ? '' : String(value);
  });
  return true;
}

/** Fills a form (member or admin) from a stored or normalized signup. */
export function writeBohSignupFormValues(root, signup = {}) {
  const source = {
    gameName: signup.gameName,
    stats: isPlainObject(signup.stats) ? signup.stats : {},
    commitment: isPlainObject(signup.commitment) ? signup.commitment : {},
  };
  const paths = [
    BOH_SIGNUP_FIELD_PATHS.gameName,
    ...BOH_SIGNUP_FIELD_PATHS.powerValues,
    ...BOH_SIGNUP_FIELD_PATHS.troopLists,
    ...BOH_SIGNUP_FIELD_PATHS.troopCounts,
    ...BOH_SIGNUP_FIELD_PATHS.roles,
    BOH_SIGNUP_FIELD_PATHS.availability,
    BOH_SIGNUP_FIELD_PATHS.fightingTimes,
    BOH_SIGNUP_FIELD_PATHS.bohTimeSlots,
    BOH_SIGNUP_FIELD_PATHS.epicTimeSlots,
    BOH_SIGNUP_FIELD_PATHS.publicComparisonConsent,
    BOH_SIGNUP_FIELD_PATHS.member,
    ...BOH_SIGNUP_FIELD_PATHS.texts,
  ];
  let written = 0;
  for (const path of paths) {
    const value = pathValue(source, path);
    if (value === undefined) continue;
    if (writePathValue(root, path, value)) written += 1;
  }
  return written;
}

/* ------------------------------------------------------------------ *
 * Retired member-form questions
 *
 * Competition #12's form no longer asks for T9 troop types, ready speed
 * heroes, level 50 heroes, preferred/second role, availability, VTS 1097
 * membership, contact, join reason, or leadership notes. firestore.rules
 * (validAllStarBohSubmissionData) and the vtsScore / bohSignupAdmin Functions
 * pin those keys, so the document keeps them. An existing value is preserved
 * on edit (read-then-merge), and a new registration gets a rule-valid neutral
 * placeholder. `commitment.secondaryRole` has no placeholder: it is kept when
 * stored and otherwise left to the model.
 * ------------------------------------------------------------------ */

export const BOH_SIGNUP_RETIRED_MEMBER_FIELDS = Object.freeze({
  'stats.t9TroopTypes': Object.freeze([]),
  'stats.readySpeedHeroes': Object.freeze([]),
  // Placeholder, no longer collected: the rules still require an int here.
  'stats.level50HeroCount': 0,
  'commitment.availability': '',
  'commitment.preferredRole': '',
  'commitment.secondaryRole': undefined,
  // This is the VTS 1097 competition page: everyone registering is a member.
  'commitment.vts1097Member': true,
  'commitment.contactNumber': '',
  'commitment.joinReason': '',
  'commitment.notes': '',
});

/**
 * The member form's values plus every retired field: the value the form still
 * sent, else the stored document's value, else the neutral placeholder.
 */
export function mergeRetiredBohSignupFields(values = {}, stored = null) {
  const merged = {
    ...values,
    stats: { ...(isPlainObject(values.stats) ? values.stats : {}) },
    commitment: { ...(isPlainObject(values.commitment) ? values.commitment : {}) },
  };
  for (const [path, placeholder] of Object.entries(BOH_SIGNUP_RETIRED_MEMBER_FIELDS)) {
    const [group, key] = path.split('.');
    if (merged[group][key] !== undefined) continue;
    const storedValue = pathValue(stored, path);
    if (storedValue !== undefined && storedValue !== null) {
      merged[group][key] = Array.isArray(storedValue) ? [...storedValue] : storedValue;
    } else if (placeholder !== undefined) {
      merged[group][key] = Array.isArray(placeholder) ? [...placeholder] : placeholder;
    }
  }
  return merged;
}

/* ------------------------------------------------------------------ *
 * Document build + validation
 * ------------------------------------------------------------------ */

function normalizedNumber(value, label) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 0) {
    throw documentError('invalid_number', `${label} must be a whole number.`, { field: label });
  }
  if (number > MAX_POWER_DOCUMENT_VALUE) {
    throw documentError('invalid_number', `${label} is out of range.`, { field: label });
  }
  return number;
}

/**
 * Turns a filled form (or an admin payload) into the exact document
 * `firestore.rules` accepts.
 *
 * `createdAt` / `updatedAt` are the caller's Firestore sentinel
 * (`serverTimestamp()`): the rules compare `createdAt` against `request.time`
 * on create, and require an update to resend the stored `createdAt` unchanged.
 */
export function buildBohSignupDocument(input = {}) {
  const uid = textValue(input.uid);
  const seasonId = textValue(input.seasonId);
  if (!uid) throw documentError('uid_required', 'A signup needs the member account it belongs to.');
  if (!/^[A-Za-z0-9_-]{1,128}$/u.test(uid)) {
    throw documentError('uid_invalid', 'That member account id is not valid.');
  }
  if (!seasonId) throw documentError('season_required', 'A signup needs a season.');
  const status = textValue(input.status) || 'submitted';
  if (!BOH_SIGNUP_STATUS_VALUES.includes(status)) {
    throw documentError('status_invalid', 'That signup status is not valid.');
  }

  let signup;
  try {
    signup = normalizeBohSignup(
      // playerId is the account the rule binds the document to, never a name hash:
      // firestore.rules asserts `playerId == uid == path uid`.
      { ...(isPlainObject(input.values) ? input.values : {}), playerId: uid, status },
      {
        // The member form is Competition #12's: BoH and Epic Showdown slots
        // replace the two classic fighting times.
        requireCompetitionSlots: input.requireCompetitionSlots !== false,
        requireFightingTimeIds: input.requireCompetitionSlots === false,
        heroNames: input.heroNames,
        researchTreeIds: input.researchTreeIds,
      }
    );
  } catch (error) {
    // The model speaks in codes (`boh_signup_fighting_times_required`, ...).
    // Re-throw inside this module's error family so callers map one error type,
    // and keep the model's code as the reason a form can point at one field.
    throw documentError('values_invalid', error?.message || 'Invalid signup values.', {
      reason: String(error?.code || ''),
    });
  }
  if (signup.playerId !== uid) {
    throw documentError('player_id_mismatch', 'The signup identity does not match its account.');
  }

  const revision = Number.isInteger(input.revision) && input.revision > 0 ? input.revision : 1;
  const document = {
    ...signup,
    seasonId,
    uid,
    status,
    ocr: normalizeOcrAudit(input.ocr),
    schemaVersion: BOH_SIGNUP_SCHEMA_VERSION,
    revision,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
    updatedBy: textValue(input.updatedBy) || uid,
  };
  const problems = validateBohSignupDocument(document);
  if (problems.length) {
    throw documentError('document_invalid', problems[0], { problems });
  }
  return document;
}

export function normalizeOcrAudit(input) {
  const source = isPlainObject(input) ? input : {};
  const warnings = Array.isArray(source.warnings)
    ? source.warnings.slice(0, 20).map(textValue)
    : [];
  const fieldConfidence = isPlainObject(source.fieldConfidence)
    ? { ...source.fieldConfidence }
    : {};
  return {
    used: source.used === true,
    valuesConfirmed: source.valuesConfirmed === true,
    confidence: typeof source.confidence === 'number' ? source.confidence : null,
    warnings: warnings.filter(Boolean),
    fieldConfidence,
  };
}

/**
 * Checks a document against the rules' published shape. Returns every problem
 * rather than throwing, because the admin surface reports the whole list and
 * the member form reports the first one.
 */
export function validateBohSignupDocument(documentInput) {
  const document = isPlainObject(documentInput) ? documentInput : {};
  const problems = [];
  const has = (key) => Object.prototype.hasOwnProperty.call(document, key);
  const hasKey = (target, key) => Object.prototype.hasOwnProperty.call(target, key);

  for (const key of BOH_SIGNUP_REQUIRED_DOCUMENT_KEYS) {
    if (!has(key)) problems.push(`missing:${key}`);
  }
  for (const key of Object.keys(document)) {
    if (
      !BOH_SIGNUP_REQUIRED_DOCUMENT_KEYS.includes(key) &&
      !BOH_SIGNUP_OPTIONAL_DOCUMENT_KEYS.includes(key)
    ) {
      problems.push(`unexpected:${key}`);
    }
  }

  if (document.schemaVersion !== BOH_SIGNUP_SCHEMA_VERSION) problems.push('schemaVersion:1');
  if (typeof document.uid !== 'string' || !document.uid) problems.push('uid');
  if (document.playerId !== document.uid) problems.push('playerId:uid');
  if (typeof document.seasonId !== 'string' || !/^[A-Za-z0-9_-]{1,80}$/u.test(document.seasonId)) {
    problems.push('seasonId');
  }
  if (!BOH_SIGNUP_STATUS_VALUES.includes(document.status)) problems.push('status');
  if (!BOH_ENTRY_METHODS.includes(document.entryMethod)) problems.push('entryMethod');
  if (!isFiniteNonNegativeInteger(document.revision) || document.revision < 1) {
    problems.push('revision');
  }
  const gameName = textValue(document.gameName);
  if (!gameName || Array.from(gameName).length > MAX_TEXT_LENGTH) problems.push('gameName');
  if (!Array.isArray(document.knownNames) || document.knownNames.length > 30) {
    problems.push('knownNames');
  }
  if (typeof document.locale !== 'string' || Array.from(String(document.locale)).length > 20) {
    problems.push('locale');
  }
  if (typeof document.timezone !== 'string' || Array.from(String(document.timezone)).length > 80) {
    problems.push('timezone');
  }

  const stats = isPlainObject(document.stats) ? document.stats : null;
  if (!stats) problems.push('stats');
  else {
    for (const field of BOH_SIGNUP_STAT_REQUIRED_FIELDS) {
      if (!hasKey(stats, field)) problems.push(`stats.missing:${field}`);
    }
    for (const field of [
      'totalCastlePower',
      'troopPower',
      'buildingPower',
      'technologyPower',
      'heroCombatPower',
      'dragonPower',
      'unitSpecialtyPower',
    ]) {
      if (!isFiniteNonNegativeInteger(stats[field]) || stats[field] > MAX_POWER) {
        problems.push(`stats.${field}`);
      }
    }
    if (!Array.isArray(stats.t9TroopTypes) || stats.t9TroopTypes.length > 12) {
      problems.push('stats.t9TroopTypes');
    }
    if (!Array.isArray(stats.readySpeedHeroes) || stats.readySpeedHeroes.length > 24) {
      problems.push('stats.readySpeedHeroes');
    }
    if (!isFiniteNonNegativeInteger(stats.level50HeroCount) || stats.level50HeroCount > 500) {
      problems.push('stats.level50HeroCount');
    }
    if (!isFiniteNonNegativeInteger(stats.rocLevel) || stats.rocLevel > 160) {
      problems.push('stats.rocLevel');
    }
    if (
      hasKey(stats, 't10TroopTypes') &&
      (!Array.isArray(stats.t10TroopTypes) || stats.t10TroopTypes.length > 3)
    ) {
      problems.push('stats.t10TroopTypes');
    }
    if (
      hasKey(stats, 'troopRoster') &&
      (!Array.isArray(stats.troopRoster) || stats.troopRoster.length > 60)
    ) {
      problems.push('stats.troopRoster');
    }
    if (
      hasKey(stats, 'usableHeroNames') &&
      (!Array.isArray(stats.usableHeroNames) ||
        stats.usableHeroNames.length > BOH_MAX_USABLE_HERO_NAMES + 11)
    ) {
      problems.push('stats.usableHeroNames');
    }
    if (hasKey(stats, 'artifactPower') && !isNullablePower(stats.artifactPower)) {
      problems.push('stats.artifactPower');
    }
    if (hasKey(stats, 'royalTechPower') && !isNullablePower(stats.royalTechPower)) {
      problems.push('stats.royalTechPower');
    }
  }

  if (!Array.isArray(document.rolePreferences) || document.rolePreferences.length > 12) {
    problems.push('rolePreferences');
  }
  if (!Array.isArray(document.eligibleRoleIds) || document.eligibleRoleIds.length > 20) {
    problems.push('eligibleRoleIds');
  }
  if (
    document.preferredTeammates !== undefined &&
    (!Array.isArray(document.preferredTeammates) ||
      document.preferredTeammates.length > BOH_MAX_PREFERRED_TEAMMATES)
  ) {
    problems.push('preferredTeammates');
  }

  const commitment = isPlainObject(document.commitment) ? document.commitment : null;
  if (!commitment) problems.push('commitment');
  else {
    for (const key of BOH_SIGNUP_COMMITMENT_REQUIRED_KEYS) {
      if (!hasKey(commitment, key)) problems.push(`commitment.missing:${key}`);
    }
    if (![...BOH_AVAILABILITY_VALUES, ''].includes(commitment.availability)) {
      problems.push('commitment.availability');
    }
    if (![...BOH_PREFERRED_ROLES, ''].includes(commitment.preferredRole)) {
      problems.push('commitment.preferredRole');
    }
    const hasCompetitionSlots =
      Array.isArray(commitment.bohTimeSlots) && Array.isArray(commitment.epicTimeSlots);
    if (
      !Array.isArray(commitment.fightingTimeIds) ||
      commitment.fightingTimeIds.length > 2 ||
      (commitment.fightingTimeIds.length !== 2 && !hasCompetitionSlots) ||
      commitment.fightingTimeIds.some((timeId) => !BOH_FIGHTING_TIME_IDS.includes(timeId))
    ) {
      problems.push('commitment.fightingTimeIds');
    }
    if (
      !Array.isArray(commitment.teamNamePreferences) ||
      commitment.teamNamePreferences.length > BOH_TEAM_NAME_PREFERENCES.length
    ) {
      problems.push('commitment.teamNamePreferences');
    }
    if (typeof commitment.vts1097Member !== 'boolean') problems.push('commitment.vts1097Member');
    if (!isBoundedString(commitment.contactNumber, 160)) problems.push('commitment.contactNumber');
    if (!isBoundedString(commitment.currentState, 160)) problems.push('commitment.currentState');
    if (!isBoundedString(commitment.joinReason, 1000)) problems.push('commitment.joinReason');
    if (!isBoundedString(commitment.notes, 2000)) problems.push('commitment.notes');
    if (
      commitment.unavailableTimes !== undefined &&
      !isBoundedString(commitment.unavailableTimes, 800)
    ) {
      problems.push('commitment.unavailableTimes');
    }
  }

  const ocr = isPlainObject(document.ocr) ? document.ocr : null;
  if (!ocr) problems.push('ocr');
  else {
    if (typeof ocr.used !== 'boolean') problems.push('ocr.used');
    if (typeof ocr.valuesConfirmed !== 'boolean') problems.push('ocr.valuesConfirmed');
    if (!Array.isArray(ocr.warnings) || ocr.warnings.length > 20) problems.push('ocr.warnings');
    if (!isPlainObject(ocr.fieldConfidence)) problems.push('ocr.fieldConfidence');
  }

  if (document.submittedAtMs !== null && !isFiniteNonNegativeInteger(document.submittedAtMs)) {
    problems.push('submittedAtMs');
  }
  if (!document.createdAt) problems.push('createdAt');
  if (!document.updatedAt) problems.push('updatedAt');
  if (typeof document.updatedBy !== 'string' || !document.updatedBy) problems.push('updatedBy');

  return problems;
}

function isNullablePower(value) {
  return value === null || (isFiniteNonNegativeInteger(value) && value <= MAX_POWER_DOCUMENT_VALUE);
}

function isBoundedString(value, maximum) {
  return typeof value === 'string' && Array.from(value).length <= maximum;
}

/**
 * The path every signup document lives at. Owner-only for members, written by
 * the admin Function for leadership entries — see firestore.rules.
 */
export function getBohSignupDocumentPath(seasonId, uid) {
  const season = textValue(seasonId);
  const account = textValue(uid);
  if (!season || !account) {
    throw documentError('path_required', 'A season and an account are required.');
  }
  return `boh_allstar/${season}/submissions/${account}`;
}

/** The stored document as the pages show it, with unknown values left out. */
export function readBohSignupSubmission(raw, options = {}) {
  if (!isPlainObject(raw)) return null;
  if (options.seasonId && textValue(raw.seasonId) !== textValue(options.seasonId)) return null;
  if (options.uid && textValue(raw.uid) !== textValue(options.uid)) return null;
  const stats = isPlainObject(raw.stats) ? raw.stats : {};
  const commitment = isPlainObject(raw.commitment) ? raw.commitment : {};
  return {
    uid: textValue(raw.uid),
    seasonId: textValue(raw.seasonId),
    gameName: textValue(raw.gameName),
    status: BOH_SIGNUP_STATUS_VALUES.includes(raw.status) ? raw.status : 'draft',
    revision: isFiniteNonNegativeInteger(raw.revision) ? raw.revision : 0,
    submittedAtMs: isFiniteNonNegativeInteger(raw.submittedAtMs) ? raw.submittedAtMs : null,
    stats,
    commitment,
    rolePreferences: Array.isArray(raw.rolePreferences) ? raw.rolePreferences : [],
    eligibleRoleIds: Array.isArray(raw.eligibleRoleIds) ? raw.eligibleRoleIds : [],
    powerValues: Object.fromEntries(
      BOH_SIGNUP_FIELD_PATHS.powerValues.map((path) => [
        path.split('.')[1],
        stats[path.split('.')[1]] ?? null,
      ])
    ),
  };
}

/** A stable, human-readable identity line for the admin list. */
export function describeBohSignup(signup) {
  if (!signup) return '';
  const name = normalizeBohName(signup.gameName) || signup.uid || '';
  return name.slice(0, MAX_UNKNOWN_TEXT_LENGTH);
}
