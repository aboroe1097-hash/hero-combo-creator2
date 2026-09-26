// Page-local copy for the community downloads hub (downloads.html).
//
// The hub ships PDFs that are English-only, so the documents themselves stay
// English. Its own chrome — headings, group labels, stat labels and status
// messages — is localized here for every supported site locale. The page has no
// language switcher of its own, so the locale is resolved from the stored site
// preference first, then the browser language, exactly like the standalone
// pages. English is the source of truth and the fallback.

import { fetchLocalePack } from './fetch-locale-pack.js';

const COPY = Object.freeze({
  en: Object.freeze({
    title: 'Community downloads',
    skip: 'Skip to download list',
    intro:
      'Every breakdown this site holds, as a PDF you can keep and share. One click per document, no sign-up. Each file is generated from the same game data the site uses, and each one names its source and data revision on the last page.',
    noteStrong: 'Community data.',
    noteBody:
      'These figures come from community workbooks and in-game captures, and they can change when the game is updated. Check anything expensive against the live game before you commit resources. Where a value is not published, the document says so rather than guessing.',
    loading: 'Loading the download list…',
    error:
      'The download list could not be loaded. Reload the page, or open a document directly from the downloads folder.',
    groups: Object.freeze({
      research: 'Research',
      unitSpecialisation: 'Unit Specialisation',
      eden: 'Eden',
      dragonMaster: 'Dragon Master',
      heroesSkins: 'Heroes and skins',
      reference: 'Reference',
      more: 'More',
    }),
    stats: Object.freeze({
      documents: 'Documents',
      totalSize: 'Total size',
      built: 'Built',
    }),
  }),
});

export const DOWNLOADS_LOCALES = Object.freeze([
  'en',
  'es',
  'pt',
  'de',
  'fr',
  'hr',
  'tr',
  'ru',
  'id',
  'zh',
  'ar',
  'kr',
  'it',
]);

function normalizeLocale(locale = 'en') {
  const primary = String(locale || 'en')
    .toLowerCase()
    .split('-')[0];
  const normalized = primary === 'ko' ? 'kr' : primary;
  return DOWNLOADS_LOCALES.includes(normalized) ? normalized : 'en';
}

function mergeCopy(base, override) {
  if (!override || typeof override !== 'object') return base;
  const out = Array.isArray(base) ? base.slice() : { ...base };
  for (const [key, value] of Object.entries(override)) {
    const baseValue = out[key];
    out[key] =
      baseValue && typeof baseValue === 'object' && !Array.isArray(baseValue)
        ? mergeCopy(baseValue, value)
        : value;
  }
  return out;
}

export function normalizeDownloadsLocale(locale = 'en') {
  return normalizeLocale(locale);
}

export function preferredDownloadsLocale(storage = globalThis.localStorage) {
  let stored = '';
  try {
    stored = storage?.getItem('vts_hero_lang') || '';
  } catch {
    // Restricted storage: fall back to the browser language.
  }
  return normalizeDownloadsLocale(
    stored || globalThis.navigator?.language || globalThis.document?.documentElement?.lang || 'en'
  );
}

export function getDownloadsCopy(locale = 'en', localizedPacks = {}) {
  const normalized = normalizeDownloadsLocale(locale);
  return normalized === 'en' ? COPY.en : mergeCopy(COPY.en, localizedPacks[normalized]);
}

const packRequests = new Map();

export async function loadDownloadsCopy(
  locale = 'en',
  packsUrl,
  fetcher = globalThis.fetch,
  timeoutMs
) {
  const normalized = normalizeDownloadsLocale(locale);
  if (normalized === 'en' || !packsUrl || typeof fetcher !== 'function') {
    return COPY.en;
  }
  try {
    let request = packRequests.get(packsUrl);
    if (!request) {
      request = fetchLocalePack(packsUrl, fetcher, timeoutMs).then((response) => {
        if (!response.ok) throw new Error('Downloads translations could not be loaded.');
        return response.json();
      });
      packRequests.set(packsUrl, request);
      request.catch(() => {
        if (packRequests.get(packsUrl) === request) packRequests.delete(packsUrl);
      });
    }
    return getDownloadsCopy(normalized, await request);
  } catch {
    return COPY.en;
  }
}
