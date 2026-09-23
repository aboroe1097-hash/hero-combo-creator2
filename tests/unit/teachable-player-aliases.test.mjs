// Aliases the owner teaches from the Accounts tab.
//
// "sometimes we have abbreviation for some players — we call Lady Zubbs just
// zubs". A taught entry is stored in the player registry (the same map that
// carries accountLinks), so it needs no rules change, and it resolves through
// the one alias authority that findBestMatch already consults. Order matters:
// taught first, then the confirmed groups, then the fuzzy roster match. A taught
// entry must win, because an entry that loses to a list compiled months earlier
// could not correct anything.
import assert from 'node:assert/strict';
import test from 'node:test';

globalThis.window = { VTS_ADMIN_AUTH: {} };
globalThis.localStorage = { getItem: () => null, setItem: () => {} };
globalThis.document = {
  getElementById: () => null,
  querySelector: () => null,
  querySelectorAll: () => [],
};

const {
  CONFIRMED_GROUPS,
  MAX_PLAYER_ALIASES,
  SEEDED_PLAYER_ALIASES,
  normalizeTaughtPlayerAliases,
  resolveConfirmedPlayerAlias,
  setTaughtPlayerAliases,
} = await import('../../js/vts-player-aliases.js');
const {
  currentPlayerRegistry,
  normalizePlayerRegistry,
  resolvePlayerRegistryAlias,
  writeStoredPlayerRegistry,
} = await import('../../js/player-registry.js');
const { findBestMatch, state } = await import('../../js/ocr-shared.js');

function withRosterNames(names, run) {
  const previous = state.rosterNames;
  state.rosterNames = names;
  try {
    return run();
  } finally {
    state.rosterNames = previous;
  }
}

test('the owner-taught abbreviations ship as defaults and resolve', () => {
  // The two the owner gave in words, spelled the way they are typed.
  assert.deepEqual(
    SEEDED_PLAYER_ALIASES.map((entry) => [entry.alias, entry.canonical]),
    [
      ['zubs', 'Lady Zubbs'],
      ['Zubbs', 'Lady Zubbs'],
      ['kiji', 'MalakaKiji'],
    ]
  );

  assert.equal(resolveConfirmedPlayerAlias('zubs'), 'Lady Zubbs');
  assert.equal(resolveConfirmedPlayerAlias('Zubbs'), 'Lady Zubbs');
  assert.equal(resolveConfirmedPlayerAlias('kiji'), 'MalakaKiji');
  // Case and surrounding whitespace are the alias key's business, so the way a
  // hand-typed duty cell carries it does not matter.
  assert.equal(resolveConfirmedPlayerAlias('  KIJI '), 'MalakaKiji');
  withRosterNames([], () => {
    assert.equal(findBestMatch('zubs'), 'Lady Zubbs');
    assert.equal(findBestMatch('kiji'), 'MalakaKiji');
  });
  // Several aliases may point at one player: the list is a map of spellings, not
  // a second identity hierarchy.
  assert.equal(SEEDED_PLAYER_ALIASES.filter((entry) => entry.canonical === 'Lady Zubbs').length, 2);
});

test('a taught alias is consulted before the confirmed groups, so teaching one wins', () => {
  const confirmed = CONFIRMED_GROUPS.find((group) => group.includes('Kiji'));
  assert.ok(confirmed, 'Kiji is a confirmed group, which is what makes this a real override');
  assert.equal(resolveConfirmedPlayerAlias('Kiji'), 'MalakaKiji');

  try {
    setTaughtPlayerAliases([{ alias: 'Kiji', canonical: 'Someone Else' }]);
    assert.equal(resolveConfirmedPlayerAlias('Kiji'), 'Someone Else');
    // And the whole authority follows, because it asks this one function.
    withRosterNames([], () => assert.equal(findBestMatch('kiji'), 'Someone Else'));
    assert.equal(resolvePlayerRegistryAlias('Kiji'), 'Someone Else');
  } finally {
    // The seeded defaults are restored, so one test cannot leak into the next.
    setTaughtPlayerAliases([]);
  }
  assert.equal(resolveConfirmedPlayerAlias('Kiji'), 'MalakaKiji');

  // A taught entry never invents a spelling out of nothing: an unrelated name
  // keeps falling through to the fuzzy matcher.
  withRosterNames(['Unrelated Account'], () => {
    assert.equal(findBestMatch('unrelated accunt'), 'Unrelated Account');
  });
});

