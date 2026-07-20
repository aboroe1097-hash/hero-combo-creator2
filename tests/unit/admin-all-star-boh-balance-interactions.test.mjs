import assert from 'node:assert/strict';
import test from 'node:test';

import { createAdminAllStarBohStoreAdapter } from '../../js/admin-all-star-boh.js';

const TEAM_IDS = Array.from({ length: 6 }, (_, index) => `team-${index + 1}`);
const ROLE_BY_SEAT = [
  'offensive',
  'offensive',
  'offensive',
  'offensive',
  'rune',
  'rune',
  'top',
  'top',
  'top',
  'bottom',
  'bottom',
  'bottom',
];
const ROLE_PREFERENCES = ['offensive', 'rune', 'top', 'bottom'];
const LOCKS = [
  { playerId: 'player-01', teamId: 'team-1', seatNumber: 1, roleGroupId: 'offensive' },
  { playerId: 'player-02', teamId: 'team-2', seatNumber: 5, roleGroupId: 'rune' },
  { playerId: 'player-03', teamId: 'team-3', seatNumber: 7, roleGroupId: 'top' },
  { playerId: 'player-04', teamId: 'team-4', seatNumber: 10, roleGroupId: 'bottom' },
  { playerId: 'player-05', teamId: 'team-5', seatNumber: 3, roleGroupId: 'offensive' },
  { playerId: 'player-06', teamId: 'team-6', seatNumber: 6, roleGroupId: 'rune' },
];

function clone(value) {
  return value == null ? value : structuredClone(value);
}

function playerId(index) {
  return `player-${String(index + 1).padStart(2, '0')}`;
}

function fixtureScore(index) {
  if (index < 6) return 2_000_000;
  if (index < 12) return 400_000;
  return 50_000 + ((index * 7_919) % 40_000);
}

function createSkewedSubmissions(count = 72) {
  return Array.from({ length: count }, (_, index) => {
    const score = fixtureScore(index);
    const id = playerId(index);
    return {
      uid: index === 0 ? 'firebase-uid-01' : id,
      playerId: id,
      revision: 1,
      gameName: `Player ${String(index + 1).padStart(2, '0')}`,
      status: 'submitted',
      totalCastlePower: score * 1_100,
      troopPower: 0,
      buildingPower: 0,
      technologyPower: 0,
      heroCombatPower: 0,
      dragonPower: score * 1_000,
      t9TroopTypes: [],
      readySpeedHeroes: [],
      level50HeroCount: 0,
      bohUsefulRating: 0,
      rolePreferences: [ROLE_PREFERENCES[index % ROLE_PREFERENCES.length]],
    };
  });
}

function createInitialTeams() {
  const teams = new Map(
    TEAM_IDS.map((teamId, index) => [
      teamId,
      {
        id: teamId,
        revision: 0,
        number: index + 1,
        name: `Team ${index + 1}`,
        seats: [],
      },
    ])
  );
  for (const lock of LOCKS) {
    teams.get(lock.teamId).seats.push({
      id: `${lock.teamId}-seat-${lock.seatNumber}`,
      seatNumber: lock.seatNumber,
      playerId: lock.playerId,
      displayName: lock.playerId,
      roleGroupId: lock.roleGroupId,
      locked: true,
      score: fixtureScore(Number(lock.playerId.slice(-2)) - 1),
    });
  }
  teams.get('team-1').seats.push({
    id: 'team-1-seat-2',
    seatNumber: 2,
    playerId: 'player-07',
    displayName: 'Player 07',
    roleGroupId: 'offensive',
    locked: false,
    score: fixtureScore(6),
  });
  return teams;
}

function createInitialDraft(playerCount = 72) {
  return {
    revision: 0,
    title: 'All-Star BoH skew fixture',
    teamIds: TEAM_IDS,
    playerIds: playerCount === 72 ? Array.from({ length: 72 }, (_, index) => playerId(index)) : [],
    scoringVersions: [],
    scoreOverrides: [],
    publications: { announcement: false, plan: false },
    plan: {
      roleDefaults: ROLE_PREFERENCES.map((roleGroupId, index) => ({
        id: `global-${roleGroupId}-instruction`,
        teamId: '*',
        phaseId: '*',
        legionId: '*',
        roleGroupId,
        scope: 'role',
        scopeId: roleGroupId,
        order: index + 1,
        instruction: {
          summary: 'Follow the published phase and Legion call.',
          action: 'Follow phase lead',
          note: 'Remain available for reassignment.',
        },
      })),
      instructions: [],
    },
  };
}

function conflictError(expectedRevision, actualRevision) {
  const error = new Error(
    `Revision conflict: expected ${expectedRevision}, found ${actualRevision}.`
  );
  error.code = 'all-star-boh-conflict';
  error.expectedRevision = expectedRevision;
  error.actualRevision = actualRevision;
  return error;
}

