import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { createAdminAllStarBohStoreAdapter } from '../../js/admin-all-star-boh.js';
import {
  BOH_MAPPER_IMPORT_MAX_BYTES,
  parseAllStarBohMapperExactView,
} from '../../js/all-star-boh-mapper-import.js';
import {
  normalizeAllStarBohDraft,
  normalizeAllStarBohDraftTeam,
} from '../../js/all-star-boh-store.js';

function exactView() {
  return {
    format: 'all-star-boh-exact-view',
    version: 1,
    ignored: '<script>outside allowlist</script>',
    savedAt: '2026-07-26T12:00:00.000Z',
    view: { ignoreLeadership: true, search: '<mapper search>', language: 'all' },
    state: {
      schemaVersion: 7,
      rosterRevision: 3,
      tierConfig: { tier1Count: 4, tier2Count: 1, tier3Count: 1 },
      teams: Array.from({ length: 6 }, (_, teamIndex) => ({
        id: `team-${teamIndex + 1}`,
        name: teamIndex === 0 ? '<img src=x onerror=alert(1)>' : `Synthetic Team ${teamIndex + 1}`,
        color: 'teal',
        fightTime: '+14',
        tier: 'tier1',
        ignored: { private: true },
        players: Array.from({ length: 12 }, (_, seatIndex) => {
          const number = teamIndex * 12 + seatIndex + 1;
          return {
            id: `mapper-${number}`,
            name: `Synthetic Player ${number}`,
            locked: seatIndex === 1,
            userLockTeamId: seatIndex === 1 ? `team-${teamIndex + 1}` : '',
            backup: false,
            main: false,
            planRole: seatIndex === 0 ? 'offensive' : '',
            titleRole: '',
            commandRole: seatIndex === 0 ? 'leader' : '',
            commandRoleSource: seatIndex === 0 ? 'explicit' : '',
            score: 100_000 - number,
            power: 999999999,
            scoreSource: seatIndex === 1 ? 'manual-rough-estimate' : '',
          };
        }),
      })),
    },
  };
}

function json(value = exactView()) {
  return JSON.stringify(value);
}

function expectCode(run, code) {
  assert.throws(run, (error) => error?.code === code);
}

test('strict parser returns only the allowlisted ordered 6x12 mapper data', () => {
  const parsed = parseAllStarBohMapperExactView(json());
  assert.equal(parsed.teamCount, 6);
  assert.equal(parsed.playerCount, 72);
  assert.deepEqual(
    parsed.teams.map((team) => team.id),
    ['team-1', 'team-2', 'team-3', 'team-4', 'team-5', 'team-6']
  );
  assert.deepEqual(Object.keys(parsed.teams[0]), [
    'id',
    'name',
    'color',
    'fightTime',
    'tier',
    'players',
  ]);
  assert.deepEqual(Object.keys(parsed.teams[0].players[0]), [
    'seatNumber',
    'mapperId',
    'displayName',
    'score',
    'power',
    'scoreSource',
    'locked',
    'userLockTeamId',
    'backup',
    'main',
    'planRole',
    'titleRole',
    'titleRoleNote',
    'commandRole',
    'commandRoleSource',
  ]);
  assert.equal(parsed.teams[0].players[0].planRole, 'offensive');
  assert.equal(parsed.teams[0].players[0].backup, false);
  assert.equal(parsed.teams[0].players[0].main, false);
  assert.equal(parsed.teams[0].players[0].titleRole, '');
  assert.equal(parsed.teams[0].players[0].score, 99_999);
  assert.equal(parsed.teams[0].players[0].power, 999999999);
  assert.equal(parsed.teams[0].players[1].scoreSource, 'manual-rough-estimate');
  assert.deepEqual(parsed.planner, {
    savedAt: '2026-07-26T12:00:00.000Z',
    schemaVersion: 7,
    rosterRevision: 3,
    tierConfig: { tier1Count: 4, tier2Count: 1, tier3Count: 1 },
    view: { ignoreLeadership: true, search: '<mapper search>', language: 'all' },
    plan: null,
    unsupportedFields: [],
  });
  assert.equal(parsed.ignored, undefined);
});

