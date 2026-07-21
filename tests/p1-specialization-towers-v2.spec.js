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

async function expectHeaderMetadataVisible(page) {
  const badges = page.locator(
    '.specialization-header__meta > span:not(.specialization-meta-separator)'
  );
  await expect(badges).toHaveCount(2);
  expect(
    await badges.evaluateAll((elements) =>
      elements.every((element) => {
        const bounds = element.getBoundingClientRect();
        return (
          bounds.left >= -1 &&
          bounds.right <= document.documentElement.clientWidth + 1 &&
          element.scrollWidth <= element.clientWidth + 1
        );
      })
    )
  ).toBe(true);
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

test('Enhanced Tactics IV exposes the complete public 24-node catalog', async ({ page }) => {
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
  ).toBeEnabled();
  await page
    .locator('[data-specialization-inspector-panel] [data-specialization-open-node-path]')
    .click();
  const dialog = page.locator('[data-specialization-node-path-dialog]');
  await expect(dialog).toBeVisible();

  const visibleNodes = dialog.locator('[data-specialization-attribute-node]:visible');
  await expect(visibleNodes).toHaveCount(24);
  await expect(dialog.locator('[data-specialization-attribute-node="1"]')).toBeEnabled();
  await expect(dialog.locator('[data-specialization-attribute-node="12"]')).toBeEnabled();
  await expect(dialog.locator('[data-specialization-attribute-node="24"]')).toBeEnabled();
  await expect(dialog.locator('[data-specialization-attribute-node="2"]')).toBeEnabled();
  await expect(dialog.locator('[data-specialization-hidden-node-count]')).toHaveCount(0);
  await expect(dialog).toContainText('Defense Plan');
  await expect(dialog).toContainText('Siege Plan');
  await expect(dialog).toContainText('Swirling Wind');

  await dialog.locator('[data-specialization-attribute-node="1"]').click();
  const reopened = page.locator('[data-specialization-node-path-dialog]');
  await expect(reopened).toBeVisible();
  await expect(reopened.locator('[data-specialization-attribute-node="1"]')).toHaveAttribute(
    'aria-pressed',
    'true'
  );
  await expect(reopened.locator('[data-specialization-attribute-node="2"]')).toBeEnabled();
  await expect(reopened.locator('[data-specialization-attribute-node="12"]')).toBeEnabled();
});

