/**
 * Eden live map — LOD tile pyramid (L0 / L1 / L2) in 1600×1600 world space.
 * Tiles are georeferenced; structures/paths render on top in eden-map.js.
 */
import { EDEN_MAP_CONFIG } from './eden-map-config.js';
import { drawTexturedQuad } from './eden-map-terrain.js';

const _tileImages = new Map();
let _manifest = null;
let _loading = false;
let _loadPromise = null;

function tileKey(level, col, row) {
  return `${level}:${col}:${row}`;
}

function tileUrl(level, col, row) {
  const root = _manifest?.tileRoot || 'assets/eden-live/tiles/';
  const ext = _manifest?.tileExt || 'webp';
  return `${root}${level}/${col}_${row}.${ext}`;
}

export function getEdenLiveManifest() {
  return _manifest;
}

export function isEdenLiveMapReady() {
  return Boolean(_manifest);
}

/** Pick LOD from canvas scale (iso zoom). */
export function pickEdenLiveLod(scale, manifest = _manifest) {
  const levels = manifest?.levels || [];
  if (!levels.length) return 'L0';
  const sorted = [...levels].sort((a, b) => (a.zoomMax ?? 0) - (b.zoomMax ?? 0));
  for (const lv of sorted) {
    if (scale <= (lv.zoomMax ?? Infinity)) return lv.id;
  }
  return sorted[sorted.length - 1].id;
}

function tileGrid(manifest = _manifest) {
  const tw = manifest?.worldSize?.[0] ?? EDEN_MAP_CONFIG.worldWidth;
  const th = manifest?.worldSize?.[1] ?? EDEN_MAP_CONFIG.worldHeight;
  const size = manifest?.tileSize ?? 512;
  return {
    cols: Math.ceil(tw / size),
    rows: Math.ceil(th / size),
    tileSize: size,
    worldW: tw,
    worldH: th,
  };
}

export function getTileWorldBounds(col, row, manifest = _manifest) {
  const { tileSize, worldW, worldH } = tileGrid(manifest);
  const minX = col * tileSize;
  const minY = row * tileSize;
  return {
    minX,
    minY,
    maxX: Math.min(worldW, minX + tileSize),
    maxY: Math.min(worldH, minY + tileSize),
  };
}

function loadTileImage(level, col, row) {
  const key = tileKey(level, col, row);
  if (_tileImages.has(key)) return _tileImages.get(key);
  const img = new Image();
  img.src = tileUrl(level, col, row);
  _tileImages.set(key, img);
  return img;
}

export function preloadEdenLiveMap(onReady) {
  if (_manifest) {
    onReady?.(_manifest);
    return Promise.resolve(_manifest);
  }
  if (_loadPromise) {
    _loadPromise.then(() => onReady?.(_manifest));
    return _loadPromise;
  }
  if (_loading) return Promise.resolve(null);

  _loading = true;
  const url = EDEN_MAP_CONFIG.manifestUrl;
  _loadPromise = fetch(url)
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => {
      if (!data) return null;
      _manifest = data;
      const level = data.levels?.[0]?.id || 'L0';
      const { cols, rows } = tileGrid(data);
      let pending = cols * rows;
      const done = () => {
        pending -= 1;
        if (pending <= 0) {
          _loading = false;
          onReady?.(_manifest);
        }
      };
      for (let row = 0; row < rows; row += 1) {
        for (let col = 0; col < cols; col += 1) {
          const img = loadTileImage(level, col, row);
          if (img.complete && img.naturalWidth) done();
          else {
            img.onload = done;
            img.onerror = done;
          }
        }
      }
      return _manifest;
    })
    .catch(() => {
      _loading = false;
      return null;
    });

  return _loadPromise;
}

function drawOneTile(ctx, worldToIso, level, col, row, opacity) {
  const img = _tileImages.get(tileKey(level, col, row)) || loadTileImage(level, col, row);
  if (!img?.complete || !img.naturalWidth) return false;
  const b = getTileWorldBounds(col, row);
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

/**
 * Draw visible tiles for the current view.
 * @returns {boolean} true if any tile drew
 */
export function drawEdenLiveMapLayer(ctx, worldToIso, scale, viewBounds, opacity = 0.98) {
  if (!_manifest) return false;
  const level = pickEdenLiveLod(scale);
  const { cols, rows } = tileGrid();
  const pad = (_manifest.tileSize ?? 512) * 0.25;
  const minX = viewBounds ? viewBounds.minX - pad : 0;
  const maxX = viewBounds ? viewBounds.maxX + pad : _manifest.worldSize[0];
  const minY = viewBounds ? viewBounds.minY - pad : 0;
  const maxY = viewBounds ? viewBounds.maxY + pad : _manifest.worldSize[1];
  const size = _manifest.tileSize ?? 512;

  const c0 = Math.max(0, Math.floor(minX / size));
  const c1 = Math.min(cols - 1, Math.floor(maxX / size));
  const r0 = Math.max(0, Math.floor(minY / size));
  const r1 = Math.min(rows - 1, Math.floor(maxY / size));

  let drew = false;
  for (let row = r0; row <= r1; row += 1) {
    for (let col = c0; col <= c1; col += 1) {
      if (drawOneTile(ctx, worldToIso, level, col, row, opacity)) drew = true;
    }
  }
  return drew;
}

/** Preload all tiles for a LOD level (e.g. after sector change). */
export function preloadEdenLiveLod(level, onProgress) {
  if (!_manifest) return;
  const { cols, rows } = tileGrid();
  let pending = cols * rows;
  const tick = () => {
    pending -= 1;
    onProgress?.(1 - pending / (cols * rows));
    if (pending <= 0) onProgress?.(1);
  };
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const img = loadTileImage(level, col, row);
      if (img.complete && img.naturalWidth) tick();
      else {
        img.onload = tick;
        img.onerror = tick;
      }
    }
  }
}
