import { expect, test } from '@playwright/test';

test('reward poster measures long headings, categories and Hall of Fame without collisions', async ({
  page,
}, testInfo) => {
  await page.route('**/poster-fixture.html', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<canvas id="poster"></canvas>' })
  );
  await page.goto('/poster-fixture.html');
  const geometry = await page.evaluate(async () => {
    const { drawTop20Poster, measurePosterLayout } = await import('/js/eden-top20-poster.js');
    const canvas = document.querySelector('canvas');
    const categories = [
      { key: 'support', label: 'Support and alliance duty', count: 4 },
      { key: 'contribution', label: 'Total seasonal contribution', count: 10 },
      { key: 'management', label: 'R4 / Management winners', count: 3 },
      { key: 'team', label: 'Team Players winners', count: 3 },
    ];
    const model = {
      kicker: 'VTS 1097 · Eden X8',
      title: 'Final Top 20 — Season Rewards',
      subtitle:
        'A season of contribution, teamwork and alliance achievement. Thank you to every member.',
      dateLabel: 'October 11, 2026',
      footer: 'roc-vts.com · VTS 1097',
      congrats: 'Congratulations to our season winners!',
      columns: {
        rank: '#',
        player: 'Alliance member',
        group: 'Reward category',
        reward: 'Reward tier',
        score: 'Final score',
        breakdown: 'Contribution and duty details',
      },
      categories,
      rows: Array.from({ length: 20 }, (_, index) => {
        const category = categories[index < 4 ? 0 : index < 14 ? 1 : index < 17 ? 2 : 3];
        return {
          rank: index + 1,
          name:
            index === 0
              ? 'Alexandria Stormbringer of the Northern Alliance'
              : `Season Winner ${index + 1}`,
          tag: index === 0 ? 'R5' : index === 14 ? 'R4' : '',
          category: category.key,
          categoryLabel: category.label,
          reward: index === 0 ? 'guild_master' : 'core',
          rewardLabel: index === 0 ? 'Guild Master Reward' : 'Core Rewards',
          scoreValue: index < 14 ? '128,450' : '',
          scoreLabel: index < 14 ? 'Weighted contribution' : '',
          breakdown:
            index < 14
              ? ['Contribution 98.4K · Final rank #12', 'Banners 16 · Pathing 24 · Shield walls 12']
              : ['Vote rank #1'],
        };
      }),
      hallOfFame: {
        title: 'Hall of Fame',
        copy: 'Honoring members who passed their premium reward to another teammate. Your contribution makes the entire alliance stronger.',
        entries: [
          {
            name: 'Northern Alliance Veteran',
            tag: 'R4',
            detail: 'Passed premium reward to a teammate',
          },
          { name: 'Season Champion', tag: 'R5', detail: 'Final contribution rank #2' },
          {
            name: 'A Very Long Multilingual Player Name',
            detail: 'Generosity and exceptional teamwork',
          },
        ],
      },
    };
    const layout = measurePosterLayout(canvas.getContext('2d'), model);
    drawTop20Poster(canvas, model);
    return {
      height: canvas.height,
      width: canvas.width,
      ...layout,
      titleLines: layout.titleLines.length,
      subtitleLines: layout.subtitleLines.length,
      chipRows: layout.chipRows.length,
    };
  });
  expect(geometry.width).toBe(1600);
  expect(geometry.rowsY).toBeGreaterThan(geometry.tableHeadY + 30);
  expect(geometry.tableHeadY).toBeGreaterThan(geometry.chipsY + geometry.chipRows * 50);
  expect(geometry.hallY).toBeGreaterThan(geometry.rowsBottom + 24);
  expect(geometry.height).toBeGreaterThan(geometry.footerY + 100);
  await page
    .locator('canvas')
    .screenshot({ path: testInfo.outputPath('eden-x8-rewards-poster.png') });
});
