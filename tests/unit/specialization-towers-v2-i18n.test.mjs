import assert from 'node:assert/strict';
import test from 'node:test';

import {
  SPECIALIZATION_TOWERS_V2_CONTEXT_KEYS,
  SPECIALIZATION_TOWERS_V2_EN,
  SPECIALIZATION_TOWERS_V2_KEYS,
  SPECIALIZATION_TOWERS_V2_LOCALES,
  SPECIALIZATION_TOWERS_V2_ROW_SCOPE_KEYS,
  auditSpecializationTowersV2Pack,
  bindSpecializationTowersV2LanguageChange,
  getActiveSpecializationTowersV2Locale,
  getSpecializationTowersV2Direction,
  getSpecializationTowersV2Pack,
  interpolateSpecializationTowersV2,
  loadSpecializationTowersV2Locale,
  localeFromSpecializationTowersV2LanguageEvent,
  resolveSpecializationTowersV2Locale,
  specializationTowersV2Text,
} from '../../js/i18n/specialization-towers-v2/index.js';

const EXPECTED_LOCALES = ['en', 'ar', 'de', 'es', 'fr', 'id', 'it', 'kr', 'pt', 'ru', 'tr', 'zh'];
const INTENTIONAL_EN_ONLY_KEYS = Object.freeze(['selectNodeBeforeMedals']);

function placeholders(value) {
  return [...String(value).matchAll(/\{([A-Za-z0-9_]+)\}/g)].map((match) => match[1]).sort();
}

await Promise.all(EXPECTED_LOCALES.map((locale) => loadSpecializationTowersV2Locale(locale)));

test('Specialization Towers v2 exposes one strict UI key contract across all 12 locales', () => {
  assert.deepEqual(SPECIALIZATION_TOWERS_V2_LOCALES, EXPECTED_LOCALES);
  assert.ok(SPECIALIZATION_TOWERS_V2_KEYS.length >= 120, 'the complete feature UI is covered');

  const englishKeys = Object.keys(SPECIALIZATION_TOWERS_V2_EN).sort();
  for (const locale of EXPECTED_LOCALES) {
    const pack = getSpecializationTowersV2Pack(locale);
    const localeKeys = Object.keys(pack).sort();
    const expectedKeys = ['en', 'it', 'kr'].includes(locale)
      ? englishKeys
      : englishKeys.filter((key) => !INTENTIONAL_EN_ONLY_KEYS.includes(key));
    assert.deepEqual(localeKeys, expectedKeys, `${locale} key parity`);
    const audit = auditSpecializationTowersV2Pack(pack);
    assert.deepEqual(audit, {
      complete: ['en', 'it', 'kr'].includes(locale),
      missing: ['en', 'it', 'kr'].includes(locale) ? [] : INTENTIONAL_EN_ONLY_KEYS,
      extra: [],
      blank: ['en', 'it', 'kr'].includes(locale) ? [] : INTENTIONAL_EN_ONLY_KEYS,
      placeholderMismatches: [],
    });

    for (const key of expectedKeys) {
      assert.ok(String(pack[key]).trim(), `${locale}.${key} must not be blank`);
      assert.deepEqual(
        placeholders(pack[key]),
        placeholders(SPECIALIZATION_TOWERS_V2_EN[key]),
        `${locale}.${key} interpolation contract`
      );
    }
    if (!['en', 'it', 'kr'].includes(locale)) {
      assert.equal(
        specializationTowersV2Text('selectNodeBeforeMedals', {}, locale),
        SPECIALIZATION_TOWERS_V2_EN.selectNodeBeforeMedals,
        `${locale}.selectNodeBeforeMedals should intentionally fall back to English`
      );
    }
  }
});

test('all 12 calculation contexts and four row scopes have localized labels', () => {
  assert.deepEqual(Object.keys(SPECIALIZATION_TOWERS_V2_CONTEXT_KEYS), [
    'general',
    'baseAttributes',
    'skill',
    'nonSiege',
    'siege',
    'siegeAttacks',
    'siegeDefense',
    'roc',
    'battlefield',
    'rallyJoin',
    'initiatingRally',
    'reinforcingAllies',
  ]);
  assert.deepEqual(Object.keys(SPECIALIZATION_TOWERS_V2_ROW_SCOPE_KEYS), [
    'all',
    'front',
    'mid',
    'back',
  ]);

  for (const locale of EXPECTED_LOCALES) {
    const pack = getSpecializationTowersV2Pack(locale);
    for (const key of [
      ...Object.values(SPECIALIZATION_TOWERS_V2_CONTEXT_KEYS),
      ...Object.values(SPECIALIZATION_TOWERS_V2_ROW_SCOPE_KEYS),
    ]) {
      assert.ok(pack[key], `${locale}.${key}`);
    }
  }
});

test('locale resolution handles regional tags, Korean aliases, and safe English fallback', () => {
  assert.equal(resolveSpecializationTowersV2Locale('pt-BR'), 'pt');
  assert.equal(resolveSpecializationTowersV2Locale('ko-KR'), 'kr');
  assert.equal(resolveSpecializationTowersV2Locale('AR-eg'), 'ar');
  assert.equal(resolveSpecializationTowersV2Locale('unsupported'), 'en');
  assert.equal(getSpecializationTowersV2Direction('ar'), 'rtl');
  assert.equal(getSpecializationTowersV2Direction('en'), 'ltr');
});

