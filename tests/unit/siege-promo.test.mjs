import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  CALLOUT_KEY,
  CALLOUT_VERSION,
  calloutDismissed,
  dailySiegeFor,
  dismissCallout,
  formatDailyNote,
} from '../../js/siege-daily.js';
import { translations } from '../../js/translations.js';

function memoryStorage(seed = {}) {
  const values = new Map(Object.entries(seed));
  return {
    getItem: (key) => (values.has(key) ? values.get(key) : null),
    setItem: (key, value) => values.set(key, String(value)),
  };
}

test('the homepage callout is dismissed once per version and survives broken storage', () => {
  const storage = memoryStorage();
  assert.equal(calloutDismissed(storage), false);
  assert.equal(dismissCallout(storage), true);
  assert.equal(calloutDismissed(storage), true);
  assert.equal(storage.getItem(CALLOUT_KEY), CALLOUT_VERSION);

  const older = memoryStorage({ [CALLOUT_KEY]: 'siege-older-version' });
  assert.equal(calloutDismissed(older), false, 'a new callout version shows again');

  const broken = {
    getItem() {
      throw new Error('blocked');
    },
    setItem() {
      throw new Error('quota');
    },
  };
  assert.equal(calloutDismissed(broken), false);
  assert.equal(dismissCallout(broken), false);
});

test('the Arcade banner names today’s Daily War with every placeholder filled', () => {
  const today = dailySiegeFor(new Date('2026-09-23T08:00:00Z'));
  for (const [lang, pack] of Object.entries(translations)) {
    const template = pack.arcadeSiegeDailyNote || translations.en.arcadeSiegeDailyNote;
    const text = formatDailyNote(template, 'Keep', today.stamp);
    assert.doesNotMatch(text, /\{(map|date)\}/u, `${lang} fills its placeholders`);
    assert.match(text, /2026-09-23/u, `${lang} names the date`);
  }
});

test('the prompts stay out of the index markup and off the arcade card grid', () => {
  const index = readFileSync('index.html', 'utf8');
  assert.doesNotMatch(index, /siege-callout|siege-feature/u, 'the callout is injected from JS');
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
  const app = readFileSync('js/app.js', 'utf8');
  assert.match(app, /import\('\.\/siege-promo\.js'\)/u, 'the hub loads the callout lazily');
});
