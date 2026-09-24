#!/usr/bin/env node
/**
 * Build the shipped Unit Specialisation medal-evidence module from the community
 * workbook snapshot (database/specialization-sheet/evidence.json).
 *
 * The workbook records every troop's tower tabs with per-node, per-level Virtue Badge
 * costs, so this replaces the earlier partial transcription (archer VII–VIII, footman
 * IX, three sections incomplete) with all 3 troops × 10 towers.
 *
 * Usage:
 *   node scripts/specialization/build-sheet-evidence.mjs            # write the module + report
 *   node scripts/specialization/build-sheet-evidence.mjs --check    # report only, fail on drift
 *   node scripts/specialization/build-sheet-evidence.mjs --apply-costs
 *        # also adopt the sheet's exact badge totals as the shipped research costs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

import {
  SPECIALIZATION_COLUMNS,
  SPECIALIZATION_RESEARCH,
} from '../../js/specialization-towers-v2-data.js';

const repoRoot = fileURLToPath(new URL('../..', import.meta.url));
const snapshotPath = join(repoRoot, 'database/specialization-sheet/evidence.json');
const dataPath = join(repoRoot, 'js/specialization-towers-v2-data.js');
const modulePath = join(repoRoot, 'js/specialization-towers-medal-evidence.js');

const args = new Set(process.argv.slice(2));
const checkOnly = args.has('--check');
const applyCosts = args.has('--apply-costs');

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
const TROOP_ORDER = ['footman', 'archer', 'cavalry'];

const normalize = (value) =>
  String(value || '')
    .toLocaleLowerCase('en')
    .replace(/[^a-z0-9]+/gu, ' ')
    .trim();

/**
 * Reviewed placements for workbook rows whose name disagrees with the planner corpus.
 *
 * In each case the workbook names (and sometimes words) the troop's node differently
 * from the corpus, but the row sits in the same slot and carries exactly the per-level
 * cost the other two troop tabs record for that canonical node. The cost is attached to
 * the node; the name/effect conflict is shipped alongside it as unresolved instead of
 * being rewritten on either side.
 */
const REVIEWED_NAME_DISCREPANCIES = [
  {
    troop: 'cavalry',
    researchId: 'encounter1',
    sourceRow: '14',
    nodeId: 14,
    corpusName: 'Marching',
    note: 'Workbook: "When all are Cavalry, Cavalry\'s Combat Speed increased by 10"; corpus: Marching Speed +5. Cost 712 matches the footman and archer Marching rows.',
  },
  {
    troop: 'cavalry',
    researchId: 'callofglory2',
    sourceRow: '14',
    nodeId: 14,
    corpusName: 'Logistics Support',
    note: 'Both state Reign of Chaos HP +6%; only the name differs. Costs 737/774 match the footman and archer Logistics Support rows.',
  },
  {
    troop: 'cavalry',
    researchId: 'callofglory3',
    sourceRow: '19',
    nodeId: 28,
    corpusName: 'Logistics Support',
    note: 'Workbook states Reign of Chaos HP +6%; corpus states HP +4%. Costs 1083/1137 match the footman and archer Logistics Support rows.',
  },
  {
    troop: 'cavalry',
    researchId: 'training5',
    sourceRow: '13',
    nodeId: 8,
    corpusName: 'Energetic',
    note: 'Workbook: "For squads with Cavalry, HP increased by 4%"; corpus: Base HP +2%. Costs 221/221 match the footman and archer Energetic rows.',
  },
  {
    troop: 'archer',
    researchId: 'enhanced3',
    sourceRow: '17',
    nodeId: 33,
    corpusName: 'Secret Tactic I',
    note: 'Passive skill. Workbook names it Secret Tactic II with "lowest troop power"; corpus names it Secret Tactic I with "highest troop power". Cost 3360 matches the footman and cavalry passive rows.',
  },
];

const reviewedPlacement = (troop, researchId, sourceRow) =>
  REVIEWED_NAME_DISCREPANCIES.find(
    (entry) =>
      entry.troop === troop && entry.researchId === researchId && entry.sourceRow === sourceRow
  ) ?? null;

