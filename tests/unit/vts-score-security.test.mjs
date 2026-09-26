import assert from 'node:assert/strict';
import test from 'node:test';

import { createVtsScoreHandler, readVtsScoreRequest } from '../../functions/src/vts-score.js';
import { DEAD_TROOP_COUNT_KEYS } from '../../js/dead-troops.js';

const POWER_VALUES = Object.freeze({
  totalCastlePower: 1_112_473_195,
  troopPower: 999_076_138,
  buildingPower: 6_477_467,
  technologyPower: 38_902_234,
  heroCombatPower: 30_585_714,
  dragonPower: 16_306_050,
  unitSpecialtyPower: 21_125_570,
  artifactPower: 0,
  royalTechPower: null,
});
const POWER_FIELDS = Object.freeze(Object.keys(POWER_VALUES));

function fullScoreBody(overrides = {}) {
  return {
    seasonId: 'competition-11',
    submissionUid: 'signup-uid',
    gameName: 'Dragon One',
    powerValues: POWER_VALUES,
    ocr: {
      requestId: 'ocr-request-1',
      sourceValues: POWER_VALUES,
      confidence: Object.fromEntries(POWER_FIELDS.map((field) => [field, 0.93])),
      correctedFields: [],
    },
    ...overrides,
  };
}

function snapshot(id, data) {
  return {
    id,
    exists: data !== null,
    data: () => data,
  };
}

