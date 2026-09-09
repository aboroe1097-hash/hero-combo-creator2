import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('Alliance View retries failed mounts and follows remote Eden active-mode settings', () => {
  const dashboard = readFileSync('js/ocr-dashboard.js', 'utf8');
  const view = readFileSync('js/admin-alliance-view.js', 'utf8');

  assert.match(dashboard, /function ensureAllianceViewVoteSettingsSubscription\(\)/);
  assert.match(
    dashboard,
    /allianceViewVoteSettingsUnsubscribe = onSnapshot\([\s\S]*?normalizeEdenX1VoteSettings\(snapshot\.data\(\)\)[\s\S]*?publishAllianceViewContributionModel\(\)/
  );
  assert.match(
    dashboard,
    /allianceViewVoteSettingsUnsubscribe\(\);[\s\S]*?allianceViewVoteSettingsUnsubscribe = null;/
  );
  assert.match(
    view,
    /catch \(error\) \{[\s\S]*?state\.store\?\.stop\?\.\(\);[\s\S]*?throw error;[\s\S]*?\} finally/
  );
});

test('Alliance View totals use the weighted duty points rather than recomputing them flat', async () => {
  const { getAllianceContributionMetrics } = await import('../../js/alliance-view-model.js');

  // Pathing on a main is worth 3, so one pathing duty is 30,000. This table used
  // to multiply the raw count by a flat 10,000, which silently reverted every
  // weight and made it disagree with the deck the row came from.
  const weighted = getAllianceContributionMetrics(
    { contributionScore: 100000, pathers: 1, banners: 0, shieldWalls: 0, dutyPoints: 30000 },
    'extended'
  );
  assert.equal(weighted.dutyPoints, 30000);
  assert.equal(weighted.extended, 130000);

  // Rows that predate the weighted model, or come from a projection that never
  // carried the field, still fall back to the flat value rather than scoring nil.
  const legacy = getAllianceContributionMetrics(
    { contributionScore: 100000, pathers: 1, banners: 0, shieldWalls: 0 },
    'extended'
  );
  assert.equal(legacy.dutyPoints, 10000);
  assert.equal(legacy.extended, 110000);

  // Bonus team effort is still added at the flat rate; it is not duty.
  const bonus = getAllianceContributionMetrics(
    { contributionScore: 0, pathers: 1, dutyPoints: 30000, bonusTeamEffort: 2 },
    'extended'
  );
  assert.equal(bonus.extended, 50000);

  // A zero must survive as a zero rather than falling through to the flat count.
  const zero = getAllianceContributionMetrics(
    { contributionScore: 0, pathers: 4, dutyPoints: 0 },
    'extended'
  );
  assert.equal(zero.dutyPoints, 0);
});

test('the duty weight document is writable by a superadmin and shape-checked', async () => {
  const { readFileSync } = await import('node:fs');
  const rules = readFileSync('firestore.rules', 'utf8');

  // Shipping the editor without these rules meant every save failed with
  // "Missing or insufficient permissions" — the document had no rule at all.
  for (const season of ['x1', 'x2']) {
    // Split on the keyword instead of matching a block pattern: escaping a
    // rules regex through a template literal is how a backslash gets eaten,
    // and this needs no escapes at all.
    const block = rules
      .split('match ')
      .find((part) => part.startsWith(`/vts_admin/eden_${season}_duty_point_weights {`));
    assert.ok(block, `${season} has a rule`);
    assert.match(block, /allow read: if isAdmin\(\);/);
    assert.match(block, /allow create, update: if isSuperAdmin\(\) && validDutyPointWeights\(\);/);
    assert.match(block, /allow delete: if false;/);
  }
  // A number here multiplies real scores, so the shape is pinned rather than trusted.
  assert.match(rules, /function validDutyPointWeights\(\)/);
  assert.match(rules, /hasOnly\(\['banners', 'pathers', 'shieldWalls'\]\)/);
  assert.match(rules, /entry\.main >= 0 && entry\.main <= 100/);
});