/** The first magnitude a workbook buff states ("… increased by 3%" → 3). */
function buffMagnitude(buff) {
  const match = /(?:\bby|\+)\s*(\d+(?:\.\d+)?)/u.exec(String(buff || ''));
  return match ? Number(match[1]) : null;
}

/**
 * Resolve a section's sheet rows to canonical node ids for a troop, honouring troop
 * renames. A research often repeats a node name with different magnitudes (Field Intel
 * +2% and +3%), so a row first claims a same-named node whose bonus matches the
 * workbook's stated magnitude, and only then the next unused same-named node.
 */
function resolveSectionNodes(research, troop, researchId, sheetNodes) {
  const result = sheetNodes.map(() => null);
  if (!research) return result;
  const candidates = research.nodes.map((node) => {
    const override = node.troopSpecific?.[troop];
    const value = override?.bonusValue ?? node.bonusValue;
    return {
      id: node.id,
      names: [normalize(node.name), normalize(override?.name)].filter(Boolean),
      magnitude: Number.isFinite(value) ? Math.abs(value) : null,
    };
  });
  const used = new Set();

  sheetNodes.forEach((node, index) => {
    const pinned = reviewedPlacement(troop, researchId, node.sourceRow);
    if (!pinned) return;
    if (normalize(pinned.corpusName) === normalize(node.name)) {
      throw new Error(`${troop} ${researchId} row ${node.sourceRow} no longer needs a pin`);
    }
    result[index] = pinned.nodeId;
    used.add(pinned.nodeId);
  });

  const claim = (index, predicate) => {
    const wanted = normalize(sheetNodes[index].name);
    const match = candidates.find(
      (node) => !used.has(node.id) && node.names.includes(wanted) && predicate(node)
    );
    if (!match) return;
    used.add(match.id);
    result[index] = match.id;
  };
  sheetNodes.forEach((node, index) => {
    const magnitude = buffMagnitude(node.buff);
    if (result[index] === null && magnitude !== null) {
      claim(index, (candidate) => candidate.magnitude === magnitude);
    }
  });
  sheetNodes.forEach((node, index) => {
    if (result[index] === null) claim(index, () => true);
  });

  // The workbook lists the troop's passive skill as the section's final row; the corpus
  // keeps it beside `nodes` when it is not already one of them. Only accept the leftover
  // row when its name matches the recorded passive, never by position alone.
  const passive = research.passiveSkill?.[troop];
  const leftovers = result.flatMap((nodeId, index) => (nodeId === null ? [index] : []));
  if (
    research.passiveSkillNodeId != null &&
    !used.has(research.passiveSkillNodeId) &&
    passive?.name &&
    leftovers.length === 1 &&
    normalize(passive.name) === normalize(sheetNodes[leftovers[0]].name)
  ) {
    result[leftovers[0]] = research.passiveSkillNodeId;
  }
  return result;
}

function buildSections(snapshot) {
  const sections = [];
  const unresolved = [];
  for (const tab of snapshot.tabs) {
    const column = SPECIALIZATION_COLUMNS[tab.tower];
    tab.sections.forEach((section, index) => {
      const researchId = column?.researches?.[index] ?? null;
      const research = researchId ? SPECIALIZATION_RESEARCH[researchId] : null;
      const nodeIds = resolveSectionNodes(research, tab.troop, researchId, section.nodes);
      const rows = section.nodes.map((node, rowIndex) => {
        const nodeId = nodeIds[rowIndex];
        if (nodeId === null) unresolved.push({ tab: tab.tab, section: index + 1, name: node.name });
        return { sourceRow: node.sourceRow, name: node.name, costs: node.costs, nodeId };
      });
      sections.push({
        tower: tab.tower,
        troop: tab.troop,
        sourceSection: index + 1,
        researchId,
        title: research ? research.name : `Unit Specialisation ${ROMAN[tab.tower - 1]} · section ${index + 1}`,
        complete: rows.every((row) => row.costs.length > 0),
        rows,
      });
    });
  }
  return { sections, unresolved };
}

