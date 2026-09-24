// Eden Pathing — the Eden Hub route planner. Loaded only when its sub-tab opens.
//
// It reuses the Eden Map's data and machinery rather than copying it: structure
// coordinates come from the active Eden dataset (eden-map-data.js), legs are
// routed by the Eden Map's terrain A* (eden-map-terrain.js findRoute, which
// treats mountains as impassable), the map art is the same strategy floor, and
// all copy lives in the Eden Map locale packs. Pure planning logic is in
// eden-pathing-model.js.
import '../css/eden-pathing.css';
import {
  PATH_COLORS,
  STRUCTURE_TYPES,
  ensureEdenDatasetsLoaded,
  getSectorStructures,
  parseCoordInput,
} from './eden-map-data.js';
import {
  MOUNTAINS,
  drawTerrainLayer,
  findRoute,
  getTerrainAt,
} from './eden-map-terrain.js?v=20260708_101500';
import { getStrategyFloorImage, preloadStrategyFloor } from './eden-map-assets.js?v=20260708_101500';
import {
  edenMapText,
  getEdenPathColorDisplayLabel,
  getEdenSectorDisplayLabel,
  getEdenStructureDisplayLabel,
  loadEdenMapLocale,
} from './i18n/eden-map/index.js';
import { drawCanvasFooter, getExportBranding } from './export-branding.js';
import { formatLocaleNumber, resolveRuntimeLocale } from './locale-format.js';
import {
  PATHING_MAX_PLANS,
  PATHING_MAX_ROUTES,
  PATHING_MAX_STOPS,
  addWaypoint,
  buildRouteLegs,
  createPlan,
  createRoute,
  createStop,
  createTerrainRouter,
  decodePlanShare,
  encodePlanShare,
  formatSteps,
  insertStop,
  moveStop,
  newPlanId,
  nextRouteColor,
  normalizeLibrary,
  removeStop,
  setEnd,
  setStart,
  suggestGate,
} from './eden-pathing-model.js';

const STORAGE_KEY = 'vts_eden_pathing_v1';
const MIN_SCALE = 0.2;
const MAX_SCALE = 4;
const DRAG_THRESHOLD_PX = 6;
const ROUTE_BUDGET_MS = 40;

const router = createTerrainRouter({
  findRoute,
  isImpassable: (x, y) => getTerrainAt(x, y) === 'mountain',
});

let root = null;
let library = null;
let storageOk = true;
let mode = 'start';
let structures = [];
let gates = [];
let showImpassable = true;
let sheetOpen = false;
let searchQuery = '';
let view = { scale: 0.4, ox: 0, oy: 0, fitted: false };
let canvas = null;
let ctx = null;
let drawQueued = false;
let routingTimer = 0;
let hoverStructure = null;
let resizeObserver = null;
let focusOverride = null;
let pendingToast = null;

const locale = () => resolveRuntimeLocale();
const copy = (key, vars = {}) => edenMapText(key, vars, locale());
const num = (value) => formatLocaleNumber(value, locale());

function escapeHtml(value) {
  return String(value ?? '').replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]
  );
}

// ---------------------------------------------------------------------------
// State

function loadLibrary() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return normalizeLibrary(raw ? JSON.parse(raw) : null);
  } catch {
    storageOk = false;
    return normalizeLibrary(null);
  }
}

function saveLibrary() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(library));
    storageOk = true;
  } catch {
    storageOk = false;
  }
}

const plan = () => library.plans[library.activeId];
const activeRoute = () => plan().routes[plan().active] || plan().routes[0];

function updateActiveRoute(next) {
  const current = plan();
  current.routes[current.active] = next;
  commit();
}

function commit() {
  saveLibrary();
  renderControls();
  requestDraw();
}

function planName(id) {
  const entry = library.plans[id];
  if (entry?.name) return entry.name;
  return copy('pathingDefaultPlan', { n: Object.keys(library.plans).indexOf(id) + 1 });
}

function routeName(route, index) {
  return route.name || copy('pathingDefaultRoute', { n: index + 1 });
}

function routeColor(route) {
  return (PATH_COLORS[route.color] || PATH_COLORS[0]).color;
}

function structureLabel(type) {
  return getEdenStructureDisplayLabel(type, locale());
}

function refreshStructures() {
  try {
    structures = getSectorStructures('FULL').filter((s) => STRUCTURE_TYPES[s.type]);
  } catch {
    structures = [];
  }
  gates = structures.filter((s) => STRUCTURE_TYPES[s.type]?.category === 'gate');
}

function stopFromStructure(s) {
  return createStop(s.x, s.y, 'structure', s.type);
}

function resolveStructureType(x, y) {
  const match = structures.find((s) => s.x === x && s.y === y);
  return match ? match.type : null;
}

function routeState(route, canRoute) {
  const built = buildRouteLegs(route.stops, router, canRoute);
  const steps = formatSteps(route.stops, built.legs, { structureLabel, text: copy });
  return { ...built, steps };
}

// ---------------------------------------------------------------------------
// Placing stops

function placeStop(stop) {
  const route = activeRoute();
  if (route.stops.length >= PATHING_MAX_STOPS && mode === 'waypoint') return;
  let next;
  if (mode === 'start') next = setStart(route, stop);
  else if (mode === 'end') next = setEnd(route, stop);
  else next = addWaypoint(route, stop);
  // Guide the usual flow: A, then B, then waypoints in between.
  if (mode === 'start' && next.stops.length < 2) mode = 'end';
  else if (mode === 'start' || mode === 'end') mode = 'waypoint';
  const index = next.stops.indexOf(stop);
  const steps = formatSteps(next.stops, [], { structureLabel, text: copy });
  const item = steps.items[index];
  if (item) announce(copy('pathingStopAdded', { stop: `${item.badge} · ${item.label}` }));
  updateActiveRoute(next);
}

function placeAtWorld(x, y, snapped) {
  if (snapped) placeStop(stopFromStructure(snapped));
  else placeStop(createStop(x, y, mode === 'waypoint' ? 'pass' : 'point'));
}

// ---------------------------------------------------------------------------
// Canvas view

function iso(x, y) {
  return { x: (x - y) * 0.5 * view.scale + view.ox, y: (x + y) * 0.25 * view.scale + view.oy };
}

function screenToWorld(sx, sy) {
  const u = (sx - view.ox) / (0.5 * view.scale);
  const v = (sy - view.oy) / (0.25 * view.scale);
  return { x: (u + v) / 2, y: (v - u) / 2 };
}

function canvasSize() {
  const rect = canvas.getBoundingClientRect();
  return { width: rect.width, height: rect.height };
}

