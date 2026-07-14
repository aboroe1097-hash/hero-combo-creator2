import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = {
  VTS_ADMIN_AUTH: {},
};
globalThis.localStorage = {
  getItem: () => null,
  setItem: () => {},
};
globalThis.document = {
  getElementById: () => null,
  querySelector: () => null,
  querySelectorAll: () => [],
};

const {
  canonicalizePlayerOptionNames,
  compactPlayerIdentity,
  expandDualCreditPlayerNames,
  resolveCanonicalPlayerIdentity,
  resolveCanonicalPlayerName,
  stripGuildTagsFromPlayerName,
  summarizeCanonicalPlayerRecords,
} = await import('../../js/ocr-name-normalizer.js');

function key(name) {
  return resolveCanonicalPlayerIdentity(name).playerKey;
}

test('player display cleanup strips leading guild tags and preserves real symbols', () => {
  assert.equal(stripGuildTagsFromPlayerName('(Vts)AK Чапай'), 'AK Чапай');
  assert.equal(stripGuildTagsFromPlayerName('(VTS) AK Чапай'), 'AK Чапай');
  assert.equal(stripGuildTagsFromPlayerName('(s) ✨ Kika ✨'), '✨ Kika ✨');
  assert.equal(stripGuildTagsFromPlayerName('s)GoodnesGraycious'), 'GoodnesGraycious');
  assert.equal(stripGuildTagsFromPlayerName('(VTS)(s) ★Aqua★'), '★Aqua★');
});

test('canonical resolver reuses existing aliases after guild-prefix cleanup', () => {
  assert.equal(resolveCanonicalPlayerName('(Vts)AK Чапай'), 'AK Чапай');
  assert.equal(resolveCanonicalPlayerName('(s) ✨ Kika ✨'), '꧁༺ Kika ༻꧂');
  assert.equal(resolveCanonicalPlayerName('s)GoodnesGraycious'), 'GoodnesGraycious');
});

test('attack-level identity cache invalidates when OCR values change', () => {
  const main = { name: '꧁ Kika ꧂', value: 200, rank: 1 };
  const alternate = { name: '꧁ Kika ꧂', value: 100, rank: 2 };
  const attackPlayers = [main, alternate];

  assert.equal(resolveCanonicalPlayerName(main, { attackPlayers }), '꧁ Kika ꧂');
  assert.equal(resolveCanonicalPlayerName(alternate, { attackPlayers }), '꧁༺ Kika ༻꧂');

  main.value = 50;
  alternate.value = 300;
  assert.equal(resolveCanonicalPlayerName(main, { attackPlayers }), '꧁༺ Kika ༻꧂');
  assert.equal(resolveCanonicalPlayerName(alternate, { attackPlayers }), '꧁ Kika ꧂');
});

test('canonical resolver merges special-list alias clusters', () => {
  assert.notEqual(key('Kika-banner'), key('Kika'));
  assert.notEqual(key('Kika-banner2'), key('Kika'));

  for (const raw of ['zubbs', 'Zubbs', 'Dr. Zubbs', 'zubbs?']) {
    assert.equal(resolveCanonicalPlayerName(raw), 'Zubbs');
    assert.equal(key(raw), compactPlayerIdentity('Zubbs'));
  }

  assert.equal(resolveCanonicalPlayerName('Moldo{zubbs}'), 'Moldo{zubbs}');
  assert.notEqual(key('Moldo{zubbs}'), compactPlayerIdentity('Zubbs'));

  for (const raw of ['Angel Banner', 'Angel v2', 'ANGEL']) {
    assert.equal(resolveCanonicalPlayerName(raw), 'ANGEL');
  }

  assert.notEqual(key('Sarafina~'), key('~Sarafino~'));
  assert.notEqual(key('UNDEAD'), key('Undead_Banner'));
});

