// Page-local copy for the Castle 26-30 / all-buildings upgrade planner
// (mounted inside the Planners tab). The planner used to render English
// literals; its chrome now resolves per locale while building names, bonuses and
// prerequisites from the community sheet stay canonical game terms. English is
// the source of truth and the fallback for any key a locale has not covered.

import { fetchLocalePack } from './fetch-locale-pack.js';

const COPY = Object.freeze({
  en: Object.freeze({
    resources: Object.freeze({
      orichalcum: 'Orichalcum',
      gold: 'Gold',
      food: 'Food',
      lumber: 'Lumber',
      charcoal: 'Charcoal',
      marble: 'Marble',
      iron: 'Iron',
    }),
    notListed: 'Not listed',
    level: 'Level {level}',
    castleLevel: 'Castle {level}',
    upgradeCost: 'Upgrade cost',
    sheetPrerequisite: 'Sheet prerequisite',
    castleProgression: 'Castle progression',
    castleTitle: 'Castle levels 26–30',
    castleIntro:
      'Plan direct Castle costs across all seven resources, with the matching Orichalcum prerequisite note from the community sheet.',
    yourCurrentCastle: 'Your current Castle',
    upgradeBudget: 'Upgrade budget',
    resourcesToCastle: 'Resources to Castle 30',
    fromLevel: 'From level {level} · {steps}',
    stepSingular: 'step',
    stepPlural: 'steps',
    levelByLevel: 'Level by level',
    requirementsDirectCosts: 'Requirements and direct costs',
    castleMaxed: 'Castle is already level 30.',
    costSourceLabel: 'Cost source:',
    costSourceLink: 'Google Sheet: Castle upgrade costs',
    costSourceBody:
      'Figures are direct Castle costs; prerequisite buildings are not included. Accumulated totals may vary with current building levels.',
    noPrerequisite: 'No prerequisite listed',
    sourceRow: 'Source row {row}',
    selectedLevels: 'Selected levels',
    partialTotal: 'Partial total',
    noLevelsRemain: 'No levels remain in this plan.',
    bonusAt30: 'Bonus at level 30',
    buildingsUnit: 'buildings',
    communitySheet: 'Community upgrade sheet',
    allBuildingsTitle: 'All building upgrades',
    allBuildingsIntro:
      'Compare Orichalcum costs, prerequisites and level 30 bonuses across the buildings listed in the source sheet.',
    yourCurrentLevel: 'Your current level',
    knownSourceCosts: 'Known source costs',
    knownCostsRange: ' · levels {from}–30',
    summaryKnown: '{known} known · {missing} cost cells missing',
    summaryOrichalcum: '{known} Orichalcum',
    buildingsCount: '{count} buildings',
    missingWarningStrong: 'Some costs are missing in the source.',
    missingWarningBody:
      'Missing cells remain unknown and are not counted as zero; displayed totals are partial.',
    searchPlaceholder: 'Search buildings',
    countOf: '{shown} of {total}',
    noMatches: 'No buildings match this search.',
    sheetTotalsStrong: 'The sheet’s displayed total is {total}.',
    sheetTotalsBody:
      'The listed building totals add to {listed}; the sheet formula omits Market and Institute.',
    aboutSource: 'About the source data',
    dataLabel: 'Data:',
    googleSheet: 'Google Sheet',
    observedLine: 'observed {date}',
    genericIcons:
      'Every building mark here is a generic symbol drawn for this tool; no external icon set is loaded.',
    plannerEyebrow: 'Rise of Castles · Upgrade planner',
    buildingsHeading: 'Buildings',
    buildingsIntro: 'Plan Castle 26–30 and calculate Orichalcum across all listed buildings.',
    plannerAria: 'Building upgrade planner',
    modeCastle: 'Castle 26–30',
    modeAll: 'All buildings',
  }),
});

export const BUILDING_UPGRADES_LOCALES = Object.freeze([
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
  return BUILDING_UPGRADES_LOCALES.includes(normalized) ? normalized : 'en';
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

export function normalizeBuildingUpgradesLocale(locale = 'en') {
  return normalizeLocale(locale);
}

export function getBuildingUpgradesCopy(locale = 'en', localizedPacks = {}) {
  const normalized = normalizeBuildingUpgradesLocale(locale);
  return normalized === 'en' ? COPY.en : mergeCopy(COPY.en, localizedPacks[normalized]);
}

const packRequests = new Map();

export async function loadBuildingUpgradesCopy(
  locale = 'en',
  packsUrl,
  fetcher = globalThis.fetch,
  timeoutMs
) {
  const normalized = normalizeBuildingUpgradesLocale(locale);
  if (normalized === 'en' || !packsUrl || typeof fetcher !== 'function') {
    return COPY.en;
  }
  try {
    let request = packRequests.get(packsUrl);
    if (!request) {
      request = fetchLocalePack(packsUrl, fetcher, timeoutMs).then((response) => {
        if (!response.ok) throw new Error('Building translations could not be loaded.');
        return response.json();
      });
      packRequests.set(packsUrl, request);
      request.catch(() => {
        if (packRequests.get(packsUrl) === request) packRequests.delete(packsUrl);
      });
    }
    return getBuildingUpgradesCopy(normalized, await request);
  } catch {
    return COPY.en;
  }
}

export function formatBuildingUpgradesText(template, values = {}) {
  return String(template).replace(/\{(\w+)\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(values, key) ? String(values[key]) : match
  );
}
