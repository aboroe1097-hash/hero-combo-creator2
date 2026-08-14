// js/specialization-hero-paths.js
// Paid-hero → Specialization Tower synergy catalog, and the named path presets
// built on top of it.
//
// The auto-path engine in `specialization-hero-plans.js` reads hero skill text
// and matches keywords. That is good at breadth but blind to the parts of a kit
// that only matter once you know what the towers actually hand out. This module
// is the hand-checked half: every paid hero in the game, read against the real
// tower content (32 researches, their 25/50/75/100% milestones, and the 24
// Legion Skills), with the tower demand written down explicitly.
//
// Everything here is game data, not UI copy: the `note` on each hero quotes the
// mechanic in the hero's own skill text so the tool can say *why* a research
// moved, and the numbers are relative weights inside one troop's tower, never
// cross-troop power claims.
//
// Pure data + pure helpers. No DOM, no imports from the UI layer.

import { allHeroesData } from './heroes-data.js';

// Supply tags a tower node/milestone can provide. Hero `demand` maps are keyed
// by these, so they must stay in step with `nodeSupplyTags`/`milestoneSupplyTags`
// in specialization-hero-plans.js.
export const TOWER_SUPPLY_TAGS = Object.freeze([
  'might',
  'baseMight',
  'hp',
  'resistance',
  'speed',
  'countering',
  'skillDamage',
  'physicalDamage',
  'healing',
  'defense',
]);

// The two default paths every troop plans on. Siege covers rally/city work
// (siege, siegeAttacks, siegeDefense, reinforcingAllies, initiatingRally,
// rallyJoin node contexts); field covers everything fought outside a city
// (nonSiege, battlefield, roc, general).
export const HERO_PATH_MODES = Object.freeze(['siege', 'nonSiege']);
export const HERO_PATH_TROOPS = Object.freeze(['cavalry', 'archer', 'footman']);

const TYPE_TO_TROOP = Object.freeze({
  Cavalry: 'cavalry',
  Archers: 'archer',
  Footmen: 'footman',
  All: 'all',
});

// ---------------------------------------------------------------------------
// Paid hero catalog
// ---------------------------------------------------------------------------
//
// Per hero:
//   demand   — tower supply tags this kit converts into real damage/survival.
//   columns  — Legion Skills (by column) the kit specifically turns on, with the
//              weight of that payoff. These are the "this hero wants THIS column
//              finished" statements.
//   research — individual researches whose 100% milestone the kit needs.
//   siegeBias — -1 (pure field kit) .. +1 (pure rally/siege kit).
//   note     — the mechanic, in the hero's own skill terms.

