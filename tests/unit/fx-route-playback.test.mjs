import assert from 'node:assert/strict';
import test from 'node:test';

import {
  clampProgress,
  createPlaybackClock,
  measureRoute,
  measureStops,
  playbackDurationMs,
  reachedStops,
  sliceRoute,
  watchPlaybackMotion,
} from '../../js/fx/route-playback.js';

const ROUTE = [
  { x: 0, y: 0 },
  { x: 3, y: 4 },
  { x: 3, y: 10 },
];

function fakeFrames() {
  let time = 0;
  let nextId = 1;
  const pending = new Map();
  return {
    now: () => time,
    requestFrame(cb) {
      const id = nextId++;
      pending.set(id, cb);
      return id;
    },
    cancelFrame(id) {
      pending.delete(id);
    },
    advance(ms) {
      time += ms;
      const callbacks = [...pending.values()];
      pending.clear();
      for (const cb of callbacks) cb(time);
    },
    get pending() {
      return pending.size;
    },
  };
}

test('measureRoute accumulates arc length and skips invalid points', () => {
  const measured = measureRoute([...ROUTE, { x: 'nope', y: 1 }, null]);
  assert.deepEqual(measured.cumulative, [0, 5, 11]);
  assert.equal(measured.total, 11);
  assert.equal(measured.points.length, 3);
  assert.equal(measureRoute(null).total, 0);
});

test('sliceRoute interpolates the head and never alters the original points', () => {
  const measured = measureRoute(ROUTE);
  assert.deepEqual(sliceRoute(measured, 0), [{ x: 0, y: 0 }]);
  const half = sliceRoute(measured, 2.5 / 11);
  assert.equal(half.length, 2);
  assert.ok(Math.abs(half[1].x - 1.5) < 1e-9);
  assert.ok(Math.abs(half[1].y - 2) < 1e-9);
  const past = sliceRoute(measured, 8 / 11);
  assert.equal(past.length, 3);
  assert.deepEqual(past[1], { x: 3, y: 4 });
  assert.ok(Math.abs(past[2].y - 7) < 1e-9);
  assert.deepEqual(sliceRoute(measured, 1), ROUTE);
  assert.deepEqual(ROUTE[1], { x: 3, y: 4 });
  assert.deepEqual(sliceRoute(measureRoute([]), 0.5), []);
});

test('stops map to arc positions along the routed path and count as reached', () => {
  const measured = measureRoute(ROUTE);
  const stops = measureStops(measured, [
    { x: 0, y: 0 },
    { x: 3, y: 4.2 },
    { x: 3, y: 10 },
  ]);
  assert.deepEqual(stops, [0, 5, 11]);
  assert.equal(reachedStops(stops, measured.total, 0), 1);
  assert.equal(reachedStops(stops, measured.total, 5 / 11), 2);
  assert.equal(reachedStops(stops, measured.total, 1), 3);
  // A stop never maps behind the previous one, even on a route that doubles back.
  const loop = measureRoute([
    { x: 0, y: 0 },
    { x: 4, y: 0 },
    { x: 0, y: 0 },
  ]);
  assert.deepEqual(
    measureStops(loop, [
      { x: 4, y: 0 },
      { x: 0, y: 0 },
    ]),
    [4, 8]
  );
  assert.deepEqual(measureStops(measured, null), []);
  assert.equal(reachedStops([], 10, 1), 0);
  assert.equal(clampProgress(-1), 0);
  assert.equal(clampProgress(Number.NaN), 0);
  assert.equal(clampProgress(4), 1);
});

test('playback duration is bounded pacing, not an ETA', () => {
  assert.equal(playbackDurationMs(0), 1500);
  assert.equal(playbackDurationMs(10), 1500);
  assert.equal(playbackDurationMs(400), 3200);
  assert.equal(playbackDurationMs(1e6), 6000);
});

test('clock requests frames only while playing and settles on completion', () => {
  const frames = fakeFrames();
  const ticks = [];
  const changes = [];
  const clock = createPlaybackClock({
    totalLength: 10,
    progress: 1,
    now: frames.now,
    requestFrame: frames.requestFrame,
    cancelFrame: frames.cancelFrame,
    onTick: (p) => ticks.push(p),
    onChange: (s) => changes.push(s.playing),
  });
  assert.equal(frames.pending, 0, 'idle clock holds no frame');
  assert.equal(clock.play(), true, 'play from the end restarts at 0');
  assert.equal(clock.progress, 0);
  assert.equal(frames.pending, 1);
  frames.advance(750);
  assert.ok(Math.abs(clock.progress - 0.5) < 1e-9);
  frames.advance(750);
  assert.equal(clock.progress, 1);
  assert.equal(clock.playing, false);
  assert.equal(frames.pending, 0, 'completion stops the frame loop');
  assert.deepEqual(changes, [true, false]);
  assert.equal(ticks.at(-1), 1);
});

test('pause, seek and resume never replay elapsed hidden time', () => {
  const frames = fakeFrames();
  const clock = createPlaybackClock({
    totalLength: 10,
    progress: 0,
    now: frames.now,
    requestFrame: frames.requestFrame,
    cancelFrame: frames.cancelFrame,
  });
  clock.play();
  frames.advance(300);
  clock.pause();
  assert.equal(frames.pending, 0);
  const paused = clock.progress;
  frames.advance(60_000);
  assert.equal(clock.progress, paused);
  clock.play();
  frames.advance(150);
  assert.ok(Math.abs(clock.progress - (paused + 0.1)) < 1e-9);
  assert.equal(clock.seek(0.25), true, 'seek reports it interrupted playback');
  assert.equal(clock.playing, false);
  assert.equal(frames.pending, 0);
  clock.replay();
  assert.equal(clock.progress, 0);
  assert.equal(clock.playing, true);
  clock.dispose();
  assert.equal(frames.pending, 0);
  assert.equal(clock.play(), false, 'disposed clock stays idle');
});

test('playback motion signals follow reduced motion, Save-Data and visibility', () => {
  const mediaListeners = new Set();
  const docListeners = new Set();
  const query = {
    matches: false,
    addEventListener: (type, fn) => mediaListeners.add(fn),
    removeEventListener: (type, fn) => mediaListeners.delete(fn),
  };
  const doc = {
    visibilityState: 'visible',
    addEventListener: (type, fn) => docListeners.add(fn),
    removeEventListener: (type, fn) => docListeners.delete(fn),
  };
  const win = { matchMedia: () => query, navigator: { connection: { saveData: false } } };
  const seen = [];
  const stop = watchPlaybackMotion((state) => seen.push(state), { window: win, document: doc });
  assert.equal(seen.at(-1).allowed, true);
  query.matches = true;
  for (const fn of mediaListeners) fn();
  assert.equal(seen.at(-1).reducedMotion, true);
  assert.equal(seen.at(-1).allowed, false);
  query.matches = false;
  doc.visibilityState = 'hidden';
  for (const fn of docListeners) fn();
  assert.equal(seen.at(-1).hidden, true);
  assert.equal(seen.at(-1).allowed, false);
  win.navigator.connection.saveData = true;
  doc.visibilityState = 'visible';
  for (const fn of docListeners) fn();
  assert.equal(seen.at(-1).allowed, false);
  stop();
  assert.equal(mediaListeners.size + docListeners.size, 0, 'unsubscribe removes every listener');
});
