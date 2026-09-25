// Velo's Rampart — combat contract.
//
// Aiming, the six role troops, wave omens and the combat counters. Everything
// here is the deterministic simulation under a fixed 60 Hz step, so each test
// drives a real world with setInput/step and asserts on what came out.

import assert from 'node:assert/strict';
import test from 'node:test';

import { createWorld } from '../../js/eden-siege/sim/world.js';
import {
  BOSS,
  CRIT,
  ENEMY_KINDS,
  GOLD,
  OMENS,
  OMEN_ORDER,
  PLAYER,
  STEP_MS,
  TIER_SCALE,
  WAVES,
} from '../../js/eden-siege/data/balance.js';

const SECOND = 60;

function createCombatWorld(seed = 'keep:combat', options = {}) {
  return createWorld({ mapId: 'keep', seed, heroName: 'Sky Breaker', ...options });
}

function advance(world, steps, command) {
  for (let step = 0; step < steps; step += 1) {
    if (command) world.setInput(typeof command === 'function' ? command(step) : command);
    world.step();
  }
}

let nextFixtureId = 9000;

/**
 * Put a unit in the arena by hand, built from its balance entry. Tests that
 * measure one rule want exactly one unit on the field, which no wave offers.
 */
function place(world, kind, x, z, overrides = {}) {
  const def = ENEMY_KINDS[kind];
  nextFixtureId += 1;
  const unit = {
    id: nextFixtureId,
    kind,
    art: def.art || kind,
    tier: 1,
    element: 'ice',
    modifier: null,
    boss: false,
    x,
    z,
    vx: 0,
    vz: 0,
    hp: def.hp,
    maxHp: def.hp,
    shield: 0,
    maxShield: 0,
    damage: def.damage,
    baseDamage: def.damage,
    speed: def.speed,
    baseSpeed: def.speed,
    score: def.score,
    radius: def.radius,
    ranged: Boolean(def.ranged),
    range: def.range,
    aggroRadius: def.aggroRadius,
    attackCdMs: 1e9,
    slowMs: 0,
    slowFactor: 1,
    burnMs: 0,
    burnDps: 0,
    facing: 0,
    hitFlashMs: 0,
    slamCdMs: 0,
    telegraph: null,
    targetX: 0,
    targetZ: 0,
  };
  Object.assign(unit, overrides);
  world.state.units.push(unit);
  return unit;
}

/** Skip to the build phase that precedes `wave`, choose an omen, then open it. */
function openWaveWithOmen(omen, wave = 3, seed = 'keep:omen') {
  const world = createCombatWorld(seed);
  world.setInput({ start: true });
  world.step();
  world.state.units.length = 0;
  world.state.projectiles.length = 0;
  world.state.wave = wave - 1;
  world.state.phase = 'build';
  world.state.phaseMs = STEP_MS * 120;
  world.step();
  assert.equal(world.state.phase, 'build');
  world.setInput({ chooseOmen: omen });
  world.step();
  world.setInput({ start: true });
  world.step();
  assert.equal(world.state.phase, 'wave');
  assert.equal(world.state.wave, wave);
  return world;
}

/** Jump straight to the start of a wave, the way the depth suite does. */
function jumpToWave(world, wave) {
  world.setInput({ start: true });
  world.step();
  world.state.units.length = 0;
  world.state.projectiles.length = 0;
  world.state.wave = wave - 1;
  world.state.phase = 'build';
  world.state.phaseMs = STEP_MS / 2;
  world.step();
  assert.equal(world.state.phase, 'wave');
  assert.equal(world.state.wave, wave);
  return world;
}

/** Fire one bolt and hand back the projectile it produced. */
function fireBolt(world, element, aim = { aimX: 0, aimZ: -1 }) {
  world.state.player.element = element;
  world.state.player.attackCdMs = 0;
  world.state.projectiles.length = 0;
  world.setInput({ attack: true, ...aim });
  world.step();
  world.setInput({ attack: false });
  const bolt = world.state.projectiles.find((entry) => entry.owner === 'player');
  assert.ok(bolt, `a ${element} bolt left the hero`);
  return bolt;
}

