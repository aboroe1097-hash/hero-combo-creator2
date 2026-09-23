// Dragon Master exports: equipment advancement costs and crafting routes.
// Source: js/material-planner-model.js (in-game "Advance Equipment" screen).

import { loadSiteModule } from '../lib/env.mjs';
import { bars, callout, formatNumber, kpis, section, table } from '../lib/layout.mjs';

// Mirrors NORMAL_MATERIALS in js/material-calculator.js, which cannot be imported
// here because it pulls in a stylesheet. Each entry maps a stockpile array index
// (1-4) to the material that occupies it for that troop set.
const SET_MATERIALS = Object.freeze({
  ranger: Object.freeze(['leather', 'cloth', 'rope', 'wood']),
  cavalry: Object.freeze(['coil', 'claw', 'feather', 'ingot']),
  dreadnaught: Object.freeze(['order', 'ebony', 'grindstone', 'iron']),
});

const SET_LABELS = Object.freeze({
  ranger: 'Ranger (archers)',
  cavalry: 'Steel Cavalry (cavalry)',
  dreadnaught: 'Dreadnaught (footmen)',
});

const RESOURCE_LABELS = Object.freeze({
  superDragonCore: 'Super Dragon Core',
  exoticCrystal: 'Exotic Crystal',
  dragonCrystal: 'Dragon Crystal',
  superDragonite: 'Super Dragonite',
  dragonite: 'Dragonite',
  gems: 'Gems',
});

