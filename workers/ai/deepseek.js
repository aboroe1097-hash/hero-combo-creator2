import {
  ALLOWED_DEEPSEEK_MODELS,
  DEEPSEEK_CHAT_URL,
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

const MODEL_SET = new Set(ALLOWED_DEEPSEEK_MODELS);

function configuredModel(env) {
  const model = String(env.AI_MODEL || '').trim() || 'deepseek-chat';
  if (!MODEL_SET.has(model)) {
    throw new AiRequestError(503, SAFE_ERROR_CODES.provider, 'The AI model is not configured.');
  }
  return model;
}

function optionalFastModel(env) {
  const model = String(env.AI_MODEL_FAST || '').trim();
  return MODEL_SET.has(model) ? model : null;
}

const FAST_PATH_MAX_CHARACTERS = 280;
const FAST_PATH_MAX_HISTORY_STEPS = 1;

// Simple, standalone questions get the fast model; anything that needs tool
// reasoning, follow-up context, or a longer answer gets the primary model.
export function pickModel(env, providerInput = [], activeTab = null) {
  const primary = configuredModel(env);
  const fast = optionalFastModel(env);
  if (!fast || fast === primary) return primary;
  const steps = Array.isArray(providerInput) ? providerInput : [];
  const initialMessages = steps.filter((step) => step?.type === 'user_input');
  const isFastPath =
    !activeTab &&
    initialMessages.length === 1 &&
    steps.length <= FAST_PATH_MAX_HISTORY_STEPS &&
    String(initialMessages[0]?.content?.[0]?.text || '').length <= FAST_PATH_MAX_CHARACTERS;
  return isFastPath ? fast : primary;
}

function toolsForGroups(groups) {
  const set = new Set(groups);
  return TOOL_DECLARATIONS.filter(
    ({ name }) =>
      (name !== 'get_material_plan_summary' || set.has('personal:dm_plan')) &&
      (name !== 'get_admin_context' || set.has('private:admin_dashboard'))
  ).map((tool) => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }));
}

function extractStepText(content) {
  if (Array.isArray(content)) {
    return content
      .filter((part) => part?.type === 'text' && typeof part.text === 'string')
      .map((part) => part.text)
      .join('');
  }
  if (typeof content === 'string') return content;
  return '';
}

function convertProviderInputToMessages(providerInput, systemInstruction) {
  const messages = [{ role: 'system', content: systemInstruction }];
  const steps = Array.isArray(providerInput) ? providerInput : [];

  for (const step of steps) {
    if (!step || typeof step !== 'object') continue;

    if (step.type === 'user_input') {
      messages.push({
        role: 'user',
        content: extractStepText(step.content),
      });
    } else if (step.type === 'model_output') {
      messages.push({
        role: 'assistant',
        content: extractStepText(step.content),
      });
    } else if (step.type === 'function_call') {
      const toolCall = {
        id: step.id,
        type: 'function',
        function: {
          name: step.name,
          arguments:
            typeof step.arguments === 'string'
              ? step.arguments
              : JSON.stringify(step.arguments ?? {}),
        },
      };
      const lastMsg = messages[messages.length - 1];
      if (
        lastMsg &&
        lastMsg.role === 'assistant' &&
        Array.isArray(lastMsg.tool_calls) &&
        (lastMsg.content === null || lastMsg.content === undefined)
      ) {
        lastMsg.tool_calls.push(toolCall);
      } else {
        messages.push({
          role: 'assistant',
          content: null,
          tool_calls: [toolCall],
        });
      }
    } else if (step.type === 'function_result') {
      const text = Array.isArray(step.result)
        ? step.result
            .filter((part) => part?.type === 'text' && typeof part.text === 'string')
            .map((part) => part.text)
            .join('')
        : typeof step.result === 'string'
          ? step.result
          : JSON.stringify(step.result ?? '');
      messages.push({
        role: 'tool',
        tool_call_id: step.call_id || step.callId,
        content: text,
      });
    }
  }

  return messages;
}

