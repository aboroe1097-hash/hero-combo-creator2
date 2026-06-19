// js/skin-combos-db.js
// Ranked skin-focused combo recommendations.
// Hero order is [Front, Middle, Back].

export const SKIN_STATUS = {
  MAXED: 'maxed',
  BASE: 'base',
  NEXT_SEASON: 'next-season',
};

export const SKIN_STATUS_LABEL_KEYS = {
  [SKIN_STATUS.MAXED]: 'skinStatusMaxed',
  [SKIN_STATUS.BASE]: 'skinStatusBase',
  [SKIN_STATUS.NEXT_SEASON]: 'skinStatusNextSeason',
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
    noteKey: 'skinMetaCombo1Note',
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
        noteKey: 'skinMetaBeowulfTimingNote',
      },
    ],
    noteKey: 'skinMetaCombo2Note',
  },
  {
    rank: 3,
    seasonRange: 'S1-X1',
    heroes: [
      { name: 'Octavius', position: 'Front', skinStatus: SKIN_STATUS.MAXED },
      { name: 'Rozen Blade', position: 'Middle', skinStatus: SKIN_STATUS.MAXED },
      { name: 'Caesar', position: 'Back', skinStatus: SKIN_STATUS.MAXED },
    ],
    noteKey: 'skinMetaCombo3Note',
  },
  {
    rank: 4,
    seasonRange: 'S1-X1',
    heroes: [
      { name: 'Bleeding Steed', position: 'Front', skinStatus: SKIN_STATUS.MAXED },
      { name: 'Boudica', position: 'Middle', skinStatus: SKIN_STATUS.BASE },
      { name: 'Jade Eagle', position: 'Back', skinStatus: SKIN_STATUS.MAXED },
    ],
    noteKey: 'skinMetaCombo4Note',
  },
  {
    rank: 5,
    seasonRange: 'S1-X1',
    heroes: [
      { name: 'BeastQueen', position: 'Front', skinStatus: SKIN_STATUS.MAXED },
      { name: 'The Brave', position: 'Middle', skinStatus: SKIN_STATUS.MAXED },
      { name: 'Immortal', position: 'Back', skinStatus: SKIN_STATUS.MAXED },
    ],
    noteKey: 'skinMetaCombo5Note',
  },
];
