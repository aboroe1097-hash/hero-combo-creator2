/**
 * Bounded celebration-particle pool contract: bursts are rate-limited, capped at
 * maxParticles live nodes, remove themselves when their animation finishes, and
 * every node plus the shared layer disappears on dispose.
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import { createParticlePool } from '../../js/fx/particles.js';

const COLORS = ['#7dd3fc', '#fbbf24', '#f87171', '#a78bfa'];

function createSeededRandom(seed = 1) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function createFakeElement(tagName, doc) {
  return {
    tagName,
    style: {},
    attributes: {},
    children: new Set(),
    parentNode: null,
    isRemoved: false,
    setAttribute(name, value) {
      this.attributes[name] = value;
    },
    appendChild(child) {
      child.parentNode = this;
      this.children.add(child);
      return child;
    },
    remove() {
      if (this.parentNode) {
        this.parentNode.children.delete(this);
        this.parentNode = null;
      }
      this.isRemoved = true;
      doc.removed.push(this);
    },
    animate(keyframes, options) {
      const animation = {
        node: this,
        keyframes,
        options,
        cancelCalls: 0,
        finished: Promise.resolve(),
        cancel() {
          this.cancelCalls += 1;
        },
      };
      doc.animations.push(animation);
      return animation;
    },
  };
}

function createFakeDocument() {
  const doc = { created: [], removed: [], animations: [] };
  doc.createElement = (tagName) => {
    const element = createFakeElement(tagName, doc);
    doc.created.push(element);
    return element;
  };
  doc.body = createFakeElement('body', doc);
  return doc;
}

function createAnchor(doc, rect = { left: 100, top: 200, width: 40, height: 20 }) {
  const anchor = createFakeElement('button', doc);
  anchor.getBoundingClientRect = () => rect;
  return anchor;
}

function createHarness({ startTime = 0, ...poolOptions } = {}) {
  const doc = createFakeDocument();
  let time = startTime;
  const pool = createParticlePool({
    document: doc,
    random: createSeededRandom(7),
    now: () => time,
    ...poolOptions,
  });
  return {
    doc,
    pool,
    anchor: createAnchor(doc),
    advance(ms) {
      time += ms;
    },
  };
}

test('disabled pool creates no layer and no nodes', () => {
  const { doc, pool, anchor } = createHarness({ disabled: true });
  assert.equal(pool.burst(anchor), false);
  assert.equal(doc.created.length, 0);
  assert.equal(doc.body.children.size, 0);
  assert.equal(pool.liveCount, 0);
});

test('a per-burst disabled flag creates nothing', () => {
  const { doc, pool, anchor } = createHarness();
  assert.equal(pool.burst(anchor, { disabled: true }), false);
  assert.equal(doc.created.length, 0);
});

test('a second burst inside minBurstInterval is dropped', () => {
  const { doc, pool, anchor, advance } = createHarness({
    particleCount: 4,
    minBurstInterval: 1000,
  });
  assert.equal(pool.burst(anchor), true);
  const created = doc.created.length;
  const live = pool.liveCount;

  advance(500);
  assert.equal(pool.burst(anchor), false);
  assert.equal(doc.created.length, created);
  assert.equal(pool.liveCount, live);

  advance(500);
  assert.equal(pool.burst(anchor), true);
  assert.equal(pool.liveCount, live * 2);
});

test('live particle nodes never exceed maxParticles across bursts', () => {
  const { doc, pool, anchor } = createHarness({
    maxParticles: 10,
    particleCount: 8,
    minBurstInterval: 0,
  });
  assert.equal(pool.burst(anchor), true);
  assert.equal(pool.liveCount, 8);

  assert.equal(pool.burst(anchor), true);
  assert.equal(pool.liveCount, 10);

  assert.equal(pool.burst(anchor), false);
  assert.equal(pool.liveCount, 10);

  const layer = [...doc.body.children][0];
  assert.equal(layer.children.size, 10);
});

test('an accepted burst is removed after its animations finish', async () => {
  const { doc, pool, anchor } = createHarness({ particleCount: 5 });
  assert.equal(pool.burst(anchor), true);
  assert.equal(pool.liveCount, 5);

  const layer = [...doc.body.children][0];
  assert.equal(layer.style.position, 'fixed');
  assert.equal(layer.style.inset, '0');
  assert.equal(layer.style.overflow, 'hidden');
  assert.equal(layer.style.pointerEvents, 'none');
  assert.equal(layer.style.zIndex, '2147483000');
  assert.equal(layer.attributes['aria-hidden'], 'true');
  assert.equal(layer.children.size, 5);

  const [first] = [...layer.children];
  assert.equal(first.style.position, 'absolute');
  assert.equal(first.style.width, '6px');
  assert.equal(first.style.height, '6px');
  assert.equal(first.style.borderRadius, '50%');
  assert.ok(COLORS.includes(first.style.background));

  assert.equal(doc.animations.length, 5);
  assert.equal(doc.animations[0].options.duration, 600);
  assert.equal(doc.animations[0].options.easing, 'cubic-bezier(0.16, 1, 0.3, 1)');
  assert.equal(doc.animations[0].options.fill, 'none');
  assert.equal(doc.animations[0].keyframes[0].opacity, 1);
  assert.equal(doc.animations[0].keyframes[1].opacity, 0);
  assert.match(doc.animations[0].keyframes[1].transform, /scale\(0\.4\)$/);

  await Promise.resolve();
  assert.equal(pool.liveCount, 0);
  assert.equal(layer.children.size, 0);
  assert.equal(doc.removed.length, 5);
  assert.ok(doc.animations.every((animation) => animation.cancelCalls === 1));
});

test('anchors without WAAPI, without a rect, or missing are rejected', () => {
  const { doc, pool } = createHarness();
  const noAnimate = createAnchor(doc);
  delete noAnimate.animate;
  assert.equal(pool.burst(noAnimate), false);

  const noRect = createAnchor(doc, { left: 0, top: 0, width: 0, height: 0 });
  assert.equal(pool.burst(noRect), false);

  assert.equal(pool.burst(null), false);
  assert.equal(doc.created.length, 0);
  assert.equal(pool.liveCount, 0);
});

test('dispose removes the layer and particles, is idempotent, and stops later bursts', async () => {
  const { doc, pool, anchor } = createHarness({ particleCount: 6 });
  assert.equal(pool.burst(anchor), true);
  const layer = [...doc.body.children][0];
  const animations = [...doc.animations];

  pool.dispose();
  assert.equal(pool.disposed, true);
  assert.equal(pool.liveCount, 0);
  assert.equal(doc.body.children.size, 0);
  assert.equal(layer.isRemoved, true);
  assert.equal(layer.children.size, 0);
  assert.ok(animations.every((animation) => animation.cancelCalls === 1));
  assert.equal(doc.removed.length, 7);

  pool.dispose();
  assert.equal(doc.removed.length, 7);
  assert.equal(doc.body.children.size, 0);

  await Promise.resolve();
  assert.equal(doc.removed.length, 7);

  assert.equal(pool.burst(anchor), false);
  assert.equal(doc.created.length, 7);
  assert.equal(pool.liveCount, 0);
});
