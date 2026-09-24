// Source-grounded data for the Eden Operations Lab.
//
// Community sheets are advisory and can drift from the current game. Values keep
// their display precision from the supplied references; gaps stay null rather
// than being interpolated.

export const EDEN_OPERATIONS_SOURCES = Object.freeze({
  specialtyGuide: Object.freeze({
    id: 'l96-eden-specialty-guide',
    title: 'A brief guide about Eden Specialty',
    author: 'DonPablone · Legion 96',
    url: 'https://sites.google.com/view/l96/knowledge-base/roceden/a-very-brief-guide-about-eden-specialty',
    published: '2021-10-19',
    status: 'community-guidance',
  }),
  specialtyHonor: Object.freeze({
    id: 'l96-honor-by-level',
    title: 'Specialty Level — Honor needed by level',
    author: 'DonPablone · Legion 96',
    url: 'https://l96.app/public/specialty-level-honor-needed-by-level',
    suppliedImage: 'codex-clipboard-60aa3960-fe6b-448b-8829-cf2a31c616d3.png',
    status: 'community-sheet',
  }),
  trainingComparison: Object.freeze({
    id: 'l96-honor-boost-training',
    title: 'Honor Boost × Special Training Comparison',
    url: 'https://l96.app/public/honor-boost-x-special-training-comparison',
    suppliedImage: 'codex-clipboard-b5689010-089b-45f6-bcdf-e3146b9c05fa.png',
    status: 'community-sheet',
  }),
  buildingCosts: Object.freeze({
    id: 'l96-eden-building-costs',
    title: 'Eden honor-building material requirements',
    url: 'https://l96.app/public/honor-building-costs',
    suppliedImages: Object.freeze([
      'codex-clipboard-db774676-e64f-44d6-9059-0d83e0b13cd5.png',
      'codex-clipboard-bbc3c4ec-b020-4ad4-8608-a487f441560f.png',
    ]),
    status: 'community-sheet',
  }),
  tilingAndSiege: Object.freeze({
    id: 'l96-eden-tiling-buildings',
    title: 'Effective tiling, Coalition Camps, and Eden buildings',
    url: 'https://l96.app/public/chaos-sheet',
    suppliedImage: 'codex-clipboard-b12d0be1-9925-4b62-9298-45a0df5fd697.png',
    status: 'community-sheet',
  }),
});

export const TILE_LEVELS = Object.freeze([
  { level: 1, loyalty: 0, resistance: 1, influence: 50, honor: 4000 },
  { level: 2, loyalty: 0, resistance: 2, influence: 100, honor: 4810 },
  { level: 3, loyalty: 200, resistance: 4, influence: 200, honor: 5620 },
  { level: 4, loyalty: 200, resistance: 6, influence: 400, honor: 6430 },
  { level: 5, loyalty: 600, resistance: 10, influence: 600, honor: 7240 },
  { level: 6, loyalty: 1000, resistance: 12, influence: 900, honor: 8050 },
  { level: 7, loyalty: 1400, resistance: 14, influence: 1400, honor: 8859 },
  { level: 8, loyalty: 1800, resistance: 16, influence: 2100, honor: 9669 },
  { level: 9, loyalty: 2700, resistance: 20, influence: 3100, honor: 10479 },
  { level: 10, loyalty: 3300, resistance: 22, influence: 4600, honor: 11289 },
  { level: 11, loyalty: 3900, resistance: 24, influence: 6900, honor: 12100 },
  { level: 12, loyalty: 4800, resistance: 30, influence: 11000, honor: 12912 },
  { level: 13, loyalty: 5600, resistance: 32, influence: 16000, honor: 13720 },
  { level: 14, loyalty: 6400, resistance: 34, influence: 24000, honor: 14530 },
  { level: 15, loyalty: 7200, resistance: 36, influence: 35000, honor: 15340 },
  { level: 16, loyalty: 8000, resistance: 45, influence: 52000, honor: 16200 },
]);

export const BLUE_LOYALTY_SPECIALTY = Object.freeze([
  { rank: 0, specialtyPoints: 0, extraLoyalty: 0 },
  ...[10, 11, 12, 13, 14, 21, 22, 23, 24, 25, 32, 33, 34, 35, 36, 43, 44, 45, 46, 47].map(
    (specialtyPoints, index) => ({
      rank: index + 1,
      specialtyPoints,
      extraLoyalty: (index + 1) * 60,
    })
  ),
]);

