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
  BOH_MATCH_FIXTURES,
  BOH_MATCH_MAX_ENTRIES,
  BOH_MATCH_TEAMS,
  bohMatchEntriesFromOcr,
  bohMatchEntriesFromText,
  bohMatchTeamLabel,
  deleteLocalBohMatchResult,
  getBohMatchTeam,
  loadLocalBohMatchResults,
  normalizeBohMatchEntries,
  normalizeBohMatchResult,
  normalizeBohMatchResultRecords,
  saveLocalBohMatchResult,
  sortBohMatchResults,
  summarizeBohMatchResults,
  unratedBohMatchEntries,
} = await import('../../js/boh-match-results.js');

test('the five real team names are the selectable set', () => {
  assert.equal(BOH_MATCH_TEAMS.length, 5);
  assert.deepEqual(
    BOH_MATCH_TEAMS.map((team) => team.label),
    ['V1S - Wolves', 'V2S - Tigers', 'V3S - Falcons', 'V4S - Phoenix', 'V5S - Bulls']
  );
  assert.equal(getBohMatchTeam('v3s-falcons').code, 'V3S');
  assert.equal(getBohMatchTeam('V3S-FALCONS').number, 3);
  assert.equal(getBohMatchTeam('nope'), null);
});

test('results saved under the old team names map onto the new ones', () => {
  // Both of these were already in production when the rename landed.
  assert.equal(bohMatchTeamLabel('iron-wolves'), 'V1S - Wolves');
  assert.equal(bohMatchTeamLabel('night-falcons'), 'V3S - Falcons');
  assert.equal(bohMatchTeamLabel('ember-lions'), 'V2S - Tigers');
  assert.equal(bohMatchTeamLabel('storm-ravens'), 'V4S - Phoenix');
  assert.equal(bohMatchTeamLabel('thunder-bulls'), 'V5S - Bulls');

  const migrated = normalizeBohMatchResult({ teamId: 'night-falcons', entries: [] });
  assert.equal(migrated.teamId, 'v3s-falcons');
  assert.equal(migrated.teamName, 'V3S - Falcons');
});

test('the scheduled fixtures fill the match date, but a typed date wins', () => {
  assert.deepEqual(
    BOH_MATCH_FIXTURES.map((fixture) => [fixture.date, fixture.label]),
    [
      ['2026-08-26', 'Top 32 Qualification'],
      ['2026-08-28', 'Top 16 Qualification'],
      ['2026-08-31', 'Top 8 Qualification'],
    ]
  );
  const fromFixture = normalizeBohMatchResult({
    teamId: 'v1s-wolves',
    fixtureId: 'top16-2026-08-28',
    entries: [],
  });
  assert.equal(fromFixture.matchDate, '2026-08-28');
  assert.equal(fromFixture.fixtureId, 'top16-2026-08-28');

  const rescheduled = normalizeBohMatchResult({
    teamId: 'v1s-wolves',
    fixtureId: 'top16-2026-08-28',
    matchDate: '2026-09-02',
    entries: [],
  });
  assert.equal(rescheduled.matchDate, '2026-09-02');
});

test('a leader who missed the screenshots can still file the score and a note', () => {
  const record = normalizeBohMatchResult({
    teamId: 'v5s-bulls',
    teamScore: '90,842',
    opponentScore: '12 647',
    note: 'No screenshots - phone died. We led the whole match.',
    entries: [],
  });

  assert.equal(record.memberCount, 0);
  assert.equal(record.totalScore, 0);
  assert.equal(record.teamScore, 90842);
  assert.equal(record.opponentScore, 12647);
  assert.match(record.note, /phone died/);
});

test('per-player notes and ratings are optional, and null is not zero', () => {
  const entries = normalizeBohMatchEntries([
    { name: 'Rated', score: 100, rating: 8.5, note: 'held the pad' },
    { name: 'Unrated', score: 90 },
    { name: 'Zero', score: 80, rating: 0 },
    { name: 'Clamped', score: 70, rating: 99 },
  ]);
  const byName = Object.fromEntries(entries.map((entry) => [entry.playerName, entry]));

  assert.equal(byName.Rated.rating, 8.5);
  assert.equal(byName.Rated.note, 'held the pad');
  assert.equal(byName.Unrated.rating, null);
  assert.equal(byName.Unrated.note, '');
  assert.equal(byName.Zero.rating, 0);
  assert.equal(byName.Clamped.rating, 10);
});

