import test from 'node:test';
import assert from 'node:assert/strict';

import {
  aggregateManagementVotes,
  buildManagementVotesUrl,
  managementVoteCandidateVariants,
  parseGoogleVisualizationResponse,
  readManagementVoteResultRows,
  readManagementVoteRows,
  summarizeManagementVotePayload,
} from '../../js/eden-x1-management-votes.js';

function compactTestKey(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/[^\p{L}\p{N}]+/gu, '')
    .toLowerCase();
}

function cell(value) {
  return { v: value };
}

function formResponseTable() {
  return {
    cols: [{ label: 'Timestamp' }, { label: 'Your Game Name' }, { label: 'Pick 4 Names' }],
    rows: [
      {
        c: [
          cell('7/8/2026 18:28:09'),
          cell('BiG BOiiE'),
          cell('Goodness, ~Sarafino~, Peter, Victoria ~Kika~'),
        ],
      },
      {
        c: [
          cell('7/8/2026 18:29:00'),
          cell('WICKED RUSSIAN'),
          cell('Goodness, Dr Thunder (VTS R4), Uzumaki, Victoria ~Kika~'),
        ],
      },
      {
        c: [
          cell('7/8/2026 18:32:11'),
          cell('Angel'),
          cell('Goodness, Dr Thunder (VTS R4), Moldo, Victoria ~Kika~'),
        ],
      },
      {
        c: [
          cell('7/8/2026 18:34:11'),
          cell('MalakAbo'),
          cell('BoneSmoker 1097, Moldo, Uzumaki, Zubbs'),
        ],
      },
      {
        c: [
          cell('7/8/2026 18:33:17'),
          cell('Sarafino'),
          cell('Bil, Uzumaki, Zubbs, \u039bNG\u039eL 1097'),
        ],
      },
    ],
  };
}

function voteResultsTable() {
  return {
    cols: [{ label: 'Name' }, { label: 'Votes' }],
    rows: [
      { c: [cell('Goodness'), cell(3)] },
      { c: [cell('Uzumaki'), cell(3)] },
      { c: [cell('Victoria ~Kika~'), cell(3)] },
      { c: [cell('Dr Thunder (VTS R4)'), cell(2)] },
      { c: [cell('Moldo'), cell(2)] },
      { c: [cell('Zubbs'), cell(2)] },
      { c: [cell('Bil'), cell(1)] },
      { c: [cell('BoneSmoker 1097'), cell(1)] },
      { c: [cell('Peter'), cell(1)] },
      { c: [cell('~Sarafino~'), cell(1)] },
      { c: [cell('\u039bNG\u039eL 1097'), cell(1)] },
    ],
  };
}

const canonicalNames = [
  'GoodnesGraycious',
  'Wicked Russian',
  '~Sarafino~',
  'Peter',
  'Victoria ~Kika~',
  '\ua9c1\u0f3a Kika \u0f3b\ua9c2',
  'Dr Thunder',
  'Uzumaki',
  'Moldo',
  'BoneSmoker',
  'Zubbs',
  'Bil',
  'ANGEL',
];
const canonicalByKey = new Map(canonicalNames.map((name) => [compactTestKey(name), name]));

function resolveFromKlist(rawName) {
  for (const variant of managementVoteCandidateVariants(rawName)) {
    const canonical = canonicalByKey.get(compactTestKey(variant));
    if (canonical) {
      return {
        playerKey: compactTestKey(canonical),
        playerName: canonical,
        matched: true,
      };
    }
  }
  return null;
}

test('management vote URL uses a Google Visualization JSONP callback', () => {
  const url = buildManagementVotesUrl({ callbackName: '__edenVotes' });

  assert.match(url, /docs\.google\.com\/spreadsheets\/d\/14gUmeDy/);
  assert.match(url, /sheet=Vote\+Results/);
  assert.match(url, /tqx=responseHandler%3A__edenVotes/);
  assert.throws(() => buildManagementVotesUrl({ callbackName: 'bad-name()' }));
});

test('Google Visualization JSONP payloads parse to table data', () => {
  const payload = parseGoogleVisualizationResponse(
    '/*O_o*/\n__edenVotes({"status":"ok","table":{"cols":[{"label":"Pick 4 Names"}],"rows":[]}});'
  );

  assert.equal(payload.status, 'ok');
  assert.equal(payload.table.cols[0].label, 'Pick 4 Names');
});

test('management vote payload prefers the pre-aggregated Vote Results tab ordering', () => {
  const rows = readManagementVoteResultRows({ table: voteResultsTable() });
  const results = summarizeManagementVotePayload(rows, {
    limit: 2,
    resolveCandidate: resolveFromKlist,
  });

  assert.deepEqual(
    rows.slice(0, 3).map((row) => [row.rawName, row.votes]),
    [
      ['Goodness', 3],
      ['Uzumaki', 3],
      ['Victoria ~Kika~', 3],
    ]
  );
  assert.deepEqual(
    results.winners.map((winner) => [winner.playerName, winner.votes, winner.matched]),
    [
      ['GoodnesGraycious', 3, true],
      ['Uzumaki', 3, true],
    ]
  );
  assert.equal(results.totalBallots, 0);
});

test('management vote variants map Victoria Kika aliases to the ornate Kika account', () => {
  assert.deepEqual(managementVoteCandidateVariants('Goodness').slice(0, 2), [
    'GoodnesGraycious',
    'Goodness',
  ]);
  assert.deepEqual(managementVoteCandidateVariants('Victoria ~Kika~').slice(0, 2), [
    '\ua9c1\u0f3a Kika \u0f3b\ua9c2',
    'Victoria ~Kika~',
  ]);
  assert.deepEqual(managementVoteCandidateVariants('Dr Thunder 293').slice(-1), ['Dr Thunder']);
});

test('management votes aggregate top two players from the form and resolve to klist names', () => {
  const rows = readManagementVoteRows({ table: formResponseTable() });
  const results = aggregateManagementVotes(rows, {
    limit: 2,
    resolveCandidate: resolveFromKlist,
  });

  assert.equal(results.totalBallots, 5);
  assert.deepEqual(
    results.winners.map((winner) => [winner.playerName, winner.votes, winner.matched]),
    [
      ['GoodnesGraycious', 3, true],
      ['\ua9c1\u0f3a Kika \u0f3b\ua9c2', 3, true],
    ]
  );
  assert.equal(results.rankings.find((row) => row.playerName === 'ANGEL').votes, 1);
});

test('management votes include listed candidates and skip duplicate picks inside one ballot', () => {
  const results = aggregateManagementVotes(
    [
      {
        rowIndex: 0,
        voterName: 'Tester',
        picks: ['Wicked Russian', 'Goodness', 'Goodness'],
      },
    ],
    {
      limit: 2,
      resolveCandidate: resolveFromKlist,
    }
  );

  assert.equal(results.totalVotes, 2);
  assert.deepEqual(
    results.winners.map((winner) => [winner.playerName, winner.votes]),
    [
      ['Wicked Russian', 1],
      ['GoodnesGraycious', 1],
    ]
  );
});
