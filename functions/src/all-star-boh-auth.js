import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

export const ALL_STAR_BOH_CONFIG_PATH = 'boh_allstar_config/current';
export const ALL_STAR_BOH_ATTEMPT_COLLECTION = 'boh_allstar_security_attempts';
export const ALL_STAR_BOH_GRANT_COLLECTION = 'boh_allstar_member_grants';
export const ALL_STAR_BOH_GRANT_SCHEMA_VERSION = 1;
export const MAX_UNLOCK_REQUEST_BYTES = 1024;
export const MIN_CONFIGURED_PIN_LENGTH = 12;
export const MAX_PIN_LENGTH = 128;
export const THROTTLE_POLICY = Object.freeze({
  windowMs: 10 * 60 * 1000,
  maxFailures: 5,
  lockoutMs: 15 * 60 * 1000,
  retentionMs: 24 * 60 * 60 * 1000,
});

const SEASON_PATTERN = /^[A-Za-z0-9_-]{1,80}$/;
const FIREBASE_UID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
const FIREBASE_PREVIEW_HOST_PATTERN =
  /^abocombo--[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.(?:web\.app|firebaseapp\.com)$/;
const EXACT_PRODUCTION_ORIGINS = new Set(['https://roc-vts.com', 'https://www.roc-vts.com']);

export class AllStarBohUnlockError extends Error {
  constructor(status, code, message, options = {}) {
    super(message);
    this.name = 'AllStarBohUnlockError';
    this.status = status;
    this.code = code;
    this.retryAfterSeconds = options.retryAfterSeconds || 0;
  }
}

function requestHeader(request, name) {
  if (typeof request?.get === 'function') {
    const value = request.get(name);
    if (value !== undefined && value !== null) return String(value);
  }
  const lowerName = name.toLowerCase();
  const value = request?.headers?.[lowerName] ?? request?.headers?.[name];
  if (Array.isArray(value)) return value.join(',');
  return value === undefined || value === null ? '' : String(value);
}

export function isAllowedAllStarBohOrigin(originInput) {
  const origin = String(originInput || '')
    .trim()
    .toLowerCase();
  if (EXACT_PRODUCTION_ORIGINS.has(origin)) return true;
  let parsed;
  try {
    parsed = new URL(origin);
  } catch {
    return false;
  }
  if (parsed.origin !== origin || parsed.username || parsed.password) return false;
  if (
    parsed.protocol === 'http:' &&
    ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname)
  ) {
    return true;
  }
  return (
    parsed.protocol === 'https:' &&
    !parsed.port &&
    FIREBASE_PREVIEW_HOST_PATTERN.test(parsed.hostname)
  );
}

export function readAllStarBohPinRequest(request) {
  const contentType = requestHeader(request, 'content-type').toLowerCase();
  if (!contentType.startsWith('application/json')) {
    throw new AllStarBohUnlockError(415, 'unsupported_media_type', 'JSON is required.');
  }

  const rawBody = request?.rawBody;
  let byteLength = 0;
  if (rawBody !== undefined && rawBody !== null) {
    byteLength = Buffer.isBuffer(rawBody)
      ? rawBody.byteLength
      : Buffer.byteLength(String(rawBody), 'utf8');
  } else if (typeof request?.body === 'string') {
    byteLength = Buffer.byteLength(request.body, 'utf8');
  } else {
    byteLength = Buffer.byteLength(JSON.stringify(request?.body ?? null), 'utf8');
  }
  if (byteLength > MAX_UNLOCK_REQUEST_BYTES) {
    throw new AllStarBohUnlockError(413, 'request_too_large', 'Request is too large.');
  }

  let body = request?.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      throw new AllStarBohUnlockError(400, 'invalid_request', 'Invalid JSON request.');
    }
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new AllStarBohUnlockError(400, 'invalid_request', 'Invalid unlock request.');
  }
  const keys = Object.keys(body);
  if (keys.length !== 1 || keys[0] !== 'pin') {
    throw new AllStarBohUnlockError(400, 'invalid_request', 'Invalid unlock request.');
  }
  if (typeof body.pin !== 'string' || body.pin.length < 1 || body.pin.length > MAX_PIN_LENGTH) {
    throw new AllStarBohUnlockError(400, 'invalid_request', 'Invalid unlock request.');
  }
  return body.pin;
}

export function extractBearerToken(request) {
  const header = requestHeader(request, 'authorization');
  const match = /^Bearer ([^\s]{1,4096})$/i.exec(header);
  if (!match) {
    throw new AllStarBohUnlockError(401, 'auth_required', 'Authentication is required.');
  }
  return match[1];
}

