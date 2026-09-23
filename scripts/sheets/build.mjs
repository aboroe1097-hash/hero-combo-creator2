#!/usr/bin/env node
// Reference-sheet build (plan §3).
//
//   node scripts/sheets/build.mjs                    # every sheet plus bundles
//   node scripts/sheets/build.mjs --only <sheet-id>  # selected sheet + affected bundles
//   node scripts/sheets/build.mjs --out tmp/sheets   # write somewhere other than dist
//   node scripts/sheets/build.mjs --force            # ignore the artifact cache
//   node scripts/sheets/build.mjs --no-png           # PDFs only (fast iteration)
//
// Flow: canonical data -> adapter -> template -> PDF/PNG -> validation -> catalogue.
// Everything renders into a staging directory first; the catalogue is written only
// after every selected sheet has produced and validated all of its artifacts, so a
// failed build can never advertise an incomplete file.

import fs from 'node:fs';
import path from 'node:path';
import { loadExportBranding } from '../pdf/lib/env.mjs';
import {
  artBudgetMm,
  pngSize,
  renderSheetDocument,
  sheetPage,
  thumbnailSize,
} from './lib/document.mjs';
import { renderBlocks } from './lib/templates/blocks.mjs';
import { SHEET_ART, artFor } from './lib/art.mjs';
import { getTemplate } from './lib/templates/index.mjs';
import { collectMeasurements, validateSheet, assertNoBlankZeros } from './lib/validate.mjs';
import { launchChromium, renderSheet } from './lib/render.mjs';
import {
  CACHE_ROOT,
  RENDERER_VERSION,
  REPO_ROOT,
  cacheDirFor,
  readCache,
  restoreCache,
  sheetCacheKey,
  writeCache,
} from './lib/cache.mjs';
import {
  BUNDLES,
  LEGACY_EXPORT_IDS,
  SHEETS,
  orderedSheets,
  sheetUrl,
  toolById,
  toolLabel,
} from './registry.mjs';

const DEFAULT_OUT = path.join(REPO_ROOT, 'dist', 'downloads');
const SHEET_LANGUAGE = 'en';

function parseArgs(argv) {
  const options = { only: null, out: DEFAULT_OUT, force: false, png: true, json: null };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--only') {
      options.only = [];
      while (argv[index + 1] && !argv[index + 1].startsWith('--')) {
        options.only.push(argv[index + 1]);
        index += 1;
      }
    } else if (arg === '--out') {
      options.out = path.resolve(REPO_ROOT, argv[index + 1]);
      index += 1;
    } else if (arg === '--force') {
      options.force = true;
    } else if (arg === '--no-png') {
      options.png = false;
    } else if (arg === '--json') {
      options.json = path.resolve(REPO_ROOT, argv[index + 1]);
      index += 1;
    }
  }
  return options;
}

async function loadAdapter(reference) {
  const [moduleName, exportName] = String(reference).split('#');
  if (!moduleName || !exportName) {
    throw new Error(`Adapter reference must look like "module#exportName", got "${reference}"`);
  }
  const modulePath = new URL(`./adapters/${moduleName}.mjs`, import.meta.url);
  let module;
  try {
    module = await import(modulePath.href);
  } catch (error) {
    throw new Error(`Cannot load adapter ${reference}: ${error.message}`);
  }
  const adapter = module[exportName];
  if (typeof adapter !== 'function') {
    throw new Error(`Adapter ${reference} is not exported as a function`);
  }
  return adapter;
}

function sheetMeta(sheet) {
  const tool = toolById(sheet.toolId);
  return {
    id: sheet.id,
    title: sheet.title,
    eyebrow: sheet.eyebrow || tool.category,
    category: sheet.category,
    template: sheet.template,
    orientation: sheet.orientation || getTemplate(sheet.template).defaultOrientation,
    order: sheet.order,
    toolId: sheet.toolId,
    toolLabel: toolLabel(tool),
    toolUrl: sheetUrl(tool),
    sourceLabel: sheet.sourceLabel || '',
    sourceRevision: sheet.sourceRevision || '',
    language: SHEET_LANGUAGE,
    pageSize: pngSize(sheet.orientation || 'portrait'),
    // The registry names an illustration; an unknown name is treated as raw SVG so
    // an adapter can supply its own art without touching this file.
    art: sheet.art ? (SHEET_ART[sheet.art] ? artFor(sheet.art) : sheet.art) : '',
    artHeightMm: sheet.artHeightMm || 0,
  };
}

