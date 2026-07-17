import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildBohEpicPreferencesPayload,
  buildBohRouteDescriptor,
  buildBohSubmissionPayload,
  initializeAllStarBoh,
  parseBohInteger,
  parseBohPreferredTeammates,
  projectBohPlayerPlan,
  resolveBohEpicExpectedRevision,
  selectBohPlayerStates,
  selectBohSubmissionFeedback,
  selectBohTimelineView,
} from '../../js/all-star-boh.js';

function validSignup(overrides = {}) {
  return {
    gameName: 'VTS Player',
    timezone: 'UTC+2',
    totalCastlePower: '1,000,000,000',
    troopPower: '400000000',
    buildingPower: '100000000',
    technologyPower: '200000000',
    heroCombatPower: '200000000',
    dragonPower: '100000000',
    t9Types: ['cavalry', 'archers'],
    speedHeroes: ['lionheart'],
    level50Heroes: '8',
    rocLevel: '12',
    availability: 'all',
    fightingTimeIds: ['+8', '+12'],
    preferredRole: 'offensive',
    unavailableTimes: 'None',
    canTeleport: 'on',
    canUseVoice: 'on',
    planCommitment: 'on',
    playerNotes: 'Ready.',
    ...overrides,
  };
}

test('player state selection covers locked, unpublished, unassigned, and assigned states', () => {
  assert.deepEqual(selectBohPlayerStates({ accessGranted: false }), {
    announcement: 'locked',
    plan: 'locked',
  });
  assert.deepEqual(selectBohPlayerStates({ accessGranted: true }), {
    announcement: 'unpublished',
    plan: 'unpublished',
  });
  assert.deepEqual(
    selectBohPlayerStates({
      accessGranted: true,
      publication: { announcementPublished: true, planPublished: true },
    }),
    { announcement: 'unassigned', plan: 'unassigned' }
  );
  assert.deepEqual(
    selectBohPlayerStates({
      accessGranted: true,
      publication: { announcementPublished: true, planPublished: true },
      personalPlan: { teamId: 'team-3' },
    }),
    { announcement: 'assigned', plan: 'assigned' }
  );
});

test('strict numeric parsing accepts localized full integers and rejects abbreviations', () => {
  assert.equal(parseBohInteger('١٬٢٣٤٬٥٦٧'), 1_234_567);
  assert.equal(parseBohInteger('1 234 567'), 1_234_567);
  assert.throws(() => parseBohInteger('250M'), /full whole-number/u);
  assert.throws(() => parseBohInteger('12.5'), /full whole-number/u);
});

test('OCR submission is explicitly confirmed and cannot persist image data', () => {
  const review = {
    imageData: 'data:image/jpeg;base64,PRIVATE',
    requestId: 'request-1',
    warnings: ['Check technology power'],
    confidence: {
      overall: 0.82,
      totalCastlePower: 0.9,
      troopPower: 0.8,
      buildingPower: 0.8,
      technologyPower: 0.7,
      heroCombatPower: 0.9,
      dragonPower: 0.85,
    },
  };
  assert.throws(
    () =>
      buildBohSubmissionPayload(validSignup({ imageData: 'data:image/jpeg;base64,PRIVATE' }), {
        entryMethod: 'ocr',
        ocrReview: review,
        ocrValuesConfirmed: false,
      }),
    /explicitly confirm/u
  );

  const payload = buildBohSubmissionPayload(
    validSignup({ imageData: 'data:image/jpeg;base64,PRIVATE' }),
    {
      entryMethod: 'ocr',
      ocrReview: review,
      ocrValuesConfirmed: true,
      language: 'en',
      now: 1234,
    }
  );
  const serialized = JSON.stringify(payload);
  assert.equal(serialized.includes('imageData'), false);
  assert.equal(serialized.includes('PRIVATE'), false);
  assert.equal(payload.ocr.used, true);
  assert.equal(payload.ocr.valuesConfirmed, true);
  assert.equal(payload.stats.totalCastlePower, 1_000_000_000);
  assert.equal(payload.submittedAtMs, 1234);
});

