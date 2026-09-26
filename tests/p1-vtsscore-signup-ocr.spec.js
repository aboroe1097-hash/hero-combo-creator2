import { expect, test } from '@playwright/test';

// Competition #12 registration: the Lord Info → Power screenshot goes through
// the same OCR client call as the score upload, and its numbers prefill the
// editable power fields. The worker is stubbed; nothing leaves the browser.

// 1×1 PNG.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

test('the registration Power step reads a screenshot into the power fields', async ({ page }) => {
  await page.route('https://www.googletagmanager.com/**', (route) => route.abort());
  await page.addInitScript(() => {
    localStorage.setItem('vts_maintenance_bypass', '1');
    localStorage.setItem('vts_hero_lang', 'en');
    window.__ocrRequests = [];
    window.__VTS_SCORE_TEST__ = {
      initFirebase: async () => ({ configured: true }),
      ensureAnonymousAuth: async () => ({ uid: 'member-1' }),
      getCurrentUser: () => ({ uid: 'member-1' }),
      loadCompetitionSchedule: async () => null,
      loadSignupFirestore: async () => ({
        db: {},
        firestore: {
          doc: (_db, path) => ({ path }),
          getDoc: async () => ({ exists: () => false }),
        },
      }),
      createAccessClient: () => ({
        getAccessGrant: async () => ({ seasonId: '2027', expiresAtMs: Date.now() + 3600000 }),
        getVtsScorePlayers: async () => ({ players: [] }),
        getCompetitionGrowthBoard: async () => ({ board: null }),
        processOcr: async (request) => {
          window.__ocrRequests.push(request.screenshotType);
          return {
            result: {
              schemaVersion: 1,
              requestId: 'stub-1',
              extracted: {
                totalCastlePower: '1,112,473,195',
                troopPower: '999,076,138',
                buildingPower: '6,477,467',
                technologyPower: '38,902,234',
                heroCombatPower: '30,585,714',
                dragonPower: '16,306,050',
                unitSpecialtyPower: '21,125,570',
                artifactPower: null,
                royalTechPower: null,
                gameName: null,
              },
              confidence: { overall: 0.93 },
              warnings: [],
            },
          };
        },
        destroy() {},
      }),
    };
  });
  await page.goto('/vtsscore.html', { waitUntil: 'load' });
  await expect(page.locator('#vtsScoreSignup')).toBeVisible({ timeout: 20000 });
  await expect(page.locator('#vtsScoreGrowthBoard')).toBeVisible();
  await expect(page.locator('#vtsScoreGrowthBoard')).toBeInViewport();

  // The helper works before OCR as well as after it. Exact counts are the
  // default, and each troop type has its own recognizable icon and five tiers.
  const helper = page.locator('#vtsScoreSignupDeadTroops');
  await expect(helper).toBeVisible();
  await page.locator('#vtsScoreSignupTotalCastlePower').fill('100000');
  await page.locator('#vtsScoreSignupTroopPower').fill('50000');
  await helper.locator('input[type="checkbox"]').check();
  await expect(helper.locator('input[value="troops"]')).toBeChecked();
  await expect(helper.locator('.vts-score-dead-troops__tab')).toHaveCount(3);
  await expect(helper.locator('.vts-score-dead-troops__tab svg')).toHaveCount(3);
  await expect(helper.locator('.vts-score-dead-troops__panel:visible input')).toHaveCount(5);
  await helper.locator('#vtsSignupDeadTroops-footmen-lofty').fill('1000');
  await expect(helper.locator('.vts-score-dead-troops__total')).toHaveText('8,200');
  await expect(helper.locator('.vts-score-dead-troops__preview')).toContainText('58,200');
  await expect(helper.locator('.vts-score-dead-troops__preview')).toContainText('108,200');
  await helper.locator('input[value="thousands"]').check();
  await expect(helper.locator('#vtsSignupDeadTroops-footmen-lofty')).toHaveValue('1');
  await expect(helper.locator('.vts-score-dead-troops__total')).toHaveText('8,200');
  await helper.locator('input[value="troops"]').check();
  await expect(helper.locator('#vtsSignupDeadTroops-footmen-lofty')).toHaveValue('1000');

  // The removed questions are gone; ROC level stays.
  for (const id of [
    'vtsScoreSignupT9TroopTypes',
    'vtsScoreSignupPreferredRole',
    'vtsScoreSignupAvailability',
    'vtsScoreSignupMember',
    'vtsScoreSignupContact',
  ]) {
    await expect(page.locator(`#${id}`)).toHaveCount(0);
  }
  await expect(page.locator('#vtsScoreSignupRocLevel')).toBeVisible();

  await page.locator('#vtsScoreSignupImage').setInputFiles({
    name: 'lord-info-power.png',
    mimeType: 'image/png',
    buffer: PNG,
  });
  await expect(page.locator('#vtsScoreSignupOcrConsent')).toHaveCount(0);
  await page.locator('#vtsScoreSignupReadButton').click();

  await expect(page.locator('#vtsScoreSignupTotalCastlePower')).toHaveValue('1112473195');
  await expect(page.locator('#vtsScoreSignupTroopPower')).toHaveValue('999076138');
  await expect(page.locator('#vtsScoreSignupUnitSpecialtyPower')).toHaveValue('21125570');
  // Unreadable stays blank, never 0.
  await expect(page.locator('#vtsScoreSignupArtifactPower')).toHaveValue('');
  await expect(page.locator('#vtsScoreSignupOcrReview')).toBeVisible();
  await expect(page.locator('#vtsScoreSignupOcrConfirm')).not.toBeChecked();
  await expect(helper.locator('.vts-score-dead-troops__preview')).toContainText('999,084,338');
  expect(await page.evaluate(() => window.__ocrRequests.length)).toBe(1);

  // Every field stays editable.
  await page.locator('#vtsScoreSignupDragonPower').fill('16306051');
  await expect(page.locator('#vtsScoreSignupDragonPower')).toHaveValue('16306051');

  for (const selector of ['#vtsScoreSignupReadButton', '#vtsScoreSignupImage']) {
    const box = await page.locator(selector).boundingBox();
    expect(box.height, selector).toBeGreaterThanOrEqual(44);
  }
});
