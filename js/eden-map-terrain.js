// X1 Conqueror full-map terrain — biomes, rivers, mountains + pathfinding grid
export const MAP_BOUNDS = { minX: 0, maxX: 1200, minY: 0, maxY: 1200 };
export const CELL_SIZE = 10;

const BIOMES = [
  { id: 'forest',  color: '#2d5a3d', color2: '#3d7a52', rects: [{ x: 0, y: 0, w: 1200, h: 320 }, { x: 700, y: 0, w: 500, h: 480 }] },
  { id: 'plains',  color: '#7a6b42', color2: '#9a8658', rects: [{ x: 0, y: 300, w: 1200, h: 420 }] },
  { id: 'desert',  color: '#a88452', color2: '#c9a066', rects: [{ x: 0, y: 680, w: 1200, h: 520 }, { x: 0, y: 520, w: 520, h: 700 }] },
  { id: 'wastes',  color: '#8b7355', color2: '#6e5a40', rects: [{ x: 480, y: 580, w: 280, h: 200 }] },
];

export const RIVERS = [
  { width: 14, points: [{ x: 180, y: 80 }, { x: 220, y: 280 }, { x: 340, y: 420 }, { x: 520, y: 520 }, { x: 680, y: 580 }, { x: 860, y: 640 }, { x: 1020, y: 720 }, { x: 1100, y: 880 }] },
  { width: 10, points: [{ x: 600, y: 100 }, { x: 580, y: 350 }, { x: 620, y: 550 }, { x: 700, y: 780 }, { x: 750, y: 1000 }] },
  { width: 8,  points: [{ x: 950, y: 200 }, { x: 880, y: 400 }, { x: 920, y: 600 }, { x: 1000, y: 850 }] },
];

export const MOUNTAINS = [
  { polygon: [{ x: 0, y: 0 }, { x: 200, y: 0 }, { x: 280, y: 180 }, { x: 120, y: 260 }, { x: 0, y: 200 }], height: 1 },
  { polygon: [{ x: 1050, y: 0 }, { x: 1200, y: 0 }, { x: 1200, y: 220 }, { x: 1080, y: 180 }, { x: 1000, y: 80 }], height: 1 },
  { polygon: [{ x: 0, y: 1050 }, { x: 180, y: 1100 }, { x: 160, y: 1200 }, { x: 0, y: 1200 }], height: 1 },
  { polygon: [{ x: 1000, y: 1080 }, { x: 1200, y: 1040 }, { x: 1200, y: 1200 }, { x: 980, y: 1200 }], height: 1 },
  { polygon: [{ x: 520, y: 380 }, { x: 680, y: 360 }, { x: 720, y: 460 }, { x: 600, y: 500 }, { x: 500, y: 440 }], height: 0.6 },
  { polygon: [{ x: 80, y: 600 }, { x: 200, y: 560 }, { x: 240, y: 680 }, { x: 100, y: 720 }], height: 0.7 },
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

      if (MOUNTAINS.some(m => pointInPoly(x, y, m.polygon))) {
        blocked[idx] = 1;
        cost[idx] = Infinity;
        continue;
      }

      let c = 1;
      if (nearRiver(x, y)) c = 2.8;
      else if (inBiome('forest', x, y)) c = 1.35;
      else if (inBiome('desert', x, y)) c = 1.15;
      else if (inBiome('wastes', x, y)) c = 1.25;
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
    const direct = Math.hypot(bx - ax, by - ay);
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

export function drawTerrainLayer(ctx, worldToIso, scale) {
  BIOMES.forEach(biome => {
    biome.rects.forEach(r => {
      const corners = [
        worldToIso(r.x, r.y, scale),
        worldToIso(r.x + r.w, r.y, scale),
        worldToIso(r.x + r.w, r.y + r.h, scale),
        worldToIso(r.x, r.y + r.h, scale),
      ];
      const g = ctx.createLinearGradient(corners[0].x, corners[0].y, corners[2].x, corners[2].y);
      g.addColorStop(0, biome.color);
      g.addColorStop(1, biome.color2);
      ctx.beginPath();
      ctx.moveTo(corners[0].x, corners[0].y);
      corners.slice(1).forEach(c => ctx.lineTo(c.x, c.y));
      ctx.closePath();
      ctx.fillStyle = g;
      ctx.fill();
    });
  });

  RIVERS.forEach(river => {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let pass = 0; pass < 2; pass++) {
      ctx.beginPath();
      river.points.forEach((pt, i) => {
        const p = worldToIso(pt.x, pt.y, scale);
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.strokeStyle = pass === 0 ? 'rgba(30,80,140,0.35)' : 'rgba(56,189,248,0.75)';
      ctx.lineWidth = (pass === 0 ? river.width + 6 : river.width) * scale * 0.12;
      ctx.stroke();
    }
  });

  MOUNTAINS.forEach(mtn => {
    const pts = mtn.polygon.map(p => worldToIso(p.x, p.y, scale));
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    pts.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
    ctx.closePath();
    const h = mtn.height || 1;
    ctx.fillStyle = `rgba(55,48,40,${0.55 + h * 0.25})`;
    ctx.fill();
    ctx.strokeStyle = 'rgba(30,25,20,0.6)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
    const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
    ctx.fillStyle = 'rgba(80,70,60,0.5)';
    for (let i = 0; i < 4; i++) {
      const peak = worldToIso(
        mtn.polygon[i % mtn.polygon.length].x,
        mtn.polygon[i % mtn.polygon.length].y - 20 * h,
        scale
      );
      ctx.beginPath();
      ctx.moveTo(peak.x, peak.y - 8 * scale);
      ctx.lineTo(peak.x + 6 * scale, peak.y);
      ctx.lineTo(peak.x - 6 * scale, peak.y);
      ctx.closePath();
      ctx.fill();
    }
  });
}

export { BIOMES, RIVERS };
