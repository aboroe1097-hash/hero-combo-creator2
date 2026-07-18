import {
  API_VERSION,
  LIMITS,
  SUPPORTED_LOCALES,
  TOOL_GROUPS,
  SAFE_ERROR_CODES,
} from './constants.js';
import { utf8ByteLength } from './crypto.js';
import { AiRequestError } from './errors.js';
import { isKnownToolName } from './tools.js';

const REQUEST_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const CALL_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/u;
const ALLOWED_GROUP_SET = new Set(TOOL_GROUPS);
const LOCALE_SET = new Set(SUPPORTED_LOCALES);

function fail(message, code = SAFE_ERROR_CODES.badRequest, status = 400) {
  throw new AiRequestError(status, code, message);
}

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function requireExactKeys(value, allowed, required = allowed) {
  if (!isRecord(value)) fail('Expected an object.');
  const keys = Object.keys(value);
  if (keys.some((key) => !allowed.includes(key)))
    fail('The request contains an unsupported field.');
  if (required.some((key) => !Object.hasOwn(value, key)))
    fail('The request is missing a required field.');
}

function validateRequestId(value) {
  if (typeof value !== 'string' || !REQUEST_ID_PATTERN.test(value)) {
    fail('requestId must be a UUIDv4.');
  }
}

function validateAllowedGroups(value) {
  if (!Array.isArray(value) || value.length < 1 || value.length > TOOL_GROUPS.length) {
    fail('allowedToolGroups is invalid.');
  }
  const unique = new Set();
  for (const group of value) {
    if (!ALLOWED_GROUP_SET.has(group) || unique.has(group)) fail('allowedToolGroups is invalid.');
    unique.add(group);
  }
  if (!unique.has('static')) fail('The static tool group is required.');
  return [...unique].sort();
}

function validateHistory(value) {
  if (!Array.isArray(value) || value.length > LIMITS.historyPairs * 2 || value.length % 2 !== 0) {
    fail('history must contain at most eight complete user/assistant pairs.');
  }
  let byteCount = 0;
  const normalized = value.map((entry, index) => {
    requireExactKeys(entry, ['role', 'text']);
    const expectedRole = index % 2 === 0 ? 'user' : 'assistant';
    if (entry.role !== expectedRole) fail('history roles must alternate user and assistant.');
    if (
      typeof entry.text !== 'string' ||
      entry.text.length < 1 ||
      entry.text.length > LIMITS.historyEntryCharacters
    ) {
      fail('A history entry is invalid.');
    }
    byteCount += utf8ByteLength(entry.text);
    return { role: entry.role, text: entry.text };
  });
  if (byteCount > LIMITS.historyBytes) {
    fail('Visible history is too large.', SAFE_ERROR_CODES.oversizedInput, 413);
  }
  return normalized;
}

function validateMessageInput(value) {
  // activeTab is an optional UI breadcrumb; older clients omit it.
  requireExactKeys(value, ['kind', 'text', 'locale', 'activeTab'], ['kind', 'text', 'locale']);
  if (value.kind !== 'message') fail('Initial input kind must be message.');
  if (
    typeof value.text !== 'string' ||
    !value.text.trim() ||
    value.text.length > LIMITS.messageCharacters
  ) {
    const oversized =
      typeof value.text === 'string' && value.text.length > LIMITS.messageCharacters;
    fail(
      oversized ? 'The message is too large.' : 'The message is empty.',
      oversized ? SAFE_ERROR_CODES.oversizedInput : SAFE_ERROR_CODES.badRequest,
      oversized ? 413 : 400
    );
  }
  if (typeof value.locale !== 'string' || !LOCALE_SET.has(value.locale)) {
    fail('The locale is not supported.');
  }
  if (
    value.activeTab !== undefined &&
    (typeof value.activeTab !== 'string' || !/^[a-zA-Z][a-zA-Z0-9-]{0,39}$/.test(value.activeTab))
  ) {
    fail('The active tab is invalid.');
  }
  return {
    kind: 'message',
    text: value.text,
    locale: value.locale,
    activeTab: value.activeTab ?? null,
  };
}

