// Eden map visual assets — terrain patterns + structure icons.

const ASSET_ROOT = 'assets/eden-reference/';
const WORLD_W = 1700;
const WORLD_H = 1600;

/** User-cropped square faction map — trim light padding, draw as-is (no rotate/warp). */
export const FACTION_DIVISION_MAP = {
  url: `${ASSET_ROOT}faction-division-map.png`,
  rawUrl: 'assets/faction-division2.png',
  processedUrl: `${ASSET_ROOT}faction-division-map.png`,
  layout: 'rect',
  opacity: 0.96,
  bounds: { minX: 0, maxX: WORLD_W, minY: 0, maxY: WORLD_H },
  trimThreshold: 224,
  trimMinContent: 0.12,
};

// Legacy overlay (baked structures + cropped edges) — fallback only.
export const MAP_REFERENCE = {
  url: FACTION_DIVISION_MAP.url,
  rawUrl: FACTION_DIVISION_MAP.rawUrl,
  layout: FACTION_DIVISION_MAP.layout,
  processedUrl: FACTION_DIVISION_MAP.processedUrl,
  legacyUrl: `${ASSET_ROOT}eden-map-reference.png`,
  fallbackUrl: 'https://static.wixstatic.com/media/43ee96_3a8d3b6b92b247abb829f82b23585943~mv2.png/v1/fill/w_1700,h_1600,al_c,q_90,usm_0.66_1.00_0.01,enc_auto/43ee96_3a8d3b6b92b247abb829f82b23585943~mv2.png',
  opacity: FACTION_DIVISION_MAP.opacity,
  bounds: FACTION_DIVISION_MAP.bounds,
  trimThreshold: FACTION_DIVISION_MAP.trimThreshold,
  trimMinContent: FACTION_DIVISION_MAP.trimMinContent,
};

const ICON_ATLAS_JSON = `${ASSET_ROOT}icons-atlas.json`;
const ICON_ATLAS_PNG = `${ASSET_ROOT}icons-atlas.png`;
const ICON_PNG_DIR = `${ASSET_ROOT}icons/`;
const ATLAS_TYPE_ALIASES = {
  CP2: 'CP1', CP4: 'CP1', CP5: 'CP1',
  LT3: 'LT2',
  WCB: 'WC8',
};

export const EDEN_SCREENSHOT_MANIFEST_URL = `${ASSET_ROOT}eden-screenshots.manifest.json`;

let _refImage = null;
let _refLoading = false;

function trimLightBorders(source, config = MAP_REFERENCE) {
  const sw = source.naturalWidth || source.width;
  const sh = source.naturalHeight || source.height;
  if (!sw || !sh) return source;

  const canvas = document.createElement('canvas');
  canvas.width = sw;
  canvas.height = sh;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(source, 0, 0);
  const { data } = ctx.getImageData(0, 0, sw, sh);
  const threshold = config.trimThreshold ?? 224;
  const minContent = config.trimMinContent ?? 0.12;

  const grayAt = (x, y) => {
    const i = (y * sw + x) * 4;
    return (data[i] + data[i + 1] + data[i + 2]) / 3;
  };

  const rowHasContent = (y) => {
    let content = 0;
    let samples = 0;
    for (let x = 0; x < sw; x += 4) {
      if (grayAt(x, y) < threshold) content++;
      samples++;
    }
    return content / samples >= minContent;
  };

  const colHasContent = (x) => {
    let content = 0;
    let samples = 0;
    for (let y = 0; y < sh; y += 4) {
      if (grayAt(x, y) < threshold) content++;
      samples++;
    }
    return content / samples >= minContent;
  };

  let top = 0;
  while (top < sh && !rowHasContent(top)) top++;
  let bottom = sh - 1;
  while (bottom > top && !rowHasContent(bottom)) bottom--;
  let left = 0;
  while (left < sw && !colHasContent(left)) left++;
  let right = sw - 1;
  while (right > left && !colHasContent(right)) right--;

  const cw = right - left + 1;
  const ch = bottom - top + 1;
  if (cw < 8 || ch < 8 || (cw === sw && ch === sh)) return source;

  const out = document.createElement('canvas');
  out.width = cw;
  out.height = ch;
  out.getContext('2d').drawImage(canvas, left, top, cw, ch, 0, 0, cw, ch);
  return out;
}

