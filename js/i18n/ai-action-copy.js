const copy = Object.freeze({
  en: Object.freeze({
    'ai.action.openLoyalty': 'Open Loyalty Calculator',
    'ai.action.openGenerator': 'Open Combo Generator',
  }),
  ar: Object.freeze({
    'ai.action.openLoyalty': 'فتح حاسبة الولاء',
    'ai.action.openGenerator': 'فتح منشئ التشكيلات',
  }),
  de: Object.freeze({
    'ai.action.openLoyalty': 'Loyalitätsrechner öffnen',
    'ai.action.openGenerator': 'Combo-Generator öffnen',
  }),
  es: Object.freeze({
    'ai.action.openLoyalty': 'Abrir calculadora de lealtad',
    'ai.action.openGenerator': 'Abrir generador de combos',
  }),
  fr: Object.freeze({
    'ai.action.openLoyalty': 'Ouvrir le calculateur de loyauté',
    'ai.action.openGenerator': 'Ouvrir le générateur de combos',
  }),
  id: Object.freeze({
    'ai.action.openLoyalty': 'Buka Kalkulator Loyalitas',
    'ai.action.openGenerator': 'Buka Generator Combo',
  }),
  kr: Object.freeze({
    'ai.action.openLoyalty': '충성도 계산기 열기',
    'ai.action.openGenerator': '콤보 생성기 열기',
  }),
  pt: Object.freeze({
    'ai.action.openLoyalty': 'Abrir Calculadora de Lealdade',
    'ai.action.openGenerator': 'Abrir Gerador de Combos',
  }),
  ru: Object.freeze({
    'ai.action.openLoyalty': 'Открыть калькулятор лояльности',
    'ai.action.openGenerator': 'Открыть генератор комбинаций',
  }),
  tr: Object.freeze({
    'ai.action.openLoyalty': 'Sadakat Hesaplayıcısını aç',
    'ai.action.openGenerator': 'Kombo Oluşturucuyu aç',
  }),
  zh: Object.freeze({
    'ai.action.openLoyalty': '打开忠诚度计算器',
    'ai.action.openGenerator': '打开组合生成器',
  }),
});

export function getAiActionCopy(locale = 'en') {
  const primary = String(locale || 'en')
    .toLowerCase()
    .split('-')[0];
  const normalized = primary === 'ko' ? 'kr' : primary;
  return copy[normalized] || copy.en;
}

export const AI_ACTION_LOCALES = Object.freeze(Object.keys(copy));
