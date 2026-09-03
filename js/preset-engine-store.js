export const PRESET_STORE_SCHEMA = 'roc-vts.preset-engine';
export const PRESET_STORE_SCHEMA_VERSION = 1;
export const PRESET_STORAGE_KEY = 'vts_preset_engine_v1';
export const PRESET_STORE_MAX_JSON_LENGTH = 1_000_000;
export const PRESET_STORE_MAX_PRESETS = 40;

function resolveStorage(storage) {
  if (storage !== undefined) return storage;
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

function normalizePresetRecord(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const allocation = {};
  if (value.allocation && typeof value.allocation === 'object' && !Array.isArray(value.allocation)) {
    for (const [nodeId, points] of Object.entries(value.allocation)) {
      const normalized = Number(points);
      if (
        /^[a-zA-Z0-9_-]{1,96}$/.test(nodeId) &&
        Number.isFinite(normalized) &&
        normalized >= 0 &&
        normalized <= 1000
      ) {
        allocation[nodeId] = Math.floor(normalized);
      }
    }
  }
  return {
    id: String(value.id || '').slice(0, 96),
    name: String(value.name || '').slice(0, 120),
    treeId: String(value.treeId || '').slice(0, 96),
    createdAt: Number(value.createdAt) || 0,
    allocation,
  };
}

export function normalizePresetStore(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const presets = Array.isArray(value.presets)
    ? value.presets.map(normalizePresetRecord).filter(Boolean).slice(0, PRESET_STORE_MAX_PRESETS)
    : [];
  return {
    schema: PRESET_STORE_SCHEMA,
    schemaVersion: PRESET_STORE_SCHEMA_VERSION,
    savedAt: Number(value.savedAt) || Date.now(),
    presets,
  };
}

export function createEmptyPresetStore() {
  return Object.freeze({
    schema: PRESET_STORE_SCHEMA,
    schemaVersion: PRESET_STORE_SCHEMA_VERSION,
    savedAt: 0,
    presets: [],
  });
}

export function parsePresetStore(jsonText) {
  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new TypeError('Preset store is not valid JSON.');
  }
  const normalized = normalizePresetStore(parsed);
  if (!normalized) throw new TypeError('Preset store has an unsupported shape.');
  return normalized;
}

export function serializePresetStore(state, space = 0) {
  return JSON.stringify(normalizePresetStore(state), null, space);
}

export function loadPresetStore(storage) {
  const target = resolveStorage(storage);
  if (!target || typeof target.getItem !== 'function') return createEmptyPresetStore();
  let saved;
  try {
    saved = target.getItem(PRESET_STORAGE_KEY);
  } catch {
    return createEmptyPresetStore();
  }
  if (typeof saved !== 'string' || saved.trim() === '') return createEmptyPresetStore();
  if (saved.length > PRESET_STORE_MAX_JSON_LENGTH) return createEmptyPresetStore();
  try {
    return parsePresetStore(saved);
  } catch (error) {
    if (typeof console !== 'undefined') console.warn('[preset-engine] Discarded invalid state.', error);
    return createEmptyPresetStore();
  }
}

export function savePresetStore(state, storage) {
  const normalized = normalizePresetStore(state);
  if (!normalized) return false;
  const serialized = serializePresetStore(normalized);
  if (serialized.length > PRESET_STORE_MAX_JSON_LENGTH) return false;
  const target = resolveStorage(storage);
  if (!target || typeof target.setItem !== 'function') return false;
  try {
    target.setItem(PRESET_STORAGE_KEY, serialized);
    try {
      globalThis.dispatchEvent?.(
        new CustomEvent('vts:account-sync-request', { detail: { featureId: 'preset-engine' } })
      );
    } catch {
      // Event dispatch is best-effort; storage persistence already succeeded.
    }
    return true;
  } catch {
    return false;
  }
}

export function upsertPreset(state, record) {
  const normalized = normalizePresetRecord(record);
  if (!normalized) return state;
  const id = normalized.id || `preset-${Date.now().toString(36)}`;
  const next = {
    ...normalized,
    id,
    createdAt: normalized.createdAt || Date.now(),
  };
  const existing = state.presets.findIndex((preset) => preset.id === id);
  const presets = [...state.presets];
  if (existing >= 0) presets[existing] = next;
  else presets.push(next);
  return {
    schema: state.schema,
    schemaVersion: state.schemaVersion,
    savedAt: Date.now(),
    presets: presets.slice(0, PRESET_STORE_MAX_PRESETS),
  };
}

export function removePreset(state, id) {
  return {
    schema: state.schema,
    schemaVersion: state.schemaVersion,
    savedAt: Date.now(),
    presets: state.presets.filter((preset) => preset.id !== id),
  };
}