export const PAID_HERO_TOWER_PROFILES = Object.freeze({
  // ---- Archers ----------------------------------------------------------
  'Ramses II': Object.freeze({
    troop: 'archer',
    siegeBias: 0.35,
    demand: Object.freeze({
      skillDamage: 2.4,
      physicalDamage: 2.2,
      might: 1.6,
      speed: 1.4,
      healing: 1.2,
    }),
    columns: Object.freeze({ 2: 4.5, 6: 1.4, 7: 1.2 }),
    research: Object.freeze({ training2: 1.4, enhanced1: 1.2, defensive2: 1.0 }),
    keyMechanics: Object.freeze(['Fatal Blow', 'Additional Attack']),
    note: 'Raises every Archer squad to a 40%→60% Fatal Blow chance and converts the overflow into Fatal Blow damage rate; Column II Sniper Archer adds +50% to that same multiplier, and rounds 3-6 double the normal attacks that carry it.',
  }),
  Boudica: Object.freeze({
    troop: 'archer',
    siegeBias: 0.2,
    demand: Object.freeze({
      skillDamage: 2.6,
      might: 1.8,
      speed: 2.2,
      healing: 0.8,
    }),
    columns: Object.freeze({ 2: 4.5, 6: 2.0, 7: 1.8 }),
    research: Object.freeze({ training1: 1.4, training3: 1.2, encounter2: 1.2 }),
    keyMechanics: Object.freeze(['Destructive Strike', 'Combat Speed']),
    note: '30% Destructive Strike on skill damage, and +20% to both her skill and Destructive Strike chance whenever she acts before every enemy squad — so Combat Speed milestones are damage, not convenience. Spear marks add +10% skill damage taken per layer.',
  }),
  Beowulf: Object.freeze({
    troop: 'archer',
    siegeBias: -0.1,
    demand: Object.freeze({
      physicalDamage: 2.6,
      skillDamage: 1.4,
      healing: 2.0,
      might: 1.6,
      resistance: 1.0,
    }),
    columns: Object.freeze({ 2: 3.2, 8: 2.4, 3: 1.6 }),
    research: Object.freeze({ training7: 1.4, training2: 1.0 }),
    keyMechanics: Object.freeze(['Fatal Blow', 'Physical Damage', 'Healing']),
    note: 'Normal-attack damage stacks +20% up to 5 layers into a Mass Attack that ignores Dodging, and every heal he receives adds another +10% Fatal Blow chance — healing is his damage stat. Sober clears control, which Column VIII Purifying Arrows extends.',
  }),
  Leonidas: Object.freeze({
    troop: 'archer',
    siegeBias: -0.35,
    demand: Object.freeze({
      hp: 2.4,
      resistance: 2.2,
      healing: 2.2,
      defense: 1.8,
      might: 1.0,
    }),
    columns: Object.freeze({ 3: 2.6, 1: 2.0, 8: 1.4 }),
    research: Object.freeze({ defensive1: 1.4, training4: 1.2, encounter1: 1.0 }),
    keyMechanics: Object.freeze(['Healing', 'Control status', 'Armor Break']),
    note: 'Archers heal for the first 2 rounds, then take -30% damage with 5% life-steal for the rest of the fight, and his normal attacks strip -50% Might/-50% Resistance plus Silence. A survival kit that wants the control-damage and defensive milestones.',
  }),

  // ---- Cavalry ----------------------------------------------------------
  "Jeanne d'Arc": Object.freeze({
    troop: 'cavalry',
    siegeBias: 0.45,
    demand: Object.freeze({
      skillDamage: 2.6,
      speed: 2.0,
      healing: 1.6,
      might: 1.4,
    }),
    columns: Object.freeze({ 1: 3.0, 7: 2.0, 6: 1.2 }),
    research: Object.freeze({ training2: 1.4, enhanced1: 1.2, callofglory1: 1.0 }),
    keyMechanics: Object.freeze(['Prep skip', 'Skill Damage']),
    note: 'Cavalry squads get a 60% chance to skip a round of prep and her squad +86% Skill Damage. Column I Rescue Skills pays out on exactly that event — restoring troop power after a prep skill is cast.',
  }),
  Lancelot: Object.freeze({
    troop: 'cavalry',
    siegeBias: 0.4,
    demand: Object.freeze({
      skillDamage: 2.8,
      speed: 1.6,
      healing: 1.6,
      resistance: 1.2,
    }),
    columns: Object.freeze({ 1: 2.6, 7: 2.8, 6: 2.4 }),
    research: Object.freeze({ training2: 1.2, encounter2: 1.2, enhanced2: 1.0 }),
    keyMechanics: Object.freeze(['Prep skip', 'Skill Damage', 'Control status']),
    note: 'Gives the whole legion an 80% prep skip (3 uses) and never launches normal attacks, so every point is skill damage. His opener doubles up against targets that cannot restore troop power — the exact status Column VI Null-Heal applies — and he is a back-row hero, which is what Column VII Bash From the Back rewards.',
  }),
  Cyrus: Object.freeze({
    troop: 'cavalry',
    siegeBias: 0.15,
    demand: Object.freeze({
      skillDamage: 2.4,
      speed: 2.4,
      resistance: 1.6,
      defense: 1.4,
    }),
    columns: Object.freeze({ 8: 2.8, 3: 2.2, 6: 2.0 }),
    research: Object.freeze({ training1: 1.4, training3: 1.2, defensive1: 1.0 }),
    keyMechanics: Object.freeze(['Prep skip', 'Sober/Clarity', 'Combat Speed', 'Evasion']),
    note: 'Storm Cavalry adds +40% damage on active skills and -40% damage taken on pursuit skills, his opener has an 80% chance to bypass prep, and a Dodge rolls First to Attack or Sober. Column VIII Headstarter and Column III Breakout hand him the same two statuses for free.',
  }),
  Caesar: Object.freeze({
    troop: 'cavalry',
    siegeBias: 0.1,
    demand: Object.freeze({
      might: 2.6,
      resistance: 2.2,
      physicalDamage: 2.2,
      speed: 1.0,
    }),
    columns: Object.freeze({ 7: 2.2, 5: 1.8, 4: 1.4 }),
    research: Object.freeze({ callofglory1: 1.4, callofglory3: 1.2, neat1: 1.0 }),
    keyMechanics: Object.freeze(['Physical Damage', 'Additional Attack', 'Evasion']),
    note: 'From round 3 he permanently adds +200% Might and Resistance and +60% Damage to every Cavalry squad, then farms additional attacks whose damage rate grows each cast. A flat Might/Resistance kit that scales with the Call of Glory and Neat Formation lines.',
  }),
  Octavius: Object.freeze({
    troop: 'cavalry',
    siegeBias: 0.55,
    demand: Object.freeze({
      might: 2.2,
      hp: 2.2,
      resistance: 2.4,
      defense: 2.0,
    }),
    columns: Object.freeze({ 3: 1.8, 4: 1.6, 2: 1.2 }),
    research: Object.freeze({ defensive1: 1.6, defensive2: 1.4, neat1: 1.2 }),
    keyMechanics: Object.freeze(['Evasion', 'Counter-Attack', 'Control status']),
    note: 'Taunts so he eats the active skills, takes -25% damage, hands the mid/back rows a 3-hit Dodge, and every hit he absorbs stacks +30% Might on a Cavalry squad up to 300%. He converts survivability into damage, so the Defensive Skill line is his damage line.',
  }),
  Alfred: Object.freeze({
    troop: 'cavalry',
    siegeBias: 0.3,
    demand: Object.freeze({
      skillDamage: 2.6,
      might: 1.6,
      hp: 1.6,
      healing: 1.2,
    }),
    columns: Object.freeze({ 6: 2.6, 2: 2.0, 1: 1.2 }),
    research: Object.freeze({ training2: 1.2, enhanced1: 1.2 }),
    keyMechanics: Object.freeze(['Skill Damage', 'Healing']),
    note: 'Cuts the target\'s power restoration by 40% and adds +30% Skill Damage taken to anything already blocked from restoring — Column VI Null-Heal and Column II Vanguard\'s Suppression set that condition up. His AoE costs his own squad 95% damage, so HP nodes are not optional.',
  }),
  'Mary Tudor': Object.freeze({
    troop: 'cavalry',
    siegeBias: 0.0,
    demand: Object.freeze({
      skillDamage: 2.8,
      might: 1.8,
      speed: 1.2,
    }),
    columns: Object.freeze({ 6: 1.6, 2: 1.2 }),
    research: Object.freeze({ training2: 1.4, encounter2: 1.2, enhanced1: 1.0 }),
    keyMechanics: Object.freeze(['Skill Damage', 'Bleed/Burn']),
    note: 'Every combat skill she casts stacks +25% Skill Damage on her squad up to 6 times for the whole battle, and her bleed ticks 155% before the target acts. Pure skill-damage scaling — the Training and Encounter skill-damage milestones compound with her own stack.',
  }),
  Ragnar: Object.freeze({
    troop: 'cavalry',
    siegeBias: -0.1,
    demand: Object.freeze({
      skillDamage: 2.4,
      might: 2.0,
      physicalDamage: 1.4,
      resistance: 1.0,
    }),
    columns: Object.freeze({ 5: 1.8, 6: 1.6, 4: 1.4 }),
    research: Object.freeze({ callofglory3: 1.2, neat2: 1.0, encounter3: 1.0 }),
    keyMechanics: Object.freeze(['Fatal Blow', 'Destructive Strike', 'Skill Damage']),
    note: 'His AoE escalates by round (160% → 640% at round 7) and he stacks +8% Fatal Blow and Destructive Strike per proc up to 5 layers, so he is paid by long fights. Weight the later columns that keep paying past round 5 rather than the round 1-4 openers.',
  }),

  // ---- Footmen ----------------------------------------------------------
  'King Arthur': Object.freeze({
    troop: 'footman',
    siegeBias: 0.4,
    demand: Object.freeze({
      resistance: 2.6,
      hp: 2.2,
      physicalDamage: 2.2,
      healing: 2.0,
    }),
    columns: Object.freeze({ 7: 2.8, 8: 2.4, 2: 2.0 }),
    research: Object.freeze({ defensive1: 1.4, defensive2: 1.2, training7: 1.2 }),
    keyMechanics: Object.freeze(['Physical Damage', 'Healing', 'Counter-Attack']),
    note: 'Opens at -80% damage taken and trades that mitigation for permanent +20% Resistance and +10% Damage per hit (16 layers), heals 15% harder, and at full stacks ignores Dodging outright — the same effect Column II Target Tactics grants. Column VII Impenetrable Formation multiplies the healing his Sword in the Stone returns.',
  }),
  Theodora: Object.freeze({
    troop: 'footman',
    siegeBias: 0.25,
    demand: Object.freeze({
      skillDamage: 2.4,
      healing: 2.6,
      hp: 1.8,
      resistance: 1.4,
    }),
    columns: Object.freeze({ 7: 3.0, 1: 2.0, 6: 1.4 }),
    research: Object.freeze({ training2: 1.2, encounter2: 1.2, defensive1: 1.0 }),
    keyMechanics: Object.freeze(['Healing', 'Control status', 'Skill Damage']),
    note: 'Buffs an ally to +50% damage, answers incoming damage with legion-wide 160% Skill Damage plus a random Suppress/Silence/Disarm/Confuse, and life-steals 60% of the front row\'s damage for 6 rounds. Column VII Impenetrable Formation (+35% healing received) is the single largest multiplier on her kit.',
  }),
  Alexander: Object.freeze({
    troop: 'footman',
    siegeBias: -0.2,
    demand: Object.freeze({
      skillDamage: 2.4,
      hp: 2.2,
      healing: 1.8,
      defense: 2.4,
    }),
    columns: Object.freeze({ 6: 1.8, 3: 1.6, 5: 1.4 }),
    // The burning-damage milestones matter to him more than to anyone else:
    // his own mitigation skill takes +300% burning damage.
    research: Object.freeze({ encounter1: 2.0, enhanced2: 2.0, encounter3: 1.8, training5: 1.0 }),
    keyMechanics: Object.freeze(['Bleed/Burn', 'Pre-Battle window', 'Healing']),
    note: 'Shocks a squad in rounds 1 and 3 for +325% damage per hit taken and bleeds every enemy for 260% per round, permanently. He also takes -60% damage but +300% burning damage — so the "-5% damage taken when subject to burning status" milestones on Encounter Battle I/III and Enhanced Tactics II are load-bearing for him, not filler.',
  }),

  // ---- All-troop --------------------------------------------------------
  'Cleopatra VII': Object.freeze({
    troop: 'all',
    siegeBias: 0.0,
    demand: Object.freeze({
      skillDamage: 1.8,
      healing: 1.8,
      hp: 1.4,
      defense: 1.2,
    }),
    columns: Object.freeze({ 3: 1.4, 5: 1.2 }),
    research: Object.freeze({ encounter2: 1.0, callofglory2: 1.0 }),
    keyMechanics: Object.freeze(['Control status', 'Vulnerable marks', 'Evasion', 'Healing']),
    note: 'Confuses enemies every 2 normal attacks and marks the confused ones Vulnerable for +15% escalating damage taken, while the weakest friendly squad dodges and then heals. She lifts any tower, so she never decides one on her own.',
  }),
});

