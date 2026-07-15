import { expect, test } from '@playwright/test';

async function openTool(page, { hash, marker, section }) {
  let uncaughtPageError = null;
  const pageErrors = [];
  page.on('pageerror', (error) => {
    uncaughtPageError ||= error;
    pageErrors.push(error.message);
  });
  await page.route('https://www.googletagmanager.com/**', (route) => route.abort());
  await page.addInitScript(() => {
    localStorage.setItem('vts_maintenance_bypass', '1');
    localStorage.setItem('vts_intro_v1_seen', '1');
    localStorage.removeItem('vts_dm_material_planner_v2');
    localStorage.removeItem('vts_research_v1');
    localStorage.removeItem('vts_research_collapsed_seasons_v1');
    localStorage.removeItem('vts_research_expanded_seasons_v1');
  });

  await page.goto(`/#${hash}`, { waitUntil: 'domcontentloaded' });
  await expect
    .poll(
      async () => {
        if (uncaughtPageError) throw uncaughtPageError;
        return page.locator('body').getAttribute('class');
      },
      { timeout: 30000 }
    )
    .toMatch(/app-ready/);
  await expect(page.locator(section)).toBeVisible({ timeout: 20000 });
  await expect(page.locator(marker).first()).toBeVisible({ timeout: 20000 });
  return pageErrors;
}

test('Dragon progress has a localized visible name and updates its value text', async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem('vts_hero_lang', 'de'));
  const pageErrors = await openTool(page, {
    hash: 'materials',
    marker: '#materialCalculatorRoot .dm-summary-panel',
    section: '#materialsSection',
  });
  expect(pageErrors).toEqual([]);
  await expect.poll(() => page.evaluate(() => localStorage.getItem('vts_hero_lang'))).toBe('de');
  await expect(page.locator('html')).toHaveAttribute('lang', 'de');

  const progressLabel = page.locator('#dmProgressLabel');
  const progress = page.getByRole('progressbar', { name: 'Gesamtfortschritt' });

  await expect(progressLabel).toBeVisible();
  await expect(progressLabel).toHaveText('Gesamtfortschritt');
  await expect(progress).toHaveAttribute('aria-valuemin', '0');
  await expect(progress).toHaveAttribute('aria-valuemax', '100');
  await expect(progress).toHaveAttribute('aria-valuenow', '0');
  await expect(progress).toHaveAttribute('aria-valuetext', '0%. 0 / 30 Goldteile');

  await page.locator('.dm-recipe-panel [data-dm-toggle-complete]').click();

  await expect(progress).toHaveAttribute('aria-valuenow', '3');
  await expect(progress).toHaveAttribute('aria-valuetext', '3%. 1 / 30 Goldteile');
});

test('Research top-buff previews expose their accessible group name', async ({ page }) => {
  await openTool(page, {
    hash: 'research',
    marker: '#techListContainer .research-tech-card',
    section: '#researchSection',
  });

  const preview = page.locator('.research-card-buff-preview[role="group"]').first();

  await expect(preview).toBeVisible();
  await expect(preview).toHaveAttribute('role', 'group');
  await expect(preview).toHaveAccessibleName('Top buffs');
  await expect(preview.locator('.research-card-buff-pill').first()).toBeVisible();
});
