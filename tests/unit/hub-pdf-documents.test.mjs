import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import en from '../../js/i18n/hub-pdf/en.js';
import { sumKnown } from '../../js/hub-pdf/document.js';
import {
  buildHeroesDocument,
  defaultHeroChoices,
  eligibleCombos,
  filterHeroes,
  groupCombos,
  heroSeasons,
} from '../../js/hub-pdf/heroes.js';
import {
  buildResearchDocument,
  filterResearchTrees,
  NOT_APPLICABLE,
  researchNodeMedals,
  researchTreeTotals,
  towerResearchRows,
} from '../../js/hub-pdf/research.js';
import { buildClassDocument, checkpointRows } from '../../js/hub-pdf/class.js';
import {
  buildEdenDocument,
  buildingRangeCost,
  discounted,
  specialtyRangeHonor,
} from '../../js/hub-pdf/eden.js';
import { allHeroesData } from '../../js/heroes-data.js';
import { heroesExtendedData } from '../../js/heroes-info.js';
import { rankedCombos } from '../../js/combos-db.js';
import {
  SPECIALIZATION_COLUMNS,
  SPECIALIZATION_RESEARCH,
  SPECIALIZATION_TROOP_MEDAL_EVIDENCE,
} from '../../js/specialization-towers-v2-data.js';
import { techDatabase } from '../../js/tech-db.js';
import { CLASS_DEVELOPMENT_PROFILES } from '../../js/class-development-data.js';
import { BUILDING_UPGRADE_COSTS, EDEN_STRUCTURES } from '../../js/eden-operations-data.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const sectionByTitle = (doc, title) => doc.sections.find((section) => section.title === title);
const tableRows = (block) => block.rows.filter((row) => Array.isArray(row));
const firstTable = (blocks) => blocks.find((block) => block.type === 'table');

// ---------------------------------------------------------------- sheet model

test('every combo on a hero sheet carries portraits and per-hero skin marks', () => {
  const doc = buildHeroesDocument({ ...defaultHeroChoices(), seasons: ['S1'] }, en);
  const combos = doc.sections
    .flatMap((section) => section.subsections || [])
    .flatMap((sub) => sub.blocks || [])
    .filter((block) => block.presentation === 'hero-combos');
  assert.ok(combos.length, 'the sheet has combo tables');
  for (const block of combos) {
    assert.equal(block.portraits.length, block.rows.length, 'a portrait set per combo');
    assert.equal(block.skinFlags.length, block.rows.length, 'skin marks per combo');
    for (const flags of block.skinFlags) assert.equal(flags.length, 3, 'one mark per hero');
    for (const portraits of block.portraits) assert.equal(portraits.length, 3);
  }
});

test('skin marks follow the skin-lane choice, hero by hero', () => {
  const flagsOf = (doc) =>
    doc.sections
      .flatMap((section) => section.subsections || [])
      .flatMap((sub) => sub.blocks || [])
      .filter((block) => block.presentation === 'hero-combos')
      .flatMap((block) => block.skinFlags)
      .flat();
  const plain = flagsOf(buildHeroesDocument({ ...defaultHeroChoices(), seasons: ['S1'] }, en));
  assert.ok(
    plain.every((flag) => flag === false),
    'plain lanes need no skin'
  );
  const skinned = flagsOf(
    buildHeroesDocument(
      { ...defaultHeroChoices(), seasons: heroSeasons(), skinLanes: true, comboCount: 'all' },
      en
    )
  );
  assert.ok(skinned.some(Boolean), 'the skin-lane choice marks the heroes that need one');
  assert.ok(skinned.every((flag) => typeof flag === 'boolean'));
});

