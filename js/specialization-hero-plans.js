// js/specialization-hero-plans.js
// Skill-semantics auto-path engine for the Specialization Towers.
//
// Pure data module: no DOM. Three inputs decide an order:
//
//   1. The hero skill catalog (S0-X2), keyword-matched into mechanics, scored
//      against the tower content per troop type — attribute nodes, the
//      25/50/75/100% milestones, and the per-column Legion Skills.
//   2. The hand-checked paid-hero catalog in `specialization-hero-paths.js`,
//      which states outright which columns and researches a paid kit needs.
//   3. The captured community charts in `specialization-routes.js`, used as the
//      seed order so two researches the heroes do not distinguish still come out
//      in the order the charts recommend rather than alphabetically.
//
// Every troop plans on one of two paths, and only two: a siege path (rally, city
// attack, city defense, reinforcement) and a non-siege field path (encounter,
// battlefield, RoC). Output is one ordered plan per troop that keeps the game's
// column order (I-VIII) and only reorders the four researches inside a column,
// plus human-readable reasons citing the owned hero skills.

import { heroesExtendedData } from './heroes-info.js';
import { allHeroesData } from './heroes-data.js';
import {
  SPECIALIZATION_COLUMNS,
  SPECIALIZATION_LEGION_SKILLS,
  SPECIALIZATION_RESEARCH,
} from './specialization-towers-v2-data.js';
import { getRouteOrder } from './specialization-routes.js';
import {
  F2P_PATH_ID,
  HERO_PATH_MODES,
  HERO_PATH_TROOPS,
  getPathPreset,
  pathDemandFor,
  suggestedPathId,
} from './specialization-hero-paths.js';

export const HERO_PLAN_MODES = HERO_PATH_MODES;
export const HERO_PLAN_TROOPS = HERO_PATH_TROOPS;
export const HERO_PLAN_DEFAULT_MODE = 'siege';
export const HERO_PLAN_DATA_REVISION = '2026-08-14-paid-hero-paths-v2';

// ---------------------------------------------------------------------------
// Hero mechanic vocabulary
// ---------------------------------------------------------------------------

export const MECHANIC_IDS = Object.freeze({
  FATAL_BLOW: 'fatalBlow',
  DESTRUCTIVE_STRIKE: 'destructiveStrike',
  COMBAT_SPEED: 'combatSpeed',
  PREP_SKIP: 'prepSkip',
  PRE_BATTLE: 'preBattle',
  HEALING: 'healing',
  CONTROL: 'control',
  SOBER: 'sober',
  EVASION: 'evasion',
  COUNTER_ATTACK: 'counterAttack',
  ARMOR_BREAK: 'armorBreak',
  SKILL_DAMAGE: 'skillDamage',
  PHYSICAL_DAMAGE: 'physicalDamage',
  ADDITIONAL_ATTACK: 'additionalAttack',
  BLEED_BURN: 'bleedBurn',
  VULNERABLE: 'vulnerable',
});

