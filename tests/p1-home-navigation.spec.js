import { expect, test } from '@playwright/test';

const navigationPlacements = new Map([
  [640, { tabStrife: 'more', tabLoyalty: 'more', tabYouTube: 'primary' }],
  [641, { tabStrife: 'more', tabLoyalty: 'more', tabYouTube: 'more' }],
  [1439, { tabStrife: 'more', tabLoyalty: 'more', tabYouTube: 'more' }],
  [1440, { tabStrife: 'primary', tabLoyalty: 'primary', tabYouTube: 'primary' }],
  [1760, { tabStrife: 'primary', tabLoyalty: 'primary', tabYouTube: 'primary' }],
]);

async function openHome(page, path = '/#generator') {
  await page.route('https://www.googletagmanager.com/**', (route) => route.abort());
  await page.addInitScript(() => {
    localStorage.setItem('vts_maintenance_bypass', '1');
    localStorage.setItem('vts_intro_v1_seen', '1');
  });
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).toHaveClass(/app-ready/, { timeout: 30000 });
  await page.waitForFunction(
    () =>
      document.documentElement.dataset.shellNavReady === '1' &&
      typeof window.vtsSwitchTab === 'function'
  );
}

async function activeElementId(page) {
  return page.evaluate(() => document.activeElement?.id || '');
}

async function navigationPlacement(page, id) {
  return page.locator(`#${id}`).evaluate((source) => {
    if (source.closest('#tabNavScroll')) return 'primary';
    if (source.closest('#shellMoreTools')) return 'more';
    return 'missing';
  });
}

async function expectOneUsefulHomeHeading(page) {
  const exposedHeadings = page.getByRole('heading', { level: 1 });
  const homeHeading = page.getByRole('heading', { level: 1, name: 'Hero Combo Creator' });
  await expect(exposedHeadings).toHaveCount(1);
  await expect(homeHeading).toHaveCount(1);
  await expect(homeHeading).toBeVisible();
}

test('Home navigation keeps its responsive placement and More keyboard focus contract', async ({
  page,
}) => {
  await page.setViewportSize({ width: 640, height: 900 });
  await openHome(page);

  for (const [width, expectedPlacements] of navigationPlacements) {
    await page.setViewportSize({ width, height: 900 });

    await expect
      .poll(async () =>
        Object.fromEntries(
          await Promise.all(
            Object.keys(expectedPlacements).map(async (id) => [
              id,
              await navigationPlacement(page, id),
            ])
          )
        )
      )
      .toEqual(expectedPlacements);

    for (const id of Object.keys(expectedPlacements)) {
      await expect(page.locator(`#${id}`)).toHaveCount(1);
    }

    if (width === 1440) await expectOneUsefulHomeHeading(page);
  }

  await page.setViewportSize({ width: 640, height: 900 });
  const moreButton = page.locator('#shellMoreButton');
  await moreButton.focus();
  await page.keyboard.press('Enter');
  await expect(moreButton).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#shellMorePanel')).toBeVisible();
  await expect.poll(() => activeElementId(page)).toBe('shellMoreClose');

  await page.keyboard.press('Escape');
  await expect(moreButton).toHaveAttribute('aria-expanded', 'false');
  await expect.poll(() => activeElementId(page)).toBe('shellMoreButton');
});

