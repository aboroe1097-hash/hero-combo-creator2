import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = {
  VTS_ADMIN_AUTH: {},
};
const localStorageData = new Map();
globalThis.localStorage = {
  getItem: (key) => localStorageData.get(key) ?? null,
  setItem: (key, value) => localStorageData.set(key, String(value)),
  removeItem: (key) => localStorageData.delete(key),
};
globalThis.document = {
  getElementById: () => null,
  querySelector: () => null,
  querySelectorAll: () => [],
};

const { normalizeStructureName, normalizeStructureTarget, parseOcrResults } =
  await import('../../js/ocr-engine.js');
const {
  findBestMatch,
  cleanDutyRawName,
  resolveDutyPlayerName,
  getDutyOperatorNote,
  looksLikeDutyOperator,
  getDutyCreditedNames,
  expandDutyRawNames,
  compactPlayerIdentity,
  formatDatasetStructureLabel,
  formatStructureLabel,
  MAX_ROSTER_SNAPSHOTS,
  normalizeStructureLevelForName,
  resolvePlayerNameForAttack,
  state,
  trimRosterSnapshots,
  validateTotalDemolition,
} = await import('../../js/ocr-shared.js');
const {
  PLAYER_REGISTRY_KEY,
  normalizePlayerRegistry,
  resolvePlayerRegistryAlias,
  writeStoredPlayerRegistry,
} = await import('../../js/player-registry.js');

test('OCR structure normalization fixes common visual confusions', () => {
  assert.equal(normalizeStructureName('capita1'), 'Capital');
  assert.equal(normalizeStructureName(' gate5 '), 'Gates');
  assert.equal(normalizeStructureName('temp1e'), 'Temple');
  assert.equal(normalizeStructureName('strongho1d unknown'), 'Stronghold');
});

test('OCR structure normalization preserves already-valid names', () => {
  assert.equal(normalizeStructureName('Capital'), 'Capital');
  assert.equal(normalizeStructureName('Custom Fortress'), 'Custom Fortress');
  assert.equal(normalizeStructureName(null), null);
});

test('Stronghold is accepted as a name-only structure', () => {
  assert.equal(normalizeStructureLevelForName('Stronghold', 'Lv1'), '');
  assert.equal(formatStructureLabel('Stronghold', 'Lv1'), 'Stronghold');
  assert.equal(validateTotalDemolition('Stronghold', '', 1000000)?.match, true);
  assert.equal(validateTotalDemolition('Gates', '', 200000), null);
});

test('structure target normalization treats common aliases as the same target', () => {
  for (const [name, level] of [
    ['Capitals Lv5', ''],
    ['Capital Lv5', ''],
    ['Capitals', '5'],
  ]) {
    assert.deepEqual(normalizeStructureTarget(name, level), {
      structure_name: 'Capital',
      structure_level: 'Lv5',
    });
  }

  for (const [name, level] of [
    ['Large Town Lv4', ''],
    ['Large Town 4', ''],
    ['Town Lv4', ''],
    ['Town 4', ''],
    ['Large Town', '4'],
  ]) {
    assert.deepEqual(normalizeStructureTarget(name, level), {
      structure_name: 'Large Town',
      structure_level: 'Lv4',
    });
  }

  assert.deepEqual(normalizeStructureTarget('Small Town Lv2', ''), {
    structure_name: 'City',
    structure_level: 'Lv2',
  });
  assert.equal(formatStructureLabel('Small Town', 'Lv2'), 'City Lv2');
  assert.equal(validateTotalDemolition('Small Town', 'Lv2', 2000000)?.expected, 2000000);
  assert.equal(validateTotalDemolition('Small Town', 'Lv2', 2000000)?.match, true);

  assert.deepEqual(normalizeStructureTarget('Check Point Lv2', ''), {
    structure_name: 'Gates',
    structure_level: 'Lv2',
  });
  assert.deepEqual(normalizeStructureTarget('Checkpoint 1', ''), {
    structure_name: 'Gates',
    structure_level: 'Lv1',
  });
  assert.deepEqual(normalizeStructureTarget('Checkpoint Lv7', ''), {
    structure_name: 'Gates',
    structure_level: 'Lv7',
  });
  assert.deepEqual(normalizeStructureTarget('Gates', 'Lv1'), {
    structure_name: 'Bridge',
    structure_level: 'Lv1',
  });
  assert.deepEqual(normalizeStructureTarget('Bridges', ''), {
    structure_name: 'Bridge',
    structure_level: 'Lv1',
  });
  assert.equal(formatStructureLabel('Gates', 'Lv1'), 'Bridge Lv1');
  assert.equal(formatStructureLabel('Check Point', 'Lv1'), 'Gates Lv1');
  assert.equal(formatStructureLabel('Bridges', ''), 'Bridge Lv1');
  assert.equal(validateTotalDemolition('Bridge', 'Lv1', 200000)?.match, true);
  assert.equal(validateTotalDemolition('Bridges', '', 200000)?.match, true);
  assert.equal(validateTotalDemolition('Check Point', 'Lv1', 200000)?.match, true);
  assert.equal(validateTotalDemolition('Checkpoint', 'Lv7', 2500000)?.expected, 2500000);
  assert.equal(validateTotalDemolition('Checkpoint', 'Lv7', 2500000)?.match, true);
  assert.equal(validateTotalDemolition('Town 4', '', 3750000)?.match, true);
});

