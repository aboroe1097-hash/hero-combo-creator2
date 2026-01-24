// js/combos-db.js
// This is YOUR curated / ranked list of strong combos.
// You can update it anytime without touching the main logic.

export const rankedCombos = [
  {
    id: 'c01',
    rank: 1,
    score: 99,                       // optional, but nice to keep
    heroes: ["Jeanne d'Arc", "Leonidas", "The Heroine"],
    tags: ['PVP', 'Cavalry', 'Frontline'],
    notes: 'Insane frontline sustain with strong single-target DPS.'
  },
  {
    id: 'c02',
    rank: 2,
    score: 97,
    heroes: ['Genghis Khan', 'Al Fatih', 'Lionheart'],
    tags: ['Rally', 'PVP'],
    notes: 'Great for rallies, high burst if timed correctly.'
  },
  {
    id: 'c03',
    rank: 3,
    score: 95,
    heroes: ['Yukimura Sanada', 'Jade', 'Immortal Guardian'],
    tags: ['PVE', 'Boss'],
    notes: 'Best for boss fights where sustained DPS matters.'
  },
  // ... continue with all your meta combos
];
