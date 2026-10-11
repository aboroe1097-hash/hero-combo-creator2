export const VTS_SCORE_SETTINGS_PATH = 'vts_admin/vts_score_settings';
export const DEFAULT_DRAGON_TIER_CUTOFF = 7_000_000;

export function normalizeVtsScoreSettings(raw = {}) {
  raw = raw || {};
  const value = raw.dragonTierCutoff;
  return {
    dragonTierCutoff:
      Number.isSafeInteger(value) && value >= 0 && value <= 1_000_000_000_000
        ? value
        : DEFAULT_DRAGON_TIER_CUTOFF,
    revision: Number.isSafeInteger(raw.revision) && raw.revision > 0 ? raw.revision : 0,
    growthWarningAbsolute:
      Number.isSafeInteger(raw.growthWarningAbsolute) &&
      raw.growthWarningAbsolute >= 0 &&
      raw.growthWarningAbsolute <= 1_000_000_000_000
        ? raw.growthWarningAbsolute
        : 10_000_000_000,
    growthWarningPercent:
      Number.isSafeInteger(raw.growthWarningPercent) &&
      raw.growthWarningPercent >= 0 &&
      raw.growthWarningPercent <= 1_000_000_000
        ? raw.growthWarningPercent
        : 1000,
  };
}
