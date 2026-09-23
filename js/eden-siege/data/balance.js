// Balance tables for Eden Siege. Numbers only — no behaviour lives here, so a
// designer can retune the game without touching the simulation or the renderer.
//
// Units are "world units" (1 unit ~= 1 metre) and milliseconds.

export const STEP_HZ = 60;
export const STEP_MS = 1000 / STEP_HZ;
export const MAX_STEPS_PER_FRAME = 5;

export const PLAYER = {
  radius: 0.62,
  speed: 7.4,
  accel: 42,
  friction: 12,
  maxHp: 100,
  respawnMs: 3200,
  respawnHpRatio: 0.6,
  // Attack: a bolt fired at the nearest enemy in range, aimed by movement when
  // nothing is in range. Ice slows and chips; fire hits harder and burns.
  attackRange: 11.5,
  attackCdMs: 330,
  boltSpeed: 19,
  boltRadius: 0.45,
  ice: { damage: 9, slowMs: 1500, slowFactor: 0.45 },
  fire: { damage: 13, burnMs: 3000, burnDps: 4 },
  hitInvulnMs: 600,
};

export const NOVA = {
  maxCharge: 100,
  chargePerKill: 9,
  damage: 72,
  radius: 12.5,
  knockback: 7,
  slowMs: 2600,
};

export const COMBO = {
  // Combo climbs while kills keep landing and resets when the chain breaks.
  // It gates score, so it is the difference between finishing a wave and
  // finishing it well.
  perKill: 0.25,
  max: 4,
  decayMs: 2600,
};

export const CORE = {
  maxHp: 120,
  radius: 3.05,
  hitFlashMs: 320,
};

export const GOLD = {
  start: 45,
  // Pickup value by enemy tier; the tier also chooses which material icon the
  // enemy drops (see data/theme.js).
  byTier: { 1: 3, 2: 5, 3: 8, 4: 14 },
  magnetRadius: 3.2,
  pickupTtlMs: 14000,
};

export const TOWERS = {
  frost: {
    labelKey: 'towerFrost',
    cost: 60,
    upgradeCosts: [55, 95],
    range: 8.8,
    cdMs: 900,
    damage: 6,
    slowMs: 1400,
    slowFactor: 0.5,
    projectileSpeed: 15,
    maxHp: 70,
  },
  ember: {
    labelKey: 'towerEmber',
    cost: 75,
    upgradeCosts: [65, 115],
    range: 9.6,
    cdMs: 1550,
    damage: 15,
    splash: 2.7,
    projectileSpeed: 13,
    maxHp: 70,
  },
};

export const WAVES = [
  { element: 'ice', intervalMs: 950, reward: 25, groups: [{ kind: 'ranger', tier: 1, count: 4 }] },
  {
    element: 'ice',
    intervalMs: 900,
    reward: 30,
    groups: [
      { kind: 'ranger', tier: 1, count: 4 },
      { kind: 'cavalry', tier: 1, count: 2 },
    ],
  },
  {
    element: 'fire',
    intervalMs: 880,
    reward: 35,
    groups: [
      { kind: 'cavalry', tier: 2, count: 4 },
      { kind: 'ranger', tier: 1, count: 3 },
    ],
  },
  {
    element: 'fire',
    intervalMs: 860,
    reward: 40,
    groups: [
      { kind: 'dreadnought', tier: 2, count: 2 },
      { kind: 'ranger', tier: 2, count: 4 },
    ],
  },
  {
    element: 'mixed',
    intervalMs: 820,
    reward: 50,
    groups: [
      { kind: 'cavalry', tier: 3, count: 5 },
      { kind: 'ranger', tier: 2, count: 4 },
    ],
  },
  {
    element: 'ice',
    intervalMs: 800,
    reward: 55,
    groups: [
      { kind: 'dreadnought', tier: 3, count: 3 },
      { kind: 'cavalry', tier: 2, count: 4 },
    ],
  },
  {
    element: 'fire',
    intervalMs: 780,
    reward: 60,
    groups: [
      { kind: 'ranger', tier: 3, count: 6 },
      { kind: 'cavalry', tier: 3, count: 4 },
    ],
  },
  {
    element: 'mixed',
    intervalMs: 760,
    reward: 70,
    groups: [
      { kind: 'dreadnought', tier: 3, count: 3 },
      { kind: 'ranger', tier: 3, count: 5 },
      { kind: 'cavalry', tier: 3, count: 3 },
    ],
  },
  {
    element: 'ice',
    intervalMs: 740,
    reward: 85,
    groups: [
      { kind: 'dreadnought', tier: 4, count: 3 },
      { kind: 'cavalry', tier: 4, count: 5 },
    ],
  },
  {
    element: 'mixed',
    boss: true,
    intervalMs: 700,
    reward: 140,
    groups: [
      { kind: 'dreadnought', tier: 4, count: 4 },
      { kind: 'ranger', tier: 4, count: 6 },
      { kind: 'cavalry', tier: 4, count: 4 },
    ],
  },
];

export const ENEMY_KINDS = {
  ranger: {
    labelKey: 'enemyRanger',
    hp: 19,
    speed: 2.15,
    damage: 6,
    attackCdMs: 1500,
    range: 7.4,
    radius: 0.56,
    ranged: true,
    aggroRadius: 9,
    score: 10,
    projectileSpeed: 9,
  },
  cavalry: {
    labelKey: 'enemyCavalry',
    hp: 32,
    speed: 3.45,
    damage: 9,
    attackCdMs: 1100,
    range: 1.25,
    radius: 0.6,
    ranged: false,
    aggroRadius: 6.5,
    score: 14,
  },
  dreadnought: {
    labelKey: 'enemyDreadnought',
    hp: 82,
    speed: 1.5,
    damage: 17,
    attackCdMs: 1800,
    range: 1.6,
    radius: 0.88,
    ranged: false,
    aggroRadius: 5,
    score: 26,
  },
};

// Per-tier scaling: tier is the wave's material grade, and it maps to the four
// stockpile icon grades we already ship for each troop type.
export const TIER_SCALE = {
  hp: [0, 1, 1.5, 2.2, 3.1],
  damage: [0, 1, 1.3, 1.7, 2.2],
  speed: [0, 1, 1.08, 1.16, 1.24],
  score: [0, 1, 1.35, 1.8, 2.4],
};

export const BUILD_PHASE_MS = [12000, 9000, 8000, 8000, 7000, 7000, 6500, 6500, 6000, 6000];

export const SCORE = {
  waveClear: 50,
  coreHpBonus: 200,
  survivalBonusPerSecond: 2,
};
