import { mergeSeededR5Adjustments, normalizeR5Adjustment } from './ocr-adjustments.js';
import { compactPlayerIdentity, expandDutyRawNames, getDutyCreditedNames } from './ocr-shared.js';
import {
  getSpecialAccountIdentityKey,
  resolveCanonicalPlayerIdentity,
  stripExGuildGuildTag,
} from './ocr-name-normalizer.js';
import { resolvePlayerRegistryFamilyKey } from './player-registry.js';
import { collapseContributionOcrDuplicates } from './contribution-identity.js';
import { getPublicVtsPlayerProfile } from './vts-public-players.js';

export const WEIGHTED_CONTRIBUTION_WEIGHTS = Object.freeze({
  contribution: 0.5,
  demolition: 0.05,
  pathers: 0.15,
  banners: 0.15,
  shieldWalls: 0.15,
  conduct: 0.05,
});

export const EDEN_X1_CONTRIBUTION_RANKING_MODES = Object.freeze({
  EXTENDED: 'extended',
  DEFAULT: 'default',
});

export const DEFAULT_WEIGHTED_CONTRIBUTION_PREMIUM_CUTOFF = 20;
const CONTRIBUTION_FIELDS = ['contribution', 'value', 'points', 'total', 'score'];
const IMAGE_SOURCE_NOTE_RE =
  /(?:whatsapp\s+image|screenshot|screen\s*shot|\.jpe?g\b|\.png\b|\.webp\b|\.heic\b|\.gif\b|[a-z]:[\\/])/i;

