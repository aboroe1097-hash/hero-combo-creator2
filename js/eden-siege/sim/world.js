// The Eden Siege simulation. Pure: no three.js, no DOM, no clock, no Math.random.
//
// Everything happens on a fixed 1/60 s step driven by world.step(). The only
// entropy is the run seed, so {seed + input trace} reproduces a run exactly —
// which is what makes daily seeds, ghost replays, reproducible soak tests and
// (later) server-side score bounds possible at all.
//
// The renderer and the HUD are readers: they pull world.state each frame and
// drain world.drainEvents() for one-shot effects and sounds.

import {
  STEP_MS,
  PLAYER,
  NOVA,
  COMBO,
  CORE,
  GOLD,
  TOWERS,
  WAVES,
  ENEMY_KINDS,
  TIER_SCALE,
  BUILD_PHASE_MS,
  SCORE,
  TOWER_MAX_LEVEL,
  TOWER_TIER,
  CRIT,
  DASH,
  ULT,
  MODIFIERS,
  MODIFIER_ORDER,
  modifierChance,
  BOSS,
  TUTORIAL,
  waveAt,
} from '../data/balance.js';
import { ASSETS, FACTIONS, heroByName } from '../data/theme.js';
import { mapById } from '../data/maps.js';
import { createRng, hashSeed } from '../rng.js';

const READY_MS = 9000;
const TOWER_ORDER = ['frost', 'ember'];
const MAX_TOWER_LEVEL = TOWER_MAX_LEVEL;

function emptyInput() {
  return {
    moveX: 0,
    moveZ: 0,
    attack: false,
    attackHeld: false,
    swap: null,
    nova: false,
    dash: false,
    ult: false,
    buildSocket: null,
    buildKind: 'frost',
    upgradeSocket: null,
    start: false,
    restart: false,
    continueEndless: false,
    skipTutorial: false,
  };
}

function emptyTutorial(enabled) {
  const steps = {};
  for (const step of TUTORIAL.steps) steps[step] = false;
  return { enabled: Boolean(enabled), active: false, done: !enabled, skipped: false, elapsedMs: 0, steps };
}

function defaultMods() {
  return {
    iceDamage: 1,
    fireDamage: 1,
    attackCd: 1,
    speed: 1,
    maxHp: 1,
    gold: 1,
    novaCharge: 1,
    iceSlow: 1,
    burnDps: 1,
    range: 1,
  };
}

function applyHeroMods(mods, hero) {
  for (const [key, value] of Object.entries(hero.mods || {})) {
    if (key in mods) mods[key] *= value;
  }
  return mods;
}

function emptyStats() {
  return {
    kills: 0,
    killsThisWave: 0,
    wavesCleared: 0,
    damageTaken: 0,
    towersBuilt: 0,
    upgrades: 0,
    maxChain: 0,
    crits: 0,
    dodges: 0,
    bossKills: 0,
    shotsFired: 0,
  };
}

