import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildBohTroopOcrRequest,
  mergeBohTroopOcrRows,
  parseBohTroopInventoryRow,
  parseBohTroopOcrResult,
  serializeBohTroopInventoryRow,
} from '../../js/all-star-boh-troop-ocr.js';

test('troop OCR request uses the dedicated screenshot type and sanitized JPEG only', () => {
  assert.deepEqual(
    buildBohTroopOcrRequest({
      seasonId: 'season-2026',
      imageData: 'data:image/jpeg;base64,AA==',
    }),
    {
      seasonId: 'season-2026',
      screenshotType: 'troop_details',
      imageData: 'data:image/jpeg;base64,AA==',
    }
  );
  assert.throws(() =>
    buildBohTroopOcrRequest({ seasonId: 'season-2026', imageData: 'data:image/png;base64,AA==' })
  );
});

test('troop OCR accepts SSS through I and flags uncertain enhancement or counts', () => {
  const parsed = parseBohTroopOcrResult({
    schemaVersion: 1,
    requestId: 'req-1',
    rows: [
      { troopType: 'footmen', tier: 'SSS', enhanced: true, count: '1,234', confidence: 0.96 },
      { troopType: 'archers', tier: 'IX', enhanced: null, count: null, confidence: 0.4 },
    ],
    warnings: ['Training overlay obscures one card.'],
  });
  assert.equal(parsed.rows[0].tier, 'SSS');
  assert.equal(parsed.rows[0].count, 1234);
  assert.equal(parsed.rows[0].needsReview, false);
  assert.equal(parsed.rows[1].needsReview, true);
  assert.equal(parsed.requiresReview, true);
});

test('overlapping screenshots deduplicate rows and compact reviewed values for storage', () => {
  const rows = mergeBohTroopOcrRows(
    [{ troopType: 'cavalry', tier: 'X', enhanced: true, count: 100, confidence: 0.8 }],
    [{ troopType: 'cavalry', tier: 'X', enhanced: true, count: 120, confidence: 0.95 }]
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0].count, 120);
  const encoded = serializeBohTroopInventoryRow(rows[0]);
  assert.equal(encoded, 'cavalry|X|enhanced|120');
  assert.equal(parseBohTroopInventoryRow(encoded)?.count, 120);
});
