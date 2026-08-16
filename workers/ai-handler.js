import { HEALTH_PATH, MANAGEMENT_VOTES_PATH, SAFE_ERROR_CODES, TURN_PATH } from './ai/constants.js';
import {
  assertToolResultsMatchClaims,
  hashProviderState,
  verifyContinuationToken,
} from './ai/continuation.js';
import {
  corsHeaders,
  parseAllowedOrigins,
  requireAllowedOrigin,
  requirePublicDataOrigin,
  withCors,
} from './ai/cors.js';
import { utf8ByteLength } from './ai/crypto.js';
import { AiRequestError, asSafeError } from './ai/errors.js';
import { authenticateFirebaseRequest } from './ai/firebase-jwt.js';
import * as geminiProvider from './ai/gemini.js';
import * as deepseekProvider from './ai/deepseek.js';
import {
  quotaHeaders,
  quotaMetadata,
  releaseContinuationReservation,
  releaseInitialReservation,
  reserveContinuation,
  reserveInitialTurn,
  uidQuotaHash,
} from './ai/quota.js';
import { buildInitialProviderSteps, readBoundedJson, validateTurnPayload } from './ai/schema.js';
import { proxyManagementVotes } from './ai/management-votes.js';

const JSON_HEADERS = Object.freeze({
  'Cache-Control': 'no-store',
  'Content-Type': 'application/json; charset=utf-8',
  'X-Content-Type-Options': 'nosniff',
});

function getProvider(env) {
  const provider = String(env.AI_PROVIDER || 'gemini')
    .trim()
    .toLowerCase();
  if (provider === 'gemini') return geminiProvider;
  if (provider === 'deepseek') return deepseekProvider;
  return null;
}

function missingConfiguration(env) {
  const missing = [];
  if (env.AI_ENABLED !== 'true') missing.push('AI_ENABLED');
  const providerName = String(env.AI_PROVIDER || 'gemini')
    .trim()
    .toLowerCase();
  if (providerName === 'gemini') {
    if (!String(env.GEMINI_API_KEY || '').trim()) missing.push('GEMINI_API_KEY');
  } else if (providerName === 'deepseek') {
    if (!String(env.DEEPSEEK_API_KEY || '').trim()) missing.push('DEEPSEEK_API_KEY');
  } else {
    missing.push('AI_PROVIDER');
  }
  if (String(env.AI_CONTINUATION_SECRET || '').length < 32) missing.push('AI_CONTINUATION_SECRET');
  if (!String(env.AI_MODEL || '').trim()) missing.push('AI_MODEL');
  if (!String(env.FIREBASE_PROJECT_ID || '').trim()) missing.push('FIREBASE_PROJECT_ID');
  if (!String(env.FIREBASE_PROJECT_NUMBER || '').trim()) missing.push('FIREBASE_PROJECT_NUMBER');
  if (!String(env.FIREBASE_APP_ID || '').trim()) missing.push('FIREBASE_APP_ID');
  if (!parseAllowedOrigins(env.ALLOWED_ORIGINS).size) missing.push('ALLOWED_ORIGINS');
  if (!env.AI_USER_QUOTA?.getByName) missing.push('AI_USER_QUOTA');
  if (!env.AI_GLOBAL_QUOTA?.getByName) missing.push('AI_GLOBAL_QUOTA');
  if (!env.AI_ABUSE_LIMITER?.limit) missing.push('AI_ABUSE_LIMITER');
  return missing;
}

function jsonResponse(body, status, origin = '', headers = {}) {
  const responseHeaders = new Headers({ ...JSON_HEADERS, ...headers });
  const finalHeaders = origin ? withCors(responseHeaders, origin) : responseHeaders;
  return new Response(JSON.stringify(body), { status, headers: finalHeaders });
}

