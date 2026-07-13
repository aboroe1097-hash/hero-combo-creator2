export const AI_CONTRACT_VERSION = 1;

export const AI_SUPPORTED_LOCALES = Object.freeze([
  'en',
  'es',
  'pt',
  'de',
  'fr',
  'tr',
  'ru',
  'id',
  'zh',
  'ar',
  'kr',
]);

export const AI_LIMITS = Object.freeze({
  maxMessageCharacters: 4000,
  maxWireBytes: 128 * 1024,
  maxHistoryPairs: 8,
  maxHistoryEntries: 16,
  maxHistoryEntryCharacters: 16_000,
  maxHistoryBytes: 64 * 1024,
  maxToolResultBytes: 8 * 1024,
  maxCombinedToolResultBytes: 24 * 1024,
  maxToolRounds: 2,
  maxToolCalls: 6,
  maxUpstreamInteractions: 3,
  requestTimeoutMs: 180_000,
});

export const AI_SSE_EVENT_TYPES = Object.freeze([
  'start',
  'status',
  'text_delta',
  'tool_calls',
  'state',
  'sources',
  'usage',
  'done',
  'error',
]);

export const AI_TOOL_GROUPS = Object.freeze({
  STATIC: 'static',
  SELECTED_HEROES: 'personal:selected_heroes',
  EXPLICIT_SKINS: 'personal:explicit_skins',
  DM_PLAN: 'personal:dm_plan',
  RESEARCH_PROGRESS: 'personal:research_progress',
  ADMIN_DASHBOARD: 'private:admin_dashboard',
});

export const AI_CONSENT_CATEGORIES = Object.freeze([
  Object.freeze({ id: 'selected_heroes', toolGroup: AI_TOOL_GROUPS.SELECTED_HEROES }),
  Object.freeze({ id: 'explicit_skins', toolGroup: AI_TOOL_GROUPS.EXPLICIT_SKINS }),
  Object.freeze({ id: 'dm_plan', toolGroup: AI_TOOL_GROUPS.DM_PLAN }),
  Object.freeze({ id: 'research_progress', toolGroup: AI_TOOL_GROUPS.RESEARCH_PROGRESS }),
  Object.freeze({ id: 'admin_dashboard', toolGroup: AI_TOOL_GROUPS.ADMIN_DASHBOARD }),
]);

const REQUEST_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isPlainObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

export function resolveAiTurnEndpoint(candidate, baseHref = globalThis.location?.href) {
  if (!candidate) return '';
  try {
    const url = new URL(String(candidate), baseHref);
    const localHttp =
      url.protocol === 'http:' && ['localhost', '127.0.0.1', '::1'].includes(url.hostname);
    if (url.protocol !== 'https:' && !localHttp) return '';
    const turnPath = '/v1/assistant/turn';
    if (!url.pathname.endsWith(turnPath)) {
      url.pathname = `${url.pathname.replace(/\/$/, '')}${turnPath}`;
    }
    return url.href;
  } catch {
    return '';
  }
}

export function boundAiToolResults(results) {
  let combined = 0;
  return (Array.isArray(results) ? results : []).map((result) => {
    const wireResult = {
      callId: result?.callId || null,
      name: result?.name || 'unknown',
      ok: result?.ok === true,
      data: result?.data && typeof result.data === 'object' ? result.data : {},
    };
    let bytes = Infinity;
    try {
      bytes = new TextEncoder().encode(JSON.stringify(wireResult)).byteLength;
    } catch {}
    if (
      bytes <= AI_LIMITS.maxToolResultBytes &&
      combined + bytes <= AI_LIMITS.maxCombinedToolResultBytes
    ) {
      combined += bytes;
      return wireResult;
    }
    return {
      callId: wireResult.callId,
      name: wireResult.name,
      ok: false,
      data: {
        error: {
          code: 'tool_result_too_large',
          message: 'Tool result exceeded the allowed size.',
        },
      },
    };
  });
}

function issue(path, code, message) {
  return Object.freeze({ path, code, message });
}

export function normalizeAllowedToolGroups(value) {
  const knownGroups = new Set(Object.values(AI_TOOL_GROUPS));
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((group) => typeof group === 'string' && knownGroups.has(group)))];
}

export function normalizeAiHistory(value) {
  if (!Array.isArray(value)) return [];
  const messages = value
    .filter(
      (entry) =>
        isPlainObject(entry) &&
        (entry.role === 'user' || entry.role === 'assistant') &&
        typeof entry.text === 'string' &&
        entry.text.length > 0
    )
    .map((entry) => ({
      role: entry.role,
      text: entry.text.slice(0, AI_LIMITS.maxHistoryEntryCharacters),
    }));
  const pairs = [];
  let pendingUser = null;
  for (const message of messages) {
    if (message.role === 'user') {
      pendingUser = message;
    } else if (pendingUser) {
      pairs.push(pendingUser, message);
      pendingUser = null;
    }
  }
  return pairs.slice(-AI_LIMITS.maxHistoryEntries);
}

function utf8ByteLength(value) {
  if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(value).byteLength;
  return unescape(encodeURIComponent(value)).length;
}

