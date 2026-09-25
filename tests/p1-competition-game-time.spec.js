import { expect, test } from '@playwright/test';

// Competition #12 runs on game time, which is UTC−2 (06:00 in Dubai is 00:00
// game time, the same clock as the site header). The VTS Admin schedule panel
// fills a 2-week default without saving it and shows game time next to the
// viewer's own time; the member page formats phase times in the same zone.

const MINUS = '−';
const stripIsolates = (value) => String(value).replace(/[⁦-⁩]/g, '');

async function openSchedulePanel(
  page,
  { width = 1280, height = 900, theme = 'dark', lang = 'en' } = {}
) {
  await page.setViewportSize({ width, height });
  await page.route('https://www.googletagmanager.com/**', (route) => route.abort());
  await page.addInitScript(
    ({ selectedTheme, selectedLang }) => {
      localStorage.setItem('vts_maintenance_bypass', '1');
      localStorage.setItem('vts_hero_lang', selectedLang);
      localStorage.setItem('vts_theme', selectedTheme);
      window.VTS_ADMIN_LOCAL_TEST_AUTH = true;
      localStorage.setItem('vts_admin_local_test_auth', '1');
    },
    { selectedTheme: theme, selectedLang: lang }
  );
  await page.goto('/admin.html', { waitUntil: 'load' });
  await expect(page.locator('#dashApp')).toBeVisible({ timeout: 20000 });
  await page.waitForFunction(
    () =>
      typeof window.switchDashSubtab === 'function' &&
      typeof window.getVtsAdminFirestoreContext === 'function'
  );
  // Count schedule writes: the default must never be saved on its own.
  await page.evaluate(() => {
    window.__scheduleWrites = [];
    const original = window.getVtsAdminFirestoreContext;
    window.getVtsAdminFirestoreContext = async () => {
      const context = await original();
      if (context.firestore.__wrapped) return context;
      const setDoc = context.firestore.setDoc;
      context.firestore.setDoc = async (ref, value, ...rest) => {
        window.__scheduleWrites.push(String(ref?.path || ref?.id || ''));
        return setDoc(ref, value, ...rest);
      };
      context.firestore.__wrapped = true;
      return context;
    };
  });
  await page.evaluate(() => window.switchDashSubtab('bohSignups'));
  await expect(page.locator('#dashCompScheduleForm')).toBeVisible({ timeout: 20000 });
}

const dateInput = (page, key) => page.locator(`[data-comp-schedule-date="${key}"]`);
const timeInput = (page, key) => page.locator(`[data-comp-schedule-time="${key}"]`);

test('the schedule panel prefills and fills the 2-week default without saving', async ({
  page,
}) => {
  await openSchedulePanel(page);

  // No schedule stored: the next game day's default is already in the form.
  const nextGameDay = await page.evaluate(() => {
    const game = new Date(Date.now() - 2 * 60 * 60 * 1000);
    game.setUTCDate(game.getUTCDate() + 1);
    return game.toISOString().slice(0, 10);
  });
  await expect(page.locator('#dashCompScheduleDefaultStart')).toHaveValue(nextGameDay);
  await expect(dateInput(page, 'opensAt')).toHaveValue(nextGameDay);
  await expect(timeInput(page, 'opensAt')).toHaveValue('00:00');
  await expect(page.locator('#dashCompScheduleTimeline')).toContainText('No schedule saved yet');

  await page.locator('#dashCompScheduleDefaultStart').fill('2026-10-01');
  await page.getByRole('button', { name: 'Fill 2-week default' }).click();
  const expected = {
    opensAt: ['2026-10-01', '00:00'],
    phase1ClosesAt: ['2026-10-02', '22:00'],
    deadlineAt: ['2026-10-04', '22:00'],
    reuploadOpensAt: ['2026-10-13', '00:00'],
    reuploadClosesAt: ['2026-10-14', '22:00'],
    winnersStartAt: ['2026-10-15', '00:00'],
    winnersEndAt: ['2026-10-16', '22:00'],
  };
  for (const [key, [date, time]] of Object.entries(expected)) {
    await expect(dateInput(page, key)).toHaveValue(date);
    await expect(timeInput(page, key)).toHaveValue(time);
  }

  // Each row: game time with its zone, then the viewer's time.
  const hint = stripIsolates(
    await page.locator('[data-comp-schedule-local="opensAt"]').textContent()
  );
  expect(hint).toContain(`Game 2026-10-01 00:00 (UTC${MINUS}2) · Your time:`);

  // The timeline previews the filled default but still says nothing is saved.
  await expect(page.locator('#dashCompScheduleTimeline')).toContainText('No schedule saved yet');
  await expect(page.locator('#dashCompScheduleTimeline')).toContainText(
    '2026-10-01 00:00 → 2026-10-02 22:00'
  );
  expect(await page.evaluate(() => window.__scheduleWrites.length)).toBe(0);

  // Touch targets.
  for (const selector of ['#dashCompScheduleDefaultStart', '#dashCompScheduleFillDefault']) {
    const box = await page.locator(selector).boundingBox();
    expect(box.height, selector).toBeGreaterThanOrEqual(44);
  }
});