function expectedBoltDamage(world, element, crit) {
  const def = element === 'fire' ? PLAYER.fire : PLAYER.ice;
  const mod = element === 'fire' ? world.mods.fireDamage : world.mods.iceDamage;
  return def.damage * mod * (crit ? CRIT.mult : 1);
}

test('free aim flies straight, so a bolt only lands when it is aimed at the target', () => {
  const world = createCombatWorld('keep:freeaim');
  const player = world.state.player;
  const target = place(world, 'ranger', player.x, player.z - 6, {
    hp: 1000,
    maxHp: 1000,
    speed: 0,
  });

  // A quarter turn off the target's bearing: the bolt has nothing to hit.
  world.setInput({ attack: true, aimX: 1, aimZ: 0, attackHeld: true });
  advance(world, 30);
  world.setInput({ attack: false });
  assert.equal(target.hp, 1000, 'a free-aimed bolt does not home onto the nearest enemy');

  // Turned back onto it, the same shot connects.
  world.setInput({ attack: true, aimX: 0, aimZ: -1, attackHeld: true });
  advance(world, 30);
  world.setInput({ attack: false });
  assert.ok(target.hp < 1000, 'the bolt lands once the crosshair is on the target');
});

test('an explicit aim turns the hero without touching the way it travels', () => {
  const world = createCombatWorld('keep:aimfacing');
  const player = world.state.player;
  const before = { x: player.x, z: player.z };

  world.setInput({ moveZ: -1, aimX: 1, aimZ: 0 });
  advance(world, 120);

  assert.ok(Math.abs(player.aimX - 1) < 1e-9, 'the hero aims where the caller points');
  assert.ok(Math.abs(player.aimZ) < 1e-9);
  assert.ok(Math.abs(player.facing - Math.PI / 2) < 1e-9, 'and faces it');
  assert.ok(player.z < before.z - 3, 'while still walking where the movement stick points');
});

test('the touch assist cone takes a target inside 35 degrees and leaves the rest alone', () => {
  const inside = createCombatWorld('keep:cone');
  const insidePlayer = inside.state.player;
  const angle = (30 * Math.PI) / 180;
  const insideTarget = place(
    inside,
    'ranger',
    insidePlayer.x - Math.sin(angle) * 6,
    insidePlayer.z - Math.cos(angle) * 6,
    { hp: 1000, maxHp: 1000, speed: 0 }
  );
  inside.setInput({ attack: true, aimX: 0, aimZ: -1, assistCone: true, attackHeld: true });
  advance(inside, 30);
  inside.setInput({ attack: false });
  assert.ok(insideTarget.hp < 1000, 'inside the cone the bolt is turned onto the enemy');

  const outside = createCombatWorld('keep:cone');
  const outsidePlayer = outside.state.player;
  const wide = (50 * Math.PI) / 180;
  const outsideTarget = place(
    outside,
    'ranger',
    outsidePlayer.x - Math.sin(wide) * 6,
    outsidePlayer.z - Math.cos(wide) * 6,
    { hp: 1000, maxHp: 1000, speed: 0 }
  );
  outside.setInput({ attack: true, aimX: 0, aimZ: -1, assistCone: true, attackHeld: true });
  advance(outside, 30);
  outside.setInput({ attack: false });
  assert.equal(outsideTarget.hp, 1000, 'outside the cone the assist does not reach');
});

