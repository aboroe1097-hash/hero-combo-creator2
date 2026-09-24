// js/hub-pdf/eden.js
// VTS Eden Hub document builder. Tables come from the Eden Operations Lab data
// (js/eden-operations-data.js) and the Eden map dataset store the map planner
// loads (js/eden-datasets-loader.js). The store is passed in, so the builder
// stays pure and testable without a network.

import {
  BLUE_LOYALTY_SPECIALTY,
  BUILDING_DISCOUNTS,
  BUILDING_UPGRADE_COSTS,
  EDEN_OPERATIONS_DATA_VERSION,
  EDEN_OPERATIONS_SOURCES,
  EDEN_STRUCTURES,
  SPECIALTY_DATA_GAPS,
  SPECIALTY_HONOR_LEVELS,
  SPECIALTY_ROUTE_MILESTONES,
  TILE_LEVELS,
} from '../eden-operations-data.js';
import { interpolate, note, numCol, sumKnown, table, textCol } from './document.js';

export const EDEN_INCLUDE = Object.freeze(['buildings', 'specialty', 'siege', 'tiles', 'map']);
// Building names are game names and stay in English, as in the Operations Lab.
export const EDEN_BUILDINGS = Object.freeze({
  workshop: 'Workshop',
  fortress: 'Fortress',
  ac1: 'Assault Camp I',
  ac2: 'Assault Camp II',
  ac3: 'Assault Camp III',
  ac4: 'Assault Camp IV',
});
export const EDEN_BUILDING_MAX_LEVEL = Math.max(
  ...Object.values(BUILDING_UPGRADE_COSTS).map((costs) => costs.length)
);
export const EDEN_SPECIALTY_MAX_LEVEL = SPECIALTY_HONOR_LEVELS.at(-1).level;
export const EDEN_STRUCTURE_GROUPS = Object.freeze([
  ...new Set(EDEN_STRUCTURES.map((structure) => structure.group)),
]);

export function defaultEdenChoices() {
  return {
    include: ['buildings', 'siege', 'tiles'],
    buildings: Object.keys(EDEN_BUILDINGS),
    discount: 'none',
    fromLevel: 1,
    toLevel: EDEN_BUILDING_MAX_LEVEL,
    specialtyFrom: 1,
    specialtyTo: EDEN_SPECIALTY_MAX_LEVEL,
    groups: [...EDEN_STRUCTURE_GROUPS],
    dataset: '',
    sector: 'all',
  };
}

function clamp(value, min, max, fallback) {
  const number = Math.floor(Number(value));
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, number));
}

function range(fromValue, toValue, max) {
  let from = clamp(fromValue, 1, max, 1);
  let to = clamp(toValue, 1, max, max);
  if (from > to) [from, to] = [to, from];
  return [from, to];
}

/** Material cost to reach `level` (level 1 is the starting level). */
export function buildingLevelCost(key, level) {
  const costs = BUILDING_UPGRADE_COSTS[key];
  if (!costs || level < 1 || level > costs.length) return null;
  const value = costs[level - 1];
  return value === null || value === undefined ? null : value;
}

export function discounted(value, rate) {
  if (value === null || value === undefined) return null;
  return Math.ceil(value * (1 - rate));
}

/** Cost of upgrading from `from` to `to`: the costs of levels from+1 … to. */
export function buildingRangeCost(key, from, to) {
  const values = [];
  for (let level = from + 1; level <= to; level += 1) values.push(buildingLevelCost(key, level));
  return sumKnown(values);
}

export function specialtyRangeHonor(from, to) {
  const values = SPECIALTY_HONOR_LEVELS.filter((row) => row.level > from && row.level <= to).map(
    (row) => row.honor
  );
  return sumKnown(values);
}

export function sectorRows(store, datasetId) {
  const sectors = store?.sectors?.[datasetId] || {};
  return Object.entries(sectors).map(([key, sector]) => ({
    key,
    label: sector.label || key,
    structures: sector.structures || [],
  }));
}