function validateToolResults(value) {
  requireExactKeys(value, ['kind', 'results']);
  if (value.kind !== 'tool_results' || !Array.isArray(value.results)) {
    fail('Continuation input must contain tool results.');
  }
  if (value.results.length < 1 || value.results.length > LIMITS.toolCalls) {
    fail('The number of tool results is invalid.', SAFE_ERROR_CODES.malformedTool);
  }
  let combinedBytes = 0;
  const callIds = new Set();
  const results = value.results.map((result) => {
    requireExactKeys(result, ['callId', 'name', 'ok', 'data']);
    if (typeof result.callId !== 'string' || !CALL_ID_PATTERN.test(result.callId)) {
      fail('A tool call ID is invalid.', SAFE_ERROR_CODES.malformedTool);
    }
    if (callIds.has(result.callId))
      fail('Tool call IDs must be unique.', SAFE_ERROR_CODES.malformedTool);
    callIds.add(result.callId);
    if (!isKnownToolName(result.name) || typeof result.ok !== 'boolean') {
      fail('A tool result is invalid.', SAFE_ERROR_CODES.malformedTool);
    }
    let serialized;
    try {
      serialized = JSON.stringify(result.data);
    } catch {
      fail('A tool result is not serializable.', SAFE_ERROR_CODES.malformedTool);
    }
    if (serialized === undefined)
      fail('A tool result is not serializable.', SAFE_ERROR_CODES.malformedTool);
    const bytes = utf8ByteLength(serialized);
    if (bytes > LIMITS.toolResultBytes) {
      fail('A tool result is too large.', SAFE_ERROR_CODES.oversizedInput, 413);
    }
    combinedBytes += bytes;
    return { callId: result.callId, name: result.name, ok: result.ok, data: result.data };
  });
  if (combinedBytes > LIMITS.toolResultsBytes) {
    fail('Combined tool results are too large.', SAFE_ERROR_CODES.oversizedInput, 413);
  }
  return { kind: 'tool_results', results };
}

export function validateTurnPayload(value) {
  if (!isRecord(value)) fail('The request body must be a JSON object.');
  if (value.version !== API_VERSION) fail('Unsupported request version.');
  validateRequestId(value.requestId);

  const kind = value.input?.kind;
  if (kind === 'message') {
    requireExactKeys(value, ['version', 'requestId', 'history', 'input', 'allowedToolGroups']);
    return {
      version: API_VERSION,
      requestId: value.requestId,
      history: validateHistory(value.history),
      input: validateMessageInput(value.input),
      allowedToolGroups: validateAllowedGroups(value.allowedToolGroups),
      round: 0,
    };
  }
  if (kind === 'tool_results') {
    requireExactKeys(value, [
      'version',
      'requestId',
      'round',
      'providerState',
      'continuationToken',
      'input',
    ]);
    if (!Number.isInteger(value.round) || value.round < 1 || value.round > LIMITS.toolRounds) {
      fail('The continuation round is invalid.', SAFE_ERROR_CODES.continuation);
    }
    if (!isRecord(value.providerState)) {
      fail('providerState is invalid.', SAFE_ERROR_CODES.continuation);
    }
    const stateBytes = utf8ByteLength(JSON.stringify(value.providerState));
    if (stateBytes > LIMITS.providerStateBytes) {
      fail('providerState is too large.', SAFE_ERROR_CODES.oversizedInput, 413);
    }
    if (
      typeof value.continuationToken !== 'string' ||
      value.continuationToken.length < 40 ||
      value.continuationToken.length > 8_192
    ) {
      fail('The continuation token is invalid.', SAFE_ERROR_CODES.continuation);
    }
    return {
      version: API_VERSION,
      requestId: value.requestId,
      round: value.round,
      providerState: value.providerState,
      continuationToken: value.continuationToken,
      input: validateToolResults(value.input),
    };
  }
  fail('The input kind is invalid.');
}

export async function readBoundedJson(request, limit = LIMITS.bodyBytes) {
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (Number.isFinite(contentLength) && contentLength > limit) {
    fail('The request body is too large.', SAFE_ERROR_CODES.oversizedInput, 413);
  }
  if (!request.body) fail('The request body is required.');

  const reader = request.body.getReader();
  const chunks = [];
  let total = 0;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > limit) {
      await reader.cancel().catch(() => undefined);
      fail('The request body is too large.', SAFE_ERROR_CODES.oversizedInput, 413);
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    fail('The request body is not valid JSON.');
  }
}

export function buildInitialProviderSteps(history, input) {
  const steps = history.map((entry) => ({
    type: entry.role === 'user' ? 'user_input' : 'model_output',
    content: [{ type: 'text', text: entry.text }],
  }));
  steps.push({
    type: 'user_input',
    content: [{ type: 'text', text: input.text }],
  });
  return steps;
}
