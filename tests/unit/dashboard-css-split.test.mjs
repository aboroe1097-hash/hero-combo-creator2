import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (file) => readFileSync(file, 'utf8');
const stylesheets = (html) =>
  [...html.matchAll(/<link rel="stylesheet" href="css\/([\w.-]+\.css)/g)].map((m) => m[1]);

test('only the admin page loads the admin-only dashboard stylesheet', () => {
  const admin = stylesheets(read('admin.html'));
  const dashboard = admin.indexOf('ocr-dashboard.css');
  assert.ok(dashboard >= 0, 'admin.html links ocr-dashboard.css');
  // Directly after the shared rules, so the admin rules keep their place in the cascade.
  assert.equal(admin[dashboard + 1], 'ocr-dashboard-admin.css');

  for (const page of ['eden-x1.html', 'eden-x2.html', 'index.html']) {
    assert.ok(
      !stylesheets(read(page)).includes('ocr-dashboard-admin.css'),
      `${page} must not load admin-only dashboard styles`
    );
  }
});

test('the admin-only rules build into a chunk that loads after the shared dashboard chunk', () => {
  // Inside admin.html's own CSS bundle they would load before the shared
  // ocr-dashboard chunk and lose every tie to the rules they were split from.
  const config = read('vite.config.js');
  assert.match(
    config,
    /\/css\/ocr-dashboard-admin\.css'\)\)\s*\{\s*return 'ocr-dashboard-admin-styles';/
  );
});

test('the Eden route budget stays near the split measurement', () => {
  const sizeScript = read('scripts/check-size.mjs');
  const eden = sizeScript.match(/'eden-x1\.html': \{ desktop: (\d+) \* 1024/);
  assert.ok(eden, 'eden-x1 budget entry exists');
  // Admin-only styles once pushed this past 800 KiB; they belong in the admin file.
  assert.ok(Number(eden[1]) < 700, `eden-x1 desktop ceiling is ${eden[1]} KiB`);
});
