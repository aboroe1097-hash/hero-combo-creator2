export const AI_SESSION_HISTORY_KEY = 'vts_ai_visible_history_v1';
export const AI_MAX_VISIBLE_PAIRS = 8;
export const AI_MAX_SESSION_BYTES = 64 * 1024;

const VALID_ROLES = new Set(['user', 'assistant']);

function byteLength(value) {
  const text = String(value || '');
  if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(text).byteLength;
  return unescape(encodeURIComponent(text)).length;
}

function normalizeVisibleMessage(message) {
  if (!message || !VALID_ROLES.has(message.role) || typeof message.text !== 'string') return null;
  return {
    role: message.role,
    text: message.text,
    complete: message.complete !== false,
  };
}

function trimToPairLimit(messages) {
  const normalized = messages
    .map(normalizeVisibleMessage)
    .filter(Boolean)
    .slice(-(AI_MAX_VISIBLE_PAIRS * 2));
  while (normalized.length && normalized[0].role === 'assistant') normalized.shift();
  return normalized;
}

function fitByteLimit(messages) {
  const safe = [...messages];
  while (
    safe.length &&
    byteLength(JSON.stringify({ version: 1, messages: safe })) > AI_MAX_SESSION_BYTES
  ) {
    safe.splice(0, Math.min(2, safe.length));
  }
  return safe;
}

export function sanitizeVisibleHistory(messages) {
  return fitByteLimit(trimToPairLimit(Array.isArray(messages) ? messages : []));
}

export function loadVisibleHistory(storage = globalThis.sessionStorage) {
  try {
    const raw = storage?.getItem(AI_SESSION_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (parsed?.version !== 1 || !Array.isArray(parsed.messages)) return [];
    return sanitizeVisibleHistory(parsed.messages);
  } catch {
    return [];
  }
}

export function saveVisibleHistory(messages, storage = globalThis.sessionStorage) {
  const safe = sanitizeVisibleHistory(messages);
  try {
    storage?.setItem(AI_SESSION_HISTORY_KEY, JSON.stringify({ version: 1, messages: safe }));
  } catch {
    return safe;
  }
  return safe;
}

export function clearVisibleHistory(storage = globalThis.sessionStorage) {
  try {
    storage?.removeItem(AI_SESSION_HISTORY_KEY);
  } catch {}
}

export function toVisibleWireHistory(messages) {
  const completeMessages = sanitizeVisibleHistory(messages).filter(
    (message) => message.complete !== false && message.text.length > 0
  );
  const pairs = [];
  let pendingUser = null;
  for (const message of completeMessages) {
    if (message.role === 'user') {
      pendingUser = message;
    } else if (pendingUser) {
      pairs.push({ role: 'user', text: pendingUser.text });
      pairs.push({ role: 'assistant', text: message.text });
      pendingUser = null;
    }
  }
  return pairs.slice(-(AI_MAX_VISIBLE_PAIRS * 2));
}
