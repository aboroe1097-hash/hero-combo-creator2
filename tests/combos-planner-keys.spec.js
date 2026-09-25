import { expect, test } from '@playwright/test';

// The local Combos planner, driven from the keyboard the way the owner works a
// season's queue: J to pick a lineup, Enter to accept its suggestion, Z to undo,
// Ctrl+S to review. The review dialog is always cancelled, so js/combos-db.js is
// never written.

const placed = async (page) => {
  const text = await page.locator('#cp-progress').innerText();
  const [done, total] = text.match(/(\d+)\/(\d+)/).slice(1).map(Number);
  return { done, total };
};

test.beforeEach(async ({ page }) => {
  // Portraits and fonts come from other hosts; the tool does not need them here.
  await page.route(/fonts\.googleapis|fonts\.gstatic|static\.wixstatic\.com|i\.ibb\.co/, (r) =>
    r.abort()
  );
  await page.goto('/');
  await expect(page.locator('#cp-cards .qrow').first()).toBeVisible();
  await expect(page.locator('#cp-status')).not.toHaveText(/Loading/);
});

test('J then Enter places a lineup at its suggestion, Z undoes it, Ctrl+S shows the summary', async ({
  page,
}) => {
  const before = await placed(page);
  expect(before.total).toBeGreaterThan(0);
  // Compact rows by default: about 29px, so thirty fit on a laptop screen.
  const rowHeight = await page
    .locator('#cp-list .row')
    .first()
    .evaluate((el) => el.getBoundingClientRect().height);
  expect(rowHeight).toBeLessThanOrEqual(31);

  await page.keyboard.press('j');
  const bar = page.locator('#cp-focusBar');
  await expect(bar).toContainText('suggested');
  const who = (await bar.locator('.who').innerText()).replace(/\s+/g, ' ').trim();

  await page.keyboard.press('Enter');
  await expect(page.locator('#cp-status')).toContainText('Placed');
  expect((await placed(page)).done).toBe(before.done + 1);
  const row = page.locator('#cp-list .row.x8.current');
  await expect(row).toHaveCount(1);
  expect((await row.locator('.lineup').innerText()).replace(/\s+/g, ' ').trim()).toBe(who);
  await expect(page.locator('#cp-dirty')).toBeVisible();

  await page.keyboard.press('z');
  expect((await placed(page)).done).toBe(before.done);
  await expect(page.locator('#cp-list .row.x8.current')).toHaveCount(0);
  await expect(page.locator('#cp-dirty')).toBeHidden();

  await page.keyboard.press('Shift+Z');
  expect((await placed(page)).done).toBe(before.done + 1);

  await page.keyboard.press('Control+s');
  const dialog = page.locator('#cp-summary');
  await expect(dialog).toBeVisible();
  await expect(page.locator('#cp-summaryText')).toContainText('1 placed');
  await expect(page.locator('#cp-summaryLines li')).toHaveCount(1);
  await expect(page.locator('#cp-summaryLines li')).toContainText('{ heroes: [');
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  expect((await placed(page)).done).toBe(before.done + 1);
});

test('digits then Enter place above a rank, arrows nudge, U unplaces, and typing is ignored', async ({
  page,
}) => {
  const search = page.locator('#cp-traySearch');
  await search.click();
  await page.keyboard.type('jz');
  await expect(search).toHaveValue('jz');
  expect((await placed(page)).done).toBe(0);
  await search.fill('');
  await page.keyboard.press('Escape');

  await page.keyboard.press('j');
  await page.keyboard.type('58');
  await expect(page.locator('#cp-focusBar .typed')).toContainText('#58');
  await page.keyboard.press('Enter');
  await expect(page.locator('#cp-status')).toContainText('above #58');
  const next = page.locator('#cp-list .row.x8.current + .row');
  await expect(next).toHaveAttribute('data-rank', '58');

  await page.keyboard.press('ArrowDown');
  await expect(page.locator('#cp-list .row.x8.current + .row')).toHaveAttribute('data-rank', '59');
  await page.keyboard.press('Shift+ArrowUp');
  await expect(page.locator('#cp-list .row.x8.current + .row')).toHaveAttribute('data-rank', '49');

  await page.keyboard.press('u');
  await expect(page.locator('#cp-list .row.x8')).toHaveCount(0);
  expect((await placed(page)).done).toBe(0);
});

test('auto-draft is one undo step, and an unsaved draft is offered back after a reload', async ({
  page,
}) => {
  await page.locator('#cp-autoDraft').click();
  const drafted = (await placed(page)).done;
  expect(drafted).toBeGreaterThan(10);
  await page.keyboard.press('z');
  expect((await placed(page)).done).toBe(0);
  await page.keyboard.press('Shift+Z');
  expect((await placed(page)).done).toBe(drafted);

  // Wait for the debounced draft, then come back.
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('combosPlannerDraft') !== null))
    .toBe(true);
  await page.reload();
  const bar = page.locator('#cp-draftBar');
  await expect(bar).toBeVisible();
  await expect(bar).toContainText(`${drafted} placed`);
  expect((await placed(page)).done).toBe(0);
  await bar.getByRole('button', { name: 'Restore draft' }).click();
  expect((await placed(page)).done).toBe(drafted);
  await expect(bar).toBeHidden();
});

test('pasted lineups are matched loosely, and unknown names can be corrected', async ({ page }) => {
  const { total } = await placed(page);
  await page.locator('#cp-pasteBox summary').click();
  await page
    .locator('#cp-pasteText')
    .fill('Lawman, Bjorn, Avalanche 222\nthe brave / warhamer / Nobodyhere');
  await page.locator('#cp-pasteRead').click();
  const result = page.locator('#cp-pasteResult');
  await expect(result.locator('li')).toHaveCount(2);
  await expect(result.locator('li').first()).toContainText('The Avalanche');
  const fix = result.locator('input[data-fix]');
  await expect(fix).toHaveValue('Nobodyhere');
  await fix.fill('Army Breaker');
  await result.getByRole('button', { name: /Add the matched lineups/ }).click();
  await expect(result).toContainText('Added 2 lineups');
  expect((await placed(page)).total).toBe(total + 2);
  await expect(page.locator('#cp-cards .qrow .chip.new')).toHaveCount(2);
});
