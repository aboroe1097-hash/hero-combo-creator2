// functions/src/boh-signup-admin.js
//
// Leadership's manual add/edit path for Eden season signups.
//
// Why a Function instead of an admin rule clause: `firestore.rules` keeps
// `boh_allstar/{season}/submissions/{uid}` owner-written, and a test pins that
// contract (`assert.doesNotMatch(block, /allow (?:create|update): if isAdmin/)`).
// Admitting admins to that collection would let any admin client forge another
// member's signup and bypass every write-time check the rules perform. The
// Admin SDK keeps the rule exactly as it is and puts the decision here instead.
//
// Auth contract, in order:
//   1. Origin must be an allowed site origin (shared with unlock/vtsScore).
//   2. `Authorization: Bearer <Firebase ID token>` must verify.
//   3. `X-Firebase-AppCheck` must verify.
//   4. The verified token must carry the `admin` custom claim — the same claim
//      `isAdmin()` checks in firestore.rules, so leadership who can list and
//      delete signups can also file one by hand.
// The requested season and scoring version must match the live
// `boh_allstar_config/current` document, so a manual entry can never land in a
// season leadership has not declared active.

import {
  extractAppCheckToken,
  extractBearerToken,
  isAllowedAllStarBohOrigin,
} from './all-star-boh-auth.js';

export const BOH_SIGNUP_ADMIN_SCHEMA_VERSION = 1;
export const BOH_SIGNUP_ADMIN_MAX_REQUEST_BYTES = 8192;
export const BOH_SIGNUP_ADMIN_ACTIONS = Object.freeze(['create', 'update']);
export const BOH_SIGNUP_ADMIN_CONFIG_PATH = 'boh_allstar_config/current';
export const BOH_SIGNUP_ADMIN_MAX_POWER = 10 ** 12;
export const BOH_SIGNUP_ADMIN_MAX_TEXT = 160;

/**
 * The scoring-version registry, mirrored from `js/all-star-boh-model.js`
 * (`BOH_SCORING_PROFILES`). A Functions deployment only ships this directory,
 * so the list is repeated here on purpose: `tests/unit/boh-signup-admin.test.mjs`
 * imports the model and fails if the two disagree.
 */
export const BOH_SIGNUP_ADMIN_PROFILE_IDS = Object.freeze([
  'all-star-boh-2027-v1',
  'all-star-boh-2025-v1',
]);

export const BOH_SIGNUP_ADMIN_CREATE_KEYS = Object.freeze([
  'action',
  'commitment',
  'gameName',
  'scoringProfileId',
  'seasonId',
  'stats',
]);
export const BOH_SIGNUP_ADMIN_UPDATE_KEYS = Object.freeze([
  'action',
  'commitment',
  'gameName',
  'scoringProfileId',
  'seasonId',
  'stats',
  'submissionUid',
]);
// Every key the admin form offers. Anything else is rejected instead of being
// silently dropped: a typo in a field name must not become a missing value.
export const BOH_SIGNUP_ADMIN_STAT_KEYS = Object.freeze([
  'artifactPower',
  'buildingPower',
  'dragonPower',
  'heroCombatPower',
  'level50HeroCount',
  'readySpeedHeroes',
  'rocLevel',
  'royalTechPower',
  't9TroopTypes',
  'technologyPower',
  'totalCastlePower',
  'troopPower',
  'unitSpecialtyPower',
]);
export const BOH_SIGNUP_ADMIN_COMMITMENT_KEYS = Object.freeze([
  'availability',
  'contactNumber',
  'currentState',
  'fightingTimeIds',
  'joinReason',
  'notes',
  'preferredRole',
  'secondaryRole',
  'vts1097Member',
]);
const REQUIRED_STAT_KEYS = Object.freeze([
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
const AVAILABILITY_VALUES = Object.freeze(['all', 'most', 'backup', '']);
const PREFERRED_ROLE_VALUES = Object.freeze([
  'flexible',
  'offensive',
  'rune',
  'top',
  'bottom',
  'backup',
  '',
]);
const FIGHTING_TIME_IDS = Object.freeze(['+12', '+14', '+16']);
const TEAM_NAME_PREFERENCES = Object.freeze([
  'iron-wolves',
  'storm-ravens',
  'ember-lions',
  'frost-bears',
  'night-falcons',
  'thunder-bulls',
]);
const SEASON_PATTERN = /^[A-Za-z0-9_-]{1,80}$/;
const SUBMISSION_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
const FIREBASE_UID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

export class BohSignupAdminError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = 'BohSignupAdminError';
    this.status = status;
    this.code = code;
  }
}

