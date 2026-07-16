import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { ADMIN_RUNTIME_EN } from '../../js/i18n/admin-runtime-copy.js';

const LOCALES = ['ar', 'de', 'es', 'fr', 'id', 'kr', 'pt', 'ru', 'tr', 'zh'];

function placeholders(value) {
  return [...String(value).matchAll(/\{([A-Za-z0-9_]+)\}/g)].map((match) => match[1]).sort();
}

async function loadAdminPack(locale) {
  const module = await import(`../../js/i18n/admin-runtime/${locale}.js`);
  return module[`ADMIN_RUNTIME_${locale.toUpperCase()}`];
}

test('every main locale integrates its admin runtime pack', () => {
  for (const locale of ['en', ...LOCALES]) {
    const source = readFileSync(`js/i18n/${locale}.js`, 'utf8');
    const constant = `ADMIN_RUNTIME_${locale.toUpperCase()}`;
    const importPath = locale === 'en' ? './admin-runtime-copy.js' : `./admin-runtime/${locale}.js`;
    assert.match(source, new RegExp(`import \\{ ${constant} \\} from '${importPath}'`));
    assert.match(source, new RegExp(`\\.\\.\\.${constant}`));
  }
});

test('admin runtime packs cover every key and preserve interpolation contracts', async () => {
  const englishKeys = Object.keys(ADMIN_RUNTIME_EN).sort();
  assert.ok(englishKeys.length >= 200, 'admin runtime catalog should cover the complete surface');

  for (const locale of LOCALES) {
    const pack = await loadAdminPack(locale);
    assert.deepEqual(Object.keys(pack).sort(), englishKeys, `${locale} key parity`);
    for (const key of englishKeys) {
      assert.deepEqual(
        placeholders(pack[key]),
        placeholders(ADMIN_RUNTIME_EN[key]),
        `${locale}.${key} placeholders`
      );
      assert.ok(String(pack[key]).trim(), `${locale}.${key} must not be blank`);
    }
  }
});

test('reviewed gamer/admin terminology is used in every locale', async () => {
  const expectations = {
    ar: ['الموسم', 'معركة الأبطال'],
    de: ['Saison', 'Heldenkampf'],
    es: ['Temporada', 'Batalla de héroes'],
    fr: ['Saison', 'Mêlée des héros'],
    id: ['Musim', 'Adu Hero'],
    kr: ['시즌', '영웅 난투'],
    pt: ['Temporada', 'Batalha de heróis'],
    ru: ['Сезон', 'Битва героев'],
    tr: ['Sezon', 'Kahraman Kapışması'],
    zh: ['赛季', '英雄乱斗'],
  };
  for (const [locale, [season, heroGame]] of Object.entries(expectations)) {
    const pack = await loadAdminPack(locale);
    assert.equal(pack.adminSeasonLabel, season, `${locale} season gaming term`);
    assert.equal(pack.adminGameHeroRumble, heroGame, `${locale} Hero Rumble title`);
    assert.notEqual(pack.adminHeatmapHint, ADMIN_RUNTIME_EN.adminHeatmapHint);
    assert.notEqual(pack.adminOverrideCodePrompt, ADMIN_RUNTIME_EN.adminOverrideCodePrompt);
  }
});

test('reviewed English and Russian admin summaries avoid broken count inflections', async () => {
  const ru = await loadAdminPack('ru');
  assert.equal(
    ADMIN_RUNTIME_EN.adminTargetMixSummary,
    'Hits: {hits} · Demolition: {demo} · Target groups: {groups}'
  );
  assert.equal(
    ADMIN_RUNTIME_EN.adminDutyOpsSummary,
    'Records: {records} · Matched: {matched} · Latest: {latest}'
  );
  assert.equal(ru.adminOcrCheck, 'Проверить OCR');
  assert.equal(ru.adminConsistencyDecliners, 'Игроки со снижением активности');
  assert.equal(ru.adminAssignmentsCount, 'Задания: {count}');
  assert.equal(ru.adminActivityTargetCount, 'Цели: {count}');
  assert.equal(ru.adminParticipationCasualCount, 'Нерегулярные ({count})');
  assert.equal(ru.adminParticipationMissedCount, 'Пропустили ({count})');
  assert.equal(ru.adminActivityPace, 'Темп');
  assert.equal(ru.adminActivityCrew, 'Команда');
});

test('admin template localizes visible labels, placeholders, and aria text', () => {
  const template = readFileSync('tabs/admin.html', 'utf8');
  for (const key of [
    'adminOcrWorkerKeyNote',
    'adminOcrCheck',
    'adminExpCsvDebug',
    'adminTerminalToolbar',
    'adminTerminalEventsAria',
    'adminOcrProgressAria',
    'adminHistoryPh',
    'adminContributionDropZone',
    'adminConductSearchPh',
    'adminBannerDropZone',
    'adminPatherDropZone',
    'adminGameHeroRumbleHint',
  ]) {
    assert.match(template, new RegExp(`data-i18n(?:-aria|-ph)?="${key}"`), key);
  }

  for (const tag of template.matchAll(/<([A-Za-z][^\s/>]*)([^>]*)>/gs)) {
    const attributes = [...tag[2].matchAll(/\s+([^\s=/>]+)\s*=/g)].map((match) =>
      match[1].toLowerCase()
    );
    const duplicates = [
      ...new Set(attributes.filter((name, index) => attributes.indexOf(name) !== index)),
    ];
    assert.deepEqual(
      duplicates,
      [],
      `duplicate attributes on <${tag[1]}>: ${duplicates.join(', ')}`
    );
  }
});

test('admin runtime no longer ships known visible English fallbacks', () => {
  const source = ['js/ocr-render.js', 'js/ocr-roster.js', 'js/ocr-dashboard.js']
    .map((path) => readFileSync(path, 'utf8'))
    .join('\n');
  for (const phrase of [
    'Ready for upload',
    'No attack data yet',
    'No timestamped attacks yet',
    'Activity trend by day',
    'No votes yet.</div>',
    'Enter admin override code:',
    'Edit Structure Name (',
    'Alliance Roster',
    'Show all ${rows.length}',
    'No contribution names found',
    'Unknown Player',
    'Unknown Day',
    'Marked complete by admin override',
    'Clear match',
    'Default contribution',
    'uploaded screenshots',
    'Enter owner PIN',
    'Global Top Performers',
    'App Check site key missing',
    'Worker authorization blocked',
    'Roster history changed in cloud',
    '% off',
  ]) {
    assert.doesNotMatch(source, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

test('admin language changes rerender whichever dashboard subtab is active', () => {
  const source = readFileSync('js/ocr-dashboard.js', 'utf8');
  assert.match(
    source,
    /function scheduleAdminLanguageRefresh\(\)[\s\S]*?requestAnimationFrame\(\(\) => \{[\s\S]*?renderDashboardSubtab\(\);/
  );
});

test('Arabic admin copy is RTL-native and keeps technical tokens readable', async () => {
  const ar = await loadAdminPack('ar');
  assert.match(ar.adminGameHeroRumble, /\p{Script=Arabic}/u);
  assert.match(ar.adminOcrWorkerKeyNote, /OCR/);
  assert.match(ar.adminEditPlayerValuePrompt, /DELETE/);
  assert.doesNotMatch(ar.adminHeatmapHint, /Hover|Scroll/i);
});
