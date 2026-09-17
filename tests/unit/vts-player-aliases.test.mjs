import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = { VTS_ADMIN_AUTH: {} };
globalThis.localStorage = { getItem: () => null, setItem: () => {} };
globalThis.document = {
  getElementById: () => null,
  querySelector: () => null,
  querySelectorAll: () => [],
};

const { findBestMatch, state, expandDutyRawNames } = await import('../../js/ocr-shared.js');
const {
  resolveCanonicalPlayerIdentity,
  canonicalizePlayerOptionNames,
  summarizeCanonicalPlayerRecords,
} = await import('../../js/ocr-name-normalizer.js');
const { getContributionCanonicalName, getContributionSnapshotIdentity } =
  await import('../../js/contribution-identity.js');
const { resolvePlayerRegistryAlias, normalizePlayerRegistry } =
  await import('../../js/player-registry.js');
const { buildWeightedContributionRows, getWeightedPlayerFamilyKey } =
  await import('../../js/contribution-weighting.js');

const { getPublicVtsPlayerProfile } = await import('../../js/vts-public-players.js');
const { getSpecialPlayerTag } = await import('../../js/player-tags.js');
const { CONFIRMED_GROUPS, PENDING_GROUPS, resolveConfirmedPlayerAlias } =
  await import('../../js/vts-player-aliases.js');

test('confirmed canonical renames retain leadership badges and saved family rules', () => {
  assert.equal(getPublicVtsPlayerProfile('Moldo')?.name, 'Moldo1313');
  assert.equal(getPublicVtsPlayerProfile('Moldo1313')?.rank, 'R4');
  assert.equal(getSpecialPlayerTag(findBestMatch('Moldo'))?.label, 'R4');
  const oldGetItem = globalThis.localStorage.getItem;
  try {
    for (const [oldName, newName] of [
      ['Moldo', 'Moldo1313'],
      ['D offy.', 'D O F F Y'],
    ]) {
      globalThis.localStorage.getItem = () =>
        JSON.stringify({ players: [{ canonical: oldName, family: 'Custom family' }] });
      assert.equal(
        getWeightedPlayerFamilyKey(resolveCanonicalPlayerIdentity(newName).playerKey),
        'customfamily',
        oldName
      );
      assert.equal(resolvePlayerRegistryAlias(oldName), newName);
    }
  } finally {
    globalThis.localStorage.getItem = oldGetItem;
  }
});

// Derived from the module rather than duplicated, so the fixture cannot drift
// away from the shipped data the way it did before. Single-entry groups are
// separations with no aliases to fold, so they carry no assertions here.
const groups = CONFIRMED_GROUPS.filter((group) => group.length > 1);

test('every owner-confirmed alias shares a display and identity across VTS consumers', () => {
  for (const [canonical, ...aliases] of groups) {
    const identity = resolveCanonicalPlayerIdentity(canonical);
    for (const alias of [canonical, ...aliases]) {
      assert.equal(findBestMatch(alias), canonical, alias);
      assert.equal(findBestMatch(findBestMatch(alias)), canonical, `idempotent: ${alias}`);
      assert.equal(resolveCanonicalPlayerIdentity(`(Vet)${alias}`).playerName, canonical, alias);
      assert.equal(resolveCanonicalPlayerIdentity(alias).playerKey, identity.playerKey, alias);
      assert.equal(getContributionCanonicalName(alias), canonical, alias);
      assert.equal(
        getContributionSnapshotIdentity({ name: alias }),
        getContributionSnapshotIdentity({ name: canonical }),
        alias
      );
      assert.equal(resolvePlayerRegistryAlias(alias), canonical, alias);
    }
  }
});

const separateAccounts = [
  'DvD18',
  'DvD18 x2',
  'BiG BOiiE',
  'BOiiE',
  'BOiiE BANNER',
  'ANGEL',
  'Angel Banner',
  '** Loony **',
  'Little Loony',
  'Loony Banner',
  'REDBULLS',
  'RedBull#2',
  'RedBull#3',
  '~Sarafino~',
  '~Sarafina~',
  '꧁ Kika ꧂',
  '꧁༺ Kika ༻꧂',
  '꧁ Kika-banner ꧂',
  '꧁Kika-banner2꧂',
  'Kika2.0',
  'q. Immortal',
  'qmmortal.Banner',
  'Nosferatu',
];

