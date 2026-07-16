import { heroHiddenPowers, heroSkins, SKIN_STAR_STAGES, SKIN_TYPES } from '../../skins-db.js';
import { HERO_SKILL_HELP_STRINGS } from './help-content.js';

function addString(target, value) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text || !/[A-Za-z]/.test(text)) return;
  target.add(text);
}

export function collectHeroAtlasRequiredStrings() {
  const strings = new Set(HERO_SKILL_HELP_STRINGS);

  Object.values(SKIN_TYPES).forEach((type) => addString(strings, type.label));
  Object.values(SKIN_STAR_STAGES).forEach((stage) => {
    addString(strings, stage.label);
    addString(strings, stage.title);
    addString(strings, stage.unlock);
  });

  Object.values(heroHiddenPowers).forEach((hiddenPower) => {
    addString(strings, hiddenPower.title);
    addString(strings, hiddenPower.requirement);
    addString(strings, hiddenPower.mechanic);
    addString(strings, hiddenPower.scalingNote);
    hiddenPower.tiers?.forEach((tier) => {
      addString(strings, tier.name);
      addString(strings, tier.effect);
      tier.stats?.forEach((stat) => addString(strings, stat.label));
    });
  });

  Object.values(heroSkins)
    .flat()
    .forEach((skin) => {
      if (skin.fullName && skin.fullName !== skin.name) addString(strings, skin.fullName);
      addString(strings, skin.title);
      if (skin.rarity && skin.rarity !== skin.type) addString(strings, skin.rarity);
      addString(strings, skin.combatStyle);
      addString(strings, skin.troopType);
      addString(strings, skin.detailsStatus);
      skin.starStages?.forEach((stage) => {
        addString(strings, stage.title);
        addString(strings, stage.detail);
      });
      addString(strings, skin.iconBehavior?.star2);
      addString(strings, skin.iconBehavior?.star3);
      addString(strings, skin.biographyAttributes?.effectiveOn);
      addString(strings, skin.biographyAttributes?.status);
      skin.biographyAttributes?.attributes?.forEach((attribute) => {
        addString(strings, attribute.label);
        addString(strings, attribute.value);
      });

      const inheriting = skin.inheritingSkill;
      addString(strings, inheriting?.fromSkill);
      addString(strings, inheriting?.name);
      addString(strings, inheriting?.type);
      addString(strings, inheriting?.worksOn);
      addString(strings, inheriting?.target);
      addString(strings, inheriting?.influencedBy);
      addString(strings, inheriting?.description);
      addString(strings, inheriting?.status);
      inheriting?.levels?.forEach((level) => addString(strings, level.desc));

      const preserving = skin.preservingSkill;
      addString(strings, preserving?.name);
      addString(strings, preserving?.type);
      addString(strings, preserving?.target);
      addString(strings, preserving?.description);
      addString(strings, preserving?.dynamicIconNote);
    });

  return Object.freeze([...strings].sort((a, b) => a.localeCompare(b)));
}

export const HERO_ATLAS_REQUIRED_STRINGS = collectHeroAtlasRequiredStrings();
