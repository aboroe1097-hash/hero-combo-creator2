import { expect, test } from '@playwright/test';

const archiveQuickNavKeys = ['rewards', 'my-stats', 'guild-contribution', 'public'];

const localizedQuickNavLabels = {
  en: ['Final Top 20', 'Find Player', 'Guild Contribution', 'Analysis'],
  ru: ['Финальный Топ-20', 'Найти игрока', 'Вклад гильдии', 'Анализ'],
  ar: ['أفضل 20 النهائية', 'البحث عن لاعب', 'مساهمة التحالف', 'التحليل'],
};

const localizedTopPerformerTitles = {
  en: 'Top Performers',
  ru: 'Лучшие результаты',
  ar: 'أفضل الأداء',
};

const archiveQuickNavTargetSelectors = {
  rewards: '#edenX1FinalRewardsCard',
  'my-stats': '#edenX1MyStatsCard',
  'guild-contribution': '#edenX1PublicWeightedCard',
  public: '#edenX1TopPerformersCard',
};

const members = [
  'Alpha',
  'Bravo',
  'Charlie',
  'Delta',
  'Echo',
  'Foxtrot',
  'Golf',
  'Hotel',
  'India',
  'Juliet',
  'Kilo',
  'Lima',
  'Mike',
  'November',
  'Oscar',
  'Papa',
  'Quebec',
  'Romeo',
  'Sierra',
  'Tango',
  'Uniform',
  'Victor',
].map((name, index) => ({
  rank: String(index + 1),
  name,
  guild: 'VTS X1',
  contribution: String(700000 - index * 10000),
}));

const edenFixture = {
  date: '2026-07-15',
  r5Season: 'season-2026',
  contributionRecords: [
    {
      id: 'p1-navigation-runtime-archive',
      date: '2026-07-15',
      premiumSlots: 20,
      entries: members,
    },
  ],
  dutyRecords: [],
  publicConductAdjustments: [],
  attacks: [
    {
      id: 'p1-navigation-attack',
      structure_name: 'Large Town',
      structure_level: 'Lv4',
      game_time: '15/07/2026, 20:00 GT',
      total_demolition: 120000,
      players_count: 3,
      players: [
        { name: 'Alpha', value: 60000, rank: 1 },
        { name: 'Bravo', value: 40000, rank: 2 },
        { name: 'Charlie', value: 20000, rank: 3 },
      ],
    },
  ],
};

const structureDetailFixture = {
  ...edenFixture,
  attacks: [
    {
      id: 'p1-structure-detail-small-town-1',
      structure_name: 'Small Town',
      structure_level: 'Lv2',
      game_time: '15/07/2026, 18:00 GT',
      total_demolition: 17890123,
      players_count: 6,
      players: [
        { name: 'Kika', value: 8765432, rank: 1 },
        { name: 'Командир 長い名前 Ωmega-队长-Extended', value: 7654321, rank: 2 },
        { name: 'Tagged-R4-style [VTS-R4] Player', value: 6543210, rank: 3 },
        { name: 'Delta', value: 5432109, rank: 4 },
        { name: 'Echo', value: 4321098, rank: 5 },
        { name: 'Foxtrot', value: 3210987, rank: 6 },
      ],
    },
    {
      id: 'p1-structure-detail-small-town-2',
      structure_name: 'Small Town',
      structure_level: 'Lv2',
      game_time: '15/07/2026, 19:00 GT',
      total_demolition: 16789012,
      players_count: 6,
      players: [
        { name: 'Kika', value: 8123456, rank: 1 },
        { name: 'Командир 長い名前 Ωmega-队长-Extended', value: 7012345, rank: 2 },
        { name: 'Tagged-R4-style [VTS-R4] Player', value: 6123456, rank: 3 },
        { name: 'Golf', value: 5123456, rank: 4 },
        { name: 'Hotel', value: 4123456, rank: 5 },
        { name: 'India', value: 3123456, rank: 6 },
      ],
    },
    {
      id: 'p1-structure-detail-large-town-control',
      structure_name: 'Large Town',
      structure_level: 'Lv4',
      game_time: '15/07/2026, 20:00 GT',
      total_demolition: 120000,
      players_count: 3,
      players: [
        { name: 'Alpha', value: 60000, rank: 1 },
        { name: 'Bravo', value: 40000, rank: 2 },
        { name: 'Charlie', value: 20000, rank: 3 },
      ],
    },
  ],
};

