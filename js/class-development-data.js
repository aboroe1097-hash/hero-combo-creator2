const PROFILES = [
  {
    id: 'raider',
    icon: '⚔',
    name: 'Raider',
    role: 'Combat & plunder',
    finalLevel: 138,
    checkpoints: [14, 29, 42, 51, 65, 80, 89, 102, 119, 121, 138],
    cardMix: { income: 6, class: 5, alliance: 1, general: 1 },
    strengths: ['Plunder gold', 'Siege might and resistance', 'Combat-first progression'],
    tradeoffs: [
      '−50% harvesting payload',
      '−30% production output',
      'The example path favors cavalry',
    ],
    priorities: [
      { level: 14, skill: 'Legion Organization I' },
      { level: 29, skill: 'Siege Tactics I' },
      { level: 42, skill: 'Show of Power I' },
      { level: 51, skill: 'Questing Adventurer III' },
      { level: 65, skill: 'Legion Organization II' },
      { level: 80, skill: 'Fast Learner II' },
      { level: 89, skill: 'Questing Adventurer V' },
      { level: 102, skill: 'More work more gain II' },
      { level: 119, skill: 'Aspirant' },
      { level: 121, skill: 'Fast Learner IV' },
    ],
    followUps: [
      'Questing Adventurer I–V',
      'Fast Learner I–IV',
      'Finish the troop and alliance combat branches after profession XP',
    ],
    targets: [
      '+10% cavalry siege might',
      '+10% cavalry siege resistance',
      'Alliance: +3% cavalry HP',
      'Class cards: 50k, 25k, 25%, 25%, +2 daily quests',
      'General: +1 daily quest',
    ],
    sourceUrl: 'https://l96.app/public/raider-class-development-on-rise-of-empires',
  },
  {
    id: 'farmer',
    icon: '🌾',
    name: 'Farmer',
    role: 'Gathering & production',
    finalLevel: 130,
    checkpoints: [19, 28, 41, 48, 56, 83, 99, 105, 121, 125, 130],
    cardMix: { income: 6, class: 5, alliance: 1, general: 2 },
    strengths: ['+100% harvesting payload', '+50% gathering speed', 'Extra depot protection'],
    tradeoffs: [
      '−30% marching speed',
      '−30% siege defense and damage',
      'Resource choice should match your economy',
    ],
    priorities: [
      { level: 19, skill: 'Use Its All I' },
      { level: 28, skill: 'Timed Agriculture I' },
      { level: 41, skill: 'Fast Learner I' },
      { level: 48, skill: 'Questing Adventurer III' },
      { level: 56, skill: 'Use Its All II' },
      { level: 83, skill: 'Fast Learner II' },
      { level: 99, skill: 'Fast Learner III' },
      { level: 105, skill: 'Questing Adventurer VI' },
      { level: 121, skill: 'More work more gain II' },
      { level: 125, skill: 'Fast Learner IV' },
    ],
    followUps: [
      'Questing Adventurer I–VI',
      'Fast Learner I–IV',
      'Max your chosen harvesting resource after the XP path',
    ],
    targets: [
      '+87,500 iron per hour in the example path',
      '+50% iron gathering speed and +10% rushed production',
      'Alliance: +7% iron gathering speed',
      'Class cards: 50k, 25k, 25%, 25%, +2 daily quests',
      'General: +1 daily quest',
    ],
    sourceUrl: 'https://l96.app/public/farmer-class-development-on-rise-of-empires',
  },
  {
    id: 'trader',
    icon: '◆',
    name: 'Trader',
    role: 'Caravan & Class COP',
    finalLevel: 111,
    checkpoints: [17, 25, 32, 43, 52, 56, 67, 76, 89, 100, 103, 111],
    cardMix: { income: 5, class: 5, alliance: 2, general: 2 },
    strengths: ['Larger trade caravan', 'Lower trade tax', 'Defending might and resistance'],
    tradeoffs: ['−50% healing speed', '+100% losses when raided', 'Late branches target Class COP'],
    priorities: [
      { level: 25, skill: 'Witty I' },
      { level: 32, skill: 'Fast Learner I' },
      { level: 43, skill: 'Questing Adventurer III' },
      { level: 52, skill: 'Buy n Sell II' },
      { level: 56, skill: 'Questing Adventurer IV' },
      { level: 67, skill: 'Fast Learner II' },
      { level: 76, skill: 'Questing Adventurer V' },
      { level: 89, skill: 'Questing Adventurer VI' },
      { level: 100, skill: 'Duchess' },
      { level: 103, skill: 'Fast Learner IV' },
    ],
    followUps: [
      'Charming I–IV',
      'Denounce II and Containment Policy II',
      'Unification Treaty after the profession XP path',
    ],
    targets: [
      'Up to +80% individual Class COP score',
      'Alliance: up to +8% KE and soldier-training score',
      'Enemy: −5% might and resistance',
      'Class cards: 50k, 25k, 25%, 25%, 25%, +2 daily quests',
    ],
    sourceUrl: 'https://www.l96.app/trader-class-development-on-rise-of-empires',
  },
  {
    id: 'craftsman',
    icon: '⚒',
    name: 'Craftsman',
    alias: 'Architect / Builder',
    role: 'Construction & honor',
    finalLevel: 118,
    checkpoints: [32, 54, 63, 81, 98, 100, 112, 115, 118],
    cardMix: { income: 4, class: 5, alliance: 2, general: 1 },
    strengths: [
      'Lower building material costs',
      'More construction honor',
      'Faster building and repair',
    ],
    tradeoffs: [
      'The sheet stops at the level 118 reset',
      'Best value is concentrated in Eden/RoC',
      'Route depends on alliance honor goals',
    ],
    priorities: [
      { level: 54, skill: 'Questing Adventurer III' },
      { level: 63, skill: 'More work more gain I' },
      { level: 81, skill: 'Fast Learner II' },
      { level: 98, skill: 'Urban Planning I' },
      { level: 100, skill: 'Questing Adventurer VI' },
      { level: 112, skill: 'More work more gain II' },
      { level: 115, skill: 'Fast Learner IV' },
      { level: 118, skill: 'Support Tunnel I' },
    ],
    followUps: [
      'Questing Adventurer I–VI',
      'Fast Learner I–IV',
      'Finish honor and construction-discount branches after XP',
    ],
    targets: [
      'Income: +2 quests, −20% material cost, +30% honor, −5% gold cost',
      'Alliance: −3% material cost and +5% honor',
      'Class cards: 50k, 25k, 25%, 25%, 30%',
      'General: +1 quest',
    ],
    sourceUrl: 'https://www.l96.app/builder-class-development-on-rise-of-empires',
  },
];

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

