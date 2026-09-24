import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  DEFAULT_REWARD_SETTINGS,
  GUILD_MASTER_SOURCES,
  MAX_REWARD_QUOTA,
  REWARD_QUOTA_KEYS,
  normalizePublishedRewardSettings,
  normalizeRewardSettings,
  allocateSupportRewards,
  announcementSlotCount,
  guildMasterIsReserved,
  rewardQuota,
  supportSlotCount,
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

test('published reward settings never invent an R5 from missing or malformed projection values', () => {
  const settings = normalizePublishedRewardSettings({ quotas: { support: 2 } });
  assert.equal(settings.quotas.support, 2);
  assert.equal(settings.guildMasterSource, 'r5');
  assert.equal(settings.r5PlayerKey, '');
  assert.equal(guildMasterIsReserved(settings), false);

  for (const r5PlayerKey of [undefined, null, 123, {}]) {
    const malformed = normalizePublishedRewardSettings({ r5PlayerKey });
    assert.equal(malformed.r5PlayerKey, '');
  }

  const configured = normalizePublishedRewardSettings({ r5PlayerKey: 'Current X2 R5' });
  assert.equal(configured.r5PlayerKey, 'Current X2 R5');
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

  // Normalizing keeps a stored 0 as 0. For contribution, management and team
  // that rewards nobody; supportSlotCount still clamps Support Work to one
  // guild-master holder.
  assert.equal(normalizeRewardSettings({ quotas: { support: 0 } }).quotas.support, 0);
  assert.equal(normalizeRewardSettings({ quotas: { support: '0' } }).quotas.support, 0);
  assert.equal(normalizeRewardSettings({ quotas: { support: ' 3 ' } }).quotas.support, 3);
  // A cleared admin field ('' or whitespace) or a missing/null/boolean/array
  // value keeps the default instead of coercing to 0.
  for (const value of ['', '   ', null, undefined, false, true, [], [2], {}]) {
    assert.equal(
      normalizeRewardSettings({ quotas: { support: value, team: value } }).quotas.support,
      DEFAULT_REWARD_SETTINGS.quotas.support,
      `support ${JSON.stringify(value)}`
    );
    assert.equal(
      normalizeRewardSettings({ quotas: { support: value, team: value } }).quotas.team,
      DEFAULT_REWARD_SETTINGS.quotas.team,
      `team ${JSON.stringify(value)}`
    );
  }
  // Every source the module accepts is a real switch value.
  for (const source of GUILD_MASTER_SOURCES) {
    assert.equal(normalizeRewardSettings({ guildMasterSource: source }).guildMasterSource, source);
  }
  for (const key of REWARD_QUOTA_KEYS) {
    assert.equal(normalizeRewardSettings({ quotas: { [key]: 6 } }).quotas[key], 6);
  }
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
  assert.match(
    page,
    /currentRewardSettings = normalizeRewardSettings\(\s*data\.rewardSettings \|\| \{ guildMasterSource: 'support_top1' \}\s*\)/
  );
  assert.match(page, /allocateSupportRewards\(currentRewardSettings,/);
  assert.match(
    page,
    /const contributionQuota = rewardQuota\(currentRewardSettings, 'contribution'\)/
  );
  assert.doesNotMatch(page, /\.slice\(0, 4\)\n\s*\.map\(\(row, index\) => \(\{/);
  assert.match(page, /rewardQuotaCountForView/);

  // Every locale the gate checks carries the panel copy.
  for (const locale of ['en', 'ar', 'de', 'es', 'fr', 'id', 'it', 'kr', 'pt', 'ru', 'tr', 'zh']) {
    const pack = readFileSync(`js/i18n/${locale}.js`, 'utf8');
    assert.match(pack, /adminRewardSettingsTitle:/, `${locale} has the reward panel title`);
    assert.match(pack, /adminRewardSettingsGuildMasterR5:/, `${locale} has the R5 option`);
  }
});

test('the R5 holds guild master inside the support quota, so the quota is the row count', () => {
  const rows = ['alpha', 'malakabo', 'beta', 'gamma', 'delta', 'epsilon'].map((playerKey) => ({
    playerKey,
  }));
  const options = { familyKeyOf: (row) => row.playerKey, r5FamilyKey: 'malakabo' };

  // Default support quota is 4: the R5 plus three OTHER support players.
  const byDefault = allocateSupportRewards(null, rows, { ...options, r5Row: rows[1] });
  assert.deepEqual(
    byDefault.map(({ row, reward }) => [row?.playerKey, reward]),
    [
      ['malakabo', 'guild_master'],
      ['alpha', 'core'],
      ['beta', 'core'],
      ['gamma', 'core'],
    ]
  );
  assert.equal(guildMasterIsReserved(null), true);
  assert.equal(supportSlotCount(null), 4);
  assert.equal(announcementSlotCount(null), 20);

  // An R5 with no support work (no scored row) still holds it by name.
  const noSupport = allocateSupportRewards(
    null,
    rows.filter((row) => row.playerKey !== 'malakabo'),
    {
      ...options,
      r5Row: null,
    }
  );
  assert.equal(noSupport[0].row, null);
  assert.equal(noSupport[0].reward, 'guild_master');
  assert.equal(noSupport.length, 4);

  // Quotas re-flow: a smaller support quota keeps the R5 and trims the rest.
  const two = allocateSupportRewards({ quotas: { support: 2 } }, rows, options);
  assert.deepEqual(
    two.map(({ row }) => row?.playerKey ?? null),
    [null, 'alpha']
  );
  assert.equal(announcementSlotCount({ quotas: { support: 2, contribution: 5 } }), 2 + 5 + 3 + 3);

  // A quota of 0 is the one case where the R5 adds a row: the reward is never
  // left unheld, so the table shows the R5 alone rather than nobody.
  assert.equal(supportSlotCount({ quotas: { support: 0 } }), 1);
  assert.equal(
    allocateSupportRewards({ quotas: { support: 0 } }, rows, { ...options, r5Row: rows[1] }).length,
    1
  );

  // support_top1: the top scorer holds it inside the quota, nothing reserved.
  const top1 = allocateSupportRewards({ guildMasterSource: 'support_top1' }, rows, options);
  assert.deepEqual(
    top1.map(({ row, reward }) => [row.playerKey, reward]),
    [
      ['alpha', 'guild_master'],
      ['malakabo', 'core'],
      ['beta', 'core'],
      ['gamma', 'core'],
    ]
  );
  assert.equal(supportSlotCount({ guildMasterSource: 'support_top1' }), 4);
  assert.equal(announcementSlotCount({ guildMasterSource: 'support_top1' }), 20);

  // No R5 named: nothing is reserved either.
  assert.equal(guildMasterIsReserved({ r5PlayerKey: '' }), false);
});

test('Support Work quotas 0, 1 and 2 always leave one guild-master holder, in both modes', () => {
  const rows = ['alpha', 'malakabo', 'beta'].map((playerKey) => ({ playerKey }));
  const options = { familyKeyOf: (row) => row.playerKey, r5FamilyKey: 'malakabo' };
  const shape = (allocation) =>
    allocation.map(({ row, reward }) => [row?.playerKey ?? null, reward]);

  const cases = [
    // Reserved R5: the R5 is always first and counts inside the quota.
    { settings: {}, support: 0, slots: 1, expected: [['malakabo', 'guild_master']] },
    { settings: {}, support: 1, slots: 1, expected: [['malakabo', 'guild_master']] },
    {
      settings: {},
      support: 2,
      slots: 2,
      expected: [
        ['malakabo', 'guild_master'],
        ['alpha', 'core'],
      ],
    },
    // support_top1: the top scorer holds it, and a quota of 0 does not empty the table.
    {
      settings: { guildMasterSource: 'support_top1' },
      support: 0,
      slots: 1,
      expected: [['alpha', 'guild_master']],
    },
    {
      settings: { guildMasterSource: 'support_top1' },
      support: 1,
      slots: 1,
      expected: [['alpha', 'guild_master']],
    },
    {
      settings: { guildMasterSource: 'support_top1' },
      support: 2,
      slots: 2,
      expected: [
        ['alpha', 'guild_master'],
        ['malakabo', 'core'],
      ],
    },
  ];
  for (const { settings, support, slots, expected } of cases) {
    const configured = { ...settings, quotas: { support } };
    const label = `${configured.guildMasterSource || 'r5'} quota ${support}`;
    assert.deepEqual(
      shape(allocateSupportRewards(configured, rows, { ...options, r5Row: rows[1] })),
      expected,
      label
    );
    assert.equal(supportSlotCount(configured), slots, label);
  }

  // No R5 named behaves like support_top1 at quota 0.
  assert.deepEqual(
    shape(allocateSupportRewards({ r5PlayerKey: '', quotas: { support: 0 } }, rows)),
    [['alpha', 'guild_master']]
  );
  // With no support rows at all there is nobody to hand it to.
  assert.deepEqual(
    allocateSupportRewards({ guildMasterSource: 'support_top1', quotas: { support: 0 } }, []),
    []
  );
});
