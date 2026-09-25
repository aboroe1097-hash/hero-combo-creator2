// js/combos-live-boot.js
//
// Starts the live ranking on the player-facing app (imported by
// js/app-generator.js, so it rides in the app's own graph and never on the admin
// page). At import it ranks with the last published list this browser validated;
// once the page has loaded and gone idle it reads the published document, off the
// critical path, the same way the app's own Firebase start-up waits for idle.

import { allHeroesData } from './heroes-data.js';
import { applyCachedLiveCombos, loadLiveCombos } from './combos-live.js';

const heroNames = new Set(allHeroesData.map((hero) => hero.name));

/**
 * Local test hook: on localhost only, a spec can hand the loader the document to
 * use (or a function returning a promise of it) instead of Firestore, the way the
 * admin page's local test auth works. Production hosts ignore it.
 */
function testDocument() {
  if (typeof window === 'undefined') return undefined;
  const host = window.location && window.location.hostname;
  if (host !== 'localhost' && host !== '127.0.0.1') return undefined;
  const stub = window.VTS_COMBOS_LIVE_TEST_DOC;
  if (stub === undefined) return undefined;
  return () => Promise.resolve(typeof stub === 'function' ? stub() : stub);
}

function start() {
  const fetchDoc = testDocument();
  void loadLiveCombos({ heroNames, ...(fetchDoc ? { fetchDoc } : {}) }).catch(() => {
    /* the shipped (or cached) list stays live */
  });
}

if (typeof window !== 'undefined') {
  try {
    applyCachedLiveCombos({ heroNames });
  } catch {
    /* a bad cache never blocks the app */
  }
  const idle = () =>
    typeof window.requestIdleCallback === 'function'
      ? window.requestIdleCallback(start, { timeout: 4000 })
      : setTimeout(start, 1500);
  if (document.readyState === 'complete') idle();
  else window.addEventListener('load', idle, { once: true });
}
