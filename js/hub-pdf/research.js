// js/hub-pdf/research.js
// Research & Towers Hub document builder. Academy research reads the research
// tracker's tech database with the tracker's own cost-type rules; the towers
// read the Specialization planner corpus and the community workbook medal
// evidence it ships with. Nothing is copied or re-derived.

import { techDatabase } from '../tech-db.js';
import {
  SPECIALIZATION_COLUMNS,
  SPECIALIZATION_DATA_REVISION,
  SPECIALIZATION_MEDAL_EVIDENCE_SOURCE,
  SPECIALIZATION_RESEARCH,
  SPECIALIZATION_SOURCE_METADATA,
  SPECIALIZATION_TROOP_MEDAL_EVIDENCE,
  SPECIALIZATION_TROOPS,
} from '../specialization-towers-v2-data.js';
import { interpolate, note, numCol, paragraph, sumKnown, table, textCol } from './document.js';

export const RESEARCH_INCLUDE = Object.freeze(['research', 'towers']);
export const NOT_APPLICABLE = '—';

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
export function romanColumn(value) {
  return ROMAN[Number(value) - 1] || String(value);
}

function seasonSortKey(season) {
  const match = /^([A-Z]+)(\d+)$/.exec(String(season || '').trim());
  if (!match) return [9, 0];
  return [match[1] === 'S' ? 0 : 1, Number(match[2])];
}

export function researchSeasons(trees = techDatabase) {
  return [...new Set(trees.map((tree) => String(tree.season).trim()))].sort((a, b) => {
    const [pa, na] = seasonSortKey(a);
    const [pb, nb] = seasonSortKey(b);
    return pa - pb || na - nb;
  });
}

/** Tower columns: the planner's eight plus any workbook-only tower. */
export function towerColumns() {
  const planner = Object.keys(SPECIALIZATION_COLUMNS).map(Number);
  const workbook = SPECIALIZATION_TROOP_MEDAL_EVIDENCE.map((entry) => entry.tower);
  return [...new Set([...planner, ...workbook])].sort((a, b) => a - b);
}

export function defaultResearchChoices() {
  return {
    include: ['research', 'towers'],
    season: 'all',
    family: 'all',
    troop: 'all',
    columns: Object.keys(SPECIALIZATION_COLUMNS),
    medals: true,
    planner: true,
  };
}

function levels(values, maxLevel) {
  if (!Array.isArray(values) || !values.length) return null;
  if (values.length < maxLevel) return null;
  const used = values.slice(0, maxLevel).map(Number);
  return used.every(Number.isFinite) ? used : null;
}

function firstArray(...candidates) {
  return candidates.find((value) => Array.isArray(value) && value.length) || null;
}

/**
 * Medal totals for one research node, following the research tracker's rules:
 * Courage nodes pay courage medals, War Badge nodes pay war badges, Dual nodes
 * pay wisdom and courage, None nodes pay no medals. A currency the node does not
 * use is NOT_APPLICABLE; a currency it uses without a full ladder is null.
 */
export function researchNodeMedals(node) {
  const max = Number(node.maxLevel) > 0 ? Number(node.maxLevel) : 1;
  const total = (values) => {
    const ladder = levels(values, max);
    return ladder ? ladder.reduce((sum, value) => sum + value, 0) : null;
  };
  const result = { courage: NOT_APPLICABLE, wisdom: NOT_APPLICABLE, warBadges: NOT_APPLICABLE };
  const type = String(node.costType || 'None');
  if (type === 'Courage') {
    result.courage = total(firstArray(node.costs, node.courageCosts, node.cm_costs));
  } else if (type === 'War Badge' || type === 'War Badges' || type === 'Wisdom') {
    result.warBadges = total(
      firstArray(node.costs, node.warBadgeCosts, node.wisdomCosts, node.wb_costs)
    );
  } else if (type === 'Dual') {
    result.wisdom = total(firstArray(node.wisdomCosts, node.warBadgeCosts, node.costs));
    result.courage = total(firstArray(node.courageCosts, node.cm_costs));
  }
  return result;
}

/** Tree totals per currency. Unknown if any contributing node is unknown. */
export function researchTreeTotals(tree) {
  const perNode = tree.nodes.map(researchNodeMedals);
  const totals = {};
  for (const key of ['courage', 'wisdom', 'warBadges']) {
    const used = perNode.map((node) => node[key]).filter((value) => value !== NOT_APPLICABLE);
    totals[key] = used.length ? sumKnown(used) : NOT_APPLICABLE;
  }
  return totals;
}

