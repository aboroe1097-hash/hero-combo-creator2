import { expect, test } from '@playwright/test';
import fs from 'node:fs/promises';

async function waitForAppReady(page) {
  await expect(page.locator('body')).toHaveClass(/app-ready/, { timeout: 30000 });
  await expect(page.locator('#tabGenerator')).toBeVisible();
  await expect(page.locator('#generatorSection')).toBeVisible();
  await expect(page.locator('#appBootSplash')).toBeHidden({ timeout: 10000 });
  await expect(page.locator('#firstVisitIntro')).toBeHidden({ timeout: 10000 });
  await expect(page.locator('.quick-tour-overlay')).toBeHidden({ timeout: 10000 });
}

async function openApp(page, path = '/') {
  await page.route('https://www.googletagmanager.com/**', (route) => route.abort());
  await page.addInitScript(() => {
    localStorage.setItem('vts_maintenance_bypass', '1');
    localStorage.setItem('vts_intro_v1_seen', '1');
    localStorage.setItem('vts_quick_tour_done', '1');
  });
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await waitForAppReady(page);
}

async function expectTab(page, buttonId, sectionId, marker) {
  await page.locator(buttonId).click();
  await expect(page.locator(sectionId)).toBeVisible({ timeout: 15000 });
  await expect(page.locator(marker)).toBeVisible({ timeout: 20000 });
}

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
  },
  {
    name: 'loyalty',
    buttonId: '#tabLoyalty',
    sectionId: '#loyaltySection',
    marker: '#loyaltyPresets',
    target: '#loyaltySection',
  },
];

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
      .whats-new-banner,
      .generate-summary,
      .generated-summary,
      #generatorResults > .text-center,
      #globalGameClock {
        visibility: hidden !important;
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
    window.stop();
  });
}

async function openVisualApp(page, viewport) {
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  await openApp(page, `/?visual=${viewport.name}`);
  await stabilizeVisuals(page);
}

