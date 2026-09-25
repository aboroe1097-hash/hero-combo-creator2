import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  PATHING_MAX_STOPS,
  addWaypoint,
  buildRouteLegs,
  createPlan,
  createRoute,
  createStop,
  createTerrainRouter,
  decodePlanShare,
  encodePlanShare,
  estimatePathers,
  formatSteps,
  moveStop,
  nextRouteColor,
  normalizeLibrary,
  rasterizeStep,
  removeStop,
  setEnd,
  setStart,
  stopRole,
  suggestGate,
} from '../../js/eden-pathing-model.js';
import { findRoute, getTerrainAt } from '../../js/eden-map-terrain.js';
import {
  EDEN_MAP_LOCALES,
  auditEdenMapLocale,
  edenMapText,
  loadEdenMapLocale,
} from '../../js/i18n/eden-map/index.js';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

// A straight-line router: legs are two points, and a leg into x=999 is "blocked".
const straight = (a, b) => ({ path: [a, b], blocked: b.x === 999 });

const EN_T = (key, vars = {}) => edenMapText(key, vars, 'en');

test('stops take their role from position: A first, B last, waypoints between', () => {
  let route = createRoute('Team 1', 0);
  route = setStart(route, createStop(100, 100));
  assert.equal(route.stops.length, 1);
  route = setEnd(route, createStop(500, 500));
  route = addWaypoint(route, createStop(200, 200, 'pass'));
  route = addWaypoint(route, createStop(300, 300, 'structure', 'CP3'));
  assert.deepEqual(
    route.stops.map((s) => [s.x, s.kind]),
    [
      [100, 'point'],
      [200, 'pass'],
      [300, 'structure'],
      [500, 'point'],
    ]
  );
  assert.deepEqual(
    route.stops.map((_, i) => stopRole(i, route.stops.length)),
    ['start', 'waypoint', 'waypoint', 'end']
  );
  // Replacing A or B keeps the waypoints.
  route = setStart(route, createStop(110, 110));
  route = setEnd(route, createStop(510, 510));
  assert.deepEqual(
    route.stops.map((s) => s.x),
    [110, 200, 300, 510]
  );
});

test('reordering and removing waypoints never mutates the original route', () => {
  const route = {
    ...createRoute(),
    stops: [createStop(1, 1), createStop(2, 2), createStop(3, 3), createStop(4, 4)],
  };
  const moved = moveStop(route, 1, 1);
  assert.deepEqual(
    moved.stops.map((s) => s.x),
    [1, 3, 2, 4]
  );
  assert.deepEqual(
    route.stops.map((s) => s.x),
    [1, 2, 3, 4]
  );
  assert.equal(moveStop(route, 0, -1), route, 'moving past the start is a no-op');
  assert.equal(moveStop(route, 3, 1), route, 'moving past the end is a no-op');
  assert.deepEqual(
    removeStop(route, 2).stops.map((s) => s.x),
    [1, 2, 4]
  );
  let full = route;
  for (let i = 0; i < PATHING_MAX_STOPS + 4; i += 1) full = addWaypoint(full, createStop(i, i));
  assert.equal(full.stops.length, PATHING_MAX_STOPS);
});

test('coordinates are clamped to the Eden tile range', () => {
  assert.deepEqual(createStop(-40, 1900.6), { x: 0, y: 1600, kind: 'point' });
  assert.equal(createStop(5, 5, 'bogus').kind, 'point');
});

test('route legs are built from each consecutive pair of stops', () => {
  const stops = [createStop(0, 0), createStop(30, 40), createStop(30, 100)];
  const built = buildRouteLegs(stops, straight);
  assert.equal(built.legs.length, 2);
  // max(dx, dy) + 1 tiles per leg: 30x40 takes 41 steps, 0x60 takes 61.
  assert.deepEqual(
    built.legs.map((leg) => leg.tiles),
    [41, 61]
  );
  // The second leg starts on the first leg's last tile, which is counted once.
  assert.equal(built.walkedTiles, 102);
  assert.equal(built.tiles, 101);
  assert.equal(built.overlapTiles, 1);
  assert.equal(built.blocked, false);
  assert.equal(built.pending, false);

  const blocked = buildRouteLegs([createStop(0, 0), { x: 999, y: 0, kind: 'point' }], straight);
  assert.equal(blocked.blocked, true);

  // A leg the caller may not route yet is drawn straight and flagged pending.
  const deferred = buildRouteLegs(stops, straight, (a) => a.x === 0);
  assert.equal(deferred.pending, true);
  assert.deepEqual(
    deferred.legs.map((leg) => leg.pending),
    [false, true]
  );
  assert.deepEqual(buildRouteLegs([createStop(1, 1)], straight).legs, []);
});

