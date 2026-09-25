import test from 'node:test';
import assert from 'node:assert/strict';

import {
  baseRankedCombos,
  filterCombosForSkinMode,
  rankedCombos,
  shippedRankedCombos,
} from '../../js/combos-db.js';
import { allHeroesData } from '../../js/heroes-data.js';
import {
  applyCachedLiveCombos,
  applyComboList,
  buildCombosPlanDoc,
  COMBOS_LIVE_CACHE_KEY,
  COMBOS_PLAN_KEYS,
  COMBOS_UPDATED_EVENT,
  combosHash,
  liveCombosSource,
  loadLiveCombos,
  readCombosPlanDoc,
  shippedCombosHash,
  validateComboEntries,
} from '../../js/combos-live.js';

const heroNames = new Set(allHeroesData.map((hero) => hero.name));
const copy = (list) => list.map((c) => ({ ...c, heroes: [...c.heroes] }));
const shipped = () => copy(shippedRankedCombos);
// The published order in these tests: the shipped list, reversed.
const reversed = () => shipped().reverse();

function memoryStorage() {
  const data = new Map();
  return {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
    data,
  };
}

// combos-live dispatches on window; node has none, so give it one for these tests.
const events = [];
globalThis.window = new EventTarget();
globalThis.window.addEventListener(COMBOS_UPDATED_EVENT, (event) => events.push(event.detail));

test.afterEach(() => {
  applyComboList(null);
  events.length = 0;
});

test('the validator accepts the shipped list and names the first bad entry otherwise', () => {
  const ok = validateComboEntries(shipped(), heroNames);
  assert.equal(ok.ok, true);
  assert.equal(ok.entries.length, shippedRankedCombos.length);
  const bad = (mutate) => {
    const list = shipped();
    mutate(list);
    return validateComboEntries(list, heroNames);
  };
  assert.match(
    bad((l) => (l[4].heroes = ['Nobody', ...l[4].heroes.slice(1)])).error,
    /entry 5 names an unknown hero/
  );
  assert.match(
    bad((l) => (l[0].heroes = [l[0].heroes[0], l[0].heroes[0], l[0].heroes[1]])).error,
    /entry 1 repeats a hero/
  );
  assert.match(
    bad((l) => (l[1].heroes = l[1].heroes.slice(0, 2))).error,
    /entry 2 needs three heroes/
  );
  assert.match(bad((l) => (l[2].skin = '404')).error, /entry 3 has a bad skin code/);
  assert.match(bad((l) => (l[2].note = 'x'.repeat(201))).error, /entry 3 has a bad note/);
  assert.match(bad((l) => (l[2].rank = 1)).error, /entry 3 has unknown keys: rank/);
  assert.match(
    bad((l) => l.push({ ...l[0], heroes: [...l[0].heroes] })).error,
    /repeats an earlier lineup/
  );
  assert.match(validateComboEntries([], heroNames).error, /empty/);
  assert.match(validateComboEntries({}, heroNames).error, /not a list/);
  const long = Array.from({ length: 601 }, () => shippedRankedCombos[0]);
  assert.match(validateComboEntries(long, heroNames).error, /more than 600/);
});

test('a document is read as published only when it is valid and not useShipped', () => {
  const doc = { ...buildCombosPlanDoc(reversed()), updatedAt: new Date(), updatedBy: 'u' };
  assert.deepEqual(Object.keys(doc).sort(), [...COMBOS_PLAN_KEYS].sort());
  assert.equal(doc.count, doc.entries.length);
  assert.equal(doc.shippedHash, shippedCombosHash());
  assert.equal(readCombosPlanDoc(doc, heroNames).use, 'published');
  assert.equal(readCombosPlanDoc({ ...doc, useShipped: true }, heroNames).use, 'shipped');
  assert.equal(readCombosPlanDoc({ ...doc, count: 3 }, heroNames).use, 'shipped');
  assert.equal(readCombosPlanDoc(null, heroNames).use, 'shipped');
  const shippedDoc = buildCombosPlanDoc(shipped(), { useShipped: true });
  assert.deepEqual(shippedDoc.entries, []);
  assert.equal(shippedDoc.useShipped, true);
  // The whole published list stays far below Firestore's 1 MiB document limit.
  assert.ok(Buffer.byteLength(JSON.stringify(doc)) < 64 * 1024);
});

test('a valid published list replaces the ranking in place and fires combos:updated', async () => {
  const before = rankedCombos;
  const baseBefore = baseRankedCombos;
  const storage = memoryStorage();
  const doc = buildCombosPlanDoc(reversed());
  const decision = await loadLiveCombos({ heroNames, storage, fetchDoc: async () => doc });
  assert.equal(decision.use, 'published');
  assert.equal(rankedCombos, before, 'the same array, so every importer sees the change');
  assert.equal(baseRankedCombos, baseBefore);
  assert.deepEqual(
    copy(rankedCombos),
    reversed().map(({ heroes, skin, note }) => ({
      heroes,
      ...(skin ? { skin } : {}),
      ...(note ? { note } : {}),
    }))
  );
  assert.deepEqual(copy(baseRankedCombos), copy(filterCombosForSkinMode(rankedCombos, false)));
  assert.equal(liveCombosSource(), 'published');
  assert.equal(events.length, 1);
  assert.equal(events[0].source, 'published');
  // The valid list is cached for the next visit, with the shipped file it was built on.
  const cached = JSON.parse(storage.getItem(COMBOS_LIVE_CACHE_KEY));
  assert.equal(cached.shippedHash, shippedCombosHash());
  assert.equal(combosHash(cached.entries), combosHash(rankedCombos));
  // Publishing the same list again changes nothing and fires nothing.
  await loadLiveCombos({ heroNames, storage, fetchDoc: async () => doc });
  assert.equal(events.length, 1);
});

