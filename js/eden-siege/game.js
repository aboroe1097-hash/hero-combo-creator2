// Game glue: owns the loop, the renderer choice, the audio and the HUD wiring.
//
// The loop is the only place that knows about all four. It runs the simulation
// on a fixed 1/60 s timestep regardless of display refresh rate, and the
// renderer is handed the raw frame delta for its cosmetic smoothing, so a
// 144 Hz monitor and a 30 fps phone run the identical simulation.
//
// Game feel lives here too, and none of it touches the simulation: hit-stop
// only delays *when* the next steps run, shake/sparks/numbers are drawn from
// the event stream, and haptics are a side channel. A replay of seed + inputs
// is therefore unaffected by any of it.

import { createWorld } from './sim/world.js';
import { createInput } from './engine/input.js';
import { createAudio } from './engine/audio.js';
import { createHud } from './ui/hud.js';
import { STEP_MS, MAX_STEPS_PER_FRAME, TOWERS, TOWER_MAX_LEVEL } from './data/balance.js';
import { getCopy, formatCopy } from './data/copy.js';
import { dailySeed, dailySiegeFor } from './rng.js';
import { createProgress, summarizeRun } from './progress.js';

const TUTORIAL_KEY = 'vts_siege_tutorial_v1';
const STREAK_THRESHOLDS = [5, 10, 15, 25, 40];
const HITSTOP_FRAMES = { crit: 2, multi: 3, boss: 4 };
const SLOW_FRAME_MS = 20;

function detectQuality() {
  const memory = navigator.deviceMemory || 4;
  const cores = navigator.hardwareConcurrency || 4;
  const saveData = navigator.connection?.saveData;
  if (saveData || memory <= 2 || cores <= 3) return 'low';
  if (memory >= 8 && cores >= 8) return 'high';
  return 'medium';
}

export function tutorialSeen() {
  try {
    return localStorage.getItem(TUTORIAL_KEY) === 'done';
  } catch {
    return false;
  }
}

function markTutorialSeen() {
  try {
    localStorage.setItem(TUTORIAL_KEY, 'done');
  } catch {
    /* private mode: the tutorial simply offers itself again next time */
  }
}

