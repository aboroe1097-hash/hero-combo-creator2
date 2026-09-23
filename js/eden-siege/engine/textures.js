// Procedural textures. Every surface in the arena is painted here at runtime on
// a 2D canvas, so the game adds zero image bytes to the deploy.
//
// All randomness comes from a fixed seed: the same texture is produced on every
// machine, which keeps screenshots and visual review stable.

import * as THREE from 'three';
import { createRng } from '../rng.js';

const TEXTURE_SEED = 'eden-siege-textures';

function makeCanvas(size = 256) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  return canvas;
}

function finish(canvas, { repeat = 1, srgb = true } = {}) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat, repeat);
  texture.anisotropy = 4;
  if (srgb) texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function mottle(ctx, size, rng, { count = 260, radius = 26, colors, alpha = 0.35 }) {
  for (let index = 0; index < count; index += 1) {
    const x = rng.float(0, size);
    const y = rng.float(0, size);
    const r = rng.float(radius * 0.35, radius);
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
    const color = rng.pick(colors);
    gradient.addColorStop(0, color.replace('ALPHA', String(alpha)));
    gradient.addColorStop(1, color.replace('ALPHA', '0'));
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function specles(ctx, size, rng, count, color) {
  ctx.fillStyle = color;
  for (let index = 0; index < count; index += 1) {
    const x = rng.float(0, size);
    const y = rng.float(0, size);
    ctx.fillRect(x, y, rng.float(1, 2.6), rng.float(1, 2.6));
  }
}

// ── Ground surfaces ─────────────────────────────────────────────────────────
function snowstoneTexture(variant) {
  const size = 512;
  const canvas = makeCanvas(size);
  const ctx = canvas.getContext('2d');
  const rng = createRng(`${TEXTURE_SEED}:snowstone:${variant}`);
  const light = variant === 'light';
  const base = ctx.createLinearGradient(0, 0, size, size);
  base.addColorStop(0, light ? '#dfe7f0' : '#2a3a4e');
  base.addColorStop(1, light ? '#c3d1e2' : '#16212f');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);

  // Stone joints: an irregular flagstone grid, which reads as a courtyard.
  ctx.strokeStyle = light ? 'rgba(120,138,160,0.45)' : 'rgba(6,11,18,0.55)';
  ctx.lineWidth = 2;
  const cell = 64;
  for (let y = 0; y < size; y += cell) {
    for (let x = 0; x < size; x += cell) {
      const jitterX = rng.float(-4, 4);
      const jitterY = rng.float(-4, 4);
      ctx.strokeRect(x + jitterX, y + jitterY, cell - 4, cell - 4);
    }
  }
  mottle(ctx, size, rng, {
    count: 180,
    radius: 40,
    colors: light
      ? ['rgba(255,255,255,ALPHA)', 'rgba(150,168,190,ALPHA)']
      : ['rgba(126,180,255,ALPHA)', 'rgba(8,14,24,ALPHA)'],
    alpha: light ? 0.35 : 0.3,
  });
  specles(ctx, size, rng, 900, light ? 'rgba(255,255,255,0.5)' : 'rgba(190,225,255,0.28)');
  return finish(canvas, { repeat: 6 });
}

function deckTexture(variant) {
  const size = 512;
  const canvas = makeCanvas(size);
  const ctx = canvas.getContext('2d');
  const rng = createRng(`${TEXTURE_SEED}:deck:${variant}`);
  const light = variant === 'light';
  ctx.fillStyle = light ? '#b9c4d0' : '#333d49';
  ctx.fillRect(0, 0, size, size);

  // Steel deck plates with rivet rows, like the transport-ship map.
  const plate = 128;
  for (let y = 0; y < size; y += plate) {
    for (let x = 0; x < size; x += plate) {
      const shade = rng.float(-10, 12);
      ctx.fillStyle = light
        ? `rgba(${175 + shade}, ${186 + shade}, ${200 + shade}, 1)`
        : `rgba(${44 + shade}, ${54 + shade}, ${66 + shade}, 1)`;
      ctx.fillRect(x + 2, y + 2, plate - 4, plate - 4);
      ctx.strokeStyle = light ? 'rgba(120,132,146,0.7)' : 'rgba(14,20,28,0.8)';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 2, y + 2, plate - 4, plate - 4);
    }
  }
  ctx.fillStyle = light ? 'rgba(96,108,122,0.85)' : 'rgba(150,168,190,0.5)';
  for (let y = 8; y < size; y += 16) {
    for (let x = 8; x < size; x += 16) {
      ctx.beginPath();
      ctx.arc(x, y, 1.7, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  mottle(ctx, size, rng, {
    count: 120,
    radius: 46,
    colors: light ? ['rgba(255,255,255,ALPHA)'] : ['rgba(120,170,220,ALPHA)', 'rgba(90,60,30,ALPHA)'],
    alpha: 0.22,
  });
  return finish(canvas, { repeat: 4 });
}

// ── Props ───────────────────────────────────────────────────────────────────
function wallTexture(kind) {
  const size = 256;
  const canvas = makeCanvas(size);
  const ctx = canvas.getContext('2d');
  const rng = createRng(`${TEXTURE_SEED}:wall:${kind}`);
  if (kind === 'deck') {
    ctx.fillStyle = '#4a5563';
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = 'rgba(16,22,30,0.8)';
    ctx.lineWidth = 3;
    for (let y = 16; y < size; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size, y);
      ctx.stroke();
    }
  } else if (kind === 'crate') {
    ctx.fillStyle = '#6b4a2b';
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = 'rgba(38,24,12,0.85)';
    ctx.lineWidth = 4;
    for (let x = 0; x < size; x += 42) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, size);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(30,20,10,0.9)';
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, size - 8, size - 8);
  } else {
    // Stone: block courses with weathered edges.
    ctx.fillStyle = '#3a4657';
    ctx.fillRect(0, 0, size, size);
    const row = 42;
    for (let y = 0, rowIndex = 0; y < size; y += row, rowIndex += 1) {
      const offset = rowIndex % 2 ? 32 : 0;
      for (let x = -64; x < size + 64; x += 64) {
        const shade = rng.float(-14, 16);
        ctx.fillStyle = `rgb(${58 + shade}, ${70 + shade}, ${87 + shade})`;
        ctx.fillRect(x + offset + 2, y + 2, 60, row - 4);
        ctx.strokeStyle = 'rgba(12,18,26,0.75)';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + offset + 2, y + 2, 60, row - 4);
      }
    }
    mottle(ctx, size, rng, {
      count: 90,
      radius: 28,
      colors: ['rgba(255,255,255,ALPHA)', 'rgba(10,16,24,ALPHA)'],
      alpha: 0.2,
    });
  }
  return finish(canvas, { repeat: 2 });
}

