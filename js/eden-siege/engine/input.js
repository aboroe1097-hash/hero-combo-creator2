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

export function createInput({ onPause, onRestart, assistAim = false } = {}) {
  const keys = new Set();
  const command = {
    moveX: 0,
    moveZ: 0,
    aimX: 0,
    aimZ: 0,
    assistCone: assistAim,
    attackHeld: false,
    swap: null,
    nova: false,
    dash: false,
    ult: false,
    start: false,
    restart: false,
    chooseOmen: null,
    chooseBoon: null,
  };

  // The mouse pointer, for free aiming. Touch aiming goes through the stick,
  // and a coarse-pointer device keeps the assist cone unless a mouse moves.
  const pointer = { x: 0, y: 0, active: false };

  // Virtual stick, written by the HUD's pointer handlers.
  const stick = { x: 0, z: 0, active: false };
  let touchAttack = false;
  let queuedSwap = null;
  let queuedNova = false;
  let queuedDash = false;
  let queuedUlt = false;
  let queuedStart = false;
  let queuedOmen = null;
  let queuedBoon = null;
  const padLatch = { dash: false, ult: false };

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
    if (event.code === 'ShiftLeft' || event.code === 'ShiftRight' || event.code === 'KeyK') {
      queuedDash = true;
    }
    if (event.code === 'KeyR' || event.code === 'Key4') queuedUlt = true;
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

  function onPointerMove(event) {
    // A mouse aims at a point on the ground; a finger aims by moving, so only
    // a mouse pointer flips the input into free-aim mode.
    if (event.pointerType && event.pointerType !== 'mouse') return;
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    pointer.active = true;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  window.addEventListener('pointermove', onPointerMove);

  function readGamepad() {
    // Node 20 has no global navigator (the unit tests run there); a browser always does.
    if (typeof navigator === 'undefined' || !navigator.getGamepads) return null;
    const pads = navigator.getGamepads();
    for (const pad of pads) {
      if (!pad || !pad.connected) continue;
      const x = pad.axes[0] || 0;
      const z = pad.axes[1] || 0;
      if (Math.abs(x) < 0.18 && Math.abs(z) < 0.18 && !pad.buttons.some((b) => b.pressed)) continue;
      return {
        x,
        z,
        attack: Boolean(pad.buttons[0]?.pressed),
        nova: Boolean(pad.buttons[1]?.pressed),
        dash: Boolean(pad.buttons[2]?.pressed),
        ult: Boolean(pad.buttons[3]?.pressed),
      };
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
        // Edge-triggered: holding the button is one dash, not one per cooldown.
        if (pad.dash && !padLatch.dash) queuedDash = true;
        if (pad.ult && !padLatch.ult) queuedUlt = true;
        padLatch.dash = pad.dash;
        padLatch.ult = pad.ult;
      }
      if (touchAttack) attack = true;

      const length = Math.hypot(x, z);
      if (length > 1) {
        x /= length;
        z /= length;
      }

      command.moveX = x;
      command.moveZ = z;
      // Aim defaults to the direction of travel. game.js overrides it with the
      // mouse's ground point (and clears the assist cone) when a mouse moved,
      // so free aim belongs to keyboard/mouse and the cone stays for touch.
      command.aimX = x;
      command.aimZ = z;
      command.assistCone = assistAim;
      command.attackHeld = attack;
      if (queuedSwap) {
        command.swap = queuedSwap;
        queuedSwap = null;
      } else {
        command.swap = null;
      }
      command.nova = queuedNova;
      command.dash = queuedDash;
      command.ult = queuedUlt;
      command.start = queuedStart;
      command.chooseOmen = queuedOmen;
      command.chooseBoon = queuedBoon;
      queuedNova = false;
      queuedDash = false;
      queuedUlt = false;
      queuedStart = false;
      queuedOmen = null;
      queuedBoon = null;
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
    /** Last mouse position in client coordinates, and whether one has moved. */
    pointer() {
      return { x: pointer.x, y: pointer.y, active: pointer.active };
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
    requestDash() {
      queuedDash = true;
    },
    requestUlt() {
      queuedUlt = true;
    },
    /** Pick a wave omen (or 'skip'); the simulation validates the id. */
    requestOmen(id) {
      queuedOmen = id || null;
    },
    /** Pick a War Council boon; the simulation validates the id. */
    requestBoon(id) {
      queuedBoon = id || null;
    },
    dispose() {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('pointermove', onPointerMove);
    },
  };
}
