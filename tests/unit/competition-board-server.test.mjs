import assert from 'node:assert/strict';
import test from 'node:test';

import * as browser from '../../js/competition-growth.js';
import {
  autoPublishCompetitionBoard,
  buildCompetitionBoardFromInputs,
  buildGrowthBoardProjection,
  buildPriorSeasonBaselineIndex,
  buildServerGrowthRows,
  computeGrowthRow,
  COMPETITION_BOARD_DOC_PATH,
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
  return { id: uid, schemaVersion: 2, gameName, powerValues: power(total), updatedAt: atMs };
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
  // The newer season wins for Alpha, and its one upload settles Twin too.
  assert.equal(index.byName.get('alpha').candidate.submissionUid, 'new-alpha');
  assert.equal(index.byName.get('twin').status, 'unique');
  assert.equal(index.byName.get('twin').candidate.submissionUid, 'twin-new');
  assert.equal(index.byUid.get('only-old').seasonId, 'season-2026');

  const auto = resolveServerBaseline(submission('p1', 'alpha', 1), { index });
  assert.equal(auto.source, 'vtsscore-prior');
  assert.equal(auto.seasonId, 'season-2027a');
  assert.equal(auto.values.totalCastlePower, 95_000_000);
  assert.equal(auto.match.how, 'auto');

  const legacy = resolveServerBaseline(submission('p2', 'Oldie', 1), { index });
  assert.equal(legacy.source, 'vtsscore-2026');

  const contested = resolveServerBaseline(submission('p1', 'Alpha', 70_000_000), {
    index,
    contestedKeys: new Set(['alpha']),
  });
  assert.equal(contested.source, 'signup');
  assert.equal(contested.match.status, 'ambiguous');

  const keptSignup = resolveServerBaseline(submission('p1', 'Alpha', 70_000_000), {
    index,
    confirmation: { decision: 'signup' },
  });
  assert.equal(keptSignup.source, 'signup');
  assert.equal(keptSignup.values.totalCastlePower, 70_000_000);

  // A confirmed account wins even when its name differs from the player's.
  const confirmed = resolveServerBaseline(submission('p3', 'Renamed', 1), {
    index,
    confirmation: { decision: 'vtsscore', matchedSubmissionUid: 'only-old' },
  });
  assert.equal(confirmed.values.totalCastlePower, 5_000_000);
  assert.equal(confirmed.match.how, 'confirmed');

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
  assert.equal(unresolved.match.decision, 'pending');
});

function boardInputs() {
  return {
    seasonId: 'competition-12',
    schedule: SCHEDULE,
    board: null,
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
    confirmations: {},
  };
}

test('the server board ranks from earlier-season baselines and keeps private values private', () => {
  const { board, summary } = buildCompetitionBoardFromInputs(boardInputs(), { nowMs: T0 });
  // Alpha grew 80M -> 120M (+50%), Bravo 200M -> 260M (+30%) from sign-up stats.
  assert.deepEqual(
    board.winners.map((winner) => [winner.rank, winner.gameName]),
    [
      [1, 'Alpha'],
      [2, 'Bravo'],
    ]
  );
  assert.equal(board.winners[0].growthPct, 50);
  assert.equal(board.winners[1].growthPct, undefined);
  assert.deepEqual(
    board.rows.map((row) => [row.gameName, row.baselineSource]),
    [['Alpha', 'vtsscore-2026']]
  );
  assert.equal(board.notRanked, 1);
  assert.deepEqual(summary.baselineSources, { signup: 2, 'vtsscore-2026': 1, 'vtsscore-prior': 0 });
  assert.equal(summary.ranked, 2);
});

