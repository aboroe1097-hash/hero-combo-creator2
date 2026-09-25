import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  buildComboSource,
  describeCombos,
  entryLine,
  laneSlug,
  parseComboSource,
  readQueue,
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
