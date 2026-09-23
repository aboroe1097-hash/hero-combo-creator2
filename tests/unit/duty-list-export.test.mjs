import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildDutyExportModel,
  dutyExportFileName,
  paginateDutyExportRows,
} from '../../js/duty-list-export.js';
import {
  collectDutyRecordGroups,
  dutyRecordDisplayTitle,
  formatDutyRecordDay,
  normalizeDutyRecordGroup,
  normalizeDutyRecordTitle,
} from '../../js/duty-record-title.js';

const entry = (confirmed, accountType = 'main') => ({ name: confirmed, confirmed, accountType });

const records = [
  {
    id: 'b1',
    type: 'banner',
    date: '2026-09-01',
    title: 'Raceday1',
    group: 'Race week',
    entries: [entry('Angel'), entry('Bolt', 'banner'), entry('Angel', 'banner')],
  },
  {
    id: 'b2',
    type: 'banner',
    date: '2026-09-03',
    title: 'Raceday2',
    group: 'race week',
    entries: [entry('Bolt'), entry('Cara')],
  },
  {
    id: 'b3',
    type: 'banner',
    date: '2026-09-10',
    entries: [entry('Cara'), entry('Dax'), entry('Angel')],
  },
  {
    id: 'p1',
    type: 'pather',
    date: '2026-09-02',
    entries: [entry('Angel')],
  },
  {
    id: 's1',
    type: 'speed_tile',
    date: '2026-09-04',
    entries: [entry('Bolt')],
  },
  {
    id: 'w1',
    type: 'shield_wall',
    date: '2026-09-05',
    entries: [entry('Eve')],
  },
];

test('counts every duty in the category and splits main from banner accounts', () => {
  const model = buildDutyExportModel(records, { category: 'banner', locale: 'en-US' });
  assert.equal(model.summary.totalDuties, 8);
  assert.equal(model.summary.uniquePlayers, 4);
  assert.equal(model.summary.main, 6);
  assert.equal(model.summary.banner, 2);
  assert.equal(model.summary.uploads, 3);
  const angel = model.rows.find((row) => row.name === 'Angel');
  assert.deepEqual(
    { count: angel.count, main: angel.main, banner: angel.banner },
    { count: 3, main: 2, banner: 1 }
  );
  assert.deepEqual(
    angel.uploads.map((upload) => [upload.label, upload.count]),
    [
      ['Raceday1', 2],
      ['Sep 10', 1],
    ]
  );
});

test('sorts by count descending, then name, with shared ranks for ties', () => {
  const model = buildDutyExportModel(records, { category: 'banner', locale: 'en-US' });
  assert.deepEqual(
    model.rows.map((row) => [row.rank, row.name, row.count]),
    [
      [1, 'Angel', 3],
      [2, 'Bolt', 2],
      [2, 'Cara', 2],
      [4, 'Dax', 1],
    ]
  );
});

test('the group filter keeps only that group, case-insensitively', () => {
  const model = buildDutyExportModel(records, {
    category: 'banner',
    group: 'RACE WEEK',
    categoryLabel: 'Banners',
    locale: 'en-US',
  });
  assert.equal(model.summary.uploads, 2);
  assert.equal(model.summary.totalDuties, 5);
  assert.deepEqual(
    model.rows.map((row) => [row.name, row.count]),
    [
      ['Angel', 2],
      ['Bolt', 2],
      ['Cara', 1],
    ]
  );
  assert.equal(model.dateRange, 'Sep 1 – Sep 3');
  assert.equal(model.title, 'Banners · RACE WEEK · Sep 1 – Sep 3');
});

test('pathing includes speed tile plans; shield walls stay separate', () => {
  const pathing = buildDutyExportModel(records, { category: 'pather' });
  assert.deepEqual(pathing.rows.map((row) => row.name).sort(), ['Angel', 'Bolt']);
  const walls = buildDutyExportModel(records, { category: 'shield_wall' });
  assert.equal(walls.summary.totalDuties, 1);
  assert.equal(walls.rows[0].name, 'Eve');
});

test('custom resolvers credit every named account once per entry', () => {
  const model = buildDutyExportModel(
    [{ id: 'x', type: 'banner', date: '2026-09-01', entries: [{ name: 'Ann + Ben' }] }],
    {
      category: 'banner',
      resolveNames: (row) => [...row.name.split('+'), 'ann'],
      accountTypeOf: (_row, name) => (name === 'Ben' ? 'banner' : 'main'),
    }
  );
  assert.deepEqual(
    model.rows.map((row) => [row.name, row.main, row.banner]),
    [
      ['Ann', 1, 0],
      ['Ben', 0, 1],
    ]
  );
});

test('empty selections still produce one empty page', () => {
  const model = buildDutyExportModel(records, { category: 'banner', group: 'Nope' });
  assert.equal(model.rows.length, 0);
  assert.equal(model.summary.totalDuties, 0);
  assert.deepEqual(paginateDutyExportRows(model.rows), [[]]);
});

test('tall lists split into pages of 25 rows', () => {
  const rows = Array.from({ length: 51 }, (_, index) => ({ name: `P${index}` }));
  const pages = paginateDutyExportRows(rows);
  assert.deepEqual(
    pages.map((page) => page.length),
    [25, 25, 1]
  );
  assert.equal(
    dutyExportFileName({ category: 'shield_wall', group: 'Race week', dateTo: '2026-09-03' }, 1, 3),
    'duty-shield-wall-race-week-2026-09-03-2of3.png'
  );
});

test('upload titles and groups are optional, trimmed and length-capped', () => {
  assert.equal(normalizeDutyRecordTitle('  Raceday   1 '), 'Raceday 1');
  assert.equal(normalizeDutyRecordTitle('x'.repeat(80)).length, 60);
  assert.equal(normalizeDutyRecordGroup('g'.repeat(80)).length, 40);
  assert.equal(formatDutyRecordDay('2026-09-23', 'en-US'), 'Sep 23');
  assert.equal(dutyRecordDisplayTitle({ date: '2026-09-23' }, 'en-US'), 'Sep 23');
  assert.equal(dutyRecordDisplayTitle({ date: '2026-09-23', title: ' ' }, 'en-US'), 'Sep 23');
  assert.equal(
    dutyRecordDisplayTitle({ date: '2026-09-23', title: 'Raceday3' }, 'en-US'),
    'Raceday3'
  );
  assert.deepEqual(collectDutyRecordGroups(records), ['Race week']);
});
