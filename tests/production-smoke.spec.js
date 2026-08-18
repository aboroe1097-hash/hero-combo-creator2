import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';

const isRemotePreview = Boolean(String(process.env.PLAYWRIGHT_BASE_URL || '').trim());
const targetOrigin = new URL(
  String(process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4173').trim()
).origin;
const localIndex = readFileSync('dist/index.html', 'utf8');
const localBattleSimulator = readFileSync('dist/battle-simulator.html', 'utf8');
const localSpecializationTowers = readFileSync('dist/specialization-towers.html', 'utf8');
const localServiceWorker = readFileSync('dist/sw.js', 'utf8');
const localMaintenanceConfig = readFileSync('dist/js/maintenance-config.js', 'utf8');
const maintenanceEnabled = /window\.VTS_MAINTENANCE_MODE\s*=\s*true/u.test(localMaintenanceConfig);
const packageVersion = JSON.parse(readFileSync('package.json', 'utf8')).version;
const usesDeterministicCiFirebaseConfig =
  !isRemotePreview && process.env.VITE_FIREBASE_API_KEY === 'dummy';

function observeTargetFailures(page) {
  const failures = [];
  const isTarget = (url) => {
    try {
      return new URL(url).origin === targetOrigin;
    } catch {
      return false;
    }
  };

  page.on('response', (response) => {
    if (isTarget(response.url()) && response.status() >= 400) {
      failures.push(`${response.status()} ${response.url()}`);
    }
  });
  page.on('requestfailed', (request) => {
    const errorText = request.failure()?.errorText || 'request failed';
    // Navigating between standalone surfaces intentionally
    // aborts any late map/image requests from the previous document.
    if (isTarget(request.url()) && errorText !== 'net::ERR_ABORTED') {
      failures.push(`${errorText} ${request.url()}`);
    }
  });
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const text = message.text();
    // Chrome's generic resource error carries no URL, so it cannot be attributed to an
    // origin. It fired for third-party 404s (auth, reCAPTCHA) and failed runs that were
    // otherwise clean. Same-origin resource failures are already caught precisely, with
    // the full URL, by the origin-filtered response handler above.
    if (/^Failed to load resource/iu.test(text)) return;
    // A real reCAPTCHA Enterprise key embeds Google in a third-party iframe. Chrome
    // reports Google's own report-only frame-ancestors policy as a console error even
    // though the iframe loads and no same-origin Pages resource is blocked.
    if (
      /Framing 'https:\/\/www\.google\.com\/' violates the following report-only Content Security Policy directive: "frame-ancestors 'self'"/iu.test(
        text
      )
    ) {
      return;
    }
    if (
      /content security policy|failed to load module|dynamically imported module|\b404\b/iu.test(
        text
      )
    ) {
      failures.push(`${page.url()}: ${text}`);
    }
  });
  page.on('pageerror', (error) => {
    // Anonymous Auth is external to the static Pages artifact and can be throttled
    // after repeated local/preview smoke runs. Keep validating the rendered shell,
    // lazy chunks, service worker, and same-origin requests when that happens.
    if (/Firebase: Error \(auth\/too-many-requests\)\.?/iu.test(error.message)) return;
    // Pull-request verification intentionally builds with a deterministic,
    // non-secret Firebase placeholder. Ignore only the exact Auth rejection
    // caused by that placeholder; previews and production remain strict.
    if (
      usesDeterministicCiFirebaseConfig &&
      /^Firebase: Error \(auth\/api-key-not-valid\.-please-pass-a-valid-api-key\.\)\.?$/iu.test(
        error.message
      )
    ) {
      return;
    }
    failures.push(`${page.url()}: pageerror: ${error.message}`);
  });
  return failures;
}

