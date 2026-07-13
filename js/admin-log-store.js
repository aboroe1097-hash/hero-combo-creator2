const LOG_STORAGE_KEY = 'vts_ocr_log';
const LOG_OUTBOX_KEY = 'vts_admin_log_outbox_v1';
const LOG_VIEW_CUTOFF_KEY = 'vts_admin_log_view_cutoff_v1';

export const ADMIN_LOG_LOCAL_LIMIT = 500;
export const ADMIN_LOG_OUTBOX_LIMIT = 200;
export const ADMIN_LOG_REMOTE_LIMIT = 200;
export const ADMIN_LOG_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
export const ADMIN_LOG_STORAGE_KEY = LOG_STORAGE_KEY;
export const ADMIN_LOG_SEVERITIES = Object.freeze(['info', 'warn', 'error', 'success']);
export const ADMIN_LOG_SOURCES = Object.freeze([
  'system',
  'dashboard',
  'ocr',
  'roster',
  'cloud',
  'sync',
  'import',
  'export',
]);

const SEVERITY_SET = new Set(ADMIN_LOG_SEVERITIES);
const SOURCE_SET = new Set(ADMIN_LOG_SOURCES);
const MAX_MESSAGE_LENGTH = 2000;
const MAX_FILE_LENGTH = 160;
const MAX_MESSAGE_KEY_LENGTH = 120;
const MAX_PARAM_COUNT = 12;
const MAX_PARAM_LENGTH = 220;
const PERSIST_DELAY_MS = 40;

function safeStorage() {
  try {
    return globalThis.localStorage || null;
  } catch {
    return null;
  }
}

function safeCryptoId() {
  try {
    return globalThis.crypto?.randomUUID?.().replace(/-/g, '').slice(0, 16) || '';
  } catch {
    return '';
  }
}

