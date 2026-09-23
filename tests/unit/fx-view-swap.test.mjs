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
  assert.equal(firstUpdates, 1);
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