function formatTime(ms) {
  const seconds = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

/** Resolve the run's seed from its mode. The Daily Siege is the shared one. */
export function seedFor(mode, mapId, date = new Date()) {
  if (mode === 'daily') return dailySiegeFor(date).seed;
  if (mode === 'endless') return `${mapId}:endless:${date.toISOString().slice(0, 10)}`;
  return dailySeed(mapId, date);
}

export async function startSiege({
  canvas,
  hudRoot,
  mapId = 'keep',
  mode = 'campaign',
  heroName,
  lang = 'en',
  theme = 'dark',
  reducedMotion = false,
  allowWebgl = true,
  quality: qualityOverride = null,
  tutorial = false,
  links = {},
}) {
  const copy = getCopy(lang);
  const seed = seedFor(mode, mapId);
  const world = createWorld({ mapId, heroName, seed, mode, tutorial });
  // A pinned tier from ?quality= wins over detection: CI and low-end devices
  // need to be able to guarantee the cheap path, and the browser spec pins
  // 'low' so software rendering is not the thing under test.
  const quality = qualityOverride || detectQuality();
  const hud = createHud({ root: hudRoot, copy, heroName: world.state.heroName });
  const audio = createAudio();
  const progress = createProgress();
  let best = progress.best(mapId, mode);
  let liteMode = false;
  let motionReduced = Boolean(reducedMotion);
  const coarsePointer = matchMedia('(pointer: coarse)').matches;

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
  renderer.setReducedMotion(motionReduced);

  const input = createInput({
    onPause: () => setPaused(!paused),
    onRestart: () => restart(),
  });
  hud.setMuted(audio.isMuted());
  hud.setTouchVisible(matchMedia('(hover: none), (max-width: 900px)').matches);

  let paused = false;
  let destroyed = false;
  let rafId = null;
  let accumulator = 0;
  let lastFrame = performance.now();
  let hudClock = 0;
  let lastHitSoundAt = 0;
  let lastPhase = world.state.phase;
  let hitStopFrames = 0;
  let hitStops = 0;
  let streakLevel = 0;
  let lastResult = null;
  const hintsShown = new Set();

  // Auto-quality: average frame time over a window, two slow windows in a row
  // (after a warm-up for shader compilation) drop to the low tier once.
  const perf = { sum: 0, count: 0, slowWindows: 0, warmupMs: 2500, downgraded: false };

  function isTerminalPhase() {
    return world.state.phase === 'victory' || world.state.phase === 'defeat';
  }

  function stopFrame() {
    if (rafId === null) return;
    cancelAnimationFrame(rafId);
    rafId = null;
  }

  function scheduleFrame() {
    if (destroyed || paused || rafId !== null) return;
    rafId = requestAnimationFrame(frame);
  }
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

  // ── feel helpers ──────────────────────────────────────────────────────────
  function buzz(pattern) {
    if (!coarsePointer || motionReduced || typeof navigator.vibrate !== 'function') return;
    try {
      navigator.vibrate(pattern);
    } catch {
      /* haptics are optional */
    }
  }

  function hitStop(frameCount) {
    if (motionReduced) return;
    hitStopFrames = Math.max(hitStopFrames, frameCount);
    hitStops += 1;
  }

  function shake(amount, ms) {
    if (motionReduced) return;
    renderer.shake(amount, ms);
  }

  function floatAt(x, z, text, tone, height = 1.6) {
    if (!renderer.project) return;
    const rect = canvas.getBoundingClientRect();
    const point = renderer.project(x, height, z, rect.width, rect.height);
    if (!point || point.x < 0 || point.y < 0 || point.x > rect.width || point.y > rect.height) return;
    hud.floatText(point.x, point.y, text, tone);
  }

  // ── overlays ──────────────────────────────────────────────────────────────
  function modeHref(nextMode, nextMap = mapId) {
    const params = new URLSearchParams(window.location.search);
    params.set('mode', nextMode);
    if (nextMode === 'daily') params.delete('map');
    else params.set('map', nextMap);
    params.delete('tutorial');
    return `${window.location.pathname}?${params.toString()}`;
  }

  function readyChips() {
    const today = dailySiegeFor();
    const chips = [
      {
        label: copy.modes.label,
        items: ['campaign', 'endless', 'daily'].map((entry) => ({
          label: copy.modes[entry],
          href: modeHref(entry),
          active: entry === mode,
          title: formatCopy(copy.modes[`${entry}Desc`], { date: today.stamp }),
        })),
      },
    ];
    if (mode !== 'daily') {
      chips.push({
        label: copy.modes.arena,
        items: (links.maps || []).map((entry) => {
          const stars = progress.mapStars(entry.id);
          return {
            label: `${copy.maps[entry.nameKey] || entry.id}${stars ? ` ${'★'.repeat(stars)}` : ''}`,
            href: modeHref(mode, entry.id),
            active: entry.id === mapId,
          };
        }),
      });
    }
    return chips;
  }

  function overlayFor(phase) {
    if (phase === 'ready') {
      const seconds = Math.max(1, Math.ceil(world.state.phaseMs / 1000));
      const today = dailySiegeFor();
      const body =
        mode === 'daily'
          ? formatCopy(copy.modes.dailyDesc, { date: today.stamp })
          : mode === 'endless'
            ? copy.modes.endlessDesc
            : formatCopy(copy.phases.readyBody, { seconds });
      return {
        title: mode === 'campaign' ? copy.phases.readyTitle : copy.modes[mode],
        body,
        stars: progress.stars(mapId, mode),
        chips: readyChips(),
        stats: [
          { label: copy.hud.best, value: Math.round(best).toLocaleString('en-US') },
          { label: copy.challenge.seed, value: seed },
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
    const result = lastResult || { stars: 0, newBest: false };
    const history = progress.history(4).map(
      (run) =>
        `${'★'.repeat(run.stars || 0)}${'☆'.repeat(3 - (run.stars || 0))} ${copy.modes[run.mode] || run.mode} · ${
          copy.maps[run.mapId === 'ship' ? 'mapShipName' : 'mapKeepName']
        } · ${Math.round(run.score).toLocaleString('en-US')} · ${copy.hud.wave} ${run.wavesCleared}`
    );
    const actions = [];
    if (victory && !state.endless) {
      actions.push({ label: copy.results.continueEndless, primary: true, onClick: () => continueEndless() });
      actions.push({ label: copy.results.playAgain, onClick: () => restart() });
    } else {
      actions.push({ label: copy.results.playAgain, primary: true, onClick: () => restart() });
    }
    if (mode !== 'daily') {
      actions.push({ label: copy.results.playDaily, onClick: () => { window.location.href = modeHref('daily'); } });
    }
    actions.push({ label: copy.results.share, onClick: () => share() });
    actions.push({ label: copy.hud.backToArcade, onClick: () => { window.location.href = '/arcade.html'; } });
    return {
      title: victory ? copy.phases.victoryTitle : copy.phases.defeatTitle,
      body: victory ? copy.phases.victoryBody : copy.phases.defeatBody,
      badge: result.newBest ? copy.results.newBest : state.campaignCleared && victory ? copy.results.campaignWon : '',
      stars: result.stars,
      stats: [
        { label: copy.results.score, value: Math.round(state.score).toLocaleString('en-US') },
        { label: copy.results.best, value: Math.round(best).toLocaleString('en-US') },
        {
          label: copy.results.waves,
          value: state.endless ? String(state.stats.wavesCleared) : `${state.stats.wavesCleared} / ${state.wavesTotal}`,
        },
        { label: copy.results.kills, value: String(state.stats.kills) },
        { label: copy.results.maxChain, value: String(state.stats.maxChain) },
        { label: copy.results.towers, value: String(state.stats.towersBuilt) },
        { label: copy.results.bossKills, value: String(state.stats.bossKills) },
        { label: copy.results.time, value: formatTime(state.timeMs) },
      ],
      history,
      historyLabel: copy.results.history,
      actions,
    };
  }

  function beginRun() {
    audio.unlock();
    input.startGame();
    hud.setOverlay(null);
    if (world.state.tutorial.enabled && !world.state.tutorial.done) {
      hud.banner(copy.tutorial.title);
      hud.toast(copy.tutorial.body);
    } else {
      hud.banner(formatCopy(copy.phases.waveTitle, { n: 1 }));
    }
  }

  function restart() {
    world.reset();
    paused = false;
    hud.setPaused(false);
    accumulator = 0;
    hitStopFrames = 0;
    streakLevel = 0;
    lastResult = null;
    lastFrame = performance.now();
    lastPhase = world.state.phase;
    hud.setOverlay(overlayFor('ready'));
    scheduleFrame();
  }

  function continueEndless() {
    world.setInput({ continueEndless: true });
    world.step();
    handleEvents(world.drainEvents());
    lastPhase = world.state.phase;
    hud.setOverlay(null);
    accumulator = 0;
    lastFrame = performance.now();
    scheduleFrame();
  }

  async function share() {
    const state = world.state;
    const modeLabel = copy.modes[mode] || '';
    const stars = lastResult ? `${'★'.repeat(lastResult.stars)}${'☆'.repeat(3 - lastResult.stars)} ` : '';
    const text = `${copy.game.title} — ${modeLabel} · ${world.map.nameKey ? copy.maps[world.map.nameKey] : ''} · ${stars}${Math.round(
      state.score
    ).toLocaleString('en-US')} · ${copy.hud.wave} ${state.stats.wavesCleared} · VTS 1097`;
    try {
      await navigator.clipboard.writeText(text);
      hud.toast(copy.results.copied);
    } catch {
      hud.toast(text);
    }
  }

  function setPaused(value) {
    if (isTerminalPhase() || destroyed) return;
    paused = Boolean(value);
    hud.setPaused(paused);
    if (paused) {
      stopFrame();
      hud.setOverlay(overlayFor('paused'));
      return;
    }
    accumulator = 0;
    lastFrame = performance.now();
    if (world.state.phase === 'ready') hud.setOverlay(overlayFor('ready'));
    else hud.setOverlay(null);
    scheduleFrame();
  }

  function towerLabel(kind) {
    return copy.towers[kind === 'frost' ? 'towerFrost' : 'towerEmber'];
  }

  function canInteract(socketIndex) {
    const socket = world.state.sockets[socketIndex];
    if (!socket) return null;
    if (!socket.occupant) {
      return world.state.gold >= TOWERS[hud.buildKind()].cost ? 'build' : 'noGoldBuild';
    }
    const tower = world.state.towers.find((entry) => entry.socket === socketIndex);
    if (!tower) return null;
    if (tower.level >= TOWER_MAX_LEVEL) return 'max';
    return world.state.gold >= TOWERS[tower.kind].upgradeCosts[tower.level - 1] ? 'upgrade' : 'noGoldUpgrade';
  }

  function recordRun() {
    const summary = summarizeRun(world.state);
    lastResult = progress.record(summary);
    best = Math.max(best, lastResult.best || 0);
  }

  function handleEvents(events) {
    let killsThisFrame = 0;
    for (const event of events) {
      switch (event.type) {
        case 'attack':
          audio.play(event.element === 'fire' ? 'attackFire' : 'attackIce');
          break;
        case 'hit': {
          const now = performance.now();
          if (now - lastHitSoundAt > 70) {
            lastHitSoundAt = now;
            audio.play(event.element === 'fire' ? 'hitFire' : 'hitIce');
          }
          renderer.spark?.(event.x, event.z, event.element, {
            count: event.source === 'tower' ? 3 : 5,
            crit: event.crit,
          });
          if (event.source === 'player' || event.source === 'nova' || event.source === 'ult' || event.crit) {
            floatAt(
              event.x,
              event.z,
              String(Math.max(1, Math.round(event.amount))),
              event.crit ? 'crit' : event.element
            );
          }
          if (event.crit) audio.play('crit');
          break;
        }
        case 'kill':
          killsThisFrame += 1;
          audio.play(event.element === 'fire' ? 'killFire' : 'killIce', { step: world.state.combo.count });
          renderer.spark?.(event.x, event.z, event.element, { count: 8, crit: event.crit, speed: 6 });
          if (event.crit && !event.boss) {
            hitStop(HITSTOP_FRAMES.crit);
            shake(0.22, 140);
          }
          break;
        case 'bossDown':
          hitStop(HITSTOP_FRAMES.boss);
          shake(0.9, 520);
          buzz([40, 30, 60]);
          audio.play('bossDown');
          hud.announce(copy.messages.bossDown, 'boss');
          break;
        case 'pickup':
          audio.play('pickup', { step: Math.min(8, world.state.combo.count) });
          if (event.x !== undefined) floatAt(event.x, event.z, `+${event.value}`, 'gold', 1.1);
          break;
        case 'wave':
          if (event.tutorial) break;
          hud.banner(formatCopy(copy.phases.waveTitle, { n: event.wave }), event.boss ? 'boss' : 'wave');
          audio.play(event.boss ? 'boss' : 'wave');
          break;
        case 'spawn':
          if (event.modifier && !hintsShown.has(event.modifier)) {
            hintsShown.add(event.modifier);
            hud.toast(copy.modifiers[`${event.modifier}Hint`]);
          }
          break;
        case 'boss':
          hud.toast(copy.messages.bossIncoming);
          break;
        case 'telegraph':
          audio.play('telegraph');
          if (!hintsShown.has('slam')) {
            hintsShown.add('slam');
            hud.toast(copy.messages.slamIncoming);
          }
          break;
        case 'slam':
          audio.play('slam');
          shake(0.7, 320);
          if (event.hitPlayer) {
            hitStop(HITSTOP_FRAMES.multi);
            buzz(70);
          }
          renderer.spark?.(event.x, event.z, 'fire', { count: 14, speed: 8, y: 0.3 });
          break;
        case 'dash':
          audio.play('dash');
          buzz(12);
          break;
        case 'dodge':
          audio.play('dodge');
          floatAt(world.state.player.x, world.state.player.z, copy.messages.dodge, 'dodge', 2.2);
          break;
        case 'ult':
          audio.play('ult');
          shake(0.5, 360);
          buzz([30, 20, 50]);
          hud.announce(copy.messages.ultActive, 'ult');
          break;
        case 'shieldBreak':
          audio.play('shieldBreak');
          renderer.spark?.(event.x, event.z, 'ice', { count: 10, crit: true, speed: 6 });
          floatAt(event.x, event.z, copy.messages.shieldBreak, 'shield', 2.3);
          break;
        case 'buildPhase':
          hud.toast(copy.phases.buildTitle);
          break;
        case 'built':
          audio.play('build');
          buzz(15);
          if (event.x !== undefined) renderer.spark?.(event.x, event.z, event.kind === 'frost' ? 'ice' : 'fire', { count: 12, speed: 5, y: 0.4 });
          hud.toast(formatCopy(copy.messages.socketBuilt, { tower: towerLabel(event.kind) }));
          break;
        case 'upgraded':
          audio.play('upgrade', { level: event.level });
          buzz(15);
          if (event.x !== undefined) renderer.spark?.(event.x, event.z, event.kind === 'frost' ? 'ice' : 'fire', { count: 10 + event.level * 3, speed: 5, crit: event.level >= 5 });
          hud.toast(formatCopy(copy.messages.socketUpgraded, { tower: towerLabel(event.kind), level: event.level }));
          break;
        case 'noGold':
          audio.play('ui');
          hud.toast(copy.messages.notEnoughGold);
          break;
        case 'coreHit':
          audio.play('coreHit');
          shake(0.5, 260);
          break;
        case 'playerHit':
          audio.play('playerHit');
          shake(0.3, 180);
          buzz(25);
          break;
        case 'playerDown':
          audio.play('playerDown');
          hud.toast(copy.messages.playerDown);
          streakLevel = 0;
          break;
        case 'revived':
          audio.play('revived');
          break;
        case 'nova':
          audio.play('nova');
          shake(0.6, 320);
          hitStop(HITSTOP_FRAMES.crit);
          buzz(40);
          break;
        case 'tutorialStep':
          audio.play('step');
          break;
        case 'tutorialDone':
          markTutorialSeen();
          hud.banner(copy.tutorial.done);
          break;
        case 'waveCleared':
          hud.toast(copy.messages.waveCleared);
          break;
        case 'endless':
          hud.banner(copy.phases.endlessTitle, 'boss');
          hud.toast(copy.messages.endlessBegins);
          break;
        case 'victory':
        case 'defeat': {
          recordRun();
          hud.setOverlay(overlayFor(event.type));
          audio.play(event.type === 'victory' ? 'victory' : 'defeat');
          break;
        }
        default:
          break;
      }
    }

    if (killsThisFrame >= 3) {
      hitStop(HITSTOP_FRAMES.multi);
      shake(0.35, 200);
      hud.announce(formatCopy(copy.messages.multiKill, { n: killsThisFrame }), 'multi');
    }

    // Kill-streak announcer, driven by the chain the simulation already keeps.
    const chain = world.state.combo.count;
    if (chain === 0) streakLevel = 0;
    while (streakLevel < STREAK_THRESHOLDS.length && chain >= STREAK_THRESHOLDS[streakLevel]) {
      hud.announce(copy.streaks[streakLevel] || '', `streak-${streakLevel}`);
      audio.play('streak', { level: streakLevel });
      buzz(18);
      streakLevel += 1;
    }
  }

  function trackPerformance(delta) {
    if (perf.downgraded || !renderer.setQuality || renderer.kind !== 'webgl') return;
    if (perf.warmupMs > 0) {
      perf.warmupMs -= delta;
      return;
    }
    perf.sum += delta;
    perf.count += 1;
    if (perf.count < 90) return;
    const average = perf.sum / perf.count;
    perf.sum = 0;
    perf.count = 0;
    perf.slowWindows = average > SLOW_FRAME_MS ? perf.slowWindows + 1 : 0;
    if (perf.slowWindows >= 2 && renderer.setQuality('low')) {
      perf.downgraded = true;
      hud.toast(copy.messages.qualityLowered);
    }
  }

  function frame(now) {
    rafId = null;
    if (destroyed || paused) return;
    const delta = Math.min(200, Math.max(0, now - lastFrame));
    lastFrame = now;
    trackPerformance(delta);

    const command = input.read();
    let steps = 0;
    if (hitStopFrames > 0) {
      // Hit-stop: hold the simulation for a couple of rendered frames. Time is
      // dropped rather than banked, so the fight does not lurch forward after.
      hitStopFrames -= 1;
      world.setInput(command);
    } else {
      accumulator += delta;
      while (accumulator >= STEP_MS && steps < MAX_STEPS_PER_FRAME) {
        world.setInput(command);
        world.step();
        command.nova = false;
        command.start = false;
        command.dash = false;
        command.ult = false;
        command.swap = null;
        accumulator -= STEP_MS;
        steps += 1;
      }
      if (steps === 0) world.setInput(command);
      if (steps === MAX_STEPS_PER_FRAME) accumulator = 0;
    }
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

    if (!isTerminalPhase()) scheduleFrame();
  }

  // ── wiring ────────────────────────────────────────────────────────────────
  hud.on({
    swap: (element) => input.requestSwap(element),
    nova: () => input.requestNova(),
    ult: () => input.requestUlt(),
    dash: () => input.requestDash(),
    skipTutorial: () => {
      world.setInput({ skipTutorial: true });
      markTutorialSeen();
    },
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
      else if (action === 'noGoldBuild') world.input.buildSocket = socketIndex;
      else if (action === 'noGoldUpgrade') world.input.upgradeSocket = socketIndex;
      else if (action === 'max') {
        const tower = world.state.towers.find((entry) => entry.socket === socketIndex);
        if (tower) hud.toast(formatCopy(copy.messages.towerMax, { tower: towerLabel(tower.kind) }));
      }
      if (world.input.buildSocket !== null) world.input.buildKind = hud.buildKind();
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

  let contextPauseOwned = false;
  function onContextLost(event) {
    event.preventDefault();
    contextPauseOwned = !paused;
    if (contextPauseOwned) setPaused(true);
    hud.toast(copy.messages.pausedByContext ?? copy.phases.pauseTitle);
  }

  function onContextRestored() {
    resize();
    if (contextPauseOwned) {
      contextPauseOwned = false;
      setPaused(false);
    }
  }

  canvas.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointerup', onPointerUp);
  document.addEventListener('visibilitychange', onVisibility);
  canvas.addEventListener('webglcontextlost', onContextLost);
  canvas.addEventListener('webglcontextrestored', onContextRestored);
  window.addEventListener('resize', resize);

  hud.setBuildKind('frost');
  resize();
  hud.update(world.state, { best });
  hud.setOverlay(overlayFor('ready'));
  if (liteMode) hud.toast(copy.errors.webglBody);
  scheduleFrame();

  return {
    world,
    hud,
    renderer,
    mode,
    seed,
    stats: () => ({
      frames,
      simSteps,
      mode: renderer.kind,
      paused,
      hitStops,
      quality: renderer.quality ? renderer.quality() : quality,
    }),
    setTheme(next) {
      if (renderer.setTheme) renderer.setTheme(next);
    },
    setReducedMotion(value) {
      motionReduced = Boolean(value);
      renderer.setReducedMotion(motionReduced);
    },
    /** Force the auto-quality downgrade path; used by the browser spec. */
    degradeQuality() {
      if (renderer.setQuality?.('low')) perf.downgraded = true;
      return renderer.quality ? renderer.quality() : quality;
    },
    setPaused,
    destroy() {
      destroyed = true;
      stopFrame();
      canvas.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
      document.removeEventListener('visibilitychange', onVisibility);
      canvas.removeEventListener('webglcontextlost', onContextLost);
      canvas.removeEventListener('webglcontextrestored', onContextRestored);
      window.removeEventListener('resize', resize);
      input.dispose();
      audio.dispose();
      renderer.dispose();
    },
  };
}