export function buildEdenDocument(rawChoices, copy, settings = {}, { mapStore = null } = {}) {
  const choices = { ...defaultEdenChoices(), ...rawChoices };
  const detail = settings.detail === 'full' ? 'full' : 'summary';
  const include = new Set(choices.include || []);
  const discount =
    BUILDING_DISCOUNTS.find((entry) => entry.id === choices.discount) || BUILDING_DISCOUNTS[0];
  const sections = [];
  const sources = [];
  const choiceRows = [
    {
      label: copy.heroesInclude,
      value:
        EDEN_INCLUDE.filter((key) => include.has(key))
          .map((key) => copy[`eden_${key}`])
          .join(', ') || copy.docNone,
    },
  ];

  if (include.has('buildings')) {
    const [from, to] = range(choices.fromLevel, choices.toLevel, EDEN_BUILDING_MAX_LEVEL);
    const keys = Object.keys(EDEN_BUILDINGS).filter((key) =>
      (choices.buildings || []).includes(key)
    );
    const rate = discount.rate;
    const levelRows = [];
    for (let level = from + 1; level <= to; level += 1) {
      levelRows.push([
        level,
        ...keys.map((key) => discounted(buildingLevelCost(key, level), rate)),
      ]);
    }
    const totals = keys.map((key) => buildingRangeCost(key, from, to));
    sections.push({
      title: copy.eden_buildings,
      blocks: [
        table(
          [
            textCol(copy.colBuilding),
            numCol(copy.colNoDiscount),
            numCol(interpolate(copy.colWithDiscount, { discount: discount.label })),
          ],
          keys.map((key, index) => [
            EDEN_BUILDINGS[key],
            totals[index],
            discounted(totals[index], rate),
          ]),
          {
            footer: [copy.docTotal, sumKnown(totals), discounted(sumKnown(totals), rate)],
            caption: interpolate(copy.buildingRangeNote, { from, to }),
          }
        ),
      ],
      subsections:
        detail === 'full' || to - from <= 10
          ? [
              {
                title: copy.buildingPerLevel,
                blocks: [
                  table(
                    [numCol(copy.colLevel), ...keys.map((key) => numCol(EDEN_BUILDINGS[key]))],
                    levelRows,
                    {
                      caption: interpolate(copy.buildingLevelNote, { discount: discount.label }),
                    }
                  ),
                ],
              },
            ]
          : [],
    });
    choiceRows.push({
      label: copy.edenBuildingPick,
      value: keys.map((key) => EDEN_BUILDINGS[key]).join(', ') || copy.docNone,
    });
    choiceRows.push({ label: copy.edenDiscount, value: discount.label });
    choiceRows.push({
      label: copy.edenLevelRange,
      value: interpolate(copy.levelRange, { from, to }),
    });
    sources.push({
      label: EDEN_OPERATIONS_SOURCES.buildingCosts.title,
      url: EDEN_OPERATIONS_SOURCES.buildingCosts.url,
    });
  }

  if (include.has('specialty')) {
    const [from, to] = range(choices.specialtyFrom, choices.specialtyTo, EDEN_SPECIALTY_MAX_LEVEL);
    const rows = SPECIALTY_HONOR_LEVELS.filter(
      (row) =>
        row.level >= from &&
        row.level <= to &&
        (detail === 'full' || row.level % 10 === 0 || row.level === from || row.level === to)
    ).map((row) => [row.level, row.honor, row.cumulative]);
    const subsections = [];
    if (detail === 'full') {
      const routeRows = [];
      for (const [tone, routes] of Object.entries(SPECIALTY_ROUTE_MILESTONES)) {
        routeRows.push({ group: copy[`route_${tone}`] || tone });
        for (const route of routes) {
          routeRows.push([
            route.name,
            route.critical ?? null,
            route.essential ?? null,
            route.advanced ?? '—',
            route.summary,
          ]);
        }
      }
      subsections.push({
        title: copy.routeBreakpoints,
        blocks: [
          table(
            [
              textCol(copy.colRoute),
              numCol(copy.colCritical),
              numCol(copy.colEssential),
              numCol(copy.colAdvanced),
              textCol(copy.colEffect),
            ],
            routeRows
          ),
        ],
      });
    }
    sections.push({
      title: copy.eden_specialty,
      blocks: [
        {
          type: 'definitions',
          items: [
            {
              label: interpolate(copy.honorBetween, { from, to }),
              value: specialtyRangeHonor(from, to),
            },
          ],
        },
        table(
          [numCol(copy.colLevel), numCol(copy.colHonorToReach), numCol(copy.colCumulative)],
          rows,
          {
            caption:
              detail === 'full'
                ? copy.specialtyNote
                : `${copy.specialtySummaryNote} ${copy.specialtyNote}`,
          }
        ),
        note(SPECIALTY_DATA_GAPS[1]),
      ],
      subsections,
    });
    choiceRows.push({
      label: copy.edenSpecialtyRange,
      value: interpolate(copy.levelRange, { from, to }),
    });
    sources.push({
      label: EDEN_OPERATIONS_SOURCES.specialtyHonor.title,
      url: EDEN_OPERATIONS_SOURCES.specialtyHonor.url,
    });
  }

  if (include.has('siege')) {
    const groups = new Set(choices.groups || []);
    const structures = EDEN_STRUCTURES.filter((structure) => groups.has(structure.group));
    const summaryColumns = [
      textCol(copy.colStructure),
      textCol(copy.colGroup),
      numCol(copy.colLevel),
      numCol(copy.colLoyalty),
      numCol(copy.colDurability),
      numCol(copy.colAttackers),
      numCol(copy.colSupport),
    ];
    const fullColumns = [
      ...summaryColumns,
      numCol(copy.colOccupation),
      numCol(copy.colFactionPts),
      numCol(copy.colDmgLoyalty),
      numCol(copy.colDmgDurability),
      numCol(copy.colBannerAttackers),
      numCol(copy.colBannerSupport),
    ];
    sections.push({
      title: copy.eden_siege,
      blocks: [
        table(
          detail === 'full' ? fullColumns : summaryColumns,
          structures.map((s) => [
            s.id,
            s.group,
            s.level,
            s.loyalty,
            s.durability,
            s.attackers,
            s.support,
            ...(detail === 'full'
              ? [
                  s.occupation,
                  s.factionPoints,
                  s.damageLoyalty,
                  s.damageDurability,
                  s.bannerAttackers,
                  s.bannerSupport,
                ]
              : []),
          ]),
          { caption: copy.siegeNote }
        ),
      ],
    });
    choiceRows.push({
      label: copy.edenGroups,
      value: EDEN_STRUCTURE_GROUPS.filter((group) => groups.has(group)).join(', ') || copy.docNone,
    });
    sources.push({
      label: EDEN_OPERATIONS_SOURCES.tilingAndSiege.title,
      url: EDEN_OPERATIONS_SOURCES.tilingAndSiege.url,
    });
  }

  if (include.has('tiles')) {
    sections.push({
      title: copy.eden_tiles,
      blocks: [
        table(
          [
            numCol(copy.colLevel),
            numCol(copy.colLoyalty),
            numCol(copy.colResistance),
            numCol(copy.colInfluence),
            numCol(copy.colHonor),
          ],
          TILE_LEVELS.map((tile) => [
            tile.level,
            tile.loyalty,
            tile.resistance,
            tile.influence,
            tile.honor,
          ])
        ),
      ],
      subsections:
        detail === 'full'
          ? [
              {
                title: copy.blueLoyalty,
                blocks: [
                  table(
                    [
                      numCol(copy.colRank),
                      numCol(copy.colSpecialtyPoints),
                      numCol(copy.colExtraLoyalty),
                    ],
                    BLUE_LOYALTY_SPECIALTY.map((row) => [
                      row.rank,
                      row.specialtyPoints,
                      row.extraLoyalty,
                    ])
                  ),
                ],
              },
            ]
          : [],
    });
    if (!include.has('siege')) {
      sources.push({
        label: EDEN_OPERATIONS_SOURCES.tilingAndSiege.title,
        url: EDEN_OPERATIONS_SOURCES.tilingAndSiege.url,
      });
    }
  }

  if (include.has('map')) {
    const catalog = mapStore?.catalog || [];
    const datasetId = catalog.some((entry) => entry.id === choices.dataset)
      ? choices.dataset
      : catalog[0]?.id;
    if (!mapStore || !datasetId) {
      sections.push({
        title: copy.eden_map,
        blocks: [{ type: 'paragraph', text: copy.edenMapUnavailable }],
      });
    } else {
      const sectors = sectorRows(mapStore, datasetId).filter(
        (sector) => choices.sector === 'all' || !choices.sector || sector.key === choices.sector
      );
      const structures = sectors.flatMap((sector) => sector.structures);
      const typeCounts = new Map();
      structures.forEach((item) =>
        typeCounts.set(item.type || null, (typeCounts.get(item.type || null) || 0) + 1)
      );
      const points = (items) =>
        sumKnown(items.map((item) => (item.points === undefined ? null : Number(item.points))));
      sections.push({
        title: copy.eden_map,
        blocks: [
          table(
            [
              textCol(copy.colSector),
              textCol(copy.colLabel),
              numCol(copy.colStructures),
              numCol(copy.colPoints),
            ],
            sectors.map((sector) => [
              sector.key,
              sector.label,
              sector.structures.length,
              points(sector.structures),
            ]),
            { footer: [copy.docTotal, '', structures.length, points(structures)] }
          ),
          table(
            [textCol(copy.colType), numCol(copy.colCount)],
            [...typeCounts.entries()]
              .sort((a, b) => b[1] - a[1])
              .map(([type, count]) => [type, count])
          ),
        ],
        subsections:
          detail === 'full'
            ? sectors.map((sector) => ({
                title: `${sector.key} · ${sector.label}`,
                blocks: [
                  table(
                    [
                      textCol('ID'),
                      textCol(copy.colType),
                      textCol(copy.colZone),
                      numCol('X'),
                      numCol('Y'),
                      numCol(copy.colPoints),
                    ],
                    sector.structures.map((item) => [
                      item.id ?? null,
                      item.type ?? null,
                      item.zone ?? null,
                      item.x ?? null,
                      item.y ?? null,
                      item.points ?? null,
                    ])
                  ),
                ],
              }))
            : [],
      });
      choiceRows.push({ label: copy.edenDataset, value: datasetId });
      choiceRows.push({
        label: copy.edenSector,
        value: choices.sector === 'all' ? copy.sectorAll : choices.sector,
      });
      const catalogEntry = catalog.find((entry) => entry.id === datasetId);
      sources.push({
        label: `${copy.eden_map}: ${datasetId}`,
        note: [
          catalogEntry?.source,
          mapStore.builtAt ? `${copy.dataRevision} ${mapStore.builtAt}` : '',
        ]
          .filter(Boolean)
          .join(' · '),
      });
    }
  }

  if (sources.length) {
    sources.push({ label: copy.edenDataVersion, note: EDEN_OPERATIONS_DATA_VERSION });
    sources.push({ label: copy.edenGapsTitle, note: SPECIALTY_DATA_GAPS.at(-1) });
  }

  return {
    title: copy.edenDocTitle,
    fileTitle: `roc-eden-${EDEN_INCLUDE.filter((key) => include.has(key)).join('-') || 'reference'}`,
    subtitle: copy.edenDocSubtitle,
    choices: choiceRows,
    sections,
    sources,
  };
}

