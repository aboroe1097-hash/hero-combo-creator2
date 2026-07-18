import test from 'node:test';
import assert from 'node:assert/strict';

import {
  BOH_STATS_OCR_JPEG_QUALITY,
  BOH_STATS_OCR_MAX_DIMENSION,
  BOH_STATS_OCR_MAX_POWER,
  BOH_STATS_OCR_MAX_SOURCE_BYTES,
  BOH_STATS_OCR_SCHEMA_VERSION,
  applyBohStatsReviewCorrections,
  buildBohStatsOcrRequest,
  buildBohStatsReviewModel,
  getSingleBohStatsScreenshot,
  normalizeBohPowerNumber,
  parseBohStatsOcrResult,
  prepareBohStatsScreenshot,
  validateBohStatsScreenshot,
} from '../../js/all-star-boh-ocr.js';

const SANITIZED_JPEG = 'data:image/jpeg;base64,c2FuaXRpemVk';

function screenshot(overrides = {}) {
  return {
    name: 'power.png',
    type: 'image/png',
    size: 512_000,
    ...overrides,
  };
}

function response(overrides = {}) {
  const {
    extracted: extractedOverrides,
    confidence: confidenceOverrides,
    ...responseOverrides
  } = overrides;
  const extracted = {
    totalCastlePower: '123,456,789',
    troopPower: '20,000,000',
    buildingPower: '30,000,000',
    technologyPower: '40,000,000',
    heroCombatPower: '25,000,000',
    dragonPower: '8,456,789',
    gameName: 'Castle Hero',
    ...(extractedOverrides || {}),
  };
  const confidence =
    typeof confidenceOverrides === 'number'
      ? confidenceOverrides
      : {
          overall: 0.93,
          totalCastlePower: 0.98,
          troopPower: 0.91,
          buildingPower: 0.92,
          technologyPower: 0.93,
          heroCombatPower: 0.94,
          dragonPower: 0.95,
          gameName: 0.9,
          ...(confidenceOverrides || {}),
        };
  return {
    schemaVersion: BOH_STATS_OCR_SCHEMA_VERSION,
    warnings: [],
    requestId: 'req_2026_001',
    ...responseOverrides,
    extracted,
    confidence,
  };
}

function hasCode(code) {
  return (error) => {
    assert.equal(error?.name, 'BohStatsOcrError');
    assert.equal(error?.code, code);
    return true;
  };
}

test('screenshot selection accepts exactly one strict PNG, JPEG, or WebP MIME', () => {
  for (const type of ['image/png', 'image/jpeg', 'image/webp']) {
    const file = screenshot({ type });
    assert.equal(getSingleBohStatsScreenshot([file]), file);
    assert.equal(validateBohStatsScreenshot(file), file);
  }

  assert.throws(() => getSingleBohStatsScreenshot([]), hasCode('invalid_file_count'));
  assert.throws(
    () => getSingleBohStatsScreenshot([screenshot(), screenshot()]),
    hasCode('invalid_file_count')
  );
  assert.throws(
    () => validateBohStatsScreenshot(screenshot({ name: 'looks-like.png', type: '' })),
    hasCode('unsupported_mime')
  );
  assert.throws(
    () =>
      validateBohStatsScreenshot(
        screenshot({ name: 'looks-like.png', type: 'application/octet-stream' })
      ),
    hasCode('unsupported_mime')
  );
});

test('oversized or empty screenshots fail before the decoder can read bytes', async () => {
  let decodeCalls = 0;
  const decodeImage = async () => {
    decodeCalls += 1;
    return { width: 100, height: 100 };
  };
  const createCanvas = () => {
    throw new Error('must not create canvas');
  };

  await assert.rejects(
    () =>
      prepareBohStatsScreenshot(screenshot({ size: BOH_STATS_OCR_MAX_SOURCE_BYTES + 1 }), {
        decodeImage,
        createCanvas,
      }),
    hasCode('file_too_large')
  );
  await assert.rejects(
    () => prepareBohStatsScreenshot(screenshot({ size: 0 }), { decodeImage, createCanvas }),
    hasCode('invalid_file_size')
  );
  assert.equal(decodeCalls, 0);
});

