import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { ADMIN_RUNTIME_EN } from '../../js/i18n/admin-runtime-copy.js';

const LOCALES = ['ar', 'de', 'es', 'fr', 'id', 'kr', 'pt', 'ru', 'tr', 'zh'];
const KEY_PATTERN = /adminAllianceView[A-Za-z0-9]+/g;

const LANGUAGE_NEUTRAL_KEYS = new Set([
  'adminAllianceViewBand10k',
  'adminAllianceViewBand50k',
  'adminAllianceViewBand100k',
  'adminAllianceViewBand200k',
  'adminAllianceViewBonusTeal',
  'adminAllianceViewBonusGreen',
  'adminAllianceViewBonusZero',
  'adminAllianceViewColumnAlliance',
  'adminAllianceViewColumnBase',
  'adminAllianceViewColumnBonus',
  'adminAllianceViewColumnServer',
  'adminAllianceViewDetails',
  'adminAllianceViewFieldAlliance',
  'adminAllianceViewFieldServer',
  'adminAllianceViewFilterAlliance',
  'adminAllianceViewFilterServer',
  'adminAllianceViewMatchStatus',
  'adminAllianceViewMetricBase',
  'adminAllianceViewMetricPathers',
  'adminAllianceViewTop100',
]);

function placeholders(value) {
  return [
    ...new Set([...String(value).matchAll(/\{([A-Za-z0-9_]+)\}/g)].map((match) => match[1])),
  ].sort();
}

async function loadPack(locale) {
  const module = await import(`../../js/i18n/admin-runtime/${locale}.js`);
  return module[`ADMIN_RUNTIME_${locale.toUpperCase()}`];
}

function localeSourcePath(locale) {
  return locale === 'en' ? 'js/i18n/admin-runtime-copy.js' : `js/i18n/admin-runtime/${locale}.js`;
}

function allianceKeys(source) {
  return [...new Set(source.match(KEY_PATTERN) || [])].sort();
}

test('Alliance View runtime copy exactly covers every literal UI and template reference', () => {
  const source = [
    readFileSync('js/admin-alliance-view.js', 'utf8'),
    readFileSync('js/alliance-view-brief-export.js', 'utf8'),
    readFileSync('tabs/admin.html', 'utf8'),
  ].join('\n');
  const referenced = allianceKeys(source);
  const english = Object.keys(ADMIN_RUNTIME_EN)
    .filter((key) => key.startsWith('adminAllianceView'))
    .sort();
  const englishDeclarations = readFileSync(localeSourcePath('en'), 'utf8')
    .match(/adminAllianceView[A-Za-z0-9]+\s*:/g)
    ?.map((entry) => entry.replace(/\s*:$/, ''));

  assert.ok(referenced.length >= 172, 'Alliance View should retain its complete localized surface');
  assert.equal(
    englishDeclarations.length,
    new Set(englishDeclarations).size,
    'English must not declare duplicate Alliance View keys'
  );
  assert.deepEqual(
    english,
    referenced,
    'English copy must have no missing or dead Alliance View keys'
  );
});

test('all ten Alliance View locale packs preserve keys, placeholders, and nonblank copy', async () => {
  const englishKeys = Object.keys(ADMIN_RUNTIME_EN)
    .filter((key) => key.startsWith('adminAllianceView'))
    .sort();

  for (const locale of LOCALES) {
    const pack = await loadPack(locale);
    const declarations = readFileSync(localeSourcePath(locale), 'utf8').match(
      /adminAllianceView[A-Za-z0-9]+\s*:/g
    );
    const declarationKeys = (declarations || []).map((entry) => entry.replace(/\s*:$/, ''));
    const localeKeys = Object.keys(pack)
      .filter((key) => key.startsWith('adminAllianceView'))
      .sort();
    assert.equal(
      declarationKeys.length,
      new Set(declarationKeys).size,
      `${locale} must not declare duplicate Alliance View keys`
    );
    assert.deepEqual(localeKeys, englishKeys, `${locale} Alliance View key parity`);

    for (const key of englishKeys) {
      assert.ok(String(pack[key]).trim(), `${locale}.${key} must not be blank`);
      assert.deepEqual(
        placeholders(pack[key]),
        placeholders(ADMIN_RUNTIME_EN[key]),
        `${locale}.${key} placeholder contract`
      );
    }
  }
});

test('Alliance View locale packs do not silently retain English fallback sentences', async () => {
  const englishKeys = Object.keys(ADMIN_RUNTIME_EN).filter((key) =>
    key.startsWith('adminAllianceView')
  );

  for (const locale of LOCALES) {
    const pack = await loadPack(locale);
    const copied = englishKeys.filter(
      (key) =>
        !LANGUAGE_NEUTRAL_KEYS.has(key) &&
        /[A-Za-z]{3}/.test(ADMIN_RUNTIME_EN[key]) &&
        pack[key] === ADMIN_RUNTIME_EN[key]
    );
    assert.deepEqual(copied, [], `${locale} contains untranslated English Alliance View copy`);
  }
});
