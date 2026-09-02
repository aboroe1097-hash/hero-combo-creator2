import {
  PLANNER_SCHEMA,
  PLANNER_SCHEMA_VERSION,
  normalizePlannerSnapshot,
  parsePlannerSnapshot,
  serializePlannerSnapshot,
} from './research-planner-model.js';

export const PLANNER_STORAGE_KEY = 'vts_research_planner_v1';
export const PLANNER_MAX_JSON_LENGTH = 1_000_000;

function resolveStorage(storage) {
  if (storage !== undefined) return storage;
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export function createEmptyPlannerState() {
  return Object.freeze({
    schema: PLANNER_SCHEMA,
    schemaVersion: PLANNER_SCHEMA_VERSION,
    savedAt: 0,
    plans: [],
  });
}

export function loadPlannerState(storage) {
  const target = resolveStorage(storage);
  if (!target || typeof target.getItem !== 'function') return createEmptyPlannerState();
  let saved;
  try {
    saved = target.getItem(PLANNER_STORAGE_KEY);
  } catch {
    return createEmptyPlannerState();
  }
  if (typeof saved !== 'string' || saved.trim() === '') return createEmptyPlannerState();
  if (saved.length > PLANNER_MAX_JSON_LENGTH) return createEmptyPlannerState();
  try {
    return parsePlannerSnapshot(saved);
  } catch (error) {
    if (typeof console !== 'undefined') console.warn('[research-planner] Discarded invalid state.', error);
    return createEmptyPlannerState();
  }
}

export function savePlannerState(state, storage) {
  const normalized = normalizePlannerSnapshot(state);
  if (!normalized) return false;
  const serialized = serializePlannerSnapshot(normalized);
  if (serialized.length > PLANNER_MAX_JSON_LENGTH) return false;
  const target = resolveStorage(storage);
  if (!target || typeof target.setItem !== 'function') return false;
  try {
    target.setItem(PLANNER_STORAGE_KEY, serialized);
    try {
      globalThis.dispatchEvent?.(
        new CustomEvent('vts:account-sync-request', { detail: { featureId: 'research-planner' } })
      );
    } catch {
      // Event dispatch is best-effort; storage persistence already succeeded.
    }
    return true;
  } catch {
    return false;
  }
}
