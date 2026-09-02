import './dom-stub.js';
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildCsvText,
  buildJsonDocument,
  csvCell,
  datedExportFilename,
  decodeSharePayload,
  encodeSharePayload,
  sanitizeForExport,
  slugifyExportName,
} from '../../js/codex-export.js';

test('sanitizeForExport strips sensitive keys and normalizes values', () => {
  const input = {
    troopCount: 12,
    password: 'hunter2',
    apiKey: 'secret',
    token: 'abc',
    authToken: 'xyz',
    refresh_token: 'nope',
    note: 'ok',
    born: new Date('2026-01-01T00:00:00Z'),
    big: 42n,
    badNumber: Number.NaN,
    nested: { Authorization: 'bearer', safe: 1 },
    list: [1, undefined, 3],
  };
  const clean = sanitizeForExport(input);
  assert.equal(clean.troopCount, 12);
  assert.equal(Object.hasOwn(clean, 'password'), false);
  assert.equal(Object.hasOwn(clean, 'apiKey'), false);
  assert.equal(Object.hasOwn(clean, 'token'), false);
  assert.equal(Object.hasOwn(clean, 'authToken'), false);
  assert.equal(Object.hasOwn(clean, 'refresh_token'), false);
  assert.equal(clean.note, 'ok');
  assert.equal(clean.born, '2026-01-01T00:00:00.000Z');
  assert.equal(clean.big, '42');
  assert.equal(clean.badNumber, null);
  assert.equal(Object.hasOwn(clean.nested, 'Authorization'), false);
  assert.deepEqual(clean.list, [1, null, 3]);
});

test('sanitizeForExport throws on cycles', () => {
  const input = { name: 'loop' };
  input.self = input;
  assert.throws(() => sanitizeForExport(input), /must not contain cycles/);
});

test('csvCell escapes commas, quotes and newlines', () => {
  assert.equal(csvCell('plain'), 'plain');
  assert.equal(csvCell(0), '0');
  assert.equal(csvCell(null), '');
  assert.equal(csvCell('a,b'), '"a,b"');
  assert.equal(csvCell('say "hi"'), '"say ""hi"""');
});

test('csv exports carry branding footers with credits', () => {
  const text = buildCsvText({
    columns: ['hero', 'season'],
    rows: [
      { hero: 'Cyrus', season: 'X12' },
      { hero: 'Pepin', season: 'X12' },
    ],
    toolName: 'planner',
  });
  assert.ok(text.startsWith('\uFEFF'));
  assert.ok(text.includes('hero,season'));
  assert.ok(text.includes('Cyrus'));
  assert.ok(text.startsWith('\uFEFFhero,season'));
  const footerLines = text
    .split('\n')
    .filter((line) => line.startsWith('#'));
  assert.ok(footerLines.length >= 3);
  const joined = footerLines.join('\n');
  assert.ok(joined.includes('DonPablone'));
  assert.ok(joined.includes('Hero Combo Creator'));
  assert.ok(joined.includes('riseofcastles.net community'));
});

test('csv exports reject third-party watermark content', () => {
  assert.throws(
    () =>
      buildCsvText({
        columns: ['note'],
        rows: [{ note: 'watermark DONPABLONE' }],
      }),
    /DONPABLONE/
  );
});

test('json exports produce a schema-versioned envelope', () => {
  const { document, text } = buildJsonDocument({
    schema: 'roc-vts.research-planner',
    schemaVersion: 1,
    payload: { plan: { warBadges: 100 } },
  });
  assert.equal(document.schema, 'roc-vts.research-planner');
  assert.equal(document.schemaVersion, 1);
  assert.equal(document.payload.plan.warBadges, 100);
  assert.equal(document.sources.length, 7);
  assert.match(text, /"schemaVersion": 1/);
});

test('json exports reject third-party watermark content', () => {
  assert.throws(
    () =>
      buildJsonDocument({
        schema: 'x',
        schemaVersion: 1,
        payload: { signature: 'DONPABLONE' },
      }),
    /DONPABLONE/
  );
});

test('share codec round-trips and rejects kind mismatches and tampering', () => {
  const hash = encodeSharePayload('preset', { a: { root: 2 }, b: [1, 2] });
  assert.ok(hash.length > 0);
  const decoded = decodeSharePayload('preset', hash);
  assert.deepEqual(decoded, { a: { root: 2 }, b: [1, 2] });
  assert.equal(decodeSharePayload('other-kind', hash), null);
  assert.equal(decodeSharePayload('preset', `${hash}zz`), null);
  assert.equal(decodeSharePayload('preset', ''), null);
});

test('share codec refuses oversized payloads', () => {
  const huge = encodeSharePayload('preset', { text: 'x'.repeat(100_000) });
  assert.equal(huge, '');
});

test('filename helpers slugify and date-stamp', () => {
  assert.equal(slugifyExportName('Research Planner!'), 'research-planner');
  assert.equal(slugifyExportName(''), 'export');
  assert.match(datedExportFilename('Research Planner', 'csv'), /^vts-research-planner-\d{4}-\d{2}-\d{2}\.csv$/);
});