test('manual structure display overrides stale OCR raw labels', () => {
  assert.equal(
    formatDatasetStructureLabel({
      structure_name: 'Capital',
      structure_level: 'Lv5',
      raw_structure_name: 'Ruins',
      raw_structure_level: '',
      display_structure_name: 'Capital',
      display_structure_level: 'Lv5',
    }),
    'Capital Lv5'
  );

  assert.equal(
    formatDatasetStructureLabel({
      structure_name: 'Capital',
      structure_level: 'Lv5',
      raw_structure_name: 'Ruins',
      raw_structure_level: '',
    }),
    'Capital Lv5'
  );
});

test('Lv.0 structure labels are preserved for distinct dataset targets', () => {
  assert.deepEqual(normalizeStructureTarget('Capital', 'Lv.0'), {
    structure_name: 'Capital',
    structure_level: 'Lv0',
  });
  assert.equal(formatStructureLabel('Capital', 'Lv.0'), 'Capital Lv0');
  assert.equal(
    formatDatasetStructureLabel({ structure_name: 'Capital', structure_level: 'Lv.0' }),
    'Capital Lv0'
  );
});

test('Capital Lv7 expected demolition is 4.5M', () => {
  const capital = validateTotalDemolition('Capital', 'Lv7', 4500000);
  const capitolAlias = validateTotalDemolition('Capitol', '7', 4500000);

  assert.equal(capital.expected, 4500000);
  assert.equal(capital.match, true);
  assert.equal(capitolAlias.expected, 4500000);
  assert.equal(capitolAlias.match, true);
});

test('Checkpoint Lv7 displays as Gate Lv7 and validates at 2.5M', () => {
  const attack = {
    structure_name: 'Gates',
    structure_level: 'Lv7',
    raw_structure_name: 'Checkpoint',
    raw_structure_level: '7',
  };

  assert.equal(formatDatasetStructureLabel(attack), 'Gate Lv7');
  assert.equal(validateTotalDemolition('Gates', 'Lv7', 2500000)?.expected, 2500000);
  assert.equal(validateTotalDemolition('Gates', 'Lv7', 2500000)?.match, true);
});

test('dataset structure labels canonicalize checkpoint display while canonical fields drive validation', () => {
  const parsed = parseOcrResults([
    {
      json: {
        timestamp: '2026-07-06 20:33:00',
        structure_name: 'Check Point',
        structure_level: '5',
        players: [{ name: 'Tester', value: 100000 }],
      },
    },
  ]);

  assert.equal(parsed.attacks[0].structure_name, 'Gates');
  assert.equal(parsed.attacks[0].structure_level, 'Lv5');
  assert.equal(parsed.attacks[0].raw_structure_name, 'Check Point');
  assert.equal(parsed.attacks[0].raw_structure_level, '5');
  assert.equal(formatDatasetStructureLabel(parsed.attacks[0]), 'Gate Lv5');
  assert.equal(
    validateTotalDemolition(
      parsed.attacks[0].structure_name,
      parsed.attacks[0].structure_level,
      2000000
    )?.match,
    true
  );
});

test('OCR parsing strips Stronghold levels from imported sessions', () => {
  const parsed = parseOcrResults([
    {
      json: {
        timestamp: '2026-07-06 20:33:00',
        structure_name: 'Stronghold',
        structure_level: '1',
        players: [{ name: 'Tester', value: 1000000 }],
      },
    },
  ]);

  assert.equal(parsed.attacks[0].structure_name, 'Stronghold');
  assert.equal(parsed.attacks[0].structure_level, '');
  assert.equal(parsed.players_summary[0].unique_structures, 1);
  assert.equal(parsed.players_summary[0].attacks[0].structure_level, '');
});

