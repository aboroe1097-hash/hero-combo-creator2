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

  await page.locator('.spec-contrib-column').first().locator('summary').click();

  // A node the workbook has already placed states its verified cost and offers no
  // submission field at all.
  const verified = page.locator('[data-contribution-key="training1:2"]');
  await expect(verified.locator('.spec-contrib-stage--source')).toHaveCount(1);
  await expect(verified.locator('[data-spec-node-medal]')).toHaveCount(0);

  // The one node the workbook left unplaced keeps the field, inert while signed out.
  const unverified = page.locator('[data-contribution-key="enhanced3:33"]');
  await expect(unverified.locator('[data-spec-node-medal]')).toBeDisabled();
  await expect(page.locator('[data-spec-node-contributor]')).toHaveCount(0);
});
