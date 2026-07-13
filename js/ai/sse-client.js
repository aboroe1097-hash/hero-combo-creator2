export class AiTransportError extends Error {
  constructor(code, message, details = {}) {
    super(message || code);
    this.name = 'AiTransportError';
    this.code = code || 'provider_outage';
    this.status = details.status || 0;
    this.retryAfter = details.retryAfter || null;
    this.details = details;
  }
}

export function parseSseBlock(block) {
  let event = 'message';
  let id = '';
  const data = [];
  for (const rawLine of String(block || '').split('\n')) {
    const line = rawLine.endsWith('\r') ? rawLine.slice(0, -1) : rawLine;
    if (!line || line.startsWith(':')) continue;
    const separator = line.indexOf(':');
    const field = separator < 0 ? line : line.slice(0, separator);
    let value = separator < 0 ? '' : line.slice(separator + 1);
    if (value.startsWith(' ')) value = value.slice(1);
    if (field === 'event') event = value || 'message';
    else if (field === 'data') data.push(value);
    else if (field === 'id') id = value;
  }
  if (!data.length) return null;
  const rawData = data.join('\n');
  let parsed = rawData;
  try {
    parsed = JSON.parse(rawData);
  } catch {}
  return { event, data: parsed, id };
}

export async function consumeSseStream(stream, onEvent = () => {}) {
  if (!stream?.getReader)
    throw new AiTransportError('provider_outage', 'Response was not a stream.');
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let sawEvent = false;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
      buffer = buffer.replace(/\r\n/g, '\n');
      let boundary;
      while ((boundary = buffer.indexOf('\n\n')) >= 0) {
        const block = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        const event = parseSseBlock(block);
        if (event) {
          sawEvent = true;
          await onEvent(event);
        }
      }
      if (done) break;
    }
    const finalEvent = parseSseBlock(buffer);
    if (finalEvent) {
      sawEvent = true;
      await onEvent(finalEvent);
    }
  } finally {
    reader.releaseLock?.();
  }
  return { sawEvent };
}

async function readErrorPayload(response) {
  try {
    const payload = await response.json();
    return payload && typeof payload === 'object' ? payload : {};
  } catch {
    return {};
  }
}

export async function getDefaultAiCredentials() {
  const firebase = await import('../firebase.js');
  await firebase.initFirebase?.();
  const user = await firebase.ensureAnonymousAuth?.();
  const authToken = firebase.getFirebaseAuthIdToken
    ? await firebase.getFirebaseAuthIdToken()
    : await (user || firebase.getCurrentUser?.())?.getIdToken?.();
  const appCheckToken = await firebase.getFirebaseAppCheckToken?.();
  if (!authToken || !appCheckToken) {
    throw new AiTransportError('auth_app_check_failure', 'Firebase verification is unavailable.');
  }
  return { authToken, appCheckToken };
}

export async function streamAssistantRequest({
  endpoint,
  body,
  signal,
  onEvent,
  getCredentials = getDefaultAiCredentials,
  fetchImpl = globalThis.fetch,
}) {
  if (!endpoint) throw new AiTransportError('provider_outage', 'AI endpoint is not configured.');
  if (typeof fetchImpl !== 'function')
    throw new AiTransportError('provider_outage', 'Network is unavailable.');
  let credentials;
  try {
    credentials = await getCredentials();
  } catch (error) {
    if (error instanceof AiTransportError) throw error;
    throw new AiTransportError(
      'auth_app_check_failure',
      error?.message || 'Firebase verification failed.'
    );
  }

  let response;
  try {
    response = await fetchImpl(endpoint, {
      method: 'POST',
      mode: 'cors',
      cache: 'no-store',
      credentials: 'omit',
      redirect: 'error',
      headers: {
        Accept: 'text/event-stream',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${credentials.authToken}`,
        'X-Firebase-AppCheck': credentials.appCheckToken,
      },
      body: JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    throw new AiTransportError(
      'provider_outage',
      error?.message || 'Could not reach the AI service.'
    );
  }

  if (!response.ok) {
    const payload = await readErrorPayload(response);
    const quotaScope = response.headers.get('X-AI-Quota-Scope');
    const fallbackCode =
      response.status === 413
        ? 'oversized_input'
        : response.status === 401 || response.status === 403
          ? 'auth_app_check_failure'
          : response.status === 429
            ? quotaScope === 'daily'
              ? 'daily_quota'
              : quotaScope === 'global'
                ? 'global_budget'
                : 'burst_quota'
            : response.status >= 500
              ? 'provider_outage'
              : 'provider_outage';
    throw new AiTransportError(
      payload.code || fallbackCode,
      payload.message || response.statusText,
      {
        status: response.status,
        retryAfter: response.headers.get('Retry-After'),
      }
    );
  }

  const contentType = response.headers.get('Content-Type') || '';
  if (!contentType.toLowerCase().includes('text/event-stream')) {
    throw new AiTransportError('provider_outage', 'AI service returned an unexpected response.');
  }
  const result = await consumeSseStream(response.body, onEvent);
  return { response, ...result };
}
