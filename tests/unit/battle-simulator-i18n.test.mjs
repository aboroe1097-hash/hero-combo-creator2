import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  BATTLE_SIMULATOR_ENGLISH,
  BATTLE_SIMULATOR_LANGUAGE_OPTIONS,
  BATTLE_SIMULATOR_LANGUAGE_STORAGE_KEY,
  BATTLE_SIMULATOR_LOCALES,
  applyBattleSimulatorDocumentLocale,
  createBattleSimulatorTranslator,
  loadBattleSimulatorLocale,
  normalizeBattleSimulatorLocale,
  readPreferredBattleSimulatorLocale,
  writePreferredBattleSimulatorLocale,
} from '../../js/battle-simulator-i18n.js';
import { BATTLE_SIMULATOR_LOCALE_PACKS } from '../../js/battle-simulator-i18n-packs.js';

const appSource = readFileSync('js/battle-simulator-app.js', 'utf8');
const bootstrapSource = readFileSync('js/battle-simulator.js', 'utf8');
const packSource = readFileSync('js/battle-simulator-i18n-packs.js', 'utf8');
const globalI18nCheckSource = readFileSync('scripts/check-i18n.mjs', 'utf8');

function placeholders(value) {
  return Array.from(String(value).matchAll(/\{([A-Za-z0-9_]+)\}/g), (match) => match[1]).sort();
}

test('Battle Simulator publishes the requested 12 stable locale IDs and native labels', () => {
  assert.deepEqual(BATTLE_SIMULATOR_LOCALES, [
    'en',
    'ar',
    'de',
    'es',
    'fr',
    'id',
    'it',
    'kr',
    'pt',
    'ru',
    'tr',
    'zh',
  ]);
  assert.deepEqual(
    BATTLE_SIMULATOR_LANGUAGE_OPTIONS.map(({ id }) => id),
    BATTLE_SIMULATOR_LOCALES
  );
  assert.equal(normalizeBattleSimulatorLocale('ko-KR'), 'kr');
  assert.equal(normalizeBattleSimulatorLocale('it-IT'), 'it');
  assert.deepEqual(
    BATTLE_SIMULATOR_LANGUAGE_OPTIONS.find(({ id }) => id === 'it'),
    { id: 'it', label: 'Italiano', short: 'IT' }
  );
  assert.equal(normalizeBattleSimulatorLocale('pt-BR'), 'pt');
  assert.equal(normalizeBattleSimulatorLocale('unsupported'), 'en');
});

test('every non-English pack fully translates visible copy and preserves placeholders', () => {
  const englishKeys = Object.keys(BATTLE_SIMULATOR_ENGLISH).sort();
  const technicalRules = Array.from({ length: 8 }, (_, index) => `model.rule${index + 1}`);
  for (const locale of BATTLE_SIMULATOR_LOCALES.filter((entry) => entry !== 'en')) {
    const pack = BATTLE_SIMULATOR_LOCALE_PACKS[locale];
    assert.ok(pack, locale);
    assert.deepEqual(Object.keys(pack).sort(), englishKeys, `${locale} key coverage`);
    for (const key of englishKeys) {
      assert.deepEqual(
        placeholders(pack[key]),
        placeholders(BATTLE_SIMULATOR_ENGLISH[key]),
        `${locale}:${key}`
      );
    }
    for (const key of [
      'hero.copy',
      'run.title',
      'research.title',
      'equipment.title',
      'stat.might',
      'results.kicker',
      'gate.title',
      'boot.title',
      ...technicalRules,
    ]) {
      assert.notEqual(pack[key], BATTLE_SIMULATOR_ENGLISH[key], `${locale}:${key}`);
    }
  }
});

test('locale loading, pluralization, and number formatting stay scoped to the selected language', async () => {
  await loadBattleSimulatorLocale('de');
  const german = createBattleSimulatorTranslator('de');
  assert.equal(german.locale, 'de');
  assert.equal(german.number(1234.5, { minimumFractionDigits: 1 }), '1.234,5');
  assert.match(german.plural('run.button', 2), /2/);

  await loadBattleSimulatorLocale('ar');
  const arabic = createBattleSimulatorTranslator('ar');
  assert.equal(arabic.dir, 'rtl');
  assert.notEqual(arabic.t('gate.title'), BATTLE_SIMULATOR_ENGLISH['gate.title']);
});

test('document language and direction update live while canonical setup IDs remain untranslated', async () => {
  await loadBattleSimulatorLocale('ar');
  const fakeDocument = {
    documentElement: { lang: '', dir: '' },
    title: '',
  };
  applyBattleSimulatorDocumentLocale(fakeDocument, 'ar');
  assert.equal(fakeDocument.documentElement.lang, 'ar');
  assert.equal(fakeDocument.documentElement.dir, 'rtl');
  assert.notEqual(fakeDocument.title, BATTLE_SIMULATOR_ENGLISH['document.title']);

  applyBattleSimulatorDocumentLocale(fakeDocument, 'kr');
  assert.equal(fakeDocument.documentElement.lang, 'ko');
  assert.equal(fakeDocument.documentElement.dir, 'ltr');

  await loadBattleSimulatorLocale('it');
  applyBattleSimulatorDocumentLocale(fakeDocument, 'it');
  assert.equal(fakeDocument.documentElement.lang, 'it');
  assert.equal(fakeDocument.documentElement.dir, 'ltr');
  assert.equal(fakeDocument.title, 'Simulatore di battaglia Beta | VTS 1097');

  assert.doesNotMatch(packSource, /['"]pvp-field['"]\s*:/);
  assert.match(appSource, /battleMode:\s*'pvp-field'/);
  assert.match(appSource, /value="\$\{STAT_INPUT_MODES\.ADD_BONUSES\}"/);
});

test('language preference is resilient and locale packs remain separately lazy-loaded', () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
  assert.equal(writePreferredBattleSimulatorLocale('fr-FR', storage), 'fr');
  assert.equal(values.get(BATTLE_SIMULATOR_LANGUAGE_STORAGE_KEY), 'fr');
  assert.equal(readPreferredBattleSimulatorLocale(storage), 'fr');

  assert.match(bootstrapSource, /from '\.\/battle-simulator-i18n\.js'/);
  assert.doesNotMatch(bootstrapSource, /battle-simulator-i18n-packs/);
  assert.match(
    readFileSync('js/battle-simulator-i18n.js', 'utf8'),
    /import\('\.\/battle-simulator-i18n-packs\.js'\)/
  );
  assert.match(globalI18nCheckSource, /STANDALONE_RUNTIME_I18N_MODULE_RE/);
  assert.match(
    globalI18nCheckSource,
    /if \(STANDALONE_RUNTIME_I18N_MODULE_RE\.test\(relPath\)\) continue;/
  );
});
