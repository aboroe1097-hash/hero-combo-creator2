import { getWeightedPlayerFamilyKey } from './contribution-weighting.js';
import { compactPlayerIdentity, resolveCanonicalPlayerIdentity } from './ocr-name-normalizer.js';
import { getPublicVtsPlayerProfile } from './vts-public-players.js';

function resolveVoteFamilyKey(rawName, playerKey, cleanedName = '') {
  const publicProfile =
    getPublicVtsPlayerProfile(rawName) ||
    getPublicVtsPlayerProfile(cleanedName) ||
    getPublicVtsPlayerProfile(playerKey);
  const familySourceKey = compactPlayerIdentity(publicProfile?.name) || playerKey;
  return getWeightedPlayerFamilyKey(familySourceKey) || familySourceKey;
}

export function resolveEdenVoteCandidate(candidate) {
  const rawName = String(candidate?.candidateName || candidate?.candidateKey || '').trim();
  const fallbackKey = String(candidate?.candidateKey || compactPlayerIdentity(rawName)).trim();

  try {
    const identity = resolveCanonicalPlayerIdentity(rawName);
    const playerKey = identity.playerKey || fallbackKey;
    const familyKey = resolveVoteFamilyKey(rawName, playerKey, identity.displayName);
    return {
      rawName,
      canonicalName: identity.playerName || identity.displayName || rawName,
      playerKey,
      familyKey,
    };
  } catch {
    const familyKey = resolveVoteFamilyKey(rawName, fallbackKey);
    return {
      rawName,
      canonicalName: rawName,
      playerKey: fallbackKey,
      familyKey,
    };
  }
}
