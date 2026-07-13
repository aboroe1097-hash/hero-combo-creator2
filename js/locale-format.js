const APP_LOCALE_MAP = Object.freeze({
  ar: 'ar',
  de: 'de-DE',
  en: 'en-US',
  es: 'es-ES',
  fr: 'fr-FR',
  id: 'id-ID',
  kr: 'ko-KR',
  ko: 'ko-KR',
  pt: 'pt-BR',
  ru: 'ru-RU',
  tr: 'tr-TR',
  zh: 'zh-CN',
});

export function resolveIntlLocale(language = 'en') {
  const normalized = String(language || 'en').trim().toLowerCase();
  const baseLanguage = normalized.split('-')[0];
  return APP_LOCALE_MAP[normalized] || APP_LOCALE_MAP[baseLanguage] || APP_LOCALE_MAP.en;
}

export function formatLocaleNumber(value, language = 'en', options = {}) {
  return new Intl.NumberFormat(resolveIntlLocale(language), options).format(Number(value) || 0);
}

export function formatLocaleDate(value, language = 'en', options = {}) {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat(resolveIntlLocale(language), options).format(date);
}

export function formatLocalePercent(value, language = 'en', options = {}) {
  return formatLocaleNumber(value, language, {
    style: 'percent',
    maximumFractionDigits: 1,
    ...options,
  });
}

export { APP_LOCALE_MAP };
