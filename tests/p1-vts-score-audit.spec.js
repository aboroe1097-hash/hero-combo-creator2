import { test, expect } from '@playwright/test';
import { writeFileSync } from 'node:fs';

test('Admin exports complete private records, changes cutoff and creates readable winner images', async ({
  page,
}, testInfo) => {
  await page.goto('/maintenance.html');
  await page.evaluate(async () => {
    const { createVtsScoreAdminView } = await import('/js/vts-score-admin-view.js');
    const stats = {
      totalCastlePower: 1000,
      troopPower: 200,
      buildingPower: 100,
      technologyPower: 100,
      heroCombatPower: 100,
      dragonPower: 7_000_000,
      unitSpecialtyPower: 100,
      artifactPower: 100,
      royalTechPower: 100,
    };
    const players = [
      {
        submissionUid: 'large',
        gameName: '⚔️ Very Long Absolute Growth Champion Name 王者荣耀 ⚔️',
        status: 'submitted',
        stats: { ...stats, totalCastlePower: 1_000_000 },
      },
      {
        submissionUid: 'small',
        gameName: 'Percentage Champion — Another Long International Player Name',
        status: 'submitted',
        stats: { ...stats, dragonPower: 6_000_000 },
      },
    ];
    const scores = [
      {
        submissionUid: 'large',
        schemaVersion: 2,
        powerValues: { ...stats, totalCastlePower: 2_000_000 },
      },
      {
        submissionUid: 'small',
        schemaVersion: 2,
        powerValues: { ...stats, totalCastlePower: 20_000 },
      },
    ];
    const snapshot = {
      season: 'season-review-fixture',
      submissions: players,
      raceScores: scores,
      settings: {},
    };
    document.body.innerHTML =
      '<main id="ocrDashboardRoot"><div id="fixture-root"></div><p role="status" id="status"></p></main>';
    document.body.style.cssText =
      'background:#0b1726;color:white;font-family:Arial;padding:16px;margin:0;box-sizing:border-box;display:block';
    const view = createVtsScoreAdminView({
      saveSettings: async (cutoff, revision, _context, warnings) => ({
        dragonTierCutoff: cutoff,
        revision: revision + 1,
        ...warnings,
      }),
      setStatus: (text) => {
        document.querySelector('#status').textContent = text;
      },
    });
    view.render(document.querySelector('#fixture-root'), snapshot);
    window.__scoreFixture = snapshot;
  });
  await page.addStyleTag({ url: '/css/ocr-dashboard-admin.css' });
  await expect(page.locator('[data-vts-cutoff-form]')).toBeVisible();
  const downloadPromise = page.waitForEvent('download');
  await page.locator('[data-vts-audit-export="json"]').click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  const exported = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  expect(exported.records.submissions).toHaveLength(2);
  expect(exported.provenance.private).toBe(true);
  expect(exported.standings.map((row) => row.tier)).toEqual([1, 2]);
  await page.locator('[name="dragonTierCutoff"]').fill('5000000');
  await page.locator('[data-vts-cutoff-form] button').click();
  await expect(page.locator('#status')).toHaveText('Shared Dragon cutoff saved.');
  await expect(page.locator('[data-vts-score-tier="1"]')).toContainText('5,000,000');
  await expect(page.locator('[data-vts-score-tier="2"]')).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true
  );
  await page.locator('[name=dragonTierCutoff]').scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath('vts-score-mobile.png') });
  const pngPromise = page.waitForEvent('download');
  await page.locator('[data-vts-export]').click();
  const png = await pngPromise;
  const imagePath = testInfo.outputPath('vts-score-category-leaders.png');
  await png.saveAs(imagePath);
  await testInfo.attach('category-leaders', { path: imagePath, contentType: 'image/png' });
  // Make the actual downloaded image available for visual inspection.
  const data = await page.evaluate(async () => {
    const { drawVtsScoreLeaderCanvas, buildAdminVtsScoreRows, buildVtsScoreTierSummary } =
      await import('/js/vts-score-admin.js');
    const canvas = document.createElement('canvas');
    const rows = buildAdminVtsScoreRows(
      window.__scoreFixture.submissions,
      window.__scoreFixture.raceScores
    );
    drawVtsScoreLeaderCanvas(canvas, buildVtsScoreTierSummary(rows, 'all'), {
      title: 'VtsScore • Category champions',
      subtitle: 'Absolute and percentage growth winners',
      provenance: 'season-review-fixture • Both tiers • Dragon cutoff 7,000,000 • 2026-10-11 UTC',
    });
    return canvas.toDataURL('image/png').split(',')[1];
  });
  writeFileSync(testInfo.outputPath('vts-score-layout-proof.png'), Buffer.from(data, 'base64'));
});
