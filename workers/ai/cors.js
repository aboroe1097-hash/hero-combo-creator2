import { SAFE_ERROR_CODES } from './constants.js';
import { AiRequestError } from './errors.js';

export function parseAllowedOrigins(value) {
  return new Set(
    String(value || '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean)
  );
}

export function requireAllowedOrigin(request, configuredOrigins) {
  const origin = request.headers.get('origin');
  if (!origin || !parseAllowedOrigins(configuredOrigins).has(origin)) {
    throw new AiRequestError(403, SAFE_ERROR_CODES.origin, 'The request origin is not allowed.');
  }
  return origin;
}

export function requirePublicDataOrigin(request, configuredOrigins) {
  const origin = request.headers.get('origin') || '';
  if (parseAllowedOrigins(configuredOrigins).has(origin)) return origin;
  try {
    const url = new URL(origin);
    const isFirebasePreview =
      url.protocol === 'https:' && /^abocombo--[a-z0-9-]+\.web\.app$/.test(url.hostname);
    const isLocalPreview =
      url.protocol === 'http:' &&
      /^(?:localhost|127\.0\.0\.1)$/.test(url.hostname) &&
      /^(?:4173|4174|5173|5174|5175|5176|5177)$/.test(url.port);
    if (isFirebasePreview || isLocalPreview) return origin;
  } catch {
    // Fall through to the same bounded public error used by private routes.
  }
  throw new AiRequestError(403, SAFE_ERROR_CODES.origin, 'The request origin is not allowed.');
}

export function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Firebase-AppCheck',
    'Access-Control-Expose-Headers':
      'Retry-After, X-AI-Quota-Remaining, X-AI-Quota-Reset, X-Request-ID',
    'Access-Control-Max-Age': '600',
    Vary: 'Origin',
  };
}

export function withCors(headers, origin) {
  const result = new Headers(headers);
  for (const [name, value] of Object.entries(corsHeaders(origin))) result.set(name, value);
  return result;
}