test('resubmission preserves verified name history while adding the current game name', () => {
  const payload = buildBohSubmissionPayload(validSignup({ gameName: 'Current Name' }), {
    knownNames: ['Old Name', 'Current Name', ''],
  });

  assert.deepEqual(payload.knownNames, ['Current Name', 'Old Name']);
});

test('signup accepts up to six optional teammate names without duplicating the player or aliases', () => {
  assert.deepEqual(
    parseBohPreferredTeammates('Player Two, Player Three\nplayer two; VTS Player', {
      gameName: 'VTS Player',
    }),
    ['Player Two', 'Player Three']
  );
  const payload = buildBohSubmissionPayload(
    validSignup({ preferredTeammates: 'Player Two\nPlayer Three, player two' })
  );
  assert.deepEqual(payload.preferredTeammates, ['Player Two', 'Player Three']);
  assert.throws(
    () =>
      buildBohSubmissionPayload(
        validSignup({
          preferredTeammates: 'One, Two, Three, Four, Five, Six, Seven',
        })
      ),
    /no more than six/u
  );
});

test('signup keeps planning catalogs sparse and requires exactly two All-Star fighting times', () => {
  let modelOptions;
  const options = {
    heroNames: ['Hero Z', 'Hero A', 'Hero B'],
    researchTreeIds: ['tree-a', 'tree-b', 'tree-c'],
    model: {
      normalizeBohSignup(payload, receivedOptions) {
        modelOptions = receivedOptions;
        return payload;
      },
    },
  };
  const payload = buildBohSubmissionPayload(
    validSignup({
      usableHeroNames: ['hero b', 'HERO Z', 'hero b'],
      'researchProgressPct.tree-a': '0',
      'researchProgressPct.tree-b': '',
      'researchProgressPct.tree-c': '75',
      fightingTimeIds: ['+20', '+12'],
      preferredRole: '',
    }),
    options
  );

  assert.deepEqual(payload.stats.usableHeroNames, ['Hero Z', 'Hero B']);
  assert.deepEqual(payload.stats.researchProgressPct, { 'tree-a': 0, 'tree-c': 75 });
  assert.deepEqual(payload.commitment.fightingTimeIds, ['+12', '+20']);
  assert.equal(payload.commitment.preferredRole, '');
  assert.deepEqual(payload.rolePreferences, []);
  assert.deepEqual(modelOptions, {
    heroNames: options.heroNames,
    researchTreeIds: options.researchTreeIds,
    requireFightingTimeIds: true,
  });

  for (const fightingTimeIds of [['+8'], ['+8', '+12', '+14']]) {
    assert.throws(
      () => buildBohSubmissionPayload(validSignup({ fightingTimeIds }), options),
      /exactly two All-Star fighting times/u
    );
  }
  assert.throws(
    () => buildBohSubmissionPayload(validSignup({ fightingTimeIds: ['+8', '+10'] }), options),
    /unavailable option/u
  );
  assert.throws(
    () => buildBohSubmissionPayload(validSignup({ 'researchProgressPct.tree-a': '101' }), options),
    /outside the accepted range/u
  );
});

test('Epic Showdown payload keeps multiple lanes and configured game times independent', () => {
  assert.deepEqual(
    buildBohEpicPreferencesPayload(
      {
        epicGameName: 'Epic Player',
        epicLanePreferences: ['south', 'north'],
        epicTimePreferences: ['+8', '+12'],
      },
      { timeSlotIds: ['+8', '+10', '+12'] }
    ),
    {
      gameName: 'Epic Player',
      lanePreferences: ['south', 'north'],
      timePreferences: ['+8', '+12'],
    }
  );
  assert.throws(
    () =>
      buildBohEpicPreferencesPayload(
        {
          epicGameName: 'Epic Player',
          epicLanePreferences: ['center'],
          epicTimePreferences: ['+14'],
        },
        { timeSlotIds: ['+8', '+10', '+12'] }
      ),
    /no longer available/u
  );
  assert.throws(
    () => buildBohEpicPreferencesPayload({ epicLanePreferences: ['center'] }),
    /in-game name is required/u
  );
  assert.throws(
    () =>
      buildBohEpicPreferencesPayload({
        epicGameName: 'Epic Player',
        epicTimePreferences: ['+8'],
      }),
    /at least one position/u
  );
  assert.throws(
    () =>
      buildBohEpicPreferencesPayload({
        epicGameName: 'Epic Player',
        epicLanePreferences: ['center'],
      }),
    /at least one available game time/u
  );
});

