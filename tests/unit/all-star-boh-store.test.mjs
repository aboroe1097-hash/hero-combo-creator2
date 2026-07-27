import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ALL_STAR_BOH_CONFIG_PATH,
  ALL_STAR_BOH_ROOT_COLLECTION,
  AllStarBohAdminRequiredError,
  AllStarBohConflictError,
  AllStarBohPublishValidationError,
  AllStarBohValidationError,
  applyAllStarBohSubmissionCorrections,
  createAllStarBohAdminStore,
  createAllStarBohPlayerStore,
  getAllStarBohActiveConfig,
  getAllStarBohDraftPath,
  getAllStarBohDraftTeamPath,
  getAllStarBohEpicPreferencesPath,
  getAllStarBohFeedbackPath,
  getAllStarBohPublicationIndexPath,
  getAllStarBohPublishedPath,
  getAllStarBohPublishedPlayerPath,
  getAllStarBohPublishedTeamPath,
  getAllStarBohReviewPath,
  getAllStarBohEventSchedulePath,
  getAllStarBohSeasonPath,
  getAllStarBohSubmissionPath,
  normalizeAllStarBohDraft,
  normalizeAllStarBohFeedback,
  normalizeAllStarBohEpicPreferences,
  normalizeAllStarBohReview,
  normalizeAllStarBohSubmission,
} from '../../js/all-star-boh-store.js';
import {
  normalizeBohPlan,
  normalizeBohSignup,
  scoreBohSignup,
} from '../../js/all-star-boh-model.js';

const SERVER_TIMESTAMP = Object.freeze({ kind: 'server-timestamp' });
const SEASON_ID = 'season-2026';

function submission(gameName = '古風無道', overrides = {}) {
  return {
    gameName,
    knownNames: ['古风无道'],
    locale: 'zh',
    timezone: 'Africa/Cairo',
    entryMethod: 'ocr',
    status: 'submitted',
    stats: {
      totalPower: 1_000_000_000,
      troopPower: 100_000_000,
      buildingPower: 200_000_000,
      technologyPower: 300_000_000,
      heroPower: 250_000_000,
      dragonPower: 150_000_000,
    },
    readiness: {
      t9Types: ['cavalry', 'archers'],
      speedHeroes: ['lionheart'],
      level50Heroes: 9,
      rocLevel: 12,
    },
    rolePreferences: ['offensive'],
    eligibleRoleIds: ['offensive', 'rune'],
    commitment: {
      availability: 'all',
      preferredRole: 'offensive',
      secondaryRole: 'rune',
      canHelpLead: true,
      vts1097Member: true,
      contactNumber: '',
      currentState: '',
      joinReason: '',
      fightingTimeIds: ['+12', '+14'],
      teamNamePreferences: ['iron-wolves', 'frost-bears'],
      unavailableTimes: '',
      canTeleport: true,
      canUseVoice: false,
      planCommitment: true,
      notes: 'Ready for every match.',
    },
    ocr: {
      used: true,
      valuesConfirmed: true,
      confidence: 0.97,
      warnings: [],
      fieldConfidence: { troopPower: 0.99 },
    },
    ...overrides,
  };
}

function emptyPlan(overrides = {}) {
  return {
    id: 'plan-1',
    label: 'Main plan',
    roleGroups: [],
    phases: [],
    legions: [],
    objectives: [],
    roleDefaults: [],
    seatOverrides: [],
    playerOverrides: [],
    instructions: [],
    rotations: [],
    substitutions: [],
    playerResources: [],
    buildingAnnotations: [],
    notes: [],
    ...overrides,
  };
}

const RELEASE_ROLE_GROUPS = [
  { id: 'offensive', label: 'Offensive Team', capacity: 4, order: 1 },
  { id: 'rune', label: 'Rune Team', capacity: 2, order: 2 },
  { id: 'top', label: 'Top Side', capacity: 3, order: 3 },
  { id: 'bottom', label: 'Bottom Side', capacity: 3, order: 4 },
];
const RELEASE_PHASES = [
  { id: 'phase-0-5', label: '0–5 Minutes', startMinute: 0, endMinute: 5, order: 1 },
  { id: 'phase-5-10', label: '5–10 Minutes', startMinute: 5, endMinute: 10, order: 2 },
  { id: 'phase-10-15', label: '10–15 Minutes', startMinute: 10, endMinute: 15, order: 3 },
  { id: 'phase-15-30', label: '15–30 Minutes', startMinute: 15, endMinute: 30, order: 4 },
  { id: 'phase-30-60', label: '30–60 Minutes', startMinute: 30, endMinute: 60, order: 5 },
];
const RELEASE_LEGIONS = [
  { id: 'legion-1', label: 'Legion 1', order: 1 },
  { id: 'legion-2', label: 'Legion 2', order: 2 },
];

function releasePlan(overrides = {}) {
  return emptyPlan({
    roleGroups: RELEASE_ROLE_GROUPS,
    phases: RELEASE_PHASES,
    legions: RELEASE_LEGIONS,
    ...overrides,
  });
}

function seatRole(index) {
  if (index < 4) return { id: 'offensive', label: 'Offensive Team' };
  if (index < 6) return { id: 'rune', label: 'Rune Team' };
  if (index < 9) return { id: 'top', label: 'Top Side' };
  return { id: 'bottom', label: 'Bottom Side' };
}

function publishedTeam(teamId, playerIds = [], overrides = {}) {
  return {
    teamId,
    name: `Team ${teamId}`,
    number: Number(teamId.replace(/\D/g, '')) || 1,
    color: '#0ea5e9',
    captainId: playerIds[0] || '',
    seats: playerIds.map((playerId, index) => {
      const role = seatRole(index);
      return {
        id: `${teamId}-seat-${index + 1}`,
        rosterKey: `${teamId}-roster-${index + 1}`,
        seatNumber: index + 1,
        playerId,
        displayName: `Player ${playerId}`,
        roleGroupId: role.id,
        roleLabel: role.label,
        side: 'top',
        lane: 'center',
        locked: true,
        score: 123_456,
      };
    }),
    plan: emptyPlan(),
    scoreTotal: 999_999,
    scoreAverage: 99_999,
    notes: 'Private team note',
    ...overrides,
  };
}

function publishedPlayer(uid, teamId = 'team-1', overrides = {}) {
  return {
    uid,
    playerId: overrides.playerId || uid,
    displayName: `Player ${uid}`,
    teamId,
    teamName: `Team ${teamId}`,
    teamNumber: Number(teamId.replace(/\D/g, '')) || 1,
    teamColor: '#0ea5e9',
    seatNumber: 1,
    roleGroupId: 'offensive',
    roleLabel: 'Offensive',
    announcement: 'You are assigned to Team 1.',
    plan: emptyPlan(),
    ...overrides,
  };
}

function publishedTimeline(player, plan) {
  return plan.legions.flatMap((legion) =>
    plan.phases.map((phase) => ({
      teamId: player.teamId,
      playerId: player.playerId,
      gameName: player.displayName,
      phaseId: phase.id,
      phaseLabel: phase.label,
      startMinute: phase.startMinute,
      endMinute: phase.endMinute,
      legionId: legion.id,
      legionLabel: legion.label,
      seatNumber: player.seatNumber,
      baseSeatNumber: player.seatNumber,
      roleGroupId: player.roleGroupId,
      roleLabel: player.roleLabel,
      rotated: false,
      instruction: {
        action: 'Build Towers',
        target: `${phase.id}-${legion.id}`,
        loadout: 'T1s',
      },
    }))
  );
}

function completePublicationBundle(options = {}) {
  const planPublished = options.planPublished === true;
  const teamCount = options.teamCount ?? 6;
  const teams = {};
  const players = {};
  let playerNumber = 0;
  for (let teamNumber = 1; teamNumber <= teamCount; teamNumber += 1) {
    const teamId = `team-${teamNumber}`;
    const stablePlayerIds = [];
    for (let seatIndex = 0; seatIndex < 12; seatIndex += 1) {
      playerNumber += 1;
      stablePlayerIds.push(`stable-player-${playerNumber}`);
    }
    teams[teamId] = publishedTeam(teamId, stablePlayerIds, {
      number: teamNumber,
      plan: releasePlan({ id: `${teamId}-plan` }),
    });
    stablePlayerIds.forEach((playerId, seatIndex) => {
      const uid = `firebase-uid-${teamNumber}-${seatIndex + 1}`;
      const role = seatRole(seatIndex);
      const playerPlan = releasePlan({ id: `${teamId}-${playerId}-plan` });
      const player = publishedPlayer(uid, teamId, {
        playerId,
        displayName: `Player ${playerId}`,
        teamName: `Team ${teamId}`,
        teamNumber,
        seatNumber: seatIndex + 1,
        roleGroupId: role.id,
        roleLabel: role.label,
        plan: playerPlan,
      });
      player.timeline = publishedTimeline(player, playerPlan);
      players[uid] = player;
    });
  }
  return {
    current: {
      status: planPublished ? 'plan' : 'announcement',
      eventName: 'All-Star BoH 2026',
      title: planPublished ? 'Team plans published' : 'Teams announced',
      announcementPublished: true,
      planPublished,
      teamCount,
      rosterSize: 12,
      teamIds: Object.keys(teams),
      phases: planPublished ? RELEASE_PHASES : [],
      legions: planPublished ? RELEASE_LEGIONS : [],
    },
    teams,
    players,
  };
}

function submissionSeedsForPublication(bundle) {
  return Object.fromEntries(
    Object.entries(bundle.players).map(([uid, player]) => [
      getAllStarBohSubmissionPath(SEASON_ID, uid),
      {
        seasonId: SEASON_ID,
        uid,
        playerId: player.playerId,
        status: 'submitted',
        revision: 1,
      },
    ])
  );
}

function reviewSeedsForPublication(bundle, submissionRevision = 1) {
  return Object.fromEntries(
    Object.keys(bundle.players).map((uid) => [
      getAllStarBohReviewPath(SEASON_ID, uid),
      {
        seasonId: SEASON_ID,
        uid,
        submissionRevision,
        status: 'verified',
        revision: 1,
      },
    ])
  );
}

function draftSeedsForPublication(bundle, revision = 1) {
  return {
    [getAllStarBohDraftPath(SEASON_ID)]: {
      seasonId: SEASON_ID,
      revision,
    },
    ...Object.fromEntries(
      Object.keys(bundle.teams).map((teamId) => [
        getAllStarBohDraftTeamPath(SEASON_ID, teamId),
        { seasonId: SEASON_ID, teamId, revision },
      ])
    ),
  };
}

function publicationSourceOptions(bundle, revision = 1) {
  return {
    sourceDraftRevision: revision,
    sourceTeamRevisions: Object.fromEntries(
      Object.keys(bundle.teams).map((teamId) => [teamId, revision])
    ),
  };
}

function storedSubmission(uid, revision, input = submission()) {
  return {
    ...normalizeAllStarBohSubmission(input),
    seasonId: SEASON_ID,
    uid,
    schemaVersion: 1,
    revision,
    createdAt: { toMillis: () => 1_700_000_000_000 },
    updatedAt: { toMillis: () => 1_700_000_000_100 },
    updatedBy: uid,
  };
}

function directChildPaths(documents, collectionPath) {
  const prefix = `${collectionPath}/`;
  return [...documents.keys()].filter((path) => {
    if (!path.startsWith(prefix)) return false;
    return !path.slice(prefix.length).includes('/');
  });
}

function cloneForFake(value) {
  if (Array.isArray(value)) return value.map(cloneForFake);
  if (value && typeof value === 'object') {
    if (typeof value.toMillis === 'function') return value;
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, cloneForFake(item)])
    );
  }
  return value;
}

function createFirestoreFake(initial = {}, options = {}) {
  const documents = new Map(
    Object.entries(initial).map(([path, value]) => [path, cloneForFake(value)])
  );
  const listeners = new Map();
  let transactionCount = 0;
  let getDocsCount = 0;
  let getDocCount = 0;

  function docSnapshot(path) {
    return {
      id: path.split('/').pop(),
      ref: { path },
      exists: () => documents.has(path),
      data: () => (documents.has(path) ? cloneForFake(documents.get(path)) : undefined),
    };
  }

  function collectionSnapshot(path) {
    return {
      docs: directChildPaths(documents, path).map(docSnapshot),
      forEach(callback) {
        this.docs.forEach(callback);
      },
    };
  }

  function snapshot(ref) {
    return ref.kind === 'collection' ? collectionSnapshot(ref.path) : docSnapshot(ref.path);
  }

  function parentCollectionPath(path) {
    return path.split('/').slice(0, -1).join('/');
  }

  function notifyRef(kind, path) {
    for (const listener of listeners.get(`${kind}:${path}`) || []) {
      listener.next(snapshot({ kind, path }));
    }
  }

  function notifyDocument(path) {
    notifyRef('doc', path);
    notifyRef('collection', parentCollectionPath(path));
  }

  const firestore = {
    doc(_db, ...segments) {
      const path = segments.join('/');
      return { kind: 'doc', path, id: path.split('/').pop() };
    },
    collection(_db, ...segments) {
      const path = segments.join('/');
      return { kind: 'collection', path, id: path.split('/').pop() };
    },
    async getDoc(ref) {
      getDocCount += 1;
      return snapshot(ref);
    },
    async getDocs(ref) {
      getDocsCount += 1;
      return snapshot(ref);
    },
    onSnapshot(ref, next, error) {
      const key = `${ref.kind}:${ref.path}`;
      const entries = listeners.get(key) || [];
      const entry = { next, error };
      entries.push(entry);
      listeners.set(key, entries);
      next(snapshot(ref));
      return () => {
        const active = listeners.get(key) || [];
        listeners.set(
          key,
          active.filter((candidate) => candidate !== entry)
        );
      };
    },
    async runTransaction(_db, callback) {
      transactionCount += 1;
      const attempts = Math.max(1, Number(options.transactionAttempts) || 1);
      let result;
      let finalOperations = [];
      for (let attempt = 0; attempt < attempts; attempt += 1) {
        const operations = [];
        let writesStarted = false;
        const transaction = {
          async get(ref) {
            if (writesStarted) throw new Error('Firestore transactions must read before writing.');
            return snapshot(ref);
          },
          set(ref, payload) {
            writesStarted = true;
            operations.push({ type: 'set', path: ref.path, payload: cloneForFake(payload) });
          },
          delete(ref) {
            writesStarted = true;
            operations.push({ type: 'delete', path: ref.path });
          },
        };
        result = await callback(transaction);
        finalOperations = operations;
      }
      if (options.failCommit === true) throw new Error('Synthetic commit failure');
      const changedPaths = new Set();
      for (const operation of finalOperations) {
        if (operation.type === 'set') documents.set(operation.path, operation.payload);
        else documents.delete(operation.path);
        changedPaths.add(operation.path);
      }
      changedPaths.forEach(notifyDocument);
      return result;
    },
    serverTimestamp() {
      return SERVER_TIMESTAMP;
    },
  };

  return {
    firestore,
    read(path) {
      return documents.has(path) ? cloneForFake(documents.get(path)) : undefined;
    },
    write(path, value) {
      documents.set(path, cloneForFake(value));
      notifyDocument(path);
    },
    listenerCount(kind, path) {
      return (listeners.get(`${kind}:${path}`) || []).length;
    },
    get transactionCount() {
      return transactionCount;
    },
    get getDocsCount() {
      return getDocsCount;
    },
    get getDocCount() {
      return getDocCount;
    },
  };
}

test('All-Star BoH path helpers use the season-scoped collection and reject path injection', () => {
  assert.equal(ALL_STAR_BOH_CONFIG_PATH, 'boh_allstar_config/current');
  assert.equal(ALL_STAR_BOH_ROOT_COLLECTION, 'boh_allstar');
  assert.equal(getAllStarBohSeasonPath(SEASON_ID), 'boh_allstar/season-2026');
  assert.equal(
    getAllStarBohSubmissionPath(SEASON_ID, 'player-1'),
    'boh_allstar/season-2026/submissions/player-1'
  );
  assert.equal(
    getAllStarBohReviewPath(SEASON_ID, 'player-1'),
    'boh_allstar/season-2026/reviews/player-1'
  );
  assert.equal(
    getAllStarBohFeedbackPath(SEASON_ID, 'player-1'),
    'boh_allstar/season-2026/feedback/player-1'
  );
  assert.equal(
    getAllStarBohEpicPreferencesPath(SEASON_ID, 'player-1'),
    'boh_allstar/season-2026/epicPreferences/player-1'
  );
  assert.equal(getAllStarBohDraftPath(SEASON_ID), 'boh_allstar/season-2026/drafts/current');
  assert.equal(
    getAllStarBohPublicationIndexPath(SEASON_ID),
    'boh_allstar/season-2026/drafts/publication-index'
  );
  assert.equal(
    getAllStarBohDraftTeamPath(SEASON_ID, 'team-1'),
    'boh_allstar/season-2026/draftTeams/team-1'
  );
  assert.equal(getAllStarBohPublishedPath(SEASON_ID), 'boh_allstar/season-2026/published/current');
  assert.equal(
    getAllStarBohPublishedTeamPath(SEASON_ID, 'team-1'),
    'boh_allstar/season-2026/publishedTeams/team-1'
  );
  assert.equal(
    getAllStarBohPublishedPlayerPath(SEASON_ID, 'player-1'),
    'boh_allstar/season-2026/publishedPlayers/player-1'
  );
  assert.equal(
    getAllStarBohEventSchedulePath(SEASON_ID),
    'boh_allstar/season-2026/schedules/current'
  );
  assert.throws(() => getAllStarBohSeasonPath('../other'), AllStarBohValidationError);
  assert.throws(
    () => getAllStarBohSubmissionPath(SEASON_ID, 'other/player'),
    AllStarBohValidationError
  );
});

test('admin season config reads the authoritative document and fails closed when invalid', async () => {
  const configured = createFirestoreFake({
    [ALL_STAR_BOH_CONFIG_PATH]: {
      activeSeason: 'boh-2026-finals',
      open: false,
      grantDurationMinutes: 720,
    },
  });
  assert.deepEqual(await getAllStarBohActiveConfig({ db: {}, firestore: configured.firestore }), {
    activeSeason: 'boh-2026-finals',
    open: false,
    grantDurationMinutes: 720,
  });
  assert.equal(configured.getDocCount, 1);

  const missing = createFirestoreFake();
  await assert.rejects(
    getAllStarBohActiveConfig({ db: {}, firestore: missing.firestore }),
    /active All-Star BoH season is not configured/
  );

  for (const invalidConfig of [
    { activeSeason: '../season', open: true, grantDurationMinutes: 720 },
    { activeSeason: SEASON_ID, open: 'yes', grantDurationMinutes: 720 },
    { activeSeason: SEASON_ID, open: true },
    { activeSeason: SEASON_ID, open: true, grantDurationMinutes: 10_081 },
  ]) {
    const invalid = createFirestoreFake({ [ALL_STAR_BOH_CONFIG_PATH]: invalidConfig });
    await assert.rejects(
      getAllStarBohActiveConfig({ db: {}, firestore: invalid.firestore }),
      AllStarBohValidationError
    );
  }
});