function finishReferenceLoad(img, onReady) {
  _refImage = img.dataset.fallback ? img : trimLightBorders(img);
  _refLoading = false;
  onReady?.(_refImage);
}

export function isReferenceReady(img) {
  if (!img) return false;
  if (typeof HTMLCanvasElement !== 'undefined' && img instanceof HTMLCanvasElement) {
    return img.width > 0 && img.height > 0;
  }
  return Boolean(img.complete && img.naturalWidth);
}

export function preloadReferenceMap(onReady) {
  if (isReferenceReady(_refImage)) {
    onReady?.(_refImage);
    return _refImage;
  }
  if (_refLoading) return _refImage;
  _refLoading = true;
  const el = new Image();
  el.crossOrigin = 'anonymous';
  el.onload = () => finishReferenceLoad(el, onReady);
  el.onerror = () => {
    if (el.dataset.fallback !== '1' && MAP_REFERENCE.rawUrl) {
      el.dataset.fallback = '1';
      el.src = MAP_REFERENCE.rawUrl;
      return;
    }
    if (el.dataset.fallback !== '2' && MAP_REFERENCE.processedUrl && MAP_REFERENCE.processedUrl !== MAP_REFERENCE.url) {
      el.dataset.fallback = '2';
      el.src = MAP_REFERENCE.processedUrl;
      return;
    }
    if (el.dataset.fallback !== '3' && MAP_REFERENCE.legacyUrl) {
      el.dataset.fallback = '3';
      el.src = MAP_REFERENCE.legacyUrl;
      return;
    }
    if (el.dataset.fallback !== '4' && MAP_REFERENCE.fallbackUrl) {
      el.dataset.fallback = '4';
      el.src = MAP_REFERENCE.fallbackUrl;
      return;
    }
    _refLoading = false;
  };
  el.src = MAP_REFERENCE.url;
  return _refImage;
}

let _screenshotManifest = null;
const _screenshotImages = new Map();
let _screenshotLoading = false;

export function getScreenshotRefs() {
  return _screenshotManifest?.screenshots || [];
}

export function getScreenshotImage(id) {
  return _screenshotImages.get(id) || null;
}

export function preloadScreenshotRefs(onReady) {
  if (_screenshotManifest) {
    onReady?.(_screenshotManifest);
    return;
  }
  if (_screenshotLoading) return;
  _screenshotLoading = true;
  fetch(EDEN_SCREENSHOT_MANIFEST_URL)
    .then(r => r.json())
    .then((data) => {
      _screenshotManifest = data;
      let pending = data.screenshots?.length || 0;
      if (!pending) {
        _screenshotLoading = false;
        onReady?.(data);
        return;
      }
      const done = () => {
        pending -= 1;
        if (pending <= 0) {
          _screenshotLoading = false;
          onReady?.(data);
        }
      };
      data.screenshots.forEach((ref) => {
        const img = new Image();
        img.onload = () => { _screenshotImages.set(ref.id, img); done(); };
        img.onerror = done;
        img.src = ref.file.startsWith('screenshots/')
          ? `${ASSET_ROOT}${ref.file}`
          : `${ASSET_ROOT}screenshots/${ref.file}`;
      });
    })
    .catch(() => { _screenshotLoading = false; });
}

export function getReferenceMapImage() {
  return _refImage;
}

/** Hand-authored sprites (transparent PNGs, shared across levels). */
export const STRUCTURE_ICON_URLS = {
  CP1: 'assets/eden-reference/icons/user-gate.png',
  CP2: 'assets/eden-reference/icons/user-gate.png',
  CP3: 'assets/eden-reference/icons/user-gate.png',
  CP4: 'assets/eden-reference/icons/user-gate.png',
  CP5: 'assets/eden-reference/icons/user-gate.png',
  CP7: 'assets/eden-reference/icons/user-gate.png',
  ST1: 'assets/eden-reference/icons/user-town.png',
  ST2: 'assets/eden-reference/icons/user-town.png',
  ST3: 'assets/eden-reference/icons/user-town.png',
  LT2: 'assets/eden-reference/icons/user-town.png',
  LT3: 'assets/eden-reference/icons/user-town.png',
  LT4: 'assets/eden-reference/icons/user-town.png',
  STRHD: 'assets/eden-reference/icons/user-stronghold.png',
  CS: 'assets/eden-reference/icons/user-stronghold.png',
  C5: 'assets/eden-reference/icons/user-capital.png',
  C6: 'assets/eden-reference/icons/user-capital.png',
};

