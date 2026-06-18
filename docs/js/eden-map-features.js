// Eden Map advanced features — Phases 2–4 utilities & overlays
import { MAP_BOUNDS } from './eden-map-terrain.js';
import {
  getSectorTileImage, isSectorTileReady, getSectorTileIds, PARCHMENT_BASE,
} from './eden-map-assets.js';
import { SECTOR_FACTION, getEdenSectors, getSectorBounds } from './eden-map-data.js';

export const PLANS_STORE_KEY = 'vts_eden_plans_store_v1';
export const MARCH_SPEED_BASE = 3;

export function createEmptyPlan() {
  return {
    guilds: {},
    status: {},
    targets: [],
    paths: [],
    drawings: [],
    customTargets: [],
    explored: {},
    speed: 1,
    teamPlanEnabled: false,
    teamCount: 4,
    teamNames: { t1: 'Team 1', t2: 'Team 2', t3: 'Team 3', t4: 'Team 4' },
    teamMeta: {},
  };
}

export function loadPlansStore() {
  try {
    const raw = localStorage.getItem(PLANS_STORE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  const legacy = localStorage.getItem('vts_eden_map_plan_v2') || localStorage.getItem('vts_eden_map_plan_v1');
  const plan = createEmptyPlan();
  if (legacy) {
    try { Object.assign(plan, JSON.parse(legacy)); } catch { /* ignore */ }
  }
  return { activeId: 'default', plans: { default: { name: 'Main Plan', plan } } };
}

export function savePlansStore(store) {
  localStorage.setItem(PLANS_STORE_KEY, JSON.stringify(store));
}

export function fuzzyIncludes(query, text) {
  if (!query) return true;
  const q = query.toLowerCase().trim();
  const t = String(text).toLowerCase();
  if (t.includes(q)) return true;
  let qi = 0;
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) qi++;
  }
  return qi === q.length;
}

export function estimateTravelMinutes(tileDistance, speedMod = 1) {
  const speed = MARCH_SPEED_BASE * Math.max(0.25, speedMod);
  return Math.max(1, Math.round(tileDistance / speed));
}

