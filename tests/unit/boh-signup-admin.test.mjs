// The admin manual-entry path for Eden 2027 signups: the bohSignupAdmin Cloud
// Function's allowlists and auth contract, the admin panel that calls it, and
// the account → guild-row resolution the Eden page uses for My Stats and the
// ballot.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { BOH_SCORING_PROFILES, createBohPlayerId } from '../../js/all-star-boh-model.js';
import {
  BOH_SIGNUP_ADMIN_DEFAULTS,
  BOH_SIGNUP_ADMIN_ENDPOINT,
  BOH_SIGNUP_ADMIN_ERROR_KEYS,
  buildBohSignupAdminRequest,
  renderBohSignupRows,
  saveBohSignupSeasonConfig,
} from '../../js/boh-signup-admin.js';
import {
  BOH_SIGNUP_REQUIRED_DOCUMENT_KEYS,
  buildBohSignupDocument,
} from '../../js/boh-signup-document.js';
import {
  BOH_SIGNUP_ADMIN_COMMITMENT_KEYS,
  BOH_SIGNUP_ADMIN_CREATE_KEYS,
  BOH_SIGNUP_ADMIN_MAX_REQUEST_BYTES,
  BOH_SIGNUP_ADMIN_PROFILE_IDS,
  BOH_SIGNUP_ADMIN_STAT_KEYS,
  BOH_SIGNUP_ADMIN_UPDATE_KEYS,
  buildBohAdminSubmissionDocument,
  createBohManualPlayerId,
  createBohSignupAdminHandler,
} from '../../functions/src/boh-signup-admin.js';
import {
  EDEN_ACCOUNT_LINK_STATUS,
  EDEN_SIGNUP_PATH,
  isEdenAccountPlayerResolved,
  readEdenAccountGameName,
  resolveEdenAccountPlayer,
} from '../../js/eden-account-link.js';

const SEASON = '2027';
const PROFILE = 'all-star-boh-2027-v1';
const FORM_VALUES = {
  gameName: 'Bil.',
  stats: {
    totalCastlePower: 611_834_544,
    troopPower: 563_479_134,
    buildingPower: 4_216_494,
    technologyPower: 18_361_967,
    heroCombatPower: 19_086_572,
    dragonPower: 4_235_755,
    unitSpecialtyPower: 2_454_600,
    t9TroopTypes: 'Spearman, Archer',
    readySpeedHeroes: '',
    level50HeroCount: '9',
    rocLevel: '61',
  },
  commitment: {
    fightingTimeIds: ['+12', '+16'],
    preferredRole: 'offensive',
    vts1097Member: true,
    notes: 'Sent by DM',
  },
};

/** A request the Function accepts, built the way the admin panel builds one. */
function createBody(overrides = {}) {
  return {
    ...buildBohSignupAdminRequest({
      values: FORM_VALUES,
      seasonId: SEASON,
      scoringProfileId: PROFILE,
    }),
    action: 'create',
    ...overrides,
  };
}

function fakeRequest({
  body = createBody(),
  method = 'POST',
  origin = 'https://roc-vts.com',
} = {}) {
  const raw = typeof body === 'string' ? body : JSON.stringify(body);
  return {
    method,
    headers: {
      origin,
      'content-type': 'application/json',
      authorization: 'Bearer id-token',
      'x-firebase-appcheck': 'app-check-token',
    },
    body: raw,
    rawBody: Buffer.from(raw, 'utf8'),
  };
}

function fakeResponse() {
  const response = {
    statusCode: 0,
    headers: {},
    payload: null,
    set(name, value) {
      this.headers[name] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    },
    send(payload) {
      this.payload = payload;
      return this;
    },
  };
  return response;
}

function snapshotOf(data) {
  return {
    exists: Boolean(data),
    data: () => data,
  };
}

/**
 * The smallest Firestore the handler uses: `doc(path).get()` for the season
 * config and one transaction over the submission document.
 */