function createPrimitiveStoreFixture(options = {}) {
  const playerCount = options.playerCount || 72;
  const submissions = createSkewedSubmissions(playerCount);
  options.mutateSubmissions?.(submissions);
  const reviews = new Map(
    submissions.map((submission) => [
      submission.uid,
      {
        revision: 0,
        submissionRevision: submission.revision,
        stale: false,
        status: 'verified',
        note: '',
        roleTags: [],
        locked: false,
      },
    ])
  );
  let draft = clone(options.draft || createInitialDraft(playerCount));
  const teams = createInitialTeams();
  let publication = null;
  const publishCalls = [];
  const bundleCalls = [];
  let singleTeamSaveCount = 0;

  function revisionedSave(current, input, expectedRevision) {
    const actualRevision = Number(current?.revision || 0);
    if (Number(expectedRevision) !== actualRevision) {
      throw conflictError(Number(expectedRevision), actualRevision);
    }
    return { ...clone(input), revision: actualRevision + 1 };
  }

  const store = {
    get teams() {
      return teams;
    },
    get draft() {
      return draft;
    },
    get publishCalls() {
      return publishCalls;
    },
    get bundleCalls() {
      return bundleCalls;
    },
    get singleTeamSaveCount() {
      return singleTeamSaveCount;
    },
    bumpTeamRevision(teamId) {
      const current = teams.get(teamId);
      teams.set(teamId, { ...current, revision: Number(current?.revision || 0) + 1 });
    },
    bumpSubmissionRevision(uid) {
      const submission = submissions.find((item) => item.uid === uid);
      submission.revision += 1;
    },
    async listSubmissions() {
      return clone(submissions);
    },
    subscribeSubmissions() {
      return () => {};
    },
    async getReview(uid) {
      return clone(reviews.get(uid) || null);
    },
    async saveReview(uid, input, options) {
      assert.equal(
        options.submissionRevision,
        submissions.find((item) => item.uid === uid).revision
      );
      const saved = revisionedSave(reviews.get(uid), input, options.expectedRevision);
      reviews.set(uid, saved);
      return clone(saved);
    },
    async getDraft() {
      return clone(draft);
    },
    subscribeDraft() {
      return () => {};
    },
    async saveDraft(input, options) {
      draft = revisionedSave(draft, input, options.expectedRevision);
      return clone(draft);
    },
    async getDraftTeam(teamId) {
      return clone(teams.get(teamId) || null);
    },
    subscribeDraftTeam() {
      return () => {};
    },
    async saveDraftTeam(teamId, input, options) {
      singleTeamSaveCount += 1;
      const saved = revisionedSave(teams.get(teamId), input, options.expectedRevision);
      teams.set(teamId, saved);
      return clone(saved);
    },
    async saveDraftBundle(bundle, options) {
      const teamEntries = Object.entries(bundle.teams || {});
      for (const [teamId] of teamEntries) {
        const actual = Number(teams.get(teamId)?.revision || 0);
        const expected = Number(options.expectedTeamRevisions?.[teamId]);
        if (actual !== expected) throw conflictError(expected, actual);
      }
      if (bundle.draft) {
        const actual = Number(draft?.revision || 0);
        const expected = Number(options.expectedDraftRevision);
        if (actual !== expected) throw conflictError(expected, actual);
      }
      const savedTeams = Object.fromEntries(
        teamEntries.map(([teamId, input]) => [
          teamId,
          revisionedSave(teams.get(teamId), input, options.expectedTeamRevisions[teamId]),
        ])
      );
      const savedDraft = bundle.draft
        ? revisionedSave(draft, bundle.draft, options.expectedDraftRevision)
        : null;
      for (const [teamId, team] of Object.entries(savedTeams)) teams.set(teamId, team);
      if (savedDraft) draft = savedDraft;
      bundleCalls.push({ bundle: clone(bundle), options: clone(options) });
      return { draft: clone(savedDraft), teams: clone(savedTeams) };
    },
    async getPublication() {
      return clone(publication);
    },
    subscribePublication() {
      return () => {};
    },
    async publish(bundle, options) {
      assert.equal(options.sourceDraftRevision, draft.revision);
      assert.deepEqual(
        options.sourceTeamRevisions,
        Object.fromEntries(TEAM_IDS.map((teamId) => [teamId, teams.get(teamId).revision]))
      );
      if (bundle.current.planPublished) {
        assert.equal(typeof options.validate, 'function');
        const validation = await options.validate(bundle);
        assert.equal(validation?.valid, true, JSON.stringify(validation?.errors?.slice(0, 3)));
      }
      const savedCurrent = revisionedSave(publication, bundle.current, options.expectedRevision);
      const saved = {
        current: savedCurrent,
        teams: clone(bundle.teams),
        players: clone(bundle.players),
      };
      publication = savedCurrent;
      publishCalls.push({
        expectedRevision: options.expectedRevision,
        sourceDraftRevision: options.sourceDraftRevision,
        sourceTeamRevisions: clone(options.sourceTeamRevisions),
        bundle: clone(saved),
      });
      return clone(saved);
    },
    stop() {},
  };
  return store;
}

function seat(snapshot, teamId, seatNumber) {
  return snapshot.teams
    .find((team) => team.id === teamId)
    ?.seats.find((candidate) => candidate.seatNumber === seatNumber);
}