const sectionTotal = (section) =>
  section.rows.reduce((total, row) => total + row.costs.reduce((sum, cost) => sum + cost, 0), 0);

/** Badge total per research, using the majority across troops (they can differ by 1). */
function researchTotals(sections) {
  const totals = new Map();
  for (const [index, ids] of Object.entries(SPECIALIZATION_COLUMNS).map(([column, value]) => [
    Number(column),
    value.researches,
  ])) {
    ids.forEach((researchId, sectionIndex) => {
      const troopTotals = TROOP_ORDER.map((troop) =>
        sections.find(
          (section) =>
            section.tower === index &&
            section.troop === troop &&
            section.sourceSection === sectionIndex + 1
        )
      ).map((section) => (section ? sectionTotal(section) : null));
      const counts = new Map();
      for (const total of troopTotals) counts.set(total, (counts.get(total) ?? 0) + 1);
      const [winner, votes] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
      totals.set(researchId, { total: winner, votes, troopTotals });
    });
  }
  return totals;
}

function renderModule(snapshot, sections) {
  const roman = (tower) => ROMAN[tower - 1];
  const tabLines = TROOP_ORDER.map((troop) => {
    const entries = Object.keys(SPECIALIZATION_COLUMNS)
      .map(Number)
      .map((tower) => {
        const tab = snapshot.tabs.find((entry) => entry.tower === tower && entry.troop === troop);
        return tab ? `      ${tower}: Object.freeze({ troop: '${troop}', tab: '${tab.tab}' }),` : null;
      })
      .filter(Boolean)
      .join('\n');
    return `  ${troop}: Object.freeze({\n${entries}\n  }),`;
  }).join('\n');

  const sectionBlocks = sections
    .map((section) => {
      const rows = section.rows
        .map(
          (row) =>
            `      r(${JSON.stringify(String(row.sourceRow))}, ${JSON.stringify(row.name)}, [${row.costs.join(', ')}]${row.nodeId === null ? '' : `, ${row.nodeId}`}),`
        )
        .join('\n');
      return `  section({
    tower: ${section.tower},
    troop: '${section.troop}',
    sourceSection: ${section.sourceSection},
    researchId: ${section.researchId ? `'${section.researchId}'` : 'null'},
    title: ${JSON.stringify(section.title)},
    complete: ${section.complete},
    rows: [
${rows}
    ],
  }),`;
    })
    .join('\n');

  const discrepancyLines = REVIEWED_NAME_DISCREPANCIES.map((entry) => {
    const row = sections
      .find((section) => section.troop === entry.troop && section.researchId === entry.researchId)
      ?.rows.find((candidate) => candidate.sourceRow === entry.sourceRow);
    if (!row || row.nodeId !== entry.nodeId) {
      throw new Error(`reviewed placement ${entry.troop} ${entry.researchId} ${entry.sourceRow} did not apply`);
    }
    return `  Object.freeze({
    troop: '${entry.troop}',
    researchId: '${entry.researchId}',
    sourceRow: ${JSON.stringify(entry.sourceRow)},
    nodeId: ${entry.nodeId},
    workbookName: ${JSON.stringify(row.name)},
    corpusName: ${JSON.stringify(entry.corpusName)},
    note: ${JSON.stringify(entry.note)},
  }),`;
  }).join('\n');

  return `/**
 * Per-node medal evidence from the community Unit Specilization workbook.
 *
 * Source: "${snapshot.title}" — ${snapshot.maintainers} (${snapshot.maintainersUrl}),
 * mirrored at ${snapshot.workbookFile} (sha256 ${snapshot.workbookSha256}),
 * observed ${snapshot.observedAt}.
 *
 * Every troop tab stacks the tower's four researches vertically, and each research
 * lists its nodes with a per-level Virtue Badge (medal) cost plus an exact section
 * total. Rows are transcribed as the workbook states them: a node the workbook leaves
 * blank keeps an empty cost list and must never be inferred from a section total.
 *
 * Generated by scripts/specialization/build-sheet-evidence.mjs — edit the workbook or
 * the snapshot, then re-run it instead of hand-editing this file.
 */

export const SPECIALIZATION_MEDAL_EVIDENCE_SOURCE = Object.freeze({
  spreadsheetId: '${snapshot.spreadsheetId}',
  sourceUrl: 'https://docs.google.com/spreadsheets/d/${snapshot.spreadsheetId}/edit',
  title: ${JSON.stringify(snapshot.title)},
  maintainers: ${JSON.stringify(snapshot.maintainers)},
  maintainersUrl: ${JSON.stringify(snapshot.maintainersUrl)},
  observedAt: ${JSON.stringify(snapshot.observedAt)},
  workbookFile: ${JSON.stringify(snapshot.workbookFile)},
  workbookSha256: ${JSON.stringify(snapshot.workbookSha256)},
  tabs: Object.freeze({
${tabLines}
  }),
});

function evidenceRow(sourceRow, name, costs, nodeId = null) {
  return { sourceRow, name, costs, nodeId };
}

function section({ tower, troop, sourceSection, researchId = null, title, complete, rows }) {
  return {
    tower,
    troop,
    sourceSection,
    researchId,
    title,
    complete,
    rows,
    knownCostTotal: rows.reduce(
      (sectionTotal, row) =>
        sectionTotal + row.costs.reduce((rowTotal, cost) => rowTotal + cost, 0),
      0
    ),
  };
}

const r = evidenceRow;

export const SPECIALIZATION_TROOP_MEDAL_EVIDENCE = [
${sectionBlocks}
];

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

deepFreeze(SPECIALIZATION_TROOP_MEDAL_EVIDENCE);

/**
 * Rows placed on a node whose planner-corpus name disagrees with the workbook. The
 * cost matches the other troop tabs for that node, so it is attached; which name and
 * effect the game actually shows for this troop is still unresolved.
 */
export const SPECIALIZATION_MEDAL_EVIDENCE_NAME_DISCREPANCIES = Object.freeze([
${discrepancyLines}
]);

export function getSpecializationMedalEvidence({ tower, troop, researchId } = {}) {
  return SPECIALIZATION_TROOP_MEDAL_EVIDENCE.filter(
    (entry) =>
      (tower == null || entry.tower === Number(tower)) &&
      (troop == null || entry.troop === troop) &&
      (researchId == null || entry.researchId === researchId)
  );
}
`;
}

