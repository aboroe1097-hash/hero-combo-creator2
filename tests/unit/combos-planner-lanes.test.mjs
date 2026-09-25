import test from 'node:test';
import assert from 'node:assert/strict';

import {
  byScore,
  hasPaid,
  isFiltered,
  laneMatches,
  matchOf,
  nearMask,
  overlapOf,
  rankingMatches,
  selectLanes,
  sortLanes,
  tierOf,
  tierRank,
  troopOf,
  TRAY_DEFAULTS,
} from '../../tools/combos-planner/lanes.js';

// A tiny hero table keeps the filter and sort expectations readable.
const H = {
  Ace: { s: 'S0', t: 'Cavalry', p: 1 },
  Blade: { s: 'S0', t: 'Cavalry', p: 0 },
  Cat: { s: 'S1', t: 'Archers', p: 0 },
  Dome: { s: 'S2', t: 'Footmen', p: 1 },
  Ember: { s: 'X8', t: 'Archers', p: 0 },
  Flora: { s: 'X8', t: 'All', p: 0 },
};
const lane = (id, heroes, extra = {}) => ({ id, heroes, skin: '', anchor: '', ...extra });
const filters = (over = {}) => ({ ...TRAY_DEFAULTS, ...over });

test('troopOf reports the shared troop, Mixed when they differ, and All for universal heroes', () => {
  assert.equal(troopOf(['Ace', 'Blade', 'Ace'], H), 'Cavalry');
  assert.equal(troopOf(['Ace', 'Cat', 'Dome'], H), 'Mixed');
  assert.equal(troopOf(['Flora', 'Flora', 'Flora'], H), 'All');
  assert.equal(troopOf(['Ace', 'Ace', 'Cat'], H), 'Mixed');
});

test('hasPaid is true when any hero of the lineup is paid', () => {
  assert.equal(hasPaid(['Blade', 'Cat', 'Flora'], H), false);
  assert.equal(hasPaid(['Blade', 'Dome', 'Flora'], H), true);
});

test('tierOf reads the ROC Academy tier and score out of a lane note', () => {
  assert.deepEqual(tierOf('X8 catch-up lane, S tier (source score 340.6).'), {
    tier: 'S',
    score: 340.6,
  });
  assert.deepEqual(tierOf('X8 catch-up lane, C tier (source score 147.4).'), {
    tier: 'C',
    score: 147.4,
  });
  assert.deepEqual(tierOf(''), { tier: '', score: null });
  assert.deepEqual(tierOf(undefined), { tier: '', score: null });
});

test('tierRank orders S first and puts lanes without a tier last', () => {
  assert.deepEqual(
    ['C', 'S', '', 'B', 'A'].sort((a, b) => tierRank(a) - tierRank(b)),
    ['S', 'A', 'B', 'C', '']
  );
});

test('laneMatches applies the hero, troop, cost and tier filters together', () => {
  const cavalryPaid = lane('l1', ['Ace', 'Blade', 'Blade'], { tier: 'S', score: 300 });
  const archersFree = lane('l2', ['Cat', 'Cat', 'Flora'], { tier: 'B', score: 200 });
  const untiered = lane('l3', ['Ember', 'Ember', 'Flora']);

  assert.equal(laneMatches(cavalryPaid, filters(), H), true);
  assert.equal(laneMatches(cavalryPaid, filters({ q: 'bla' }), H), true);
  assert.equal(laneMatches(cavalryPaid, filters({ q: 'dome' }), H), false);
  assert.equal(laneMatches(cavalryPaid, filters({ troop: 'Cavalry' }), H), true);
  assert.equal(laneMatches(cavalryPaid, filters({ troop: 'Archers' }), H), false);
  assert.equal(laneMatches(cavalryPaid, filters({ cost: 'free' }), H), false);
  assert.equal(laneMatches(archersFree, filters({ cost: 'free' }), H), true);
  assert.equal(laneMatches(archersFree, filters({ cost: 'paid' }), H), false);
  assert.equal(laneMatches(cavalryPaid, filters({ tier: 'S' }), H), true);
  assert.equal(laneMatches(archersFree, filters({ tier: 'S' }), H), false);
  assert.equal(laneMatches(untiered, filters({ tier: 'none' }), H), true);
  assert.equal(laneMatches(cavalryPaid, filters({ tier: 'none' }), H), false);
});

test('rankingMatches filters the fixed rows by hero, troop and cost', () => {
  assert.equal(rankingMatches(['Ace', 'Blade', 'Cat'], filters({ hero: 'ace' }), H), true);
  assert.equal(rankingMatches(['Ace', 'Blade', 'Cat'], filters({ hero: 'dome' }), H), false);
  assert.equal(rankingMatches(['Ace', 'Blade', 'Cat'], filters({ troop: 'Mixed' }), H), true);
  assert.equal(rankingMatches(['Ace', 'Blade', 'Cat'], filters({ cost: 'free' }), H), false);
  assert.equal(rankingMatches(['Blade', 'Cat', 'Cat'], filters({ cost: 'free' }), H), true);
});

