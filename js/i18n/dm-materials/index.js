const SUPPORTED_LOCALES = Object.freeze([
  'en',
  'ar',
  'de',
  'es',
  'fr',
  'id',
  'kr',
  'pt',
  'ru',
  'tr',
  'zh',
]);

const CANONICAL_PACK = {
  planner: {
    title: 'Dragon Master Set Planner',
    subtitle:
      'Build normal troop gear first, then merge through your chosen tier path into gold Dragon Master pieces.',
    plan: 'Your plan',
    planName: 'Plan name',
    preset: 'Target preset',
    targetSets: 'Full sets',
    targetSetsOption: '{count} full set(s)',
    full: 'Full 6-piece set',
    attack: 'Attack set (4 pieces)',
    defense: 'Defense set (4 pieces)',
    routes: 'Crafting routes',
    directGold: 'Direct Gold',
    purpleRoute: 'Purple Route',
    blueRoute: 'Blue Route',
    fastest: 'Fastest',
    recommended: 'Recommended',
    lowestSd: 'Lowest Super Dragonite',
    directHint: 'Minimal merging. Highest Super Dragonite cost.',
    purpleHint: 'Best balance of Super Dragonite, gems, and work.',
    blueHint: 'Saves the most Super Dragonite. Most merging work.',
    setTitle: 'Dragon Master six-piece set',
    viewSet: 'Set view',
    viewSlot: 'Slot view',
    selected: 'Selected',
    pieces: 'Pieces',
    selectedPiece: 'Selected piece',
    recipeFor: '{piece} via the {route} route',
    normalGear: 'Normal troop gear',
    normalGearHint: 'Craft these normal troop pieces first at {tier} tier.',
    rawMaterials: 'Raw materials',
    stockpileTitle: 'Full-set material stockpile',
    stockpileHint:
      'Materials required to craft the normal troop gear for one complete Dragon Master set.',
    exactRecipe: 'Exact material recipe',
    normalItem: 'Normal equipment',
    archers: 'Archers',
    footmen: 'Footmen',
    cavalry: 'Cavalry',
    dmPiece: 'Dragon Master piece',
    mergeFour: 'Merge four into the next tier',
    beforeMerge: 'Before gem merging',
    mandatoryGems:
      'Spend remaining Super Dragonite first so the game does not consume it during merging.',
    completePiece: 'Mark gold piece complete',
    reopenPiece: 'Reopen gold piece',
    summary: 'Plan summary',
    route: 'Route',
    completed: 'Completed',
    overallProgress: 'Overall progress',
    nextAction: 'Next best action',
    craftNext: 'Craft next',
    allDone: 'All targeted pieces are complete.',
    resources: 'Resources',
    resourceOwned: 'Owned',
    resourceNeeded: 'Needed',
    resourceShortfall: 'Shortfall',
    superDragonite: 'Super Dragonite',
    dragonite: 'Dragonite',
    gems: 'Gems',
    editResources: 'Edit resources',
    savePlan: 'Save plan',
    exportPlan: 'Export plan (.json)',
    sharePlan: 'Copy share link',
    clearProgress: 'Clear progress',
    details: 'View full resource breakdown',
    tier: 'Tier',
    perPiece: 'Per piece',
    remainingSet: 'Remaining campaign',
    saved: 'Plan saved.',
    exported: 'Plan exported.',
    copied: 'Share link copied.',
    copyFailed: 'Could not copy the share link.',
    armor: 'Armor',
    dagger: 'Dagger',
    ring: 'Ring',
    sword: 'Sword',
    helmet: 'Helmet',
    boots: 'Boots',
    white: 'White',
    green: 'Green',
    blue: 'Blue',
    purple: 'Purple',
    orange: 'Orange',
    gold: 'Gold',
    campaign: 'Five-set campaign',
    campaignHint: 'Build five complete Dragon Master sets: 30 gold pieces in total.',
    campaignSet: 'Set {number}',
    campaignSetsComplete: '{completed} / {total} sets complete',
    campaignPiecesComplete: '{completed} / {total} gold pieces',
    campaignFocused: 'Focused set',
    campaignComplete: 'Five Dragon Master sets complete',
    campaignCompleteHint:
      'Crafting is complete. Continue with equipment enhancement, or reopen a set to review it.',
    campaignReview: 'Review crafting sets',
    inventoryTitle: 'Your DM piece inventory',
    inventoryHint:
      'Enter how many completed gold pieces you currently own. Velo can use this for account reviews.',
    inventoryOwned: 'Owned {piece}',
  },
  enhance: {
    title: 'Enhance Equipment',
    intro: 'Plan advancing completed Dragon Master pieces toward +5, +10, +15, +20, or +25.',
    resourceSuperDragonCore: 'Super Dragon Core',
    resourceExoticCrystal: 'Exotic Crystal',
    resourceDragonCrystal: 'Dragon Crystal',
    currentLevel: 'Current level',
    targetLevel: 'Target level',
    scopePiece: 'One piece',
    scopeSet: 'Full set (6 pieces)',
    owned: 'Owned',
    needed: 'Needed',
    shortfall: 'Shortfall',
    reached: 'Target already reached',
    credit: 'Thanks to Roha and Redbull for contributing the data used by the DM tool.',
  },
  plan: { defaultName: 'VTS DM Set Plan' },
  sets: {
    archers: 'Ranger',
    footmen: 'Dreadnaught',
    cavalry: 'Steel Cavalry',
  },
  equipment: {
    archers: {
      armor: "Ranger's Suit",
      boots: "Ranger's Boots",
      ring: "Ranger's Soul",
      dagger: "Ranger's Heart",
      sword: "Ranger's Long Bow",
      helmet: "Ranger's Headband",
    },
    footmen: {
      armor: "Dreadnaught's Ebony Plate",
      boots: "Dreadnaught's Treads",
      ring: "Dreadnaught's Calling",
      dagger: "Dreadnaught's Bulwark",
      sword: "Dreadnaught's Sabre",
      helmet: "Dreadnaught's Crown",
    },
    cavalry: {
      armor: 'Steel Cavalry Golden Plate',
      boots: 'Steel Cavalry Greaves',
      ring: 'Steel Cavalry Jade Belt',
      dagger: 'Steel Cavalry Cowl',
      sword: 'Steel Cavalry Ranseur',
      helmet: 'Steel Cavalry Feathered Helm',
    },
  },
  items: {
    armor: "Dragon Master's Breastplate",
    boots: "Dragon Master's Sabatons",
    ring: "Dragon Master's Golden Belt",
    dagger: "Dragon Master's Stiletto",
    sword: "Dragon Master's Blade",
    helmet: "Dragon Master's Crown",
  },
  materials: {
    archers: {
      leather: 'Wolf Hide',
      cloth: 'Cotton Cloth',
      rope: 'Hemp Rope',
      wood: 'Walnut Wood',
    },
    cavalry: {
      coil: 'Dragon Tendon',
      claw: 'Claw',
      feather: 'Plume',
      ingot: 'Ingot',
    },
    footmen: {
      order: 'Secret Order',
      ebony: 'Ebony Ore',
      grindstone: 'Grindstone',
      iron: 'Iron Sand',
    },
  },
};

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

