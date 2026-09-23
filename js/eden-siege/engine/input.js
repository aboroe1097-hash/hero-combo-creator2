// Input: keyboard, gamepad and the touch controls the HUD renders.
//
// The module owns no layout. It exposes a command object the game loop feeds to
// world.setInput() every frame, and the small API the HUD's on-screen controls
// call into. Touch targets are the HUD's business (>= 44 px there).

const KEY_MAP = {
  KeyW: 'up',
  ArrowUp: 'up',
  KeyS: 'down',
  ArrowDown: 'down',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
};

export function createInput({ onPause, onRestart } = {}) {
  const keys = new Set();
  const command = {
    moveX: 0,
    moveZ: 0,
    attackHeld: false,
    swap: null,
    nova: false,
    start: false,
    restart: false,
  };

  // Virtual stick, written by the HUD's pointer handlers.
  const stick = { x: 0, z: 0, active: false };
  let touchAttack = false;
  let queuedSwap = null;
  let queuedNova = false;
  let queuedStart = false;

  function onKeyDown(event) {
    if (event.repeat) return;
    if (event.code === 'Escape' || event.code === 'KeyP') {
      onPause?.();
      return;
    }
    if (event.code === 'KeyR' && (event.shiftKey || event.metaKey || event.ctrlKey)) {
      onRestart?.();
      return;
    }
    if (KEY_MAP[event.code]) {
      keys.add(KEY_MAP[event.code]);
      event.preventDefault();
      return;
    }
    if (event.code === 'Space' || event.code === 'KeyJ') {
      command.attackHeld = true;
      event.preventDefault();
      return;
    }
    if (event.code === 'KeyQ' || event.code === 'Key1') queuedSwap = 'ice';
    if (event.code === 'KeyE' || event.code === 'Key2') queuedSwap = 'fire';
    if (event.code === 'KeyF' || event.code === 'Key3') queuedNova = true;
    if (event.code === 'Enter') queuedStart = true;
  }

  function onKeyUp(event) {
    if (KEY_MAP[event.code]) {
      keys.delete(KEY_MAP[event.code]);
      return;
    }
    if (event.code === 'Space' || event.code === 'KeyJ') command.attackHeld = false;
  }

  function onBlur() {
    keys.clear();
    command.attackHeld = false;
    stick.active = false;
    stick.x = 0;
    stick.z = 0;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);

  function readGamepad() {
    if (!navigator.getGamepads) return null;
    const pads = navigator.getGamepads();
    for (const pad of pads) {
      if (!pad || !pad.connected) continue;
      const x = pad.axes[0] || 0;
      const z = pad.axes[1] || 0;
      if (Math.abs(x) < 0.18 && Math.abs(z) < 0.18 && !pad.buttons.some((b) => b.pressed)) continue;
      return { x, z, attack: Boolean(pad.buttons[0]?.pressed), nova: Boolean(pad.buttons[1]?.pressed) };
    }
    return null;
  }

  return {
    /**
     * Produce this frame's command. Movement is a normalised vector in arena
     * space: x is width, z is depth (negative z walks toward the gates).
     */
    read() {
      let x = 0;
      let z = 0;
      if (keys.has('left')) x -= 1;
      if (keys.has('right')) x += 1;
      if (keys.has('up')) z -= 1;
      if (keys.has('down')) z += 1;
      let attack = command.attackHeld;

      if (stick.active && (stick.x || stick.z)) {
        x = stick.x;
        z = stick.z;
      }
      const pad = readGamepad();
      if (pad) {
        if (pad.x || pad.z) {
          x = pad.x;
          z = pad.z;
        }
        attack = attack || pad.attack;
        if (pad.nova) queuedNova = true;
      }
      if (touchAttack) attack = true;

      const length = Math.hypot(x, z);
      if (length > 1) {
        x /= length;
        z /= length;
      }

      command.moveX = x;
      command.moveZ = z;
      command.attackHeld = attack;
      if (queuedSwap) {
        command.swap = queuedSwap;
        queuedSwap = null;
      } else {
        command.swap = null;
      }
      command.nova = queuedNova;
      command.start = queuedStart;
      command.restart = false;
      return command;
    },
    startGame() {
      queuedStart = true;
    },
    requestRestart() {
      command.restart = true;
    },
    setStick(x, z) {
      stick.x = x;
      stick.z = z;
      stick.active = x !== 0 || z !== 0;
    },
    setAttack(held) {
      touchAttack = held;
    },
    requestSwap(element) {
      queuedSwap = element;
    },
    requestNova() {
      queuedNova = true;
    },
    dispose() {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    },
  };
}