function fitView() {
  const { width, height } = canvasSize();
  if (!width || !height) return;
  // The strategy floor is drawn as a 1.6:1 image over the map diamond. A
  // portrait phone canvas would shrink the whole map to a sliver, so there the
  // fit crops the far east/west corners (pan or pinch to reach them).
  const portrait = height > width;
  const scale = Math.min(width / 1600, height / 1000) * (portrait ? 1.45 : 0.98);
  view = { scale, ox: width / 2, oy: height / 2 - 400 * scale, fitted: true };
  requestDraw();
}

function zoomAt(factor, sx, sy) {
  const scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, view.scale * factor));
  const ratio = scale / view.scale;
  view.ox = sx - (sx - view.ox) * ratio;
  view.oy = sy - (sy - view.oy) * ratio;
  view.scale = scale;
  requestDraw();
}

function resizeCanvas() {
  if (!canvas) return;
  const { width, height } = canvasSize();
  if (!width || !height) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const pw = Math.round(width * dpr);
  const ph = Math.round(height * dpr);
  if (canvas.width !== pw || canvas.height !== ph) {
    canvas.width = pw;
    canvas.height = ph;
  }
  if (!view.fitted) fitView();
  requestDraw();
}

function requestDraw() {
  if (drawQueued || !canvas) return;
  drawQueued = true;
  requestAnimationFrame(() => {
    drawQueued = false;
    drawMap();
  });
}

function isLight() {
  return document.documentElement.dataset.theme === 'light';
}

// Structures sit a few pixels apart when zoomed out, so the snap distance
// follows the zoom; a finger gets a little more room than a mouse.
function snapRadius(pointerType) {
  const base = Math.max(7, Math.min(14, 14 * view.scale));
  return pointerType === 'mouse' ? base : base + 6;
}

function nearestStructure(sx, sy, radius) {
  let best = null;
  let bestD = radius;
  for (const s of structures) {
    const p = iso(s.x, s.y);
    const d = Math.hypot(p.x - sx, p.y - sy);
    if (d < bestD) {
      best = s;
      bestD = d;
    }
  }
  return best;
}

// Shared by the live map and the PNG export: everything below the chrome.
function paintMap(target, project, scale) {
  target.save();
  // The strategy floor art does not cover every sector yet, so outline the
  // full 1600×1600 Eden square underneath it for context.
  const corners = [project(0, 0), project(1600, 0), project(1600, 1600), project(0, 1600)];
  target.beginPath();
  corners.forEach((p, i) => (i ? target.lineTo(p.x, p.y) : target.moveTo(p.x, p.y)));
  target.closePath();
  target.fillStyle = isLight() ? 'rgba(120, 100, 72, 0.16)' : 'rgba(221, 208, 180, 0.08)';
  target.fill();
  target.strokeStyle = isLight() ? 'rgba(120, 100, 72, 0.4)' : 'rgba(221, 208, 180, 0.28)';
  target.lineWidth = 1.5;
  target.stroke();
  const floor = getStrategyFloorImage();
  const floorReady = Boolean(floor?.complete && floor.naturalWidth);
  drawTerrainLayer(target, project, scale, {
    showStrategyFloor: floorReady,
    showTiles: false,
    showRivers: false,
    showMountains: false,
  });
  if (showImpassable) {
    MOUNTAINS.forEach((mountain) => {
      target.beginPath();
      mountain.polygon.forEach((pt, i) => {
        const p = project(pt.x, pt.y);
        if (i) target.lineTo(p.x, p.y);
        else target.moveTo(p.x, p.y);
      });
      target.closePath();
      target.fillStyle = 'rgba(127, 29, 29, 0.32)';
      target.fill();
      target.setLineDash([6, 4]);
      target.strokeStyle = 'rgba(254, 202, 202, 0.75)';
      target.lineWidth = 1.5;
      target.stroke();
      target.setLineDash([]);
    });
  }
  const dot = Math.max(2.2, Math.min(6, 7 * scale));
  for (const s of structures) {
    const meta = STRUCTURE_TYPES[s.type];
    const p = project(s.x, s.y);
    target.beginPath();
    if (meta.category === 'gate') {
      const r = dot * 1.25;
      target.moveTo(p.x, p.y - r);
      target.lineTo(p.x + r, p.y);
      target.lineTo(p.x, p.y + r);
      target.lineTo(p.x - r, p.y);
      target.closePath();
      target.fillStyle = meta.color;
      target.globalAlpha = 0.95;
    } else {
      target.arc(p.x, p.y, dot * 0.8, 0, Math.PI * 2);
      target.fillStyle = meta.color;
      target.globalAlpha = 0.6;
    }
    target.fill();
    target.globalAlpha = 1;
    target.strokeStyle = 'rgba(15, 23, 42, 0.85)';
    target.lineWidth = 1;
    target.stroke();
  }
  target.restore();
}

function drawArrow(target, a, b, color) {
  const angle = Math.atan2(b.y - a.y, b.x - a.x);
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  target.save();
  target.translate(mx, my);
  target.rotate(angle);
  target.beginPath();
  target.moveTo(6, 0);
  target.lineTo(-4, -5);
  target.lineTo(-4, 5);
  target.closePath();
  target.fillStyle = color;
  target.fill();
  target.restore();
}

function paintRoute(target, project, route, state, { active = true, lineScale = 1 } = {}) {
  const color = routeColor(route);
  target.save();
  target.lineCap = 'round';
  target.lineJoin = 'round';
  target.globalAlpha = active ? 1 : 0.72;
  for (const leg of state.legs) {
    const pts = leg.path.map((pt) => project(pt.x, pt.y));
    if (pts.length < 2) continue;
    const dashed = leg.blocked || leg.pending;
    for (const [width, stroke] of [
      [8 * lineScale, 'rgba(15, 23, 42, 0.8)'],
      [4.5 * lineScale, color],
    ]) {
      target.beginPath();
      pts.forEach((p, i) => (i ? target.lineTo(p.x, p.y) : target.moveTo(p.x, p.y)));
      target.setLineDash(dashed ? [10 * lineScale, 8 * lineScale] : []);
      target.strokeStyle = stroke;
      target.lineWidth = width;
      target.stroke();
    }
    target.setLineDash([]);
    // Direction arrows roughly every 90 screen pixels.
    let run = 0;
    for (let i = 1; i < pts.length; i += 1) {
      run += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
      if (run >= 90 * lineScale) {
        drawArrow(target, pts[i - 1], pts[i], '#f8fafc');
        run = 0;
      }
    }
  }
  state.steps.items.forEach((item, index) => {
    const stop = route.stops[index];
    const p = project(stop.x, stop.y);
    const r = (item.role === 'waypoint' ? 9 : 12) * lineScale;
    target.beginPath();
    target.arc(p.x, p.y, r, 0, Math.PI * 2);
    target.fillStyle = item.role === 'waypoint' ? '#0f172a' : color;
    target.fill();
    target.lineWidth = 2.5 * lineScale;
    target.strokeStyle = item.role === 'waypoint' ? color : '#f8fafc';
    target.stroke();
    target.fillStyle = '#f8fafc';
    target.font = `800 ${Math.round((item.role === 'waypoint' ? 10 : 12) * lineScale)}px Inter, system-ui, sans-serif`;
    target.textAlign = 'center';
    target.textBaseline = 'middle';
    target.fillText(item.badge, p.x, p.y + 0.5);
  });
  target.restore();
}

