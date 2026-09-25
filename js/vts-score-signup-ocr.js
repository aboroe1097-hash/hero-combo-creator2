// Competition #12 registration: the Lord Info → Power screenshot read by the
// same secured OCR worker as the score upload, mapped onto the registration's
// power fields. Pure, so the mapping is unit-tested without a browser.
//
// A value the OCR could not read stays blank, never 0 (the 16.5.5 blank →
// absent rule): the member types it, and an optional power left blank stays
// absent from the stored document.

export const SIGNUP_OCR_FIELD_PATHS = Object.freeze({
  totalCastlePower: 'stats.totalCastlePower',
  troopPower: 'stats.troopPower',
  buildingPower: 'stats.buildingPower',
  technologyPower: 'stats.technologyPower',
  heroCombatPower: 'stats.heroCombatPower',
  dragonPower: 'stats.dragonPower',
  unitSpecialtyPower: 'stats.unitSpecialtyPower',
  artifactPower: 'stats.artifactPower',
});

function readable(value) {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

/** { 'stats.troopPower': 123 | '' , ... } for the registration inputs. */
export function mapOcrReviewToSignupFields(review) {
  const values = review?.confirmedValues || review?.ocrValues || {};
  return Object.fromEntries(
    Object.entries(SIGNUP_OCR_FIELD_PATHS).map(([field, path]) => [
      path,
      readable(values[field]) ? values[field] : '',
    ])
  );
}

/** Fields the OCR left blank, for the review hint. */
export function unreadSignupOcrFields(review) {
  const mapped = mapOcrReviewToSignupFields(review);
  return Object.entries(SIGNUP_OCR_FIELD_PATHS)
    .filter(([, path]) => mapped[path] === '')
    .map(([field]) => field);
}

/**
 * The `ocr` audit the signup document stores. firestore.rules accept a
 * submitted `entryMethod: 'ocr'` document only with `used` and
 * `valuesConfirmed` both true, so the member's confirm tick is the gate.
 */
export function buildSignupOcrAudit(review, { confirmed = false } = {}) {
  const confidence = review?.confidence || {};
  const fieldConfidence = {};
  Object.keys(SIGNUP_OCR_FIELD_PATHS).forEach((field) => {
    const value = confidence[field];
    if (typeof value === 'number' && Number.isFinite(value)) fieldConfidence[field] = value;
  });
  const overall = confidence.overall;
  return {
    used: true,
    valuesConfirmed: confirmed === true,
    confidence: typeof overall === 'number' && Number.isFinite(overall) ? overall : null,
    warnings: (Array.isArray(review?.warnings) ? review.warnings : [])
      .slice(0, 20)
      .map((warning) => String(warning?.code || warning || '').slice(0, 160))
      .filter(Boolean),
    fieldConfidence,
  };
}
