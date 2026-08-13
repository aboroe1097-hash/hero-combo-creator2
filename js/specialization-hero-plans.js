// js/specialization-hero-plans.js
/**
 * Specialization Towers Skill-Semantics Auto-Path Engine.
 *
 * Parses S0–X2 hero skill text mechanics (Pre-Battle, Fatal Blow, Counter-Attack,
 * Silence, Disarm, Armor Break, Flammable/Burning, Evasion, etc.) and matches them
 * against Tower Specialization Researches (Columns I–VIII), producing a medal-optimized
 * progression order with explicit hero skill rationale tooltips.
 */

import { heroesExtendedData } from './heroes-info.js';
import { allHeroesData } from './heroes-data.js';
import {
  SPECIALIZATION_COLUMNS,
  SPECIALIZATION_RESEARCH,
} from './specialization-towers-v2-data.js';

export const HERO_PLAN_MODES = Object.freeze(['balanced', 'field', 'rally', 'siege']);

export const MECHANIC_TAGS = Object.freeze({
  PREP_BURST: 'prep_burst',
  FATAL_BLOW_CRIT: 'fatal_blow_crit',
  COUNTER_ATTACK: 'counter_attack',
  ARMOR_BREAK: 'armor_break',
  EVASION: 'evasion',
  SKILL_DAMAGE: 'skill_damage',
  MASS_ATTACK: 'mass_attack',
  STATUS_CONTROL: 'status_control',
});

/**
 * Parses skill mechanics vocabulary for a single hero.
 */
export function analyzeHeroMechanics(heroName) {
  const heroInfo = heroesExtendedData[heroName];
  const heroMeta = allHeroesData.find((h) => h.name === heroName);
  const type = heroMeta?.Type || 'All';
  const season = heroMeta?.season || 'S0';

  if (!heroInfo || !heroInfo.skills) {
    return {
      name: heroName,
      type,
      season,
      tags: [MECHANIC_TAGS.SKILL_DAMAGE],
      skillExplanations: [],
    };
  }

  const tags = new Set();
  const skillExplanations = [];

  heroInfo.skills.forEach((skill) => {
    const desc = (skill.desc || '').toLowerCase();
    const skillType = (skill.type || '').toLowerCase();
    const id = skill.id || 0;

    if (
      skillType.includes('pre-battle') ||
      desc.includes('first 2 turns') ||
      desc.includes('first 3 turns') ||
      desc.includes('first 6 turns') ||
      desc.includes('pre battle')
    ) {
      tags.add(MECHANIC_TAGS.PREP_BURST);
      skillExplanations.push({
        tag: MECHANIC_TAGS.PREP_BURST,
        text: `${heroName} Skill ${id} (${skill.type}): Grants Pre-Battle turn-window damage/buffs.`,
      });
    }

    if (desc.includes('fatal blow') || desc.includes('crit')) {
      tags.add(MECHANIC_TAGS.FATAL_BLOW_CRIT);
      skillExplanations.push({
        tag: MECHANIC_TAGS.FATAL_BLOW_CRIT,
        text: `${heroName} Skill ${id}: Triggers Fatal Blow / Critical damage.`,
      });
    }

    if (
      desc.includes('counter-attack') ||
      desc.includes('counterattack') ||
      desc.includes('return 150%') ||
      desc.includes('return damage')
    ) {
      tags.add(MECHANIC_TAGS.COUNTER_ATTACK);
      skillExplanations.push({
        tag: MECHANIC_TAGS.COUNTER_ATTACK,
        text: `${heroName} Skill ${id}: Engages Counter-Attack retaliation status.`,
      });
    }

    if (desc.includes('armor break') || (desc.includes('lower') && desc.includes('defense'))) {
      tags.add(MECHANIC_TAGS.ARMOR_BREAK);
      skillExplanations.push({
        tag: MECHANIC_TAGS.ARMOR_BREAK,
        text: `${heroName} Skill ${id}: Applies Armor Break defense reduction.`,
      });
    }

    if (desc.includes('evade') || desc.includes('evasion') || desc.includes('immune this damage')) {
      tags.add(MECHANIC_TAGS.EVASION);
      skillExplanations.push({
        tag: MECHANIC_TAGS.EVASION,
        text: `${heroName} Skill ${id}: Grants Evasion / Damage immunity.`,
      });
    }

    if (desc.includes('silence') || desc.includes('disarm') || desc.includes('confuse') || desc.includes('taunt')) {
      tags.add(MECHANIC_TAGS.STATUS_CONTROL);
      skillExplanations.push({
        tag: MECHANIC_TAGS.STATUS_CONTROL,
        text: `${heroName} Skill ${id}: Applies Control status (Silence/Disarm/Confuse/Taunt).`,
      });
    }

    if (skillType.includes('combat') || desc.includes('skill damage')) {
      tags.add(MECHANIC_TAGS.SKILL_DAMAGE);
    }
  });

  return {
    name: heroName,
    type,
    season,
    tags: Array.from(tags),
    skillExplanations,
  };
}