function quotaScope(code) {
  if (code === SAFE_ERROR_CODES.dailyQuota) return 'daily';
  if (code === SAFE_ERROR_CODES.globalBudget) return 'global';
  if (code === SAFE_ERROR_CODES.burstQuota || code === SAFE_ERROR_CODES.abuseQuota) return 'burst';
  return '';
}

function errorResponse(error, origin = '', requestId = '') {
  const safe = asSafeError(error);
  const headers = {};
  if (safe.retryAfter) headers['Retry-After'] = String(safe.retryAfter);
  if (requestId) headers['X-Request-ID'] = requestId;
  const scope = quotaScope(safe.code);
  if (scope) headers['X-AI-Quota-Scope'] = scope;
  return jsonResponse(
    {
      code: safe.code,
      message: safe.message,
      ...(safe.details ? { details: safe.details } : {}),
    },
    safe.status,
    origin,
    headers
  );
}

function assertTurnMethodAndType(request) {
  if (request.method !== 'POST') {
    throw new AiRequestError(405, SAFE_ERROR_CODES.badRequest, 'Only POST is supported.');
  }
  const contentType = request.headers.get('content-type') || '';
  if (!/^application\/json(?:\s*;|$)/iu.test(contentType)) {
    throw new AiRequestError(
      415,
      SAFE_ERROR_CODES.badRequest,
      'Content-Type must be application/json.'
    );
  }
}

export function filterAllowedToolGroupsForAuth(groups, claims = {}) {
  return (Array.isArray(groups) ? groups : []).filter(
    (group) => group !== 'private:admin_dashboard' || claims?.admin === true
  );
}

async function prepareInitialTurn(request, env, auth, payload) {
  const quota = await reserveInitialTurn({
    request,
    env,
    uid: auth.uid,
    requestId: payload.requestId,
  });
  const allowedToolGroups = filterAllowedToolGroupsForAuth(payload.allowedToolGroups, auth.claims);
  return {
    quota,
    providerInput: buildInitialProviderSteps(payload.history, payload.input),
    allowedToolGroups,
    locale: payload.input.locale,
    activeTab: payload.input.activeTab || null,
    uidHash: quota.uidHash,
    startedAt: Date.now(),
    priorFingerprints: [],
    priorTotalCalls: 0,
    sourceResults: [],
    release: () =>
      releaseInitialReservation({ env, uidHash: quota.uidHash, requestId: payload.requestId }),
  };
}

async function prepareContinuationTurn(env, auth, payload) {
  const uidHash = await uidQuotaHash(env.AI_CONTINUATION_SECRET, auth.uid);
  const providerStateHash = await hashProviderState(payload.providerState);
  const claims = await verifyContinuationToken(
    env.AI_CONTINUATION_SECRET,
    payload.continuationToken,
    {
      uidHash,
      requestId: payload.requestId,
      round: payload.round,
      providerStateHash,
    }
  );
  assertToolResultsMatchClaims(payload.input.results, claims.calls);
  const quota = await reserveContinuation({
    env,
    uidHash,
    requestId: payload.requestId,
    round: payload.round,
  });
  const provider = getProvider(env);
  if (!provider) {
    throw new AiRequestError(
      503,
      SAFE_ERROR_CODES.disabled,
      'The AI assistant is currently disabled.'
    );
  }
  return {
    quota,
    providerInput: provider.buildContinuationProviderInput(
      payload.providerState,
      payload.input.results
    ),
    allowedToolGroups: claims.groups,
    locale: claims.locale,
    uidHash,
    startedAt: claims.startedAt,
    priorFingerprints: claims.fingerprints,
    priorTotalCalls: claims.totalCalls,
    sourceResults: payload.input.results,
    release: () =>
      releaseContinuationReservation({
        env,
        uidHash,
        requestId: payload.requestId,
        round: payload.round,
      }),
  };
}

