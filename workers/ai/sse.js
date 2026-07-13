import { LIMITS, SAFE_ERROR_CODES } from './constants.js';
import { AiRequestError } from './errors.js';

const encoder = new TextEncoder();

export function encodeSse(event, data) {
  return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

function parseEventBlock(block) {
  let event = 'message';
  const data = [];
  for (const rawLine of block.split(/\r?\n/u)) {
    if (!rawLine || rawLine.startsWith(':')) continue;
    const separator = rawLine.indexOf(':');
    const field = separator === -1 ? rawLine : rawLine.slice(0, separator);
    let value = separator === -1 ? '' : rawLine.slice(separator + 1);
    if (value.startsWith(' ')) value = value.slice(1);
    if (field === 'event') event = value;
    if (field === 'data') data.push(value);
  }
  return { event, data: data.join('\n') };
}

async function timedRead(reader, timeoutMs, signal, timeoutMessage) {
  if (signal?.aborted) {
    throw new AiRequestError(499, SAFE_ERROR_CODES.interrupted, 'The stream was interrupted.');
  }
  let timeoutId;
  let abortHandler;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reader.cancel(timeoutMessage).catch(() => undefined);
      reject(new AiRequestError(504, SAFE_ERROR_CODES.timeout, timeoutMessage));
    }, timeoutMs);
  });
  const aborted = new Promise((_, reject) => {
    if (!signal) return;
    abortHandler = () => {
      reader.cancel('aborted').catch(() => undefined);
      reject(new AiRequestError(499, SAFE_ERROR_CODES.interrupted, 'The stream was interrupted.'));
    };
    signal.addEventListener('abort', abortHandler, { once: true });
  });
  try {
    return await Promise.race([reader.read(), timeout, aborted]);
  } finally {
    clearTimeout(timeoutId);
    if (abortHandler) signal.removeEventListener('abort', abortHandler);
  }
}

export async function* parseSseStream(
  stream,
  {
    signal,
    firstEventMs = LIMITS.firstProviderEventMs,
    idleEventMs = LIMITS.idleProviderEventMs,
    maxBufferedBytes = 512 * 1024,
  } = {}
) {
  if (!stream?.getReader)
    throw new AiRequestError(502, SAFE_ERROR_CODES.provider, 'Missing stream.');
  const reader = stream.getReader();
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let buffer = '';
  let eventCount = 0;

  try {
    for (;;) {
      const timeoutMs = eventCount ? idleEventMs : firstEventMs;
      const message = eventCount
        ? 'The provider stream became idle.'
        : 'The provider did not start in time.';
      const { value, done } = await timedRead(reader, timeoutMs, signal, message);
      if (done) break;
      try {
        buffer += decoder.decode(value, { stream: true });
      } catch {
        throw new AiRequestError(
          502,
          SAFE_ERROR_CODES.provider,
          'The provider sent invalid UTF-8.'
        );
      }
      if (new TextEncoder().encode(buffer).byteLength > maxBufferedBytes) {
        throw new AiRequestError(502, SAFE_ERROR_CODES.provider, 'A provider event is too large.');
      }

      for (;;) {
        const boundary = /\r?\n\r?\n/u.exec(buffer);
        if (!boundary) break;
        const block = buffer.slice(0, boundary.index);
        buffer = buffer.slice(boundary.index + boundary[0].length);
        if (!block.trim()) continue;
        const parsed = parseEventBlock(block);
        eventCount += 1;
        yield parsed;
      }
    }
    try {
      buffer += decoder.decode();
    } catch {
      throw new AiRequestError(502, SAFE_ERROR_CODES.provider, 'The provider sent invalid UTF-8.');
    }
    if (buffer.trim()) {
      eventCount += 1;
      yield parseEventBlock(buffer);
    }
  } finally {
    reader.releaseLock();
  }
}
