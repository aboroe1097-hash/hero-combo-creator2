import { expect, test } from '@playwright/test';

function observePage(page) {
  const errors = [];
  const resourcePaths = [];

  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  page.on('pageerror', (error) => {
    errors.push(`pageerror: ${error.message}`);
  });
  page.on('request', (request) => {
    resourcePaths.push(new URL(request.url(), 'http://127.0.0.1').pathname);
  });
  page.on('requestfailed', (request) => {
    errors.push(`requestfailed: ${request.failure()?.errorText || 'unknown'} ${request.url()}`);
  });
  page.on('response', (response) => {
    if (response.status() >= 400) {
      errors.push(`response: ${response.status()} ${response.url()}`);
    }
  });

  return { errors, resourcePaths };
}

test('Specialization Towers loads publicly as an isolated eight-column tool', async ({ page }) => {
  const observed = observePage(page);
  await page.addInitScript(() => {
    localStorage.setItem('vts_maintenance_bypass', '1');
  });

  await page.goto('/specialization-towers.html', { waitUntil: 'domcontentloaded' });

  const mount = page.locator('#specializationTowersMount');
  await expect(mount).toBeVisible({ timeout: 30000 });
  await expect(page.locator('body')).not.toHaveClass(/\bis-locked\b/u);
  await expect(page.getByRole('dialog', { name: /Beta Testers Only/iu })).toHaveCount(0);

  const towerTabs = mount.locator('[data-specialization-tower-tabs]');
  await expect(towerTabs).toBeVisible();
  await expect(towerTabs.locator('button[data-specialization-tower]')).toHaveCount(3);

  const graph = mount.locator('[data-specialization-tower-graph]:visible');
  await expect(graph).toBeVisible();
  await expect(graph.locator('[data-specialization-column]')).toHaveCount(8);

  expect(
    observed.resourcePaths.filter((path) => /(?:^|\/)battle-simulator(?:[-./]|$)/u.test(path)),
    'the public specialization route must not preload protected Battle Simulator assets'
  ).toEqual([]);
  expect(observed.errors).toEqual([]);
});

test('Enhanced Tactics IV shows only evidence-backed initial node states', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('vts_maintenance_bypass', '1');
    localStorage.removeItem('vts_specialization_towers_v2');
  });
  await page.goto('/specialization-towers.html', { waitUntil: 'domcontentloaded' });

  await page.locator('[data-specialization-open-research="enhanced4"]').click();
  await expect(
    page.locator(
      '[data-specialization-inspector-panel] [data-specialization-complete-learning="enhanced4"]'
    )
  ).toBeDisabled();
  await page
    .locator('[data-specialization-inspector-panel] [data-specialization-open-node-path]')
    .click();
  const dialog = page.locator('[data-specialization-node-path-dialog]');
  await expect(dialog).toBeVisible();

  const visibleNodes = dialog.locator('[data-specialization-attribute-node]:visible');
  await expect(visibleNodes).toHaveCount(3);
  await expect(dialog.locator('[data-specialization-attribute-node="1"]')).toBeEnabled();
  await expect(dialog.locator('[data-specialization-attribute-node="12"]')).toBeEnabled();
  await expect(dialog.locator('[data-specialization-attribute-node="24"]')).toBeDisabled();
  await expect(dialog.locator('[data-specialization-attribute-node="2"]')).toHaveCount(0);
  await expect(dialog.locator('[data-specialization-hidden-node-count]')).toContainText('21');

  await dialog.locator('[data-specialization-attribute-node="1"]').click();
  const reopened = page.locator('[data-specialization-node-path-dialog]');
  await expect(reopened).toBeVisible();
  await expect(reopened.locator('[data-specialization-attribute-node="1"]')).toHaveAttribute(
    'aria-pressed',
    'true'
  );
  await expect(reopened.locator('[data-specialization-attribute-node="12"]')).toBeEnabled();
  await expect(reopened.locator('[data-specialization-attribute-node="2"]')).toHaveCount(0);
});