test('merging overlapping captures keeps a typed note and rating', () => {
  const entries = normalizeBohMatchEntries([
    { name: 'Kika', score: 500, rating: 7, note: 'strong open' },
    { name: 'Kika', score: 13484 },
  ]);

  assert.equal(entries.length, 1);
  assert.equal(entries[0].score, 13484);
  assert.equal(entries[0].rating, 7);
  assert.equal(entries[0].note, 'strong open');
});

test('a result needs a known team and defaults its match date to today', () => {
  assert.throws(() => normalizeBohMatchResult({ entries: [] }), /which team/);
  const record = normalizeBohMatchResult({ teamId: 'v1s-wolves', entries: [] });
  assert.match(record.matchDate, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(record.teamName, 'V1S - Wolves');
  assert.equal(record.memberCount, 0);
  assert.equal(record.totalScore, 0);
});

test('scoreboard rows are ranked by score and carry a resolved identity', () => {
  const entries = normalizeBohMatchEntries([
    { rank: 3, name: 'PeacefulWarrior', score: '14,121' },
    { rank: 1, name: 'GoodnesGraycious', score: '16 279' },
    { rank: 2, name: 'JamboJango', score: 15259 },
  ]);

  assert.deepEqual(
    entries.map((entry) => [entry.rank, entry.playerName, entry.score]),
    [
      [1, 'GoodnesGraycious', 16279],
      [2, 'JamboJango', 15259],
      [3, 'PeacefulWarrior', 14121],
    ]
  );
  entries.forEach((entry) => assert.ok(entry.playerKey.length > 0));
});

test('overlapping screenshots collapse to one row per player, keeping the higher score', () => {
  const entries = normalizeBohMatchEntries([
    { rank: 11, name: 'OUNDEADO', score: 3445 },
    { rank: 1, name: 'Kika', score: 13484 },
    { rank: 11, name: 'OUNDEADO', score: 344 },
  ]);

  assert.equal(entries.length, 2);
  // The shared resolver canonicalizes a scoreboard nickname to the roster name.
  assert.match(entries[0].playerName, /Kika/);
  assert.equal(entries[0].score, 13484);
  assert.equal(entries[1].score, 3445);
});

test('nameless and unreadable rows are dropped, and the roster is capped', () => {
  assert.deepEqual(normalizeBohMatchEntries([{ name: '   ', score: 10 }, null, 5]), []);
  const flood = Array.from({ length: BOH_MATCH_MAX_ENTRIES + 10 }, (_, i) => ({
    name: `Player${i}`,
    score: 1000 - i,
  }));
  assert.equal(normalizeBohMatchEntries(flood).length, BOH_MATCH_MAX_ENTRIES);
});

test('OCR payloads are accepted in the shapes the vision model returns', () => {
  const expected = [
    [1, 'GoodnesGraycious', 16279],
    [2, 'JamboJango', 15259],
  ];
  const shapes = [
    {
      entries: [
        { rank: 1, name: 'GoodnesGraycious', score: 16279 },
        { rank: 2, name: 'JamboJango', score: 15259 },
      ],
    },
    {
      rows: [
        { rank: 2, name: 'JamboJango', score: '15,259' },
        { rank: 1, name: 'GoodnesGraycious', score: '16,279' },
      ],
    },
    [
      { name: 'JamboJango', score: 15259 },
      { name: 'GoodnesGraycious', score: 16279 },
    ],
  ];
  shapes.forEach((shape) => {
    assert.deepEqual(
      bohMatchEntriesFromOcr(shape).map((e) => [e.rank, e.playerName, e.score]),
      expected
    );
  });
  assert.deepEqual(bohMatchEntriesFromOcr({ nothing: true }), []);
});

test('pasted scoreboard text parses with or without a rank column', () => {
  const entries = bohMatchEntriesFromText(
    [
      'Rank | Name | Score',
      '8 | AK Чапай | 8337',
      '9  AKK 47  6604',
      'Тихий58, 5735',
      '',
      'not a row at all',
    ].join('\n')
  );

  assert.deepEqual(
    entries.map((entry) => [entry.playerName, entry.score]),
    [
      ['AK Чапай', 8337],
      ['AKK 47', 6604],
      ['Тихий58', 5735],
    ]
  );
});

test('malformed stored records drop out instead of hiding the rest', () => {
  const rows = normalizeBohMatchResultRecords([
    { id: 'a', teamId: 'v1s-wolves', matchDate: '2026-08-01', entries: [] },
    { id: 'b', teamId: 'not-a-team', entries: [] },
    { id: 'c', teamId: 'v2s-tigers', matchDate: '2026-08-02', entries: [] },
  ]);
  assert.deepEqual(
    rows.map((row) => row.id),
    ['a', 'c']
  );
});

test('results sort newest match first and summarize across teams', () => {
  const rows = sortBohMatchResults([
    { id: 'old', teamId: 'v1s-wolves', matchDate: '2026-08-01', totalScore: 10, memberCount: 2 },
    { id: 'new', teamId: 'v4s-phoenix', matchDate: '2026-08-09', totalScore: 30, memberCount: 3 },
  ]);
  assert.deepEqual(
    rows.map((row) => row.id),
    ['new', 'old']
  );
  assert.deepEqual(summarizeBohMatchResults(rows), {
    matches: 2,
    teams: 2,
    totalScore: 40,
    members: 5,
  });
});

test('a leader note and opponent survive the round trip through local storage', () => {
  localStorageData.clear();
  const saved = saveLocalBohMatchResult({
    teamId: 'v5s-bulls',
    matchDate: '2026-08-26',
    opponent: '(3ZT)Mischief',
    note: 'Held the south pad all match, three late teleports cost us the lead.',
    entries: [
      { rank: 1, name: 'GoodnesGraycious', score: 16279 },
      { rank: 2, name: 'JamboJango', score: 15259 },
    ],
  });

  assert.equal(saved.teamName, 'V5S - Bulls');
  assert.equal(saved.opponent, '(3ZT)Mischief');
  assert.equal(saved.memberCount, 2);
  assert.equal(saved.totalScore, 31538);

  const stored = loadLocalBohMatchResults();
  assert.equal(stored.length, 1);
  assert.equal(stored[0].note, saved.note);

  deleteLocalBohMatchResult(saved.id);
  assert.equal(loadLocalBohMatchResults().length, 0);
});

test('a rating is required for every player row before a result can be filed', () => {
  const entries = normalizeBohMatchEntries([
    { name: 'Rated', score: 100, rating: 8 },
    { name: 'Missing', score: 90 },
    { name: 'Zero', score: 80, rating: 0 },
  ]);

  const unrated = unratedBohMatchEntries(entries);
  assert.deepEqual(
    unrated.map((entry) => entry.playerName),
    ['Missing']
  );
  // A zero is a rating. Only an absent one blocks the save.
  assert.equal(unratedBohMatchEntries(entries.filter((e) => e.playerName !== 'Missing')).length, 0);
});

test('a match with no player rows has nothing to rate', () => {
  assert.deepEqual(unratedBohMatchEntries([]), []);
  assert.deepEqual(unratedBohMatchEntries(undefined), []);
});

test('results filed before ratings existed still load rather than being dropped', () => {
  // The requirement is enforced at save time, never in the normalizer: the two
  // results already in production carry no ratings and must stay visible.
  const stored = normalizeBohMatchResultRecords([
    {
      id: 'legacy',
      teamId: 'night-falcons',
      matchDate: '2026-08-27',
      entries: [{ name: 'MIAOUU', score: 28106 }],
    },
  ]);

  assert.equal(stored.length, 1);
  assert.equal(stored[0].teamName, 'V3S - Falcons');
  assert.equal(stored[0].entries[0].rating, null);
  assert.equal(unratedBohMatchEntries(stored[0].entries).length, 1);
});