async function openArchiveEden(
  page,
  { language = 'en', width = 980, height = 900, fixture = edenFixture } = {}
) {
  const firestoreRequests = [];

  await page.setViewportSize({ width, height });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  page.on('request', (request) => {
    if (request.url().startsWith('https://firestore.googleapis.com/')) {
      firestoreRequests.push(`${request.method()} ${request.url()}`);
    }
  });
  await page.route('https://www.googletagmanager.com/**', (route) => route.abort());
  await page.addInitScript((initialLanguage) => {
    window.VTS_EDEN_X1_TEST_MODE = true;
    localStorage.setItem('vts_maintenance_bypass', '1');
    localStorage.setItem('vts_hero_lang', initialLanguage);
    localStorage.setItem('vts_theme', 'dark');
    localStorage.setItem('vts_weighted_contribution_compact', '0');
    localStorage.removeItem('vts_eden_x1_vote_season-2026_team_players');
  }, language);

  await page.goto('/eden-x1.html', { waitUntil: 'load' });
  await page.waitForFunction(() => typeof window.setEdenX1DataForTest === 'function');
  await page.evaluate((data) => window.setEdenX1DataForTest(data), fixture);

  await expect(page.locator('body')).toHaveAttribute('data-eden-season-state', 'archive');
  await expect(page.locator('.eden-x1-quicknav')).toBeVisible();
  await expect(page.locator('#edenX1FinalRewardsCard')).toBeVisible();
  await expect(page.locator('#edenX1TopPerformersCard')).toBeVisible();
  expect(firestoreRequests).toEqual([]);

  return firestoreRequests;
}

async function activeElementId(page) {
  return page.evaluate(() => document.activeElement?.id || '');
}

async function activateQuickNavWithKeyboard(page, key, expectedFocusId) {
  const button = page.locator(`[data-quicknav="${key}"]`);
  await button.focus();
  await page.keyboard.press('Enter');
  await expect.poll(() => activeElementId(page), { timeout: 3000 }).toBe(expectedFocusId);
  await expect(page.locator('#edenX1NavLoader')).toBeHidden({ timeout: 3000 });
}

test('archive quick navigation has four actions and focus-enabled destinations', async ({
  page,
}) => {
  const firestoreRequests = await openArchiveEden(page, { width: 980 });

  await expect(page.locator('.eden-x1-quicknav-chip:visible')).toHaveText(
    localizedQuickNavLabels.en
  );
  await activateQuickNavWithKeyboard(page, 'rewards', 'edenX1FinalRewardsCard');
  await activateQuickNavWithKeyboard(page, 'my-stats', 'edenX1MyStatsSearch');
  await activateQuickNavWithKeyboard(page, 'guild-contribution', 'edenX1PublicWeightedSearch');
  await activateQuickNavWithKeyboard(page, 'public', 'edenX1TopPerformersCard');

  expect(firestoreRequests).toEqual([]);
});

