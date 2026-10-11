import { expect, test } from '@playwright/test';

test.setTimeout(120000);
test.use({ reducedMotion: 'reduce' });

async function openAdmin(page, theme) {
  await page.route('https://www.googletagmanager.com/**', (route) => route.abort());
  await page.route('https://firestore.googleapis.com/**', (route) => route.abort());
  await page.route('https://www.gstatic.com/firebasejs/**', (route) => route.abort());
  await page.addInitScript((selectedTheme) => {
    window.VTS_ADMIN_LOCAL_TEST_AUTH = true;
    localStorage.setItem('vts_admin_local_test_auth', '1');
    localStorage.setItem('vts_maintenance_bypass', '1');
    localStorage.setItem('vts_hero_lang', 'en');
    localStorage.setItem('vts_theme', selectedTheme);
    localStorage.setItem('vts_admin_eden_workspace', 'eden-x2');
  }, theme);
  await page.goto('/admin.html', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#dashApp')).toBeVisible({ timeout: 25000 });
  await page.waitForFunction(() => typeof window.switchDashSubtab === 'function');
}

for (const viewport of [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'mobile', width: 390, height: 844 },
]) {
  for (const theme of ['dark', 'light']) {
    test(`command center is usable on ${viewport.name} in ${theme}`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await openAdmin(page, theme);
      const command = page.locator('.dash-command-center');
      await expect(command).toBeVisible();
      await expect(command.locator('[data-admin-action="season"]')).toBeVisible();
      await expect(command.locator('[data-admin-action="recovery"]')).toBeVisible();
      await expect(command.locator('#dashOperatorRole')).toHaveText('Super Admin');
      const box = await command.boundingBox();
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 2);
      for (const button of await command.locator('button:visible').all()) {
        const bounds = await button.boundingBox();
        expect(bounds.height).toBeGreaterThanOrEqual(44);
        expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width + 2);
      }
      await command.screenshot({
        path: testInfo.outputPath(`admin-${viewport.name}-${theme}.png`),
        animations: 'disabled',
      });
      await command.locator('[data-admin-action="uploads"]').click();
      await expect(page.locator('#dashSubtabUploadStructures')).toBeVisible();
      await command.locator('[data-admin-action="season"]').click();
      await expect(page.locator('#dashSubtabSeasonLifecycle')).toBeVisible();
      await command.locator('[data-admin-action="operations"]').click();
      await expect(page.locator('#dashSubtabOperations')).toBeVisible();
      await expect(page.locator('#dashOperationsRoot')).not.toBeEmpty();
    });
  }
}
