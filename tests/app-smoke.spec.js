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
});