const MECHANIC_PATTERNS = Object.freeze([
  [MECHANIC_IDS.FATAL_BLOW, ['fatal blow']],
  [MECHANIC_IDS.DESTRUCTIVE_STRIKE, ['destructive strike']],
  [
    MECHANIC_IDS.COMBAT_SPEED,
    [
      'combat speed',
      'cambat speed',
      'acts before',
      'move first',
      'first to attack',
      'first attack',
    ],
  ],
  [
    MECHANIC_IDS.PREP_SKIP,
    [
      'skip 1 round of prep',
      'skip 1 round(s) of prepping',
      'skip 1 round(s)',
      'skip the prep',
      'bypass the prep',
      'skip one round of prep',
    ],
  ],
  [
    MECHANIC_IDS.PRE_BATTLE,
    [
      'pre-battle',
      'first 2 turns',
      'first 3 turns',
      'first 4 turns',
      'first 6 turns',
      'first two rounds',
      'first three rounds',
      'first four rounds',
      'in round 1 and 3',
      'on turn 1',
    ],
  ],
  [MECHANIC_IDS.HEALING, ['restore', 'recover', 'healing', 'recovery rate', 'first-aid', 'revive']],
  [MECHANIC_IDS.CONTROL, ['silence', 'disarm', 'suppress', 'confuse', 'taunt', 'interrupt']],
  [
    MECHANIC_IDS.SOBER,
    ['sober', 'clarity', 'clear-mind', 'clear all negative', 'immune to control'],
  ],
  [MECHANIC_IDS.EVASION, ['evade', 'evasion', 'dodge', 'dodging']],
  [MECHANIC_IDS.COUNTER_ATTACK, ['counter-attack', 'counterattack', 'return damage']],
  [MECHANIC_IDS.ARMOR_BREAK, ['armor break', 'lower defense', 'defense -', 'base resistance']],
  [MECHANIC_IDS.SKILL_DAMAGE, ['skill damage', 'combat skill']],
  [MECHANIC_IDS.PHYSICAL_DAMAGE, ['physical damage', 'normal attack']],
  [
    MECHANIC_IDS.ADDITIONAL_ATTACK,
    [
      'additional attack',
      'attack again',
      'attacks 2 times',
      'attack 2 times',
      '2 basic attacks',
      'normal attacks 2 times',
    ],
  ],
  [MECHANIC_IDS.BLEED_BURN, ['bleed', 'burn', 'flammable', 'poison', 'curse']],
  [
    MECHANIC_IDS.VULNERABLE,
    ['vulnerable', 'spear mark', 'take 15% more', 'additional damage each time'],
  ],
]);

// Tower supply tags matched against hero mechanics. A hero mechanic "demands"
// tower content; each entry is the demand weight per tower supply tag.
const DEMAND_WEIGHTS = Object.freeze({
  [MECHANIC_IDS.FATAL_BLOW]: { might: 2.0, baseMight: 2.0, skillDamage: 1.0 },
  [MECHANIC_IDS.DESTRUCTIVE_STRIKE]: { might: 2.0, skillDamage: 1.6 },
  [MECHANIC_IDS.COMBAT_SPEED]: { speed: 3.0 },
  [MECHANIC_IDS.PREP_SKIP]: { speed: 2.0, skillDamage: 1.0 },
  [MECHANIC_IDS.PRE_BATTLE]: { speed: 1.0, might: 1.0, skillDamage: 0.8 },
  [MECHANIC_IDS.HEALING]: { hp: 1.6, resistance: 0.8, healing: 1.6 },
  [MECHANIC_IDS.CONTROL]: { skillDamage: 0.8, resistance: 0.8 },
  [MECHANIC_IDS.SOBER]: { hp: 1.0, resistance: 1.6, defense: 1.0 },
  [MECHANIC_IDS.EVASION]: { hp: 1.0, defense: 1.0 },
  [MECHANIC_IDS.COUNTER_ATTACK]: { resistance: 2.0, hp: 1.0 },
  [MECHANIC_IDS.ARMOR_BREAK]: { might: 1.0, physicalDamage: 1.0 },
  [MECHANIC_IDS.SKILL_DAMAGE]: { might: 1.2, skillDamage: 2.0 },
  [MECHANIC_IDS.PHYSICAL_DAMAGE]: { might: 1.2, physicalDamage: 2.0 },
  [MECHANIC_IDS.ADDITIONAL_ATTACK]: { physicalDamage: 2.0, speed: 1.0 },
  [MECHANIC_IDS.BLEED_BURN]: { skillDamage: 1.0, defense: 0.8 },
  [MECHANIC_IDS.VULNERABLE]: { skillDamage: 1.2, physicalDamage: 1.2 },
});

