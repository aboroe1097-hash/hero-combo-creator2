import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { readAllStarBohGrantDocument } from '../../js/all-star-boh-access.js';
import { allHeroesData } from '../../js/heroes-data.js';
import { techDatabase } from '../../js/tech-db.js';
import { verifyBohStatsOcrMemberGrant } from '../../workers/qwen-cors-proxy.js';
import {
  ALL_STAR_BOH_ATTEMPT_COLLECTION,
  ALL_STAR_BOH_CONFIG_PATH,
  ALL_STAR_BOH_GRANT_COLLECTION,
  ALL_STAR_BOH_GRANT_SCHEMA_VERSION,
  AllStarBohUnlockError,
  applyAllStarBohThrottle,
  constantTimePinMatches,
  createUnlockAllStarBohHandler,
  evaluateAllStarBohAttempt,
  getAllStarBohGrantPath,
  hashThrottleKey,
  isAllowedAllStarBohOrigin,
  issueAllStarBohGrant,
  normalizeAllStarBohUnlockConfig,
  readAllStarBohPinRequest,
} from '../../functions/src/all-star-boh-auth.js';

const MEMBER_PIN = 'test-member-pin-2026';
const THROTTLE_PEPPER = 'test-only-independent-throttle-pepper-1234567890';
const NOW_MS = 1_750_000_000_000;
const REPOSITORY_ROOT_URL = new URL('../../', import.meta.url);

function readRepositoryFile(path) {
  return readFileSync(new URL(path, REPOSITORY_ROOT_URL), 'utf8');
}

function snapshot(value) {
  return {
    exists: value !== undefined,
    data: () => value,
  };
}

function createFirestoreFake(config = {}, options = {}) {
  const documents = new Map([[ALL_STAR_BOH_CONFIG_PATH, { ...config }]]);
  let transactionNumber = 0;

  function reference(path) {
    return {
      path,
      async get() {
        return snapshot(documents.get(path));
      },
    };
  }

  return {
    doc: reference,
    async runTransaction(callback) {
      transactionNumber += 1;
      options.beforeTransaction?.({ transactionNumber, documents });
      const operations = [];
      const result = await callback({
        async get(ref) {
          return snapshot(documents.get(ref.path));
        },
        set(ref, value) {
          operations.push({ type: 'set', path: ref.path, value });
        },
        delete(ref) {
          operations.push({ type: 'delete', path: ref.path });
        },
      });
      for (const operation of operations) {
        if (operation.type === 'set') documents.set(operation.path, operation.value);
        else documents.delete(operation.path);
      }
      return result;
    },
    read(path) {
      return documents.get(path);
    },
    write(path, value) {
      documents.set(path, value);
    },
    entries() {
      return [...documents.entries()];
    },
  };
}

function createResponse() {
  return {
    statusCode: 200,
    headers: new Map(),
    body: null,
    status(value) {
      this.statusCode = value;
      return this;
    },
    set(name, value) {
      this.headers.set(String(name).toLowerCase(), String(value));
      return this;
    },
    json(value) {
      this.body = value;
      return this;
    },
    send(value) {
      this.body = value;
      return this;
    },
  };
}

function createRequest(overrides = {}) {
  const body = overrides.body ?? { pin: MEMBER_PIN };
  const rawBody = Buffer.from(typeof body === 'string' ? body : JSON.stringify(body));
  const { headers: headerOverrides = {}, ...requestOverrides } = overrides;
  return {
    method: 'POST',
    ip: '203.0.113.25',
    body,
    headers: {
      origin: 'https://roc-vts.com',
      'content-type': 'application/json; charset=utf-8',
      authorization: 'Bearer firebase-id-token',
      'x-firebase-appcheck': 'firebase-app-check-token',
      ...headerOverrides,
    },
    ...requestOverrides,
    rawBody: overrides.rawBody ?? rawBody,
  };
}

function createHandlerFixture(options = {}) {
  const db =
    options.db ||
    createFirestoreFake({
      activeSeason: 'season-2026',
      open: true,
      grantDurationMinutes: 720,
    });
  const forbiddenClaimCalls = [];
  const auth = {
    async verifyIdToken(token, checkRevoked) {
      if (options.authFails || token !== 'firebase-id-token' || checkRevoked !== true) {
        throw new Error('invalid token');
      }
      return { uid: 'firebase-user-1', ...(options.decodedClaims || {}) };
    },
    async getUser(uid) {
      forbiddenClaimCalls.push({ method: 'getUser', uid });
      throw new Error('The member grant path must not read mutable Auth custom claims.');
    },
    async setCustomUserClaims(uid, claims) {
      forbiddenClaimCalls.push({ method: 'setCustomUserClaims', uid, claims });
      throw new Error('The member grant path must not replace Auth custom claims.');
    },
  };
  const appCheck = {
    async verifyToken(token) {
      if (options.appCheckFails || token !== 'firebase-app-check-token') {
        throw new Error('invalid app check');
      }
      return { appId: 'test-app' };
    },
  };
  const handler = createUnlockAllStarBohHandler({
    auth,
    appCheck,
    db,
    getMemberPin: () => options.memberPin ?? MEMBER_PIN,
    getThrottlePepper: () => options.throttlePepper ?? THROTTLE_PEPPER,
    timestampFromMillis: (value) => ({ timestampMs: value }),
    serverTimestamp: () => ({ serverTimestamp: true }),
    now: () => NOW_MS,
  });
  return {
    handler,
    auth,
    db,
    forbiddenClaimCalls,
  };
}

async function invoke(fixture, request = createRequest()) {
  const response = createResponse();
  await fixture.handler(request, response);
  return response;
}

function rulesMatch(source, pattern, label) {
  const match = source.match(pattern);
  assert.ok(match, `Missing Firestore rules block: ${label}`);
  return match[0];
}

function rulesSingleQuotedList(source, pattern, label) {
  const block = rulesMatch(source, pattern, label);
  const listMatch = block.match(/hasOnly\(\[([\s\S]*?)\]\)/);
  assert.ok(listMatch, `Missing Firestore rules allowlist: ${label}`);
  return [...listMatch[1].matchAll(/'((?:\\.|[^'\\])*)'/g)].map((match) =>
    match[1].replace(/\\'/g, "'").replace(/\\\\/g, '\\')
  );
}

