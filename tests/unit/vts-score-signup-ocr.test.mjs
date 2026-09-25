import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildSignupOcrAudit,
  mapOcrReviewToSignupFields,
  SIGNUP_OCR_FIELD_PATHS,
  unreadSignupOcrFields,
} from '../../js/vts-score-signup-ocr.js';
import { buildBohStatsReviewModel } from '../../js/all-star-boh-ocr.js';

test('OCR values fill the registration power fields; unreadable ones stay blank', () => {
  const review = {
    confirmedValues: {
      totalCastlePower: 1_112_473_195,
      troopPower: 999_076_138,
      buildingPower: 6_477_467,
      technologyPower: null,
      heroCombatPower: 30_585_714,
      dragonPower: 16_306_050,
      unitSpecialtyPower: 21_125_570,
      artifactPower: null,
      royalTechPower: null,
    },
  };
  const fields = mapOcrReviewToSignupFields(review);
  assert.deepEqual(Object.keys(fields), Object.values(SIGNUP_OCR_FIELD_PATHS));
  assert.equal(fields['stats.totalCastlePower'], 1_112_473_195);
  assert.equal(fields['stats.dragonPower'], 16_306_050);
  assert.equal(fields['stats.unitSpecialtyPower'], 21_125_570);
  assert.equal(fields['stats.technologyPower'], '', 'unreadable stays blank, never 0');
  assert.equal(fields['stats.artifactPower'], '');
  assert.deepEqual(unreadSignupOcrFields(review), ['technologyPower', 'artifactPower']);
  // Royal Tech is often absent from Lord Info and is not a registration field.
  assert.ok(!('stats.royalTechPower' in fields));
});

test('the mapping reads the shared OCR review model (worker response shape)', () => {
  const review = buildBohStatsReviewModel({
    schemaVersion: 1,
    requestId: 'req-1',
    extracted: {
      totalCastlePower: '1,200,000',
      troopPower: '900,000',
      buildingPower: '50,000',
      technologyPower: '100,000',
      heroCombatPower: '80,000',
      dragonPower: '40,000',
      unitSpecialtyPower: null,
      artifactPower: '30,000',
      royalTechPower: null,
      gameName: null,
    },
    confidence: { overall: 0.92 },
    warnings: [],
  });
  const fields = mapOcrReviewToSignupFields(review);
  assert.equal(fields['stats.totalCastlePower'], 1_200_000);
  assert.equal(fields['stats.artifactPower'], 30_000);
  assert.equal(fields['stats.unitSpecialtyPower'], '');
  const audit = buildSignupOcrAudit(review, { confirmed: false });
  assert.equal(audit.used, true);
  assert.equal(audit.valuesConfirmed, false);
  assert.equal(audit.confidence, 0.92);
});
