import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const localStorageData = new Map();
globalThis.localStorage = {
  getItem: (key) => localStorageData.get(key) ?? null,
  setItem: (key, value) => localStorageData.set(key, String(value)),
  removeItem: (key) => localStorageData.delete(key),
};

const {
  VTS_SCORE_ALL_TIERS,
  VTS_SCORE_TIERS,
  buildAdminVtsScoreRows,
  buildVtsScoreTierSummary,
  drawVtsScoreLeaderCanvas,
  readVtsScoreExemptions,
  vtsScoreExemptKey,
  writeVtsScoreExemptions,
} = await import('../../js/vts-score-admin.js');
const { getVtsScoreRaceScorePath, getVtsScoreSubmissionsPath, normalizeVtsScoreSeasonId } =
  await import('../../js/vts-score-store.js');

const BASE_POWER_VALUES = Object.freeze({
  totalCastlePower: 1_112_473_195,
  troopPower: 999_076_138,
  buildingPower: 6_477_467,
  technologyPower: 38_902_234,
  heroCombatPower: 30_585_714,
  dragonPower: 16_306_050,
  unitSpecialtyPower: 21_125_592,
});

function submission(gameName, dragonPower, totalCastlePower) {
  return {
    submissionUid: `uid-${gameName}`,
    status: 'submitted',
    gameName,
    stats: { ...BASE_POWER_VALUES, dragonPower, totalCastlePower },
  };
}

function raceScore(gameName, powerValues) {
  return {
    submissionUid: `uid-${gameName}`,
    schemaVersion: 2,
    gameName,
    powerValues: { ...BASE_POWER_VALUES, ...powerValues },
    ocr: { confidence: { totalCastlePower: 0.94 }, correctedFields: [] },
    updatedAt: '2026-08-01T00:00:00.000Z',
  };
}

test('the VtsScore season path contract is season-scoped and rejects junk ids', () => {
  assert.equal(normalizeVtsScoreSeasonId('season-2026'), 'season-2026');
  assert.equal(normalizeVtsScoreSeasonId('bad/season'), '');
  assert.equal(normalizeVtsScoreSeasonId(''), '');
  assert.equal(
    getVtsScoreRaceScorePath('season-2026', 'signup-uid'),
    'boh_allstar/season-2026/raceScores/signup-uid'
  );
  assert.equal(getVtsScoreSubmissionsPath('season-2026'), 'boh_allstar/season-2026/submissions');
  assert.throws(() => getVtsScoreSubmissionsPath('nope/nope'));
  assert.throws(() => getVtsScoreRaceScorePath('season-2026', ''));
});

test('admin rows compare baseline against final and split tiers by sign-up dragon power', () => {
  const rows = buildAdminVtsScoreRows(
    [submission('Big', 9_000_000, 1_000_000_000), submission('Small', 1_000_000, 500_000_000)],
    [
      raceScore('Big', { totalCastlePower: 1_100_000_000 }),
      raceScore('Small', { totalCastlePower: 600_000_000 }),
    ]
  );

  assert.equal(rows.length, 2);
  const big = rows.find((row) => row.gameName === 'Big');
  const small = rows.find((row) => row.gameName === 'Small');
  assert.equal(big.tier, 1);
  assert.equal(small.tier, 2);
  assert.equal(big.growth, 100_000_000);
  assert.equal(small.growth, 100_000_000);
  // Percentage growth is what separates them: the smaller account pushed harder.
  assert.ok(small.growthPercent > big.growthPercent);
  assert.equal(big.submitted, true);
});

test('a competitor with no upload is listed as missing rather than dropped', () => {
  const rows = buildAdminVtsScoreRows([submission('Quiet', 8_000_000, 900_000_000)], []);

  assert.equal(rows.length, 1);
  assert.equal(rows[0].submitted, false);
  assert.equal(rows[0].hasUpload, false);
  assert.equal(rows[0].finalTotalPower, null);
  assert.equal(rows[0].growth, null);
});