const titleCase = (value) =>
  String(value || '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (char) => char.toUpperCase());

export async function dmEnhancement() {
  const dm = await loadSiteModule('js/material-planner-model.js');
  const resourceKeys = dm.DM_ENHANCE_RESOURCE_KEYS;
  const milestones = dm.DM_ENHANCE_LEVELS.map((level) => ({
    level,
    values: dm.DM_ENHANCE_MILESTONES[String(level)],
  }));

  const rows = milestones.map((entry) => [
    `+${entry.level}`,
    ...resourceKeys.map((key) => entry.values[key]),
  ]);

  return {
    filename: 'roc-dragon-master-enhancement.pdf',
    eyebrow: 'Dragon Master',
    title: 'Equipment advancement costs',
    subtitle:
      'Cumulative Dragon Master enhancement materials to advance a single piece of equipment from +0, as recorded from the in-game Advance Equipment screen.',
    meta: [
      { label: 'Milestones', value: String(milestones.length) },
      { label: 'Resources', value: String(resourceKeys.length) },
      { label: 'Six-piece total', value: '6× one piece' },
    ],
    sections: [
      kpis([
        ...resourceKeys.map((key) => ({
          label: `${RESOURCE_LABELS[key] || titleCase(key)} to +25`,
          value: milestones[milestones.length - 1].values[key],
        })),
        { label: 'Six pieces to +25', value: 6 },
      ]),
      callout({
        title: 'Only seven points on the curve are verified',
        body: `The source records ${milestones.length} milestones (${milestones
          .map((entry) => `+${entry.level}`)
          .join(
            ', '
          )}). Intermediate levels are floored to the last verified milestone rather than interpolated, so treat mid-level figures as a lower bound.`,
      }),
      section(
        'Cumulative cost per piece',
        bars({
          items: milestones.slice(1).map((entry) => ({
            label: `+${entry.level}`,
            value: entry.values.superDragonCore,
            display: `${formatNumber(entry.values.superDragonCore)} core`,
          })),
        })
      ),
      section(
        'Advancement table',
        table({
          columns: [
            { label: 'Target' },
            ...resourceKeys.map((key) => ({ label: RESOURCE_LABELS[key] || titleCase(key) })),
          ],
          rows,
          caption:
            'Values are cumulative from +0 for one piece. Multiply every figure by six for a full equipment set.',
        })
      ),
      section(
        'Full set (six pieces)',
        table({
          columns: [
            { label: 'Target' },
            ...resourceKeys.map((key) => ({ label: RESOURCE_LABELS[key] || titleCase(key) })),
          ],
          rows: milestones.map((entry) => [
            `+${entry.level}`,
            ...resourceKeys.map((key) => entry.values[key] * 6),
          ]),
          caption: 'Identical to the per-piece table multiplied by six.',
        })
      ),
    ],
  };
}

export async function dmCrafting() {
  const dm = await loadSiteModule('js/material-planner-model.js');
  const routes = Object.values(dm.DM_ROUTES);

  const routeRows = routes.map((route) => [
    titleCase(route.id),
    route.dmPieceResources.superDragonite,
    route.dmPieceResources.dragonite,
    route.dmPieceResources.gems,
    route.stages.map((stage) => `${stage.count}× ${titleCase(stage.tier)}`).join(', '),
  ]);

  const recipeRows = dm.DM_SLOT_IDS.map((slot) => [
    titleCase(slot),
    dm.DM_SLOT_RECIPES[slot].archers,
    dm.DM_SLOT_RECIPES[slot].footmen,
    dm.DM_SLOT_RECIPES[slot].cavalry,
  ]);

  // Each troop set uses its own material names, so the stockpile cannot share one
  // set of columns. One table per set keeps the headers truthful.
  const stockpileSections = Object.entries(dm.DM_MATERIAL_STOCKPILES).map(([setId, tiers]) => {
    const materials = SET_MATERIALS[setId] || [];
    const rows = Object.entries(tiers).map(([tier, values]) => [titleCase(tier), ...values]);
    return section(
      `${SET_LABELS[setId] || titleCase(setId)} materials per set`,
      table({
        columns: [
          { label: 'Tier', align: 'left' },
          ...materials.map((name) => ({ label: titleCase(name) })),
        ],
        rows,
        caption: `Material columns follow the in-game stockpile order for the ${setId} set.`,
      })
    );
  });

  return {
    filename: 'roc-dragon-master-crafting.pdf',
    eyebrow: 'Dragon Master',
    title: 'Equipment crafting routes and material costs',
    subtitle:
      'The three Dragon Master crafting routes, the normal-gear ladder each one consumes, per-slot recipes, and the ordinary materials each set demands.',
    meta: [
      { label: 'Routes', value: String(routes.length) },
      { label: 'Slots', value: String(dm.DM_SLOT_IDS.length) },
      { label: 'Tiers', value: String(dm.DM_TIER_IDS.length) },
    ],
    sections: [
      kpis(
        routes.map((route) => ({
          label: `${titleCase(route.id)} piece`,
          value: route.dmPieceResources.superDragonite,
          hint: 'Super Dragonite per piece',
        }))
      ),
      section(
        'Route cost per piece',
        table({
          columns: [
            { label: 'Route', align: 'left' },
            { label: 'Super Dragonite' },
            { label: 'Dragonite' },
            { label: 'Gems' },
            { label: 'Normal-gear ladder', align: 'left' },
          ],
          rows: routeRows,
          caption:
            'The ladder lists the ordinary equipment items consumed to build one Dragon Master piece on that route.',
        })
      ),
      callout({
        title: 'Route cost versus total material cost',
        body: 'The route cost above is the Dragon Master resource requirement. Ordinary gear consumed by the ladder is counted separately, at the per-item rates below.',
        tone: 'info',
      }),
      section(
        'Ordinary equipment cost',
        table({
          columns: [{ label: 'Normal gear tier', align: 'left' }, { label: 'Dragonite per item' }],
          rows: Object.entries(dm.DM_NORMAL_GEAR_DRAGONITE_PER_ITEM).map(([tier, value]) => [
            titleCase(tier),
            value,
          ]),
        })
      ),
      section(
        'Per-slot recipes',
        table({
          columns: [
            { label: 'Slot', align: 'left' },
            { label: 'Archers' },
            { label: 'Footmen' },
            { label: 'Cavalry' },
          ],
          rows: recipeRows,
          caption:
            'Number of Dragon Master pieces required per troop type for each slot. A full set is six slots.',
        })
      ),
      section(
        'Ordinary material stockpiles',
        `<p>Materials needed to complete one set at each tier. Material names and their order are taken from <code>NORMAL_MATERIALS</code> in js/material-calculator.js.</p>`
      ),
      ...stockpileSections,
      section(
        'Recommended unlock order',
        table({
          columns: [
            { label: 'Priority', align: 'left' },
            { label: 'Slot order', align: 'left' },
          ],
          rows: [
            ['Offensive', dm.DM_EQUIPMENT_PRIORITY.offensive.map(titleCase).join(' → ')],
            ['Defensive', dm.DM_EQUIPMENT_PRIORITY.defensive.map(titleCase).join(' → ')],
          ],
        }) +
          `<div class="note">Common presets: ${Object.entries(dm.DM_PRESETS)
            .map(([name, slots]) => `<b>${titleCase(name)}</b> ${slots.map(titleCase).join(', ')}`)
            .join(' · ')}</div>`
      ),
    ],
  };
}