function adminError(status, code, message) {
  return new BohSignupAdminError(status, code, message);
}

function requestHeader(request, name) {
  if (typeof request?.get === 'function') {
    const value = request.get(name);
    if (value !== undefined && value !== null) return String(value);
  }
  const value = request?.headers?.[name.toLowerCase()] ?? request?.headers?.[name];
  if (Array.isArray(value)) return value.join(',');
  return value === undefined || value === null ? '' : String(value);
}

function setHeader(response, name, value) {
  if (typeof response?.set === 'function') response.set(name, value);
  else response?.setHeader?.(name, value);
}

function sendJson(response, status, body) {
  if (typeof response?.status === 'function') response.status(status);
  if (typeof response?.json === 'function') return response.json(body);
  response.statusCode = status;
  return response?.end?.(JSON.stringify(body));
}

function sendEmpty(response, status) {
  if (typeof response?.status === 'function') response.status(status);
  if (typeof response?.send === 'function') return response.send('');
  response.statusCode = status;
  return response?.end?.();
}

function addHeaders(response, origin) {
  setHeader(response, 'Access-Control-Allow-Origin', origin);
  setHeader(response, 'Access-Control-Allow-Methods', 'POST, OPTIONS');
  setHeader(
    response,
    'Access-Control-Allow-Headers',
    'Authorization, Content-Type, X-Firebase-AppCheck'
  );
  setHeader(response, 'Cache-Control', 'no-store, max-age=0');
  setHeader(response, 'Pragma', 'no-cache');
  setHeader(response, 'Referrer-Policy', 'no-referrer');
  setHeader(response, 'X-Content-Type-Options', 'nosniff');
  setHeader(response, 'Vary', 'Origin');
}

function snapshotData(snapshot) {
  if (!snapshot) return null;
  const exists = typeof snapshot.exists === 'boolean' ? snapshot.exists : snapshot.exists?.();
  return exists && typeof snapshot.data === 'function' ? snapshot.data() : null;
}

function strictKeys(value, expected) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const keys = Object.keys(value).sort();
  return keys.length === expected.length && keys.every((key, index) => key === expected[index]);
}

function normalizedText(value, maximum, label) {
  if (typeof value !== 'string') throw adminError(400, 'invalid_request', label);
  const text = value.normalize('NFC').trim();
  const hasControlCharacter = [...text].some((character) => {
    const code = character.codePointAt(0);
    return (code <= 31 && code !== 10) || code === 127;
  });
  if (!text || Array.from(text).length > maximum || hasControlCharacter) {
    throw adminError(400, 'invalid_request', label);
  }
  return text;
}

function optionalText(value, maximum, label) {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string') throw adminError(400, 'invalid_request', label);
  const text = value.normalize('NFC').replace(/\r\n?/gu, '\n').trim();
  if (Array.from(text).length > maximum) {
    throw adminError(400, 'invalid_request', label);
  }
  return text;
}

function normalizedEnum(value, allowed, fallback, label) {
  if (value === undefined || value === null || value === '') return fallback;
  const text = String(value).trim().toLowerCase();
  if (!allowed.includes(text)) throw adminError(400, 'invalid_request', label);
  return text;
}

function booleanValue(value, label) {
  if (typeof value !== 'boolean') throw adminError(400, 'invalid_request', label);
  return value;
}

function optionalBoolean(value, label) {
  if (value === undefined || value === null) return null;
  return booleanValue(value, label);
}

function powerValue(value, label) {
  if (value === null || value === undefined) return null;
  if (!Number.isSafeInteger(value) || value < 0 || value > BOH_SIGNUP_ADMIN_MAX_POWER) {
    throw adminError(400, 'invalid_request', label);
  }
  return value;
}

