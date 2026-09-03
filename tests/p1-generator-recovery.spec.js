import { expect, test } from '@playwright/test';

const ZERO_RESULT_HEROES = [
  'King Arthur',
  'The Brave',
  'Al Fatih',
  'Rozen Blade',
  'Caesar',
  'ELK',
  'Isabella I',
  'Genghis Khan',
  'William the Conqueror',
  "Heaven's Justice",
  'The Boneless',
  'Jiguang Qi',
];

const VALID_RESULT_HEROES = ['Beowulf', 'Ramses II', 'Theodora', ...ZERO_RESULT_HEROES.slice(0, 9)];

async function enableAllGeneratorSeasons(page) {
  const inputs = page.locator('#generatorSeasonFilters input');
  await inputs.evaluateAll((seasonInputs) => {
    seasonInputs.forEach((input) => {
      input.checked = true;
    });
    seasonInputs[0]?.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await expect(inputs).toHaveCount(10);
  expect(
    await inputs.evaluateAll((seasonInputs) => seasonInputs.every((input) => input.checked))
  ).toBe(true);
}

async function selectHeroes(page, names) {
  for (const name of names) {
    const card = page.locator(
      `#generatorHeroes .generator-card[data-hero-name="${name.replaceAll('"', '\\"')}"]`
    );
    await expect(card).toBeVisible();
    if ((await card.getAttribute('aria-pressed')) !== 'true') await card.click();
  }
}

async function seedStaleResult(page) {
  await page.locator('#genClearAllBtn').click();
  await enableAllGeneratorSeasons(page);
  await selectHeroes(page, VALID_RESULT_HEROES);
  const mutationCount = await page.evaluate(() => window.__generatorStatusMutations.length);
  await page.locator('#generateCombosBtn').click();
  await expect(page.locator('#generatorResults .generated-combo-card').first()).toBeVisible();
  await expect(page.locator('#downloadGeneratorBtn')).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => window.__generatorStatusMutations.length))
    .toBe(mutationCount + 1);
}

async function expectZeroRecovery(page, mode, previousMutationCount) {
  await expect(page.locator('#generatorRunStatus')).toHaveText('Found 0 combos');
  await expect
    .poll(() => page.evaluate(() => window.__generatorStatusMutations.length))
    .toBe(previousMutationCount + 1);
  await expect(page.locator('#generatorResults [role="status"]')).toHaveCount(0);
  await expect(page.locator('#generatorResults .generated-combo-card')).toHaveCount(0);
  await expect(page.locator('#downloadGeneratorBtn')).toBeHidden();
  await expect(page.locator('#generatorResults .generator-recovery-state')).toContainText(
    'No ranked combos found.'
  );
  await expect(page.locator('#generatorResults')).toBeFocused();

  const exportedCount = await page.evaluate(
    async () => (await import('/js/app-generator.js')).lastGeneratedCombos.length
  );
  expect(exportedCount, `${mode} should clear the authoritative export array`).toBe(0);

  const resultScroll = await page.evaluate(() =>
    window.__generatorScrollCalls.filter((call) => call.id === 'generatorResults').at(-1)
  );
  expect(resultScroll?.options?.behavior).toBe('auto');
  expect(
    await page.evaluate(
      () => window.__generatorStatusNode === document.querySelector('#generatorRunStatus')
    )
  ).toBe(true);
}

test.use({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });

test('Generator keeps one mounted live status across Best and Surprise zero-result recovery', async ({
  page,
}) => {
  await page.route('https://www.googletagmanager.com/**', (route) => route.abort());
  await page.addInitScript(() => {
    localStorage.setItem('vts_maintenance_bypass', '1');
    localStorage.setItem('vts_intro_v1_seen', '1');
    localStorage.removeItem('vts_generator_selection_v1');
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).toHaveClass(/app-ready/, { timeout: 30000 });
  expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(
    true
  );

  const liveStatus = page.locator('#generatorRunStatus');
  await expect(liveStatus).toHaveCount(1);
  await expect(liveStatus).toHaveText('');
  await expect(liveStatus).toHaveAttribute('role', 'status');
  await expect(liveStatus).toHaveAttribute('aria-live', 'polite');
  await expect(liveStatus).toHaveAttribute('aria-atomic', 'true');
  expect(await liveStatus.evaluate((node) => node.closest('#generatorResults') === null)).toBe(
    true
  );

  await page.evaluate(() => {
    const status = document.querySelector('#generatorRunStatus');
    window.__generatorStatusNode = status;
    window.__generatorStatusMutations = [];
    new MutationObserver((records) => {
      records.forEach(() => window.__generatorStatusMutations.push(status.textContent));
    }).observe(status, { childList: true, characterData: true, subtree: true });

    window.__generatorScrollCalls = [];
    const originalScrollIntoView = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = function (options) {
      window.__generatorScrollCalls.push({ id: this.id, options });
      return originalScrollIntoView?.call(this, options);
    };
  });

  await seedStaleResult(page);
  await page.locator('#genClearAllBtn').click();
  await enableAllGeneratorSeasons(page);
  await selectHeroes(page, ZERO_RESULT_HEROES);
  let mutationCount = await page.evaluate(() => window.__generatorStatusMutations.length);
  await page.locator('#generateCombosBtn').click();
  await expectZeroRecovery(page, 'Best', mutationCount);

  await page.locator('#generatorResults .generator-recovery-state button').click();
  const focusedHero = await page.evaluate(() =>
    document.activeElement?.getAttribute('data-hero-name')
  );
  expect(ZERO_RESULT_HEROES).toContain(focusedHero);

  await seedStaleResult(page);
  await page.locator('#genClearAllBtn').click();
  await enableAllGeneratorSeasons(page);
  await selectHeroes(page, ZERO_RESULT_HEROES);
  mutationCount = await page.evaluate(() => window.__generatorStatusMutations.length);
  await page.locator('#generateRandomBtn').click();
  await expectZeroRecovery(page, 'Surprise Me', mutationCount);
});