// Procedural gate placeholders only — authored Gate.png is already iso-oriented.
export const STRUCTURE_ICON_ROTATION = {};

export function getStructureIconRotation(type) {
  return STRUCTURE_ICON_ROTATION[type] || 0;
}

export const PARCHMENT_BASE = {
  fill: '#d4c4a0',
  fill2: '#c9b88e',
  stroke: '#9a8668',
  vignette: 'rgba(72,58,38,0.18)',
};

export const TERRAIN_STYLES = {
  forest:  { fill: '#b8a882', fill2: '#c9b992', stroke: '#8a7858', pattern: 'forest' },
  plains:  { fill: '#d9c9a4', fill2: '#e2d4b0', stroke: '#a89472', pattern: 'plains' },
  desert:  { fill: '#dcc9a0', fill2: '#e8d6b2', stroke: '#b09a74', pattern: 'desert' },
  wastes:  { fill: '#c4b08a', fill2: '#d2bf98', stroke: '#9a8668', pattern: 'wastes' },
  water:   { fill: '#4a8ec4', fill2: '#6eb8f0', stroke: '#1e5f94', pattern: 'water' },
  mountain:{ fill: '#a89878', fill2: '#8f7f62', stroke: '#6e5f48', pattern: 'rock' },
};

const STRUCTURE_DRAW = {
  CP1: { tier: 'cp', roof: '#94a3b8', wall: '#64748b', accent: '#cbd5e1' },
  CP2: { tier: 'cp', roof: '#a8b4c4', wall: '#6b7a8f', accent: '#dbeafe' },
  CP3: { tier: 'cp', roof: '#7dd3fc', wall: '#3b82a8', accent: '#bae6fd' },
  CP4: { tier: 'cp', roof: '#38bdf8', wall: '#2563a8', accent: '#7dd3fc' },
  CP5: { tier: 'cp', roof: '#0ea5e9', wall: '#0369a1', accent: '#38bdf8' },
  CP7: { tier: 'cp', roof: '#0284c7', wall: '#075985', accent: '#0ea5e9' },
  ST1: { tier: 'st', roof: '#4ade80', wall: '#166534', accent: '#86efac' },
  ST3: { tier: 'st', roof: '#16a34a', wall: '#14532d', accent: '#4ade80' },
  ST2: { tier: 'st', roof: '#22c55e', wall: '#14532d', accent: '#4ade80' },
  LT2: { tier: 'lt', roof: '#2563eb', wall: '#1e3a8a', accent: '#60a5fa' },
  LT3: { tier: 'lt', roof: '#3b82f6', wall: '#1e3a8a', accent: '#60a5fa' },
  LT4: { tier: 'lt', roof: '#6366f1', wall: '#312e81', accent: '#818cf8' },
  C5:  { tier: 'cap', roof: '#f59e0b', wall: '#92400e', accent: '#fbbf24' },
  C6:  { tier: 'cap', roof: '#ef4444', wall: '#7f1d1d', accent: '#f87171' },
  CS:  { tier: 'sh', roof: '#f59e0b', wall: '#92400e', accent: '#fcd34d' },
  STRHD: { tier: 'sh', roof: '#f59e0b', wall: '#92400e', accent: '#fcd34d' },
  AT:  { tier: 'at', roof: '#ec4899', wall: '#831843', accent: '#f9a8d4' },
  WCB: { tier: 'at', roof: '#d946ef', wall: '#86198f', accent: '#f0abfc' },
  WC8: { tier: 'at', roof: '#c026d3', wall: '#701a75', accent: '#e879f9' },
};

