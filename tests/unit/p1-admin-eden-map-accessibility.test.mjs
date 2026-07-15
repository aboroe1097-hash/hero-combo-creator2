import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
  availableLanguages,
  loadTranslationsForLanguage,
  translations,
} from '../../js/translations.js';
import { P1_COPY_KEYS } from '../../js/i18n/p1-copy.js';

const dashboardCss = fs.readFileSync(
  new URL('../../css/ocr-dashboard.css', import.meta.url),
  'utf8'
);
const sharedTokensCss = fs.readFileSync(new URL('../../css/_tokens.css', import.meta.url), 'utf8');
const edenMap = fs.readFileSync(new URL('../../tabs/eden-map.html', import.meta.url), 'utf8');

await Promise.all(availableLanguages.map((lang) => loadTranslationsForLanguage(lang)));

test('admin functional muted text avoids the dashboard-scoped dim token cascade', () => {
  assert.match(sharedTokensCss, /--text-secondary:\s*var\(--ff-text-supporting\)/);
  assert.match(sharedTokensCss, /:root\s*\{[^}]*--ff-text-supporting:\s*#c8d4e8/s);
  assert.match(
    sharedTokensCss,
    /\[data-theme='light'\]\s*\{[\s\S]*?--ff-text-supporting:\s*#334155/
  );

  for (const selector of [
    '#ocrDashboardRoot .dash-updated',
    '#ocrDashboardRoot .dash-search-input::placeholder',
  ]) {
    const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const blocks = [
      ...dashboardCss.matchAll(new RegExp(`${escapedSelector}\\s*\\{(?<body>[^}]*)\\}`, 'gs')),
    ];
    assert.equal(blocks.length, 1, `${selector} should have one unambiguous color rule`);
    assert.match(
      blocks[0].groups.body,
      /color:\s*var\(--text-secondary\)/,
      `${selector} should use the theme-adaptive supporting text token`
    );
    assert.doesNotMatch(blocks[0].groups.body, /var\(--(?:ff-)?text-(?:dim|mute|muted)\)/);
  }
});

test('all nine Eden Map selects have persistent localized accessible names', () => {
  const expectedNames = {
    edenDatasetSelect: 'edenDatasetLabel',
    edenSectorSelect: 'edenSectorTitle',
    edenPathColor: 'edenPathColorTitle',
    edenDrawColor: 'edenDrawColorTitle',
    edenTeamFilter: 'edenTeamFilterTitle',
    edenOwnershipFilter: 'edenOwnershipFilterLabel',
    edenZoneFilter: 'edenZoneLabel',
    edenTypeFilter: 'edenTypeFilterLabel',
    edenSortSelect: 'edenSortSelectLabel',
  };

  for (const [id, key] of Object.entries(expectedNames)) {
    const select = edenMap.match(new RegExp(`<select\\b(?=[^>]*\\bid="${id}")[^>]*>`, 's'))?.[0];
    assert.ok(select, `#${id} should be a select`);
    assert.match(select, new RegExp(`\\bdata-i18n-aria="${key}"`));
    assert.match(select, /\baria-label="[^"]+"/);
  }

  for (const language of availableLanguages) {
    const dictionary = translations[language];
    for (const key of new Set(Object.values(expectedNames))) {
      assert.equal(typeof dictionary[key], 'string', `${language}.${key} should exist`);
      assert.notEqual(dictionary[key].trim(), '', `${language}.${key} should not be empty`);
    }
  }
});

test('neutral generator result-count messages preserve their interpolation in every locale', () => {
  for (const language of availableLanguages) {
    const dictionary = translations[language];
    for (const key of ['generatorFoundComboOne', 'generatorFoundComboMany']) {
      assert.match(dictionary[key] || '', /\{n\}/, `${language}.${key} should preserve {n}`);
    }
  }
});

test('shared P1 copy is localized in every locale', () => {
  for (const language of availableLanguages) {
    const dictionary = translations[language];
    for (const key of P1_COPY_KEYS) {
      assert.equal(typeof dictionary[key], 'string', `${language}.${key} should exist`);
      assert.notEqual(dictionary[key].trim(), '', `${language}.${key} should not be empty`);
    }
    for (const arrow of ['←', '→']) {
      assert.ok(
        dictionary.edenX1HeatmapScrollHint.includes(arrow),
        `${language}.edenX1HeatmapScrollHint should name the ${arrow} key`
      );
    }
  }

  for (const language of availableLanguages.filter((lang) => lang !== 'en')) {
    for (const key of P1_COPY_KEYS) {
      assert.notEqual(
        translations[language][key],
        translations.en[key],
        `${language}.${key} should not fall back to English`
      );
    }
  }
});
