import { test, expect } from '@playwright/test';

// The building upgrade planner used to be a top-level shell tab. It now lives inside
// the Planners ▸ Castle panel, so this covers the mount point, the heading level that
// came with the move, and the in-place search filter.
test('the building upgrade planner mounts inside Planners > Castle', async ({ page }) => {
  test.slow();
  await page.route('https://www.googletagmanager.com/**', (route) => route.abort());
  await page.addInitScript(() => {
    localStorage.setItem('vts_maintenance_bypass', '1');
    localStorage.setItem('vts_intro_v1_seen', '1');
  });
  await page.goto('/#research', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).toHaveClass(/app-ready/, { timeout: 30000 });
  await expect(page.locator('#researchSection')).toBeVisible({ timeout: 20000 });

  // The shell no longer carries the tab or its panel.
  await expect(page.locator('#tabBuildings')).toHaveCount(0);
  await expect(page.locator('#buildingsSection')).toHaveCount(0);

  const planners = page.locator('#plannersSection');
  await expect(planners).toBeVisible({ timeout: 20000 });
  await planners.locator('[data-pln-tab="castle"]').click();

  const tool = planners.locator('.building-upgrades-host .building-upgrades-tool');
  await expect(tool).toBeVisible({ timeout: 20000 });
  // A nested panel cannot carry the document's h1.
  await expect(tool.locator('.building-tool-header h2')).toHaveText('Buildings');
  await expect(tool.locator('.building-tool-header h1')).toHaveCount(0);

  await tool.locator('[data-building-mode="all"]').click();
  // The count comes from the dataset, not a literal in the markup.
  await expect(tool.locator('.building-hero-card__art--monogram span')).toHaveText('43');
  await expect(tool.locator('.building-row-card')).toHaveCount(43);
  await expect(tool.locator('.building-row-card:not([hidden])')).toHaveCount(43);

  // The list is filtered in place, so typing never rebuilds the field being typed in.
  const search = tool.locator('#buildingSearch');
  await search.click();
  await search.type('dist', { delay: 20 });
  await expect(tool.locator('.building-row-card:not([hidden])')).toHaveCount(1);
  await expect(search).toHaveValue('dist');
  await expect(search).toBeFocused();
  await expect(tool.locator('[data-building-count]')).toHaveText('1 of 43');

  await search.fill('');
  await expect(tool.locator('.building-row-card:not([hidden])')).toHaveCount(43);
  await expect(tool.locator('[data-building-count]')).toHaveText('43 of 43');
});