export function extractAppCheckToken(request) {
  const token = requestHeader(request, 'x-firebase-appcheck').trim();
  if (!token || token.length > 8192) {
    throw new AllStarBohUnlockError(401, 'app_check_required', 'App Check is required.');
  }
  return token;
}

export function extractClientAddress(request) {
  const direct = String(request?.ip || '').trim();
  const forwarded = requestHeader(request, 'x-forwarded-for').split(',')[0].trim();
  const socketAddress = String(request?.socket?.remoteAddress || '').trim();
  return (direct || forwarded || socketAddress || 'unavailable').slice(0, 128);
}

export function constantTimePinMatches(candidateInput, expectedInput) {
  const candidateDigest = createHash('sha256').update(String(candidateInput), 'utf8').digest();
  const expectedDigest = createHash('sha256').update(String(expectedInput), 'utf8').digest();
  return timingSafeEqual(candidateDigest, expectedDigest);
}

export function hashThrottleKey(scope, value, pepperInput) {
  const normalizedScope = String(scope);
  if (!['uid', 'ip'].includes(normalizedScope)) {
    throw new TypeError('Throttle scope must be uid or ip.');
  }
  const pepper = String(pepperInput || '');
  if (pepper.length < 32) {
    throw new AllStarBohUnlockError(503, 'service_unavailable', 'Unlock is unavailable.');
  }
  return createHmac('sha256', pepper)
    .update(`${normalizedScope}\0${String(value)}`, 'utf8')
    .digest('hex');
}

export function normalizeAllStarBohUnlockConfig(rawConfig) {
  if (!rawConfig || typeof rawConfig !== 'object' || Array.isArray(rawConfig)) {
    throw new AllStarBohUnlockError(503, 'service_unavailable', 'Unlock is unavailable.');
  }
  const activeSeason = String(rawConfig.activeSeason || '');
  const grantDurationMinutes = Number(rawConfig.grantDurationMinutes);
  if (
    !SEASON_PATTERN.test(activeSeason) ||
    typeof rawConfig.open !== 'boolean' ||
    !Number.isInteger(grantDurationMinutes) ||
    grantDurationMinutes < 5 ||
    grantDurationMinutes > 10_080
  ) {
    throw new AllStarBohUnlockError(503, 'service_unavailable', 'Unlock is unavailable.');
  }
  return Object.freeze({
    activeSeason,
    open: rawConfig.open,
    grantDurationMinutes,
  });
}

export function getAllStarBohGrantPath(uidInput) {
  const uid = String(uidInput || '');
  if (!FIREBASE_UID_PATTERN.test(uid)) {
    throw new AllStarBohUnlockError(401, 'invalid_auth', 'Authentication failed.');
  }
  return `${ALL_STAR_BOH_GRANT_COLLECTION}/${uid}`;
}

/**
 * Issues the member grant without touching Firebase Auth custom claims.
 * Custom-claim writes replace the entire claims object and cannot be made
 * race-safe against an independent admin-claim writer. A server-owned
 * Firestore document avoids restoring revoked privileges or clobbering any
 * concurrent claims, while the transaction makes activeSeason authoritative.
 */
export async function issueAllStarBohGrant(options) {
  const { db, uid, nowMs, timestampFromMillis, serverTimestamp } = options;
  const grantPath = getAllStarBohGrantPath(uid);
  const configRef = db.doc(ALL_STAR_BOH_CONFIG_PATH);
  const grantRef = db.doc(grantPath);
  return db.runTransaction(async (transaction) => {
    const config = normalizeAllStarBohUnlockConfig(snapshotData(await transaction.get(configRef)));
    if (!config.open) {
      throw new AllStarBohUnlockError(409, 'signups_closed', 'All-Star BoH access is closed.');
    }
    const expiresAtMs = nowMs + config.grantDurationMinutes * 60 * 1000;
    if (!Number.isSafeInteger(expiresAtMs) || expiresAtMs <= nowMs) {
      throw new AllStarBohUnlockError(503, 'service_unavailable', 'Unlock is unavailable.');
    }
    const expiresAt = Math.floor(expiresAtMs / 1000);
    transaction.set(grantRef, {
      schemaVersion: ALL_STAR_BOH_GRANT_SCHEMA_VERSION,
      uid,
      seasonId: config.activeSeason,
      issuedAt: serverTimestamp(),
      expiresAt: timestampFromMillis(expiresAtMs),
    });
    return Object.freeze({ season: config.activeSeason, expiresAt, grantPath });
  });
}

function numericStateValue(value, fallback = 0) {
  return Number.isFinite(Number(value)) ? Math.max(0, Math.trunc(Number(value))) : fallback;
}

