import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { auditVtsScoreI18n, VTS_SCORE_LANGUAGES } from '../../js/vts-score-i18n.js';
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
