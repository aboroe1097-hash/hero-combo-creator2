// js/skins-db.js
// Hero biographical skins database

export const SKIN_TYPES = {
  Mythic: { label: 'Mythic', color: '#f59e0b', icon: '◆' },
  Legendary: { label: 'Legendary', color: '#a855f7', icon: '◇' },
  Everlasting: { label: 'Everlasting', color: '#06b6d4', icon: '○' }
};

export const HIDDEN_POWER_BONUSES = {
  2: { mightPct: 4, hpPct: 2, label: '4% Might, 2% HP' },
  3: { tacticalMightPct: 2, tacticalResistancePct: 2, label: '2% Tactical Might, 2% Tactical Resistance' }
};

export const heroSkins = {
  // TODO: Add real skin data here
};

export function getHeroSkins(heroName) {
  return heroSkins[heroName] || [];
}

export function hasSkin(heroName) {
  return !!heroSkins[heroName];
}

export function getSkinCount(heroName) {
  return (heroSkins[heroName] || []).length;
}

export function getHiddenPowerBonus(count) {
  return HIDDEN_POWER_BONUSES[count] || null;
}

export function getSkinIconHtml(skin, maximized = false) {
  const typeInfo = SKIN_TYPES[skin.type] || SKIN_TYPES.Mythic;
  const animClass = maximized ? 'skin-icon-animated' : '';
  return `<span class="skin-icon ${animClass}" style="color:${typeInfo.color};border-color:${typeInfo.color}" title="${skin.name} (${skin.type})">${typeInfo.icon}</span>`;
}
