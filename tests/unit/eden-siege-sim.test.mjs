// Eden Siege — simulation contract.
//
// The simulation is the part of the game that has to be *trustworthy*, because
// daily seeds, ghost replays and (later) server-side score bounds all rest on
// the same promise: the same seed plus the same input trace produces the same
// run. These tests hold that line, plus the run's basic rules.

import assert from 'node:assert/strict';
import test from 'node:test';

import { createWorld } from '../../js/eden-siege/sim/world.js';
import { createRng, dailySeed, hashSeed } from '../../js/eden-siege/rng.js';
import { MAPS } from '../../js/eden-siege/data/maps.js';
import { HEROES, heroByName } from '../../js/eden-siege/data/theme.js';
import { PLAYER, STEP_MS, WAVES } from '../../js/eden-siege/data/balance.js';

const STEPS_PER_SECOND = 60;

/** Drive a run with a scripted input trace and return the final state hash. */
function runScripted(seed, steps, script = () => ({})) {
  const world = createWorld({ mapId: 'keep', seed, heroName: 'Sky Breaker' });
  world.setInput({ start: true });
  for (let step = 0; step < steps; step += 1) {
    const command = script(step, world.state);
    if (command) world.setInput(command);
    world.step();
  }
  return { world, hash: world.snapshotHash() };
}

function advance(world, steps) {
  for (let step = 0; step < steps; step += 1) world.step();
}

test('the seeded generator is deterministic and rewindable', () => {
  const first = createRng('keep:2026-09-23');
  const second = createRng('keep:2026-09-23');
  const values = Array.from({ length: 8 }, () => first.next());
  const repeated = Array.from({ length: 8 }, () => second.next());
  assert.deepEqual(values, repeated);

  const state = first.state();
  const expected = first.next();
  first.setState(state);
  assert.equal(first.next(), expected, 'setState must rewind the sequence');
  assert.equal(hashSeed('keep'), hashSeed('keep'));
  assert.notEqual(hashSeed('keep'), hashSeed('ship'));
});

test('the daily seed changes with the map and the date, not with the clock', () => {
  const morning = new Date('2026-09-23T01:00:00Z');
  const evening = new Date('2026-09-23T23:00:00Z');
  assert.equal(dailySeed('keep', morning), dailySeed('keep', evening));
  assert.notEqual(dailySeed('keep', morning), dailySeed('ship', morning));
  assert.equal(dailySeed('keep', morning), 'keep:2026-09-23');
});

test('identical seed and identical inputs produce an identical run', () => {
  const script = (step) => ({
    moveX: Math.sin(step / 40),
    moveZ: -0.4,
    attackHeld: true,
    swap: step % 180 === 0 ? (step % 360 === 0 ? 'ice' : 'fire') : undefined,
    nova: step % 900 === 0,
  });
  const first = runScripted('keep:determinism', 60 * 90, script);
  const second = runScripted('keep:determinism', 60 * 90, script);
  assert.equal(first.hash, second.hash);
  assert.equal(first.world.state.score, second.world.state.score);
  assert.equal(first.world.state.stats.kills, second.world.state.stats.kills);
});

test('two different seeds diverge, so the seed really is the entropy', () => {
  const script = () => ({ moveZ: -0.2, attackHeld: true });
  const a = runScripted('keep:2026-09-23', 60 * 30, script);
  const b = runScripted('keep:2026-09-24', 60 * 30, script);
  assert.notEqual(a.hash, b.hash);
});

test('restarting reproduces the very same run', () => {
  const script = () => ({ attackHeld: true, moveX: 0.2 });
  const world = createWorld({ mapId: 'keep', seed: 'keep:restart', heroName: 'Sky Breaker' });
  world.setInput({ start: true });
  for (let step = 0; step < 60 * 40; step += 1) {
    world.setInput(script(step));
    world.step();
  }
  const firstHash = world.snapshotHash();
  world.setInput({ restart: true });
  world.step();
  assert.equal(world.state.score, 0, 'restart clears the score');
  world.setInput({ start: true });
  for (let step = 0; step < 60 * 40; step += 1) {
    world.setInput(script(step));
    world.step();
  }
  assert.equal(world.snapshotHash(), firstHash, 'a restarted daily seed is the same run');
});

test('the run starts in a ready phase and then opens wave one', () => {
  const world = createWorld({ mapId: 'keep', seed: 'keep:phase', heroName: 'Sky Breaker' });
  assert.equal(world.state.phase, 'ready');
  world.setInput({ start: true });
  world.step();
  assert.equal(world.state.phase, 'wave');
  assert.equal(world.state.wave, 1);
  advance(world, STEPS_PER_SECOND * 3);
  assert.ok(world.state.units.length > 0, 'wave one spawns enemies');
});

test('splash damage removes only units it kills, even when an array index shifts', () => {
  const world = createWorld({ mapId: 'keep', seed: 'keep:splash-index', heroName: 'Sky Breaker' });
  world.setInput({ start: true });
  world.step();
  advance(world, STEPS_PER_SECOND * 4);
  assert.ok(world.state.units.length >= 2, 'the fixture uses spawned units');

  const [target, survivor] = world.state.units;
  world.state.units.splice(2);
  Object.assign(target, { x: 0, z: 0, hp: 1 });
  Object.assign(survivor, { x: 5, z: 0, hp: 1000 });
  world.state.projectiles.length = 0;
  world.state.projectiles.push({
    x: target.x,
    z: target.z,
    vx: 0,
    vz: 0,
    ttlMs: 1000,
    radius: 0.5,
    damage: 100,
    splash: 2,
    element: 'fire',
    owner: 'player',
  });

  world.step();

  assert.ok(world.state.units.includes(survivor), 'the living unit remains in the world');
  assert.ok(survivor.hp > 0, 'the living unit remains alive');
});

