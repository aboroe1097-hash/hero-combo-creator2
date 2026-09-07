import { normalizeEquipmentLoadout } from './battle-simulator-equipment.js';
import { normalizeEquipmentEffectOverrides } from './battle-simulator-equipment-overrides.js';

export const BATTLE_PROFILE_OVERRIDE_STORAGE_KEY = 'vts_battle_simulator_profile_override_v1';
export const BATTLE_PROFILE_OVERRIDE_SCHEMA_VERSION = 1;

const MAX_PROFILE_JSON_BYTES = 128 * 1024;
const CREATE_FIELDS = new Set(['equipmentLoadout', 'equipmentEffectOverrides', 'savedAt']);
const PROFILE_FIELDS = new Set([
  'schemaVersion',
  'savedAt',
  'equipmentLoadout',
  'equipmentEffectOverrides',
]);

function requirePlainObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object.`);
  }
  return value;
}

function rejectUnknownFields(value, allowed, label) {
  const unknown = Object.keys(value).filter((key) => !allowed.has(key));
  if (unknown.length > 0) {
    throw new RangeError(`${label} has unsupported field "${unknown[0]}".`);
  }
}

function normalizeSavedAt(value) {
  if (typeof value !== 'string') {
    throw new TypeError('Battle profile savedAt must be a string.');
  }
  let canonical;
  try {
    canonical = new Date(value).toISOString();
  } catch {
    throw new RangeError('Battle profile savedAt must be a valid canonical ISO timestamp.');
  }
  if (canonical !== value) {
    throw new RangeError('Battle profile savedAt must be a valid canonical ISO timestamp.');
  }
  return canonical;
}

function cloneValue(value) {
  if (Array.isArray(value)) return value.map(cloneValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, cloneValue(child)])
    );
  }
  return value;
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function normalizeEquipment(rawLoadout, rawOverrides) {
  const equipmentLoadout = normalizeEquipmentLoadout(rawLoadout);
  const equipmentEffectOverrides = normalizeEquipmentEffectOverrides(rawOverrides);
  if (equipmentEffectOverrides.diagnostics.length > 0) {
    const first = equipmentEffectOverrides.diagnostics[0];
    throw new RangeError(`Invalid equipment effect overrides: ${first.message}`);
  }
  return { equipmentLoadout, equipmentEffectOverrides };
}

function freezeProfile({ savedAt, equipmentLoadout, equipmentEffectOverrides }) {
  return deepFreeze(
    cloneValue({
      schemaVersion: BATTLE_PROFILE_OVERRIDE_SCHEMA_VERSION,
      savedAt,
      equipmentLoadout,
      equipmentEffectOverrides,
    })
  );
}

function normalizeProfileRecord(rawProfile) {
  const profile = requirePlainObject(rawProfile, 'Battle profile override');
  rejectUnknownFields(profile, PROFILE_FIELDS, 'Battle profile override');
  if (profile.schemaVersion !== BATTLE_PROFILE_OVERRIDE_SCHEMA_VERSION) {
    throw new RangeError(
      `Unsupported battle profile override schema version "${String(profile.schemaVersion)}".`
    );
  }
  const equipment = normalizeEquipment(profile.equipmentLoadout, profile.equipmentEffectOverrides);
  return freezeProfile({
    savedAt: normalizeSavedAt(profile.savedAt),
    ...equipment,
  });
}

function resolveStorage(storage) {
  if (storage !== undefined) return storage;
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

function unavailableStorageError(operation) {
  return new Error(`Battle profile override storage is unavailable for ${operation}.`);
}

export function createBattleProfileOverride(options = {}) {
  const source = requirePlainObject(options, 'Battle profile override options');
  rejectUnknownFields(source, CREATE_FIELDS, 'Battle profile override options');
  const equipment = normalizeEquipment(source.equipmentLoadout, source.equipmentEffectOverrides);
  return freezeProfile({
    savedAt: normalizeSavedAt(source.savedAt ?? new Date().toISOString()),
    ...equipment,
  });
}

export function parseBattleProfileOverride(text) {
  if (text === null) return null;
  if (typeof text !== 'string') {
    throw new TypeError('Battle profile override JSON must be provided as text.');
  }
  if (text.trim() === '') return null;
  if (new TextEncoder().encode(text).byteLength > MAX_PROFILE_JSON_BYTES) {
    throw new RangeError(
      `Battle profile override JSON cannot exceed ${MAX_PROFILE_JSON_BYTES} bytes.`
    );
  }
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new TypeError(`Battle profile override JSON is invalid: ${error.message}`);
  }
  return normalizeProfileRecord(parsed);
}

export function readBattleProfileOverride(storage) {
  const target = resolveStorage(storage);
  if (!target || typeof target.getItem !== 'function') {
    return { profile: null, error: unavailableStorageError('reading') };
  }
  let saved;
  try {
    saved = target.getItem(BATTLE_PROFILE_OVERRIDE_STORAGE_KEY);
  } catch (error) {
    return {
      profile: null,
      error: error instanceof Error ? error : unavailableStorageError('reading'),
    };
  }
  try {
    return {
      profile: saved === null || saved === undefined ? null : parseBattleProfileOverride(saved),
      error: null,
    };
  } catch (error) {
    return {
      profile: null,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

export function writeBattleProfileOverride(profile, storage) {
  const normalized = normalizeProfileRecord(profile);
  const target = resolveStorage(storage);
  if (!target || typeof target.setItem !== 'function') {
    throw unavailableStorageError('writing');
  }
  target.setItem(BATTLE_PROFILE_OVERRIDE_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export function hasSavedEquipmentProfile(profile) {
  let normalized;
  try {
    normalized = normalizeProfileRecord(profile);
  } catch {
    return false;
  }
  return Boolean(
    normalized.equipmentLoadout.setId ||
    normalized.equipmentLoadout.pieces.length > 0 ||
    normalized.equipmentEffectOverrides.overrides.length > 0
  );
}
