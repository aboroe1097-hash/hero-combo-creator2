// Batch edit across the VTS Admin lists: merging and re-dating saved duty
// records, setting Main/Banner on every row, and linking edited suggestions.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

globalThis.window = { VTS_ADMIN_AUTH: {} };
globalThis.localStorage = { getItem: () => null, setItem: () => {} };
globalThis.document = {
  getElementById: () => null,
  querySelector: () => null,
  querySelectorAll: () => [],
};

const { mergeDutyRecords, setDutyRecordsAccountType, setDutyRecordsDate, isDutyDate } =
  await import('../../js/duty-bulk-edit.js');
const { collectAccountLinkSuggestionAdditions } = await import('../../js/ocr-roster.js');

const shieldA = {
  id: 'shield_wall_b',
  type: 'shield_wall',
  date: '2026-09-21',
  note: 'evening',
  createdAt: '2026-09-21T20:00:00Z',
  entries: [
    { name: 'Roha', confirmed: 'Roha', accountType: 'banner' },
    { name: 'Anne', confirmed: 'Anne' },
  ],
};
const shieldB = {
  id: 'shield_wall_a',
  type: 'shield_wall',
  date: '2026-09-20',
  gameTime: '23:00',
  note: 'morning',
  createdAt: '2026-09-20T08:00:00Z',
  entries: [
    { name: 'roha', confirmed: 'ROHA', accountType: 'main', accountTypeSource: 'operator' },
    { name: 'Unknown one', confirmed: '' },
  ],
};
const shieldC = {
  id: 'shield_wall_c',
  type: 'shield_wall',
  date: '2026-09-22',
  note: 'morning',
  entries: [
    { name: 'Unknown one', confirmed: '' },
    { name: 'Bil', confirmed: 'Bil' },
  ],
};

test('merging keeps the earliest record and dedupes rows by confirmed name', () => {
  const merged = mergeDutyRecords([shieldA, shieldB, shieldC], '2026-09-23T00:00:00Z');
  assert.ok(merged);
  assert.equal(merged.record.id, 'shield_wall_a');
  assert.equal(merged.record.date, '2026-09-20');
  assert.equal(merged.record.gameTime, '23:00');
  assert.equal(merged.record.createdAt, '2026-09-20T08:00:00Z');
  assert.equal(merged.record.updatedAt, '2026-09-23T00:00:00Z');
  assert.equal(merged.record.note, 'morning + evening');
  assert.deepEqual(
    merged.record.entries.map((entry) => entry.confirmed || entry.name),
    ['ROHA', 'Unknown one', 'Anne', 'Bil']
  );
  // The earliest occurrence, with its operator choice, wins.
  assert.equal(merged.record.entries[0].accountType, 'main');
  assert.deepEqual(merged.removedIds.sort(), ['shield_wall_b', 'shield_wall_c']);
  // Inputs are not mutated.
  assert.equal(shieldA.entries.length, 2);
});

test('merging refuses mixed duty types or a single record', () => {
  assert.equal(mergeDutyRecords([shieldA, { ...shieldB, type: 'banner' }]), null);
  assert.equal(mergeDutyRecords([shieldA]), null);
  assert.equal(mergeDutyRecords(null), null);
});

test('set date and set account type change only the selected records', () => {
  const records = [shieldA, shieldB];
  const dated = setDutyRecordsDate(records, ['shield_wall_b'], '2026-09-01', 'now');
  assert.equal(dated[0].date, '2026-09-01');
  assert.equal(dated[1].date, '2026-09-20');
  assert.equal(setDutyRecordsDate(records, ['shield_wall_b'], '09/01/2026')[0].date, '2026-09-21');
  assert.equal(isDutyDate('2026-09-01'), true);
  assert.equal(isDutyDate('2026-9-1'), false);

  const typed = setDutyRecordsAccountType(records, ['shield_wall_b'], 'main', 'now');
  assert.ok(
    typed[0].entries.every((e) => e.accountType === 'main' && e.accountTypeSource === 'operator')
  );
  assert.equal(typed[1].entries[1].accountType, undefined);
  assert.equal(setDutyRecordsAccountType(records, ['shield_wall_b'], 'alt')[0], shieldA);
});

test('link all uses the edited owner and type, and skips empty owners', () => {
  const suggestions = [
    { account: 'Angel Banner', owner: 'Angel' },
    { account: 'Roha Banner', owner: '' },
    { account: 'Zed Banner', owner: 'Zed' },
    { account: 'Hidden Banner', owner: 'Hidden' },
    { account: 'Nobody Banner', owner: '' },
    { account: 'Linked Banner', owner: 'Linked' },
  ];
  const edited = new Map([
    ['Angel Banner', { owner: 'ANGEL', type: 'secondary' }],
    ['Roha Banner', { owner: 'Roha', type: 'alt' }],
    ['Zed Banner', { owner: '', type: 'banner' }],
  ]);
  const additions = collectAccountLinkSuggestionAdditions(suggestions, edited, [
    { account: 'Linked Banner', owner: 'Someone', type: 'banner' },
  ]);
  assert.deepEqual(additions, [
    { account: 'Angel Banner', owner: 'ANGEL', type: 'secondary' },
    { account: 'Roha Banner', owner: 'Roha', type: 'alt' },
    { account: 'Hidden Banner', owner: 'Hidden', type: 'banner' },
  ]);
});

test('batch edit is mounted on every VTS Admin list and uses the existing save paths', () => {
  const roster = readFileSync('js/ocr-roster.js', 'utf8');
  const dashboard = readFileSync('js/ocr-dashboard.js', 'utf8');
  assert.match(roster, /mountDutyBulkSelect\(body, type, records\);/);
  assert.match(roster, /mountContributionBulkSelect\(body, records\);/);
  assert.match(roster, /mountExGuildBulkSelect\(host, exGuildPage\.rows\);/);
  assert.match(dashboard, /mountConductBulkSelect\(list, conductPage\.rows\);/);
  assert.match(roster, /await saveDutyRecords\(\{ immediate: true, awaitCloud: true \}\)/);
  assert.match(roster, /data-duty-all-account="main"/);
  assert.match(roster, /data-duty-all-account="banner"/);
  assert.match(roster, /row\.dataset\.accountSource = 'operator';/);
});
