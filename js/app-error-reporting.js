const ERROR_QUEUE_KEY = 'vts_error_report_queue';
let flushing = false;

function serializeError(error) {
  if (!error) return {};
  return {
    name: error.name || '',
    message: error.message || String(error),
    stack: error.stack || '',
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
  try { localStorage.setItem(ERROR_QUEUE_KEY, JSON.stringify(queue.slice(-20))); } catch {}
}

export function logClientError(source, error, extra = {}) {
  const entry = {
    source,
    error: serializeError(error),
    extra,
    path: `${location.pathname}${location.search}${location.hash}`,
    userAgent: navigator.userAgent,
    createdAt: new Date().toISOString(),
  };
  const queue = readQueue();
  queue.push(entry);
  writeQueue(queue);
  flushClientErrors();
}

export async function flushClientErrors() {
  if (flushing) return;
  const { getDb } = await import('./firebase.js');
  const db = getDb();
  const queue = readQueue();
  if (!db || !queue.length) return;
  flushing = true;
  try {
    const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
    while (queue.length) {
      const entry = queue.shift();
      await addDoc(collection(db, 'errors'), { ...entry, receivedAt: serverTimestamp() });
      writeQueue(queue);
    }
  } catch (err) {
    console.warn('Error reporting failed:', err);
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
  flushClientErrors();
}