export function evaluateAllStarBohAttempt(rawState, nowMs, succeeded, policy = THROTTLE_POLICY) {
  const now = Math.max(0, Math.trunc(Number(nowMs)));
  const state = rawState && typeof rawState === 'object' ? rawState : {};
  const lockedUntilMs = numericStateValue(state.lockedUntilMs);
  if (lockedUntilMs > now) {
    return Object.freeze({
      locked: true,
      clear: false,
      retryAfterMs: lockedUntilMs - now,
      payload: null,
    });
  }
  if (succeeded) {
    return Object.freeze({ locked: false, clear: true, retryAfterMs: 0, payload: null });
  }

  const previousWindowStart = numericStateValue(state.windowStartedAtMs, now);
  const inCurrentWindow =
    now - previousWindowStart >= 0 && now - previousWindowStart < policy.windowMs;
  const windowStartedAtMs = inCurrentWindow ? previousWindowStart : now;
  const previousFailures = inCurrentWindow ? numericStateValue(state.failedCount) : 0;
  const failedCount = previousFailures + 1;
  const nextLockedUntilMs = failedCount >= policy.maxFailures ? now + policy.lockoutMs : 0;
  return Object.freeze({
    locked: nextLockedUntilMs > now,
    clear: false,
    retryAfterMs: Math.max(0, nextLockedUntilMs - now),
    payload: Object.freeze({
      windowStartedAtMs,
      failedCount,
      lockedUntilMs: nextLockedUntilMs,
    }),
  });
}

function snapshotData(snapshot) {
  if (!snapshot) return null;
  const exists = typeof snapshot.exists === 'boolean' ? snapshot.exists : snapshot.exists?.();
  return exists && typeof snapshot.data === 'function' ? snapshot.data() : null;
}

export async function applyAllStarBohThrottle(options) {
  const { db, uidDigest, ipDigest, nowMs, succeeded, timestampFromMillis, serverTimestamp } =
    options;
  const entries = [
    { scope: 'uid', digest: uidDigest },
    { scope: 'ip', digest: ipDigest },
  ];
  return db.runTransaction(async (transaction) => {
    const snapshots = [];
    for (const entry of entries) {
      const ref = db.doc(`${ALL_STAR_BOH_ATTEMPT_COLLECTION}/${entry.scope}_${entry.digest}`);
      snapshots.push({ ...entry, ref, snapshot: await transaction.get(ref) });
    }
    const evaluations = snapshots.map((entry) => ({
      ...entry,
      evaluation: evaluateAllStarBohAttempt(snapshotData(entry.snapshot), nowMs, succeeded),
    }));
    const activeLock = evaluations.find(
      (entry) => entry.evaluation.locked && !entry.evaluation.payload
    );
    if (activeLock) {
      return {
        locked: true,
        retryAfterMs: Math.max(...evaluations.map((entry) => entry.evaluation.retryAfterMs)),
      };
    }
    if (succeeded) {
      evaluations.forEach((entry) => transaction.delete(entry.ref));
      return { locked: false, retryAfterMs: 0 };
    }
    for (const entry of evaluations) {
      const { payload } = entry.evaluation;
      transaction.set(entry.ref, {
        scope: entry.scope,
        windowStartedAtMs: payload.windowStartedAtMs,
        failedCount: payload.failedCount,
        lockedUntilMs: payload.lockedUntilMs,
        updatedAt: serverTimestamp(),
        expiresAt: timestampFromMillis(
          Math.max(nowMs + THROTTLE_POLICY.retentionMs, payload.lockedUntilMs)
        ),
      });
    }
    return {
      locked: evaluations.some((entry) => entry.evaluation.locked),
      retryAfterMs: Math.max(...evaluations.map((entry) => entry.evaluation.retryAfterMs)),
    };
  });
}

function setResponseHeader(response, name, value) {
  if (typeof response?.set === 'function') response.set(name, value);
  else if (typeof response?.setHeader === 'function') response.setHeader(name, value);
}

function sendJson(response, status, body) {
  if (typeof response?.status === 'function') response.status(status);
  if (typeof response?.json === 'function') return response.json(body);
  if (typeof response?.send === 'function') return response.send(JSON.stringify(body));
  response.statusCode = status;
  return response.end?.(JSON.stringify(body));
}

function sendEmpty(response, status) {
  if (typeof response?.status === 'function') response.status(status);
  if (typeof response?.send === 'function') return response.send('');
  response.statusCode = status;
  return response.end?.();
}

function addSecurityHeaders(response) {
  setResponseHeader(response, 'Cache-Control', 'no-store, max-age=0');
  setResponseHeader(response, 'Pragma', 'no-cache');
  setResponseHeader(response, 'X-Content-Type-Options', 'nosniff');
  setResponseHeader(response, 'Referrer-Policy', 'no-referrer');
}