const MECHANIC_LABELS = Object.freeze({
  [MECHANIC_IDS.FATAL_BLOW]: 'Fatal Blow',
  [MECHANIC_IDS.DESTRUCTIVE_STRIKE]: 'Destructive Strike',
  [MECHANIC_IDS.COMBAT_SPEED]: 'Combat Speed',
  [MECHANIC_IDS.PREP_SKIP]: 'Prep skip',
  [MECHANIC_IDS.PRE_BATTLE]: 'Pre-Battle window',
  [MECHANIC_IDS.HEALING]: 'Healing',
  [MECHANIC_IDS.CONTROL]: 'Control status',
  [MECHANIC_IDS.SOBER]: 'Sober/Clarity',
  [MECHANIC_IDS.EVASION]: 'Evasion',
  [MECHANIC_IDS.COUNTER_ATTACK]: 'Counter-Attack',
  [MECHANIC_IDS.ARMOR_BREAK]: 'Armor Break',
  [MECHANIC_IDS.SKILL_DAMAGE]: 'Skill Damage',
  [MECHANIC_IDS.PHYSICAL_DAMAGE]: 'Physical Damage',
  [MECHANIC_IDS.ADDITIONAL_ATTACK]: 'Additional Attack',
  [MECHANIC_IDS.BLEED_BURN]: 'Bleed/Burn',
  [MECHANIC_IDS.VULNERABLE]: 'Vulnerable marks',
});

// Legion Skills whose descriptions contain these keywords receive an extra
// column-level boost for heroes that carry the matching mechanic. This is what
// ties e.g. Ramses II / Boudica to Column II "Sniper Archer" (+50% Fatal Blow
// and Destructive Strike damage).
const LEGION_DEMAND = Object.freeze({
  [MECHANIC_IDS.FATAL_BLOW]: { keywords: ['fatal blow'], weight: 4.0 },
  [MECHANIC_IDS.DESTRUCTIVE_STRIKE]: { keywords: ['destructive strike'], weight: 4.0 },
  [MECHANIC_IDS.COMBAT_SPEED]: { keywords: ['combat speed', 'first attack'], weight: 3.0 },
  [MECHANIC_IDS.PREP_SKIP]: { keywords: ['prep', 'pursuit', 'active skill'], weight: 2.5 },
  [MECHANIC_IDS.HEALING]: { keywords: ['healing', 'restore'], weight: 2.0 },
  [MECHANIC_IDS.SKILL_DAMAGE]: { keywords: ['skill damage', 'combat skill'], weight: 1.6 },
  [MECHANIC_IDS.PHYSICAL_DAMAGE]: { keywords: ['physical', 'normal attack'], weight: 1.2 },
  [MECHANIC_IDS.ADDITIONAL_ATTACK]: { keywords: ['normal attack', 'basic attack'], weight: 1.2 },
  [MECHANIC_IDS.CONTROL]: { keywords: ['suppress', 'silence', 'disarm', 'confuse'], weight: 1.0 },
  [MECHANIC_IDS.COUNTER_ATTACK]: { keywords: ['counter'], weight: 1.0 },
  [MECHANIC_IDS.ARMOR_BREAK]: { keywords: ['base might', 'base resistance'], weight: 1.0 },
});

// ---------------------------------------------------------------------------
// Hero profiling
// ---------------------------------------------------------------------------

function mechanicsForText(text) {
  const lowered = String(text || '').toLowerCase();
  const found = [];
  for (const [id, patterns] of MECHANIC_PATTERNS) {
    if (patterns.some((pattern) => lowered.includes(pattern))) found.push(id);
  }
  return found;
}

export function analyzeHeroMechanics(heroName) {
  const heroInfo = heroesExtendedData[heroName];
  const heroMeta = allHeroesData.find((hero) => hero.name === heroName);
  const type = heroMeta?.Type || 'All';
  const season = heroMeta?.season || 'S0';
  const skills = [];
  const mechanics = new Set();

  for (const skill of heroInfo?.skills || []) {
    const skillMechanics = mechanicsForText(skill.desc);
    skillMechanics.forEach((mechanic) => mechanics.add(mechanic));
    skills.push({
      id: skill.id,
      type: skill.type || '',
      mechanics: Object.freeze(skillMechanics.slice()),
    });
  }

  return Object.freeze({
    name: heroName,
    type,
    season,
    paid: heroMeta?.State === 'Paid',
    mechanics: Object.freeze([...mechanics]),
    skills: Object.freeze(skills),
    hasSkillText: Boolean(heroInfo?.skills?.length),
  });
}

