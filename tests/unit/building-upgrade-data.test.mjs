import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

// The shipped dataset. `js/building-upgrade-data.js` is a pass-through of this file
// (it re-exports these fields verbatim), and it cannot be imported here because the
// bundler, not Node, supplies the JSON import attribute.
const raw = JSON.parse(readFileSync('database/building-upgrades-26-30.json', 'utf8'));

const PLAN_LEVELS = [26, 27, 28, 29, 30];
const RESOURCE_KEYS = ['orichalcum', 'gold', 'food', 'lumber', 'charcoal', 'marble', 'iron'];

const byId = (id) => raw.buildings.find((building) => building.id === id);
const knownCosts = (building) => building.levels.filter((level) => level.cost != null);
const knownSum = (building) => knownCosts(building).reduce((total, level) => total + level.cost, 0);

test('the sheet is transcribed as 43 buildings with five plan levels each', () => {
  assert.equal(raw.buildings.length, 43);
  assert.equal(raw.sourceRowCount, 43);

  const ids = new Set();
  const sourceNumbers = [];
  for (const building of raw.buildings) {
    assert.ok(building.id && building.name, 'every row is identified');
    assert.equal(ids.has(building.id), false, `duplicate id ${building.id}`);
    ids.add(building.id);
    sourceNumbers.push(building.sourceNo);
    assert.deepEqual(
      building.levels.map((level) => level.level),
      PLAN_LEVELS,
      `${building.name} covers levels 26–30 in order`
    );
    for (const level of building.levels) {
      assert.equal(
        level.cost === undefined,
        false,
        `${building.name} L${level.level} has a cost slot`
      );
      assert.ok(
        level.cost === null || typeof level.cost === 'number',
        `${building.name} L${level.level} is a number or a blank`
      );
      assert.ok(
        level.prerequisite === null || typeof level.prerequisite === 'string',
        `${building.name} L${level.level} prerequisite is text or an explicit blank`
      );
    }
  }
  assert.equal(new Set(sourceNumbers).size, sourceNumbers.length, 'source rows are unique');
  assert.deepEqual(
    sourceNumbers,
    [...sourceNumbers].sort((a, b) => a - b),
    'source rows stay in sheet order'
  );
});

test('a blank source cell stays null and is never counted as a zero cost', () => {
  const withBlanks = raw.buildings.filter((building) =>
    building.levels.some((level) => level.cost === null)
  );
  assert.ok(withBlanks.length > 1, 'the corpus really does contain blanks');

  // Royal Charcoal Factory is the extreme case: every level cell is blank, so the
  // sheet's TOTAL formula reports 0 for an empty row. A 0 would read as "free".
  const charcoal = byId('royal-charcoal-factory');
  assert.deepEqual(
    charcoal.levels.map((level) => level.cost),
    [null, null, null, null, null]
  );
  assert.equal(charcoal.totalOrichalcum, null, 'an all-blank row has no total, not a zero total');

  // Market level 26 is a listed 0 in the sheet, which is a value rather than a
  // blank, so it stays a number and the row total still adds up.
  assert.equal(byId('market').levels[0].cost, 0);
  assert.equal(byId('market').totalOrichalcum, 1400);

  for (const building of raw.buildings) {
    for (const level of building.levels) {
      assert.ok(
        level.cost == null || level.cost >= 0,
        `${building.name} L${level.level} is not negative`
      );
    }
  }
});

test('every building total equals the sum of its known level costs', () => {
  for (const building of raw.buildings) {
    if (knownCosts(building).length === 0) {
      assert.equal(
        building.totalOrichalcum,
        null,
        `${building.name} has no known costs and therefore no total`
      );
      continue;
    }
    assert.equal(
      building.totalOrichalcum,
      knownSum(building),
      `${building.name} total matches its known costs`
    );
  }
});

test('the listed totals sum to 297,432 and the sheet aggregate is the reported 281,102', () => {
  const listedSum = raw.buildings.reduce(
    (total, building) => total + (building.totalOrichalcum || 0),
    0
  );
  assert.equal(listedSum, 297432);
  assert.equal(raw.totalOrichalcum, 281102, 'the sheet aggregate is published as it stands');

  // The 16,330 gap is the sheet formula dropping the final Market and Institute
  // rows, not a transcription error.
  const market = byId('market').totalOrichalcum;
  const institute = byId('institute').totalOrichalcum;
  assert.equal(listedSum - raw.totalOrichalcum, market + institute);
  assert.equal(listedSum - raw.totalOrichalcum, 16330);
});

test('the Castle row and the direct Castle cost table agree', () => {
  const castle = byId('castle');
  assert.ok(castle, 'the Castle row is present');
  assert.equal(castle.sourceNo, 1);
  assert.deepEqual(
    raw.castleUpgradeCosts.map((step) => step.toLevel),
    PLAN_LEVELS
  );

  for (const step of raw.castleUpgradeCosts) {
    assert.deepEqual(
      Object.keys(step.resources),
      RESOURCE_KEYS,
      `Castle ${step.toLevel} resources`
    );
    for (const key of RESOURCE_KEYS) {
      assert.equal(typeof step.resources[key], 'number', `Castle ${step.toLevel} ${key}`);
    }
  }

  const directOrichalcum = raw.castleUpgradeCosts.reduce(
    (total, step) => total + step.resources.orichalcum,
    0
  );
  assert.equal(directOrichalcum, castle.totalOrichalcum);
  assert.equal(directOrichalcum, 22790);
});

test('corrected display names keep the sheet spelling in sourceName', () => {
  const expected = {
    'cavalery-war-room': ['Cavalry War Room', 'Cavalery War Room'],
    'cavalery-enhancement-camp': ['Cavalry Enhancement Camp', 'Cavalery Enhancement Camp'],
    'centry-tower': ['Sentry Tower', 'Centry Tower'],
    'raiders-hall': ['Raiders Hall', 'Raiders hall'],
    'aliance-hall': ['Alliance Hall', 'Aliance Hall'],
    distilery: ['Distillery', 'Distilery'],
    'workers-guild': ['Workers Guild', 'Workers uild'],
  };
  for (const [id, [name, sourceName]] of Object.entries(expected)) {
    const building = byId(id);
    assert.ok(building, `${id} is present`);
    assert.equal(building.name, name);
    assert.equal(building.sourceName, sourceName, `${id} keeps the sheet's own spelling`);
  }

  for (const building of raw.buildings.filter((entry) => entry.sourceName)) {
    assert.notEqual(
      building.sourceName,
      building.name,
      `${building.id} only carries sourceName when the display name differs`
    );
  }
});