test('confirmed accounts stay distinct even with a main-only roster and stale registry', () => {
  const previous = state.rosterNames;
  const oldGetItem = globalThis.localStorage.getItem;
  const registry = {
    players: [
      { canonical: 'DvD18', aliases: ['DvD18 x2'] },
      { canonical: 'ANGEL', aliases: ['Angel Banner'] },
      { canonical: 'BiG BOiiE', aliases: ['BOiiE', 'BOiiE BANNER'] },
      { canonical: '꧁ Kika ꧂', aliases: ['꧁༺ Kika ༻꧂'] },
    ],
  };
  try {
    state.rosterNames = ['DvD18', 'ANGEL', 'BiG BOiiE', 'Kika', 'Loony', 'RedBull#2'];
    globalThis.localStorage.getItem = () => JSON.stringify(registry);
    const identities = separateAccounts.map((name) => resolveCanonicalPlayerIdentity(name));
    assert.equal(new Set(identities.map((row) => row.playerKey)).size, separateAccounts.length);
    assert.equal(canonicalizePlayerOptionNames(separateAccounts).length, separateAccounts.length);
    assert.equal(
      summarizeCanonicalPlayerRecords(separateAccounts.map((name) => ({ name }))).length,
      separateAccounts.length
    );
    assert.equal(
      new Set(separateAccounts.map((name) => getContributionSnapshotIdentity({ name }, registry)))
        .size,
      separateAccounts.length
    );
    assert.equal(
      normalizePlayerRegistry({ players: [{ canonical: '꧁ Kika ꧂' }, { canonical: '꧁༺ Kika ༻꧂' }] })
        .players.length,
      2
    );
  } finally {
    state.rosterNames = previous;
    globalThis.localStorage.getItem = oldGetItem;
  }
});

test('weighted scoring joins confirmed variants and preserves distinct accounts and family totals', () => {
  const names = ['Anne', '• IU •', '=EstimatoR=', '=THOR=', ...separateAccounts];
  const model = buildWeightedContributionRows({
    contributionRecords: [
      {
        date: '2026-09-03',
        entries: names.map((name, index) => ({ name, rank: index + 1, contribution: 1000 })),
      },
    ],
    demolitionRecords: [
      {
        players: [
          { name: '↑Anne ↑', value: 2000 },
          { name: '•IU•', value: 4000 },
          { name: '==EstimatoR==', value: 6000 },
          { name: '-=EstimatoR=-', value: 4000 },
          { name: '__=THOR=__', value: 8000 },
          ...separateAccounts.map((name, index) => ({ name, value: (index + 1) * 20 })),
        ],
      },
    ],
  });
  assert.equal(model.rows.length, names.length);
  assert.equal(new Set(model.rows.map((row) => row.playerKey)).size, names.length);
  const byName = new Map(model.rows.map((row) => [row.playerName, row]));
  for (const [name, points] of [
    ['Anne', 100],
    ['• IU •', 200],
    ['=EstimatoR=', 500],
    ['=THOR=', 400],
  ]) {
    assert.equal(byName.get(name)?.demolitionPoints, points, name);
  }
  // Existing family reward policy consolidates demolition once on the primary
  // account, without merging contribution rows or changing account identities.
  const expectedFamilies = new Map();
  separateAccounts.forEach((name, index) => {
    const family = getWeightedPlayerFamilyKey(resolveCanonicalPlayerIdentity(name).playerKey);
    expectedFamilies.set(family, (expectedFamilies.get(family) || 0) + index + 1);
  });
  for (const [family, points] of expectedFamilies) {
    assert.equal(
      model.rows
        .filter((row) => row.familyKey === family)
        .reduce((sum, row) => sum + row.demolitionPoints, 0),
      points,
      family
    );
  }
  // Both EstimatoR source rows remain included; aliasing never deletes attack rows.
  assert.equal(byName.get('=EstimatoR=').totalDemolition, 10000);
});

test('one row OCR-read twice from overlapping screenshots counts once', () => {
  // Real X2 uploads: ΛNGƎL #24 = 33,113 and ΛNGEL #25 = 33,113 in one attack. One
  // account holds one row, so the same identity with the same value on the very
  // next row is a duplicate. The rule is deliberately that narrow.
  const totalFor = (players, name = 'ANGEL') =>
    buildWeightedContributionRows({
      contributionRecords: [
        { date: '2026-09-15', entries: [{ name, rank: 1, contribution: 1000 }] },
      ],
      demolitionRecords: [{ players }],
    }).rows[0].totalDemolition;

  assert.equal(
    totalFor([
      { name: 'ΛNGƎL', value: 33113 },
      { name: 'ΛNGEL', value: 33113 },
    ]),
    33113,
    'adjacent duplicate counts once'
  );
  assert.equal(
    totalFor([
      { name: 'ΛNGƎL', value: 33113 },
      { name: 'Anne', value: 500 },
      { name: 'ΛNGEL', value: 33113 },
    ]),
    66226,
    'a repeat that is not on the next row is kept'
  );
  assert.equal(
    totalFor([
      { name: 'ΛNGƎL', value: 33113 },
      { name: 'ΛNGEL', value: 2801 },
    ]),
    35914,
    'a repeat with a different value is kept'
  );
});

test('duty account identity remains separate from explicit operator credit', () => {
  assert.deepEqual(expandDutyRawNames('M@S$€₹~BANNER'), ['M@$T€€~BANNER']);
  assert.deepEqual(expandDutyRawNames('BOiiE BANNER'), ['BOiiE BANNER']);
  assert.deepEqual(expandDutyRawNames('@BOiiE BANNER'), ['BOiiE BANNER']);
  assert.deepEqual(expandDutyRawNames('Angel Banner (Moldo)'), ['Angel Banner', 'Moldo1313']);
});