test('selectLanes splits placed from unplaced and reports the mode total', () => {
  const lanes = [
    lane('a', ['Ember', 'Ember', 'Flora'], { score: 300, tier: 'S' }),
    lane('b', ['Cat', 'Cat', 'Flora'], { score: 200, tier: 'B', anchor: 'b0' }),
    lane('c', ['Dome', 'Dome', 'Flora'], { score: 100, tier: 'C' }),
  ];
  const above = (id) => (id === 'b' ? 7 : 0);
  assert.deepEqual(
    selectLanes(lanes, filters({ mode: 'unplaced' }), H, above).items.map((l) => l.id),
    ['a', 'c']
  );
  assert.deepEqual(
    selectLanes(lanes, filters({ mode: 'placed' }), H, above).items.map((l) => l.id),
    ['b']
  );
  const all = selectLanes(lanes, filters({ mode: 'all' }), H, above);
  assert.equal(all.total, 3);
  assert.equal(all.items.length, 3);
  assert.deepEqual(
    selectLanes(lanes, filters({ mode: 'unplaced', troop: 'Footmen' }), H, above).items.map(
      (l) => l.id
    ),
    ['c']
  );
});

test('the tray orders: best score, tier, name, ranking position and new first', () => {
  const lanes = [
    lane('low', ['Cat', 'Cat', 'Cat'], { score: 150, tier: 'C' }),
    lane('high', ['Ace', 'Ace', 'Ace'], { score: 340, tier: 'S' }),
    lane('mid', ['Dome', 'Dome', 'Dome'], { score: 250, tier: 'A' }),
    lane('fresh', ['Ember', 'Ember', 'Ember'], { added: true }),
  ];
  const ids = (sort, aboveOf) => sortLanes(lanes, sort, aboveOf).map((l) => l.id);
  assert.deepEqual(ids('score'), ['high', 'mid', 'low', 'fresh']);
  assert.deepEqual(ids('tier'), ['high', 'mid', 'low', 'fresh']);
  assert.deepEqual(ids('name'), ['high', 'low', 'mid', 'fresh']);
  assert.deepEqual(ids('new'), ['fresh', 'high', 'mid', 'low']);
  assert.equal(byScore(lanes[1], lanes[2]) < 0, true);
});

test('the ranking-order sort follows the placements and sends unplaced lanes last', () => {
  const lanes = [
    lane('unplaced', ['Ember', 'Ember', 'Ember'], { score: 400 }),
    lane('second', ['Ace', 'Ace', 'Ace'], { score: 100, anchor: 'b9' }),
    lane('first', ['Cat', 'Cat', 'Cat'], { score: 100, anchor: 'b2' }),
  ];
  const above = (id) => ({ first: 2, second: 9 })[id];
  assert.deepEqual(
    sortLanes(lanes, 'position', above).map((l) => l.id),
    ['first', 'second', 'unplaced']
  );
});

test('nearMask keeps the rows around each X8 lane', () => {
  const entries = [
    { type: 'base' },
    { type: 'base' },
    { type: 'x8' },
    { type: 'base' },
    { type: 'base' },
  ];
  assert.deepEqual(nearMask(entries, 1), [false, true, true, true, false]);
  assert.deepEqual(nearMask(entries.map((e) => ({ type: 'base' }))), [
    false,
    false,
    false,
    false,
    false,
  ]);
});

test('isFiltered is false only while every tray control sits at its neutral value', () => {
  assert.equal(isFiltered(filters()), false);
  assert.equal(isFiltered(filters({ q: 'bjorn' })), true);
  assert.equal(isFiltered(filters({ troop: 'Cavalry' })), true);
  assert.equal(isFiltered(filters({ cost: 'free' })), true);
  assert.equal(isFiltered(filters({ tier: 'A' })), true);
  assert.equal(isFiltered(filters({ sort: 'score' })), true);
});

test('matchOf counts the shared heroes and spots a lineup already using the same three', () => {
  const held = lane('held', ['Ace', 'Cat', 'Ember'], { skin: '123' });
  assert.deepEqual(matchOf(lane('a', ['Ace', 'Cat', 'Ember'], { skin: '321' }), held), {
    shared: 3,
    sameTrio: true,
  });
  assert.deepEqual(matchOf(lane('b', ['Ace', 'Cat', 'Dome']), held), {
    shared: 2,
    sameTrio: false,
  });
  assert.deepEqual(matchOf(lane('c', ['Ace', 'Blade', 'Dome']), held), {
    shared: 1,
    sameTrio: false,
  });
  assert.deepEqual(matchOf(lane('d', ['Blade', 'Dome', 'Flora']), held), {
    shared: 0,
    sameTrio: false,
  });
  assert.equal(overlapOf(['Ace', 'Cat', 'Ember'], ['Ember', 'Cat', 'Ace']), 3);
  assert.equal(overlapOf(['Ace', 'Cat', 'Ember'], ['Ember', 'Flora', 'Ace']), 2);
});
