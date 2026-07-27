import {
  AllStarBohUnlockError,
  ALL_STAR_BOH_GRANT_SCHEMA_VERSION,
  extractAppCheckToken,
  extractBearerToken,
  getAllStarBohGrantPath,
  isAllowedAllStarBohOrigin,
} from './all-star-boh-auth.js';

export const VTS_SCORE_SCHEMA_VERSION = 1;
export const VTS_SCORE_RECORD_SCHEMA_VERSION = 2;
export const VTS_SCORE_MAX_POWER = 100_000_000_000;
export const VTS_SCORE_MAX_PLAYERS = 200;
export const VTS_SCORE_MAX_REQUEST_BYTES = 8192;
export const VTS_SCORE_REQUIRED_POWER_FIELDS = Object.freeze([
  'totalCastlePower',
  'troopPower',
  'buildingPower',
  'technologyPower',
  'heroCombatPower',
  'dragonPower',
  'unitSpecialtyPower',
]);
export const VTS_SCORE_OPTIONAL_POWER_FIELDS = Object.freeze(['artifactPower', 'royalTechPower']);
export const VTS_SCORE_POWER_FIELDS = Object.freeze([
  ...VTS_SCORE_REQUIRED_POWER_FIELDS,
  ...VTS_SCORE_OPTIONAL_POWER_FIELDS,
]);

const SEASON_PATTERN = /^[A-Za-z0-9_-]{1,80}$/;
const UID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
const LEGACY_REQUEST_KEYS = Object.freeze([
  'dragonPower',
  'gameName',
  'ocr',
  'seasonId',
  'submissionUid',
]);
const LEGACY_OCR_KEYS = Object.freeze([
  'confidence',
  'corrected',
  'originalDragonPower',
  'requestId',
]);
const REQUEST_KEYS = Object.freeze(['gameName', 'ocr', 'powerValues', 'seasonId', 'submissionUid']);
const OCR_KEYS = Object.freeze(['confidence', 'correctedFields', 'requestId', 'sourceValues']);
const POWER_KEYS = Object.freeze([...VTS_SCORE_POWER_FIELDS].sort());

export class VtsScoreError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = 'VtsScoreError';
    this.status = status;
    this.code = code;
  }
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
  setHeader(response, 'Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
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

function timestampMillis(value) {
  if (typeof value?.toMillis === 'function') return value.toMillis();
  if (value instanceof Date) return value.getTime();
  if (Number.isFinite(Number(value))) return Number(value);
  return Number.NaN;
}

function normalizedText(value, maximum, label) {
  if (typeof value !== 'string') throw new VtsScoreError(400, 'invalid_request', label);
  const text = value.normalize('NFC').trim();
  const hasControlCharacter = [...text].some((character) => {
    const code = character.codePointAt(0);
    return code <= 31 || code === 127;
  });
  if (!text || Array.from(text).length > maximum || hasControlCharacter) {
    throw new VtsScoreError(400, 'invalid_request', label);
  }
  return text;
}

function strictKeys(value, expected) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const keys = Object.keys(value).sort();
  return keys.length === expected.length && keys.every((key, index) => key === expected[index]);
}

function parseInteger(value, maximum, label) {
  if (!Number.isSafeInteger(value) || value < 0 || value > maximum) {
    throw new VtsScoreError(400, 'invalid_request', label);
  }
  return value;
}

function parseNullableInteger(value, maximum, label) {
  if (value === null) return null;
  return parseInteger(value, maximum, label);
}

function parseConfidence(value, label = 'Invalid OCR confidence.') {
  if (
    value !== null &&
    (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1)
  ) {
    throw new VtsScoreError(400, 'invalid_request', label);
  }
  return value;
}

function readIdentity(body) {
  const seasonId = normalizedText(body.seasonId, 80, 'Invalid season.');
  const submissionUid = normalizedText(body.submissionUid, 128, 'Invalid signup.');
  if (!SEASON_PATTERN.test(seasonId) || !UID_PATTERN.test(submissionUid)) {
    throw new VtsScoreError(400, 'invalid_request', 'Invalid score identity.');
  }
  return {
    seasonId,
    submissionUid,
    gameName: normalizedText(body.gameName, 160, 'Invalid game name.'),
  };
}

