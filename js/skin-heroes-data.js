// js/skin-heroes-data.js
// Generator-specific hero pool used when Skin Mode is enabled.
import { allHeroesData } from './heroes-data.js';
import { getSkinForHero, SKIN_TYPES } from './skins-db.js';

const SKIN_HERO_OVERRIDES = {
  // Replace skinImageUrl here when dedicated animated/cropped skin portraits are captured.
  'King Arthur': {}
};

export const skinHeroesData = allHeroesData.map(hero => {
  const skin = getSkinForHero(hero.name);
  const typeInfo = skin ? (SKIN_TYPES[skin.type] || SKIN_TYPES.Mythic) : null;
  const override = SKIN_HERO_OVERRIDES[hero.name] || {};

  return {
    ...hero,
    hasSkin: Boolean(skin),
    skinName: skin?.name || null,
    skinType: skin?.type || null,
    skinImageUrl: override.skinImageUrl || skin?.imageUrl || hero.imageUrl,
    skinSeason: override.skinSeason || hero.season,
    skinTypeColor: typeInfo?.color || null,
    skinTypeIcon: typeInfo?.icon || null
  };
});

export function getSkinHeroByName(name) {
  return skinHeroesData.find(hero => hero.name === name) || null;
}