for (const viewport of [
  { width: 375, height: 812 },
  { width: 390, height: 844 },
]) {
  test(`${viewport.width}px phone keeps tower state and milestone copy reachable`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.addInitScript(() => {
      localStorage.setItem('vts_maintenance_bypass', '1');
      localStorage.removeItem('vts_specialization_towers_v2');
      localStorage.removeItem('vts_specialization_towers_v2_active_tower');
    });
    await page.goto('/specialization-towers.html', { waitUntil: 'domcontentloaded' });

    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth
      )
    ).toBe(true);
    await expectHeaderMetadataVisible(page);
    expect(
      await page
        .locator('.specialization-summary')
        .evaluate(
          (element) => getComputedStyle(element).gridTemplateColumns.trim().split(/\s+/u).length
        )
    ).toBe(3);

    const tabs = page.locator('[data-specialization-tower-tabs]');
    const footman = tabs.locator('[data-specialization-tower="footman"]');
    await footman.click();
    const selectedFootman = tabs.locator(
      '[data-specialization-tower="footman"][aria-selected="true"]'
    );
    await expect(selectedFootman).toBeVisible();
    expect(
      await selectedFootman.evaluate((element) => {
        const item = element.getBoundingClientRect();
        const list = element.parentElement.getBoundingClientRect();
        return item.left >= list.left - 1 && item.right <= list.right + 1;
      })
    ).toBe(true);

    if (viewport.width === 390) {
      await page.locator('[data-specialization-language-select]').selectOption('ar');
      await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
      await expectHeaderMetadataVisible(page);
      for (const scroller of [page.locator('.specialization-toolbar'), tabs]) {
        expect(await scroller.evaluate((element) => getComputedStyle(element).maskImage)).toMatch(
          /270deg/u
        );
      }
      await expect(page.locator('[data-specialization-column-position-label]')).toHaveText(
        /\p{Script=Arabic}/u
      );
      await expect(page.locator('[data-specialization-column-position-label]')).not.toContainText(
        'Column'
      );
      await tabs.locator('[data-specialization-tower="archer"]').click();
      await tabs.locator('[data-specialization-tower="footman"]').click();
      expect(
        await selectedFootman.evaluate((element) => {
          const item = element.getBoundingClientRect();
          const list = element.parentElement.getBoundingClientRect();
          return item.left >= list.left - 1 && item.right <= list.right + 1;
        })
      ).toBe(true);
      await page.locator('[data-specialization-language-select]').selectOption('en');
      await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    }

    await page.locator('[data-specialization-open-research="training1"]').click();
    const inspector = page.locator('[data-specialization-inspector]');
    await expect(inspector).toBeVisible();
    const milestoneValues = inspector.locator('.specialization-milestone-value');
    await expect(milestoneValues).toHaveCount(4);
    expect(
      await milestoneValues.evaluateAll((elements) =>
        elements.every(
          (element) =>
            element.scrollWidth <= element.clientWidth + 1 &&
            element.closest('[data-specialization-milestone]').scrollWidth <=
              element.closest('[data-specialization-milestone]').clientWidth + 1
        )
      )
    ).toBe(true);

    await inspector.locator('[data-specialization-open-node-path]').click();
    const pathDialog = page.locator('[data-specialization-node-path-dialog]');
    const firstNode = pathDialog.locator('[data-specialization-attribute-node]').first();
    const nodeBox = await firstNode.boundingBox();
    expect(nodeBox?.width ?? 0).toBeGreaterThanOrEqual(44);
    expect(nodeBox?.height ?? 0).toBeGreaterThanOrEqual(44);
    await firstNode.click();
    await pathDialog.locator('[data-specialization-close-dialog="node-path"]').first().click();
    await inspector.locator('[data-specialization-close-inspector]').click();

    expect(
      await selectedFootman.evaluate((element) => {
        const item = element.getBoundingClientRect();
        const list = element.parentElement.getBoundingClientRect();
        return item.left >= list.left - 1 && item.right <= list.right + 1;
      })
    ).toBe(true);

    const graph = page.locator('[data-specialization-tower-graph]:visible');
    await graph.evaluate((element) =>
      element.scrollTo({ left: element.scrollWidth, behavior: 'auto' })
    );
    await expect(page.locator('[data-specialization-column-position]')).toHaveText(
      /Current tower progress \u00b7 8 of 8/u
    );
    expect(
      await graph.locator('[data-specialization-column="8"]').evaluate((element) => {
        const column = element.getBoundingClientRect();
        const scroller = element
          .closest('[data-specialization-tower-graph]')
          .getBoundingClientRect();
        return column.left >= scroller.left - 1 && column.right <= scroller.right + 1;
      })
    ).toBe(true);
  });
}

test('375px Escape closes the mobile inspector and restores its exact opener', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.addInitScript(() => {
    localStorage.setItem('vts_maintenance_bypass', '1');
    localStorage.removeItem('vts_specialization_towers_v2');
  });
  await page.goto('/specialization-towers.html', { waitUntil: 'domcontentloaded' });

  const opener = page.locator('[data-specialization-open-research="training1"]');
  await opener.click();
  const inspector = page.locator('[data-specialization-inspector]');
  await expect(inspector).toBeVisible();

  await page.keyboard.press('Escape');

  await expect(inspector).not.toBeVisible();
  await expect(opener).toBeFocused();
});