test('tier summaries rank raw growth and percentage growth independently', () => {
  const rows = buildAdminVtsScoreRows(
    [submission('Whale', 9_000_000, 1_000_000_000), submission('Minnow', 8_000_000, 10_000_000)],
    [
      raceScore('Whale', { totalCastlePower: 1_050_000_000 }),
      raceScore('Minnow', { totalCastlePower: 20_000_000 }),
    ]
  );
  const summary = buildVtsScoreTierSummary(rows, 1);
  const total = summary.categories.find((entry) => entry.field === 'totalCastlePower');

  assert.equal(summary.players, 2);
  assert.equal(summary.submitted, 2);
  assert.equal(total.growthPlayer, 'Whale');
  assert.equal(total.percentPlayer, 'Minnow');
  assert.equal(summary.growth, 60_000_000);
});

test('exemptions drop a player from the leaders but not from the standings', () => {
  localStorageData.clear();
  const rows = buildAdminVtsScoreRows(
    [submission('Whale', 9_000_000, 1_000_000_000), submission('Minnow', 8_000_000, 10_000_000)],
    [
      raceScore('Whale', { totalCastlePower: 1_050_000_000 }),
      raceScore('Minnow', { totalCastlePower: 20_000_000 }),
    ]
  );

  writeVtsScoreExemptions(['  WHALE  ']);
  assert.deepEqual(readVtsScoreExemptions(), ['WHALE']);
  assert.equal(vtsScoreExemptKey(' Whale '), 'whale');

  const summary = buildVtsScoreTierSummary(rows, 1, readVtsScoreExemptions());
  const total = summary.categories.find((entry) => entry.field === 'totalCastlePower');
  assert.equal(summary.players, 1);
  assert.equal(total.growthPlayer, 'Minnow');
  // The standings themselves are untouched by exemptions.
  assert.equal(rows.length, 2);
});

test('the combined board spans both tiers', () => {
  const rows = buildAdminVtsScoreRows(
    [submission('Whale', 9_000_000, 1_000_000_000), submission('Minnow', 1_000_000, 10_000_000)],
    [
      raceScore('Whale', { totalCastlePower: 1_050_000_000 }),
      raceScore('Minnow', { totalCastlePower: 20_000_000 }),
    ]
  );

  assert.deepEqual(VTS_SCORE_TIERS, [1, 2]);
  assert.equal(buildVtsScoreTierSummary(rows, 1).players, 1);
  assert.equal(buildVtsScoreTierSummary(rows, 2).players, 1);
  assert.equal(buildVtsScoreTierSummary(rows, VTS_SCORE_ALL_TIERS).players, 2);
});

test('the leader board PNG renders without a DOM canvas implementation', () => {
  const calls = [];
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => ({
      set fillStyle(value) {
        calls.push(['fillStyle', value]);
      },
      set font(value) {
        calls.push(['font', value]);
      },
      fillRect: (...args) => calls.push(['fillRect', ...args]),
      fillText: (...args) => calls.push(['fillText', ...args]),
    }),
  };
  const summary = buildVtsScoreTierSummary(
    buildAdminVtsScoreRows(
      [submission('Whale', 9_000_000, 1_000_000_000)],
      [raceScore('Whale', { totalCastlePower: 1_050_000_000 })]
    ),
    VTS_SCORE_ALL_TIERS
  );

  const result = drawVtsScoreLeaderCanvas(canvas, summary, { title: 'Board', subtitle: 'sub' });
  assert.equal(result, canvas);
  assert.equal(canvas.width, 900);
  assert.ok(canvas.height > 0);
  assert.ok(calls.some(([op, text]) => op === 'fillText' && text === 'Board'));
  assert.ok(calls.some(([op, text]) => op === 'fillText' && text === 'Whale'));
});

test('the admin exposes a VtsScore tab and Firestore keeps race scores admin-only', () => {
  const adminTab = readFileSync('tabs/admin.html', 'utf8');
  const rules = readFileSync('firestore.rules', 'utf8');

  assert.match(adminTab, /data-subtab="vtsScore"/);
  assert.match(adminTab, /id="dashSubtabVtsScore"/);
  assert.match(adminTab, /id="dashVtsScoreRoot"/);
  assert.match(
    rules,
    /match \/raceScores\/\{submissionUid\}\s*\{[\s\S]*allow read, write: if isAdmin\(\);/
  );
});
