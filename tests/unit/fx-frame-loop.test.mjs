import assert from 'node:assert/strict';
import test from 'node:test';

import { createFrameLoop } from '../../js/fx/frame-loop.js';

function createFakeWindow() {
  let nextId = 1;
  const callbacks = new Map();
  const docListeners = new Set();

  const doc = {
    visibilityState: 'visible',
    hidden: false,
    addEventListener(type, listener) {
      if (type === 'visibilitychange') docListeners.add(listener);
    },
    removeEventListener(type, listener) {
      if (type === 'visibilitychange') docListeners.delete(listener);
    },
    setVisibility(state) {
      this.visibilityState = state;
      this.hidden = state === 'hidden';
      for (const listener of [...docListeners]) listener();
    },
    get listenerCount() {
      return docListeners.size;
    },
  };

  const win = {
    document: doc,
    requestAnimationFrame(callback) {
      const id = nextId++;
      callbacks.set(id, callback);
      return id;
    },
    cancelAnimationFrame(id) {
      callbacks.delete(id);
    },
    setTimeout(callback) {
      const id = nextId++;
      callbacks.set(id, () => callback(Date.now()));
      return id;
    },
    clearTimeout(id) {
      callbacks.delete(id);
    },
  };

  const flush = (time) => {
    const pending = [...callbacks.values()];
    callbacks.clear();
    for (const callback of pending) callback(time);
  };

  return { win, doc, flush, pendingCount: () => callbacks.size };
}

test('one shared frame callback drives every subscriber with a clamped dt', () => {
  const { win, flush, pendingCount } = createFakeWindow();
  const loop = createFrameLoop({ window: win });
  const first = [];
  const second = [];
  loop.subscribe((time, dt) => first.push([time, dt]));
  loop.subscribe((time, dt) => second.push([time, dt]));

  assert.equal(pendingCount(), 1);
  flush(100);
  assert.equal(pendingCount(), 1);
  flush(116);
  flush(1000);

  assert.deepEqual(first, [
    [100, 0],
    [116, 16],
    [1000, 64],
  ]);
  assert.deepEqual(second, first);
});

test('zero subscribers stop the scheduler and a later subscribe re-arms it', () => {
  const { win, flush, pendingCount } = createFakeWindow();
  const loop = createFrameLoop({ window: win });
  const stop = loop.subscribe(() => {});
  flush(10);
  assert.equal(loop.running, true);

  stop();
  assert.equal(loop.activeSubscribers, 0);
  assert.equal(loop.running, false);
  assert.equal(pendingCount(), 0);
  flush(20);
  assert.equal(pendingCount(), 0);

  loop.subscribe(() => {});
  assert.equal(loop.running, true);
  assert.equal(pendingCount(), 1);
});

test('hiding the document stops frames and resume restarts with a fresh time origin', () => {
  const { win, doc, flush, pendingCount } = createFakeWindow();
  const loop = createFrameLoop({ window: win });
  const samples = [];
  loop.subscribe((time, dt) => samples.push(dt));
  flush(100);
  flush(116);

  doc.setVisibility('hidden');
  assert.equal(loop.running, false);
  assert.equal(pendingCount(), 0);
  flush(5000);
  assert.equal(samples.length, 2);

  doc.setVisibility('visible');
  assert.equal(pendingCount(), 1);
  flush(9000);
  assert.deepEqual(samples, [0, 16, 0]);
});

test('a throwing subscriber is isolated and reported', () => {
  const { win, flush } = createFakeWindow();
  const errors = [];
  const loop = createFrameLoop({ window: win, onError: (error) => errors.push(error) });
  let survivorCalls = 0;
  loop.subscribe(() => {
    throw new Error('effect failed');
  });
  loop.subscribe(() => {
    survivorCalls += 1;
  });

  flush(16);
  flush(32);

  assert.equal(survivorCalls, 2);
  assert.equal(errors.length, 2);
  assert.match(errors[0].message, /effect failed/);
});

test('unsubscribing from inside a callback is safe and dispose detaches listeners', () => {
  const { win, doc, flush } = createFakeWindow();
  const loop = createFrameLoop({ window: win });
  const seen = [];
  let stopSecond = () => {};
  loop.subscribe(() => {
    seen.push('first');
    stopSecond();
  });
  stopSecond = loop.subscribe(() => seen.push('second'));

  flush(16);
  flush(32);
  assert.deepEqual(seen, ['first', 'first']);

  assert.equal(doc.listenerCount, 1);
  loop.dispose();
  assert.equal(doc.listenerCount, 0);
  assert.equal(loop.disposed, true);
  assert.equal(loop.activeSubscribers, 0);
  assert.equal(loop.running, false);

  const late = loop.subscribe(() => seen.push('late'));
  late();
  assert.deepEqual(seen, ['first', 'first']);
});
