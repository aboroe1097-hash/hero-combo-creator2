const SUPPORTED_SCREENSHOT_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const REQUIRED_RESULT_KEYS = ['schemaVersion', 'extracted', 'confidence', 'warnings', 'requestId'];

const UNICODE_DIGIT_ZERO_CODE_POINTS = [
  0x0660, 0x06f0, 0x0966, 0x09e6, 0x0a66, 0x0ae6, 0x0b66, 0x0be6, 0x0c66, 0x0ce6, 0x0d66, 0x0e50,
  0x0ed0, 0x0f20, 0x1040, 0x17e0, 0xff10,
];

const BIDI_FORMATTING_MARKS = /[\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/gu;
const GROUPED_INTEGER_PATTERN =
  /^[0-9]{1,3}([.,\u066b\u066c'’\u00a0\u2007\u2009\u202f ])[0-9]{3}(?:\1[0-9]{3})*$/u;
const JPEG_DATA_URL_PATTERN = /^data:image\/jpeg;base64,[a-z0-9+/]+={0,2}$/iu;
const SAFE_SEASON_ID_PATTERN = /^[a-z0-9][a-z0-9._:-]{0,79}$/iu;

export const BOH_STATS_OCR_SCHEMA_VERSION = 1;
export const BOH_STATS_OCR_SCREENSHOT_TYPE = 'power_breakdown';
export const BOH_STATS_OCR_MAX_SOURCE_BYTES = 10 * 1024 * 1024;
export const BOH_STATS_OCR_MAX_DIMENSION = 2200;
export const BOH_STATS_OCR_JPEG_QUALITY = 0.88;
export const BOH_STATS_OCR_MAX_POWER = 100_000_000_000;
export const BOH_STATS_OCR_LOW_CONFIDENCE_THRESHOLD = 0.75;

export const BOH_STATS_REQUIRED_POWER_FIELDS = Object.freeze([
  'totalCastlePower',
  'troopPower',
  'buildingPower',
  'technologyPower',
  'heroCombatPower',
  'dragonPower',
]);
export const BOH_STATS_OPTIONAL_POWER_FIELDS = Object.freeze([
  'unitSpecialtyPower',
  'artifactPower',
  'royalTechPower',
]);
export const BOH_STATS_POWER_FIELDS = Object.freeze([
  ...BOH_STATS_REQUIRED_POWER_FIELDS,
  ...BOH_STATS_OPTIONAL_POWER_FIELDS,
]);

export const BOH_STATS_OCR_FIELDS = Object.freeze([...BOH_STATS_POWER_FIELDS, 'gameName']);

export class BohStatsOcrError extends Error {
  constructor(code, message, options = {}) {
    super(message);
    this.name = 'BohStatsOcrError';
    this.code = code;
    if (options.field) this.field = options.field;
    if (options.cause) this.cause = options.cause;
  }
}

function fail(code, message, options) {
  throw new BohStatsOcrError(code, message, options);
}

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function hasControlCharacters(value, allowLineWhitespace = false) {
  for (const character of value) {
    const codePoint = character.codePointAt(0);
    if (codePoint === 0x7f) return true;
    if (
      codePoint < 0x20 &&
      !(allowLineWhitespace && (codePoint === 0x09 || codePoint === 0x0a || codePoint === 0x0d))
    ) {
      return true;
    }
  }
  return false;
}

function assertFiniteUnitInterval(value, field) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1) {
    fail('invalid_confidence', `OCR confidence is invalid for ${field}.`, { field });
  }
  return value;
}

function normalizeUnicodeDigits(value) {
  let normalized = '';
  for (const character of value) {
    const codePoint = character.codePointAt(0);
    let digit = null;
    for (const zeroCodePoint of UNICODE_DIGIT_ZERO_CODE_POINTS) {
      const offset = codePoint - zeroCodePoint;
      if (offset >= 0 && offset <= 9) {
        digit = String(offset);
        break;
      }
    }
    normalized += digit ?? character;
  }
  return normalized;
}

function normalizeGameName(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string') {
    fail('invalid_game_name', 'OCR game name must be text.', { field: 'gameName' });
  }
  const normalized = value.normalize('NFKC').trim();
  if (!normalized) return null;
  if (hasControlCharacters(normalized) || Array.from(normalized).length > 80) {
    fail('invalid_game_name', 'OCR game name is outside the accepted format.', {
      field: 'gameName',
    });
  }
  return normalized;
}

