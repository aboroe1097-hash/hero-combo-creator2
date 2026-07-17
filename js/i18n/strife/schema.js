export const STRIFE_MONSTER_IDS = Object.freeze([
  'rabbit',
  'gambosate',
  'pivana',
  'titanus',
  'fordogreen',
  'savage-swordsman',
  'sasha',
  'noisy-noel',
  'trident-north-sea',
  'black-annis',
  'frost-queen',
]);

export const STRIFE_SKILL_IDS = Object.freeze([
  'rabbit:playful-leap',
  'rabbit:carrot-shield',
  'gambosate:outrage',
  'gambosate:legions-will',
  'gambosate:ferocious-roar',
  'gambosate:power-of-the-legion',
  'pivana:furious-strike',
  'pivana:dirty-tricks',
  'pivana:uncontrolled-rage',
  'titanus:deadly-blade',
  'titanus:colossal-figure',
  'titanus:butcher-in-the-wild',
  'titanus:power-of-the-legion',
  'fordogreen:preemptive-strike',
  'fordogreen:broken-promise',
  'fordogreen:hunt-you-down',
  'fordogreen:power-of-the-legion',
  'savage-swordsman:ferocious-roar',
  'savage-swordsman:top-swordsman',
  'savage-swordsman:savage-in-nature',
  'sasha:storm-shield',
  'sasha:sashas-curse',
  'sasha:legions-strength',
  'noisy-noel:invisible',
  'noisy-noel:clown-makeup',
  'noisy-noel:pickpocket',
  'noisy-noel:power-of-the-legion',
  'trident-north-sea:trident-swing',
  'trident-north-sea:lasting-stamina',
  'trident-north-sea:backlash',
  'trident-north-sea:power-of-the-legion',
  'black-annis:hags-claw',
  'black-annis:devourers-feast',
  'frost-queen:frozen-tomb',
  'frost-queen:glacial-armor',
]);

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
]);

function orderedRecord(ids, values, kind) {
  if (!Array.isArray(values) || values.length !== ids.length) {
    throw new Error(`Strife ${kind} pack must contain ${ids.length} entries.`);
  }
  return Object.fromEntries(ids.map((id, index) => [id, values[index]]));
}

export function defineStrifePack({ monsterNames, skills, guideNotes, timings, targets, tags }) {
  const monsters = Object.fromEntries(
    STRIFE_MONSTER_IDS.map((id, index) => [id, { name: monsterNames?.[index] }])
  );
  for (const [guideId, note] of Object.entries(
    orderedRecord(STRIFE_GUIDE_IDS, guideNotes, 'guide-note')
  )) {
    const [monsterId, rawIndex] = guideId.split(':');
    const index = Number(rawIndex);
    monsters[monsterId].guideNotes ||= [];
    monsters[monsterId].guideNotes[index] = note;
  }

  return Object.freeze({
    monsters: Object.freeze(monsters),
    skills: Object.freeze(
      orderedRecord(
        STRIFE_SKILL_IDS,
        skills?.map(([name, effect, answer]) => ({ name, effect, answer })),
        'skill'
      )
    ),
    timings: Object.freeze(orderedRecord(STRIFE_TIMINGS, timings, 'timing')),
    targets: Object.freeze(orderedRecord(STRIFE_TARGETS, targets, 'target')),
    tags: Object.freeze(orderedRecord(STRIFE_TAGS, tags, 'tag')),
  });
}