function containerTexture(label) {
  const size = 256;
  const canvas = makeCanvas(size);
  const ctx = canvas.getContext('2d');
  const rng = createRng(`${TEXTURE_SEED}:container:${label}`);
  const tones = ['#8d3f33', '#2f5f6b', '#4b5a34', '#7a6a2f'];
  const base = rng.pick(tones);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);

  // Corrugation ribs.
  for (let x = 0; x < size; x += 16) {
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(x, 0, 6, size);
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    ctx.fillRect(x + 6, 0, 4, size);
  }
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, size - 6, size - 6);

  // Stencil text: the cheap way a container reads as *our* container.
  ctx.save();
  ctx.translate(size / 2, size / 2);
  ctx.font = 'bold 40px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(240,246,255,0.82)';
  ctx.fillText(label.slice(0, 10), 0, 0);
  ctx.restore();
  mottle(ctx, size, rng, { count: 60, radius: 30, colors: ['rgba(0,0,0,ALPHA)'], alpha: 0.25 });
  return finish(canvas, { repeat: 1 });
}

function bannerTexture(element) {
  const size = 256;
  const canvas = makeCanvas(size);
  const ctx = canvas.getContext('2d');
  const ice = element !== 'fire';
  const top = ice ? '#12324a' : '#4a2312';
  const bottom = ice ? '#0a1c2c' : '#2a1208';
  const hue = ice ? '#7dd3fc' : '#fb923c';
  const gradient = ctx.createLinearGradient(0, 0, 0, size);
  gradient.addColorStop(0, top);
  gradient.addColorStop(1, bottom);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = hue;
  ctx.lineWidth = 10;
  ctx.globalAlpha = 0.8;
  ctx.beginPath();
  ctx.moveTo(size * 0.5, size * 0.14);
  ctx.lineTo(size * 0.82, size * 0.52);
  ctx.lineTo(size * 0.5, size * 0.9);
  ctx.lineTo(size * 0.18, size * 0.52);
  ctx.closePath();
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.fillStyle = hue;
  ctx.beginPath();
  ctx.arc(size * 0.5, size * 0.52, size * 0.09, 0, Math.PI * 2);
  ctx.fill();
  return finish(canvas, { repeat: 1 });
}

// ── Effects ─────────────────────────────────────────────────────────────────
function radialSprite(inner, outer) {
  const size = 128;
  const canvas = makeCanvas(size);
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, inner);
  gradient.addColorStop(0.55, outer);
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function ringSprite(inner, outer) {
  const size = 256;
  const canvas = makeCanvas(size);
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(size / 2, size / 2, size * 0.18, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255,255,255,0)');
  gradient.addColorStop(0.62, inner);
  gradient.addColorStop(0.86, outer);
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createTextures() {
  return {
    snowstone: snowstoneTexture('dark'),
    snowstoneLight: snowstoneTexture('light'),
    deck: deckTexture('dark'),
    deckLight: deckTexture('light'),
    stone: wallTexture('stone'),
    deckWall: wallTexture('deck'),
    crate: wallTexture('crate'),
    glowWhite: radialSprite('rgba(255,255,255,1)', 'rgba(255,255,255,0.35)'),
    shadow: radialSprite('rgba(0,0,0,0.55)', 'rgba(0,0,0,0.22)'),
    ringIce: ringSprite('rgba(125,211,252,0.85)', 'rgba(125,211,252,0.05)'),
    ringFire: ringSprite('rgba(251,146,60,0.85)', 'rgba(251,146,60,0.05)'),
    ringNeutral: ringSprite('rgba(200,214,232,0.7)', 'rgba(200,214,232,0.04)'),
    container: (label) => containerTexture(label),
    banner: (element) => bannerTexture(element),
  };
}
