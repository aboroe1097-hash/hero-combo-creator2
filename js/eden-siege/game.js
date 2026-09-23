// Game glue: owns the loop, the renderer choice, the audio and the HUD wiring.
//
// The loop is the only place that knows about all four. It runs the simulation
// on a fixed 1/60 s timestep regardless of display refresh rate, and the
// renderer is handed the raw frame delta for its cosmetic smoothing, so a
// 144 Hz monitor and a 30 fps phone run the identical simulation.

import { createWorld } from './sim/world.js';
import { createInput } from './engine/input.js';
import { createAudio } from './engine/audio.js';
import { createHud } from './ui/hud.js';
import { STEP_MS, MAX_STEPS_PER_FRAME, TOWERS } from './data/balance.js';
import { getCopy, formatCopy } from './data/copy.js';
import { dailySeed } from './rng.js';

const BEST_KEY_PREFIX = 'vts_siege_best_';

function readBest(mapId) {
  try {
    return Number(localStorage.getItem(BEST_KEY_PREFIX + mapId)) || 0;
  } catch {
    return 0;
  }
}

function writeBest(mapId, score) {
  try {
    localStorage.setItem(BEST_KEY_PREFIX + mapId, String(Math.round(score)));
  } catch {
    /* private mode: the run still counts, the record just does not persist */
  }
}

function detectQuality() {
  const memory = navigator.deviceMemory || 4;
  const cores = navigator.hardwareConcurrency || 4;
  const saveData = navigator.connection?.saveData;
  if (saveData || memory <= 2 || cores <= 3) return 'low';
  if (memory >= 8 && cores >= 8) return 'high';
  return 'medium';
}