function textList(value, maximum, label, options = {}) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw adminError(400, 'invalid_request', label);
  const seen = new Set();
  const list = [];
  for (const entry of value) {
    const text = normalizedText(entry, options.maxLength || 160, label);
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    list.push(text);
  }
  if (list.length > maximum) throw adminError(400, 'invalid_request', label);
  return list;
}

function fightingTimes(value) {
  const list = textList(value, 3, 'Invalid fighting times.', { maxLength: 8 });
  if (list.length !== 2 || list.some((timeId) => !FIGHTING_TIME_IDS.includes(timeId))) {
    throw adminError(400, 'invalid_request', 'Exactly two fighting times are required.');
  }
  return FIGHTING_TIME_IDS.filter((timeId) => list.includes(timeId));
}

/**
 * The same two-lane FNV-style hash `createBohPlayerId()` uses in
 * `js/all-star-boh-model.js`, so a hand-filed signup and a later member entry
 * for the same name produce the same id. A manual entry has no Firebase account
 * to key on, and this keeps it stable across edits instead of inventing one per
 * save. `tests/unit/boh-signup-admin.test.mjs` compares both implementations.
 */
export function hashBohPlayerNameKey(nameKey) {
  let first = 0x811c9dc5;
  let second = 0x9e3779b9;
  const text = String(nameKey ?? '');
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

export function createBohManualPlayerId(name, discriminator = '') {
  const fold = (value) =>
    String(value ?? '')
      .normalize('NFKC')
      .replace(/\p{Cc}/gu, '')
      .replace(/\s+/gu, ' ')
      .trim()
      .toLocaleLowerCase('en');
  const nameKey = fold(name);
  const discriminatorKey = fold(discriminator);
  if (!nameKey && !discriminatorKey) {
    throw adminError(400, 'invalid_request', 'A game name is required.');
  }
  return `boh-player-${hashBohPlayerNameKey(`${nameKey}|${discriminatorKey}`)}`;
}

/** Reads and validates the request body. Every key is pinned, per action. */
export function readBohSignupAdminRequest(request) {
  const contentType = requestHeader(request, 'content-type').toLowerCase();
  if (!contentType.startsWith('application/json')) {
    throw adminError(415, 'unsupported_media_type', 'JSON is required.');
  }
  const rawBody = request?.rawBody;
  const byteLength =
    rawBody !== undefined && rawBody !== null
      ? Buffer.isBuffer(rawBody)
        ? rawBody.byteLength
        : Buffer.byteLength(String(rawBody), 'utf8')
      : Buffer.byteLength(
          typeof request?.body === 'string' ? request.body : JSON.stringify(request?.body ?? null),
          'utf8'
        );
  if (byteLength > BOH_SIGNUP_ADMIN_MAX_REQUEST_BYTES) {
    throw adminError(413, 'request_too_large', 'Request is too large.');
  }
  let body = request?.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      throw adminError(400, 'invalid_request', 'Invalid JSON.');
    }
  }
  const action = typeof body?.action === 'string' ? body.action.trim() : '';
  if (!BOH_SIGNUP_ADMIN_ACTIONS.includes(action)) {
    throw adminError(400, 'invalid_request', 'Invalid signup action.');
  }
  const expectedKeys =
    action === 'create' ? BOH_SIGNUP_ADMIN_CREATE_KEYS : BOH_SIGNUP_ADMIN_UPDATE_KEYS;
  if (
    !strictKeys(body, expectedKeys) ||
    !strictKeys(body.stats, BOH_SIGNUP_ADMIN_STAT_KEYS) ||
    !strictKeys(body.commitment, BOH_SIGNUP_ADMIN_COMMITMENT_KEYS)
  ) {
    throw adminError(400, 'invalid_request', 'Invalid signup request.');
  }

  const seasonId = normalizedText(body.seasonId, 80, 'Invalid season.');
  if (!SEASON_PATTERN.test(seasonId)) throw adminError(400, 'invalid_request', 'Invalid season.');
  const scoringProfileId = normalizedText(body.scoringProfileId, 80, 'Invalid scoring version.');
  if (!BOH_SIGNUP_ADMIN_PROFILE_IDS.includes(scoringProfileId)) {
    throw adminError(400, 'unknown_version', 'Unknown scoring version.');
  }
  const gameName = normalizedText(body.gameName, BOH_SIGNUP_ADMIN_MAX_TEXT, 'Invalid game name.');

  for (const key of REQUIRED_STAT_KEYS) {
    if (body.stats[key] === undefined) {
      throw adminError(400, 'invalid_request', `Missing ${key}.`);
    }
  }
  const stats = {
    totalCastlePower: powerValue(body.stats.totalCastlePower, 'Invalid power breakdown.'),
    troopPower: powerValue(body.stats.troopPower, 'Invalid power breakdown.'),
    buildingPower: powerValue(body.stats.buildingPower, 'Invalid power breakdown.'),
    technologyPower: powerValue(body.stats.technologyPower, 'Invalid power breakdown.'),
    heroCombatPower: powerValue(body.stats.heroCombatPower, 'Invalid power breakdown.'),
    dragonPower: powerValue(body.stats.dragonPower, 'Invalid power breakdown.'),
    unitSpecialtyPower: powerValue(body.stats.unitSpecialtyPower, 'Invalid power breakdown.'),
    t9TroopTypes: textList(body.stats.t9TroopTypes, 12, 'Invalid T9 troop types.'),
    readySpeedHeroes: textList(body.stats.readySpeedHeroes, 24, 'Invalid ready speed heroes.'),
    level50HeroCount: adminCount(body.stats.level50HeroCount, 500, 'Invalid level 50 hero count.'),
    rocLevel: adminCount(body.stats.rocLevel, 160, 'Invalid ROC level.'),
  };
  for (const key of [
    'totalCastlePower',
    'troopPower',
    'buildingPower',
    'technologyPower',
    'heroCombatPower',
    'dragonPower',
    'unitSpecialtyPower',
  ]) {
    if (!Number.isSafeInteger(stats[key])) {
      throw adminError(400, 'invalid_request', `Missing ${key}.`);
    }
  }
  if (body.stats.artifactPower !== undefined && body.stats.artifactPower !== null) {
    stats.artifactPower = powerValue(body.stats.artifactPower, 'Invalid power breakdown.');
  }
  if (body.stats.royalTechPower !== undefined && body.stats.royalTechPower !== null) {
    stats.royalTechPower = powerValue(body.stats.royalTechPower, 'Invalid power breakdown.');
  }

  const commitment = {
    availability: normalizedEnum(
      body.commitment.availability,
      AVAILABILITY_VALUES,
      'all',
      'Invalid availability.'
    ),
    preferredRole: normalizedEnum(
      body.commitment.preferredRole,
      PREFERRED_ROLE_VALUES,
      '',
      'Invalid preferred role.'
    ),
    secondaryRole: normalizedEnum(
      body.commitment.secondaryRole,
      PREFERRED_ROLE_VALUES,
      '',
      'Invalid secondary role.'
    ),
    fightingTimeIds: fightingTimes(body.commitment.fightingTimeIds),
    vts1097Member: booleanValue(body.commitment.vts1097Member, 'Invalid VTS 1097 membership flag.'),
    contactNumber: optionalText(body.commitment.contactNumber, 160, 'Invalid contact.'),
    currentState: optionalText(body.commitment.currentState, 160, 'Invalid current state.'),
    joinReason: optionalText(body.commitment.joinReason, 1000, 'Invalid join reason.'),
    notes: optionalText(body.commitment.notes, 2000, 'Invalid notes.'),
  };

  const submissionUid =
    action === 'update' ? normalizedText(body.submissionUid, 128, 'Invalid signup.') : '';
  if (action === 'update' && !SUBMISSION_ID_PATTERN.test(submissionUid)) {
    throw adminError(400, 'invalid_request', 'Invalid signup.');
  }

  return Object.freeze({
    action,
    seasonId,
    scoringProfileId,
    gameName,
    stats: Object.freeze(stats),
    commitment: Object.freeze(commitment),
    submissionUid,
  });
}

