// Deterministic PRNG for the siege simulation.
//
// Every value the simulation derives from chance must come from one of these
// generators, never from Math.random or Date.now: the run seed is the only
// entropy the simulation is allowed to see. That is what makes a replay of
// {seed + input trace} reproduce a run exactly, which in turn is what makes
// daily seeds, ghost replays and reproducible soak tests possible later.

export function hashSeed(text) {
  // FNV-1a, 32-bit. Stable across engines for identical input strings.
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function createRng(seed) {
  const initial = (typeof seed === 'number' ? seed : hashSeed(String(seed))) >>> 0 || 0x9e3779b9;
  let state = initial;

  const next = () => {
    // mulberry32
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  return {
    next,
    state: () => state,
    // Rewinding is what makes "restart the daily seed" give the same run
    // instead of a fresh one.
    setState: (value) => {
      state = value >>> 0 || initial;
    },
    float: (min, max) => min + next() * (max - min),
    int: (min, max) => Math.floor(min + next() * (max - min + 1)),
    pick: (list) => list[Math.floor(next() * list.length)],
    sign: () => (next() < 0.5 ? -1 : 1),
  };
}

// The daily seed: same for every player on the same UTC date and map, which is
// the whole point of a "daily siege" board. Server time arrives in L4; until
// then the client's UTC date is the stand-in.
export function dailySeed(mapId, date = new Date()) {
  const stamp = date.toISOString().slice(0, 10);
  return `${mapId}:${stamp}`;
}

// The "Daily Siege" score attack: one map and one seed per UTC date for
// everyone. Shared with the Arcade banner through a module outside this folder.
export { dailySiegeFor } from '../siege-daily.js';
