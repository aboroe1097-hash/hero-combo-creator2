import { normalizeBohPowerNumber } from './all-star-boh-ocr.js';

export const VTS_SCORE_VERSION = 1;
export const VTS_SCORE_MAX_DRAGON_POWER = 100_000_000_000;

export function resolveVtsScorePlayer(players, gameNameInput) {
  const gameName = String(gameNameInput || '')
    .normalize('NFC')
    .trim();
  const matches = (Array.isArray(players) ? players : []).filter(
    (player) => player?.gameName === gameName
  );
  return matches.length === 1 ? matches[0] : null;
}

export function buildVtsScoreSubmission({ seasonId, player, dragonPower, review } = {}) {
  if (!player?.submissionUid || !player?.gameName) {
    throw new TypeError('Choose your exact game name from the signup list.');
  }
  if (!review?.requestId || !review?.ocrValues) {
    throw new TypeError('Read your power screenshot before submitting.');
  }
  const confirmedPower = normalizeBohPowerNumber(dragonPower, {
    max: VTS_SCORE_MAX_DRAGON_POWER,
  });
  const originalDragonPower = normalizeBohPowerNumber(review.ocrValues.dragonPower, {
    max: VTS_SCORE_MAX_DRAGON_POWER,
  });
  return {
    seasonId: String(seasonId || '').trim(),
    submissionUid: String(player.submissionUid),
    gameName: String(player.gameName),
    dragonPower: confirmedPower,
    ocr: {
      requestId: String(review.requestId),
      originalDragonPower,
      confidence:
        typeof review.confidence?.dragonPower === 'number' ? review.confidence.dragonPower : null,
      corrected: confirmedPower !== originalDragonPower,
    },
  };
}
