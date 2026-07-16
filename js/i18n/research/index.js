import { resolveIntlLocale } from '../../locale-format.js';

const EMPTY_PACK = Object.freeze({ trees: Object.freeze({}), nodes: Object.freeze({}) });

const loaders = Object.freeze({
  ar: () => import('./ar.js'),
  de: () => import('./de.js'),
  es: () => import('./es.js'),
  fr: () => import('./fr.js'),
  id: () => import('./id.js'),
  kr: () => import('./kr.js'),
  pt: () => import('./pt.js'),
  ru: () => import('./ru.js'),
  tr: () => import('./tr.js'),
  zh: () => import('./zh.js'),
});

const packs = new Map([['en', EMPTY_PACK]]);
const inFlight = new Map();
let activeLocale = 'en';

const PER_LEVEL_PATTERNS = Object.freeze({
  ar: /(?:\u0644\u0643\u0644|\u0641\u064a \u0643\u0644)\s+\u0645\u0633\u062a\u0648\u0649/giu,
  de: /(?:pro|je)\s+Stufe/giu,
  es: /por\s+nivel/giu,
  fr: /par\s+niveau/giu,
  id: /(?:per|tiap)\s+level/giu,
  kr: /\ub808\ubca8(?:\ub2f9|\ub9c8\ub2e4)/gu,
  pt: /por\s+n\u00edvel/giu,
  ru: /(?:\u0437\u0430|\u043d\u0430)\s+\u0443\u0440\u043e\u0432\u0435\u043d\u044c/giu,
  tr: /seviye\s+ba\u015f\u0131na/giu,
  zh: /\u6bcf(?:\u4e00)?\u7ea7/gu,
});

const LOCALIZED_EFFECT_VALUE_PATTERNS = Object.freeze([
  /[+\-\u2212]\s*\d+(?:[.,]\d+)?\s*(?:%|[kKmM]|\u5343|\u4e07|\ub9cc|\u043c\u043b\u043d|\u0442\u044b\u0441\.?|\u0623\u0644\u0641|bin)?/u,
  /\d+(?:[.,]\d+)?\s*(?:%|[kKmM]|\u5343|\u4e07|\ub9cc|\u043c\u043b\u043d|\u0442\u044b\u0441\.?|\u0623\u0644\u0641|bin)/u,
]);

function normalizeLocale(locale) {
  return Object.hasOwn(loaders, locale) ? locale : 'en';
}

function normalizePack(value) {
  if (!value || typeof value !== 'object') return EMPTY_PACK;
  return Object.freeze({
    trees: Object.freeze({ ...(value.trees || {}) }),
    nodes: Object.freeze({ ...(value.nodes || {}) }),
  });
}

export async function loadResearchLocale(locale = 'en') {
  const normalized = normalizeLocale(locale);
  activeLocale = normalized;
  if (packs.has(normalized)) return packs.get(normalized);
  if (!inFlight.has(normalized)) {
    inFlight.set(
      normalized,
      loaders[normalized]()
        .then((module) => {
          const pack = normalizePack(module.default || module.researchContent);
          packs.set(normalized, pack);
          return pack;
        })
        .catch((error) => {
          console.warn(
            `[research-i18n] Failed to load ${normalized}; using canonical English.`,
            error
          );
          return EMPTY_PACK;
        })
        .finally(() => inFlight.delete(normalized))
    );
  }
  return inFlight.get(normalized);
}

export function getActiveResearchLocale() {
  return activeLocale;
}

export function getResearchPack(locale = activeLocale) {
  return packs.get(normalizeLocale(locale)) || EMPTY_PACK;
}

function localizedTree(tech, locale = activeLocale) {
  return getResearchPack(locale).trees?.[tech?.id] || null;
}

function localizedNode(tech, node, locale = activeLocale) {
  return getResearchPack(locale).nodes?.[`${tech?.id}:${node?.id}`] || null;
}

export function researchTreeText(tech, field, locale = activeLocale) {
  const localized = localizedTree(tech, locale);
  if (field === 'pages') {
    return Array.isArray(localized?.pages) && localized.pages.length
      ? localized.pages
      : tech?.treePages || [];
  }
  return localized?.[field] || tech?.[field] || '';
}

export function researchNodeText(tech, node, field, locale = activeLocale) {
  return localizedNode(tech, node, locale)?.[field] || node?.[field] || '';
}

export function deriveResearchEffectLabel(localizedBuff, locale = activeLocale) {
  let label = String(localizedBuff || '').trim();
  if (!label) return '';

  const normalizedLocale = normalizeLocale(locale);
  const perLevelPattern = PER_LEVEL_PATTERNS[normalizedLocale];
  if (perLevelPattern) label = label.replace(perLevelPattern, ' ');
  label = label.replace(/per\s+(?:level|lvl\.?)/giu, ' ');

  for (const pattern of LOCALIZED_EFFECT_VALUE_PATTERNS) {
    if (!pattern.test(label)) continue;
    label = label.replace(pattern, ' ');
    break;
  }

  return label
    .replace(/\s+/gu, ' ')
    .replace(/\s+([,.;:])/gu, '$1')
    .replace(/^[+\-\u2212:\s]+|[+\-\u2212:\s]+$/gu, '')
    .trim();
}

export function researchEffectText(
  tech,
  node,
  canonicalLabel,
  effectIndex = 0,
  locale = activeLocale
) {
  const localized = localizedNode(tech, node, locale);
  const effects = localized?.effects;
  if (Array.isArray(effects) && effects[effectIndex]) return effects[effectIndex];
  const derived = deriveResearchEffectLabel(localized?.buff, locale);
  if (derived) return derived;
  return canonicalLabel || '';
}

export function researchSearchText(tech, locale = activeLocale) {
  const normalizedLocale = normalizeLocale(locale);
  const localized = localizedTree(tech, locale);
  const localizedNodes = (tech?.nodes || []).flatMap((node) => {
    const text = localizedNode(tech, node, locale);
    return text ? [text.name, text.buff, ...(text.effects || [])] : [];
  });
  return [
    tech?.name,
    tech?.season,
    tech?.unlockCondition,
    tech?.primaryResource,
    ...(tech?.treePages || []),
    ...(tech?.nodes || []).flatMap((node) => [node.name, node.buff]),
    localized?.name,
    localized?.unlockCondition,
    localized?.primaryResource,
    ...(localized?.pages || []),
    ...localizedNodes,
  ]
    .filter(Boolean)
    .join(' ')
    .toLocaleLowerCase(resolveIntlLocale(normalizedLocale));
}

export function auditResearchPack(pack, techDatabase) {
  const normalized = normalizePack(pack);
  const missingTrees = [];
  const missingNodes = [];
  for (const tech of techDatabase || []) {
    const tree = normalized.trees[tech.id];
    if (!tree?.name || !tree?.unlockCondition || !tree?.primaryResource) {
      missingTrees.push(tech.id);
    }
    for (const node of tech.nodes || []) {
      const key = `${tech.id}:${node.id}`;
      const localized = normalized.nodes[key];
      if (!localized?.name || !localized?.buff) missingNodes.push(key);
    }
  }
  return Object.freeze({
    complete: missingTrees.length === 0 && missingNodes.length === 0,
    missingTrees: Object.freeze(missingTrees),
    missingNodes: Object.freeze(missingNodes),
  });
}

export function installResearchPackForTests(locale, pack) {
  const normalized = normalizeLocale(locale);
  packs.set(normalized, normalizePack(pack));
  activeLocale = normalized;
}
