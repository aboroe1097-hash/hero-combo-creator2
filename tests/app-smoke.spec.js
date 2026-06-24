import { expect, test } from '@playwright/test';

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
    sessionStorage.removeItem('vts_guest');
    localStorage.removeItem('vts_ocr_auth');
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

async function openGuestDashboard(page) {
  await page.waitForFunction(() => document.getElementById('dashGuestBtn'), null, {
    timeout: 20000,
  });
  await page.waitForFunction(
    () => typeof document.getElementById('dashGuestBtn')?.onclick === 'function',
    null,
    { timeout: 20000 }
  );
  await page.evaluate(() => {
    localStorage.removeItem('vts_ocr_auth');
    sessionStorage.setItem('vts_guest', '1');
    document.getElementById('dashGuestBtn')?.click();
  });
  await expect(page.locator('#dashGuestBanner')).toBeVisible({ timeout: 20000 });
}

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
                node.dataset.heroTroop ||
                node.querySelector('.hero-card-type')?.textContent.trim()
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
    const freshUseCounterButton = page.locator(`.counter-use-btn[data-counter-use="${counterUseValue}"]`);
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

  test('admin guest mode can return to admin login', async ({ page }) => {
    await openAdmin(page);

    await openGuestDashboard(page);
    await expect(page.locator('#dashGuestBanner')).toContainText('Guest Mode');
    await expect(page.locator('#dashGuestAdminBtn')).toHaveText(/Log in as Admin/);
    await expect(page.locator('#dashUploadZone')).not.toBeVisible();
    await page.locator('#ocrDashboardRoot [data-subtab="contributions"]').click();
    await expect(page.locator('#dashSubtabContributions')).toBeVisible();
    await expect(page.locator('#dashContributionDropZone')).toContainText('Total Contribution');

    await page.locator('#dashGuestAdminBtn').click();
    await expect(page.locator('#dashLogin')).toBeVisible();
    await expect(page.locator('#dashGuestBtn')).toBeVisible();
    await expect(page.locator('#dashApp')).not.toBeVisible();
    expect(await page.evaluate(() => sessionStorage.getItem('vts_guest'))).toBeNull();
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
          total_demolition: 2100000,
          players_count: 3,
          players: [
            { name: 'Bravo', value: 1000000, rank: 1 },
            { name: 'Alpha', value: 700000, rank: 2 },
            { name: 'Echo', value: 400000, rank: 3 },
          ],
        },
      ],
      players_summary: [],
    };
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

    await openGuestDashboard(page);
    await page.waitForFunction(() => typeof window.setOcrDashboardDataForTest === 'function');
    await page.evaluate(
      async ({ seededDash, seededRoster }) => {
        window.setOcrDashboardDataForTest(seededDash, seededRoster);
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
      { seededDash, seededRoster }
    );
    await expect(page.locator('#dashLeaderBody tr', { hasText: 'Anne' })).toHaveCount(1);
    await page.waitForFunction(() => typeof window.switchDashSubtab === 'function');
    await page.evaluate(() => window.switchDashSubtab('analytics'));
    await expect(page.locator('#dashSubtabAnalytics')).toBeVisible();
    await expect(page.locator('#dashStructureChart')).toContainText('Capital');
    await expect(page.locator('#dashPlayerTrends')).toContainText('Alpha');
    await expect(page.locator('#dashHitDistribution')).toContainText('Below 5K');
    await expect(page.locator('#dashHitDistribution')).toContainText('5K-10K');
    await expect(page.locator('#dashHitDistribution')).toContainText('100K+');
    await expect(page.locator('#dashAllianceInsights')).toContainText('Unmapped');

    await page.evaluate(() => {
      const item = Array.from(document.querySelectorAll('#dashStructureChart .dash-structure-item'))
        .find((node) => node.textContent?.includes('Capital'));
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
});
