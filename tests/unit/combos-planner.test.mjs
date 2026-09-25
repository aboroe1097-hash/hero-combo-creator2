import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  buildComboSource,
  describeCombos,
  editedEntryLine,
  entryLine,
  laneSlug,
  parseComboSource,
  readQueue,
  staticFiles,
} from '../../scripts/combos-planner-server.mjs';
import { rankedCombos } from '../../js/combos-db.js';
import { allHeroesData } from '../../js/heroes-data.js';

const X8 = new Set(allHeroesData.filter((h) => h.season === 'X8').map((h) => h.name));
const isX8Lane = (combo) => combo.heroes.some((name) => X8.has(name));
const heroNames = new Set(allHeroesData.map((h) => h.name));
const source = await readFile(new URL('../../js/combos-db.js', import.meta.url), 'utf8');

// Rebuilds the entries from generated source without importing it.
function entriesOf(text) {
  return text
    .split('\n')
    .filter((line) => /^\s*\{ heroes: /.test(line))
    .map((line) => line.trim());
}

const parsed = parseComboSource(source, rankedCombos, isX8Lane);
const view = describeCombos(parsed);
const currentOrder = () => [
  ...view.x8.filter((l) => l.anchor).map((l) => ({ id: l.id, anchor: l.anchor })),
  ...view.x8.filter((l) => !l.anchor).map((l) => ({ id: l.id, anchor: '' })),
];

test('the planner reads every combo as one line and splits S0-X2 from X8 lanes', () => {
  assert.equal(view.base.length + view.x8.length, rankedCombos.length);
  assert.ok(view.x8.length > 0);
  assert.ok(view.base.every((b) => !b.heroes.some((n) => X8.has(n))));
});

test('saving an unchanged plan rewrites combos-db.js byte for byte', () => {
  const out = buildComboSource(
    parsed,
    { order: currentOrder(), added: [] },
    { heroNames, isX8Lane }
  );
  assert.equal(out, source);
});

test('a placed X8 lane moves above its anchor and the S0-X2 order is untouched', () => {
  const lane = view.x8[view.x8.length - 1];
  const anchor = view.base[10];
  const order = currentOrder().map((o) =>
    o.id === lane.id ? { id: lane.id, anchor: anchor.id } : o
  );
  const out = entriesOf(buildComboSource(parsed, { order, added: [] }, { heroNames, isX8Lane }));
  const before = entriesOf(source);
  const lineOf = (combo) =>
    before.find((l) => l.includes(`${combo.heroes[0]}`) && l.includes(`${combo.heroes[2]}`));
  const laneLine = lineOf(lane);
  const anchorLine = before[10];
  assert.equal(out.indexOf(laneLine), out.indexOf(anchorLine) - 1);
  const baseLines = (lines) =>
    lines.filter(
      (line) => ![...X8].some((n) => line.includes(`'${n}'`) || line.includes(`"${n}"`))
    );
  assert.deepEqual(baseLines(out), baseLines(before));
  assert.equal(out.length, before.length);
});

test('a new lane is written in the file style and must use an X8 hero', () => {
  const x8Hero = [...X8][0];
  const added = [{ id: 'n-test', heroes: ['Lawman', x8Hero, 'The Avalanche'], skin: '123' }];
  const order = [...currentOrder(), { id: 'n-test', anchor: view.base[0].id }];
  const out = buildComboSource(parsed, { order, added }, { heroNames, isX8Lane });
  assert.ok(out.includes(entryLine(added[0])));
  assert.throws(
    () =>
      buildComboSource(
        parsed,
        {
          order: currentOrder(),
          added: [{ id: 'n-bad', heroes: ['Lawman', 'Lancelot', 'Jane'], skin: '' }],
        },
        { heroNames, isX8Lane }
      ),
    /no X8 hero/
  );
});

test('names with an apostrophe are double quoted like the rest of the file', () => {
  assert.equal(
    entryLine({ heroes: ["North's Rage", 'A', 'B'], skin: '222' }),
    `  { heroes: ["North's Rage", 'A', 'B'], skin: '222' },`
  );
});

test('an unplaced new lane stays out of combos-db.js', () => {
  const x8Hero = [...X8][0];
  const lane = { heroes: ['Lawman', x8Hero, 'The Avalanche'], skin: '321' };
  const added = [{ id: laneSlug(lane), ...lane }];
  const out = buildComboSource(
    parsed,
    { order: [...currentOrder(), { id: added[0].id, anchor: '' }], added },
    { heroNames, isX8Lane }
  );
  assert.equal(out, source);
});

test('the queue file skips unknown heroes, lanes without an X8 hero and lanes already listed', () => {
  const x8Hero = [...X8][0];
  const existing = rankedCombos.find(isX8Lane);
  const { lanes, skipped } = readQueue(
    {
      lanes: [
        { heroes: ['Lawman', x8Hero, 'The Avalanche'], skin: '321', source: 'screenshot' },
        { heroes: ['Lawman', 'Nobody', 'The Avalanche'] },
        { heroes: ['Lawman', 'Lancelot', 'Jane'] },
        { heroes: existing.heroes, skin: existing.skin },
      ],
    },
    {
      heroNames,
      isX8Lane,
      existingKeys: rankedCombos.map((c) => `${c.heroes.join('|')}#${c.skin || ''}`),
    }
  );
  assert.equal(lanes.length, 1);
  assert.equal(lanes[0].source, 'screenshot');
  assert.equal(skipped.length, 3);
});

// The base list is the fixed part of the file, so these tests pin how far the
// planner may move it: a reorder, an edit, and nothing else.

const entryTextLines = (text) => text.split('\n').filter((line) => !/^\s*\{ heroes: /.test(line));
const heroesIn = (line) => (line.match(/'[^']+'|"[^"]+"/g) || []).join(' / ');

test('reordering the S0-X2 list writes the new order and leaves every comment alone', () => {
  const ids = view.base.map((b) => b.id);
  const swapped = [...ids];
  [swapped[0], swapped[1]] = [swapped[1], swapped[0]];
  const out = buildComboSource(
    parsed,
    { order: currentOrder(), added: [], baseOrder: swapped },
    { heroNames, isX8Lane }
  );
  const before = entriesOf(source);
  const after = entriesOf(out);
  assert.equal(after.length, before.length);
  assert.equal(after[0], before[1]);
  assert.equal(after[1], before[0]);
  assert.equal(after[2], before[2]);
  // Every comment and blank line stays exactly where it was.
  assert.deepEqual(entryTextLines(out), entryTextLines(source));
});

test('a reorder must list every S0-X2 lineup exactly once', () => {
  const ids = view.base.map((b) => b.id);
  const plan = (baseOrder) => ({ order: currentOrder(), added: [], baseOrder });
  assert.throws(
    () => buildComboSource(parsed, plan(ids.slice(1)), { heroNames, isX8Lane }),
    /exactly once/
  );
  assert.throws(
    () => buildComboSource(parsed, plan([...ids.slice(1), ids[1]]), { heroNames, isX8Lane }),
    /listed twice/
  );
  assert.throws(
    () => buildComboSource(parsed, plan([...ids.slice(1), 'b999']), { heroNames, isX8Lane }),
    /unknown current lineup b999/
  );
});

test('an edited S0-X2 line keeps its note and writes the file style', () => {
  const first = view.base[0];
  assert.ok(first, 'the database has a first S0-X2 lineup');
  const heroes = ['Beowulf', 'Ramses II', 'Theodora'];
  const out = buildComboSource(
    parsed,
    { order: currentOrder(), added: [], baseEdits: [{ id: first.id, heroes, skin: '123' }] },
    { heroNames, isX8Lane }
  );
  const line = entriesOf(out)[0];
  assert.ok(line.startsWith(`{ heroes: ['Beowulf', 'Ramses II', 'Theodora'], skin: '123'`));
  assert.ok(line.includes(", note: 'Top skin-mode lane."), 'the note stays on the line');
  assert.deepEqual(entryTextLines(out), entryTextLines(source));
});

test('clearing a skin code drops the key and keeps the note', () => {
  const line = "  { heroes: ['Ace', 'Blade', 'Cat'], skin: '222', note: 'kept' },";
  assert.equal(
    editedEntryLine(line, { heroes: ['Ace', 'Blade', 'Cat'], skin: '' }),
    "  { heroes: ['Ace', 'Blade', 'Cat'], note: 'kept' },"
  );
  assert.equal(
    editedEntryLine(line, { heroes: ['Ace', 'Blade', 'Cat'], skin: '111' }),
    "  { heroes: ['Ace', 'Blade', 'Cat'], skin: '111', note: 'kept' },"
  );
  assert.equal(
    editedEntryLine("  { heroes: ['Ace', 'Blade', 'Cat'] },", {
      heroes: ['Dome', 'Blade', 'Cat'],
      skin: '',
    }),
    entryLine({ heroes: ['Dome', 'Blade', 'Cat'], skin: '' })
  );
});

test('an edit is refused when it duplicates a lineup, or crosses the X8 / S0-X2 line', () => {
  const plan = (edits) => ({ order: currentOrder(), added: [], edits });
  const other = view.base[1];
  assert.throws(
    () =>
      buildComboSource(
        parsed,
        plan([{ id: view.base[2].id, heroes: other.heroes, skin: other.skin }]),
        { heroNames, isX8Lane }
      ),
    /identical/
  );
  assert.throws(
    () =>
      buildComboSource(
        parsed,
        plan([{ id: view.base[0].id, heroes: ['Lawman', [...X8][0], 'The Avalanche'], skin: '' }]),
        { heroNames, isX8Lane }
      ),
    /stays out of the current lineups/
  );
  assert.throws(
    () =>
      buildComboSource(
        parsed,
        plan([{ id: view.x8[0].id, heroes: ['Lawman', 'Lancelot', 'Jane'], skin: '' }]),
        { heroNames, isX8Lane }
      ),
    /no X8 hero/
  );
  assert.throws(
    () =>
      buildComboSource(parsed, plan([{ id: view.base[0].id, heroes: ['Nobody'], skin: '' }]), {
        heroNames,
        isX8Lane,
      }),
    /three different heroes/
  );
  assert.throws(
    () =>
      buildComboSource(
        parsed,
        plan([{ id: view.base[0].id, heroes: ['Lawman', 'Lancelot', 'Jane'], skin: '99' }]),
        { heroNames, isX8Lane }
      ),
    /skin code/
  );
  assert.throws(
    () =>
      buildComboSource(parsed, plan([{ id: 'x999', heroes: ['Lawman', [...X8][0], 'Jane'] }]), {
        heroNames,
        isX8Lane,
      }),
    /unknown lineup/
  );
});

test('an X8 lineup can change its three heroes and skin code, and keeps its note', () => {
  const lane = view.x8[0];
  assert.ok(lane.note.includes('tier'), 'the first X8 lane carries a source note');
  const x8Hero = [...X8][0];
  const heroes = ['Lawman', x8Hero, 'The Avalanche'];
  const out = buildComboSource(
    parsed,
    { order: currentOrder(), added: [], edits: [{ id: lane.id, heroes, skin: '222' }] },
    { heroNames, isX8Lane }
  );
  const line = entriesOf(out).find((l) => l.includes(`'${x8Hero}'`) && l.includes('Lawman'));
  assert.ok(line, 'the edited X8 line is written');
  assert.ok(line.includes("skin: '222'"));
  assert.ok(line.includes(lane.note.slice(0, 20)), 'the source note stays on the line');
  assert.equal(entriesOf(out).length, entriesOf(source).length);
  assert.deepEqual(entryTextLines(out), entryTextLines(source));
});

test('a removed lineup leaves the file, and the lane it anchored falls back to the tail', () => {
  const anchor = view.base[3];
  const lane = view.x8[view.x8.length - 1];
  const order = currentOrder().map((o) =>
    o.id === lane.id ? { id: lane.id, anchor: anchor.id } : o
  );
  const before = entriesOf(source);
  const anchorLine = before[3];
  const laneLine = before.find(
    (line) => line.includes(`${lane.heroes[0]}`) && line.includes(`${lane.heroes[2]}`)
  );
  const out = buildComboSource(
    parsed,
    { order, added: [], removed: [anchor.id] },
    { heroNames, isX8Lane }
  );
  const after = entriesOf(out);
  assert.equal(after.length, before.length - 1);
  assert.equal(after.includes(anchorLine), false, 'the removed S0-X2 line is gone');
  assert.equal(after[after.length - 1], laneLine, 'its X8 lane drops back into the tail block');
});

test('a removed X8 lineup leaves the file, and an unknown id is refused', () => {
  const lane = view.x8[view.x8.length - 1];
  const before = entriesOf(source);
  const laneLine = before.find(
    (line) => line.includes(`${lane.heroes[0]}`) && line.includes(`${lane.heroes[2]}`)
  );
  const out = buildComboSource(
    parsed,
    { order: currentOrder(), added: [], removed: [lane.id] },
    { heroNames, isX8Lane }
  );
  const after = entriesOf(out);
  assert.equal(after.length, before.length - 1);
  assert.equal(after.includes(laneLine), false);
  assert.deepEqual(entryTextLines(out), entryTextLines(source));
  assert.throws(
    () =>
      buildComboSource(
        parsed,
        { order: currentOrder(), added: [], removed: ['x999'] },
        { heroNames, isX8Lane }
      ),
    /unknown lineup/
  );
});

test('the hand-written x8-queue.js lists only lineups the planner can place', async () => {
  const { lanes } = await import(
    new URL('../../tools/combos-planner/x8-queue.js', import.meta.url)
  );
  assert.ok(Array.isArray(lanes), 'x8-queue.js exports a lanes array');
  for (const lane of lanes) {
    assert.equal(lane.heroes.length, 3, `${lane.heroes.join(' / ')} needs three heroes`);
    for (const name of lane.heroes) assert.ok(heroNames.has(name), `unknown hero: ${name}`);
    assert.ok(isX8Lane(lane), `${lane.heroes.join(' / ')} has no X8 hero`);
    if (lane.skin) assert.match(String(lane.skin), /^[123]{3}$/);
  }
  const existingKeys = rankedCombos.map((c) => `${c.heroes.join('|')}#${c.skin || ''}`);
  const ready = readQueue({ lanes }, { heroNames, isX8Lane, existingKeys });
  assert.equal(ready.lanes.length, lanes.length, `skipped: ${ready.skipped.join('; ')}`);
});

test('a placed X8 lane stays above its S0-X2 lineup when that lineup moves', () => {
  const lane = view.x8[view.x8.length - 1];
  const anchor = view.base[5];
  const order = currentOrder().map((o) =>
    o.id === lane.id ? { id: lane.id, anchor: anchor.id } : o
  );
  const baseOrder = view.base.map((b) => b.id);
  [baseOrder[5], baseOrder[6]] = [baseOrder[6], baseOrder[5]];
  const out = buildComboSource(parsed, { order, added: [], baseOrder }, { heroNames, isX8Lane });
  const before = entriesOf(source);
  const laneLine = before.find(
    (line) => line.includes(`${lane.heroes[0]}`) && line.includes(`${lane.heroes[2]}`)
  );
  const anchorLine = before[5];
  const after = entriesOf(out);
  assert.equal(after.indexOf(laneLine) + 1, after.indexOf(anchorLine));
  assert.equal(heroesIn(after[0]), heroesIn(before[0]));
});

test('every asset the planner page asks for is served by the planner server', async () => {
  const root = new URL('../../', import.meta.url);
  const read = (rel) => readFile(new URL(rel, root), 'utf8');
  const html = await read('tools/combos-planner/index.html');
  // Asset URLs carry a ?__STAMP__ the server fills in, so ignore the query here.
  const refs = [...html.matchAll(/(?:src|href)="(\/[^"?]+)(?:\?[^"]*)?"/g)].map((m) => m[1]);
  assert.ok(refs.length >= 3, `expected the page to link its assets, saw ${refs.length}`);
  for (const ref of refs) assert.ok(staticFiles.has(ref), `${ref} is linked but not served`);
  // The host and the shared modules it pulls in: a relative specifier resolves
  // against the served module's own URL, which is the server root.
  for (const name of [
    'tools/combos-planner/host.js',
    'js/combos-planner-ui.js',
    'js/combo-lanes.js',
    'js/combo-plan.js',
  ]) {
    const source = await read(name);
    for (const [, spec] of source.matchAll(/from '([^']+\.js)'/g)) {
      const url = spec.startsWith('/') ? spec : '/' + spec.slice(2);
      assert.ok(staticFiles.has(url), `${name} imports ${spec}, which the server does not serve`);
    }
  }
});