test('the terrain router detours around impassable mountains and caches legs', () => {
  let calls = 0;
  const router = createTerrainRouter({
    findRoute: (...args) => {
      calls += 1;
      return findRoute(...args);
    },
    isImpassable: (x, y) => getTerrainAt(x, y) === 'mountain',
  });
  // (700, 480) sits inside the central mountain polygon of the Eden terrain.
  assert.equal(getTerrainAt(700, 480), 'mountain');
  const a = createStop(520, 480);
  const b = createStop(880, 480);
  const leg = router(a, b);
  assert.equal(leg.blocked, false);
  assert.ok(
    leg.path.every((p) => getTerrainAt(p.x, p.y) !== 'mountain'),
    'no routed point lies on a mountain'
  );
  assert.ok(leg.path.length > 2, 'the path bends around the range');
  router(a, b);
  assert.equal(calls, 1, 'a repeated leg is served from the cache');
  assert.equal(router.has(a, b), true);

  // A stop placed on a mountain is routed from the nearest passable tile and
  // joined back to the real stop instead of failing as a straight line.
  const onMountain = createStop(700, 480);
  const fromMountain = router(onMountain, createStop(700, 700));
  assert.equal(fromMountain.blocked, false);
  assert.deepEqual(fromMountain.path[0], { x: 700, y: 480 });
});

test('the gate suggestion picks the smallest detour and skips gates already used', () => {
  const stops = [createStop(0, 0), createStop(100, 0)];
  const gates = [
    { x: 50, y: 40, type: 'CP1' },
    { x: 50, y: 5, type: 'CP3' },
    { x: 400, y: 400, type: 'CP5' },
  ];
  const pick = suggestGate(stops, gates);
  assert.equal(pick.gate.type, 'CP3');
  assert.equal(pick.index, 1);
  const withGate = [stops[0], createStop(50, 5, 'structure', 'CP3'), stops[1]];
  assert.equal(suggestGate(withGate, gates).gate.type, 'CP1');
  assert.equal(suggestGate([createStop(0, 0)], gates), null);
  assert.equal(suggestGate(stops, []), null);
});

test('tiles are counted once and pathers are estimated from the occupied count', () => {
  // Doubling back over the same ground occupies it once, even though every tile
  // on the way back is walked a second time.
  const doubled = buildRouteLegs([createStop(0, 0), createStop(10, 0), createStop(0, 0)], straight);
  assert.equal(doubled.walkedTiles, 22);
  assert.equal(doubled.tiles, 11);
  assert.equal(doubled.overlapTiles, 11);
  assert.equal(doubled.pathers, 1);

  // The estimate is a ceiling on blocks of PATHING tiles per pather.
  const atCapacity = buildRouteLegs([createStop(0, 0), createStop(39, 0)], straight);
  assert.equal(atCapacity.tiles, 40);
  assert.equal(atCapacity.pathers, 1);
  const overCapacity = buildRouteLegs([createStop(0, 0), createStop(40, 0)], straight);
  assert.equal(overCapacity.tiles, 41);
  assert.equal(overCapacity.pathers, 2);
  assert.equal(overCapacity.tilesPerPather, 40);

  // A diagonal step and a side-by-side step both cost one tile.
  const diagonal = rasterizeStep({ x: 752, y: 817 }, { x: 758, y: 823 });
  assert.equal(diagonal.length, 7);
  assert.deepEqual(diagonal[1], { x: 753, y: 818 });
  assert.deepEqual(diagonal.at(-1), { x: 758, y: 823 });

  assert.equal(estimatePathers(0), 0);
  assert.equal(estimatePathers(81), 3);
  assert.equal(estimatePathers(100, 50), 2);
});

