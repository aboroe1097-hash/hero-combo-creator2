import { test, expect } from '@playwright/test';

// The Specialization tab is the full in-tab tool again. These pin the two features that
// were ported onto it from the standalone planner, so a future "thin tab" change cannot
// silently drop them.

async function openTab(page) {
  await page.route('https://www.googletagmanager.com/**', (route) => route.abort());
  await page.addInitScript(() => {
    localStorage.setItem('vts_maintenance_bypass', '1');
    localStorage.setItem('vts_intro_v1_seen', '1');
  });
  await page.goto('/?tab=specialization#specialization', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#specializationToolRoot .spec-tool')).toBeVisible({ timeout: 30000 });
}

test('the tab renders the real tool, not a link-out card', async ({ page }) => {
  test.slow();
  await openTab(page);

  await expect(page.locator('.spec-planner-card')).toHaveCount(0);
  await expect(page.locator('[data-spec-research]').first()).toBeVisible();
  expect(await page.locator('[data-spec-research]').count()).toBe(32);
});

test('route presets annotate the tab badges and mark the next research', async ({ page }) => {
  test.slow();
  await openTab(page);

  const select = page.locator('[data-spec-route-select]');
  await expect(select).toBeVisible();
  await expect(select).toHaveValue('');
  expect(await page.locator('[data-route-next="true"]').count()).toBe(0);

  await select.selectOption('f2p');
  await expect(page.locator('[data-route-next="true"]')).toHaveCount(1);
  const f2pFirst = await page
    .locator('[data-route-next="true"] [data-spec-research]')
    .getAttribute('data-spec-research');

  await select.selectOption('spender');
  await expect(page.locator('[data-route-next="true"]')).toHaveCount(1);
  const spenderFirst = await page
    .locator('[data-route-next="true"] [data-spec-research]')
    .getAttribute('data-spec-research');

  expect(f2pFirst).toBe('encounter1');
  expect(spenderFirst).toBe('callofglory1');

  await select.selectOption('');
  expect(await page.locator('[data-route-next="true"]').count()).toBe(0);
});

test('easy medal fill offers quick fills inside the tab', async ({ page }) => {
  test.slow();
  await openTab(page);

  await expect(page.locator('[data-spec-medal-fill]')).toHaveCount(0);
  await page.locator('[data-spec-easy-medals]').click();
  await expect(page.locator('[data-spec-easy-medals]')).toHaveAttribute('aria-pressed', 'true');

  // Training I costs 1674 medals, so a 50% fill records 837.
  await page.locator('[data-spec-research="training1"]').click();
  await page.locator('[data-spec-medal-fill="50"]').click();
  await expect(page.locator('[data-spec-medals]')).toHaveValue('837');

  await page.locator('[data-spec-medal-fill="0"]').click();
  await expect(page.locator('[data-spec-medals]')).toHaveValue('');
});
