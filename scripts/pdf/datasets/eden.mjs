// Eden exports: honor building costs, specialty Honor levels, siege structures,
// tile levels. Source: js/eden-operations-data.js (community sheets, l96.app).

import { loadSiteModule } from '../lib/env.mjs';
import { bars, callout, escapeHtml, formatNumber, kpis, section, table } from '../lib/layout.mjs';

const BUILDING_LABELS = Object.freeze({
  workshop: 'Workshop',
  fortress: 'Fortress',
  ac1: 'Assault Camp I',
  ac2: 'Assault Camp II',
  ac3: 'Assault Camp III',
  ac4: 'Assault Camp IV',
});

const ROUTE_LABELS = Object.freeze({
  green: 'Green · economy',
  blue: 'Blue · military',
  red: 'Red · siege',
});

function buildingColumns(keys) {
  return [
    { label: 'Level', align: 'left' },
    ...keys.map((key) => ({ label: BUILDING_LABELS[key] || key })),
  ];
}

export async function edenHonorBuildings() {
  const ops = await loadSiteModule('js/eden-operations-data.js');
  const costs = ops.BUILDING_UPGRADE_COSTS;
  const discounts = ops.BUILDING_DISCOUNTS;
  const keys = Object.keys(BUILDING_LABELS).filter((key) => Array.isArray(costs[key]));
  const levelCount = Math.max(...keys.map((key) => costs[key].length));

  const levelRows = [];
  for (let level = 1; level <= levelCount; level += 1) {
    levelRows.push([`Level ${level}`, ...keys.map((key) => costs[key][level - 1] ?? null)]);
  }
  const totals = keys.map((key) => costs[key].reduce((sum, value) => sum + (value || 0), 0));

  const discountRows = keys.map((key, index) => [
    BUILDING_LABELS[key],
    totals[index],
    ...discounts.map((discount) => Math.ceil(totals[index] * (1 - discount.rate))),
  ]);

  const missingYields = Object.values(ops.BUILDING_HONOR_YIELDS || {}).every(
    (value) => value === null || value === undefined
  );

  return {
    filename: 'roc-eden-honor-building-costs.pdf',
    eyebrow: 'Eden',
    title: 'Honor building upgrade costs',
    subtitle:
      'Cumulative material cost to raise each Eden Honor building from level 1 to level 20, with the alliance and specialty discount tiers applied.',
    meta: [
      { label: 'Buildings', value: String(keys.length) },
      { label: 'Levels', value: String(levelCount) },
      { label: 'Discount tiers', value: String(discounts.length) },
    ],
    sections: [
      kpis([
        { label: 'Workshop total', value: totals[keys.indexOf('workshop')] },
        { label: 'Fortress total', value: totals[keys.indexOf('fortress')] },
        {
          label: 'All six, no discount',
          value: totals.reduce((sum, value) => sum + value, 0),
        },
        {
          label: 'All six, 56% off',
          value: Math.ceil(totals.reduce((sum, value) => sum + value, 0) * (1 - 0.56)),
        },
      ]),
      section(
        'Total cost per building',
        bars({
          items: keys.map((key, index) => ({
            label: BUILDING_LABELS[key],
            value: totals[index],
          })),
        })
      ),
      section(
        'Cost to reach each level',
        table({
          columns: buildingColumns(keys),
          rows: levelRows,
          footer: ['Total', ...totals],
          caption:
            'Level 1 is the starting level and costs nothing. Figures are the material cost of the upgrade that reaches the listed level.',
        })
      ),
      section(
        'What each discount tier actually saves',
        table({
          columns: [
            { label: 'Building', align: 'left' },
            { label: 'No discount' },
            ...discounts.slice(1).map((discount) => ({ label: discount.label })),
          ],
          rows: discountRows,
          caption: 'Discounts are applied to the full level 1 to 20 total and rounded up.',
        })
      ),
      missingYields
        ? callout({
            title: 'Honor yields are not published here',
            body: 'The source sheets record material costs, not the Honor each upgrade awards, so no Honor-per-level column is shown. Treat any Honor-per-cost ranking as unverified.',
          })
        : '',
      section(
        'Known gaps in this data',
        `<ul>${ops.SPECIALTY_DATA_GAPS.map((gap) => `<li>${escapeHtml(gap)}</li>`).join('')}</ul>`
      ),
    ],
  };
}

