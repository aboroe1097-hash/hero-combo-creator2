import { expect, test } from '@playwright/test';

const CONTRAST_TARGET = 4.5;
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

async function blockExternalBootNoise(page) {
  await page.route('https://www.googletagmanager.com/**', (route) => route.abort());
  await page.route('https://firestore.googleapis.com/**', (route) => route.abort());
  await page.route('https://www.gstatic.com/firebasejs/**', (route) => route.abort());
}

async function renderedContrast(locator, pseudoElement = null) {
  return locator.evaluate((element, pseudo) => {
    const parseColor = (value) => {
      const match = String(value).match(
        /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)/i
      );
      if (!match) throw new Error(`Unsupported computed color: ${value}`);
      return [Number(match[1]), Number(match[2]), Number(match[3]), Number(match[4] ?? 1)];
    };
    const composite = (foreground, background) => {
      const alpha = foreground[3] + background[3] * (1 - foreground[3]);
      if (!alpha) return [0, 0, 0, 0];
      return [
        (foreground[0] * foreground[3] + background[0] * background[3] * (1 - foreground[3])) /
          alpha,
        (foreground[1] * foreground[3] + background[1] * background[3] * (1 - foreground[3])) /
          alpha,
        (foreground[2] * foreground[3] + background[2] * background[3] * (1 - foreground[3])) /
          alpha,
        alpha,
      ];
    };
    const luminance = ([red, green, blue]) => {
      const channels = [red, green, blue].map((channel) => {
        const normalized = channel / 255;
        return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
      });
      return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
    };

    const backgroundLayers = [];
    for (let node = element; node; node = node.parentElement) {
      backgroundLayers.push(parseColor(getComputedStyle(node).backgroundColor));
    }
    let background = [255, 255, 255, 1];
    backgroundLayers.reverse().forEach((layer) => {
      background = composite(layer, background);
    });

    const style = getComputedStyle(element, pseudo);
    const rawForeground = parseColor(style.color);
    rawForeground[3] *= Number.parseFloat(style.opacity || '1');
    const foreground = composite(rawForeground, background);
    const foregroundLuminance = luminance(foreground);
    const backgroundLuminance = luminance(background);
    const ratio =
      (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) /
      (Math.min(foregroundLuminance, backgroundLuminance) + 0.05);

    return {
      background: `rgb(${background.slice(0, 3).map(Math.round).join(', ')})`,
      color: style.color,
      ratio,
    };
  }, pseudoElement);
}

async function openLocalAdmin(page) {
  await blockExternalBootNoise(page);
  await page.addInitScript(() => {
    window.VTS_ADMIN_LOCAL_TEST_AUTH = true;
    localStorage.setItem('vts_admin_local_test_auth', '1');
    localStorage.setItem('vts_maintenance_bypass', '1');
    localStorage.setItem('vts_theme', 'dark');
    navigator.serviceWorker?.getRegistrations?.().then((registrations) => {
      registrations.forEach((registration) => registration.unregister());
    });
  });
  await page.goto('/admin.html', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#dashApp')).toBeVisible({ timeout: 20000 });
  await page.locator('#dashUpdated').evaluate((element) => {
    element.textContent = ' - Last synced: 12:00:00';
  });
  await expect(page.locator('#dashUpdated')).toContainText('Last synced');
  await expect(page.locator('#dashSearch')).toBeVisible();
}

async function setTheme(page, theme) {
  const isLight = theme === 'light';
  await page.evaluate((nextTheme) => {
    const root = document.documentElement;
    const currentTheme = root.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    if (currentTheme !== nextTheme) document.getElementById('themeToggle')?.click();
  }, theme);
  if (isLight) await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  else await expect(page.locator('html')).not.toHaveAttribute('data-theme', 'light');
}

async function openEdenMap(page, viewport) {
  await page.setViewportSize(viewport);
  await blockExternalBootNoise(page);
  await page.addInitScript(() => {
    localStorage.setItem('vts_maintenance_bypass', '1');
    localStorage.setItem('vts_intro_v1_seen', '1');
    localStorage.setItem('vts_eden_dataset', 'season5');
    localStorage.setItem('vts_hero_lang', 'en');
  });
  await page.goto('/#edenMap', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).toHaveClass(/app-ready/, { timeout: 30000 });
  await expect(page.locator('#edenMapSection')).toBeVisible({ timeout: 20000 });
  await expect(page.locator('#edenMapRoot')).toBeVisible({ timeout: 20000 });
  await page.evaluate(() => document.getElementById('edenSeasonModal')?.classList.add('hidden'));
}

async function expectNamedSelect(page, id) {
  const select = page.locator(`#${id}`);
  await expect(select).toHaveAccessibleName(MAP_SELECT_NAMES[id]);
  await expect(select).toHaveAttribute('data-i18n-aria', /.+/);
}

test('Admin timestamp and search placeholder meet WCAG AA contrast in both themes', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openLocalAdmin(page);

  for (const theme of ['dark', 'light']) {
    await setTheme(page, theme);
    const timestamp = await renderedContrast(page.locator('#dashUpdated'));
    const placeholder = await renderedContrast(page.locator('#dashSearch'), '::placeholder');

    expect(
      timestamp.ratio,
      `${theme} timestamp: ${JSON.stringify(timestamp)}`
    ).toBeGreaterThanOrEqual(CONTRAST_TARGET);
    expect(
      placeholder.ratio,
      `${theme} search placeholder: ${JSON.stringify(placeholder)}`
    ).toBeGreaterThanOrEqual(CONTRAST_TARGET);
  }
});

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
  { width: 320, height: 568 },
]) {
  test(`Eden Map selects keep names in hidden modes at ${viewport.width}px`, async ({ page }) => {
    await openEdenMap(page, viewport);

    for (const id of [
      'edenDatasetSelect',
      'edenSectorSelect',
      'edenOwnershipFilter',
      'edenZoneFilter',
      'edenTypeFilter',
      'edenSortSelect',
    ]) {
      await expectNamedSelect(page, id);
    }

    await page.locator('[data-eden-tool="path"]').click();
    await expect(page.locator('#edenPathTools')).toHaveClass(/eden-path-tools--visible/);
    await expect(page.locator('#edenPathColor')).toBeVisible();
    await expectNamedSelect(page, 'edenPathColor');

    await page.locator('[data-eden-tool="draw"]').click();
    await expect(page.locator('#edenDrawTools')).toHaveClass(/eden-path-tools--visible/);
    await expect(page.locator('#edenDrawColor')).toBeVisible();
    await expectNamedSelect(page, 'edenDrawColor');

    await page.locator('#edenTeamPanel').evaluate((panel) => {
      panel.open = true;
    });
    await page.locator('#edenTeamPlanEnabled').evaluate((checkbox) => {
      checkbox.checked = true;
      checkbox.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await expect(page.locator('#edenTeamFilterWrap')).not.toHaveClass(/hidden/);
    await expect(page.locator('#edenTeamFilter')).toBeVisible();
    await expectNamedSelect(page, 'edenTeamFilter');
  });
}