test('the live clock line shows game time as UTC−2 next to the viewer’s time', async ({ page }) => {
  await openSchedulePanel(page);
  const line = page.locator('#dashCompScheduleNow');
  await expect(line).toBeVisible();
  const text = stripIsolates(await line.textContent());
  const match = text.match(
    new RegExp(`^Now: game (\\d{2}):(\\d{2}) \\(UTC${MINUS}2\\) · your time (\\d{2}):(\\d{2})$`)
  );
  expect(match, text).not.toBeNull();
  const { gameMinutes, localMinutes } = await page.evaluate(() => {
    const now = new Date();
    const utc = now.getUTCHours() * 60 + now.getUTCMinutes();
    return {
      gameMinutes: (utc - 120 + 1440) % 1440,
      localMinutes: now.getHours() * 60 + now.getMinutes(),
    };
  });
  const shown = Number(match[1]) * 60 + Number(match[2]);
  const shownLocal = Number(match[3]) * 60 + Number(match[4]);
  // Allow the minute to tick between the render and this read.
  expect(Math.abs(shown - gameMinutes) % 1439).toBeLessThanOrEqual(1);
  expect(Math.abs(shownLocal - localMinutes) % 1439).toBeLessThanOrEqual(1);
});

for (const variant of [
  { name: 'light theme', theme: 'light', lang: 'en', width: 1280 },
  { name: 'RTL on a phone', theme: 'dark', lang: 'ar', width: 390 },
]) {
  test(`the schedule panel fits in ${variant.name}`, async ({ page }, testInfo) => {
    await openSchedulePanel(page, {
      theme: variant.theme,
      lang: variant.lang,
      width: variant.width,
      height: 900,
    });
    if (variant.lang === 'ar') {
      await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
      await expect(page.locator('#dashCompScheduleFillDefault')).toHaveText(
        'تعبئة الجدول الافتراضي لأسبوعين'
      );
    }
    const form = page.locator('#dashCompScheduleForm');
    const overflow = await form.evaluate((node) => node.scrollWidth - node.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    const box = await page.locator('#dashCompScheduleFillDefault').boundingBox();
    expect(box.height).toBeGreaterThanOrEqual(44);
    await form.screenshot({
      path: testInfo.outputPath(`schedule-${variant.theme}-${variant.lang}.png`),
    });
  });
}

test('the member page formats phase times in UTC−2 and marks Artifact Power optional', async ({
  page,
}) => {
  await page.route('https://www.googletagmanager.com/**', (route) => route.abort());
  await page.addInitScript(() => {
    localStorage.setItem('vts_maintenance_bypass', '1');
    localStorage.setItem('vts_hero_lang', 'en');
  });
  await page.goto('/vtsscore.html', { waitUntil: 'load' });
  const artifact = page.locator('label[for="vtsScoreSignupArtifactPower"] span');
  await expect(artifact).toHaveText('Artifact Power (optional)');
  await expect(page.locator('#vtsScoreSignupArtifactPower')).toHaveAttribute(
    'max',
    '1000000000000000'
  );
  const formatted = await page.evaluate(async () => {
    const { formatGameTime } = await import('/js/vts-score-competition.js');
    return [
      formatGameTime(Date.parse('2026-10-06T02:00:00Z'), 'en'),
      formatGameTime(Date.parse('2026-10-06T01:59:00Z'), 'en'),
    ];
  });
  expect(formatted).toEqual(['06 Oct 00:00', '05 Oct 23:59']);
});
