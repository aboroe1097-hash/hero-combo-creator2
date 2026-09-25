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
  ADMIN_EXPORT_COLUMNS,
  ADMIN_EXPORT_DATASETS,
  buildAdminAllDataRows,
  buildAttackDebugCsv,
  buildDutyDebugCsv,
  csvCell,
  describeAdminExportCoverage,
  gameTimeToIso,
  normalizeExportDate,
  roundExportNumber,
  rowsToCsv,
  sanitizeForExport,
  toIsoTimestamp,
  withCsvFooter,
} = await import('../../js/admin-export-model.js');
const { csvFooterCellLines, getExportBranding } = await import('../../js/export-branding.js');
const { buildWeightedDutyCounts, dutyEntryAccountLink, dutyEntryScoredNames } =
  await import('../../js/contribution-weighting.js');
const { PLAYER_REGISTRY_KEY, writeStoredPlayerRegistry } =
  await import('../../js/player-registry.js');
const { cleanDutyRawName, resolveDutyPlayerName, getDutyOperatorNote } =
  await import('../../js/ocr-shared.js');
const { setTaughtPlayerAliases } = await import('../../js/vts-player-aliases.js');

// RFC 4180 parser: the same thing a spreadsheet does with the file.
function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  const input = text.replace(/^﻿/, '');
  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    if (quoted) {
      if (char === '"' && input[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === ',') {
      row.push(cell);
      cell = '';
    } else if (char === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else if (char !== '\r') cell += char;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

const FIXTURE = {
  attacks: [
    {
      id: 'Gates_Lv3_1',
      game_time: '30/08/2026, Sunday, 22:07 GT',
      total_demolition: 1000,
      players: [
        { name: 'Rook, "the Wall"', value: 600, rank: 1 },
        { name: 'Finch', value: 400, rank: 2 },
      ],
    },
  ],
  playerSummary: [{ name: 'Rook, "the Wall"', total_demolition: 600 }],
  rosterNames: ['Rook'],
  rosterSnapshots: [{ date: '2026-08-01', members: [{ name: 'Rook', alliance: 1 }] }],
  bannerRecords: [{ id: 'b1', date: '2026-08-02', teams: { A: ['Finch'] } }],
  dutyRecords: [
    {
      id: 'duty-1',
      type: 'banner',
      date: '2026-08-25',
      entries: [{ name: '@Finch', confirmed: 'Finch', usageTime: '10:00', status: 'exact' }],
    },
  ],
  contributionRecords: [
    { id: 'c1', date: '2026-08-26', entries: [{ name: 'Rook', contribution: 9 }] },
  ],
  exGuildContributions: [{ id: 'x1', playerName: 'Wren', contribution: 5 }],
  r5Adjustments: [
    {
      id: 'adj-1',
      playerName: 'Rook',
      points: 2,
      category: 'extra_effort',
      season: 'season-2027',
      createdAt: { type: 'firestore/timestamp/1.0', seconds: 1790272034, nanoseconds: 16000000 },
    },
  ],
  allianceList: ['VTS'],
  weightedRows: [
    {
      player: 'Rook',
      playerKey: 'rook',
      currentRank: '#10',
      currentReward: 'Core Rewards',
      weightedScore: 395064.80000000005,
      finalRank: '#1',
      finalReward: 'Core Rewards',
    },
  ],
  playerRegistry: {
    players: [{ id: 'rook', canonical: 'Rook', aliases: ['Rook'], accounts: [] }],
    accountLinks: [{ account: 'Rook Banner', owner: 'Rook', type: 'banner' }],
    playerAliases: [{ alias: 'Rookie', canonical: 'Rook', createdAt: '' }],
    mainAccounts: ['Rook'],
    contributionMatches: [{ canonical: 'Rook', oldName: 'R00k', newName: 'Rook' }],
  },
  conductSuggestions: [
    {
      id: 's1',
      playerName: 'Finch',
      points: 1,
      category: 'extra_effort',
      status: 'approved',
      suggestedBy: 'uid-a',
      suggestedByName: 'Heron',
      reviewedBy: 'uid-b',
      createdAt: { seconds: 1790000000, nanoseconds: 0 },
    },
  ],
  dutySettings: {
    weights: { banner: { main: 5000, alt: 2500 } },
    includeDemolitionPoints: true,
    contributionWeight: 1,
    formPointWeight: 0.9,
  },
  rewardSettings: { quotas: { core: 20 }, guildMasterSource: 'weighted', r5PlayerKey: 'rook' },
  voteSettings: { season: 'eden-x2', showMemberResults: true },
  publicVoteResults: {
    season: 'eden-x2',
    published: true,
    rankings: [{ playerName: 'Finch', playerKey: 'finch', votes: 3, voters: 3 }],
  },
  votes: [{ id: 'v1', voterName: 'Wren', candidateNames: ['Finch'], season: 'eden-x2' }],
  voteHistory: [{ id: 'h1', voterName: 'Wren', candidateNames: ['Finch'], action: 'update' }],
  bohMatchResults: [
    {
      id: 'm1',
      teamName: 'Team A',
      matchDate: '2026-09-01',
      opponent: 'Rivals',
      teamScore: 9,
      opponentScore: 3,
    },
  ],
  allianceViewRosters: {
    vts: { members: [{ id: 'vts-1', imported: { name: 'Rook', totalPower: 123 }, overrides: {} }] },
  },
  r5Season: 'season-2027',
  competition: {
    season: '2027',
    config: { activeSeason: '2027', memberPin: '1234' },
    schedule: { seasonId: '2027', days: [] },
    signups: [
      {
        submissionUid: 'u1',
        gameName: 'Finch',
        stats: { totalCastlePower: 1000 },
        contactNumber: '+100000',
        pin: '9999',
      },
    ],
  },
  loaded: {
    conductSuggestions: true,
    bohMatchResults: true,
    votes: true,
    allianceView: true,
    competition: true,
  },
};

test('csv footer has no Sources line and every line is one quoted cell', () => {
  const lines = csvFooterCellLines(getExportBranding());
  assert.ok(lines.length >= 2);
  const csv = withCsvFooter('"a","b"', lines);
  const parsed = parseCsv(csv);
  assert.deepEqual(parsed[0], ['a', 'b']);
  parsed.slice(1).forEach((row) => {
    assert.equal(row.length, 1, `footer spilled into ${row.length} cells: ${row.join('|')}`);
    assert.ok(row[0].startsWith('#'));
  });
  assert.ok(parsed.some((row) => row[0].startsWith('#Generated at ')));
  assert.doesNotMatch(csv, /Sources|DonPablone|Raven/);
});

test('Firestore timestamps, Dates, {seconds} and ms become ISO 8601', () => {
  const iso = '2026-09-24T17:47:14.016Z';
  assert.equal(
    toIsoTimestamp({ type: 'firestore/timestamp/1.0', seconds: 1790272034, nanoseconds: 16000000 }),
    iso
  );
  assert.equal(toIsoTimestamp({ seconds: 1790272034, nanoseconds: 16000000 }), iso);
  assert.equal(toIsoTimestamp({ toMillis: () => Date.parse(iso) }), iso);
  assert.equal(toIsoTimestamp(new Date(iso)), iso);
  assert.equal(toIsoTimestamp(Date.parse(iso)), iso);
  assert.equal(toIsoTimestamp('nope'), '');
  assert.equal(normalizeExportDate({ seconds: 1790272034, nanoseconds: 16000000 }), iso);
});

test('game-time strings parse to an ISO date with the game clock and offset', () => {
  assert.equal(gameTimeToIso('30/08/2026, Sunday, 22:07 GT'), '2026-08-30T22:07-02:00');
  assert.equal(gameTimeToIso('2026-08-30, 22:07'), '2026-08-30T22:07-02:00');
  assert.equal(gameTimeToIso('01/09/2026'), '2026-09-01');
  assert.equal(normalizeExportDate('2026-08-25'), '2026-08-25');
  assert.equal(normalizeExportDate('2026-06-25T21:00:00.000Z'), '2026-06-25T21:00:00.000Z');
  assert.equal(normalizeExportDate('not a date'), '');
});

test('computed floats round to at most two decimals', () => {
  assert.equal(roundExportNumber(395064.80000000005), 395064.8);
  assert.equal(roundExportNumber(1.005 + 0.001), 1.01);
  assert.equal(roundExportNumber(-7798.7), -7798.7);
  assert.equal(roundExportNumber(12), 12);
  assert.equal(roundExportNumber('12.3456'), '12.3456');
  assert.equal(csvCell(395064.80000000005), '"395064.8"');
});

test('all-data export includes every dataset and parses without column spills', () => {
  const rows = buildAdminAllDataRows(FIXTURE);
  const datasets = new Set(rows.map((row) => row.dataset));
  ADMIN_EXPORT_DATASETS.forEach((dataset) => assert.ok(datasets.has(dataset), dataset));

  const csv = withCsvFooter(
    rowsToCsv(ADMIN_EXPORT_COLUMNS, rows),
    csvFooterCellLines(getExportBranding())
  );
  const parsed = parseCsv(csv);
  const header = parsed[0];
  assert.deepEqual(header.slice(0, 18), [
    'Dataset',
    'Record ID',
    'Date',
    'Type',
    'Player',
    'Guild',
    'Rank',
    'Reward',
    'Metric',
    'Value',
    'Structure',
    'Level',
    'Target',
    'Group',
    'Time',
    'Status',
    'Note',
    'Raw JSON',
  ]);
  assert.equal(header[18], 'Date (ISO)');
  const body = parsed.slice(1).filter((row) => !row[0].startsWith('#'));
  body.forEach((row) => assert.equal(row.length, header.length, row.join('|')));

  const byDataset = (name) => body.filter((row) => row[0] === name);
  const conduct = byDataset('conduct_adjustment')[0];
  assert.equal(conduct[2], '2026-09-24T17:47:14.016Z');
  assert.doesNotMatch(conduct[17], /firestore\/timestamp/);
  assert.equal(byDataset('attack')[0][18], '2026-08-30T22:07-02:00');
  assert.equal(byDataset('attack')[0][2], '30/08/2026, Sunday, 22:07 GT');
  assert.equal(byDataset('duty_entry')[0][18], '2026-08-25');

  const weighted = byDataset('weighted_contribution')[0];
  assert.equal(weighted[9], '395064.8');
  assert.equal(weighted[15], '');
  assert.match(weighted[16], /current rank #10/);
  assert.doesNotMatch(weighted[17], /0000000/);

  // A comma and quotes inside a name survive the round trip.
  assert.ok(byDataset('attack_player').some((row) => row[4] === 'Rook, "the Wall"'));

  // Credentials, PINs and contact numbers never reach the file.
  assert.doesNotMatch(csv, /memberPin|9999|1234|\+100000|contactNumber/);
  assert.ok(byDataset('account_link')[0][16].includes('account type banner'));
  assert.equal(byDataset('r5_season')[0][9], 'season-2027');
});

test('the manifest names tab datasets that were not loaded', () => {
  const data = { ...FIXTURE, loaded: { ...FIXTURE.loaded, votes: false, competition: false } };
  assert.deepEqual(describeAdminExportCoverage(data), [
    'vote',
    'vote_history',
    'public_vote_result',
    'competition_config',
    'competition_schedule',
    'competition_signup',
  ]);
  const manifest = buildAdminAllDataRows({ ...data, votes: [], competition: null }).filter(
    (row) => row.dataset === 'export_manifest'
  );
  assert.equal(manifest.find((row) => row.recordId === 'vote').status, 'not_loaded');
  assert.equal(manifest.find((row) => row.recordId === 'attack').status, 'included');
});

test('sanitizeForExport drops secrets but keeps ordinary keys', () => {
  const clean = sanitizeForExport({
    pinned: true,
    mapping: 1,
    pin: '1',
    apiKey: 'k',
    idToken: 't',
    nested: { memberPin: '2', ok: 1.23456 },
  });
  assert.deepEqual(clean, { pinned: true, mapping: 1, nested: { ok: 1.23 } });
});

test('attack debug export quotes every field and guards a missing name', () => {
  const csv = buildAttackDebugCsv(
    [
      {
        id: 'id,with,commas',
        game_time: '30/08/2026, Sunday, 22:07 GT',
        players: [
          { name: 'A, "B"', value: 10, rank: 1 },
          { name: 'A, "B"', value: 10, rank: 2 },
          { name: null, value: 5, rank: 3 },
        ],
      },
    ],
    {
      structureTarget: () => ({ structure_name: 'Gate, East', structure_level: 'Lv3' }),
      groupedName: (player) => String(player?.name || ''),
      scoredAs: (player) => `canon:${player?.name ?? 'Unknown'}`,
    }
  );
  const parsed = parseCsv(csv);
  const header = parsed[0];
  assert.equal(header.at(-3), 'Scored As');
  parsed.slice(1).forEach((row) => assert.equal(row.length, header.length));
  assert.equal(parsed[1][0], 'id,with,commas');
  assert.equal(parsed[1][3], 'Gate, East');
  assert.equal(parsed[1][5], 'A, "B"');
  assert.equal(parsed[1][9], 'canon:A, "B"');
  assert.equal(parsed[2][10], 'no (duplicate row)');
  assert.equal(parsed[3][5], '');
  assert.equal(parsed[1][11], '2026-08-30T22:07-02:00');
});

test('duty debug "Scored As" is the exact name the duty score credits', () => {
  const records = [
    {
      id: 'duty-a',
      type: 'banner',
      date: '2026-08-30',
      entries: [
        { name: 'Nightjar', confirmed: 'q.Nightjar', status: 'likely' },
        { name: '@Heron 1097', confirmed: 'Heron', status: 'manual' },
        { name: 'Wren, Finch', original: 'Wren, Finch' },
      ],
    },
  ];
  const csv = buildDutyDebugCsv(records, {
    cleanName: cleanDutyRawName,
    resolveName: resolveDutyPlayerName,
    operatorNote: getDutyOperatorNote,
    scoredAs: dutyEntryScoredNames,
  });
  const parsed = parseCsv(csv);
  const header = parsed[0];
  const scoredIndex = header.indexOf('Scored As');
  assert.ok(scoredIndex > 0);
  parsed.slice(1).forEach((row) => assert.equal(row.length, header.length));

  const counted = [...buildWeightedDutyCounts(records).values()].map((row) => row.playerName);
  const exported = parsed
    .slice(1)
    .flatMap((row) => row[scoredIndex].split(' + '))
    .filter(Boolean);
  assert.deepEqual([...exported].sort(), [...counted].sort());
  assert.equal(parsed[1][scoredIndex], 'q.Nightjar');
});

test('a taught registry alias decides what a duty raw name is cleaned to', () => {
  setTaughtPlayerAliases([]);
  assert.equal(cleanDutyRawName('Nightjar'), 'Nightjar');
  setTaughtPlayerAliases([{ alias: 'Nightjar', canonical: 'Heron banner 2' }]);
  assert.equal(cleanDutyRawName('Nightjar'), 'Heron banner 2');
  setTaughtPlayerAliases([]);
});

test('a duty row credited through an account link reads "linked", not "likely"', () => {
  localStorageData.delete(PLAYER_REGISTRY_KEY);
  try {
    writeStoredPlayerRegistry({
      players: [],
      accountLinks: [{ account: '~Plover~', owner: '~Plovero~', type: 'alt' }],
    });
    const records = [
      {
        id: 'duty-linked',
        type: 'banner',
        date: '2026-09-10',
        entries: [
          { name: '~Plover~', confirmed: '~Plovero~', status: 'likely' },
          { name: 'Plovr', confirmed: 'Sandpiper', status: 'likely' },
        ],
      },
    ];
    assert.equal(dutyEntryAccountLink(records[0].entries[0])?.owner, '~Plovero~');
    assert.equal(dutyEntryAccountLink(records[0].entries[1]), null);
    const csv = buildDutyDebugCsv(records, {
      cleanName: cleanDutyRawName,
      resolveName: resolveDutyPlayerName,
      operatorNote: getDutyOperatorNote,
      scoredAs: dutyEntryScoredNames,
      accountLink: dutyEntryAccountLink,
    });
    const [header, linked, fuzzy] = parseCsv(csv);
    const status = header.indexOf('Match Status');
    const scored = header.indexOf('Scored As');
    assert.equal(linked[status], 'linked');
    assert.equal(linked[scored], '~Plovero~ (alt/banner link from ~Plover~)');
    assert.equal(fuzzy[status], 'likely');
    assert.equal(fuzzy[scored], 'Sandpiper');

    writeStoredPlayerRegistry({
      players: [],
      accountLinks: [{ account: '~Plover~', owner: '~Plovero~', type: 'secondary' }],
    });
    const [, secondary] = parseCsv(
      buildDutyDebugCsv(records, {
        scoredAs: dutyEntryScoredNames,
        accountLink: dutyEntryAccountLink,
      })
    );
    assert.equal(secondary[scored], '~Plovero~ (secondary link from ~Plover~)');
  } finally {
    localStorageData.delete(PLAYER_REGISTRY_KEY);
  }
});
