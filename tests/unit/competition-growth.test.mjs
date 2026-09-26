import assert from 'node:assert/strict';
import test from 'node:test';

import {
  COMPETITION_BASELINE_SEASON,
  buildCompetitionGrowthRows,
  buildGrowthBoardProjection,
  buildVtsScoreBaselineIndex,
  competitionNameKey,
  computeGrowthRow,
  rankCompetitionGrowth,
  resolveBaseline,
} from '../../js/competition-growth.js';
import { DEAD_TROOP_COUNT_KEYS } from '../../js/dead-troops.js';

const H = 60 * 60 * 1000;
const OPENS = Date.parse('2026-11-01T00:00:00Z');
const WINDOW = { opensAt: OPENS, closesAt: OPENS + 48 * H };
const inWindow = { toMillis: () => OPENS + H };

function stats(total, extra = {}) {
  return {
    totalCastlePower: total,
    troopPower: Math.round(total * 0.8),
    buildingPower: 1_000_000,
    technologyPower: 2_000_000,
    heroCombatPower: 3_000_000,
    dragonPower: 4_000_000,
    unitSpecialtyPower: 5_000_000,
    ...extra,
  };
}

function submission(uid, gameName, total, consent = true) {
  return {
    submissionUid: uid,
    status: 'submitted',
    gameName,
    stats: stats(total),
    commitment: { publicComparisonConsent: consent },
  };
}

function upload(uid, gameName, total, updatedAt = inWindow) {
  return {
    submissionUid: uid,
    gameName,
    schemaVersion: 2,
    powerValues: stats(total),
    deadTroopCounts: Object.fromEntries(DEAD_TROOP_COUNT_KEYS.map((key) => [key, 0])),
    updatedAt,
  };
}

test('the baseline season is last season, not the competition season', () => {
  assert.equal(COMPETITION_BASELINE_SEASON, 'season-2026');
});

test('the schedule path matches js/competition-schedule.js', async () => {
  const schedule = await import('../../js/competition-schedule.js');
  const growth = await import('../../js/competition-growth.js');
  assert.equal(growth.COMPETITION_SCHEDULE_DOC_PATH, schedule.COMPETITION_SCHEDULE_DOC_PATH);
});

test('a player without a VtsScore upload is measured from their sign-up stats', () => {
  const index = buildVtsScoreBaselineIndex([upload('old-1', 'Someone Else', 900)]);
  const player = submission('u1', 'Newcomer', 1_000);
  const baseline = resolveBaseline(player, { vtsScore2026ByName: index });
  assert.equal(baseline.source, 'signup');
  assert.equal(baseline.values.totalCastlePower, 1_000);
  assert.equal(baseline.match.status, 'none');
});

test('a prior VtsScore upload without dead-troop counts is not used as the baseline', () => {
  const legacy = upload('old-u1', 'Grower', 800);
  delete legacy.deadTroopCounts;
  const rows = buildCompetitionGrowthRows({
    submissions: [submission('u1', 'Grower', 1_000)],
    raceScores: [upload('u1', 'Grower', 1_200)],
    baselineRaceScores: [legacy],
    window: WINDOW,
    autoMatch: true,
  });
  assert.equal(rows[0].baselineSource, 'signup');
  assert.equal(rows[0].fields.totalCastlePower.baseline, 1_000);
});

test('names match through case, spacing, the (VTS) prefix and confirmed aliases', () => {
  assert.equal(competitionNameKey('  (VTS)  Malak   Abo '), competitionNameKey('malak abo'));
  // A confirmed alias group resolves to its canonical spelling.
  assert.equal(competitionNameKey('~Victoria~'), competitionNameKey('Victoria'));
  assert.equal(competitionNameKey('!!WAEL !!'), competitionNameKey('!!WAEL!!'));
  const index = buildVtsScoreBaselineIndex([upload('old-v', '~Victoria~', 800)]);
  const player = submission('u1', 'Victoria', 1_000);
  const pending = resolveBaseline(player, { vtsScore2026ByName: index });
  assert.equal(pending.match.status, 'matched');
  assert.equal(pending.match.candidate.gameName, '~Victoria~');
  const confirmed = resolveBaseline(player, {
    vtsScore2026ByName: index,
    confirmation: { decision: 'vtsscore', matchedSubmissionUid: 'old-v' },
  });
  assert.equal(confirmed.source, 'vtsscore-2026');
  assert.equal(confirmed.values.totalCastlePower, 800);
});

test('an unconfirmed name match falls back to the sign-up baseline', () => {
  const index = buildVtsScoreBaselineIndex([upload('old-1', 'MalakAbo', 800)]);
  const player = submission('u1', 'MalakAbo', 1_000);
  const baseline = resolveBaseline(player, { vtsScore2026ByName: index });
  assert.equal(baseline.match.status, 'matched');
  assert.equal(baseline.match.confirmed, false);
  assert.equal(baseline.source, 'signup');
  assert.equal(baseline.values.totalCastlePower, 1_000);
  // Rejected, or confirmed against a different record: still the sign-up.
  for (const confirmation of [
    { decision: 'signup' },
    { decision: 'vtsscore', matchedSubmissionUid: 'someone-else' },
  ]) {
    assert.equal(
      resolveBaseline(player, { vtsScore2026ByName: index, confirmation }).source,
      'signup'
    );
  }
});