async function dispatch(adapter, snapshot, type, payload = {}) {
  return adapter.dispatch({ type, payload, expectedRevision: snapshot.revision });
}

async function saveTeamCaptains(adapter, snapshot) {
  let current = snapshot;
  for (const team of current.teams) {
    current = (
      await dispatch(adapter, current, 'saveTeamMetadata', {
        teamId: team.id,
        name: team.name,
        color: team.color,
        captainId: team.seats[0].playerId,
        notes: '',
      })
    ).snapshot;
  }
  return current;
}

async function createBalancedFixture() {
  const primitiveStore = createPrimitiveStoreFixture();
  const adapter = createAdminAllStarBohStoreAdapter(primitiveStore);
  let snapshot = await adapter.start();
  const balanced = await dispatch(adapter, snapshot, 'balanceTeams');
  snapshot = balanced.snapshot;
  snapshot = await saveTeamCaptains(adapter, snapshot);
  return { adapter, primitiveStore, snapshot };
}

test('adapter balances a severely skewed 72-player field while preserving exact locks', async () => {
  const primitiveStore = createPrimitiveStoreFixture();
  const adapter = createAdminAllStarBohStoreAdapter(primitiveStore);
  let snapshot = await adapter.start();

  const beforeMoveRevision = snapshot.revision;
  const moved = await dispatch(adapter, snapshot, 'moveSeat', {
    source: { teamId: 'team-1', seatNumber: 2 },
    destination: { teamId: 'team-2', seatNumber: 2 },
  });
  snapshot = moved.snapshot;
  assert.equal(primitiveStore.bundleCalls.length, 1);
  assert.deepEqual(Object.keys(primitiveStore.bundleCalls[0].bundle.teams).sort(), [
    'team-1',
    'team-2',
  ]);
  assert.equal(primitiveStore.singleTeamSaveCount, 0);
  assert.equal(seat(snapshot, 'team-1', 2).playerId, '');
  assert.equal(seat(snapshot, 'team-2', 2).playerId, 'player-07');

  await assert.rejects(
    adapter.dispatch({
      type: 'setSeatLock',
      expectedRevision: beforeMoveRevision,
      payload: { teamId: 'team-2', seatNumber: 2, locked: true },
    }),
    (error) =>
      error?.code === 'all-star-boh-ui-conflict' &&
      error.expectedRevision === beforeMoveRevision &&
      error.actualRevision === snapshot.revision
  );

  const balanced = await dispatch(adapter, snapshot, 'balanceTeams');
  snapshot = balanced.snapshot;
  assert.equal(primitiveStore.bundleCalls.at(-1).bundle.teams !== undefined, true);
  assert.equal(Object.keys(primitiveStore.bundleCalls.at(-1).bundle.teams).length, 6);
  const allSeats = snapshot.teams.flatMap((team) => team.seats);
  const assignedIds = allSeats.map((entry) => entry.playerId);
  assert.equal(snapshot.teams.length, 6);
  assert.deepEqual(
    snapshot.teams.map((team) => team.seats.length),
    [12, 12, 12, 12, 12, 12]
  );
  assert.equal(assignedIds.filter(Boolean).length, 72);
  assert.equal(new Set(assignedIds).size, 72);
  for (const team of snapshot.teams) {
    const roleCounts = team.seats.reduce((counts, entry) => {
      counts[entry.roleGroupId] = (counts[entry.roleGroupId] || 0) + 1;
      return counts;
    }, {});
    assert.deepEqual(roleCounts, { offensive: 4, rune: 2, top: 3, bottom: 3 });
  }
  for (const lock of LOCKS) {
    const lockedSeat = seat(snapshot, lock.teamId, lock.seatNumber);
    assert.equal(lockedSeat.playerId, lock.playerId);
    assert.equal(lockedSeat.roleGroupId, lock.roleGroupId);
    assert.equal(lockedSeat.locked, true);
  }

  const playerScores = snapshot.scores.map((entry) => entry.finalScore).sort((a, b) => a - b);
  assert.ok(playerScores.at(-1) / playerScores[Math.floor(playerScores.length / 2)] > 20);
  const teamTotals = snapshot.teams.map((team) =>
    team.seats.reduce((total, entry) => total + entry.score, 0)
  );
  const mean = teamTotals.reduce((total, score) => total + score, 0) / teamTotals.length;
  const spread = Math.max(...teamTotals) - Math.min(...teamTotals);
  assert.ok(spread / mean < 0.02, `expected <2% spread, received ${spread / mean}`);

  const unlocked = snapshot.teams.flatMap((team) =>
    team.seats.filter((entry) => !entry.locked).map((entry) => ({ ...entry, teamId: team.id }))
  );
  const source = unlocked[0];
  const target = unlocked.find((entry) => entry.teamId !== source.teamId);
  await assert.rejects(
    dispatch(adapter, snapshot, 'moveSeat', {
      source: { teamId: source.teamId, seatNumber: source.seatNumber },
      destination: { teamId: target.teamId, seatNumber: target.seatNumber },
    }),
    (error) => error?.code === 'all-star-boh-seat-occupied'
  );
  await assert.rejects(
    dispatch(adapter, snapshot, 'swapSeats', {
      source: { teamId: LOCKS[0].teamId, seatNumber: LOCKS[0].seatNumber },
      destination: { teamId: target.teamId, seatNumber: target.seatNumber },
    }),
    (error) => error?.code === 'all-star-boh-seat-locked'
  );

  const sourcePlayerId = source.playerId;
  const targetPlayerId = target.playerId;
  const swapped = await dispatch(adapter, snapshot, 'swapSeats', {
    source: { teamId: source.teamId, seatNumber: source.seatNumber },
    destination: { teamId: target.teamId, seatNumber: target.seatNumber },
  });
  snapshot = swapped.snapshot;
  assert.equal(seat(snapshot, source.teamId, source.seatNumber).playerId, targetPlayerId);
  assert.equal(seat(snapshot, target.teamId, target.seatNumber).playerId, sourcePlayerId);
  assert.equal(
    new Set(snapshot.teams.flatMap((team) => team.seats.map((entry) => entry.playerId))).size,
    72
  );

  primitiveStore.bumpTeamRevision('team-3');
  const unlockedTeamThreeSeat = snapshot.teams
    .find((team) => team.id === 'team-3')
    .seats.find((entry) => !entry.locked);
  await assert.rejects(
    dispatch(adapter, snapshot, 'setSeatLock', {
      teamId: 'team-3',
      seatNumber: unlockedTeamThreeSeat.seatNumber,
      locked: true,
    }),
    (error) =>
      error?.code === 'all-star-boh-conflict' && error.expectedRevision + 1 === error.actualRevision
  );

  const refreshed = await adapter.refresh();
  assert.equal(
    refreshed.documentRevisions.teams['team-3'],
    primitiveStore.teams.get('team-3').revision
  );
  adapter.stop();
});