function flattenLeaves(value, prefix = '', target = {}) {
  for (const [key, child] of Object.entries(value || {})) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === 'object' && !Array.isArray(child)) {
      flattenLeaves(child, path, target);
    } else {
      target[path] = child;
    }
  }
  return target;
}

function readPath(value, path) {
  return String(path || '')
    .split('.')
    .reduce((current, key) => current?.[key], value);
}

function interpolate(template, values = {}) {
  return Object.entries(values).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, String(value)),
    String(template || '')
  );
}

function placeholders(value) {
  return [...String(value || '').matchAll(/\{([A-Za-z0-9_]+)\}/g)].map((match) => match[1]).sort();
}

function normalizeLocale(locale) {
  const primary = String(locale || 'en')
    .toLowerCase()
    .split('-')[0];
  const normalized = primary === 'ko' ? 'kr' : primary;
  return SUPPORTED_LOCALES.includes(normalized) ? normalized : 'en';
}

deepFreeze(CANONICAL_PACK);
const CANONICAL_LEAVES = Object.freeze(flattenLeaves(CANONICAL_PACK));
const REQUIRED_LOCALIZED_MATERIAL_IDS = Object.freeze(
  Object.keys(flattenLeaves(CANONICAL_PACK.materials, 'materials'))
);
const REQUIRED_LOCALIZED_DISPLAY_IDS = Object.freeze(
  ['sets', 'equipment', 'items'].flatMap((group) =>
    Object.keys(flattenLeaves(CANONICAL_PACK[group], group))
  )
);