// ---------------------------------------------------------------------------
// Path presets
// ---------------------------------------------------------------------------
//
// One to two named paths per troop, each defined by the paid heroes it assumes.
// `labelKey` resolves through the Specialization i18n pack; hero names come
// straight from the roster data so they never need translating.
//
// `emphasis` is applied on top of whatever the owned heroes already demand, so
// a preset still means something when you own only one of its heroes.

export const HERO_PATH_PRESETS = Object.freeze([
  Object.freeze({
    id: 'archer-fatal-blow',
    troop: 'archer',
    labelKey: 'pathFatalBlowArchers',
    heroes: Object.freeze(['Ramses II', 'Boudica', 'Beowulf']),
    emphasis: Object.freeze({ skillDamage: 1.8, physicalDamage: 1.6, speed: 1.4, might: 1.2 }),
    columns: Object.freeze({ 2: 3.0, 6: 1.6, 7: 1.2 }),
    research: Object.freeze({ training1: 1.2, training2: 1.4, encounter2: 1.2 }),
  }),
  Object.freeze({
    id: 'archer-resilient',
    troop: 'archer',
    labelKey: 'pathResilientArchers',
    heroes: Object.freeze(['Leonidas', 'Cleopatra VII']),
    emphasis: Object.freeze({ hp: 1.8, resistance: 1.8, healing: 1.6, defense: 1.6 }),
    columns: Object.freeze({ 3: 2.2, 8: 1.6, 1: 1.4 }),
    research: Object.freeze({ defensive1: 1.6, training4: 1.4, encounter1: 1.2 }),
  }),
  Object.freeze({
    id: 'cavalry-prep-skip',
    troop: 'cavalry',
    labelKey: 'pathPrepSkipCavalry',
    heroes: Object.freeze(["Jeanne d'Arc", 'Lancelot', 'Cyrus']),
    emphasis: Object.freeze({ skillDamage: 1.8, speed: 1.6, healing: 1.2 }),
    columns: Object.freeze({ 1: 2.4, 6: 1.8, 7: 1.8, 8: 1.4 }),
    research: Object.freeze({ training1: 1.2, training2: 1.4, enhanced1: 1.2 }),
  }),
  Object.freeze({
    id: 'cavalry-stacked-might',
    troop: 'cavalry',
    labelKey: 'pathStackedMightCavalry',
    heroes: Object.freeze(['Caesar', 'Octavius', 'Alfred', 'Mary Tudor', 'Ragnar']),
    emphasis: Object.freeze({ might: 1.8, resistance: 1.6, hp: 1.4, physicalDamage: 1.2 }),
    columns: Object.freeze({ 4: 1.6, 5: 1.6, 2: 1.2 }),
    research: Object.freeze({ callofglory1: 1.4, neat1: 1.2, defensive1: 1.2 }),
  }),
  Object.freeze({
    id: 'footman-shield-wall',
    troop: 'footman',
    labelKey: 'pathShieldWallFootmen',
    heroes: Object.freeze(['King Arthur', 'Theodora']),
    emphasis: Object.freeze({ resistance: 1.8, hp: 1.8, healing: 1.8, physicalDamage: 1.2 }),
    columns: Object.freeze({ 7: 2.6, 8: 1.8, 2: 1.6, 1: 1.4 }),
    research: Object.freeze({ defensive1: 1.6, training1: 1.2, defensive2: 1.2 }),
  }),
  Object.freeze({
    id: 'footman-bleed-shock',
    troop: 'footman',
    labelKey: 'pathBleedShockFootmen',
    heroes: Object.freeze(['Alexander', 'Theodora']),
    emphasis: Object.freeze({ skillDamage: 1.8, defense: 1.8, hp: 1.4 }),
    columns: Object.freeze({ 6: 1.6, 3: 1.4 }),
    research: Object.freeze({ encounter1: 2.0, enhanced2: 1.8, encounter3: 1.6, training2: 1.2 }),
  }),
]);