export function filterResearchTrees(choices, trees = techDatabase) {
  return trees.filter(
    (tree) =>
      (choices.season === 'all' ||
        !choices.season ||
        String(tree.season).trim() === choices.season) &&
      (choices.family === 'all' || !choices.family || tree.id === choices.family)
  );
}

function evidenceFor(troop, tower, researchId) {
  return SPECIALIZATION_TROOP_MEDAL_EVIDENCE.filter(
    (entry) =>
      entry.troop === troop &&
      entry.tower === tower &&
      (!researchId || entry.researchId === researchId)
  );
}

function workbookTotal(entry) {
  if (!entry) return null;
  return entry.complete === true
    ? entry.knownCostTotal
    : { value: entry.knownCostTotal, suffix: ' *' };
}

/** One row per research (or workbook-only section) for a troop and tower column. */
export function towerResearchRows(troop, column) {
  const planner = SPECIALIZATION_COLUMNS[column];
  if (planner) {
    return planner.researches.map((researchId) => {
      const research = SPECIALIZATION_RESEARCH[researchId] || {};
      const entry = evidenceFor(troop, Number(column), researchId)[0];
      return {
        researchId,
        name: research.name || researchId,
        nodes: research.nodes
          ? research.nodes.length + (research.passiveSkillNodeId ? 1 : 0)
          : null,
        workbook: workbookTotal(entry),
        planner: Number.isFinite(research.cost) ? research.cost : null,
        entry,
        research,
      };
    });
  }
  return evidenceFor(troop, Number(column)).map((entry) => ({
    researchId: null,
    name: entry.title,
    nodes: entry.rows.length,
    workbook: workbookTotal(entry),
    planner: null,
    entry,
    research: null,
  }));
}

function nodeEffect(research, nodeId, troop) {
  if (!research || nodeId === null || nodeId === undefined) return null;
  if (research.passiveSkillNodeId === nodeId) {
    const passive = research.passiveSkill?.[troop];
    return passive ? `${passive.name}: ${passive.effect}` : null;
  }
  return research.nodes?.find((node) => node.id === nodeId)?.effect ?? null;
}

function troopLabel(copy, troop) {
  return (
    {
      all: copy.troopAll,
      footman: copy.troopFootman,
      archer: copy.troopArcher,
      cavalry: copy.troopCavalry,
    }[troop] || troop
  );
}

