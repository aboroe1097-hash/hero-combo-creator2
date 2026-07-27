import assert from 'node:assert/strict';
import test from 'node:test';

import { createVtsScoreHandler, readVtsScoreRequest } from '../../functions/src/vts-score.js';

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
  const valid = {
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
  assert.deepEqual(readVtsScoreRequest(request('POST', valid)), valid);
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
  await handler(
    request('POST', {
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
    }),
    response
  );
  assert.equal(response.statusCode, 200);
  const stored = runtime.documents.get('boh_allstar/competition-11/raceScores/signup-uid');
  assert.equal(stored.dragonPower, 7_450_000);
  assert.equal(stored.submittedByUid, 'member-uid');
  assert.equal(stored.baselineSubmissionRevision, 4);
  assert.doesNotMatch(JSON.stringify(stored), /image|base64|screenshot/i);
});