export const DM_MATERIAL_LOCALES = SUPPORTED_LOCALES;
export const DM_MATERIAL_MESSAGE_IDS = Object.freeze(Object.keys(CANONICAL_LEAVES));
export const DM_PLANNER_FIELDS = Object.freeze(Object.keys(CANONICAL_PACK.planner));
export const DM_ENHANCE_FIELDS = Object.freeze(Object.keys(CANONICAL_PACK.enhance));
export const DM_COPY_FALLBACKS = CANONICAL_PACK.planner;
export const DM_ENHANCE_FALLBACKS = CANONICAL_PACK.enhance;
const dmCatalogSuffix = (field) => `${field.charAt(0).toUpperCase()}${field.slice(1)}`;
const DM_ENHANCE_CATALOG_KEYS = Object.freeze({
  resourceSuperDragonCore: 'dmEnhanceResSuperDragonCore',
  resourceExoticCrystal: 'dmEnhanceResExoticCrystal',
  resourceDragonCrystal: 'dmEnhanceResDragonCrystal',
});
export const DM_ENGLISH_CATALOG = Object.freeze({
  ...Object.fromEntries(
    DM_PLANNER_FIELDS.map((field) => [
      `dmPlanner${dmCatalogSuffix(field)}`,
      CANONICAL_PACK.planner[field],
    ])
  ),
  ...Object.fromEntries(
    DM_ENHANCE_FIELDS.map((field) => [
      DM_ENHANCE_CATALOG_KEYS[field] || `dmEnhance${dmCatalogSuffix(field)}`,
      CANONICAL_PACK.enhance[field],
    ])
  ),
});

const packs = new Map([['en', CANONICAL_PACK]]);
const inFlight = new Map();
let activeLocale = 'en';
let requestedLocale = 'en';

function normalizePack(pack) {
  if (!pack || typeof pack !== 'object') return null;
  return deepFreeze(structuredClone(pack));
}

function mergeDisplayGroup(group, overrides) {
  const canonical = structuredClone(CANONICAL_PACK[group]);
  if (!overrides || typeof overrides !== 'object') return canonical;
  for (const [key, value] of Object.entries(overrides)) {
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      canonical[key] &&
      typeof canonical[key] === 'object'
    ) {
      canonical[key] = { ...canonical[key], ...value };
    } else {
      canonical[key] = value;
    }
  }
  return canonical;
}

export function defineDmMaterialsPack({
  planner,
  enhance,
  planName,
  sets,
  equipment,
  items,
  materials,
}) {
  const plannerCopy = Array.isArray(planner)
    ? Object.fromEntries(DM_PLANNER_FIELDS.map((field, index) => [field, planner[index]]))
    : { ...(planner || {}) };
  const enhanceCopy = Array.isArray(enhance)
    ? Object.fromEntries(DM_ENHANCE_FIELDS.map((field, index) => [field, enhance[index]]))
    : { ...(enhance || {}) };
  return normalizePack({
    __authoredMaterialIds: Object.keys(flattenLeaves(materials || {}, 'materials')),
    __authoredDisplayIds: [
      ...Object.keys(flattenLeaves(sets || {}, 'sets')),
      ...Object.keys(flattenLeaves(equipment || {}, 'equipment')),
      ...Object.keys(flattenLeaves(items || {}, 'items')),
    ],
    planner: plannerCopy,
    enhance: enhanceCopy,
    plan: { defaultName: planName },
    sets: mergeDisplayGroup('sets', sets),
    equipment: mergeDisplayGroup('equipment', equipment),
    items: mergeDisplayGroup('items', items),
    materials: mergeDisplayGroup('materials', materials),
  });
}