function strokePath(ctx) {
  ctx.strokeStyle = 'rgba(0,0,0,0.38)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawIsoRoof(ctx, x, y, w, h, color) {
  const hw = w / 2;
  const hh = h * 0.38;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + hw, y - hh);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + hw, y + hh);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  strokePath(ctx);
}

function drawIsoWall(ctx, x, y, w, h, wall, accent) {
  const hw = w / 2;
  const hh = h * 0.38;
  const depth = h * 0.5;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y + depth);
  ctx.lineTo(x + hw, y + hh + depth);
  ctx.lineTo(x + hw, y + hh);
  ctx.closePath();
  ctx.fillStyle = wall;
  ctx.fill();
  strokePath(ctx);
  ctx.beginPath();
  ctx.moveTo(x + w, y);
  ctx.lineTo(x + w, y + depth);
  ctx.lineTo(x + hw, y + hh + depth);
  ctx.lineTo(x + hw, y + hh);
  ctx.closePath();
  const g = ctx.createLinearGradient(x + hw, y, x + w, y + depth);
  g.addColorStop(0, wall);
  g.addColorStop(1, accent);
  ctx.fillStyle = g;
  ctx.fill();
  strokePath(ctx);
}

function drawGate(ctx, colors) {
  const wall = colors.wall;
  const accent = colors.accent;
  const roof = colors.roof;
  // Vertical gate arch (rotated onto map later)
  ctx.fillStyle = wall;
  ctx.fillRect(10, 18, 7, 22);
  ctx.fillRect(31, 18, 7, 22);
  ctx.beginPath();
  ctx.moveTo(8, 18);
  ctx.quadraticCurveTo(24, 2, 40, 18);
  ctx.lineTo(40, 22);
  ctx.quadraticCurveTo(24, 8, 8, 22);
  ctx.closePath();
  ctx.fillStyle = roof;
  ctx.fill();
  strokePath(ctx);
  ctx.fillStyle = accent;
  ctx.fillRect(17, 24, 14, 16);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(22, 28, 4, 12);
}

function drawSmallTown(ctx, colors) {
  drawIsoRoof(ctx, 2, 14, 16, 10, colors.roof);
  drawIsoWall(ctx, 2, 14, 16, 10, colors.wall, colors.accent);
  drawIsoRoof(ctx, 20, 18, 14, 8, colors.accent);
  drawIsoWall(ctx, 20, 18, 14, 8, colors.wall, colors.roof);
  drawIsoRoof(ctx, 10, 8, 12, 8, colors.roof);
  drawIsoWall(ctx, 10, 8, 12, 8, colors.wall, colors.accent);
}

function drawLargeTown(ctx, colors) {
  drawIsoRoof(ctx, 4, 10, 34, 14, colors.roof);
  drawIsoWall(ctx, 4, 10, 34, 14, colors.wall, colors.accent);
  drawIsoRoof(ctx, 14, 2, 12, 10, colors.accent);
  drawIsoWall(ctx, 14, 2, 12, 10, colors.wall, colors.roof);
  ctx.fillStyle = colors.accent;
  ctx.fillRect(6, 30, 30, 3);
  ctx.fillStyle = colors.wall;
  ctx.fillRect(6, 33, 3, 8);
  ctx.fillRect(33, 33, 3, 8);
}

function drawCapital(ctx, colors) {
  drawIsoRoof(ctx, 6, 12, 36, 16, colors.roof);
  drawIsoWall(ctx, 6, 12, 36, 16, colors.wall, colors.accent);
  drawIsoRoof(ctx, 16, 0, 16, 14, colors.accent);
  drawIsoWall(ctx, 16, 0, 16, 14, colors.wall, colors.roof);
  drawIsoRoof(ctx, 2, 18, 10, 10, colors.roof);
  drawIsoWall(ctx, 2, 18, 10, 10, colors.wall, colors.accent);
  drawIsoRoof(ctx, 36, 18, 10, 10, colors.roof);
  drawIsoWall(ctx, 36, 18, 10, 10, colors.wall, colors.accent);
  ctx.fillStyle = colors.accent;
  ctx.beginPath();
  ctx.moveTo(24, 0);
  ctx.lineTo(26, -6);
  ctx.lineTo(28, 0);
  ctx.closePath();
  ctx.fill();
}

