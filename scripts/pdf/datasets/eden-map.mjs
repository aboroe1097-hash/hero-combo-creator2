// Eden map structure export. Source: js/eden-datasets.payload.json, which is a
// gzip+base64 envelope around { catalog, sectors, overlays }. The payload is
// decoded here rather than fetched, so the export does not need a browser.

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { bars, callout, formatNumber, kpis, section, table } from '../lib/layout.mjs';

const REPO_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

// Accepts either the gzip envelope or a plain JSON object, matching the loader's
// own tolerance (see tests/unit/eden-season-picker.test.mjs).
function decodePayload(file) {
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (raw && raw.encoding === 'gzip-base64' && typeof raw.payload === 'string') {
    const inflated = zlib.gunzipSync(Buffer.from(raw.payload, 'base64')).toString('utf8');
    return JSON.parse(inflated);
  }
  return raw;
}

export async function edenMapStructures() {
  const file = path.join(REPO_ROOT, 'js', 'eden-datasets.payload.json');
  if (!fs.existsSync(file)) throw new Error(`Missing Eden dataset payload at ${file}`);
  const store = decodePayload(file);
  const datasets = Object.keys(store.sectors || {});
  if (!datasets.length) throw new Error('Eden payload contains no datasets');

  let totalStructures = 0;
  const perDataset = datasets.map((datasetId) => {
    const sectors = store.sectors[datasetId] || {};
    const sectorEntries = Object.entries(sectors);
    const structures = sectorEntries.flatMap(([, sector]) => sector.structures || []);
    totalStructures += structures.length;

    const points = structures.reduce((sum, item) => sum + (Number(item.points) || 0), 0);
    const typeCounts = new Map();
    structures.forEach((item) => {
      const type = item.type || '—';
      typeCounts.set(type, (typeCounts.get(type) || 0) + 1);
    });

    const catalogEntry = (store.catalog || []).find((entry) => entry.id === datasetId) || {};
    return { datasetId, sectorEntries, structures, points, typeCounts, catalogEntry };
  });

  const catalogRows = (store.catalog || []).map((entry) => [
    entry.id,
    entry.wonderVersion || '—',
    entry.sectorMode || '—',
    entry.source || '—',
  ]);

  const datasetSections = perDataset.flatMap((dataset) => [
    section(
      `${dataset.datasetId} · sector breakdown`,
      table({
        columns: [
          { label: 'Sector', align: 'left' },
          { label: 'Label', align: 'left' },
          { label: 'Structures' },
          { label: 'Total points' },
        ],
        rows: dataset.sectorEntries.map(([key, sector]) => {
          const sectorStructures = sector.structures || [];
          return [
            key,
            sector.label || '—',
            sectorStructures.length,
            sectorStructures.reduce((sum, item) => sum + (Number(item.points) || 0), 0),
          ];
        }),
        footer: [
          'All sectors',
          '—',
          dataset.structures.length,
          dataset.points,
        ],
        caption: `${dataset.datasetId}: ${dataset.structures.length} structures across ${dataset.sectorEntries.length} sectors.`,
      })
    ),
    section(
      `${dataset.datasetId} · structure types`,
      table({
        columns: [
          { label: 'Type', align: 'left' },
          { label: 'Count' },
          { label: 'Share', align: 'left' },
        ],
        rows: [...dataset.typeCounts.entries()]
          .sort((a, b) => b[1] - a[1])
          .map(([type, count]) => [
            type,
            count,
            `${((count / dataset.structures.length) * 100).toFixed(1)}%`,
          ]),
        caption: 'Ownership is not part of the dataset — guild assignment is entered per plan, not sourced.',
      })
    ),
  ]);

  return {
    filename: 'roc-eden-map-structures.pdf',
    eyebrow: 'Eden',
    title: 'Map structures by sector',
    subtitle:
      'Every placed Eden structure per dataset and sector, with type histograms and point totals for planning marches and objectives.',
    meta: [
      { label: 'Datasets', value: String(datasets.length) },
      { label: 'Structures', value: String(totalStructures) },
      { label: 'Payload built', value: String(store.builtAt || '—').slice(0, 10) },
    ],
    sections: [
      kpis([
        { label: 'Datasets', value: datasets.length },
        { label: 'Structures', value: totalStructures },
        {
          label: 'Sectors (largest)',
          value: Math.max(...perDataset.map((dataset) => dataset.sectorEntries.length)),
        },
        { label: 'Total points', value: perDataset.reduce((sum, dataset) => sum + dataset.points, 0) },
      ]),
      callout({
        title: 'Coordinates are not listed here',
        body: `This export summarises ${formatNumber(
          totalStructures
        )} structures by sector and type. Per-structure coordinates are available in the Eden map planner, where they are plotted rather than tabulated.`,
        tone: 'info',
      }),
      section(
        'Structures per dataset',
        bars({
          items: perDataset.map((dataset) => ({
            label: dataset.datasetId,
            value: dataset.structures.length,
          })),
        })
      ),
      section(
        'Dataset catalogue',
        table({
          columns: [
            { label: 'Dataset', align: 'left' },
            { label: 'Wonder version', align: 'left' },
            { label: 'Sector mode', align: 'left' },
            { label: 'Source', align: 'left' },
          ],
          rows: catalogRows,
          caption: 'Each dataset is a separate season map; the planner switches between them.',
        })
      ),
      ...datasetSections,
    ],
  };
}
