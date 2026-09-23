// Eden Siege — depth and replay contract.
//
// Upgrade tiers, enemy modifiers, boss cadence, Velo's dash and ultimate, the
// tutorial, endless mode, the Daily Siege seed and local progress. Everything
// here is deterministic simulation or pure data, so it runs without a browser.

import assert from 'node:assert/strict';
import test from 'node:test';

import { createWorld, towerStats } from '../../js/eden-siege/sim/world.js';
import { dailySiegeFor } from '../../js/eden-siege/rng.js';
import { dailySiegeFor as arcadeDailySiegeFor } from '../../js/eden-siege-daily.js';
import {
  BOSS,
  DASH,
  MODIFIER_ORDER,
  STEP_MS,
  TOWERS,
  TOWER_MAX_LEVEL,
  ULT,
  WAVES,
  isBossWave,
  modifierChance,
  waveAt,
} from '../../js/eden-siege/data/balance.js';
import { createProgress, starsFor } from '../../js/eden-siege/progress.js';

const SECOND = 60;

function advance(world, steps, command) {
  for (let step = 0; step < steps; step += 1) {
    if (command) world.setInput(typeof command === 'function' ? command(step) : command);
    world.step();
  }
}

/** Jump straight to the start of wave `wave` (1-based) without playing the earlier ones. */
function openWave(world, wave) {
  world.setInput({ start: true });
  world.step();
  world.state.units.length = 0;
  world.state.projectiles.length = 0;
  world.state.wave = wave - 1;
  world.state.phase = 'build';
  world.state.phaseMs = STEP_MS / 2;
  world.step();
  assert.equal(world.state.wave, wave);
  assert.equal(world.state.phase, 'wave');
}

test('the Daily Siege is one map and one seed per UTC date, for everyone', () => {
  const morning = dailySiegeFor(new Date('2026-09-23T00:05:00Z'));
  const night = dailySiegeFor(new Date('2026-09-23T23:55:00Z'));
  const tomorrow = dailySiegeFor(new Date('2026-09-24T12:00:00Z'));
  assert.deepEqual(morning, night);
  assert.equal(morning.stamp, '2026-09-23');
  assert.match(morning.seed, /^daily:(keep|ship):2026-09-23$/u);
  assert.notEqual(morning.seed, tomorrow.seed);
  assert.notEqual(morning.mapId, tomorrow.mapId, 'the daily map rotates by day');
  assert.deepEqual(
    arcadeDailySiegeFor(new Date('2026-09-23T10:00:00Z')),
    morning,
    'the Arcade banner names the same run'
  );

  const trace = (step) => ({
    moveX: Math.sin(step / 50),
    moveZ: -0.3,
    attackHeld: true,
    dash: step % 240 === 0,
  });
  const run = (siege) => {
    const world = createWorld({
      mapId: siege.mapId,
      seed: siege.seed,
      mode: 'daily',
      heroName: 'Arthur',
    });
    world.setInput({ start: true });
    advance(world, SECOND * 40, trace);
    return world.snapshotHash();
  };
  assert.equal(run(morning), run(night), 'the same date replays the same siege');
  assert.notEqual(run(morning), run(tomorrow), 'a new date is a new siege');
});

test('towers climb five tiers, each one stronger and pricier than the last', () => {
  assert.equal(TOWER_MAX_LEVEL, 5);
  for (const kind of Object.keys(TOWERS)) {
    assert.equal(
      TOWERS[kind].upgradeCosts.length,
      TOWER_MAX_LEVEL - 1,
      `${kind} prices every tier`
    );
    for (let level = 2; level <= TOWER_MAX_LEVEL; level += 1) {
      const previous = towerStats(kind, level - 1);
      const current = towerStats(kind, level);
      assert.ok(current.damage > previous.damage, `${kind} L${level} hits harder`);
      assert.ok(current.cdMs < previous.cdMs, `${kind} L${level} fires faster`);
      assert.ok(current.range > previous.range, `${kind} L${level} reaches further`);
      assert.ok(TOWERS[kind].upgradeCosts[level - 2] > (TOWERS[kind].upgradeCosts[level - 3] || 0));
    }
    assert.equal(towerStats(kind, TOWER_MAX_LEVEL).upgradeCost, null, 'nothing past the cap');
  }

  const world = createWorld({ mapId: 'keep', seed: 'keep:tiers' });
  world.state.gold = 10_000;
  world.setInput({ buildSocket: 2, buildKind: 'ember' });
  world.step();
  const levels = [];
  for (let tier = 0; tier < 6; tier += 1) {
    world.setInput({ upgradeSocket: 2 });
    world.step();
    levels.push(world.state.towers[0].level);
  }
  assert.deepEqual(levels, [2, 3, 4, 5, 5, 5]);
  assert.equal(world.state.stats.upgrades, 4);
});