function adminCount(value, maximum, label) {
  if (!Number.isSafeInteger(value) || value < 0 || value > maximum) {
    throw adminError(400, 'invalid_request', label);
  }
  return value;
}

/**
 * The stored document, key for key what `firestore.rules`
 * (`validAllStarBohSubmissionData`) accepts and what the member form writes.
 * `preferredTeammates` is written as an empty list rather than left out: it is
 * the one optional key, and emitting the same key set from both writers keeps a
 * hand-filed signup and a member signup indistinguishable in shape.
 */
export function buildBohAdminSubmissionDocument(input) {
  const uid = String(input.uid || '');
  if (!FIREBASE_UID_PATTERN.test(uid)) {
    throw adminError(400, 'invalid_request', 'Invalid signup id.');
  }
  return {
    playerId: uid,
    uid,
    seasonId: input.seasonId,
    schemaVersion: 1,
    gameName: input.gameName,
    knownNames: [input.gameName],
    preferredTeammates: [],
    locale: '',
    timezone: '',
    entryMethod: 'manual',
    status: 'submitted',
    // The admin form offers fewer fields than the member form (no troop roster,
    // hero list, or research progress), so the optional collections are written
    // empty. Emitting them keeps the two writers' documents the same shape
    // instead of two subtly different ones the comparison has to tolerate.
    stats: {
      ...input.stats,
      t10TroopTypes: input.stats.t10TroopTypes || [],
      troopRoster: input.stats.troopRoster || [],
      usableHeroNames: input.stats.usableHeroNames || [],
      researchProgressPct: input.stats.researchProgressPct || {},
    },
    rolePreferences: [
      ...new Set([input.commitment.preferredRole, input.commitment.secondaryRole].filter(Boolean)),
    ],
    eligibleRoleIds: [],
    commitment: {
      availability: input.commitment.availability,
      preferredRole: input.commitment.preferredRole,
      secondaryRole: input.commitment.secondaryRole,
      canHelpLead: null,
      unavailableTimes: '',
      canTeleport: null,
      canUseVoice: null,
      planCommitment: null,
      notes: input.commitment.notes,
      fightingTimeIds: [...input.commitment.fightingTimeIds],
      teamNamePreferences: [],
      vts1097Member: input.commitment.vts1097Member,
      contactNumber: input.commitment.contactNumber,
      currentState: input.commitment.currentState,
      joinReason: input.commitment.joinReason,
    },
    ocr: {
      used: false,
      valuesConfirmed: false,
      confidence: null,
      warnings: [],
      fieldConfidence: {},
    },
    submittedAtMs: null,
    revision: input.revision,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
    updatedBy: input.updatedBy,
  };
}

