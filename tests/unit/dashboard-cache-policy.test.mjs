import assert from 'node:assert/strict';
import test from 'node:test';

import {
  cachedEdenDashboardSeasonIsObsolete,
  dashboardCacheVersion,
  hasAuthoritativeEdenVoteSettings,
  hasUsableDashboardCache,
} from '../../js/dashboard-cache-policy.js';

test('dashboard cache is usable only when it contains meaningful records', () => {
  assert.equal(hasUsableDashboardCache(null), false);
  assert.equal(hasUsableDashboardCache({ attacks: [], contributionRecords: [] }), false);
  assert.equal(hasUsableDashboardCache({ total_attacks: 1, attacks: [] }), true);
  assert.equal(hasUsableDashboardCache({ contributionRecords: [{ id: 'current' }] }), true);
});

test('dashboard cache version changes with revision, timestamp, or record counts', () => {
  const base = {
    syncRevision: 7,
    updatedAtMs: 1000,
    attacks: [{ id: 'one' }],
  };
  assert.equal(dashboardCacheVersion(base), dashboardCacheVersion({ ...base }));
  assert.notEqual(dashboardCacheVersion(base), dashboardCacheVersion({ ...base, syncRevision: 8 }));
  assert.notEqual(
    dashboardCacheVersion(base),
    dashboardCacheVersion({ ...base, attacks: [...base.attacks, { id: 'two' }] })
  );
  assert.equal(dashboardCacheVersion({ attacks: [{ id: 'one' }] }), '');
});

test('Eden vote settings authority requires a valid mode for the dashboard season', () => {
  const current = { season: 'season-2027', contributionRankingMode: 'default' };
  assert.equal(hasAuthoritativeEdenVoteSettings(current, 'season-2027'), true);
  assert.equal(hasAuthoritativeEdenVoteSettings(current, 'season-2026'), false);
  assert.equal(
    hasAuthoritativeEdenVoteSettings(
      { season: 'season-2027', contributionRankingMode: 'invalid' },
      'season-2027'
    ),
    false
  );
  assert.equal(
    hasAuthoritativeEdenVoteSettings({ contributionRankingMode: 'default' }, 'season-2027'),
    false
  );
});

test('a live season rollover marks the previously valid Eden cache obsolete', () => {
  const cachedData = {
    r5Season: 'season-2026',
    edenX1VoteSettings: { season: 'season-2026', contributionRankingMode: 'default' },
  };
  assert.equal(cachedEdenDashboardSeasonIsObsolete(cachedData, 'season-2027'), true);
  assert.equal(cachedEdenDashboardSeasonIsObsolete(cachedData, 'season-2026'), false);
  assert.equal(cachedEdenDashboardSeasonIsObsolete(cachedData, ''), false);
});
