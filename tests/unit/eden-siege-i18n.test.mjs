import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  COPY,
  LOCALES,
  getCopy,
  loadCopy,
  normalizeLocale,
} from '../../js/eden-siege/data/copy.js';

const PACKS = JSON.parse(
  readFileSync(new URL('../../js/eden-siege/data/copy-locales.json', import.meta.url), 'utf8')
);

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
  assert.deepEqual(['en', ...Object.keys(PACKS)], LOCALES);

  for (const locale of LOCALES) {
    const copy = getCopy(locale, PACKS);
    assert.deepEqual(collectPlaceholders(copy), ENGLISH_PLACEHOLDERS, `${locale} placeholders`);
    assert.equal(copy.tips.length, COPY.en.tips.length, `${locale} tips`);
    assert.ok(copy.game.title, `${locale} title`);
  }
});

test('every non-English locale authors its own copy instead of the English fallback', () => {
  for (const locale of LOCALES.filter((entry) => entry !== 'en')) {
    assert.notEqual(PACKS[locale], undefined, `${locale} must have a locale pack`);
    assert.equal(typeof PACKS[locale], 'object', `${locale} must have a copy object`);
  }
  assert.equal(normalizeLocale('ko'), 'kr');
});

test('every locale uses its own localized game title', () => {
  const englishTitle = getCopy('en', PACKS).game.title;
  for (const locale of LOCALES.filter((entry) => entry !== 'en')) {
    assert.notEqual(getCopy(locale, PACKS).game.title, englishTitle, `${locale} title`);
  }
});

test('Eden Siege locale packs load on demand and fall back to English on failure', async () => {
  let requestedUrl;
  const copy = await loadCopy('es-MX', '/siege-copy.json', async (url) => {
    requestedUrl = url;
    return { ok: true, json: async () => PACKS };
  });
  assert.equal(requestedUrl, '/siege-copy.json');
  assert.equal(copy.game.title, PACKS.es.game.title);

  const fallback = await loadCopy('de', '/missing.json', async () => ({ ok: false }));
  assert.equal(fallback.game.title, COPY.en.game.title);

  const stalledFallback = await loadCopy('fr', '/stalled.json', () => new Promise(() => {}), 5);
  assert.equal(stalledFallback.game.title, COPY.en.game.title);
});