function addCorsHeaders(response, origin) {
  setResponseHeader(response, 'Access-Control-Allow-Origin', origin);
  setResponseHeader(response, 'Access-Control-Allow-Methods', 'POST, OPTIONS');
  setResponseHeader(
    response,
    'Access-Control-Allow-Headers',
    'Authorization, Content-Type, X-Firebase-AppCheck'
  );
  setResponseHeader(response, 'Vary', 'Origin');
}

function safeUnlockError(error) {
  if (error instanceof AllStarBohUnlockError) return error;
  return new AllStarBohUnlockError(503, 'service_unavailable', 'Unlock is unavailable.');
}

export function createUnlockAllStarBohHandler(dependencies) {
  const {
    auth,
    appCheck,
    db,
    getMemberPin,
    getThrottlePepper,
    timestampFromMillis,
    serverTimestamp,
    now = Date.now,
  } = dependencies;

  return async function unlockAllStarBohHandler(request, response) {
    addSecurityHeaders(response);
    const origin = requestHeader(request, 'origin').trim().toLowerCase();
    if (!isAllowedAllStarBohOrigin(origin)) {
      return sendJson(response, 403, { error: 'origin_denied' });
    }
    addCorsHeaders(response, origin);
    if (String(request?.method || '').toUpperCase() === 'OPTIONS') {
      return sendEmpty(response, 204);
    }
    if (String(request?.method || '').toUpperCase() !== 'POST') {
      setResponseHeader(response, 'Allow', 'POST, OPTIONS');
      return sendJson(response, 405, { error: 'method_not_allowed' });
    }

    try {
      const pin = readAllStarBohPinRequest(request);
      const idToken = extractBearerToken(request);
      const appCheckToken = extractAppCheckToken(request);

      let decodedAuth;
      try {
        decodedAuth = await auth.verifyIdToken(idToken, true);
      } catch {
        throw new AllStarBohUnlockError(401, 'invalid_auth', 'Authentication failed.');
      }
      if (!decodedAuth?.uid || typeof decodedAuth.uid !== 'string') {
        throw new AllStarBohUnlockError(401, 'invalid_auth', 'Authentication failed.');
      }
      try {
        await appCheck.verifyToken(appCheckToken);
      } catch {
        throw new AllStarBohUnlockError(401, 'invalid_app_check', 'App Check failed.');
      }

      const expectedPin = String(getMemberPin?.() || '');
      const throttlePepper = String(getThrottlePepper?.() || '');
      if (
        expectedPin.length < MIN_CONFIGURED_PIN_LENGTH ||
        expectedPin.length > MAX_PIN_LENGTH ||
        throttlePepper.length < 32
      ) {
        throw new AllStarBohUnlockError(503, 'service_unavailable', 'Unlock is unavailable.');
      }
      const succeeded = constantTimePinMatches(pin, expectedPin);
      const uidDigest = hashThrottleKey('uid', decodedAuth.uid, throttlePepper);
      const ipDigest = hashThrottleKey('ip', extractClientAddress(request), throttlePepper);
      const nowMs = Math.max(0, Math.trunc(Number(now())));
      const throttle = await applyAllStarBohThrottle({
        db,
        uidDigest,
        ipDigest,
        nowMs,
        succeeded,
        timestampFromMillis,
        serverTimestamp,
      });
      if (throttle.locked) {
        const retryAfterSeconds = Math.max(1, Math.ceil(throttle.retryAfterMs / 1000));
        setResponseHeader(response, 'Retry-After', String(retryAfterSeconds));
        throw new AllStarBohUnlockError(429, 'temporarily_locked', 'Try again later.', {
          retryAfterSeconds,
        });
      }
      if (!succeeded) {
        throw new AllStarBohUnlockError(403, 'access_denied', 'Access denied.');
      }

      let grant;
      try {
        grant = await issueAllStarBohGrant({
          db,
          uid: decodedAuth.uid,
          nowMs,
          timestampFromMillis,
          serverTimestamp,
        });
      } catch (error) {
        if (error instanceof AllStarBohUnlockError) throw error;
        throw new AllStarBohUnlockError(503, 'service_unavailable', 'Unlock is unavailable.');
      }

      return sendJson(response, 200, {
        season: grant.season,
        expiresAt: grant.expiresAt,
      });
    } catch (error) {
      const safeError = safeUnlockError(error);
      if (safeError.retryAfterSeconds > 0) {
        setResponseHeader(response, 'Retry-After', String(safeError.retryAfterSeconds));
      }
      return sendJson(response, safeError.status, { error: safeError.code });
    }
  };
}