test('unlock origin allowlist accepts production, preview, and local emulator origins only', () => {
  for (const origin of [
    'https://roc-vts.com',
    'https://www.roc-vts.com',
    'https://abocombo--preview-14-0-16-a1b2.web.app',
    'https://abocombo--pr-60.firebaseapp.com',
    'http://localhost:5173',
    'http://127.0.0.1:5002',
    'http://[::1]:5173',
  ]) {
    assert.equal(isAllowedAllStarBohOrigin(origin), true, origin);
  }
  for (const origin of [
    '',
    'https://roc-vts.com.evil.example',
    'http://roc-vts.com',
    'https://abocombo.web.app',
    'https://abocombo--preview.web.app:444',
    'https://abocombo--preview.web.app.evil.example',
    'https://evil.example',
  ]) {
    assert.equal(isAllowedAllStarBohOrigin(origin), false, origin);
  }
});

test('unlock body parser requires bounded JSON containing only one PIN field', () => {
  assert.equal(readAllStarBohPinRequest(createRequest()), MEMBER_PIN);
  assert.throws(
    () => readAllStarBohPinRequest(createRequest({ headers: { 'content-type': 'text/plain' } })),
    (error) => error instanceof AllStarBohUnlockError && error.status === 415
  );
  assert.throws(
    () => readAllStarBohPinRequest(createRequest({ body: { pin: MEMBER_PIN, admin: true } })),
    /Invalid unlock request/
  );
  assert.throws(
    () =>
      readAllStarBohPinRequest(
        createRequest({
          body: { pin: 'x' },
          rawBody: Buffer.alloc(1025, 120),
        })
      ),
    (error) => error instanceof AllStarBohUnlockError && error.status === 413
  );
});

test('PIN comparison and throttle identifiers use fixed digests without exposing inputs', () => {
  assert.equal(constantTimePinMatches(MEMBER_PIN, MEMBER_PIN), true);
  assert.equal(constantTimePinMatches(`${MEMBER_PIN}x`, MEMBER_PIN), false);
  const uidDigest = hashThrottleKey('uid', 'firebase-user-1', THROTTLE_PEPPER);
  const ipDigest = hashThrottleKey('ip', '203.0.113.25', THROTTLE_PEPPER);
  assert.match(uidDigest, /^[a-f0-9]{64}$/);
  assert.match(ipDigest, /^[a-f0-9]{64}$/);
  assert.notEqual(uidDigest, ipDigest);
  assert.doesNotMatch(uidDigest, /firebase-user|203\.0\.113/);
  assert.throws(
    () => hashThrottleKey('ip', '203.0.113.25', 'short'),
    (error) => error instanceof AllStarBohUnlockError && error.status === 503
  );
});

test('attempt policy resets windows, locks on the fifth failure, and never clears an active lock', () => {
  const first = evaluateAllStarBohAttempt(null, NOW_MS, false);
  assert.equal(first.payload.failedCount, 1);
  const fifth = evaluateAllStarBohAttempt(
    { windowStartedAtMs: NOW_MS - 1000, failedCount: 4, lockedUntilMs: 0 },
    NOW_MS,
    false
  );
  assert.equal(fifth.locked, true);
  assert.equal(fifth.payload.failedCount, 5);
  assert.equal(fifth.retryAfterMs, 15 * 60 * 1000);
  const stillLocked = evaluateAllStarBohAttempt(
    { windowStartedAtMs: NOW_MS, failedCount: 5, lockedUntilMs: NOW_MS + 60_000 },
    NOW_MS,
    true
  );
  assert.equal(stillLocked.locked, true);
  assert.equal(stillLocked.clear, false);
  const reset = evaluateAllStarBohAttempt(
    { windowStartedAtMs: NOW_MS - 11 * 60 * 1000, failedCount: 4, lockedUntilMs: 0 },
    NOW_MS,
    false
  );
  assert.equal(reset.payload.failedCount, 1);
  assert.equal(reset.payload.windowStartedAtMs, NOW_MS);
});

test('transactional throttle persists only scoped digests and bounded counters', async () => {
  const db = createFirestoreFake({ activeSeason: 'season-2026' });
  const uidDigest = hashThrottleKey('uid', 'firebase-user-1', THROTTLE_PEPPER);
  const ipDigest = hashThrottleKey('ip', '203.0.113.25', THROTTLE_PEPPER);
  await applyAllStarBohThrottle({
    db,
    uidDigest,
    ipDigest,
    nowMs: NOW_MS,
    succeeded: false,
    timestampFromMillis: (value) => ({ timestampMs: value }),
    serverTimestamp: () => ({ serverTimestamp: true }),
  });
  const attempts = db
    .entries()
    .filter(([path]) => path.startsWith(ALL_STAR_BOH_ATTEMPT_COLLECTION));
  assert.equal(attempts.length, 2);
  const serialized = JSON.stringify(attempts);
  assert.doesNotMatch(serialized, /firebase-user-1|203\.0\.113\.25|test-member-pin/);
  assert.match(serialized, /failedCount/);
  assert.match(serialized, /expiresAt/);
});

test('unlock handler verifies Auth and App Check, writes an isolated grant, and returns its season', async () => {
  const fixture = createHandlerFixture();
  const response = await invoke(fixture);
  const expiresAtMs = NOW_MS + 720 * 60 * 1000;
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, {
    season: 'season-2026',
    expiresAt: Math.floor(expiresAtMs / 1000),
  });
  assert.equal(response.headers.get('cache-control'), 'no-store, max-age=0');
  assert.equal(response.headers.get('access-control-allow-origin'), 'https://roc-vts.com');
  assert.deepEqual(fixture.forbiddenClaimCalls, []);
  assert.deepEqual(fixture.db.read(getAllStarBohGrantPath('firebase-user-1')), {
    schemaVersion: ALL_STAR_BOH_GRANT_SCHEMA_VERSION,
    uid: 'firebase-user-1',
    seasonId: 'season-2026',
    issuedAt: { serverTimestamp: true },
    expiresAt: { timestampMs: expiresAtMs },
  });
});

