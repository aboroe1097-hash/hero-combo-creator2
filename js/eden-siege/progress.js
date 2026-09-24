// Local progress: best scores, stars and run history.
//
// Everything lives in one localStorage record so a private window, a full
// quota or blocked storage costs the player their records and nothing else:
// every read and write is wrapped, and a missing store behaves like an empty
// one. The star rules are pure functions so the unit suite can pin them.

const STORE_KEY = 'vts_siege_progress_v1';
const LEGACY_BEST_PREFIX = 'vts_siege_best_';
const HISTORY_LIMIT = 12;

export const STAR_RULES = {
  // Campaign: hold the stronghold through the table; the core's health on the
  // last wave decides the second and third star.
  campaign: { coreForTwo: 0.5, coreForThree: 0.85 },
  // Endless and Daily: how deep the run went.
  endless: { waves: [5, 10, 15] },
};

export function starsFor(summary) {
  const mode = summary.mode || 'campaign';
  if (mode === 'campaign') {
    if (!summary.campaignCleared) return 0;
    const core = summary.coreRatio ?? 0;
    if (core >= STAR_RULES.campaign.coreForThree) return 3;
    if (core >= STAR_RULES.campaign.coreForTwo) return 2;
    return 1;
  }
  const waves = summary.wavesCleared || 0;
  return STAR_RULES.endless.waves.filter((needed) => waves >= needed).length;
}

export function summarizeRun(state, extra = {}) {
  return {
    at: extra.at || new Date().toISOString(),
    mapId: state.mapId,
    mode: state.mode,
    seed: state.seed,
    score: Math.round(state.score),
    wavesCleared: state.stats.wavesCleared,
    kills: state.stats.kills,
    maxChain: state.stats.maxChain,
    towersBuilt: state.stats.towersBuilt,
    damageTaken: Math.round(state.stats.damageTaken),
    bossKills: state.stats.bossKills,
    timeMs: Math.round(state.timeMs),
    campaignCleared: Boolean(state.campaignCleared),
    victory: state.phase === 'victory',
    coreRatio: Math.max(0, state.core.hp / state.core.maxHp),
  };
}

function safeStorage(storage) {
  if (storage) return storage;
  try {
    return globalThis.localStorage || null;
  } catch {
    return null;
  }
}

function emptyRecord() {
  return { best: {}, stars: {}, history: [] };
}

export function createProgress(storage) {
  const store = safeStorage(storage);

  function load() {
    if (!store) return emptyRecord();
    try {
      const raw = store.getItem(STORE_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      if (!parsed || typeof parsed !== 'object') return emptyRecord();
      return {
        best: parsed.best && typeof parsed.best === 'object' ? parsed.best : {},
        stars: parsed.stars && typeof parsed.stars === 'object' ? parsed.stars : {},
        history: Array.isArray(parsed.history) ? parsed.history.slice(0, HISTORY_LIMIT) : [],
      };
    } catch {
      return emptyRecord();
    }
  }

  function save(record) {
    if (!store) return false;
    try {
      store.setItem(STORE_KEY, JSON.stringify(record));
      return true;
    } catch {
      return false;
    }
  }

  function key(mapId, mode) {
    return `${mapId}:${mode || 'campaign'}`;
  }

  function legacyBest(mapId) {
    if (!store) return 0;
    try {
      return Number(store.getItem(LEGACY_BEST_PREFIX + mapId)) || 0;
    } catch {
      return 0;
    }
  }

  return {
    best(mapId, mode = 'campaign') {
      const stored = Number(load().best[key(mapId, mode)]) || 0;
      return mode === 'campaign' ? Math.max(stored, legacyBest(mapId)) : stored;
    },
    stars(mapId, mode = 'campaign') {
      return Number(load().stars[key(mapId, mode)]) || 0;
    },
    /** Best stars for a map across every mode — the number on the map chip. */
    mapStars(mapId) {
      const record = load();
      return Object.entries(record.stars)
        .filter(([entry]) => entry.startsWith(`${mapId}:`))
        .reduce((best, [, value]) => Math.max(best, Number(value) || 0), 0);
    },
    history(limit = 5) {
      return load().history.slice(0, limit);
    },
    /**
     * Record a finished run. Returns what changed so the results screen can
     * celebrate a new best or a new star.
     */
    record(summary) {
      const record = load();
      const entry = key(summary.mapId, summary.mode);
      const previousBest = this.best(summary.mapId, summary.mode);
      const previousStars = Number(record.stars[entry]) || 0;
      const stars = starsFor(summary);
      const newBest = summary.score > previousBest;
      record.best[entry] = Math.max(previousBest, summary.score);
      record.stars[entry] = Math.max(previousStars, stars);
      record.history = [{ ...summary, stars }, ...record.history].slice(0, HISTORY_LIMIT);
      const saved = save(record);
      return {
        stars,
        newBest,
        newStars: stars > previousStars,
        best: record.best[entry],
        saved,
      };
    },
  };
}