test('canonical resolver collapses 2026-07 structure leaderboard OCR typos', () => {
  assert.equal(resolveCanonicalPlayerName('MasterVjpe'), 'MasterVj');
  assert.equal(resolveCanonicalPlayerName('yli90'), 'ylli90');
  assert.equal(resolveCanonicalPlayerName("INd'/Made3110"), 'Made3110');
  assert.equal(resolveCanonicalPlayerName('★★★ ЗВЕРЬ ★★★'), '3BEPb');
  assert.equal(resolveCanonicalPlayerName('★★★ЗВЕРЬ★★★'), '3BEPb');
  assert.equal(resolveCanonicalPlayerName('Dragon.Gold'), 'IDN Dragon.Gold');
  assert.equal(resolveCanonicalPlayerName('Northern fox,'), 'Northerner.');
  assert.equal(resolveCanonicalPlayerName('Ar Ran Dil★+62'), 'Ar Ran ★_YG+62');
});

test('canonical roster option names collapse known OCR duplicate spellings', () => {
  const options = canonicalizePlayerOptionNames([
    'Феечка))',
    'Феюшка))',
    'БратХрабрец',
    'БратХрапець',
    'БрюНерКаЯ',
    'БрюНетКаЯ',
    'БрЮНеТКаЯ',
    'Бешеный-Енот~',
    'Бешенный-Енот~',
    'гутер killer.',
    'Hunter killer.',
    'WICKED RUSSIAN',
    'WICKED banner',
  ]);

  assert.deepEqual(options, [
    'Феечка))',
    'БратХрабрец',
    'БрюНетКаЯ',
    'Бешенный-Енот~',
    'Hunter killer.',
    'WICKED RUSSIAN',
    'WICKED banner',
  ]);
});

test('dual-credit owner notation expands without collapsing operator into owner', () => {
  assert.deepEqual(expandDualCreditPlayerNames('Moldo{zubbs}'), ['Moldo', 'zubbs']);
  assert.deepEqual(expandDualCreditPlayerNames('Scout (Dr. Zubbs)'), ['Scout', 'Dr. Zubbs']);
});

test('canonical player summary groups by resolved identity and keeps simple columns', () => {
  const summary = summarizeCanonicalPlayerRecords([
    { name: '(Vts)Kika', time: '00:23', target: 'Gate' },
    { name: 'Kika-banner', time: '08:04', target: 'Bridge' },
    { name: 'Dr. Zubbs', time: '23:25', target: 'Pad' },
    { name: 'Moldo{zubbs}', time: '23:55', target: 'Pad' },
    { name: 'UNDEAD', time: '01:25', target: 'Gate' },
    { name: 'Undead_Banner', time: '03:00', target: 'Gate' },
  ]);

  // Kika and Kika-banner are now distinct accounts (banner no longer collapses
  // into the secondary Kika identity).
  const byPlayer = Object.fromEntries(
    summary.map((row) => [row.playerName, [row.entries, row.times]])
  );
  assert.deepEqual(byPlayer.UNDEAD, [1, ['01:25']]);
  assert.deepEqual(byPlayer.Undead_Banner, [1, ['03:00']]);
  assert.deepEqual(byPlayer.Zubbs, [2, ['23:25', '23:55']]);
  assert.deepEqual(byPlayer[resolveCanonicalPlayerName('Kika')], [1, ['00:23']]);
  assert.deepEqual(byPlayer[resolveCanonicalPlayerName('Kika-banner')], [1, ['08:04']]);
  assert.deepEqual(byPlayer.Moldo, [1, ['23:55']]);
});

test('canonical player summary can preserve special account identities', () => {
  const kikaMain = '\ua9c1 Kika \ua9c2';
  const kikaAlt = '\ua9c1\u0f3a Kika \u0f3b\ua9c2';
  const summary = summarizeCanonicalPlayerRecords(
    [
      { name: kikaMain, time: '00:10' },
      { name: kikaAlt, time: '00:20' },
    ],
    { preserveSpecialAccounts: true }
  );

  assert.deepEqual(
    summary.map((row) => [row.playerName, row.entries, row.times]),
    [
      [kikaMain, 1, ['00:10']],
      [kikaAlt, 1, ['00:20']],
    ]
  );
});
