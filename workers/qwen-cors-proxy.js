// Cloudflare Worker - secured proxy for Qwen/DashScope OCR.
//
// Required secret:
//   wrangler secret put DASHSCOPE_API_KEY
//
// Optional variables:
//   ALLOWED_ORIGINS=https://roc-vts.com,http://localhost:5173
//   DASHSCOPE_BASE_URL=https://dashscope-intl.aliyuncs.com/compatible-mode/v1
//   FIREBASE_APP_CHECK_PROJECT_NUMBER=123456789
//   FIREBASE_APP_CHECK_APP_ID=1:123456789:web:abcdef123456
//     This is the Firebase Web App ID, not the reCAPTCHA Enterprise site key.
//   RATE_LIMIT_KV=<KV namespace binding>
//   RATE_LIMIT_WINDOW_SECONDS=60
//   RATE_LIMIT_MAX_REQUESTS=30
//   MAX_BODY_BYTES=5242880

const DEFAULT_DASHSCOPE_BASE_URL = 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1';
const APP_CHECK_JWKS_URL = 'https://firebaseappcheck.googleapis.com/v1beta/jwks';
const DEFAULT_ALLOWED_ORIGINS = [
  'https://roc-vts.com',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
  'http://localhost:5175',
  'http://127.0.0.1:5175',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
  'http://localhost:4174',
  'http://127.0.0.1:4174',
];
const DEFAULT_RATE_LIMIT_WINDOW_SECONDS = 60;
const DEFAULT_RATE_LIMIT_MAX_REQUESTS = 30;
const DEFAULT_MAX_BODY_BYTES = 5 * 1024 * 1024;
const ALLOWED_MODELS = new Set(['qwen-vl-plus', 'qwen-vl-max']);
const memoryRateLimit = new Map();
let appCheckJwksCache = null;

export function resolveDashscopeChatCompletionsUrl(env = {}) {
  const configured = String(env.DASHSCOPE_BASE_URL || DEFAULT_DASHSCOPE_BASE_URL).trim();
  const baseUrl = (configured || DEFAULT_DASHSCOPE_BASE_URL).replace(/\/+$/, '');
  return baseUrl.endsWith('/chat/completions') ? baseUrl : `${baseUrl}/chat/completions`;
}

function allowedOrigins(env) {
  const configured = String(env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  return configured.length ? configured : DEFAULT_ALLOWED_ORIGINS;
}

function isAllowedOrigin(request, env) {
  const origin = request.headers.get('Origin') || '';
  if (!origin) return false;
  return allowedOrigins(env).includes(origin);
}

function corsHeaders(request, env) {
  const origin = request.headers.get('Origin') || '';
  const allowlist = allowedOrigins(env);
  const allowOrigin = allowlist.includes(origin) ? origin : allowlist[0];
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Firebase-AppCheck',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

function json(data, init = {}, request, env) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(request, env),
      ...(init.headers || {}),
    },
  });
}