test('strict parser rejects malformed, oversized, wrong-contract, and corrupt shapes', () => {
  expectCode(() => parseAllStarBohMapperExactView('{'), 'boh-mapper-invalid-json');
  expectCode(
    () => parseAllStarBohMapperExactView('x'.repeat(BOH_MAPPER_IMPORT_MAX_BYTES + 1)),
    'boh-mapper-file-too-large'
  );
  expectCode(
    () => parseAllStarBohMapperExactView(json({ ...exactView(), format: 'other' })),
    'boh-mapper-wrong-format'
  );
  expectCode(
    () => parseAllStarBohMapperExactView(json({ ...exactView(), version: 2 })),
    'boh-mapper-wrong-version'
  );
  const short = exactView();
  short.state.teams.pop();
  expectCode(() => parseAllStarBohMapperExactView(json(short)), 'boh-mapper-team-count');
  const badPlayers = exactView();
  badPlayers.state.teams[0].players.pop();
  expectCode(
    () => parseAllStarBohMapperExactView(json(badPlayers)),
    'boh-mapper-team-player-count'
  );
  const badId = exactView();
  badId.state.teams[1].id = 'team-1';
  expectCode(() => parseAllStarBohMapperExactView(json(badId)), 'boh-mapper-duplicate-team-id');
  const badScore = exactView();
  badScore.state.teams[0].players[0].score = '100';
  expectCode(() => parseAllStarBohMapperExactView(json(badScore)), 'boh-mapper-player-score');
  const badPower = exactView();
  badPower.state.teams[0].players[0].power = -1;
  expectCode(() => parseAllStarBohMapperExactView(json(badPower)), 'boh-mapper-player-power');
  const badScoreSource = exactView();
  badScoreSource.state.teams[0].players[0].scoreSource = 'verified';
  expectCode(
    () => parseAllStarBohMapperExactView(json(badScoreSource)),
    'boh-mapper-player-score-source'
  );
  const badView = exactView();
  badView.view.ignoreLeadership = 'true';
  expectCode(
    () => parseAllStarBohMapperExactView(json(badView)),
    'boh-mapper-view-ignore-leadership'
  );
});

test('strict parser rejects duplicate mapper IDs and normalized imported names', () => {
  const duplicateId = exactView();
  duplicateId.state.teams[1].players[0].id = 'mapper-1';
  expectCode(
    () => parseAllStarBohMapperExactView(json(duplicateId)),
    'boh-mapper-duplicate-player-id'
  );
  const duplicateName = exactView();
  duplicateName.state.teams[1].players[0].name = '  SYNTHETIC   PLAYER 1  ';
  expectCode(
    () => parseAllStarBohMapperExactView(json(duplicateName)),
    'boh-mapper-duplicate-player-name'
  );
});

test('strict parser ignores unsupported authored plan and map fields', () => {
  const payload = exactView();
  payload.state.reservePlayers = [{ ignored: true }];
  payload.state.solverConflicts = [{ ignored: true }];
  payload.state.plan = ['unsupported'];
  payload.state.map = 'unsupported';

  const planner = parseAllStarBohMapperExactView(json(payload)).planner;
  assert.equal(planner.plan, null);
  assert.deepEqual(planner.unsupportedFields.sort(), [
    'state.map',
    'state.plan',
    'state.reservePlayers',
    'state.solverConflicts',
  ]);
});

test('optional mapper flags and title roles preserve zero, one, or two backups per team', () => {
  const payload = exactView();
  payload.state.teams[0].players[0].backup = true;
  payload.state.teams[0].players[0].titleRole = 'kills';
  payload.state.teams[0].players[1].backup = true;
  payload.state.teams[0].players[1].titleRole = 'tower';
  payload.state.teams[0].players[2].main = true;
  payload.state.teams[0].players[2].titleRole = 'escort';
  payload.state.teams[0].players[3].titleRole = 'gathering';
  payload.state.teams[0].players[11].planRole = 'rune';
  payload.state.teams[1].players[0].backup = true;

  const parsed = parseAllStarBohMapperExactView(json(payload));
  assert.deepEqual(
    parsed.teams.slice(0, 3).map((team) => team.players.filter((player) => player.backup).length),
    [2, 1, 0]
  );
  assert.deepEqual(
    parsed.teams[0].players.slice(0, 4).map((player) => player.titleRole),
    ['kills', 'tower', 'escort', 'gathering']
  );
  assert.equal(parsed.teams[0].players[2].main, true);
  assert.equal(parsed.teams[0].players[11].planRole, 'rune');
});