test('cross-team conflicts preserve the source player and role migrations use one bundle', async () => {
  const primitiveStore = createPrimitiveStoreFixture();
  const adapter = createAdminAllStarBohStoreAdapter(primitiveStore);
  let snapshot = await adapter.start();

  primitiveStore.bumpTeamRevision('team-2');
  await assert.rejects(
    dispatch(adapter, snapshot, 'moveSeat', {
      source: { teamId: 'team-1', seatNumber: 2 },
      destination: { teamId: 'team-2', seatNumber: 2 },
    }),
    (error) => error?.code === 'all-star-boh-conflict'
  );
  assert.equal(
    primitiveStore.teams.get('team-1').seats.find((entry) => entry.seatNumber === 2).playerId,
    'player-07'
  );
  assert.equal(
    primitiveStore.teams.get('team-2').seats.find((entry) => entry.seatNumber === 2),
    undefined
  );
  assert.equal(primitiveStore.bundleCalls.length, 0);

  snapshot = adapter.getSnapshot();
  const roleGroups = snapshot.plan.roleGroups.map((role, index) => ({
    ...role,
    label: index === 0 ? 'Offensive Core' : role.label,
  }));
  const migrated = await dispatch(adapter, snapshot, 'saveRoleGroups', { roleGroups });
  snapshot = migrated.snapshot;
  const migration = primitiveStore.bundleCalls.at(-1);
  assert.ok(migration.bundle.draft);
  assert.equal(Object.keys(migration.bundle.teams).length, 6);
  assert.deepEqual(
    migration.options.expectedTeamRevisions,
    Object.fromEntries(TEAM_IDS.map((teamId) => [teamId, teamId === 'team-2' ? 1 : 0]))
  );
  assert.equal(snapshot.plan.roleGroups[0].label, 'Offensive Core');
  assert.equal(
    snapshot.teams.every((team) => team.seats.every((entry) => entry.roleGroupId)),
    true
  );
  adapter.stop();
});

test('same-team moves and swaps persist both halves on one shared team clone', async () => {
  const primitiveStore = createPrimitiveStoreFixture();
  primitiveStore.teams.get('team-1').seats.push({
    id: 'team-1-seat-4',
    seatNumber: 4,
    playerId: 'player-08',
    displayName: 'Player 08',
    roleGroupId: 'offensive',
    locked: false,
    score: fixtureScore(7),
  });
  const adapter = createAdminAllStarBohStoreAdapter(primitiveStore);
  let snapshot = await adapter.start();

  snapshot = (
    await dispatch(adapter, snapshot, 'moveSeat', {
      source: { teamId: 'team-1', seatNumber: 2 },
      destination: { teamId: 'team-1', seatNumber: 3 },
    })
  ).snapshot;
  assert.equal(seat(snapshot, 'team-1', 2).playerId, '');
  assert.equal(seat(snapshot, 'team-1', 3).playerId, 'player-07');
  assert.equal(
    primitiveStore.teams.get('team-1').seats.find((item) => item.seatNumber === 3).playerId,
    'player-07'
  );

  snapshot = (
    await dispatch(adapter, snapshot, 'swapSeats', {
      source: { teamId: 'team-1', seatNumber: 3 },
      destination: { teamId: 'team-1', seatNumber: 4 },
    })
  ).snapshot;
  assert.equal(seat(snapshot, 'team-1', 3).playerId, 'player-08');
  assert.equal(seat(snapshot, 'team-1', 4).playerId, 'player-07');
  assert.equal(primitiveStore.singleTeamSaveCount, 2);
  adapter.stop();
});

