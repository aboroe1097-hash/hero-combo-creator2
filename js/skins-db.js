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
  "King Arthur": [
    {
      id: 'arthur_excalibur',
      name: 'Excalibur Awakened',
      type: 'Mythic',
      iconUrl: '',
      bioAttributes: { might: 15, resistance: 10, tacticalMight: 5, tacticalResistance: 5, hp: 8, damage: 12 },
      maxBioAttributes: { might: 40, resistance: 25, tacticalMight: 15, tacticalResistance: 15, hp: 20, damage: 30 },
      inheritingSkill: {
        replacesSlot: 5,
        name: 'Sacred Sword Mastery',
        description: 'Arthur wields Excalibur with divine authority, striking down foes with holy light.',
        levels: [
          { level: 1, desc: 'After normal attack, 30% chance to deal 600% Physical Damage to 1 random enemy.' },
          { level: 2, desc: 'Chance increased to 40%, damage increased to 750%.' },
          { level: 3, desc: '50% chance to deal 900% damage, 30% of damage heals self squad.' }
        ]
      },
      preservingSkill: {
        name: 'Sword of Promised Victory',
        description: 'Unleashes a massive wave of energy, dealing 1200% damage to all enemies and removing all buffs.'
      }
    }
  ],
  "Cleopatra VII": [
    {
      id: 'cleo_nile',
      name: 'Nile Empress',
      type: 'Legendary',
      iconUrl: '',
      bioAttributes: { might: 10, resistance: 8, tacticalMight: 12, tacticalResistance: 8, hp: 5, damage: 10 },
      maxBioAttributes: { might: 25, resistance: 20, tacticalMight: 35, tacticalResistance: 20, hp: 15, damage: 28 },
      inheritingSkill: {
        replacesSlot: 8,
        name: 'Serpent\'s Embrace',
        description: 'Cleopatra\'s mystic serpents coil around enemies, poisoning and weakening them.',
        levels: [
          { level: 1, desc: 'When casting skills, 35% chance to poison 2 random enemies for 150% damage over 2 turns.' },
          { level: 2, desc: 'Chance increased to 45%, damage increased to 200%.' },
          { level: 3, desc: '55% chance to poison 3 enemies, reduces their Might by 30% for 3 turns.' }
        ]
      },
      preservingSkill: {
        name: 'Royal Decree',
        description: 'All friendly squads gain 50% increased damage and immunity to control effects for 3 turns.'
      }
    },
    {
      id: 'cleo_golden',
      name: 'Golden Throne',
      type: 'Mythic',
      iconUrl: '',
      bioAttributes: { might: 18, resistance: 12, tacticalMight: 18, tacticalResistance: 12, hp: 10, damage: 15 },
      maxBioAttributes: { might: 45, resistance: 30, tacticalMight: 45, tacticalResistance: 30, hp: 25, damage: 38 },
      inheritingSkill: {
        replacesSlot: 2,
        name: 'Pharaoh\'s Wrath',
        description: 'Cleopatra commands the sands to swallow her enemies whole.',
        levels: [
          { level: 1, desc: 'At battle start, 40% chance to bury 1 random enemy, dealing 500% damage and stunning for 1 turn.' },
          { level: 2, desc: 'Chance increased to 50%, targets 2 enemies.' },
          { level: 3, desc: '60% chance to bury 2 enemies for 800% damage, stun lasts 2 turns.' }
        ]
      },
      preservingSkill: {
        name: 'Eternal Dynasty',
        description: 'All friendly squads revive with 30% HP when defeated for the first time, once per battle.'
      }
    }
  ],
  "Alexander": [
    {
      id: 'alex_conqueror',
      name: 'Conqueror of Worlds',
      type: 'Mythic',
      iconUrl: '',
      bioAttributes: { might: 20, resistance: 15, tacticalMight: 5, tacticalResistance: 5, hp: 12, damage: 18 },
      maxBioAttributes: { might: 50, resistance: 38, tacticalMight: 12, tacticalResistance: 12, hp: 30, damage: 45 },
      inheritingSkill: {
        replacesSlot: 5,
        name: 'Hegemon\'s Charge',
        description: 'Alexander leads a devastating cavalry charge that breaks enemy lines.',
        levels: [
          { level: 1, desc: 'After normal attack, 35% chance to charge 2 random enemies for 400% Physical Damage.' },
          { level: 2, desc: 'Chance increased to 45%, damage increased to 550%.' },
          { level: 3, desc: '55% chance to charge all enemies for 700% damage and reduce their defense by 50%.' }
        ]
      },
      preservingSkill: {
        name: 'Tactical Genius',
        description: 'All friendly squads gain 80% increased combat speed and 40% increased damage for 4 turns.'
      }
    },
    {
      id: 'alex_immortal',
      name: 'Immortal Emperor',
      type: 'Everlasting',
      iconUrl: '',
      bioAttributes: { might: 12, resistance: 18, tacticalMight: 8, tacticalResistance: 10, hp: 15, damage: 8 },
      maxBioAttributes: { might: 30, resistance: 45, tacticalMight: 20, tacticalResistance: 25, hp: 38, damage: 20 },
      inheritingSkill: {
        replacesSlot: 8,
        name: 'Undying Legion',
        description: 'Alexander\'s troops fight beyond death itself.',
        levels: [
          { level: 1, desc: 'When Alexander\'s squad takes fatal damage, 30% chance to survive with 20% HP once per battle.' },
          { level: 2, desc: 'Chance increased to 45%, survives with 35% HP.' },
          { level: 3, desc: '60% chance to survive with 50% HP, and all friendly squads recover 20% HP.' }
        ]
      },
      preservingSkill: {
        name: 'Eternal March',
        description: 'All friendly squads ignore 30% of enemy defense and gain 25% life-steal permanently.'
      }
    }
  ]
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
