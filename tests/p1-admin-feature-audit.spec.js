import { expect, test } from '@playwright/test';
import { installAdminCloudFixture } from './helpers/admin-cloud-fixture.js';

test.setTimeout(90000);
test.use({ actionTimeout: 15000, reducedMotion: 'reduce' });

async function openAdmin(page, options = {}) {
  await installAdminCloudFixture(page, options);
  await page.goto('/admin.html', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#dashApp')).toBeVisible({ timeout: 25000 });
  await expect(page.locator('#dashOperatorRole')).toHaveText(
    options.superadmin === false ? 'Admin' : 'Super Admin'
  );
}

for (const theme of ['dark', 'light']) {
  test(`season, recovery and operations forms fit desktop and mobile in ${theme}`, async ({
    page,
  }, testInfo) => {
    await openAdmin(page, { theme });
    await page.locator('[data-admin-action="season"]').click();
    await expect(page.locator('#dashNewSeasonNumber')).toBeVisible();
    await page.locator('#dashNewSeasonNumber').fill('8');
    await expect(page.locator('#dashSeasonStartBtn')).toHaveText('Start X8 season');
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await page.locator('#dashSeasonStartCard').scrollIntoViewIfNeeded();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)
      ).toBe(true);
      await page.locator('#dashSeasonLifecycleRoot').screenshot({
        path: testInfo.outputPath(`season-${width}-${theme}.png`),
        animations: 'disabled',
      });
    }
    await page.locator('[data-admin-action="recovery"]').click();
    await expect(page.locator('#dashSeasonRecoveryCard')).toBeFocused();
    await page.locator('[data-admin-action="operations"]').click();
    await expect(page.locator('[data-operations-form]')).toBeVisible();
    await expect(page.locator('[name="notice"]')).toHaveValue('Audit notice');
    await page
      .locator('#dashOperationsRoot')
      .screenshot({ path: testInfo.outputPath(`operations-${theme}.png`), animations: 'disabled' });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true
    );
  });
}

test('mobile picker reaches alliance tools, preserves selection and keeps leadership private', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openAdmin(page, { superadmin: false });
  await expect(page.locator('#dashToolSelect')).toBeVisible();
  await expect(page.locator('.dash-subtab-nav:visible')).toHaveCount(0);
  await expect(page.locator('#dashToolSelect option[value="seasonLifecycle"]')).toHaveCount(0);
  await expect(page.locator('#dashToolSelect option[value="userRoles"]')).toHaveCount(0);
  await expect(page.locator('#dashToolSelect option[value="complaints"]')).toHaveCount(0);
  await page.locator('#dashToolSelect').selectOption('throneBuffs');
  await expect(page.locator('#throneWeekPicker')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('#dashToolContext')).toContainText('Alliance-wide');
  await expect(page).toHaveURL(/tool=throneBuffs/);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('#throneWeekPicker')).toBeVisible();
  await expect(page.locator('#dashToolSelect')).toHaveValue('throneBuffs');
  await page.locator('#dashToolSelect').selectOption('operations');
  await expect(page.locator('[data-refresh-errors]')).toBeVisible();
  await expect(page.locator('[data-operations-form]')).toHaveCount(0);
  await page.evaluate(() => window.switchDashSubtab('seasonLifecycle'));
  await expect(page.locator('#dashSubtabSeasonLifecycle')).toBeHidden();
});

test('each desktop navigation group has a keyboard entry and skips unavailable tabs', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openAdmin(page, { superadmin: false });
  const groups = page.locator('.dash-subtab-group:visible');
  for (const group of await groups.all()) {
    await expect(group.locator('.dash-subtab-btn[tabindex="0"]:visible')).toHaveCount(1);
  }
  const signups = page.locator('[data-subtab="bohSignups"]');
  await signups.focus();
  await signups.press('ArrowRight');
  await expect(page.locator('[data-subtab="allStarBoh"]')).toBeFocused();
  await expect(page.locator('#dashSubtabAllStarBoh')).toBeVisible();
  for (const group of await groups.all()) {
    await expect(group.locator('.dash-subtab-btn[tabindex="0"]:visible')).toHaveCount(1);
  }
});

