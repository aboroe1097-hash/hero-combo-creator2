// Builder view: the arena drawn on a 2D canvas for devices without WebGL.
//
// Same interface as the three.js renderer (render/resize/socketAtScreen), so the
// game loop does not know or care which one it is holding. It is deliberately
// plain — circles and tiles — but everything that matters is legible: wing
// colours, tower sockets, the stronghold's health.
//
// It doubles as the reference implementation for the simulation's coordinate
// system: x is width, z is depth, and the stronghold sits at positive z.

import { ASSETS, TOWER_ART } from '../data/theme.js';

const SCALE_RANGE = { min: 12, max: 26 };

export function createRenderer2d({ canvas, map, themeName = 'dark' }) {
  const ctx = canvas.getContext('2d');
  let width = canvas.width;
  let height = canvas.height;
  let theme = themeName;
  let scale = 18;

  function hex(value) {
    return `#${value.toString(16).padStart(6, '0')}`;
  }

  function palette() {
    const chosen = map.palette[theme] || map.palette.dark;
    return {
      sky: hex(chosen.sky),
      ground: hex(chosen.groundTop),
      groundAlt: hex(chosen.groundBottom),
    };
  }

  function toScreen(x, z, camera) {
    return {
      x: width / 2 + (x - camera.x) * scale,
      y: height / 2 + (z - camera.z) * scale,
    };
  }

  function cameraFor(state) {
    // Keep the stronghold and the player both reachable: the camera trails the
    // player but stops at the arena edges so the frame never empties out.
    const limitX = Math.max(0, map.size.w / 2 - width / (2 * scale));
    const limitZ = Math.max(0, map.size.d / 2 - height / (2 * scale));
    return {
      x: Math.max(-limitX, Math.min(limitX, state.player.x * 0.55)),
      z: Math.max(-limitZ, Math.min(limitZ, state.player.z * 0.35 + 2)),
    };
  }

  function elementColor(element) {
    return element === 'fire' ? '#fb923c' : '#7dd3fc';
  }

  function render(state, dtMs) {
    const colors = palette();
    const camera = cameraFor(state);
    ctx.clearRect(0, 0, width, height);

    const background = ctx.createLinearGradient(0, 0, 0, height);
    background.addColorStop(0, colors.sky);
    background.addColorStop(1, colors.groundAlt);
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);

    // Arena and its furniture
    const topLeft = toScreen(-map.size.w / 2, -map.size.d / 2, camera);
    ctx.fillStyle = colors.ground;
    ctx.fillRect(topLeft.x, topLeft.y, map.size.w * scale, map.size.d * scale);
    ctx.strokeStyle = 'rgba(160,190,220,0.5)';
    ctx.lineWidth = 2;
    ctx.strokeRect(topLeft.x, topLeft.y, map.size.w * scale, map.size.d * scale);

    for (const box of map.obstacles) {
      const point = toScreen(box.x - box.w / 2, box.z - box.d / 2, camera);
      ctx.fillStyle = box.texture === 'container' ? '#5b4a3a' : 'rgba(30,42,58,0.95)';
      ctx.fillRect(point.x, point.y, box.w * scale, box.d * scale);
      ctx.strokeStyle = 'rgba(200,220,245,0.35)';
      ctx.strokeRect(point.x, point.y, box.w * scale, box.d * scale);
    }

    for (const gate of map.gates) {
      const point = toScreen(gate.x, gate.z, camera);
      ctx.fillStyle = elementColor(gate.element);
      ctx.beginPath();
      ctx.arc(point.x, point.y, 0.7 * scale, 0, Math.PI * 2);
      ctx.fill();
    }

    // Sockets
    for (const socket of state.sockets) {
      const point = toScreen(socket.x, socket.z, camera);
      ctx.strokeStyle = socket.occupant ? 'rgba(120,140,165,0.35)' : 'rgba(210,230,255,0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(point.x, point.y, 1.1 * scale, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Towers
    for (const tower of state.towers) {
      const point = toScreen(tower.x, tower.z, camera);
      ctx.fillStyle = tower.kind === 'frost' ? '#2f6f8f' : '#8a3f1d';
      ctx.fillRect(point.x - 0.7 * scale, point.y - 0.7 * scale, 1.4 * scale, 1.4 * scale);
      ctx.fillStyle = tower.kind === 'frost' ? '#bfe9ff' : '#f5c451';
      ctx.beginPath();
      ctx.arc(point.x, point.y, 0.34 * scale, 0, Math.PI * 2);
      ctx.fill();
      for (let level = 1; level < tower.level; level += 1) {
        ctx.fillStyle = '#f5c451';
        ctx.fillRect(point.x + 0.8 * scale + (level - 1) * 0.3 * scale, point.y - 0.2 * scale, 0.22 * scale, 0.22 * scale);
      }
    }

    // Stronghold
    const core = toScreen(state.core.x, state.core.z, camera);
    const hpRatio = Math.max(0, state.core.hp / state.core.maxHp);
    ctx.fillStyle = hpRatio > 0.5 ? '#3f5a7a' : hpRatio > 0.25 ? '#7a6a3f' : '#7a3f3f';
    ctx.beginPath();
    ctx.arc(core.x, core.y, state.core.radius * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = hpRatio > 0.25 ? '#7dd3fc' : '#ef4444';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Pickups
    for (const pickup of state.pickups) {
      const point = toScreen(pickup.x, pickup.z, camera);
      ctx.fillStyle = pickup.color === 'gold' ? '#f5c451' : pickup.color === 'purple' ? '#a78bfa' : '#7dd3fc';
      ctx.fillRect(point.x - 0.28 * scale, point.y - 0.28 * scale, 0.56 * scale, 0.56 * scale);
    }

    // Enemies
    for (const unit of state.units) {
      const point = toScreen(unit.x, unit.z, camera);
      ctx.fillStyle = elementColor(unit.element);
      ctx.globalAlpha = unit.hitFlashMs > 0 ? 1 : 0.85;
      ctx.beginPath();
      ctx.arc(point.x, point.y, unit.radius * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(6,10,16,0.85)';
      ctx.font = `${Math.max(9, scale * 0.5)}px "JetBrains Mono", monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(String(unit.tier), point.x, point.y + scale * 0.2);
      if (unit.kind === 'dreadnought') {
        ctx.strokeStyle = '#f5c451';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(point.x, point.y, unit.radius * scale + 2, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // Projectiles
    for (const bolt of state.projectiles) {
      const point = toScreen(bolt.x, bolt.z, camera);
      ctx.fillStyle = elementColor(bolt.element);
      ctx.beginPath();
      ctx.arc(point.x, point.y, Math.max(2, bolt.radius * scale * 0.7), 0, Math.PI * 2);
      ctx.fill();
    }

    // Effects
    for (const effect of state.fx) {
      const point = toScreen(effect.x, effect.z, camera);
      const life = 1 - effect.ttlMs / effect.maxTtlMs;
      ctx.strokeStyle = elementColor(effect.element);
      ctx.globalAlpha = Math.max(0, 1 - life);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(point.x, point.y, effect.scale * (0.4 + life) * scale * 0.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Player
    const player = toScreen(state.player.x, state.player.z, camera);
    if (state.player.alive) {
      ctx.save();
      ctx.translate(player.x, player.y);
      ctx.rotate(Math.atan2(state.player.aimZ, state.player.aimX) - Math.PI / 2);
      ctx.fillStyle = state.player.element === 'fire' ? '#fb923c' : '#7dd3fc';
      ctx.beginPath();
      ctx.moveTo(0, -0.75 * scale);
      ctx.lineTo(0.55 * scale, 0.6 * scale);
      ctx.lineTo(-0.55 * scale, 0.6 * scale);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.strokeStyle = state.player.slowMs > 0 ? '#9fb0cc' : 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(player.x, player.y, 0.85 * scale, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function resize(nextWidth, nextHeight) {
    width = nextWidth;
    height = nextHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(nextWidth * dpr);
    canvas.height = Math.round(nextHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    scale = Math.max(
      SCALE_RANGE.min,
      Math.min(SCALE_RANGE.max, Math.min(nextWidth / map.size.w, nextHeight / map.size.d) * 1.35)
    );
  }

  // Screen-space pick: the same call the WebGL renderer answers, so the game
  // glue can treat both identically.
  function socketAtScreen(clientX, clientY, rect, state) {
    const camera = cameraFor(state);
    let bestIndex = null;
    let bestDistance = 1.6;
    for (const socket of state.sockets) {
      const screen = toScreen(socket.x, socket.z, camera);
      const localX = ((clientX - rect.left) / rect.width) * width;
      const localY = ((clientY - rect.top) / rect.height) * height;
      const distance = Math.hypot(screen.x - localX, screen.y - localY) / scale;
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = socket.index;
      }
    }
    return bestIndex;
  }

  return {
    kind: '2d',
    render,
    resize,
    setTheme: (next) => {
      theme = next;
    },
    setReducedMotion: () => {},
    shake: () => {},
    socketAtScreen,
    assets: ASSETS,
    towerArt: TOWER_ART,
    dispose: () => {},
  };
}
