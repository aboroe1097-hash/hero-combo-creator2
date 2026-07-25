const SUPPORTED_LOCALES = Object.freeze([
  'en',
  'ar',
  'de',
  'es',
  'fr',
  'id',
  'it',
  'kr',
  'pt',
  'ru',
  'tr',
  'zh',
]);

const EMPTY_PACK = Object.freeze({
  monsters: Object.freeze({}),
  skills: Object.freeze({}),
  timings: Object.freeze({}),
  targets: Object.freeze({}),
  tags: Object.freeze({}),
});

const loaders = Object.freeze({
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

const packs = new Map([['en', EMPTY_PACK]]);
const inFlight = new Map();
let activeLocale = 'en';
let requestedLocale = 'en';

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

function normalizeLocale(locale) {
  const primary = String(locale || 'en')
    .toLowerCase()
    .split('-')[0];
  const normalized = primary === 'ko' ? 'kr' : primary;
  return SUPPORTED_LOCALES.includes(normalized) ? normalized : 'en';
}

function normalizePack(pack) {
  if (!pack || typeof pack !== 'object') return EMPTY_PACK;
  return deepFreeze({
    monsters: { ...(pack.monsters || {}) },
    skills: { ...(pack.skills || {}) },
    timings: { ...(pack.timings || {}) },
    targets: { ...(pack.targets || {}) },
    tags: { ...(pack.tags || {}) },
  });
}

export const STRIFE_CONTENT_LOCALES = SUPPORTED_LOCALES;

export function strifeSkillKey(monster, skill) {
  return monster?.id && skill?.id ? `${monster.id}:${skill.id}` : '';
}

export async function loadStrifeLocale(locale = 'en') {
  const normalized = normalizeLocale(locale);
  requestedLocale = normalized;
  if (!packs.has(normalized) && normalized !== 'en') {
    if (!inFlight.has(normalized)) {
      inFlight.set(
        normalized,
        loaders[normalized]()
          .then((module) => {
            const pack = normalizePack(module.default || module.strifeContent);
            if (pack === EMPTY_PACK) throw new Error(`Missing Strife pack: ${normalized}`);
            packs.set(normalized, pack);
            return pack;
          })
          .catch((error) => {
            console.warn(
              `[strife-i18n] Failed to load ${normalized}; using canonical English.`,
              error
            );
            return EMPTY_PACK;
          })
          .finally(() => inFlight.delete(normalized))
      );
    }
    await inFlight.get(normalized);
  }
  if (requestedLocale === normalized) activeLocale = packs.has(normalized) ? normalized : 'en';
  return packs.get(normalized) || EMPTY_PACK;
}

export function getActiveStrifeLocale() {
  return activeLocale;
}

export function getStrifePack(locale = activeLocale) {
  return packs.get(normalizeLocale(locale)) || EMPTY_PACK;
}

export function strifeMonsterText(monster, field = 'name', locale = activeLocale) {
  const localized = getStrifePack(locale).monsters?.[monster?.id];
  if (field === 'guideNotes') {
    return Array.isArray(localized?.guideNotes) && localized.guideNotes.length
      ? localized.guideNotes
      : monster?.guideNotes || [];
  }
  return localized?.[field] || monster?.[field] || '';
}

export function strifeSkillText(monster, skill, field, locale = activeLocale) {
  return (
    getStrifePack(locale).skills?.[strifeSkillKey(monster, skill)]?.[field] || skill?.[field] || ''
  );
}

export function strifeTermText(group, canonical, locale = activeLocale) {
  if (!canonical) return '';
  return getStrifePack(locale)?.[group]?.[canonical] || canonical;
}

export function auditStrifePack(pack, monsters) {
  const normalized = normalizePack(pack);
  const missingMonsters = [];
  const missingSkills = [];
  const missingTimings = new Set();
  const missingTargets = new Set();
  const missingTags = new Set();

  for (const monster of monsters || []) {
    const localizedMonster = normalized.monsters[monster.id];
    const expectedNotes = monster.guideNotes || [];
    const notesComplete =
      expectedNotes.length === 0 ||
      (Array.isArray(localizedMonster?.guideNotes) &&
        localizedMonster.guideNotes.length === expectedNotes.length &&
        localizedMonster.guideNotes.every(Boolean));
    if (!localizedMonster?.name || !notesComplete) missingMonsters.push(monster.id);

    for (const skill of monster.skills || []) {
      const key = strifeSkillKey(monster, skill);
      const localizedSkill = normalized.skills[key];
      if (!key || !localizedSkill?.name || !localizedSkill?.effect || !localizedSkill?.answer) {
        missingSkills.push(key || `${monster.id}:<missing-id>`);
      }
      if (!normalized.timings[skill.timing]) missingTimings.add(skill.timing);
      if (!normalized.targets[skill.target]) missingTargets.add(skill.target);
      for (const tag of skill.tags || []) {
        if (!normalized.tags[tag]) missingTags.add(tag);
      }
    }
  }

  const result = {
    missingMonsters: Object.freeze(missingMonsters),
    missingSkills: Object.freeze(missingSkills),
    missingTimings: Object.freeze([...missingTimings]),
    missingTargets: Object.freeze([...missingTargets]),
    missingTags: Object.freeze([...missingTags]),
  };
  return Object.freeze({
    complete: Object.values(result).every((items) => items.length === 0),
    ...result,
  });
}

export function installStrifePackForTests(locale, pack) {
  const normalized = normalizeLocale(locale);
  packs.set(normalized, normalizePack(pack));
  activeLocale = normalized;
}
