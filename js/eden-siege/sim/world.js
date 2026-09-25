// The Velo's Rampart simulation. Pure: no three.js, no DOM, no clock, no Math.random.
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
  OMENS,
  BOSS,
  TUTORIAL,
  REACTIONS,
  BOONS,
  BOON_ORDER,
  DRAFT,
  waveAt,
} from '../data/balance.js';
import { ASSETS, FACTIONS, heroByName } from '../data/theme.js';
import { mapById } from '../data/maps.js';
import { createRng, hashSeed } from '../rng.js';

const READY_MS = 9000;
const TOWER_ORDER = ['frost', 'ember'];
const MAX_TOWER_LEVEL = TOWER_MAX_LEVEL;
// The touch assist cone, as a cosine: comparing cosines skips the acos in the
// targeting loop. Free aim (keyboard/mouse) never homes, so this is the only
// place a bolt is allowed to pick a target for the player.
const ASSIST_CONE_COS = Math.cos((PLAYER.assistConeDeg * Math.PI) / 180);
// How close a tower's body sits to its socket, shared by bolt collisions and by
// the gate ram, which walks up to whatever it is pointed at.
const TOWER_BODY_RADIUS = 0.8;

function emptyInput() {
  return {
    moveX: 0,
    moveZ: 0,
    aimX: 0,
    aimZ: 0,
    assistCone: false,
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
    chooseOmen: null,
    chooseBoon: null,
  };
}

function emptyTutorial(enabled) {
  const steps = {};
  for (const step of TUTORIAL.steps) steps[step] = false;
  return {
    enabled: Boolean(enabled),
    active: false,
    done: !enabled,
    skipped: false,
    elapsedMs: 0,
    steps,
  };
}

// Every multiplier a run can earn lives here. Heroes and the War Council both
// fold into this one object, so a boon is a number rather than a second code
// path through the rules (see BOONS in data/balance.js).
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
    // How hard the slow bites, which the depth boon deepens separately from the
    // duration `iceSlow` lengthens.
    iceSlowDepth: 1,
    burnDps: 1,
    range: 1,
    novaDamage: 1,
    novaKnockback: 1,
    comboDecay: 1,
    towerHp: 1,
    towerRange: 1,
    dashCd: 1,
  };
}

function applyHeroMods(mods, hero) {
  for (const [key, value] of Object.entries(hero.mods || {})) {
    if (key in mods) mods[key] *= value;
  }
  return mods;
}

/** A hero's own multipliers, before any boon a run has taken. */
function heroMods(hero) {
  return applyHeroMods(defaultMods(), hero);
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
    fireShots: 0,
    iceShots: 0,
    burnKills: 0,
  };
}

