import { expect, test } from '@playwright/test';

const quickNavKeys = ['rewards', 'vote', 'my-stats', 'team', 'guild-contribution', 'public'];

const localizedQuickNavLabels = {
  en: ['Rewards', 'Vote', 'My Stats', 'Team MVPs', 'Guild Contribution', 'Analysis'],
  ru: ['Награды', 'Голосовать', 'Моя статистика', 'MVP команды', 'Вклад гильдии', 'Анализ'],
  ar: ['المكافآت', 'تصويت', 'إحصائياتي', 'أفضل الفريق', 'مساهمة التحالف', 'التحليل'],
};

const localizedTopPerformerTitles = {
  en: 'Top Performers',
  ru: 'Лучшие результаты',
  ar: 'أفضل الأداء',
};

const quickNavTargetSelectors = {
  rewards: '#edenX1RewardFlowPanel',
  vote: '#edenX1VoteRail',
  'my-stats': '#edenX1MyStatsCard',
  team: '#edenX1TopNamesOverview',
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
].map((name, index) => ({
  rank: String(index + 1),
  name,
  guild: 'VTS X1',
  contribution: String(500000 - index * 10000),
}));

const edenFixture = {
  date: '2026-07-15',
  r5Season: 'season-2026',
  contributionRecords: [
    {
      id: 'p1-navigation-runtime',
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

async function openReadOnlyEden(page, { language = 'en', width = 980 } = {}) {
  const firestoreRequests = [];

  await page.setViewportSize({ width, height: 900 });
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
  await page.waitForFunction(
    () =>
      typeof window.setEdenX1DataForTest === 'function' &&
      document.querySelector('[data-reward-view="team"]')?.dataset.rewardBound === '1'
  );
  await page.evaluate((fixture) => window.setEdenX1DataForTest(fixture), edenFixture);

  await expect(page.locator('.eden-x1-quicknav')).toBeVisible();
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

test('quick navigation moves keyboard focus to each focus-enabled destination', async ({
  page,
}) => {
  const firestoreRequests = await openReadOnlyEden(page, { width: 980 });

  await activateQuickNavWithKeyboard(page, 'rewards', 'edenX1RewardFlowPanel');
  await activateQuickNavWithKeyboard(page, 'vote', 'edenX1VoterName');
  await activateQuickNavWithKeyboard(page, 'my-stats', 'edenX1MyStatsSearch');
  await activateQuickNavWithKeyboard(page, 'team', 'edenX1TopNamesOverview');
  await activateQuickNavWithKeyboard(page, 'guild-contribution', 'edenX1PublicWeightedSearch');
  await activateQuickNavWithKeyboard(page, 'public', 'edenX1TopPerformersCard');

  expect(firestoreRequests).toEqual([]);
});

test('mobile source, visual, keyboard, and landmark order agree', async ({ page }) => {
  const firestoreRequests = await openReadOnlyEden(page, { width: 390 });
  await page.locator('[data-reward-view="contribution"]').click();
  await expect(page.locator('#edenX1TableSearch')).toBeVisible();
  const orderedRegionIds = [
    'edenX1RewardFlowPanel',
    'dashWeightedContributionPanel',
    'edenX1VoteRail',
    'edenX1PublicOverview',
    'edenX1PublicDashboard',
  ];

  const order = await page.evaluate((ids) => {
    const section = document.querySelector('#ocrDashboardSection');
    const elements = ids.map((id) => document.getElementById(id));
    if (!section || elements.some((element) => !element)) return null;
    return {
      source: elements.map((element) => Array.from(section.children).indexOf(element)),
      visual: elements.map((element) => element.getBoundingClientRect().top + window.scrollY),
      positiveTabIndexes: section.querySelectorAll(
        '[tabindex]:not([tabindex="0"]):not([tabindex="-1"])'
      ).length,
    };
  }, orderedRegionIds);

  expect(order).not.toBeNull();
  expect(order.source).toEqual([...order.source].sort((a, b) => a - b));
  expect(order.visual).toEqual([...order.visual].sort((a, b) => a - b));
  expect(order.positiveTabIndexes).toBe(0);

  await expect(page.getByRole('navigation', { name: 'Eden X1 section navigation' })).toBeVisible();
  await expect(page.getByRole('complementary', { name: 'Team player voting' })).toBeVisible();
  await expect(
    page.getByRole('region', { name: 'Planned Top 20 reward distribution' })
  ).toBeVisible();

  const keyboardBoundary = await page.evaluate(() => {
    const selector = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(',');
    const isTabbable = (element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return (
        element.tabIndex >= 0 &&
        !element.hidden &&
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        rect.width > 0 &&
        rect.height > 0
      );
    };
    const focusables = (root) => Array.from(root.querySelectorAll(selector)).filter(isTabbable);
    const weighted = document.getElementById('dashWeightedContributionPanel');
    const voteRail = document.getElementById('edenX1VoteRail');
    const weightedFocusables = weighted ? focusables(weighted) : [];
    const voteFocusables = voteRail ? focusables(voteRail) : [];
    const lastWeighted = weightedFocusables.at(-1);
    const firstVote = voteFocusables[0];
    if (!lastWeighted || !firstVote) return null;
    if (!lastWeighted.id) lastWeighted.id = 'p1LastWeightedFocusable';
    if (!firstVote.id) firstVote.id = 'p1FirstVoteFocusable';
    lastWeighted.focus();
    return { lastWeightedId: lastWeighted.id, firstVoteId: firstVote.id };
  });

  expect(keyboardBoundary).not.toBeNull();
  await expect.poll(() => activeElementId(page)).toBe(keyboardBoundary.lastWeightedId);
  await page.keyboard.press('Tab');
  await expect.poll(() => activeElementId(page)).toBe(keyboardBoundary.firstVoteId);
  expect(firestoreRequests).toEqual([]);
});

test('980/981 placement and EN/RU/AR quick-nav anchors stay intact without overflow', async ({
  page,
}) => {
  const firestoreRequests = await openReadOnlyEden(page, { width: 980 });

  const mobileBoundary = await page.evaluate(() => {
    const section = document.querySelector('#ocrDashboardSection');
    const ids = [
      'dashWeightedContributionPanel',
      'edenX1VoteRail',
      'edenX1PublicOverview',
      'edenX1PublicDashboard',
    ];
    const elements = ids.map((id) => document.getElementById(id));
    if (!section || elements.some((element) => !element)) return null;
    return {
      display: getComputedStyle(section).display,
      source: elements.map((element) => Array.from(section.children).indexOf(element)),
      visual: elements.map((element) => element.getBoundingClientRect().top + window.scrollY),
    };
  });

  expect(mobileBoundary).not.toBeNull();
  expect(mobileBoundary.display).not.toBe('grid');
  expect(mobileBoundary.source).toEqual([...mobileBoundary.source].sort((a, b) => a - b));
  expect(mobileBoundary.visual).toEqual([...mobileBoundary.visual].sort((a, b) => a - b));

  await page.setViewportSize({ width: 981, height: 900 });
  const desktopBoundary = await page.evaluate(() => {
    const section = document.querySelector('#ocrDashboardSection');
    const progression = document.querySelector('#edenX1Progression');
    const weighted = document
      .querySelector('#dashWeightedContributionPanel')
      ?.getBoundingClientRect();
    const rail = document.querySelector('#edenX1VoteRail')?.getBoundingClientRect();
    const overview = document.querySelector('#edenX1PublicOverview')?.getBoundingClientRect();
    const dashboard = document.querySelector('#edenX1PublicDashboard')?.getBoundingClientRect();
    if (!section || !progression || !weighted || !rail || !overview || !dashboard) return null;
    const style = getComputedStyle(section);
    return {
      display: style.display,
      gridTemplateAreas: style.gridTemplateAreas,
      progressionGridArea: getComputedStyle(progression).gridArea,
      weightedWidth: weighted.width,
      weightedRight: weighted.right,
      railLeft: rail.left,
      overviewRight: overview.right,
      dashboardWidth: dashboard.width,
    };
  });

  expect(desktopBoundary).not.toBeNull();
  expect(desktopBoundary).toMatchObject({
    display: 'grid',
    progressionGridArea: 'progress',
  });
  expect(desktopBoundary.gridTemplateAreas).toContain('"progress progress"');
  expect(desktopBoundary.weightedRight).toBeLessThan(desktopBoundary.railLeft);
  expect(desktopBoundary.overviewRight).toBeLessThan(desktopBoundary.railLeft);
  expect(desktopBoundary.dashboardWidth).toBeGreaterThan(desktopBoundary.weightedWidth);

  const languageTags = { en: 'en-US', ru: 'ru-RU', ar: 'ar' };
  for (const language of ['en', 'ru', 'ar']) {
    if (language !== 'en') await page.locator('#languageSelect').selectOption(language);
    await expect(page.locator('html')).toHaveAttribute('lang', languageTags[language]);
    await expect(page.locator('html')).toHaveAttribute('dir', language === 'ar' ? 'rtl' : 'ltr');
    await expect(page.locator('.eden-x1-quicknav-chip')).toHaveText(
      localizedQuickNavLabels[language]
    );
    await expect(page.locator('#edenX1PublicWeightedCard')).toBeVisible();
    await expect(page.locator('#edenX1TopPerformersCard')).toBeVisible();
    await expect(page.locator('#edenX1TopPerformersCard .dash-card-title')).toHaveText(
      localizedTopPerformerTitles[language]
    );

    for (const width of [390, 981]) {
      await page.setViewportSize({ width, height: 900 });
      const integrity = await page.evaluate(
        ({ keys, selectors }) => {
          const nav = document.querySelector('.eden-x1-quicknav');
          const buttons = Array.from(nav?.querySelectorAll('[data-quicknav]') || []);
          const navRect = nav?.getBoundingClientRect();
          return {
            keys: buttons.map((button) => button.dataset.quicknav),
            targets: Object.fromEntries(
              Object.entries(selectors).map(([key, selector]) => [
                key,
                Boolean(document.querySelector(selector)),
              ])
            ),
            documentOverflow: document.documentElement.scrollWidth > window.innerWidth + 2,
            chipsInsideNav:
              Boolean(navRect) &&
              buttons.every((button) => {
                const rect = button.getBoundingClientRect();
                return (
                  rect.left >= navRect.left - 1 &&
                  rect.right <= navRect.right + 1 &&
                  rect.top >= navRect.top - 1 &&
                  rect.bottom <= navRect.bottom + 1
                );
              }),
            expectedCount: keys.length,
          };
        },
        { keys: quickNavKeys, selectors: quickNavTargetSelectors }
      );

      expect(integrity.keys).toEqual(quickNavKeys);
      expect(integrity.targets).toEqual(Object.fromEntries(quickNavKeys.map((key) => [key, true])));
      expect(integrity.documentOverflow).toBe(false);
      expect(integrity.chipsInsideNav).toBe(true);
      expect(integrity.keys).toHaveLength(integrity.expectedCount);
    }
  }

  expect(firestoreRequests).toEqual([]);
});
