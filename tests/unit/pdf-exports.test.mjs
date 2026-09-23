// Contract for the community PDF exports: the catalogue is well formed, every
// builder yields a renderable document, and the hub page plus its build wiring
// stay registered. The PDF-level assertions only run when dist/ has been built,
// so the suite passes on a clean checkout.

import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { EXPORTS } from '../../scripts/pdf/manifest.mjs';
import { installDomStub } from '../../scripts/pdf/lib/env.mjs';
import { escapeHtml, formatDuration, formatNumber } from '../../scripts/pdf/lib/layout.mjs';

const repoRoot = fileURLToPath(new URL('../..', import.meta.url));
const read = (path) => readFileSync(join(repoRoot, path), 'utf8');
const exists = (path) => existsSync(join(repoRoot, path));

const packageJson = JSON.parse(read('package.json'));
const sizeSource = read('scripts/check-size.mjs');
const viteSource = read('vite.config.js');
const metadataSource = read('scripts/update-build-metadata.mjs');
const downloadsPage = read('downloads.html');
const downloadsScript = read('js/downloads.js');
const smokeSource = read('tests/production-smoke.spec.js');

test('the export catalogue is unique and well formed', () => {
  assert.ok(EXPORTS.length >= 14, `expected at least 14 exports, found ${EXPORTS.length}`);
  const ids = EXPORTS.map((entry) => entry.id);
  assert.equal(new Set(ids).size, ids.length, 'export ids must be unique');
  EXPORTS.forEach((entry) => {
    assert.match(entry.id, /^[a-z0-9-]+$/, `export id ${entry.id} must be kebab-case`);
    assert.equal(typeof entry.build, 'function', `${entry.id} must expose a builder`);
  });
});

test('every builder returns a renderable document with a PDF filename', async () => {
  installDomStub();
  for (const entry of EXPORTS) {
    const document = await entry.build();
    assert.ok(document, `${entry.id} returned nothing`);
    assert.match(
      document.filename,
      /^[a-z0-9-]+\.pdf$/,
      `${entry.id} must return a lowercase .pdf filename, got ${document.filename}`
    );
    assert.ok(document.title && document.title.length > 3, `${entry.id} needs a title`);
    assert.ok(Array.isArray(document.sections), `${entry.id} must return sections`);
  }
});

test('every document carries at least one section of real content', async () => {
  installDomStub();
  for (const entry of EXPORTS) {
    const document = await entry.build();
    const content = document.sections.filter((section) => section && section.trim().length);
    assert.ok(content.length > 0, `${entry.id} rendered no content sections`);
  }
});

test('data gaps are rendered explicitly instead of being interpolated', () => {
  // The layout renders an em dash for null and an explicit phrase for unknown
  // values, and gap callouts exist in the data. Assert the renderer keeps doing so.
  assert.equal(formatNumber(null), '—');
  assert.equal(formatNumber(undefined), '—');
  assert.equal(formatNumber(0), '0');
  assert.equal(formatNumber(1234567), '1,234,567');
  assert.equal(formatDuration(0), '—');
  assert.equal(formatDuration(86400 + 7200), '1d 2h');
  assert.equal(escapeHtml('<b>&"'), '&lt;b&gt;&amp;&quot;');
});

test('Community Downloads is a local-only, versioned standalone page', () => {
  assert.match(downloadsPage, /<meta charset="UTF-8"/u);
  const csp = downloadsPage.match(/http-equiv="Content-Security-Policy"[\s\S]*?content="([^"]+)"/u);
  assert.ok(csp, 'downloads.html must declare a CSP');
  assert.match(csp[1], /default-src 'self'/u);
  assert.match(csp[1], /script-src 'self'/u);
  assert.match(csp[1], /object-src 'none'/u);
  assert.match(downloadsPage, /<meta name="vts-app-version" content="\d+\.\d+\.\d+" \/>/u);
  assert.match(downloadsPage, /rel="canonical" href="https:\/\/roc-vts\.com\/downloads\.html"/u);
  assert.equal(/https?:\/\/(?!roc-vts\.com)[^\s"']+\.(?:js|css)/u.test(downloadsPage), false);
});

test('the hub loads its list from the generated manifest, not a hardcoded copy', () => {
  assert.match(downloadsScript, /downloads\/downloads\.json/u);
  assert.match(downloadsScript, /getElementById\('downloadsGroups'\)/u);
  assert.ok(
    /setAttribute\('role', 'alert'\)|role="alert"/u.test(downloadsScript) ||
      /role="alert"/u.test(downloadsPage),
    'the hub must surface a load failure to assistive tech'
  );
});

test('Community Downloads is registered across the build pipeline', () => {
  assert.match(viteSource, /downloads: resolve\(__dirname, 'downloads\.html'\)/u);
  assert.match(metadataSource, /'downloads\.html'/u);
  assert.match(sizeSource, /'downloads\.html': \{ desktop:/u);
  assert.match(smokeSource, /\/downloads\.html/u, 'the smoke suite must visit the hub page');
});

test('the build generates the PDFs into dist before post-build runs', () => {
  const buildScript = packageJson.scripts.build;
  const viteIndex = buildScript.indexOf('vite build');
  const pdfIndex = buildScript.indexOf('scripts/pdf/build.mjs');
  const postIndex = buildScript.indexOf('scripts/post-build.mjs');
  assert.ok(viteIndex >= 0 && pdfIndex >= 0 && postIndex >= 0, 'build chain is missing a step');
  assert.ok(
    viteIndex < pdfIndex && pdfIndex < postIndex,
    'PDF generation must run after vite build and before post-build'
  );
  assert.match(packageJson.scripts['pdf:build'], /scripts\/pdf\/build\.mjs/u);
});

test('size budgets were raised for the PDF payloads', () => {
  const media = Number(sizeSource.match(/totalMediaBytes: (\d+) \* 1024/u)?.[1]);
  const deploy = Number(sizeSource.match(/totalDeployBytes: (\d+) \* 1024/u)?.[1]);
  const files = Number(sizeSource.match(/deployFileCount: (\d+)/u)?.[1]);
  assert.ok(media > 18850, 'totalMediaBytes must cover the 14 PDFs');
  assert.ok(deploy > 32100, 'totalDeployBytes must cover the PDFs and the hub page');
  assert.ok(files > 733, 'deployFileCount must cover the PDFs and the hub page');
});

test('generated PDFs are real, branded documents when dist exists', (t) => {
  const dir = join(repoRoot, 'dist', 'downloads');
  if (!existsSync(dir)) {
    t.skip('dist/downloads not built in this checkout');
    return;
  }
  const manifestPath = join(dir, 'downloads.json');
  assert.ok(existsSync(manifestPath), 'dist/downloads/downloads.json must exist');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  assert.ok(manifest.exports.length >= 14, 'the manifest must list every export');

  manifest.exports.forEach((entry) => {
    const file = join(dir, entry.filename);
    assert.ok(existsSync(file), `${entry.filename} is listed but was not written`);
    assert.ok(statSync(file).size > 1024, `${entry.filename} is suspiciously small`);
    const head = readFileSync(file).subarray(0, 5).toString('latin1');
    assert.equal(head, '%PDF-', `${entry.filename} is not a PDF`);
  });
});