test('the step list reads A → gate → mountain pass → B with per-leg tiles', () => {
  const stops = [
    createStop(100, 100),
    createStop(787, 716, 'structure', 'CP3'),
    createStop(300, 900, 'pass'),
    createStop(305, 905, 'pass'),
    createStop(800, 800, 'structure', 'WC8'),
  ];
  const built = buildRouteLegs(stops, straight);
  const { legs } = built;
  const steps = formatSteps(stops, legs, {
    structureLabel: (type) => ({ CP3: 'Gate Lv3', WC8: 'Wonder Capital Lv8' })[type],
    text: EN_T,
  });
  assert.equal(
    steps.line,
    'A · Point 100:100 → Gate Lv3 → Mountain pass 1 → Mountain pass 2 → B · Wonder Capital Lv8'
  );
  assert.deepEqual(
    steps.items.map((item) => item.badge),
    ['A', '1', '2', '3', 'B']
  );
  assert.equal(steps.items[1].label, 'Gate Lv3 (787:716)');
  assert.equal(steps.items[0].legTiles, null);
  assert.equal(steps.items[1].legTiles, legs[0].tiles);
  assert.equal(steps.tiles, built.tiles);
  assert.equal(
    steps.tiles,
    legs.reduce((sum, leg) => sum + leg.newTiles, 0)
  );
  // Each row shows the tiles its leg adds, so the rows add up to the total.
  assert.equal(
    steps.items.reduce((sum, item) => sum + (item.legTiles ?? 0), 0),
    built.tiles
  );
  assert.equal(steps.items[1].legWalked, legs[0].tiles);
});

test('a leg that walks back over counted ground shows 0 new tiles and its walked length', () => {
  const stops = [createStop(0, 0), createStop(10, 0), createStop(0, 0)];
  const built = buildRouteLegs(stops, straight);
  const steps = formatSteps(stops, built.legs, { text: EN_T });
  assert.deepEqual(
    steps.items.map((item) => [item.legTiles, item.legWalked]),
    [
      [null, null],
      [11, 11],
      [0, 11],
    ]
  );
  assert.equal(
    steps.items.reduce((sum, item) => sum + (item.legTiles ?? 0), 0),
    built.tiles
  );
  assert.equal(EN_T('pathingLegTilesWalked', { tiles: 0, walked: 11 }), 'Tiles ≈ 0 (11 walked)');
  // The counts read the same at one as at many: the label carries the noun.
  assert.equal(EN_T('pathingLegTiles', { tiles: 1 }), 'Tiles ≈ 1');
  assert.equal(EN_T('pathingTotalTiles', { tiles: 1 }), 'Total tiles ≈ 1');
  // 40 tiles a pather is the officers' confirmed rule, stated as one.
  assert.equal(EN_T('pathingPathers', { count: 1, each: 40 }), 'Pathers: 1 (40 tiles each)');
  assert.equal(EN_T('pathingPathers', { count: 3, each: 40 }), 'Pathers: 3 (40 tiles each)');
});

test('a router that returns no path falls back to the straight line', () => {
  const from = createStop(0, 0);
  const to = createStop(5, 0);
  for (const router of [() => ({ path: [] }), () => ({}), () => undefined]) {
    let built;
    assert.doesNotThrow(() => {
      built = buildRouteLegs([from, to], router);
    });
    assert.deepEqual(built.legs[0].path, [from, to]);
    assert.equal(built.legs[0].tiles, 6);
    assert.equal(built.tiles, 6);
    assert.equal(built.legs[0].blocked, false);
  }
});

test('share codes round-trip and resolve structures against the dataset', () => {
  const plan = createPlan('North push');
  plan.routes[0] = {
    name: 'Team Ω',
    color: 1,
    stops: [
      createStop(100, 120),
      createStop(787, 716, 'structure', 'CP3'),
      createStop(640, 480, 'pass'),
      createStop(800, 800, 'structure', 'WC8'),
    ],
  };
  plan.routes.push({ name: '', color: nextRouteColor(plan.routes), stops: [createStop(5, 6)] });
  const code = encodePlanShare(plan);
  assert.match(code, /^[A-Za-z0-9_-]+$/);
  const types = new Map([
    ['787,716', 'CP3'],
    ['800,800', 'WC8'],
  ]);
  const decoded = decodePlanShare(code, { resolveStructure: (x, y) => types.get(`${x},${y}`) });
  assert.deepEqual(decoded, { ...plan, active: 0 });

  // A structure missing from the visitor's dataset degrades to a plain point.
  const orphan = decodePlanShare(code, { resolveStructure: () => null });
  assert.equal(orphan.routes[0].stops[1].kind, 'point');
});

