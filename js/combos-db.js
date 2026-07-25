// js/combos-db.js
// Rank is determined by position in this array. First item = Rank 1.
// Mapping order: [Front, Middle, Back]

/**
 * @typedef {Object} ComboEntry
 * @property {string[]} heroes - The three hero names in the combo ordered by [Front, Middle, Back].
 * @property {string=} skin - Optional skin requirement code per slot. 3=must, 2=recommended, 1=optional.
 * @property {string=} source - Optional provenance marker for imported combo evidence.
 * @property {string=} sourceTier - Optional tier from the source dataset.
 * @property {number=} sourceScore - Optional score from the source dataset.
 */

/**
 * High-tier combos database sorted by strategic meta-ranking.
 * @type {ComboEntry[]}
 */
const X8_AVAILABILITY_SOURCE = 'rocacademy-free-noskin-x8-name-match-2026-07-25';

const x8AvailabilityCombos = [
  { heroes: ['Alexander', 'Ragnar', 'Theodora'], source: X8_AVAILABILITY_SOURCE, sourceTier: 'S', sourceScore: 340.6 },
  { heroes: ['Warden', 'Ramses II', 'Beowulf'], source: X8_AVAILABILITY_SOURCE, sourceTier: 'S', sourceScore: 328.7 },
  { heroes: ['Cyrus', 'Ragnar', 'Caesar'], source: X8_AVAILABILITY_SOURCE, sourceTier: 'A', sourceScore: 288.8 },
  { heroes: ['Theodora', 'Warhammer', 'Alexander'], source: X8_AVAILABILITY_SOURCE, sourceTier: 'A', sourceScore: 282.1 },
  { heroes: ['Cyrus', 'Lancelot', 'Caesar'], source: X8_AVAILABILITY_SOURCE, sourceTier: 'A', sourceScore: 272 },
  { heroes: ['Theodora', 'Cyrus', 'Bjorn'], source: X8_AVAILABILITY_SOURCE, sourceTier: 'A', sourceScore: 265.2 },
  { heroes: ['Theodora', 'Cyrus', 'Caesar'], source: X8_AVAILABILITY_SOURCE, sourceTier: 'A', sourceScore: 262.7 },
  { heroes: ['Cyrus', 'Cleopatra VII', 'Caesar'], source: X8_AVAILABILITY_SOURCE, sourceTier: 'A', sourceScore: 259.4 },
  { heroes: ['Lawman', 'Warhammer', 'The Avalanche'], source: X8_AVAILABILITY_SOURCE, sourceTier: 'A', sourceScore: 258.8 },
  { heroes: ['Theodora', 'Cyrus', 'Lancelot'], source: X8_AVAILABILITY_SOURCE, sourceTier: 'A', sourceScore: 257.9 },
  { heroes: ['Warhammer', 'Lancelot', 'The Avalanche'], source: X8_AVAILABILITY_SOURCE, sourceTier: 'A', sourceScore: 257.1 },
  { heroes: ['Bleeding Steed', 'Warden', 'King Arthur'], source: X8_AVAILABILITY_SOURCE, sourceTier: 'B', sourceScore: 255.5 },
  { heroes: ['The Brave', 'Warhammer', 'The Avalanche'], source: X8_AVAILABILITY_SOURCE, sourceTier: 'B', sourceScore: 253.5 },
  { heroes: ['Alexander', 'Theodora', 'Bjorn'], source: X8_AVAILABILITY_SOURCE, sourceTier: 'B', sourceScore: 251.2 },
  { heroes: ['Cleopatra VII', 'Warhammer', 'The Avalanche'], source: X8_AVAILABILITY_SOURCE, sourceTier: 'B', sourceScore: 249 },
  { heroes: ['King Arthur', 'Theodora', 'Warhammer'], source: X8_AVAILABILITY_SOURCE, sourceTier: 'B', sourceScore: 248.6 },
  { heroes: ['Theodora', 'Bleeding Steed', 'Warhammer'], source: X8_AVAILABILITY_SOURCE, sourceTier: 'B', sourceScore: 247.8 },
  { heroes: ['The Brave', 'Bjorn', 'The Avalanche'], source: X8_AVAILABILITY_SOURCE, sourceTier: 'B', sourceScore: 247.2 },
  { heroes: ['Lawman', 'Bjorn', 'The Avalanche'], source: X8_AVAILABILITY_SOURCE, sourceTier: 'B', sourceScore: 247.1 },
  { heroes: ['Hunk', 'Warden', 'King Arthur'], source: X8_AVAILABILITY_SOURCE, sourceTier: 'B', sourceScore: 241.8 },
  { heroes: ['The Brave', 'Bjorn', 'Warhammer'], source: X8_AVAILABILITY_SOURCE, sourceTier: 'B', sourceScore: 239.8 },
  { heroes: ['Lawman', 'Lancelot', 'Warhammer'], source: X8_AVAILABILITY_SOURCE, sourceTier: 'B', sourceScore: 234.9 },
  { heroes: ['Hunk', 'Warden', 'Beowulf'], source: X8_AVAILABILITY_SOURCE, sourceTier: 'B', sourceScore: 233.8 },
  { heroes: ['Bleeding Steed', 'Warhammer', 'The Avalanche'], source: X8_AVAILABILITY_SOURCE, sourceTier: 'B', sourceScore: 228.3 },
  { heroes: ['Bjorn', 'Lancelot', 'Warhammer'], source: X8_AVAILABILITY_SOURCE, sourceTier: 'B', sourceScore: 227.6 },
  { heroes: ['Eidolon', 'Warden', 'Ashen Verdict'], source: X8_AVAILABILITY_SOURCE, sourceTier: 'C', sourceScore: 224.6 },
  { heroes: ['King Arthur', 'Ragnar', 'Bleeding Steed'], source: X8_AVAILABILITY_SOURCE, sourceTier: 'C', sourceScore: 224.5 },
  { heroes: ['Eidolon', 'Ashen Verdict', 'Jade Eagle'], source: X8_AVAILABILITY_SOURCE, sourceTier: 'C', sourceScore: 222.6 },
  { heroes: ['Ragnar', 'Ramses II', 'Jade Eagle'], source: X8_AVAILABILITY_SOURCE, sourceTier: 'C', sourceScore: 221.9 },
  { heroes: ['Bjorn', 'Army Breaker', 'The Avalanche'], source: X8_AVAILABILITY_SOURCE, sourceTier: 'C', sourceScore: 221.9 },
  { heroes: ['King Arthur', 'Bleeding Steed', 'Warhammer'], source: X8_AVAILABILITY_SOURCE, sourceTier: 'C', sourceScore: 221.5 },
  { heroes: ['Cyrus', 'Lancelot', 'Warhammer'], source: X8_AVAILABILITY_SOURCE, sourceTier: 'C', sourceScore: 221 },
  { heroes: ['Alexander', 'Bleeding Steed', 'Warhammer'], source: X8_AVAILABILITY_SOURCE, sourceTier: 'C', sourceScore: 219.5 },
  { heroes: ['Jeanne d\'Arc', 'Warhammer', 'The Avalanche'], source: X8_AVAILABILITY_SOURCE, sourceTier: 'C', sourceScore: 213.6 },
  { heroes: ['Lawman', 'Cleopatra VII', 'Warhammer'], source: X8_AVAILABILITY_SOURCE, sourceTier: 'C', sourceScore: 213.3 },
  { heroes: ['Warden', 'Spectral Reaper', 'Ramses II'], source: X8_AVAILABILITY_SOURCE, sourceTier: 'C', sourceScore: 212.6 },
  { heroes: ['Sakura', 'Ragnar', 'Jade Eagle'], source: X8_AVAILABILITY_SOURCE, sourceTier: 'C', sourceScore: 212.3 },
  { heroes: ['Warden', 'Jade Eagle', 'Spectral Reaper'], source: X8_AVAILABILITY_SOURCE, sourceTier: 'C', sourceScore: 211.4 },
  { heroes: ['Alexander', 'Warhammer', 'Cleopatra VII'], source: X8_AVAILABILITY_SOURCE, sourceTier: 'C', sourceScore: 210.5 },
  { heroes: ['Boudica', 'Ragnar', 'Jade Eagle'], source: X8_AVAILABILITY_SOURCE, sourceTier: 'C', sourceScore: 210.3 },
  { heroes: ['Army Breaker', 'Alfred', 'Warhammer'], source: X8_AVAILABILITY_SOURCE, sourceTier: 'C', sourceScore: 208 },
  { heroes: ['Wind-Walker', 'Warhammer', 'The Avalanche'], source: X8_AVAILABILITY_SOURCE, sourceTier: 'C', sourceScore: 202.4 },
  { heroes: ['Liberator', 'Theodora', 'Alexander'], source: X8_AVAILABILITY_SOURCE, sourceTier: 'C', sourceScore: 202.4 },
  { heroes: ['Octavius', 'Ragnar', 'Caesar'], source: X8_AVAILABILITY_SOURCE, sourceTier: 'C', sourceScore: 201.9 },
  { heroes: ['The Brave', 'Bjorn', 'Army Breaker'], source: X8_AVAILABILITY_SOURCE, sourceTier: 'C', sourceScore: 201.3 },
  { heroes: ['Lawman', 'Bleeding Steed', 'Warhammer'], source: X8_AVAILABILITY_SOURCE, sourceTier: 'C', sourceScore: 200.7 },
  { heroes: ['Lawman', 'Bjorn', 'Army Breaker'], source: X8_AVAILABILITY_SOURCE, sourceTier: 'C', sourceScore: 198.9 },
  { heroes: ['Warden', 'Spectral Reaper', 'Sakura'], source: X8_AVAILABILITY_SOURCE, sourceTier: 'C', sourceScore: 196.7 },
  { heroes: ['Lawman', 'Alfred', 'Warhammer'], source: X8_AVAILABILITY_SOURCE, sourceTier: 'C', sourceScore: 194.3 },
  { heroes: ['Ragnar', 'Ramses II', 'Caesar'], source: X8_AVAILABILITY_SOURCE, sourceTier: 'C', sourceScore: 193.4 },
  { heroes: ['Sky Breaker', 'Warden', 'Jade Eagle'], source: X8_AVAILABILITY_SOURCE, sourceTier: 'C', sourceScore: 189.1 },
  { heroes: ['Warden', 'Ashen Verdict', 'Spectral Reaper'], source: X8_AVAILABILITY_SOURCE, sourceTier: 'C', sourceScore: 188.6 },
  { heroes: ['Black Prince', 'Cleopatra VII', 'Bjorn'], source: X8_AVAILABILITY_SOURCE, sourceTier: 'C', sourceScore: 188.4 },
  { heroes: ['Hunk', 'Warden', 'Caesar'], source: X8_AVAILABILITY_SOURCE, sourceTier: 'C', sourceScore: 188 },
  { heroes: ['War Lord', 'Warhammer', 'The Avalanche'], source: X8_AVAILABILITY_SOURCE, sourceTier: 'C', sourceScore: 187.3 },
  { heroes: ['King Arthur', 'Cicero', 'Fortuneteller'], source: X8_AVAILABILITY_SOURCE, sourceTier: 'C', sourceScore: 187 },
  { heroes: ['The Brave', 'Bjorn', 'Jane'], source: X8_AVAILABILITY_SOURCE, sourceTier: 'C', sourceScore: 184.6 },
  { heroes: ['Sky Breaker', 'Sakura', 'Ashen Verdict'], source: X8_AVAILABILITY_SOURCE, sourceTier: 'C', sourceScore: 183.6 },
  { heroes: ['King Arthur', 'Skanda', 'Bleeding Steed'], source: X8_AVAILABILITY_SOURCE, sourceTier: 'C', sourceScore: 181.9 },
  { heroes: ['Liberator', 'Jade', 'Cao Cao'], source: X8_AVAILABILITY_SOURCE, sourceTier: 'C', sourceScore: 181.4 },
  { heroes: ['Lawman', 'Warhammer', 'Rainforest Ranger'], source: X8_AVAILABILITY_SOURCE, sourceTier: 'C', sourceScore: 181.3 },
  { heroes: ['Hunk', 'Warden', 'Spectral Reaper'], source: X8_AVAILABILITY_SOURCE, sourceTier: 'C', sourceScore: 181 },
  { heroes: ['Warden', 'Al Fatih', 'Ramses II'], source: X8_AVAILABILITY_SOURCE, sourceTier: 'C', sourceScore: 180.4 },
  { heroes: ['War Lord', 'Bjorn', 'The Avalanche'], source: X8_AVAILABILITY_SOURCE, sourceTier: 'C', sourceScore: 177.5 },
  { heroes: ['Immortal Guardian', 'Warden', 'Spectral Reaper'], source: X8_AVAILABILITY_SOURCE, sourceTier: 'C', sourceScore: 177.2 },
  { heroes: ['Ashen Verdict', 'Sakura', 'Spectral Reaper'], source: X8_AVAILABILITY_SOURCE, sourceTier: 'C', sourceScore: 175.1 },
  { heroes: ['Octavius', 'Warden', 'Caesar'], source: X8_AVAILABILITY_SOURCE, sourceTier: 'C', sourceScore: 174.1 },
  { heroes: ['Liberator', 'Bleeding Steed', 'Jade'], source: X8_AVAILABILITY_SOURCE, sourceTier: 'C', sourceScore: 173.1 },
  { heroes: ['Defender', 'Warden', 'Spectral Reaper'], source: X8_AVAILABILITY_SOURCE, sourceTier: 'C', sourceScore: 172.6 },
  { heroes: ['Skanda', 'Bleeding Steed', 'Valkyrie'], source: X8_AVAILABILITY_SOURCE, sourceTier: 'C', sourceScore: 171.6 },
  { heroes: ['Liberator', 'Skanda', 'Alexander'], source: X8_AVAILABILITY_SOURCE, sourceTier: 'C', sourceScore: 170.9 },
  { heroes: ['The Brave', 'Warhammer', 'Rainforest Ranger'], source: X8_AVAILABILITY_SOURCE, sourceTier: 'C', sourceScore: 170.1 },
  { heroes: ['Peace Bringer', 'Warden', 'Caesar'], source: X8_AVAILABILITY_SOURCE, sourceTier: 'C', sourceScore: 169.1 },
  { heroes: ['Soaring Hawk', 'Desert Storm', 'Skanda'], source: X8_AVAILABILITY_SOURCE, sourceTier: 'C', sourceScore: 168.1 },
  { heroes: ['Liberator', 'Skanda', 'Cao Cao'], source: X8_AVAILABILITY_SOURCE, sourceTier: 'C', sourceScore: 166.9 },
  { heroes: ['War Lord', 'Warhammer', 'Jane'], source: X8_AVAILABILITY_SOURCE, sourceTier: 'C', sourceScore: 158.4 },
  { heroes: ['Hunk', 'Scarlet Reaver', 'Valkyrie'], source: X8_AVAILABILITY_SOURCE, sourceTier: 'C', sourceScore: 157.6 },
  { heroes: ['Hunk', 'Warden', 'Rainforest Ranger'], source: X8_AVAILABILITY_SOURCE, sourceTier: 'C', sourceScore: 151.6 },
  { heroes: ['Rozen Blade', 'Warden', 'Rainforest Ranger'], source: X8_AVAILABILITY_SOURCE, sourceTier: 'C', sourceScore: 151.4 },
  { heroes: ['Liberator', 'Warden', 'Caesar'], source: X8_AVAILABILITY_SOURCE, sourceTier: 'C', sourceScore: 149.9 },
  { heroes: ['King Arthur', 'Warhammer', 'Skanda'], source: X8_AVAILABILITY_SOURCE, sourceTier: 'C', sourceScore: 149.4 },
  { heroes: ['Octavius', 'Warden', 'Rainforest Ranger'], source: X8_AVAILABILITY_SOURCE, sourceTier: 'C', sourceScore: 147.4 },
];