test('event schedule store APIs use independent current path and optimistic revision', async () => {
  const fake = createFirestoreFake();
  const admin = createAllStarBohAdminStore({
    db: {},
    firestore: fake.firestore,
    seasonId: SEASON_ID,
    uid: 'admin-1',
    admin: true,
  });
  const player = createAllStarBohPlayerStore({
    db: {},
    firestore: fake.firestore,
    seasonId: SEASON_ID,
    uid: 'player-1',
  });
  assert.equal(typeof admin.getEventSchedule, 'function');
  assert.equal(typeof admin.subscribeEventSchedule, 'function');
  assert.equal(typeof admin.saveEventSchedule, 'function');
  assert.equal(typeof player.getEventSchedule, 'function');
  assert.equal(typeof player.subscribeEventSchedule, 'function');
  assert.equal('saveEventSchedule' in player, false);

  const saved = await admin.saveEventSchedule(
    {
      seasonId: SEASON_ID,
      status: 'published',
      eventStartsAt: '2026-07-20T18:00:00.000Z',
      eventEndsAt: '2026-07-24T18:00:00.000Z',
      milestones: [{ id: 'm1', label: 'Check in', startsAt: '2026-07-21T18:00:00.000Z' }],
      teamGameTimes: [{ teamId: 'team-1', startsAt: '2026-07-22T18:00:00.000Z' }],
    },
    { expectedRevision: 0, teamIds: ['team-1', 'team-2'] }
  );
  assert.equal(saved.revision, 1);
  assert.deepEqual(saved.createdAt, SERVER_TIMESTAMP);
  assert.equal(fake.read(getAllStarBohEventSchedulePath(SEASON_ID)).revision, 1);
  assert.equal((await player.getEventSchedule()).teamGameTimes[0].teamId, 'team-1');

  const updates = [];
  const unsubscribe = player.subscribeEventSchedule((value) => updates.push(value));
  assert.equal(updates.length, 1);
  await admin.saveEventSchedule(
    { seasonId: SEASON_ID, status: 'hidden', revision: 1 },
    { expectedRevision: 1, teamIds: ['team-1', 'team-2'] }
  );
  assert.equal(updates.length, 2);
  assert.equal(updates[1].status, 'hidden');
  assert.deepEqual(updates[1].teamGameTimes, []);
  unsubscribe();

  await assert.rejects(
    admin.saveEventSchedule(
      { seasonId: SEASON_ID, status: 'hidden', revision: 1 },
      { expectedRevision: 1, teamIds: ['team-1', 'team-2'] }
    ),
    (error) =>
      error instanceof AllStarBohConflictError &&
      error.path === getAllStarBohEventSchedulePath(SEASON_ID) &&
      error.expectedRevision === 1 &&
      error.actualRevision === 2
  );
});

test('player store exposes only own-document methods and serializes an allowlisted signup', async () => {
  const fake = createFirestoreFake();
  const path = getAllStarBohSubmissionPath(SEASON_ID, 'player-1');
  const store = createAllStarBohPlayerStore({
    db: {},
    firestore: fake.firestore,
    seasonId: SEASON_ID,
    uid: 'player-1',
  });

  assert.equal('listSubmissions' in store, false);
  assert.equal('getReview' in store, false);
  assert.equal('publish' in store, false);

  const first = await store.saveSubmission({
    ...submission(),
    preferredTeammates: ['  \uFF2Date One ', 'Mate One', 'Mate\u0000 Two'],
    stats: { ...submission().stats, bohUsefulRating: 100 },
    uid: 'player-1',
    seasonId: SEASON_ID,
    createdAt: 'client-forged-time',
    adminScore: 999_999,
    review: { status: 'verified' },
  });

  assert.equal(first.uid, 'player-1');
  assert.equal(first.playerId, 'player-1');
  assert.equal(first.seasonId, SEASON_ID);
  assert.equal(first.revision, 1);
  assert.deepEqual(first.createdAt, SERVER_TIMESTAMP);
  assert.equal(first.stats.totalCastlePower, 1_000_000_000);
  assert.equal(first.stats.heroCombatPower, 250_000_000);
  assert.deepEqual(first.stats.t9TroopTypes, ['cavalry', 'archers']);
  assert.equal(first.stats.level50HeroCount, 9);
  assert.equal('bohUsefulRating' in first.stats, false);
  assert.equal(first.commitment.canUseVoice, false);
  assert.deepEqual(first.preferredTeammates, ['Mate One', 'Mate Two']);
  assert.equal('adminScore' in first, false);
  assert.equal('review' in first, false);

  const second = await store.saveSubmission(
    { ...submission('古風無道 II'), revision: 1, createdAt: 'different-client-time' },
    { expectedRevision: 1 }
  );
  assert.equal(second.revision, 2);
  assert.equal(second.playerId, 'player-1');
  assert.deepEqual(second.createdAt, SERVER_TIMESTAMP);
  assert.equal(second.gameName, '古風無道 II');
  assert.equal(fake.read(path).revision, 2);
  assert.equal(fake.read(path).createdAt.kind, 'server-timestamp');

  await assert.rejects(
    store.saveSubmission({ ...submission(), uid: 'player-2' }),
    /uid cannot be changed/
  );
  await assert.rejects(
    store.saveSubmission(
      { ...submission(), playerId: 'different-stable-player', revision: 2 },
      { expectedRevision: 2 }
    ),
    /playerId cannot be changed/
  );
  await assert.rejects(
    store.saveSubmission({ ...submission(), screenshotBase64: 'data:image/png;base64,AAAA' }),
    /cannot be persisted|image data URL/
  );
  assert.equal(fake.transactionCount, 2);
});

test('signup planning fields are catalog-ordered, sparse, and require two times on new saves', async () => {
  const heroNames = ['Hero Z', 'Hero A', 'Hero B'];
  const researchTreeIds = ['development', 'combat', 'advanced'];
  const fake = createFirestoreFake();
  const path = getAllStarBohSubmissionPath(SEASON_ID, 'planner-1');
  const store = createAllStarBohPlayerStore({
    db: {},
    firestore: fake.firestore,
    seasonId: SEASON_ID,
    uid: 'planner-1',
    heroNames,
    researchTreeIds,
  });
  const base = submission('Planning Player');
  const saved = await store.saveSubmission({
    ...base,
    stats: {
      ...base.stats,
      usableHeroNames: ['hero b', 'HERO Z'],
      researchProgressPct: { advanced: '', combat: 0, development: '75' },
    },
    commitment: {
      ...base.commitment,
      preferredRole: '',
      fightingTimeIds: ['+16', '+12'],
    },
  });

  assert.deepEqual(saved.stats.usableHeroNames, ['Hero Z', 'Hero B']);
  assert.deepEqual(saved.stats.readySpeedHeroes, ['lionheart']);
  assert.deepEqual(saved.stats.researchProgressPct, { development: 75, combat: 0 });
  assert.deepEqual(Object.keys(saved.stats.researchProgressPct), ['development', 'combat']);
  assert.equal(saved.commitment.preferredRole, '');
  assert.deepEqual(saved.commitment.fightingTimeIds, ['+12', '+16']);
  assert.equal(saved.commitment.secondaryRole, 'rune');
  assert.equal(saved.commitment.canHelpLead, true);
  assert.deepEqual(saved.commitment.teamNamePreferences, ['iron-wolves', 'frost-bears']);

  const legacyStored = fake.read(path);
  delete legacyStored.commitment.fightingTimeIds;
  fake.write(path, legacyStored);
  assert.deepEqual((await store.getSubmission()).commitment.fightingTimeIds, []);

  legacyStored.commitment.fightingTimeIds = ['+8', '+20'];
  fake.write(path, legacyStored);
  assert.deepEqual((await store.getSubmission()).commitment.fightingTimeIds, ['+8', '+20']);

  await assert.rejects(
    store.saveSubmission(
      {
        ...base,
        commitment: { ...base.commitment, fightingTimeIds: ['+8', '+20'] },
        revision: 1,
      },
      { expectedRevision: 1 }
    ),
    /Fighting times contains an unsupported value/
  );

  await assert.rejects(
    store.saveSubmission(
      {
        ...base,
        commitment: { ...base.commitment, fightingTimeIds: [] },
        revision: 1,
      },
      { expectedRevision: 1 }
    ),
    /Exactly two fighting times are required/
  );
  await assert.rejects(
    store.saveSubmission(
      {
        ...base,
        stats: { ...base.stats, usableHeroNames: ['Unknown Hero'] },
        revision: 1,
      },
      { expectedRevision: 1 }
    ),
    /outside its catalog/
  );
  await assert.rejects(
    store.saveSubmission(
      {
        ...base,
        stats: { ...base.stats, researchProgressPct: { development: 101 } },
        revision: 1,
      },
      { expectedRevision: 1 }
    ),
    /between 0 and 100/
  );
  assert.equal(fake.read(path).revision, 1);
});

test('aggregate troop estimates round-trip through the existing troopRoster contract', () => {
  const normalized = normalizeAllStarBohSubmission(
    submission('Estimated Troops', {
      stats: {
        totalPower: 1_000_000_000,
        troopPower: 100_000_000,
        buildingPower: 200_000_000,
        technologyPower: 300_000_000,
        heroPower: 250_000_000,
        dragonPower: 150_000_000,
        troopRoster: ['estimate|lofty|7000000', 'estimate|t10|2500000'],
      },
    })
  );

  assert.deepEqual(normalized.stats.troopRoster, [
    'estimate|lofty|7000000',
    'estimate|t10|2500000',
  ]);
  assert.equal(Object.hasOwn(normalized.stats, 'troopEstimateLofty'), false);
  assert.equal(Object.hasOwn(normalized.stats, 'troopEstimateT10'), false);
});

test('Epic Showdown preferences have an independent per-player revision and configurable times', async () => {
  const fake = createFirestoreFake();
  const submissionPath = getAllStarBohSubmissionPath(SEASON_ID, 'player-1');
  const epicPath = getAllStarBohEpicPreferencesPath(SEASON_ID, 'player-1');
  const store = createAllStarBohPlayerStore({
    db: {},
    firestore: fake.firestore,
    seasonId: SEASON_ID,
    uid: 'player-1',
    epicTimeSlotIds: ['+8', '+10', '+12', 'reset-2'],
  });

  assert.deepEqual(store.epicTimeSlotIds, ['+8', '+10', '+12', 'reset-2']);
  assert.equal(Object.isFrozen(store.epicTimeSlotIds), true);
  await store.saveSubmission(submission('Independent signup'));
  const snapshots = [];
  const unsubscribe = store.subscribeEpicShowdownPreferences((value) => snapshots.push(value));
  assert.deepEqual(snapshots, [null]);

  const first = await store.saveEpicShowdownPreferences({
    gameName: '  \uFF21bo\u0000 Epic ',
    lanePreferences: ['North', 'south'],
    timePreferences: ['+8', 'reset-2'],
  });
  assert.equal(first.revision, 1);
  assert.equal(first.gameName, 'Abo Epic');
  assert.deepEqual(first.lanePreferences, ['north', 'south']);
  assert.deepEqual(first.timePreferences, ['+8', 'reset-2']);
  assert.equal(fake.read(submissionPath).revision, 1);
  assert.equal(fake.read(epicPath).revision, 1);
  assert.equal(snapshots.length, 2);

  const second = await store.saveEpicShowdownPreferences(
    {
      gameName: 'Abo Epic II',
      lanePreferences: ['center'],
      timePreferences: ['+12'],
      revision: 1,
    },
    { expectedRevision: 1 }
  );
  assert.equal(second.revision, 2);
  assert.deepEqual(await store.getEpicShowdownPreferences(), {
    ...second,
    createdAtMs: null,
    updatedAtMs: null,
  });
  assert.equal(fake.read(submissionPath).revision, 1);
  unsubscribe();

  await assert.rejects(
    store.saveEpicShowdownPreferences(
      { gameName: 'Abo Epic II', lanePreferences: ['east'], timePreferences: [], revision: 2 },
      { expectedRevision: 2 }
    ),
    /unsupported value/
  );
  await assert.rejects(
    store.saveEpicShowdownPreferences(
      {
        gameName: 'Abo Epic II',
        lanePreferences: ['center'],
        timePreferences: ['+14'],
        revision: 2,
      },
      { expectedRevision: 2 }
    ),
    /not configured/
  );
  assert.equal(fake.read(epicPath).revision, 2);
});

test('Epic preference serializer is allowlisted and the admin store observes the season collection', async () => {
  assert.throws(
    () => normalizeAllStarBohEpicPreferences({ lanePreferences: [], timePreferences: [] }),
    /game name is required/
  );
  assert.throws(
    () =>
      normalizeAllStarBohEpicPreferences({
        gameName: 'x'.repeat(161),
        lanePreferences: [],
        timePreferences: [],
      }),
    /exceeds 160 characters/
  );
  assert.throws(
    () =>
      normalizeAllStarBohEpicPreferences({
        gameName: 'Missing lane',
        lanePreferences: [],
        timePreferences: ['+8'],
      }),
    /at least one Epic Showdown position/
  );
  assert.throws(
    () =>
      normalizeAllStarBohEpicPreferences({
        gameName: 'Missing time',
        lanePreferences: ['center'],
        timePreferences: [],
      }),
    /at least one Epic Showdown game time/
  );
  assert.deepEqual(
    normalizeAllStarBohEpicPreferences({
      gameName: '  Epic\u0000 Player ',
      lanePreferences: ['SOUTH', 'center'],
      timePreferences: ['+10'],
      submissionRevision: 99,
      scoringLock: true,
    }),
    {
      gameName: 'Epic Player',
      lanePreferences: ['south', 'center'],
      timePreferences: ['+10'],
    }
  );
  assert.throws(
    () =>
      normalizeAllStarBohEpicPreferences({
        gameName: 'Unsafe',
        lanePreferences: [],
        timePreferences: [],
        screenshotBase64: 'data:image/png;base64,AAAA',
      }),
    /cannot be persisted|image data URL/
  );

  const playerPath = getAllStarBohEpicPreferencesPath(SEASON_ID, 'player-1');
  const fake = createFirestoreFake({
    [playerPath]: {
      gameName: 'Epic One',
      lanePreferences: ['north'],
      timePreferences: ['+8'],
      seasonId: SEASON_ID,
      uid: 'player-1',
      revision: 1,
      schemaVersion: 1,
      updatedBy: 'player-1',
    },
  });
  const admin = createAllStarBohAdminStore({
    db: {},
    firestore: fake.firestore,
    seasonId: SEASON_ID,
    uid: 'admin-1',
    admin: true,
  });
  assert.deepEqual(admin.epicTimeSlotIds, ['+6', '+8', '+10', '+12', '+14', '+16', '+18', '+20']);
  const listed = await admin.getEpicShowdownPreferencesList();
  assert.equal(listed.length, 1);
  assert.equal(listed[0].uid, 'player-1');
  assert.equal(listed[0].gameName, 'Epic One');
  assert.deepEqual(listed[0].lanePreferences, ['north']);

  const snapshots = [];
  const unsubscribe = await admin.subscribeEpicShowdownPreferences((value) =>
    snapshots.push(value)
  );
  assert.equal(snapshots.length, 1);
  fake.write(getAllStarBohEpicPreferencesPath(SEASON_ID, 'player-2'), {
    gameName: 'Epic Two',
    lanePreferences: ['south', 'center'],
    timePreferences: ['+10', '+12'],
    seasonId: SEASON_ID,
    uid: 'player-2',
    revision: 1,
    schemaVersion: 1,
    updatedBy: 'player-2',
  });
  assert.equal(snapshots.at(-1).length, 2);
  unsubscribe();
});

test('submission writes enforce cloud revisions and immutable stored identity', async () => {
  const path = getAllStarBohSubmissionPath(SEASON_ID, 'player-1');
  const original = storedSubmission('player-1', 2, submission('Current'));
  const fake = createFirestoreFake({ [path]: original });
  const store = createAllStarBohPlayerStore({
    db: {},
    firestore: fake.firestore,
    seasonId: SEASON_ID,
    uid: 'player-1',
  });

  await assert.rejects(
    store.saveSubmission(submission('Stale'), { expectedRevision: 1 }),
    (error) =>
      error instanceof AllStarBohConflictError &&
      error.expectedRevision === 1 &&
      error.actualRevision === 2
  );
  assert.equal(fake.read(path).gameName, 'Current');

  fake.write(path, { ...original, uid: 'player-2' });
  await assert.rejects(
    store.saveSubmission(submission('Denied'), { expectedRevision: 2 }),
    /Stored uid does not match/
  );
  assert.equal(fake.read(path).gameName, 'Current');

  await assert.rejects(
    store.saveSubmission(submission(), { expectedRevision: -1 }),
    /non-negative integer/
  );
});

test('player snapshots refresh live, return deep-cloned data, and unsubscribe cleanly', async () => {
  const path = getAllStarBohSubmissionPath(SEASON_ID, 'player-1');
  const fake = createFirestoreFake();
  const store = createAllStarBohPlayerStore({
    db: {},
    firestore: fake.firestore,
    seasonId: SEASON_ID,
    uid: 'player-1',
  });
  const snapshots = [];
  const unsubscribe = store.subscribeSubmission((value) => snapshots.push(value));
  assert.deepEqual(snapshots, [null]);

  await store.saveSubmission(submission('Live player'));
  assert.equal(snapshots.length, 2);
  assert.equal(snapshots[1].gameName, 'Live player');
  snapshots[1].stats.t9TroopTypes.push('mutated');
  const reread = await store.getSubmission();
  assert.deepEqual(reread.stats.t9TroopTypes, ['cavalry', 'archers']);
  assert.equal(reread.createdAtMs, null);

  unsubscribe();
  fake.write(path, storedSubmission('player-1', 2, submission('After unsubscribe')));
  assert.equal(snapshots.length, 2);

  const personalSnapshots = [];
  store.subscribePersonalPlan((value) => personalSnapshots.push(value));
  assert.deepEqual(personalSnapshots, [null]);
  store.stop();
  fake.write(getAllStarBohPublishedPlayerPath(SEASON_ID, 'player-1'), {
    ...publishedPlayer('player-1'),
    seasonId: SEASON_ID,
    uid: 'player-1',
    revision: 1,
    schemaVersion: 1,
  });
  assert.deepEqual(personalSnapshots, [null]);
  assert.equal(fake.listenerCount('doc', path), 0);
});

test('admin methods preflight caller-provided admin context before reads, listeners, or writes', async () => {
  const fake = createFirestoreFake();
  const store = createAllStarBohAdminStore({
    db: {},
    firestore: fake.firestore,
    seasonId: SEASON_ID,
    uid: 'admin-1',
    admin: false,
  });

  await assert.rejects(store.listSubmissions(), AllStarBohAdminRequiredError);
  await assert.rejects(
    store.subscribeSubmissions(() => {}),
    AllStarBohAdminRequiredError
  );
  await assert.rejects(store.getEpicShowdownPreferencesList(), AllStarBohAdminRequiredError);
  await assert.rejects(
    store.subscribeEpicShowdownPreferences(() => {}),
    AllStarBohAdminRequiredError
  );
  await assert.rejects(
    store.saveReview('player-1', { status: 'verified' }),
    AllStarBohAdminRequiredError
  );
  await assert.rejects(
    store.deleteSubmission('player-1', { expectedRevision: 1 }),
    AllStarBohAdminRequiredError
  );
  await assert.rejects(store.saveDraft({ title: 'Denied' }), AllStarBohAdminRequiredError);
  assert.equal(fake.getDocsCount, 0);
  assert.equal(fake.transactionCount, 0);
  assert.equal(
    fake.listenerCount('collection', `${getAllStarBohSeasonPath(SEASON_ID)}/submissions`),
    0
  );
});

