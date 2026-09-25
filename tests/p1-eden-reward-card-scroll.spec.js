import { expect, test } from '@playwright/test';

// The Eden season view (eden-x2.html is the active season): a reward category
// click brings its table on screen at any width, and the final Top list names
// open the same player detail as the rest of the page.

const members = Array.from(
  { length: 30 },
  (_, index) => `Player${String(index + 1).padStart(2, '0')}`
);

const seasonFixture = {
  date: '2026-07-15',
  r5Season: 'season-2026',
  contributionRecords: [
    {
      id: 'p1-reward-card-scroll',
      date: '2026-07-15',
      premiumSlots: 20,
      entries: members.map((name, index) => ({
        rank: String(index + 1),
        name,
        guild: 'VTS X1',
        contribution: String(900000 - index * 10000),
      })),
    },
  ],
  exGuildContributions: [],
  dutyRecords: [],
  publicConductAdjustments: [],
  attacks: [
    {
      id: 'p1-reward-card-scroll-attack',
      structure_name: 'Large Town',
      structure_level: 'Lv4',
      game_time: '15/07/2026, 20:00 GT',
      total_demolition: 120000,
      players_count: 2,
      players: [
        { name: 'Player01', value: 70000, rank: 1 },
        { name: 'Player02', value: 50000, rank: 2 },
      ],
    },
  ],
};

async function openSeasonView(page, { width = 1280, height = 800 } = {}) {
  await page.setViewportSize({ width, height });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.route('https://www.googletagmanager.com/**', (route) => route.abort());
  await page.addInitScript(() => {
    window.VTS_EDEN_X1_TEST_MODE = true;
    localStorage.setItem('vts_maintenance_bypass', '1');
    localStorage.setItem('vts_hero_lang', 'en');
    localStorage.setItem('vts_theme', 'dark');
    localStorage.setItem('vts_weighted_contribution_compact', '0');
  });
  await page.goto('/eden-x2.html', { waitUntil: 'load' });
  await page.waitForFunction(
    () =>
      typeof window.setEdenX1DataForTest === 'function' &&
      document.querySelector('[data-reward-view="team"]')?.dataset.rewardBound === '1',
    null,
    { timeout: 20000 }
  );
  await page.evaluate((fixture) => window.setEdenX1DataForTest(fixture), seasonFixture);
  await expect(page.locator('body')).toHaveAttribute('data-eden-season-state', 'active');
  await expect(page.locator('[data-reward-view="contribution"]')).toBeEnabled();
  await expect(page.locator('#dashWeightedContributionPanel .eden-x1-weighted-card')).toHaveCount(
    1
  );
}

// The weighted panel can re-render while the page settles, so the card may be
// missing for a moment; report NaN then and let the polled assertions retry.
function rewardTableTop(page) {
  return page.evaluate(() => {
    const card = document.querySelector('#dashWeightedContributionPanel .eden-x1-weighted-card');
    return card ? Math.round(card.getBoundingClientRect().top) : Number.NaN;
  });
}

// Puts the category cards at `cardTop` px from the top of the viewport.
async function scrollCardsTo(page, cardTop) {
  await page.evaluate((top) => {
    const card = document.querySelector('[data-reward-view="contribution"]');
    window.scrollTo(0, window.scrollY + card.getBoundingClientRect().top - top);
  }, cardTop);
}

test('a category click on a desktop scrolls the table on screen when it is below the fold', async ({
  page,
}) => {
  await openSeasonView(page);
  const viewport = page.viewportSize();
  // Cards near the bottom, table below the fold: the old 768px width test
  // left a desktop click here looking like it did nothing.
  await expect(async () => {
    await scrollCardsTo(page, viewport.height - 180);
    expect(await rewardTableTop(page)).toBeGreaterThan(viewport.height - 120);
  }).toPass({ timeout: 5000 });

  await page.locator('[data-reward-view="contribution"]').click();
  await expect(page.locator('[data-reward-view="contribution"]')).toHaveAttribute(
    'aria-pressed',
    'true'
  );
  await expect.poll(() => rewardTableTop(page)).toBeGreaterThanOrEqual(0);
  await expect.poll(() => rewardTableTop(page)).toBeLessThan(120);

  // The category that is already showing still takes you to its table.
  // The first click's scroll can still be settling; retry the reset until the
  // page really rests at the top with the table below the fold.
  await expect(async () => {
    await page.evaluate(() => window.scrollTo(0, 0));
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    expect(await rewardTableTop(page)).toBeGreaterThan(viewport.height);
  }).toPass({ timeout: 5000 });
  await page.locator('[data-reward-view="contribution"]').click();
  await expect.poll(() => rewardTableTop(page)).toBeLessThan(120);
  await expect.poll(() => rewardTableTop(page)).toBeGreaterThanOrEqual(0);
});

test('a category click leaves the page still when the table is already on screen', async ({
  page,
}) => {
  await openSeasonView(page);
  await expect(async () => {
    await scrollCardsTo(page, 40);
    expect(await rewardTableTop(page)).toBeLessThan(page.viewportSize().height - 120);
  }).toPass({ timeout: 5000 });
  const scrollBefore = await page.evaluate(() => window.scrollY);

  await page.locator('[data-reward-view="support"]').click();
  await expect(page.locator('[data-reward-view="support"]')).toHaveAttribute(
    'aria-pressed',
    'true'
  );
  await page.waitForTimeout(1200);
  expect(await page.evaluate(() => window.scrollY)).toBe(scrollBefore);
});

test('final Top list names open the player detail with a phone-sized target', async ({ page }) => {
  await openSeasonView(page, { width: 390, height: 844 });
  await page.locator('[data-reward-view="announcement"]').click();
  const table = page.locator('.eden-x1-announcement-table');
  await expect(table).toBeVisible();

  // Unfilled quota slots stay plain text.
  const placeholderCells = table.locator('tbody td:nth-child(2)', { hasText: 'TBA' });
  expect(await placeholderCells.count()).toBeGreaterThan(0);
  await expect(placeholderCells.locator('button')).toHaveCount(0);

  const name = table.getByRole('button', { name: /Player01/ });
  await expect(name).toHaveCount(1);
  const box = await name.boundingBox();
  expect(box.height).toBeGreaterThanOrEqual(44);

  await name.click();
  await expect(page.locator('#edenX1PublicModal')).toHaveClass(/active/);
  await expect(page.locator('#edenX1PublicModalTitle')).toContainText('Player01');

  // The downloaded image is a poster: names keep no link underline there.
  const exportDecoration = await page.evaluate(() => {
    const card = document.querySelector('#edenX1FinalRewardsCard');
    const clone = card.cloneNode(true);
    clone.removeAttribute('id');
    clone.classList.add('eden-x1-announcement-export');
    document.body.appendChild(clone);
    const line = getComputedStyle(
      clone.querySelector('.eden-x1-clickable-name')
    ).textDecorationLine;
    clone.remove();
    return line;
  });
  expect(exportDecoration).toBe('none');
});