test('Super Admin can prepare an empty X8 draft, import reviewed management results and publish', async ({
  page,
}) => {
  await openAdmin(page);
  page.on('dialog', (dialog) => dialog.accept());
  await page.locator('[data-admin-action="season"]').click();
  await page.locator('#dashNewSeasonNumber').fill('8');
  await page.locator('#dashNewSeasonLabel').fill('Autumn X8');
  await page.locator('#dashSeasonStartBtn').click();
  await expect(page.locator('#dashWorkspaceSelect')).toHaveValue('eden-x8', { timeout: 20000 });
  expect(
    await page.evaluate(
      () => window.__auditRecords.get('eden_seasons/eden-x8/data/dashboard').attacks
    )
  ).toEqual([]);
  expect(await page.evaluate(() => window.__auditRecords.has('vts_admin/public_season'))).toBe(
    false
  );
  await page.locator('[data-admin-action="season"]').click();
  await page.locator('#dashManagementVotesFile').setInputFiles({
    name: 'reviewed.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('Name,Votes\nReviewed Winner,12'),
  });
  await expect(page.locator('#dashManagementVotesPreview')).toContainText('Reviewed Winner (12)');
  await page.locator('#dashManagementVotesSaveBtn').click();
  await expect(page.locator('#dashManagementVotesPreview')).toContainText('Saved.');
  await page.locator('#dashWorkspacePublishBtn').click();
  await expect
    .poll(() =>
      page.evaluate(() => window.__auditRecords.get('vts_admin/public_season')?.workspaceId)
    )
    .toBe('eden-x8');
  expect(
    await page.evaluate(
      () => window.__auditRecords.get('eden_seasons/eden-x8/publications/1').published
    )
  ).toBe(true);
});

test('operations saves, refuses concurrent edits and confirms report removal', async ({ page }) => {
  await openAdmin(page);
  await page.locator('[data-admin-action="operations"]').click();
  await page.locator('[name="notice"]').fill('Temporary test notice');
  await page.locator('[name="feature"][value="votes"]').check();
  await page.locator('[data-operations-form] button').click();
  await expect(page.locator('[data-operations-status]')).toContainText('saved');
  await expect(page.locator('[data-operations-summary]')).toContainText('Temporary test notice');
  await expect(page.locator('[data-operations-summary]')).toContainText('Paused features: Voting');
  expect(
    await page.evaluate(
      () => window.__auditRecords.get('vts_admin/operations_config').disabledFeatures
    )
  ).toEqual(['votes']);
  await page.locator('[name="notice"]').fill('Unsaved edit');
  await page.evaluate(() =>
    window.__auditExternalUpdate(
      { path: 'vts_admin/operations_config' },
      {
        revision: 3,
        notice: 'Another operator',
        readOnly: false,
        disabledFeatures: [],
        expiresAtMs: 0,
      }
    )
  );
  await expect(page.locator('[data-operations-status]')).toContainText('Another operator');
  await expect(page.locator('[data-operations-summary]')).toContainText('Another operator');
  await page.locator('[data-operations-form] button').click();
  expect(
    await page.evaluate(() => window.__auditRecords.get('vts_admin/operations_config').notice)
  ).toBe('Another operator');
  page.once('dialog', (dialog) => dialog.dismiss());
  await page.locator('[data-resolve-error]').click();
  await expect(page.locator('[data-resolve-error]')).toHaveCount(1);
  page.once('dialog', (dialog) => dialog.accept());
  await page.locator('[data-resolve-error]').click();
  await expect(page.locator('[data-operation-errors]')).toContainText('No recent errors');
});

test('ordinary Admin saves shared throne assignments and downloads an image with icons', async ({
  page,
}, testInfo) => {
  await openAdmin(page, { superadmin: false });
  await page.evaluate(() => window.switchDashSubtab('throneBuffs'));
  await page.locator('.throne-input-member').first().fill('王 محمد — Assignment');
  await page.locator('#throneSaveBtn').click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          [...window.__auditRecords.keys()].filter((path) =>
            path.startsWith('vts_admin/throne_buffs/records/')
          ).length
      )
    )
    .toBe(1);
  const download = page.waitForEvent('download');
  await page.locator('#throneExportBtn').click();
  await (await download).saveAs(testInfo.outputPath('throne-assignment.png'));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('.throne-input-member').first()).toHaveValue('王 محمد — Assignment');
});
