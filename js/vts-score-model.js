import { normalizeBohPowerNumber } from './all-star-boh-ocr.js';

export const VTS_SCORE_VERSION = 1;
export const VTS_SCORE_MAX_DRAGON_POWER = 100_000_000_000;

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

function playerSearchScore(player, query) {
  const name = normalizeVtsScoreSearch(player?.gameName);
  if (!name || !query) return 0;
  if (name === query) return 10_000;
  if (name.startsWith(query)) return 8_000 - (name.length - query.length);
  const substringIndex = name.indexOf(query);
  if (substringIndex >= 0) return 6_000 - substringIndex * 10 - name.length;
  const distance = editDistance(name, query);
  return 3_000 - distance * 100 - Math.abs(name.length - query.length);
}

export function rankVtsScorePlayers(players, queryInput, limit = 8) {
  const query = normalizeVtsScoreSearch(queryInput);
  if (!query) return [];
  return (Array.isArray(players) ? players : [])
    .map((player, index) => ({ player, index, score: playerSearchScore(player, query) }))
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

export function buildVtsScoreSubmission({ seasonId, player, totalPower, review } = {}) {
  if (!player?.submissionUid || !player?.gameName) {
    throw new TypeError('Choose your exact game name from the signup list.');
  }
  if (!review?.requestId || !review?.ocrValues) {
    throw new TypeError('Read your power screenshot before submitting.');
  }
  const confirmedPower = normalizeBohPowerNumber(totalPower, {
    max: VTS_SCORE_MAX_DRAGON_POWER,
  });
  const originalDragonPower = normalizeBohPowerNumber(review.ocrValues.totalCastlePower, {
    max: VTS_SCORE_MAX_DRAGON_POWER,
  });
  return {
    seasonId: String(seasonId || '').trim(),
    submissionUid: String(player.submissionUid),
    gameName: String(player.gameName),
    // The deployed v1 endpoint names this field dragonPower. Keep that wire key during the
    // emergency hotfix while sending the reviewed Total Power value.
    dragonPower: confirmedPower,
    ocr: {
      requestId: String(review.requestId),
      originalDragonPower,
      confidence:
        typeof review.confidence?.totalCastlePower === 'number'
          ? review.confidence.totalCastlePower
          : null,
      corrected: confirmedPower !== originalDragonPower,
    },
  };
}