async function openBootSplashForVisual(page, viewport) {
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.route('https://www.googletagmanager.com/**', (route) => route.abort());
  await page.addInitScript(() => {
    localStorage.setItem('vts_maintenance_bypass', '1');
    localStorage.removeItem('vts_intro_v1_seen');
    localStorage.removeItem('vts_quick_tour_done');
  });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#appBootSplash')).toBeAttached({ timeout: 10000 });
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        caret-color: transparent !important;
        transition-duration: 0s !important;
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        animation-iteration-count: 1 !important;
      }
      #appBootSplash {
        display: flex !important;
        opacity: 1 !important;
        visibility: visible !important;
        pointer-events: auto !important;
      }
      #bootParticles {
        display: none !important;
      }
    `,
  });
  await page.locator('#appBootSplash').evaluate((splash) => {
    splash.classList.remove('hidden', 'boot-splash--out', 'boot-splash--opening');
    splash.setAttribute('aria-hidden', 'false');
    document.body.classList.add('app-booting');
    document.body.classList.remove('app-ready');
    const fill = document.querySelector('.boot-progress-fill');
    if (fill) fill.style.width = '42%';
    const status = document.querySelector('.boot-status-text');
    if (status) status.textContent = 'Priming Eden map layers...';
  });
}

async function expectVisualSnapshot(page, selector, name) {
  const target = page.locator(selector);
  await target.scrollIntoViewIfNeeded();
  await target.evaluate((root) =>
    Promise.all(
      Array.from(root.querySelectorAll('img')).map(
        (img) =>
          img.complete ||
          new Promise((resolve) => {
            img.addEventListener('load', resolve, { once: true });
            img.addEventListener('error', resolve, { once: true });
          })
      )
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

test.describe('visual regression', () => {
  // Screenshot baselines are rendered on the dev OS (Windows). Linux CI renders
  // fonts/anti-aliasing differently, which diffs every snapshot. Run these locally;
  // skip in CI until platform-specific (Linux) baselines are committed.
  test.skip(!!process.env.CI, 'Platform-specific visual baselines; run locally, not in CI.');
  test.beforeEach(({}, testInfo) => {
    testInfo.snapshotSuffix = '';
  });

  for (const viewport of visualViewports) {
    test(`header and boot shell render at ${viewport.name}`, async ({ page }) => {
      await openBootSplashForVisual(page, viewport);
      await expectVisualSnapshot(page, '#appBootSplash', `boot-splash-${viewport.name}.png`);

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
  test.beforeEach(({}, testInfo) => {
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
        }
        #globalGameClock,
        #dashCloudStatusText,
        #dashCloudStatus,
        #dashLogArea,
        #dashLogOutput,
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
      }
      return results;
    });
    for (const check of checks) {
      expect(check.missing, `${check.name} panel rendered`).toBe(false);
      expect(check.rootOverflow, `${check.name} root horizontal overflow`).toBe(false);
      expect(check.documentOverflow, `${check.name} document horizontal overflow`).toBe(false);
      expect(check.clippedCyrillicName, `${check.name} nowrap-clip a Cyrillic cell`).toBe(false);
    }
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
  test('manual and generator tabs render', async ({ page }) => {
    await openApp(page);
    await expectTab(page, '#tabManual', '#manualSection', '#availableHeroes');
    const firstHero = page.locator('#availableHeroes .hero-card').first();
    const firstHeroName = await firstHero.getAttribute('data-hero-name');
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
    await expect(page.locator('.toast.undo-toast')).toContainText('Combo slot 1 changed');
    await page.locator('.toast.undo-toast button').click();
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

  test('hero atlas and research tabs render', async ({ page }) => {
    await openApp(page);
    await expectTab(page, '#tabHeroes', '#heroesSection', '#heroesSection .heroes-layout');
    await expectTab(page, '#tabResearch', '#researchSection', '#techListContainer');
  });

  test('strife planner renders monster art and F2P/P2W lanes', async ({ page }) => {
    await openApp(page);
    await expectTab(
      page,
      '#tabStrife',
      '#strifeSection',
      '#strifeToolRoot .strife-monster-card:first-child'
    );
    await expect(page.locator('#strifeToolRoot .strife-monster-card')).toHaveCount(10);
    await page.locator('[data-strife-monster="pivana"]').click();
    await expect(page.locator('.strife-monster-summary')).toContainText('Pilvana');
    await expect(page.locator('.strife-source-link')).toContainText('Sourced from Celso Kayran');
    await expect(page.locator('.strife-results-band--f2p')).toContainText('Free Combos');
    await expect(page.locator('.strife-results-band--p2w')).toContainText('Paid Combos');
    await expect(page.locator('.strife-skill-card')).toHaveCount(3);
    await expect(page.locator('.strife-skill-answer').first()).toContainText('Counter');
    await expect(page.locator('.strife-results-band--f2p')).toContainText('Sky Breaker');

    await page.locator('[data-strife-monster="noisy-noel"]').click();
    await expect(page.locator('.strife-monster-summary')).toContainText('Noisy Noel');
    await expect(page.locator('.strife-skill-card')).toHaveCount(4);
    await expect(page.locator('.strife-results-band--f2p')).toContainText('Witch Hunter');
    await expect(page.locator('.strife-results-band--p2w')).toContainText('Ramses II');

    await page.locator('[data-strife-stage="X8"]').click();
    await page.locator('[data-strife-monster="gambosate"]').click();
    await expect(page.locator('.strife-monster-summary')).toContainText('Gambosate');
    await expect(page.locator('.strife-skill-card')).toHaveCount(4);
    await expect(page.locator('.strife-results-band--p2w')).toContainText('Rainforest Ranger');
  });

  test('lazy-loaded eden map, loyalty, and admin tabs render', async ({ page }) => {
    await openApp(page);
    await expectTab(page, '#tabEdenMap', '#edenMapSection', '#edenMapRoot');
    await expect(page.locator('#edenMapConstruction')).toHaveClass(/hidden/);
    await expect(page.locator('[data-eden-layer="strategyFloor"]')).toHaveClass(/active/);
    await expect(page.locator('[data-eden-layer="reference"]')).not.toHaveClass(/active/);
    await expect(page.locator('#edenMapCanvas')).toBeVisible();
    await expectEdenTerrainPainted(page);
    await page.locator('#edenCoordSearch').fill('800:800');
    await page.locator('#edenCoordGo').click();
    await expect(page.locator('.eden-struct-row.active')).toContainText('800:800');
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

    const darkLayout = await page.evaluate(() => {
      const nav = document.getElementById('tabNavScroll');
      const adminTab = document.getElementById('tabOcrDashboard');
      return {
        rootTheme: document.documentElement.getAttribute('data-theme') || 'dark',
        noDocumentOverflow: document.documentElement.scrollWidth <= window.innerWidth + 2,
        navScrollsInside: nav.scrollWidth >= nav.clientWidth,
        adminMobileLabel: window.getComputedStyle(adminTab, '::after').content,
      };
    });
    expect(darkLayout.rootTheme).toBe('dark');
    expect(darkLayout.noDocumentOverflow).toBe(true);
    expect(darkLayout.navScrollsInside).toBe(true);
    expect(darkLayout.adminMobileLabel).toContain('Admin');

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
    await expect(arthurGeneratorCard).not.toHaveClass(/skin-priority-card/);
    await expect(arthurGeneratorCard.locator('.generator-skin-toggle')).toHaveCount(0);

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
      'Upgrades Skill 2: Wheel of Fortune -> Eternity'
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
      'counters known'
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
          total_demolition: 1234567,
          players_count: 1,
          players: [{ name: 'Cache Tester', value: 1234567, rank: 1 }],
        },
      ],
      players_summary: [],
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
        window.VTS_ADMIN_LOCAL_TEST_AUTH = true;
        window.VTS_DASHBOARD_CLOUD_BOOT_TIMEOUT_MS = 350;
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
    await expect(page.locator('#dashApp')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#dashConnecting')).toBeHidden();
    await expect(page.locator('#dashLeaderBody')).toContainText('Cache Tester');
    await expect(page.locator('#dashCloudStatusText')).toContainText('Showing local cache');

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
    const visibleLeaderRows = await page
      .locator('#dashLeaderBody tr')
      .evaluateAll(
        (rows) => rows.filter((row) => !row.querySelector('.dash-load-more-btn')).length
      );
    expect(visibleLeaderRows).toBe(20);
    await expect(page.locator('#dashLeaderBody .dash-load-more-btn')).toContainText('Show More');
    await page.evaluate(() => window.switchDashSubtab('conduct'));
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

  test('conduct adjustment saves locally when Firebase is not configured', async ({ page }) => {
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
      ({ seededDash, seededRoster }) => {
        window.setOcrDashboardDataForTest(seededDash, seededRoster);
        window.switchDashSubtab('conduct');
      },
      { seededDash, seededRoster }
    );

    await page.locator('#dashConductPlayerSearchBtn').click();
    await expect(page.locator('#dashConductPlayerSearchInput')).toBeVisible();
    await page.locator('#dashConductPlayerSearchInput').fill('sara');
    await expect(page.locator('#dashConductPlayer option:checked')).toHaveText('~Sarafino~');
    await page.locator('#dashConductCategory').selectOption('connected_road');
    await page.locator('#dashConductPoints').fill('1000');
    await page.locator('#dashConductNote').fill('Helped connecting roads for L4 town');
    await page.locator('#dashConductSaveBtn').click();

    await expect(page.locator('#dashConductStatus')).toContainText('Conduct adjustment saved.');
    await expect(page.locator('#dashConductList')).toContainText('~Sarafino~');
    await expect(page.locator('#dashConductList')).toContainText(
      'Helped connecting roads for L4 town'
    );

    await page.locator('#dashConductPlayer').selectOption({ label: 'Other / external R5' });
    await expect(page.locator('#dashConductManualPlayerInput')).toBeVisible();
    await page.locator('#dashConductManualPlayerInput').fill('External R5');
    await page.locator('#dashConductCategory').selectOption('grant_premium');
    await expect(page.locator('#dashConductPoints')).toHaveValue('0');
    await page.locator('#dashConductNote').fill('Grant premium regardless of weighted rank');
    await page.locator('#dashConductSaveBtn').click();

    await expect(page.locator('#dashConductStatus')).toContainText('Conduct adjustment saved.');
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
    await expect(page.locator('#dashWeightedContributionPanel')).toContainText(
      'Weighted Total Contribution'
    );
    await expect(page.locator('#dashWeightedContributionPanel')).toContainText('Weighted score');

    await page.evaluate(() => window.switchDashSubtab('pathers'));

    await expect(page.locator('#dashPatherListSummary .dash-duty-summary-table')).toBeVisible();
    await expect(page.locator('#dashPatherListSummary')).toContainText('Kika');
    await expect(page.locator('#dashPatherListSummary thead')).toContainText('Entries');
    await expect(page.locator('#dashPatherListSummary thead')).toContainText('Times');
    await expect(page.locator('#dashPatherListSummary thead')).not.toContainText('Targets');
    await expect(page.locator('#dashPatherListSummary thead')).not.toContainText('Groups');
    const patherSummaryRows = await page
      .locator('#dashPatherListSummary .dash-duty-summary-table tbody tr')
      .evaluateAll((rows) =>
        rows.map((row) => Array.from(row.cells).map((cell) => cell.textContent.trim()))
      );
    expect(patherSummaryRows.filter((cells) => cells[0].includes('Kika'))).toHaveLength(2);
    expect(patherSummaryRows.find((cells) => cells[0] === 'ANGEL')?.[2]).toContain('10:30');
    expect(patherSummaryRows.find((cells) => cells[0] === 'Zubbs')?.[2]).toContain('10:30');
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
    expect(layout.summaryLabel).toContain('Player');
    expect(layout.detailLabel).toContain('Group');
    expect(layout.summaryRowDisplay).toBe('block');
    expect(layout.detailRowDisplay).toBe('block');

    await page.evaluate(() => window.switchDashSubtab('contributions'));
    await expect(page.locator('#dashContributionWeightedPanel')).toContainText(
      'Weighted Total Contribution'
    );
    await expect(page.locator('#dashContributionWeightedPanel')).toContainText('Weighted score');
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
    };

    await openAdmin(page);
    await openLocalAdminDashboard(page);
    await page.waitForFunction(
      () =>
        typeof window.setOcrDashboardDataForTest === 'function' &&
        typeof window.switchDashSubtab === 'function'
    );
    await page.evaluate((dash) => {
      window.setOcrDashboardDataForTest(dash, []);
      window.switchDashSubtab('dashboard');
    }, seededDash);

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
    await expect(panel.locator('th', { hasText: 'Weighted score' })).toBeVisible();

    const weightedRows = await panel.locator('tbody tr').evaluateAll((rows) =>
      rows.map((row) => Array.from(row.cells).map((cell) => cell.textContent.trim()))
    );
    const mainRow = weightedRows.find((cells) => cells[3] === '144,650');
    const altRow = weightedRows.find((cells) => cells[3] === '78,617');

    expect(mainRow?.[5]).toBe('1');
    expect(mainRow?.[6]).toBe('1');
    expect(mainRow?.[10]).toBe('Guild Master Reward');
    expect(altRow?.[5]).toBe('0');
    expect(altRow?.[6]).toBe('0');
    expect(altRow?.[10]).toBe('Core Rewards');

    const mainScoreTrigger = panel
      .locator('tbody tr', { hasText: '144,650' })
      .locator('.dash-weighted-score-trigger');
    const scorePopover = mainScoreTrigger.locator('.dash-weighted-score-popover');
    await expect(scorePopover).toBeHidden();
    await mainScoreTrigger.hover();
    await expect(scorePopover).toBeVisible();
    await expect(scorePopover).toContainText('Contribution');
    await expect(scorePopover).toContainText('Duty points');
    await expect(scorePopover).toContainText('20,000');
    await expect(scorePopover).toContainText('Total');

    await page.evaluate(() => window.switchDashSubtab('contributions'));
    await expect(
      page.locator('#dashContributionWeightedPanel').getByRole('button', { name: 'Full View' })
    ).toBeVisible();
    const contributionScoreTrigger = page
      .locator('#dashContributionWeightedPanel tbody tr', { hasText: '144,650' })
      .locator('.dash-weighted-score-trigger');
    const contributionScorePopover = contributionScoreTrigger.locator(
      '.dash-weighted-score-popover'
    );
    await contributionScoreTrigger.focus();
    await expect(contributionScorePopover).toBeVisible();
    await expect(contributionScorePopover).toContainText('Weighted score breakdown');
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

    await page.locator('#dashExportMenuBtn').click();
    const weightedDownloadPromise = page.waitForEvent('download');
    await page.locator('#dashExpWeightedCsv').click();
    const weightedDownload = await weightedDownloadPromise;
    expect(weightedDownload.suggestedFilename()).toMatch(/^vts_weighted_contribution_.*\.csv$/);
    const weightedCsv = await fs.readFile(await weightedDownload.path(), 'utf8');
    expect(weightedCsv).toContain('Ex-guild contribution');
    expect(weightedCsv).toContain('Guild Master Reward');

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
});