const WORKSHOP_COSTS = Object.freeze([
  0, 685, 2290, 4110, 7400, 13330, 23990, 43180, 77730, 139920, 251860, 302230,
  362670, 435210, 522250, 626700, 752040, 902450, 1082940, 1299530,
]);

export const BUILDING_UPGRADE_COSTS = Object.freeze({
  workshop: WORKSHOP_COSTS,
  // Transcribed from the sheet's own Fortress column, not derived from Workshop:
  // the sheet prints Fortress at finer precision (22.86K), and x10 of the rounded
  // Workshop figure (2.29K) would invent 22.90K.
  fortress: Object.freeze([
    0, 6850, 22860, 41140, 74050, 133290, 239920, 431860, 777340, 1399000, 2519000,
    3022000, 3627000, 4352000, 5223000, 6267000, 7520000, 9025000, 10829000, 12995000,
  ]),
  ac1: Object.freeze([
    0, 700, 2500, 4400, 8000, 14400, 25900, 46500, 83800, 150800, 271400, 325700,
    390800, 469000, 562800, 675400, 810500, 972600, 1167000, 1401000,
  ]),
  ac2: Object.freeze([
    0, 2200, 7400, 13300, 23900, 43100, 77600, 139600, 251300, 452300, 814100,
    977100, 1173000, 1407000, 1688000, 2026000, 2431000, 2918000, 3501000, 4201000,
  ]),
  ac3: Object.freeze([
    0, 4400, 14800, 26600, 47900, 86200, 155100, 279200, 502600, 904700, 1629000,
    1954000, 2345000, 2814000, 3377000, 4052000, 4863000, 5835000, 7002000, 8403000,
  ]),
  ac4: Object.freeze([
    0, 7400, 24600, 44300, 79800, 143600, 258500, 465400, 837700, 1508000, 2714000,
    3257000, 3908000, 4690000, 5628000, 6753000, 8104000, 9725000, 11670000, 14004000,
  ]),
});

export const BUILDING_DISCOUNTS = Object.freeze([
  { id: 'none', rate: 0, label: 'No discount' },
  { id: 'green', rate: 0.27, label: 'Green specialty · 27%' },
  { id: 'green-architect', rate: 0.36, label: 'Green + alliance Architect · 36%' },
  { id: 'full-architect', rate: 0.56, label: 'Green + alliance + personal Architect · 56%' },
]);

// The supplied building-cost references do not contain upgrade-honor rewards.
// Keep a typed extension point instead of treating material costs as Honor.
export const BUILDING_HONOR_YIELDS = Object.freeze({
  workshop: null,
  fortress: null,
  ac1: null,
  ac2: null,
  ac3: null,
  ac4: null,
  status: 'not-supplied',
});

