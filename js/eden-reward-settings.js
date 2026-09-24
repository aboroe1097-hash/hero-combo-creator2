/**
 * Reward distribution rules for one Eden season.
 *
 * The owner asked to be able to retune how many players each category rewards
 * (support work, total contribution, management, team players) from the admin
 * side, per season, and to choose whether the guild-master reward follows the
 * top support scorer or the R5. These are pure helpers so every stored value can
 * be normalized and tested before it reaches a screen.
 *
 * Values arrive from an admin-edited document, so treat them as hostile: a
 * non-numeric, negative or absurd quota falls back to the shipped default for
 * that one category instead of discarding the whole table, and an unknown
 * guild-master source falls back to the R5.
 */

export const REWARD_QUOTA_KEYS = Object.freeze(['support', 'contribution', 'management', 'team']);
export const GUILD_MASTER_SOURCES = Object.freeze(['r5', 'support_top1']);
export const MAX_REWARD_QUOTA = 50;
export const MAX_R5_PLAYER_KEY_LENGTH = 80;

// The distribution the owner asked for out loud: four support-work slots, ten
// contribution slots, three management and three team slots, with the guild
// master reward following the current R5 rather than the top support scorer.
export const DEFAULT_REWARD_SETTINGS = Object.freeze({
  quotas: Object.freeze({ support: 4, contribution: 10, management: 3, team: 3 }),
  guildMasterSource: 'r5',
  r5PlayerKey: 'MalakAbo',
});

function readQuota(value, fallback) {
  // Only a real number or a non-blank numeric string counts. Number('') and
  // Number(null) are 0, so a cleared admin field would otherwise save a quota
  // of 0 instead of keeping the default.
  const usable = typeof value === 'number' || (typeof value === 'string' && value.trim() !== '');
  if (!usable) return fallback;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return fallback;
  return Math.min(MAX_REWARD_QUOTA, Math.floor(number));
}

export function normalizeRewardSettings(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const rawQuotas = source.quotas && typeof source.quotas === 'object' ? source.quotas : {};
  const quotas = {};
  for (const key of REWARD_QUOTA_KEYS) {
    quotas[key] = readQuota(rawQuotas[key], DEFAULT_REWARD_SETTINGS.quotas[key]);
  }
  const guildMasterSource = GUILD_MASTER_SOURCES.includes(source.guildMasterSource)
    ? source.guildMasterSource
    : DEFAULT_REWARD_SETTINGS.guildMasterSource;
  // Absent means "not configured yet" and keeps the shipped R5. A present but
  // empty value is a deliberate "no R5 named", which then falls back to the top
  // support scorer rather than silently naming somebody.
  const r5PlayerKey =
    'r5PlayerKey' in source
      ? String(source.r5PlayerKey || '')
          .trim()
          .slice(0, MAX_R5_PLAYER_KEY_LENGTH)
      : DEFAULT_REWARD_SETTINGS.r5PlayerKey;
  return { quotas, guildMasterSource, r5PlayerKey };
}

export function normalizePublishedRewardSettings(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const settings = normalizeRewardSettings(source);
  if (
    !Object.prototype.hasOwnProperty.call(source, 'r5PlayerKey') ||
    typeof source.r5PlayerKey !== 'string'
  ) {
    settings.r5PlayerKey = '';
  }
  return settings;
}

/**
 * How many rows a category's reward table shows: the configured quota, or the
 * shipped default when the category is unknown.
 */
export function rewardQuota(settings, category) {
  const normalized = normalizeRewardSettings(settings);
  return REWARD_QUOTA_KEYS.includes(category)
    ? normalized.quotas[category]
    : (DEFAULT_REWARD_SETTINGS.quotas[category] ?? 0);
}

/**
 * Whether the season hands the guild-master reward to a named R5, taking one of
 * the Support Work slots. The owner's rule: the R5 always holds it, even with no
 * support work of their own, and the Support Work quota covers the R5 plus the
 * other support players — a quota of 6 means 1 R5 and 5 others, not 6 others
 * with an extra R5 row on top. With `support_top1`, or with no R5 named, the top
 * support scorer holds it inside the quota instead.
 */
export function guildMasterIsReserved(settings) {
  const normalized = normalizeRewardSettings(settings);
  return normalized.guildMasterSource === 'r5' && Boolean(normalized.r5PlayerKey);
}

/**
 * Rows the Support Work table shows. The guild-master holder (a reserved R5, or
 * the top support scorer) fills one of the quota slots, so the quota is the row
 * count — except at a quota of 0, where one player still holds the reward
 * rather than leaving a season with nobody holding it. This holds in both modes.
 */
export function supportSlotCount(settings) {
  return Math.max(rewardQuota(settings, 'support'), 1);
}

/** Size of the final announcement: every category's slots together. */
export function announcementSlotCount(settings) {
  const normalized = normalizeRewardSettings(settings);
  return (
    supportSlotCount(normalized) +
    normalized.quotas.contribution +
    normalized.quotas.management +
    normalized.quotas.team
  );
}

/**
 * Support Work reward rows, in display order.
 *
 * @param {object} settings  reward settings (normalized here)
 * @param {Array} supportRows  support candidates, best first
 * @param {object} options
 * @param {(row) => string} options.familyKeyOf  identity used to find the R5
 * @param {string} options.r5FamilyKey  the R5's identity under the same function
 * @param {object} [options.r5Row]  the R5's scored row, when the R5 has one
 * @returns {Array<{ row: object|null, reward: 'guild_master'|'core' }>}
 *   With a reserved R5 the first entry is the R5 (row null if they have no
 *   scored row), and the R5 takes one of the quota slots, so `quota - 1` other
 *   support rows follow. A quota of 0 still yields the R5 alone. Without a
 *   reserved R5 the top support scorer holds guild master inside the quota, and
 *   a quota of 0 still yields that top scorer alone (nothing when there are no
 *   support rows at all).
 */
export function allocateSupportRewards(settings, supportRows, options = {}) {
  const normalized = normalizeRewardSettings(settings);
  const quota = normalized.quotas.support;
  const rows = Array.isArray(supportRows) ? supportRows : [];
  if (!guildMasterIsReserved(normalized)) {
    return rows
      .slice(0, Math.max(quota, 1))
      .map((row, index) => ({ row, reward: index === 0 ? 'guild_master' : 'core' }));
  }
  const familyKeyOf = typeof options.familyKeyOf === 'function' ? options.familyKeyOf : () => '';
  const r5FamilyKey = String(options.r5FamilyKey || '');
  const others = rows
    .filter((row) => !r5FamilyKey || familyKeyOf(row) !== r5FamilyKey)
    .slice(0, Math.max(0, quota - 1))
    .map((row) => ({ row, reward: 'core' }));
  return [{ row: options.r5Row || null, reward: 'guild_master' }, ...others];
}
