import { getWeightedPlayerFamilyKey } from './contribution-weighting.js';
import { compactPlayerIdentity, resolveCanonicalPlayerIdentity } from './ocr-name-normalizer.js';

export function resolveEdenVoteCandidate(candidate) {
  const rawName = String(candidate?.candidateName || candidate?.candidateKey || '').trim();
  const fallbackKey = String(candidate?.candidateKey || compactPlayerIdentity(rawName)).trim();

  try {
    const identity = resolveCanonicalPlayerIdentity(rawName);
    const playerKey = identity.playerKey || fallbackKey;
    const familyKey = getWeightedPlayerFamilyKey(playerKey) || playerKey;
    return {
      rawName,
      canonicalName: identity.playerName || identity.displayName || rawName,
      playerKey,
      familyKey,
    };
  } catch {
    const familyKey = getWeightedPlayerFamilyKey(fallbackKey) || fallbackKey;
    return {
      rawName,
      canonicalName: rawName,
      playerKey: fallbackKey,
      familyKey,
    };
  }
}