test('one grant contract joins Function issuance, browser reload, rules, and OCR authorization', async () => {
  const fixture = createHandlerFixture();
  const response = await invoke(fixture);
  const stored = fixture.db.read(getAllStarBohGrantPath('firebase-user-1'));
  const firestoreDocument = {
    name: `projects/abocombo/databases/(default)/documents/${getAllStarBohGrantPath(
      'firebase-user-1'
    )}`,
    fields: {
      schemaVersion: { integerValue: String(stored.schemaVersion) },
      uid: { stringValue: stored.uid },
      seasonId: { stringValue: stored.seasonId },
      issuedAt: { timestampValue: new Date(NOW_MS).toISOString() },
      expiresAt: { timestampValue: new Date(stored.expiresAt.timestampMs).toISOString() },
    },
  };

  const browserGrant = readAllStarBohGrantDocument(firestoreDocument, 'firebase-user-1', {
    now: () => NOW_MS,
    expectedSeason: response.body.season,
  });
  assert.deepEqual(browserGrant, {
    seasonId: response.body.season,
    expiresAt: response.body.expiresAt,
  });

  const originalFetch = globalThis.fetch;
  let workerGrantRequest = null;
  globalThis.fetch = async (url, init) => {
    workerGrantRequest = { url: String(url), init };
    return Response.json(firestoreDocument);
  };
  try {
    const workerGrant = await verifyBohStatsOcrMemberGrant(
      new Request('https://worker.example.test/boh/stats-ocr', {
        headers: {
          Authorization: 'Bearer firebase-id-token',
          'X-Firebase-AppCheck': 'firebase-app-check-token',
        },
      }),
      { FIREBASE_PROJECT_ID: 'abocombo' },
      'firebase-user-1',
      response.body.season,
      NOW_MS
    );
    assert.deepEqual(workerGrant, browserGrant);
  } finally {
    globalThis.fetch = originalFetch;
  }
  assert.equal(
    workerGrantRequest.url,
    'https://firestore.googleapis.com/v1/projects/abocombo/databases/(default)/documents/boh_allstar_member_grants/firebase-user-1'
  );
  assert.equal(workerGrantRequest.init.headers.Authorization, 'Bearer firebase-id-token');

  const rules = readRepositoryFile('firestore.rules');
  assert.match(rules, /boh_allstar_member_grants\/\$\(request\.auth\.uid\)/);
  assert.match(rules, /\.data\.activeSeason == season/);
  assert.match(rules, /\.data\.expiresAt > request\.time/);
});

test('member unlock never reads or replaces custom claims, including for an admin token', async () => {
  const fixture = createHandlerFixture({ decodedClaims: { admin: true, captain: true } });
  const response = await invoke(fixture);
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, {
    season: 'season-2026',
    expiresAt: Math.floor((NOW_MS + 720 * 60 * 1000) / 1000),
  });
  assert.deepEqual(fixture.forbiddenClaimCalls, []);
  assert.ok(fixture.db.read(getAllStarBohGrantPath('firebase-user-1')));
});

test('grant transaction uses the latest authoritative config season and duration', async () => {
  const db = createFirestoreFake(
    { activeSeason: 'stale-season', open: true, grantDurationMinutes: 30 },
    {
      beforeTransaction({ transactionNumber, documents }) {
        if (transactionNumber !== 1) return;
        documents.set(ALL_STAR_BOH_CONFIG_PATH, {
          activeSeason: 'season-2027',
          open: true,
          grantDurationMinutes: 60,
        });
      },
    }
  );
  const result = await issueAllStarBohGrant({
    db,
    uid: 'firebase-user-1',
    nowMs: NOW_MS,
    timestampFromMillis: (value) => ({ timestampMs: value }),
    serverTimestamp: () => ({ serverTimestamp: true }),
  });
  assert.deepEqual(result, {
    season: 'season-2027',
    expiresAt: Math.floor((NOW_MS + 60 * 60 * 1000) / 1000),
    grantPath: `${ALL_STAR_BOH_GRANT_COLLECTION}/firebase-user-1`,
  });
  assert.equal(db.read(result.grantPath).seasonId, 'season-2027');
  assert.equal(db.read(result.grantPath).expiresAt.timestampMs, NOW_MS + 60 * 60 * 1000);
});

test('unlock handler rejects disallowed methods and origins before secrets or grants', async () => {
  const fixture = createHandlerFixture();
  const methodResponse = await invoke(fixture, createRequest({ method: 'GET' }));
  assert.equal(methodResponse.statusCode, 405);
  assert.deepEqual(methodResponse.body, { error: 'method_not_allowed' });

  const originResponse = await invoke(
    fixture,
    createRequest({ headers: { origin: 'https://evil.example' } })
  );
  assert.equal(originResponse.statusCode, 403);
  assert.deepEqual(originResponse.body, { error: 'origin_denied' });
  assert.equal(originResponse.headers.has('access-control-allow-origin'), false);

  const preflightResponse = await invoke(fixture, createRequest({ method: 'OPTIONS' }));
  assert.equal(preflightResponse.statusCode, 204);
  assert.equal(fixture.db.read(getAllStarBohGrantPath('firebase-user-1')), undefined);
});

test('unlock handler independently rejects missing Auth and invalid App Check', async () => {
  const authFixture = createHandlerFixture();
  const noAuth = await invoke(authFixture, createRequest({ headers: { authorization: '' } }));
  assert.equal(noAuth.statusCode, 401);
  assert.deepEqual(noAuth.body, { error: 'auth_required' });

  const appCheckFixture = createHandlerFixture({ appCheckFails: true });
  const badAppCheck = await invoke(appCheckFixture);
  assert.equal(badAppCheck.statusCode, 401);
  assert.deepEqual(badAppCheck.body, { error: 'invalid_app_check' });
  assert.equal(appCheckFixture.db.read(getAllStarBohGrantPath('firebase-user-1')), undefined);
});

test('five invalid PINs lock both UID and IP digests and a correct PIN cannot bypass lockout', async () => {
  const fixture = createHandlerFixture();
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const response = await invoke(fixture, createRequest({ body: { pin: 'wrong-pin' } }));
    assert.equal(response.statusCode, 403, `attempt ${attempt}`);
    assert.deepEqual(response.body, { error: 'access_denied' });
  }
  const lockingResponse = await invoke(fixture, createRequest({ body: { pin: 'wrong-pin' } }));
  assert.equal(lockingResponse.statusCode, 429);
  assert.deepEqual(lockingResponse.body, { error: 'temporarily_locked' });
  assert.equal(lockingResponse.headers.get('retry-after'), '900');

  const correctButLocked = await invoke(fixture);
  assert.equal(correctButLocked.statusCode, 429);
  assert.equal(fixture.db.read(getAllStarBohGrantPath('firebase-user-1')), undefined);
  const serializedAttempts = JSON.stringify(
    fixture.db.entries().filter(([path]) => path.startsWith(ALL_STAR_BOH_ATTEMPT_COLLECTION))
  );
  assert.doesNotMatch(serializedAttempts, /wrong-pin|firebase-user-1|203\.0\.113\.25/);
});

