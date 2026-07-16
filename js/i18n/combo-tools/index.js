import { COMBO_TOOL_ENGLISH } from './schema.js';
import { COMBO_TOOL_PACKS } from './packs.js';

const SUPPORTED = new Set(['en', 'ar', 'de', 'es', 'fr', 'id', 'kr', 'pt', 'ru', 'tr', 'zh']);
const SKIN_TYPE_IDS = Object.freeze({
  Mythic: 'skinType.mythic',
  Legendary: 'skinType.legendary',
  Everlasting: 'skinType.everlasting',
});

function normalizeLocale(locale) {
  const primary = String(locale || 'en')
    .toLocaleLowerCase()
    .split('-')[0];
  const normalized = primary === 'ko' ? 'kr' : primary;
  return SUPPORTED.has(normalized) ? normalized : 'en';
}

export function getComboToolsPack(locale = 'en') {
  const normalized = normalizeLocale(locale);
  return normalized === 'en' ? COMBO_TOOL_ENGLISH : COMBO_TOOL_PACKS[normalized];
}

export function comboToolsText(id, values = {}, locale = 'en') {
  const localized = getComboToolsPack(locale)?.[id] || COMBO_TOOL_ENGLISH[id] || id;
  return Object.entries(values).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, String(value)),
    localized
  );
}

export function comboSkinTypeText(type, locale = 'en') {
  const canonical = String(type || '');
  const id = SKIN_TYPE_IDS[canonical];
  return id ? comboToolsText(id, {}, locale) : canonical;
}

export { COMBO_TOOL_ENGLISH, COMBO_TOOL_MESSAGE_IDS, auditComboToolsPack } from './schema.js';
export { COMBO_TOOL_PACKS } from './packs.js';
