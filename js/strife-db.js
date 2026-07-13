// js/strife-db.js
// Strife over Dragon manual recommendation data.
// Hero order is always [Front, Middle, Back].

export const STRIFE_SEASONS = ['S0', 'S1', 'S2', 'S3', 'S4', 'X1', 'X2'];

export const STRIFE_MONSTERS = [
  {
    id: 'rabbit',
    name: 'Rabbit',
    accent: '#f87171',
    imageUrl: 'images/strife/monsters/rabbit.jpg',
    skills: [
      {
        name: 'Playful Leap',
        timing: 'Rounds 1-3',
        target: 'Random squad',
        effect: 'Launches a sudden leap dealing high physical damage.',
        answer: 'Use strong front-row defenders or damage prevention.',
        tags: ['Early Burst', 'Physical'],
      },
      {
        name: 'Carrot Shield',
        timing: 'Ongoing',
        target: 'Spring Rabbit',
        effect: 'Gains a shield that blocks a portion of skill damage.',
        answer: 'Bring strong basic attack physical damage dealers.',
        tags: ['Shield', 'Skill Reduction'],
      },
    ],
  },
  {
    id: 'gambosate',
    name: 'Gambosate',
    accent: '#fb7185',
    imageUrl: 'images/strife/monsters/gambosate.jpg',
    skills: [
      {
        name: 'Outrage',
        timing: 'Round 4 onward',
        target: '2 random squads',
        effect: 'Repeated random hits create the main late-fight wipe risk and ignore Resistance.',
        answer:
          'Front-load damage before round 4 or use tanky supports that keep squads alive through repeated hits.',
        tags: ['Late Spike', 'Random Hits'],
      },
      {
        name: "Legion's Will",
        timing: 'All 8 rounds',
        target: 'Gambosate',
        effect: 'Immune to silence, disarm, suppression, and confusion.',
        answer:
          'Do not spend hero slots on crowd-control plans. Build for raw damage, mitigation, and uptime.',
        tags: ['Control Immune'],
      },
      {
        name: 'Ferocious Roar',
        timing: 'During battle',
        target: 'All player squads',
        effect: 'Can silence all squads and block healing for several rounds.',
        answer:
          'Use damage reduction and prevention, not heal-only recovery, as the main survival layer.',
        tags: ['Silence', 'Anti-Heal'],
      },
      {
        name: 'Power of the Legion',
        timing: 'Passive',
        target: 'Gambosate army',
        effect: 'Large Might, damage, and troop-cap bonuses make the boss stat-heavy.',
        answer: 'Expect a long stat check if you miss the early burst window.',
        tags: ['Stat Boss'],
      },
    ],
    guideNotes: [
      'The guide frames Gambosate as a high-difficulty boss because it is control-immune and becomes much more dangerous from round 4 onward.',
      'Best plans either burst hard before round 4 or bring enough HP, defense, and damage reduction to survive Outrage.',
      'Control picks lose value here. Favor direct damage, defensive supports, and damage prevention over silence/disarm plans.',
    ],
  },
  {
    id: 'pivana',
    name: 'Pilvana',
    accent: '#f97316',
    imageUrl: 'images/strife/monsters/pivana.jpg',
    skills: [
      {
        name: 'Furious Strike',
        timing: 'Rounds 1-3',
        target: 'All Pilvana squads',
        effect:
          'Pilvana doubles normal attacks early, which makes rounds 1-3 the most dangerous burst window.',
        answer:
          'Use sturdy front rows and teams that keep outputting damage while they absorb the opening hits.',
        tags: ['Early Burst', 'Survival'],
      },
      {
        name: 'Dirty Tricks',
        timing: 'After normal attacks',
        target: 'Random squads',
        effect: 'Adds bonus damage after normal attacks and can disarm multiple squads at once.',
        answer:
          'Favor skill damage, cleanse or resistance value, and reliable sustain instead of normal-attack-only teams.',
        tags: ['Disarm', 'Skill Damage'],
      },
      {
        name: 'Uncontrolled Rage',
        timing: 'Rounds 1-3',
        target: 'Pilvana squad',
        effect:
          'Pilvana starts with control immunity, so silence, disarm, suppression, and confusion are unreliable early.',
        answer:
          'Do not spend the opening plan on control. Push damage, buffs, and survival until the immunity window ends.',
        tags: ['Control Immune', 'DPS Race'],
      },
    ],
    guideNotes: [
      'Pilvana opens with heavy normal-attack pressure, so the first three rounds are mostly a survival and damage-race check.',
      'Because Pilvana can disarm several squads, counters should not rely only on normal attacks. Skill damage, cleanse/resistance, sustain, and steady buffs are safer.',
    ],
  },
  {
    id: 'titanus',
    name: 'Titanus',
    accent: '#f59e0b',
    imageUrl: 'images/strife/monsters/titanus.jpg',
    skills: [
      {
        name: 'Deadly Blade',
        timing: 'Rounds 1 and 4',
        target: 'All player squads',
        effect: 'After preparation, Titanus launches multiple heavy attacks into every squad.',
        answer: 'Bring shields, damage reduction, or prevention for the scripted burst rounds.',
        tags: ['Timed Burst', 'All Squads'],
      },
      {
        name: 'Colossal Figure',
        timing: 'Rounds 1-2',
        target: 'Titanus',
        effect: 'Titanus takes sharply reduced damage in the opening rounds.',
        answer: 'Survive early, then push the main damage window after the reduction expires.',
        tags: ['Damage Reduction'],
      },
      {
        name: 'Butcher in the Wild',
        timing: 'Ongoing',
        target: 'All player squads',
        effect: 'Bleed and disarm pressure drains squads while limiting normal-attack plans.',
        answer: 'Favor skill damage, sustain, and defensive utility over basic-attack-only output.',
        tags: ['Bleed', 'Disarm'],
      },
      {
        name: 'Power of the Legion',
        timing: 'Passive',
        target: 'Titanus army',
        effect:
          'Large Legion Power, damage, and troop-cap bonuses make the fight a durability check.',
        answer: 'Use sturdy front rows and avoid fragile glass-cannon setups.',
        tags: ['Stat Boss'],
      },
    ],
    guideNotes: [
      'Titanus pressure comes from timed all-squad attacks, early damage reduction, and a long bleed/disarm package.',
      'Do not unload all damage into the early 80% reduction window. Keep enough damage for the rounds after Colossal Figure falls off.',
    ],
  },
  {
    id: 'fordogreen',
    name: 'Fordogreen',
    accent: '#60a5fa',
    imageUrl: 'images/strife/monsters/fordogreen.jpg',
    skills: [
      {
        name: 'Forest Call',
        timing: 'Rounds 1-3',
        target: 'Fordogreen',
        effect: 'Immune to normal attacks during the first three rounds.',
        answer: 'Focus on skill damage or deploy cleansing supports.',
        tags: ['Early Shield', 'Normal Immune'],
      },
      {
        name: 'Thorn Backlash',
        timing: 'Ongoing',
        target: 'Attacking squad',
        effect: 'Reflects a percentage of incoming physical damage back to the attacker.',
        answer: 'Use healing sustain and skill damage over physical attacks.',
        tags: ['Reflect', 'Anti-Physical'],
      },
    ],
  },
  {
    id: 'savage-swordsman',
    name: 'Savage Swordsman',
    accent: '#a78bfa',
    imageUrl: 'images/strife/monsters/savage-swordsman.jpg',
    skills: [
      {
        name: 'Ferocious Roar',
        timing: 'Ongoing',
        target: '1 random squad',
        effect: 'Reduces damage from the squad by 50% for 8 rounds and deals heavy damage.',
        answer: 'Bring clean/cure status effects or high baseline damage.',
        tags: ['Damage Reduction', 'De-buff'],
      },
      {
        name: 'Top Swordsman',
        timing: 'Rounds 1-4',
        target: 'All squads',
        effect: 'Disarms all enemy squads for the first 4 rounds.',
        answer: 'Favor skill damage or crowd control protection.',
        tags: ['Disarm', 'Control'],
      },
      {
        name: 'Savage in Nature',
        timing: 'Passive',
        target: 'Savage Swordsman',
        effect: 'Takes 80% less Skill Damage but 50% more Physical Damage.',
        answer: 'Build setups focused entirely on physical basic attacks.',
        tags: ['Physical Weakness', 'Skill Reduction'],
      },
    ],
  },
  {
    id: 'sasha',
    name: 'Sasha',
    accent: '#38bdf8',
    imageUrl: 'images/strife/monsters/sasha.jpg',
    skills: [
      {
        name: 'Storm Shield',
        timing: 'Rounds 1, 3, 5, 7',
        target: 'All squads',
        effect: 'Disarms squads in odd-numbered rounds, preventing normal attacks.',
        answer: 'Rely on skill damage output and control immunity.',
        tags: ['Disarm', 'Silence'],
      },
      {
        name: "Sasha's Curse",
        timing: 'Preparation',
        target: '2 random squads',
        effect: 'Suppresses 2 squads for 1 round, blocking actions.',
        answer: 'Deploy heroes with cleanse or control resistance.',
        tags: ['Suppression', 'Control'],
      },
      {
        name: "Legion's Strength",
        timing: 'Passive',
        target: 'Sasha army',
        effect: 'Gains massive buffs, including +500% attack and +70% damage.',
        answer: 'Coordinate high damage quickly before buffs scale too high.',
        tags: ['Stat Boss', 'Late Spike'],
      },
    ],
  },
  {
    id: 'noisy-noel',
    name: 'Noisy Noel',
    accent: '#ef4444',
    imageUrl: 'images/strife/monsters/noisy-noel.jpg',
    skills: [
      {
        name: 'Invisible',
        timing: 'All 8 rounds',
        target: 'Noisy Noel',
        effect: 'Immune to silence, disarm, suppression, and confusion.',
        answer: 'Skip control comps and use direct damage, burn pressure, and defensive uptime.',
        tags: ['Control Immune'],
      },
      {
        name: 'Clown Makeup',
        timing: 'Passive',
        target: 'Noisy Noel',
        effect: 'Normal damage is heavily reduced while burn damage is greatly amplified.',
        answer: 'Prefer burn and skill-damage routes over normal-attack damage checks.',
        tags: ['Burn Weakness', 'Normal Reduction'],
      },
      {
        name: 'Pickpocket',
        timing: 'After 2-round prep',
        target: '1 random squad',
        effect: 'A high-scaling random hit can delete a weak squad.',
        answer:
          'Bring damage prevention, durable backlines, or enough sustain to absorb random targeting.',
        tags: ['Random Burst'],
      },
      {
        name: 'Power of the Legion',
        timing: 'Passive',
        target: 'Noisy Noel army',
        effect: 'Large Might, damage, and troop-cap bonuses raise the baseline damage check.',
        answer: 'Treat the fight as a full eight-round DPS race unless your team can exploit burn.',
        tags: ['Stat Boss'],
      },
    ],
    guideNotes: [
      'Noisy Noel is control-immune for the full fight, so silence, disarm, suppression, and confusion should not be the plan.',
      'The guide calls out burn vulnerability and pure damage as the cleanest answers, with Warden-style survival helping against random burst.',
    ],
  },
  {
    id: 'trident-north-sea',
    name: 'Trident of the North Sea',
    accent: '#c4b5fd',
    imageUrl: 'images/strife/monsters/trident-north-sea.jpg',
    skills: [
      {
        name: 'Trident Swing',
        timing: 'During battle',
        target: 'All squads in range',
        effect:
          '100% chance to launch 10 attacks against all squads, including friendly squads, dealing 30% Damage each attack.',
        answer:
          'Use a durable lineup that can absorb repeated multi-target hits without relying on fragile burst only.',
        tags: ['All Squads', 'Repeated Hits'],
      },
      {
        name: 'Lasting Stamina',
        timing: 'Rounds 1-3',
        target: 'Trident',
        effect: 'The boss takes 80% less Damage during the first three rounds.',
        answer:
          'Do not judge the lineup only by early damage. Survive the opener and keep damage ready after round 3.',
        tags: ['Damage Reduction', 'Early Survival'],
      },
      {
        name: 'Backlash',
        timing: 'When damaged',
        target: '3 random enemy squads',
        effect:
          'When the hero squad takes damage, 100% chance to deal 100% Skill Damage to 3 random enemy squads.',
        answer:
          'Expect retaliation whenever you pressure the boss. Sustain and archer durability help stabilize the fight.',
        tags: ['Counter Damage', 'Skill Damage'],
      },
      {
        name: 'Power of the Legion',
        timing: 'Passive',
        target: 'Trident army',
        effect:
          'The hero legion gains 500% more Might and 70% more Damage, with marching soldier cap increased by 487,570.',
        answer:
          'Treat this as a high-stat endurance fight. Favor strong cores over gimmick control plans.',
        tags: ['Stat Boss', 'Endurance'],
      },
    ],
    guideNotes: [
      'Trident hits every squad, including friendly squads, so durable archer cores and strong round-to-round sustain matter more than fragile burst.',
      'The opening damage-reduction window means the team must survive first, then keep enough damage online after the first three rounds.',
    ],
  },
  {
    id: 'black-annis',
    name: 'Black Annis',
    accent: '#f472b6',
    imageUrl: 'images/strife/monsters/black-annis.jpg',
    skills: [
      {
        name: "Hag's Claw",
        timing: 'Preparation',
        target: '1 random squad',
        effect: 'Suppresses the target squad and drains their Might for 2 rounds.',
        answer: 'Use control immune heroes or clean mechanics.',
        tags: ['Suppression', 'Might Drain'],
      },
      {
        name: "Devourer's Feast",
        timing: 'Round 4 onward',
        target: 'Drained squad',
        effect: 'Deals massive damage to squads with reduced stats.',
        answer: 'Stabilize stats with active buffs and defensive healing.',
        tags: ['Stat Check', 'Late Burst'],
      },
    ],
  },
  {
    id: 'frost-queen',
    name: 'Frost Queen',
    accent: '#38bdf8',
    imageUrl: 'https://static.wixstatic.com/media/43ee96_3a567a080584448bad35a78883cc3e7f~mv2.png',
    skills: [
      {
        name: 'Frozen Tomb',
        timing: 'Rounds 1, 4',
        target: '1 random squad',
        effect: 'Freezes one squad, preventing action and healing for 1 round.',
        answer: 'Use support heroes that offer block or cleanse.',
        tags: ['Anti-Heal'],
      },
      {
        name: 'Glacial Armor',
        timing: 'Passive',
        target: 'Frost Queen',
        effect: 'Takes 60% reduced physical normal attack damage.',
        answer: 'Favor heavy skill damage and burns.',
        tags: ['Physical Reduction', 'Skill Weakness'],
      },
    ],
  },
];