function numberValue(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const parsed = Number(String(value || '').replace(/[^\d.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function normalizeEdenX1ContributionRankingMode(value) {
  return value === EDEN_X1_CONTRIBUTION_RANKING_MODES.DEFAULT
    ? EDEN_X1_CONTRIBUTION_RANKING_MODES.DEFAULT
    : EDEN_X1_CONTRIBUTION_RANKING_MODES.EXTENDED;
}

export function getEdenX1ContributionRankingScore(
  row,
  mode = EDEN_X1_CONTRIBUTION_RANKING_MODES.EXTENDED
) {
  if (normalizeEdenX1ContributionRankingMode(mode) === EDEN_X1_CONTRIBUTION_RANKING_MODES.DEFAULT) {
    return numberValue(
      row?.contributionRewardScore ??
        numberValue(row?.contributionScore) + numberValue(row?.contributionExGuild)
    );
  }
  return numberValue(row?.weightedScore);
}

export function compareEdenX1ContributionRankingRows(
  a,
  b,
  mode = EDEN_X1_CONTRIBUTION_RANKING_MODES.EXTENDED
) {
  return (
    getEdenX1ContributionRankingScore(b, mode) - getEdenX1ContributionRankingScore(a, mode) ||
    numberValue(b?.contributionRewardScore) - numberValue(a?.contributionRewardScore) ||
    numberValue(b?.contributionScore) - numberValue(a?.contributionScore) ||
    numberValue(a?.currentRank || 999999) - numberValue(b?.currentRank || 999999) ||
    String(a?.playerName || '').localeCompare(String(b?.playerName || ''))
  );
}

function contributionValue(entry) {
  for (const field of CONTRIBUTION_FIELDS) {
    if (entry?.[field] === undefined || entry?.[field] === null) continue;
    const value = numberValue(entry[field]);
    if (value) return value;
  }
  return 0;
}

function normalizeRewardTier(value) {
  const tier = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '-');
  if (tier === 'guild-master' || tier === 'guildmaster' || tier === 'gm') return 'guild_master';
  if (tier === 'core' || tier === 'core-rewards') return 'core';
  if (tier === 'power-house' || tier === 'powerhouse' || tier === 'ph') return 'power_house';
  if (tier === 'members' || tier === 'member' || tier === 'members-rewards') return 'members';
  if (tier === 'premium' || tier === 'top' || tier === 'top-premium') return 'premium';
  if (tier === 'standard' || tier === 'normal') return 'standard';
  if (tier === 'review' || tier === 'manual') return 'review';
  if (tier === 'none' || tier === 'no-reward' || tier === 'skip') return 'none';
  return '';
}

export function getContributionPremiumCutoff(record) {
  const cutoff = numberValue(record?.premiumCutoff ?? record?.premiumSlots);
  return cutoff > 0 ? cutoff : DEFAULT_WEIGHTED_CONTRIBUTION_PREMIUM_CUTOFF;
}

export function getContributionRewardTier(entry, record, rankOverride = null) {
  const override = normalizeRewardTier(entry?.rewardOverride || entry?.reward);
  if (override) return override;
  const rank = numberValue(rankOverride ?? entry?.rank);
  if (rank < 1) return 'standard';
  if (rank <= 20) return 'core';
  if (rank <= 110) return 'power_house';
  if (rank <= 200) return 'members';
  return 'standard';
}

export function getLatestContributionRecord(records = []) {
  return (Array.isArray(records) ? records : []).slice().sort((a, b) => {
    const dateCmp = String(b?.date || '').localeCompare(String(a?.date || ''));
    if (dateCmp) return dateCmp;
    return String(b?.updatedAt || b?.createdAt || '').localeCompare(
      String(a?.updatedAt || a?.createdAt || '')
    );
  })[0];
}

export function getPrimaryContributionRecord(records = []) {
  const arr = Array.isArray(records) ? records : [];
  const primary = arr.find((r) => r.isPrimary === true);
  return primary || getLatestContributionRecord(arr);
}

export function isImageSourceContributionNote(note) {
  return IMAGE_SOURCE_NOTE_RE.test(String(note || ''));
}

export function getWeightedContributionRecordLabel(
  record,
  fallback = 'Latest contribution snapshot'
) {
  const date = String(record?.date || '').trim();
  const note = String(record?.note || '').trim();
  const visibleNote = note && !isImageSourceContributionNote(note) ? note : '';
  return [date, visibleNote].filter(Boolean).join(' - ') || fallback;
}

function resolvePlayerIdentity(player) {
  try {
    return resolveCanonicalPlayerIdentity(player);
  } catch {
    const name = String(player?.playerName || player?.name || player || '').trim();
    const playerKey = compactPlayerIdentity(name);
    return playerKey ? { playerKey, playerName: name } : null;
  }
}

function weightedPlayerKeyForName(name) {
  const displayName = String(name || '')
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .trim();
  return getSpecialAccountIdentityKey(displayName, compactPlayerIdentity(displayName));
}

function cleanWeightedPlayerName(value) {
  return String(value || '')
    .replace(/"\s*,\s*$/u, '')
    .trim();
}

function resolveWeightedPlayerIdentity(player) {
  const sourceName =
    typeof player === 'string'
      ? stripExGuildGuildTag(cleanWeightedPlayerName(player))
      : {
          ...player,
          name: stripExGuildGuildTag(
            cleanWeightedPlayerName(
              player?.playerName ||
                player?.display_player_name ||
                player?.displayName ||
                player?.name
            )
          ),
        };
  const identity = resolvePlayerIdentity(sourceName);
  if (!identity) return null;
  const playerKey = weightedPlayerKeyForName(
    identity.playerName || identity.displayName || identity.rawName
  );
  return playerKey ? { ...identity, playerKey } : null;
}

function dutyBucket(type) {
  if (type === 'pather' || type === 'speed_tile') return 'pathers';
  if (type === 'banner') return 'banners';
  if (type === 'shield_wall') return 'shieldWalls';
  return '';
}

function emptyDutyCounts() {
  return { shieldWalls: 0, pathers: 0, banners: 0 };
}

const PRIMARY_FAMILY_ACCOUNT_KEYS = Object.freeze({
  kika: 'kikaalt',
  redbull: 'redbulls',
  undead: 'undead',
});

// Group a player's multiple accounts (main / secondary / banner) into one family
// so their duty + conduct can be consolidated onto a single main account.
// Single-account players are their own family.
function playerFamilyKey(accountKey) {
  const sourceKey = String(accountKey || '');
  const registryFamily = resolvePlayerRegistryFamilyKey(sourceKey);
  if (registryFamily) return registryFamily;
  const publicProfile = getPublicVtsPlayerProfile(sourceKey);
  const key = compactPlayerIdentity(publicProfile?.name) || sourceKey;
  if (/^kika(?:alt|banner2?)?$/.test(key)) return 'kika';
  if (key === 'goodness' || key === 'goodnesgraycious') return 'goodnesgraycious';
  if (key === 'redbull' || key === 'redbulls' || key === 'redbullbanner') return 'redbull';
  if (key === 'undead' || key === 'undeadbanner') return 'undead';
  if (/^sarafin[ao]$/.test(key)) return 'sarafino';
  if (/^maximus+(?:banner)?$/.test(key)) return 'maximus';
  if (key === 'qimmortal' || key === 'qimmortalis') return 'qimmortal';
  return key;
}

export function getWeightedPlayerFamilyKey(accountKey) {
  return playerFamilyKey(accountKey);
}

export function dedupeWeightedRowsByFamily(rows = [], options = {}) {
  const seenFamilies = new Set(
    Array.from(options.reservedFamilyKeys || [], (key) => playerFamilyKey(key)).filter(Boolean)
  );
  return (Array.isArray(rows) ? rows : []).filter((row) => {
    const familyKey = row?.familyKey || playerFamilyKey(row?.playerKey);
    if (!familyKey || seenFamilies.has(familyKey)) return false;
    seenFamilies.add(familyKey);
    return true;
  });
}

export function normalizeWeightedR5Adjustments(adjustments = [], season = '') {
  const seasonKey = String(season || '').trim();
  const normalized = [];

  mergeSeededR5Adjustments(adjustments, seasonKey).forEach((entry) => {
    let adjustment;
    try {
      adjustment = normalizeR5Adjustment(entry, { season: entry?.season || seasonKey });
    } catch {
      return;
    }
    if (seasonKey && String(adjustment.season || '').trim() !== seasonKey) return;

    const identity = resolveWeightedPlayerIdentity(adjustment.playerName || adjustment.playerKey);
    const playerKey = identity?.playerKey;
    if (!playerKey) return;
    const familyKey = playerFamilyKey(playerKey);
    normalized.push({
      ...adjustment,
      playerKey,
      playerFamilyKey: familyKey,
    });
  });

  return normalized;
}

export function sanitizePublicR5Adjustments(adjustments = [], season = '') {
  const publicMeritCategories = new Set([
    'banner_help',
    'connected_road',
    'extra_effort',
    'merit_other',
    'grant_premium',
    'forfeit_premium',
  ]);
  return normalizeWeightedR5Adjustments(adjustments, season).map((adjustment) => ({
    season: adjustment.season,
    playerKey: adjustment.playerKey,
    playerName: adjustment.playerName,
    points: adjustment.points,
    category:
      adjustment.category === 'grant_premium' || adjustment.category === 'forfeit_premium'
        ? adjustment.category
        : publicMeritCategories.has(adjustment.category)
          ? adjustment.category
          : adjustment.points < 0
            ? 'penalty_other'
            : 'merit_other',
  }));
}

function isPreferredFamilyAccount(row, familyKey) {
  const preferredKey = PRIMARY_FAMILY_ACCOUNT_KEYS[familyKey];
  return Boolean(preferredKey && row?.playerKey === preferredKey);
}

// Lower positive rank wins; a missing/zero rank is always worst.
function isBetterContributionRank(rank, currentBest) {
  const a = Number(rank);
  const b = Number(currentBest);
  const aValid = Number.isFinite(a) && a > 0;
  const bValid = Number.isFinite(b) && b > 0;
  if (aValid && bValid) return a < b;
  return aValid && !bValid;
}

export function buildWeightedDutyCounts(dutyRecords = []) {
  const counts = new Map();

  (Array.isArray(dutyRecords) ? dutyRecords : []).forEach((record) => {
    const bucket = dutyBucket(record?.type);
    if (!bucket) return;

    (Array.isArray(record.entries) ? record.entries : []).forEach((entry) => {
      const raw = entry?.name || entry?.original || '';
      const creditedNames = entry?.confirmed
        ? getDutyCreditedNames(raw, entry.confirmed)
        : expandDutyRawNames(raw);
      const seen = new Set();

      creditedNames.forEach((name) => {
        const identity = resolveWeightedPlayerIdentity(name);
        if (!identity || seen.has(identity.playerKey)) return;
        seen.add(identity.playerKey);
        const row = counts.get(identity.playerKey) || {
          playerKey: identity.playerKey,
          playerName: identity.playerName,
          ...emptyDutyCounts(),
        };
        row[bucket] += 1;
        counts.set(identity.playerKey, row);
      });
    });
  });

  return counts;
}

function buildConductMap(adjustments = [], season = '') {
  const totals = new Map();

  normalizeWeightedR5Adjustments(adjustments, season).forEach((adjustment) => {
    totals.set(adjustment.playerKey, (totals.get(adjustment.playerKey) || 0) + adjustment.points);
  });

  return totals;
}

function buildForfeitFamilySet(adjustments = [], season = '') {
  const forfeit = new Set();
  normalizeWeightedR5Adjustments(adjustments, season).forEach((entry) => {
    if (entry?.category !== 'forfeit_premium') return;
    forfeit.add(entry.playerFamilyKey || playerFamilyKey(entry.playerKey));
  });
  return forfeit;
}

function buildGrantPremiumFamilySet(adjustments = [], season = '') {
  const grants = new Set();
  normalizeWeightedR5Adjustments(adjustments, season).forEach((entry) => {
    if (entry?.category !== 'grant_premium') return;
    grants.add(entry.playerFamilyKey || playerFamilyKey(entry.playerKey));
  });
  return grants;
}

function buildExGuildMap(exGuildContributions = []) {
  const map = new Map();
  (Array.isArray(exGuildContributions) ? exGuildContributions : []).forEach((entry) => {
    // Prefer a manual match; otherwise resolve the ex-guild name with its source
    // guild tag (e.g. "(BIG)") stripped so it can line up with a roster player.
    const source = entry?.matchedName || entry?.playerName || entry;
    const identity = resolveWeightedPlayerIdentity(stripExGuildGuildTag(source));
    if (!identity) return;
    const value = contributionValue(entry);
    if (!value) return;
    map.set(identity.playerKey, (map.get(identity.playerKey) || 0) + value);
  });
  return map;
}

function buildExGuildBreakdownMap(exGuildContributions = []) {
  const map = new Map();
  (Array.isArray(exGuildContributions) ? exGuildContributions : []).forEach((entry) => {
    const source = entry?.matchedName || entry?.playerName || entry;
    const identity = resolveWeightedPlayerIdentity(stripExGuildGuildTag(source));
    if (!identity) return;
    const value = contributionValue(entry);
    if (!value) return;
    const guild = String(entry?.guild || entry?.alliance || entry?.sourceGuild || '').trim();
    const sourceName = String(entry?.playerName || entry?.name || identity.playerName || '').trim();
    const groupKey = guild || sourceName || 'ex-guild';
    const rows = map.get(identity.playerKey) || [];
    const existing = rows.find((row) => row.groupKey === groupKey);
    if (existing) {
      existing.contribution += value;
    } else {
      rows.push({
        groupKey,
        guild,
        sourceName,
        contribution: value,
      });
    }
    map.set(identity.playerKey, rows);
  });
  map.forEach((rows) => rows.sort((a, b) => b.contribution - a.contribution));
  return map;
}

function demolitionValue(entry) {
  return Math.max(
    0,
    numberValue(
      entry?.total_demolition ??
        entry?.totalDemolition ??
        entry?.demolition ??
        entry?.demo ??
        entry?.value ??
        entry?.val
    )
  );
}

function buildDemolitionMap(demolitionRecords = []) {
  const map = new Map();
  (Array.isArray(demolitionRecords) ? demolitionRecords : []).forEach((record) => {
    const entries = Array.isArray(record?.players) ? record.players : [record];
    entries.forEach((entry) => {
      const identity = resolveWeightedPlayerIdentity(
        entry?.display_player_name ||
          entry?.player_name ||
          entry?.playerName ||
          entry?.name ||
          entry
      );
      if (!identity) return;
      const value = demolitionValue(entry);
      if (!value) return;
      map.set(identity.playerKey, (map.get(identity.playerKey) || 0) + value);
    });
  });
  return map;
}

function normalizeWeights(weights) {
  return {
    ...WEIGHTED_CONTRIBUTION_WEIGHTS,
    ...(weights && typeof weights === 'object' ? weights : {}),
  };
}

export function buildWeightedContributionRows(options = {}) {
  const contributionRecords = Array.isArray(options.contributionRecords)
    ? options.contributionRecords
    : [];
  const record = options.contributionRecord || getPrimaryContributionRecord(contributionRecords);
  const entries = collapseContributionOcrDuplicates(record?.entries);
  const dutyCounts = buildWeightedDutyCounts(options.dutyRecords);
  const conductMap = buildConductMap(options.r5Adjustments, options.season || options.r5Season);
  const weights = normalizeWeights(options.weights);
  const forfeitFamilies = buildForfeitFamilySet(
    options.r5Adjustments,
    options.season || options.r5Season
  );
  const grantPremiumFamilies = buildGrantPremiumFamilySet(
    options.r5Adjustments,
    options.season || options.r5Season
  );
  const exGuildMap = buildExGuildMap(options.exGuildContributions);
  const exGuildBreakdownMap = buildExGuildBreakdownMap(options.exGuildContributions);
  const demolitionMap = buildDemolitionMap(options.demolitionRecords);
  const includeSupportOnly = options.includeSupportOnly === true;

  const baseRows = entries
    .map((entry) => {
      const identity = resolveWeightedPlayerIdentity(entry);
      if (!identity) return null;
      return {
        playerKey: identity.playerKey,
        familyKey: playerFamilyKey(identity.playerKey),
        playerName: identity.playerName,
        sourceName: entry.name || identity.playerName,
        currentRank: numberValue(entry.rank),
        currentReward: getContributionRewardTier(entry, record, null, identity.playerKey),
        contributionScore: contributionValue(entry),
        contributionExGuild: exGuildMap.get(identity.playerKey) || 0,
        contributionExGuildBreakdown: exGuildBreakdownMap.get(identity.playerKey) || [],
        supportOnly: false,
      };
    })
    .filter(Boolean);

  const contributionFamilies = new Set(baseRows.map((row) => row.familyKey));
  const supportOnlyRows = new Map();
  if (includeSupportOnly) {
    dutyCounts.forEach((counts, accountKey) => {
      const familyKey = playerFamilyKey(accountKey);
      const dutyTotal = counts.shieldWalls + counts.pathers + counts.banners;
      if (!familyKey || !dutyTotal || contributionFamilies.has(familyKey)) return;
      const current = supportOnlyRows.get(familyKey);
      if (current && current.dutyTotal >= dutyTotal) return;
      const publicProfile = getPublicVtsPlayerProfile(counts.playerName || accountKey);
      supportOnlyRows.set(familyKey, {
        playerKey: familyKey,
        familyKey,
        playerName: publicProfile?.name || counts.playerName || accountKey,
        sourceName: counts.playerName || accountKey,
        currentRank: 0,
        currentReward: 'none',
        contributionScore: 0,
        contributionExGuild: 0,
        contributionExGuildBreakdown: [],
        supportOnly: true,
        dutyTotal,
      });
    });
  }
  const contributionAndSupportRows = [...baseRows, ...supportOnlyRows.values()];

  // A player can hold several distinct accounts (e.g. Kika's main + secondary +
  // banner accounts). They stay as separate rows, but their duty (banners /
  // pathers / shield walls) and conduct belong to the PERSON, so we credit them
  // once — to the configured main account for known families, otherwise the row
  // with the highest contribution (then best current rank).
  const familyDuty = new Map();
  dutyCounts.forEach((counts, accountKey) => {
    const fam = playerFamilyKey(accountKey);
    const agg = familyDuty.get(fam) || emptyDutyCounts();
    agg.shieldWalls += counts.shieldWalls;
    agg.pathers += counts.pathers;
    agg.banners += counts.banners;
    familyDuty.set(fam, agg);
  });
  const familyConduct = new Map();
  conductMap.forEach((points, accountKey) => {
    const fam = playerFamilyKey(accountKey);
    familyConduct.set(fam, (familyConduct.get(fam) || 0) + points);
  });
  const familyDemolition = new Map();
  demolitionMap.forEach((value, accountKey) => {
    const fam = playerFamilyKey(accountKey);
    familyDemolition.set(fam, (familyDemolition.get(fam) || 0) + value);
  });

  const primaryIndexByFamily = new Map();
  contributionAndSupportRows.forEach((row, index) => {
    const fam = row.familyKey || playerFamilyKey(row.playerKey);
    const currentBest = primaryIndexByFamily.get(fam);
    if (currentBest === undefined) {
      primaryIndexByFamily.set(fam, index);
      return;
    }
    const best = contributionAndSupportRows[currentBest];
    const candidatePreferred = isPreferredFamilyAccount(row, fam);
    const bestPreferred = isPreferredFamilyAccount(best, fam);
    if (candidatePreferred && !bestPreferred) {
      primaryIndexByFamily.set(fam, index);
      return;
    }
    if (!candidatePreferred && bestPreferred) return;
    const betterContribution = row.contributionScore > best.contributionScore;
    const tiedContribution = row.contributionScore === best.contributionScore;
    if (
      betterContribution ||
      (tiedContribution && isBetterContributionRank(row.currentRank, best.currentRank))
    ) {
      primaryIndexByFamily.set(fam, index);
    }
  });

  const rows = contributionAndSupportRows.map((row, index) => {
    const fam = row.familyKey || playerFamilyKey(row.playerKey);
    const isPrimaryAccount = primaryIndexByFamily.get(fam) === index;
    const duties = isPrimaryAccount ? familyDuty.get(fam) || emptyDutyCounts() : emptyDutyCounts();
    return {
      ...row,
      shieldWalls: duties.shieldWalls,
      pathers: duties.pathers,
      banners: duties.banners,
      totalDemolition: isPrimaryAccount ? familyDemolition.get(fam) || 0 : 0,
      conductBonus: isPrimaryAccount ? familyConduct.get(fam) || 0 : 0,
      isPrimaryAccount,
    };
  });

  const premiumCutoff = getContributionPremiumCutoff(record);
  const BASE_POINT_VALUE = 10000;

  const scoredRows = rows.map((row) => {
    const exGuildPoints = row.contributionExGuild || 0;
    const contributionRewardScore = row.contributionScore + exGuildPoints;
    const dutyPoints =
      row.banners * BASE_POINT_VALUE +
      row.pathers * BASE_POINT_VALUE +
      row.shieldWalls * BASE_POINT_VALUE;
    const conductPoints = row.conductBonus * BASE_POINT_VALUE;
    const demolitionPoints = row.totalDemolition * Math.max(0, numberValue(weights.demolition));
    const weightedScore = contributionRewardScore + demolitionPoints + dutyPoints + conductPoints;

    return {
      ...row,
      contributionRewardScore,
      dutyPoints,
      conductPoints,
      demolitionPoints,
      weightedScore,
    };
  });

  const rankedContributionRows = scoredRows
    .filter((row) => !row.supportOnly)
    .sort(
      (a, b) =>
        b.weightedScore - a.weightedScore ||
        b.contributionRewardScore - a.contributionRewardScore ||
        b.contributionScore - a.contributionScore ||
        String(a.playerName).localeCompare(String(b.playerName))
    )
    .map((row, index) => {
      const rank = index + 1;
      let baseReward;
      if (rank <= 20) baseReward = 'core';
      else if (rank <= 110) baseReward = 'power_house';
      else if (rank <= 200) baseReward = 'members';
      else baseReward = 'standard';
      // Final reward is the rank tier unless an R5 conduct flag overrides it.
      let finalReward = baseReward;
      let rewardReason = 'rank';
      if (grantPremiumFamilies.has(row.familyKey)) {
        finalReward = 'core';
        rewardReason = 'grant_premium';
      }
      if (forfeitFamilies.has(row.familyKey) && finalReward === 'core') {
        finalReward = 'power_house';
        rewardReason = 'forfeit_premium';
      }
      return { ...row, finalRank: rank, baseReward, finalReward, rewardReason };
    });

  const rankedRows = [
    ...rankedContributionRows,
    ...scoredRows
      .filter((row) => row.supportOnly)
      .map((row) => ({
        ...row,
        finalRank: 0,
        baseReward: 'none',
        finalReward: 'none',
        rewardReason: 'support_only',
      })),
  ];

  return {
    record,
    premiumCutoff,
    weights,
    max: rankedRows.length
      ? {
          contribution: Math.max(...rankedRows.map((r) => r.contributionScore)),
          demolition: Math.max(...rankedRows.map((r) => r.totalDemolition)),
          pathers: Math.max(...rankedRows.map((r) => r.pathers)),
          banners: Math.max(...rankedRows.map((r) => r.banners)),
          shieldWalls: Math.max(...rankedRows.map((r) => r.shieldWalls)),
          conductAbs: Math.max(...rankedRows.map((r) => Math.abs(r.conductBonus))),
        }
      : {
          contribution: 0,
          demolition: 0,
          pathers: 0,
          banners: 0,
          shieldWalls: 0,
          conductAbs: 0,
        },
    rows: rankedRows,
  };
}