function fakeDb({ docs = {}, config = { activeSeason: SEASON, scoringProfileId: PROFILE } } = {}) {
  const state = { docs: { ...docs }, writes: [], transactions: 0 };
  const db = {
    doc(path) {
      return { path };
    },
    collection(path) {
      return { path };
    },
    async runTransaction(updateFunction) {
      state.transactions += 1;
      return updateFunction({
        async get(ref) {
          return snapshotOf(state.docs[ref.path]);
        },
        set(ref, data) {
          state.writes.push({ path: ref.path, data });
          state.docs[ref.path] = data;
        },
      });
    },
  };
  const originalDoc = db.doc;
  db.doc = (path) => {
    const ref = originalDoc(path);
    if (path === 'boh_allstar_config/current') {
      return { ...ref, get: async () => snapshotOf(config) };
    }
    return ref;
  };
  return { db, state };
}

function handlerWith({ admin = true, docs = {}, config } = {}) {
  const { db, state } = fakeDb({ docs, ...(config ? { config } : {}) });
  const handler = createBohSignupAdminHandler({
    auth: {
      verifyIdToken: async () => ({ uid: 'admin-uid-1', admin, superadmin: admin }),
    },
    appCheck: { verifyToken: async () => ({ app: 'test' }) },
    db,
    serverTimestamp: () => ({ serverTimestamp: true }),
    now: () => 1_700_000_000_000,
  });
  return { handler, state };
}

test('the manual-entry Function pins every key it accepts', async () => {
  assert.deepEqual(BOH_SIGNUP_ADMIN_CREATE_KEYS, [
    'action',
    'commitment',
    'gameName',
    'scoringProfileId',
    'seasonId',
    'stats',
  ]);
  assert.deepEqual(BOH_SIGNUP_ADMIN_UPDATE_KEYS, [
    ...BOH_SIGNUP_ADMIN_CREATE_KEYS,
    'submissionUid',
  ]);
  assert.ok(BOH_SIGNUP_ADMIN_STAT_KEYS.length >= 11);
  assert.deepEqual([...BOH_SIGNUP_ADMIN_STAT_KEYS].sort(), BOH_SIGNUP_ADMIN_STAT_KEYS);
  assert.deepEqual([...BOH_SIGNUP_ADMIN_COMMITMENT_KEYS].sort(), BOH_SIGNUP_ADMIN_COMMITMENT_KEYS);
  // The scoring versions the Function accepts are the model's registry: a new
  // season adds one entry to each list, and this test fails until both agree.
  assert.deepEqual(
    [...BOH_SIGNUP_ADMIN_PROFILE_IDS].sort(),
    BOH_SCORING_PROFILES.map((profile) => profile.id).sort()
  );
  assert.equal(BOH_SIGNUP_ADMIN_ENDPOINT.endsWith('/bohSignupAdmin'), true);

  const { handler, state } = handlerWith();
  const rejected = async (body, expected) => {
    const response = fakeResponse();
    await handler(fakeRequest({ body }), response);
    assert.equal(response.payload?.error, expected, JSON.stringify(body).slice(0, 120));
  };
  // An extra key is a typo, not something to drop on the floor.
  await rejected({ ...createBody(), createdBy: 'me' }, 'invalid_request');
  // A missing key inside stats or commitment is invalid, not defaulted.
  const missingStat = createBody();
  delete missingStat.stats.rocLevel;
  await rejected(missingStat, 'invalid_request');
  const missingCommitment = createBody();
  delete missingCommitment.commitment.vts1097Member;
  await rejected(missingCommitment, 'invalid_request');
  await rejected(createBody({ scoringProfileId: 'all-star-boh-2026-v1' }), 'unknown_version');
  await rejected(createBody({ action: 'delete' }), 'invalid_request');
  await rejected(
    createBody({ commitment: { ...createBody().commitment, fightingTimeIds: ['+12', '+12'] } }),
    'invalid_request'
  );
  await rejected(
    createBody({ commitment: { ...createBody().commitment, fightingTimeIds: ['+12'] } }),
    'invalid_request'
  );
  await rejected(createBody({ gameName: '   ' }), 'invalid_request');
  await rejected(
    createBody({ stats: { ...createBody().stats, troopPower: -5 } }),
    'invalid_request'
  );
  await rejected(
    createBody({ stats: { ...createBody().stats, level50HeroCount: 501 } }),
    'invalid_request'
  );
  assert.equal(state.writes.length, 0, 'a rejected request writes nothing');
});