test('Epic Showdown saves stay anchored to the revision visible when editing began', () => {
  const editBaseRevision = 2;
  const preferencesUpdatedBySubscription = { revision: 3 };
  assert.equal(
    resolveBohEpicExpectedRevision(preferencesUpdatedBySubscription, editBaseRevision),
    2
  );
  assert.equal(resolveBohEpicExpectedRevision(preferencesUpdatedBySubscription, null), 3);
});

test('feedback for any different submission revision is stale before its status is rendered', () => {
  for (const status of ['pending', 'confirmed', 'needs_correction', 'excluded']) {
    assert.equal(
      selectBohSubmissionFeedback(
        { revision: 8 },
        { status, submissionRevision: 7, reviewRevision: 3 }
      ).stale,
      true,
      status
    );
  }
  assert.equal(
    selectBohSubmissionFeedback(
      { revision: 8 },
      { status: 'confirmed', submissionRevision: 8, reviewRevision: 3 }
    ).stale,
    false
  );
  assert.equal(selectBohSubmissionFeedback({ revision: 8 }, null), null);
});

test('personal projection adapts published seats and selects Legion current/next inputs', () => {
  let projectionInput;
  const model = {
    projectBohPlayerTimeline(plan, team, playerId, options) {
      projectionInput = { plan, team, playerId, options };
      return [
        {
          phaseId: 'opening',
          phaseLabel: 'Opening',
          legionId: 'legion-2',
          startMinute: 0,
          endMinute: 5,
          roleLabel: 'Offensive',
          rotated: false,
          instruction: { action: 'Capture CC2', target: 'CC2' },
        },
        {
          phaseId: 'setup',
          phaseLabel: 'Setup',
          legionId: 'legion-2',
          startMinute: 5,
          endMinute: 10,
          roleLabel: 'Rune',
          rotated: true,
          instruction: { action: 'Take relay', target: 'RP2' },
        },
      ];
    },
  };
  const entries = projectBohPlayerPlan({
    model,
    personalPlan: { teamId: 'team-4', seatNumber: 7, plan: { id: 'published-plan' } },
    team: {
      teamId: 'team-4',
      seats: [{ playerId: 'player-7', displayName: 'Rune Runner', seatNumber: 7 }],
    },
    playerId: 'player-7',
    legionId: 'legion-2',
  });
  assert.equal(projectionInput.team.players[0].gameName, 'Rune Runner');
  assert.equal(projectionInput.playerId, 'player-7');
  assert.deepEqual(projectionInput.options, { legionId: 'legion-2' });

  const view = selectBohTimelineView(entries, {
    legionId: 'legion-2',
    phaseId: 'opening',
  });
  assert.equal(view.current.instruction.action, 'Capture CC2');
  assert.equal(view.next.instruction.action, 'Take relay');
  assert.equal(view.hasRotation, true);
});

test('route descriptor supplies matching visual path and text equivalent', () => {
  const route = buildBohRouteDescriptor(
    {
      instruction: {
        route: { start: 'spawn-a', via: 'tower-3', target: 'rune-a' },
      },
    },
    {
      objectives: [
        { id: 'spawn-a', label: 'South spawn', x: 5, y: 90 },
        { id: 'tower-3', label: 'Tower 3', x: 50, y: 50 },
        { id: 'rune-a', label: 'Primary Rune', x: 90, y: 10 },
      ],
    }
  );
  assert.equal(route.description, 'South spawn → Tower 3 → Primary Rune');
  assert.equal(route.path, 'M 68 367 L 320 215 L 544 63');
  assert.deepEqual(
    route.nodes.map(({ id, x, y, onRoute, isStart, isTarget }) => ({
      id,
      x,
      y,
      onRoute,
      isStart,
      isTarget,
    })),
    [
      { id: 'spawn-a', x: 68, y: 367, onRoute: true, isStart: true, isTarget: false },
      { id: 'tower-3', x: 320, y: 215, onRoute: true, isStart: false, isTarget: false },
      { id: 'rune-a', x: 544, y: 63, onRoute: true, isStart: false, isTarget: true },
    ]
  );
});