test('YouTube activation survives responsive reparenting and reaches its declared panel', async ({
  page,
}) => {
  await page.setViewportSize({ width: 640, height: 900 });
  await openHome(page);

  const youtubeTab = page.locator('#tabYouTube');
  await expect.poll(() => navigationPlacement(page, 'tabYouTube')).toBe('primary');
  await expect(youtubeTab).toHaveAttribute('aria-controls', 'youtubeSection');

  await page.setViewportSize({ width: 641, height: 900 });
  await expect.poll(() => navigationPlacement(page, 'tabYouTube')).toBe('more');

  await page.locator('#shellMoreButton').click();
  await expect(page.locator('#shellMorePanel')).toBeVisible();
  await youtubeTab.click();

  await expect(page.locator('#youtubeSection')).toBeVisible();
  await expect(page.locator('body')).toHaveAttribute('data-active-tab', 'youtube');
  await expect(youtubeTab).toHaveAttribute('aria-pressed', 'true');
  await expect(page).toHaveURL(/#youtube$/);
});

test('skip link follows active, lazy, hash, and Back navigation while preserving the mobile H1', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openHome(page);

  await expectOneUsefulHomeHeading(page);
  await expect(page.locator('#appTitle')).not.toHaveCSS('display', 'none');

  await page.keyboard.press('Tab');
  const skipLink = page.locator('#skipCurrentTool');
  await expect.poll(() => activeElementId(page)).toBe('skipCurrentTool');
  await expect(skipLink).toBeVisible();
  await expect(skipLink).toHaveAttribute('href', '#generatorSection');
  await page.keyboard.press('Enter');
  await expect.poll(() => activeElementId(page)).toBe('generatorSection');

  const moreButton = page.locator('#shellMoreButton');
  await moreButton.focus();
  await page.keyboard.press('Enter');
  await expect.poll(() => activeElementId(page)).toBe('shellMoreClose');
  await page.locator('#tabLoyalty').click();
  await expect(page.locator('#loyaltySection')).toBeVisible();
  await expect(page.locator('#loyaltySection .loyalty-root')).toBeVisible({ timeout: 20000 });
  await expect(skipLink).toHaveAttribute('href', '#loyaltySection');

  await skipLink.focus();
  await page.keyboard.press('Enter');
  await expect.poll(() => activeElementId(page)).toBe('loyaltySection');

  await page.goBack();
  await expect(page.locator('#generatorSection')).toBeVisible();
  await expect(skipLink).toHaveAttribute('href', '#generatorSection');

  await page.evaluate(() => {
    window.location.hash = '#research';
  });
  await expect(page.locator('#researchSection')).toBeVisible();
  await expect(skipLink).toHaveAttribute('href', '#researchSection');

  await page.goBack();
  await expect(page.locator('#generatorSection')).toBeVisible();
  await expect(skipLink).toHaveAttribute('href', '#generatorSection');
});

test('rendered Home tab scroll paths use auto under reduced motion', async ({ page }) => {
  await page.setViewportSize({ width: 641, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openHome(page);

  await page.evaluate(() => {
    const scrollContainer = document.getElementById('tabNavScroll');
    const researchTab = document.getElementById('tabResearch');
    if (!scrollContainer || !researchTab) throw new Error('Home navigation did not initialize');

    window.__p1HomeScrollCalls = { page: [], tabs: [] };
    window.scrollTo = (options) => window.__p1HomeScrollCalls.page.push(options);
    scrollContainer.scrollBy = (options) => window.__p1HomeScrollCalls.tabs.push(options);
    scrollContainer.getBoundingClientRect = () => ({
      x: 0,
      y: 0,
      top: 0,
      right: 320,
      bottom: 48,
      left: 0,
      width: 320,
      height: 48,
      toJSON: () => ({}),
    });
    researchTab.getBoundingClientRect = () => ({
      x: 480,
      y: 0,
      top: 0,
      right: 600,
      bottom: 48,
      left: 480,
      width: 120,
      height: 48,
      toJSON: () => ({}),
    });
    researchTab.click();
  });

  await expect(page.locator('#researchSection')).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => window.__p1HomeScrollCalls.page.at(-1)?.behavior))
    .toBe('auto');
  await expect
    .poll(() => page.evaluate(() => window.__p1HomeScrollCalls.tabs.at(-1)?.behavior))
    .toBe('auto');

  await page.evaluate(() => {
    window.__p1HomeScrollCalls.tabs.length = 0;
    document.getElementById('tabScrollRight')?.click();
  });
  await expect
    .poll(() => page.evaluate(() => window.__p1HomeScrollCalls.tabs.at(-1)?.behavior))
    .toBe('auto');
});