// ---------------------------------------------------------------------------
// Tower supply profiling (per troop)
// ---------------------------------------------------------------------------

function nodeSupplyTags(node) {
  const tags = new Set();
  const bonusName = String(node.bonusName || '');
  const effect = String(node.effect || '');
  const context = node.context || 'general';
  if (bonusName.includes('Might')) tags.add('might');
  if (bonusName.includes('HP')) tags.add('hp');
  if (bonusName.includes('Resistance') || bonusName.includes('Defense')) {
    tags.add('resistance');
  }
  if (context === 'baseAttributes') tags.add('baseMight');
  if (bonusName.includes('Combat Speed') || bonusName.includes('Speed')) tags.add('speed');
  if (bonusName.includes('Countering')) tags.add('countering');
  if (/Physical Damage/i.test(bonusName)) tags.add('physicalDamage');
  if (/Damage Taken|Immunity/i.test(bonusName) || /less damage/i.test(effect)) tags.add('defense');
  return tags;
}

function milestoneSupplyTags(milestone) {
  const tags = new Set();
  const text = mechanicsForText(milestone.effect);
  const lowered = String(milestone.effect || '').toLowerCase();
  if (lowered.includes('combat speed')) tags.add('speed');
  if (lowered.includes('might')) tags.add('might');
  if (lowered.includes('hp')) tags.add('hp');
  if (lowered.includes('resistance')) tags.add('resistance');
  if (lowered.includes('countering')) tags.add('countering');
  if (lowered.includes('physical damage dealt') || lowered.includes('physical damage taken by')) {
    tags.add('physicalDamage');
  }
  if (lowered.includes('skill damage dealt') || lowered.includes('skill damage taken by')) {
    tags.add('skillDamage');
  }
  if (lowered.includes('damage dealt by') || lowered.includes('damage increased')) {
    tags.add(text.includes(MECHANIC_IDS.PHYSICAL_DAMAGE) ? 'physicalDamage' : 'skillDamage');
  }
  if (lowered.includes('damage taken') || lowered.includes('less damage')) tags.add('defense');
  if (lowered.includes('heal') || lowered.includes('restore') || lowered.includes('recover')) {
    tags.add('healing');
  }
  return { tags, text };
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

// The two paths, expressed as the node contexts each one actually fights in.
const MODE_CONTEXTS = Object.freeze({
  siege: ['siege', 'siegeAttacks', 'siegeDefense', 'reinforcingAllies', 'initiatingRally'],
  nonSiege: ['nonSiege', 'battlefield', 'roc'],
});

// Unconditional bonuses. They apply in every fight, so neither path may treat
// them as off-path — without this the whole Training and Neat Formation line,
// which is almost entirely `general`, sinks in both paths at once.
const ALWAYS_CONTEXTS = Object.freeze(['general', 'baseAttributes', 'skill']);

// Rally-join buffs apply when you send troops into someone else's rally, which
// is siege work, but they are also the only thing a joiner contributes in a
// field rally — so they count for both paths, at less than a full context.
const SHARED_CONTEXTS = Object.freeze(['rallyJoin']);

function normalizeMode(mode) {
  return HERO_PLAN_MODES.includes(mode) ? mode : HERO_PLAN_DEFAULT_MODE;
}

// A path is only worth picking if the two orders visibly differ, so the context
// share moves the score by up to 60% rather than the 25% the old four-mode
// version used.
function modeMultiplierForResearch(research, mode) {
  const preferred = MODE_CONTEXTS[normalizeMode(mode)];
  const nodes = research.nodes || [];
  if (!nodes.length) return 1.0;
  let covered = 0;
  let total = 0;
  nodes.forEach((node) => {
    const value = Math.abs(Number(node.bonusValue) || 0);
    const context = node.context || 'general';
    total += value;
    if (preferred.includes(context) || ALWAYS_CONTEXTS.includes(context)) covered += value;
    else if (SHARED_CONTEXTS.includes(context)) covered += value * 0.5;
  });
  if (!total) return 1.0;
  return 0.75 + 0.6 * (covered / total);
}

function heroAppliesToTroop(profile, troop) {
  if (profile.type === 'All') return 0.75;
  const mapped =
    profile.type === 'Archers'
      ? 'archer'
      : profile.type === 'Cavalry'
        ? 'cavalry'
        : profile.type === 'Footmen'
          ? 'footman'
          : null;
  return mapped === troop ? 1 : 0;
}

function scoreResearchForTroop(researchId, columnId, troop, profiles, mode, pathDemand, seedRank) {
  const research = SPECIALIZATION_RESEARCH[researchId];
  if (!research) return { score: 0, reasons: [] };
  const reasonEntries = [];
  let nodeMatch = 0;
  let milestoneMatch = 0;
  let legionMatch = 0;
  let affinity = 0;

  const SIGNATURE_MECHANICS = new Set([
    MECHANIC_IDS.FATAL_BLOW,
    MECHANIC_IDS.DESTRUCTIVE_STRIKE,
    MECHANIC_IDS.COMBAT_SPEED,
  ]);

  function addReason(weight, text) {
    reasonEntries.push({ weight, text });
  }

  for (const profile of profiles) {
    const apply = heroAppliesToTroop(profile, troop);
    if (!apply) continue;
    affinity += apply;
    if (!profile.hasSkillText) continue;

    for (const mechanic of profile.mechanics) {
      const demand = DEMAND_WEIGHTS[mechanic];
      if (!demand) continue;
      const reasonBase = 10 + (SIGNATURE_MECHANICS.has(mechanic) ? 10 : 0);

      for (const node of research.nodes || []) {
        const supply = nodeSupplyTags(node);
        let hit = 0;
        for (const [tag, weight] of Object.entries(demand)) {
          if (supply.has(tag)) hit += weight;
        }
        if (hit > 0) {
          nodeMatch += apply * hit;
          if (reasonEntries.length < 200) {
            addReason(
              reasonBase + hit,
              `${profile.name} · ${MECHANIC_LABELS[mechanic] || mechanic} → ${research.name}: ${node.bonusName || node.effect || 'attribute'} nodes`
            );
          }
        }
      }

      for (const milestone of research.skillMilestones?.[troop] || []) {
        const { tags, text } = milestoneSupplyTags(milestone);
        let hit = 0;
        for (const [tag, weight] of Object.entries(demand)) {
          if (tags.has(tag)) hit += weight;
        }
        if (text.includes(mechanic)) hit += 1.5;
        if (hit > 0) {
          milestoneMatch += apply * hit;
          if (reasonEntries.length < 200) {
            addReason(
              20 + reasonBase + hit,
              `${profile.name} · ${MECHANIC_LABELS[mechanic] || mechanic} → ${research.name} ${milestone.percent}% milestone`
            );
          }
        }
      }
    }
  }

  const columnSkill = SPECIALIZATION_LEGION_SKILLS[columnId]?.[troop];
  if (columnSkill?.desc) {
    for (const profile of profiles) {
      const apply = heroAppliesToTroop(profile, troop);
      if (!apply || !profile.hasSkillText) continue;
      for (const mechanic of profile.mechanics) {
        const legionDemand = LEGION_DEMAND[mechanic];
        if (!legionDemand) continue;
        const lowered = columnSkill.desc.toLowerCase();
        if (legionDemand.keywords.some((keyword) => lowered.includes(keyword))) {
          legionMatch += apply * legionDemand.weight;
          if (reasonEntries.length < 200) {
            addReason(
              50 + (SIGNATURE_MECHANICS.has(mechanic) ? 10 : 0) + legionDemand.weight,
              `${profile.name} · ${MECHANIC_LABELS[mechanic] || mechanic} → Column ${columnId} · ${columnSkill.name}`
            );
          }
        }
      }
    }
  }

  // Hand-checked paid-hero demand. Keyword matching cannot see that Alexander
  // needs the burning-damage milestones or that Lancelot wants Null-Heal set up
  // first, so the catalog states those directly and they are scored here.
  let catalogMatch = 0;
  const nodeCountRaw = (research.nodes || []).length || 1;
  for (const [tag, weight] of Object.entries(pathDemand.demand || {})) {
    let supplied = 0;
    for (const node of research.nodes || []) {
      if (nodeSupplyTags(node).has(tag)) supplied += 1;
    }
    for (const milestone of research.skillMilestones?.[troop] || []) {
      if (milestoneSupplyTags(milestone).tags.has(tag)) supplied += 1.5;
    }
    if (supplied > 0) catalogMatch += (weight * supplied) / Math.sqrt(nodeCountRaw);
  }
  const columnDemand = Number(pathDemand.columns?.[columnId]) || 0;
  if (columnDemand > 0) {
    catalogMatch += columnDemand * 2.5;
    if (columnSkill?.name) {
      // Below the per-hero Legion Skill reasons (50+): this one is true of all
      // four researches in the column, so a hero-specific reason says more.
      addReason(45 + columnDemand, `Column ${columnId} · ${columnSkill.name} — path payoff`);
    }
  }
  const researchDemand = Number(pathDemand.research?.[researchId]) || 0;
  if (researchDemand > 0) catalogMatch += researchDemand * 3.0;

  let positiveBonus = 0;
  let defensiveBonus = 0;
  for (const node of research.nodes || []) {
    const value = Number(node.bonusValue) || 0;
    if (value > 0) positiveBonus += value;
    else defensiveBonus += Math.abs(value);
  }
  const cost = Number(research.cost) || 1000;
  // Defensive buffs (negative "damage taken" values) count at half weight so
  // they are never free power, but they no longer deflate defensive researches.
  const efficiency = ((positiveBonus + 0.5 * defensiveBonus) / cost) * 1000;

  const modeMultiplier = modeMultiplierForResearch(research, mode);
  // Node matches are diluted by research size so 23-node researches cannot
  // snowball past concentrated 10-node ones on raw hit count alone.
  const nodeCount = nodeCountRaw;
  // The community chart order, as a small prior. It never outvotes a hero
  // reason; it just decides the ties the heroes are indifferent to.
  const seedBonus = seedRank >= 0 ? (32 - seedRank) * 0.05 : 0;
  const score =
    (2.0 * affinity +
      (0.6 * nodeMatch) / Math.sqrt(nodeCount) +
      2.2 * milestoneMatch +
      1.2 * legionMatch +
      1.5 * catalogMatch +
      efficiency) *
      modeMultiplier +
    seedBonus;

  const bestByText = new Map();
  for (const entry of reasonEntries) {
    const existing = bestByText.get(entry.text);
    if (!existing || existing.weight < entry.weight) bestByText.set(entry.text, entry.weight);
  }
  const reasons = [...bestByText.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 3)
    .map(([text]) => text);

  return { score: Number(score.toFixed(3)), reasons };
}

// ---------------------------------------------------------------------------
// Plan building
// ---------------------------------------------------------------------------

function normalizeHeroNames(heroes) {
  const seen = new Set();
  const result = [];
  for (const hero of Array.isArray(heroes) ? heroes : []) {
    const name = String(hero || '').trim();
    if (!name || seen.has(name)) continue;
    if (!allHeroesData.some((entry) => entry.name === name)) continue;
    seen.add(name);
    result.push(name);
  }
  return result;
}

// Which community chart seeds a troop: the paid-hero chart once the roster owns
// any of that troop's paid heroes, the free-to-play chart otherwise.
function seedRouteFor(troop, pathDemand) {
  return getRouteOrder(pathDemand.heroCount > 0 ? 'spender' : 'f2p', troop);
}

/**
 * Build one ordered plan per troop.
 *
 * @param {object}   options
 * @param {string[]} options.heroes   Hero names the player owns.
 * @param {string}   options.mode     'siege' | 'nonSiege'.
 * @param {object}   options.presets  Optional `{troop: presetId}` override; any
 *                                    troop left out picks its best-fit preset.
 */
export function buildHeroPlans({ heroes = [], mode = HERO_PLAN_DEFAULT_MODE, presets = {} } = {}) {
  const normalizedMode = normalizeMode(mode);
  const roster = normalizeHeroNames(heroes);
  const profiles = roster.map(analyzeHeroMechanics);

  const plans = {};
  for (const troop of HERO_PLAN_TROOPS) {
    const requested = presets?.[troop];
    const presetId =
      requested === F2P_PATH_ID || getPathPreset(requested)?.troop === troop
        ? requested
        : suggestedPathId(troop, roster);
    const pathDemand = pathDemandFor(troop, roster, presetId);
    const seed = seedRouteFor(troop, pathDemand);

    const researchOrder = [];
    const steps = {};
    const reasons = {};
    let towerScore = 0;

    const columnIds = Object.keys(SPECIALIZATION_COLUMNS)
      .map(Number)
      .sort((a, b) => a - b);
    for (const columnId of columnIds) {
      const researches = (SPECIALIZATION_COLUMNS[columnId]?.researches || [])
        .map((researchId) => ({
          researchId,
          ...scoreResearchForTroop(
            researchId,
            columnId,
            troop,
            profiles,
            normalizedMode,
            pathDemand,
            seed.indexOf(researchId)
          ),
        }))
        .sort((a, b) => b.score - a.score || a.researchId.localeCompare(b.researchId));
      researches.forEach((entry) => {
        researchOrder.push(entry.researchId);
        towerScore += entry.score;
        steps[entry.researchId] = researchOrder.length;
        if (entry.reasons.length) reasons[entry.researchId] = Object.freeze(entry.reasons);
      });
    }

    plans[troop] = Object.freeze({
      troop,
      presetId: pathDemand.presetId,
      pathHeroes: Object.freeze(pathDemand.notes.map((entry) => entry.hero)),
      heroNotes: Object.freeze(pathDemand.notes.map((entry) => Object.freeze({ ...entry }))),
      siegeBias: pathDemand.siegeBias,
      towerScore: Number(towerScore.toFixed(3)),
      researchOrder: Object.freeze(researchOrder),
      steps: Object.freeze(steps),
      reasons: Object.freeze(reasons),
    });
  }

  return Object.freeze({
    mode: normalizedMode,
    heroCount: roster.length,
    roster: Object.freeze(roster.slice()),
    plans: Object.freeze(plans),
  });
}

export function getHeroPlanStep(plan, researchId) {
  return plan?.steps?.[researchId] || 0;
}

export function getHeroPlanLength(plan) {
  return plan?.researchOrder?.length || 0;
}

export function getNextHeroPlanResearch(plan, isComplete) {
  if (!plan || !Array.isArray(plan.researchOrder)) return null;
  return plan.researchOrder.find((researchId) => !isComplete(researchId)) || null;
}

export function getHeroPlanRanking(plans) {
  return HERO_PLAN_TROOPS.slice()
    .map((troop) => ({ troop, ...(plans?.[troop] || { towerScore: 0 }) }))
    .sort((a, b) => b.towerScore - a.towerScore);
}

// ---------------------------------------------------------------------------
// Internal helpers exported for tests
// ---------------------------------------------------------------------------

export function heroMechanicsSummary(heroName) {
  const profile = analyzeHeroMechanics(heroName);
  return profile.mechanics.map((mechanic) => MECHANIC_LABELS[mechanic] || mechanic);
}
