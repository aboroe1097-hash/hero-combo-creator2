import { LIMITS, SAFE_ERROR_CODES } from './constants.js';
import { shortOpaqueId } from './crypto.js';
import { AiRequestError } from './errors.js';

function quotaError(result) {
  const resetAt = Number(result?.resetAt || 0);
  const retryAfter = resetAt ? Math.max(1, Math.ceil((resetAt - Date.now()) / 1000)) : undefined;
  const messages = {
    daily_quota: 'The daily AI turn quota has been reached.',
    burst_quota: 'Too many AI turns were started recently.',
    global_budget: 'The AI service budget has been reached.',
    duplicate_request: 'This request was already accepted.',
    invalid_continuation: 'The tool continuation is invalid.',
  };
  const status = result.reason === 'invalid_continuation' ? 409 : 429;
  return new AiRequestError(
    status,
    result.reason || SAFE_ERROR_CODES.globalBudget,
    messages[result.reason] || 'The AI quota is unavailable.',
    { resetAt: resetAt || undefined, remaining: result?.remaining },
    retryAfter
  );
}

async function enforceSupplementaryAbuseLimit(request, env, uidHash, nowMs) {
  if (!env.AI_ABUSE_LIMITER?.limit) {
    if (env.ENVIRONMENT === 'test' || env.ENVIRONMENT === 'local') return;
    throw new AiRequestError(503, SAFE_ERROR_CODES.provider, 'The abuse limiter is unavailable.');
  }
  const ip = request.headers.get('cf-connecting-ip') || `uid:${uidHash}`;
  const timeBucket = Math.floor(nowMs / (10 * 60_000));
  const key = await shortOpaqueId(env.AI_CONTINUATION_SECRET, `ip:${timeBucket}`, ip);
  const { success } = await env.AI_ABUSE_LIMITER.limit({ key });
  if (!success) {
    throw new AiRequestError(
      429,
      SAFE_ERROR_CODES.abuseQuota,
      'Too many AI requests were sent from this network.',
      undefined,
      60
    );
  }
}

export async function uidQuotaHash(secret, uid) {
  return shortOpaqueId(secret, 'firebase-uid', uid);
}

export async function reserveInitialTurn({ request, env, uid, requestId, nowMs = Date.now() }) {
  const uidHash = await uidQuotaHash(env.AI_CONTINUATION_SECRET, uid);
  await enforceSupplementaryAbuseLimit(request, env, uidHash, nowMs);

  const userStub = env.AI_USER_QUOTA.getByName(uidHash);
  const user = await userStub.acceptUserTurn({ requestId, nowMs });
  if (!user.allowed) throw quotaError(user);

  const globalStub = env.AI_GLOBAL_QUOTA.getByName('global');
  const reservationId = `${requestId}:0`;
  let global;
  try {
    global = await globalStub.acceptGlobalTurnAndInteraction({ reservationId, nowMs });
  } catch (error) {
    await userStub.releaseUserTurn({ requestId }).catch(() => undefined);
    throw error;
  }
  if (!global.allowed) {
    await userStub.releaseUserTurn({ requestId });
    throw quotaError(global);
  }
  return {
    uidHash,
    remaining: user.remaining,
    resetAt: user.resetAt,
    round: 0,
  };
}

export async function reserveContinuation({ env, uidHash, requestId, round, nowMs = Date.now() }) {
  const userStub = env.AI_USER_QUOTA.getByName(uidHash);
  const user = await userStub.acceptContinuation({ requestId, round, nowMs });
  if (!user.allowed) throw quotaError(user);

  const globalStub = env.AI_GLOBAL_QUOTA.getByName('global');
  const reservationId = `${requestId}:${round}`;
  let global;
  try {
    global = await globalStub.acceptGlobalInteraction({ reservationId, nowMs });
  } catch (error) {
    await userStub.rollbackContinuation({ requestId, round, nowMs }).catch(() => undefined);
    throw error;
  }
  if (!global.allowed) {
    await userStub.rollbackContinuation({ requestId, round, nowMs });
    throw quotaError(global);
  }
  return { uidHash, round };
}

export async function releaseInitialReservation({ env, uidHash, requestId }) {
  const userStub = env.AI_USER_QUOTA.getByName(uidHash);
  const globalStub = env.AI_GLOBAL_QUOTA.getByName('global');
  await Promise.all([
    userStub.releaseUserTurn({ requestId }),
    globalStub.releaseGlobalReservation({ reservationId: `${requestId}:0`, includeTurn: true }),
  ]);
}

export async function releaseContinuationReservation({ env, uidHash, requestId, round }) {
  const userStub = env.AI_USER_QUOTA.getByName(uidHash);
  const globalStub = env.AI_GLOBAL_QUOTA.getByName('global');
  await Promise.all([
    userStub.rollbackContinuation({ requestId, round, nowMs: Date.now() }),
    globalStub.releaseGlobalReservation({
      reservationId: `${requestId}:${round}`,
      includeTurn: false,
    }),
  ]);
}

export function quotaHeaders(quota) {
  const headers = {};
  if (Number.isFinite(quota?.remaining)) {
    headers['X-AI-Quota-Remaining'] = String(Math.max(0, quota.remaining));
  }
  if (Number.isFinite(quota?.resetAt)) {
    headers['X-AI-Quota-Reset'] = new Date(quota.resetAt).toISOString();
  }
  return headers;
}

export function quotaMetadata(quota) {
  return {
    remaining: Number.isFinite(quota?.remaining) ? quota.remaining : null,
    resetAt: Number.isFinite(quota?.resetAt) ? new Date(quota.resetAt).toISOString() : null,
    dailyLimit: LIMITS.userTurnsPerUtcDay,
  };
}
