import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { dailySiegeFor, formatDailyNote } from '../../js/siege-daily.js';
import { translations } from '../../js/translations.js';

test('the Arcade banner names today’s Daily War with every placeholder filled', () => {
  const today = dailySiegeFor(new Date('2026-09-23T08:00:00Z'));
  for (const [lang, pack] of Object.entries(translations)) {
    const template = pack.arcadeSiegeDailyNote || translations.en.arcadeSiegeDailyNote;
    const text = formatDailyNote(template, 'Keep', today.stamp);
    assert.doesNotMatch(text, /\{(map|date)\}/u, `${lang} fills its placeholders`);
    assert.match(text, /2026-09-23/u, `${lang} names the date`);
  }
});

test('the banner stays out of the index markup and off the arcade card grid', () => {
  const index = readFileSync('index.html', 'utf8');
  assert.doesNotMatch(index, /siege-callout|siege-feature/u, 'the banner is injected from JS');
  const arcade = readFileSync('arcade.html', 'utf8');
  assert.equal((arcade.match(/class="arcade-card"/gu) || []).length, 5);

  const promo = readFileSync('js/siege-promo.js', 'utf8');
  assert.doesNotMatch(promo, /from '\.\/eden-siege\//u, 'no game code is pulled into host pages');
  // post-build keeps /assets/eden-siege-*.js out of the service-worker
  // precache, so a host-page module with that prefix would break offline use.
  assert.doesNotMatch(
    promo,
    /from '\.\/eden-siege-/u,
    'host modules avoid the siege-only chunk prefix'
  );
  // The Eden vote callout was retired: the hub no longer loads this module.
  const app = readFileSync('js/app.js', 'utf8');
  assert.doesNotMatch(app, /siege-promo/u);
});

test('the Arcade Rampart banner links to the siege page', () => {
  const promo = readFileSync('js/siege-promo.js', 'utf8');
  assert.match(promo, /play\.href = SIEGE_URL/u);
  assert.doesNotMatch(promo, /siege-callout|EDEN_URL/u);
});