test('admin deletion removes signup data in one transaction while preserving Epic preferences', async () => {
  const uid = 'player-1';
  const storedPlayerId = 'stable-player-1';
  const submissionPath = getAllStarBohSubmissionPath(SEASON_ID, uid);
  const reviewPath = getAllStarBohReviewPath(SEASON_ID, uid);
  const feedbackPath = getAllStarBohFeedbackPath(SEASON_ID, uid);
  const epicPreferencesPath = getAllStarBohEpicPreferencesPath(SEASON_ID, uid);
  const draftPath = getAllStarBohDraftPath(SEASON_ID);
  const team1Path = getAllStarBohDraftTeamPath(SEASON_ID, 'team-1');
  const team2Path = getAllStarBohDraftTeamPath(SEASON_ID, 'team-2');
  const targetRule = (id, playerIdValue) => ({
    id,
    teamId: '*',
    phaseId: '*',
    legionId: '*',
    playerId: playerIdValue,
    scope: 'player',
    order: 1,
    instruction: { summary: 'Player instruction' },
  });
  const initial = {
    [submissionPath]: { uid, playerId: storedPlayerId, seasonId: SEASON_ID, revision: 3 },
    [reviewPath]: { uid, seasonId: SEASON_ID, revision: 2 },
    [feedbackPath]: { uid, seasonId: SEASON_ID, revision: 1 },
    [epicPreferencesPath]: {
      uid,
      seasonId: SEASON_ID,
      revision: 4,
      gameName: 'Epic Player',
      lanePreferences: ['center'],
      timePreferences: ['+14'],
    },
    [draftPath]: {
      seasonId: SEASON_ID,
      revision: 5,
      teamCount: 2,
      teamIds: ['team-1', 'team-2'],
      playerIds: [uid, storedPlayerId, 'other-player'],
      forcedTeamAssignments: [
        { playerId: storedPlayerId, teamId: 'team-1' },
        { playerId: 'other-player', teamId: 'team-2' },
      ],
      commitmentScoreAdjustments: [
        { playerId: uid, score: 100, reason: 'Target' },
        { playerId: 'other-player', score: 200, reason: 'Keep' },
      ],
      scoreOverrides: [
        { playerId: storedPlayerId, score: 300, reason: 'Target' },
        { playerId: 'other-player', score: 400, reason: 'Keep' },
      ],
      plan: emptyPlan({
        roleDefaults: [
          targetRule('target-role-default', uid),
          targetRule('keep-role-default', 'other-player'),
        ],
        seatOverrides: [
          targetRule('target-seat-override', storedPlayerId),
          targetRule('keep-seat-override', 'other-player'),
        ],
        playerOverrides: [
          targetRule('target-override', storedPlayerId),
          targetRule('keep-override', 'other-player'),
        ],
        instructions: [
          targetRule('target-instruction', uid),
          targetRule('keep-instruction', 'other-player'),
        ],
        rotations: [
          {
            id: 'target-rotation',
            teamId: '*',
            phaseId: '*',
            legionId: '*',
            playerId: storedPlayerId,
            seatNumber: 1,
            order: 1,
          },
          {
            id: 'keep-rotation',
            teamId: '*',
            phaseId: '*',
            legionId: '*',
            playerId: 'other-player',
            seatNumber: 2,
            order: 2,
          },
        ],
      }),
    },
    [team1Path]: {
      ...publishedTeam('team-1', [storedPlayerId, 'other-player']),
      seasonId: SEASON_ID,
      teamId: 'team-1',
      revision: 7,
      seats: publishedTeam('team-1', [storedPlayerId, 'other-player']).seats.map((seat, index) => ({
        ...seat,
        totalCastlePower: index === 0 ? 987_654_321 : 123_456_789,
      })),
    },
    [team2Path]: {
      ...publishedTeam('team-2', ['team-2-player']),
      seasonId: SEASON_ID,
      teamId: 'team-2',
      revision: 4,
      captainId: storedPlayerId,
      plan: emptyPlan({
        roleDefaults: [
          targetRule('team-target-role-default', storedPlayerId),
          targetRule('team-keep-role-default', 'other-player'),
        ],
        seatOverrides: [
          targetRule('team-target-seat-override', uid),
          targetRule('team-keep-seat-override', 'other-player'),
        ],
        playerOverrides: [
          targetRule('team-target-player-override', storedPlayerId),
          targetRule('team-keep-player-override', 'other-player'),
        ],
        instructions: [
          targetRule('team-target-instruction', uid),
          targetRule('team-keep-instruction', 'other-player'),
        ],
        rotations: [
          {
            id: 'team-target-rotation',
            teamId: 'team-2',
            phaseId: '*',
            legionId: '*',
            playerId: storedPlayerId,
            seatNumber: 1,
            order: 1,
          },
          {
            id: 'team-keep-rotation',
            teamId: 'team-2',
            phaseId: '*',
            legionId: '*',
            playerId: 'other-player',
            seatNumber: 2,
            order: 2,
          },
        ],
      }),
    },
  };
  const fake = createFirestoreFake(initial);
  const store = createAllStarBohAdminStore({
    db: {},
    firestore: fake.firestore,
    seasonId: SEASON_ID,
    uid: 'admin-1',
    admin: true,
  });

  assert.deepEqual(await store.deleteSubmission(uid, { expectedRevision: 3 }), {
    uid,
    deleted: true,
  });
  assert.equal(fake.read(submissionPath), undefined);
  assert.equal(fake.read(reviewPath), undefined);
  assert.equal(fake.read(feedbackPath), undefined);
  assert.equal(fake.read(epicPreferencesPath)?.gameName, 'Epic Player');
  assert.equal(fake.read(epicPreferencesPath)?.revision, 4);
  const savedDraft = fake.read(draftPath);
  assert.equal(savedDraft.revision, 6);
  assert.deepEqual(savedDraft.playerIds, ['other-player']);
  assert.deepEqual(savedDraft.forcedTeamAssignments, [
    { playerId: 'other-player', teamId: 'team-2' },
  ]);
  assert.deepEqual(
    savedDraft.commitmentScoreAdjustments.map((item) => item.playerId),
    ['other-player']
  );
  assert.deepEqual(
    savedDraft.scoreOverrides.map((item) => item.playerId),
    ['other-player']
  );
  assert.deepEqual(
    savedDraft.plan.roleDefaults.map((item) => item.playerId),
    ['other-player']
  );
  assert.deepEqual(
    savedDraft.plan.seatOverrides.map((item) => item.playerId),
    ['other-player']
  );
  assert.deepEqual(
    savedDraft.plan.playerOverrides.map((item) => item.playerId),
    ['other-player']
  );
  assert.deepEqual(
    savedDraft.plan.instructions.map((item) => item.playerId),
    ['other-player']
  );
  assert.deepEqual(
    savedDraft.plan.rotations.map((item) => item.playerId),
    ['other-player']
  );
  const savedTeam1 = fake.read(team1Path);
  assert.equal(savedTeam1.revision, 8);
  assert.equal(savedTeam1.captainId, '');
  assert.equal(savedTeam1.seats[0].playerId, '');
  assert.equal(savedTeam1.seats[0].displayName, '');
  assert.equal(savedTeam1.seats[0].locked, false);
  assert.equal(savedTeam1.seats[0].score, null);
  assert.equal(Object.hasOwn(savedTeam1.seats[0], 'totalCastlePower'), false);
  assert.equal(savedTeam1.seats[1].playerId, 'other-player');
  const savedTeam2 = fake.read(team2Path);
  assert.equal(savedTeam2.revision, 5);
  assert.equal(savedTeam2.captainId, '');
  assert.equal(savedTeam2.seats[0].playerId, 'team-2-player');
  for (const key of [
    'roleDefaults',
    'seatOverrides',
    'playerOverrides',
    'instructions',
    'rotations',
  ]) {
    assert.deepEqual(
      savedTeam2.plan[key].map((item) => item.playerId),
      ['other-player'],
      key
    );
  }
  assert.equal(fake.transactionCount, 1);

  for (const failureOptions of [
    { expectedRevision: 2, fakeOptions: {} },
    { expectedRevision: 3, fakeOptions: { failCommit: true } },
  ]) {
    const failingFake = createFirestoreFake(initial, failureOptions.fakeOptions);
    const failingStore = createAllStarBohAdminStore({
      db: {},
      firestore: failingFake.firestore,
      seasonId: SEASON_ID,
      uid: 'admin-1',
      admin: true,
    });
    await assert.rejects(
      failingStore.deleteSubmission(uid, { expectedRevision: failureOptions.expectedRevision }),
      failureOptions.fakeOptions.failCommit ? /Synthetic commit failure/ : AllStarBohConflictError
    );
    for (const [path, value] of Object.entries(initial)) {
      assert.deepEqual(failingFake.read(path), value);
    }
  }
});

test('admin deletion reads fallback teams for incomplete legacy drafts and rolls back atomically', async () => {
  for (const fixture of [
    { label: 'empty team IDs', teamIds: [], fallbackTeamId: 'team-2' },
    { label: 'short team IDs', teamIds: ['custom-team'], fallbackTeamId: 'team-1' },
  ]) {
    const uid = `legacy-${fixture.fallbackTeamId}`;
    const submissionPath = getAllStarBohSubmissionPath(SEASON_ID, uid);
    const draftPath = getAllStarBohDraftPath(SEASON_ID);
    const fallbackTeamPath = getAllStarBohDraftTeamPath(SEASON_ID, fixture.fallbackTeamId);
    const initial = {
      [submissionPath]: { uid, playerId: uid, seasonId: SEASON_ID, revision: 2 },
      [draftPath]: {
        seasonId: SEASON_ID,
        revision: 3,
        teamCount: 2,
        teamIds: fixture.teamIds,
        playerIds: [uid],
      },
      [fallbackTeamPath]: {
        ...publishedTeam(fixture.fallbackTeamId, [uid]),
        seasonId: SEASON_ID,
        teamId: fixture.fallbackTeamId,
        revision: 4,
      },
    };
    const failingFake = createFirestoreFake(initial, { failCommit: true });
    const failingStore = createAllStarBohAdminStore({
      db: {},
      firestore: failingFake.firestore,
      seasonId: SEASON_ID,
      uid: 'admin-1',
      admin: true,
    });
    await assert.rejects(
      failingStore.deleteSubmission(uid, { expectedRevision: 2 }),
      /Synthetic commit failure/,
      fixture.label
    );
    for (const [path, value] of Object.entries(initial)) {
      assert.deepEqual(failingFake.read(path), value, `${fixture.label}: ${path}`);
    }

    const refreshedFake = createFirestoreFake(initial);
    const refreshedStore = createAllStarBohAdminStore({
      db: {},
      firestore: refreshedFake.firestore,
      seasonId: SEASON_ID,
      uid: 'admin-1',
      admin: true,
    });
    await refreshedStore.deleteSubmission(uid, { expectedRevision: 2 });
    assert.equal(refreshedFake.read(submissionPath), undefined, fixture.label);
    const savedTeam = refreshedFake.read(fallbackTeamPath);
    assert.equal(savedTeam.revision, 5, fixture.label);
    assert.equal(savedTeam.seats[0].playerId, '', fixture.label);
    assert.equal(savedTeam.captainId, '', fixture.label);
  }
});

test('private plan substitutions and resource annotations persist through the store allowlist', () => {
  const draft = normalizeAllStarBohDraft({
    title: 'Private plan schema',
    plan: emptyPlan({
      substitutions: [
        {
          teamId: 'team-1',
          backupPlayerId: 'provider:backup-1',
          replacesPlayerId: 'starter-1',
          entryMinute: 30,
          note: 'Backup enters on the call.',
          ignoredField: 'drop-me',
        },
      ],
      playerResources: [
        {
          playerId: 'provider:backup-1',
          meritBudget: 7000,
          queueCapacity: 3,
          allianceTeleport: true,
          skillReservations: [
            { id: 'battlefield-teleport', meritCost: 5, effect: { allianceTeleports: 4 } },
            { id: 'rapid-freeze' },
          ],
        },
        { playerId: 'starter-1' },
      ],
      buildingAnnotations: [
        {
          buildingId: 'center-tower',
          note: 'Configurable marching or occupation speed; queue capacity may vary.',
          buff: 50,
        },
      ],
    }),
  });

  assert.deepEqual(draft.plan.substitutions, [
    {
      id: 'substitution-1',
      teamId: 'team-1',
      backupPlayerId: 'provider:backup-1',
      replacesPlayerId: 'starter-1',
      entryMinute: 30,
      order: 1,
      note: 'Backup enters on the call.',
    },
  ]);
  assert.deepEqual(draft.plan.playerResources, [
    {
      playerId: 'provider:backup-1',
      meritBudget: 7000,
      queueCapacity: 3,
      skillReservations: [
        {
          id: 'battlefield-teleport',
          meritCost: 1000,
          order: 1,
          effect: { personalTeleports: 1 },
        },
        { id: 'rapid-freeze', meritCost: 3000, order: 2, effect: {} },
      ],
    },
    { playerId: 'starter-1', meritBudget: null, queueCapacity: null, skillReservations: [] },
  ]);
  assert.deepEqual(draft.plan.buildingAnnotations, [
    {
      id: 'building-annotation-1',
      buildingId: 'center-tower',
      note: 'Configurable marching or occupation speed; queue capacity may vary.',
      order: 1,
    },
  ]);
  assert.equal('ignoredField' in draft.plan.substitutions[0], false);
  assert.equal('allianceTeleport' in draft.plan.playerResources[0], false);
  assert.equal('buff' in draft.plan.buildingAnnotations[0], false);
  assert.equal(
    normalizeAllStarBohDraft({
      plan: emptyPlan({
        substitutions: Array.from({ length: 11 }, (_, index) => ({
          teamId: 'team-1',
          backupPlayerId: `backup-${index + 1}`,
          replacesPlayerId: `starter-${index + 1}`,
          entryMinute: index + 3,
        })),
      }),
    }).plan.substitutions.length,
    11
  );

  assert.throws(
    () =>
      normalizeAllStarBohDraft({
        plan: emptyPlan({
          substitutions: [
            {
              id: 'swap-1',
              teamId: 'team-1',
              backupPlayerId: 'p1',
              replacesPlayerId: 'p1',
              entryMinute: 30,
            },
          ],
        }),
      }),
    /different incoming and outgoing/
  );
  assert.throws(
    () =>
      normalizeAllStarBohDraft({
        plan: emptyPlan({
          substitutions: [
            {
              id: 'swap-1',
              teamId: 'team-1',
              backupPlayerId: 'backup-1',
              replacesPlayerId: 'starter-1',
              entryMinute: 30,
            },
            {
              id: 'swap-2',
              teamId: 'team-1',
              backupPlayerId: 'backup-2',
              replacesPlayerId: 'starter-1',
              entryMinute: 40,
            },
          ],
        }),
      }),
    /Outgoing player starter-1 has multiple substitutions/
  );
  assert.throws(
    () =>
      normalizeAllStarBohDraft({
        plan: emptyPlan({
          playerResources: [
            { playerId: 'p1', skillReservations: [{ id: 'meteor-fall' }] },
            { playerId: 'p1' },
          ],
        }),
      }),
    /Duplicate player resource/
  );
  assert.throws(
    () =>
      normalizeAllStarBohDraft({
        plan: emptyPlan({ playerResources: [{ playerId: 'p1', queueCapacity: 5 }] }),
      }),
    /queue capacity must be between 1 and 4/
  );
});
test('draft and private review extensions normalize legacy values and reject unsafe input', () => {
  const legacyDraft = normalizeAllStarBohDraft({ title: 'Legacy draft' });
  assert.equal(legacyDraft.teamCount, 6);
  assert.equal(legacyDraft.balanceMetric, 'score');
  assert.deepEqual(legacyDraft.forcedTeamAssignments, []);
  assert.deepEqual(legacyDraft.epicPlanningOverrides, []);
  assert.deepEqual(legacyDraft.commitmentScoreAdjustments, []);
  assert.equal(legacyDraft.title, 'Legacy draft');
  assert.deepEqual(legacyDraft.publicationCopy, {
    eventName: '',
    title: '',
    subtitle: '',
    message: '',
  });

  const configuredDraft = normalizeAllStarBohDraft({
    teamCount: 2,
    balanceMetric: ' totalPower ',
    teamIds: ['team-1', 'team-2'],
    forcedTeamAssignments: [
      { playerId: ' player-1 ', teamId: ' team-2 ' },
      { playerId: 'Player_2', teamId: 'team-1' },
    ],
    epicPlanningOverrides: [
      { playerId: ' player-1 ', excluded: true, laneOverride: ' NORTH ', groupId: ' Turkish ' },
      { playerId: 'Player_2', laneOverride: '', groupId: '' },
    ],
    publicationCopy: {
      eventName: ' All-Star BoH Finals ',
      title: ' Teams are ready ',
      subtitle: ' Review your assignment. ',
      message: ' Follow leadership calls. ',
    },
  });
  assert.equal(configuredDraft.teamCount, 2);
  assert.equal(configuredDraft.balanceMetric, 'totalPower');
  assert.deepEqual(configuredDraft.forcedTeamAssignments, [
    { playerId: 'player-1', teamId: 'team-2' },
    { playerId: 'Player_2', teamId: 'team-1' },
  ]);
  assert.deepEqual(configuredDraft.epicPlanningOverrides, [
    { playerId: 'player-1', excluded: true, laneOverride: 'north', groupId: 'Turkish' },
    { playerId: 'Player_2', excluded: false, laneOverride: '', groupId: '' },
  ]);
  assert.deepEqual(configuredDraft.publicationCopy, {
    eventName: 'All-Star BoH Finals',
    title: 'Teams are ready',
    subtitle: 'Review your assignment.',
    message: 'Follow leadership calls.',
  });
  assert.throws(
    () => normalizeAllStarBohDraft({ publicationCopy: 'not-an-object' }),
    AllStarBohValidationError
  );
  for (const publicationCopy of [
    { eventName: 'x'.repeat(161) },
    { title: 'x'.repeat(161) },
    { subtitle: 'x'.repeat(241) },
    { message: 'x'.repeat(2001) },
  ]) {
    assert.throws(() => normalizeAllStarBohDraft({ publicationCopy }), AllStarBohValidationError);
  }

  const balancedDraft = normalizeAllStarBohDraft({
    balanceMetric: ' balanced ',
    commitmentScoreAdjustments: [
      {
        playerId: ' user:provider/abc@example.com ',
        score: '1,000',
        reason: ' Strong commitment audit. ',
      },
      { playerId: 'Player', score: 2 },
      { playerId: 'player', score: 3 },
    ],
  });
  assert.equal(balancedDraft.balanceMetric, 'balanced');
  assert.deepEqual(balancedDraft.commitmentScoreAdjustments, [
    {
      playerId: 'user:provider/abc@example.com',
      score: 1000,
      reason: 'Strong commitment audit.',
    },
    { playerId: 'Player', score: 2, reason: '' },
    { playerId: 'player', score: 3, reason: '' },
  ]);

  for (const teamCount of [null, 1, 7, 2.5]) {
    assert.throws(() => normalizeAllStarBohDraft({ teamCount }), AllStarBohValidationError);
  }
  for (const balanceMetric of [null, 'Score', 'totalpower', 'garbage']) {
    assert.throws(() => normalizeAllStarBohDraft({ balanceMetric }), AllStarBohValidationError);
  }
  assert.throws(
    () =>
      normalizeAllStarBohDraft({
        forcedTeamAssignments: [
          { playerId: ' player-1 ', teamId: 'team-1' },
          { playerId: 'player-1', teamId: 'team-2' },
        ],
      }),
    /more than one forced team assignment/
  );
  assert.throws(
    () =>
      normalizeAllStarBohDraft({
        forcedTeamAssignments: Array.from({ length: 73 }, (_, index) => ({
          playerId: `player-${index + 1}`,
          teamId: 'team-1',
        })),
      }),
    /exceeds 72 items/
  );
  for (const epicPlanningOverrides of [
    [{ playerId: 'player-1', laneOverride: 'top' }],
    [
      { playerId: 'player-1', laneOverride: 'north' },
      { playerId: 'player-1', laneOverride: 'south' },
    ],
    Array.from({ length: 73 }, (_, index) => ({ playerId: `player-${index + 1}` })),
  ]) {
    assert.throws(
      () => normalizeAllStarBohDraft({ epicPlanningOverrides }),
      AllStarBohValidationError
    );
  }
  for (const commitmentScoreAdjustments of [
    [null],
    [{ playerId: 'player-1' }],
    [{ playerId: 'player-1', score: null }],
    [{ playerId: 'player-1', score: 1.5 }],
    [{ playerId: 'player-1', score: 0 }],
    [{ playerId: 'player-1', score: 10_001 }],
    [{ playerId: 'player-1', score: 1, reason: 'x'.repeat(2001) }],
    [
      { playerId: 'player-1', score: 1 },
      { playerId: 'player-1', score: 2 },
    ],
    Array.from({ length: 73 }, (_, index) => ({ playerId: `player-${index + 1}`, score: 1 })),
  ]) {
    assert.throws(
      () => normalizeAllStarBohDraft({ commitmentScoreAdjustments }),
      AllStarBohValidationError
    );
  }

  const legacyReview = normalizeAllStarBohReview({ status: 'verified' });
  assert.equal('statCorrections' in legacyReview, false);
  assert.equal('gameNameCorrection' in legacyReview, false);
  const nullableLegacyReview = normalizeAllStarBohReview({
    statCorrections: null,
    gameNameCorrection: null,
  });
  assert.deepEqual(nullableLegacyReview.statCorrections, {});
  assert.equal('gameNameCorrection' in nullableLegacyReview, false);

  const correctedReview = normalizeAllStarBohReview({
    status: 'verified',
    gameNameCorrection: {
      corrected: ' \uff23afe\u0301\u0007   Prime ',
      reason: ' Requested by captain ',
    },
    statCorrections: {
      totalCastlePower: {
        corrected: '1,000,000,000,000',
        reason: ' OCR recheck ',
      },
      rocLevel: { corrected: 160, reason: ' Profile verified ' },
      unknownLegacyStat: { corrected: -1, reason: 'ignored' },
    },
  });
  assert.deepEqual(correctedReview.gameNameCorrection, {
    corrected: 'Caf\u00e9 Prime',
    reason: 'Requested by captain',
  });
  assert.deepEqual(correctedReview.statCorrections, {
    totalCastlePower: { corrected: 1_000_000_000_000, reason: 'OCR recheck' },
    rocLevel: { corrected: 160, reason: 'Profile verified' },
  });

  for (const review of [
    { gameNameCorrection: { corrected: '', reason: '' } },
    { gameNameCorrection: { corrected: 'x'.repeat(161), reason: 'Required reason' } },
    { gameNameCorrection: { corrected: 'Player', reason: ' ' } },
    { gameNameCorrection: { corrected: 'Player', reason: 'x'.repeat(501) } },
    { statCorrections: { troopPower: { corrected: -1, reason: 'Required reason' } } },
    {
      statCorrections: {
        troopPower: { corrected: Number.POSITIVE_INFINITY, reason: 'Required reason' },
      },
    },
    {
      statCorrections: { troopPower: { corrected: 10 ** 12 + 1, reason: 'Required reason' } },
    },
    { statCorrections: { rocLevel: { corrected: 161, reason: 'Required reason' } } },
    { statCorrections: { rocLevel: { corrected: ' ', reason: 'Required reason' } } },
    { statCorrections: { rocLevel: { corrected: 1, reason: ' ' } } },
    { statCorrections: { rocLevel: { corrected: 1, reason: 'x'.repeat(501) } } },
  ]) {
    assert.throws(() => normalizeAllStarBohReview(review), AllStarBohValidationError);
  }
});

