import assert from 'node:assert/strict';
import test from 'node:test';
import { createBohSignupAdminHandler } from '../../functions/src/boh-signup-admin.js';
import { VTS_SCORE_POWER_FIELDS } from '../../functions/src/vts-score.js';
import { COMPETITION_DEAD_TROOP_COUNT_KEYS } from '../../functions/src/competition-board.js';

const SEASON = 'competition-12';
const PATH = `boh_allstar/${SEASON}/submissions/member-1`;
const FINAL = `boh_allstar/${SEASON}/raceScores/member-1`;
const SCHEDULE = {
  seasonId: SEASON,
  opensAt: 100,
  phase1ClosesAt: 200,
  deadlineAt: 300,
  reuploadOpensAt: 400,
  reuploadClosesAt: 500,
  winnersStartAt: 600,
  winnersEndAt: 700,
};
const powers = Object.fromEntries(VTS_SCORE_POWER_FIELDS.map((key) => [key, 1000]));
const dead = Object.fromEntries(COMPETITION_DEAD_TROOP_COUNT_KEYS.map((key) => [key, 0]));

function body(action = 'power-final', extra = {}) {
  return {
    action,
    expectedRevision: action === 'power-baseline' ? 3 : 0,
    signupRevision: 3,
    reason: 'Member supplied verified results in chat',
    acceptLate: false,
    method: 'manual',
    seasonId: SEASON,
    submissionUid: 'member-1',
    gameName: '王 محمد',
    powerValues: powers,
    deadTroopCounts: dead,
    ocr: {
      requestId: 'admin-manual-1',
      sourceValues: Object.fromEntries(VTS_SCORE_POWER_FIELDS.map((key) => [key, null])),
      confidence: Object.fromEntries(VTS_SCORE_POWER_FIELDS.map((key) => [key, null])),
      correctedFields: [...VTS_SCORE_POWER_FIELDS],
    },
    ...extra,
  };
}

function runtime({ admin = true, now = 450, configSeason = SEASON, records = {} } = {}) {
  const original = {
    uid: 'member-1',
    playerId: 'member-1',
    gameName: '王 محمد',
    status: 'submitted',
    revision: 3,
    updatedBy: 'member-1',
    stats: { ...powers, troopRoster: [{ name: 'Preserve me' }], deadTroopCounts: dead },
    confirmedStats: { ...powers, privateExtension: 12 },
    preferredTeammates: ['friend'],
    commitment: { notes: 'Private note', publicComparisonConsent: false },
  };
  const docs = new Map(
    Object.entries({
      'boh_allstar_config/current': { activeSeason: configSeason },
      'boh_allstar_competition/current': SCHEDULE,
      [PATH]: structuredClone(original),
      ...records,
    })
  );
  const writes = [];
  const handler = createBohSignupAdminHandler({
    now: () => now,
    serverTimestamp: () => ({ seconds: now / 1000, nanoseconds: 0 }),
    auth: { verifyIdToken: async () => ({ uid: 'admin-1', admin }) },
    appCheck: { verifyToken: async () => ({}) },
    db: {
      doc: (path) => ({ path }),
      runTransaction: async (run) => {
        const pending = [];
        const result = await run({
          get: async (ref) => ({
            exists: docs.has(ref.path),
            data: () => structuredClone(docs.get(ref.path)),
          }),
          set: (ref, value) => pending.push([ref.path, structuredClone(value)]),
        });
        pending.forEach(([path, value]) => {
          docs.set(path, value);
          writes.push(path);
        });
        return result;
      },
    },
  });
  async function post(input, headers = {}) {
    const response = {
      status(code) {
        this.statusCode = code;
        return this;
      },
      set() {},
      json(value) {
        this.payload = value;
        return this;
      },
    };
    await handler(
      {
        method: 'POST',
        headers: {
          origin: 'https://roc-vts.com',
          authorization: 'Bearer token',
          'x-firebase-appcheck': 'app-check',
          'content-type': 'application/json',
          ...headers,
        },
        body: input,
      },
      response
    );
    return response;
  }
  return { docs, writes, post, original };
}

