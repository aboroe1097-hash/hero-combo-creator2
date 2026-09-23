// One-off local check: play the arena and capture it, so a human can see the
// result rather than trust a green test.
import { chromium } from 'playwright';

const base = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5176';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (error) => errors.push(String(error.message)));
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(message.text());
});
await page.route('**/*', (route) => {
  const url = route.request().url();
  if (/fonts\.(googleapis|gstatic)\.com/.test(url)) {
    return route.fulfill({ status: 200, contentType: 'text/css', body: '' });
  }
  return route.continue();
});

await page.goto(`${base}/eden-siege.html?quality=low`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForFunction(() => Boolean(window.__EDEN_SIEGE__), null, { timeout: 90000 });
const boot = await page.evaluate(() => ({
  mode: window.__EDEN_SIEGE__.mode,
  map: window.__EDEN_SIEGE__.mapId,
  hero: window.__EDEN_SIEGE__.hero,
  seed: window.__EDEN_SIEGE__.seed,
}));
await page.screenshot({ path: 'tmp/siege-1-title.png' });

await page.$eval('.siege-overlay .siege-btn--primary', (button) => button.click());
// Velo at close range before the fight starts: this is the shot that shows the
// avatar the owner asked for.
await page.waitForTimeout(1400);
await page.screenshot({ path: 'tmp/siege-2-velo.png' });
await page.keyboard.down('Space');
await page.keyboard.down('KeyW');
await page.waitForTimeout(5000);
await page.keyboard.up('KeyW');
await page.screenshot({ path: 'tmp/siege-2-fight.png' });
await page.waitForTimeout(4000);
await page.keyboard.press('KeyQ');
await page.waitForTimeout(3000);
await page.keyboard.up('Space');
await page.screenshot({ path: 'tmp/siege-3-lanes.png' });

const scene = await page.evaluate(() => {
  const state = window.__EDEN_SIEGE__.scene();
  return {
    phase: state.phase,
    wave: state.wave,
    element: state.player.element,
    score: Math.round(state.score),
    kills: state.stats.kills,
    gold: state.gold,
    units: state.units.length,
    projectiles: state.projectiles.length,
    coreHp: Math.round(state.core.hp),
    playerHp: Math.round(state.player.hp),
    timeMs: Math.round(state.timeMs),
    stats: window.__EDEN_SIEGE__.game.stats(),
  };
});

// The ship deck too, so both maps are eyeballed.
await page.goto(`${base}/eden-siege.html?map=ship&quality=low`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForFunction(() => Boolean(window.__EDEN_SIEGE__), null, { timeout: 90000 });
await page.$eval('.siege-overlay .siege-btn--primary', (button) => button.click());
await page.keyboard.down('Space');
await page.keyboard.down('KeyW');
await page.waitForTimeout(7000);
await page.keyboard.up('KeyW');
await page.keyboard.up('Space');
await page.screenshot({ path: 'tmp/siege-4-ship.png' });
const ship = await page.evaluate(() => {
  const state = window.__EDEN_SIEGE__.scene();
  return {
    map: window.__EDEN_SIEGE__.mapId,
    kills: state.stats.kills,
    score: Math.round(state.score),
    units: state.units.length,
  };
});

console.log(JSON.stringify({ boot, keep: scene, ship, errors }, null, 2));
await browser.close();