test('direct seat assignment adds, replaces, moves, removes, and respects selection locks', async () => {
  const primitiveStore = createPrimitiveStoreFixture();
  const adapter = createAdminAllStarBohStoreAdapter(primitiveStore);
  let snapshot = await adapter.start();

  snapshot = (
    await dispatch(adapter, snapshot, 'assignSeatPlayer', {
      teamId: 'team-2',
      seatNumber: 2,
      playerId: 'player-08',
    })
  ).snapshot;
  assert.equal(seat(snapshot, 'team-2', 2).playerId, 'player-08');

  snapshot = (
    await dispatch(adapter, snapshot, 'assignSeatPlayer', {
      teamId: 'team-2',
      seatNumber: 2,
      playerId: 'player-09',
    })
  ).snapshot;
  assert.equal(seat(snapshot, 'team-2', 2).playerId, 'player-09');
  assert.equal(
    snapshot.teams.some((team) => team.seats.some((entry) => entry.playerId === 'player-08')),
    false
  );

  snapshot = (
    await dispatch(adapter, snapshot, 'assignSeatPlayer', {
      teamId: 'team-2',
      seatNumber: 3,
      playerId: 'player-07',
    })
  ).snapshot;
  assert.equal(seat(snapshot, 'team-1', 2).playerId, '');
  assert.equal(seat(snapshot, 'team-2', 3).playerId, 'player-07');
  assert.equal(
    snapshot.teams.flatMap((team) => team.seats).filter((entry) => entry.playerId === 'player-07')
      .length,
    1
  );

  snapshot = (
    await dispatch(adapter, snapshot, 'assignSeatPlayer', {
      teamId: 'team-2',
      seatNumber: 3,
      playerId: '',
    })
  ).snapshot;
  assert.equal(seat(snapshot, 'team-2', 3).playerId, '');

  await assert.rejects(
    dispatch(adapter, snapshot, 'assignSeatPlayer', {
      teamId: 'team-2',
      seatNumber: 5,
      playerId: 'player-10',
    }),
    (error) => error?.code === 'all-star-boh-seat-locked'
  );
  await assert.rejects(
    dispatch(adapter, snapshot, 'assignSeatPlayer', {
      teamId: 'team-2',
      seatNumber: 4,
      playerId: 'player-01',
    }),
    (error) => error?.code === 'all-star-boh-seat-locked'
  );
  await assert.rejects(
    dispatch(adapter, snapshot, 'assignSeatPlayer', {
      teamId: 'team-2',
      seatNumber: 4,
      playerId: 'player-73',
    }),
    (error) => error?.code === 'all-star-boh-player-not-selected'
  );
  adapter.stop();
});

test('more than 72 verified signups require an explicit eligible pool before balancing', async () => {
  const primitiveStore = createPrimitiveStoreFixture({ playerCount: 80 });
  const adapter = createAdminAllStarBohStoreAdapter(primitiveStore);
  let snapshot = await adapter.start();
  assert.equal(snapshot.scores.length, 80);
  assert.deepEqual(snapshot.eligiblePlayerIds, []);

  await assert.rejects(
    dispatch(adapter, snapshot, 'balanceTeams'),
    (error) => error?.code === 'all-star-boh-selection-incomplete'
  );
  await assert.rejects(
    dispatch(adapter, snapshot, 'saveEligiblePool', {
      playerIds: snapshot.scores.slice(0, 71).map((player) => player.playerId),
    }),
    (error) => error?.code === 'all-star-boh-selection-count'
  );

  const selected = snapshot.scores.slice(0, 72).map((player) => player.playerId);
  snapshot = (await dispatch(adapter, snapshot, 'saveEligiblePool', { playerIds: selected }))
    .snapshot;
  assert.deepEqual(snapshot.eligiblePlayerIds, selected);
  snapshot = (await dispatch(adapter, snapshot, 'balanceTeams')).snapshot;
  const assigned = snapshot.teams.flatMap((team) => team.seats.map((entry) => entry.playerId));
  assert.equal(assigned.filter(Boolean).length, 72);
  assert.deepEqual(new Set(assigned), new Set(selected));
  assert.equal(assigned.includes('player-80'), false);
  adapter.stop();
});