test('the admin preview proposes the newest upload when one account uploaded more than once', () => {
  const build = (first, second) =>
    buildVtsScoreBaselineIndex([
      upload('old-1', 'MalakAbo', first, first * 1000 + 1),
      upload('old-1', 'MalakAbo', second, second * 1000 + 1),
    ]);
  for (const index of [build(800, 900), build(900, 800)]) {
    const baseline = resolveBaseline(submission('u1', 'MalakAbo', 1_000), {
      vtsScore2026ByName: index,
      autoMatch: true,
    });
    assert.equal(baseline.match.status, 'matched');
    assert.equal(
      baseline.values.totalCastlePower,
      900,
      'the newest upload wins in either input order'
    );
  }
});

test('duplicate or ambiguous names are never auto-matched', () => {
  const index = buildVtsScoreBaselineIndex([
    upload('old-1', 'Twin', 800),
    upload('old-2', 'twin ', 900),
  ]);
  const baseline = resolveBaseline(submission('u1', 'Twin', 1_000), { vtsScore2026ByName: index });
  assert.equal(baseline.match.status, 'ambiguous');
  assert.equal(baseline.match.candidate, null);
  assert.equal(baseline.source, 'signup');

  // Two current players claiming one 2026 name: neither gets a proposal.
  const rows = buildCompetitionGrowthRows({
    submissions: [submission('a', 'Solo', 1_000), submission('b', 'SOLO', 2_000)],
    raceScores: [upload('a', 'Solo', 1_100), upload('b', 'SOLO', 2_200)],
    baselineRaceScores: [upload('old-s', 'Solo', 500)],
    window: WINDOW,
  });
  for (const row of rows) {
    assert.equal(row.match.status, 'ambiguous');
    assert.equal(row.baselineSource, 'signup');
  }
  // A superadmin may still confirm one explicit candidate.
  const confirmed = buildCompetitionGrowthRows({
    submissions: [submission('a', 'Solo', 1_000), submission('b', 'SOLO', 2_000)],
    raceScores: [upload('a', 'Solo', 1_100), upload('b', 'SOLO', 2_200)],
    baselineRaceScores: [upload('old-s', 'Solo', 500)],
    confirmations: { a: { decision: 'vtsscore', matchedSubmissionUid: 'old-s' } },
    window: WINDOW,
  });
  assert.equal(confirmed[0].baselineSource, 'vtsscore-2026');
  assert.equal(confirmed[0].growthAbs, 600);
  assert.equal(confirmed[1].baselineSource, 'signup');
});

test('growth rows carry absolute and percentage growth per field', () => {
  const player = submission('u1', 'Grower', 1_000_000);
  const baseline = resolveBaseline(player, { vtsScore2026ByName: new Map() });
  const row = computeGrowthRow(player, {
    baseline,
    raceScore: upload('u1', 'Grower', 1_250_000),
    window: WINDOW,
  });
  assert.equal(row.growthAbs, 250_000);
  assert.equal(row.growthPct, 25);
  assert.equal(row.fields.troopPower.abs, 200_000);
  assert.equal(row.fields.troopPower.pct, 25);
  assert.equal(row.fields.artifactPower.abs, null);
  assert.equal(row.notRankedReason, null);
});

test('a missing, invalid or out-of-window re-upload is not ranked, never zero', () => {
  const rows = buildCompetitionGrowthRows({
    submissions: [
      submission('ok', 'Ok', 1_000),
      submission('none', 'None', 1_000),
      submission('late', 'Late', 1_000),
      submission('legacy', 'Legacy', 1_000),
    ],
    raceScores: [
      upload('ok', 'Ok', 1_000),
      upload('late', 'Late', 5_000, { toMillis: () => OPENS + 49 * H }),
      { submissionUid: 'legacy', schemaVersion: 1, dragonPower: 9, updatedAt: inWindow },
    ],
    window: WINDOW,
  });
  const { ranked, notRanked } = rankCompetitionGrowth(rows);
  assert.deepEqual(
    ranked.map((row) => [row.gameName, row.rank, row.growthPct]),
    [['Ok', 1, 0]]
  );
  assert.deepEqual(
    notRanked.map((row) => [row.gameName, row.notRankedReason, row.rank, row.growthPct]),
    [
      ['Late', 'outside-window', null, null],
      ['Legacy', 'invalid-reupload', null, null],
      ['None', 'no-reupload', null, null],
    ]
  );
});