test('mapper backup, main, title-role, and backup-count validation is strict', () => {
  const badBackup = exactView();
  badBackup.state.teams[0].players[0].backup = 'true';
  expectCode(() => parseAllStarBohMapperExactView(json(badBackup)), 'boh-mapper-player-backup');

  const badMain = exactView();
  badMain.state.teams[0].players[0].main = 1;
  expectCode(() => parseAllStarBohMapperExactView(json(badMain)), 'boh-mapper-player-main');

  const conflictingDeployment = exactView();
  conflictingDeployment.state.teams[0].players[0].backup = true;
  conflictingDeployment.state.teams[0].players[0].main = true;
  expectCode(
    () => parseAllStarBohMapperExactView(json(conflictingDeployment)),
    'boh-mapper-player-deployment'
  );

  const badTitleRole = exactView();
  badTitleRole.state.teams[0].players[0].titleRole = 'unsupported';
  expectCode(
    () => parseAllStarBohMapperExactView(json(badTitleRole)),
    'boh-mapper-player-title-role'
  );

  const tooManyBackups = exactView();
  tooManyBackups.state.teams[0].players.slice(0, 3).forEach((player) => {
    player.backup = true;
  });
  expectCode(
    () => parseAllStarBohMapperExactView(json(tooManyBackups)),
    'boh-mapper-player-backup-count'
  );
});

test('exact-view import preserves mapper player order and derives only missing seat roles', () => {
  const payload = exactView();
  const originalPlayers = payload.state.teams[0].players;
  originalPlayers.forEach((player) => {
    player.planRole = '';
  });
  payload.state.teams[0].players = [
    originalPlayers[11],
    originalPlayers[6],
    originalPlayers[2],
    originalPlayers[0],
    originalPlayers[9],
    originalPlayers[4],
    originalPlayers[8],
    originalPlayers[1],
    originalPlayers[10],
    originalPlayers[3],
    originalPlayers[7],
    originalPlayers[5],
  ];

  const parsed = parseAllStarBohMapperExactView(json(payload)).teams[0].players;
  assert.deepEqual(
    parsed.map((player) => player.mapperId),
    [
      'mapper-12',
      'mapper-7',
      'mapper-3',
      'mapper-1',
      'mapper-10',
      'mapper-5',
      'mapper-9',
      'mapper-2',
      'mapper-11',
      'mapper-4',
      'mapper-8',
      'mapper-6',
    ]
  );
  assert.deepEqual(
    parsed.map((player) => player.seatNumber),
    Array.from({ length: 12 }, (_, index) => index + 1)
  );
  assert.deepEqual(
    parsed.map((player) => player.planRole),
    Array.from(
      { length: 12 },
      (_, index) =>
        [
          'offensive',
          'offensive',
          'top',
          'bottom',
          'top',
          'bottom',
          'rune',
          'offensive',
          'rune',
          'rune',
          'bottom',
          'top',
        ][index]
    )
  );
  assert.equal(parsed[0].score, originalPlayers[11].score);
  assert.equal(parsed[0].power, originalPlayers[11].power);
});

function createStore() {
  const submissions = Array.from({ length: 72 }, (_, index) => ({
    id: `player-${index + 1}`,
    uid: `uid-${index + 1}`,
    playerId: `player-${index + 1}`,
    gameName: `Synthetic Player ${index + 1}`,
    status: 'submitted',
    revision: 1,
  }));
  submissions[1].status = 'draft';
  submissions.push({
    id: 'player-ambiguous',
    uid: 'uid-ambiguous',
    playerId: 'player-ambiguous',
    gameName: 'Synthetic Player 3',
    status: 'submitted',
    revision: 1,
  });
  submissions.push({
    id: 'player-manual',
    uid: 'uid-manual',
    playerId: 'player-manual',
    gameName: 'Manual Candidate',
    status: 'submitted',
    revision: 1,
  });
  const teamIds = Array.from({ length: 6 }, (_, index) => `team-${index + 1}`);
  const calls = { bundles: [], publishes: [] };
  const draft = {
    revision: 4,
    teamCount: 6,
    teamIds,
    playerIds: [],
    forcedTeamAssignments: [],
    plan: {
      notes: ['Keep this authored non-player note.'],
      playerOverrides: [{ playerId: 'old-player' }],
      instructions: [{ scope: 'player', playerId: 'old-player' }],
      rotations: [{ playerId: 'old-player' }],
    },
  };
  const team = (teamId) => ({
    id: teamId,
    teamId,
    revision: 2,
    name: teamId,
    color: '#123456',
    seats: Array.from({ length: 12 }, (_, index) => ({
      seatNumber: index + 1,
      playerId: '',
      displayName: '',
      roleGroupId: ['offensive', 'top', 'bottom', 'rune'][Math.floor(index / 3)],
    })),
  });
  return {
    calls,
    async listSubmissions() {
      return submissions;
    },
    async getReview(uid) {
      return { status: 'verified', stale: false, submissionRevision: uid === 'uid-4' ? 0 : 1 };
    },
    async saveReview() {},
    async getDraft() {
      return draft;
    },
    async saveDraft() {},
    async getDraftTeam(teamId) {
      return team(teamId);
    },
    async saveDraftTeam() {},
    async saveDraftBundle(bundle, options) {
      normalizeAllStarBohDraft(bundle.draft);
      Object.values(bundle.teams).forEach((value) => normalizeAllStarBohDraftTeam(value));
      calls.bundles.push({ bundle, options });
      return bundle;
    },
    async publish(bundle) {
      calls.publishes.push(bundle);
      return { current: bundle.current };
    },
    async subscribeSubmissions() {
      return () => {};
    },
    async subscribeDraft() {
      return () => {};
    },
    async subscribeDraftTeam() {
      return () => {};
    },
  };
}

