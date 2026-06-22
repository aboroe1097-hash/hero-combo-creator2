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
  formatDatasetStructureLabel,
  formatStructureLabel,
  normalizeStructureLevelForName,
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

test('duplicate canonical player rows on the same target aggregate into one summary row', () => {
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
  assert.equal(parsed.players_summary.filter((player) => /Kika/.test(player.name)).length, 1);
  assert.equal(byName['꧁ Kika ꧂'].total_demolition, 49350);
  assert.equal(byName['꧁ Kika ꧂'].participation_count, 1);
  assert.equal(byName['꧁ Kika ꧂'].attacks.length, 2);
  assert.deepEqual(
    byName['꧁ Kika ꧂'].attacks.map((attack) => attack.display_player_name),
    ['꧁ Kika ꧂', '꧁༺ Kika ༻꧂']
  );
});