test('closed seasons and missing server secrets fail closed', async () => {
  const closedDb = createFirestoreFake({
    activeSeason: 'season-2026',
    open: false,
    grantDurationMinutes: 720,
  });
  const closed = await invoke(createHandlerFixture({ db: closedDb }));
  assert.equal(closed.statusCode, 409);
  assert.deepEqual(closed.body, { error: 'signups_closed' });

  const missingSecret = await invoke(createHandlerFixture({ memberPin: '' }));
  assert.equal(missingSecret.statusCode, 503);
  assert.deepEqual(missingSecret.body, { error: 'service_unavailable' });

  const weakSecret = await invoke(createHandlerFixture({ memberPin: 'short-pin' }));
  assert.equal(weakSecret.statusCode, 503);
  assert.deepEqual(weakSecret.body, { error: 'service_unavailable' });
});

test('configuration and grant-path helpers require bounded values', () => {
  assert.deepEqual(
    normalizeAllStarBohUnlockConfig({
      activeSeason: 'season-2026',
      open: true,
      grantDurationMinutes: 720,
    }),
    { activeSeason: 'season-2026', open: true, grantDurationMinutes: 720 }
  );
  assert.throws(
    () =>
      normalizeAllStarBohUnlockConfig({
        activeSeason: '../season',
        open: true,
        grantDurationMinutes: 720,
      }),
    AllStarBohUnlockError
  );
  assert.equal(
    getAllStarBohGrantPath('firebase-user-1'),
    `${ALL_STAR_BOH_GRANT_COLLECTION}/firebase-user-1`
  );
  assert.throws(
    () => getAllStarBohGrantPath('../other-user'),
    (error) => error instanceof AllStarBohUnlockError && error.code === 'invalid_auth'
  );
});