function drawMap() {
  if (!canvas || !ctx || !canvas.isConnected) return;
  const { width, height } = canvasSize();
  if (!width || !height) return;
  const dpr = canvas.width / width;
  const light = isLight();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = light ? '#efe7d6' : '#0b0906';
  ctx.fillRect(0, 0, width, height);
  paintMap(ctx, iso, view.scale);

  const started = performance.now();
  let pending = false;
  let routedNow = false;
  const canRoute = (a, b) => {
    if (router.has(a, b)) return true;
    if (performance.now() - started >= ROUTE_BUDGET_MS) return false;
    routedNow = true;
    return true;
  };
  const current = plan();
  const order = current.routes.map((_, i) => i).filter((i) => i !== current.active);
  order.push(current.active);
  for (const index of order) {
    const route = current.routes[index];
    if (!route?.stops.length) continue;
    const state = routeState(route, canRoute);
    pending = pending || state.pending;
    paintRoute(ctx, iso, route, state, { active: index === current.active });
  }

  if (hoverStructure) {
    const p = iso(hoverStructure.x, hoverStructure.y);
    const label = `${structureLabel(hoverStructure.type)} (${hoverStructure.x}:${hoverStructure.y})`;
    ctx.font = '700 12px Inter, system-ui, sans-serif';
    const w = ctx.measureText(label).width + 16;
    const x = Math.min(width - w - 4, Math.max(4, p.x - w / 2));
    const y = Math.max(4, p.y - 36);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    ctx.fillRect(x, y, w, 24);
    ctx.fillStyle = '#f8fafc';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + 8, y + 12);
  }

  clearTimeout(routingTimer);
  // Some legs may have been drawn straight to keep this frame fast; route
  // them next. Legs routed in this frame change the step distances.
  if (pending) routingTimer = setTimeout(requestDraw, 30);
  if (routedNow) renderSteps();
  root?.querySelector('[data-path-routing]')?.toggleAttribute('hidden', !pending);
}

function bindCanvas() {
  const pointers = new Map();
  let dragStart = null;
  let moved = false;
  let pinch = null;

  const local = (event) => {
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  canvas.addEventListener('pointerdown', (event) => {
    canvas.setPointerCapture?.(event.pointerId);
    pointers.set(event.pointerId, local(event));
    if (pointers.size === 1) {
      dragStart = { ...local(event), ox: view.ox, oy: view.oy };
      moved = false;
    } else if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinch = {
        dist: Math.hypot(a.x - b.x, a.y - b.y),
        scale: view.scale,
        ox: view.ox,
        oy: view.oy,
        cx: (a.x + b.x) / 2,
        cy: (a.y + b.y) / 2,
      };
      moved = true;
    }
  });

  canvas.addEventListener('pointermove', (event) => {
    const point = local(event);
    if (!pointers.has(event.pointerId)) {
      if (event.pointerType === 'mouse') {
        const hit = nearestStructure(point.x, point.y, snapRadius('mouse'));
        if (hit !== hoverStructure) {
          hoverStructure = hit;
          canvas.style.cursor = hit ? 'pointer' : 'crosshair';
          requestDraw();
        }
      }
      return;
    }
    pointers.set(event.pointerId, point);
    if (pinch && pointers.size >= 2) {
      const [a, b] = [...pointers.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, (pinch.scale * dist) / pinch.dist));
      const ratio = scale / pinch.scale;
      const cx = (a.x + b.x) / 2;
      const cy = (a.y + b.y) / 2;
      view.scale = scale;
      view.ox = cx - (pinch.cx - pinch.ox) * ratio;
      view.oy = cy - (pinch.cy - pinch.oy) * ratio;
      requestDraw();
      return;
    }
    if (!dragStart) return;
    const dx = point.x - dragStart.x;
    const dy = point.y - dragStart.y;
    if (!moved && Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
    moved = true;
    view.ox = dragStart.ox + dx;
    view.oy = dragStart.oy + dy;
    requestDraw();
  });

  const end = (event) => {
    const had = pointers.delete(event.pointerId);
    if (pointers.size < 2) pinch = null;
    if (!had || pointers.size) return;
    if (event.type === 'pointerup' && !moved && dragStart) {
      const point = local(event);
      const snapped = nearestStructure(point.x, point.y, snapRadius(event.pointerType));
      const world = screenToWorld(point.x, point.y);
      if (world.x >= 0 && world.y >= 0 && world.x <= 1600 && world.y <= 1600) {
        placeAtWorld(world.x, world.y, snapped);
      }
    }
    dragStart = null;
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('pointerleave', () => {
    if (hoverStructure) {
      hoverStructure = null;
      requestDraw();
    }
  });

  canvas.addEventListener(
    'wheel',
    (event) => {
      event.preventDefault();
      const point = local(event);
      zoomAt(event.deltaY < 0 ? 1.15 : 1 / 1.15, point.x, point.y);
    },
    { passive: false }
  );

  canvas.addEventListener('keydown', (event) => {
    const { width, height } = canvasSize();
    const step = 60;
    const keys = {
      ArrowLeft: () => (view.ox += step),
      ArrowRight: () => (view.ox -= step),
      ArrowUp: () => (view.oy += step),
      ArrowDown: () => (view.oy -= step),
      '+': () => zoomAt(1.2, width / 2, height / 2),
      '=': () => zoomAt(1.2, width / 2, height / 2),
      '-': () => zoomAt(1 / 1.2, width / 2, height / 2),
      0: () => fitView(),
    };
    const action = keys[event.key];
    if (!action) return;
    event.preventDefault();
    action();
    requestDraw();
  });
}

// ---------------------------------------------------------------------------
// Controls

function announce(message) {
  const status = root?.querySelector('[data-path-status]');
  if (!status) return;
  status.textContent = '';
  requestAnimationFrame(() => {
    status.textContent = message;
  });
}

function searchResults(query) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const results = [];
  const point = parseCoordInput(query);
  if (point && point.x <= 1600 && point.y <= 1600) {
    results.push({ point, label: copy('pathingUseCoords', { coords: `${point.x}:${point.y}` }) });
  }
  const tokens = q.split(/\s+/).filter(Boolean);
  const matches = structures.filter((s) => {
    const meta = STRUCTURE_TYPES[s.type];
    const haystack = [
      structureLabel(s.type),
      meta.label,
      meta.short,
      s.zone,
      s.sector,
      getEdenSectorDisplayLabel(s.sector, '', locale()),
      `${s.x}:${s.y}`,
    ]
      .join(' ')
      .toLowerCase();
    return tokens.every((token) => haystack.includes(token));
  });
  // Gates lead the list: they are what a march is routed through.
  matches.sort((a, b) => {
    const ga = STRUCTURE_TYPES[a.type].category === 'gate' ? 0 : 1;
    const gb = STRUCTURE_TYPES[b.type].category === 'gate' ? 0 : 1;
    return ga - gb || a.sector.localeCompare(b.sector) || a.x - b.x || a.y - b.y;
  });
  matches.slice(0, 30).forEach((s) => results.push({ structure: s }));
  return results;
}

