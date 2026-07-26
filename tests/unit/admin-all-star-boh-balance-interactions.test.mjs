import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildSignupReviewCsv,
  createAdminAllStarBohStoreAdapter,
  sortAdminScoreBreakdownRows,
} from '../../js/admin-all-star-boh.js';

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
  const bundleAttempts = [];
  const draftListeners = new Set();
  const teamListeners = new Map();
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
    get bundleAttempts() {
      return bundleAttempts;
    },
    get activeTeamSubscriberIds() {
      return [...teamListeners]
        .filter(([, listeners]) => listeners.size)
        .map(([teamId]) => teamId)
        .sort();
    },
    get singleTeamSaveCount() {
      return singleTeamSaveCount;
    },
    bumpTeamRevision(teamId) {
      const current = teams.get(teamId);
      teams.set(teamId, { ...current, revision: Number(current?.revision || 0) + 1 });
    },
    emitDraft(value = draft) {
      for (const listener of [...draftListeners]) listener(clone(value));
    },
    emitTeam(teamId, value = teams.get(teamId)) {
      for (const listener of [...(teamListeners.get(teamId) || [])]) listener(clone(value));
    },
    bumpSubmissionRevision(uid, updates = {}) {
      const submission = submissions.find((item) => item.uid === uid);
      Object.assign(submission, clone(updates));
      submission.revision += 1;
    },
    bumpReviewRevision(uid, submissionRevision) {
      const review = reviews.get(uid);
      reviews.set(uid, {
        ...review,
        revision: Number(review?.revision || 0) + 1,
        submissionRevision: submissionRevision ?? review?.submissionRevision ?? 0,
      });
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
    async deleteSubmission(uid, options = {}) {
      const index = submissions.findIndex((submission) => submission.uid === uid);
      if (index < 0) throw new Error(`Unknown fixture submission: ${uid}`);
      const submission = submissions[index];
      const expectedRevision = Number(options.expectedRevision);
      if (expectedRevision !== Number(submission.revision)) {
        throw conflictError(expectedRevision, Number(submission.revision));
      }
      submissions.splice(index, 1);
      reviews.delete(uid);
      const playerIds = new Set([uid, submission.playerId]);
      draft = {
        ...draft,
        playerIds: (draft.playerIds || []).filter((playerIdValue) => !playerIds.has(playerIdValue)),
        forcedTeamAssignments: (draft.forcedTeamAssignments || []).filter(
          (assignment) => !playerIds.has(assignment.playerId)
        ),
        commitmentScoreAdjustments: (draft.commitmentScoreAdjustments || []).filter(
          (adjustment) => !playerIds.has(adjustment.playerId)
        ),
        scoreOverrides: (draft.scoreOverrides || []).filter(
          (override) => !playerIds.has(override.playerId)
        ),
        plan: {
          ...(draft.plan || {}),
          playerOverrides: (draft.plan?.playerOverrides || []).filter(
            (rule) => !playerIds.has(rule.playerId)
          ),
          instructions: (draft.plan?.instructions || []).filter(
            (rule) => !playerIds.has(rule.playerId)
          ),
          rotations: (draft.plan?.rotations || []).filter(
            (rotation) => !playerIds.has(rotation.playerId)
          ),
        },
        revision: Number(draft.revision || 0) + 1,
      };
      for (const [teamId, team] of teams) {
        if (!team.seats.some((seat) => playerIds.has(seat.playerId))) continue;
        teams.set(teamId, {
          ...team,
          revision: Number(team.revision || 0) + 1,
          captainId: playerIds.has(team.captainId) ? '' : team.captainId,
          seats: team.seats.map((seat) =>
            playerIds.has(seat.playerId)
              ? {
                  ...seat,
                  playerId: '',
                  displayName: '',
                  locked: false,
                  score: null,
                  totalCastlePower: null,
                }
              : seat
          ),
        });
      }
      return { uid, deleted: true };
    },
    async getDraft() {
      return clone(draft);
    },
    subscribeDraft(next) {
      draftListeners.add(next);
      return () => draftListeners.delete(next);
    },
    async saveDraft(input, options) {
      draft = revisionedSave(draft, input, options.expectedRevision);
      return clone(draft);
    },
    async getDraftTeam(teamId) {
      return clone(teams.get(teamId) || null);
    },
    subscribeDraftTeam(teamId, next) {
      if (!teamListeners.has(teamId)) teamListeners.set(teamId, new Set());
      const listeners = teamListeners.get(teamId);
      listeners.add(next);
      return () => listeners.delete(next);
    },
    async saveDraftTeam(teamId, input, options) {
      singleTeamSaveCount += 1;
      const saved = revisionedSave(teams.get(teamId), input, options.expectedRevision);
      teams.set(teamId, saved);
      return clone(saved);
    },
    async saveDraftBundle(bundle, options) {
      bundleAttempts.push({ bundle: clone(bundle), options: clone(options) });
      for (const [uid, expectedRevision] of options.expectedSubmissionRevisions || []) {
        const actual = Number(
          submissions.find((submission) => submission.uid === uid)?.revision || 0
        );
        if (actual !== Number(expectedRevision)) throw conflictError(expectedRevision, actual);
      }
      for (const [
        uid,
        expectedRevision,
        expectedSubmissionRevision,
      ] of options.expectedReviewRevisions || []) {
        const review = reviews.get(uid);
        const actual = Number(review?.revision || 0);
        if (actual !== Number(expectedRevision)) throw conflictError(expectedRevision, actual);
        const actualSubmissionRevision = Number(review?.submissionRevision || 0);
        if (actualSubmissionRevision !== Number(expectedSubmissionRevision)) {
          throw conflictError(expectedSubmissionRevision, actualSubmissionRevision);
        }
      }
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
        Object.fromEntries(draft.teamIds.map((teamId) => [teamId, teams.get(teamId).revision]))
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

function storedCalculatedScore(entry, overrides = {}) {
  return {
    profileId: entry.score.profileId,
    profileVersion: entry.score.profileVersion,
    precision: entry.score.precision,
    total: entry.calculatedScore,
    breakdown: clone(entry.scoreBreakdown),
    ...overrides,
  };
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

test('dynamic balance preview is pure, honors power metric and forced teams, then applies atomically once', async () => {
  const teamCount = 2;
  const fieldSize = teamCount * 12;
  const draft = {
    ...createInitialDraft(fieldSize),
    teamCount,
    balanceMetric: 'totalPower',
    teamIds: TEAM_IDS.slice(0, teamCount),
    playerIds: Array.from({ length: fieldSize }, (_, index) => playerId(index)),
    forcedTeamAssignments: [{ playerId: 'player-07', teamId: 'team-2' }],
  };
  const primitiveStore = createPrimitiveStoreFixture({ playerCount: fieldSize, draft });
  const adapter = createAdminAllStarBohStoreAdapter(primitiveStore);
  let snapshot = await adapter.start();

  const previewed = await dispatch(adapter, snapshot, 'previewBalanceTeams');
  snapshot = previewed.snapshot;
  assert.equal(primitiveStore.bundleCalls.length, 0);
  assert.equal(snapshot.event.teamCount, teamCount);
  assert.equal(snapshot.event.fieldSize, fieldSize);
  assert.equal(snapshot.balancePreview.balanceMetric, 'totalPower');
  assert.equal(snapshot.balancePreview.teams.length, teamCount);
  assert.ok(snapshot.balancePreview.teams.every((team) => team.seats.length === 12));
  assert.ok(snapshot.balancePreview.teams.every((team) => team.totalCastlePower > 0));
  const forcedSeat = snapshot.balancePreview.teams
    .find((team) => team.id === 'team-2')
    .seats.find((candidate) => candidate.playerId === 'player-07');
  assert.ok(forcedSeat);
  assert.equal(forcedSeat.locked, false);
  const previewTeams = clone(snapshot.balancePreview.teams);

  snapshot = (await dispatch(adapter, snapshot, 'applyBalancePreview')).snapshot;
  assert.equal(primitiveStore.bundleCalls.length, 1);
  assert.deepEqual(Object.keys(primitiveStore.bundleCalls[0].bundle.teams).sort(), [
    'team-1',
    'team-2',
  ]);
  assert.equal(primitiveStore.bundleCalls[0].bundle.draft.teamCount, teamCount);
  assert.equal(primitiveStore.bundleCalls[0].bundle.draft.balanceMetric, 'totalPower');
  assert.equal(primitiveStore.bundleCalls[0].options.expectedDraftRevision, 0);
  assert.deepEqual(primitiveStore.bundleCalls[0].options.expectedTeamRevisions, {
    'team-1': 0,
    'team-2': 0,
  });
  assert.deepEqual(
    primitiveStore.bundleCalls[0].bundle.teams,
    Object.fromEntries(previewTeams.map((team) => [team.id, team]))
  );
  assert.equal(snapshot.balancePreview, null);
  await assert.rejects(
    dispatch(adapter, snapshot, 'applyBalancePreview'),
    (error) => error.code === 'all-star-boh-preview-stale'
  );
  assert.equal(primitiveStore.bundleCalls.length, 1);
  adapter.stop();
});

test('dynamic balance preview preserves balanced metric through settings, preview, and apply', async () => {
  const teamCount = 2;
  const fieldSize = teamCount * 12;
  const draft = {
    ...createInitialDraft(fieldSize),
    teamCount,
    balanceMetric: 'balanced',
    teamIds: TEAM_IDS.slice(0, teamCount),
    playerIds: Array.from({ length: fieldSize }, (_, index) => playerId(index)),
  };
  const primitiveStore = createPrimitiveStoreFixture({ playerCount: fieldSize, draft });
  const adapter = createAdminAllStarBohStoreAdapter(primitiveStore);
  let snapshot = await adapter.start();

  assert.equal(snapshot.event.balanceMetric, 'balanced');
  snapshot = (await dispatch(adapter, snapshot, 'previewBalanceTeams')).snapshot;
  assert.equal(snapshot.balancePreview.balanceMetric, 'balanced');
  assert.equal(snapshot.balancePreview.settings.balanceMetric, 'balanced');
  assert.ok(snapshot.balancePreview.scoreSpread >= 0);
  assert.ok(snapshot.balancePreview.powerSpread >= 0);
  assert.ok(snapshot.balancePreview.teams.every((team) => team.scoreTotal > 0));
  assert.ok(snapshot.balancePreview.teams.every((team) => team.totalCastlePower > 0));

  snapshot = (await dispatch(adapter, snapshot, 'applyBalancePreview')).snapshot;
  assert.equal(primitiveStore.bundleCalls.at(-1).bundle.draft.balanceMetric, 'balanced');
  assert.equal(snapshot.event.balanceMetric, 'balanced');
  adapter.stop();
});

test('balance preview rejects a changed live source without writing', async () => {
  const primitiveStore = createPrimitiveStoreFixture();
  const adapter = createAdminAllStarBohStoreAdapter(primitiveStore);
  let snapshot = await adapter.start();
  snapshot = (await dispatch(adapter, snapshot, 'previewBalanceTeams')).snapshot;
  primitiveStore.bumpTeamRevision('team-1');

  await assert.rejects(
    dispatch(adapter, snapshot, 'applyBalancePreview'),
    (error) => error.code === 'all-star-boh-preview-stale'
  );
  assert.equal(primitiveStore.bundleCalls.length, 0);
  adapter.stop();
});

test('stale balance rejection invalidates prior publish readiness', async () => {
  const { adapter, primitiveStore } = await createBalancedFixture();
  let snapshot = adapter.getSnapshot();
  snapshot = (await dispatch(adapter, snapshot, 'validateRevision')).snapshot;
  assert.equal(snapshot.validation.announcement.valid, true);
  const validatedRevision = snapshot.revision;
  const teamRevision = snapshot.documentRevisions.teams['team-1'];
  const bundleCount = primitiveStore.bundleCalls.length;

  snapshot = (await dispatch(adapter, snapshot, 'previewBalanceTeams')).snapshot;
  primitiveStore.bumpTeamRevision('team-1');
  await assert.rejects(
    dispatch(adapter, snapshot, 'applyBalancePreview'),
    (error) => error.code === 'all-star-boh-preview-stale'
  );

  const refreshed = adapter.getSnapshot();
  assert.equal(refreshed.revision, validatedRevision + 1);
  assert.deepEqual(refreshed.validation, {});
  assert.equal(refreshed.documentRevisions.teams['team-1'], teamRevision + 1);
  assert.equal(primitiveStore.bundleCalls.length, bundleCount);
  await assert.rejects(
    dispatch(adapter, refreshed, 'publishAnnouncement'),
    (error) => error.code === 'all-star-boh-publish-not-validated'
  );
  adapter.stop();
});

test('balance preview translates an atomic-write race into a stale preview', async () => {
  const primitiveStore = createPrimitiveStoreFixture();
  const saveDraftBundle = primitiveStore.saveDraftBundle.bind(primitiveStore);
  const adapter = createAdminAllStarBohStoreAdapter(primitiveStore);
  let snapshot = await adapter.start();
  snapshot = (await dispatch(adapter, snapshot, 'previewBalanceTeams')).snapshot;
  const previewRevision = snapshot.revision;
  primitiveStore.saveDraftBundle = async (...args) => {
    primitiveStore.bumpTeamRevision('team-1');
    return saveDraftBundle(...args);
  };

  await assert.rejects(
    dispatch(adapter, snapshot, 'applyBalancePreview'),
    (error) => error.code === 'all-star-boh-preview-stale'
  );
  const refreshed = adapter.getSnapshot();
  assert.equal(refreshed.balancePreview, null);
  assert.equal(refreshed.revision, previewRevision + 1);
  assert.equal(refreshed.documentRevisions.teams['team-1'], 1);
  assert.deepEqual(refreshed.validation, {});
  assert.equal(primitiveStore.bundleAttempts.length, 1);
  assert.equal(primitiveStore.bundleCalls.length, 0);
  adapter.stop();
});

test('balance preview source guards reject submission and review races without bundle writes', async () => {
  for (const sourceKind of ['submission', 'review']) {
    const primitiveStore = createPrimitiveStoreFixture();
    const saveDraftBundle = primitiveStore.saveDraftBundle.bind(primitiveStore);
    const adapter = createAdminAllStarBohStoreAdapter(primitiveStore);
    let snapshot = await adapter.start();
    snapshot = (await dispatch(adapter, snapshot, 'previewBalanceTeams')).snapshot;
    const originalDraft = clone(primitiveStore.draft);
    const originalTeams = Object.fromEntries(
      TEAM_IDS.map((teamId) => [teamId, clone(primitiveStore.teams.get(teamId))])
    );
    primitiveStore.saveDraftBundle = async (...args) => {
      if (sourceKind === 'submission') primitiveStore.bumpSubmissionRevision('player-02');
      else primitiveStore.bumpReviewRevision('player-02');
      return saveDraftBundle(...args);
    };

    await assert.rejects(
      dispatch(adapter, snapshot, 'applyBalancePreview'),
      (error) => error?.code === 'all-star-boh-preview-stale'
    );
    assert.equal(primitiveStore.bundleAttempts.length, 1, sourceKind);
    assert.equal(primitiveStore.bundleCalls.length, 0, sourceKind);
    assert.deepEqual(primitiveStore.draft, originalDraft, sourceKind);
    assert.deepEqual(
      Object.fromEntries(TEAM_IDS.map((teamId) => [teamId, primitiveStore.teams.get(teamId)])),
      originalTeams,
      sourceKind
    );
    adapter.stop();
  }
});

test('balance conflicts stay stale-preview errors when the best-effort refresh fails', async () => {
  const primitiveStore = createPrimitiveStoreFixture();
  const saveDraftBundle = primitiveStore.saveDraftBundle.bind(primitiveStore);
  const adapter = createAdminAllStarBohStoreAdapter(primitiveStore);
  let snapshot = await adapter.start();
  snapshot = (await dispatch(adapter, snapshot, 'previewBalanceTeams')).snapshot;
  primitiveStore.saveDraftBundle = async (...args) => {
    primitiveStore.bumpTeamRevision('team-1');
    primitiveStore.getDraft = async () => {
      throw new Error('fixture refresh failure');
    };
    return saveDraftBundle(...args);
  };

  await assert.rejects(
    dispatch(adapter, snapshot, 'applyBalancePreview'),
    (error) =>
      error?.code === 'all-star-boh-preview-stale' &&
      error?.cause?.message === 'fixture refresh failure'
  );
  assert.equal(adapter.getSnapshot().balancePreview, null);
  assert.equal(primitiveStore.bundleAttempts.length, 1);
  assert.equal(primitiveStore.bundleCalls.length, 0);
  adapter.stop();
});

test('team builder settings save independently with stable forced placements', async () => {
  const playerIds = Array.from({ length: 72 }, (_, index) => playerId(index));
  const primitiveStore = createPrimitiveStoreFixture({
    playerCount: 73,
    draft: { ...createInitialDraft(72), playerIds },
  });
  const adapter = createAdminAllStarBohStoreAdapter(primitiveStore);
  let snapshot = await adapter.start();

  snapshot = (
    await dispatch(adapter, snapshot, 'saveTeamBuilderSettings', {
      teamCount: 6,
      balanceMetric: 'totalPower',
      forcedTeamAssignments: [
        { playerId: 'player-07', teamId: 'team-2' },
        { playerId: 'player-07', teamId: 'team-2' },
      ],
    })
  ).snapshot;

  assert.equal(snapshot.event.teamCount, 6);
  assert.equal(snapshot.event.balanceMetric, 'totalPower');
  assert.deepEqual(snapshot.eligiblePlayerIds, playerIds);
  assert.deepEqual(snapshot.forcedTeamAssignments, [{ playerId: 'player-07', teamId: 'team-2' }]);
  assert.deepEqual(primitiveStore.draft.playerIds, playerIds);

  await assert.rejects(
    dispatch(adapter, snapshot, 'saveEligiblePool', {
      playerIds: [...playerIds.filter((id) => id !== 'player-07'), 'player-73'],
    }),
    (error) => error.code === 'all-star-boh-selection-forced-player'
  );
  assert.deepEqual(primitiveStore.draft.playerIds, playerIds);
  adapter.stop();
});

test('shrinking clears removed teams atomically so expansion cannot resurrect players', async () => {
  const primitiveStore = createPrimitiveStoreFixture();
  for (const teamId of TEAM_IDS.slice(2)) {
    const team = primitiveStore.teams.get(teamId);
    team.seats = team.seats.map((seatEntry) => ({ ...seatEntry, locked: false }));
  }
  const removedPlayerIds = TEAM_IDS.slice(2).flatMap((teamId) =>
    primitiveStore.teams
      .get(teamId)
      .seats.map((seatEntry) => seatEntry.playerId)
      .filter(Boolean)
  );
  const teamMetadata = Object.fromEntries(
    TEAM_IDS.map((teamId) => {
      const team = primitiveStore.teams.get(teamId);
      return [teamId, { name: team.name, number: team.number }];
    })
  );
  const adapter = createAdminAllStarBohStoreAdapter(primitiveStore);
  let snapshot = await adapter.start();
  const eligiblePlayerIds = snapshot.eligiblePlayerIds;
  assert.deepEqual(primitiveStore.activeTeamSubscriberIds, TEAM_IDS);

  await primitiveStore.saveDraft(primitiveStore.draft, { expectedRevision: 0 });
  primitiveStore.bumpTeamRevision('team-3');
  snapshot = (
    await dispatch(adapter, snapshot, 'saveTeamBuilderSettings', {
      teamCount: 2,
      balanceMetric: 'score',
      forcedTeamAssignments: [],
    })
  ).snapshot;

  assert.equal(snapshot.event.teamCount, 2);
  assert.equal(snapshot.teams.length, 2);
  assert.equal(primitiveStore.bundleCalls.length, 1);
  assert.equal(primitiveStore.singleTeamSaveCount, 0);
  const shrink = primitiveStore.bundleCalls[0];
  assert.equal(shrink.options.expectedDraftRevision, 1);
  assert.deepEqual(
    shrink.options.expectedTeamRevisions,
    Object.fromEntries(TEAM_IDS.map((teamId) => [teamId, teamId === 'team-3' ? 1 : 0]))
  );
  assert.deepEqual(Object.keys(shrink.bundle.teams).sort(), TEAM_IDS);
  assert.deepEqual(shrink.bundle.draft.teamIds, TEAM_IDS.slice(0, 2));
  assert.deepEqual(primitiveStore.draft.teamIds, TEAM_IDS.slice(0, 2));
  assert.equal(primitiveStore.draft.revision, 2);
  assert.deepEqual(primitiveStore.activeTeamSubscriberIds, TEAM_IDS.slice(0, 2));
  assert.deepEqual(snapshot.eligiblePlayerIds, eligiblePlayerIds);
  assert.deepEqual(
    shrink.bundle.teams['team-1'].seats.map((seatEntry) => seatEntry.playerId).filter(Boolean),
    ['player-01', 'player-07']
  );
  assert.ok(
    TEAM_IDS.slice(2)
      .map((teamId) => shrink.bundle.teams[teamId])
      .every(
        (team) =>
          team.captainId === '' &&
          team.scoreTotal === 0 &&
          team.scoreAverage === 0 &&
          team.balanceTotal === 0 &&
          team.totalCastlePower === 0 &&
          team.seats.every(
            (seatEntry) =>
              !seatEntry.playerId &&
              !seatEntry.displayName &&
              seatEntry.locked === false &&
              seatEntry.score === 0 &&
              seatEntry.totalCastlePower === 0
          )
      )
  );
  assert.ok(
    TEAM_IDS.every((teamId) => {
      const team = primitiveStore.teams.get(teamId);
      return team.name === teamMetadata[teamId].name && team.number === teamMetadata[teamId].number;
    })
  );
  assert.deepEqual(
    Object.fromEntries(
      TEAM_IDS.map((teamId) => [teamId, primitiveStore.teams.get(teamId).revision])
    ),
    Object.fromEntries(TEAM_IDS.map((teamId) => [teamId, teamId === 'team-3' ? 2 : 1]))
  );

  snapshot = (
    await dispatch(adapter, snapshot, 'saveTeamBuilderSettings', {
      teamCount: 6,
      balanceMetric: 'score',
      forcedTeamAssignments: [],
    })
  ).snapshot;
  assert.equal(primitiveStore.bundleCalls.length, 1, 'expansion needs no roster-clearing bundle');
  assert.equal(primitiveStore.bundleAttempts.length, 1);
  assert.equal(snapshot.teams.length, 6);
  assert.deepEqual(primitiveStore.activeTeamSubscriberIds, TEAM_IDS);
  assert.deepEqual(snapshot.eligiblePlayerIds, eligiblePlayerIds);
  assert.equal(
    snapshot.teams
      .slice(2)
      .flatMap((team) => team.seats)
      .some((seatEntry) => removedPlayerIds.includes(seatEntry.playerId)),
    false
  );
  assert.ok(
    TEAM_IDS.slice(2).every((teamId) =>
      primitiveStore.teams.get(teamId).seats.every((seatEntry) => !seatEntry.playerId)
    )
  );

  snapshot = (await dispatch(adapter, snapshot, 'previewBalanceTeams')).snapshot;
  const previewRevision = snapshot.revision;
  const preview = clone(snapshot.balancePreview);
  primitiveStore.emitDraft();
  primitiveStore.emitTeam('team-3');
  primitiveStore.emitDraft({ ...primitiveStore.draft, revision: 1, teamCount: 2 });
  primitiveStore.emitTeam('team-3', {
    ...primitiveStore.teams.get('team-3'),
    revision: 0,
    seats: [{ seatNumber: 1, playerId: 'player-03', locked: false }],
  });
  assert.equal(adapter.getSnapshot().revision, previewRevision);
  assert.deepEqual(adapter.getSnapshot().balancePreview, preview);
  adapter.stop();
});

test('shrink validation adopts fresh locked-team revisions before rejecting', async () => {
  const primitiveStore = createPrimitiveStoreFixture();
  const adapter = createAdminAllStarBohStoreAdapter(primitiveStore);
  let snapshot = await adapter.start();
  snapshot = (await dispatch(adapter, snapshot, 'validateRevision')).snapshot;
  const validatedRevision = snapshot.revision;
  primitiveStore.bumpTeamRevision('team-3');

  await assert.rejects(
    dispatch(adapter, snapshot, 'saveTeamBuilderSettings', {
      teamCount: 2,
      balanceMetric: 'score',
      forcedTeamAssignments: [],
    }),
    (error) => error?.code === 'all-star-boh-team-count-locked-player'
  );

  const refreshed = adapter.getSnapshot();
  assert.equal(refreshed.revision, validatedRevision + 1);
  assert.equal(refreshed.documentRevisions.teams['team-3'], 1);
  assert.deepEqual(refreshed.validation, {});
  assert.deepEqual(primitiveStore.activeTeamSubscriberIds, TEAM_IDS);
  assert.equal(primitiveStore.bundleAttempts.length, 0);
  adapter.stop();
});

test('shrink CAS guards retained teams and rolls back the entire bundle on a race', async () => {
  const primitiveStore = createPrimitiveStoreFixture();
  for (const teamId of TEAM_IDS.slice(2)) {
    const team = primitiveStore.teams.get(teamId);
    team.seats = team.seats.map((seatEntry) => ({ ...seatEntry, locked: false }));
  }
  const originalDraft = clone(primitiveStore.draft);
  const originalRemovedTeams = Object.fromEntries(
    TEAM_IDS.slice(2).map((teamId) => [teamId, clone(primitiveStore.teams.get(teamId))])
  );
  const saveDraftBundle = primitiveStore.saveDraftBundle.bind(primitiveStore);
  const adapter = createAdminAllStarBohStoreAdapter(primitiveStore);
  const snapshot = await adapter.start();
  primitiveStore.saveDraftBundle = async (...args) => {
    primitiveStore.bumpTeamRevision('team-1');
    return saveDraftBundle(...args);
  };

  await assert.rejects(
    dispatch(adapter, snapshot, 'saveTeamBuilderSettings', {
      teamCount: 2,
      balanceMetric: 'score',
      forcedTeamAssignments: [],
    }),
    (error) => error?.code === 'all-star-boh-conflict'
  );

  assert.equal(primitiveStore.bundleAttempts.length, 1);
  assert.equal(primitiveStore.bundleCalls.length, 0);
  assert.deepEqual(primitiveStore.draft, originalDraft);
  assert.deepEqual(
    Object.fromEntries(
      TEAM_IDS.slice(2).map((teamId) => [teamId, primitiveStore.teams.get(teamId)])
    ),
    originalRemovedTeams
  );
  const refreshed = adapter.getSnapshot();
  assert.equal(refreshed.event.teamCount, 6);
  assert.equal(refreshed.documentRevisions.teams['team-1'], 1);
  assert.equal(refreshed.revision, snapshot.revision + 1);
  assert.deepEqual(refreshed.validation, {});
  assert.deepEqual(primitiveStore.activeTeamSubscriberIds, TEAM_IDS);
  adapter.stop();
});

test('manual refresh reconciles subscriptions after an external team-count change', async () => {
  const primitiveStore = createPrimitiveStoreFixture();
  const adapter = createAdminAllStarBohStoreAdapter(primitiveStore);
  await adapter.start();

  await primitiveStore.saveDraft(
    { ...primitiveStore.draft, teamCount: 2, teamIds: TEAM_IDS.slice(0, 2) },
    { expectedRevision: 0 }
  );
  let snapshot = await adapter.refresh();
  assert.equal(snapshot.event.teamCount, 2);
  assert.deepEqual(primitiveStore.activeTeamSubscriberIds, TEAM_IDS.slice(0, 2));

  await primitiveStore.saveDraft(
    { ...primitiveStore.draft, teamCount: 6, teamIds: TEAM_IDS },
    { expectedRevision: 1 }
  );
  snapshot = await adapter.refresh();
  assert.equal(snapshot.event.teamCount, 6);
  assert.deepEqual(primitiveStore.activeTeamSubscriberIds, TEAM_IDS);
  adapter.stop();
});

test('batch confirmation returns a structured full-success summary through dispatch', async () => {
  const primitiveStore = createPrimitiveStoreFixture();
  const adapter = createAdminAllStarBohStoreAdapter(primitiveStore);
  const snapshot = await adapter.start();

  const result = await dispatch(adapter, snapshot, 'batchReviewSubmissions', {
    playerIds: ['player-01', 'player-02'],
    status: 'confirmed',
  });

  assert.deepEqual(result.result, {
    successfulPlayerIds: ['player-01', 'player-02'],
    failedPlayerIds: [],
    failedPlayers: [],
  });
  assert.equal(result.snapshot.revision, snapshot.revision + 2);
  adapter.stop();
});

test('batch confirmation refreshes and saves sequentially while retaining partial successes', async () => {
  const primitiveStore = createPrimitiveStoreFixture();
  const callOrder = [];
  const listSubmissions = primitiveStore.listSubmissions.bind(primitiveStore);
  const getReview = primitiveStore.getReview.bind(primitiveStore);
  const saveReview = primitiveStore.saveReview.bind(primitiveStore);
  primitiveStore.listSubmissions = async () => {
    callOrder.push('list');
    return listSubmissions();
  };
  primitiveStore.getReview = async (uid) => {
    callOrder.push(`review:${uid}`);
    return getReview(uid);
  };
  primitiveStore.saveReview = async (uid, input, options) => {
    callOrder.push(`save:${uid}`);
    if (uid === 'player-02') throw new Error('fixture review failure');
    return saveReview(uid, input, options);
  };
  const adapter = createAdminAllStarBohStoreAdapter(primitiveStore);
  const snapshot = await adapter.start();
  callOrder.length = 0;

  let partialFailure;
  try {
    await dispatch(adapter, snapshot, 'batchReviewSubmissions', {
      playerIds: ['player-01', 'player-02', 'player-03'],
      status: 'confirmed',
    });
  } catch (error) {
    partialFailure = error;
  }

  assert.equal(partialFailure?.code, 'all-star-boh-batch-partial');
  assert.deepEqual(partialFailure.successfulPlayerIds, ['player-01', 'player-03']);
  assert.deepEqual(partialFailure.failedPlayerIds, ['player-02']);
  assert.deepEqual(partialFailure.failedPlayers, ['Player 02']);
  assert.deepEqual(callOrder, [
    'list',
    'review:firebase-uid-01',
    'save:firebase-uid-01',
    'list',
    'review:player-02',
    'save:player-02',
    'list',
    'review:player-03',
    'save:player-03',
  ]);
  assert.equal((await primitiveStore.getReview('firebase-uid-01')).revision, 1);
  assert.equal((await primitiveStore.getReview('player-02')).revision, 0);
  assert.equal((await primitiveStore.getReview('player-03')).revision, 1);
  adapter.stop();
});

test('new submission revisions never inherit corrections or usefulness across correction-only, single, and batch review saves', async () => {
  const primitiveStore = createPrimitiveStoreFixture();
  const adapter = createAdminAllStarBohStoreAdapter(primitiveStore);
  let snapshot = await adapter.start();
  const originalDragonPower = snapshot.submissions.find((item) => item.playerId === 'player-01')
    .stats.dragonPower;
  const oldCorrection = {
    reason: 'Revision one audit',
    values: {
      gameName: 'Revision One Name',
      stats: { dragonPower: 123 },
    },
  };

  snapshot = (
    await dispatch(adapter, snapshot, 'reviewSubmission', {
      playerId: 'player-01',
      status: 'confirmed',
      note: 'Revision one player feedback',
      internalNote: 'Private review history',
      adminUsefulnessRating: 9,
      submissionCorrection: oldCorrection,
    })
  ).snapshot;
  snapshot = (
    await dispatch(adapter, snapshot, 'reviewSubmission', {
      playerId: 'player-01',
      status: 'confirmed',
    })
  ).snapshot;
  let savedReview = await primitiveStore.getReview('firebase-uid-01');
  assert.equal(savedReview.note, 'Revision one player feedback');
  assert.equal(savedReview.internalNote, 'Private review history');
  primitiveStore.bumpSubmissionRevision('firebase-uid-01');
  snapshot = await adapter.refresh();
  assert.equal(
    snapshot.submissions.find((item) => item.playerId === 'player-01').reviewStatus,
    'pending'
  );

  snapshot = (
    await dispatch(adapter, snapshot, 'reviewSubmission', {
      playerId: 'player-01',
      status: 'pending',
      submissionCorrection: {
        reason: 'Current locale audit',
        values: { locale: 'fr' },
      },
    })
  ).snapshot;
  savedReview = await primitiveStore.getReview('firebase-uid-01');
  let effective = snapshot.submissions.find((item) => item.playerId === 'player-01');
  assert.equal(savedReview.status, 'pending');
  assert.equal(savedReview.note, '');
  assert.equal(savedReview.internalNote, 'Private review history');
  assert.equal(savedReview.adjustments.bohUsefulRating, null);
  assert.deepEqual(savedReview.statCorrections, {});
  assert.equal(savedReview.gameNameCorrection, undefined);
  assert.deepEqual(savedReview.submissionCorrection.values, { locale: 'fr' });
  assert.equal(effective.gameName, 'Player 01');
  assert.equal(effective.stats.dragonPower, originalDragonPower);
  assert.equal(effective.locale, 'fr');

  primitiveStore.bumpSubmissionRevision('firebase-uid-01');
  snapshot = await adapter.refresh();
  snapshot = (
    await dispatch(adapter, snapshot, 'reviewSubmission', {
      playerId: 'player-01',
      status: 'confirmed',
    })
  ).snapshot;
  savedReview = await primitiveStore.getReview('firebase-uid-01');
  assert.equal(savedReview.status, 'verified');
  assert.equal(savedReview.note, '');
  assert.equal(savedReview.internalNote, 'Private review history');
  assert.equal(savedReview.adjustments.bohUsefulRating, null);
  assert.deepEqual(savedReview.statCorrections, {});
  assert.equal(savedReview.gameNameCorrection, undefined);
  assert.equal(savedReview.submissionCorrection, null);

  snapshot = (
    await dispatch(adapter, snapshot, 'reviewSubmission', {
      playerId: 'player-01',
      status: 'confirmed',
      note: 'Revision three player feedback',
      adminUsefulnessRating: 7,
      submissionCorrection: oldCorrection,
    })
  ).snapshot;
  primitiveStore.bumpSubmissionRevision('firebase-uid-01');
  snapshot = await adapter.refresh();
  snapshot = (
    await dispatch(adapter, snapshot, 'batchReviewSubmissions', {
      playerIds: ['player-01'],
      status: 'confirmed',
    })
  ).snapshot;
  savedReview = await primitiveStore.getReview('firebase-uid-01');
  effective = snapshot.submissions.find((item) => item.playerId === 'player-01');
  assert.equal(savedReview.status, 'verified');
  assert.equal(savedReview.note, '');
  assert.equal(savedReview.internalNote, 'Private review history');
  assert.equal(savedReview.adjustments.bohUsefulRating, null);
  assert.deepEqual(savedReview.statCorrections, {});
  assert.equal(savedReview.gameNameCorrection, undefined);
  assert.equal(savedReview.submissionCorrection, null);
  assert.equal(effective.reviewStatus, 'confirmed');
  assert.equal(effective.gameName, 'Player 01');
  assert.equal(effective.stats.dragonPower, originalDragonPower);
  adapter.stop();
});

test('batch deletion returns a structured full-success summary and removes every requested signup', async () => {
  const primitiveStore = createPrimitiveStoreFixture();
  const adapter = createAdminAllStarBohStoreAdapter(primitiveStore);
  const snapshot = await adapter.start();

  const result = await dispatch(adapter, snapshot, 'batchDeleteSubmissions', {
    playerIds: ['player-01', 'player-02'],
  });

  assert.deepEqual(result.result, {
    successfulPlayerIds: ['player-01', 'player-02'],
    failedPlayerIds: [],
    failedPlayers: [],
  });
  assert.equal(result.snapshot.revision, snapshot.revision + 2);
  assert.deepEqual(
    (await primitiveStore.listSubmissions()).map((submission) => submission.playerId).slice(0, 2),
    ['player-03', 'player-04']
  );
  adapter.stop();
});

test('deleting a signup immediately removes every draft and team reference from later snapshots', async () => {
  const draft = {
    ...createInitialDraft(),
    forcedTeamAssignments: [{ playerId: 'player-01', teamId: 'team-1' }],
    commitmentScoreAdjustments: [{ playerId: 'player-01', score: 250, reason: 'Committed' }],
    scoreOverrides: [{ playerId: 'player-01', score: 999, reason: 'Legacy' }],
  };
  const primitiveStore = createPrimitiveStoreFixture({ draft });
  const adapter = createAdminAllStarBohStoreAdapter(primitiveStore);
  let snapshot = await adapter.start();

  snapshot = (await dispatch(adapter, snapshot, 'deleteSubmission', { playerId: 'player-01' }))
    .snapshot;
  assert.equal(
    snapshot.submissions.some((item) => item.playerId === 'player-01'),
    false
  );
  assert.equal(snapshot.eligiblePlayerIds.includes('player-01'), false);
  assert.equal(
    snapshot.forcedTeamAssignments.some((item) => item.playerId === 'player-01'),
    false
  );
  assert.equal(
    snapshot.scores.some((item) => item.playerId === 'player-01'),
    false
  );
  assert.equal(
    snapshot.teams.some((team) => team.seats.some((seat) => seat.playerId === 'player-01')),
    false
  );
  const vacatedSeat = snapshot.teams
    .find((team) => team.id === 'team-1')
    .seats.find((seat) => seat.seatNumber === 1);
  assert.equal(vacatedSeat.playerId, '');
  assert.equal(vacatedSeat.displayName, '');
  assert.equal(vacatedSeat.locked, false);
  assert.equal(vacatedSeat.score, 0);
  assert.equal(vacatedSeat.totalCastlePower, 0);

  const refreshed = await adapter.refresh();
  assert.equal(refreshed.eligiblePlayerIds.includes('player-01'), false);
  assert.equal(
    refreshed.forcedTeamAssignments.some((item) => item.playerId === 'player-01'),
    false
  );
  assert.equal(
    refreshed.teams.some((team) => team.seats.some((seat) => seat.playerId === 'player-01')),
    false
  );
  adapter.stop();
});

test('batch deletion refreshes revisions sequentially, continues after failure, and retains successes', async () => {
  const primitiveStore = createPrimitiveStoreFixture();
  const adapter = createAdminAllStarBohStoreAdapter(primitiveStore);
  const snapshot = await adapter.start();
  const callOrder = [];
  const listSubmissions = primitiveStore.listSubmissions.bind(primitiveStore);
  const deleteSubmission = primitiveStore.deleteSubmission.bind(primitiveStore);
  let listCount = 0;
  primitiveStore.bumpSubmissionRevision('firebase-uid-01');
  primitiveStore.listSubmissions = async () => {
    listCount += 1;
    if (listCount === 2) primitiveStore.bumpSubmissionRevision('player-02');
    if (listCount === 3) primitiveStore.bumpSubmissionRevision('player-03');
    callOrder.push('list');
    return listSubmissions();
  };
  primitiveStore.deleteSubmission = async (uid, options) => {
    callOrder.push(`delete:${uid}:${options.expectedRevision}`);
    if (uid === 'player-02') throw new Error('fixture delete failure');
    return deleteSubmission(uid, options);
  };

  let partialFailure;
  try {
    await dispatch(adapter, snapshot, 'batchDeleteSubmissions', {
      playerIds: ['player-01', 'player-02', 'player-03'],
    });
  } catch (error) {
    partialFailure = error;
  }

  assert.equal(partialFailure?.code, 'all-star-boh-batch-delete-partial');
  assert.deepEqual(partialFailure?.successfulPlayerIds, ['player-01', 'player-03']);
  assert.deepEqual(partialFailure?.failedPlayerIds, ['player-02']);
  assert.deepEqual(partialFailure?.failedPlayers, ['Player 02']);
  assert.deepEqual(callOrder, [
    'list',
    'delete:firebase-uid-01:2',
    'list',
    'delete:player-02:2',
    'list',
    'delete:player-03:2',
  ]);
  assert.deepEqual(
    adapter
      .getSnapshot()
      .submissions.map((submission) => submission.playerId)
      .slice(0, 2),
    ['player-02', 'player-04']
  );
  adapter.stop();
});

test('batch deletion preflights every required primitive before the first delete', async () => {
  const primitiveStore = createPrimitiveStoreFixture();
  const adapter = createAdminAllStarBohStoreAdapter(primitiveStore);
  const snapshot = await adapter.start();
  let deleteCalls = 0;
  primitiveStore.listSubmissions = undefined;
  primitiveStore.deleteSubmission = async () => {
    deleteCalls += 1;
  };

  await assert.rejects(
    dispatch(adapter, snapshot, 'batchDeleteSubmissions', { playerIds: ['player-01'] }),
    (error) => error?.code === 'all-star-boh-action-unavailable'
  );
  assert.equal(deleteCalls, 0);
  adapter.stop();
});

test('score audit sorting is stable, numeric, locale-aware, and keeps missing values last', () => {
  const players = [
    {
      playerId: 'charlie',
      displayName: 'Charlie',
      totalCastlePower: 300,
      calculatedScore: 20,
      overrideScore: null,
      commitmentScore: 10,
      finalScore: 30,
      breakdownText: 'Zulu',
    },
    {
      playerId: 'alpha',
      displayName: 'alpha',
      stats: { totalCastlePower: 100 },
      calculatedScore: 10,
      overrideScore: 50,
      commitmentScore: null,
      finalScore: 40,
      breakdownText: 'Bravo',
    },
    {
      playerId: 'bravo',
      displayName: 'Bravo',
      stats: { totalPower: 200 },
      calculatedScore: 20,
      overrideScore: 25,
      commitmentScore: 5,
      finalScore: 20,
      breakdownText: 'Alpha',
    },
    {
      playerId: 'missing',
      displayName: 'Missing',
      calculatedScore: 5,
      overrideScore: null,
      commitmentScore: null,
      finalScore: 10,
      breakdownText: '',
    },
  ];
  const ids = (sort) =>
    sortAdminScoreBreakdownRows(players, sort, {
      locale: 'en',
      breakdownText: (player) => player.breakdownText,
    }).map((player) => player.playerId);

  assert.deepEqual(ids({}), ['charlie', 'alpha', 'bravo', 'missing']);
  assert.deepEqual(ids({ key: 'player', direction: 'asc' }), [
    'alpha',
    'bravo',
    'charlie',
    'missing',
  ]);
  assert.deepEqual(ids({ key: 'totalPower', direction: 'asc' }), [
    'alpha',
    'bravo',
    'charlie',
    'missing',
  ]);
  assert.deepEqual(ids({ key: 'calculated', direction: 'desc' }), [
    'charlie',
    'bravo',
    'alpha',
    'missing',
  ]);
  assert.deepEqual(ids({ key: 'override', direction: 'desc' }), [
    'alpha',
    'bravo',
    'charlie',
    'missing',
  ]);
  assert.deepEqual(ids({ key: 'commitment', direction: 'desc' }), [
    'charlie',
    'bravo',
    'alpha',
    'missing',
  ]);
  assert.deepEqual(ids({ key: 'finalScore', direction: 'asc' }), [
    'missing',
    'bravo',
    'charlie',
    'alpha',
  ]);
  assert.deepEqual(ids({ key: 'breakdown', direction: 'asc' }), [
    'bravo',
    'alpha',
    'charlie',
    'missing',
  ]);
});

test('commitment scores batch-save additively, preserve legacy overrides, and materialize final scores', async () => {
  const draft = createInitialDraft();
  draft.scoreOverrides = [
    { playerId: 'player-01', score: 123_456, reason: 'Legacy exact replacement' },
  ];
  draft.commitmentScoreAdjustments = [
    { playerId: 'player-01', score: 75, reason: 'Initial leadership audit' },
  ];
  const primitiveStore = createPrimitiveStoreFixture({ draft });
  const adapter = createAdminAllStarBohStoreAdapter(primitiveStore);
  let snapshot = await adapter.start();
  const initialScores = new Map(snapshot.scores.map((entry) => [entry.playerId, entry]));
  const originalGetReview = primitiveStore.getReview.bind(primitiveStore);
  primitiveStore.getReview = async (uid) => {
    const review = await originalGetReview(uid);
    const playerIdValue = uid === 'firebase-uid-01' ? 'player-01' : uid;
    return {
      ...review,
      score: storedCalculatedScore(initialScores.get(playerIdValue)),
    };
  };
  snapshot = await adapter.refresh();

  const originalSaveDraft = primitiveStore.saveDraft.bind(primitiveStore);
  let saveDraftCalls = 0;
  primitiveStore.saveDraft = async (...args) => {
    saveDraftCalls += 1;
    return originalSaveDraft(...args);
  };
  const beforeRevision = primitiveStore.draft.revision;
  snapshot = (
    await dispatch(adapter, snapshot, 'saveCommitmentScores', {
      adjustments: [
        { playerId: 'player-01', score: '75' },
        { playerId: 'player-02', score: '250' },
        { playerId: 'player-03', score: null },
      ],
      reason: 'Second leadership audit',
    })
  ).snapshot;

  assert.equal(saveDraftCalls, 1);
  assert.equal(primitiveStore.draft.revision, beforeRevision + 1);
  assert.deepEqual(primitiveStore.draft.scoreOverrides, draft.scoreOverrides);
  assert.deepEqual(primitiveStore.draft.commitmentScoreAdjustments, [
    { playerId: 'player-01', score: 75, reason: 'Initial leadership audit' },
    { playerId: 'player-02', score: 250, reason: 'Second leadership audit' },
  ]);
  let playerOne = snapshot.scores.find((entry) => entry.playerId === 'player-01');
  let playerTwo = snapshot.scores.find((entry) => entry.playerId === 'player-02');
  assert.equal(playerOne.finalScore, 123_531);
  assert.equal(playerOne.score.total, playerOne.finalScore);
  assert.equal(playerOne.scoreDiagnostic, '');
  assert.deepEqual(
    {
      calculatedScore: snapshot.submissions[0].calculatedScore,
      overrideScore: snapshot.submissions[0].overrideScore,
      overrideReason: snapshot.submissions[0].overrideReason,
      commitmentScore: snapshot.submissions[0].commitmentScore,
      commitmentScoreReason: snapshot.submissions[0].commitmentScoreReason,
      finalScore: snapshot.submissions[0].finalScore,
      scoreTotal: snapshot.submissions[0].score.total,
      scoreDiagnostic: snapshot.submissions[0].scoreDiagnostic,
    },
    {
      calculatedScore: playerOne.calculatedScore,
      overrideScore: 123_456,
      overrideReason: 'Legacy exact replacement',
      commitmentScore: 75,
      commitmentScoreReason: 'Initial leadership audit',
      finalScore: playerOne.finalScore,
      scoreTotal: playerOne.finalScore,
      scoreDiagnostic: '',
    }
  );
  assert.equal(playerTwo.finalScore, playerTwo.calculatedScore + 250);
  assert.equal(playerTwo.commitmentScoreReason, 'Second leadership audit');
  assert.deepEqual(
    {
      calculatedScore: snapshot.submissions[1].calculatedScore,
      overrideScore: snapshot.submissions[1].overrideScore,
      commitmentScore: snapshot.submissions[1].commitmentScore,
      commitmentScoreReason: snapshot.submissions[1].commitmentScoreReason,
      finalScore: snapshot.submissions[1].finalScore,
      scoreDiagnostic: snapshot.submissions[1].scoreDiagnostic,
    },
    {
      calculatedScore: playerTwo.calculatedScore,
      overrideScore: null,
      commitmentScore: 250,
      commitmentScoreReason: 'Second leadership audit',
      finalScore: playerTwo.finalScore,
      scoreDiagnostic: '',
    }
  );

  snapshot = (
    await dispatch(adapter, snapshot, 'saveCommitmentScores', {
      adjustments: [
        { playerId: 'player-01', score: '' },
        { playerId: 'player-02', score: 300 },
        { playerId: 'player-03', score: 1 },
      ],
      reason: '',
    })
  ).snapshot;
  assert.equal(saveDraftCalls, 2);
  assert.deepEqual(primitiveStore.draft.commitmentScoreAdjustments, [
    { playerId: 'player-02', score: 300, reason: 'Commitment/usefulness assessment' },
    { playerId: 'player-03', score: 1, reason: 'Commitment/usefulness assessment' },
  ]);
  playerOne = snapshot.scores.find((entry) => entry.playerId === 'player-01');
  playerTwo = snapshot.scores.find((entry) => entry.playerId === 'player-02');
  assert.equal(playerOne.commitmentScore, null);
  assert.equal(playerOne.finalScore, 123_456);
  assert.equal(playerTwo.finalScore, playerTwo.calculatedScore + 300);

  for (const invalidScore of [0, 10_001, 1.5]) {
    await assert.rejects(
      dispatch(adapter, snapshot, 'saveCommitmentScores', {
        adjustments: [{ playerId: 'player-02', score: invalidScore }],
      }),
      (error) => error?.code === 'all-star-boh-commitment-score-invalid'
    );
  }
  await assert.rejects(
    dispatch(adapter, snapshot, 'saveCommitmentScores', {
      adjustments: [{ playerId: 'player-02', score: 300 }],
      reason: 'x'.repeat(2_001),
    }),
    (error) => error?.code === 'all-star-boh-commitment-score-reason-invalid'
  );
  assert.equal(saveDraftCalls, 2, 'invalid batches must not write the draft');

  const playerTwoPower = snapshot.submissions[1].stats.totalCastlePower;
  snapshot = (await dispatch(adapter, snapshot, 'balanceTeams')).snapshot;
  const materializedPlayerTwo = snapshot.teams
    .flatMap((team) => team.seats)
    .find((entry) => entry.playerId === 'player-02');
  playerTwo = snapshot.scores.find((entry) => entry.playerId === 'player-02');
  assert.equal(materializedPlayerTwo.score, playerTwo.finalScore);
  assert.equal(snapshot.submissions[1].stats.totalCastlePower, playerTwoPower);
  adapter.stop();
});

test('score diagnostics trust only fresh calculations and distinguish stale or unverifiable records', async () => {
  const primitiveStore = createPrimitiveStoreFixture();
  const adapter = createAdminAllStarBohStoreAdapter(primitiveStore);
  let snapshot = await adapter.start();
  assert.equal(snapshot.scores[0].scoreDiagnostic, 'unverifiable');
  assert.equal(snapshot.submissions[0].scoreDiagnostic, 'unverifiable');
  const baseline = new Map(snapshot.scores.map((entry) => [entry.playerId, entry]));
  const originalGetReview = primitiveStore.getReview.bind(primitiveStore);
  primitiveStore.getReview = async (uid) => {
    if (uid === 'player-02') return null;
    const review = await originalGetReview(uid);
    const playerIdValue = uid === 'firebase-uid-01' ? 'player-01' : uid;
    const score = baseline.get(playerIdValue);
    if (playerIdValue === 'player-01') {
      return {
        ...review,
        score: storedCalculatedScore(score, { total: score.calculatedScore + 1 }),
      };
    }
    if (playerIdValue === 'player-03') {
      return {
        ...review,
        score: storedCalculatedScore(score, { total: score.calculatedScore + 0.0004 }),
      };
    }
    if (playerIdValue === 'player-04') {
      return {
        ...review,
        score: storedCalculatedScore(score, { profileId: `${score.score.profileId}-old` }),
      };
    }
    if (playerIdValue === 'player-05') {
      return { ...review, score: storedCalculatedScore(score, { profileVersion: undefined }) };
    }
    if (playerIdValue === 'player-07') {
      return {
        ...review,
        score: storedCalculatedScore(score),
        adjustments: { bohUsefulRating: 101 },
      };
    }
    if (playerIdValue === 'player-08') return review;
    return { ...review, score: storedCalculatedScore(score) };
  };
  primitiveStore.bumpSubmissionRevision('player-06');
  primitiveStore.bumpSubmissionRevision('player-07', { troopRoster: ['invalid-roster-row'] });
  primitiveStore.bumpSubmissionRevision('player-08');
  snapshot = await adapter.refresh();

  const diagnostic = (playerIdValue) =>
    snapshot.scores.find((entry) => entry.playerId === playerIdValue)?.scoreDiagnostic;
  assert.equal(diagnostic('player-01'), 'stored_mismatch');
  assert.equal(diagnostic('player-02'), '', 'an entirely unreviewed row is not corrupt');
  assert.equal(diagnostic('player-03'), '', 'differences inside profile precision are accepted');
  assert.equal(diagnostic('player-04'), 'stale_profile');
  assert.equal(diagnostic('player-05'), 'unverifiable');
  assert.equal(diagnostic('player-06'), 'stale_submission');
  assert.equal(
    diagnostic('player-07'),
    'calculation_failed',
    'a stale review without a stored score must not overwrite a calculation failure'
  );
  assert.equal(diagnostic('player-08'), 'stale_submission');
  assert.equal(
    snapshot.scores.find((entry) => entry.playerId === 'player-01').calculatedScore,
    baseline.get('player-01').calculatedScore,
    'a corrupt stored total never replaces the fresh calculation'
  );
  for (const playerIdValue of [
    'player-01',
    'player-04',
    'player-05',
    'player-06',
    'player-07',
    'player-08',
  ]) {
    assert.equal(
      snapshot.submissions.find((entry) => entry.playerId === playerIdValue).scoreDiagnostic,
      diagnostic(playerIdValue)
    );
  }
  adapter.stop();
});

test('fresh name and stat corrections drive score, CSV, and materialized seats while preserving originals', async () => {
  const primitiveStore = createPrimitiveStoreFixture();
  const adapter = createAdminAllStarBohStoreAdapter(primitiveStore);
  let snapshot = await adapter.start();
  const initialScore = snapshot.scores.find((score) => score.playerId === 'player-01').finalScore;
  const originalDragonPower = fixtureScore(0) * 1_000;

  snapshot = (
    await dispatch(adapter, snapshot, 'reviewSubmission', {
      playerId: 'player-01',
      status: 'confirmed',
      statCorrections: {
        dragonPower: { corrected: 1_000, reason: 'Verified screenshot' },
      },
      gameNameCorrection: { corrected: 'Reviewed Alpha', reason: 'Matched roster' },
    })
  ).snapshot;
  const corrected = snapshot.submissions.find((item) => item.playerId === 'player-01');
  assert.equal(corrected.gameName, 'Reviewed Alpha');
  assert.equal(corrected.originalGameName, 'Player 01');
  assert.equal(corrected.stats.dragonPower, 1_000);
  assert.equal(corrected.originalStats.dragonPower, originalDragonPower);
  assert.ok(
    snapshot.scores.find((score) => score.playerId === 'player-01').finalScore < initialScore
  );
  const csv = buildSignupReviewCsv([corrected]);
  assert.match(csv, /"Reviewed Alpha","Player 01"/u);
  assert.match(csv, /"1000"/u);

  snapshot = (await dispatch(adapter, snapshot, 'balanceTeams')).snapshot;
  assert.equal(
    snapshot.teams
      .flatMap((team) => team.seats)
      .find((seatEntry) => seatEntry.playerId === 'player-01').displayName,
    'Reviewed Alpha'
  );

  snapshot = (
    await dispatch(adapter, snapshot, 'reviewSubmission', {
      playerId: 'player-01',
      status: 'confirmed',
    })
  ).snapshot;
  assert.equal(
    snapshot.submissions.find((item) => item.playerId === 'player-01').stats.dragonPower,
    1_000,
    'unrelated review saves preserve the correction'
  );

  snapshot = (
    await dispatch(adapter, snapshot, 'reviewSubmission', {
      playerId: 'player-01',
      status: 'confirmed',
      statCorrections: {},
      gameNameCorrection: null,
    })
  ).snapshot;
  const restored = snapshot.submissions.find((item) => item.playerId === 'player-01');
  assert.equal(restored.gameName, 'Player 01');
  assert.equal(restored.stats.dragonPower, originalDragonPower);
  assert.equal(
    snapshot.teams
      .flatMap((team) => team.seats)
      .find((seatEntry) => seatEntry.playerId === 'player-01').displayName,
    'Player 01'
  );
  adapter.stop();
});

test('full submission corrections persist every family, survive review saves, affect consumers, and clear atomically', async () => {
  const primitiveStore = createPrimitiveStoreFixture({
    mutateSubmissions(submissions) {
      submissions[0].commitment = {
        vts1097Member: false,
        contactNumber: '555-0100',
        currentState: 'State 1200',
        joinReason: 'Joining VTS for the event.',
      };
    },
  });
  const adapter = createAdminAllStarBohStoreAdapter(primitiveStore, {
    paidUsableHeroNames: ['Lionheart'],
  });
  let snapshot = await adapter.start();
  const original = snapshot.submissions.find((item) => item.playerId === 'player-01');
  const originalScore = snapshot.scores.find((item) => item.playerId === 'player-01').finalScore;
  const originalPower = original.stats.totalCastlePower;
  primitiveStore.bumpSubmissionRevision('firebase-uid-01');
  snapshot = await adapter.refresh();
  assert.equal(
    snapshot.submissions.find((item) => item.playerId === 'player-01').reviewStale,
    true
  );
  const correction = {
    schemaVersion: 1,
    reason: 'Verified full account audit',
    values: {
      gameName: 'Corrected Alpha',
      locale: 'ru',
      timezone: 'UTC+3',
      preferredTeammates: ['Bravo', 'Charlie'],
      stats: {
        totalCastlePower: 123_456,
        troopPower: 10_000,
        artifactPower: null,
        royalTechPower: null,
        rocLevel: 33,
        level50HeroCount: 4,
        t9TroopTypes: ['cavalry'],
        t10TroopTypes: ['archers'],
        readySpeedHeroes: ['lionheart'],
        troopRoster: ['cavalry|X|enhanced|250000', 'estimate|lofty|1000000'],
        usableHeroNames: ['Lionheart'],
        researchProgressPct: { military: 75 },
      },
      commitment: {
        availability: 'most',
        unavailableTimes: 'After 18 UTC',
        preferredRole: 'top',
        secondaryRole: 'bottom',
        canHelpLead: false,
        vts1097Member: true,
        fightingTimeIds: ['+12', '+16'],
        teamNamePreferences: ['night-falcons'],
        canTeleport: false,
        canUseVoice: true,
        planCommitment: false,
        notes: 'Corrected commitment note',
      },
    },
  };

  snapshot = (
    await dispatch(adapter, snapshot, 'reviewSubmission', {
      playerId: 'player-01',
      status: 'confirmed',
      submissionCorrection: correction,
    })
  ).snapshot;
  let corrected = snapshot.submissions.find((item) => item.playerId === 'player-01');
  assert.equal(corrected.gameName, 'Corrected Alpha');
  assert.equal(corrected.locale, 'ru');
  assert.equal(corrected.timezone, 'UTC+3');
  assert.deepEqual(corrected.preferredTeammates, ['Bravo', 'Charlie']);
  assert.equal(corrected.stats.totalCastlePower, 123_456);
  assert.equal(corrected.stats.artifactPower, null);
  assert.equal(corrected.stats.royalTechPower, null);
  assert.deepEqual(corrected.stats.troopRoster, [
    'cavalry|X|enhanced|250000',
    'estimate|lofty|1000000',
  ]);
  assert.deepEqual(corrected.stats.usableHeroNames, ['Lionheart']);
  assert.deepEqual(corrected.stats.researchProgressPct, { military: 75 });
  assert.equal(corrected.commitment.canHelpLead, false);
  assert.equal(corrected.commitment.vts1097Member, true);
  assert.equal(corrected.commitment.contactNumber, '');
  assert.equal(corrected.commitment.currentState, '');
  assert.equal(corrected.commitment.joinReason, '');
  assert.equal(corrected.commitment.canTeleport, false);
  assert.equal(corrected.commitment.canUseVoice, true);
  assert.equal(corrected.commitment.planCommitment, false);
  assert.deepEqual(corrected.rolePreferences, ['top', 'bottom']);
  assert.equal(corrected.originalSubmission.gameName, 'Player 01');
  assert.equal(corrected.originalSubmission.stats.totalCastlePower, originalPower);
  assert.notEqual(
    snapshot.scores.find((item) => item.playerId === 'player-01').finalScore,
    originalScore
  );
  const correctedCsv = buildSignupReviewCsv([corrected]);
  assert.match(correctedCsv, /"Corrected Alpha","Player 01"/u);
  assert.match(correctedCsv, /"Server","Current State","Alliance"/u);
  assert.doesNotMatch(correctedCsv, /555-0100|State 1200|Joining VTS for the event\./u);

  snapshot = (
    await dispatch(adapter, snapshot, 'reviewSubmission', {
      playerId: 'player-01',
      status: 'confirmed',
      internalNote: 'Unrelated private note',
    })
  ).snapshot;
  corrected = snapshot.submissions.find((item) => item.playerId === 'player-01');
  assert.equal(corrected.gameName, 'Corrected Alpha');
  assert.equal(corrected.review.submissionCorrection.reason, 'Verified full account audit');

  snapshot = (
    await dispatch(adapter, snapshot, 'reviewSubmission', {
      playerId: 'player-01',
      status: 'confirmed',
      submissionCorrection: null,
    })
  ).snapshot;
  const restored = snapshot.submissions.find((item) => item.playerId === 'player-01');
  assert.equal(restored.gameName, 'Player 01');
  assert.equal(restored.stats.totalCastlePower, originalPower);
  assert.equal(restored.review.submissionCorrection, null);
  assert.deepEqual(restored.rolePreferences, ['offensive']);
  adapter.stop();
});

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
  snapshot = (await dispatch(adapter, snapshot, 'previewBalanceTeams')).snapshot;
  primitiveStore.bumpSubmissionRevision('player-80');
  primitiveStore.bumpReviewRevision('player-80', 2);
  snapshot = await adapter.refresh();
  assert.ok(snapshot.balancePreview, 'unselected source changes preserve the active preview');
  snapshot = (await dispatch(adapter, snapshot, 'applyBalancePreview')).snapshot;
  const guardOptions = primitiveStore.bundleAttempts.at(-1).options;
  const expectedUids = selected
    .map((id) => (id === 'player-01' ? 'firebase-uid-01' : id))
    .sort((left, right) => left.localeCompare(right));
  assert.equal(guardOptions.expectedSubmissionRevisions.length, 72);
  assert.equal(guardOptions.expectedReviewRevisions.length, 72);
  assert.deepEqual(
    guardOptions.expectedSubmissionRevisions,
    expectedUids.map((uid) => [uid, 1])
  );
  assert.deepEqual(
    guardOptions.expectedReviewRevisions,
    expectedUids.map((uid) => [uid, 0, 1])
  );
  assert.equal(
    guardOptions.expectedSubmissionRevisions.some(([uid]) => uid === 'player-80'),
    false
  );
  assert.equal(
    guardOptions.expectedReviewRevisions.some(([uid]) => uid === 'player-80'),
    false
  );
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

  const draftRevisionBeforePublish = primitiveStore.draft.revision;
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
  assert.equal(
    primitiveStore.draft.revision,
    draftRevisionBeforePublish,
    'publish must not perform a second draft write'
  );
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

test('announcement-only publication cannot replace an already-published plan with draft edits', async () => {
  const { adapter, primitiveStore } = await createBalancedFixture();
  let snapshot = adapter.getSnapshot();

  snapshot = (await dispatch(adapter, snapshot, 'validateRevision')).snapshot;
  snapshot = (await dispatch(adapter, snapshot, 'publishAnnouncement')).snapshot;
  snapshot = (await dispatch(adapter, snapshot, 'validateRevision')).snapshot;
  snapshot = (await dispatch(adapter, snapshot, 'publishPlan')).snapshot;
  const publishedPlan = clone(primitiveStore.publishCalls[1].bundle);

  snapshot = (
    await dispatch(adapter, snapshot, 'saveInstruction', {
      teamId: 'team-1',
      phaseId: snapshot.plan.phases[0].id,
      legionId: snapshot.plan.legions[0].id,
      scope: 'role',
      scopeId: 'offensive',
      roleGroupId: 'offensive',
      action: 'Unpublished draft action',
      instruction: 'This private draft edit must not become public.',
    })
  ).snapshot;
  snapshot = (await dispatch(adapter, snapshot, 'validateRevision')).snapshot;

  await assert.rejects(
    dispatch(adapter, snapshot, 'publishAnnouncement'),
    (error) => error?.code === 'all-star-boh-plan-publication-protected'
  );
  assert.equal(primitiveStore.publishCalls.length, 2);
  assert.deepEqual(primitiveStore.publishCalls[1].bundle, publishedPlan);
  adapter.stop();
});

test('runtime Stage-1 defaults make a complete assignment plan-ready without authored role instructions', async () => {
  const primitiveStore = createPrimitiveStoreFixture();
  primitiveStore.draft.plan.roleDefaults = [];
  const adapter = createAdminAllStarBohStoreAdapter(primitiveStore);
  let snapshot = await adapter.start();
  snapshot = (await dispatch(adapter, snapshot, 'balanceTeams')).snapshot;
  snapshot = await saveTeamCaptains(adapter, snapshot);
  snapshot = (await dispatch(adapter, snapshot, 'validateRevision')).snapshot;

  assert.equal(snapshot.validation.announcement.valid, true);
  assert.equal(snapshot.validation.plan.valid, true);
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
    snapshot.plan.instructions.find((rule) => rule.scope === 'player' && rule.generated !== true)
      .playerId,
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