test('draft balanced metric and commitment score adjustments round-trip without changing score overrides', async () => {
  const draftPath = getAllStarBohDraftPath(SEASON_ID);
  const fake = createFirestoreFake();
  const admin = createAllStarBohAdminStore({
    db: {},
    firestore: fake.firestore,
    seasonId: SEASON_ID,
    uid: 'admin-1',
    admin: true,
  });

  const draft = await admin.saveDraft({
    title: 'Balanced commitment draft',
    balanceMetric: ' balanced ',
    commitmentScoreAdjustments: [
      { playerId: ' player-1 ', score: '100', reason: ' Reliable planner. ' },
      { playerId: 'player-2', score: 10_000, reason: '' },
    ],
    scoreOverrides: [
      { playerId: 'player-1', score: -50, reason: 'Legacy score override remains separate.' },
    ],
    publicationCopy: {
      eventName: ' Summer event ',
      title: ' Teams are live ',
      subtitle: ' Check your route. ',
      message: ' Be online ten minutes early. ',
    },
    plan: emptyPlan(),
  });

  assert.equal(draft.balanceMetric, 'balanced');
  assert.deepEqual(draft.commitmentScoreAdjustments, [
    { playerId: 'player-1', score: 100, reason: 'Reliable planner.' },
    { playerId: 'player-2', score: 10_000, reason: '' },
  ]);
  assert.deepEqual(draft.scoreOverrides, [
    { playerId: 'player-1', score: -50, reason: 'Legacy score override remains separate.' },
  ]);
  assert.deepEqual(draft.publicationCopy, {
    eventName: 'Summer event',
    title: 'Teams are live',
    subtitle: 'Check your route.',
    message: 'Be online ten minutes early.',
  });
  assert.deepEqual(fake.read(draftPath).publicationCopy, draft.publicationCopy);
  assert.deepEqual((await admin.getDraft()).publicationCopy, draft.publicationCopy);
  assert.deepEqual(
    fake.read(draftPath).commitmentScoreAdjustments,
    draft.commitmentScoreAdjustments
  );
  assert.deepEqual(
    (await admin.getDraft()).commitmentScoreAdjustments,
    draft.commitmentScoreAdjustments
  );
});

test('submission correction overlay normalizes every field family and takes precedence over legacy corrections', () => {
  const heroNames = ['Hero A', 'Hero B', 'Hero C'];
  const researchTreeIds = ['development', 'combat'];
  const base = {
    ...normalizeAllStarBohSubmission(
      submission('Original Player', {
        stats: {
          ...submission().stats,
          unitSpecialtyPower: 10,
          artifactPower: 20,
          royalTechPower: 30,
          troopRoster: ['estimate|lofty|7000000'],
          usableHeroNames: ['Hero A'],
          researchProgressPct: { development: 50 },
        },
      }),
      { heroNames, researchTreeIds, requireFightingTimeIds: true, requireVtsMembership: true }
    ),
    revision: 7,
  };
  const originalBase = cloneForFake(base);
  const normalizedReview = normalizeAllStarBohReview({
    submissionRevision: 7,
    status: 'verified',
    gameNameCorrection: { corrected: 'Legacy Name', reason: 'Legacy name audit' },
    statCorrections: { troopPower: { corrected: 111, reason: 'Legacy stat audit' } },
    submissionCorrection: {
      schemaVersion: 1,
      reason: 'Full profile audit',
      changedFields: ['uid', 'stats.totalCastlePower'],
      values: {
        gameName: ' Final Player ',
        locale: '',
        timezone: ' UTC ',
        preferredTeammates: [],
        stats: {
          totalCastlePower: '2,000,000',
          troopPower: 222,
          buildingPower: 111,
          technologyPower: 0,
          heroCombatPower: 333,
          dragonPower: 444,
          unitSpecialtyPower: 666,
          artifactPower: null,
          royalTechPower: null,
          rocLevel: 20,
          level50HeroCount: 4,
          t9TroopTypes: [],
          t10TroopTypes: ['cavalry'],
          readySpeedHeroes: [],
          troopRoster: ['estimate|t10|2500000'],
          usableHeroNames: ['Hero B', 'Hero A'],
          researchProgressPct: { combat: '100' },
        },
        commitment: {
          availability: 'backup',
          unavailableTimes: '',
          preferredRole: 'top',
          secondaryRole: 'bottom',
          canHelpLead: null,
          vts1097Member: false,
          contactNumber: '555-0100',
          currentState: 'State 1097',
          joinReason: 'Captain verified transfer details.',
          fightingTimeIds: ['+14', '+12'],
          teamNamePreferences: [],
          canTeleport: null,
          canUseVoice: false,
          planCommitment: true,
          notes: '',
        },
      },
    },
  });

  assert.deepEqual(normalizedReview.submissionCorrection.changedFields, [
    'gameName',
    'locale',
    'timezone',
    'preferredTeammates',
    'stats.totalCastlePower',
    'stats.troopPower',
    'stats.buildingPower',
    'stats.technologyPower',
    'stats.heroCombatPower',
    'stats.dragonPower',
    'stats.unitSpecialtyPower',
    'stats.artifactPower',
    'stats.royalTechPower',
    'stats.rocLevel',
    'stats.level50HeroCount',
    'stats.t9TroopTypes',
    'stats.t10TroopTypes',
    'stats.readySpeedHeroes',
    'stats.troopRoster',
    'stats.usableHeroNames',
    'stats.researchProgressPct',
    'commitment.availability',
    'commitment.unavailableTimes',
    'commitment.preferredRole',
    'commitment.secondaryRole',
    'commitment.canHelpLead',
    'commitment.vts1097Member',
    'commitment.contactNumber',
    'commitment.currentState',
    'commitment.joinReason',
    'commitment.fightingTimeIds',
    'commitment.teamNamePreferences',
    'commitment.canTeleport',
    'commitment.canUseVoice',
    'commitment.planCommitment',
    'commitment.notes',
  ]);

  const effective = applyAllStarBohSubmissionCorrections(base, normalizedReview);
  assert.deepEqual(base, originalBase);
  assert.equal(effective.gameName, 'Final Player');
  assert.equal(effective.locale, '');
  assert.equal(effective.timezone, 'UTC');
  assert.deepEqual(effective.preferredTeammates, []);
  assert.equal(effective.stats.troopPower, 222);
  assert.equal(effective.stats.totalCastlePower, 2_000_000);
  assert.equal(effective.stats.buildingPower, 111);
  assert.equal(effective.stats.unitSpecialtyPower, 666);
  assert.equal(effective.stats.artifactPower, null);
  assert.equal(effective.stats.royalTechPower, null);
  assert.deepEqual(effective.stats.troopRoster, ['estimate|t10|2500000']);
  assert.deepEqual(effective.stats.usableHeroNames, ['Hero B', 'Hero A']);
  assert.deepEqual(effective.stats.researchProgressPct, { combat: 100 });
  assert.equal(effective.commitment.availability, 'backup');
  assert.equal(effective.commitment.preferredRole, 'top');
  assert.equal(effective.commitment.secondaryRole, 'bottom');
  assert.deepEqual(effective.rolePreferences, ['top', 'bottom']);
  assert.equal(effective.commitment.canHelpLead, null);
  assert.equal(effective.commitment.vts1097Member, false);
  assert.deepEqual(effective.commitment.fightingTimeIds, ['+12', '+14']);
  assert.deepEqual(effective.commitment.teamNamePreferences, []);
  assert.equal(effective.commitment.canTeleport, null);
  assert.equal(effective.commitment.canUseVoice, false);
  assert.equal(effective.commitment.planCommitment, true);
  assert.equal(effective.commitment.notes, '');

  const staleEffective = applyAllStarBohSubmissionCorrections(base, {
    ...normalizedReview,
    submissionRevision: 6,
  });
  assert.equal(staleEffective.gameName, 'Original Player');
  assert.equal(staleEffective.stats.troopPower, 100_000_000);

  const restoredEffective = applyAllStarBohSubmissionCorrections(base, {
    submissionRevision: 7,
    status: 'verified',
  });
  assert.equal(restoredEffective.gameName, 'Original Player');
  assert.deepEqual(restoredEffective.rolePreferences, ['offensive', 'rune']);

  const conflictingLegacy = {
    ...base,
    rolePreferences: ['bottom'],
  };
  const nonRoleEffective = applyAllStarBohSubmissionCorrections(conflictingLegacy, {
    submissionRevision: 7,
    status: 'verified',
    submissionCorrection: {
      reason: 'Notes audit only',
      values: { commitment: { notes: 'Verified without changing roles.' } },
    },
  });
  assert.deepEqual(nonRoleEffective.rolePreferences, ['bottom']);

  const flexibleEffective = applyAllStarBohSubmissionCorrections(base, {
    submissionRevision: 7,
    status: 'verified',
    submissionCorrection: {
      reason: 'Role audit',
      values: { commitment: { preferredRole: 'flexible', secondaryRole: 'top' } },
    },
  });
  assert.deepEqual(flexibleEffective.rolePreferences, ['top']);
});

test('effective VTS corrections canonically clear non-VTS contact fields without mutating the submission', () => {
  const base = {
    ...normalizeAllStarBohSubmission(
      submission('Transfer Player', {
        commitment: {
          ...submission().commitment,
          vts1097Member: false,
          contactNumber: '555-0100',
          currentState: 'State 1200',
          joinReason: 'Joining VTS for the event.',
        },
      }),
      { requireFightingTimeIds: true, requireVtsMembership: true }
    ),
    revision: 3,
  };
  const original = cloneForFake(base);
  const review = normalizeAllStarBohReview({
    submissionRevision: 3,
    status: 'pending',
    submissionCorrection: {
      reason: 'Membership audit',
      values: { commitment: { vts1097Member: true } },
    },
  });

  const effective = applyAllStarBohSubmissionCorrections(base, review);
  assert.equal(effective.commitment.vts1097Member, true);
  assert.equal(effective.commitment.contactNumber, '');
  assert.equal(effective.commitment.currentState, '');
  assert.equal(effective.commitment.joinReason, '');
  assert.deepEqual(base, original);
});

test('submission correction overlay drops unknown fields and rejects provenance fields', () => {
  const dropped = normalizeAllStarBohReview({
    status: 'verified',
    submissionCorrection: {
      reason: 'Locale only',
      changedFields: ['uid', 'stats.unknownStat'],
      values: {
        locale: ' en ',
        nickname: 'ignored',
        stats: { unknownStat: 123 },
        commitment: { unsupportedFlag: true },
      },
    },
  });
  assert.deepEqual(dropped.submissionCorrection, {
    schemaVersion: 1,
    reason: 'Locale only',
    values: { locale: 'en' },
    changedFields: ['locale'],
  });

  const catalogLikeIds = normalizeAllStarBohReview({
    status: 'verified',
    submissionCorrection: {
      reason: 'Research IDs can look like protected keys',
      values: { stats: { researchProgressPct: { uid: 25, status: 75 } } },
    },
  });
  assert.deepEqual(catalogLikeIds.submissionCorrection.values.stats.researchProgressPct, {
    uid: 25,
    status: 75,
  });

  assert.throws(
    () => normalizeAllStarBohReview({ submissionCorrection: { values: { locale: 'en' } } }),
    /Submission correction reason is required/
  );
  for (const submissionCorrection of [
    { reason: 'Bad values', values: [] },
    { reason: 'Bad stats', values: { stats: [] } },
    { reason: 'Bad commitment', values: { commitment: [] } },
  ]) {
    assert.throws(() => normalizeAllStarBohReview({ submissionCorrection }), /must be an object/);
  }
  for (const [field, value] of [
    ['buildingPower', null],
    ['unitSpecialtyPower', null],
    ['level50HeroCount', null],
    ['rocLevel', ' '],
    ['totalCastlePower', ''],
  ]) {
    assert.throws(
      () =>
        normalizeAllStarBohReview({
          submissionCorrection: {
            reason: 'Required numeric correction',
            values: { stats: { [field]: value } },
          },
        }),
      /correction is required/
    );
  }
  for (const submissionCorrection of [
    { reason: 'No identity', values: { uid: 'player-2' } },
    { reason: 'No status', values: { status: 'submitted' } },
    { reason: 'No OCR', values: { OCR: { used: true } } },
    { reason: 'No revision', values: { stats: { revision: 2 } } },
    { reason: 'No roles', values: { commitment: { rolePreferences: ['offensive'] } } },
    { reason: 'No root provenance', uid: 'player-2', values: { locale: 'en' } },
  ]) {
    assert.throws(
      () => normalizeAllStarBohReview({ submissionCorrection }),
      AllStarBohValidationError
    );
  }
});

test('review submission correction round-trips, survives unrelated saves, and stays out of player feedback', async () => {
  const submissionPath = getAllStarBohSubmissionPath(SEASON_ID, 'player-1');
  const reviewPath = getAllStarBohReviewPath(SEASON_ID, 'player-1');
  const feedbackPath = getAllStarBohFeedbackPath(SEASON_ID, 'player-1');
  const fake = createFirestoreFake({
    [submissionPath]: storedSubmission('player-1', 1, submission('Player One')),
  });
  const admin = createAllStarBohAdminStore({
    db: {},
    firestore: fake.firestore,
    seasonId: SEASON_ID,
    uid: 'admin-1',
    admin: true,
    heroNames: ['Hero A'],
    researchTreeIds: ['development'],
  });
  const player = createAllStarBohPlayerStore({
    db: {},
    firestore: fake.firestore,
    seasonId: SEASON_ID,
    uid: 'player-1',
  });

  const saved = await admin.saveReview('player-1', {
    submissionRevision: 1,
    status: 'verified',
    note: 'Your signup is confirmed.',
    submissionCorrection: {
      reason: 'Roster audit private reason',
      changedFields: ['uid'],
      values: {
        gameName: 'Player One Fixed',
        stats: { troopPower: 123_456_789, usableHeroNames: ['Hero A'] },
        commitment: { notes: '' },
      },
    },
  });
  assert.equal(saved.submissionCorrection.reason, 'Roster audit private reason');
  assert.deepEqual(saved.submissionCorrection.changedFields, [
    'gameName',
    'stats.troopPower',
    'stats.usableHeroNames',
    'commitment.notes',
  ]);
  assert.equal(fake.read(submissionPath).gameName, 'Player One');
  assert.equal(fake.read(reviewPath).submissionCorrection.values.gameName, 'Player One Fixed');
  assert.equal(
    (await admin.getReview('player-1')).submissionCorrection.reason,
    'Roster audit private reason'
  );

  const rawFeedback = fake.read(feedbackPath);
  assert.equal('submissionCorrection' in rawFeedback, false);
  assert.equal('gameNameCorrection' in rawFeedback, false);
  assert.equal('statCorrections' in rawFeedback, false);
  assert.doesNotMatch(JSON.stringify(rawFeedback), /Roster audit private reason|Player One Fixed/);
  const safeFeedback = await player.getSubmissionFeedback();
  assert.equal('submissionCorrection' in safeFeedback, false);
  assert.doesNotMatch(JSON.stringify(safeFeedback), /Roster audit private reason|Player One Fixed/);

  const originalCorrection = cloneForFake(fake.read(reviewPath).submissionCorrection);
  await admin.saveReview(
    'player-1',
    { submissionRevision: 1, status: 'verified', note: 'Still confirmed.' },
    { expectedRevision: 1 }
  );
  assert.deepEqual(fake.read(reviewPath).submissionCorrection, originalCorrection);
  assert.equal(fake.read(reviewPath).note, 'Still confirmed.');
});

