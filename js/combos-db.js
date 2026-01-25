// js/combos-db.js
// Rank is determined by position in this array. First item = Rank 1.
// Mapping order: [Front, Middle, Back]

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
// "Rozen Blade", "Cleopatra VII", "Caesar", "Che Liu"

// --- Season 4 ---
// "Desert Storm", "Soaring Hawk", "The Brave", "Jade Eagle", 
// "Immortal Guardian", "Divine Arrow", "Theodora", "King Arthur"

export const rankedCombos = [
  // --- TIER 1: TOP GARRISON META (S4 Focus) ---
  { heroes: ["Theodora", "Ramses II", "Jade Eagle"] },           // Meta Peak
  { heroes: ["King Arthur", "Bleeding Steed", "Cleopatra VII"] }, // Cavalry/Garrison Mix
  { heroes: ["Bleeding Steed", "Ramses II", "Jade Eagle"] },      // High Sustainability
  { heroes: ["Charles the Great", "Ramses II", "Al Fatih"] },     // Classic Power
  { heroes: ["Theodora", "The Brave", "Jade Eagle"] },            // S4 Defense Synergies
  { heroes: ["Octavius", "Cleopatra VII", "Caesar"] },           // High Damage Output

  // --- TIER 2: STRONG COMPETITIVE META ---
  { heroes: ["Octavius", "The Brave", "Caesar"] },
  { heroes: ["King Arthur", "Bleeding Steed", "Cao Cao"] },       // Speed & Rage variation
  { heroes: ["Sky Breaker", "Ramses II", "Al Fatih"] },
  { heroes: ["Alfred", "Bleeding Steed", "Cleopatra VII"] },      // Mid-Tier Sustained
  { heroes: ["The Brave", "Bleeding Steed", "Jade Eagle"] },      // S4-S3 Transition
  { heroes: ["Rozen Blade", "Cleopatra VII", "Caesar"] },
  { heroes: ["The Brave", "Rozen Blade", "Immortal"] },
  { heroes: ["BeastQueen", "Rozen Blade", "Immortal"] },
  { heroes: ["Immortal Guardian", "Bleeding Steed", "Jade Eagle"] },
  { heroes: ["Octavius", "BeastQueen", "Immortal"] },
  { heroes: ["Alfred", "Black Prince", "Jeanne d'Arc"] },

  // --- TIER 3: SEASONAL SYNERGIES & SPECIALISTS ---
  { heroes: ["Theodora", "Inquisitor", "Al Fatih"] },             // Mixed Utility
  { heroes: ["Leonidas", "Ramses II", "Witch Hunter"] },
  { heroes: ["Leonidas", "Ramses II", "Inquisitor"] },
  { heroes: ["King Arthur", "Desert Storm", "Cao Cao"] },
  { heroes: ["Immortal Guardian", "Divine Arrow", "Jade Eagle"] },
  { heroes: ["Immortal Guardian", "Charles the Great", "Jade Eagle"] },
  { heroes: ["Immortal Guardian", "Charles the Great", "Al Fatih"] },
  { heroes: ["Immortal Guardian", "Divine Arrow", "Al Fatih"] },

  { heroes: ["Black Prince", "Jeanne d'Arc", "Lionheart"] },
  { heroes: ["Bleeding Steed", "Soaring Hawk", "Desert Storm"] },
  { heroes: ["Bleeding Steed", "Desert Storm", "Cao Cao"] },
  { heroes: ["Sky Breaker", "Inquisitor", "Witch Hunter"] },      // Anti-Heal focus
  { heroes: ["BeastQueen", "Lionheart", "Immortal"] },
  { heroes: ["BeastQueen", "Isabella I", "Immortal"] },
  { heroes: ["King Arthur","Soaring Hawk", "Desert Storm"] }, // Cavalry/Garrison Mix


  { heroes: ["Soaring Hawk", "Desert Storm", "Cao Cao"] },
  { heroes: ["Charles the Great", "Inquisitor", "Witch Hunter"] },
  { heroes: ["Charles the Great", "Edward the Confessor", "Al Fatih"] },

  { heroes: ["Peace Bringer", "Che Liu", "Jade"] },        // Debuff variation
  { heroes: ["Peace Bringer", "Bleeding Steed", "Jade"] },        // Debuff variation
  { heroes: ["War Lord", "Jeanne d'Arc", "Mary Tudor"] },         // Classic S0 Powerhouse
  { heroes: ["Alfred", "Jeanne d'Arc", "Mary Tudor"] },
  { heroes: ["Edward the Confessor", "Inquisitor", "Witch Hunter"] }, // Critical Strike focus
  { heroes: ["Immortal Guardian", "Leonidas", "Jade Eagle"] },
  { heroes: ["Immortal Guardian", "Isabella I", "Jade Eagle"] },
  { heroes: ["Immortal Guardian", "Divine Arrow", "William the Conqueror"] },
  { heroes: ["Immortal Guardian", "Leonidas", "Divine Arrow"] },
  { heroes: ["Immortal Guardian", "Isabella I", "Divine Arrow"] },
  { heroes: ["Demon Spear","Soaring Hawk", "Desert Storm"] },
  { heroes: ["Yukimura Sanada", "Rokuboshuten", "Jane"] },
  { heroes: ["North's Rage", "Rokuboshuten", "Jane"] },
  { heroes: ["War Lord", "Black Prince", "Jane"] },
  { heroes: ["Alfred", "Black Prince", "Lionheart"] },
  { heroes: ["Black Prince", "Constantine the Great", "Lionheart"] },
  { heroes: ["War Lord", "Isabella I", "Lionheart"] },
  { heroes: ["War Lord", "Isabella I", "Mary Tudor"] },
  { heroes: ["Demon Spear", "Che Liu", "Bleeding Steed"] },        // Debuff variation
  { heroes: ["Yukimura Sanada", "Isabella I", "Mary Tudor"] },
  { heroes: ["North's Rage", "Isabella I", "Mary Tudor"] },
  { heroes: ["North's Rage", "Isabella I", "Lionheart"] },
  { heroes: ["Yukimura Sanada", "Isabella I", "Mary Tudor"] },
  { heroes: ["Yukimura Sanada", "Isabella I", "Lionheart"] },
  { heroes: ["War Lord", "Rokuboshuten", "Jane"] },
  { heroes: ["War Lord", "Constantine the Great", "Jane"] },      // Defensive Support
  { heroes: ["Alfred", "Constantine the Great", "Jane"] },        // Support Variation
  { heroes: ["Edward the Confessor", "Leonidas", "Al Fatih"] },
  { heroes: ["Edward the Confessor", "Isabella I", "Al Fatih"] },
  { heroes: ["Edward the Confessor", "Charles the Great", "William the Conqueror"] },
  { heroes: ["Peace Bringer", "Genghis Khan", "The Heroine"] },

  // --- TIER 4: EARLY SEASON & TRANSITIONAL TEAMS ---
  { heroes: ["North's Rage", "Yukimura Sanada", "Isabella I"] },
  { heroes: ["Peace Bringer", "Genghis Khan", "Cao Cao"] },       // High Mobility
  { heroes: ["Queen Anne", "The Heroine", "William the Conqueror"] },
  { heroes: ["Queen Anne", "The Heroine", "The Boneless"] },
  { heroes: ["Queen Anne", "The Heroine", "William Wallace"] },
  { heroes: ["Yukimura Sanada", "The Heroine", "William Wallace"] },
  { heroes: ["North's Rage", "The Heroine", "William Wallace"] },
  { heroes: ["Demon Spear", "Jiguang Qi", "Genghis Khan"] },      // Burst Damage
  { heroes: ["Demon Spear", "Jiguang Qi", "North's Rage"] },      // Physical focus
  { heroes: ["Demon Spear", "Queen Anne", "William Wallace"] },   // Counter-Attack build
  { heroes: ["Yukimura Sanada", "William Wallace", "Heaven's Justice"] }, // S0 Starter Peak
  { heroes: ["North's Rage", "William Wallace", "Heaven's Justice"] }, // S0 Starter Peak

  { heroes: ["Yukimura Sanada", "The Heroine", "Heaven's Justice"] }, // S0 Starter Peak
  { heroes: ["North's Rage", "The Heroine", "Heaven's Justice"] }, // S0 Starter Peak

  { heroes: ["Yukimura Sanada", "Queen Anne", "Heaven's Justice"] }, // S0 Starter Peak
  { heroes: ["North's Rage", "Queen Anne", "Heaven's Justice"] }, // S0 Starter Peak
  { heroes: ["Kublai", "William Wallace", "Heaven's Justice"] }, // S0 Starter Peak
  
  { heroes: ["William Wallace", "Jiguang Qi", "Heaven's Justice"] }, // S0 Starter Peak
  { heroes: ["North's Rage", "The Boneless", "The Heroine"] },    // Balanced Starter
  { heroes: ["North's Rage", "The Boneless", "Heaven's Justice"] }
];
