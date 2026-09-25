import assert from 'node:assert/strict';
import test from 'node:test';

import en from '../../js/i18n/hub-pdf/en.js';
import { PANEL_SETTINGS, renderPanelHtml, sheetFileName } from '../../js/hub-pdf/panel-view.js';
import { defaultHeroChoices, heroesPdf } from '../../js/hub-pdf/heroes.js';
import { researchPdf } from '../../js/hub-pdf/research.js';
import { classPdf } from '../../js/hub-pdf/class.js';
import { edenPdf } from '../../js/hub-pdf/eden.js';

const HUBS = [
  ['heroes', heroesPdf],
  ['research', researchPdf],
  ['class', classPdf],
  ['eden', edenPdf],
];

function stateFor(hub, def, choices = def.defaults()) {
  const ctx = { language: 'en' };
  return {
    hub,
    def,
    copy: en,
    choices,
    settings: { ...PANEL_SETTINGS },
    ctx,
    language: 'en',
    fields: def.form(en, choices, ctx),
  };
}

test('the panel is scope, detail, theme and exactly two downloads', () => {
  const html = renderPanelHtml(stateFor('heroes', heroesPdf));
  assert.match(html, /data-setting="detail"/);
  assert.match(html, /data-setting="theme"/);
  assert.equal((html.match(/data-download=/g) || []).length, 2, 'two download buttons');
  assert.match(html, /data-download="pdf"/);
  assert.match(html, /data-download="png"/);
  assert.equal((html.match(/<form/g) || []).length, 1, 'one screen, one form');
});

test('the print-era controls and the three designs are gone', () => {
  const html = renderPanelHtml(stateFor('heroes', heroesPdf));
  for (const gone of [
    'name="paper"',
    'name="orientation"',
    'name="sources"',
    'data-setting="paper"',
    'data-setting="orientation"',
    'data-setting="sources"',
    'data-setting="design"',
    'data-doc-print',
  ]) {
    assert.ok(!html.includes(gone), `${gone} is not part of the panel`);
  }
  for (const gone of [
    'designDashboard',
    'designMidnight',
    'designReference',
    'Midnight',
    'Compact',
  ]) {
    assert.ok(!html.includes(gone), `${gone} is not part of the panel`);
  }
});

test('the theme setting offers a dark and a light sheet only', () => {
  const html = renderPanelHtml(stateFor('heroes', heroesPdf));
  const theme = /data-setting="theme"[\s\S]*?<\/select>/.exec(html)?.[0] || '';
  assert.match(theme, /value="dark"/);
  assert.match(theme, /value="light"/);
  assert.equal((theme.match(/<option/g) || []).length, 2, 'two themes, no more');
  const detail = /data-setting="detail"[\s\S]*?<\/select>/.exec(html)?.[0] || '';
  assert.equal((detail.match(/<option/g) || []).length, 2, 'summary or full, no more');
});

test('every hub keeps its own scope form beside the same settings', () => {
  for (const [hub, def] of HUBS) {
    const html = renderPanelHtml(stateFor(hub, def));
    assert.match(html, new RegExp(`data-hub="${hub}"`));
    assert.match(html, /class="hub-pdf-scope"/);
    assert.ok(html.includes('data-field='), `${hub} still offers its scope choices`);
    assert.match(html, /hub-pdf-actions/);
  }
});

test('filenames carry the hub, the scope and the theme', () => {
  const state = stateFor('heroes', heroesPdf);
  assert.equal(sheetFileName(state, 'pdf'), 'roc-heroes-all-seasons-all-troops-dark.pdf');
  assert.equal(sheetFileName(state, 'png'), 'roc-heroes-all-seasons-all-troops-dark.png');
  const light = { ...state, settings: { detail: 'full', theme: 'light' } };
  assert.equal(sheetFileName(light, 'pdf'), 'roc-heroes-all-seasons-all-troops-light.pdf');
  // One season and one troop narrow the name down.
  const narrow = stateFor('heroes', heroesPdf, {
    ...defaultHeroChoices(),
    seasons: ['S1'],
    troop: 'cavalry',
  });
  assert.equal(sheetFileName(narrow, 'pdf'), 'roc-heroes-s1-cavalry-dark.pdf');
});

test('the status line starts empty and names its states', () => {
  const html = renderPanelHtml(stateFor('heroes', heroesPdf));
  assert.match(html, /class="hub-pdf-status" role="status" aria-live="polite"><\/p>/);
  for (const key of ['preparing', 'downloaded', 'buildFailed', 'emptySelection']) {
    assert.ok(typeof en[key] === 'string' && en[key].length, `the copy has ${key}`);
  }
});

test('the panel markup escapes the copy it prints', () => {
  const state = stateFor('heroes', heroesPdf);
  const html = renderPanelHtml({
    ...state,
    copy: { ...en, panelTitle: '<img src=x onerror=alert(1)>' },
  });
  assert.ok(!html.includes('<img src=x'), 'a hostile title cannot become markup');
  assert.match(html, /&lt;img src=x/);
});
