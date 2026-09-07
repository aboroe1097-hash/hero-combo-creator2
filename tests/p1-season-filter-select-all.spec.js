import { expect, test } from '@playwright/test';

async function open(page, hash) {
  await page.route('https://www.googletagmanager.com/**', (route) => route.abort());
  await page.addInitScript(() => {
    localStorage.setItem('vts_maintenance_bypass', '1');
    localStorage.setItem('vts_intro_v1_seen', '1');
    localStorage.setItem('vts_hero_lang', 'en');
  });
  await page.goto(`/#${hash}`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).toHaveClass(/app-ready/, { timeout: 30000 });
}

const strips = [
  ['generator', '#generatorSeasonFilters', '#generatorSeasonCatchupHint'],
  ['manual', '#seasonFilters', '#seasonCatchupHint'],
];

for (const [hash, strip, hint] of strips) {
  test(`${hash} season filter selects every season and returns to its defaults`, async ({
    page,
  }) => {
    await open(page, hash);
    const all = page.locator(`${strip} [data-season-select-all]`);
    const pills = page.locator(`${strip} label.filter-pill:not(.hidden) input`);
    await expect(all).toBeVisible();
    await expect(all).toHaveAttribute('aria-pressed', 'false');

    const total = await pills.count();
    const defaults = await page.locator(`${strip} input:checked`).count();
    expect(defaults).toBeLessThan(total);

    await all.click();
    await expect(all).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator(`${strip} input:checked`)).toHaveCount(total);

    // Pressing again restores that strip's defaults rather than clearing the
    // filter — an empty season selection is not a state the tools can render.
    await all.click();
    await expect(all).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator(`${strip} input:checked`)).toHaveCount(defaults);

    // Unchecking one season on its own has to drop the pressed state too.
    await all.click();
    await page.locator(`${strip} label.filter-pill:not(.hidden)`).first().click();
    await expect(all).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator(`${strip} input:checked`)).toHaveCount(total - 1);
  });

  test(`${hash} season filter explains the X10 and X12 brackets`, async ({ page }) => {
    await open(page, hash);
    await page.locator(`${strip} [data-season-select-all]`).click();
    const cards = page.locator(`${hint} .season-catchup-card`);
    // X10 is an optional bracket, not a catch-up, so its card is titled apart
    // from the other four and says what it does and does not carry.
    await expect(cards).toHaveCount(5);
    const byBadge = (season) =>
      cards.filter({
        has: page.locator('.season-catchup-badge', { hasText: new RegExp(`^${season}$`) }),
      });
    const x10 = byBadge('X10');
    // Uppercasing is CSS, so the assertions read the authored casing.
    await expect(x10).toContainText('X10 optional bracket');
    await expect(x10).toContainText('Eden never has it');
    await expect(x10).toContainText('no new research');
    const x12 = byBadge('X12');
    await expect(x12).toContainText('X12 catch-up');
    await expect(x12).toContainText('X9 through X12');
    await expect(x12).toContainText('X8 to X12 without X10');
  });
}

test('select-all stays reachable and keeps the strip inside the viewport on a phone', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page, 'generator');
  const all = page.locator('#generatorSeasonFilters [data-season-select-all]');
  await all.scrollIntoViewIfNeeded();
  const box = await all.boundingBox();
  expect(box.height).toBeGreaterThanOrEqual(40);
  await all.click();
  await expect(all).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true
  );
});
