import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const [indexHtml, secondaryCss] = await Promise.all([
  readFile(new URL('../../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../../css/secondary-tools-v14.css', import.meta.url), 'utf8'),
]);

test('v14 Loyalty grid children reset legacy percentage widths', () => {
  assert.ok(
    indexHtml.indexOf('css/secondary-tools-v14.css') > indexHtml.indexOf('css/app.css'),
    'secondary-tools-v14.css must load after the legacy app.css widths'
  );

  const resetRule = secondaryCss.match(
    /\.loyalty-camp-media,\s*\.loyalty-source-media,\s*\.loyalty-camp-fields,\s*\.loyalty-source-grid\s*\{([^}]*)\}/
  );

  assert.ok(resetRule, 'expected one shared Loyalty grid-child reset rule');
  assert.match(resetRule[1], /\bwidth:\s*auto\s*;/);
  assert.match(resetRule[1], /\bmin-width:\s*0\s*;/);
});