export function createWorld(options = {}) {
  const map = mapById(options.mapId || 'keep');
  const hero = heroByName(options.heroName);
  const seed = options.seed === undefined ? `${map.id}:dev` : options.seed;
  const rng = createRng(seed);
  const mods = applyHeroMods(defaultMods(), hero);
  const difficulty = options.difficulty === 'hard' ? 1.25 : 1;
  const mode = ['campaign', 'endless', 'daily'].includes(options.mode) ? options.mode : 'campaign';
  const startsEndless = mode !== 'campaign';
  const tutorialEnabled = Boolean(options.tutorial) && mode === 'campaign';

  const state = {
    mapId: map.id,
    seed: String(seed),
    heroName: hero.name,
    heroFile: hero.file,
    tick: 0,
    timeMs: 0,
    phase: 'ready',
    phaseMs: READY_MS,
    mode,
    endless: startsEndless,
    campaignCleared: false,
    wave: 0,
    wavesTotal: WAVES.length,
    waveElement: WAVES[0].element,
    waveIsBoss: false,
    score: 0,
    combo: { count: 0, mult: 1, timerMs: 0, lastElement: null },
    gold: GOLD.start,
    core: { x: map.core.x, z: map.core.z, radius: map.core.radius, hp: CORE.maxHp, maxHp: CORE.maxHp, burnMs: 0, flashMs: 0 },
    nova: { charge: 0, ready: false },
    ult: { charge: 0, ready: false, activeMs: 0 },
    tutorial: emptyTutorial(tutorialEnabled),
    player: {
      x: map.spawn.x,
      z: map.spawn.z,
      vx: 0,
      vz: 0,
      hp: PLAYER.maxHp * mods.maxHp,
      maxHp: PLAYER.maxHp * mods.maxHp,
      element: hero.element,
      aimX: 0,
      aimZ: -1,
      attackCdMs: 0,
      alive: true,
      respawnMs: 0,
      slowMs: 0,
      hitFlashMs: 0,
      facing: Math.PI,
      dashMs: 0,
      dashCdMs: 0,
      iframeMs: 0,
      dodged: false,
    },
    units: [],
    towers: [],
    sockets: map.sockets.map((socket, index) => ({ index, x: socket.x, z: socket.z, occupant: null })),
    projectiles: [],
    pickups: [],
    fx: [],
    stats: emptyStats(),
  };

  const input = emptyInput();
  const events = [];
  let spawnQueue = [];
  let nextId = 1;
  let nextSpawnAtMs = 0;
  let cadence = 0;

  let currentWave = WAVES[0];
  // A finished (or skipped) tutorial stays finished across restarts.
  let tutorialCompleted = false;

  // ── helpers ───────────────────────────────────────────────────────────────
  function emit(type, payload) {
    events.push({ type, ...payload });
  }

  function clampToArena(entity, radius) {
    const limitX = map.size.w / 2 - radius - 0.4;
    const limitZ = map.size.d / 2 - radius - 0.4;
    entity.x = Math.max(-limitX, Math.min(limitX, entity.x));
    entity.z = Math.max(-limitZ, Math.min(limitZ, entity.z));
  }

  // Circle vs axis-aligned box: push the entity out along its shallowest axis.
  // Ground units have no pathfinding; sliding along a wall is the whole
  // navigation model, which is what keeps the simulation cheap and readable.
  function resolveObstacles(entity, radius) {
    for (const box of map.obstacles) {
      const halfW = box.w / 2 + radius;
      const halfD = box.d / 2 + radius;
      const dx = entity.x - box.x;
      const dz = entity.z - box.z;
      if (Math.abs(dx) >= halfW || Math.abs(dz) >= halfD) continue;
      const overlapX = halfW - Math.abs(dx);
      const overlapZ = halfD - Math.abs(dz);
      if (overlapX < overlapZ) entity.x = box.x + Math.sign(dx || 1) * halfW;
      else entity.z = box.z + Math.sign(dz || 1) * halfD;
    }
    clampToArena(entity, radius);
  }

  function distanceSq(a, b) {
    const dx = a.x - b.x;
    const dz = a.z - b.z;
    return dx * dx + dz * dz;
  }

  function unitScale(kind, tier) {
    const kindDef = ENEMY_KINDS[kind];
    return {
      hp: kindDef.hp * TIER_SCALE.hp[tier] * difficulty,
      damage: kindDef.damage * TIER_SCALE.damage[tier] * difficulty,
      speed: kindDef.speed * TIER_SCALE.speed[tier],
      score: kindDef.score * TIER_SCALE.score[tier],
    };
  }

  function bossCycle() {
    return Math.max(0, Math.floor(state.wave / BOSS.every) - 1);
  }

  function tutorialStep(step) {
    const tutorial = state.tutorial;
    if (!tutorial.active || tutorial.steps[step]) return;
    tutorial.steps[step] = true;
    emit('tutorialStep', { step });
  }

  function rollModifier(isBoss) {
    if (isBoss || state.tutorial.active) return null;
    const chance = state.endless && state.wave > WAVES.length ? 0.5 : modifierChance(state.wave);
    if (chance <= 0 || rng.next() >= chance) return null;
    return MODIFIER_ORDER[rng.int(0, MODIFIER_ORDER.length - 1)];
  }

  function spawnUnit(kind, tier, gateIndex) {
    const gate = map.gates[gateIndex % map.gates.length];
    const kindDef = ENEMY_KINDS[kind];
    const scale = unitScale(kind, tier);
    const isBoss = kind === BOSS.kind;
    let hpMult = currentWave.hpMult || 1;
    if (isBoss) hpMult *= 1 + bossCycle() * BOSS.hpPerCycle;
    else if (state.waveIsBoss) hpMult *= BOSS.escortHpMult;
    // A "mixed" wave rolls each unit's faction; every other wave is single.
    const element =
      state.waveElement === 'mixed' ? (rng.next() < 0.5 ? 'fire' : 'ice') : state.waveElement;
    const modifier = rollModifier(isBoss);
    const modifierDef = modifier ? MODIFIERS[modifier] : null;
    const hp = scale.hp * hpMult * (modifierDef?.hpMult || 1);
    const shield = modifier === 'shielded' ? hp * MODIFIERS.shielded.shieldRatio : 0;
    const damage = scale.damage * (state.tutorial.active ? TUTORIAL.damageMult : 1);
    state.units.push({
      id: nextId++,
      kind,
      art: kindDef.art || kind,
      tier,
      element,
      modifier,
      boss: isBoss,
      x: gate.x + rng.float(-1.4, 1.4),
      z: gate.z + rng.float(-1.1, 1.1),
      vx: 0,
      vz: 0,
      hp,
      maxHp: hp,
      shield,
      maxShield: shield,
      damage,
      speed: scale.speed * (modifierDef?.speedMult || 1),
      score: scale.score * (state.waveIsBoss ? 1.5 : 1) * (modifier ? 1.3 : 1),
      radius: kindDef.radius,
      ranged: kindDef.ranged,
      range: kindDef.range,
      aggroRadius: kindDef.aggroRadius,
      attackCdMs: rng.int(0, 600),
      slowMs: 0,
      slowFactor: 1,
      burnMs: 0,
      burnDps: 0,
      facing: 0,
      hitFlashMs: 0,
      slamCdMs: isBoss ? BOSS.slamFirstMs : 0,
      telegraph: null,
    });
    emit('spawn', { kind, tier, element, modifier, boss: isBoss, x: gate.x, z: gate.z });
  }

  function queueGroups(wave) {
    let cursor = 0;
    for (const group of wave.groups) {
      for (let index = 0; index < group.count; index += 1) {
        spawnQueue.push({
          kind: group.kind,
          tier: group.tier,
          gate: rng.int(0, map.gates.length - 1),
          atMs: cursor,
        });
        cursor += wave.intervalMs * rng.float(0.82, 1.18);
      }
    }
    return cursor;
  }

  function startWave() {
    const tutorial = state.tutorial;
    let wave;
    if (tutorial.enabled && !tutorial.done) {
      // The training wave: wave 0, a purse for the first tower and a charged
      // nova so every step of the checklist is reachable.
      tutorial.active = true;
      tutorial.elapsedMs = 0;
      wave = TUTORIAL.wave;
      state.gold += TUTORIAL.purse;
      state.nova.charge = NOVA.maxCharge;
      state.nova.ready = true;
    } else {
      state.wave += 1;
      wave = waveAt(state.wave);
    }
    currentWave = wave;
    state.waveElement = wave.element;
    state.phase = 'wave';
    state.phaseMs = 0;
    state.waveIsBoss = Boolean(wave.boss) && !tutorial.active;
    state.stats.killsThisWave = 0;
    spawnQueue = [];
    const length = queueGroups(wave);
    if (state.waveIsBoss) {
      spawnQueue.push({
        kind: BOSS.kind,
        tier: Math.min(4, 1 + bossCycle()),
        gate: rng.int(0, map.gates.length - 1),
        atMs: length * 0.3,
      });
    }
    spawnQueue.sort((a, b) => a.atMs - b.atMs);
    nextSpawnAtMs = 0;
    emit('wave', {
      wave: state.wave,
      boss: state.waveIsBoss,
      element: wave.element,
      tutorial: tutorial.active,
      endless: state.wave > WAVES.length,
    });
    if (state.waveIsBoss) emit('boss');
  }

  function startBuildPhase() {
    const index = Math.min(state.wave, BUILD_PHASE_MS.length - 1);
    state.phase = 'build';
    state.phaseMs = BUILD_PHASE_MS[index];
    state.gold += currentWave ? currentWave.reward : 0;
    emit('buildPhase', { wave: state.wave + 1 });
  }

  function finishTutorial(skipped) {
    const tutorial = state.tutorial;
    if (!tutorial.active) return;
    tutorial.active = false;
    tutorial.done = true;
    tutorial.skipped = skipped;
    tutorialCompleted = true;
    if (skipped) {
      state.units.length = 0;
      spawnQueue = [];
      for (let index = state.projectiles.length - 1; index >= 0; index -= 1) {
        if (state.projectiles[index].owner === 'enemy') state.projectiles.splice(index, 1);
      }
    }
    state.phase = 'build';
    state.phaseMs = BUILD_PHASE_MS[0];
    state.gold += TUTORIAL.wave.reward;
    currentWave = WAVES[0];
    emit('tutorialDone', { skipped });
    emit('buildPhase', { wave: 1 });
  }

  function endRun(phase) {
    if (state.phase === phase) return;
    state.phase = phase;
    state.phaseMs = 0;
    if (phase === 'victory') {
      const hpRatio = Math.max(0, state.core.hp / state.core.maxHp);
      state.score += Math.round(hpRatio * SCORE.coreHpBonus);
      state.score += Math.floor(state.timeMs / 1000) * SCORE.survivalBonusPerSecond;
    }
    emit(phase === 'victory' ? 'victory' : 'defeat', { score: state.score });
  }

  function continueEndless() {
    if (state.phase !== 'victory') return;
    state.endless = true;
    startBuildPhase();
    emit('endless', { wave: state.wave });
  }

  function damageCore(amount, element) {
    if (state.core.hp <= 0) return;
    state.core.hp = Math.max(0, state.core.hp - amount);
    state.core.flashMs = CORE.hitFlashMs;
    if (element === 'fire') state.core.burnMs = 3600;
    emit('coreHit', { amount, x: state.core.x, z: state.core.z, element });
    if (state.core.hp <= 0) endRun('defeat');
  }

  // Returns whether the blow connected. A dash's i-frames let bolts pass
  // through the hero, which is the whole point of dashing through a volley.
  function damagePlayer(amount) {
    const player = state.player;
    if (!player.alive) return false;
    if (player.iframeMs > 0) {
      if (!player.dodged) {
        player.dodged = true;
        state.stats.dodges += 1;
        emit('dodge', { x: player.x, z: player.z });
      }
      return false;
    }
    if (player.hitFlashMs > 0) return true;
    player.hp = Math.max(0, player.hp - amount);
    player.hitFlashMs = PLAYER.hitInvulnMs;
    state.stats.damageTaken += amount;
    emit('playerHit', { amount, x: player.x, z: player.z });
    if (player.hp <= 0) {
      player.alive = false;
      player.respawnMs = PLAYER.respawnMs;
      player.dashMs = 0;
      state.combo.count = 0;
      state.combo.mult = 1;
      emit('playerDown', { x: player.x, z: player.z });
    }
    return true;
  }

  function addUltCharge(amount) {
    const ult = state.ult;
    ult.charge = Math.min(ULT.maxCharge, ult.charge + amount);
    ult.ready = ult.charge >= ULT.maxCharge;
  }

  function addScoreForKill(unit) {
    const combo = state.combo;
    const alternating = combo.lastElement && combo.lastElement !== unit.element;
    combo.count += alternating ? 2 : 1;
    combo.lastElement = unit.element;
    combo.timerMs = COMBO.decayMs;
    combo.mult = Math.min(COMBO.max, 1 + combo.count * COMBO.perKill);
    state.stats.maxChain = Math.max(state.stats.maxChain, combo.count);
    const gained = Math.round(unit.score * combo.mult);
    state.score += gained;
    state.stats.kills += 1;
    state.stats.killsThisWave += 1;
    state.nova.charge = Math.min(
      NOVA.maxCharge,
      state.nova.charge + NOVA.chargePerKill * mods.novaCharge
    );
    state.nova.ready = state.nova.charge >= NOVA.maxCharge;
    addUltCharge(unit.boss ? ULT.maxCharge / 2 : ULT.perKill);
    return { gained, alternating };
  }

  function dropPickup(unit) {
    const faction = FACTIONS[unit.element] || FACTIONS.ice;
    const value = Math.round((GOLD.byTier[unit.tier] || 3) * mods.gold * (unit.boss ? 10 : 1));
    state.pickups.push({
      id: nextId++,
      x: unit.x,
      z: unit.z,
      vx: rng.float(-1.1, 1.1),
      vz: rng.float(-1.1, 1.1),
      color: faction.dropColor,
      type: ASSETS.dropTypes[Math.min(3, unit.tier - 1)],
      value,
      ttlMs: GOLD.pickupTtlMs,
    });
  }

  function killUnit(index, element, meta = {}) {
    const unit = state.units[index];
    const { gained, alternating } = addScoreForKill(unit);
    dropPickup(unit);
    state.fx.push({
      id: nextId++,
      kind: 'burst',
      x: unit.x,
      z: unit.z,
      element: unit.element,
      ttlMs: unit.boss ? 900 : 420,
      maxTtlMs: unit.boss ? 900 : 420,
      scale: (1 + unit.radius) * (unit.boss ? 2 : 1),
    });
    if (unit.boss) state.stats.bossKills += 1;
    emit('kill', {
      kind: unit.kind,
      tier: unit.tier,
      element,
      gained,
      alternating,
      x: unit.x,
      z: unit.z,
      crit: Boolean(meta.crit),
      source: meta.source || 'player',
      boss: unit.boss,
      modifier: unit.modifier,
    });
    if (unit.boss) emit('bossDown', { x: unit.x, z: unit.z });
    state.units.splice(index, 1);
  }

  function applySlow(unit, ms, factor) {
    if (ms <= 0) return;
    unit.slowMs = Math.max(unit.slowMs, ms);
    unit.slowFactor = Math.min(unit.slowFactor, factor);
  }

  function applyBurn(unit, dps, ms) {
    unit.burnDps = Math.max(unit.burnDps, dps);
    unit.burnMs = Math.max(unit.burnMs, ms);
  }

  // Direct damage goes through a unit's shield and armour; burn ticks do not
  // (see updateUnits), which is why Fire is the answer to armour.
  function damageUnit(unit, amount, element, options = {}) {
    let damage = amount;
    let shieldHit = false;
    if (unit.shield > 0) {
      const factor = element === 'ice' || options.dual ? MODIFIERS.shielded.iceShieldMult : 1;
      const absorbed = Math.min(unit.shield, damage * factor);
      unit.shield -= absorbed;
      damage -= absorbed / factor;
      shieldHit = true;
      if (unit.shield <= 0.001) {
        unit.shield = 0;
        emit('shieldBreak', { x: unit.x, z: unit.z, id: unit.id });
      }
    }
    if (unit.modifier === 'armored') damage *= MODIFIERS.armored.directDamageMult;
    unit.hp -= damage;
    unit.hitFlashMs = 140;
    if (element === 'ice' || options.dual) {
      applySlow(unit, PLAYER.ice.slowMs * mods.iceSlow, PLAYER.ice.slowFactor);
    }
    if ((element === 'fire' || options.dual) && options.burn !== false) {
      applyBurn(unit, PLAYER.fire.burnDps * mods.burnDps, PLAYER.fire.burnMs);
    }
    emit('hit', {
      x: unit.x,
      z: unit.z,
      element,
      amount: damage,
      crit: Boolean(options.crit),
      source: options.source || 'player',
      shield: shieldHit,
      armored: unit.modifier === 'armored',
      boss: unit.boss,
    });
  }

  function splashDamage(x, z, radius, damage, element, options = {}) {
    for (let index = state.units.length - 1; index >= 0; index -= 1) {
      const unit = state.units[index];
      const dx = unit.x - x;
      const dz = unit.z - z;
      if (dx * dx + dz * dz > radius * radius) continue;
      damageUnit(unit, damage, element, options);
      if (unit.hp <= 0) killUnit(index, element, options);
    }
  }

  function firePlayerBolt() {
    const player = state.player;
    const element = player.element;
    const def = element === 'fire' ? PLAYER.fire : PLAYER.ice;
    const ultOn = state.ult.activeMs > 0;
    const crit = rng.next() < CRIT.chance;
    const damage =
      def.damage *
      (element === 'fire' ? mods.fireDamage : mods.iceDamage) *
      (crit ? CRIT.mult : 1) *
      (ultOn ? ULT.damageMult : 1);
    const rangeSq = (PLAYER.attackRange * mods.range) ** 2;

    let target = null;
    let best = rangeSq;
    for (const unit of state.units) {
      const d = distanceSq(unit, player);
      if (d < best) {
        best = d;
        target = unit;
      }
    }

    let dirX = player.aimX;
    let dirZ = player.aimZ;
    if (target) {
      dirX = target.x - player.x;
      dirZ = target.z - player.z;
      const length = Math.hypot(dirX, dirZ) || 1;
      dirX /= length;
      dirZ /= length;
    }
    player.attackCdMs = PLAYER.attackCdMs * mods.attackCd * (ultOn ? ULT.attackCdMult : 1);
    state.projectiles.push({
      id: nextId++,
      owner: 'player',
      element,
      x: player.x + dirX * 0.7,
      z: player.z + dirZ * 0.7,
      vx: dirX * PLAYER.boltSpeed,
      vz: dirZ * PLAYER.boltSpeed,
      damage,
      radius: PLAYER.boltRadius,
      ttlMs: 1200,
      splash: ultOn ? ULT.splash : 0,
      crit,
      dual: ultOn,
    });
    state.stats.shotsFired += 1;
    if (crit) state.stats.crits += 1;
    tutorialStep('attack');
    emit('attack', { element, x: player.x, z: player.z, crit, ult: ultOn });
  }

  function fireEnemyProjectile(unit) {
    const dx = (unit.targetX ?? state.core.x) - unit.x;
    const dz = (unit.targetZ ?? state.core.z) - unit.z;
    const length = Math.hypot(dx, dz) || 1;
    state.projectiles.push({
      id: nextId++,
      owner: 'enemy',
      element: unit.element,
      x: unit.x,
      z: unit.z,
      vx: (dx / length) * ENEMY_KINDS[unit.kind].projectileSpeed,
      vz: (dz / length) * ENEMY_KINDS[unit.kind].projectileSpeed,
      damage: unit.damage,
      radius: 0.4,
      ttlMs: 2200,
      splash: 0,
    });
  }

  function fireTowerShot(tower, target) {
    const stats = towerStats(tower.kind, tower.level);
    const dx = target.x - tower.x;
    const dz = target.z - tower.z;
    const length = Math.hypot(dx, dz) || 1;
    tower.angle = Math.atan2(dx, dz);
    state.projectiles.push({
      id: nextId++,
      owner: 'tower',
      element: tower.kind === 'frost' ? 'ice' : 'fire',
      x: tower.x + (dx / length) * 0.6,
      z: tower.z + (dz / length) * 0.6,
      vx: (dx / length) * stats.projectileSpeed,
      vz: (dz / length) * stats.projectileSpeed,
      damage: stats.damage,
      radius: 0.5,
      ttlMs: 1600,
      splash: stats.splash,
    });
    emit('towerShot', { x: tower.x, z: tower.z, kind: tower.kind, level: tower.level });
  }

  function buildTower(socketIndex, kind) {
    const socket = state.sockets[socketIndex];
    if (!socket || socket.occupant) return;
    const def = TOWERS[kind];
    if (!def) return;
    if (state.gold < def.cost) {
      emit('noGold', { needed: def.cost, kind });
      return;
    }
    state.gold -= def.cost;
    socket.occupant = kind;
    state.towers.push({
      id: nextId++,
      kind,
      socket: socketIndex,
      x: socket.x,
      z: socket.z,
      level: 1,
      cooldownMs: 0,
      angle: 0,
      hp: def.maxHp,
      maxHp: def.maxHp,
    });
    state.stats.towersBuilt += 1;
    state.fx.push({ id: nextId++, kind: 'build', x: socket.x, z: socket.z, element: kind === 'frost' ? 'ice' : 'fire', ttlMs: 620, maxTtlMs: 620, scale: 1.6 });
    tutorialStep('build');
    emit('built', { kind, socket: socketIndex, x: socket.x, z: socket.z });
  }

  function upgradeTower(socketIndex) {
    const tower = state.towers.find((entry) => entry.socket === socketIndex);
    if (!tower || tower.level >= MAX_TOWER_LEVEL) return;
    const cost = TOWERS[tower.kind].upgradeCosts[tower.level - 1];
    if (state.gold < cost) {
      emit('noGold', { needed: cost, kind: tower.kind });
      return;
    }
    state.gold -= cost;
    tower.level += 1;
    tower.hp = towerStats(tower.kind, tower.level).maxHp;
    tower.maxHp = tower.hp;
    state.stats.upgrades += 1;
    state.fx.push({ id: nextId++, kind: 'build', x: tower.x, z: tower.z, element: tower.kind === 'frost' ? 'ice' : 'fire', ttlMs: 620, maxTtlMs: 620, scale: 1.3 + tower.level * 0.12 });
    emit('upgraded', { kind: tower.kind, level: tower.level, socket: socketIndex, x: tower.x, z: tower.z });
  }

  function damageTower(tower, amount) {
    tower.hp -= amount;
    emit('towerHit', { x: tower.x, z: tower.z, kind: tower.kind });
    if (tower.hp > 0) return;
    const socket = state.sockets[tower.socket];
    if (socket) socket.occupant = null;
    const at = state.towers.indexOf(tower);
    if (at >= 0) state.towers.splice(at, 1);
    state.fx.push({
      id: nextId++,
      kind: 'burst',
      x: tower.x,
      z: tower.z,
      element: 'fire',
      ttlMs: 620,
      maxTtlMs: 620,
      scale: 2,
    });
    emit('towerLost', { x: tower.x, z: tower.z });
  }

  function fireNova() {
    if (!state.nova.ready || !state.player.alive) return;
    const player = state.player;
    const radiusSq = NOVA.radius * NOVA.radius;
    for (let index = state.units.length - 1; index >= 0; index -= 1) {
      const unit = state.units[index];
      const dx = unit.x - player.x;
      const dz = unit.z - player.z;
      const d = dx * dx + dz * dz;
      if (d > radiusSq) continue;
      damageUnit(unit, NOVA.damage, player.element, { burn: false, source: 'nova' });
      applySlow(unit, NOVA.slowMs, 0.4);
      const length = Math.hypot(dx, dz) || 1;
      const push = unit.boss ? 0.1 : 0.35;
      unit.x += (dx / length) * NOVA.knockback * push;
      unit.z += (dz / length) * NOVA.knockback * push;
      if (unit.hp <= 0) killUnit(index, player.element, { source: 'nova' });
    }
    state.nova.charge = 0;
    state.nova.ready = false;
    state.fx.push({ id: nextId++, kind: 'nova', x: player.x, z: player.z, element: player.element, ttlMs: 900, maxTtlMs: 900, scale: NOVA.radius });
    tutorialStep('nova');
    emit('nova', { x: player.x, z: player.z, element: player.element });
  }

  function activateUlt() {
    const ult = state.ult;
    const player = state.player;
    if (!ult.ready || ult.activeMs > 0 || !player.alive) return;
    ult.activeMs = ULT.durationMs;
    ult.charge = 0;
    ult.ready = false;
    // The opening roar: a short dual-element shockwave around Velo.
    splashDamage(player.x, player.z, 6, 30, player.element, { dual: true, source: 'ult' });
    state.fx.push({ id: nextId++, kind: 'nova', x: player.x, z: player.z, element: player.element === 'fire' ? 'ice' : 'fire', ttlMs: 700, maxTtlMs: 700, scale: 6 });
    emit('ult', { x: player.x, z: player.z, element: player.element });
  }

  function startDash() {
    const player = state.player;
    const length = Math.hypot(input.moveX, input.moveZ);
    let dirX = player.aimX;
    let dirZ = player.aimZ;
    if (length > 0.05) {
      dirX = input.moveX / length;
      dirZ = input.moveZ / length;
    }
    player.vx = dirX * DASH.speed;
    player.vz = dirZ * DASH.speed;
    player.aimX = dirX;
    player.aimZ = dirZ;
    player.facing = Math.atan2(dirX, dirZ);
    player.dashMs = DASH.durationMs;
    player.iframeMs = DASH.iframeMs;
    player.dodged = false;
    player.dashCdMs = DASH.cooldownMs;
    emit('dash', { x: player.x, z: player.z, dirX, dirZ });
  }

  function updatePlayer(dtMs) {
    const player = state.player;
    if (player.hitFlashMs > 0) player.hitFlashMs -= dtMs;
    if (player.attackCdMs > 0) player.attackCdMs -= dtMs;
    if (player.dashCdMs > 0) player.dashCdMs -= dtMs;
    if (player.iframeMs > 0) {
      player.iframeMs -= dtMs;
      if (player.iframeMs <= 0) player.dodged = false;
    }
    if (state.ult.activeMs > 0) {
      state.ult.activeMs -= dtMs;
      if (state.ult.activeMs <= 0) {
        state.ult.activeMs = 0;
        emit('ultEnd', {});
      }
    }

    if (!player.alive) {
      player.respawnMs -= dtMs;
      if (player.respawnMs <= 0) {
        player.alive = true;
        player.hp = player.maxHp * PLAYER.respawnHpRatio;
        player.x = map.spawn.x;
        player.z = map.spawn.z;
        player.vx = 0;
        player.vz = 0;
        emit('revived', { x: player.x, z: player.z });
      }
      return;
    }

    if (player.slowMs > 0) player.slowMs -= dtMs;
    const slow = player.slowMs > 0 ? 0.55 : 1;
    const maxSpeed = PLAYER.speed * mods.speed * slow;
    const inputX = input.moveX;
    const inputZ = input.moveZ;
    const length = Math.hypot(inputX, inputZ);
    if (length > 0.3) tutorialStep('move');

    if (input.dash && player.dashCdMs <= 0) startDash();

    if (player.dashMs > 0) {
      // A dash ignores acceleration, friction and the speed cap for its
      // duration, then hands back a normal-speed body.
      player.dashMs -= dtMs;
      player.x += player.vx * (dtMs / 1000);
      player.z += player.vz * (dtMs / 1000);
      resolveObstacles(player, PLAYER.radius);
      if (player.dashMs <= 0) {
        player.dashMs = 0;
        const speed = Math.hypot(player.vx, player.vz) || 1;
        player.vx = (player.vx / speed) * maxSpeed;
        player.vz = (player.vz / speed) * maxSpeed;
      }
    } else {
      if (length > 0.05) {
        player.vx += (inputX / length) * PLAYER.accel * (dtMs / 1000);
        player.vz += (inputZ / length) * PLAYER.accel * (dtMs / 1000);
        player.aimX = inputX / length;
        player.aimZ = inputZ / length;
        player.facing = Math.atan2(player.aimX, player.aimZ);
      }
      const friction = Math.max(0, 1 - PLAYER.friction * (dtMs / 1000));
      player.vx *= friction;
      player.vz *= friction;
      const speed = Math.hypot(player.vx, player.vz);
      if (speed > maxSpeed) {
        player.vx = (player.vx / speed) * maxSpeed;
        player.vz = (player.vz / speed) * maxSpeed;
      }
      player.x += player.vx * (dtMs / 1000);
      player.z += player.vz * (dtMs / 1000);
      resolveObstacles(player, PLAYER.radius);
    }

    if ((input.swap === 'ice' || input.swap === 'fire') && input.swap !== player.element) {
      player.element = input.swap;
      tutorialStep('swap');
      emit('swap', { element: player.element });
    }
    if (input.attack && player.attackCdMs <= 0) firePlayerBolt();
  }

  // The warlord's slam: pick a target, paint the ground for telegraphMs, then
  // hit everything still standing in the circle. The telegraph is the tell;
  // the dash's i-frames are the answer.
  function slamTarget(unit) {
    const player = state.player;
    const reachSq = BOSS.slamReach * BOSS.slamReach;
    if (player.alive && distanceSq(unit, player) <= reachSq) return player;
    let best = null;
    let bestDistance = reachSq;
    for (const tower of state.towers) {
      const d = distanceSq(unit, tower);
      if (d <= bestDistance) {
        best = tower;
        bestDistance = d;
      }
    }
    if (best) return best;
    // The stronghold is only slammed from close up; a slam lobbed at it from
    // across the arena would be a tax the player cannot answer.
    const coreReach = state.core.radius + unit.radius + 3;
    if (distanceSq(unit, state.core) <= coreReach * coreReach) return state.core;
    return null;
  }

  function resolveSlam(unit) {
    const slam = unit.telegraph;
    const scale = unit.damage / ENEMY_KINDS[BOSS.kind].damage;
    const damage = BOSS.slamDamage * scale;
    const player = state.player;
    let hitPlayer = false;
    if (player.alive) {
      const reach = slam.radius + PLAYER.radius;
      if (distanceSq(player, slam) <= reach * reach) hitPlayer = damagePlayer(damage);
    }
    for (const tower of state.towers.slice()) {
      const reach = slam.radius + 0.8;
      if (distanceSq(tower, slam) <= reach * reach) damageTower(tower, damage);
    }
    const coreReach = slam.radius + state.core.radius;
    if (distanceSq(state.core, slam) <= coreReach * coreReach) damageCore(damage * 0.4, unit.element);
    state.fx.push({ id: nextId++, kind: 'slam', x: slam.x, z: slam.z, element: 'fire', ttlMs: 520, maxTtlMs: 520, scale: slam.radius });
    emit('slam', { x: slam.x, z: slam.z, radius: slam.radius, hitPlayer });
  }

  function updateBoss(unit, dtMs) {
    if (unit.telegraph) {
      unit.telegraph.ms -= dtMs;
      if (unit.telegraph.ms <= 0) {
        resolveSlam(unit);
        unit.telegraph = null;
        unit.slamCdMs = BOSS.slamEveryMs;
      }
      return true;
    }
    unit.slamCdMs -= dtMs;
    if (unit.slamCdMs > 0) return false;
    const target = slamTarget(unit);
    if (!target) {
      unit.slamCdMs = 400;
      return false;
    }
    unit.telegraph = {
      x: target.x,
      z: target.z,
      radius: BOSS.slamRadius,
      ms: BOSS.telegraphMs,
      maxMs: BOSS.telegraphMs,
    };
    unit.facing = Math.atan2(target.x - unit.x, target.z - unit.z);
    emit('telegraph', { x: target.x, z: target.z, radius: BOSS.slamRadius, ms: BOSS.telegraphMs });
    return true;
  }

  function updateUnits(dtMs) {
    const player = state.player;
    const seconds = dtMs / 1000;
    for (let index = state.units.length - 1; index >= 0; index -= 1) {
      const unit = state.units[index];
      if (!unit) continue;
      if (unit.hitFlashMs > 0) unit.hitFlashMs -= dtMs;
      if (unit.burnMs > 0) {
        unit.burnMs -= dtMs;
        unit.hp -= unit.burnDps * seconds;
        if (unit.hp <= 0) {
          killUnit(index, 'fire', { source: 'burn' });
          continue;
        }
      }
      if (unit.slowMs > 0) {
        unit.slowMs -= dtMs;
      } else {
        unit.slowFactor = 1;
      }

      // A telegraphing warlord plants its feet until the slam lands.
      if (unit.boss && updateBoss(unit, dtMs)) continue;

      // Choose the nearest thing worth hitting: the player if they are close
      // enough to be a threat, a tower in the way, otherwise the stronghold.
      let target = { x: state.core.x, z: state.core.z, kind: 'core' };
      let bestDistance = distanceSq(unit, target);
      if (player.alive) {
        const playerDistance = distanceSq(unit, player);
        if (playerDistance < (unit.aggroRadius + 3) ** 2 && playerDistance < bestDistance) {
          target = { x: player.x, z: player.z, kind: 'player' };
          bestDistance = playerDistance;
        }
      }
      for (const tower of state.towers) {
        const towerDistance = distanceSq(unit, tower);
        if (towerDistance < unit.aggroRadius ** 2 && towerDistance < bestDistance) {
          target = { x: tower.x, z: tower.z, kind: 'tower', tower };
          bestDistance = towerDistance;
        }
      }

      const dx = target.x - unit.x;
      const dz = target.z - unit.z;
      const distance = Math.hypot(dx, dz) || 1;
      unit.facing = Math.atan2(dx, dz);
      unit.targetX = target.x;
      unit.targetZ = target.z;
      const inRange = distance <= unit.range + unit.radius;

      if (unit.attackCdMs > 0) unit.attackCdMs -= dtMs;
      if (inRange) {
        if (unit.attackCdMs <= 0) {
          unit.attackCdMs = ENEMY_KINDS[unit.kind].attackCdMs;
          // Ranged units always lob, so their damage can be dodged; melee units
          // connect immediately with whatever they reached.
          if (unit.ranged) fireEnemyProjectile(unit);
          else if (target.kind === 'player') damagePlayer(unit.damage);
          else if (target.kind === 'core') damageCore(unit.damage, unit.element);
          else if (target.tower) damageTower(target.tower, unit.damage);
        }
      } else {
        const speed = unit.speed * unit.slowFactor;
        unit.x += (dx / distance) * speed * seconds;
        unit.z += (dz / distance) * speed * seconds;
        // Cheap separation so a pack of units does not collapse into one dot.
        for (const other of state.units) {
          if (other === unit) continue;
          const ox = unit.x - other.x;
          const oz = unit.z - other.z;
          const minDistance = unit.radius + other.radius;
          const d2 = ox * ox + oz * oz;
          if (d2 > 0 && d2 < minDistance * minDistance) {
            const push = (minDistance - Math.sqrt(d2)) * 0.5;
            const inv = 1 / Math.sqrt(d2);
            unit.x += ox * inv * push;
            unit.z += oz * inv * push;
          }
        }
        // The warlord is too big to slide round the ramparts; it wades over
        // them instead of wedging itself on a corner for the rest of the wave.
        if (unit.boss) clampToArena(unit, unit.radius);
        else resolveObstacles(unit, unit.radius);
      }
    }
  }

  function updateTowers(dtMs) {
    for (const tower of state.towers) {
      if (tower.cooldownMs > 0) tower.cooldownMs -= dtMs;
      if (tower.cooldownMs > 0) continue;
      const stats = towerStats(tower.kind, tower.level);
      const rangeSq = stats.range ** 2;
      let target = null;
      let best = rangeSq;
      for (const unit of state.units) {
        const d = distanceSq(unit, tower);
        if (d < best) {
          best = d;
          target = unit;
        }
      }
      if (target) {
        fireTowerShot(tower, target);
        tower.cooldownMs = stats.cdMs;
      }
    }
  }

  function updateProjectiles(dtMs) {
    const player = state.player;
    for (let index = state.projectiles.length - 1; index >= 0; index -= 1) {
      const bolt = state.projectiles[index];
      if (!bolt) continue;
      bolt.ttlMs -= dtMs;
      bolt.x += bolt.vx * (dtMs / 1000);
      bolt.z += bolt.vz * (dtMs / 1000);
      let consumed = bolt.ttlMs <= 0;

      if (!consumed && bolt.owner === 'enemy') {
        if (player.alive) {
          const dx = bolt.x - player.x;
          const dz = bolt.z - player.z;
          if (dx * dx + dz * dz <= (PLAYER.radius + bolt.radius) ** 2) {
            if (damagePlayer(bolt.damage)) {
              if (bolt.element === 'ice') player.slowMs = 1600;
              consumed = true;
            }
          }
        }
        if (!consumed) {
          const dx = bolt.x - state.core.x;
          const dz = bolt.z - state.core.z;
          if (dx * dx + dz * dz <= (state.core.radius + bolt.radius) ** 2) {
            damageCore(bolt.damage, bolt.element);
            consumed = true;
          }
        }
        if (!consumed) {
          for (const tower of state.towers) {
            const dx = bolt.x - tower.x;
            const dz = bolt.z - tower.z;
            if (dx * dx + dz * dz <= (0.8 + bolt.radius) ** 2) {
              damageTower(tower, bolt.damage);
              consumed = true;
              break;
            }
          }
        }
      } else if (!consumed) {
        const options = { crit: bolt.crit, dual: bolt.dual, source: bolt.owner };
        for (let unitIndex = state.units.length - 1; unitIndex >= 0; unitIndex -= 1) {
          const unit = state.units[unitIndex];
          const dx = bolt.x - unit.x;
          const dz = bolt.z - unit.z;
          const reach = unit.radius + bolt.radius;
          if (dx * dx + dz * dz > reach * reach) continue;
          if (bolt.splash > 0) {
            splashDamage(bolt.x, bolt.z, bolt.splash, bolt.damage, bolt.element, options);
          } else {
            damageUnit(unit, bolt.damage, bolt.element, options);
            if (unit.hp <= 0) killUnit(unitIndex, bolt.element, options);
          }
          consumed = true;
          break;
        }
      }

      if (!consumed && bolt.owner !== 'enemy') {
        // Player and tower bolts stop at walls; that keeps the arena readable.
        for (const box of map.obstacles) {
          if (
            Math.abs(bolt.x - box.x) < box.w / 2 &&
            Math.abs(bolt.z - box.z) < box.d / 2
          ) {
            consumed = true;
            break;
          }
        }
      }

      if (consumed) {
        const at = state.projectiles.indexOf(bolt);
        if (at >= 0) state.projectiles.splice(at, 1);
      }
    }
  }

  function updatePickups(dtMs) {
    const player = state.player;
    const seconds = dtMs / 1000;
    for (let index = state.pickups.length - 1; index >= 0; index -= 1) {
      const pickup = state.pickups[index];
      pickup.ttlMs -= dtMs;
      pickup.x += pickup.vx * seconds;
      pickup.z += pickup.vz * seconds;
      pickup.vx *= 0.94;
      pickup.vz *= 0.94;
      if (player.alive) {
        const dx = player.x - pickup.x;
        const dz = player.z - pickup.z;
        const d = Math.hypot(dx, dz) || 1;
        if (d < GOLD.magnetRadius) {
          pickup.x += (dx / d) * Math.min(d, 8) * seconds * 3.4;
          pickup.z += (dz / d) * Math.min(d, 8) * seconds * 3.4;
        }
        if (d < PLAYER.radius + 0.75) {
          state.gold += pickup.value;
          emit('pickup', { value: pickup.value, color: pickup.color, type: pickup.type, total: state.gold, x: pickup.x, z: pickup.z });
          state.pickups.splice(index, 1);
          continue;
        }
      }
      if (pickup.ttlMs <= 0) state.pickups.splice(index, 1);
    }
  }

  function updateFx(dtMs) {
    for (let index = state.fx.length - 1; index >= 0; index -= 1) {
      state.fx[index].ttlMs -= dtMs;
      if (state.fx[index].ttlMs <= 0) state.fx.splice(index, 1);
    }
  }

  function updateTutorialWave(dtMs) {
    const tutorial = state.tutorial;
    tutorial.elapsedMs += dtMs;
    if (spawnQueue.length || state.units.length) return;
    const complete = TUTORIAL.steps.every((step) => tutorial.steps[step]);
    if (complete || tutorial.elapsedMs >= TUTORIAL.maxMs) {
      finishTutorial(false);
      return;
    }
    // Still training: send another ranger and top up whatever the next
    // unfinished step needs, so the checklist can always be finished.
    spawnQueue.push({
      kind: 'ranger',
      tier: 1,
      gate: rng.int(0, map.gates.length - 1),
      atMs: state.phaseMs + 900,
    });
    if (!tutorial.steps.nova && !state.nova.ready) {
      state.nova.charge = NOVA.maxCharge;
      state.nova.ready = true;
    }
    if (!tutorial.steps.build && state.gold < TOWERS.frost.cost) state.gold = TOWERS.frost.cost;
  }

  function updatePhase(dtMs) {
    if (state.phase === 'ready') {
      state.phaseMs -= dtMs;
      if (input.start || state.phaseMs <= 0) startWave();
      return;
    }
    if (state.phase === 'build') {
      state.phaseMs -= dtMs;
      if (input.start || state.phaseMs <= 0) startWave();
      return;
    }
    if (state.phase !== 'wave') return;

    state.phaseMs += dtMs;
    while (spawnQueue.length && spawnQueue[0].atMs <= state.phaseMs) {
      const entry = spawnQueue.shift();
      spawnUnit(entry.kind, entry.tier, entry.gate);
    }
    if (state.tutorial.active) {
      updateTutorialWave(dtMs);
      return;
    }
    if (!spawnQueue.length && !state.units.length) {
      state.stats.wavesCleared = state.wave;
      state.score += currentWave.reward + SCORE.waveClear * state.wave;
      addUltCharge(ULT.perWave);
      emit('waveCleared', { wave: state.wave, boss: state.waveIsBoss });
      if (!state.endless && state.wave >= state.wavesTotal) {
        state.campaignCleared = true;
        endRun('victory');
      } else {
        startBuildPhase();
      }
    }
  }

  function updateCombo(dtMs) {
    if (state.combo.count <= 0) return;
    state.combo.timerMs -= dtMs;
    if (state.combo.timerMs <= 0) {
      state.combo.count = 0;
      state.combo.mult = 1;
      state.combo.lastElement = null;
    }
  }

  function updateCore(dtMs) {
    if (state.core.flashMs > 0) state.core.flashMs -= dtMs;
    if (state.core.burnMs > 0) {
      state.core.burnMs -= dtMs;
      state.core.hp = Math.max(0, state.core.hp - 2.2 * (dtMs / 1000));
      if (state.core.hp <= 0) endRun('defeat');
    }
  }

  function reset() {
    // Rewinding the generator is what makes a restarted daily seed the same
    // run rather than a near-miss of it.
    rng.setState(hashSeed(seed));
    state.tick = 0;
    state.timeMs = 0;
    state.phase = 'ready';
    state.phaseMs = READY_MS;
    state.endless = startsEndless;
    state.campaignCleared = false;
    state.wave = 0;
    state.waveElement = WAVES[0].element;
    state.waveIsBoss = false;
    state.score = 0;
    state.combo.count = 0;
    state.combo.mult = 1;
    state.combo.timerMs = 0;
    state.combo.lastElement = null;
    state.gold = GOLD.start;
    state.core.hp = state.core.maxHp;
    state.core.burnMs = 0;
    state.core.flashMs = 0;
    state.nova.charge = 0;
    state.nova.ready = false;
    Object.assign(state.ult, { charge: 0, ready: false, activeMs: 0 });
    Object.assign(state.tutorial, emptyTutorial(tutorialEnabled && !tutorialCompleted));
    Object.assign(state.player, {
      x: map.spawn.x,
      z: map.spawn.z,
      vx: 0,
      vz: 0,
      hp: state.player.maxHp,
      alive: true,
      respawnMs: 0,
      slowMs: 0,
      hitFlashMs: 0,
      attackCdMs: 0,
      element: hero.element,
      dashMs: 0,
      dashCdMs: 0,
      iframeMs: 0,
      dodged: false,
    });
    state.units.length = 0;
    state.towers.length = 0;
    state.projectiles.length = 0;
    state.pickups.length = 0;
    state.fx.length = 0;
    for (const socket of state.sockets) socket.occupant = null;
    Object.assign(state.stats, emptyStats());
    spawnQueue = [];
    currentWave = WAVES[0];
    events.length = 0;
    // Latched input from the finished run must not leak into the new one.
    Object.assign(input, emptyInput());
  }

  function clearOneShots() {
    input.buildSocket = null;
    input.upgradeSocket = null;
    input.nova = false;
    input.dash = false;
    input.ult = false;
    input.start = false;
    input.swap = null;
    input.continueEndless = false;
    input.skipTutorial = false;
  }

  function step() {
    // A restart is a no-op step: it rewinds the run and returns, so the frame
    // after a restart is tick 1 of the new run in every case.
    if (input.restart) {
      reset();
      input.restart = false;
      return;
    }
    if (state.phase === 'victory' && input.continueEndless) {
      continueEndless();
      clearOneShots();
      return;
    }
    const frozen = state.phase === 'victory' || state.phase === 'defeat';
    if (frozen) {
      // Keep draining one-shot requests so the UI stays responsive.
      clearOneShots();
      return;
    }

    state.tick += 1;
    // Derived rather than accumulated: floating-point drift over a long run
    // would otherwise make the same replay end on a different millisecond.
    state.timeMs = state.tick * STEP_MS;
    cadence += 1;

    if (input.skipTutorial) finishTutorial(true);
    if (input.buildSocket !== null) buildTower(input.buildSocket, input.buildKind || 'frost');
    if (input.upgradeSocket !== null) upgradeTower(input.upgradeSocket);
    if (input.nova) fireNova();
    if (input.ult) activateUlt();

    updatePhase(STEP_MS);
    updateCore(STEP_MS);
    updatePlayer(STEP_MS);
    updateUnits(STEP_MS);
    updateTowers(STEP_MS);
    updateProjectiles(STEP_MS);
    updatePickups(STEP_MS);
    updateFx(STEP_MS);
    updateCombo(STEP_MS);

    input.attack = input.attackHeld;
    clearOneShots();
  }

  function snapshotHash() {
    const parts = [
      state.tick,
      state.phase,
      Math.round(state.score),
      Math.round(state.gold * 100),
      state.wave,
      Math.round(state.core.hp * 100),
      Math.round(state.player.x * 1000),
      Math.round(state.player.z * 1000),
      Math.round(state.player.hp * 100),
      state.player.element,
      state.units.length,
      state.towers.length,
      state.pickups.length,
      Math.round(state.combo.mult * 100),
      Math.round(state.ult.charge * 100),
      state.endless ? 1 : 0,
      rng.state(),
    ];
    for (const unit of state.units) {
      parts.push(
        unit.kind,
        unit.tier,
        unit.modifier || '-',
        Math.round(unit.x * 1000),
        Math.round(unit.z * 1000),
        Math.round(unit.hp * 100),
        Math.round(unit.shield * 100)
      );
    }
    let hash = 0x811c9dc5;
    const text = parts.join('|');
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0).toString(16);
  }

  return {
    state,
    map,
    mods,
    input,
    step,
    reset,
    snapshotHash,
    /** Latch a frame of input. Held values persist until the next call. */
    setInput(command) {
      if (command.moveX !== undefined) input.moveX = command.moveX;
      if (command.moveZ !== undefined) input.moveZ = command.moveZ;
      if (command.attackHeld !== undefined) input.attackHeld = command.attackHeld;
      if (command.attackHeld === undefined && command.attack !== undefined) {
        input.attackHeld = command.attack;
        input.attack = command.attack;
      }
      if (command.swap) input.swap = command.swap;
      if (command.nova) input.nova = true;
      if (command.dash) input.dash = true;
      if (command.ult) input.ult = true;
      if (command.buildSocket !== undefined && command.buildSocket !== null) {
        input.buildSocket = command.buildSocket;
        input.buildKind = command.buildKind || 'frost';
      }
      if (command.upgradeSocket !== undefined && command.upgradeSocket !== null) {
        input.upgradeSocket = command.upgradeSocket;
      }
      if (command.start) input.start = true;
      if (command.restart) input.restart = true;
      if (command.continueEndless) input.continueEndless = true;
      if (command.skipTutorial) input.skipTutorial = true;
    },
    drainEvents() {
      if (!events.length) return events;
      const drained = events.slice();
      events.length = 0;
      return drained;
    },
    towerKinds: TOWER_ORDER,
  };
}

/** Per-level tower numbers, shared by the simulation and the HUD. */
export function towerStats(kind, level) {
  const def = TOWERS[kind] || TOWERS.frost;
  const step = Math.max(0, Math.min(TOWER_MAX_LEVEL, level) - 1);
  return {
    damage: def.damage * (1 + step * TOWER_TIER.damage),
    cdMs: def.cdMs * (1 - step * TOWER_TIER.cooldown),
    range: def.range * (1 + step * TOWER_TIER.range),
    splash: def.splash ? def.splash * (1 + step * TOWER_TIER.splash) : 0,
    maxHp: def.maxHp * (1 + step * TOWER_TIER.hp),
    projectileSpeed: def.projectileSpeed,
    upgradeCost: step + 1 < TOWER_MAX_LEVEL ? def.upgradeCosts[step] : null,
  };
}
