// js/strife-db.js
// Strife over Dragon manual recommendation data.
// Hero order is always [Front, Middle, Back].

export const STRIFE_SEASONS = ['S0', 'S1', 'S2', 'S3', 'S4', 'X1', 'X2', 'X8'];

export const STRIFE_MONSTERS = [
  { id: 'rabbit', name: 'Rabbit', accent: '#f87171', imageUrl: '', skills: [] },
  { id: 'gambosate', name: 'Gambosate', accent: '#fb7185', imageUrl: '', skills: [] },
  { id: 'pivana', name: 'Pivana', accent: '#f97316', imageUrl: '', skills: [] },
  { id: 'titanus', name: 'Titanus', accent: '#f59e0b', imageUrl: '', skills: [] },
  { id: 'fordogreen', name: 'Fordogreen', accent: '#60a5fa', imageUrl: '', skills: [] },
  { id: 'savage-swordsman', name: 'Savage Swordsman', accent: '#a78bfa', imageUrl: '', skills: [] },
  { id: 'sasha', name: 'Sasha', accent: '#38bdf8', imageUrl: '', skills: [] },
  { id: 'noisy-noel', name: 'Noisy Noel', accent: '#ef4444', imageUrl: '', skills: [] },
  {
    id: 'trident-north-sea',
    name: 'Trident of the North Sea',
    accent: '#c4b5fd',
    imageUrl: '',
    skills: [],
  },
  { id: 'black-annis', name: 'Black Annis', accent: '#f472b6', imageUrl: '', skills: [] },
];

export const STRIFE_TIERS = {
  PERFECT: 'perfect',
  GOOD: 'good',
};

/*
 * Add monster-specific rows here.
 *
 * Format:
 * {
 *   stage: 'S3',              // first season/stage where this row is valid
 *   maxStage: 'X1',           // optional last stage where it remains valid
 *   tier: STRIFE_TIERS.PERFECT,
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
