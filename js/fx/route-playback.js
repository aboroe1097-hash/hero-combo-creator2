/**
 * Route playback geometry and clock (16.5.x P2, plan §4.4).
 *
 * Pure helpers for drawing an existing, already-routed Eden path progressively.
 * Arc length is used only to pace the visual playback; it is never an ETA and
 * never changes the stored route, its distance, or its legality. The clock owns
 * at most one animation frame at a time, only while playing, and stops itself
 * on completion, pause, or dispose, so a settled map stays idle.
 */

const MIN_DURATION_MS = 1500;
const MAX_DURATION_MS = 6000;
const MS_PER_TILE = 8;

function finitePoint(point) {
  return point && Number.isFinite(Number(point.x)) && Number.isFinite(Number(point.y));
}

/** Cumulative arc length (in the points' own units) for each vertex. */
export function measureRoute(points) {
  const list = Array.isArray(points) ? points.filter(finitePoint) : [];
  const cumulative = new Array(list.length);
  let total = 0;
  for (let i = 0; i < list.length; i += 1) {
    if (i > 0) {
      total += Math.hypot(
        Number(list[i].x) - Number(list[i - 1].x),
        Number(list[i].y) - Number(list[i - 1].y)
      );
    }
    cumulative[i] = total;
  }
  return { points: list, cumulative, total };
}

export function clampProgress(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return n >= 1 ? 1 : n;
}

/**
 * The drawn prefix of a measured route at `progress` (0..1), ending on an
 * interpolated head point. Progress 1 returns every vertex unchanged.
 */
export function sliceRoute(measured, progress) {
  const { points, cumulative, total } = measured || {};
  if (!points?.length) return [];
  const p = clampProgress(progress);
  if (p >= 1) return points.slice();
  if (p <= 0 || total <= 0) return [points[0]];
  const target = total * p;
  const out = [points[0]];
  for (let i = 1; i < points.length; i += 1) {
    if (cumulative[i] < target) {
      out.push(points[i]);
      continue;
    }
    const span = cumulative[i] - cumulative[i - 1];
    const t = span > 0 ? (target - cumulative[i - 1]) / span : 1;
    const a = points[i - 1];
    const b = points[i];
    out.push({
      x: Number(a.x) + (Number(b.x) - Number(a.x)) * t,
      y: Number(a.y) + (Number(b.y) - Number(a.y)) * t,
    });
    break;
  }
  return out;
}

/**
 * Arc-length position of each stop (the user's waypoints) along the routed
 * path: each stop maps to the nearest routed vertex at or after the previous
 * stop, so the positions never run backwards.
 */
export function measureStops(measured, stops) {
  const { points, cumulative } = measured || {};
  if (!points?.length || !Array.isArray(stops)) return [];
  const out = [];
  let from = 0;
  for (const stop of stops) {
    if (!finitePoint(stop)) continue;
    let best = from;
    let bestDistance = Infinity;
    for (let i = from; i < points.length; i += 1) {
      const d = Math.hypot(
        Number(points[i].x) - Number(stop.x),
        Number(points[i].y) - Number(stop.y)
      );
      if (d < bestDistance) {
        bestDistance = d;
        best = i;
      }
    }
    out.push(cumulative[best]);
    from = best;
  }
  return out;
}

/** Number of stops reached at `progress` (a stop counts once the head is on it). */
export function reachedStops(stopDistances, total, progress) {
  if (!Array.isArray(stopDistances) || !stopDistances.length) return 0;
  const target = (Number(total) || 0) * clampProgress(progress);
  let reached = 0;
  for (const distance of stopDistances) {
    if (distance <= target + 1e-9) reached += 1;
  }
  return reached;
}

/** Visual pacing only: longer routes draw longer, bounded to 1.5-6 s. */
export function playbackDurationMs(totalLength) {
  const n = Number(totalLength);
  if (!Number.isFinite(n) || n <= 0) return MIN_DURATION_MS;
  return Math.round(Math.min(MAX_DURATION_MS, Math.max(MIN_DURATION_MS, n * MS_PER_TILE)));
}