function stableHash(value) {
  let hash = 2166136261;
  for (const char of String(value || '')) {
    hash ^= char.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function boundedText(value, maxLength) {
  const text = String(value ?? '');
  if (text.length <= maxLength) return text;
  if (maxLength <= 3) return '.'.repeat(Math.max(0, maxLength));
  return `${text.slice(0, maxLength - 3)}...`;
}

export function redactAdminLogText(value, maxLength = MAX_MESSAGE_LENGTH) {
  let text = String(value ?? '');
  text = text.replace(/\bBearer\s+[^\s,;]+/gi, 'Bearer [redacted]');
  text = text.replace(/\bAIza[A-Za-z0-9_-]{20,}\b/g, '[redacted]');
  text = text.replace(
    /\beyJ[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g,
    '[redacted]'
  );
  text = text.replace(
    /\b(api[_ -]?key|token|password|secret|credential)\s*[:=]\s*[^\s,;]+/gi,
    '$1=[redacted]'
  );
  text = text.replace(/([?&](?:token|key|api_key|password|secret)=)[^&#\s]+/gi, '$1[redacted]');
  text = text.replace(/(\bSnippet:\s*)[\s\S]*/i, '$1[redacted]');
  text = text.replace(/\n\s*at\s+[\s\S]*/i, '\n[stack redacted]');
  return boundedText(text, maxLength);
}

function sanitizeFileName(value) {
  const basename = String(value ?? '')
    .split(/[\\/]/)
    .filter(Boolean)
    .pop();
  return redactAdminLogText(basename || '', MAX_FILE_LENGTH);
}

export function normalizeAdminLogSeverity(value) {
  const normalized = value === 'err' ? 'error' : String(value || 'info').toLowerCase();
  return SEVERITY_SET.has(normalized) ? normalized : 'info';
}

export function normalizeAdminLogSource(value) {
  const normalized = String(value || 'system').toLowerCase();
  return SOURCE_SET.has(normalized) ? normalized : 'system';
}

function normalizeParams(value) {
  let source = value;
  if (typeof source === 'string') {
    try {
      source = JSON.parse(source);
    } catch {
      source = {};
    }
  }
  if (!source || typeof source !== 'object' || Array.isArray(source)) return {};
  const params = {};
  Object.entries(source)
    .slice(0, MAX_PARAM_COUNT)
    .forEach(([key, item]) => {
      const safeKey = String(key || '')
        .replace(/[^A-Za-z0-9_]/g, '')
        .slice(0, 60);
      if (!safeKey) return;
      if (typeof item === 'number' && Number.isFinite(item)) params[safeKey] = item;
      else if (typeof item === 'boolean' || item === null) params[safeKey] = item;
      else params[safeKey] = redactAdminLogText(item, MAX_PARAM_LENGTH);
    });
  return params;
}

export function serializeAdminLogParams(value) {
  return boundedText(JSON.stringify(normalizeParams(value)), 1500);
}

function timestampMillis(value) {
  if (Number.isFinite(Number(value))) return Number(value);
  if (value && typeof value.toMillis === 'function') {
    const millis = Number(value.toMillis());
    return Number.isFinite(millis) ? millis : 0;
  }
  if (value instanceof Date) return value.getTime();
  return 0;
}

function sanitizeId(value) {
  return String(value || '')
    .replace(/[^A-Za-z0-9_-]/g, '')
    .slice(0, 160);
}

function sanitizeSessionId(value) {
  return (
    sanitizeId(value).slice(0, 80) ||
    `session_${Date.now().toString(36)}_${safeCryptoId() || 'local'}`
  );
}

export function createAdminLogEventId({ clientCreatedAtMs, sessionId, sequence }) {
  const millis = Math.max(1, Math.trunc(Number(clientCreatedAtMs) || Date.now()));
  const safeSession = sanitizeSessionId(sessionId);
  const safeSequence = Math.max(0, Math.trunc(Number(sequence) || 0));
  return `${millis.toString(36)}_${safeSession}_${safeSequence.toString(36)}`.slice(0, 160);
}

function legacyEventId(entry, index) {
  return `legacy_${stableHash(
    [entry?.time, entry?.msg, entry?.message, entry?.type, entry?.file, index].join('|')
  )}`;
}

export function normalizeAdminLogEntry(entry = {}, options = {}) {
  const legacy = !sanitizeId(entry.id);
  const nowMs = Math.max(1, Math.trunc(Number(options.nowMs) || Date.now()));
  const sequence = Math.max(0, Math.trunc(Number(entry.sequence ?? options.sequence) || 0));
  const sessionId = sanitizeSessionId(entry.sessionId || options.sessionId);
  const createdAtMs = timestampMillis(entry.createdAtMs || entry.createdAt);
  const clientCreatedAtMs = Math.max(
    1,
    Math.trunc(
      Number(entry.clientCreatedAtMs) ||
        createdAtMs ||
        (legacy ? Math.max(1, Number(options.legacyIndex || 0) + 1) : nowMs)
    )
  );
  const fallback = redactAdminLogText(entry.fallback ?? entry.msg ?? entry.message ?? '');
  const id = legacy
    ? legacyEventId(entry, options.legacyIndex || 0)
    : sanitizeId(entry.id) || createAdminLogEventId({ clientCreatedAtMs, sessionId, sequence });

  return {
    id,
    severity: normalizeAdminLogSeverity(entry.severity ?? entry.type),
    source: normalizeAdminLogSource(entry.source),
    messageKey: boundedText(entry.messageKey || '', MAX_MESSAGE_KEY_LENGTH),
    params: normalizeParams(entry.params),
    fallback,
    file: sanitizeFileName(entry.file),
    clientCreatedAtMs,
    createdAtMs,
    sessionId,
    sequence,
    legacyTime: boundedText(entry.legacyTime ?? entry.time ?? '', 40),
    localOnly: Boolean(entry.localOnly) || legacy,
    createdBy: boundedText(entry.createdBy || '', 128),
  };
}

export function adminLogEntryTime(entry) {
  return Math.max(0, Number(entry?.createdAtMs) || Number(entry?.clientCreatedAtMs) || 0);
}

export function sortAdminLogEntries(entries) {
  return [...(Array.isArray(entries) ? entries : [])].sort(
    (a, b) =>
      adminLogEntryTime(b) - adminLogEntryTime(a) ||
      Number(b?.sequence || 0) - Number(a?.sequence || 0) ||
      String(b?.id || '').localeCompare(String(a?.id || ''))
  );
}

export function formatAdminLogMessage(entry, translate = null) {
  if (entry?.messageKey && typeof translate === 'function') {
    try {
      const translated = translate(entry.messageKey, entry.params || {});
      if (translated && translated !== entry.messageKey) return String(translated);
    } catch {
      // A missing or malformed translation falls back to the safe stored text.
    }
  }
  return String(entry?.fallback || entry?.messageKey || '');
}

function readJson(storage, key, fallback) {
  try {
    const parsed = JSON.parse(storage?.getItem?.(key) || 'null');
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function writeJson(storage, key, value) {
  try {
    storage?.setItem?.(key, JSON.stringify(value));
  } catch {
    // Storage can be unavailable or full; in-memory logging remains functional.
  }
}

export function createAdminLogStore(options = {}) {
  const storage = options.storage === undefined ? safeStorage() : options.storage;
  const now = typeof options.now === 'function' ? options.now : () => Date.now();
  const schedule =
    typeof options.schedule === 'function'
      ? options.schedule
      : (callback) => globalThis.setTimeout(callback, PERSIST_DELAY_MS);
  const cancelSchedule =
    typeof options.cancelSchedule === 'function'
      ? options.cancelSchedule
      : (handle) => globalThis.clearTimeout(handle);
  const sessionId = sanitizeSessionId(options.sessionId || safeCryptoId());
  const listeners = new Set();
  let sequence = 0;
  let loaded = false;
  let entries = [];
  let outbox = [];
  let viewCutoffMs = 0;
  let persistHandle = null;

  function notify(change) {
    listeners.forEach((listener) => {
      try {
        listener(change);
      } catch {
        // A UI subscriber must not break the logging pipeline.
      }
    });
  }

  function trimEntries() {
    const pendingIds = new Set(outbox.map((entry) => entry.id));
    const sorted = sortAdminLogEntries(entries);
    const pending = sorted.filter((entry) => pendingIds.has(entry.id));
    const remaining = sorted.filter((entry) => !pendingIds.has(entry.id));
    entries = [...pending, ...remaining]
      .filter((entry, index, list) => list.findIndex((item) => item.id === entry.id) === index)
      .slice(0, ADMIN_LOG_LOCAL_LIMIT);
  }

  function flush() {
    if (persistHandle !== null) {
      cancelSchedule(persistHandle);
      persistHandle = null;
    }
    writeJson(storage, LOG_STORAGE_KEY, entries);
    writeJson(storage, LOG_OUTBOX_KEY, outbox);
    try {
      if (viewCutoffMs > 0) storage?.setItem?.(LOG_VIEW_CUTOFF_KEY, String(viewCutoffMs));
      else storage?.removeItem?.(LOG_VIEW_CUTOFF_KEY);
    } catch {
      // View state can remain in memory when storage is unavailable.
    }
  }

  function schedulePersist() {
    if (persistHandle !== null) return;
    persistHandle = schedule(() => {
      persistHandle = null;
      flush();
    });
  }

  function restore() {
    if (loaded) return list({ includeCleared: true, limit: ADMIN_LOG_LOCAL_LIMIT });
    loaded = true;
    const rawEntries = readJson(storage, LOG_STORAGE_KEY, []);
    const rawOutbox = readJson(storage, LOG_OUTBOX_KEY, []);
    entries = (Array.isArray(rawEntries) ? rawEntries : []).map((entry, index) =>
      normalizeAdminLogEntry(entry, { legacyIndex: index, nowMs: now(), sessionId })
    );
    outbox = (Array.isArray(rawOutbox) ? rawOutbox : [])
      .filter((entry) => entry?.id)
      .map((entry) => normalizeAdminLogEntry(entry, { nowMs: now(), sessionId }))
      .filter((entry) => !entry.localOnly)
      .slice(-ADMIN_LOG_OUTBOX_LIMIT);
    const merged = new Map(entries.map((entry) => [entry.id, entry]));
    outbox.forEach((entry) => merged.set(entry.id, entry));
    entries = [...merged.values()];
    viewCutoffMs = Math.max(0, Number(storage?.getItem?.(LOG_VIEW_CUTOFF_KEY)) || 0);
    trimEntries();
    notify({ type: 'restore' });
    return list({ includeCleared: true, limit: ADMIN_LOG_LOCAL_LIMIT });
  }

  function ensureLoaded() {
    if (!loaded) restore();
  }

  function record(input = {}) {
    ensureLoaded();
    sequence += 1;
    const clientCreatedAtMs = Math.max(1, Math.trunc(Number(input.clientCreatedAtMs) || now()));
    const entry = normalizeAdminLogEntry(
      {
        ...input,
        id:
          input.id ||
          createAdminLogEventId({
            clientCreatedAtMs,
            sessionId,
            sequence: input.sequence ?? sequence,
          }),
        clientCreatedAtMs,
        sessionId: input.sessionId || sessionId,
        sequence: input.sequence ?? sequence,
      },
      { nowMs: clientCreatedAtMs, sessionId, sequence }
    );
    const existingIndex = entries.findIndex((candidate) => candidate.id === entry.id);
    if (existingIndex >= 0) entries[existingIndex] = { ...entries[existingIndex], ...entry };
    else entries.push(entry);
    if (!entry.localOnly) {
      const pendingIndex = outbox.findIndex((candidate) => candidate.id === entry.id);
      if (pendingIndex >= 0) outbox[pendingIndex] = entry;
      else outbox.push(entry);
      if (outbox.length > ADMIN_LOG_OUTBOX_LIMIT) {
        outbox.splice(0, outbox.length - ADMIN_LOG_OUTBOX_LIMIT);
      }
    }
    trimEntries();
    schedulePersist();
    notify({ type: 'record', entry });
    return entry;
  }

  function ingestRemote(remoteEntries = []) {
    ensureLoaded();
    const remoteIds = new Set();
    const merged = new Map(entries.map((entry) => [entry.id, entry]));
    (Array.isArray(remoteEntries) ? remoteEntries : []).forEach((rawEntry, index) => {
      if (!rawEntry?.id) return;
      const entry = normalizeAdminLogEntry(
        { ...rawEntry, localOnly: false },
        { legacyIndex: index, nowMs: now(), sessionId }
      );
      remoteIds.add(entry.id);
      merged.set(entry.id, { ...(merged.get(entry.id) || {}), ...entry, localOnly: false });
    });
    entries = [...merged.values()];
    outbox = outbox.filter((entry) => !remoteIds.has(entry.id));
    trimEntries();
    schedulePersist();
    notify({ type: 'remote', ids: [...remoteIds] });
    return list({ limit: ADMIN_LOG_REMOTE_LIMIT });
  }

  function markSynced(ids = []) {
    ensureLoaded();
    const synced = new Set(ids);
    if (!synced.size) return;
    outbox = outbox.filter((entry) => !synced.has(entry.id));
    schedulePersist();
    notify({ type: 'synced', ids: [...synced] });
  }

  function list(filter = {}) {
    ensureLoaded();
    const query = String(filter.query || '')
      .trim()
      .toLowerCase();
    const severity = String(filter.severity || 'all');
    const limit = Math.max(0, Number(filter.limit) || ADMIN_LOG_REMOTE_LIMIT);
    return sortAdminLogEntries(entries)
      .filter((entry) => filter.includeCleared || adminLogEntryTime(entry) > viewCutoffMs)
      .filter((entry) => severity === 'all' || entry.severity === severity)
      .filter((entry) => {
        if (!query) return true;
        return [
          entry.fallback,
          entry.messageKey,
          entry.file,
          entry.source,
          entry.severity,
          JSON.stringify(entry.params || {}),
        ]
          .join(' ')
          .toLowerCase()
          .includes(query);
      })
      .slice(0, limit);
  }

  function getOutbox() {
    ensureLoaded();
    return outbox.map((entry) => ({ ...entry, params: { ...(entry.params || {}) } }));
  }

  function clearView(cutoffMs = now()) {
    ensureLoaded();
    viewCutoffMs = Math.max(1, Math.trunc(Number(cutoffMs) || now()));
    flush();
    notify({ type: 'clear-view', cutoffMs: viewCutoffMs });
    return viewCutoffMs;
  }

  function resetView() {
    ensureLoaded();
    viewCutoffMs = 0;
    flush();
    notify({ type: 'reset-view' });
  }

  function subscribe(listener) {
    if (typeof listener !== 'function') return () => {};
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  return {
    restore,
    record,
    ingestRemote,
    markSynced,
    list,
    getOutbox,
    clearView,
    resetView,
    getViewCutoff: () => viewCutoffMs,
    subscribe,
    flush,
  };
}

export const defaultAdminLogStore = createAdminLogStore();

export const restoreAdminLogStore = () => defaultAdminLogStore.restore();
export const recordAdminLogEntry = (entry) => defaultAdminLogStore.record(entry);
export const ingestRemoteAdminLogEntries = (entries) => defaultAdminLogStore.ingestRemote(entries);
export const markAdminLogEntriesSynced = (ids) => defaultAdminLogStore.markSynced(ids);
export const listAdminLogEntries = (filter) => defaultAdminLogStore.list(filter);
export const getAdminLogOutbox = () => defaultAdminLogStore.getOutbox();
export const clearAdminLogView = (cutoffMs) => defaultAdminLogStore.clearView(cutoffMs);
export const resetAdminLogView = () => defaultAdminLogStore.resetView();
export const getAdminLogViewCutoff = () => defaultAdminLogStore.getViewCutoff();
export const subscribeAdminLogStore = (listener) => defaultAdminLogStore.subscribe(listener);
export const flushAdminLogPersistence = () => defaultAdminLogStore.flush();
