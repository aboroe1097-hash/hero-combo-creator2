import { expect, test } from '@playwright/test';

// The live Combos ranking (js/combos-live.js). Firestore is stubbed: the player
// app takes its published document from the localhost-only test hook, and the
// admin page publishes into the dashboard's local test Firestore, so nothing here
// touches the real backend.

const HEROES = [
  'Beowulf',
  'Ramses II',
  'Theodora',
  'King Arthur',
  'The Brave',
  'Al Fatih',
  'Rozen Blade',
  'Caesar',
  'ELK',
  'Isabella I',
  'Genghis Khan',
  'William the Conqueror',
];

test.use({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });

async function firstCardHeroes(page) {
  return page
    .locator('#generatorResults .generated-combo-card')
    .first()
    .locator('.gen-combo-slot-label')
    .allInnerTexts();
}

test('the Generator ranks with a published list, and refreshes results already on screen', async ({
  page,
}) => {
  await page.route('https://www.googletagmanager.com/**', (route) => route.abort());
  await page.addInitScript(() => {
    localStorage.setItem('vts_maintenance_bypass', '1');
    localStorage.setItem('vts_intro_v1_seen', '1');
    localStorage.removeItem('vts_generator_selection_v1');
    localStorage.removeItem('vts_combos_live_v1');
    // The published document arrives when the test releases it.
    let release;
    const published = new Promise((resolve) => (release = resolve));
    window.__releaseCombosDoc = (doc) => release(doc);
    window.VTS_COMBOS_LIVE_TEST_DOC = () => published;
  });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).toHaveClass(/app-ready/, { timeout: 30000 });

  await page.locator('#genClearAllBtn').click();
  await page.locator('#generatorSeasonFilters input').evaluateAll((inputs) => {
    inputs.forEach((input) => (input.checked = true));
    inputs[0]?.dispatchEvent(new Event('change', { bubbles: true }));
  });
  for (const name of HEROES) {
    const card = page.locator(`#generatorHeroes .generator-card[data-hero-name="${name}"]`);
    if ((await card.getAttribute('aria-pressed')) !== 'true') await card.click();
  }
  await page.locator('#generateCombosBtn').click();
  await expect(page.locator('#generatorResults .generated-combo-card').first()).toBeVisible();
  const shippedFirst = await firstCardHeroes(page);

  // Publish the shipped list reversed, and work out what the Generator must show.
  const expected = await page.evaluate(async (heroes) => {
    const db = await import('/js/combos-db.js');
    const live = await import('/js/combos-live.js');
    const reversed = db.shippedRankedCombos
      .map((combo) => ({ ...combo, heroes: [...combo.heroes] }))
      .reverse();
    const doc = { ...live.buildCombosPlanDoc(reversed), updatedAt: new Date(), updatedBy: 'x' };
    const best = db.selectNonOverlappingCombos(
      db.filterCombosForSkinMode(reversed, false),
      heroes,
      5
    );
    window.__combosUpdates = [];
    window.addEventListener('combos:updated', (event) => window.__combosUpdates.push(event.detail));
    window.__releaseCombosDoc(doc);
    return { first: best[0].heroes, top: reversed[0].heroes };
  }, HEROES);
  expect(expected.first).not.toEqual(shippedFirst);

  await expect.poll(() => page.evaluate(() => window.__combosUpdates.length)).toBe(1);
  expect(await page.evaluate(() => window.__combosUpdates[0].source)).toBe('published');
  await expect.poll(() => firstCardHeroes(page)).toEqual(expected.first);
  // The one shared array every consumer reads now holds the published order…
  expect(
    await page.evaluate(async () => (await import('/js/combos-db.js')).rankedCombos[0].heroes)
  ).toEqual(expected.top);
  // …and the valid list is cached for the next visit.
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem('vts_combos_live_v1')).entries.length)
  ).toBeGreaterThan(200);
});

test('a published list with a bad entry leaves the shipped ranking in place', async ({ page }) => {
  await page.route('https://www.googletagmanager.com/**', (route) => route.abort());
  await page.addInitScript(() => {
    localStorage.setItem('vts_maintenance_bypass', '1');
    localStorage.setItem('vts_intro_v1_seen', '1');
    localStorage.removeItem('vts_combos_live_v1');
    window.VTS_COMBOS_LIVE_TEST_DOC = {
      entries: [{ heroes: ['Nobody', 'Lawman', 'Bjorn'] }],
      count: 1,
      shippedHash: 'x',
      useShipped: false,
    };
  });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).toHaveClass(/app-ready/, { timeout: 30000 });
  // Give the idle loader time to run, then check nothing changed.
  await page.waitForTimeout(3000);
  const state = await page.evaluate(async () => {
    const db = await import('/js/combos-db.js');
    const live = await import('/js/combos-live.js');
    return {
      same: live.combosHash(db.rankedCombos) === live.shippedCombosHash(),
      cached: localStorage.getItem('vts_combos_live_v1'),
    };
  });
  expect(state).toEqual({ same: true, cached: null });
});

test('a superadmin publishes from the admin planner, and can go back to the shipped list', async ({
  page,
}) => {
  await page.route('https://www.googletagmanager.com/**', (route) => route.abort());
  await page.route(/static\.wixstatic\.com|i\.ibb\.co|workers\.dev/, (route) => route.abort());
  await page.addInitScript(() => {
    window.VTS_ADMIN_LOCAL_TEST_AUTH = true;
    localStorage.setItem('vts_admin_local_test_auth', '1');
    localStorage.setItem('vts_maintenance_bypass', '1');
    localStorage.setItem('vts_hero_lang', 'en');
  });
  await page.goto('/admin.html', { waitUntil: 'load' });
  await expect(page.locator('#dashApp')).toBeVisible({ timeout: 30000 });
  await page.waitForFunction(() => typeof window.switchDashSubtab === 'function');
  await page.evaluate(() => window.switchDashSubtab('combos'));
  const tool = page.locator('#dashCombosRoot');
  const live = tool.locator('#cp-liveText');
  await expect(live).toHaveText('Live: shipped file');
  await expect(tool.locator('#cp-publishBtn')).toBeVisible();

  // The shipped list arrives fully planned, so the tray opens empty. View the
  // placed lanes, unplace one, and let the draft fill the gap again.
  await tool.locator('[data-tray="placed"]').click();
  await expect(tool.locator('.qrow').first()).toBeVisible({ timeout: 30000 });
  await tool.locator('.qrow [data-unplace]').first().click();

  await tool.locator('#cp-autoDraft').click();
  await tool.locator('#cp-publishBtn').click();
  await expect(tool.locator('#cp-summaryTitle')).toHaveText('Publish this ranking live?');
  // Every shipped lane is placed, so re-drafting the unplaced one reads as a move.
  await expect(tool.locator('#cp-summaryText')).toContainText(
    '1 moved compared with the shipped combos-db.js'
  );
  await tool.locator('#cp-summarySave').click();
  await expect(tool.locator('#cp-status')).toContainText('lineups live');
  await expect(live).toContainText(/Live: published .* by you \(\d+ lineups\)/);
  await expect(tool.locator('#cp-liveNote')).toBeVisible();

  await tool.locator('#cp-useShippedBtn').click();
  await expect(tool.locator('#cp-summaryTitle')).toHaveText('Go back to the shipped list?');
  await tool.locator('#cp-summarySave').click();
  await expect(live).toHaveText('Live: shipped file');
  await expect(tool.locator('#cp-liveNote')).toBeHidden();
});
