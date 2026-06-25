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

const { normalizeStructureName, normalizeStructureTarget, parseOcrResults } =
  await import('../../js/ocr-engine.js');
const {
  findBestMatch,
  cleanDutyRawName,
  resolveDutyPlayerName,
  getDutyOperatorNote,
  compactPlayerIdentity,
  formatDatasetStructureLabel,
  formatStructureLabel,
  MAX_ROSTER_SNAPSHOTS,
  normalizeStructureLevelForName,
  state,
  trimRosterSnapshots,
  validateTotalDemolition,
} = await import('../../js/ocr-shared.js');

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

  assert.deepEqual(normalizeStructureTarget('Check Point Lv2', ''), {
    structure_name: 'Gates',
    structure_level: 'Lv2',
  });
  assert.deepEqual(normalizeStructureTarget('Checkpoint 1', ''), {
    structure_name: 'Bridge',
    structure_level: 'Lv1',
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
  assert.equal(formatStructureLabel('Check Point', 'Lv1'), 'Bridge Lv1');
  assert.equal(formatStructureLabel('Bridges', ''), 'Bridge Lv1');
  assert.equal(validateTotalDemolition('Bridge', 'Lv1', 200000)?.match, true);
  assert.equal(validateTotalDemolition('Bridges', '', 200000)?.match, true);
  assert.equal(validateTotalDemolition('Check Point', 'Lv1', 200000)?.match, true);
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

test('dataset structure labels preserve extracted names while canonical fields drive validation', () => {
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
  assert.equal(formatDatasetStructureLabel(parsed.attacks[0]), 'Check Point Lv5');
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
    ['✨ Kika ✨', '꧁ Kika ꧂'],
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
  assert.equal(findBestMatch('Sarafina'), '~Sarafina~');
  assert.equal(findBestMatch('~Sarafina~'), '~Sarafina~');
  assert.equal(findBestMatch('Sarafino'), '~Sarafino~');
  assert.equal(findBestMatch('Dragon.Gold'), 'Dragon.Gold');
});

test('player aliases fold decoration and OCR-typo variants into one master', () => {
  // From the 2026-06 debug-export dedup audit.
  assert.equal(findBestMatch('~Anne~'), 'Anne');
  assert.equal(findBestMatch('⌂ Anne ₿'), 'Anne');
  assert.equal(findBestMatch('✨Anne ✨'), 'Anne');
  assert.equal(findBestMatch('Neutrin010'), 'Neutrino10');
  assert.equal(findBestMatch('Åñdëř$'), 'A n d e R $');
  assert.equal(findBestMatch('AndërS'), 'A n d e R $');
  assert.equal(findBestMatch('AndëRS'), 'A n d e R $');
  assert.equal(findBestMatch('— L7 —'), '- L7 -');
  assert.equal(findBestMatch('Hunter Killer.'), 'Hunter killer.');
  assert.equal(findBestMatch('WICKED WOMEN'), 'WICKED WOMEN☆');
  assert.equal(findBestMatch('☆r@mze$$$☆'), '★r@mze$$$★');
  assert.equal(findBestMatch('·Lisavetka·'), '•Lisavetka•');
  assert.equal(findBestMatch('✨Nosferatu✨'), 'Nosferatu');
  assert.equal(findBestMatch('Batou-Zar'), 'Batou~Zar');
  assert.equal(findBestMatch('★ DEAN ★'), '*DEAN*');
  assert.equal(findBestMatch('ОUNDEA'), 'UNDEAD');
  assert.equal(findBestMatch('Spoilagege'), 'Spoilage');
  assert.equal(findBestMatch('Mr. AHPD'), 'Mr. AHDP');
  assert.equal(findBestMatch('mohmedsaif'), 'mohmmedsaif');
  assert.equal(findBestMatch('BiG BOiE'), 'BiG BOiiE');
  assert.equal(findBestMatch('Oblitereted'), 'Obliterated');
  assert.equal(findBestMatch('MasterVjs'), 'MasterVj');
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

test('resolveDutyPlayerName routes cleaned duty names through the shared authority', () => {
  // Falls back to the same aliasMap / protected identities as structures.
  assert.equal(resolveDutyPlayerName('Kika-banner'), '꧁ Kika ꧂'); // rolls up to operating player
  assert.equal(resolveDutyPlayerName('@Maximus'), 'Maximus');
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