export function buildResearchDocument(rawChoices, copy, settings = {}) {
  const choices = { ...defaultResearchChoices(), ...rawChoices };
  const detail = settings.detail === 'full' ? 'full' : 'summary';
  const include = new Set(choices.include || []);
  const sections = [];
  const sources = [];

  if (include.has('research')) {
    const trees = filterResearchTrees(choices);
    const totals = trees.map(researchTreeTotals);
    const footerFor = (key) => {
      const used = totals.map((row) => row[key]).filter((value) => value !== NOT_APPLICABLE);
      return used.length ? sumKnown(used) : NOT_APPLICABLE;
    };
    const summary = table(
      [
        textCol(copy.colTree),
        textCol(copy.colSeason),
        numCol(copy.colNodes),
        numCol(copy.colCourage),
        numCol(copy.colWisdom),
        numCol(copy.colWarBadges),
      ],
      trees.map((tree, index) => [
        tree.name,
        String(tree.season).trim(),
        tree.nodes.length,
        totals[index].courage,
        totals[index].wisdom,
        totals[index].warBadges,
      ]),
      {
        footer: [
          copy.docTotal,
          '',
          trees.reduce((sum, tree) => sum + tree.nodes.length, 0),
          footerFor('courage'),
          footerFor('wisdom'),
          footerFor('warBadges'),
        ],
        caption: copy.researchTotalsNote,
      }
    );
    const subsections =
      detail === 'full'
        ? trees.map((tree) => ({
            title: `${tree.name} · ${String(tree.season).trim()}`,
            blocks: [
              ...(tree.unlockCondition && tree.unlockCondition !== 'None'
                ? [paragraph(interpolate(copy.unlockLine, { condition: tree.unlockCondition }))]
                : []),
              table(
                [
                  textCol(copy.colNode),
                  textCol(copy.colTroop),
                  numCol(copy.colMaxLevel),
                  textCol(copy.colEffect),
                  numCol(copy.colCourage),
                  numCol(copy.colWisdom),
                  numCol(copy.colWarBadges),
                ],
                tree.nodes.map((node) => {
                  const medals = researchNodeMedals(node);
                  return [
                    node.name,
                    node.troop || null,
                    Number(node.maxLevel) || null,
                    node.buff || null,
                    medals.courage,
                    medals.wisdom,
                    medals.warBadges,
                  ];
                })
              ),
            ],
          }))
        : [];
    sections.push({
      title: copy.secResearch,
      blocks: [summary],
      subsections,
    });
    sources.push({ label: copy.srcResearch, note: copy.srcResearchNote });
  }

  if (include.has('towers')) {
    const troops =
      choices.troop === 'all' || !choices.troop ? [...SPECIALIZATION_TROOPS] : [choices.troop];
    const columns = towerColumns().filter((column) =>
      (choices.columns || []).map(String).includes(String(column))
    );
    const summaryColumns = [
      textCol(copy.colResearch),
      numCol(copy.colNodes),
      ...(choices.medals ? [numCol(copy.colWorkbookMedals)] : []),
      ...(choices.planner ? [numCol(copy.colPlannerMedals)] : []),
    ];
    const troopSummaries = troops.map((troop) => {
      const rows = [];
      const workbookValues = [];
      const plannerValues = [];
      for (const column of columns) {
        const researchRows = towerResearchRows(troop, column);
        if (!researchRows.length) continue;
        const plannerColumn = SPECIALIZATION_COLUMNS[column];
        rows.push({
          group: `${copy.colColumn} ${romanColumn(column)}${plannerColumn ? ` · ${interpolate(copy.unlocksIn, { season: plannerColumn.unlockSeason || '?' })}` : ` · ${copy.workbookOnly}`}`,
        });
        for (const row of researchRows) {
          workbookValues.push(row.workbook);
          if (plannerColumn) plannerValues.push(row.planner);
          rows.push([
            row.name,
            row.nodes,
            ...(choices.medals ? [row.workbook] : []),
            ...(choices.planner ? [plannerColumn ? row.planner : NOT_APPLICABLE] : []),
          ]);
        }
      }
      return {
        title: troopLabel(copy, troop),
        blocks: [
          table(summaryColumns, rows, {
            footer: [
              copy.docTotal,
              '',
              ...(choices.medals ? [sumKnown(workbookValues)] : []),
              ...(choices.planner
                ? [plannerValues.length ? sumKnown(plannerValues) : NOT_APPLICABLE]
                : []),
            ],
          }),
        ],
      };
    });

    sections.push({
      title: copy.secTowers,
      blocks: [
        paragraph(copy.towersIntro),
        ...(choices.medals || choices.planner ? [note(copy.towersMedalNote)] : []),
      ],
      subsections: troopSummaries,
    });

    if (detail === 'full') {
      const nodeSubsections = [];
      for (const troop of troops) {
        for (const column of columns) {
          for (const row of towerResearchRows(troop, column)) {
            const entry = row.entry;
            const tableRows = entry
              ? entry.rows.map((evidence) => {
                  const costs = Array.isArray(evidence.costs) ? evidence.costs : [];
                  return [
                    evidence.nodeId ?? evidence.sourceRow ?? null,
                    evidence.name,
                    nodeEffect(row.research, evidence.nodeId, troop),
                    ...(choices.medals
                      ? [
                          costs.length ? costs.join(' + ') : null,
                          costs.length ? sumKnown(costs) : null,
                        ]
                      : []),
                  ];
                })
              : (row.research?.nodes || []).map((node) => [
                  node.id,
                  node.name,
                  node.effect ?? null,
                  ...(choices.medals ? [null, null] : []),
                ]);
            nodeSubsections.push({
              title: `${troopLabel(copy, troop)} · ${copy.colColumn} ${romanColumn(column)} · ${row.name}`,
              blocks: [
                table(
                  [
                    numCol('#'),
                    textCol(copy.colNode),
                    textCol(copy.colEffect),
                    ...(choices.medals
                      ? [textCol(copy.colMedalsPerLevel), numCol(copy.colNodeTotal)]
                      : []),
                  ],
                  tableRows,
                  choices.medals ? { footer: ['', copy.docTotal, '', '', row.workbook] } : {}
                ),
              ],
            });
          }
        }
      }
      sections.push({ title: copy.secTowerNodes, blocks: [], subsections: nodeSubsections });
    }

    sources.push({
      label: SPECIALIZATION_SOURCE_METADATA.title,
      note: `${SPECIALIZATION_SOURCE_METADATA.publisher} · ${copy.dataRevision} ${SPECIALIZATION_DATA_REVISION}`,
      url: SPECIALIZATION_SOURCE_METADATA.sourceUrl,
    });
    if (choices.medals) {
      sources.push({
        label: `${SPECIALIZATION_MEDAL_EVIDENCE_SOURCE.title} — ${SPECIALIZATION_MEDAL_EVIDENCE_SOURCE.maintainers}`,
        note: `${copy.observedOn} ${SPECIALIZATION_MEDAL_EVIDENCE_SOURCE.observedAt}`,
        url: SPECIALIZATION_MEDAL_EVIDENCE_SOURCE.sourceUrl,
      });
    }
  }

  const familyName =
    choices.family === 'all'
      ? copy.resFamilyAll
      : techDatabase.find((tree) => tree.id === choices.family)?.name;
  const choiceRows = [
    {
      label: copy.heroesInclude,
      value:
        RESEARCH_INCLUDE.filter((key) => include.has(key))
          .map((key) => (key === 'research' ? copy.resIncludeResearch : copy.resIncludeTowers))
          .join(', ') || copy.docNone,
    },
  ];
  if (include.has('research')) {
    choiceRows.push({
      label: copy.resSeason,
      value: choices.season === 'all' ? copy.allSeasons : choices.season,
    });
    choiceRows.push({ label: copy.resFamily, value: familyName ?? null });
  }
  if (include.has('towers')) {
    choiceRows.push({ label: copy.towersTroop, value: troopLabel(copy, choices.troop) });
    choiceRows.push({
      label: copy.towersColumns,
      value:
        towerColumns()
          .filter((column) => (choices.columns || []).map(String).includes(String(column)))
          .map(romanColumn)
          .join(', ') || copy.docNone,
    });
    choiceRows.push({ label: copy.towersMedals, value: choices.medals ? copy.yes : copy.no });
    choiceRows.push({ label: copy.towersPlanner, value: choices.planner ? copy.yes : copy.no });
  }

  return {
    title: copy.researchDocTitle,
    fileTitle: `roc-research-towers-${choices.season}-${choices.troop}`,
    subtitle: copy.researchDocSubtitle,
    choices: choiceRows,
    sections,
    sources,
  };
}

