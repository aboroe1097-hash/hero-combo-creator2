import test from 'node:test';
import assert from 'node:assert/strict';

import {
  aggregateManagementVotes,
  buildManagementVotesUrl,
  compareManagementVoteAssignmentCandidates,
  loadManagementVotesPayloadWithFallback,
  loadManagementVotesViaJsonp,
  loadManagementVotesViaProxy,
  managementVoteCandidateVariants,
  managementVoteTieBreakCriterion,
  parseGoogleVisualizationResponse,
  readManagementVoteResultRows,
  readManagementVoteRows,
  summarizeManagementVotePayload,
} from '../../js/eden-x1-management-votes.js';

function createJsonpHarness() {
  const scripts = [];
  const timers = new Map();
  const globalTarget = {};
  let timerSerial = 0;
  const document = {
    createElement() {
      return {
        async: false,
        src: '',
        onerror: null,
        removed: false,
        remove() {
          this.removed = true;
        },
      };
    },
    head: {
      appendChild(script) {
        scripts.push(script);
      },
    },
  };
  const setTimeoutFn = (callback, delay) => {
    const id = ++timerSerial;
    timers.set(id, { callback, delay });
    return id;
  };
  const clearTimeoutFn = (id) => timers.delete(id);
  const callbackName = (script = scripts.at(-1)) =>
    new URL(script.src).searchParams.get('tqx').replace('responseHandler:', '');
  const runTimer = (delay) => {
    const entry = [...timers.entries()].find(([, timer]) => timer.delay === delay);
    assert.ok(entry, `expected a ${delay}ms timer`);
    timers.delete(entry[0]);
    entry[1].callback();
  };
  return {
    scripts,
    timers,
    globalTarget,
    document,
    setTimeoutFn,
    clearTimeoutFn,
    callbackName,
    runTimer,
  };
}

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

