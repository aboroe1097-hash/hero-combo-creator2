// Eden Pathing — pure planning logic, kept free of the DOM so it can be tested
// in Node: stop editing, leg routing through an injected router, the gate
// suggestion, step-list text, share codes and the stored plan library.
//
// A route is an ordered list of stops. The first stop is the start (A), the
// last is the destination (B) and everything between is a waypoint, so roles
// follow position and reordering needs no bookkeeping. Coordinates are Eden
// game tiles (0-1600 on both axes), the same space as the Eden Map datasets.

export const PATHING_WORLD_MAX = 1600;
export const PATHING_MAX_ROUTES = 8;
export const PATHING_MAX_STOPS = 16;
export const PATHING_MAX_PLANS = 24;
export const PATHING_COLOR_COUNT = 6;
export const PATHING_NAME_MAX = 48;
export const PATHING_SHARE_VERSION = 1;
// The share code is part of a URL; anything longer than a full plan could be
// is rejected before it is decoded.
export const PATHING_SHARE_MAX_LENGTH = 6000;
// Pathers are assigned in blocks of this many tiles. This is an estimate on a
// stated assumption, not a game constant: leadership assigns pathers by hand
// today, so the figure is shown with the assumption beside it rather than
// asserted as fact.
export const DEFAULT_TILES_PER_PATHER = 40;

const KIND_CODES = Object.freeze(['point', 'structure', 'pass']);
export const STOP_KINDS = KIND_CODES;

function clampTile(value) {
  const number = Math.round(Number(value));
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(PATHING_WORLD_MAX, number));
}

function cleanName(value) {
  // Names are plain one-line labels: drop control characters.
  return [...String(value ?? '')]
    .filter((char) => char.charCodeAt(0) > 31 && char.charCodeAt(0) !== 127)
    .join('')
    .trim()
    .slice(0, PATHING_NAME_MAX);
}

export function createStop(x, y, kind = 'point', type = '') {
  const stop = {
    x: clampTile(x),
    y: clampTile(y),
    kind: KIND_CODES.includes(kind) ? kind : 'point',
  };
  if (stop.kind === 'structure' && type) stop.type = String(type).slice(0, 8);
  return stop;
}

export function createRoute(name = '', color = 0) {
  return { name: cleanName(name), color: normalizeColor(color), stops: [] };
}

export function createPlan(name = '') {
  return { name: cleanName(name), routes: [createRoute('', 0)], active: 0 };
}

function normalizeColor(color) {
  const number = Number(color);
  return Number.isInteger(number) && number >= 0 && number < PATHING_COLOR_COUNT ? number : 0;
}

/** The colour a newly added route gets: the first one no route uses yet. */
export function nextRouteColor(routes = []) {
  const used = new Set(routes.map((route) => route.color));
  for (let color = 0; color < PATHING_COLOR_COUNT; color += 1) {
    if (!used.has(color)) return color;
  }
  return routes.length % PATHING_COLOR_COUNT;
}

export function stopRole(index, count) {
  if (index === 0) return 'start';
  if (count > 1 && index === count - 1) return 'end';
  return 'waypoint';
}

function withStops(route, stops) {
  return { ...route, stops: stops.slice(0, PATHING_MAX_STOPS) };
}

export function setStart(route, stop) {
  const stops = [...route.stops];
  if (stops.length) stops[0] = stop;
  else stops.push(stop);
  return withStops(route, stops);
}

export function setEnd(route, stop) {
  const stops = [...route.stops];
  if (stops.length >= 2) stops[stops.length - 1] = stop;
  else stops.push(stop);
  return withStops(route, stops);
}

/** Waypoints go before the destination; until there is one they fill A, then B. */
export function addWaypoint(route, stop) {
  if (route.stops.length >= PATHING_MAX_STOPS) return route;
  const stops = [...route.stops];
  if (stops.length >= 2) stops.splice(stops.length - 1, 0, stop);
  else stops.push(stop);
  return withStops(route, stops);
}

export function insertStop(route, index, stop) {
  if (route.stops.length >= PATHING_MAX_STOPS) return route;
  const stops = [...route.stops];
  const at = Math.max(0, Math.min(stops.length, index));
  stops.splice(at, 0, stop);
  return withStops(route, stops);
}

export function moveStop(route, index, delta) {
  const target = index + delta;
  if (index < 0 || index >= route.stops.length) return route;
  if (target < 0 || target >= route.stops.length) return route;
  const stops = [...route.stops];
  [stops[index], stops[target]] = [stops[target], stops[index]];
  return withStops(route, stops);
}

export function removeStop(route, index) {
  if (index < 0 || index >= route.stops.length) return route;
  return withStops(
    route,
    route.stops.filter((_, i) => i !== index)
  );
}

