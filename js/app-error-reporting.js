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
    return raw ? JSON.parse(raw) : [];
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

function clearQueue() {
  try {
    localStorage.removeItem(ERROR_QUEUE_KEY);
  } catch {
    // Storage can be unavailable in private mode; reporting should stay non-blocking.
  }
}

async function getReportingContext() {
  const { initFirebase, ensureAnonymousAuth, getDb, getAuthInstance } = await import('./firebase.js');
  const firebase = initFirebase();
  if (!firebase?.configured) return { db: null, user: null };
  const auth = getAuthInstance();
  const user = auth?.currentUser || (await ensureAnonymousAuth());
  return { db: getDb(), user };
}

export function logClientError(source, error, extra = {}) {
  if (remoteReportingDisabled) return;
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
  let context;
  try {
    context = await getReportingContext();
  } catch {
    return;
  }
  const { db, user } = context;
  const queue = readQueue();
  if (!db || !user || !queue.length) return;
  flushing = true;
  try {
    const { collection, addDoc, serverTimestamp } = await importFirestore();
    while (queue.length) {
      const entry = queue.shift();
      await addDoc(collection(db, 'errors'), {
        ...entry,
        authorId: user.uid,
        receivedAt: serverTimestamp(),
      });
      writeQueue(queue);
    }
  } catch (err) {
    if (err?.code === 'permission-denied') {
      remoteReportingDisabled = true;
      clearQueue();
      console.info('[error-reporting] Firestore writes are not permitted; remote reports disabled.');
      return;
    }
    console.warn('[error-reporting] remote flush failed:', err);
    writeQueue(queue);
  } finally {
    flushing = false;
  }
}

export function initErrorReporting() {
  if (document.documentElement.dataset.errorReportingWired === '1') return;
  document.documentElement.dataset.errorReportingWired = '1';
  window.addEventListener('error', (event) => {
    logClientError('window.error', event.error || new Error(event.message), {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });
  window.addEventListener('unhandledrejection', (event) => {
    logClientError('window.unhandledrejection', event.reason || new Error('Unhandled promise rejection'));
  });
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(() => flushClientErrors(), { timeout: 3000 });
  } else {
    setTimeout(() => flushClientErrors(), 0);
  }
}
