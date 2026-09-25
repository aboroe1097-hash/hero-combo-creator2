import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { buildComboSource, buildView } from '../../js/combo-plan.js';
import {
  analoguesOf,
  autoDraft,
  createHistory,
  createSuggester,
  gapAboveRank,
  gapLabel,
  groupByX8,
  mergeRows,
  moveGap,
  parsePastedLineups,
  placeBlock,
  planFromState,
  slotsFrom,
  summarizePlan,
  viewSignature,
} from '../../js/combo-workflow.js';
import { createHeroMatcher, editDistance } from '../../js/hero-name-match.js';
import { tierOf } from '../../js/combo-lanes.js';
import { rankedCombos } from '../../js/combos-db.js';
import { allHeroesData } from '../../js/heroes-data.js';

// A small hero table keeps each signal's expectation readable: Lance and Ragnar
// are paid, Bjorn / Ragnar / Warden are the X8 heroes.
const H = {
  Law: { s: 'X2', t: 'Cavalry', p: 0 },
  Ava: { s: 'X2', t: 'Cavalry', p: 0 },
  Brave: { s: 'X2', t: 'Cavalry', p: 0 },
  Lance: { s: 'X2', t: 'Cavalry', p: 1 },
  Kai: { s: 'S1', t: 'Footmen', p: 0 },
  Mo: { s: 'S1', t: 'Footmen', p: 0 },
  Theo: { s: 'S2', t: 'Archers', p: 0 },
  Cyr: { s: 'S2', t: 'Archers', p: 0 },
  Bjorn: { s: 'X8', t: 'Cavalry', p: 0 },
  Ragnar: { s: 'X8', t: 'Cavalry', p: 1 },
  Warden: { s: 'X8', t: 'Archers', p: 0 },
};
const bases = (...lineups) => lineups.map((heroes, i) => ({ id: 'b' + i, heroes, skin: '' }));
const lane = (id, heroes, extra = {}) => ({ id, heroes, skin: '', anchor: '', slot: 0, ...extra });
const filler = (n) => Array.from({ length: n }, () => ['Theo', 'Cyr', 'Kai']);

test('rows merge placed lineups above their anchor and read back as slots', () => {
  const b = bases(['Theo', 'Cyr', 'Kai'], ['Law', 'Brave', 'Ava'], ['Kai', 'Mo', 'Theo']);
  const rows = mergeRows(b, [
    lane('x1', ['Law', 'Bjorn', 'Ava'], { anchor: 'b1', slot: 2 }),
    lane('x0', ['Kai', 'Bjorn', 'Mo'], { anchor: 'b1', slot: 1 }),
    lane('x2', ['Kai', 'Warden', 'Mo']),
  ]);
  assert.deepEqual(
    rows.map((r) => r.id),
    ['b0', 'x0', 'x1', 'b1', 'b2']
  );
  assert.equal(rows[1].above, 2);
  assert.deepEqual(Object.fromEntries(slotsFrom(rows)), {
    x0: { anchor: 'b1', slot: 1 },
    x1: { anchor: 'b1', slot: 2 },
  });
  assert.equal(gapAboveRank(rows, 2), 3);
  assert.equal(gapLabel(rows, 1), 'above #2');
  assert.equal(gapLabel(rows, 1, 'below'), 'below #1');
  assert.equal(gapLabel(rows, rows.length), 'at the end');
});