export const STRIFE_TIERS = {
  F2P: 'f2p',
  P2W: 'p2w',
};

export const STRIFE_MONSTER_COMBOS = {
  rabbit: [
    {
      stage: 'X1',
      tier: 'p2w',
      heroes: ['Boudica', 'Ramses II', 'Sakura'],
      note: 'Recommended P2W formation: Boudica / Ramses II / Sakura.',
    },
    {
      stage: 'S3',
      tier: 'f2p',
      heroes: ['Sky Breaker', 'Edward the Confessor', 'Cao Cao'],
      note: 'Recommended F2P formation: Sky Breaker / Edward the Confessor / Cao Cao.',
    },
    {
      stage: 'S3',
      tier: 'p2w',
      heroes: ['Octavius', 'Edward the Confessor', 'Caesar'],
      note: 'Recommended P2W formation: Octavius / Edward the Confessor / Caesar.',
    },
  ],
  fordogreen: [
    {
      stage: 'X1',
      tier: 'p2w',
      heroes: ['Boudica', 'Ramses II', 'Edward the Confessor'],
      note: 'Recommended P2W formation: Boudica / Ramses II / Edward the Confessor.',
    },
    {
      stage: 'X1',
      tier: 'p2w',
      heroes: ['Immortal Guardian', 'Charles the Great', 'Boudica'],
      note: 'Recommended P2W formation: Immortal Guardian / Charles the Great / Boudica.',
    },
    {
      stage: 'S4',
      tier: 'p2w',
      heroes: ['Immortal Guardian', 'Ramses II', 'Al Fatih'],
      note: 'Recommended P2W formation: Immortal Guardian / Ramses II / Al Fatih.',
    },
  ],
  'savage-swordsman': [
    {
      stage: 'X2',
      tier: 'p2w',
      heroes: ['Lawman', 'Charles the Great', 'Caesar'],
      note: 'Recommended P2W formation: Lawman / Charles the Great / Caesar.',
    },
    {
      stage: 'X2',
      tier: 'p2w',
      heroes: ['Alexander', 'Charles the Great', 'Caesar'],
      note: 'Recommended P2W formation: Alexander / Charles the Great / Caesar.',
    },
  ],
  'noisy-noel': [
    {
      stage: 'S1',
      tier: 'f2p',
      heroes: ['Edward the Confessor', 'Cao Cao', 'Isabella I'],
      note: 'Recommended F2P formation: Edward the Confessor / Cao Cao / Isabella I.',
    },
    {
      stage: 'S3',
      tier: 'p2w',
      heroes: ['Charles the Great', 'Ramses II', 'Caesar'],
      note: 'Recommended P2W formation: Charles the Great / Ramses II / Caesar.',
    },
    {
      stage: 'S3',
      tier: 'f2p',
      heroes: ['Sky Breaker', 'Edward the Confessor', 'Isabella I'],
      note: 'Recommended F2P formation: Sky Breaker / Edward the Confessor / Isabella I.',
    },
    {
      stage: 'X1',
      tier: 'f2p',
      heroes: ['Witch Hunter', 'Isabella I', 'ELK'],
      note: 'Recommended F2P formation: Witch Hunter / Isabella I / ELK.',
    },
    {
      stage: 'S2',
      tier: 'f2p',
      heroes: ['Witch Hunter', 'Isabella I', 'Cao Cao'],
      note: 'Recommended F2P formation: Witch Hunter / Isabella I / Cao Cao.',
    },
    {
      stage: 'X1',
      tier: 'f2p',
      heroes: ['Sky Breaker', 'Sakura', 'Isabella I'],
      note: 'Recommended F2P formation: Sky Breaker / Sakura / Isabella I.',
    },
    {
      stage: 'S2',
      tier: 'f2p',
      heroes: ['Witch Hunter', 'Edward the Confessor', 'Isabella I'],
      note: 'Recommended F2P formation: Witch Hunter / Edward the Confessor / Isabella I.',
    },
    {
      stage: 'S2',
      tier: 'f2p',
      heroes: ['Witch Hunter', 'Isabella I', 'William the Conqueror'],
      note: 'Recommended F2P formation: Witch Hunter / Isabella I / William the Conqueror.',
    },
    {
      stage: 'S3',
      tier: 'p2w',
      heroes: ['Charles the Great', 'Edward the Confessor', 'Caesar'],
      note: 'Recommended P2W formation: Charles the Great / Edward the Confessor / Caesar.',
    },
  ],
  sasha: [
    {
      stage: 'X1',
      tier: 'f2p',
      heroes: ['Sakura', 'Inquisitor', 'Witch Hunter'],
      note: 'Recommended F2P formation: Sakura / Inquisitor / Witch Hunter.',
    },
    {
      stage: 'X1',
      tier: 'p2w',
      heroes: ['Witch Hunter', 'Boudica', 'Sakura'],
      note: 'Recommended P2W formation: Witch Hunter / Boudica / Sakura.',
    },
    {
      stage: 'S3',
      tier: 'f2p',
      heroes: ['Sky Breaker', 'Witch Hunter', 'Cao Cao'],
      note: 'Recommended F2P formation: Sky Breaker / Witch Hunter / Cao Cao.',
    },
  ],
  gambosate: [],
  pivana: [],
  titanus: [],
  'frost-queen': [
    {
      stage: 'S4',
      tier: 'p2w',
      heroes: ['Ramses II', 'Edward the Confessor', 'Jade Eagle'],
      note: 'Recommended P2W formation: Ramses II / Edward the Confessor / Jade Eagle.',
    },
    {
      stage: 'S1',
      tier: 'f2p',
      heroes: ['Edward the Confessor', 'Charles the Great', 'Cao Cao'],
      note: 'Recommended F2P formation: Edward the Confessor / Charles the Great / Cao Cao.',
    },
    {
      stage: 'S3',
      tier: 'p2w',
      heroes: ['Octavius', 'Cleopatra VII', 'Caesar'],
      note: 'Recommended P2W formation: Octavius / Cleopatra VII / Caesar.',
    },
    {
      stage: 'X1',
      tier: 'p2w',
      heroes: ['Sky Breaker', 'Boudica', 'Sakura'],
      note: 'Recommended P2W formation: Sky Breaker / Boudica / Sakura.',
    },
    {
      stage: 'X1',
      tier: 'f2p',
      heroes: ['Sakura', 'Edward the Confessor', 'William the Conqueror'],
      note: 'Recommended F2P formation: Sakura / Edward the Confessor / William the Conqueror.',
    },
    {
      stage: 'X1',
      tier: 'f2p',
      heroes: ['Sakura', 'Edward the Confessor', 'Jade Eagle'],
      note: 'Recommended F2P formation: Sakura / Edward the Confessor / Jade Eagle.',
    },
    {
      stage: 'S1',
      tier: 'f2p',
      heroes: ['Edward the Confessor', 'Cao Cao', 'William the Conqueror'],
      note: 'Recommended F2P formation: Edward the Confessor / Cao Cao / William the Conqueror.',
    },
    {
      stage: 'X1',
      tier: 'p2w',
      heroes: ['Boudica', 'Ramses II', 'Sakura'],
      note: 'Recommended P2W formation: Boudica / Ramses II / Sakura.',
    },
    {
      stage: 'S4',
      tier: 'p2w',
      heroes: ['King Arthur', 'Edward the Confessor', 'Cao Cao'],
      note: 'Recommended P2W formation: King Arthur / Edward the Confessor / Cao Cao.',
    },
    {
      stage: 'S4',
      tier: 'p2w',
      heroes: ['King Arthur', 'Edward the Confessor', 'Jade Eagle'],
      note: 'Recommended P2W formation: King Arthur / Edward the Confessor / Jade Eagle.',
    },
  ],
  'black-annis': [
    {
      stage: 'X1',
      tier: 'p2w',
      heroes: ['Boudica', 'Sakura', 'Jade Eagle'],
      note: 'Recommended P2W formation: Boudica / Sakura / Jade Eagle.',
    },
  ],
  'trident-north-sea': [
    {
      stage: 'X2',
      tier: 'p2w',
      heroes: ['Alexander', 'Bleeding Steed', 'Immortal Guardian'],
      note: 'Recommended P2W formation: Alexander / Bleeding Steed / Immortal Guardian.',
    },
  ],
};
