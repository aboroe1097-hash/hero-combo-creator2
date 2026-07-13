import assert from 'node:assert/strict';
import test from 'node:test';

import { dashboardCacheVersion, hasUsableDashboardCache } from '../../js/dashboard-cache-policy.js';

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
