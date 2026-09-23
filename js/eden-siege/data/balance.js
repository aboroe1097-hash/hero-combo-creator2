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
    upgradeCosts: [55, 95, 140, 200],
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
    upgradeCosts: [65, 115, 165, 235],
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
    boss: true,
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
  // The elite that leads every fifth wave. It borrows the dreadnought's art and
  // adds a telegraphed ground slam (see BOSS), which is what makes the dash
  // worth learning.
  warlord: {
    labelKey: 'enemyWarlord',
    art: 'dreadnought',
    hp: 240,
    speed: 1.3,
    damage: 24,
    attackCdMs: 2000,
    range: 1.9,
    radius: 1.3,
    ranged: false,
    aggroRadius: 9,
    score: 320,
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

// ── Towers past level three ─────────────────────────────────────────────────
// Five tiers; each one changes the model (see engine/renderer.js) so a glance
// at the lane says how far a tower has been pushed.
export const TOWER_MAX_LEVEL = 5;
export const TOWER_TIER = {
  damage: 0.55,
  cooldown: 0.08,
  range: 0.06,
  splash: 0.12,
  hp: 0.35,
};

// ── Velo's kit ──────────────────────────────────────────────────────────────
export const CRIT = { chance: 0.12, mult: 1.8 };

// A dash is a short burst with a longer window of invulnerability than the
// burst itself, so a well-timed dash through a slam or a volley is safe.
export const DASH = { speed: 21, durationMs: 170, iframeMs: 300, cooldownMs: 1500 };

// The ultimate charges slowly from kills and cleared waves. While it is live
// Velo fires faster, harder, and every bolt carries both wings: ice slow and
// fire burn, with a small splash.
export const ULT = {
  maxCharge: 100,
  perKill: 3.2,
  perWave: 18,
  durationMs: 6500,
  attackCdMult: 0.45,
  damageMult: 1.4,
  splash: 1.9,
};

// ── Enemy modifiers ─────────────────────────────────────────────────────────
// Each one is answered by a wing: Fire burns through armour (burn ignores it),
// Ice shatters shields (ice damage counts double against them), and swift
// units are what the slow exists for.
export const MODIFIERS = {
  armored: { hpMult: 1.15, directDamageMult: 0.55 },
  swift: { hpMult: 0.8, speedMult: 1.5 },
  shielded: { shieldRatio: 0.45, iceShieldMult: 2 },
};
export const MODIFIER_ORDER = ['armored', 'swift', 'shielded'];
export const MODIFIER_ROLL = { fromWave: 4, perWave: 0.07, max: 0.5 };

export function modifierChance(wave) {
  if (wave < MODIFIER_ROLL.fromWave) return 0;
  return Math.min(MODIFIER_ROLL.max, (wave - MODIFIER_ROLL.fromWave + 1) * MODIFIER_ROLL.perWave);
}

// ── Boss waves ──────────────────────────────────────────────────────────────
export const BOSS = {
  every: 5,
  kind: 'warlord',
  tier: 4,
  // Extra health per boss cycle (wave 10 is cycle 1, wave 15 cycle 2, ...).
  hpPerCycle: 0.55,
  escortHpMult: 1,
  slamEveryMs: 5200,
  slamFirstMs: 2600,
  telegraphMs: 1300,
  slamRadius: 3.6,
  slamDamage: 34,
  slamReach: 10,
};

export function isBossWave(wave) {
  return wave > 0 && wave % BOSS.every === 0;
}

// ── Tutorial ────────────────────────────────────────────────────────────────
// A gentle training wave: slow weak rangers that keep arriving until every
// step (move, attack, swap, build, nova) is done, or the player skips it.
export const TUTORIAL = {
  wave: { element: 'ice', intervalMs: 1700, reward: 30, groups: [{ kind: 'ranger', tier: 1, count: 5 }] },
  purse: 70,
  damageMult: 0.3,
  maxMs: 120000,
  steps: ['move', 'attack', 'swap', 'build', 'nova'],
};

// ── Endless ─────────────────────────────────────────────────────────────────
// After the campaign table runs out the siege keeps going with generated
// waves. Pure function of the wave number, so the Daily Siege is the same run
// for everyone without storing a table per day.
export const ENDLESS = { hpPerWave: 0.09, countPerWave: 0.12, minIntervalMs: 460 };

export function waveAt(wave) {
  if (wave >= 1 && wave <= WAVES.length) return WAVES[wave - 1];
  const past = Math.max(1, wave - WAVES.length);
  const template = WAVES[WAVES.length - 1];
  const elements = ['ice', 'fire', 'mixed'];
  const grow = 1 + past * ENDLESS.countPerWave;
  return {
    element: elements[wave % elements.length],
    boss: isBossWave(wave),
    intervalMs: Math.max(ENDLESS.minIntervalMs, template.intervalMs - past * 14),
    reward: template.reward + past * 10,
    hpMult: 1 + past * ENDLESS.hpPerWave,
    groups: template.groups.map((group) => ({
      kind: group.kind,
      tier: 4,
      count: Math.round(group.count * grow),
    })),
  };
}
