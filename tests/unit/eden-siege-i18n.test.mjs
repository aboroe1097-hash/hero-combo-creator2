import assert from 'node:assert/strict';
import test from 'node:test';

import { COPY, LOCALES, getCopy, normalizeLocale } from '../../js/eden-siege/data/copy.js';

const ENGLISH_PLACEHOLDERS = collectPlaceholders(COPY.en);

function collectPlaceholders(value, prefix = '', output = {}) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectPlaceholders(item, `${prefix}[${index}]`, output));
  } else if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      collectPlaceholders(child, prefix ? `${prefix}.${key}` : key, output);
    }
  } else if (typeof value === 'string') {
    output[prefix] = [...value.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
  }
  return output;
}

test('every supported locale resolves complete Eden Siege copy with matching placeholders', () => {
  assert.deepEqual(Object.keys(COPY), LOCALES);

  for (const locale of LOCALES) {
    const copy = getCopy(locale);
    assert.deepEqual(collectPlaceholders(copy), ENGLISH_PLACEHOLDERS, `${locale} placeholders`);
    assert.equal(copy.tips.length, COPY.en.tips.length, `${locale} tips`);
    assert.ok(copy.game.title, `${locale} title`);
  }
});

test('the four unavailable page locales use the explicit English fallback', () => {
  for (const locale of ['de', 'fr', 'it', 'pt', 'tr', 'id', 'kr', 'hr']) {
    assert.equal(COPY[locale], COPY.en, `${locale} points to the English fallback`);
    assert.deepEqual(getCopy(locale), getCopy('en'));
  }
  assert.equal(normalizeLocale('ko'), 'kr');
});

test('Spanish, Russian, Arabic and Chinese use localized game titles', () => {
  for (const locale of ['es', 'ru', 'ar', 'zh']) {
    assert.notEqual(getCopy(locale).game.title, getCopy('en').game.title);
  }
});

test('the flagship copy (modes, training, streaks, results) is localized, not just inherited', () => {
  const english = getCopy('en');
  for (const section of ['modes', 'tutorial', 'modifiers']) {
    assert.ok(english[section], `English defines ${section}`);
  }
  assert.equal(english.streaks.length, 5);
  for (const locale of ['es', 'ru', 'ar', 'zh']) {
    const copy = getCopy(locale);
    assert.notEqual(copy.tutorial.title, english.tutorial.title, `${locale} tutorial`);
    assert.notEqual(copy.modes.daily, english.modes.daily, `${locale} daily siege`);
    assert.notEqual(copy.streaks[0], english.streaks[0], `${locale} announcer`);
    assert.notEqual(copy.hud.dash, english.hud.dash, `${locale} dash`);
  }
});
