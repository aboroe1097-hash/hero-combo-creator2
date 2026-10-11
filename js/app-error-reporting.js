import { importFirestore } from './firebase-sdk.js';

const ERROR_QUEUE_KEY = 'vts_error_report_queue';
const MAX_QUEUE_LENGTH = 20;
const MAX_SOURCE_LENGTH = 120;
const MAX_ERROR_NAME_LENGTH = 120;
const MAX_ERROR_MESSAGE_LENGTH = 2000;
const MAX_ERROR_STACK_LENGTH = 8000;
const MAX_PATH_LENGTH = 500;
const MAX_USER_AGENT_LENGTH = 500;
const MAX_EXTRA_KEYS = 12;
const MAX_EXTRA_KEY_LENGTH = 64;
const MAX_EXTRA_VALUE_LENGTH = 500;

let flushing = false;
let remoteReportingDisabled = false;

function limitText(value, maxLength) {
  return String(value || '').slice(0, maxLength);
}

function serializeExtraValue(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'boolean' || typeof value === 'number') return value;
  if (typeof value === 'string') return limitText(value, MAX_EXTRA_VALUE_LENGTH);
  try {
    return limitText(JSON.stringify(value), MAX_EXTRA_VALUE_LENGTH);
  } catch {
    return limitText(value, MAX_EXTRA_VALUE_LENGTH);
  }
}

function serializeExtra(extra) {
  if (!extra || typeof extra !== 'object' || Array.isArray(extra)) return {};
  return Object.fromEntries(
    Object.entries(extra)
      .slice(0, MAX_EXTRA_KEYS)
      .map(([key, value]) => [limitText(key, MAX_EXTRA_KEY_LENGTH), serializeExtraValue(value)])
  );
}

function serializeError(error) {
  if (!error) return { name: '', message: '', stack: '' };
  return {
    name: limitText(error.name, MAX_ERROR_NAME_LENGTH),
    message: limitText(error.message || error, MAX_ERROR_MESSAGE_LENGTH),
    stack: limitText(error.stack, MAX_ERROR_STACK_LENGTH),
  };
}

function readQueue() {
  try {
    const raw = localStorage.getItem(ERROR_QUEUE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.slice(-MAX_QUEUE_LENGTH) : [];
  } catch {
    return [];
  }
}

function writeQueue(queue) {
  try {
    localStorage.setItem(ERROR_QUEUE_KEY, JSON.stringify(queue.slice(-MAX_QUEUE_LENGTH)));
  } catch {
    // Storage can be unavailable in private mode; reporting should stay non-blocking.
  }
}

async function getReportingContext() {
  const { initFirebase, ensureAnonymousAuth, getDb, getAuthInstance } =
    await import('./firebase.js');
  const firebase = initFirebase();
  if (!firebase?.configured) return { db: null, user: null };
  const auth = getAuthInstance();
  const user = auth?.currentUser || (await ensureAnonymousAuth());
  return { db: getDb(), user };
}

export function logClientError(source, error, extra = {}) {
  const entry = {
    source: limitText(source, MAX_SOURCE_LENGTH),
    error: serializeError(error),
    extra: serializeExtra(extra),
    path: limitText(`${location.pathname}${location.search}${location.hash}`, MAX_PATH_LENGTH),
    userAgent: limitText(navigator.userAgent, MAX_USER_AGENT_LENGTH),
    createdAt: new Date().toISOString(),
  };
  const queue = readQueue();
  queue.push(entry);
  writeQueue(queue);
  flushClientErrors();
}

export async function flushClientErrors() {
  if (flushing || remoteReportingDisabled) return;
  flushing = true;
  try {
    const { db, user } = await getReportingContext();
    if (!db || !user || !readQueue().length) return;
    const { collection, addDoc, serverTimestamp } = await importFirestore();
    for (let sent = 0; sent < MAX_QUEUE_LENGTH; sent += 1) {
      const entry = readQueue()[0];
      if (!entry) break;
      await addDoc(collection(db, 'errors'), {
        ...entry,
        authorId: user.uid,
        receivedAt: serverTimestamp(),
      });
      // Re-read after the network write: another error may have joined the
      // queue while this report was in flight. Remove only the delivered one.
      const current = readQueue();
      const index = current.findIndex(
        (candidate) => JSON.stringify(candidate) === JSON.stringify(entry)
      );
      if (index >= 0) current.splice(index, 1);
      writeQueue(current);
    }
  } catch (err) {
    if (err?.code === 'permission-denied') {
      remoteReportingDisabled = true;
      console.info('[error-reporting] Reports retained locally; retry after reconnecting.');
      return;
    }
    console.warn('[error-reporting] remote flush failed:', err);
  } finally {
    flushing = false;
  }
}

export function initErrorReporting() {
  if (document.documentElement.dataset.errorReportingWired === '1') return;
  document.documentElement.dataset.errorReportingWired = '1';
  window.addEventListener('online', () => {
    remoteReportingDisabled = false;
    void flushClientErrors();
  });
  window.addEventListener('error', (event) => {
    logClientError('window.error', event.error || new Error(event.message), {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });
  window.addEventListener('unhandledrejection', (event) => {
    logClientError(
      'window.unhandledrejection',
      event.reason || new Error('Unhandled promise rejection')
    );
  });
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(() => flushClientErrors(), { timeout: 3000 });
  } else {
    setTimeout(() => flushClientErrors(), 0);
  }
}
