import { expect, test } from '@playwright/test';
import fs from 'node:fs/promises';
import { encodeCombos } from '../js/combo-share.js';
import { encodeRoster } from '../js/roster-share.js';

const TEST_SENSITIVE_ADMIN_PIN = '232323';
const TEST_SENSITIVE_ADMIN_PIN_HASH =
  'c81ce2684a7b8d8738cd9a978e5e1acc846eca4b92686420bc1e641d287c4e80';

async function waitForAppReady(page) {
  await expect(page.locator('body')).toHaveClass(/app-ready/, { timeout: 30000 });
  await expect(page.locator('#tabGenerator')).toBeVisible();
  await expect(page.locator('#generatorSection')).toBeVisible();
  await expect(page.locator('.quick-tour-overlay')).toHaveCount(0);
}

async function openApp(page, path = '/') {
  await page.route('https://www.googletagmanager.com/**', (route) => route.abort());
  await page.addInitScript(() => {
    localStorage.setItem('vts_maintenance_bypass', '1');
    localStorage.setItem('vts_intro_v1_seen', '1');
    localStorage.setItem('vts_eden_dataset', 'season5');
  });
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await waitForAppReady(page);
}

async function openDirectTabHash(page, tabName, sectionId, marker, search = '') {
  await page.route('https://www.googletagmanager.com/**', (route) => route.abort());
  await page.addInitScript(() => {
    localStorage.setItem('vts_maintenance_bypass', '1');
    localStorage.setItem('vts_eden_dataset', 'season5');
  });
  await page.goto(`/${search}#${tabName}`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).toHaveClass(/app-ready/, { timeout: 30000 });
  await expect(page.locator(sectionId)).toBeVisible({ timeout: 20000 });
  await expect(page.locator(marker)).toBeVisible({ timeout: 20000 });
  await expect(page.locator('#generatorSection')).toBeHidden();
  await expect(page.locator('html')).not.toHaveAttribute('data-initial-tab-pending', /.*/);
}

async function expectTab(page, buttonId, sectionId, marker) {
  const tabButton = page.locator(buttonId);

  if (await tabButton.isVisible()) {
    await tabButton.click();
  } else {
    const tabName = sectionId.match(/^#([A-Za-z][\w-]*)Section$/)?.[1];
    if (!tabName) {
      throw new Error(`Cannot derive a public tab route from ${sectionId}`);
    }
    await page.evaluate((name) => {
      const nextHash = `#${name}`;
      if (window.location.hash === nextHash) window.vtsSwitchTab?.(name, true);
      else window.location.hash = nextHash;
    }, tabName);
  }

  await expect(page.locator(sectionId)).toBeVisible({ timeout: 15000 });
  await expect(page.locator(marker)).toBeVisible({ timeout: 20000 });
}

async function readPopoverPaintState(popover) {
  return popover.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const xSamples = [rect.left + 8, rect.left + rect.width / 2, rect.right - 8];
    const ySamples = [rect.top + 8, rect.top + rect.height / 2, rect.bottom - 8];
    const blockers = [];
    const previousPointerEvents = element.style.pointerEvents;
    element.style.pointerEvents = 'auto';
    xSamples.forEach((x) => {
      ySamples.forEach((y) => {
        if (x < 0 || x >= window.innerWidth || y < 0 || y >= window.innerHeight) return;
        const topmost = document.elementFromPoint(x, y);
        if (topmost && topmost !== element && !element.contains(topmost)) {
          blockers.push({
            tag: topmost.tagName,
            id: topmost.id,
            className: String(topmost.className || ''),
          });
        }
      });
    });
    element.style.pointerEvents = previousPointerEvents;
    return {
      blockers,
      left: rect.left,
      right: rect.right,
      top: rect.top,
      bottom: rect.bottom,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
    };
  });
}

test.describe('Battle Simulator beta', () => {
  test('localizes the PIN gate and renders source-aware unit equations', async ({ page }) => {
    await page.route('https://www.googletagmanager.com/**', (route) => route.abort());
    await page.addInitScript(
      ({ pin }) => {
        window.VTS_ADMIN_AUTH = { adminPin: pin };
        localStorage.setItem('vts_maintenance_bypass', '1');
        localStorage.setItem('vts_hero_lang', 'ar');
        localStorage.removeItem('vts_sensitive_admin_pin_ok');
        localStorage.removeItem('vts_eden_votes_pin_ok');
      },
      { pin: TEST_SENSITIVE_ADMIN_PIN }
    );

    await page.goto('/battle-simulator.html', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl', { timeout: 20000 });
    await expect(page.locator('.pin-gate-dialog')).toBeVisible();
    await expect(page.locator('.pin-gate-dialog')).not.toContainText('Beta Testers Only');
    await page.locator('.pin-gate-input').fill(TEST_SENSITIVE_ADMIN_PIN);
    await page.locator('.pin-gate-btn-primary').click();

    await expect(page.locator('#battleSimulatorForm')).toBeVisible({ timeout: 20000 });
    await expect(page.locator('[data-battle-language] option')).toHaveCount(11);
    await expect(page.locator('[data-research-enabled="A"]')).toBeChecked();
    await expect(page.locator('[data-research-enabled="B"]')).not.toBeChecked();
    await expect(page.locator('.battle-legion-sources')).toHaveCount(2);

    const frontA = page.locator('.battle-squad-card[data-side="A"][data-row-index="0"]');
    await expect(frontA).toHaveAttribute('open', '');
    await expect(frontA.locator('[data-unit-stat-input="attack"]')).toHaveValue('71.4');
    await frontA.locator('[data-stat="might"]').fill('400');
    await expect(frontA.locator('[data-effective-stat="attack"]').first()).toContainText('357');
    await expect(
      frontA.locator('.battle-stat-source-row[data-source-type="manual"]')
    ).toContainText('+400%');

    await page.locator('[data-equipment-set="A"]').selectOption('normal.dreadnaught');
    await expect(page.locator('[data-equipment-card="A"]')).toContainText(/Identity only|هوية/);
    await expect(page.locator('[data-equipment-enhancement="A"]')).toBeEnabled();

    await page.locator('[data-battle-language]').selectOption('de');
    await expect(page.locator('html')).toHaveAttribute('lang', 'de');
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    await expect(page.locator('#battleSimulatorTitle')).toBeVisible();

    const themeToggle = page.locator('#battleThemeToggle');
    await themeToggle.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(themeToggle).toHaveAttribute('aria-pressed', 'true');
    await themeToggle.click();
    await expect.poll(() => page.locator('html').getAttribute('data-theme')).toBeNull();
    await expect(themeToggle).toHaveAttribute('aria-pressed', 'false');

    const runBar = page.locator('.battle-form-actions');
    await expect(runBar).toBeVisible();
    const box = await runBar.boundingBox();
    expect(box).not.toBeNull();
    expect(box.y + box.height).toBeLessThanOrEqual(await page.evaluate(() => innerHeight));
  });
});

const visualViewports = [
  { name: 'mobile', width: 375, height: 812 },
  { name: 'desktop', width: 1280, height: 800 },
];

const visualSurfaces = [
  {
    name: 'combo-manual',
    buttonId: '#tabManual',
    sectionId: '#manualSection',
    marker: '#availableHeroes',
    target: '#availableHeroes',
  },
  {
    name: 'combo-generator',
    buttonId: '#tabGenerator',
    sectionId: '#generatorSection',
    marker: '#generatorHeroes',
    target: '#generatorResults',
    setup: async (page) => {
      await page.locator('#genSelectAllBtn').click();
      await page.locator('#generateCombosBtn').click();
      await expect(page.locator('#generatorResults .generated-combo-card').first()).toBeVisible({
        timeout: 15000,
      });
    },
  },
  {
    name: 'hero-atlas',
    buttonId: '#tabHeroes',
    sectionId: '#heroesSection',
    marker: '#heroesSection .heroes-layout',
    target: '#heroesSection',
  },
  {
    name: 'research',
    buttonId: '#tabResearch',
    sectionId: '#researchSection',
    marker: '#techListContainer',
    target: '#techListContainer',
    setup: async (page) => {
      const basicCombat = page.locator('.research-tech-card[data-tech-id="375d1626"]');
      const classLegion = page.locator('.research-tech-card[data-tech-id="cc2c9ee1"]');
      await expect(basicCombat.locator('.research-card-buff-preview--missing')).toContainText(
        'Buff values need data',
        { timeout: 15000 }
      );
      await expect(classLegion.locator('.research-card-buff-pill').first()).toBeVisible({
        timeout: 15000,
      });
      await expect(page.locator('.research-season-max').first()).toContainText('Complete all', {
        timeout: 15000,
      });
      await expect(page.locator('.research-card-max').first()).toContainText('Complete tree', {
        timeout: 15000,
      });
    },
  },
  {
    name: 'loyalty',
    buttonId: '#tabLoyalty',
    sectionId: '#loyaltySection',
    marker: '#loyaltyPresets',
    target: '#loyaltySection',
  },
];

const WEIGHTED_TITLE_TEXT =
  /Weighted Total Contribution|\u0412\u0437\u0432\u0435\u0448\u0435\u043d\u043d\u044b\u0439 \u043e\u0431\u0449\u0438\u0439 \u0432\u043a\u043b\u0430\u0434/;
const WEIGHTED_SCORE_TEXT =
  /Weighted score|Weighted Score|\u0412\u0437\u0432\u0435\u0448\u0435\u043d\u043d\u044b\u0435 \u043e\u0447\u043a\u0438|\u0412\u0437\u0432\u0435\u0448\u0435\u043d\u043d\u044b\u0439 \u0431\u0430\u043b\u043b/;

async function stabilizeVisuals(page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        caret-color: transparent !important;
        transition-duration: 0s !important;
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        animation-iteration-count: 1 !important;
      }
      .toast,
      .generate-summary,
      .generated-summary,
      #generatorResults > .text-center,
      #globalGameClock {
        visibility: hidden !important;
      }
      .visual-surface-crop #generatorResults {
        scroll-margin-top: 140px !important;
      }
      .visual-surface-crop #availableHeroes,
      .visual-surface-crop #heroesSection,
      .visual-surface-crop #techListContainer,
      .visual-surface-crop #loyaltySection {
        max-height: min(560px, calc(100vh - 140px)) !important;
        overflow: hidden !important;
      }
    `,
  });
  await page.evaluate(() => {
    document.body.classList.add('visual-surface-crop');
  });
}

async function openVisualApp(page, viewport) {
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  await openApp(page, `/?visual=${viewport.name}`);
  await page.waitForFunction(() => document.documentElement.dataset.shellNavReady === '1');
  if (viewport.name === 'mobile') {
    await page.waitForFunction(() => {
      const nav = document.getElementById('tabNavScroll');
      return (
        nav?.contains(document.getElementById('tabArcade')) &&
        !nav.contains(document.getElementById('tabOcrDashboard'))
      );
    });
  }
  await stabilizeVisuals(page);
}

async function verifyRetiredEntryGate(page, viewport) {
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.route('https://www.googletagmanager.com/**', (route) => route.abort());
  await page.addInitScript(() => {
    localStorage.setItem('vts_maintenance_bypass', '1');
    localStorage.removeItem('vts_intro_v1_seen');
  });
  await page.goto('/?tour=1', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#app')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('body')).toHaveClass(/app-ready/, { timeout: 30000 });
  await expect(page.locator('.quick-tour-overlay')).toHaveCount(0);
}

async function expectVisualSnapshot(page, selector, name) {
  const target = page.locator(selector);
  await target.scrollIntoViewIfNeeded();
  await page.addStyleTag({
    content: '#aiDrawerLauncherShell { visibility: hidden !important; }',
  });
  // Keep hover-only card accents deterministic and wait for decoded pixels,
  // not only image metadata, before capturing remote hero portraits.
  await page.mouse.move(0, 0);
  await expect
    .poll(
      () =>
        target.evaluate((root) =>
          Array.from(root.querySelectorAll('img')).every(
            (img) => img.complete && img.naturalWidth > 0
          )
        ),
      { timeout: 15000 }
    )
    .toBe(true);
  await target.evaluate((root) =>
    Promise.all(
      Array.from(root.querySelectorAll('img'), (img) => img.decode?.().catch(() => undefined))
    )
  );
  // Wait for web fonts before snapshotting; otherwise the first cold-cache
  // capture renders text in a fallback face and produces a whole-page diff
  // against a fonts-loaded baseline.
  await page.evaluate(() => (document.fonts ? document.fonts.ready : Promise.resolve()));
  await page.waitForTimeout(100);
  await expect(target).toHaveScreenshot(name, {
    animations: 'disabled',
    caret: 'hide',
    maxDiffPixelRatio: 0.01,
    timeout: 15000,
  });
}

async function expectEdenTerrainPainted(page) {
  await expect
    .poll(
      async () =>
        page.locator('#edenMapCanvas').evaluate((canvas) => {
          const ctx = canvas.getContext('2d');
          const { width, height } = canvas;
          if (!ctx || !width || !height) return 0;
          const data = ctx.getImageData(0, 0, width, height).data;
          let terrainPixels = 0;
          let total = 0;
          const step = 20;
          for (let y = 0; y < height; y += step) {
            for (let x = 0; x < width; x += step) {
              const i = (y * width + x) * 4;
              const r = data[i];
              const g = data[i + 1];
              const b = data[i + 2];
              const a = data[i + 3];
              total += 1;
              if (a > 120 && g > 55 && g > b * 1.05 && g >= r * 0.75) terrainPixels += 1;
            }
          }
          return total ? terrainPixels / total : 0;
        }),
      { timeout: 10000 }
    )
    .toBeGreaterThan(0.03);
}

async function openAdmin(page) {
  await page.route('https://www.googletagmanager.com/**', (route) => route.abort());
  await page.addInitScript(() => {
    localStorage.setItem('vts_maintenance_bypass', '1');
    localStorage.removeItem('vts_admin_local_test_auth');
    navigator.serviceWorker?.getRegistrations?.().then((registrations) => {
      registrations.forEach((registration) => registration.unregister());
    });
    window.caches?.keys?.().then((keys) => {
      keys.forEach((key) => caches.delete(key));
    });
  });
  await page.goto('/admin.html', { waitUntil: 'load' });
  await page.waitForFunction(
    () => {
      const isVisible = (el) => {
        if (!el) return false;
        const style = window.getComputedStyle(el);
        return (
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          !el.classList.contains('hidden')
        );
      };
      return (
        isVisible(document.getElementById('dashLogin')) ||
        isVisible(document.getElementById('dashApp'))
      );
    },
    null,
    { timeout: 20000 }
  );
}

async function openLocalAdminDashboard(page) {
  await page.addInitScript(() => {
    window.VTS_ADMIN_LOCAL_TEST_AUTH = true;
    localStorage.setItem('vts_admin_local_test_auth', '1');
  });
  await page.evaluate(() => {
    window.VTS_ADMIN_LOCAL_TEST_AUTH = true;
    localStorage.setItem('vts_admin_local_test_auth', '1');
  });
  await page.reload({ waitUntil: 'load' });
  await expect(page.locator('#dashApp')).toBeVisible({ timeout: 20000 });
}

function allianceViewAccountName(allianceId, index) {
  if (allianceId === 'v3s' && index === 50) return 'V3S 城堡 050';
  if (allianceId === 'v3s' && index === 90) return 'Fuzzy Rnager';
  if (allianceId === 'v3s' && index === 91) return 'No Eden Account';
  if (allianceId === 'vts' && index >= 97) return 'Shared Source';
  return `${allianceId.toUpperCase()} Account ${String(index).padStart(3, '0')}`;
}

function allianceViewEdenName(allianceId, index) {
  if (allianceId === 'v3s' && index === 90) return 'Fuzzy Ranger';
  return allianceViewAccountName(allianceId, index);
}

function createSyntheticAllianceRosterCsv(allianceId, count) {
  const quote = (value) => `"${String(value).replaceAll('"', '""')}"`;
  const rows = [
    ['Name', 'Alliance', 'Rank', 'Server', 'Castle Level', 'Total Power', 'Last Online'],
  ];
  for (let index = 1; index <= count; index += 1) {
    const activity =
      index % 4 === 1
        ? '1 hour ago'
        : index % 4 === 2
          ? '3 days ago'
          : index % 4 === 3
            ? '9 days ago'
            : 'Unknown';
    rows.push([
      allianceViewAccountName(allianceId, index),
      allianceId.toUpperCase(),
      ['R5', 'R4', 'R3'][index % 3],
      String(1700 + (index % 4)),
      String(25 + (index % 16)),
      String(40000000 + index * 137000 + (allianceId === 'vts' ? 50000 : 0)),
      activity,
    ]);
  }
  return rows.map((row) => row.map(quote).join(',')).join('\r\n');
}

function createAllianceViewSmokeFixture() {
  const contributionEntries = [];
  for (let index = 1; index <= 91; index += 1) {
    if (index === 91) continue;
    const globalRank = (index - 1) * 2 + 1;
    contributionEntries.push({
      rank: String(globalRank),
      name: allianceViewEdenName('v3s', index),
      guild: 'V3S',
      contribution: String(1000000 - globalRank * 1000),
    });
  }
  for (let index = 1; index <= 98; index += 1) {
    if (index === 98) continue;
    const globalRank = index <= 91 ? index * 2 : 182 + (index - 91);
    contributionEntries.push({
      rank: String(globalRank),
      name: allianceViewEdenName('vts', index),
      guild: 'VTS',
      contribution: String(1000000 - globalRank * 1000),
    });
  }
  contributionEntries.push({
    rank: '999',
    name: 'Manual Reserve Eden',
    guild: 'VTS',
    contribution: '500',
  });
  contributionEntries.sort((left, right) => Number(left.rank) - Number(right.rank));

  const dashboard = {
    date: '2026-07-16',
    r5Season: 'season-2026',
    last_updated: '16/07/2026, 12:00',
    total_attacks: 0,
    attacks: [],
    players_summary: [],
    contributionRecords: [
      {
        id: 'alliance-view-smoke-primary',
        date: '2026-07-16',
        isPrimary: true,
        premiumSlots: 20,
        entries: contributionEntries,
      },
    ],
    exGuildContributions: [
      {
        id: 'alliance-view-smoke-ex-guild',
        playerName: 'V3S Account 001',
        matchedName: 'V3S Account 001',
        contribution: 25000,
        status: 'matched',
      },
    ],
    dutyRecords: [
      {
        id: 'alliance-view-smoke-banner',
        type: 'banner',
        date: '2026-07-16',
        entries: [{ name: 'V3S Account 001', confirmed: 'V3S Account 001', status: 'exact' }],
      },
      {
        id: 'alliance-view-smoke-pather',
        type: 'pather',
        date: '2026-07-16',
        entries: [{ name: 'V3S Account 001', confirmed: 'V3S Account 001', status: 'exact' }],
      },
      {
        id: 'alliance-view-smoke-shield',
        type: 'shield_wall',
        date: '2026-07-16',
        entries: [{ name: 'VTS Account 001', confirmed: 'VTS Account 001', status: 'exact' }],
      },
    ],
  };
  const adjustments = [
    {
      season: 'season-2026',
      player: 'V3S Account 001',
      playerName: 'V3S Account 001',
      points: 6,
      category: 'extra_effort',
    },
    {
      season: 'season-2026',
      player: 'VTS Account 001',
      playerName: 'VTS Account 001',
      points: -1,
      category: 'extra_effort',
    },
  ];
  return {
    dashboard,
    adjustments,
    v3sCsv: createSyntheticAllianceRosterCsv('v3s', 91),
    vtsCsv: createSyntheticAllianceRosterCsv('vts', 98),
  };
}

async function seedAllianceViewContributions(page, fixture) {
  await page.waitForFunction(
    () =>
      typeof window.setOcrDashboardDataForTest === 'function' &&
      typeof window.switchDashSubtab === 'function'
  );
  await page.evaluate(({ dashboard, adjustments }) => {
    window.setOcrDashboardDataForTest(dashboard, [], adjustments);
  }, fixture);
}

async function waitForAllianceViewReady(page) {
  await expect(page.locator('#dashSubtabAllianceView')).toBeVisible({ timeout: 20000 });
  await expect(page.locator('#dashAllianceViewRoot')).toHaveAttribute('aria-busy', 'false', {
    timeout: 20000,
  });
  await page.waitForFunction(
    () =>
      typeof window.getAllianceViewStateForTest === 'function' &&
      window.getAllianceViewStateForTest()?.rows?.length === 0
  );
  await expect(page.locator('#dashAllianceViewStatus')).toContainText(/live|ready/i);
}

async function importAllianceRoster(page, allianceId, csv, expectedCount) {
  await page.locator(`[data-action="import"][data-alliance="${allianceId}"]`).click();
  await page.locator('#dashAllianceRosterFile').setInputFiles({
    name: `${allianceId}-synthetic-roster.csv`,
    mimeType: 'text/csv',
    buffer: Buffer.from(csv, 'utf8'),
  });
  const dialog = page.locator('#dashAllianceImportDialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('.dash-alliance-preview-card[data-tone="added"] strong')).toHaveText(
    String(expectedCount)
  );
  await dialog.locator('[data-action="apply-import"]').click();
  await expect(dialog).not.toBeVisible({ timeout: 20000 });
  await expect
    .poll(
      () =>
        page.evaluate(
          (id) => window.getAllianceViewStateForTest?.()?.rosters?.[id]?.members?.length,
          allianceId
        ),
      { timeout: 20000 }
    )
    .toBe(expectedCount);
}

async function getAllianceViewState(page) {
  return page.evaluate(() => window.getAllianceViewStateForTest?.());
}

function allianceRowLocator(page, memberId) {
  return page.locator(`.dash-alliance-row[data-member-id="${memberId}"]`);
}

async function expandAllianceRow(page, memberId) {
  const row = allianceRowLocator(page, memberId);
  await row.locator('[data-action="toggle-row"]').click();
  const detail = page.locator(`.dash-alliance-detail-row[data-detail-for="${memberId}"]`);
  await expect(detail).toBeVisible();
  return detail;
}

async function openEdenX1ForTest(page) {
  await page.route('https://www.googletagmanager.com/**', (route) => route.abort());
  await page.addInitScript(() => {
    window.VTS_EDEN_X1_TEST_MODE = true;
    localStorage.setItem('vts_maintenance_bypass', '1');
    localStorage.setItem('vts_hero_lang', 'en');
    localStorage.setItem('vts_theme', 'dark');
    localStorage.setItem('vts_weighted_contribution_compact', '0');
    navigator.serviceWorker?.getRegistrations?.().then((registrations) => {
      registrations.forEach((registration) => registration.unregister());
    });
  });
  await page.goto('/eden-x1.html', { waitUntil: 'load' });
  await page.waitForFunction(
    () =>
      typeof window.setEdenX1DataForTest === 'function' &&
      document.querySelector('[data-reward-view="team"]')?.dataset.rewardBound === '1',
    null,
    { timeout: 20000 }
  );
}

async function installEdenX1LiveRefreshMock(
  page,
  { cachedData, liveDashboard, liveSettings, settingsExists = true, publicResultsReadFails = false }
) {
  await page.addInitScript(
    ({ cache, dashboard, settings, settingsDocumentExists, resultsReadFails }) => {
      const clone = (value) => JSON.parse(JSON.stringify(value));
      const snapshot = (exists, data = {}) => ({
        exists: () => exists,
        data: () => clone(data),
      });
      let releaseLiveRefresh;
      const gate = new Promise((resolve) => {
        releaseLiveRefresh = resolve;
      });
      window.VTS_EDEN_X1_TEST_MODE = true;
      window.VTS_EDEN_X1_FIREBASE_MODULES = [
        {
          initFirebase: () => ({ configured: true, app: { name: 'eden-live-refresh-test' } }),
          ensureAnonymousAuth: async () => ({ uid: 'eden-live-refresh-test-user' }),
        },
        {
          importFirestoreLite: async () => ({
            getFirestore: (app) => ({ app }),
            doc: (_db, path) => ({ path }),
            collection: (_db, path) => ({ path }),
            where: (...args) => ({ args }),
            query: (ref) => ref,
            getDoc: async (ref) => {
              const state = window.__EDEN_X1_LIVE_REFRESH_TEST__;
              await state.gate;
              if (ref.path === 'vts_admin/dashboard_data') {
                return snapshot(true, state.liveDashboard);
              }
              if (ref.path === 'vts_admin/roster_data') return snapshot(false);
              if (ref.path === 'vts_admin/eden_x1_vote_settings') {
                state.settingsRead = true;
                return snapshot(state.settingsExists, state.liveSettings);
              }
              if (ref.path === 'vts_admin/eden_x1_public_vote_results') {
                if (state.publicResultsReadFails) throw new Error('simulated results timeout');
                return snapshot(true, state.liveVoteResults);
              }
              return snapshot(false);
            },
            getDocs: async () => {
              const state = window.__EDEN_X1_LIVE_REFRESH_TEST__;
              await state.gate;
              return {
                forEach: (visit) =>
                  state.liveConductAdjustments.forEach((row) => visit({ data: () => clone(row) })),
              };
            },
          }),
        },
      ];
      window.VTS_EDEN_X1_MANAGEMENT_VOTE_LOADER = () =>
        Promise.resolve({ table: { cols: [{ label: 'Name' }, { label: 'Votes' }], rows: [] } });
      window.__EDEN_X1_LIVE_REFRESH_TEST__ = {
        gate,
        liveDashboard: dashboard,
        liveSettings: settings,
        liveVoteResults: dashboard.publicEdenX1VoteResults || {},
        liveConductAdjustments: dashboard.publicConductAdjustments || [],
        settingsExists: settingsDocumentExists,
        publicResultsReadFails: resultsReadFails,
        settingsRead: false,
      };
      window.__releaseEdenX1LiveRefresh = () => releaseLiveRefresh();
      localStorage.setItem('vts_maintenance_bypass', '1');
      localStorage.setItem('vts_hero_lang', 'en');
      localStorage.setItem('vts_theme', 'dark');
      localStorage.setItem(
        'vts_eden_x1_public_dashboard_cache_v1',
        JSON.stringify({ savedAt: Date.now(), data: cache })
      );
      navigator.serviceWorker?.getRegistrations?.().then((registrations) => {
        registrations.forEach((registration) => registration.unregister());
      });
    },
    {
      cache: cachedData,
      dashboard: liveDashboard,
      settings: liveSettings,
      settingsDocumentExists: settingsExists,
      resultsReadFails: publicResultsReadFails,
    }
  );
}

function createEdenX1LiveRefreshFixture() {
  const dashboard = {
    syncRevision: 77,
    updatedAt: '2026-07-15T12:00:00.000Z',
    r5Season: 'season-2026',
    contributionRecords: [
      {
        id: 'eden-live-refresh-record',
        date: '2026-07-15',
        premiumSlots: 20,
        entries: [
          { rank: '1', name: 'Cache Alpha', guild: 'VTS X1', contribution: '300000' },
          { rank: '2', name: 'Cache Bravo', guild: 'VTS X1', contribution: '250000' },
          { rank: '3', name: 'Cache Charlie', guild: 'VTS X1', contribution: '200000' },
        ],
      },
    ],
    dutyRecords: [],
    attacks: [],
  };
  const cachedSettings = {
    season: 'season-2026',
    votingOpen: true,
    allowEditing: true,
    showPublicResults: true,
    contributionRankingMode: 'default',
    closesAt: '',
  };
  const cachedVoteResults = {
    season: 'season-2026',
    published: true,
    rankings: [
      {
        playerName: 'Cached Winner',
        playerKey: 'cachedwinner',
        familyKey: 'cachedwinner',
        votes: 9,
        voters: 9,
      },
    ],
  };
  const adjustment = {
    season: 'season-2026',
    playerKey: 'cachealpha',
    playerName: 'Cache Alpha',
    category: 'extra_effort',
  };
  return {
    cachedData: {
      ...dashboard,
      edenX1VoteSettings: cachedSettings,
      publicEdenX1VoteResults: cachedVoteResults,
      publicConductAdjustments: [{ ...adjustment, points: 1 }],
    },
    liveDashboard: {
      ...dashboard,
      publicEdenX1VoteResults: cachedVoteResults,
      publicConductAdjustments: [{ ...adjustment, points: 5 }],
    },
  };
}

test.describe('visual regression', () => {
  // Screenshot baselines are rendered on the dev OS (Windows). Linux CI renders
  // fonts/anti-aliasing differently, which diffs every snapshot. Run these locally;
  // skip in CI until platform-specific (Linux) baselines are committed.
  test.skip(!!process.env.CI, 'Platform-specific visual baselines; run locally, not in CI.');
  test.beforeEach(({ browserName }, testInfo) => {
    testInfo.snapshotSuffix = '';
  });

  for (const viewport of visualViewports) {
    test(`header renders directly without an entry gate at ${viewport.name}`, async ({ page }) => {
      await verifyRetiredEntryGate(page, viewport);
      await openVisualApp(page, viewport);
      await expectVisualSnapshot(page, '.command-header', `header-nav-${viewport.name}.png`);
    });

    for (const surface of visualSurfaces) {
      test(`${surface.name} renders at ${viewport.name}`, async ({ page }) => {
        await openVisualApp(page, viewport);
        await expectTab(page, surface.buttonId, surface.sectionId, surface.marker);
        if (surface.setup) await surface.setup(page);
        await expectVisualSnapshot(page, surface.target, `${surface.name}-${viewport.name}.png`);
      });
    }
  }
});