function renderSearchResults() {
  const list = root.querySelector('[data-path-results]');
  if (!list) return;
  const results = searchResults(searchQuery);
  if (!searchQuery.trim()) {
    list.innerHTML = '';
    return;
  }
  if (!results.length) {
    list.innerHTML = `<li class="eden-path-empty">${escapeHtml(copy('pathingNoResults'))}</li>`;
    return;
  }
  list.innerHTML = results
    .map((result, index) => {
      if (result.point) {
        return `<li><button type="button" class="eden-path-result" data-result="${index}"><strong>${escapeHtml(result.label)}</strong></button></li>`;
      }
      const s = result.structure;
      const meta = STRUCTURE_TYPES[s.type];
      return `<li><button type="button" class="eden-path-result" data-result="${index}"><span class="eden-path-dot${meta.category === 'gate' ? ' is-gate' : ''}" style="--dot:${meta.color}" aria-hidden="true"></span><strong>${escapeHtml(structureLabel(s.type))}</strong><small>${escapeHtml(getEdenSectorDisplayLabel(s.sector, '', locale()))} · ${s.zone ? `${escapeHtml(s.zone)} · ` : ''}${s.x}:${s.y}</small></button></li>`;
    })
    .join('');
  list._results = results;
}

function modeHint() {
  if (mode === 'start') return copy('pathingHintStart');
  if (mode === 'end') return copy('pathingHintEnd');
  return copy('pathingHintWaypoint');
}

// A step row shows the tiles its leg adds to the route, so the rows add up to
// the total; when the leg walks over ground already counted, the full walked
// length follows in parentheses.
function legCopy(item) {
  if (item.legWalked != null && item.legWalked !== item.legTiles) {
    return copy('pathingLegTilesWalked', { tiles: num(item.legTiles), walked: num(item.legWalked) });
  }
  return copy('pathingLegTiles', { tiles: num(item.legTiles) });
}

function renderSteps() {
  const box = root?.querySelector('[data-path-steps]');
  if (!box) return;
  const route = activeRoute();
  const state = routeState(route, (a, b) => router.has(a, b));
  const items = state.steps.items;
  const stopsHtml = items.length
    ? `<ol class="eden-path-stops">${items
        .map((item, index) => {
          const legText =
            item.legTiles == null
              ? ''
              : `<span class="eden-path-leg${item.legBlocked ? ' is-blocked' : ''}">${escapeHtml(legCopy(item))}</span>`;
          return `<li class="eden-path-stop is-${item.role}">
            <span class="eden-path-badge" style="--route:${routeColor(route)}" aria-hidden="true">${escapeHtml(item.badge)}</span>
            <span class="eden-path-stop-text"><strong>${escapeHtml(item.label)}</strong>${legText}</span>
            <span class="eden-path-stop-tools">
              <button type="button" class="eden-path-icon" data-act="up" data-index="${index}" data-focus="up-${index}" aria-label="${escapeHtml(`${copy('pathingMoveUp')}: ${item.label}`)}" ${index === 0 ? 'disabled' : ''}>↑</button>
              <button type="button" class="eden-path-icon" data-act="down" data-index="${index}" data-focus="down-${index}" aria-label="${escapeHtml(`${copy('pathingMoveDown')}: ${item.label}`)}" ${index === items.length - 1 ? 'disabled' : ''}>↓</button>
              <button type="button" class="eden-path-icon is-danger" data-act="remove" data-index="${index}" data-focus="remove-${index}" aria-label="${escapeHtml(`${copy('pathingRemoveStop')}: ${item.label}`)}">✕</button>
            </span>
          </li>`;
        })
        .join('')}</ol>`
    : `<p class="eden-path-empty">${escapeHtml(copy('pathingNoStops'))}</p>`;
  const summary =
    items.length >= 2
      ? `<div class="eden-path-summary"><p class="eden-path-line">${escapeHtml(state.steps.line)}</p><p class="eden-path-total">${escapeHtml(copy('pathingTotalTiles', { tiles: num(state.tiles) }))}</p><p class="eden-path-pathers">${escapeHtml(copy('pathingPathers', { count: num(state.pathers), each: num(state.tilesPerPather) }))}</p>${state.overlapTiles ? `<p class="eden-path-muted">${escapeHtml(copy('pathingRepeatTiles', { tiles: num(state.overlapTiles) }))}</p>` : ''}${state.blocked ? `<p class="eden-path-warn" role="note">${escapeHtml(copy('pathingBlocked'))}</p>` : ''}</div>`
      : items.length === 1
        ? `<p class="eden-path-muted">${escapeHtml(copy('pathingNeedTwo'))}</p>`
        : '';
  const focusKey = box.contains(document.activeElement)
    ? document.activeElement.dataset.focus
    : null;
  box.innerHTML = `${stopsHtml}${summary}`;
  if (focusKey) box.querySelector(`[data-focus="${focusKey}"]`)?.focus();
  const handleSummary = root.querySelector('[data-path-sheet-summary]');
  if (handleSummary) {
    handleSummary.textContent =
      items.length >= 2
        ? `${routeName(route, plan().active)} · ${copy('pathingTotalTiles', { tiles: num(state.tiles) })} · ${copy('pathingPathers', { count: num(state.pathers), each: num(state.tilesPerPather) })}`
        : routeName(route, plan().active);
  }
}

