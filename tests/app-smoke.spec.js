import { expect, test } from '@playwright/test';

async function openApp(page) {
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

    const initialCount = await cards.count();
    await page.locator('#generatorTroopFilters .archers-pill').click();
    await expect(page.locator('#generatorTroopFilters input[value="All"]')).not.toBeChecked();
    await expect(page.locator('#generatorTroopFilters input[value="Archers"]')).toBeChecked();
    expect(await cards.count()).toBeLessThan(initialCount);

    await page.locator('#generatorSeasonFilters .s2-pill').click();
    await expect(page.locator('#generatorSeasonFilters input[value="S2"]')).toBeChecked();
    const seasonsWithS2 = await page.locator('#generatorHeroes .hero-tag').evaluateAll(nodes =>
      [...new Set(nodes.map(node => node.textContent.trim()))].sort()
    );
    expect(seasonsWithS2).toContain('S2');
  });
});