test.describe('admin dashboard visual regression', () => {
  // See note above: platform-specific baselines, skip in CI.
  test.skip(!!process.env.CI, 'Platform-specific visual baselines; run locally, not in CI.');
  test.beforeEach(({ browserName }, testInfo) => {
    testInfo.snapshotSuffix = '';
  });

  // Representative seeded dataset with mixed Latin + Cyrillic names so the
  // Russian-user mobile experience (the original "horrible sizing" report) is
  // checked at every viewport. Long transliterated names exercise line wrap.
  const VISUAL_DASH = {
    last_updated: '27/06/2026, 09:15',
    total_attacks: 2,
    attacks: [
      {
        id: 'vis-cap-1',
        structure_name: 'Capital',
        structure_level: 'Lv.7',
        game_time: '26/06/2026, 19:30',
        start_time: '19:00',
        total_demolition: 4500000,
        players_count: 4,
        players: [
          { name: 'Александр', value: 1900000, rank: 1 },
          { name: 'Bravo', value: 1100000, rank: 2 },
          { name: 'Снайпер', value: 900000, rank: 3 },
          { name: 'Echo', value: 600000, rank: 4 },
        ],
      },
      {
        id: 'vis-gate-1',
        structure_name: 'Gate',
        structure_level: 'Lv.5',
        game_time: '27/06/2026, 12:15',
        start_time: '12:00',
        total_demolition: 1820000,
        players_count: 3,
        players: [
          { name: 'Снайпер', value: 920000, rank: 1 },
          { name: 'Александр', value: 540000, rank: 2 },
          { name: 'Foxtrot', value: 360000, rank: 3 },
        ],
      },
    ],
    players_summary: [],
    dutyRecords: [
      {
        id: 'vis-pather-1',
        type: 'pather',
        date: '2026-06-27',
        gameTime: '12:15',
        note: 'Visual baseline',
        createdAt: '2026-06-27T09:15:00.000Z',
        entries: [
          {
            name: 'Александр',
            original: 'Александр',
            confirmed: 'Александр',
            usageTime: '12:15',
            target: 'Gate Lv5',
            group: 'Dark Green',
            order: '1',
            pad: '1240:650',
            status: 'exact',
          },
          {
            name: 'Снайпер',
            original: 'Снайпер',
            confirmed: 'Снайпер',
            usageTime: '00:23',
            target: 'Bridge Lv1',
            group: 'Pink',
            order: '2',
            pad: '1255:648',
            status: 'exact',
          },
        ],
      },
    ],
  };
  const VISUAL_ROSTER = [
    {
      date: '27/06/2026',
      members: [
        { name: 'Александр', status: 'trusted', alliance: 0 },
        { name: 'Снайпер', status: 'trusted', alliance: 1 },
        { name: 'Bravo', status: 'unknown', alliance: 1 },
        { name: 'Spy測試', status: 'spy', alliance: 0 },
      ],
    },
  ];

  const ADMIN_VIEWPORTS = [
    { name: 'mobile', width: 375, height: 812 },
    { name: 'desktop', width: 1280, height: 800 },
  ];

  async function seedAndOpenDashboard(page, opts = {}) {
    await page.setViewportSize({ width: opts.width, height: opts.height });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    if (opts.lang) {
      await page.addInitScript((lang) => {
        localStorage.setItem('vts_hero_lang', lang);
        if (lang === 'ru') localStorage.setItem('vts_force_admin_lang', 'ru');
      }, opts.lang);
    }
    await openAdmin(page);
    await openLocalAdminDashboard(page);
    await page.waitForFunction(
      () =>
        typeof window.setOcrDashboardDataForTest === 'function' &&
        typeof window.switchDashSubtab === 'function'
    );
    await page.evaluate(
      ({ dash, roster }) => {
        window.setOcrDashboardDataForTest(dash, roster);
        window.switchDashSubtab('dashboard');
      },
      { dash: VISUAL_DASH, roster: VISUAL_ROSTER }
    );
    // Re-seed after the local-auth reload so the dataset survives the re-mount.
    await page.waitForFunction(() => typeof window.setOcrDashboardDataForTest === 'function');
    await page.evaluate(
      ({ dash, roster, subtab }) => {
        window.setOcrDashboardDataForTest(dash, roster);
        window.switchDashSubtab(subtab);
      },
      { dash: VISUAL_DASH, roster: VISUAL_ROSTER, subtab: opts.subtab || 'dashboard' }
    );
    await expect(
      page.locator(
        `#dashSubtab${(opts.subtab || 'dashboard').replace(/^./, (c) => c.toUpperCase())}`
      )
    ).toBeVisible({ timeout: 10000 });
  }

  async function stabilizeAdminVisuals(page) {
    // Snapshot determinism: the dashboard has run-to-run variable content â€”
    // restored log lines (#dashLogOutput), the cloud-sync status text (timing
    // of "Showing local cache"), and the live game clock. Hiding/clearing them
    // keeps the captured #ocrDashboardRoot height byte-stable across runs
    // (without this the snapshot diff was a ~37px height drift and flaky).
    await page.addStyleTag({
      content: `
        #ocrDashboardRoot, #ocrDashboardRoot * {
          caret-color: transparent !important;
          transition-duration: 0s !important;
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          animation-iteration-count: 1 !important;
          content-visibility: visible !important;
        }
        #globalGameClock,
        #dashCloudStatusText,
        #dashCloudStatus,
        #dashLogArea,
        #dashLogOutput,
        #aiDrawerLauncherShell,
        .ai-drawer-launcher-shell,
        #aiDrawer,
        #aiDrawerBackdrop,
        .dash-cloud-status,
        .dash-log-area { visibility: hidden !important; }
        #dashOcrServiceStatus {
          visibility: hidden !important;
          width: 118px !important;
          min-width: 118px !important;
          max-width: 118px !important;
          height: 34px !important;
          overflow: hidden !important;
          white-space: nowrap !important;
        }
        @media (max-width: 768px) {
          body.admin-has-subtool-dock {
            padding-bottom: 0 !important;
          }
          body.admin-has-subtool-dock #ocrDashboardRoot .dash-subtab-nav {
            position: static !important;
            inset: auto !important;
            margin-bottom: 12px !important;
          }
        }
      `,
    });
    await page.evaluate(() => {
      const log = document.querySelector('#dashLogOutput');
      if (log) log.innerHTML = '';
      try {
        window.stop();
      } catch {
        /* already stopped */
      }
    });
    // Let any analytics chart canvas/SVG settle one frame after window.stop().
    await page.waitForTimeout(150);
  }

  for (const viewport of ADMIN_VIEWPORTS) {
    for (const lang of ['en', 'ru']) {
      test(`dashboard leaderboard renders at ${viewport.name} (${lang})`, async ({ page }) => {
        await seedAndOpenDashboard(page, { width: viewport.width, height: viewport.height, lang });
        await stabilizeAdminVisuals(page);
        await expect(page.locator('#dashLeaderBody tr').first()).toBeVisible({ timeout: 15000 });
        await expect(page.locator('#ocrDashboardRoot')).toHaveScreenshot(
          `admin-leaderboard-${viewport.name}-${lang}.png`,
          { animations: 'disabled', maxDiffPixelRatio: 0.01, timeout: 15000 }
        );
      });

      test(`dashboard analytics renders at ${viewport.name} (${lang})`, async ({ page }) => {
        await seedAndOpenDashboard(page, {
          width: viewport.width,
          height: viewport.height,
          lang,
          subtab: 'analytics',
        });
        await stabilizeAdminVisuals(page);
        await expect(page.locator('#dashStructuresChart, #dashStructureChart').first()).toBeVisible(
          {
            timeout: 15000,
          }
        );
        await expect(page.locator('#ocrDashboardRoot')).toHaveScreenshot(
          `admin-analytics-${viewport.name}-${lang}.png`,
          { animations: 'disabled', maxDiffPixelRatio: 0.01, timeout: 15000 }
        );
      });

      test(`dashboard pathers duty summary renders at ${viewport.name} (${lang})`, async ({
        page,
      }) => {
        // Pathers duty list is the surface the Russian member-rotation user hit
        // ("horrible sizing" report). The roster subtab is admin-gated and needs
        // a separate roster login, so pathers is the right mid-season surface to
        // regress: it stacks the duty table into card rows under 768px with
        // translated Cyrillic data-labels.
        await seedAndOpenDashboard(page, {
          width: viewport.width,
          height: viewport.height,
          lang,
          subtab: 'pathers',
        });
        await stabilizeAdminVisuals(page);
        await expect(page.locator('#dashPatherListSummary .dash-duty-summary-table')).toBeVisible({
          timeout: 15000,
        });
        await expect(page.locator('#ocrDashboardRoot')).toHaveScreenshot(
          `admin-pathers-${viewport.name}-${lang}.png`,
          { animations: 'disabled', maxDiffPixelRatio: 0.01, timeout: 15000 }
        );
      });
    }
  }

  test('dashboard mobile surfaces avoid horizontal overflow with Cyrillic + longest locale', async ({
    page,
  }) => {
    // 360px is narrower than the 375 baseline; exercises the worst phone width
    // reported by the Russian user. Asserts zero document/root H-scroll and
    // that player names are not clipped (no truncating nowrap on name cells).
    await page.setViewportSize({ width: 360, height: 740 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.addInitScript(() => {
      localStorage.setItem('vts_hero_lang', 'ru');
    });
    await openAdmin(page);
    await openLocalAdminDashboard(page);
    await page.waitForFunction(() => typeof window.setOcrDashboardDataForTest === 'function');
    await page.evaluate(
      ({ dash, roster }) => {
        window.setOcrDashboardDataForTest(dash, roster);
        for (const subtab of ['dashboard', 'analytics', 'roster']) {
          window.switchDashSubtab(subtab);
        }
        window.switchDashSubtab('dashboard');
      },
      { dash: VISUAL_DASH, roster: VISUAL_ROSTER }
    );

    const checks = await page.evaluate(async () => {
      const results = [];
      const surveys = [
        { name: 'dashboard', sel: '#dashSubtabDashboard' },
        { name: 'analytics', sel: '#dashSubtabAnalytics' },
        { name: 'pathers', sel: '#dashSubtabPathers' },
      ];
      const root = document.querySelector('#ocrDashboardRoot');
      for (const survey of surveys) {
        const panel = document.querySelector(survey.sel);
        if (!panel) {
          results.push({ name: survey.name, missing: true });
          continue;
        }
        // Switch to it so it is laid out before measuring.
        window.switchDashSubtab(survey.name);
        await new Promise((r) => setTimeout(r, 50));
        const nameCells = Array.from(
          panel.querySelectorAll('.dash-roster-row-name, .dash-trend-person strong, td, th')
        );
        const clippedName = nameCells.find((cell) => {
          const style = window.getComputedStyle(cell);
          return (
            style.whiteSpace === 'nowrap' &&
            cell.scrollWidth > cell.clientWidth + 2 &&
            /[\u0400-\u04FF]/.test(cell.textContent || '')
          );
        });
        results.push({
          name: survey.name,
          missing: false,
          rootOverflow: root.scrollWidth > root.clientWidth + 2,
          documentOverflow: document.documentElement.scrollWidth > window.innerWidth + 2,
          clippedCyrillicName: Boolean(clippedName),
        });
        const tableWrap = panel.querySelector(
          '.dash-weighted-contribution-table-wrap, .dash-contribution-compare-table-wrap, .dash-table-wrap, .dash-duty-summary-table-wrap'
        );
        if (tableWrap) {
          const wrapStyle = window.getComputedStyle(tableWrap);
          results.push({
            name: `${survey.name}-table-scroll`,
            missing: false,
            maxHeight: wrapStyle.maxHeight,
            verticalScroll: tableWrap.scrollHeight > tableWrap.clientHeight + 2,
            capped: wrapStyle.maxHeight !== 'none' && tableWrap.clientHeight <= window.innerHeight,
          });
        }
      }
      return results;
    });
    for (const check of checks) {
      if (check.name?.endsWith('-table-scroll')) {
        expect(check.missing, `${check.name} table wrap rendered`).toBe(false);
        if (check.name === 'dashboard-table-scroll') {
          expect(check.maxHeight, `${check.name} max-height`).toBe('none');
          expect(check.verticalScroll, `${check.name} nested vertical scroll`).toBe(false);
        } else {
          expect(check.maxHeight, `${check.name} max-height`).not.toBe('none');
          expect(check.capped, `${check.name} height capped to viewport`).toBe(true);
        }
        continue;
      }
      expect(check.missing, `${check.name} panel rendered`).toBe(false);
      expect(check.rootOverflow, `${check.name} root horizontal overflow`).toBe(false);
      expect(check.documentOverflow, `${check.name} document horizontal overflow`).toBe(false);
      expect(check.clippedCyrillicName, `${check.name} nowrap-clip a Cyrillic cell`).toBe(false);
    }

    const mobileDock = await page.locator('#ocrDashboardRoot .dash-subtab-nav').evaluate((dock) => {
      const style = window.getComputedStyle(dock);
      return { position: style.position, overflowX: style.overflowX };
    });
    expect(mobileDock.position).toBe('fixed');
    expect(mobileDock.overflowX).toBe('auto');
  });
});

test.describe('admin dashboard upload safety', () => {
  test('structure upload panel rejects non-image files without crashing when OCR gated', async ({
    page,
  }) => {
    // No network for the OCR health check â†’ canUseOcr() returns false â†’ the
    // drop / change handlers must short-circuit cleanly. Asserts the upload
    // flow stays usable (no uncaught throw, panel reachable) under the no-cloud
    // condition mid-season members hit on flaky connections.
    await page.route('https://www.googletagmanager.com/**', (route) => route.abort());
    await page.route('https://firestore.googleapis.com/**', (route) => route.abort());
    await page.route('https://www.gstatic.com/firebasejs/**', (route) => route.abort());
    await page.addInitScript(() => {
      localStorage.setItem('vts_maintenance_bypass', '1');
      localStorage.setItem('vts_admin_local_test_auth', '1');
      // Definitively keep OCR gated for this contract regardless of timing.
      localStorage.setItem('vts_force_ocr_gated', '1');
    });
    await page.goto('/admin.html', { waitUntil: 'load' });
    await expect(page.locator('#dashApp')).toBeVisible({ timeout: 20000 });
    await page.waitForFunction(() => typeof window.switchDashSubtab === 'function');
    await page.evaluate(() => window.switchDashSubtab('uploadStructures'));
    await expect(page.locator('#dashSubtabUploadStructures')).toBeVisible({ timeout: 10000 });

    // Dispatch a non-image File against the structure drop handler path.
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.evaluate(() => {
      const dt = new DataTransfer();
      const file = new File(['not an image'], 'roster.txt', { type: 'text/plain' });
      dt.items.add(file);
      const drop = document.querySelector('#dashDropZone');
      const input = document.querySelector('#dashFileInput');
      if (drop) {
        drop.dispatchEvent(
          new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt })
        );
      }
      if (input) {
        // setFileList via DataTransfer so the change handler fires.
        if (input.files) {
          Object.defineProperty(input, 'files', { value: dt.files });
        }
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await page.waitForTimeout(300);

    // The dashboard stays mounted and the upload panel is still interactive.
    await expect(page.locator('#dashApp')).toBeVisible();
    await expect(page.locator('#dashSubtabUploadStructures')).toBeVisible();
    expect(errors.filter((m) => !/network|fetch|firebase|gstatic/i.test(m))).toEqual([]);
  });
});

test.describe('app smoke tabs', () => {
  test('direct tab hashes activate without flashing the default Generator panel', async ({
    page,
  }) => {
    const directTabs = [
      ['manual', '#manualSection', '#availableHeroes'],
      ['arcade', '#arcadeSection', '#arcadeLobby'],
      ['edenMap', '#edenMapSection', '#edenMapRoot'],
      ['materials', '#materialsSection', '#materialCalculatorRoot'],
      ['research', '#researchSection', '#techListContainer'],
      ['specialization', '#specializationSection', '#specializationToolRoot .spec-tool'],
      ['heroes', '#heroesSection', '#heroesSection .heroes-layout'],
      ['strife', '#strifeSection', '#strifeToolRoot .strife-monster-card:first-child'],
    ];

    for (const [tabName, sectionId, marker] of directTabs) {
      await openDirectTabHash(page, tabName, sectionId, marker);
    }
    await expect(page.locator('#specializationSection .specialization-loading')).toHaveCount(0);
  });

  test('shared combo link opens Generator with the shared result', async ({ page }) => {
    const encoded = encodeCombos([
      {
        heroes: ['King Arthur', 'Cleopatra VII', 'Theodora'],
        displayScore: '97.5',
      },
    ]);

    await openApp(page, `/#combo=${encoded}`);

    await expect(page.locator('#generatorSection')).toBeVisible();
    await expect(page.locator('#generatorResults .generated-combo-card')).toHaveCount(1);
    await expect(page.locator('#generatorResults')).toContainText('King Arthur');
    await expect(page.locator('#generatorResults')).toContainText('Cleopatra VII');
    await expect(page.locator('#generatorResults')).toContainText('Theodora');
    await expect(page.locator('#generatorResults .gen-score-value')).toHaveText('97.5');
    await expect(page).toHaveURL(new RegExp(`#combo=${encoded}$`));
  });

  test('integrated Specialization persists node, complete, and reset actions', async ({ page }) => {
    test.slow();
    await openDirectTabHash(
      page,
      'specialization',
      '#specializationSection',
      '#specializationToolRoot .spec-tool'
    );
    await expect(page.locator('#specializationSection .specialization-loading')).toHaveCount(0);

    const firstBadge = page.locator('.spec-badge-wrap').first();
    await firstBadge.locator('[data-spec-quick-set="complete"]').click();
    await expect(firstBadge.locator('.spec-badge-pct')).toHaveText('100%');
    await expect(firstBadge.locator('[data-spec-quick-set="reset"]')).toContainText('UNMAX');

    await firstBadge.locator('[data-spec-research]').click();
    const reset = page.locator('[data-spec-reset]');
    await expect(reset).toContainText('(11/11)');
    await reset.click();
    await expect(page.locator('[data-spec-reset]')).toContainText('(0/11)');

    const secondNode = page.locator('[data-spec-node]:not([disabled])').nth(1);
    await secondNode.click();
    await expect(secondNode).toHaveAttribute('data-selected', 'true');
    await expect(page.locator('#spec-node-inspector h4')).toHaveText('Revival');
    await expect(page.locator('.spec-node-inspector-buff')).toContainText('HP +1%');
    await expect(reset).toContainText('(0/11)');

    await page.locator('[data-spec-set-selected-node="learned"]').click();
    await expect(reset).toContainText('(1/11)');

    await page.locator('[data-spec-complete]').click();
    await expect(reset).toContainText('(11/11)');
    await reset.click();
    await expect(page.locator('[data-spec-reset]')).toContainText('(0/11)');

    await page.locator('[data-spec-help-node]').click();
    await expect(page.locator('.spec-tool')).toHaveAttribute('data-view', 'overview');
    await expect(page.locator('[data-contribution-key="training1:2"]')).toBeVisible();
    await expect(
      page.locator('[data-contribution-key="training1:2"] [data-spec-node-medal]')
    ).toBeFocused();
  });

  test('Specialization unlocks, previews, and reverses a Legion Skill', async ({ page }) => {
    test.slow();
    await openDirectTabHash(
      page,
      'specialization',
      '#specializationSection',
      '#specializationToolRoot .spec-tool'
    );

    const firstColumn = page.locator('.spec-banner').first();
    for (let index = 0; index < 4; index += 1) {
      await firstColumn.locator('[data-spec-quick-set="complete"]').first().click();
    }
    const crest = firstColumn.locator('[data-spec-legion="1"]');
    await expect(crest).toBeEnabled();
    await expect(crest).toHaveAttribute('title', /.+ — .+/);
    await crest.hover();
    await crest.click();
    await expect(page.locator('#spec-legion-inspector')).toBeVisible();
    await expect(page.locator('#spec-legion-inspector h4')).not.toBeEmpty();
    await expect(page.locator('#spec-legion-inspector p')).toContainText('Buff');

    await firstColumn.locator('[data-spec-quick-set="reset"]').first().click();
    await expect(firstColumn.locator('[data-spec-legion="1"]')).toBeDisabled();
    await expect(page.locator('#spec-legion-inspector')).toHaveCount(0);
  });

  test('Specialization contribution nodes keep submitted and reviewed medals together', async ({
    page,
  }) => {
    test.slow();
    await openDirectTabHash(
      page,
      'specialization',
      '#specializationSection',
      '#specializationToolRoot .spec-tool'
    );

    await page.locator('.spec-contrib-column').first().locator('summary').click();
    const node = page.locator('.spec-contrib-node').first();
    await expect(node.locator('.spec-contrib-node-identity')).toBeVisible();
    await expect(node.locator('.spec-contrib-stage')).toHaveCount(2);

    const fields = [
      ['[data-spec-node-contributor]', 'Alice'],
      ['[data-spec-node-medal]', '120'],
      ['[data-spec-node-reviewer]', 'Bob'],
      ['[data-spec-node-reviewed-medal]', '120'],
    ];
    for (const [selector, value] of fields) {
      await node.locator(selector).fill(value);
      await node.locator(selector).dispatchEvent('change');
    }
    await expect(
      page.locator('.spec-contrib-research').nth(1).locator('[data-spec-node-medal]').first()
    ).toHaveValue('');

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('#specializationSection')).toBeVisible({ timeout: 20000 });
    await page.locator('.spec-contrib-column').first().locator('summary').click();
    const restored = page.locator('.spec-contrib-node').first();
    for (const [selector, value] of fields) {
      await expect(restored.locator(selector)).toHaveValue(value);
    }

    const acknowledgments = page.locator('.spec-ack');
    await expect(acknowledgments).toBeVisible();
    await expect(acknowledgments.locator('.spec-ack-plate')).toHaveCount(1);
    await expect(acknowledgments).toContainText('VTS 1097 Community');
  });

  test('Specialization mobile view keeps node details and actions touch-safe', async ({ page }) => {
    test.slow();
    await page.setViewportSize({ width: 390, height: 844 });
    await openDirectTabHash(
      page,
      'specialization',
      '#specializationSection',
      '#specializationToolRoot .spec-tool'
    );

    await page.locator('[data-spec-research]').first().click();
    const node = page.locator('[data-spec-node]:not([disabled])').nth(1);
    await node.click();
    await expect(page.locator('#spec-node-inspector')).toBeVisible();
    await expect(page.locator('.spec-node-inspector-buff')).toContainText('HP +1%');
    await expect(page.locator('[data-spec-help-node]')).toBeVisible();

    const nodeBox = await node.boundingBox();
    expect(nodeBox?.width).toBeGreaterThanOrEqual(44);
    expect(nodeBox?.height).toBeGreaterThanOrEqual(44);
    await expect(page.locator('.spec-detail-actions')).toHaveCSS('position', 'sticky');
    await expect(page.locator('.spec-summary')).toBeHidden();
    const overflow = await page.locator('#specializationToolRoot').evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      return [...element.querySelectorAll('*')]
        .filter((candidate) => {
          const rect = candidate.getBoundingClientRect();
          const clippedPlannerImage =
            candidate.tagName.toLowerCase() === 'image' &&
            candidate.closest('svg.specialization-planner-sprite');
          return (
            !clippedPlannerImage &&
            rect.width > 0 &&
            rect.height > 0 &&
            (rect.right > bounds.right + 1 || rect.left < bounds.left - 1)
          );
        })
        .map((candidate) => ({
          className: candidate.className,
          left: Math.round(candidate.getBoundingClientRect().left),
          right: Math.round(candidate.getBoundingClientRect().right),
        }));
    });
    expect(overflow).toEqual([]);
  });

  test('shared roster link wins over restored selection and selects known heroes', async ({
    page,
  }) => {
    const encoded = encodeRoster(['King Arthur', 'Cleopatra VII', 'Theodora']);

    await openApp(page, `/#roster=${encoded}`);
    await page.waitForTimeout(750);

    await expect(page.locator('#generatorSection')).toBeVisible();
    await expect(page.locator('#genSelectedCount')).toHaveText('3 selected');
    await expect(page).toHaveURL(new RegExp(`#roster=${encoded}$`));
    for (const heroName of ['King Arthur', 'Cleopatra VII', 'Theodora']) {
      await expect(
        page.locator('#generatorHeroes .generator-card').filter({ hasText: heroName }).first()
      ).toHaveClass(/generator-card-selected/);
    }
  });

  test('Velo requests selected-hero consent after the user completes Generator setup', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      localStorage.setItem('vts_ai_provider_disclosure_v1', '1');
      localStorage.removeItem('vts_generator_selection_v1');
      sessionStorage.removeItem('vts_ai_session_consent_v1');
    });
    await openApp(page);

    await page.locator('#aiDrawerLauncher').click();
    await expect(page.locator('#aiDrawer')).toBeVisible({ timeout: 15000 });
    const composer = page.locator('#aiComposer');
    await expect(composer).toBeVisible({ timeout: 15000 });
    await composer.fill('Explore my best hero combos using the heroes I own.');
    await page.locator('#aiSendBtn').click();

    const setupAction = page.getByRole('button', {
      name: 'Select heroes in the Generator first.',
    });
    await expect(setupAction).toBeVisible({ timeout: 15000 });
    await setupAction.click();
    await expect(page.locator('#generatorSection')).toBeVisible();
    await page.locator('#generatorHeroes .generator-card').first().click();
    await expect(page.locator('#genSelectedCount')).toHaveText('1 selected');

    await composer.fill('I saved them');
    await page.locator('#aiSendBtn').click();

    const consent = page.locator('#aiConsentOverlay');
    const selectedHeroesConsent = consent.locator('input[value="selected_heroes"]');
    await expect(consent).toBeVisible();
    await expect(selectedHeroesConsent).toBeEnabled();
    await expect(selectedHeroesConsent).toBeChecked();
    await expect(page.locator('#aiTranscript')).not.toContainText(
      'requested app data can’t be accessed'
    );
  });

  test('manual and generator tabs render', async ({ page }) => {
    await openApp(page);
    await expectTab(page, '#tabManual', '#manualSection', '#availableHeroes');
    const firstHero = page.locator('#availableHeroes .hero-card').first();
    const firstHeroName = await firstHero.getAttribute('data-hero-name');
    await firstHero.click();
    await expect(page.locator('.combo-slot').nth(0)).toContainText(firstHeroName);
    await page.locator('#clearComboBtn').click();
    await expect(firstHero.locator('img')).toHaveAttribute('draggable', 'false');
    await page.evaluate(() => {
      const card = document.querySelector('#availableHeroes .hero-card');
      const slot = document.querySelectorAll('.combo-slot')[0];
      const dt = new DataTransfer();
      dt.setData('application/x-vts-hero-name', card.dataset.heroName);
      dt.setData('text/plain', 'https://static.wixstatic.com/media/not-a-hero.png');
      slot.dispatchEvent(
        new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt })
      );
    });
    await expect(page.locator('.combo-slot').nth(0)).toContainText(firstHeroName);
    await expect(page.locator('.combo-slot').nth(0).locator('img')).toHaveAttribute(
      'alt',
      firstHeroName
    );
    await expect(page.locator('.combo-slot').nth(0)).not.toContainText('https://');

    const secondHeroName = await page
      .locator('#availableHeroes .hero-card')
      .nth(1)
      .getAttribute('data-hero-name');
    await page.evaluate(() => {
      const card = document.querySelectorAll('#availableHeroes .hero-card')[1];
      const slot = document.querySelectorAll('.combo-slot')[0];
      const dt = new DataTransfer();
      dt.setData('application/x-vts-hero-name', card.dataset.heroName);
      dt.setData('text/plain', card.dataset.heroName);
      slot.dispatchEvent(
        new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt })
      );
    });
    await expect(page.locator('.combo-slot').nth(0)).toContainText(secondHeroName);
    const latestSlotUndo = page
      .locator('.toast.undo-toast', { hasText: 'Combo slot 1 changed' })
      .last();
    await expect(latestSlotUndo).toBeVisible();
    await latestSlotUndo.locator('button').click();
    await expect(page.locator('.toast.success', { hasText: 'Undone.' })).toBeVisible();
    await expect(page.locator('.combo-slot').nth(0)).toContainText(firstHeroName);

    await page.evaluate(() => {
      const slot = document.querySelectorAll('.combo-slot')[1];
      const dt = new DataTransfer();
      dt.setData('text/plain', 'https://static.wixstatic.com/media/not-a-hero.png');
      slot.dispatchEvent(
        new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt })
      );
    });
    await expect(page.locator('.combo-slot').nth(1)).not.toContainText('static.wixstatic.com');
    await expect(page.locator('.combo-slot').nth(1)).toContainText(
      /Drag|Arraste|Buraya|Перетащите|Arrastra|Glissez|Hierher|Seret|拖到|اسحب|여기로/
    );
    await expectTab(page, '#tabGenerator', '#generatorSection', '#generatorHeroes');
  });

  test('manual builder can show skin icons and data', async ({ page }) => {
    await openApp(page);
    await expectTab(page, '#tabManual', '#manualSection', '#availableHeroes');
    const toggle = page.locator('#manualSkinToggle');
    await expect(toggle).not.toBeChecked();
    await page.locator('#manualSkinToggleLabel').click();
    await expect(toggle).toBeChecked();
    await expect(page.locator('#manualSkinCount')).toContainText('skins');

    const jeanneCard = page
      .locator('#availableHeroes .hero-card', { hasText: "Jeanne d'Arc" })
      .first();
    await expect(jeanneCard).toHaveClass(/has-skin/);
    await expect(jeanneCard.locator('.generator-skin-badge')).toBeVisible();
    await expect(jeanneCard.locator('img')).toHaveAttribute('src', /assets\/skins\//);
  });

  test('main tab pills and theme toggle expose accessible state', async ({ page }) => {
    await openApp(page);

    await expect(page.locator('#tabGenerator')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#tabEdenX1')).toHaveAttribute('href', 'eden-x1.html');
    await expect(page.locator('#tabEdenX1')).toContainText('Eden X1 Rankings');
    await expect(page.locator('#generatorSection')).toHaveAttribute('aria-hidden', 'false');

    await page.locator('#tabManual').click();
    await expect(page.locator('#tabManual')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#tabGenerator')).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('#manualSection')).toHaveAttribute('aria-hidden', 'false');
    await expect(page.locator('#generatorSection')).toHaveAttribute('aria-hidden', 'true');

    const themeToggle = page.locator('#themeToggle');
    await expect(themeToggle).toHaveAttribute('aria-pressed', 'false');
    await themeToggle.click();
    await expect(themeToggle).toHaveAttribute('aria-pressed', 'true');
  });

  test('footer tool links switch tabs without inline handlers', async ({ page }) => {
    await openApp(page);

    await page.locator('[data-footer-tab="manual"]').click();
    await expect(page.locator('#manualSection')).toBeVisible();
    await expect(page.locator('#tabManual')).toHaveAttribute('aria-pressed', 'true');
    await expect(page).toHaveURL(/#manual$/);

    await page.locator('[data-footer-tab="generator"]').click();
    await expect(page.locator('#generatorSection')).toBeVisible();
    await expect(page.locator('#tabGenerator')).toHaveAttribute('aria-pressed', 'true');
    await expect(page).toHaveURL(/#generator$/);
  });

  test('hero atlas and research tabs render', async ({ page }) => {
    await openApp(page);
    await expectTab(page, '#tabHeroes', '#heroesSection', '#heroesSection .heroes-layout');
    await expectTab(page, '#tabResearch', '#researchSection', '#techListContainer');
  });

  test('Skin Atlas deep link preserves mode, focus, localization, and mobile layout', async ({
    page,
  }) => {
    await page.addInitScript(() => localStorage.setItem('vts_hero_lang', 'en'));
    await openDirectTabHash(
      page,
      'heroes',
      '#heroesSection',
      '#heroesSection .skin-atlas',
      '?atlas=skins'
    );

    const modeGroup = page.getByRole('group', { name: 'Skin Atlas' });
    const heroesMode = page.locator('[data-atlas-mode="heroes"]');
    const skinsMode = page.locator('[data-atlas-mode="skins"]');
    const cards = page.locator('.skin-tier-card');

    await expect(modeGroup).toBeVisible();
    await expect(modeGroup.locator('[aria-pressed="true"]')).toHaveCount(1);
    await expect(heroesMode).toHaveAttribute('aria-pressed', 'false');
    await expect(skinsMode).toHaveAttribute('aria-pressed', 'true');
    await expect(cards).toHaveCount(3);
    await expect(cards.locator('.skin-tier-name')).toHaveText([
      'Mythic',
      'Legendary',
      'Everlasting',
    ]);
    await expect(page.locator('#skinAtlasHeading')).toHaveText('Skin Atlas');

    await heroesMode.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-atlas-mode="heroes"]')).toBeFocused();
    await expect(page.locator('[data-atlas-mode="heroes"]')).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    await expect(page.locator('#heroesSection .heroes-layout')).toBeVisible();
    await expect(page.locator('.skin-atlas')).toHaveCount(0);
    await expect
      .poll(() => page.evaluate(() => new URL(window.location.href).searchParams.get('atlas')))
      .toBeNull();

    await page.locator('[data-atlas-mode="skins"]').focus();
    await page.keyboard.press('Space');
    await expect(page.locator('[data-atlas-mode="skins"]')).toBeFocused();
    await expect(page.locator('[data-atlas-mode="skins"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(cards).toHaveCount(3);
    await expect
      .poll(() => page.evaluate(() => new URL(window.location.href).searchParams.get('atlas')))
      .toBe('skins');

    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('#languageSelect').selectOption('ar');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.locator('#skinAtlasHeading')).toHaveText('أطلس الأزياء');
    await expect(cards.first().locator('.skin-tier-rank')).toHaveText('أساسي');
    await expect(cards.first().locator('.skin-tier-summary')).toContainText(
      'فئة المظاهر للمبتدئين'
    );
    await expect(
      cards.first().locator('.skin-req-name').filter({ hasText: 'ختم السيرة' }).first()
    ).toHaveText('ختم السيرة');

    const layout = await page.locator('#heroesSection').evaluate((section) => {
      const root = document.documentElement;
      const sectionRect = section.getBoundingClientRect();
      const cardsInBounds = [...section.querySelectorAll('.skin-tier-card')].every((card) => {
        const rect = card.getBoundingClientRect();
        return rect.left >= sectionRect.left - 1 && rect.right <= sectionRect.right + 1;
      });
      return {
        documentFits: root.scrollWidth <= root.clientWidth + 1,
        sectionFits: section.scrollWidth <= section.clientWidth + 1,
        cardsInBounds,
      };
    });
    expect(layout).toEqual({ documentFits: true, sectionFits: true, cardsInBounds: true });
  });

  test('dragon master materials tab renders interactive calculator', async ({ page }) => {
    await openApp(page);
    await expectTab(page, '#tabMaterials', '#materialsSection', '#materialCalculatorRoot');
    const materialsTabItem = page.locator('.tab-item', { has: page.locator('#tabMaterials') });
    await expect(materialsTabItem.locator('.tab-badge-beta')).toHaveText('Beta');
    await expect(page.locator('#materialCalculatorRoot')).toContainText(
      'Dragon Master Set Planner'
    );
    await expect(page.locator('#materialCalculatorRoot [data-dm-route]')).toHaveCount(3);
    await expect(page.locator('#materialCalculatorRoot .dm-slot-card')).toHaveCount(6);
    await expect(
      page.locator('#materialCalculatorRoot .dm-slot-card[data-dm-tier="gold"]')
    ).toHaveCount(6);
    await expect(page.locator('#materialCalculatorRoot .dm-normal-gear-card')).toHaveCount(3);
    await expect(
      page.locator('#materialCalculatorRoot .dm-normal-gear-card[data-dm-tier="purple"]')
    ).toHaveCount(3);
    await expect(page.locator('#materialCalculatorRoot .dm-normal-materials')).toHaveCount(3);
    await expect(
      page
        .locator('#materialCalculatorRoot [data-dm-recipe-ingredient][data-dm-tier="purple"]')
        .first()
    ).toBeVisible();
    await expect(
      page.locator('#materialCalculatorRoot [data-dm-inventory-item][data-dm-tier="purple"]')
    ).toHaveCount(12);
    await expect(
      page.locator('#materialCalculatorRoot .dm-slot-card.is-active .dm-slot-progress > strong')
    ).toBeVisible();
    await expect(page.locator('#materialCalculatorRoot .dm-slot-state.is-selected')).toBeVisible();
    await expect(page.locator('#materialCalculatorRoot .dm-command-header')).not.toContainText(
      'Verified crafting guide'
    );
    await expect(page.locator('#materialCalculatorRoot .dm-recipe-node')).toHaveCount(4);
    await expect(
      page.locator('#materialCalculatorRoot [data-dm-stage][data-dm-tier="purple"]')
    ).toHaveCount(1);
    await expect(
      page.locator('#materialCalculatorRoot [data-dm-stage][data-dm-tier="orange"]')
    ).toHaveCount(1);
    await expect(
      page.locator('#materialCalculatorRoot [data-dm-stage][data-dm-tier="gold"]')
    ).toHaveCount(1);
    await expect(page.locator('#materialCalculatorRoot .dm-slot-card img').first()).toHaveAttribute(
      'src',
      'assets/dm/equipment/dragon-master/gold/armor.png'
    );
    await expect(
      page.locator('#materialCalculatorRoot [data-dm-stage][data-dm-tier="purple"] .dm-stage-image')
    ).toHaveAttribute('src', 'assets/dm/equipment/dragon-master/purple/armor.png');
    await expect(
      page.locator('#materialCalculatorRoot [data-dm-stage][data-dm-tier="orange"] .dm-stage-image')
    ).toHaveAttribute('src', 'assets/dm/equipment/dragon-master/orange/armor.jpg');
    await expect(
      page.locator('#materialCalculatorRoot [data-dm-stage][data-dm-tier="gold"] .dm-stage-image')
    ).toHaveAttribute('src', 'assets/dm/equipment/dragon-master/gold/armor.png');

    await page.locator('#materialCalculatorRoot [data-dm-route="gold"]').click();
    await expect(
      page.locator('#materialCalculatorRoot [data-dm-inventory-item][data-dm-tier="gold"]')
    ).toHaveCount(12);
    await expect(page.locator('#materialCalculatorRoot [data-dm-normal-dragonite]')).toHaveCount(3);
    await expect(
      page.locator('#materialCalculatorRoot [data-dm-stage-resource="superDragonite"]')
    ).toContainText('100,000');

    await page.locator('#materialCalculatorRoot [data-dm-route="blue"]').click();
    await expect(page.locator('#materialCalculatorRoot [data-dm-route="blue"]')).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    await expect(page.locator('#materialCalculatorRoot .dm-recipe-node')).toHaveCount(5);
    await expect(
      page.locator('#materialCalculatorRoot .dm-normal-gear-card[data-dm-tier="blue"]')
    ).toHaveCount(3);
    await expect(
      page.locator('#materialCalculatorRoot [data-dm-inventory-item][data-dm-tier="blue"]')
    ).toHaveCount(12);
    await expect(
      page.locator('#materialCalculatorRoot [data-dm-stage][data-dm-tier="blue"]')
    ).toHaveCount(1);
    await expect(
      page.locator('#materialCalculatorRoot .dm-normal-gear-card').first().locator('img').first()
    ).toHaveAttribute('src', 'assets/dm/equipment/ranger/blue/armor.png');
    await expect(
      page.locator('#materialCalculatorRoot [data-dm-stage][data-dm-tier="blue"] .dm-stage-image')
    ).toHaveAttribute('src', 'assets/dm/equipment/dragon-master/blue/armor.png');
    await expect(page.locator('#materialCalculatorRoot .dm-recipe-panel')).toContainText('×64');

    await page.locator('.dm-recipe-panel [data-dm-toggle-complete]').click();
    await expect(page.locator('.dm-summary-panel')).toContainText('1 / 30');
    await expect(page.locator('.dm-slot-card[data-dm-slot="armor"]')).toHaveClass(/is-complete/);

    await page.locator('.dm-resource-panel [data-dm-toggle-breakdown]').first().click();
    await expect(page.locator('[data-dm-resource="superDragonite"]')).toBeVisible();
  });

  test('dragon master materials preserves the Korean catalog language', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('vts_hero_lang', 'kr'));
    await openApp(page);
    await expect(page.locator('html')).toHaveAttribute('lang', /^ko(?:-KR)?$/i);
    await expect(page.locator('#languageSelect')).toHaveValue('kr');

    await expectTab(page, '#tabMaterials', '#materialsSection', '#materialCalculatorRoot');

    await expect(page.locator('#languageSelect')).toHaveValue('kr');
    await expect(page.locator('#materialCalculatorRoot .dm-command-header h2')).toHaveText(
      'Dragon Master 세트 플래너'
    );
    await expect(page.locator('#materialCalculatorRoot .dm-command-header')).toContainText(
      '일반 병종 장비'
    );
  });

  test('strife planner renders monster art and F2P/P2W lanes', async ({ page }) => {
    await openApp(page);
    await expectTab(
      page,
      '#tabStrife',
      '#strifeSection',
      '#strifeToolRoot .strife-monster-card:first-child'
    );
    await expect(page.locator('#strifeToolRoot .strife-monster-card')).toHaveCount(11);
    await page.locator('[data-strife-monster="pivana"]').click();
    await expect(page.locator('.strife-monster-summary')).toContainText('Pilvana');
    await expect(page.locator('.strife-guide-notes')).toContainText('normal-attack pressure');
    await expect(page.locator('.strife-results-band--f2p')).toContainText(/Free combos/i);
    await expect(page.locator('.strife-results-band--p2w')).toContainText(/Paid combos/i);
    await expect(page.locator('.strife-skill-card')).toHaveCount(3);
    await expect(page.locator('.strife-skill-answer').first()).toContainText('Counter');
    await expect(page.locator('.strife-results-band--f2p')).toContainText(
      'Best available roster match'
    );
    await expect(page.locator('.strife-results-band--f2p')).toContainText('Hunk');

    await page.locator('[data-strife-monster="noisy-noel"]').click();
    await expect(page.locator('.strife-monster-summary')).toContainText('Noisy Noel');
    await expect(page.locator('.strife-skill-card')).toHaveCount(4);
    await expect(page.locator('.strife-results-band--f2p')).toContainText('Witch Hunter');
    await expect(page.locator('.strife-results-band--p2w')).toContainText('Ramses II');

    await page.locator('[data-strife-stage="X2"]').click();
    await page.locator('[data-strife-monster="gambosate"]').click();
    await expect(page.locator('.strife-monster-summary')).toContainText('Gambosate');
    await expect(page.locator('.strife-skill-card')).toHaveCount(4);
    await expect(page.locator('.strife-results-band--p2w')).toContainText('Beowulf');
  });

  test('lazy-loaded eden map, loyalty, and admin tabs render', async ({ page }) => {
    await openApp(page);
    await expectTab(page, '#tabEdenMap', '#edenMapSection', '#edenMapRoot');
    await expect(page.locator('#edenMapConstruction')).toHaveClass(/hidden/);
    await expect(page.locator('[data-eden-layer="strategyFloor"]')).toHaveClass(/active/);
    await expect(page.locator('[data-eden-layer="reference"]')).not.toHaveClass(/active/);
    await expect(page.locator('#edenMapCanvas')).toBeVisible();
    await expectEdenTerrainPainted(page);
    await page.evaluate(() => document.getElementById('edenSeasonModal')?.classList.add('hidden'));
    await page.locator('#edenCoordSearch').fill('800:800');
    await page.locator('#edenCoordGo').click();
    await expect(page.locator('#edenSectorSelect')).toHaveValue('C');
    await expect(page.locator('#edenZoomLevel')).toContainText('120%');
    await expect(page.locator('.eden-struct-row', { hasText: '800:800' })).toBeVisible();
    await expectEdenTerrainPainted(page);
    await expectTab(page, '#tabLoyalty', '#loyaltySection', '#loyaltyPresets');
    await expect(page.locator('#tabOcrDashboard')).toHaveAttribute('href', 'admin.html');
  });

  test('generator filters default to S0/S1 and update visible heroes', async ({ page }) => {
    await openApp(page);
    await page.locator('#heroInfoToggleLabel').click();
    await expect(page.locator('body')).toHaveClass(/hide-hero-info/);
    await expect(page.locator('#generatorHeroes .generator-card .info-btn').first()).toBeHidden();
    await page.locator('#heroInfoToggleLabel').click();
    await expect(page.locator('body')).not.toHaveClass(/hide-hero-info/);

    const cards = page.locator('#generatorHeroes .generator-card');
    await expect(cards.first()).toBeVisible();
    await cards.first().click();
    await expect(cards.first()).toHaveClass(/generator-card-selected/);
    await expect(page.locator('#genSelectedCount')).toContainText('1 selected');
    await cards.first().click();
    await expect(cards.first()).not.toHaveClass(/generator-card-selected/);
    await expect(page.locator('#genSelectedCount')).toHaveClass(/hidden/);

    await expect(page.locator('#generatorSeasonFilters input[value="S0"]')).toBeChecked();
    await expect(page.locator('#generatorSeasonFilters input[value="S1"]')).toBeChecked();

    const initialSeasons = await page
      .locator('#generatorHeroes .hero-tag')
      .evaluateAll((nodes) => [...new Set(nodes.map((node) => node.textContent.trim()))].sort());
    expect(initialSeasons).toEqual(['S0', 'S1']);

    await page.locator('#generatorTroopFilters .archers-pill').click();
    await expect(page.locator('#generatorTroopFilters input[value="All"]')).not.toBeChecked();
    await expect(page.locator('#generatorTroopFilters input[value="Archers"]')).toBeChecked();
    const filteredTroops = await cards.evaluateAll((nodes) =>
      [
        ...new Set(
          nodes
            .map(
              (node) =>
                node.dataset.heroTroop || node.querySelector('.hero-card-type')?.textContent.trim()
            )
            .filter(Boolean)
        ),
      ].sort()
    );
    expect(filteredTroops).toContain('Archers');
    expect(filteredTroops.every((troop) => troop === 'Archers' || troop === 'All')).toBe(true);

    await page.locator('#generatorSeasonFilters .s2-pill').click();
    await expect(page.locator('#generatorSeasonFilters input[value="S2"]')).toBeChecked();
    const seasonsWithS2 = await page
      .locator('#generatorHeroes .hero-tag')
      .evaluateAll((nodes) => [...new Set(nodes.map((node) => node.textContent.trim()))].sort());
    expect(seasonsWithS2).toContain('S2');

    await page.locator('#generatorSeasonFilters .x8-pill').click();
    await expect(page.locator('#generatorSeasonFilters input[value="X8"]')).toBeChecked();
    await expect(page.locator('#generatorSeasonCatchupHint')).toContainText('X8 catch-up');
    const seasonsWithX8 = await page
      .locator('#generatorHeroes .hero-tag')
      .evaluateAll((nodes) => [...new Set(nodes.map((node) => node.textContent.trim()))].sort());
    expect(seasonsWithX8).toContain('X8');
    await expect(
      page.locator('#generatorHeroes .generator-card').filter({ hasText: 'Eidolon' }).first()
    ).toBeVisible();
  });

  test('Arabic locale enables RTL without overflowing generator controls', async ({ page }) => {
    await openApp(page);
    await page.locator('#languageSelect').selectOption('ar');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
    await expect(page.locator('#tabGenerator')).toContainText('مولد');
    await expect(page.locator('#generatorHeroes .generator-card').first()).toBeVisible();

    const layout = await page.locator('#generatorSection').evaluate((section) => {
      const search = document.querySelector('#generatorHeroSearch');
      const icon = document.querySelector('#generatorSection .hero-search-icon');
      const select = document.querySelector('#languageSelect');
      const searchStyle = window.getComputedStyle(search);
      const iconStyle = window.getComputedStyle(icon);
      return {
        noSectionOverflow: section.scrollWidth <= section.clientWidth + 2,
        noDocumentOverflow:
          document.documentElement.scrollWidth <= document.documentElement.clientWidth + 2,
        searchPaddingRight: parseFloat(searchStyle.paddingRight),
        searchPaddingLeft: parseFloat(searchStyle.paddingLeft),
        iconRight: iconStyle.right,
        selectValue: select.value,
      };
    });
    expect(layout.noSectionOverflow).toBe(true);
    expect(layout.noDocumentOverflow).toBe(true);
    expect(layout.searchPaddingRight).toBeGreaterThan(layout.searchPaddingLeft);
    expect(layout.iconRight).not.toBe('auto');
    expect(layout.selectValue).toBe('ar');
  });

  test('v12 mobile nav and light theme avoid document overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openApp(page, '/?v12qa=mobile');
    await expect(page.locator('#tabOcrDashboard')).toHaveAttribute('href', 'admin.html');
    await expect(page.locator('#tabEdenX1')).toHaveAttribute('href', 'eden-x1.html');

    const darkLayout = await page.evaluate(() => {
      const nav = document.getElementById('tabNavScroll');
      const adminTab = document.getElementById('tabOcrDashboard');
      return {
        rootTheme: document.documentElement.getAttribute('data-theme') || 'dark',
        noDocumentOverflow: document.documentElement.scrollWidth <= window.innerWidth + 2,
        navScrollsInside: nav.scrollWidth >= nav.clientWidth,
        // The mobile label is real text (13.1.1 removed the font-size:0 +
        // ::after hack that blanked the button when cached CSS versions mixed).
        adminMobileLabel: (adminTab.textContent || '').trim(),
        adminLabelFontSize: Number.parseFloat(window.getComputedStyle(adminTab).fontSize),
      };
    });
    expect(darkLayout.rootTheme).toBe('dark');
    expect(darkLayout.noDocumentOverflow).toBe(true);
    expect(darkLayout.navScrollsInside).toBe(true);
    expect(darkLayout.adminMobileLabel).toContain('Admin');
    expect(darkLayout.adminLabelFontSize).toBeGreaterThan(0);

    await page.evaluate(() => {
      localStorage.setItem('vts_theme', 'light');
      document.documentElement.setAttribute('data-theme', 'light');
    });
    await expect(page.locator('#generatorSection')).toBeVisible();
    const lightLayout = await page.evaluate(() => ({
      rootTheme: document.documentElement.getAttribute('data-theme'),
      noDocumentOverflow: document.documentElement.scrollWidth <= window.innerWidth + 2,
      filterPanelReadable:
        Number.parseFloat(
          window.getComputedStyle(document.querySelector('#generatorSection .tool-filter-panel'))
            .opacity
        ) > 0.98,
    }));
    expect(lightLayout.rootTheme).toBe('light');
    expect(lightLayout.noDocumentOverflow).toBe(true);
    expect(lightLayout.filterPanelReadable).toBe(true);
  });

  test('skin data uses Arthur skill 2 and generator skin priority mode', async ({ page }) => {
    await openApp(page);
    await expect(page.locator('#skinMetaCombosTable')).toHaveCount(0);

    await page.locator('#generatorSeasonFilters .s4-pill').click();
    const normalFilteredCount = await page.locator('#generatorHeroes .generator-card').count();
    await page.locator('#genSkinToggleLabel').click();
    await expect(page.locator('#genSkinToggle')).toBeChecked();
    await expect(page.locator('#generatorHeroes .generator-card')).toHaveCount(normalFilteredCount);

    const firstGeneratorCard = page.locator('#generatorHeroes .generator-card').first();
    await expect(firstGeneratorCard).toHaveClass(/skin-priority-card/);
    await expect(firstGeneratorCard).toHaveClass(/skin-animated-portrait/);
    await expect(firstGeneratorCard.locator('.generator-skin-badge--priority')).toBeVisible();
    await expect(page.locator('#generatorHeroes .generator-card.skin-priority-muted')).toHaveCount(
      0
    );
    await expect(page.locator('#generatorHeroes .generator-card.skin-no-skin')).toHaveCount(0);

    const arthurGeneratorCard = page
      .locator('#generatorHeroes .generator-card')
      .filter({ hasText: 'King Arthur' })
      .first();
    await expect(arthurGeneratorCard).toBeVisible();
    await expect(arthurGeneratorCard).toHaveClass(/skin-priority-card/);
    await expect(arthurGeneratorCard.locator('.generator-skin-badge--priority')).toBeVisible();
    await expect(arthurGeneratorCard.locator('.generator-skin-toggle')).toHaveCount(1);

    await page.locator('#generatorSeasonFilters .x1-pill').click();
    await expect(arthurGeneratorCard).toHaveClass(/skin-priority-card/);
    await expect(arthurGeneratorCard.locator('.generator-skin-badge--priority')).toContainText('E');
    await expect(arthurGeneratorCard.locator('.generator-skin-toggle')).toHaveAttribute(
      'aria-checked',
      'true'
    );
    const arthurSkinSwitch = arthurGeneratorCard.getByRole('switch', {
      name: 'Turn off skin icon for King Arthur',
    });
    await arthurSkinSwitch.scrollIntoViewIfNeeded();
    await arthurSkinSwitch.click({ force: true });
    const arthurSkinSwitchOff = arthurGeneratorCard.getByRole('switch', {
      name: 'Turn on skin icon for King Arthur',
    });
    await expect(arthurSkinSwitchOff).toHaveAttribute('aria-checked', 'false');
    await expect(arthurGeneratorCard).not.toHaveClass(/skin-priority-card/);
    await expect(arthurGeneratorCard).not.toHaveClass(/skin-animated-portrait/);
    await arthurGeneratorCard.locator('.hero-portrait-frame').click();
    await expect(arthurGeneratorCard).toHaveClass(/generator-card-selected/);
    await arthurSkinSwitchOff.scrollIntoViewIfNeeded();
    await arthurSkinSwitchOff.click({ force: true });
    await expect(arthurGeneratorCard).toHaveClass(/skin-priority-card/);
    await expect(arthurGeneratorCard).toHaveClass(/generator-card-selected/);

    await openApp(page, '/?search=King%20Arthur&hero=King%20Arthur');
    await expectTab(page, '#tabHeroes', '#heroesSection', '#heroesSection .hero-detail-panel');
    await page.locator('[data-detail-section="skins"]').click();
    await expect(page.locator('#detail-section-skins')).toContainText(
      'Upgrades SKILL 2: Wheel of Fortune -> Eternity'
    );
    await expect(page.locator('#detail-section-skins')).not.toContainText('Slot 8');
    await expect(page.locator('#detail-section-skins')).toContainText('Biography: Hidden Power');
    await expect(page.locator('#detail-section-skins')).toContainText(
      'Own 2 Biography Skin variants'
    );
    await expect(page.locator('#detail-section-skins')).toContainText('Solid Shield');
    await expect(page.locator('#detail-section-skins')).toContainText(
      "The hero's squad gains 4% HP and takes 2% less damage."
    );
  });

  test('counter database and upgraded counter panels work', async ({ page }) => {
    await openApp(page);

    const counterIssues = await page.evaluate(async () => {
      const mod = await import('/js/counter-db.js');
      return mod.validateCounterDatabase();
    });
    expect(counterIssues).toEqual([]);

    for (const seasonPill of [
      '.s2-pill',
      '.s3-pill',
      '.s4-pill',
      '.x1-pill',
      '.x2-pill',
      '.x8-pill',
    ]) {
      await page.locator(`#generatorSeasonFilters ${seasonPill}`).click();
    }
    await page.locator('#genSelectAllBtn').click();
    await expect(page.locator('#genSelectedCount')).toContainText('selected');
    await page.locator('#generateCombosBtn').click();

    const firstGenerated = page.locator('#generatorResults .generated-combo-card').first();
    await expect(firstGenerated).toBeVisible();
    const generatedWithCounters = page
      .locator('#generatorResults .generated-combo-card')
      .filter({ has: page.locator('.counter-summary-badge:not(.counter-summary-badge--empty)') })
      .first();
    await expect(generatedWithCounters.locator('.counter-summary-badge')).toContainText(
      /\d+ counters? known/
    );
    await expect(
      generatedWithCounters.locator('.generated-counter-row--badge-only .counter-toggle-btn')
    ).toBeHidden();
    await generatedWithCounters.locator('.counter-summary-badge--action').click();
    await expect(generatedWithCounters.locator('.counter-card--mini-combo').first()).toBeVisible();
    const useCounterButton = generatedWithCounters.locator('.counter-use-btn').first();
    await expect(useCounterButton).toBeVisible();
    const counterUseValue = await useCounterButton.getAttribute('data-counter-use');
    expect(counterUseValue).toBeTruthy();

    await page.locator('#genClearAllBtn').click();
    const freshUseCounterButton = page.locator(
      `.counter-use-btn[data-counter-use="${counterUseValue}"]`
    );
    await expect(freshUseCounterButton).toBeVisible();
    await freshUseCounterButton.scrollIntoViewIfNeeded();
    await freshUseCounterButton.click();
    await expect(page.locator('#genSelectedCount')).toContainText('3 selected');

    await openApp(page, '/?search=King%20Arthur&hero=King%20Arthur');
    await expectTab(page, '#tabHeroes', '#heroesSection', '#heroesSection .hero-detail-panel');
    await expect(page.locator('[data-detail-section="counters"]')).toBeVisible();
    await page.locator('[data-detail-section="counters"]').click();
    await expect(page.locator('#detail-section-counters')).toContainText(
      'Counters involving King Arthur'
    );
    await expect(page.locator('#detail-section-counters')).toContainText('This hero counters');
    await expect(page.locator('#detail-section-counters')).toContainText(
      'This hero is countered by'
    );
  });

  test('admin dashboard requires shared admin sign-in', async ({ page }) => {
    await openAdmin(page);

    await expect(page.locator('#dashLogin')).toBeVisible();
    await expect(page.locator('#dashLoginUser')).toBeVisible();
    await expect(page.locator('#dashLoginPass')).toBeVisible();
    await expect(page.locator('#dashLoginBtn')).toBeVisible();
    await expect(page.locator('#dashGuestBtn')).toHaveCount(0);
    await expect(page.locator('#dashGuestBanner')).toHaveCount(0);
    await expect(page.locator('#dashApp')).not.toBeVisible();
  });

  test('admin authenticated boot falls back to local cache when cloud sync stalls', async ({
    page,
  }) => {
    const stalledRoutes = [];
    const seededDash = {
      last_updated: '24/06/2026, 18:00',
      total_attacks: 1,
      attacks: [
        {
          id: 'cached-attack-1',
          structure_name: 'Capital',
          structure_level: 'Lv.5',
          game_time: '24/06/2026, 18:00',
          start_time: '18:00',
          total_demolition: 999999999,
          players_count: 1,
          players: [{ name: 'Cache Tester', value: 999999999, rank: 1 }],
        },
      ],
      players_summary: [],
    };
    const productionScaleNames = Array.from(
      { length: 220 },
      (_, index) => `Cached Member ${index + 1}`
    );
    for (let attackIndex = 1; attackIndex < 69; attackIndex += 1) {
      const players = Array.from({ length: 61 }, (_, playerIndex) => ({
        name: productionScaleNames[(attackIndex * 7 + playerIndex) % productionScaleNames.length],
        value: 100000 + attackIndex * 100 + playerIndex,
        rank: playerIndex + 1,
      }));
      seededDash.attacks.push({
        id: `cached-attack-${attackIndex + 1}`,
        structure_name: attackIndex % 2 ? 'Large Town' : 'City',
        structure_level: attackIndex % 2 ? 'Lv.4' : 'Lv.5',
        game_time: `${String((attackIndex % 28) + 1).padStart(2, '0')}/06/2026, 18:00`,
        start_time: '17:30',
        total_demolition: players.reduce((sum, player) => sum + player.value, 0),
        players_count: players.length,
        players,
      });
    }
    seededDash.total_attacks = seededDash.attacks.length;

    await page.route('https://www.googletagmanager.com/**', (route) => route.abort());
    await page.route('https://www.gstatic.com/firebasejs/**', (route) => {
      stalledRoutes.push(route);
    });
    await page.route('https://firestore.googleapis.com/**', (route) => {
      stalledRoutes.push(route);
    });
    await page.addInitScript(
      ({ data }) => {
        window.VTS_ADMIN_LOCAL_TEST_AUTH = true;
        window.VTS_DASHBOARD_CLOUD_BOOT_TIMEOUT_MS = 350;
        window.__adminBootLongTasks = [];
        new PerformanceObserver((list) => {
          window.__adminBootLongTasks.push(
            ...list.getEntries().map((entry) => Math.round(entry.duration))
          );
        }).observe({ type: 'longtask', buffered: true });
        localStorage.setItem('vts_maintenance_bypass', '1');
        localStorage.setItem('vts_dashboard_cloud_boot_timeout_ms', '350');
        localStorage.setItem('vts_admin_local_test_auth', '1');
        localStorage.setItem('vts_ocr_dashboard', JSON.stringify(data));
        navigator.serviceWorker?.getRegistrations?.().then((registrations) => {
          registrations.forEach((registration) => registration.unregister());
        });
        window.caches?.keys?.().then((keys) => {
          keys.forEach((key) => caches.delete(key));
        });
      },
      { data: seededDash }
    );

    await page.goto('/admin.html', { waitUntil: 'domcontentloaded' });
    await expect(
      page.evaluate(() => ({
        hostname: location.hostname,
        globalBypass: window.VTS_ADMIN_LOCAL_TEST_AUTH,
        storedBypass: localStorage.getItem('vts_admin_local_test_auth'),
      }))
    ).resolves.toEqual({
      hostname: '127.0.0.1',
      globalBypass: true,
      storedBypass: '1',
    });
    await expect(page.locator('#dashApp')).toBeVisible({ timeout: 8000 });
    const longestBootTask = await page.evaluate(() => Math.max(0, ...window.__adminBootLongTasks));
    expect(longestBootTask).toBeLessThan(3000);
    await expect(page.locator('#dashConnecting')).toBeHidden();
    await expect(page.locator('#dashLeaderBody')).toContainText('Cache Tester');
    await expect(page.locator('#dashCloudStatusText')).toContainText('Showing local cache');

    const contributionsTab = page.locator(
      '#ocrDashboardRoot .dash-subtab-btn[data-subtab="contributions"]'
    );
    await contributionsTab.click();
    await expect(page.locator('#dashSubtabContributions')).toBeVisible();
    await expect(contributionsTab).toHaveAttribute('aria-selected', 'true');

    await Promise.all(stalledRoutes.map((route) => route.abort().catch(() => {})));
  });

  test('admin analytics renders seeded OCR insights and filters leaderboard', async ({ page }) => {
    await page.route('https://firestore.googleapis.com/**', (route) => route.abort());
    const seededDash = {
      last_updated: '20/06/2026, 12:00',
      total_attacks: 3,
      attacks: [
        {
          id: 'att-cap-1',
          structure_name: 'Capital',
          structure_level: 'Lv.5',
          game_time: '18/06/2026, 18:30',
          start_time: '18:00',
          total_demolition: 1800000,
          players_count: 3,
          players: [
            { name: 'Alpha', value: 900000, rank: 1 },
            { name: 'Bravo', value: 600000, rank: 2 },
            { name: 'Charlie', value: 300000, rank: 3 },
          ],
        },
        {
          id: 'att-gate-1',
          structure_name: 'Gate',
          structure_level: 'Lv.3',
          game_time: '19/06/2026, 12:30',
          start_time: '12:00',
          total_demolition: 920000,
          players_count: 4,
          players: [
            { name: 'Alpha', value: 500000, rank: 1 },
            { name: 'Delta', value: 400000, rank: 2 },
            { name: 'Anne', value: 9000, rank: 3 },
            { name: 'Anne...', value: 1000, rank: 4 },
          ],
        },
        {
          id: 'att-cap-2',
          structure_name: 'Capital',
          structure_level: 'Lv.5',
          game_time: '20/06/2026, 20:30',
          start_time: '20:00',
          total_demolition: 2600000,
          players_count: 3,
          players: [
            { name: 'Bravo', value: 1500000, rank: 1 },
            { name: 'Alpha', value: 700000, rank: 2 },
            { name: 'Echo', value: 400000, rank: 3 },
          ],
        },
      ],
      players_summary: [],
    };
    const boundaryPlayers = [];
    for (let i = 1; i <= 24; i++) {
      boundaryPlayers.push({
        name: `Gift Boundary ${i}`,
        value: 500 + i,
        rank: i,
      });
    }
    seededDash.attacks.push({
      id: 'att-boundary-page',
      structure_name: 'Small Town',
      structure_level: 'Lv.1',
      game_time: '20/06/2026, 10:30',
      start_time: '10:00',
      total_demolition: boundaryPlayers.reduce((sum, player) => sum + player.value, 0),
      players_count: boundaryPlayers.length,
      players: boundaryPlayers,
    });
    const seededRoster = [
      {
        date: '20/06/2026',
        members: [
          { name: 'Alpha', status: 'trusted', alliance: 0 },
          { name: 'Bravo', status: 'trusted', alliance: 0 },
          { name: 'Foxtrot', status: 'trusted', alliance: 1 },
        ],
      },
    ];
    const seededAdjustments = [
      {
        id: 'r5-bravo-road',
        season: 'season-2026',
        playerKey: 'bravo',
        playerName: 'Bravo',
        points: 1000,
        category: 'connected_road',
        note: 'Connected the road to the next target',
        createdAt: '2026-06-20T12:30:00.000Z',
        createdBy: 'local-test-admin',
      },
    ];
    await openAdmin(page);
    await page.waitForFunction(
      () =>
        typeof window.seedDashboardForSmokeTest === 'function' &&
        typeof window.switchDashSubtab === 'function'
    );
    await page.evaluate(
      ({ seededDash, seededRoster }) => {
        localStorage.setItem('vts_ocr_dashboard', JSON.stringify(seededDash));
        localStorage.setItem('vts_roster_snapshots', JSON.stringify(seededRoster));
        window.seedDashboardForSmokeTest?.(seededDash, seededRoster);
      },
      { seededDash, seededRoster }
    );

    await openLocalAdminDashboard(page);
    await page.waitForFunction(() => typeof window.setOcrDashboardDataForTest === 'function');
    await page.evaluate(
      async ({ seededDash, seededRoster, seededAdjustments }) => {
        window.setOcrDashboardDataForTest(seededDash, seededRoster, seededAdjustments);
        const resources = [
          ...new Set(performance.getEntriesByType('resource').map((entry) => entry.name)),
        ];
        const sharedUrls = resources.filter((url) => url.includes('/js/ocr-shared.js'));
        const renderUrls = resources.filter((url) => url.includes('/js/ocr-render.js'));
        for (const url of sharedUrls) {
          const shared = await import(url);
          shared.state.dashData = seededDash;
          shared.state.rosterSnapshots = seededRoster;
        }
        for (const url of renderUrls) {
          const renderer = await import(url);
          renderer.render();
        }
      },
      { seededDash, seededRoster, seededAdjustments }
    );
    await expect(page.locator('#dashLeaderBody tr', { hasText: 'Anne' })).toHaveCount(1);
    await expect(page.locator('#dashLeaderboardCard thead')).not.toContainText('Bonus');
    await expect(page.locator('#dashLeaderBody tr').first()).toContainText('Bravo');
    await expect(page.locator('#dashLeaderBody tr').first()).toContainText('2,101,000');
    await page.setViewportSize({ width: 1280, height: 768 });
    const dashboardGridMetrics = await page.evaluate(() => {
      const dashboard = document.querySelector('#dashSubtabDashboard');
      const visualGrid = dashboard?.querySelector('.dash-visuals-grid');
      const mainGrid = dashboard?.querySelector('.dash-main-grid:not(.dash-visuals-grid)');
      const topCard = visualGrid?.querySelector('.dash-chart-card');
      const insightsCard = dashboard?.querySelector('#dashInsightsCard');
      const attackCard = dashboard?.querySelector('#dashAttackHistoryCard');
      const leaderboardCard = dashboard?.querySelector('#dashLeaderboardCard');
      const rectWidth = (el) => Math.round(el?.getBoundingClientRect?.().width || 0);
      return {
        visualAlign: visualGrid ? getComputedStyle(visualGrid).alignItems : '',
        mainAlign: mainGrid ? getComputedStyle(mainGrid).alignItems : '',
        topWidth: rectWidth(topCard),
        insightWidth: rectWidth(insightsCard),
        attackWidth: rectWidth(attackCard),
        leaderboardWidth: rectWidth(leaderboardCard),
      };
    });
    expect(dashboardGridMetrics.visualAlign).toBe('stretch');
    expect(dashboardGridMetrics.mainAlign).toBe('stretch');
    expect(
      Math.abs(dashboardGridMetrics.topWidth - dashboardGridMetrics.insightWidth)
    ).toBeLessThanOrEqual(16);
    expect(dashboardGridMetrics.leaderboardWidth).toBeGreaterThan(
      dashboardGridMetrics.attackWidth + 120
    );
    await page.setViewportSize({ width: 974, height: 768 });
    const compactDashboardMetrics = await page.evaluate(() => {
      const dashboard = document.querySelector('#dashSubtabDashboard');
      const attackCard = dashboard?.querySelector('#dashAttackHistoryCard');
      const leaderboardCard = dashboard?.querySelector('#dashLeaderboardCard');
      const rectWidth = (el) => Math.round(el?.getBoundingClientRect?.().width || 0);
      return {
        attackWidth: rectWidth(attackCard),
        leaderboardWidth: rectWidth(leaderboardCard),
        attackTop: Math.round(attackCard?.getBoundingClientRect?.().top || 0),
        leaderboardTop: Math.round(leaderboardCard?.getBoundingClientRect?.().top || 0),
      };
    });
    expect(compactDashboardMetrics.leaderboardTop).toBeGreaterThan(
      compactDashboardMetrics.attackTop
    );
    expect(
      Math.abs(compactDashboardMetrics.attackWidth - compactDashboardMetrics.leaderboardWidth)
    ).toBeLessThanOrEqual(16);
    const visibleLeaderRows = await page
      .locator('#dashLeaderBody tr')
      .evaluateAll(
        (rows) => rows.filter((row) => !row.querySelector('.dash-load-more-btn')).length
      );
    expect(visibleLeaderRows).toBe(20);
    await expect(page.locator('#dashLeaderBody .dash-load-more-btn')).toContainText('Show More');
    await page.evaluate((hash) => {
      localStorage.removeItem('vts_sensitive_admin_pin_ok');
      localStorage.removeItem('vts_eden_votes_pin_ok');
      window.VTS_ADMIN_AUTH = { ...(window.VTS_ADMIN_AUTH || {}), edenVotesPinHash: hash };
      window.switchDashSubtab('conduct');
    }, TEST_SENSITIVE_ADMIN_PIN_HASH);
    await expect(page.locator('.pin-gate-dialog')).toBeVisible();
    await expect(page.locator('.pin-gate-kicker')).toContainText('Bonus Team Effort Points');
    await expect(page.locator('#dashSubtabConduct')).toBeHidden();
    await page.locator('.pin-gate-input').fill('111111');
    await page.locator('.pin-gate-btn-primary').click();
    await expect(page.locator('.pin-gate-error')).toBeVisible();
    await page.locator('.pin-gate-input').fill(TEST_SENSITIVE_ADMIN_PIN);
    await page.locator('.pin-gate-btn-primary').click();
    await expect(page.locator('.pin-gate-dialog')).toHaveCount(0);
    await expect(page.locator('#dashSubtabConduct')).toBeVisible();
    await expect(page.locator('#dashConductList')).toContainText('Bravo');
    await expect(page.locator('#dashConductList')).toContainText('Connected the road');
    await page.evaluate(() => window.switchDashSubtab('dashboard'));
    await page.waitForFunction(() => typeof window.switchDashSubtab === 'function');
    await page.evaluate(() => window.switchDashSubtab('analytics'));
    await expect(page.locator('#dashSubtabAnalytics')).toBeVisible();
    await expect(page.locator('#dashStructureChart')).toContainText('Capital');
    await expect(page.locator('#dashPlayerTrends')).toContainText('Alpha');
    await expect(page.locator('#dashHitDistribution')).toContainText('Below 5K');
    await expect(page.locator('#dashHitDistribution')).toContainText('5K-10K');
    await expect(page.locator('#dashHitDistribution')).toContainText('100K+');
    await expect(page.locator('#dashStreaks')).toContainText('Current streaks');

    await page.evaluate(() => {
      const item = Array.from(
        document.querySelectorAll('#dashStructureChart .dash-structure-item')
      ).find((node) => node.textContent?.includes('Capital'));
      if (!item) throw new Error('Capital structure item was not rendered');
      item.click();
    });
    await expect(page.locator('#dashStructureChart')).toContainText('Leaderboard filtered by');
    await expect(page.locator('#dashStructureChart')).not.toContainText('Gate');
    await page.evaluate(() => window.switchDashSubtab('dashboard'));
    await expect(page.locator('#dashLeaderBody')).toContainText('Filtered by Capital');
    await expect(page.locator('#dashLeaderBody')).toContainText('Bravo');
    await page.evaluate(async () => {
      const resources = [
        ...new Set(performance.getEntriesByType('resource').map((entry) => entry.name)),
      ];
      const sharedUrls = resources.filter((url) => url.includes('/js/ocr-shared.js'));
      const renderUrls = resources.filter((url) => url.includes('/js/ocr-render.js'));
      for (const url of sharedUrls) {
        const shared = await import(url);
        shared.state.sortCol = 'name';
        shared.state.sortDir = 'desc';
      }
      for (const url of renderUrls) {
        const renderer = await import(url);
        renderer.render();
      }
    });
    await expect(page.locator('#dashLeaderBody tr').nth(1)).toContainText('Echo');
  });

  test('bonus team effort points save locally when Firebase is not configured', async ({
    page,
  }) => {
    await page.route('https://firestore.googleapis.com/**', (route) => route.abort());
    await page.addInitScript(() => {
      window.VTS_FIREBASE_CONFIG = {
        VITE_FIREBASE_API_KEY: '',
        VITE_FIREBASE_PROJECT_ID: '',
        VITE_FIREBASE_APP_ID: '',
        VITE_FIREBASE_MESSAGING_SENDER_ID: '',
      };
    });
    const seededDash = {
      last_updated: '25/06/2026, 23:55',
      total_attacks: 1,
      attacks: [
        {
          id: 'conduct-local-1',
          structure_name: 'Town',
          structure_level: 'Lv.4',
          game_time: '25/06/2026, 23:55',
          start_time: '23:45',
          total_demolition: 100000,
          players_count: 1,
          players: [{ name: '~Sarafino~', value: 100000, rank: 1 }],
        },
      ],
      players_summary: [],
    };
    const seededRoster = [
      {
        date: '2026-06-25',
        members: [{ name: '~Sarafino~', status: 'trusted', alliance: 1 }],
      },
    ];

    await openAdmin(page);
    await openLocalAdminDashboard(page);
    await page.waitForFunction(
      () =>
        typeof window.setOcrDashboardDataForTest === 'function' &&
        typeof window.switchDashSubtab === 'function'
    );
    await page.evaluate(
      ({ seededDash, seededRoster, pinHash }) => {
        localStorage.setItem('vts_sensitive_admin_pin_ok', '1');
        window.VTS_ADMIN_AUTH = { ...(window.VTS_ADMIN_AUTH || {}), edenVotesPinHash: pinHash };
        window.setOcrDashboardDataForTest(seededDash, seededRoster);
        window.switchDashSubtab('conduct');
      },
      { seededDash, seededRoster, pinHash: TEST_SENSITIVE_ADMIN_PIN_HASH }
    );

    await page.locator('#dashConductPlayerSearchBtn').click();
    await expect(page.locator('#dashConductPlayerSearchInput')).toBeVisible();
    await page.locator('#dashConductPlayerSearchInput').fill('sara');
    await expect(page.locator('#dashConductPlayer option:checked')).toHaveText('~Sarafino~');
    await page.locator('#dashConductCategory').selectOption('connected_road');
    await page.locator('#dashConductPoints').fill('1000');
    await page.locator('#dashConductNote').fill('Helped connecting roads for L4 town');
    await page.locator('#dashConductSaveBtn').click();

    await expect(page.locator('#dashConductStatus')).toContainText(
      'Bonus team effort points saved.'
    );
    await expect(page.locator('#dashConductList')).toContainText('~Sarafino~');
    await expect(page.locator('#dashConductList')).toContainText(
      'Helped connecting roads for L4 town'
    );
    await expect(page.locator('#dashConductSummary .dash-duty-summary-table')).toBeVisible();
    await expect(page.locator('#dashConductSummary')).toContainText('~Sarafino~');
    await expect(page.locator('#dashConductSummary')).toContainText('+1,000');
    await expect(page.locator('#dashConductSummary')).toContainText('Connected road');
    await expect(
      page.locator('#dashConductSummary .dash-duty-match-confirm').first()
    ).toContainText('Match to');
    await expect(
      page.locator('#dashConductSummary .dash-duty-match-confirm').first()
    ).toContainText('~Sarafino~');

    await page.locator('#dashConductPlayer').selectOption({ label: 'Other / external R5' });
    await expect(page.locator('#dashConductManualPlayerInput')).toBeVisible();
    await page.locator('#dashConductManualPlayerInput').fill('External R5');
    await page.locator('#dashConductCategory').selectOption('grant_premium');
    await expect(page.locator('#dashConductPoints')).toHaveValue('0');
    await page.locator('#dashConductNote').fill('Grant premium regardless of weighted rank');
    await page.locator('#dashConductSaveBtn').click();

    await expect(page.locator('#dashConductStatus')).toContainText(
      'Bonus team effort points saved.'
    );
    await expect(page.locator('#dashConductList')).toContainText('External R5');
    await expect(page.locator('#dashConductList')).toContainText('Grant premium reward');
    const saved = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('vts_r5_conduct_adjustments') || '[]')
    );
    expect(saved).toHaveLength(2);
    expect(saved).toContainEqual(
      expect.objectContaining({
        playerName: '~Sarafino~',
        category: 'connected_road',
        points: 1000,
      })
    );
    expect(saved).toContainEqual(
      expect.objectContaining({
        playerName: 'External R5',
        category: 'grant_premium',
        points: 0,
      })
    );
  });

  test('admin mobile special-list tables avoid overflow and label card rows', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.route('https://firestore.googleapis.com/**', (route) => route.abort());
    await page.addInitScript(() => {
      localStorage.setItem('vts_hero_lang', 'ru');
      localStorage.setItem('vts_theme', 'light');
    });
    const kikaAlt = '\ua9c1\u0f3a Kika \u0f3b\ua9c2';
    const seededDash = {
      last_updated: '25/06/2026, 23:55',
      total_attacks: 0,
      attacks: [],
      players_summary: [],
      dutyRecords: [
        {
          id: 'pather-plan-1',
          type: 'pather',
          date: '2026-06-25',
          gameTime: '23:55',
          note: 'Plan',
          createdAt: '2026-06-25T19:55:00.000Z',
          entries: [
            {
              name: 'ê§ Kika ê§‚',
              original: 'ê§ Kika ê§‚',
              confirmed: 'ê§ Kika ê§‚',
              usageTime: '23:55',
              target: 'Gate Lv5',
              group: 'Pink',
              order: '1',
              pad: '1253:645',
              status: 'exact',
            },
            {
              name: kikaAlt,
              original: kikaAlt,
              confirmed: kikaAlt,
              usageTime: '10:00',
              target: 'Gate Lv5',
              group: 'Pink',
              order: '1b',
              pad: '1253:646',
              status: 'exact',
            },
            {
              name: 'Angel Banner (zubbs)',
              original: 'Angel Banner (zubbs)',
              confirmed: 'ANGEL',
              usageTime: '10:30',
              target: 'Gate Lv5',
              group: 'Pink',
              order: '1c',
              pad: '1253:647',
              status: 'exact',
            },
            {
              name: '~Sarafino~',
              original: '~Sarafino~',
              confirmed: '~Sarafino~',
              usageTime: '00:23',
              target: 'Bridge Lv1',
              group: 'Dark Green',
              order: '2',
              pad: '1261:646',
              status: 'exact',
            },
          ],
        },
        {
          id: 'shield-wall-1',
          type: 'shield_wall',
          date: '2026-06-25',
          gameTime: '23:59 GT',
          note: 'Shield',
          createdAt: '2026-06-25T20:30:00.000Z',
          entries: [
            {
              name: '~Sarafino~',
              original: '~Sarafino~',
              confirmed: '~Sarafino~',
              usageTime: '23:59',
              target: 'Shield Wall',
              status: 'exact',
            },
          ],
        },
      ],
      contributionRecords: [
        {
          id: 'contribution-prefix-1',
          date: '2026-06-25',
          note: 'Prefix cleanup',
          createdAt: '2026-06-25T20:00:00.000Z',
          premiumSlots: 20,
          entries: [
            {
              rank: '1',
              name: '(Vts)Kika',
              guild: 'VTS X1',
              contribution: '192983',
              position: '',
            },
          ],
        },
      ],
    };
    await openAdmin(page);
    await openLocalAdminDashboard(page);
    await page.waitForFunction(
      () =>
        typeof window.setOcrDashboardDataForTest === 'function' &&
        typeof window.switchDashSubtab === 'function'
    );
    await page.evaluate((seededDash) => {
      window.setOcrDashboardDataForTest(seededDash, []);
    }, seededDash);
    await expect(page.locator('#dashWeightedContributionPanel')).toContainText(WEIGHTED_TITLE_TEXT);
    await expect(page.locator('#dashWeightedContributionPanel')).toContainText(WEIGHTED_SCORE_TEXT);

    await page.evaluate(() => window.switchDashSubtab('pathers'));

    await expect(page.locator('#dashPatherListSummary .dash-duty-summary-table')).toBeVisible();
    await expect(page.locator('#dashPatherListSummary')).toContainText('Kika');
    await expect(page.locator('#dashPatherListSummary thead')).toContainText('Записи');
    await expect(page.locator('#dashPatherListSummary thead')).toContainText('Статус');
    await expect(page.locator('#dashPatherListSummary thead')).toContainText('Время');
    await expect(page.locator('#dashPatherListSummary thead')).not.toContainText('Targets');
    await expect(page.locator('#dashPatherListSummary thead')).not.toContainText('Groups');
    const patherSummaryRows = await page
      .locator('#dashPatherListSummary .dash-duty-summary-table tbody tr')
      .evaluateAll((rows) =>
        rows.map((row) => Array.from(row.cells).map((cell) => cell.textContent.trim()))
      );
    expect(patherSummaryRows.filter((cells) => cells[0].includes('Kika'))).toHaveLength(2);
    const angelSummaryRow = patherSummaryRows.find((cells) => cells[0]?.includes('ANGEL'));
    expect(angelSummaryRow?.[3]).toContain('Exact');
    expect(angelSummaryRow?.[4]).toContain('10:30');
    await expect(page.locator('#dashPatherListBody .dash-duty-detail-table')).toBeVisible();

    const layout = await page.evaluate(() => {
      const root = document.querySelector('#ocrDashboardRoot');
      const summaryCell = document.querySelector(
        '#dashPatherListSummary .dash-duty-summary-table td:first-child'
      );
      const detailCell = document.querySelector(
        '#dashPatherListBody .dash-duty-detail-table td:first-child'
      );
      const subnav = document.querySelector('.dash-subtab-nav');
      const rowDisplay = (cell) => window.getComputedStyle(cell.closest('tr')).display;
      return {
        theme: document.documentElement.dataset.theme,
        noDocumentOverflow: document.documentElement.scrollWidth <= window.innerWidth + 2,
        noRootOverflow: root.scrollWidth <= root.clientWidth + 2,
        subnavScrollsInside: subnav.scrollWidth >= subnav.clientWidth,
        summaryLabel: window.getComputedStyle(summaryCell, '::before').content,
        detailLabel: window.getComputedStyle(detailCell, '::before').content,
        summaryRowDisplay: rowDisplay(summaryCell),
        detailRowDisplay: rowDisplay(detailCell),
      };
    });

    expect(layout.theme).toBe('light');
    expect(layout.noDocumentOverflow).toBe(true);
    expect(layout.noRootOverflow).toBe(true);
    expect(layout.subnavScrollsInside).toBe(true);
    expect(layout.summaryLabel).toContain('Игрок');
    expect(layout.detailLabel).toContain('Группа');
    expect(layout.summaryRowDisplay).toBe('block');
    expect(layout.detailRowDisplay).toBe('block');

    await page.evaluate(() => window.switchDashSubtab('shieldWall'));
    await expect(page.locator('#dashShieldWallListSummary .dash-duty-summary-table')).toBeVisible();
    await expect(page.locator('#dashShieldWallListSummary')).toContainText('~Sarafino~');
    await expect(
      page.locator('#dashShieldWallListSummary .dash-duty-match-confirm').first()
    ).toContainText('~Sarafino~');
    await expect(page.locator('#dashShieldWallListSummary')).toContainText('23:59');
    await expect(page.locator('#dashShieldWallBody .dash-duty-detail-table')).toBeVisible();

    await page.evaluate(() => window.switchDashSubtab('contributions'));
    await expect(page.locator('#dashContributionWeightedPanel')).toContainText(WEIGHTED_TITLE_TEXT);
    await expect(page.locator('#dashContributionWeightedPanel')).toContainText(WEIGHTED_SCORE_TEXT);
    await expect(page.locator('#dashContributionBody')).toContainText('Kika');
    await expect(page.locator('#dashContributionBody')).not.toContainText('(Vts)Kika');
  });

  test('admin weighted contribution hides image notes and keeps Kika accounts split', async ({
    page,
  }) => {
    await page.route('https://firestore.googleapis.com/**', (route) => route.abort());
    const kikaMain = '\ua9c1 Kika \ua9c2';
    const kikaAlt = '\ua9c1\u0f3a Kika \u0f3b\ua9c2';
    const seededDash = {
      last_updated: '25/06/2026, 23:55',
      total_attacks: 0,
      attacks: [],
      players_summary: [],
      dutyRecords: [
        {
          id: 'kika-main-pather-1',
          type: 'pather',
          date: '2026-06-25',
          entries: [{ name: kikaMain, original: kikaMain, confirmed: kikaMain }],
        },
        {
          id: 'kika-main-banner-1',
          type: 'banner',
          date: '2026-06-25',
          entries: [{ name: kikaMain, original: kikaMain, confirmed: kikaMain }],
        },
      ],
      contributionRecords: [
        {
          id: 'kika-weighted-1',
          date: '2026-06-24',
          note: 'WhatsApp Image 2026-06-25 at 01.18.36.jpeg, WhatsApp Image 2026-06-25 at 01.18.49.jpeg',
          createdAt: '2026-06-25T20:00:00.000Z',
          premiumSlots: 20,
          entries: [
            { rank: '9', name: kikaMain, guild: 'VTS X1', contribution: '144,650' },
            { rank: '48', name: kikaAlt, guild: 'VTS X1', contribution: '78,617' },
          ],
        },
      ],
      exGuildContributions: [
        {
          id: 'kika-exguild-1',
          playerName: kikaAlt,
          matchedName: kikaAlt,
          contribution: 5000,
          status: 'matched',
        },
      ],
    };
    const conductAdjustments = [
      {
        season: 'season-2026',
        player: kikaAlt,
        points: 1,
        category: 'extra_effort',
        note: 'Helped connect the south road',
      },
    ];

    await openAdmin(page);
    await openLocalAdminDashboard(page);
    await page.waitForFunction(
      () =>
        typeof window.setOcrDashboardDataForTest === 'function' &&
        typeof window.switchDashSubtab === 'function'
    );
    await page.evaluate(
      ({ dash, conduct }) => {
        window.setOcrDashboardDataForTest(dash, [], conduct);
        window.switchDashSubtab('dashboard');
      },
      { dash: seededDash, conduct: conductAdjustments }
    );

    const panel = page.locator('#dashWeightedContributionPanel');
    await expect(panel).toContainText('Weighted Total Contribution');
    await expect(panel.locator('.dash-weighted-contribution-meta')).toContainText('2026-06-24');
    await expect(panel.locator('.dash-weighted-contribution-meta')).not.toContainText(
      'WhatsApp Image'
    );
    await expect(panel.locator('.dash-weighted-contribution-meta')).not.toContainText('.jpeg');
    await panel.getByRole('button', { name: 'Compact View' }).click();
    await expect(panel.getByRole('button', { name: 'Full View' })).toBeVisible();
    await expect(panel.locator('th', { hasText: 'Contribution score' })).toBeHidden();
    await expect(panel.locator('th', { hasText: 'Ex-Guild' })).toBeHidden();
    await expect(panel.locator('th', { hasText: 'Weighted score' })).toBeVisible();

    const weightedRows = await panel
      .locator('tbody tr')
      .evaluateAll((rows) =>
        rows.map((row) => Array.from(row.cells).map((cell) => cell.textContent.trim()))
      );
    const mainRow = weightedRows.find((cells) => cells[3] === '144,650');
    const altRow = weightedRows.find((cells) => cells[3] === '78,617');

    expect(mainRow?.[4]).toBe('0');
    expect(mainRow?.[6]).toBe('0');
    expect(mainRow?.[7]).toBe('0');
    await expect(
      panel.locator('tbody tr', { hasText: '144,650' }).locator('.dash-weighted-reward-value')
    ).toHaveText('Core Rewards');
    expect(altRow?.[4]).toBe('5,000');
    expect(altRow?.[6]).toBe('1');
    expect(altRow?.[7]).toBe('1');
    await expect(
      panel.locator('tbody tr', { hasText: '78,617' }).locator('.dash-weighted-reward-value')
    ).toHaveText('Core Rewards');
    const conductTrigger = panel
      .locator('tbody tr', { hasText: '78,617' })
      .locator('.dash-weighted-conduct-trigger');
    await expect(conductTrigger).toBeVisible();
    await conductTrigger.hover();
    await expect(conductTrigger.locator('.dash-weighted-score-popover')).toContainText(
      'Helped connect the south road'
    );
    const finalRankStyle = await panel
      .locator('tbody tr', { hasText: '78,617' })
      .locator('.dash-weighted-rank-trigger')
      .evaluate((button) => {
        const style = window.getComputedStyle(button);
        return {
          backgroundColor: style.backgroundColor,
          color: style.color,
          borderRadius: style.borderRadius,
        };
      });
    expect(finalRankStyle.backgroundColor).toBe('rgba(8, 13, 24, 0.7)');
    expect(finalRankStyle.backgroundColor).not.toBe('rgb(239, 239, 239)');
    expect(finalRankStyle.color).not.toBe('rgb(0, 0, 0)');
    expect(finalRankStyle.borderRadius).toBe('999px');

    const mainScoreTrigger = panel
      .locator('tbody tr', { hasText: '78,617' })
      .locator('.dash-weighted-score-trigger:not(.dash-weighted-conduct-trigger)');
    const scorePopover = mainScoreTrigger.locator('.dash-weighted-score-popover');
    await expect(scorePopover).toBeHidden();
    await mainScoreTrigger.hover();
    await expect(scorePopover).toBeVisible();
    await expect(scorePopover).toContainText('Contribution');
    await expect(scorePopover).toContainText('Duty points');
    await expect(scorePopover).toContainText('20,000');
    await expect(scorePopover).toContainText('Total');

    const rewardTrigger = panel
      .locator('tbody tr', { hasText: '78,617' })
      .locator('.dash-weighted-reward-trigger');
    await rewardTrigger.hover();
    const rewardPopover = rewardTrigger.locator('.dash-weighted-score-popover');
    await expect(rewardPopover).toBeVisible();
    await expect(rewardPopover).toContainText('Weighted Score');
    await expect(rewardPopover).toContainText('Final rank');

    await page.evaluate(() => window.switchDashSubtab('contributions'));
    await expect(
      page.locator('#dashContributionWeightedPanel').getByRole('button', { name: 'Full View' })
    ).toBeVisible();
    await page
      .locator('#dashContributionWeightedPanel')
      .getByRole('button', { name: 'Full View' })
      .click();
    const contributionScoreTrigger = page
      .locator('#dashContributionWeightedPanel tbody tr', { hasText: '144,650' })
      .locator('.dash-weighted-score-trigger:not(.dash-weighted-conduct-trigger)');
    const contributionScorePopover = contributionScoreTrigger.locator(
      '.dash-weighted-score-popover'
    );
    await contributionScoreTrigger.focus();
    await expect(contributionScorePopover).toBeVisible();
    await expect(contributionScorePopover).toContainText('Weighted score breakdown');
    await expect(page.locator('#dashContributionWeightedPanel thead')).toContainText('Ex-Guild');
    await page.locator('#dashContributionWeightedPanel th', { hasText: 'Ex-Guild' }).click();
    await expect(page.locator('#dashContributionWeightedPanel tbody tr').first()).toContainText(
      '5,000'
    );
  });

  test('eden x1 cached boot paints reward controls while cloud refresh stalls', async ({
    page,
  }) => {
    const stalledRoutes = [];
    const cachedData = {
      syncRevision: 1,
      updatedAt: '2026-07-13T20:00:00.000Z',
      r5Season: 'season-2026',
      contributionRecords: [
        {
          id: 'eden-cached-first-paint',
          date: '2026-07-13',
          premiumSlots: 20,
          entries: [
            { rank: '1', name: 'Cache Alpha', guild: 'VTS X1', contribution: '300000' },
            { rank: '2', name: 'Cache Bravo', guild: 'VTS X1', contribution: '250000' },
            { rank: '3', name: 'Cache Charlie', guild: 'VTS X1', contribution: '200000' },
          ],
        },
      ],
      dutyRecords: [],
      attacks: [],
      edenX1VoteSettings: {
        season: 'season-2026',
        votingOpen: true,
        allowEditing: true,
        contributionRankingMode: 'default',
        closesAt: '',
      },
    };

    await page.route('https://www.googletagmanager.com/**', (route) => route.abort());
    await page.route('https://www.gstatic.com/firebasejs/**', (route) => {
      stalledRoutes.push(route);
    });
    await page.route('https://firestore.googleapis.com/**', (route) => {
      stalledRoutes.push(route);
    });
    await page.addInitScript(
      ({ data }) => {
        localStorage.setItem('vts_maintenance_bypass', '1');
        localStorage.setItem('vts_hero_lang', 'en');
        localStorage.setItem('vts_theme', 'dark');
        localStorage.setItem(
          'vts_eden_x1_public_dashboard_cache_v1',
          JSON.stringify({ savedAt: Date.now(), data })
        );
        navigator.serviceWorker?.getRegistrations?.().then((registrations) => {
          registrations.forEach((registration) => registration.unregister());
        });
      },
      { data: cachedData }
    );

    await page.goto('/eden-x1.html', { waitUntil: 'domcontentloaded' });
    const supportCard = page.locator('[data-reward-view="support"]');
    await expect(page.locator('#edenX1RewardFlowPanel')).toBeVisible({ timeout: 5000 });
    await expect(supportCard.locator('.eden-x1-flow-label').first()).toHaveText('Support Work');
    await expect(supportCard).toBeEnabled({ timeout: 5000 });
    await expect(supportCard).toHaveCSS('content-visibility', 'visible');
    await expect(page.locator('#dashWeightedContributionPanel')).toContainText('Team Players');
    await page.locator('[data-reward-view="contribution"]').click();
    const baseMode = page.locator('[data-eden-contribution-mode="default"]');
    const extendedMode = page.locator('[data-eden-contribution-mode="extended"]');
    await expect(baseMode).toHaveAttribute('aria-pressed', 'true');
    await expect(baseMode).toContainText('Base');
    await expect(baseMode).toContainText('Active');
    await expect(extendedMode).toHaveAttribute('aria-pressed', 'false');
    await expect(extendedMode).toContainText('Comparison');

    await Promise.all(stalledRoutes.map((route) => route.abort().catch(() => {})));
  });

  test('eden x1 unchanged-core refresh replaces cached vote settings, results, and conduct', async ({
    page,
  }) => {
    const fixture = createEdenX1LiveRefreshFixture();
    await installEdenX1LiveRefreshMock(page, {
      ...fixture,
      liveSettings: {
        season: 'season-2026',
        votingOpen: false,
        allowEditing: false,
        showPublicResults: false,
        contributionRankingMode: 'extended',
        closesAt: '',
      },
      publicResultsReadFails: true,
    });
    await page.route('https://www.googletagmanager.com/**', (route) => route.abort());
    await page.goto('/eden-x1.html', { waitUntil: 'domcontentloaded' });

    const panel = page.locator('#dashWeightedContributionPanel');
    await page.evaluate(() => window.__releaseEdenX1LiveRefresh());
    await expect(panel).toContainText('TBA', { timeout: 15000 });
    await expect(panel).not.toContainText('Cached Winner');

    await page.locator('[data-reward-view="contribution"]').click();
    const extendedMode = page.locator('[data-eden-contribution-mode="extended"]');
    const baseMode = page.locator('[data-eden-contribution-mode="default"]');
    await expect(extendedMode).toHaveAttribute('aria-pressed', 'true');
    await expect(extendedMode).toContainText('Active');
    await expect(baseMode).toHaveAttribute('aria-pressed', 'false');
    await expect(
      page.locator('#edenX1PublicWeightedTable tbody tr', { hasText: 'Cache Alpha' })
    ).toContainText('350,000');
  });

  test('eden x1 missing authoritative settings keeps cached Base mode fail-closed', async ({
    page,
  }) => {
    const fixture = createEdenX1LiveRefreshFixture();
    await installEdenX1LiveRefreshMock(page, {
      ...fixture,
      liveSettings: {},
      settingsExists: false,
    });
    await page.route('https://www.googletagmanager.com/**', (route) => route.abort());
    await page.goto('/eden-x1.html', { waitUntil: 'domcontentloaded' });

    const panel = page.locator('#dashWeightedContributionPanel');
    await page.evaluate(() => window.__releaseEdenX1LiveRefresh());
    await page.waitForFunction(() => window.__EDEN_X1_LIVE_REFRESH_TEST__.settingsRead);
    await expect(panel).toContainText('Cached Winner', { timeout: 15000 });
    await page.locator('[data-reward-view="contribution"]').click();
    const baseMode = page.locator('[data-eden-contribution-mode="default"]');
    const extendedMode = page.locator('[data-eden-contribution-mode="extended"]');
    await expect(baseMode).toHaveAttribute('aria-pressed', 'true');
    await expect(baseMode).toContainText('Active');
    await expect(extendedMode).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('#edenX1Error')).toBeHidden();
  });

  test('eden x1 vote uses native exact-once submission and responsive source order', async ({
    page,
  }) => {
    const members = [
      'MalakAbo',
      'Alpha',
      'Bravo',
      'Charlie',
      'Delta',
      'Echo',
      'Foxtrot',
      'Golf',
      'Hotel',
      'India',
      'Juliet',
      'Kilo',
    ].map((name, index) => ({
      rank: String(index + 1),
      name,
      guild: 'VTS X1',
      contribution: String(500000 - index * 10000),
    }));

    await openEdenX1ForTest(page);
    await page.evaluate(
      (entries) =>
        window.setEdenX1DataForTest({
          date: '2026-07-15',
          r5Season: 'season-2026',
          contributionRecords: [
            {
              id: 'native-vote-test',
              date: '2026-07-15',
              premiumSlots: 20,
              entries,
            },
          ],
          dutyRecords: [],
          publicConductAdjustments: [],
          attacks: [],
        }),
      members
    );

    const voteRail = page.locator('#edenX1VoteRail');
    await expect(voteRail.getByRole('heading', { name: 'Team Players Vote' })).toBeVisible();

    await page.setViewportSize({ width: 980, height: 900 });
    const mobileSourceLayout = await page.evaluate(() => {
      const section = document.querySelector('#ocrDashboardSection');
      const ids = [
        'dashWeightedContributionPanel',
        'edenX1VoteRail',
        'edenX1PublicOverview',
        'edenX1PublicDashboard',
      ];
      const elements = ids.map((id) => document.getElementById(id));
      if (!section || elements.some((element) => !element)) return null;
      return {
        display: getComputedStyle(section).display,
        sourceOrder: elements.map((element) => Array.from(section.children).indexOf(element)),
        topOrder: elements.map((element) => element.getBoundingClientRect().top),
      };
    });
    expect(mobileSourceLayout).not.toBeNull();
    expect(mobileSourceLayout.display).not.toBe('grid');
    expect(mobileSourceLayout.sourceOrder).toEqual(
      [...mobileSourceLayout.sourceOrder].sort((a, b) => a - b)
    );
    expect(mobileSourceLayout.topOrder).toEqual(
      [...mobileSourceLayout.topOrder].sort((a, b) => a - b)
    );

    await page.setViewportSize({ width: 981, height: 900 });
    const desktopGridBoundary = await page.evaluate(() => {
      const section = document.querySelector('#ocrDashboardSection');
      const progression = document.querySelector('#edenX1Progression');
      const weighted = document
        .querySelector('#dashWeightedContributionPanel')
        ?.getBoundingClientRect();
      const rail = document.querySelector('#edenX1VoteRail')?.getBoundingClientRect();
      const overview = document.querySelector('#edenX1PublicOverview')?.getBoundingClientRect();
      const dashboard = document.querySelector('#edenX1PublicDashboard')?.getBoundingClientRect();
      if (!section || !progression || !weighted || !rail || !overview || !dashboard) return null;
      const style = getComputedStyle(section);
      return {
        display: style.display,
        gridTemplateAreas: style.gridTemplateAreas,
        progressionGridArea: getComputedStyle(progression).gridArea,
        weightedWidth: weighted.width,
        weightedRight: weighted.right,
        railLeft: rail.left,
        overviewRight: overview.right,
        dashboardWidth: dashboard.width,
      };
    });
    expect(desktopGridBoundary).not.toBeNull();
    expect(desktopGridBoundary.display).toBe('grid');
    expect(desktopGridBoundary.gridTemplateAreas).toContain('"progress progress"');
    expect(desktopGridBoundary.progressionGridArea).toBe('progress');
    expect(desktopGridBoundary.weightedRight).toBeLessThan(desktopGridBoundary.railLeft);
    expect(desktopGridBoundary.overviewRight).toBeLessThan(desktopGridBoundary.railLeft);
    expect(desktopGridBoundary.dashboardWidth).toBeGreaterThan(desktopGridBoundary.weightedWidth);

    await page.setViewportSize({ width: 1280, height: 800 });
    await voteRail.locator('#edenX1VoterName').fill('MalakAbo');
    await voteRail.locator('#edenX1CandidateName').fill('Alpha');
    await voteRail.locator('#edenX1CandidateName2').fill('Bravo');
    await voteRail.locator('#edenX1CandidateName3').fill('Charlie');
    await voteRail.locator('#edenX1CandidateName4').fill('Delta');
    const voteSubmit = voteRail.locator('#edenX1TeamVoteForm button[type="submit"]');
    await voteSubmit.evaluate((button) =>
      button.scrollIntoView({ behavior: 'instant', block: 'center', inline: 'center' })
    );
    await expect(voteSubmit).toBeVisible();
    await page.evaluate(() => {
      const originalSetItem = Storage.prototype.setItem;
      window.__edenVoteWriteCount = 0;
      window.__edenVoteSubmitEventCount = 0;
      window.__edenVotePointerGeometry = [];
      ['pointerdown', 'pointerup'].forEach((type) => {
        window.addEventListener(
          type,
          (event) => {
            const button = document.querySelector('#edenX1TeamVoteForm button[type="submit"]');
            const rect = button?.getBoundingClientRect();
            window.__edenVotePointerGeometry.push({
              type,
              targetIsButton: event.target === button,
              scrollY: window.scrollY,
              top: rect?.top ?? null,
            });
          },
          { capture: true }
        );
      });
      document.addEventListener(
        'submit',
        (event) => {
          if (event.target?.id !== 'edenX1TeamVoteForm') return;
          window.__edenVoteSubmitEventCount += 1;
        },
        { capture: true }
      );
      Storage.prototype.setItem = function countEdenVoteWrites(key, value) {
        if (String(key).startsWith('vts_eden_x1_vote_season-2026_team_players')) {
          window.__edenVoteWriteCount += 1;
        }
        return originalSetItem.call(this, key, value);
      };
    });

    await expect(voteRail.locator('#edenX1TeamVoteForm')).toHaveAttribute(
      'data-eden-vote-submit-bound',
      '1'
    );
    // Exercise Playwright's real mouse/actionability path for the primary activation.
    await voteSubmit.click();
    const pointerGeometry = await page.evaluate(() => window.__edenVotePointerGeometry);
    expect(pointerGeometry.map(({ type, targetIsButton }) => ({ type, targetIsButton }))).toEqual([
      { type: 'pointerdown', targetIsButton: true },
      { type: 'pointerup', targetIsButton: true },
    ]);
    expect(Math.abs(pointerGeometry[1].scrollY - pointerGeometry[0].scrollY)).toBeLessThanOrEqual(
      1
    );
    expect(Math.abs(pointerGeometry[1].top - pointerGeometry[0].top)).toBeLessThanOrEqual(1);
    await expect.poll(() => page.evaluate(() => window.__edenVoteSubmitEventCount)).toBe(1);
    await expect.poll(() => page.evaluate(() => window.__edenVoteWriteCount)).toBe(1);
    await expect(voteRail.locator('#edenX1VoteStatus')).toContainText(
      'Thank you, MalakAbo. Your votes were cast for Alpha, Bravo, Charlie, Delta.'
    );

    await voteSubmit.dispatchEvent('pointerdown', { button: 0, pointerType: 'mouse' });
    await expect.poll(() => page.evaluate(() => window.__edenVoteWriteCount)).toBe(1);
    await expect.poll(() => page.evaluate(() => window.__edenVoteSubmitEventCount)).toBe(1);

    await voteSubmit.focus();
    await page.keyboard.press('Enter');
    await expect.poll(() => page.evaluate(() => window.__edenVoteSubmitEventCount)).toBe(2);
    await expect.poll(() => page.evaluate(() => window.__edenVoteWriteCount)).toBe(2);

    await voteSubmit.focus();
    await page.keyboard.press('Space');
    await expect.poll(() => page.evaluate(() => window.__edenVoteSubmitEventCount)).toBe(3);
    await expect.poll(() => page.evaluate(() => window.__edenVoteWriteCount)).toBe(3);

    await voteSubmit.dispatchEvent('pointerdown', { button: 0, pointerType: 'touch' });
    await voteSubmit.dispatchEvent('pointerup', { button: 0, pointerType: 'touch' });
    await voteSubmit.evaluate((button) => button.click());
    await expect.poll(() => page.evaluate(() => window.__edenVoteSubmitEventCount)).toBe(4);
    await expect.poll(() => page.evaluate(() => window.__edenVoteWriteCount)).toBe(4);

    const contributionViewButton = page.locator('[data-reward-view="contribution"]');
    await contributionViewButton.click();
    await expect(page.locator('#edenX1NavLoader')).toBeHidden();
    const weightedPanel = page.locator('#dashWeightedContributionPanel');
    await expect(
      weightedPanel.getByRole('heading', { name: 'Total Contribution', exact: true })
    ).toBeVisible();
    const edgeScoreTrigger = weightedPanel
      .locator('tbody tr')
      .last()
      .locator('.dash-weighted-score-trigger:not(.dash-weighted-conduct-trigger)');
    const edgeScorePopover = edgeScoreTrigger.locator('.dash-weighted-score-popover');
    const readPopoverVisibility = () =>
      edgeScorePopover.evaluate((popover) => {
        const rect = popover.getBoundingClientRect();
        const triggerRect = popover.parentElement?.getBoundingClientRect();
        const card = popover.closest('.eden-x1-weighted-card');
        const xSamples = [rect.left + 8, rect.left + rect.width / 2, rect.right - 8];
        const ySamples = [rect.top + 8, rect.top + rect.height / 2, rect.bottom - 8];
        const blockers = [];
        const previousPointerEvents = popover.style.pointerEvents;
        popover.style.pointerEvents = 'auto';
        xSamples.forEach((x) => {
          ySamples.forEach((y) => {
            if (x < 0 || x >= window.innerWidth || y < 0 || y >= window.innerHeight) return;
            const topmost = document.elementFromPoint(x, y);
            if (
              topmost &&
              topmost !== popover &&
              !popover.contains(topmost) &&
              !topmost.contains(popover)
            ) {
              const blockerRect = topmost.getBoundingClientRect();
              blockers.push({
                tag: topmost.tagName,
                id: topmost.id,
                className: String(topmost.className || ''),
                rect: {
                  left: blockerRect.left,
                  top: blockerRect.top,
                  right: blockerRect.right,
                  bottom: blockerRect.bottom,
                },
              });
            }
          });
        });
        popover.style.pointerEvents = previousPointerEvents;
        const expectedCenter = triggerRect
          ? Math.min(
              Math.max(triggerRect.left + triggerRect.width / 2, 12 + rect.width / 2),
              window.innerWidth - 12 - rect.width / 2
            )
          : null;
        const containingContextAncestors = [];
        for (let ancestor = popover.parentElement; ancestor; ancestor = ancestor.parentElement) {
          const style = getComputedStyle(ancestor);
          if (
            style.transform !== 'none' ||
            style.filter !== 'none' ||
            style.backdropFilter !== 'none' ||
            style.contain !== 'none' ||
            style.contentVisibility !== 'visible' ||
            style.willChange !== 'auto'
          ) {
            containingContextAncestors.push({
              tag: ancestor.tagName,
              id: ancestor.id,
              className: String(ancestor.className || ''),
              transform: style.transform,
              filter: style.filter,
              backdropFilter: style.backdropFilter,
              contain: style.contain,
              contentVisibility: style.contentVisibility,
              willChange: style.willChange,
            });
          }
        }
        return {
          left: rect.left,
          right: rect.right,
          top: rect.top,
          bottom: rect.bottom,
          viewportWidth: window.innerWidth,
          viewportHeight: window.innerHeight,
          position: getComputedStyle(popover).position,
          transitionProperty: getComputedStyle(popover).transitionProperty,
          cardBackdropFilter: card ? getComputedStyle(card).backdropFilter : '',
          center: rect.left + rect.width / 2,
          expectedCenter,
          inlineLeft: popover.style.left,
          containingContextAncestors,
          trigger: {
            label: popover.parentElement?.getAttribute('aria-label') || '',
            row: popover.closest('tr')?.innerText?.trim() || '',
            rect: triggerRect
              ? {
                  left: triggerRect.left,
                  top: triggerRect.top,
                  right: triggerRect.right,
                  bottom: triggerRect.bottom,
                }
              : null,
          },
          blockers,
        };
      });

    for (const width of [769, 1024, 1700]) {
      await page.setViewportSize({ width, height: 800 });
      await contributionViewButton.focus();
      await expect(edgeScorePopover).toBeHidden();
      await edgeScoreTrigger.scrollIntoViewIfNeeded();

      // Resizing can leave the stationary pointer over the trigger without
      // dispatching a fresh pointerenter. Move away first so hover exercises
      // the production positioning path at every viewport width.
      await page.mouse.move(1, 1);
      await edgeScoreTrigger.hover();
      await expect(edgeScorePopover).toBeVisible();
      const hoverPopoverVisibility = await readPopoverVisibility();
      await page.mouse.move(1, 1);
      await expect(edgeScorePopover).toBeHidden();

      await edgeScoreTrigger.click();
      await expect(edgeScorePopover).toBeVisible();
      const clickPopoverVisibility = await readPopoverVisibility();

      for (const popoverVisibility of [hoverPopoverVisibility, clickPopoverVisibility]) {
        if (popoverVisibility.blockers.length) {
          throw new Error(
            `Weighted popover collision: ${JSON.stringify({ width, popoverVisibility })}`
          );
        }
        if (
          popoverVisibility.left < 8 ||
          popoverVisibility.right > popoverVisibility.viewportWidth - 8 ||
          popoverVisibility.top < 8 ||
          popoverVisibility.bottom > popoverVisibility.viewportHeight - 8
        ) {
          throw new Error(
            `Weighted popover bounds: ${JSON.stringify({ width, popoverVisibility })}`
          );
        }
        expect(popoverVisibility.viewportWidth).toBe(width);
        expect(popoverVisibility.position).toBe('fixed');
        expect(
          popoverVisibility.transitionProperty.split(',').map((value) => value.trim())
        ).not.toContain('transform');
        expect(popoverVisibility.cardBackdropFilter).toBe('none');
        expect(popoverVisibility.left).toBeGreaterThanOrEqual(8);
        expect(popoverVisibility.right).toBeLessThanOrEqual(popoverVisibility.viewportWidth - 8);
        expect(popoverVisibility.top).toBeGreaterThanOrEqual(8);
        expect(popoverVisibility.bottom).toBeLessThanOrEqual(popoverVisibility.viewportHeight - 8);
        expect(popoverVisibility.blockers).toEqual([]);
      }
      await page.keyboard.press('Escape');
      await expect(edgeScorePopover).toBeHidden();
    }
  });

  test('eden x1 reward flow cards filter reward tables', async ({ page }) => {
    // This end-to-end scenario deliberately walks every reward lane, sorting,
    // voting, details, and persistence state. The v14 public deck now renders
    // substantially more real UI than a normal smoke case, so keep its timeout
    // proportional to the coverage instead of letting the default abort midway.
    test.setTimeout(180000);
    const contributionEntries = [
      'Alpha',
      'Bravo',
      'Charlie',
      'Delta',
      'Echo',
      'Foxtrot',
      'Golf',
      'Hotel',
      'India',
      'MalakAbo',
      'Juliet',
      'Kilo',
      'Lima',
      'Mike',
      'November',
      'Oscar',
      'Papa',
      'Romeo',
      'Sierra',
      'Tango',
      'Uniform',
      'Victor',
    ].map((name, index) => ({
      rank: String(index + 1),
      name,
      guild: 'VTS X1',
      contribution: String(
        name === 'MalakAbo'
          ? 500000
          : name === 'Tango'
            ? 59000
            : name === 'Uniform'
              ? 50000
              : 240000 - index * 9000
      ),
    }));
    const seededDash = {
      date: '2026-06-24',
      r5Season: 'season-2026',
      // Exercise the live alias path: the roster uses the numbered display name,
      // while the forfeiture record below uses the canonical public R4 name.
      rosterSnapshots: [{ members: ['Dr Thunder 293', 'Dr Thunder'] }],
      contributionRecords: [
        {
          id: 'eden-reward-flow-1',
          date: '2026-06-24',
          premiumSlots: 20,
          entries: contributionEntries,
        },
      ],
      exGuildContributions: [
        {
          id: 'eden-exguild-alpha',
          playerName: 'Alpha',
          matchedName: 'Alpha',
          contribution: 5000,
          status: 'matched',
        },
        {
          id: 'eden-exguild-november',
          playerName: 'November',
          matchedName: 'November',
          contribution: 65000,
          status: 'matched',
        },
        {
          id: 'eden-exguild-sierra-team-tie',
          playerName: 'Sierra',
          matchedName: 'Sierra',
          contribution: 20000,
          status: 'matched',
        },
        {
          id: 'eden-exguild-uniform-team-tie',
          playerName: 'Uniform',
          matchedName: 'Uniform',
          contribution: 9000,
          status: 'matched',
        },
      ],
      dutyRecords: [
        { type: 'banner', entries: [{ name: 'Alpha', confirmed: 'Alpha' }] },
        { type: 'pather', entries: [{ name: 'Bravo', confirmed: 'Bravo' }] },
        { type: 'shield_wall', entries: [{ name: 'Charlie', confirmed: 'Charlie' }] },
        { type: 'banner', entries: [{ name: 'Delta', confirmed: 'Delta' }] },
        { type: 'banner', entries: [{ name: 'Echo', confirmed: 'Echo' }] },
        { type: 'banner', entries: [{ name: 'Foxtrot', confirmed: 'Foxtrot' }] },
        { type: 'banner', entries: [{ name: 'Golf', confirmed: 'Golf' }] },
        { type: 'banner', entries: [{ name: 'Hotel', confirmed: 'Hotel' }] },
        { type: 'banner', entries: [{ name: 'Oscar', confirmed: 'Oscar' }] },
        { type: 'pather', entries: [{ name: 'Oscar', confirmed: 'Oscar' }] },
        { type: 'shield_wall', entries: [{ name: 'Oscar', confirmed: 'Oscar' }] },
      ],
      publicConductAdjustments: [
        {
          season: 'season-2026',
          player: 'Alpha',
          points: 1,
          category: 'merit_other',
        },
        {
          season: 'season-2026',
          player: 'Mike',
          points: 2,
          category: 'merit_other',
        },
        {
          season: 'season-2026',
          player: 'Tango',
          points: 1,
          category: 'merit_other',
        },
        {
          season: 'season-2026',
          player: 'Uniform',
          points: 1,
          category: 'merit_other',
        },
        {
          season: 'season-2026',
          player: 'MalakAbo',
          points: 0,
          category: 'forfeit_premium',
        },
        {
          season: 'season-2026',
          player: 'Dr Thunder',
          points: 0,
          category: 'forfeit_premium',
        },
        {
          season: 'season-2026',
          player: 'GoodnesGraycious',
          points: 0,
          category: 'forfeit_premium',
        },
      ],
      attacks: [
        {
          id: 'eden-public-attack-1',
          structure_name: 'Large Town',
          structure_level: 'Lv4',
          game_time: '24/06/2026, 20:00 GT',
          total_demolition: 120000,
          players_count: 3,
          players: [
            { name: 'Alpha', value: 70000, rank: 1 },
            { name: 'Bravo', value: 30000, rank: 2 },
            { name: 'Charlie', value: 20000, rank: 3 },
          ],
        },
        {
          id: 'eden-public-attack-2',
          structure_name: 'Gate',
          structure_level: 'L3',
          game_time: '24/06/2026, 21:00 GT',
          total_demolition: 90000,
          players_count: 2,
          players: [
            { name: 'Alpha', value: 60000, rank: 1 },
            { name: 'Delta', value: 30000, rank: 2 },
          ],
        },
        {
          id: 'eden-public-attack-3',
          structure_name: 'Large Town',
          structure_level: 'Lv4',
          game_time: '25/06/2026, 20:30 GT',
          total_demolition: 80000,
          players_count: 2,
          players: [
            { name: 'Echo', value: 50000, rank: 1 },
            { name: 'Foxtrot', value: 30000, rank: 2 },
          ],
        },
      ],
    };

    await openEdenX1ForTest(page);
    const preLoadSupportCard = page.locator('[data-reward-view="support"]');
    const preLoadTeamCard = page.locator('[data-reward-view="team"]');
    const preLoadContributionCard = page.locator('[data-reward-view="contribution"]');
    const preLoadPanel = page.locator('#dashWeightedContributionPanel');
    const preLoadConnecting = page.locator('.dash-connecting:visible').first();
    await expect(preLoadConnecting).toBeVisible();
    await expect(preLoadConnecting.locator('.dash-connecting-bar-fill')).toHaveAttribute(
      'style',
      /width:\s*4%/
    );
    await expect(preLoadConnecting.locator('.dash-connecting-bar-pct')).toHaveText('4%');
    await expect(page.locator('.eden-x1-notice')).toBeHidden();
    await expect(page.locator('.eden-x1-quicknav')).toBeHidden();
    await expect(page.locator('.eden-x1-reward-panel')).toBeHidden();
    await expect(page.locator('.admin-footer')).toBeHidden();
    await expect(preLoadTeamCard).toBeDisabled();
    await expect(preLoadTeamCard).toBeHidden();
    await expect(preLoadContributionCard).toBeDisabled();
    await page.evaluate(() => {
      document
        .querySelector('[data-reward-view="contribution"]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await expect(preLoadContributionCard).toHaveAttribute('aria-pressed', 'false');
    await expect(preLoadTeamCard).toHaveAttribute('aria-pressed', 'true');

    await page.evaluate(() => {
      // The public Sheet can resolve before Firebase and the Eden member model.
      // Hold the raw payload until canonical member identities and exclusions exist.
      window.setEdenX1ManagementVotesForTest({
        table: {
          cols: [{ label: 'Name' }, { label: 'Votes' }],
          rows: [
            { c: [{ v: 'Alpha' }, { v: 8 }] },
            { c: [{ v: 'November' }, { v: 7 }] },
            { c: [{ v: 'Victoria ~Kika~' }, { v: 4 }] },
            { c: [{ v: 'Dr Thunder 293' }, { v: 3 }] },
            { c: [{ v: 'Goodness' }, { v: 3 }] },
            { c: [{ v: 'Yankee' }, { v: 3 }] },
            { c: [{ v: 'Victor' }, { v: 2 }] },
            { c: [{ v: 'Quebec' }, { v: 2 }] },
            { c: [{ v: 'Lima' }, { v: 2 }] },
            { c: [{ v: 'Oscar' }, { v: 2 }] },
          ],
        },
      });
    });
    await page.evaluate((dash) => {
      window.setEdenX1VoteSettingsForTest({ contributionRankingMode: 'extended' });
      window.setEdenX1DataForTest(dash);
    }, seededDash);
    await expect(preLoadTeamCard).toBeEnabled();
    await expect(preLoadSupportCard).toBeEnabled();
    await expect(preLoadContributionCard).toBeEnabled();
    await expect(preLoadPanel.locator('.dash-connecting')).toHaveCount(0);
    await expect(page.locator('.eden-x1-notice')).toBeVisible();
    await expect(page.locator('.eden-x1-quicknav')).toBeVisible();
    await expect(page.locator('.eden-x1-reward-panel')).toBeVisible();
    await expect(page.locator('.admin-footer')).toBeVisible();
    await expect(preLoadSupportCard.locator('.eden-x1-flow-label').first()).toBeVisible();
    await expect(preLoadSupportCard).toHaveCSS('content-visibility', 'visible');

    const announcementCard = page.locator('[data-reward-view="announcement"]');
    await expect(announcementCard).toBeEnabled();
    await announcementCard.click();
    await expect(announcementCard).toHaveAttribute('aria-pressed', 'true');
    const announcementTable = page.locator('.eden-x1-announcement-table');
    await expect(announcementTable).toBeVisible();
    await expect(announcementTable.locator('tbody tr')).toHaveCount(20);
    await expect(announcementTable.locator('.eden-x1-announcement-chip--support')).toHaveCount(4);
    await expect(announcementTable.locator('.eden-x1-announcement-chip--contribution')).toHaveCount(
      10
    );
    await expect(announcementTable.locator('.eden-x1-announcement-chip--management')).toHaveCount(
      3
    );
    await expect(announcementTable.locator('.eden-x1-announcement-chip--team')).toHaveCount(3);
    await expect(page.locator('.eden-x1-announcement-footer')).toContainText(
      'Congratulations, Top 20!'
    );
    await page.locator('[data-reward-view="team"]').click();
    await expect(preLoadTeamCard).toHaveAttribute('aria-pressed', 'true');

    const marquee = page.locator('#edenX1Marquee');
    const top20CutoffStat = marquee
      .locator('.eden-x1-marquee-stat')
      .filter({ hasText: 'Top 20 cutoff' });
    await expect(top20CutoffStat.locator('.eden-x1-marquee-stat-value')).toHaveText('69,000');
    await expect(marquee).not.toContainText('Duty activity');

    const panel = page.locator('#dashWeightedContributionPanel');
    const voteRail = page.locator('#edenX1VoteRail');
    await expect(preLoadTeamCard).toHaveAttribute('aria-pressed', 'true');
    await expect(panel.getByRole('heading', { name: 'Team Players', exact: true })).toBeVisible();
    await expect(panel.locator('tbody tr')).toHaveCount(3);
    await expect(voteRail.getByRole('heading', { name: 'Team Players Vote' })).toBeVisible();

    const desktopVoteLayout = await voteRail.evaluate((rail) => {
      const form = rail.querySelector('.eden-x1-vote-form');
      const railStyle = getComputedStyle(rail);
      const formStyle = form ? getComputedStyle(form) : null;
      return {
        width: rail.getBoundingClientRect().width,
        position: railStyle.position,
        overflowY: railStyle.overflowY,
        maxHeight: railStyle.maxHeight,
        columns: formStyle?.gridTemplateColumns.split(' ').filter(Boolean).length || 0,
        hasHorizontalOverflow: rail.scrollWidth > rail.clientWidth,
      };
    });
    expect(desktopVoteLayout).toMatchObject({
      position: 'relative',
      overflowY: 'visible',
      maxHeight: 'none',
      columns: 2,
      hasHorizontalOverflow: false,
    });
    expect(desktopVoteLayout.width).toBeGreaterThanOrEqual(390);
    await preLoadSupportCard.click();
    await expect(preLoadSupportCard).toHaveAttribute('aria-pressed', 'true');
    await expect(panel.locator('tbody tr')).toHaveCount(4);
    await expect(panel).toContainText('Support Work');
    const publicDashboard = page.locator('#edenX1PublicDashboard');
    const publicOverview = page.locator('#edenX1PublicOverview');
    const topNamesOverview = publicOverview.locator('#edenX1TopNamesOverview');
    await expect(page.locator('.eden-x1-vote-guidance--dashboard')).toHaveCount(1);
    await expect(topNamesOverview).toBeVisible();
    await expect(topNamesOverview).toContainText('Top names to review');
    await expect(topNamesOverview).toContainText('Most Banners & Paths');
    await expect(topNamesOverview).toContainText(
      'Combined banners, march paths, and speed tiles laid'
    );
    await expect(topNamesOverview).not.toContainText('Most Banners Placed');
    await expect(topNamesOverview).not.toContainText('Most Paths & Speed Tiles');
    await expect(topNamesOverview).not.toContainText('Most Shield Walls Built');
    await expect(topNamesOverview).toContainText('Most Structures Hit');
    await expect(topNamesOverview).toContainText('Best on Buildings');
    await expect(topNamesOverview).toContainText('Most R5 Bonus Team Effort Points');
    await expect(topNamesOverview).toContainText('Attendance Streaks');
    await expect(topNamesOverview).toContainText('in a row');
    await expect(topNamesOverview).not.toContainText('Steadiest Damage');
    const desktopPublicLayout = await page.evaluate(() => {
      const overview = document.querySelector('#edenX1PublicOverview')?.getBoundingClientRect();
      const rail = document.querySelector('#edenX1VoteRail')?.getBoundingClientRect();
      const dashboard = document.querySelector('#edenX1PublicDashboard')?.getBoundingClientRect();
      if (!overview || !rail || !dashboard) return null;
      return {
        overviewRight: overview.right,
        railLeft: rail.left,
        railRight: rail.right,
        dashboardRight: dashboard.right,
        dashboardWidth: dashboard.width,
        overviewWidth: overview.width,
      };
    });
    expect(desktopPublicLayout).not.toBeNull();
    expect(desktopPublicLayout.overviewRight).toBeLessThan(desktopPublicLayout.railLeft);
    expect(
      Math.abs(desktopPublicLayout.dashboardRight - desktopPublicLayout.railRight)
    ).toBeLessThan(3);
    expect(desktopPublicLayout.dashboardWidth).toBeGreaterThan(
      desktopPublicLayout.overviewWidth + 300
    );
    await topNamesOverview.locator('[data-eden-vote-pick]').first().click();
    await expect(publicDashboard.locator('#edenX1PublicModal')).toHaveClass(/active/);
    await expect(publicDashboard.locator('#edenX1PublicModalTitle')).not.toHaveText('');
    await publicDashboard.locator('#edenX1PublicModalClose').click();
    await expect(publicDashboard.locator('#edenX1PublicModal')).not.toHaveClass(/active/);
    await expect(publicDashboard).toContainText('Weighted Total Contribution');
    await expect(publicDashboard).toContainText('Demo view - not final yet');
    await expect(publicDashboard).toContainText('Weighted Score');
    const publicWeightedTable = publicDashboard.locator('.eden-x1-public-weighted-table');
    await expect(publicWeightedTable.locator('thead')).toContainText('Ex-Guild');
    await expect(publicWeightedTable.locator('thead')).toContainText('Shield Walls');
    await expect(publicWeightedTable.locator('thead')).toContainText('Pathers');
    await expect(publicWeightedTable.locator('thead')).toContainText('Banners');
    await expect(publicWeightedTable.locator('thead')).toContainText('Bonus Team Effort Points');
    await expect(publicWeightedTable.locator('thead')).toContainText('Total');
    await publicDashboard.locator('#edenX1PublicShowAllRows').click();
    await expect(publicWeightedTable.locator('tbody tr')).toHaveCount(22);
    const publicAlphaWeightedRow = publicWeightedTable.locator('tbody tr', { hasText: 'Alpha' });
    await expect(
      publicAlphaWeightedRow.locator('.dash-weighted-final-reward-cell .dash-weighted-reward-value')
    ).toHaveText('Guild Master Reward');
    const publicExGuildSortHeader = publicWeightedTable.locator(
      'th[data-public-weighted-sort="exGuild"]'
    );
    await publicExGuildSortHeader.click();
    await expect(publicExGuildSortHeader).toHaveAttribute('aria-sort', 'descending');
    await expect(publicWeightedTable.locator('tbody tr').first()).toContainText('November');
    await expect(publicWeightedTable.locator('tbody tr').first()).toContainText('65,000');
    const publicWeightedSearch = publicDashboard.locator('#edenX1PublicWeightedSearch');
    await expect(publicWeightedSearch).toBeVisible();
    await publicWeightedSearch.fill('Mike');
    await expect(publicWeightedTable.locator('tbody tr')).toHaveCount(1);
    await expect(publicWeightedTable.locator('tbody tr').first()).toContainText('Mike');
    await publicWeightedSearch.fill('');
    await expect(publicWeightedTable.locator('tbody tr')).toHaveCount(10);
    const myStatsCard = publicDashboard.locator('#edenX1MyStatsCard');
    const myStatsSearch = myStatsCard.locator('#edenX1MyStatsSearch');
    await expect(myStatsSearch).toBeVisible();
    await myStatsSearch.fill('Mal');
    await expect(myStatsCard.locator('.eden-x1-my-stats-suggestion').first()).toContainText(
      'MalakAbo'
    );
    await myStatsCard.locator('.eden-x1-my-stats-suggestion').first().click();
    await expect(myStatsSearch).toHaveValue('MalakAbo');
    await expect(myStatsCard.locator('.eden-x1-my-stats-suggestion')).toHaveCount(0);
    await expect(myStatsCard.locator('#edenX1MyStatsDetail')).toContainText('MalakAbo');
    await expect(myStatsCard.locator('#edenX1MyStatsDetail')).toContainText('Weighted Score');
    await expect(publicDashboard).not.toContainText('Reward Tier');
    await expect(publicDashboard).toContainText('Top Performers');
    await expect(publicDashboard).toContainText('Insights');
    await expect(publicDashboard).toContainText('Player Trends');
    await expect(publicDashboard).toContainText('Participation Heatmap');
    const originalRewardFlowViewport = page.viewportSize();
    const publicHeatmapScroll = publicDashboard.getByRole('region', {
      name: 'Participation Heatmap',
    });
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      await expect
        .poll(() =>
          publicHeatmapScroll.evaluate((element) => ({
            overflows: element.scrollWidth > element.clientWidth + 1,
            tabIndex: element.getAttribute('tabindex'),
          }))
        )
        .toEqual(
          await publicHeatmapScroll.evaluate((element) => {
            const overflows = element.scrollWidth > element.clientWidth + 1;
            return { overflows, tabIndex: overflows ? '0' : null };
          })
        );
      const heatmapState = await publicHeatmapScroll.evaluate((element) => ({
        overflows: element.scrollWidth > element.clientWidth + 1,
        documentOverflow:
          document.documentElement.scrollWidth - document.documentElement.clientWidth,
      }));
      expect(heatmapState.documentOverflow).toBeLessThanOrEqual(1);
      if (width === 320) expect(heatmapState.overflows).toBe(true);
    }
    await page.keyboard.press('Tab');
    await publicHeatmapScroll.focus();
    await expect(publicHeatmapScroll).toBeFocused();
    const heatmapFocusStyle = await publicHeatmapScroll.evaluate((element) => {
      const style = getComputedStyle(element);
      return { outlineStyle: style.outlineStyle, outlineWidth: style.outlineWidth };
    });
    expect(heatmapFocusStyle.outlineStyle).not.toBe('none');
    expect(heatmapFocusStyle.outlineWidth).toBe('2px');
    const heatmapScrollStart = await publicHeatmapScroll.evaluate((element) => element.scrollLeft);
    for (let index = 0; index < 8; index += 1) await page.keyboard.press('ArrowRight');
    await expect
      .poll(() => publicHeatmapScroll.evaluate((element) => element.scrollLeft))
      .not.toBe(heatmapScrollStart);
    await page.setViewportSize(originalRewardFlowViewport || { width: 1280, height: 800 });
    await expect(publicDashboard).toContainText('Attack History');
    await expect(publicDashboard).toContainText('Structures Leaderboard');
    await expect(publicDashboard).not.toContainText('Lowest Performers');
    await expect(publicDashboard).toContainText('Click a player name');
    await publicDashboard.locator('[data-public-player]', { hasText: 'Alpha' }).first().click();
    const publicModal = page.locator('#edenX1PublicModal');
    await expect(publicModal).toHaveClass(/active/);
    await expect(publicModal.locator('#edenX1PublicModalTitle')).toContainText(
      'Player Detail - Alpha'
    );
    await expect(publicModal).toContainText('Large Town Lv4');
    await expect(publicModal.locator('#edenX1PublicModalClose')).toBeVisible();
    await publicModal.locator('#edenX1PublicModalClose').click();
    await expect(publicModal).not.toHaveClass(/active/);
    await publicDashboard
      .locator('[data-public-structure]', { hasText: 'Large Town' })
      .first()
      .click();
    await expect(publicModal).toHaveClass(/active/);
    await expect(publicModal.locator('#edenX1PublicModalTitle')).toContainText(
      'Structure Detail - Large Town Lv4'
    );
    await expect(publicModal).toContainText('Top Players');
    await expect(publicModal.locator('#edenX1PublicModalClose')).toBeVisible();
    await publicModal.locator('#edenX1PublicModalClose').click();
    await expect(publicModal).not.toHaveClass(/active/);
    await expect(page.locator('.eden-x1-flow-card').first()).toHaveAttribute(
      'data-reward-view',
      'support'
    );
    await expect(page.locator('[data-reward-view="support"]')).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    const noticeTitleStyle = await page.locator('.eden-x1-notice strong').evaluate((title) => {
      const titleStyle = window.getComputedStyle(title);
      const noticeStyle = window.getComputedStyle(title.closest('.eden-x1-notice'));
      return {
        color: titleStyle.color,
        fontSize: Number.parseFloat(titleStyle.fontSize),
        textAlign: noticeStyle.textAlign,
        flexBasis: titleStyle.flexBasis,
      };
    });
    expect(noticeTitleStyle.color).toBe('rgb(239, 68, 68)');
    expect(noticeTitleStyle.fontSize).toBeGreaterThan(22);
    expect(noticeTitleStyle.textAlign).toBe('center');
    expect(noticeTitleStyle.flexBasis).toBe('100%');
    const languageLabels = await page
      .locator('#languageSelect option')
      .evaluateAll((options) => options.map((option) => option.textContent.trim()));
    expect(languageLabels).toEqual([
      'English',
      'Español',
      'Português',
      'Deutsch',
      'Français',
      'Hrvatski',
      'Türkçe',
      'Русский',
      'Bahasa Indonesia',
      '中文',
      'العربية',
      '한국어',
    ]);
    await page.locator('#languageSelect').selectOption('es');
    await expect(page.locator('.eden-x1-notice strong')).toHaveText('Vista demo - no final.');
    await expect(page.locator('.eden-x1-notice')).toContainText('recompensas finales');
    await page.locator('#languageSelect').selectOption('zh');
    await expect(page.locator('.eden-x1-notice strong')).toHaveText('演示视图 - 非最终版。');
    await expect(page.locator('.eden-x1-reward-panel')).toContainText('奖励流程');
    await expect(page.locator('.eden-x1-reward-panel')).toContainText('计划的前20名奖励分配');
    await expect(page.locator('.eden-x1-reward-flow')).toHaveAttribute(
      'aria-label',
      '前 20 名奖励分配方案'
    );
    await expect(page.locator('[data-reward-view="support"]')).toContainText('支援工作');
    await expect(panel.locator('h2')).toContainText('支援工作');
    await expect(panel.locator('thead')).toContainText('加权分数');
    await page.locator('#languageSelect').selectOption('en');

    const supportCard = page.locator('[data-reward-view="support"]');
    await expect(supportCard).toHaveAttribute('aria-pressed', 'true');
    await expect(supportCard.locator('.eden-x1-flow-action')).toHaveText('View table');
    await expect(panel.locator('h2')).toContainText('Support Work');
    await expect(panel.locator('.dash-weighted-contribution-meta')).toContainText(
      'weighted score among players with support work'
    );
    await expect(panel.locator('tbody tr')).toHaveCount(4);
    const supportTableMetrics = await panel
      .locator('.dash-weighted-contribution-table-wrap')
      .evaluate((wrap) => ({
        clientHeight: Math.ceil(wrap.clientHeight),
        scrollHeight: Math.ceil(wrap.scrollHeight),
      }));
    expect(supportTableMetrics.clientHeight).toBeLessThan(620);
    expect(supportTableMetrics.scrollHeight - supportTableMetrics.clientHeight).toBeLessThanOrEqual(
      8
    );
    const supportScoreTrigger = panel
      .locator('tbody tr')
      .first()
      .locator('.dash-weighted-score-trigger:not(.dash-weighted-conduct-trigger)');
    await supportScoreTrigger.hover();
    // A deferred public-data refresh can replace the hovered row while this
    // long smoke case is running. Re-focus the current trigger so the
    // accessibility path and viewport-position assertions target the live row.
    await supportScoreTrigger.focus();
    const supportScorePopover = supportScoreTrigger.locator('.dash-weighted-score-popover');
    await expect(supportScorePopover).toBeVisible();
    const supportPopoverMetrics = await supportScorePopover.evaluate((popover) => {
      const rect = popover.getBoundingClientRect();
      return {
        position: window.getComputedStyle(popover).position,
        top: Math.floor(rect.top),
        bottom: Math.ceil(rect.bottom),
        viewportHeight: window.innerHeight,
      };
    });
    expect(supportPopoverMetrics.position).toBe('fixed');
    expect(supportPopoverMetrics.top).toBeGreaterThanOrEqual(8);
    expect(supportPopoverMetrics.bottom).toBeLessThanOrEqual(
      supportPopoverMetrics.viewportHeight - 8
    );
    await expect(panel).toContainText('Alpha');
    await expect(panel.locator('tbody tr').first()).toContainText('Alpha');
    const supportHonorRow = panel.locator('tbody tr.eden-x1-support-honor-row');
    await expect(supportHonorRow).toHaveCount(1);
    await expect(
      supportHonorRow.locator('.dash-weighted-player-cell .eden-x1-support-honor-name')
    ).toContainText('Alpha');
    await expect(panel).toContainText('Delta');
    const supportPlayerNames = await panel
      .locator('tbody tr .dash-weighted-player-cell strong')
      .evaluateAll((cells) => cells.map((cell) => cell.textContent.trim()));
    expect(supportPlayerNames).toEqual(['Alpha', 'Bravo', 'Charlie', 'Delta']);
    expect(supportPlayerNames).not.toContain('MalakAbo');
    await expect(
      panel.locator('tbody tr').first().locator('.dash-weighted-desktop-number')
    ).toHaveText('1');
    await expect(panel.locator('tbody tr .dash-weighted-reward-value')).toContainText([
      'Guild Master Reward',
      'Core Rewards',
      'Core Rewards',
      'Core Rewards',
    ]);
    const rewardHeaders = await panel
      .locator('thead th')
      .evaluateAll((headers) => headers.map((header) => header.textContent.trim()));
    expect(rewardHeaders.slice(5, 12)).toEqual([
      'Ex-Guild',
      'Shield Walls',
      'Pathers',
      'Banners',
      'Bonus Team Effort Points',
      'Total',
      'Weighted Score',
    ]);
    await expect(panel.locator('#edenX1MobileSort')).toContainText('Ex-Guild');
    const alphaSupportRow = panel.locator('tbody tr', { hasText: 'Alpha' });
    await expect(alphaSupportRow.locator('td').nth(5)).toHaveText('5,000');
    await expect(alphaSupportRow.locator('td').nth(9)).toContainText('+1');
    await expect(alphaSupportRow.locator('td').nth(10)).toHaveText('2');
    const bravoSupportRow = panel.locator('tbody tr', { hasText: 'Bravo' });
    await expect(bravoSupportRow.locator('td').nth(10)).toHaveText('1');
    const alphaConductTrigger = alphaSupportRow.locator('.dash-weighted-conduct-trigger');
    await expect(alphaConductTrigger).toContainText('+1');
    await alphaConductTrigger.hover();
    const conductPopover = alphaConductTrigger.locator('.dash-weighted-score-popover');
    await expect(conductPopover).toBeVisible();
    // The popover carries an X close control (a leading "×"), so match on the
    // message text rather than the exact full text content.
    await expect(conductPopover).toContainText(
      'These bonus team effort points are assigned by R5 MalakAbo. Details cannot be viewed publicly; reach out to appeal.'
    );
    await expect(conductPopover).not.toContainText('20,000');
    const exGuildSortHeader = panel.locator('th[data-weighted-sort="exGuild"]');
    await exGuildSortHeader.click();
    await expect(exGuildSortHeader).toHaveAttribute('aria-sort', 'descending');
    await expect(panel.locator('tbody tr').first()).toContainText('Alpha');
    await expect(panel.locator('tbody tr').first()).toContainText('5,000');
    await panel.locator('#edenX1TableSearch').fill('5,000');
    await expect(panel.locator('tbody tr')).toHaveCount(1);
    await expect(panel.locator('tbody tr').first()).toContainText('Alpha');
    await panel.locator('#edenX1TableSearch').fill('');
    await expect(panel.locator('tbody tr')).toHaveCount(4);
    const playerSortHeader = panel.locator('th[data-weighted-sort="player"]');
    await playerSortHeader.click();
    await playerSortHeader.click();
    await expect(playerSortHeader).toHaveAttribute('aria-sort', 'descending');
    await expect(panel.locator('tbody tr').first()).toContainText('Delta');
    await expect(
      panel.locator('tbody tr').first().locator('.dash-weighted-reward-value')
    ).toContainText('Core Rewards');
    await expect(
      panel.locator('tbody tr', { hasText: 'Alpha' }).locator('.dash-weighted-reward-value')
    ).toContainText('Guild Master Reward');
    await panel.locator('th[data-weighted-sort="number"]').click();
    await expect(panel.locator('tbody tr').first()).toContainText('Alpha');
    const supportNames = await panel
      .locator('tbody tr')
      .evaluateAll((rows) => rows.map((row) => row.cells[1]?.textContent?.trim()));

    const contributionCard = page.locator('[data-reward-view="contribution"]');
    await contributionCard.click();
    await expect(contributionCard).toHaveAttribute('aria-pressed', 'true');
    await expect(topNamesOverview).toBeVisible();
    await expect(panel.locator('h2')).toContainText('Total Contribution');
    await expect(panel.locator('.dash-weighted-contribution-meta')).toContainText(
      'weighted total contribution'
    );
    const contributionModeSwitch = panel.locator('.eden-x1-contribution-mode-switch');
    const extendedModeButton = contributionModeSwitch.locator(
      '[data-eden-contribution-mode="extended"]'
    );
    const defaultModeButton = contributionModeSwitch.locator(
      '[data-eden-contribution-mode="default"]'
    );
    await expect(extendedModeButton).toHaveAttribute('aria-pressed', 'true');
    await expect(extendedModeButton).toContainText('Active');
    await expect(defaultModeButton).toContainText('Comparison');
    await panel.locator('#edenX1ShowAllRows').dispatchEvent('click');
    await expect(panel.locator('tbody tr')).toHaveCount(11);
    const contributionDisplayNumbers = await panel
      .locator('tbody tr')
      .evaluateAll((rows) =>
        rows.map((row) => row.querySelector('.dash-weighted-desktop-number')?.textContent?.trim())
      );
    expect(contributionDisplayNumbers).toEqual([
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
      '8',
      '9',
      '10',
      '11',
    ]);
    await expect(panel.locator('tbody tr').first()).toContainText('MalakAbo');
    await expect(
      panel.locator('tbody tr').first().locator('.dash-weighted-desktop-number')
    ).toHaveText('1');
    await expect(panel.locator('tbody tr').first()).toContainText('Skipped premium tier');
    await expect(panel.locator('tbody tr').nth(1)).toContainText('Echo');
    await expect(panel.locator('tbody tr').nth(1)).toContainText('#6');
    const contributionNames = await panel
      .locator('tbody tr')
      .evaluateAll((rows) =>
        rows.map(
          (row) =>
            row.cells[1]?.querySelector('.dash-player-rank-label')?.textContent?.trim() ||
            row.cells[1]?.textContent?.trim()
        )
      );
    expect(contributionNames).toEqual([
      'MalakAbo',
      'Echo',
      'Foxtrot',
      'Golf',
      'Hotel',
      'November',
      'India',
      'Juliet',
      'Mike',
      'Kilo',
      'Oscar',
    ]);
    expect(contributionNames.filter((name) => supportNames.includes(name))).toEqual([]);
    expect(contributionNames).not.toContain('Alpha');
    expect(contributionNames).not.toContain('Bravo');
    expect(contributionNames).not.toContain('Charlie');
    expect(contributionNames).not.toContain('Delta');
    await defaultModeButton.click();
    await expect(panel.locator('.dash-weighted-contribution-meta')).toContainText(
      'Comparison only; it does not change downstream reward names.'
    );
    await panel.locator('#edenX1ShowAllRows').dispatchEvent('click');
    const defaultContributionNames = await panel
      .locator('tbody tr')
      .evaluateAll((rows) =>
        rows.map(
          (row) =>
            row.cells[1]?.querySelector('.dash-player-rank-label')?.textContent?.trim() ||
            row.cells[1]?.textContent?.trim()
        )
      );
    expect(defaultContributionNames).toEqual([
      'MalakAbo',
      'Echo',
      'Foxtrot',
      'Golf',
      'November',
      'Hotel',
      'India',
      'Juliet',
      'Kilo',
      'Lima',
      'Mike',
    ]);
    expect(defaultContributionNames).toContain('Lima');
    expect(defaultContributionNames).not.toContain('Oscar');
    await extendedModeButton.click();
    await panel.locator('#edenX1ShowAllRows').dispatchEvent('click');
    const novemberContributionRow = panel.locator('tbody tr', { hasText: 'November' });
    await expect(novemberContributionRow.locator('td').nth(5)).toHaveText('65,000');
    await panel.locator('#edenX1TableSearch').fill('Kilo');
    await expect(panel.locator('tbody tr')).toHaveCount(1);
    await expect(panel.locator('tbody tr').first()).toContainText('Kilo');
    await panel.locator('#edenX1TableSearch').fill('');
    await expect(panel.locator('tbody tr')).toHaveCount(10);
    const contributionPlayerSort = panel.locator('th[data-weighted-sort="player"]');
    await contributionPlayerSort.click();
    await contributionPlayerSort.click();
    await expect(contributionPlayerSort).toHaveAttribute('aria-sort', 'descending');
    await expect(panel.locator('tbody tr').first()).toContainText('Oscar');
    const noForfeitDash = {
      ...seededDash,
      publicConductAdjustments: seededDash.publicConductAdjustments.filter(
        (entry) => entry.category !== 'forfeit_premium'
      ),
    };
    await page.evaluate((dash) => {
      window.setEdenX1DataForTest(dash);
    }, noForfeitDash);
    await expect(contributionCard).toHaveAttribute('aria-pressed', 'true');
    const noForfeitMalakRow = panel.locator('tbody tr', { hasText: 'MalakAbo' });
    await expect(noForfeitMalakRow).toBeVisible();
    await expect(noForfeitMalakRow.locator('.dash-weighted-reward-value')).toContainText(
      'Core Rewards'
    );
    await page.evaluate((dash) => {
      window.setEdenX1DataForTest(dash);
    }, seededDash);
    const managementCard = page.locator('[data-reward-view="management"]');
    await expect(managementCard).toContainText('Top three eligible names');
    await expect(managementCard).not.toContainText('One fixed management');
    await managementCard.click();
    await expect(managementCard).toHaveAttribute('aria-pressed', 'true');
    await expect(topNamesOverview).toBeVisible();
    await expect(panel.locator('h2')).toContainText('R4 / Management');
    await expect(panel.locator('.dash-weighted-contribution-meta')).toContainText(
      'Top three eligible management vote names'
    );
    await expect(panel).not.toContainText('Assigned');
    await expect(panel.locator('tbody tr')).toHaveCount(3);
    const managementRows = await panel.locator('tbody tr').evaluateAll((rows) =>
      rows.map((row) => ({
        name:
          row.cells[1]?.querySelector('.dash-player-rank-label')?.textContent?.trim() ||
          row.cells[1]?.textContent?.trim(),
        tag: row.cells[1]?.querySelector('.dash-player-rank-tag')?.textContent?.trim() || '',
        status:
          row.cells[3]?.querySelector('.eden-x1-slot-status-label')?.textContent?.trim() ||
          row.cells[3]?.textContent?.trim(),
      }))
    );
    expect(managementRows).toEqual([
      { name: '\ua9c1\u0f3a Kika \u0f3b\ua9c2', tag: 'R4', status: 'Voted · R4 / Management' },
      { name: 'Yankee', tag: '', status: 'Voted · R4 / Management' },
      {
        name: 'Lima',
        tag: '',
        status: 'Voted · R4 / Management · Tie-break applied.',
      },
    ]);
    const votedStatus = panel
      .locator('.eden-x1-slot-status-trigger', { hasText: 'Voted · R4 / Management' })
      .first();
    const votedStatusPopover = votedStatus.locator('.dash-weighted-score-popover');
    await expect(votedStatus).toHaveAccessibleName('Voted · R4 / Management');
    await expect(votedStatus).toHaveAccessibleDescription(/R4 \/ Management · Status detail/);
    const votedStatusAccessibility = await votedStatus.evaluate((button) => {
      const describedBy = (button.getAttribute('aria-describedby') || '')
        .trim()
        .split(/\s+/)
        .filter(Boolean);
      return {
        ariaLabel: button.getAttribute('aria-label'),
        describedBy,
        describedElementCounts: describedBy.map(
          (id) => document.querySelectorAll(`[id="${CSS.escape(id)}"]`).length
        ),
        visibleLabel: button.querySelector('.eden-x1-slot-status-label')?.textContent?.trim(),
      };
    });
    expect(votedStatusAccessibility).toEqual({
      ariaLabel: null,
      describedBy: ['edenX1SlotStatusTip-management-1'],
      describedElementCounts: [1],
      visibleLabel: 'Voted · R4 / Management',
    });
    await votedStatus.focus();
    await page.keyboard.press('Enter');
    await expect(votedStatusPopover).toBeVisible();
    await expect(votedStatusPopover).toContainText('R4 / Management · Status detail');
    await expect(votedStatusPopover).toContainText('Voted');
    await expect(votedStatusPopover).toContainText('4');
    await expect(votedStatusPopover).toContainText('Voting rank #3 · 4 members voted');
    await expect(votedStatusPopover).toContainText('Bonus Team Effort Points');
    await expect(votedStatusPopover).toContainText('Bonus team effort points');
    await expect(votedStatusPopover).toContainText('Weighted Total Contribution');
    await expect(votedStatusPopover).toContainText(
      'Top three eligible names from anonymous management voting.'
    );
    const managementPaintState = await readPopoverPaintState(votedStatusPopover);
    expect(managementPaintState.blockers).toEqual([]);
    expect(managementPaintState.left).toBeGreaterThanOrEqual(8);
    expect(managementPaintState.right).toBeLessThanOrEqual(managementPaintState.viewportWidth - 8);
    expect(managementPaintState.top).toBeGreaterThanOrEqual(8);
    expect(managementPaintState.bottom).toBeLessThanOrEqual(
      managementPaintState.viewportHeight - 8
    );
    await page.keyboard.press('Escape');
    await expect(votedStatusPopover).toBeHidden();
    await expect(votedStatus).toBeFocused();
    const tiedStatus = panel.locator('.eden-x1-slot-status-trigger', {
      hasText: 'Tie-break applied.',
    });
    const tiedStatusPopover = tiedStatus.locator('.dash-weighted-score-popover');
    await expect(tiedStatus).toHaveAccessibleName('Voted · R4 / Management · Tie-break applied.');
    await tiedStatus.focus();
    await page.keyboard.press('Space');
    await expect(tiedStatusPopover).toContainText('R4 / Management · Status detail');
    await expect(tiedStatusPopover).toContainText('Voted');
    await expect(tiedStatusPopover).toContainText('2');
    await expect(tiedStatusPopover).toContainText('Tie-break applied.');
    await expect(tiedStatusPopover).toContainText('#2 · Weighted Total Contribution');
    await expect(tiedStatusPopover).toContainText('Lima');
    await expect(tiedStatusPopover).toContainText('Quebec');
    await expect(tiedStatusPopover).toContainText('Victor');
    await expect(tiedStatusPopover).toContainText(
      'Top three eligible names from anonymous management voting.'
    );
    await page.keyboard.press('Escape');
    await page.evaluate(() => {
      window.setEdenX1VoteSettingsForTest({ contributionRankingMode: 'default' });
    });
    await expect(panel.locator('tbody tr').nth(2)).toContainText('Oscar');
    const defaultManagementNames = await panel
      .locator('tbody tr td:nth-child(2)')
      .evaluateAll((cells) => cells.map((cell) => cell.textContent?.trim()));
    expect(defaultManagementNames).toContain('Oscar');
    expect(defaultManagementNames).not.toContain('Lima');
    await page.evaluate(() => {
      window.setEdenX1VoteSettingsForTest({ contributionRankingMode: 'extended' });
    });
    await expect(panel.locator('tbody tr').nth(2)).toContainText('Lima');

    await page.evaluate(async (dash) => {
      await window.setEdenX1DataForTest(dash);
      window.setEdenX1ManagementVotesForTest({
        table: {
          cols: [{ label: 'Name' }, { label: 'Votes' }],
          rows: [
            { c: [{ v: 'Dr Thunder 293' }, { v: 2 }] },
            { c: [{ v: 'Dr Thunder' }, { v: 2 }] },
            { c: [{ v: 'Yankee' }, { v: 1 }] },
            { c: [{ v: 'Quebec' }, { v: 1 }] },
          ],
        },
      });
    }, noForfeitDash);
    const drThunderManagementRow = panel.locator('tbody tr').filter({ hasText: 'Dr Thunder' });
    await expect(drThunderManagementRow).toHaveCount(1);
    await expect(drThunderManagementRow).toContainText('Dr Thunder');
    const drThunderManagementStatus = drThunderManagementRow.locator(
      '.eden-x1-slot-status-trigger'
    );
    await drThunderManagementStatus.focus();
    await page.keyboard.press('Enter');
    await expect(drThunderManagementStatus.locator('.dash-weighted-score-popover')).toContainText(
      'Voting rank #1 · 4 members voted'
    );
    await page.keyboard.press('Escape');

    await page.evaluate(async (dash) => {
      await window.setEdenX1DataForTest(dash);
      window.setEdenX1ManagementVotesForTest({
        table: {
          cols: [{ label: 'Name' }, { label: 'Votes' }],
          rows: [
            { c: [{ v: 'Alpha' }, { v: 8 }] },
            { c: [{ v: 'November' }, { v: 7 }] },
            { c: [{ v: 'Victoria ~Kika~' }, { v: 4 }] },
            { c: [{ v: 'Dr Thunder 293' }, { v: 3 }] },
            { c: [{ v: 'Goodness' }, { v: 3 }] },
            { c: [{ v: 'Yankee' }, { v: 3 }] },
            { c: [{ v: 'Victor' }, { v: 2 }] },
            { c: [{ v: 'Quebec' }, { v: 2 }] },
            { c: [{ v: 'Lima' }, { v: 2 }] },
            { c: [{ v: 'Oscar' }, { v: 2 }] },
          ],
        },
      });
    }, seededDash);
    await expect(panel.locator('tbody tr')).toContainText(['꧁༺ Kika ༻꧂', 'Yankee', 'Lima']);

    await page.evaluate(async () => {
      window.VTS_EDEN_X1_MANAGEMENT_VOTE_LOADER = () =>
        Promise.reject(new Error('simulated management vote outage'));
      await window.loadEdenX1ManagementVotesForTest({ force: true });
    });
    await expect(panel).toContainText('Management votes temporarily unavailable');
    const managementRetry = panel.locator('#edenX1ManagementVotesRetry');
    await expect(managementRetry).toBeVisible();
    await page.evaluate(() => {
      window.VTS_EDEN_X1_MANAGEMENT_VOTE_LOADER = () =>
        Promise.resolve({
          table: {
            cols: [{ label: 'Name' }, { label: 'Votes' }],
            rows: [
              { c: [{ v: 'Victoria ~Kika~' }, { v: 4 }] },
              { c: [{ v: 'Yankee' }, { v: 2 }] },
              { c: [{ v: 'Quebec' }, { v: 1 }] },
            ],
          },
        });
    });
    await managementRetry.click();
    await expect(panel.locator('tbody tr')).toHaveCount(3);
    await expect(panel).toContainText('Yankee');
    await expect(panel).not.toContainText('temporarily unavailable');
    await page.evaluate(() => {
      delete window.VTS_EDEN_X1_MANAGEMENT_VOTE_LOADER;
    });

    const teamCard = page.locator('[data-reward-view="team"]');
    await expect(teamCard.locator('.eden-x1-flow-vote-tag')).toHaveText(
      'Vote here for Best TeamPlayers'
    );
    await teamCard.click();
    await expect(teamCard).toHaveAttribute('aria-pressed', 'true');
    await expect(topNamesOverview).toBeVisible();
    await expect(panel.getByRole('heading', { name: 'Team Players', exact: true })).toBeVisible();
    await expect(panel.locator('tbody tr')).toHaveCount(3);
    await expect(panel.locator('tbody tr')).toContainText(['TBA', 'TBA', 'TBA']);
    await expect(panel.locator('.eden-x1-slot-status-trigger')).toHaveCount(0);
    await page.evaluate((dash) => {
      window.setEdenX1DataForTest({
        ...dash,
        publicEdenX1VoteResults: {
          season: 'season-2026',
          published: false,
          rankings: [
            {
              playerName: 'Fake Winner',
              playerKey: 'fakewinner',
              familyKey: 'fakewinner',
              votes: 99,
              voters: 99,
            },
          ],
        },
      });
    }, seededDash);
    await expect(panel).not.toContainText('Fake Winner');
    await expect(panel.locator('.eden-x1-slot-status-trigger')).toHaveCount(0);
    await page.evaluate((dash) => {
      window.setEdenX1DataForTest({
        ...dash,
        publicEdenX1VoteResults: {
          season: 'season-2025',
          published: true,
          rankings: [
            {
              playerName: 'Wrong Season Winner',
              playerKey: 'wrongseasonwinner',
              familyKey: 'wrongseasonwinner',
              votes: 99,
              voters: 99,
            },
          ],
        },
      });
    }, seededDash);
    await expect(panel).not.toContainText('Wrong Season Winner');
    await expect(panel.locator('.eden-x1-slot-status-trigger')).toHaveCount(0);
    await page.evaluate((dash) => {
      window.setEdenX1DataForTest({
        ...dash,
        publicEdenX1VoteResults: {
          season: 'season-2026',
          published: true,
          rankings: [
            {
              playerName: 'Lady Zubbs',
              playerKey: 'ladyzubbs',
              familyKey: 'ladyzubbs',
              votes: 6,
              voters: 6,
            },
            {
              playerName: 'Zubbs',
              playerKey: 'zubbs',
              familyKey: 'zubbs',
              votes: 5,
              voters: 5,
            },
            { playerName: 'Papa', playerKey: 'papa', familyKey: 'papa', votes: 4, voters: 4 },
            {
              playerName: 'Romeo',
              playerKey: 'romeo',
              familyKey: 'romeo',
              votes: 3,
              voters: 3,
            },
          ],
        },
      });
    }, seededDash);
    const zubbsTeamRow = panel.locator('tbody tr').filter({ hasText: 'Zubbs' });
    await expect(zubbsTeamRow).toHaveCount(1);
    await expect(zubbsTeamRow).not.toContainText('Lady Zubbs');
    const zubbsTeamStatus = zubbsTeamRow.locator('.eden-x1-slot-status-trigger');
    await zubbsTeamStatus.focus();
    await page.keyboard.press('Enter');
    await expect(zubbsTeamStatus.locator('.dash-weighted-score-popover')).toContainText(
      'Voting rank #1 · 11 members voted'
    );
    await page.keyboard.press('Escape');

    await page.evaluate((dash) => {
      window.setEdenX1DataForTest({
        ...dash,
        publicEdenX1VoteResults: {
          season: 'season-2026',
          published: true,
          rankings: [
            {
              playerName: 'Alpha',
              playerKey: 'alpha',
              familyKey: 'alpha',
              votes: 12,
              voters: 12,
            },
            {
              playerName: 'Yankee',
              playerKey: 'yankee',
              familyKey: 'yankee',
              votes: 11,
              voters: 11,
            },
            {
              playerName: 'Papa',
              playerKey: 'papa',
              familyKey: 'papa',
              votes: 10,
              voters: 9,
            },
            {
              playerName: 'Romeo',
              playerKey: 'romeo',
              familyKey: 'romeo',
              votes: 9,
              voters: 8,
            },
            {
              playerName: 'Sierra',
              playerKey: 'sierra',
              familyKey: 'sierra',
              votes: 8,
              voters: 8,
            },
            {
              playerName: 'Uniform',
              playerKey: 'uniform',
              familyKey: 'uniform',
              votes: 8,
              voters: 8,
            },
            {
              playerName: 'Victor',
              playerKey: 'victor',
              familyKey: 'victor',
              votes: 8,
              voters: 8,
            },
            {
              playerName: 'Tango',
              playerKey: 'tango',
              familyKey: 'tango',
              votes: 8,
              voters: 8,
            },
          ],
        },
      });
    }, seededDash);
    await expect(panel.locator('tbody tr')).toContainText(['Papa', 'Romeo', 'Tango']);
    await expect(panel.locator('tbody tr').filter({ hasText: 'Alpha' })).toHaveCount(0);
    await expect(panel.locator('tbody tr').filter({ hasText: 'Yankee' })).toHaveCount(0);
    const teamVotedStatus = panel
      .locator('.eden-x1-slot-status-trigger', { hasText: 'Voted' })
      .first();
    const teamVotedPopover = teamVotedStatus.locator('.dash-weighted-score-popover');
    await expect(teamVotedStatus).toHaveAccessibleName('Voted');
    await expect(teamVotedStatus).toHaveAccessibleDescription(/Team Players · Status detail/);
    expect(await teamVotedStatus.getAttribute('aria-label')).toBeNull();
    await teamVotedStatus.focus();
    await page.keyboard.press('Enter');
    await expect(teamVotedPopover).toContainText('Team Players · Status detail');
    await expect(teamVotedPopover).toContainText('Voted');
    await expect(teamVotedPopover).toContainText('10');
    await expect(teamVotedPopover).toContainText('Voting rank #3 · 10 members voted');
    await expect(teamVotedPopover).toContainText('Bonus Team Effort Points');
    await expect(teamVotedPopover).toContainText('Contribution');
    await expect(teamVotedPopover).toContainText('Ex-Guild contribution');
    await expect(teamVotedPopover).toContainText('Duty points');
    await expect(teamVotedPopover).toContainText('Bonus team effort points');
    await expect(teamVotedPopover).toContainText('Weighted Total Contribution');
    await expect(teamVotedPopover).toContainText(
      'Three anonymous guild vote rewards for standout teamwork and reliability.'
    );
    const teamPaintState = await readPopoverPaintState(teamVotedPopover);
    expect(teamPaintState.blockers).toEqual([]);
    await page.keyboard.press('Escape');
    await expect(teamVotedPopover).toBeHidden();
    await expect(teamVotedStatus).toBeFocused();

    const teamTiedStatus = panel.locator('.eden-x1-slot-status-trigger', {
      hasText: 'Tie-break applied.',
    });
    const teamTiedPopover = teamTiedStatus.locator('.dash-weighted-score-popover');
    await expect(teamTiedStatus).toHaveAccessibleName('Voted · Tie-break applied.');
    await expect(teamTiedStatus).toContainText('Tie-break applied.');
    await teamTiedStatus.focus();
    await page.keyboard.press('Space');
    await expect(teamTiedPopover).toBeVisible();
    await expect(teamTiedPopover).toContainText('Team Players · Status detail');
    await expect(teamTiedPopover).toContainText('Tie-break applied.');
    await expect(teamTiedPopover).toContainText('#3 · Member Name');
    await expect(teamTiedPopover).toContainText('Voting rank #5 · 8 members voted');
    const teamTieCandidates = teamTiedPopover.locator('small', {
      hasText: 'Tango · Uniform · Sierra · Victor',
    });
    await expect(teamTieCandidates).toHaveText('Tango · Uniform · Sierra · Victor');
    const teamTiePaintState = await readPopoverPaintState(teamTiedPopover);
    expect(teamTiePaintState.blockers).toEqual([]);
    expect(teamTiePaintState.left).toBeGreaterThanOrEqual(8);
    expect(teamTiePaintState.right).toBeLessThanOrEqual(teamTiePaintState.viewportWidth - 8);
    expect(teamTiePaintState.top).toBeGreaterThanOrEqual(8);
    expect(teamTiePaintState.bottom).toBeLessThanOrEqual(teamTiePaintState.viewportHeight - 8);
    await page.keyboard.press('Escape');
    await expect(teamTiedPopover).toBeHidden();
    await expect(teamTiedStatus).toBeFocused();

    await page.evaluate(() => {
      window.VTS_EDEN_X1_MANAGEMENT_VOTE_LOADER = () => new Promise(() => {});
      void window.loadEdenX1ManagementVotesForTest({ force: true });
    });
    await expect(panel.locator('.eden-x1-slot-status-trigger')).toHaveCount(0);
    await expect(panel).not.toContainText('Papa');
    await expect(panel).not.toContainText('Yankee');

    await page.evaluate(async () => {
      window.VTS_EDEN_X1_MANAGEMENT_VOTE_LOADER = () =>
        Promise.reject(new Error('simulated downstream management outage'));
      await window.loadEdenX1ManagementVotesForTest({ force: true });
    });
    await expect(panel).toContainText('Management votes temporarily unavailable');
    await expect(panel.locator('#edenX1ManagementVotesRetry')).toBeVisible();
    await expect(panel.locator('.eden-x1-slot-status-trigger')).toHaveCount(0);

    await page.evaluate(async () => {
      window.VTS_EDEN_X1_MANAGEMENT_VOTE_LOADER = () =>
        Promise.resolve({
          table: {
            cols: [{ label: 'Name' }, { label: 'Votes' }],
            rows: [
              { c: [{ v: 'Victoria ~Kika~' }, { v: 4 }] },
              { c: [{ v: 'Yankee' }, { v: 2 }] },
              { c: [{ v: 'Quebec' }, { v: 1 }] },
            ],
          },
        });
      await window.loadEdenX1ManagementVotesForTest({ force: true });
      delete window.VTS_EDEN_X1_MANAGEMENT_VOTE_LOADER;
    });
    await expect(panel.locator('tbody tr')).toContainText(['Papa', 'Romeo', 'Tango']);
    await expect(panel).not.toContainText('temporarily unavailable');
    await expect(voteRail).toContainText('Team Players Vote');
    await expect(voteRail).toContainText('Need Help With Voting? - View Top Names');
    await voteRail.locator('[data-eden-vote-help-link]').click();
    await expect(topNamesOverview).toBeFocused();
    const helperCards = topNamesOverview.locator('.eden-x1-vote-helper-card');
    await expect(helperCards).toHaveCount(5);
    const helperInitialMetrics = await helperCards.evaluateAll((cards) =>
      cards.map((card) => {
        const rows = Array.from(card.querySelectorAll('.eden-x1-vote-helper-row'));
        const visibleRows = rows.filter((row) => !row.hidden && row.offsetParent !== null);
        const cardRect = card.getBoundingClientRect();
        const firstRect = visibleRows[0]?.getBoundingClientRect();
        return {
          totalRows: rows.length,
          visibleRows: visibleRows.length,
          firstTopOffset: firstRect ? Math.round(firstRect.top - cardRect.top) : null,
        };
      })
    );
    expect(helperInitialMetrics.every((metric) => metric.totalRows <= 10)).toBe(true);
    expect(
      helperInitialMetrics.every((metric) => metric.visibleRows === Math.min(5, metric.totalRows))
    ).toBe(true);
    const helperFirstTopOffsets = helperInitialMetrics
      .map((metric) => metric.firstTopOffset)
      .filter((top) => Number.isFinite(top));
    expect(
      Math.max(...helperFirstTopOffsets) - Math.min(...helperFirstTopOffsets)
    ).toBeLessThanOrEqual(4);
    const firstHelperToggle = topNamesOverview.locator('[data-eden-vote-helper-toggle]').first();
    await expect(firstHelperToggle).toBeVisible();
    await firstHelperToggle.click();
    await expect(firstHelperToggle).toHaveAttribute('aria-expanded', 'true');
    const firstHelperExpanded = await firstHelperToggle.evaluate((button) => {
      const card = button.closest('.eden-x1-vote-helper-card');
      const rows = Array.from(card.querySelectorAll('.eden-x1-vote-helper-row'));
      return {
        totalRows: rows.length,
        visibleRows: rows.filter((row) => !row.hidden && row.offsetParent !== null).length,
      };
    });
    expect(firstHelperExpanded.visibleRows).toBe(Math.min(10, firstHelperExpanded.totalRows));
    await firstHelperToggle.click();
    await expect(firstHelperToggle).toHaveAttribute('aria-expanded', 'false');
    const firstHelperCollapsed = await firstHelperToggle.evaluate((button) => {
      const card = button.closest('.eden-x1-vote-helper-card');
      const rows = Array.from(card.querySelectorAll('.eden-x1-vote-helper-row'));
      return {
        totalRows: rows.length,
        visibleRows: rows.filter((row) => !row.hidden && row.offsetParent !== null).length,
      };
    });
    expect(firstHelperCollapsed.visibleRows).toBe(Math.min(5, firstHelperCollapsed.totalRows));
    {
      const panel = voteRail;
      await expect(panel.locator('#edenX1VoterName')).toHaveAttribute(
        'placeholder',
        'Put your In-Game Name'
      );
      await panel.locator('#edenX1VoterName').fill('NotARealMember');
      await panel
        .locator('#edenX1TeamVoteForm button[type="submit"]')
        .evaluate((button) => button.click());
      await expect(panel.locator('#edenX1VoteStatus')).toContainText(
        'Choose your in-game name from the member list.'
      );
      await expect(panel.locator('#edenX1VoterName')).toHaveAttribute('aria-invalid', 'true');
      await expect(panel.locator('#edenX1VoterName')).toHaveClass(/is-invalid/);
      await panel.locator('#edenX1VoterName').fill('Mala');
      await expect(
        panel.locator('[data-eden-vote-suggestions-for="edenX1VoterName"]')
      ).toContainText('MalakAbo');
      await panel
        .locator(
          '[data-eden-vote-suggestions-for="edenX1VoterName"] [data-eden-vote-suggest="MalakAbo"]'
        )
        .click();
      await expect(panel.locator('#edenX1VoterName')).toHaveValue('MalakAbo');
      await expect(panel.locator('#edenX1VoterName')).not.toHaveAttribute('aria-invalid', 'true');
      await expect(panel.locator('#edenX1VoterNameConfirm')).toContainText('Confirmed: MalakAbo');
      await expect(panel.locator('[data-eden-vote-suggestions-for="edenX1VoterName"]')).toBeEmpty();
      await expect(panel.locator('[data-eden-vote-self-pick]')).toHaveText('Add My Name to Votes');
      await panel.locator('[data-eden-vote-self-pick]').click();
      await expect(panel.locator('#edenX1CandidateName')).toHaveValue('MalakAbo');
      await expect(panel.locator('#edenX1CandidateNameConfirm')).toContainText(
        'Confirmed: MalakAbo'
      );
      await panel.locator('[data-eden-vote-clear="edenX1CandidateName"]').click();
      await expect(panel.locator('#edenX1CandidateName')).toHaveValue('');
      await topNamesOverview.locator('[data-eden-vote-pick="Alpha"]').first().click();
      await expect(panel.locator('#edenX1CandidateName')).toHaveValue('Alpha');
      await expect(panel.locator('#edenX1CandidateNameConfirm')).toContainText('Confirmed: Alpha');
      await panel.locator('[data-eden-vote-self-pick]').click();
      await expect(panel.locator('#edenX1CandidateName')).toHaveValue('Alpha');
      await expect(panel.locator('#edenX1CandidateName2')).toHaveValue('MalakAbo');
      await panel.locator('[data-eden-vote-clear="edenX1CandidateName2"]').click();
      await expect(panel.locator('#edenX1CandidateName2')).toHaveValue('');
      await panel.locator('[data-eden-vote-clear="edenX1CandidateName"]').click();
      await expect(panel.locator('#edenX1CandidateName')).toHaveValue('');
      await expect(panel.locator('#edenX1CandidateNameConfirm')).toBeEmpty();
      await topNamesOverview.locator('[data-eden-vote-pick="Alpha"]').first().click();
      await expect(panel.locator('#edenX1CandidateName')).toHaveValue('Alpha');
      await expect(panel.locator('#edenX1CandidateNameConfirm')).toContainText('Confirmed: Alpha');
      await expect(panel.locator('#edenX1VoteCandidateInspectBtn')).toContainText(
        'View Alpha stats'
      );
      await expect(panel.locator('#edenX1VoteCandidateDetail')).toContainText('Weighted Score');
      await expect(panel.locator('#edenX1VoteCandidateDetail')).toContainText('Structure Hits');
      await expect(
        panel.locator('#edenX1VoteCandidateDetail .eden-x1-structure-trend-card')
      ).toBeVisible();
      await expect(panel.locator('#edenX1VoteCandidateDetail')).not.toContainText(
        'No structure-hit trend yet.'
      );
      const clearStatsButton = panel.locator('#edenX1VoteClearStatsBtn');
      await expect(clearStatsButton).toBeVisible();
      await expect(clearStatsButton).toHaveText('Clear Alpha Stats');
      await clearStatsButton.click();
      await expect(panel.locator('#edenX1VoteCandidateDetail')).toBeHidden();
      await expect(panel.locator('#edenX1CandidateName')).toHaveValue('Alpha');
      await expect(clearStatsButton).toBeHidden();
      await expect(panel.locator('#edenX1VoteCandidateInspectBtn')).toHaveAttribute(
        'data-state',
        'ready'
      );
      await panel.locator('#edenX1VoteCandidateInspectBtn').click();
      await expect(panel.locator('#edenX1VoteCandidateDetail')).toBeVisible();
      await expect(clearStatsButton).toBeVisible();
      await expect(panel.locator('#edenX1VoteCandidateDetail .eden-x1-vote-info')).toHaveCount(10);
      const firstInfoPopoverTrigger = panel
        .locator('#edenX1VoteCandidateDetail .eden-x1-vote-info')
        .first();
      await firstInfoPopoverTrigger.click();
      await expect(firstInfoPopoverTrigger).toHaveAttribute('aria-expanded', 'true');
      const firstInfoPopoverMetrics = await firstInfoPopoverTrigger
        .locator('.eden-x1-vote-info-popover')
        .evaluate((popover) => {
          const rect = popover.getBoundingClientRect();
          const style = getComputedStyle(popover);
          return {
            left: rect.left,
            right: rect.right,
            top: rect.top,
            bottom: rect.bottom,
            width: rect.width,
            visibility: style.visibility,
            viewportWidth: window.innerWidth,
            viewportHeight: window.innerHeight,
          };
        });
      expect(firstInfoPopoverMetrics.visibility).toBe('visible');
      expect(firstInfoPopoverMetrics.width).toBeGreaterThan(200);
      expect(firstInfoPopoverMetrics.left).toBeGreaterThanOrEqual(8);
      expect(firstInfoPopoverMetrics.right).toBeLessThanOrEqual(
        firstInfoPopoverMetrics.viewportWidth - 8
      );
      expect(firstInfoPopoverMetrics.top).toBeGreaterThanOrEqual(8);
      expect(firstInfoPopoverMetrics.bottom).toBeLessThanOrEqual(
        firstInfoPopoverMetrics.viewportHeight - 8
      );
      const detailStatColumns = await panel
        .locator('#edenX1VoteCandidateDetail .eden-x1-vote-stat-grid')
        .evaluate((grid) => getComputedStyle(grid).gridTemplateColumns.split(' ').length);
      expect(detailStatColumns).toBe(5);
      await panel.locator('#edenX1CandidateName').fill('\u0410lpha');
      await expect(
        panel.locator('[data-eden-vote-suggestions-for="edenX1CandidateName"]')
      ).toContainText('Alpha');
      await panel
        .locator(
          '[data-eden-vote-suggestions-for="edenX1CandidateName"] [data-eden-vote-suggest="Alpha"]'
        )
        .click();
      await expect(
        panel.locator('[data-eden-vote-suggestions-for="edenX1CandidateName"]')
      ).toBeEmpty();
      await expect(panel.locator('#edenX1VoteCandidateInspectBtn')).toContainText(
        'View Alpha stats'
      );
      await panel.locator('#edenX1CandidateName2').fill('Bravoo');
      await expect(
        panel.locator('[data-eden-vote-suggestions-for="edenX1CandidateName2"]')
      ).toContainText('Bravo');
      await panel
        .locator(
          '[data-eden-vote-suggestions-for="edenX1CandidateName2"] [data-eden-vote-suggest="Bravo"]'
        )
        .click();
      await expect(panel.locator('#edenX1CandidateName2')).toHaveValue('Bravo');
      await expect(
        panel.locator('[data-eden-vote-suggestions-for="edenX1CandidateName2"]')
      ).toBeEmpty();
      await panel
        .locator('#edenX1TeamVoteForm button[type="submit"]')
        .evaluate((button) => button.click());
      await expect(panel.locator('#edenX1VoteStatus')).toContainText(
        'You still have 2 vote slot(s) open. Press Cast Votes again to save these votes anyway.'
      );
      const voteBeforePartialConfirm = await page.evaluate(() =>
        JSON.parse(localStorage.getItem('vts_eden_x1_vote_season-2026_team_players') || 'null')
      );
      expect(voteBeforePartialConfirm).toBeNull();
      await panel.locator('#edenX1TeamVoteForm button[type="submit"]').click();
      await expect(panel.locator('#edenX1VoteStatus')).toContainText(
        'Thank you, MalakAbo. Your votes were cast for Alpha, Bravo.'
      );
      const partialVote = await page.evaluate(() =>
        JSON.parse(localStorage.getItem('vts_eden_x1_vote_season-2026_team_players') || 'null')
      );
      expect(partialVote).toMatchObject({
        voterName: 'MalakAbo',
        candidateNames: ['Alpha', 'Bravo'],
        candidateKeys: ['alpha', 'bravo'],
      });
      await panel.locator('#edenX1CandidateName3').fill('Dr Thunder 293');
      await panel.locator('#edenX1CandidateName4').fill('Dr Thunder');
      await panel
        .locator('#edenX1TeamVoteForm button[type="submit"]')
        .evaluate((button) => button.click());
      await expect(panel.locator('#edenX1VoteStatus')).toContainText(
        'Duplicate vote found. Nothing was saved. Pick each teammate only once.'
      );
      const voteAfterDuplicate = await page.evaluate(() =>
        JSON.parse(localStorage.getItem('vts_eden_x1_vote_season-2026_team_players') || 'null')
      );
      expect(voteAfterDuplicate).toMatchObject({
        candidateNames: ['Alpha', 'Bravo'],
        candidateKeys: ['alpha', 'bravo'],
      });
      await panel.locator('#edenX1CandidateName3').fill('Charli');
      await expect(
        panel.locator('[data-eden-vote-suggestions-for="edenX1CandidateName3"]')
      ).toContainText('Charlie');
      await panel
        .locator(
          '[data-eden-vote-suggestions-for="edenX1CandidateName3"] [data-eden-vote-suggest="Charlie"]'
        )
        .click();
      await expect(panel.locator('#edenX1CandidateName3')).toHaveValue('Charlie');
      await expect(
        panel.locator('[data-eden-vote-suggestions-for="edenX1CandidateName3"]')
      ).toBeEmpty();
      await panel.locator('#edenX1CandidateName4').fill('Delt');
      await expect(
        panel.locator('[data-eden-vote-suggestions-for="edenX1CandidateName4"]')
      ).toContainText('Delta');
      await panel
        .locator(
          '[data-eden-vote-suggestions-for="edenX1CandidateName4"] [data-eden-vote-suggest="Delta"]'
        )
        .click();
      await expect(panel.locator('#edenX1CandidateName4')).toHaveValue('Delta');
      await expect(
        panel.locator('[data-eden-vote-suggestions-for="edenX1CandidateName4"]')
      ).toBeEmpty();
      await panel
        .locator('#edenX1TeamVoteForm button[type="submit"]')
        .evaluate((button) => button.click());
      await expect(panel.locator('#edenX1VoteStatus')).toContainText(
        'Thank you, MalakAbo. Your votes were cast for Alpha, Bravo, Charlie, Delta.'
      );
      await expect(panel.locator('#edenX1VoteStatus')).toContainText(
        'Final results will be announced during the last day.'
      );
      await expect(panel.locator('#edenX1VoterName')).toHaveValue('MalakAbo');
      await expect(panel.locator('#edenX1CandidateName')).toHaveValue('Alpha');
      await expect(panel.locator('#edenX1CandidateName2')).toHaveValue('Bravo');
      await expect(panel.locator('#edenX1CandidateName3')).toHaveValue('Charlie');
      await expect(panel.locator('#edenX1CandidateName4')).toHaveValue('Delta');
      const savedVote = await page.evaluate(() =>
        JSON.parse(localStorage.getItem('vts_eden_x1_vote_season-2026_team_players') || 'null')
      );
      expect(savedVote).toMatchObject({
        id: 'season-2026__team_players__malakabo',
        season: 'season-2026',
        category: 'team_players',
        voterName: 'MalakAbo',
        candidateName: 'Alpha',
        candidateNames: ['Alpha', 'Bravo', 'Charlie', 'Delta'],
        candidateKeys: ['alpha', 'bravo', 'charlie', 'delta'],
      });
    }
    await page.reload({ waitUntil: 'load' });
    await openEdenX1ForTest(page);
    await page.evaluate((dash) => window.setEdenX1DataForTest(dash), seededDash);
    const reloadedPanel = page.locator('#dashWeightedContributionPanel');
    const reloadedVoteRail = page.locator('#edenX1VoteRail');
    await expect(
      reloadedPanel.getByRole('heading', { name: 'Team Players', exact: true })
    ).toBeVisible();
    await expect(reloadedVoteRail.locator('#edenX1VoterName')).toHaveValue('MalakAbo');
    await expect(reloadedVoteRail.locator('#edenX1CandidateName')).toHaveValue('Alpha');
    await expect(reloadedVoteRail.locator('#edenX1CandidateName2')).toHaveValue('Bravo');
    await expect(reloadedVoteRail.locator('#edenX1CandidateName3')).toHaveValue('Charlie');
    await expect(reloadedVoteRail.locator('#edenX1CandidateName4')).toHaveValue('Delta');
    await expect(reloadedVoteRail.locator('.eden-x1-vote-suggestions')).toHaveText([
      '',
      '',
      '',
      '',
      '',
    ]);
    await reloadedVoteRail.locator('#edenX1CandidateName').focus();
    await expect(
      reloadedVoteRail.locator('[data-eden-vote-suggestions-for="edenX1CandidateName"]')
    ).toContainText('Alpha');

    await page.evaluate(() => {
      localStorage.setItem('vts_theme', 'light');
      document.documentElement.setAttribute('data-theme', 'light');
    });
    const activeCardStyle = await page.locator('.eden-x1-flow-card.is-active').evaluate((card) => {
      const style = window.getComputedStyle(card);
      return {
        borderColor: style.borderColor,
        boxShadow: style.boxShadow,
      };
    });
    expect(activeCardStyle.borderColor).not.toBe('rgba(0, 0, 0, 0)');
    expect(activeCardStyle.boxShadow).not.toBe('none');
  });

  test('admin shows Eden X1 team player vote results', async ({ page }) => {
    await openAdmin(page);
    await openLocalAdminDashboard(page);
    await page.waitForFunction(
      () =>
        typeof window.setEdenX1VotesForTest === 'function' &&
        typeof window.switchDashSubtab === 'function'
    );
    await page.evaluate((hash) => {
      localStorage.removeItem('vts_sensitive_admin_pin_ok');
      localStorage.removeItem('vts_eden_votes_pin_ok');
      window.VTS_ADMIN_AUTH = { ...(window.VTS_ADMIN_AUTH || {}), edenVotesPinHash: hash };
      window.setEdenX1VotesForTest(
        [
          {
            id: 'season-2026__team_players__legacy-auth-delta',
            season: 'season-2026',
            category: 'team_players',
            voterKey: 'legacy-auth-delta',
            voterName: '(VTS)Delta',
            candidateKey: 'bravo',
            candidateName: 'Bravo',
            candidateKeys: ['bravo'],
            candidateNames: ['Bravo'],
            voterAuthUid: 'legacy-admin',
            updatedAt: '2026-06-24T19:00:00.000Z',
          },
          {
            id: 'season-2026__team_players__delta',
            season: 'season-2026',
            category: 'team_players',
            voterKey: 'delta',
            voterName: 'Delta',
            candidateKey: 'alpha',
            candidateName: 'Alpha',
            candidateKeys: ['alpha', 'bravo', 'charlie', 'delta'],
            candidateNames: ['Alpha', 'Bravo', 'Charlie', 'Delta'],
            voterAuthUid: 'test-delta',
            updatedAt: '2026-06-24T20:00:00.000Z',
          },
          {
            id: 'season-2026__team_players__echo',
            season: 'season-2026',
            category: 'team_players',
            voterKey: 'echo',
            voterName: 'Echo',
            candidateKey: 'alpha',
            candidateName: 'Alpha',
            voterAuthUid: 'test-echo',
            updatedAt: '2026-06-24T20:05:00.000Z',
          },
          {
            id: 'season-2026__team_players__foxtrot',
            season: 'season-2026',
            category: 'team_players',
            voterKey: 'foxtrot',
            voterName: 'Foxtrot',
            candidateKey: 'bravo',
            candidateName: 'Bravo',
            candidateKeys: ['bravo', 'alpha', 'charlie', 'delta'],
            candidateNames: ['Bravo', 'Alpha', 'Charlie', 'Delta'],
            voterAuthUid: 'test-foxtrot',
            updatedAt: '2026-06-24T20:10:00.000Z',
          },
          {
            id: 'season-2026__team_players__drthunder293',
            season: 'season-2026',
            category: 'team_players',
            voterKey: 'drthunder293',
            voterName: '(Vts)Dr Thunder 293',
            candidateKey: 'alpha',
            candidateName: 'Alpha',
            candidateKeys: ['alpha'],
            candidateNames: ['Alpha'],
            voterAuthUid: 'test-dr-thunder-old',
            updatedAt: '2026-06-24T20:11:00.000Z',
          },
          {
            id: 'season-2026__team_players__drthunder',
            season: 'season-2026',
            category: 'team_players',
            voterKey: 'drthunder',
            voterName: 'Dr Thunder',
            candidateKey: 'charlie',
            candidateName: 'Charlie',
            candidateKeys: ['charlie'],
            candidateNames: ['Charlie'],
            voterAuthUid: 'test-dr-thunder-new',
            updatedAt: '2026-06-24T20:12:00.000Z',
          },
          {
            id: 'season-2026__team_players__lisavetka',
            season: 'season-2026',
            category: 'team_players',
            voterKey: 'lisavetka',
            voterName: '(Vts)Lisavetka*',
            candidateKey: 'bravo',
            candidateName: 'Bravo',
            candidateKeys: ['bravo'],
            candidateNames: ['Bravo'],
            voterAuthUid: 'test-lisaveta-old',
            updatedAt: '2026-06-24T20:13:00.000Z',
          },
          {
            id: 'season-2026__team_players__lisaveta',
            season: 'season-2026',
            category: 'team_players',
            voterKey: 'lisaveta',
            voterName: 'Lisaveta',
            candidateKey: 'delta',
            candidateName: 'Delta',
            candidateKeys: ['delta'],
            candidateNames: ['Delta'],
            voterAuthUid: 'test-lisaveta-new',
            updatedAt: '2026-06-24T20:14:00.000Z',
          },
          {
            id: 'season-2026__team_players__golf',
            season: 'season-2026',
            category: 'team_players',
            voterKey: 'golf',
            voterName: 'Golf',
            candidateKey: 'kika',
            candidateName: 'Kika',
            candidateKeys: ['kika'],
            candidateNames: ['Kika'],
            voterAuthUid: 'test-golf',
            updatedAt: '2026-06-24T20:15:00.000Z',
          },
          {
            id: 'season-2026__team_players__hotel',
            season: 'season-2026',
            category: 'team_players',
            voterKey: 'hotel',
            voterName: 'Hotel',
            candidateKey: 'decorated-kika',
            candidateName: '\uA9C1\u0F3A Kika \u0F3B\uA9C2',
            candidateKeys: ['decorated-kika', 'kika'],
            candidateNames: ['\uA9C1\u0F3A Kika \u0F3B\uA9C2', 'Kika'],
            voterAuthUid: 'test-hotel',
            updatedAt: '2026-06-24T20:20:00.000Z',
          },
        ],
        [
          {
            id: 'hist-1',
            voteId: 'season-2026__team_players__delta',
            season: 'season-2026',
            category: 'team_players',
            voterKey: 'delta',
            voterName: 'Delta',
            previousCandidateNames: ['Alpha', 'Bravo'],
            candidateNames: ['Alpha', 'Bravo', 'Charlie', 'Delta'],
            action: 'updated',
            createdAt: '2026-06-24T20:01:00.000Z',
          },
        ],
        {
          votingOpen: true,
          allowEditing: false,
          showPublicResults: true,
          showVoterNames: false,
          contributionRankingMode: 'default',
        }
      );
      window.switchDashSubtab('edenVotes');
    }, TEST_SENSITIVE_ADMIN_PIN_HASH);

    const results = page.locator('#dashEdenVoteResults');
    await expect(page.locator('.pin-gate-dialog')).toBeVisible();
    await expect(page.locator('#dashSubtabEdenVotes')).toBeHidden();
    await page.locator('.pin-gate-input').fill('111111');
    await page.locator('.pin-gate-btn-primary').click();
    await expect(page.locator('.pin-gate-error')).toBeVisible();
    await expect(page.locator('#dashSubtabEdenVotes')).toBeHidden();
    await page.locator('.pin-gate-input').fill(TEST_SENSITIVE_ADMIN_PIN);
    await page.locator('.pin-gate-btn-primary').click();
    await expect(page.locator('.pin-gate-dialog')).toHaveCount(0);
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem('vts_sensitive_admin_pin_ok')))
      .toBe('1');
    await expect(page.locator('#dashSubtabEdenVotes')).toContainText('Eden X1 Team Players Vote');
    await expect(page.locator('#dashEdenVoteOpenToggle')).toBeChecked();
    await expect(page.locator('#dashEdenVoteEditingToggle')).not.toBeChecked();
    await expect(page.locator('#dashEdenVotePublicResultsToggle')).toBeChecked();
    await expect(page.locator('#dashEdenContributionModeDefault')).toBeChecked();
    await expect(page.locator('#dashEdenContributionModeExtended')).not.toBeChecked();
    await expect(page.locator('#dashEdenContributionModeStatus')).toContainText(
      'Active reward chain: Base'
    );
    await expect(results).toContainText('Candidate totals');
    await expect(results).toContainText('Ballots');
    const totalsTable = results.locator('table').first();
    await expect(
      totalsTable.getByRole('columnheader', { name: 'Matched from', exact: true })
    ).toBeVisible();
    const kikaRow = totalsTable.locator('tbody tr').filter({ hasText: 'Kika' }).first();
    await expect(kikaRow).toContainText('2');
    await expect(kikaRow).toContainText('Kika (1)');
    await expect(kikaRow).toContainText('\uA9C1\u0F3A Kika \u0F3B\uA9C2 (1)');
    const kikaVoters = totalsTable.locator('[data-eden-vote-voters="kika"]');
    await expect(kikaVoters).toHaveCount(1);
    await kikaVoters.locator('summary').click();
    await expect(kikaVoters).toContainText('Golf');
    await expect(kikaVoters).toContainText('Hotel');
    await expect(totalsTable.locator('[data-eden-vote-candidate="alpha"]')).toContainText('3');
    await expect(totalsTable.locator('[data-eden-vote-candidate="bravo"]')).toContainText('2');
    await expect(totalsTable.locator('[data-eden-vote-candidate="charlie"]')).toContainText('3');
    await expect(totalsTable.locator('[data-eden-vote-candidate="delta"]')).toContainText('3');
    const ballotsTable = results.locator('table').nth(1);
    await expect(ballotsTable.locator('tbody tr')).toHaveCount(7);
    await expect(ballotsTable).toContainText('Dr Thunder');
    await expect(ballotsTable).not.toContainText('(Vts)Dr Thunder 293');
    await expect(ballotsTable).toContainText('Lisaveta');
    await expect(ballotsTable).not.toContainText('(Vts)Lisavetka*');
    await expect(results).toContainText('Alpha, Bravo, Charlie, Delta');
    await expect(results).toContainText('Delta');
    await expect(results).toContainText('Echo');
    await expect(results).toContainText('Foxtrot');
    const history = page.locator('#dashEdenVoteHistory');
    await expect(history).toContainText('Delta');
    await expect(history).toContainText('Alpha, Bravo');
    await expect(history).toContainText('Alpha, Bravo, Charlie, Delta');
  });

  test('admin sensitive tabs show setup dialog when owner PIN is missing', async ({ page }) => {
    await openAdmin(page);
    await openLocalAdminDashboard(page);
    await page.waitForFunction(() => typeof window.switchDashSubtab === 'function');
    await page.evaluate(() => {
      localStorage.removeItem('vts_sensitive_admin_pin_ok');
      localStorage.removeItem('vts_eden_votes_pin_ok');
      window.VTS_ADMIN_AUTH = {
        ...(window.VTS_ADMIN_AUTH || {}),
        adminPin: '',
        edenVotesPinHash: '',
      };
      window.switchDashSubtab('edenVotes');
    });

    await expect(page.locator('.pin-gate-dialog')).toBeVisible();
    await expect(page.locator('.pin-gate-kicker')).toContainText('Eden X1 Votes');
    await expect(page.locator('.pin-gate-dialog')).toContainText('Owner PIN not configured');
    await expect(page.locator('.pin-gate-input')).toHaveCount(0);
    await expect(page.locator('.pin-gate-btn-primary')).toHaveCount(0);
    await expect(page.locator('#dashSubtabEdenVotes')).toBeHidden();
    await page.locator('[data-pin-cancel]').click();
    await expect(page.locator('.pin-gate-dialog')).toHaveCount(0);
  });

  test('eden x1 mobile surfaces avoid horizontal overflow with Cyrillic names', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.addInitScript(() => {
      localStorage.setItem('vts_hero_lang', 'ru');
      localStorage.setItem('vts_theme', 'light');
    });

    const cyrillicNames = [
      'АльфаВоинДлинноеИмя',
      'БравоСтраж',
      'ЧарлиМаг',
      'ДельтаЛучник',
      'ЭхоРыцарь',
      'ФокстротГерой',
      'ГольфВоин',
      'ХотелСтраж',
      'ИндияМаг',
      'МалакАбо',
      'Джульетта',
      'Кило',
      'Лима',
      'Майк',
      'Ноябрь',
      'Оскар',
    ];
    const seededDash = {
      date: '2026-06-24',
      r5Season: 'season-2026',
      contributionRecords: [
        {
          id: 'eden-mobile-1',
          date: '2026-06-24',
          premiumSlots: 20,
          entries: cyrillicNames.map((name, index) => ({
            rank: String(index + 1),
            name,
            guild: 'VTS',
            contribution: String(500000 - index * 10000),
          })),
        },
      ],
      exGuildContributions: [
        {
          id: 'eden-mobile-exguild',
          playerName: cyrillicNames[0],
          matchedName: cyrillicNames[0],
          contribution: 5000,
          status: 'matched',
        },
      ],
      dutyRecords: [
        { type: 'banner', entries: [{ name: cyrillicNames[0], confirmed: cyrillicNames[0] }] },
        { type: 'pather', entries: [{ name: cyrillicNames[1], confirmed: cyrillicNames[1] }] },
        { type: 'shield_wall', entries: [{ name: cyrillicNames[2], confirmed: cyrillicNames[2] }] },
        { type: 'banner', entries: [{ name: cyrillicNames[15], confirmed: cyrillicNames[15] }] },
      ],
      publicConductAdjustments: [
        {
          season: 'season-2026',
          player: cyrillicNames[0],
          points: 1,
          category: 'merit_other',
        },
      ],
      attacks: [
        {
          id: 'eden-mobile-attack-1',
          structure_name: 'Large Town',
          structure_level: 'Lv4',
          game_time: '24/06/2026, 20:00 GT',
          total_demolition: 120000,
          players_count: 1,
          players: [{ name: cyrillicNames[0], value: 70000, rank: 1 }],
        },
      ],
    };

    await openEdenX1ForTest(page);
    await page.locator('#languageSelect').selectOption('ru');
    await page.evaluate((dash) => window.setEdenX1DataForTest(dash), seededDash);
    await page.locator('[data-reward-view="support"]').click();
    await expect(page.locator('#dashWeightedContributionPanel tbody tr')).toHaveCount(4);

    const layout = await page.evaluate(() => {
      const rewardRow = document.querySelector('#dashWeightedContributionPanel tbody tr');
      const publicRow = document.querySelector('.eden-x1-public-weighted-table tbody tr');
      const kpiGrid = document.querySelector('.eden-x1-public-kpis');
      const clipped = Array.from(
        document.querySelectorAll(
          '.dash-weighted-mobile-player-name, .eden-x1-notice strong, .eden-x1-notice span, .dash-kpi-value-compact button'
        )
      ).find((cell) => {
        const style = window.getComputedStyle(cell);
        return (
          style.whiteSpace === 'nowrap' &&
          cell.scrollWidth > cell.clientWidth + 2 &&
          /[\u0400-\u04FF]/.test(cell.textContent || '')
        );
      });
      return {
        documentOverflow: document.documentElement.scrollWidth > window.innerWidth + 2,
        rewardRowDisplay: rewardRow ? window.getComputedStyle(rewardRow).display : null,
        publicRowDisplay: publicRow ? window.getComputedStyle(publicRow).display : null,
        publicKpiColumnCount: kpiGrid
          ? window.getComputedStyle(kpiGrid).gridTemplateColumns.trim().split(/\s+/).filter(Boolean)
              .length
          : 0,
        clippedCyrillicName: Boolean(clipped),
      };
    });

    expect(layout.documentOverflow).toBe(false);
    expect(layout.rewardRowDisplay).toBe('grid');
    expect(layout.publicRowDisplay).toBe('grid');
    expect(layout.publicKpiColumnCount).toBe(1);
    expect(layout.clippedCyrillicName).toBe(false);

    const scrollCaps = await page.evaluate(() => {
      const wrap = document.querySelector(
        '#dashWeightedContributionPanel .dash-weighted-contribution-table-wrap'
      );
      if (!wrap) return { missing: true };
      const style = window.getComputedStyle(wrap);
      return {
        missing: false,
        maxHeight: style.maxHeight,
      };
    });
    expect(scrollCaps.missing).toBe(false);
    expect(scrollCaps.maxHeight).toBe('none');

    await page.locator('[data-reward-view="contribution"]').click();
    await expect(page.locator('#dashWeightedContributionPanel tbody tr')).toHaveCount(10);
    const contributionOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 2
    );
    expect(contributionOverflow).toBe(false);

    const mobileRewardTrigger = page
      .locator('#dashWeightedContributionPanel tbody tr')
      .first()
      .locator('.dash-weighted-reward-trigger');
    await mobileRewardTrigger.click();
    const mobileRewardPopover = await page.evaluate(() => {
      const popover = document.querySelector(
        '#dashWeightedContributionPanel .eden-x1-popover-trigger.is-open .dash-weighted-score-popover'
      );
      if (!popover) return { missing: true };
      const rect = popover.getBoundingClientRect();
      return {
        missing: false,
        left: Math.floor(rect.left),
        right: Math.ceil(rect.right),
        width: Math.round(rect.width),
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        bottom: Math.ceil(rect.bottom),
        maxChildWidth: Math.max(
          ...Array.from(popover.querySelectorAll('b, small')).map((node) =>
            Math.ceil(node.getBoundingClientRect().width)
          )
        ),
      };
    });
    expect(mobileRewardPopover.missing).toBe(false);
    expect(mobileRewardPopover.left).toBeGreaterThanOrEqual(8);
    expect(mobileRewardPopover.right).toBeLessThanOrEqual(mobileRewardPopover.viewportWidth - 8);
    expect(mobileRewardPopover.width).toBeGreaterThanOrEqual(320);
    expect(mobileRewardPopover.bottom).toBeLessThanOrEqual(mobileRewardPopover.viewportHeight - 8);
    expect(mobileRewardPopover.maxChildWidth).toBeLessThanOrEqual(mobileRewardPopover.width - 24);
  });

  test('admin export menu downloads all-data CSV and debug bundles', async ({ page }) => {
    await page.route('https://firestore.googleapis.com/**', (route) => route.abort());
    const seededDash = {
      last_updated: '25/06/2026, 23:55',
      total_attacks: 1,
      attacks: [
        {
          id: 'admin-export-attack-1',
          structure_name: 'Capital',
          structure_level: 'Lv.5',
          game_time: '25/06/2026, 23:55',
          start_time: '23:30',
          total_demolition: 250000,
          players_count: 1,
          players: [{ name: 'Alpha', value: 250000, rank: 1 }],
        },
      ],
      players_summary: [],
      dutyRecords: [
        {
          id: 'admin-export-duty-1',
          type: 'pather',
          date: '2026-06-25',
          gameTime: '23:30',
          entries: [
            {
              name: 'Alpha',
              original: 'Alpha',
              confirmed: 'Alpha',
              usageTime: '23:30',
              target: 'Gate L5',
              group: 'Pink',
              status: 'matched',
            },
          ],
        },
      ],
      contributionRecords: [
        {
          id: 'admin-export-contribution-1',
          date: '2026-06-25',
          note: 'Top 20 Premium',
          isPrimary: true,
          premiumSlots: 20,
          entries: [
            { rank: '1', name: 'Alpha', guild: 'VTS', contribution: '100,000' },
            { rank: '2', name: 'Bravo', guild: 'VTS', contribution: '80,000' },
            { rank: '3', name: 'MalakAbo', guild: 'VTS', contribution: '1,000' },
          ],
        },
      ],
      exGuildContributions: [
        {
          id: 'admin-export-exguild-1',
          playerName: 'Alpha',
          contribution: 5000,
          status: 'matched',
        },
      ],
    };
    const seededRoster = [
      {
        id: 'admin-export-roster-1',
        date: '2026-06-25',
        createdAt: '2026-06-25T20:00:00.000Z',
        members: [{ name: 'Alpha', alliance: 'VTS', status: 'active' }],
      },
    ];
    const conduct = [
      {
        id: 'admin-export-conduct-1',
        playerName: 'Alpha',
        playerKey: 'alpha',
        category: 'banner_help',
        points: 2,
        season: 'season-2026',
        note: 'Helped other R5',
        createdAt: '2026-06-25T21:00:00.000Z',
      },
    ];

    await openAdmin(page);
    await openLocalAdminDashboard(page);
    await page.waitForFunction(() => typeof window.setOcrDashboardDataForTest === 'function');
    await page.evaluate(
      ({ dash, roster, conductAdjustments }) => {
        window.setOcrDashboardDataForTest(dash, roster, conductAdjustments);
      },
      { dash: seededDash, roster: seededRoster, conductAdjustments: conduct }
    );
    await expect(page.locator('#dashWeightedContributionPanel')).toContainText(
      'Weighted Total Contribution'
    );
    await page.evaluate(() => window.switchDashSubtab('contributions'));
    await expect(page.locator('#dashExGuildTitle')).toBeVisible();
    await expect(page.locator('#dashExGuildPasteBtn')).toBeVisible();
    await expect(page.locator('#dashExGuildUploadBtn')).toBeVisible();
    await expect(page.locator('#dashExGuildBody')).toContainText('Alpha');
    const exGuildMatchedBadge = page.locator('#dashExGuildBody .dash-badge-match-tip').first();
    await expect(exGuildMatchedBadge).toHaveAttribute('data-match-tooltip', 'Match to: Alpha');
    await exGuildMatchedBadge.hover();
    await expect
      .poll(() =>
        exGuildMatchedBadge.evaluate((badge) => window.getComputedStyle(badge, '::after').opacity)
      )
      .toBe('1');
    await expect
      .poll(() =>
        exGuildMatchedBadge.evaluate((badge) => window.getComputedStyle(badge, '::after').content)
      )
      .toContain('Match to: Alpha');
    await expect(page.locator('#dashExGuildDebuffExportInlineBtn')).toBeVisible();
    const debuffDownloadPromise = page.waitForEvent('download');
    await page.locator('#dashExGuildDebuffExportInlineBtn').click();
    const debuffDownload = await debuffDownloadPromise;
    expect(debuffDownload.suggestedFilename()).toMatch(/^vts_ex_guild_debuff_.*\.txt$/);
    const debuffText = await fs.readFile(await debuffDownload.path(), 'utf8');
    expect(debuffText.trim().split(/\r?\n/)).toEqual(['Alpha']);

    await page.locator('#dashExportMenuBtn').click();
    const weightedDownloadPromise = page.waitForEvent('download');
    await page.locator('#dashExpWeightedCsv').click();
    const weightedDownload = await weightedDownloadPromise;
    expect(weightedDownload.suggestedFilename()).toMatch(/^vts_weighted_contribution_.*\.csv$/);
    const weightedCsv = await fs.readFile(await weightedDownload.path(), 'utf8');
    expect(weightedCsv).toContain('Ex-guild contribution');
    expect(weightedCsv).toContain('"#1","Core Rewards"');

    await page.locator('#dashExportMenuBtn').click();
    const allDataDownloadPromise = page.waitForEvent('download');
    await page.locator('#dashExpAllDataCsv').click();
    const allDataDownload = await allDataDownloadPromise;
    expect(allDataDownload.suggestedFilename()).toMatch(/^vts_admin_all_data_.*\.csv$/);
    const allDataCsv = await fs.readFile(await allDataDownload.path(), 'utf8');
    expect(allDataCsv).toContain('duty_entry');
    expect(allDataCsv).toContain('weighted_contribution');
    expect(allDataCsv).toContain('ex_guild_contribution');

    await page.locator('#dashExportMenuBtn').click();
    const debugDownloadPromise = page.waitForEvent('download');
    await page.locator('#dashExpDebugJson').click();
    const debugDownload = await debugDownloadPromise;
    expect(debugDownload.suggestedFilename()).toMatch(/^vts_admin_debug_bundle_.*\.json$/);
    const debugJson = JSON.parse(await fs.readFile(await debugDownload.path(), 'utf8'));
    expect(debugJson.schema).toBe('vts-admin-debug-export-v1');
    expect(debugJson.counts.dutyEntries).toBe(1);
    expect(debugJson.debug.derived.weightedContribution.rows[0].playerName).toBe('Alpha');
    expect(debugJson.debug.localStorage.vts_ocr_dashboard.bytes).toBeGreaterThan(0);
  });

  test('admin dashboard persistence compacts player summary for cloud-safe saves', async ({
    page,
  }) => {
    await page.route('https://firestore.googleapis.com/**', (route) => route.abort());
    const seededAttacks = Array.from({ length: 8 }, (_, index) => ({
      id: `cloud-safe-${index + 1}`,
      structure_name: 'Gate',
      structure_level: 'Lv.5',
      game_time: `04/07/2026, ${String(index + 1).padStart(2, '0')}:00`,
      start_time: `${String(index).padStart(2, '0')}:45`,
      total_demolition: 100000 + index * 1000,
      players_count: 1,
      players: [{ name: 'Alpha', value: 100000 + index * 1000, rank: 1 }],
    }));

    await openAdmin(page);
    await openLocalAdminDashboard(page);
    await page.waitForFunction(() => typeof window.setOcrDashboardDataForTest === 'function');
    const result = await page.evaluate(async (attacks) => {
      const dashboard = await import('/js/ocr-dashboard.js');
      await dashboard.saveData(
        {
          last_updated: '04/07/2026, Saturday, 01:22 GT',
          total_attacks: attacks.length,
          attacks,
          players_summary: [],
        },
        { cloud: false }
      );
      const saved = JSON.parse(localStorage.getItem('vts_ocr_dashboard') || '{}');
      return {
        bytes: new Blob([JSON.stringify(saved)]).size,
        firstSummary: saved.players_summary?.[0],
        hasNestedAttacks: Array.isArray(saved.players_summary?.[0]?.attacks),
      };
    }, seededAttacks);

    expect(result.bytes).toBeLessThan(25000);
    expect(result.hasNestedAttacks).toBe(false);
    expect(result.firstSummary).toMatchObject({
      name: 'Alpha',
      total_demolition: 828000,
      participation_count: 8,
      unique_structures_count: 1,
    });
  });

  test('Eden X1 weighted contribution paginates 10 rows then 25 at a time', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const entries = Array.from({ length: 70 }, (_, index) => ({
      rank: String(index + 1),
      name: `${index < 30 ? 'Batch A' : 'Batch B'} Player ${String(index + 1).padStart(3, '0')}`,
      contribution: String(700000 - index * 1000),
    }));

    await openEdenX1ForTest(page);
    await page.evaluate(
      async (contributionEntries) =>
        window.setEdenX1DataForTest({
          r5Season: 'pagination-test',
          contributionRecords: [
            {
              id: 'pagination-record',
              date: '2026-07-12',
              premiumCutoff: 20,
              entries: contributionEntries,
            },
          ],
          dutyRecords: [],
          publicConductAdjustments: [],
          attacks: [],
        }),
      entries
    );

    const card = page.locator('#edenX1PublicWeightedCard');
    const rows = card.locator('tbody tr');
    const status = card.locator('.eden-x1-table-pagination-status');
    await expect(rows).toHaveCount(10);
    await expect(status).toHaveText('Showing 10 of 70 players');
    await expect(card.locator('#edenX1PublicLoadMoreRows')).toHaveText(
      'Load 25 more (60 remaining)'
    );
    await expect(
      card.getByRole('group', { name: 'Weighted contribution table pages' })
    ).toBeVisible();
    await expect(card.locator('#edenX1PublicLoadMoreRows')).toHaveAttribute(
      'aria-controls',
      'edenX1PublicWeightedTable'
    );
    const mobileControls = await card.locator('.eden-x1-table-pagination').evaluate((node) => {
      const rect = node.getBoundingClientRect();
      const buttons = Array.from(node.querySelectorAll('button'));
      return {
        left: rect.left,
        right: rect.right,
        viewportWidth: window.innerWidth,
        minimumButtonHeight: Math.min(
          ...buttons.map((button) => button.getBoundingClientRect().height)
        ),
      };
    });
    expect(mobileControls.left).toBeGreaterThanOrEqual(0);
    expect(mobileControls.right).toBeLessThanOrEqual(mobileControls.viewportWidth);
    expect(mobileControls.minimumButtonHeight).toBeGreaterThanOrEqual(44);

    await card.locator('#edenX1PublicLoadMoreRows').dispatchEvent('click');
    await expect(rows).toHaveCount(35);
    await expect(status).toHaveText('Showing 35 of 70 players');

    await card.locator('#edenX1PublicShowAllRows').dispatchEvent('click');
    await expect(rows).toHaveCount(70);
    await expect(status).toHaveText('Showing 70 of 70 players');
    await expect(card.locator('#edenX1PublicLoadMoreRows')).toHaveCount(0);
    await expect(card.locator('#edenX1PublicCollapseRows')).toBeVisible();

    await card.locator('#edenX1PublicCollapseRows').dispatchEvent('click');
    await expect(rows).toHaveCount(10);
    await expect(status).toHaveText('Showing 10 of 70 players');

    await card.locator('#edenX1PublicShowAllRows').dispatchEvent('click');
    await expect(rows).toHaveCount(70);
    await card.locator('#edenX1PublicWeightedSearch').fill('Batch A');
    await expect(rows).toHaveCount(10);
    await expect(status).toHaveText('Showing 10 of 30 players');
    await expect(card.locator('#edenX1PublicLoadMoreRows')).toHaveText(
      'Load 20 more (20 remaining)'
    );

    await card.locator('#edenX1PublicLoadMoreRows').dispatchEvent('click');
    await expect(rows).toHaveCount(30);
    await card.locator('th[data-public-weighted-sort="player"]').dispatchEvent('click');
    await expect(rows).toHaveCount(10);
    await expect(status).toHaveText('Showing 10 of 30 players');
  });

  test('admin chart image export lazy-loads html2canvas from admin entry', async ({ page }) => {
    await page.route('https://firestore.googleapis.com/**', (route) => route.abort());
    await page.route('https://html2canvas.hertzen.com/dist/html2canvas.min.js', (route) =>
      route.fulfill({
        contentType: 'application/javascript',
        body: `
          window.html2canvas = async function() {
            return {
              toBlob(callback) {
                callback(new Blob(['fake-png'], { type: 'image/png' }));
              },
              toDataURL() {
                return 'data:image/png;base64,ZmFrZS1wbmc=';
              }
            };
          };
        `,
      })
    );
    const seededDash = {
      last_updated: '20/06/2026, 12:00',
      total_attacks: 1,
      attacks: [
        {
          id: 'att-export-1',
          structure_name: 'Capital',
          structure_level: 'Lv.5',
          game_time: '20/06/2026, 20:30',
          start_time: '20:00',
          total_demolition: 1200000,
          players_count: 2,
          players: [
            { name: 'Alpha', value: 800000, rank: 1 },
            { name: 'Bravo', value: 400000, rank: 2 },
          ],
        },
      ],
      players_summary: [],
    };

    await openAdmin(page);
    await openLocalAdminDashboard(page);
    await page.waitForFunction(() => typeof window.setOcrDashboardDataForTest === 'function');
    await page.evaluate((seededDash) => {
      window.setOcrDashboardDataForTest(seededDash, []);
    }, seededDash);
    await expect(page.locator('#dashChart')).toContainText('Alpha');

    const downloadPromise = page.waitForEvent('download');
    await page.locator('#dashExportChartBtn').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('vts_top_performers.png');
    await expect(page.locator('[data-ocr-export-clone="true"]')).toHaveCount(0);
  });

  test('admin Alliance View imports, ranks, audits, edits, exports, and live-refreshes accounts', async ({
    page,
  }) => {
    test.slow();
    await page.setViewportSize({ width: 1440, height: 1000 });
    const fixture = createAllianceViewSmokeFixture();

    await openAdmin(page);
    await openLocalAdminDashboard(page);
    await seedAllianceViewContributions(page, fixture);
    await page.evaluate(() => window.switchDashSubtab('allianceView'));
    await waitForAllianceViewReady(page);
    await importAllianceRoster(page, 'v3s', fixture.v3sCsv, 91);
    await importAllianceRoster(page, 'vts', fixture.vtsCsv, 98);

    await expect(page.locator('#dashAllianceViewSummary [data-tone="accounts"] strong')).toHaveText(
      '189'
    );
    await expect(page.locator('#dashAllianceViewSummary [data-tone="matched"] strong')).toHaveText(
      '186'
    );
    await expect(
      page.locator('#dashAllianceViewSummary [data-tone="unmatched"] strong')
    ).toHaveText('3');
    await expect(page.locator('#dashAllianceMetric')).toHaveValue('extended');
    await expect(page.locator('[data-view="all"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-layout="combined"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#dashAllianceTable-combined .dash-alliance-row')).toHaveCount(189);
    await expect(
      page.locator('#dashAllianceTable-combined th[data-column="extended"]')
    ).toHaveAttribute('aria-sort', 'descending');

    let state = await getAllianceViewState(page);
    const fuzzy = state.rows.find((row) => row.accountName === 'Fuzzy Rnager');
    const unmatched = state.rows.find((row) => row.accountName === 'No Eden Account');
    const sharedRows = state.rows.filter((row) => row.accountName === 'Shared Source');
    expect(fuzzy).toMatchObject({
      matchStatus: 'fuzzy_review',
      requiresConfirmation: true,
      edenSourceId: '',
      extended: 0,
    });
    expect(fuzzy.matchSuggestionSourceName).toBe('Fuzzy Ranger');
    expect(unmatched).toMatchObject({ matchStatus: 'unmatched', extended: 0 });
    expect(sharedRows).toHaveLength(2);
    expect(new Set(sharedRows.map((row) => row.id)).size).toBe(2);
    expect(sharedRows.filter((row) => row.matchStatus === 'matched')).toHaveLength(1);
    expect(sharedRows.filter((row) => row.matchStatus === 'duplicate_conflict')).toHaveLength(1);
    expect(sharedRows.filter((row) => row.extended > 0)).toHaveLength(1);

    for (const activity of ['current', 'watch', 'stale', 'unknown']) {
      const cue = page.locator(`.dash-alliance-activity[data-activity="${activity}"]`).first();
      await expect(cue).toBeVisible();
      await expect(cue).toHaveAttribute('aria-label', /.+/);
      await expect(cue.locator('small')).not.toBeEmpty();
    }
    const scoreCue = page.locator('.dash-alliance-score[data-score-band="200k"]').first();
    await expect(scoreCue).toHaveAttribute('aria-label', /200k|200,000/i);
    await expect(scoreCue.locator('small')).toContainText('200k+');
    await expect(page.locator('.dash-alliance-bonus[data-bonus="gold"]').first()).toHaveAttribute(
      'aria-label',
      /\+6|6 or more/i
    );
    await expect(
      page.locator('.dash-alliance-bonus[data-bonus="negative"]').first()
    ).toHaveAttribute('aria-label', /negative|-1/i);

    await page.locator('[data-view="top100"]').click();
    await expect(page.locator('#dashAllianceTable-combined .dash-alliance-row')).toHaveCount(100);
    await expect(page.locator('#dashAllianceViewSummary [data-tone="v3s"] strong')).toHaveText(
      '50'
    );
    await expect(page.locator('#dashAllianceViewSummary [data-tone="vts"] strong')).toHaveText(
      '50'
    );
    const metricTopIds = (await getAllianceViewState(page)).visibleRows.map((row) => row.id).sort();
    const topAccountHeader = page.locator(
      '#dashAllianceTable-combined th[data-column="accountName"]'
    );
    await topAccountHeader.locator('button').click();
    await expect(topAccountHeader).toHaveAttribute('aria-sort', 'descending');
    const sortedTopIds = (await getAllianceViewState(page)).visibleRows.map((row) => row.id).sort();
    expect(sortedTopIds).toEqual(metricTopIds);
    await page.locator('[data-layout="split"]').click();
    await expect(page.locator('#dashAllianceTable-v3s .dash-alliance-row')).toHaveCount(50);
    await expect(page.locator('#dashAllianceTable-vts .dash-alliance-row')).toHaveCount(50);
    await page.locator('[data-view="all"]').click();
    await page.locator('[data-layout="combined"]').click();

    for (const metric of ['base', 'extended']) {
      await page.locator('#dashAllianceMetric').selectOption(metric);
      await expect
        .poll(() => getAllianceViewState(page).then((value) => value.metric))
        .toBe(metric);
    }
    const accountHeader = page.locator('#dashAllianceTable-combined th[data-column="accountName"]');
    await accountHeader.locator('button').click();
    await expect(accountHeader).toHaveAttribute('aria-sort', 'descending');

    const filterPanel = page.locator('.dash-alliance-filter-panel');
    await filterPanel.locator('summary').click();
    await filterPanel.locator('input[name="columns"][value="server"]').check();
    await expect(
      page.locator('#dashAllianceTable-combined th[data-column="server"]')
    ).toBeVisible();
    await filterPanel.locator('#dashAllianceFilterAlliance').selectOption('v3s');
    await filterPanel.locator('#dashAllianceFilterMetricMin').fill('900000');
    await expect(page.locator('#dashAllianceFilterCount')).toHaveText('2');
    const filteredCount = (await getAllianceViewState(page)).visibleRows.length;
    expect(filteredCount).toBeGreaterThan(0);
    expect(filteredCount).toBeLessThan(91);
    await filterPanel.locator('[data-action="clear-filters"]').click();
    await page.locator('#dashAllianceSearch').fill('城堡 050');
    await expect(page.locator('#dashAllianceTable-combined .dash-alliance-row')).toHaveCount(1);
    await expect(page.locator('#dashAllianceTable-combined')).toContainText('V3S 城堡 050');
    await page.locator('#dashAllianceSearch').fill('');

    state = await getAllianceViewState(page);
    const editable = state.rows.find((row) => row.accountName === 'V3S Account 001');
    let detail = await expandAllianceRow(page, editable.id);
    await expect(detail).toContainText('Full contribution breakdown');
    await expect(detail).toContainText(
      'Extended = Contribution + Ex-guild + 10,000 × (Banners + Pathers + Shield Walls + signed Bonus Team Effort)'
    );
    await detail.locator('[data-action="edit"]').click();
    await page.locator('#dashAllianceEditName').fill('Confirmed Account Rename');
    await page.locator('#dashAllianceEditAlliance').selectOption('vts');
    await page.locator('#dashAllianceEditTotalPower').fill('77777777');
    const edenMatchSearch = page.locator('#dashAllianceEditEdenSearch');
    const edenMatchSelect = page.locator('#dashAllianceEditEden');
    const edenOptionCount = await edenMatchSelect.locator('option').count();
    const originalEdenSourceId = await edenMatchSelect.inputValue();
    await expect(edenMatchSearch).toHaveAttribute('type', 'search');
    await edenMatchSearch.fill('manual reserve');
    await expect(edenMatchSelect).toHaveValue(originalEdenSourceId);
    expect(await edenMatchSelect.locator('option').count()).toBeLessThan(edenOptionCount);
    const reserveOption = edenMatchSelect
      .locator('option')
      .filter({ hasText: 'Manual Reserve Eden' });
    const reserveSourceId = await reserveOption.getAttribute('value');
    expect(reserveSourceId).toBeTruthy();
    await edenMatchSelect.selectOption(reserveSourceId);
    await edenMatchSearch.fill('no matching account');
    await expect(edenMatchSelect).toHaveValue(reserveSourceId);
    await expect(edenMatchSelect.locator('option')).toHaveCount(2);
    await expect(page.locator('#dashAllianceEditorDialog')).toHaveAttribute(
      'aria-labelledby',
      'dashAllianceEditorTitle'
    );
    await page.evaluate(
      ({ dashboard, adjustments }) => {
        window.setOcrDashboardDataForTest(dashboard, [], adjustments);
      },
      { dashboard: fixture.dashboard, adjustments: fixture.adjustments }
    );
    await expect(page.locator('#dashAllianceEditEden')).toHaveValue(reserveSourceId);
    await page.locator('#dashAllianceEditorForm button[type="submit"]').click();
    await expect(page.locator('#dashAllianceEditorDialog')).not.toBeVisible();
    await expect
      .poll(async () => {
        const row = (await getAllianceViewState(page)).rows.find((item) => item.id === editable.id);
        return {
          name: row?.accountName,
          allianceId: row?.allianceId,
          power: row?.totalPower,
          sourceName: row?.edenSourceName,
        };
      })
      .toEqual({
        name: 'Confirmed Account Rename',
        allianceId: 'vts',
        power: 77777777,
        sourceName: 'Manual Reserve Eden',
      });

    state = await getAllianceViewState(page);
    const duplicateTarget = state.rows.find((row) => row.accountName === 'V3S Account 002');
    detail = await expandAllianceRow(page, duplicateTarget.id);
    await detail.locator('[data-action="edit"]').click();
    await expect(page.locator('#dashAllianceEditEdenSearch')).toHaveValue('');
    await page.locator('#dashAllianceEditEden').selectOption(reserveSourceId);
    await page.locator('#dashAllianceEditorForm button[type="submit"]').click();
    await expect(page.locator('#dashAllianceEditorError')).toContainText(/already assigned/i);
    await expect(page.locator('#dashAllianceEditorError')).toBeFocused();
    await page.locator('#dashAllianceEditorDialog [data-action="close-editor"]').first().click();

    await filterPanel.locator('#dashAllianceFilterAlliance').selectOption('v3s');
    const filteredDownloadPromise = page.waitForEvent('download');
    await page.locator('[data-action="export-filtered"]').click();
    const filteredDownload = await filteredDownloadPromise;
    expect(filteredDownload.suggestedFilename()).toMatch(/^alliance-view-filtered-.*\.csv$/);
    const filteredCsv = await fs.readFile(await filteredDownload.path(), 'utf8');
    expect(filteredCsv).toContain('"Match Status"');
    expect(filteredCsv).toContain('"Eden Source ID"');
    expect(filteredCsv.trim().split(/\r?\n/)).toHaveLength(91);

    const completeDownloadPromise = page.waitForEvent('download');
    await page.locator('[data-action="export-all"]').click();
    const completeDownload = await completeDownloadPromise;
    expect(completeDownload.suggestedFilename()).toMatch(/^alliance-view-complete-.*\.csv$/);
    const completeCsv = await fs.readFile(await completeDownload.path(), 'utf8');
    expect(completeCsv.trim().split(/\r?\n/)).toHaveLength(190);
    expect(completeCsv).toContain('"Suggested Eden Source Name"');

    const briefingDownloadPromise = page.waitForEvent('download');
    await page.locator('[data-action="export-brief"]').click();
    const briefingDownload = await briefingDownloadPromise;
    expect(briefingDownload.suggestedFilename()).toMatch(
      /^alliance-merge-briefing-\d{4}-\d{2}-\d{2}\.png$/
    );
    const briefingPng = await fs.readFile(await briefingDownload.path());
    expect([...briefingPng.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    expect(briefingPng.readUInt32BE(16)).toBe(1600);
    expect(briefingPng.readUInt32BE(20)).toBe(1200);
    await expect(page.locator('#dashAllianceViewStatus')).toContainText(/briefing PNG exported/i);

    await filterPanel.locator('[data-action="clear-filters"]').click();
    const liveDashboard = structuredClone(fixture.dashboard);
    const boosted = liveDashboard.contributionRecords[0].entries.find(
      (entry) => entry.name === 'V3S Account 002'
    );
    boosted.contribution = '3000000';
    const scoreBeforeRefresh = duplicateTarget.extended;
    await page.evaluate(
      ({ dashboard, adjustments }) => {
        window.setOcrDashboardDataForTest(dashboard, [], adjustments);
      },
      { dashboard: liveDashboard, adjustments: fixture.adjustments }
    );
    await expect
      .poll(async () => {
        const row = (await getAllianceViewState(page)).rows.find(
          (item) => item.id === duplicateTarget.id
        );
        return row?.extended;
      })
      .toBeGreaterThan(scoreBeforeRefresh);
    await expect(page.locator('#dashAllianceViewStatus')).toContainText(/refreshed/i);
  });

  test('admin Alliance View stays responsive, keyboard-accessible, and RTL-aware on mobile', async ({
    page,
  }) => {
    test.slow();
    await page.setViewportSize({ width: 360, height: 740 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.addInitScript(() => {
      localStorage.setItem('vts_hero_lang', 'en');
      localStorage.setItem('vts_theme', 'dark');
    });
    const fixture = createAllianceViewSmokeFixture();

    await openAdmin(page);
    await openLocalAdminDashboard(page);
    await seedAllianceViewContributions(page, fixture);
    await page.evaluate(() => window.switchDashSubtab('contributions'));
    const contributionsTab = page.locator('.dash-subtab-btn[data-subtab="contributions"]');
    await contributionsTab.focus();
    await page.keyboard.press('ArrowRight');
    const allianceTab = page.locator('.dash-subtab-btn[data-subtab="allianceView"]');
    await expect(allianceTab).toBeFocused();
    await expect(allianceTab).toHaveAttribute('aria-selected', 'true');
    await waitForAllianceViewReady(page);
    await importAllianceRoster(page, 'v3s', createSyntheticAllianceRosterCsv('v3s', 4), 4);

    const layout = await page.evaluate(() => {
      const root = document.querySelector('#ocrDashboardRoot');
      const table = document.querySelector('#dashAllianceTable-combined');
      const firstRow = table?.querySelector('.dash-alliance-row');
      const wrap = table?.closest('.dash-alliance-table-wrap');
      return {
        documentOverflow: document.documentElement.scrollWidth > window.innerWidth + 2,
        rootOverflow: root.scrollWidth > root.clientWidth + 2,
        rowDisplay: firstRow ? getComputedStyle(firstRow).display : '',
        wrapOverflow: wrap ? getComputedStyle(wrap).overflow : '',
      };
    });
    expect(layout.documentOverflow).toBe(false);
    expect(layout.rootOverflow).toBe(false);
    expect(layout.rowDisplay).toBe('grid');
    expect(layout.wrapOverflow).toBe('visible');

    const tableRegion = page.locator('.dash-alliance-table-wrap').first();
    await expect(tableRegion).toHaveAttribute('role', 'region');
    await expect(tableRegion).toHaveAttribute('tabindex', '0');
    const expand = page.locator('.dash-alliance-expand').first();
    await expect(expand).toHaveAttribute('aria-expanded', 'false');
    await expect(expand).toHaveAttribute('aria-controls', /dashAllianceDetails-/);
    await expect(expand).toHaveAttribute('aria-label', /.+/);
    await expand.focus();
    await page.keyboard.press('Enter');
    await expect(expand).toHaveAttribute('aria-expanded', 'true');
    await expect(expand).toHaveAttribute('aria-label', /Close/i);

    const bandCues = await page.evaluate(() => ({
      score: Array.from(document.querySelectorAll('[data-score-band]')).every(
        (node) =>
          Boolean(node.getAttribute('aria-label')) &&
          Boolean(node.querySelector('small')?.textContent)
      ),
      activity: Array.from(document.querySelectorAll('[data-activity]')).every(
        (node) =>
          Boolean(node.getAttribute('aria-label')) &&
          Boolean(node.querySelector('small')?.textContent)
      ),
      bonus: Array.from(document.querySelectorAll('[data-bonus]')).every(
        (node) =>
          Boolean(node.getAttribute('aria-label')) &&
          Boolean(node.querySelector('small')?.textContent)
      ),
    }));
    expect(bandCues).toEqual({ score: true, activity: true, bonus: true });

    await page.locator('#languageSelect').selectOption('ar');
    await expect(page.locator('#languageSelect')).toHaveValue('ar');
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem('vts_hero_lang')), { timeout: 20000 })
      .toBe('ar');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl', { timeout: 20000 });
    await expect(page.locator('html')).toHaveAttribute('lang', /ar/, { timeout: 20000 });
    await expect(page.locator('#dashAllianceViewTitle')).toContainText(/[\u0600-\u06ff]/, {
      timeout: 20000,
    });
    await expect(page.locator('#dashAllianceSearch')).toHaveAttribute(
      'placeholder',
      /[\u0600-\u06ff]/
    );
    const rtlLayout = await page.evaluate(() => ({
      documentOverflow: document.documentElement.scrollWidth > window.innerWidth + 2,
      rootOverflow:
        document.querySelector('#ocrDashboardRoot').scrollWidth >
        document.querySelector('#ocrDashboardRoot').clientWidth + 2,
      titleDirection: getComputedStyle(document.querySelector('#dashAllianceViewTitle')).direction,
    }));
    expect(rtlLayout.documentOverflow).toBe(false);
    expect(rtlLayout.rootOverflow).toBe(false);
    expect(rtlLayout.titleDirection).toBe('rtl');
  });
});
