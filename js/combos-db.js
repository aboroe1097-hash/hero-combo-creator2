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
 * Heroes are limited to seasons up to X2; X8 heroes are deliberately excluded for now.
 * @type {ComboEntry[]}
 */
export const rankedCombos = [
  // --- SKIN MODE RANK OVERRIDES ---
  // skin code slots: 3 = must own skin, 2 = recommended skin, 1 = optional skin.
  // Missing skin metadata behaves like 111, so the combo keeps its normal rank with or without skins.
  { heroes: ['Alexander', 'Bleeding Steed', 'Theodora'], skin: '122' },
  { heroes: ['Alexander', 'Cleopatra VII', 'Theodora'], skin: '122' },
  { heroes: ['King Arthur', 'Theodora', 'Alexander'] , skin: '121'},
  { heroes: ['Rozen Blade', 'Ramses II', 'Beowulf'], skin: '323', note: 'Immortal Guardian skin is required. Ramses II is recommended; Beowulf is optional.' },
  { heroes: ['Beowulf', 'Ramses II', 'Theodora'], skin: '333', note: 'Highest observed S0-X1 sustain combo: Theodora skin is required, Ramses II skin is recommended, Beowulf skin is optional. No counter found yet.' },
  { heroes: ['King Arthur', 'Cleopatra VII', 'Theodora'], skin: '113', note: 'S0-X1 top combo when Theodora skin is owned. Arthur and Cleopatra skins are optional bonuses.' },
  
  { heroes: ['King Arthur', 'Cleopatra VII', 'Caesar'], skin: '222', note: 'S0-X1 top combo when Theodora skin is owned. Arthur and Cleopatra skins are optional bonuses.' },
  { heroes: ['Hunk', 'Ramses II', 'Beowulf'], skin: '221', note: 'Immortal Guardian skin is required. Ramses II is recommended; Beowulf is optional.' },
  { heroes: ['Immortal Guardian', 'Ramses II', 'Beowulf'], skin: '321', note: 'Immortal Guardian skin is required. Ramses II is recommended; Beowulf is optional.' },
  
  { heroes: ['King Arthur', 'Cleopatra VII', 'Bleeding Steed'], skin: '233', note: 'Requested 2333 skin lane mapped to the app three-slot skin code: Arthur recommended, Cleopatra and Bleeding Steed required.' },
  { heroes: ['Octavius', 'Rozen Blade', 'Caesar'], skin: '232', note: 'Rozen Blade skin is required. Octavius and Caesar skins are recommended.' },
  
  { heroes: ['Black Prince', "Jeanne d'Arc", 'The Avalanche'], skin: '232' },
  { heroes: ['Lawman', 'Army Breaker', 'The Avalanche'], skin: '222' },
  { heroes: ['The Brave', 'Rozen Blade', 'The Avalanche'], skin: '222' },
  { heroes: ['King Arthur', 'Bleeding Steed', 'Alexander'], skin: '222' },
  { heroes: ['Boudica', 'Jade Eagle', 'Ramses II'], skin: '222' },
  { heroes: ['Hunk', 'Bleeding Steed', 'Alexander'], skin: '222' },
  { heroes: ['Hunk', 'Cleopatra VII', 'Alexander'], skin: '222' },
  { heroes: ['The Brave', 'Rozen Blade', 'Immortal'], skin: '222' },
  { heroes: ['BeastQueen', 'Rozen Blade', 'Immortal'], skin: '333' },
  { heroes: ['Defender', 'Sakura', 'Jade Eagle'] },
  { heroes: ['Defender', 'Ramses II', 'Al Fatih'] },
  { heroes: ['Defender', 'Sakura', 'Spectral Reaper'] },
  { heroes: ['Hunk', 'Boudica', 'Sakura'] },
  { heroes: ['BeastQueen', 'Rozen Blade', 'Immortal'], skin: '222' },
  { heroes: ['King Arthur', 'Bleeding Steed', 'Jade Eagle'], skin: '222' },
  { heroes: ['Black Prince', "Jeanne d'Arc", 'Lionheart'], skin: '222' },
  { heroes: ['Beowulf', 'Ramses II', 'Theodora'], note: 'Beowulf front-row skill spam triggers Theodora healing, producing a stable high-damage sustain combo.' },
  { heroes: ['King Arthur', 'Cleopatra VII', 'Alexander'] },
  { heroes: ['Alexander', 'Bleeding Steed', 'Theodora'] },
  { heroes: ['Rozen Blade', 'Ramses II', 'Beowulf'], skin: '333', note: 'With all three skins this outranks the no-skin Immortal Guardian / Ramses II / Beowulf lane below.' },
  { heroes: ['Immortal Guardian', 'Ramses II', 'Beowulf'] },
  { heroes: ['Hunk', 'Ramses II', 'Beowulf'] },
  { heroes: ['Bleeding Steed', 'Ramses II', 'Beowulf'] },
  { heroes: ['Rozen Blade', 'Ramses II', 'Beowulf'] },
  { heroes: ['Ramses II', 'Leonidas', 'Beowulf'] },
  { heroes: ['Theodora', 'Ramses II', 'Jade Eagle'] },
  { heroes: ['King Arthur', 'Theodora', 'Bleeding Steed'] },
  { heroes: ['Octavius', 'Cleopatra VII', 'Caesar'] },
  { heroes: ['King Arthur', 'Bleeding Steed', 'Desert Storm'] },
  { heroes: ['Ramses II', 'Leonidas', 'Jade Eagle'] },
  { heroes: ['Octavius', 'Theodora', 'Caesar'] },
  { heroes: ['Theodora', 'Boudica', 'Jade Eagle'] },
  { heroes: ['Ramses II', 'Cleopatra VII', 'Jade Eagle'] },
  { heroes: ['Bleeding Steed', 'Ramses II', 'Jade Eagle'] },
  { heroes: ['King Arthur', 'Cleopatra VII', 'Bleeding Steed'] },
  { heroes: ['King Arthur', 'Cleopatra VII', 'Theodora'] },
  { heroes: ['Hunk', 'Spectral Reaper', 'Ramses II'] },
  { heroes: ['Octavius', 'The Brave', 'Caesar'] },
  { heroes: ['Rozen Blade', 'Spectral Reaper', 'Sakura'] },
  { heroes: ['Lawman', 'War Lord', 'Jane'] },
  { heroes: ['Lawman', 'Rozen Blade', 'Immortal'] },
  { heroes: ['Defender', 'Tarantula', 'Sakura'] },
  { heroes: ['Sakura', 'Divine Arrow', 'Spectral Reaper'] },
  { heroes: ['Immortal Guardian', 'ELK', 'Tarantula'] },
  { heroes: ['Immortal Guardian', 'Charles the Great', 'Tarantula'] },
  { heroes: ['Black Prince', 'Lancelot', 'The Avalanche'] },
  { heroes: ['Lawman', 'Lancelot', 'The Avalanche'] },
  { heroes: ['Lawman', 'Army Breaker', 'The Avalanche'] },
  { heroes: ['War Lord', 'Lawman', 'The Avalanche'] },
  { heroes: ['The Brave', 'Lawman', 'The Avalanche'] },
  { heroes: ['Lawman', 'The Brave', 'The Avalanche'] },
  { heroes: ['Lawman', 'Rozen Blade', 'The Avalanche'] },
  { heroes: ['Lawman', 'Lionheart', 'The Avalanche'] },
  { heroes: ['The Brave', 'Army Breaker', 'The Avalanche'] },
  { heroes: ['Black Prince', "Jeanne d'Arc", 'The Avalanche'] },
  { heroes: ['Theodora', 'Bleeding Steed', 'Jade Eagle'] },
  { heroes: ['The Brave', 'Ramses II', 'Jade Eagle'] },
  { heroes: ['Ramses II', 'Charles the Great', 'Jade Eagle'] },
  { heroes: ['Octavius', 'Rozen Blade', 'Caesar'] },
  { heroes: ['Ramses II', 'Rozen Blade', 'Jade Eagle'] },
  { heroes: ['Alfred', 'Black Prince', "Jeanne d'Arc"], skin: '333', note: 'S0-S1 top combo when all three skins are owned.' },
  { heroes: ['Boudica', 'Sakura', 'Jade Eagle'] },
  { heroes: ['Hunk', 'Sakura', 'Jade Eagle'] },
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
  { heroes: ['Hunk', 'Cleopatra VII', 'Caesar'], skin: '222' },
  { heroes: ['BeastQueen', 'Cleopatra VII', 'Immortal'], skin: '222' },
  { heroes: ['King Arthur', 'Cleopatra VII', 'Jade Eagle'], skin: '222' },
  { heroes: ['Sky Breaker', 'Boudica', 'Sakura'] },
  { heroes: ['King Arthur', 'Cicero', 'Bleeding Steed'] },
  { heroes: ['King Arthur', 'Bleeding Steed', 'Cao Cao'] },
  { heroes: ['Boudica', 'Cleopatra VII', 'Al Fatih'] },
  { heroes: ['Ramses II', 'Immortal Guardian', 'Witch Hunter'] },
  { heroes: ['Boudica', 'Al Fatih', 'Ramses II'] },
  { heroes: ['Ramses II', 'Al Fatih', 'Sakura'] },
  { heroes: ['Sky Breaker', 'Ramses II', 'Al Fatih'] },
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
  { heroes: ['Soaring Hawk', 'Desert Storm', 'Cao Cao'] },
  { heroes: ['Charles the Great', 'Inquisitor', 'Witch Hunter'] },
  { heroes: ['Charles the Great', 'Edward the Confessor', 'Al Fatih'] },
  { heroes: ['Peace Bringer', 'Che Liu', 'Jade'] },
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