test('a shieldwall turns aside a frontal bolt, and nothing else gets through either', () => {
  const world = createCombatWorld('keep:shield');
  const player = world.state.player;
  // Six units down the lane, so it is facing the hero who is shooting it.
  const wall = place(world, 'shieldwall', player.x, player.z - 6, { hp: 1000, maxHp: 1000 });
  world.step();
  assert.equal(wall.facing, 0, 'the wall faces the hero');

  world.drainEvents();
  const before = wall.hp;
  world.setInput({ attack: true, aimX: 0, aimZ: -1 });
  world.step();
  world.setInput({ attack: false });
  advance(world, 30);
  const blocked = world.drainEvents().filter((event) => event.type === 'blocked');
  assert.equal(wall.hp, before, 'the frontal bolt is consumed without doing damage');
  assert.equal(blocked.length, 1, 'and it announces itself so effects can spark');
  assert.equal(world.state.projectiles.length, 0, 'the shot is spent, not left in the air');

  // The same bolt from behind is not on the shielded arc.
  world.state.projectiles.length = 0;
  world.state.projectiles.push({
    x: wall.x,
    z: wall.z - 1,
    vx: 0,
    vz: 2,
    ttlMs: 200,
    radius: 0.5,
    damage: 10,
    splash: 0,
    element: 'fire',
    owner: 'tower',
  });
  world.step();
  assert.ok(wall.hp < before, 'the back of the shield is not a shield');

  // Nova and splash do not care which way the wall is looking.
  wall.hp = 1000;
  world.state.projectiles.length = 0;
  world.state.nova.charge = 100;
  world.state.nova.ready = true;
  world.setInput({ nova: true });
  world.step();
  assert.ok(wall.hp < 1000, 'a nova washes over the shield');

  const bait = place(world, 'ranger', wall.x + 2, wall.z, { hp: 1000, maxHp: 1000, speed: 0 });
  wall.hp = 1000;
  world.state.projectiles.length = 0;
  world.state.projectiles.push({
    x: bait.x,
    z: bait.z,
    vx: 0,
    vz: 0,
    ttlMs: 200,
    radius: 0.5,
    damage: 20,
    splash: 3,
    element: 'fire',
    owner: 'player',
  });
  world.step();
  assert.ok(wall.hp < 1000, 'splash carries round the shield');
  assert.ok(bait.hp < 1000, 'and the bolt still hits what it actually struck');
});

test('a saboteur walks past the hero for the towers, and only then for the keep', () => {
  const world = createCombatWorld('keep:saboteur');
  world.state.gold = 500;
  world.setInput({ buildSocket: 0, buildKind: 'frost' });
  world.step();
  const tower = world.state.towers[0];
  assert.ok(tower, 'the fixture built a tower');

  const saboteur = place(world, 'saboteur', world.state.core.x, world.state.core.z - 6, {
    hp: 1000,
    maxHp: 1000,
  });
  const coreHp = world.state.core.hp;
  advance(world, 120);
  assert.equal(saboteur.targetX, tower.x, 'it is making for the tower');
  assert.equal(saboteur.targetZ, tower.z);
  assert.equal(world.state.core.hp, coreHp, 'the stronghold is not its business yet');

  // With the last tower gone there is nothing to sabotage but the keep.
  world.state.towers.length = 0;
  world.state.sockets[0].occupant = null;
  Object.assign(saboteur, { x: world.state.core.x, z: world.state.core.z - 1, attackCdMs: 0 });
  const before = world.state.core.hp;
  world.step();
  const dealt = before - world.state.core.hp;
  assert.equal(saboteur.targetX, world.state.core.x, 'now it goes for the stronghold');
  assert.ok(dealt > 0, 'and it does land blows');
  assert.ok(dealt < ENEMY_KINDS.saboteur.damage, 'but it is no siege engine');
});