test('OCR parsing canonicalizes structure names and levels before grouping', () => {
  const parsed = parseOcrResults([
    {
      json: {
        timestamp: '2026-07-06 20:33:00',
        structure_name: 'Large Town Lv4',
        structure_level: null,
        players: [{ name: 'Tester', value: 1000000 }],
      },
    },
    {
      json: {
        timestamp: '2026-07-06 20:34:00',
        structure_name: 'Town 4',
        structure_level: null,
        players: [{ name: 'Second', value: 900000 }],
      },
    },
  ]);

  assert.equal(parsed.attacks.length, 1);
  assert.equal(parsed.attacks[0].structure_name, 'Large Town');
  assert.equal(parsed.attacks[0].structure_level, 'Lv4');
  assert.equal(parsed.attacks[0].players_count, 2);
});

test('approved player OCR aliases merge only into explicit canonical names', () => {
  const aliases = [
    ['キ미 kimmy', '키미 kimmy'],
    ['UNDEA', 'UNDEAD'],
    ['BlackDragOn09', 'BlackDrag0n09'],
    ['_EDDY_', '_EDDDY_'],
    ['mohmmmedsaif', 'mohmmedsaif'],
    ['Anne...', 'Anne'],
    ['^Anne^', 'Anne'],
    ['✨ Anne ✨', 'Anne'],
    ['Kika', '꧁ Kika ꧂'],
    ['≪Kika≫', '꧁༺ Kika ༻꧂'],
    ['✨ Kika ✨', '꧁༺ Kika ༻꧂'],
    ['꧁ Kika ꧂', '꧁ Kika ꧂'],
    ['MasterVj~', 'MasterVj'],
    ['✨MasterVj✨', 'MasterVj'],
    ['●■AGAM ■●', 'AGAM'],
    ['•◄ AGAM ►•', 'AGAM'],
    ['Aqua', '★Aqua★'],
    ['Lisavetka', '•Lisavetka•'],
    ['.Lisavetka.', '•Lisavetka•'],
    ['r@mze$$$', '★r@mze$$$★'],
    ['★r@mze$$$☆', '★r@mze$$$★'],
    ['WICKED WOMEN★', 'WICKED WOMEN☆'],
    ['!! LÜ BU !!', '!!LÜ BU!!'],
    ['АК Чапай', 'AK Чапай'],
    ['АКЧапай', 'AK Чапай'],
    ['AK Чапа́й', 'AK Чапай'],
    ['AKЧанай', 'AK Чапай'],
    ['AKЧапай', 'AK Чапай'],
    ['~☆RuCCaK☆~', '~RuCCaK~'],
    ['A n d ě R $', 'A n d e R $'],
    ['Àñděř$', 'A n d e R $'],
    ['A n d é R $', 'A n d e R $'],
    ['A nødëR $', 'A n d e R $'],
    ['AnděRS', 'A n d e R $'],
    ['ÀñäëR$', 'A n d e R $'],
    ['AηdēR$', 'A n d e R $'],
    ['AηdεR$', 'A n d e R $'],
    ['А η d ě R $', 'A n d e R $'],
    ['~I n d ø/Made3110', 'Made3110'],
    ['I N d O)Made3110', 'Made3110'],
    ['I nd°/Made3110', 'Made3110'],
    ['gindMade3110', 'Made3110'],
    ['vind?Made3110', 'Made3110'],
    ['x N d o /Made3110', 'Made3110'],
    ['IDNÓ/Dragon.Gold', 'IDN Dragon.Gold'],
    ['IDNÓ|Dragon.Gold', 'IDN Dragon.Gold'],
    ['түнгзахур', 'түнгзахурп'],
    ['тунгзахур', 'түнгзахурп'],
    ['Серей', 'Сергей'],
    ['Jjamaica pete', 'Jjamaica pete'],
    ['★★★ЗВЕРЬ★★★', '★★★ ЗВЕРЬ ★★★'],
  ];

  for (const [raw, canonical] of aliases) {
    assert.equal(findBestMatch(raw), canonical);
  }
});

test('mixed Cyrillic and Latin initials share the same player identity', () => {
  assert.equal(compactPlayerIdentity('АК Чапай'), compactPlayerIdentity('AK Чапай'));

  const previousRosterNames = state.rosterNames;
  state.rosterNames = ['AK Чапай'];
  try {
    assert.equal(findBestMatch('АК Чапай'), 'AK Чапай');
  } finally {
    state.rosterNames = previousRosterNames;
  }
});