function valuesMatch(left, right) {
  return Object.is(left, right);
}

function getOutputDimensions(image) {
  const sourceWidth = Number(image?.width ?? image?.naturalWidth);
  const sourceHeight = Number(image?.height ?? image?.naturalHeight);
  if (
    !Number.isFinite(sourceWidth) ||
    !Number.isFinite(sourceHeight) ||
    sourceWidth <= 0 ||
    sourceHeight <= 0
  ) {
    fail('invalid_image_dimensions', 'The screenshot has invalid dimensions.');
  }
  const scale = Math.min(1, BOH_STATS_OCR_MAX_DIMENSION / Math.max(sourceWidth, sourceHeight));
  return {
    width: Math.max(1, Math.round(sourceWidth * scale)),
    height: Math.max(1, Math.round(sourceHeight * scale)),
  };
}

async function defaultDecodeImage(file) {
  if (typeof globalThis.createImageBitmap !== 'function') {
    fail('image_decode_unavailable', 'This browser cannot safely prepare the screenshot for OCR.');
  }
  return globalThis.createImageBitmap(file);
}

function defaultCreateCanvas(width, height) {
  if (typeof document === 'undefined' || typeof document.createElement !== 'function') {
    fail('canvas_unavailable', 'This browser cannot safely prepare the screenshot for OCR.');
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

export function assertJpegDataUrl(imageData) {
  if (typeof imageData !== 'string' || !JPEG_DATA_URL_PATTERN.test(imageData)) {
    fail('invalid_sanitized_image', 'The screenshot could not be safely converted to JPEG.');
  }
  return imageData;
}

function normalizeWarnings(value) {
  if (!Array.isArray(value) || value.length > 50) {
    fail('invalid_response_warnings', 'OCR response warnings are malformed.');
  }
  return value
    .map((warning) => {
      if (typeof warning !== 'string') {
        fail('invalid_response_warnings', 'OCR response warnings are malformed.');
      }
      const normalized = warning.normalize('NFKC').trim();
      if (Array.from(normalized).length > 300 || hasControlCharacters(normalized, true)) {
        fail('invalid_response_warnings', 'OCR response warnings are malformed.');
      }
      return normalized;
    })
    .filter(Boolean);
}

function normalizeRequestId(value) {
  if (typeof value !== 'string') {
    fail('invalid_request_id', 'OCR response request ID is missing or invalid.');
  }
  const normalized = value.trim();
  if (!normalized || Array.from(normalized).length > 128 || hasControlCharacters(normalized)) {
    fail('invalid_request_id', 'OCR response request ID is missing or invalid.');
  }
  return normalized;
}

function normalizeConfidence(value) {
  if (typeof value === 'number') {
    const overall = assertFiniteUnitInterval(value, 'overall');
    return Object.fromEntries([
      ['overall', overall],
      ...BOH_STATS_OCR_FIELDS.map((field) => [field, overall]),
    ]);
  }
  if (!isRecord(value)) {
    fail('invalid_confidence', 'OCR response confidence is malformed.');
  }
  const normalized = {};
  normalized.overall = hasOwn(value, 'overall')
    ? assertFiniteUnitInterval(value.overall, 'overall')
    : null;
  for (const field of BOH_STATS_OCR_FIELDS) {
    normalized[field] = hasOwn(value, field) ? assertFiniteUnitInterval(value[field], field) : null;
  }
  return normalized;
}

function buildFieldIssues(extracted, confidence, lowConfidenceThreshold) {
  const fieldIssues = Object.fromEntries(BOH_STATS_OCR_FIELDS.map((field) => [field, []]));
  const missingFields = [];
  const missingConfidenceFields = [];
  const lowConfidenceFields = [];

  for (const field of BOH_STATS_POWER_FIELDS) {
    if (extracted[field] === null) {
      if (BOH_STATS_REQUIRED_POWER_FIELDS.includes(field)) {
        missingFields.push(field);
        fieldIssues[field].push({ code: 'missing' });
      }
      continue;
    }
    if (confidence[field] === null) {
      missingConfidenceFields.push(field);
      fieldIssues[field].push({ code: 'missing_confidence' });
    } else if (confidence[field] < lowConfidenceThreshold) {
      lowConfidenceFields.push(field);
      fieldIssues[field].push({
        code: 'low_confidence',
        confidence: confidence[field],
      });
    }
  }

  if (extracted.gameName !== null) {
    if (confidence.gameName === null) {
      missingConfidenceFields.push('gameName');
      fieldIssues.gameName.push({ code: 'missing_confidence' });
    } else if (confidence.gameName < lowConfidenceThreshold) {
      lowConfidenceFields.push('gameName');
      fieldIssues.gameName.push({
        code: 'low_confidence',
        confidence: confidence.gameName,
      });
    }
  }

  return {
    fieldIssues,
    missingFields,
    missingConfidenceFields,
    lowConfidenceFields,
  };
}

function isCompleteConfirmedValues(values) {
  return BOH_STATS_REQUIRED_POWER_FIELDS.every((field) => values[field] !== null);
}

function buildCorrectionAudit(ocrValues, confirmedValues, requestId, reviewedAt) {
  const corrections = [];
  for (const field of BOH_STATS_OCR_FIELDS) {
    const ocrValue = ocrValues[field] ?? null;
    const confirmedValue = confirmedValues[field] ?? null;
    if (valuesMatch(ocrValue, confirmedValue)) continue;
    corrections.push({
      field,
      ocrValue,
      confirmedValue,
      kind:
        ocrValue === null
          ? 'manual_entry'
          : confirmedValue === null
            ? 'cleared'
            : 'manual_correction',
    });
  }
  return {
    requestId,
    reviewedAt,
    hasCorrections: corrections.length > 0,
    correctionCount: corrections.length,
    correctedFields: corrections.map((entry) => entry.field),
    corrections,
  };
}

function normalizeReviewTimestamp(value) {
  const candidate = value ?? new Date().toISOString();
  if (typeof candidate !== 'string' || Number.isNaN(Date.parse(candidate))) {
    fail('invalid_review_timestamp', 'Review timestamp is invalid.');
  }
  return new Date(candidate).toISOString();
}

export function getSingleBohStatsScreenshot(input) {
  const files =
    isRecord(input) && typeof input.type === 'string' && Number.isFinite(input.size)
      ? [input]
      : Array.from(input || []);
  if (files.length !== 1) {
    fail('invalid_file_count', 'Select exactly one stats screenshot.');
  }
  return validateBohStatsScreenshot(files[0]);
}

export function validateBohStatsScreenshot(file) {
  if (!isRecord(file)) {
    fail('invalid_file', 'Select a valid stats screenshot.');
  }
  const mimeType = String(file.type || '')
    .trim()
    .toLowerCase();
  if (!SUPPORTED_SCREENSHOT_MIME_TYPES.has(mimeType)) {
    fail('unsupported_mime', 'Use a PNG, JPEG, or WebP stats screenshot.');
  }
  if (!Number.isSafeInteger(file.size) || file.size <= 0) {
    fail('invalid_file_size', 'The stats screenshot is empty or has an invalid size.');
  }
  if (file.size > BOH_STATS_OCR_MAX_SOURCE_BYTES) {
    fail(
      'file_too_large',
      `The stats screenshot must be ${Math.floor(BOH_STATS_OCR_MAX_SOURCE_BYTES / 1048576)} MB or smaller.`
    );
  }
  return file;
}

export async function prepareBohStatsScreenshot(file, options = {}) {
  validateBohStatsScreenshot(file);
  const decodeImage = options.decodeImage || defaultDecodeImage;
  const createCanvas = options.createCanvas || defaultCreateCanvas;
  if (typeof decodeImage !== 'function' || typeof createCanvas !== 'function') {
    fail('invalid_image_dependencies', 'Screenshot preparation dependencies are invalid.');
  }

  let image;
  try {
    image = await decodeImage(file);
  } catch (error) {
    if (error instanceof BohStatsOcrError) throw error;
    fail('image_decode_failed', 'The stats screenshot could not be decoded.', { cause: error });
  }

  try {
    const dimensions = getOutputDimensions(image);
    const canvas = createCanvas(dimensions.width, dimensions.height);
    if (!canvas || typeof canvas.getContext !== 'function') {
      fail('canvas_unavailable', 'The screenshot could not be safely prepared for OCR.');
    }
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
    const context = canvas.getContext('2d');
    if (!context || typeof context.drawImage !== 'function') {
      fail('canvas_unavailable', 'The screenshot could not be safely prepared for OCR.');
    }
    context.drawImage(image, 0, 0, dimensions.width, dimensions.height);
    if (typeof canvas.toDataURL !== 'function') {
      fail('canvas_unavailable', 'The screenshot could not be safely prepared for OCR.');
    }
    const imageData = assertJpegDataUrl(canvas.toDataURL('image/jpeg', BOH_STATS_OCR_JPEG_QUALITY));
    return {
      imageData,
      width: dimensions.width,
      height: dimensions.height,
    };
  } catch (error) {
    if (error instanceof BohStatsOcrError) throw error;
    fail('image_reencode_failed', 'The stats screenshot could not be safely converted to JPEG.', {
      cause: error,
    });
  } finally {
    image?.close?.();
  }
}

export function buildBohStatsOcrRequest({ seasonId, imageData } = {}) {
  const normalizedSeasonId = String(seasonId || '').trim();
  if (!SAFE_SEASON_ID_PATTERN.test(normalizedSeasonId)) {
    fail('invalid_season_id', 'A valid season ID is required for stats OCR.');
  }
  return {
    seasonId: normalizedSeasonId,
    screenshotType: BOH_STATS_OCR_SCREENSHOT_TYPE,
    imageData: assertJpegDataUrl(imageData),
  };
}

export function normalizeBohPowerNumber(value, options = {}) {
  const max = options.max ?? BOH_STATS_OCR_MAX_POWER;
  if (!Number.isSafeInteger(max) || max < 0) {
    fail('invalid_power_limit', 'Power validation limit is invalid.');
  }
  if (value === null || value === undefined || value === '') return null;

  let digits;
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value) || value < 0) {
      fail('invalid_power_value', 'OCR power value is not a safe non-negative integer.');
    }
    digits = String(value);
  } else if (typeof value === 'string') {
    const normalized = normalizeUnicodeDigits(
      value.normalize('NFKC').replace(BIDI_FORMATTING_MARKS, '').trim()
    );
    if (!normalized) return null;
    if (/^[0-9]+$/u.test(normalized)) {
      digits = normalized;
    } else if (GROUPED_INTEGER_PATTERN.test(normalized)) {
      digits = normalized.replace(/[^0-9]/gu, '');
    } else {
      fail('invalid_power_value', 'OCR power value has an unsafe numeric format.');
    }
  } else {
    fail('invalid_power_value', 'OCR power value has an unsafe numeric type.');
  }

  let integer;
  try {
    integer = BigInt(digits);
  } catch {
    fail('invalid_power_value', 'OCR power value has an unsafe numeric format.');
  }
  if (integer > BigInt(Number.MAX_SAFE_INTEGER) || integer > BigInt(max)) {
    fail('power_out_of_range', 'OCR power value is outside the accepted range.');
  }
  return Number(integer);
}

