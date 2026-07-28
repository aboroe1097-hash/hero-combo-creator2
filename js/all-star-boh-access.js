export const ALL_STAR_BOH_UNLOCK_ENDPOINT =
  'https://us-central1-abocombo.cloudfunctions.net/unlockAllStarBoh';
export const VTS_COMP11_UNLOCK_ENDPOINT =
  'https://us-central1-abocombo.cloudfunctions.net/unlockVtsScore';
export const ALL_STAR_BOH_OCR_ENDPOINT =
  'https://delicate-term-725f.aboroe1097.workers.dev/boh/stats-ocr';
export const VTS_SCORE_ENDPOINT = 'https://us-central1-abocombo.cloudfunctions.net/vtsScore';
export const ALL_STAR_BOH_GRANT_ENDPOINT =
  'https://firestore.googleapis.com/v1/projects/abocombo/databases/(default)/documents/boh_allstar_member_grants';
export const ALL_STAR_BOH_GRANT_SCHEMA_VERSION = 1;

const MAX_PIN_LENGTH = 128;
const MAX_RESPONSE_BYTES = 1024 * 1024;
const UNLOCK_TIMEOUT_MS = 30_000;
const OCR_TIMEOUT_MS = 90_000;
const SCORE_TIMEOUT_MS = 30_000;
const MAX_CLOCK_SKEW_SECONDS = 5 * 60;
const SEASON_PATTERN = /^[a-z0-9_-]{1,80}$/iu;
const OCR_REQUEST_KEYS = Object.freeze(['imageData', 'screenshotType', 'seasonId']);
const VTS_SCORE_POWER_FIELDS = Object.freeze([
  'totalCastlePower',
  'troopPower',
  'buildingPower',
  'technologyPower',
  'heroCombatPower',
  'dragonPower',
  'unitSpecialtyPower',
  'artifactPower',
  'royalTechPower',
]);

export class AllStarBohAccessError extends Error {
  constructor(code, message, options = {}) {
    super(message);
    this.name = 'AllStarBohAccessError';
    this.code = code;
    this.status = Number.isInteger(options.status) ? options.status : 0;
    this.retryAfterSeconds = Number.isInteger(options.retryAfterSeconds)
      ? options.retryAfterSeconds
      : 0;
    if (options.cause) this.cause = options.cause;
  }
}

function accessError(code, message, options) {
  return new AllStarBohAccessError(code, message, options);
}

function normalizeSeason(value) {
  const season = String(value || '').trim();
  return SEASON_PATTERN.test(season) ? season : '';
}

function nowSeconds(now) {
  return Math.floor(Number(now()) / 1000);
}

export function readAllStarBohAccessGrant(grantInput, options = {}) {
  if (!grantInput || typeof grantInput !== 'object' || Array.isArray(grantInput)) return null;
  const season = normalizeSeason(grantInput.seasonId ?? grantInput.season);
  const expiresAt = grantInput.expiresAt;
  if (!season || !Number.isSafeInteger(expiresAt)) return null;

  const expectedSeason = options.expectedSeason ? normalizeSeason(options.expectedSeason) : '';
  if (options.expectedSeason && (!expectedSeason || season !== expectedSeason)) return null;
  const now = options.now || Date.now;
  const minimumRemainingSeconds = Math.max(
    0,
    Number.isSafeInteger(options.minimumRemainingSeconds) ? options.minimumRemainingSeconds : 5
  );
  if (expiresAt <= nowSeconds(now) + minimumRemainingSeconds) return null;
  return Object.freeze({ seasonId: season, expiresAt });
}

function readFirestoreString(fields, name) {
  const value = fields?.[name];
  return value && typeof value.stringValue === 'string' ? value.stringValue : '';
}

function readFirestoreInteger(fields, name) {
  const raw = fields?.[name]?.integerValue;
  if (typeof raw !== 'string' || !/^-?\d+$/u.test(raw)) return null;
  const value = Number(raw);
  return Number.isSafeInteger(value) ? value : null;
}