function drawStronghold(ctx, colors) {
  drawCapital(ctx, colors);
  ctx.strokeStyle = colors.accent;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(24, -10);
  ctx.lineTo(24, -18);
  ctx.stroke();
  ctx.fillStyle = colors.accent;
  ctx.fillRect(20, -20, 8, 5);
}

function drawTemple(ctx, colors) {
  drawIsoRoof(ctx, 8, 16, 32, 18, colors.roof);
  drawIsoWall(ctx, 8, 16, 32, 18, colors.wall, colors.accent);
  ctx.beginPath();
  ctx.moveTo(24, 4);
  ctx.lineTo(30, 16);
  ctx.lineTo(18, 16);
  ctx.closePath();
  ctx.fillStyle = colors.accent;
  ctx.fill();
  strokePath(ctx);
  ctx.beginPath();
  ctx.arc(24, 10, 6, 0, Math.PI * 2);
  ctx.fillStyle = colors.roof;
  ctx.fill();
  strokePath(ctx);
  ctx.fillStyle = '#fce7f3';
  ctx.beginPath();
  ctx.moveTo(24, -2);
  ctx.lineTo(27, 4);
  ctx.lineTo(21, 4);
  ctx.closePath();
  ctx.fill();
}

function drawStructureShape(ctx, type, colors) {
  const tier = colors.tier;
  if (tier === 'cp') drawGate(ctx, colors);
  else if (tier === 'st') drawSmallTown(ctx, colors);
  else if (tier === 'lt') drawLargeTown(ctx, colors);
  else if (tier === 'cap') drawCapital(ctx, colors);
  else if (tier === 'sh') drawStronghold(ctx, colors);
  else if (tier === 'at') drawTemple(ctx, colors);
}

function bakeIcon(source, rotation = 0) {
  const sw = source.width || source.naturalWidth;
  const sh = source.height || source.naturalHeight;
  if (!sw || !sh) return source;
  const pad = Math.abs(rotation) > 0.01 ? 1.25 : 1.05;
  const cw = Math.ceil(Math.max(sw, sh) * pad);
  const ch = Math.ceil(Math.max(sw, sh) * pad);
  const canvas = document.createElement('canvas');
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext('2d');
  ctx.translate(cw / 2, ch / 2);
  if (Math.abs(rotation) > 0.01) ctx.rotate(rotation);
  ctx.drawImage(source, -sw / 2, -sh / 2, sw, sh);
  return canvas;
}

export function createStructureSprite(type, size = 28) {
  const colors = { ...STRUCTURE_DRAW[type], tier: STRUCTURE_DRAW[type]?.tier };
  if (!colors.roof) return null;

  const canvas = document.createElement('canvas');
  const scale = size / 48;
  const w = Math.ceil(size * 1.2);
  const h = Math.ceil(size * 1.25);
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.translate(w * 0.06, h * 0.08);
  ctx.scale(scale, scale);
  drawStructureShape(ctx, type, colors);

  const rotation = getStructureIconRotation(type);
  return rotation ? bakeIcon(canvas, rotation) : canvas;
}

const _spriteCache = new Map();
const _spriteLoading = new Set();
const _urlImageCache = new Map();
const _urlFailed = new Set();
let _atlasImage = null;
let _atlasMeta = null;
let _atlasLoading = false;

function usesUserIcon(type) {
  if (STRUCTURE_ICON_URLS[type]) return true;
  const key = ATLAS_TYPE_ALIASES[type] || type;
  return Boolean(STRUCTURE_ICON_URLS[key]);
}

export function isUserStructureIcon(type) {
  return usesUserIcon(type);
}

function iconPngUrl(type) {
  if (STRUCTURE_ICON_URLS[type]) return STRUCTURE_ICON_URLS[type];
  const key = ATLAS_TYPE_ALIASES[type] || type;
  if (STRUCTURE_ICON_URLS[key]) return STRUCTURE_ICON_URLS[key];
  return `${ICON_PNG_DIR}${key.toLowerCase()}.png`;
}

