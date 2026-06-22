// js/strife-db.js
// Strife over Dragon manual recommendation data.
// Hero order is always [Front, Middle, Back].

export const STRIFE_SEASONS = ['S0', 'S1', 'S2', 'S3', 'S4', 'X1', 'X2', 'X8'];

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
    skills: [],
  },
  {
    id: 'pivana',
    name: 'Pilvana',
    accent: '#f97316',
    imageUrl: 'images/strife/monsters/pivana.jpg',
    sourceLabel: 'Rise of Castles Pilvana guide',
    sourceUrl: 'https://www.riseofcastles.net/en/feedrocbook/strife-over-dragon/discussion/6818031b-e3bb-4b98-9163-9a8cecb19e51',
    guideNotes: [
      'High early basic-attack pressure; plan around survival in rounds 1-3.',
      'Disarm pressure makes skill damage, cleanses, and non-normal-attack value more reliable.',
      'Forum testing highlights Sakura, Warden, Inquisitor, Witch Hunter, and high-damage paid supports as useful pieces, but several named legacy heroes are not in our S0-X8 roster.',
    ],
    skills: [
      {
        name: 'Furious Strike',
        timing: 'Rounds 1-3',
        target: 'All Pilvana squads',
        effect: 'Pilvana doubles normal attacks early, creating a front-loaded damage race.',
        answer: 'Use durable front rows and teams that keep dealing damage even while absorbing early hits.',
        tags: ['Early Burst', 'Survival'],
      },
      {
        name: 'Dirty Tricks',
        timing: 'After normal attacks',
        target: 'Random squads',
        effect: 'Adds heavy bonus damage and can disarm multiple squads.',
        answer: 'Favor skill-based damage, cleanse/resistance value, and stable sustain over normal-attack-only plans.',
        tags: ['Disarm', 'Skill Damage'],
      },
      {
        name: 'Uncontrolled Rage',
        timing: 'Rounds 1-3',
        target: 'Pilvana squad',
        effect: 'Early control immunity makes silence, disarm, suppression, and confusion unreliable.',
        answer: 'Do not build the plan around early control. Push raw damage and buffs until immunity drops.',
        tags: ['Control Immune', 'DPS Race'],
      },
    ],
  },
  {
    id: 'titanus',
    name: 'Titanus',
    accent: '#f59e0b',
    imageUrl: 'images/strife/monsters/titanus.jpg',
    skills: [],
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
    skills: [],
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
  rabbit: [],
  gambosate: [],
  pivana: [],
  titanus: [],
  fordogreen: [],
  'savage-swordsman': [],
  sasha: [],
  'noisy-noel': [],
  'trident-north-sea': [],
  'black-annis': [],
};
