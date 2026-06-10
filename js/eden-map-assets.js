// Eden map visual assets — terrain patterns + structure icons.

// Community reference map (riseofcastles.net Eden Bounty layout). Calibrated to MAP_BOUNDS.
export const MAP_REFERENCE = {
  url: 'https://static.wixstatic.com/media/43ee96_3a8d3b6b92b247abb829f82b23585943~mv2.png/v1/fill/w_1700,h_1600,al_c,q_90,usm_0.66_1.00_0.01,enc_auto/43ee96_3a8d3b6b92b247abb829f82b23585943~mv2.png',
  opacity: 0.92,
  bounds: { minX: 0, maxX: 1700, minY: 0, maxY: 1600 },
};

let _refImage = null;
let _refLoading = false;

export function preloadReferenceMap(onReady) {
  if (_refImage?.complete && _refImage.naturalWidth) {
    onReady?.(_refImage);
    return _refImage;
  }
  if (_refLoading) return _refImage;
  _refLoading = true;
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    _refImage = img;
    _refLoading = false;
    onReady?.(img);
  };
  img.onerror = () => { _refLoading = false; };
  img.src = MAP_REFERENCE.url;
  return img;
}

export function getReferenceMapImage() {
  return _refImage;
}

// Paste in-game screenshot URLs per structure type to override procedural sprites.
export const STRUCTURE_ICON_URLS = {
  CP1: '',
  CP2: '',
  CP3: '',
  CP4: '',
  CP5: '',
  CP7: '',
  ST1: '',
  ST2: '',
  ST3: '',
  LT2: '',
  LT3: '',
  LT4: '',
  C5:  '',
  C6:  '',
  CS:  '',
  STRHD: '',
  AT:  '',
  WCB: '',
  WC8: '',
};

// Radians — gates face the iso map better rotated ~90° counter-clockwise.
export const STRUCTURE_ICON_ROTATION = {
  CP1: -Math.PI / 2,
  CP2: -Math.PI / 2,
  CP3: -Math.PI / 2,
  CP4: -Math.PI / 2,
  CP5: -Math.PI / 2,
  CP7: -Math.PI / 2,
};

export function getStructureIconRotation(type) {
  return STRUCTURE_ICON_ROTATION[type] || 0;
}

export const TERRAIN_STYLES = {
  forest:  { fill: '#2a5238', fill2: '#3a6b4a', stroke: '#1e3d2a', pattern: 'forest' },
  plains:  { fill: '#6d5f3a', fill2: '#8a7848', stroke: '#52482c', pattern: 'plains' },
  desert:  { fill: '#9a7a48', fill2: '#b89560', stroke: '#6e5530', pattern: 'desert' },
  wastes:  { fill: '#7a6550', fill2: '#5c4a38', stroke: '#4a3c2e', pattern: 'wastes' },
  water:   { fill: '#1a4a72', fill2: '#2d7ab8', stroke: '#0f3050', pattern: 'water' },
  mountain:{ fill: '#4a4038', fill2: '#6a5c50', stroke: '#2a2420', pattern: 'rock' },
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

export function createStructureSprite(type, size = 48) {
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

const _imageCache = new Map();
const _spriteCache = new Map();

function cacheBakedIcon(type, source) {
  const rotation = getStructureIconRotation(type);
  const baked = rotation ? bakeIcon(source, rotation) : source;
  _spriteCache.set(type, baked);
  return baked;
}

export function loadStructureIcon(type) {
  if (_spriteCache.has(type)) return _spriteCache.get(type);
  const url = STRUCTURE_ICON_URLS[type];
  if (url) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      cacheBakedIcon(type, img);
      _iconReadyCb?.();
    };
    img.src = url;
    _imageCache.set(type, img);
    return img;
  }
  const sprite = createStructureSprite(type);
  if (sprite) _spriteCache.set(type, sprite);
  return sprite;
}

export function getStructureIcon(type) {
  return _spriteCache.get(type) || _imageCache.get(type) || null;
}

let _iconReadyCb = null;

export function onStructureIconsReady(cb) {
  _iconReadyCb = cb;
}

export function preloadStructureIcons(types) {
  types.forEach(t => loadStructureIcon(t));
}

export function isIconReady(icon) {
  if (!icon) return false;
  if (icon instanceof HTMLCanvasElement) return true;
  return icon.complete && icon.naturalWidth > 0;
}