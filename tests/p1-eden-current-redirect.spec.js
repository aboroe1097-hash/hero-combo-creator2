import { expect, test } from '@playwright/test';

async function installPointer(
  page,
  { workspace = 'eden-x8', published = true, absent = false } = {}
) {
  await page.route('**/js/firebase-eden.js*', (route) =>
    route.fulfill({
      contentType: 'text/javascript',
      body: `export const initFirebase = () => ({ configured: true, app: {} });
    export const ensureAnonymousAuth = async () => ({ uid: 'guest', isAnonymous: true });`,
    })
  );
  await page.route('**/js/firebase-sdk.js*', (route) =>
    route.fulfill({
      contentType: 'text/javascript',
      body: `export const importFirestoreLite = async () => ({
      getFirestore: () => ({}), doc: (_db, path) => ({ path }),
      getDoc: async ({ path }) => {
        const data = path === 'vts_admin/public_season'
          ? ${absent ? 'null' : JSON.stringify({ workspaceId: workspace })}
          : ${JSON.stringify({ workspace: absent ? 'eden-x2' : workspace, published })};
        return { exists: () => Boolean(data), data: () => data };
      },
    });`,
    })
  );
  await page.route('**/eden-season.html*', (route) =>
    route.fulfill({ contentType: 'text/html', body: 'Current published season' })
  );
  await page.route('**/eden-x2.html*', (route) =>
    route.fulfill({ contentType: 'text/html', body: 'Legacy published season' })
  );
}

for (const route of ['eden', 'vote']) {
  test(`${route} short link follows the X8 publication pointer`, async ({ page }) => {
    await installPointer(page);
    await page.goto(`/${route}/?utm_source=team&workspace=eden-x2&preview=1`);
    await expect(page).toHaveURL(
      new RegExp(
        `/eden-season\\.html\\?workspace=eden-x8&utm_source=team${route === 'vote' ? '#vote' : ''}$`
      )
    );
    await expect(page.locator('body')).toHaveText('Current published season');
  });
}

test('an unpublished current season leaves both short routes unavailable instead of showing X2', async ({
  page,
}) => {
  await installPointer(page, { published: false });
  for (const route of ['eden', 'vote']) {
    await page.goto(`/${route}/`);
    await expect(page.locator('[role="status"]')).toContainText('unavailable');
    await expect(page).toHaveURL(new RegExp(`/${route}/$`));
    await expect(page.getByRole('link', { name: 'Open Eden hub' })).toHaveAttribute(
      'href',
      '../index.html#edenHub'
    );
  }
});

test('a malformed publication pointer stays unavailable', async ({ page }) => {
  await installPointer(page, { workspace: '../eden-x2' });
  await page.goto('/eden/');
  await expect(page.locator('[role="status"]')).toContainText('unavailable');
  await expect(page).toHaveURL(/\/eden\/$/);
});

test('the Eden short link preserves the shared complaint section hash', async ({ page }) => {
  await installPointer(page);
  await page.goto('/eden/#edenX1Complaints');
  await expect(page).toHaveURL(/\/eden-season\.html\?workspace=eden-x8#edenX1Complaints$/);
});

test('a deployment without a publication pointer retains the published legacy ballot link', async ({
  page,
}) => {
  await installPointer(page, { absent: true });
  await page.goto('/vote/');
  await expect(page).toHaveURL(/\/eden-x2\.html#vote$/);
});