export async function edenSpecialtyHonor() {
  const ops = await loadSiteModule('js/eden-operations-data.js');
  const levels = ops.SPECIALTY_HONOR_LEVELS;
  const missing = levels.filter((row) => row.honor === null || row.honor === undefined);
  const last = levels[levels.length - 1];

  const levelRows = levels.map((row) => [
    `Level ${row.level}`,
    row.honor === null || row.honor === undefined ? null : row.honor,
    row.cumulative === null || row.cumulative === undefined ? null : row.cumulative,
  ]);

  const routeRows = [];
  Object.entries(ops.SPECIALTY_ROUTE_MILESTONES).forEach(([tone, routes]) => {
    routeRows.push({ __subgroup: ROUTE_LABELS[tone] || tone });
    routes.forEach((route) => {
      routeRows.push([route.name, route.critical, route.essential, route.advanced, route.summary]);
    });
  });

  return {
    filename: 'roc-eden-specialty-honor.pdf',
    eyebrow: 'Eden',
    title: 'Specialty Honor levels and routes',
    subtitle:
      'Honor required per specialty level, the cumulative climb to level 143, and the point cost of every specialty route at its critical, essential and advanced breakpoints.',
    meta: [
      { label: 'Levels published', value: String(levels.length - missing.length) },
      { label: 'Levels missing', value: String(missing.length) },
      { label: 'Routes', value: String(routeRows.length - 3) },
    ],
    sections: [
      kpis([
        { label: 'Top level', value: last.level, hint: 'highest level in the chart' },
        { label: 'Cumulative to cap', value: last.cumulative },
        { label: 'Unpublished levels', value: missing.length, hint: 'see the note below' },
        { label: 'Preset builds', value: ops.SPECIALTY_PRESETS.length },
      ]),
      missing.length
        ? callout({
            title: `Levels ${missing[0].level} to ${missing[missing.length - 1].level} are not published`,
            body: `The supplied Honor chart omits these ${missing.length} levels, so their per-level and cumulative Honor is unknown. They are marked "not supplied" in the table rather than interpolated.`,
          })
        : '',
      section(
        'Cumulative Honor milestones',
        bars({
          items: levels
            .filter((row) => row.cumulative !== null && row.level % 10 === 0)
            .map((row) => ({ label: `Level ${row.level}`, value: row.cumulative })),
        })
      ),
      section(
        'Honor per level',
        table({
          columns: [
            { label: 'Level', align: 'left' },
            { label: 'Honor to reach' },
            { label: 'Cumulative Honor' },
          ],
          rows: levelRows,
          caption:
            'Cumulative figures marked as published-rounded in the source are reproduced as supplied.',
        })
      ),
      section(
        'Route breakpoints',
        table({
          columns: [
            { label: 'Route', align: 'left' },
            { label: 'Critical' },
            { label: 'Essential' },
            { label: 'Advanced' },
            { label: 'What it buys', align: 'left' },
          ],
          rows: routeRows,
          caption:
            'Point totals required to reach each breakpoint. An em dash means the source publishes no advanced breakpoint for that route.',
        })
      ),
      section(
        'Recommended preset builds',
        table({
          columns: [
            { label: 'Preset', align: 'left' },
            { label: 'Critical' },
            { label: 'Essential' },
            { label: 'Advanced' },
            { label: 'Route order', align: 'left' },
          ],
          rows: ops.SPECIALTY_PRESETS.map((preset) => [
            preset.name,
            preset.critical,
            preset.essential,
            preset.advanced,
            preset.routeOrder.join(' → '),
          ]),
        }) +
          `<div class="note">${ops.SPECIALTY_PRESETS.map(
            (preset) => `<p><b>${escapeHtml(preset.name)}:</b> ${escapeHtml(preset.summary)}</p>`
          ).join('')}</div>`
      ),
    ],
  };
}

