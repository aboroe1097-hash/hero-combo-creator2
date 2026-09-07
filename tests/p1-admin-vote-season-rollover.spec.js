import { expect, test } from '@playwright/test';

const CURRENT_SEASON = 'season-2027';
const STALE_SETTINGS = {
  season: 'season-2026',
  votingOpen: true,
  allowEditing: true,
  showPublicResults: true,
  showVoterNames: true,
  contributionRankingMode: 'default',
  closesAt: '2026-07-18T01:59:00.000Z',
};

test('admin explicitly activates a stale vote season with safe defaults', async ({ page }) => {
  await page.route('https://www.googletagmanager.com/**', (route) => route.abort());
  await page.addInitScript(
    ({ currentSeason, staleSettings }) => {
      window.VTS_ADMIN_LOCAL_TEST_AUTH = true;
      localStorage.setItem('vts_admin_local_test_auth', '1');
      localStorage.setItem('vts_maintenance_bypass', '1');
      // The vote and adjustment keys below are workspace-namespaced now, and
      // the admin opens the X2 season by default. Pin the workspace those
      // seeded keys belong to so the fixture and the app agree.
      localStorage.setItem('vts_admin_eden_workspace', 'eden-x1');
      localStorage.setItem('vts_hero_lang', 'en');
      localStorage.setItem('vts_r5_adjustment_season', currentSeason);
      localStorage.setItem('vts_eden_x1_vote_admin_settings', JSON.stringify(staleSettings));
      navigator.serviceWorker?.getRegistrations?.().then((registrations) => {
        registrations.forEach((registration) => registration.unregister());
      });
    },
    { currentSeason: CURRENT_SEASON, staleSettings: STALE_SETTINGS }
  );

  await page.goto('/admin.html', { waitUntil: 'load' });
  await expect(page.locator('#dashApp')).toBeVisible({ timeout: 20000 });
  await page.waitForFunction(
    () =>
      typeof window.setEdenX1VotesForTest === 'function' &&
      typeof window.switchDashSubtab === 'function'
  );
  await page.evaluate((staleSettings) => {
    window.VTS_ADMIN_AUTH = { ...(window.VTS_ADMIN_AUTH || {}), adminPin: 'configured' };
    window.setEdenX1VotesForTest([], [], staleSettings);
    window.switchDashSubtab('edenVotes');
  }, STALE_SETTINGS);

  const mismatch = page.locator('#dashEdenVoteSeasonMismatch');
  await expect(mismatch).toBeVisible();
  await expect(mismatch).toContainText('season-2026');
  await expect(mismatch).toContainText(CURRENT_SEASON);
  await expect(page.locator('#dashEdenVoteActivateSeasonBtn')).toContainText(
    'Activate the current vote season'
  );
  await expect(page.locator('#dashEdenVoteOpenToggle')).toBeDisabled();
  await expect(page.locator('#dashEdenVotePublicResultsToggle')).toBeDisabled();
  await expect(page.locator('#dashEdenContributionModeDefault')).toBeDisabled();
  await expect(page.locator('#dashEdenVoteClosesAtInput')).toBeDisabled();

  await expect
    .poll(() =>
      page.evaluate(() =>
        JSON.parse(localStorage.getItem('vts_eden_x1_vote_admin_settings') || 'null')
      )
    )
    .toEqual(STALE_SETTINGS);

  await page.locator('#dashEdenVoteActivateSeasonBtn').click();
  await expect(mismatch).toBeHidden();
  await expect(page.locator('#dashEdenVoteSettingsStatus')).toContainText('Voting is closed');
  await expect(page.locator('#dashEdenVoteOpenToggle')).toBeEnabled();
  await expect(page.locator('#dashEdenVoteOpenToggle')).not.toBeChecked();
  await expect(page.locator('#dashEdenVoteEditingToggle')).not.toBeChecked();
  await expect(page.locator('#dashEdenVotePublicResultsToggle')).not.toBeChecked();
  await expect(page.locator('#dashEdenVoteShowNamesToggle')).not.toBeChecked();
  await expect(page.locator('#dashEdenContributionModeDefault')).toBeChecked();
  await expect(page.locator('#dashEdenVoteClosesAtInput')).toHaveValue('');

  const savedSettings = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('vts_eden_x1_vote_admin_settings') || 'null')
  );
  expect(savedSettings).toEqual({
    season: CURRENT_SEASON,
    votingOpen: false,
    allowEditing: false,
    showPublicResults: false,
    showVoterNames: false,
    contributionRankingMode: 'default',
    closesAt: '',
  });
});
