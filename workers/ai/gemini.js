import {
  ALLOWED_MODELS,
  GEMINI_API_REVISION,
  GEMINI_INTERACTIONS_URL,
  LIMITS,
  SAFE_ERROR_CODES,
} from './constants.js';
import { createContinuationToken, hashProviderState } from './continuation.js';
import { stableStringify, utf8ByteLength } from './crypto.js';
import { AiRequestError, asSafeError } from './errors.js';
import { SYSTEM_INSTRUCTION } from './prompt.js';
import { encodeSse, parseSseStream } from './sse.js';
import {
  TOOL_DECLARATIONS,
  isKnownToolName,
  validateToolArguments,
  validateToolPermission,
} from './tools.js';

const MODEL_SET = new Set(ALLOWED_MODELS);

function configuredModel(env) {
  const model = String(env.AI_MODEL || '').trim();
  if (!MODEL_SET.has(model)) {
    throw new AiRequestError(503, SAFE_ERROR_CODES.provider, 'The AI model is not configured.');
  }
  return model;
}

function toolsForGroups(groups) {
  const set = new Set(groups);
  return TOOL_DECLARATIONS.filter(
    ({ name }) =>
      (name !== 'get_material_plan_summary' || set.has('personal:dm_plan')) &&
      (name !== 'get_admin_context' || set.has('private:admin_dashboard'))
  );
}

export function buildGeminiRequest({ model, providerInput, allowedToolGroups, locale }) {
  return {
    model,
    input: providerInput,
    system_instruction: `${SYSTEM_INSTRUCTION}\n\nCURRENT UI LANGUAGE\n${locale}\n\nALLOWED TOOL GROUPS\n${allowedToolGroups.join(', ')}`,
    tools: toolsForGroups(allowedToolGroups),
    stream: true,
    store: false,
    background: false,
    generation_config: {
      thinking_level: 'low',
      thinking_summaries: 'none',
      tool_choice: 'auto',
      max_output_tokens: LIMITS.maxOutputTokens,
      temperature: 0.25,
    },
  };
}

function retryDelayMs(response) {
  const retryAfter = Number(response.headers.get('retry-after') || 0);
  if (Number.isFinite(retryAfter) && retryAfter > 0) return Math.min(1_000, retryAfter * 1_000);
  return 250;
}

async function readProviderErrorMetadata(response, maxBytes = 8 * 1024) {
  if (!response?.body?.getReader) return {};
  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let text = '';
  let total = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) break;
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
  } catch {
    return {};
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
  try {
    const payload = JSON.parse(text);
    return {
      providerCode: payload?.error?.code ?? null,
      providerStatus: payload?.error?.status ?? null,
      providerMessage: String(payload?.error?.message || '').slice(0, 500) || null,
    };
  } catch {
    return { providerMessage: text.trim().slice(0, 500) || null };
  }
}

