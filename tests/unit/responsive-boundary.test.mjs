import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import test from 'node:test';

const files = readdirSync('css').filter((f) => f.endsWith('.css'));

test('no stylesheet may open its desktop range at 768px', () => {
  for (const file of files) {
    const css = readFileSync(`css/${file}`, 'utf8');
    assert.doesNotMatch(
      css,
      /@media\s*\(\s*min-width:\s*768px\b/,
      `${file} collides with the max-width: 768px mobile boundary`
    );
  }
});

test('mobile.css keeps the canonical max-width: 768px boundary', () => {
  const mobile = readFileSync('css/mobile.css', 'utf8');
  assert.match(mobile, /@media\s*\(\s*max-width:\s*768px\)/);
});