test('mapper preview matches only unique fresh verified names without writing', async () => {
  const store = createStore();
  const adapter = createAdminAllStarBohStoreAdapter(store);
  await adapter.start();
  const result = await adapter.dispatch({
    type: 'previewMapperExactView',
    payload: {
      jsonText: json(),
      expectedRevision: adapter.getSnapshot().revision,
    },
  });
  assert.equal(store.calls.bundles.length, 0);
  assert.equal(store.calls.publishes.length, 0);
  assert.equal(result.result.playerCount, 72);
  assert.equal(result.result.matchedCount, 69);
  assert.equal(result.result.unresolvedCount, 3);
  assert.deepEqual(result.result.diagnostics.map((entry) => entry.code).sort(), [
    'boh-mapper-match-ambiguous',
    'boh-mapper-match-unmatched',
    'boh-mapper-match-unmatched',
  ]);
  assert.equal(result.result.teams[0].players[1].playerId, '');
  assert.equal(result.result.teams[0].players[2].playerId, '');
  assert.equal(result.result.teams[0].players[3].playerId, '');
  adapter.stop();
});

test('manual mapper reconciliation stays in memory, enforces fresh unused identities, and saves guarded once', async () => {
  const store = createStore();
  const adapter = createAdminAllStarBohStoreAdapter(store);
  const snapshot = await adapter.start();
  const previewed = await adapter.dispatch({
    type: 'previewMapperExactView',
    payload: { jsonText: json(), expectedRevision: snapshot.revision },
  });
  assert.equal(store.calls.bundles.length, 0);
  assert.ok(
    previewed.result.candidates.some((candidate) => candidate.playerId === 'player-manual')
  );

  const reconciled = await adapter.dispatch({
    type: 'reconcileMapperExactView',
    payload: {
      teamId: 'team-1',
      seatNumber: 2,
      playerId: 'player-manual',
      expectedRevision: snapshot.revision,
    },
  });
  assert.equal(store.calls.bundles.length, 0);
  assert.equal(reconciled.result.matchedCount, 70);
  assert.equal(reconciled.result.unresolvedCount, 2);
  assert.equal(reconciled.result.teams[0].players[1].matchSource, 'manual');

  await assert.rejects(
    adapter.dispatch({
      type: 'reconcileMapperExactView',
      payload: {
        teamId: 'team-1',
        seatNumber: 3,
        playerId: 'player-manual',
        expectedRevision: snapshot.revision,
      },
    }),
    (error) => error?.code === 'boh-mapper-reconcile-duplicate'
  );
  await assert.rejects(
    adapter.dispatch({
      type: 'reconcileMapperExactView',
      payload: {
        teamId: 'team-1',
        seatNumber: 3,
        playerId: 'player-2',
        expectedRevision: snapshot.revision,
      },
    }),
    (error) => error?.code === 'boh-mapper-reconcile-unverified'
  );
  await assert.rejects(
    adapter.dispatch({
      type: 'reconcileMapperExactView',
      payload: {
        teamId: 'team-1',
        seatNumber: 3,
        playerId: '',
        expectedRevision: snapshot.revision + 1,
      },
    }),
    (error) => error?.code === 'all-star-boh-ui-conflict'
  );

  await adapter.dispatch({
    type: 'saveMapperExactViewImport',
    payload: { expectedRevision: snapshot.revision },
  });
  assert.equal(store.calls.bundles.length, 1);
  assert.equal(store.calls.publishes.length, 0);
  const saved = store.calls.bundles[0];
  assert.equal(saved.bundle.teams['team-1'].seats[1].playerId, 'player-manual');
  assert.ok(saved.options.expectedSubmissionRevisions.some(([uid]) => uid === 'uid-manual'));
  assert.ok(saved.options.expectedReviewRevisions.some(([uid]) => uid === 'uid-manual'));
  adapter.stop();
});

