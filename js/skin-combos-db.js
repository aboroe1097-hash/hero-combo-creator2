// js/skin-combos-db.js
// Ranked skin-focused combo recommendations.
// Hero order is [Front, Middle, Back].

export const SKIN_STATUS = {
  MAXED: 'maxed',
  BASE: 'base',
  NEXT_SEASON: 'next-season',
};

export const SKIN_STATUS_LABELS = {
  [SKIN_STATUS.MAXED]: '3-star max',
  [SKIN_STATUS.BASE]: 'Base / no skin listed',
  [SKIN_STATUS.NEXT_SEASON]: 'Skin opens X2',
};

export const skinMetaCombos = [
  {
    rank: 1,
    seasonRange: 'S1-X1',
    heroes: [
      { name: 'King Arthur', position: 'Front', skinStatus: SKIN_STATUS.MAXED },
      { name: 'Cleopatra VII', position: 'Middle', skinStatus: SKIN_STATUS.MAXED },
      { name: 'Theodora', position: 'Back', skinStatus: SKIN_STATUS.MAXED },
    ],
    note: 'All three skins maxed to 3 stars with the dynamic icon unlocked.',
  },
  {
    rank: 2,
    seasonRange: 'S1-X1',
    heroes: [
      { name: 'Immortal Guardian', position: 'Front', skinStatus: SKIN_STATUS.MAXED },
      { name: 'Ramses II', position: 'Middle', skinStatus: SKIN_STATUS.MAXED },
      {
        name: 'Beowulf',
        position: 'Back',
        skinStatus: SKIN_STATUS.NEXT_SEASON,
        note: 'X1 hero skin is treated as unavailable until X2.',
      },
    ],
    note: 'Use Beowulf as the hero in X1; his skin timing is delayed until the next season.',
  },
  {
    rank: 3,
    seasonRange: 'S1-X1',
    heroes: [
      { name: 'Octavius', position: 'Front', skinStatus: SKIN_STATUS.MAXED },
      { name: 'Rozen Blade', position: 'Middle', skinStatus: SKIN_STATUS.MAXED },
      { name: 'Caesar', position: 'Back', skinStatus: SKIN_STATUS.MAXED },
    ],
    note: 'All three skins maxed to 3 stars with the dynamic icon unlocked.',
  },
  {
    rank: 4,
    seasonRange: 'S1-X1',
    heroes: [
      { name: 'Bleeding Steed', position: 'Front', skinStatus: SKIN_STATUS.MAXED },
      { name: 'Boudica', position: 'Middle', skinStatus: SKIN_STATUS.BASE },
      { name: 'Jade Eagle', position: 'Back', skinStatus: SKIN_STATUS.MAXED },
    ],
    note: 'Bleeding Steed and Jade Eagle are the skin-max anchors; Boudica stays base here until her skin data is confirmed.',
  },
  {
    rank: 5,
    seasonRange: 'S1-X1',
    heroes: [
      { name: 'BeastQueen', position: 'Front', skinStatus: SKIN_STATUS.MAXED },
      { name: 'The Brave', position: 'Middle', skinStatus: SKIN_STATUS.MAXED },
      { name: 'Immortal', position: 'Back', skinStatus: SKIN_STATUS.MAXED },
    ],
    note: 'All three skins maxed to 3 stars with the dynamic icon unlocked.',
  },
];
