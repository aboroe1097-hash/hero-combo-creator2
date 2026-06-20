import en from './i18n/en.js';

export const translations = { en };
export const translationCoverage = {};

const loaders = {
  "ar": () => import('./i18n/ar.js'),
  "de": () => import('./i18n/de.js'),
  "es": () => import('./i18n/es.js'),
  "fr": () => import('./i18n/fr.js'),
  "id": () => import('./i18n/id.js'),
  "kr": () => import('./i18n/kr.js'),
  "pt": () => import('./i18n/pt.js'),
  "ru": () => import('./i18n/ru.js'),
  "tr": () => import('./i18n/tr.js'),
  "zh": () => import('./i18n/zh.js'),
};
export const availableLanguages = ['en', ...Object.keys(loaders)];

const inFlight = {};

export async function loadTranslationsForLanguage(lang = 'en') {
  if (!lang || translations[lang]) return translations[lang] || translations.en;
  const loader = loaders[lang];
  if (!loader) return translations.en;
  if (!inFlight[lang]) {
    inFlight[lang] = loader()
      .then((mod) => {
        translations[lang] = mod.default || mod[lang] || translations.en;
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
