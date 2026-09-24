// The re-theming surface. Everything in this file is presentation: colours,
// art, names and element identity. Swap the values here and the whole game
// re-skins without a single change in the simulation.
//
// Two rules keep this honest:
//   1. No new art bytes. The game reuses the hero skins, DM material icons and
//      stockpile troop icons the Arcade already ships (all under assets/), plus
//      procedural canvas textures built at runtime in engine/textures.js.
//   2. Colours come from the shared design tokens (css/_tokens.css) so the 3D
//      scene, the HUD and the rest of roc-vts.com are the same palette.

// ── Element identity ────────────────────────────────────────────────────────
// Ice and Fire are the two wings the Arcade already trained players on:
// dreamy-wing-left (ice) and blazing-wing-right (fire). Keeping the pair means
// the combo vocabulary carries over from the boot mini-games unchanged.
export const ELEMENTS = {
  ice: {
    labelKey: 'elementIce',
    color: 0x7dd3fc,
    cssVar: '--ff-cyan',
    accent: 0xbfe9ff,
    // Ice chips less but locks enemies in place; the slow is the whole point.
    slowFactor: 0.45,
  },
  fire: {
    labelKey: 'elementFire',
    color: 0xfb923c,
    cssVar: '--ff-fire',
    accent: 0xf5c451,
    // Fire hits harder and keeps burning after the bolt lands.
    burn: true,
  },
};

// Enemy faction → art family. The stockpile icons ship in two colours, so the
// factions map onto them one-to-one. If gold stockpile art is ever added, ice
// could take blue and fire could take gold without touching anything else.
export const FACTIONS = {
  ice: { unitColor: 'blue', dropColor: 'blue', tint: 0x9ad8ff },
  fire: { unitColor: 'purple', dropColor: 'gold', tint: 0xf0a97a },
};

// ── Art the game borrows from the existing site ─────────────────────────────
const SKINS = '/assets/skins';
const STOCKPILE = '/assets/dm/materials/stockpile';
const MATERIALS = '/assets/dm/materials';

export const ASSETS = {
  logo: '/images/logo-120.webp',
  wingIce: '/images/boot/dreamy-wing-left.webp',
  wingFire: '/images/boot/blazing-wing-right.webp',
  unitIcon: (color, kind, tier) => `${STOCKPILE}/${color}/${kind}-${tier}.png`,
  materialIcon: (color, type) => `${MATERIALS}/${color}/${type}.png`,
  heroIcon: (file) => `${SKINS}/${file}`,
  // Pickup art by enemy tier: tier 1-4 drops its matching material grade.
  dropTypes: ['feather', 'coil', 'claw', 'ingot'],
};

// ── Hero roster ─────────────────────────────────────────────────────────────
// Same names and icons the boot games use, so a player recognises their pick.
// `element` decides the starting wing; `mods` are the only hero-specific
// numbers the simulation reads.
export const HEROES = [
  { file: 'sky-breaker-skin-icon.webp', name: 'Sky Breaker', element: 'fire', mods: { fireDamage: 1.18, speed: 1.03 } },
  { file: 'jade-eagle-dragon-icon.webp', name: 'Jade Eagle', element: 'fire', mods: { fireDamage: 1.1, attackCd: 0.94 } },
  { file: 'beastqueen-skin-icon.webp', name: 'Beast Queen', element: 'fire', mods: { burnDps: 1.3, speed: 1.04 } },
  { file: 'rozen-blade-legion-ii-icon.webp', name: 'Rozen Blade', element: 'ice', mods: { iceDamage: 1.18, attackCd: 0.95 } },
  { file: 'al-fatih-skin-icon.webp', name: 'Al-Fatih', element: 'ice', mods: { iceSlow: 1.25, maxHp: 1.12 } },
  { file: 'jade-rakshasa-skin-icon.webp', name: 'Jade Rakshasa', element: 'ice', mods: { iceDamage: 1.12, range: 1.1 } },
  { file: 'king-arthur-arthur-pendragon-icon.webp', name: 'Arthur', element: 'ice', mods: { novaCharge: 1.2, maxHp: 1.15 } },
  { file: 'lionheart-skin-icon.webp', name: 'Lionheart', element: 'fire', mods: { maxHp: 1.2, novaCharge: 1.15 } },
  { file: 'cleopatra-vii-legion-i-icon.webp', name: 'Cleopatra', element: 'ice', mods: { gold: 1.2, range: 1.05 } },
  { file: 'theodora-royal-icon.webp', name: 'Theodora', element: 'fire', mods: { gold: 1.15, burnDps: 1.2 } },
  { file: 'caesar-legion-iii-icon.webp', name: 'Caesar', element: 'fire', mods: { maxHp: 1.1, attackCd: 0.92 } },
  { file: 'ramses-ii-tass-legion-icon.webp', name: 'Ramses', element: 'ice', mods: { iceSlow: 1.18, maxHp: 1.08 } },
  { file: 'black-prince-skin-icon.webp', name: 'Black Prince', element: 'fire', mods: { fireDamage: 1.12, maxHp: 1.06 } },
  { file: 'jeanne-darc-idling-icon.webp', name: 'Jeanne', element: 'ice', mods: { novaCharge: 1.25, speed: 1.05 } },
  { file: 'immortal-skin-icon.webp', name: 'Immortal', element: 'ice', mods: { maxHp: 1.25 } },
  { file: 'alfred-idling-icon.webp', name: 'Alfred', element: 'fire', mods: { gold: 1.12, speed: 1.02 } },
  { file: 'mary-tudor-skin-icon.webp', name: 'Mary Tudor', element: 'ice', mods: { iceDamage: 1.1, gold: 1.08 } },
  { file: 'edward-the-confessor-skin-icon.webp', name: 'Edward', element: 'fire', mods: { burnDps: 1.25, range: 1.06 } },
  { file: 'beowulf-tass-legion-icon.webp', name: 'Beowulf', element: 'fire', mods: { fireDamage: 1.15 } },
  { file: 'charles-the-great-skin-icon.webp', name: 'Charles', element: 'ice', mods: { iceDamage: 1.15 } },
];

// ── Tower roster ────────────────────────────────────────────────────────────
// Named after the Specialisation trees players already plan around: a ranged
// line that controls, and a siege line that burns.
export const TOWER_ART = {
  frost: { body: 0x2f6f8f, trim: 0xbfe9ff, emissive: 0x7dd3fc, shape: 'spire' },
  ember: { body: 0x8a3f1d, trim: 0xf5c451, emissive: 0xfb923c, shape: 'ballista' },
};

export function elementOf(kind) {
  return kind === 'fire' ? ELEMENTS.fire : ELEMENTS.ice;
}

export function heroByIndex(index) {
  return HEROES[((index % HEROES.length) + HEROES.length) % HEROES.length];
}

export function heroByName(name) {
  return HEROES.find((hero) => hero.name === name) || HEROES[0];
}
