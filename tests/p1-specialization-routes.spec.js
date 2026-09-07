import { test, expect } from '@playwright/test';

async function openTowers(page) {
  await page.route('https://www.googletagmanager.com/**', (route) => route.abort());
  await page.addInitScript(() => {
    localStorage.setItem('vts_maintenance_bypass', '1');
    localStorage.setItem('vts_intro_v1_seen', '1');
  });
  await page.goto('/specialization-towers.html', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-specialization-research]').first()).toBeVisible();
}

function routeState(page) {
  return page.evaluate(() => {
    const cards = [...document.querySelectorAll('[data-specialization-research]')];
    return {
      total: cards.length,
      withStep: cards.filter((c) => c.dataset.routeStep).length,
      next: cards
        .filter((c) => c.dataset.routeNext === 'true')
        .map((c) => c.dataset.specializationResearch),
      steps: Object.fromEntries(
        cards.map((c) => [c.dataset.specializationResearch, c.dataset.routeStep || ''])
      ),
    };
  });
}

test('easy medal fill lifts the pick-a-node gate and offers quick fills', async ({ page }) => {
  test.setTimeout(120000);
  await openTowers(page);

  // Open a research that has no nodes selected yet.
  await page.locator('[data-specialization-open-research="training1"]').first().click();
  const medalInput = page.locator('[data-specialization-recorded-medals]').first();
  await expect(medalInput).toBeVisible();

  // Strict mode: the medal field is gated behind picking a node.
  await expect(medalInput).toBeDisabled();
  await expect(page.locator('.specialization-medal-quickfill')).toHaveCount(0);

  await page.locator('[data-specialization-action="easy-medals"]').first().click();
  await expect(page.locator('[data-specialization-action="easy-medals"]').first()).toHaveAttribute(
    'aria-pressed',
    'true'
  );

  const enabledInput = page.locator('[data-specialization-recorded-medals]').first();
  await expect(enabledInput).toBeEnabled();
  await expect(page.locator('.specialization-medal-quickfill').first()).toBeVisible();

  // A quick fill writes a real medal number: Training I costs 1674, so 50% is 837.
  await page.locator('[data-specialization-medal-fill="50"]').first().click();
  await expect(page.locator('[data-specialization-recorded-medals]').first()).toHaveValue('837');

  await page.locator('[data-specialization-medal-fill="0"]').first().click();
  await expect(page.locator('[data-specialization-recorded-medals]').first()).toHaveValue('');

  // The mode survives a reload.
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-specialization-research]').first()).toBeVisible();
  await expect(page.locator('[data-specialization-action="easy-medals"]').first()).toHaveAttribute(
    'aria-pressed',
    'true'
  );
});

test('route presets annotate researches and mark the next one', async ({ page }) => {
  test.setTimeout(120000);
  await openTowers(page);

  const select = page.locator('[data-specialization-route-select]');
  await expect(select).toBeVisible();
  await expect(select).toHaveValue('');

  // No route selected: no step badges anywhere.
  const none = await routeState(page);
  expect(none.withStep, 'no annotations without a route').toBe(0);
  expect(none.next).toEqual([]);

  // Both archer community plans open on Training I.
  await select.selectOption('f2p');
  await expect(page.locator('[data-route-next="true"]')).toHaveCount(1);
  const f2p = await routeState(page);
  expect(f2p.withStep, 'every visible research is on the route').toBe(f2p.total);
  expect(f2p.steps.training1).toBe('1');
  expect(f2p.next).toEqual(['training1']);

  // The plans diverge after that: the paid-hero plan takes Call of Glory I
  // second, the F2P plan stays on the training line.
  await select.selectOption('spender');
  const spender = await routeState(page);
  expect(spender.steps.training1).toBe('1');
  expect(spender.next).toEqual(['training1']);
  expect(spender.steps.callofglory1).toBe('2');
  expect(spender.steps.callofglory1, 'the two routes really differ').not.toBe(
    f2p.steps.callofglory1
  );

  // The choice survives a reload.
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-specialization-research]').first()).toBeVisible();
  await expect(page.locator('[data-specialization-route-select]')).toHaveValue('spender');

  // Turning it off clears every annotation.
  await page.locator('[data-specialization-route-select]').selectOption('');
  const cleared = await routeState(page);
  expect(cleared.withStep).toBe(0);
  expect(cleared.next).toEqual([]);
});