function renderControls() {
  const body = root?.querySelector('[data-path-controls]');
  if (!body) return;
  const focusKey =
    focusOverride || document.activeElement?.closest?.('[data-focus]')?.dataset.focus;
  focusOverride = null;
  const current = plan();
  const route = activeRoute();
  const planOptions = Object.keys(library.plans)
    .map(
      (id) =>
        `<option value="${escapeHtml(id)}" ${id === library.activeId ? 'selected' : ''}>${escapeHtml(planName(id))}</option>`
    )
    .join('');
  const routeChips = current.routes
    .map(
      (r, index) =>
        `<button type="button" class="eden-path-chip" data-act="route" data-index="${index}" data-focus="route-${index}" aria-pressed="${index === current.active}" style="--route:${routeColor(r)}"><span class="eden-path-swatch" aria-hidden="true"></span><span data-chip-name>${escapeHtml(routeName(r, index))}</span><small>${r.stops.length}</small></button>`
    )
    .join('');
  const swatches = PATH_COLORS.map(
    (color, index) =>
      `<label class="eden-path-color" style="--route:${color.color}" title="${escapeHtml(getEdenPathColorDisplayLabel(color.id, locale()))}"><input type="radio" name="edenPathColor" value="${index}" data-focus="color-${index}" ${route.color === index ? 'checked' : ''} aria-label="${escapeHtml(getEdenPathColorDisplayLabel(color.id, locale()))}"><span aria-hidden="true"></span></label>`
  ).join('');
  const modes = ['start', 'waypoint', 'end']
    .map((id) => {
      const key = { start: 'pathingModeStart', waypoint: 'pathingModeWaypoint', end: 'pathingModeEnd' }[id];
      return `<label class="eden-path-mode"><input type="radio" name="edenPathMode" value="${id}" data-focus="mode-${id}" ${mode === id ? 'checked' : ''}><span>${escapeHtml(copy(key))}</span></label>`;
    })
    .join('');

  body.innerHTML = `
    <section class="eden-path-block" aria-labelledby="edenPathPlanLabel">
      <div class="eden-path-row">
        <label class="eden-path-field">
          <span id="edenPathPlanLabel">${escapeHtml(copy('pathingPlan'))}</span>
          <select data-field="plan" data-focus="plan">${planOptions}</select>
        </label>
        <button type="button" class="eden-path-btn" data-act="new-plan" data-focus="new-plan" ${Object.keys(library.plans).length >= PATHING_MAX_PLANS ? 'disabled' : ''}>＋ ${escapeHtml(copy('pathingNewPlan'))}</button>
      </div>
      <div class="eden-path-row">
        <label class="eden-path-field is-grow">
          <span>${escapeHtml(copy('pathingPlanName'))}</span>
          <input type="text" maxlength="48" data-field="plan-name" data-focus="plan-name" value="${escapeHtml(current.name)}" placeholder="${escapeHtml(planName(library.activeId))}">
        </label>
        <button type="button" class="eden-path-btn is-danger" data-act="delete-plan" data-focus="delete-plan">${escapeHtml(copy('pathingDeletePlan'))}</button>
      </div>
      ${storageOk ? '' : `<p class="eden-path-warn">${escapeHtml(copy('pathingStorageOff'))}</p>`}
    </section>
    <section class="eden-path-block" aria-labelledby="edenPathRoutesLabel">
      <h3 id="edenPathRoutesLabel">${escapeHtml(copy('pathingRoutes'))}</h3>
      <div class="eden-path-chips">${routeChips}<button type="button" class="eden-path-chip is-add" data-act="add-route" data-focus="add-route" ${current.routes.length >= PATHING_MAX_ROUTES ? 'disabled' : ''}>＋ ${escapeHtml(copy('pathingAddRoute'))}</button></div>
      <div class="eden-path-row">
        <label class="eden-path-field is-grow">
          <span>${escapeHtml(copy('pathingRouteName'))}</span>
          <input type="text" maxlength="48" data-field="route-name" data-focus="route-name" value="${escapeHtml(route.name)}" placeholder="${escapeHtml(routeName(route, current.active))}">
        </label>
        <button type="button" class="eden-path-btn is-danger" data-act="delete-route" data-focus="delete-route" ${current.routes.length <= 1 ? 'disabled' : ''}>${escapeHtml(copy('pathingDeleteRoute'))}</button>
      </div>
      <fieldset class="eden-path-colors"><legend>${escapeHtml(copy('pathingRouteColor'))}</legend>${swatches}</fieldset>
    </section>
    <section class="eden-path-block" aria-labelledby="edenPathStopsLabel">
      <h3 id="edenPathStopsLabel">${escapeHtml(copy('pathingStops'))}</h3>
      <fieldset class="eden-path-modes"><legend>${escapeHtml(copy('pathingTapSets'))}</legend>${modes}</fieldset>
      <p class="eden-path-muted" data-path-hint>${escapeHtml(modeHint())}</p>
      <label class="eden-path-field eden-path-search">
        <span>${escapeHtml(copy('pathingSearch'))}</span>
        <input type="search" data-field="search" data-focus="search" autocomplete="off" value="${escapeHtml(searchQuery)}" placeholder="${escapeHtml(copy('pathingSearchPh'))}">
      </label>
      <ul class="eden-path-results" data-path-results></ul>
      <div data-path-steps></div>
      <div class="eden-path-row">
        <button type="button" class="eden-path-btn" data-act="suggest-gate" data-focus="suggest-gate">⛩ ${escapeHtml(copy('pathingSuggestGate'))}</button>
        <button type="button" class="eden-path-btn" data-act="clear" data-focus="clear" ${route.stops.length ? '' : 'disabled'}>${escapeHtml(copy('pathingClearStops'))}</button>
      </div>
      <p class="eden-path-muted" data-path-routing hidden>${escapeHtml(copy('pathingRouting'))}</p>
    </section>`;
  renderSearchResults();
  renderSteps();
  if (focusKey) body.querySelector(`[data-focus="${CSS.escape(focusKey)}"]`)?.focus();
}