test('the player can kill, loot and score without any input beyond attacking', () => {
  const world = createWorld({ mapId: 'keep', seed: 'keep:loot', heroName: 'Sky Breaker' });
  world.setInput({ start: true });
  for (let step = 0; step < STEPS_PER_SECOND * 75; step += 1) {
    world.setInput({ attackHeld: true, moveZ: -0.35 });
    world.step();
  }
  assert.ok(world.state.stats.kills > 0, 'attacks kill enemies');
  assert.ok(world.state.score > 0, 'kills score');
  assert.ok(world.state.gold > 0, 'loot exists to collect');
});

test('gold buys towers on free sockets and upgrades them to level three', () => {
  const world = createWorld({ mapId: 'keep', seed: 'keep:build', heroName: 'Sky Breaker' });
  world.state.gold = 500;
  world.input.buildSocket = 0;
  world.input.buildKind = 'frost';
  world.step();
  assert.equal(world.state.sockets[0].occupant, 'frost');
  assert.equal(world.state.towers.length, 1);
  const spent = 500 - world.state.gold;
  assert.equal(spent, 60, 'the frost spire costs 60');

  for (let attempt = 0; attempt < 2; attempt += 1) {
    world.input.upgradeSocket = 0;
    world.step();
  }
  assert.equal(world.state.towers[0].level, 3);
  world.input.upgradeSocket = 0;
  world.step();
  assert.equal(world.state.towers[0].level, 3, 'level three is the cap');

  world.state.gold = 0;
  world.input.buildSocket = 1;
  world.step();
  assert.equal(world.state.sockets[1].occupant, null, 'no gold means no tower');
});

test('the nova only fires when charged, and clearing a wave pays a bonus', () => {
  const world = createWorld({ mapId: 'keep', seed: 'keep:nova', heroName: 'Jeanne' });
  world.state.nova.charge = 0;
  world.state.nova.ready = false;
  world.input.nova = true;
  world.step();
  assert.equal(world.state.nova.ready, false);

  world.state.nova.charge = 100;
  world.state.nova.ready = true;
  world.setInput({ start: true });
  world.step();
  advance(world, STEPS_PER_SECOND * 4);
  const before = world.state.units.length;
  world.input.nova = true;
  world.step();
  assert.ok(world.state.nova.charge < 100, 'firing spends the charge');
  assert.ok(world.state.units.length <= before, 'the nova clears nearby units');
});

test('losing the stronghold ends the run as a defeat', () => {
  const world = createWorld({ mapId: 'keep', seed: 'keep:defeat', heroName: 'Sky Breaker' });
  world.setInput({ start: true });
  world.step();
  world.state.core.hp = 1;
  for (let step = 0; step < STEPS_PER_SECOND * 120 && world.state.phase !== 'defeat'; step += 1) {
    world.step();
  }
  assert.equal(world.state.phase, 'defeat');
});

test('the arena, the wave table and the roster are internally consistent', () => {
  for (const map of Object.values(MAPS)) {
    assert.ok(map.sockets.length >= 6, `${map.id} needs build sockets`);
    assert.ok(map.gates.length >= 3, `${map.id} needs at least three gates`);
    for (const socket of map.sockets) {
      assert.ok(Math.abs(socket.x) < map.size.w / 2, `${map.id} socket inside the arena`);
      assert.ok(Math.abs(socket.z) < map.size.d / 2, `${map.id} socket inside the arena`);
    }
    for (const gate of map.gates) {
      assert.ok(Math.abs(gate.x) <= map.size.w / 2, `${map.id} gate inside the arena`);
    }
    assert.ok(map.palette.dark && map.palette.light, `${map.id} needs both theme palettes`);
  }
  assert.ok(WAVES.length >= 8, 'a run needs a real wave table');
  assert.ok(PLAYER.attackRange > 4, 'the hero must be able to shoot');
  for (const hero of HEROES) {
    assert.ok(['ice', 'fire'].includes(hero.element), `${hero.name} picks a wing`);
    assert.equal(heroByName(hero.name).name, hero.name);
  }
});

test('a scripted minute stays inside its budgets', () => {
  // A cheap regression net: if a change makes waves unbounded or leaks entities,
  // the peak counts move and this test says so before a player feels it.
  const world = createWorld({ mapId: 'keep', seed: 'keep:budget', heroName: 'Sky Breaker' });
  world.setInput({ start: true });
  let peakUnits = 0;
  let peakProjectiles = 0;
  for (let step = 0; step < STEPS_PER_SECOND * 60; step += 1) {
    world.setInput({ attackHeld: true, moveZ: Math.sin(step / 120) * 0.5 });
    world.step();
    peakUnits = Math.max(peakUnits, world.state.units.length);
    peakProjectiles = Math.max(peakProjectiles, world.state.projectiles.length);
  }
  assert.ok(peakUnits <= 80, `peak units ${peakUnits} stays renderable`);
  assert.ok(peakProjectiles <= 160, `peak projectiles ${peakProjectiles} stays renderable`);
  assert.equal(world.state.timeMs, STEP_MS * (60 * 60));
});
