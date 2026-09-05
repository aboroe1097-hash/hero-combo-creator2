import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const rootDir = path.resolve(import.meta.dirname, '..', '..');

function read(relativePath) {
  return readFileSync(path.join(rootDir, relativePath), 'utf8');
}

const packageJson = JSON.parse(read('package.json'));

// The route CSS budgets in scripts/check-size.mjs only hold the line while
// something runs them. They are reachable from CI through a three-link chain —
// ci.yml -> verify:deploy -> check -> size:check — and a break anywhere in it
// is invisible: the budgets keep passing locally while nothing enforces them on
// a pull request. These assertions pin each link.
test('the check script builds before measuring size', () => {
  const check = packageJson.scripts.check;
  assert.match(check, /\bnpm run build\b/u);
  assert.match(check, /\bnpm run size:check\b/u);
  assert.ok(
    check.indexOf('npm run build') < check.indexOf('npm run size:check'),
    'size:check must run after build so it measures a fresh dist/'
  );
});

test('CI reaches size:check through verify:deploy', () => {
  assert.match(read('.github/workflows/ci.yml'), /npm run verify:deploy/u);
  assert.match(read('scripts/verify-deploy.mjs'), /runNpmScript\('check'/u);
});

test('size:check guards the toolchain its budgets were calibrated on', () => {
  const checkSize = read('scripts/check-size.mjs');
  assert.match(checkSize, /TOOLCHAIN_PACKAGES\s*=\s*\[[^\]]*'vite'/u);
  assert.match(checkSize, /toolchainMismatches\.length/u);
});
