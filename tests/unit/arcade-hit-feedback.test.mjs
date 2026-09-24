import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

await import('../../js/i18n/standalone-copy.js');

const source = readFileSync('games/boot/shared.js', 'utf8');
const css = readFileSync('games/boot/shared.css', 'utf8');

function fakeElement(tag = 'div') {
  const element = {
    tagName: tag,
    style: {},
    children: [],
    className: '',
    attributes: {},
    animations: [],
    removed: false,
    setAttribute(name, value) {
      this.attributes[name] = value;
    },
    appendChild(child) {
      this.children.push(child);
      child.parent = this;
    },
    remove() {
      this.removed = true;
      if (this.parent) this.parent.children = this.parent.children.filter((c) => c !== this);
    },
    animate(keyframes, options) {
      const animation = { keyframes, options, playState: 'running', onfinish: null };
      this.animations.push(animation);
      return animation;
    },
    getBoundingClientRect() {
      return { left: 0, top: 0, width: 400, height: 300 };
    },
  };
  return element;
}

function loadGame({ reduced = false, saveData = false } = {}) {
  const stage = fakeElement();
  let clock = 1000;
  const document = {
    visibilityState: 'visible',
    documentElement: { setAttribute() {}, removeAttribute() {}, style: {} },
    querySelector: (selector) => (selector === '.stage' ? stage : null),
    getElementById: () => null,
    createElement: (tag) => fakeElement(tag),
    addEventListener() {},
  };
  const window = {
    location: { search: '', origin: 'https://example.test' },
    matchMedia: (query) => ({ matches: reduced && query.includes('reduce') }),
    addEventListener() {},
    setTimeout: () => 0,
  };
  const context = vm.createContext({
    window,
    document,
    navigator: { connection: { saveData } },
    localStorage: { getItem: () => null, setItem() {} },
    URLSearchParams,
    performance: { now: () => clock },
    VTSStandaloneI18n: globalThis.VTSStandaloneI18n,
    Math,
    Number,
    String,
    Date,
  });
  window.VTSStandaloneI18n = globalThis.VTSStandaloneI18n;
  vm.runInContext(source, context);
  return {
    G: window.BootGame,
    stage,
    advance(ms) {
      clock += ms;
    },
  };
}

test('shard directions are spread around the hit and bounded in distance', () => {
  const { G } = loadGame();
  const vectors = G.shardVectors(6, () => 0.5);
  assert.equal(vectors.length, 6);
  for (const { dx, dy } of vectors) {
    const distance = Math.hypot(dx, dy);
    assert.ok(distance >= 43 && distance <= 71, `distance ${distance}`);
  }
  assert.ok(vectors.some((v) => v.dx > 0) && vectors.some((v) => v.dx < 0));
});

test('a hit burst is finite and the live shard pool is capped', () => {
  const { G, stage } = loadGame();
  assert.equal(G.shatter(10, 20), 6);
  const shard = stage.children[0];
  assert.equal(shard.attributes['aria-hidden'], 'true');
  assert.equal(shard.animations[0].options.duration, 420);
  assert.equal(G.shatter(10, 20), 6);
  assert.equal(G.shatter(10, 20), 6);
  assert.equal(G.shatter(10, 20), 0, 'no more than 18 shards at once');
  shard.animations[0].onfinish();
  assert.equal(stage.children.length, 17);
  assert.equal(G.shatter(10, 20), 1);
});

test('stage shake is 80 ms, rate-limited, and uses the independent translate property', () => {
  const { G, stage, advance } = loadGame();
  assert.equal(G.shakeStage(), true);
  assert.equal(stage.animations[0].options.duration, 80);
  assert.ok(stage.animations[0].keyframes.every((frame) => 'translate' in frame));
  assert.equal(G.shakeStage(), false);
  advance(401);
  assert.equal(G.shakeStage(), true);
});

test('reduced motion and Save-Data create no shards and no shake', () => {
  for (const options of [{ reduced: true }, { saveData: true }]) {
    const { G, stage } = loadGame(options);
    assert.equal(G.shatter(5, 5), 0);
    assert.equal(G.shakeStage(), false);
    assert.equal(stage.children.length, 0);
    assert.equal(stage.animations.length, 0);
  }
  assert.match(css, /prefers-reduced-motion: reduce\)[\s\S]*\.fx-shard \{\s*display: none;/);
  assert.match(css, /\.float-text \{\s*animation-name: float-fade;/);
});
