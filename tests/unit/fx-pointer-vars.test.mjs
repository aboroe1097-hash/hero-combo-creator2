import assert from 'node:assert/strict';
import test from 'node:test';

import { createPointerVars } from '../../js/fx/pointer-vars.js';

function createFakeRoot() {
  const listeners = new Map();

  return {
    addEventListener(type, listener, options) {
      if (!listeners.has(type)) listeners.set(type, new Map());
      listeners.get(type).set(listener, options);
    },
    removeEventListener(type, listener) {
      listeners.get(type)?.delete(listener);
    },
    emit(type, event) {
      for (const listener of [...(listeners.get(type)?.keys() ?? [])]) listener(event);
    },
    handler(type) {
      return [...(listeners.get(type)?.keys() ?? [])][0] ?? null;
    },
    listenerCount(type) {
      return listeners.get(type)?.size ?? 0;
    },
    get totalListeners() {
      let total = 0;
      for (const group of listeners.values()) total += group.size;
      return total;
    },
  };
}

function createFakeScheduler() {
  let nextId = 1;
  const queue = new Map();

  return {
    schedule(callback) {
      const id = nextId;
      nextId += 1;
      queue.set(id, callback);
      return id;
    },
    cancel(id) {
      queue.delete(id);
    },
    flush() {
      const pending = [...queue.values()];
      queue.clear();
      for (const callback of pending) callback();
    },
    get pending() {
      return queue.size;
    },
  };
}

function createFakeCard({ left = 0, top = 0, width = 200, height = 100, match = true } = {}) {
  const writes = [];
  const removals = [];
  const listeners = new Map();
  let rectReads = 0;

  const element = {
    style: {
      setProperty(name, value) {
        writes.push([name, value]);
      },
      removeProperty(name) {
        removals.push(name);
      },
    },
    closest() {
      return match ? element : null;
    },
    getBoundingClientRect() {
      rectReads += 1;
      return { left, top, width, height, right: left + width, bottom: top + height };
    },
    addEventListener(type, listener) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(listener);
    },
    removeEventListener(type, listener) {
      listeners.get(type)?.delete(listener);
    },
    emit(type, event = {}) {
      for (const listener of [...(listeners.get(type) ?? [])]) listener(event);
    },
    listenerCount(type) {
      return listeners.get(type)?.size ?? 0;
    },
    get totalListeners() {
      let total = 0;
      for (const group of listeners.values()) total += group.size;
      return total;
    },
  };

  return {
    element,
    writes,
    removals,
    listenerCount: (type) => element.listenerCount(type),
    get totalListeners() {
      return element.totalListeners;
    },
    emit: (type, event) => element.emit(type, event),
    get rectReads() {
      return rectReads;
    },
  };
}

function createHarness(selector = '.card') {
  const root = createFakeRoot();
  const scheduler = createFakeScheduler();
  const pointer = createPointerVars({
    root,
    selector,
    schedule: scheduler.schedule,
    cancel: scheduler.cancel,
  });
  return { root, scheduler, pointer };
}

test('two moves before a flush schedule one frame and write both variables once', () => {
  const { root, scheduler, pointer } = createHarness();
  const card = createFakeCard({ left: 100, top: 50, width: 200, height: 100 });

  root.emit('pointermove', { target: card.element, clientX: 150, clientY: 75 });
  root.emit('pointermove', { target: card.element, clientX: 200, clientY: 100 });

  assert.equal(scheduler.pending, 1);
  assert.deepEqual(card.writes, []);

  scheduler.flush();

  assert.equal(scheduler.pending, 0);
  assert.deepEqual(card.writes, [
    ['--mx', '50.00'],
    ['--my', '50.00'],
  ]);
  assert.equal(card.rectReads, 1);
  assert.equal(pointer.activeElement, card.element);

  pointer.dispose();
});

test('moving to a second card clears the first and activates only the second', () => {
  const { root, scheduler, pointer } = createHarness();
  const first = createFakeCard({ left: 0, top: 0, width: 100, height: 100 });
  const second = createFakeCard({ left: 100, top: 0, width: 100, height: 100 });

  root.emit('pointermove', { target: first.element, clientX: 25, clientY: 25 });
  scheduler.flush();
  assert.deepEqual(first.writes, [
    ['--mx', '25.00'],
    ['--my', '25.00'],
  ]);
  assert.equal(pointer.activeElement, first.element);

  root.emit('pointermove', { target: second.element, clientX: 150, clientY: 50 });
  scheduler.flush();

  assert.deepEqual(first.removals, ['--mx', '--my']);
  assert.equal(pointer.activeElement, second.element);
  assert.deepEqual(second.writes, [
    ['--mx', '50.00'],
    ['--my', '50.00'],
  ]);

  pointer.dispose();
});

