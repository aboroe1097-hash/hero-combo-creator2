/**
 * Seeded share-image background (16.5.x P2, plan §4.9).
 *
 * A quiet generative composition behind the existing combo export: the seed
 * comes from the normalized combo content plus a renderer version, so the
 * same combos always produce the same layout. It is decoration only: every
 * shape is low-alpha, drawn before the opaque cards and text, and a failure
 * here must never block the export (callers wrap paintShareArt).
 */

export const SHARE_ART_VERSION = 1;

const PALETTE = ['#38bdf8', '#60a5fa', '#818cf8', '#f59e0b', '#fb923c'];
const MAX_ALPHA = 0.14;

/** FNV-1a over normalized parts; stable across engines. */
export function shareArtSeed(parts, version = SHARE_ART_VERSION) {
  const text = `v${version}|${(Array.isArray(parts) ? parts : [parts])
    .map((part) =>
      String(part ?? '')
        .trim()
        .toLowerCase()
    )
    .join('|')}`;
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

export function createRandom(seed) {
  let state = seed >>> 0 || 1;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const round = (value) => Math.round(value * 10) / 10;

/** Deterministic shape list for a width x height canvas (CSS pixels). */
export function planShareArt(seed, width, height) {
  const w = Math.max(1, Number(width) || 1);
  const h = Math.max(1, Number(height) || 1);
  const random = createRandom(seed);
  const pick = () => PALETTE[Math.floor(random() * PALETTE.length)];
  const alpha = (lo, hi) => round((lo + random() * (hi - lo)) * 100) / 100;
  const shapes = [];

  // Two diagonal bands on a hidden 12-column grid.
  const angle = random() < 0.5 ? -1 : 1;
  for (let i = 0; i < 2; i += 1) {
    const column = Math.floor(random() * 12);
    shapes.push({
      type: 'band',
      x: round((column / 12) * w),
      width: round(w * (0.08 + random() * 0.14)),
      skew: round(angle * h * (0.25 + random() * 0.35)),
      height: round(h),
      color: pick(),
      alpha: alpha(0.04, 0.08),
    });
  }
  // Large rings anchored near the edges so the card column stays calm.
  const ringCount = 2 + Math.floor(random() * 2);
  for (let i = 0; i < ringCount; i += 1) {
    const edge = random() < 0.5 ? 0 : w;
    shapes.push({
      type: 'ring',
      cx: round(edge + (random() - 0.5) * w * 0.2),
      cy: round(random() * h),
      r: round(Math.min(w, h) * (0.18 + random() * 0.3)),
      lineWidth: round(8 + random() * 22),
      color: pick(),
      alpha: alpha(0.05, 0.1),
    });
  }
  // A short run of dots along one grid row.
  const row = round(h * (0.15 + random() * 0.7));
  const dotCount = 6 + Math.floor(random() * 6);
  const step = w / (dotCount + 1);
  for (let i = 1; i <= dotCount; i += 1) {
    shapes.push({
      type: 'dot',
      cx: round(step * i),
      cy: row,
      r: round(2 + random() * 3),
      color: pick(),
      alpha: alpha(0.08, MAX_ALPHA),
    });
  }
  return shapes;
}

/** Paint a plan; returns the number of shapes drawn. */
export function paintShareArt(ctx, shapes) {
  if (!ctx || !Array.isArray(shapes)) return 0;
  let drawn = 0;
  ctx.save();
  try {
    for (const shape of shapes) {
      ctx.globalAlpha = Math.min(MAX_ALPHA, Math.max(0, Number(shape.alpha) || 0));
      if (shape.type === 'band') {
        ctx.fillStyle = shape.color;
        ctx.beginPath();
        ctx.moveTo(shape.x, 0);
        ctx.lineTo(shape.x + shape.width, 0);
        ctx.lineTo(shape.x + shape.width + shape.skew, shape.height);
        ctx.lineTo(shape.x + shape.skew, shape.height);
        ctx.closePath();
        ctx.fill();
      } else if (shape.type === 'ring') {
        ctx.strokeStyle = shape.color;
        ctx.lineWidth = shape.lineWidth;
        ctx.beginPath();
        ctx.arc(shape.cx, shape.cy, shape.r, 0, Math.PI * 2);
        ctx.stroke();
      } else if (shape.type === 'dot') {
        ctx.fillStyle = shape.color;
        ctx.beginPath();
        ctx.arc(shape.cx, shape.cy, shape.r, 0, Math.PI * 2);
        ctx.fill();
      } else {
        continue;
      }
      drawn += 1;
    }
  } finally {
    ctx.restore();
  }
  return drawn;
}