test('public entry pages follow the release maintenance flag', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();

  for (const entryPath of [
    '/',
    '/admin.html',
    '/eden-x1.html',
    '/arcade.html',
    '/battle-simulator.html',
    '/specialization-towers.html',
    '/games/boot/b-merge-rush.html',
  ]) {
    await page.goto(entryPath, { waitUntil: 'domcontentloaded' });
    if (maintenanceEnabled) {
      await expect(page).toHaveURL(/\/maintenance\.html$/u);
      await expect(page.getByRole('heading', { name: 'Maintenance Mode' })).toBeVisible();
      await expect(page.getByRole('status')).toContainText('Work in progress');
    } else {
      await expect(page).not.toHaveURL(/\/maintenance\.html$/u);
    }
  }

  await context.close();
});

test('built Specialization Towers route is public, complete, and route-isolated', async ({
  page,
}) => {
  const failures = observeTargetFailures(page);
  const consoleErrors = [];
  const resourcePaths = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('request', (request) => {
    resourcePaths.push(new URL(request.url()).pathname);
  });
  await page.addInitScript(() => {
    localStorage.setItem('vts_maintenance_bypass', '1');
  });

  await page.goto('/specialization-towers.html', { waitUntil: 'domcontentloaded' });

  const mount = page.locator('#specializationTowersMount');
  await expect(mount).toBeVisible({ timeout: 30000 });
  await expect(page.locator('body')).not.toHaveClass(/\bis-locked\b/u);
  await expect(page.getByRole('dialog', { name: /Beta Testers Only/iu })).toHaveCount(0);

  const towerTabs = mount.locator('[data-specialization-tower-tabs]');
  await expect(towerTabs).toBeVisible();
  await expect(towerTabs.locator('button[data-specialization-tower]')).toHaveCount(3);

  const graph = mount.locator('[data-specialization-tower-graph]:visible');
  await expect(graph).toBeVisible();
  await expect(graph.locator('[data-specialization-column]')).toHaveCount(8);

  expect(
    resourcePaths.filter((path) => /(?:^|\/)battle-simulator(?:[-./]|$)/u.test(path)),
    'the built specialization route must not preload protected Battle Simulator assets'
  ).toEqual([]);
  expect(consoleErrors).toEqual([]);
  expect(failures).toEqual([]);
});