function readLegacyVtsScoreRequest(body) {
  if (!strictKeys(body, LEGACY_REQUEST_KEYS) || !strictKeys(body.ocr, LEGACY_OCR_KEYS)) {
    throw new VtsScoreError(400, 'invalid_request', 'Invalid score request.');
  }
  const identity = readIdentity(body);
  const dragonPower = parseInteger(body.dragonPower, VTS_SCORE_MAX_POWER, 'Invalid Dragon Power.');
  const originalDragonPower = parseInteger(
    body.ocr.originalDragonPower,
    VTS_SCORE_MAX_POWER,
    'Invalid OCR audit.'
  );
  if (typeof body.ocr.corrected !== 'boolean') {
    throw new VtsScoreError(400, 'invalid_request', 'Invalid OCR correction flag.');
  }
  return Object.freeze({
    schemaVersion: 1,
    ...identity,
    dragonPower,
    ocr: Object.freeze({
      requestId: normalizedText(body.ocr.requestId, 160, 'Invalid OCR audit.'),
      originalDragonPower,
      confidence: parseConfidence(body.ocr.confidence),
      corrected: body.ocr.corrected,
    }),
  });
}

function readPowerMap(value, { required = false, label }) {
  if (!strictKeys(value, POWER_KEYS)) {
    throw new VtsScoreError(400, 'invalid_request', `Invalid ${label}.`);
  }
  const result = {};
  for (const field of VTS_SCORE_POWER_FIELDS) {
    const fieldRequired = required && VTS_SCORE_REQUIRED_POWER_FIELDS.includes(field);
    if (fieldRequired && value[field] === null) {
      throw new VtsScoreError(400, 'invalid_request', `Invalid ${label}.`);
    }
    result[field] = parseNullableInteger(value[field], VTS_SCORE_MAX_POWER, `Invalid ${label}.`);
  }
  return Object.freeze(result);
}

function readConfidenceMap(value) {
  if (!strictKeys(value, POWER_KEYS)) {
    throw new VtsScoreError(400, 'invalid_request', 'Invalid OCR confidence.');
  }
  return Object.freeze(
    Object.fromEntries(
      VTS_SCORE_POWER_FIELDS.map((field) => [
        field,
        parseConfidence(value[field], 'Invalid OCR confidence.'),
      ])
    )
  );
}

function readCurrentVtsScoreRequest(body) {
  if (!strictKeys(body, REQUEST_KEYS) || !strictKeys(body.ocr, OCR_KEYS)) {
    throw new VtsScoreError(400, 'invalid_request', 'Invalid score request.');
  }
  const identity = readIdentity(body);
  const powerValues = readPowerMap(body.powerValues, {
    required: true,
    label: 'power breakdown',
  });
  const sourceValues = readPowerMap(body.ocr.sourceValues, {
    required: false,
    label: 'OCR source values',
  });
  const confidence = readConfidenceMap(body.ocr.confidence);
  if (
    !Array.isArray(body.ocr.correctedFields) ||
    body.ocr.correctedFields.length > VTS_SCORE_POWER_FIELDS.length
  ) {
    throw new VtsScoreError(400, 'invalid_request', 'Invalid OCR corrections.');
  }
  const correctedSet = new Set(body.ocr.correctedFields);
  if (
    correctedSet.size !== body.ocr.correctedFields.length ||
    [...correctedSet].some((field) => !VTS_SCORE_POWER_FIELDS.includes(field))
  ) {
    throw new VtsScoreError(400, 'invalid_request', 'Invalid OCR corrections.');
  }
  const correctedFields = VTS_SCORE_POWER_FIELDS.filter(
    (field) => powerValues[field] !== sourceValues[field]
  );
  if (
    correctedFields.length !== correctedSet.size ||
    correctedFields.some((field) => !correctedSet.has(field))
  ) {
    throw new VtsScoreError(400, 'invalid_request', 'Invalid OCR corrections.');
  }
  return Object.freeze({
    schemaVersion: VTS_SCORE_RECORD_SCHEMA_VERSION,
    ...identity,
    powerValues,
    ocr: Object.freeze({
      requestId: normalizedText(body.ocr.requestId, 160, 'Invalid OCR audit.'),
      sourceValues,
      confidence,
      correctedFields: Object.freeze(correctedFields),
    }),
  });
}