test('the hero list and the skins table carry a portrait for every row', () => {
  const doc = buildHeroesDocument({ ...defaultHeroChoices(), seasons: ['S1'] }, en);
  const blocks = doc.sections.flatMap((section) => section.blocks || []);
  const list = blocks.find((block) => block.presentation === 'hero-list');
  assert.equal(list.portraits.length, list.rows.length);
  const skins = blocks.find((block) => block.presentation === 'hero-skins');
  assert.ok(skins.rows.length > 0, 'the skin catalogue has rows to draw');
  assert.equal(skins.portraits.length, skins.rows.length);
});

test('a sheet is drawn from tables: the prose stays in the model, not the page', async () => {
  const { documentHasContent, portraitUrls } = await import('../../js/hub-pdf/canvas-doc.js');
  const doc = buildHeroesDocument(defaultHeroChoices(), en, { detail: 'full' });
  const blocks = doc.sections.flatMap((section) => [
    ...(section.blocks || []),
    ...(section.subsections || []).flatMap((sub) => sub.blocks || []),
  ]);
  assert.ok(
    blocks.some((block) => block.type === 'paragraph' || block.type === 'note'),
    'the model still carries prose'
  );
  const drawn = blocks.filter((block) => block.type === 'table' && (block.rows || []).length);
  assert.ok(drawn.length >= 3, 'and several tables to draw');
  assert.equal(documentHasContent(doc), true);
  assert.ok(portraitUrls(doc).length > 0, 'a hero sheet needs portraits');
});

test('a scope with nothing selected has nothing to draw', async () => {
  const { documentHasContent } = await import('../../js/hub-pdf/canvas-doc.js');
  const doc = buildHeroesDocument({ ...defaultHeroChoices(), seasons: [] }, en);
  assert.equal(documentHasContent(doc), false);
});
test('hero filters follow season, troop and access choices', () => {
  const all = filterHeroes(defaultHeroChoices());
  assert.equal(all.length, allHeroesData.length);

  const archers = filterHeroes({ ...defaultHeroChoices(), troop: 'archer' });
  assert.ok(archers.length > 0 && archers.length < all.length);
  assert.ok(archers.every((hero) => hero.Type === 'Archers' || hero.Type === 'All'));

  const cavalry = filterHeroes({ ...defaultHeroChoices(), troop: 'cavalry' });
  assert.notDeepEqual(
    cavalry.map((hero) => hero.name),
    archers.map((hero) => hero.name),
    'changing the troop changes the rows'
  );

  const s0Paid = filterHeroes({ ...defaultHeroChoices(), seasons: ['S0'], access: 'paid' });
  assert.ok(s0Paid.every((hero) => hero.season === 'S0' && hero.State === 'Paid'));
  assert.ok(heroSeasons().indexOf('S4') < heroSeasons().indexOf('X1'));
  assert.ok(heroSeasons().indexOf('X2') < heroSeasons().indexOf('X10'));
});

test('the hero roster summary totals the rows it lists', () => {
  const choices = { ...defaultHeroChoices(), seasons: ['S0', 'S1', 'X8'] };
  const doc = buildHeroesDocument(choices, en);
  const summary = firstTable(sectionByTitle(doc, en.secRoster).blocks);
  const rows = tableRows(summary);
  assert.deepEqual(
    rows.map((row) => row[0]),
    ['S0', 'S1', 'X8']
  );
  for (let column = 1; column < summary.columns.length; column += 1) {
    assert.equal(
      summary.footer[column],
      rows.reduce((sum, row) => sum + row[column], 0),
      `${summary.columns[column].label} total`
    );
  }
  assert.equal(summary.footer[1], filterHeroes(choices).length);
  assert.equal(summary.footer[2] + summary.footer[3], summary.footer[1]);
});

