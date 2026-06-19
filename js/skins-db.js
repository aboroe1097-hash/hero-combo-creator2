// js/skins-db.js
// Hero biographical skins database.

export const SKIN_TYPES = {
  Mythic: { label: 'Mythic', color: '#f59e0b', icon: 'M' },
  Legendary: { label: 'Legendary', color: '#a855f7', icon: 'L' },
  Everlasting: { label: 'Everlasting', color: '#ef4444', icon: 'E' }
};

export const SKIN_STAR_STAGES = {
  1: {
    label: 'Star 1',
    title: 'Biography Attributes',
    unlock: 'Owned skin bonus'
  },
  2: {
    label: 'Star 2',
    title: 'Inheriting Skill',
    unlock: 'Skin advancement complete'
  },
  3: {
    label: 'Star 3',
    title: 'Preserving Skill',
    unlock: 'Preserving unlock items'
  }
};

export const heroHiddenPowers = {
  'King Arthur': {
    title: 'Biography: Hidden Power',
    capturedVariants: 1,
    totalVariants: 2,
    requirement: 'Own 2 Biography Skin variants',
    mechanic: 'Some heroes have more than one Biography Skin variant. Those variants share the same Biography Attributes and progress; owning more than one variant unlocks Hidden Power.',
    scalingNote: 'More unlocked Biography Skin variants can add stronger Hidden Power when a hero has additional variants.',
    tiers: [
      {
        collected: 2,
        name: 'Solid Shield',
        effect: "The hero's squad gains 4% HP and takes 2% less damage.",
        stats: [
          { label: 'Army HP', value: '+4%' },
          { label: 'Damage taken', value: '-2%' }
        ]
      }
    ]
  }
};

export const heroSkins = {
  'King Arthur': [
    {
      id: 'king-arthur-arthur-pendragon',
      name: 'Arthur Pendragon',
      title: 'The Once and Future King',
      fullName: 'Arthur Pendragon the Once and Future King',
      type: 'Everlasting',
      rarity: 'Royal Exclusive',
      combatStyle: 'Melee',
      troopType: 'Footmen',
      maxStars: 3,
      defaultUnlockedStar: 1,
      starStages: [
        {
          star: 1,
          title: 'Biography',
          detail: 'Skin ownership grants the biography attributes by default.'
        },
        {
          star: 2,
          title: 'Inheriting',
          detail: 'Skin advancement unlocks the upgraded hero skill.'
        },
        {
          star: 3,
          title: 'Preserving',
          detail: 'Special preserving unlock items add the preserving skill and moving icon.'
        }
      ],
      iconBehavior: {
        star2: 'Unique icon becomes available with the inheriting skill.',
        star3: 'The same unique icon moves slightly in place after the preserving skill is unlocked.'
      },
      bioAttributes: {
        might: 10,
        resistance: 20,
        tacticalMight: 6,
        tacticalResistance: 18,
        hp: 18,
        damage: 3
      },
      maxBioAttributes: {
        might: 10,
        resistance: 20,
        tacticalMight: 6,
        tacticalResistance: 18,
        hp: 18,
        damage: 3
      },
      biographyAttributes: {
        unlockStar: 1,
        effectiveOn: "The Hero's squad",
        attributes: [
          { label: 'Army Might', value: '+10%' },
          { label: 'Army Defense', value: '+20%' },
          { label: 'Tactical Might', value: '+6%' },
          { label: 'Tactical Resistance', value: '+18%' },
          { label: 'Army HP', value: '+18%' },
          { label: 'Troop Damage', value: '+3%' }
        ],
        status: 'All Biography Attributes activated'
      },
      inheritingSkill: {
        unlockStar: 2,
        replacesSlot: 2,
        fromSkill: 'Wheel of Fortune',
        name: 'Eternity',
        maxLevel: 10,
        type: 'Status Skill',
        effectiveRange: 0,
        worksOn: 'Footmen',
        target: '1 random friendly squad within effective range',
        influencedBy: 'Resistance',
        description: 'Damage taken by the hero is reduced by 80% at the start of battle. Each time the hero takes damage, the mitigation is reduced by 8% (reduced by 4% each time for the first 3 rounds), while Resistance increases by 20% and Damage dealt increases by 10%, stackable up to 20 layers, until battle ends.',
        status: 'Skill activated',
        levels: [
          {
            level: 2,
            desc: 'Replaces Wheel of Fortune with Eternity when the skin reaches Star 2.'
          },
          {
            level: 10,
            desc: 'Captured screenshot shows Eternity at Lv.10 and max level reached.'
          }
        ]
      },
      preservingSkill: {
        unlockStar: 3,
        name: 'Defend',
        type: 'Pre-Battle Skill',
        effectiveRange: 2,
        target: '3 random friendly squads within effective range',
        description: "The Hero's squad takes -10% Skill Damage; the Hero's Legion gains 13% Resistance.",
        dynamicIcon: true,
        dynamicIconNote: 'Star 3 uses the same unique icon with a small in-place movement.'
      }
    }
  ]
};

export function getHeroSkins(heroName) {
  return heroSkins[heroName] || [];
}

export function getSkinForHero(heroName) {
  return getHeroSkins(heroName)[0] || null;
}

export function hasSkin(heroName) {
  return !!heroSkins[heroName];
}

export function getSkinCount(heroName) {
  return (heroSkins[heroName] || []).length;
}

export function getHeroHiddenPower(heroName) {
  return heroHiddenPowers[heroName] || null;
}

export function getSkinTypeColor(heroName) {
  const skin = getSkinForHero(heroName);
  if (!skin) return null;
  return (SKIN_TYPES[skin.type] || SKIN_TYPES.Mythic).color;
}

export function getSkinIconHtml(skin, maximized = false) {
  const typeInfo = SKIN_TYPES[skin.type] || SKIN_TYPES.Mythic;
  const animClass = maximized ? 'skin-icon-animated' : '';
  return `<span class="skin-icon ${animClass}" style="color:${typeInfo.color};border-color:${typeInfo.color}" title="${skin.name} (${skin.type})">${typeInfo.icon}</span>`;
}
