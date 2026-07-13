import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const readProjectFile = (relativePath) =>
  readFileSync(path.join(projectRoot, relativePath), 'utf8');

test('Strife v14 uses an isolated responsive presentation layer', () => {
  const index = readProjectFile('index.html');
  const css = readProjectFile('css/strife-v14.css');

  assert.match(index, /css\/strife-v14\.css/u);
  assert.match(css, /\.strife-control-deck--stage/u);
  assert.match(css, /\.strife-monster-summary-copy/u);
  assert.match(css, /\.strife-results-band--f2p/u);
  assert.match(css, /\.strife-results-band--p2w/u);
  assert.match(css, /@media \(max-width: 768px\)/u);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/u);
});

test('Strife hides the redundant repeat metric while preserving useful metrics', () => {
  const source = readProjectFile('js/app-strife.js');

  assert.doesNotMatch(source, /copy\('strifeMetricRepeat'/u);
  assert.match(source, /strife-metric--selected/u);
  assert.match(source, /strife-metric--heroes/u);
  assert.match(source, /strife-metric--stages/u);
});