function resolveDrThunderFamily(rawName) {
  const playerName = String(rawName).includes('293') ? 'Dr Thunder 293' : 'Dr Thunder';
  return {
    playerKey: compactTestKey(playerName),
    familyKey: 'drthunder',
    playerName,
    matched: true,
  };
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
    results.winners.map((winner) => [
      winner.playerName,
      winner.votes,
      winner.voteRank,
      winner.matched,
    ]),
    [
      ['GoodnesGraycious', 3, 1, true],
      ['Uzumaki', 3, 1, true],
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
    results.winners.map((winner) => [
      winner.playerName,
      winner.votes,
      winner.voteRank,
      winner.matched,
    ]),
    [
      ['GoodnesGraycious', 3, 1, true],
      ['\ua9c1\u0f3a Kika \u0f3b\ua9c2', 3, 1, true],
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

test('management self-votes remain counted under the current published policy', () => {
  const results = aggregateManagementVotes(
    [{ rowIndex: 0, voterName: 'Same Player', picks: ['Same Player', 'Other Player'] }],
    {
      resolveCandidate(rawName) {
        const playerKey = compactTestKey(rawName);
        return { playerKey, familyKey: playerKey, playerName: rawName, matched: true };
      },
    }
  );

  assert.equal(results.totalVotes, 2);
  assert.equal(results.rankings.find((row) => row.playerName === 'Same Player').votes, 1);
});

test('management ballots count aliases once per voter and rank their shared family once', () => {
  const results = aggregateManagementVotes(
    [
      {
        rowIndex: 0,
        voterName: 'One',
        picks: ['Dr Thunder 293', 'Dr Thunder'],
      },
      { rowIndex: 1, voterName: 'Two', picks: ['Dr Thunder 293'] },
      { rowIndex: 2, voterName: 'Three', picks: ['Dr Thunder'] },
    ],
    { resolveCandidate: resolveDrThunderFamily }
  );

  assert.equal(results.totalVotes, 3);
  assert.equal(results.rankings.length, 1);
  assert.deepEqual(
    results.rankings.map((winner) => [
      winner.playerName,
      winner.playerKey,
      winner.familyKey,
      winner.votes,
      winner.voteRank,
    ]),
    [['Dr Thunder', 'drthunder', 'drthunder', 3, 1]]
  );
});

test('pre-aggregated management aliases merge before totals and competition ranks', () => {
  const results = summarizeManagementVotePayload(
    [
      { rowIndex: 0, rawName: 'Other', votes: 4 },
      { rowIndex: 1, rawName: 'Dr Thunder 293', votes: 2 },
      { rowIndex: 2, rawName: 'Dr Thunder', votes: 3 },
    ],
    {
      resolveCandidate(rawName) {
        return rawName === 'Other'
          ? { playerKey: 'other', familyKey: 'other', playerName: 'Other', matched: true }
          : resolveDrThunderFamily(rawName);
      },
    }
  );

  assert.equal(results.totalVotes, 9);
  assert.deepEqual(
    results.rankings.map((winner) => [
      winner.playerName,
      winner.familyKey,
      winner.votes,
      winner.voteRank,
    ]),
    [
      ['Dr Thunder', 'drthunder', 5, 1],
      ['Other', 'other', 4, 2],
    ]
  );
});

test('management assignment tie-breaks use bonus, then weighted total, then canonical name', () => {
  const candidates = [
    { playerName: 'Weighted', votes: 3, bonusTeamEffort: 1, weightedScore: 900000 },
    { playerName: 'Bonus', votes: 3, bonusTeamEffort: 2, weightedScore: 100000 },
  ];
  assert.equal(candidates.sort(compareManagementVoteAssignmentCandidates)[0].playerName, 'Bonus');
  assert.equal(managementVoteTieBreakCriterion(candidates[0], candidates[1]), 'bonus-team-effort');

  const weightedTie = [
    { playerName: 'Lower', votes: 3, bonusTeamEffort: 2, weightedScore: 100000 },
    { playerName: 'Higher', votes: 3, bonusTeamEffort: 2, weightedScore: 200000 },
  ];
  weightedTie.sort(compareManagementVoteAssignmentCandidates);
  assert.equal(weightedTie[0].playerName, 'Higher');
  assert.equal(managementVoteTieBreakCriterion(weightedTie[0], weightedTie[1]), 'weighted-total');

  const nameTie = [
    { playerName: 'Zulu', votes: 3, bonusTeamEffort: 2, weightedScore: 200000 },
    { playerName: 'Alpha', votes: 3, bonusTeamEffort: 2, weightedScore: 200000 },
  ];
  nameTie.sort(compareManagementVoteAssignmentCandidates);
  assert.equal(nameTie[0].playerName, 'Alpha');
  assert.equal(managementVoteTieBreakCriterion(nameTie[0], nameTie[1]), 'canonical-name');
});

test('management vote JSONP resolves and cleans up its script and callback', async () => {
  const harness = createJsonpHarness();
  const pending = loadManagementVotesViaJsonp({ ...harness, timeoutMs: 20 });
  const script = harness.scripts[0];
  const callback = harness.callbackName(script);
  const payload = { table: voteResultsTable() };

  harness.globalTarget[callback](payload);

  assert.equal(await pending, payload);
  assert.equal(script.removed, true);
  assert.equal(harness.globalTarget[callback], undefined);
  assert.equal(harness.timers.size, 0);
});

test('management vote JSONP retains a harmless late callback after timeout', async () => {
  const harness = createJsonpHarness();
  const pending = loadManagementVotesViaJsonp({
    ...harness,
    timeoutMs: 20,
    lateCallbackRetentionMs: 60,
  });
  const callback = harness.callbackName();

  harness.runTimer(20);
  await assert.rejects(pending, /timed out/);
  assert.doesNotThrow(() => harness.globalTarget[callback]({ table: voteResultsTable() }));
  harness.runTimer(60);
  assert.equal(harness.globalTarget[callback], undefined);
});

test('management vote JSONP retries once and succeeds on the second attempt', async () => {
  const harness = createJsonpHarness();
  const pending = loadManagementVotesPayloadWithFallback({
    ...harness,
    timeoutMs: 20,
    retryDelayMs: 5,
    lateCallbackRetentionMs: 60,
    proxyUrl: '',
  });

  harness.scripts[0].onerror();
  await Promise.resolve();
  harness.runTimer(5);
  await Promise.resolve();
  const secondScript = harness.scripts[1];
  assert.ok(secondScript);
  harness.globalTarget[harness.callbackName(secondScript)]({ table: voteResultsTable() });

  assert.equal((await pending).table.rows.length, voteResultsTable().rows.length);
  assert.equal(harness.scripts.length, 2);
});

test('raw form fallback runs only after a successful empty Vote Results response', async () => {
  const harness = createJsonpHarness();
  const pending = loadManagementVotesPayloadWithFallback({
    ...harness,
    attempts: 1,
    proxyUrl: '',
  });
  const resultsScript = harness.scripts[0];
  harness.globalTarget[harness.callbackName(resultsScript)]({
    table: { cols: [{ label: 'Name' }, { label: 'Votes' }], rows: [] },
  });
  await new Promise((resolve) => setImmediate(resolve));
  const rawScript = harness.scripts[1];
  assert.match(rawScript.src, /sheet=Form\+Responses\+1/);
  harness.globalTarget[harness.callbackName(rawScript)]({ table: formResponseTable() });

  assert.equal((await pending).table.rows.length, formResponseTable().rows.length);
});

test('management vote proxy provides the public table without waiting for JSONP', async () => {
  let requestedUrl = '';
  const payload = { status: 'ok', table: voteResultsTable() };
  const result = await loadManagementVotesViaProxy({
    proxyUrl: 'https://worker.example/public/management-votes',
    fetchFn: async (url) => {
      requestedUrl = url;
      return { ok: true, status: 200, json: async () => payload };
    },
  });

  assert.equal(result, payload);
  assert.equal(new URL(requestedUrl).searchParams.get('sheet'), 'Vote Results');
});