export function pathLength(path = []) {
  let total = 0;
  for (let i = 1; i < path.length; i += 1) {
    total += Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y);
  }
  return total;
}

/**
 * Every tile an integer step between two grid points passes through, both ends
 * included. A routed leg is already a chain of adjacent tiles, but the straight
 * fallback for a pending leg and the join back from a stop that sat on a
 * mountain are not, so every consecutive pair is walked through here before it
 * is counted.
 */
export function rasterizeStep(a, b) {
  const x1 = clampTile(a.x);
  const y1 = clampTile(a.y);
  const x2 = clampTile(b.x);
  const y2 = clampTile(b.y);
  const dx = Math.abs(x2 - x1);
  const dy = Math.abs(y2 - y1);
  const stepX = x1 < x2 ? 1 : x1 > x2 ? -1 : 0;
  const stepY = y1 < y2 ? 1 : y1 > y2 ? -1 : 0;
  const tiles = [];
  let x = x1;
  let y = y1;
  let error = dx - dy;
  for (;;) {
    tiles.push({ x, y });
    if (x === x2 && y === y2) break;
    const doubled = error * 2;
    if (doubled > -dy) {
      error -= dy;
      x += stepX;
    }
    if (doubled < dx) {
      error += dx;
      y += stepY;
    }
  }
  return tiles;
}

/** How many pathers a tile count needs at the stated capacity. */
export function estimatePathers(tiles, tilesPerPather = DEFAULT_TILES_PER_PATHER) {
  const capacity = Math.max(1, Math.round(Number(tilesPerPather) || DEFAULT_TILES_PER_PATHER));
  const count = Math.max(0, Math.round(Number(tiles) || 0));
  return count === 0 ? 0 : Math.ceil(count / capacity);
}

export function legKey(a, b) {
  return `${a.x},${a.y}>${b.x},${b.y}`;
}

/**
 * Wraps the Eden Map's terrain A* (findRoute) for pathing. A stop placed on
 * impassable terrain (a structure drawn on a mountain edge, say) would make
 * findRoute give up and return a straight line, so the leg is routed from the
 * nearest passable tile instead and joined back to the real stop. Results are
 * cached per leg because the grid search is the expensive part of a redraw.
 */
export function createTerrainRouter({ findRoute, isImpassable = () => false, cacheSize = 400 }) {
  const cache = new Map();

  function passableNear(point) {
    if (!isImpassable(point.x, point.y)) return point;
    for (let radius = 10; radius <= 120; radius += 10) {
      const steps = Math.max(8, Math.round(radius / 2));
      for (let i = 0; i < steps; i += 1) {
        const angle = (i / steps) * Math.PI * 2;
        const x = clampTile(point.x + Math.cos(angle) * radius);
        const y = clampTile(point.y + Math.sin(angle) * radius);
        if (!isImpassable(x, y)) return { x, y };
      }
    }
    return point;
  }

  function compute(a, b) {
    const from = passableNear(a);
    const to = passableNear(b);
    const result = findRoute(from.x, from.y, to.x, to.y) || {};
    const path = Array.isArray(result.path) && result.path.length ? [...result.path] : [from, to];
    if (from !== a) path.unshift({ x: a.x, y: a.y });
    if (to !== b) path.push({ x: b.x, y: b.y });
    return { path, blocked: Boolean(result.blocked) };
  }

  function route(a, b) {
    const key = legKey(a, b);
    if (cache.has(key)) return cache.get(key);
    const leg = compute(a, b);
    cache.set(key, leg);
    if (cache.size > cacheSize) cache.delete(cache.keys().next().value);
    return leg;
  }
  route.has = (a, b) => cache.has(legKey(a, b));
  return route;
}

/**
 * Routes each consecutive pair of stops. `router(a, b)` returns { path, blocked };
 * `canRoute(a, b)` (optional) says whether that leg may be computed now — a leg
 * that may not is drawn straight and flagged pending, so a caller can spread
 * the expensive searches over several frames.
 */
