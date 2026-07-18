// Public Specialization Tower planner emblems, packed into one local sprite to keep the Pages bundle compact.
export const SPECIALIZATION_PLANNER_SPRITE_URL = 'images/boh-team-emblems.webp';

const ASSET_KEYS = [
  'research/training-footman.webp',
  'research/training-archer.webp',
  'research/training-cavalry.webp',
  'research/encounter.webp',
  'research/callofglory.webp',
  'research/enhanced.webp',
  'research/siege.webp',
  'research/defensive.webp',
  'research/neat.webp',
  'legion-skills/footman-1-reserve-supply.webp',
  'legion-skills/footman-2-target-tactics.webp',
  'legion-skills/footman-3-cover-the-weak-point.webp',
  'legion-skills/footman-4-locate-the-weakness.webp',
  'legion-skills/footman-5-sharpened-blade.webp',
  'legion-skills/footman-6-accumulation.webp',
  'legion-skills/footman-7-impenetrable-formation.webp',
  'legion-skills/footman-8-shield-wall-resonance.webp',
  'legion-skills/archer-1-rapid-shots.webp',
  'legion-skills/archer-2-sniper-archer.webp',
  'legion-skills/archer-3-strong-resistance.webp',
  'legion-skills/archer-4-focused-attack.webp',
  'legion-skills/archer-5-timing-of-attack.webp',
  'legion-skills/archer-6-combo.webp',
  'legion-skills/archer-7-first-arrow-declaration.webp',
  'legion-skills/archer-8-purifying-arrows.webp',
  'legion-skills/cavalry-1-rescue-skills.webp',
  'legion-skills/cavalry-2-vanguard-s-suppression.webp',
  'legion-skills/cavalry-3-breakout.webp',
  'legion-skills/cavalry-4-charging-forward.webp',
  'legion-skills/cavalry-5-breakout.webp',
  'legion-skills/cavalry-6-null-heal.webp',
  'legion-skills/cavalry-7-bash-from-the-back.webp',
  'legion-skills/cavalry-8-headstarter.webp',
];

const SPRITE_COLUMNS = 8;
const SPRITE_ROWS = 5;

export const SPECIALIZATION_PLANNER_ASSETS = Object.freeze(
  Object.fromEntries(
    ASSET_KEYS.map((assetKey, index) => [
      assetKey,
      Object.freeze({
        src: SPECIALIZATION_PLANNER_SPRITE_URL,
        index,
        column: index % SPRITE_COLUMNS,
        row: Math.floor(index / SPRITE_COLUMNS),
        columns: SPRITE_COLUMNS,
        rows: SPRITE_ROWS,
      }),
    ])
  )
);