test('leadership usefulness affects scores only for the reviewed submission revision', async () => {
  const primitiveStore = createPrimitiveStoreFixture();
  const adapter = createAdminAllStarBohStoreAdapter(primitiveStore);
  let snapshot = await adapter.start();
  const original = snapshot.scores.find((entry) => entry.playerId === 'player-01');

  snapshot = (
    await dispatch(adapter, snapshot, 'reviewSubmission', {
      playerId: 'player-01',
      status: 'confirmed',
      note: 'Confirmed with leadership usefulness.',
      adminUsefulnessRating: 5,
    })
  ).snapshot;
  const rated = snapshot.scores.find((entry) => entry.playerId === 'player-01');
  assert.equal(rated.scoreBreakdown.bohUsefulRating.input, 5);
  assert.equal(rated.scoreBreakdown.bohUsefulRating.points, 5_000);
  assert.equal(rated.calculatedScore, original.calculatedScore + 5_000);

  snapshot = (
    await dispatch(adapter, snapshot, 'reviewSubmission', {
      playerId: 'player-01',
      status: 'confirmed',
      note: 'Rating remains unless explicitly changed.',
    })
  ).snapshot;
  const preserved = snapshot.scores.find((entry) => entry.playerId === 'player-01');
  assert.equal(preserved.scoreBreakdown.bohUsefulRating.input, 5);

  primitiveStore.bumpSubmissionRevision('firebase-uid-01');
  snapshot = await adapter.refresh();
  const stale = snapshot.scores.find((entry) => entry.playerId === 'player-01');
  assert.equal(stale.reviewStale, true);
  assert.equal(stale.scoreBreakdown.bohUsefulRating.input, 0);
  assert.equal(stale.calculatedScore, original.calculatedScore);
  adapter.stop();
});

test('admin scoring preserves sparse zero defaults and trusts paid hero metadata on every recalculation', async () => {
  const draft = createInitialDraft(1);
  draft.activeScoringVersionId = 'legacy-sparse';
  draft.scoringVersions = [
    {
      id: 'legacy-sparse',
      version: 1,
      label: 'Legacy sparse profile',
      powerWeights: {},
      bonusWeights: {},
      powerDivisor: 1000,
      precision: 3,
    },
  ];
  const primitiveStore = createPrimitiveStoreFixture({
    playerCount: 1,
    draft,
    mutateSubmissions(submissions) {
      submissions[0].stats = {
        unitSpecialtyPower: 1_000,
        rocLevel: 3,
        usableHeroNames: ['Cleopatra VII', 'Free Hero', 'Beowulf', 'Cleopatra VII'],
        troopRoster: ['estimate|lofty|2000000', 'estimate|enhanced-t10|3000000'],
      };
    },
  });
  const adapter = createAdminAllStarBohStoreAdapter(primitiveStore, {
    paidUsableHeroNames: ['Cleopatra VII', 'Beowulf'],
  });
  let snapshot = await adapter.start();

  assert.deepEqual(
    {
      unitSpecialtyPower: snapshot.scoring.activeVersion.weights.unitSpecialtyPower,
      rocLevel: snapshot.scoring.activeVersion.weights.rocLevel,
      paidUsableHero: snapshot.scoring.activeVersion.weights.paidUsableHero,
      loftyTroopMillion: snapshot.scoring.activeVersion.weights.loftyTroopMillion,
      enhancedT10TroopMillion: snapshot.scoring.activeVersion.weights.enhancedT10TroopMillion,
    },
    {
      unitSpecialtyPower: 0,
      rocLevel: 0,
      paidUsableHero: 0,
      loftyTroopMillion: 0,
      enhancedT10TroopMillion: 0,
    }
  );
  assert.equal(snapshot.scores[0].scoreBreakdown.paidUsableHero.input, 2);
  assert.equal(snapshot.scores[0].scoreBreakdown.paidUsableHero.points, 0);

  snapshot = (
    await dispatch(adapter, snapshot, 'createScoringVersion', {
      label: 'Expanded profile',
      note: 'Enable the new score components.',
      weights: {
        unitSpecialtyPower: 0.25,
        rocLevel: 40,
        paidUsableHero: 125,
        loftyTroopMillion: 80,
        enhancedT10TroopMillion: 90,
      },
    })
  ).snapshot;
  const savedProfile = primitiveStore.draft.scoringVersions.at(-1);
  assert.equal(savedProfile.powerWeights.unitSpecialtyPower, 0.25);
  assert.deepEqual(
    {
      rocLevel: savedProfile.bonusWeights.rocLevel,
      paidUsableHero: savedProfile.bonusWeights.paidUsableHero,
      loftyTroopMillion: savedProfile.bonusWeights.loftyTroopMillion,
      enhancedT10TroopMillion: savedProfile.bonusWeights.enhancedT10TroopMillion,
    },
    {
      rocLevel: 40,
      paidUsableHero: 125,
      loftyTroopMillion: 80,
      enhancedT10TroopMillion: 90,
    }
  );
  const recalculated = snapshot.scores[0].scoreBreakdown;
  assert.equal(recalculated.paidUsableHero.input, 2);
  assert.equal(recalculated.paidUsableHero.points, 250);

  snapshot = (
    await dispatch(adapter, snapshot, 'reviewSubmission', {
      playerId: 'player-01',
      status: 'confirmed',
      note: 'Recalculated with canonical paid hero metadata.',
    })
  ).snapshot;
  const persistedBreakdown = snapshot.submissions[0].review.score.breakdown;
  assert.equal(persistedBreakdown.paidUsableHero.input, 2);
  assert.equal(persistedBreakdown.paidUsableHero.points, 250);
  adapter.stop();
});