test('malformed share codes are rejected, never half-loaded', () => {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const good = [1, 'Plan', [['R', 0, [[1, 2, 0]]]]];
  assert.ok(decodePlanShare(encode(good)));
  const bad = [
    '',
    'not base64 !!',
    'x'.repeat(7000),
    encode('just a string'),
    encode([2, 'Plan', [['R', 0, []]]]),
    encode([1, 'Plan', []]),
    encode([1, 'P'.repeat(80), [['R', 0, []]]]),
    encode([1, 'Plan', [['R', 9, []]]]),
    encode([1, 'Plan', [['R', 0, [[1, 2]]]]]),
    encode([1, 'Plan', [['R', 0, [[1, 2, 7]]]]]),
    encode([1, 'Plan', [['R', 0, [[-1, 2, 0]]]]]),
    encode([1, 'Plan', [['R', 0, [[1.5, 2, 0]]]]]),
    encode([1, 'Plan', [['R', 0, [[1, 2000, 0]]]]]),
    encode([1, 'Plan', [['R', 0, Array(40).fill([1, 1, 0])]]]),
    encode([1, 'Plan', Array(20).fill(['R', 0, []])]),
    encode([1, { name: 'x' }, [['R', 0, []]]]),
  ];
  for (const code of bad) assert.equal(decodePlanShare(code), null, code.slice(0, 40));
  assert.equal(decodePlanShare(null), null);
  assert.equal(decodePlanShare(encode(good).slice(0, -3) + '%%%'), null);
});

test('a stored library normalizes junk instead of throwing', () => {
  const fresh = normalizeLibrary(null);
  assert.equal(Object.keys(fresh.plans).length, 1);
  assert.equal(fresh.plans[fresh.activeId].routes.length, 1);
  const cleaned = normalizeLibrary({
    activeId: 'missing',
    plans: {
      p1: {
        name: 'Keep',
        routes: [{ name: 'A', color: 42, stops: [{ x: 'no' }, { x: 3, y: 4 }] }],
      },
      'BAD ID': { name: 'Drop' },
    },
  });
  assert.deepEqual(Object.keys(cleaned.plans), ['p1']);
  assert.equal(cleaned.activeId, 'p1');
  assert.equal(cleaned.plans.p1.routes[0].color, 0);
  assert.deepEqual(cleaned.plans.p1.routes[0].stops, [{ x: 3, y: 4, kind: 'point' }]);
});

test('every Eden Map locale pack carries the pathing copy with the same tokens', async () => {
  await Promise.all(EDEN_MAP_LOCALES.map((locale) => loadEdenMapLocale(locale)));
  for (const locale of EDEN_MAP_LOCALES) {
    assert.deepEqual(auditEdenMapLocale(locale), [], locale);
    assert.match(edenMapText('pathingPassName', { n: 2 }, locale), /2/, locale);
    assert.match(edenMapText('pathingTotalTiles', { tiles: 37 }, locale), /37/, locale);
    if (locale !== 'en') {
      assert.notEqual(
        edenMapText('pathingIntro', {}, locale),
        edenMapText('pathingIntro', {}, 'en'),
        locale
      );
    }
  }
});

test('Eden Pathing is a lazy, enabled Eden Hub sub-tool', () => {
  const hub = read('../../js/eden-hub.js');
  const html = read('../../tabs/eden-map.html');
  const ops = read('../../js/eden-operations.js');
  const app = read('../../js/eden-pathing.js');
  assert.match(hub, /'pathing'/);
  assert.match(hub, /import\('\.\/eden-pathing\.js'\)/);
  assert.match(html, /data-eden-subtab="pathing"/);
  assert.match(html, /data-eden-subtab-panel="pathing"/);
  assert.doesNotMatch(html, /vts-eden-subtab-btn--soon/);
  assert.match(ops, /href="#edenHub\?subtab=pathing"/);
  assert.doesNotMatch(ops, /is-soon/);
  assert.match(app, /import '\.\.\/css\/eden-pathing\.css'/);
  assert.doesNotMatch(app, /sourceCredits/);
  assert.match(app, /drawCanvasFooter/);
  // The route engine is the Eden Map's, not a copy.
  assert.match(app, /findRoute/);
  assert.doesNotMatch(app, /const MOUNTAINS\s*=/);
});