export function buildDeepseekRequest({
  model,
  providerInput,
  allowedToolGroups,
  locale,
  activeTab,
}) {
  const activeTabSection = activeTab ? `\n\nACTIVE APP TAB\n${activeTab}` : '';
  const systemInstruction = `${SYSTEM_INSTRUCTION}\n\nCURRENT UI LANGUAGE\n${locale}${activeTabSection}\n\nALLOWED TOOL GROUPS\n${allowedToolGroups.join(', ')}`;
  const messages = convertProviderInputToMessages(providerInput, systemInstruction);
  const tools = toolsForGroups(allowedToolGroups);

  const request = {
    model,
    messages,
    stream: true,
    max_tokens: LIMITS.maxOutputTokens,
  };
  if (tools.length > 0) {
    request.tools = tools;
  }
  if (model !== 'deepseek-reasoner') {
    request.temperature = 0.25;
  }
  return request;
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
      providerCode: payload?.error?.code ?? payload?.error?.type ?? null,
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

export async function fetchDeepseekInteraction({ env, body, clientSignal, fetchImpl = fetch }) {
  if (typeof env.DEEPSEEK_API_KEY !== 'string' || !env.DEEPSEEK_API_KEY.trim()) {
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
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.DEEPSEEK_API_KEY.trim()}`,
    },
    signal: controller.signal,
  };

  try {
    let response;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        response = await fetchImpl(DEEPSEEK_CHAT_URL, {
          ...requestInit,
          body: JSON.stringify(body),
        });
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
        const fallbackModel = String(body.fallbackModel || '').trim();
        await response.body?.cancel().catch(() => undefined);
        if (fallbackModel && fallbackModel !== body.model) {
          const fromModel = body.model;
          body = { ...body, model: fallbackModel };
          console.log(
            JSON.stringify({
              type: 'ai_model_fallback',
              status: response.status,
              from: fromModel,
              to: fallbackModel,
            })
          );
        }
        await wait(retryDelayMs(response), controller.signal);
        continue;
      }
      break;
    }
    if (!response?.ok) {
      const metadata = await readProviderErrorMetadata(response);
      const trimmedKey = env.DEEPSEEK_API_KEY.trim();
      console.error(
        JSON.stringify({
          type: 'ai_provider_error',
          status: response?.status || 0,
          credentialShape: {
            length: env.DEEPSEEK_API_KEY.length,
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
      usedModel: body.model,
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
    inputTokens: Number(raw.prompt_tokens || 0),
    outputTokens: Number(raw.completion_tokens || 0),
    thoughtTokens: Number(
      raw.completion_tokens_details?.reasoning_tokens || raw.reasoning_tokens || 0
    ),
    toolTokens: 0,
    cachedTokens: Number(
      raw.prompt_tokens_details?.cached_tokens || raw.prompt_cache_hit_tokens || 0
    ),
    totalTokens: Number(raw.total_tokens || 0),
  };
}

export class ProviderStreamAssembler {
  constructor({ allowedToolGroups, priorFingerprints = [] }) {
    this.allowedToolGroups = allowedToolGroups;
    this.priorFingerprints = [...priorFingerprints];
    this.fingerprintSet = new Set(priorFingerprints);
    this.steps = [];
    this.calls = [];
    this.callIds = new Set();
    this.status = null;
    this.usage = normalizedUsage();
    this.completed = false;
    this.visibleBytes = 0;
    this.eventCounts = Object.create(null);
    this.stepTypes = [];

    this.currentText = '';
    this.currentReasoning = '';
    this.accumulatedTools = new Map();
    this.finishReason = null;
  }

  accept(raw) {
    if (!raw || typeof raw !== 'object') {
      throw providerProtocolError();
    }

    if (raw.error) {
      const code = String(raw.error.code || raw.error.type || '').toLowerCase();
      const message = String(raw.error.message || '').toLowerCase();
      if (
        code.includes('safety') ||
        code.includes('blocked') ||
        message.includes('safety') ||
        message.includes('content filter')
      ) {
        throw new AiRequestError(
          400,
          SAFE_ERROR_CODES.safety,
          'The provider blocked this request.'
        );
      }
      if (code.includes('timeout') || code.includes('deadline') || message.includes('timeout')) {
        throw new AiRequestError(504, SAFE_ERROR_CODES.timeout, 'The provider timed out.');
      }
      throw new AiRequestError(502, SAFE_ERROR_CODES.provider, 'The AI provider failed.');
    }

    if (raw.usage && typeof raw.usage === 'object') {
      this.usage = normalizedUsage(raw.usage);
    }

    let deltaResult = null;
    const choice = Array.isArray(raw.choices) ? raw.choices[0] : null;
    if (choice && typeof choice === 'object') {
      if (typeof choice.finish_reason === 'string') {
        this.finishReason = choice.finish_reason;
      }
      const delta = choice.delta;
      if (delta && typeof delta === 'object') {
        if (typeof delta.reasoning_content === 'string' && delta.reasoning_content) {
          this.currentReasoning += delta.reasoning_content;
        }

        if (typeof delta.content === 'string' && delta.content) {
          const deltaBytes = utf8ByteLength(delta.content);
          this.visibleBytes += deltaBytes;
          if (this.visibleBytes > 96 * 1024) {
            throw providerProtocolError('Provider output is too large.');
          }
          this.currentText += delta.content;
          deltaResult = { text: delta.content };
        }

        if (Array.isArray(delta.tool_calls)) {
          for (const tc of delta.tool_calls) {
            if (!tc || typeof tc !== 'object') continue;
            const idx = Number.isInteger(tc.index) ? tc.index : this.accumulatedTools.size;
            if (idx < 0 || idx > 32) {
              throw providerProtocolError('Invalid tool call index.');
            }
            let record = this.accumulatedTools.get(idx);
            if (!record) {
              record = { id: '', name: '', argumentsText: '' };
              this.accumulatedTools.set(idx, record);
            }
            if (typeof tc.id === 'string' && tc.id) {
              record.id = tc.id;
            }
            if (tc.function && typeof tc.function === 'object') {
              if (typeof tc.function.name === 'string' && tc.function.name) {
                record.name += tc.function.name;
              }
              if (typeof tc.function.arguments === 'string' && tc.function.arguments) {
                record.argumentsText += tc.function.arguments;
                if (utf8ByteLength(record.argumentsText) > LIMITS.toolResultBytes) {
                  throw new AiRequestError(
                    400,
                    SAFE_ERROR_CODES.malformedTool,
                    'Tool arguments are too large.'
                  );
                }
              }
            }
          }
        }
      }
    }

    return deltaResult;
  }

  finalize() {
    if (this.completed) return;

    if (this.finishReason === 'content_filter') {
      throw new AiRequestError(400, SAFE_ERROR_CODES.safety, 'The provider blocked this request.');
    }

    if (this.currentReasoning) {
      this.steps.push({
        type: 'thought',
        summary: [{ type: 'text', text: this.currentReasoning }],
      });
      this.stepTypes.push('thought');
    }

    if (this.currentText) {
      this.steps.push({
        type: 'model_output',
        content: [{ type: 'text', text: this.currentText }],
      });
      this.stepTypes.push('model_output');
    }

    if (this.accumulatedTools.size > 0) {
      const sortedIndices = [...this.accumulatedTools.keys()].sort((a, b) => a - b);
      for (const idx of sortedIndices) {
        const tool = this.accumulatedTools.get(idx);
        if (!isKnownToolName(tool.name)) {
          throw new AiRequestError(
            400,
            SAFE_ERROR_CODES.malformedTool,
            'The provider requested an invalid tool.'
          );
        }
        const callId = tool.id;
        if (
          !callId ||
          typeof callId !== 'string' ||
          !/^[A-Za-z0-9_-]{1,128}$/u.test(callId) ||
          this.callIds.has(callId)
        ) {
          throw new AiRequestError(
            400,
            SAFE_ERROR_CODES.malformedTool,
            'The provider requested an invalid tool.'
          );
        }
        this.callIds.add(callId);

        let args;
        try {
          args = JSON.parse(tool.argumentsText || '{}');
        } catch {
          throw new AiRequestError(
            400,
            SAFE_ERROR_CODES.malformedTool,
            'The provider sent malformed tool arguments.'
          );
        }
        if (!args || typeof args !== 'object' || Array.isArray(args)) {
          throw new AiRequestError(
            400,
            SAFE_ERROR_CODES.malformedTool,
            'The provider sent malformed tool arguments.'
          );
        }

        if (
          !validateToolArguments(tool.name, args) ||
          !validateToolPermission(tool.name, args, this.allowedToolGroups)
        ) {
          throw new AiRequestError(
            400,
            SAFE_ERROR_CODES.malformedTool,
            'The provider requested a disallowed tool.'
          );
        }

        const fingerprint = stableStringify({ name: tool.name, arguments: args });
        if (this.fingerprintSet.has(fingerprint)) {
          throw new AiRequestError(
            400,
            SAFE_ERROR_CODES.malformedTool,
            'The provider repeated an identical tool request.'
          );
        }
        this.fingerprintSet.add(fingerprint);
        this.priorFingerprints.push(fingerprint);

        const call = { callId, name: tool.name, arguments: args };
        this.calls.push(call);
        this.steps.push({ type: 'function_call', id: callId, name: tool.name, arguments: args });
        this.stepTypes.push('function_call');
      }
    }

    if (this.calls.length > 0) {
      this.status = 'requires_action';
    } else if (this.finishReason === 'length') {
      this.status = 'incomplete';
    } else if (
      this.finishReason === 'stop' ||
      this.finishReason === null ||
      this.finishReason === 'tool_calls'
    ) {
      if (this.finishReason === 'tool_calls' && this.calls.length === 0) {
        throw new AiRequestError(
          400,
          SAFE_ERROR_CODES.malformedTool,
          'The provider requested action without a tool call.'
        );
      }
      this.status = 'completed';
    } else {
      this.status = 'completed';
    }

    this.completed = true;
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
  const effectiveModel = upstream.model || model;

  return new ReadableStream({
    async start(controller) {
      let finalStatus = 'failed';
      try {
        writeSafe(controller, 'start', {
          requestId,
          model: effectiveModel,
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

        assembler.finalize();

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
            model: effectiveModel,
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

export async function prepareDeepseekUpstream({
  env,
  providerInput,
  allowedToolGroups,
  locale,
  activeTab = null,
  requestSignal,
}) {
  const model = pickModel(env, providerInput, activeTab);
  const fallbackModel = optionalFastModel(env) === model ? configuredModel(env) : null;
  const body = buildDeepseekRequest({ model, providerInput, allowedToolGroups, locale, activeTab });
  const upstream = await fetchDeepseekInteraction({
    env,
    body: { ...body, fallbackModel },
    clientSignal: requestSignal,
  });
  return { ...upstream, model: upstream.usedModel || model };
}
