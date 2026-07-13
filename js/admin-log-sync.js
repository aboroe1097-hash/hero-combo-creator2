import {
  ADMIN_LOG_REMOTE_LIMIT,
  ADMIN_LOG_RETENTION_MS,
  defaultAdminLogStore,
  normalizeAdminLogEntry,
  serializeAdminLogParams,
} from './admin-log-store.js';

export const ADMIN_LOG_COLLECTION_PATH = 'vts_admin/log_store/admin_log_events';

const DEFAULT_RETRY_DELAYS_MS = [1000, 3000, 10000, 30000];
const MAX_OUTBOX_DRAIN_PER_PASS = 50;

function snapshotDocuments(snapshot) {
  if (Array.isArray(snapshot?.docs)) return snapshot.docs;
  const docs = [];
  snapshot?.forEach?.((docSnapshot) => docs.push(docSnapshot));
  return docs;
}

function cloudSafeMessageKey(value) {
  const key = String(value || '');
  return /^[A-Za-z][A-Za-z0-9_.-]{0,119}$/.test(key) ? key : '';
}

function cloudSafeParams(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter(
      ([, item]) =>
        (typeof item === 'number' && Number.isFinite(item)) ||
        typeof item === 'boolean' ||
        item === null
    )
  );
}

export function serializeAdminLogForCloud(entry, options = {}) {
  const uid = String(options.uid || '').trim();
  if (!uid) throw new Error('Admin log sync requires an authenticated admin UID.');
  const serverTimestamp = options.serverTimestamp;
  const Timestamp = options.Timestamp;
  if (typeof serverTimestamp !== 'function' || typeof Timestamp?.fromMillis !== 'function') {
    throw new Error('Admin log sync requires Firestore timestamp helpers.');
  }
  const nowMs = Math.max(1, Math.trunc(Number(options.nowMs) || Date.now()));
  const normalized = normalizeAdminLogEntry(entry, { nowMs });
  const messageKey = cloudSafeMessageKey(normalized.messageKey);
  return {
    id: normalized.id,
    severity: normalized.severity,
    source: normalized.source,
    messageKey,
    params: serializeAdminLogParams(cloudSafeParams(normalized.params)),
    // Arbitrary local messages and filenames can include player handles, raw
    // OCR, or device paths. Cross-device history carries only controlled event
    // keys, primitive counters, and this generic safe fallback.
    fallback: `${normalized.source} ${normalized.severity} activity`,
    file: '',
    clientCreatedAtMs: normalized.clientCreatedAtMs,
    createdAt: serverTimestamp(),
    expiresAt: Timestamp.fromMillis(nowMs + ADMIN_LOG_RETENTION_MS),
    createdBy: uid,
    sessionId: normalized.sessionId,
    sequence: normalized.sequence,
  };
}

