import { expect, test } from '@playwright/test';

async function installSeasonFixture(
  page,
  { published = true, ended = false, previewRole = null, privacy = null } = {}
) {
  await page.addInitScript(
    ({ published, ended, previewRole, privacy }) => {
      localStorage.setItem('vts_hero_lang', 'en');
      localStorage.setItem('vts_maintenance_bypass', '1');
      // A stale legacy cache must never appear in another season, even offline.
      localStorage.setItem(
        'vts_eden_x2_public_dashboard_cache_v1',
        JSON.stringify({
          savedAt: Date.now(),
          workspace: 'eden-x2',
          data: {
            contributionRecords: [
              {
                entries: [{ name: 'Legacy Private Player', contribution: '99999' }],
              },
            ],
          },
        })
      );
      window.VTS_EDEN_X1_TEST_MODE = true;
      window.__seasonReads = [];
      const snapshot = (data) => ({ exists: () => Boolean(data), data: () => data });
      const projection = {
        workspace: 'eden-x8',
        season: 'season-x8',
        published,
        revision: 1,
        dashboard: {
          r5Season: 'season-x8',
          attacks: [],
          dutyRecords: [],
          contributionRecords: [
            {
              id: 'x8-contribution',
              date: '2026-10-10',
              entries: [
                { rank: '1', name: 'Season Eight Player', contribution: '30000' },
                { rank: '2', name: 'Season Eight Second', contribution: '20000' },
              ],
            },
          ],
        },
        voteSettings: {
          season: 'season-x8',
          contributionRankingMode: 'default',
          votingOpen: true,
          allowEditing: true,
          showMemberResults: false,
          showManagementResults: true,
        },
        managementVotes: [{ playerName: 'Season Eight Player', votes: 5 }],
      };
      if (privacy) {
        projection.dashboard.contributionRecords[0].entries.push(
          { rank: '3', name: 'Management Winner', contribution: '10000' },
          { rank: '4', name: 'Team Winner', contribution: '5000' }
        );
        projection.voteSettings.showMemberResults = true;
        projection.voteSettings.showMemberVoteCounts = privacy.member;
        projection.voteSettings.showManagementVoteCounts = privacy.management;
        projection.rewardSettings = {
          quotas: { support: 0, contribution: 1, management: 1, team: 1 },
          guildMasterSource: 'r5',
          r5PlayerKey: '',
        };
        projection.managementVotes = [
          {
            playerName: 'Management Winner',
            rank: 1,
            ...(privacy.management ? { votes: 8765432 } : {}),
          },
        ];
        projection.publicVoteResults = {
          season: 'season-x8',
          published: true,
          rankings: [
            {
              playerName: 'Team Winner',
              playerKey: 'teamwinner',
              rank: 1,
              ...(privacy.member ? { votes: 1234567, voters: 6 } : {}),
            },
          ],
        };
      }
      if (previewRole)
        sessionStorage.setItem(
          'vts_eden_admin_preview__eden-x8',
          JSON.stringify({ ...projection, published: true })
        );
      window.VTS_EDEN_X1_FIREBASE_MODULES = [
        {
          initFirebase: () => ({ configured: true, app: {} }),
          ensureAnonymousAuth: async () => ({
            uid: 'test-season-member',
            isAnonymous: !previewRole || previewRole === 'guest',
            getIdTokenResult: async () => ({
              claims: previewRole === 'admin' ? { admin: true } : {},
            }),
          }),
        },
        {
          importFirestoreLite: async () => ({
            getFirestore: () => ({}),
            doc: (_db, path) => ({ path }),
            getDoc: async ({ path }) => {
              window.__seasonReads.push(path);
              if (path === 'vts_admin/season_registry')
                return snapshot({
                  seasons: [
                    {
                      id: 'season-x8',
                      workspaceId: 'eden-x8',
                      label: 'Autumn campaign',
                      state: ended ? 'ended' : 'active',
                      startedAtMs: 1,
                      endedAtMs: ended ? 2 : 0,
                    },
                  ],
                });
              if (path === 'eden_seasons/eden-x8/data/public_projection')
                return snapshot(projection);
              throw new Error('Unexpected season read: ' + path);
            },
          }),
        },
      ];
    },
    { published, ended, previewRole, privacy }
  );
}

