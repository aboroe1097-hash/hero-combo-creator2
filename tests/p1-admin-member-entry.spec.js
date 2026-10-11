import { test, expect } from '@playwright/test';
import { installAdminCloudFixture } from './helpers/admin-cloud-fixture.js';
import { readCompetitionAdminEntry } from '../functions/src/competition-admin-entry.js';

test.setTimeout(180000);
test.use({ actionTimeout: 30000, reducedMotion: 'reduce' });

for (const mode of ['power-final', 'power-baseline']) {
  test(`Admin submits ${mode} for an existing member with a reviewed payload`, async ({ page }) => {
    const saved = [];
    await page.exposeFunction('validateEntry', (body) => {
      readCompetitionAdminEntry(body);
      saved.push(body);
    });
    await page.goto('/maintenance.html');
    const screenshot = await page.screenshot();
    await page.evaluate(async (mode) => {
      const { openCompetitionAdminEntry } = await import('/js/competition-admin-entry.js');
      const { VTS_SCORE_POWER_FIELDS } = await import('/js/vts-score-model.js');
      const { renderBohSignupRows } = await import('/js/boh-signup-admin.js');
      const { createVtsScoreAdminView } = await import('/js/vts-score-admin-view.js');
      const stats = Object.fromEntries(VTS_SCORE_POWER_FIELDS.map((field) => [field, 1000]));
      const player = {
        submissionUid: 'member-1',
        uid: 'member-1',
        gameName: '王 محمد',
        status: 'submitted',
        revision: 3,
        stats,
      };
      const snapshot = {
        season: 'competition-12',
        submissions: [player],
        raceScores: [],
        settings: {},
      };
      document.body.innerHTML =
        '<main id="ocrDashboardRoot"><div id="test-entry-root"></div></main>';
      const root = document.querySelector('#test-entry-root');
      const open = () =>
        openCompetitionAdminEntry({
          root,
          snapshot,
          submissionUid: player.submissionUid,
          mode,
          endpoint: '/fake-admin',
          post: async (url, body) => {
            if (url === '/fake-admin') {
              await window.validateEntry(body);
              return { entry: { revision: 4 } };
            }
            return {
              schemaVersion: 1,
              extracted: { ...stats, gameName: 'Wrong OCR name' },
              confidence: Object.fromEntries(
                [...VTS_SCORE_POWER_FIELDS, 'gameName'].map((field) => [field, 0.9])
              ),
              warnings: [],
              requestId: 'ocr-test-1',
            };
          },
          onSaved: async () => {
            window.entrySaved = true;
          },
        });
      if (mode === 'power-final') {
        createVtsScoreAdminView({ onEntry: open }).render(root, snapshot);
      } else {
        root.innerHTML = renderBohSignupRows([player], (_key, _vars, fallback) => fallback);
        root.querySelector('[data-boh-signup-power]').addEventListener('click', open);
      }
    }, mode);
    await page
      .locator(mode === 'power-final' ? '[data-vts-entry]' : '[data-boh-signup-power]')
      .click();
    const editor = page.locator('[data-admin-power-editor]');
    await expect(editor).toContainText('王 محمد');
    await expect(editor.locator('[name="action"]')).toHaveValue(mode);
    if (mode === 'power-baseline') {
      await editor
        .locator('[name="image"]')
        .setInputFiles({ name: 'powers.png', mimeType: 'image/png', buffer: screenshot });
      await editor.locator('[data-read-image]').click();
      await expect(editor.locator('[data-entry-status]')).toContainText('Screenshot read');
    } else {
      for (const field of [
        'totalCastlePower',
        'troopPower',
        'buildingPower',
        'technologyPower',
        'heroCombatPower',
        'dragonPower',
        'unitSpecialtyPower',
      ]) {
        await editor.locator(`[name="${field}"]`).fill('2000');
      }
    }
    await editor.locator('summary').click();
    await editor.locator('[name="FootmenT10"]').fill('100');
    await editor
      .locator('[name="reason"]')
      .fill('Member asked leadership to submit missing screenshot');
    await editor.locator('[name="acceptLate"]').check();
    await editor.locator('[name="reviewed"]').check();
    await editor.getByRole('button', { name: 'Save for member' }).click();
    await expect(editor).toHaveCount(0);
    expect(saved).toHaveLength(1);
    expect(saved[0].submissionUid).toBe('member-1');
    expect(saved[0].gameName).toBe('王 محمد');
    expect(saved[0].signupRevision).toBe(3);
    expect(saved[0].expectedRevision).toBe(mode === 'power-final' ? 0 : 3);
    expect(saved[0].powerValues.troopPower).toBe((mode === 'power-final' ? 2000 : 1000) + 750);
    expect(saved[0].method).toBe(mode === 'power-final' ? 'manual' : 'screenshot');
    expect(await page.evaluate(() => window.entrySaved)).toBe(true);
  });
}

for (const theme of ['dark', 'light']) {
  test(`both real Admin entrypoints open the member power editor in ${theme}`, async ({
    page,
  }, testInfo) => {
    await installAdminCloudFixture(page, { theme });
    await page.addInitScript(() => {
      const stats = {
        totalCastlePower: 1000,
        troopPower: 100,
        buildingPower: 100,
        technologyPower: 100,
        heroCombatPower: 100,
        dragonPower: 100,
        unitSpecialtyPower: 100,
      };
      window.__auditRecords.set('boh_allstar_config/current', {
        activeSeason: 'competition-12',
        scoringProfileId: 'boh-2026-v1',
      });
      window.__auditRecords.set('boh_allstar/competition-12/submissions/member-1', {
        uid: 'member-1',
        submissionUid: 'member-1',
        gameName: '王 محمد',
        status: 'submitted',
        revision: 3,
        stats,
      });
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/admin.html', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#dashApp')).toBeVisible({ timeout: 30000 });
    for (const [tool, button, mode] of [
      ['vtsScore', '[data-vts-entry="member-1"]', 'power-final'],
      ['bohSignups', '[data-boh-signup-power="member-1"]', 'power-baseline'],
    ]) {
      await page.locator('#dashToolSelect').selectOption(tool);
      await page.locator(button).click();
      const editor = page.locator('[data-admin-power-editor]:visible');
      await expect(editor).toContainText('王 محمد');
      await expect(editor.locator('[name="action"]')).toHaveValue(mode);
      expect(await editor.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
      await page.screenshot({ path: testInfo.outputPath(`${tool}-member-editor.png`) });
      await editor.locator('[data-cancel]').click();
    }
  });
}