export function createAdminLogSync(options = {}) {
  const db = options.db;
  const firestore = options.firestore || {};
  const uid = String(options.uid || '').trim();
  const store = options.store || defaultAdminLogStore;
  const onStatus = typeof options.onStatus === 'function' ? options.onStatus : () => {};
  const now = typeof options.now === 'function' ? options.now : () => Date.now();
  const retryDelays = Array.isArray(options.retryDelays)
    ? options.retryDelays
    : DEFAULT_RETRY_DELAYS_MS;
  const setTimer =
    options.setTimer || ((callback, delay) => globalThis.setTimeout(callback, delay));
  const clearTimer = options.clearTimer || ((handle) => globalThis.clearTimeout(handle));
  const onlineTarget = options.onlineTarget || globalThis;

  const requiredFunctions = [
    'collection',
    'doc',
    'query',
    'orderBy',
    'limit',
    'onSnapshot',
    'runTransaction',
    'serverTimestamp',
  ];
  const missing = requiredFunctions.filter((name) => typeof firestore[name] !== 'function');
  if (!db || !uid || missing.length || typeof firestore.Timestamp?.fromMillis !== 'function') {
    throw new Error(
      `Admin log sync is missing ${[
        !db ? 'db' : '',
        !uid ? 'uid' : '',
        ...missing,
        typeof firestore.Timestamp?.fromMillis !== 'function' ? 'Timestamp' : '',
      ]
        .filter(Boolean)
        .join(', ')}.`
    );
  }

  const collectionRef = firestore.collection(db, ADMIN_LOG_COLLECTION_PATH);
  const recentQuery = firestore.query(
    collectionRef,
    firestore.orderBy('createdAt', 'desc'),
    firestore.limit(ADMIN_LOG_REMOTE_LIMIT)
  );
  let started = false;
  let stopped = false;
  let snapshotUnsubscribe = null;
  let storeUnsubscribe = null;
  let retryTimer = null;
  let retryAttempt = 0;
  let flushPromise = null;

  function emitStatus(status, detail = '') {
    onStatus({ status, detail: String(detail || '') });
  }

  function clearRetry() {
    if (retryTimer !== null) {
      clearTimer(retryTimer);
      retryTimer = null;
    }
  }

  function scheduleRetry() {
    if (stopped || retryTimer !== null) return;
    const delay = retryDelays[Math.min(retryAttempt, Math.max(0, retryDelays.length - 1))] || 30000;
    retryAttempt += 1;
    retryTimer = setTimer(() => {
      retryTimer = null;
      if (stopped) return;
      attachSnapshotListener();
      void flush();
    }, delay);
  }

  function handleSnapshot(snapshot) {
    const remoteEntries = snapshotDocuments(snapshot).map((docSnapshot) => ({
      ...(docSnapshot.data?.() || {}),
      id: docSnapshot.id,
    }));
    store.ingestRemote(remoteEntries);
    store.markSynced(remoteEntries.map((entry) => entry.id));
    retryAttempt = 0;
    clearRetry();
    emitStatus(snapshot?.metadata?.fromCache ? 'offline' : 'live');
  }

  function handleSnapshotError(error) {
    snapshotUnsubscribe = null;
    emitStatus('error', error?.message || error);
    scheduleRetry();
  }

  function attachSnapshotListener() {
    if (stopped) return;
    if (snapshotUnsubscribe) {
      try {
        snapshotUnsubscribe();
      } catch {
        // Listener teardown is best-effort.
      }
      snapshotUnsubscribe = null;
    }
    try {
      snapshotUnsubscribe = firestore.onSnapshot(recentQuery, handleSnapshot, handleSnapshotError);
    } catch (error) {
      handleSnapshotError(error);
    }
  }

  async function writePendingEntry(entry) {
    const ref = firestore.doc(collectionRef, entry.id);
    const payload = serializeAdminLogForCloud(entry, {
      uid,
      serverTimestamp: firestore.serverTimestamp,
      Timestamp: firestore.Timestamp,
      nowMs: now(),
    });
    await firestore.runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists()) transaction.set(ref, payload);
    });
    store.markSynced([entry.id]);
  }

  async function drainOutbox() {
    const pending = store.getOutbox().slice(0, MAX_OUTBOX_DRAIN_PER_PASS);
    if (!pending.length) return { synced: 0, remaining: 0 };
    emitStatus('syncing');
    let synced = 0;
    for (const entry of pending) {
      if (stopped) break;
      try {
        await writePendingEntry(entry);
        synced += 1;
      } catch (error) {
        const offline = onlineTarget?.navigator?.onLine === false;
        emitStatus(offline ? 'offline' : 'error', error?.message || error);
        scheduleRetry();
        return { synced, remaining: store.getOutbox().length, error };
      }
    }
    retryAttempt = 0;
    clearRetry();
    emitStatus('live');
    const remaining = store.getOutbox().length;
    if (remaining && !stopped) return drainOutbox();
    return { synced, remaining };
  }

  function flush() {
    if (stopped) return Promise.resolve({ synced: 0, remaining: store.getOutbox().length });
    if (flushPromise) return flushPromise;
    flushPromise = drainOutbox().finally(() => {
      flushPromise = null;
    });
    return flushPromise;
  }

  function handleOnline() {
    if (stopped) return;
    retryAttempt = 0;
    clearRetry();
    attachSnapshotListener();
    void flush();
  }

  function start() {
    if (started) return controller;
    started = true;
    stopped = false;
    store.restore();
    emitStatus('connecting');
    attachSnapshotListener();
    storeUnsubscribe = store.subscribe((change) => {
      if (change?.type === 'record' && !change.entry?.localOnly) void flush();
    });
    onlineTarget?.addEventListener?.('online', handleOnline);
    void flush();
    return controller;
  }

  function stop() {
    stopped = true;
    started = false;
    clearRetry();
    if (snapshotUnsubscribe) {
      try {
        snapshotUnsubscribe();
      } catch {
        // Listener teardown is best-effort.
      }
      snapshotUnsubscribe = null;
    }
    storeUnsubscribe?.();
    storeUnsubscribe = null;
    onlineTarget?.removeEventListener?.('online', handleOnline);
    store.flush();
    emitStatus('local');
  }

  const controller = { start, stop, flush };
  return controller;
}