// The fallback path for a troop when none of its paid heroes are owned. It is
// not a preset object because it assumes no heroes at all.
export const F2P_PATH_ID = 'f2p';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const HERO_IMAGE_BY_NAME = new Map(allHeroesData.map((hero) => [hero.name, hero.imageUrl || '']));

/** Every paid hero name the catalog knows, in roster order. */
export const PAID_HERO_NAMES = Object.freeze(
  allHeroesData
    .filter((hero) => hero.State === 'Paid' && PAID_HERO_TOWER_PROFILES[hero.name])
    .map((hero) => hero.name)
);

export function getHeroImage(heroName) {
  return HERO_IMAGE_BY_NAME.get(heroName) || '';
}

export function getPaidHeroProfile(heroName) {
  return PAID_HERO_TOWER_PROFILES[heroName] || null;
}

/** Troop this hero's tower profile drives: a troop id, or 'all'. */
export function troopForHero(heroName) {
  const profile = PAID_HERO_TOWER_PROFILES[heroName];
  if (profile) return profile.troop;
  const meta = allHeroesData.find((hero) => hero.name === heroName);
  return TYPE_TO_TROOP[meta?.Type] || 'all';
}

/**
 * Paid heroes relevant to one tower, most tower-defining first.
 * All-troop heroes come last: they lift every tower, so they never define one.
 */
