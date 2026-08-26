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
} = await import('../../js/boh-match-results.js');

test('the six named teams survive the command center', () => {
  assert.equal(BOH_MATCH_TEAMS.length, 6);
  assert.equal(getBohMatchTeam('night-falcons').label, 'Night Falcons');
  assert.equal(getBohMatchTeam('NIGHT-FALCONS').number, 5);
  assert.equal(getBohMatchTeam('nope'), null);
  assert.equal(bohMatchTeamLabel('ember-lions'), 'Ember Lions');
});

test('a result needs a known team and defaults its match date to today', () => {
  assert.throws(() => normalizeBohMatchResult({ entries: [] }), /which team/);
  const record = normalizeBohMatchResult({ teamId: 'iron-wolves', entries: [] });
  assert.match(record.matchDate, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(record.teamName, 'Iron Wolves');
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
    { id: 'a', teamId: 'iron-wolves', matchDate: '2026-08-01', entries: [] },
    { id: 'b', teamId: 'not-a-team', entries: [] },
    { id: 'c', teamId: 'frost-bears', matchDate: '2026-08-02', entries: [] },
  ]);
  assert.deepEqual(
    rows.map((row) => row.id),
    ['a', 'c']
  );
});

test('results sort newest match first and summarize across teams', () => {
  const rows = sortBohMatchResults([
    { id: 'old', teamId: 'iron-wolves', matchDate: '2026-08-01', totalScore: 10, memberCount: 2 },
    { id: 'new', teamId: 'frost-bears', matchDate: '2026-08-09', totalScore: 30, memberCount: 3 },
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
    teamId: 'thunder-bulls',
    matchDate: '2026-08-26',
    opponent: '(3ZT)Mischief',
    note: 'Held the south pad all match, three late teleports cost us the lead.',
    entries: [
      { rank: 1, name: 'GoodnesGraycious', score: 16279 },
      { rank: 2, name: 'JamboJango', score: 15259 },
    ],
  });

  assert.equal(saved.teamName, 'Thunder Bulls');
  assert.equal(saved.opponent, '(3ZT)Mischief');
  assert.equal(saved.memberCount, 2);
  assert.equal(saved.totalScore, 31538);

  const stored = loadLocalBohMatchResults();
  assert.equal(stored.length, 1);
  assert.equal(stored[0].note, saved.note);

  deleteLocalBohMatchResult(saved.id);
  assert.equal(loadLocalBohMatchResults().length, 0);
});
