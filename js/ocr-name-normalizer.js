import { compactPlayerIdentity, findBestMatch, resolvePlayerNameForAttack } from './ocr-shared.js';

const LEADING_GUILD_TAG_RE = /^\s*(?:\((?:vts|s)\)|(?:vts|s)\))\s*/i;
const DUAL_CREDIT_OWNER_RE = /^(.*?)\s*[{(]\s*([^{}()]+?)\s*[})]\s*$/;
const KIKA_ALT_MARKER_RE = /[\u0f3a\u0f3b\u226a\u226b]/u;
const KIKA_ALT_IDENTITY_KEY = 'kikaalt';

function readName(input) {
  if (typeof input === 'string') return input;
  return input?.playerName || input?.display_player_name || input?.displayName || input?.name || '';
}

function cloneWithCleanName(player) {
  if (typeof player === 'string') return { name: stripGuildTagsFromPlayerName(player) };
  return { ...player, name: stripGuildTagsFromPlayerName(readName(player)) };
}

function cloneWithDisplayName(player, displayName) {
  if (typeof player === 'string') return displayName;
  return { ...player, name: displayName };
}

const cleanedAttackPlayerCache = new WeakMap();

function attackPlayerListSignature(players) {
  return players
    .map((entry, index) => {
      const name = readName(entry);
      const value = entry?.value ?? entry?.val ?? '';
      const rank = entry?.rank ?? index + 1;
      return `${name}\u001f${value}\u001f${rank}`;
    })
    .join('\u001e');
}

function cleanedAttackPlayerContext(attackPlayers) {
  if (!Array.isArray(attackPlayers) || !attackPlayers.length) {
    return { players: [], byOriginal: new Map() };
  }
  const signature = attackPlayerListSignature(attackPlayers);
  const cached = cleanedAttackPlayerCache.get(attackPlayers);
  if (cached?.signature === signature) return cached;

  const byOriginal = new Map();
  const players = attackPlayers.map((entry) => {
    const cleaned = cloneWithCleanName(entry);
    byOriginal.set(entry, cleaned);
    return cleaned;
  });
  const context = { signature, players, byOriginal };
  cleanedAttackPlayerCache.set(attackPlayers, context);
  return context;
}

function resolveWithExistingAliases(player, attackPlayers = []) {
  const attackContext = cleanedAttackPlayerContext(attackPlayers);
  const fallbackIndex = Array.isArray(attackPlayers)
    ? attackPlayers.findIndex(
        (entry, index) =>
          entry === player ||
          (readName(entry) === readName(player) &&
            (entry?.value ?? entry?.val ?? '') === (player?.value ?? player?.val ?? '') &&
            (entry?.rank ?? index + 1) === (player?.rank ?? index + 1))
      )
    : -1;
  const cleanPlayer =
    attackContext.byOriginal.get(player) ||
    attackContext.players[fallbackIndex] ||
    cloneWithCleanName(player);
  return (
    resolvePlayerNameForAttack(cleanPlayer, attackContext.players) ||
    findBestMatch(cleanPlayer.name) ||
    cleanPlayer.name
  );
}

function resolveSupplementalSpecialListCluster(cleanedName, existingResolvedName) {
  const cleanText = String(cleanedName || '').trim();
  const lowerText = cleanText.toLowerCase();
  const compactClean = compactPlayerIdentity(cleanText);
  const compactResolved = compactPlayerIdentity(existingResolvedName);

  if (/kika[\s_-]*banner\s*2/i.test(cleanText) || compactClean === 'kikabanner2') {
    return findBestMatch('Kika-banner2');
  }
  if (/kika[\s_-]*banner/i.test(cleanText)) {
    return findBestMatch('Kika-banner');
  }
  if (lowerText === 'kika') {
    return findBestMatch('Kika');
  }
  if (
    /^(?:dr\.?\s*)?zubbs\??$/i.test(cleanText) ||
    compactClean === 'zubbs' ||
    compactClean === 'drzubbs' ||
    compactResolved === 'zubbs' ||
    compactResolved === 'drzubbs'
  ) {
    return 'Zubbs';
  }
  if (
    compactClean === 'angel' ||
    compactClean === 'angelbanner' ||
    compactClean === 'angelv2' ||
    compactResolved === 'angel'
  ) {
    return 'ANGEL';
  }
  if (/sarafina/.test(compactClean) || /sarafina/.test(compactResolved)) {
    return findBestMatch('Sarafina');
  }
  if (/sarafino/.test(compactClean) || /sarafino/.test(compactResolved)) {
    return findBestMatch('Sarafino');
  }
  if (compactClean === 'undeadbanner' || compactResolved === 'undeadbanner') {
    return 'Undead_Banner';
  }
  if (compactClean.includes('undead') || compactResolved.includes('undead')) {
    return 'UNDEAD';
  }
  if (compactClean === 'redbullbanner' || compactResolved === 'redbullbanner') {
    return 'RedBull_Banner';
  }

  return existingResolvedName;
}