export function paidHeroesForTroop(troopId) {
  return Object.freeze(
    PAID_HERO_NAMES.filter((name) => {
      const troop = PAID_HERO_TOWER_PROFILES[name].troop;
      return troop === troopId || troop === 'all';
    }).sort((left, right) => {
      const leftAll = PAID_HERO_TOWER_PROFILES[left].troop === 'all' ? 1 : 0;
      const rightAll = PAID_HERO_TOWER_PROFILES[right].troop === 'all' ? 1 : 0;
      return leftAll - rightAll || left.localeCompare(right);
    })
  );
}

export function getPathPresets(troopId) {
  return HERO_PATH_PRESETS.filter((preset) => preset.troop === troopId);
}

export function getPathPreset(presetId) {
  return HERO_PATH_PRESETS.find((preset) => preset.id === presetId) || null;
}

/**
 * How well a roster fits each preset for a troop, best fit first.
 * `owned` counts the preset heroes present; ties break on the preset order so
 * the result is stable for an empty roster.
 */
export function rankPathPresets(troopId, heroes = []) {
  const roster = new Set(Array.isArray(heroes) ? heroes : []);
  return getPathPresets(troopId)
    .map((preset, index) => {
      const owned = preset.heroes.filter((name) => roster.has(name));
      return {
        preset,
        owned: Object.freeze(owned),
        ownedCount: owned.length,
        total: preset.heroes.length,
        index,
      };
    })
    .sort((left, right) => right.ownedCount - left.ownedCount || left.index - right.index);
}

