import assert from 'node:assert/strict';
import test from 'node:test';

import { disposeViewSwap, swapPanel } from '../../js/fx/view-swap.js';

function createHarness({ reduced = false, unsupported = false, throws = false } = {}) {
  const calls = [];
  const finishedResolvers = [];

  const doc = {
    visibilityState: 'visible',
    hidden: false,
    documentElement: { dataset: {} },
    matchMedia: () => ({ matches: reduced }),
    startViewTransition(update) {
      if (throws) throw new Error('transition unavailable');
      const finished = new Promise((resolve) => finishedResolvers.push(resolve));
      calls.push(update);
      return { finished };
    },
  };
  if (unsupported) delete doc.startViewTransition;

  const win = { document: doc, matchMedia: doc.matchMedia };
  const panel = { style: {} };
  return {
    win,
    doc,
    panel,
    calls,
    finishAll() {
      finishedResolvers.splice(0).forEach((resolve) => resolve());
    },
  };
}

test('an unsupported browser updates directly and never names the panel', () => {
  const { win, doc, panel } = createHarness({ unsupported: true });
  let updates = 0;
  swapPanel(panel, () => updates++, { document: doc, window: win });
  assert.equal(updates, 1);
  assert.equal(panel.style.viewTransitionName, undefined);
  disposeViewSwap();
});

test('an allowed swap runs the update once, names only the panel, then clears it', async () => {
  const { win, doc, panel, calls, finishAll } = createHarness();
  let updates = 0;
  swapPanel(panel, () => updates++, { document: doc, window: win });

  assert.equal(calls.length, 1);
  calls[0]();
  assert.equal(updates, 1);
  assert.equal(panel.style.viewTransitionName, 'vts-panel');

  finishAll();
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(panel.style.viewTransitionName, '');
  disposeViewSwap();
});

test('reduced motion and a second swap during a transition fall through to direct updates', () => {
  const reduced = createHarness({ reduced: true });
  let reducedUpdates = 0;
  swapPanel(reduced.panel, () => reducedUpdates++, { document: reduced.doc, window: reduced.win });
  assert.equal(reducedUpdates, 1);
  assert.equal(reduced.calls.length, 0);
  disposeViewSwap();

  const active = createHarness();
  let firstUpdates = 0;
  let secondUpdates = 0;
  swapPanel(active.panel, () => firstUpdates++, { document: active.doc, window: active.win });
  assert.equal(active.calls.length, 1);

  swapPanel(active.panel, () => secondUpdates++, { document: active.doc, window: active.win });
  assert.equal(secondUpdates, 1, 'the latest navigation must still update');
  assert.equal(active.calls.length, 1, 'no second transition starts while one is in flight');

  active.calls[0]();
  assert.equal(firstUpdates, 0, 'the superseded transition callback must not apply');
  disposeViewSwap();
});

test('a quick A-then-B tab switch keeps B when the stale callback runs last', () => {
  const { win, doc, panel, calls, finishAll } = createHarness();
  const shown = [];

  swapPanel(panel, () => shown.push('A'), { document: doc, window: win });
  assert.equal(calls.length, 1, 'the first swap opens a transition');

  swapPanel(panel, () => shown.push('B'), { document: doc, window: win });
  assert.deepEqual(shown, ['B'], 'the newest navigation applies right away');
  assert.equal(calls.length, 1);

  // The browser only runs the first transition's callback now, after B landed.
  calls[0]();
  assert.deepEqual(shown, ['B'], 'A must not win by running its callback last');

  finishAll();
  disposeViewSwap();
});

test('a callback superseded by a later transition still does nothing', async () => {
  const { win, doc, panel, calls, finishAll } = createHarness();
  const shown = [];

  swapPanel(panel, () => shown.push('A'), { document: doc, window: win });
  swapPanel(panel, () => shown.push('B'), { document: doc, window: win });
  finishAll();
  await Promise.resolve();
  await Promise.resolve();

  // B's direct update cleared the in-flight slot, so C opens its own transition.
  swapPanel(panel, () => shown.push('C'), { document: doc, window: win });
  assert.equal(calls.length, 2, 'C opens a second transition');
  calls[1]();
  assert.deepEqual(shown, ['B', 'C']);

  calls[0]();
  assert.deepEqual(shown, ['B', 'C'], 'the stale A callback stays inert');
  finishAll();
  disposeViewSwap();
});

test('transition: false updates directly and never names the panel', () => {
  const { win, doc, panel, calls } = createHarness();
  let updates = 0;
  swapPanel(panel, () => updates++, { document: doc, window: win, transition: false });
  assert.equal(updates, 1);
  assert.equal(calls.length, 0, 'the boot swap must not open a transition');
  assert.equal(panel.style.viewTransitionName, undefined);
  disposeViewSwap();
});

test('a throwing startViewTransition still performs the update exactly once', () => {
  const { win, doc, panel } = createHarness({ throws: true });
  let updates = 0;
  swapPanel(panel, () => updates++, { document: doc, window: win });
  assert.equal(updates, 1);
  assert.equal(panel.style.viewTransitionName, '');
  disposeViewSwap();
});
