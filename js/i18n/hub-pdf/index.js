// Domain copy for the hub PDFs tabs. English ships with the lazy PDF panel; every
// other locale is its own small chunk, loaded only for a reader using that
// language. Croatian is intentionally partial in the core registry, so it reads
// English here like the other specialist domains.
import en from './en.js';

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

export const HUB_PDF_LOCALES = Object.freeze(['en', ...Object.keys(LOADERS)]);
export const HUB_PDF_ENGLISH = en;

const cache = new Map([['en', en]]);

export function normalizeHubPdfLanguage(language) {
  const primary = String(language || 'en')
    .toLowerCase()
    .split('-')[0];
  const normalized = primary === 'ko' ? 'kr' : primary;
  return HUB_PDF_LOCALES.includes(normalized) ? normalized : 'en';
}

/** English merged with the locale, so a missing key never prints blank. */
export async function loadHubPdfCopy(language) {
  const lang = normalizeHubPdfLanguage(language);
  if (cache.has(lang)) return cache.get(lang);
  try {
    const module = await LOADERS[lang]();
    const merged = Object.freeze({ ...en, ...(module.default || {}) });
    cache.set(lang, merged);
    return merged;
  } catch {
    return en;
  }
}