test('an edited submission makes its verified review stale until the new revision is reviewed', async () => {
  const primitiveStore = createPrimitiveStoreFixture();
  const adapter = createAdminAllStarBohStoreAdapter(primitiveStore);
  let snapshot = await adapter.start();
  assert.equal(
    snapshot.submissions.find((submission) => submission.playerId === 'player-01').reviewStatus,
    'confirmed'
  );

  primitiveStore.bumpSubmissionRevision('firebase-uid-01');
  snapshot = await adapter.refresh();
  const stale = snapshot.submissions.find((submission) => submission.playerId === 'player-01');
  assert.equal(stale.reviewStatus, 'pending');
  assert.equal(stale.reviewStale, true);

  const reviewed = await dispatch(adapter, snapshot, 'reviewSubmission', {
    playerId: 'player-01',
    status: 'confirmed',
    note: 'Rechecked after the player edit.',
  });
  snapshot = reviewed.snapshot;
  const fresh = snapshot.submissions.find((submission) => submission.playerId === 'player-01');
  assert.equal(fresh.reviewStatus, 'confirmed');
  assert.equal(fresh.review.submissionRevision, 2);
  assert.equal(fresh.review.note, 'Rechecked after the player edit.');
  adapter.stop();
});

test('rotations can be created, edited in place, and removed', async () => {
  const primitiveStore = createPrimitiveStoreFixture();
  const adapter = createAdminAllStarBohStoreAdapter(primitiveStore);
  let snapshot = await adapter.start();
  const context = {
    teamId: 'team-1',
    phaseId: snapshot.plan.phases[0].id,
    legionId: snapshot.plan.legions[0].id,
    sourceSeatNumber: 2,
  };

  snapshot = (
    await dispatch(adapter, snapshot, 'saveRotation', {
      ...context,
      targetSeatNumber: 3,
      note: 'Opening rotation',
    })
  ).snapshot;
  const created = snapshot.plan.rotations[0];
  assert.ok(created.id);
  assert.equal(created.seatNumber, 3);
  assert.equal(created.note, 'Opening rotation');

  snapshot = (
    await dispatch(adapter, snapshot, 'saveRotation', {
      ...context,
      rotationId: created.id,
      targetSeatNumber: 4,
      note: 'Updated rotation',
    })
  ).snapshot;
  assert.equal(snapshot.plan.rotations.length, 1);
  assert.equal(snapshot.plan.rotations[0].id, created.id);
  assert.equal(snapshot.plan.rotations[0].seatNumber, 4);
  assert.equal(snapshot.plan.rotations[0].note, 'Updated rotation');

  snapshot = (await dispatch(adapter, snapshot, 'removeRotation', { rotationId: created.id }))
    .snapshot;
  assert.deepEqual(snapshot.plan.rotations, []);
  adapter.stop();
});

test('announcement and plan publishing each require validation of their current revision', async () => {
  const { adapter, primitiveStore } = await createBalancedFixture();
  let snapshot = adapter.getSnapshot();

  await assert.rejects(
    dispatch(adapter, snapshot, 'publishAnnouncement'),
    (error) => error?.code === 'all-star-boh-publish-not-validated'
  );
  const announcementValidation = await dispatch(adapter, snapshot, 'validateRevision');
  snapshot = announcementValidation.snapshot;
  assert.equal(
    snapshot.validation.valid,
    true,
    JSON.stringify(snapshot.validation.errors.slice(0, 3))
  );
  assert.equal(snapshot.validation.revision, snapshot.revision);

  const announcement = await dispatch(adapter, snapshot, 'publishAnnouncement');
  snapshot = announcement.snapshot;
  assert.equal(primitiveStore.publishCalls.length, 1);
  const announcementCall = primitiveStore.publishCalls[0];
  assert.equal(announcementCall.expectedRevision, 0);
  assert.equal(announcementCall.bundle.current.announcementPublished, true);
  assert.equal(announcementCall.bundle.current.planPublished, false);
  assert.equal(announcementCall.bundle.current.status, 'announcement');
  assert.deepEqual(announcementCall.bundle.current.phases, []);
  assert.equal('plan' in announcementCall.bundle.teams['team-1'], false);
  assert.equal('plan' in announcementCall.bundle.players['firebase-uid-01'], false);
  assert.equal(announcementCall.bundle.players['firebase-uid-01'].playerId, 'player-01');
  assert.equal('playerIds' in announcementCall.bundle.current, false);
  assert.equal(primitiveStore.draft.revision, 0, 'publish must not perform a second draft write');
  assert.equal(snapshot.publications.announcement.status, 'published');
  assert.equal(snapshot.publications.plan.status, 'draft');

  await assert.rejects(
    dispatch(adapter, snapshot, 'publishPlan'),
    (error) => error?.code === 'all-star-boh-publish-not-validated'
  );
  const planValidation = await dispatch(adapter, snapshot, 'validateRevision');
  snapshot = planValidation.snapshot;
  assert.equal(
    snapshot.validation.valid,
    true,
    JSON.stringify(snapshot.validation.errors.slice(0, 3))
  );
  assert.equal(snapshot.validation.revision, snapshot.revision);

  const plan = await dispatch(adapter, snapshot, 'publishPlan');
  snapshot = plan.snapshot;
  assert.equal(primitiveStore.publishCalls.length, 2);
  const planCall = primitiveStore.publishCalls[1];
  assert.equal(planCall.expectedRevision, 1);
  assert.equal(planCall.bundle.current.announcementPublished, true);
  assert.equal(planCall.bundle.current.planPublished, true);
  assert.equal(planCall.bundle.current.status, 'live');
  assert.equal(planCall.bundle.current.phases.length, 4);
  assert.equal(planCall.bundle.current.legions.length, 2);
  assert.equal('plan' in planCall.bundle.teams['team-1'], false);
  assert.equal(planCall.bundle.players['firebase-uid-01'].plan.roleDefaults.length, 0);
  assert.equal(planCall.bundle.players['firebase-uid-01'].timeline.length, 8);
  assert.equal(
    planCall.bundle.players['firebase-uid-01'].timeline.every(
      (entry) => Object.keys(entry.instruction || {}).length > 0
    ),
    true
  );
  assert.equal(snapshot.publications.announcement.status, 'published');
  assert.equal(snapshot.publications.plan.status, 'published');
  adapter.stop();
});

