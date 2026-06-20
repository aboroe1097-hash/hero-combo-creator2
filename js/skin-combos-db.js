// js/skin-combos-db.js
// Ranked skin-focused combo recommendations.
// Hero order is [Front, Middle, Back].

export const SKIN_STATUS = {
  MAXED: 'maxed',
  BASE: 'base',
  NEXT_SEASON: 'next-season',
};

export const HERO_VARIANT = {
  BASE: 'base',
  SKIN: 'skin',
};

export const SKIN_STATUS_LABEL_KEYS = {
  [SKIN_STATUS.MAXED]: 'skinStatusMaxed',
  [SKIN_STATUS.BASE]: 'skinStatusBase',
  [SKIN_STATUS.NEXT_SEASON]: 'skinStatusNextSeason',
};

export function baseHero(name, position, options = {}) {
  return {
    name,
    position,
    variant: HERO_VARIANT.BASE,
    skinStatus: SKIN_STATUS.BASE,
    ...options,
  };
}

export function skinHero(name, position, options = {}) {
  return {
    name,
    position,
    variant: HERO_VARIANT.SKIN,
    skinStatus: SKIN_STATUS.MAXED,
    skinId: options.skinId || null,
    skinStars: options.skinStars ?? 3,
    ...options,
  };
}

export function getSkinComboHeroKey(hero) {
  if (!hero || !hero.name) return '';
  if (hero.variant === HERO_VARIANT.SKIN) {
    return `${hero.name}::skin:${hero.skinId || 'default'}:${hero.skinStars || 'any'}`;
  }
  return `${hero.name}::base`;
}

export const skinMetaCombos = [
  {
    rank: 1,
    seasonRange: 'S1-X1',
    heroes: [
      skinHero('King Arthur', 'Front', { skinId: 'king-arthur-arthur-pendragon' }),
      skinHero('Cleopatra VII', 'Middle', { skinId: 'cleopatra-vii-legion-i' }),
      skinHero('Theodora', 'Back', { skinId: 'theodora-royal' }),
    ],
    noteKey: 'skinMetaCombo1Note',
  },
  {
    rank: 2,
    seasonRange: 'S1-X1',
    heroes: [
      skinHero('Immortal Guardian', 'Front', { skinId: 'immortal-guardian-tass-legion' }),
      skinHero('Ramses II', 'Middle', { skinId: 'ramses-ii-tass-legion' }),
      skinHero('Beowulf', 'Back', { skinId: 'beowulf-tass-legion' }),
    ],
    noteKey: 'skinMetaCombo2Note',
  },
  {
    rank: 3,
    seasonRange: 'S1-X1',
    heroes: [
      skinHero('Octavius', 'Front', { skinId: 'octavius-legion-ii' }),
      skinHero('Rozen Blade', 'Middle', { skinId: 'rozen-blade-legion-ii' }),
      skinHero('Caesar', 'Back', { skinId: 'caesar-legion-iii' }),
    ],
    noteKey: 'skinMetaCombo3Note',
  },
  {
    rank: 4,
    seasonRange: 'S1-X1',
    heroes: [
      skinHero('Bleeding Steed', 'Front', { skinId: 'bleeding-steed-legion-iii' }),
      baseHero('Boudica', 'Middle'),
      skinHero('Jade Eagle', 'Back', { skinId: 'jade-eagle-legion-iii' }),
    ],
    noteKey: 'skinMetaCombo4Note',
  },
  {
    rank: 5,
    seasonRange: 'S1-X1',
    heroes: [
      skinHero('BeastQueen', 'Front'),
      skinHero('The Brave', 'Middle'),
      skinHero('Immortal', 'Back'),
    ],
    noteKey: 'skinMetaCombo5Note',
  },
];