export const EDEN_STRUCTURES = Object.freeze([
  { id: 'gate-1', group: 'Gate', level: 1, occupation: 5, factionPoints: 0, loyalty: 2700, durability: 200000, damageLoyalty: 1800, damageDurability: 160000, attackers: 2, support: 8, bannerAttackers: 1, bannerSupport: 4 },
  { id: 'gate-2', group: 'Gate', level: 2, occupation: 5, factionPoints: 0, loyalty: 3600, durability: 400000, damageLoyalty: 2700, damageDurability: 300000, attackers: 5, support: 15, bannerAttackers: 3, bannerSupport: 7 },
  { id: 'gate-3', group: 'Gate', level: 3, occupation: 5, factionPoints: 0, loyalty: 4200, durability: 1200000, damageLoyalty: 3200, damageDurability: 1000000, attackers: 10, support: 50, bannerAttackers: 5, bannerSupport: 23 },
  { id: 'gate-4', group: 'Gate', level: 4, occupation: 5, factionPoints: 0, loyalty: 5000, durability: 1500000, damageLoyalty: 3600, damageDurability: 1200000, attackers: 15, support: 60, bannerAttackers: 7, bannerSupport: 28 },
  { id: 'gate-5', group: 'Gate', level: 5, occupation: 5, factionPoints: 0, loyalty: 6400, durability: 2000000, damageLoyalty: 4200, damageDurability: 1600000, attackers: 20, support: 80, bannerAttackers: 10, bannerSupport: 36 },
  { id: 'city-1', group: 'City', level: 1, occupation: 15, factionPoints: 0, loyalty: 4800, durability: 1500000, damageLoyalty: 3000, damageDurability: 1200000, attackers: 15, support: 60, bannerAttackers: 7, bannerSupport: 28 },
  { id: 'city-2', group: 'City', level: 2, occupation: 20, factionPoints: 0, loyalty: 5200, durability: 2000000, damageLoyalty: 3600, damageDurability: 1600000, attackers: 20, support: 80, bannerAttackers: 10, bannerSupport: 36 },
  { id: 'city-3', group: 'City', level: 3, occupation: 30, factionPoints: 0, loyalty: 5600, durability: 3500000, damageLoyalty: 4200, damageDurability: 2800000, attackers: 35, support: 140, bannerAttackers: 16, bannerSupport: 64 },
  { id: 'capital-4', group: 'Capital', level: 4, occupation: 50, factionPoints: 50, loyalty: 6000, durability: 3750000, damageLoyalty: 4500, damageDurability: 3000000, attackers: 38, support: 150, bannerAttackers: 18, bannerSupport: 68 },
  { id: 'capital-5', group: 'Capital', level: 5, occupation: 70, factionPoints: 0, loyalty: 6400, durability: 4000000, damageLoyalty: 4800, damageDurability: 3200000, attackers: 40, support: 160, bannerAttackers: 19, bannerSupport: 72 },
  { id: 'capital-6', group: 'Capital', level: 6, occupation: 100, factionPoints: 300, loyalty: 7000, durability: 4500000, damageLoyalty: 5200, damageDurability: 3600000, attackers: 45, support: 180, bannerAttackers: 21, bannerSupport: 82 },
  { id: 'temple-7', group: 'Temple', level: 7, occupation: 600, factionPoints: 800, loyalty: 8000, durability: 5000000, damageLoyalty: 5600, damageDurability: 4000000, attackers: 50, support: 200, bannerAttackers: 23, bannerSupport: 91 },
  { id: 'stronghold', group: 'Stronghold', level: null, occupation: 10, factionPoints: 0, loyalty: 3000, durability: 1000000, damageLoyalty: 2000, damageDurability: 800000, attackers: 10, support: 40, bannerAttackers: 5, bannerSupport: 18 },
]);

export const SPECIALTY_ROUTE_MILESTONES = Object.freeze({
  green: Object.freeze([
    { id: 'green-buildings', name: 'Honor buildings', critical: 22, essential: 49, advanced: 59, summary: 'Building Honor, material savings, and optional tile capacity.', caution: 'Use the lower material-discount route; the upper route discounts ordinary resources only.' },
    { id: 'green-resources', name: 'Extra resources', critical: 9, essential: 17, advanced: 26, summary: 'Wood and iron first, then optional food and marble production.' },
    { id: 'green-land', name: 'Land Honor & development', critical: 17, essential: 40, advanced: 50, summary: 'Tile Honor, nearby production, and optional extra tile capacity.', caution: 'Tile march-speed branches are situational.' },
  ]),
  blue: Object.freeze([
    { id: 'blue-fortress', name: 'Extra fortresses', critical: 10, essential: 17, advanced: 24, summary: 'Unlock up to three extra Assault and Guardian Fortress pairs.', caution: 'Build the unlocked fortresses before resetting; prefer the construction-speed route.' },
    { id: 'blue-loyalty', name: 'Loyalty', critical: 14, essential: 36, advanced: 47, summary: 'Up to +300 Loyalty per Coalition Camp (+1,200 with four).' },
    { id: 'blue-production', name: 'Production slots', critical: 10, essential: 17, advanced: 31, summary: 'Up to four extra processing slots; favor processing speed.' },
    { id: 'blue-demolition', name: 'Demolition', critical: 20, essential: 36, advanced: 42, summary: 'Passive demolition, an active +50 boost, and a high-variance siege skill.' },
  ]),
  red: Object.freeze([
    { id: 'red-guardians', name: 'Guardians', critical: 42, essential: 51, advanced: null, summary: 'Defensive siege and Guardian/bodyguard skills.' },
    { id: 'red-berserkers', name: 'Berserkers', critical: 42, essential: 56, advanced: null, summary: 'Banner, tile fighting, stamina, and demolition.', caution: 'A lean 28-point route can capture many core level-5 nodes without the banner.' },
    { id: 'red-dragon', name: 'Dragon Lord', critical: 47, essential: 61, advanced: null, summary: 'Offensive siege, piercing Dragons, and removing enemy Guardians.', caution: 'Less useful in Eden where Dragons are unavailable and long-range attacks are reduced.' },
  ]),
});

