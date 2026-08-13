// js/specialization-hero-plans.js
// Skill-semantics auto-path engine for the Specialization Towers.
//
// Pure data module: no DOM. Reads the S0-X2 hero skill catalog and matches each
// owned hero's mechanics against tower content per troop type:
//   - attribute nodes (Might/HP/Resistance/Base Attributes/Countering/Speed)
//   - troop-specific 25/50/75/100% milestones (combat speed, troop damage,
//     countering, control-damage reduction)
//   - per-column Legion Skills (Sniper Archer, Combo, Impenetrable Formation, ...)
//
// Output is one ordered research plan per troop (cavalry/archer/footman) that
// keeps the game's column order (I-VIII) and only reorders the four researches
// inside each column, plus human-readable reasons citing the owned hero skills.

import { heroesExtendedData } from './heroes-info.js';
import { allHeroesData } from './heroes-data.js';
import {
  SPECIALIZATION_COLUMNS,
  SPECIALIZATION_LEGION_SKILLS,
  SPECIALIZATION_RESEARCH,
} from './specialization-towers-v2-data.js';

export const HERO_PLAN_MODES = Object.freeze(['balanced', 'field', 'rally', 'siege']);
export const HERO_PLAN_TROOPS = Object.freeze(['cavalry', 'archer', 'footman']);
export const HERO_PLAN_DATA_REVISION = '2026-08-13-skill-semantics-v1';

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
  [MECHANIC_IDS.HEALING]: { hp: 1.6, resistance: 0.8 },
  [MECHANIC_IDS.CONTROL]: { skillDamage: 0.8, resistance: 0.8 },
  [MECHANIC_IDS.SOBER]: { hp: 1.0, resistance: 1.6 },
  [MECHANIC_IDS.EVASION]: { hp: 1.0 },
  [MECHANIC_IDS.COUNTER_ATTACK]: { resistance: 2.0, hp: 1.0 },
  [MECHANIC_IDS.ARMOR_BREAK]: { might: 1.0, physicalDamage: 1.0 },
  [MECHANIC_IDS.SKILL_DAMAGE]: { might: 1.2, skillDamage: 2.0 },
  [MECHANIC_IDS.PHYSICAL_DAMAGE]: { might: 1.2, physicalDamage: 2.0 },
  [MECHANIC_IDS.ADDITIONAL_ATTACK]: { physicalDamage: 2.0, speed: 1.0 },
  [MECHANIC_IDS.BLEED_BURN]: { skillDamage: 1.0 },
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

const MODE_CONTEXTS = Object.freeze({
  field: ['nonSiege', 'battlefield', 'roc', 'general'],
  rally: ['rallyJoin', 'initiatingRally', 'roc', 'battlefield'],
  siege: ['siege', 'siegeAttacks', 'siegeDefense', 'reinforcingAllies'],
});

function modeMultiplierForResearch(research, mode) {
  const preferred = MODE_CONTEXTS[mode];
  if (!preferred) return 1.0;
  const nodes = research.nodes || [];
  if (!nodes.length) return 1.0;
  let covered = 0;
  let total = 0;
  nodes.forEach((node) => {
    const value = Number(node.bonusValue) || 0;
    total += Math.abs(value);
    if (preferred.includes(node.context || 'general')) covered += Math.abs(value);
  });
  if (!total) return 1.0;
  return 1 + 0.25 * (covered / total);
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

function scoreResearchForTroop(researchId, columnId, troop, profiles, mode) {
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
  const nodeCount = (research.nodes || []).length || 1;
  const score =
    (2.0 * affinity +
      (0.6 * nodeMatch) / Math.sqrt(nodeCount) +
      2.2 * milestoneMatch +
      1.2 * legionMatch +
      efficiency) *
    modeMultiplier;

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

export function buildHeroPlans({ heroes = [], mode = 'balanced' } = {}) {
  const normalizedMode = HERO_PLAN_MODES.includes(mode) ? mode : 'balanced';
  const roster = normalizeHeroNames(heroes);
  const profiles = roster.map(analyzeHeroMechanics);

  const plans = {};
  for (const troop of HERO_PLAN_TROOPS) {
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
          ...scoreResearchForTroop(researchId, columnId, troop, profiles, normalizedMode),
        }))
        .sort((a, b) => b.score - a.score || a.researchId.localeCompare(b.researchId));
      researches.forEach((entry, index) => {
        researchOrder.push(entry.researchId);
        towerScore += entry.score;
        steps[entry.researchId] = researchOrder.length;
        if (entry.reasons.length) reasons[entry.researchId] = Object.freeze(entry.reasons);
      });
    }

    plans[troop] = Object.freeze({
      troop,
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
