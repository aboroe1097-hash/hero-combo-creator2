import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { buildAdminVtsScoreRows } from '../../js/admin-all-star-boh.js';
import {
  getAllStarBohRaceScorePath,
  normalizeAllStarBohRaceScore,
} from '../../js/all-star-boh-store.js';
import { buildVtsScoreSubmission, resolveVtsScorePlayer } from '../../js/vts-score-model.js';

test('VtsScore page is one focused, searchable, single-image OCR flow', () => {
  const page = readFileSync('vtsscore.html', 'utf8');
  assert.match(page, /id="vtsScorePlayer"[\s\S]*list="vtsScorePlayers"/);
  assert.match(page, /id="vtsScoreImage"[\s\S]*accept="image\/png,image\/jpeg,image\/webp"/);
  assert.match(page, /id="vtsScoreReadButton"/);
  assert.match(page, /id="vtsScoreDragonPower"/);
  assert.match(page, /Monday, 27 July[\s\S]*20:00 Game Time/);
  assert.doesNotMatch(page, /\bmultiple\b/);
});

test('VtsScore requires one exact signup name and emits a strict OCR-audited payload', () => {
  const players = [
    { submissionUid: 'uid-a', gameName: 'Dragon One' },
    { submissionUid: 'uid-b', gameName: 'Dragon Two' },
  ];
  assert.equal(resolveVtsScorePlayer(players, 'Dragon One'), players[0]);
  assert.equal(resolveVtsScorePlayer(players, 'dragon one'), null);
  assert.equal(resolveVtsScorePlayer(players, 'Unknown'), null);

  const payload = buildVtsScoreSubmission({
    seasonId: 'competition-11',
    player: players[0],
    dragonPower: 7_450_000,
    review: {
      requestId: 'ocr-request-1',
      ocrValues: { dragonPower: 7_400_000 },
      confidence: { dragonPower: 0.93 },
    },
  });
  assert.deepEqual(payload, {
    seasonId: 'competition-11',
    submissionUid: 'uid-a',
    gameName: 'Dragon One',
    dragonPower: 7_450_000,
    ocr: {
      requestId: 'ocr-request-1',
      originalDragonPower: 7_400_000,
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
        stats: { dragonPower: 6_500_000 },
      },
      {
        status: 'submitted',
        submissionUid: 'tier-1',
        gameName: 'Waiting',
        stats: { dragonPower: 7_100_000 },
      },
    ],
    [
      {
        submissionUid: 'tier-2',
        dragonPower: 7_000_000,
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
  assert.equal(rows[1].growth, 500_000);
  assert.equal(rows[1].growthPercent, (500_000 / 6_500_000) * 100);
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