export async function edenSiegeStructures() {
  const ops = await loadSiteModule('js/eden-operations-data.js');
  const structures = ops.EDEN_STRUCTURES;

  return {
    filename: 'roc-eden-siege-structures.pdf',
    eyebrow: 'Eden',
    title: 'Siege structures reference',
    subtitle:
      'Occupation limits, loyalty and durability, siege damage, and attacker and support capacities for every capturable Eden structure.',
    meta: [{ label: 'Structures', value: String(structures.length) }],
    sections: [
      kpis([
        { label: 'Structures', value: structures.length },
        {
          label: 'Highest durability',
          value: Math.max(...structures.map((s) => s.durability || 0)),
          hint: structures
            .filter((s) => s.durability === Math.max(...structures.map((x) => x.durability || 0)))
            .map((s) => s.id)
            .join(', '),
        },
        {
          label: 'Largest attacking force',
          value: Math.max(...structures.map((s) => s.attackers || 0)),
        },
      ]),
      section(
        'Loyalty and durability',
        bars({
          items: structures.slice(0, 13).map((s) => ({
            label: s.id,
            value: s.durability || 0,
          })),
        })
      ),
      section(
        'Full structure table',
        table({
          columns: [
            { label: 'Structure', align: 'left' },
            { label: 'Group', align: 'left' },
            { label: 'Lv' },
            { label: 'Occupation' },
            { label: 'Faction pts' },
            { label: 'Loyalty' },
            { label: 'Durability' },
            { label: 'Dmg loyalty' },
            { label: 'Dmg durability' },
            { label: 'Attackers' },
            { label: 'Support' },
            { label: 'Banner atk' },
            { label: 'Banner sup' },
          ],
          rows: structures.map((s) => [
            s.id,
            s.group,
            s.level,
            s.occupation,
            s.factionPoints,
            s.loyalty,
            s.durability,
            s.damageLoyalty,
            s.damageDurability,
            s.attackers,
            s.support,
            s.bannerAttackers,
            s.bannerSupport,
          ]),
          caption:
            'Faction points are awarded on occupation. Damage figures are the loyalty and durability removed by a successful siege hit.',
        })
      ),
    ],
  };
}

export async function edenTileLevels() {
  const ops = await loadSiteModule('js/eden-operations-data.js');
  const tiles = ops.TILE_LEVELS;
  const specialty = ops.BLUE_LOYALTY_SPECIALTY;

  return {
    filename: 'roc-eden-tile-levels.pdf',
    eyebrow: 'Eden',
    title: 'Tile levels and Blue Loyalty specialty',
    subtitle:
      'Loyalty, resistance, influence and Honor for every Eden tile level, plus the Blue specialty ranks that raise camp loyalty.',
    meta: [
      { label: 'Tile levels', value: String(tiles.length) },
      { label: 'Specialty ranks', value: String(specialty.length) },
    ],
    sections: [
      kpis([
        { label: 'Tile levels', value: tiles.length },
        {
          label: 'Top tile loyalty',
          value: Math.max(...tiles.map((t) => t.loyalty || 0)),
        },
        {
          label: 'Max extra camp loyalty',
          value: Math.max(...specialty.map((s) => s.extraLoyalty || 0)),
          hint: 'per Coalition Camp',
        },
      ]),
      section(
        'Influence by tile level',
        bars({
          items: tiles.map((tile) => ({ label: `Level ${tile.level}`, value: tile.influence })),
        })
      ),
      section(
        'Tile requirements and rewards',
        table({
          columns: [
            { label: 'Tile level', align: 'left' },
            { label: 'Loyalty' },
            { label: 'Resistance' },
            { label: 'Influence' },
            { label: 'Honor' },
          ],
          rows: tiles.map((tile) => [
            tile.level,
            tile.loyalty,
            tile.resistance,
            tile.influence,
            tile.honor,
          ]),
          caption:
            'Honor awarded is not linear with tile level; the source values are reproduced exactly.',
        })
      ),
      section(
        'Blue Loyalty specialty ranks',
        table({
          columns: [
            { label: 'Rank' },
            { label: 'Specialty points' },
            { label: 'Extra loyalty per camp' },
          ],
          rows: specialty.map((row) => [row.rank, row.specialtyPoints, row.extraLoyalty]),
          caption: `Extra loyalty is ${formatNumber(
            specialty[1] ? specialty[1].extraLoyalty : 60
          )} per rank beyond rank 1. Four Coalition Camps multiply the bonus by four.`,
        })
      ),
    ],
  };
}