export function createWorld(options = {}) {
  const map = mapById(options.mapId || 'keep');
  const hero = heroByName(options.heroName);
  const seed = options.seed === undefined ? `${map.id}:dev` : options.seed;
  const rng = createRng(seed);
  const mods = heroMods(hero);
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
    // The omen governing the wave in progress, and the one chosen for the wave
    // that has not started yet (both hashed — see snapshotHash).
    omen: null,
    pendingOmen: null,
    // Derived: whether the omen offer should be on screen this build phase.
    omenOffered: false,
    // The War Council draft, all four hashed (see snapshotHash): whether a
    // council is sitting this build phase, the boons it is offering, the one
    // just taken (for the toast) and every boon the run has taken so far.
    draftOffered: false,
    draftOptions: [],
    pendingBoon: null,
    draftPicked: [],
    score: 0,
    combo: { count: 0, mult: 1, timerMs: 0, lastElement: null },
    gold: GOLD.start,
    core: {
      x: map.core.x,
      z: map.core.z,
      radius: map.core.radius,
      hp: CORE.maxHp,
      maxHp: CORE.maxHp,
      burnMs: 0,
      flashMs: 0,
    },
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
      // Swapping wings is on its own cooldown; the HUD dims the wing button
      // while this is above zero.
      swapCdMs: 0,
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
    sockets: map.sockets.map((socket, index) => ({
      index,
      x: socket.x,
      z: socket.z,
      occupant: null,
    })),
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

  // ── wave omens ────────────────────────────────────────────────────────────
  // The offer is open for the whole build phase before an eligible wave:
  // campaign play from wave OMENS.fromWave, endless on every wave. Everything
  // an omen changes is read through omenMod, so the rules stay in balance.js
  // and a wave in progress can never be read by the wrong one.

  function omenOffered(wave) {
    return state.endless || wave >= OMENS.fromWave;
  }

  function omenMod(key, omen = state.omen) {
    if (!omen) return 1;
    const def = OMENS[omen];
    return def && typeof def[key] === 'number' ? def[key] : 1;
  }

  function chooseOmen(omen) {
    if (omen !== 'skip' && !OMENS[omen]) return;
    if (!omenOffered(state.wave + 1)) return;
    state.pendingOmen = omen === 'skip' ? null : omen;
  }

  // ── The War Council ───────────────────────────────────────────────────────
  // A draft is offered during the build phase after clearing waves 3, 6 and 9
  // of the campaign; once the siege is endless, after every third wave. The
  // offer stands for the whole build phase and is dropped with it, and a boon
  // taken is a permanent multiplier for the rest of the run.

  function draftIsOffered(clearedWave) {
    if (clearedWave <= 0 || clearedWave % DRAFT.everyWaves !== 0) return false;
    return state.endless || clearedWave <= DRAFT.campaignUntilWave;
  }

  // Three distinct boons, drawn from the ones this run has not taken yet. The
  // draw comes off the run's own generator, so the same seed offers the same
  // council to everyone replaying it.
  function rollDraftOptions() {
    const pool = BOON_ORDER.filter((id) => !state.draftPicked.includes(id));
    const options = [];
    const count = Math.min(DRAFT.options, pool.length);
    for (let index = 0; index < count; index += 1) {
      options.push(pool.splice(rng.int(0, pool.length - 1), 1)[0]);
    }
    return options;
  }

  function openDraft() {
    state.draftOptions = rollDraftOptions();
    state.draftOffered = state.draftOptions.length > 0;
    // The toast for the last pick comes down as the next council is called.
    state.pendingBoon = null;
  }

  // Tower Wall changes the ceiling, so every spire standing gets the new one —
  // and is healed to it, because a boon should never arrive as damage taken.
  function refreshTowerHp() {
    for (const tower of state.towers) {
      tower.maxHp = towerStats(tower.kind, tower.level).maxHp * mods.towerHp;
      tower.hp = tower.maxHp;
    }
  }

  function takeBoon(id) {
    // A pick only counts while a council is actually sitting.
    if (!state.draftOffered) return;
    const def = BOONS[id];
    if (!def || state.draftPicked.includes(id)) return;
    let towerHpRaised = false;
    for (const [key, value] of Object.entries(def.mods || {})) {
      if (!(key in mods)) continue;
      mods[key] *= value;
      if (key === 'towerHp') towerHpRaised = true;
    }
    state.draftPicked.push(id);
    state.pendingBoon = id;
    state.draftOffered = false;
    state.draftOptions.length = 0;
    if (towerHpRaised) refreshTowerHp();
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
    // Iron Tide is the wave where every foe is armoured, warlord included;
    // otherwise the wave's own modifier roll decides.
    const modifier = state.omen === 'ironTide' ? OMENS.ironTide.modifier : rollModifier(isBoss);
    const modifierDef = modifier ? MODIFIERS[modifier] : null;
    const hp = scale.hp * hpMult * (modifierDef?.hpMult || 1);
    const shield = modifier === 'shielded' ? hp * MODIFIERS.shielded.shieldRatio : 0;
    const damage = scale.damage * (state.tutorial.active ? TUTORIAL.damageMult : 1);
    const speed = scale.speed * (modifierDef?.speedMult || 1) * omenMod('speedMult');
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
      speed,
      // The spawn values are the ones a herald's aura scales from, so an ally
      // that leaves the banner returns to exactly what it was born with.
      baseDamage: damage,
      baseSpeed: speed,
      auraSpeed: 1,
      auraDamage: 1,
      score: scale.score * (state.waveIsBoss ? 1.5 : 1) * (modifier ? 1.3 : 1),
      radius: kindDef.radius,
      ranged: kindDef.ranged,
      range: kindDef.range,
      aggroRadius: kindDef.aggroRadius,
      attackCdMs: rng.int(0, 600),
      slowMs: 0,
      slowFactor: 1,
      // Reaction state: how many slows have landed in a row (and how long the
      // unit has been free of them), how long it is frozen for, and the burn.
      slowStacks: 0,
      slowIdleMs: 0,
      freezeMs: 0,
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
    // The omen chosen during the build phase comes due now. It governs this
    // wave and only this wave: it is cleared when the wave is cleared.
    state.omen = state.pendingOmen;
    state.pendingOmen = null;
    state.omenOffered = false;
    // An offer that was not taken before the wave opened is gone with it.
    state.draftOffered = false;
    state.draftOptions.length = 0;
    spawnQueue = [];
    const length = queueGroups(wave);
    if (state.waveIsBoss) {
      spawnQueue.push({
        kind: BOSS.kind,
        tier: Math.min(4, 1 + bossCycle()),
        gate: rng.int(0, map.gates.length - 1),
        atMs: length * 0.3,
      });
      // From wave ten on, every warlord brings a battering ram to the gate.
      if (state.wave >= BOSS.ramFromWave) {
        spawnQueue.push({
          kind: BOSS.ramKind,
          tier: Math.min(4, 1 + bossCycle()),
          gate: rng.int(0, map.gates.length - 1),
          atMs: length * 0.5,
        });
      }
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
    if (state.omen) emit('omen', { omen: state.omen, wave: state.wave });
  }

  function startBuildPhase(omen = null) {
    const index = Math.min(state.wave, BUILD_PHASE_MS.length - 1);
    state.phase = 'build';
    state.phaseMs = BUILD_PHASE_MS[index];
    // Iron Tide's purse is paid with the reward of the wave it governed, which
    // is the one that just ended.
    state.gold += Math.round((currentWave ? currentWave.reward : 0) * omenMod('goldMult', omen));
    state.omenOffered = omenOffered(state.wave + 1);
    // The council is called on the strength of the wave that was just cleared,
    // not the one that has not started yet.
    if (draftIsOffered(state.wave)) openDraft();
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
    state.omenOffered = omenOffered(state.wave + 1);
    emit('tutorialDone', { skipped });
    emit('buildPhase', { wave: 1 });
  }

  function endRun(phase) {
    if (state.phase === phase) return;
    state.phase = phase;
    state.phaseMs = 0;
    // A finished run has no wave in progress, and so no omen over it.
    state.omen = null;
    state.pendingOmen = null;
    state.omenOffered = false;
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
    // Training is for learning the controls: however long a new player takes,
    // the rangers can dent the stronghold but never end the run.
    const floor = state.tutorial.active ? state.core.maxHp * TUTORIAL.coreFloor : 0;
    state.core.hp = Math.max(Math.min(floor, state.core.hp), state.core.hp - amount);
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
    // Blood Moon drags the chain out, the War Council's chain boon drags it out
    // further; everything else keeps the stock timer.
    combo.timerMs = COMBO.decayMs * omenMod('comboDecayMult') * mods.comboDecay;
    combo.mult = Math.min(COMBO.max, 1 + combo.count * COMBO.perKill);
    state.stats.maxChain = Math.max(state.stats.maxChain, combo.count);
    const gained = Math.round(unit.score * combo.mult * omenMod('scoreMult'));
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
    // A hauler's cart is worth twice as much as anything else of its tier.
    const goldMult = ENEMY_KINDS[unit.kind].goldMult || 1;
    const value = Math.round(
      (GOLD.byTier[unit.tier] || 3) * mods.gold * (unit.boss ? 10 : 1) * goldMult
    );
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
    // Fire's burn is the counter to armour, so it gets its own tally.
    if (meta.source === 'burn') state.stats.burnKills += 1;
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
    // Whatever dies still burning sets its neighbours alight before it goes.
    if (unit.burnMs > 0) immolate(unit);
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

  // One event per reaction trigger. The payload is deliberately tiny — the
  // renderer only needs which reaction and where — but `reaction` must stay
  // exactly the copy key (see the REACTIONS table).
  function emitReaction(reaction, x, z) {
    emit('reaction', { reaction, x, z });
  }

  // Every slow that lands is a stack, whether it is a fresh one or a refresh of
  // one already running. The third in a row freezes the unit where it stands;
  // the count only survives while slows keep coming (see updateUnits).
  function applySlow(unit, ms, factor) {
    if (ms <= 0) return;
    unit.slowMs = Math.max(unit.slowMs, ms);
    unit.slowFactor = Math.min(unit.slowFactor, factor);
    unit.slowStacks = (unit.slowStacks || 0) + 1;
    unit.slowIdleMs = 0;
    if (unit.slowStacks < REACTIONS.deepFreeze.stacks) return;
    unit.slowStacks = 0;
    const freeze = unit.boss ? REACTIONS.deepFreeze.bossFreezeMs : REACTIONS.deepFreeze.freezeMs;
    unit.freezeMs = Math.max(unit.freezeMs || 0, freeze);
    emitReaction('deepFreeze', unit.x, unit.z);
  }

  function applyBurn(unit, dps, ms) {
    unit.burnDps = Math.max(unit.burnDps, dps);
    unit.burnMs = Math.max(unit.burnMs, ms);
  }

  // Immolate: a foe that dies still burning passes the fire on. Each neighbour
  // inside the radius gets half the dead unit's burn dps for the rest of its
  // burn, and the whole spread is one event.
  function immolate(unit) {
    const dps = unit.burnDps * REACTIONS.immolate.burnDpsMult;
    if (dps <= 0) return;
    const radiusSq = REACTIONS.immolate.radius * REACTIONS.immolate.radius;
    let lit = 0;
    for (const other of state.units) {
      if (other === unit) continue;
      const dx = other.x - unit.x;
      const dz = other.z - unit.z;
      if (dx * dx + dz * dz > radiusSq) continue;
      applyBurn(other, dps, unit.burnMs);
      lit += 1;
    }
    if (lit > 0) emitReaction('immolate', unit.x, unit.z);
  }

  // Direct damage goes through a unit's shield and armour; burn ticks do not
  // (see updateUnits), which is why Fire is the answer to armour.
  //
  // This is also where the wings react to each other. A dual bolt (the
  // ultimate) counts as both wings at once, and every reaction reads the state
  // the blow *landed on*, so a burn already ticking is what ice shatters and a
  // slow already holding is what fire melts — not the other way round.
  function damageUnit(unit, amount, element, options = {}) {
    const ice = element === 'ice' || Boolean(options.dual);
    const fire = element === 'fire' || Boolean(options.dual);
    const shatter = ice && (unit.burnMs || 0) > 0;
    const melt = fire && (unit.slowMs || 0) > 0;

    let damage = shatter ? amount * REACTIONS.shatter.damageMult : amount;
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
    // A shattered plate is no plate: the blow that breaks the burn lands whole.
    if (unit.modifier === 'armored' && !shatter) damage *= MODIFIERS.armored.directDamageMult;
    unit.hp -= damage;
    unit.hitFlashMs = 140;
    if (shatter) {
      // The ice goes out with the burn it landed on.
      unit.burnMs = 0;
      unit.burnDps = 0;
      emitReaction('shatter', unit.x, unit.z);
    }
    if (melt) {
      // Fire thaws what was holding the unit: the slow lets go, and the burn
      // this very blow applies comes with it twice as fierce (see below).
      unit.slowMs = 0;
      unit.slowFactor = 1;
      emitReaction('melt', unit.x, unit.z);
    }
    if (ice) {
      applySlow(unit, PLAYER.ice.slowMs * mods.iceSlow, PLAYER.ice.slowFactor / mods.iceSlowDepth);
    }
    if (fire && options.burn !== false) {
      applyBurn(
        unit,
        PLAYER.fire.burnDps * mods.burnDps * (melt ? REACTIONS.melt.burnDpsMult : 1),
        PLAYER.fire.burnMs
      );
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

  // The nearest enemy inside attack range, used only when the caller supplied
  // no aim at all (see firePlayerBolt).
  function nearestEnemyInRange(x, z, range) {
    const rangeSq = range * range;
    let target = null;
    let best = rangeSq;
    for (const unit of state.units) {
      const dx = unit.x - x;
      const dz = unit.z - z;
      const d = dx * dx + dz * dz;
      if (d >= best) continue;
      best = d;
      target = unit;
    }
    return target;
  }

  // The touch assist: the nearest enemy inside a half-angle cone around the aim,
  // inside attack range. Only the cone picks targets — free aim never homes.
  function nearestEnemyInCone(x, z, dirX, dirZ, range) {
    const rangeSq = range * range;
    let target = null;
    let best = rangeSq;
    for (const unit of state.units) {
      const dx = unit.x - x;
      const dz = unit.z - z;
      const d = dx * dx + dz * dz;
      if (d > best) continue;
      const distance = Math.sqrt(d);
      if (distance > 0.0001 && (dx * dirX + dz * dirZ) / distance < ASSIST_CONE_COS) continue;
      best = d;
      target = unit;
    }
    return target;
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
      // Mirror Ice blunts the wing that is not fire.
      (element === 'ice' ? omenMod('iceDamageMult') : 1) *
      (crit ? CRIT.mult : 1) *
      (ultOn ? ULT.damageMult : 1);
    const range = PLAYER.attackRange * mods.range;

    // Where the bolt goes. An aim from the caller is fired exactly where it
    // points — the assist cone is the only thing allowed to pick a target for
    // it, and a free-aimed bolt never homes. A caller that supplies no aim at
    // all (a zero vector, which is also the keyboard fallback) still gets the
    // pre-rework pick: the nearest threat in range, or the hero's own facing
    // when the road is empty. That keeps untouched callers, and the stored
    // input traces they replay, playing the same run they always did.
    let dirX = player.aimX;
    let dirZ = player.aimZ;
    const aimLength = Math.hypot(input.aimX, input.aimZ);
    if (aimLength <= 0.001) {
      const target = nearestEnemyInRange(player.x, player.z, range);
      if (target) {
        dirX = target.x - player.x;
        dirZ = target.z - player.z;
        const length = Math.hypot(dirX, dirZ) || 1;
        dirX /= length;
        dirZ /= length;
      }
    } else if (input.assistCone) {
      const target = nearestEnemyInCone(player.x, player.z, dirX, dirZ, range);
      if (target) {
        dirX = target.x - player.x;
        dirZ = target.z - player.z;
        const length = Math.hypot(dirX, dirZ) || 1;
        dirX /= length;
        dirZ /= length;
      }
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
    if (element === 'fire') state.stats.fireShots += 1;
    else state.stats.iceShots += 1;
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
    const ice = tower.kind === 'frost';
    state.projectiles.push({
      id: nextId++,
      owner: 'tower',
      element: ice ? 'ice' : 'fire',
      x: tower.x + (dx / length) * 0.6,
      z: tower.z + (dz / length) * 0.6,
      vx: (dx / length) * stats.projectileSpeed,
      vz: (dz / length) * stats.projectileSpeed,
      // Mirror Ice blunts frost spires as well as the Ice wing.
      damage: stats.damage * (ice ? omenMod('iceDamageMult') : 1),
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
      hp: def.maxHp * mods.towerHp,
      maxHp: def.maxHp * mods.towerHp,
    });
    state.stats.towersBuilt += 1;
    state.fx.push({
      id: nextId++,
      kind: 'build',
      x: socket.x,
      z: socket.z,
      element: kind === 'frost' ? 'ice' : 'fire',
      ttlMs: 620,
      maxTtlMs: 620,
      scale: 1.6,
    });
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
    tower.maxHp = towerStats(tower.kind, tower.level).maxHp * mods.towerHp;
    tower.hp = tower.maxHp;
    state.stats.upgrades += 1;
    state.fx.push({
      id: nextId++,
      kind: 'build',
      x: tower.x,
      z: tower.z,
      element: tower.kind === 'frost' ? 'ice' : 'fire',
      ttlMs: 620,
      maxTtlMs: 620,
      scale: 1.3 + tower.level * 0.12,
    });
    emit('upgraded', {
      kind: tower.kind,
      level: tower.level,
      socket: socketIndex,
      x: tower.x,
      z: tower.z,
    });
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
      damageUnit(unit, NOVA.damage * mods.novaDamage, player.element, {
        burn: false,
        source: 'nova',
      });
      applySlow(unit, NOVA.slowMs, 0.4);
      const length = Math.hypot(dx, dz) || 1;
      // The warlord shrugs the blast off; a gate ram cannot be moved at all.
      const push = ENEMY_KINDS[unit.kind].knockbackImmune ? 0 : unit.boss ? 0.1 : 0.35;
      unit.x += (dx / length) * NOVA.knockback * mods.novaKnockback * push;
      unit.z += (dz / length) * NOVA.knockback * mods.novaKnockback * push;
      if (unit.hp <= 0) killUnit(index, player.element, { source: 'nova' });
    }
    state.nova.charge = 0;
    state.nova.ready = false;
    state.fx.push({
      id: nextId++,
      kind: 'nova',
      x: player.x,
      z: player.z,
      element: player.element,
      ttlMs: 900,
      maxTtlMs: 900,
      scale: NOVA.radius,
    });
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
    state.fx.push({
      id: nextId++,
      kind: 'nova',
      x: player.x,
      z: player.z,
      element: player.element === 'fire' ? 'ice' : 'fire',
      ttlMs: 700,
      maxTtlMs: 700,
      scale: 6,
    });
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
    player.dashCdMs = DASH.cooldownMs * mods.dashCd;
    emit('dash', { x: player.x, z: player.z, dirX, dirZ });
  }

  function updatePlayer(dtMs) {
    const player = state.player;
    if (player.hitFlashMs > 0) player.hitFlashMs -= dtMs;
    if (player.attackCdMs > 0) player.attackCdMs -= dtMs;
    if (player.dashCdMs > 0) player.dashCdMs -= dtMs;
    if (player.swapCdMs > 0) player.swapCdMs -= dtMs;
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

    // An explicit aim turns the avatar to face it, and holds until the caller
    // sends another one. Movement is independent: the body keeps travelling the
    // way the stick points while the hero looks down the crosshair.
    const aimLength = Math.hypot(input.aimX, input.aimZ);
    if (aimLength > 0.001) {
      player.aimX = input.aimX / aimLength;
      player.aimZ = input.aimZ / aimLength;
      player.facing = Math.atan2(player.aimX, player.aimZ);
    }

    // Wings swap on a cooldown, so a wing is a commitment rather than a twitch.
    if (
      (input.swap === 'ice' || input.swap === 'fire') &&
      input.swap !== player.element &&
      player.swapCdMs <= 0
    ) {
      player.element = input.swap;
      player.swapCdMs = PLAYER.swapCooldownMs;
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
    if (distanceSq(state.core, slam) <= coreReach * coreReach)
      damageCore(damage * 0.4, unit.element);
    state.fx.push({
      id: nextId++,
      kind: 'slam',
      x: slam.x,
      z: slam.z,
      element: 'fire',
      ttlMs: 520,
      maxTtlMs: 520,
      scale: slam.radius,
    });
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

  // The herald's banner is a field, not a state change: every step each ally
  // inside the aura is marked for +25% speed and +25% damage, and the mark is
  // recomputed from the spawn values so leaving the radius gives them back
  // exactly. Two heralds do not stack — the shout is one shout. The scratch
  // array is reused so a step allocates nothing.
  const heralds = [];

  function updateAuras() {
    heralds.length = 0;
    for (const unit of state.units) {
      if (ENEMY_KINDS[unit.kind].aura) heralds.push(unit);
    }
    for (const unit of state.units) {
      // Seeded on first sight so a hand-built unit (fixtures, tests) works too.
      if (unit.baseSpeed === undefined) unit.baseSpeed = unit.speed;
      if (unit.baseDamage === undefined) unit.baseDamage = unit.damage;
      let speedMult = 1;
      let damageMult = 1;
      for (let index = 0; index < heralds.length; index += 1) {
        const herald = heralds[index];
        if (herald === unit) continue;
        const aura = ENEMY_KINDS[herald.kind].aura;
        if (distanceSq(unit, herald) > aura.radius * aura.radius) continue;
        if (aura.speedMult > speedMult) speedMult = aura.speedMult;
        if (aura.damageMult > damageMult) damageMult = aura.damageMult;
      }
      unit.auraSpeed = speedMult;
      unit.auraDamage = damageMult;
      unit.speed = unit.baseSpeed * speedMult;
      unit.damage = unit.baseDamage * damageMult;
    }
  }

  function updateUnits(dtMs) {
    const player = state.player;
    const seconds = dtMs / 1000;
    updateAuras();
    for (let index = state.units.length - 1; index >= 0; index -= 1) {
      const unit = state.units[index];
      if (!unit) continue;
      const def = ENEMY_KINDS[unit.kind];
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
        unit.slowIdleMs = 0;
      } else {
        unit.slowFactor = 1;
        // Slow stacks do not last forever: a unit that has been free of them
        // for a few seconds starts its next freeze from zero again.
        if (unit.slowStacks > 0) {
          unit.slowIdleMs = (unit.slowIdleMs || 0) + dtMs;
          if (unit.slowIdleMs >= REACTIONS.deepFreeze.stackDecayMs) {
            unit.slowStacks = 0;
            unit.slowIdleMs = 0;
          }
        }
      }

      // Deep Freeze: while it holds, the unit neither walks nor swings — and a
      // warlord mid-telegraph holds its arm where it was.
      if (unit.freezeMs > 0) {
        unit.freezeMs -= dtMs;
        continue;
      }

      // A telegraphing warlord plants its feet until the slam lands.
      if (unit.boss && updateBoss(unit, dtMs)) continue;

      // Choose the nearest thing worth hitting: the player if they are close
      // enough to be a threat, a tower in the way, otherwise the stronghold.
      // The saboteur is the exception — it walks past the hero to the nearest
      // standing tower, and only turns on the stronghold when none is left.
      let targetX = state.core.x;
      let targetZ = state.core.z;
      let targetKind = 0; // 0 core, 1 player, 2 tower
      let targetTower = null;
      let bestDistance = distanceSq(unit, state.core);
      if (def.towerHunter) {
        // The keep is the fallback, not a rival: any standing tower wins.
        bestDistance = Infinity;
        for (const tower of state.towers) {
          const towerDistance = distanceSq(unit, tower);
          if (towerDistance < bestDistance) {
            bestDistance = towerDistance;
            targetX = tower.x;
            targetZ = tower.z;
            targetKind = 2;
            targetTower = tower;
          }
        }
      } else {
        if (player.alive) {
          const playerDistance = distanceSq(unit, player);
          if (playerDistance < (unit.aggroRadius + 3) ** 2 && playerDistance < bestDistance) {
            targetX = player.x;
            targetZ = player.z;
            targetKind = 1;
            bestDistance = playerDistance;
          }
        }
        for (const tower of state.towers) {
          const towerDistance = distanceSq(unit, tower);
          if (towerDistance < unit.aggroRadius ** 2 && towerDistance < bestDistance) {
            targetX = tower.x;
            targetZ = tower.z;
            targetKind = 2;
            targetTower = tower;
            bestDistance = towerDistance;
          }
        }
      }

      const dx = targetX - unit.x;
      const dz = targetZ - unit.z;
      const distance = Math.hypot(dx, dz) || 1;
      unit.facing = Math.atan2(dx, dz);
      unit.targetX = targetX;
      unit.targetZ = targetZ;
      // A gate ram is not stopped by the space between it and its target: it
      // drives on until it is touching, so it can swing while it walks.
      const targetRadius =
        targetKind === 2 ? TOWER_BODY_RADIUS : targetKind === 1 ? PLAYER.radius : state.core.radius;
      const touching = Boolean(def.ram) && distance <= unit.radius + targetRadius;
      const inRange = distance <= unit.range + unit.radius || touching;

      if (unit.attackCdMs > 0) unit.attackCdMs -= dtMs;
      if (inRange && unit.attackCdMs <= 0) {
        unit.attackCdMs = def.attackCdMs;
        // Ranged units always lob, so their damage can be dodged; melee units
        // connect immediately with whatever they reached.
        if (unit.ranged) fireEnemyProjectile(unit);
        else if (targetKind === 1) damagePlayer(unit.damage);
        else if (targetKind === 0)
          damageCore(unit.damage * (def.coreDamageMult || 1), unit.element);
        else if (targetTower) damageTower(targetTower, unit.damage);
      }

      // A skirmisher kites: with the hero inside its kite radius it backs away
      // while it shoots, and only walks in when there is room to stand. Note
      // that kiting overrides the usual in-range hold, or a unit whose reach is
      // longer than its kite radius would never take a step back.
      let moveX = dx;
      let moveZ = dz;
      let kiting = false;
      if (def.kiteRadius && player.alive) {
        const awayX = unit.x - player.x;
        const awayZ = unit.z - player.z;
        if (awayX * awayX + awayZ * awayZ < def.kiteRadius * def.kiteRadius) {
          moveX = awayX;
          moveZ = awayZ;
          kiting = true;
        }
      }
      // Only ice roots a gate ram; nothing else in the arena makes it pause.
      const halted = def.ram ? unit.slowMs > 0 || touching : inRange && !kiting;
      if (!halted) {
        const length = Math.hypot(moveX, moveZ) || 1;
        const speed = unit.speed * unit.slowFactor;
        unit.x += (moveX / length) * speed * seconds;
        unit.z += (moveZ / length) * speed * seconds;
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
      const range = stats.range * mods.towerRange;
      const rangeSq = range ** 2;
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

  // A shieldwall only guards what it faces. The bolt's bearing is taken from
  // the wall, not from its own velocity, so a shot fired head-on is compared
  // against the arc the wall is already pointing at the shooter.
  function blocksBolt(unit, bolt) {
    const arcDeg = ENEMY_KINDS[unit.kind].blockArcDeg;
    if (!arcDeg) return false;
    const bearing = Math.atan2(bolt.x - unit.x, bolt.z - unit.z);
    let delta = Math.abs(bearing - unit.facing) % (Math.PI * 2);
    if (delta > Math.PI) delta = Math.PI * 2 - delta;
    return delta <= (arcDeg * Math.PI) / 180;
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
            if (dx * dx + dz * dz <= (TOWER_BODY_RADIUS + bolt.radius) ** 2) {
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
          // A shieldwall turns aside a bolt that lands on the arc it faces: the
          // shot is spent and nothing else happens. Splash, burn ticks, novas
          // and blades are not stopped this way.
          if (blocksBolt(unit, bolt)) {
            emit('blocked', {
              x: unit.x,
              z: unit.z,
              id: unit.id,
              kind: unit.kind,
              element: bolt.element,
            });
            consumed = true;
            break;
          }
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
          if (Math.abs(bolt.x - box.x) < box.w / 2 && Math.abs(bolt.z - box.z) < box.d / 2) {
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
          emit('pickup', {
            value: pickup.value,
            color: pickup.color,
            type: pickup.type,
            total: state.gold,
            x: pickup.x,
            z: pickup.z,
          });
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
      state.score += Math.round(
        (currentWave.reward + SCORE.waveClear * state.wave) * omenMod('scoreMult')
      );
      addUltCharge(ULT.perWave);
      emit('waveCleared', { wave: state.wave, boss: state.waveIsBoss });
      // An omen governs exactly one wave, so it clears here — and its gold is
      // paid with this wave's reward in the build phase that follows.
      const settled = state.omen;
      state.omen = null;
      if (!state.endless && state.wave >= state.wavesTotal) {
        state.campaignCleared = true;
        endRun('victory');
      } else {
        startBuildPhase(settled);
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
    state.omen = null;
    state.pendingOmen = null;
    state.omenOffered = false;
    state.draftOffered = false;
    state.draftOptions.length = 0;
    state.pendingBoon = null;
    state.draftPicked.length = 0;
    // Boons are run state, not hero state: a restarted run starts from the
    // hero's own multipliers again, exactly as the first attempt did.
    Object.assign(mods, heroMods(hero));
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
      // The aim is part of the run's starting state: a fresh run must not
      // inherit the way the last one happened to be facing.
      aimX: 0,
      aimZ: -1,
      facing: Math.PI,
      dashMs: 0,
      dashCdMs: 0,
      swapCdMs: 0,
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
    input.chooseOmen = null;
    input.chooseBoon = null;
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
    if (input.chooseOmen) chooseOmen(input.chooseOmen);
    if (input.chooseBoon) takeBoon(input.chooseBoon);
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
      state.omen || '-',
      state.pendingOmen || '-',
      state.draftOffered ? 1 : 0,
      state.pendingBoon || '-',
      state.draftPicked.join(',') || '-',
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
        Math.round(unit.shield * 100),
        Math.round(unit.freezeMs || 0),
        unit.slowStacks || 0
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
      // Aim and the assist flag are held like the stick is: an aim is only
      // dropped when the caller sends a zero vector or turns the cone off.
      if (command.aimX !== undefined) input.aimX = command.aimX;
      if (command.aimZ !== undefined) input.aimZ = command.aimZ;
      if (command.assistCone !== undefined) input.assistCone = Boolean(command.assistCone);
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
      if (command.chooseOmen !== undefined && command.chooseOmen !== null) {
        input.chooseOmen = command.chooseOmen;
      }
      if (command.chooseBoon !== undefined && command.chooseBoon !== null) {
        input.chooseBoon = command.chooseBoon;
      }
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
