// English fallback and runtime helpers for Eden Siege.
// Localized packs live in copy-locales.json and are loaded with the Siege route.

import { fetchLocalePack } from '../../i18n/fetch-locale-pack.js';

const EN = {
  game: {
    title: 'Eden Siege',
    kicker: 'Ice & Fire Arena · VTS 1097',
    tagline: 'Hold the line. Ice controls, Fire burns, and the wings remember every chain.',
  },
  hud: {
    score: 'Score',
    best: 'Best',
    wave: 'Wave',
    gold: 'Gold',
    core: 'Stronghold',
    combo: 'Chain',
    nova: 'Nova',
    build: 'Build',
    upgrade: 'Upgrade',
    level: 'Lv',
    pause: 'Pause',
    resume: 'Resume',
    mute: 'Sound on',
    unmute: 'Sound off',
    restart: 'Restart',
    backToArcade: 'Arcade',
    swap: 'Swap wing',
    attack: 'Attack',
    controls: 'WASD / arrows move · Space attack · Q E swap wing · F nova · Esc pause',
  },
  elements: { elementIce: 'Ice', elementFire: 'Fire' },
  phases: {
    readyTitle: 'Choose your wing',
    readyBody: 'Waves cross the gates in {seconds}s. Hold the stronghold.',
    readyStart: 'Begin the siege',
    buildTitle: 'Between waves',
    buildBody: 'Spend gold on towers before the next gate opens.',
    waveTitle: 'Wave {n}',
    waveBoss: 'Boss wave',
    pauseTitle: 'Paused',
    pauseBody: 'The siege waits. Visibility changes pause the run automatically.',
    victoryTitle: 'Stronghold held',
    victoryBody: 'Every wave broken. The wings took their fill.',
    defeatTitle: 'The gate fell',
    defeatBody: 'The stronghold is lost — but the record is still standing.',
  },
  results: {
    score: 'Final score',
    best: 'Personal best',
    newBest: 'New best',
    waves: 'Waves cleared',
    kills: 'Kills',
    share: 'Share run',
    copied: 'Copied',
    playAgain: 'Run it again',
  },
  tips: [
    'Alternate Ice and Fire kills — the chain multiplier is where the score lives.',
    'Ice locks a cavalry charge in place. Fire finishes what Ice holds.',
    'Nova charges from kills; hold it for a boss wave rather than a stray ranger.',
    'Towers keep firing while you are down. Build before you need them.',
  ],
  maps: {
    mapKeepName: 'Keep Rampart',
    mapKeepDesc: 'Snowbound ramparts. Three gates, one stronghold, no cover you did not build.',
    mapShipName: 'Transport Ship',
    mapShipDesc: 'Container deck, narrow lanes. Ice and Fire factions boarding from the bow.',
  },
  enemies: {
    enemyRanger: 'Ranger',
    enemyCavalry: 'Cavalry',
    enemyDreadnought: 'Dreadnought',
  },
  towers: {
    towerFrost: 'Frost Spire',
    towerFrostDesc: 'Slows what it hits. Cheap, patient, stacks with Ice wing.',
    towerEmber: 'Ember Ballista',
    towerEmberDesc: 'Splash damage. Made for the moment the lanes fill up.',
  },
  messages: {
    notEnoughGold: 'Not enough gold',
    coreUnderAttack: 'The stronghold is under attack',
    novaReady: 'Nova ready',
    revived: 'Back on the wall',
    bossIncoming: 'Dreadnought approaching',
    waveCleared: 'Wave cleared',
    socketEmpty: 'Empty socket',
    socketBuilt: '{tower} raised',
    socketUpgraded: '{tower} to level {level}',
    playerDown: 'You are down - respawning at the stronghold',
    pausedByContext: 'Graphics context lost - the run is paused',
  },
  challenge: { daily: 'Daily seed', seed: 'Seed' },
  errors: {
    loadingTitle: 'Raising the stronghold',
    loadingBody: 'Loading the siege engine...',
    webglTitle: 'Lite mode',
    webglBody: 'This device cannot run the 3D engine, so the arena is drawn in builder view.',
    failedTitle: 'The engine did not load',
    failedBody: 'Check your connection and try again — nothing was lost.',
    retry: 'Try again',
  },
};

export const LOCALES = ["en","es","pt","de","fr","hr","tr","ru","id","zh","ar","kr","it"];
export const COPY = { en: EN };

function merge(base, override) {
  if (!override || typeof override !== 'object') return base;
  const out = Array.isArray(base) ? base.slice() : { ...base };
  for (const [key, value] of Object.entries(override)) {
    const baseValue = out[key];
    out[key] =
      baseValue && typeof baseValue === 'object' && !Array.isArray(baseValue)
        ? merge(baseValue, value)
        : value;
  }
  return out;
}

export function normalizeLocale(locale) {
  const value = String(locale || 'en').toLowerCase();
  if (value.startsWith('ko')) return 'kr';
  const short = value.split('-')[0];
  return LOCALES.includes(short) ? short : 'en';
}

export function getCopy(locale, localePacks = {}) {
  const normalized = normalizeLocale(locale);
  return merge(COPY.en, localePacks[normalized]);
}

export async function loadCopy(locale, packsUrl, fetcher = globalThis.fetch, timeoutMs) {
  const normalized = normalizeLocale(locale);
  if (normalized === 'en' || !packsUrl || typeof fetcher !== 'function') return COPY.en;
  try {
    const response = await fetchLocalePack(packsUrl, fetcher, timeoutMs);
    if (!response.ok) throw new Error('Eden Siege translations could not be loaded.');
    return getCopy(normalized, await response.json());
  } catch {
    return COPY.en;
  }
}

export function formatCopy(template, values = {}) {
  return String(template).replace(/\{(\w+)\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(values, key) ? String(values[key]) : match
  );
}