test('a bad entry keeps the shipped list, and useShipped restores it', async () => {
  const storage = memoryStorage();
  const broken = buildCombosPlanDoc(reversed());
  broken.entries[10] = { heroes: ['Nobody', 'Lawman', 'Bjorn'] };
  const decision = await loadLiveCombos({ heroNames, storage, fetchDoc: async () => broken });
  assert.equal(decision.use, 'shipped');
  assert.match(decision.reason, /entry 11 names an unknown hero/);
  assert.equal(combosHash(rankedCombos), shippedCombosHash());
  assert.equal(events.length, 0);

  await loadLiveCombos({
    heroNames,
    storage,
    fetchDoc: async () => buildCombosPlanDoc(reversed()),
  });
  assert.notEqual(combosHash(rankedCombos), shippedCombosHash());
  const back = await loadLiveCombos({
    heroNames,
    storage,
    fetchDoc: async () => buildCombosPlanDoc(reversed(), { useShipped: true }),
  });
  assert.equal(back.use, 'shipped');
  assert.equal(combosHash(rankedCombos), shippedCombosHash());
  assert.deepEqual(rankedCombos, [...shippedRankedCombos], 'the original combo objects are back');
  assert.equal(storage.getItem(COMBOS_LIVE_CACHE_KEY), null, 'and the cache is cleared');
  assert.deepEqual(
    events.map((e) => e.source),
    ['published', 'shipped']
  );
});

test('a failed read keeps whatever is live; the cache applies synchronously and is revalidated', async () => {
  const storage = memoryStorage();
  storage.setItem(
    COMBOS_LIVE_CACHE_KEY,
    JSON.stringify({ shippedHash: shippedCombosHash(), entries: reversed() })
  );
  assert.equal(applyCachedLiveCombos({ heroNames, storage }), true);
  assert.equal(liveCombosSource(), 'cache');
  assert.deepEqual(rankedCombos[0].heroes, shippedRankedCombos.at(-1).heroes);

  const failed = await loadLiveCombos({
    heroNames,
    storage,
    fetchDoc: async () => {
      throw new Error('offline');
    },
  });
  assert.match(failed.reason, /read failed: offline/);
  assert.equal(liveCombosSource(), 'cache', 'an unreachable Firestore does not undo the cache');

  // A cache built on another shipped file, or a corrupt one, is dropped.
  applyComboList(null);
  storage.setItem(
    COMBOS_LIVE_CACHE_KEY,
    JSON.stringify({ shippedHash: 'other', entries: reversed() })
  );
  assert.equal(applyCachedLiveCombos({ heroNames, storage }), false);
  assert.equal(storage.getItem(COMBOS_LIVE_CACHE_KEY), null);
  storage.setItem(COMBOS_LIVE_CACHE_KEY, '{not json');
  assert.equal(applyCachedLiveCombos({ heroNames, storage }), false);
  const throwing = {
    getItem() {
      throw new Error('blocked');
    },
    setItem() {
      throw new Error('blocked');
    },
    removeItem() {
      throw new Error('blocked');
    },
  };
  assert.equal(applyCachedLiveCombos({ heroNames, storage: throwing }), false);
  const ok = await loadLiveCombos({
    heroNames,
    storage: throwing,
    fetchDoc: async () => buildCombosPlanDoc(reversed()),
  });
  assert.equal(ok.use, 'published', 'blocked storage never blocks the published list');
});

test('the player app starts the loader off the critical path, and the views listen', async () => {
  const { readFile } = await import('node:fs/promises');
  const read = (rel) => readFile(new URL('../../' + rel, import.meta.url), 'utf8');
  const boot = await read('js/combos-live-boot.js');
  assert.match(boot, /applyCachedLiveCombos\(\{ heroNames \}\)/);
  assert.match(boot, /requestIdleCallback\(start/);
  assert.match(boot, /host !== 'localhost' && host !== '127\.0\.0\.1'/);
  const generator = await read('js/app-generator.js');
  assert.match(generator, /import '\.\/combos-live-boot\.js';/);
  assert.match(
    generator,
    /addEventListener\('combos:updated', \(\) => refreshGeneratorForRankingChange\(\)\)/
  );
  assert.match(await read('js/app-hero-atlas.js'), /addEventListener\('combos:updated'/);
  assert.match(await read('js/app-strife.js'), /addEventListener\('combos:updated'/);
  // The admin page never starts it: its planner parses the shipped file.
  const admin = await read('js/admin-combos.js');
  assert.doesNotMatch(admin, /combos-live-boot/);
  assert.match(admin, /shippedRankedCombos/);
});
