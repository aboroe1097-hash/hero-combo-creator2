import { test, expect } from '@playwright/test';

// The Specialization tab is the full in-tab tool again. These pin the two features that
// were ported onto it from the standalone planner, so a future "thin tab" change cannot
// silently drop them.

async function openTab(page) {
  await page.route('https://www.googletagmanager.com/**', (route) => route.abort());
  await page.addInitScript(() => {
    localStorage.setItem('vts_maintenance_bypass', '1');
    localStorage.setItem('vts_intro_v1_seen', '1');
  });
  await page.goto('/?tab=specialization#specialization', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#specializationToolRoot .spec-tool')).toBeVisible({ timeout: 30000 });
}

test('the tab renders the real tool, not a link-out card', async ({ page }) => {
  test.slow();
  await openTab(page);

  await expect(page.locator('.spec-planner-card')).toHaveCount(0);
  await expect(page.locator('[data-spec-research]').first()).toBeVisible();
  expect(await page.locator('[data-spec-research]').count()).toBe(32);
});

test('the path planner numbers every badge and marks the next research', async ({ page }) => {
  test.slow();
  await openTab(page);

  // The Route dropdown is gone: the tab always shows a path now, chosen with the
  // siege/field toggle and a hero preset, so a step number is never absent.
  await expect(page.locator('[data-spec-route-select]')).toHaveCount(0);
  const planner = page.locator('[data-spec-hero-plan]');
  await expect(planner).toBeVisible();
  await expect(page.locator('[data-route-next="true"]')).toHaveCount(1);
  await expect(page.locator('.spec-badge-wrap[data-route-step="1"]')).toHaveCount(1);

  // The decision card summarizes the current answer and updates live: it names
  // the next research with its step position, and flips its mode cell when the
  // path basis changes.
  const decision = page.locator('[data-spec-path-decision]');
  await expect(decision).toBeVisible();
  await expect(decision).toContainText(/Step \d+ of 32/);
  await expect(decision).toContainText('Siege / Rally');

  const stepFor = (research) =>
    page
      .locator(`.spec-badge-wrap:has([data-spec-research="${research}"])`)
      .getAttribute('data-route-step');

  const siege = page.locator('[data-spec-plan-mode="siege"]');
  const field = page.locator('[data-spec-plan-mode="nonSiege"]');
  await expect(siege).toHaveAttribute('aria-checked', 'true');
  const siegeSiege1 = await stepFor('siege1');

  // Switching path must reorder the badges — that is the whole point of having
  // two paths rather than one.
  await field.click();
  await expect(field).toHaveAttribute('aria-checked', 'true');
  await expect(decision).toContainText('Field (Non-Siege)');
  const fieldSiege1 = await stepFor('siege1');
  expect(Number(siegeSiege1)).toBeLessThan(Number(fieldSiege1));

  // Owning a paid archer re-sorts the path and selects its preset.
  await page.locator('[data-spec-path-hero="Ramses II"]').click();
  await expect(page.locator('[data-spec-path-hero="Ramses II"]')).toHaveAttribute(
    'aria-pressed',
    'true'
  );
  await expect(page.locator('.spec-path-card.is-active')).toContainText('Fatal Blow');
  await expect(decision).toContainText('1/3 owned');

  // Hero synergies stay behind a collapsed disclosure: the long mechanic notes
  // appear only after expanding it, and then show the full explanation.
  const synergies = page.locator('[data-spec-synergies]');
  await expect(synergies).toHaveCount(1);
  await expect(synergies).not.toHaveAttribute('open', '');
  await expect(synergies.locator('.spec-synergy-note')).toBeHidden();
  await synergies.locator('summary').click();
  await expect(synergies.locator('.spec-synergy-note').first()).toBeVisible();
  await expect(synergies.locator('.spec-synergy-mechanic').first()).toContainText('Fatal Blow');
  await expect(synergies.locator('.spec-synergy-note').first()).toContainText('Sniper Archer');
});

test('easy medal fill offers quick fills inside the tab', async ({ page }) => {
  test.slow();
  await openTab(page);

  await expect(page.locator('[data-spec-medal-fill]')).toHaveCount(0);
  await page.locator('[data-spec-easy-medals]').click();
  await expect(page.locator('[data-spec-easy-medals]')).toHaveAttribute('aria-pressed', 'true');

  // Training I costs 1674 medals, so a 50% fill records 837.
  await page.locator('[data-spec-research="training1"]').click();
  await page.locator('[data-spec-medal-fill="50"]').click();
  await expect(page.locator('[data-spec-medals]')).toHaveValue('837');

  await page.locator('[data-spec-medal-fill="0"]').click();
  await expect(page.locator('[data-spec-medals]')).toHaveValue('');
});