function atlasKey(type) {
  return _atlasMeta?.sprites?.[type] ? type : (ATLAS_TYPE_ALIASES[type] || null);
}

function sliceAtlasSprite(type) {
  const key = atlasKey(type);
  const rect = key && _atlasMeta?.sprites?.[key];
  if (!rect || !_atlasImage?.complete) return null;
  const canvas = document.createElement('canvas');
  canvas.width = rect.w;
  canvas.height = rect.h;
  canvas.getContext('2d').drawImage(
    _atlasImage, rect.x, rect.y, rect.w, rect.h, 0, 0, rect.w, rect.h,
  );
  return canvas;
}

function applyAtlasSprites(types) {
  types.forEach((type) => {
    if (usesUserIcon(type)) return;
    const cached = _spriteCache.get(type);
    if (cached instanceof HTMLImageElement) return;
    const slice = sliceAtlasSprite(type);
    if (slice) _spriteCache.set(type, slice);
  });
}

let _iconReadyCb = null;

export function onStructureIconsReady(cb) {
  _iconReadyCb = cb;
}

function loadIconAtlas(types, onDone) {
  if (_atlasMeta && _atlasImage?.complete) {
    applyAtlasSprites(types);
    onDone?.();
    return;
  }
  if (_atlasLoading) return;
  _atlasLoading = true;
  fetch(ICON_ATLAS_JSON)
    .then(r => r.json())
    .then((meta) => {
      _atlasMeta = meta;
      const img = new Image();
      img.onload = () => {
        _atlasImage = img;
        _atlasLoading = false;
        applyAtlasSprites(types);
        _iconReadyCb?.();
        onDone?.();
      };
      img.onerror = () => { _atlasLoading = false; onDone?.(); };
      img.src = ICON_ATLAS_PNG;
    })
    .catch(() => { _atlasLoading = false; onDone?.(); });
}

function fallbackStructureIcon(type) {
  if (!usesUserIcon(type)) return;
  const slice = sliceAtlasSprite(type);
  if (slice) {
    _spriteCache.set(type, slice);
    _iconReadyCb?.();
    return;
  }
  const sprite = createStructureSprite(type);
  if (sprite) {
    _spriteCache.set(type, sprite);
    _iconReadyCb?.();
  }
}

function loadIconPng(type) {
  if (_spriteCache.has(type) || _spriteLoading.has(type)) return;
  const url = iconPngUrl(type);
  if (_urlFailed.has(url)) {
    fallbackStructureIcon(type);
    return;
  }
  const shared = _urlImageCache.get(url);
  if (shared && isIconReady(shared)) {
    _spriteCache.set(type, shared);
    return;
  }
  _spriteLoading.add(type);
  const img = new Image();
  img.onload = () => {
    _spriteLoading.delete(type);
    _urlImageCache.set(url, img);
    _spriteCache.set(type, img);
    _iconReadyCb?.();
  };
  img.onerror = () => {
    _spriteLoading.delete(type);
    _urlFailed.add(url);
    if (usesUserIcon(type)) {
      loadIconAtlas([type], () => fallbackStructureIcon(type));
      return;
    }
    fallbackStructureIcon(type);
  };
  img.src = url;
}

export function loadStructureIcon(type) {
  if (_spriteCache.has(type)) return _spriteCache.get(type);
  loadIconPng(type);
  if (!usesUserIcon(type)) {
    const sprite = createStructureSprite(type);
    if (sprite) _spriteCache.set(type, sprite);
  }
  return _spriteCache.get(type) || null;
}

export function getStructureIcon(type) {
  return _spriteCache.get(type) || null;
}

/** Procedural placeholders first; per-type PNGs + atlas upgrade sprites in the background. */
export function preloadStructureIcons(types) {
  types.forEach((t) => {
    loadIconPng(t);
    loadStructureIcon(t);
  });
  loadIconAtlas(types);
}

export function isIconReady(icon) {
  if (!icon) return false;
  if (icon instanceof HTMLCanvasElement) return true;
  return icon.complete && icon.naturalWidth > 0;
}