export const AI_DISCLOSURE_VERSION = 1;
export const AI_DISCLOSURE_KEY = 'vts_ai_provider_disclosure_v1';
export const AI_SESSION_CONSENT_KEY = 'vts_ai_session_consent_v1';

export const AI_PERSONAL_CATEGORIES = Object.freeze([
  'selected_heroes',
  'explicit_skins',
  'dm_plan',
  'research_progress',
  'admin_dashboard',
]);

export const AI_CATEGORY_TOOL_GROUPS = Object.freeze({
  selected_heroes: 'personal:selected_heroes',
  explicit_skins: 'personal:explicit_skins',
  dm_plan: 'personal:dm_plan',
  research_progress: 'personal:research_progress',
  admin_dashboard: 'private:admin_dashboard',
});

export const AI_RAW_STATE_KEYS = Object.freeze({
  selected_heroes: ['vts_generator_selection_v1'],
  explicit_skins: ['vts_generator_owned_skins_v2', 'vts_generator_owned_skins_v1'],
  dm_plan: ['vts_dm_material_planner_v2'],
  research_progress: ['vts_research_v1'],
});

let volatileDisclosureAccepted = false;
let volatileGrants = new Set();

export function hasAcceptedProviderDisclosure(storage = globalThis.localStorage) {
  if (volatileDisclosureAccepted) return true;
  try {
    return storage?.getItem(AI_DISCLOSURE_KEY) === String(AI_DISCLOSURE_VERSION);
  } catch {
    return false;
  }
}

export function acceptProviderDisclosure(storage = globalThis.localStorage) {
  volatileDisclosureAccepted = true;
  try {
    storage?.setItem(AI_DISCLOSURE_KEY, String(AI_DISCLOSURE_VERSION));
  } catch {}
}

export function getSessionGrants(storage = globalThis.sessionStorage) {
  try {
    const parsed = JSON.parse(storage?.getItem(AI_SESSION_CONSENT_KEY) || '[]');
    if (Array.isArray(parsed)) {
      return new Set(parsed.filter((category) => AI_PERSONAL_CATEGORIES.includes(category)));
    }
  } catch {}
  return new Set(volatileGrants);
}

export function setSessionGrants(categories, storage = globalThis.sessionStorage) {
  volatileGrants = new Set(
    Array.from(categories || []).filter((category) => AI_PERSONAL_CATEGORIES.includes(category))
  );
  try {
    storage?.setItem(AI_SESSION_CONSENT_KEY, JSON.stringify(Array.from(volatileGrants)));
  } catch {}
  return new Set(volatileGrants);
}

export function clearSessionGrants(storage = globalThis.sessionStorage) {
  volatileGrants = new Set();
  try {
    storage?.removeItem(AI_SESSION_CONSENT_KEY);
  } catch {}
}

function hasLiveSelectedHeroes(runtimeState = globalThis.__vtsHeroComboRuntimeState) {
  const selected = runtimeState?.generatorSelectedHeroes;
  if (selected instanceof Set) return selected.size > 0;
  return Array.isArray(selected) && selected.length > 0;
}

export function hasRawSavedState(
  category,
  storage = globalThis.localStorage,
  runtimeState = globalThis.__vtsHeroComboRuntimeState
) {
  if (category === 'admin_dashboard') return true;
  if (category === 'selected_heroes' && hasLiveSelectedHeroes(runtimeState)) return true;
  const keys = AI_RAW_STATE_KEYS[category] || [];
  try {
    return keys.some((key) => storage?.getItem(key) !== null);
  } catch {
    return false;
  }
}

export function getAllowedToolGroups(grants = getSessionGrants()) {
  return [
    'static',
    ...Array.from(grants)
      .map((category) => AI_CATEGORY_TOOL_GROUPS[category])
      .filter(Boolean),
  ];
}
