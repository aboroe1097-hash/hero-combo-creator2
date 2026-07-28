import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { buildAdminVtsScoreRows } from '../../js/admin-all-star-boh.js';
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
