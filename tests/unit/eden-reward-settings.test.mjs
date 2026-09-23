import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  DEFAULT_REWARD_SETTINGS,
  GUILD_MASTER_SOURCES,
  MAX_REWARD_QUOTA,
  REWARD_QUOTA_KEYS,
  normalizeRewardSettings,
  resolveGuildMasterSlot,
  rewardQuota,
} from '../../js/eden-reward-settings.js';

test('reward settings default to the distribution the owner asked for', () => {
  assert.deepEqual(DEFAULT_REWARD_SETTINGS.quotas, {
    support: 4,
    contribution: 10,
    management: 3,
    team: 3,
  });
  // The guild-master reward follows the current R5 unless told otherwise.
  assert.equal(DEFAULT_REWARD_SETTINGS.guildMasterSource, 'r5');
  assert.equal(DEFAULT_REWARD_SETTINGS.r5PlayerKey, 'MalakAbo');
  assert.deepEqual(normalizeRewardSettings(null), DEFAULT_REWARD_SETTINGS);
  assert.equal(rewardQuota(null, 'support'), 4);
  assert.equal(rewardQuota(null, 'contribution'), 10);
  // Unknown categories fall back to the default rather than to zero.
  assert.equal(rewardQuota(null, 'nonsense'), DEFAULT_REWARD_SETTINGS.quotas.nonsense ?? 0);
});

test('reward settings treat the document as hostile input', () => {
  const cleaned = normalizeRewardSettings({
    quotas: { support: 'nonsense', contribution: -3, management: 7.9, team: 1000 },
    guildMasterSource: 'whoever',
    r5PlayerKey: '  MalakAbo  ',
  });
  assert.equal(cleaned.quotas.support, 4);
  assert.equal(cleaned.quotas.contribution, 10);
  assert.equal(cleaned.quotas.management, 7, 'floors a fractional quota');
  assert.equal(cleaned.quotas.team, MAX_REWARD_QUOTA, 'clamps an absurd quota');
  assert.equal(cleaned.guildMasterSource, 'r5', 'unknown sources fall back to the R5');
  assert.equal(cleaned.r5PlayerKey, 'MalakAbo', 'trims the stored name');

  // A zero quota is meaningful (that category rewards nobody) and is preserved.
  assert.equal(normalizeRewardSettings({ quotas: { support: 0 } }).quotas.support, 0);
  // Every source the module accepts is a real switch value.
  for (const source of GUILD_MASTER_SOURCES) {
    assert.equal(normalizeRewardSettings({ guildMasterSource: source }).guildMasterSource, source);
  }
  for (const key of REWARD_QUOTA_KEYS) {
    assert.equal(normalizeRewardSettings({ quotas: { [key]: 6 } }).quotas[key], 6);
  }
});

test('the guild-master slot follows the configured source and never goes unheld', () => {
  const supportKeys = ['alpha', 'malakabo', 'gamma'];

  // Default: the R5 holds it, wherever they sit in the support list.
  assert.deepEqual(resolveGuildMasterSlot(null, '', supportKeys), {
    source: 'r5',
    slotIndex: 1,
  });
  // Explicitly asked for: it is the top support scorer.
  assert.deepEqual(resolveGuildMasterSlot({ guildMasterSource: 'support_top1' }, '', supportKeys), {
    source: 'support_top1',
    slotIndex: 0,
  });
  // An R5 who did no support work this season: the reward stays held.
  assert.deepEqual(resolveGuildMasterSlot(null, 'nobody', supportKeys), {
    source: 'support_top1',
    slotIndex: 0,
  });
  // The lookup is case-insensitive and tolerates the stored whitespace.
  assert.deepEqual(resolveGuildMasterSlot(null, '  MALAKABO ', supportKeys), {
    source: 'r5',
    slotIndex: 1,
  });
  // An empty support list has no slot to hand it to.
  assert.equal(resolveGuildMasterSlot(null, '', []).slotIndex, -1);
  // A per-call override beats the stored name.
  assert.deepEqual(resolveGuildMasterSlot({ r5PlayerKey: 'malakabo' }, 'gamma', supportKeys), {
    source: 'r5',
    slotIndex: 2,
  });
});

