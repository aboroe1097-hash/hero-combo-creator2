import { compactPlayerIdentity, findBestMatch, resolvePlayerNameForAttack } from './ocr-shared.js';

const LEADING_GUILD_TAG_RE = /^\s*(?:\((?:vts|s)\)|(?:vts|s)\))\s*/i;
const DUAL_CREDIT_OWNER_RE = /^(.*?)\s*[{(]\s*([^{}()]+?)\s*[})]\s*$/;

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

function resolveWithExistingAliases(player, attackPlayers = []) {
  const cleanPlayer = cloneWithCleanName(player);
  const cleanAttackPlayers = Array.isArray(attackPlayers)
    ? attackPlayers.map((entry) => (entry === player ? cleanPlayer : cloneWithCleanName(entry)))
    : [];
  return (
    resolvePlayerNameForAttack(cleanPlayer, cleanAttackPlayers) ||
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
  if (/kika[\s_-]*banner/i.test(cleanText) || lowerText === 'kika') {
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
  if (/sarafin[ao]/.test(compactClean) || /sarafin[ao]/.test(compactResolved)) {
    return findBestMatch('Sarafino');
  }
  if (compactClean.includes('undead') || compactResolved.includes('undead')) {
    return 'UNDEAD';
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
      if (seenPlayerKeys.has(identity.playerKey)) continue;
      seenPlayerKeys.add(identity.playerKey);

      if (!groups.has(identity.playerKey)) {
        groups.set(identity.playerKey, {
          playerKey: identity.playerKey,
          playerName: identity.playerName,
          entries: 0,
          times: new Set(),
          records: [],
        });
      }
      const group = groups.get(identity.playerKey);
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

export { compactPlayerIdentity };