test('375px medal modal preserves graph, scroll, focus, and summary after commit', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.addInitScript(() => {
    localStorage.setItem('vts_maintenance_bypass', '1');
    localStorage.removeItem('vts_specialization_towers_v2');
  });
  await page.goto('/specialization-towers.html', { waitUntil: 'domcontentloaded' });

  const graph = page.locator('[data-specialization-tower-graph]:visible');
  await graph.evaluate((element) => {
    element.scrollLeft = Math.min(180, element.scrollWidth - element.clientWidth);
  });
  const graphScrollBefore = await graph.evaluate((element) => element.scrollLeft);

  await page.locator('[data-specialization-open-research="training1"]').click();
  const inspector = page.locator('[data-specialization-inspector]');
  const medalInput = inspector.locator('[data-specialization-recorded-medals]');
  await expect(medalInput).toBeDisabled();
  await expect(inspector).toContainText('Select at least one node before adding medals.');
  await expect(medalInput).toHaveAttribute('aria-describedby', /recorded-medals-help/u);

  await inspector.locator('[data-specialization-open-node-path]').click();
  const pathDialog = page.locator('[data-specialization-node-path-dialog]');
  await pathDialog.locator('[data-specialization-attribute-node]').first().click();
  await pathDialog.locator('[data-specialization-close-dialog="node-path"]').first().click();
  await expect(medalInput).toBeEnabled();

  await page.setViewportSize({ width: 375, height: 500 });
  const modalContent = inspector.locator('[data-specialization-modal-inspector-content]');
  await modalContent.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  const inspectorScrollBefore = await modalContent.evaluate((element) => element.scrollTop);
  await medalInput.focus();
  await medalInput.fill('1');
  await medalInput.blur();

  await expect(inspector).toBeVisible();
  await expect(medalInput).toBeVisible();
  await expect(medalInput).toBeFocused();
  await expect(page.locator('[data-summary="medals"]')).toHaveText(/^1\s*\//u);
  const inspectorScrollAfter = await modalContent.evaluate((element) => element.scrollTop);
  expect(inspectorScrollAfter).toBeGreaterThanOrEqual(Math.max(0, inspectorScrollBefore - 2));
  expect(
    Math.abs((await graph.evaluate((element) => element.scrollLeft)) - graphScrollBefore)
  ).toBeLessThanOrEqual(2);
});

test('768px toolbar, targets, and native modal stay reachable without page overflow', async ({
  page,
}) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.addInitScript(() => {
    localStorage.setItem('vts_maintenance_bypass', '1');
    localStorage.removeItem('vts_specialization_towers_v2');
  });
  await page.goto('/specialization-towers.html', { waitUntil: 'domcontentloaded' });

  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth
    )
  ).toBe(true);

  const toolbar = page.locator('.specialization-toolbar');
  const undo = toolbar.locator('[data-specialization-action="undo"]');
  expect(
    await undo.evaluate((element) => {
      const item = element.getBoundingClientRect();
      const scroller = element.closest('.specialization-toolbar').getBoundingClientRect();
      return item.left >= scroller.left - 1 && item.right <= scroller.right + 1;
    })
  ).toBe(true);
  await toolbar.evaluate((element) => {
    element.scrollLeft = element.scrollWidth;
  });
  const lastControl = toolbar.locator('[data-specialization-language-select]');
  expect(
    await lastControl.evaluate((element) => {
      const item = element.getBoundingClientRect();
      const scroller = element.closest('.specialization-toolbar').getBoundingClientRect();
      return item.left >= scroller.left - 1 && item.right <= scroller.right + 1;
    })
  ).toBe(true);

  for (const control of [
    page.locator('.specialization-brand'),
    page.locator('[data-specialization-theme-toggle]'),
    page.locator('.specialization-source-notes a'),
    page.locator('[data-specialization-open-research]').first(),
  ]) {
    const box = await control.boundingBox();
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  }

  await page.locator('[data-specialization-open-research="training1"]').click();
  const inspector = page.locator('[data-specialization-inspector]');
  await expect(inspector).toBeVisible();
  expect(
    await inspector
      .locator('.specialization-inspector-inner')
      .evaluate(
        (element) => getComputedStyle(element).gridTemplateColumns.trim().split(/\s+/u).length
      )
  ).toBe(1);
  await inspector.locator('[data-specialization-close-inspector]').click();

  const graph = page.locator('[data-specialization-tower-graph]:visible');
  await graph.evaluate((element) =>
    element.scrollTo({ left: element.scrollWidth, behavior: 'auto' })
  );
  await expect(page.locator('[data-specialization-column-position]')).toHaveText(
    /Current tower progress \u00b7 8 of 8/u
  );
  expect(
    await graph.locator('[data-specialization-column="8"]').evaluate((element) => {
      const column = element.getBoundingClientRect();
      const scroller = element.closest('[data-specialization-tower-graph]').getBoundingClientRect();
      return column.left >= scroller.left - 1 && column.right <= scroller.right + 1;
    })
  ).toBe(true);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth
    )
  ).toBe(true);
});
