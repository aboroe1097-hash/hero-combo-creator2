import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = {
  VTS_ADMIN_AUTH: {},
};
globalThis.localStorage = {
  getItem: () => null,
  setItem: () => {},
};
globalThis.document = {
  getElementById: () => null,
  querySelector: () => null,
  querySelectorAll: () => [],
};

const { normalizeStructureName } = await import('../../js/ocr-engine.js');

test('OCR structure normalization fixes common visual confusions', () => {
  assert.equal(normalizeStructureName('capita1'), 'Capital');
  assert.equal(normalizeStructureName(' gate5 '), 'Gates');
  assert.equal(normalizeStructureName('temp1e'), 'Temple');
  assert.equal(normalizeStructureName('strongho1d unknown'), 'Stronghold');
});

test('OCR structure normalization preserves already-valid names', () => {
  assert.equal(normalizeStructureName('Capital'), 'Capital');
  assert.equal(normalizeStructureName('Custom Fortress'), 'Custom Fortress');
  assert.equal(normalizeStructureName(null), null);
});