test('archive hides season-only voting and reward-flow surfaces while preserving public dashboard', async ({
  page,
}) => {
  const firestoreRequests = await openArchiveEden(page, { width: 390 });

  await expect(page.locator('#edenX1RewardFlowPanel')).toBeHidden();
  await expect(page.locator('#edenX1VoteRail')).toBeHidden();
  await expect(page.locator('#edenX1Podium')).toBeHidden();
  await expect(page.locator('#edenX1Progression')).toBeHidden();
  await expect(page.locator('#edenX1PublicOverview')).toBeHidden();
  await expect(page.locator('[data-quicknav="vote"]')).toBeHidden();
  await expect(page.locator('[data-quicknav="team"]')).toBeHidden();
  await expect(page.locator('#edenX1FinalRewardsCard')).toBeVisible();
  await expect(page.locator('.eden-x1-announcement-remaining')).toHaveCount(0);
  await expect(page.locator('#edenX1MyStatsCard')).toBeVisible();
  await expect(page.locator('#edenX1PublicWeightedCard')).toBeVisible();
  await expect(page.locator('#edenX1TopPerformersCard')).toBeVisible();
  await expect(page.locator('#edenX1PublicDashboard')).toBeVisible();
  await expect(page.locator('body')).not.toContainText(
    /Voting closed|Vote closed|Demo view|not final/i
  );

  const order = await page.evaluate(() => {
    const section = document.querySelector('#ocrDashboardSection');
    const ids = ['dashWeightedContributionPanel', 'edenX1PublicDashboard'];
    const elements = ids.map((id) => document.getElementById(id));
    if (!section || elements.some((element) => !element)) return null;
    return {
      source: elements.map((element) => Array.from(section.children).indexOf(element)),
      visual: elements.map((element) => element.getBoundingClientRect().top + window.scrollY),
      positiveTabIndexes: section.querySelectorAll(
        '[tabindex]:not([tabindex="0"]):not([tabindex="-1"])'
      ).length,
    };
  });

  expect(order).not.toBeNull();
  expect(order.source).toEqual([...order.source].sort((a, b) => a - b));
  expect(order.visual).toEqual([...order.visual].sort((a, b) => a - b));
  expect(order.positiveTabIndexes).toBe(0);
  expect(firestoreRequests).toEqual([]);
});

test('archive structure detail modal keeps mobile player rows inside bounds', async ({ page }) => {
  const firestoreRequests = await openArchiveEden(page, {
    width: 390,
    height: 844,
    fixture: structureDetailFixture,
  });

  const structureControl = page
    .locator('#ocrDashboardRoot .eden-x1-structures-card')
    .getByRole('button', { name: /Open Small Town Lv2 details/ })
    .first();
  await structureControl.scrollIntoViewIfNeeded();
  await structureControl.click();

  const modal = page.locator('#edenX1PublicModal');
  await expect(modal).toHaveClass(/active/);
  await expect(page.locator('#edenX1PublicModalTitle')).toContainText(/Small Town.*Lv2/);

  const statGrid = modal.locator('.eden-x1-structure-stat-grid');
  await expect(statGrid).toBeVisible();
  await expect
    .poll(() =>
      statGrid.evaluate((grid) => getComputedStyle(grid).gridTemplateColumns.split(' ').length)
    )
    .toBe(2);

  const rows = modal.locator('.eden-x1-structure-player-row:visible');
  await expect(rows.first()).toBeVisible();
  expect(await rows.count()).toBeGreaterThanOrEqual(6);
  await expect(modal).toContainText('Командир 長い名前 Ωmega-队长-Extended');
  await expect(modal).toContainText('R4');

  const layout = await modal.evaluate((modalElement) => {
    const content = modalElement.querySelector('.dash-modal-content');
    const body = modalElement.querySelector('.dash-modal-body');
    const rows = Array.from(modalElement.querySelectorAll('.eden-x1-structure-player-row')).filter(
      (row) => {
        const rect = row.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      }
    );
    const modalRect = content.getBoundingClientRect();
    const failures = [];
    const within = (inner, outer) => inner.left >= outer.left - 1 && inner.right <= outer.right + 1;

    rows.forEach((row, index) => {
      const rowRect = row.getBoundingClientRect();
      if (!within(rowRect, modalRect)) failures.push(`row ${index + 1} outside modal`);
      if (rowRect.height < 44 || rowRect.height > 76) {
        failures.push(`row ${index + 1} height ${Math.round(rowRect.height)}`);
      }
      [
        '.eden-x1-structure-player-rank',
        '.eden-x1-structure-player-name',
        '.eden-x1-structure-player-score',
        '.eden-x1-structure-player-hits',
      ].forEach((selector) => {
        const cell = row.querySelector(selector);
        const cellRect = cell?.getBoundingClientRect();
        if (!cellRect || !within(cellRect, rowRect)) {
          failures.push(`row ${index + 1} ${selector} outside row`);
        }
      });
    });

    return {
      failures,
      rowCount: rows.length,
      bodyOverflow: body.scrollWidth > body.clientWidth + 1,
      contentOverflow: content.scrollWidth > content.clientWidth + 1,
      modalOverflow: modalElement.scrollWidth > modalElement.clientWidth + 1,
    };
  });

  expect(layout.rowCount).toBeGreaterThanOrEqual(6);
  expect(layout.failures).toEqual([]);
  expect(layout.bodyOverflow).toBe(false);
  expect(layout.contentOverflow).toBe(false);
  expect(layout.modalOverflow).toBe(false);

  await page.locator('#edenX1PublicModalClose').click();
  await expect(modal).toBeHidden();
  expect(firestoreRequests).toEqual([]);
});