function readFirestoreTimestampSeconds(fields, name) {
  const raw = fields?.[name]?.timestampValue;
  if (typeof raw !== 'string' || !raw) return null;
  const milliseconds = Date.parse(raw);
  return Number.isFinite(milliseconds) ? Math.floor(milliseconds / 1000) : null;
}

/** Parses only the fixed, server-owned member-grant document schema. */
export function readAllStarBohGrantDocument(documentInput, expectedUidInput, options = {}) {
  const expectedUid = String(expectedUidInput || '');
  const fields = documentInput?.fields;
  if (!expectedUid || !fields || typeof fields !== 'object' || Array.isArray(fields)) return null;
  const allowedFields = new Set(['schemaVersion', 'uid', 'seasonId', 'issuedAt', 'expiresAt']);
  const fieldNames = Object.keys(fields);
  if (
    fieldNames.length !== allowedFields.size ||
    fieldNames.some((name) => !allowedFields.has(name))
  ) {
    return null;
  }
  if (readFirestoreInteger(fields, 'schemaVersion') !== ALL_STAR_BOH_GRANT_SCHEMA_VERSION) {
    return null;
  }
  if (readFirestoreString(fields, 'uid') !== expectedUid) return null;
  const issuedAt = readFirestoreTimestampSeconds(fields, 'issuedAt');
  const expiresAt = readFirestoreTimestampSeconds(fields, 'expiresAt');
  const now = options.now || Date.now;
  if (
    !Number.isSafeInteger(issuedAt) ||
    !Number.isSafeInteger(expiresAt) ||
    issuedAt > nowSeconds(now) + MAX_CLOCK_SKEW_SECONDS ||
    issuedAt >= expiresAt
  ) {
    return null;
  }
  return readAllStarBohAccessGrant(
    { seasonId: readFirestoreString(fields, 'seasonId'), expiresAt },
    options
  );
}

function validateEndpoint(value, label) {
  let url;
  try {
    url = new URL(String(value || ''));
  } catch {
    throw accessError('invalid_endpoint', `${label} endpoint is invalid.`);
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.hash || url.search) {
    throw accessError('invalid_endpoint', `${label} endpoint is invalid.`);
  }
  return url.href;
}

function retryAfterSeconds(response) {
  const value = Number(response?.headers?.get?.('retry-after'));
  return Number.isSafeInteger(value) && value > 0 ? value : 0;
}

async function readJsonResponse(response) {
  if (typeof response?.text === 'function') {
    const text = await response.text();
    if (text.length > MAX_RESPONSE_BYTES) {
      throw accessError('invalid_response', 'The service response was too large.');
    }
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch (cause) {
      throw accessError('invalid_response', 'The service returned an invalid response.', {
        cause,
      });
    }
  }
  if (typeof response?.json === 'function') {
    try {
      return await response.json();
    } catch (cause) {
      throw accessError('invalid_response', 'The service returned an invalid response.', {
        cause,
      });
    }
  }
  return null;
}

function responseError(response, payload, fallbackCode) {
  const allowedCodes = new Set([
    'access_denied',
    'app_check_required',
    'auth_required',
    'boh_ocr_not_configured',
    'invalid_app_check',
    'invalid_auth',
    'invalid_json',
    'invalid_request',
    'method_not_allowed',
    'origin_denied',
    'rate_limited',
    'request_too_large',
    'service_unavailable',
    'signup_changed',
    'signup_not_found',
    'already_submitted',
    'signups_closed',
    'temporarily_locked',
    'unsupported_media_type',
  ]);
  const code =
    [payload?.error, payload?.code].find(
      (candidate) => typeof candidate === 'string' && allowedCodes.has(candidate)
    ) || fallbackCode;
  return accessError(code, 'The secure All-Star service could not complete the request.', {
    status: Number(response?.status) || 0,
    retryAfterSeconds: retryAfterSeconds(response),
  });
}