test('placeBlock drops a batch contiguously at a gap, and moveGap stays inside the ranking', () => {
  const b = bases(['Theo', 'Cyr', 'Kai'], ['Law', 'Brave', 'Ava'], ['Kai', 'Mo', 'Theo']);
  const x = lane('x0', ['Kai', 'Bjorn', 'Mo'], { anchor: 'b2', slot: 1 });
  const rows = mergeRows(b, [x]);
  const block = [lane('x1', ['Law', 'Bjorn', 'Ava']), lane('x2', ['Kai', 'Warden', 'Mo'])];
  const out = placeBlock(rows, block, 1);
  assert.deepEqual(out.get('x1'), { anchor: 'b1', slot: 1 });
  assert.deepEqual(out.get('x2'), { anchor: 'b1', slot: 2 });
  assert.deepEqual(out.get('x0'), { anchor: 'b2', slot: 1 });
  // One row up from above #3 is above #2; far down is clamped above the last lineup.
  assert.equal(moveGap(rows, 'x0', -1), 1);
  assert.deepEqual(placeBlock(rows, [x], moveGap(rows, 'x0', -1)).get('x0'), {
    anchor: 'b1',
    slot: 1,
  });
  assert.equal(moveGap(rows, 'x0', 10), rows.length - 1);
  assert.deepEqual(placeBlock(rows, [x], moveGap(rows, 'x0', 10)).get('x0'), {
    anchor: 'b2',
    slot: 1,
  });
  assert.equal(moveGap(rows, 'nope', 1), -1);
  // A move keeps counting gaps in the rows as they are, with the lineup still there.
  const two = mergeRows(b, [
    lane('p', ['Law', 'Bjorn', 'Ava'], { anchor: 'b1', slot: 1 }),
    lane('q', ['Kai', 'Warden', 'Mo'], { anchor: 'b2', slot: 1 }),
  ]);
  assert.deepEqual(
    two.map((r) => r.id),
    ['b0', 'p', 'b1', 'q', 'b2']
  );
  const down = placeBlock(two, [two[1]], moveGap(two, 'p', 1));
  assert.deepEqual(down.get('p'), { anchor: 'b2', slot: 1 });
  assert.deepEqual(down.get('q'), { anchor: 'b2', slot: 2 });
  const up = placeBlock(two, [two[3]], moveGap(two, 'q', -1));
  // One row up passes #2 only, so it lands between p and #2.
  assert.deepEqual(up.get('p'), { anchor: 'b1', slot: 1 });
  assert.deepEqual(up.get('q'), { anchor: 'b1', slot: 2 });
});