function renderShell() {
  root.innerHTML = `
    <section class="eden-path" aria-labelledby="edenPathTitle">
      <header class="eden-path-head">
        <div>
          <h2 id="edenPathTitle">${escapeHtml(copy('subTabPathing'))}</h2>
          <p>${escapeHtml(copy('pathingIntro'))}</p>
        </div>
        <div class="eden-path-actions">
          <button type="button" class="eden-path-btn" data-act="share">🔗 ${escapeHtml(copy('pathingShare'))}</button>
          <button type="button" class="eden-path-btn is-primary" data-act="export">⬇ ${escapeHtml(copy('pathingExport'))}</button>
        </div>
      </header>
      <div class="eden-path-share" data-path-share hidden>
        <label class="eden-path-field is-grow"><span>${escapeHtml(copy('pathingShareManual'))}</span><input type="text" readonly data-path-share-input></label>
      </div>
      <div class="eden-path-layout">
        <div class="eden-path-stage">
          <div class="eden-path-mapwrap">
            <canvas class="eden-path-canvas" tabindex="0" aria-label="${escapeHtml(copy('pathingMapLabel'))}"></canvas>
            <div class="eden-path-zoom" role="group" aria-label="${escapeHtml(copy('zoomControls'))}">
              <button type="button" class="eden-path-icon" data-act="zoom-in" aria-label="${escapeHtml(copy('pathingZoomIn'))}">＋</button>
              <button type="button" class="eden-path-icon" data-act="zoom-out" aria-label="${escapeHtml(copy('pathingZoomOut'))}">−</button>
              <button type="button" class="eden-path-icon" data-act="fit" aria-label="${escapeHtml(copy('pathingFit'))}">⤢</button>
            </div>
            <div class="eden-path-legend">
              <span><i class="eden-path-dot is-gate" style="--dot:#38bdf8" aria-hidden="true"></i>${escapeHtml(copy('pathingGate'))}</span>
              <label><input type="checkbox" data-field="impassable" ${showImpassable ? 'checked' : ''}><i class="eden-path-hatch" aria-hidden="true"></i>${escapeHtml(copy('pathingImpassable'))}</label>
            </div>
          </div>
        </div>
        <aside class="eden-path-sheet" data-open="${sheetOpen}" aria-label="${escapeHtml(copy('pathingControls'))}">
          <button type="button" class="eden-path-sheet-handle" data-act="sheet" aria-expanded="${sheetOpen}">
            <span class="eden-path-grip" aria-hidden="true"></span>
            <strong>${escapeHtml(copy('pathingControls'))}</strong>
            <small data-path-sheet-summary></small>
          </button>
          <div class="eden-path-sheet-body" data-path-controls></div>
        </aside>
      </div>
      <p class="sr-only" role="status" aria-live="polite" data-path-status></p>
      <p class="eden-path-toast" role="status" aria-live="polite" data-path-toast hidden></p>
    </section>`;
  canvas = root.querySelector('canvas');
  ctx = canvas.getContext('2d');
  view.fitted = false;
  resizeObserver?.disconnect();
  resizeObserver?.observe(canvas.parentElement);
  bindCanvas();
  renderControls();
  resizeCanvas();
  if (pendingToast) toast(pendingToast);
}

function toast(message) {
  const el = root?.querySelector('[data-path-toast]');
  // A shared link is read before the shell exists; show its message once it does.
  pendingToast = el ? null : message;
  if (!el) return;
  el.textContent = message;
  el.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => {
    el.hidden = true;
  }, 3200);
}

function shareUrl() {
  const code = encodePlanShare(plan());
  return `${location.origin}${location.pathname}#edenHub?subtab=pathing&plan=${code}`;
}

async function share() {
  const url = shareUrl();
  const box = root.querySelector('[data-path-share]');
  const input = root.querySelector('[data-path-share-input]');
  input.value = url;
  try {
    await navigator.clipboard.writeText(url);
    box.hidden = true;
    toast(copy('pathingShareCopied'));
  } catch {
    box.hidden = false;
    input.focus();
    input.select();
  }
}

function onClick(event) {
  const result = event.target.closest('[data-result]');
  if (result) {
    onResult(result);
    return;
  }
  const button = event.target.closest('[data-act]');
  if (!button || !root.contains(button)) return;
  const act = button.dataset.act;
  const current = plan();
  const route = activeRoute();
  const index = Number(button.dataset.index);
  const { width, height } = canvas ? canvasSize() : { width: 0, height: 0 };
  switch (act) {
    case 'zoom-in':
      zoomAt(1.25, width / 2, height / 2);
      break;
    case 'zoom-out':
      zoomAt(1 / 1.25, width / 2, height / 2);
      break;
    case 'fit':
      fitView();
      break;
    case 'sheet':
      sheetOpen = !sheetOpen;
      button.closest('.eden-path-sheet').dataset.open = String(sheetOpen);
      button.setAttribute('aria-expanded', String(sheetOpen));
      break;
    case 'share':
      void share();
      break;
    case 'export':
      void exportPng(button);
      break;
    case 'new-plan': {
      const id = newPlanId(library);
      library.plans[id] = createPlan();
      library.activeId = id;
      mode = 'start';
      commit();
      break;
    }
    case 'delete-plan':
      if (!window.confirm(copy('pathingDeletePlanConfirm'))) return;
      delete library.plans[library.activeId];
      library = normalizeLibrary(library);
      mode = 'start';
      commit();
      break;
    case 'route':
      current.active = index;
      mode = current.routes[index].stops.length ? 'waypoint' : 'start';
      commit();
      break;
    case 'add-route':
      if (current.routes.length >= PATHING_MAX_ROUTES) return;
      current.routes.push(createRoute('', nextRouteColor(current.routes)));
      current.active = current.routes.length - 1;
      mode = 'start';
      commit();
      break;
    case 'delete-route':
      if (current.routes.length <= 1) return;
      current.routes.splice(current.active, 1);
      current.active = Math.max(0, current.active - 1);
      commit();
      break;
    case 'up':
    case 'down': {
      const target = index + (act === 'up' ? -1 : 1);
      // Keep focus on the moved stop; at either end the other arrow is the live one.
      const edge = act === 'up' ? target === 0 : target === route.stops.length - 1;
      focusOverride = `${edge ? (act === 'up' ? 'down' : 'up') : act}-${target}`;
      updateActiveRoute(moveStop(route, index, act === 'up' ? -1 : 1));
      break;
    }
    case 'remove':
      focusOverride =
        route.stops.length > 1 ? `remove-${Math.min(index, route.stops.length - 2)}` : 'search';
      updateActiveRoute(removeStop(route, index));
      break;
    case 'clear':
      mode = 'start';
      updateActiveRoute({ ...route, stops: [] });
      break;
    case 'suggest-gate': {
      const pick = suggestGate(route.stops, gates);
      if (!pick) {
        announce(copy('pathingNoGate'));
        toast(copy('pathingNoGate'));
        return;
      }
      const label = `${structureLabel(pick.gate.type)} (${pick.gate.x}:${pick.gate.y})`;
      toast(copy('pathingSuggestedGate', { gate: label }));
      announce(copy('pathingSuggestedGate', { gate: label }));
      updateActiveRoute(insertStop(route, pick.index, stopFromStructure(pick.gate)));
      break;
    }
    default:
      break;
  }
}

