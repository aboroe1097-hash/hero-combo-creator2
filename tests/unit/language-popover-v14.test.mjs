import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const index = readFileSync('index.html', 'utf8');
const admin = readFileSync('admin.html', 'utf8');
const eden = readFileSync('eden-x1.html', 'utf8');
const shellSource = readFileSync('js/shell-v14.js', 'utf8');
const standaloneSource = readFileSync('js/standalone-language-v14.js', 'utf8');
const standaloneStyles = readFileSync('css/standalone-language-v14.css', 'utf8');

test('all public shells replace the raw native language popup with an accessible listbox', () => {
  assert.match(index, /id="languageMenuButton"[^>]*aria-haspopup="listbox"/);
  assert.match(index, /id="languageMenu"[^>]*role="listbox"/);
  for (const page of [admin, eden]) {
    assert.match(page, /css\/standalone-language-v14\.css/);
    assert.match(page, /js\/standalone-language-v14\.js/);
  }
  assert.match(standaloneSource, /setAttribute\('role', 'listbox'\)/);
  assert.match(standaloneSource, /setAttribute\('role', 'option'\)/);
});

test('language popovers support keyboard navigation, focus return, RTL, and viewport portals', () => {
  for (const source of [shellSource, standaloneSource]) {
    assert.match(source, /event\.key === 'ArrowDown'/);
    assert.match(source, /event\.key === 'ArrowUp'/);
    assert.match(source, /event\.key === 'Escape'/);
    assert.match(source, /focus\(\{ preventScroll: true \}\)/);
    assert.match(source, /getBoundingClientRect\(\)/);
  }
  assert.match(standaloneStyles, /\[dir='rtl'\] \.standalone-language-option\.is-selected/);
  assert.match(standaloneStyles, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(standaloneStyles, /position:\s*fixed/);
});
