import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { rankedCombos, selectNonOverlappingCombos } from '../../js/combos-db.js';

const ZERO_RESULT_HEROES = [
  'King Arthur',
  'The Brave',
  'Al Fatih',
  'Rozen Blade',
  'Caesar',
  'ELK',
  'Isabella I',
  'Genghis Khan',
  'William the Conqueror',
  "Heaven's Justice",
  'The Boneless',
  'Jiguang Qi',
];

function functionSource(source, name, nextName = null) {
  const start = source.indexOf(`export function ${name}`);
  assert.notEqual(start, -1, `missing ${name}`);
  const end = nextName ? source.indexOf(`export function ${nextName}`, start) : source.length;
  assert.notEqual(end, -1, `missing ${nextName}`);
  return source.slice(start, end);
}

function sourceBetween(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  assert.notEqual(start, -1, `missing ${startMarker}`);
  assert.notEqual(end, -1, `missing ${endMarker}`);
  return source.slice(start, end);
}

test('the selected-hero zero-result fixture matches no ranked combo in either generator path', () => {
  const selected = new Set(ZERO_RESULT_HEROES);

  assert.deepEqual(selectNonOverlappingCombos(rankedCombos, selected, 5), []);
  assert.deepEqual(
    rankedCombos.filter((combo) => combo.heroes.every((hero) => selected.has(hero))),
    []
  );
});

test('Best and Surprise Me share one stale-safe run lifecycle', () => {
  const source = readFileSync('js/app-generator.js', 'utf8');
  const run = sourceBetween(source, 'function runGenerator', 'export function generateBestCombos');
  const best = functionSource(source, 'generateBestCombos', 'generateRandomCombos');
  const random = functionSource(source, 'generateRandomCombos');

  assert.match(best, /runGenerator\(\s*GENERATOR_MIN_HEROES/);
  assert.match(random, /runGenerator\(3,/);

  for (const [name, body] of [
    ['Best', best],
    ['Surprise Me', random],
  ]) {
    assert.equal(
      [...body.matchAll(/runGenerator\(/g)].length,
      1,
      `${name} should use exactly one shared run path`
    );
  }

  assert.match(
    run,
    /lastGeneratedCombos\.length\s*=\s*0[\s\S]*?resultsEl\.replaceChildren\(\)[\s\S]*?downloadGeneratorBtn\?\.classList\.add\('hidden'\)/
  );
  assert.ok(
    run.indexOf('resultsEl.replaceChildren()') < run.indexOf('selected.length >= min'),
    'stale output should clear before validation or ranking'
  );
  assert.match(
    run,
    /lastGeneratedCombos\.push\(\.\.\.combos\)[\s\S]*?renderGeneratorResults\(combos[\s\S]*?updateGeneratorRunStatus\(countMessage\)/
  );
  assert.match(run, /downloadGeneratorBtn\?\.classList\.toggle\('hidden', combos\.length === 0\)/);
  assert.match(run, /resultsEl\.focus\(\{ preventScroll: true \}\)/);
  assert.match(run, /resultsEl\.scrollIntoView\(/);
});

test('generator completion owns export state, persistent recovery, and one neutral live count', () => {
  const source = readFileSync('js/app-generator.js', 'utf8');
  const template = readFileSync('index.html', 'utf8');

  assert.match(source, /generatorFoundComboOne/);
  assert.match(source, /generatorFoundComboMany/);
  assert.match(source, /escapeHtml\(countMessage\)/);
  assert.match(source, /escapeHtml\(meta\.emptyMessage \|\|/);
  assert.match(source, /class="generator-run-meta" aria-hidden="true"/);
  assert.match(
    template,
    /<p\s+id="generatorRunStatus"\s+class="sr-only"\s+role="status"\s+aria-live="polite"\s+aria-atomic="true"\s*><\/p>\s*<div id="generatorResults"/
  );
  assert.doesNotMatch(source, /setAttribute\('role', 'status'\)/);
  assert.doesNotMatch(source, /setAttribute\('aria-live', 'polite'\)/);
  assert.match(source, /const liveStatus = document\.getElementById\('generatorRunStatus'\)/);
  assert.equal(
    [...source.matchAll(/liveStatus\.textContent\s*=/g)].length,
    1,
    'the mounted live region should be updated once, only by completion'
  );
  assert.match(source, /generator-recovery-state/);
  assert.match(source, /matchMedia\?\.\('\(prefers-reduced-motion: reduce\)'\)/);
  assert.match(source, /target\?\.focus\(\{ preventScroll: true \}\)/);
  assert.doesNotMatch(source, /window\.showToast\([^)]*(?:best|random) combos/is);
});
