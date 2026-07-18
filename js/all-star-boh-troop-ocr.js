import { assertJpegDataUrl, normalizeBohPowerNumber } from './all-star-boh-ocr.js';

export const BOH_TROOP_OCR_SCREENSHOT_TYPE = 'troop_details';
export const BOH_TROOP_OCR_SCHEMA_VERSION = 1;
export const BOH_TROOP_TYPES = Object.freeze(['footmen', 'cavalry', 'archers']);
export const BOH_TROOP_TIERS = Object.freeze([
  'SSS',
  'SS',
  'S',
  'X',
  'IX',
  'VIII',
  'VII',
  'VI',
  'V',
  'IV',
  'III',
  'II',
  'I',
]);

const SEASON_PATTERN = /^[a-z0-9][a-z0-9._:-]{0,79}$/iu;
const MAX_ROWS = 60;

function cleanText(value, maximum = 80) {
  return String(value || '')
    .normalize('NFKC')
    .trim()
    .slice(0, maximum);
}

function normalizeConfidence(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 && number <= 1 ? number : null;
}

export function buildBohTroopOcrRequest({ seasonId, imageData } = {}) {
  const normalizedSeasonId = cleanText(seasonId, 80);
  if (!SEASON_PATTERN.test(normalizedSeasonId)) throw new TypeError('A valid season is required.');
  return Object.freeze({
    seasonId: normalizedSeasonId,
    screenshotType: BOH_TROOP_OCR_SCREENSHOT_TYPE,
    imageData: assertJpegDataUrl(imageData),
  });
}

export function normalizeBohTroopRow(value = {}) {
  const troopType = cleanText(value.troopType, 20).toLowerCase();
  const tier = cleanText(value.tier, 5).toUpperCase();
  if (!BOH_TROOP_TYPES.includes(troopType) || !BOH_TROOP_TIERS.includes(tier)) return null;
  let count = null;
  try {
    count = normalizeBohPowerNumber(value.count, { max: 1_000_000_000 });
  } catch {
    count = null;
  }
  const enhanced = typeof value.enhanced === 'boolean' ? value.enhanced : null;
  return Object.freeze({
    troopType,
    tier,
    enhanced,
    count,
    unitName: cleanText(value.unitName, 80),
    confidence: normalizeConfidence(value.confidence),
    needsReview:
      count === null || enhanced === null || normalizeConfidence(value.confidence) < 0.75,
  });
}

export function parseBohTroopOcrResult(payload = {}) {
  if (payload.schemaVersion !== BOH_TROOP_OCR_SCHEMA_VERSION || !Array.isArray(payload.rows)) {
    throw new TypeError('Troop OCR returned an unsupported response.');
  }
  const rows = payload.rows.slice(0, MAX_ROWS).map(normalizeBohTroopRow).filter(Boolean);
  const warnings = Array.isArray(payload.warnings)
    ? payload.warnings
        .map((value) => cleanText(value, 240))
        .filter(Boolean)
        .slice(0, 20)
    : [];
  return Object.freeze({
    schemaVersion: BOH_TROOP_OCR_SCHEMA_VERSION,
    requestId: cleanText(payload.requestId, 128),
    rows,
    warnings,
    requiresReview: warnings.length > 0 || rows.some((row) => row.needsReview),
  });
}

export function mergeBohTroopOcrRows(...collections) {
  const merged = new Map();
  for (const value of collections.flat()) {
    const row = normalizeBohTroopRow(value);
    if (!row) continue;
    const key = `${row.troopType}|${row.tier}|${row.enhanced === true ? 'enhanced' : row.enhanced === false ? 'normal' : 'unknown'}`;
    const previous = merged.get(key);
    if (!previous || (row.confidence ?? -1) >= (previous.confidence ?? -1)) merged.set(key, row);
  }
  return BOH_TROOP_TIERS.flatMap((tier) =>
    BOH_TROOP_TYPES.flatMap((troopType) =>
      [...merged.values()].filter((row) => row.tier === tier && row.troopType === troopType)
    )
  );
}

export function serializeBohTroopInventoryRow(value) {
  const row = normalizeBohTroopRow(value);
  if (!row || row.count === null || row.enhanced === null) return '';
  return `${row.troopType}|${row.tier}|${row.enhanced ? 'enhanced' : 'normal'}|${row.count}`;
}

export function parseBohTroopInventoryRow(value) {
  const [troopType, tier, mode, rawCount, extra] = String(value || '').split('|');
  if (extra !== undefined || !['normal', 'enhanced'].includes(mode)) return null;
  return normalizeBohTroopRow({
    troopType,
    tier,
    enhanced: mode === 'enhanced',
    count: rawCount,
    confidence: 1,
  });
}