test('preparation always canvas re-encodes to bounded JPEG and closes the decoded image', async () => {
  const file = screenshot({ type: 'image/jpeg', name: 'already-jpeg.jpg' });
  const calls = {
    decodedFile: null,
    canvasDimensions: null,
    draw: null,
    mime: null,
    quality: null,
    closed: false,
  };
  const image = {
    width: 4400,
    height: 2200,
    close() {
      calls.closed = true;
    },
  };

  const result = await prepareBohStatsScreenshot(file, {
    async decodeImage(value) {
      calls.decodedFile = value;
      return image;
    },
    createCanvas(width, height) {
      calls.canvasDimensions = [width, height];
      return {
        width: 0,
        height: 0,
        getContext(kind) {
          assert.equal(kind, '2d');
          return {
            drawImage(...args) {
              calls.draw = args;
            },
          };
        },
        toDataURL(mime, quality) {
          calls.mime = mime;
          calls.quality = quality;
          return SANITIZED_JPEG;
        },
      };
    },
  });

  assert.equal(calls.decodedFile, file);
  assert.deepEqual(calls.canvasDimensions, [BOH_STATS_OCR_MAX_DIMENSION, 1100]);
  assert.deepEqual(calls.draw, [image, 0, 0, BOH_STATS_OCR_MAX_DIMENSION, 1100]);
  assert.equal(calls.mime, 'image/jpeg');
  assert.equal(calls.quality, BOH_STATS_OCR_JPEG_QUALITY);
  assert.equal(calls.closed, true);
  assert.deepEqual(result, {
    imageData: SANITIZED_JPEG,
    width: BOH_STATS_OCR_MAX_DIMENSION,
    height: 1100,
  });
});

test('preparation never falls back to original bytes when canvas output is unsafe', async () => {
  let closed = false;
  await assert.rejects(
    () =>
      prepareBohStatsScreenshot(screenshot(), {
        async decodeImage() {
          return {
            width: 1000,
            height: 500,
            close() {
              closed = true;
            },
          };
        },
        createCanvas() {
          return {
            getContext() {
              return { drawImage() {} };
            },
            toDataURL() {
              return 'data:image/png;base64,b3JpZ2luYWw=';
            },
          };
        },
      }),
    hasCode('invalid_sanitized_image')
  );
  assert.equal(closed, true);
});

test('request builder exposes only the fixed dedicated endpoint schema', () => {
  const request = buildBohStatsOcrRequest({
    seasonId: ' season-2026 ',
    imageData: SANITIZED_JPEG,
    model: 'forbidden-model',
    messages: [{ role: 'user' }],
    imageUrl: 'https://example.com/private.png',
  });

  assert.deepEqual(request, {
    seasonId: 'season-2026',
    screenshotType: 'power_breakdown',
    imageData: SANITIZED_JPEG,
  });
  assert.deepEqual(Object.keys(request), ['seasonId', 'screenshotType', 'imageData']);
  assert.throws(
    () =>
      buildBohStatsOcrRequest({
        seasonId: 'season-2026',
        imageData: 'https://example.com/private.png',
      }),
    hasCode('invalid_sanitized_image')
  );
  assert.throws(
    () =>
      buildBohStatsOcrRequest({
        seasonId: '../season',
        imageData: SANITIZED_JPEG,
      }),
    hasCode('invalid_season_id')
  );
});

