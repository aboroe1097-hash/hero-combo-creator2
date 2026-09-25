// Velo's Rampart — feats contract.
//
// Feats are pure checks over a run summary plus a localStorage record that must
// survive a broken store. Everything here runs without a browser.

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  FEATS,
  FEATS_STORE_KEY,
  createFeatStore,
  detectFeats,
  newestFeats,
} from '../../js/eden-siege/feats.js';
import { summarizeRun } from '../../js/eden-siege/progress.js';
import { COPY } from '../../js/eden-siege/data/copy.js';

const FEAT_IDS = FEATS.map((feat) => feat.id);

/** A summary that earns nothing, with each feat's input overridable. */
function summary(overrides = {}) {
  return {
    victory: false,
    maxChain: 0,
    burnKills: 0,
    fireShots: 1,
    coreRatio: 0.25,
    bossKills: 0,
    socketsTotal: 0,
    towersMaxed: 0,
    ...overrides,
  };
}

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    values,
    getItem: (key) => (values.has(key) ? values.get(key) : null),
    setItem: (key, value) => values.set(key, String(value)),
  };
}

test('wingborne needs a x50 chain in one run', () => {
  assert.deepEqual(detectFeats(summary({ maxChain: 50 })), ['wingborne']);
  assert.deepEqual(detectFeats(summary({ maxChain: 49 })), []);
});

test('ashfall needs 100 burned enemies', () => {
  assert.deepEqual(detectFeats(summary({ burnKills: 100 })), ['ashfall']);
  assert.deepEqual(detectFeats(summary({ burnKills: 99 })), []);
});

test('coldCalculus needs a win without a single fire shot', () => {
  assert.deepEqual(detectFeats(summary({ victory: true, fireShots: 0 })), ['coldCalculus']);
  assert.deepEqual(detectFeats(summary({ victory: true, fireShots: 1 })), []);
  // Zero fire shots in a lost run is not a feat.
  assert.deepEqual(detectFeats(summary({ victory: false, fireShots: 0 })), []);
});

test('untouched needs a win with the stronghold at full strength', () => {
  assert.deepEqual(detectFeats(summary({ victory: true, coreRatio: 1 })), ['untouched']);
  assert.deepEqual(detectFeats(summary({ victory: true, coreRatio: 0.8 })), []);
  // A pristine core in a lost run is not a feat.
  assert.deepEqual(detectFeats(summary({ victory: false, coreRatio: 1 })), []);
});

test('warlordsBane needs three warlords in one run', () => {
  assert.deepEqual(detectFeats(summary({ bossKills: 3 })), ['warlordsBane']);
  assert.deepEqual(detectFeats(summary({ bossKills: 2 })), []);
});

test('architect needs at least one socket and every socket maxed', () => {
  assert.deepEqual(detectFeats(summary({ socketsTotal: 3, towersMaxed: 3 })), ['architect']);
  // One tower short.
  assert.deepEqual(detectFeats(summary({ socketsTotal: 3, towersMaxed: 2 })), []);
  // A map with no sockets can never be "fully built".
  assert.deepEqual(detectFeats(summary({ socketsTotal: 0, towersMaxed: 0 })), []);
  assert.deepEqual(detectFeats(summary({ socketsTotal: 0, towersMaxed: 4 })), []);
});

test('detectFeats returns ids in FEATS order and never invents ids', () => {
  const everything = summary({
    victory: true,
    maxChain: 80,
    burnKills: 400,
    fireShots: 0,
    coreRatio: 1,
    bossKills: 5,
    socketsTotal: 4,
    towersMaxed: 4,
  });
  assert.deepEqual(detectFeats(everything), FEAT_IDS);

  // A partial run keeps the display order, not the order the rules fire in.
  assert.deepEqual(detectFeats(summary({ victory: true, coreRatio: 1, bossKills: 3 })), [
    'untouched',
    'warlordsBane',
  ]);

  for (const id of detectFeats(everything)) {
    assert.ok(FEAT_IDS.includes(id), `${id} is not a declared feat`);
  }
  assert.equal(new Set(FEAT_IDS).size, FEAT_IDS.length, 'feat ids are unique');
});

test('detectFeats tolerates an empty or missing summary', () => {
  assert.deepEqual(detectFeats({}), []);
  assert.deepEqual(detectFeats(null), []);
  assert.deepEqual(detectFeats(undefined), []);
});

test('feat store records new ids only and reports the total', () => {
  const storage = memoryStorage();
  const store = createFeatStore(storage);

  assert.equal(store.total(), FEAT_IDS.length);
  assert.deepEqual(store.unlocked(), []);
  assert.deepEqual(store.unlock(['wingborne']), ['wingborne']);
  assert.deepEqual(store.unlock(['wingborne']), []);
  assert.deepEqual(store.unlock(['wingborne', 'ashfall']), ['ashfall']);
  assert.deepEqual(store.unlocked(), ['wingborne', 'ashfall']);

  const record = JSON.parse(storage.values.get(FEATS_STORE_KEY));
  assert.deepEqual(record, { unlocked: ['wingborne', 'ashfall'] });
});

test('feat store persists across instances sharing the same storage', () => {
  const storage = memoryStorage();
  assert.deepEqual(createFeatStore(storage).unlock(['coldCalculus', 'architect']), [
    'coldCalculus',
    'architect',
  ]);

  const reopened = createFeatStore(storage);
  assert.deepEqual(reopened.unlocked(), ['coldCalculus', 'architect']);
  assert.deepEqual(reopened.unlock(['coldCalculus']), []);
  assert.deepEqual(reopened.unlock(['warlordsBane']), ['warlordsBane']);
  assert.deepEqual(createFeatStore(storage).unlocked(), [
    'coldCalculus',
    'architect',
    'warlordsBane',
  ]);
});

