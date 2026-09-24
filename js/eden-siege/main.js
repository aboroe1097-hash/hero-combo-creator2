// Eden Siege route controller.
//
// The page ships a canvas, a HUD host and a status block. Everything else —
// the simulation, three.js, the audio graph — is pulled in lazily from here, so
// arriving on this page costs a small shell until the player actually starts a
// run.

import { mountToolShell } from '../tool-shell.js';
import { loadCopy, normalizeLocale } from './data/copy.js';
import copyLocalesUrl from './data/copy-locales.json?url';
import { HEROES, heroByName } from './data/theme.js';
import { MAP_ORDER, MAPS, mapById } from './data/maps.js';
import { dailySeed, dailySiegeFor } from './rng.js';

const MODES = ['campaign', 'endless', 'daily'];
const TUTORIAL_KEY = 'vts_siege_tutorial_v1';

// First-time players get the training wave in campaign mode; ?tutorial=1
// forces it and ?tutorial=0 skips it (the browser spec pins the latter).
function wantsTutorial(mode) {
  const override = params().get('tutorial');
  if (override === '1') return true;
  if (override === '0' || mode !== 'campaign') return false;
  try {
    return localStorage.getItem(TUTORIAL_KEY) !== 'done';
  } catch {
    return true;
  }
}

const THEME_KEY = 'vts_theme';
const HERO_KEY = 'vts_siege_hero';

function params() {
  return new URLSearchParams(window.location.search);
}

function currentTheme() {
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
}

function currentLang() {
  // ?lang= wins over the stored preference so a shared link opens in the
  // reader's language, and so the browser spec can drive localized runs.
  const override = params().get('lang');
  if (override) return normalizeLocale(override);
  try {
    const stored = localStorage.getItem('vts_hero_lang') || document.documentElement.lang || 'en';
    return normalizeLocale(stored);
  } catch {
    return normalizeLocale(document.documentElement.lang || 'en');
  }
}

function heroForToday(mapId) {
  const requested = params().get('hero');
  if (requested) return heroByName(requested);
  try {
    const stored = localStorage.getItem(HERO_KEY);
    if (stored) return heroByName(stored);
  } catch {
    /* private mode: fall through to the daily pick */
  }
  const index = Math.abs(
    Array.from(dailySeed(mapId)).reduce((sum, char) => sum + char.charCodeAt(0), 0)
  );
  return HEROES[index % HEROES.length];
}

function webglAvailable() {
  try {
    const probe = document.createElement('canvas');
    const context = probe.getContext('webgl2') || probe.getContext('webgl');
    if (!context) return false;
    context.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
}

function localizedDirection(lang) {
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.lang = lang === 'kr' ? 'ko' : lang;
}

async function boot() {
  const canvas = document.getElementById('siegeCanvas');
  const hudRoot = document.getElementById('siegeHud');
  const status = document.getElementById('siegeStatus');
  const statusTitle = status.querySelector('[data-status="title"]');
  const statusBody = status.querySelector('[data-status="body"]');
  const statusAction = status.querySelector('[data-status="action"]');

  const lang = currentLang();
  localizedDirection(lang);
  const copy = await loadCopy(lang, copyLocalesUrl);
  const mode = MODES.includes(params().get('mode')) ? params().get('mode') : 'campaign';
  // The Daily Siege picks its own map so every player gets the same run.
  const requestedMap = MAP_ORDER.includes(params().get('map')) ? params().get('map') : 'keep';
  const mapId = mode === 'daily' ? dailySiegeFor().mapId : requestedMap;
  const map = mapById(mapId);
  const hero = heroForToday(mapId);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const webgl = webglAvailable();
  const qualityOverride = params().get('quality');
  const quality = ['low', 'medium', 'high'].includes(qualityOverride) ? qualityOverride : null;

  statusTitle.textContent = copy.errors.loadingTitle;
  statusBody.textContent = copy.errors.loadingBody;
  statusAction.hidden = true;

  document.title = `${copy.game.title} — ${copy.game.kicker}`;

  try {
    const { startSiege } = await import('./game.js');
    const game = await startSiege({
      canvas,
      hudRoot,
      mapId,
      mode,
      tutorial: wantsTutorial(mode),
      links: { maps: MAP_ORDER.map((id) => ({ id, nameKey: MAPS[id].nameKey })) },
      heroName: hero.name,
      copy,
      theme: currentTheme(),
      reducedMotion,
      allowWebgl: webgl,
      quality,
    });
    status.hidden = true;

    // The page's theme toggle writes data-theme on <html>; the scene follows it.
    const themeObserver = new MutationObserver(() => game.setTheme(currentTheme()));
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (event) => {
      game.setReducedMotion(event.matches);
    });

    // The command palette and the AI drawer navigate with hash routes; leaving
    // the page is the supervisor's job, so only the run needs stopping here.
    window.addEventListener('pagehide', (event) => {
      if (event.persisted) return;
      themeObserver.disconnect();
      game.destroy();
    });

    // Handy handle for local verification and Playwright specs.
    window.__EDEN_SIEGE__ = {
      game,
      mapId,
      gameMode: mode,
      seed: game.seed || dailySeed(mapId),
      hero: hero.name,
      mode: webgl ? 'webgl' : 'lite',
      scene: () => game.world.state,
    };
  } catch (error) {
    status.hidden = false;
    statusTitle.textContent = copy.errors.failedTitle;
    statusBody.textContent = copy.errors.failedBody;
    statusAction.hidden = false;
    statusAction.textContent = copy.errors.retry;
    statusAction.onclick = () => window.location.reload();
    console.error('[eden-siege] failed to start', error);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}

// Shared site chrome: the same footer (and, where the page has no header of
// its own, the branded bar with Back to tools) on every standalone tool page.
mountToolShell();
