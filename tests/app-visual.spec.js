import { expect, test } from '@playwright/test';

async function openApp(page) {
  await page.route('**/js/maintenance-config.js*', route => route.fulfill({
    contentType: 'application/javascript',
    body: 'window.VTS_MAINTENANCE_MODE=false; window.VTS_MAINTENANCE_CONFIG={};'
  }));
  await page.addInitScript(() => {
    localStorage.setItem('vts_intro_v1_seen', '1');
    localStorage.setItem('vts_quick_tour_done', '1');
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
        caret-color: transparent !important;
      }
    `
  });
  await expect(page.locator('#tabGenerator')).toBeVisible();
  await expect(page.locator('#generatorSection')).toBeVisible();
  await expect(page.locator('#appBootSplash')).toBeHidden({ timeout: 10000 });
  await expect(page.locator('#firstVisitIntro')).toBeHidden({ timeout: 10000 });
  await expect(page.locator('.quick-tour-overlay')).toBeHidden({ timeout: 10000 });
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
    await expect(page.locator('#generatorHeroes .generator-card').first()).toBeVisible();
    await page.waitForTimeout(500);
    const box = await page.locator('#generatorSection').boundingBox();
    expect(box).not.toBeNull();
    const screenshot = await page.screenshot({
      animations: 'disabled',
      mask: [page.locator('#generatorSection img')],
      clip: {
        x: Math.max(0, Math.floor(box.x)),
        y: Math.max(0, Math.floor(box.y)),
        width: Math.ceil(Math.min(box.width, 1440)),
        height: Math.ceil(Math.min(box.height, 404))
      }
    });
    expect(screenshot).toMatchSnapshot('combo-generator-default.png', { maxDiffPixelRatio: 0.02 });
  });

  test('eden map planner default layout', async ({ page }) => {
    await openApp(page);
    await page.locator('#tabEdenMap').click();
    await expect(page.locator('#edenMapSection')).toBeVisible();
    await expect(page.locator('#edenMapRoot')).toBeVisible({ timeout: 15000 });
    await expectCanvasPainted(page, '#edenMapCanvas');
    const screenshot = await page.locator('#edenMapRoot').screenshot({
      animations: 'disabled',
    });
    expect(screenshot).toMatchSnapshot('eden-map-default.png', { maxDiffPixelRatio: 0.06 });
  });
});