test('a herald pulls the ally beside it measurably further in the same steps', () => {
  const bare = createCombatWorld('keep:aura');
  const alone = place(bare, 'cavalry', 0, -10);
  const led = createCombatWorld('keep:aura');
  const allied = place(led, 'cavalry', 0, -10);
  const herald = place(led, 'herald', 2, -10);

  advance(bare, SECOND);
  advance(led, SECOND);

  const bareTravel = alone.z - -10;
  const ledTravel = allied.z - -10;
  assert.ok(
    Math.hypot(allied.x - herald.x, allied.z - herald.z) < ENEMY_KINDS.herald.aura.radius,
    'the ally stayed inside the banner'
  );
  assert.ok(bareTravel > 3, `the unled cavalryman walks (${bareTravel.toFixed(2)})`);
  assert.ok(
    ledTravel > bareTravel * 1.15,
    `the led one outpaces it (${ledTravel.toFixed(2)} vs ${bareTravel.toFixed(2)})`
  );
  assert.ok(
    Math.abs(ledTravel - bareTravel * ENEMY_KINDS.herald.aura.speedMult) < 1e-9,
    'by exactly the aura'
  );
  assert.equal(alone.damage, ENEMY_KINDS.cavalry.damage, 'the unled one swings its own weight');
  assert.equal(allied.damage, ENEMY_KINDS.cavalry.damage * ENEMY_KINDS.herald.aura.damageMult);
  assert.equal(allied.auraSpeed, ENEMY_KINDS.herald.aura.speedMult, 'the mark is on the ally');
  assert.equal(allied.auraDamage, ENEMY_KINDS.herald.aura.damageMult);

  // Take the banner away and the mark comes off the ally again.
  led.state.units.splice(led.state.units.indexOf(herald), 1);
  led.step();
  assert.equal(
    allied.damage,
    ENEMY_KINDS.cavalry.damage,
    'and the shout wears off with the herald'
  );
  assert.equal(allied.speed, ENEMY_KINDS.cavalry.speed);
  assert.equal(allied.auraSpeed, 1);
});

test('a skirmisher backs away from the hero while it keeps shooting', () => {
  const world = createCombatWorld('keep:kite');
  const player = world.state.player;
  const skirmisher = place(world, 'skirmisher', player.x, player.z - 4, {
    hp: 1000,
    maxHp: 1000,
    attackCdMs: 0,
  });
  const gap = () => Math.hypot(skirmisher.x - player.x, skirmisher.z - player.z);
  const start = gap();
  assert.ok(start < ENEMY_KINDS.skirmisher.kiteRadius, 'it starts inside its kite radius');

  advance(world, SECOND);
  assert.ok(gap() > start + 1, `it makes room (${start.toFixed(2)} -> ${gap().toFixed(2)})`);
  assert.ok(gap() <= ENEMY_KINDS.skirmisher.kiteRadius + 0.2, 'but only as far as its leash');
  assert.ok(world.state.stats.damageTaken > 0, 'and it shoots the whole way out');
});

test('a hauler drops twice the loot and carries a heavier price on its head', () => {
  const world = createCombatWorld('keep:hauler');
  const cart = place(world, 'hauler', 0, -3, { hp: 1, maxHp: 1, tier: 2, speed: 0 });
  const foot = place(world, 'ranger', 3, -3, { hp: 1, maxHp: 1, tier: 2, speed: 0 });

  const kill = (unit) => {
    world.state.projectiles.length = 0;
    world.state.projectiles.push({
      x: unit.x,
      z: unit.z,
      vx: 0,
      vz: 0,
      ttlMs: 60,
      radius: 0.5,
      damage: 10_000,
      splash: 0,
      element: 'ice',
      owner: 'player',
    });
    world.step();
    return world.state.pickups[world.state.pickups.length - 1];
  };

  const footDrop = kill(foot);
  const cartDrop = kill(cart);
  assert.equal(
    cartDrop.value,
    Math.round((GOLD.byTier[2] || 3) * world.mods.gold * ENEMY_KINDS.hauler.goldMult)
  );
  assert.equal(cartDrop.value, footDrop.value * ENEMY_KINDS.hauler.goldMult);
  assert.ok(
    ENEMY_KINDS.hauler.score > ENEMY_KINDS.ranger.score * 4,
    'and it is worth several times the score of the troops around it'
  );
});