/** Build one sheet's page models without rendering: used by sheets and bundles. */
async function buildModels(sheet, branding, memo) {
  if (memo.has(sheet.id)) return memo.get(sheet.id);
  const adapter = await loadAdapter(sheet.adapter);
  const model = await adapter({
    ...(sheet.adapterArgs || {}),
    sheet,
    branding,
  });
  if (!model || typeof model !== 'object') {
    throw new Error(`Adapter ${sheet.adapter} returned no model for ${sheet.id}`);
  }
  assertNoBlankZeros(model, { sheetId: sheet.id });
  const template = getTemplate(sheet.template);
  const meta = sheetMeta(sheet);
  // `sheetMeta` resolves the registry's art name into SVG; a model may supply its
  // own markup, but the raw name must never reach the page.
  const pages = template.render({ ...meta, art: meta.art || model.art || '' }, model);
  if (!pages.length) throw new Error(`Sheet ${sheet.id} produced no pages`);
  const value = { sheet, meta, model, pages };
  memo.set(sheet.id, value);
  return value;
}

function documentFor({ sheet, meta, pages, branding }) {
  const bodies = pages.map((page, index) => {
    return renderPageBlock({ sheet: meta, branding, page, index, pageCount: pages.length });
  });
  return renderSheetDocument({ branding, sheet: meta, pages: bodies });
}

function renderPageBlock({ sheet, branding, page, index, pageCount }) {
  return sheetPage({
    orientation: sheet.orientation,
    branding,
    sheet,
    pageIndex: index,
    pageCount,
    header: page.header,
    body: page.body,
    dense: page.dense,
  });
}

function contentsPage({ bundle, constituents, branding, index, pageCount, sheetMetaById }) {
  const rows = constituents.map((entry) => {
    const meta = sheetMetaById.get(entry.id);
    return [meta.title, meta.toolLabel, `${meta.pageCount}`, meta.sourceLabel];
  });
  const body = `<div class="sh-grid sh-grid--1">${renderBlocks([
    {
      kind: 'table',
      columns: [
        { label: 'Sheet', align: 'left' },
        { label: 'Tool', align: 'left' },
        { label: 'Pages' },
        { label: 'Source', align: 'left' },
      ],
      rows,
      note: 'Every page of these sheets is included after this contents page.',
    },
  ])}</div>`;
  return sheetPage({
    orientation: 'portrait',
    branding,
    sheet: {
      id: bundle.id,
      toolLabel: 'Community Downloads',
      toolUrl: 'https://roc-vts.com/downloads.html',
      sourceLabel: 'RoC VTS Toolkit reference sheets',
      sourceRevision: '',
    },
    pageIndex: index,
    pageCount,
    header: {
      eyebrow: 'Reference sheets · bundle',
      title: bundle.title,
      subtitle: `Contents · ${constituents.length} sheets, ${constituents.reduce(
        (sum, entry) => sum + entry.pageCount,
        0
      )} pages`,
      meta: [],
      art: '',
    },
    body,
  });
}