function fakeDb(documents, collections = {}) {
  const reads = [];
  const writes = [];
  const snap = (id, data) => ({ id, exists: data != null, data: () => data });
  return {
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

function competitionDb(board = null) {
  const inputs = boardInputs();
  return fakeDb(
    {
      'boh_allstar_config/current': { activeSeason: 'competition-12' },
      'boh_allstar_competition/current': SCHEDULE,
      [COMPETITION_BOARD_DOC_PATH]: board,
    },
    {
      'boh_allstar/competition-12/submissions': inputs.submissions,
      'boh_allstar/competition-12/raceScores': inputs.raceScores,
      'boh_allstar/season-2026/raceScores': inputs.priorSeasons[0].raceScores,
    }
  );
}

test('the phase job publishes once after the re-upload window and reads scores only then', async () => {
  const deps = (db, nowMs) => ({ db, now: () => nowMs, serverTimestamp: () => nowMs });

  const during = competitionDb();
  const waiting = await autoPublishCompetitionBoard(deps(during, SCHEDULE.reuploadOpensAt + 5));
  assert.deepEqual([waiting.status, waiting.reason], ['skipped', 'phase']);
  assert.equal(during.writes.length, 0);
  assert.equal(
    during.reads.some((path) => path.includes('raceScores')),
    false
  );

  const after = competitionDb();
  const published = await autoPublishCompetitionBoard(deps(after, SCHEDULE.reuploadClosesAt + 5));
  assert.equal(published.status, 'published');
  assert.equal(after.writes.length, 1);
  const [path, written] = after.writes[0];
  assert.equal(path, COMPETITION_BOARD_DOC_PATH);
  assert.equal(written.updatedBy, 'server');
  assert.equal(written.seasonId, 'competition-12');
  assert.equal(written.winners[0].gameName, 'Alpha');

  // A board already written for this season after the window closed stays.
  const manual = competitionDb({
    seasonId: 'competition-12',
    updatedAt: SCHEDULE.reuploadClosesAt + 60_000,
    rows: [],
    winners: [],
  });
  const kept = await autoPublishCompetitionBoard(deps(manual, SCHEDULE.reuploadClosesAt + DAY));
  assert.deepEqual([kept.status, kept.reason], ['skipped', 'already_published']);
  assert.equal(manual.writes.length, 0);
  assert.equal(
    manual.reads.some((path) => path.includes('raceScores')),
    false
  );

  const closed = competitionDb();
  const old = await autoPublishCompetitionBoard(deps(closed, SCHEDULE.winnersEndAt + 1));
  assert.deepEqual([old.status, old.reason], ['skipped', 'phase']);
});

function handlerRequest(body) {
  return {
    method: 'POST',
    body,
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

test('vtsScore builds and publishes the board only for a superadmin', async () => {
  const handlerFor = (claims, db) =>
    createVtsScoreHandler({
      auth: { verifyIdToken: async () => ({ uid: 'owner-uid', ...claims }) },
      appCheck: { verifyToken: async () => ({ appId: 'web-app' }) },
      db,
      now: () => SCHEDULE.reuploadClosesAt + 5,
      serverTimestamp: () => 'server-time',
    });

  const memberDb = competitionDb();
  const denied = recorder();
  await handlerFor({ admin: true }, memberDb)(handlerRequest({ action: 'buildBoard' }), denied);
  assert.equal(denied.statusCode, 403);
  assert.deepEqual(denied.body, { error: 'superadmin_required' });
  assert.equal(memberDb.writes.length, 0);

  const ownerDb = competitionDb();
  const built = recorder();
  await handlerFor({ superadmin: true }, ownerDb)(handlerRequest({ action: 'buildBoard' }), built);
  assert.equal(built.statusCode, 200);
  assert.equal(built.body.board.seasonId, 'competition-12');
  assert.deepEqual(built.body.board.winners, ['Alpha', 'Bravo']);
  assert.equal(ownerDb.writes.length, 1);
  assert.equal(ownerDb.writes[0][1].updatedBy, 'owner-uid');
  assert.equal(ownerDb.writes[0][1].updatedAt, 'server-time');

  // Extra keys make it an ordinary (invalid) score upload, never a build.
  const extra = recorder();
  const extraDb = competitionDb();
  await handlerFor({ superadmin: true }, extraDb)(
    handlerRequest({ action: 'buildBoard', seasonId: 'competition-12' }),
    extra
  );
  assert.equal(extra.statusCode, 400);
  assert.equal(extraDb.writes.length, 0);
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
