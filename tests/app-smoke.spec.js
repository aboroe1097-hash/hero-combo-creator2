import { expect, test } from '@playwright/test';

async function openApp(page) {
  await page.route('**/js/maintenance-config.js*', route => route.fulfill({
    contentType: 'application/javascript',
    body: 'window.VTS_MAINTENANCE_MODE=false; window.VTS_MAINTENANCE_CONFIG={};'
  }));
  await page.goto('/');
  await expect(page.locator('#tabGenerator')).toBeVisible();
  await expect(page.locator('#generatorSection')).toBeVisible();
}

async function expectTab(page, buttonId, sectionId, marker) {
  await page.locator(buttonId).click();
  await expect(page.locator(sectionId)).toBeVisible();
  await expect(page.locator(marker)).toBeVisible();
}

test.describe('app smoke tabs', () => {
  test('manual and generator tabs render', async ({ page }) => {
    await openApp(page);
    await expectTab(page, '#tabManual', '#manualSection', '#availableHeroes');
    await expectTab(page, '#tabGenerator', '#generatorSection', '#generatorHeroes');
  });

  test('hero atlas and research tabs render', async ({ page }) => {
    await openApp(page);
    await expectTab(page, '#tabHeroes', '#heroesSection', '#heroesSection .heroes-layout');
    await expectTab(page, '#tabResearch', '#researchSection', '#techListContainer');
  });

  test('lazy-loaded eden map, loyalty, and admin tabs render', async ({ page }) => {
    await openApp(page);
    await expectTab(page, '#tabEdenMap', '#edenMapSection', '#edenMapRoot');
    await expectTab(page, '#tabLoyalty', '#loyaltySection', '#loyaltyPresets');
    await expectTab(page, '#tabOcrDashboard', '#ocrDashboardSection', '#dashLogin');
  });

  test('generator filters default to S0/S1 and update visible heroes', async ({ page }) => {
    await openApp(page);
    const cards = page.locator('#generatorHeroes .generator-card');
    await expect(cards.first()).toBeVisible();

    await expect(page.locator('#generatorSeasonFilters input[value="S0"]')).toBeChecked();
    await expect(page.locator('#generatorSeasonFilters input[value="S1"]')).toBeChecked();

    const initialSeasons = await page.locator('#generatorHeroes .hero-tag').evaluateAll(nodes =>
      [...new Set(nodes.map(node => node.textContent.trim()))].sort()
    );
    expect(initialSeasons).toEqual(['S0', 'S1']);

    await page.locator('#generatorTroopFilters .archers-pill').click();
    await expect(page.locator('#generatorTroopFilters input[value="All"]')).not.toBeChecked();
    await expect(page.locator('#generatorTroopFilters input[value="Archers"]')).toBeChecked();
    const filteredTroops = await cards.evaluateAll(nodes =>
      [...new Set(nodes.map(node => node.querySelector('.mt-1 span:last-child')?.textContent.trim()).filter(Boolean))].sort()
    );
    expect(filteredTroops).toContain('Archers');
    expect(filteredTroops.every(troop => troop === 'Archers' || troop === 'All')).toBe(true);

    await page.locator('#generatorSeasonFilters .s2-pill').click();
    await expect(page.locator('#generatorSeasonFilters input[value="S2"]')).toBeChecked();
    const seasonsWithS2 = await page.locator('#generatorHeroes .hero-tag').evaluateAll(nodes =>
      [...new Set(nodes.map(node => node.textContent.trim()))].sort()
    );
    expect(seasonsWithS2).toContain('S2');
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
    await expect(page.locator('#generatorHeroes .generator-card.skin-priority-muted').first()).toBeVisible();
    await expect(page.locator('#generatorHeroes .generator-card.skin-no-skin').first()).toBeVisible();

    const arthurGeneratorCard = page.locator('#generatorHeroes .generator-card').filter({ hasText: 'King Arthur' }).first();
    await expect(arthurGeneratorCard).toBeVisible();
    await expect(arthurGeneratorCard).toHaveClass(/skin-priority-card/);
    await expect(arthurGeneratorCard.locator('.generator-skin-badge--priority')).toHaveText('E');

    await expectTab(page, '#tabHeroes', '#heroesSection', '#heroesSection .heroes-layout');
    await page.locator('#heroesTabSearch').fill('King Arthur');
    await expect(page.locator('[data-hero-name="King Arthur"]')).toBeVisible();
    await page.locator('[data-hero-name="King Arthur"]').click();
    await page.locator('[data-detail-section="skins"]').click();
    await expect(page.locator('#detail-section-skins')).toContainText('Upgrades Skill 2: Wheel of Fortune -> Eternity');
    await expect(page.locator('#detail-section-skins')).not.toContainText('Slot 8');
    await expect(page.locator('#detail-section-skins')).toContainText('Biography: Hidden Power');
    await expect(page.locator('#detail-section-skins')).toContainText('Own 2 Biography Skin variants');
    await expect(page.locator('#detail-section-skins')).toContainText('Solid Shield');
    await expect(page.locator('#detail-section-skins')).toContainText("The hero's squad gains 4% HP and takes 2% less damage.");
  });

  test('counter database and upgraded counter panels work', async ({ page }) => {
    await openApp(page);

    const counterIssues = await page.evaluate(async () => {
      const mod = await import('/js/counter-db.js');
      return mod.validateCounterDatabase();
    });
    expect(counterIssues).toEqual([]);

    for (const seasonPill of ['.s2-pill', '.s3-pill', '.s4-pill', '.x1-pill', '.x2-pill']) {
      await page.locator(`#generatorSeasonFilters ${seasonPill}`).click();
    }
    await page.locator('#genSelectAllBtn').click();
    await expect(page.locator('#genSelectedCount')).toContainText('selected');
    await page.locator('#generateCombosBtn').click();

    const firstGenerated = page.locator('#generatorResults .generated-combo-card').first();
    await expect(firstGenerated).toBeVisible();
    await expect(firstGenerated.locator('.counter-summary-badge')).toContainText('counters known');
    await firstGenerated.locator('.counter-toggle-btn').click();
    await expect(firstGenerated.locator('.counter-card--mini-combo').first()).toBeVisible();
    await expect(firstGenerated.locator('.counter-use-btn').first()).toBeVisible();

    await page.locator('#genClearAllBtn').click();
    await firstGenerated.locator('.counter-use-btn').first().click();
    await expect(page.locator('#genSelectedCount')).toContainText('3 selected');

    await expectTab(page, '#tabHeroes', '#heroesSection', '#heroesSection .heroes-layout');
    await page.locator('#heroesTabSearch').fill('King Arthur');
    await expect(page.locator('[data-hero-name="King Arthur"]')).toBeVisible();
    await page.locator('[data-hero-name="King Arthur"]').click();
    await expect(page.locator('[data-detail-section="counters"]')).toBeVisible();
    await page.locator('[data-detail-section="counters"]').click();
    await expect(page.locator('#detail-section-counters')).toContainText('Counters involving King Arthur');
    await expect(page.locator('#detail-section-counters')).toContainText('This hero counters');
    await expect(page.locator('#detail-section-counters')).toContainText('This hero is countered by');
  });

  test('admin guest mode can return to admin login', async ({ page }) => {
    await openApp(page);
    await expectTab(page, '#tabOcrDashboard', '#ocrDashboardSection', '#dashLogin');

    await page.locator('#dashGuestBtn').click();
    await expect(page.locator('#dashGuestBanner')).toBeVisible();
    await expect(page.locator('#dashGuestBanner')).toContainText('Guest Mode');
    await expect(page.locator('#dashGuestAdminBtn')).toHaveText(/Log in as Admin/);
    await expect(page.locator('#dashUploadZone')).not.toBeVisible();

    await page.locator('#dashGuestAdminBtn').click();
    await expect(page.locator('#dashLogin')).toBeVisible();
    await expect(page.locator('#dashLoginPass')).toBeVisible();
    await expect(page.locator('#dashGuestBtn')).toBeVisible();
    await expect(page.locator('#dashApp')).not.toBeVisible();
    expect(await page.evaluate(() => sessionStorage.getItem('vts_guest'))).toBeNull();
  });
});