test('clipped fragments and unapproved lookalikes never become confirmed aliases', () => {
  const previous = state.rosterNames;
  try {
    state.rosterNames = [];
    for (const name of [
      'tu',
      'Banner',
      'anner',
      '…mmortal.Banner',
      'M@$T€₹~BANI',
      'Unrelated Account',
    ]) {
      assert.equal(findBestMatch(name), name);
      assert.equal(getContributionCanonicalName(name), name.normalize('NFKC'));
    }
  } finally {
    state.rosterNames = previous;
  }
});

test('pending alias candidates stay inert until the owner confirms them', () => {
  // The list is empty today — the 2026-09-03 batch was confirmed in full — but
  // the guard stays, because OCR keeps producing new spellings and the next one
  // lands here first. A name in this list must never resolve: activating one
  // silently would merge two real accounts and move their demolition points
  // into one weighted score.
  for (const group of PENDING_GROUPS) {
    const question = group[group.length - 1];
    assert.equal(typeof question, 'string');
    assert.ok(question.length > 10, `${group[0]} records why it is pending`);
    for (const name of group.slice(0, -1)) {
      assert.equal(
        resolveConfirmedPlayerAlias(name),
        '',
        `${name} must not resolve while its group is pending`
      );
    }
  }
});

test('no name is both confirmed and pending', () => {
  const confirmed = new Set(CONFIRMED_GROUPS.flat().map((n) => n.toLowerCase()));
  const clashes = PENDING_GROUPS.flatMap((group) => group.slice(0, -1)).filter((name) =>
    confirmed.has(name.toLowerCase())
  );
  assert.deepEqual(clashes, [], 'a pending candidate leaked into the confirmed list');
});

test('Eden X2 audit spellings resolve to the account they were splitting from', () => {
  // Each split was dropping real demolition from weighted scores in X2.
  for (const [spelling, account] of [
    ['FAll£N', 'FALLEN'],
    ['Ar Ran Dil +62', 'Ar Ran ★_YG+62'],
    ['乃ㄥ凵乇', '乃ㄥ口毛'],
    ['EightBall', 'EightBall _V/_'],
    ['EviltwinlI', 'EviltwinII'],
    ['Co6oP', 'CoBoP'],
    ['NATAwHA', 'NATASHA'],
    ['Кутузовφ', 'Кутузовф'],
    ['Master Banner', 'M@$T€€~BANNER'],
    ['Rebull', 'REDBULLS'],
    ['Scimmia', 'La Scimmia'],
  ]) {
    assert.equal(resolveConfirmedPlayerAlias(spelling), account, spelling);
  }
  // Banner accounts that duty-cell cleaning must not strip to a missing owner.
  assert.equal(resolveConfirmedPlayerAlias('liskylli banner'), 'Liskylli banner');
  assert.equal(resolveConfirmedPlayerAlias('qImmortal.Banner'), 'qImmortal.Banner');
});

test('owner answers for the Eden X2 duty names hold (2026-09-15)', () => {
  for (const [spelling, account] of [
    ['Immortal', 'blaze banner 2'],
    ['q. Immortal', 'blaze banner 2'],
    ['Red', 'REDBULLS'],
    ['DVD181', 'DvD18'],
    ['DVD', 'DvD18'],
    ['AK', 'AK Чапай'],
    ['Loony 1', '** Loony **'],
    ['Bone', 'BoneSmoker'],
    ['Kiji', 'MalakaKiji'],
  ]) {
    assert.equal(resolveConfirmedPlayerAlias(spelling), account, spelling);
  }
  // Banner accounts score for their owner; both Blaze banners for Blaze.
  const familyOf = (name) =>
    getWeightedPlayerFamilyKey(resolveCanonicalPlayerIdentity(name).playerKey);
  assert.equal(familyOf('M@$T€€~BANNER'), familyOf('MasterVj'));
  assert.equal(familyOf('MalikaZenaBanner'), familyOf('MalikaZena'));
  assert.equal(familyOf('Blaze banner 1'), 'blaze');
  assert.equal(familyOf('blaze banner 2'), 'blaze');
  // Victoria is a Kika account: pooled into the family, never renamed.
  assert.equal(familyOf('~Victoria~'), 'kika');
  assert.equal(resolveConfirmedPlayerAlias('~Victoria~'), 'Victoria');
  // Kika's two decorated main-account spellings, and Take Ur Shin (now named
  // Anne), pool into their owners without being renamed.
  assert.equal(familyOf('𝒮𝒽𝒶𝓇𝒶 Kika 𝒮'), 'kika');
  assert.equal(familyOf('𝔖𝔖 Kika 𝔖𝔖'), 'kika');
  assert.equal(familyOf('Take Ur Shin'), familyOf('Anne'));
  assert.notEqual(familyOf('Mini Anne'), familyOf('Anne'));
  // Two different players, confirmed by the owner: never merged.
  assert.notEqual(familyOf('MALAK ANDURIL'), familyOf('MalakAbo'));
  // Lady Zubbs stays her own account inside the Zubbs family, and "(Zubbs)"
  // operator notes now earn credit.
  assert.equal(resolveConfirmedPlayerAlias('Zubbs'), '');
  assert.equal(familyOf('Lady Zubbs'), familyOf('Zubbs'));
});