export function buildRouteLegs(stops = [], router, canRoute = () => true) {
  const legs = [];
  // Tiles are counted on the grid the members actually walk, and each tile is
  // counted once: consecutive legs share their junction, and a route that
  // crosses itself or doubles back does not occupy the same ground twice.
  const occupied = new Set();
  let walkedTiles = 0;
  let blocked = false;
  let pending = false;
  for (let i = 0; i < stops.length - 1; i += 1) {
    const from = stops[i];
    const to = stops[i + 1];
    let leg;
    if (canRoute(from, to)) {
      const result = router(from, to);
      leg = { from, to, path: result.path, blocked: Boolean(result.blocked), pending: false };
    } else {
      leg = { from, to, path: [from, to], blocked: false, pending: true };
      pending = true;
    }

    const walked = [];
    for (let p = 1; p < leg.path.length; p += 1) {
      const step = rasterizeStep(leg.path[p - 1], leg.path[p]);
      // The first point of the next step is the last point of this one.
      for (let t = p === 1 ? 0 : 1; t < step.length; t += 1) walked.push(step[t]);
    }
    if (!walked.length) walked.push(rasterizeStep(leg.path[0], leg.path[0])[0]);

    let newTiles = 0;
    for (const tile of walked) {
      const key = `${tile.x},${tile.y}`;
      if (!occupied.has(key)) {
        occupied.add(key);
        newTiles += 1;
      }
    }

    leg.tiles = walked.length;
    leg.newTiles = newTiles;
    walkedTiles += walked.length;
    blocked = blocked || leg.blocked;
    legs.push(leg);
  }
  const tiles = occupied.size;
  return {
    legs,
    // Tiles the route occupies — the number a pather plan is built from.
    tiles,
    // Tiles walked in total, so the difference is ground covered twice.
    walkedTiles,
    overlapTiles: Math.max(0, walkedTiles - tiles),
    pathers: estimatePathers(tiles),
    tilesPerPather: DEFAULT_TILES_PER_PATHER,
    blocked,
    pending,
  };
}

/**
 * The gate that adds the least straight-line detour to any leg of the route,
 * and where it would go. This is how the planner "prefers gates": it never
 * reroutes silently, it proposes the gate and the member decides.
 */
export function suggestGate(stops = [], gates = []) {
  if (stops.length < 2 || !gates.length) return null;
  const used = new Set(stops.map((stop) => `${stop.x},${stop.y}`));
  let best = null;
  for (let i = 0; i < stops.length - 1; i += 1) {
    const a = stops[i];
    const b = stops[i + 1];
    const direct = Math.hypot(b.x - a.x, b.y - a.y);
    for (const gate of gates) {
      if (used.has(`${gate.x},${gate.y}`)) continue;
      const detour =
        Math.hypot(gate.x - a.x, gate.y - a.y) + Math.hypot(b.x - gate.x, b.y - gate.y) - direct;
      if (!best || detour < best.detour) best = { gate, index: i + 1, detour };
    }
  }
  return best;
}

function coords(stop) {
  return `${stop.x}:${stop.y}`;
}

/**
 * Display text for each stop and the whole route. `structureLabel(type)` gives
 * the localized structure name; `text(key, vars)` gives the pathing copy.
 */
export function formatSteps(stops = [], legs = [], { structureLabel = (type) => type, text }) {
  let passes = 0;
  let waypoints = 0;
  const items = stops.map((stop, index) => {
    const role = stopRole(index, stops.length);
    let name;
    if (stop.kind === 'structure') name = structureLabel(stop.type || '');
    else if (stop.kind === 'pass') {
      passes += 1;
      name = text('pathingPassName', { n: passes });
    } else name = text('pathingPointName', { coords: coords(stop) });
    let badge;
    if (role === 'start') badge = 'A';
    else if (role === 'end') badge = 'B';
    else {
      waypoints += 1;
      badge = String(waypoints);
    }
    const label = stop.kind === 'point' ? name : `${name} (${coords(stop)})`;
    const leg = index > 0 ? legs[index - 1] : null;
    return {
      role,
      badge,
      name,
      label,
      legTiles: leg ? leg.tiles : null,
      legBlocked: leg ? Boolean(leg.blocked) : false,
    };
  });
  const line = items
    .map((item) => (item.role === 'waypoint' ? item.name : `${item.badge} · ${item.name}`))
    .join(' → ');
  // Match the route-level summary: shared or revisited ground counts once.
  const tiles = legs.reduce((sum, leg) => sum + (leg.newTiles ?? leg.tiles ?? 0), 0);
  return { items, line, tiles };
}

// ---------------------------------------------------------------------------
// Share codes: base64url of a compact JSON array.
//   [version, planName, [[routeName, colorIndex, [[x, y, kindCode], ...]], ...]]
// Structures are carried by their coordinates and resolved against the
// visitor's dataset on load, so a code stays short and never carries ids.

