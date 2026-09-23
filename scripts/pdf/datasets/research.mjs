// Research cost export. Source: database/codex/research-costs.txt, the richest
// research table in the repo (1,036 rows across 36 trees) and the only one that
// carries gem and time data alongside the medal ladders.

import { parseLevelValues, readCodexDataset } from '../lib/codex.mjs';
import { bars, callout, formatDuration, formatNumber, kpis, section, table } from '../lib/layout.mjs';

const titleCase = (value) =>
  String(value || '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (char) => char.toUpperCase());

function groupByTree(rows) {
  const trees = new Map();
  rows.forEach((row) => {
    const name = row.treeName || 'Unnamed tree';
    if (!trees.has(name)) {
      trees.set(name, { name, season: row.season || '—', nodes: [] });
    }
    trees.get(name).nodes.push(row);
  });
  return [...trees.values()];
}

export async function researchCosts() {
  const dataset = readCodexDataset('research-costs');
  if (!dataset.rows.length) {
    throw new Error('research-costs.txt has no data rows; refusing to render an empty table');
  }
  const trees = groupByTree(dataset.rows);

  const treeStats = trees.map((tree) => {
    const medals = tree.nodes.reduce((sum, node) => sum + (Number(node.totalMedals) || 0), 0);
    const gems = tree.nodes.reduce((sum, node) => sum + (Number(node.gems) || 0), 0);
    const seconds = tree.nodes.reduce((sum, node) => sum + (Number(node.timeSec) || 0), 0);
    const withTime = tree.nodes.filter((node) => Number(node.timeSec) > 0).length;
    const withGems = tree.nodes.filter((node) => Number(node.gems) > 0).length;
    return { ...tree, medals, gems, seconds, withTime, withGems };
  });

  const totals = treeStats.reduce(
    (acc, tree) => ({
      nodes: acc.nodes + tree.nodes.length,
      medals: acc.medals + tree.medals,
      gems: acc.gems + tree.gems,
      seconds: acc.seconds + tree.seconds,
    }),
    { nodes: 0, medals: 0, gems: 0, seconds: 0 }
  );

  const timeCoverage = dataset.rows.filter((row) => Number(row.timeSec) > 0).length;
  const gemCoverage = dataset.rows.filter((row) => Number(row.gems) > 0).length;

  const detailSections = treeStats.map((tree) =>
    section(
      `${tree.name} · ${tree.season}`,
      table({
        columns: [
          { label: 'Node', align: 'left' },
          { label: 'Troop', align: 'left' },
          { label: 'Max lv' },
          { label: 'Medals per level', align: 'left' },
          { label: 'Total medals' },
          { label: 'Gems' },
          { label: 'Time' },
        ],
        rows: tree.nodes.map((node) => {
          const levels = parseLevelValues(node.values);
          const rendered = levels.length
            ? levels.map((value) => (value === null ? '–' : formatNumber(value))).join(' / ')
            : '—';
          return [
            node.nodeName,
            node.troop || '—',
            node.maxLevel,
            rendered,
            Number(node.totalMedals) || 0,
            Number(node.gems) || 0,
            Number(node.timeSec) > 0 ? formatDuration(node.timeSec) : null,
          ];
        }),
        caption: `${tree.nodes.length} nodes. A dash in the medal ladder marks a level the source leaves blank.`,
      })
    )
  );

  return {
    filename: 'roc-research-costs.pdf',
    eyebrow: 'Research',
    title: 'Research costs by tree',
    subtitle:
      'Every research node with its medal ladder, gem cost and research time, grouped by tree. Credit: Raven G, Ash Roe and the riseofcastles.net community.',
    meta: [
      { label: 'Trees', value: String(trees.length) },
      { label: 'Nodes', value: String(dataset.rows.length) },
      { label: 'Nodes with time', value: `${timeCoverage} of ${dataset.rows.length}` },
      { label: 'Nodes with gems', value: `${gemCoverage} of ${dataset.rows.length}` },
    ],
    sections: [
      kpis([
        { label: 'Trees', value: trees.length },
        { label: 'Nodes', value: dataset.rows.length },
        { label: 'Total medals', value: totals.medals },
        { label: 'Total gems', value: totals.gems },
        { label: 'Total research time', value: formatDuration(totals.seconds), raw: true },
      ]),
      timeCoverage < dataset.rows.length
        ? callout({
            title: 'Time and gem figures are partial',
            body: `${timeCoverage} of ${dataset.rows.length} nodes publish a research time and ${gemCoverage} publish a gem cost. Nodes without a published figure show "not supplied" rather than an estimate, so a tree time total is a lower bound.`,
          })
        : '',
      section(
        'Medal cost per tree',
        bars({
          items: treeStats
            .slice()
            .sort((a, b) => b.medals - a.medals)
            .slice(0, 20)
            .map((tree) => ({ label: tree.name, value: tree.medals })),
        })
      ),
      section(
        'Tree summary',
        table({
          columns: [
            { label: 'Tree', align: 'left' },
            { label: 'Season', align: 'left' },
            { label: 'Nodes' },
            { label: 'Total medals' },
            { label: 'Total gems' },
            { label: 'Time', align: 'left' },
          ],
          rows: treeStats.map((tree) => [
            tree.name,
            tree.season,
            tree.nodes.length,
            tree.medals,
            tree.gems,
            tree.seconds > 0 ? formatDuration(tree.seconds) : null,
          ]),
          footer: [
            'All trees',
            '—',
            totals.nodes,
            totals.medals,
            totals.gems,
            formatDuration(totals.seconds),
          ],
          caption:
            'Tree totals sum only the figures the source publishes, so they are lower bounds where coverage is partial.',
        })
      ),
      ...detailSections,
    ],
  };
}
