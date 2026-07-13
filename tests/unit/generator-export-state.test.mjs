import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

function namedImports(source, modulePath) {
  const escapedPath = modulePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = source.match(
    new RegExp(`import\\s*\\{([^}]*)\\}\\s*from\\s*['"]${escapedPath}['"]`)
  );
  assert.ok(match, `missing named import from ${modulePath}`);
  return match[1]
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean);
}

test('app and generator use the same lastGeneratedCombos binding', () => {
  const app = readFileSync('js/app.js', 'utf8');
  const generator = readFileSync('js/app-generator.js', 'utf8');

  assert.ok(namedImports(generator, './state.js').includes('lastGeneratedCombos'));
  assert.match(generator, /export\s*\{\s*lastGeneratedCombos\s*\}/);
  assert.ok(namedImports(app, './app-generator.js').includes('lastGeneratedCombos'));
  assert.ok(!namedImports(app, './state.js').includes('lastGeneratedCombos'));
});