function toBase64Url(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(code) {
  const base64 = code.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}

export function encodePlanShare(plan) {
  const routes = (plan?.routes || []).slice(0, PATHING_MAX_ROUTES).map((route) => [
    cleanName(route.name),
    normalizeColor(route.color),
    (route.stops || [])
      .slice(0, PATHING_MAX_STOPS)
      .map((stop) => [clampTile(stop.x), clampTile(stop.y), Math.max(0, KIND_CODES.indexOf(stop.kind))]),
  ]);
  return toBase64Url(JSON.stringify([PATHING_SHARE_VERSION, cleanName(plan?.name), routes]));
}

function isTile(value) {
  return Number.isInteger(value) && value >= 0 && value <= PATHING_WORLD_MAX;
}

function isShortString(value) {
  return typeof value === 'string' && value.length <= PATHING_NAME_MAX;
}

/**
 * Decodes and validates a share code. Anything malformed returns null rather
 * than a partial plan. `resolveStructure(x, y)` maps a structure stop back to
 * its type; one that no longer exists in the dataset becomes a plain point.
 */
export function decodePlanShare(code, { resolveStructure = () => null } = {}) {
  if (typeof code !== 'string' || !code || code.length > PATHING_SHARE_MAX_LENGTH) return null;
  if (!/^[A-Za-z0-9_-]+$/.test(code)) return null;
  let data;
  try {
    data = JSON.parse(fromBase64Url(code));
  } catch {
    return null;
  }
  if (!Array.isArray(data) || data.length !== 3) return null;
  const [version, name, routes] = data;
  if (version !== PATHING_SHARE_VERSION || !isShortString(name)) return null;
  if (!Array.isArray(routes) || !routes.length || routes.length > PATHING_MAX_ROUTES) return null;
  const plan = { name: cleanName(name), routes: [], active: 0 };
  for (const entry of routes) {
    if (!Array.isArray(entry) || entry.length !== 3) return null;
    const [routeName, color, stops] = entry;
    if (!isShortString(routeName)) return null;
    if (!Number.isInteger(color) || color < 0 || color >= PATHING_COLOR_COUNT) return null;
    if (!Array.isArray(stops) || stops.length > PATHING_MAX_STOPS) return null;
    const route = createRoute(routeName, color);
    for (const stop of stops) {
      if (!Array.isArray(stop) || stop.length !== 3) return null;
      const [x, y, kindCode] = stop;
      if (!isTile(x) || !isTile(y)) return null;
      if (!Number.isInteger(kindCode) || kindCode < 0 || kindCode >= KIND_CODES.length) return null;
      const kind = KIND_CODES[kindCode];
      if (kind === 'structure') {
        const type = resolveStructure(x, y);
        route.stops.push(type ? createStop(x, y, 'structure', type) : createStop(x, y, 'point'));
      } else route.stops.push(createStop(x, y, kind));
    }
    plan.routes.push(route);
  }
  return plan;
}

// ---------------------------------------------------------------------------
// Stored plan library (localStorage JSON). Normalizing on read means a stale
// or hand-edited value can never crash the tool; it just loses bad entries.

function normalizeStoredStop(stop) {
  if (!stop || typeof stop !== 'object') return null;
  if (!Number.isFinite(Number(stop.x)) || !Number.isFinite(Number(stop.y))) return null;
  return createStop(stop.x, stop.y, stop.kind, stop.type);
}

export function normalizePlan(raw) {
  if (!raw || typeof raw !== 'object') return createPlan();
  const routes = (Array.isArray(raw.routes) ? raw.routes : [])
    .slice(0, PATHING_MAX_ROUTES)
    .filter((route) => route && typeof route === 'object')
    .map((route) => ({
      name: cleanName(route.name),
      color: normalizeColor(route.color),
      stops: (Array.isArray(route.stops) ? route.stops : [])
        .map(normalizeStoredStop)
        .filter(Boolean)
        .slice(0, PATHING_MAX_STOPS),
    }));
  if (!routes.length) routes.push(createRoute('', 0));
  const active = Number.isInteger(raw.active) && raw.active < routes.length ? raw.active : 0;
  return { name: cleanName(raw.name), routes, active: Math.max(0, active) };
}

export function normalizeLibrary(raw) {
  const plans = {};
  const source = raw && typeof raw === 'object' && raw.plans && typeof raw.plans === 'object';
  if (source) {
    for (const [id, plan] of Object.entries(raw.plans).slice(0, PATHING_MAX_PLANS)) {
      if (!/^[a-z0-9-]{1,24}$/.test(id)) continue;
      plans[id] = normalizePlan(plan);
    }
  }
  if (!Object.keys(plans).length) plans.p1 = createPlan();
  const activeId = source && plans[raw.activeId] ? raw.activeId : Object.keys(plans)[0];
  return { v: 1, activeId, plans };
}

export function newPlanId(library) {
  let n = Object.keys(library.plans).length + 1;
  while (library.plans[`p${n}`]) n += 1;
  return `p${n}`;
}
