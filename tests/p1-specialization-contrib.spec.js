import { test, expect } from '@playwright/test';

test('node data contributions require a signed-in account', async ({ page }) => {
  test.setTimeout(120000);
  await page.route('https://www.googletagmanager.com/**', (route) => route.abort());
  await page.addInitScript(() => {
    localStorage.setItem('vts_maintenance_bypass', '1');
    localStorage.setItem('vts_intro_v1_seen', '1');
  });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  // Towers Specialization is the default sub-tab of the Research & Towers Hub.
  await page.locator('#tabResearchTowers').click();
  const community = page.locator('.spec-community');
  await expect(community).toBeVisible();

  await expect(community).toHaveAttribute('data-contrib-signed-in', 'false');
  await expect(page.locator('.spec-contrib-signin')).toBeVisible();

  const medal = page.locator('[data-spec-node-medal]').first();
  await expect(medal).toBeDisabled();
  await expect(page.locator('[data-spec-node-contributor]')).toHaveCount(0);
});