export function sectorOptions(copy, mapStore, datasetId) {
  return [
    { value: 'all', label: copy.sectorAll },
    ...sectorRows(mapStore, datasetId).map((sector) => ({
      value: sector.key,
      label: `${sector.key} · ${sector.label}`,
    })),
  ];
}

/** Form controls for the Eden PDFs tab. */
export function edenForm(copy, choices = defaultEdenChoices(), { mapStore = null } = {}) {
  const catalog = mapStore?.catalog || [];
  return [
    {
      type: 'checks',
      name: 'include',
      label: copy.heroesInclude,
      options: EDEN_INCLUDE.map((value) => ({
        value,
        label: copy[`eden_${value}`],
        disabled: value === 'map' && !catalog.length,
      })),
    },
    { type: 'heading', label: copy.eden_buildings },
    {
      type: 'checks',
      name: 'buildings',
      label: copy.edenBuildingPick,
      bulk: true,
      options: Object.entries(EDEN_BUILDINGS).map(([value, label]) => ({ value, label })),
    },
    {
      type: 'select',
      name: 'discount',
      label: copy.edenDiscount,
      options: BUILDING_DISCOUNTS.map((entry) => ({ value: entry.id, label: entry.label })),
    },
    {
      type: 'range',
      label: copy.edenLevelRange,
      fromName: 'fromLevel',
      toName: 'toLevel',
      min: 1,
      max: EDEN_BUILDING_MAX_LEVEL,
    },
    { type: 'heading', label: copy.eden_specialty },
    {
      type: 'range',
      label: copy.edenSpecialtyRange,
      fromName: 'specialtyFrom',
      toName: 'specialtyTo',
      min: 1,
      max: EDEN_SPECIALTY_MAX_LEVEL,
    },
    { type: 'heading', label: copy.eden_siege },
    {
      type: 'checks',
      name: 'groups',
      label: copy.edenGroups,
      options: EDEN_STRUCTURE_GROUPS.map((value) => ({ value, label: value })),
    },
    { type: 'heading', label: copy.eden_map },
    ...(catalog.length
      ? [
          {
            type: 'select',
            name: 'dataset',
            label: copy.edenDataset,
            options: catalog.map((entry) => ({ value: entry.id, label: entry.id })),
          },
          {
            type: 'select',
            name: 'sector',
            label: copy.edenSector,
            options: sectorOptions(copy, mapStore, choices.dataset || catalog[0].id),
          },
        ]
      : [{ type: 'text', label: copy.edenMapUnavailable }]),
  ];
}

