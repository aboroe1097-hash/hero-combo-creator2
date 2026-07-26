import { HERO_ATLAS_UI, auditHeroAtlasUi } from './ui.js';

const EMPTY_PACK = Object.freeze({ skills: Object.freeze({}), strings: Object.freeze({}) });

const loaders = {
  ar: () => import('./locales/ar.js'),
  de: () => import('./locales/de.js'),
  es: () => import('./locales/es.js'),
  fr: () => import('./locales/fr.js'),
  id: () => import('./locales/id.js'),
  it: () => import('./locales/it.js'),
  kr: () => import('./locales/kr.js'),
  pt: () => import('./locales/pt.js'),
  ru: () => import('./locales/ru.js'),
  tr: () => import('./locales/tr.js'),
  zh: () => import('./locales/zh.js'),
};

const packs = new Map([['en', EMPTY_PACK]]);
const inFlight = new Map();
let activeLocale = 'en';
let activationGeneration = 0;

export function normalizeHeroAtlasLocale(locale) {
  const primary = String(locale || 'en')
    .trim()
    .toLowerCase()
    .replaceAll('_', '-')
    .split('-')[0];
  const normalized = primary === 'ko' ? 'kr' : primary;
  return normalized === 'en' || Object.hasOwn(loaders, normalized) ? normalized : 'en';
}

function normalizePack(pack) {
  return Object.freeze({
    skills: Object.freeze({ ...(pack?.skills || {}) }),
    strings: Object.freeze({ ...(pack?.strings || {}) }),
  });
}

export function heroSkillKey(heroName, skillId) {
  return `${String(heroName || '').trim()}:${String(skillId ?? '').trim()}`;
}

export async function loadHeroAtlasLocale(locale = 'en') {
  const normalized = normalizeHeroAtlasLocale(locale);
  const requestId = ++activationGeneration;
  let pack = packs.get(normalized) || null;
  if (!pack) {
    if (!inFlight.has(normalized)) {
      inFlight.set(
        normalized,
        loaders[normalized]()
          .then((mod) => {
            const loadedPack = normalizePack(mod.default || mod[normalized]);
            packs.set(normalized, loadedPack);
            return loadedPack;
          })
          .catch((error) => {
            inFlight.delete(normalized);
            console.warn(`[hero-atlas-i18n] Failed to load ${normalized}; using English.`, error);
            return null;
          })
      );
    }
    pack = await inFlight.get(normalized);
  }
  if (requestId !== activationGeneration) return pack || EMPTY_PACK;
  activeLocale = pack ? normalized : 'en';
  return pack || EMPTY_PACK;
}

export function getActiveHeroAtlasLocale() {
  return activeLocale;
}

export function getHeroAtlasPack(locale = activeLocale) {
  return packs.get(normalizeHeroAtlasLocale(locale)) || EMPTY_PACK;
}

export function heroSkillText(heroName, skill, field, locale = activeLocale) {
  const canonical = String(skill?.[field] ?? '');
  if (normalizeHeroAtlasLocale(locale) === 'en') return canonical;
  const translated = getHeroAtlasPack(locale).skills[heroSkillKey(heroName, skill?.id)]?.[field];
  return typeof translated === 'string' && translated.trim() ? translated : canonical;
}

export function heroContentText(value, locale = activeLocale) {
  const canonical = String(value ?? '');
  if (!canonical || normalizeHeroAtlasLocale(locale) === 'en') return canonical;
  const translated = getHeroAtlasPack(locale).strings[canonical];
  return typeof translated === 'string' && translated.trim() ? translated : canonical;
}

const PLACEMENT_KEYS = Object.freeze({
  Any: 'placementAny',
  'Any Row': 'placementAny',
  'Front Row': 'placementFront',
  'Middle Row': 'placementMiddle',
  'Mid Row': 'placementMiddle',
  'Back Row': 'placementBack',
  'Front Row / Middle Row': 'placementFrontMiddle',
  'Middle Row / Back Row': 'placementMiddleBack',
  'Mid / Back Row': 'placementMiddleBack',
});

export function heroPlacementText(value, locale = activeLocale) {
  const key = PLACEMENT_KEYS[String(value || '').trim()];
  return key ? heroUi(key, {}, locale) : heroContentText(value, locale);
}

export function heroUi(key, replacements = {}, locale = activeLocale) {
  const normalized = normalizeHeroAtlasLocale(locale);
  const template = HERO_ATLAS_UI[normalized]?.[key] ?? HERO_ATLAS_UI.en[key] ?? key;
  return Object.entries(replacements).reduce(
    (copy, [token, value]) => copy.replaceAll(`{${token}}`, String(value)),
    template
  );
}

