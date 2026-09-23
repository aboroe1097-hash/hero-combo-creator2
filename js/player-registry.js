// Data-driven player identity registry.
// The admin UI can later edit this structure; the resolver can use it now.
import {
  normalizeTaughtPlayerAliases,
  protectedVtsAccountKey,
  resolveConfirmedPlayerAlias,
  setTaughtPlayerAliases,
} from './vts-player-aliases.js';

export const PLAYER_REGISTRY_KEY = 'vts_player_registry';

function asText(value) {
  return String(value || '').trim();
}

export function compactRegistryName(name) {
  const key = asText(name)
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/[^\p{L}\p{N}]+/gu, '')
    .toLowerCase();
  return protectedVtsAccountKey(name, key);
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

// Account links: a banner, alt or secondary account and the player who runs it.
// The account keeps its own identity and contribution row; the link only tells
// duty scoring whose duty it is and that it was done on a non-main account.
// `secondary` is the third class: a real second account the player plays, as
// opposed to a banner account that only carries a banner. It scores at its own
// weight, which defaults to the alt weight so the split restates nothing.
export const ACCOUNT_LINK_TYPES = Object.freeze(['banner', 'alt', 'secondary']);
// Which scoring class a link type scores at. An unknown type is normalized to
// `banner` before it gets here, and `banner` is the alt class.
export const ACCOUNT_LINK_TYPE_CLASSES = Object.freeze({
  banner: 'alt',
  alt: 'alt',
  secondary: 'secondary',
});
export const MAX_ACCOUNT_LINKS = 300;

export function accountLinkClass(type) {
  return ACCOUNT_LINK_TYPE_CLASSES[asText(type)] || ACCOUNT_LINK_TYPE_CLASSES.banner;
}

export function normalizeAccountLinks(values) {
  const byAccount = new Map();
  const ownerKeys = new Set();
  (Array.isArray(values) ? values : []).forEach((link) => {
    if (byAccount.size >= MAX_ACCOUNT_LINKS) return;
    const account = asText(link?.account).slice(0, 80);
    const owner = asText(link?.owner).slice(0, 80);
    const type = ACCOUNT_LINK_TYPES.includes(link?.type) ? link.type : 'banner';
    const key = compactRegistryName(account);
    const ownerKey = compactRegistryName(owner);
    if (!account || !owner || !key || !ownerKey || key === ownerKey) return;
    // Links stay one level deep: an owner is never itself a linked account and
    // a linked account never owns others. The first link wins, so a pair
    // pointing at each other cannot split one player into two families.
    if (byAccount.has(ownerKey) || ownerKeys.has(key)) return;
    byAccount.set(key, { account, owner, type });
    ownerKeys.add(ownerKey);
  });
  return Array.from(byAccount.values());
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

  const rawPlayers = Array.isArray(source)
    ? source
    : Array.isArray(source?.players)
      ? source.players
      : [];
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
      aliases: normalizeAliasList([
        canonical,
        ...(player?.aliases || []),
        ...accounts.map((account) => account.name),
      ]),
      accounts,
    });
  });

  return {
    version: Number(source?.version) || 1,
    updatedAt: asText(source?.updatedAt),
    players,
    contributionMatches: normalizeContributionMatches(source?.contributionMatches),
    accountLinks: normalizeAccountLinks(source?.accountLinks),
    // Aliases the admin taught from the Accounts tab. They live inside this
    // registry — the same map that already carries accountLinks — so they save
    // and publish with it and need no rules change of their own.
    playerAliases: normalizeTaughtPlayerAliases(source?.playerAliases),
  };
}

// vts-player-aliases.js owns alias resolution; this module owns the registry the
// taught aliases live in. Publishing them there whenever a registry becomes the
// one in force keeps that authority single: findBestMatch, the contribution
// identity and the vote candidates all ask the same function, in the same order.
//
// Keyed on the taught list's own content rather than on the registry object,
// because normalizing a registry builds a fresh object every time; only a real
// change may republish, or every name lookup would rebuild the alias map.
let publishedTaughtSignature = null;

