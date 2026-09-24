import assert from 'node:assert/strict';
import test from 'node:test';

import { createWorld } from '../../js/eden-siege/sim/world.js';
import { createInput } from '../../js/eden-siege/engine/input.js';

function createKeyboardInput(options = {}) {
  const listeners = new Map();
  const browserWindow = {
    addEventListener(type, listener) {
      const entries = listeners.get(type) || new Set();
      entries.add(listener);
      listeners.set(type, entries);
    },
    removeEventListener(type, listener) {
      listeners.get(type)?.delete(listener);
    },
    dispatch(type, event) {
      for (const listener of listeners.get(type) || []) listener(event);
    },
  };
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    writable: true,
    value: browserWindow,
  });

  const input = createInput(options);
  return {
    input,
    press(code, modifiers = {}) {
      browserWindow.dispatch('keydown', {
        code,
        repeat: false,
        shiftKey: false,
        metaKey: false,
        ctrlKey: false,
        preventDefault() {},
        ...modifiers,
      });
    },
    dispose() {
      input.dispose();
      if (previousWindow) Object.defineProperty(globalThis, 'window', previousWindow);
      else delete globalThis.window;
    },
  };
}

test('one real nova key press is read and fired exactly once', () => {
  const world = createWorld({ mapId: 'keep', seed: 'keep:key-nova', heroName: 'Jeanne' });
  const keyboard = createKeyboardInput();
  try {
    keyboard.press('Enter');
    world.setInput(keyboard.input.read());
    world.step();
    world.drainEvents();
    assert.equal(world.state.phase, 'wave');

    world.state.nova.charge = 100;
    world.state.nova.ready = true;
    keyboard.press('KeyF');
    world.setInput(keyboard.input.read());
    world.step();
    for (let step = 0; step < 4; step += 1) {
      world.setInput(keyboard.input.read());
      world.step();
    }

    assert.equal(world.drainEvents().filter((event) => event.type === 'nova').length, 1);
    assert.equal(world.state.nova.charge, 0);
  } finally {
    keyboard.dispose();
  }
});

test('a real restart key press returns the simulation to the ready phase', () => {
  const world = createWorld({ mapId: 'keep', seed: 'keep:key-restart', heroName: 'Sky Breaker' });
  let restarts = 0;
  const keyboard = createKeyboardInput({
    onRestart() {
      restarts += 1;
      world.setInput({ restart: true });
    },
  });
  try {
    keyboard.press('Enter');
    world.setInput(keyboard.input.read());
    world.step();
    assert.equal(world.state.phase, 'wave');

    keyboard.press('KeyR', { shiftKey: true });
    world.step();

    assert.equal(restarts, 1);
    assert.equal(world.state.phase, 'ready');
    assert.equal(world.state.wave, 0);
  } finally {
    keyboard.dispose();
  }
});
