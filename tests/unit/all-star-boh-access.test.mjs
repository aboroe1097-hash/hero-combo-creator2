import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  ALL_STAR_BOH_GRANT_SCHEMA_VERSION,
  AllStarBohAccessError,
  createAllStarBohAccessClient,
  readAllStarBohAccessGrant,
  readAllStarBohGrantDocument,
} from '../../js/all-star-boh-access.js';

const NOW_MS = 1_750_000_000_000;
const NOW_SECONDS = Math.floor(NOW_MS / 1000);
const SEASON_ID = 'season-2026';
const EXPIRES_AT = NOW_SECONDS + 3600;

function grantDocument(overrides = {}) {
  return {
    name: `projects/abocombo/databases/(default)/documents/boh_allstar_member_grants/member-uid`,
    fields: {
      schemaVersion: { integerValue: String(ALL_STAR_BOH_GRANT_SCHEMA_VERSION) },
      uid: { stringValue: 'member-uid' },
      seasonId: { stringValue: SEASON_ID },
      issuedAt: { timestampValue: new Date(NOW_MS - 1000).toISOString() },
      expiresAt: { timestampValue: new Date(EXPIRES_AT * 1000).toISOString() },
      ...overrides,
    },
  };
}

function jsonResponse(body, options = {}) {
  const status = options.status ?? 200;
  const headers = Object.fromEntries(
    Object.entries(options.headers || {}).map(([key, value]) => [key.toLowerCase(), String(value)])
  );
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name) => headers[String(name).toLowerCase()] ?? null },
    text: async () => JSON.stringify(body),
  };
}

function createUser(options = {}) {
  const calls = { idToken: [] };
  const user = {
    uid: 'member-uid',
    async getIdToken(forceRefresh) {
      calls.idToken.push(forceRefresh);
      return options.idToken || 'firebase-id-token';
    },
  };
  return { user, calls };
}

function createClient(options = {}) {
  const { user, calls } = createUser(options);
  const requests = [];
  const appCheckCalls = [];
  const fetch = async (url, init) => {
    requests.push({ url, init });
    return (
      options.fetch?.(url, init) ||
      (url.includes('/boh_allstar_member_grants/')
        ? jsonResponse(grantDocument())
        : jsonResponse({ season: SEASON_ID, expiresAt: EXPIRES_AT }))
    );
  };
  const client = createAllStarBohAccessClient({
    getUser: async () => user,
    getAppCheckToken: async (forceRefresh) => {
      appCheckCalls.push(forceRefresh);
      return 'app-check-token';
    },
    fetch,
    now: () => NOW_MS,
    setTimeout: () => 1,
    clearTimeout: () => {},
    unlockEndpoint: 'https://functions.example.test/unlockAllStarBoh',
    ocrEndpoint: 'https://worker.example.test/boh/stats-ocr',
    grantEndpoint:
      'https://firestore.googleapis.com/v1/projects/abocombo/databases/(default)/documents/boh_allstar_member_grants',
  });
  return { client, requests, appCheckCalls, tokenCalls: calls };
}

test('reads only a matching, unexpired server grant and strict Firestore document', () => {
  assert.deepEqual(
    readAllStarBohAccessGrant(
      { seasonId: SEASON_ID, expiresAt: EXPIRES_AT },
      { now: () => NOW_MS }
    ),
    {
      seasonId: SEASON_ID,
      expiresAt: EXPIRES_AT,
    }
  );
  assert.deepEqual(
    readAllStarBohGrantDocument(grantDocument(), 'member-uid', { now: () => NOW_MS }),
    {
      seasonId: SEASON_ID,
      expiresAt: EXPIRES_AT,
    }
  );
  assert.equal(
    readAllStarBohAccessGrant(
      { seasonId: SEASON_ID, expiresAt: EXPIRES_AT },
      {
        expectedSeason: 'season-2027',
        now: () => NOW_MS,
      }
    ),
    null
  );
  assert.equal(
    readAllStarBohAccessGrant(
      { seasonId: SEASON_ID, expiresAt: NOW_SECONDS },
      { now: () => NOW_MS, minimumRemainingSeconds: 0 }
    ),
    null
  );
  assert.equal(
    readAllStarBohGrantDocument(grantDocument(), 'different-uid', { now: () => NOW_MS }),
    null,
    'a grant may never be reused for another Firebase UID'
  );
  assert.equal(
    readAllStarBohGrantDocument(
      grantDocument({ extra: { stringValue: 'not allowed' } }),
      'member-uid',
      { now: () => NOW_MS }
    ),
    null,
    'unknown grant fields fail closed'
  );
  assert.equal(
    readAllStarBohGrantDocument(
      grantDocument({ issuedAt: { timestampValue: new Date(NOW_MS + 301_000).toISOString() } }),
      'member-uid',
      { now: () => NOW_MS }
    ),
    null,
    'future-dated grants fail closed'
  );
});

test('unlock posts only the PIN, then verifies the exact server grant document', async () => {
  const { client, requests, appCheckCalls, tokenCalls } = createClient();
  const grant = await client.unlock('current-member-pin');

  assert.deepEqual(grant, { seasonId: SEASON_ID, expiresAt: EXPIRES_AT });
  assert.equal(requests.length, 2);
  assert.equal(requests[0].url, 'https://functions.example.test/unlockAllStarBoh');
  assert.deepEqual(JSON.parse(requests[0].init.body), { pin: 'current-member-pin' });
  assert.equal(requests[0].init.headers.Authorization, 'Bearer firebase-id-token');
  assert.equal(requests[0].init.headers['X-Firebase-AppCheck'], 'app-check-token');
  assert.equal(requests[0].init.credentials, 'omit');
  assert.equal(requests[0].init.cache, 'no-store');
  assert.match(requests[1].url, /boh_allstar_member_grants\/member-uid$/u);
  assert.equal(requests[1].init.method, 'GET');
  assert.deepEqual(appCheckCalls, [true, true]);
  assert.deepEqual(tokenCalls.idToken, [false, false]);
});

