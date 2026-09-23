#!/usr/bin/env node
// Generates the community PDF exports into dist/downloads/.
//
// Runs after `vite build` (so dist/ exists) and before `scripts/post-build.mjs`
// (so the size check and service-worker manifest walk see the files). PDFs are
// deliberately not precached — post-build's collector matches only
// css|js|webp|png|webmanifest, which is the right behaviour for download payloads.
//
// Usage:
//   node scripts/pdf/build.mjs                 # every export
//   node scripts/pdf/build.mjs --only artifacts heroes-by-season
//   node scripts/pdf/build.mjs --out tmp/pdf   # write somewhere other than dist

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadExportBranding } from './lib/env.mjs';
import { renderDocument } from './lib/layout.mjs';
import { renderPdfBatch } from './lib/render.mjs';
import { EXPORTS } from './manifest.mjs';

const REPO_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

function parseArgs(argv) {
  const options = { only: null, out: path.join(REPO_ROOT, 'dist', 'downloads') };
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
    }
  }
  return options;
}

const options = parseArgs(process.argv.slice(2));
const selected = options.only
  ? EXPORTS.filter((entry) => options.only.includes(entry.id))
  : EXPORTS;

if (options.only && selected.length !== options.only.length) {
  const known = new Set(EXPORTS.map((entry) => entry.id));
  const unknown = options.only.filter((id) => !known.has(id));
  throw new Error(`Unknown export id(s): ${unknown.join(', ')}`);
}

console.log(`Building ${selected.length} PDF export(s) into ${path.relative(REPO_ROOT, options.out)}`);

const jobs = [];
const failures = [];
const summaries = [];

for (const entry of selected) {
  try {
    const document = await entry.build();
    // Each document carries the same branding as the site's CSV and PNG exports.
    const { branding } = await loadExportBranding({});
    const html = renderDocument({
      branding,
      eyebrow: document.eyebrow,
      title: document.title,
      subtitle: document.subtitle,
      meta: document.meta || [],
      // Builders return '' for conditionally-omitted sections.
      sections: (document.sections || []).filter(Boolean),
    });
    jobs.push({
      id: entry.id,
      filename: document.filename,
      html,
      branding,
      title: document.title,
    });
    summaries.push({
      id: entry.id,
      filename: document.filename,
      title: document.title,
      eyebrow: document.eyebrow || '',
      subtitle: document.subtitle || '',
      meta: document.meta || [],
      bytes: 0,
    });
  } catch (error) {
    failures.push({ id: entry.id, message: error.message });
    console.error(`  ✗ ${entry.id}: ${error.message}`);
  }
}

if (jobs.length) {
  const results = await renderPdfBatch(jobs, { outputDir: options.out });
  const byId = new Map(results.map((result) => [result.id, result]));
  summaries.forEach((summary) => {
    summary.bytes = byId.get(summary.id)?.bytes ?? 0;
  });

  const totalBytes = summaries.reduce((sum, summary) => sum + summary.bytes, 0);
  console.log('');
  summaries
    .slice()
    .sort((a, b) => a.filename.localeCompare(b.filename))
    .forEach((summary) => {
      const kib = (summary.bytes / 1024).toFixed(1);
      console.log(`  ${summary.filename.padEnd(40)} ${kib.padStart(8)} KiB`);
    });
  console.log(`  ${'TOTAL'.padEnd(40)} ${(totalBytes / 1024).toFixed(1).padStart(8)} KiB`);

  // Consumed by downloads.html at runtime for file sizes and the built date, so the
  // hub never advertises a file that did not ship.
  const manifestPath = path.join(options.out, 'downloads.json');
  fs.writeFileSync(
    manifestPath,
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        totalBytes,
        exports: summaries,
      },
      null,
      2
    )}\n`
  );
  console.log(`  wrote ${path.relative(REPO_ROOT, manifestPath)}`);
}

if (failures.length) {
  console.error(`\n${failures.length} export(s) failed: ${failures.map((f) => f.id).join(', ')}`);
  process.exitCode = 1;
} else {
  console.log(`\n${jobs.length} PDF export(s) generated.`);
}