test('a gate ram spawns with boss waves from the tenth, and nowhere before it', () => {
  const late = jumpToWave(createCombatWorld('keep:ram:late'), Math.max(BOSS.ramFromWave, 10));
  late.state.core.hp = 1_000_000;
  let ram = null;
  for (let step = 0; step < SECOND * 12 && !ram; step += 1) {
    late.step();
    ram = late.state.units.find((unit) => unit.kind === BOSS.ramKind) || null;
  }
  assert.ok(ram, 'the tenth wave sends a ram with its warlord');
  assert.equal(ram.art, 'dreadnought', 'the ram reuses shipped art');
  assert.ok(ram.radius > ENEMY_KINDS.warlord.radius * 0.9, 'and it is a big one');
  assert.ok(ram.hp > ENEMY_KINDS.warlord.hp, 'with more health than the warlord itself');
  assert.ok(ram.speed < ENEMY_KINDS.warlord.speed, 'and it is the slowest thing in the game');

  const early = jumpToWave(createCombatWorld('keep:ram:early'), 5);
  early.state.core.hp = 1_000_000;
  for (let step = 0; step < SECOND * 10; step += 1) {
    early.step();
    assert.ok(
      !early.state.units.some((unit) => unit.kind === BOSS.ramKind),
      'the fifth wave is escorted by escorts, not a battering ram'
    );
  }
});

test('a gate ram is never pushed, only rooted, and it hits the stronghold hardest', () => {
  const world = createCombatWorld('keep:ram');
  const ram = place(world, 'gateRam', 0, -6, { hp: 100_000, maxHp: 100_000, attackCdMs: 0 });
  const spot = { x: ram.x, z: ram.z };

  world.state.nova.charge = 100;
  world.state.nova.ready = true;
  world.setInput({ nova: true });
  world.step();
  assert.equal(ram.x, spot.x, 'the nova cannot move it');
  assert.equal(ram.z, spot.z);
  assert.ok(ram.slowMs > 0, 'but the ice in it sticks');

  // Slowed is the only thing that stops a ram.
  const rooted = { x: ram.x, z: ram.z };
  advance(world, 60);
  assert.equal(ram.x, rooted.x, 'while the slow holds, the ram does not move');
  assert.equal(ram.z, rooted.z);
  advance(world, Math.ceil(ram.slowMs / STEP_MS) + 2);
  assert.ok(ram.z > rooted.z, 'and once it lifts, the ram is on its way again');

  // Pointed at the stronghold, it lands heavier blows than it does on troops.
  Object.assign(ram, {
    x: world.state.core.x,
    z: world.state.core.z - 1,
    slowMs: 0,
    attackCdMs: 0,
  });
  const before = world.state.core.hp;
  world.step();
  const dealt = before - world.state.core.hp;
  assert.ok(dealt > ram.damage, `the ram puts ${dealt.toFixed(1)} into the stronghold in one blow`);
  assert.ok(Math.abs(dealt - ram.damage * ENEMY_KINDS.gateRam.coreDamageMult) < 1e-9);
});

test('Iron Tide arms every spawn in its wave and hands over a fatter purse', () => {
  const tide = openWaveWithOmen('ironTide', 3);
  assert.equal(tide.state.omen, 'ironTide');
  assert.deepEqual(
    tide.drainEvents().filter((event) => event.type === 'omen'),
    [{ type: 'omen', omen: 'ironTide', wave: 3 }],
    'the wave announces the omen it carries'
  );
  advance(tide, SECOND * 6);
  assert.ok(tide.state.units.length > 0, 'the wave sent somebody');
  assert.ok(
    tide.state.units.every((unit) => unit.modifier === 'armored'),
    'and every one of them is armoured'
  );

  const plain = openWaveWithOmen('skip', 3);
  assert.equal(plain.state.omen, null, "picking 'skip' leaves the wave unomened");

  const cleared = (world) => {
    const gold = world.state.gold;
    for (let step = 0; step < SECOND * 30 && world.state.phase === 'wave'; step += 1) {
      world.state.units.length = 0;
      world.step();
    }
    assert.equal(world.state.phase, 'build');
    assert.equal(world.state.omen, null, 'the omen clears with the wave it governed');
    return world.state.gold - gold;
  };
  assert.equal(cleared(plain), WAVES[2].reward, 'an unomened wave pays the listed reward');
  assert.equal(
    cleared(tide),
    Math.round(WAVES[2].reward * OMENS.ironTide.goldMult),
    'and Iron Tide pays half again on top of it'
  );
});