test('explicit mapper save writes one draft bundle and never publishes private unresolved plans', async () => {
  const store = createStore();
  const adapter = createAdminAllStarBohStoreAdapter(store);
  await adapter.start();
  const previewRevision = adapter.getSnapshot().revision;
  await adapter.dispatch({
    type: 'previewMapperExactView',
    payload: { jsonText: json(), expectedRevision: previewRevision },
  });
  await adapter.dispatch({
    type: 'saveMapperExactViewImport',
    payload: { expectedRevision: previewRevision },
  });
  assert.equal(store.calls.bundles.length, 1);
  assert.equal(store.calls.publishes.length, 0);
  const { bundle, options } = store.calls.bundles[0];
  assert.equal(bundle.draft.teamCount, 6);
  assert.deepEqual(bundle.draft.teamIds, [
    'team-1',
    'team-2',
    'team-3',
    'team-4',
    'team-5',
    'team-6',
  ]);
  assert.equal(bundle.draft.playerIds.length, 69);
  assert.equal(bundle.draft.forcedTeamAssignments.length, 69);
  assert.equal(Object.keys(bundle.teams).length, 6);
  assert.equal(options.expectedDraftRevision, 4);
  assert.deepEqual(Object.values(options.expectedTeamRevisions), [2, 2, 2, 2, 2, 2]);
  assert.equal(options.expectedSubmissionRevisions.length, 69);
  assert.equal(options.expectedReviewRevisions.length, 69);
  const team1 = bundle.teams['team-1'];
  assert.equal(team1.seats[0].displayName, 'Synthetic Player 1');
  assert.equal(team1.seats[0].playerId, 'player-1');
  assert.equal(team1.seats[0].roleGroupId, 'offensive');
  assert.equal(team1.captainId, 'player-1');
  assert.equal(team1.seats[1].playerId, '');
  assert.equal(
    team1.seats[1].score,
    99_998,
    'rough mapper estimates persist only on private draft seats'
  );
  assert.equal(team1.seats[1].locked, true);
  assert.equal(team1.plan.generated, true);
  assert.equal(team1.plan.id, 'stage-1');
  assert.deepEqual(team1.plan.notes, ['Keep this authored non-player note.']);
  assert.ok(team1.plan.playerOverrides.length > 0);
  assert.equal(bundle.draft.plan.playerOverrides.length, 0);
  assert.equal(bundle.draft.plan.instructions.length, 0);
  assert.equal(bundle.draft.plan.rotations.length, 0);
  assert.deepEqual(bundle.draft.plan.notes, ['Keep this authored non-player note.']);
  const firstBundle = structuredClone(bundle);
  const repeatRevision = adapter.getSnapshot().revision;
  await adapter.dispatch({
    type: 'previewMapperExactView',
    payload: { jsonText: json(), expectedRevision: repeatRevision },
  });
  await adapter.dispatch({
    type: 'saveMapperExactViewImport',
    payload: { expectedRevision: repeatRevision },
  });
  assert.equal(store.calls.bundles.length, 2);
  assert.deepEqual(store.calls.bundles[1].bundle, firstBundle);
  adapter.stop();
});

test('admin mapper file flow is bounded before read and renders imported names safely', () => {
  const source = readFileSync('js/admin-all-star-boh.js', 'utf8');
  assert.match(source, /file\.size\s*>\s*BOH_MAPPER_IMPORT_MAX_BYTES[\s\S]*?await file\.text\(\)/u);
  assert.match(source, /accept='\.json,application\/json'/u);
  assert.match(source, /escapeHtml\(player\.displayName\)/u);
  assert.match(source, /Saved to draft[^']*not published/u);
  assert.match(source, /Save import to draft/u);
});