test('heroes the Atlas has no record for show unknown placement, not a made-up value', () => {
  const missing = allHeroesData.find((hero) => !heroesExtendedData[hero.name]);
  assert.ok(missing, 'fixture: at least one roster hero has no Atlas record');
  const doc = buildHeroesDocument({ ...defaultHeroChoices(), include: ['list'] }, en);
  const list = firstTable(sectionByTitle(doc, en.secHeroList).blocks);
  const row = tableRows(list).find((candidate) => candidate[0] === missing.name);
  assert.equal(row[4], null);
  assert.equal(row[5], null);
  const known = tableRows(list).find((candidate) => heroesExtendedData[candidate[0]]);
  assert.match(String(known[5]), /^\d+–\d+$/);
});

test('top combos come from the generator ranking and react to the choices', () => {
  const base = defaultHeroChoices();
  const combos = eligibleCombos(base);
  assert.ok(combos.length > 0);
  assert.equal(combos[0].score, 100);
  assert.ok(combos.every((combo, index) => combo.rank === index + 1));
  const allowed = new Set(filterHeroes(base).map((hero) => hero.name));
  assert.ok(combos.every((combo) => combo.heroes.every((name) => allowed.has(name))));

  const withSkinLanes = eligibleCombos({ ...base, skinLanes: true });
  assert.ok(withSkinLanes.length > combos.length, 'skin-required lanes are opt-in');

  const freeOnly = eligibleCombos({ ...base, access: 'free' });
  const paid = new Set(allHeroesData.filter((hero) => hero.State === 'Paid').map((h) => h.name));
  assert.ok(freeOnly.every((combo) => combo.heroes.every((name) => !paid.has(name))));
  assert.ok(freeOnly.length < combos.length);

  const limited = groupCombos({ ...base, comboCount: '5' });
  assert.ok(limited.every((group) => group.combos.length <= 5));
  const archer = groupCombos({ ...base, troop: 'archer', comboCount: 'all' });
  assert.deepEqual(
    archer.map((group) => group.group),
    ['archer', 'universal']
  );
  const total = groupCombos({ ...base, comboCount: 'all' }).reduce(
    (sum, group) => sum + group.combos.length,
    0
  );
  assert.equal(total, combos.length, 'every eligible combo lands in exactly one troop group');
  assert.ok(rankedCombos.length >= combos.length);
});

test('hero sections follow the include choices and the detail level', () => {
  const summary = buildHeroesDocument({ ...defaultHeroChoices(), include: ['combos'] }, en);
  assert.deepEqual(
    summary.sections.map((section) => section.title),
    [en.secRoster, en.secCombos]
  );
  const full = buildHeroesDocument(defaultHeroChoices(), en, { detail: 'full' });
  assert.ok(sectionByTitle(full, en.secSkills), 'full detail adds hero skills');
  assert.ok(sectionByTitle(full, en.secHeroList).subsections.length > 1, 'grouped by season');
});

// ---------------------------------------------------------------- research

test('research node medals follow the tracker cost types; gaps are unknown', () => {
  assert.deepEqual(researchNodeMedals({ costType: 'None', maxLevel: 5, costs: [] }), {
    courage: NOT_APPLICABLE,
    wisdom: NOT_APPLICABLE,
    warBadges: NOT_APPLICABLE,
  });
  assert.equal(researchNodeMedals({ costType: 'Courage', maxLevel: 2, costs: [5, 7] }).courage, 12);
  assert.equal(
    researchNodeMedals({ costType: 'Courage', maxLevel: 3, costs: [5, 7] }).courage,
    null,
    'a short ladder is unknown, not a partial sum'
  );
  const dual = researchNodeMedals({
    costType: 'Dual',
    maxLevel: 2,
    wisdomCosts: [1, 2],
    courageCosts: [3, 4],
  });
  assert.equal(dual.wisdom, 3);
  assert.equal(dual.courage, 7);
  assert.equal(
    researchNodeMedals({ costType: 'War Badge', maxLevel: 1, wisdomCosts: [9] }).warBadges,
    9
  );
  const totals = researchTreeTotals({
    nodes: [
      { costType: 'Courage', maxLevel: 1, costs: [5] },
      { costType: 'Courage', maxLevel: 2, costs: [1] },
    ],
  });
  assert.equal(totals.courage, null);
  assert.equal(totals.warBadges, NOT_APPLICABLE);
});