async function buildSheet({ sheet, branding, options, browser, stagingDir, report, memo }) {
  const meta = sheetMeta(sheet);
  const key = sheetCacheKey(sheet, branding);
  const cached = options.force || !options.png ? null : readCache(sheet.id, key);

  if (cached) {
    restoreCache(cached.dir, cached.manifest, stagingDir);
    report.push({ ...cached.manifest, id: sheet.id, cached: true });
    return { meta, manifest: cached.manifest, pages: cached.manifest.pageCount, cached: true };
  }

  const { pages } = await buildModels(sheet, branding, memo);
  const html = documentFor({ sheet, meta, pages, branding });
  const pageCount = pages.length;

  const artifacts = await renderSheet({
    browser,
    html,
    pageCount,
    orientation: meta.orientation,
    outputDir: stagingDir,
    id: sheet.id,
    writePng: options.png,
  });

  if (options.png) {
    const measurements = await collectMeasurements(browser, html, meta.orientation);
    validateSheet({
      sheet,
      orientation: meta.orientation,
      measurements,
      pdfPages: artifacts.pdf.pages,
      artifacts,
      pageCount,
    });
  }

  const manifest = {
    id: sheet.id,
    title: meta.title,
    eyebrow: meta.eyebrow,
    category: meta.category,
    toolId: meta.toolId,
    toolLabel: meta.toolLabel,
    toolUrl: meta.toolUrl,
    template: meta.template,
    orientation: meta.orientation,
    order: meta.order,
    language: meta.language,
    pageCount,
    sourceLabel: meta.sourceLabel,
    sourceRevision: meta.sourceRevision,
    generatedBy: RENDERER_VERSION,
    cacheKey: key,
    pdfUrl: `downloads/${artifacts.pdf.filename}`,
    pdfBytes: artifacts.pdf.bytes,
    pngs: artifacts.pngs.map((entry) => ({
      filename: entry.filename,
      url: `downloads/${entry.filename}`,
      bytes: entry.bytes,
      width: entry.width,
      height: entry.height,
    })),
    thumbnails: artifacts.thumbnails.map((entry) => ({
      filename: entry.filename,
      url: `downloads/${entry.filename}`,
      bytes: entry.bytes,
      width: entry.width,
      height: entry.height,
    })),
  };
  manifest.files = [
    { filename: `${sheet.id}.pdf`, bytes: artifacts.pdf.bytes, kind: 'pdf' },
    ...manifest.pngs.map((entry) => ({
      filename: entry.filename,
      bytes: entry.bytes,
      kind: 'png',
    })),
    ...manifest.thumbnails.map((entry) => ({
      filename: entry.filename,
      bytes: entry.bytes,
      kind: 'thumbnail',
    })),
  ];

  writeCache(sheet.id, key, manifest, stagingDir);
  report.push({ ...manifest, cached: false });
  return { meta, manifest, pages: pageCount, cached: false };
}

async function buildBundle({
  bundle,
  branding,
  options,
  browser,
  stagingDir,
  memo,
  sheetMetaById,
  report,
}) {
  const constituents = bundle.sheetIds.map((id) => sheetMetaById.get(id));
  if (constituents.some((entry) => !entry)) {
    throw new Error(`Bundle ${bundle.id} references an unbuilt sheet`);
  }
  const orientations = new Set(constituents.map((entry) => entry.orientation));
  if (orientations.size > 1) {
    throw new Error(
      `Bundle ${bundle.id} mixes orientations (${[...orientations].join(', ')}); a bundle is one document`
    );
  }
  const orientation = constituents[0].orientation;

  const models = [];
  for (const id of bundle.sheetIds) {
    const sheet = SHEETS.find((entry) => entry.id === id);
    models.push(await buildModels(sheet, branding, memo));
  }

  const totalPages = models.reduce((sum, entry) => sum + entry.pages.length, 0) + 1;
  const blocks = [
    contentsPage({
      bundle,
      constituents,
      branding,
      index: 0,
      pageCount: totalPages,
      sheetMetaById,
    }),
  ];
  for (const entry of models) {
    entry.pages.forEach((page, index) => {
      blocks.push(
        renderPageBlock({
          sheet: entry.meta,
          branding,
          page: page,
          index: index + 1,
          pageCount: totalPages,
        })
      );
    });
  }
  const html = renderSheetDocument({
    branding,
    sheet: { id: bundle.id, title: bundle.title },
    pages: blocks,
  });

  const artifacts = await renderSheet({
    browser,
    html,
    pageCount: totalPages,
    orientation,
    outputDir: stagingDir,
    id: bundle.id,
    writePng: false,
  });

  const manifest = {
    id: bundle.id,
    kind: 'sheets',
    title: bundle.title,
    category: bundle.category,
    order: bundle.order,
    orientation,
    language: SHEET_LANGUAGE,
    pageCount: totalPages,
    sheetIds: bundle.sheetIds.slice(),
    pdfUrl: `downloads/${artifacts.pdf.filename}`,
    pdfBytes: artifacts.pdf.bytes,
    files: [{ filename: `${bundle.id}.pdf`, bytes: artifacts.pdf.bytes, kind: 'pdf' }],
  };
  report.push(manifest);
  return manifest;
}

