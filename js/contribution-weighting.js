import { aggregateR5Bonuses } from './ocr-adjustments.js';
import { compactPlayerIdentity, expandDutyRawNames, getDutyCreditedNames } from './ocr-shared.js';
import { resolveCanonicalPlayerIdentity } from './ocr-name-normalizer.js';

export const WEIGHTED_CONTRIBUTION_WEIGHTS = Object.freeze({
  contribution: 0.5,
  pathers: 0.15,
  banners: 0.15,
  shieldWalls: 0.1,
  conduct: 0.1,
});

export const DEFAULT_WEIGHTED_CONTRIBUTION_PREMIUM_CUTOFF = 20;

const CONTRIBUTION_FIELDS = ['contribution', 'value', 'points', 'total', 'score'];

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

function resolvePlayerIdentity(player) {
  try {
    return resolveCanonicalPlayerIdentity(player);
  } catch {
    const name = String(player?.playerName || player?.name || player || '').trim();
    const playerKey = compactPlayerIdentity(name);
    return playerKey ? { playerKey, playerName: name } : null;
  }
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
        const identity = resolvePlayerIdentity(name);
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
  if (!season) return new Map();
  try {
    return aggregateR5Bonuses(adjustments, season);
  } catch {
    return new Map();
  }
}

function normalizeMetric(value, maxValue) {
  return maxValue > 0 ? (value / maxValue) * 100 : 0;
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
  const record = options.contributionRecord || getLatestContributionRecord(contributionRecords);
  const entries = Array.isArray(record?.entries) ? record.entries : [];
  const dutyCounts = buildWeightedDutyCounts(options.dutyRecords);
  const conductMap = buildConductMap(options.r5Adjustments, options.season || options.r5Season);
  const weights = normalizeWeights(options.weights);

  const rows = entries
    .map((entry) => {
      const identity = resolvePlayerIdentity(entry);
      if (!identity) return null;
      const duties = dutyCounts.get(identity.playerKey) || emptyDutyCounts();
      return {
        playerKey: identity.playerKey,
        playerName: identity.playerName,
        sourceName: entry.name || identity.playerName,
        currentRank: numberValue(entry.rank),
        currentReward: getContributionRewardTier(entry, record),
        contributionScore: contributionValue(entry),
        shieldWalls: duties.shieldWalls,
        pathers: duties.pathers,
        banners: duties.banners,
        conductBonus: conductMap.get(identity.playerKey) || 0,
      };
    })
    .filter(Boolean);

  const maxContribution = Math.max(0, ...rows.map((row) => row.contributionScore));
  const maxPathers = Math.max(0, ...rows.map((row) => row.pathers));
  const maxBanners = Math.max(0, ...rows.map((row) => row.banners));
  const maxShieldWalls = Math.max(0, ...rows.map((row) => row.shieldWalls));
  const maxConductAbs = Math.max(0, ...rows.map((row) => Math.abs(row.conductBonus)));
  const premiumCutoff = getContributionPremiumCutoff(record);

  const rankedRows = rows
    .map((row) => {
      const contributionNorm = normalizeMetric(row.contributionScore, maxContribution);
      const pathersNorm = normalizeMetric(row.pathers, maxPathers);
      const bannersNorm = normalizeMetric(row.banners, maxBanners);
      const shieldWallsNorm = normalizeMetric(row.shieldWalls, maxShieldWalls);
      const conductNorm = maxConductAbs ? (row.conductBonus / maxConductAbs) * 100 : 0;
      const weightedScore =
        weights.contribution * contributionNorm +
        weights.pathers * pathersNorm +
        weights.banners * bannersNorm +
        weights.shieldWalls * shieldWallsNorm +
        weights.conduct * conductNorm;

      return {
        ...row,
        contributionNorm,
        pathersNorm,
        bannersNorm,
        shieldWallsNorm,
        conductNorm,
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
      let finalReward;
      if (rank === 1) finalReward = 'guild_master';
      else if (rank <= 20) finalReward = 'core';
      else if (rank <= 110) finalReward = 'power_house';
      else if (rank <= 200) finalReward = 'members';
      else finalReward = 'standard';
      return { ...row, finalRank: rank, finalReward };
    });

  return {
    record,
    premiumCutoff,
    weights,
    max: {
      contribution: maxContribution,
      pathers: maxPathers,
      banners: maxBanners,
      shieldWalls: maxShieldWalls,
      conductAbs: maxConductAbs,
    },
    rows: rankedRows,
  };
}
