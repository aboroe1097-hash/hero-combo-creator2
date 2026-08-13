import { resolveRuntimeLocale } from '../../locale-format.js';

const STRUCTURE_SHAPES = Object.freeze({
  CP1: ['gate', 1],
  CP2: ['gate', 2],
  CP3: ['gate', 3],
  CP4: ['gate', 4],
  CP5: ['gate', 5],
  CP7: ['gate', 7],
  ST1: ['smallTown', 1],
  ST2: ['smallTown', 2],
  ST3: ['smallTown', 3],
  LT2: ['largeTown', 2],
  LT3: ['largeTown', 3],
  LT4: ['largeTown', 4],
  C5: ['capital', 5],
  C6: ['capital', 6],
  STRHD: ['stronghold'],
  CS: ['stronghold'],
  AT: ['ancientTemple'],
  WCB: ['wonderCapital'],
  WC8: ['wonderCapital', 8],
});

const EXPLICIT_SECTOR_KEYS = Object.freeze([
  'C',
  'NC',
  'NE',
  'N',
  'NW',
  'EC',
  'E',
  'WC',
  'W',
  'SC',
  'SE',
  'S',
  'SW',
]);
const SECTOR_KEYS = Object.freeze([
  ...EXPLICIT_SECTOR_KEYS,
  'N1',
  'N2',
  'N3',
  'N4',
  'S1',
  'S2',
  'S3',
  'S4',
]);

const TARGET_IDS_BY_CANONICAL_NAME = Object.freeze({
  'Temple Push': 'templePush',
  'NC1 Cap': 'nc1Capital',
  'W Gate Line': 'westGateLine',
  'E Stronghold': 'eastStronghold',
  'S Desert Town': 'southDesertTown',
  'NE Rally': 'northEastRally',
});

const EN = Object.freeze({
  level: '{name} Lv{level}',
  structures: {
    gate: 'Gate',
    smallTown: 'Small Town',
    largeTown: 'Large Town',
    stronghold: 'Stronghold',
    capital: 'Capital',
    ancientTemple: 'Ancient Temple',
    wonderCapital: 'Wonder Capital',
  },
  sectors: {
    C: 'Central Sector',
    NC: 'North Central Sector',
    NE: 'North East Sector',
    N: 'North Sector',
    NW: 'North West Sector',
    EC: 'Eastern Central Sector',
    E: 'East Sector',
    WC: 'West Central Sector',
    W: 'West Sector',
    SC: 'South Central Sector',
    SE: 'South East Sector',
    S: 'South Sector',
    SW: 'South West Sector',
  },
  factions: { all: 'All', north: 'North', central: 'Central', south: 'South' },
  pathColors: {
    red: 'Red Alliance',
    blue: 'Blue Alliance',
    purple: 'Purple Route',
    yellow: 'Yellow Route',
    green: 'Green / Friendly',
    orange: 'Scout / Draft',
  },
  missions: {
    vts: 'VTS',
    'ally-north': 'Our ally N',
    'ally-south': 'Our ally S',
    'enemy-red': 'Enemy red',
    'enemy-purple': 'Enemy purple',
    'enemy-gold': 'Enemy gold',
    neutral: 'Neutral',
  },
  targets: {
    templePush: 'Temple Push',
    nc1Capital: 'NC1 Capital',
    westGateLine: 'W Gate Line',
    eastStronghold: 'E Stronghold',
    southDesertTown: 'S Desert Town',
    northEastRally: 'NE Rally',
  },
  terrain: { plains: 'Plains', desert: 'Desert', river: 'River', mountain: 'Mountain' },
  copy: {
    day: 'Day',
    loadingMap: 'Loading Eden Map…',
    mainPlan: 'Main Plan',
    plan: 'Plan',
    team: 'Team',
    route: 'Route',
    draft: 'Draft',
    fullscreen: 'Fullscreen',
    exitFullscreen: 'Exit Fullscreen',
    fullscreenTitle: 'Fullscreen map',
    exitFullscreenTitle: 'Exit fullscreen map',
    jumpTo: 'Jump to {place}',
    zone: 'Zone',
    ov: 'OV',
    offline:
      'Offline mode: saved plans and core map tools are available; reference images may be unavailable.',
    tilesFromSelected: '{distance} tiles from selected',
    missionControls: 'Mission controls',
    mission: 'Mission',
    alliance: 'Alliance',
    allianceTitle: 'Alliance color for targets, paths, and drawing',
    label: 'Label',
    gateRally: 'Gate / Rally',
    time: 'Time',
    marchSpeed: 'March speed',
    vtsTeams: 'VTS teams',
    vtsTeam: 'VTS team',
    placeTarget: 'Place target',
    path: 'Path',
    draw: 'Draw',
    undoTarget: 'Undo target',
    mapTools: 'Map tools',
    pathOptions: 'Path options',
    drawOptions: 'Draw options',
    zoomControls: 'Zoom controls',
    canvas: 'Eden map canvas',
    minimap: 'Minimap — press Enter to jump',
    closeSidebar: 'Close sidebar',
    guideSections: 'Guide sections',
    guideSteps: 'Steps in section',
    allSectors: 'Full Map',
    genericSector: '{code} Sector',
    subTabMap: 'Eden Map',
    subTabLoyalty: 'Eden Loyalty',
    subTabBounty: 'Royal Bounty',
    subTabPrevious: 'Previous Seasons',
  },
});

