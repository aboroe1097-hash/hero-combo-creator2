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
} from '../../js/vts-score-model.js';

test('VtsScore page is one focused, searchable, single-image OCR flow', () => {
  const page = readFileSync('vtsscore.html', 'utf8');
  assert.match(page, /id="vtsScorePlayer"[\s\S]*role="combobox"/);
  assert.match(page, /id="vtsScorePlayerResults"[\s\S]*role="listbox"/);
  assert.match(page, /id="vtsScoreImage"[\s\S]*accept="image\/png,image\/jpeg,image\/webp"/);
  assert.match(page, /id="vtsScoreReadButton"/);
  assert.match(page, /id="vtsScoreTotalPower"/);
  assert.match(page, /id="vtsScoreLanguage"/);
  assert.match(page, /id="vtsScoreThemeToggle"/);
  assert.doesNotMatch(page, />[^<]*Dragon Power[^<]*</);
  assert.match(page, /Monday, 27 July[\s\S]*20:00 Game Time/);
  assert.doesNotMatch(page, /\bmultiple\b/);
});

test('VtsScore light/dark and every offered language have complete UI copy', () => {
  const css = readFileSync('css/vts-score.css', 'utf8');
  assert.match(css, /:root\[data-theme='light'\]/);
  assert.equal(VTS_SCORE_LANGUAGES.length, 6);
  assert.deepEqual(auditVtsScoreI18n(), { ok: true, missing: [] });
});

test('VtsScore ranks close signup names and emits a strict Total Power OCR payload', () => {
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
    totalPower: 1_745_000_000,
    review: {
      requestId: 'ocr-request-1',
      ocrValues: { totalCastlePower: 1_740_000_000 },
      confidence: { totalCastlePower: 0.93 },
    },
  });
  assert.deepEqual(payload, {
    seasonId: 'competition-11',
    submissionUid: 'uid-a',
    gameName: 'MalakAbo',
    dragonPower: 1_745_000_000,
    ocr: {
      requestId: 'ocr-request-1',
      originalDragonPower: 1_740_000_000,
      confidence: 0.93,
      corrected: true,
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
    gameName: 'Dragon One',
    baselineSubmissionRevision: 3,
    dragonPower: 7_450_000,
    submittedByUid: 'uploader-uid',
    ocr: {
      requestId: 'ocr-request-1',
      originalDragonPower: 7_400_000,
      confidence: 0.93,
      corrected: true,
    },
    screenshot: 'must be dropped',
  });
  assert.equal(normalized.dragonPower, 7_450_000);
  assert.equal(normalized.ocr.corrected, true);
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
        dragonPower: 1_250_000_000,
        updatedAtMs: 100,
        ocr: { corrected: false, confidence: 0.9 },
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