test('Admin records a missing final under the exact signup with review provenance', async () => {
  const r = runtime();
  const result = await r.post(body());
  assert.equal(result.statusCode, 200);
  const saved = r.docs.get(FINAL);
  assert.deepEqual(saved.powerValues, powers);
  assert.deepEqual(saved.deadTroopCounts, dead);
  assert.equal(saved.baselineSubmissionRevision, 3);
  assert.equal(saved.adminEntry.byUid, 'admin-1');
  assert.equal(saved.adminEntry.method, 'manual');
  assert.equal(saved.adminEntry.acceptedLate, false);
  assert.equal(saved.revision, 1);
  assert.deepEqual(r.docs.get(PATH), r.original);
});

test('power-only baseline correction preserves member details and original ownership', async () => {
  const r = runtime();
  const changed = { ...powers, dragonPower: 7000000 };
  const result = await r.post(body('power-baseline', { powerValues: changed }));
  assert.equal(result.statusCode, 200);
  const saved = r.docs.get(PATH);
  assert.equal(saved.stats.dragonPower, 7000000);
  assert.equal(saved.confirmedStats.dragonPower, 7000000);
  assert.deepEqual(saved.stats.troopRoster, r.original.stats.troopRoster);
  assert.deepEqual(saved.commitment, r.original.commitment);
  assert.deepEqual(saved.preferredTeammates, ['friend']);
  assert.equal(saved.confirmedStats.privateExtension, 12);
  assert.equal(saved.uid, 'member-1');
  assert.equal(saved.adminEntry.memberOwned, true);
  assert.equal(saved.updatedBy, 'admin-1');
  assert.equal(saved.revision, 4);
});

test('late finals require explicit approval; early finals remain refused', async () => {
  const late = runtime({ now: 500 });
  assert.equal((await late.post(body())).payload.error, 'late_confirmation_required');
  assert.equal(late.writes.length, 0);
  assert.equal((await late.post(body('power-final', { acceptLate: true }))).statusCode, 200);
  assert.equal(late.docs.get(FINAL).adminEntry.acceptedLate, true);
  const early = runtime({ now: 399 });
  assert.equal(
    (await early.post(body('power-final', { acceptLate: true }))).payload.error,
    'upload_not_started'
  );
  assert.equal(early.writes.length, 0);
});

test('members cannot use either Admin power action', async () => {
  const r = runtime({ admin: false });
  for (const action of ['power-baseline', 'power-final'])
    assert.equal((await r.post(body(action))).payload.error, 'admin_required');
  assert.equal(r.writes.length, 0);
});

test('active season, exact identity, signup revision and final revision are checked atomically', async () => {
  const cases = [
    [{ configSeason: 'other' }, {}, 'season_not_active'],
    [{}, { gameName: 'Someone else' }, 'signup_changed'],
    [{}, { signupRevision: 2 }, 'revision_conflict'],
    [{ records: { [FINAL]: { revision: 2 } } }, {}, 'revision_conflict'],
    [{ records: { [PATH]: null } }, {}, 'not_found'],
  ];
  for (const [options, changes, code] of cases) {
    const r = runtime(options);
    assert.equal((await r.post(body('power-final', changes))).payload.error, code);
    assert.equal(r.writes.length, 0);
  }
});

test('unknown fields, missing reason, invalid totals and a forged OCR audit cannot be saved', async () => {
  const cases = [
    { reason: '' },
    { reason: 'x'.repeat(1001) },
    { expectedRevision: -1 },
    { adminEntry: { byUid: 'forged' } },
    { imageData: 'must-not-store-images' },
    { powerValues: { ...powers, troopPower: -1 } },
    { powerValues: { ...powers, dragonPower: 100000000001 } },
    { deadTroopCounts: null },
    { ocr: { ...body().ocr, correctedFields: [] } },
  ];
  for (const changes of cases) {
    const r = runtime();
    assert.equal((await r.post(body('power-final', changes))).statusCode, 400);
    assert.equal(r.writes.length, 0);
  }
});

test('editing an existing final retains its original submitter and creation date', async () => {
  const r = runtime({
    records: {
      [FINAL]: {
        revision: 2,
        submittedByUid: 'member-1',
        createdAt: 123,
        powerValues: { ...powers, totalCastlePower: 900 },
      },
    },
  });
  assert.equal((await r.post(body('power-final', { expectedRevision: 2 }))).statusCode, 200);
  const saved = r.docs.get(FINAL);
  assert.equal(saved.submittedByUid, 'member-1');
  assert.equal(saved.createdAt, 123);
  assert.equal(saved.revision, 3);
  assert.equal(saved.adminEntry.previousPowerValues.totalCastlePower, 900);
});