function onResult(button) {
  const list = root.querySelector('[data-path-results]');
  const result = list?._results?.[Number(button.dataset.result)];
  if (!result) return;
  searchQuery = '';
  if (result.point) placeAtWorld(result.point.x, result.point.y, null);
  else placeStop(stopFromStructure(result.structure));
  root.querySelector('[data-field="search"]')?.focus();
}

function onChange(event) {
  const field = event.target.dataset.field;
  const current = plan();
  if (event.target.name === 'edenPathMode') {
    mode = event.target.value;
    const hint = root.querySelector('[data-path-hint]');
    if (hint) hint.textContent = modeHint();
    return;
  }
  if (event.target.name === 'edenPathColor') {
    updateActiveRoute({ ...activeRoute(), color: Number(event.target.value) });
    return;
  }
  if (field === 'plan') {
    library.activeId = event.target.value;
    mode = activeRoute().stops.length ? 'waypoint' : 'start';
    commit();
  } else if (field === 'plan-name') {
    // Names update in place: re-rendering here would pull focus back to the
    // field the member is tabbing away from.
    current.name = event.target.value.trim().slice(0, 48);
    saveLibrary();
    const option = root.querySelector(`[data-field="plan"] option[value="${library.activeId}"]`);
    if (option) option.textContent = planName(library.activeId);
  } else if (field === 'route-name') {
    const route = activeRoute();
    route.name = event.target.value.trim().slice(0, 48);
    saveLibrary();
    const chip = root.querySelector(`[data-act="route"][data-index="${current.active}"] [data-chip-name]`);
    if (chip) chip.textContent = routeName(route, current.active);
    renderSteps();
  } else if (field === 'impassable') {
    showImpassable = event.target.checked;
    requestDraw();
  }
}

function onInput(event) {
  if (event.target.dataset.field !== 'search') return;
  searchQuery = event.target.value;
  renderSearchResults();
}

// ---------------------------------------------------------------------------
// PNG export

function exportPalette(light) {
  return light
    ? { bg: '#f4f7fb', panel: '#ffffff', text: '#0f2233', muted: '#51677a', line: '#d4dde7' }
    : { bg: '#07111f', panel: '#0e1d31', text: '#eaf6ff', muted: '#9db3c8', line: '#1f3550' };
}

