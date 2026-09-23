// js/eden-account-link.js
//
// The account ↔ guild-player bridge the Eden pages were missing.
//
// A visitor who signed in (profile.html) carries `users/{uid}.accountProfile`
// with the game name they play under. That single string is enough to answer
// "which roster row is this person?" — but only through the matcher the Eden
// page already trusts for My Stats and the ballot (`findEdenMemberOption`,
// score ≥ 86 and a margin ≥ 6 over the runner-up), so this module is resolution
// *policy* only. It performs no DOM work, imports no matcher, and takes the
// matcher as a callback: the page hands in its own.
//
// Three outcomes matter to the callers:
//   found      → prefill My Stats and the ballot's name field with this player;
//   ambiguous  → only suggestions fit, not a match; keep search-by-hand;
//   unknown    → the name is not in the guild roster; same fallback.
// Nothing here may block a render: the caller resolves in the background, and a
// missing or unreadable profile simply leaves the page exactly as it was.

export const EDEN_ACCOUNT_PROFILE_COLLECTION = 'users';

/** Where the member-facing registration lives (the revived All-Star BoH form). */
export const EDEN_SIGNUP_PATH = 'vtsscore.html';

export const EDEN_ACCOUNT_LINK_STATUS = Object.freeze({
  unlinked: 'unlinked',
  found: 'found',
  ambiguous: 'ambiguous',
  unknown: 'unknown',
});

const MAX_GAME_NAME_LENGTH = 160;
const DEFAULT_MATCH_LIMIT = 6;

/**
 * The game name from a stored `accountProfile`. `displayName` is the older
 * field and `gameName` wins when both exist, mirroring
 * `js/account-profile-service.js`.
 */
export function readEdenAccountGameName(accountProfile) {
  if (!accountProfile || typeof accountProfile !== 'object') return '';
  const raw = accountProfile.gameName || accountProfile.displayName || '';
  return String(raw).normalize('NFC').replace(/\s+/gu, ' ').trim().slice(0, MAX_GAME_NAME_LENGTH);
}

/**
 * Resolves a game name to one roster player.
 *
 * `resolveOption` must be the page's `findEdenMemberOption(name)` (exact match,
 * then the scored matcher with its ambiguity margin). `resolveMatches` is the
 * suggestion list (`getPublicStatsMatches`), consulted only to tell "nobody
 * matches" apart from "several match", because those two cases deserve
 * different copy and the same fallback.
 */
export function resolveEdenAccountPlayer(input = {}) {
  const gameName = readEdenAccountGameName({ gameName: input.gameName });
  if (!gameName) {
    return Object.freeze({ status: EDEN_ACCOUNT_LINK_STATUS.unlinked, gameName: '' });
  }
  const resolveOption =
    typeof input.resolveOption === 'function' ? input.resolveOption : () => null;
  const resolveMatches =
    typeof input.resolveMatches === 'function' ? input.resolveMatches : () => [];
  const limit =
    Number.isInteger(input.limit) && input.limit > 0 ? input.limit : DEFAULT_MATCH_LIMIT;

  let option = null;
  try {
    option = resolveOption(gameName);
  } catch {
    option = null;
  }
  if (option?.playerName) {
    return Object.freeze({
      status: EDEN_ACCOUNT_LINK_STATUS.found,
      gameName,
      playerKey: String(option.playerKey || ''),
      playerName: String(option.playerName),
      candidates: Object.freeze([]),
    });
  }

  let candidates = [];
  try {
    const matches = resolveMatches(gameName, limit);
    candidates = Array.isArray(matches) ? matches : [];
  } catch {
    candidates = [];
  }
  const named = candidates
    .filter((candidate) => candidate?.playerName)
    .map((candidate) =>
      Object.freeze({
        playerKey: String(candidate.playerKey || ''),
        playerName: String(candidate.playerName),
      })
    );
  const unique = [];
  const seen = new Set();
  for (const candidate of named) {
    const key = candidate.playerKey || candidate.playerName;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(candidate);
  }
  return Object.freeze({
    // Only the page's own matcher (with its score and margin) may name the
    // member. A lone fuzzy suggestion is a guess, and prefilling someone else's
    // name on a ballot is worse than asking, so it stays a suggestion.
    status: unique.length ? EDEN_ACCOUNT_LINK_STATUS.ambiguous : EDEN_ACCOUNT_LINK_STATUS.unknown,
    gameName,
    playerKey: unique[0]?.playerKey || '',
    playerName: unique[0]?.playerName || '',
    candidates: Object.freeze(unique),
  });
}

export function isEdenAccountPlayerResolved(player) {
  return player?.status === EDEN_ACCOUNT_LINK_STATUS.found && Boolean(player.playerName);
}
