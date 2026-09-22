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

// Admin vote redirects. A superadmin can decide that votes cast for one
// account belong to another player — typically a banner or alt account that
// voters picked instead of the person running it (BONEfastBANNER → BoneSmoker).
// Keys are the source account's vote family key, so every spelling of that
// account moves together; values keep the source label for the admin list.
export const MAX_EDEN_VOTE_REDIRECTS = 60;

export function normalizeEdenVoteRedirects(value) {
  const result = {};
  if (!value || typeof value !== 'object' || Array.isArray(value)) return result;
  Object.entries(value)
    .slice(0, MAX_EDEN_VOTE_REDIRECTS)
    .forEach(([rawKey, rawEntry]) => {
      const key = String(rawKey || '')
        .trim()
        .slice(0, 80);
      const entry = typeof rawEntry === 'string' ? { to: rawEntry } : rawEntry || {};
      const to = String(entry.to || '')
        .trim()
        .slice(0, 80);
      const from = String(entry.from || key)
        .trim()
        .slice(0, 80);
      if (!key || !to) return;
      const target = resolveEdenVoteCandidate({ candidateName: to });
      // A redirect onto the same family is a no-op; drop it rather than store it.
      if (target.familyKey === key) return;
      result[key] = { from, to };
    });
  return result;
}

export function resolveEdenVoteCandidateWithRedirects(candidate, redirects = {}) {
  const resolved = resolveEdenVoteCandidate(candidate);
  const redirect = redirects?.[resolved.familyKey] || redirects?.[resolved.playerKey];
  if (!redirect?.to) return resolved;
  // One hop only: a redirect target is counted as itself, never re-redirected,
  // so two entries can never loop.
  const target = resolveEdenVoteCandidate({ candidateName: redirect.to });
  return {
    ...target,
    rawName: resolved.rawName,
    redirectedFrom: resolved.canonicalName || resolved.rawName,
  };
}
