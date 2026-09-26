import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { buildComboSource, buildView, parseComboSource } from '../../js/combo-plan.js';
import { rankedCombos } from '../../js/combos-db.js';
import { allHeroesData } from '../../js/heroes-data.js';

const root = new URL('../../', import.meta.url);
const source = await readFile(new URL('js/combos-db.js', root), 'utf8');
const heroNames = new Set(allHeroesData.map((hero) => hero.name));
const seasonOf = new Map(allHeroesData.map((hero) => [hero.name, hero.season]));
const isX8Lane = (combo) => combo.heroes.some((name) => seasonOf.get(name) === 'X8');
const entriesOf = (text) =>
  text
    .split('\n')
    .filter((line) => /^\s*\{ heroes: /.test(line))
    .map((line) => line.trim());
const textLines = (text) => text.split('\n').filter((line) => !/^\s*\{ heroes: /.test(line));

test('the shipped engine is importable without node, so a browser host can run it', async () => {
  const engine = await readFile(new URL('js/combo-plan.js', root), 'utf8');
  assert.doesNotMatch(engine, /from 'node:/);
  assert.doesNotMatch(engine, /\brequire\(/);
});

test('buildView splits the shipped file into current and new lineups with anchors', () => {
  const view = buildView({ source, combos: rankedCombos, heroTable: allHeroesData });
  assert.equal(view.base.length + view.x8.length, rankedCombos.length);
  assert.ok(view.base.length > 0 && view.x8.length > 0);
  assert.ok(view.base.every((lane) => !isX8Lane(lane)));
  assert.ok(view.x8.every(isX8Lane));
  assert.equal(view.skipped.length, 0);
  assert.deepEqual(
    view.base.map((lane) => lane.id),
    view.base.map((_, index) => `b${index}`)
  );
  for (const lane of view.x8)
    if (lane.anchor) assert.ok(view.base.some((base) => base.id === lane.anchor));
});

test('buildView carries a queue through, keeping its origin and its skipped reasons', () => {
  const queued = {
    heroes: [
      'Lawman',
      [...heroNames].reverse().find((n) => seasonOf.get(n) === 'X8'),
      'The Avalanche',
    ],
    skin: '321',
  };
  const view = buildView({
    source,
    combos: rankedCombos,
    heroTable: allHeroesData,
    queueLanes: [queued, { heroes: ['Nobody', 'Nobody', 'Nobody'] }],
  });
  const added = view.x8.filter((lane) => lane.queued);
  assert.equal(added.length, 1);
  assert.equal(added[0].anchor, '');
  assert.deepEqual(added[0].heroes, queued.heroes);
  assert.equal(view.skipped.length, 1);
  assert.match(view.skipped[0], /unknown hero name/);
});

test('a plan from a browser host rewrites the file with the local tool invariants', () => {
  const parsed = parseComboSource(source, rankedCombos, isX8Lane);
  const view = buildView({ source, combos: rankedCombos, heroTable: allHeroesData });
  const first = view.base[0];
  const second = view.base[1];
  const last = view.base[view.base.length - 1];
  const plan = {
    order: [
      ...view.x8.slice(0, -1).map((lane) => ({ id: lane.id, anchor: lane.anchor })),
      { id: view.x8[view.x8.length - 1].id, anchor: last.id },
    ],
    added: [],
    baseOrder: [second.id, first.id, ...view.base.slice(2).map((lane) => lane.id)],
    edits: [{ id: last.id, heroes: last.heroes, skin: '222' }],
    removed: [],
  };
  const out = buildComboSource(parsed, plan, { heroNames, isX8Lane });
  const before = entriesOf(source);
  const after = entriesOf(out);
  assert.equal(after.length, before.length);
  // Comments, blank lines and section banners stay exactly where they were.
  assert.deepEqual(textLines(out), textLines(source));
  // The reorder is written (anchored lanes travel with their anchor). The line
  // the edit rewrites drops out of both sides; every other S0-X2 lineup keeps
  // its place, with the first two swapped.
  const known = new Set(view.base.map((entry) => entry.line.trim()));
  known.delete(last.line.trim());
  const baseOnly = (lines) => lines.filter((line) => known.has(line));
  assert.deepEqual(baseOnly(after), [
    baseOnly(before)[1],
    baseOnly(before)[0],
    ...baseOnly(before).slice(2),
  ]);
  // Compare against the same plan without the edit: exactly one line changes, and
  // it is the edited lineup carrying the new skin code.
  const untouched = entriesOf(
    buildComboSource(parsed, { ...plan, edits: [] }, { heroNames, isX8Lane })
  );
  const changed = after.filter((line, index) => line !== untouched[index]);
  assert.equal(changed.length, 1, 'the edit rewrote one line');
  assert.ok(changed[0].includes("skin: '222'"));
  assert.ok(changed[0].includes(last.heroes[0].split("'")[0]), 'and it is the edited lineup');
});

test('removing a lineup drops exactly one line and leaves its anchored lanes in the file', () => {
  const parsed = parseComboSource(source, rankedCombos, isX8Lane);
  const view = buildView({ source, combos: rankedCombos, heroTable: allHeroesData });
  const anchor = view.base[3];
  const lane = view.x8[view.x8.length - 1];
  const plan = {
    order: [
      ...view.x8.slice(0, -1).map((entry) => ({ id: entry.id, anchor: entry.anchor })),
      { id: lane.id, anchor: anchor.id },
    ],
    added: [],
    baseOrder: view.base.map((entry) => entry.id),
    edits: [],
    removed: [anchor.id],
  };
  const out = buildComboSource(parsed, plan, { heroNames, isX8Lane });
  assert.equal(entriesOf(out).length, entriesOf(source).length - 1);
  assert.ok(
    out.includes(`'${lane.heroes[1]}'`),
    'the new lineup that sat above the removed one is kept'
  );
});
