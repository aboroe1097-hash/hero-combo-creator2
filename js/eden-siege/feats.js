// Feats: the one-off named challenges a run can earn.
//
// The unlocked list lives in one localStorage record of its own, apart from
// best scores and run history, so a private window, a full quota or corrupt
// JSON costs the player their badges and nothing else: every read and write is
// wrapped, and a missing store behaves like an empty one. Detection is pure —
// it reads a run summary and returns ids — so the unit suite can pin the rules,
// and the FEATS order is the display order. Every id matches the copy keys
// copy.feats.<id>.name and copy.feats.<id>.desc.

export const FEATS_STORE_KEY = 'vts_siege_feats_v1';

export const FEATS = [
  { id: 'wingborne', check: (s) => (s.maxChain || 0) >= 50 },
  { id: 'ashfall', check: (s) => (s.burnKills || 0) >= 100 },
  { id: 'coldCalculus', check: (s) => Boolean(s.victory) && (s.fireShots || 0) === 0 },
  { id: 'untouched', check: (s) => Boolean(s.victory) && (s.coreRatio || 0) >= 1 },
  { id: 'warlordsBane', check: (s) => (s.bossKills || 0) >= 3 },
  {
    id: 'architect',
    check: (s) => (s.socketsTotal || 0) > 0 && (s.towersMaxed || 0) >= s.socketsTotal,
  },
];

/** The ids a run summary earns, in FEATS display order. Pure: storage is untouched. */
export function detectFeats(summary) {
  const run = summary || {};
  return FEATS.filter((feat) => feat.check(run)).map((feat) => feat.id);
}

function safeStorage(storage) {
  if (storage) return storage;
  try {
    return globalThis.localStorage || null;
  } catch {
    return null;
  }
}

export function createFeatStore(storage) {
  const store = safeStorage(storage);

  function load() {
    if (!store) return [];
    try {
      const raw = store.getItem(FEATS_STORE_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.unlocked)) return [];
      return parsed.unlocked.filter((id) => typeof id === 'string');
    } catch {
      return [];
    }
  }

  function save(unlocked) {
    if (!store) return false;
    try {
      store.setItem(FEATS_STORE_KEY, JSON.stringify({ unlocked }));
      return true;
    } catch {
      return false;
    }
  }

  return {
    unlocked() {
      return load();
    },
    /** Add feats; returns only the ids that were not stored yet. Never removes. */
    unlock(ids) {
      const known = load();
      const added = [];
      for (const id of Array.isArray(ids) ? ids : []) {
        if (known.includes(id)) continue;
        known.push(id);
        added.push(id);
      }
      if (added.length) save(known);
      return added;
    },
    total() {
      return FEATS.length;
    },
  };
}

/**
 * Detect this run's feats, store the new ones and return only those — what the
 * results screen announces. A missing store degrades to a memory-only one.
 */
export function newestFeats(summary, store) {
  const target = store && typeof store.unlock === 'function' ? store : createFeatStore(null);
  return target.unlock(detectFeats(summary));
}