function wrapLines(target, text, maxWidth) {
  const words = String(text).split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (target.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

async function exportPng(button) {
  button.disabled = true;
  try {
    await new Promise((resolve) => {
      const floor = preloadStrategyFloor(() => resolve());
      if (floor?.complete && floor.naturalWidth) resolve();
      setTimeout(resolve, 4000);
    });
    const light = isLight();
    const rtl = document.documentElement.dir === 'rtl';
    const colors = exportPalette(light);
    const current = plan();
    const routes = current.routes
      .map((route, index) => ({ route, index }))
      .filter(({ route }) => route.stops.length);
    const states = routes.map(({ route }) => routeState(route, () => true));

    const W = 1600;
    const pad = 40;
    // Map crop: the routes plus margin, or the whole map when nothing is planned.
    const unit = (x, y) => ({ x: (x - y) * 0.5, y: (x + y) * 0.25 });
    let bounds = { minX: -800, maxX: 800, minY: -100, maxY: 900 };
    const pts = states.flatMap((state, i) => [
      ...state.legs.flatMap((leg) => leg.path),
      ...routes[i].route.stops,
    ]);
    if (pts.length) {
      const us = pts.map((p) => unit(p.x, p.y));
      const margin = 70;
      bounds = {
        minX: Math.min(...us.map((p) => p.x)) - margin,
        maxX: Math.max(...us.map((p) => p.x)) + margin,
        minY: Math.min(...us.map((p) => p.y)) - margin,
        maxY: Math.max(...us.map((p) => p.y)) + margin,
      };
      // Keep a readable aspect: never narrower than 4:3 around the routes.
      const bw = bounds.maxX - bounds.minX;
      const bh = bounds.maxY - bounds.minY;
      if (bw < bh * 1.33) {
        const grow = (bh * 1.33 - bw) / 2;
        bounds.minX -= grow;
        bounds.maxX += grow;
      }
    }
    const mapW = W - pad * 2;
    const bw = bounds.maxX - bounds.minX;
    const bh = bounds.maxY - bounds.minY;
    const mapScale = Math.min(mapW / bw, 1000 / bh);
    const mapH = Math.round(bh * mapScale);

    // Measure the step list first so the canvas is exactly tall enough.
    const measure = document.createElement('canvas').getContext('2d');
    const cols = routes.length > 1 ? 2 : 1;
    const colW = (W - pad * 2 - (cols - 1) * 24) / cols;
    const blocks = routes.map(({ route, index }, i) => {
      const steps = states[i].steps;
      measure.font = '600 18px Inter, system-ui, sans-serif';
      const lines = steps.items.map((item) => {
        const leg = item.legTiles == null ? '' : `  ${legCopy(item)}`;
        return wrapLines(measure, `${item.badge} · ${item.label}${leg}`, colW - 60);
      });
      // The totals sit on their own muted line under the route name, so a long
      // estimate never runs into a long route name in a two-column export.
      measure.font = '600 16px Inter, system-ui, sans-serif';
      const totals =
        steps.items.length >= 2
          ? wrapLines(
              measure,
              `${copy('pathingTotalTiles', { tiles: num(states[i].tiles) })} · ${copy('pathingPathers', { count: num(states[i].pathers), each: num(states[i].tilesPerPather) })}`,
              colW - 52
            )
          : [];
      const totalsH = totals.length ? totals.length * 22 + 8 : 0;
      const height = 64 + totalsH + lines.reduce((sum, l) => sum + l.length * 26, 0) + 14;
      return { route, index, steps, state: states[i], lines, totals, totalsH, height };
    });
    const rowsHeight = [];
    for (let i = 0; i < blocks.length; i += cols) {
      rowsHeight.push(Math.max(...blocks.slice(i, i + cols).map((b) => b.height)));
    }
    const headerH = 104;
    const listH = rowsHeight.reduce((a, b) => a + b + 18, 0);
    const H = headerH + mapH + 28 + listH + 70;

    const out = document.createElement('canvas');
    out.width = W;
    out.height = H;
    const g = out.getContext('2d');
    g.fillStyle = colors.bg;
    g.fillRect(0, 0, W, H);
    g.direction = rtl ? 'rtl' : 'ltr';
    const startX = (x, width) => (rtl ? x + width : x);
    g.textAlign = rtl ? 'right' : 'left';

    g.fillStyle = colors.text;
    g.font = '800 34px Inter, system-ui, sans-serif';
    g.fillText(`${copy('subTabPathing')} · ${planName(library.activeId)}`, startX(pad, W - pad * 2), 56);
    g.fillStyle = colors.muted;
    g.font = '500 18px Inter, system-ui, sans-serif';
    g.fillText(copy('pathingIntro'), startX(pad, W - pad * 2), 86);

    // Map
    const mapTop = headerH;
    g.save();
    g.beginPath();
    g.roundRect(pad, mapTop, mapW, mapH, 18);
    g.clip();
    g.fillStyle = light ? '#efe7d6' : '#0b0906';
    g.fillRect(pad, mapTop, mapW, mapH);
    const ox = pad + (mapW - bw * mapScale) / 2 - bounds.minX * mapScale;
    const oy = mapTop - bounds.minY * mapScale;
    const project = (x, y) => ({ x: (x - y) * 0.5 * mapScale + ox, y: (x + y) * 0.25 * mapScale + oy });
    paintMap(g, project, mapScale);
    const lineScale = Math.max(1, Math.min(1.6, mapScale * 1.2));
    blocks.forEach((block) => paintRoute(g, project, block.route, block.state, { lineScale }));
    g.restore();
    g.strokeStyle = colors.line;
    g.lineWidth = 2;
    g.beginPath();
    g.roundRect(pad, mapTop, mapW, mapH, 18);
    g.stroke();

    // Legend + step lists
    let y = mapTop + mapH + 28;
    blocks.forEach((block, i) => {
      const col = i % cols;
      if (col === 0 && i > 0) y += rowsHeight[Math.floor(i / cols) - 1] + 18;
      const x = rtl ? W - pad - (col + 1) * colW - col * 24 : pad + col * (colW + 24);
      const color = routeColor(block.route);
      g.fillStyle = colors.panel;
      g.beginPath();
      g.roundRect(x, y, colW, rowsHeight[Math.floor(i / cols)], 14);
      g.fill();
      g.fillStyle = color;
      g.fillRect(rtl ? x + colW - 8 : x, y, 8, rowsHeight[Math.floor(i / cols)]);
      g.fillStyle = colors.text;
      g.font = '800 22px Inter, system-ui, sans-serif';
      g.fillText(routeName(block.route, block.index), startX(x + 26, colW - 52), y + 36);
      g.fillStyle = colors.muted;
      g.font = '600 16px Inter, system-ui, sans-serif';
      block.totals.forEach((text, lineIndex) => {
        g.fillText(text, startX(x + 26, colW - 52), y + 62 + lineIndex * 22);
      });
      let ly = y + 70 + block.totalsH;
      g.font = '600 18px Inter, system-ui, sans-serif';
      block.lines.forEach((wrapped, stepIndex) => {
        const item = block.steps.items[stepIndex];
        g.fillStyle = item.legBlocked ? (light ? '#b45309' : '#fbbf24') : colors.text;
        wrapped.forEach((text) => {
          g.fillText(text, startX(x + 26, colW - 52), ly);
          ly += 26;
        });
      });
    });

    const footerY = H - 40;
    // The branding footer is Latin text in a fixed layout in every language.
    g.direction = 'ltr';
    g.textAlign = 'left';
    drawCanvasFooter(
      g,
      { ...getExportBranding(), sourceCredits: [] },
      {
        x: pad,
        y: footerY,
        width: W - pad * 2,
        fontLine1: '700 15px Inter, system-ui, sans-serif',
        fontLine2: '500 13px Inter, system-ui, sans-serif',
        lineGap: 20,
        mutedColor: colors.muted,
        accentColor: light ? '#0369a1' : '#38bdf8',
      }
    );

    const blob = await new Promise((resolve) => out.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('PNG encoding failed');
    const slug =
      (current.name || 'plan')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || 'plan';
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `eden-pathing-${slug}.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 2000);
    toast(copy('pathingExportDone'));
  } catch (error) {
    console.warn('[eden-pathing] export failed', error);
    toast(copy('pathingExportFailed'));
  } finally {
    button.disabled = false;
  }
}

// ---------------------------------------------------------------------------
// Shared links

function readShareFromHash() {
  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  const code = params.get('plan');
  if (params.get('subtab') !== 'pathing' || !code) return;
  const shared = decodePlanShare(code, { resolveStructure: resolveStructureType });
  history.replaceState(history.state, '', '#edenHub?subtab=pathing');
  if (!shared) {
    toast(copy('pathingSharedInvalid'));
    return;
  }
  const same = Object.entries(library.plans).find(
    ([, existing]) => encodePlanShare(existing) === encodePlanShare(shared)
  );
  if (same) library.activeId = same[0];
  else {
    if (Object.keys(library.plans).length >= PATHING_MAX_PLANS) {
      delete library.plans[Object.keys(library.plans)[0]];
    }
    const id = newPlanId(library);
    library.plans[id] = shared;
    library.activeId = id;
  }
  mode = 'waypoint';
  saveLibrary();
  toast(copy('pathingSharedLoaded', { plan: planName(library.activeId) }));
}

// ---------------------------------------------------------------------------

export async function initEdenPathing(mount) {
  if (!mount) return;
  if (root === mount) {
    readShareFromHash();
    renderControls();
    resizeCanvas();
    return;
  }
  root = mount;
  library = loadLibrary();
  await Promise.all([loadEdenMapLocale(locale()), ensureEdenDatasetsLoaded().catch(() => null)]);
  refreshStructures();
  preloadStrategyFloor(() => requestDraw());
  readShareFromHash();
  if (typeof ResizeObserver === 'function') resizeObserver = new ResizeObserver(resizeCanvas);
  else window.addEventListener('resize', resizeCanvas);
  renderShell();

  root.addEventListener('click', onClick);
  root.addEventListener('change', onChange);
  root.addEventListener('input', onInput);
  window.addEventListener('edenDatasetChange', () => {
    refreshStructures();
    renderControls();
    requestDraw();
  });
  const relocalize = async () => {
    await loadEdenMapLocale(locale());
    if (!root?.isConnected) return;
    renderShell();
  };
  window.addEventListener('edenLanguageUpdate', relocalize);
  window.addEventListener('vts:language-change', relocalize);
  new MutationObserver(() => requestDraw()).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });
}