function x8AvailabilityTier(tier) {
  return x8AvailabilityCombos.filter((combo) => combo.sourceTier === tier);
}

export const rankedCombos = [
  // --- SKIN MODE RANK OVERRIDES ---
  // skin code slots: 3 = must own skin, 2 = recommended skin, 1 = optional skin.
  // Missing skin metadata behaves like 111, so the combo keeps its normal rank with or without skins.
  { heroes: ["Beowulf", "Ramses II", "Theodora"], skin: '123', note: 'Highest observed S0-X1 sustain combo: Theodora skin is required, Ramses II skin is recommended, Beowulf skin is optional. No counter found yet.' },
  { heroes: ["King Arthur", "Cleopatra VII", "Theodora"], skin: '113', note: 'S0-X1 top combo when Theodora skin is owned. Arthur and Cleopatra skins are optional bonuses.' },
  { heroes: ["Immortal Guardian", "Ramses II", "Beowulf"], skin: '321', note: 'Immortal Guardian skin is required. Ramses II is recommended; Beowulf is optional.' },
  { heroes: ["King Arthur", "Cleopatra VII", "Bleeding Steed"], skin: '233', note: 'Requested 2333 skin lane mapped to the app three-slot skin code: Arthur recommended, Cleopatra and Bleeding Steed required.' },
  { heroes: ["Hunk", "Boudica", "Sakura"], skin: '233', note: 'Skin-mode lane placed above Boudica / Sakura / Jade Eagle: Hunk recommended, Boudica and Sakura required.' },
  { heroes: ["Octavius", "Rozen Blade", "Caesar"], skin: '232', note: 'Rozen Blade skin is required. Octavius and Caesar skins are recommended.' },

  { heroes: ["Beowulf", "Ramses II", "Theodora"], note: 'Beowulf front-row skill spam triggers Theodora healing, producing a stable high-damage sustain combo.' },
  { heroes: ["Alexander", "Cleopatra VII", "Theodora"] },
  { heroes: ["King Arthur","Theodora", "Alexander"] },
  { heroes: ["King Arthur","Cleopatra VII","Alexander"] },
  
  // --- X8 availability additions: source tiers S-A ---
  ...x8AvailabilityTier('S'),
  ...x8AvailabilityTier('A'),

  // --- TIER 1: TOP GARRISON META (S4 Focus) ---
  { heroes: ["Immortal Guardian", "Ramses II", "Beowulf"] },
  { heroes: ["Hunk", "Ramses II", "Beowulf"] },
  { heroes: ["Bleeding Steed", "Ramses II", "Beowulf"] },
  { heroes: ["Rozen Blade", "Ramses II", "Beowulf"] },
  { heroes: ["Ramses II", "Leonidas", "Beowulf"] },
  { heroes: ["Theodora", "Ramses II", "Jade Eagle"] },
  { heroes: ["King Arthur", "Theodora", "Bleeding Steed"] },
  { heroes: ["Octavius", "Cleopatra VII", "Caesar"] },
  { heroes: ["King Arthur", "Bleeding Steed", "Desert Storm"] },
  { heroes: ["Ramses II", "Leonidas", "Jade Eagle"] },
  { heroes: ["Octavius", "Theodora", "Caesar"] },
  { heroes: ["Theodora", "Boudica", "Jade Eagle"] },
  { heroes: ["Ramses II", "Cleopatra VII", "Jade Eagle"] },
  { heroes: ["Bleeding Steed", "Ramses II", "Jade Eagle"] },
  { heroes: ["King Arthur", "Cleopatra VII", "Bleeding Steed"] },
  { heroes: ["King Arthur", "Cleopatra VII", "Theodora"] },

  // --- X2 Spectral Reaper Combos ---
  { heroes: ["Hunk", "Spectral Reaper", "Ramses II"] },
      { heroes: ["Octavius", "The Brave", "Caesar"] },
  { heroes: ["Rozen Blade", "Spectral Reaper", "Sakura"] },
  
  // --- X2 Mixed / Lawman Combos ---
  { heroes: ["Lawman", "War Lord", "Jane"] },
  { heroes: ["Lawman", "Rozen Blade", "Immortal"] },

  // --- X2 Archers / Defender & Tarantula Combos ---
  { heroes: ["Defender", "Tarantula", "Sakura"] },
  { heroes: ["Defender", "Sakura", "Jade Eagle"] },
  { heroes: ["Defender", "Ramses II", "Al Fatih"] },
  { heroes: ["Defender", "Sakura", "Spectral Reaper"] },
  { heroes: ["Sakura", "Divine Arrow", "Spectral Reaper"] },
  { heroes: ["Immortal Guardian", "ELK", "Tarantula"] },
  { heroes: ["Immortal Guardian", "Charles the Great", "Tarantula"] },
  { heroes: ["Black Prince", "Lancelot", "The Avalanche"] },
  
  // --- X2 Cavalry / Avalanche Combos ---
  { heroes: ["Lawman", "Lancelot", "The Avalanche"] },
  { heroes: ["Lawman", "Army Breaker", "The Avalanche"] },
  { heroes: ["War Lord", "Lawman", "The Avalanche"] },
  { heroes: ["The Brave", "Lawman", "The Avalanche"] },
  { heroes: ["Lawman", "The Brave", "The Avalanche"] },
  { heroes: ["Lawman", "Rozen Blade", "The Avalanche"] },
  { heroes: ["Lawman", "Lionheart", "The Avalanche"] },
  { heroes: ["The Brave", "Army Breaker", "The Avalanche"] },
  { heroes: ["Black Prince", "Jeanne d'Arc", "The Avalanche"] },

  { heroes: ["Theodora", "Bleeding Steed", "Jade Eagle"] },
  { heroes: ["The Brave", "Ramses II", "Jade Eagle"] },
  { heroes: ["Ramses II", "Charles the Great", "Jade Eagle"] },
  { heroes: ["Octavius", "Rozen Blade", "Caesar"] },
  { heroes: ["Ramses II", "Rozen Blade", "Jade Eagle"] },
  { heroes: ["Hunk", "Boudica", "Sakura"] },
    { heroes: ["Alfred", "Black Prince", "Jeanne d'Arc"], skin: '333', note: 'S0-S1 top combo when all three skins are owned.' },
  { heroes: ["Boudica", "Sakura", "Jade Eagle"] },
  { heroes: ["Hunk", "Sakura", "Jade Eagle"] },
  { heroes: ["Sakura", "ELK", "Jade Eagle"] },
  { heroes: ["Alfred", "Cleopatra VII", "Lionheart"] },
  
  // --- X8 availability additions: source tier B ---
  ...x8AvailabilityTier('B'),

  // --- TIER 2: STRONG COMPETITIVE META ---
  { heroes: ["Sky Breaker", "Boudica", "Sakura"] },
  { heroes: ["King Arthur", "Cicero", "Bleeding Steed"] },
  { heroes: ["King Arthur", "Bleeding Steed", "Cao Cao"] },     
  { heroes: ["Boudica", "Cleopatra VII", "Al Fatih"] },
  { heroes: ["Ramses II", "Immortal Guardian", "Witch Hunter"] },
  { heroes: ["Boudica", "Al Fatih", "Ramses II"] },
  { heroes: ["Ramses II", "Al Fatih", "Sakura"] },
  { heroes: ["Sky Breaker", "Ramses II", "Al Fatih"] },
  { heroes: ["Wind-Walker", "Rozen Blade", "Immortal"] },  
  { heroes: ["Hunk", "Cleopatra VII", "Cao Cao"] },
  { heroes: ["Hunk", "Bleeding Steed", "Cao Cao"] },
  { heroes: ["Alfred", "Bleeding Steed", "Cleopatra VII"] },      
  { heroes: ["The Brave", "Bleeding Steed", "Jade Eagle"] }, 
  { heroes: ["Immortal Guardian", "Sakura", "Jade Eagle"] },
  { heroes: ["Charles the Great", "Ramses II", "Al Fatih"] },
  { heroes: ["Sky Breaker", "Cleopatra VII", "Al Fatih"] },
  { heroes: ["Boudica", "Inquisitor", "Witch Hunter"] },
  { heroes: ["Rozen Blade", "Cleopatra VII", "Immortal"] },     
  { heroes: ["BeastQueen", "Rozen Blade", "Immortal"] },  
  { heroes: ["Theodora", "Che Liu", "Cicero"] },
  { heroes: ["Hunk", "Ramses II", "Al Fatih"] },  
  { heroes: ["Alfred", "Black Prince", "Jeanne d'Arc"] },     
  { heroes: ["Black Prince", "Jeanne d'Arc", "Jane"] },
  { heroes: ["Alfred", "Jeanne d'Arc", "Jane"] },
  { heroes: ["Alfred", "Black Prince", "Cleopatra VII"] },
  { heroes: ["Alfred", "Jeanne d'Arc", "Lionheart"] },
  { heroes: ["Theodora", "The Brave", "Jade Eagle"] },   
  { heroes: ["Immortal Guardian", "Charles the Great", "Jade Eagle"] },
  { heroes: ["Sky Breaker", "Inquisitor", "Sakura"] },
  { heroes: ["Sakura", "Charles the Great", "Al Fatih"] },
  { heroes: ["War Lord", "Alfred", "Lionheart"] },              
  { heroes: ["Alfred", "Black Prince", "Lionheart"] },          
  { heroes: ["Alfred", "Cleopatra VII", "Jane"] },              
  { heroes: ["Sky Breaker", "Inquisitor", "Charles the Great"] },
  { heroes: ["Immortal Guardian", "Bleeding Steed", "Jade Eagle"] },
  { heroes: ["Octavius", "BeastQueen", "Immortal"] },
  { heroes: ["War Lord", "Rozen Blade", "Caesar"] },
  
  // --- X8 availability additions: source tier C ---
  ...x8AvailabilityTier('C'),

  // --- TIER 3: SEASONAL SYNERGIES & SPECIALISTS ---
  { heroes: ["Theodora", "Inquisitor", "Al Fatih"] },             
  { heroes: ["Leonidas", "Ramses II", "Witch Hunter"] },
  { heroes: ["Leonidas", "Ramses II", "Inquisitor"] },
  { heroes: ["King Arthur", "Desert Storm", "Cao Cao"] },
  { heroes: ["Immortal Guardian", "Divine Arrow", "Jade Eagle"] },
  { heroes: ["Immortal Guardian", "Charles the Great", "Al Fatih"] },
  { heroes: ["Immortal Guardian", "Divine Arrow", "Al Fatih"] },
  { heroes: ["Immortal Guardian", "Divine Arrow", "Sky Breaker"] },
  { heroes: ["Che Liu", "Cicero", "Desert Storm"] },
  { heroes: ["Che Liu", "Jade", "Cicero"] },
  { heroes: ["War Lord", "Jeanne d'Arc", "Jane"] },               
  { heroes: ["Black Prince", "Cleopatra VII", "Jane"] },        
  { heroes: ["Black Prince", "Cleopatra VII", "Lionheart"] },   
  { heroes: ["War Lord", "Jeanne d'Arc", "Lionheart"] },      
  { heroes: ["War Lord", "Alfred", "Jane"] },               
  { heroes: ["War Lord", "Cleopatra VII", "Lionheart"] },      
  { heroes: ["War Lord", "Cleopatra VII", "Jane"] },            
  { heroes: ["Bleeding Steed", "Soaring Hawk", "Desert Storm"] },
  { heroes: ["Bleeding Steed", "Desert Storm", "Cao Cao"] },
  { heroes: ["Sky Breaker", "Inquisitor", "Witch Hunter"] },
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

export function scoreComboByRank(index, total) {
  if (total <= 1) return '100.0';
  return (100 - ((index / (total - 1)) * 99)).toFixed(1);
}

export const SKIN_SLOT_REQUIREMENTS = {
  1: 'optional',
  2: 'recommended',
  3: 'must',
};

function normalizeComboSkinCode(combo) {
  const code = String(combo?.skin || '').trim();
  if (!code) return '111';
  return code.padEnd(3, '1').slice(0, 3);
}

function hasSkinRankOverride(combo) {
  return /[23]/.test(normalizeComboSkinCode(combo));
}

export function getComboSkinRequirements(combo) {
  const code = normalizeComboSkinCode(combo);
  return (combo.heroes || []).map((hero, index) => ({
    hero,
    slot: index,
    code: code[index] || '1',
    requirement: SKIN_SLOT_REQUIREMENTS[code[index]] || 'none',
  }));
}

export function comboMeetsSkinRequirements(combo, ownsSkin) {
  if (!hasSkinRankOverride(combo)) return true;
  if (typeof ownsSkin !== 'function') return false;
  return getComboSkinRequirements(combo)
    .filter(item => item.requirement === 'must')
    .every(item => ownsSkin(item.hero));
}

export function filterCombosForSkinMode(combos, skinMode, ownsSkin) {
  return (combos || []).filter(combo => {
    if (!hasSkinRankOverride(combo)) return true;
    if (!skinMode) return false;
    return comboMeetsSkinRequirements(combo, ownsSkin);
  });
}

export const baseRankedCombos = filterCombosForSkinMode(rankedCombos, false);

export function selectNonOverlappingCombos(combos, ownedHeroes, limit = 5) {
  const ownedSet = ownedHeroes instanceof Set ? ownedHeroes : new Set(ownedHeroes);
  const usedHeroes = new Set();
  const eligible = (combos || []).filter(combo => combo?.heroes?.every(hero => ownedSet.has(hero)));
  const total = eligible.length;
  const selected = [];

  for (let i = 0; i < total; i++) {
    if (selected.length >= limit) break;

    const combo = eligible[i];
    if (combo.heroes.some(hero => usedHeroes.has(hero))) continue;

    selected.push({
      ...combo,
      displayScore: scoreComboByRank(i, total),
    });
    combo.heroes.forEach(hero => usedHeroes.add(hero));
  }

  return selected;
}