const loaders = Object.freeze({
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
const packs = { en: EN };
const inFlight = {};

export const EDEN_MAP_LOCALES = Object.freeze(['en', ...Object.keys(loaders)]);

export function resolveEdenMapLocale(locale) {
  const normalized = resolveRuntimeLocale(locale);
  return EDEN_MAP_LOCALES.includes(normalized) ? normalized : 'en';
}

function packOf(locale) {
  return packs[resolveEdenMapLocale(locale)] || EN;
}

function format(template, vars = {}) {
  return String(template).replace(/\{(\w+)\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : match
  );
}

export async function loadEdenMapLocale(locale) {
  const normalized = resolveEdenMapLocale(locale);
  if (packs[normalized]) return packs[normalized];
  if (!inFlight[normalized]) {
    inFlight[normalized] = loaders[normalized]()
      .then((module) => {
        packs[normalized] = module.default;
        return packs[normalized];
      })
      .catch((error) => {
        delete inFlight[normalized];
        console.warn(`[eden-map-i18n] Failed to load ${normalized}:`, error);
        return EN;
      });
  }
  return inFlight[normalized];
}

export function edenMapText(key, vars = {}, locale) {
  const pack = packOf(locale);
  return format(pack.copy?.[key] ?? EN.copy[key] ?? key, vars);
}

export function getEdenStructureDisplayLabel(type, locale) {
  const shape = STRUCTURE_SHAPES[type];
  if (!shape) return type;
  const pack = packOf(locale);
  const name = pack.structures?.[shape[0]] ?? EN.structures[shape[0]] ?? type;
  return shape[1] ? format(pack.level || EN.level, { name, level: shape[1] }) : name;
}

export function getEdenSectorDisplayLabel(sectorKey, canonicalLabel = '', locale) {
  if (sectorKey === 'FULL') return edenMapText('allSectors', {}, locale);
  const pack = packOf(locale);
  return (
    pack.sectors?.[sectorKey] ??
    (canonicalLabel && canonicalLabel !== `${sectorKey} Sector` ? canonicalLabel : null) ??
    edenMapText('genericSector', { code: sectorKey }, locale)
  );
}

export function getEdenFactionDisplayLabel(factionId, locale) {
  const pack = packOf(locale);
  return pack.factions?.[factionId] ?? EN.factions[factionId] ?? factionId;
}

export function getEdenPathColorDisplayLabel(colorId, locale) {
  const pack = packOf(locale);
  return pack.pathColors?.[colorId] ?? EN.pathColors[colorId] ?? colorId;
}

export function getEdenMissionDisplayLabel(missionId, locale) {
  const pack = packOf(locale);
  return pack.missions?.[missionId] ?? EN.missions[missionId] ?? missionId;
}

export function getEdenPresetTargetDisplayLabel(target, locale) {
  const id =
    target?.presetId || target?.id || TARGET_IDS_BY_CANONICAL_NAME[target?.label || target?.name];
  if (!id) return target?.label || target?.name || '';
  const pack = packOf(locale);
  return pack.targets?.[id] ?? EN.targets[id] ?? target?.label ?? target?.name ?? id;
}

export function getEdenTerrainDisplayLabel(terrain, locale) {
  const pack = packOf(locale);
  return pack.terrain?.[terrain] ?? EN.terrain[terrain] ?? terrain;
}

export function getEdenPlanDisplayName(planId, storedName, locale) {
  if (planId === 'default' && (!storedName || storedName === 'Main Plan')) {
    return edenMapText('mainPlan', {}, locale);
  }
  const planMatch = String(storedName || '').match(/^Plan (\d+)$/);
  if (planMatch) return `${edenMapText('plan', {}, locale)} ${planMatch[1]}`;
  return storedName || planId;
}

export function getEdenTeamDisplayName(teamId, storedName, locale) {
  const number = String(teamId || '').replace(/^t/, '');
  if (!storedName || storedName === `Team ${number}`) {
    return `${edenMapText('team', {}, locale)} ${number}`;
  }
  return storedName;
}

export function getEdenStoredRouteDisplayLabel(storedLabel, locale) {
  if (storedLabel === 'Draft') return edenMapText('draft', {}, locale);
  const match = String(storedLabel || '').match(/^Route (\d+)$/);
  if (match) return `${edenMapText('route', {}, locale)} ${match[1]}`;
  return storedLabel || '';
}

export function applyEdenMapDomTranslations(root = document, locale) {
  if (root?.dataset) {
    root.dataset.edenLoadingLabel = edenMapText('loadingMap', {}, locale);
  }
  if (!root?.querySelectorAll) return;
  root.querySelectorAll('[data-eden-i18n]').forEach((element) => {
    element.textContent = edenMapText(element.dataset.edenI18n, {}, locale);
  });
  root.querySelectorAll('[data-eden-i18n-title]').forEach((element) => {
    element.title = edenMapText(element.dataset.edenI18nTitle, {}, locale);
  });
  root.querySelectorAll('[data-eden-i18n-aria]').forEach((element) => {
    element.setAttribute('aria-label', edenMapText(element.dataset.edenI18nAria, {}, locale));
  });
  root.querySelectorAll('[data-eden-i18n-ph]').forEach((element) => {
    element.placeholder = edenMapText(element.dataset.edenI18nPh, {}, locale);
  });
  root.querySelectorAll('[data-eden-mission-option]').forEach((element) => {
    element.textContent = getEdenMissionDisplayLabel(element.dataset.edenMissionOption, locale);
  });
  root.querySelectorAll('[data-eden-sector-option]').forEach((element) => {
    const code = element.dataset.edenSectorOption;
    element.textContent = `${getEdenSectorDisplayLabel(code, '', locale)} (${code})`;
  });
}

export function auditEdenMapLocale(locale) {
  const normalized = resolveEdenMapLocale(locale);
  const pack = packs[normalized];
  if (!pack) return [`locale not loaded: ${normalized}`];
  const missing = [];
  Object.entries(STRUCTURE_SHAPES).forEach(([type, [shape, level]]) => {
    if (!pack.structures?.[shape]) missing.push(`structure:${type}`);
    if (level && !pack.level) missing.push(`level:${type}`);
  });
  EXPLICIT_SECTOR_KEYS.forEach((key) => {
    if (!pack.sectors?.[key]) missing.push(`sector:${key}`);
  });
  SECTOR_KEYS.forEach((key) => {
    if (!getEdenSectorDisplayLabel(key, `${key} Sector`, normalized))
      missing.push(`sector-display:${key}`);
  });
  for (const group of ['factions', 'pathColors', 'missions', 'targets', 'terrain', 'copy']) {
    for (const key of Object.keys(EN[group])) {
      if (!pack[group]?.[key]) missing.push(`${group}:${key}`);
    }
  }
  return missing;
}

export const EDEN_MAP_CANONICAL = Object.freeze({
  structureTypes: Object.freeze(Object.keys(STRUCTURE_SHAPES)),
  sectorKeys: SECTOR_KEYS,
  targetIdsByCanonicalName: TARGET_IDS_BY_CANONICAL_NAME,
});
