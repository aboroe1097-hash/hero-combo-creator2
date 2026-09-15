import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const app = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
const shell = fs.readFileSync(path.join(root, 'js/shell-v14.js'), 'utf8');
const palette = fs.readFileSync(path.join(root, 'js/command-palette.js'), 'utf8');
const shortcuts = fs.readFileSync(path.join(root, 'js/app-shortcuts.js'), 'utf8');

test('Class Development is a lazy first-class tab with a shareable hash', () => {
  assert.match(index, /id="tabClassDevelopment"/);
  assert.match(index, /id="classDevelopmentSection"/);
  assert.match(index, /id="classDevelopmentRoot"/);
  assert.match(app, /classDevelopment:\s*'tabClassDevelopment'/);
  assert.match(app, /import\('\.\/class-development\.js'\)/);
  assert.match(shell, /\['tabClassDevelopment', 'classDevelopment'\]/);
  assert.match(palette, /name:\s*'classDevelopment'/);
  assert.match(shortcuts, /#classDevelopmentSection:not\(\.hidden\) #cdCurrentLevel/);
});

test('Class Development stays in More on phones and remains primary on desktop', () => {
  const item =
    index.match(
      /<div class="tab-item tab-badge-wrap"[^>]*>\s*<button id="tabClassDevelopment"/
    )?.[0] || '';
  assert.match(item, /data-shell-hub/);
  assert.match(item, /data-shell-desktop-primary/);
  assert.doesNotMatch(item, /data-shell-mobile-primary/);
});

test('all main locale packs expose the Class Development navigation label', () => {
  for (const locale of [
    'en',
    'ar',
    'de',
    'es',
    'fr',
    'hr',
    'id',
    'it',
    'kr',
    'pt',
    'ru',
    'tr',
    'zh',
  ]) {
    const source = fs.readFileSync(path.join(root, 'js/i18n', `${locale}.js`), 'utf8');
    assert.match(source, /tabClassDevelopment:\s*'[^']+'/);
  }
});
