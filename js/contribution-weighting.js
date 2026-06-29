import { normalizeR5Adjustment } from './ocr-adjustments.js';
import { compactPlayerIdentity, expandDutyRawNames, getDutyCreditedNames } from './ocr-shared.js';
import {
  getSpecialAccountIdentityKey,
  resolveCanonicalPlayerIdentity,
} from './ocr-name-normalizer.js';

export const WEIGHTED_CONTRIBUTION_WEIGHTS = Object.freeze({
  contribution: 0.5,
  pathers: 0.15,
  banners: 0.15,
  shieldWalls: 0.15,
  conduct: 0.05,
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
  if (rank === 1) return 'guild_master';
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

function resolveWeightedPlayerIdentity(player) {
  const identity = resolvePlayerIdentity(player);
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
  const seasonKey = String(season || '').trim();
  if (!seasonKey) return new Map();
  const totals = new Map();

  (Array.isArray(adjustments) ? adjustments : []).forEach((entry) => {
    let adjustment;
    try {
      adjustment = normalizeR5Adjustment(entry, { season: entry?.season || seasonKey });
    } catch {
      return;
    }
    if (String(adjustment.season || '').trim() !== seasonKey) return;

    const playerKey = weightedPlayerKeyForName(adjustment.playerName || adjustment.playerKey);
    if (!playerKey) return;
    totals.set(playerKey, (totals.get(playerKey) || 0) + adjustment.points);
  });

  return totals;
}

function buildForfeitPlayerSet(adjustments = [], season = '') {
  if (!season || !Array.isArray(adjustments)) return new Set();
  const seasonKey = String(season || '')
    .toLowerCase()
    .trim();
  const forfeit = new Set();
  adjustments.forEach((entry) => {
    if (entry?.category !== 'forfeit_premium') return;
    if (
      String(entry?.season || '')
        .toLowerCase()
        .trim() !== seasonKey
    )
      return;
    try {
      const identity = resolveWeightedPlayerIdentity(entry?.player || entry);
      if (identity) forfeit.add(identity.playerKey);
    } catch {
      /* skip unparseable player */
    }
  });
  return forfeit;
}

function buildGrantPremiumPlayerSet(adjustments = [], season = '') {
  if (!season || !Array.isArray(adjustments)) return new Set();
  const seasonKey = String(season || '')
    .toLowerCase()
    .trim();
  const grants = new Set();
  adjustments.forEach((entry) => {
    if (entry?.category !== 'grant_premium') return;
    if (
      String(entry?.season || '')
        .toLowerCase()
        .trim() !== seasonKey
    )
      return;
    try {
      const identity = resolveWeightedPlayerIdentity(entry?.player || entry);
      if (identity) grants.add(identity.playerKey);
    } catch {
      /* skip unparseable player */
    }
  });
  return grants;
}

function buildExGuildMap(exGuildContributions = []) {
  const map = new Map();
  (Array.isArray(exGuildContributions) ? exGuildContributions : []).forEach((entry) => {
    const identity = resolveWeightedPlayerIdentity(entry?.playerName || entry);
    if (!identity) return;
    const value = contributionValue(entry);
    if (!value) return;
    map.set(identity.playerKey, (map.get(identity.playerKey) || 0) + value);
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
  const entries = Array.isArray(record?.entries) ? record.entries : [];
  const dutyCounts = buildWeightedDutyCounts(options.dutyRecords);
  const conductMap = buildConductMap(options.r5Adjustments, options.season || options.r5Season);
  const weights = normalizeWeights(options.weights);
  const forfeitPlayers = buildForfeitPlayerSet(
    options.r5Adjustments,
    options.season || options.r5Season
  );
  const grantPremiumPlayers = buildGrantPremiumPlayerSet(
    options.r5Adjustments,
    options.season || options.r5Season
  );
  const exGuildMap = buildExGuildMap(options.exGuildContributions);

  const rows = entries
    .map((entry) => {
      const identity = resolveWeightedPlayerIdentity(entry);
      if (!identity) return null;
      const duties = dutyCounts.get(identity.playerKey) || emptyDutyCounts();
      const exGuildScore = exGuildMap.get(identity.playerKey) || 0;
      return {
        playerKey: identity.playerKey,
        playerName: identity.playerName,
        sourceName: entry.name || identity.playerName,
        currentRank: numberValue(entry.rank),
        currentReward: getContributionRewardTier(entry, record),
        contributionScore: contributionValue(entry),
        contributionExGuild: exGuildScore,
        shieldWalls: duties.shieldWalls,
        pathers: duties.pathers,
        banners: duties.banners,
        conductBonus: conductMap.get(identity.playerKey) || 0,
      };
    })
    .filter(Boolean);

  const premiumCutoff = getContributionPremiumCutoff(record);
  const BASE_POINT_VALUE = 10000;

  const rankedRows = rows
    .map((row) => {
      const exGuildPoints = row.contributionExGuild || 0;
      const dutyPoints =
        row.banners * BASE_POINT_VALUE +
        row.pathers * BASE_POINT_VALUE +
        row.shieldWalls * BASE_POINT_VALUE;
      const conductPoints = row.conductBonus * BASE_POINT_VALUE;
      const weightedScore = row.contributionScore + exGuildPoints + dutyPoints + conductPoints;

      return {
        ...row,
        dutyPoints,
        conductPoints,
        weightedScore,
      };
    })
    .sort(
      (a, b) =>
        b.weightedScore - a.weightedScore ||
        b.contributionScore - a.contributionScore ||
        String(a.playerName).localeCompare(String(b.playerName))
    )
    .map((row, index) => {
      const rank = index + 1;
      let baseReward;
      if (rank === 1) baseReward = 'guild_master';
      else if (rank <= 20) baseReward = 'core';
      else if (rank <= 110) baseReward = 'power_house';
      else if (rank <= 200) baseReward = 'members';
      else baseReward = 'standard';
      // Final reward is the rank tier unless an R5 conduct flag overrides it.
      let finalReward = baseReward;
      let rewardReason = 'rank';
      if (grantPremiumPlayers.has(row.playerKey) && finalReward !== 'guild_master') {
        finalReward = 'core';
        rewardReason = 'grant_premium';
      }
      if (
        forfeitPlayers.has(row.playerKey) &&
        (finalReward === 'guild_master' || finalReward === 'core')
      ) {
        finalReward = 'power_house';
        rewardReason = 'forfeit_premium';
      }
      return { ...row, finalRank: rank, baseReward, finalReward, rewardReason };
    });

  return {
    record,
    premiumCutoff,
    weights,
    max: rankedRows.length
      ? {
          contribution: Math.max(...rankedRows.map((r) => r.contributionScore)),
          pathers: Math.max(...rankedRows.map((r) => r.pathers)),
          banners: Math.max(...rankedRows.map((r) => r.banners)),
          shieldWalls: Math.max(...rankedRows.map((r) => r.shieldWalls)),
          conductAbs: Math.max(...rankedRows.map((r) => Math.abs(r.conductBonus))),
        }
      : { contribution: 0, pathers: 0, banners: 0, shieldWalls: 0, conductAbs: 0 },
    rows: rankedRows,
  };
}
