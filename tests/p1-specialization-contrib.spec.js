import { test, expect } from '@playwright/test';

test('workbook costs stay public without exposing community contribution controls', async ({ page }) => {
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

  // This release workbook covers all 735 canonical nodes for the active troop.
  // Keep the sign-in message visible, show the source evidence, and expose no
  // submission or review fields while there is no outstanding unknown cost.
  const contributionNodes = page.locator('.spec-contrib-node');
  const contributionNodeCount = await contributionNodes.count();
  expect(contributionNodeCount).toBe(735);
  await expect(page.locator('.spec-contrib-stage--source')).toHaveCount(735);
  await expect(page.locator('[data-spec-node-medal]')).toHaveCount(0);
  await expect(page.locator('[data-spec-node-reviewer]')).toHaveCount(0);
  await expect(page.locator('[data-spec-node-reviewed-medal]')).toHaveCount(0);
  await expect(page.locator('[data-spec-node-contributor]')).toHaveCount(0);
});