/** Adopt sheet totals as the shipped research + column badge costs. */
function applyBadgeCosts(sections, totals) {
  const original = readFileSync(dataPath, 'utf8');
  let next = original;
  const changes = [];
  for (const [researchId, { total, troopTotals }] of totals) {
    const shipped = SPECIALIZATION_RESEARCH[researchId]?.cost;
    if (shipped === total) continue;
    changes.push(`${researchId}: ${shipped} -> ${total}`);
    const declaration = next.indexOf(`id: '${researchId}',`);
    if (declaration === -1) throw new Error(`cannot locate research ${researchId}`);
    const costMatch = /^(\s*)cost: (\d+),$/mu.exec(next.slice(declaration, declaration + 400));
    if (!costMatch) throw new Error(`cannot locate cost for ${researchId}`);
    const start = declaration + costMatch.index;
    next =
      next.slice(0, start) +
      `${costMatch[1]}cost: ${total},` +
      next.slice(start + costMatch[0].length);
    if (new Set(troopTotals.filter((value) => value !== null)).size > 1) {
      changes.push(`  (troop totals differ: ${troopTotals.join(' / ')} — shipped the majority)`);
    }
  }

  const columnTotals = Object.keys(SPECIALIZATION_COLUMNS)
    .map(Number)
    .map((column) =>
      SPECIALIZATION_COLUMNS[column].researches.reduce(
        (sum, researchId) => sum + (totals.get(researchId)?.total ?? 0),
        0
      )
    );
  for (const [index, total] of columnTotals.entries()) {
    const before = SPECIALIZATION_COLUMNS[index + 1].totalCost;
    if (before === total) continue;
    changes.push(`column ${index + 1} totalCost: ${before} -> ${total}`);
    const columnsStart = next.indexOf('const COLUMNS = {');
    if (columnsStart === -1) throw new Error('cannot locate COLUMNS');
    const columnStart = next.indexOf(`\n  ${index + 1}: {`, columnsStart);
    if (columnStart === -1) throw new Error(`cannot locate column ${index + 1}`);
    const totalMatch = /^(\s*)totalCost: (\d+),$/mu.exec(next.slice(columnStart, columnStart + 600));
    if (!totalMatch) throw new Error(`cannot locate totalCost for column ${index + 1}`);
    const start = columnStart + totalMatch.index;
    next = next.slice(0, start) + `${totalMatch[1]}totalCost: ${total},` + next.slice(start + totalMatch[0].length);
  }

  if (next === original) {
    console.log('badge costs already match the sheet');
    return;
  }
  writeFileSync(dataPath, next);
  console.log(`applied ${changes.length} badge-cost change(s):`);
  for (const change of changes) console.log(`  ${change}`);
  console.log(`column totals: ${columnTotals.join(', ')} (sum ${columnTotals.reduce((a, b) => a + b, 0)})`);
}

