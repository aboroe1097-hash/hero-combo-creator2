import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  DOWNLOADS_LOCALES,
  getDownloadsCopy,
  loadDownloadsCopy,
  normalizeDownloadsLocale,
  preferredDownloadsLocale,
} from '../../js/i18n/downloads-copy.js';

const PACKS = JSON.parse(
  readFileSync(new URL('../../js/i18n/downloads-copy-locales.json', import.meta.url), 'utf8')
);

const LOCALES = ['en', 'es', 'pt', 'de', 'fr', 'hr', 'tr', 'ru', 'id', 'zh', 'ar', 'kr', 'it'];

function assertSameShape(reference, candidate, path = '') {
  for (const [key, value] of Object.entries(reference)) {
    const nextPath = path ? `${path}.${key}` : key;
    assert.ok(Object.hasOwn(candidate, key), `${nextPath} is missing`);
    const translated = candidate[key];
    if (value && typeof value === 'object') {
      assert.equal(typeof translated, 'object', `${nextPath} must be an object`);
      assertSameShape(value, translated, nextPath);
    } else {
      assert.equal(typeof translated, 'string', `${nextPath} must be text`);
      assert.ok(translated.trim(), `${nextPath} must not be empty`);
    }
  }
}

test('downloads hub copy covers every supported site locale', () => {
  assert.deepEqual([...DOWNLOADS_LOCALES], LOCALES);
  const english = getDownloadsCopy('en');
  for (const locale of LOCALES) {
    assertSameShape(english, getDownloadsCopy(locale, PACKS), locale);
  }
});

test('downloads locale normalization keeps the kr code and falls back to English', () => {
  assert.equal(normalizeDownloadsLocale('ko-KR'), 'kr');
  assert.equal(normalizeDownloadsLocale('it-IT'), 'it');
  assert.equal(normalizeDownloadsLocale('not-supported'), 'en');
  assert.equal(getDownloadsCopy('it', PACKS).title, 'Download della community');
  assert.notEqual(getDownloadsCopy('de', PACKS).title, getDownloadsCopy('en', PACKS).title);
});

test('downloads group and stat labels are authored per locale', () => {
  assert.equal(
    getDownloadsCopy('de', PACKS).groups.unitSpecialisation,
    'Einheiten-Spezialisierung'
  );
  assert.equal(getDownloadsCopy('ar', PACKS).stats.totalSize, 'الحجم الإجمالي');
  assert.equal(getDownloadsCopy('kr', PACKS).groups.dragonMaster, '드래곤 마스터');
});

test('downloads locale packs load on demand and fall back to English on failure', async () => {
  const loaded = await loadDownloadsCopy('fr', '/downloads-copy.json', async () => ({
    ok: true,
    json: async () => PACKS,
  }));
  assert.equal(loaded.title, 'Téléchargements communautaires');

  const fallback = await loadDownloadsCopy('de', '/missing-downloads-copy.json', async () => ({
    ok: false,
  }));
  assert.equal(fallback.title, getDownloadsCopy('en').title);
});

test('preferredDownloadsLocale reads the stored site preference first', () => {
  const storage = { getItem: (key) => (key === 'vts_hero_lang' ? 'ar' : null) };
  assert.equal(preferredDownloadsLocale(storage), 'ar');
});