test('the reward distribution is a superadmin document published with the season', async () => {
  const { edenWorkspaceFirestorePath, normalizeEdenProjectionRewardSettings } =
    await import('../../js/eden-workspaces.js');
  const { buildEdenPublicProjection } = await import('../../js/eden-workspaces.js');

  // Per workspace, so retuning one season cannot restate another's rewards.
  assert.equal(
    edenWorkspaceFirestorePath('eden-x2', 'rewardSettings'),
    'vts_admin/eden_x2_reward_settings'
  );
  assert.equal(
    edenWorkspaceFirestorePath('eden-x1', 'rewardSettings'),
    'vts_admin/eden_x1_reward_settings'
  );

  const rules = readFileSync('firestore.rules', 'utf8');
  assert.match(rules, /function validRewardSettings\(\)/);
  assert.match(rules, /match \/vts_admin\/eden_x1_reward_settings \{/);
  assert.match(rules, /match \/vts_admin\/eden_x2_reward_settings \{/);
  assert.match(rules, /allow create, update: if isSuperAdmin\(\) && validRewardSettings\(\);/);
  assert.match(rules, /d\.quotas\.support >= 0 && d\.quotas\.support <= 50/);
  assert.match(rules, /d\.guildMasterSource in \['r5', 'support_top1'\]/);

  const markup = readFileSync('tabs/admin.html', 'utf8');
  const panel = markup.match(
    /<section class="dash-duty-weights"[\s\S]*?data-reward-quota[\s\S]*?<\/section>/
  )?.[0];
  assert.ok(panel, 'the reward panel exists');
  assert.match(panel, /data-requires-superadmin/);
  for (const key of REWARD_QUOTA_KEYS) {
    assert.match(panel, new RegExp(`data-reward-quota="${key}"`), key);
  }
  assert.match(panel, /id="dashRewardGuildMasterSource"/);
  assert.match(panel, /id="dashRewardR5Player"/);
  assert.match(panel, /id="dashRewardSettingsSaveBtn"/);

  const dashboard = readFileSync('js/ocr-dashboard.js', 'utf8');
  assert.match(
    dashboard,
    /rewardSettings: unpublish \? null : normalizeRewardSettings\(state\.rewardSettings\)/
  );
  assert.match(dashboard, /blockEdenArchiveWrite\('save reward settings'\)/);

  // The projection carries it, and normalizes whatever it is handed.
  const projection = buildEdenPublicProjection({
    dashboardData: { r5Season: 'season-2027' },
    rewardSettings: { quotas: { support: 6 }, guildMasterSource: 'support_top1', r5PlayerKey: 'x' },
  });
  assert.deepEqual(projection.rewardSettings, {
    quotas: { support: 6, contribution: 10, management: 3, team: 3 },
    guildMasterSource: 'support_top1',
    r5PlayerKey: 'x',
  });
  assert.equal(normalizeEdenProjectionRewardSettings(null), undefined);
  assert.deepEqual(normalizeEdenProjectionRewardSettings({ quotas: {} }).quotas, {
    support: 4,
    contribution: 10,
    management: 3,
    team: 3,
  });

  // The public page reads them and stops hard-coding the slot counts.
  const page = readFileSync('js/eden-x1.js', 'utf8');
  assert.match(page, /currentRewardSettings = normalizeRewardSettings\(data\.rewardSettings\)/);
  assert.match(page, /const quota = rewardQuota\(currentRewardSettings, 'support'\)/);
  assert.match(
    page,
    /const contributionQuota = rewardQuota\(currentRewardSettings, 'contribution'\)/
  );
  assert.doesNotMatch(page, /\.slice\(0, 4\)\n\s*\.map\(\(row, index\) => \(\{/);
  assert.match(page, /resolveGuildMasterSlot\(/);
  assert.match(page, /rewardQuotaCountForView/);

  // Every locale the gate checks carries the panel copy.
  for (const locale of ['en', 'ar', 'de', 'es', 'fr', 'id', 'it', 'kr', 'pt', 'ru', 'tr', 'zh']) {
    const pack = readFileSync(`js/i18n/${locale}.js`, 'utf8');
    assert.match(pack, /adminRewardSettingsTitle:/, `${locale} has the reward panel title`);
    assert.match(pack, /adminRewardSettingsGuildMasterR5:/, `${locale} has the R5 option`);
  }
});
