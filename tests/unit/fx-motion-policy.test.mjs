import assert from 'node:assert/strict';
import test from 'node:test';

import { createMotionPolicy, detectCapabilities } from '../../js/fx/motion-policy.js';

function createFakeWindow({
  reduced = false,
  finePointer = true,
  saveData = false,
  deviceMemory,
} = {}) {
  const queries = new Map();
  const docListeners = new Set();

  const makeQuery = (media, matches) => {
    const listeners = new Set();
    return {
      media,
      matches,
      addEventListener(type, listener) {
        if (type === 'change') listeners.add(listener);
      },
      removeEventListener(type, listener) {
        if (type === 'change') listeners.delete(listener);
      },
      setMatches(next) {
        this.matches = next;
        for (const listener of [...listeners]) listener({ matches: next });
      },
      get listenerCount() {
        return listeners.size;
      },
    };
  };

  const reducedQuery = makeQuery('(prefers-reduced-motion: reduce)', reduced);
  const pointerQuery = makeQuery('(hover: hover) and (pointer: fine)', finePointer);
  queries.set(reducedQuery.media, reducedQuery);
  queries.set(pointerQuery.media, pointerQuery);

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
    matchMedia: (query) => queries.get(query) || makeQuery(query, false),
    navigator: { connection: { saveData }, deviceMemory },
  };

  return { win, doc, reducedQuery, pointerQuery };
}

test('policy allows decoration only when visible, active, and unthrottled', () => {
  const { win } = createFakeWindow();
  const policy = createMotionPolicy({ window: win });
  assert.deepEqual(policy.snapshot(), {
    reducedMotion: false,
    hidden: false,
    routeActive: true,
    saveData: false,
    deviceMemory: null,
    allowed: true,
  });

  const { win: savingWin } = createFakeWindow({ saveData: true, deviceMemory: 2 });
  const savingPolicy = createMotionPolicy({ window: savingWin });
  assert.equal(savingPolicy.snapshot().allowed, false);
  assert.equal(savingPolicy.snapshot().deviceMemory, 2);
});

test('reduced-motion, visibility, and route changes update live subscribers', () => {
  const { win, doc, reducedQuery } = createFakeWindow();
  const policy = createMotionPolicy({ window: win });
  const states = [];
  policy.subscribe((state) => states.push(state.allowed));

  reducedQuery.setMatches(true);
  reducedQuery.setMatches(false);
  doc.setVisibility('hidden');
  doc.setVisibility('visible');
  policy.setRouteActive(false);
  policy.setRouteActive(false);
  policy.setRouteActive(true);

  assert.deepEqual(states, [true, false, true, false, true, false, true]);
});

test('a throwing subscriber does not stop the others', () => {
  const { win } = createFakeWindow();
  const errors = [];
  const policy = createMotionPolicy({ window: win, onError: (error) => errors.push(error) });
  let calls = 0;
  policy.subscribe(() => {
    throw new Error('subscriber exploded');
  });
  policy.subscribe(() => {
    calls += 1;
  });

  policy.setRouteActive(false);

  // Each subscriber sees the initial snapshot and the route change.
  assert.equal(calls, 2);
  assert.equal(errors.length, 2);
  assert.match(errors[0].message, /subscriber exploded/);
});

test('unsubscribe during a callback is safe and dispose detaches every listener', () => {
  const { win, doc, reducedQuery } = createFakeWindow();
  const policy = createMotionPolicy({ window: win });
  const seen = [];
  let unsubscribeSecond = () => {};
  policy.subscribe(() => {
    seen.push('first');
    unsubscribeSecond();
  });
  unsubscribeSecond = policy.subscribe(() => seen.push('second'));

  policy.setRouteActive(false);
  // Each subscribe() delivers the current snapshot once; the second listener
  // is then dropped from that same emission by the first listener's cleanup.
  assert.deepEqual(seen, ['first', 'second', 'first']);

  assert.equal(reducedQuery.listenerCount, 1);
  assert.equal(doc.listenerCount, 1);
  policy.dispose();
  assert.equal(reducedQuery.listenerCount, 0);
  assert.equal(doc.listenerCount, 0);
  assert.equal(policy.disposed, true);

  const late = policy.subscribe(() => seen.push('late'));
  late();
  assert.deepEqual(seen, ['first', 'second', 'first']);
});

test('detectCapabilities reports only supported APIs', () => {
  const supported = detectCapabilities({
    CSS: { supports: (property, value) => property === 'animation-timeline' && value === 'view()' },
    Element: { prototype: { animate() {} } },
    document: { startViewTransition() {} },
    matchMedia: () => ({ matches: true }),
  });
  assert.deepEqual(supported, {
    waapi: true,
    viewTransitions: true,
    scrollTimeline: true,
    finePointer: true,
  });

  const bare = detectCapabilities({ matchMedia: () => ({ matches: false }) });
  assert.deepEqual(bare, {
    waapi: false,
    viewTransitions: false,
    scrollTimeline: false,
    finePointer: false,
  });
});
