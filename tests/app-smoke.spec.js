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

    await page.locator('#generatorSeasonFilters .s4-pill').click();
    await page.locator('#genSkinToggleLabel').click();
    await expect(page.locator('#genSkinToggle')).toBeChecked();

    const firstGeneratorCard = page.locator('#generatorHeroes .generator-card').first();
    await expect(firstGeneratorCard).toHaveClass(/skin-priority-card/);
    await expect(firstGeneratorCard.locator('.generator-skin-badge--priority')).toBeVisible();
    await expect(page.locator('#generatorHeroes .generator-card.skin-priority-muted').first()).toBeVisible();

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