test('taught aliases live in the player registry and round-trip through it', () => {
  // A real storage round trip, because the registry is published from the same
  // storage the resolver reads: saving is what makes a taught spelling live.
  const store = new Map();
  const previousStorage = globalThis.localStorage;
  globalThis.localStorage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, value),
  };
  try {
    const registry = normalizePlayerRegistry({
      players: [{ canonical: 'Lady Zubbs' }],
      accountLinks: [{ account: 'Angel Banner', owner: 'ANGEL', type: 'banner' }],
      playerAliases: [{ alias: 'lz', canonical: 'Lady Zubbs', createdAt: '2026-09-23T00:00:00Z' }],
    });
    assert.deepEqual(registry.playerAliases, [
      { alias: 'lz', canonical: 'Lady Zubbs', createdAt: '2026-09-23T00:00:00Z' },
    ]);
    // The registry is saved and published with the dashboard data it belongs to.
    const written = writeStoredPlayerRegistry(registry);
    assert.deepEqual(written.playerAliases, registry.playerAliases);
    assert.deepEqual(
      normalizePlayerRegistry(store.get('vts_player_registry')).playerAliases,
      registry.playerAliases
    );

    assert.equal(resolveConfirmedPlayerAlias('lz'), 'Lady Zubbs');
    assert.equal(resolvePlayerRegistryAlias('lz'), 'Lady Zubbs');
    withRosterNames([], () => assert.equal(findBestMatch('lz'), 'Lady Zubbs'));

    // Several aliases may point at one player: teaching a second spelling adds
    // to the list rather than replacing the first.
    writeStoredPlayerRegistry({
      ...written,
      playerAliases: [...written.playerAliases, { alias: 'mk', canonical: 'MalakaKiji' }],
    });
    assert.equal(resolveConfirmedPlayerAlias('lz'), 'Lady Zubbs');
    assert.equal(resolveConfirmedPlayerAlias('mk'), 'MalakaKiji');
  } finally {
    globalThis.localStorage = previousStorage;
    // Re-read the restored storage so the next test starts from an empty
    // registry rather than this one.
    currentPlayerRegistry();
  }
});

test('hostile taught entries are trimmed, capped and never self-aliases', () => {
  const cleaned = normalizeTaughtPlayerAliases([
    { alias: '  zubs ', canonical: 'Lady Zubbs', createdAt: 7 },
    { alias: 'zubs', canonical: 'Someone Else' },
    { alias: 'nobody', canonical: 'nobody' },
    { alias: '', canonical: 'x' },
    { alias: 'x', canonical: '' },
    null,
    'nonsense',
    ...Array.from({ length: MAX_PLAYER_ALIASES }, (unused, index) => ({
      alias: `filler-${index}`,
      canonical: 'Filler',
    })),
  ]);
  assert.equal(cleaned.length, MAX_PLAYER_ALIASES);
  assert.deepEqual(cleaned[0], { alias: 'zubs', canonical: 'Lady Zubbs', createdAt: '7' });
  // The first entry for a spelling wins: re-teaching it replaces, it does not
  // append a second meaning.
  assert.equal(cleaned.filter((entry) => entry.alias === 'zubs').length, 1);
  assert.equal(
    cleaned.some((entry) => entry.alias.toLowerCase() === entry.canonical.toLowerCase()),
    false
  );
});