test('the active card clears on its own pointerleave, not on a document listener', () => {
  const { root, scheduler, pointer } = createHarness();
  const card = createFakeCard();

  root.emit('pointermove', { target: card.element, clientX: 20, clientY: 20 });
  scheduler.flush();
  assert.equal(pointer.activeElement, card.element);
  assert.equal(card.listenerCount('pointerleave'), 1);
  assert.equal(root.listenerCount('pointerleave'), 0, 'pointerleave never reaches document');

  card.emit('pointerleave');

  assert.deepEqual(card.removals, ['--mx', '--my']);
  assert.equal(pointer.activeElement, null);
  assert.equal(scheduler.pending, 0);
  assert.equal(card.totalListeners, 0, 'the hook leaves with the card');

  card.emit('pointerleave');
  assert.deepEqual(card.removals, ['--mx', '--my']);

  pointer.dispose();
});

test('pointercancel on the active card clears it as well', () => {
  const { root, scheduler, pointer } = createHarness();
  const card = createFakeCard();

  root.emit('pointermove', { target: card.element, clientX: 20, clientY: 20 });
  scheduler.flush();
  card.emit('pointercancel');

  assert.deepEqual(card.removals, ['--mx', '--my']);
  assert.equal(pointer.activeElement, null);
  assert.equal(card.totalListeners, 0);

  pointer.dispose();
});

test('a card left before its frame runs is cleared without ever being written', () => {
  const { root, scheduler, pointer } = createHarness();
  const card = createFakeCard();

  root.emit('pointermove', { target: card.element, clientX: 20, clientY: 20 });
  card.emit('pointerleave');

  assert.equal(scheduler.pending, 0, 'the queued frame is cancelled');
  scheduler.flush();

  assert.deepEqual(card.writes, []);
  assert.equal(pointer.activeElement, null);
  assert.equal(card.totalListeners, 0);

  pointer.dispose();
});

test('only the card that owns the vars carries the leave hooks', () => {
  const { root, scheduler, pointer } = createHarness();
  const first = createFakeCard({ left: 0, top: 0, width: 100, height: 100 });
  const second = createFakeCard({ left: 100, top: 0, width: 100, height: 100 });
  const third = createFakeCard({ left: 200, top: 0, width: 100, height: 100 });

  root.emit('pointermove', { target: first.element, clientX: 25, clientY: 25 });
  root.emit('pointermove', { target: second.element, clientX: 125, clientY: 25 });
  root.emit('pointermove', { target: third.element, clientX: 225, clientY: 25 });
  scheduler.flush();

  assert.equal(first.totalListeners, 0);
  assert.equal(second.totalListeners, 0);
  assert.equal(third.totalListeners, 2, 'pointerleave + pointercancel on the active card');

  pointer.settle();
  assert.equal(third.totalListeners, 0);

  pointer.dispose();
});

test('a decoration gate that says no reads no rect and writes no property', () => {
  const root = createFakeRoot();
  const scheduler = createFakeScheduler();
  const card = createFakeCard();
  let allowed = false;
  const pointer = createPointerVars({
    root,
    selector: '.card',
    schedule: scheduler.schedule,
    cancel: scheduler.cancel,
    shouldDecorate: () => allowed,
  });

  root.emit('pointermove', { target: card.element, clientX: 20, clientY: 20 });
  assert.equal(scheduler.pending, 0, 'a gated move schedules no frame');
  scheduler.flush();
  assert.deepEqual(card.writes, []);
  assert.equal(card.rectReads, 0);
  assert.equal(pointer.activeElement, null);

  allowed = true;
  root.emit('pointermove', { target: card.element, clientX: 20, clientY: 20 });
  scheduler.flush();
  assert.deepEqual(card.writes, [
    ['--mx', '10.00'],
    ['--my', '20.00'],
  ]);
  assert.equal(pointer.activeElement, card.element);

  // The policy can flip mid-hover (reduced motion turned on, Save-Data appears,
  // a touch pointer reported): the next move settles instead of writing.
  allowed = false;
  root.emit('pointermove', { target: card.element, clientX: 40, clientY: 40 });
  scheduler.flush();

  assert.deepEqual(card.removals, ['--mx', '--my']);
  assert.equal(card.writes.length, 2, 'nothing is written once decoration is off');
  assert.equal(pointer.activeElement, null);
  assert.equal(card.totalListeners, 0);

  pointer.dispose();
});

