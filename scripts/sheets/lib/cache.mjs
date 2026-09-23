// Sheet artifact cache (plan §3).
//
// The key hashes the sheet's own source data, the whole sheet toolchain (adapters,
// templates, theme, page frame, renderer), the branding it prints and the renderer
// version — so a template edit invalidates every sheet, a data edit invalidates the
// sheets that read that data, and an unchanged input reproduces byte-identical
// output apart from timestamps. The cache lives outside dist/ because Vite clears
// dist on every build.

import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const SHEETS_DIR = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
export const REPO_ROOT = path.join(SHEETS_DIR, '..', '..');
export const CACHE_ROOT = path.join(REPO_ROOT, '.cache', 'sheets');

// Bump when the rendering itself changes in a way the file hashes cannot see
// (Chromium version, page geometry rules, PNG scale).
export const RENDERER_VERSION = 'sheets-renderer/1';

function hashFile(hash, filePath) {
  if (!fs.existsSync(filePath)) {
    hash.update(`missing:${path.relative(REPO_ROOT, filePath)}`);
    return;
  }
  hash.update(path.relative(REPO_ROOT, filePath).replace(/\\/g, '/'));
  hash.update(fs.readFileSync(filePath));
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

/**
 * Everything that can change what a sheet looks like or says.
 *
 * - every file under scripts/sheets/ (adapters, templates, theme, page frame,
 *   registry, renderer) — so a template change invalidates every dependent sheet;
 * - the sheet's declared canonical sources, which name the tool's real data owner;
 * - the shared export branding and the app version that the footer prints.
 */
export function sheetCacheKey(sheet, branding) {
  const hash = createHash('sha256');
  hash.update(RENDERER_VERSION);
  hash.update('\n--sheet--\n');
  hash.update(
    JSON.stringify({
      id: sheet.id,
      title: sheet.title,
      eyebrow: sheet.eyebrow || '',
      category: sheet.category,
      template: sheet.template,
      orientation: sheet.orientation,
      adapter: sheet.adapter,
      adapterArgs: sheet.adapterArgs || {},
      sourceLabel: sheet.sourceLabel || '',
      sourceRevision: sheet.sourceRevision || '',
      toolId: sheet.toolId,
      art: sheet.art || '',
    })
  );

  hash.update('\n--toolchain--\n');
  for (const file of walk(SHEETS_DIR).sort()) hashFile(hash, file);

  hash.update('\n--sources--\n');
  for (const relative of (sheet.sources || []).slice().sort()) {
    hashFile(hash, path.join(REPO_ROOT, relative));
  }

  hash.update('\n--branding--\n');
  hash.update(
    JSON.stringify({
      displayName: branding?.displayName ?? '',
      appVersion: branding?.appVersion ?? '',
      siteUrl: branding?.siteUrl ?? '',
    })
  );
  hashFile(hash, path.join(REPO_ROOT, 'js', 'export-branding.js'));
  hashFile(hash, path.join(REPO_ROOT, 'package.json'));

  return hash.digest('hex').slice(0, 32);
}

export function cacheDirFor(sheetId, key) {
  return path.join(CACHE_ROOT, sheetId, key);
}

export function readCache(sheetId, key) {
  const dir = cacheDirFor(sheetId, key);
  const manifestPath = path.join(dir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) return null;
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    for (const file of manifest.files || []) {
      if (!fs.existsSync(path.join(dir, file.filename))) return null;
    }
    return { dir, manifest };
  } catch {
    return null;
  }
}

export function writeCache(sheetId, key, manifest, copyFrom) {
  const dir = cacheDirFor(sheetId, key);
  fs.mkdirSync(dir, { recursive: true });
  const files = [];
  for (const file of manifest.files) {
    const source = path.join(copyFrom, file.filename);
    const target = path.join(dir, file.filename);
    fs.copyFileSync(source, target);
    files.push(file);
  }
  fs.writeFileSync(
    path.join(dir, 'manifest.json'),
    `${JSON.stringify({ ...manifest, files, cachedAt: new Date().toISOString() }, null, 2)}\n`
  );
  return dir;
}

/** Copy a cached sheet into the staging directory that will be published. */
export function restoreCache(cacheDir, manifest, stagingDir) {
  fs.mkdirSync(stagingDir, { recursive: true });
  for (const file of manifest.files) {
    fs.copyFileSync(path.join(cacheDir, file.filename), path.join(stagingDir, file.filename));
  }
}

export function clearCache() {
  fs.rmSync(CACHE_ROOT, { recursive: true, force: true });
}