function publishTaughtAliases(registry) {
  const aliases = Array.isArray(registry?.playerAliases) ? registry.playerAliases : [];
  const signature = aliases.map((entry) => `${entry.alias}\u0000${entry.canonical}`).join('\u0001');
  if (signature === publishedTaughtSignature) return;
  publishedTaughtSignature = signature;
  setTaughtPlayerAliases(aliases);
}

// Name resolution asks for the index once per name, so rebuilding it every
// time made each lookup linear in the registry. Cache by input identity.
const registryIndexCache = new WeakMap();

export function buildPlayerRegistryIndex(registryInput) {
  if (registryInput && typeof registryInput === 'object') {
    const cached = registryIndexCache.get(registryInput);
    if (cached) return cached;
    const built = buildPlayerRegistryIndexUncached(registryInput);
    registryIndexCache.set(registryInput, built);
    return built;
  }
  return buildPlayerRegistryIndexUncached(registryInput);
}

function buildPlayerRegistryIndexUncached(registryInput) {
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
        // Keep saved family rules reachable after a confirmed display rename,
        // without rewriting the registry or merging account identities.
        const confirmed = resolveConfirmedPlayerAlias(alias);
        if (confirmed) {
          familyExact.set(confirmed, familyKey);
          familyExact.set(confirmed.toLowerCase(), familyKey);
          const confirmedKey = compactRegistryName(confirmed);
          if (!familyCompact.has(confirmedKey)) familyCompact.set(confirmedKey, familyKey);
        }
      }
    });
  });

  return { registry, exact, compact, familyExact, familyCompact };
}

export function resolvePlayerRegistryAlias(name, registryInput = currentPlayerRegistry()) {
  const text = asText(name);
  if (!text) return '';
  // A taught alias resolves here first, even over a built-in group, because
  // resolveConfirmedPlayerAlias consults the taught list before its own.
  const confirmed = resolveConfirmedPlayerAlias(text);
  if (confirmed) return confirmed;
  const index = buildPlayerRegistryIndex(registryInput);
  const resolved =
    index.exact.get(text) ||
    index.exact.get(text.toLowerCase()) ||
    index.compact.get(compactRegistryName(text)) ||
    '';
  return resolveConfirmedPlayerAlias(resolved) || resolved;
}

export function resolvePlayerRegistryFamilyKey(name, registryInput = currentPlayerRegistry()) {
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

// Pages that score published data (the public Eden page) hand the registry
// that came with that data to the resolvers, instead of whatever this browser
// last cached from the admin. Null restores the stored registry.
let activeRegistryOverride = null;

export function setActivePlayerRegistry(registry) {
  activeRegistryOverride = registry ? normalizePlayerRegistry(registry) : null;
  publishTaughtAliases(activeRegistryOverride || currentPlayerRegistry());
  return activeRegistryOverride;
}

let storedRegistryCache = { raw: undefined, registry: null };

export function currentPlayerRegistry(storage = globalThis.localStorage) {
  if (activeRegistryOverride) return activeRegistryOverride;
  let raw = null;
  try {
    raw = storage?.getItem ? storage.getItem(PLAYER_REGISTRY_KEY) : null;
  } catch {
    raw = null;
  }
  if (storedRegistryCache.raw !== raw || !storedRegistryCache.registry) {
    storedRegistryCache = { raw, registry: normalizePlayerRegistry(raw) };
  }
  publishTaughtAliases(storedRegistryCache.registry);
  return storedRegistryCache.registry;
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
  publishTaughtAliases(normalized);
  return normalized;
}

// Reading the registry once at module load closes the cold-start window: without
// it, the first name lookup of a page could resolve before any registry existed
// and would miss the taught entries, letting a confirmed group win by default.
// The read itself is a cached localStorage lookup.
currentPlayerRegistry();