test('player aliases keep known separate accounts apart', () => {
  assert.equal(findBestMatch('MalakAdo'), 'MalakAdo');
  assert.equal(findBestMatch('MalakAbo'), 'MalakAbo');
  assert.equal(findBestMatch('꧁ Kika ꧂'), '꧁ Kika ꧂');
  assert.equal(findBestMatch('꧁Kika꧂'), '꧁ Kika ꧂');
  assert.equal(findBestMatch('≪Kika≫'), '꧁༺ Kika ༻꧂');
  assert.equal(findBestMatch('꧁༺ Kika ༻꧂'), '꧁༺ Kika ༻꧂');
  assert.equal(findBestMatch('꧁༺Kika༻꧂'), '꧁༺ Kika ༻꧂');
  assert.equal(findBestMatch('༺ Kika ༻'), '꧁༺ Kika ༻꧂');
  assert.equal(findBestMatch('Kika-banner'), '꧁ Kika-banner ꧂');
  assert.equal(findBestMatch('꧁ Kika-banner ꧂'), '꧁ Kika-banner ꧂');
  assert.equal(findBestMatch('꧁Kika-banner꧂'), '꧁ Kika-banner ꧂');
  assert.equal(findBestMatch('Kika-banner2'), '꧁Kika-banner2꧂');
  assert.equal(findBestMatch('꧁ Kika-banner2 ꧂'), '꧁Kika-banner2꧂');
  assert.equal(findBestMatch('꧁Kika-banner2꧂'), '꧁Kika-banner2꧂');
  assert.equal(findBestMatch('REDBULL-#'), 'REDBULL-#');
  assert.equal(findBestMatch('REDBULLS'), 'REDBULLS');
  assert.equal(findBestMatch('REDBULL§'), 'REDBULLS');
  assert.equal(findBestMatch('REDBULL$'), 'REDBULLS');
  assert.equal(findBestMatch('RedBull®'), 'REDBULL-#');
  assert.equal(findBestMatch('RedBull©'), 'REDBULL-#');
  assert.equal(findBestMatch('RedBull@'), 'REDBULL-#');
  assert.equal(findBestMatch('Sarafina'), '~Sarafina~');
  assert.equal(findBestMatch('~Sarafina~'), '~Sarafina~');
  assert.equal(findBestMatch('Sarafino'), '~Sarafino~');
  assert.equal(findBestMatch('Dragon.Gold'), 'Dragon.Gold');
});

test('player registry aliases persist and resolve before roster matching', () => {
  localStorageData.delete(PLAYER_REGISTRY_KEY);
  const previousRosterNames = state.rosterNames;
  state.rosterNames = ['Registry Axe'];
  try {
    const registry = writeStoredPlayerRegistry({
      players: [
        {
          canonical: 'Registry Ace',
          aliases: ['R3gistry Ace'],
          accounts: [{ name: 'Ace Banner', type: 'banner' }],
        },
      ],
    });

    assert.equal(normalizePlayerRegistry(registry).players.length, 1);
    assert.equal(resolvePlayerRegistryAlias('Ace Banner'), 'Registry Ace');
    assert.equal(findBestMatch('R3gistry Ace'), 'Registry Ace');
    assert.equal(findBestMatch('Ace Banner'), 'Registry Ace');
  } finally {
    localStorageData.delete(PLAYER_REGISTRY_KEY);
    state.rosterNames = previousRosterNames;
  }
});

test('player registry aliases make duty operator credit known', () => {
  localStorageData.delete(PLAYER_REGISTRY_KEY);
  try {
    writeStoredPlayerRegistry({
      players: [{ canonical: 'Cloud Operator', aliases: ['helper zero'] }],
    });

    assert.equal(resolveDutyPlayerName('bridge @helper zero'), 'Cloud Operator');
    assert.deepEqual(getDutyCreditedNames('Main Banner (helper zero)', 'Main'), [
      'Main',
      'Cloud Operator',
    ]);
  } finally {
    localStorageData.delete(PLAYER_REGISTRY_KEY);
  }
});

