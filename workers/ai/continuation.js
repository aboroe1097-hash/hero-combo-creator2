import { API_VERSION, LIMITS, SAFE_ERROR_CODES } from './constants.js';
import {
  base64UrlDecodeJson,
  base64UrlEncode,
  hmacBase64Url,
  sha256Base64Url,
  stableStringify,
  utf8Bytes,
  verifyHmacBase64Url,
} from './crypto.js';
import { AiRequestError } from './errors.js';

function invalidContinuation(message = 'The continuation token is invalid.') {
  throw new AiRequestError(401, SAFE_ERROR_CODES.continuation, message);
}

export async function hashProviderState(providerState) {
  return sha256Base64Url(stableStringify(providerState));
}

export async function createContinuationToken(secret, claims) {
  const payload = {
    v: API_VERSION,
    sub: claims.uidHash,
    rid: claims.requestId,
    rnd: claims.nextRound,
    psh: claims.providerStateHash,
    calls: claims.calls.map(({ callId, name }) => ({ callId, name })),
    groups: [...claims.allowedToolGroups].sort(),
    locale: claims.locale,
    fingerprints: [...claims.callFingerprints],
    totalCalls: claims.totalCalls,
    startedAt: claims.startedAt,
    exp: Math.floor((claims.nowMs + LIMITS.continuationTtlMs) / 1000),
  };
  const encodedPayload = base64UrlEncode(utf8Bytes(stableStringify(payload)));
  const signature = await hmacBase64Url(secret, encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export async function verifyContinuationToken(secret, token, expected, nowMs = Date.now()) {
  if (typeof token !== 'string') invalidContinuation();
  const parts = token.split('.');
  if (parts.length !== 2) invalidContinuation();
  const [encodedPayload, signature] = parts;
  if (!(await verifyHmacBase64Url(secret, encodedPayload, signature))) invalidContinuation();

  let claims;
  try {
    claims = base64UrlDecodeJson(encodedPayload);
  } catch {
    invalidContinuation();
  }
  if (
    claims?.v !== API_VERSION ||
    claims.sub !== expected.uidHash ||
    claims.rid !== expected.requestId ||
    claims.rnd !== expected.round ||
    claims.psh !== expected.providerStateHash ||
    !Number.isFinite(claims.exp) ||
    claims.exp <= Math.floor(nowMs / 1000) ||
    !Number.isFinite(claims.startedAt) ||
    claims.startedAt > nowMs + 5_000 ||
    nowMs - claims.startedAt >= LIMITS.wholeTurnMs
  ) {
    invalidContinuation();
  }
  if (
    !Array.isArray(claims.calls) ||
    !Array.isArray(claims.groups) ||
    !Array.isArray(claims.fingerprints) ||
    typeof claims.locale !== 'string' ||
    !Number.isInteger(claims.totalCalls)
  ) {
    invalidContinuation();
  }
  return claims;
}

export function assertToolResultsMatchClaims(results, calls) {
  if (results.length !== calls.length) {
    throw new AiRequestError(
      400,
      SAFE_ERROR_CODES.malformedTool,
      'Tool results do not match calls.'
    );
  }
  const expected = new Map(calls.map((call) => [call.callId, call.name]));
  for (const result of results) {
    if (expected.get(result.callId) !== result.name) {
      throw new AiRequestError(
        400,
        SAFE_ERROR_CODES.malformedTool,
        'Tool results do not match calls.'
      );
    }
    expected.delete(result.callId);
  }
  if (expected.size) {
    throw new AiRequestError(
      400,
      SAFE_ERROR_CODES.malformedTool,
      'Tool results do not match calls.'
    );
  }
}
