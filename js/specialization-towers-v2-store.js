import {
  createEmptySpecializationState,
  parseSpecializationState,
  serializeSpecializationState,
} from './specialization-towers-v2-model.js';

export const SPECIALIZATION_STORAGE_KEY = 'vts_specialization_towers_v2';

function resolveStorage(storage) {
  if (storage !== undefined) return storage;
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export function loadSpecializationState(storage) {
  const target = resolveStorage(storage);
  if (!target || typeof target.getItem !== 'function') return createEmptySpecializationState();

  let saved;
  try {
    saved = target.getItem(SPECIALIZATION_STORAGE_KEY);
  } catch {
    return createEmptySpecializationState();
  }
  if (typeof saved !== 'string' || saved.trim() === '') {
    return createEmptySpecializationState();
  }

  try {
    return parseSpecializationState(saved);
  } catch {
    return createEmptySpecializationState();
  }
}

export function saveSpecializationState(state, storage) {
  const serialized = serializeSpecializationState(state);
  const target = resolveStorage(storage);
  if (!target || typeof target.setItem !== 'function') return false;
  try {
    target.setItem(SPECIALIZATION_STORAGE_KEY, serialized);
    try { globalThis.dispatchEvent?.(new CustomEvent('vts:account-sync-request', { detail: { featureId: 'specialization-towers' } })); } catch {}
    return true;
  } catch {
    return false;
  }
}

export function exportSpecializationJson(state) {
  return serializeSpecializationState(state, 2);
}

export function importSpecializationJson(jsonText) {
  return parseSpecializationState(jsonText);
}