test('player aliases fold decoration and OCR-typo variants into one master', () => {
  // From the 2026-06 debug-export dedup audit.
  assert.equal(findBestMatch('~Anne~'), 'Anne');
  assert.equal(findBestMatch('⌂ Anne ₿'), 'Anne');
  assert.equal(findBestMatch('✨Anne ✨'), 'Anne');
  assert.equal(findBestMatch('^^Anne^^'), 'Anne');
  assert.equal(findBestMatch('∧Anne∧'), 'Anne');
  assert.equal(findBestMatch('∧ Anne ∧'), 'Anne');
  assert.equal(findBestMatch('Neutrin010'), 'Neutrino10');
  assert.equal(findBestMatch('Åñdëř$'), 'A n d e R $');
  assert.equal(findBestMatch('Ånder$'), 'A n d e R $');
  assert.equal(findBestMatch('ÅñdëR$'), 'A n d e R $');
  assert.equal(findBestMatch('AndërS'), 'A n d e R $');
  assert.equal(findBestMatch('AndëRS'), 'A n d e R $');
  assert.equal(findBestMatch('AnděR$'), 'A n d e R $');
  assert.equal(findBestMatch('Àñdëř$'), 'A n d e R $');
  assert.equal(findBestMatch('ÀñäëèR$'), 'A n d e R $');
  assert.equal(findBestMatch('— L7 —'), '- L7 -');
  assert.equal(findBestMatch('Hunter Killer.'), 'Hunter killer.');
  assert.equal(findBestMatch('гутер killer.'), 'Hunter killer.');
  assert.equal(findBestMatch('Һunter Killer.'), 'Hunter killer.');
  assert.equal(findBestMatch('VICKED RUSSIAN'), 'WICKED RUSSIAN');
  assert.equal(findBestMatch('vicked Russian'), 'WICKED RUSSIAN');
  assert.equal(findBestMatch('WICKED WOMEN'), 'WICKED WOMEN☆');
  assert.equal(findBestMatch('☆r@mze$$$☆'), '★r@mze$$$★');
  assert.equal(findBestMatch('★r@nze$$$★'), '★r@mze$$$★');
  assert.equal(findBestMatch('·Lisavetka·'), '•Lisavetka•');
  assert.equal(findBestMatch('✨Nosferatu✨'), 'Nosferatu');
  assert.equal(findBestMatch('Batou-Zar'), 'Batou~Zar');
  assert.equal(findBestMatch('★ DEAN ★'), '*DEAN*');
  assert.equal(findBestMatch('★KoThawwKa ★'), 'KoThawwKa');
  assert.equal(findBestMatch('☆KoThawwKa☆'), 'KoThawwKa');
  assert.equal(findBestMatch('●■ AGAM ■●'), 'AGAM');
  assert.equal(findBestMatch('* Aqua *'), '★Aqua★');
  assert.equal(findBestMatch('★Aqua ★'), '★Aqua★');
  assert.equal(findBestMatch('IDN/Dragon.Gold'), 'IDN Dragon.Gold');
  assert.equal(findBestMatch('MasterVje'), 'MasterVj');
  assert.equal(findBestMatch('MasterVjce'), 'MasterVj');
  assert.equal(findBestMatch("I N d '/Made3110"), 'Made3110');
  assert.equal(findBestMatch('I N d \\/Made3110'), 'Made3110');
  assert.equal(findBestMatch('iN d°/Made3110'), 'Made3110');
  assert.equal(findBestMatch('«I N d ø»Made3110'), 'Made3110');
  assert.equal(findBestMatch('♀️i N d ♦️/Made3110'), 'Made3110');
  assert.equal(findBestMatch('♫ I N d ♦)Made3110'), 'Made3110');
  assert.equal(findBestMatch('↣N d°/Made3110'), 'Made3110');
  assert.equal(findBestMatch("'Isaan'"), '°Isaan°');
  assert.equal(findBestMatch('Тхий58'), 'Тихий58');
  assert.equal(findBestMatch('ОUNDEA'), 'UNDEAD');
  assert.equal(findBestMatch('Spoilagege'), 'Spoilage');
  assert.equal(findBestMatch('Mr. AHPD'), 'Mr. AHDP');
  assert.equal(findBestMatch('mohmedsaif'), 'mohmmedsaif');
  assert.equal(findBestMatch('BiG BOiE'), 'BiG BOiiE');
  assert.equal(findBestMatch('Oblitereted'), 'Obliterated');
  assert.equal(findBestMatch('MasterVjs'), 'MasterVj');
  assert.equal(findBestMatch('МЯТНАЯ ЛАПКА'), 'Мятная Лапка');
  assert.equal(findBestMatch('БратХраБрец'), 'БратХрабрец');
  assert.equal(findBestMatch('БратХрапець'), 'БратХрабрец');
  assert.equal(findBestMatch('БрюНерКаЯ'), 'БрюНетКаЯ');
  assert.equal(findBestMatch('БрЮНеТКаЯ'), 'БрюНетКаЯ');
  assert.equal(findBestMatch('Бешеный-Енот~'), 'Бешенный-Енот~');
});

