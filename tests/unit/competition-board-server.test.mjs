import assert from 'node:assert/strict';
import test from 'node:test';

import * as browser from '../../js/competition-growth.js';
import {
  COMPETITION_DEAD_TROOP_COUNT_KEYS,
  buildCompetitionBoardFromInputs,
  buildGrowthBoardProjection,
  buildPriorSeasonBaselineIndex,
  buildServerGrowthRows,
  computeGrowthRow,
  rankCompetitionGrowth,
  readCompetitionPowerValues,
  resolveServerBaseline,
} from '../../functions/src/competition-board.js';
import { createVtsScoreHandler } from '../../functions/src/vts-score.js';

const DAY = 86_400_000;
const T0 = Date.UTC(2026, 9, 1);
const SCHEDULE = Object.freeze({
  seasonId: 'competition-12',
  title: 'Competition #12',
  opensAt: T0,
  phase1ClosesAt: T0 + DAY,
  deadlineAt: T0 + 2 * DAY,
  reuploadOpensAt: T0 + 10 * DAY,
  reuploadClosesAt: T0 + 11 * DAY,
  winnersStartAt: T0 + 12 * DAY,
  winnersEndAt: T0 + 20 * DAY,
});

function power(total) {
  return {
    totalCastlePower: total,
    troopPower: Math.round(total * 0.6),
    buildingPower: 1_000_000,
    technologyPower: 2_000_000,
    heroCombatPower: 3_000_000,
    dragonPower: 4_000_000,
    unitSpecialtyPower: 5_000_000,
    artifactPower: 0,
    royalTechPower: null,
  };
}

function submission(uid, gameName, total, consent = true) {
  return {
    id: uid,
    status: 'submitted',
    gameName,
    stats: power(total),
    commitment: { publicComparisonConsent: consent },
  };
}

function upload(uid, gameName, total, atMs) {
  return {
    id: uid,
    schemaVersion: 2,
    gameName,
    powerValues: power(total),
    deadTroopCounts: Object.fromEntries(COMPETITION_DEAD_TROOP_COUNT_KEYS.map((key) => [key, 0])),
    updatedAt: atMs,
  };
}

test('the copied growth, ranking and projection match the browser builder', () => {
  const players = [
    submission('a', 'Alpha', 100_000_000),
    submission('b', 'Bravo', 200_000_000, false),
    submission('c', 'Charlie', 50_000_000),
    submission('d', 'Delta', 80_000_000),
  ];
  const finals = new Map([
    ['a', upload('a', 'Alpha', 120_000_000, SCHEDULE.reuploadOpensAt + 1000)],
    ['b', upload('b', 'Bravo', 260_000_000, SCHEDULE.reuploadOpensAt + 2000)],
    ['c', upload('c', 'Charlie', 60_000_000, SCHEDULE.reuploadOpensAt + 3000)],
    ['d', upload('d', 'Delta', 90_000_000, SCHEDULE.reuploadClosesAt + 1)],
  ]);
  const rowsWith = (impl) =>
    players.map((player) =>
      impl.computeGrowthRow(player, {
        baseline: {
          values: readCompetitionPowerValues(player.stats),
          source: 'signup',
          match: null,
        },
        raceScore: finals.get(player.id),
        window: SCHEDULE,
      })
    );
  const serverRows = rowsWith({ computeGrowthRow });
  const browserRows = rowsWith(browser);
  assert.deepEqual(serverRows, browserRows);
  assert.deepEqual(rankCompetitionGrowth(serverRows), browser.rankCompetitionGrowth(browserRows));
  const options = { seasonId: 'competition-12', publishedAt: '2026-10-13T00:00:00.000Z' };
  assert.deepEqual(
    buildGrowthBoardProjection(serverRows, options),
    browser.buildGrowthBoardProjection(browserRows, options)
  );
});

