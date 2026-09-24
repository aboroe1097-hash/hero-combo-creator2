import assert from 'node:assert/strict';
import test from 'node:test';

import {
  SHARE_ART_VERSION,
  createRandom,
  paintShareArt,
  planShareArt,
  shareArtSeed,
} from '../../js/fx/share-art.js';

const COMBOS = ['Achilles+Cleopatra+Hannibal', 'Joan+Mulan+Leonidas'];

test('seed is stable, normalized, order-sensitive and versioned', () => {
  const seed = shareArtSeed(COMBOS);
  assert.equal(seed, shareArtSeed(COMBOS.map((c) => ` ${c.toUpperCase()} `)));
  assert.notEqual(seed, shareArtSeed([...COMBOS].reverse()));
  assert.notEqual(seed, shareArtSeed(COMBOS, SHARE_ART_VERSION + 1));
  assert.ok(Number.isInteger(seed) && seed >= 0 && seed <= 0xffffffff);
});

test('random stream is deterministic per seed and stays in [0, 1)', () => {
  const a = createRandom(42);
  const b = createRandom(42);
  for (let i = 0; i < 200; i += 1) {
    const value = a();
    assert.equal(value, b());
    assert.ok(value >= 0 && value < 1);
  }
  assert.notEqual(createRandom(1)(), createRandom(2)());
});

test('same inputs give the same composition; shapes stay quiet and in range', () => {
  const seed = shareArtSeed(COMBOS);
  const plan = planShareArt(seed, 820, 600);
  assert.deepEqual(plan, planShareArt(seed, 820, 600));
  assert.notDeepEqual(plan, planShareArt(shareArtSeed(['other']), 820, 600));
  assert.ok(plan.length >= 10 && plan.length <= 20);
  for (const shape of plan) {
    assert.ok(shape.alpha > 0 && shape.alpha <= 0.14, `alpha ${shape.alpha}`);
    if (shape.type === 'dot') {
      assert.ok(shape.cx > 0 && shape.cx < 820);
      assert.ok(shape.cy >= 0 && shape.cy <= 600);
    }
  }
});

test('painting is bounded, restores context state, and ignores unknown shapes', () => {
  const calls = [];
  const ctx = new Proxy(
    { globalAlpha: 1 },
    {
      get(target, prop) {
        if (prop in target) return target[prop];
        return (...args) => calls.push([prop, ...args]);
      },
      set(target, prop, value) {
        target[prop] = value;
        return true;
      },
    }
  );
  const plan = [...planShareArt(7, 400, 300), { type: 'mystery', alpha: 0.9 }];
  const drawn = paintShareArt(ctx, plan);
  assert.equal(drawn, plan.length - 1);
  assert.equal(calls[0][0], 'save');
  assert.equal(calls.at(-1)[0], 'restore');
  assert.ok(ctx.globalAlpha <= 0.14);
  assert.equal(paintShareArt(null, plan), 0);
});
