import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { createLatestLanguageLoader, loadTranslationsForLanguage } from '../../js/translations.js';

test('catalog loading has no document-direction side effect', async () => {
  const previousDocument = globalThis.document;
  globalThis.document = { documentElement: { dir: 'sentinel' } };
  try {
    await loadTranslationsForLanguage('en');
    assert.equal(globalThis.document.documentElement.dir, 'sentinel');
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }
});

test('latest language request wins when an older catalog load resolves last', async () => {
  const pending = new Map();
  const applied = [];
  const loadLanguage = (lang) =>
    new Promise((resolve) => {
      pending.set(lang, resolve);
    });
  const requestLanguage = createLatestLanguageLoader(
    (lang, catalog) => applied.push({ lang, catalog }),
    loadLanguage
  );

  const slowArabic = requestLanguage('ar');
  const fastFrench = requestLanguage('fr');
  pending.get('fr')({ locale: 'fr' });
  assert.equal((await fastFrench).applied, true);
  pending.get('ar')({ locale: 'ar' });
  assert.equal((await slowArabic).applied, false);

  assert.deepEqual(applied, [{ lang: 'fr', catalog: { locale: 'fr' } }]);
});

test('standalone language handlers use the latest-request gate', () => {
  for (const file of ['js/admin-page.js', 'js/arcade.js', 'js/eden-x1.js']) {
    const source = readFileSync(file, 'utf8');
    assert.match(source, /createLatestLanguageLoader/, `${file} imports the shared gate`);
    assert.match(source, /await request[A-Za-z0-9]+Language\(/, `${file} awaits the shared gate`);
  }
});

test('dynamic localized tools share normalized first-visit locale resolution', () => {
  for (const file of [
    'js/admin-pin-gate.js',
    'js/command-palette.js',
    'js/eden-map-construction.js',
    'js/eden-map-guide.js',
    'js/eden-map-season.js',
    'js/eden-map-sidebar.js',
    'js/eden-map-toolbar.js',
    'js/eden-tooltips.js',
    'js/loyalty-calculator.js',
    'js/ocr-dashboard.js',
    'js/ocr-engine.js',
    'js/ocr-render.js',
    'js/ocr-roster.js',
    'js/seo.js',
  ]) {
    const source = readFileSync(file, 'utf8');
    assert.match(source, /resolveRuntimeLocale/, `${file} uses the shared runtime locale resolver`);
  }
});