test('the offer opens at wave three, and never closes once the siege is endless', () => {
  const toBuildPhase = (world) => {
    for (let step = 0; step < SECOND * 40 && world.state.phase !== 'build'; step += 1) {
      world.state.units.length = 0;
      world.step();
    }
    assert.equal(world.state.phase, 'build');
  };

  const early = createCombatWorld('keep:omen:early');
  early.setInput({ start: true });
  early.step();
  toBuildPhase(early);
  assert.equal(early.state.omenOffered, false, 'the campaign offers nothing before wave three');
  early.setInput({ chooseOmen: 'bloodMoon' });
  early.step();
  early.setInput({ start: true });
  early.step();
  assert.equal(early.state.wave, 2);
  assert.equal(early.state.omen, null, 'so a choice made there is not honoured');

  const endless = createCombatWorld('keep:omen:endless', { mode: 'endless' });
  endless.setInput({ start: true });
  endless.step();
  toBuildPhase(endless);
  assert.equal(endless.state.omenOffered, true, 'endless offers one every wave');
  endless.setInput({ chooseOmen: 'bloodMoon' });
  endless.step();
  endless.setInput({ start: true });
  endless.step();
  assert.equal(endless.state.wave, 2);
  assert.equal(endless.state.omen, 'bloodMoon', 'and honours the choice as early as wave two');
});

test('Blood Moon sends the same wave in faster', () => {
  const moon = openWaveWithOmen('bloodMoon', 3);
  const plain = openWaveWithOmen('skip', 3);
  assert.equal(moon.state.omen, 'bloodMoon');
  advance(moon, SECOND * 4);
  advance(plain, SECOND * 4);

  const speeds = (world, kind) =>
    world.state.units.filter((unit) => unit.kind === kind).map((unit) => unit.speed);
  for (const kind of ['cavalry', 'ranger']) {
    const lifted = speeds(moon, kind);
    const natural = speeds(plain, kind);
    assert.ok(lifted.length > 0 && natural.length > 0, `the wave sent a ${kind}`);
    assert.ok(
      Math.abs(lifted[0] - natural[0] * OMENS.bloodMoon.speedMult) < 1e-9,
      `the ${kind} runs 25% faster under the Blood Moon`
    );
  }
  assert.equal(
    speeds(plain, 'cavalry')[0],
    ENEMY_KINDS.cavalry.speed * TIER_SCALE.speed[2],
    'and no faster without it'
  );
});

test('Mirror Ice quarters the Ice wing, leaves Fire alone and pays for it', () => {
  const shots = (omen) => {
    const world = openWaveWithOmen(omen, 3);
    return {
      omen: world.state.omen,
      ice: fireBolt(world, 'ice'),
      fire: fireBolt(world, 'fire'),
      world,
    };
  };
  const plain = shots('skip');
  const mirror = shots('mirrorIce');
  assert.equal(mirror.omen, 'mirrorIce');

  assert.equal(plain.ice.damage, expectedBoltDamage(plain.world, 'ice', plain.ice.crit));
  assert.equal(
    mirror.ice.damage,
    expectedBoltDamage(mirror.world, 'ice', mirror.ice.crit) * OMENS.mirrorIce.iceDamageMult,
    'ice barely bites under the Mirror'
  );
  assert.ok(mirror.ice.damage < plain.ice.damage, 'and lands softer than the same bolt without it');
  assert.equal(
    mirror.fire.damage,
    expectedBoltDamage(mirror.world, 'fire', mirror.fire.crit),
    'fire is untouched'
  );
  assert.equal(mirror.fire.damage, plain.fire.damage, 'and is worth exactly what it always was');
});