test('research season and tree choices change the rows; totals add up', () => {
  const all = filterResearchTrees({ season: 'all', family: 'all' });
  assert.equal(all.length, techDatabase.length);
  const s0 = filterResearchTrees({ season: 'S0', family: 'all' });
  assert.ok(s0.length > 0 && s0.every((tree) => tree.season.trim() === 'S0'));
  const x12 = filterResearchTrees({ season: 'X12', family: 'all' });
  assert.notDeepEqual(s0, x12);

  const doc = buildResearchDocument({ include: ['research'], season: 'S0' }, en);
  const summary = firstTable(sectionByTitle(doc, en.secResearch).blocks);
  const rows = tableRows(summary);
  assert.equal(rows.length, s0.length);
  const courage = rows.map((row) => row[3]).filter((value) => value !== NOT_APPLICABLE);
  assert.equal(summary.footer[3], sumKnown(courage));
  assert.equal(
    summary.footer[2],
    rows.reduce((sum, row) => sum + row[2], 0)
  );

  const one = buildResearchDocument(
    { include: ['research'], season: 'all', family: s0[2].id },
    en,
    { detail: 'full' }
  );
  const section = sectionByTitle(one, en.secResearch);
  assert.equal(tableRows(firstTable(section.blocks)).length, 1);
  assert.equal(section.subsections.length, 1);
});

test('tower choices filter troops and columns; workbook and planner totals match the data', () => {
  const doc = buildResearchDocument(
    { include: ['towers'], troop: 'footman', columns: ['1', '2'], medals: true, planner: true },
    en
  );
  const towers = sectionByTitle(doc, en.secTowers);
  assert.deepEqual(
    towers.subsections.map((sub) => sub.title),
    [en.troopFootman]
  );
  const summary = firstTable(towers.subsections[0].blocks);
  const rows = tableRows(summary);
  assert.equal(rows.length, 8, 'two columns of four researches');
  const expectedWorkbook = SPECIALIZATION_TROOP_MEDAL_EVIDENCE.filter(
    (entry) => entry.troop === 'footman' && entry.tower <= 2
  ).reduce((sum, entry) => sum + entry.knownCostTotal, 0);
  assert.equal(summary.footer[2], expectedWorkbook);
  const expectedPlanner = ['1', '2']
    .flatMap((column) => SPECIALIZATION_COLUMNS[column].researches)
    .reduce((sum, id) => sum + SPECIALIZATION_RESEARCH[id].cost, 0);
  assert.equal(summary.footer[3], expectedPlanner);

  const archerCol3 = buildResearchDocument(
    { include: ['towers'], troop: 'archer', columns: ['3'], medals: false, planner: true },
    en
  );
  const archerTable = firstTable(sectionByTitle(archerCol3, en.secTowers).subsections[0].blocks);
  assert.equal(archerTable.columns.length, 3, 'medal column dropped when not chosen');
  assert.equal(
    tableRows(archerTable)[0][0],
    SPECIALIZATION_RESEARCH[SPECIALIZATION_COLUMNS[3].researches[0]].name
  );

  const workbookOnly = towerResearchRows('cavalry', 9);
  assert.ok(workbookOnly.length > 0);
  assert.ok(
    workbookOnly.every((row) => row.planner === null),
    'no planner figure is invented'
  );
});

// ---------------------------------------------------------------- class