test('the manual-entry Function verifies origin, ID token, App Check, and the admin claim', async () => {
  const { handler, state } = handlerWith();

  const deniedOrigin = fakeResponse();
  await handler(fakeRequest({ origin: 'https://example.com' }), deniedOrigin);
  assert.equal(deniedOrigin.statusCode, 403);
  assert.equal(deniedOrigin.payload.error, 'origin_denied');

  const wrongMethod = fakeResponse();
  await handler(fakeRequest({ method: 'GET' }), wrongMethod);
  assert.equal(wrongMethod.statusCode, 405);
  assert.equal(wrongMethod.payload.error, 'method_not_allowed');

  const wrongType = fakeResponse();
  await handler(
    {
      ...fakeRequest(),
      headers: {
        ...fakeRequest().headers,
        'content-type': 'text/plain',
      },
    },
    wrongType
  );
  assert.equal(wrongType.statusCode, 415);
  assert.equal(wrongType.payload.error, 'unsupported_media_type');

  const tooLarge = fakeResponse();
  await handler(
    fakeRequest({ body: 'x'.repeat(BOH_SIGNUP_ADMIN_MAX_REQUEST_BYTES + 1) }),
    tooLarge
  );
  assert.equal(tooLarge.statusCode, 413);

  const options = fakeResponse();
  await handler(fakeRequest({ method: 'OPTIONS' }), options);
  assert.equal(options.statusCode, 204);

  // The admin claim is the whole boundary: without it nothing is written, even
  // though the caller is a verified, App-Check'd signed-in user.
  const { handler: nonAdmin, state: nonAdminState } = handlerWith({ admin: false });
  const forbidden = fakeResponse();
  await nonAdmin(fakeRequest(), forbidden);
  assert.equal(forbidden.statusCode, 403);
  assert.equal(forbidden.payload.error, 'admin_required');
  assert.equal(nonAdminState.writes.length, 0);

  const noAuth = fakeResponse();
  await handler(
    {
      ...fakeRequest(),
      headers: { origin: 'https://roc-vts.com', 'content-type': 'application/json' },
    },
    noAuth
  );
  assert.equal(noAuth.statusCode, 401);
  assert.equal(noAuth.payload.error, 'auth_required');

  const noAppCheck = fakeResponse();
  await handler(
    {
      ...fakeRequest(),
      headers: {
        origin: 'https://roc-vts.com',
        'content-type': 'application/json',
        authorization: 'Bearer id-token',
      },
    },
    noAppCheck
  );
  assert.equal(noAppCheck.statusCode, 401);
  assert.equal(noAppCheck.payload.error, 'app_check_required');
  assert.equal(state.writes.length, 0);
});