test('review saves never preserve a submission correction from an older or stale review', async () => {
  const submissionPath = getAllStarBohSubmissionPath(SEASON_ID, 'player-1');
  const reviewPath = getAllStarBohReviewPath(SEASON_ID, 'player-1');
  const staleSubmissionPath = getAllStarBohSubmissionPath(SEASON_ID, 'player-2');
  const staleReviewPath = getAllStarBohReviewPath(SEASON_ID, 'player-2');
  const fake = createFirestoreFake({
    [submissionPath]: storedSubmission('player-1', 2, submission('Player One')),
    [reviewPath]: {
      seasonId: SEASON_ID,
      uid: 'player-1',
      schemaVersion: 1,
      revision: 1,
      submissionRevision: 1,
      status: 'verified',
      note: 'Old review',
      roleTags: [],
      locked: false,
      submissionCorrection: {
        reason: 'Old account audit',
        values: { gameName: 'Old Corrected Name' },
      },
    },
    [staleSubmissionPath]: storedSubmission('player-2', 2, submission('Player Two')),
    [staleReviewPath]: {
      seasonId: SEASON_ID,
      uid: 'player-2',
      schemaVersion: 1,
      revision: 1,
      submissionRevision: 2,
      stale: true,
      status: 'verified',
      note: 'Explicitly stale review',
      roleTags: [],
      locked: false,
      submissionCorrection: {
        reason: 'Stale account audit',
        values: { gameName: 'Stale Corrected Name' },
      },
    },
  });
  const admin = createAllStarBohAdminStore({
    db: {},
    firestore: fake.firestore,
    seasonId: SEASON_ID,
    uid: 'admin-1',
    admin: true,
  });

  const saved = await admin.saveReview(
    'player-1',
    { submissionRevision: 2, status: 'verified', note: 'Reviewed current revision.' },
    { expectedRevision: 1 }
  );
  assert.equal(saved.submissionRevision, 2);
  assert.equal(saved.submissionCorrection, undefined);
  assert.equal(fake.read(reviewPath).submissionCorrection, undefined);

  const staleSaved = await admin.saveReview(
    'player-2',
    { submissionRevision: 2, status: 'verified', note: 'Reviewed without correction.' },
    { expectedRevision: 1 }
  );
  assert.equal(staleSaved.submissionCorrection, undefined);
  assert.equal(fake.read(staleReviewPath).submissionCorrection, undefined);
});

test('review submission correction validates against catalogs and non-VTS requirements before writes', async () => {
  const submissionPath = getAllStarBohSubmissionPath(SEASON_ID, 'player-1');
  const reviewPath = getAllStarBohReviewPath(SEASON_ID, 'player-1');
  const feedbackPath = getAllStarBohFeedbackPath(SEASON_ID, 'player-1');
  const fake = createFirestoreFake({
    [submissionPath]: storedSubmission('player-1', 1, submission('Player One')),
  });
  const admin = createAllStarBohAdminStore({
    db: {},
    firestore: fake.firestore,
    seasonId: SEASON_ID,
    uid: 'admin-1',
    admin: true,
    heroNames: ['Hero A'],
    researchTreeIds: ['development'],
  });

  await assert.rejects(
    admin.saveReview('player-1', {
      submissionRevision: 1,
      status: 'verified',
      submissionCorrection: {
        reason: 'Bad hero',
        values: { stats: { usableHeroNames: ['Unknown Hero'] } },
      },
    }),
    /outside its catalog/
  );
  await assert.rejects(
    admin.saveReview('player-1', {
      submissionRevision: 1,
      status: 'verified',
      submissionCorrection: {
        reason: 'Bad research',
        values: { stats: { researchProgressPct: { unknown: 50 } } },
      },
    }),
    /unknown tree ID/
  );
  await assert.rejects(
    admin.saveReview('player-1', {
      submissionRevision: 1,
      status: 'verified',
      submissionCorrection: {
        reason: 'Incomplete non-VTS correction',
        values: { commitment: { vts1097Member: false } },
      },
    }),
    /Non-VTS players must provide contact details/
  );
  await assert.rejects(
    admin.saveReview('player-1', {
      submissionRevision: 1,
      status: 'verified',
      submissionCorrection: {
        reason: 'Missing membership correction',
        values: { commitment: { vts1097Member: null } },
      },
    }),
    /VTS 1097 membership selection is required/
  );
  await assert.rejects(
    admin.saveReview('player-1', {
      submissionRevision: 1,
      status: 'verified',
      submissionCorrection: {
        reason: 'Missing fighting times',
        values: { commitment: { fightingTimeIds: [] } },
      },
    }),
    /Exactly two fighting times are required/
  );
  assert.equal(fake.read(reviewPath), undefined);
  assert.equal(fake.read(feedbackPath), undefined);

  const catalogAdmin = createAllStarBohAdminStore({
    db: {},
    firestore: fake.firestore,
    seasonId: SEASON_ID,
    uid: 'admin-1',
    admin: true,
    heroNames: ['Hero A'],
    researchTreeIds: ['uid', 'status'],
  });
  const saved = await catalogAdmin.saveReview('player-1', {
    submissionRevision: 1,
    status: 'verified',
    submissionCorrection: {
      reason: 'Valid current catalog and non-VTS audit',
      values: {
        stats: { researchProgressPct: { uid: 25, status: 75 } },
        commitment: {
          vts1097Member: false,
          contactNumber: '555-1097',
          currentState: 'State 1200',
          joinReason: 'Joining VTS for the All-Star roster.',
        },
      },
    },
  });
  assert.deepEqual(saved.submissionCorrection.values.stats.researchProgressPct, {
    uid: 25,
    status: 75,
  });
  assert.equal(saved.submissionCorrection.values.commitment.vts1097Member, false);
});

test('review submission correction save is fenced to the current submission revision', async () => {
  const submissionPath = getAllStarBohSubmissionPath(SEASON_ID, 'player-1');
  const reviewPath = getAllStarBohReviewPath(SEASON_ID, 'player-1');
  const feedbackPath = getAllStarBohFeedbackPath(SEASON_ID, 'player-1');
  const fake = createFirestoreFake({
    [submissionPath]: storedSubmission('player-1', 2, submission('Player One')),
  });
  const admin = createAllStarBohAdminStore({
    db: {},
    firestore: fake.firestore,
    seasonId: SEASON_ID,
    uid: 'admin-1',
    admin: true,
  });

  await assert.rejects(
    admin.saveReview('player-1', {
      submissionRevision: 1,
      status: 'verified',
      submissionCorrection: {
        reason: 'Stale correction',
        values: { gameName: 'Stale Name' },
      },
    }),
    (error) =>
      error instanceof AllStarBohConflictError &&
      error.path === submissionPath &&
      error.expectedRevision === 1 &&
      error.actualRevision === 2
  );
  assert.equal(fake.read(reviewPath), undefined);
  assert.equal(fake.read(feedbackPath), undefined);
});

test('review submission correction supports a realistic maximum sparse overlay within review limits', async () => {
  const heroNames = Array.from(
    { length: 78 },
    (_, index) => `Hero ${String(index + 1).padStart(2, '0')} ${'A'.repeat(130)}`
  );
  const researchTreeIds = Array.from(
    { length: 120 },
    (_, index) => `tree-${String(index + 1).padStart(3, '0')}-${'r'.repeat(100)}`
  );
  const submissionPath = getAllStarBohSubmissionPath(SEASON_ID, 'player-1');
  const reviewPath = getAllStarBohReviewPath(SEASON_ID, 'player-1');
  const fake = createFirestoreFake({
    [submissionPath]: storedSubmission('player-1', 1, submission('Player One')),
  });
  const admin = createAllStarBohAdminStore({
    db: {},
    firestore: fake.firestore,
    seasonId: SEASON_ID,
    uid: 'admin-1',
    admin: true,
    heroNames,
    researchTreeIds,
  });
  const values = {
    gameName: 'P'.repeat(160),
    locale: 'zh-Hant-TW',
    timezone: 'America/Argentina/Buenos_Aires',
    preferredTeammates: Array.from(
      { length: 6 },
      (_, index) => `Mate ${index + 1} ${'m'.repeat(120)}`
    ),
    stats: {
      totalCastlePower: 10 ** 12,
      troopPower: 10 ** 12,
      buildingPower: 10 ** 12,
      technologyPower: 10 ** 12,
      heroCombatPower: 10 ** 12,
      dragonPower: 10 ** 12,
      unitSpecialtyPower: 10 ** 12,
      artifactPower: 10 ** 12,
      royalTechPower: 10 ** 12,
      rocLevel: 160,
      level50HeroCount: 500,
      t9TroopTypes: Array.from(
        { length: 12 },
        (_, index) => `T9 type ${index + 1} ${'t'.repeat(40)}`
      ),
      t10TroopTypes: Array.from(
        { length: 3 },
        (_, index) => `T10 type ${index + 1} ${'x'.repeat(40)}`
      ),
      readySpeedHeroes: Array.from(
        { length: 24 },
        (_, index) => `Speed Hero ${index + 1} ${'s'.repeat(54)}`
      ),
      troopRoster: Array.from({ length: 60 }, (_, index) => `estimate|t10|${1_000_000 + index}`),
      usableHeroNames: heroNames,
      researchProgressPct: Object.fromEntries(
        researchTreeIds.map((researchTreeId, index) => [researchTreeId, index % 101])
      ),
    },
    commitment: {
      availability: 'most',
      unavailableTimes: 'u'.repeat(800),
      preferredRole: 'offensive',
      secondaryRole: 'rune',
      canHelpLead: true,
      vts1097Member: false,
      contactNumber: '1'.repeat(120),
      currentState: 'State '.padEnd(120, 'S'),
      joinReason: 'j'.repeat(1000),
      fightingTimeIds: ['+12', '+14'],
      teamNamePreferences: [
        'iron-wolves',
        'storm-ravens',
        'ember-lions',
        'frost-bears',
        'night-falcons',
        'thunder-bulls',
      ],
      canTeleport: true,
      canUseVoice: true,
      planCommitment: true,
      notes: 'n'.repeat(2000),
    },
  };

  const normalized = normalizeAllStarBohReview({
    submissionRevision: 1,
    status: 'verified',
    note: 'Confirmed.',
    submissionCorrection: {
      schemaVersion: 1,
      reason: 'r'.repeat(500),
      values,
    },
  });
  const normalizedBytes = Buffer.byteLength(JSON.stringify(normalized), 'utf8');
  assert.ok(
    normalizedBytes > 32 * 1024,
    `expected overlay to justify review limit, got ${normalizedBytes}`
  );
  assert.ok(
    normalizedBytes < 64 * 1024,
    `expected overlay below raised limit, got ${normalizedBytes}`
  );

  await admin.saveReview('player-1', {
    submissionRevision: 1,
    status: 'verified',
    note: 'Confirmed.',
    submissionCorrection: { reason: 'r'.repeat(500), values },
  });
  const storedBytes = Buffer.byteLength(JSON.stringify(fake.read(reviewPath)), 'utf8');
  assert.ok(
    storedBytes > 32 * 1024,
    `expected stored review above prior limit, got ${storedBytes}`
  );
  assert.ok(
    storedBytes < 64 * 1024,
    `expected stored review below raised limit, got ${storedBytes}`
  );
});

test('admin lists and observes submissions, saves reviews, and accepts incomplete drafts', async () => {
  const player1Path = getAllStarBohSubmissionPath(SEASON_ID, 'player-1');
  const player2Path = getAllStarBohSubmissionPath(SEASON_ID, 'player-2');
  const legacyPlayer = storedSubmission('player-1', 1, submission('Player One'));
  legacyPlayer.commitment.fightingTimeIds = ['+8', '+20'];
  const fake = createFirestoreFake({
    [player1Path]: legacyPlayer,
    [player2Path]: storedSubmission('player-2', 3, submission('Player Two')),
  });
  const store = createAllStarBohAdminStore({
    db: {},
    firestore: fake.firestore,
    seasonId: SEASON_ID,
    uid: 'admin-1',
    isAdmin: ({ uid, seasonId }) => uid === 'admin-1' && seasonId === SEASON_ID,
  });

  const listed = await store.listSubmissions();
  assert.deepEqual(
    listed.map((item) => [item.uid, item.gameName, item.revision]),
    [
      ['player-1', 'Player One', 1],
      ['player-2', 'Player Two', 3],
    ]
  );
  assert.deepEqual(listed[0].commitment.fightingTimeIds, ['+8', '+20']);
  listed[0].stats.t9TroopTypes.push('mutated');
  assert.deepEqual(fake.read(player1Path).stats.t9TroopTypes, ['cavalry', 'archers']);

  const live = [];
  const unsubscribe = await store.subscribeSubmissions((items) => live.push(items));
  assert.equal(live.length, 1);
  fake.write(player2Path, storedSubmission('player-2', 4, submission('Player Two Updated')));
  assert.equal(live.length, 2);
  assert.equal(live[1].find((item) => item.uid === 'player-2').gameName, 'Player Two Updated');
  unsubscribe();

  const review = await store
    .saveReview('player-1', {
      status: 'verified',
      note: 'Confirmed by voice.',
      roleTags: ['offensive'],
      locked: true,
      score: {
        profileId: 'legacy-2025',
        profileVersion: 1,
        breakdown: {
          troopPower: { input: 100_000_000, weight: 0.05, divisor: 1000, points: 5_000 },
          unknownPrivateValue: 999,
        },
        total: 42_000,
      },
      rawScreenshot: 'not allowed',
    })
    .catch((error) => error);
  assert(review instanceof AllStarBohValidationError);

  await assert.rejects(
    store.saveReview('player-1', { status: 'pending' }),
    /Reviews require the submission revision that was reviewed/
  );

  const savedReview = await store.saveReview('player-1', {
    submissionRevision: 1,
    status: 'verified',
    note: 'Confirmed by voice.',
    roleTags: ['offensive'],
    locked: true,
    score: {
      profileId: 'legacy-2025',
      profileVersion: 1,
      breakdown: { troopPower: 5_000, unknownPrivateValue: 999 },
      total: 42_000,
    },
    privateField: 'dropped',
  });
  assert.equal(savedReview.uid, 'player-1');
  assert.equal(savedReview.submissionRevision, 1);
  assert.equal(savedReview.stale, false);
  assert.equal(savedReview.revision, 1);
  assert.equal(savedReview.score.total, 42_000);
  assert.deepEqual(savedReview.score.breakdown, {
    troopPower: { points: 5_000 },
  });
  assert.equal('privateField' in savedReview, false);

  const reviewUpdates = [];
  const unsubscribeReview = await store.subscribeReview('player-1', (value) =>
    reviewUpdates.push(value)
  );
  assert.equal(reviewUpdates.at(-1).stale, false);
  fake.write(player1Path, storedSubmission('player-1', 2, submission('Player One Updated')));
  assert.equal(reviewUpdates.at(-1).stale, true);
  assert.equal(reviewUpdates.at(-1).currentSubmissionRevision, 2);
  await assert.rejects(
    store.saveReview(
      'player-1',
      {
        revision: 1,
        submissionRevision: 1,
        status: 'verified',
        score: { total: 43_000 },
      },
      { expectedRevision: 1 }
    ),
    (error) =>
      error instanceof AllStarBohConflictError &&
      error.path === player1Path &&
      error.expectedRevision === 1 &&
      error.actualRevision === 2
  );
  unsubscribeReview();

  const draft = await store.saveDraft({
    title: 'Work in progress',
    teamIds: ['team-1'],
    playerIds: ['player-1'],
    scoring: {
      activeVersion: 'legacy-2025',
      versions: [
        {
          id: 'legacy-2025',
          version: 1,
          label: 'Legacy balanced profile',
          powerWeights: { troopPower: 0.05, technologyPower: 0.7 },
          bonusWeights: { t9TroopType: 3000, readySpeedHero: 2500 },
          powerDivisor: 1000,
          precision: 0,
        },
      ],
    },
    plan: emptyPlan(),
  });
  assert.equal(draft.revision, 1);
  assert.equal(draft.title, 'Work in progress');
  assert.equal(draft.teamCount, 6);
  assert.equal(draft.balanceMetric, 'score');
  assert.deepEqual(draft.forcedTeamAssignments, []);
  assert.deepEqual(draft.scoringVersions[0].powerWeights, {
    troopPower: 0.05,
    technologyPower: 0.7,
  });
  assert.deepEqual(draft.scoringVersions[0].bonusWeights, {
    t9TroopType: 3000,
    readySpeedHero: 2500,
  });
  assert.equal(draft.scoringVersions[0].powerDivisor, 1000);
  assert.equal(draft.scoringVersions[0].precision, 0);

  const draftUpdates = [];
  const unsubscribeDraft = await store.subscribeDraft((value) => draftUpdates.push(value));
  assert.equal(draftUpdates.length, 1);
  assert.equal(draftUpdates[0].revision, 1);
  await store.saveDraft(
    {
      title: 'Live draft update',
      teamCount: 2,
      balanceMetric: 'totalPower',
      forcedTeamAssignments: [{ playerId: 'player-1', teamId: 'team-1' }],
      teamIds: ['team-1'],
      playerIds: ['player-1'],
      plan: emptyPlan(),
    },
    { expectedRevision: 1 }
  );
  assert.equal(draftUpdates.length, 2);
  assert.equal(draftUpdates[1].title, 'Live draft update');
  assert.equal(draftUpdates[1].teamCount, 2);
  assert.equal(draftUpdates[1].balanceMetric, 'totalPower');
  assert.deepEqual(draftUpdates[1].forcedTeamAssignments, [
    { playerId: 'player-1', teamId: 'team-1' },
  ]);
  assert.equal(fake.read(getAllStarBohDraftPath(SEASON_ID)).balanceMetric, 'totalPower');
  unsubscribeDraft();

  const draftTeam = await store.saveDraftTeam('team-1', publishedTeam('team-1', ['player-1']), {
    expectedRevision: 0,
  });
  assert.equal(draftTeam.teamId, 'team-1');
  assert.equal(draftTeam.revision, 1);
  assert.equal(draftTeam.seats[0].locked, true);
  assert.equal(draftTeam.scoreTotal, 999_999);
});