export function stripGuildTagsFromPlayerName(name) {
  let cleaned = String(name || '').trim();
  let previous = '';
  while (cleaned && cleaned !== previous) {
    previous = cleaned;
    cleaned = cleaned.replace(LEADING_GUILD_TAG_RE, '').trim();
  }
  return cleaned;
}

// Ex-guild rosters carry the source guild's tag, e.g. "(BIG)Name", "(Pic)Name",
// "(V3S)Name". Strip a leading parenthesised guild tag, then any (vts)/(s) tag.
const EX_GUILD_TAG_RE = /^\s*\([^)]{1,16}\)\s*/;
export function stripExGuildGuildTag(name) {
  const once = String(name || '')
    .replace(EX_GUILD_TAG_RE, '')
    .trim();
  return stripGuildTagsFromPlayerName(once);
}

export function expandDualCreditPlayerNames(player) {
  const displayName = stripGuildTagsFromPlayerName(readName(player));
  if (!displayName) return [];

  const match = displayName.match(DUAL_CREDIT_OWNER_RE);
  if (!match) return [displayName];

  const operatorName = stripGuildTagsFromPlayerName(match[1]).trim();
  const ownerName = stripGuildTagsFromPlayerName(match[2]).trim();
  return [operatorName, ownerName].filter(Boolean);
}

export function resolveCanonicalPlayerName(player, options = {}) {
  const displayName = stripGuildTagsFromPlayerName(readName(player));
  if (!displayName) return '';
  const existingResolved = resolveWithExistingAliases(
    typeof player === 'string' ? displayName : { ...player, name: displayName },
    options.attackPlayers
  );
  return resolveSupplementalSpecialListCluster(displayName, existingResolved);
}

export function resolveCanonicalPlayerIdentity(player, options = {}) {
  const displayName = stripGuildTagsFromPlayerName(readName(player));
  const resolvedName = resolveCanonicalPlayerName(player, options);
  const playerKey = compactPlayerIdentity(resolvedName);
  if (!displayName || !resolvedName || !playerKey) {
    throw new Error('Player name is required');
  }
  return {
    rawName: readName(player),
    displayName,
    playerName: resolvedName,
    playerKey,
  };
}

export function getSpecialAccountIdentityKey(name, fallbackKey = '') {
  const displayName = String(name || '')
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .trim();
  const compactKey = compactPlayerIdentity(displayName);
  if (compactKey === 'kika' && KIKA_ALT_MARKER_RE.test(displayName)) {
    return KIKA_ALT_IDENTITY_KEY;
  }
  return fallbackKey || compactKey;
}

export function summarizeCanonicalPlayerRecords(records = [], options = {}) {
  const timeField = options.timeField || 'time';
  const groups = new Map();

  (Array.isArray(records) ? records : []).forEach((record) => {
    const creditedNames = expandDualCreditPlayerNames(record);
    const seenPlayerKeys = new Set();

    for (const creditedName of creditedNames) {
      let identity;
      try {
        identity = resolveCanonicalPlayerIdentity(
          cloneWithDisplayName(record, creditedName),
          options
        );
      } catch {
        continue;
      }
      const playerKey = options.preserveSpecialAccounts
        ? getSpecialAccountIdentityKey(identity.playerName, identity.playerKey)
        : identity.playerKey;
      if (seenPlayerKeys.has(playerKey)) continue;
      seenPlayerKeys.add(playerKey);

      if (!groups.has(playerKey)) {
        groups.set(playerKey, {
          playerKey,
          playerName: identity.playerName,
          entries: 0,
          times: new Set(),
          records: [],
        });
      }
      const group = groups.get(playerKey);
      group.entries += 1;
      const time = String(
        record?.[timeField] || record?.usageTime || record?.orderTime || ''
      ).trim();
      if (time) group.times.add(time);
      group.records.push(record);
    }
  });

  return [...groups.values()]
    .map((group) => ({
      ...group,
      times: [...group.times].sort(),
    }))
    .sort((a, b) => b.entries - a.entries || a.playerName.localeCompare(b.playerName));
}

export function canonicalizePlayerOptionNames(players = []) {
  const seen = new Set();
  const options = [];

  (Array.isArray(players) ? players : []).forEach((player) => {
    const displayName = stripGuildTagsFromPlayerName(readName(player));
    if (!displayName) return;
    const playerName = resolveCanonicalPlayerName(displayName) || displayName;
    const playerKey = compactPlayerIdentity(playerName);
    if (!playerKey || seen.has(playerKey)) return;
    seen.add(playerKey);
    options.push(playerName);
  });

  return options;
}

export { compactPlayerIdentity };