function validateOcrRequest(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw accessError('invalid_ocr_request', 'The OCR request is invalid.');
  }
  const keys = Object.keys(payload).sort();
  if (
    keys.length !== OCR_REQUEST_KEYS.length ||
    keys.some((key, index) => key !== OCR_REQUEST_KEYS[index])
  ) {
    throw accessError('invalid_ocr_request', 'The OCR request is invalid.');
  }
  const seasonId = normalizeSeason(payload.seasonId);
  if (
    !seasonId ||
    payload.screenshotType !== 'power_breakdown' ||
    typeof payload.imageData !== 'string' ||
    !payload.imageData.startsWith('data:image/jpeg;base64,')
  ) {
    throw accessError('invalid_ocr_request', 'The OCR request is invalid.');
  }
  return Object.freeze({
    seasonId,
    screenshotType: 'power_breakdown',
    imageData: payload.imageData,
  });
}

export function createAllStarBohAccessClient(options = {}) {
  const fetchImpl = options.fetch || globalThis.fetch?.bind(globalThis);
  const getUser = options.getUser;
  const getAppCheckToken = options.getAppCheckToken;
  const AbortControllerImpl = options.AbortController || globalThis.AbortController;
  const setTimer = options.setTimeout || globalThis.setTimeout?.bind(globalThis);
  const clearTimer = options.clearTimeout || globalThis.clearTimeout?.bind(globalThis);
  const now = options.now || Date.now;
  if (
    typeof fetchImpl !== 'function' ||
    typeof getUser !== 'function' ||
    typeof getAppCheckToken !== 'function' ||
    typeof AbortControllerImpl !== 'function'
  ) {
    throw new TypeError('All-Star BoH access dependencies are incomplete.');
  }

  const unlockEndpoint = validateEndpoint(
    options.unlockEndpoint || ALL_STAR_BOH_UNLOCK_ENDPOINT,
    'Unlock'
  );
  const ocrEndpoint = validateEndpoint(options.ocrEndpoint || ALL_STAR_BOH_OCR_ENDPOINT, 'OCR');
  const scoreEndpoint = validateEndpoint(options.scoreEndpoint || VTS_SCORE_ENDPOINT, 'VtsScore');
  const grantEndpoint = validateEndpoint(
    options.grantEndpoint || ALL_STAR_BOH_GRANT_ENDPOINT,
    'Member grant'
  ).replace(/\/$/u, '');
  const activeControllers = new Set();
  let destroyed = false;

  async function resolveUser() {
    const user = await getUser();
    if (!user?.uid || typeof user.getIdToken !== 'function') {
      throw accessError('auth_required', 'Firebase authentication is required.');
    }
    return user;
  }

  async function requestCredentials(user, forceAppCheck = false) {
    const [idToken, appCheckToken] = await Promise.all([
      user.getIdToken(false),
      getAppCheckToken(forceAppCheck),
    ]);
    if (
      typeof idToken !== 'string' ||
      !idToken ||
      typeof appCheckToken !== 'string' ||
      !appCheckToken
    ) {
      throw accessError('app_check_required', 'Secure app verification is required.');
    }
    return { idToken, appCheckToken };
  }

  async function requestJson(url, requestOptions, credentials, timeoutMs, fallbackCode) {
    if (destroyed) throw accessError('client_destroyed', 'All-Star access was closed.');
    const controller = new AbortControllerImpl();
    activeControllers.add(controller);
    let timedOut = false;
    const timer =
      typeof setTimer === 'function'
        ? setTimer(() => {
            timedOut = true;
            controller.abort();
          }, timeoutMs)
        : null;
    try {
      const hasBody = typeof requestOptions.body === 'string';
      const response = await fetchImpl(url, {
        method: requestOptions.method,
        mode: 'cors',
        cache: 'no-store',
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${credentials.idToken}`,
          'X-Firebase-AppCheck': credentials.appCheckToken,
          ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
        },
        ...(hasBody ? { body: requestOptions.body } : {}),
        signal: controller.signal,
      });
      const payload = await readJsonResponse(response);
      if (requestOptions.allowMissing && [403, 404].includes(Number(response?.status))) return null;
      if (!response?.ok) throw responseError(response, payload, fallbackCode);
      if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        throw accessError('invalid_response', 'The service returned an invalid response.');
      }
      return payload;
    } catch (error) {
      if (error instanceof AllStarBohAccessError) throw error;
      if (timedOut) {
        throw accessError('request_timeout', 'The secure request timed out.', { cause: error });
      }
      if (destroyed || error?.name === 'AbortError') {
        throw accessError('request_canceled', 'The secure request was canceled.', {
          cause: error,
        });
      }
      throw accessError('network_error', 'The secure service could not be reached.', {
        cause: error,
      });
    } finally {
      if (timer !== null && typeof clearTimer === 'function') clearTimer(timer);
      activeControllers.delete(controller);
    }
  }

  async function getAccessGrant(grantOptions = {}) {
    const user = await resolveUser();
    const credentials = await requestCredentials(user, Boolean(grantOptions.forceRefresh));
    const payload = await requestJson(
      `${grantEndpoint}/${encodeURIComponent(user.uid)}`,
      { method: 'GET', allowMissing: true },
      credentials,
      options.grantTimeoutMs || UNLOCK_TIMEOUT_MS,
      'grant_read_failed'
    );
    if (!payload) return null;
    const grant = readAllStarBohGrantDocument(payload, user.uid, {
      expectedSeason: grantOptions.expectedSeason,
      minimumRemainingSeconds: grantOptions.minimumRemainingSeconds,
      now,
    });
    if (!grant) {
      throw accessError('invalid_response', 'The member grant response is invalid.');
    }
    if (
      Number.isSafeInteger(grantOptions.expectedExpiresAt) &&
      grant.expiresAt !== grantOptions.expectedExpiresAt
    ) {
      return null;
    }
    return grant;
  }

  async function unlock(pinInput) {
    if (typeof pinInput !== 'string' || pinInput.length < 1 || pinInput.length > MAX_PIN_LENGTH) {
      throw accessError('invalid_pin', 'Enter a valid member PIN.');
    }
    const user = await resolveUser();
    const credentials = await requestCredentials(user, true);
    let body = JSON.stringify({ pin: pinInput });
    let response;
    try {
      response = await requestJson(
        unlockEndpoint,
        { method: 'POST', body },
        credentials,
        options.unlockTimeoutMs || UNLOCK_TIMEOUT_MS,
        'unlock_failed'
      );
    } finally {
      body = null;
    }

    const seasonId = normalizeSeason(response.season);
    const expiresAt = response.expiresAt;
    const responseKeys = Object.keys(response).sort();
    if (
      responseKeys.length !== 2 ||
      responseKeys[0] !== 'expiresAt' ||
      responseKeys[1] !== 'season' ||
      !seasonId ||
      !Number.isSafeInteger(expiresAt) ||
      expiresAt <= nowSeconds(now)
    ) {
      throw accessError('invalid_response', 'The unlock response is invalid.');
    }
    const grant = await getAccessGrant({
      expectedSeason: seasonId,
      expectedExpiresAt: expiresAt,
      minimumRemainingSeconds: 0,
      forceRefresh: true,
    });
    if (!grant) {
      throw accessError(
        'grant_verification_failed',
        'Member access was granted, but the server grant could not be verified.'
      );
    }
    return grant;
  }

  async function processOcr(payload) {
    const request = validateOcrRequest(payload);
    const user = await resolveUser();
    const grant = await getAccessGrant({
      expectedSeason: request.seasonId,
      minimumRemainingSeconds: 5,
    });
    if (!grant) {
      throw accessError('access_expired', 'Member access has expired.');
    }
    const credentials = await requestCredentials(user, false);
    return requestJson(
      ocrEndpoint,
      { method: 'POST', body: JSON.stringify(request) },
      credentials,
      options.ocrTimeoutMs || OCR_TIMEOUT_MS,
      'ocr_failed'
    );
  }

  async function getVtsScorePlayers() {
    const user = await resolveUser();
    const grant = await getAccessGrant({ minimumRemainingSeconds: 5 });
    if (!grant) throw accessError('access_expired', 'Member access has expired.');
    const credentials = await requestCredentials(user, false);
    const response = await requestJson(
      scoreEndpoint,
      { method: 'GET' },
      credentials,
      options.scoreTimeoutMs || SCORE_TIMEOUT_MS,
      'score_failed'
    );
    if (
      response.schemaVersion !== 1 ||
      normalizeSeason(response.seasonId) !== grant.seasonId ||
      !Array.isArray(response.players)
    ) {
      throw accessError('invalid_response', 'The VtsScore player list is invalid.');
    }
    const players = response.players.map((player) => {
      const keys = player && typeof player === 'object' ? Object.keys(player).sort() : [];
      const submissionUid =
        typeof player?.submissionUid === 'string' ? player.submissionUid.trim() : '';
      const gameName = typeof player?.gameName === 'string' ? player.gameName.trim() : '';
      if (
        keys.length !== 2 ||
        keys[0] !== 'gameName' ||
        keys[1] !== 'submissionUid' ||
        !submissionUid ||
        !gameName ||
        submissionUid.length > 128 ||
        Array.from(gameName).length > 160
      ) {
        throw accessError('invalid_response', 'The VtsScore player list is invalid.');
      }
      return Object.freeze({ submissionUid, gameName });
    });
    return Object.freeze({ seasonId: grant.seasonId, players: Object.freeze(players) });
  }

  async function submitVtsScore(payload) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw accessError('invalid_score_request', 'The VtsScore submission is invalid.');
    }
    const seasonId = normalizeSeason(payload.seasonId);
    const user = await resolveUser();
    const grant = await getAccessGrant({ expectedSeason: seasonId, minimumRemainingSeconds: 5 });
    if (!grant) throw accessError('access_expired', 'Member access has expired.');
    const credentials = await requestCredentials(user, false);
    const response = await requestJson(
      scoreEndpoint,
      { method: 'POST', body: JSON.stringify(payload) },
      credentials,
      options.scoreTimeoutMs || SCORE_TIMEOUT_MS,
      'score_failed'
    );
    const score = response?.score;
    const powerKeys =
      score?.powerValues && typeof score.powerValues === 'object'
        ? Object.keys(score.powerValues).sort()
        : [];
    const expectedPowerKeys = [...VTS_SCORE_POWER_FIELDS].sort();
    if (
      response?.schemaVersion !== 1 ||
      !score ||
      typeof score !== 'object' ||
      score.schemaVersion !== 2 ||
      powerKeys.length !== expectedPowerKeys.length ||
      !powerKeys.every((key, index) => key === expectedPowerKeys[index]) ||
      !VTS_SCORE_POWER_FIELDS.every(
        (field) =>
          score.powerValues[field] === null ||
          (Number.isSafeInteger(score.powerValues[field]) && score.powerValues[field] >= 0)
      ) ||
      !Number.isSafeInteger(score.revision) ||
      typeof score.submissionUid !== 'string' ||
      typeof score.gameName !== 'string'
    ) {
      throw accessError('invalid_response', 'The VtsScore response is invalid.');
    }
    return Object.freeze({ ...score });
  }

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    for (const controller of activeControllers) controller.abort();
    activeControllers.clear();
  }

  return Object.freeze({
    getAccessGrant,
    unlock,
    process: processOcr,
    processOcr,
    getVtsScorePlayers,
    submitVtsScore,
    destroy,
  });
}
