import { parseSetupSnapshot } from './battle-simulator-setup.js';

export const BATTLE_SETUP_PRESET_STORAGE_KEY = 'vts_battle_sim_setups';
export const MAX_BATTLE_SETUP_PRESETS = 20;

export function normalizeBattleSetupPresetName(name) {
  if (typeof name !== 'string') throw new TypeError('Preset name must be text.');
  const normalized = name.trim();
  if (normalized.length < 1 || normalized.length > 40) {
    throw new RangeError('Preset name must be between 1 and 40 characters after trimming.');
  }
  if (['__proto__', 'prototype', 'constructor'].includes(normalized.toLowerCase())) {
    throw new RangeError(`Preset name "${normalized}" is reserved. Choose another name.`);
  }
  return normalized;
}

function normalizeStoredSnapshot(snapshot, name) {
  let jsonText;
  try {
    jsonText = JSON.stringify(snapshot);
  } catch (error) {
    throw new TypeError(`Preset "${name}" could not be serialized: ${error.message}`);
  }
  if (jsonText === undefined) {
    throw new TypeError(`Preset "${name}" must contain a battle setup object.`);
  }
  try {
    return parseSetupSnapshot(jsonText);
  } catch (error) {
    throw new error.constructor(`Preset "${name}" is invalid: ${error.message}`);
  }
}

function normalizePresetStoreObject(rawStore) {
  if (!rawStore || typeof rawStore !== 'object' || Array.isArray(rawStore)) {
    throw new TypeError('Battle setup preset store must be a JSON object.');
  }

  const entries = Object.entries(rawStore);
  if (entries.length > MAX_BATTLE_SETUP_PRESETS) {
    throw new RangeError(
      `Battle setup preset store cannot contain more than ${MAX_BATTLE_SETUP_PRESETS} presets.`
    );
  }

  const normalizedEntries = [];
  const names = new Set();
  for (const [rawName, snapshot] of entries) {
    const name = normalizeBattleSetupPresetName(rawName);
    if (names.has(name)) {
      throw new RangeError(`Battle setup preset store contains duplicate name "${name}".`);
    }
    names.add(name);
    normalizedEntries.push([name, normalizeStoredSnapshot(snapshot, name)]);
  }
  return Object.fromEntries(normalizedEntries);
}

export function parseBattleSetupPresetStore(jsonText) {
  if (jsonText === null || jsonText === undefined) return {};
  if (typeof jsonText !== 'string') {
    throw new TypeError('Battle setup preset store JSON must be provided as text.');
  }
  if (jsonText.trim() === '') return {};

  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch (error) {
    throw new TypeError(`Battle setup preset store JSON is invalid: ${error.message}`);
  }
  return normalizePresetStoreObject(parsed);
}

export function upsertBattleSetupPreset(store, name, snapshot) {
  const normalizedStore = normalizePresetStoreObject(store);
  const normalizedName = normalizeBattleSetupPresetName(name);
  const exists = Object.hasOwn(normalizedStore, normalizedName);
  if (!exists && Object.keys(normalizedStore).length >= MAX_BATTLE_SETUP_PRESETS) {
    throw new RangeError(`You can save at most ${MAX_BATTLE_SETUP_PRESETS} battle setup presets.`);
  }

  return Object.fromEntries([
    ...Object.entries(normalizedStore).filter(([storedName]) => storedName !== normalizedName),
    [normalizedName, normalizeStoredSnapshot(snapshot, normalizedName)],
  ]);
}

export function deleteBattleSetupPreset(store, name) {
  const normalizedStore = normalizePresetStoreObject(store);
  const normalizedName = normalizeBattleSetupPresetName(name);
  return Object.fromEntries(
    Object.entries(normalizedStore).filter(([storedName]) => storedName !== normalizedName)
  );
}
