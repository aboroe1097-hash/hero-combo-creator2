import { STRIFE_MONSTERS } from '../../strife-db.js';

export const STRIFE_MONSTER_IDS = Object.freeze(STRIFE_MONSTERS.map((m) => m.id));

export const STRIFE_SKILL_IDS = Object.freeze(
  STRIFE_MONSTERS.flatMap((monster) => monster.skills.map((skill) => `${monster.id}:${skill.id}`))
);

const CANONICAL_SKILLS = Object.fromEntries(
  STRIFE_MONSTERS.flatMap((m) =>
    m.skills.map((s) => [`${m.id}:${s.id}`, { name: s.name, effect: s.effect, answer: s.answer }])
  )
);
const CANONICAL_MONSTERS = Object.fromEntries(
  STRIFE_MONSTERS.map((m) => [m.id, { name: m.name }])
);

export const STRIFE_GUIDE_IDS = Object.freeze([
  'gambosate:0',
  'gambosate:1',
  'gambosate:2',
  'pivana:0',
  'pivana:1',
  'titanus:0',
  'titanus:1',
  'noisy-noel:0',
  'noisy-noel:1',
  'trident-north-sea:0',
  'trident-north-sea:1',
]);

export const STRIFE_TIMINGS = Object.freeze([
  'Rounds 1-3',
  'Ongoing',
  'Round 4 onward',
  'All 8 rounds',
  'During battle',
  'Passive',
  'After normal attacks',
  'Rounds 1 and 4',
  'Rounds 1-2',
  'Rounds 1-4',
  'Rounds 1, 3, 5, 7',
  'Preparation',
  'After 2-round prep',
  'When damaged',
  'Rounds 1, 4',
  'Every round',
]);

export const STRIFE_TARGETS = Object.freeze([
  'Random squad',
  'Spring Rabbit',
  '2 random squads',
  'Gambosate',
  'All player squads',
  'Gambosate army',
  'All Pilvana squads',
  'Random squads',
  'Pilvana squad',
  'Titanus',
  'Titanus army',
  'Fordogreen',
  'Attacking squad',
  '1 random squad',
  'All squads',
  'Savage Swordsman',
  'Sasha army',
  'Noisy Noel',
  'Noisy Noel army',
  'All squads in range',
  'Trident',
  '3 random enemy squads',
  'Trident army',
  'Drained squad',
  'Frost Queen',
  'Lowest-power squad',
  'Fordogreen army',
  '2-3 random squads',
  '1 random squad each',
  'Vialfiend',
]);

export const STRIFE_TAGS = Object.freeze([
  'Early Burst',
  'Physical',
  'Shield',
  'Skill Reduction',
  'Late Spike',
  'Random Hits',
  'Control Immune',
  'Silence',
  'Anti-Heal',
  'Stat Boss',
  'Survival',
  'Disarm',
  'Skill Damage',
  'DPS Race',
  'Timed Burst',
  'All Squads',
  'Damage Reduction',
  'Bleed',
  'Early Shield',
  'Normal Immune',
  'Reflect',
  'Anti-Physical',
  'De-buff',
  'Control',
  'Physical Weakness',
  'Suppression',
  'Burn Weakness',
  'Normal Reduction',
  'Random Burst',
  'Repeated Hits',
  'Early Survival',
  'Counter Damage',
  'Endurance',
  'Might Drain',
  'Stat Check',
  'Late Burst',
  'Physical Reduction',
  'Skill Weakness',
  'Crit Weakness',
  'Focus Fire',
  'Stacking Debuff',
  'Skill Denial',
  'Damage Cap',
  'Might Buff',
  'Troop Cap',
]);

function orderedRecord(ids, values, fallbackMap) {
  const list = Array.isArray(values) ? values : [];
  return Object.fromEntries(
    ids.map((id, index) => {
      const val = list[index];
      if (val !== undefined && val !== null) return [id, val];
      if (fallbackMap && fallbackMap[id] !== undefined) return [id, fallbackMap[id]];
      return [id, id];
    })
  );
}

export function defineStrifePack({ monsterNames, skills, guideNotes, timings, targets, tags }) {
  const monsters = Object.fromEntries(
    STRIFE_MONSTER_IDS.map((id, index) => [
      id,
      { name: monsterNames?.[index] || CANONICAL_MONSTERS[id]?.name || id },
    ])
  );
  for (const [guideId, note] of Object.entries(
    orderedRecord(STRIFE_GUIDE_IDS, guideNotes)
  )) {
    const [monsterId, rawIndex] = guideId.split(':');
    const index = Number(rawIndex);
    monsters[monsterId].guideNotes ||= [];
    monsters[monsterId].guideNotes[index] = note;
  }

  const skillEntries = Array.isArray(skills)
    ? skills.map(([name, effect, answer]) => ({ name, effect, answer }))
    : [];

  return Object.freeze({
    monsters: Object.freeze(monsters),
    skills: Object.freeze(orderedRecord(STRIFE_SKILL_IDS, skillEntries, CANONICAL_SKILLS)),
    timings: Object.freeze(orderedRecord(STRIFE_TIMINGS, timings)),
    targets: Object.freeze(orderedRecord(STRIFE_TARGETS, targets)),
    tags: Object.freeze(orderedRecord(STRIFE_TAGS, tags)),
  });
}