export const CLASS_DEVELOPMENT_PROFILES = deepFreeze(PROFILES);

export function getClassDevelopmentProfile(id) {
  return CLASS_DEVELOPMENT_PROFILES.find((profile) => profile.id === id) || null;
}

export function getNextClassCheckpoint(profileOrId, currentLevel) {
  const profile =
    typeof profileOrId === 'string' ? getClassDevelopmentProfile(profileOrId) : profileOrId;
  if (!profile) return null;
  const level = Math.max(0, Math.floor(Number(currentLevel) || 0));
  return profile.checkpoints.find((checkpoint) => checkpoint > level) || null;
}

export function validateClassDevelopmentProfiles(profiles = CLASS_DEVELOPMENT_PROFILES) {
  const errors = [];
  const ids = new Set();
  profiles.forEach((profile) => {
    if (!profile.id || ids.has(profile.id))
      errors.push(`Duplicate or missing id: ${profile.id || '?'}`);
    ids.add(profile.id);
    if (!profile.name || !profile.role || !profile.sourceUrl)
      errors.push(`${profile.id}: missing metadata`);
    if (!Array.isArray(profile.checkpoints) || profile.checkpoints.length === 0) {
      errors.push(`${profile.id}: missing checkpoints`);
      return;
    }
    const sorted = [...profile.checkpoints].sort((a, b) => a - b);
    if (sorted.some((level, index) => level !== profile.checkpoints[index])) {
      errors.push(`${profile.id}: checkpoints must be ascending`);
    }
    if (profile.checkpoints.at(-1) !== profile.finalLevel) {
      errors.push(`${profile.id}: final level must equal the last checkpoint`);
    }
    const cardCount = Object.values(profile.cardMix || {}).reduce((sum, value) => sum + value, 0);
    if (cardCount < 1) errors.push(`${profile.id}: card mix is empty`);
  });
  return errors;
}
