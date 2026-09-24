/**
 * Eden map route playback controls (16.5.x P2, plan §4.4).
 *
 * Mounted once per map. A small control bar appears only while a saved path
 * is selected; Play/Pause/Replay and a scrubber reveal that path along its
 * existing routed coordinates. Drawing stays with the map: this module only
 * asks for invalidation (scheduleDraw) while playing and exposes the current
 * prefix through frameFor(). Reduced motion, Save-Data, and hidden documents
 * never animate: the full static route shows, and the scrubber still works.
 */

import {
  createPlaybackClock,
  measureRoute,
  measureStops,
  reachedStops,
  watchPlaybackMotion,
} from './fx/route-playback.js';

const SCRUB_MAX = 1000;

export function createEdenRoutePlayback({ host, text, invalidate, formatNumber } = {}) {
  if (!host || typeof document === 'undefined') return null;
  const label = typeof text === 'function' ? text : (key) => key;
  const redraw = typeof invalidate === 'function' ? invalidate : () => {};
  const fmt = typeof formatNumber === 'function' ? formatNumber : (n) => String(n);

  const bar = document.createElement('div');
  bar.className = 'eden-route-playback hidden';
  bar.setAttribute('role', 'group');
  bar.innerHTML = `
    <button type="button" class="eden-route-playback__btn" data-route-playback="toggle" aria-pressed="false"><span aria-hidden="true" data-route-playback-icon>▶</span><span data-route-playback-label></span></button>
    <button type="button" class="eden-route-playback__btn" data-route-playback="replay"><span aria-hidden="true">↺</span><span data-route-playback-replay></span></button>
    <input type="range" class="eden-route-playback__scrub" data-route-playback="scrub" min="0" max="${SCRUB_MAX}" step="1" value="${SCRUB_MAX}">
    <output class="eden-route-playback__status" data-route-playback="status"></output>`;
  host.appendChild(bar);

  const toggleBtn = bar.querySelector('[data-route-playback="toggle"]');
  const replayBtn = bar.querySelector('[data-route-playback="replay"]');
  const scrub = bar.querySelector('[data-route-playback="scrub"]');
  const status = bar.querySelector('[data-route-playback="status"]');

  let key = null;
  let measured = measureRoute([]);
  let sourcePoints = null;
  let sourceStops = null;
  let stops = [];
  let distance = null;
  let motionAllowed = true;
  let reduced = false;

  const clock = createPlaybackClock({
    progress: 1,
    onTick(progress) {
      scrub.value = String(Math.round(progress * SCRUB_MAX));
      redraw();
    },
    onChange() {
      syncControls();
      redraw();
    },
  });

  function syncStatus() {
    const progress = clock.progress;
    const pct = Math.round(progress * 100);
    const reached = reachedStops(stops, measured.total, progress);
    const tiles = distance != null ? Math.round(Number(distance) * progress) : null;
    const valueText =
      tiles != null ? `${pct}% · ${fmt(tiles)} / ${fmt(Math.round(Number(distance)))}` : `${pct}%`;
    scrub.setAttribute('aria-valuetext', valueText);
    status.textContent = stops.length ? `${valueText} · ${reached}/${stops.length}` : valueText;
  }

  function syncControls() {
    const playing = clock.playing;
    toggleBtn.setAttribute('aria-pressed', playing ? 'true' : 'false');
    bar.querySelector('[data-route-playback-icon]').textContent = playing ? '❚❚' : '▶';
    bar.querySelector('[data-route-playback-label]').textContent = label(
      playing ? 'routePause' : 'routePlay'
    );
    // Reduced motion keeps manual scrubbing but offers no automatic playback.
    toggleBtn.hidden = reduced;
    replayBtn.hidden = reduced;
    toggleBtn.disabled = !motionAllowed && !playing;
    replayBtn.disabled = !motionAllowed;
    scrub.value = String(Math.round(clock.progress * SCRUB_MAX));
    bar.classList.toggle('is-playing', playing);
    syncStatus();
  }

  function relabel() {
    bar.setAttribute('aria-label', label('routePlayback'));
    scrub.setAttribute('aria-label', label('routeProgress'));
    bar.querySelector('[data-route-playback-replay]').textContent = label('routeReplay');
    syncControls();
  }

  const unsubscribe = watchPlaybackMotion((state) => {
    motionAllowed = state.allowed;
    reduced = state.reducedMotion;
    if (!state.allowed && clock.playing) {
      // Hidden tab, reduced motion, or Save-Data: settle on the full route.
      clock.seek(reduced ? 1 : clock.progress);
    }
    syncControls();
  });

  toggleBtn.addEventListener('click', () => {
    if (clock.playing) clock.pause();
    else if (motionAllowed) clock.play();
  });
  replayBtn.addEventListener('click', () => {
    if (motionAllowed) clock.replay();
  });
  scrub.addEventListener('input', () => {
    clock.seek(Number(scrub.value) / SCRUB_MAX);
  });
  // Keep map shortcuts (Delete, arrows) from firing while the controls have focus.
  bar.addEventListener('keydown', (event) => event.stopPropagation());
  bar.addEventListener('pointerdown', (event) => event.stopPropagation());

  relabel();

  /**
   * Show the bar for the selected path (or hide it with `nextKey` null).
   * Changing the selected path resets to the full static route.
   */
  function select(nextKey, points, routeDistance, waypoints) {
    if (nextKey == null || !Array.isArray(points) || points.length < 2) {
      if (key !== null) {
        key = null;
        sourcePoints = null;
        clock.seek(1);
      }
      bar.classList.add('hidden');
      return;
    }
    if (nextKey !== key) {
      key = nextKey;
      clock.seek(1);
    }
    if (points !== sourcePoints) {
      sourcePoints = points;
      measured = measureRoute(points);
      clock.setTotalLength(measured.total);
      sourceStops = null;
    }
    if (waypoints !== sourceStops) {
      sourceStops = waypoints;
      stops = measureStops(measured, waypoints);
    }
    distance = Number.isFinite(Number(routeDistance)) ? Number(routeDistance) : null;
    bar.classList.remove('hidden');
    syncStatus();
  }

  /** The partially revealed route for `pathKey`, or null when it should draw in full. */
  function frameFor(pathKey) {
    if (pathKey !== key || clock.progress >= 1) return null;
    return { measured, progress: clock.progress };
  }

  function dispose() {
    clock.dispose();
    unsubscribe();
    bar.remove();
  }

  return { select, frameFor, relabel, dispose, clock };
}