test('known player aliases stay merged when canonical rows share one attack', () => {
  const attackPlayers = [
    { name: 'q. Immortal', value: 42000, rank: 1 },
    { name: 'q. Immortalis', value: 7000, rank: 2 },
    { name: 'DvD18', value: 12000, rank: 3 },
    { name: 'DvD18 x2', value: 3000, rank: 4 },
    { name: 'Феечка))', value: 8000, rank: 5 },
    { name: 'Феюшка))', value: 2000, rank: 6 },
  ];

  assert.equal(resolvePlayerNameForAttack(attackPlayers[1], attackPlayers), 'q. Immortal');
  assert.equal(resolvePlayerNameForAttack(attackPlayers[3], attackPlayers), 'DvD18');
  assert.equal(resolvePlayerNameForAttack(attackPlayers[5], attackPlayers), 'Феечка))');
});

test('cleanDutyRawName strips Viber noise and credits the banner account / @-owner', () => {
  // Target words merged into the cell.
  assert.equal(cleanDutyRawName('bridge @Roha'), 'Roha');
  assert.equal(cleanDutyRawName('town lvl1 @ANGEL VtS R4'), 'ANGEL VtS R4');
  assert.equal(cleanDutyRawName('capital @UNDEAD +'), 'UNDEAD');
  // Plain Viber @tag.
  assert.equal(cleanDutyRawName('@Maximus'), 'Maximus');
  // Credit the banner account / @-owner before the parenthetical; the note is metadata.
  assert.equal(cleanDutyRawName('Angel Banner (zubbs)'), 'Angel'); // ANGEL account, zubbs operated
  assert.equal(cleanDutyRawName('@redbull (osito)'), 'redbull'); // redbull tagged = owner
  assert.equal(cleanDutyRawName('redbull (RedBull banner)'), 'redbull');
  assert.equal(cleanDutyRawName('Moldo (zubbs)'), 'Moldo');
  // Banner-label suffix strips to the owner player.
  assert.equal(cleanDutyRawName('BOiiE BANNER'), 'BOiiE');
  assert.equal(cleanDutyRawName('Undead_Banner'), 'Undead');
  assert.equal(cleanDutyRawName('Kika-banner'), 'Kika');
  // Trailing OCR junk.
  assert.equal(cleanDutyRawName('A.S.KHAN","'), 'A.S.KHAN');
  // Multi-tag cell keeps the first real player tag.
  assert.equal(cleanDutyRawName('@UNDEAD + @BiG BOiiE'), 'UNDEAD');
  // Clean names pass through untouched.
  assert.equal(cleanDutyRawName('Neutrino10'), 'Neutrino10');
  assert.equal(cleanDutyRawName('~Sarafina~'), '~Sarafina~');
});

test('getDutyOperatorNote preserves the parenthetical metadata', () => {
  assert.equal(getDutyOperatorNote('Angel Banner (zubbs)'), 'zubbs');
  assert.equal(getDutyOperatorNote('@redbull (osito)'), 'osito');
  assert.equal(getDutyOperatorNote('Moldo (zubbs)'), 'zubbs');
  assert.equal(getDutyOperatorNote('@Maximus'), '');
});

test('looksLikeDutyOperator distinguishes operators from labels', () => {
  // Real operators -> true
  assert.equal(looksLikeDutyOperator('zubbs'), true);
  assert.equal(looksLikeDutyOperator('osito'), true);
  assert.equal(looksLikeDutyOperator('Teresita'), true);
  // Banner/account labels -> false (metadata, not a second credit)
  assert.equal(looksLikeDutyOperator('RedBull banner'), false);
  assert.equal(looksLikeDutyOperator('RedBull Banner 2'), false);
  assert.equal(looksLikeDutyOperator(''), false);
  assert.equal(looksLikeDutyOperator('Reserve'), false);
  assert.equal(looksLikeDutyOperator('Team 3'), false);
});

