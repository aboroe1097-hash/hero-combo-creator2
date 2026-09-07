import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  EDEN_MAP_CANONICAL,
  EDEN_MAP_LOCALES,
  applyEdenMapDomTranslations,
  auditEdenMapLocale,
  edenMapText,
  getEdenFactionDisplayLabel,
  getEdenMissionDisplayLabel,
  getEdenPathColorDisplayLabel,
  getEdenPlanDisplayName,
  getEdenPresetTargetDisplayLabel,
  getEdenSectorDisplayLabel,
  getEdenStoredRouteDisplayLabel,
  getEdenStructureDisplayLabel,
  getEdenTerrainDisplayLabel,
  loadEdenMapLocale,
  resolveEdenMapLocale,
} from '../../js/i18n/eden-map/index.js';
import { X1_PLANNING_TARGETS } from '../../js/eden-map-data.js';
import { formatTravelTime } from '../../js/eden-map-features.js';
import { getLanguageDirection } from '../../js/translations.js';

const NON_ENGLISH_LOCALES = EDEN_MAP_LOCALES.filter((locale) => locale !== 'en');

await Promise.all(EDEN_MAP_LOCALES.map((locale) => loadEdenMapLocale(locale)));

test('every Eden Map domain pack covers canonical structures, sectors, and runtime copy', () => {
  assert.deepEqual(EDEN_MAP_LOCALES, [
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
  for (const locale of EDEN_MAP_LOCALES) {
    assert.deepEqual(auditEdenMapLocale(locale), [], `${locale} Eden Map pack is incomplete`);
  }
  assert.equal(EDEN_MAP_CANONICAL.structureTypes.length, 19);
  assert.equal(EDEN_MAP_CANONICAL.sectorKeys.length, 21);
});

test('non-English Eden Map labels use gaming terminology while keeping VTS and OV canonical', () => {
  for (const locale of NON_ENGLISH_LOCALES) {
    assert.notEqual(getEdenStructureDisplayLabel('AT', locale), 'Ancient Temple', locale);
    assert.notEqual(getEdenStructureDisplayLabel('CP5', locale), 'Gate Lv5', locale);
    assert.notEqual(getEdenSectorDisplayLabel('NE', '', locale), 'North East Sector', locale);
    assert.notEqual(getEdenTerrainDisplayLabel('mountain', locale), 'Mountain', locale);
    assert.notEqual(getEdenMissionDisplayLabel('enemy-red', locale), 'Enemy red', locale);
    assert.notEqual(getEdenFactionDisplayLabel('north', locale), 'North', locale);
    assert.notEqual(getEdenPathColorDisplayLabel('red', locale), 'Red Alliance', locale);
    assert.notEqual(edenMapText('mainPlan', {}, locale), 'Main Plan', locale);
    assert.notEqual(edenMapText('marchSpeed', {}, locale), 'March speed', locale);
    assert.equal(getEdenMissionDisplayLabel('vts', locale), 'VTS', locale);
    assert.equal(edenMapText('ov', {}, locale), 'OV', locale);
  }
  assert.equal(edenMapText('fullscreen', {}, 'ar'), 'ملء الشاشة');
  assert.equal(edenMapText('day', {}, 'ar'), 'اليوم');
  assert.equal(edenMapText('jumpTo', { place: 'C' }, 'zh'), '跳转至C');
  assert.equal(getEdenStructureDisplayLabel('C6', 'kr'), 'Lv.6 수도');
});

test('Eden Map travel estimates use locale-aware gaming time units', () => {
  assert.equal(formatTravelTime(65, 'de'), '1 Std. 5 Min.');
  assert.equal(formatTravelTime(65, 'tr'), '1 sa 5 dk');
  assert.equal(formatTravelTime(65, 'zh'), '1 时 5 分');
});

test('Eden Map travel units follow live language changes after initial paint', () => {
  const previousStorage = globalThis.localStorage;
  const previousInitialLanguage = globalThis.VTS_INITIAL_LANGUAGE;
  let stored = 'tr';
  try {
    globalThis.localStorage = { getItem: () => stored };
    globalThis.VTS_INITIAL_LANGUAGE = 'en';
    assert.equal(formatTravelTime(65), '1 sa 5 dk');
    stored = 'zh';
    assert.equal(formatTravelTime(65), '1 时 5 分');
  } finally {
    if (previousStorage === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = previousStorage;
    if (previousInitialLanguage === undefined) delete globalThis.VTS_INITIAL_LANGUAGE;
    else globalThis.VTS_INITIAL_LANGUAGE = previousInitialLanguage;
  }
});

test('localized display adapters never mutate canonical saved-plan identities', () => {
  const target = X1_PLANNING_TARGETS[0];
  const snapshot = structuredClone(target);
  assert.equal(target.id, 'templePush');
  assert.equal(getEdenPresetTargetDisplayLabel(target, 'ar'), 'هجوم المعبد');
  assert.equal(getEdenPlanDisplayName('default', 'Main Plan', 'fr'), 'Plan principal');
  assert.equal(getEdenStoredRouteDisplayLabel('Route 12', 'de'), 'Route 12');
  assert.deepEqual(target, snapshot);
  assert.equal(target.name, 'Temple Push');
  assert.deepEqual({ x: target.x, y: target.y }, { x: 800, y: 800 });
});

test('Arabic Eden Map DOM copy keeps RTL accessibility labels localized', () => {
  const aria = {
    dataset: { edenI18nAria: 'missionControls' },
    setAttribute(name, value) {
      this[name] = value;
    },
  };
  const mission = { dataset: { edenMissionOption: 'enemy-red' }, textContent: '' };
  const root = {
    dataset: {},
    querySelectorAll(selector) {
      if (selector === '[data-eden-i18n-aria]') return [aria];
      if (selector === '[data-eden-mission-option]') return [mission];
      return [];
    },
  };

  applyEdenMapDomTranslations(root, 'ar');

  assert.equal(getLanguageDirection('ar'), 'rtl');
  assert.equal(root.dataset.edenLoadingLabel, 'جارٍ تحميل خريطة Eden…');
  assert.equal(aria['aria-label'], 'إعدادات المهمة');
  assert.equal(mission.textContent, 'العدو الأحمر');
});

test('Eden Map follows the prepaint document language before a preference is stored', () => {
  const previousDocument = globalThis.document;
  const previousStorage = globalThis.localStorage;
  const previousInitialLanguage = globalThis.VTS_INITIAL_LANGUAGE;
  try {
    globalThis.localStorage = { getItem: () => null };
    globalThis.VTS_INITIAL_LANGUAGE = '';
    globalThis.document = { documentElement: { lang: 'fr-FR' } };
    assert.equal(resolveEdenMapLocale(), 'fr');
    globalThis.document.documentElement.lang = 'ko-KR';
    assert.equal(resolveEdenMapLocale(), 'kr');
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
    if (previousStorage === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = previousStorage;
    if (previousInitialLanguage === undefined) delete globalThis.VTS_INITIAL_LANGUAGE;
    else globalThis.VTS_INITIAL_LANGUAGE = previousInitialLanguage;
  }
});

test('Eden Map shell and runtime use domain localization hooks for accessibility and live rerendering', async () => {
  const [html, runtime, sidebar, toolbar, ui, domain, gameTime, appCss, toolCss] =
    await Promise.all([
      readFile(new URL('../../tabs/eden-map.html', import.meta.url), 'utf8'),
      readFile(new URL('../../js/eden-map.js', import.meta.url), 'utf8'),
      readFile(new URL('../../js/eden-map-sidebar.js', import.meta.url), 'utf8'),
      readFile(new URL('../../js/eden-map-toolbar.js', import.meta.url), 'utf8'),
      readFile(new URL('../../js/eden-map-ui.js', import.meta.url), 'utf8'),
      readFile(new URL('../../js/i18n/eden-map/index.js', import.meta.url), 'utf8'),
      readFile(new URL('../../js/game-time.js', import.meta.url), 'utf8'),
      readFile(new URL('../../css/app.css', import.meta.url), 'utf8'),
      readFile(new URL('../../css/secondary-tools-v14.css', import.meta.url), 'utf8'),
    ]);

  assert.match(html, /data-eden-i18n="fullscreen"/);
  assert.match(html, /data-eden-i18n-aria="missionControls"/);
  assert.match(html, /data-eden-mission-option="enemy-purple"/);
  assert.match(html, /data-eden-sector-option="NC"/);
  assert.match(html, /data-eden-loading-label="Loading Eden Map…"/);
  assert.match(runtime, /window\.addEventListener\('edenLanguageUpdate'/);
  assert.match(runtime, /applyEdenMapDomTranslations\(root\)/);
  assert.match(
    runtime,
    /refreshEdenMapLanguage = async \(\) => \{[\s\S]*?syncOfflineStatus\(\);[\s\S]*?syncIsolateUi\(\);[\s\S]*?updateCoordHud\(\);[\s\S]*?draw\(\)/
  );
  assert.match(runtime, /dayLabel: edenMapText\('day'\)/);
  assert.match(runtime, /getEdenTerrainDisplayLabel\(terrain\)/);
  assert.match(sidebar, /getEdenStructureDisplayLabel/);
  assert.match(toolbar, /presetId: t\.id/);
  assert.match(ui, /edenMapText\('jumpTo'/);
  assert.match(domain, /ar: \(\) => import\('\.\/ar\.js'\)/);
  assert.doesNotMatch(domain, /import ar from/);
  assert.match(gameTime, /gameClockDayLabel/);
  assert.match(appCss, /content: attr\(data-eden-loading-label\)/);
  assert.match(toolCss, /content: attr\(data-eden-loading-label\)/);
});
