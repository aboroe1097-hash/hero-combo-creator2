import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import test from 'node:test';

// UTF-8 text decoded as Windows-1252 and saved again ("mojibake") shows up as
// sequences like "Â·", "â€”" or "â”€". Only those multi-character sequences
// are flagged: a lone "Â" is legitimate French ("Âme", "DÉGÂTS"). The locale
// packs are skipped because they are checked by the i18n tooling, tests may
// assert on these sequences on purpose, and
// js/i18n/hero-atlas/index.js deliberately contains these sequences in a
// regex that detects mojibake at runtime.
const MOJIBAKE = /Â[·°±«»]|â€|â”|â‚¬|Ã¢/u;

function trackedSources() {
  return execFileSync('git', ['ls-files', '*.js', '*.mjs', '*.css', '*.html'], {
    encoding: 'utf8',
  })
    .split('\n')
    .filter(Boolean)
    .filter((file) => !file.startsWith('js/i18n/') && !file.startsWith('tests/'));
}

test('source files carry no double-encoded UTF-8 (mojibake)', () => {
  const offenders = [];
  for (const file of trackedSources()) {
    let text;
    try {
      text = readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    text.split('\n').forEach((line, index) => {
      if (MOJIBAKE.test(line)) offenders.push(`${file}:${index + 1}`);
    });
  }
  assert.deepEqual(offenders, [], `Mojibake found:\n${offenders.join('\n')}`);
});