test('class roadmap choices pick the class, stages and level range', () => {
  const raider = CLASS_DEVELOPMENT_PROFILES.find((profile) => profile.id === 'raider');
  const rows = checkpointRows(raider, 40, 90);
  assert.deepEqual(
    rows.map((row) => row[1]),
    raider.checkpoints.filter((level) => level >= 40 && level <= 90)
  );
  const doc = buildClassDocument(
    { classId: 'raider', stages: ['checkpoints'], fromLevel: 40, toLevel: 90 },
    en
  );
  assert.equal(doc.sections.length, 1);
  assert.equal(doc.sections[0].title, 'Raider');
  const table = firstTable(doc.sections[0].subsections[0].blocks);
  assert.equal(tableRows(table).length, rows.length);

  const swapped = buildClassDocument(
    { classId: 'raider', stages: ['checkpoints'], fromLevel: 90, toLevel: 40 },
    en
  );
  assert.deepEqual(swapped.sections[0].subsections, doc.sections[0].subsections);

  const all = buildClassDocument({ classId: 'all' }, en);
  assert.equal(all.sections.length, CLASS_DEVELOPMENT_PROFILES.length + 1, 'plus the comparison');
  const targets = sectionByTitle(all, 'Raider').subsections.find(
    (sub) => sub.title === en.classTargets
  );
  const cards = firstTable(targets.blocks);
  assert.equal(
    cards.footer[1],
    Object.values(raider.cardMix).reduce((sum, value) => sum + value, 0)
  );
});

// ---------------------------------------------------------------- eden

test('Eden building totals, discounts and level ranges follow the data', () => {
  const workshop = BUILDING_UPGRADE_COSTS.workshop;
  assert.equal(
    buildingRangeCost('workshop', 1, workshop.length),
    workshop.reduce((sum, value) => sum + value, 0)
  );
  assert.equal(buildingRangeCost('workshop', 5, 7), workshop[5] + workshop[6]);
  assert.equal(discounted(1000, 0.27), 730);
  assert.equal(discounted(null, 0.27), null);

  const doc = buildEdenDocument(
    {
      include: ['buildings'],
      buildings: ['workshop', 'fortress'],
      discount: 'green',
      fromLevel: 10,
      toLevel: 12,
    },
    en
  );
  const section = sectionByTitle(doc, en.eden_buildings);
  const totals = firstTable(section.blocks);
  assert.deepEqual(
    tableRows(totals).map((row) => row[0]),
    ['Workshop', 'Fortress']
  );
  assert.equal(totals.rows[0][1], workshop[10] + workshop[11]);
  assert.equal(totals.rows[0][2], Math.ceil((workshop[10] + workshop[11]) * 0.73));
  assert.equal(totals.footer[1], totals.rows[0][1] + totals.rows[1][1]);
  const perLevel = firstTable(section.subsections[0].blocks);
  assert.deepEqual(
    perLevel.rows.map((row) => row[0]),
    [11, 12]
  );
});

test('Eden specialty Honor stays unknown across unpublished levels', () => {
  assert.equal(specialtyRangeHonor(1, 143), null);
  assert.equal(typeof specialtyRangeHonor(1, 100), 'number');
  assert.ok(specialtyRangeHonor(1, 100) > 0);
  const doc = buildEdenDocument(
    { include: ['specialty'], specialtyFrom: 100, specialtyTo: 112 },
    en,
    {
      detail: 'full',
    }
  );
  const rows = tableRows(firstTable(sectionByTitle(doc, en.eden_specialty).blocks));
  const level105 = rows.find((row) => row[0] === 105);
  assert.equal(level105[1], null, 'unpublished level is unknown, not 0');
});

