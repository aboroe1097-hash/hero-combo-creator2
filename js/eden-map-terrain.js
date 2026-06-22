// X1 Conqueror full-map terrain — biomes, rivers, mountains + pathfinding grid
import {
  TERRAIN_STYLES, PARCHMENT_BASE, MAP_REFERENCE, EDEN_STRATEGY_FLOOR,
  getReferenceMapImage, getStrategyFloorImage, isReferenceReady, getReferenceWorldBounds,
  getScreenshotRefs, getScreenshotImage,
} from './eden-map-assets.js';

export const MAP_BOUNDS = { minX: 0, maxX: 1600, minY: 0, maxY: 1600 };
export const CELL_SIZE = 10;
export const TILE_SIZE = 40;

// Season 5 Eden Wonders — parchment map; no forest biomes (legacy X1 data removed).
const BIOMES = [
  { id: 'plains',  rects: [{ x: 0, y: 0, w: 1600, h: 820 }] },
  { id: 'desert',  rects: [{ x: 0, y: 760, w: 1600, h: 840 }, { x: 0, y: 600, w: 600, h: 1000 }] },
  { id: 'wastes',  rects: [{ x: 560, y: 680, w: 360, h: 260 }] },
];

export const RIVERS = [
  { width: 16, points: [{ x: 200, y: 60 }, { x: 260, y: 300 }, { x: 400, y: 480 }, { x: 600, y: 600 }, { x: 780, y: 680 }, { x: 980, y: 760 }, { x: 1180, y: 860 }, { x: 1380, y: 1000 }] },
  { width: 12, points: [{ x: 700, y: 80 }, { x: 680, y: 380 }, { x: 720, y: 600 }, { x: 820, y: 900 }, { x: 880, y: 1200 }] },
  { width: 10, points: [{ x: 1100, y: 180 }, { x: 1020, y: 420 }, { x: 1080, y: 680 }, { x: 1180, y: 960 }] },
  { width: 8, points: [{ x: 200, y: 1100 }, { x: 400, y: 1200 }, { x: 650, y: 1350 }] },
];

export const MOUNTAINS = [
  { polygon: [{ x: 0, y: 0 }, { x: 280, y: 0 }, { x: 360, y: 220 }, { x: 160, y: 300 }, { x: 0, y: 240 }], height: 1 },
  { polygon: [{ x: 1380, y: 0 }, { x: 1600, y: 0 }, { x: 1600, y: 280 }, { x: 1520, y: 220 }, { x: 1320, y: 100 }], height: 1 },
  { polygon: [{ x: 0, y: 1380 }, { x: 240, y: 1480 }, { x: 200, y: 1600 }, { x: 0, y: 1600 }], height: 1 },
  { polygon: [{ x: 1420, y: 1320 }, { x: 1600, y: 1280 }, { x: 1600, y: 1600 }, { x: 1380, y: 1600 }], height: 1 },
  { polygon: [{ x: 600, y: 420 }, { x: 780, y: 400 }, { x: 840, y: 520 }, { x: 700, y: 580 }, { x: 560, y: 500 }], height: 0.65 },
  { polygon: [{ x: 100, y: 700 }, { x: 260, y: 660 }, { x: 300, y: 800 }, { x: 140, y: 860 }], height: 0.75 },
  { polygon: [{ x: 1200, y: 500 }, { x: 1360, y: 480 }, { x: 1400, y: 600 }, { x: 1240, y: 640 }], height: 0.6 },
];

function pointInPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y;
    const xj = poly[j].x, yj = poly[j].y;
    if (((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
}

function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(px - ax, py - ay);
  let t = ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function nearRiver(x, y) {
  for (const river of RIVERS) {
    const pts = river.points;
    for (let i = 0; i < pts.length - 1; i++) {
      if (distToSegment(x, y, pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y) < river.width) return true;
    }
  }
  return false;
}

function inBiome(id, x, y) {
  const b = BIOMES.find(bm => bm.id === id);
  if (!b) return false;
  return b.rects.some(r => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
}

export function getTerrainAt(x, y) {
  if (MOUNTAINS.some(m => pointInPoly(x, y, m.polygon))) return 'mountain';
  if (nearRiver(x, y)) return 'water';
  if (inBiome('wastes', x, y)) return 'wastes';
  if (inBiome('desert', x, y)) return 'desert';
  if (inBiome('plains', x, y)) return 'plains';
  return 'plains';
}

function buildGrid() {
  const cols = Math.ceil((MAP_BOUNDS.maxX - MAP_BOUNDS.minX) / CELL_SIZE);
  const rows = Math.ceil((MAP_BOUNDS.maxY - MAP_BOUNDS.minY) / CELL_SIZE);
  const cost = new Float32Array(cols * rows);
  const blocked = new Uint8Array(cols * rows);

  for (let gy = 0; gy < rows; gy++) {
    for (let gx = 0; gx < cols; gx++) {
      const x = MAP_BOUNDS.minX + gx * CELL_SIZE + CELL_SIZE / 2;
      const y = MAP_BOUNDS.minY + gy * CELL_SIZE + CELL_SIZE / 2;
      const idx = gy * cols + gx;
      const terrain = getTerrainAt(x, y);

      if (terrain === 'mountain') {
        blocked[idx] = 1;
        cost[idx] = Infinity;
        continue;
      }

      let c = 1;
      if (terrain === 'water') c = 2.8;
      else if (terrain === 'desert') c = 1.15;
      else if (terrain === 'wastes') c = 1.25;
      cost[idx] = c;
    }
  }
  return { cost, blocked, cols, rows };
}

const _grid = buildGrid();

function worldToCell(x, y) {
  const gx = Math.floor((x - MAP_BOUNDS.minX) / CELL_SIZE);
  const gy = Math.floor((y - MAP_BOUNDS.minY) / CELL_SIZE);
  return {
    gx: Math.max(0, Math.min(_grid.cols - 1, gx)),
    gy: Math.max(0, Math.min(_grid.rows - 1, gy)),
  };
}

function cellToWorld(gx, gy) {
  return {
    x: MAP_BOUNDS.minX + gx * CELL_SIZE + CELL_SIZE / 2,
    y: MAP_BOUNDS.minY + gy * CELL_SIZE + CELL_SIZE / 2,
  };
}

function heuristic(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

export function findRoute(ax, ay, bx, by) {
  const start = worldToCell(ax, ay);
  const end = worldToCell(bx, by);
  const { cols, rows, cost, blocked } = _grid;

  if (blocked[start.gy * cols + start.gx] || blocked[end.gy * cols + end.gx]) {
    const direct = Math.round(Math.hypot(bx - ax, by - ay));
    return { path: [{ x: ax, y: ay }, { x: bx, y: by }], distance: direct, blocked: true };
  }

  const open = [{ gx: start.gx, gy: start.gy, f: 0, g: 0 }];
  const cameFrom = new Map();
  const gScore = new Map();
  const key = (gx, gy) => `${gx},${gy}`;
  gScore.set(key(start.gx, start.gy), 0);

  const neighbors = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];

  while (open.length) {
    open.sort((a, b) => a.f - b.f);
    const cur = open.shift();
    if (cur.gx === end.gx && cur.gy === end.gy) {
      const path = [];
      let k = key(cur.gx, cur.gy);
      let node = { gx: cur.gx, gy: cur.gy };
      while (node) {
        path.unshift(cellToWorld(node.gx, node.gy));
        const prev = cameFrom.get(k);
        if (!prev) break;
        node = prev;
        k = key(node.gx, node.gy);
      }
      path[0] = { x: ax, y: ay };
      path[path.length - 1] = { x: bx, y: by };
      let dist = 0;
      for (let i = 1; i < path.length; i++) {
        const seg = Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y);
        const mid = worldToCell((path[i].x + path[i - 1].x) / 2, (path[i].y + path[i - 1].y) / 2);
        const tc = cost[mid.gy * cols + mid.gx] || 1;
        dist += seg * tc;
      }
      return { path, distance: Math.round(dist), blocked: false };
    }

    for (const [dx, dy] of neighbors) {
      const ngx = cur.gx + dx, ngy = cur.gy + dy;
      if (ngx < 0 || ngy < 0 || ngx >= cols || ngy >= rows) continue;
      const nidx = ngy * cols + ngx;
      if (blocked[nidx]) continue;
      const step = (dx && dy) ? 1.414 : 1;
      const tg = cur.g + step * cost[nidx];
      const nk = key(ngx, ngy);
      if (tg < (gScore.get(nk) ?? Infinity)) {
        cameFrom.set(nk, { gx: cur.gx, gy: cur.gy });
        gScore.set(nk, tg);
        open.push({ gx: ngx, gy: ngy, g: tg, f: tg + heuristic(ngx, ngy, end.gx, end.gy) });
      }
    }
  }

  const direct = Math.hypot(bx - ax, by - ay);
  return { path: [{ x: ax, y: ay }, { x: bx, y: by }], distance: Math.round(direct * 1.2), blocked: true };
}

export function routeThroughWaypoints(waypoints) {
  if (!waypoints?.length) return { path: [], distance: 0 };
  if (waypoints.length === 1) return { path: [...waypoints], distance: 0 };
  let totalDist = 0;
  const fullPath = [];
  for (let i = 0; i < waypoints.length - 1; i++) {
    const seg = findRoute(waypoints[i].x, waypoints[i].y, waypoints[i + 1].x, waypoints[i + 1].y);
    totalDist += seg.distance;
    if (i === 0) fullPath.push(...seg.path);
    else fullPath.push(...seg.path.slice(1));
  }
  return { path: fullPath, distance: totalDist };
}

function drawIsoDiamond(ctx, cx, cy, w, h, style, seed = 0) {
  ctx.beginPath();
  ctx.moveTo(cx, cy - h * 0.5);
  ctx.lineTo(cx + w * 0.5, cy);
  ctx.lineTo(cx, cy + h * 0.5);
  ctx.lineTo(cx - w * 0.5, cy);
  ctx.closePath();
  const g = ctx.createLinearGradient(cx - w, cy - h, cx + w, cy + h);
  g.addColorStop(0, style.fill);
  g.addColorStop(1, style.fill2);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = style.stroke;
  ctx.lineWidth = 0.6;
  ctx.stroke();

  if (style.pattern === 'forest' && seed % 3 === 0) {
    ctx.fillStyle = 'rgba(20,60,30,0.45)';
    ctx.beginPath();
    ctx.arc(cx - 2, cy - 1, 2.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (style.pattern === 'desert' && seed % 4 === 0) {
    ctx.fillStyle = 'rgba(180,140,80,0.35)';
    ctx.fillRect(cx - 1, cy, 3, 1);
  } else if (style.pattern === 'water') {
    ctx.strokeStyle = 'rgba(180,230,255,0.35)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.25, cy);
    ctx.quadraticCurveTo(cx, cy - 2, cx + w * 0.25, cy);
    ctx.stroke();
  } else if (style.pattern === 'rock') {
    ctx.fillStyle = 'rgba(30,25,20,0.4)';
    ctx.beginPath();
    ctx.moveTo(cx, cy - h * 0.35);
    ctx.lineTo(cx + 4, cy - 2);
    ctx.lineTo(cx, cy + 2);
    ctx.lineTo(cx - 4, cy - 2);
    ctx.closePath();
    ctx.fill();
  }
}

function drawMountainIso(ctx, worldToIso, scale, mtn) {
  const pts = mtn.polygon.map(p => worldToIso(p.x, p.y));
  const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
  const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
  const h = (mtn.height || 1) * 18 * scale;
  const style = TERRAIN_STYLES.mountain;

  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  pts.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
  ctx.closePath();
  ctx.fillStyle = 'rgba(35,30,25,0.55)';
  ctx.fill();

  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const peak = worldToIso(
      mtn.polygon[i % mtn.polygon.length].x,
      mtn.polygon[i % mtn.polygon.length].y - 28 * (mtn.height || 1)
    );
    ctx.beginPath();
    ctx.moveTo(peak.x, peak.y - h);
    ctx.lineTo(p.x + 8 * scale, p.y);
    ctx.lineTo(p.x - 8 * scale, p.y);
    ctx.closePath();
    const g = ctx.createLinearGradient(peak.x, peak.y - h, p.x, p.y);
    g.addColorStop(0, style.fill2);
    g.addColorStop(1, style.fill);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = style.stroke;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

}

export function drawTexturedQuad(ctx, img, p0, p1, p2, p3) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(p0.x, p0.y);
  ctx.lineTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.lineTo(p3.x, p3.y);
  ctx.closePath();
  ctx.clip();
  const w = img.naturalWidth || img.width || 0;
  const h = img.naturalHeight || img.height || 0;
  if (!w || !h) return;
  const m11 = (p1.x - p0.x) / w;
  const m12 = (p1.y - p0.y) / w;
  const m21 = (p3.x - p0.x) / h;
  const m22 = (p3.y - p0.y) / h;
  ctx.transform(m11, m12, m21, m22, p0.x, p0.y);
  ctx.drawImage(img, 0, 0);
  ctx.restore();
}

function drawParchmentBase(ctx, worldToIso, scale = 1) {
  const b = MAP_BOUNDS;
  const corners = [
    worldToIso(b.minX, b.minY),
    worldToIso(b.maxX, b.minY),
    worldToIso(b.maxX, b.maxY),
    worldToIso(b.minX, b.maxY),
  ];
  const g = ctx.createLinearGradient(corners[0].x, corners[0].y, corners[2].x, corners[2].y);
  g.addColorStop(0, PARCHMENT_BASE.fill);
  g.addColorStop(0.55, '#ddd0b4');
  g.addColorStop(1, PARCHMENT_BASE.fill2);
  ctx.beginPath();
  corners.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = PARCHMENT_BASE.stroke;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.save();
  ctx.clip();
  ctx.strokeStyle = 'rgba(120,100,72,0.14)';
  ctx.lineWidth = 1;
  const step = Math.max(28, 56 * scale);
  for (let y = b.minY; y <= b.maxY; y += 80) {
    const pts = [];
    for (let x = b.minX; x <= b.maxX; x += 40) {
      const wobble = Math.sin((x + y) * 0.018) * 6 + Math.cos(y * 0.011) * 4;
      pts.push(worldToIso(x, y + wobble));
    }
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.stroke();
  }
  ctx.restore();
}

export function drawScreenshotRefLayer(ctx, worldToIso, sectorKey, opacity = 0.72) {
  const refs = getScreenshotRefs();
  if (!refs.length) return false;
  const active = refs.filter((ref) => {
    if (sectorKey === 'FULL') return ref.sector === 'FULL';
    return ref.sector === sectorKey;
  });
  if (!active.length) return false;

  let drew = false;
  active.forEach((ref) => {
    const img = getScreenshotImage(ref.id);
    if (!img?.complete || !img.naturalWidth) return;
    const wb = ref.worldBounds;
    const p0 = worldToIso(wb.minX, wb.minY);
    const p1 = worldToIso(wb.maxX, wb.minY);
    const p2 = worldToIso(wb.maxX, wb.maxY);
    const p3 = worldToIso(wb.minX, wb.maxY);
    ctx.save();
    ctx.globalAlpha = ref.opacity ?? opacity;
    drawTexturedQuad(ctx, img, p0, p1, p2, p3);
    ctx.restore();
    drew = true;
  });
  return drew;
}

export function drawReferenceLayer(ctx, worldToIso, opacity = MAP_REFERENCE.opacity) {
  const img = getReferenceMapImage();
  if (!isReferenceReady(img)) return false;
  const b = getReferenceWorldBounds();
  const p0 = worldToIso(b.minX, b.minY);
  const p1 = worldToIso(b.maxX, b.minY);
  const p2 = worldToIso(b.maxX, b.maxY);
  const p3 = worldToIso(b.minX, b.maxY);
  ctx.save();
  ctx.globalAlpha = opacity;
  drawTexturedQuad(ctx, img, p0, p1, p2, p3);
  ctx.restore();
  return true;
}

export function drawStrategyFloorLayer(ctx, worldToIso, opacity = EDEN_STRATEGY_FLOOR.opacity) {
  const img = getStrategyFloorImage();
  if (!isReferenceReady(img)) return false;
  const b = EDEN_STRATEGY_FLOOR.bounds;
  const p0 = worldToIso(b.minX, b.minY);
  const p1 = worldToIso(b.maxX, b.minY);
  const p2 = worldToIso(b.maxX, b.maxY);
  const p3 = worldToIso(b.minX, b.maxY);
  ctx.save();
  ctx.globalAlpha = opacity;
  if (EDEN_STRATEGY_FLOOR.layout === 'screen') {
    const xs = [p0.x, p1.x, p2.x, p3.x];
    const ys = [p0.y, p1.y, p2.y, p3.y];
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const targetW = maxX - minX;
    const imgAspect = (img.naturalWidth || img.width || 1) / (img.naturalHeight || img.height || 1);
    const aspect = EDEN_STRATEGY_FLOOR.screenAspect || imgAspect || 1.6;
    const targetH = targetW / aspect;
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    ctx.drawImage(img, cx - targetW / 2, cy - targetH / 2, targetW, targetH);
  } else {
    drawTexturedQuad(ctx, img, p0, p1, p2, p3);
  }
  ctx.restore();
  return true;
}

export function drawTerrainLayer(ctx, worldToIso, scale, options = {}) {
  const {
    showTiles = true,
    showRivers = true,
    showMountains = true,
    showStrategyFloor = false,
    showReference = false,
    showScreenshots = false,
    screenshotOpacity = 0.72,
    sectorKey = 'FULL',
    fastMode = false,
    viewBounds = null,
  } = options;

  const mapImageBase = showReference || showStrategyFloor;
  if (!mapImageBase) drawParchmentBase(ctx, worldToIso, scale);

  if (showStrategyFloor) {
    drawStrategyFloorLayer(ctx, worldToIso, options.strategyFloorOpacity ?? EDEN_STRATEGY_FLOOR.opacity);
  }

  if (showReference) {
    drawReferenceLayer(ctx, worldToIso, options.referenceOpacity ?? MAP_REFERENCE.opacity);
  }

  if (showScreenshots && !fastMode) {
    drawScreenshotRefLayer(ctx, worldToIso, sectorKey, screenshotOpacity);
  }

  if (fastMode && (showReference || showScreenshots)) return;
  if (mapImageBase && !showTiles) return;
  const tileStep = TILE_SIZE;
  const tw = tileStep * 0.5 * scale;
  const th = tileStep * 0.25 * scale;
  const pad = tileStep * 2;
  const minX = viewBounds ? Math.max(MAP_BOUNDS.minX, viewBounds.minX - pad) : MAP_BOUNDS.minX;
  const maxX = viewBounds ? Math.min(MAP_BOUNDS.maxX, viewBounds.maxX + pad) : MAP_BOUNDS.maxX;
  const minY = viewBounds ? Math.max(MAP_BOUNDS.minY, viewBounds.minY - pad) : MAP_BOUNDS.minY;
  const maxY = viewBounds ? Math.min(MAP_BOUNDS.maxY, viewBounds.maxY + pad) : MAP_BOUNDS.maxY;

  if (showTiles) {
    const useTiles = scale > 0.32 && !fastMode;
    if (useTiles) {
      for (let y = minY; y < maxY; y += tileStep) {
        for (let x = minX; x < maxX; x += tileStep) {
          const cx = (x + tileStep / 2);
          const cy = (y + tileStep / 2);
          const terrain = getTerrainAt(cx, cy);
          const style = TERRAIN_STYLES[terrain === 'water' ? 'water' : terrain] || TERRAIN_STYLES.plains;
          const p = worldToIso(cx, cy);
          const seed = Math.floor(cx / tileStep) + Math.floor(cy / tileStep) * 97;
          drawIsoDiamond(ctx, p.x, p.y, tw * 2.1, th * 2.1, style, seed);
        }
      }
    } else if (!fastMode) {
    BIOMES.forEach(biome => {
      const style = TERRAIN_STYLES[biome.id] || TERRAIN_STYLES.plains;
      biome.rects.forEach(r => {
        const corners = [
          worldToIso(r.x, r.y),
          worldToIso(r.x + r.w, r.y),
          worldToIso(r.x + r.w, r.y + r.h),
          worldToIso(r.x, r.y + r.h),
        ];
        const g = ctx.createLinearGradient(corners[0].x, corners[0].y, corners[2].x, corners[2].y);
        g.addColorStop(0, style.fill);
        g.addColorStop(1, style.fill2);
        ctx.beginPath();
        ctx.moveTo(corners[0].x, corners[0].y);
        corners.slice(1).forEach(c => ctx.lineTo(c.x, c.y));
        ctx.closePath();
        ctx.fillStyle = g;
        ctx.fill();
      });
    });
    }
  }

  if (showRivers) {
    RIVERS.forEach(river => {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (let pass = 0; pass < 3; pass++) {
        ctx.beginPath();
        river.points.forEach((pt, i) => {
          const p = worldToIso(pt.x, pt.y);
          if (i === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        });
        const widths = [river.width + 10, river.width + 4, river.width];
        const colors = ['rgba(15,50,90,0.4)', 'rgba(30,100,160,0.5)', 'rgba(56,189,248,0.85)'];
        ctx.strokeStyle = colors[pass];
        ctx.lineWidth = widths[pass] * scale * 0.11;
        ctx.stroke();
      }
    });
  }

  if (showMountains) {
    MOUNTAINS.forEach(mtn => drawMountainIso(ctx, worldToIso, scale, mtn));
  }
}

export { BIOMES };
