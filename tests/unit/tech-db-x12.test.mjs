// tests/unit/tech-db-x12.test.mjs
// Cross-checks the X12 research trees in js/tech-db.js against the in-repo
// source package docs/sources/x10-x12/x12-research.json (Phase 0).
//
// The source JSON carries internal quirks (14 Defense nodes where the
// per-level `costs` array does not sum to the node's `total`), so the test
// compares per-level cost arrays verbatim and uses the node-table totals
// (4,998,500 WB Defense / 4,763,500 WB Charge) as the authoritative sums.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { techDatabase } from '../../js/tech-db.js';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const source = JSON.parse(
  readFileSync(path.join(rootDir, 'docs', 'sources', 'x10-x12', 'x12-research.json'), 'utf8')
);

const X12_TREES = techDatabase.filter((tree) => tree.season === 'X12');

test('tech-db carries exactly the two X12 trees from the source package', () => {
  assert.equal(X12_TREES.length, 2);
  assert.deepEqual(X12_TREES.map((tree) => tree.id).sort(), source.map((tree) => tree.id).sort());
});

for (const sourceTree of source) {
  const tree = X12_TREES.find((candidate) => candidate.id === sourceTree.id);

  test(`${sourceTree.name}: node rows mirror the source package`, () => {
    assert.ok(tree, 'tree exists in techDatabase');
    assert.equal(tree.name, sourceTree.name);
    assert.equal(tree.season, 'X12');
    assert.equal(tree.unlockCondition, 'Start of Eden X12');
    assert.equal(tree.nodes.length, sourceTree.subs.length);
    assert.deepEqual(
      tree.nodes.map((node) => node.id),
      sourceTree.subs.map((sub) => `node_${sub.o}`)
    );
  });

  test(`${sourceTree.name}: per-level War Badge costs match the source verbatim`, () => {
    for (const sub of sourceTree.subs) {
      const node = tree.nodes.find((candidate) => candidate.id === `node_${sub.o}`);
      assert.ok(node, `node_${sub.o} present`);
      assert.equal(node.name, sub.n);
      assert.equal(node.maxLevel, sub.lv);
      assert.equal(node.costType, 'War Badge');
      assert.deepEqual(node.wisdomCosts, sub.costs, `${sub.n} costs match per level`);
    }
  });

  test(`${sourceTree.name}: published node-table total is preserved`, () => {
    const total = sourceTree.subs.reduce((sum, sub) => sum + sub.total, 0);
    if (sourceTree.id === '9c5d4006') assert.equal(total, 4998500);
    if (sourceTree.id === 'b57d6bf9') assert.equal(total, 4763500);
  });

  test(`${sourceTree.name}: no wixstatic image URLs in tech-db rows`, () => {
    assert.ok(!JSON.stringify(tree).includes('wixstatic'), 'text and numbers only');
  });
}

test('every X12 node id is unique within its tree and tech-db has no duplicate tree ids', () => {
  assert.equal(new Set(techDatabase.map((tree) => tree.id)).size, techDatabase.length);
  for (const tree of X12_TREES) {
    assert.equal(new Set(tree.nodes.map((node) => node.id)).size, tree.nodes.length);
  }
});
