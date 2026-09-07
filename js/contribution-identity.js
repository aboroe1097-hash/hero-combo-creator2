import {
  compactRegistryName,
  normalizePlayerRegistry,
  resolvePlayerRegistryAlias,
} from './player-registry.js';
import { resolveConfirmedPlayerAlias } from './vts-player-aliases.js';

function cleanText(value) {
  return String(value || '')
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeContributionMemberName(value) {
  const name = String(value || '').replace(/,+$/u, '').trim();
  return resolveConfirmedPlayerAlias(name) || cleanText(name);
}

function contributionNumber(value) {
  const parsed = Number(String(value ?? '').replace(/[^\d.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function cleanOcrPlayerName(value) {
  let name = cleanText(value);
  let previous = '';
  while (name && name !== previous) {
    previous = name;
    name = name.replace(/^\s*(?:\((?:vts|s)\)|(?:vts|s)\))\s*/i, '').trim();
  }
  return name;
}

function ocrNameQuality(value) {
  const clean = cleanOcrPlayerName(value);
  return compactRegistryName(clean).length * 10 + clean.length;
}

/**
 * Overlapping leaderboard screenshots can return one row several times with
 * clipped name fragments. Rank + contribution + guild is the stable OCR
 * fingerprint, so retain only the most complete detected name.
 */
export function collapseContributionOcrDuplicates(entriesInput) {
  const entries = Array.isArray(entriesInput) ? entriesInput : [];
  const grouped = new Map();
  const ungrouped = [];

  entries.forEach((entry) => {
    const rank = contributionNumber(entry?.rank);
    const contribution = contributionNumber(
      entry?.contribution ?? entry?.value ?? entry?.points ?? entry?.total ?? entry?.score
    );
    if (!rank || !contribution) {
      ungrouped.push(entry);
      return;
    }

    const key = `${rank}|${contribution}|${compactRegistryName(entry?.guild)}`;
    const current = grouped.get(key);
    if (!current) {
      grouped.set(key, entry);
      return;
    }

    const preferred = ocrNameQuality(entry?.name) > ocrNameQuality(current?.name) ? entry : current;
    const fallback = preferred === entry ? current : entry;
    grouped.set(key, {
      ...fallback,
      ...preferred,
      position: preferred?.position || fallback?.position || '',
      rewardOverride: preferred?.rewardOverride || fallback?.rewardOverride || '',
    });
  });

  return [...grouped.values(), ...ungrouped];
}

function aliasOwner(registry, name) {
  const key = compactRegistryName(name);
  if (!key) return null;
  return (
    registry.players.find((player) =>
      [player.canonical, ...(player.aliases || [])].some(
        (candidate) => compactRegistryName(candidate) === key
      )
    ) || null
  );
}

export function getContributionSnapshotIdentity(entry, registryInput, options = {}) {
  const registry = normalizePlayerRegistry(registryInput);
  const rawName = normalizeContributionMemberName(entry?.name);
  const canonicalName = resolvePlayerRegistryAlias(rawName, registry) || rawName;
  const nameKey = compactRegistryName(canonicalName);
  const guildKey = compactRegistryName(entry?.guild || options.defaultGuild);
  return nameKey || guildKey ? `${nameKey}|${guildKey}` : '|';
}

export function getContributionCanonicalName(nameInput, registryInput) {
  const registry = normalizePlayerRegistry(registryInput);
  const name = cleanText(nameInput);
  return resolveConfirmedPlayerAlias(nameInput) || resolvePlayerRegistryAlias(name, registry) || name;
}

export function addContributionAliasMatch(registryInput, oldNameInput, newNameInput) {
  const registry = normalizePlayerRegistry(registryInput);
  const oldName = cleanText(oldNameInput);
  const newName = cleanText(newNameInput);
  const oldKey = compactRegistryName(oldName);
  const newKey = compactRegistryName(newName);

  if (!oldKey || !newKey) throw new Error('Both contribution names are required.');
  if (oldKey === newKey) return registry;

  const oldOwner = aliasOwner(registry, oldName);
  const newOwner = aliasOwner(registry, newName);
  if (newOwner && (!oldOwner || newOwner.id !== oldOwner.id)) {
    throw new Error('The new contribution name already belongs to another player identity.');
  }

  if (oldOwner) {
    oldOwner.aliases = [...(oldOwner.aliases || []), newName];
  } else {
    registry.players.push({
      id: oldKey,
      canonical: oldName,
      family: '',
      aliases: [oldName, newName],
      accounts: [],
    });
  }

  const canonical = oldOwner?.canonical || oldName;
  registry.contributionMatches = [
    ...(registry.contributionMatches || []).filter(
      (match) => compactRegistryName(match.newName) !== newKey
    ),
    {
      canonical,
      oldName,
      newName,
      createdAt: new Date().toISOString(),
    },
  ];

  return normalizePlayerRegistry(registry);
}

export function getContributionAliasMatch(registryInput, newNameInput) {
  const registry = normalizePlayerRegistry(registryInput);
  const newKey = compactRegistryName(newNameInput);
  return (
    registry.contributionMatches.find((match) => compactRegistryName(match.newName) === newKey) ||
    null
  );
}

export function removeContributionAliasMatch(registryInput, newNameInput) {
  const registry = normalizePlayerRegistry(registryInput);
  const newKey = compactRegistryName(newNameInput);
  const match = getContributionAliasMatch(registry, newNameInput);
  if (!match || !newKey) return registry;

  registry.contributionMatches = registry.contributionMatches.filter(
    (candidate) => compactRegistryName(candidate.newName) !== newKey
  );
  const stillReferenced = registry.contributionMatches.some(
    (candidate) => compactRegistryName(candidate.newName) === newKey
  );
  registry.players.forEach((player) => {
    const isCanonical = compactRegistryName(player.canonical) === newKey;
    const isAccount = (player.accounts || []).some(
      (account) => compactRegistryName(account.name) === newKey
    );
    if (stillReferenced || isCanonical || isAccount) return;
    player.aliases = (player.aliases || []).filter(
      (alias) => compactRegistryName(alias) !== newKey
    );
  });
  return normalizePlayerRegistry(registry);
}