export const SPECIALTY_PRESETS = Object.freeze([
  { id: 'starter', name: 'Starter', tone: 'blue', critical: 24, essential: 46, advanced: 73, routeOrder: ['blue-fortress', 'green-buildings'], summary: 'Opening build: unlock fortresses, place Honor buildings, then pivot into material discounts and building Honor.' },
  { id: 'conqueror', name: 'Conqueror', tone: 'blue', critical: 47, essential: 73, advanced: 90, routeOrder: ['blue-loyalty', 'blue-production', 'green-resources'], summary: 'General season build: max Blue Loyalty, then add processing and Green resource production.' },
  { id: 'development', name: 'Development', tone: 'green', critical: 32, essential: 48, advanced: 93, routeOrder: ['green-buildings', 'blue-production', 'green-resources'], summary: 'Workshop/Fortress push: discounts, production slots, and extra building Honor.' },
  { id: 'demolition', name: 'Demolition', tone: 'red', critical: 36, essential: 59, advanced: 76, routeOrder: ['blue-demolition', 'blue-production', 'green-land'], summary: 'Objective damage first, then production and optional Green tile speed.' },
]);

// The public guide publishes route purposes and milestone totals, but not a
// machine-readable node/edge graph. This deliberately models only what the
// source supports. `topologyStatus` lets a future verified node import extend
// the planner without migrating saved route allocations.
export const SPECIALTY_TREE_SCHEMA = Object.freeze(
  Object.entries(SPECIALTY_ROUTE_MILESTONES).map(([id, routes]) =>
    Object.freeze({
      id,
      name: `${id[0].toUpperCase()}${id.slice(1)} tree`,
      purpose:
        id === 'green'
          ? 'Development, Honor, resources, and tile growth'
          : id === 'blue'
            ? 'Season setup, Loyalty, production, and demolition'
            : 'Castle combat, siege offense, and siege defense',
      topologyStatus: 'route-milestones-only',
      routes,
    })
  )
);

export const SPECIALTY_DATA_GAPS = Object.freeze([
  'Exact in-game node names, ranks, coordinates, prerequisites, and effects are not published as structured data in the supplied guide.',
  'The supplied Honor chart omits specialty levels 101–110.',
  'The supplied building sheets contain material costs, not Honor rewards for upgrading.',
  'Community values may drift after game balance changes; confirm high-stakes season decisions in game.',
]);

function valuesForRange(startLevel, values, unit = 1) {
  return values.map((value, index) => ({
    level: startLevel + index,
    honor: value == null ? null : value * unit,
  }));
}

const HONOR_ROWS = [
  ...valuesForRange(1, [0, 8, 20.4, 35.1, 51.8, 70, 179, 276, 396, 619, 535, 812], 1000),
  ...valuesForRange(13, [1.2, 1.5, 2, 2.5, 3.4, 3.7, 4, 4.2, 4.6, 4.9, 5.2, 5.5, 5.8, 6.2, 6.5, 6.8, 7.2, 7.5, 7.9, 8.2, 8.6, 8.9, 9.3, 9.7, 10.1, 10.5, 10.9, 11.2], 1000000),
  ...valuesForRange(41, [11.6, 12.3, 12.7, 13.1, 13.5, 13.9, 14.3, 14.7, 15.2, 15.6, 16, 16.4, 16.9, 17.3, 17.8, 18.2, 18.7, 19.1, 19.6, 20], 1000000),
  ...valuesForRange(61, [20.5, 20.9, 21.4, 21.9, 22.3, 22.8, 23.3, 23.8, 24.2, 24.7, 25.2, 25.7, 26.2, 26.7, 27.2, 27.7, 28.2, 28.7, 29.2, 29.7], 1000000),
  ...valuesForRange(81, [30.2, 31.5, 32, 32.6, 33.1, 33.6, 34.1, 34.7, 35.2, 35.8, 36.3, 36.8, 37.4, 37.9, 38.5, 39.1, 39.6, 40.2, 40.7, 41.3], 1000000),
  ...valuesForRange(101, Array(10).fill(null)),
  ...valuesForRange(111, [47.5, 48.1, 48.7, 49.3, 49.9, 50.5, 51.1, 51.7, 52.3, 52.9, 53.5, 57.1, 67, 73.5, 78.2, 82.9, 86.5, 89.7, 92.4, 95.1], 1000000),
  ...valuesForRange(131, [97.5, 99.8, 102, 104, 106, 110, 111, 112, 113, 114, 115, 136, 145], 1000000),
];

