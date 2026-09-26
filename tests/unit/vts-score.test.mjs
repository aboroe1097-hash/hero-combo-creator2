import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  auditVtsScoreI18n,
  VTS_SCORE_COPY_KEYS,
  VTS_SCORE_LANGUAGES,
} from '../../js/vts-score-i18n.js';
import {
  buildVtsScoreSubmission,
  rankVtsScorePlayers,
  resolveVtsScorePlayer,
  VTS_SCORE_POWER_FIELDS,
} from '../../js/vts-score-model.js';
import { DEAD_TROOP_COUNT_KEYS } from '../../js/dead-troops.js';

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
  assert.match(page, /Competition #12 · Pre-season prep/);
  assert.doesNotMatch(page, /\bmultiple\b/);
});

test('VtsScore light/dark and every offered language have complete UI copy', () => {
  const css = readFileSync('css/vts-score.css', 'utf8');
  assert.match(css, /:root\[data-theme='light'\]/);
  assert.equal(VTS_SCORE_LANGUAGES.length, 6);
  assert.deepEqual(auditVtsScoreI18n(), { ok: true, missing: [] });
});

test('VtsScore shows the live Competition #12 schedule instead of a fixed deadline', () => {
  const page = readFileSync('vtsscore.html', 'utf8');
  // The date comes from boh_allstar_competition/current, never from the markup.
  assert.doesNotMatch(page, /29 July|Game Time<|data-vts-i18n="deadline"/);
  for (const id of [
    'vtsScoreSchedule',
    'vtsScorePhaseName',
    'vtsScorePhaseNow',
    'vtsScoreCountdown',
    'vtsScorePhaseEnds',
    'vtsScorePhaseNotice',
    'vtsScoreUploadTitle',
  ]) {
    assert.ok(page.includes(`id="${id}"`), `vtsscore.html must contain #${id}`);
  }
  // Static markup stays collapsed until the controller initializes it.
  assert.match(page, /<section id="vtsScoreGrowthBoard"[^>]*\bhidden\b/);
  // The upload consent and the growth-board consent are separate checkboxes.
  assert.match(page, /id="vtsScoreConsent"/);
  assert.match(page, /data-boh-field="commitment\.publicComparisonConsent"/);
  assert.match(page, /<input\s+id="vtsScoreSignupPublicConsent"\s+type="checkbox"\s+data-boh/);
  assert.doesNotMatch(page, /id="vtsScoreSignupPublicConsent"[^>]*\bchecked\b/);

  const controller = readFileSync('js/vts-score.js', 'utf8');
  assert.doesNotMatch(controller, /readSignupFightingTimes|fightingTimeIds/);
  assert.match(controller, /COMPETITION_SCHEDULE_DOC_PATH/);
  // Every i18n key the controller asks for exists in the catalogue.
  const keys = [...controller.matchAll(/i18n\.text\('([A-Za-z0-9]+)'/g)].map((m) => m[1]);
  assert.ok(keys.length > 15);
  for (const key of new Set(keys)) {
    assert.ok(VTS_SCORE_COPY_KEYS.includes(key), `${key} must be in the VtsScore catalogue`);
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

test('dead troop power is recorded separately and is not mislabeled as an OCR correction', () => {
  const deadTroopCounts = Object.fromEntries(DEAD_TROOP_COUNT_KEYS.map((key) => [key, 0]));
  deadTroopCounts.FootmenLofty = 1000;
  const payload = buildVtsScoreSubmission({
    seasonId: 'competition-11',
    player: { submissionUid: 'uid-a', gameName: 'MalakAbo' },
    powerValues: {
      ...BASE_POWER_VALUES,
      totalCastlePower: BASE_POWER_VALUES.totalCastlePower + 8200,
      troopPower: BASE_POWER_VALUES.troopPower + 8200,
    },
    review: {
      requestId: 'ocr-request-2',
      ocrValues: BASE_POWER_VALUES,
      confidence: Object.fromEntries(VTS_SCORE_POWER_FIELDS.map((field) => [field, 0.93])),
    },
    deadTroopCounts,
  });
  assert.deepEqual(payload.deadTroopCounts, deadTroopCounts);
  assert.deepEqual(payload.ocr.correctedFields, []);
});

test('the optional Artifact Power sign-up field is marked optional and accepts the rules range', () => {
  const page = readFileSync('vtsscore.html', 'utf8');
  const field = page.match(/<label for="vtsScoreSignupArtifactPower">[\s\S]*?<\/label>/)?.[0];
  assert.ok(field, 'the Artifact Power sign-up field exists');
  assert.match(field, /data-vts-i18n="signupArtifactPower">Artifact Power \(optional\)</);
  assert.match(field, /min="0"/);
  // MAX_POWER_DOCUMENT_VALUE (js/boh-signup-document.js) and firestore.rules: 0..1e15.
  assert.match(field, new RegExp(`max="${10 ** 15}"`));
  assert.doesNotMatch(field, /\brequired\b/);
  assert.match(
    readFileSync('js/boh-signup-document.js', 'utf8'),
    /MAX_POWER_DOCUMENT_VALUE = 10 \*\* 15;/
  );
  assert.match(
    readFileSync('firestore.rules', 'utf8'),
    /validAllStarBohNullableInt\(stats\.artifactPower, 0, 1000000000000000\)/
  );

  // The OCR review rows keep the plain label (POWER_FIELD_I18N shares fieldArtifactPower).
  assert.match(readFileSync('js/vts-score.js', 'utf8'), /artifactPower: 'fieldArtifactPower'/);
  const source = readFileSync('js/vts-score-i18n.js', 'utf8');
  for (const [language, marker] of [
    ['en', /signupArtifactPower: 'Artifact Power \(optional\)'/],
    ['ar', /signupArtifactPower: '[^']+\(اختياري\)'/],
    ['es', /signupArtifactPower: '[^']+\(opcional\)'/],
    ['pt', /signupArtifactPower: '[^']+\(opcional\)'/],
    ['fr', /signupArtifactPower: '[^']+\(facultatif\)'/],
    ['de', /signupArtifactPower: '[^']+\(optional\)'/],
  ]) {
    assert.match(source, marker, language);
  }
  assert.ok(VTS_SCORE_COPY_KEYS.includes('signupArtifactPower'));
  assert.doesNotMatch(
    source,
    /fieldArtifactPower: '[^']*\((optional|opcional|facultatif|اختياري)\)'/
  );
});