test('Eden siege groups and map sectors filter the rows', () => {
  const doc = buildEdenDocument({ include: ['siege'], groups: ['Gate'] }, en);
  const rows = tableRows(firstTable(sectionByTitle(doc, en.eden_siege).blocks));
  assert.equal(rows.length, EDEN_STRUCTURES.filter((s) => s.group === 'Gate').length);

  const mapStore = {
    builtAt: 'fixture',
    catalog: [{ id: 'fixture', source: 'fixture.txt' }],
    sectors: {
      fixture: {
        N: { label: 'North', structures: [{ id: 'a', type: 'CP1', x: 1, y: 2, points: 5 }] },
        S: {
          label: 'South',
          structures: [
            { id: 'b', type: 'CP1', x: 3, y: 4, points: 5 },
            { id: 'c', type: 'AT', x: 5, y: 6 },
          ],
        },
      },
    },
  };
  const all = buildEdenDocument(
    { include: ['map'], dataset: 'fixture', sector: 'all' },
    en,
    {},
    { mapStore }
  );
  const sectors = firstTable(sectionByTitle(all, en.eden_map).blocks);
  assert.deepEqual(
    sectors.rows.map((row) => row[0]),
    ['N', 'S']
  );
  assert.equal(
    sectors.rows[1][3],
    null,
    'a structure without points makes the sector total unknown'
  );
  const south = buildEdenDocument(
    { include: ['map'], dataset: 'fixture', sector: 'S' },
    en,
    { detail: 'full' },
    { mapStore }
  );
  const southSection = sectionByTitle(south, en.eden_map);
  assert.deepEqual(
    firstTable(southSection.blocks).rows.map((row) => row[0]),
    ['S']
  );
  assert.equal(tableRows(firstTable(southSection.subsections[0].blocks)).length, 2);
  const noStore = buildEdenDocument({ include: ['map'] }, en);
  assert.equal(sectionByTitle(noStore, en.eden_map).blocks[0].text, en.edenMapUnavailable);
});

// ---------------------------------------------------------------- copy + wiring

test('every hub PDF locale pack carries the English keys and tokens', async () => {
  const tokens = (value) =>
    [...String(value).matchAll(/\{(\w+)\}/g)]
      .map((match) => match[1])
      .sort()
      .join('|');
  for (const lang of ['ar', 'de', 'es', 'fr', 'id', 'it', 'kr', 'pt', 'ru', 'tr', 'zh']) {
    const pack = (await import(`../../js/i18n/hub-pdf/${lang}.js`)).default;
    assert.deepEqual(Object.keys(pack).sort(), Object.keys(en).sort(), `${lang} keys`);
    for (const [key, value] of Object.entries(en)) {
      assert.equal(typeof pack[key], 'string', `${lang}.${key}`);
      assert.ok(pack[key].trim(), `${lang}.${key} is empty`);
      assert.equal(tokens(pack[key]), tokens(value), `${lang}.${key} tokens`);
    }
  }
});

test('each hub exposes a PDFs sub-tab that loads lazily', () => {
  const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
  const heroesHub = read('js/heroes-combos-hub.js');
  const researchHub = read('js/research-towers-hub.js');
  const edenHub = read('js/eden-hub.js');
  const classHub = read('js/class-development.js');
  const edenTemplate = read('tabs/eden-map.html');
  const tabHelper = read('js/hub-pdf-tab.js');

  assert.match(heroesHub, /mountHubPdfPanel\('heroes'/);
  assert.match(researchHub, /mountHubPdfPanel\(\s*'research'/);
  assert.match(researchHub, /'buildings',\s*'pdfs',\s*\]\)/);
  assert.match(researchHub, /import\('\.\/building-upgrades\.js'\)/);
  assert.match(classHub, /mountHubPdfPanel\('class'/);
  assert.match(edenHub, /if \(name === 'pdfs'\) mountHubPdfPanel\('eden', panel\)/);
  assert.match(edenTemplate, /data-eden-subtab="pdfs"/);
  assert.match(edenTemplate, /data-eden-subtab-panel="pdfs"/);
  assert.match(tabHelper, /import\('\.\/hub-pdf\/panel\.js'\)/);
  assert.doesNotMatch(tabHelper, /^import .*hub-pdf\/panel/m, 'the panel is never a static import');
  assert.match(read('js/shell-v14.js'), /\['buildingsLink', '#researchTowers\?subtab=buildings'\]/);
  assert.doesNotMatch(read('index.html'), /hub-pdf/, 'index.html gains no markup');
});