export function researchFamilyOptions(copy, season) {
  return [
    { value: 'all', label: copy.resFamilyAll },
    ...filterResearchTrees({ season, family: 'all' }).map((tree) => ({
      value: tree.id,
      label: `${tree.name} (${String(tree.season).trim()})`,
    })),
  ];
}

/** Form controls for the Research & Towers PDFs tab. */
export function researchForm(copy, choices = defaultResearchChoices()) {
  return [
    {
      type: 'checks',
      name: 'include',
      label: copy.heroesInclude,
      options: [
        { value: 'research', label: copy.resIncludeResearch },
        { value: 'towers', label: copy.resIncludeTowers },
      ],
    },
    { type: 'heading', label: copy.resIncludeResearch },
    {
      type: 'select',
      name: 'season',
      label: copy.resSeason,
      options: [
        { value: 'all', label: copy.allSeasons },
        ...researchSeasons().map((season) => ({ value: season, label: season })),
      ],
    },
    {
      type: 'select',
      name: 'family',
      label: copy.resFamily,
      options: researchFamilyOptions(copy, choices.season),
    },
    { type: 'heading', label: copy.resIncludeTowers },
    {
      type: 'select',
      name: 'troop',
      label: copy.towersTroop,
      options: ['all', ...SPECIALIZATION_TROOPS].map((value) => ({
        value,
        label: troopLabel(copy, value),
      })),
    },
    {
      type: 'checks',
      name: 'columns',
      label: copy.towersColumns,
      bulk: true,
      options: towerColumns().map((column) => ({
        value: String(column),
        label: SPECIALIZATION_COLUMNS[column]
          ? romanColumn(column)
          : `${romanColumn(column)} (${copy.workbookOnly})`,
      })),
    },
    { type: 'toggle', name: 'medals', label: copy.towersMedals },
    { type: 'toggle', name: 'planner', label: copy.towersPlanner },
  ];
}

export const researchPdf = Object.freeze({
  defaults: defaultResearchChoices,
  form: researchForm,
  // The tree list follows the chosen season; a tree from another season is dropped.
  refresh(choices, copy) {
    const options = researchFamilyOptions(copy, choices.season);
    const family = options.some((option) => option.value === choices.family)
      ? choices.family
      : 'all';
    return { choices: { ...choices, family }, fields: { family: options } };
  },
  build: (choices, copy, settings) => buildResearchDocument(choices, copy, settings),
  quick: [
    ['roc-research-costs.pdf', 'Research costs'],
    ['roc-unit-specialisation-medals.pdf', 'Unit Specialisation medals'],
    ['roc-specialisation-towers.pdf', 'Specialisation towers'],
    ['roc-artifacts.pdf', 'Artifacts'],
  ],
});