test('(a) the analogue sharing two heroes in the same slots wins, and the suggestion sits above it', () => {
  // #1 shares Law + Ava in other positions; #3 has them where the new lineup has them.
  const b = bases(['Ava', 'Law', 'Kai'], ...filler(1), ['Law', 'Brave', 'Ava'], ...filler(3));
  const rows = mergeRows(b, []);
  const found = analoguesOf(
    ['Law', 'Bjorn', 'Ava'],
    rows.filter((r) => r.type === 'base')
  );
  assert.equal(found.length, 2);
  const s = createSuggester({ heroes: H, rows }).suggest(lane('n', ['Law', 'Bjorn', 'Ava']));
  assert.deepEqual(s.signals, ['analogue']);
  assert.equal(s.analogue.rank, 3);
  assert.equal(s.analogue.replaced, 'Brave');
  assert.equal(s.gap, gapAboveRank(rows, 3));
  assert.equal(s.before, 'b2');
  assert.equal(s.label, 'above #3');
  assert.match(s.reason, /^above #3 · shares Law \+ Ava with #3 · Bjorn in Brave's slot$/);
});

test('(b) a placement you made teaches the same swap its offset from the analogue', () => {
  // You put Kai / Bjorn / Mo two rows below its analogue Kai / Brave / Mo (#5):
  // it sits above #7. Law / Bjorn / Ava, whose analogue is #2, goes to below #3.
  const b = bases(
    ...filler(1),
    ['Law', 'Brave', 'Ava'],
    ...filler(2),
    ['Kai', 'Brave', 'Mo'],
    ...filler(5)
  );
  const placed = lane('p', ['Kai', 'Bjorn', 'Mo'], { anchor: 'b6', slot: 1 });
  const rows = mergeRows(b, [placed]);
  const suggester = createSuggester({ heroes: H, rows });
  assert.deepEqual(suggester.learned.get('Bjorn>Brave'), [2]);
  const s = suggester.suggest(lane('n', ['Law', 'Bjorn', 'Ava']));
  assert.deepEqual(s.signals, ['analogue', 'learned']);
  assert.equal(s.label, 'below #3');
  assert.equal(s.gap, gapAboveRank(rows, 3) + 1);
  assert.match(
    s.reason,
    /like 1 lineup you placed with Bjorn for Brave, 2 rows below its analogue/
  );
  // A different swap (Warden for Brave) has learned nothing and stays above its analogue.
  const other = suggester.suggest(lane('w', ['Law', 'Warden', 'Ava']));
  assert.deepEqual(other.signals, ['analogue']);
  assert.equal(other.label, 'above #2');
  // Placed above the analogue itself, the lesson is "directly above".
  const again = createSuggester({
    heroes: H,
    rows: mergeRows(b, [lane('p', ['Kai', 'Bjorn', 'Mo'], { anchor: 'b3', slot: 1 })]),
  });
  assert.deepEqual(again.learned.get('Bjorn>Brave'), [-1]);
  assert.equal(again.suggest(lane('n', ['Law', 'Bjorn', 'Ava'])).label, 'above #1');
});

test('(c) a free lineup goes below the run of paid lineups that follows its gap', () => {
  // The analogue #2 has the paid Lance; #3 is paid too, #4 is free.
  const b = bases(...filler(1), ['Law', 'Lance', 'Ava'], ['Lance', 'Kai', 'Mo'], ...filler(2));
  const rows = mergeRows(b, []);
  const suggester = createSuggester({ heroes: H, rows });
  const free = suggester.suggest(lane('n', ['Law', 'Bjorn', 'Ava']));
  assert.deepEqual(free.signals, ['analogue', 'paid']);
  assert.equal(free.gap, gapAboveRank(rows, 4));
  assert.equal(free.label, 'below #3');
  assert.match(free.reason, /below 2 paid lineups \(#2–#3\), since this one is free/);
  // A lineup with a paid hero of its own keeps the analogue's slot.
  const paid = suggester.suggest(lane('r', ['Law', 'Ragnar', 'Ava']));
  assert.deepEqual(paid.signals, ['analogue']);
  assert.equal(paid.label, 'above #2');
});

test('(d) with no analogue the tier maps to your placements of that tier, else the end', () => {
  const b = bases(...filler(10));
  const placed = [
    lane('p1', ['Warden', 'Bjorn', 'Kai'], { anchor: 'b3', slot: 1, tier: 'B' }),
    lane('p2', ['Warden', 'Bjorn', 'Mo'], { anchor: 'b5', slot: 1, tier: 'B' }),
    lane('p3', ['Warden', 'Bjorn', 'Theo'], { anchor: 'b7', slot: 1, tier: 'B' }),
  ];
  const rows = mergeRows(b, placed);
  const suggester = createSuggester({ heroes: H, rows });
  const tiered = suggester.suggest(lane('n', ['Law', 'Warden', 'Bjorn'], { tier: 'B' }));
  assert.deepEqual(tiered.signals, ['tier']);
  assert.equal(tiered.label, 'above #6');
  assert.match(tiered.reason, /B tier: your B-tier placements sit around #6 \(3 lineups\)/);
  const unknown = suggester.suggest(lane('m', ['Law', 'Warden', 'Bjorn'], { tier: 'S' }));
  assert.deepEqual(unknown.signals, ['end']);
  assert.equal(unknown.end, true);
  assert.equal(unknown.gap, rows.length);
  assert.match(unknown.reason, /no S-tier lineup is placed yet/);
});

test('auto-draft places every lineup at its suggestion in one pass, leaving the end ones', () => {
  const b = bases(...filler(1), ['Law', 'Brave', 'Ava'], ['Kai', 'Brave', 'Mo'], ...filler(2));
  const rows = mergeRows(b, []);
  const lanes = [
    lane('a', ['Law', 'Bjorn', 'Ava'], { score: 200 }),
    lane('c', ['Law', 'Warden', 'Ava'], { score: 300 }),
    lane('k', ['Kai', 'Bjorn', 'Mo'], { score: 100 }),
    lane('z', ['Warden', 'Bjorn', 'Theo'], { tier: 'C' }),
  ];
  const draft = autoDraft({ heroes: H, rows, lanes });
  assert.equal(draft.placed, 3);
  assert.deepEqual(draft.left, ['z']);
  // Two lineups share the gap above #2: the better source score goes first.
  assert.deepEqual(draft.placements.get('c'), { anchor: 'b1', slot: 1 });
  assert.deepEqual(draft.placements.get('a'), { anchor: 'b1', slot: 2 });
  assert.deepEqual(draft.placements.get('k'), { anchor: 'b2', slot: 1 });
  assert.equal(draft.placements.has('z'), false);
});

test('the queue groups by X8 hero with per-group progress', () => {
  const groups = groupByX8(
    [
      lane('1', ['Law', 'Bjorn', 'Ava'], { anchor: 'b1' }),
      lane('2', ['Kai', 'Bjorn', 'Mo']),
      lane('3', ['Kai', 'Warden', 'Bjorn']),
      lane('4', ['Kai', 'Warden', 'Mo']),
    ],
    H
  );
  assert.deepEqual(
    groups.map((g) => [g.hero, g.placed, g.total]),
    [
      ['Bjorn', 1, 3],
      ['Warden', 0, 1],
    ]
  );
});

test('history undoes and redoes whole states, and a new change clears redo', () => {
  const history = createHistory(3);
  assert.equal(history.canUndo, false);
  history.push('s0');
  history.push('s1');
  assert.equal(history.undo('s2'), 's1');
  assert.equal(history.undo('s1'), 's0');
  assert.equal(history.undo('s0'), null);
  assert.equal(history.redo('s0'), 's1');
  assert.equal(history.canRedo, true);
  history.push('s1');
  assert.equal(history.canRedo, false);
  assert.equal(history.redo('x'), null);
  for (const s of ['a', 'b', 'c', 'd']) history.push(s);
  assert.equal(history.undo('e'), 'd');
  assert.equal(history.undo('d'), 'c');
  assert.equal(history.undo('c'), 'b');
  assert.equal(history.undo('b'), null, 'the oldest states fall off past the limit');
});

test('the hero matcher reads case, "The", aliases, prefixes and small typos', () => {
  const match = createHeroMatcher(allHeroesData.map((h) => h.name));
  assert.equal(match('avalanche').name, 'The Avalanche');
  assert.equal(match('THE AVALANCHE').name, 'The Avalanche');
  assert.equal(match('the lawman').name, 'Lawman');
  assert.equal(match('Lancelott').name, 'Lancelot');
  assert.equal(match('Lancelott').how, 'typo');
  assert.equal(match('Ragnar the Demon Lord').name, 'Ragnar');
  assert.equal(match('Warhamer').name, 'Warhammer');
  assert.equal(match('Qwertyuiop').name, null);
  assert.equal(editDistance('KITTEN', 'SITTING'), 3);
  assert.equal(editDistance('ABC', 'ABC'), 0);
});

test('paste import reads slashes, commas, dashes, spaces and a trailing skin code', () => {
  const names = allHeroesData.map((h) => h.name);
  const parsed = parsePastedLineups(
    [
      'Lawman / Bjorn / The Avalanche',
      'Lawman, Bjorn, Avalanche 222',
      '',
      '# a comment',
      '2. lawman - warhamer - avalanche skin 321',
      'Lawman Bjorn The Avalanche',
      'Lawman / Nobodyhere / The Avalanche',
      'Lawman / Bjorn',
      'Lawman / Lawman / Bjorn',
    ].join('\n'),
    names
  );
  assert.equal(parsed.length, 7);
  assert.deepEqual(parsed[0].heroes, ['Lawman', 'Bjorn', 'The Avalanche']);
  assert.equal(parsed[0].skin, '');
  assert.deepEqual(parsed[1].heroes, ['Lawman', 'Bjorn', 'The Avalanche']);
  assert.equal(parsed[1].skin, '222');
  assert.deepEqual(parsed[2].heroes, ['Lawman', 'Warhammer', 'The Avalanche']);
  assert.equal(parsed[2].skin, '321');
  assert.deepEqual(parsed[2].fuzzy, ['warhamer → Warhammer']);
  assert.deepEqual(parsed[3].heroes, ['Lawman', 'Bjorn', 'The Avalanche']);
  assert.equal(parsed[4].problem, 'unknown hero name');
  assert.equal(parsed[4].heroes[1], null);
  assert.equal(parsed[4].names[1], 'Nobodyhere');
  assert.match(parsed[5].problem, /needs three heroes, found 2/);
  assert.equal(parsed[6].problem, 'the same hero twice');
});

// The shipped list, end to end: the plan the planner builds from an untouched view
// rebuilds combos-db.js byte for byte, and the summary reads the real lines.
const source = await readFile(new URL('../../js/combos-db.js', import.meta.url), 'utf8');
const view = buildView({ source, combos: rankedCombos, heroTable: allHeroesData });
const heroNames = new Set(Object.keys(view.heroes));
const stateOf = (v) => {
  const lanes = v.x8.map((l, i) => ({ ...l, ...tierOf(l.note), slot: i + 1, added: !!l.queued }));
  return {
    lanes,
    baseOrder: v.base.map((b) => b.id),
    edits: new Map(),
    removed: [],
    rows: mergeRows(v.base, lanes),
  };
};

test('an untouched state saves to the same file, byte for byte, and summarizes as no change', () => {
  const plan = planFromState(stateOf(view));
  const out = buildComboSource(view.parsed, plan, { heroNames, isX8Lane: view.isX8Lane });
  assert.equal(out, source);
  assert.equal(summarizePlan(view, plan).text, 'No changes');
  assert.equal(
    viewSignature(view),
    viewSignature(buildView({ source, combos: rankedCombos, heroTable: allHeroesData }))
  );
});

test('auto-draft on the shipped list places lineups and the summary lists their lines', () => {
  const state = stateOf(view);
  const draft = autoDraft({ heroes: view.heroes, rows: state.rows, lanes: state.lanes });
  assert.ok(draft.placed > 40, `expected most lineups to find a slot, placed ${draft.placed}`);
  for (const lane of state.lanes) {
    const where = draft.placements.get(lane.id);
    if (where) Object.assign(lane, where);
  }
  state.rows = mergeRows(view.base, state.lanes);
  const plan = planFromState(state);
  const summary = summarizePlan(view, plan);
  assert.equal(summary.counts.placed, draft.placed);
  assert.equal(summary.text, draft.placed + ' placed');
  assert.ok(
    summary.lines.every((line) => line.kind === 'placed' && /^\{ heroes: /.test(line.text))
  );
  assert.ok(summary.lines.every((line) => /^above #\d+$/.test(line.detail)));
  // The file the plan writes is valid and keeps every entry.
  const out = buildComboSource(view.parsed, plan, { heroNames, isX8Lane: view.isX8Lane });
  const entries = (text) => text.split('\n').filter((l) => /^\s*\{ heroes: /.test(l)).length;
  assert.equal(entries(out), entries(source));
});

test('the save summary counts placed, moved, new, edited, removed and reordered lines', () => {
  const state = stateOf(view);
  const [first, second] = state.lanes;
  first.anchor = view.base[57].id;
  second.anchor = view.base[10].id;
  const added = {
    id: 'n-test',
    heroes: ['Lawman', 'Bjorn', 'The Brave'],
    skin: '222',
    anchor: view.base[3].id,
    added: true,
  };
  state.lanes.push(added);
  state.baseOrder = [view.base[1].id, view.base[0].id, ...view.base.slice(2).map((b) => b.id)];
  state.edits = new Map([[view.base[5].id, { heroes: view.base[5].heroes, skin: '111' }]]);
  state.removed = [view.base[9].id];
  state.rows = mergeRows(
    state.baseOrder
      .filter((id) => !state.removed.includes(id))
      .map((id) => view.base.find((b) => b.id === id)),
    state.lanes
  );
  const summary = summarizePlan(view, planFromState(state));
  assert.equal(summary.text, '2 placed, 1 new, 1 edited, 1 removed, 2 reordered');
  const addedLine = summary.lines.find((line) => line.kind === 'added');
  assert.equal(addedLine.text, "{ heroes: ['Lawman', 'Bjorn', 'The Brave'], skin: '222' },");
  assert.equal(addedLine.detail, 'new line, above #4');
  const edited = summary.lines.find((line) => line.kind === 'edited');
  assert.match(edited.text, /skin: '111'/);
  assert.match(edited.detail, /^was \{ heroes: /);
  // Moving a lineup that was already placed is a move, not a placement.
  const again = stateOf(view);
  const placedView = {
    ...view,
    x8: view.x8.map((l, i) => (i === 0 ? { ...l, anchor: view.base[20].id } : l)),
  };
  again.lanes[0].anchor = view.base[30].id;
  again.rows = mergeRows(view.base, again.lanes);
  const moved = summarizePlan(placedView, planFromState(again));
  assert.equal(moved.text, '1 moved');
  assert.equal(moved.lines[0].detail, 'above #21 → above #31');
});
