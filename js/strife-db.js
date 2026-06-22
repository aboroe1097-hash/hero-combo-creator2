// js/strife-db.js
// Strife over Dragon manual recommendation data.
// Hero order is always [Front, Middle, Back].

export const STRIFE_SEASONS = ['S0', 'S1', 'S2', 'S3', 'S4', 'X1', 'X2', 'X8'];

const STRIFE_DISCUSSION_URL = 'https://www.riseofcastles.net/en/feedrocbook/strife-over-dragon/discussion';

export const STRIFE_MONSTERS = [
  {
    id: 'rabbit',
    name: 'Rabbit',
    accent: '#f87171',
    imageUrl: 'images/strife/monsters/rabbit.jpg',
    skills: [],
  },
  {
    id: 'gambosate',
    name: 'Gambosate',
    accent: '#fb7185',
    imageUrl: 'images/strife/monsters/gambosate.jpg',
    sourceLabel: 'Rise of Castles Gambosatte guide',
    sourceUrl: STRIFE_DISCUSSION_URL,
    guideNotes: [
      'The guide frames Gambosate as a high-difficulty boss because it is control-immune and becomes much more dangerous from round 4 onward.',
      'Best plans either burst hard before round 4 or bring enough HP, defense, and damage reduction to survive Outrage.',
      'Control picks lose value here. Favor direct damage, defensive supports, and damage prevention over silence/disarm plans.',
    ],
    skills: [
      {
        name: 'Outrage',
        timing: 'Round 4 onward',
        target: '2 random squads',
        effect: 'Repeated random hits create the main late-fight wipe risk and ignore Resistance.',
        answer: 'Front-load damage before round 4 or use tanky supports that keep squads alive through repeated hits.',
        tags: ['Late Spike', 'Random Hits'],
      },
      {
        name: "Legion's Will",
        timing: 'All 8 rounds',
        target: 'Gambosate',
        effect: 'Immune to silence, disarm, suppression, and confusion.',
        answer: 'Do not spend hero slots on crowd-control plans. Build for raw damage, mitigation, and uptime.',
        tags: ['Control Immune'],
      },
      {
        name: 'Ferocious Roar',
        timing: 'During battle',
        target: 'All player squads',
        effect: 'Can silence all squads and block healing for several rounds.',
        answer: 'Use damage reduction and prevention, not heal-only recovery, as the main survival layer.',
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
  },
  {
    id: 'pivana',
    name: 'Pilvana',
    accent: '#f97316',
    imageUrl: 'images/strife/monsters/pivana.jpg',
    sourceLabel: 'Sourced from Celso Kayran',
    sourceUrl: 'https://www.riseofcastles.net/en/feedrocbook/strife-over-dragon/discussion/6818031b-e3bb-4b98-9163-9a8cecb19e51',
    guideNotes: [
      'Pilvana opens with heavy normal-attack pressure, so the first three rounds are mostly a survival and damage-race check.',
      'Because Pilvana can disarm several squads, counters should not rely only on normal attacks. Skill damage, cleanse/resistance, sustain, and steady buffs are safer.',
      'Celso Kayran testing points toward Sakura with Henry II or Al-Hawra style cores. Those heroes are not in this local S0-X8 roster yet, so the rows below keep the same counter idea using heroes the app can render.',
    ],
    skills: [
      {
        name: 'Furious Strike',
        timing: 'Rounds 1-3',
        target: 'All Pilvana squads',
        effect: 'Pilvana doubles normal attacks early, which makes rounds 1-3 the most dangerous burst window.',
        answer: 'Use sturdy front rows and teams that keep outputting damage while they absorb the opening hits.',
        tags: ['Early Burst', 'Survival'],
      },
      {
        name: 'Dirty Tricks',
        timing: 'After normal attacks',
        target: 'Random squads',
        effect: 'Adds bonus damage after normal attacks and can disarm multiple squads at once.',
        answer: 'Favor skill damage, cleanse or resistance value, and reliable sustain instead of normal-attack-only teams.',
        tags: ['Disarm', 'Skill Damage'],
      },
      {
        name: 'Uncontrolled Rage',
        timing: 'Rounds 1-3',
        target: 'Pilvana squad',
        effect: 'Pilvana starts with control immunity, so silence, disarm, suppression, and confusion are unreliable early.',
        answer: 'Do not spend the opening plan on control. Push damage, buffs, and survival until the immunity window ends.',
        tags: ['Control Immune', 'DPS Race'],
      },
    ],
  },
  {
    id: 'titanus',
    name: 'Titanus',
    accent: '#f59e0b',
    imageUrl: 'images/strife/monsters/titanus.jpg',
    sourceLabel: 'Rise of Castles Titanus discussion notes',
    sourceUrl: STRIFE_DISCUSSION_URL,
    guideNotes: [
      'Titanus pressure comes from timed all-squad attacks, early damage reduction, and a long bleed/disarm package.',
      'The guide examples lean heavily on Hunk plus Sakura or Bjorn, usually paired with Henry II. Henry II is not in the local roster, so the manual rows use the renderable Hunk/Sakura/Bjorn core.',
      'Do not unload all damage into the early 80% reduction window. Keep enough damage for the rounds after Colossal Figure falls off.',
    ],
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
        effect: 'Large Legion Power, damage, and troop-cap bonuses make the fight a durability check.',
        answer: 'Use sturdy front rows and avoid fragile glass-cannon setups.',
        tags: ['Stat Boss'],
      },
    ],
  },
  {
    id: 'fordogreen',
    name: 'Fordogreen',
    accent: '#60a5fa',
    imageUrl: 'images/strife/monsters/fordogreen.jpg',
    skills: [],
  },
  {
    id: 'savage-swordsman',
    name: 'Savage Swordsman',
    accent: '#a78bfa',
    imageUrl: 'images/strife/monsters/savage-swordsman.jpg',
    skills: [],
  },
  {
    id: 'sasha',
    name: 'Sasha',
    accent: '#38bdf8',
    imageUrl: 'images/strife/monsters/sasha.jpg',
    skills: [],
  },
  {
    id: 'noisy-noel',
    name: 'Noisy Noel',
    accent: '#ef4444',
    imageUrl: 'images/strife/monsters/noisy-noel.jpg',
    sourceLabel: 'Rise of Castles Noisy Noel guide',
    sourceUrl: STRIFE_DISCUSSION_URL,
    guideNotes: [
      'Noisy Noel is control-immune for the full fight, so silence, disarm, suppression, and confusion should not be the plan.',
      'The guide calls out burn vulnerability and pure damage as the cleanest answers, with Warden-style survival helping against random burst.',
      'Several listed top teams rely on heroes outside this local roster. The manual rows below keep the source idea but use renderable local hero names.',
    ],
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
        answer: 'Bring damage prevention, durable backlines, or enough sustain to absorb random targeting.',
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
  },
  {
    id: 'trident-north-sea',
    name: 'Trident of the North Sea',
    accent: '#c4b5fd',
    imageUrl: 'images/strife/monsters/trident-north-sea.jpg',
    skills: [],
  },
  {
    id: 'black-annis',
    name: 'Black Annis',
    accent: '#f472b6',
    imageUrl: 'images/strife/monsters/black-annis.jpg',
    skills: [],
  },
];