test('Fog of War is readable all wave, and it lifts what the wave pays', () => {
  const scoreFor = (omen) => {
    const world = openWaveWithOmen(omen, 3);
    assert.equal(world.state.omen, omen === 'skip' ? null : omen);
    // Clear the wave's own troops so the fixture is the only thing on the field.
    world.state.units.length = 0;
    world.state.projectiles.length = 0;
    const victim = place(world, 'ranger', world.state.core.x, world.state.core.z - 2, {
      hp: 1,
      maxHp: 1,
      speed: 0,
      score: 10,
    });
    const before = world.state.score;
    world.state.projectiles.push({
      x: victim.x,
      z: victim.z,
      vx: 0,
      vz: 0,
      ttlMs: 60,
      radius: 0.5,
      damage: 500,
      splash: 0,
      element: 'ice',
      owner: 'player',
    });
    world.step();
    assert.ok(!world.state.units.includes(victim), 'the fixture dies to the bolt');
    return world.state.score - before;
  };

  const plain = scoreFor('skip');
  const fog = scoreFor('fogOfWar');
  assert.equal(plain, Math.round(10 * 1.25), 'the first kill pays its chain step');
  assert.equal(
    fog,
    Math.round(10 * 1.25 * OMENS.fogOfWar.scoreMult),
    'Fog of War lifts what the same kill pays'
  );
});

test('the shot and burn counters tally by wing and by source', () => {
  const world = createCombatWorld('keep:counters');
  fireBolt(world, 'ice');
  fireBolt(world, 'fire');
  assert.equal(world.state.stats.iceShots, 1);
  assert.equal(world.state.stats.fireShots, 1);
  assert.equal(world.state.stats.shotsFired, 2);

  world.state.projectiles.length = 0;
  place(world, 'ranger', 0, -3, {
    hp: 1,
    maxHp: 1,
    speed: 0,
    burnDps: 120,
    burnMs: 500,
  });
  advance(world, 1);
  assert.equal(world.state.stats.burnKills, 1, 'a burn tick that finishes a unit counts');
  assert.equal(world.state.stats.kills, 1);
});

test('the same seed and the same combat trace replay to the same hash', () => {
  // A holding pattern with the cone on: the hero stands its ground and shoots
  // down the lane, picking omens, dashing and firing the nova as it goes.
  const trace = (step) => {
    const command = {
      moveX: Math.sin(step / 60) * 0.5,
      moveZ: Math.cos(step / 120) * 0.2,
      attackHeld: true,
      aimX: Math.sin(step / 45) * 0.4,
      aimZ: -1,
      assistCone: step % 180 < 150,
    };
    if (step % 600 === 0) command.chooseOmen = OMEN_ORDER[(step / 600) % OMEN_ORDER.length];
    if (step % 420 === 0) command.dash = true;
    if (step % 900 === 0) command.nova = true;
    return command;
  };
  const run = () => {
    const world = createCombatWorld('keep:combat-determinism');
    world.setInput({ start: true });
    advance(world, SECOND * 90, trace);
    return world;
  };
  const first = run();
  const second = run();
  assert.ok(first.state.stats.kills > 5, 'the trace actually fights');
  assert.equal(first.snapshotHash(), second.snapshotHash());
  assert.equal(first.state.score, second.state.score);
  assert.equal(first.state.stats.burnKills, second.state.stats.burnKills);
  assert.equal(first.state.omen, second.state.omen);

  // The omen is part of the run's identity, not a rendering detail.
  const omenRun = openWaveWithOmen('ironTide', 3);
  const plainRun = openWaveWithOmen('skip', 3);
  advance(omenRun, SECOND * 2);
  advance(plainRun, SECOND * 2);
  assert.notEqual(omenRun.snapshotHash(), plainRun.snapshotHash());
});