function validateCommonRequest(value, issues) {
  if (value.version !== AI_CONTRACT_VERSION) {
    issues.push(issue('version', 'unsupported_version', 'Unsupported assistant contract version.'));
  }
  if (typeof value.requestId !== 'string' || !REQUEST_ID_RE.test(value.requestId)) {
    issues.push(issue('requestId', 'invalid_request_id', 'requestId must be a UUID.'));
  }
  if (
    'history' in value &&
    (!Array.isArray(value.history) || value.history.length > AI_LIMITS.maxHistoryEntries)
  ) {
    issues.push(
      issue(
        'history',
        'invalid_history',
        `History is limited to ${AI_LIMITS.maxHistoryPairs} pairs.`
      )
    );
  } else if (Array.isArray(value.history)) {
    let historyBytes = 0;
    value.history.forEach((entry, index) => {
      if (
        !isPlainObject(entry) ||
        entry.role !== (index % 2 === 0 ? 'user' : 'assistant') ||
        typeof entry.text !== 'string' ||
        entry.text.length < 1 ||
        entry.text.length > AI_LIMITS.maxHistoryEntryCharacters
      ) {
        issues.push(issue(`history.${index}`, 'invalid_history_entry', 'Invalid history entry.'));
      } else {
        historyBytes += utf8ByteLength(entry.text);
      }
    });
    if (value.history.length % 2 !== 0) {
      issues.push(issue('history', 'invalid_history', 'History must contain complete pairs.'));
    }
    if (historyBytes > AI_LIMITS.maxHistoryBytes) {
      issues.push(issue('history', 'invalid_history', 'History is too large.'));
    }
  }
  if ('allowedToolGroups' in value && !Array.isArray(value.allowedToolGroups)) {
    issues.push(
      issue('allowedToolGroups', 'invalid_tool_groups', 'allowedToolGroups must be an array.')
    );
  } else if (
    Array.isArray(value.allowedToolGroups) &&
    normalizeAllowedToolGroups(value.allowedToolGroups).length !== value.allowedToolGroups.length
  ) {
    issues.push(
      issue('allowedToolGroups', 'invalid_tool_group', 'An unrecognized tool group was supplied.')
    );
  }
}

export function validateAiTurnRequest(value) {
  const issues = [];
  if (!isPlainObject(value)) {
    return { ok: false, issues: [issue('', 'invalid_body', 'Request body must be an object.')] };
  }

  validateCommonRequest(value, issues);
  if (!isPlainObject(value.input)) {
    issues.push(issue('input', 'invalid_input', 'input must be an object.'));
    return { ok: false, issues };
  }

  if (value.input.kind === 'message') {
    if (!Array.isArray(value.history)) {
      issues.push(issue('history', 'invalid_history', 'Initial messages require visible history.'));
    }
    if (!Array.isArray(value.allowedToolGroups)) {
      issues.push(
        issue('allowedToolGroups', 'invalid_tool_groups', 'Initial messages require tool groups.')
      );
    }
    if (
      typeof value.input.text !== 'string' ||
      !value.input.text.trim() ||
      value.input.text.length > AI_LIMITS.maxMessageCharacters
    ) {
      issues.push(
        issue(
          'input.text',
          'invalid_message',
          `Message must contain 1-${AI_LIMITS.maxMessageCharacters} characters.`
        )
      );
    }
    if (!AI_SUPPORTED_LOCALES.includes(value.input.locale)) {
      issues.push(issue('input.locale', 'invalid_locale', 'Unsupported assistant locale.'));
    }
    if ('round' in value || 'providerState' in value || 'continuationToken' in value) {
      issues.push(
        issue('', 'mixed_request_kind', 'Initial messages cannot include continuation fields.')
      );
    }
  } else if (value.input.kind === 'tool_results') {
    if (
      !Number.isInteger(value.round) ||
      value.round < 1 ||
      value.round > AI_LIMITS.maxToolRounds
    ) {
      issues.push(issue('round', 'invalid_round', 'Invalid tool continuation round.'));
    }
    if (!isPlainObject(value.providerState)) {
      issues.push(issue('providerState', 'invalid_provider_state', 'providerState is required.'));
    }
    if (
      typeof value.continuationToken !== 'string' ||
      value.continuationToken.length < 40 ||
      value.continuationToken.length > 8192
    ) {
      issues.push(
        issue('continuationToken', 'invalid_continuation_token', 'continuationToken is invalid.')
      );
    }
    if ('history' in value || 'allowedToolGroups' in value) {
      issues.push(
        issue('', 'mixed_request_kind', 'Tool continuations cannot repeat initial fields.')
      );
    }
    if (
      !Array.isArray(value.input.results) ||
      value.input.results.length < 1 ||
      value.input.results.length > AI_LIMITS.maxToolCalls
    ) {
      issues.push(issue('input.results', 'invalid_tool_results', 'Invalid tool result list.'));
    }
  } else {
    issues.push(issue('input.kind', 'invalid_input_kind', 'Unsupported input kind.'));
  }

  return issues.length ? { ok: false, issues } : { ok: true, value };
}

export function isAiSseEventType(value) {
  return typeof value === 'string' && AI_SSE_EVENT_TYPES.includes(value);
}
