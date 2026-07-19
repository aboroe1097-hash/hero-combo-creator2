import en from './i18n/en.js';
import { getAiActionCopy } from './i18n/ai-action-copy.js';
import { getRuntimeMiscCopy } from './i18n/runtime-misc.js';

export const translations = {
  en: Object.freeze({ ...en, ...getAiActionCopy('en'), ...getRuntimeMiscCopy('en') }),
};
export const translationCoverage = {};

const loaders = {
  ar: () => import('./i18n/ar.js'),
  de: () => import('./i18n/de.js'),
  es: () => import('./i18n/es.js'),
  fr: () => import('./i18n/fr.js'),
  hr: () => import('./i18n/hr.js'),
  id: () => import('./i18n/id.js'),
  kr: () => import('./i18n/kr.js'),
  pt: () => import('./i18n/pt.js'),
  ru: () => import('./i18n/ru.js'),
  tr: () => import('./i18n/tr.js'),
  zh: () => import('./i18n/zh.js'),
};
export const availableLanguages = ['en', ...Object.keys(loaders)];

const inFlight = {};

const RTL_LANGUAGES = new Set(['ar']);

export function getLanguageDirection(lang) {
  return RTL_LANGUAGES.has(lang) ? 'rtl' : 'ltr';
}

export function applyLanguageDirection(lang) {
  const dir = getLanguageDirection(lang);
  if (typeof document === 'undefined') return;
  if (document.documentElement.dir !== dir) {
    document.documentElement.dir = dir;
  }
}

export function createLatestLanguageLoader(
  applyLanguage,
  loadLanguage = loadTranslationsForLanguage
) {
  if (typeof applyLanguage !== 'function') {
    throw new TypeError('createLatestLanguageLoader requires an apply callback');
  }
  let requestGeneration = 0;
  return async function requestLanguage(lang = 'en') {
    const requestId = ++requestGeneration;
    const catalog = await loadLanguage(lang);
    if (requestId !== requestGeneration) {
      return Object.freeze({ applied: false, catalog });
    }
    await applyLanguage(lang, catalog);
    return Object.freeze({ applied: true, catalog });
  };
}

export async function loadTranslationsForLanguage(lang = 'en') {
  if (!lang || translations[lang]) {
    return translations[lang] || translations.en;
  }
  const loader = loaders[lang];
  if (!loader) {
    return translations.en;
  }
  if (!inFlight[lang]) {
    inFlight[lang] = loader()
      .then((mod) => {
        const catalog = mod.default || mod[lang] || {};
        const missingBeforeFallback = Object.keys(translations.en).filter(
          (key) => !Object.hasOwn(catalog, key)
        );
        translations[lang] = Object.freeze({
          ...translations.en,
          ...catalog,
          ...getAiActionCopy(lang),
          ...getRuntimeMiscCopy(lang),
        });
        translationCoverage[lang] = Object.freeze({
          missingBeforeFallback: Object.freeze(missingBeforeFallback),
          total: Object.keys(translations.en).length,
        });
        return translations[lang];
      })
      .catch((err) => {
        delete inFlight[lang];
        console.warn(`[i18n] Failed to load language: ${lang}`, err);
        return translations.en;
      });
  }
  return inFlight[lang];
}
