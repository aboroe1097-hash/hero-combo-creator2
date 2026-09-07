// js/i18n/bounty-guide/index.js
//
// Translation layer for the Royal Bounty Eden X2 guide.
//
// The guide is the Eden Hub's landing panel and was rendered entirely in English
// in all 13 languages. Its copy lives in two places - structural content in
// bounty-guide-data.js and section chrome inline in bounty-guide.js - and neither
// carried translation keys.
//
// Rather than restructure both files around invented key names, the catalogs are
// keyed by the English source string itself. A missing entry falls back to the
// English it was keyed on, so the guide can never render blank or show a raw key,
// and rewording the English degrades to the current behaviour instead of breaking.

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

export const BOUNTY_GUIDE_LOCALES = Object.freeze(['en', ...Object.keys(LOADERS)]);

const packs = new Map([['en', Object.freeze({})]]);
const inFlight = new Map();
let activeLocale = 'en';
let requestedLocale = 'en';

export function resolveBountyGuideLocale(locale) {
  const normalized = String(locale || 'en').toLowerCase();
  return BOUNTY_GUIDE_LOCALES.includes(normalized) ? normalized : 'en';
}

/**
 * Loads the pack for `locale` and makes it active. Safe to call repeatedly and
 * concurrently; a language change mid-flight does not resurrect the older pack.
 */
export async function loadBountyGuideLocale(locale) {
  const normalized = resolveBountyGuideLocale(locale);
  requestedLocale = normalized;

  if (!packs.has(normalized)) {
    if (!inFlight.has(normalized)) {
      inFlight.set(
        normalized,
        LOADERS[normalized]()
          .then((module) => {
            const pack = Object.freeze({ ...(module.default || {}) });
            packs.set(normalized, pack);
            return pack;
          })
          .catch((error) => {
            console.warn(`[bounty-guide-i18n] Failed to load ${normalized}; using English.`, error);
            packs.set(normalized, Object.freeze({}));
            return {};
          })
          .finally(() => inFlight.delete(normalized))
      );
    }
    await inFlight.get(normalized);
  }

  if (requestedLocale === normalized) activeLocale = normalized;
  return packs.get(normalized) || {};
}

export function getActiveBountyGuideLocale() {
  return activeLocale;
}

/** Translate one English source string, falling back to the English itself. */
export function bountyText(english, locale = activeLocale) {
  const pack = packs.get(resolveBountyGuideLocale(locale));
  const hit = pack ? pack[english] : '';
  return typeof hit === 'string' && hit ? hit : english;
}
