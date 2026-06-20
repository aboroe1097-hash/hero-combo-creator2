// js/hero-bonuses.js
// Manual rating adjustments for Hero Atlas rankings.
// Hero names must match heroes-data.js exactly.
// Values are added to the auto rating (positive or negative integers, clamped to 0–100).

export const heroBonusPoints = {
  'Sakura': 8,
  'Boudica': 6,
  'Hunk': 5,
  'King Arthur': 4,
  'Jade Eagle': 6,
  'Immortal Guardian': 11,
  'Cleopatra VII': 2,
  'Bleeding Steed': 3,
  'BeastQueen': 3,

  // X8 catch-up Atlas ordering until enough curated X8 combos exist.
  'Cyrus': 90,
  'Warhammer': 88,
  'Warden': 87,
  'Bjorn': 85,
  'Ragnar': 83,
  'Scarlet Reaver': 81,
  'Skanda': 80,
};