test('the baseline is the latest earlier upload, matched automatically only when the name is unique', () => {
  const index = buildPriorSeasonBaselineIndex([
    {
      seasonId: 'season-2026',
      raceScores: [
        upload('old-alpha', 'Alpha', 90_000_000, 1000),
        upload('dup-1', 'Twin', 10_000_000, 1000),
        upload('dup-2', 'twin ', 11_000_000, 1100),
        upload('only-old', 'Oldie', 5_000_000, 900),
      ],
    },
    {
      seasonId: 'season-2027a',
      raceScores: [
        upload('new-alpha', '(VTS) ALPHA', 95_000_000, 5000),
        upload('twin-new', 'Twin', 12_000_000, 5000),
      ],
    },
  ]);
  // A name claimed by different accounts in any earlier season is ambiguous.
  assert.equal(index.byName.get('alpha').status, 'ambiguous');
  assert.equal(index.byName.get('twin').status, 'ambiguous');
  assert.equal(index.byUid.get('only-old').seasonId, 'season-2026');

  const auto = resolveServerBaseline(submission('new-alpha', 'alpha', 1), { index });
  assert.equal(auto.source, 'vtsscore-prior');
  assert.equal(auto.seasonId, 'season-2027a');
  assert.equal(auto.values.totalCastlePower, 95_000_000);
  assert.equal(auto.match.how, 'uid');

  const legacy = resolveServerBaseline(submission('p2', 'Oldie', 1), { index });
  assert.equal(legacy.source, 'vtsscore-2026');

  const contested = resolveServerBaseline(submission('p1', 'Alpha', 70_000_000), {
    index,
    contestedKeys: new Set(['alpha']),
  });
  assert.equal(contested.source, 'signup');
  assert.equal(contested.match.status, 'ambiguous');

  const keptSignup = resolveServerBaseline(submission('p1', 'Alpha', 70_000_000), { index });
  assert.equal(keptSignup.source, 'signup');
  assert.equal(keptSignup.values.totalCastlePower, 70_000_000);

  // An exact name is accepted when its earlier owner is unique.
  const exact = resolveServerBaseline(submission('p3', 'Oldie', 1), { index });
  assert.equal(exact.values.totalCastlePower, 5_000_000);
  assert.equal(exact.match.how, 'exact-name');

  const sameSeasonDuplicate = buildPriorSeasonBaselineIndex([
    {
      seasonId: 'season-2026',
      raceScores: [upload('x1', 'Same', 1_000_000, 1), upload('x2', 'SAME', 2_000_000, 2)],
    },
  ]);
  assert.equal(sameSeasonDuplicate.byName.get('same').status, 'ambiguous');
  const unresolved = resolveServerBaseline(submission('p4', 'Same', 3_000_000), {
    index: sameSeasonDuplicate,
  });
  assert.equal(unresolved.source, 'signup');
  assert.equal(unresolved.match.decision, 'signup');
});

function boardInputs() {
  return {
    seasonId: 'competition-12',
    schedule: SCHEDULE,
    submissions: [
      submission('a', 'Alpha', 100_000_000),
      submission('b', 'Bravo', 200_000_000, false),
      submission('c', 'Charlie', 50_000_000),
    ],
    raceScores: [
      upload('a', 'Alpha', 120_000_000, SCHEDULE.reuploadOpensAt + 10),
      upload('b', 'Bravo', 260_000_000, SCHEDULE.reuploadOpensAt + 10),
    ],
    priorSeasons: [
      { seasonId: 'season-2026', raceScores: [upload('old-a', 'Alpha', 80_000_000, 1)] },
    ],
  };
}

test('the server board ranks from earlier-season baselines and keeps private values private', () => {
  const { board, summary } = buildCompetitionBoardFromInputs(boardInputs(), { nowMs: T0 });
  // Alpha grew 80M -> 120M (+50%), Bravo 200M -> 260M (+30%) from sign-up stats.
  assert.deepEqual(
    board.winners.map((winner) => [winner.rank, winner.gameName]),
    [[1, 'Alpha']]
  );
  assert.equal(board.winners[0].growthPct, 50);
  assert.doesNotMatch(JSON.stringify(board), /Bravo/);
  assert.deepEqual(
    board.rows.map((row) => [row.gameName, row.baselineSource]),
    [
      ['Alpha', 'vtsscore-2026'],
      // Unranked but consenting names stay listed with their history.
      ['Charlie', 'signup'],
    ]
  );
  const charlie = board.rows.find((row) => row.gameName === 'Charlie');
  assert.equal(charlie.rank, null);
  const alpha = board.rows.find((row) => row.gameName === 'Alpha');
  assert.ok(
    alpha.uploads.length >= 2,
    'a row carries every upload its name ever had, across seasons'
  );
  assert.equal(board.notRanked, 1);
  assert.deepEqual(summary.baselineSources, { signup: 2, 'vtsscore-2026': 1, 'vtsscore-prior': 0 });
  assert.equal(summary.ranked, 2);
});

test('an ambiguous name never publishes another account\u2019s upload history', () => {
  const inputs = boardInputs();
  inputs.priorSeasons.push({
    seasonId: 'season-2026',
    raceScores: [upload('twin-1', 'Twin', 10_000_000, 1), upload('twin-2', 'Twin', 11_000_000, 2)],
  });
  inputs.submissions.push(submission('t', 'Twin', 30_000_000));
  inputs.raceScores.push(upload('t', 'Twin', 40_000_000, SCHEDULE.reuploadOpensAt + 4000));
  const twin = buildServerGrowthRows(inputs).find((row) => row.gameName === 'Twin');
  assert.equal(twin.match.how, 'none');
  assert.deepEqual(
    twin.uploads.map((entry) => [entry.seasonId, entry.values.totalCastlePower]),
    [['competition-12', 40_000_000]],
    'only the member\u2019s own upload; the other accounts\u2019 history stays private'
  );
});

function fakeDb(documents, collections = {}) {
  const reads = [];
  const writes = [];
  const snap = (id, data) => ({ id, exists: data != null, data: () => data });
  return {
    documents,
    reads,
    writes,
    doc(path) {
      return {
        path,
        async get() {
          reads.push(path);
          return snap(path.split('/').at(-1), documents[path] ?? null);
        },
        async set(value) {
          writes.push([path, value]);
          documents[path] = value;
        },
      };
    },
    collection(path) {
      return {
        async get() {
          reads.push(path);
          return {
            docs: (collections[path] || []).map((record) => snap(record.id, record)),
          };
        },
        async listDocuments() {
          reads.push(`${path}/*`);
          return [...new Set(Object.keys(collections).map((key) => key.split('/')[1]))].map(
            (id) => ({ id })
          );
        },
      };
    },
  };
}

