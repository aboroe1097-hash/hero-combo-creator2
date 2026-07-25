import assert from 'node:assert/strict';
import test from 'node:test';

import { createAdminAllStarBohStoreAdapter } from '../../js/admin-all-star-boh.js';
import { normalizeAllStarBohEventSchedule } from '../../js/all-star-boh-schedule.js';

function createAdminStore(overrides = {}) {
  const draft = overrides.draft || {
    revision: 4,
    teamCount: 2,
    teamIds: ['team-1', 'team-2'],
    plan: {
      roleGroups: [{ id: 'role-1', label: 'Role 1', capacity: 12, order: 1 }],
      phases: [
        { id: 'phase-1', label: 'Phase 1', startMinute: 0, endMinute: 5, order: 1 },
        { id: 'phase-2', label: 'Phase 2', startMinute: 5, endMinute: 10, order: 2 },
        { id: 'phase-3', label: 'Phase 3', startMinute: 10, endMinute: 15, order: 3 },
        { id: 'phase-4', label: 'Phase 4', startMinute: 15, endMinute: 30, order: 4 },
      ],
      legions: [
        { id: 'legion-1', label: 'Legion 1', order: 1 },
        { id: 'legion-2', label: 'Legion 2', order: 2 },
      ],
      objectives: [],
      roleDefaults: [],
      seatOverrides: [],
      playerOverrides: [],
      instructions: [],
      rotations: [],
      notes: [],
    },
  };
  const team = (id, number) => ({
    id,
    revision: 1,
    number,
    name: `Team ${number}`,
    seats: Array.from({ length: 12 }, (_, index) => ({
      seatNumber: index + 1,
      playerId: index === 0 ? `player-${number}` : '',
      roleGroupId: 'role-1',
    })),
  });
  const store = {
    savedSchedules: [],
    eventSchedule: overrides.eventSchedule || {
      schemaVersion: 1,
      seasonId: 'season-1',
      status: 'hidden',
      eventStartsAt: '2026-08-01T10:00:00.000Z',
      eventEndsAt: '2026-08-01T11:00:00.000Z',
      milestones: [],
      teamGameTimes: [],
      revision: 2,
    },
    scheduleListener: null,
    async listSubmissions() {
      return [];
    },
    async getReview() {
      return null;
    },
    async saveReview() {},
    async getDraft() {
      return draft;
    },
    async saveDraft(next) {
      Object.assign(draft, next, { revision: draft.revision + 1 });
      store.savedDraft = structuredClone(draft);
      return draft;
    },
    async getDraftTeam(teamId) {
      return team(teamId, teamId.endsWith('2') ? 2 : 1);
    },
    async saveDraftTeam() {},
    async saveDraftBundle() {},
    async publish() {},
    async getEventSchedule() {
      return store.eventSchedule;
    },
    async saveEventSchedule(input, options) {
      store.savedSchedules.push({ input, options });
      store.eventSchedule = {
        ...normalizeAllStarBohEventSchedule(input, { seasonId: input.seasonId }),
        revision: options.expectedRevision + 1,
      };
      return store.eventSchedule;
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
    async subscribeEventSchedule(next) {
      store.scheduleListener = next;
      return () => {
        store.scheduleListener = null;
      };
    },
  };
  return store;
}

test('event schedule save uses independent revision and current team ids', async () => {
  const adminStore = createAdminStore();
  const adapter = createAdminAllStarBohStoreAdapter(adminStore);
  const snapshot = await adapter.start();

  const result = await adapter.dispatch({
    type: 'saveEventSchedule',
    payload: {
      expectedScheduleRevision: snapshot.documentRevisions.eventSchedule,
      schemaVersion: 1,
      seasonId: 'season-1',
      status: 'published',
      eventStartsAt: '2026-08-01T10:00:00.000Z',
      eventEndsAt: '2026-08-01T11:00:00.000Z',
      milestones: [{ id: 'check-in', label: 'Check in', startsAt: '2026-08-01T10:15:00.000Z' }],
      teamGameTimes: [
        { teamId: 'team-1', startsAt: '2026-08-01T10:05:00.000Z' },
        { teamId: 'team-2', startsAt: '2026-08-01T10:10:00.000Z' },
        { teamId: 'other-team', startsAt: '2026-08-01T10:15:00.000Z' },
      ],
    },
  });

  assert.equal(adminStore.savedSchedules.length, 1);
  assert.equal(adminStore.savedSchedules[0].options.expectedRevision, 2);
  assert.deepEqual(adminStore.savedSchedules[0].options.teamIds, ['team-1', 'team-2']);
  assert.deepEqual(
    adminStore.savedSchedules[0].input.teamGameTimes.map((entry) => entry.teamId),
    ['team-1', 'team-2']
  );
  assert.equal(result.snapshot.eventSchedule.status, 'published');
  assert.equal(result.snapshot.documentRevisions.eventSchedule, 3);
  assert.equal(
    result.snapshot.revision,
    snapshot.revision,
    'schedule save must not bump draft revision'
  );
});

test('event schedule save drops blank and unknown team times before storage normalization', async () => {
  const adminStore = createAdminStore();
  const adapter = createAdminAllStarBohStoreAdapter(adminStore);
  const snapshot = await adapter.start();

  await adapter.dispatch({
    type: 'saveEventSchedule',
    payload: {
      expectedScheduleRevision: snapshot.documentRevisions.eventSchedule,
      schemaVersion: 1,
      seasonId: 'season-1',
      status: 'published',
      eventStartsAt: '2026-08-01T10:00:00.000Z',
      eventEndsAt: '2026-08-01T11:00:00.000Z',
      milestones: [],
      teamGameTimes: [
        { teamId: 'team-1', startsAt: '2026-08-01T10:05:00.000Z' },
        { teamId: 'team-2', startsAt: '' },
        { teamId: 'other-team', startsAt: '2026-08-01T10:15:00.000Z' },
      ],
    },
  });

  assert.deepEqual(adminStore.savedSchedules[0].input.teamGameTimes, [
    { teamId: 'team-1', startsAt: '2026-08-01T10:05:00.000Z' },
  ]);
  assert.deepEqual(adminStore.eventSchedule.teamGameTimes, [
    { teamId: 'team-1', startsAt: '2026-08-01T10:05:00.000Z' },
  ]);
});

test('event schedule subscription notifies without changing tactical revision or validation', async () => {
  const adminStore = createAdminStore();
  const adapter = createAdminAllStarBohStoreAdapter(adminStore);
  const current = await adapter.start();
  const received = [];
  adapter.subscribe((next) => received.push(next));

  adminStore.scheduleListener({
    schemaVersion: 1,
    seasonId: 'season-1',
    status: 'published',
    eventStartsAt: '2026-08-01T10:00:00.000Z',
    eventEndsAt: '2026-08-01T11:00:00.000Z',
    milestones: [],
    teamGameTimes: [],
    revision: 9,
  });

  assert.equal(received.at(-1).revision, current.revision);
  assert.deepEqual(received.at(-1).validation, current.validation);
  assert.equal(received.at(-1).documentRevisions.eventSchedule, 9);
});

test('instruction optional booleans round-trip exactly when present', async () => {
  const adminStore = createAdminStore({
    draft: {
      revision: 1,
      teamCount: 2,
      teamIds: ['team-1', 'team-2'],
      plan: {
        roleGroups: [{ id: 'role-1', label: 'Role 1', capacity: 12, order: 1 }],
        phases: [{ id: 'phase-1', label: 'Phase 1', startMinute: 0, endMinute: 30, order: 1 }],
        legions: [{ id: 'legion-1', label: 'Legion 1', order: 1 }],
        objectives: [],
        roleDefaults: [],
        seatOverrides: [],
        playerOverrides: [],
        instructions: [
          {
            id: 'existing-true-false',
            teamId: '*',
            phaseId: '*',
            legionId: '*',
            scope: 'global',
            scopeId: '*',
            order: 1,
            instruction: { summary: 'Stand by', standby: true, gatherCrystals: false },
          },
          {
            id: 'existing-missing',
            teamId: '*',
            phaseId: '*',
            legionId: '*',
            scope: 'global',
            scopeId: '*',
            order: 2,
            instruction: { summary: 'Move' },
          },
        ],
        rotations: [],
        notes: [],
      },
    },
  });
  const adapter = createAdminAllStarBohStoreAdapter(adminStore);
  const snapshot = await adapter.start();

  const existing = snapshot.plan.instructions.find((item) => item.id === 'existing-true-false');
  const missing = snapshot.plan.instructions.find((item) => item.id === 'existing-missing');
  assert.equal(existing.standby, true);
  assert.equal(existing.gatherCrystals, false);
  assert.equal(Object.hasOwn(missing, 'standby'), false);
  assert.equal(Object.hasOwn(missing, 'gatherCrystals'), false);

  await adapter.dispatch({
    type: 'saveInstruction',
    payload: {
      expectedRevision: snapshot.revision,
      teamId: 'team-1',
      phaseId: '*',
      legionId: '*',
      scope: 'global',
      scopeId: '*',
      action: 'Wait',
      instruction: 'Wait',
      standby: false,
      gatherCrystals: true,
    },
  });
  const savedInstruction = adminStore.savedDraft?.plan?.instructions?.find(
    (item) => item.instruction?.gatherCrystals === true
  );
  assert.equal(savedInstruction.instruction.standby, false);
  assert.equal(savedInstruction.instruction.gatherCrystals, true);
});

test('blank optional team game times are dropped before the schedule is submitted', async () => {
  const adminStore = createAdminStore();
  const adapter = createAdminAllStarBohStoreAdapter(adminStore);
  const snapshot = await adapter.start();

  await adapter.dispatch({
    type: 'saveEventSchedule',
    payload: {
      expectedScheduleRevision: snapshot.documentRevisions.eventSchedule,
      schemaVersion: 1,
      seasonId: 'season-1',
      status: 'published',
      eventStartsAt: '2026-08-01T10:00:00.000Z',
      eventEndsAt: '2026-08-01T11:00:00.000Z',
      milestones: [],
      teamGameTimes: [
        { teamId: 'team-1', startsAt: '2026-08-01T10:05:00.000Z' },
        { teamId: 'team-2', startsAt: '' },
      ],
    },
  });

  const submitted = adminStore.savedSchedules.at(-1).input;
  assert.deepEqual(submitted.teamGameTimes, [
    { teamId: 'team-1', startsAt: '2026-08-01T10:05:00.000Z' },
  ]);
  assert.equal(
    submitted.teamGameTimes.some((entry) => entry.startsAt === ''),
    false,
    'never submit a blank startsAt'
  );
  // The real canonical validator must accept what the admin actually submits.
  const normalized = normalizeAllStarBohEventSchedule(submitted);
  assert.deepEqual(normalized.teamGameTimes, [
    { teamId: 'team-1', startsAt: '2026-08-01T10:05:00.000Z' },
  ]);
});

test('a blank team game time would be rejected by the canonical validator', () => {
  assert.throws(
    () =>
      normalizeAllStarBohEventSchedule({
        seasonId: 'season-1',
        status: 'published',
        eventStartsAt: '2026-08-01T10:00:00.000Z',
        eventEndsAt: '2026-08-01T11:00:00.000Z',
        milestones: [],
        teamGameTimes: [{ teamId: 'team-1', startsAt: '' }],
      }),
    /canonical ISO timestamp/u
  );
});

test('hidden schedules save with no window, milestones, or team times', async () => {
  const adminStore = createAdminStore();
  const adapter = createAdminAllStarBohStoreAdapter(adminStore);
  const snapshot = await adapter.start();

  const result = await adapter.dispatch({
    type: 'saveEventSchedule',
    payload: {
      expectedScheduleRevision: snapshot.documentRevisions.eventSchedule,
      schemaVersion: 1,
      seasonId: 'season-1',
      status: 'hidden',
      eventStartsAt: '',
      eventEndsAt: '',
      milestones: [],
      teamGameTimes: [
        { teamId: 'team-1', startsAt: '' },
        { teamId: 'team-2', startsAt: '' },
      ],
    },
  });

  const submitted = adminStore.savedSchedules.at(-1).input;
  assert.equal(submitted.status, 'hidden');
  assert.equal(submitted.eventStartsAt, '');
  assert.equal(submitted.eventEndsAt, '');
  assert.deepEqual(submitted.teamGameTimes, []);
  // The canonical validator accepts an empty hidden schedule.
  const normalized = normalizeAllStarBohEventSchedule(submitted);
  assert.equal(normalized.status, 'hidden');
  assert.deepEqual(normalized.milestones, []);
  assert.deepEqual(normalized.teamGameTimes, []);
  assert.equal(result.snapshot.eventSchedule.status, 'hidden');
});

test('published schedules with an invalid window are rejected by the canonical validator', () => {
  assert.throws(
    () =>
      normalizeAllStarBohEventSchedule({
        seasonId: 'season-1',
        status: 'published',
        eventStartsAt: '2026-08-01T11:00:00.000Z',
        eventEndsAt: '2026-08-01T10:00:00.000Z',
        milestones: [],
        teamGameTimes: [],
      }),
    /must be ordered/u
  );
  assert.throws(
    () =>
      normalizeAllStarBohEventSchedule({
        seasonId: 'season-1',
        status: 'published',
        eventStartsAt: '',
        eventEndsAt: '',
        milestones: [],
        teamGameTimes: [],
      }),
    /canonical ISO timestamp/u
  );
  assert.throws(
    () =>
      normalizeAllStarBohEventSchedule({
        seasonId: 'season-1',
        status: 'published',
        eventStartsAt: '2026-08-01T10:00:00.000Z',
        eventEndsAt: '2026-08-01T11:00:00.000Z',
        milestones: [{ id: 'late', label: 'Late', startsAt: '2026-08-01T12:00:00.000Z' }],
        teamGameTimes: [],
      }),
    /within the event range/u
  );
});

function withTeams(adminStore, teamsById) {
  adminStore.getDraftTeam = async (teamId) => teamsById[teamId];
  return adminStore;
}

function seatsFor(number) {
  return Array.from({ length: 12 }, (_, index) => ({
    seatNumber: index + 1,
    playerId: `p${number}-${index + 1}`,
    gameName: `Player ${number}-${index + 1}`,
    roleGroupId: 'role-1',
  }));
}

test('a team with no authored plan receives a hydrated Stage-1 default plan', async () => {
  const adminStore = withTeams(createAdminStore(), {
    'team-1': { id: 'team-1', revision: 1, number: 1, name: 'Team 1', seats: seatsFor(1) },
    'team-2': { id: 'team-2', revision: 1, number: 2, name: 'Team 2', seats: seatsFor(2) },
  });
  const adapter = createAdminAllStarBohStoreAdapter(adminStore);
  const snapshot = await adapter.start();

  const team = snapshot.teams.find((entry) => entry.id === 'team-1');
  assert.equal(team.plan.planId, 'stage-1');
  assert.equal(team.plan.generated, true);
  // Stage-1 orders land as player override rules: 12 seats x 4 phases x 2 legions.
  assert.equal(team.plan.playerOverrides.length, 96);
  assert.equal(team.plan.phases.length, 4);
  assert.equal(team.plan.legions.length, 2);

  // Hydrated from that team's real ordered seats, never from hard-coded roster data.
  const seatOne = team.plan.playerOverrides.filter((item) => item.seatNumber === 1);
  assert.equal(seatOne.length, 8);
  assert.equal(seatOne[0].playerId, 'p1-1');
  assert.equal(seatOne[0].teamId, 'team-1');
  const seatTwelve = team.plan.playerOverrides.filter((item) => item.seatNumber === 12);
  assert.equal(seatTwelve[0].playerId, 'p1-12');

  // Typed instruction flags survive template hydration and are never defaulted onto every entry.
  const standby = team.plan.playerOverrides.filter((item) => item.instruction.standby === true);
  assert.ok(standby.length > 0, 'backup seats keep their typed standby flag');
  assert.ok(
    team.plan.playerOverrides.some((item) => !Object.hasOwn(item.instruction, 'standby')),
    'standby is not defaulted onto every instruction'
  );
  assert.ok(
    team.plan.playerOverrides.some((item) => !Object.hasOwn(item.instruction, 'gatherCrystals')),
    'gatherCrystals is not defaulted onto every instruction'
  );
});

test('an authored team plan is never overwritten by the Stage-1 default', async () => {
  const authored = {
    roleGroups: [],
    phases: [],
    legions: [],
    objectives: [],
    roleDefaults: [],
    seatOverrides: [],
    playerOverrides: [],
    instructions: [
      {
        id: 'authored-1',
        teamId: 'team-1',
        phaseId: 'phase-1',
        legionId: 'legion-1',
        scope: 'global',
        scopeId: '*',
        order: 1,
        instruction: { summary: 'Authored order' },
      },
    ],
    rotations: [],
    notes: [],
  };
  const source = {
    id: 'team-1',
    revision: 1,
    number: 1,
    name: 'Team 1',
    seats: seatsFor(1),
    plan: authored,
  };
  const adminStore = withTeams(createAdminStore(), {
    'team-1': source,
    'team-2': { id: 'team-2', revision: 1, number: 2, name: 'Team 2', seats: seatsFor(2) },
  });
  const adapter = createAdminAllStarBohStoreAdapter(adminStore);
  const snapshot = await adapter.start();

  const team = snapshot.teams.find((entry) => entry.id === 'team-1');
  assert.equal(team.plan.planId, undefined, 'authored plans are not stamped as generated');
  assert.equal(team.plan.instructions.length, 1);
  assert.equal(team.plan.instructions[0].id, 'authored-1');
  // The source team object must not be mutated.
  assert.equal(source.plan, authored);
  assert.equal(authored.instructions.length, 1);
  assert.notEqual(team.plan, authored, 'the materialized plan is a clone, not the source object');
});

test('two teams never share the same mutable default plan object', async () => {
  const adminStore = withTeams(createAdminStore(), {
    'team-1': { id: 'team-1', revision: 1, number: 1, name: 'Team 1', seats: seatsFor(1) },
    'team-2': { id: 'team-2', revision: 1, number: 2, name: 'Team 2', seats: seatsFor(2) },
  });
  const adapter = createAdminAllStarBohStoreAdapter(adminStore);
  const snapshot = await adapter.start();

  const [first, second] = snapshot.teams;
  assert.notEqual(first.plan, second.plan);
  assert.notEqual(first.plan.playerOverrides, second.plan.playerOverrides);
  assert.notEqual(first.plan.playerOverrides[0], second.plan.playerOverrides[0]);
  assert.notEqual(
    first.plan.playerOverrides[0].instruction,
    second.plan.playerOverrides[0].instruction
  );
  assert.equal(first.plan.playerOverrides[0].playerId, 'p1-1');
  assert.equal(second.plan.playerOverrides[0].playerId, 'p2-1');

  // Mutating one team's plan must never leak into another team's plan.
  first.plan.playerOverrides[0].instruction.action = 'MUTATED';
  assert.notEqual(second.plan.playerOverrides[0].instruction.action, 'MUTATED');
});