function wait(ms, signal) {
  return new Promise((resolve, reject) => {
    const finish = () => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    };
    const timeoutId = setTimeout(finish, ms);
    const onAbort = () => {
      clearTimeout(timeoutId);
      reject(new AiRequestError(499, SAFE_ERROR_CODES.interrupted, 'The stream was interrupted.'));
    };
    if (signal?.aborted) return onAbort();
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

export async function fetchGeminiInteraction({ env, body, clientSignal, fetchImpl = fetch }) {
  if (typeof env.GEMINI_API_KEY !== 'string' || !env.GEMINI_API_KEY) {
    throw new AiRequestError(503, SAFE_ERROR_CODES.provider, 'The AI provider is not configured.');
  }
  const controller = new AbortController();
  const onClientAbort = () => controller.abort('client');
  if (clientSignal?.aborted) onClientAbort();
  else clientSignal?.addEventListener('abort', onClientAbort, { once: true });
  const roundTimeout = setTimeout(() => controller.abort('round-timeout'), LIMITS.providerRoundMs);

  const requestInit = {
    method: 'POST',
    headers: {
      Accept: 'text/event-stream',
      'Api-Revision': GEMINI_API_REVISION,
      'Content-Type': 'application/json',
      'x-goog-api-key': env.GEMINI_API_KEY.trim(),
    },
    body: JSON.stringify(body),
    signal: controller.signal,
  };

  try {
    let response;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        response = await fetchImpl(GEMINI_INTERACTIONS_URL, requestInit);
      } catch (error) {
        if (controller.signal.aborted) {
          const timeout = controller.signal.reason === 'round-timeout';
          throw new AiRequestError(
            timeout ? 504 : 499,
            timeout ? SAFE_ERROR_CODES.timeout : SAFE_ERROR_CODES.interrupted,
            timeout ? 'The provider round timed out.' : 'The request was interrupted.'
          );
        }
        throw error;
      }
      const retryableBeforeInteraction = response.status === 429 || response.status === 503;
      if (attempt === 0 && retryableBeforeInteraction) {
        await response.body?.cancel().catch(() => undefined);
        await wait(retryDelayMs(response), controller.signal);
        continue;
      }
      break;
    }
    if (!response?.ok) {
      const metadata = await readProviderErrorMetadata(response);
      const trimmedKey = env.GEMINI_API_KEY.trim();
      console.error(
        JSON.stringify({
          type: 'ai_provider_error',
          status: response?.status || 0,
          credentialShape: {
            length: env.GEMINI_API_KEY.length,
            trimmedLength: trimmedKey.length,
            wrappedInQuotes:
              (trimmedKey.startsWith('"') && trimmedKey.endsWith('"')) ||
              (trimmedKey.startsWith("'") && trimmedKey.endsWith("'")),
          },
          ...metadata,
        })
      );
      throw new AiRequestError(502, SAFE_ERROR_CODES.provider, 'The AI provider is unavailable.');
    }
    if (!/text\/event-stream/iu.test(response.headers.get('content-type') || '')) {
      await response.body?.cancel().catch(() => undefined);
      throw new AiRequestError(
        502,
        SAFE_ERROR_CODES.provider,
        'The provider returned an invalid stream.'
      );
    }
    return {
      response,
      signal: controller.signal,
      cleanup() {
        clearTimeout(roundTimeout);
        clientSignal?.removeEventListener('abort', onClientAbort);
      },
      abort() {
        controller.abort('downstream-cancelled');
      },
    };
  } catch (error) {
    clearTimeout(roundTimeout);
    clientSignal?.removeEventListener('abort', onClientAbort);
    if (error instanceof AiRequestError) throw error;
    throw new AiRequestError(502, SAFE_ERROR_CODES.provider, 'The AI provider is unavailable.');
  }
}

function providerProtocolError(message = 'The provider returned an invalid stream.') {
  return new AiRequestError(502, SAFE_ERROR_CODES.provider, message);
}

function normalizedUsage(raw = {}) {
  return {
    inputTokens: Number(raw.total_input_tokens || 0),
    outputTokens: Number(raw.total_output_tokens || 0),
    thoughtTokens: Number(raw.total_thought_tokens || 0),
    toolTokens: Number(raw.total_tool_use_tokens || 0),
    cachedTokens: Number(raw.total_cached_tokens || 0),
    totalTokens: Number(raw.total_tokens || 0),
  };
}

export class ProviderStreamAssembler {
  constructor({ allowedToolGroups, priorFingerprints = [] }) {
    this.allowedToolGroups = allowedToolGroups;
    this.priorFingerprints = [...priorFingerprints];
    this.fingerprintSet = new Set(priorFingerprints);
    this.active = new Map();
    this.steps = [];
    this.calls = [];
    this.callIds = new Set();
    this.status = null;
    this.usage = normalizedUsage();
    this.completed = false;
    this.visibleBytes = 0;
    this.eventCounts = Object.create(null);
    this.stepTypes = [];
  }

