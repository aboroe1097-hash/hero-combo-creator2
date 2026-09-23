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
 * Which support-work slot gets the guild-master reward.
 *
 * Returns `{ source, slotIndex }` where `slotIndex` is the zero-based support
 * slot that carries the guild-master reward. When the configured R5 is not in
 * the support list the answer falls back to the top support scorer, because a
 * season must never end with nobody holding the reward.
 */
export function resolveGuildMasterSlot(settings, r5PlayerKey, supportPlayerKeys) {
  const normalized = normalizeRewardSettings(settings);
  const keys = Array.isArray(supportPlayerKeys) ? supportPlayerKeys : [];
  if (normalized.guildMasterSource !== 'r5') {
    return { source: 'support_top1', slotIndex: keys.length ? 0 : -1 };
  }
  const wanted = String(r5PlayerKey || normalized.r5PlayerKey || '')
    .trim()
    .toLowerCase();
  const index = wanted
    ? keys.findIndex(
        (key) =>
          String(key || '')
            .trim()
            .toLowerCase() === wanted
      )
    : -1;
  if (index < 0) {
    return { source: 'support_top1', slotIndex: keys.length ? 0 : -1 };
  }
  return { source: 'r5', slotIndex: index };
}
