import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

async function open(page, hash) {
  await page.addInitScript(() => {
    localStorage.setItem('vts_maintenance_bypass', '1');
    localStorage.setItem('vts_intro_v1_seen', '1');
    localStorage.setItem('vts_hero_lang', 'en');
  });
  await page.route('https://www.googletagmanager.com/**', (route) => route.abort());
  await page.goto(`/#${hash}`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).toHaveClass(/app-ready/, { timeout: 30000 });
}

for (const width of [390, 1280]) {
  test(`X12 research is selectable and all nodes are editable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await open(page, 'research');
    const season = page.locator('.tech-season-btn[data-season="X12"]');
    await expect(season).toBeVisible();
    // X12 is one of the newest three seasons, so it now arrives already
    // selected. Clicking unconditionally would deselect it and hide the very
    // trees this test is about.
    if (!(await season.evaluate((el) => el.classList.contains('active')))) {
      await season.click();
    }
    await expect(season).toHaveClass(/active/);
    for (const [id, count] of [
      ['9c5d4006', 29],
      ['b57d6bf9', 30],
    ]) {
      await page.locator(`.research-tech-card[data-tech-id="${id}"] .research-card-cta`).click();
      const dialog = page.locator('#techCalculatorContainer');
      await expect(dialog.locator('.game-tech-node-wrap')).toHaveCount(count);
      if (id === 'b57d6bf9') {
        await expect(dialog.locator('[data-research-list]')).toBeVisible();
        await expect(dialog.locator('.game-tree-connector')).toHaveCount(0);
        await expect(dialog).toContainText('layout and prerequisites are not verified');
        const last = dialog.locator('[data-node-id="node_30"]');
        await last.locator('.game-tech-tap').click();
        await expect(last.locator('.tech-node-input')).toHaveValue('1');
      } else {
        await expect(dialog).toContainText('5,065,100');
        await expect(dialog).toContainText('4,998,500');
      }
      await dialog.locator('#maxAllTechBtn').click();
      const levels = await dialog
        .locator('.tech-node-input')
        .evaluateAll((inputs) => inputs.map((input) => ({ value: input.value, max: input.max })));
      expect(levels.every(({ value, max }) => value === max)).toBe(true);
      await dialog.locator('#resetAllTechBtn').click();
      await expect(dialog.locator('.tech-node-input').first()).toHaveValue('0');
      await dialog.locator('#closeCalcBtn').click();
    }
  });

  test(`Hero Tables filters, details and local portraits work at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await open(page, 'heroes');
    // Hero Tables is an Atlas view, not a sub-tab of its own — three sibling
    // sub-tabs that all opened this panel read as three separate tools.
    const tab = page.locator('[data-atlas-mode="codex"]');
    await expect(tab).toHaveText('Hero Tables');
    await tab.click();
    await expect(page.locator('#heroAtlasTitle')).toHaveText('Hero Tables');
    const root = page.locator('#heroesTabContent');
    await expect(root.locator('[data-codex-state]')).toHaveAttribute('data-codex-state', 'ready');
    await root.locator('[data-hero-season="all"]').click();
    const season = root.locator('[data-hero-season="X12"]');
    await season.click();
    await expect(season).toBeVisible();
    await expect(season).toHaveAttribute('aria-pressed', 'false');
    await season.click();
    await expect(season).toHaveAttribute('aria-pressed', 'true');
    await root.locator('#heroesTabSearch').fill('Belisarius');
    await expect(root.locator('.heroes-count-badge')).toHaveText('1');
    const row = root.locator('[data-hero-name="Belisarius"]');
    await expect(row).toBeVisible();
    await row.scrollIntoViewIfNeeded();
    await expect
      .poll(() => row.locator('img').evaluate((img) => img.complete && img.naturalWidth > 0))
      .toBe(true);
    await row.click();
    await expect(root.locator('#hero-detail-title')).toHaveText('Belisarius');
    await expect(root.locator('#detail-section-duels')).toHaveCount(0);
    await root.locator('[data-hero-close]:visible').first().click();
    await expect(row).toBeVisible();
    await expect(row).toBeFocused();
    await root.locator('#heroesTabSearch').fill('');
    await root.locator('[data-codex-preset="paid"]').click();
    await root.locator('#heroesTabSearch').fill('Achilles');
    await expect(root.locator('[data-hero-name="Achilles"]')).toBeVisible();
    const downloadReady = page.waitForEvent('download');
    await root.locator('[data-heroes-export]').click();
    const download = await downloadReady;
    const csv = await readFile(await download.path(), 'utf8');
    expect(csv).toContain('Achilles');
    expect(csv).not.toContain('Belisarius');
    await page.screenshot({ path: `test-results/hero-tables-${width}.png`, fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true
    );
  });
}

test('research planner retains X12 level costs at the UI boundary', async ({ page }) => {
  await open(page, 'research');
  const select = page.locator('[data-pln="family"]');
  const card = page.locator('.pln-card').filter({ has: select });
  await select.selectOption('tech:b57d6bf9');
  await card.locator('[data-pln="target"]').selectOption('node_1');
  await card.locator('[data-pln="level"]').fill('1');
  await card.locator('[data-pln="compute"]').click();
  await expect(card.locator('[data-pln="results"]')).toContainText('1,300');
  await expect(card.locator('[data-pln="results"] .pln-badge-warn')).toBeVisible();
});
