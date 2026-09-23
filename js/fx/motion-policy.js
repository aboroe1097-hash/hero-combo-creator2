/**
 * Live motion policy for enhanced routes (16.5.0).
 *
 * One owner for the signals that decide whether decorative motion may run:
 * prefers-reduced-motion, document visibility, explicit route activation, and
 * optional Save-Data / deviceMemory hints. Consumers read snapshot() or
 * subscribe() and settle or cancel their decoration when `allowed` turns false.
 *
 * Capabilities are feature-detected, never UA-sniffed. Everything is
 * injectable so unit tests can drive fake windows/documents, and dispose()
 * removes every listener it attached.
 */

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const FINE_POINTER_QUERY = '(hover: hover) and (pointer: fine)';

function readSaveData(win) {
  return win?.navigator?.connection?.saveData === true;
}

function readDeviceMemory(win) {
  const value = win?.navigator?.deviceMemory;
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
}

export function detectCapabilities(win = globalThis) {
  const doc = win?.document;
  let scrollTimeline = false;
  try {
    scrollTimeline =
      typeof win?.CSS?.supports === 'function' && win.CSS.supports('animation-timeline', 'view()');
  } catch {
    scrollTimeline = false;
  }
  return {
    waapi: typeof win?.Element?.prototype?.animate === 'function',
    viewTransitions: typeof doc?.startViewTransition === 'function',
    scrollTimeline,
    finePointer:
      typeof win?.matchMedia === 'function' ? win.matchMedia(FINE_POINTER_QUERY).matches === true : false,
  };
}

export function createMotionPolicy(options = {}) {
  const win = options.window || globalThis;
  const doc = options.document || win?.document || null;
  const onError = typeof options.onError === 'function' ? options.onError : null;

  const listeners = new Set();
  const capabilities = detectCapabilities(win);
  const deviceMemory = readDeviceMemory(win);

  let routeActive = options.routeActive !== false;
  let saveData = readSaveData(win);
  let disposed = false;

  const bindMedia = (query) => {
    if (!query || typeof query.addEventListener !== 'function') return () => {};
    const handler = () => emit();
    query.addEventListener('change', handler);
    return () => query.removeEventListener('change', handler);
  };

  const reducedQuery = typeof win?.matchMedia === 'function' ? win.matchMedia(REDUCED_MOTION_QUERY) : null;
  const unbindReduced = bindMedia(reducedQuery);

  const handleVisibility = () => emit();
  if (doc && typeof doc.addEventListener === 'function') {
    doc.addEventListener('visibilitychange', handleVisibility);
  }

  function snapshot() {
    const reducedMotion = reducedQuery?.matches === true;
    const hidden = doc?.visibilityState === 'hidden' || doc?.hidden === true;
    return {
      reducedMotion,
      hidden,
      routeActive,
      saveData,
      deviceMemory,
      allowed: routeActive && !hidden && !reducedMotion && !saveData,
    };
  }

  function emit() {
    if (disposed || listeners.size === 0) return;
    const state = snapshot();
    for (const listener of [...listeners]) {
      if (!listeners.has(listener)) continue;
      try {
        listener(state);
      } catch (error) {
        if (onError) onError(error);
      }
    }
  }

  function subscribe(listener) {
    if (disposed) return () => {};
    listeners.add(listener);
    try {
      listener(snapshot());
    } catch (error) {
      if (onError) onError(error);
    }
    return () => listeners.delete(listener);
  }

  function setRouteActive(active) {
    const next = active !== false;
    if (next === routeActive) return;
    routeActive = next;
    emit();
  }

  function refresh() {
    const next = readSaveData(win);
    if (next === saveData) return;
    saveData = next;
    emit();
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    listeners.clear();
    unbindReduced();
    if (doc && typeof doc.removeEventListener === 'function') {
      doc.removeEventListener('visibilitychange', handleVisibility);
    }
  }

  return {
    capabilities,
    snapshot,
    subscribe,
    setRouteActive,
    refresh,
    dispose,
    get routeActive() {
      return routeActive;
    },
    get disposed() {
      return disposed;
    },
  };
}