test('X8 cold link renders its published season and registry label without legacy reads', async ({
  page,
}, testInfo) => {
  await installSeasonFixture(page);
  await page.goto('/eden-season.html?workspace=eden-x8');
  await expect(page).toHaveTitle(/Autumn campaign/);
  await expect(page.locator('h1.admin-shell-title')).toHaveText('Autumn campaign');
  await page.locator('[data-reward-view="contribution"]').click();
  await expect(page.locator('#dashWeightedContributionPanel')).toContainText('Season Eight Player');
  const reads = await page.evaluate(() => window.__seasonReads);
  expect(reads).toContain('eden_seasons/eden-x8/data/public_projection');
  expect(reads).not.toContain('vts_admin/dashboard_data');
  expect(reads).not.toContain('vts_admin/eden_x2_public_projection');
  await expect(page.locator('body')).not.toContainText('Legacy Private Player');
  await expect(page.locator('#edenX1NavLoader')).toBeHidden();
  await page.screenshot({ path: testInfo.outputPath('x8-public-desktop.png'), fullPage: true });
});

test('unpublished future season stays hidden even with legacy cache', async ({ page }) => {
  await installSeasonFixture(page, { published: false });
  await page.goto('/eden-season.html?workspace=eden-x8');
  await expect(page.locator('#dashWeightedContributionPanel')).toContainText(
    /not.*published|unpublished/i
  );
  await expect(page.locator('#dashWeightedContributionPanel')).not.toContainText(
    'Season Eight Player'
  );
});

test('missing generic workspace does not issue a legacy dashboard read', async ({ page }) => {
  await installSeasonFixture(page);
  await page.goto('/eden-season.html');
  await expect(page.locator('#dashWeightedContributionPanel')).toContainText(
    'Choose a valid published Eden season.'
  );
  expect(await page.evaluate(() => window.__seasonReads)).toEqual([]);
});

test('ended future season uses the archive view', async ({ page }) => {
  await installSeasonFixture(page, { ended: true });
  await page.goto('/eden-season.html?workspace=eden-x8');
  await expect(page).toHaveTitle(/Autumn campaign/);
  await expect(page.locator('body')).toHaveAttribute('data-eden-season-state', 'archive');
});

for (const role of ['guest', 'member']) {
  test(`private preview rejects ${role} even with a forged session snapshot`, async ({ page }) => {
    await installSeasonFixture(page, { published: false, previewRole: role });
    await page.goto('/eden-season.html?workspace=eden-x8&preview=1');
    await expect(page.locator('#edenX1Error')).toContainText(/Admin|Sign in/);
    await expect(page.locator('#dashWeightedContributionPanel')).not.toContainText(
      'Season Eight Player'
    );
    await expect(page.locator('#edenAdminPreviewBanner')).toHaveCount(0);
  });
}

test('Admin private preview renders X8 read-only without public reads or cached draft data', async ({
  page,
}, testInfo) => {
  await installSeasonFixture(page, { published: false, previewRole: 'admin' });
  await page.goto('/eden-season.html?workspace=eden-x8&preview=1');
  await expect(page.locator('#edenAdminPreviewBanner')).toContainText('Voting is disabled');
  await page.locator('[data-reward-view="contribution"]').click();
  await expect(page.locator('#dashWeightedContributionPanel')).toContainText('Season Eight Player');
  const form = page.locator('#edenX1TeamVoteForm');
  if (await form.count()) {
    await expect(form).toHaveAttribute('aria-disabled', 'true');
    await expect(form.locator('button[type="submit"]')).toBeDisabled();
  }
  expect(await page.evaluate(() => window.__seasonReads)).not.toContain(
    'eden_seasons/eden-x8/data/public_projection'
  );
  expect(
    await page.evaluate(() => sessionStorage.getItem('vts_eden_admin_preview__eden-x8'))
  ).toBeNull();
  expect(
    await page.evaluate(() => localStorage.getItem('vts_eden_x8_public_dashboard_cache_v1'))
  ).toBeNull();
  await expect(page.locator('#edenX1NavLoader')).toBeHidden();
  await page.screenshot({
    path: testInfo.outputPath('x8-admin-draft-preview.png'),
    fullPage: true,
  });
});

test('X8 public surface has no visible legacy season identity and fits mobile', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await installSeasonFixture(page);
  await page.goto('/eden-season.html?workspace=eden-x8');
  await page.locator('[data-reward-view="contribution"]').click();
  await expect(page.locator('#dashWeightedContributionPanel')).toContainText('Season Eight Player');
  await expect(page.locator('body')).not.toContainText(/Eden X[12]/i);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2)).toBe(
    true
  );
  await expect(page.locator('#edenX1NavLoader')).toBeHidden();
  await page.screenshot({ path: testInfo.outputPath('x8-public-mobile.png'), fullPage: true });
});