test('a complete assignment announcement can publish before plan instructions are ready', async () => {
  const primitiveStore = createPrimitiveStoreFixture();
  primitiveStore.draft.plan.roleDefaults = [];
  const adapter = createAdminAllStarBohStoreAdapter(primitiveStore);
  let snapshot = await adapter.start();
  snapshot = (await dispatch(adapter, snapshot, 'balanceTeams')).snapshot;
  snapshot = await saveTeamCaptains(adapter, snapshot);
  snapshot = (await dispatch(adapter, snapshot, 'validateRevision')).snapshot;

  assert.equal(snapshot.validation.announcement.valid, true);
  assert.equal(snapshot.validation.plan.valid, false);
  snapshot = (await dispatch(adapter, snapshot, 'publishAnnouncement')).snapshot;
  assert.equal(snapshot.publications.announcement.status, 'published');
  assert.equal(snapshot.publications.plan.status, 'draft');
  await assert.rejects(
    dispatch(adapter, snapshot, 'publishPlan'),
    (error) => error?.code === 'all-star-boh-publish-not-validated'
  );
  adapter.stop();
});

test('global and player instructions preserve canonical routes without copying player identity', async () => {
  const primitiveStore = createPrimitiveStoreFixture();
  const adapter = createAdminAllStarBohStoreAdapter(primitiveStore);
  let snapshot = await adapter.start();
  for (const [id, code] of [
    ['objective-cc1', 'CC1'],
    ['objective-t3', 'T3'],
    ['objective-fh1', 'FH1'],
  ]) {
    snapshot = (
      await dispatch(adapter, snapshot, 'saveObjective', {
        id,
        code,
        label: code,
        x: 50,
        y: 50,
      })
    ).snapshot;
  }
  const context = {
    teamId: 'team-1',
    phaseId: snapshot.plan.phases[0].id,
    legionId: snapshot.plan.legions[0].id,
  };
  snapshot = (
    await dispatch(adapter, snapshot, 'saveInstruction', {
      ...context,
      scope: 'global',
      scopeId: '*',
      action: 'Hold center',
      instruction: 'Hold center until the call.',
      startObjectiveId: 'CC1',
      viaObjectiveIds: ['objective-t3'],
      pathObjectiveIds: ['FH1'],
      objectiveId: 'objective-fh1',
    })
  ).snapshot;
  snapshot = (
    await dispatch(adapter, snapshot, 'saveInstruction', {
      ...context,
      scope: 'player',
      scopeId: 'player-07',
      playerId: 'player-07',
      action: 'Capture',
      instruction: 'Capture the route target.',
      objectiveId: 'FH1',
    })
  ).snapshot;
  const globalRule = snapshot.plan.instructions.find((rule) => rule.scope === 'global');
  assert.deepEqual(globalRule.pathObjectiveIds, ['objective-cc1', 'objective-t3', 'objective-fh1']);
  assert.equal(
    snapshot.plan.instructions.find((rule) => rule.scope === 'player').playerId,
    'player-07'
  );

  snapshot = (
    await dispatch(adapter, snapshot, 'copyTeamPlan', {
      sourceTeamId: 'team-1',
      targetTeamId: 'team-2',
      copyPlayerAssignments: false,
      copyPlayerNames: false,
    })
  ).snapshot;
  assert.equal(
    snapshot.plan.instructions.some((rule) => rule.teamId === 'team-2' && rule.scope === 'global'),
    true
  );
  assert.equal(
    snapshot.plan.instructions.some(
      (rule) => rule.teamId === 'team-2' && rule.playerId === 'player-07'
    ),
    false
  );
  adapter.stop();
});
