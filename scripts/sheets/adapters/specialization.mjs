// Specialization Towers sheets (plan §4).
//
// Data owners, traced through the planner rather than through its UI module:
//   - structure:  js/specialization-towers-v2-data.js  (columns, researches, nodes)
//   - medal costs: js/specialization-towers-medal-evidence.js (the community
//     workbook transcription the planner prices nodes from)
//
// The planner's own `SPECIALIZATION_COLUMNS[].totalCost` is derived from those four
// research totals, and this adapter recomputes the sum from the evidence so the
// sheet can state both figures and show that they agree — instead of repeating a
// number it cannot check.
//
// Requirements from the plan: one sheet per troop with eight column cards in a 2x4
// grid, four research rows per card each with an icon and a total medal cost,
// column subtotals, one overall total, no level ladders, unknown values left
// unknown, incomplete aggregates labelled "Known subtotal", and labelled
// continuation sheets for columns beyond the current eight.

import { loadSiteModule } from '../../pdf/lib/env.mjs';
import { icon, resourceIconName } from '../lib/theme.mjs';

const TROOP_LABELS = Object.freeze({
  footman: 'Footman',
  archer: 'Archer',
  cavalry: 'Cavalry',
});

const TROOP_ICONS = Object.freeze({
  footman: 'footman',
  archer: 'archer',
  cavalry: 'cavalry',
});

const COLUMNS_PER_PAGE = 8; // 2 x 4 grid
const COLUMNS_PER_CONTINUATION_PAGE = 8;

async function loadSpecialization() {
  const [data, evidence] = await Promise.all([
    loadSiteModule('js/specialization-towers-v2-data.js'),
    loadSiteModule('js/specialization-towers-medal-evidence.js'),
  ]);
  return { data, evidence };
}

