import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ADMIN_ALL_STAR_BOH_EN,
  ADMIN_ALL_STAR_BOH_LOCALES,
  adminAllStarBohText,
  loadAdminAllStarBohLocale,
} from '../../js/i18n/admin-all-star-boh/index.js';
import { ADMIN_ALL_STAR_BOH_SHARED_ADDITIONS } from '../../js/i18n/admin-all-star-boh/shared-additions.js';
import {
  ALL_STAR_BOH_EN,
  ALL_STAR_BOH_LOCALES,
  allStarBohText,
  loadAllStarBohLocale,
} from '../../js/i18n/all-star-boh/index.js';
import ALL_STAR_BOH_RU from '../../js/i18n/all-star-boh/ru.js';

function placeholderSignature(value) {
  return Array.from(String(value).matchAll(/\{(\w+)\}/gu), (match) => match[1]).sort();
}

const PLAYER_SAFETY_TRANSLATION_KEYS = Object.freeze([
  'feedback.correctionDescription',
  'feedback.correctionResubmittedDescription',
  'feedback.correctionResubmittedTitle',
  'feedback.correctionTitle',
  'signup.deviceIdentityDescription',
  'signup.deviceIdentityTitle',
  'signup.ocrCheckDescription',
  'signup.ocrCheckTitle',
  'signup.ocrIssueLowConfidence',
  'signup.ocrIssueMissing',
  'signup.ocrIssueMissingConfidence',
  'signup.ocrMissingSummary',
]);

const RUSSIAN_PLAYER_SAFETY_TRANSLATION_KEYS = Object.freeze(['signup.ocrError']);

async function assertLocaleParity({
  locale,
  english,
  load,
  translate,
  label,
  coverageIgnoredKeys = [],
}) {
  const pack = await load(locale);
  assert.deepEqual(
    Object.keys(pack).sort(),
    Object.keys(english).sort(),
    `${label} ${locale} must contain exactly the canonical keys`
  );

  let translatedCount = 0;
  let coverageKeyCount = 0;
  const ignored = new Set(coverageIgnoredKeys);
  for (const [key, englishValue] of Object.entries(english)) {
    const localizedValue = pack[key];
    assert.equal(typeof localizedValue, 'string', `${label} ${locale}.${key} must be text`);
    assert.ok(localizedValue.trim(), `${label} ${locale}.${key} must not be empty`);
    assert.deepEqual(
      placeholderSignature(localizedValue),
      placeholderSignature(englishValue),
      `${label} ${locale}.${key} must preserve placeholders`
    );
    if (!ignored.has(key)) {
      coverageKeyCount += 1;
      if (localizedValue !== englishValue) translatedCount += 1;
    }
  }

  const minimumCoverage = locale === 'hr' ? 0.25 : 0.6;
  assert.ok(
    translatedCount >= Math.floor(coverageKeyCount * minimumCoverage),
    `${label} ${locale} must translate most canonical copy instead of silently reusing English`
  );
  const sampleKey = Object.keys(english).find((key) => pack[key] !== english[key]);
  assert.equal(translate(sampleKey, {}, locale), pack[sampleKey]);
}

test('all twelve player locale chunks preserve canonical keys and safe fallback', async () => {
  for (const locale of ALL_STAR_BOH_LOCALES.slice(1)) {
    await assertLocaleParity({
      locale,
      english: ALL_STAR_BOH_EN,
      load: loadAllStarBohLocale,
      translate: allStarBohText,
      label: 'player',
    });
    const pack = await loadAllStarBohLocale(locale);
    for (const key of PLAYER_SAFETY_TRANSLATION_KEYS) {
      assert.notEqual(
        pack[key],
        ALL_STAR_BOH_EN[key],
        `player ${locale}.${key} must not silently fall back to English`
      );
    }
  }
});

test('Russian OCR failure safety copy is native instead of an English fallback', () => {
  for (const key of RUSSIAN_PLAYER_SAFETY_TRANSLATION_KEYS) {
    assert.equal(typeof ALL_STAR_BOH_RU[key], 'string');
    assert.ok(ALL_STAR_BOH_RU[key].trim());
    assert.notEqual(ALL_STAR_BOH_RU[key], ALL_STAR_BOH_EN[key]);
  }
});

test('all eleven admin locale chunks have complete keys, placeholders, and live lookup', async () => {
  for (const locale of ADMIN_ALL_STAR_BOH_LOCALES.slice(1)) {
    await assertLocaleParity({
      locale,
      english: ADMIN_ALL_STAR_BOH_EN,
      load: loadAdminAllStarBohLocale,
      translate: adminAllStarBohText,
      label: 'admin',
      coverageIgnoredKeys: Object.keys(ADMIN_ALL_STAR_BOH_SHARED_ADDITIONS),
    });
  }
});
