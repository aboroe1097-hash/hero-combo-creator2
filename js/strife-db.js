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