/**
 * The preset a roster should land on for a troop, or `F2P_PATH_ID` when the
 * roster owns none of that troop's paid heroes.
 */
export function suggestedPathId(troopId, heroes = []) {
  const ranked = rankPathPresets(troopId, heroes);
  return ranked[0]?.ownedCount ? ranked[0].preset.id : F2P_PATH_ID;
}

/**
 * Combined tower demand for a roster under one preset: hero profiles summed,
 * then the preset's own emphasis folded in.
 *
 * `apply` mirrors the engine's troop affinity — an all-troop hero contributes at
 * three quarters weight to every tower, an off-troop paid hero at nothing.
 */
export function pathDemandFor(troopId, heroes = [], presetId = F2P_PATH_ID) {
  const demand = {};
  const columns = {};
  const research = {};
  const notes = [];
  let siegeBias = 0;
  let contributors = 0;

  const add = (target, source, scale = 1) => {
    for (const [key, value] of Object.entries(source || {})) {
      target[key] = (target[key] || 0) + Number(value) * scale;
    }
  };

  for (const heroName of Array.isArray(heroes) ? heroes : []) {
    const profile = PAID_HERO_TOWER_PROFILES[heroName];
    if (!profile) continue;
    const apply = profile.troop === troopId ? 1 : profile.troop === 'all' ? 0.75 : 0;
    if (!apply) continue;
    add(demand, profile.demand, apply);
    add(columns, profile.columns, apply);
    add(research, profile.research, apply);
    siegeBias += profile.siegeBias * apply;
    contributors += apply;
    notes.push({ hero: heroName, note: profile.note, mechanics: profile.keyMechanics });
  }

  const preset = getPathPreset(presetId);
  if (preset && preset.troop === troopId) {
    add(demand, preset.emphasis);
    add(columns, preset.columns);
    add(research, preset.research);
  }

  return Object.freeze({
    troop: troopId,
    presetId: preset?.id || F2P_PATH_ID,
    demand: Object.freeze(demand),
    columns: Object.freeze(columns),
    research: Object.freeze(research),
    notes: Object.freeze(notes),
    heroCount: notes.length,
    // Average bias, so a big roster does not read as more siege-focused than a
    // small one made of the same kits.
    siegeBias: contributors ? Number((siegeBias / contributors).toFixed(3)) : 0,
  });
}
