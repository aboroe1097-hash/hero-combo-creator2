// js/combos-db.js
// Simple ranked combos DB: each entry = 3 heroes + score.
// Mapping order: [Front, Middle, Back]
// Higher Score = Better

export const rankedCombos = [
  // --- TOP META / GARRISON TIER 1 (Scores 95-100) ---
  {
    heroes: ["Octavius", "The Brave", "Ceasar"],
    score: 100
  },
  {
    heroes: ["BeastQueen", "Rozen Blade", "Immortal"],
    score: 99
  },
  {
    heroes: ["Octavius", "Celopatrra VII", "Ceasar"],
    score: 98
  },
  {
    heroes: ["King Arthur", "Bleeding Steed", "Cao Cao"],
    score: 97
  },
  {
    heroes: ["Theodora", "Ramses II", "Jade Eagle"],
    score: 96
  },
  {
    heroes: ["Sky Breaker", "Ramses II", "Al Fatih"],
    score: 95
  },

  // --- STRONG META / GARRISON TIER 2 (Scores 90-94) ---
  {
    heroes: ["Sky Breaker", "Inquisitor", "Charles the Great"],
    score: 94
  },
  {
    heroes: ["War Lord", "Black Prince", "Jane"],
    score: 93
  },
  {
    heroes: ["Charles the Great", "Inquisitor", "Witch Hunter"],
    score: 92
  },
  {
    heroes: ["War Lord", "Constantine the Great", "Jane"],
    score: 91
  },
  {
    heroes: ["Black Prince", "Jeanne d'Arc", "Lionheart"],
    score: 90
  },

  // --- CLASSIC / SEASONAL SYNERGIES (Scores 80-89) ---
  {
    heroes: ["Edward the Confessor", "Charles the Great", "Al Fatih"],
    score: 89
  },
  {
    heroes: ["War Lord", "Isabella I", "Mary Tudor"],
    score: 88
  },
  {
    heroes: ["Edward the Confessor", "Leonidas", "Al Fatih"],
    score: 87
  },
  {
    heroes: ["Edward the Confessor", "Isabella I", "Al Fatih"],
    score: 86
  },
  {
    heroes: ["Peace Bringer", "Genghis Khan", "The Heroine"],
    score: 85
  },
  {
    heroes: ["Demon Spear", "Jiguang Qi", "Genghis Khan"],
    score: 84
  },
  {
    heroes: ["Demon Spear", "Jiguang Qi", "North's Rage"],
    score: 83
  },
  {
    heroes: ["Demon Spear", "Queen Anne", "William Wallace"],
    score: 82
  }
];