export async function loadDmMaterialsLocale(locale = 'en') {
  const normalized = normalizeLocale(locale);
  requestedLocale = normalized;
  if (!packs.has(normalized) && normalized !== 'en') {
    if (!inFlight.has(normalized)) {
      inFlight.set(
        normalized,
        import('./packs.js')
          .then((module) => {
            const pack = normalizePack(module.DM_MATERIAL_PACKS?.[normalized]);
            if (!pack) throw new Error(`Missing DM Materials pack: ${normalized}`);
            packs.set(normalized, pack);
            return pack;
          })
          .catch((error) => {
            console.warn(
              `[dm-materials-i18n] Failed to load ${normalized}; using canonical English.`,
              error
            );
            return CANONICAL_PACK;
          })
          .finally(() => inFlight.delete(normalized))
      );
    }
    await inFlight.get(normalized);
  }
  if (requestedLocale === normalized) activeLocale = packs.has(normalized) ? normalized : 'en';
  return packs.get(normalized) || CANONICAL_PACK;
}

export function getActiveDmMaterialsLocale() {
  return activeLocale;
}

export function getDmMaterialsPack(locale = activeLocale) {
  return packs.get(normalizeLocale(locale)) || CANONICAL_PACK;
}

export function dmMaterialsText(id, values = {}, locale = activeLocale) {
  const canonical = CANONICAL_LEAVES[id] || '';
  const localized = readPath(getDmMaterialsPack(locale), id);
  return interpolate(typeof localized === 'string' && localized ? localized : canonical, values);
}

export function getDmPlannerCopy(locale = activeLocale) {
  return Object.freeze(
    Object.fromEntries(
      DM_PLANNER_FIELDS.map((field) => [field, dmMaterialsText(`planner.${field}`, {}, locale)])
    )
  );
}

export function dmMaterialsSearchText(id, locale = activeLocale) {
  const canonical = String(CANONICAL_LEAVES[id] || '');
  const localized = dmMaterialsText(id, {}, locale);
  return localized === canonical
    ? canonical.toLocaleLowerCase()
    : `${localized} ${canonical}`.toLocaleLowerCase();
}

export function auditDmMaterialsPack(pack, { locale = 'unknown' } = {}) {
  const missing = [];
  const placeholderMismatches = [];
  const authoredMaterialIds = new Set(
    Array.isArray(pack?.__authoredMaterialIds) ? pack.__authoredMaterialIds : []
  );
  const authoredDisplayIds = new Set(
    Array.isArray(pack?.__authoredDisplayIds) ? pack.__authoredDisplayIds : []
  );
  const missingLocalizedMaterials = REQUIRED_LOCALIZED_MATERIAL_IDS.filter(
    (id) => !authoredMaterialIds.has(id)
  );
  const missingLocalizedDisplayNames = REQUIRED_LOCALIZED_DISPLAY_IDS.filter(
    (id) => !authoredDisplayIds.has(id)
  );
  for (const id of DM_MATERIAL_MESSAGE_IDS) {
    const value = readPath(pack, id);
    if (typeof value !== 'string' || !value.trim()) {
      missing.push(id);
      continue;
    }
    const expected = placeholders(CANONICAL_LEAVES[id]);
    const actual = placeholders(value);
    if (expected.join('|') !== actual.join('|')) placeholderMismatches.push(id);
  }
  return Object.freeze({
    locale,
    complete:
      missing.length === 0 &&
      placeholderMismatches.length === 0 &&
      missingLocalizedMaterials.length === 0 &&
      missingLocalizedDisplayNames.length === 0,
    missing: Object.freeze(missing),
    placeholderMismatches: Object.freeze(placeholderMismatches),
    missingLocalizedMaterials: Object.freeze(missingLocalizedMaterials),
    missingLocalizedDisplayNames: Object.freeze(missingLocalizedDisplayNames),
  });
}

export function getCanonicalDmMaterialsText(id) {
  return String(CANONICAL_LEAVES[id] || '');
}
