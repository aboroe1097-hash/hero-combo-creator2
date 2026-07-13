import test from 'node:test';
import assert from 'node:assert/strict';

import { decodeCombos, encodeCombos } from '../../js/combo-share.js';
import { decodeRoster, encodeRoster } from '../../js/roster-share.js';

function encodeLegacy(value) {
  return btoa(encodeURIComponent(JSON.stringify(value)));
}

test('combo shares round-trip as URL-safe payloads', () => {
  const encoded = encodeCombos([
    { heroes: ['Ragnar', 'Cleopatra', 'Theodora'], displayScore: '98.5' },
  ]);

  assert.match(encoded, /^[A-Za-z0-9_-]+$/);
  assert.deepEqual(decodeCombos(encoded), [
    { heroes: ['Ragnar', 'Cleopatra', 'Theodora'], displayScore: '98.5' },
  ]);
});

test('combo decoder accepts legacy links and rejects malformed structures', () => {
  const legacy = encodeLegacy([{ h: ['Ragnar', 'Cleopatra', 'Theodora'], s: 87 }]);

  assert.deepEqual(decodeCombos(legacy), [
    { heroes: ['Ragnar', 'Cleopatra', 'Theodora'], displayScore: '87' },
  ]);
  assert.equal(decodeCombos(encodeLegacy([{ h: ['Only one'], s: '<img>' }])), null);
  assert.equal(decodeCombos('not-base64'), null);
  assert.equal(decodeCombos('A'.repeat(8193)), null);
});

test('combo shares cap list size and never preserve executable score text', () => {
  const combos = Array.from({ length: 8 }, (_, index) => ({
    heroes: [`Hero ${index}A`, `Hero ${index}B`, `Hero ${index}C`],
    displayScore: index === 0 ? '<img src=x onerror=alert(1)>' : 100 - index,
  }));
  const decoded = decodeCombos(encodeCombos(combos));

  assert.equal(decoded.length, 5);
  assert.equal(decoded[0].displayScore, '—');
});

test('roster shares round-trip Unicode names, remove duplicates, and stay URL-safe', () => {
  const encoded = encodeRoster(['Ragnar', 'Феечка))', 'Ragnar']);

  assert.match(encoded, /^[A-Za-z0-9_-]+$/);
  assert.deepEqual(decodeRoster(encoded), ['Ragnar', 'Феечка))']);
});

test('roster decoder accepts legacy links and rejects non-list payloads', () => {
  assert.deepEqual(decodeRoster(encodeLegacy(['Ragnar', 'Cleopatra'])), ['Ragnar', 'Cleopatra']);
  assert.equal(decodeRoster(encodeLegacy({ roster: ['Ragnar'] })), null);
  assert.equal(decodeRoster('not-base64'), null);
  assert.equal(decodeRoster('A'.repeat(65537)), null);
});