export function readVtsScoreRequest(request) {
  const contentType = requestHeader(request, 'content-type').toLowerCase();
  if (!contentType.startsWith('application/json')) {
    throw new VtsScoreError(415, 'unsupported_media_type', 'JSON is required.');
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
  if (byteLength > VTS_SCORE_MAX_REQUEST_BYTES) {
    throw new VtsScoreError(413, 'request_too_large', 'Request is too large.');
  }
  let body = request?.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      throw new VtsScoreError(400, 'invalid_json', 'Invalid JSON.');
    }
  }
  return Object.prototype.hasOwnProperty.call(body || {}, 'powerValues')
    ? readCurrentVtsScoreRequest(body)
    : readLegacyVtsScoreRequest(body);
}

async function verifyRequestIdentity(request, dependencies) {
  let decodedAuth;
  try {
    decodedAuth = await dependencies.auth.verifyIdToken(extractBearerToken(request), true);
  } catch {
    throw new VtsScoreError(401, 'invalid_auth', 'Authentication failed.');
  }
  if (!UID_PATTERN.test(String(decodedAuth?.uid || ''))) {
    throw new VtsScoreError(401, 'invalid_auth', 'Authentication failed.');
  }
  try {
    await dependencies.appCheck.verifyToken(extractAppCheckToken(request));
  } catch {
    throw new VtsScoreError(401, 'invalid_app_check', 'App Check failed.');
  }
  return decodedAuth.uid;
}

function validateGrant(raw, uid, nowMs, expectedSeason = '') {
  const expiresAtMs = timestampMillis(raw?.expiresAt);
  if (
    raw?.schemaVersion !== ALL_STAR_BOH_GRANT_SCHEMA_VERSION ||
    raw?.uid !== uid ||
    !SEASON_PATTERN.test(String(raw?.seasonId || '')) ||
    (expectedSeason && raw.seasonId !== expectedSeason) ||
    !Number.isFinite(expiresAtMs) ||
    expiresAtMs <= nowMs
  ) {
    throw new VtsScoreError(403, 'access_expired', 'Member access has expired.');
  }
  return raw.seasonId;
}

async function getGrant(dependencies, uid, expectedSeason = '') {
  const snapshot = await dependencies.db.doc(getAllStarBohGrantPath(uid)).get();
  return validateGrant(
    snapshotData(snapshot),
    uid,
    Math.max(0, Math.trunc(Number(dependencies.now()))),
    expectedSeason
  );
}

function eligiblePlayer(snapshot) {
  const raw = snapshotData(snapshot);
  const submissionUid = String(snapshot?.id || '');
  if (!raw || raw.status !== 'submitted' || !UID_PATTERN.test(submissionUid)) return null;
  try {
    return Object.freeze({
      submissionUid,
      gameName: normalizedText(raw.gameName, 160, 'Invalid game name.'),
    });
  } catch {
    return null;
  }
}

async function listPlayers(dependencies, uid) {
  const seasonId = await getGrant(dependencies, uid);
  const snapshot = await dependencies.db.collection(`boh_allstar/${seasonId}/submissions`).get();
  const players = (snapshot?.docs || [])
    .map(eligiblePlayer)
    .filter(Boolean)
    .sort(
      (left, right) =>
        left.gameName.localeCompare(right.gameName, 'en', { sensitivity: 'base' }) ||
        left.submissionUid.localeCompare(right.submissionUid)
    )
    .slice(0, VTS_SCORE_MAX_PLAYERS);
  return { seasonId, players };
}

