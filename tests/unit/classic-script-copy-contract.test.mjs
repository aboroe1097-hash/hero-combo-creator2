import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const postBuildSource = readFileSync('scripts/post-build.mjs', 'utf8');

// scripts/post-build.mjs copies "plain non-module scripts" verbatim into dist/,
// and the HTML loads them with bare <script src> tags. A top-level `import` or
// `export` in one of those files makes the browser throw "Cannot use import
// statement outside a module" and the entire script dies before it runs — 16.5.0
// shipped exactly that in js/shell-v14.js, which silently removed the whole
// shell (More panel, keyboard shortcuts, language menu, shellNavReady) from the
// deployed homepage. ES modules belong in the bundled graph instead: import them
// from a module entry, or reach a copied file through dynamic import() with the
// target added to the copy list.
const copyBlock = postBuildSource.match(/const copyFiles = \[([\s\S]*?)\];/u)?.[1] || '';
const copiedScripts = [...copyBlock.matchAll(/'([^']+\.js)'/gu)].map((match) => match[1]);

test('the post-build copy list still exposes the copied scripts', () => {
  assert.ok(
    copiedScripts.includes('js/shell-v14.js'),
    'scripts/post-build.mjs must keep listing js/shell-v14.js in copyFiles'
  );
  assert.ok(
    copiedScripts.length >= 8,
    `expected the copied script list, got ${copiedScripts.length}`
  );
});

test('every copied script stays a classic script', () => {
  for (const file of copiedScripts) {
    const source = readFileSync(file, 'utf8');
    assert.doesNotMatch(
      source,
      /^\s*import\s+(?!\()/mu,
      `${file} is copied verbatim and loaded as a classic script; a top-level import breaks it at parse time`
    );
    assert.doesNotMatch(
      source,
      /^\s*export\b/mu,
      `${file} is copied verbatim and loaded as a classic script; a top-level export breaks it at parse time`
    );
  }
});
