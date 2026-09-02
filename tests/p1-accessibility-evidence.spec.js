import { expect, test } from '@playwright/test';

const MAP_SELECT_NAMES = {
  edenDatasetSelect: 'Season',
  edenSectorSelect: 'Sector',
  edenPathColor: 'Path alliance color',
  edenDrawColor: 'Ink color',
  edenTeamFilter: 'Filter structure list by team assignment',
  edenOwnershipFilter: 'Ownership',
  edenZoneFilter: 'Zone',
  edenTypeFilter: 'Structure type',
  edenSortSelect: 'Sort structures',
};

const EDEN_DASHBOARD_FIXTURE = {
  date: '2026-07-15',
  r5Season: 'season-2026',
  contributionRecords: [
    {
      id: 'p1-accessibility-evidence',
      date: '2026-07-15',
      premiumSlots: 20,
      entries: ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot'].map((name, index) => ({
        rank: String(index + 1),
        name,
        guild: 'VTS X1',
        contribution: String(300000 - index * 10000),
      })),
    },
  ],
  exGuildContributions: [],
  dutyRecords: [],
  publicConductAdjustments: [],
  attacks: [
    {
      id: 'p1-accessibility-attack',
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

async function blockExternalBootNoise(page) {
  await page.route('https://www.googletagmanager.com/**', (route) => route.abort());
}

async function openHome(page, path = '/#generator') {
  await blockExternalBootNoise(page);
  await page.addInitScript(() => {
    localStorage.setItem('vts_maintenance_bypass', '1');
    localStorage.setItem('vts_intro_v1_seen', '1');
    localStorage.setItem('vts_eden_dataset', 'season5');
    localStorage.setItem('vts_hero_lang', 'en');
  });
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).toHaveClass(/app-ready/, { timeout: 30000 });
  await page.waitForFunction(() => document.documentElement.dataset.shellNavReady === '1');
}

async function openEdenDashboard(page, language) {
  await page.setViewportSize({ width: 320, height: 844 });
  await blockExternalBootNoise(page);
  await page.addInitScript((selectedLanguage) => {
    window.VTS_EDEN_X1_TEST_MODE = true;
    localStorage.setItem('vts_maintenance_bypass', '1');
    localStorage.setItem('vts_hero_lang', selectedLanguage);
    localStorage.setItem('vts_theme', 'dark');
    navigator.serviceWorker?.getRegistrations?.().then((registrations) => {
      registrations.forEach((registration) => registration.unregister());
    });
  }, language);
  await page.goto('/eden-x1.html', { waitUntil: 'load' });
  await page.waitForFunction(
    () =>
      typeof window.setEdenX1DataForTest === 'function' &&
      document.querySelector('[data-reward-view="team"]')?.dataset.rewardBound === '1',
    null,
    { timeout: 20000 }
  );
  await page.evaluate((fixture) => window.setEdenX1DataForTest(fixture), EDEN_DASHBOARD_FIXTURE);
  await expect(page.locator('#edenX1PublicHeatmapScroll')).toBeVisible({ timeout: 20000 });
}

async function pressRepeatedly(page, key, count = 48) {
  for (let index = 0; index < count; index += 1) await page.keyboard.press(key);
}

async function expectKeyboardInlineEnds(page, scrollport, direction) {
  await scrollport.focus();
  await expect(scrollport).toBeFocused();

  const endKey = direction === 'rtl' ? 'ArrowLeft' : 'ArrowRight';
  const startKey = direction === 'rtl' ? 'ArrowRight' : 'ArrowLeft';
  const inlineState = () =>
    scrollport.evaluate((element) => {
      const maximum = element.scrollWidth - element.clientWidth;
      const rawOffset = element.scrollLeft;
      const inlineOffset = getComputedStyle(element).direction === 'rtl' ? -rawOffset : rawOffset;
      return { inlineOffset, maximum, rawOffset };
    });

  await pressRepeatedly(page, endKey);
  await expect
    .poll(async () => {
      const state = await inlineState();
      return Math.abs(state.maximum - state.inlineOffset);
    })
    .toBeLessThanOrEqual(1);

  await pressRepeatedly(page, startKey);
  await expect
    .poll(async () => Math.abs((await inlineState()).inlineOffset))
    .toBeLessThanOrEqual(1);
}

for (const { language, direction } of [
  { language: 'en', direction: 'ltr' },
  { language: 'ar', direction: 'rtl' },
]) {
  test(`public heatmap reaches both inline ends by keyboard in ${direction}`, async ({ page }) => {
    await openEdenDashboard(page, language);

    const scrollport = page.locator('#edenX1PublicHeatmapScroll');
    await expect(page.locator('html')).toHaveAttribute('dir', direction);
    await expect(scrollport).toHaveAttribute('role', 'region');
    await expect(scrollport).toHaveAccessibleName(/.+/);
    await expect(scrollport).toHaveAttribute('aria-describedby', 'edenX1PublicHeatmapHint');
    await expect(page.locator('#edenX1PublicHeatmapHint')).not.toHaveText('');
    await expect
      .poll(() =>
        scrollport.evaluate((element) => ({
          overflows: element.scrollWidth > element.clientWidth + 1,
          tabIndex: element.getAttribute('tabindex'),
        }))
      )
      .toEqual({ overflows: true, tabIndex: '0' });

    const documentOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(documentOverflow).toBeLessThanOrEqual(1);

    await expectKeyboardInlineEnds(page, scrollport, direction);
  });
}

test('named controls and repaired ARIA expose equivalent accessibility-tree contracts', async ({
  page,
}) => {
  // axe-core is not installed in this project, so these assertions exercise the
  // same affected names, values, roles, and prohibited attribute combinations.
  await page.setViewportSize({ width: 390, height: 844 });
  await openHome(page, '/#edenMap');
  await expect(page.locator('#edenMapRoot')).toBeVisible({ timeout: 20000 });
  await page.locator('[data-eden-subtab="map"]').click();
  await expect(page.locator('#edenDatasetSelect option').first()).toBeAttached({ timeout: 20000 });
  await page.evaluate(() => document.getElementById('edenSeasonModal')?.classList.add('hidden'));

  for (const id of [
    'edenDatasetSelect',
    'edenSectorSelect',
    'edenOwnershipFilter',
    'edenZoneFilter',
    'edenTypeFilter',
    'edenSortSelect',
  ]) {
    await expect(page.locator(`#${id}`)).toHaveAccessibleName(MAP_SELECT_NAMES[id]);
  }

  await page.locator('[data-eden-tool="path"]').click();
  await expect(page.locator('#edenPathColor')).toBeVisible();
  await expect(page.locator('#edenPathColor')).toHaveAccessibleName(MAP_SELECT_NAMES.edenPathColor);
  await page.locator('[data-eden-tool="draw"]').click();
  await expect(page.locator('#edenDrawColor')).toBeVisible();
  await expect(page.locator('#edenDrawColor')).toHaveAccessibleName(MAP_SELECT_NAMES.edenDrawColor);
  await page.locator('#edenTeamPanel').evaluate((panel) => {
    panel.open = true;
  });
  await page.locator('#edenTeamPlanEnabled').evaluate((checkbox) => {
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await expect(page.locator('#edenTeamFilter')).toHaveAccessibleName(
    MAP_SELECT_NAMES.edenTeamFilter
  );

  await page.evaluate(() => {
    window.location.hash = '#materials';
  });
  await expect(page.locator('#materialsSection')).toBeVisible({ timeout: 20000 });
  await expect(page.locator('#materialCalculatorRoot .dm-summary-panel')).toBeVisible({
    timeout: 20000,
  });
  const progressLabel = page.locator('#dmProgressLabel');
  const progress = page.locator('[role="progressbar"][aria-labelledby="dmProgressLabel"]');
  const progressName = (await progressLabel.textContent())?.trim() || '';
  expect(progressName).not.toBe('');
  await expect(progress).toHaveAccessibleName(progressName);
  await expect(progress).toHaveAttribute('aria-valuemin', '0');
  await expect(progress).toHaveAttribute('aria-valuemax', '100');
  await expect(progress).toHaveAttribute('aria-valuenow', /^\d+$/);
  await expect(progress).toHaveAttribute('aria-valuetext', /.+/);

  await openEdenDashboard(page, 'en');
  const repairedAria = await page.evaluate(() => ({
    genericLabels: document.querySelectorAll(
      '.dash-weighted-mobile-header[aria-label], .eden-x1-podium-avatar[aria-label]'
    ).length,
    hiddenNamedAvatars: document.querySelectorAll(
      '.eden-x1-podium-avatar:not([aria-hidden="true"])'
    ).length,
    invalidMyStatsSuggestionGroups: document.querySelectorAll(
      '.eden-x1-my-stats-suggestions:not([role="group"]), .eden-x1-my-stats-suggestions[role="group"]:not([aria-label])'
    ).length,
    myStatsSuggestionGroups: document.querySelectorAll(
      '.eden-x1-my-stats-suggestions[role="group"][aria-label]'
    ).length,
    mobileHeadersWithoutText: Array.from(
      document.querySelectorAll('.dash-weighted-mobile-header')
    ).filter((header) => !header.querySelector('.sr-only')?.textContent?.trim()).length,
  }));
  expect(repairedAria).toEqual({
    genericLabels: 0,
    hiddenNamedAvatars: 0,
    invalidMyStatsSuggestionGroups: 0,
    myStatsSuggestionGroups: 1,
    mobileHeadersWithoutText: 0,
  });
});

test('reduced motion removes computed motion while the mobile dock keeps three hubs plus More', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openHome(page);

  const reducedMotionState = await page.evaluate(() => {
    const style = (selector, pseudo = null) =>
      getComputedStyle(document.querySelector(selector), pseudo);
    return {
      titleAnimation: style('#appTitle').animationName,
      tabTransition: style('#tabNavScroll .tab-pill').transitionProperty,
      moreTransition: style('#shellMoreButton').transitionProperty,
      headerAnimation: style('.command-header', '::before').animationName,
      panelAnimation: style('#shellMorePanel').animationName,
      backdropAnimation: style('#shellMoreBackdrop').animationName,
    };
  });
  expect(reducedMotionState).toEqual({
    titleAnimation: 'none',
    tabTransition: 'none',
    moreTransition: 'none',
    headerAnimation: 'none',
    panelAnimation: 'none',
    backdropAnimation: 'none',
  });

  await expect(page.locator('#shellMoreButton')).toBeVisible();
  await expect(page.locator('#shellMorePanel')).toBeHidden();
  await expect(page.locator('#shellMoreBackdrop')).toBeHidden();
  await expect
    .poll(() =>
      page.locator('#tabNavScroll .tab-pill').evaluateAll((tabs) => tabs.map((tab) => tab.id))
    )
    .toEqual(['tabHeroesCombos', 'tabResearchTowers', 'tabEdenMap']);

  await page.locator('#shellMoreButton').click();
  await expect(page.locator('#shellMorePanel')).toBeVisible();
  await expect(page.locator('#shellMoreBackdrop')).toBeVisible();
});

test('explicit transition components retain pointer, keyboard, selection, and sticky behavior', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openHome(page);

  const heroInfoToggle = page.locator('#heroInfoToggle');
  const heroInfoLabel = page.locator('#heroInfoToggleLabel');
  const toggleThumb = heroInfoLabel.locator('.toggle-thumb');
  await expect(heroInfoToggle).toBeChecked();
  await expect(toggleThumb).toHaveCSS('transition-property', 'transform, background-color');

  await heroInfoLabel.click();
  await expect(heroInfoToggle).not.toBeChecked();
  await expect(toggleThumb).not.toHaveClass(/checked/);
  await expect(page.locator('body')).toHaveClass(/hide-hero-info/);

  await heroInfoToggle.focus();
  await page.keyboard.press('Space');
  await expect(heroInfoToggle).toBeChecked();
  await expect(toggleThumb).toHaveClass(/checked/);
  await expect(page.locator('body')).not.toHaveClass(/hide-hero-info/);

  await page.locator('#tabHeroesCombos').click();
  await page.locator('[data-hub-subtab="manual"]').click();
  await expect(page.locator('#manualSection')).toBeVisible();
  await expect(page.locator('#availableHeroes .hero-card').first()).toBeVisible({
    timeout: 20000,
  });
  const footer = page.locator('#comboFooterBar');
  await expect(footer).toBeVisible();
  await expect(footer).toHaveCSS(
    'transition-property',
    'background-color, border-color, box-shadow'
  );
  await expect(footer).toHaveCSS('position', 'relative');

  const firstHero = page.locator('#availableHeroes .hero-card').first();
  await firstHero.focus();
  await page.keyboard.press('Space');
  await expect(firstHero).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.combo-slot').first()).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('.combo-slot').first()).toHaveClass(/combo-slot--filled/);

  await page.locator('#clearComboBtn').click();
  await expect(page.locator('.combo-slot.combo-slot--filled')).toHaveCount(0);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(footer).toHaveCSS('position', 'fixed');
  await expect(footer).not.toHaveCSS('bottom', 'auto');

  await page.emulateMedia({ reducedMotion: 'reduce' });
  const maximumTransitionDurationMs = await page.evaluate(() => {
    const durations = ['.toggle-thumb', '#comboFooterBar'].flatMap((selector) =>
      getComputedStyle(document.querySelector(selector))
        .transitionDuration.split(',')
        .map(
          (duration) => Number.parseFloat(duration) * (duration.trim().endsWith('ms') ? 1 : 1000)
        )
    );
    return Math.max(...durations);
  });
  expect(maximumTransitionDurationMs).toBeLessThanOrEqual(0.01);
});