test('getDutyCreditedNames credits both banner account and operator', () => {
  // Operators only earn dual credit when they resolve to a KNOWN player
  // (roster/alias) — so run these with a roster fixture, like production.
  const previousRosterNames = state.rosterNames;
  state.rosterNames = ['Angel', 'Zubbs', 'osito', 'Moldo', 'redbull'];
  try {
    // Angel Banner (zubbs) -> credit ANGEL (account) AND zubbs (who operated it).
    const angel = getDutyCreditedNames('Angel Banner (zubbs)', 'Angel');
    assert.equal(angel[0], 'Angel');
    assert.equal(angel.length, 2);
    assert.equal(angel[1], resolveDutyPlayerName('zubbs'));
    assert.notEqual(angel[1], angel[0]);

    // @redbull (osito) -> credit RedBull manager/main only.
    const rb = getDutyCreditedNames('@redbull (osito)', 'redbull');
    assert.equal(rb[0], 'redbull');
    assert.equal(rb.length, 1);

    // Moldo (zubbs) -> credit Moldo AND zubbs (resolved through the roster).
    const moldo = getDutyCreditedNames('Moldo (zubbs)', 'Moldo');
    assert.equal(moldo[0], 'Moldo');
    assert.ok(moldo.includes('Zubbs'));
    assert.equal(moldo.length, 2);

    // Parenthetical chat noise that resolves to NO known player -> owner only.
    // These were minting phantom summary rows ("bubbles", "needs help").
    assert.deepEqual(getDutyCreditedNames('Angel v2 (bubbles)', 'ANGEL'), ['ANGEL']);
    assert.deepEqual(getDutyCreditedNames('Moldo (needs help)', 'Moldo'), ['Moldo']);
    assert.deepEqual(getDutyCreditedNames('Moldo (after +3)', 'Moldo'), ['Moldo']);
  } finally {
    state.rosterNames = previousRosterNames;
  }

  // A parenthetical that is a LABEL, not an operator -> owner only (no false credit).
  const label = getDutyCreditedNames('redbull (RedBull banner)', 'redbull');
  assert.deepEqual(label, ['redbull']);

  // Operator == owner (same player) -> dedup to a single credit.
  const dup = getDutyCreditedNames('Moldo (Moldo)', 'Moldo');
  assert.equal(dup.length, 1);
  assert.equal(dup[0], 'Moldo');

  // No parenthetical at all -> owner only.
  assert.deepEqual(getDutyCreditedNames('@Maximus', 'Maximus'), ['Maximus']);
  assert.deepEqual(getDutyCreditedNames('BOiiE BANNER', 'BOiiE'), ['BOiiE']);
});

test('resolveDutyPlayerName routes cleaned duty names through the shared authority', () => {
  // Falls back to the same aliasMap / protected identities as structures.
  assert.equal(resolveDutyPlayerName('Kika-banner'), '꧁ Kika ꧂'); // rolls up to operating player
  assert.equal(resolveDutyPlayerName('@Maximus'), 'Maximus');
  assert.equal(resolveDutyPlayerName('@Sheselkie'), '@Sheselkie');
  assert.equal(resolveDutyPlayerName('@sheselkie'), '@Sheselkie');
  assert.equal(resolveDutyPlayerName('capital @UNDEAD +'), 'UNDEAD');
  // Empty / junk-only input degrades to the trimmed raw, never throws.
  assert.equal(resolveDutyPlayerName('   '), '');
});

test('short OCR fragments require exact roster matches', () => {
  const previousRosterNames = state.rosterNames;
  try {
    state.rosterNames = ['Jon', 'Job', 'Joseph'];

    assert.equal(findBestMatch('Jo'), 'Jo');
    assert.equal(findBestMatch('J-o'), 'J-o');
    assert.equal(findBestMatch('Jon'), 'Jon');
  } finally {
    state.rosterNames = previousRosterNames;
  }
});

test('roster snapshot history is capped to the latest cloud-safe rows', () => {
  const snapshots = Array.from({ length: MAX_ROSTER_SNAPSHOTS + 7 }, (_, index) => ({
    date: `2026-06-${String(index + 1).padStart(2, '0')}`,
    members: [`Member ${index + 1}`],
  }));

  const trimmed = trimRosterSnapshots(snapshots);

  assert.equal(trimmed.length, MAX_ROSTER_SNAPSHOTS);
  assert.equal(trimmed[0].date, '2026-06-08');
  assert.equal(trimmed.at(-1).date, '2026-06-57');
});

test('Kika reward accounts stay separate in OCR summaries', () => {
  const parsed = parseOcrResults([
    {
      json: {
        timestamp: '2026-07-06 20:33:00',
        structure_name: 'Gates',
        structure_level: '2',
        players: [
          { name: '꧁Kika-banner2꧂', value: 4003 },
          { name: '꧁ Kika ꧂', value: 4002 },
          { name: '≪Kika≫', value: 4001 },
          { name: '꧁༺ Kika ༻꧂', value: 4001 },
          { name: '꧁ Kika-banner ꧂', value: 4000 },
        ],
      },
    },
  ]);

  assert.deepEqual(
    parsed.players_summary.map((p) => p.name).sort(),
    ['꧁ Kika ꧂', '꧁ Kika-banner ꧂', '꧁Kika-banner2꧂', '꧁༺ Kika ༻꧂'].sort()
  );
});

