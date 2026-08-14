import { expect, test } from '@playwright/test';

async function openApp(page) {
  await page.route('https://www.googletagmanager.com/**', route => route.abort());
  await page.addInitScript(() => {
    localStorage.setItem('vts_intro_v1_seen', '1');
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('body')).toHaveClass(/app-ready/, { timeout: 30000 });
  await expect(page.locator('#tabHeroesCombos')).toBeVisible();
  await expect(page.locator('#generatorSection')).toBeVisible();
  await expect(page.locator('.quick-tour-overlay')).toHaveCount(0);
  await page.evaluate(() => window.stop());
}

async function expectCanvasPainted(page, selector) {
  await expect.poll(async () => page.locator(selector).evaluate((canvas) => {
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    if (!ctx || !width || !height) return 0;
    const data = ctx.getImageData(0, 0, width, height).data;
    let painted = 0;
    let total = 0;
    const step = 24;
    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        const i = (y * width + x) * 4;
        total += 1;
        if (data[i + 3] > 120 && (data[i] + data[i + 1] + data[i + 2]) > 60) painted += 1;
      }
    }
    return total ? painted / total : 0;
  }), { timeout: 30000 }).toBeGreaterThan(0.03);
}

test.describe('visual regression', () => {
  test('combo generator default layout', async ({ page }) => {
    await openApp(page);
    await expect(page.locator('#generatorHeroes .generator-card').first()).toBeVisible({ timeout: 15000 });
    await page.locator('#generatorHeroes').scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await page.evaluate(() => window.stop());
    const box = await page.locator('#generatorHeroes').boundingBox();
    expect(box).not.toBeNull();
    const screenshot = await page.screenshot({
      animations: 'disabled',
      mask: [page.locator('#generatorHeroes img')],
      clip: {
        x: Math.max(0, Math.floor(box.x)),
        y: Math.max(0, Math.floor(box.y)),
        width: Math.ceil(Math.min(box.width, 1329)),
        height: Math.ceil(Math.min(box.height, 520))
      }
    });
    expect(screenshot).toMatchSnapshot('combo-generator-default.png', { maxDiffPixelRatio: 0.02 });
  });

  test('eden map planner default layout', async ({ page }) => {
    await openApp(page);
    await page.locator('#tabEdenMap').click();
    await expect(page.locator('#edenMapSection')).toBeVisible();
    await expect(page.locator('#edenMapRoot')).toBeVisible({ timeout: 15000 });
    await page.locator('[data-eden-subtab="map"]').click();
    await expectCanvasPainted(page, '#edenMapCanvas');
    await page.locator('#edenMapCanvas').scrollIntoViewIfNeeded();
    await page.evaluate(() => window.stop());
    const box = await page.locator('#edenMapCanvas').boundingBox();
    expect(box).not.toBeNull();
    const screenshot = await page.screenshot({
      animations: 'disabled',
      clip: {
        x: Math.max(0, Math.floor(box.x)),
        y: Math.max(0, Math.floor(box.y)),
        width: Math.ceil(box.width),
        height: Math.ceil(box.height)
      }
    });
    expect(screenshot).toMatchSnapshot('eden-map-default.png', { maxDiffPixelRatio: 0.06 });
  });
});