export const STRIFE_TIERS = {
  F2P: 'f2p',
  P2W: 'p2w',
};

export const STRIFE_REFERENCE = {
  label: 'Rise of Castles Strife reference table',
  url: 'https://www.riseofcastles.net/en/origemdosdrag%C3%B5es',
  imageUrl: 'images/strife/roc-strife-reference.png',
};

/*
 * Add monster-specific rows here.
 *
 * Format:
 * {
 *   stage: 'S3',              // first season/stage where this row is valid
 *   maxStage: 'X1',           // optional last stage where it remains valid
 *   tier: STRIFE_TIERS.F2P,    // F2P or P2W lane
 *   heroes: ['Front hero', 'Middle hero', 'Back hero'],
 *   note: 'Optional short matchup note',
 * }
 *
 * Monster skill format:
 * {
 *   name: 'Skill name',
 *   timing: 'Pre-battle',
 *   target: 'Front row',
 *   effect: 'What the monster skill does',
 *   answer: 'What kind of combo answers it',
 *   tags: ['Healing', 'Control'],
 * }
 */
export const STRIFE_MONSTER_COMBOS = {
  rabbit: [
    {
      stage: 'S3',
      tier: STRIFE_TIERS.F2P,
      heroes: ['Rozen Blade', 'Immortal', 'BeastQueen'],
      note: 'Early manual Rabbit lane: Rozen brings pressure, Immortal stabilizes the middle, and BeastQueen keeps cavalry damage online.',
    },
    {
      stage: 'X1',
      tier: STRIFE_TIERS.P2W,
      heroes: ['Boudica', 'Al Fatih', 'Sakura'],
      note: 'First high-ceiling Rabbit test row. Boudica anchors the paid burst slot while Al Fatih and Sakura keep archer damage and skill uptime moving.',
    },
    {
      stage: 'X1',
      tier: STRIFE_TIERS.P2W,
      heroes: ['Boudica', 'Al Fatih', 'Jade'],
      note: 'Alternate Rabbit test row if Jade outperforms Sakura in the back slot. Keep this beside the Sakura lane until damage logs decide it.',
    },
  ],
  gambosate: [
    {
      stage: 'X8',
      tier: STRIFE_TIERS.P2W,
      heroes: ['Warden', 'Defender', 'Rainforest Ranger'],
      note: 'Renderable version of the guide\'s Warden + Defender + Rainforest sustain lane. Rainforest Ranger is marked paid in this roster, so it lives in P2W here.',
    },
    {
      stage: 'X8',
      tier: STRIFE_TIERS.P2W,
      heroes: ['Alexander', 'Sakura', 'Jade Eagle'],
      note: 'Local test lane for the guide\'s Alexander/Sakura durability idea when Henry II or Al-Hawra are unavailable in this app.',
    },
  ],
  pivana: [
    {
      stage: 'X1',
      tier: STRIFE_TIERS.F2P,
      heroes: ['Sky Breaker', 'Inquisitor', 'Sakura'],
      note: 'Local F2P test lane inspired by the guide\'s Skybreaker/Inquisitor/Sakura mentions. Henry II is not in this roster yet.',
    },
    {
      stage: 'X1',
      tier: STRIFE_TIERS.F2P,
      heroes: ['Inquisitor', 'Witch Hunter', 'Sakura'],
      note: 'Skill-damage-heavy local lane for Pilvana disarm pressure; use as a practical substitute until Henry II rows exist.',
    },
    {
      stage: 'X2',
      tier: STRIFE_TIERS.P2W,
      heroes: ['Boudica', 'Alexander', 'Sakura'],
      note: 'Paid-heavy local test lane based on the guide\'s Boudica/Alexander and Sakura damage concepts when Al-Hawra is unavailable.',
    },
  ],
  titanus: [
    {
      stage: 'X8',
      tier: STRIFE_TIERS.F2P,
      heroes: ['Hunk', 'Sakura', 'Bjorn'],
      note: 'Renderable version of the guide\'s Hunk + Sakura/Bjorn core. Henry II is not in this roster, so Bjorn fills the third slot.',
    },
    {
      stage: 'X8',
      tier: STRIFE_TIERS.F2P,
      heroes: ['Hunk', 'Bjorn', 'Warden'],
      note: 'Durability-first local Titanus test lane for Deadly Blade and bleed/disarm pressure.',
    },
  ],
  fordogreen: [],
  'savage-swordsman': [],
  sasha: [],
  'noisy-noel': [
    {
      stage: 'X1',
      tier: STRIFE_TIERS.F2P,
      heroes: ['Sky Breaker', 'Sakura', 'Isabella I'],
      note: 'Source-listed X1 custom row mapped to the local hero spelling: Sky Breaker + Sakura + Isabella I.',
    },
    {
      stage: 'X1',
      tier: STRIFE_TIERS.F2P,
      heroes: ['Witch Hunter', 'Isabella I', 'ELK'],
      note: 'Source-listed X1 custom row. Use raw damage because Noisy Noel ignores crowd control.',
    },
    {
      stage: 'S2',
      maxStage: 'X2',
      tier: STRIFE_TIERS.F2P,
      heroes: ['Witch Hunter', 'Isabella I', 'Cao Cao'],
      note: 'Source-listed S2 row kept as an early-season fallback before X8 catch-up options unlock.',
    },
    {
      stage: 'S2',
      maxStage: 'X2',
      tier: STRIFE_TIERS.F2P,
      heroes: ['Witch Hunter', 'Isabella I', 'William the Conqueror'],
      note: 'Source-listed S2 row mapped to the local William the Conqueror name.',
    },
    {
      stage: 'X8',
      tier: STRIFE_TIERS.P2W,
      heroes: ['Sakura', 'Warden', 'Rainforest Ranger'],
      note: 'Source-listed X8 Sakura + Warden + Rainforest row. Rainforest Ranger is paid in this roster.',
    },
  ],
  'trident-north-sea': [],
  'black-annis': [],
};