function numericEnv(env, key, fallback) {
  const value = Number(env[key]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function getClientIp(request) {
  return request.headers.get('CF-Connecting-IP')
    || request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim()
    || 'unknown';
}

function pruneMemoryRateLimit(now) {
  for (const [key, entry] of memoryRateLimit.entries()) {
    if (entry.resetAt <= now) memoryRateLimit.delete(key);
  }
}

async function checkRateLimit(request, env) {
  const ip = getClientIp(request);
  const windowSeconds = numericEnv(env, 'RATE_LIMIT_WINDOW_SECONDS', DEFAULT_RATE_LIMIT_WINDOW_SECONDS);
  const maxRequests = numericEnv(env, 'RATE_LIMIT_MAX_REQUESTS', DEFAULT_RATE_LIMIT_MAX_REQUESTS);
  const now = Date.now();
  const windowId = Math.floor(now / (windowSeconds * 1000));
  const key = `qwen:${ip}:${windowId}`;

  if (env.RATE_LIMIT_KV) {
    const current = Number(await env.RATE_LIMIT_KV.get(key) || '0');
    if (current >= maxRequests) {
      return { allowed: false, retryAfter: windowSeconds - Math.floor((now / 1000) % windowSeconds) };
    }
    await env.RATE_LIMIT_KV.put(key, String(current + 1), { expirationTtl: windowSeconds * 2 });
    return { allowed: true };
  }

  pruneMemoryRateLimit(now);
  const resetAt = (windowId + 1) * windowSeconds * 1000;
  const current = memoryRateLimit.get(key) || { count: 0, resetAt };
  if (current.count >= maxRequests) {
    return { allowed: false, retryAfter: Math.max(1, Math.ceil((current.resetAt - now) / 1000)) };
  }
  current.count += 1;
  memoryRateLimit.set(key, current);
  return { allowed: true };
}

function requestBodySize(request) {
  const rawLength = request.headers.get('Content-Length');
  if (!rawLength) return null;
  const length = Number(rawLength);
  return Number.isFinite(length) && length >= 0 ? length : null;
}

function validateText(value, path, errors) {
  if (typeof value !== 'string') {
    errors.push(`${path} must be a string`);
    return;
  }
  if (value.length > 20000) errors.push(`${path} is too long`);
}

function validateImageUrl(value, path, errors) {
  const url = typeof value === 'string' ? value : value?.url;
  if (typeof url !== 'string' || !url) {
    errors.push(`${path} must include a URL string`);
    return;
  }
  if (url.startsWith('data:')) {
    if (!/^data:image\/(png|jpe?g|webp);base64,/i.test(url)) {
      errors.push(`${path} must be a PNG, JPEG, or WebP data URL`);
    }
    return;
  }
  try {
    const parsed = new URL(url);
    if (!['https:', 'http:'].includes(parsed.protocol)) errors.push(`${path} must be HTTP(S)`);
  } catch {
    errors.push(`${path} must be a valid URL`);
  }
}

function validatePayload(payload) {
  const errors = [];
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return ['Payload must be a JSON object'];
  }
  if (!ALLOWED_MODELS.has(payload.model)) errors.push('Unsupported model');
  if (!Array.isArray(payload.messages) || payload.messages.length === 0 || payload.messages.length > 20) {
    errors.push('messages must contain 1-20 entries');
    return errors;
  }

  payload.messages.forEach((message, index) => {
    const path = `messages[${index}]`;
    if (!message || typeof message !== 'object' || Array.isArray(message)) {
      errors.push(`${path} must be an object`);
      return;
    }
    if (!['system', 'user', 'assistant'].includes(message.role)) {
      errors.push(`${path}.role is invalid`);
    }
    if (typeof message.content === 'string') {
      validateText(message.content, `${path}.content`, errors);
      return;
    }
    if (!Array.isArray(message.content) || message.content.length === 0 || message.content.length > 32) {
      errors.push(`${path}.content must be a string or 1-32 content parts`);
      return;
    }
    message.content.forEach((part, partIndex) => {
      const partPath = `${path}.content[${partIndex}]`;
      if (!part || typeof part !== 'object' || Array.isArray(part)) {
        errors.push(`${partPath} must be an object`);
        return;
      }
      if (part.type === 'text') validateText(part.text, `${partPath}.text`, errors);
      else if (part.type === 'image_url') validateImageUrl(part.image_url, `${partPath}.image_url`, errors);
      else errors.push(`${partPath}.type is invalid`);
    });
  });

  return errors;
}

function base64UrlDecode(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function parseJwt(token) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) throw new Error('App Check token must be a JWT');
  const decoder = new TextDecoder();
  return {
    header: JSON.parse(decoder.decode(base64UrlDecode(parts[0]))),
    payload: JSON.parse(decoder.decode(base64UrlDecode(parts[1]))),
    signature: base64UrlDecode(parts[2]),
    signingInput: new TextEncoder().encode(`${parts[0]}.${parts[1]}`),
  };
}

async function appCheckJwks() {
  const now = Date.now();
  if (appCheckJwksCache && appCheckJwksCache.expiresAt > now) return appCheckJwksCache.keys;
  const res = await fetch(APP_CHECK_JWKS_URL, { cache: 'no-store' });
  if (!res.ok) throw new Error('Could not fetch Firebase App Check keys');
  const body = await res.json();
  const maxAge = /max-age=(\d+)/i.exec(res.headers.get('Cache-Control') || '')?.[1];
  const ttlMs = Math.max(60, Number(maxAge) || 3600) * 1000;
  appCheckJwksCache = { keys: body.keys || [], expiresAt: now + ttlMs };
  return appCheckJwksCache.keys;
}

