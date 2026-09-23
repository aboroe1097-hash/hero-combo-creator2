/**
 * One shared requestAnimationFrame scheduler for new 16.5.0 effects.
 *
 * A single frame callback runs while at least one subscriber is active; zero
 * subscribers stop it, and document-hidden stops it without losing
 * subscribers. Subscribers receive (time, dt) with dt clamped, and the time
 * origin resets after a hidden stretch or a long gap so hidden-tab elapsed
 * time never replays through a spring.
 *
 * The existing game loops and the Eden map's on-demand scheduleDraw keep their
 * own ownership; this scheduler is only for new effects that truly need rAF.
 * A throwing subscriber is isolated so it cannot stop the others, and
 * unsubscribing from inside a callback is safe.
 */

const MAX_DT_MS = 64;

export function createFrameLoop(options = {}) {
  const win = options.window || globalThis;
  const doc = options.document || win?.document || null;
  const onError = typeof options.onError === 'function' ? options.onError : null;
  const maxDt = Number.isFinite(options.maxDt) && options.maxDt > 0 ? options.maxDt : MAX_DT_MS;

  const subscribers = new Set();
  let frameId = 0;
  let lastTime = 0;
  let primed = false;
  let disposed = false;

  const request = (callback) =>
    typeof win?.requestAnimationFrame === 'function'
      ? win.requestAnimationFrame(callback)
      : win.setTimeout(() => callback(Date.now()), 16);

  const cancel = (id) => {
    if (!id) return;
    if (typeof win?.cancelAnimationFrame === 'function') win.cancelAnimationFrame(id);
    else if (typeof win?.clearTimeout === 'function') win.clearTimeout(id);
  };

  const isHidden = () => doc?.visibilityState === 'hidden' || doc?.hidden === true;

  function arm() {
    if (disposed || frameId || subscribers.size === 0 || isHidden()) return;
    frameId = request(tick);
  }

  function stop() {
    cancel(frameId);
    frameId = 0;
    primed = false;
  }

  function tick(time) {
    frameId = 0;
    if (disposed || subscribers.size === 0) return;
    if (isHidden()) {
      primed = false;
      return;
    }
    const now = typeof time === 'number' ? time : Date.now();
    const dt = primed ? Math.min(now - lastTime, maxDt) : 0;
    lastTime = now;
    primed = true;
    for (const subscriber of [...subscribers]) {
      if (!subscribers.has(subscriber)) continue;
      try {
        subscriber(now, dt);
      } catch (error) {
        if (onError) onError(error);
      }
    }
    arm();
  }

  const handleVisibility = () => {
    if (isHidden()) stop();
    else arm();
  };
  if (doc && typeof doc.addEventListener === 'function') {
    doc.addEventListener('visibilitychange', handleVisibility);
  }

  function subscribe(subscriber) {
    if (disposed) return () => {};
    subscribers.add(subscriber);
    arm();
    return () => unsubscribe(subscriber);
  }

  function unsubscribe(subscriber) {
    if (!subscribers.delete(subscriber)) return;
    if (subscribers.size === 0) stop();
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    subscribers.clear();
    stop();
    if (doc && typeof doc.removeEventListener === 'function') {
      doc.removeEventListener('visibilitychange', handleVisibility);
    }
  }

  return {
    subscribe,
    unsubscribe,
    dispose,
    get activeSubscribers() {
      return subscribers.size;
    },
    get running() {
      return frameId !== 0;
    },
    get disposed() {
      return disposed;
    },
  };
}