test('create derives the account id and writes the pinned document', async () => {
  const { handler, state } = handlerWith();
  const response = fakeResponse();
  await handler(fakeRequest(), response);
  assert.equal(response.statusCode, 200);
  assert.equal(response.payload.scoringProfileId, PROFILE);
  assert.equal(response.payload.signup.created, true);
  assert.equal(response.payload.signup.gameName, 'Bil.');
  assert.equal(response.payload.signup.revision, 1);
  assert.equal(state.transactions, 1);
  assert.equal(state.writes.length, 1);

  const written = state.writes[0];
  assert.equal(
    written.path,
    `boh_allstar/${SEASON}/submissions/${response.payload.signup.submissionUid}`
  );
  const document = written.data;
  assert.deepEqual(
    Object.keys(document).sort(),
    [...BOH_SIGNUP_REQUIRED_DOCUMENT_KEYS, 'preferredTeammates'].sort()
  );
  assert.equal(document.uid, document.playerId);
  assert.equal(document.entryMethod, 'manual');
  assert.equal(document.status, 'submitted');
  assert.equal(document.revision, 1);
  assert.deepEqual(document.commitment.fightingTimeIds, ['+12', '+16']);
  assert.equal(document.commitment.notes, 'Sent by DM');
  assert.equal(document.commitment.availability, BOH_SIGNUP_ADMIN_DEFAULTS.commitment.availability);
  assert.equal(
    document.stats.artifactPower,
    undefined,
    'null optionals stay absent, as rules allow'
  );
  assert.deepEqual(document.createdAt, { serverTimestamp: true });
  assert.deepEqual(document.updatedAt, { serverTimestamp: true });
  assert.equal(document.updatedBy, 'admin-uid-1');

  // Parity with the browser builder: same input, same key set. The member form
  // and the admin form must never drift into two document shapes.
  const browserDocument = buildBohSignupDocument({
    uid: document.uid,
    seasonId: SEASON,
    createdAt: 'browser-created',
    updatedAt: 'browser-updated',
    values: {
      gameName: 'Bil.',
      stats: {
        totalCastlePower: 611_834_544,
        troopPower: 563_479_134,
        buildingPower: 4_216_494,
        technologyPower: 18_361_967,
        heroCombatPower: 19_086_572,
        dragonPower: 4_235_755,
        unitSpecialtyPower: 2_454_600,
        t9TroopTypes: ['Spearman', 'Archer'],
        readySpeedHeroes: [],
        level50HeroCount: 9,
        rocLevel: 61,
      },
      commitment: {
        availability: 'all',
        preferredRole: 'offensive',
        fightingTimeIds: ['+12', '+16'],
        vts1097Member: true,
        notes: 'Sent by DM',
      },
    },
  });
  assert.deepEqual(Object.keys(browserDocument).sort(), Object.keys(document).sort());
  for (const key of [
    'gameName',
    'stats',
    'rolePreferences',
    'commitment',
    'ocr',
    'submittedAtMs',
  ]) {
    assert.deepEqual(document[key], browserDocument[key], `${key} must match the member form`);
  }
});

test('create refuses a duplicate name and a season leadership has not published', async () => {
  const accountId = createBohManualPlayerId('Bil.');
  const existingPath = `boh_allstar/${SEASON}/submissions/${accountId}`;
  const { handler } = handlerWith({ docs: { [existingPath]: { uid: accountId, revision: 3 } } });
  const duplicate = fakeResponse();
  await handler(fakeRequest(), duplicate);
  assert.equal(duplicate.statusCode, 409);
  assert.equal(duplicate.payload.error, 'already_exists');

  const { handler: otherSeason } = handlerWith({
    config: { activeSeason: '2026', scoringProfileId: PROFILE },
  });
  const seasonMismatch = fakeResponse();
  await otherSeason(fakeRequest(), seasonMismatch);
  assert.equal(seasonMismatch.statusCode, 409);
  assert.equal(seasonMismatch.payload.error, 'season_not_active');

  const { handler: otherVersion } = handlerWith({
    config: { activeSeason: SEASON, scoringProfileId: 'all-star-boh-2025-v1' },
  });
  const versionMismatch = fakeResponse();
  await otherVersion(fakeRequest(), versionMismatch);
  assert.equal(versionMismatch.statusCode, 409);
  assert.equal(versionMismatch.payload.error, 'version_mismatch');
});

test('update bumps the revision and keeps the stored createdAt', async () => {
  const accountId = createBohManualPlayerId('Bil.');
  const createdAt = { seconds: 1_600_000_000 };
  const path = `boh_allstar/${SEASON}/submissions/${accountId}`;
  const { handler, state } = handlerWith({
    docs: { [path]: { uid: accountId, revision: 4, createdAt } },
  });
  const body = {
    ...buildBohSignupAdminRequest({
      values: { ...FORM_VALUES, commitment: { ...FORM_VALUES.commitment, notes: 'Corrected' } },
      seasonId: SEASON,
      scoringProfileId: PROFILE,
      submissionUid: accountId,
    }),
    action: 'update',
  };
  const response = fakeResponse();
  await handler(fakeRequest({ body }), response);
  assert.equal(response.statusCode, 200);
  assert.equal(response.payload.signup.created, false);
  assert.equal(response.payload.signup.revision, 5);
  const written = state.writes[0].data;
  assert.equal(written.revision, 5);
  assert.deepEqual(written.createdAt, createdAt);
  assert.deepEqual(written.updatedAt, { serverTimestamp: true });
  assert.equal(written.commitment.notes, 'Corrected');

  const missingPath = `boh_allstar/${SEASON}/submissions/${createBohManualPlayerId('Nobody')}`;
  const missing = { ...body, submissionUid: missingPath.split('/').pop() };
  const missingResponse = fakeResponse();
  await handler(fakeRequest({ body: missing }), missingResponse);
  assert.equal(missingResponse.statusCode, 404);
  assert.equal(missingResponse.payload.error, 'not_found');
});

