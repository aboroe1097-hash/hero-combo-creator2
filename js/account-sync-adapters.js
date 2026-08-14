import { registerAccountSyncAdapter } from './account-sync.js';
import { GENERATOR_SELECTION_STORAGE_KEY, GENERATOR_SKIN_OWNERSHIP_KEY } from './constants.js';
import { SPECIALIZATION_STORAGE_KEY } from './specialization-towers-v2-store.js';
import { parseSpecializationState, serializeSpecializationState } from './specialization-towers-v2-model.js';
import { normalizeMaterialPlan } from './material-planner-model.js';
import { BATTLE_SETUP_PRESET_STORAGE_KEY, parseBattleSetupPresetStore } from './battle-simulator-preset-store.js';
import { BATTLE_PROFILE_OVERRIDE_STORAGE_KEY, parseBattleProfileOverride } from './battle-simulator-profile-store.js';

const read = (key, fallback = null) => { try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch { return fallback; } };
const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
const object = (value) => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const flatLevels = (value) => Object.fromEntries(Object.entries(object(value)).filter(([key, level]) => /^[a-z0-9_-]{1,96}:[a-z0-9_-]{1,96}$/iu.test(key) && Number.isFinite(Number(level)) && Number(level) >= 0 && Number(level) <= 1000).map(([key, level]) => [key, Math.floor(Number(level))]));

export function registerWaveOneAccountSyncAdapters() {
  registerAccountSyncAdapter({ featureId: 'research', label: 'Research progress', storageKey: 'vts_research_v1', serialize: () => flatLevels(read('vts_research_v1', {})), parse: flatLevels, apply: (value) => write('vts_research_v1', value) });
  registerAccountSyncAdapter({ featureId: 'specialization-towers', label: 'Towers progress', storageKey: SPECIALIZATION_STORAGE_KEY, serialize: () => JSON.parse(serializeSpecializationState(parseSpecializationState(localStorage.getItem(SPECIALIZATION_STORAGE_KEY) || ''))), parse: (value) => JSON.parse(serializeSpecializationState(value)), apply: (value) => localStorage.setItem(SPECIALIZATION_STORAGE_KEY, serializeSpecializationState(value)) });
  registerAccountSyncAdapter({ featureId: 'specialization-contributions', label: 'Towers contributions', storageKey: 'vts_specialization_contributions', serialize: () => object(read('vts_specialization_contributions', {})), parse: object, apply: (value) => write('vts_specialization_contributions', value) });
  registerAccountSyncAdapter({ featureId: 'battle-sim-setups', label: 'Battle simulator setups', storageKey: BATTLE_SETUP_PRESET_STORAGE_KEY, serialize: () => parseBattleSetupPresetStore(localStorage.getItem(BATTLE_SETUP_PRESET_STORAGE_KEY)), parse: (value) => parseBattleSetupPresetStore(JSON.stringify(value)), apply: (value) => localStorage.setItem(BATTLE_SETUP_PRESET_STORAGE_KEY, JSON.stringify(value)) });
  registerAccountSyncAdapter({ featureId: 'battle-sim-profile-override', label: 'Battle profile', storageKey: BATTLE_PROFILE_OVERRIDE_STORAGE_KEY, serialize: () => parseBattleProfileOverride(localStorage.getItem(BATTLE_PROFILE_OVERRIDE_STORAGE_KEY)) || {}, parse: (value) => parseBattleProfileOverride(JSON.stringify(value)) || {}, apply: (value) => write(BATTLE_PROFILE_OVERRIDE_STORAGE_KEY, value) });
  registerAccountSyncAdapter({ featureId: 'material-planner', label: 'Dragon Master plan', storageKey: 'vts_dm_material_planner_v2', serialize: () => normalizeMaterialPlan(read('vts_dm_material_planner_v2', null)), parse: normalizeMaterialPlan, apply: (value) => write('vts_dm_material_planner_v2', value) });
  registerAccountSyncAdapter({ featureId: 'generator-selection', label: 'Owned heroes', storageKey: GENERATOR_SELECTION_STORAGE_KEY, serialize: () => object(read(GENERATOR_SELECTION_STORAGE_KEY, {})), parse: object, apply: (value) => write(GENERATOR_SELECTION_STORAGE_KEY, value) });
  registerAccountSyncAdapter({ featureId: 'generator-skins', label: 'Owned hero skins', storageKey: GENERATOR_SKIN_OWNERSHIP_KEY, serialize: () => object(read(GENERATOR_SKIN_OWNERSHIP_KEY, {})), parse: object, apply: (value) => write(GENERATOR_SKIN_OWNERSHIP_KEY, value) });
}