/**
 * Computes a skill-semantics synergy profile for a research given a roster and mode.
 */
export function scoreResearchForRoster(researchId, selectedHeroNames = [], mode = 'balanced') {
  const research = SPECIALIZATION_RESEARCH[researchId];
  if (!research) return { score: 0, rationale: [] };

  const profiles = selectedHeroNames.map(analyzeHeroMechanics);
  let totalSynergy = 0;
  const rationale = [];

  const nodes = research.nodes || [];
  const cost = Number(research.cost) || 1000;

  // Context weights based on mode
  let modeMultiplier = 1.0;
  if (mode === 'rally' && (research.context === 'initiatingRally' || research.context === 'roc')) {
    modeMultiplier = 1.4;
  } else if (mode === 'siege' && research.context === 'siegeAttacks') {
    modeMultiplier = 1.5;
  } else if (mode === 'field' && research.context === 'general') {
    modeMultiplier = 1.25;
  }

  nodes.forEach((node) => {
    const effect = (node.effect || '').toLowerCase();
    const bonusName = (node.bonusName || '').toLowerCase();

    profiles.forEach((profile) => {
      profile.tags.forEach((tag) => {
        if (tag === MECHANIC_TAGS.PREP_BURST && (effect.includes('might') || effect.includes('damage'))) {
          totalSynergy += 3.0;
          rationale.push(`Amplifies ${profile.name}'s Pre-Battle damage window`);
        }
        if (tag === MECHANIC_TAGS.FATAL_BLOW_CRIT && (bonusName.includes('might') || effect.includes('crit'))) {
          totalSynergy += 3.5;
          rationale.push(`Synergizes with ${profile.name}'s Fatal Blow mechanics`);
        }
        if (tag === MECHANIC_TAGS.COUNTER_ATTACK && (effect.includes('resistance') || effect.includes('hp'))) {
          totalSynergy += 2.5;
          rationale.push(`Bolsters ${profile.name}'s Counter-Attack & frontline survival`);
        }
        if (tag === MECHANIC_TAGS.ARMOR_BREAK && (effect.includes('might') || effect.includes('damage'))) {
          totalSynergy += 2.0;
          rationale.push(`Complements ${profile.name}'s Armor Break vulnerability`);
        }
      });
    });
  });

  // Base efficiency: medals per 1% total bonus
  let totalBonus = 0;
  nodes.forEach((n) => { totalBonus += Number(n.bonusValue) || 0; });
  const efficiency = totalBonus > 0 ? (totalBonus / cost) * 100 : 0.01;

  const finalScore = (totalSynergy + efficiency) * modeMultiplier;

  return {
    researchId,
    score: Number(finalScore.toFixed(3)),
    rationale: Array.from(new Set(rationale)),
  };
}

/**
 * Builds the complete skill-semantics progression plan for the specialization towers.
 */
export function buildHeroSpecializationPlan(selectedHeroNames = [], mode = 'balanced') {
  const order = [];
  const rationaleMap = {};

  const sortedColumns = Object.keys(SPECIALIZATION_COLUMNS)
    .map(Number)
    .sort((a, b) => a - b);

  sortedColumns.forEach((columnId) => {
    const columnResearches = (SPECIALIZATION_COLUMNS[columnId]?.researches || []).map((id) => ({
      id,
      ...scoreResearchForRoster(id, selectedHeroNames, mode),
    }));

    // Sort researches within column by calculated synergy score
    columnResearches.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));

    columnResearches.forEach((entry) => {
      order.push(entry.id);
      if (entry.rationale.length > 0) {
        rationaleMap[entry.id] = entry.rationale;
      }
    });
  });

  return {
    order: Object.freeze(order),
    rationale: Object.freeze(rationaleMap),
    mode,
    heroCount: selectedHeroNames.length,
  };
}
