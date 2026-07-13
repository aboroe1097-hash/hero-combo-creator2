import { base64UrlDecode, base64UrlDecodeJson, utf8Bytes } from './crypto.js';
import { SAFE_ERROR_CODES } from './constants.js';
import { AiRequestError } from './errors.js';

export const FIREBASE_AUTH_JWKS_URL =
  'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
export const FIREBASE_APPCHECK_JWKS_URL = 'https://firebaseappcheck.googleapis.com/v1/jwks';

const jwksCache = new Map();
const CLOCK_SKEW_SECONDS = 30;

export function clearFirebaseJwksCacheForTests() {
  jwksCache.clear();
}

function parseCacheSeconds(header) {
  const seconds = Number(/(?:^|,)\s*max-age=(\d+)/iu.exec(header || '')?.[1] || 3600);
  return Math.min(6 * 60 * 60, Math.max(60, seconds)) * 1000;
}

async function getJwks(url, fetchImpl) {
  const now = Date.now();
  const cached = jwksCache.get(url);
  if (cached && cached.expiresAt > now) return cached.keys;

  const response = await fetchImpl(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('Firebase signing keys are unavailable.');
  const body = await response.json();
  if (!Array.isArray(body?.keys) || !body.keys.length) {
    throw new Error('Firebase signing keys are invalid.');
  }
  const keys = body.keys.filter(
    (key) =>
      key &&
      typeof key === 'object' &&
      key.kty === 'RSA' &&
      key.alg === 'RS256' &&
      typeof key.kid === 'string'
  );
  if (!keys.length) throw new Error('Firebase signing keys are invalid.');
  jwksCache.set(url, {
    keys,
    expiresAt: now + parseCacheSeconds(response.headers.get('cache-control')),
  });
  return keys;
}

export function parseJwt(token) {
  if (typeof token !== 'string' || token.length > 16_384) throw new Error('Invalid JWT.');
  const parts = token.split('.');
  if (parts.length !== 3 || parts.some((part) => !part)) throw new Error('Invalid JWT.');
  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const header = base64UrlDecodeJson(encodedHeader);
  const payload = base64UrlDecodeJson(encodedPayload);
  if (
    !header ||
    typeof header !== 'object' ||
    Array.isArray(header) ||
    !payload ||
    typeof payload !== 'object' ||
    Array.isArray(payload)
  ) {
    throw new Error('Invalid JWT.');
  }
  return {
    header,
    payload,
    signature: base64UrlDecode(encodedSignature),
    signingInput: utf8Bytes(`${encodedHeader}.${encodedPayload}`),
  };
}

async function verifySignature(parsed, jwksUrl, fetchImpl) {
  const { header } = parsed;
  if (
    header.alg !== 'RS256' ||
    header.typ !== 'JWT' ||
    typeof header.kid !== 'string' ||
    !header.kid ||
    header.crit !== undefined ||
    header.jku !== undefined ||
    header.x5u !== undefined
  ) {
    throw new Error('Invalid JWT header.');
  }
  const keys = await getJwks(jwksUrl, fetchImpl);
  const jwk = keys.find((candidate) => candidate.kid === header.kid);
  if (!jwk) throw new Error('Unknown JWT key.');
  const key = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify']
  );
  const verified = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    key,
    parsed.signature,
    parsed.signingInput
  );
  if (!verified) throw new Error('Invalid JWT signature.');
}

function assertTimes(payload, nowSeconds, requireAuthTime) {
  if (
    !Number.isFinite(payload.exp) ||
    payload.exp <= nowSeconds ||
    !Number.isFinite(payload.iat) ||
    payload.iat > nowSeconds + CLOCK_SKEW_SECONDS ||
    (Number.isFinite(payload.nbf) && payload.nbf > nowSeconds + CLOCK_SKEW_SECONDS)
  ) {
    throw new Error('Invalid JWT time claims.');
  }
  if (
    requireAuthTime &&
    (!Number.isFinite(payload.auth_time) ||
      payload.auth_time > nowSeconds + CLOCK_SKEW_SECONDS ||
      payload.auth_time > payload.iat + CLOCK_SKEW_SECONDS)
  ) {
    throw new Error('Invalid JWT authentication time.');
  }
}

function audienceIncludes(actual, expected) {
  return Array.isArray(actual) ? actual.includes(expected) : actual === expected;
}

export async function verifyFirebaseAuthToken(
  token,
  { projectId, fetchImpl = fetch, nowSeconds = Math.floor(Date.now() / 1000) }
) {
  if (typeof projectId !== 'string' || !projectId) throw new Error('Firebase project is missing.');
  const parsed = parseJwt(token);
  await verifySignature(parsed, FIREBASE_AUTH_JWKS_URL, fetchImpl);
  const { payload } = parsed;
  assertTimes(payload, nowSeconds, true);
  if (
    payload.iss !== `https://securetoken.google.com/${projectId}` ||
    payload.aud !== projectId ||
    typeof payload.sub !== 'string' ||
    !payload.sub ||
    payload.sub.length > 128 ||
    !payload.firebase ||
    typeof payload.firebase !== 'object' ||
    Array.isArray(payload.firebase)
  ) {
    throw new Error('Invalid Firebase Auth claims.');
  }
  return { uid: payload.sub, claims: payload };
}

export async function verifyFirebaseAppCheckToken(
  token,
  { projectNumber, appId, fetchImpl = fetch, nowSeconds = Math.floor(Date.now() / 1000) }
) {
  if (typeof projectNumber !== 'string' || !projectNumber || typeof appId !== 'string' || !appId) {
    throw new Error('Firebase App Check configuration is missing.');
  }
  const parsed = parseJwt(token);
  await verifySignature(parsed, FIREBASE_APPCHECK_JWKS_URL, fetchImpl);
  const { payload } = parsed;
  assertTimes(payload, nowSeconds, false);
  if (
    payload.iss !== `https://firebaseappcheck.googleapis.com/${projectNumber}` ||
    !audienceIncludes(payload.aud, `projects/${projectNumber}`) ||
    payload.sub !== appId
  ) {
    throw new Error('Invalid Firebase App Check claims.');
  }
  return { appId: payload.sub, claims: payload };
}

function bearerToken(request) {
  const authorization = request.headers.get('authorization') || '';
  const match = /^Bearer ([^\s]+)$/u.exec(authorization);
  return match?.[1] || '';
}

export async function authenticateFirebaseRequest(request, env) {
  const authToken = bearerToken(request);
  if (!authToken) {
    throw new AiRequestError(401, SAFE_ERROR_CODES.auth, 'Firebase authentication is required.');
  }
  const appCheckToken = request.headers.get('x-firebase-appcheck') || '';
  if (!appCheckToken) {
    throw new AiRequestError(401, SAFE_ERROR_CODES.appCheck, 'Firebase App Check is required.');
  }

  let auth;
  try {
    auth = await verifyFirebaseAuthToken(authToken, { projectId: env.FIREBASE_PROJECT_ID });
  } catch {
    throw new AiRequestError(401, SAFE_ERROR_CODES.auth, 'Firebase authentication failed.');
  }
  try {
    await verifyFirebaseAppCheckToken(appCheckToken, {
      projectNumber: env.FIREBASE_PROJECT_NUMBER,
      appId: env.FIREBASE_APP_ID,
    });
  } catch {
    throw new AiRequestError(401, SAFE_ERROR_CODES.appCheck, 'Firebase App Check failed.');
  }
  return auth;
}
