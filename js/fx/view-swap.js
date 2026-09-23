/**
 * Optional same-document panel swap for the 16.5.0 shell (plan §4.1).
 *
 * Wraps ONE existing state update in a View Transition when the browser
 * supports it and live motion policy allows decoration. An update runs at most
 * once: unsupported browsers, reduced motion, and a transition already in
 * flight fall through to the direct update, and a transition callback that a
 * newer swap superseded does nothing at all. Only the intended panel gets a
 * view-transition-name; the root capture is animation-free. Pass
 * `transition: false` to bypass the transition entirely (the initial boot
 * paint, where animating the first panel would read as a flicker).
 */

import { createMotionPolicy } from './motion-policy.js';

const PANEL_NAME = 'vts-panel';

let policy = null;
let activeTransition = null;

// Monotonic swap counter. `startViewTransition` defers its callback, so a swap
// requested while one is in flight can apply before the queued callback runs.
// The callback compares the sequence it captured against the newest one and
// no-ops when superseded, which keeps the newest navigation authoritative and
// stops a stale update from landing last.
let swapSeq = 0;

function motionAllowed(win) {
  if (!policy) policy = createMotionPolicy({ window: win });
  return policy.snapshot().allowed;
}

export function swapPanel(panel, update, options = {}) {
  const doc = options.document || globalThis.document;
  const win = options.window || globalThis;
  if (typeof update !== 'function') return;

  const seq = ++swapSeq;

  const canTransition =
    options.transition !== false &&
    panel &&
    typeof doc?.startViewTransition === 'function' &&
    activeTransition === null &&
    motionAllowed(win);

  if (!canTransition) {
    update();
    return;
  }

  if (panel.style) panel.style.viewTransitionName = PANEL_NAME;
  let transition;
  try {
    transition = doc.startViewTransition(() => {
      if (seq !== swapSeq) return;
      update();
    });
  } catch {
    if (panel.style) panel.style.viewTransitionName = '';
    update();
    return;
  }

  activeTransition = transition;
  const clear = () => {
    if (activeTransition === transition) activeTransition = null;
    if (panel.style) panel.style.viewTransitionName = '';
  };
  Promise.resolve(transition.finished).then(clear, clear);
}

export function disposeViewSwap() {
  activeTransition = null;
  policy?.dispose();
  policy = null;
}