test('route descriptor never invents or bridges missing objective coordinates', () => {
  const noCoordinates = buildBohRouteDescriptor(
    { instruction: { pathObjectiveIds: ['spawn', 'rune'] } },
    {
      objectives: [
        { id: 'spawn', label: 'Spawn' },
        { id: 'rune', label: 'Rune' },
      ],
    }
  );
  assert.equal(noCoordinates.path, '');
  assert.deepEqual(noCoordinates.nodes, []);

  const missingVia = buildBohRouteDescriptor(
    { instruction: { pathObjectiveIds: ['spawn', 'relay', 'target'] } },
    {
      objectives: [
        { id: 'spawn', label: 'Spawn', x: 0, y: 100 },
        { id: 'relay', label: 'Relay' },
        { id: 'target', label: 'Target', x: 100, y: 0 },
      ],
    }
  );
  assert.equal(missingVia.path, '');
  assert.deepEqual(
    missingVia.nodes.map((node) => node.id),
    ['spawn', 'target']
  );

  const orderedPath = buildBohRouteDescriptor(
    {
      instruction: {
        pathObjectiveIds: ['spawn', 'relay', 'target'],
        route: { start: 'other-start', via: 'other-via', target: 'other-target' },
      },
    },
    {
      objectives: [
        { id: 'spawn', label: 'Spawn', x: 0, y: 100 },
        { id: 'relay', label: 'Relay', x: 50, y: 50 },
        { id: 'target', label: 'Target', x: 100, y: 0 },
        { id: 'other-start', label: 'Wrong start', x: 10, y: 10 },
        { id: 'other-via', label: 'Wrong via', x: 20, y: 20 },
        { id: 'other-target', label: 'Wrong target', x: 30, y: 30 },
      ],
    }
  );
  assert.equal(orderedPath.description, 'Spawn → Relay → Target');
  assert.deepEqual(
    orderedPath.nodes.filter((node) => node.onRoute).map((node) => node.id),
    ['spawn', 'relay', 'target']
  );
});

test('destroy removes every live listener and stops the injected store', async () => {
  const root = new EventTarget();
  const view = new EventTarget();
  view.getComputedStyle = () => ({ direction: 'ltr' });
  root.ownerDocument = { defaultView: view };
  root.querySelector = () => null;
  root.querySelectorAll = () => [];
  root.contains = () => true;

  let unsubscribed = 0;
  let stopped = 0;
  const unsubscribe = () => {
    unsubscribed += 1;
  };
  const store = {
    seasonId: 'season-2026',
    uid: 'player-7',
    subscribeSubmission(next) {
      next(null);
      return unsubscribe;
    },
    subscribeSubmissionFeedback(next) {
      next({ status: 'needs_correction', note: 'Confirm troop power.' });
      return unsubscribe;
    },
    subscribeEpicShowdownPreferences(next) {
      next({ lanePreferences: ['south'], timePreferences: ['+8'], revision: 1 });
      return unsubscribe;
    },
    subscribePublication(next) {
      next({ teamIds: ['team-1'] });
      return unsubscribe;
    },
    subscribePersonalPlan(next) {
      next({ teamId: 'team-1', seatNumber: 7, plan: {} });
      return unsubscribe;
    },
    subscribePublishedTeam(_teamId, next) {
      next({ teamId: 'team-1', name: 'One', number: 1, seats: [] });
      return unsubscribe;
    },
    async getSubmission() {
      return null;
    },
    async getSubmissionFeedback() {
      return { status: 'needs_correction', note: 'Confirm troop power.' };
    },
    async getEpicShowdownPreferences() {
      return { lanePreferences: ['south'], timePreferences: ['+8'], revision: 1 };
    },
    async getPublication() {
      return { teamIds: ['team-1'] };
    },
    async getPersonalPlan() {
      return { teamId: 'team-1', seatNumber: 7, plan: {} };
    },
    stop() {
      stopped += 1;
    },
  };

  const controller = initializeAllStarBoh({ root, store });
  await controller.refresh();
  controller.destroy();
  controller.destroy();
  assert.equal(unsubscribed, 6);
  assert.equal(stopped, 1);
});