test('a final upload without dead-troop counts is not ranked', () => {
  const final = upload('u1', 'Grower', 1_200);
  delete final.deadTroopCounts;
  const rows = buildCompetitionGrowthRows({
    submissions: [submission('u1', 'Grower', 1_000)],
    raceScores: [final],
    window: WINDOW,
  });
  assert.equal(rows[0].notRankedReason, 'invalid-reupload');
});

test('a normalized schedule limits re-uploads to its re-upload window, not registration', () => {
  const schedule = {
    seasonId: 'competition-12',
    opensAt: OPENS - 100 * H,
    phase1ClosesAt: OPENS - 80 * H,
    deadlineAt: OPENS - 60 * H,
    reuploadOpensAt: OPENS,
    reuploadClosesAt: OPENS + 48 * H,
    winnersStartAt: OPENS + 50 * H,
    winnersEndAt: OPENS + 60 * H,
  };
  const rows = buildCompetitionGrowthRows({
    submissions: [submission('early', 'Early', 1_000), submission('ok', 'Ok', 1_000)],
    raceScores: [
      upload('early', 'Early', 2_000, { toMillis: () => OPENS - 70 * H }),
      upload('ok', 'Ok', 1_100),
    ],
    window: schedule,
  });
  assert.deepEqual(
    rows.map((row) => [row.gameName, row.notRankedReason]),
    [
      ['Early', 'outside-window'],
      ['Ok', null],
    ]
  );
});

test('ranking uses growth %, breaks ties on absolute growth, and shares equal ranks', () => {
  const rows = buildCompetitionGrowthRows({
    submissions: [
      submission('a', 'Alpha', 1_000),
      submission('b', 'Bravo', 2_000),
      submission('c', 'Charlie', 1_000),
      submission('d', 'Delta', 1_000),
    ],
    raceScores: [
      upload('a', 'Alpha', 1_100), // +10%, +100
      upload('b', 'Bravo', 2_200), // +10%, +200: wins the tie-break
      upload('c', 'Charlie', 1_100), // +10%, +100: tied with Alpha
      upload('d', 'Delta', 1_050), // +5%
    ],
    window: WINDOW,
  });
  const { ranked } = rankCompetitionGrowth(rows);
  assert.deepEqual(
    ranked.map((row) => [row.gameName, row.rank, row.tied]),
    [
      ['Bravo', 1, false],
      ['Alpha', 2, true],
      ['Charlie', 2, true],
      ['Delta', 4, false],
    ]
  );
});

test('the public projection holds only consenting players and ranks them independently', () => {
  const rows = buildCompetitionGrowthRows({
    submissions: [
      submission('a', 'Public Winner', 1_000, true),
      submission('b', 'Private Winner', 1_000, false),
      submission('c', 'Private Loser', 1_000, false),
      submission('d', 'Public Other', 1_000, true),
      submission('e', 'Missing', 1_000, true),
    ],
    raceScores: [
      upload('a', 'Public Winner', 1_300),
      upload('b', 'Private Winner', 1_777_777),
      upload('c', 'Private Loser', 1_200),
      upload('d', 'Public Other', 1_050),
    ],
    window: WINDOW,
  });
  const projection = buildGrowthBoardProjection(rows, {
    seasonId: 'competition-12',
    publishedAt: '2026-11-05T00:00:00.000Z',
  });
  assert.equal(projection.schemaVersion, 1);
  assert.equal(projection.seasonId, 'competition-12');
  assert.equal(projection.publishedAt, '2026-11-05T00:00:00.000Z');
  assert.deepEqual(Object.keys(projection).sort(), [
    'notRanked',
    'publishedAt',
    'rows',
    'schemaVersion',
    'seasonId',
    'winners',
  ]);
  assert.deepEqual(
    projection.rows.map((row) => [row.gameName, row.rank]),
    [
      ['Public Winner', 1],
      ['Public Other', 2],
      // Unranked but consenting names stay listed with their history.
      ['Missing', null],
    ]
  );
  assert.equal(projection.rows[0].baselineSource, 'signup');
  assert.equal(projection.rows[0].growthPct, 30);
  assert.equal(projection.rows[0].fields.totalCastlePower.abs, 300);
  assert.deepEqual(projection.winners, [
    { rank: 1, gameName: 'Public Winner', growthPct: 30, growthAbs: 300 },
    { rank: 2, gameName: 'Public Other', growthPct: 5, growthAbs: 50 },
  ]);
  assert.equal(projection.notRanked, 1);
  assert.ok(
    projection.rows[0].uploads.some((upload) => upload.values.totalCastlePower === 1_300),
    'a row carries every upload its name ever had'
  );
  const serialized = JSON.stringify(projection);
  // Nothing a non-consenting player uploaded or signed up with leaks.
  assert.doesNotMatch(serialized, /1776777|1777777|1777\.777|177677/);
  assert.ok(projection.rows.every((row) => !row.gameName.startsWith('Private')));
  assert.doesNotMatch(serialized, /baseline"|final"|submissionUid|consent/);
  assert.doesNotMatch(serialized, /Private (Winner|Loser)[^}]*growth/);
});