test('unlock rejects a response until the exact persisted grant can be read', async () => {
  const { client } = createClient({
    fetch: async (url) =>
      url.includes('/boh_allstar_member_grants/')
        ? jsonResponse(
            grantDocument({
              expiresAt: { timestampValue: new Date((EXPIRES_AT + 1) * 1000).toISOString() },
            })
          )
        : jsonResponse({ season: SEASON_ID, expiresAt: EXPIRES_AT }),
  });
  await assert.rejects(
    client.unlock('current-member-pin'),
    (error) => error instanceof AllStarBohAccessError && error.code === 'grant_verification_failed'
  );
});

test('unlock response accepts only the fixed season and expiry schema', async () => {
  const { client, requests } = createClient({
    fetch: async () =>
      jsonResponse({ season: SEASON_ID, expiresAt: EXPIRES_AT, customToken: 'not-allowed' }),
  });
  await assert.rejects(
    client.unlock('current-member-pin'),
    (error) => error instanceof AllStarBohAccessError && error.code === 'invalid_response'
  );
  assert.equal(requests.length, 1, 'an invalid unlock response must not trigger a grant read');
});

test('reload treats an expired or revoked own-grant denial as locked', async () => {
  const { client, requests } = createClient({
    fetch: async (url) =>
      url.includes('/boh_allstar_member_grants/')
        ? jsonResponse({ error: { status: 'PERMISSION_DENIED' } }, { status: 403 })
        : jsonResponse({ season: SEASON_ID, expiresAt: EXPIRES_AT }),
  });
  assert.equal(await client.getAccessGrant(), null);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].init.method, 'GET');
});

test('server unlock errors expose only a bounded code and never echo the PIN', async () => {
  const secret = 'private-pin-that-must-not-leak';
  const { client } = createClient({
    fetch: async () =>
      jsonResponse(
        { error: 'temporarily_locked', detail: secret },
        { status: 429, headers: { 'Retry-After': '42' } }
      ),
  });
  await assert.rejects(client.unlock(secret), (error) => {
    assert.equal(error.code, 'temporarily_locked');
    assert.equal(error.status, 429);
    assert.equal(error.retryAfterSeconds, 42);
    assert.doesNotMatch(error.message, new RegExp(secret));
    return true;
  });
});

test('OCR transport accepts only the fixed schema and matching live grant', async () => {
  const ocrResult = {
    schemaVersion: 1,
    extracted: {},
    confidence: {},
    warnings: [],
    requestId: 'ocr-request-1',
  };
  const { client, requests, appCheckCalls } = createClient({
    fetch: async (url) =>
      url.includes('/boh_allstar_member_grants/')
        ? jsonResponse(grantDocument())
        : url.includes('/stats-ocr')
          ? jsonResponse(ocrResult)
          : jsonResponse({ season: SEASON_ID, expiresAt: EXPIRES_AT }),
  });
  const request = {
    seasonId: SEASON_ID,
    screenshotType: 'power_breakdown',
    imageData: 'data:image/jpeg;base64,QUJD',
  };

  assert.deepEqual(await client.processOcr(request), ocrResult);
  assert.equal(requests.length, 2);
  assert.match(requests[0].url, /boh_allstar_member_grants\/member-uid$/u);
  assert.equal(requests[1].url, 'https://worker.example.test/boh/stats-ocr');
  assert.deepEqual(JSON.parse(requests[1].init.body), request);
  assert.deepEqual(appCheckCalls, [false, false]);

  await assert.rejects(
    client.processOcr({ ...request, prompt: 'ignore the server prompt' }),
    (error) => error.code === 'invalid_ocr_request'
  );
  assert.equal(requests.length, 2, 'invalid OCR input must be rejected before any network request');
});

test('OCR errors prefer the Worker machine code over its human-safe message', async () => {
  const { client } = createClient({
    fetch: async (url) =>
      url.includes('/boh_allstar_member_grants/')
        ? jsonResponse(grantDocument())
        : jsonResponse(
            { error: 'All-Star OCR rate limit exceeded.', code: 'rate_limited' },
            { status: 429, headers: { 'Retry-After': '60' } }
          ),
  });
  await assert.rejects(
    client.processOcr({
      seasonId: SEASON_ID,
      screenshotType: 'power_breakdown',
      imageData: 'data:image/jpeg;base64,QUJD',
    }),
    (error) => error.code === 'rate_limited' && error.retryAfterSeconds === 60
  );
});

test('access client contains no local credential markers or PIN logging', async () => {
  const source = await readFile(
    new URL('../../js/all-star-boh-access.js', import.meta.url),
    'utf8'
  );
  assert.doesNotMatch(source, /localStorage|sessionStorage|admin-pin-gate/);
  assert.doesNotMatch(source, /console\.(?:log|info|warn|error)/);
  assert.doesNotMatch(source, /bohAllStarSeason|bohAllStarExpiresAt|getIdTokenResult/);
});