function readCatalogue(outDir) {
  const cataloguePath = path.join(outDir, 'downloads.json');
  if (!fs.existsSync(cataloguePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(cataloguePath, 'utf8'));
  } catch {
    return null;
  }
}

function publish({
  outDir,
  sheetManifests,
  bundleManifests,
  branding,
  selectedSheetIds,
  selectedBundleIds,
}) {
  const catalogue = readCatalogue(outDir) || {
    generatedAt: new Date().toISOString(),
    totalBytes: 0,
    exports: [],
  };

  // A full build owns the catalogue: every sheet entry is replaced by this run's
  // output. A --only build is additive and keeps the entries it did not touch, so a
  // one-sheet regeneration never drops the rest of the catalogue.
  const partial = Boolean(selectedSheetIds || selectedBundleIds);
  const keep = (entry, selected) => partial && !(selected || new Set()).has(entry.id);
  const previousSheets = partial && Array.isArray(catalogue.sheets) ? catalogue.sheets : [];
  const previousBundles = partial && Array.isArray(catalogue.bundles) ? catalogue.bundles : [];

  const mergedSheets = [
    ...previousSheets.filter((entry) => keep(entry, selectedSheetIds)),
    ...sheetManifests,
  ].sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.id.localeCompare(b.id));

  const mergedBundles = [
    ...previousBundles.filter((entry) => keep(entry, selectedBundleIds)),
    ...bundleManifests,
  ].sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.id.localeCompare(b.id));

  const sheetsBytes = mergedSheets.reduce(
    (total, entry) => total + (entry.files || []).reduce((sum, file) => sum + (file.bytes || 0), 0),
    0
  );
  const bundlesBytes = mergedBundles.reduce((total, entry) => total + (entry.pdfBytes || 0), 0);

  const next = {
    ...catalogue,
    // Sheet generation never rewrites the legacy export list; the PDF step owns it.
    exports: Array.isArray(catalogue.exports) ? catalogue.exports : [],
    sheetsGeneratedAt: new Date().toISOString(),
    sheets: mergedSheets,
    bundles: mergedBundles,
    sheetTotals: {
      sheets: mergedSheets.length,
      bundles: mergedBundles.length,
      pages: mergedSheets.reduce((total, entry) => total + (entry.pageCount || 0), 0),
      bytes: sheetsBytes + bundlesBytes,
    },
    legacyExportIds: LEGACY_EXPORT_IDS.slice(),
  };

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'downloads.json'), `${JSON.stringify(next, null, 2)}\n`);
  return next;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const ordered = orderedSheets();
  const selectedSheets = options.only
    ? ordered.filter((sheet) => options.only.includes(sheet.id))
    : ordered;

  if (options.only) {
    const known = new Set(ordered.map((sheet) => sheet.id));
    const unknown = options.only.filter((id) => !known.has(id));
    if (unknown.length) throw new Error(`Unknown sheet id(s): ${unknown.join(', ')}`);
    if (selectedSheets.length !== options.only.length) {
      throw new Error('Duplicate sheet ids in --only');
    }
  }

  // A selected build also rebuilds the bundles that contain any selected sheet.
  const selectedSheetIdSet = new Set(selectedSheets.map((sheet) => sheet.id));
  const selectedBundles = BUNDLES.filter(
    (bundle) => !options.only || bundle.sheetIds.some((id) => selectedSheetIdSet.has(id))
  );

  console.log(
    `Building ${selectedSheets.length} sheet(s) and ${selectedBundles.length} bundle(s) into ` +
      `${path.relative(REPO_ROOT, options.out)}`
  );
  if (!options.force) console.log(`  cache: ${path.relative(REPO_ROOT, CACHE_ROOT)}`);

  const stagingDir = path.join(options.out, '.staging');
  fs.rmSync(stagingDir, { recursive: true, force: true });
  fs.mkdirSync(stagingDir, { recursive: true });

  const { branding } = await loadExportBranding({});
  const browser = await launchChromium();
  const report = [];
  const failures = [];
  const memo = new Map();
  const sheetMetaById = new Map();
  const bundleManifests = [];

  try {
    for (const sheet of selectedSheets) {
      try {
        const result = await buildSheet({
          sheet,
          branding,
          options,
          browser,
          stagingDir,
          report,
          memo,
        });
        sheetMetaById.set(sheet.id, { ...result.meta, pageCount: result.pages });
      } catch (error) {
        failures.push({ id: sheet.id, message: error.message });
        console.error(`  ✗ ${sheet.id}: ${error.message}`);
      }
    }

    // Bundles need the page count of every constituent, including ones restored
    // from cache or built earlier in a partial run.
    for (const entry of report) {
      if (entry.id && !sheetMetaById.has(entry.id) && entry.pageCount !== undefined) {
        const sheet = SHEETS.find((candidate) => candidate.id === entry.id);
        if (sheet) sheetMetaById.set(sheet.id, { ...sheetMeta(sheet), pageCount: entry.pageCount });
      }
    }

    if (!failures.length) {
      for (const bundle of selectedBundles) {
        try {
          bundleManifests.push(
            await buildBundle({
              bundle,
              branding,
              options,
              browser,
              stagingDir,
              memo,
              sheetMetaById,
              report,
            })
          );
        } catch (error) {
          failures.push({ id: bundle.id, message: error.message });
          console.error(`  ✗ ${bundle.id}: ${error.message}`);
        }
      }
    }
  } finally {
    await browser.close();
  }

  if (failures.length) {
    fs.rmSync(stagingDir, { recursive: true, force: true });
    console.error(`\n${failures.length} sheet(s) failed; nothing was published.`);
    process.exitCode = 1;
    return;
  }

  // Publish: move the staged artifacts into place, then write the catalogue. An
  // unrelated entry from an earlier partial build is preserved, never dropped.
  for (const entry of fs.readdirSync(stagingDir)) {
    fs.copyFileSync(path.join(stagingDir, entry), path.join(options.out, entry));
  }
  fs.rmSync(stagingDir, { recursive: true, force: true });

  const sheetManifests = report.filter((entry) => entry.kind !== 'sheets');
  const catalogue = publish({
    outDir: options.out,
    sheetManifests,
    bundleManifests: bundleManifests,
    branding,
    selectedSheetIds: options.only ? selectedSheetIdSet : null,
    selectedBundleIds: options.only ? new Set(selectedBundles.map((bundle) => bundle.id)) : null,
  });

  console.log('');
  sheetManifests
    .slice()
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.id.localeCompare(b.id))
    .forEach((entry) => {
      const pdfKiB = ((entry.pdfBytes || 0) / 1024).toFixed(0);
      const pngKiB = (entry.pngs || []).reduce((sum, file) => sum + file.bytes, 0) / 1024;
      const thumbKiB = (entry.thumbnails || []).reduce((sum, file) => sum + file.bytes, 0) / 1024;
      console.log(
        `  ${entry.id.padEnd(34)} ${String(entry.pageCount).padStart(2)}p  ` +
          `pdf ${pdfKiB.padStart(4)}K  png ${pngKiB.toFixed(0).padStart(5)}K  thumb ${thumbKiB
            .toFixed(0)
            .padStart(4)}K${entry.cached ? '  (cached)' : ''}`
      );
    });
  bundleManifests.forEach((entry) => {
    console.log(
      `  ${entry.id.padEnd(34)} ${String(entry.pageCount).padStart(2)}p  ` +
        `pdf ${((entry.pdfBytes || 0) / 1024).toFixed(0).padStart(4)}K  bundle`
    );
  });
  console.log(
    `\n  catalogue: ${catalogue.sheetTotals.sheets} sheet(s), ${catalogue.sheetTotals.bundles} bundle(s), ` +
      `${catalogue.sheetTotals.pages} page(s), ${(catalogue.sheetTotals.bytes / 1024 / 1024).toFixed(2)} MiB`
  );

  if (options.json) {
    fs.writeFileSync(
      options.json,
      `${JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          sheets: sheetManifests,
          bundles: bundleManifests,
          totals: catalogue.sheetTotals,
          artBudget: { portrait: artBudgetMm('portrait'), landscape: artBudgetMm('landscape') },
          png: pngSize('portrait'),
          thumbnail: thumbnailSize('portrait'),
        },
        null,
        2
      )}\n`
    );
    console.log(`  wrote ${path.relative(REPO_ROOT, options.json)}`);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