test('modifiers join from wave four, grow more common, and all three appear', () => {
  assert.equal(modifierChance(1), 0);
  assert.equal(modifierChance(3), 0);
  assert.ok(modifierChance(4) > 0);
  assert.ok(modifierChance(9) > modifierChance(5));
  assert.ok(modifierChance(40) <= 0.5);

  const seen = new Set();
  for (const wave of [4, 6, 8, 9]) {
    const world = createWorld({ mapId: 'keep', seed: `keep:mods:${wave}` });
    openWave(world, wave);
    advance(world, SECOND * 30);
    for (const unit of world.state.units) if (unit.modifier) seen.add(unit.modifier);
  }
  assert.deepEqual([...seen].sort(), [...MODIFIER_ORDER].sort());
});

test('fire burns through armour and ice shatters shields', () => {
  const world = createWorld({ mapId: 'keep', seed: 'keep:counters' });
  world.setInput({ start: true });
  world.step();
  advance(world, SECOND * 3);
  const [unit] = world.state.units;
  assert.ok(unit, 'wave one spawned a unit');
  world.state.units.splice(1);

  const hit = (element, damage) => {
    world.state.projectiles.length = 0;
    world.state.projectiles.push({
      x: unit.x,
      z: unit.z,
      vx: 0,
      vz: 0,
      ttlMs: 500,
      radius: 0.5,
      damage,
      splash: 0,
      element,
      owner: 'tower',
    });
    const before = unit.hp;
    const shieldBefore = unit.shield;
    world.step();
    return { hp: before - unit.hp, shield: shieldBefore - unit.shield };
  };

  Object.assign(unit, {
    hp: 1000,
    maxHp: 1000,
    modifier: 'armored',
    shield: 0,
    burnMs: 0,
    slowMs: 0,
  });
  const armoured = hit('ice', 10);
  assert.ok(armoured.hp > 5 && armoured.hp < 6, `armour cuts direct damage (${armoured.hp})`);
  unit.burnMs = 0;
  Object.assign(unit, { burnDps: 10, burnMs: 1000 });
  const beforeBurn = unit.hp;
  world.step();
  assert.ok(Math.abs(beforeBurn - unit.hp - 10 * (STEP_MS / 1000)) < 1e-9, 'burn ignores armour');

  Object.assign(unit, { hp: 1000, modifier: 'shielded', shield: 40, maxShield: 40, burnMs: 0 });
  const iceOnShield = hit('ice', 10);
  assert.equal(iceOnShield.shield, 20, 'ice counts double against a shield');
  assert.equal(iceOnShield.hp, 0);
  unit.burnMs = 0;
  const fireOnShield = hit('fire', 10);
  assert.equal(fireOnShield.shield, 10);
});

test('every fifth wave is a boss wave led by a warlord that telegraphs its slam', () => {
  assert.deepEqual([1, 4, 5, 6, 10, 15, 20].map(isBossWave), [
    false,
    false,
    true,
    false,
    true,
    true,
    true,
  ]);
  assert.equal(WAVES[4].boss, true);
  assert.equal(WAVES[9].boss, true);
  assert.equal(waveAt(15).boss, true);
  assert.equal(waveAt(16).boss, false);

  const world = createWorld({ mapId: 'keep', seed: 'keep:boss', heroName: 'Immortal' });
  openWave(world, 5);
  assert.equal(world.state.waveIsBoss, true);
  let boss = null;
  for (let step = 0; step < SECOND * 30 && !boss; step += 1) {
    world.step();
    boss = world.state.units.find((unit) => unit.boss) || null;
  }
  assert.ok(boss, 'the warlord arrives');
  assert.equal(boss.kind, BOSS.kind);
  assert.equal(boss.art, 'dreadnought', 'the warlord reuses shipped art');

  // Park the player next to the warlord and wait for the tell.
  world.state.units.length = 0;
  world.state.units.push(boss);
  Object.assign(world.state.player, { x: boss.x + 2, z: boss.z, hp: 10_000, maxHp: 10_000 });
  boss.slamCdMs = 0;
  const events = [];
  world.drainEvents();
  world.step();
  events.push(...world.drainEvents());
  assert.ok(boss.telegraph, 'the warlord paints the ground first');
  assert.ok(events.some((event) => event.type === 'telegraph'));
  const hpBefore = world.state.player.hp;
  const pinned = { x: world.state.player.x, z: world.state.player.z };
  for (let step = 0; step < Math.ceil(BOSS.telegraphMs / STEP_MS) + 2; step += 1) {
    Object.assign(world.state.player, pinned);
    world.step();
    events.push(...world.drainEvents());
  }
  assert.ok(
    events.some((event) => event.type === 'slam'),
    'the slam lands after the telegraph'
  );
  assert.ok(world.state.player.hp < hpBefore, 'standing in the circle hurts');
});

