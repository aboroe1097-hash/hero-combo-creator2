// js/combos-db.js
// Rank is determined by position in this array. First item = Rank 1.

// --- Season 0 ---
// "Jeanne d'Arc", "Isabella I", "Jiguang Qi", "Mary Tudor", "Leonidas", 
// "The Boneless", "Demon Spear", "Kublai", "The Heroine", "Queen Anne", 
// "North's Rage", "William Wallace", "Yukimura Sanada", "Heaven's Justice"

// --- Season 1 ---
// "Alfred", "Cao Cao", "Charles the Great", "Black Prince", "Lionheart", 
// "Al Fatih", "Edward the Confessor", "Constantine the Great", 
// "Genghis Khan", "William the Conqueror"

// --- Season 2 ---
// "Inquisitor", "BeastQueen", "Jade", "Immortal", "Peace Bringer", 
// "Witch Hunter", "Ramses II", "Octavius"

// --- Season 3 ---
// "War Lord", "Jane", "Sky Breaker", "Rokuboshuten", "Bleeding Steed", 
// "Rozen Blade", "Celopatrra VII", "Ceasar"

// --- Season 4 ---
// "Desert Storm", "Soaring Hawk", "The Brave", "Jade Eagle", 
// "Immortal Guardian", "Divine Arrow", "Theodora", "King Arthur"
export const rankedCombos = [
  // --- TIER 1 (TOP META / GARRISON) ---
  { heroes: ["Theodora", "Ramses II", "Jade Eagle"] },
  { heroes: ["Bleeding Steed", "Ramses II", "Jade Eagle"] },
  { heroes: ["Charles the Great", "Ramses II", "Al Fatih"] },
  { heroes: ["Theodora", "The Brave", "Jade Eagle"] },
  { heroes: ["Octavius", "Cleopatrra VII", "Ceasar"] },
  { heroes: ["King Arthur", "Bleeding Steed", "Cleopatrra VII"] },

  // --- TIER 2 (STRONG META) ---
  { heroes: ["Octavius", "The Brave", "Ceasar"] },
  { heroes: ["King Arthur", "Bleeding Steed", "Cao Cao"] },
  { heroes: ["Sky Breaker", "Ramses II", "Al Fatih"] },
  { heroes: ["Alfred", "Bleeding Steed", "Cleopatrra VII"] },
  { heroes: ["The Brave", "Rozen Blade", "Immortal"] },
  { heroes: ["The Brave", "Bleeding Steed", "Jade Eagle"] },
  { heroes: ["BeastQueen", "Rozen Blade", "Immortal"] },
  
  { heroes: ["Peace Bringer", "Bleeding Steed", "Jade"] },
  
  { heroes: ["Immortal Guardian", "Bleeding Steed", "Jade Eagle"] },
  { heroes: ["Octavius", "BeastQueen", "Immortal"] },
  { heroes: ["Alfred", "Black Prince", "Jeanne d'Arc"] },

  // --- TIER 3 (SYNERGY) ---
  { heroes: ["Charles the Great", "Edward the Confessor", "Al Fatih"] },
  { heroes: ["Sky Breaker", "Charles the Great", "Inquisitor"] },
  { heroes: ["War Lord", "Jeanne d'Arc", "Mary Tudor"] },
  { heroes: ["Alfred", "Jeanne d'Arc", "Mary Tudor"] },
  { heroes: ["Charles the Great", "Inquisitor", "Witch Hunter"] },
  { heroes: ["Black Prince", "Jeanne d'Arc", "Lionheart"] },
  { heroes: ["War Lord", "Isabella I", "Mary Tudor"] },
  { heroes: ["Black Prince", "Isabella I", "Lionheart"] },
  { heroes: ["War Lord", "Black Prince", "Jane"] },
  { heroes: ["War Lord", "Rokuboshuten", "Jane"] },
  { heroes: ["War Lord", "Constantine the Great", "Jane"] },
  { heroes: ["Edward the Confessor", "Leonidas", "Al Fatih"] },
  { heroes: ["Edward the Confessor", "Isabella I", "Al Fatih"] },
  { heroes: ["Peace Bringer", "Genghis Khan", "The Heroine"] },
  
  { heroes: ["North's Rage", "Yukimura Sanada", "Isabella I"] },
  
  { heroes: ["Peace Bringer", "Genghis Khan", "Cao Cao"] },
  { heroes: ["Demon Spear", "Jiguang Qi", "Genghis Khan"] },
  { heroes: ["Demon Spear", "Jiguang Qi", "North's Rage"] },
  { heroes: ["Demon Spear", "Queen Anne", "William Wallace"] }
];
