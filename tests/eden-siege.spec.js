// Eden Siege — browser contract.
//
//   npx playwright test --config=playwright.siege.config.js --reporter=line
//
// The unit suite proves the simulation is deterministic; this spec proves the
// page actually boots it in a real browser, renders frames, plays a wave, and
// survives the things players do to it (pause, resize, phone viewport).

import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';

// A base URL may point at a deployed preview or at a local server; only the
// former makes the artifact-dependent assertions meaningless. Treat localhost
// and 127.0.0.1 as local regardless of how the URL arrived.
function isRemoteBase() {
  const raw = String(process.env.PLAYWRIGHT_BASE_URL || '').trim();
  if (!raw) return false;
  try {
    const host = new URL(raw).hostname;
    return !['127.0.0.1', 'localhost', '::1', '0.0.0.0'].includes(host);
  } catch {
    return false;
  }
}

const isRemotePreview = isRemoteBase();
const targetOrigin = new URL(
  String(process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4174').trim()
).origin;

// A vite-only build has no copied maintenance config; only a full build does.
// Read it defensively so the spec still runs against either artifact.
function maintenanceModeEnabled() {
  try {
    const source = readFileSync('dist/js/maintenance-config.js', 'utf8');
    return /window\.VTS_MAINTENANCE_MODE\s*=\s*true/u.test(source);
  } catch {
    return false;
  }
}

const maintenanceEnabled = maintenanceModeEnabled();

function observeFailures(page) {
  const failures = [];
  page.on('pageerror', (error) => failures.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') failures.push(`console: ${message.text()}`);
  });
  page.on('response', (response) => {
    try {
      if (new URL(response.url()).origin === targetOrigin && response.status() >= 400) {
        failures.push(`${response.status()} ${response.url()}`);
      }
    } catch {
      /* ignore unparseable URLs */
    }
  });
  page.on('requestfailed', (request) => {
    const errorText = request.failure()?.errorText || 'request failed';
    if (errorText === 'net::ERR_ABORTED') return;
    try {
      if (new URL(request.url()).origin === targetOrigin) {
        failures.push(`${errorText} ${request.url()}`);
      }
    } catch {
      /* ignore unparseable URLs */
    }
  });
  return failures;
}

// Third-party font/CDN requests are answered with an empty response on purpose
// so the suite runs on an offline or firewalled machine, and so "the arena
// boots without Google Fonts" is asserted rather than assumed. Fulfilling with
// an empty body (rather than aborting) keeps the browser from logging the
// blocked request as a console error, which would hide real console errors.
// Only same-origin failures are collected.
const STUB_HOSTS = new Set([
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'www.googletagmanager.com',
  'www.google-analytics.com',
  'region1.google-analytics.com',
]);

async function preparePage(page) {
  const failures = observeFailures(page);
  await page.route('**/*', (route) => {
    let host = '';
    try {
      host = new URL(route.request().url()).hostname;
    } catch {
      host = '';
    }
    if (!STUB_HOSTS.has(host)) return route.continue();
    const isCss = host === 'fonts.googleapis.com' || host === 'fonts.gstatic.com';
    return route.fulfill({
      status: 200,
      contentType: isCss ? 'text/css' : 'text/javascript',
      body: '',
    });
  });
  return failures;
}