test('a dash is quick, cools down, and its i-frames let a bolt pass through', () => {
  const world = createWorld({ mapId: 'keep', seed: 'keep:dash' });
  world.setInput({ start: true });
  world.step();
  world.state.units.length = 0;
  const player = world.state.player;
  const start = { x: player.x, z: player.z };
  world.setInput({ moveX: 1, moveZ: 0, dash: true });
  world.step();
  assert.ok(player.dashMs > 0, 'the dash starts');
  assert.ok(player.iframeMs > player.dashMs, 'i-frames outlast the burst');
  advance(world, Math.ceil(DASH.durationMs / STEP_MS));
  assert.ok(
    player.x - start.x > 2.5,
    `the dash covers ground (${(player.x - start.x).toFixed(2)})`
  );

  world.setInput({ dash: true });
  world.step();
  assert.equal(player.dashMs, 0, 'the dash is on cooldown');

  // An enemy bolt sitting on the hero passes through during the i-frames.
  advance(world, Math.ceil(DASH.cooldownMs / STEP_MS));
  world.setInput({ moveX: 0, moveZ: 0, dash: true });
  world.step();
  const hp = player.hp;
  world.state.projectiles.push({
    x: player.x,
    z: player.z,
    vx: 0,
    vz: 0,
    ttlMs: 60,
    radius: 0.4,
    damage: 30,
    splash: 0,
    element: 'fire',
    owner: 'enemy',
  });
  world.drainEvents();
  world.step();
  assert.equal(player.hp, hp, 'no damage while dashing');
  assert.ok(world.drainEvents().some((event) => event.type === 'dodge'));
  assert.equal(world.state.stats.dodges, 1);

  advance(world, Math.ceil(DASH.iframeMs / STEP_MS) + 1);
  world.state.projectiles.push({
    x: player.x,
    z: player.z,
    vx: 0,
    vz: 0,
    ttlMs: 60,
    radius: 0.4,
    damage: 30,
    splash: 0,
    element: 'fire',
    owner: 'enemy',
  });
  world.step();
  assert.ok(player.hp < hp, 'once the i-frames end the bolt connects');
});

test('the ultimate needs a full charge, then speeds up and doubles the wings', () => {
  const world = createWorld({ mapId: 'keep', seed: 'keep:ult' });
  world.setInput({ start: true });
  world.step();
  world.setInput({ ult: true });
  world.step();
  assert.equal(world.state.ult.activeMs, 0, 'an empty meter does nothing');

  world.state.ult.charge = ULT.maxCharge;
  world.state.ult.ready = true;
  world.setInput({ ult: true, attackHeld: true });
  world.step();
  assert.ok(world.state.ult.activeMs > 0);
  assert.equal(world.state.ult.charge, 0);
  world.state.projectiles.length = 0;
  world.state.player.attackCdMs = 0;
  world.step();
  const bolt = world.state.projectiles.find((entry) => entry.owner === 'player');
  assert.ok(bolt?.dual, 'ultimate bolts carry both wings');
  assert.ok(world.state.player.attackCdMs < 200, 'and fire faster');
  advance(world, Math.ceil(ULT.durationMs / STEP_MS) + 1);
  assert.equal(world.state.ult.activeMs, 0, 'the ultimate expires');
});

test('the tutorial wave waits for every step, and can be skipped', () => {
  const world = createWorld({ mapId: 'keep', seed: 'keep:tutorial', tutorial: true });
  world.setInput({ start: true });
  world.step();
  assert.equal(world.state.tutorial.active, true);
  assert.equal(world.state.wave, 0, 'training is wave zero');
  assert.equal(world.state.nova.ready, true, 'the nova is pre-charged for the lesson');

  const script = (step) => ({
    moveX: step < 30 ? 1 : 0,
    moveZ: step < 30 ? 0 : -0.2,
    attackHeld: true,
    swap: step === 40 ? (world.state.player.element === 'ice' ? 'fire' : 'ice') : undefined,
    buildSocket: step === 50 ? 0 : undefined,
    nova: step === 60,
  });
  advance(world, 70, script);
  assert.deepEqual(world.state.tutorial.steps, {
    move: true,
    attack: true,
    swap: true,
    build: true,
    nova: true,
  });
  for (let step = 0; step < SECOND * 120 && world.state.tutorial.active; step += 1) {
    world.setInput({ attackHeld: true, moveZ: -0.3 });
    world.step();
  }
  assert.equal(world.state.tutorial.done, true);
  assert.equal(world.state.phase, 'build', 'training hands over to the first build phase');

  const skipper = createWorld({ mapId: 'keep', seed: 'keep:tutorial', tutorial: true });
  skipper.setInput({ start: true });
  skipper.step();
  advance(skipper, SECOND * 3);
  skipper.setInput({ skipTutorial: true });
  skipper.step();
  assert.equal(skipper.state.tutorial.skipped, true);
  assert.equal(skipper.state.units.length, 0);
  skipper.setInput({ start: true });
  skipper.step();
  assert.equal(skipper.state.wave, 1, 'skipping goes straight to wave one');

  skipper.setInput({ restart: true });
  skipper.step();
  assert.equal(
    skipper.state.tutorial.enabled,
    false,
    'a finished tutorial does not come back on restart'
  );
});

