import { test, expect } from '@playwright/test';

// These two trees fall back to the card layout; every other tree uses the game-tree
// layout. Both layouts must expose the same idle/progress/complete node states.
const CARD_LAYOUT_TREES = ['b3581c97', '77db4a78'];
// A dual-currency tree, to prove spent/remaining split correctly across both medals.
const DUAL_TREE = 'art_of_war_command';

async function openApp(page, path = '/') {
  await page.route('https://www.googletagmanager.com/**', (route) => route.abort());
  await page.addInitScript(() => {
    localStorage.setItem('vts_maintenance_bypass', '1');
    localStorage.setItem('vts_intro_v1_seen', '1');
    localStorage.setItem('vts_eden_dataset', 'season5');
  });
  await page.goto(path, { waitUntil: 'domcontentloaded' });
}

async function openResearch(page) {
  await page.locator('#tabResearch').click();
  await expect(page.locator('#techListContainer')).toBeVisible();
}

async function openTree(page, techId) {
  await page.locator(`.research-tech-card[data-tech-id="${techId}"] .research-card-cta`).click();
  await expect(page.locator('#techCalculatorContainer')).toBeVisible();
}

function readTotals(page) {
  return page.evaluate(() => {
    const text = (sel) =>
      document.querySelector(sel)?.textContent.replace(/\s+/g, ' ').trim() || '';
    const numbers = (sel) =>
      [...(document.querySelector(sel)?.querySelectorAll('.research-cost-summary') || [])].map(
        (row) => Number((row.textContent.match(/([\d,]+)\s*$/)?.[1] || '0').replace(/,/g, ''))
      );
    return {
      spentText: text('#spentTechCost'),
      remainingText: text('#totalTechCost'),
      spent: numbers('#spentTechCost'),
      remaining: numbers('#totalTechCost'),
    };
  });
}

function tallyCardStates(page) {
  return page.evaluate(() => {
    const out = {};
    document.querySelectorAll('.research-node-card').forEach((card) => {
      const state = card.dataset.nodeState || 'MISSING';
      out[state] = (out[state] || 0) + 1;
    });
    return out;
  });
}

test('card-layout trees expose idle, progress and complete node states', async ({ page }) => {
  test.setTimeout(120000);
  await openApp(page);
  await openResearch(page);

  for (const techId of CARD_LAYOUT_TREES) {
    await openTree(page, techId);

    await page.locator('#resetAllTechBtn').click();
    await page.waitForTimeout(150);
    expect(Object.keys(await tallyCardStates(page)), `${techId} after reset`).toEqual(['idle']);

    await page
      .locator('.research-node-card')
      .first()
      .locator('.quick-set-btn[data-val="5"]')
      .click();
    await page.waitForTimeout(250);
    const mixed = await tallyCardStates(page);
    expect(mixed.progress, `${techId} needs one partially levelled node`).toBe(1);
    expect(mixed.MISSING, `${techId} has nodes without data-node-state`).toBeUndefined();

    await page.locator('#maxAllTechBtn').click();
    await page.waitForTimeout(250);
    expect(Object.keys(await tallyCardStates(page)), `${techId} after Max All`).toEqual([
      'complete',
    ]);

    await page.locator('#resetAllTechBtn').click();
    await page.waitForTimeout(120);
    await page.locator('#closeCalcBtn').click();
    await page.waitForTimeout(150);
  }
});

test('a research row stays locked until the row above it is fully started', async ({ page }) => {
  test.setTimeout(120000);
  await openApp(page);
  await openResearch(page);
  await openTree(page, DUAL_TREE);
  await page.locator('#resetAllTechBtn').click();
  await page.waitForTimeout(250);

  const rows = await page.evaluate(() => {
    const wraps = [...document.querySelectorAll('.game-tech-node-wrap')];
    return wraps.map((w) => ({
      id: w.dataset.nodeId,
      locked: w.dataset.nodeLocked,
    }));
  });

  // On an empty tree only the first row is reachable.
  const unlocked = rows.filter((r) => r.locked === 'false');
  const locked = rows.filter((r) => r.locked === 'true');
  expect(unlocked.length, 'first row is reachable').toBeGreaterThan(0);
  expect(locked.length, 'later rows start locked').toBeGreaterThan(0);

  // Tapping a locked node must not raise it.
  const lockedId = locked[0].id;
  const before = await page.evaluate(
    (id) =>
      document.querySelector(`.game-tech-node-wrap[data-node-id="${id}"] .tech-node-input`).value,
    lockedId
  );
  await page
    .locator(`.game-tech-node-wrap[data-node-id="${lockedId}"] .game-tech-tap`)
    .click({ force: true });
  await page.waitForTimeout(250);
  const after = await page.evaluate(
    (id) =>
      document.querySelector(`.game-tech-node-wrap[data-node-id="${id}"] .tech-node-input`).value,
    lockedId
  );
  expect(after, 'a locked node cannot be raised').toBe(before);

  // Completing the whole tree unlocks everything.
  await page.locator('#maxAllTechBtn').click();
  await page.waitForTimeout(400);
  const afterMax = await page.evaluate(() =>
    [...document.querySelectorAll('.game-tech-node-wrap')].map((w) => w.dataset.nodeLocked)
  );
  expect(new Set(afterMax), 'nothing is locked once the tree is complete').toEqual(
    new Set(['false'])
  );

  await page.locator('#resetAllTechBtn').click();
  await page.waitForTimeout(200);
});

test('tree totals report spent alongside remaining for every currency', async ({ page }) => {
  test.setTimeout(120000);
  await openApp(page);
  await openResearch(page);
  await openTree(page, DUAL_TREE);

  await page.locator('#resetAllTechBtn').click();
  await page.waitForTimeout(200);

  await expect(page.locator('.research-total-group--spent')).toBeVisible();
  await expect(page.locator('.research-total-group--remaining')).toBeVisible();

  const empty = await readTotals(page);
  expect(empty.spent.length, 'dual tree shows both currencies as spent').toBe(2);
  expect(empty.remaining.length, 'dual tree shows both currencies as remaining').toBe(2);
  expect(empty.spent, 'nothing is spent on a reset tree').toEqual([0, 0]);
  expect(empty.remaining.every((value) => value > 0)).toBe(true);

  const fullCost = empty.remaining;

  await page.locator('#maxAllTechBtn').click();
  await page.waitForTimeout(300);

  const maxed = await readTotals(page);
  // A fully maxed tree must still name its currencies rather than collapsing to a
  // generic resource row, and spent must equal the tree's whole cost.
  expect(maxed.spent, 'spent equals the full tree cost once maxed').toEqual(fullCost);
  expect(maxed.remaining, 'nothing remains on a maxed tree').toEqual([0, 0]);
  expect(maxed.spentText).toContain('War Badges');
  expect(maxed.spentText).toContain('Courage Medals');

  // Spent + remaining is conserved at a partial level too.
  await page.locator('#resetAllTechBtn').click();
  await page.waitForTimeout(200);
  await page.locator('.game-tech-tap, .research-node-card .quick-set-btn[data-val="5"]').first().click();
  await page.waitForTimeout(300);

  const partial = await readTotals(page);
  partial.spent.forEach((spentValue, index) => {
    expect(spentValue + partial.remaining[index], 'spent + remaining is conserved').toBe(
      fullCost[index]
    );
  });
});