  startStep(event) {
    const index = event.index;
    const step = event.step;
    if (!Number.isInteger(index) || this.active.has(index) || !step || typeof step !== 'object') {
      throw providerProtocolError();
    }
    this.stepTypes.push(String(step.type || 'unknown'));
    if (step.type === 'model_output') {
      const text = Array.isArray(step.content)
        ? step.content
            .filter((part) => part?.type === 'text' && typeof part.text === 'string')
            .map((part) => part.text)
            .join('')
        : '';
      this.visibleBytes += utf8ByteLength(text);
      if (this.visibleBytes > 96 * 1024)
        throw providerProtocolError('Provider output is too large.');
      this.active.set(index, { type: 'model_output', text });
      return text ? { text } : null;
    }
    if (step.type === 'thought') {
      this.active.set(index, {
        type: 'thought',
        signature: typeof step.signature === 'string' ? step.signature : '',
        summary: Array.isArray(step.summary) ? step.summary : [],
      });
      return null;
    }
    if (step.type === 'function_call') {
      if (
        !isKnownToolName(step.name) ||
        typeof step.id !== 'string' ||
        !/^[A-Za-z0-9_-]{1,128}$/u.test(step.id) ||
        this.callIds.has(step.id)
      ) {
        throw new AiRequestError(
          400,
          SAFE_ERROR_CODES.malformedTool,
          'The provider requested an invalid tool.'
        );
      }
      this.callIds.add(step.id);
      this.active.set(index, {
        type: 'function_call',
        id: step.id,
        name: step.name,
        signature:
          typeof step.signature === 'string' && step.signature.length <= 32_768
            ? step.signature
            : '',
        argumentsText:
          step.arguments &&
          typeof step.arguments === 'object' &&
          !Array.isArray(step.arguments) &&
          Object.keys(step.arguments).length
            ? JSON.stringify(step.arguments)
            : '',
      });
      return null;
    }
    throw providerProtocolError('The provider requested an unsupported tool type.');
  }

  applyDelta(event) {
    const active = this.active.get(event.index);
    const delta = event.delta;
    if (!active || !delta || typeof delta !== 'object') throw providerProtocolError();
    if (active.type === 'model_output' && delta.type === 'text') {
      if (typeof delta.text !== 'string') throw providerProtocolError();
      this.visibleBytes += utf8ByteLength(delta.text);
      if (this.visibleBytes > 96 * 1024)
        throw providerProtocolError('Provider output is too large.');
      active.text += delta.text;
      return { text: delta.text };
    }
    if (
      active.type === 'function_call' &&
      (delta.type === 'arguments' || delta.type === 'arguments_delta')
    ) {
      const partial = delta.type === 'arguments' ? delta.partial_arguments : delta.arguments;
      if (typeof partial !== 'string') throw providerProtocolError();
      active.argumentsText += partial;
      if (utf8ByteLength(active.argumentsText) > LIMITS.toolResultBytes) {
        throw new AiRequestError(
          400,
          SAFE_ERROR_CODES.malformedTool,
          'Tool arguments are too large.'
        );
      }
      return null;
    }
    if (active.type === 'thought' && delta.type === 'thought_signature') {
      if (typeof delta.signature !== 'string' || delta.signature.length > 32_768) {
        throw providerProtocolError();
      }
      active.signature = delta.signature;
      return null;
    }
    if (active.type === 'thought' && delta.type === 'thought_summary') {
      const content = delta.content;
      if (content?.type === 'text' && typeof content.text === 'string') {
        active.summary.push({ type: 'text', text: content.text });
      }
      return null;
    }
    return null;
  }

  stopStep(event) {
    const active = this.active.get(event.index);
    if (!active) throw providerProtocolError();
    this.active.delete(event.index);
    if (active.type === 'model_output') {
      this.steps.push({
        type: 'model_output',
        content: active.text ? [{ type: 'text', text: active.text }] : [],
      });
      return;
    }
    if (active.type === 'thought') {
      const step = { type: 'thought' };
      if (active.signature) step.signature = active.signature;
      if (active.summary.length) step.summary = active.summary;
      this.steps.push(step);
      return;
    }

    let args;
    try {
      args = JSON.parse(active.argumentsText || '{}');
    } catch {
      throw new AiRequestError(
        400,
        SAFE_ERROR_CODES.malformedTool,
        'The provider sent malformed tool arguments.'
      );
    }
    if (
      !validateToolArguments(active.name, args) ||
      !validateToolPermission(active.name, args, this.allowedToolGroups)
    ) {
      throw new AiRequestError(
        400,
        SAFE_ERROR_CODES.malformedTool,
        'The provider requested a disallowed tool.'
      );
    }
    const fingerprint = stableStringify({ name: active.name, arguments: args });
    if (this.fingerprintSet.has(fingerprint)) {
      throw new AiRequestError(
        400,
        SAFE_ERROR_CODES.malformedTool,
        'The provider repeated an identical tool request.'
      );
    }
    this.fingerprintSet.add(fingerprint);
    this.priorFingerprints.push(fingerprint);
    const call = { callId: active.id, name: active.name, arguments: args };
    this.calls.push(call);
    const step = { type: 'function_call', id: active.id, name: active.name, arguments: args };
    if (active.signature) step.signature = active.signature;
    this.steps.push(step);
  }