test('verified Pages artifact loads standalone pages, lazy chunks, and its service worker', async ({
  page,
  request,
}) => {
  const failures = observeTargetFailures(page);
  await page.addInitScript(() => {
    localStorage.setItem('vts_maintenance_bypass', '1');
    localStorage.setItem('vts_intro_v1_seen', '1');
    localStorage.setItem('vts_eden_dataset', 'season5');
  });
  expect(localServiceWorker).toContain("'/specialization-towers.html'");

  for (const [url, expectedBody] of [
    ['/index.html', localIndex],
    ['/battle-simulator.html', localBattleSimulator],
    ['/specialization-towers.html', localSpecializationTowers],
    ['/sw.js', localServiceWorker],
  ]) {
    const response = await request.get(url, { headers: { 'Cache-Control': 'no-cache' } });
    expect(response.ok(), `${url} should be present in the deployed artifact`).toBe(true);
    expect(await response.text(), `${url} should exactly match the verified local artifact`).toBe(
      expectedBody
    );
    if (isRemotePreview) {
      expect(response.headers()['cache-control'] || '').toMatch(/no-cache/iu);
    }
  }
  expect(localIndex).toContain(`v${packageVersion}`);
  expect(localIndex).toContain('<span data-i18n="loadingEllipsis">Loading…</span>');
  expect(localIndex).not.toContain('Loadingâ€¦');
  expect(localServiceWorker).not.toMatch(
    /\/assets\/(?:admin-all-star-boh-|all-star-boh-(?!bootstrap-))[^/'"]*\.js/iu
  );
  expect(localServiceWorker).toMatch(/\/assets\/all-star-boh-bootstrap-[^/'"]*\.js/iu);
  expect(localServiceWorker).toMatch(/\/assets\/all-star-boh-[^/'"]*\.css/iu);
  if (isRemotePreview) {
    const rootResponse = await request.get('/', { headers: { 'Cache-Control': 'no-cache' } });
    expect(rootResponse.ok()).toBe(true);
    expect(rootResponse.headers()['cache-control'] || '').toMatch(/no-cache/iu);
  }

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).toHaveClass(/app-ready/, { timeout: 30000 });

  await page.locator('#commandPaletteTrigger').click();
  await expect(page.locator('.cmdk-overlay')).toBeVisible();
  await page.locator('.cmdk-input').fill('Arcade');
  await expect(page.locator('.cmdk-item-label')).toHaveText('Arcade');
  await page.locator('.cmdk-input').press('Escape');
  await expect(page.locator('.cmdk-overlay')).toBeHidden();

  // A hub pill only opens its default sub-tab, so reaching the Hero Atlas and
  // Research chunks now takes a second click. Without `subtab` here the
  // hero-atlas and research chunks are never requested and the chunk assertion
  // below fails — which is what this loop exists to prove.
  const lazySurfaces = [
    { tab: '#tabHeroesCombos', marker: '#generatorHeroes' },
    { tab: '#tabHeroesCombos', subtab: 'heroes', marker: '#heroesTabContent .heroes-tab-inner' },
    { tab: '#tabResearchTowers', marker: '#specializationToolRoot .spec-tool' },
    { tab: '#tabResearchTowers', subtab: 'research', marker: '#techListContainer' },
    { tab: '#tabMaterials', marker: '#materialCalculatorRoot .dm-plan-panel' },
    { tab: '#tabStrife', marker: '#strifeToolRoot .strife-monster-card' },
    { tab: '#tabEdenMap', marker: '#edenMapRoot' },
  ];
  for (const { tab, subtab, marker } of lazySurfaces) {
    const tool = page.locator(tab);
    let openedMore = false;
    if (!(await tool.isVisible())) {
      await page.locator('#shellMoreButton').click();
      await expect(page.locator('#shellMorePanel')).toBeVisible();
      await expect(tool).toBeVisible();
      openedMore = true;
    }
    await tool.click();
    if (openedMore) await expect(page.locator('#shellMorePanel')).toBeHidden();
    if (subtab) await page.locator(`[data-hub-subtab="${subtab}"]`).click();
    await expect(page.locator(marker).first()).toBeVisible({ timeout: 30000 });
  }

  const allStarTab = page.locator('#tabAllStarBoh');
  await expect(page.locator('#allStarBohSection .tab-loading')).toHaveText('Loading…');
  let openedAllStarMore = false;
  if (!(await allStarTab.isVisible())) {
    await page.locator('#shellMoreButton').click();
    await expect(page.locator('#shellMorePanel')).toBeVisible();
    await expect(allStarTab).toBeVisible();
    openedAllStarMore = true;
  }
  await expect(allStarTab).toHaveAccessibleName('Open the All-Star BoH member hub');
  await allStarTab.click();
  if (openedAllStarMore) await expect(page.locator('#shellMorePanel')).toBeHidden();
  await expect(page.locator('#allStarBohSection .boh-access-gate')).toBeVisible({ timeout: 30000 });
  await expect(page.locator('#allStarBohSection [data-role="boh-root"]')).toBeHidden();
  const lockedAllStarResources = await page.evaluate(() =>
    performance
      .getEntriesByType('resource')
      .map((entry) => new URL(entry.name, window.location.href).pathname)
  );
  expect(
    lockedAllStarResources.some((path) =>
      /\/assets\/all-star-boh-bootstrap-[^/]+\.js$/u.test(path)
    ),
    'All-Star public access bootstrap should load'
  ).toBe(true);
  expect(
    lockedAllStarResources.some((path) =>
      /\/assets\/(?:admin-all-star-boh-|all-star-boh-(?!bootstrap-))[^/]*\.js$/u.test(path)
    ),
    'protected All-Star domain chunks must not load before server-verified access'
  ).toBe(false);

  const productionState = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    const resourcePaths = performance
      .getEntriesByType('resource')
      .map((entry) => new URL(entry.name, window.location.href).pathname);
    return {
      activeServiceWorker: registration.active?.scriptURL || '',
      cacheNames: await caches.keys(),
      resourcePaths,
    };
  });
  expect(productionState.activeServiceWorker).toMatch(/\/sw\.js$/u);
  expect(productionState.cacheNames.some((name) => name.startsWith('vts-'))).toBe(true);
  for (const chunkName of [
    'hero-atlas',
    'research',
    'material-calculator',
    'app-strife',
    'eden-map',
  ]) {
    expect(
      productionState.resourcePaths.some((resourcePath) =>
        new RegExp(`/assets/${chunkName}-[^/]+\\.js$`, 'u').test(resourcePath)
      ),
      `${chunkName} production chunk was not requested`
    ).toBe(true);
  }

  await page.goto('/admin.html', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#dashAccountSignInBtn')).toBeVisible({ timeout: 30000 });

  await page.goto('/battle-simulator.html', { waitUntil: 'domcontentloaded' });
  // The shared admin PIN is gone — it guarded nothing server-side, and this
  // route is a calculator over public game data — so the simulator mounts
  // directly instead of behind a gate.
  await expect(page.getByRole('dialog', { name: 'Beta Testers Only' })).toHaveCount(0);
  await expect(page.locator('#battleSimulatorMount')).toBeVisible({ timeout: 30000 });
  const battleResources = await page.evaluate(() =>
    performance
      .getEntriesByType('resource')
      .map((entry) => new URL(entry.name, window.location.href).pathname)
  );
  expect(
    battleResources.some((path) => /\/assets\/battle-simulator-[^/]+\.js$/u.test(path)),
    'Battle Simulator bootstrap asset should load'
  ).toBe(true);
  expect(
    battleResources.some((path) => /\/assets\/battle-simulator-[^/]+\.css$/u.test(path)),
    'Battle Simulator stylesheet should load'
  ).toBe(true);
  expect(
    battleResources.some((path) => /\/assets\/battle-simulator-app-[^/]+\.js$/u.test(path)),
    'simulator app chunk should load now that the route has no gate'
  ).toBe(true);

  await page.goto('/eden-x1.html', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.admin-shell-title')).toContainText('Eden X1');
  await expect(page.locator('#ocrDashboardSection')).toBeVisible();

  await page.goto('/arcade.html', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.admin-shell-title')).toContainText('Arcade');
  await expect(page.locator('#arcadeLobby')).toBeVisible({ timeout: 30000 });
  const arcadeHeaderBounds = await page.evaluate(() => {
    const brand = document.querySelector('.admin-command-brand');
    const copy = document.querySelector('.admin-shell-copy');
    if (!brand || !copy) return null;
    const brandRect = brand.getBoundingClientRect();
    const copyRect = copy.getBoundingClientRect();
    return { brandRight: brandRect.right, copyRight: copyRect.right };
  });
  expect(arcadeHeaderBounds).not.toBeNull();
  expect(arcadeHeaderBounds.copyRight).toBeLessThanOrEqual(arcadeHeaderBounds.brandRight + 1);

  const gamePaths = await page
    .locator('.arcade-card')
    .evaluateAll((cards) => cards.map((card) => card.getAttribute('href')));
  const expectedGames = [
    ['/games/boot/b-merge-rush.html', 'Mode A', 'Merge Rush'],
    ['/games/boot/c-sort-hoard.html', 'Mode B', 'Sort the Hoard'],
    ['/games/boot/e-crystal-relay.html', 'Mode C', 'Crystal Relay'],
    ['/games/boot/f-set-assembly.html', 'Mode D', 'Set Assembly'],
    ['/games/boot/h-hero-rumble.html', 'Mode E', 'Hero Rumble'],
  ];
  expect(gamePaths).toEqual(expectedGames.map(([gamePath]) => gamePath));
  for (const [gamePath, mode, title] of expectedGames) {
    await page.goto(gamePath, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#stage')).toBeVisible();
    await expect(page.locator('.nav-back')).toHaveAttribute('href', '/arcade.html');
    await expect(page.locator('.mode-tag')).toHaveText(mode);
    await expect(page.locator('h1')).toHaveText(title);
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/arcade.html', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#arcadeLobby')).toBeVisible({ timeout: 30000 });
  await expect(page.locator('.arcade-card')).toHaveCount(5);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2)
  ).toBe(false);

  expect(failures).toEqual([]);
});
