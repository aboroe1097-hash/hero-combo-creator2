import {
  BOH_STATS_OPTIONAL_POWER_FIELDS,
  BOH_STATS_REQUIRED_POWER_FIELDS,
  normalizeBohPowerNumber,
} from './all-star-boh-ocr.js';

export const VTS_SCORE_VERSION = 2;
export const VTS_SCORE_MAX_POWER = 100_000_000_000;
export const VTS_SCORE_POWER_FIELDS = Object.freeze([
  ...BOH_STATS_REQUIRED_POWER_FIELDS,
  ...BOH_STATS_OPTIONAL_POWER_FIELDS,
]);

export function normalizeVtsScoreSearch(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/\p{Mark}+/gu, '')
    .toLocaleLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, '');
}

function editDistance(left, right) {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex];
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1)
      );
    }
    previous.splice(0, previous.length, ...current);
  }
  return previous[right.length];
}

/** Typo tolerance only; a name sharing nothing with the query must never be offered. */
const FUZZY_MIN_SHARED_PREFIX = 3;

function sharedPrefixLength(left, right) {
  const limit = Math.min(left.length, right.length);
  let index = 0;
  while (index < limit && left[index] === right[index]) index += 1;
  return index;
}

function playerSearchScore(player, query) {
  const name = normalizeVtsScoreSearch(player?.gameName);
  if (!name || !query) return 0;
  if (name === query) return 10_000;
  if (name.startsWith(query)) return 8_000 - (name.length - query.length);
  const substringIndex = name.indexOf(query);
  if (substringIndex >= 0) return 6_000 - substringIndex * 10 - name.length;
  const distance = editDistance(name, query);
  const allowedDistance = Math.max(1, Math.floor(query.length / 2));
  if (distance > allowedDistance && sharedPrefixLength(name, query) < FUZZY_MIN_SHARED_PREFIX) {
    return 0;
  }
  return Math.max(1, 3_000 - distance * 100 - Math.abs(name.length - query.length));
}

export function rankVtsScorePlayers(players, queryInput, limit = 8) {
  const query = normalizeVtsScoreSearch(queryInput);
  if (!query) return [];
  return (Array.isArray(players) ? players : [])
    .map((player, index) => ({ player, index, score: playerSearchScore(player, query) }))
    .filter(({ score }) => score > 0)
    .sort(
      (left, right) =>
        right.score - left.score ||
        String(left.player?.gameName || '').localeCompare(
          String(right.player?.gameName || ''),
          undefined,
          { sensitivity: 'base' }
        ) ||
        left.index - right.index
    )
    .slice(0, Math.max(1, Math.trunc(Number(limit)) || 8))
    .map(({ player }) => player);
}

export function resolveVtsScorePlayer(players, gameNameInput) {
  const gameName = normalizeVtsScoreSearch(gameNameInput);
  const matches = (Array.isArray(players) ? players : []).filter(
    (player) => normalizeVtsScoreSearch(player?.gameName) === gameName
  );
  return matches.length === 1 ? matches[0] : null;
}

export function buildVtsScoreSubmission({ seasonId, player, powerValues, review } = {}) {
  if (!player?.submissionUid || !player?.gameName) {
    throw new TypeError('Choose your exact game name from the signup list.');
  }
  if (!review?.requestId || !review?.ocrValues) {
    throw new TypeError('Read your power screenshot before submitting.');
  }
  const confirmed = {};
  const sourceValues = {};
  const confidence = {};
  const correctedFields = [];
  for (const field of VTS_SCORE_POWER_FIELDS) {
    const value = normalizeBohPowerNumber(powerValues?.[field], {
      max: VTS_SCORE_MAX_POWER,
    });
    const original = normalizeBohPowerNumber(review.ocrValues[field], {
      max: VTS_SCORE_MAX_POWER,
    });
    if (BOH_STATS_REQUIRED_POWER_FIELDS.includes(field) && value === null) {
      throw new TypeError(`Confirm ${field} before submitting.`);
    }
    confirmed[field] = value;
    sourceValues[field] = original;
    confidence[field] =
      typeof review.confidence?.[field] === 'number' ? review.confidence[field] : null;
    if (value !== original) correctedFields.push(field);
  }
  return {
    seasonId: String(seasonId || '').trim(),
    submissionUid: String(player.submissionUid),
    gameName: String(player.gameName),
    powerValues: confirmed,
    ocr: {
      requestId: String(review.requestId),
      sourceValues,
      confidence,
      correctedFields,
    },
  };
}
