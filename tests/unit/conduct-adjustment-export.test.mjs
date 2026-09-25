import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = { VTS_ADMIN_AUTH: {} };
const localStorageData = new Map();
globalThis.localStorage = {
  getItem: (key) => localStorageData.get(key) ?? null,
  setItem: (key, value) => localStorageData.set(key, String(value)),
  removeItem: (key) => localStorageData.delete(key),
};
globalThis.document = {
  getElementById: () => null,
  querySelector: () => null,
  querySelectorAll: () => [],
};

const {
  buildConductExportCsv,
  buildConductExportModel,
  conductExportFileName,
  layoutConductExportLines,
  paginateConductExportLines,
} = await import('../../js/conduct-adjustment-export.js');

const ADJUSTMENTS = [
  {
    id: 'a1',
    season: 's1',
    playerKey: 'wren',
    playerName: 'Wren',
    category: 'banner_help',
    points: 2,
    note: 'Gate, east',
    createdAt: '2026-09-01T10:00:00.000Z',
  },
  {
    id: 'a2',
    season: 's1',
    playerKey: 'wren',
    playerName: 'Wren',
    category: 'extra_effort',
    points: 3,
    createdAt: { seconds: 1790000000, nanoseconds: 0 },
  },
  {
    id: 'a3',
    season: 's1',
    playerKey: 'finch',
    playerName: 'Finch',
    category: 'penalty',
    points: -5,
    createdAt: '2026-09-02T10:00:00.000Z',
  },
  {
    id: 'a4',
    season: 's1',
    playerKey: 'heron',
    playerName: 'Heron',
    category: 'banner_help',
    points: 7,
    createdAt: '2026-09-03T10:00:00.000Z',
  },
  {
    id: 'a5',
    season: 'other',
    playerKey: 'heron',
    playerName: 'Heron',
    category: 'banner_help',
    points: 100,
  },
];

test('groups the season by player with totals, highest total first', () => {
  const model = buildConductExportModel(ADJUSTMENTS, {
    season: 's1',
    categoryLabel: (key) => `label:${key}`,
  });
  assert.deepEqual(
    model.players.map((player) => [player.playerName, player.total, player.entries.length]),
    [
      ['Heron', 7, 1],
      ['Wren', 5, 2],
      ['Finch', -5, 1],
    ]
  );
  assert.equal(model.entryCount, 4);
  const wren = model.players[1];
  assert.equal(wren.entries[0].categoryLabel, 'label:extra_effort');
  assert.equal(wren.entries[0].date, '2026-09-21T14:13:20.000Z');
  assert.equal(wren.entries[1].note, 'Gate, east');
});

test('follows the category filter', () => {
  const model = buildConductExportModel(ADJUSTMENTS, { season: 's1', category: 'banner_help' });
  assert.deepEqual(
    model.players.map((player) => [player.playerName, player.total]),
    [
      ['Heron', 7],
      ['Wren', 2],
    ]
  );
  assert.equal(model.category, 'banner_help');
  assert.equal(conductExportFileName(model), 'bonus-team-effort-s1-banner-help.png');
});

test('csv has one row per adjustment with the player total and quoted cells', () => {
  const model = buildConductExportModel(ADJUSTMENTS, { season: 's1' });
  const csv = buildConductExportCsv(model, ['"#Generated at x"']);
  const lines = csv.trim().split('\n');
  assert.equal(
    lines[0],
    '"Season","Player","Player total","Category","Points","Note","Date (ISO)"'
  );
  assert.equal(lines.length, 1 + 4 + 1);
  assert.ok(
    lines.includes('"s1","Wren","5","banner_help","2","Gate, east","2026-09-01T10:00:00.000Z"')
  );
  assert.equal(lines.at(-1), '"#Generated at x"');
  assert.doesNotMatch(csv, /Sources/);
});

test('pages break between lines and an empty model still renders one page', () => {
  const model = buildConductExportModel(ADJUSTMENTS, { season: 's1' });
  const lines = layoutConductExportLines(model);
  assert.equal(lines.length, 3 + 4);
  assert.equal(paginateConductExportLines(lines, 3).length, 3);
  assert.deepEqual(paginateConductExportLines([], 3), [[]]);
});
