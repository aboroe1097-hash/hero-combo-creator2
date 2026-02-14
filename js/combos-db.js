// js/combos-db.js
// Rank is determined by position in this array. First item = Rank 1.
// Mapping order: [Front, Middle, Back]
  // Season 5 (X1)
 //  { name: 'Bewoulf',      
 //  { name: 'Hunk',        
 //  { name: 'Boudica',      
 //  { name: 'Sakura',       
  // { name: 'Wind-Walker',  
 //  { name: 'ELK',          
  // { name: 'Cicero',     }


export const rankedCombos = [
  // --- TIER 1: TOP GARRISON META (S4 Focus) ---
  { heroes: ["Ramses II", "Leonidas", "Bewoulf"] },          // Rank 1
  { heroes: ["Ramses II", "Cleopatra VII", "Bewoulf"] },      // Rank 3
  { heroes: ["Bleeding Steed", "Ramses II", "Bewoulf"] },     // Rank 4
  
  { heroes: ["Ramses II", "Leonidas", "Jade Eagle"] },          // Rank 1
  { heroes: ["Ramses II", "Cleopatra VII", "Jade Eagle"] },      // Rank 3
  { heroes: ["Bleeding Steed", "Ramses II", "Jade Eagle"] },     // Rank 4
  { heroes: ["Octavius", "Theodora", "Caesar"] },               // Rank 5
  { heroes: ["Octavius", "Rozen Blade", "Caesar"] },            // Rank 6
  { heroes: ["King Arthur", "Cleopatra VII", "Theodora"] },    // Rank 7
  { heroes: ["King Arthur", "Theodora", "Bleeding Steed"] },    // Rank 7
  { heroes: ["The Brave", "Ramses II", "Jade Eagle"] },         // Rank 8
  { heroes: ["Ramses II", "Charles the Great", "Jade Eagle"] }, // Rank 9
  { heroes: ["Ramses II", "Rozen Blade", "Jade Eagle"] },       // Rank 10
  
  // --- TIER 2: HIGH COMPETITIVE ---
  { heroes: ["Octavius", "Cleopatra VII", "Caesar"] },          // Rank 11
  { heroes: ["Octavius", "The Brave", "Caesar"] },              // Rank 2
  { heroes: ["Theodora", "Ramses II", "Jade Eagle"] },          // Rank 12
  { heroes: ["King Arthur", "Cleopatra VII", "Bleeding Steed"] }, // Rank 13
  { heroes: ["King Arthur", "Bleeding Steed", "Cleopatra VII"] }, // Rank 14
  { heroes: ["Alfred", "Cleopatra VII", "Lionheart"] },         // Rank 15
  { heroes: ["King Arthur", "Theodora", "Cleopatra VII"] },     // Rank 16
        

  // --- TIER 2: STRONG COMPETITIVE META ---
  { heroes: ["King Arthur", "Bleeding Steed", "Cao Cao"] },        
  { heroes: ["Sky Breaker", "Ramses II", "Al Fatih"] },
  { heroes: ["Alfred", "Bleeding Steed", "Cleopatra VII"] },      
  { heroes: ["The Brave", "Bleeding Steed", "Jade Eagle"] },      
  { heroes: ["Rozen Blade", "Cleopatra VII", "Caesar"] },
  { heroes: ["Rozen Blade", "Cleopatra VII", "Immortal"] },     
  { heroes: ["BeastQueen", "Rozen Blade", "Immortal"] },     
  { heroes: ["Black Prince", "Jeanne d'Arc", "Jane"] },         // Rank 17
  { heroes: ["Alfred", "Jeanne d'Arc", "Jane"] },               // Rank 18
  { heroes: ["Alfred", "Black Prince", "Cleopatra VII"] },      // Rank 19
  { heroes: ["Alfred", "Jeanne d'Arc", "Lionheart"] },          // Rank 20
  { heroes: ["Charles the Great", "Ramses II", "Al Fatih"] },    
  { heroes: ["Theodora", "The Brave", "Jade Eagle"] },   
  
  { heroes: ["War Lord", "Alfred", "Lionheart"] },              
  { heroes: ["Alfred", "Black Prince", "Lionheart"] },          
  { heroes: ["Alfred", "Black Prince", "Jeanne d'Arc"] },       
  { heroes: ["Alfred", "Cleopatra VII", "Jane"] },              
   
  
  { heroes: ["Immortal Guardian", "Bleeding Steed", "Jade Eagle"] },
  { heroes: ["Octavius", "BeastQueen", "Immortal"] },
  { heroes: ["War Lord", "Rozen Blade", "Caesar"] },
  
  // --- TIER 3: SEASONAL SYNERGIES & SPECIALISTS ---
  { heroes: ["Theodora", "Inquisitor", "Al Fatih"] },              
  { heroes: ["Leonidas", "Ramses II", "Witch Hunter"] },
  { heroes: ["Leonidas", "Ramses II", "Inquisitor"] },
  { heroes: ["King Arthur", "Desert Storm", "Cao Cao"] },
  { heroes: ["Immortal Guardian", "Divine Arrow", "Jade Eagle"] },
  { heroes: ["Immortal Guardian", "Charles the Great", "Jade Eagle"] },
  { heroes: ["Immortal Guardian", "Charles the Great", "Al Fatih"] },
  { heroes: ["Immortal Guardian", "Divine Arrow", "Al Fatih"] },
  { heroes: ["Immortal Guardian", "Divine Arrow", "Sky Breaker"] },
  
  { heroes: ["War Lord", "Jeanne d'Arc", "Jane"] },               
  { heroes: ["Black Prince", "Cleopatra VII", "Jane"] },        
  { heroes: ["Black Prince", "Cleopatra VII", "Lionheart"] },   
  { heroes: ["War Lord", "Jeanne d'Arc", "Lionheart"] },      
  { heroes: ["War Lord", "Alfred", "Jane"] },               
  { heroes: ["War Lord", "Cleopatra VII", "Lionheart"] },      
  { heroes: ["War Lord", "Cleopatra VII", "Jane"] },            
  
  { heroes: ["Bleeding Steed", "Soaring Hawk", "Desert Storm"] },
  { heroes: ["Bleeding Steed", "Desert Storm", "Cao Cao"] },
  { heroes: ["Sky Breaker", "Inquisitor", "Witch Hunter"] },      // Anti-Heal focus
  { heroes: ["BeastQueen", "Lionheart", "Immortal"] },
  { heroes: ["BeastQueen", "Isabella I", "Immortal"] },
  { heroes: ["King Arthur","Soaring Hawk", "Desert Storm"] }, 

  { heroes: ["Soaring Hawk", "Desert Storm", "Cao Cao"] },
  { heroes: ["Charles the Great", "Inquisitor", "Witch Hunter"] },
  { heroes: ["Charles the Great", "Edward the Confessor", "Al Fatih"] },

  { heroes: ["Peace Bringer", "Che Liu", "Jade"] },        
  { heroes: ["Peace Bringer", "Bleeding Steed", "Jade"] },        
  { heroes: ["War Lord", "Jeanne d'Arc", "Mary Tudor"] },          
  { heroes: ["Alfred", "Jeanne d'Arc", "Mary Tudor"] },
  { heroes: ["Edward the Confessor", "Inquisitor", "Witch Hunter"] }, 
  { heroes: ["Immortal Guardian", "Leonidas", "Jade Eagle"] },
  { heroes: ["Immortal Guardian", "Isabella I", "Jade Eagle"] },
  { heroes: ["Immortal Guardian", "Divine Arrow", "William the Conqueror"] },
  { heroes: ["Immortal Guardian", "Leonidas", "Divine Arrow"] },
  { heroes: ["Immortal Guardian", "Isabella I", "Divine Arrow"] },
  { heroes: ["Demon Spear","Soaring Hawk", "Desert Storm"] },
  { heroes: ["Yukimura Sanada", "Rokuboshuten", "Jane"] },
  { heroes: ["North's Rage", "Rokuboshuten", "Jane"] },
  { heroes: ["War Lord", "Black Prince", "Jane"] },
  { heroes: ["Black Prince", "Constantine the Great", "Lionheart"] },
  { heroes: ["War Lord", "Isabella I", "Lionheart"] },
  { heroes: ["War Lord", "Isabella I", "Mary Tudor"] },
  { heroes: ["Demon Spear", "Che Liu", "Bleeding Steed"] },        
  { heroes: ["Yukimura Sanada", "Isabella I", "Mary Tudor"] },
  { heroes: ["North's Rage", "Isabella I", "Mary Tudor"] },
  { heroes: ["North's Rage", "Isabella I", "Lionheart"] },
  { heroes: ["Yukimura Sanada", "Isabella I", "Lionheart"] },
  { heroes: ["War Lord", "Rokuboshuten", "Jane"] },
  { heroes: ["War Lord", "Constantine the Great", "Jane"] },      
  { heroes: ["Alfred", "Constantine the Great", "Jane"] },        
  { heroes: ["Edward the Confessor", "Leonidas", "Al Fatih"] },
  { heroes: ["Edward the Confessor", "Isabella I", "Al Fatih"] },
  { heroes: ["Edward the Confessor", "Charles the Great", "William the Conqueror"] },
  { heroes: ["Peace Bringer", "Genghis Khan", "The Heroine"] },

  // --- TIER 4: EARLY SEASON & TRANSITIONAL TEAMS ---
  { heroes: ["North's Rage", "Yukimura Sanada", "Isabella I"] },
  { heroes: ["Peace Bringer", "Genghis Khan", "Cao Cao"] },        
  { heroes: ["Queen Anne", "The Heroine", "William the Conqueror"] },
  { heroes: ["Queen Anne", "The Heroine", "The Boneless"] },
  { heroes: ["Queen Anne", "The Heroine", "William Wallace"] },
  { heroes: ["Yukimura Sanada", "The Heroine", "William Wallace"] },
  { heroes: ["North's Rage", "The Heroine", "William Wallace"] },
  { heroes: ["Demon Spear", "Jiguang Qi", "Genghis Khan"] },      
  { heroes: ["Demon Spear", "Jiguang Qi", "North's Rage"] },      
  { heroes: ["Demon Spear", "Queen Anne", "William Wallace"] },   
  { heroes: ["Yukimura Sanada", "William Wallace", "Heaven's Justice"] }, 
  { heroes: ["North's Rage", "William Wallace", "Heaven's Justice"] }, 

  { heroes: ["Yukimura Sanada", "The Heroine", "Heaven's Justice"] }, 
  { heroes: ["North's Rage", "The Heroine", "Heaven's Justice"] }, 

  { heroes: ["Yukimura Sanada", "Queen Anne", "Heaven's Justice"] }, 
  { heroes: ["North's Rage", "Queen Anne", "Heaven's Justice"] }, 
  { heroes: ["Kublai", "William Wallace", "Heaven's Justice"] }, 
  
  { heroes: ["William Wallace", "Jiguang Qi", "Heaven's Justice"] }, 
  { heroes: ["North's Rage", "The Boneless", "The Heroine"] },    
  { heroes: ["North's Rage", "The Boneless", "Heaven's Justice"] }
];
