// js/combos-db.js
// Rank is determined by position in this array. First item = Rank 1.
// Mapping order: [Front, Middle, Back]

/**
 * @typedef {Object} ComboEntry
 * @property {string[]} heroes - The three hero names in the combo ordered by [Front, Middle, Back].
 * @property {string=} skin - Optional skin requirement code per slot. 3=must, 2=recommended, 1=optional.
 * @property {string=} note - Optional free-text note explaining the combo.
 */

/**
 * High-tier combos database sorted by strategic meta-ranking.
 * The S0-X2 lanes are the shared ranking: every one is fieldable without an X8 hero,
 * and their order never changes. A lane that needs an X8 hero is either placed directly
 * above the S0-X2 lane it outranks (with the Combos Planner, npm run combos:plan) or left
 * in the X8 catch-up block at the end, ordered by its source score. The Combo Generator
 * only ranks lanes whose heroes a player owns, so X8 lanes change nothing for a player
 * without X8 heroes.
 * @type {ComboEntry[]}
 */
export const rankedCombos = [
  { heroes: ['Warden', 'Ramses II', 'Beowulf'], note: 'X8 catch-up lane, S tier (source score 328.7).' },
  // --- SKIN MODE RANK OVERRIDES ---
  // skin code slots: 3 = must own skin, 2 = recommended skin, 1 = optional skin.
  // Missing skin metadata behaves like 111, so the combo keeps its normal rank with or without skins.
  { heroes: ['Rozen Blade', 'Ramses II', 'Beowulf'], skin: '333', note: 'Top skin-mode lane. Rozen Blade, Ramses II and Beowulf skins all required.' },
  { heroes: ['Rozen Blade', 'Ramses II', 'Beowulf'], skin: '323', note: 'Rozen Blade and Beowulf skins are required; Ramses II is recommended.' },
  { heroes: ['Theodora', 'Warhammer', 'Alexander'], note: 'X8 catch-up lane, A tier (source score 282.1).' },
  { heroes: ['Cyrus', 'Ragnar', 'Caesar'], note: 'X8 catch-up lane, A tier (source score 288.8).' },
  { heroes: ['Alexander', 'Ragnar', 'Theodora'], note: 'X8 catch-up lane, S tier (source score 340.6).' },
  { heroes: ['Alexander', 'Bleeding Steed', 'Warhammer'], note: 'X8 catch-up lane, C tier (source score 219.5).' },
  { heroes: ['Alexander', 'Bleeding Steed', 'Theodora'], skin: '122' },
  { heroes: ['Alexander', 'Theodora', 'Bjorn'], note: 'X8 catch-up lane, B tier (source score 251.2).' },
  { heroes: ['Alexander', 'Warhammer', 'Cleopatra VII'], note: 'X8 catch-up lane, C tier (source score 210.5).' },
  { heroes: ['Alexander', 'Cleopatra VII', 'Theodora'], skin: '122' },
  { heroes: ['King Arthur', 'Theodora', 'Alexander'] , skin: '121'},
  { heroes: ['Beowulf', 'Ramses II', 'Theodora'], skin: '333', note: 'Highest observed S0-X1 sustain combo: Theodora skin required; Ramses II recommended; Beowulf optional.' },
  { heroes: ['King Arthur', 'Cleopatra VII', 'Theodora'], skin: '113', note: 'S0-X1 top combo when Theodora skin is owned. Arthur and Cleopatra skins are optional bonuses.' },
  
  { heroes: ['King Arthur', 'Cleopatra VII', 'Caesar'], skin: '222', note: 'S0-X1 top combo when Theodora skin is owned. Arthur and Cleopatra skins are optional bonuses.' },
  { heroes: ['Hunk', 'Warden', 'Beowulf'], note: 'X8 catch-up lane, B tier (source score 233.8).' },
  { heroes: ['Hunk', 'Ramses II', 'Beowulf'], skin: '221', note: 'Immortal Guardian skin is required. Ramses II is recommended; Beowulf is optional.' },
  { heroes: ['Immortal Guardian', 'Ramses II', 'Beowulf'], skin: '321', note: 'Immortal Guardian skin is required. Ramses II is recommended; Beowulf is optional.' },
  { heroes: ['King Arthur', 'Ragnar', 'Bleeding Steed'], note: 'X8 catch-up lane, C tier (source score 224.5).' },
  { heroes: ['Bleeding Steed', 'Warden', 'King Arthur'], note: 'X8 catch-up lane, B tier (source score 255.5).' },
  { heroes: ['Hunk', 'Warden', 'King Arthur'], note: 'X8 catch-up lane, B tier (source score 241.8).' },
  
  { heroes: ['King Arthur', 'Cleopatra VII', 'Bleeding Steed'], skin: '233', note: 'Requested 2333 skin lane mapped to the app three-slot skin code: Arthur recommended, Cleopatra and Bleeding Steed recommended.' },
  { heroes: ['Octavius', 'Rozen Blade', 'Caesar'], skin: '232', note: 'Rozen Blade skin is required. Octavius and Caesar skins are recommended.' },

  { heroes: ['Beowulf', 'Ramses II', 'Theodora'], note: 'Beowulf front-row skill spam triggers Theodora healing, producing a stable high-damage sustain combo.' },
  { heroes: ['King Arthur', 'Cleopatra VII', 'Alexander'] },
  { heroes: ['Liberator', 'Theodora', 'Alexander'], note: 'X8 catch-up lane, C tier (source score 202.4).' },
  { heroes: ['King Arthur', 'Bleeding Steed', 'Alexander'], skin: '222' },
  { heroes: ['Octavius', 'Warden', 'Caesar'], note: 'X8 catch-up lane, C tier (source score 174.1).' },
  { heroes: ['Boudica', 'Jade Eagle', 'Ramses II'], skin: '222' },
  { heroes: ['Hunk', 'Bleeding Steed', 'Alexander'], skin: '222' },
  { heroes: ['Hunk', 'Cleopatra VII', 'Alexander'], skin: '222' },
  { heroes: ['Alexander', 'Bleeding Steed', 'Theodora'] },
  { heroes: ['King Arthur', 'Skanda', 'Bleeding Steed'], note: 'X8 catch-up lane, C tier (source score 181.9).' },
  { heroes: ['Immortal Guardian', 'Ramses II', 'Beowulf'] },
  { heroes: ['Hunk', 'Ramses II', 'Beowulf'] },
  { heroes: ['Bleeding Steed', 'Ramses II', 'Beowulf'] },
  { heroes: ['Rozen Blade', 'Ramses II', 'Beowulf'] },
  { heroes: ['Ramses II', 'Leonidas', 'Beowulf'] },
  { heroes: ['Theodora', 'Ramses II', 'Jade Eagle'] },
  { heroes: ['King Arthur', 'Theodora', 'Warhammer'], note: 'X8 catch-up lane, B tier (source score 248.6).' },
  { heroes: ['King Arthur', 'Theodora', 'Bleeding Steed'] },
  { heroes: ['Cyrus', 'Cleopatra VII', 'Caesar'], note: 'X8 catch-up lane, A tier (source score 259.4).' },
  { heroes: ['Theodora', 'Cyrus', 'Lancelot'], note: 'X8 catch-up lane, A tier (source score 257.9).' },
  { heroes: ['Cyrus', 'Lancelot', 'Caesar'], note: 'X8 catch-up lane, A tier (source score 272).' },
  { heroes: ['Octavius', 'Ragnar', 'Caesar'], note: 'X8 catch-up lane, C tier (source score 201.9).' },
  { heroes: ['Theodora', 'Cyrus', 'Bjorn'], note: 'X8 catch-up lane, A tier (source score 265.2).' },
  { heroes: ['Octavius', 'Cleopatra VII', 'Caesar'] },
  { heroes: ['King Arthur', 'Bleeding Steed', 'Desert Storm'] },
  { heroes: ['Ramses II', 'Leonidas', 'Jade Eagle'] },
  { heroes: ['Theodora', 'Cyrus', 'Caesar'], note: 'X8 catch-up lane, A tier (source score 262.7).' },
  { heroes: ['Octavius', 'Theodora', 'Caesar'] },
  { heroes: ['Cleopatra VII', 'Warhammer', 'The Avalanche'], note: 'X8 catch-up lane, B tier (source score 249).' },
  { heroes: ['The Brave', 'Bjorn', 'Warhammer'], note: 'X8 catch-up lane, B tier (source score 239.8).' },
  { heroes: ['Lawman', 'Warhammer', 'The Avalanche'], note: 'X8 catch-up lane, A tier (source score 258.8).' },
  { heroes: ['Bjorn', 'Lancelot', 'Warhammer'], note: 'X8 catch-up lane, B tier (source score 227.6).' },
  { heroes: ['Theodora', 'Boudica', 'Jade Eagle'] },
  { heroes: ['Ramses II', 'Cleopatra VII', 'Jade Eagle'] },
  { heroes: ['Ragnar', 'Ramses II', 'Jade Eagle'], note: 'X8 catch-up lane, C tier (source score 221.9).' },
  { heroes: ['Bleeding Steed', 'Ramses II', 'Jade Eagle'] },
  { heroes: ['King Arthur', 'Cleopatra VII', 'Bleeding Steed'] },
  { heroes: ['King Arthur', 'Cleopatra VII', 'Theodora'] },
  { heroes: ['Bleeding Steed', 'Warhammer', 'The Avalanche'], note: 'X8 catch-up lane, B tier (source score 228.3).' },
  { heroes: ['Defender', 'Warden', 'Spectral Reaper'], note: 'X8 catch-up lane, C tier (source score 172.6).' },
  { heroes: ['Jeanne d\'Arc', 'Warhammer', 'The Avalanche'], note: 'X8 catch-up lane, C tier (source score 213.6).' },


  { heroes: ['Black Prince', "Jeanne d'Arc", 'The Avalanche'], skin: '232' },
  { heroes: ['Bjorn', 'Army Breaker', 'The Avalanche'], note: 'X8 catch-up lane, C tier (source score 221.9).' },
  { heroes: ['Lawman', 'Bjorn', 'Army Breaker'], note: 'X8 catch-up lane, C tier (source score 198.9).' },
  { heroes: ['Lawman', 'Army Breaker', 'The Avalanche'], skin: '222' },
  { heroes: ['The Brave', 'Bjorn', 'The Avalanche'], note: 'X8 catch-up lane, B tier (source score 247.2).' },
  { heroes: ['The Brave', 'Rozen Blade', 'The Avalanche'], skin: '222' },

  { heroes: ['The Brave', 'Rozen Blade', 'Immortal'], skin: '222' },
  { heroes: ['BeastQueen', 'Rozen Blade', 'Immortal'], skin: '333' },
  { heroes: ['Defender', 'Sakura', 'Jade Eagle'], skin: '222' },
  { heroes: ['Defender', 'Ramses II', 'Al Fatih'], skin: '222' },
  { heroes: ['Ashen Verdict', 'Sakura', 'Spectral Reaper'], note: 'X8 catch-up lane, C tier (source score 175.1).' },
  { heroes: ['Defender', 'Sakura', 'Spectral Reaper'], skin: '222' },
  { heroes: ['Hunk', 'Boudica', 'Sakura'], skin: '222' },
  { heroes: ['BeastQueen', 'Rozen Blade', 'Immortal'], skin: '222' },
  { heroes: ['King Arthur', 'Bleeding Steed', 'Warhammer'], note: 'X8 catch-up lane, C tier (source score 221.5).' },
  { heroes: ['King Arthur', 'Bleeding Steed', 'Jade Eagle'], skin: '222' },
  { heroes: ['Black Prince', "Jeanne d'Arc", 'Lionheart'], skin: '222' },
  { heroes: ['Warden', 'Spectral Reaper', 'Ramses II'], note: 'X8 catch-up lane, C tier (source score 212.6).' },

  { heroes: ['Hunk', 'Spectral Reaper', 'Ramses II'] },
  { heroes: ['Octavius', 'The Brave', 'Caesar'] },
  { heroes: ['Hunk', 'Warden', 'Spectral Reaper'], note: 'X8 catch-up lane, C tier (source score 181).' },
  { heroes: ['Warden', 'Spectral Reaper', 'Sakura'], note: 'X8 catch-up lane, C tier (source score 196.7).' },
  { heroes: ['Rozen Blade', 'Spectral Reaper', 'Sakura'] },
  { heroes: ['Lawman', 'War Lord', 'Jane'] },
  { heroes: ['Lawman', 'Rozen Blade', 'Immortal'] },
  { heroes: ['Defender', 'Tarantula', 'Sakura'] },
  { heroes: ['Sakura', 'Divine Arrow', 'Spectral Reaper'] },
  { heroes: ['Immortal Guardian', 'ELK', 'Tarantula'] },
  { heroes: ['Immortal Guardian', 'Charles the Great', 'Tarantula'] },
  { heroes: ['Warhammer', 'Lancelot', 'The Avalanche'], note: 'X8 catch-up lane, A tier (source score 257.1).' },
  { heroes: ['Black Prince', 'Lancelot', 'The Avalanche'] },
  { heroes: ['Lawman', 'Lancelot', 'Warhammer'], note: 'X8 catch-up lane, B tier (source score 234.9).' },
  { heroes: ['Lawman', 'Lancelot', 'The Avalanche'] },
  { heroes: ['War Lord', 'Warhammer', 'The Avalanche'], note: 'X8 catch-up lane, C tier (source score 187.3).' },
  { heroes: ['The Brave', 'Warhammer', 'The Avalanche'], note: 'X8 catch-up lane, B tier (source score 253.5).' },
  { heroes: ['Lawman', 'Army Breaker', 'The Avalanche'] },
  { heroes: ['War Lord', 'Bjorn', 'The Avalanche'], note: 'X8 catch-up lane, C tier (source score 177.5).' },
  { heroes: ['War Lord', 'Lawman', 'The Avalanche'] },
  { heroes: ['The Brave', 'Lawman', 'The Avalanche'] },
  { heroes: ['Lawman', 'The Brave', 'The Avalanche'] },
  { heroes: ['Lawman', 'Bjorn', 'The Avalanche'], note: 'X8 catch-up lane, B tier (source score 247.1).' },
  { heroes: ['Lawman', 'Rozen Blade', 'The Avalanche'] },
  { heroes: ['Lawman', 'Lionheart', 'The Avalanche'] },
  { heroes: ['The Brave', 'Bjorn', 'Army Breaker'], note: 'X8 catch-up lane, C tier (source score 201.3).' },
  { heroes: ['The Brave', 'Bjorn', 'Jane'], note: 'X8 catch-up lane, C tier (source score 184.6).' },
  { heroes: ['Liberator', 'Skanda', 'Alexander'], note: 'X8 catch-up lane, C tier (source score 170.9).' },
  { heroes: ['Liberator', 'Jade', 'Cao Cao'], note: 'X8 catch-up lane, C tier (source score 181.4).' },
  { heroes: ['Liberator', 'Skanda', 'Cao Cao'], note: 'X8 catch-up lane, C tier (source score 166.9).' },
  { heroes: ['Ragnar', 'Ramses II', 'Caesar'], note: 'X8 catch-up lane, C tier (source score 193.4).' },
  { heroes: ['Hunk', 'Scarlet Reaver', 'Valkyrie'], note: 'X8 catch-up lane, C tier (source score 157.6).' },
  { heroes: ['Skanda', 'Bleeding Steed', 'Valkyrie'], note: 'X8 catch-up lane, C tier (source score 171.6).' },
  { heroes: ['Eidolon', 'Warden', 'Ashen Verdict'], note: 'X8 catch-up lane, C tier (source score 224.6).' },
  { heroes: ['Warden', 'Jade Eagle', 'Spectral Reaper'], note: 'X8 catch-up lane, C tier (source score 211.4).' },
  { heroes: ['Sky Breaker', 'Warden', 'Jade Eagle'], note: 'X8 catch-up lane, C tier (source score 189.1).' },
  { heroes: ['Warden', 'Ashen Verdict', 'Spectral Reaper'], note: 'X8 catch-up lane, C tier (source score 188.6).' },
  { heroes: ['Immortal Guardian', 'Warden', 'Spectral Reaper'], note: 'X8 catch-up lane, C tier (source score 177.2).' },
  { heroes: ['Peace Bringer', 'Warden', 'Caesar'], note: 'X8 catch-up lane, C tier (source score 169.1).' },
  { heroes: ['Hunk', 'Warden', 'Rainforest Ranger'], note: 'X8 catch-up lane, C tier (source score 151.6).' },
  { heroes: ['Rozen Blade', 'Warden', 'Rainforest Ranger'], note: 'X8 catch-up lane, C tier (source score 151.4).' },
  { heroes: ['Liberator', 'Warden', 'Caesar'], note: 'X8 catch-up lane, C tier (source score 149.9).' },
  { heroes: ['Octavius', 'Warden', 'Rainforest Ranger'], note: 'X8 catch-up lane, C tier (source score 147.4).' },
  { heroes: ['Cyrus', 'Lancelot', 'Warhammer'], note: 'X8 catch-up lane, C tier (source score 221).' },
  { heroes: ['Lawman', 'Cleopatra VII', 'Warhammer'], note: 'X8 catch-up lane, C tier (source score 213.3).' },
  { heroes: ['Army Breaker', 'Alfred', 'Warhammer'], note: 'X8 catch-up lane, C tier (source score 208).' },
  { heroes: ['Wind-Walker', 'Warhammer', 'The Avalanche'], note: 'X8 catch-up lane, C tier (source score 202.4).' },
  { heroes: ['Lawman', 'Bleeding Steed', 'Warhammer'], note: 'X8 catch-up lane, C tier (source score 200.7).' },
  { heroes: ['Lawman', 'Alfred', 'Warhammer'], note: 'X8 catch-up lane, C tier (source score 194.3).' },
  { heroes: ['Lawman', 'Warhammer', 'Rainforest Ranger'], note: 'X8 catch-up lane, C tier (source score 181.3).' },
  { heroes: ['The Brave', 'Warhammer', 'Rainforest Ranger'], note: 'X8 catch-up lane, C tier (source score 170.1).' },
  { heroes: ['King Arthur', 'Warhammer', 'Skanda'], note: 'X8 catch-up lane, C tier (source score 149.4).' },
  { heroes: ['The Brave', 'Army Breaker', 'The Avalanche'] },
  { heroes: ['Black Prince', "Jeanne d'Arc", 'The Avalanche'] },
  { heroes: ['Theodora', 'Bleeding Steed', 'Warhammer'], note: 'X8 catch-up lane, B tier (source score 247.8).' },
  { heroes: ['Theodora', 'Bleeding Steed', 'Jade Eagle'] },
  { heroes: ['The Brave', 'Ramses II', 'Jade Eagle'] },
  { heroes: ['Ramses II', 'Charles the Great', 'Jade Eagle'] },
  { heroes: ['Octavius', 'Rozen Blade', 'Caesar'] },
  { heroes: ['Ramses II', 'Rozen Blade', 'Jade Eagle'] },
  { heroes: ['Alfred', 'Black Prince', "Jeanne d'Arc"], skin: '333', note: 'S0-S1 top combo when all three skins are owned.' },
  { heroes: ['Boudica', 'Ragnar', 'Jade Eagle'], note: 'X8 catch-up lane, C tier (source score 210.3).' },
  { heroes: ['Boudica', 'Sakura', 'Jade Eagle'] },
  { heroes: ['Hunk', 'Sakura', 'Jade Eagle'] },
  { heroes: ['Sakura', 'Ragnar', 'Jade Eagle'], note: 'X8 catch-up lane, C tier (source score 212.3).' },
  { heroes: ['Sakura', 'ELK', 'Jade Eagle'] },
  { heroes: ['Alfred', 'Cleopatra VII', 'Lionheart'] },
  { heroes: ['Hunk', 'Cleopatra VII', 'Alexander'] },
  { heroes: ['King Arthur', 'Bleeding Steed', 'Alexander'] },
  { heroes: ['The Brave', 'Rozen Blade', 'The Avalanche'] },
  { heroes: ['Bleeding Steed', 'Cleopatra VII', 'Alexander'] },
  { heroes: ['Black Prince', "Jeanne d'Arc", 'Lionheart'] },
  { heroes: ['Hunk', 'Bleeding Steed', 'Alexander'] },
  { heroes: ['Bleeding Steed', 'Cleopatra VII', 'Alexander'], skin: '222' },
  { heroes: ['The Brave', "Jeanne d'Arc", 'The Avalanche'], skin: '222' },
  { heroes: ['The Brave', 'Ramses II', 'Beowulf'], skin: '222' },
  { heroes: ['Black Prince', 'The Brave', 'Lionheart'], skin: '222' },
  { heroes: ['The Brave', 'Alfred', 'The Avalanche'], skin: '222' },
  { heroes: ['Boudica', 'Sakura', 'ELK'], skin: '222' },
  { heroes: ['Octavius', 'Black Prince', 'Lionheart'], skin: '222' },
  { heroes: ['Hunk', 'Boudica', 'Ramses II'], skin: '222' },
  { heroes: ["Jeanne d'Arc", 'Constantine the Great', 'Lionheart'], skin: '222' },
  { heroes: ['BeastQueen', 'Black Prince', 'Immortal'], skin: '222' },
  { heroes: ['War Lord', 'The Brave', 'The Avalanche'], skin: '222' },
  { heroes: ['The Brave', 'Black Prince', 'Immortal'], skin: '222' },
  { heroes: ['War Lord', "Jeanne d'Arc", 'The Avalanche'], skin: '222' },
  { heroes: ['Hunk', 'Warden', 'Caesar'], note: 'X8 catch-up lane, C tier (source score 188).' },
  { heroes: ['Hunk', 'Cleopatra VII', 'Caesar'], skin: '222' },
  { heroes: ['BeastQueen', 'Cleopatra VII', 'Immortal'], skin: '222' },
  { heroes: ['King Arthur', 'Cleopatra VII', 'Jade Eagle'], skin: '222' },
  { heroes: ['Sky Breaker', 'Boudica', 'Sakura'] },
  { heroes: ['King Arthur', 'Cicero', 'Fortuneteller'], note: 'X8 catch-up lane, C tier (source score 187).' },
  { heroes: ['King Arthur', 'Cicero', 'Bleeding Steed'] },
  { heroes: ['King Arthur', 'Bleeding Steed', 'Cao Cao'] },
  { heroes: ['Boudica', 'Cleopatra VII', 'Al Fatih'] },
  { heroes: ['Ramses II', 'Immortal Guardian', 'Witch Hunter'] },
  { heroes: ['Warden', 'Al Fatih', 'Ramses II'], note: 'X8 catch-up lane, C tier (source score 180.4).' },
  { heroes: ['Boudica', 'Al Fatih', 'Ramses II'] },
  { heroes: ['Ramses II', 'Al Fatih', 'Sakura'] },
  { heroes: ['Sky Breaker', 'Ramses II', 'Al Fatih'] },
  { heroes: ['Sky Breaker', 'Sakura', 'Ashen Verdict'], note: 'X8 catch-up lane, C tier (source score 183.6).' },
  { heroes: ['Eidolon', 'Ashen Verdict', 'Jade Eagle'], note: 'X8 catch-up lane, C tier (source score 222.6).' },
  { heroes: ['Wind-Walker', 'Rozen Blade', 'Immortal'] },
  { heroes: ['Hunk', 'Cleopatra VII', 'Cao Cao'] },
  { heroes: ['Hunk', 'Bleeding Steed', 'Cao Cao'] },
  { heroes: ['Alfred', 'Bleeding Steed', 'Cleopatra VII'] },
  { heroes: ['The Brave', 'Bleeding Steed', 'Jade Eagle'] },
  { heroes: ['Immortal Guardian', 'Sakura', 'Jade Eagle'] },
  { heroes: ['Charles the Great', 'Ramses II', 'Al Fatih'] },
  { heroes: ['Sky Breaker', 'Cleopatra VII', 'Al Fatih'] },
  { heroes: ['Boudica', 'Inquisitor', 'Witch Hunter'] },
  { heroes: ['Rozen Blade', 'Cleopatra VII', 'Immortal'] },
  { heroes: ['BeastQueen', 'Rozen Blade', 'Immortal'] },
  { heroes: ['Theodora', 'Che Liu', 'Cicero'] },
  { heroes: ['Hunk', 'Ramses II', 'Al Fatih'] },
  { heroes: ['Alfred', 'Black Prince', "Jeanne d'Arc"] },
  { heroes: ['Black Prince', "Jeanne d'Arc", 'Jane'] },
  { heroes: ['Alfred', "Jeanne d'Arc", 'Jane'] },
  { heroes: ['Alfred', 'Black Prince', 'Cleopatra VII'] },
  { heroes: ['Alfred', "Jeanne d'Arc", 'Lionheart'] },
  { heroes: ['Theodora', 'The Brave', 'Jade Eagle'] },
  { heroes: ['Immortal Guardian', 'Charles the Great', 'Jade Eagle'] },
  { heroes: ['Sky Breaker', 'Inquisitor', 'Sakura'] },
  { heroes: ['Sakura', 'Charles the Great', 'Al Fatih'] },
  { heroes: ['War Lord', 'Alfred', 'Lionheart'] },
  { heroes: ['Alfred', 'Black Prince', 'Lionheart'] },
  { heroes: ['Alfred', 'Cleopatra VII', 'Jane'] },
  { heroes: ['Sky Breaker', 'Inquisitor', 'Charles the Great'] },
  { heroes: ['Immortal Guardian', 'Bleeding Steed', 'Jade Eagle'] },
  { heroes: ['Octavius', 'BeastQueen', 'Immortal'] },
  { heroes: ['War Lord', 'Rozen Blade', 'Caesar'] },
  { heroes: ['Theodora', 'Inquisitor', 'Al Fatih'] },
  { heroes: ['Leonidas', 'Ramses II', 'Witch Hunter'] },
  { heroes: ['Leonidas', 'Ramses II', 'Inquisitor'] },
  { heroes: ['King Arthur', 'Desert Storm', 'Cao Cao'] },
  { heroes: ['Immortal Guardian', 'Divine Arrow', 'Jade Eagle'] },
  { heroes: ['Immortal Guardian', 'Charles the Great', 'Al Fatih'] },
  { heroes: ['Immortal Guardian', 'Divine Arrow', 'Al Fatih'] },
  { heroes: ['Immortal Guardian', 'Divine Arrow', 'Sky Breaker'] },
  { heroes: ['Che Liu', 'Cicero', 'Desert Storm'] },
  { heroes: ['Che Liu', 'Jade', 'Cicero'] },
  { heroes: ['War Lord', "Jeanne d'Arc", 'Jane'] },
  { heroes: ['Black Prince', 'Cleopatra VII', 'Bjorn'], note: 'X8 catch-up lane, C tier (source score 188.4).' },
  { heroes: ['Black Prince', 'Cleopatra VII', 'Jane'] },
  { heroes: ['Black Prince', 'Cleopatra VII', 'Lionheart'] },
  { heroes: ['War Lord', "Jeanne d'Arc", 'Lionheart'] },
  { heroes: ['War Lord', 'Alfred', 'Jane'] },
  { heroes: ['War Lord', 'Cleopatra VII', 'Lionheart'] },
  { heroes: ['War Lord', 'Cleopatra VII', 'Jane'] },
  { heroes: ['Bleeding Steed', 'Soaring Hawk', 'Desert Storm'] },
  { heroes: ['Bleeding Steed', 'Desert Storm', 'Cao Cao'] },
  { heroes: ['Sky Breaker', 'Inquisitor', 'Witch Hunter'] },
  { heroes: ['BeastQueen', 'Lionheart', 'Immortal'] },
  { heroes: ['BeastQueen', 'Isabella I', 'Immortal'] },
  { heroes: ['King Arthur', 'Soaring Hawk', 'Desert Storm'] },
  { heroes: ['Soaring Hawk', 'Desert Storm', 'Skanda'], note: 'X8 catch-up lane, C tier (source score 168.1).' },
  { heroes: ['Soaring Hawk', 'Desert Storm', 'Cao Cao'] },
  { heroes: ['Charles the Great', 'Inquisitor', 'Witch Hunter'] },
  { heroes: ['Charles the Great', 'Edward the Confessor', 'Al Fatih'] },
  { heroes: ['Peace Bringer', 'Che Liu', 'Jade'] },
  { heroes: ['Liberator', 'Bleeding Steed', 'Jade'], note: 'X8 catch-up lane, C tier (source score 173.1).' },
  { heroes: ['Peace Bringer', 'Bleeding Steed', 'Jade'] },
  { heroes: ['War Lord', "Jeanne d'Arc", 'Mary Tudor'] },
  { heroes: ['Alfred', "Jeanne d'Arc", 'Mary Tudor'] },
  { heroes: ['Edward the Confessor', 'Inquisitor', 'Witch Hunter'] },
  { heroes: ['Immortal Guardian', 'Leonidas', 'Jade Eagle'] },
  { heroes: ['Immortal Guardian', 'Isabella I', 'Jade Eagle'] },
  { heroes: ['Immortal Guardian', 'Divine Arrow', 'William the Conqueror'] },
  { heroes: ['Immortal Guardian', 'Leonidas', 'Divine Arrow'] },
  { heroes: ['Immortal Guardian', 'Isabella I', 'Divine Arrow'] },
  { heroes: ['Demon Spear', 'Soaring Hawk', 'Desert Storm'] },
  { heroes: ['Yukimura Sanada', 'Rokuboshuten', 'Jane'] },
  { heroes: ["North's Rage", 'Rokuboshuten', 'Jane'] },
  { heroes: ['War Lord', 'Warhammer', 'Jane'], note: 'X8 catch-up lane, C tier (source score 158.4).' },
  { heroes: ['War Lord', 'Black Prince', 'Jane'] },
  { heroes: ['Black Prince', 'Constantine the Great', 'Lionheart'] },
  { heroes: ['War Lord', 'Isabella I', 'Lionheart'] },
  { heroes: ['War Lord', 'Isabella I', 'Mary Tudor'] },
  { heroes: ['Demon Spear', 'Che Liu', 'Bleeding Steed'] },
  { heroes: ['Yukimura Sanada', 'Isabella I', 'Mary Tudor'] },
  { heroes: ["North's Rage", 'Isabella I', 'Mary Tudor'] },
  { heroes: ["North's Rage", 'Isabella I', 'Lionheart'] },
  { heroes: ['Yukimura Sanada', 'Isabella I', 'Lionheart'] },
  { heroes: ['War Lord', 'Rokuboshuten', 'Jane'] },
  { heroes: ['War Lord', 'Constantine the Great', 'Jane'] },
  { heroes: ['Alfred', 'Constantine the Great', 'Jane'] },
  { heroes: ['Edward the Confessor', 'Leonidas', 'Al Fatih'] },
  { heroes: ['Edward the Confessor', 'Isabella I', 'Al Fatih'] },
  { heroes: ['Edward the Confessor', 'Charles the Great', 'William the Conqueror'] },
  { heroes: ['Peace Bringer', 'Genghis Khan', 'The Heroine'] },
  { heroes: ["North's Rage", 'Yukimura Sanada', 'Isabella I'] },
  { heroes: ['Peace Bringer', 'Genghis Khan', 'Cao Cao'] },
  { heroes: ['Queen Anne', 'The Heroine', 'William the Conqueror'] },
  { heroes: ['Queen Anne', 'The Heroine', 'The Boneless'] },
  { heroes: ['Queen Anne', 'The Heroine', 'William Wallace'] },
  { heroes: ['Yukimura Sanada', 'The Heroine', 'William Wallace'] },
  { heroes: ["North's Rage", 'The Heroine', 'William Wallace'] },
  { heroes: ['Demon Spear', 'Jiguang Qi', 'Genghis Khan'] },
  { heroes: ['Demon Spear', 'Jiguang Qi', "North's Rage"] },
  { heroes: ['Demon Spear', 'Queen Anne', 'William Wallace'] },
  { heroes: ['Yukimura Sanada', 'William Wallace', "Heaven's Justice"] },
  { heroes: ["North's Rage", 'William Wallace', "Heaven's Justice"] },
  { heroes: ['Yukimura Sanada', 'The Heroine', "Heaven's Justice"] },
  { heroes: ["North's Rage", 'The Heroine', "Heaven's Justice"] },
  { heroes: ['Yukimura Sanada', 'Queen Anne', "Heaven's Justice"] },
  { heroes: ["North's Rage", 'Queen Anne', "Heaven's Justice"] },
  { heroes: ['Kublai', 'William Wallace', "Heaven's Justice"] },
  { heroes: ['William Wallace', 'Jiguang Qi', "Heaven's Justice"] },
  { heroes: ["North's Rage", 'The Boneless', 'The Heroine'] },
  { heroes: ["North's Rage", 'The Boneless', "Heaven's Justice"] },
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

// Only a "must own" slot (3) gates a lane out of normal mode. A "recommended" slot (2)
// says the skin makes the lane stronger, not that it is unplayable without it, so those
// lanes stay visible to everyone. Treating 2 as gating hid the 19 highest-ranked lanes
// from every player who was not in skin mode.
function hasSkinRankOverride(combo) {
  return /3/.test(normalizeComboSkinCode(combo));
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

// The list exactly as this file ships it. js/combos-live.js may swap a ranking the
// admin published into rankedCombos and baseRankedCombos in place, so every
// consumer that reads those arrays sees it; this copy is what it restores.
export const shippedRankedCombos = Object.freeze(rankedCombos.slice());

/** Replace the live ranking in place (and the normal-mode list derived from it). */
export function replaceRankedCombos(combos) {
  rankedCombos.splice(0, rankedCombos.length, ...combos);
  baseRankedCombos.splice(
    0,
    baseRankedCombos.length,
    ...filterCombosForSkinMode(rankedCombos, false)
  );
}

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

/**
 * Smart Generate: pick `limit` hero-disjoint combos that maximise the user's
 * total score instead of taking the greedily highest ones. Strong heroes go
 * where they lift the total most, which may mean no single 100-score combo.
 *
 * - mode 'top4' (Smart #1): show `limit` combos but maximise the total of the
 *   best `limit - 1` of them; the weakest combo is filler that only has to fit.
 * - mode 'top5' (Smart #2): maximise the total of all `limit` combos.
 *
 * Scores are the same rank scores the generator displays, so the greedy pick is
 * always a candidate and the result is never weaker than it. Returns the same
 * shape as selectNonOverlappingCombos, displayScore included.
 */
export function selectSmartCombos(combos, ownedHeroes, limit = 5, mode = 'top5') {
  const ownedSet = ownedHeroes instanceof Set ? ownedHeroes : new Set(ownedHeroes);
  const eligible = (combos || []).filter(combo => combo?.heroes?.every(hero => ownedSet.has(hero)));
  const total = eligible.length;
  const scored = eligible.map((combo, index) => ({
    combo,
    score: Number(scoreComboByRank(index, total)),
    displayScore: scoreComboByRank(index, total),
  }));
  scored.sort((left, right) => right.score - left.score);

  const dropWeakest = mode !== 'top5';
  const valueOf = list => {
    const sum = list.reduce((acc, entry) => acc + entry.score, 0);
    if (!dropWeakest || list.length < limit) return sum;
    return sum - Math.min(...list.map(entry => entry.score));
  };

  // Seed with the greedy pick: the search only ever replaces it with better.
  const greedy = [];
  const greedyUsed = new Set();
  for (const entry of scored) {
    if (greedy.length >= limit) break;
    if (entry.combo.heroes.some(hero => greedyUsed.has(hero))) continue;
    greedy.push(entry);
    entry.combo.heroes.forEach(hero => greedyUsed.add(hero));
  }
  let best = greedy;
  let bestValue = valueOf(greedy);

  const chosen = [];
  const used = new Set();
  let visits = 0;
  const walk = (start, sum) => {
    if (visits > 250_000) return;
    visits += 1;
    if (chosen.length === limit) {
      const value = valueOf(chosen);
      if (value > bestValue || (value === bestValue && chosen.length > best.length)) {
        bestValue = value;
        best = [...chosen];
      }
      return;
    }
    const room = limit - chosen.length;
    for (let index = start; index < scored.length; index += 1) {
      const entry = scored[index];
      // Rows are score-sorted: once the best possible fill cannot beat the
      // incumbent, no later row can either.
      if (sum + room * entry.score <= bestValue) break;
      if (entry.combo.heroes.some(hero => used.has(hero))) continue;
      chosen.push(entry);
      entry.combo.heroes.forEach(hero => used.add(hero));
      walk(index + 1, sum + entry.score);
      chosen.pop();
      entry.combo.heroes.forEach(hero => used.delete(hero));
    }
  };
  walk(0, 0);

  return best
    .map(entry => ({ ...entry.combo, displayScore: entry.displayScore }))
    .sort((left, right) => Number(right.displayScore) - Number(left.displayScore));
}