test('a move that no longer matches schedules a settle of the old card', () => {
  const { root, scheduler, pointer } = createHarness();
  const card = createFakeCard();

  root.emit('pointermove', { target: card.element, clientX: 20, clientY: 20 });
  scheduler.flush();

  root.emit('pointermove', { target: { closest: () => null }, clientX: 0, clientY: 0 });

  assert.equal(scheduler.pending, 1);
  assert.deepEqual(card.removals, []);

  scheduler.flush();

  assert.equal(scheduler.pending, 0);
  assert.deepEqual(card.removals, ['--mx', '--my']);
  assert.equal(pointer.activeElement, null);

  pointer.dispose();
});

test('a zero-size card settles instead of writing', () => {
  const { root, scheduler, pointer } = createHarness();
  const first = createFakeCard();
  const collapsed = createFakeCard({ width: 0, height: 0 });

  root.emit('pointermove', { target: first.element, clientX: 20, clientY: 20 });
  scheduler.flush();

  root.emit('pointermove', { target: collapsed.element, clientX: 0, clientY: 0 });
  scheduler.flush();

  assert.deepEqual(first.removals, ['--mx', '--my']);
  assert.deepEqual(collapsed.writes, []);
  assert.equal(pointer.activeElement, null);

  pointer.dispose();
});

test('custom variable names are used for writes and clears', () => {
  const root = createFakeRoot();
  const scheduler = createFakeScheduler();
  const card = createFakeCard();
  const pointer = createPointerVars({
    root,
    selector: '.card',
    schedule: scheduler.schedule,
    cancel: scheduler.cancel,
    activeVarNames: ['--spot-x', '--spot-y'],
  });

  root.emit('pointermove', { target: card.element, clientX: 100, clientY: 50 });
  scheduler.flush();
  pointer.settle();

  assert.deepEqual(card.writes, [
    ['--spot-x', '50.00'],
    ['--spot-y', '50.00'],
  ]);
  assert.deepEqual(card.removals, ['--spot-x', '--spot-y']);

  pointer.dispose();
});

test('a falsy selector leaves every method inert', () => {
  const { root, scheduler, pointer } = createHarness('');
  const card = createFakeCard();

  root.emit('pointermove', { target: card.element, clientX: 20, clientY: 20 });
  pointer.settle();
  pointer.dispose();
  pointer.dispose();

  assert.equal(root.totalListeners, 0);
  assert.equal(scheduler.pending, 0);
  assert.equal(pointer.activeElement, null);
  assert.deepEqual(card.writes, []);
});

test('dispose removes every listener, cancels frames, and blocks later scheduling', () => {
  const { root, scheduler, pointer } = createHarness();
  const card = createFakeCard();

  root.emit('pointermove', { target: card.element, clientX: 20, clientY: 20 });
  const lateHandler = root.handler('pointermove');

  assert.equal(scheduler.pending, 1);
  assert.equal(root.listenerCount('pointermove'), 1);
  assert.equal(root.totalListeners, 1, 'the document owns pointermove only');
  assert.equal(card.listenerCount('pointerleave'), 1);
  assert.equal(card.listenerCount('pointercancel'), 1);

  pointer.dispose();

  assert.equal(root.totalListeners, 0);
  assert.equal(card.totalListeners, 0);
  assert.equal(scheduler.pending, 0);
  assert.equal(pointer.activeElement, null);

  pointer.dispose();
  assert.equal(root.totalListeners, 0);
  assert.equal(card.totalListeners, 0);

  lateHandler({ target: card.element, clientX: 50, clientY: 50 });
  scheduler.flush();

  assert.equal(scheduler.pending, 0);
  assert.deepEqual(card.writes, []);

  root.emit('pointermove', { target: card.element, clientX: 60, clientY: 60 });
  assert.equal(scheduler.pending, 0);

  pointer.dispose();
});
