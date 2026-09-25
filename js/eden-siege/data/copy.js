// English fallback and runtime helpers for Velo's Rampart.
// Localized packs live in copy-locales.json and are loaded with the Siege route.

import { fetchLocalePack } from '../../i18n/fetch-locale-pack.js';

const EN = {
  game: {
    title: "Velo's Rampart",
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
    dash: 'Dash',
    ult: 'Ultimate',
    training: 'Training',
    endless: 'Endless',
    boss: 'Warlord',
    controls:
      'WASD / arrows move · Space attack · Shift dash · Q E swap wing · F nova · R ultimate · Esc pause',
  },
  modes: {
    label: 'Mode',
    arena: 'Arena',
    campaign: 'The Siege',
    endless: 'Endless Siege',
    daily: 'Daily War',
    campaignDesc: 'Ten waves, two warlords. Three stars for a stronghold that barely got scratched.',
    endlessDesc: 'The gates never close. Every fifth wave brings a warlord.',
    dailyDesc: 'One map, one seed, the same siege for every player today ({date}).',
  },
  tutorial: {
    title: 'Training wave',
    body: 'A few slow rangers to practise on. Tick every step and the real siege begins.',
    move: 'Move — WASD, arrows or the stick',
    attack: 'Attack — hold Space or the attack button',
    swap: 'Swap wing — Q / E or the wing buttons',
    build: 'Build — tap a glowing socket',
    nova: 'Nova — press F or the nova button',
    skip: 'Skip training',
    done: 'Training complete — the siege begins',
  },
  streaks: ['Wing chain!', 'Rampage!', 'Unstoppable!', 'Eden storm!', 'Legend of 1097!'],
  modifiers: {
    armored: 'Armoured',
    swift: 'Swift',
    shielded: 'Shielded',
    armoredHint: 'Armoured foes: Fire burns through armour',
    shieldedHint: 'Shielded foes: Ice shatters shields',
    swiftHint: 'Swift foes: slow them with Ice',
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
    buildCall: 'Call the next wave',
    endlessTitle: 'Endless siege',
    endlessBody: 'The campaign is won. The gates open again — how long can you hold?',
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
    stars: 'Stars',
    maxChain: 'Best chain',
    towers: 'Towers',
    time: 'Time',
    bossKills: 'Warlords',
    history: 'Recent runs',
    continueEndless: 'Keep going: Endless',
    playDaily: 'Daily War',
    campaignWon: 'The Siege cleared',
    cardSaved: 'Card saved',
  },
  feats: {
    title: 'Feats',
    unlocked: 'Feat unlocked',
    progress: '{unlocked} / {total} unlocked',
    wingborne: { name: 'Wingborne', desc: 'Reach a ×50 chain in one run.' },
    ashfall: { name: 'Ashfall', desc: 'Burn 100 enemies to ash.' },
    coldCalculus: { name: 'Cold Calculus', desc: 'Win a run using only the Ice wing.' },
    untouched: { name: 'Untouched', desc: 'Win with the stronghold at full strength.' },
    warlordsBane: { name: "Warlord's Bane", desc: 'Bring down three warlords in one run.' },
    architect: { name: 'Architect', desc: 'Max out every tower socket in one run.' },
  },
  omens: {
    title: 'Wave omen',
    body: 'Choose the omen the next wave carries, or take none.',
    skip: 'No omen',
    ironTide: 'Iron Tide',
    ironTideDesc: 'Every foe is armoured. +60% gold.',
    fogOfWar: 'Fog of War',
    fogOfWarDesc: 'The field darkens. +40% score.',
    bloodMoon: 'Blood Moon',
    bloodMoonDesc: 'Faster foes, slower chains. +50% score.',
    mirrorIce: 'Mirror Ice',
    mirrorIceDesc: 'Ice barely bites. +80% score.',
  },
  reactions: {
    shatter: 'Shatter',
    melt: 'Melt',
    deepFreeze: 'Deep Freeze',
    immolate: 'Immolate',
  },
  draft: {
    title: 'War Council',
    body: 'Choose one boon for the rest of the run.',
    choose: 'Take it',
    boons: {
      emberHeart: { name: 'Ember Heart', desc: 'Fire burns 40% harder.' },
      frostGrip: { name: 'Frost Grip', desc: 'Ice slows bite 30% deeper and hold longer.' },
      swiftWings: { name: 'Swift Wings', desc: 'Move 12% faster and dash 20% sooner.' },
      heavyNova: { name: 'Heavy Nova', desc: 'Nova hits 50% harder and pushes further.' },
      goldRush: { name: 'Gold Rush', desc: 'Fallen foes drop 35% more gold.' },
      longReach: { name: 'Long Reach', desc: 'Your bolts and towers reach 15% further.' },
      quickChain: { name: 'Quick Chain', desc: 'Chains fade 40% slower.' },
      towerWall: { name: 'Tower Wall', desc: 'Towers gain 40% more health.' },
    },
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
    enemyWarlord: 'Kharr the Warlord',
    enemyShieldwall: 'Shieldwall',
    enemySkirmisher: 'Skirmisher',
    enemySaboteur: 'Saboteur',
    enemyHerald: 'Herald',
    enemyHauler: 'Hauler',
    enemyGateRam: 'Gate Ram',
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
    bossIncoming: 'A warlord leads this wave',
    waveCleared: 'Wave cleared',
    socketEmpty: 'Empty socket',
    socketBuilt: '{tower} raised',
    socketUpgraded: '{tower} to level {level}',
    playerDown: 'You are down - respawning at the stronghold',
    pausedByContext: 'Graphics context lost - the run is paused',
    crit: 'Critical',
    multiKill: 'Multi-kill ×{n}',
    bossDown: 'Warlord down!',
    slamIncoming: 'Slam incoming — dash out!',
    dodge: 'Dodged',
    ultReady: 'Ultimate ready — press R',
    ultActive: 'Wingstorm!',
    shieldBreak: 'Shield shattered',
    towerMax: '{tower} is at max level',
    qualityLowered: 'Effects reduced to keep the frame rate smooth',
    endlessBegins: 'Endless siege — how long can you hold?',
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
    if (!response.ok) throw new Error("Velo's Rampart translations could not be loaded.");
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
