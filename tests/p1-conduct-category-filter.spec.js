import { expect, test } from '@playwright/test';

// VTS Admin > Bonus Team Effort Points: the recent adjustments list filters by
// category, together with player search.

const dash = {
  attacks: [
    {
      id: 'conduct-filter-attack',
      structure_name: 'Small Town',
      structure_level: 'Lv.1',
      game_time: '20/06/2026, 10:30',
      start_time: '10:00',
      total_demolition: 3000,
      players_count: 2,
      players: [
        { name: 'Road Runner 01', value: 2000, rank: 1 },
        { name: 'Effort Maker 01', value: 1000, rank: 2 },
      ],
    },
  ],
  players_summary: [],
};

function adjustment(id, playerName, category, points, minute) {
  return {
    id,
    season: 'season-2026',
    playerKey: playerName.toLowerCase().replaceAll(' ', ''),
    playerName,
    points,
    category,
    note: '',
    createdAt: `2026-06-20T12:${String(minute).padStart(2, '0')}:00.000Z`,
    createdBy: 'local-test-admin',
  };
}

// The same number of rows in two categories, more than one page of each.
const adjustments = [
  ...Array.from({ length: 14 }, (_, index) =>
    adjustment(
      `road-${index}`,
      `Road Runner ${String(index + 1).padStart(2, '0')}`,
      'connected_road',
      1,
      index
    )
  ),
  ...Array.from({ length: 14 }, (_, index) =>
    adjustment(
      `effort-${index}`,
      `Effort Maker ${String(index + 1).padStart(2, '0')}`,
      'extra_effort',
      1,
      20 + index
    )
  ),
];

async function openConductPanel(page, { width = 1280, height = 900, theme = 'dark' } = {}) {
  await page.setViewportSize({ width, height });
  await page.route('https://www.googletagmanager.com/**', (route) => route.abort());
  await page.addInitScript((selectedTheme) => {
    localStorage.setItem('vts_maintenance_bypass', '1');
    localStorage.setItem('vts_admin_eden_workspace', 'eden-x1');
    localStorage.setItem('vts_hero_lang', 'en');
    localStorage.setItem('vts_theme', selectedTheme);
    window.VTS_ADMIN_LOCAL_TEST_AUTH = true;
    localStorage.setItem('vts_admin_local_test_auth', '1');
  }, theme);
  await page.goto('/admin.html', { waitUntil: 'load' });
  await expect(page.locator('#dashApp')).toBeVisible({ timeout: 20000 });
  await page.waitForFunction(
    () =>
      typeof window.setOcrDashboardDataForTest === 'function' &&
      typeof window.switchDashSubtab === 'function'
  );
  await page.evaluate(
    ({ dash, adjustments }) => window.setOcrDashboardDataForTest(dash, [], adjustments),
    { dash, adjustments }
  );
  await page.evaluate(() => window.switchDashSubtab('conduct'));
  await expect(page.locator('#dashSubtabConduct')).toBeVisible();
  await expect(page.locator('#dashConductList')).toContainText('Effort Maker 14');
}

const listRows = (page) => page.locator('#dashConductList .dash-conduct-row');

test('the category filter narrows the list and combines with player search', async ({ page }) => {
  await openConductPanel(page);
  const filter = page.getByLabel('Filter by category');
  await expect(filter).toHaveValue('');

  await filter.selectOption('connected_road');
  await expect(listRows(page).first()).toContainText('Road Runner');
  await expect(page.locator('#dashConductList')).not.toContainText('Effort Maker');

  await page.locator('#dashConductSearch').fill('runner 03');
  await expect(listRows(page)).toHaveCount(1);
  await expect(listRows(page)).toContainText('Road Runner 03');

  // A filter that matches nothing says so, rather than claiming the season is empty.
  await page.locator('#dashConductSearch').fill('');
  await filter.selectOption('path_block');
  await expect(listRows(page)).toHaveCount(0);
  await expect(page.locator('#dashConductList')).toContainText(
    'No adjustments this season match these filters.'
  );
  await expect(page.locator('#dashConductList')).not.toContainText('for this season yet');

  await filter.selectOption('');
  await expect(page.locator('#dashConductList')).toContainText('Effort Maker');
});

test('switching category starts the list from its first page', async ({ page }) => {
  await openConductPanel(page);
  const filter = page.getByLabel('Filter by category');

  await filter.selectOption('connected_road');
  await expect(listRows(page)).toHaveCount(10);
  await page
    .locator('#dashConductList')
    .getByRole('button', { name: /Show all/ })
    .click();
  await expect(listRows(page)).toHaveCount(14);

  // Same row count in the next category: it still opens at the first page.
  await filter.selectOption('extra_effort');
  await expect(listRows(page).first()).toContainText('Effort Maker');
  await expect(listRows(page)).toHaveCount(10);
});

for (const theme of ['dark', 'light']) {
  test(`the category filter is a phone-sized, readable control in ${theme} mode`, async ({
    page,
  }) => {
    await openConductPanel(page, { width: 390, height: 844, theme });
    const filter = page.getByLabel('Filter by category');
    await filter.scrollIntoViewIfNeeded();
    const box = await filter.boundingBox();
    expect(box.height).toBeGreaterThanOrEqual(44);
    const fits = await page.evaluate(() => {
      const head = document.querySelector('.dash-conduct-list-head');
      const rect = head.getBoundingClientRect();
      return [...head.children].every((child) => {
        const box = child.getBoundingClientRect();
        return box.left >= rect.left - 1 && box.right <= rect.right + 1;
      });
    });
    expect(fits).toBe(true);
    const colors = await filter.evaluate((element) => {
      const style = getComputedStyle(element);
      return { color: style.color, background: style.backgroundColor };
    });
    expect(colors.color).not.toBe(colors.background);
  });
}
