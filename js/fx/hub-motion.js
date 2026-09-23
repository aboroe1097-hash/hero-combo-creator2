/**
 * Hub entry stagger and hover spotlight for the 16.5.0 shell (plan §4.1).
 *
 * The entry runs once per page load on the cards that are visible at boot,
 * capped at 12 items with a bounded delay, and the class is removed afterwards
 * so later tab/filter refreshes never replay it. The pointer spotlight uses the
 * shared delegated pointer owner and only writes --mx/--my on one active card;
 * when live motion policy says no (reduced motion, hidden tab, Save-Data), the
 * spotlight settles and new decoration stops.
 */

import { createMotionPolicy } from './motion-policy.js';
import { createPointerVars } from './pointer-vars.js';

const ENTRY_SELECTOR = '.vts-hub-subtab';
const SPOTLIGHT_SELECTOR = '.vts-hub-subtab, .hero-detail-panel';
const ENTRY_CLASS = 'fx-card-enter';
const ENTRY_STEP_MS = 24;
const ENTRY_MAX_DELAY_MS = 168;
const ENTRY_DURATION_MS = 240;
const ENTRY_LIMIT = 12;

function isVisible(element) {
  return Boolean(
    element && typeof element.getClientRects === 'function' && element.getClientRects().length
  );
}

export function initHubMotion(options = {}) {
  const doc = options.document || globalThis.document;
  const win = options.window || globalThis;
  if (!doc || doc.documentElement?.dataset.fxHubMotion === '1') return () => {};
  if (doc.documentElement) doc.documentElement.dataset.fxHubMotion = '1';

  const policy = createMotionPolicy({ window: win, document: doc });
  const pointer = createPointerVars({ root: doc, selector: SPOTLIGHT_SELECTOR });

  const unsubscribe = policy.subscribe((state) => {
    if (!state.allowed) pointer.settle();
  });

  const cards = [...doc.querySelectorAll(ENTRY_SELECTOR)].filter(isVisible);
  const pills = [...doc.querySelectorAll('.tab-pill')].filter(isVisible);
  const enterables = [...cards, ...pills].slice(0, ENTRY_LIMIT);

  let timer = 0;
  if (policy.snapshot().allowed && enterables.length > 0) {
    enterables.forEach((element, index) => {
      const delay = Math.min(index * ENTRY_STEP_MS, ENTRY_MAX_DELAY_MS);
      element.style.setProperty('--fx-delay', `${delay}ms`);
      element.classList.add(ENTRY_CLASS);
    });
    timer = win.setTimeout(
      () => {
        enterables.forEach((element) => {
          element.classList.remove(ENTRY_CLASS);
          element.style.removeProperty('--fx-delay');
        });
      },
      ENTRY_MAX_DELAY_MS + ENTRY_DURATION_MS + 60
    );
  }

  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    if (timer) win.clearTimeout(timer);
    enterables.forEach((element) => {
      element.classList.remove(ENTRY_CLASS);
      element.style.removeProperty('--fx-delay');
    });
    unsubscribe();
    pointer.dispose();
    policy.dispose();
    win.removeEventListener?.('pagehide', dispose);
  };
  win.addEventListener?.('pagehide', dispose, { once: true });
  return dispose;
}