test('function entrypoint declares Node 22, both managed secrets, and no logged credential material', () => {
  const firebaseConfig = JSON.parse(readRepositoryFile('firebase.json'));
  const packageConfig = JSON.parse(readRepositoryFile('functions/package.json'));
  const entrypoint = readRepositoryFile('functions/index.js');
  const implementation = readRepositoryFile('functions/src/all-star-boh-auth.js');
  assert.equal(firebaseConfig.functions.source, 'functions');
  assert.equal(firebaseConfig.functions.runtime, 'nodejs22');
  assert.equal(packageConfig.engines.node, '22');
  assert.match(entrypoint, /defineSecret\('BOH_MEMBER_PIN'\)/);
  assert.match(entrypoint, /defineSecret\('BOH_THROTTLE_PEPPER'\)/);
  assert.match(entrypoint, /secrets: \[memberPin, throttlePepper\]/);
  assert.doesNotMatch(`${entrypoint}\n${implementation}`, /console\.(?:log|info|warn|error)/);
  assert.doesNotMatch(`${entrypoint}\n${implementation}`, /BOH_MEMBER_PIN\s*=/);
  assert.doesNotMatch(implementation, /(?:pin|address):\s*(?:pin|clientAddress)/);
  assert.doesNotMatch(implementation, /setCustomUserClaims|getUser\(/);
  assert.match(implementation, /boh_allstar_member_grants/);
});

test('Firestore grant helper requires a matching active server grant and preserves admin bypass', () => {
  const rules = readRepositoryFile('firestore.rules');
  const helper = rulesMatch(
    rules,
    /function hasActiveAllStarBohGrant\(season\) \{[\s\S]*?\n {4}\}/,
    'active grant helper'
  );
  assert.match(helper, /isAdmin\(\)/);
  assert.match(helper, /boh_allstar_member_grants\/\$\(request\.auth\.uid\)/);
  assert.match(helper, /\.data\.keys\(\)\.hasOnly/);
  assert.match(helper, /\.data\.schemaVersion == 1/);
  assert.match(helper, /\.data\.uid == request\.auth\.uid/);
  assert.match(helper, /\.data\.seasonId == season/);
  assert.match(helper, /\.data\.expiresAt is timestamp/);
  assert.match(helper, /\.data\.issuedAt <= request\.time/);
  assert.match(helper, /\.data\.expiresAt > request\.time/);
  assert.match(helper, /boh_allstar_config\/current/);
  assert.match(helper, /\.data\.activeSeason == season/);
  assert.doesNotMatch(helper, /request\.auth\.token\.bohAllStar/);
});

test('Firestore submissions are own-get/create/update only for members, never list/delete', () => {
  const rules = readRepositoryFile('firestore.rules');
  const block = rulesMatch(
    rules,
    /match \/submissions\/\{uid\} \{[\s\S]*?\n {6}\}/,
    'member submissions'
  );
  assert.match(
    block,
    /allow get: if isAdmin\(\) \|\| \(isOwner\(uid\) && hasActiveAllStarBohGrant\(season\)\)/
  );
  assert.match(block, /allow list: if isAdmin\(\)/);
  assert.match(
    block,
    /allow create: if isOwner\(uid\)[\s\S]*hasActiveAllStarBohGrant\(season\)[\s\S]*validAllStarBohSubmissionCreate/
  );
  assert.match(block, /allow update: if isOwner\(uid\)[\s\S]*validAllStarBohSubmissionUpdate/);
  assert.match(block, /allow delete: if false/);
  assert.doesNotMatch(block, /allow (?:create|update): if isAdmin/);

  const updateValidator = rulesMatch(
    rules,
    /function validAllStarBohSubmissionUpdate\(season, uid\) \{[\s\S]*?\n {4}\}/,
    'submission update validator'
  );
  for (const immutableField of ['playerId', 'uid', 'seasonId', 'schemaVersion', 'createdAt']) {
    assert.match(
      updateValidator,
      new RegExp(`${immutableField} == resource\\.data\\.${immutableField}`)
    );
  }
  assert.match(updateValidator, /revision == resource\.data\.revision \+ 1/);
});

test('Firestore private and published paths enforce admin/member boundaries without broad access', () => {
  const rules = readRepositoryFile('firestore.rules');
  const config = rulesMatch(
    rules,
    /match \/boh_allstar_config\/current \{[\s\S]*?\n {4}\}/,
    'boh_allstar_config/current'
  );
  assert.match(config, /allow get: if isAdmin\(\)/);
  assert.match(config, /allow list: if false/);
  assert.match(config, /allow create, update: if isAdmin\(\) && validAllStarBohConfig\(\)/);
  assert.match(config, /allow delete: if false/);
  assert.doesNotMatch(config, /signedIn\(\)|hasActiveAllStarBohGrant/);
  const configValidator = rulesMatch(
    rules,
    /function validAllStarBohConfig\(\) \{[\s\S]*?\n {4}\}/,
    'All-Star config validator'
  );
  assert.match(configValidator, /keys\(\)\.hasOnly/);
  assert.match(configValidator, /activeSeason.*open.*grantDurationMinutes/s);
  assert.match(configValidator, /activeSeason\.matches\('\^\[A-Za-z0-9_-\]\{1,80\}\$'\)/);
  assert.match(configValidator, /grantDurationMinutes >= 5/);
  assert.match(configValidator, /grantDurationMinutes <= 10080/);

  const grants = rulesMatch(
    rules,
    /match \/boh_allstar_member_grants\/\{uid\} \{[\s\S]*?\n {4}\}/,
    'boh_allstar_member_grants'
  );
  assert.match(grants, /allow get: if canReadOwnActiveAllStarBohGrant\(uid\)/);
  assert.match(grants, /allow list, create, update, delete: if false/);
  const ownGrant = rulesMatch(
    rules,
    /function canReadOwnActiveAllStarBohGrant\(uid\) \{[\s\S]*?\n {4}\}/,
    'own active grant helper'
  );
  assert.match(ownGrant, /isOwner\(uid\)/);
  assert.match(ownGrant, /keys\(\)\.hasOnly/);
  assert.match(ownGrant, /resource\.data\.schemaVersion == 1/);
  assert.match(ownGrant, /resource\.data\.uid == uid/);
  assert.match(ownGrant, /resource\.data\.expiresAt > request\.time/);
  assert.match(ownGrant, /boh_allstar_config\/current/);
  assert.match(ownGrant, /\.data\.activeSeason == resource\.data\.seasonId/);

  const attempts = rulesMatch(
    rules,
    /match \/boh_allstar_security_attempts\/\{attemptId\} \{[\s\S]*?\n {4}\}/,
    'boh_allstar_security_attempts'
  );
  assert.match(attempts, /allow read, write: if isAdmin\(\)/);
  assert.doesNotMatch(attempts, /signedIn\(\)|hasActiveAllStarBohGrant/);
  for (const path of ['reviews', 'drafts', 'draftTeams']) {
    const block = rulesMatch(
      rules,
      new RegExp(`match /${path}/\\{[^}]+\\} \\{[\\s\\S]*?\\n      \\}`),
      path
    );
    assert.match(block, /isAdmin\(\)/);
    assert.doesNotMatch(block, /hasActiveAllStarBohGrant/);
  }
  const feedback = rulesMatch(
    rules,
    /match \/feedback\/\{uid\} \{[\s\S]*?\n {6}\}/,
    'member feedback'
  );
  assert.match(
    feedback,
    /allow get: if isAdmin\(\) \|\| \(isOwner\(uid\) && hasActiveAllStarBohGrant\(season\)\)/
  );
  assert.match(feedback, /allow list: if false/);
  assert.match(feedback, /allow create: if isAdmin\(\) && validAllStarBohFeedbackCreate/);
  assert.match(feedback, /allow update: if isAdmin\(\) && validAllStarBohFeedbackUpdate/);
  assert.match(feedback, /allow delete: if false/);
  const feedbackValidator = rulesMatch(
    rules,
    /function validAllStarBohFeedback\(season, uid\) \{[\s\S]*?\n {4}\}/,
    'member feedback validator'
  );
  assert.match(feedbackValidator, /keys\(\)\.hasOnly/);
  assert.match(feedbackValidator, /'pending', 'confirmed', 'needs_correction', 'excluded'/s);
  assert.match(feedbackValidator, /submissionRevision is int/);
  assert.match(feedbackValidator, /reviewRevision is int/);
  assert.match(feedbackValidator, /seasonId == season/);
  assert.match(feedbackValidator, /uid == uid/);
  assert.match(feedbackValidator, /'needs_correction', 'excluded'/);
  assert.match(feedbackValidator, /note\.size\(\) > 0/);
  assert.doesNotMatch(feedbackValidator, /updatedBy/);
  const published = rulesMatch(
    rules,
    /match \/published\/current \{[\s\S]*?\n {6}\}/,
    'published current'
  );
  const teams = rulesMatch(
    rules,
    /match \/publishedTeams\/\{teamId\} \{[\s\S]*?\n {6}\}/,
    'published teams'
  );
  assert.match(published, /allow get: if hasActiveAllStarBohGrant\(season\)/);
  assert.match(
    published,
    /!exists\([\s\S]*published\/current[\s\S]*\)[\s\S]*safeAllStarBohPublishedOverviewRead\(season\)/
  );
  assert.match(published, /safeAllStarBohPublishedOverviewRead\(season\)/);
  assert.match(published, /allow list: if false/);
  assert.match(published, /validAllStarBohPublishedOverviewCreate\(season\)/);
  assert.match(published, /validAllStarBohPublishedOverviewUpdate\(season\)/);
  assert.match(teams, /allow get: if hasActiveAllStarBohGrant\(season\)/);
  assert.match(teams, /safeAllStarBohPublishedTeamRead\(season, teamId\)/);
  assert.match(teams, /allow list: if false/);
  assert.match(published, /allow delete: if isAdmin\(\)/);
  assert.match(teams, /validAllStarBohPublishedTeamCreate\(season, teamId\)/);
  assert.match(teams, /validAllStarBohPublishedTeamUpdate\(season, teamId\)/);
  assert.match(teams, /allow delete: if isAdmin\(\)/);

  const teamValidator = rulesMatch(
    rules,
    /function validAllStarBohPublishedTeamData\(data, season, teamId\) \{[\s\S]*?\n {4}\}/,
    'published team validator'
  );
  assert.match(teamValidator, /keys\(\)\.hasOnly/);
  assert.match(teamValidator, /validAllStarBohPublishedSeats/);
  const teamAllowlist = rulesMatch(
    teamValidator,
    /keys\(\)\.hasOnly\(\[[\s\S]*?\]\)/,
    'published team key allowlist'
  );
  assert.doesNotMatch(teamAllowlist, /'plan'|'timeline'|'instructions'|'notes'/);

  const players = rulesMatch(
    rules,
    /match \/publishedPlayers\/\{uid\} \{[\s\S]*?\n {6}\}/,
    'published players'
  );
  assert.match(
    players,
    /isOwner\(uid\)[\s\S]*hasActiveAllStarBohGrant\(season\)[\s\S]*safeAllStarBohPublishedPlayerRead\(season, uid\)/
  );
  assert.match(
    players,
    /!exists\([\s\S]*publishedPlayers\/\$\(uid\)[\s\S]*\)[\s\S]*safeAllStarBohPublishedPlayerRead\(season, uid\)/
  );
  assert.match(players, /allow list: if false/);
  assert.match(players, /validAllStarBohPublishedPlayerCreate\(season, uid\)/);
  assert.match(players, /validAllStarBohPublishedPlayerUpdate\(season, uid\)/);
  assert.match(players, /allow delete: if isAdmin\(\)/);

  const playerValidator = rulesMatch(
    rules,
    /function validAllStarBohPublishedPlayerData\(data, season, uid\) \{[\s\S]*?\n {4}\}/,
    'published player validator'
  );
  assert.match(playerValidator, /data\.keys\(\)\.hasOnly/);
  assert.match(playerValidator, /data\.playerId == uid/);
  assert.match(playerValidator, /data\.uid == uid/);
  assert.match(playerValidator, /data\.seasonId == season/);
  assert.match(playerValidator, /validAllStarBohPublishedPlan/);
  assert.match(playerValidator, /validAllStarBohPublishedTimeline/);
  const playerCreateValidator = rulesMatch(
    rules,
    /function validAllStarBohPublishedPlayerCreate\(season, uid\) \{[\s\S]*?\n {4}\}/,
    'published player create validator'
  );
  assert.match(playerCreateValidator, /getAfter\(/);
  assert.match(playerCreateValidator, /published\/current/);
  assert.match(playerCreateValidator, /createdAt == request\.time/);
  assert.match(playerCreateValidator, /updatedAt == request\.time/);
  const playerUpdateValidator = rulesMatch(
    rules,
    /function validAllStarBohPublishedPlayerUpdate\(season, uid\) \{[\s\S]*?\n {4}\}/,
    'published player update validator'
  );
  assert.match(playerUpdateValidator, /revision == resource\.data\.revision \+ 1/);
  assert.match(playerUpdateValidator, /createdAt == resource\.data\.createdAt/);

  const overviewValidator = rulesMatch(
    rules,
    /function validAllStarBohPublishedOverviewData\(data, season\) \{[\s\S]*?\n {4}\}/,
    'published overview validator'
  );
  assert.match(overviewValidator, /keys\(\)\.hasOnly/);
  assert.match(overviewValidator, /teamIds/);
  assert.match(overviewValidator, /validAllStarBohPublishedPhases/);
  assert.match(overviewValidator, /validAllStarBohPublishedLegions/);
  assert.match(overviewValidator, /data\.seasonId == season/);
  const overviewAllowlist = rulesMatch(
    overviewValidator,
    /keys\(\)\.hasOnly\(\[[\s\S]*?\]\)/,
    'published overview key allowlist'
  );
  assert.doesNotMatch(
    overviewAllowlist,
    /'playerIds'|'timeline'|'instructions'|'seatOverrides'|'plan'/
  );

  const publicationReadGate = rulesMatch(
    rules,
    /function activeAllStarBohPublicationData\(data, season\) \{[\s\S]*?\n {4}\}/,
    'active publication read gate'
  );
  assert.match(publicationReadGate, /data\.announcementPublished == true/);
  assert.match(publicationReadGate, /data\.teamCount == 6/);
  assert.match(publicationReadGate, /data\.rosterSize == 12/);
  assert.match(publicationReadGate, /data\.teamIds\.size\(\) == 6/);
  assert.match(
    publicationReadGate,
    /data\.teamIds\.toSet\(\)\.size\(\) == data\.teamIds\.size\(\)/
  );
  assert.match(
    publicationReadGate,
    /data\.planPublished == true[\s\S]*data\.status in \['plan', 'live'\][\s\S]*data\.activePlanRevision == data\.revision/
  );
  assert.match(
    publicationReadGate,
    /data\.planPublished == false[\s\S]*data\.status in \['announcement', 'live'\][\s\S]*data\.activePlanRevision == null/
  );

  const hiddenPublicationReadGate = rulesMatch(
    rules,
    /function safeAllStarBohHiddenPublicationData\(data, season\) \{[\s\S]*?\n {4}\}/,
    'hidden publication read gate'
  );
  assert.match(hiddenPublicationReadGate, /data\.status == 'hidden'/);
  assert.match(hiddenPublicationReadGate, /data\.eventName == ''/);
  assert.match(hiddenPublicationReadGate, /data\.title == ''/);
  assert.match(hiddenPublicationReadGate, /data\.subtitle == ''/);
  assert.match(hiddenPublicationReadGate, /data\.message == ''/);
  assert.match(hiddenPublicationReadGate, /data\.announcementPublished == false/);
  assert.match(hiddenPublicationReadGate, /data\.planPublished == false/);
  assert.match(hiddenPublicationReadGate, /data\.teamCount == 0/);
  assert.match(hiddenPublicationReadGate, /data\.rosterSize == 0/);
  assert.match(hiddenPublicationReadGate, /data\.teamIds\.size\(\) == 0/);
  assert.match(hiddenPublicationReadGate, /data\.phases\.size\(\) == 0/);
  assert.match(hiddenPublicationReadGate, /data\.legions\.size\(\) == 0/);

  const overviewReadGate = rulesMatch(
    rules,
    /function safeAllStarBohPublishedOverviewRead\(season\) \{[\s\S]*?\n {4}\}/,
    'published overview read gate'
  );
  assert.match(overviewReadGate, /validAllStarBohPublishedOverviewData\(resource\.data, season\)/);
  assert.match(overviewReadGate, /activeAllStarBohPublicationData\(resource\.data, season\)/);
  assert.match(overviewReadGate, /safeAllStarBohHiddenPublicationData\(resource\.data, season\)/);

  for (const [label, matcher] of [
    [
      'overview create state gate',
      /function validAllStarBohPublishedOverviewCreate\(season\) \{[\s\S]*activeAllStarBohPublicationData\(request\.resource\.data, season\)[\s\S]*safeAllStarBohHiddenPublicationData\(request\.resource\.data, season\)/,
    ],
    [
      'overview update state gate',
      /function validAllStarBohPublishedOverviewUpdate\(season\) \{[\s\S]*activeAllStarBohPublicationData\(request\.resource\.data, season\)[\s\S]*safeAllStarBohHiddenPublicationData\(request\.resource\.data, season\)/,
    ],
  ]) {
    assert.match(rules, matcher, label);
  }

  const teamReadGate = rulesMatch(
    rules,
    /function safeAllStarBohPublishedTeamRead\(season, teamId\) \{[\s\S]*?\n {4}\}/,
    'published team read gate'
  );
  assert.match(teamReadGate, /published\/current/);
  assert.match(teamReadGate, /activeAllStarBohPublicationData/);
  assert.match(teamReadGate, /teamIds\.hasAny\(\[teamId\]\)/);
  assert.match(teamReadGate, /resource\.data\.revision == get\(/);

  const playerReadGate = rulesMatch(
    rules,
    /function safeAllStarBohPublishedPlayerRead\(season, uid\) \{[\s\S]*?\n {4}\}/,
    'published player read gate'
  );
  assert.match(playerReadGate, /published\/current/);
  assert.match(playerReadGate, /activeAllStarBohPublicationData/);
  assert.match(playerReadGate, /teamIds\.hasAny\(\[resource\.data\.teamId\]\)/);
  assert.match(playerReadGate, /resource\.data\.revision == get\(/);
  assert.match(
    playerReadGate,
    /planPublished == true[\s\S]*'plan' in resource\.data[\s\S]*'timeline' in resource\.data/
  );
  assert.match(
    playerReadGate,
    /planPublished == false[\s\S]*!\('plan' in resource\.data\)[\s\S]*!\('timeline' in resource\.data\)/
  );

  for (const [label, matcher] of [
    [
      'overview update revision',
      /function validAllStarBohPublishedOverviewUpdate\(season\) \{[\s\S]*?revision == resource\.data\.revision \+ 1/,
    ],
    [
      'team update revision',
      /function validAllStarBohPublishedTeamUpdate\(season, teamId\) \{[\s\S]*?revision == resource\.data\.revision \+ 1/,
    ],
  ]) {
    assert.match(rules, matcher, label);
  }
});

test('Firestore submission schema is allowlisted and has no raw PIN or image field', () => {
  const rules = readRepositoryFile('firestore.rules');
  const validator = rulesMatch(
    rules,
    /function validAllStarBohSubmission\(season, uid\) \{[\s\S]*?\n {4}\}/,
    'submission schema'
  );
  assert.match(validator, /keys\(\)\.hasOnly/);
  assert.match(validator, /validAllStarBohStats/);
  assert.match(validator, /validAllStarBohCommitment/);
  assert.match(validator, /validAllStarBohOcr/);
  assert.match(
    validator,
    /!\('preferredTeammates' in request\.resource\.data\)[\s\S]*validAllStarBohStringList\([\s\S]*request\.resource\.data\.preferredTeammates,[\s\S]*6,[\s\S]*160/
  );
  const submissionHasOnly = rulesMatch(
    validator,
    /keys\(\)\.hasOnly\(\[[\s\S]*?\]\)/,
    'submission key allowlist'
  );
  const submissionHasAll = rulesMatch(
    validator,
    /keys\(\)\.hasAll\(\[[\s\S]*?\]\)/,
    'submission required keys'
  );
  assert.match(submissionHasOnly, /'preferredTeammates'/);
  assert.doesNotMatch(submissionHasAll, /'preferredTeammates'/);
  const updateValidator = rulesMatch(
    rules,
    /function validAllStarBohSubmissionUpdate\(season, uid\) \{[\s\S]*?\n {4}\}/,
    'submission update schema'
  );
  assert.match(updateValidator, /'preferredTeammates'/);
  assert.doesNotMatch(
    validator,
    /(?:password|secret|pincode|screenshot|imageData|imageBytes|base64|dataUrl)/i
  );
  assert.match(rules, /!value\.matches\('\^data:image\/\.\*'\)/);
  const statsValidator = rulesMatch(
    rules,
    /function validAllStarBohStats\(stats\) \{[\s\S]*?\n {4}\}/,
    'member stats schema'
  );
  assert.doesNotMatch(statsValidator, /bohUsefulRating/);
});

test('Firestore private signup tactical catalogs match canonical source data', () => {
  const rules = readRepositoryFile('firestore.rules');
  const statsValidator = rulesMatch(
    rules,
    /function validAllStarBohStats\(stats\) \{[\s\S]*?\n {4}\}/,
    'member stats schema'
  );
  const statsHasOnly = rulesMatch(
    statsValidator,
    /keys\(\)\.hasOnly\(\[[\s\S]*?\]\)/,
    'member stats allowlist'
  );
  const statsHasAll = rulesMatch(
    statsValidator,
    /keys\(\)\.hasAll\(\[[\s\S]*?\]\)/,
    'legacy-compatible member stats required keys'
  );
  for (const optionalKey of ['usableHeroNames', 'researchProgressPct']) {
    assert.match(statsHasOnly, new RegExp(`'${optionalKey}'`));
    assert.doesNotMatch(statsHasAll, new RegExp(`'${optionalKey}'`));
  }
  assert.match(
    statsValidator,
    /!\('usableHeroNames' in stats\)[\s\S]*validAllStarBohUsableHeroNames\(stats\.usableHeroNames\)/
  );
  assert.match(
    statsValidator,
    /!\('researchProgressPct' in stats\)[\s\S]*validAllStarBohResearchProgress\(stats\.researchProgressPct\)/
  );

  const canonicalHeroes = allHeroesData.map(({ name }) => name);
  assert.equal(canonicalHeroes.length, 78);
  assert.equal(new Set(canonicalHeroes).size, canonicalHeroes.length);
  const rulesHeroes = rulesSingleQuotedList(
    rules,
    /function validAllStarBohUsableHeroNames\(values\) \{[\s\S]*?\n {4}\}/,
    'usable hero catalog'
  );
  assert.deepEqual(rulesHeroes, canonicalHeroes);
  const heroValidator = rulesMatch(
    rules,
    /function validAllStarBohUsableHeroNames\(values\) \{[\s\S]*?\n {4}\}/,
    'usable hero validator'
  );
  assert.match(heroValidator, /values is list/);
  assert.match(heroValidator, /values\.size\(\) <= 78/);
  assert.match(heroValidator, /values\.toSet\(\)\.size\(\) == values\.size\(\)/);

  const canonicalResearchIds = techDatabase.map(({ id }) => id);
  assert.equal(canonicalResearchIds.length, 29);
  assert.equal(new Set(canonicalResearchIds).size, canonicalResearchIds.length);
  const rulesResearchIds = rulesSingleQuotedList(
    rules,
    /function validAllStarBohResearchProgress\(values\) \{[\s\S]*?\n {4}\}/,
    'research progress catalog'
  );
  assert.deepEqual(rulesResearchIds, canonicalResearchIds);
  const researchValidator = rulesMatch(
    rules,
    /function validAllStarBohResearchProgress\(values\) \{[\s\S]*?\n {4}\}/,
    'research progress validator'
  );
  assert.match(researchValidator, /values is map/);
  for (const researchId of canonicalResearchIds) {
    assert.match(
      researchValidator,
      new RegExp(`validAllStarBohResearchProgressItem\\(values, '${researchId}'\\)`)
    );
  }
  const researchItemValidator = rulesMatch(
    rules,
    /function validAllStarBohResearchProgressItem\(values, researchId\) \{[\s\S]*?\n {4}\}/,
    'research progress item validator'
  );
  assert.match(researchItemValidator, /!\(researchId in values\)/);
  assert.match(researchItemValidator, /values\.get\(researchId, -1\) is int/);
  assert.match(researchItemValidator, /values\.get\(researchId, -1\) >= 0/);
  assert.match(researchItemValidator, /values\.get\(researchId, -1\) <= 100/);

  const commitmentValidator = rulesMatch(
    rules,
    /function validAllStarBohCommitment\(commitment\) \{[\s\S]*?\n {4}\}/,
    'member commitment schema'
  );
  const commitmentHasOnly = rulesMatch(
    commitmentValidator,
    /keys\(\)\.hasOnly\(\[[\s\S]*?\]\)/,
    'member commitment allowlist'
  );
  const commitmentHasAll = rulesMatch(
    commitmentValidator,
    /keys\(\)\.hasAll\(\[[\s\S]*?\]\)/,
    'legacy-compatible member commitment required keys'
  );
  assert.match(commitmentHasOnly, /'fightingTimeIds'/);
  assert.doesNotMatch(commitmentHasAll, /'fightingTimeIds'/);
  assert.match(
    commitmentValidator,
    /!\('fightingTimeIds' in commitment\)[\s\S]*validAllStarBohFightingTimeIds\(commitment\.fightingTimeIds\)/
  );
  const fightingTimes = rulesMatch(
    rules,
    /function validAllStarBohFightingTimeIds\(values\) \{[\s\S]*?\n {4}\}/,
    'fighting time validator'
  );
  assert.match(fightingTimes, /values is list/);
  assert.match(fightingTimes, /values\.size\(\) == 2/);
  assert.match(fightingTimes, /values\.toSet\(\)\.size\(\) == values\.size\(\)/);
  assert.match(fightingTimes, /hasOnly\(\['\+8', '\+12', '\+14', '\+20'\]\)/);

  const publishedStart = rules.indexOf('function validAllStarBohPublishedPhaseItem');
  const submissionStart = rules.indexOf('function validAllStarBohSubmission(');
  assert.ok(publishedStart >= 0 && submissionStart > publishedStart);
  assert.doesNotMatch(
    rules.slice(publishedStart, submissionStart),
    /usableHeroNames|researchProgressPct|fightingTimeIds/
  );
});

test('Firestore keeps Epic Showdown preferences independent and owner-scoped', () => {
  const rules = readRepositoryFile('firestore.rules');
  const block = rulesMatch(
    rules,
    /match \/epicPreferences\/\{uid\} \{[\s\S]*?\n {6}\}/,
    'Epic Showdown preferences'
  );
  assert.match(
    block,
    /allow get: if isAdmin\(\)[\s\S]*isOwner\(uid\) && hasActiveAllStarBohGrant\(season\)/
  );
  assert.match(block, /allow list: if isAdmin\(\)/);
  assert.match(
    block,
    /allow create: if isOwner\(uid\)[\s\S]*hasActiveAllStarBohGrant\(season\)[\s\S]*validAllStarBohEpicPreferencesCreate\(season, uid\)/
  );
  assert.match(
    block,
    /allow update: if isOwner\(uid\)[\s\S]*hasActiveAllStarBohGrant\(season\)[\s\S]*validAllStarBohEpicPreferencesUpdate\(season, uid\)/
  );
  assert.match(block, /allow delete: if false/);
  assert.doesNotMatch(block, /allow (?:create|update): if isAdmin/);

  const validator = rulesMatch(
    rules,
    /function validAllStarBohEpicPreferences\(season, uid\) \{[\s\S]*?\n {4}\}/,
    'Epic Showdown preferences schema'
  );
  const keyAllowlist = rulesMatch(
    validator,
    /keys\(\)\.hasOnly\(\[[\s\S]*?\]\)/,
    'Epic Showdown preferences key allowlist'
  );
  for (const key of [
    'gameName',
    'lanePreferences',
    'timePreferences',
    'seasonId',
    'uid',
    'schemaVersion',
    'revision',
    'createdAt',
    'updatedAt',
    'updatedBy',
  ]) {
    assert.match(keyAllowlist, new RegExp(`'${key}'`));
  }
  assert.match(validator, /validAllStarBohText\(request\.resource\.data\.gameName, 160\)/);
  assert.match(validator, /request\.resource\.data\.gameName\.size\(\) > 0/);
  assert.match(validator, /seasonId == season/);
  assert.match(validator, /uid == uid/);
  assert.match(validator, /schemaVersion == 1/);
  assert.match(validator, /updatedAt == request\.time/);
  assert.match(validator, /updatedBy == request\.auth\.uid/);

  const lanes = rulesMatch(
    rules,
    /function validAllStarBohEpicLanePreferences\(values\) \{[\s\S]*?\n {4}\}/,
    'Epic Showdown lane schema'
  );
  assert.match(lanes, /values is list/);
  assert.match(lanes, /values\.size\(\) > 0/);
  assert.match(lanes, /values\.size\(\) <= 3/);
  assert.match(lanes, /values\.toSet\(\)\.size\(\) == values\.size\(\)/);
  assert.match(lanes, /hasOnly\(\['south', 'center', 'north'\]\)/);

  const times = rulesMatch(
    rules,
    /function validAllStarBohEpicTimePreferences\(values\) \{[\s\S]*?\n {4}\}/,
    'Epic Showdown time schema'
  );
  assert.match(times, /values is list/);
  assert.match(times, /values\.size\(\) > 0/);
  assert.match(times, /values\.size\(\) <= 3/);
  assert.match(times, /values\.toSet\(\)\.size\(\) == values\.size\(\)/);
  assert.match(times, /hasOnly\(\['\+8', '\+10', '\+12'\]\)/);

  const updateValidator = rulesMatch(
    rules,
    /function validAllStarBohEpicPreferencesUpdate\(season, uid\) \{[\s\S]*?\n {4}\}/,
    'Epic Showdown update schema'
  );
  assert.match(updateValidator, /diff\(resource\.data\)\.affectedKeys\(\)\.hasOnly/);
  assert.match(updateValidator, /'gameName'/);
  for (const immutableField of ['seasonId', 'uid', 'schemaVersion', 'createdAt']) {
    assert.match(
      updateValidator,
      new RegExp(`${immutableField} == resource\\.data\\.${immutableField}`)
    );
  }
  assert.match(updateValidator, /revision == resource\.data\.revision \+ 1/);

  const signupValidator = rulesMatch(
    rules,
    /function validAllStarBohSubmission\(season, uid\) \{[\s\S]*?\n {4}\}/,
    'submission schema remains separate from Epic preferences'
  );
  assert.doesNotMatch(signupValidator, /lanePreferences|timePreferences|epicPreferences/);
});