test('breaking storage degrades to an empty store instead of throwing', () => {
  const broken = [
    undefined,
    null,
    { getItem: () => null, setItem: () => {} },
    {
      getItem: () => {
        throw new Error('storage is blocked');
      },
      setItem: () => {},
    },
    { getItem: () => '{ not json', setItem: () => {} },
    { getItem: () => '[]', setItem: () => {} },
    { getItem: () => '{"unlocked":"wingborne"}', setItem: () => {} },
    { getItem: () => '{}', setItem: () => {} },
    {
      getItem: () => null,
      setItem: () => {
        throw new Error('quota exceeded');
      },
    },
  ];

  for (const storage of broken) {
    const store = createFeatStore(storage);
    assert.equal(store.total(), FEAT_IDS.length);
    assert.deepEqual(store.unlocked(), []);
    // The unlock itself never throws and still reports what the run earned.
    assert.deepEqual(store.unlock(['wingborne']), ['wingborne']);
  }
});

test('newestFeats stores and returns only first-time feats', () => {
  // No store at all: the run still reports its feats rather than throwing.
  assert.deepEqual(newestFeats(summary({ burnKills: 100 }), null), ['ashfall']);

  const store = createFeatStore(memoryStorage());
  const won = summary({ victory: true, coreRatio: 1, maxChain: 60 });

  assert.deepEqual(newestFeats(won, store), ['wingborne', 'untouched']);
  assert.deepEqual(newestFeats(won, store), []);
  assert.deepEqual(store.unlocked(), ['wingborne', 'untouched']);
  // A later feat still lands once the earlier ones are already stored.
  assert.deepEqual(newestFeats(summary({ bossKills: 3 }), store), ['warlordsBane']);
  assert.deepEqual(store.unlocked(), ['wingborne', 'untouched', 'warlordsBane']);
});

test('summarizeRun carries the feat inputs and defaults them away', () => {
  const state = {
    mapId: 'keep',
    mode: 'endless',
    seed: 'keep:test',
    score: 1234.6,
    timeMs: 61000.4,
    phase: 'defeat',
    campaignCleared: false,
    core: { hp: 3, maxHp: 4 },
    stats: {
      wavesCleared: 7,
      kills: 40,
      maxChain: 12,
      towersBuilt: 4,
      damageTaken: 5.4,
      bossKills: 1,
      burnKills: 101,
      fireShots: 30,
      iceShots: 11,
    },
    towers: [{ level: 5 }, { level: 2 }, { level: 5 }],
    sockets: [{}, {}, {}],
  };

  assert.deepEqual(summarizeRun(state, { at: 'then' }), {
    at: 'then',
    mapId: 'keep',
    mode: 'endless',
    seed: 'keep:test',
    score: 1235,
    wavesCleared: 7,
    kills: 40,
    maxChain: 12,
    towersBuilt: 4,
    damageTaken: 5,
    bossKills: 1,
    timeMs: 61000,
    campaignCleared: false,
    victory: false,
    coreRatio: 0.75,
    burnKills: 101,
    fireShots: 30,
    iceShots: 11,
    towersMaxed: 2,
    socketsTotal: 3,
  });

  // The tower max level is overridable so the summary tracks balance changes.
  assert.equal(summarizeRun(state, { towerMaxLevel: 2 }).towersMaxed, 3);

  const bare = summarizeRun({
    mapId: 'keep',
    mode: 'campaign',
    seed: 'keep:bare',
    score: 10,
    timeMs: 1000,
    phase: 'defeat',
    core: { hp: 0, maxHp: 4 },
  });
  assert.deepEqual(
    [bare.burnKills, bare.fireShots, bare.iceShots, bare.towersMaxed, bare.socketsTotal],
    [0, 0, 0, 0, 0]
  );
  assert.equal(summarizeRun({ ...state, stats: {} }).fireShots, 0);
  assert.equal(summarizeRun({ ...state, towers: null, sockets: undefined }).socketsTotal, 0);
  assert.equal(summarizeRun({ ...state, towers: [{ level: 5 }], sockets: null }).towersMaxed, 1);
});

test('a summary from progress.js drives the feats end to end', () => {
  const state = {
    mapId: 'keep',
    mode: 'campaign',
    seed: 'keep:win',
    score: 9000,
    timeMs: 300000,
    phase: 'victory',
    campaignCleared: true,
    core: { hp: 4, maxHp: 4 },
    stats: {
      wavesCleared: 10,
      kills: 120,
      maxChain: 44,
      towersBuilt: 4,
      damageTaken: 0,
      bossKills: 2,
      burnKills: 30,
      fireShots: 0,
      iceShots: 88,
    },
    towers: [{ level: 5 }, { level: 5 }],
    sockets: [{}, {}],
  };

  const run = summarizeRun(state, { at: 'then' });
  assert.deepEqual(detectFeats(run), ['coldCalculus', 'untouched', 'architect']);
  assert.deepEqual(newestFeats(run, createFeatStore(memoryStorage())), [
    'coldCalculus',
    'untouched',
    'architect',
  ]);
});

test('every feat id has English copy with a name and a description', () => {
  for (const id of FEAT_IDS) {
    const entry = COPY.en.feats[id];
    assert.ok(entry, `copy.feats.${id} is missing`);
    assert.equal(typeof entry.name, 'string', `copy.feats.${id}.name`);
    assert.ok(entry.name.length > 0, `copy.feats.${id}.name is empty`);
    assert.equal(typeof entry.desc, 'string', `copy.feats.${id}.desc`);
    assert.ok(entry.desc.length > 0, `copy.feats.${id}.desc is empty`);
  }
});
