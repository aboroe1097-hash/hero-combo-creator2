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
} from '../data/balance.js';
import { ASSETS, FACTIONS, heroByName } from '../data/theme.js';
import { mapById } from '../data/maps.js';
import { createRng, hashSeed } from '../rng.js';

const READY_MS = 9000;
const TOWER_ORDER = ['frost', 'ember'];
const MAX_TOWER_LEVEL = 3;

function emptyInput() {
  return {
    moveX: 0,
    moveZ: 0,
    attack: false,
    attackHeld: false,
    swap: null,
    nova: false,
    buildSocket: null,
    buildKind: 'frost',
    upgradeSocket: null,
    start: false,
    restart: false,
  };
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

export function createWorld(options = {}) {
  const map = mapById(options.mapId || 'keep');
  const hero = heroByName(options.heroName);
  const seed = options.seed === undefined ? `${map.id}:dev` : options.seed;
  const rng = createRng(seed);
  const mods = applyHeroMods(defaultMods(), hero);
  const difficulty = options.difficulty === 'hard' ? 1.25 : 1;

  const state = {
    mapId: map.id,
    seed: String(seed),
    heroName: hero.name,
    heroFile: hero.file,
    tick: 0,
    timeMs: 0,
    phase: 'ready',
    phaseMs: READY_MS,
    wave: 0,
    wavesTotal: WAVES.length,
    waveElement: WAVES[0].element,
    waveIsBoss: false,
    score: 0,
    combo: { count: 0, mult: 1, timerMs: 0, lastElement: null },
    gold: GOLD.start,
    core: { x: map.core.x, z: map.core.z, radius: map.core.radius, hp: CORE.maxHp, maxHp: CORE.maxHp, burnMs: 0, flashMs: 0 },
    nova: { charge: 0, ready: false },
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
    },
    units: [],
    towers: [],
    sockets: map.sockets.map((socket, index) => ({ index, x: socket.x, z: socket.z, occupant: null })),
    projectiles: [],
    pickups: [],
    fx: [],
    stats: { kills: 0, killsThisWave: 0, wavesCleared: 0, damageTaken: 0, towersBuilt: 0 },
  };

  const input = emptyInput();
  const events = [];
  let spawnQueue = [];
  let nextId = 1;
  let nextSpawnAtMs = 0;
  let cadence = 0;

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

  function spawnUnit(kind, tier, gateIndex) {
    const gate = map.gates[gateIndex % map.gates.length];
    const scale = unitScale(kind, tier);
    const boss = state.waveIsBoss ? 1.3 : 1;
    // A "mixed" wave rolls each unit's faction; every other wave is single.
    const element =
      state.waveElement === 'mixed' ? (rng.next() < 0.5 ? 'fire' : 'ice') : state.waveElement;
    state.units.push({
      id: nextId++,
      kind,
      tier,
      element,
      x: gate.x + rng.float(-1.4, 1.4),
      z: gate.z + rng.float(-1.1, 1.1),
      vx: 0,
      vz: 0,
      hp: scale.hp * boss,
      maxHp: scale.hp * boss,
      damage: scale.damage,
      speed: scale.speed,
      score: scale.score * (state.waveIsBoss ? 1.5 : 1),
      radius: ENEMY_KINDS[kind].radius,
      ranged: ENEMY_KINDS[kind].ranged,
      range: ENEMY_KINDS[kind].range,
      aggroRadius: ENEMY_KINDS[kind].aggroRadius,
      attackCdMs: rng.int(0, 600),
      slowMs: 0,
      slowFactor: 1,
      burnMs: 0,
      burnDps: 0,
      facing: 0,
      hitFlashMs: 0,
    });
    emit('spawn', { kind, tier, element, x: gate.x, z: gate.z });
  }

  function startWave() {
    state.wave += 1;
    const wave = WAVES[state.wave - 1];
    state.waveElement = wave.element;
    state.phase = 'wave';
    state.phaseMs = 0;
    state.waveIsBoss = Boolean(wave.boss);
    state.stats.killsThisWave = 0;
    spawnQueue = [];
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
    spawnQueue.sort((a, b) => a.atMs - b.atMs);
    nextSpawnAtMs = 0;
    emit('wave', { wave: state.wave, boss: state.waveIsBoss, element: wave.element });
    if (state.waveIsBoss) emit('boss');
  }

  function startBuildPhase() {
    const index = Math.min(state.wave, BUILD_PHASE_MS.length - 1);
    state.phase = 'build';
    state.phaseMs = BUILD_PHASE_MS[index];
    state.gold += WAVES[state.wave - 1] ? WAVES[state.wave - 1].reward : 0;
    emit('buildPhase', { wave: state.wave + 1 });
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

  function damageCore(amount, element) {
    if (state.core.hp <= 0) return;
    state.core.hp = Math.max(0, state.core.hp - amount);
    state.core.flashMs = CORE.hitFlashMs;
    if (element === 'fire') state.core.burnMs = 3600;
    emit('coreHit', { amount, x: state.core.x, z: state.core.z, element });
    if (state.core.hp <= 0) endRun('defeat');
  }

  function damagePlayer(amount) {
    const player = state.player;
    if (!player.alive || player.hitFlashMs > 0) return;
    player.hp = Math.max(0, player.hp - amount);
    player.hitFlashMs = PLAYER.hitInvulnMs;
    state.stats.damageTaken += amount;
    emit('playerHit', { amount, x: player.x, z: player.z });
    if (player.hp <= 0) {
      player.alive = false;
      player.respawnMs = PLAYER.respawnMs;
      state.combo.count = 0;
      state.combo.mult = 1;
      emit('playerDown', { x: player.x, z: player.z });
    }
  }

  function addScoreForKill(unit) {
    const combo = state.combo;
    const alternating = combo.lastElement && combo.lastElement !== unit.element;
    combo.count += alternating ? 2 : 1;
    combo.lastElement = unit.element;
    combo.timerMs = COMBO.decayMs;
    combo.mult = Math.min(COMBO.max, 1 + combo.count * COMBO.perKill);
    const gained = Math.round(unit.score * combo.mult);
    state.score += gained;
    state.stats.kills += 1;
    state.stats.killsThisWave += 1;
    state.nova.charge = Math.min(
      NOVA.maxCharge,
      state.nova.charge + NOVA.chargePerKill * mods.novaCharge
    );
    state.nova.ready = state.nova.charge >= NOVA.maxCharge;
    return { gained, alternating };
  }

  function dropPickup(unit) {
    const faction = FACTIONS[unit.element] || FACTIONS.ice;
    const value = Math.round((GOLD.byTier[unit.tier] || 3) * mods.gold);
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

  function killUnit(index, element) {
    const unit = state.units[index];
    const { gained, alternating } = addScoreForKill(unit);
    dropPickup(unit);
    state.fx.push({
      id: nextId++,
      kind: 'burst',
      x: unit.x,
      z: unit.z,
      element: unit.element,
      ttlMs: 420,
      maxTtlMs: 420,
      scale: 1 + unit.radius,
    });
    emit('kill', { kind: unit.kind, tier: unit.tier, element, gained, alternating, x: unit.x, z: unit.z });
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

  function damageUnit(unit, amount, element, options = {}) {
    unit.hp -= amount;
    unit.hitFlashMs = 140;
    if (element === 'ice') applySlow(unit, PLAYER.ice.slowMs * mods.iceSlow, PLAYER.ice.slowFactor);
    if (element === 'fire' && options.burn !== false) {
      applyBurn(unit, PLAYER.fire.burnDps * mods.burnDps, PLAYER.fire.burnMs);
    }
    emit('hit', { x: unit.x, z: unit.z, element, amount });
  }

  function splashDamage(x, z, radius, damage, element) {
    for (let index = state.units.length - 1; index >= 0; index -= 1) {
      const unit = state.units[index];
      const dx = unit.x - x;
      const dz = unit.z - z;
      if (dx * dx + dz * dz > radius * radius) continue;
      damageUnit(unit, damage, element);
      if (unit.hp <= 0) killUnit(index, element);
    }
  }

  function firePlayerBolt() {
    const player = state.player;
    const element = player.element;
    const def = element === 'fire' ? PLAYER.fire : PLAYER.ice;
    const damage = def.damage * (element === 'fire' ? mods.fireDamage : mods.iceDamage);
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
    player.attackCdMs = PLAYER.attackCdMs * mods.attackCd;
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
      splash: 0,
    });
    emit('attack', { element, x: player.x, z: player.z });
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
    const def = TOWERS[tower.kind];
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
      vx: (dx / length) * def.projectileSpeed,
      vz: (dz / length) * def.projectileSpeed,
      damage: def.damage * (1 + (tower.level - 1) * 0.55),
      radius: 0.5,
      ttlMs: 1600,
      splash: def.splash ? def.splash * (1 + (tower.level - 1) * 0.12) : 0,
    });
    emit('towerShot', { x: tower.x, z: tower.z, kind: tower.kind });
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
    emit('built', { kind, socket: socketIndex });
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
    tower.hp = TOWERS[tower.kind].maxHp * (1 + (tower.level - 1) * 0.35);
    tower.maxHp = tower.hp;
    state.fx.push({ id: nextId++, kind: 'build', x: tower.x, z: tower.z, element: tower.kind === 'frost' ? 'ice' : 'fire', ttlMs: 620, maxTtlMs: 620, scale: 1.3 });
    emit('upgraded', { kind: tower.kind, level: tower.level, socket: socketIndex });
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
    if (!state.nova.ready) return;
    const player = state.player;
    const radiusSq = NOVA.radius * NOVA.radius;
    for (let index = state.units.length - 1; index >= 0; index -= 1) {
      const unit = state.units[index];
      const dx = unit.x - player.x;
      const dz = unit.z - player.z;
      const d = dx * dx + dz * dz;
      if (d > radiusSq) continue;
      damageUnit(unit, NOVA.damage, player.element, { burn: false });
      applySlow(unit, NOVA.slowMs, 0.4);
      const length = Math.hypot(dx, dz) || 1;
      unit.x += (dx / length) * NOVA.knockback * 0.35;
      unit.z += (dz / length) * NOVA.knockback * 0.35;
      if (unit.hp <= 0) killUnit(index, player.element);
    }
    state.nova.charge = 0;
    state.nova.ready = false;
    state.fx.push({ id: nextId++, kind: 'nova', x: player.x, z: player.z, element: player.element, ttlMs: 900, maxTtlMs: 900, scale: NOVA.radius });
    emit('nova', { x: player.x, z: player.z, element: player.element });
  }

  function updatePlayer(dtMs) {
    const player = state.player;
    if (player.hitFlashMs > 0) player.hitFlashMs -= dtMs;
    if (player.attackCdMs > 0) player.attackCdMs -= dtMs;

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

    if (input.swap === 'ice' || input.swap === 'fire') player.element = input.swap;
    if (input.attack && player.attackCdMs <= 0) firePlayerBolt();
  }

  function updateUnits(dtMs) {
    const player = state.player;
    const seconds = dtMs / 1000;
    for (let index = state.units.length - 1; index >= 0; index -= 1) {
      const unit = state.units[index];
      if (unit.hitFlashMs > 0) unit.hitFlashMs -= dtMs;
      if (unit.burnMs > 0) {
        unit.burnMs -= dtMs;
        unit.hp -= unit.burnDps * seconds;
        if (unit.hp <= 0) {
          killUnit(index, 'fire');
          continue;
        }
      }
      if (unit.slowMs > 0) {
        unit.slowMs -= dtMs;
      } else {
        unit.slowFactor = 1;
      }

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
        resolveObstacles(unit, unit.radius);
      }
    }
  }

  function updateTowers(dtMs) {
    for (const tower of state.towers) {
      if (tower.cooldownMs > 0) tower.cooldownMs -= dtMs;
      if (tower.cooldownMs > 0) continue;
      const def = TOWERS[tower.kind];
      const rangeSq = (def.range * (1 + (tower.level - 1) * 0.06)) ** 2;
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
        tower.cooldownMs = def.cdMs * (1 - (tower.level - 1) * 0.08);
      }
    }
  }

  function updateProjectiles(dtMs) {
    const player = state.player;
    for (let index = state.projectiles.length - 1; index >= 0; index -= 1) {
      const bolt = state.projectiles[index];
      bolt.ttlMs -= dtMs;
      bolt.x += bolt.vx * (dtMs / 1000);
      bolt.z += bolt.vz * (dtMs / 1000);
      let consumed = bolt.ttlMs <= 0;

      if (!consumed && bolt.owner === 'enemy') {
        if (player.alive) {
          const dx = bolt.x - player.x;
          const dz = bolt.z - player.z;
          if (dx * dx + dz * dz <= (PLAYER.radius + bolt.radius) ** 2) {
            damagePlayer(bolt.damage);
            if (bolt.element === 'ice') player.slowMs = 1600;
            consumed = true;
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
        for (let unitIndex = state.units.length - 1; unitIndex >= 0; unitIndex -= 1) {
          const unit = state.units[unitIndex];
          const dx = bolt.x - unit.x;
          const dz = bolt.z - unit.z;
          const reach = unit.radius + bolt.radius;
          if (dx * dx + dz * dz > reach * reach) continue;
          if (bolt.splash > 0) {
            splashDamage(bolt.x, bolt.z, bolt.splash, bolt.damage, bolt.element);
          } else {
            damageUnit(unit, bolt.damage, bolt.element);
            if (unit.hp <= 0) killUnit(unitIndex, bolt.element);
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

      if (consumed) state.projectiles.splice(index, 1);
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
          emit('pickup', { value: pickup.value, color: pickup.color, type: pickup.type, total: state.gold });
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

  function updatePhase(dtMs) {
    if (state.phase === 'ready') {
      state.phaseMs -= dtMs;
      if (input.start || state.phaseMs <= 0) startWave();
      return;
    }
    if (state.phase === 'build') {
      state.phaseMs -= dtMs;
      if (state.phaseMs <= 0) startWave();
      return;
    }
    if (state.phase !== 'wave') return;

    state.phaseMs += dtMs;
    while (spawnQueue.length && spawnQueue[0].atMs <= state.phaseMs) {
      const entry = spawnQueue.shift();
      spawnUnit(entry.kind, entry.tier, entry.gate);
    }
    if (!spawnQueue.length && !state.units.length) {
      state.stats.wavesCleared = state.wave;
      state.score += WAVES[state.wave - 1].reward + SCORE.waveClear * state.wave;
      emit('waveCleared', { wave: state.wave });
      if (state.wave >= state.wavesTotal) endRun('victory');
      else startBuildPhase();
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
    state.nova.charge = 0;
    state.nova.ready = false;
    state.player.x = map.spawn.x;
    state.player.z = map.spawn.z;
    state.player.vx = 0;
    state.player.vz = 0;
    state.player.hp = state.player.maxHp;
    state.player.alive = true;
    state.player.respawnMs = 0;
    state.player.slowMs = 0;
    state.player.element = hero.element;
    state.units.length = 0;
    state.towers.length = 0;
    state.projectiles.length = 0;
    state.pickups.length = 0;
    state.fx.length = 0;
    for (const socket of state.sockets) socket.occupant = null;
    state.stats.kills = 0;
    state.stats.killsThisWave = 0;
    state.stats.wavesCleared = 0;
    state.stats.damageTaken = 0;
    state.stats.towersBuilt = 0;
    spawnQueue = [];
    events.length = 0;
    // Latched input from the finished run must not leak into the new one.
    Object.assign(input, emptyInput());
  }

  function step() {
    // A restart is a no-op step: it rewinds the run and returns, so the frame
    // after a restart is tick 1 of the new run in every case.
    if (input.restart) {
      reset();
      input.restart = false;
      return;
    }
    const frozen = state.phase === 'victory' || state.phase === 'defeat';
    if (frozen) {
      // Keep draining one-shot requests so the UI stays responsive.
      input.buildSocket = null;
      input.upgradeSocket = null;
      input.nova = false;
      input.start = false;
      return;
    }

    state.tick += 1;
    // Derived rather than accumulated: floating-point drift over a long run
    // would otherwise make the same replay end on a different millisecond.
    state.timeMs = state.tick * STEP_MS;
    cadence += 1;

    if (input.buildSocket !== null) buildTower(input.buildSocket, input.buildKind || 'frost');
    if (input.upgradeSocket !== null) upgradeTower(input.upgradeSocket);
    if (input.nova) fireNova();

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
    input.buildSocket = null;
    input.upgradeSocket = null;
    input.nova = false;
    input.start = false;
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
      rng.state(),
    ];
    for (const unit of state.units) {
      parts.push(
        unit.kind,
        unit.tier,
        Math.round(unit.x * 1000),
        Math.round(unit.z * 1000),
        Math.round(unit.hp * 100)
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
      if (command.buildSocket !== undefined && command.buildSocket !== null) {
        input.buildSocket = command.buildSocket;
        input.buildKind = command.buildKind || 'frost';
      }
      if (command.upgradeSocket !== undefined && command.upgradeSocket !== null) {
        input.upgradeSocket = command.upgradeSocket;
      }
      if (command.start) input.start = true;
      if (command.restart) input.restart = true;
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
