// Data-driven player identity registry.
// The admin UI can later edit this structure; the resolver can use it now.

export const PLAYER_REGISTRY_KEY = 'vts_player_registry';

function asText(value) {
  return String(value || '').trim();
}

export function compactRegistryName(name) {
  return asText(name)
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/[^\p{L}\p{N}]+/gu, '')
    .toLowerCase();
}

function normalizeAliasList(values) {
  const aliases = [];
  const seen = new Set();
  (Array.isArray(values) ? values : [values]).forEach((value) => {
    const text = asText(value);
    if (!text) return;
    const key = compactRegistryName(text) || text.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    aliases.push(text);
  });
  return aliases;
}

function normalizeAccountList(values) {
  return (Array.isArray(values) ? values : [])
    .map((account) => {
      if (typeof account === 'string') return { name: asText(account), type: 'account' };
      return {
        name: asText(account?.name),
        type: asText(account?.type) || 'account',
      };
    })
    .filter((account) => account.name);
}

function normalizeContributionMatches(values) {
  const byNewName = new Map();
  (Array.isArray(values) ? values : []).forEach((match) => {
    const canonical = asText(match?.canonical || match?.oldName);
    const oldName = asText(match?.oldName || canonical);
    const newName = asText(match?.newName);
    const newKey = compactRegistryName(newName);
    if (!canonical || !oldName || !newKey) return;
    byNewName.set(newKey, {
      canonical,
      oldName,
      newName,
      createdAt: asText(match?.createdAt),
    });
  });
  return Array.from(byNewName.values());
}

export function normalizePlayerRegistry(input) {
  let source = input;
  if (typeof input === 'string') {
    try {
      source = JSON.parse(input);
    } catch {
      source = null;
    }
  }

  const rawPlayers = Array.isArray(source) ? source : Array.isArray(source?.players) ? source.players : [];
  const players = [];
  const seenCanonical = new Set();

  rawPlayers.forEach((player) => {
    const canonical = asText(player?.canonical || player?.name || player?.displayName);
    if (!canonical) return;
    const canonicalKey = compactRegistryName(canonical) || canonical.toLowerCase();
    if (seenCanonical.has(canonicalKey)) return;
    seenCanonical.add(canonicalKey);

    const accounts = normalizeAccountList(player?.accounts);
    players.push({
      id: asText(player?.id) || canonicalKey,
      canonical,
      family: asText(player?.family || player?.familyId || player?.group),
      aliases: normalizeAliasList([canonical, ...(player?.aliases || []), ...accounts.map((account) => account.name)]),
      accounts,
    });
  });

  return {
    version: Number(source?.version) || 1,
    updatedAt: asText(source?.updatedAt),
    players,
    contributionMatches: normalizeContributionMatches(source?.contributionMatches),
  };
}

export function buildPlayerRegistryIndex(registryInput) {
  const registry = normalizePlayerRegistry(registryInput);
  const exact = new Map();
  const compact = new Map();
  const familyExact = new Map();
  const familyCompact = new Map();

  registry.players.forEach((player) => {
    const familyKey = compactRegistryName(player.family);
    player.aliases.forEach((alias) => {
      exact.set(alias, player.canonical);
      exact.set(alias.toLowerCase(), player.canonical);
      const key = compactRegistryName(alias);
      if (key && !compact.has(key)) compact.set(key, player.canonical);
      if (familyKey) {
        familyExact.set(alias, familyKey);
        familyExact.set(alias.toLowerCase(), familyKey);
        if (key && !familyCompact.has(key)) familyCompact.set(key, familyKey);
      }
    });
  });

  return { registry, exact, compact, familyExact, familyCompact };
}

export function resolvePlayerRegistryAlias(name, registryInput = readStoredPlayerRegistry()) {
  const text = asText(name);
  if (!text) return '';
  const index = buildPlayerRegistryIndex(registryInput);
  return (
    index.exact.get(text) ||
    index.exact.get(text.toLowerCase()) ||
    index.compact.get(compactRegistryName(text)) ||
    ''
  );
}

export function resolvePlayerRegistryFamilyKey(name, registryInput = readStoredPlayerRegistry()) {
  const text = asText(name);
  if (!text) return '';
  const index = buildPlayerRegistryIndex(registryInput);
  return (
    index.familyExact.get(text) ||
    index.familyExact.get(text.toLowerCase()) ||
    index.familyCompact.get(compactRegistryName(text)) ||
    ''
  );
}

export function readStoredPlayerRegistry(storage = globalThis.localStorage) {
  if (!storage?.getItem) return normalizePlayerRegistry(null);
  try {
    return normalizePlayerRegistry(storage.getItem(PLAYER_REGISTRY_KEY));
  } catch {
    return normalizePlayerRegistry(null);
  }
}

export function writeStoredPlayerRegistry(registry, storage = globalThis.localStorage) {
  const normalized = normalizePlayerRegistry(registry);
  if (storage?.setItem) {
    storage.setItem(PLAYER_REGISTRY_KEY, JSON.stringify(normalized));
  }
  return normalized;
}