export async function startSiege({
  canvas,
  hudRoot,
  mapId = 'keep',
  heroName,
  lang = 'en',
  theme = 'dark',
  reducedMotion = false,
  allowWebgl = true,
  quality: qualityOverride = null,
}) {
  const copy = getCopy(lang);
  const seed = dailySeed(mapId);
  const world = createWorld({ mapId, heroName, seed });
  // A pinned tier from ?quality= wins over detection: CI and low-end devices
  // need to be able to guarantee the cheap path, and the browser spec pins
  // 'low' so software rendering is not the thing under test.
  const quality = qualityOverride || detectQuality();
  const hud = createHud({ root: hudRoot, copy, heroName: world.state.heroName });
  const audio = createAudio();
  let best = readBest(mapId);
  let liteMode = false;

  function buildRenderer() {
    if (allowWebgl) {
      return import('./engine/renderer.js').then((module) =>
        module.createRenderer({
          canvas,
          map: world.map,
          themeName: theme,
          quality,
        })
      );
    }
    return Promise.reject(new Error('WebGL disabled by the caller'));
  }

  let renderer;
  try {
    renderer = await buildRenderer();
  } catch {
    const module = await import('./ui/fallback2d.js');
    renderer = module.createRenderer2d({ canvas, map: world.map, themeName: theme });
    liteMode = true;
  }
  renderer.setReducedMotion(reducedMotion);

  const input = createInput({
    onPause: () => setPaused(!paused),
    onRestart: () => restart(),
  });
  hud.setMuted(audio.isMuted());
  hud.setTouchVisible(matchMedia('(hover: none), (max-width: 900px)').matches);

  let paused = false;
  let destroyed = false;
  let rafId = 0;
  let accumulator = 0;
  let lastFrame = performance.now();
  let hudClock = 0;
  let lastHitSoundAt = 0;
  let lastPhase = world.state.phase;
  // Telemetry for the browser spec: a rendered frame and a simulated step are
  // different claims, and both are worth asserting on.
  let frames = 0;
  let simSteps = 0;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(320, Math.round(rect.width || canvas.clientWidth || 960));
    const height = Math.max(240, Math.round(rect.height || canvas.clientHeight || 540));
    renderer.resize(width, height);
  }

  function overlayFor(phase) {
    if (phase === 'ready') {
      const seconds = Math.max(1, Math.ceil(world.state.phaseMs / 1000));
      return {
        title: copy.phases.readyTitle,
        body: formatCopy(copy.phases.readyBody, { seconds }),
        stats: [
          { label: copy.hud.best, value: Math.round(best).toLocaleString('en-US') },
          { label: copy.challenge.daily, value: seed },
        ],
        actions: [
          { label: copy.phases.readyStart, primary: true, onClick: () => beginRun() },
          { label: copy.hud.backToArcade, onClick: () => { window.location.href = '/arcade.html'; } },
        ],
      };
    }
    if (phase === 'paused') {
      return {
        title: copy.phases.pauseTitle,
        body: copy.phases.pauseBody,
        actions: [
          { label: copy.hud.resume, primary: true, onClick: () => setPaused(false) },
          { label: copy.hud.restart, onClick: () => restart() },
        ],
      };
    }
    const victory = phase === 'victory';
    const state = world.state;
    return {
      title: victory ? copy.phases.victoryTitle : copy.phases.defeatTitle,
      body: victory ? copy.phases.victoryBody : copy.phases.defeatBody,
      stats: [
        { label: copy.results.score, value: Math.round(state.score).toLocaleString('en-US') },
        { label: copy.results.best, value: Math.round(best).toLocaleString('en-US') },
        { label: copy.results.waves, value: `${state.stats.wavesCleared} / ${state.wavesTotal}` },
        { label: copy.results.kills, value: String(state.stats.kills) },
      ],
      actions: [
        { label: copy.results.playAgain, primary: true, onClick: () => restart() },
        { label: copy.results.share, onClick: () => share() },
        { label: copy.hud.backToArcade, onClick: () => { window.location.href = '/arcade.html'; } },
      ],
    };
  }

  function beginRun() {
    audio.unlock();
    input.startGame();
    hud.setOverlay(null);
    hud.banner(formatCopy(copy.phases.waveTitle, { n: 1 }));
  }

  function restart() {
    world.input.restart = true;
    hud.setOverlay(null);
  }

  async function share() {
    const state = world.state;
    const text = `${copy.game.title} — ${world.map.nameKey ? copy.maps[world.map.nameKey] : ''} · ${Math.round(
      state.score
    ).toLocaleString('en-US')} · VTS 1097`;
    try {
      await navigator.clipboard.writeText(text);
      hud.toast(copy.results.copied);
    } catch {
      hud.toast(text);
    }
  }

  function setPaused(value) {
    if (world.state.phase === 'victory' || world.state.phase === 'defeat') return;
    paused = Boolean(value);
    hud.setPaused(paused);
    if (paused) {
      hud.setOverlay(overlayFor('paused'));
      return;
    }
    accumulator = 0;
    lastFrame = performance.now();
    if (world.state.phase === 'ready') hud.setOverlay(overlayFor('ready'));
    else hud.setOverlay(null);
  }

  function canInteract(socketIndex) {
    const socket = world.state.sockets[socketIndex];
    if (!socket) return null;
    if (!socket.occupant) {
      return world.state.gold >= TOWERS[hud.buildKind()].cost ? 'build' : null;
    }
    const tower = world.state.towers.find((entry) => entry.socket === socketIndex);
    if (!tower || tower.level >= 3) return null;
    return world.state.gold >= TOWERS[tower.kind].upgradeCosts[tower.level - 1] ? 'upgrade' : null;
  }

  function handleEvents(events) {
    for (const event of events) {
      switch (event.type) {
        case 'attack':
          audio.play(event.element === 'fire' ? 'attackFire' : 'attackIce');
          break;
        case 'hit': {
          const now = performance.now();
          if (now - lastHitSoundAt > 90) {
            lastHitSoundAt = now;
            audio.play('hit');
          }
          break;
        }
        case 'kill':
          audio.play('kill', { step: world.state.combo.count });
          break;
        case 'pickup':
          audio.play('pickup', { step: Math.min(8, world.state.combo.count) });
          break;
        case 'wave':
          hud.banner(formatCopy(copy.phases.waveTitle, { n: event.wave }), event.boss ? 'boss' : 'wave');
          audio.play(event.boss ? 'boss' : 'wave');
          break;
        case 'boss':
          hud.toast(copy.messages.bossIncoming);
          break;
        case 'buildPhase':
          hud.toast(copy.phases.buildTitle);
          break;
        case 'built':
          audio.play('build');
          hud.toast(
            formatCopy(copy.messages.socketBuilt, {
              tower: copy.towers[event.kind === 'frost' ? 'towerFrost' : 'towerEmber'],
            })
          );
          break;
        case 'upgraded':
          audio.play('build');
          hud.toast(
            formatCopy(copy.messages.socketUpgraded, {
              tower: copy.towers[event.kind === 'frost' ? 'towerFrost' : 'towerEmber'],
              level: event.level,
            })
          );
          break;
        case 'noGold':
          audio.play('ui');
          hud.toast(copy.messages.notEnoughGold);
          break;
        case 'coreHit':
          audio.play('coreHit');
          renderer.shake(0.5, 260);
          break;
        case 'playerHit':
          audio.play('playerHit');
          renderer.shake(0.3, 180);
          break;
        case 'playerDown':
          audio.play('playerDown');
          hud.toast(copy.messages.playerDown);
          break;
        case 'revived':
          audio.play('revived');
          break;
        case 'nova':
          audio.play('nova');
          renderer.shake(0.6, 320);
          break;
        case 'waveCleared':
          hud.toast(copy.messages.waveCleared);
          break;
        case 'victory':
        case 'defeat': {
          best = Math.max(best, Math.round(world.state.score));
          writeBest(mapId, best);
          hud.setOverlay(overlayFor(event.type));
          audio.play(event.type === 'victory' ? 'victory' : 'defeat');
          break;
        }
        default:
          break;
      }
    }
  }

  function frame(now) {
    if (destroyed) return;
    rafId = requestAnimationFrame(frame);
    const delta = Math.min(200, Math.max(0, now - lastFrame));
    lastFrame = now;

    if (!paused) {
      accumulator += delta;
      const command = input.read();
      let steps = 0;
      while (accumulator >= STEP_MS && steps < MAX_STEPS_PER_FRAME) {
        world.setInput(command);
        world.step();
        accumulator -= STEP_MS;
        steps += 1;
      }
      if (steps === MAX_STEPS_PER_FRAME) accumulator = 0;
      simSteps += steps;
      handleEvents(world.drainEvents());

      if (world.state.phase !== lastPhase) {
        lastPhase = world.state.phase;
        if (lastPhase === 'ready') hud.setOverlay(overlayFor('ready'));
        else if (lastPhase !== 'victory' && lastPhase !== 'defeat') hud.setOverlay(null);
      }
      renderer.render(world.state, delta, accumulator / STEP_MS);
      frames += 1;

      hudClock += delta;
      if (hudClock >= 90) {
        hudClock = 0;
        hud.update(world.state, { best });
      }
    }
  }

  // ── wiring ────────────────────────────────────────────────────────────────
  hud.on({
    swap: (element) => input.requestSwap(element),
    nova: () => input.requestNova(),
    pause: () => setPaused(!paused),
    mute: (value) => audio.setMuted(value),
    buildKind: (kind) => hud.setBuildKind(kind),
    attack: (held) => input.setAttack(held),
    stick: (x, z) => input.setStick(x, z),
    start: () => beginRun(),
    restart: () => restart(),
    share: () => share(),
  });

  function onPointerDown(event) {
    audio.unlock();
    if (paused) return;
    if (world.state.phase === 'ready') {
      beginRun();
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const socketIndex = renderer.socketAtScreen?.(event.clientX, event.clientY, rect, world.state);
    if (socketIndex !== null && socketIndex !== undefined) {
      const action = canInteract(socketIndex);
      if (action === 'build') world.input.buildSocket = socketIndex;
      else if (action === 'upgrade') world.input.upgradeSocket = socketIndex;
      return;
    }
    if (event.pointerType === 'mouse') input.setAttack(true);
  }

  function onPointerUp() {
    input.setAttack(false);
  }

  function onVisibility() {
    if (document.hidden && !paused) setPaused(true);
  }

  function onContextLost(event) {
    event.preventDefault();
    setPaused(true);
    hud.toast(copy.messages.pausedByContext ?? copy.phases.pauseTitle);
  }

  canvas.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointerup', onPointerUp);
  document.addEventListener('visibilitychange', onVisibility);
  canvas.addEventListener('webglcontextlost', onContextLost);
  window.addEventListener('resize', resize);

  hud.setBuildKind('frost');
  resize();
  hud.update(world.state, { best });
  hud.setOverlay(overlayFor('ready'));
  if (liteMode) hud.toast(copy.errors.webglBody);
  rafId = requestAnimationFrame(frame);

  return {
    world,
    hud,
    renderer,
    stats: () => ({ frames, simSteps, mode: renderer.kind, paused }),
    setTheme(next) {
      if (renderer.setTheme) renderer.setTheme(next);
    },
    setReducedMotion(value) {
      renderer.setReducedMotion(value);
    },
    setPaused,
    destroy() {
      destroyed = true;
      cancelAnimationFrame(rafId);
      canvas.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
      document.removeEventListener('visibilitychange', onVisibility);
      canvas.removeEventListener('webglcontextlost', onContextLost);
      window.removeEventListener('resize', resize);
      input.dispose();
      audio.dispose();
      renderer.dispose();
    },
  };
}