export function parseBohStatsOcrResult(payload, options = {}) {
  if (!isRecord(payload)) {
    fail('invalid_response', 'OCR response must be an object.');
  }
  for (const key of REQUIRED_RESULT_KEYS) {
    if (!hasOwn(payload, key)) {
      fail('invalid_response', `OCR response is missing ${key}.`);
    }
  }
  if (payload.schemaVersion !== BOH_STATS_OCR_SCHEMA_VERSION) {
    fail('unsupported_schema', 'OCR response schema version is not supported.');
  }
  if (!isRecord(payload.extracted)) {
    fail('invalid_extracted', 'OCR response extracted values are malformed.');
  }

  const extracted = {};
  for (const field of BOH_STATS_POWER_FIELDS) {
    try {
      extracted[field] = normalizeBohPowerNumber(payload.extracted[field]);
    } catch (error) {
      if (error instanceof BohStatsOcrError) error.field = field;
      throw error;
    }
  }
  extracted.gameName = normalizeGameName(payload.extracted.gameName);

  const confidence = normalizeConfidence(payload.confidence);
  const warnings = normalizeWarnings(payload.warnings);
  const requestId = normalizeRequestId(payload.requestId);
  const lowConfidenceThreshold =
    options.lowConfidenceThreshold ?? BOH_STATS_OCR_LOW_CONFIDENCE_THRESHOLD;
  if (
    typeof lowConfidenceThreshold !== 'number' ||
    !Number.isFinite(lowConfidenceThreshold) ||
    lowConfidenceThreshold < 0 ||
    lowConfidenceThreshold > 1
  ) {
    fail('invalid_confidence_threshold', 'OCR confidence threshold is invalid.');
  }
  const issues = buildFieldIssues(extracted, confidence, lowConfidenceThreshold);

  return {
    schemaVersion: BOH_STATS_OCR_SCHEMA_VERSION,
    requestId,
    extracted,
    confidence,
    warnings,
    ...issues,
    requiresReview:
      warnings.length > 0 ||
      issues.missingFields.length > 0 ||
      issues.missingConfidenceFields.length > 0 ||
      issues.lowConfidenceFields.length > 0,
  };
}