test('power normalization supports Unicode digits and separators without allowing decimals', () => {
  assert.equal(normalizeBohPowerNumber('١٢٣٬٤٥٦٬٧٨٩'), 123456789);
  assert.equal(normalizeBohPowerNumber('۱۲۳ ۴۵۶'), 123456);
  assert.equal(normalizeBohPowerNumber('１２３,４５６'), 123456);
  assert.equal(normalizeBohPowerNumber('1’234’567'), 1234567);
  assert.equal(normalizeBohPowerNumber('0'), 0);
  assert.equal(normalizeBohPowerNumber(''), null);

  assert.throws(() => normalizeBohPowerNumber('1e9'), hasCode('invalid_power_value'));
  assert.throws(() => normalizeBohPowerNumber('12.34'), hasCode('invalid_power_value'));
  assert.throws(() => normalizeBohPowerNumber('1,,234'), hasCode('invalid_power_value'));
  assert.throws(() => normalizeBohPowerNumber('1,234.567'), hasCode('invalid_power_value'));
  assert.throws(() => normalizeBohPowerNumber('-100'), hasCode('invalid_power_value'));
  assert.throws(() => normalizeBohPowerNumber(2.5), hasCode('invalid_power_value'));
  assert.throws(
    () => normalizeBohPowerNumber(BOH_STATS_OCR_MAX_POWER + 1),
    hasCode('power_out_of_range')
  );
  assert.throws(() => normalizeBohPowerNumber('9007199254740992'), hasCode('power_out_of_range'));
});

test('response parsing normalizes values and flags missing and low-confidence fields', () => {
  const parsed = parseBohStatsOcrResult(
    response({
      extracted: {
        totalCastlePower: '١٢٣٬٤٥٦٬٧٨٩',
        dragonPower: null,
        gameName: '  ＶＴＳ Hero  ',
      },
      confidence: {
        troopPower: 0.42,
        dragonPower: null,
        gameName: 0.7,
      },
      warnings: [' Cropped lower edge '],
    })
  );

  assert.equal(parsed.extracted.totalCastlePower, 123456789);
  assert.equal(parsed.extracted.dragonPower, null);
  assert.equal(parsed.extracted.gameName, 'VTS Hero');
  assert.deepEqual(parsed.missingFields, ['dragonPower']);
  assert.deepEqual(parsed.lowConfidenceFields, ['troopPower', 'gameName']);
  assert.deepEqual(parsed.fieldIssues.dragonPower, [{ code: 'missing' }]);
  assert.deepEqual(parsed.fieldIssues.troopPower, [{ code: 'low_confidence', confidence: 0.42 }]);
  assert.deepEqual(parsed.warnings, ['Cropped lower edge']);
  assert.equal(parsed.requiresReview, true);
});

test('six-row screenshots stay complete while optional extra power rows are preserved', () => {
  const sixRow = parseBohStatsOcrResult(response());
  assert.deepEqual(sixRow.missingFields, []);
  assert.equal(sixRow.extracted.unitSpecialtyPower, null);
  assert.equal(sixRow.extracted.artifactPower, null);
  assert.equal(sixRow.extracted.royalTechPower, null);

  const extended = parseBohStatsOcrResult(
    response({
      extracted: {
        unitSpecialtyPower: '6,485,660',
        artifactPower: '1,567,700',
        royalTechPower: '11,898,587',
      },
      confidence: {
        unitSpecialtyPower: 0.92,
        artifactPower: 0.91,
        royalTechPower: 0.9,
      },
    })
  );
  assert.deepEqual(extended.missingFields, []);
  assert.equal(extended.extracted.unitSpecialtyPower, 6_485_660);
  assert.equal(extended.extracted.artifactPower, 1_567_700);
  assert.equal(extended.extracted.royalTechPower, 11_898_587);
});

