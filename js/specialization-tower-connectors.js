/**
 * Specialization tower connectors (16.5.x P2, plan §4.5).
 *
 * Each column's research spine gets a static accent segment from its first
 * research to the next research still to finish, so progress along the path
 * reads at a glance in both themes and in reduced motion. The segment draws
 * in once (transform-only, CSS-owned) the first time a column scrolls into
 * view on this page; later re-renders, offscreen columns, reduced motion and
 * Save-Data show it statically. Totals, order and selection are untouched.
 */

/**
 * The same signals js/fx/motion-policy.js combines, read once per render.
 * Towers is its own entry: importing the shared policy here would split it
 * into a new chunk and the deployed file count has no headroom, and the CSS
 * reduced-motion query already owns the animation itself.
 */
function defaultMotionAllowed(win = globalThis) {
  try {
    if (win.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return false;
    if (win.navigator?.connection?.saveData === true) return false;
    return win.document?.visibilityState !== 'hidden';
  } catch {
    return false;
  }
}

/** Number of leading researches that are complete (the path reached so far). */
export function connectorReach(completeFlags) {
  if (!Array.isArray(completeFlags)) return 0;
  let reach = 0;
  while (reach < completeFlags.length && completeFlags[reach] === true) reach += 1;
  return reach;
}

/**
 * Segment from the first research centre to the frontier research centre
 * (or the last one once the column is done). Null when nothing is reached.
 */
export function connectorSegment(centers, reach) {
  if (!Array.isArray(centers) || centers.length < 2) return null;
  const count = Math.min(Math.max(0, Math.floor(Number(reach) || 0)), centers.length);
  if (count === 0) return null;
  const end = centers[Math.min(count, centers.length - 1)];
  const start = centers[0];
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
  return { start: Math.round(start), length: Math.round(end - start) };
}

export function createTowerConnectors({ motionAllowed = defaultMotionAllowed } = {}) {
  const revealed = new Set();
  let observer = null;

  function stopObserving() {
    observer?.disconnect();
    observer = null;
  }

  function measure(list) {
    const listTop = list.getBoundingClientRect().top;
    return [...list.querySelectorAll('[data-specialization-open-research]')].map((button) => {
      const rect = button.getBoundingClientRect();
      return rect.top + rect.height / 2 - listTop;
    });
  }

  /** Call after each render of the graph. */
  function sync(root, troopId) {
    stopObserving();
    const lists = [...(root?.querySelectorAll('[data-connector-reach]') || [])];
    const animate =
      motionAllowed() === true && typeof globalThis.IntersectionObserver === 'function';
    const pending = [];
    // Read every geometry first, then write, so one render costs one layout.
    const segments = lists.map((list) =>
      connectorSegment(measure(list), Number(list.dataset.connectorReach))
    );
    lists.forEach((list, index) => {
      const segment = segments[index];
      if (!segment) {
        list.removeAttribute('data-connector-fill');
        list.removeAttribute('data-connector-reveal');
        return;
      }
      list.style.setProperty('--connector-start', `${segment.start}px`);
      list.style.setProperty('--connector-length', `${segment.length}px`);
      list.dataset.connectorFill = 'true';
      const key = `${troopId}:${list.closest('[data-specialization-column]')?.dataset.specializationColumn}`;
      if (!animate || revealed.has(key)) {
        list.removeAttribute('data-connector-reveal');
        return;
      }
      list.dataset.connectorReveal = 'pending';
      list.dataset.connectorKey = key;
      pending.push(list);
    });
    if (!pending.length) return;
    const scroller = root.querySelector('[data-specialization-tower-graph]');
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const list = entry.target;
          revealed.add(list.dataset.connectorKey);
          list.dataset.connectorReveal = 'run';
          observer?.unobserve(list);
        }
      },
      { root: scroller || null, threshold: 0.35 }
    );
    pending.forEach((list) => observer.observe(list));
  }

  function dispose() {
    stopObserving();
  }

  return { sync, dispose };
}