test('score and profile serializers round-trip new keys without densifying legacy profiles', async () => {
  const playerId = 'score-round-trip-player';
  const submissionPath = getAllStarBohSubmissionPath(SEASON_ID, playerId);
  const reviewPath = getAllStarBohReviewPath(SEASON_ID, playerId);
  const draftPath = getAllStarBohDraftPath(SEASON_ID);
  const fake = createFirestoreFake({
    [submissionPath]: storedSubmission(playerId, 1, submission('Score Round Trip')),
  });
  const admin = createAllStarBohAdminStore({
    db: {},
    firestore: fake.firestore,
    seasonId: SEASON_ID,
    uid: 'admin-1',
    admin: true,
  });
  const newBreakdown = {
    unitSpecialtyPower: { input: 25_000_000, weight: 0.4, divisor: 1000, points: 10_000 },
    rocLevel: { input: 12, weight: 125, points: 1500 },
    paidUsableHero: { input: 3, weight: 800, points: 2400 },
    loftyTroopMillion: { input: 90, weight: 40, points: 3600 },
    enhancedT10TroopMillion: { input: 45, weight: 75, points: 3375 },
  };

  const review = await admin.saveReview(playerId, {
    submissionRevision: 1,
    status: 'verified',
    score: {
      profileId: 'expanded-2026',
      profileVersion: 2,
      breakdown: newBreakdown,
      total: 20_875,
    },
  });
  assert.deepEqual(review.score.breakdown, newBreakdown);
  assert.deepEqual(fake.read(reviewPath).score.breakdown, newBreakdown);

  const expandedPowerWeights = {
    troopPower: 0.05,
    unitSpecialtyPower: 1,
  };
  const expandedBonusWeights = {
    rocLevel: 125,
    paidUsableHero: 800,
    loftyTroopMillion: 40,
    enhancedT10TroopMillion: 75,
  };
  const draft = await admin.saveDraft({
    title: 'Expanded scoring round trip',
    scoring: {
      activeVersion: 'expanded-2026',
      versions: [
        {
          id: 'expanded-2026',
          version: 2,
          powerWeights: expandedPowerWeights,
          bonusWeights: expandedBonusWeights,
          powerDivisor: 1000,
          precision: 0,
        },
        {
          id: 'legacy-sparse',
          version: 1,
          weights: {
            troopPower: 0.05,
            t9TroopType: 3000,
          },
          powerDivisor: 1000,
          precision: 0,
        },
      ],
    },
    plan: emptyPlan(),
  });

  assert.deepEqual(draft.scoringVersions[0].powerWeights, expandedPowerWeights);
  assert.deepEqual(draft.scoringVersions[0].bonusWeights, expandedBonusWeights);
  assert.deepEqual(fake.read(draftPath).scoringVersions[0].powerWeights, expandedPowerWeights);
  assert.deepEqual(fake.read(draftPath).scoringVersions[0].bonusWeights, expandedBonusWeights);

  const sparseLegacy = draft.scoringVersions[1];
  assert.deepEqual(sparseLegacy.powerWeights, { troopPower: 0.05 });
  assert.deepEqual(sparseLegacy.bonusWeights, { t9TroopType: 3000 });
  for (const key of [
    'unitSpecialtyPower',
    'rocLevel',
    'paidUsableHero',
    'loftyTroopMillion',
    'enhancedT10TroopMillion',
  ]) {
    assert.equal(key in sparseLegacy.powerWeights, false);
    assert.equal(key in sparseLegacy.bonusWeights, false);
  }
  assert.deepEqual(fake.read(draftPath).scoringVersions[1], sparseLegacy);
});

test('review saves publish atomic, private-safe player feedback with revision checks', async () => {
  const submissionPath = getAllStarBohSubmissionPath(SEASON_ID, 'player-1');
  const reviewPath = getAllStarBohReviewPath(SEASON_ID, 'player-1');
  const feedbackPath = getAllStarBohFeedbackPath(SEASON_ID, 'player-1');
  const fake = createFirestoreFake({
    [submissionPath]: storedSubmission('player-1', 1, submission('Player One')),
  });
  const admin = createAllStarBohAdminStore({
    db: {},
    firestore: fake.firestore,
    seasonId: SEASON_ID,
    uid: 'admin-1',
    admin: true,
  });
  const player = createAllStarBohPlayerStore({
    db: {},
    firestore: fake.firestore,
    seasonId: SEASON_ID,
    uid: 'player-1',
  });

  const confirmed = await admin.saveReview('player-1', {
    submissionRevision: 1,
    status: 'verified',
    note: 'Your signup is confirmed.',
    internalNote: 'Captain candidate; keep private.',
    gameNameCorrection: {
      corrected: 'Player One Prime',
      reason: 'Confirmed with the player.',
    },
    statCorrections: {
      troopPower: { corrected: 125_000_000, reason: 'Reviewed from profile.' },
    },
  });
  assert.equal(confirmed.revision, 1);
  assert.equal(fake.read(reviewPath).internalNote, 'Captain candidate; keep private.');
  assert.equal(fake.read(reviewPath).gameNameCorrection.corrected, 'Player One Prime');
  assert.equal(fake.read(reviewPath).statCorrections.troopPower.corrected, 125_000_000);
  assert.deepEqual(
    {
      status: fake.read(feedbackPath).status,
      note: fake.read(feedbackPath).note,
      submissionRevision: fake.read(feedbackPath).submissionRevision,
      reviewRevision: fake.read(feedbackPath).reviewRevision,
      revision: fake.read(feedbackPath).revision,
    },
    {
      status: 'confirmed',
      note: 'Your signup is confirmed.',
      submissionRevision: 1,
      reviewRevision: 1,
      revision: 1,
    }
  );
  assert.equal('updatedBy' in fake.read(feedbackPath), false);
  assert.equal('internalNote' in fake.read(feedbackPath), false);
  assert.equal('gameNameCorrection' in fake.read(feedbackPath), false);
  assert.equal('statCorrections' in fake.read(feedbackPath), false);

  const feedbackUpdates = [];
  const unsubscribe = player.subscribeSubmissionFeedback((value) => feedbackUpdates.push(value));
  assert.equal(feedbackUpdates.at(-1).status, 'confirmed');
  const safeFeedback = await player.getSubmissionFeedback();
  assert.deepEqual(Object.keys(safeFeedback).sort(), [
    'note',
    'reviewRevision',
    'revision',
    'status',
    'submissionRevision',
    'updatedAt',
    'updatedAtMs',
  ]);
  assert.equal('uid' in safeFeedback, false);
  assert.equal('seasonId' in safeFeedback, false);
  assert.equal('createdAt' in safeFeedback, false);

  await admin.saveReview(
    'player-1',
    {
      submissionRevision: 1,
      status: 'needs_changes',
      note: 'Please correct your troop power.',
    },
    { expectedRevision: 1 }
  );
  assert.equal(feedbackUpdates.at(-1).status, 'needs_correction');
  assert.equal(feedbackUpdates.at(-1).reviewRevision, 2);
  assert.equal(feedbackUpdates.at(-1).revision, 2);

  await admin.saveReview(
    'player-1',
    {
      submissionRevision: 1,
      status: 'rejected',
      note: 'This account is not eligible for this event.',
    },
    { expectedRevision: 2 }
  );
  assert.equal(feedbackUpdates.at(-1).status, 'excluded');
  assert.equal(feedbackUpdates.at(-1).reviewRevision, 3);
  unsubscribe();

  const transactionCount = fake.transactionCount;
  await assert.rejects(
    admin.saveReview(
      'player-1',
      { submissionRevision: 1, status: 'needs_changes', note: '   ' },
      { expectedRevision: 3 }
    ),
    /Player-facing feedback is required/
  );
  assert.equal(fake.transactionCount, transactionCount);
  assert.throws(
    () =>
      normalizeAllStarBohFeedback({
        status: 'excluded',
        note: '',
        submissionRevision: 1,
        reviewRevision: 1,
      }),
    /Player-facing feedback is required/
  );
});

test('a failed review transaction writes neither the private review nor player feedback', async () => {
  const submissionPath = getAllStarBohSubmissionPath(SEASON_ID, 'player-1');
  const reviewPath = getAllStarBohReviewPath(SEASON_ID, 'player-1');
  const feedbackPath = getAllStarBohFeedbackPath(SEASON_ID, 'player-1');
  const fake = createFirestoreFake(
    { [submissionPath]: storedSubmission('player-1', 1, submission('Player One')) },
    { failCommit: true }
  );
  const admin = createAllStarBohAdminStore({
    db: {},
    firestore: fake.firestore,
    seasonId: SEASON_ID,
    uid: 'admin-1',
    admin: true,
  });

  await assert.rejects(
    admin.saveReview('player-1', {
      submissionRevision: 1,
      status: 'verified',
      note: 'Confirmed.',
    }),
    /Synthetic commit failure/
  );
  assert.equal(fake.read(reviewPath), undefined);
  assert.equal(fake.read(feedbackPath), undefined);
});

test('draft bundle saves the draft and six teams atomically across success, conflict, and commit failure', async () => {
  const draftPath = getAllStarBohDraftPath(SEASON_ID);
  const guardedUid = 'guarded-player';
  const guardedSubmissionPath = getAllStarBohSubmissionPath(SEASON_ID, guardedUid);
  const guardedReviewPath = getAllStarBohReviewPath(SEASON_ID, guardedUid);
  const missingReviewUid = 'missing-review-player';
  const missingReviewSubmissionPath = getAllStarBohSubmissionPath(SEASON_ID, missingReviewUid);
  const teamIds = Array.from({ length: 6 }, (_, index) => `team-${index + 1}`);
  const initial = {
    [draftPath]: { seasonId: SEASON_ID, revision: 2, title: 'Original draft' },
    [guardedSubmissionPath]: {
      seasonId: SEASON_ID,
      uid: guardedUid,
      playerId: guardedUid,
      revision: 3,
    },
    [guardedReviewPath]: {
      seasonId: SEASON_ID,
      uid: guardedUid,
      revision: 2,
      submissionRevision: 3,
    },
    [missingReviewSubmissionPath]: {
      seasonId: SEASON_ID,
      uid: missingReviewUid,
      playerId: missingReviewUid,
      revision: 1,
    },
    ...Object.fromEntries(
      teamIds.map((teamId) => [
        getAllStarBohDraftTeamPath(SEASON_ID, teamId),
        { seasonId: SEASON_ID, teamId, revision: 4, name: `Original ${teamId}` },
      ])
    ),
  };
  const bundle = {
    draft: {
      title: 'Balanced field',
      teamIds,
      playerIds: teamIds.map((teamId) => `${teamId}-player`),
      plan: emptyPlan(),
    },
    teams: Object.fromEntries(
      teamIds.map((teamId) => [teamId, publishedTeam(teamId, [`${teamId}-player`])])
    ),
  };
  const saveOptions = {
    expectedDraftRevision: 2,
    expectedTeamRevisions: Object.fromEntries(teamIds.map((teamId) => [teamId, 4])),
    expectedSubmissionRevisions: [
      [guardedUid, 3],
      [missingReviewUid, 1],
    ],
    expectedReviewRevisions: [
      [guardedUid, 2, 3],
      [missingReviewUid, 0, 0],
    ],
  };
  const preflightFake = createFirestoreFake();
  const preflightAdmin = createAllStarBohAdminStore({
    db: {},
    firestore: preflightFake.firestore,
    seasonId: SEASON_ID,
    uid: 'admin-1',
    admin: true,
  });
  await assert.rejects(
    preflightAdmin.saveDraftBundle(bundle, {
      expectedTeamRevisions: saveOptions.expectedTeamRevisions,
    }),
    /explicit expected draft revision/
  );
  await assert.rejects(
    preflightAdmin.saveDraftBundle(
      { teams: { 'team-1': publishedTeam('team-1', ['shared-player']) } },
      { expectedTeamRevisions: {} }
    ),
    /exactly one expected revision/
  );
  await assert.rejects(
    preflightAdmin.saveDraftBundle(
      {
        teams: {
          'team-1': publishedTeam('team-1', ['shared-player']),
          'team-2': publishedTeam('team-2', ['shared-player']),
        },
      },
      { expectedTeamRevisions: { 'team-1': 0, 'team-2': 0 } }
    ),
    /occupies multiple teams/
  );
  await assert.rejects(
    preflightAdmin.saveDraftBundle(
      { teams: { 'team-1': publishedTeam('team-1', ['player-1']) } },
      {
        expectedTeamRevisions: { 'team-1': 0 },
        expectedSubmissionRevisions: [['unsafe/player', 1]],
      }
    ),
    /may contain only/
  );
  assert.equal(preflightFake.transactionCount, 0);
  const maximumSourceIds = Array.from(
    { length: 72 },
    (_, index) => `source-${String(index + 1).padStart(2, '0')}`
  );
  await assert.rejects(
    preflightAdmin.saveDraftBundle(
      { teams: { 'team-1': publishedTeam('team-1', ['player-1']) } },
      {
        expectedTeamRevisions: { 'team-1': 0 },
        expectedSubmissionRevisions: maximumSourceIds.map((sourceUid) => [sourceUid, 1]),
        expectedReviewRevisions: maximumSourceIds.map((sourceUid) => [sourceUid, 1, 1]),
      }
    ),
    AllStarBohConflictError
  );
  assert.equal(preflightFake.transactionCount, 1, '72 source guards reach store preflight');
  await assert.rejects(
    preflightAdmin.saveDraftBundle(
      { teams: { 'team-1': publishedTeam('team-1', ['player-1']) } },
      {
        expectedTeamRevisions: { 'team-1': 0 },
        expectedSubmissionRevisions: [
          ...maximumSourceIds.map((sourceUid) => [sourceUid, 1]),
          ['source-73', 1],
        ],
      }
    ),
    /guards exceed 72 entries/
  );
  assert.equal(preflightFake.transactionCount, 1, 'the store still rejects more than 72 guards');
  const fake = createFirestoreFake(initial);
  const admin = createAllStarBohAdminStore({
    db: {},
    firestore: fake.firestore,
    seasonId: SEASON_ID,
    uid: 'admin-1',
    admin: true,
  });

  const saved = await admin.saveDraftBundle(bundle, saveOptions);
  assert.equal(fake.transactionCount, 1);
  assert.equal(saved.draft.revision, 3);
  assert.equal(saved.draft.title, 'Balanced field');
  assert.deepEqual(Object.keys(saved.teams), teamIds);
  teamIds.forEach((teamId) => {
    assert.equal(saved.teams[teamId].revision, 5);
    assert.equal(fake.read(getAllStarBohDraftTeamPath(SEASON_ID, teamId)).revision, 5);
  });

  fake.write(guardedSubmissionPath, { ...initial[guardedSubmissionPath], revision: 4 });
  const beforeSubmissionConflict = Object.fromEntries(
    [draftPath, ...teamIds.map((teamId) => getAllStarBohDraftTeamPath(SEASON_ID, teamId))].map(
      (path) => [path, fake.read(path)]
    )
  );
  await assert.rejects(
    admin.saveDraftBundle(bundle, {
      ...saveOptions,
      expectedDraftRevision: 3,
      expectedTeamRevisions: Object.fromEntries(teamIds.map((teamId) => [teamId, 5])),
    }),
    (error) =>
      error instanceof AllStarBohConflictError &&
      error.path === guardedSubmissionPath &&
      error.expectedRevision === 3 &&
      error.actualRevision === 4
  );
  Object.entries(beforeSubmissionConflict).forEach(([path, value]) => {
    assert.deepEqual(fake.read(path), value);
  });

  fake.write(guardedSubmissionPath, initial[guardedSubmissionPath]);
  fake.write(guardedReviewPath, { ...initial[guardedReviewPath], submissionRevision: 4 });
  const beforeReviewConflict = Object.fromEntries(
    [draftPath, ...teamIds.map((teamId) => getAllStarBohDraftTeamPath(SEASON_ID, teamId))].map(
      (path) => [path, fake.read(path)]
    )
  );
  await assert.rejects(
    admin.saveDraftBundle(bundle, {
      ...saveOptions,
      expectedDraftRevision: 3,
      expectedTeamRevisions: Object.fromEntries(teamIds.map((teamId) => [teamId, 5])),
    }),
    (error) =>
      error instanceof AllStarBohConflictError &&
      error.path === guardedReviewPath &&
      error.expectedRevision === 3 &&
      error.actualRevision === 4
  );
  Object.entries(beforeReviewConflict).forEach(([path, value]) => {
    assert.deepEqual(fake.read(path), value);
  });
  fake.write(guardedReviewPath, initial[guardedReviewPath]);

  const missingSourceInitial = Object.fromEntries(
    [draftPath, ...teamIds.map((teamId) => getAllStarBohDraftTeamPath(SEASON_ID, teamId))].map(
      (path) => [path, initial[path]]
    )
  );
  const missingSourceFake = createFirestoreFake(missingSourceInitial);
  const missingSourceAdmin = createAllStarBohAdminStore({
    db: {},
    firestore: missingSourceFake.firestore,
    seasonId: SEASON_ID,
    uid: 'admin-1',
    admin: true,
  });
  await assert.rejects(
    missingSourceAdmin.saveDraftBundle(bundle, {
      ...saveOptions,
      expectedSubmissionRevisions: [['missing-source', 0]],
      expectedReviewRevisions: [['missing-source', 0, 0]],
    }),
    (error) =>
      error instanceof AllStarBohConflictError &&
      error.path === getAllStarBohSubmissionPath(SEASON_ID, 'missing-source')
  );
  Object.entries(missingSourceInitial).forEach(([path, value]) => {
    assert.deepEqual(missingSourceFake.read(path), value);
  });

  const beforeConflict = Object.fromEntries(
    [draftPath, ...teamIds.map((teamId) => getAllStarBohDraftTeamPath(SEASON_ID, teamId))].map(
      (path) => [path, fake.read(path)]
    )
  );
  await assert.rejects(
    admin.saveDraftBundle(bundle, {
      expectedDraftRevision: 3,
      expectedTeamRevisions: Object.fromEntries(
        teamIds.map((teamId) => [teamId, teamId === 'team-6' ? 4 : 5])
      ),
    }),
    (error) =>
      error instanceof AllStarBohConflictError &&
      error.path === getAllStarBohDraftTeamPath(SEASON_ID, 'team-6') &&
      error.expectedRevision === 4 &&
      error.actualRevision === 5
  );
  Object.entries(beforeConflict).forEach(([path, value]) => {
    assert.deepEqual(fake.read(path), value);
  });

  const failingFake = createFirestoreFake(initial, { failCommit: true });
  const failingAdmin = createAllStarBohAdminStore({
    db: {},
    firestore: failingFake.firestore,
    seasonId: SEASON_ID,
    uid: 'admin-1',
    admin: true,
  });
  await assert.rejects(
    failingAdmin.saveDraftBundle(bundle, saveOptions),
    /Synthetic commit failure/
  );
  Object.entries(initial).forEach(([path, value]) => {
    assert.deepEqual(failingFake.read(path), value);
  });

  const retryFake = createFirestoreFake(initial, { transactionAttempts: 2 });
  const retryAdmin = createAllStarBohAdminStore({
    db: {},
    firestore: retryFake.firestore,
    seasonId: SEASON_ID,
    uid: 'admin-1',
    admin: true,
  });
  const retried = await retryAdmin.saveDraftBundle(bundle, saveOptions);
  assert.equal(retryFake.transactionCount, 1);
  assert.equal(retried.draft.revision, 3);
  teamIds.forEach((teamId) => assert.equal(retried.teams[teamId].revision, 5));
});