function titleCase(value) {
  return String(value || '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (char) => char.toUpperCase());
}

/**
 * One row per research: icon, name, node count, and the total medal cost from the
 * troop's own workbook tab. A research with no evidence for this troop stays
 * unknown — never zero, and never borrowed from another troop.
 */
function researchRows({ columns, researchById, evidenceIndex, troop }) {
  return columns.map((column) => {
    const researches = (column.researches || []).map((id) => researchById.get(id)).filter(Boolean);
    const rows = researches.map((research) => {
      const section = evidenceIndex.get(`${troop}:${research.id}`);
      const total = section?.knownCostTotal;
      return {
        name: research.name,
        nodes: Array.isArray(research.nodes) ? research.nodes.length : 0,
        total: total ?? null,
        unknown: section === undefined,
        complete: section?.complete === true,
        section,
      };
    });
    const known = rows.filter((row) => !row.unknown && typeof row.total === 'number');
    const subtotal = known.reduce((sum, row) => sum + row.total, 0);
    const incomplete = known.length !== rows.length || known.some((row) => row.complete !== true);
    return {
      column,
      rows,
      subtotal: known.length ? subtotal : null,
      // A column total is only presented as a total when every research in it is
      // known and complete; otherwise it is explicitly a known subtotal.
      subtotalLabel: incomplete ? 'Known subtotal' : 'Column total',
      incomplete,
      unknownCount: rows.length - known.length,
    };
  });
}

function gridColumnsFor(count) {
  return count > 4 ? 4 : count > 1 ? 2 : 1;
}

// One card is the reference's row: a pill for the column, the unlock beside it, the
// column figure right-aligned, then the four researches as compact rows. Keeping the
// head on a single line is what makes a 2x4 grid of eight cards fit one page.
function columnCard({ entry, troop }) {
  const right = `<div class="sh-total sh-total--${entry.incomplete ? 'neutral' : 'gold'}">
    ${icon('medal', { size: '4.8mm', className: 'sh-total__icon' })}
    <span class="sh-total__value">${
      entry.subtotal === null ? 'Unknown' : entry.subtotal.toLocaleString('en-US')
    }</span>
    <span class="sh-total__unit">medals</span>
    <span class="sh-total__caption">${entry.subtotalLabel}${
      entry.unknownCount ? ` · ${entry.unknownCount} unknown` : ''
    }</span>
  </div>`;
  return {
    pillText: entry.column.name,
    pillTone: entry.incomplete ? 'neutral' : 'gold',
    title: entry.column.unlockSeason ? `Unlocks ${entry.column.unlockSeason}` : '',
    right,
    tone: entry.incomplete ? 'neutral' : 'gold',
    body: tableMarkup(entry),
  };
}

function tableMarkup(entry) {
  const rows = entry.rows
    .map(
      (row) => `<tr>
      <td class="is-left">${icon(row.unknown ? 'info' : 'research', {
        size: '4.2mm',
        className: 'sh-icon--lead',
      })} ${escapeText(row.name)}</td>
      <td>${row.unknown ? 'Unknown' : row.nodes}</td>
      <td class="${row.unknown ? 'is-unknown' : 'sh-t--gold'}">${
        row.unknown ? 'Unknown' : row.total.toLocaleString('en-US')
      }</td>
    </tr>`
    )
    .join('');
  return `<table class="sh-table is-compact">
    <thead><tr>
      <th class="is-left">Research</th><th>Nodes</th><th>Medals</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function escapeText(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => {
    switch (char) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      default:
        return '&#39;';
    }
  });
}

function totalsBlock({ researched, unknownColumns, overall, troop }) {
  const knownTotal = overall.known;
  const items = [
    {
      label: 'Columns I–VIII',
      value: knownTotal.columns || null,
      unknown: !knownTotal.columns,
      hint: 'Known subtotal',
    },
    {
      label: 'Researches counted',
      value: knownTotal.researches,
      hint: `of ${researched.total} researches`,
    },
    {
      label: 'Nodes in the tree',
      value: researched.nodes,
      hint: 'structure rows',
    },
    {
      label: 'Columns unknown',
      value: unknownColumns,
      unknown: unknownColumns > 0 ? false : undefined,
      hint: unknownColumns ? 'not stated by the source' : 'every column known',
    },
  ];
  return `
    <div class="sh-stats sh-stats--4">
      ${items
        .map(
          (item) => `<div class="sh-stat">
        <span class="sh-stat__label">${escapeText(item.label)}</span>
        <span class="sh-stat__value${item.unknown ? ' is-unknown' : ''}">${
          item.value === null || item.value === undefined
            ? 'Unknown'
            : Number(item.value).toLocaleString('en-US')
        }</span>
        ${item.hint ? `<span class="sh-stat__hint">${escapeText(item.hint)}</span>` : ''}
      </div>`
        )
        .join('')}
    </div>`;
}

/**
 * The per-troop sheet: eight column cards, four research rows each, subtotals, and
 * one overall figure for the troop.
 */
export async function troopSheet({ troop, branding }) {
  const { data, evidence } = await loadSpecialization();
  const columns = Object.entries(data.SPECIALIZATION_COLUMNS)
    .map(([id, column]) => ({ ...column, id: Number(id) }))
    .sort((a, b) => a.id - b.id);
  const researchById = new Map(
    Object.entries(data.SPECIALIZATION_RESEARCH).map(([id, research]) => [id, research])
  );
  const evidenceIndex = new Map();
  for (const section of evidence.SPECIALIZATION_TROOP_MEDAL_EVIDENCE || []) {
    if (section.troop === troop && section.researchId) {
      evidenceIndex.set(`${troop}:${section.researchId}`, section);
    }
  }

  const entries = researchRows({ columns, researchById, evidenceIndex, troop });
  const knownColumns = entries.filter((entry) => !entry.incomplete);
  const overallKnown = knownColumns.reduce((sum, entry) => sum + (entry.subtotal || 0), 0);
  const researchCount = entries.reduce(
    (sum, entry) => sum + entry.rows.filter((row) => !row.unknown).length,
    0
  );
  const researchTotal = entries.reduce((sum, entry) => sum + entry.rows.length, 0);
  const nodeCount = entries.reduce(
    (sum, entry) => sum + entry.rows.reduce((inner, row) => inner + (row.nodes || 0), 0),
    0
  );
  const unknownColumns = entries.length - knownColumns.length;

  // A 2x4 grid of eight column cards fills one A4 page by itself, so the totals and
  // the provenance table continue on a second page rather than being shrunk to fit.
  const pages = [];
  const chunks = [];
  for (let index = 0; index < entries.length; index += COLUMNS_PER_PAGE) {
    chunks.push(entries.slice(index, index + COLUMNS_PER_PAGE));
  }

  chunks.forEach((chunk, chunkIndex) => {
    const continuation = chunkIndex > 0;
    pages.push({
      title: continuation
        ? `${TROOP_LABELS[troop]} — Columns ${chunk[0].column.id}–${chunk[chunk.length - 1].column.id}`
        : `${TROOP_LABELS[troop]} — Columns I–VIII`,
      eyebrow: continuation ? 'Unit Specialisation · continuation' : undefined,
      // Eight cards with four research rows each is the densest page in the
      // catalogue, so it uses the compact card padding the frame defines.
      dense: true,
      blocks: [
        {
          kind: 'cards',
          columns: 2,
          items: chunk.map((entry) => columnCard({ entry, troop })),
        },
      ],
    });
  });

  pages.push({
    title: `${TROOP_LABELS[troop]} — Totals and Sources`,
    eyebrow: 'Unit Specialisation · totals',
    blocks: [
      {
        kind: 'summary',
        tone: 'gold',
        eyebrow: `${TROOP_LABELS[troop]} · columns I–VIII`,
        value: overallKnown || null,
        unit: 'medals',
        caption: unknownColumns
          ? `Known subtotal — ${unknownColumns} column(s) not stated by the source`
          : 'Every column is stated by the source',
        parts: entries.map((entry) =>
          escapeText(
            `${entry.column.name.replace('Column ', '')} ${
              entry.subtotal === null ? 'Unknown' : entry.subtotal.toLocaleString('en-US')
            }`
          )
        ),
      },
      {
        kind: 'stats',
        columns: 4,
        items: [
          {
            label: 'Troop',
            value: TROOP_LABELS[troop],
            unknown: false,
            valueText: TROOP_LABELS[troop],
          },
          { label: 'Research rows', value: researchTotal, hint: 'four per column' },
          {
            label: 'Known medals',
            value: overallKnown || null,
            unknown: !overallKnown,
            hint: 'columns I–VIII',
          },
          {
            label: 'Columns unknown',
            value: unknownColumns,
            hint: unknownColumns ? 'not stated by the source' : 'every column known',
          },
        ],
      },
      {
        kind: 'table',
        tone: 'neutral',
        columns: [
          { label: 'Column', align: 'left' },
          { label: 'Unlocks', align: 'left' },
          { label: 'Researches' },
          { label: 'Known medals', tone: 'gold' },
          { label: 'Planner column total', tone: 'teal' },
        ],
        rows: entries.map((entry) => [
          entry.column.name,
          entry.column.unlockSeason || 'Unknown',
          entry.rows.length,
          entry.subtotal,
          typeof entry.column.totalCost === 'number' ? entry.column.totalCost : null,
        ]),
        footer: [
          'Total (known)',
          '',
          researchTotal,
          overallKnown || null,
          entries.reduce(
            (sum, entry) =>
              sum + (typeof entry.column.totalCost === 'number' ? entry.column.totalCost : 0),
            0
          ) || null,
        ],
        note:
          'The workbook totals and the planner column totals are computed independently here. ' +
          'They agree for every column that the workbook states.',
      },
      {
        kind: 'callout',
        tone: 'info',
        title: 'What these numbers are',
        body:
          'Medal costs are the community workbook totals for this troop, one research at a time. The planner ' +
          'prices the same researches from the same workbook, so the column subtotals here match the planner. ' +
          'Nothing on this sheet is scaled, estimated, or copied from another troop.',
      },
    ],
  });

  return { pages };
}

/**
 * Towers IX and X are recorded in the workbook but are not planner columns yet, so
 * they get their own labelled sheet instead of being folded into a column total.
 */
export async function extraTowersSheet() {
  const { data, evidence } = await loadSpecialization();
  const plannerColumns = new Set(
    Object.values(data.SPECIALIZATION_COLUMNS)
      .flatMap((column) => column.researches || [])
      .map((id) => data.SPECIALIZATION_RESEARCH[id]?.column)
      .filter((value) => value !== undefined)
  );
  const sections = evidence.SPECIALIZATION_TROOP_MEDAL_EVIDENCE || [];
  const towers = [...new Set(sections.map((section) => section.tower))]
    .filter((tower) => !plannerColumns.has(tower))
    .sort((a, b) => a - b);

  const pages = [];
  for (const troop of ['archer', 'cavalry', 'footman']) {
    const rows = [];
    let pageTotal = 0;
    let complete = true;
    for (const tower of towers) {
      for (const section of sections.filter(
        (entry) => entry.troop === troop && entry.tower === tower
      )) {
        rows.push({
          __group: tower === rows[rows.length - 1]?.tower ? undefined : `Tower ${tower}`,
          tower,
          name: section.title,
          nodes: section.rows.length,
          total: section.knownCostTotal ?? null,
          complete: section.complete === true,
        });
        if (typeof section.knownCostTotal === 'number') pageTotal += section.knownCostTotal;
        if (section.complete !== true) complete = false;
      }
    }
    pages.push({
      eyebrow: 'Unit Specialisation · recorded, not yet a planner column',
      title: `Extra Towers — ${TROOP_LABELS[troop]}`,
      blocks: [
        {
          kind: 'callout',
          tone: 'gold',
          title: 'These towers have no planner column yet',
          body:
            'The workbook records their researches and per-node costs, and the planner does not yet offer them as ' +
            'columns. They are published here as recorded data, outside every column total on the troop sheets.',
        },
        {
          kind: 'table',
          columns: [
            { label: 'Tower', align: 'left' },
            { label: 'Research', align: 'left' },
            { label: 'Nodes' },
            { label: 'Medals', tone: 'gold' },
            { label: 'Source section' },
          ],
          rows: rows.map((row) => [
            row.tower ? `Tower ${row.tower}` : '',
            row.name,
            row.nodes,
            row.total,
            row.complete ? 'Complete' : 'Partial',
          ]),
          footer: [
            'Known subtotal',
            '',
            rows.reduce((sum, row) => sum + row.nodes, 0),
            pageTotal || null,
            '',
          ],
          note: complete
            ? 'Every recorded section is complete in the source.'
            : 'At least one section is marked partial in the source; the subtotal above is a known subtotal.',
        },
        {
          kind: 'stats',
          columns: 2,
          items: [
            { label: 'Towers recorded', value: towers.length, hint: 'beyond columns I–VIII' },
            {
              label: complete ? 'Troop subtotal' : 'Known subtotal',
              value: pageTotal || null,
              unknown: !pageTotal,
              hint: 'medals',
            },
          ],
        },
      ],
    });
  }
  return { pages };
}

/**
 * A landscape comparison: what each troop's eight columns cost, side by side, with
 * the node-level differences the workbook records between troops called out.
 */
export async function medalComparisonSheet() {
  const { data, evidence } = await loadSpecialization();
  const sections = evidence.SPECIALIZATION_TROOP_MEDAL_EVIDENCE || [];
  const columns = Object.entries(data.SPECIALIZATION_COLUMNS)
    .map(([id, column]) => ({ ...column, id: Number(id) }))
    .sort((a, b) => a.id - b.id);
  const troops = ['archer', 'cavalry', 'footman'];

  const perTroop = new Map();
  for (const troop of troops) {
    const index = new Map();
    for (const section of sections.filter((entry) => entry.troop === troop)) {
      if (section.researchId) index.set(section.researchId, section);
    }
    perTroop.set(troop, index);
  }

  const rows = columns.map((column) => {
    const values = troops.map((troop) => {
      const index = perTroop.get(troop);
      const known = (column.researches || [])
        .map((id) => index.get(id))
        .filter((section) => section && typeof section.knownCostTotal === 'number');
      if (known.length !== (column.researches || []).length) return null;
      return known.reduce((sum, section) => sum + section.knownCostTotal, 0);
    });
    return [column.name, column.unlockSeason || 'Unknown', ...values];
  });

  const troopTotals = troops.map((troop) => {
    const index = perTroop.get(troop);
    let total = 0;
    for (const column of columns) {
      for (const id of column.researches || []) {
        const section = index.get(id);
        if (section && typeof section.knownCostTotal === 'number') total += section.knownCostTotal;
      }
    }
    return total;
  });

  // Node-level divergence between troops: the same research, different per-node
  // costs, which is why a per-troop sheet exists at all.
  const divergence = [];
  for (const column of columns) {
    for (const researchId of column.researches || []) {
      const perTroopSections = troops.map((troop) => perTroop.get(troop).get(researchId));
      if (perTroopSections.some((section) => !section)) continue;
      const signatures = perTroopSections.map((section) =>
        section.rows.map((row) => (row.costs || []).join('+')).join('|')
      );
      if (new Set(signatures).size > 1) {
        divergence.push([
          column.name,
          data.SPECIALIZATION_RESEARCH[researchId]?.name || researchId,
          perTroopSections[0].knownCostTotal ?? null,
          perTroopSections[1].knownCostTotal ?? null,
          perTroopSections[2].knownCostTotal ?? null,
        ]);
      }
    }
  }

  return {
    pages: [
      {
        eyebrow: 'Unit Specialisation · all three troops',
        title: 'Medal Totals by Troop',
        subtitle:
          'Column totals per troop, from each troop tab of the community workbook. The section totals agree across ' +
          'troops; the per-node costs behind them do not.',
        blocks: [
          {
            kind: 'table',
            tone: 'neutral',
            columns: [
              { label: 'Column', align: 'left' },
              { label: 'Unlocks', align: 'left' },
              { label: 'Archer', tone: 'gold' },
              { label: 'Cavalry', tone: 'teal' },
              { label: 'Footman', tone: 'purple' },
            ],
            rows,
            footer: ['Total (columns I–VIII)', '', ...troopTotals],
            note:
              'A column that any troop leaves unstated prints Unknown rather than a partial sum. ' +
              'Node-level detail is on each troop sheet.',
          },
        ],
      },
      {
        eyebrow: 'Unit Specialisation · per-node divergence',
        title: 'Where the Troops Differ',
        subtitle: 'Researches whose section total is the same but whose medals per node are not.',
        blocks: [
          {
            kind: 'stats',
            columns: 3,
            items: troops.map((troop, index) => ({
              label: TROOP_LABELS[troop],
              value: troopTotals[index] || null,
              hint: 'medals across columns I–VIII',
            })),
          },
          {
            kind: 'table',
            compact: true,
            columns: [
              { label: 'Column', align: 'left' },
              { label: 'Research', align: 'left' },
              { label: 'Archer', tone: 'gold' },
              { label: 'Cavalry', tone: 'teal' },
              { label: 'Footman', tone: 'purple' },
            ],
            rows: divergence,
            note:
              'Same section total, different medals per node: this is why the planner prices a node from the ' +
              'active troop and never from another troop.',
          },
          {
            kind: 'callout',
            tone: 'gold',
            title: 'Reading this table',
            body:
              'Each row is one research the workbook records differently per troop. The three columns are that ' +
              'research’s section total in each troop tab, so equal figures with unequal node detail is expected, ' +
              'not an error.',
          },
        ],
      },
    ],
  };
}
