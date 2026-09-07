import { test } from 'node:test';
import assert from 'node:assert/strict';

import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

// The codex payload must load lazily: no *.html entry may reference it and no
// eager entry module may import codex-loader. Only lazy feature modules
// (hero atlas, research planners, battle-sim duel explorer) may.
const EAGER_MODULES = [
  join(repoRoot, 'js', 'app.js'),
  join(repoRoot, 'js', 'app-generator.js'),
  join(repoRoot, 'js', 'state.js'),
];

function listHtmlEntries() {
  const out = [];
  for (const file of readdirSync(repoRoot)) {
    if (file.endsWith('.html') && !file.startsWith('boh-mapper.before-')) {
      out.push(join(repoRoot, file));
    }
  }
  return out;
}

test('no HTML entry references the codex payload or loader', () => {
  for (const htmlPath of listHtmlEntries()) {
    const html = readFileSync(htmlPath, 'utf8');
    assert.ok(
      !/codex-payload|codex-loader/i.test(html),
      `${htmlPath} eagerly references the codex payload`
    );
  }
});

test('no eager entry module imports the codex payload or loader', () => {
  for (const modulePath of EAGER_MODULES) {
    const source = readFileSync(modulePath, 'utf8');
    assert.ok(
      !/codex-payload|codex-loader/i.test(source),
      `${modulePath} eagerly imports the codex layer`
    );
  }
});

test('the payload is a static JSON artifact, not a bundled module', () => {
  const payloadPath = join(repoRoot, 'js', 'codex-payload.json');
  const payload = JSON.parse(readFileSync(payloadPath, 'utf8'));
  assert.equal(payload.encoding, 'gzip-base64');
});