test('ornamental Kika main account stays separate from plain Kika in OCR summaries', () => {
  const parsed = parseOcrResults([
    {
      json: {
        timestamp: '2026-07-06 20:33:00',
        structure_name: 'Gates',
        structure_level: '2',
        players: [
          { name: 'Kika', value: 4004 },
          { name: '≪Kika≫', value: 4003 },
          { name: 'Kika-banner', value: 4002 },
          { name: 'Kika-banner2', value: 4001 },
        ],
      },
    },
  ]);

  assert.deepEqual(
    parsed.players_summary.map((p) => p.name).sort(),
    ['꧁ Kika ꧂', '꧁ Kika-banner ꧂', '꧁Kika-banner2꧂', '꧁༺ Kika ༻꧂'].sort()
  );
});

test('duplicate Kika-family rows on the same target split into separate account summaries', () => {
  const parsed = parseOcrResults([
    {
      json: {
        timestamp: '2026-06-21 05:32:00',
        structure_name: 'Gates',
        structure_level: '5',
        players: [
          { name: 'Kika', value: 41850 },
          { name: 'Kika', value: 7500 },
        ],
      },
    },
  ]);

  const byName = Object.fromEntries(parsed.players_summary.map((player) => [player.name, player]));
  assert.equal(parsed.players_summary.filter((player) => /Kika/.test(player.name)).length, 2);
  assert.equal(byName['꧁ Kika ꧂'].total_demolition, 41850);
  assert.equal(byName['꧁ Kika ꧂'].participation_count, 1);
  assert.equal(byName['꧁ Kika ꧂'].attacks.length, 1);
  assert.equal(byName['꧁༺ Kika ༻꧂'].total_demolition, 7500);
  assert.equal(byName['꧁༺ Kika ༻꧂'].participation_count, 1);
  assert.equal(byName['꧁༺ Kika ༻꧂'].attacks.length, 1);
  assert.deepEqual(
    parsed.players_summary.map((player) => player.attacks[0].display_player_name).sort(),
    ['꧁ Kika ꧂', '꧁༺ Kika ༻꧂'].sort()
  );
});

test('expandDutyRawNames splits multi-player cells and strips structure words', () => {
  // Single @-tagged player: Viber tag stripped.
  assert.deepEqual(expandDutyRawNames('@ANGEL'), ['ANGEL']);
  assert.deepEqual(expandDutyRawNames('gate @Sheselkie'), ['@Sheselkie']);

  // Multi-player: "gate @redull @+ Ezeta TV" -> RedBull main + Ezeta TV.
  const multi = expandDutyRawNames('gate @redull @+ Ezeta TV');
  assert.ok(multi.includes('REDBULLS'));
  assert.ok(multi.includes('Ezeta TV'));
  assert.equal(multi.length, 2);

  // RedBull parentheticals are manager labels, not second duty credits.
  assert.deepEqual(expandDutyRawNames('@redbull (osito)'), ['REDBULLS']);
  assert.deepEqual(expandDutyRawNames('bridge @redbull (Teresita)'), ['REDBULLS']);

  // Leading target word dropped: "town lvl1" before @tag.
  assert.deepEqual(expandDutyRawNames('town lvl1 @Uzumaki'), ['!!Uzumaki!!']);

  // Parenthetical operator included (dual credit) — but ONLY when the note
  // resolves to a known roster player; unresolved notes are chat noise.
  const previousRosterNames = state.rosterNames;
  state.rosterNames = ['Angel', 'Zubbs'];
  try {
    const op = expandDutyRawNames('Angel Banner (zubbs)');
    assert.equal(op[0], 'Angel');
    assert.equal(op[1], 'Zubbs');
    assert.equal(op.length, 2);

    // Noise notes never mint phantom players.
    assert.deepEqual(expandDutyRawNames('Angel (needs help)'), ['Angel']);
    assert.deepEqual(expandDutyRawNames('Angel v2 (bubbles)'), ['Angel v2']);
  } finally {
    state.rosterNames = previousRosterNames;
  }

  // Structure-only cell -> empty (no real player).
  assert.deepEqual(expandDutyRawNames('town lvl1'), []);

  // Banner-label suffix (BOiiE resolves through aliasMap).
  assert.deepEqual(expandDutyRawNames('BOiiE BANNER'), ['BiG BOiiE']);

  // Empty input.
  assert.deepEqual(expandDutyRawNames(''), []);
  assert.deepEqual(expandDutyRawNames('   '), []);

  // "+" reinforcement markers stripped.
  assert.deepEqual(expandDutyRawNames('capital @UNDEAD +'), ['UNDEAD']);

  // @-tagged player with banner suffix (redbull resolves through aliasMap).
  assert.deepEqual(expandDutyRawNames('@redbull banner'), ['REDBULLS']);

  // Operator is same as owner -> dedup within function.
  const dedup = expandDutyRawNames('Moldo (Moldo)');
  assert.deepEqual(dedup, ['Moldo']);
});
