const MEANINGFUL_DASHBOARD_ARRAYS = Object.freeze([
  'attacks',
  'players_summary',
  'bannerRecords',
  'dutyRecords',
  'contributionRecords',
  'exGuildContributions',
  'rosterSnapshots',
  'publicConductAdjustments',
]);

export function hasUsableDashboardCache(data) {
  if (!data || typeof data !== 'object') return false;
  if (Number(data.total_attacks) > 0) return true;
  return MEANINGFUL_DASHBOARD_ARRAYS.some(
    (key) => Array.isArray(data[key]) && data[key].length > 0
  );
}

export function hasAuthoritativeEdenVoteSettings(settings, expectedSeason) {
  const mode = settings?.contributionRankingMode;
  const settingsSeason = String(settings?.season || '').trim();
  const dashboardSeason = String(expectedSeason || '').trim();
  return (
    settings !== null &&
    typeof settings === 'object' &&
    !Array.isArray(settings) &&
    Boolean(settingsSeason) &&
    Boolean(dashboardSeason) &&
    settingsSeason === dashboardSeason &&
    (mode === 'extended' || mode === 'default')
  );
}

export function cachedEdenDashboardSeasonIsObsolete(cachedData, liveDashboardSeason) {
  const cachedSeason = String(cachedData?.r5Season || '').trim();
  const liveSeason = String(liveDashboardSeason || '').trim();
  return Boolean(cachedSeason && liveSeason && cachedSeason !== liveSeason);
}

export function dashboardCacheVersion(data) {
  if (!data || typeof data !== 'object') return '';
  const revision = Number(data.syncRevision);
  const updatedAtMs = Number(data.updatedAtMs);
  const stamp =
    Number.isFinite(updatedAtMs) && updatedAtMs > 0
      ? updatedAtMs
      : data.updatedAt || data.last_updated || '';
  const counts = MEANINGFUL_DASHBOARD_ARRAYS.map((key) =>
    Array.isArray(data[key]) ? data[key].length : 0
  ).join(':');
  const stableIdentity = Number.isFinite(revision) || Boolean(stamp);
  return stableIdentity ? `${Number.isFinite(revision) ? revision : 0}|${stamp}|${counts}` : '';
}