export function formatTravelTime(mins) {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

/** Freehand plan sketches — world-space polylines. */
export function drawPlanSketches(ctx, worldToIso, strokes, scale = 1, draft = null) {
  const list = [...(strokes || []), draft].filter((s) => s?.points?.length >= 2);
  list.forEach((stroke) => {
    const pts = stroke.points;
    ctx.beginPath();
    pts.forEach((pt, i) => {
      const p = worldToIso(pt.x, pt.y);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.strokeStyle = stroke.color || '#f97316';
    ctx.lineWidth = Math.max(2, (stroke.width || 3) * scale);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = stroke === draft ? 0.88 : 1;
    ctx.stroke();
    ctx.globalAlpha = 1;
  });
}

export function distPointToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(px - ax, py - ay);
  let t = ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

export function hitTestPath(mx, my, paths, worldToScreen, threshold = 12) {
  let best = null;
  let bestD = threshold;
  paths.forEach((path, pathIdx) => {
    const pts = path.routedPath || path.points;
    if (!pts?.length) return;
    const screen = pts.map(p => worldToScreen(p.x, p.y));
    for (let i = 0; i < screen.length - 1; i++) {
      const a = screen[i];
      const b = screen[i + 1];
      const d = distPointToSegment(mx, my, a.x, a.y, b.x, b.y);
      if (d < bestD) {
        bestD = d;
        let wpIdx = i;
        const da = Math.hypot(mx - a.x, my - a.y);
        const db = Math.hypot(mx - b.x, my - b.y);
        if (db < da) wpIdx = i + 1;
        best = { pathIdx, segIdx: i, waypointIdx: wpIdx };
      }
    }
    screen.forEach((p, wpIdx) => {
      const d = Math.hypot(mx - p.x, my - p.y);
      if (d < threshold * 1.2 && d < bestD) {
        bestD = d;
        best = { pathIdx, segIdx: Math.max(0, wpIdx - 1), waypointIdx: wpIdx };
      }
    });
  });
  return best;
}

export function getPathSegmentInfo(path) {
  const pts = path.routedPath || path.points || [];
  const segments = [];
  for (let i = 1; i < pts.length; i++) {
    const dist = Math.round(Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
    segments.push({ from: pts[i - 1], to: pts[i], distance: dist });
  }
  return segments;
}

export function drawSegmentLabels(ctx, worldToIso, path, color, show) {
  if (!show) return;
  getPathSegmentInfo(path).forEach(seg => {
    const a = worldToIso(seg.from.x, seg.from.y);
    const b = worldToIso(seg.to.x, seg.to.y);
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    ctx.fillStyle = color;
    ctx.font = 'bold 9px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${seg.distance}`, mx, my - 4);
  });
}

export function drawTerritoryOverlay(ctx, worldToIso) {
  const midY = 800;
  const north = [
    worldToIso(MAP_BOUNDS.minX, MAP_BOUNDS.minY),
    worldToIso(MAP_BOUNDS.maxX, MAP_BOUNDS.minY),
    worldToIso(MAP_BOUNDS.maxX, midY),
    worldToIso(MAP_BOUNDS.minX, midY),
  ];
  const south = [
    worldToIso(MAP_BOUNDS.minX, midY),
    worldToIso(MAP_BOUNDS.maxX, midY),
    worldToIso(MAP_BOUNDS.maxX, MAP_BOUNDS.maxY),
    worldToIso(MAP_BOUNDS.minX, MAP_BOUNDS.maxY),
  ];
  ctx.save();
  ctx.beginPath();
  north.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.fillStyle = 'rgba(56,189,248,0.07)';
  ctx.fill();
  ctx.beginPath();
  south.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.fillStyle = 'rgba(251,146,60,0.07)';
  ctx.fill();
  ctx.font = 'bold 11px Inter, sans-serif';
  ctx.fillStyle = 'rgba(125,211,252,0.55)';
  ctx.textAlign = 'center';
  ctx.fillText('NORTH', (north[0].x + north[2].x) / 2, (north[0].y + north[2].y) / 2);
  ctx.fillStyle = 'rgba(253,186,116,0.55)';
  ctx.fillText('SOUTH', (south[0].x + south[2].x) / 2, (south[0].y + south[2].y) / 2);
  ctx.restore();
}

export function drawFogOfWar(ctx, worldToIso, explored, sectorKey) {
  const sectors = sectorKey === 'FULL'
    ? Object.keys(getEdenSectors())
    : [sectorKey];
  ctx.save();
  sectors.forEach(sk => {
    if (explored?.[sk]) return;
    const b = getSectorBounds(sk);
    const corners = [
      worldToIso(b.minX, b.minY),
      worldToIso(b.maxX, b.minY),
      worldToIso(b.maxX, b.maxY),
      worldToIso(b.minX, b.maxY),
    ];
    ctx.beginPath();
    corners.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
    ctx.fillStyle = 'rgba(8,6,4,0.72)';
    ctx.fill();
  });
  ctx.restore();
}

export function drawHeatmap(ctx, worldToIso, structures, scale) {
  const cell = 48;
  const buckets = new Map();
  structures.forEach(s => {
    const pts = s.points || s.metaPoints || 0;
    if (!pts) return;
    const bx = Math.floor(s.x / cell);
    const by = Math.floor(s.y / cell);
    const k = `${bx},${by}`;
    buckets.set(k, (buckets.get(k) || 0) + pts);
  });
  const max = Math.max(...buckets.values(), 1);
  buckets.forEach((val, k) => {
    const [bx, by] = k.split(',').map(Number);
    const cx = bx * cell + cell / 2;
    const cy = by * cell + cell / 2;
    const p = worldToIso(cx, cy);
    const alpha = 0.12 + (val / max) * 0.45;
    const r = (18 + (val / max) * 36) * Math.max(0.5, scale);
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
    g.addColorStop(0, `rgba(239,68,68,${alpha})`);
    g.addColorStop(1, 'rgba(239,68,68,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
  });
}

/** Hide baked capital art on the parchment reference — coord-placed icons replace them. */
export function maskReferenceCapitals(ctx, worldToIso, capitals, scale = 1) {
  if (!capitals?.length) return;
  ctx.save();
  capitals.forEach(({ x, y }) => {
    const p = worldToIso(x, y);
    const r = Math.max(22, 34 * scale);
    const cx = p.x;
    const cy = p.y - r * 0.1;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    grad.addColorStop(0, PARCHMENT_BASE.fill);
    grad.addColorStop(0.45, PARCHMENT_BASE.fill2);
    grad.addColorStop(0.78, 'rgba(201,184,142,0.72)');
    grad.addColorStop(1, 'rgba(201,184,142,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(cx, cy, r * 0.92, r * 0.68, 0, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

function sheetBaseFit(canvasW, canvasH, img, pad = 0.02) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) return 1;
  return Math.min((canvasW * (1 - pad * 2)) / iw, (canvasH * (1 - pad * 2)) / ih);
}

/** Website sector sheet — flat, unchanged, aspect-ratio preserved. */
export function drawSectorSheetFlat(ctx, canvasW, canvasH, sectorKey, opacity, camera = {}) {
  if (sectorKey === 'FULL' || !getEdenSectors()[sectorKey]) return false;
  if (!getSectorTileIds().includes(sectorKey)) return false;
  const img = getSectorTileImage(sectorKey);
  if (!isSectorTileReady(img)) return false;

  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const zoom = camera.scale ?? 1;
  const fit = sheetBaseFit(canvasW, canvasH, img) * zoom;
  const dw = iw * fit;
  const dh = ih * fit;
  const dx = (canvasW - dw) * 0.5 + (camera.offsetX ?? 0);
  const dy = (canvasH - dh) * 0.5 + (camera.offsetY ?? 0);

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.drawImage(img, 0, 0, iw, ih, dx, dy, dw, dh);
  ctx.restore();
  return true;
}

export function animateCamera(getCam, setCam, target, redraw, duration = 300) {
  const start = getCam();
  const t0 = performance.now();
  let raf = 0;
  const ease = t => 1 - (1 - t) ** 3;

  return new Promise(resolve => {
    const tick = now => {
      const p = Math.min(1, (now - t0) / duration);
      const e = ease(p);
      setCam({
        offsetX: start.offsetX + (target.offsetX - start.offsetX) * e,
        offsetY: start.offsetY + (target.offsetY - start.offsetY) * e,
        scale: start.scale + (target.scale - start.scale) * e,
      });
      redraw();
      if (p < 1) raf = requestAnimationFrame(tick);
      else { cancelAnimationFrame(raf); resolve(); }
    };
    raf = requestAnimationFrame(tick);
  });
}

export function getSectorScreenCorners(worldToIso, sectorKey, padWorld = 18) {
  const b = getSectorBounds(sectorKey);
  return [
    worldToIso(b.minX - padWorld, b.minY - padWorld),
    worldToIso(b.maxX + padWorld, b.minY - padWorld),
    worldToIso(b.maxX + padWorld, b.maxY + padWorld),
    worldToIso(b.minX - padWorld, b.maxY + padWorld),
  ];
}

export function applySectorClip(ctx, worldToIso, sectorKey, padWorld = 18) {
  const corners = getSectorScreenCorners(worldToIso, sectorKey, padWorld);
  ctx.save();
  ctx.beginPath();
  corners.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.clip();
}

export function drawSectorIsolateChrome(ctx, worldToIso, sectorKey) {
  const corners = getSectorScreenCorners(worldToIso, sectorKey, 18);
  ctx.save();
  ctx.strokeStyle = 'rgba(129,140,248,0.9)';
  ctx.lineWidth = 2.5;
  ctx.shadowColor = 'rgba(99,102,241,0.45)';
  ctx.shadowBlur = 14;
  ctx.beginPath();
  corners.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

export function pathTouchesSector(path, sectorKey) {
  if (!path || sectorKey === 'FULL') return true;
  const b = getSectorBounds(sectorKey);
  const pts = path.routedPath || path.points || [];
  return pts.some((pt) =>
    pt.x >= b.minX - 12 && pt.x <= b.maxX + 12
    && pt.y >= b.minY - 12 && pt.y <= b.maxY + 12
  );
}

export async function exportMapAsPng(mainCanvas, filename = 'eden-map.png', options = {}) {
  const { title, subtitle, footer } = options;
  const dpr = mainCanvas.width / Math.max(1, mainCanvas.clientWidth || mainCanvas.width);

  let exportCanvas = mainCanvas;

  if (title || subtitle || footer) {
    const headerH = Math.round(56 * dpr);
    const footerH = footer ? Math.round(28 * dpr) : 0;
    const off = document.createElement('canvas');
    off.width = mainCanvas.width;
    off.height = mainCanvas.height + headerH + footerH;
    const ctx = off.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, off.width, 0);
    grad.addColorStop(0, '#1e293b');
    grad.addColorStop(1, '#312e81');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, off.width, headerH);
    ctx.fillStyle = '#f8fafc';
    ctx.font = `bold ${Math.round(18 * dpr)}px Inter, sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(title || 'Eden Map Plan', 16 * dpr, headerH * 0.42);
    if (subtitle) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = `${Math.round(12 * dpr)}px Inter, sans-serif`;
      ctx.fillText(subtitle, 16 * dpr, headerH * 0.72);
    }
    ctx.drawImage(mainCanvas, 0, headerH);
    if (footer) {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, off.height - footerH, off.width, footerH);
      ctx.fillStyle = '#64748b';
      ctx.font = `${Math.round(10 * dpr)}px Inter, sans-serif`;
      ctx.fillText(footer, 16 * dpr, off.height - footerH * 0.55);
    }
    exportCanvas = off;
  }

  const link = document.createElement('a');
  link.download = filename;
  link.href = exportCanvas.toDataURL('image/png');
  link.click();
}