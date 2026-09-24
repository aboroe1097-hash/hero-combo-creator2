// Parser for the pipe-delimited codex datasets under database/codex/.
//
// The files start with a `# source: ...` provenance line, then a header row.
// Several of them use a nested `|`-delimited provenance field in the trailing
// `p` column, so rows are split with an explicit column limit and the remainder
// is re-joined into `p`.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const CODEX_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
  'database',
  'codex'
);

export function readCodexDataset(name) {
  const file = path.join(CODEX_DIR, `${name}.txt`);
  const raw = fs.readFileSync(file, 'utf8');
  const lines = raw.split(/\r?\n/);
  const comments = [];
  let headerIndex = -1;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.trim()) continue;
    if (line.startsWith('#')) {
      comments.push(line.replace(/^#\s?/, ''));
      continue;
    }
    headerIndex = i;
    break;
  }
  if (headerIndex < 0) throw new Error(`${name}.txt has no header row`);

  const columns = lines[headerIndex].split('|').map((value) => value.trim());
  const rows = [];
  for (let i = headerIndex + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.trim() || line.startsWith('#')) continue;
    const parts = line.split('|');
    // Everything past the declared columns belongs to the trailing `p` field.
    const head = parts.slice(0, columns.length - 1);
    const tail = parts.slice(columns.length - 1).join('|');
    const values = [...head, tail];
    const row = {};
    columns.forEach((column, index) => {
      row[column] = (values[index] ?? '').trim();
    });
    rows.push(row);
  }
  return { name, columns, rows, comments };
}

// Reads the `credit=...|verification=...` provenance tail.
export function parseProvenance(value) {
  const out = {};
  String(value || '')
    .split('|')
    .forEach((part) => {
      const equals = part.indexOf('=');
      if (equals < 0) return;
      out[part.slice(0, equals).trim()] = part.slice(equals + 1).trim();
    });
  return out;
}

// Reads a comma list where `-` marks "no value at this level", e.g. `1000,-,-,-`.
export function parseLevelValues(value) {
  return String(value || '')
    .split(',')
    .map((part) => {
      const trimmed = part.trim();
      if (trimmed === '' || trimmed === '-') return null;
      const numeric = Number(trimmed);
      return Number.isFinite(numeric) ? numeric : null;
    });
}

export function sumNumbers(values) {
  return values.reduce((total, value) => (Number.isFinite(value) ? total + value : total), 0);
}
