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
  CONDUCT_SUGGESTION_STATUSES,
  conductSuggestionToAdjustment,
  createLocalConductSuggestion,
  deleteLocalConductSuggestion,
  loadLocalConductSuggestions,
  normalizeConductSuggestion,
  normalizeConductSuggestionRecords,
  normalizeConductSuggestionStatus,
  reviewLocalConductSuggestion,
  sortConductSuggestions,
  summarizeConductSuggestions,
} = await import('../../js/ocr-conduct-suggestions.js');

const SEASON = 'season-2027';

function baseSuggestion(overrides = {}) {
  return {
    season: SEASON,
    player: { name: 'Loppu' },
    category: 'penalty_other',
    points: -1,
    note: 'Late Eden X2 form submission',
    suggestedBy: 'admin-uid-1',
    suggestedByName: 'admin@example.com',
    ...overrides,
  };
}

test('a suggestion normalizes to the adjustment payload plus review state', () => {
  const record = normalizeConductSuggestion(baseSuggestion({ id: 'sug-1' }));

  assert.equal(record.id, 'sug-1');
  assert.equal(record.season, SEASON);
  assert.equal(record.playerName, 'Loppu');
  assert.ok(record.playerKey.length > 0);
  assert.equal(record.points, -1);
  assert.equal(record.category, 'penalty_other');
  assert.equal(record.status, 'pending');
  assert.equal(record.suggestedBy, 'admin-uid-1');
  assert.equal(record.reviewedBy, '');
  assert.equal(record.reviewedAtMs, 0);
  assert.equal(record.adjustmentId, '');
});

test('a suggestion always names an author and a known status', () => {
  assert.throws(() => normalizeConductSuggestion(baseSuggestion({ suggestedBy: '  ' })));
  assert.deepEqual(CONDUCT_SUGGESTION_STATUSES, ['pending', 'approved', 'rejected']);
  assert.equal(normalizeConductSuggestionStatus('APPROVED'), 'approved');
  assert.equal(normalizeConductSuggestionStatus('nonsense'), 'pending');
  assert.equal(normalizeConductSuggestionStatus(undefined), 'pending');
});

test('malformed rows drop out instead of hiding the queue', () => {
  const rows = normalizeConductSuggestionRecords(
    [
      baseSuggestion({ id: 'ok-1' }),
      { season: SEASON, player: { name: '' }, suggestedBy: 'x' },
      baseSuggestion({ id: 'ok-2', player: { name: 'Zombi' }, points: 2, category: 'banner_help' }),
    ],
    { season: SEASON }
  );

  assert.equal(rows.length, 2);
  assert.deepEqual(
    rows.map((row) => row.id),
    ['ok-1', 'ok-2']
  );
});

test('approving carries the suggesting admin into the adjustment note', () => {
  const payload = conductSuggestionToAdjustment(
    normalizeConductSuggestion(baseSuggestion({ id: 'sug-2' }))
  );

  assert.equal(payload.playerName, 'Loppu');
  assert.equal(payload.points, -1);
  assert.equal(payload.category, 'penalty_other');
  assert.match(payload.note, /Late Eden X2 form submission/);
  assert.match(payload.note, /Suggested by admin@example.com/);
  assert.ok(!('status' in payload));
  assert.ok(!('suggestedBy' in payload));
});

test('pending suggestions sort ahead of reviewed ones', () => {
  const sorted = sortConductSuggestions([
    { id: 'a', status: 'approved', createdAt: '2026-08-03T00:00:00.000Z' },
    { id: 'b', status: 'pending', createdAt: '2026-08-01T00:00:00.000Z' },
    { id: 'c', status: 'rejected', createdAt: '2026-08-05T00:00:00.000Z' },
    { id: 'd', status: 'pending', createdAt: '2026-08-02T00:00:00.000Z' },
  ]);

  assert.deepEqual(
    sorted.map((row) => row.id),
    ['d', 'b', 'c', 'a']
  );
});

test('the review summary counts per status and per author for one season only', () => {
  const summary = summarizeConductSuggestions(
    [
      { season: SEASON, status: 'pending', suggestedBy: 'a' },
      { season: SEASON, status: 'pending', suggestedBy: 'b' },
      { season: SEASON, status: 'approved', suggestedBy: 'a' },
      { season: SEASON, status: 'rejected', suggestedBy: 'a' },
      { season: 'season-2026', status: 'pending', suggestedBy: 'z' },
    ],
    SEASON
  );

  assert.deepEqual(summary, { total: 4, pending: 2, approved: 1, rejected: 1, authors: 2 });
});

test('local suggestions persist, review in place, and stay scoped to their season', () => {
  localStorageData.clear();
  const created = createLocalConductSuggestion(baseSuggestion());
  createLocalConductSuggestion(
    baseSuggestion({ season: 'season-2026', player: { name: 'Zombi' } })
  );

  assert.equal(created.status, 'pending');
  const stored = loadLocalConductSuggestions(SEASON);
  assert.equal(stored.length, 1);
  assert.equal(stored[0].id, created.id);

  const reviewed = reviewLocalConductSuggestion(created.id, {
    status: 'approved',
    reviewedBy: 'super-uid',
    reviewedAtMs: 1_700_000_000_000,
    adjustmentId: 'adj-1',
  });
  assert.equal(reviewed.status, 'approved');
  assert.equal(reviewed.reviewedBy, 'super-uid');
  assert.equal(reviewed.adjustmentId, 'adj-1');
  assert.equal(reviewed.playerName, 'Loppu');

  deleteLocalConductSuggestion(created.id);
  assert.equal(loadLocalConductSuggestions(SEASON).length, 0);
  assert.equal(loadLocalConductSuggestions('season-2026').length, 1);
});
