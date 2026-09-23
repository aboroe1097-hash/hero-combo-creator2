/**
 * Lazy, bounded celebration-particle pool for confirmed-success feedback (16.5.0).
 *
 * Contract: one burst lasts at most `burstDuration` ms, accepted bursts are at
 * least `minBurstInterval` ms apart, and at most `maxParticles` nodes exist at
 * once. The shared aria-hidden, pointer-events:none layer is created on the
 * first accepted burst and reused; each particle removes itself when its WAAPI
 * animation finishes, and dispose() cancels and removes everything and turns
 * later bursts into no-ops. DOM APIs only (CSP-safe), no imports, no logging.
 */

const DEFAULT_COLORS = ['#7dd3fc', '#fbbf24', '#f87171', '#a78bfa'];
const DEFAULT_MAX_PARTICLES = 24;
const DEFAULT_BURST_DURATION = 600;
const DEFAULT_MIN_BURST_INTERVAL = 1000;
const DEFAULT_PARTICLE_COUNT = 8;
const PARTICLE_SIZE = '6px';
const SPREAD_PX = 6;
const RADIAL_MIN_PX = 20;
const RADIAL_MAX_PX = 48;
const EASING = 'cubic-bezier(0.16, 1, 0.3, 1)';
const LAYER_Z_INDEX = '2147483000';

function toCount(value, fallback) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return fallback;
  return Math.floor(value);
}

function toDuration(value, fallback) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback;
}

function toInterval(value, fallback) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback;
}

function detach(element) {
  if (!element) return;
  if (typeof element.remove === 'function') {
    element.remove();
    return;
  }
  if (element.parentNode && typeof element.parentNode.removeChild === 'function') {
    element.parentNode.removeChild(element);
  }
}

function measureRect(anchor) {
  if (!anchor || typeof anchor.getBoundingClientRect !== 'function') return null;
  let rect = null;
  try {
    rect = anchor.getBoundingClientRect();
  } catch {
    return null;
  }
  if (!rect) return null;
  const values = [rect.left, rect.top, rect.width, rect.height];
  if (!values.every((value) => typeof value === 'number' && Number.isFinite(value))) return null;
  if (rect.width <= 0 && rect.height <= 0) return null;
  return rect;
}

export function createParticlePool(options = {}) {
  const doc = options.document || globalThis.document || null;
  const random = typeof options.random === 'function' ? options.random : Math.random;
  const now = typeof options.now === 'function' ? options.now : () => Date.now();
  const maxParticles = toCount(options.maxParticles, DEFAULT_MAX_PARTICLES);
  const burstDuration = toDuration(options.burstDuration, DEFAULT_BURST_DURATION);
  const minBurstInterval = toInterval(options.minBurstInterval, DEFAULT_MIN_BURST_INTERVAL);
  const particleCount = toCount(options.particleCount, DEFAULT_PARTICLE_COUNT);
  const disabled = options.disabled === true;
  const colors =
    Array.isArray(options.colors) && options.colors.length > 0
      ? options.colors.slice()
      : DEFAULT_COLORS.slice();

  const particles = new Set();
  let layer = null;
  let colorCursor = 0;
  let lastBurstAt = null;
  let disposed = false;

  function ensureLayer() {
    if (layer) return layer;
    if (!doc || !doc.body || typeof doc.createElement !== 'function') return null;
    const element = doc.createElement('div');
    element.style.position = 'fixed';
    element.style.inset = '0';
    element.style.overflow = 'hidden';
    element.style.pointerEvents = 'none';
    element.style.zIndex = LAYER_Z_INDEX;
    if (typeof element.setAttribute === 'function') element.setAttribute('aria-hidden', 'true');
    doc.body.appendChild(element);
    layer = element;
    return layer;
  }

  function removeParticle(entry) {
    if (entry.removed) return;
    entry.removed = true;
    particles.delete(entry);
    if (entry.timer !== null) {
      clearTimeout(entry.timer);
      entry.timer = null;
    }
    if (entry.animation && typeof entry.animation.cancel === 'function') {
      try {
        entry.animation.cancel();
      } catch {
        // A cancel failure must not keep the node in the DOM.
      }
    }
    detach(entry.node);
  }

  function watchParticle(entry) {
    const finished = entry.animation ? entry.animation.finished : null;
    if (finished && typeof finished.then === 'function') {
      finished.then(
        () => removeParticle(entry),
        () => removeParticle(entry)
      );
      return;
    }
    entry.timer = setTimeout(() => removeParticle(entry), burstDuration + 50);
  }

  function animateNode(node, deltaX, deltaY) {
    const keyframes = [
      { transform: 'translate(0px, 0px) scale(1)', opacity: 1 },
      { transform: `translate(${deltaX}px, ${deltaY}px) scale(0.4)`, opacity: 0 },
    ];
    try {
      return node.animate(keyframes, { duration: burstDuration, easing: EASING, fill: 'none' });
    } catch {
      return null;
    }
  }

  function burst(anchor, burstOptions = {}) {
    if (disposed || disabled || burstOptions.disabled === true) return false;
    if (!anchor || typeof anchor.animate !== 'function') return false;
    const time = now();
    if (lastBurstAt !== null && time - lastBurstAt < minBurstInterval) return false;
    const rect = measureRect(anchor);
    if (!rect) return false;
    const free = maxParticles - particles.size;
    if (free < 1) return false;
    const requested = toCount(burstOptions.particleCount, particleCount);
    const count = Math.min(requested, free);
    if (count < 1) return false;
    const palette =
      Array.isArray(burstOptions.colors) && burstOptions.colors.length > 0
        ? burstOptions.colors
        : colors;
    const layerElement = ensureLayer();
    if (!layerElement) return false;

    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    let created = 0;

    for (let index = 0; index < count; index += 1) {
      const node = doc.createElement('div');
      node.style.position = 'absolute';
      node.style.left = `${centerX + (random() - 0.5) * SPREAD_PX * 2}px`;
      node.style.top = `${centerY + (random() - 0.5) * SPREAD_PX * 2}px`;
      node.style.width = PARTICLE_SIZE;
      node.style.height = PARTICLE_SIZE;
      node.style.borderRadius = '50%';
      node.style.background = palette[colorCursor % palette.length];
      colorCursor += 1;
      layerElement.appendChild(node);

      const angle = random() * Math.PI * 2;
      const distance = RADIAL_MIN_PX + random() * (RADIAL_MAX_PX - RADIAL_MIN_PX);
      const animation = animateNode(node, Math.cos(angle) * distance, Math.sin(angle) * distance);
      if (!animation) {
        detach(node);
        continue;
      }

      const entry = { node, animation, timer: null, removed: false };
      particles.add(entry);
      created += 1;
      watchParticle(entry);
    }

    if (created < 1) return false;
    lastBurstAt = time;
    return true;
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    for (const entry of [...particles]) removeParticle(entry);
    particles.clear();
    detach(layer);
    layer = null;
  }

  return {
    burst,
    dispose,
    get liveCount() {
      return particles.size;
    },
    get disposed() {
      return disposed;
    },
  };
}