export const edenPdf = Object.freeze({
  defaults: defaultEdenChoices,
  form: edenForm,
  async prepare() {
    try {
      const { loadEdenDatasetStore } = await import('../eden-datasets-loader.js');
      return { mapStore: await loadEdenDatasetStore() };
    } catch {
      return { mapStore: null };
    }
  },
  refresh(choices, copy, ctx) {
    const catalog = ctx?.mapStore?.catalog || [];
    const dataset = catalog.some((entry) => entry.id === choices.dataset)
      ? choices.dataset
      : catalog[0]?.id || '';
    const options = sectorOptions(copy, ctx?.mapStore, dataset);
    const sector = options.some((option) => option.value === choices.sector)
      ? choices.sector
      : 'all';
    return { choices: { ...choices, dataset, sector }, fields: { sector: options } };
  },
  build: (choices, copy, settings, ctx) => buildEdenDocument(choices, copy, settings, ctx),
  quick: [
    ['roc-eden-honor-building-costs.pdf', 'Honor building costs'],
    ['roc-eden-specialty-honor.pdf', 'Specialty Honor'],
    ['roc-eden-siege-structures.pdf', 'Siege structures'],
    ['roc-eden-tile-levels.pdf', 'Tile levels'],
    ['roc-eden-map-structures.pdf', 'Map structures'],
  ],
});