async function bootSiege(page, query = '') {
  // domcontentloaded, not load: a stalled third-party stylesheet must not be
  // able to hang the run before the engine gets a chance to report in.
  await page.goto(`/eden-siege.html${query}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.__EDEN_SIEGE__), null, { timeout: 45000 });
  await expect(page.locator('#siegeStatus')).toBeHidden({ timeout: 15000 });
  return page.evaluate(() => ({
    mode: window.__EDEN_SIEGE__.mode,
    mapId: window.__EDEN_SIEGE__.mapId,
    seed: window.__EDEN_SIEGE__.seed,
  }));
}

async function beginRun(page) {
  await page.locator('.siege-overlay .siege-btn--primary').first().click();
  await expect(page.locator('.siege-overlay')).toBeHidden();
}

test.describe('Eden Siege', () => {
  test.skip(maintenanceEnabled, 'maintenance mode is enabled in this build');

  test('boots the engine, renders frames and plays wave one', async ({ page }, testInfo) => {
    const failures = await preparePage(page);
    const boot = await bootSiege(page);
    expect(['webgl', 'lite']).toContain(boot.mode);
    expect(boot.mapId).toBe('keep');
    expect(boot.seed).toMatch(/^keep:\d{4}-\d{2}-\d{2}$/u);

    const canvasBox = await page.locator('#siegeCanvas').boundingBox();
    expect(canvasBox.width).toBeGreaterThan(320);
    expect(canvasBox.height).toBeGreaterThan(240);

    await beginRun(page);

    // Walk into the lanes and attack for a while: wave one walks toward the
    // stronghold from the far gates, so this is a real engagement, not a poke.
    await page.keyboard.down('Space');
    await page.keyboard.down('KeyW');
    await page.waitForTimeout(4000);
    await page.keyboard.press('KeyQ');
    await page.waitForTimeout(4000);
    await page.keyboard.press('KeyE');
    await page.waitForTimeout(2500);
    await page.keyboard.up('KeyW');
    await page.keyboard.up('Space');

    const stats = await page.evaluate(() => window.__EDEN_SIEGE__.game.stats());
    expect(stats.frames, 'the renderer drew frames').toBeGreaterThan(60);
    expect(stats.simSteps, 'the simulation advanced').toBeGreaterThan(400);

    const scene = await page.evaluate(() => {
      const state = window.__EDEN_SIEGE__.scene();
      return {
        phase: state.phase,
        wave: state.wave,
        timeMs: state.timeMs,
        score: state.score,
        kills: state.stats.kills,
        gold: state.gold,
        units: state.units.length,
        projectiles: state.projectiles.length,
        element: state.player.element,
        coreHp: state.core.hp,
        wavesCleared: state.stats.wavesCleared,
      };
    });
    // The run uses the daily seed, so wave one's size changes every day. On
    // some days the engagement clears it inside the test window and the run
    // has moved on to the build phase before wave two; both mean wave one was
    // played.
    expect(['wave', 'build']).toContain(scene.phase);
    if (scene.phase === 'build') expect(scene.wavesCleared).toBe(1);
    expect(scene.wave).toBe(1);
    expect(scene.timeMs).toBeGreaterThan(9000);
    expect(scene.kills, 'engaging wave one kills something').toBeGreaterThan(0);
    expect(scene.score).toBeGreaterThan(0);
    expect(scene.gold).toBeGreaterThan(0);
    expect(scene.coreHp).toBeLessThanOrEqual(120);

    await testInfo.attach('arena-desktop', {
      body: await page.screenshot(),
      contentType: 'image/png',
    });
    expect(failures).toEqual([]);
  });

  test('pause stops the run and resume continues it', async ({ page }) => {
    const failures = await preparePage(page);
    await bootSiege(page);
    await beginRun(page);
    await page.waitForTimeout(1200);

    await page.keyboard.press('Escape');
    await expect(page.locator('.siege-overlay')).toBeVisible();
    const pausedStats = await page.evaluate(() => window.__EDEN_SIEGE__.game.stats());
    await page.waitForTimeout(900);
    const stillPaused = await page.evaluate(() => window.__EDEN_SIEGE__.game.stats());
    expect(stillPaused.simSteps).toBe(pausedStats.simSteps);
    expect(stillPaused.frames).toBe(pausedStats.frames);

    await page.locator('.siege-overlay .siege-btn--primary').first().click();
    await expect(page.locator('.siege-overlay')).toBeHidden();
    await page.waitForTimeout(900);
    const resumed = await page.evaluate(() => window.__EDEN_SIEGE__.game.stats());
    expect(resumed.simSteps).toBeGreaterThan(pausedStats.simSteps);
    expect(resumed.frames).toBeGreaterThan(pausedStats.frames);
    expect(failures).toEqual([]);
  });

  test('a terminal phase stops rendering until restart', async ({ page }) => {
    const failures = await preparePage(page);
    await bootSiege(page);
    await beginRun(page);
    await page.waitForTimeout(500);

    await page.evaluate(() => {
      window.__EDEN_SIEGE__.scene().phase = 'victory';
    });
    await page.waitForTimeout(200);
    const terminalStats = await page.evaluate(() => window.__EDEN_SIEGE__.game.stats());
    await page.waitForTimeout(500);
    const stillTerminal = await page.evaluate(() => window.__EDEN_SIEGE__.game.stats());

    expect(stillTerminal.frames).toBe(terminalStats.frames);
    expect(stillTerminal.simSteps).toBe(terminalStats.simSteps);

    await page.keyboard.press('Shift+R');
    await expect
      .poll(() => page.evaluate(() => window.__EDEN_SIEGE__.scene().phase))
      .toBe('ready');
    // Restart sets the phase at once and schedules the next animation frame, so
    // the loop resuming is observed by waiting for it rather than sampled once.
    const stats = () => page.evaluate(() => window.__EDEN_SIEGE__.game.stats());
    await expect.poll(async () => (await stats()).frames).toBeGreaterThan(terminalStats.frames);
    await expect
      .poll(async () => (await stats()).simSteps)
      .toBeGreaterThan(terminalStats.simSteps);
    expect(failures).toEqual([]);
  });

  test('pagehide preserves the game when the browser may restore it from cache', async ({ page }) => {
    const failures = await preparePage(page);
    await bootSiege(page);
    await beginRun(page);

    await page.evaluate(() => {
      window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true }));
    });
    const before = await page.evaluate(() => window.__EDEN_SIEGE__.game.stats().frames);
    await page.waitForTimeout(300);
    const after = await page.evaluate(() => window.__EDEN_SIEGE__.game.stats().frames);

    expect(after).toBeGreaterThan(before);
    expect(failures).toEqual([]);
  });

  test('restoring the WebGL context resumes a context-paused run', async ({ page }) => {
    const failures = await preparePage(page);
    const boot = await bootSiege(page);
    test.skip(boot.mode !== 'webgl', 'WebGL context events require the 3D renderer');
    await beginRun(page);

    await page.locator('#siegeCanvas').evaluate((canvas) => {
      canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
    });
    await expect.poll(() => page.evaluate(() => window.__EDEN_SIEGE__.game.stats().paused)).toBe(true);

    await page.locator('#siegeCanvas').evaluate((canvas) => {
      canvas.dispatchEvent(new Event('webglcontextrestored'));
    });
    await expect.poll(() => page.evaluate(() => window.__EDEN_SIEGE__.game.stats().paused)).toBe(false);
    expect(failures).toEqual([]);
  });

  test('the ship deck is a playable second arena', async ({ page }, testInfo) => {
    const failures = await preparePage(page);
    const boot = await bootSiege(page, '?map=ship');
    expect(boot.mapId).toBe('ship');
    await beginRun(page);
    await page.keyboard.down('Space');
    await page.keyboard.down('KeyW');
    await page.waitForTimeout(5000);
    await page.keyboard.up('KeyW');
    await page.keyboard.up('Space');
    const scene = await page.evaluate(() => {
      const state = window.__EDEN_SIEGE__.scene();
      return { phase: state.phase, units: state.units.length, timeMs: state.timeMs };
    });
    expect(scene.phase).toBe('wave');
    expect(scene.timeMs).toBeGreaterThan(4000);
    await testInfo.attach('arena-ship', {
      body: await page.screenshot(),
      contentType: 'image/png',
    });
    expect(failures).toEqual([]);
  });

  test('the phone layout fits and offers touch controls', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const failures = await preparePage(page);
    await bootSiege(page, '?map=keep&lang=es');

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth
    );
    expect(overflow, 'no horizontal overflow at 390px').toBeLessThanOrEqual(2);

    const stick = await page.locator('.siege-stick').boundingBox();
    expect(stick.width, 'the stick is a real touch target').toBeGreaterThanOrEqual(44);
    const attack = await page.locator('.siege-attack').boundingBox();
    expect(attack.width).toBeGreaterThanOrEqual(44);

    await beginRun(page);
    // Drive the run with the on-screen controls, which is how a phone player
    // actually plays: hold the attack button and push the stick forward.
    await page.locator('.siege-attack').dispatchEvent('pointerdown');
    await page.waitForTimeout(3200);
    await page.locator('.siege-attack').dispatchEvent('pointerup');

    const scene = await page.evaluate(() => {
      const state = window.__EDEN_SIEGE__.scene();
      return { phase: state.phase, timeMs: state.timeMs, score: state.score };
    });
    expect(scene.phase).toBe('wave');
    expect(scene.timeMs).toBeGreaterThan(2500);

    await testInfo.attach('arena-mobile', {
      body: await page.screenshot(),
      contentType: 'image/png',
    });
    expect(failures).toEqual([]);
  });

  test('a localized page renders its own copy', async ({ page }) => {
    await preparePage(page);
    await page.goto('/eden-siege.html?lang=ru', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Boolean(window.__EDEN_SIEGE__), null, { timeout: 45000 });
    const hudText = await page.locator('.siege-topbar').innerText();
    // The HUD uppercases its labels in CSS, so compare case-insensitively.
    expect(hudText).toMatch(/Очки|Волна|Золото|Рекорд/iu);

    await page.goto('/eden-siege.html?lang=ko', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Boolean(window.__EDEN_SIEGE__), null, { timeout: 45000 });
    await expect(page.locator('html')).toHaveAttribute('lang', 'ko');
  });

  test.skip(isRemotePreview, 'local-only check');
  test('the page shell keeps its security and footer contract', async ({ page }) => {
    await preparePage(page);
    await page.goto('/eden-siege.html', { waitUntil: 'domcontentloaded' });
    const csp = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');
    expect(csp).toContain("script-src 'self'");
    expect(csp).not.toContain("script-src 'self' 'unsafe-inline'");
    const version = JSON.parse(readFileSync('package.json', 'utf8')).version;
    await expect(page.locator('.standalone-footer-legal')).toContainText(`v${version}`);
  });
});