const PUBLISHED_CUMULATIVE = new Map([
  [20, 25.3e6], [40, 180.6e6], [60, 497.5e6], [80, 997.8e6], [100, 1718.4e6],
  [111, 2209.6e6], [120, 2663.9e6], [130, 3439.8e6], [131, 3537.3e6], [132, 3637.1e6],
  [133, 3739.1e6], [134, 3843.1e6], [135, 3949.1e6], [136, 4059.1e6], [137, 4170.1e6],
  [138, 4282.1e6], [139, 4395.1e6], [140, 4509.1e6], [141, 4624.1e6], [142, 4760.1e6],
  [143, 4905.1e6],
]);

let running = 0;
export const SPECIALTY_HONOR_LEVELS = Object.freeze(
  HONOR_ROWS.map((entry) => {
    if (entry.honor != null) running += entry.honor;
    const publishedCumulative = PUBLISHED_CUMULATIVE.get(entry.level) ?? null;
    return Object.freeze({
      ...entry,
      cumulative: publishedCumulative ?? (entry.level <= 100 ? running : null),
      cumulativeStatus:
        publishedCumulative != null
          ? 'published-rounded'
          : entry.level <= 100
            ? 'calculated-from-rounded-source'
            : 'unavailable',
      status: entry.honor == null ? 'not-visible-in-supplied-chart' : 'published-rounded',
    });
  })
);

export const TRAINING_MODES = Object.freeze({
  special: Object.freeze({ id: 'special', name: 'Special Training', actionFactor: 1, bannerActionFactor: 0 }),
  boost: Object.freeze({ id: 'boost', name: 'Honor Boost', actionFactor: 0.6, bannerActionFactor: 0.6 }),
  oldBoost: Object.freeze({ id: 'oldBoost', name: 'Old Boost', actionFactor: 1, bannerActionFactor: 1 }),
});

// Task-first entry points into the planners. Stage and role tags are navigation
// aids for this tool, not game data: every step points at a planner input that
// is already backed by the sources above. Each step names the copy key of the
// planner field or result it points at, so the checklist reads exactly like the
// control the player has to find.
export const EDEN_OPERATION_PLAYBOOKS = Object.freeze([
  { id: 'specialty-build', tool: 'specialty', icon: '🌳', stage: 'opening', roles: ['builder', 'tiler', 'attacker'], steps: ['preset', 'availablePoints', 'routePoints'] },
  { id: 'material-budget', tool: 'buildings', icon: '🏗️', stage: 'opening', roles: ['builder'], steps: ['building', 'targetLevel', 'discount'] },
  { id: 'hold-tile', tool: 'siege', icon: '🛡️', stage: 'growth', roles: ['builder', 'tiler'], steps: ['campLevels', 'specialtyRank', 'upgradeOrder'] },
  { id: 'honor-farming', tool: 'training', icon: '⚔️', stage: 'growth', roles: ['tiler'], steps: ['tileLevel', 'sessions', 'boosted'] },
  { id: 'honor-target', tool: 'honor', icon: '📈', stage: 'growth', roles: ['builder', 'tiler', 'attacker'], steps: ['currentLevel', 'targetLevel', 'honorRequired'] },
  { id: 'staff-objective', tool: 'siege', icon: '🏰', stage: 'war', roles: ['attacker'], steps: ['structure', 'banner', 'assigned'] },
]);

export const EDEN_OPERATION_STAGES = Object.freeze(['opening', 'growth', 'war']);
export const EDEN_OPERATION_ROLES = Object.freeze(['builder', 'tiler', 'attacker']);

export const SPECIALTY_BONUS_PRESETS = Object.freeze([0, 0.3, 0.9, 1.9]);

export const EDEN_OPERATIONS_DATA_VERSION = '2026-09-11';