async function saveScore(dependencies, uid, input) {
  const nowMs = Math.max(0, Math.trunc(Number(dependencies.now())));
  const grantRef = dependencies.db.doc(getAllStarBohGrantPath(uid));
  const submissionRef = dependencies.db.doc(
    `boh_allstar/${input.seasonId}/submissions/${input.submissionUid}`
  );
  const scoreRef = dependencies.db.doc(
    `boh_allstar/${input.seasonId}/raceScores/${input.submissionUid}`
  );
  let saved;
  await dependencies.db.runTransaction(async (transaction) => {
    const [grantSnapshot, submissionSnapshot, scoreSnapshot] = await Promise.all([
      transaction.get(grantRef),
      transaction.get(submissionRef),
      transaction.get(scoreRef),
    ]);
    validateGrant(snapshotData(grantSnapshot), uid, nowMs, input.seasonId);
    const submission = snapshotData(submissionSnapshot);
    if (!submission || submission.status !== 'submitted') {
      throw new VtsScoreError(404, 'signup_not_found', 'Signup was not found.');
    }
    const storedName = normalizedText(submission.gameName, 160, 'Invalid stored game name.');
    if (storedName !== input.gameName) {
      throw new VtsScoreError(409, 'signup_changed', 'Signup identity changed.');
    }
    const existing = snapshotData(scoreSnapshot);
    if (existing && existing.submittedByUid !== uid) {
      throw new VtsScoreError(409, 'already_submitted', 'A final score already exists.');
    }
    const revision = Number.isInteger(existing?.revision) ? existing.revision + 1 : 1;
    const scorePayload =
      input.schemaVersion === VTS_SCORE_RECORD_SCHEMA_VERSION
        ? { powerValues: input.powerValues, ocr: input.ocr }
        : { dragonPower: input.dragonPower, ocr: input.ocr };
    saved = {
      schemaVersion: input.schemaVersion,
      seasonId: input.seasonId,
      submissionUid: input.submissionUid,
      gameName: input.gameName,
      baselineSubmissionRevision: Number.isInteger(submission.revision) ? submission.revision : 0,
      ...scorePayload,
      submittedByUid: existing?.submittedByUid || uid,
      revision,
      createdAt: existing?.createdAt || dependencies.serverTimestamp(),
      updatedAt: dependencies.serverTimestamp(),
    };
    transaction.set(scoreRef, saved);
  });
  const response = {
    submissionUid: saved.submissionUid,
    gameName: saved.gameName,
    revision: saved.revision,
  };
  if (saved.schemaVersion === VTS_SCORE_RECORD_SCHEMA_VERSION) {
    response.schemaVersion = VTS_SCORE_RECORD_SCHEMA_VERSION;
    response.powerValues = saved.powerValues;
  } else {
    response.dragonPower = saved.dragonPower;
  }
  return response;
}

function safeError(error) {
  if (error instanceof VtsScoreError) return error;
  if (error instanceof AllStarBohUnlockError) {
    return new VtsScoreError(error.status, error.code, error.message);
  }
  return new VtsScoreError(503, 'service_unavailable', 'VtsScore is unavailable.');
}

export function createVtsScoreHandler(dependencies) {
  const runtime = { now: Date.now, ...dependencies };
  return async function vtsScoreHandler(request, response) {
    const origin = requestHeader(request, 'origin').trim().toLowerCase();
    if (!isAllowedAllStarBohOrigin(origin)) {
      return sendJson(response, 403, { error: 'origin_denied' });
    }
    addHeaders(response, origin);
    const method = String(request?.method || '').toUpperCase();
    if (method === 'OPTIONS') return sendEmpty(response, 204);
    if (!['GET', 'POST'].includes(method)) {
      setHeader(response, 'Allow', 'GET, POST, OPTIONS');
      return sendJson(response, 405, { error: 'method_not_allowed' });
    }
    try {
      const uid = await verifyRequestIdentity(request, runtime);
      if (method === 'GET') {
        const result = await listPlayers(runtime, uid);
        return sendJson(response, 200, {
          schemaVersion: VTS_SCORE_SCHEMA_VERSION,
          seasonId: result.seasonId,
          players: result.players,
        });
      }
      const score = await saveScore(runtime, uid, readVtsScoreRequest(request));
      return sendJson(response, 200, {
        schemaVersion: VTS_SCORE_SCHEMA_VERSION,
        score,
      });
    } catch (error) {
      const safe = safeError(error);
      return sendJson(response, safe.status, { error: safe.code });
    }
  };
}
