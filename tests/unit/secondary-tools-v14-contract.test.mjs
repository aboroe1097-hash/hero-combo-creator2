import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const [indexHtml, secondaryCss, loyaltySource, edenSource, strifeSource] = await Promise.all([
  readFile(new URL('../../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../../css/secondary-tools-v14.css', import.meta.url), 'utf8'),
  readFile(new URL('../../js/loyalty-spa.js', import.meta.url), 'utf8'),
  readFile(new URL('../../js/eden-map.js', import.meta.url), 'utf8'),
  readFile(new URL('../../js/app-strife.js', import.meta.url), 'utf8'),
]);

test('v14 Loyalty grid children reset legacy percentage widths', () => {
  assert.doesNotMatch(indexHtml, /css\/secondary-tools-v14\.css|css\/strife-v14\.css/);
  for (const source of [loyaltySource, edenSource, strifeSource]) {
    assert.match(source, /import '\.\.\/css\/secondary-tools-v14\.css'/);
  }
  assert.match(strifeSource, /import '\.\.\/css\/strife-v14\.css'/);

  const resetRule = secondaryCss.match(
    /\.loyalty-camp-media,\s*\.loyalty-source-media,\s*\.loyalty-camp-fields,\s*\.loyalty-source-grid\s*\{([^}]*)\}/
  );

  assert.ok(resetRule, 'expected one shared Loyalty grid-child reset rule');
  assert.match(resetRule[1], /\bwidth:\s*auto\s*;/);
  assert.match(resetRule[1], /\bmin-width:\s*0\s*;/);
});