test('archive EN/RU/AR labels and 390/981 layouts avoid overflow', async ({ page }) => {
  const firestoreRequests = await openArchiveEden(page, { width: 981 });

  const languageTags = { en: 'en-US', ru: 'ru-RU', ar: 'ar' };
  for (const language of ['en', 'ru', 'ar']) {
    if (language !== 'en') await page.locator('#languageSelect').selectOption(language);
    await expect(page.locator('html')).toHaveAttribute('lang', languageTags[language]);
    await expect(page.locator('html')).toHaveAttribute('dir', language === 'ar' ? 'rtl' : 'ltr');
    await expect(page.locator('.eden-x1-quicknav-chip:visible')).toHaveText(
      localizedQuickNavLabels[language]
    );
    await expect(page.locator('#edenX1TopPerformersCard .dash-card-title')).toHaveText(
      localizedTopPerformerTitles[language]
    );

    for (const width of [390, 981]) {
      await page.setViewportSize({ width, height: 900 });
      const integrity = await page.evaluate(
        ({ keys, selectors }) => {
          const nav = document.querySelector('.eden-x1-quicknav');
          const buttons = Array.from(nav?.querySelectorAll('[data-quicknav]') || []).filter(
            (button) => getComputedStyle(button).display !== 'none' && !button.hidden
          );
          const navRect = nav?.getBoundingClientRect();
          const section = document.querySelector('#ocrDashboardSection');
          return {
            keys: buttons.map((button) => button.dataset.quicknav),
            targets: Object.fromEntries(
              Object.entries(selectors).map(([key, selector]) => [
                key,
                Boolean(document.querySelector(selector)),
              ])
            ),
            documentOverflow: document.documentElement.scrollWidth > window.innerWidth + 2,
            rootOverflow: document.body.scrollWidth > window.innerWidth + 2,
            quickNavColumns: getComputedStyle(nav).gridTemplateColumns.split(' ').length,
            panelColumns: getComputedStyle(section).gridTemplateColumns.split(' ').length,
            chipsInsideNav:
              Boolean(navRect) &&
              buttons.every((button) => {
                const rect = button.getBoundingClientRect();
                return (
                  rect.left >= navRect.left - 1 &&
                  rect.right <= navRect.right + 1 &&
                  rect.top >= navRect.top - 1 &&
                  rect.bottom <= navRect.bottom + 1 &&
                  rect.height >= 43
                );
              }),
          };
        },
        { keys: archiveQuickNavKeys, selectors: archiveQuickNavTargetSelectors }
      );

      expect(integrity.keys).toEqual(archiveQuickNavKeys);
      expect(integrity.targets).toEqual(
        Object.fromEntries(archiveQuickNavKeys.map((key) => [key, true]))
      );
      expect(integrity.documentOverflow).toBe(false);
      expect(integrity.rootOverflow).toBe(false);
      expect(integrity.chipsInsideNav).toBe(true);
      expect(integrity.quickNavColumns).toBe(width <= 768 ? 2 : 4);
      if (width >= 981) expect(integrity.panelColumns).toBe(1);
    }
  }

  expect(firestoreRequests).toEqual([]);
});
