/**
 * Optional same-document panel swap for the 16.5.0 shell (plan §4.1).
 *
 * Wraps ONE existing state update in a View Transition when the browser
 * supports it and live motion policy allows decoration. The update always runs
 * exactly once: unsupported browsers, reduced motion, and a transition already
 * in flight fall through to the direct update, so a skipped transition can
 * never repeat state or drop the latest navigation. Only the intended panel
 * gets a view-transition-name; the root capture is animation-free.
 */

import { createMotionPolicy } from './motion-policy.js';

const PANEL_NAME = 'vts-panel';

let policy = null;
let activeTransition = null;

function motionAllowed(win) {
  if (!policy) policy = createMotionPolicy({ window: win });
  return policy.snapshot().allowed;
}

export function swapPanel(panel, update, options = {}) {
  const doc = options.document || globalThis.document;
  const win = options.window || globalThis;
  if (typeof update !== 'function') return;

  const canTransition =
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