test('store serializers preserve canonical signup, score, team, plan, and rotation model fields', async () => {
  const fake = createFirestoreFake();
  const admin = createAllStarBohAdminStore({
    db: {},
    firestore: fake.firestore,
    seasonId: SEASON_ID,
    uid: 'admin-1',
    admin: true,
  });
  const canonicalSignup = normalizeBohSignup({
    gameName: 'Canonical Player',
    stats: {
      totalCastlePower: 900_000_000,
      troopPower: 100_000_000,
      buildingPower: 200_000_000,
      technologyPower: 250_000_000,
      heroCombatPower: 200_000_000,
      dragonPower: 150_000_000,
      t9TroopTypes: ['Cavalry'],
      readySpeedHeroes: ['LionHeart'],
      level50HeroCount: 4,
      rocLevel: 12,
      bohUsefulRating: 2.5,
    },
    vts1097Member: true,
    fightingTimeIds: ['+12', '+14'],
  });
  const canonicalScore = scoreBohSignup(canonicalSignup);
  fake.write(
    getAllStarBohSubmissionPath(SEASON_ID, 'canonical-owner-uid'),
    storedSubmission('canonical-owner-uid', 1, canonicalSignup)
  );
  const canonicalPlan = normalizeBohPlan({
    id: 'canonical-plan',
    roleDefaults: [
      {
        id: 'offense-default',
        roleGroupId: 'offensive',
        phaseId: '*',
        legionId: '*',
        instruction: {
          action: 'Capture',
          target: 'CC1',
          loadout: 'T1s',
          teleport: false,
          note: 'No teleport.',
        },
      },
    ],
    rotations: [
      {
        id: 'phase-rotation',
        playerId: canonicalSignup.playerId,
        seatNumber: 5,
        phaseId: 'phase-5-10',
        legionId: 'legion-1',
      },
    ],
  });

  const review = await admin.saveReview('canonical-owner-uid', {
    submissionRevision: 1,
    status: 'verified',
    score: canonicalScore,
  });
  assert.equal(review.score.precision, canonicalScore.precision);
  assert.deepEqual(review.score.breakdown.troopPower, canonicalScore.breakdown.troopPower);
  assert.deepEqual(
    review.score.breakdown.bohUsefulRating,
    canonicalScore.breakdown.bohUsefulRating
  );

  const draft = await admin.saveDraft({
    title: 'Canonical draft',
    plan: canonicalPlan,
  });
  assert.equal(draft.plan.roleDefaults[0].phaseId, '*');
  assert.equal(draft.plan.roleDefaults[0].legionId, '*');
  assert.equal(draft.plan.roleDefaults[0].instruction.target, 'CC1');
  assert.equal(draft.plan.roleDefaults[0].instruction.teleport, false);
  assert.equal(draft.plan.roleDefaults[0].instruction.note, 'No teleport.');
  assert.equal(draft.plan.rotations[0].seatNumber, 5);
  assert.equal(draft.plan.rotations[0].playerId, canonicalSignup.playerId);

  const team = await admin.saveDraftTeam('team-1', {
    id: 'team-1',
    label: 'Team 1',
    number: 1,
    players: [
      {
        playerId: canonicalSignup.playerId,
        gameName: canonicalSignup.gameName,
        seatNumber: 1,
        roleGroupId: 'offensive',
        roleLabel: 'Offensive Team',
        score: canonicalScore.total,
        locked: true,
      },
    ],
    totalScore: canonicalScore.total,
    averageScore: canonicalScore.total,
    plan: canonicalPlan,
  });
  assert.equal(team.name, 'Team 1');
  assert.equal(team.seats[0].displayName, 'Canonical Player');
  assert.equal(team.scoreTotal, canonicalScore.total);
  assert.equal(team.plan.rotations[0].seatNumber, 5);
});

test('draft plans support all 576 seat or player overrides without weakening the document cap', async () => {
  const fake = createFirestoreFake();
  const admin = createAllStarBohAdminStore({
    db: {},
    firestore: fake.firestore,
    seasonId: SEASON_ID,
    uid: 'admin-1',
    admin: true,
  });
  const overrides = Array.from({ length: 576 }, (_, index) => ({
    id: `seat-rule-${index + 1}`,
    teamId: `team-${Math.floor(index / 96) + 1}`,
    phaseId: RELEASE_PHASES[index % RELEASE_PHASES.length].id,
    legionId: RELEASE_LEGIONS[index % RELEASE_LEGIONS.length].id,
    seatNumber: (index % 12) + 1,
    instruction: { action: 'Build Towers', target: `T${(index % 9) + 1}` },
  }));

  const saved = await admin.saveDraft({
    title: 'Full override matrix',
    plan: releasePlan({ seatOverrides: overrides }),
  });
  assert.equal(saved.plan.seatOverrides.length, 576);
  assert.ok(Buffer.byteLength(JSON.stringify(saved), 'utf8') < 640 * 1024);

  await assert.rejects(
    admin.saveDraft(
      {
        title: 'One override too many',
        plan: releasePlan({ seatOverrides: [...overrides, overrides[0]] }),
      },
      { expectedRevision: 1 }
    ),
    /Seat override instructions exceeds 576 items/
  );
});

test('atomic publish sanitizes member documents, removes stale projections, and preserves creation time', async () => {
  const currentPath = getAllStarBohPublishedPath(SEASON_ID);
  const oldTeamPath = getAllStarBohPublishedTeamPath(SEASON_ID, 'team-old');
  const oldPlayerPath = getAllStarBohPublishedPlayerPath(SEASON_ID, 'player-old');
  const createdAt = { toMillis: () => 1_700_000_000_000 };
  const bundle = completePublicationBundle();
  bundle.current.revision = 1;
  bundle.current.message = 'Check your team assignment.';
  bundle.current.adminNotes = 'must not publish';
  bundle.teams['team-1'].privateStats = { totalPower: 1_000_000_000 };
  bundle.players['firebase-uid-1-1'].stats = { troopPower: 100_000_000 };
  bundle.players['firebase-uid-1-1'].review = { note: 'private' };
  const fake = createFirestoreFake({
    ...submissionSeedsForPublication(bundle),
    ...reviewSeedsForPublication(bundle),
    ...draftSeedsForPublication(bundle),
    [currentPath]: {
      seasonId: SEASON_ID,
      schemaVersion: 1,
      revision: 1,
      status: 'announcement',
      title: 'Old publication',
      teamIds: ['team-old'],
      playerIds: ['player-old'],
      phases: [],
      legions: [],
      createdAt,
      updatedAt: createdAt,
      updatedBy: 'admin-1',
    },
    [oldTeamPath]: { seasonId: SEASON_ID, teamId: 'team-old', revision: 1 },
    [oldPlayerPath]: { seasonId: SEASON_ID, uid: 'player-old', revision: 1 },
  });
  let validatedBundle = null;
  const admin = createAllStarBohAdminStore({
    db: {},
    firestore: fake.firestore,
    seasonId: SEASON_ID,
    uid: 'admin-1',
    admin: true,
    validatePublication: (bundle) => {
      validatedBundle = bundle;
      return { valid: true };
    },
  });

  const result = await admin.publish(bundle, {
    expectedRevision: 1,
    ...publicationSourceOptions(bundle),
  });

  assert.equal(result.current.revision, 2);
  assert.deepEqual(result.current.createdAt, createdAt);
  assert.equal(result.current.teamIds.length, 6);
  assert.equal('playerIds' in result.current, false);
  const privatePublicationIndex = fake.read(getAllStarBohPublicationIndexPath(SEASON_ID));
  assert.equal(privatePublicationIndex.revision, 2);
  assert.equal(privatePublicationIndex.playerIds.length, 72);
  assert.equal(privatePublicationIndex.playerIds.includes('firebase-uid-1-1'), true);
  assert.equal(result.current.activePlanRevision, null);
  assert.equal(result.teams['team-1'].revision, 2);
  assert.equal(result.players['firebase-uid-1-1'].revision, 2);
  assert.equal('scoreTotal' in result.teams['team-1'], false);
  assert.equal('notes' in result.teams['team-1'], false);
  assert.equal('locked' in result.teams['team-1'].seats[0], false);
  assert.equal('score' in result.teams['team-1'].seats[0], false);
  assert.equal('privateStats' in result.teams['team-1'], false);
  assert.equal('plan' in result.teams['team-1'], false);
  assert.equal(result.players['firebase-uid-1-1'].playerId, 'stable-player-1');
  assert.equal('stats' in result.players['firebase-uid-1-1'], false);
  assert.equal('review' in result.players['firebase-uid-1-1'], false);
  assert.equal('plan' in result.players['firebase-uid-1-1'], false);
  assert.equal('adminNotes' in result.current, false);
  assert.equal(fake.read(oldTeamPath), undefined);
  assert.equal(fake.read(oldPlayerPath), undefined);
  assert.equal(validatedBundle.current.teamIds.length, 6);
  assert.equal('playerIds' in validatedBundle.current, false);
  assert.equal('privateStats' in validatedBundle.teams['team-1'], false);

  const member = createAllStarBohPlayerStore({
    db: {},
    firestore: fake.firestore,
    seasonId: SEASON_ID,
    uid: 'firebase-uid-1-1',
  });
  const overview = await member.getPublication();
  const team = await member.getPublishedTeam('team-1');
  const personal = await member.getPersonalPlan();
  assert.equal(overview.teamIds.length, 6);
  assert.equal('playerIds' in overview, false);
  assert.equal(team.name, 'Team team-1');
  assert.equal(personal.teamId, 'team-1');
  assert.equal(personal.playerId, 'stable-player-1');
  assert.equal('plan' in team, false);
  assert.equal('plan' in personal, false);
  assert.equal('getPersonalPlanFor' in member, false);
});

test('publication supports two through six teams and removes stale projections when shrinking', async () => {
  const sixTeamBundle = completePublicationBundle({ teamCount: 6 });
  const twoTeamBundle = completePublicationBundle({ teamCount: 2 });
  const fake = createFirestoreFake({
    ...submissionSeedsForPublication(sixTeamBundle),
    ...reviewSeedsForPublication(sixTeamBundle),
    ...draftSeedsForPublication(sixTeamBundle),
  });
  const admin = createAllStarBohAdminStore({
    db: {},
    firestore: fake.firestore,
    seasonId: SEASON_ID,
    uid: 'admin-1',
    admin: true,
  });

  const sixTeamResult = await admin.publish(sixTeamBundle, {
    expectedRevision: 0,
    ...publicationSourceOptions(sixTeamBundle),
  });
  assert.equal(sixTeamResult.current.teamCount, 6);
  assert.equal(sixTeamResult.current.rosterSize, 12);
  assert.equal(sixTeamResult.current.teamIds.length, 6);
  assert.equal(Object.keys(sixTeamResult.players).length, 72);

  const twoTeamResult = await admin.publish(twoTeamBundle, {
    expectedRevision: 1,
    ...publicationSourceOptions(twoTeamBundle),
  });
  assert.equal(twoTeamResult.current.teamCount, 2);
  assert.equal(twoTeamResult.current.rosterSize, 12);
  assert.deepEqual(twoTeamResult.current.teamIds, ['team-1', 'team-2']);
  assert.equal(Object.keys(twoTeamResult.teams).length, 2);
  assert.equal(Object.keys(twoTeamResult.players).length, 24);
  assert.deepEqual(fake.read(getAllStarBohPublicationIndexPath(SEASON_ID)).teamIds, [
    'team-1',
    'team-2',
  ]);
  assert.equal(fake.read(getAllStarBohPublicationIndexPath(SEASON_ID)).playerIds.length, 24);
  assert.equal(fake.read(getAllStarBohPublishedTeamPath(SEASON_ID, 'team-3')), undefined);
  assert.equal(
    fake.read(getAllStarBohPublishedPlayerPath(SEASON_ID, 'firebase-uid-3-1')),
    undefined
  );
  assert.ok(fake.read(getAllStarBohPublishedTeamPath(SEASON_ID, 'team-2')));
  assert.ok(fake.read(getAllStarBohPublishedPlayerPath(SEASON_ID, 'firebase-uid-2-12')));
});

test('publication rejects dynamic team, overview, roster, and projection mismatches', async () => {
  const fake = createFirestoreFake();
  const admin = createAllStarBohAdminStore({
    db: {},
    firestore: fake.firestore,
    seasonId: SEASON_ID,
    uid: 'admin-1',
    admin: true,
  });

  const wrongCount = completePublicationBundle({ teamCount: 2 });
  wrongCount.current.teamCount = 3;
  await assert.rejects(
    admin.publish(wrongCount, { expectedRevision: 0 }),
    /team count must match the 2 published teams/
  );

  const wrongTeamIds = completePublicationBundle({ teamCount: 2 });
  wrongTeamIds.current.teamIds = ['team-1', 'team-3'];
  await assert.rejects(
    admin.publish(wrongTeamIds, { expectedRevision: 0 }),
    /team IDs must match the published team documents/
  );

  const wrongRosterSize = completePublicationBundle({ teamCount: 2 });
  wrongRosterSize.current.rosterSize = 11;
  await assert.rejects(
    admin.publish(wrongRosterSize, { expectedRevision: 0 }),
    /roster size must be 12/
  );

  const missingProjection = completePublicationBundle({ teamCount: 2 });
  delete missingProjection.players['firebase-uid-2-12'];
  await assert.rejects(
    admin.publish(missingProjection, { expectedRevision: 0 }),
    /has no personal published plan/
  );

  const shortTeam = completePublicationBundle({ teamCount: 2 });
  shortTeam.teams['team-2'].seats.at(-1).playerId = '';
  await assert.rejects(
    admin.publish(shortTeam, { expectedRevision: 0 }),
    /has a personal plan but no published seat/
  );

  const oneTeam = completePublicationBundle({ teamCount: 1 });
  await assert.rejects(
    admin.publish(oneTeam, { expectedRevision: 0 }),
    /requires between 2 and 6 teams/
  );
  assert.equal(fake.transactionCount, 0);
});

test('publication rejects partially occupied teams that omit approved roster seats', async () => {
  const bundle = completePublicationBundle({ teamCount: 2 });
  for (const team of Object.values(bundle.teams)) {
    const removedSeats = team.seats.splice(-2);
    for (const seat of removedSeats) {
      const projection = Object.entries(bundle.players).find(
        ([, player]) => player.playerId === seat.playerId
      );
      if (projection) delete bundle.players[projection[0]];
    }
  }
  const fake = createFirestoreFake({
    ...submissionSeedsForPublication(bundle),
    ...reviewSeedsForPublication(bundle),
    ...draftSeedsForPublication(bundle),
  });
  const admin = createAllStarBohAdminStore({
    db: {},
    firestore: fake.firestore,
    seasonId: SEASON_ID,
    uid: 'admin-1',
    admin: true,
  });

  await assert.rejects(
    admin.publish(bundle, {
      expectedRevision: 0,
      ...publicationSourceOptions(bundle),
    }),
    /must contain exactly 12 approved roster seats/
  );
  assert.equal(fake.transactionCount, 0);
});

test('hidden publication keeps members unlocked without exposing draft announcement data', async () => {
  const currentPath = getAllStarBohPublishedPath(SEASON_ID);
  const indexPath = getAllStarBohPublicationIndexPath(SEASON_ID);
  const oldTeamPath = getAllStarBohPublishedTeamPath(SEASON_ID, 'private-team');
  const oldPlayerPath = getAllStarBohPublishedPlayerPath(SEASON_ID, 'private-player');
  const createdAt = { toMillis: () => 1_700_000_000_000 };
  const fake = createFirestoreFake({
    [currentPath]: {
      status: 'announcement',
      eventName: 'Existing public event',
      title: 'Existing public title',
      subtitle: '',
      message: '',
      announcementPublished: true,
      planPublished: false,
      activePlanRevision: null,
      teamCount: 6,
      rosterSize: 12,
      teamIds: ['private-team'],
      phases: [],
      legions: [],
      seasonId: SEASON_ID,
      schemaVersion: 1,
      revision: 1,
      createdAt,
      updatedAt: createdAt,
      updatedBy: 'admin-1',
    },
    [indexPath]: {
      playerIds: ['private-player'],
      teamIds: ['private-team'],
      seasonId: SEASON_ID,
      schemaVersion: 1,
      revision: 1,
      createdAt,
      updatedAt: createdAt,
      updatedBy: 'admin-1',
    },
    [oldTeamPath]: { seasonId: SEASON_ID, teamId: 'private-team', revision: 1 },
    [oldPlayerPath]: { seasonId: SEASON_ID, uid: 'private-player', revision: 1 },
  });
  const admin = createAllStarBohAdminStore({
    db: {},
    firestore: fake.firestore,
    seasonId: SEASON_ID,
    uid: 'admin-1',
    admin: true,
  });

  const result = await admin.publish(
    {
      current: {
        status: 'hidden',
        eventName: 'Private draft event',
        title: 'Private draft title',
        subtitle: 'Private draft subtitle',
        message: 'Private draft message',
        announcementPublished: false,
        planPublished: false,
        activePlanRevision: 99,
        teamCount: 6,
        rosterSize: 12,
        teamIds: ['private-team'],
        phases: RELEASE_PHASES,
        legions: RELEASE_LEGIONS,
      },
      teams: {},
      players: {},
    },
    { expectedRevision: 1 }
  );

  assert.deepEqual(
    {
      status: result.current.status,
      eventName: result.current.eventName,
      title: result.current.title,
      subtitle: result.current.subtitle,
      message: result.current.message,
      announcementPublished: result.current.announcementPublished,
      planPublished: result.current.planPublished,
      activePlanRevision: result.current.activePlanRevision,
      teamCount: result.current.teamCount,
      rosterSize: result.current.rosterSize,
      teamIds: result.current.teamIds,
      phases: result.current.phases,
      legions: result.current.legions,
    },
    {
      status: 'hidden',
      eventName: '',
      title: '',
      subtitle: '',
      message: '',
      announcementPublished: false,
      planPublished: false,
      activePlanRevision: null,
      teamCount: 0,
      rosterSize: 0,
      teamIds: [],
      phases: [],
      legions: [],
    }
  );
  assert.deepEqual(fake.read(currentPath), result.current);
  assert.equal(result.current.revision, 2);
  assert.deepEqual(result.current.createdAt, createdAt);
  assert.deepEqual(fake.read(indexPath).teamIds, []);
  assert.deepEqual(fake.read(indexPath).playerIds, []);
  assert.equal(fake.read(oldTeamPath), undefined);
  assert.equal(fake.read(oldPlayerPath), undefined);

  const member = createAllStarBohPlayerStore({
    db: {},
    firestore: fake.firestore,
    seasonId: SEASON_ID,
    uid: 'unassigned-member',
  });
  assert.equal((await member.getPublication()).status, 'hidden');
  assert.equal(await member.getPersonalPlan(), null);
});

