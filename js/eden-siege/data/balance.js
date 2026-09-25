// Balance tables for Velo's Rampart. Numbers only — no behaviour lives here, so a
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
  // Attack: a bolt fired where the caller aims (mouse or touch stick), with a
  // zero aim falling back to the way the hero faces. Touch play turns on a
  // 35° assist cone, which picks the nearest enemy inside it; free aim never
  // homes, so the cone is the difference between the two control schemes.
  // Ice slows and chips; fire hits harder and burns.
  attackRange: 11.5,
  assistConeDeg: 35,
  attackCdMs: 330,
  boltSpeed: 19,
  boltRadius: 0.45,
  ice: { damage: 9, slowMs: 1500, slowFactor: 0.45 },
  fire: { damage: 13, burnMs: 3000, burnDps: 4 },
  hitInvulnMs: 600,
  // Swapping wings is a decision, not a twitch: one swap every two and a half
  // seconds, so committing to a wing costs the other one for a while.
  swapCooldownMs: 2500,
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

// Ten authored waves. The first two are deliberately plain (and the tutorial
// wave sits before them); each of the next five introduces one new role in its
// cheapest tier, so a wave teaches the answer to the thing it just sent.
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
    // Shieldwalls arrive here: cheap, but they turn aside anything hit head on.
    element: 'fire',
    intervalMs: 880,
    reward: 35,
    groups: [
      { kind: 'cavalry', tier: 2, count: 4 },
      { kind: 'ranger', tier: 1, count: 3 },
      { kind: 'shieldwall', tier: 1, count: 1 },
    ],
  },
  {
    // Skirmishers kite, so the lanes stop being a straight exchange of fire.
    element: 'fire',
    intervalMs: 860,
    reward: 40,
    groups: [
      { kind: 'dreadnought', tier: 2, count: 2 },
      { kind: 'ranger', tier: 2, count: 4 },
      { kind: 'skirmisher', tier: 2, count: 2 },
    ],
  },
  {
    // The first warlord, with one saboteur sent past the hero for the towers.
    element: 'mixed',
    boss: true,
    intervalMs: 820,
    reward: 50,
    groups: [
      { kind: 'cavalry', tier: 3, count: 5 },
      { kind: 'ranger', tier: 2, count: 4 },
      { kind: 'saboteur', tier: 1, count: 1 },
    ],
  },
  {
    // Heralds make the pack they walk with faster and angrier.
    element: 'ice',
    intervalMs: 800,
    reward: 55,
    groups: [
      { kind: 'dreadnought', tier: 3, count: 3 },
      { kind: 'cavalry', tier: 2, count: 4 },
      { kind: 'shieldwall', tier: 2, count: 1 },
      { kind: 'herald', tier: 2, count: 1 },
    ],
  },
  {
    // The first hauler: a wall of hit points with a double purse behind it.
    element: 'fire',
    intervalMs: 780,
    reward: 60,
    groups: [
      { kind: 'ranger', tier: 3, count: 6 },
      { kind: 'cavalry', tier: 3, count: 4 },
      { kind: 'hauler', tier: 2, count: 1 },
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
      { kind: 'skirmisher', tier: 3, count: 2 },
      { kind: 'saboteur', tier: 2, count: 2 },
    ],
  },
  {
    element: 'ice',
    intervalMs: 740,
    reward: 85,
    groups: [
      { kind: 'dreadnought', tier: 4, count: 3 },
      { kind: 'cavalry', tier: 4, count: 5 },
      { kind: 'shieldwall', tier: 3, count: 2 },
      { kind: 'herald', tier: 3, count: 1 },
    ],
  },
  {
    // The last wave is also the template endless waves are grown from, so it
    // carries every role — but never the gate ram, which only ever escorts a
    // boss (see BOSS.ramFromWave) instead of turning up in a generated wave.
    element: 'mixed',
    boss: true,
    intervalMs: 700,
    reward: 140,
    groups: [
      { kind: 'dreadnought', tier: 4, count: 4 },
      { kind: 'ranger', tier: 4, count: 6 },
      { kind: 'cavalry', tier: 4, count: 4 },
      { kind: 'shieldwall', tier: 4, count: 2 },
      { kind: 'skirmisher', tier: 4, count: 2 },
      { kind: 'saboteur', tier: 3, count: 1 },
      { kind: 'herald', tier: 3, count: 1 },
      { kind: 'hauler', tier: 2, count: 1 },
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

  // ── Role troops ───────────────────────────────────────────────────────────
  // Each of these answers a habit: standing and trading shots (shieldwall),
  // ignoring the flanks (skirmisher), leaving the towers alone (saboteur),
  // fighting one enemy at a time (herald), chasing kills instead of loot
  // (hauler), and letting a boss walk in alone (gate ram).
  //
  // A walking wall: slow, heavy, and it turns aside any bolt that strikes the
  // arc it faces. Burn ticks, splash, novas and blades all still land, so Fire
  // and a flanking step are the answers. Ice on the wing also works.
  shieldwall: {
    labelKey: 'enemyShieldwall',
    art: 'dreadnought',
    hp: 120,
    speed: 1.2,
    damage: 14,
    attackCdMs: 1900,
    range: 1.7,
    radius: 0.98,
    ranged: false,
    aggroRadius: 5,
    score: 34,
    // Half-angle of the frontal arc: bolts landing inside ±60° are blocked.
    blockArcDeg: 60,
  },
  // Ranged and quick, and it will not stand still: inside its kite radius it
  // backs away while it shoots, so it has to be cornered, out-ranged or frozen.
  skirmisher: {
    labelKey: 'enemySkirmisher',
    art: 'ranger',
    hp: 17,
    speed: 3.3,
    damage: 5,
    attackCdMs: 1250,
    range: 7,
    radius: 0.54,
    ranged: true,
    aggroRadius: 10,
    score: 15,
    projectileSpeed: 10,
    kiteRadius: 5.5,
  },
  // Ignores the hero and the stronghold: it goes for the nearest standing tower,
  // and only reaches for the core once nothing is left to sabotage. Its toolkit
  // is lopsided on purpose — brutal against a spire, feeble against the keep.
  saboteur: {
    labelKey: 'enemySaboteur',
    art: 'ranger',
    hp: 15,
    speed: 3.6,
    damage: 13,
    attackCdMs: 1200,
    range: 1.15,
    radius: 0.52,
    ranged: false,
    aggroRadius: 6,
    score: 18,
    towerHunter: true,
    coreDamageMult: 0.3,
  },
  // The standard-bearer. It barely fights on its own; allies inside its aura
  // move and hit a quarter harder, which is what makes it worth killing first.
  herald: {
    labelKey: 'enemyHerald',
    art: 'ranger',
    hp: 16,
    speed: 1.65,
    damage: 4,
    attackCdMs: 1600,
    range: 1.3,
    radius: 0.58,
    ranged: false,
    aggroRadius: 6,
    score: 22,
    aura: { radius: 5, speedMult: 1.25, damageMult: 1.25 },
  },
  // A treasure cart with legs: slow, enormous, and worth twice the loot and
  // several times the score of anything else on the field.
  hauler: {
    labelKey: 'enemyHauler',
    art: 'dreadnought',
    hp: 260,
    speed: 1.1,
    damage: 16,
    attackCdMs: 2000,
    range: 1.7,
    radius: 1.05,
    ranged: false,
    aggroRadius: 5,
    score: 90,
    goldMult: 2,
  },
  // The boss-wave escort: nothing pushes it and nothing holds it up but ice,
  // and its blows land hardest on the stronghold itself.
  gateRam: {
    labelKey: 'enemyGateRam',
    art: 'dreadnought',
    hp: 420,
    speed: 0.95,
    damage: 26,
    attackCdMs: 2200,
    range: 2.4,
    radius: 1.6,
    ranged: false,
    aggroRadius: 7,
    score: 220,
    ram: true,
    knockbackImmune: true,
    coreDamageMult: 1.6,
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

// ── Wave omens ──────────────────────────────────────────────────────────────
// A wave omen is the run's risk/reward dial: the player picks one during a
// build phase and it governs the wave that follows, then clears with it. Each
// omen makes that wave fight differently and pays for it in score (Iron Tide
// pays in gold instead, because a wall of armour is expensive to break).
// Campaign play opens the offer at wave OMENS.fromWave; endless keeps it on
// every wave, since a generated wave has no other shape to choose from.
export const OMENS = {
  fromWave: 3,
  // Every foe spawns armoured, and the wave's purse grows by half again.
  ironTide: { labelKey: 'ironTide', modifier: 'armored', goldMult: 1.6, scoreMult: 1 },
  // The arena closes in (state.omen is the renderer's cue) but the score climbs.
  fogOfWar: { labelKey: 'fogOfWar', goldMult: 1, scoreMult: 1.4 },
  // Foes run hot, chains hang on longer: a wave for a player already ahead.
  bloodMoon: { labelKey: 'bloodMoon', speedMult: 1.25, comboDecayMult: 1.5, scoreMult: 1.5 },
  // Ice barely bites — the hero's and the frost spires' alike. Fire is untouched.
  mirrorIce: { labelKey: 'mirrorIce', iceDamageMult: 0.25, scoreMult: 1.8 },
};

export const OMEN_ORDER = ['ironTide', 'fogOfWar', 'bloodMoon', 'mirrorIce'];

// ── Elemental reactions ─────────────────────────────────────────────────────
// The two wings react with what the other one leaves behind, so alternating
// fire and ice is worth more than either wing alone. Every one of these is a
// plain number here and a rule in sim/world.js.
export const REACTIONS = {
  // Ice landing on something already burning: the burn shatters the plate with
  // it, so the blow lands half again as hard and armour does not blunt it.
  shatter: { damageMult: 1.6 },
  // Fire landing on something already held: the ice melts into the burn, which
  // takes twice the flame and lets go of the target.
  melt: { burnDpsMult: 2 },
  // Three slows in a row lock a unit where it stands; a warlord shrugs it off
  // in half the time. Stacks fade if nothing has slowed the unit for a while.
  deepFreeze: { stacks: 3, freezeMs: 1200, bossFreezeMs: 600, stackDecayMs: 4000 },
  // A burning corpse passes half its fire to whatever stands beside it.
  immolate: { radius: 2.5, burnDpsMult: 0.5 },
};

// ── The War Council ─────────────────────────────────────────────────────────
// One boon per council, and a council sits once every few waves. A boon is not
// a new mechanic: it is a permanent multiplier on the same `mods` object the
// heroes use, which is why every key below has to exist in defaultMods().
export const BOONS = {
  // Ember Heart: the Fire wing burns 40% harder.
  emberHeart: { labelKey: 'emberHeart', mods: { fireDamage: 1.4 } },
  // Frost Grip: the Ice wing holds 30% deeper for 30% longer.
  frostGrip: { labelKey: 'frostGrip', mods: { iceSlow: 1.3, iceSlowDepth: 1.3 } },
  // Swift Wings: the hero runs 12% faster and dashes 20% sooner.
  swiftWings: { labelKey: 'swiftWings', mods: { speed: 1.12, dashCd: 0.8 } },
  // Heavy Nova: the nova hits 50% harder and throws 40% further.
  heavyNova: { labelKey: 'heavyNova', mods: { novaDamage: 1.5, novaKnockback: 1.4 } },
  // Gold Rush: fallen foes drop 35% more gold.
  goldRush: { labelKey: 'goldRush', mods: { gold: 1.35 } },
  // Long Reach: bolts and spires both reach 15% further.
  longReach: { labelKey: 'longReach', mods: { range: 1.15, towerRange: 1.15 } },
  // Quick Chain: the chain fades 40% slower, so it survives a walk between foes.
  quickChain: { labelKey: 'quickChain', mods: { comboDecay: 1.4 } },
  // Tower Wall: spires carry 40% more health (and stand at it when the boon lands).
  towerWall: { labelKey: 'towerWall', mods: { towerHp: 1.4 } },
};

export const BOON_ORDER = [
  'emberHeart',
  'frostGrip',
  'swiftWings',
  'heavyNova',
  'goldRush',
  'longReach',
  'quickChain',
  'towerWall',
];

// The draft itself: offered during the build phase after clearing waves 3, 6 and
// 9 of the campaign, and after every third wave once the siege is endless.
export const DRAFT = {
  everyWaves: 3,
  campaignUntilWave: 9,
  // How many distinct boons a single council puts up.
  options: 3,
};

// ── Boss waves ──────────────────────────────────────────────────────────────
export const BOSS = {
  every: 5,
  kind: 'warlord',
  tier: 4,
  // Extra health per boss cycle (wave 10 is cycle 1, wave 15 cycle 2, ...).
  hpPerCycle: 0.55,
  escortHpMult: 1,
  // From this wave on, every boss drags a gate ram to the stronghold with it.
  ramKind: 'gateRam',
  ramFromWave: 10,
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
  wave: {
    element: 'ice',
    intervalMs: 1700,
    reward: 30,
    groups: [{ kind: 'ranger', tier: 1, count: 5 }],
  },
  purse: 70,
  damageMult: 0.3,
  maxMs: 120000,
  // The training wave never takes the stronghold below this share of its HP.
  coreFloor: 0.5,
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