test('manual ids are stable and match the model’s player ids', () => {
  for (const name of ['Bil.', 'old man war', '꧁༺ Kika ༻꧂', 'MalakAbo']) {
    const manual = createBohManualPlayerId(name);
    assert.match(manual, /^boh-player-[a-z0-9]{14}$/);
    assert.equal(manual, createBohManualPlayerId(name), 'stable for one name');
    assert.equal(manual, createBohManualPlayerId(`  ${name}  `), 'whitespace-insensitive');
    // The model hashes the same key, so a member who later registers with the
    // same name lands on the same id rather than producing a second row.
    assert.equal(manual, createBohPlayerId(name));
  }
  assert.notEqual(createBohManualPlayerId('Bil.'), createBohManualPlayerId('Bil'));
});

test('the admin panel request carries every key the Function pins', () => {
  const create = buildBohSignupAdminRequest({
    values: FORM_VALUES,
    seasonId: SEASON,
    scoringProfileId: PROFILE,
  });
  assert.deepEqual(Object.keys(create).sort(), [...BOH_SIGNUP_ADMIN_CREATE_KEYS].sort());
  assert.deepEqual(Object.keys(create.stats).sort(), [...BOH_SIGNUP_ADMIN_STAT_KEYS].sort());
  assert.deepEqual(
    Object.keys(create.commitment).sort(),
    [...BOH_SIGNUP_ADMIN_COMMITMENT_KEYS].sort()
  );
  assert.equal(create.action, 'create');
  assert.equal(create.stats.artifactPower, null);
  assert.equal(create.stats.troopPower, 563_479_134);
  assert.equal(create.stats.level50HeroCount, 9);
  assert.deepEqual(create.stats.t9TroopTypes, ['Spearman', 'Archer']);
  assert.deepEqual(create.stats.readySpeedHeroes, []);
  assert.equal(create.commitment.fightingTimeIds.length, 2);
  assert.equal(create.commitment.availability, BOH_SIGNUP_ADMIN_DEFAULTS.commitment.availability);
  assert.equal(create.commitment.vts1097Member, true);

  const update = buildBohSignupAdminRequest({
    values: FORM_VALUES,
    seasonId: SEASON,
    scoringProfileId: PROFILE,
    submissionUid: 'boh-player-abc1234567890',
  });
  assert.deepEqual(Object.keys(update).sort(), [...BOH_SIGNUP_ADMIN_UPDATE_KEYS].sort());
  assert.equal(update.action, 'update');
  assert.equal(update.submissionUid, 'boh-player-abc1234567890');

  // Empty inputs become explicit defaults instead of missing keys.
  const sparse = buildBohSignupAdminRequest({ seasonId: SEASON, scoringProfileId: PROFILE });
  assert.equal(sparse.gameName, '');
  assert.equal(sparse.stats.troopPower, 0);
  assert.equal(sparse.commitment.notes, '');
  assert.equal(sparse.commitment.vts1097Member, false);
});

test('the season picker writes exactly the four keys the rules validator allows', async () => {
  const writes = [];
  const context = {
    db: { kind: 'test' },
    firestore: {
      doc: (_db, path) => ({ path }),
      setDoc: async (ref, payload) => writes.push({ path: ref.path, payload }),
    },
  };
  const saved = await saveBohSignupSeasonConfig(
    { activeSeason: SEASON, scoringProfileId: PROFILE, open: true, grantDurationMinutes: 720 },
    context
  );
  assert.equal(writes.length, 1);
  assert.equal(writes[0].path, 'boh_allstar_config/current');
  assert.deepEqual(Object.keys(writes[0].payload).sort(), [
    'activeSeason',
    'grantDurationMinutes',
    'open',
    'scoringProfileId',
  ]);
  assert.deepEqual(writes[0].payload, saved);
  await assert.rejects(
    saveBohSignupSeasonConfig(
      {
        activeSeason: 'not a season',
        scoringProfileId: PROFILE,
        open: true,
        grantDurationMinutes: 720,
      },
      context
    ),
    (error) => error.code === 'invalid_season_setting' && error.field === 'activeSeason'
  );
  await assert.rejects(
    saveBohSignupSeasonConfig(
      { activeSeason: SEASON, scoringProfileId: 'nope', open: true, grantDurationMinutes: 720 },
      context
    ),
    (error) => error.field === 'scoringProfileId'
  );
  await assert.rejects(
    saveBohSignupSeasonConfig(
      { activeSeason: SEASON, scoringProfileId: PROFILE, open: true, grantDurationMinutes: 2 },
      context
    ),
    (error) => error.field === 'grantDurationMinutes'
  );
  assert.equal(writes.length, 1, 'a rejected setting never reaches Firestore');
});

