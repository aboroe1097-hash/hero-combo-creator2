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
  assert.equal(resolveCanonicalPlayerName('(s) ✨ Kika ✨'), resolveCanonicalPlayerName('Kika'));
  assert.equal(resolveCanonicalPlayerName('s)GoodnesGraycious'), 'GoodnesGraycious');
});

test('canonical resolver merges special-list alias clusters', () => {
  assert.equal(key('Kika-banner'), key('Kika'));
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

  assert.equal(key('Sarafina~'), key('~Sarafino~'));
  assert.equal(key('UNDEAD'), key('Undead_Banner'));
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

  assert.deepEqual(
    summary.map((row) => [row.playerName, row.entries, row.times]),
    [
      [resolveCanonicalPlayerName('Kika'), 2, ['00:23', '08:04']],
      ['UNDEAD', 2, ['01:25', '03:00']],
      ['Zubbs', 2, ['23:25', '23:55']],
      ['Moldo', 1, ['23:55']],
    ]
  );
});
