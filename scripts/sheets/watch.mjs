#!/usr/bin/env node
// Debounced regeneration for local preview (plan §3).
//
// Watches the sheet toolchain, every sheet's declared canonical sources, and the
// branding module, then rebuilds the affected sheets. Watch mode only ever writes
// to a local preview directory: publishing is a deploy-time decision, so a local
// run can never change what the site serves.
//
// Usage:
//   node scripts/sheets/watch.mjs                 # preview into tmp/sheets-watch
//   node scripts/sheets/watch.mjs --only <id>     # a single sheet
//   node scripts/sheets/watch.mjs --out tmp/foo

import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { REPO_ROOT } from './lib/cache.mjs';
import { SHEETS } from './registry.mjs';

const DEBOUNCE_MS = 400;
const BUILD_SCRIPT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'build.mjs');

function parseArgs(argv) {
  const options = { out: path.join(REPO_ROOT, 'tmp', 'sheets-watch'), only: [] };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--out') {
      options.out = argv[index + 1];
      index += 1;
    } else if (argv[index] === '--only') {
      while (argv[index + 1] && !argv[index + 1].startsWith('--')) {
        options.only.push(argv[index + 1]);
        index += 1;
      }
    }
  }
  return options;
}

const options = parseArgs(process.argv.slice(2));

// Which sheet depends on which file: the toolchain invalidates everything, a
// declared source invalidates the sheets that name it.
const TOOLCHAIN_DIR = path.join(REPO_ROOT, 'scripts', 'sheets');
const SOURCE_TO_SHEETS = new Map();
for (const sheet of SHEETS) {
  for (const source of sheet.sources || []) {
    const absolute = path.join(REPO_ROOT, source).replace(/\\/g, '/');
    if (!SOURCE_TO_SHEETS.has(absolute)) SOURCE_TO_SHEETS.set(absolute, new Set());
    SOURCE_TO_SHEETS.get(absolute).add(sheet.id);
  }
}

const WATCHED = new Set([
  ...(fs.existsSync(TOOLCHAIN_DIR) ? [] : []),
  path.join(REPO_ROOT, 'js', 'export-branding.js').replace(/\\/g, '/'),
  ...SOURCE_TO_SHEETS.keys(),
]);

let timer = null;
let running = false;
let queued = null;

function affectedBy(file) {
  const normalized = file.replace(/\\/g, '/');
  if (normalized.startsWith(TOOLCHAIN_DIR.replace(/\\/g, '/'))) return 'all';
  const ids = SOURCE_TO_SHEETS.get(normalized);
  return ids ? [...ids] : null;
}

function runBuild(only) {
  if (running) {
    // Coalesce: a change during a build schedules exactly one follow-up.
    queued =
      only === 'all'
        ? 'all'
        : [...new Set([...(queued || []), ...(Array.isArray(only) ? only : [])])];
    return;
  }
  running = true;
  const args = [BUILD_SCRIPT, '--out', options.out];
  const selected = options.only.length ? options.only : only === 'all' ? [] : only;
  if (selected.length) args.push('--only', ...selected);
  const child = spawn(process.execPath, args, { stdio: 'inherit' });
  child.on('exit', (code) => {
    running = false;
    console.log(`\n[watch] rebuild finished with code ${code}`);
    if (queued) {
      const next = queued;
      queued = null;
      runBuild(next);
    }
  });
}

function schedule(only) {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    runBuild(only);
  }, DEBOUNCE_MS);
}

console.log(`[watch] preview: ${path.relative(REPO_ROOT, options.out)}`);
console.log(`[watch] toolchain: ${path.relative(REPO_ROOT, TOOLCHAIN_DIR)}`);
console.log(`[watch] canonical sources: ${SOURCE_TO_SHEETS.size} file(s)`);
console.log('[watch] this only writes the preview directory; deploy publishes the catalogue.');

for (const file of WATCHED) {
  if (!fs.existsSync(file)) continue;
  fs.watch(file, { persistent: true }, () => {
    const affected = affectedBy(file);
    if (!affected) return;
    console.log(`\n[watch] changed: ${path.relative(REPO_ROOT, file)}`);
    schedule(affected);
  });
}

// The toolchain is watched per file: templates and theme live there, and a change
// to any of them invalidates every sheet.
function watchDir(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) watchDir(full);
    else {
      fs.watch(full, { persistent: true }, () => {
        console.log(`\n[watch] toolchain changed: ${path.relative(REPO_ROOT, full)}`);
        schedule('all');
      });
    }
  }
}
watchDir(TOOLCHAIN_DIR);

runBuild(options.only.length ? options.only : 'all');
