import assert from 'node:assert/strict';
import test from 'node:test';

import { buildCostCurve, hasCostCurve, renderCostCurves } from '../../js/research-cost-curve.js';
import { techDatabase } from '../../js/tech-db.js';

test('cost curve splits bought, next and remaining levels and keeps unknowns out of totals', () => {
  const curve = buildCostCurve([100, 200, null, 400], 1, { width: 100, height: 40 });
  assert.equal(curve.max, 400);
  assert.equal(curve.spent, 100);
  assert.equal(curve.remaining, 600);
  assert.equal(curve.unknown, 1);
  assert.deepEqual(
    curve.bars.map((bar) => bar.state),
    ['done', 'next', 'remaining', 'remaining']
  );
  assert.equal(curve.bars[2].value, null);
  assert.equal(curve.bars[2].height, 0, 'unknown cost is not drawn as a zero-cost bar');
  assert.equal(curve.bars[3].height, 40);
  assert.equal(curve.bars[3].y, 0);
  assert.ok(curve.bars[3].x + curve.bars[3].width <= 100.01);
});

test('current level is clamped and a maxed node has nothing remaining', () => {
  assert.equal(buildCostCurve([5, 6], 9).currentLevel, 2);
  assert.equal(buildCostCurve([5, 6], 9).remaining, 0);
  assert.equal(buildCostCurve([5, 6], -3).spent, 0);
  assert.equal(hasCostCurve([5]), false);
  assert.equal(hasCostCurve([0, 0]), false);
  assert.equal(hasCostCurve([0, 7]), true);
});

test('chart totals reconcile with the canonical tech-db costs for every charted node', () => {
  let checked = 0;
  for (const tree of techDatabase) {
    for (const node of tree.nodes) {
      if (!Array.isArray(node.costs) || node.costs.length < 2) continue;
      const values = node.costs.slice(0, node.maxLevel);
      const level = Math.floor(node.maxLevel / 2);
      const curve = buildCostCurve(values, level);
      const expectedSpent = values.slice(0, level).reduce((sum, v) => sum + (v > 0 ? v : 0), 0);
      const expectedRemaining = values.slice(level).reduce((sum, v) => sum + (v > 0 ? v : 0), 0);
      assert.equal(curve.spent, expectedSpent, `${tree.id}/${node.id} spent`);
      assert.equal(curve.remaining, expectedRemaining, `${tree.id}/${node.id} remaining`);
      checked += 1;
    }
  }
  assert.ok(checked > 100, `expected many charted nodes, saw ${checked}`);
});

test('rendered chart carries a table twin, escapes labels, and omits empty series', () => {
  const html = renderCostCurves(
    [
      { key: 'wb', label: 'War <Badges>', shortLabel: 'WB', values: [10, 20, 30] },
      { key: 'cm', label: 'Courage', shortLabel: 'CM', values: [0, 0, 0] },
    ],
    1,
    {
      caption: (label) => `${label} per level`,
      completed: 'Completed',
      remaining: 'Remaining',
      levelShort: 'Lv.',
      tableSummary: 'Varies by level',
      formatNumber: (n) => `#${n}`,
    }
  );
  assert.match(html, /War &lt;Badges&gt; per level/);
  assert.doesNotMatch(html, /War <Badges>/);
  assert.match(html, /role="img"/);
  assert.equal((html.match(/<figure/g) || []).length, 1, 'all-zero series is not charted');
  assert.equal((html.match(/<tr data-state=/g) || []).length, 3);
  assert.match(html, /<td>#20<\/td>/);
  assert.match(html, /Remaining #50/);
  assert.equal(renderCostCurves([], 0), '');
});
