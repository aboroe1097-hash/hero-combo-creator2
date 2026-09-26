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
    const signupStorageKey = 'vts_score_signup_test_record';
    const readSavedSignup = () => {
      try {
        return JSON.parse(localStorage.getItem(signupStorageKey) || 'null');
      } catch {
        return null;
      }
    };
    window.__VTS_SCORE_TEST__ = {
      initFirebase: async () => ({ configured: true }),
      ensureAnonymousAuth: async () => ({ uid: 'member-1' }),
      getCurrentUser: () => ({ uid: 'member-1' }),
      loadCompetitionSchedule: async () => null,
      loadSignupFirestore: async () => ({
        db: {},
        firestore: {
          doc: (_db, path) => ({ path }),
          getDoc: async () => {
            const saved = readSavedSignup();
            return { exists: () => Boolean(saved), data: () => saved };
          },
          serverTimestamp: () => ({ seconds: Math.floor(Date.now() / 1000) }),
          runTransaction: async (_db, callback) => {
            const stored = readSavedSignup();
            let next = null;
            await callback({
              get: async () => ({ exists: () => Boolean(stored), data: () => stored }),
              set: (_ref, value) => {
                next = value;
              },
            });
            if (next) localStorage.setItem(signupStorageKey, JSON.stringify(next));
          },
        },
      }),
      createAccessClient: () => ({
        getAccessGrant: async () => ({ seasonId: '2027', expiresAtMs: Date.now() + 3600000 }),
        getVtsScorePlayers: async () => ({
          players: [{ submissionUid: 'member-1', gameName: 'Test Member' }],
        }),
        getCompetitionGrowthBoard: async () => ({ board: null }),
        submitVtsScore: async (payload) => {
          window.__scorePayload = payload;
          return {
            submissionUid: payload.submissionUid,
            gameName: payload.gameName,
            revision: 1,
            schemaVersion: 2,
            powerValues: payload.powerValues,
          };
        },
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
  expect(
    await page.locator('#vtsScoreSignup').evaluate((signup) =>
      Boolean(signup.compareDocumentPosition(document.querySelector('#vtsScoreGrowthBoard')) & 4)
    )
  ).toBe(true);

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

  // Signup persists the alive/dead split; reopening subtracts it from the
  // displayed base, restores the same tier counts, and a second save adds it
  // exactly once.
  await page.locator('#vtsScoreSignupName').fill('Test Member');
  await page.locator('#vtsScoreSignupOcrConfirm').check();
  await page
    .locator('[data-boh-field="commitment.bohTimeSlots"]')
    .evaluate((input) => (input.value = '+20'));
  await page
    .locator('[data-boh-field="commitment.epicTimeSlots"]')
    .evaluate((input) => (input.value = '+10'));
  await page.locator('#vtsScoreSignupForm').evaluate((form) =>
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  );
  await expect(page.locator('#vtsScoreSignupSuccess')).toBeVisible();
  const firstSaved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('vts_score_signup_test_record'))
  );
  expect(firstSaved.stats.troopPower).toBe(999_084_338);
  expect(firstSaved.stats.totalCastlePower).toBe(1_112_481_395);
  expect(firstSaved.stats.deadTroopCounts.FootmenLofty).toBe(1000);

  await page.reload({ waitUntil: 'load' });
  await expect(page.locator('#vtsScoreSignup')).toBeVisible({ timeout: 20000 });
  await expect(page.locator('#vtsScoreSignupTroopPower')).toHaveValue('999076138');
  await expect(page.locator('#vtsScoreSignupTotalCastlePower')).toHaveValue('1112473195');
  const restoredHelper = page.locator('#vtsScoreSignupDeadTroops');
  await expect(restoredHelper.locator('input[type="checkbox"]')).toBeChecked();
  await expect(restoredHelper.locator('#vtsSignupDeadTroops-footmen-lofty')).toHaveValue('1000');
  await page.locator('#vtsScoreSignupForm').evaluate((form) =>
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  );
  await expect(page.locator('#vtsScoreSignupSuccess')).toBeVisible();
  const secondSaved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('vts_score_signup_test_record'))
  );
  expect(secondSaved.stats.troopPower).toBe(999_084_338);
  expect(secondSaved.stats.totalCastlePower).toBe(1_112_481_395);

  // Score review mounts the same shared editor and sends its component data
  // alongside the adjusted competition totals.
  await page.locator('#vtsScorePlayer').fill('Test Member');
  await page.locator('.vts-score-player-option').click();
  await page.locator('#vtsScoreImage').setInputFiles({
    name: 'final-power.png',
    mimeType: 'image/png',
    buffer: PNG,
  });
  await page.locator('#vtsScoreConsent').check();
  await page.locator('#vtsScoreReadButton').click();
  const scoreHelper = page.locator('#vtsScoreDeadTroops');
  await expect(scoreHelper.locator('.vts-score-dead-troops__tab')).toHaveCount(3);
  await scoreHelper.locator('input[type="checkbox"]').check();
  await scoreHelper.locator('#vtsDeadTroops-footmen-lofty').fill('1000');
  await page.locator('#vtsScoreSubmitButton').click();
  await expect(page.locator('#vtsScoreSuccess')).toBeVisible();
  const scorePayload = await page.evaluate(() => window.__scorePayload);
  expect(scorePayload.deadTroopCounts.FootmenLofty).toBe(1000);
  expect(scorePayload.powerValues.totalCastlePower).toBe(1_112_481_395);
  expect(scorePayload.powerValues.troopPower).toBe(999_084_338);
  expect(scorePayload.ocr.correctedFields).toEqual([]);
});