  accept(raw) {
    const eventType = raw?.event_type;
    if (typeof eventType === 'string') {
      this.eventCounts[eventType] = (this.eventCounts[eventType] || 0) + 1;
    }
    if (eventType === 'step.start') return this.startStep(raw);
    else if (eventType === 'step.delta') return this.applyDelta(raw);
    else if (eventType === 'step.stop') this.stopStep(raw);
    else if (eventType === 'interaction.completed') {
      if (this.active.size) throw providerProtocolError();
      this.status = raw.interaction?.status;
      this.usage = normalizedUsage(raw.interaction?.usage);
      this.completed = true;
    } else if (eventType === 'error') {
      const code = String(raw.error?.code || '').toLowerCase();
      if (code.includes('safety') || code.includes('blocked')) {
        throw new AiRequestError(
          400,
          SAFE_ERROR_CODES.safety,
          'The provider blocked this request.'
        );
      }
      if (code.includes('timeout') || code.includes('deadline')) {
        throw new AiRequestError(504, SAFE_ERROR_CODES.timeout, 'The provider timed out.');
      }
      throw new AiRequestError(502, SAFE_ERROR_CODES.provider, 'The AI provider failed.');
    }
    return null;
  }
}

function providerStateOrThrow(value) {
  if (
    !value ||
    typeof value !== 'object' ||
    value.version !== 1 ||
    !Array.isArray(value.steps) ||
    !Array.isArray(value.callFingerprints) ||
    !Number.isFinite(value.startedAt)
  ) {
    throw new AiRequestError(401, SAFE_ERROR_CODES.continuation, 'providerState is invalid.');
  }
  return value;
}

export function buildFunctionResultSteps(results) {
  return results.map((result) => ({
    type: 'function_result',
    name: result.name,
    call_id: result.callId,
    is_error: !result.ok,
    result: [
      {
        type: 'text',
        text: JSON.stringify({ ok: result.ok, data: result.data }),
      },
    ],
  }));
}

export function buildContinuationProviderInput(providerState, results) {
  const state = providerStateOrThrow(providerState);
  return [...state.steps, ...buildFunctionResultSteps(results)];
}

export function sourcesFromResults(results = []) {
  const seen = new Set();
  const sources = [];
  for (const result of results) {
    if (!result.ok) continue;
    const meta = result.data?.meta || result.data?.data?.meta;
    const sourceId = typeof meta?.sourceId === 'string' ? meta.sourceId : '';
    const evidenceId = typeof meta?.evidenceId === 'string' ? meta.evidenceId : '';
    const tool = typeof meta?.tool === 'string' ? meta.tool : result.name;
    const key = `${sourceId}\u0000${evidenceId}\u0000${tool}`;
    if ((!sourceId && !evidenceId) || seen.has(key)) continue;
    seen.add(key);
    sources.push({ sourceId, evidenceId, tool });
  }
  return sources;
}

function writeSafe(controller, event, data) {
  controller.enqueue(encodeSse(event, data));
}

