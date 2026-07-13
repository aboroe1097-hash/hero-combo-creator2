import {
  GENERATOR_SELECTION_STORAGE_KEY,
  GENERATOR_SELECTION_VERSION,
  GENERATOR_SKIN_OWNERSHIP_KEY,
  GENERATOR_SKIN_OWNERSHIP_LEGACY_KEY,
  GENERATOR_SKIN_OWNERSHIP_VERSION,
} from '../constants.js';

export const AI_SAVED_STATE_KEYS = Object.freeze({
  selectedHeroes: GENERATOR_SELECTION_STORAGE_KEY,
  explicitSkins: GENERATOR_SKIN_OWNERSHIP_KEY,
  explicitSkinsLegacy: GENERATOR_SKIN_OWNERSHIP_LEGACY_KEY,
  dmPlan: 'vts_dm_material_planner_v2',
  researchProgress: 'vts_research_v1',
});

const MAX_SAVED_JSON_CHARACTERS = 64 * 1024;
const MAX_HERO_NAMES = 160;
const MAX_RESEARCH_ENTRIES = 2000;

function safeGetItem(storage, key) {
  try {
    const target = storage || globalThis.localStorage;
    const value = target?.getItem?.(key);
    return typeof value === 'string' ? value : null;
  } catch {
    return null;
  }
}

function parseBoundedJson(raw) {
  if (typeof raw !== 'string' || !raw || raw.length > MAX_SAVED_JSON_CHARACTERS) {
    return { ok: false, value: null };
  }
  try {
    return { ok: true, value: JSON.parse(raw) };
  } catch {
    return { ok: false, value: null };
  }
}

function normalizeNameList(value, validHeroNames) {
  if (!Array.isArray(value)) return [];
  const valid = validHeroNames instanceof Set ? validHeroNames : null;
  return [...new Set(value)]
    .filter(
      (name) =>
        typeof name === 'string' &&
        name.length > 0 &&
        name.length <= 80 &&
        (!valid || valid.has(name))
    )
    .slice(0, MAX_HERO_NAMES);
}

function runtimeHeroNames(runtimeState, validHeroNames) {
  const runtime = runtimeState || globalThis.__vtsHeroComboRuntimeState;
  const source = runtime?.generatorSelectedHeroes;
  if (!(source instanceof Set) && !Array.isArray(source)) return [];
  return normalizeNameList([...source], validHeroNames);
}

export function readSelectedHeroState({ storage, runtimeState, validHeroNames } = {}) {
  const runtimeHeroes = runtimeHeroNames(runtimeState, validHeroNames);
  const raw = safeGetItem(storage, AI_SAVED_STATE_KEYS.selectedHeroes);
  const rawExists = raw !== null;
  const parsed = rawExists ? parseBoundedJson(raw) : { ok: true, value: null };
  const storedValue =
    parsed.value?._version === GENERATOR_SELECTION_VERSION ? parsed.value.heroes : parsed.value;
  const storedHeroes = parsed.ok ? normalizeNameList(storedValue, validHeroNames) : [];
  const heroes = runtimeHeroes.length ? runtimeHeroes : storedHeroes;

  return {
    exists: runtimeHeroes.length > 0 || rawExists,
    rawExists,
    malformed: rawExists && !parsed.ok,
    source: runtimeHeroes.length ? 'runtime' : rawExists ? 'storage' : 'none',
    heroes,
  };
}

function parseOwnershipRecord(raw) {
  const parsed = parseBoundedJson(raw);
  if (
    !parsed.ok ||
    !parsed.value ||
    typeof parsed.value !== 'object' ||
    Array.isArray(parsed.value)
  ) {
    return { ok: false, ownership: {} };
  }
  const source =
    parsed.value._version === GENERATOR_SKIN_OWNERSHIP_VERSION &&
    parsed.value.heroes &&
    typeof parsed.value.heroes === 'object' &&
    !Array.isArray(parsed.value.heroes)
      ? parsed.value.heroes
      : parsed.value;
  const ownership = {};
  for (const [name, owned] of Object.entries(source).slice(0, MAX_HERO_NAMES)) {
    if (name.length <= 80 && typeof owned === 'boolean') ownership[name] = owned;
  }
  return { ok: true, ownership };
}

export function readExplicitSkinOwnershipState({ storage, validHeroNames } = {}) {
  const currentRaw = safeGetItem(storage, AI_SAVED_STATE_KEYS.explicitSkins);
  const legacyRaw = safeGetItem(storage, AI_SAVED_STATE_KEYS.explicitSkinsLegacy);
  const raw = currentRaw ?? legacyRaw;
  if (raw === null) {
    return { exists: false, malformed: false, source: 'none', ownership: {} };
  }
  const parsed = parseOwnershipRecord(raw);
  const valid = validHeroNames instanceof Set ? validHeroNames : null;
  const ownership = Object.fromEntries(
    Object.entries(parsed.ownership).filter(([name]) => !valid || valid.has(name))
  );
  return {
    exists: true,
    malformed: !parsed.ok,
    source: currentRaw !== null ? 'current' : 'legacy',
    ownership,
  };
}

export function getExplicitSkinOwnership(ownershipState, heroName) {
  const ownership = ownershipState?.ownership || {};
  if (!Object.prototype.hasOwnProperty.call(ownership, heroName)) return 'unknown';
  return ownership[heroName] ? 'owned' : 'not_owned';
}

export function readMaterialPlanState({ storage } = {}) {
  const raw = safeGetItem(storage, AI_SAVED_STATE_KEYS.dmPlan);
  if (raw === null) return { exists: false, malformed: false, value: null };
  const parsed = parseBoundedJson(raw);
  const validValue =
    parsed.ok && parsed.value && typeof parsed.value === 'object' && !Array.isArray(parsed.value);
  return {
    exists: true,
    malformed: !validValue,
    value: validValue ? parsed.value : null,
  };
}

export function readResearchProgressState({ storage } = {}) {
  const raw = safeGetItem(storage, AI_SAVED_STATE_KEYS.researchProgress);
  if (raw === null) return { exists: false, malformed: false, progress: {} };
  const parsed = parseBoundedJson(raw);
  if (
    !parsed.ok ||
    !parsed.value ||
    typeof parsed.value !== 'object' ||
    Array.isArray(parsed.value)
  ) {
    return { exists: true, malformed: true, progress: {} };
  }
  const progress = {};
  for (const [key, value] of Object.entries(parsed.value).slice(0, MAX_RESEARCH_ENTRIES)) {
    if (!/^[a-z0-9_-]{1,64}:[a-z0-9_-]{1,64}$/i.test(key)) continue;
    const level = Number(value);
    if (Number.isFinite(level) && level > 0) progress[key] = Math.floor(level);
  }
  return { exists: true, malformed: false, progress };
}

export function getAiSavedStatePresence({ storage, runtimeState } = {}) {
  return Object.freeze({
    selectedHeroes:
      runtimeHeroNames(runtimeState).length > 0 ||
      safeGetItem(storage, AI_SAVED_STATE_KEYS.selectedHeroes) !== null,
    explicitSkins:
      safeGetItem(storage, AI_SAVED_STATE_KEYS.explicitSkins) !== null ||
      safeGetItem(storage, AI_SAVED_STATE_KEYS.explicitSkinsLegacy) !== null,
    dmPlan: safeGetItem(storage, AI_SAVED_STATE_KEYS.dmPlan) !== null,
    researchProgress: safeGetItem(storage, AI_SAVED_STATE_KEYS.researchProgress) !== null,
  });
}
