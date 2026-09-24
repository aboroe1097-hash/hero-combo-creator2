import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  BUILDING_UPGRADES_LOCALES,
  formatBuildingUpgradesText,
  getBuildingUpgradesCopy,
  loadBuildingUpgradesCopy,
  normalizeBuildingUpgradesLocale,
} from '../../js/i18n/building-upgrades-copy.js';

const PACKS = JSON.parse(
  readFileSync(
    new URL('../../js/i18n/building-upgrades-copy-locales.json', import.meta.url),
    'utf8'
  )
);

const LOCALES = ['en', 'es', 'pt', 'de', 'fr', 'hr', 'tr', 'ru', 'id', 'zh', 'ar', 'kr', 'it'];

function placeholders(value) {
  return [...String(value).matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
}

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
      assert.deepEqual(placeholders(translated), placeholders(value), `${nextPath} placeholders`);
    }
  }
}

test('building upgrade planner copy covers every supported site locale', () => {
  assert.deepEqual([...BUILDING_UPGRADES_LOCALES], LOCALES);
  const english = getBuildingUpgradesCopy('en');
  for (const locale of LOCALES) {
    assertSameShape(english, getBuildingUpgradesCopy(locale, PACKS), locale);
  }
});

test('building upgrade locale normalization keeps the kr code and falls back to English', () => {
  assert.equal(normalizeBuildingUpgradesLocale('ko-KR'), 'kr');
  assert.equal(normalizeBuildingUpgradesLocale('it-IT'), 'it');
  assert.equal(normalizeBuildingUpgradesLocale('not-supported'), 'en');
  assert.equal(getBuildingUpgradesCopy('it', PACKS).buildingsHeading, 'Edifici');
  assert.notEqual(
    getBuildingUpgradesCopy('de', PACKS).buildingsHeading,
    getBuildingUpgradesCopy('en').buildingsHeading
  );
});

test('resource names and interpolated planner copy are authored per locale', () => {
  assert.equal(getBuildingUpgradesCopy('de', PACKS).resources.food, 'Nahrung');
  assert.equal(getBuildingUpgradesCopy('ar', PACKS).resources.iron, 'حديد');
  assert.equal(getBuildingUpgradesCopy('kr', PACKS).resources.lumber, '목재');
});

test('building upgrade locale packs load on demand and fall back to English on failure', async () => {
  const loaded = await loadBuildingUpgradesCopy('it', '/building-copy.json', async () => ({
    ok: true,
    json: async () => PACKS,
  }));
  assert.equal(loaded.buildingsHeading, 'Edifici');

  const fallback = await loadBuildingUpgradesCopy(
    'de',
    '/missing-building-copy.json',
    async () => ({
      ok: false,
    })
  );
  assert.equal(fallback.buildingsHeading, getBuildingUpgradesCopy('en').buildingsHeading);
});

test('formatBuildingUpgradesText preserves unknown tokens and substitutes known ones', () => {
  assert.equal(formatBuildingUpgradesText('Level {level}', { level: 30 }), 'Level 30');
  assert.equal(
    formatBuildingUpgradesText('From level {level} · {steps}', { level: 25, steps: '5 steps' }),
    'From level 25 · 5 steps'
  );
  assert.equal(formatBuildingUpgradesText('{known} Orichalcum', {}), '{known} Orichalcum');
});