test('endless keeps the siege going past the campaign table', () => {
  const late = waveAt(WAVES.length + 6);
  assert.ok(late.groups.every((group) => group.tier === 4));
  assert.ok(late.hpMult > 1);
  assert.ok(waveAt(WAVES.length + 12).groups[0].count > late.groups[0].count);

  const campaign = createWorld({ mapId: 'keep', seed: 'keep:endless' });
  openWave(campaign, WAVES.length);
  campaign.state.units.length = 0;
  for (let step = 0; step < SECOND * 90 && campaign.state.phase === 'wave'; step += 1) {
    campaign.state.units.length = 0;
    campaign.step();
  }
  assert.equal(campaign.state.phase, 'victory');
  assert.equal(campaign.state.campaignCleared, true);
  campaign.setInput({ continueEndless: true });
  campaign.step();
  assert.equal(campaign.state.phase, 'build');
  assert.equal(campaign.state.endless, true);
  campaign.setInput({ start: true });
  campaign.step();
  assert.equal(campaign.state.wave, WAVES.length + 1);

  const endless = createWorld({ mapId: 'ship', seed: 'ship:endless', mode: 'endless' });
  assert.equal(endless.state.endless, true);
  openWave(endless, WAVES.length);
  for (let step = 0; step < SECOND * 90 && endless.state.phase === 'wave'; step += 1) {
    endless.state.units.length = 0;
    endless.step();
  }
  assert.equal(endless.state.phase, 'build', 'endless mode never stops at the table end');
});

test('stars and local records survive missing or broken storage', () => {
  assert.equal(starsFor({ mode: 'campaign', campaignCleared: false, coreRatio: 1 }), 0);
  assert.equal(starsFor({ mode: 'campaign', campaignCleared: true, coreRatio: 0.2 }), 1);
  assert.equal(starsFor({ mode: 'campaign', campaignCleared: true, coreRatio: 0.6 }), 2);
  assert.equal(starsFor({ mode: 'campaign', campaignCleared: true, coreRatio: 0.9 }), 3);
  assert.equal(starsFor({ mode: 'daily', wavesCleared: 4 }), 0);
  assert.equal(starsFor({ mode: 'daily', wavesCleared: 12 }), 2);
  assert.equal(starsFor({ mode: 'endless', wavesCleared: 30 }), 3);

  const memory = new Map([['vts_siege_best_keep', '900']]);
  const storage = {
    getItem: (key) => (memory.has(key) ? memory.get(key) : null),
    setItem: (key, value) => memory.set(key, String(value)),
  };
  const progress = createProgress(storage);
  assert.equal(progress.best('keep'), 900, 'the old per-map best is honoured');
  const first = progress.record({
    mapId: 'keep',
    mode: 'campaign',
    score: 1200,
    campaignCleared: true,
    coreRatio: 0.9,
    wavesCleared: 10,
  });
  assert.equal(first.newBest, true);
  assert.equal(first.stars, 3);
  const second = progress.record({
    mapId: 'keep',
    mode: 'campaign',
    score: 400,
    campaignCleared: false,
    wavesCleared: 3,
  });
  assert.equal(second.newBest, false);
  assert.equal(progress.stars('keep'), 3, 'stars never go down');
  assert.equal(progress.mapStars('keep'), 3);
  assert.equal(progress.history().length, 2);
  assert.equal(progress.history()[0].score, 400, 'newest run first');

  const broken = createProgress({
    getItem() {
      throw new Error('blocked');
    },
    setItem() {
      throw new Error('quota');
    },
  });
  assert.equal(broken.best('keep'), 0);
  assert.equal(
    broken.record({ mapId: 'keep', mode: 'daily', score: 10, wavesCleared: 6 }).saved,
    false
  );
  assert.deepEqual(broken.history(), []);
});
