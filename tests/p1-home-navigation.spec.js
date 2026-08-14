import { expect, test } from '@playwright/test';

const navigationPlacements = new Map([
  [
    640,
    {
      tabStrife: 'more',
      tabEdenMap: 'more',
      tabHeroesCombos: 'primary',
      tabResearchTowers: 'primary',
      tabAllStarBoh: 'primary',
      tabVtsScore: 'primary',
      tabYouTube: 'more',
      tabArcade: 'more',
    },
  ],
  // Eden Map is the third hub, so it is primary from the plain desktop rail up.
  [641, { tabStrife: 'more', tabEdenMap: 'primary', tabYouTube: 'more', tabVtsScore: 'primary' }],
  [1439, { tabStrife: 'more', tabEdenMap: 'primary', tabYouTube: 'more', tabVtsScore: 'primary' }],
  [
    1440,
    {
      tabStrife: 'primary',
      tabEdenMap: 'primary',
      tabYouTube: 'primary',
      tabVtsScore: 'primary',
    },
  ],
  [
    1760,
    {
      tabStrife: 'primary',
      tabEdenMap: 'primary',
      tabYouTube: 'primary',
      tabVtsScore: 'primary',
    },
  ],
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

  await expect(page.locator('#betaNote')).toBeVisible();
  await expect(page.locator('#betaNote')).toContainText(/^v\d+\.\d+\.\d+/);
  await expect
    .poll(() =>
      page.locator('#tabNavScroll .tab-pill').evaluateAll((tabs) => tabs.map((tab) => tab.id))
    )
    .toEqual(['tabHeroesCombos', 'tabResearchTowers', 'tabAllStarBoh', 'tabVtsScore']);

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
  await expect.poll(() => navigationPlacement(page, 'tabYouTube')).toBe('more');
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

test('shared tab hashes resolve case-insensitively and restore canonical casing', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  const routeCases = ['allstarboh', 'ALLSTARBOH', 'AllStarBoh', 'aLlStArBoH', 'allStarBoh'];
  for (const hash of routeCases) {
    await openHome(page, `/#${hash}`);
    await expect(page.locator('#allStarBohSection')).toBeVisible();
    await expect(page.locator('body')).toHaveAttribute('data-active-tab', 'allStarBoh');
    await expect(page.locator('#skipCurrentTool')).toHaveAttribute('href', '#allStarBohSection');
    await expect(page).toHaveURL(/#allStarBoh$/);
  }
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
  await expect(skipLink).toHaveAttribute('href', '#heroesCombosSection');
  await page.keyboard.press('Enter');
  await expect.poll(() => activeElementId(page)).toBe('heroesCombosSection');

  const moreButton = page.locator('#shellMoreButton');
  await moreButton.focus();
  await page.keyboard.press('Enter');
  await expect.poll(() => activeElementId(page)).toBe('shellMoreClose');
  // Eden Loyalty lives inside the VTS Eden Hub as a sub-tab.
  await page.locator('#tabEdenMap').click();
  await expect(page.locator('#edenMapSection')).toBeVisible();
  await page.locator('[data-eden-subtab="loyalty"]').click();
  await expect(page.locator('[data-eden-subtab-panel="loyalty"] .loyalty-root')).toBeVisible({
    timeout: 20000,
  });
  await expect(skipLink).toHaveAttribute('href', '#edenMapSection');

  await skipLink.focus();
  await page.keyboard.press('Enter');
  await expect.poll(() => activeElementId(page)).toBe('edenMapSection');

  await page.goBack();
  await expect(page.locator('#heroesCombosSection')).toBeVisible();
  await expect(skipLink).toHaveAttribute('href', '#heroesCombosSection');

  await page.evaluate(() => {
    window.location.hash = '#research';
  });
  // #research still deep-links to Research, now as a hub sub-tab, so the skip
  // link targets the hub panel that contains it.
  await expect(page.locator('#researchSection')).toBeVisible();
  await expect(skipLink).toHaveAttribute('href', '#researchTowersSection');

  await page.goBack();
  await expect(page.locator('#heroesCombosSection')).toBeVisible();
  await expect(skipLink).toHaveAttribute('href', '#heroesCombosSection');
});

test('rendered Home tab scroll paths use auto under reduced motion', async ({ page }) => {
  await page.setViewportSize({ width: 641, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openHome(page);

  await page.evaluate(() => {
    const scrollContainer = document.getElementById('tabNavScroll');
    const researchTab = document.getElementById('tabResearchTowers');
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
  await page.locator('[data-hub-subtab="research"]').click();

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
