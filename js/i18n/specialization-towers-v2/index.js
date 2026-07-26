import { resolveRuntimeLocale } from '../../locale-format.js';
import SPECIALIZATION_TOWERS_V2_EN from './en.js';

const LOADERS = Object.freeze({
  ar: () => import('./ar.js'),
  de: () => import('./de.js'),
  es: () => import('./es.js'),
  fr: () => import('./fr.js'),
  id: () => import('./id.js'),
  it: () => import('./it.js'),
  kr: () => import('./kr.js'),
  pt: () => import('./pt.js'),
  ru: () => import('./ru.js'),
  tr: () => import('./tr.js'),
  zh: () => import('./zh.js'),
});

const packs = new Map([['en', SPECIALIZATION_TOWERS_V2_EN]]);
const inFlight = new Map();
let activeLocale = 'en';
let requestedLocale = 'en';

export const SPECIALIZATION_TOWERS_V2_LOCALES = Object.freeze(['en', ...Object.keys(LOADERS)]);
export const SPECIALIZATION_TOWERS_V2_KEYS = Object.freeze(
  Object.keys(SPECIALIZATION_TOWERS_V2_EN)
);
export const SPECIALIZATION_TOWERS_V2_CONTEXT_KEYS = Object.freeze({
  general: 'contextGeneral',
  baseAttributes: 'contextBaseAttributes',
  skill: 'contextSkill',
  nonSiege: 'contextNonSiege',
  siege: 'contextSiege',
  siegeAttacks: 'contextSiegeAttacks',
  siegeDefense: 'contextSiegeDefense',
  roc: 'contextRoc',
  battlefield: 'contextBattlefield',
  rallyJoin: 'contextRallyJoin',
  initiatingRally: 'contextInitiatingRally',
  reinforcingAllies: 'contextReinforcingAllies',
});
export const SPECIALIZATION_TOWERS_V2_ROW_SCOPE_KEYS = Object.freeze({
  all: 'rowAll',
  front: 'rowFront',
  mid: 'rowMid',
  back: 'rowBack',
});
export { SPECIALIZATION_TOWERS_V2_EN };

export function resolveSpecializationTowersV2Locale(locale) {
  const normalized = resolveRuntimeLocale(locale);
  return SPECIALIZATION_TOWERS_V2_LOCALES.includes(normalized) ? normalized : 'en';
}

export function getSpecializationTowersV2Direction(locale = activeLocale) {
  return resolveSpecializationTowersV2Locale(locale) === 'ar' ? 'rtl' : 'ltr';
}

export function interpolateSpecializationTowersV2(template, variables = {}) {
  return String(template ?? '').replace(/\{([A-Za-z0-9_]+)\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(variables, key) ? String(variables[key]) : match
  );
}

function normalizePack(value) {
  if (!value || typeof value !== 'object') return SPECIALIZATION_TOWERS_V2_EN;
  return Object.freeze({ ...value });
}

export async function loadSpecializationTowersV2Locale(locale) {
  const normalized = resolveSpecializationTowersV2Locale(locale);
  requestedLocale = normalized;

  if (!packs.has(normalized) && normalized !== 'en') {
    if (!inFlight.has(normalized)) {
      inFlight.set(
        normalized,
        LOADERS[normalized]()
          .then((module) => {
            const pack = normalizePack(module.default);
            packs.set(normalized, pack);
            return pack;
          })
          .catch((error) => {
            console.warn(
              `[specialization-towers-v2-i18n] Failed to load ${normalized}; using English.`,
              error
            );
            return SPECIALIZATION_TOWERS_V2_EN;
          })
          .finally(() => inFlight.delete(normalized))
      );
    }
    await inFlight.get(normalized);
  }

  if (requestedLocale === normalized) {
    activeLocale = packs.has(normalized) ? normalized : 'en';
  }
  return packs.get(normalized) || SPECIALIZATION_TOWERS_V2_EN;
}

export function getActiveSpecializationTowersV2Locale() {
  return activeLocale;
}

export function getSpecializationTowersV2Pack(locale = activeLocale) {
  return packs.get(resolveSpecializationTowersV2Locale(locale)) || SPECIALIZATION_TOWERS_V2_EN;
}

export function specializationTowersV2Text(key, variables = {}, locale = activeLocale) {
  const pack = getSpecializationTowersV2Pack(locale);
  const template = pack[key] ?? SPECIALIZATION_TOWERS_V2_EN[key] ?? key;
  return interpolateSpecializationTowersV2(template, variables);
}

function placeholders(value) {
  return [...String(value ?? '').matchAll(/\{([A-Za-z0-9_]+)\}/g)].map((match) => match[1]).sort();
}

export function auditSpecializationTowersV2Pack(pack) {
  const candidate = pack && typeof pack === 'object' ? pack : {};
  const englishKeys = SPECIALIZATION_TOWERS_V2_KEYS;
  const candidateKeys = Object.keys(candidate);
  const missing = englishKeys.filter((key) => !Object.hasOwn(candidate, key));
  const extra = candidateKeys.filter((key) => !Object.hasOwn(SPECIALIZATION_TOWERS_V2_EN, key));
  const blank = englishKeys.filter((key) => !String(candidate[key] ?? '').trim());
  const placeholderMismatches = englishKeys.filter(
    (key) =>
      Object.hasOwn(candidate, key) &&
      placeholders(candidate[key]).join('|') !==
        placeholders(SPECIALIZATION_TOWERS_V2_EN[key]).join('|')
  );
  return Object.freeze({
    complete:
      missing.length === 0 &&
      extra.length === 0 &&
      blank.length === 0 &&
      placeholderMismatches.length === 0,
    missing: Object.freeze(missing),
    extra: Object.freeze(extra),
    blank: Object.freeze(blank),
    placeholderMismatches: Object.freeze(placeholderMismatches),
  });
}

export function localeFromSpecializationTowersV2LanguageEvent(event) {
  return resolveSpecializationTowersV2Locale(event?.detail?.lang ?? event?.detail?.language);
}

export function bindSpecializationTowersV2LanguageChange(callback, target = globalThis.window) {
  if (typeof callback !== 'function') {
    throw new TypeError('bindSpecializationTowersV2LanguageChange requires a callback');
  }
  if (!target?.addEventListener) return () => {};

  let requestSequence = 0;
  let disposed = false;
  const listener = async (event) => {
    const sequence = ++requestSequence;
    const requested = localeFromSpecializationTowersV2LanguageEvent(event);
    const pack = await loadSpecializationTowersV2Locale(requested);
    if (disposed || sequence !== requestSequence) return;
    const locale = getActiveSpecializationTowersV2Locale();
    callback(
      Object.freeze({
        locale,
        pack,
        direction: getSpecializationTowersV2Direction(locale),
        event,
      })
    );
  };

  target.addEventListener('vts:language-change', listener);
  return () => {
    disposed = true;
    requestSequence += 1;
    target.removeEventListener?.('vts:language-change', listener);
  };
}