const snapshot = JSON.parse(readFileSync(snapshotPath, 'utf8'));
const { sections, unresolved } = buildSections(snapshot);
const totals = researchTotals(sections);
const rendered = renderModule(snapshot, sections);
const existing = readFileSync(modulePath, 'utf8');

console.log(
  `snapshot: ${snapshot.tabs.length} tabs, ${sections.length} sections, ` +
    `${sections.reduce((sum, section) => sum + section.rows.length, 0)} rows`
);
console.log(
  `node-id resolution: ${
    sections.reduce((sum, s) => sum + s.rows.filter((r) => r.nodeId !== null).length, 0)
  } mapped, ${unresolved.length} unmapped`
);
const byTab = new Map();
for (const entry of unresolved) {
  const key = `${entry.tab} s${entry.section}`;
  byTab.set(key, (byTab.get(key) ?? 0) + 1);
}
if (byTab.size) {
  console.log('  unmapped rows (expected: per-troop passive skills and towers IX–X):');
  for (const [key, count] of [...byTab.entries()].slice(0, 8)) {
    console.log(`    ${key}: ${count}`);
  }
  if (byTab.size > 8) console.log(`    …and ${byTab.size - 8} more sections`);
}

const drifted = [...totals.entries()].filter(
  ([researchId, { total }]) => SPECIALIZATION_RESEARCH[researchId]?.cost !== total
);
console.log(`badge-cost drift: ${drifted.length} of ${totals.size} researches`);
for (const [researchId, { total, troopTotals }] of drifted) {
  console.log(`  ${researchId}: shipped ${SPECIALIZATION_RESEARCH[researchId].cost} -> sheet ${total}`);
}
const divergent = [...totals.entries()].filter(
  ([, { troopTotals }]) => new Set(troopTotals.filter((value) => value !== null)).size > 1
);
if (divergent.length) {
  console.log(`per-troop total divergence in ${divergent.length} research(es):`);
  for (const [researchId, { troopTotals }] of divergent) {
    console.log(`  ${researchId}: footman/archer/cavalry = ${troopTotals.join(' / ')}`);
  }
}

if (checkOnly) {
  if (rendered !== existing) {
    console.error('module is out of date with the snapshot — re-run without --check');
    process.exit(1);
  }
  console.log('module matches the snapshot');
  process.exit(0);
}

if (!sections.every((section) => section.rows.every((row) => row.costs.length > 0))) {
  console.error('refusing to write: the snapshot contains rows without any cost');
  process.exit(1);
}

writeFileSync(modulePath, rendered);
console.log(`wrote ${modulePath.slice(repoRoot.length)} (${rendered.length} bytes)`);

if (applyCosts) applyBadgeCosts(sections, totals);