test('the admin tab is wired into the dashboard and the nav', () => {
  const dashboard = readFileSync('js/ocr-dashboard.js', 'utf8');
  assert.match(dashboard, /if \(name === 'bohSignups'\) renderBohSignupsPanel\(\);/);
  assert.match(dashboard, /import \{\s*BOH_SIGNUP_ADMIN_ENDPOINT,/);
  assert.match(dashboard, /await window\.getVtsAdminFirestoreContext\(\)/);
  assert.match(dashboard, /await submitBohSignupAdminRequest\(payload\)/);
  assert.match(dashboard, /boh_allstar\/\$\{season\}\/submissions/);
  // The submissions collection stays owner-written: this tab never talks to it
  // directly, and the guard test that pins that rule is untouched.
  assert.doesNotMatch(dashboard, /setDoc\(doc\(db, `boh_allstar/);
  const rules = readFileSync('firestore.rules', 'utf8');
  const submissions = rules.match(/match \/submissions\/\{uid\} \{[\s\S]*?\n {6}\}/)[0];
  assert.doesNotMatch(submissions, /allow (?:create|update): if isAdmin/);

  const admin = readFileSync('tabs/admin.html', 'utf8');
  assert.match(admin, /data-subtab="bohSignups"/);
  assert.match(admin, /id="dashSubtabBohSignups"/);
  assert.match(admin, /id="dashBohSignupsSeasonForm"[\s\S]*data-requires-superadmin/);
  assert.match(admin, /id="dashBohSignupForm"/);
  assert.match(admin, /id="dashBohSignupsList"/);
  assert.match(admin, /data-i18n="adminBohSignupsTab"/);
  // The picker is superadmin-only and the tab itself is reachable by any admin,
  // which is who files entries by hand.
  const superadminTabs = dashboard.match(
    /const SUPERADMIN_DASH_SUBTABS = new Set\(\[[\s\S]*?\]\)/
  )[0];
  assert.doesNotMatch(superadminTabs, /bohSignups/);
});

test('the signup list renders an edit action per row', () => {
  const html = renderBohSignupRows(
    [
      { submissionUid: 'uid-1', gameName: 'Bil.', revision: 2, entryMethod: 'manual' },
      { submissionUid: 'uid-2', gameName: 'MalakAbo', revision: 1, entryMethod: 'ocr' },
    ],
    (key, _vars, fallback) => fallback || key
  );
  assert.match(html, /data-boh-signup-edit="uid-1"/);
  assert.match(html, /data-boh-signup-edit="uid-2"/);
  assert.match(html, /Bil\./);
  assert.match(html, /MalakAbo/);
  assert.match(html, /<td>2<\/td>/);
  assert.equal(
    renderBohSignupRows([], (key) => key).includes('dash-empty'),
    true,
    'an empty season says so instead of rendering an empty table'
  );
  // Every server error code maps to a catalogue key, and every mapped key is
  // distinct enough to explain what happened.
  for (const [code, key] of Object.entries(BOH_SIGNUP_ADMIN_ERROR_KEYS)) {
    assert.match(key, /^adminBohSignupError[A-Z]/);
    assert.ok(code, 'codes are non-empty');
  }
  assert.equal(
    BOH_SIGNUP_ADMIN_ERROR_KEYS.admin_required,
    BOH_SIGNUP_ADMIN_ERROR_KEYS.invalid_auth
  );
});