/**
 * Finite playback clock. `onTick(progress)` runs once per frame while playing;
 * `onChange(state)` runs on play/pause/seek/complete. No frame is requested
 * while paused, complete, or disposed.
 */
export function createPlaybackClock(options = {}) {
  const now = typeof options.now === 'function' ? options.now : () => performance.now();
  const requestFrame =
    typeof options.requestFrame === 'function'
      ? options.requestFrame
      : (cb) => globalThis.requestAnimationFrame(cb);
  const cancelFrame =
    typeof options.cancelFrame === 'function'
      ? options.cancelFrame
      : (id) => globalThis.cancelAnimationFrame(id);
  const onTick = typeof options.onTick === 'function' ? options.onTick : () => {};
  const onChange = typeof options.onChange === 'function' ? options.onChange : () => {};

  let duration = playbackDurationMs(options.totalLength);
  let progress = clampProgress(options.progress ?? 1);
  let playing = false;
  let startedAt = 0;
  let frame = 0;
  let disposed = false;

  const state = () => ({ progress, playing, duration });

  function stopFrame() {
    if (frame) cancelFrame(frame);
    frame = 0;
  }

  function tick() {
    frame = 0;
    if (!playing || disposed) return;
    progress = clampProgress((now() - startedAt) / duration);
    if (progress >= 1) {
      playing = false;
      onTick(progress);
      onChange(state());
      return;
    }
    onTick(progress);
    frame = requestFrame(tick);
  }

  function play() {
    if (disposed || playing) return false;
    if (progress >= 1) progress = 0;
    // Resume from the current position; hidden-tab time is never replayed.
    startedAt = now() - progress * duration;
    playing = true;
    onChange(state());
    frame = requestFrame(tick);
    return true;
  }

  function pause() {
    if (!playing) return false;
    progress = clampProgress((now() - startedAt) / duration);
    playing = false;
    stopFrame();
    onChange(state());
    return true;
  }

  function seek(value) {
    if (disposed) return;
    const wasPlaying = playing;
    playing = false;
    stopFrame();
    progress = clampProgress(value);
    onChange(state());
    return wasPlaying;
  }

  function replay() {
    if (disposed) return false;
    seek(0);
    return play();
  }

  function setTotalLength(totalLength) {
    const next = playbackDurationMs(totalLength);
    if (next === duration) return;
    if (playing) startedAt = now() - progress * next;
    duration = next;
  }

  function dispose() {
    if (disposed) return;
    playing = false;
    stopFrame();
    disposed = true;
  }

  return {
    play,
    pause,
    seek,
    replay,
    setTotalLength,
    dispose,
    get progress() {
      return progress;
    },
    get playing() {
      return playing;
    },
    get duration() {
      return duration;
    },
    get pendingFrame() {
      return frame !== 0;
    },
  };
}

/**
 * Live reduced-motion / Save-Data / visibility signals for playback, with the
 * same `allowed` rule as js/fx/motion-policy.js. The map chunk keeps its own
 * copy because importing the shared policy splits it into a new deployed file
 * and the file-count budget has no headroom (plan §0.4). Returns unsubscribe.
 */
export function watchPlaybackMotion(listener, { window: win = globalThis, document: doc } = {}) {
  const d = doc || win?.document || null;
  const query =
    typeof win?.matchMedia === 'function'
      ? win.matchMedia('(prefers-reduced-motion: reduce)')
      : null;
  const read = () => {
    const reducedMotion = query?.matches === true;
    const saveData = win?.navigator?.connection?.saveData === true;
    const hidden = d?.visibilityState === 'hidden';
    return { reducedMotion, saveData, hidden, allowed: !reducedMotion && !saveData && !hidden };
  };
  const emit = () => {
    try {
      listener(read());
    } catch {
      /* a failing listener never breaks the map */
    }
  };
  query?.addEventListener?.('change', emit);
  d?.addEventListener?.('visibilitychange', emit);
  emit();
  return () => {
    query?.removeEventListener?.('change', emit);
    d?.removeEventListener?.('visibilitychange', emit);
  };
}
