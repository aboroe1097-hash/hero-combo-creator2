import { expect, test } from '@playwright/test';

// The season lifecycle panel is the only place a season can be closed out, and
// it sits behind the second privilege level. This spec walks the superadmin
// reveal and the subtab dispatch, and proves the panel mounts whatever the
// registry read does — a dashboard that dies when the timeline is unreachable
// would take the publish and snapshot controls down with it.
async function bootAdmin(page) {
  await page.route('https://www.googletagmanager.com/**', (route) => route.abort());
  await page.addInitScript(() => {
    window.VTS_ADMIN_LOCAL_TEST_AUTH = true;
    localStorage.setItem('vts_admin_local_test_auth', '1');
    localStorage.setItem('vts_maintenance_bypass', '1');
    localStorage.setItem('vts_hero_lang', 'en');
    localStorage.setItem('vts_admin_eden_workspace', 'eden-x2');
    navigator.serviceWorker?.getRegistrations?.().then((registrations) => {
      registrations.forEach((registration) => registration.unregister());
    });
  });
  await page.goto('/admin.html', { waitUntil: 'load' });
  await expect(page.locator('#dashApp')).toBeVisible({ timeout: 20000 });
  await page.waitForFunction(() => typeof window.switchDashSubtab === 'function');
}

test('a superadmin reaches the season lifecycle panel', async ({ page }) => {
  await bootAdmin(page);

  const navButton = page.locator(
    '#ocrDashboardRoot .dash-subtab-btn[data-subtab="seasonLifecycle"]'
  );
  const panel = page.locator('#dashSubtabSeasonLifecycle');
  // The tab is revealed from the claim, which resolves on first use: asking for
  // it is what claims the superadmin level and opens the panel.
  await page.evaluate(() => window.switchDashSubtab('seasonLifecycle'));
  await expect(panel).toBeVisible();
  await expect(navButton).toBeVisible();
  await expect(navButton).toHaveAttribute('data-requires-superadmin', '');
  await expect(navButton).toContainText('Season Lifecycle');

  const root = page.locator('#dashSeasonLifecycleRoot');
  await expect(root).not.toBeEmpty();
  // Either the timeline rendered, or the panel says it could not reach it.
  // Both are a mounted panel; a blank root is not.
  await expect(root).toContainText(/Season lifecycle|unavailable|Loading/i);

  // The command strip stays usable, so a season can still be published or
  // exported from the same screen.
  await expect(page.locator('#dashWorkspaceSelect')).toBeVisible();
});