test('response parsing rejects malformed contracts and unsafe extracted values', () => {
  assert.throws(() => parseBohStatsOcrResult(null), hasCode('invalid_response'));

  const missingWarnings = response();
  delete missingWarnings.warnings;
  assert.throws(() => parseBohStatsOcrResult(missingWarnings), hasCode('invalid_response'));

  assert.throws(
    () => parseBohStatsOcrResult(response({ schemaVersion: 2 })),
    hasCode('unsupported_schema')
  );
  assert.throws(
    () => parseBohStatsOcrResult(response({ confidence: { troopPower: 1.2 } })),
    hasCode('invalid_confidence')
  );
  assert.throws(
    () => parseBohStatsOcrResult(response({ warnings: ['okay', 7] })),
    hasCode('invalid_response_warnings')
  );
  assert.throws(
    () =>
      parseBohStatsOcrResult(response({ extracted: { troopPower: BOH_STATS_OCR_MAX_POWER + 1 } })),
    (error) => {
      assert.equal(error.code, 'power_out_of_range');
      assert.equal(error.field, 'troopPower');
      return true;
    }
  );
});

test('missing field confidence is reviewable while a numeric overall confidence is supported', () => {
  const fieldConfidence = response();
  delete fieldConfidence.confidence.technologyPower;
  const parsedFieldConfidence = parseBohStatsOcrResult(fieldConfidence);
  assert.deepEqual(parsedFieldConfidence.missingConfidenceFields, ['technologyPower']);
  assert.deepEqual(parsedFieldConfidence.fieldIssues.technologyPower, [
    { code: 'missing_confidence' },
  ]);

  const parsedOverall = parseBohStatsOcrResult(response({ confidence: 0.88 }));
  assert.deepEqual(parsedOverall.lowConfidenceFields, []);
  assert.deepEqual(parsedOverall.missingConfidenceFields, []);
  assert.equal(parsedOverall.confidence.dragonPower, 0.88);
});

test('review model keeps OCR values immutable and derives correction audit metadata', () => {
  const rawResult = response({
    extracted: {
      dragonPower: null,
    },
  });
  const review = buildBohStatsReviewModel(rawResult);
  assert.notEqual(review.ocrValues, review.confirmedValues);
  assert.equal(Object.isFrozen(review.ocrValues), true);
  assert.equal(review.isComplete, false);

  const corrected = applyBohStatsReviewCorrections(
    review,
    {
      troopPower: '21,000,000',
      dragonPower: '۶٬۰۰۰٬۰۰۰',
      gameName: 'Corrected Hero',
    },
    { reviewedAt: '2026-07-17T12:00:00.000Z' }
  );

  assert.equal(review.confirmedValues.troopPower, 20000000);
  assert.equal(review.ocrValues.troopPower, 20000000);
  assert.equal(review.ocrValues.dragonPower, null);
  assert.equal(corrected.ocrValues.dragonPower, null);
  assert.equal(corrected.confirmedValues.troopPower, 21000000);
  assert.equal(corrected.confirmedValues.dragonPower, 6000000);
  assert.equal(corrected.confirmedValues.gameName, 'Corrected Hero');
  assert.equal(corrected.isComplete, true);
  assert.deepEqual(corrected.correctionAudit, {
    requestId: 'req_2026_001',
    reviewedAt: '2026-07-17T12:00:00.000Z',
    hasCorrections: true,
    correctionCount: 3,
    correctedFields: ['troopPower', 'dragonPower', 'gameName'],
    corrections: [
      {
        field: 'troopPower',
        ocrValue: 20000000,
        confirmedValue: 21000000,
        kind: 'manual_correction',
      },
      {
        field: 'dragonPower',
        ocrValue: null,
        confirmedValue: 6000000,
        kind: 'manual_entry',
      },
      {
        field: 'gameName',
        ocrValue: 'Castle Hero',
        confirmedValue: 'Corrected Hero',
        kind: 'manual_correction',
      },
    ],
  });
  assert.equal(JSON.stringify(corrected).includes('imageData'), false);
  assert.equal(JSON.stringify(corrected).includes('data:image'), false);
  assert.throws(
    () => applyBohStatsReviewCorrections(review, { imageData: SANITIZED_JPEG }),
    hasCode('unknown_review_field')
  );
});