export function createNormalizedInteractionStream({
  upstream,
  env,
  requestId,
  round,
  providerInput,
  allowedToolGroups,
  locale,
  uidHash,
  startedAt,
  priorFingerprints,
  priorTotalCalls,
  quota,
  sourceResults,
  requestBytes,
}) {
  const model = configuredModel(env);
  const assembler = new ProviderStreamAssembler({ allowedToolGroups, priorFingerprints });
  const started = Date.now();

  return new ReadableStream({
    async start(controller) {
      let finalStatus = 'failed';
      try {
        writeSafe(controller, 'start', {
          requestId,
          model,
          round,
          quota,
        });
        writeSafe(controller, 'status', { stage: 'connecting' });

        for await (const event of parseSseStream(upstream.response.body, {
          signal: upstream.signal,
        })) {
          if (event.data === '[DONE]') continue;
          if (!event.data) continue;
          let raw;
          try {
            raw = JSON.parse(event.data);
          } catch {
            throw providerProtocolError();
          }
          const delta = assembler.accept(raw);
          if (delta?.text) writeSafe(controller, 'text_delta', delta);
        }

        if (!assembler.completed || !assembler.status) {
          throw new AiRequestError(
            502,
            SAFE_ERROR_CODES.interrupted,
            'The provider stream ended before completion.'
          );
        }
        const totalCalls = priorTotalCalls + assembler.calls.length;
        if (totalCalls > LIMITS.toolCalls) {
          throw new AiRequestError(
            400,
            SAFE_ERROR_CODES.malformedTool,
            'The provider requested too many tools.'
          );
        }

        const sources = sourcesFromResults(sourceResults);
        if (sources.length) writeSafe(controller, 'sources', { sources });
        writeSafe(controller, 'usage', assembler.usage);

        if (assembler.calls.length) {
          if (round >= LIMITS.toolRounds) {
            throw new AiRequestError(
              400,
              SAFE_ERROR_CODES.malformedTool,
              'The provider exceeded the tool-round limit.'
            );
          }
          const providerState = {
            version: 1,
            startedAt,
            steps: [...providerInput, ...assembler.steps],
            callFingerprints: assembler.priorFingerprints,
          };
          if (utf8ByteLength(JSON.stringify(providerState)) > LIMITS.providerStateBytes) {
            throw new AiRequestError(
              413,
              SAFE_ERROR_CODES.oversizedInput,
              'Provider state is too large.'
            );
          }
          const providerStateHash = await hashProviderState(providerState);
          const continuationToken = await createContinuationToken(env.AI_CONTINUATION_SECRET, {
            uidHash,
            requestId,
            nextRound: round + 1,
            providerStateHash,
            calls: assembler.calls,
            allowedToolGroups,
            locale,
            callFingerprints: assembler.priorFingerprints,
            totalCalls,
            startedAt,
            nowMs: Date.now(),
          });
          writeSafe(controller, 'tool_calls', { calls: assembler.calls });
          writeSafe(controller, 'state', {
            providerState,
            continuationToken,
            round: round + 1,
          });
          finalStatus = 'requires_action';
          writeSafe(controller, 'done', { status: finalStatus });
        } else if (assembler.status === 'requires_action') {
          throw new AiRequestError(
            400,
            SAFE_ERROR_CODES.malformedTool,
            'The provider requested action without a tool call.'
          );
        } else if (assembler.status === 'completed' || assembler.status === 'incomplete') {
          finalStatus = assembler.status;
          writeSafe(controller, 'done', {
            status: finalStatus,
            incomplete: assembler.status === 'incomplete',
          });
        } else if (assembler.status === 'budget_exceeded') {
          throw new AiRequestError(
            429,
            SAFE_ERROR_CODES.globalBudget,
            'The provider budget was exceeded.'
          );
        } else if (assembler.status === 'cancelled') {
          throw new AiRequestError(
            499,
            SAFE_ERROR_CODES.interrupted,
            'The response was interrupted.'
          );
        } else {
          throw new AiRequestError(
            502,
            SAFE_ERROR_CODES.provider,
            'The provider could not answer.'
          );
        }
      } catch (error) {
        const safe = asSafeError(error);
        finalStatus = safe.code;
        try {
          writeSafe(controller, 'error', {
            code: safe.code,
            message: safe.message,
            retryAfter: safe.retryAfter || null,
          });
        } catch {
          // The browser may already have aborted the stream.
        }
      } finally {
        upstream.cleanup();
        try {
          controller.close();
        } catch {
          // The browser may already have aborted the stream.
        }
        console.log(
          JSON.stringify({
            type: 'ai_turn',
            requestId,
            model,
            round,
            status: finalStatus,
            latencyMs: Date.now() - started,
            requestBytes,
            toolNames: assembler.calls.map(({ name }) => name),
            providerEvents: assembler.eventCounts,
            providerStepTypes: assembler.stepTypes,
            visibleBytes: assembler.visibleBytes,
            tokenTotals: assembler.usage,
          })
        );
      }
    },
    cancel() {
      upstream.abort();
      upstream.cleanup();
    },
  });
}

export async function prepareGeminiUpstream({
  env,
  providerInput,
  allowedToolGroups,
  locale,
  requestSignal,
}) {
  const model = configuredModel(env);
  const body = buildGeminiRequest({ model, providerInput, allowedToolGroups, locale });
  return fetchGeminiInteraction({ env, body, clientSignal: requestSignal });
}