export function auditHeroAtlasPack(pack, heroesExtendedData, requiredStrings = []) {
  const normalized = normalizePack(pack);
  const missingSkills = [];
  const missingStrings = [];
  const alteredNumbers = [];
  const untranslatedFields = [];
  const untranslatedStrings = [];
  const residualEnglish = [];
  const encodingErrors = [];
  const identicalContentAllowlist = new Set(['S', 'S1', 'S2', 'S3', 'S4', 'SP', 'Silence']);
  const hasBrokenEncoding = (value) =>
    /(?:tokens truncated|\?|\u200B|Ã[\u0080-\u00bf]|Â[\u0080-\u00bf]|â(?:€|€™|€œ|€œ|€“|€”)|ï¿½|�)/iu.test(
      String(value || '')
    );

  const numberSignature = (value) =>
    (String(value || '').match(/[-+]?\d+(?:[.,]\d+)?\s*%?/g) || [])
      .map((token) => token.replace(/\s+/g, '').replace(',', '.'))
      .sort((a, b) => a.localeCompare(b))
      .join('|');

  const hasResidualEnglish = (value) =>
    /\b(?:the|rather|another|rounds?|layers?|stacks?|footmen|cooldown|revived|disarm(?:ed)?|silenced|taunting|sputtering|bleeding|burning|frindly|cambat|comnat|tun|faltal(?: blow)?|fatal blow|(?:storm cavalry|cavalry storm)|reflecting armor|wheel of fortune|eternity|star)\b/iu.test(
      String(value || '')
    );

  for (const [heroName, hero] of Object.entries(heroesExtendedData || {})) {
    for (const skill of hero?.skills || []) {
      const key = heroSkillKey(heroName, skill.id);
      for (const field of ['type', 'target', 'desc']) {
        const canonical = String(skill?.[field] || '').trim();
        const translated = String(normalized.skills[key]?.[field] || '').trim();
        if (!translated) {
          missingSkills.push(`${key}.${field}`);
          continue;
        }
        if (numberSignature(canonical) !== numberSignature(translated)) {
          alteredNumbers.push(`${key}.${field}`);
        }
        if (translated === canonical && /[A-Za-z]/.test(canonical)) {
          untranslatedFields.push(`${key}.${field}`);
        }
        if (hasResidualEnglish(translated)) residualEnglish.push(`${key}.${field}`);
        if (hasBrokenEncoding(translated)) encodingErrors.push(`${key}.${field}`);
      }
    }
  }

  for (const value of new Set(
    requiredStrings.map((item) => String(item || '').trim()).filter(Boolean)
  )) {
    const translated = String(normalized.strings[value] || '').trim();
    if (!translated) {
      missingStrings.push(value);
    } else if (numberSignature(value) !== numberSignature(translated)) {
      alteredNumbers.push(`string:${value}`);
    }
    if (translated === value && /[A-Za-z]/.test(value) && !identicalContentAllowlist.has(value)) {
      untranslatedStrings.push(value);
    }
    if (hasResidualEnglish(translated)) residualEnglish.push(`string:${value}`);
    if (hasBrokenEncoding(translated)) encodingErrors.push(`string:${value}`);
  }

  return Object.freeze({
    complete:
      missingSkills.length === 0 &&
      missingStrings.length === 0 &&
      alteredNumbers.length === 0 &&
      untranslatedFields.length === 0 &&
      untranslatedStrings.length === 0 &&
      residualEnglish.length === 0 &&
      encodingErrors.length === 0,
    missingSkills: Object.freeze(missingSkills),
    missingStrings: Object.freeze(missingStrings),
    alteredNumbers: Object.freeze(alteredNumbers),
    untranslatedFields: Object.freeze(untranslatedFields),
    untranslatedStrings: Object.freeze(untranslatedStrings),
    residualEnglish: Object.freeze(residualEnglish),
    encodingErrors: Object.freeze(encodingErrors),
  });
}

export function installHeroAtlasPackForTests(locale, pack) {
  const normalized = normalizeHeroAtlasLocale(locale);
  packs.set(normalized, normalizePack(pack));
  activeLocale = normalized;
}

export function installHeroAtlasLoaderForTests(locale, loader) {
  const normalized = normalizeHeroAtlasLocale(locale);
  if (normalized === 'en' || typeof loader !== 'function') {
    throw new TypeError('A non-English Hero Atlas locale and loader are required');
  }
  const previousLoader = loaders[normalized];
  const previousPack = packs.get(normalized);
  loaders[normalized] = loader;
  packs.delete(normalized);
  inFlight.delete(normalized);
  activeLocale = 'en';
  activationGeneration += 1;
  return () => {
    loaders[normalized] = previousLoader;
    if (previousPack) packs.set(normalized, previousPack);
    else packs.delete(normalized);
    inFlight.delete(normalized);
    activeLocale = 'en';
    activationGeneration += 1;
  };
}

export { HERO_ATLAS_UI, auditHeroAtlasUi };