test('text interpolation preserves unresolved tokens and falls back to English or the key', async () => {
  await loadSpecializationTowersV2Locale('es');
  assert.equal(getActiveSpecializationTowersV2Locale(), 'es');
  assert.equal(
    specializationTowersV2Text('progressOf', { completed: 3, total: 8 }, 'es'),
    '3 de 8'
  );
  assert.equal(
    interpolateSpecializationTowersV2('{known} / {missing}', { known: 4 }),
    '4 / {missing}'
  );
  assert.equal(specializationTowersV2Text('missingKey', {}, 'es'), 'missingKey');
});

test('language-change binding follows the existing vts event contract and is disposable', async () => {
  let listener = null;
  let removed = null;
  const target = {
    addEventListener(type, callback) {
      assert.equal(type, 'vts:language-change');
      listener = callback;
    },
    removeEventListener(type, callback) {
      removed = { type, callback };
    },
  };
  let update = null;
  const dispose = bindSpecializationTowersV2LanguageChange((next) => {
    update = next;
  }, target);

  const event = { detail: { lang: 'ar-EG' } };
  assert.equal(localeFromSpecializationTowersV2LanguageEvent(event), 'ar');
  await listener(event);
  assert.equal(update.locale, 'ar');
  assert.equal(update.direction, 'rtl');
  assert.equal(update.pack, getSpecializationTowersV2Pack('ar'));
  assert.equal(update.event, event);

  dispose();
  assert.deepEqual(removed, { type: 'vts:language-change', callback: listener });
});

test('Arabic is RTL-native while canonical game-data boundaries remain explicit', () => {
  const ar = getSpecializationTowersV2Pack('ar');
  for (const key of [
    'title',
    'subtitle',
    'back',
    'overallProgress',
    'medalsRequired',
    'legionSkillNote',
    'contextSiege',
    'rowFront',
    'searchPlaceholder',
    'closeDialog',
    'communityDataTitle',
    'contributionInstructions',
  ]) {
    assert.match(ar[key], /\p{Script=Arabic}/u, `ar.${key} should use Arabic script`);
  }
  assert.match(ar.canonicalEnglishNotice, /\p{Script=Arabic}/u);
  assert.match(ar.currentTowerProgress, /\p{Script=Arabic}/u);
  assert.match(
    specializationTowersV2Text('progressOf', { completed: 1, total: 8 }, 'ar'),
    /\p{Script=Arabic}/u
  );
  assert.match(SPECIALIZATION_TOWERS_V2_EN.canonicalEnglishNotice, /canonical English/i);
  assert.match(SPECIALIZATION_TOWERS_V2_EN.exactMedalDataOnly, /confirmed medal costs/i);
  assert.match(SPECIALIZATION_TOWERS_V2_EN.legionSkillNote, /all four researches/i);
  assert.match(SPECIALIZATION_TOWERS_V2_EN.legionSkillNote, /100%/);
  assert.equal(
    SPECIALIZATION_TOWERS_V2_EN.seasonAvailabilityNote,
    'Columns I–VI unlock in Season 3. Columns VII–VIII unlock in SX1.'
  );
  assert.equal(
    specializationTowersV2Text('unlocksInSeason', { season: 'SX1' }, 'en'),
    'Unlocks in SX1'
  );
  assert.equal(
    SPECIALIZATION_TOWERS_V2_EN.seasonPlanningNote,
    'Season availability is reference metadata and does not block planning.'
  );
});

test('community contribution copy requires evidence and keeps verification states distinct', () => {
  assert.equal(SPECIALIZATION_TOWERS_V2_EN.communityDataTitle, 'Help complete the node data');
  assert.equal(
    SPECIALIZATION_TOWERS_V2_EN.communityDataDescription,
    'We are collecting exact inner-node medal costs and prerequisites. Do not estimate values.'
  );
  assert.match(SPECIALIZATION_TOWERS_V2_EN.contributionInstructions, /evidence/i);
  assert.match(SPECIALIZATION_TOWERS_V2_EN.contributionInstructions, /verified/i);
  assert.match(SPECIALIZATION_TOWERS_V2_EN.contributionSheetPending, /pending/i);
  assert.ok(
    SPECIALIZATION_TOWERS_V2_EN.downloadContributionTemplate,
    'downloadContributionTemplate should be set'
  );
  assert.ok(
    SPECIALIZATION_TOWERS_V2_EN.contributionTemplateDownloaded,
    'contributionTemplateDownloaded should be set'
  );

  for (const locale of EXPECTED_LOCALES) {
    const pack = getSpecializationTowersV2Pack(locale);
    assert.equal(
      new Set([pack.verificationMissing, pack.verificationSubmitted, pack.verificationVerified])
        .size,
      3,
      `${locale} verification states must remain distinguishable`
    );
  }
});