export function getBohAdminSubmissionPath(seasonId, uid) {
  return `boh_allstar/${seasonId}/submissions/${uid}`;
}

async function verifyIdentity(request, dependencies) {
  let token;
  try {
    token = extractBearerToken(request);
  } catch {
    throw adminError(401, 'auth_required', 'Authentication is required.');
  }
  let decodedAuth;
  try {
    decodedAuth = await dependencies.auth.verifyIdToken(token, true);
  } catch {
    throw adminError(401, 'invalid_auth', 'Authentication failed.');
  }
  if (!FIREBASE_UID_PATTERN.test(String(decodedAuth?.uid || ''))) {
    throw adminError(401, 'invalid_auth', 'Authentication failed.');
  }
  let appCheckToken;
  try {
    appCheckToken = extractAppCheckToken(request);
  } catch {
    throw adminError(401, 'app_check_required', 'App Check is required.');
  }
  try {
    await dependencies.appCheck.verifyToken(appCheckToken);
  } catch {
    throw adminError(401, 'invalid_app_check', 'App Check failed.');
  }
  // The exact claim isAdmin() reads in firestore.rules. Without it this
  // endpoint would be a second, weaker door into the owner-only collection.
  if (decodedAuth.admin !== true) {
    throw adminError(403, 'admin_required', 'Admin access is required.');
  }
  return decodedAuth.uid;
}

async function readActiveConfig(dependencies, input) {
  const snapshot = await dependencies.db.doc(BOH_SIGNUP_ADMIN_CONFIG_PATH).get();
  const config = snapshotData(snapshot);
  if (!config || !SEASON_PATTERN.test(String(config.activeSeason || ''))) {
    throw adminError(409, 'season_not_configured', 'The active season is not configured.');
  }
  if (input.seasonId !== config.activeSeason) {
    throw adminError(409, 'season_not_active', 'That season is not the active season.');
  }
  if (input.scoringProfileId !== config.scoringProfileId) {
    throw adminError(409, 'version_mismatch', 'That scoring version is not the active version.');
  }
  return config;
}

