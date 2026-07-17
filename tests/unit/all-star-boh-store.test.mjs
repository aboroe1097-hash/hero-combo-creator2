import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ALL_STAR_BOH_CONFIG_PATH,
  ALL_STAR_BOH_ROOT_COLLECTION,
  AllStarBohAdminRequiredError,
  AllStarBohConflictError,
  AllStarBohPublishValidationError,
  AllStarBohValidationError,
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
  getAllStarBohSeasonPath,
  getAllStarBohSubmissionPath,
  normalizeAllStarBohFeedback,
  normalizeAllStarBohEpicPreferences,
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
      fightingTimeIds: ['+8', '+12'],
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
  const teams = {};
  const players = {};
  let playerNumber = 0;
  for (let teamNumber = 1; teamNumber <= 6; teamNumber += 1) {
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
      teamCount: 6,
      rosterSize: 12,
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
      fightingTimeIds: ['+20', '+12'],
    },
  });

  assert.deepEqual(saved.stats.usableHeroNames, ['Hero Z', 'Hero B']);
  assert.deepEqual(saved.stats.readySpeedHeroes, ['lionheart']);
  assert.deepEqual(saved.stats.researchProgressPct, { development: 75, combat: 0 });
  assert.deepEqual(Object.keys(saved.stats.researchProgressPct), ['development', 'combat']);
  assert.equal(saved.commitment.preferredRole, '');
  assert.deepEqual(saved.commitment.fightingTimeIds, ['+12', '+20']);

  const legacyStored = fake.read(path);
  delete legacyStored.commitment.fightingTimeIds;
  fake.write(path, legacyStored);
  assert.deepEqual((await store.getSubmission()).commitment.fightingTimeIds, []);

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
  assert.deepEqual(admin.epicTimeSlotIds, ['+8', '+10', '+12']);
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
  await assert.rejects(store.saveDraft({ title: 'Denied' }), AllStarBohAdminRequiredError);
  assert.equal(fake.getDocsCount, 0);
  assert.equal(fake.transactionCount, 0);
  assert.equal(
    fake.listenerCount('collection', `${getAllStarBohSeasonPath(SEASON_ID)}/submissions`),
    0
  );
});

test('admin lists and observes submissions, saves reviews, and accepts incomplete drafts', async () => {
  const player1Path = getAllStarBohSubmissionPath(SEASON_ID, 'player-1');
  const player2Path = getAllStarBohSubmissionPath(SEASON_ID, 'player-2');
  const fake = createFirestoreFake({
    [player1Path]: storedSubmission('player-1', 1, submission('Player One')),
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
      teamIds: ['team-1'],
      playerIds: ['player-1'],
      plan: emptyPlan(),
    },
    { expectedRevision: 1 }
  );
  assert.equal(draftUpdates.length, 2);
  assert.equal(draftUpdates[1].title, 'Live draft update');
  unsubscribeDraft();

  const draftTeam = await store.saveDraftTeam('team-1', publishedTeam('team-1', ['player-1']), {
    expectedRevision: 0,
  });
  assert.equal(draftTeam.teamId, 'team-1');
  assert.equal(draftTeam.revision, 1);
  assert.equal(draftTeam.seats[0].locked, true);
  assert.equal(draftTeam.scoreTotal, 999_999);
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
  });
  assert.equal(confirmed.revision, 1);
  assert.equal(fake.read(reviewPath).internalNote, 'Captain candidate; keep private.');
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
  const teamIds = Array.from({ length: 6 }, (_, index) => `team-${index + 1}`);
  const initial = {
    [draftPath]: { seasonId: SEASON_ID, revision: 2, title: 'Original draft' },
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
  assert.equal(preflightFake.transactionCount, 0);
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

test('plan publication requires complete validation, stores compact timelines, and pins the active revision', async () => {
  const bundle = completePublicationBundle({ planPublished: true });
  bundle.current.activePlanRevision = 999;
  bundle.players['firebase-uid-1-1'].plan.objectives = [
    { id: 'used-objective', code: 'T1', label: 'Center Tower', x: 50, y: 40 },
    { id: 'unused-objective', code: 'T9', label: 'Unused global marker', x: 90, y: 90 },
  ];
  bundle.players['firebase-uid-1-1'].timeline[0].instruction.objectiveId = 'used-objective';
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
  assert.equal(result.current.phases.length, 4);
  assert.equal(result.current.legions.length, 2);
  assert.equal('plan' in result.teams['team-1'], false);
  const personal = result.players['firebase-uid-1-1'];
  assert.equal(personal.plan.phases.length, 4);
  assert.equal(personal.plan.legions.length, 2);
  assert.deepEqual(
    personal.plan.objectives.map((objective) => objective.id),
    ['used-objective']
  );
  assert.deepEqual(personal.plan.playerOverrides, []);
  assert.deepEqual(personal.plan.seatOverrides, []);
  assert.deepEqual(personal.plan.instructions, []);
  assert.equal(personal.timeline.length, 8);
  assert.equal(personal.timeline[0].teamId, 'team-1');
  assert.equal(personal.timeline[0].playerId, 'stable-player-1');
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
    /requires all eight phase and Legion assignments/
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
          fightingTimeIds: ['+8', '+12'],
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
