import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  buildAdminVtsScoreRows,
  buildVtsScoreTierSummary,
  drawVtsScoreLeaderCanvas,
  VTS_SCORE_ALL_TIERS,
  VTS_SCORE_TIERS,
} from '../../js/admin-all-star-boh.js';
import { auditVtsScoreI18n, VTS_SCORE_LANGUAGES } from '../../js/vts-score-i18n.js';
import {
  getAllStarBohRaceScorePath,
  normalizeAllStarBohRaceScore,
} from '../../js/all-star-boh-store.js';
import {
  buildVtsScoreSubmission,
  rankVtsScorePlayers,
  resolveVtsScorePlayer,
  VTS_SCORE_POWER_FIELDS,
} from '../../js/vts-score-model.js';

const BASE_POWER_VALUES = Object.freeze({
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

test('VtsScore page is one focused, searchable, single-image OCR flow', () => {
  const page = readFileSync('vtsscore.html', 'utf8');
  assert.match(page, /id="vtsScorePlayer"[\s\S]*role="combobox"/);
  assert.match(page, /id="vtsScorePlayerResults"[\s\S]*role="listbox"/);
  assert.match(page, /id="vtsScoreImage"[\s\S]*accept="image\/png,image\/jpeg,image\/webp"/);
  assert.match(page, /id="vtsScoreReadButton"/);
  assert.match(page, /id="vtsScorePowerFields"/);
  assert.match(page, /id="vtsScoreLanguage"/);
  assert.match(page, /id="vtsScoreThemeToggle"/);
  assert.match(page, /Submit full power breakdown/);
  assert.match(page, /Wednesday, 29 July[\s\S]*20:00 Game Time/);
  assert.doesNotMatch(page, /\bmultiple\b/);
});

test('VtsScore light/dark and every offered language have complete UI copy', () => {
  const css = readFileSync('css/vts-score.css', 'utf8');
  assert.match(css, /:root\[data-theme='light'\]/);
  assert.equal(VTS_SCORE_LANGUAGES.length, 6);
  assert.deepEqual(auditVtsScoreI18n(), { ok: true, missing: [] });
});

test('VtsScore deadline day matches the page in every language', () => {
  const page = readFileSync('vtsscore.html', 'utf8');
  const pageDeadline = page.match(/data-vts-i18n="deadline">([^<]+)</u)?.[1] ?? '';
  const expectedDay = pageDeadline.match(/\d{1,2}/u)?.[0] ?? '';
  assert.ok(expectedDay, 'the page must state a deadline day');

  const translations = readFileSync('js/vts-score-i18n.js', 'utf8');
  const deadlines = [...translations.matchAll(/^\s*deadline: '([^']+)',$/gmu)].map(
    (match) => match[1]
  );
  assert.equal(deadlines.length, VTS_SCORE_LANGUAGES.length);
  for (const deadline of deadlines) {
    assert.equal(
      deadline.match(/\d{1,2}/u)?.[0],
      expectedDay,
      `translated deadline "${deadline}" must use day ${expectedDay}`
    );
  }
});

test('VtsScore ranks close signup names and emits a strict full-breakdown OCR payload', () => {
  const players = [
    { submissionUid: 'uid-a', gameName: 'MalakAbo' },
    { submissionUid: 'uid-b', gameName: 'Malika Zena' },
    { submissionUid: 'uid-c', gameName: 'Dr Thund€r' },
  ];
  assert.equal(resolveVtsScorePlayer(players, 'malak abo'), players[0]);
  assert.equal(resolveVtsScorePlayer(players, 'Unknown'), null);
  assert.deepEqual(rankVtsScorePlayers(players, 'malak', 2), [players[0], players[1]]);
  assert.equal(rankVtsScorePlayers(players, 'malika z', 1)[0], players[1]);
  assert.equal(rankVtsScorePlayers(players, 'malkabo', 1)[0], players[0], 'tolerates a typo');
  assert.deepEqual(
    rankVtsScorePlayers(players, 'Jasper', 8),
    [],
    'a name nobody signed up with must never suggest unrelated players'
  );
  assert.deepEqual(rankVtsScorePlayers(players, 'zzzzzz', 8), []);

  const payload = buildVtsScoreSubmission({
    seasonId: 'competition-11',
    player: players[0],
    powerValues: { ...BASE_POWER_VALUES, totalCastlePower: 1_117_000_000 },
    review: {
      requestId: 'ocr-request-1',
      ocrValues: BASE_POWER_VALUES,
      confidence: Object.fromEntries(VTS_SCORE_POWER_FIELDS.map((field) => [field, 0.93])),
    },
  });
  assert.deepEqual(payload, {
    seasonId: 'competition-11',
    submissionUid: 'uid-a',
    gameName: 'MalakAbo',
    powerValues: { ...BASE_POWER_VALUES, totalCastlePower: 1_117_000_000 },
    ocr: {
      requestId: 'ocr-request-1',
      sourceValues: BASE_POWER_VALUES,
      confidence: Object.fromEntries(VTS_SCORE_POWER_FIELDS.map((field) => [field, 0.93])),
      correctedFields: ['totalCastlePower'],
    },
  });
  assert.doesNotMatch(JSON.stringify(payload), /image|base64|screenshot/i);
});

test('VtsScore store contract is season-scoped, bounded, and image-free', () => {
  assert.equal(
    getAllStarBohRaceScorePath('competition-11', 'signup-uid'),
    'boh_allstar/competition-11/raceScores/signup-uid'
  );
  const normalized = normalizeAllStarBohRaceScore({
    schemaVersion: 2,
    gameName: 'Dragon One',
    baselineSubmissionRevision: 3,
    powerValues: BASE_POWER_VALUES,
    submittedByUid: 'uploader-uid',
    ocr: {
      requestId: 'ocr-request-1',
      sourceValues: BASE_POWER_VALUES,
      confidence: Object.fromEntries(VTS_SCORE_POWER_FIELDS.map((field) => [field, 0.93])),
      correctedFields: [],
    },
    screenshot: 'must be dropped',
  });
  assert.equal(normalized.powerValues.totalCastlePower, 1_112_473_195);
  assert.deepEqual(normalized.ocr.correctedFields, []);
  assert.equal(Object.hasOwn(normalized, 'screenshot'), false);
});

test('admin VtsScore rows compare baseline and final values by original tier', () => {
  const rows = buildAdminVtsScoreRows(
    [
      {
        status: 'submitted',
        submissionUid: 'tier-2',
        gameName: 'Growing',
        stats: { dragonPower: 6_500_000, totalCastlePower: 1_200_000_000 },
      },
      {
        status: 'submitted',
        submissionUid: 'tier-1',
        gameName: 'Waiting',
        stats: { dragonPower: 7_100_000, totalCastlePower: 1_500_000_000 },
      },
    ],
    [
      {
        submissionUid: 'tier-2',
        schemaVersion: 2,
        powerValues: { ...BASE_POWER_VALUES, totalCastlePower: 1_250_000_000 },
        updatedAtMs: 100,
        ocr: {
          correctedFields: [],
          confidence: Object.fromEntries(VTS_SCORE_POWER_FIELDS.map((field) => [field, 0.9])),
        },
      },
    ]
  );
  assert.deepEqual(
    rows.map((row) => row.gameName),
    ['Waiting', 'Growing']
  );
  assert.equal(rows[0].tier, 1);
  assert.equal(rows[0].submitted, false);
  assert.equal(rows[1].tier, 2);
  assert.equal(rows[1].growth, 50_000_000);
  assert.equal(rows[1].growthPercent, (50_000_000 / 1_200_000_000) * 100);
  assert.equal(rows[1].comparisons.length, 9);
  assert.equal(rows[1].comparisons.find(({ field }) => field === 'dragonPower').final, 16_306_050);
});

test('admin and Firestore expose a dedicated, admin-only VtsScore surface', () => {
  const admin = readFileSync('js/admin-all-star-boh.js', 'utf8');
  const rules = readFileSync('firestore.rules', 'utf8');
  assert.match(admin, /\['scores', 'adminVtsScoreStage', 'VtsScore'\]/);
  assert.match(admin, /state\.stage === 'scores'\) return renderVtsScores/);
  assert.match(
    rules,
    /match \/raceScores\/\{submissionUid\}\s*\{[\s\S]*allow read, write: if isAdmin\(\);/
  );
});

test('VtsScore tier summary ranks raw growth and percentage growth separately', () => {
  const power = (total, dragon) => ({
    totalCastlePower: total,
    troopPower: 0,
    buildingPower: 0,
    technologyPower: 0,
    heroCombatPower: 0,
    dragonPower: dragon,
    unitSpecialtyPower: 0,
    artifactPower: 0,
    royalTechPower: null,
  });
  const submissions = [
    {
      submissionUid: 'small',
      gameName: 'Small',
      status: 'submitted',
      stats: power(1000, 8_000_000),
    },
    { submissionUid: 'big', gameName: 'Big', status: 'submitted', stats: power(10_000, 9_000_000) },
    { submissionUid: 'low', gameName: 'Low', status: 'submitted', stats: power(500, 1_000_000) },
  ];
  const raceScores = [
    { submissionUid: 'small', schemaVersion: 2, powerValues: power(2000, 8_000_000) },
    { submissionUid: 'big', schemaVersion: 2, powerValues: power(12_000, 9_000_000) },
  ];
  const rows = buildAdminVtsScoreRows(submissions, raceScores);
  assert.deepEqual(VTS_SCORE_TIERS, [1, 2]);

  const tierOne = buildVtsScoreTierSummary(rows, 1);
  assert.equal(tierOne.players, 2);
  assert.equal(tierOne.submitted, 2);
  const total = tierOne.categories.find(({ field }) => field === 'totalCastlePower');
  // Big gains more raw power, Small grows by a larger share - both must surface.
  assert.equal(total.growthPlayer, 'Big');
  assert.equal(total.growth, 2000);
  assert.equal(total.percentPlayer, 'Small');
  assert.equal(total.growthPercent, 100);
  assert.equal(tierOne.growth, 3000);
  assert.equal(tierOne.finalTotalPower, 14_000);
  assert.equal(tierOne.growthPercent, (3000 / 11_000) * 100);

  // A tier with no uploads must not invent leaders.
  const tierTwo = buildVtsScoreTierSummary(rows, 2);
  assert.equal(tierTwo.players, 1);
  assert.equal(tierTwo.submitted, 0);
  assert.equal(tierTwo.growthPercent, null);
  assert.equal(
    tierTwo.categories.find(({ field }) => field === 'totalCastlePower').growthPlayer,
    ''
  );
});

test('the BoH mapper pages are reachable from the app, not orphaned entry points', () => {
  const index = readFileSync('index.html', 'utf8');
  const shell = readFileSync('js/shell-v14.js', 'utf8');
  const admin = readFileSync('js/admin-all-star-boh.js', 'utf8');

  // Member route: a real nav link the shell knows how to place.
  assert.match(index, /id="tabBohPlan"[\s\S]{0,200}href="boh-plan\.html"/);
  assert.match(shell, /const sourceIds = \[[\s\S]*?'tabBohPlan'[\s\S]*?\];/);

  // Admin route: reachable from the existing Mapper workspace stage.
  assert.match(admin, /href="boh-mapper-admin\.html"/);
  assert.match(admin, /data-boh-mapper-link="admin"/);
});

test('combined leader board spans both tiers and honours exemptions', () => {
  const power = (total, dragon) => ({
    totalCastlePower: total,
    troopPower: 0,
    buildingPower: 0,
    technologyPower: 0,
    heroCombatPower: 0,
    dragonPower: dragon,
    unitSpecialtyPower: 0,
    artifactPower: 0,
    royalTechPower: null,
  });
  const submissions = [
    {
      submissionUid: 't1',
      gameName: 'TierOne',
      status: 'submitted',
      stats: power(1000, 9_000_000),
    },
    {
      submissionUid: 't2',
      gameName: 'TierTwo',
      status: 'submitted',
      stats: power(1000, 1_000_000),
    },
  ];
  const raceScores = [
    { submissionUid: 't1', schemaVersion: 2, powerValues: power(1500, 9_000_000) },
    { submissionUid: 't2', schemaVersion: 2, powerValues: power(9000, 1_000_000) },
  ];
  const rows = buildAdminVtsScoreRows(submissions, raceScores);

  // Combined ranks across tiers: the Tier 2 player out-grew the Tier 1 player.
  const combined = buildVtsScoreTierSummary(rows, VTS_SCORE_ALL_TIERS);
  assert.equal(combined.players, 2);
  const total = combined.categories.find(({ field }) => field === 'totalCastlePower');
  assert.equal(total.growthPlayer, 'TierTwo');
  assert.equal(total.growth, 8000);

  // Exempting the leader promotes the next player and removes them from the totals.
  const exempt = buildVtsScoreTierSummary(rows, VTS_SCORE_ALL_TIERS, ['  tiertwo  ']);
  assert.equal(exempt.players, 1, 'exemption is case- and whitespace-insensitive');
  const exemptTotal = exempt.categories.find(({ field }) => field === 'totalCastlePower');
  assert.equal(exemptTotal.growthPlayer, 'TierOne');
  assert.equal(exempt.growth, 500);

  // Per-tier summaries still filter by tier.
  assert.equal(buildVtsScoreTierSummary(rows, 1).players, 1);
  assert.deepEqual(VTS_SCORE_TIERS, [1, 2]);
});

test('leader board PNG renders without a DOM canvas implementation', () => {
  const calls = [];
  const ctx = new Proxy(
    { fillStyle: '', font: '' },
    {
      get: (target, prop) =>
        prop in target ? target[prop] : (...args) => calls.push([prop, ...args]),
      set: (target, prop, value) => {
        target[prop] = value;
        return true;
      },
    }
  );
  const canvas = { width: 0, height: 0, getContext: () => ctx };
  const summary = {
    submitted: 1,
    categories: [
      {
        field: 'totalCastlePower',
        i18nKey: 'k',
        label: 'Total power',
        growthPlayer: 'ANGEL',
        growth: 5,
        percentPlayer: 'ANGEL',
        growthPercent: 1.5,
      },
    ],
  };
  drawVtsScoreLeaderCanvas(canvas, summary, {
    title: 'T',
    formatNumber: (value) => String(value),
    labelFor: (entry) => entry.label,
  });
  assert.ok(canvas.width > 0 && canvas.height > 0, 'canvas is sized');
  const text = calls.filter(([name]) => name === 'fillText').map(([, value]) => value);
  assert.ok(text.includes('Total power'));
  assert.ok(text.includes('ANGEL'));
  assert.ok(text.includes('+5'));
});