async function createManualSignup(dependencies, uid, input) {
  await readActiveConfig(dependencies, input);
  const submissionUid = createBohManualPlayerId(input.gameName);
  const ref = dependencies.db.doc(getBohAdminSubmissionPath(input.seasonId, submissionUid));
  const serverTimestamp = dependencies.serverTimestamp();
  let saved = null;
  await dependencies.db.runTransaction(async (transaction) => {
    const existing = snapshotData(await transaction.get(ref));
    if (existing) {
      throw adminError(409, 'already_exists', 'A signup with that name already exists.');
    }
    saved = buildBohAdminSubmissionDocument({
      uid: submissionUid,
      seasonId: input.seasonId,
      gameName: input.gameName,
      stats: input.stats,
      commitment: input.commitment,
      revision: 1,
      createdAt: serverTimestamp,
      updatedAt: serverTimestamp,
      updatedBy: uid,
    });
    transaction.set(ref, saved);
  });
  return { created: true, submissionUid, revision: saved.revision };
}

async function updateManualSignup(dependencies, uid, input) {
  await readActiveConfig(dependencies, input);
  const ref = dependencies.db.doc(getBohAdminSubmissionPath(input.seasonId, input.submissionUid));
  const serverTimestamp = dependencies.serverTimestamp();
  let saved = null;
  await dependencies.db.runTransaction(async (transaction) => {
    const existing = snapshotData(await transaction.get(ref));
    if (!existing) {
      throw adminError(404, 'not_found', 'That signup was not found.');
    }
    // The admin form only knows a subset of the member form's fields and writes
    // the rest empty, so editing a member's own signup here would wipe their
    // troop roster, heroes and research. Only hand-filed signups are editable.
    if (existing.entryMethod !== 'manual') {
      throw adminError(409, 'member_owned', 'Only manually added signups can be edited here.');
    }
    const revision =
      Number.isInteger(existing.revision) && existing.revision > 0 ? existing.revision + 1 : 1;
    saved = buildBohAdminSubmissionDocument({
      uid: input.submissionUid,
      seasonId: input.seasonId,
      gameName: input.gameName,
      stats: input.stats,
      commitment: input.commitment,
      revision,
      // Resending the stored createdAt is what the rules require of a member
      // update; doing the same here keeps both writers byte-compatible.
      createdAt: existing.createdAt || serverTimestamp,
      updatedAt: serverTimestamp,
      updatedBy: uid,
    });
    transaction.set(ref, saved);
  });
  return { created: false, submissionUid: input.submissionUid, revision: saved.revision };
}

function safeError(error) {
  if (error instanceof BohSignupAdminError) return error;
  return adminError(503, 'service_unavailable', 'The signup service is unavailable.');
}

export function createBohSignupAdminHandler(dependencies) {
  const runtime = { ...dependencies };
  return async function bohSignupAdminHandler(request, response) {
    const origin = requestHeader(request, 'origin').trim().toLowerCase();
    if (!isAllowedAllStarBohOrigin(origin)) {
      return sendJson(response, 403, { error: 'origin_denied' });
    }
    addHeaders(response, origin);
    const method = String(request?.method || '').toUpperCase();
    if (method === 'OPTIONS') return sendEmpty(response, 204);
    if (method !== 'POST') {
      setHeader(response, 'Allow', 'POST, OPTIONS');
      return sendJson(response, 405, { error: 'method_not_allowed' });
    }
    try {
      const callerUid = await verifyIdentity(request, runtime);
      const input = readBohSignupAdminRequest(request);
      const result =
        input.action === 'create'
          ? await createManualSignup(runtime, callerUid, input)
          : await updateManualSignup(runtime, callerUid, input);
      return sendJson(response, 200, {
        schemaVersion: BOH_SIGNUP_ADMIN_SCHEMA_VERSION,
        seasonId: input.seasonId,
        scoringProfileId: input.scoringProfileId,
        signup: {
          submissionUid: result.submissionUid,
          gameName: input.gameName,
          revision: result.revision,
          created: result.created,
        },
      });
    } catch (error) {
      const safe = safeError(error);
      return sendJson(response, safe.status, { error: safe.code });
    }
  };
}