function competitionDb() {
  const inputs = boardInputs();
  return fakeDb(
    {
      'boh_allstar_config/current': { activeSeason: 'competition-12' },
      'boh_allstar_competition/current': SCHEDULE,
      'boh_allstar_member_grants/a': {
        schemaVersion: 1,
        uid: 'a',
        seasonId: 'competition-12',
        expiresAt: SCHEDULE.winnersEndAt + DAY,
      },
      'boh_allstar/competition-12/submissions/a': inputs.submissions[0],
    },
    {
      'boh_allstar/competition-12/submissions': inputs.submissions,
      'boh_allstar/competition-12/raceScores': inputs.raceScores,
      'boh_allstar/season-2026/raceScores': inputs.priorSeasons[0].raceScores,
    }
  );
}

test('the live board reads current and prior records without writing a projection', async () => {
  const db = competitionDb();
  const response = recorder();
  await createVtsScoreHandler({ db, now: () => SCHEDULE.reuploadClosesAt + 5 })(
    handlerRequest(null, 'GET', { view: 'competition-growth' }),
    response
  );
  assert.equal(response.statusCode, 200);
  assert.deepEqual(
    response.body.board.winners.map((row) => row.gameName),
    ['Alpha']
  );
  assert.doesNotMatch(JSON.stringify(response.body), /Bravo/);
  assert.equal(db.writes.length, 0);
});

function handlerRequest(body, method = 'POST', query = {}) {
  return {
    method,
    body,
    query,
    headers: {
      origin: 'https://roc-vts.com',
      authorization: 'Bearer auth-token',
      'x-firebase-appcheck': 'app-check-token',
      'content-type': 'application/json',
    },
    get(name) {
      return this.headers[name.toLowerCase()] || '';
    },
  };
}

function recorder() {
  return {
    headers: {},
    statusCode: 0,
    body: null,
    set(name, value) {
      this.headers[name] = value;
    },
    status(value) {
      this.statusCode = value;
      return this;
    },
    json(value) {
      this.body = value;
      return value;
    },
    send(value) {
      this.body = value;
      return value;
    },
  };
}

test('the previous-data hint requires a saved consenting registration and exact entered name', async () => {
  const db = competitionDb();
  const handler = createVtsScoreHandler({
    auth: { verifyIdToken: async () => ({ uid: 'a' }) },
    appCheck: { verifyToken: async () => ({ appId: 'web-app' }) },
    db,
    now: () => SCHEDULE.reuploadClosesAt + 5,
  });
  const hint = async (name) => {
    const response = recorder();
    await handler(handlerRequest(null, 'GET', { view: 'previous-comparison', name }), response);
    return response;
  };
  assert.equal((await hint('Alpha')).body.ready, true);
  assert.equal((await hint('Someone Else')).body.ready, false);
  db.documents['boh_allstar/competition-12/submissions/a'] = submission(
    'a',
    'Alpha',
    100_000_000,
    false
  );
  assert.equal((await hint('Alpha')).body.ready, false);
  db.documents['boh_allstar/competition-12/submissions/a'] = {
    ...submission('a', 'Alpha', 100_000_000),
    status: 'draft',
  };
  assert.equal((await hint('Alpha')).body.ready, false);
});

test('rows without an earlier upload fall back to sign-up stats', () => {
  const rows = buildServerGrowthRows({
    submissions: [submission('z', 'Zed', 10_000_000)],
    raceScores: [upload('z', 'Zed', 12_000_000, SCHEDULE.reuploadOpensAt + 1)],
    priorSeasons: [],
    window: SCHEDULE,
  });
  assert.equal(rows[0].baselineSource, 'signup');
  assert.equal(rows[0].growthPct, 20);
});

test('a prior upload without dead-troop counts falls back to the signup baseline', () => {
  const prior = upload('prior', 'Alpha', 80_000_000, 1);
  delete prior.deadTroopCounts;
  const rows = buildServerGrowthRows({
    submissions: [submission('a', 'Alpha', 100_000_000)],
    raceScores: [upload('a', 'Alpha', 120_000_000, SCHEDULE.reuploadOpensAt + 1)],
    priorSeasons: [{ seasonId: 'season-2026', raceScores: [prior] }],
    window: SCHEDULE,
  });
  assert.equal(rows[0].baselineSource, 'signup');
  assert.equal(rows[0].fields.totalCastlePower.baseline, 100_000_000);
});

test('the live board endpoint is the member vtsScore endpoint', async () => {
  const { VTS_SCORE_ENDPOINT } = await import('../../js/all-star-boh-access.js');
  const source = await import('node:fs').then((fs) =>
    fs.readFileSync('js/all-star-boh-access.js', 'utf8')
  );
  assert.ok(source.includes(`'${VTS_SCORE_ENDPOINT}'`));
});