async function handleTurn(request, env, origin) {
  assertTurnMethodAndType(request);
  const missing = missingConfiguration(env);
  if (missing.length) {
    throw new AiRequestError(
      503,
      SAFE_ERROR_CODES.disabled,
      'The AI assistant is currently disabled.'
    );
  }

  const provider = getProvider(env);
  if (!provider) {
    throw new AiRequestError(
      503,
      SAFE_ERROR_CODES.disabled,
      'The AI assistant is currently disabled.'
    );
  }

  const auth = await authenticateFirebaseRequest(request, env);
  const rawPayload = await readBoundedJson(request);
  const requestBytes = utf8ByteLength(JSON.stringify(rawPayload));
  const payload = validateTurnPayload(rawPayload);
  const prepared =
    payload.round === 0
      ? await prepareInitialTurn(request, env, auth, payload)
      : await prepareContinuationTurn(env, auth, payload);

  let upstream;
  try {
    const prepareUpstream = provider.prepareDeepseekUpstream || provider.prepareGeminiUpstream;
    upstream = await prepareUpstream({
      env,
      providerInput: prepared.providerInput,
      allowedToolGroups: prepared.allowedToolGroups,
      locale: prepared.locale,
      activeTab: prepared.activeTab ?? null,
      requestSignal: request.signal,
    });
  } catch (error) {
    await prepared.release().catch((releaseError) => {
      console.error(
        JSON.stringify({
          type: 'ai_quota_release_failed',
          requestId: payload.requestId,
          error: releaseError instanceof Error ? releaseError.message : String(releaseError),
        })
      );
    });
    throw error;
  }

  const stream = provider.createNormalizedInteractionStream({
    upstream,
    env,
    requestId: payload.requestId,
    round: payload.round,
    providerInput: prepared.providerInput,
    allowedToolGroups: prepared.allowedToolGroups,
    locale: prepared.locale,
    uidHash: prepared.uidHash,
    startedAt: prepared.startedAt,
    priorFingerprints: prepared.priorFingerprints,
    priorTotalCalls: prepared.priorTotalCalls,
    quota: quotaMetadata(prepared.quota),
    sourceResults: prepared.sourceResults,
    requestBytes,
  });
  const headers = withCors(
    {
      'Cache-Control': 'no-store',
      'Content-Type': 'text/event-stream; charset=utf-8',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
      'X-Content-Type-Options': 'nosniff',
      'X-Request-ID': payload.requestId,
      ...quotaHeaders(prepared.quota),
    },
    origin
  );
  return new Response(stream, { status: 200, headers });
}

export async function handleRequest(request, env) {
  const url = new URL(request.url);
  let origin = '';
  try {
    if (url.pathname === HEALTH_PATH) {
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        return jsonResponse({ code: 'method_not_allowed', message: 'Only GET is supported.' }, 405);
      }
      const enabled = missingConfiguration(env).length === 0;
      const response = jsonResponse({ ok: true, enabled }, 200);
      return request.method === 'HEAD'
        ? new Response(null, { status: response.status, headers: response.headers })
        : response;
    }

    if (url.pathname === MANAGEMENT_VOTES_PATH) {
      origin = requirePublicDataOrigin(request, env.ALLOWED_ORIGINS);
      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders(origin) });
      }
      if (request.method !== 'GET') {
        return jsonResponse(
          { code: 'method_not_allowed', message: 'Only GET is supported.' },
          405,
          origin
        );
      }
      return proxyManagementVotes(url, origin);
    }

    if (url.pathname !== TURN_PATH) {
      return jsonResponse({ code: 'not_found', message: 'Not found.' }, 404);
    }

    origin = requireAllowedOrigin(request, env.ALLOWED_ORIGINS);
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }
    return await handleTurn(request, env, origin);
  } catch (error) {
    const requestId = request.method === 'POST' ? request.headers.get('x-request-id') || '' : '';
    return errorResponse(error, origin, requestId);
  }
}

export default {
  fetch(request, env) {
    return handleRequest(request, env);
  },
};
