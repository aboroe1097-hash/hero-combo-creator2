import './dom-stub.js';
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertNoForbiddenWatermarks,
  csvFooterLines,
  drawCanvasFooter,
  getExportBranding,
  jsonMetaBlock,
  truncateCanvasText,
} from '../../js/export-branding.js';

function fakeCtx({ charWidth = 4 } = {}) {
  const calls = [];
  return {
    calls,
    measureText(text) {
      return { width: String(text).length * charWidth };
    },
    fillText(text, x, y) {
      calls.push({ text, x, y });
    },
    save() {},
    restore() {},
    beginPath() {},
    arc() {},
    closePath() {},
    clip() {},
    drawImage() {},
  };
}

test('branding composes display name from seo.js constants', () => {
  const brand = getExportBranding({ revision: 'x12-2026-09-02', verificationStatus: 'current' });
  assert.equal(brand.siteName, 'Hero Combo Creator');
  assert.ok(brand.displayName.startsWith('Hero Combo Creator'));
  assert.ok(brand.displayName.includes('VTS 1097'));
  assert.equal(brand.datasetRevision, 'x12-2026-09-02');
  assert.equal(brand.verificationStatus, 'current');
  assert.ok(brand.logoUrl.startsWith('https://roc-vts.com/'));
  assert.match(brand.appVersion, /^\d+\.\d+\.\d+$/);
});

test('credit footers include every credited source by name', () => {
  const brand = getExportBranding();
  const footers = csvFooterLines(brand);
  const joined = footers.join('\n');
  for (const credit of [
    'DonPablone',
    'FedeSack',
    'Mtness',
    'Raven',
    'Cris Minime',
    'riseofcastles.net community',
    'Rustablesafe (concepts)',
  ]) {
    assert.ok(joined.includes(credit), `footer must credit ${credit}`);
  }
  assert.ok(joined.includes(brand.displayName));
  assert.ok(joined.includes(brand.appVersion));
});

test('json meta block carries schema, app, dataset and sources', () => {
  const meta = jsonMetaBlock(getExportBranding({ revision: 'r4' }), 'roc-vts.planner', 1);
  assert.equal(meta.schema, 'roc-vts.planner');
  assert.equal(meta.schemaVersion, 1);
  assert.equal(meta.dataset.revision, 'r4');
  assert.equal(meta.sources.length, 7);
});

test('watermark assertion rejects DONPABLONE but allows legitimate L96 attribution', () => {
  assert.throws(() => assertNoForbiddenWatermarks('signed DONPABLONE'), /DONPABLONE/);
  assert.equal(assertNoForbiddenWatermarks('L96 Codex archive transcription'), true);
  assert.equal(assertNoForbiddenWatermarks('Source: L96 research notes'), true);
});

test('canvas footer fits wide canvases and credits sources', () => {
  const ctx = fakeCtx();
  const brand = getExportBranding();
  const fits = drawCanvasFooter(ctx, brand, { x: 28, y: 100, width: 1200 });
  assert.equal(fits, true);
  const text = ctx.calls.map((call) => call.text).join('\n');
  assert.ok(text.includes(brand.displayName));
  assert.ok(text.includes(brand.appVersion));
  assert.ok(text.includes('Sources:'));
});

test('canvas footer truncates instead of overflowing narrow canvases', () => {
  const ctx = fakeCtx();
  const brand = getExportBranding();
  const fits = drawCanvasFooter(ctx, brand, { x: 28, y: 100, width: 200 });
  assert.equal(fits, false);
  const line2 = ctx.calls[1].text;
  assert.ok(line2.endsWith('…'));
});

test('truncateCanvasText reports the fits contract', () => {
  const ctx = fakeCtx();
  const wide = truncateCanvasText(ctx, 'short', 1000);
  assert.equal(wide.fits, true);
  assert.equal(wide.text, 'short');
  const narrow = truncateCanvasText(ctx, 'a very long label that cannot fit', 40);
  assert.equal(narrow.fits, false);
  assert.ok(narrow.text.endsWith('…'));
  const absurd = truncateCanvasText(ctx, 'ab', 0);
  assert.equal(absurd.fits, false);
});

test('drawCanvasFooter returns false for a missing context', () => {
  assert.equal(drawCanvasFooter(null, getExportBranding()), false);
});