test('plan publication requires complete validation, stores compact timelines, and pins the active revision', async () => {
  const bundle = completePublicationBundle({ planPublished: true });
  bundle.current.activePlanRevision = 999;
  bundle.players['firebase-uid-1-1'].plan.substitutions = [
    {
      id: 'private-swap',
      teamId: 'team-1',
      backupPlayerId: 'stable-player-12',
      replacesPlayerId: 'stable-player-1',
      entryMinute: 30,
    },
  ];
  bundle.players['firebase-uid-1-1'].plan.playerResources = [
    {
      playerId: 'stable-player-1',
      meritBudget: 1000,
      skillReservations: [{ id: 'battlefield-teleport' }],
    },
  ];
  bundle.players['firebase-uid-1-1'].plan.buildingAnnotations = [
    { buildingId: 'center-tower', note: 'Private configurable building note.' },
  ];
  bundle.players['firebase-uid-1-1'].plan.objectives = [
    { id: 'used-objective', code: 'T1', label: 'Center Tower', x: 50, y: 40 },
    { id: 'unused-objective', code: 'T9', label: 'Unused global marker', x: 90, y: 90 },
  ];
  bundle.players['firebase-uid-1-1'].timeline[0].instruction.objectiveId = 'used-objective';
  bundle.players['firebase-uid-1-1'].timeline[0].instruction.standby = true;
  bundle.players['firebase-uid-1-1'].timeline[1].instruction.standby = false;
  bundle.players['firebase-uid-1-1'].timeline[0].instruction.gatherCrystals = true;
  bundle.players['firebase-uid-1-1'].timeline[1].instruction.gatherCrystals = false;
  bundle.players['firebase-uid-1-2'].timeline[0].instruction.standby = 'false';
  bundle.players['firebase-uid-1-2'].timeline[0].instruction.gatherCrystals = 'true';
  bundle.teams['team-1'].coLeaderIds = ['stable-player-2', 'stable-player-3'];
  bundle.players['firebase-uid-1-1'].plan.playerOverrides = Array.from(
    { length: 576 },
    (_, index) => ({
      id: `player-rule-${index + 1}`,
      teamId: '*',
      phaseId: '*',
      legionId: '*',
      playerId: 'stable-player-1',
      instruction: { note: `Private resolved source rule ${index + 1}` },
    })
  );
  const fake = createFirestoreFake({
    ...submissionSeedsForPublication(bundle),
    ...reviewSeedsForPublication(bundle),
    ...draftSeedsForPublication(bundle),
  });
  const withoutValidator = createAllStarBohAdminStore({
    db: {},
    firestore: fake.firestore,
    seasonId: SEASON_ID,
    uid: 'admin-1',
    admin: true,
  });
  await assert.rejects(
    withoutValidator.publish(bundle, {
      expectedRevision: 0,
      ...publicationSourceOptions(bundle),
    }),
    /requires the complete model validation hook/
  );
  assert.equal(fake.transactionCount, 0);

  const validationCalls = [];
  const admin = createAllStarBohAdminStore({
    db: {},
    firestore: fake.firestore,
    seasonId: SEASON_ID,
    uid: 'admin-1',
    admin: true,
    validatePublication: (sanitized) => {
      validationCalls.push(['configured', sanitized.current.activePlanRevision]);
      return { valid: true };
    },
  });
  const result = await admin.publish(bundle, {
    expectedRevision: 0,
    ...publicationSourceOptions(bundle),
    validate: (sanitized) => {
      validationCalls.push(['per-call', sanitized.current.activePlanRevision]);
      return true;
    },
  });

  assert.deepEqual(validationCalls, [
    ['configured', 1],
    ['per-call', 1],
  ]);
  assert.equal(result.current.activePlanRevision, 1);
  assert.equal(result.current.revision, 1);
  assert.equal(result.current.phases.length, 5);
  assert.equal(result.current.legions.length, 2);
  assert.equal('plan' in result.teams['team-1'], false);
  const personal = result.players['firebase-uid-1-1'];
  assert.equal(personal.plan.phases.length, 5);
  assert.equal(personal.plan.legions.length, 2);
  assert.deepEqual(
    personal.plan.objectives.map((objective) => objective.id),
    ['used-objective']
  );
  assert.deepEqual(personal.plan.playerOverrides, []);
  assert.deepEqual(personal.plan.seatOverrides, []);
  assert.deepEqual(personal.plan.instructions, []);
  assert.equal('substitutions' in personal.plan, false);
  assert.equal('playerResources' in personal.plan, false);
  assert.equal('buildingAnnotations' in personal.plan, false);
  assert.equal(personal.timeline.length, 10);
  assert.equal(personal.timeline[0].teamId, 'team-1');
  assert.equal(personal.timeline[0].playerId, 'stable-player-1');
  assert.equal(personal.timeline[0].instruction.standby, true);
  assert.equal(personal.timeline[1].instruction.standby, false);
  assert.equal(personal.timeline[0].instruction.gatherCrystals, true);
  assert.equal(personal.timeline[1].instruction.gatherCrystals, false);
  assert.equal('standby' in result.players['firebase-uid-1-2'].timeline[0].instruction, false);
  assert.equal(
    'gatherCrystals' in result.players['firebase-uid-1-2'].timeline[0].instruction,
    false
  );
  assert.deepEqual(result.teams['team-1'].coLeaderIds, ['stable-player-2', 'stable-player-3']);
  assert.ok(Buffer.byteLength(JSON.stringify(personal), 'utf8') < 96 * 1024);
});

test('plan publication rejects incomplete, empty, or mismatched personal timelines before Firestore writes', async () => {
  const fake = createFirestoreFake();
  const admin = createAllStarBohAdminStore({
    db: {},
    firestore: fake.firestore,
    seasonId: SEASON_ID,
    uid: 'admin-1',
    admin: true,
    validatePublication: () => true,
  });

  const incomplete = completePublicationBundle({ planPublished: true });
  incomplete.players['firebase-uid-1-1'].timeline.pop();
  await assert.rejects(
    admin.publish(incomplete, {
      expectedRevision: 0,
      ...publicationSourceOptions(incomplete),
    }),
    /requires all 10 phase and Legion assignments/
  );

  const emptyInstruction = completePublicationBundle({ planPublished: true });
  emptyInstruction.players['firebase-uid-1-1'].timeline[0].instruction = {};
  await assert.rejects(
    admin.publish(emptyInstruction, {
      expectedRevision: 0,
      ...publicationSourceOptions(emptyInstruction),
    }),
    /timeline has an empty instruction/
  );

  const standbyFalseOnly = completePublicationBundle({ planPublished: true });
  standbyFalseOnly.players['firebase-uid-1-1'].timeline[0].instruction = { standby: false };
  await assert.rejects(
    admin.publish(standbyFalseOnly, {
      expectedRevision: 0,
      ...publicationSourceOptions(standbyFalseOnly),
    }),
    /timeline has an empty instruction/
  );

  const gatherCrystalsFalseOnly = completePublicationBundle({ planPublished: true });
  gatherCrystalsFalseOnly.players['firebase-uid-1-1'].timeline[0].instruction = {
    gatherCrystals: false,
  };
  await assert.rejects(
    admin.publish(gatherCrystalsFalseOnly, {
      expectedRevision: 0,
      ...publicationSourceOptions(gatherCrystalsFalseOnly),
    }),
    /timeline has an empty instruction/
  );

  const badCoLeader = completePublicationBundle({ planPublished: true });
  badCoLeader.teams['team-1'].coLeaderIds = ['stable-player-1'];
  await assert.rejects(
    admin.publish(badCoLeader, {
      expectedRevision: 0,
      ...publicationSourceOptions(badCoLeader),
    }),
    /co-leader cannot be the captain/
  );

  const missingCoLeaderSeat = completePublicationBundle({ planPublished: true });
  missingCoLeaderSeat.teams['team-1'].coLeaderIds = ['not-on-team'];
  await assert.rejects(
    admin.publish(missingCoLeaderSeat, {
      expectedRevision: 0,
      ...publicationSourceOptions(missingCoLeaderSeat),
    }),
    /must be assigned to one of its seats/
  );

  const duplicateCoLeader = completePublicationBundle({ planPublished: true });
  duplicateCoLeader.teams['team-1'].coLeaderIds = ['stable-player-2', 'stable-player-2'];
  await assert.rejects(
    admin.publish(duplicateCoLeader, {
      expectedRevision: 0,
      ...publicationSourceOptions(duplicateCoLeader),
    }),
    /co-leaders must be unique/
  );

  const wrongIdentity = completePublicationBundle({ planPublished: true });
  wrongIdentity.players['firebase-uid-1-1'].timeline[0].playerId = 'stable-player-2';
  await assert.rejects(
    admin.publish(wrongIdentity, {
      expectedRevision: 0,
      ...publicationSourceOptions(wrongIdentity),
    }),
    /timeline identity does not match/
  );
  assert.equal(fake.transactionCount, 0);
});

test('publish rejects a wrong owner mapping and a concurrently changed source draft atomically', async () => {
  const bundle = completePublicationBundle();
  const wrongOwnerSeeds = submissionSeedsForPublication(bundle);
  wrongOwnerSeeds[getAllStarBohSubmissionPath(SEASON_ID, 'firebase-uid-1-1')].playerId =
    'stable-player-2';
  const wrongOwnerFake = createFirestoreFake({
    ...wrongOwnerSeeds,
    ...reviewSeedsForPublication(bundle),
    ...draftSeedsForPublication(bundle),
  });
  const wrongOwnerAdmin = createAllStarBohAdminStore({
    db: {},
    firestore: wrongOwnerFake.firestore,
    seasonId: SEASON_ID,
    uid: 'admin-1',
    admin: true,
  });
  await assert.rejects(
    wrongOwnerAdmin.publish(bundle, {
      expectedRevision: 0,
      ...publicationSourceOptions(bundle),
    }),
    /does not match its submitted signup/
  );
  assert.equal(wrongOwnerFake.read(getAllStarBohPublishedPath(SEASON_ID)), undefined);
  assert.equal(
    wrongOwnerFake.read(getAllStarBohPublishedPlayerPath(SEASON_ID, 'firebase-uid-1-1')),
    undefined
  );

  const changedDraftFake = createFirestoreFake({
    ...submissionSeedsForPublication(bundle),
    ...reviewSeedsForPublication(bundle),
    ...draftSeedsForPublication(bundle, 2),
  });
  const changedDraftAdmin = createAllStarBohAdminStore({
    db: {},
    firestore: changedDraftFake.firestore,
    seasonId: SEASON_ID,
    uid: 'admin-1',
    admin: true,
  });
  await assert.rejects(
    changedDraftAdmin.publish(bundle, {
      expectedRevision: 0,
      ...publicationSourceOptions(bundle, 1),
    }),
    (error) =>
      error instanceof AllStarBohConflictError &&
      error.path === getAllStarBohDraftPath(SEASON_ID) &&
      error.expectedRevision === 1 &&
      error.actualRevision === 2
  );
  assert.equal(changedDraftFake.read(getAllStarBohPublishedPath(SEASON_ID)), undefined);
});

test('publish rejects a stale verified review without writing any public projection', async () => {
  const bundle = completePublicationBundle();
  const reviews = reviewSeedsForPublication(bundle);
  reviews[getAllStarBohReviewPath(SEASON_ID, 'firebase-uid-1-1')].submissionRevision = 0;
  const fake = createFirestoreFake({
    ...submissionSeedsForPublication(bundle),
    ...reviews,
    ...draftSeedsForPublication(bundle),
  });
  const admin = createAllStarBohAdminStore({
    db: {},
    firestore: fake.firestore,
    seasonId: SEASON_ID,
    uid: 'admin-1',
    admin: true,
  });

  await assert.rejects(
    admin.publish(bundle, {
      expectedRevision: 0,
      ...publicationSourceOptions(bundle),
    }),
    /does not have a current verified review/
  );
  assert.equal(fake.read(getAllStarBohPublishedPath(SEASON_ID)), undefined);
  assert.equal(
    fake.read(getAllStarBohPublishedPlayerPath(SEASON_ID, 'firebase-uid-1-1')),
    undefined
  );
});

test('publish rejects a publication-index revision mismatch without exposing its player IDs', async () => {
  const bundle = completePublicationBundle();
  const currentPath = getAllStarBohPublishedPath(SEASON_ID);
  const indexPath = getAllStarBohPublicationIndexPath(SEASON_ID);
  const existingCurrent = {
    seasonId: SEASON_ID,
    schemaVersion: 1,
    revision: 2,
    status: 'announcement',
    teamIds: [],
  };
  const fake = createFirestoreFake({
    ...submissionSeedsForPublication(bundle),
    ...reviewSeedsForPublication(bundle),
    ...draftSeedsForPublication(bundle),
    [currentPath]: existingCurrent,
    [indexPath]: {
      seasonId: SEASON_ID,
      schemaVersion: 1,
      revision: 1,
      playerIds: ['former-player'],
      teamIds: [],
    },
  });
  const admin = createAllStarBohAdminStore({
    db: {},
    firestore: fake.firestore,
    seasonId: SEASON_ID,
    uid: 'admin-1',
    admin: true,
  });

  await assert.rejects(
    admin.publish(bundle, {
      expectedRevision: 2,
      ...publicationSourceOptions(bundle),
    }),
    (error) =>
      error instanceof AllStarBohConflictError &&
      error.path === indexPath &&
      error.expectedRevision === 2 &&
      error.actualRevision === 1
  );
  assert.deepEqual(fake.read(currentPath), existingCurrent);
  assert.deepEqual(fake.read(indexPath).playerIds, ['former-player']);
});

test('publish validation, reference errors, conflicts, and commit failures leave every document unchanged', async () => {
  const currentPath = getAllStarBohPublishedPath(SEASON_ID);
  const original = {
    seasonId: SEASON_ID,
    schemaVersion: 1,
    revision: 2,
    status: 'announcement',
    title: 'Still current',
    teamIds: [],
    playerIds: [],
    phases: [],
    legions: [],
  };
  const fake = createFirestoreFake({ [currentPath]: original });
  const admin = createAllStarBohAdminStore({
    db: {},
    firestore: fake.firestore,
    seasonId: SEASON_ID,
    uid: 'admin-1',
    admin: true,
  });
  const validBundle = completePublicationBundle();

  await assert.rejects(
    admin.publish(validBundle, {
      expectedRevision: 2,
      ...publicationSourceOptions(validBundle),
      validate: () => false,
    }),
    AllStarBohPublishValidationError
  );
  assert.deepEqual(fake.read(currentPath), original);
  assert.equal(fake.transactionCount, 0);

  const mismatchedBundle = completePublicationBundle();
  mismatchedBundle.players['firebase-uid-1-1'].teamId = 'team-2';
  await assert.rejects(
    admin.publish(mismatchedBundle, { expectedRevision: 2 }),
    /different published team/
  );
  assert.deepEqual(fake.read(currentPath), original);
  assert.equal(fake.transactionCount, 0);

  const duplicateSeatBundle = completePublicationBundle();
  duplicateSeatBundle.teams['team-1'].seats[1].id = duplicateSeatBundle.teams['team-1'].seats[0].id;
  await assert.rejects(
    admin.publish(duplicateSeatBundle, { expectedRevision: 2 }),
    /Duplicate seat ID/
  );
  assert.deepEqual(fake.read(currentPath), original);
  assert.equal(fake.transactionCount, 0);

  await assert.rejects(
    admin.publish(validBundle, {
      expectedRevision: 1,
      ...publicationSourceOptions(validBundle),
    }),
    (error) => error instanceof AllStarBohConflictError && error.actualRevision === 2
  );
  assert.deepEqual(fake.read(currentPath), original);

  const failingFake = createFirestoreFake(
    {
      ...submissionSeedsForPublication(validBundle),
      ...reviewSeedsForPublication(validBundle),
      ...draftSeedsForPublication(validBundle),
      [currentPath]: original,
    },
    { failCommit: true }
  );
  const failingAdmin = createAllStarBohAdminStore({
    db: {},
    firestore: failingFake.firestore,
    seasonId: SEASON_ID,
    uid: 'admin-1',
    admin: true,
  });
  await assert.rejects(
    failingAdmin.publish(validBundle, {
      expectedRevision: 2,
      ...publicationSourceOptions(validBundle),
    }),
    /Synthetic commit failure/
  );
  assert.deepEqual(failingFake.read(currentPath), original);
  assert.equal(failingFake.read(getAllStarBohPublishedTeamPath(SEASON_ID, 'team-1')), undefined);
  assert.equal(
    failingFake.read(getAllStarBohPublishedPlayerPath(SEASON_ID, 'player-1')),
    undefined
  );
  assert.equal(failingFake.read(getAllStarBohPublicationIndexPath(SEASON_ID)), undefined);
});

test('transaction retries commit one coherent revision and serializers reject invalid or oversized fields', async () => {
  const fake = createFirestoreFake({}, { transactionAttempts: 2 });
  const player = createAllStarBohPlayerStore({
    db: {},
    firestore: fake.firestore,
    seasonId: SEASON_ID,
    uid: 'player-1',
  });
  const saved = await player.saveSubmission(submission('Retry-safe'));
  assert.equal(saved.revision, 1);
  assert.equal(fake.transactionCount, 1);
  assert.equal(fake.read(getAllStarBohSubmissionPath(SEASON_ID, 'player-1')).revision, 1);

  await assert.rejects(
    player.saveSubmission(submission('Invalid number', { stats: { troopPower: Number.NaN } }), {
      expectedRevision: 1,
    }),
    /Troop power must be between/
  );
  await assert.rejects(
    player.saveSubmission(
      submission('Oversized', {
        commitment: {
          availability: 'all',
          fightingTimeIds: ['+12', '+14'],
          vts1097Member: true,
          notes: 'x'.repeat(2001),
        },
      }),
      { expectedRevision: 1 }
    ),
    /Player notes exceeds 2000 characters/
  );
  await assert.rejects(
    player.saveSubmission(
      submission('Data URL', {
        ocr: { used: true, valuesConfirmed: true, imageData: 'data:image/jpeg;base64,AAAA' },
      }),
      { expectedRevision: 1 }
    ),
    /cannot be persisted/
  );
  await assert.rejects(
    player.saveSubmission(
      submission('Unconfirmed OCR', {
        status: 'submitted',
        entryMethod: 'ocr',
        ocr: { used: true, valuesConfirmed: false },
      }),
      { expectedRevision: 1 }
    ),
    /must be reviewed and confirmed/
  );
  const draftOcr = await player.saveSubmission(
    submission('Draft OCR review', {
      status: 'draft',
      entryMethod: 'ocr',
      ocr: { used: true, valuesConfirmed: false },
    }),
    { expectedRevision: 1 }
  );
  assert.equal(draftOcr.status, 'draft');
  assert.equal(draftOcr.ocr.valuesConfirmed, false);
  assert.equal(
    fake.read(getAllStarBohSubmissionPath(SEASON_ID, 'player-1')).gameName,
    'Draft OCR review'
  );
});
