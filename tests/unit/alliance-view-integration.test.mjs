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
