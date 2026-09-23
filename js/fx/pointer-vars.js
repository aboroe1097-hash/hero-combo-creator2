/**
 * One delegated pointer owner for hub/detail card spotlights (16.5.0).
 *
 * A single passive pointermove listener on `root` resolves the hovered card via
 * `selector` and remembers only the latest coordinates; one scheduled frame per
 * pointer burst reads getBoundingClientRect() once and writes `--mx`/`--my`
 * (percent, 0..100) on at most one active card. Switching cards clears the
 * previous card first, and settle()/dispose() release every reference so no
 * detached element is retained. No framework, no imports, no console output;
 * only CSS custom properties are written, so it is CSP-safe.
 */

const DEFAULT_VAR_NAMES = ['--mx', '--my'];

function resolveView(root) {
  if (!root) return null;
  if (root.ownerDocument?.defaultView) return root.ownerDocument.defaultView;
  if (root.defaultView) return root.defaultView;
  if (typeof root.requestAnimationFrame === 'function') return root;
  return null;
}

function clampPercent(value) {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return value;
}

export function createPointerVars(options = {}) {
  const root = options.root || globalThis.document || null;
  const selector = options.selector;
  const activeVarNames =
    Array.isArray(options.activeVarNames) && options.activeVarNames.length > 0
      ? options.activeVarNames.slice()
      : DEFAULT_VAR_NAMES;
  const [xVarName, yVarName] = activeVarNames;

  const view = resolveView(root);
  const scheduleFrame =
    typeof options.schedule === 'function'
      ? options.schedule
      : (callback) =>
          typeof view?.requestAnimationFrame === 'function'
            ? view.requestAnimationFrame(callback)
            : setTimeout(callback, 16);
  const cancelFrame =
    typeof options.cancel === 'function'
      ? options.cancel
      : (id) => {
          if (!id) return;
          if (typeof view?.cancelAnimationFrame === 'function') view.cancelAnimationFrame(id);
          else clearTimeout(id);
        };

  let activeElement = null;
  let pending = null;
  let settlePending = false;
  let frameId = 0;
  let framePending = false;
  let disposed = false;

  function clearActive() {
    const element = activeElement;
    activeElement = null;
    const style = element?.style;
    if (!style || typeof style.removeProperty !== 'function') return;
    if (xVarName) style.removeProperty(xVarName);
    if (yVarName) style.removeProperty(yVarName);
  }

  function cancelScheduledFrame() {
    if (!framePending) return;
    framePending = false;
    cancelFrame(frameId);
    frameId = 0;
  }

  function runFrame() {
    frameId = 0;
    framePending = false;
    if (disposed) return;
    if (settlePending || !pending) {
      settlePending = false;
      clearActive();
      return;
    }

    const { element, clientX, clientY } = pending;
    pending = null;
    if (typeof element.getBoundingClientRect !== 'function') {
      clearActive();
      return;
    }

    const rect = element.getBoundingClientRect();
    if (!rect || rect.width <= 0 || rect.height <= 0) {
      clearActive();
      return;
    }

    const mx = clampPercent(((clientX - rect.left) / rect.width) * 100);
    const my = clampPercent(((clientY - rect.top) / rect.height) * 100);
    if (element !== activeElement) {
      clearActive();
      activeElement = element;
    }

    const style = element.style;
    if (!style || typeof style.setProperty !== 'function') return;
    if (xVarName) style.setProperty(xVarName, mx.toFixed(2));
    if (yVarName) style.setProperty(yVarName, my.toFixed(2));
  }

  function armFrame() {
    if (framePending || disposed) return;
    framePending = true;
    frameId = scheduleFrame(runFrame);
  }

  function scheduleSettle() {
    pending = null;
    if (!activeElement && !framePending) {
      settlePending = false;
      return;
    }
    settlePending = true;
    armFrame();
  }

  function handlePointerMove(event) {
    if (disposed || !selector) return;
    const target = event?.target;
    const element = typeof target?.closest === 'function' ? target.closest(selector) : null;
    if (!element) {
      scheduleSettle();
      return;
    }
    pending = { element, clientX: event.clientX, clientY: event.clientY };
    settlePending = false;
    armFrame();
  }

  function handlePointerEnd() {
    if (disposed || !selector) return;
    pending = null;
    settlePending = false;
    cancelScheduledFrame();
    clearActive();
  }

  function settle() {
    if (!selector) return;
    pending = null;
    settlePending = false;
    cancelScheduledFrame();
    clearActive();
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    if (typeof root?.removeEventListener === 'function') {
      root.removeEventListener('pointermove', handlePointerMove);
      root.removeEventListener('pointerleave', handlePointerEnd);
      root.removeEventListener('pointercancel', handlePointerEnd);
    }
    settle();
  }

  if (selector && typeof root?.addEventListener === 'function') {
    root.addEventListener('pointermove', handlePointerMove, { passive: true });
    root.addEventListener('pointerleave', handlePointerEnd);
    root.addEventListener('pointercancel', handlePointerEnd);
  }

  return {
    settle,
    dispose,
    get activeElement() {
      return activeElement;
    },
  };
}
