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
    structure_name: 'Bridges',
    structure_level: '',
  });
  assert.deepEqual(normalizeStructureTarget('Gates', 'Lv1'), {
    structure_name: 'Bridges',
    structure_level: '',
  });
  assert.equal(formatStructureLabel('Gates', 'Lv1'), 'Bridges');
  assert.equal(formatStructureLabel('Check Point', 'Lv1'), 'Bridges');
  assert.equal(validateTotalDemolition('Bridges', '', 200000)?.match, true);
  assert.equal(validateTotalDemolition('Check Point', 'Lv1', 200000)?.match, true);
  assert.equal(validateTotalDemolition('Town 4', '', 3750000)?.match, true);
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
    ['≪Kika≫', 'Kika'],
    ['✨ Kika ✨', 'Kika'],
    ['꧁ Kika ꧂', 'Kika'],
    ['꧁༺ Kika ༻꧂', 'Kika'],
    ['꧁ Kika-banner ꧂', 'Kika-banner'],
    ['꧁Kika-banner2꧂', 'Kika-banner2'],
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
    ['~☆RuCCaK☆~', '~RuCCaK~'],
    ['A n d ě R $', 'A n d e R $'],
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
  assert.equal(findBestMatch('Kika-banner'), 'Kika-banner');
  assert.equal(findBestMatch('Kika-banner2'), 'Kika-banner2');
  assert.equal(findBestMatch('REDBULL-#'), 'REDBULL-#');
  assert.equal(findBestMatch('REDBULLS'), 'REDBULLS');
  assert.equal(findBestMatch('Sarafina'), '~Sarafina~');
  assert.equal(findBestMatch('~Sarafina~'), '~Sarafina~');
  assert.equal(findBestMatch('Sarafino'), '~Sarafino~');
});