async function verifyAppCheck(request, env) {
  const projectNumber = String(env.FIREBASE_APP_CHECK_PROJECT_NUMBER || '').trim();
  if (!projectNumber) {
    return { ok: false, status: 503, error: 'OCR worker is missing FIREBASE_APP_CHECK_PROJECT_NUMBER' };
  }

  const token = request.headers.get('X-Firebase-AppCheck') || '';
  if (!token) return { ok: false, status: 401, error: 'Missing Firebase App Check token' };

  try {
    const parsed = parseJwt(token);
    if (parsed.header.alg !== 'RS256' || !parsed.header.kid) {
      return { ok: false, status: 401, error: 'Invalid Firebase App Check token' };
    }

    const keys = await appCheckJwks();
    const jwk = keys.find((key) => key.kid === parsed.header.kid);
    if (!jwk) return { ok: false, status: 401, error: 'Unknown Firebase App Check key' };

    const cryptoKey = await crypto.subtle.importKey(
      'jwk',
      jwk,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify']
    );
    const verified = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      cryptoKey,
      parsed.signature,
      parsed.signingInput
    );
    if (!verified) return { ok: false, status: 401, error: 'Invalid Firebase App Check signature' };

    const now = Math.floor(Date.now() / 1000);
    const expectedAudience = `projects/${projectNumber}`;
    const audience = Array.isArray(parsed.payload.aud) ? parsed.payload.aud : [parsed.payload.aud];
    const expectedIssuer = `https://firebaseappcheck.googleapis.com/${projectNumber}`;
    if (parsed.payload.iss !== expectedIssuer || !audience.includes(expectedAudience)) {
      return { ok: false, status: 401, error: 'Firebase App Check token is for a different project' };
    }
    if (typeof parsed.payload.exp !== 'number' || parsed.payload.exp <= now) {
      return { ok: false, status: 401, error: 'Firebase App Check token expired' };
    }
    if (typeof parsed.payload.nbf === 'number' && parsed.payload.nbf > now) {
      return { ok: false, status: 401, error: 'Firebase App Check token is not active yet' };
    }
    const expectedAppId = String(env.FIREBASE_APP_CHECK_APP_ID || '').trim();
    if (expectedAppId && parsed.payload.sub !== expectedAppId) {
      return { ok: false, status: 401, error: 'Firebase App Check token is for a different app' };
    }
    return { ok: true, appId: parsed.payload.sub || '' };
  } catch (err) {
    return { ok: false, status: 401, error: 'Invalid Firebase App Check token' };
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      if (!isAllowedOrigin(request, env)) {
        return json({ error: 'Origin not allowed' }, { status: 403 }, request, env);
      }
      return new Response(null, { headers: corsHeaders(request, env) });
    }

    if (!isAllowedOrigin(request, env)) {
      return json({ error: 'Origin not allowed' }, { status: 403 }, request, env);
    }

    if (request.method === 'GET' && url.pathname === '/status') {
      return json({
        configured: Boolean(env.DASHSCOPE_API_KEY),
        appCheckConfigured: Boolean(env.FIREBASE_APP_CHECK_PROJECT_NUMBER),
      }, {}, request, env);
    }

    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, { status: 405 }, request, env);
    }

    const appCheck = await verifyAppCheck(request, env);
    if (!appCheck.ok) {
      return json({ error: appCheck.error }, { status: appCheck.status }, request, env);
    }

    if (!env.DASHSCOPE_API_KEY) {
      return json({ error: 'OCR worker is missing DASHSCOPE_API_KEY' }, { status: 503 }, request, env);
    }

    const maxBodyBytes = numericEnv(env, 'MAX_BODY_BYTES', DEFAULT_MAX_BODY_BYTES);
    const bodySize = requestBodySize(request);
    if (bodySize !== null && bodySize > maxBodyBytes) {
      return json({ error: `Payload too large. Maximum size is ${maxBodyBytes} bytes.` }, { status: 413 }, request, env);
    }

    const rateLimit = await checkRateLimit(request, env);
    if (!rateLimit.allowed) {
      return json(
        { error: 'Rate limit exceeded. Please retry shortly.' },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter || DEFAULT_RATE_LIMIT_WINDOW_SECONDS) } },
        request,
        env
      );
    }

    let payload;
    try {
      payload = await request.json();
    } catch {
      return json({ error: 'Invalid JSON body' }, { status: 400 }, request, env);
    }

    const validationErrors = validatePayload(payload);
    if (validationErrors.length) {
      return json({ error: 'Invalid OCR request payload', details: validationErrors }, { status: 400 }, request, env);
    }

    const serializedPayload = JSON.stringify(payload);
    if (new TextEncoder().encode(serializedPayload).byteLength > maxBodyBytes) {
      return json({ error: `Payload too large. Maximum size is ${maxBodyBytes} bytes.` }, { status: 413 }, request, env);
    }

    try {
      const dashscopeResponse = await fetch(resolveDashscopeChatCompletionsUrl(env), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.DASHSCOPE_API_KEY}`,
        },
        body: serializedPayload,
      });

      const responseBody = await dashscopeResponse.text();
      return new Response(responseBody, {
        status: dashscopeResponse.status,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders(request, env),
        },
      });
    } catch (err) {
      return json({ error: err?.message || 'OCR proxy failed' }, { status: 500 }, request, env);
    }
  },
};
