import en from './i18n/en.js?v=20260709_192905';

export const translations = { en };
export const translationCoverage = {};

const loaders = {
  ar: () => import('./i18n/ar.js?v=20260709_192905'),
  de: () => import('./i18n/de.js?v=20260709_192905'),
  es: () => import('./i18n/es.js?v=20260709_192905'),
  fr: () => import('./i18n/fr.js?v=20260709_192905'),
  id: () => import('./i18n/id.js?v=20260709_192905'),
  kr: () => import('./i18n/kr.js?v=20260709_192905'),
  pt: () => import('./i18n/pt.js?v=20260709_192905'),
  ru: () => import('./i18n/ru.js?v=20260709_192905'),
  tr: () => import('./i18n/tr.js?v=20260709_192905'),
  zh: () => import('./i18n/zh.js?v=20260709_192905'),
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

export async function loadTranslationsForLanguage(lang = 'en') {
  if (!lang || translations[lang]) {
    if (lang) applyLanguageDirection(lang);
    return translations[lang] || translations.en;
  }
  const loader = loaders[lang];
  if (!loader) {
    applyLanguageDirection('en');
    return translations.en;
  }
  if (!inFlight[lang]) {
    inFlight[lang] = loader()
      .then((mod) => {
        translations[lang] = mod.default || mod[lang] || translations.en;
        applyLanguageDirection(lang);
        return translations[lang];
      })
      .catch((err) => {
        delete inFlight[lang];
        console.warn(`[i18n] Failed to load language: ${lang}`, err);
        applyLanguageDirection('en');
        return translations.en;
      });
  }
  return inFlight[lang];
}