export function buildBohStatsReviewModel(result, options = {}) {
  const parsed = parseBohStatsOcrResult(result, options);
  const ocrValues = Object.freeze({ ...parsed.extracted });
  const confirmedValues = { ...parsed.extracted };
  return {
    schemaVersion: parsed.schemaVersion,
    requestId: parsed.requestId,
    ocrValues,
    confirmedValues,
    confidence: { ...parsed.confidence },
    warnings: [...parsed.warnings],
    fieldIssues: Object.fromEntries(
      Object.entries(parsed.fieldIssues).map(([field, entries]) => [
        field,
        entries.map((entry) => ({ ...entry })),
      ])
    ),
    requiresReview: parsed.requiresReview,
    isComplete: isCompleteConfirmedValues(confirmedValues),
    correctionAudit: {
      requestId: parsed.requestId,
      reviewedAt: null,
      hasCorrections: false,
      correctionCount: 0,
      correctedFields: [],
      corrections: [],
    },
  };
}

export function applyBohStatsReviewCorrections(review, edits, options = {}) {
  if (!isRecord(review) || !isRecord(review.ocrValues) || !isRecord(review.confirmedValues)) {
    fail('invalid_review_model', 'OCR review model is invalid.');
  }
  if (!isRecord(edits)) {
    fail('invalid_review_edits', 'OCR review edits must be an object.');
  }
  for (const field of Object.keys(edits)) {
    if (!BOH_STATS_OCR_FIELDS.includes(field)) {
      fail('unknown_review_field', `OCR review field ${field} is not supported.`, { field });
    }
  }

  const confirmedValues = { ...review.confirmedValues };
  for (const field of BOH_STATS_POWER_FIELDS) {
    if (!hasOwn(edits, field)) continue;
    try {
      confirmedValues[field] = normalizeBohPowerNumber(edits[field]);
    } catch (error) {
      if (error instanceof BohStatsOcrError) error.field = field;
      throw error;
    }
  }
  if (hasOwn(edits, 'gameName')) {
    confirmedValues.gameName = normalizeGameName(edits.gameName);
  }

  const reviewedAt = normalizeReviewTimestamp(options.reviewedAt);
  const correctionAudit = buildCorrectionAudit(
    review.ocrValues,
    confirmedValues,
    String(review.requestId || ''),
    reviewedAt
  );
  return {
    ...review,
    ocrValues: review.ocrValues,
    confirmedValues,
    isComplete: isCompleteConfirmedValues(confirmedValues),
    correctionAudit,
  };
}
