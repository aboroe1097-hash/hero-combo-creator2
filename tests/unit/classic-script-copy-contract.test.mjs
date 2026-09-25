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

// Copied for a module that fetches it as text rather than loading it as a script:
// the Combos admin tab reads js/combos-db.js with fetch() and rebuilds that exact
// text, so the file must stay a module and must never appear in a <script src>.
const fetchedAsText = new Set(['js/combos-db.js']);
const executedScripts = copiedScripts.filter((file) => !fetchedAsText.has(file));

test('the post-build copy list still exposes the copied scripts', () => {
  assert.ok(
    copiedScripts.includes('js/shell-v14.js'),
    'scripts/post-build.mjs must keep listing js/shell-v14.js in copyFiles'
  );
  assert.ok(
    executedScripts.length >= 8,
    `expected the copied script list, got ${executedScripts.length}`
  );
});

test('every copied script stays a classic script', () => {
  for (const file of executedScripts) {
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

test('a file copied to be fetched as text is never script-tagged anywhere', () => {
  for (const file of fetchedAsText) {
    assert.ok(copiedScripts.includes(file), `${file} must stay in the post-build copy list`);
    assert.match(
      readFileSync(file, 'utf8'),
      /^\s*export\b/mu,
      `${file} is the module source a host fetches; if it stopped being a module, fetch it some other way instead of dropping this exemption`
    );
  }
});
