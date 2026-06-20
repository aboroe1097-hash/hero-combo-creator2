// Cloudflare Worker - secured proxy for Qwen/DashScope OCR.
//
// Required secret:
//   wrangler secret put DASHSCOPE_API_KEY
//
// Optional variables:
//   ALLOWED_ORIGINS=https://roc-vts.com,http://localhost:5173
//   RATE_LIMIT_KV=<KV namespace binding>
//   RATE_LIMIT_WINDOW_SECONDS=60
//   RATE_LIMIT_MAX_REQUESTS=30
//   MAX_BODY_BYTES=5242880

const DASHSCOPE_URL = 'https://ws-ui65ry41vh934ty5.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1/chat/completions';
const DEFAULT_ALLOWED_ORIGINS = [
  'https://roc-vts.com',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
];
const DEFAULT_RATE_LIMIT_WINDOW_SECONDS = 60;
const DEFAULT_RATE_LIMIT_MAX_REQUESTS = 30;
const DEFAULT_MAX_BODY_BYTES = 5 * 1024 * 1024;
const ALLOWED_MODELS = new Set(['qwen-vl-plus', 'qwen-vl-max']);
const memoryRateLimit = new Map();

function allowedOrigins(env) {
  const configured = String(env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  return configured.length ? configured : DEFAULT_ALLOWED_ORIGINS;
}

function isAllowedOrigin(request, env) {
  const origin = request.headers.get('Origin') || '';
  if (!origin) return true;
  return allowedOrigins(env).includes(origin);
}

function corsHeaders(request, env) {
  const origin = request.headers.get('Origin') || '';
  const allowlist = allowedOrigins(env);
  const allowOrigin = allowlist.includes(origin) ? origin : allowlist[0];
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
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
      return json({ configured: Boolean(env.DASHSCOPE_API_KEY) }, {}, request, env);
    }

    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, { status: 405 }, request, env);
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
      const dashscopeResponse = await fetch(DASHSCOPE_URL, {
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