test('Eden hub discovers X8 and keeps both historical hubs without a redeploy', async ({
  page,
}) => {
  await page.route('**/hub-season-fixture.html', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: `<div id="edenMapRoot">
      <button data-eden-subtab="bounty">Guide</button>
      <button data-eden-subtab="season" hidden>Current season</button>
      <button data-eden-subtab="previous">Previous seasons</button>
      <div data-eden-subtab-panel="bounty"></div>
      <div data-eden-subtab-panel="season" hidden></div>
      <div data-eden-subtab-panel="previous" hidden></div>
    </div>`,
    })
  );
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
        let data;
        if (path === 'vts_admin/public_season') data = { workspaceId: 'eden-x8', label: 'Autumn campaign' };
        else if (path === 'vts_admin/season_registry') data = { seasons: [
          { id: 'season-x2', workspaceId: 'eden-x2', label: 'Eden X2', state: 'ended', startedAtMs: 1, endedAtMs: 2 },
          { id: 'season-x8', workspaceId: 'eden-x8', label: 'Autumn campaign', state: 'active', startedAtMs: 3 },
        ] };
        else if (path.includes('public_projection')) data = { workspace: path.includes('eden_x2') ? 'eden-x2' : 'eden-x8', published: true };
        return { exists: () => Boolean(data), data: () => data };
      },
    });`,
    })
  );
  await page.route('**/eden-season.html*', (route) =>
    route.fulfill({ contentType: 'text/html', body: 'Published season' })
  );
  await page.route('**/eden-x1.html*', (route) =>
    route.fulfill({ contentType: 'text/html', body: 'Historic season' })
  );
  await page.route('**/eden-x2.html*', (route) =>
    route.fulfill({ contentType: 'text/html', body: 'Historic season' })
  );
  await page.goto('/hub-season-fixture.html');
  await page.evaluate(async () => (await import('/js/eden-hub.js')).bootEdenHub());
  const current = page.locator('[data-eden-subtab="season"]');
  await expect(current).toBeVisible();
  await expect(current).toContainText('Autumn campaign');
  await current.click();
  await expect(page.locator('[data-eden-subtab-panel="season"] iframe')).toHaveAttribute(
    'src',
    /eden-season\.html\?workspace=eden-x8/
  );
  await page.locator('[data-eden-subtab="previous"]').click();
  const picker = page.locator('[data-eden-archive-picker]');
  await expect(picker.locator('option')).toHaveText(['Eden X1', 'Eden X2']);
  await picker.selectOption('eden-x1');
  await expect(page.locator('[data-eden-subtab-panel="previous"] iframe')).toHaveAttribute(
    'src',
    /eden-x1\.html/
  );
  await picker.selectOption('eden-x2');
  await expect(page.locator('[data-eden-subtab-panel="previous"] iframe')).toHaveAttribute(
    'src',
    /eden-x2\.html/
  );
});

for (const privacy of [
  { member: false, management: true },
  { member: true, management: false },
  { member: false, management: false },
]) {
  test(`independent public vote count privacy: members ${privacy.member}, management ${privacy.management}`, async ({
    page,
  }) => {
    await installSeasonFixture(page, { privacy });
    await page.goto('/eden-season.html?workspace=eden-x8');
    await expect(page.locator('#edenX1NavLoader')).toBeHidden();
    await page.locator('[data-reward-view="management"]').click();
    await expect(page.locator('#dashWeightedContributionPanel')).toContainText('Management Winner');
    const managementText = await page.locator('#dashWeightedContributionPanel').textContent();
    expect(managementText.includes('8,765,432')).toBe(privacy.management);
    await page.locator('[data-reward-view="team"]').click();
    await expect(page.locator('#dashWeightedContributionPanel')).toContainText('Team Winner');
    const teamText = await page.locator('#dashWeightedContributionPanel').textContent();
    expect(teamText.includes('1,234,567')).toBe(privacy.member);
    const poster = await page.evaluate(() => window.getEdenTop20PosterModelForTest());
    expect(poster.rows.find((row) => row.category === 'management').scoreValue).toBe(
      privacy.management ? '8,765,432' : ''
    );
    expect(poster.rows.find((row) => row.category === 'team').scoreValue).toBe(
      privacy.member ? '1,234,567' : ''
    );
  });
}