function responseRecorder() {
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

function request(method, body) {
  return {
    method,
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

function dependencies() {
  const documents = new Map([
    [
      'boh_allstar_member_grants/member-uid',
      {
        schemaVersion: 1,
        uid: 'member-uid',
        seasonId: 'competition-11',
        expiresAt: { toMillis: () => 2_000_000 },
      },
    ],
    [
      'boh_allstar/competition-11/submissions/signup-uid',
      {
        status: 'submitted',
        gameName: 'Dragon One',
        revision: 4,
      },
    ],
  ]);
  const db = {
    doc(path) {
      return {
        path,
        async get() {
          return snapshot(path.split('/').at(-1), documents.get(path) || null);
        },
      };
    },
    collection(path) {
      return {
        async get() {
          const prefix = `${path}/`;
          return {
            docs: [...documents]
              .filter(([key]) => key.startsWith(prefix) && !key.slice(prefix.length).includes('/'))
              .map(([key, value]) => snapshot(key.split('/').at(-1), value)),
          };
        },
      };
    },
    async runTransaction(callback) {
      const writes = [];
      const transaction = {
        async get(ref) {
          return snapshot(ref.path.split('/').at(-1), documents.get(ref.path) || null);
        },
        set(ref, value) {
          writes.push([ref.path, value]);
        },
      };
      await callback(transaction);
      for (const [path, value] of writes) documents.set(path, value);
    },
  };
  return {
    auth: { verifyIdToken: async () => ({ uid: 'member-uid' }) },
    appCheck: { verifyToken: async () => ({ appId: 'web-app' }) },
    db,
    now: () => 1_000_000,
    serverTimestamp: () => ({ server: true }),
    documents,
  };
}

test('VtsScore request parser rejects unknown fields and never accepts images', () => {
  const legacy = {
    seasonId: 'competition-11',
    submissionUid: 'signup-uid',
    gameName: 'Dragon One',
    dragonPower: 7_450_000,
    ocr: {
      requestId: 'ocr-request-1',
      originalDragonPower: 7_400_000,
      confidence: 0.93,
      corrected: true,
    },
  };
  assert.equal(readVtsScoreRequest(request('POST', legacy)).schemaVersion, 1);
  const valid = fullScoreBody();
  const parsed = readVtsScoreRequest(request('POST', valid));
  assert.equal(parsed.schemaVersion, 2);
  assert.deepEqual(parsed.powerValues, POWER_VALUES);
  assert.throws(
    () => readVtsScoreRequest(request('POST', { ...valid, imageData: 'data:image/jpeg;base64,x' })),
    /Invalid score request/
  );
});

test('VtsScore GET exposes only eligible signup identity', async () => {
  const runtime = dependencies();
  const handler = createVtsScoreHandler(runtime);
  const response = responseRecorder();
  await handler(request('GET'), response);
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body.players, [
    { submissionUid: 'signup-uid', gameName: 'Dragon One' },
  ]);
  assert.doesNotMatch(JSON.stringify(response.body), /dragonPower|stats|ocr/i);
});

test('VtsScore POST verifies the target signup and stores no screenshot bytes', async () => {
  const runtime = dependencies();
  const handler = createVtsScoreHandler(runtime);
  const response = responseRecorder();
  await handler(request('POST', fullScoreBody()), response);
  assert.equal(response.statusCode, 200);
  const stored = runtime.documents.get('boh_allstar/competition-11/raceScores/signup-uid');
  assert.equal(stored.schemaVersion, 2);
  assert.deepEqual(stored.powerValues, POWER_VALUES);
  assert.equal(response.body.score.powerValues.totalCastlePower, 1_112_473_195);
  assert.equal(stored.submittedByUid, 'member-uid');
  assert.equal(stored.baselineSubmissionRevision, 4);
  assert.doesNotMatch(JSON.stringify(stored), /image|base64|screenshot/i);
});

test('VtsScore stores dead troop counts and excludes that power from OCR correction flags', async () => {
  const deadTroopCounts = Object.fromEntries(DEAD_TROOP_COUNT_KEYS.map((key) => [key, 0]));
  deadTroopCounts.FootmenLofty = 1000;
  const adjustedPower = {
    ...POWER_VALUES,
    totalCastlePower: POWER_VALUES.totalCastlePower + 8200,
    troopPower: POWER_VALUES.troopPower + 8200,
  };
  const payload = fullScoreBody({
    powerValues: adjustedPower,
    deadTroopCounts,
    ocr: { ...fullScoreBody().ocr, correctedFields: [] },
  });
  const parsed = readVtsScoreRequest(request('POST', payload));
  assert.deepEqual(parsed.deadTroopCounts, deadTroopCounts);
  assert.deepEqual(parsed.ocr.correctedFields, []);

  const runtime = dependencies();
  const response = responseRecorder();
  await createVtsScoreHandler(runtime)(request('POST', payload), response);
  assert.equal(response.statusCode, 200);
  const saved = runtime.documents.get('boh_allstar/competition-11/raceScores/signup-uid');
  assert.equal(saved.powerValues.totalCastlePower, adjustedPower.totalCastlePower);
  assert.deepEqual(saved.deadTroopCounts, deadTroopCounts);
});

function competitionSchedule(seasonId, offsetsMs) {
  const keys = [
    'opensAt',
    'phase1ClosesAt',
    'deadlineAt',
    'reuploadOpensAt',
    'reuploadClosesAt',
    'winnersStartAt',
    'winnersEndAt',
  ];
  return {
    seasonId,
    title: 'Competition #12',
    ...Object.fromEntries(keys.map((key, index) => [key, { toMillis: () => offsetsMs[index] }])),
  };
}

test('VtsScore POST is refused outside the re-upload window of a scheduled season', async () => {
  // now() is 1_000_000: the final check phase, before the re-upload window.
  const runtime = dependencies();
  runtime.documents.set(
    'boh_allstar_competition/current',
    competitionSchedule(
      'competition-11',
      [0, 500_000, 1_500_000, 2_000_000, 3_000_000, 4_000_000, 5_000_000]
    )
  );
  const handler = createVtsScoreHandler(runtime);
  const response = responseRecorder();
  await handler(request('POST', fullScoreBody()), response);
  assert.equal(response.statusCode, 403);
  assert.deepEqual(response.body, { error: 'upload_closed' });
  assert.equal(runtime.documents.has('boh_allstar/competition-11/raceScores/signup-uid'), false);

  // After the window has closed it is still refused.
  runtime.documents.set(
    'boh_allstar_competition/current',
    competitionSchedule('competition-11', [0, 100, 200, 300, 400, 500, 600])
  );
  const late = responseRecorder();
  await handler(request('POST', fullScoreBody()), late);
  assert.equal(late.statusCode, 403);
  assert.deepEqual(late.body, { error: 'upload_closed' });
});

test('VtsScore POST is accepted inside the re-upload window', async () => {
  const runtime = dependencies();
  runtime.documents.set(
    'boh_allstar_competition/current',
    competitionSchedule('competition-11', [0, 100, 200, 300, 1_500_000, 1_600_000, 1_700_000])
  );
  const handler = createVtsScoreHandler(runtime);
  const response = responseRecorder();
  await handler(request('POST', fullScoreBody()), response);
  assert.equal(response.statusCode, 200);
  assert.ok(runtime.documents.has('boh_allstar/competition-11/raceScores/signup-uid'));
});

test('VtsScore POST keeps its behaviour for a season without a schedule', async () => {
  const runtime = dependencies();
  // A schedule for another season, and an unreadable one, both leave uploads open.
  for (const schedule of [
    competitionSchedule('competition-12', [0, 100, 200, 300, 400, 500, 600]),
    { seasonId: 'competition-11', opensAt: 'not a time' },
  ]) {
    runtime.documents.set('boh_allstar_competition/current', schedule);
    const handler = createVtsScoreHandler(runtime);
    const response = responseRecorder();
    await handler(request('POST', fullScoreBody()), response);
    assert.equal(response.statusCode, 200);
  }
});

test('VtsScore GET is not gated by the re-upload window', async () => {
  const runtime = dependencies();
  runtime.documents.set(
    'boh_allstar_competition/current',
    competitionSchedule('competition-11', [0, 100, 200, 300, 400, 500, 600])
  );
  const handler = createVtsScoreHandler(runtime);
  const response = responseRecorder();
  await handler(request('GET'), response);
  assert.equal(response.statusCode, 200);
});
