// Velo's Rampart — reactions, wing swaps and the War Council.
//
// The four elemental reactions, the two-and-a-half second wing swap and the
// boon draft. All of it is the deterministic simulation under a fixed 60 Hz
// step, so each test drives a real world with setInput/step and asserts on what
// came out — never on the source.

import assert from 'node:assert/strict';
import test from 'node:test';

import { createWorld, towerStats } from '../../js/eden-siege/sim/world.js';
import {
  BOONS,
  BOON_ORDER,
  COMBO,
  DASH,
  DRAFT,
  ENEMY_KINDS,
  GOLD,
  NOVA,
  PLAYER,
  REACTIONS,
  STEP_MS,
  TOWERS,
} from '../../js/eden-siege/data/balance.js';

const SECOND = 60;

function createReactionWorld(seed, options = {}) {
  return createWorld({ mapId: 'keep', seed, heroName: 'Sky Breaker', ...options });
}

function advance(world, steps, command) {
  for (let step = 0; step < steps; step += 1) {
    if (command) world.setInput(typeof command === 'function' ? command(step) : command);
    world.step();
  }
}

let nextFixtureId = 7000;

/**
 * Put a unit in the arena by hand, built from its balance entry. A test that
 * measures one rule wants exactly one thing on the field, which no wave offers.
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
    slowStacks: 0,
    slowIdleMs: 0,
    freezeMs: 0,
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
  // `speed: 0` in a fixture means "stands still", and the aura pass rebuilds
  // speed from baseSpeed every step — so the two have to agree.
  if (overrides.speed !== undefined && overrides.baseSpeed === undefined) {
    unit.baseSpeed = overrides.speed;
  }
  world.state.units.push(unit);
  return unit;
}

/** Park the hero in a corner so the fixtures are the only thing in play. */
function benchPlayer(world) {
  Object.assign(world.state.player, { x: -20, z: -14 });
  return world.state.player;
}

/**
 * Land one bolt of exactly `damage` on a unit this step and hand back the
 * events it produced. A bolt is the only way to drive damageUnit from a test
 * without also driving everything else that fires.
 */
function strike(world, unit, element, damage, options = {}) {
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
    ...options,
  });
  world.drainEvents();
  world.step();
  return world.drainEvents();
}

function reactionsIn(events) {
  return events.filter((event) => event.type === 'reaction');
}

/** The events one fixture produced, picked out by where they happened. */
function at(events, unit) {
  return events.filter(
    (event) => Math.abs(event.x - unit.x) < 1e-6 && Math.abs(event.z - unit.z) < 1e-6
  );
}

/**
 * Land several bolts in the same step, so two fixtures can be compared on the
 * same clock — a burn or a slow that is one step older reads differently.
 */
function strikeTogether(world, shots) {
  world.state.projectiles.length = 0;
  for (const [unit, element, damage] of shots) {
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
  }
  world.drainEvents();
  world.step();
  return world.drainEvents();
}

/** What a blow actually landed, read off the hit event it emitted. */
function dealt(events) {
  const hit = events.find((event) => event.type === 'hit');
  assert.ok(hit, 'the blow connected');
  return hit.amount;
}

/** Clear the wave in progress and stop in the build phase that follows it. */
function clearWave(world) {
  for (let step = 0; step < SECOND * 40 && world.state.phase === 'wave'; step += 1) {
    world.state.units.length = 0;
    world.step();
  }
  assert.equal(world.state.phase, 'build', 'the wave cleared into a build phase');
  return world.state;
}

function startNextWave(world) {
  world.setInput({ start: true });
  world.step();
}

/** Jump to the start of wave `wave` without playing the waves before it. */
function jumpToWave(world, wave) {
  startNextWave(world);
  world.state.units.length = 0;
  world.state.projectiles.length = 0;
  world.state.wave = wave - 1;
  world.state.phase = 'build';
  world.state.phaseMs = STEP_MS / 2;
  world.step();
  assert.equal(world.state.wave, wave);
  assert.equal(world.state.phase, 'wave');
}

/** Play waves one to three out and stop at the council that follows the third. */
function worldAtCouncil(seed) {
  const world = createReactionWorld(seed);
  startNextWave(world);
  clearWave(world);
  startNextWave(world);
  clearWave(world);
  startNextWave(world);
  clearWave(world);
  assert.equal(world.state.draftOffered, true, 'a council is sitting');
  return world;
}

test('shatter: ice on a burning foe hits half again as hard and eats the burn', () => {
  const world = createReactionWorld('keep:shatter');
  benchPlayer(world);
  const ice = 10;
  // A dreadnought rather than a shieldwall: a wall turns a bolt aside, and this
  // test is about what lands, not about what is blocked.
  const bare = place(world, 'ranger', 0, -4, { hp: 1000, maxHp: 1000, speed: 0 });
  const burning = place(world, 'ranger', 3, -4, {
    hp: 1000,
    maxHp: 1000,
    speed: 0,
    burnMs: 2000,
    burnDps: 5,
  });
  const armoured = place(world, 'dreadnought', -3, -4, {
    hp: 1000,
    maxHp: 1000,
    speed: 0,
    modifier: 'armored',
  });
  const armouredBurning = place(world, 'dreadnought', -6, -4, {
    hp: 1000,
    maxHp: 1000,
    speed: 0,
    modifier: 'armored',
    burnMs: 2000,
    burnDps: 5,
  });

  const plain = strike(world, bare, 'ice', ice);
  const shattered = strike(world, burning, 'ice', ice);
  const armouredHit = strike(world, armoured, 'ice', ice);
  const armouredShattered = strike(world, armouredBurning, 'ice', ice);

  assert.equal(dealt(plain), ice, 'ice on a clean foe lands what the bolt says');
  assert.equal(dealt(shattered), ice * REACTIONS.shatter.damageMult, 'the burn shatters with it');
  assert.equal(burning.burnMs, 0, 'the burn is consumed');
  assert.equal(burning.burnDps, 0);
  assert.ok(dealt(armouredHit) < ice, `armour blunts a plain ice bolt (${dealt(armouredHit)})`);
  assert.equal(
    dealt(armouredShattered),
    ice * REACTIONS.shatter.damageMult,
    'and the ice that shatters a burn takes the armour with it'
  );
  assert.ok(
    dealt(armouredShattered) > dealt(armouredHit) * 2,
    'so an armoured foe that is burning is the softest target on the field'
  );

  assert.deepEqual(reactionsIn(shattered), [
    { type: 'reaction', reaction: 'shatter', x: burning.x, z: burning.z },
  ]);
  assert.deepEqual(reactionsIn(armouredShattered).length, 1, 'one event per trigger');
  assert.equal(reactionsIn(plain).length, 0, 'a clean hit reacts with nothing');
  assert.equal(reactionsIn(armouredHit).length, 0);
});

test('melt: fire on a slowed foe lets the slow go and doubles the burn', () => {
  const world = createReactionWorld('keep:melt');
  benchPlayer(world);
  const bare = place(world, 'ranger', 0, -4, { hp: 1000, maxHp: 1000, speed: 0 });
  const held = place(world, 'ranger', 3, -4, {
    hp: 1000,
    maxHp: 1000,
    speed: 0,
    slowMs: 5000,
    slowFactor: 0.45,
  });

  const events = strikeTogether(world, [
    [bare, 'fire', 10],
    [held, 'fire', 10],
  ]);

  assert.equal(bare.burnDps, PLAYER.fire.burnDps, 'fire on a clean foe burns as it always did');
  assert.equal(bare.burnMs, PLAYER.fire.burnMs);
  assert.equal(
    held.burnDps,
    PLAYER.fire.burnDps * REACTIONS.melt.burnDpsMult,
    'the same burn, twice as fierce'
  );
  assert.equal(held.burnMs, bare.burnMs, 'and for exactly as long as usual');
  assert.equal(held.slowMs, 0, 'the ice lets go of the target');
  assert.equal(held.slowFactor, 1);
  assert.deepEqual(reactionsIn(at(events, held)), [
    { type: 'reaction', reaction: 'melt', x: held.x, z: held.z },
  ]);
  assert.equal(reactionsIn(at(events, bare)).length, 0, 'nothing to melt on a clean foe');
});

test('deepFreeze: three slows in a row lock a unit where it stands', () => {
  const world = createReactionWorld('keep:freeze');
  benchPlayer(world);
  const walker = place(world, 'ranger', 0, -6, { hp: 1000, maxHp: 1000 });
  const start = walker.z;

  advance(world, SECOND);
  assert.ok(walker.z > start + 1, `the ranger is on its way in (${(walker.z - start).toFixed(2)})`);

  const first = strike(world, walker, 'ice', 5);
  const second = strike(world, walker, 'ice', 5);
  assert.equal(
    reactionsIn(first).length + reactionsIn(second).length,
    0,
    'two slows are not a freeze'
  );
  assert.equal(walker.slowStacks, 2, 'but they are two stacks');
  const third = strike(world, walker, 'ice', 5);
  assert.deepEqual(reactionsIn(third), [
    { type: 'reaction', reaction: 'deepFreeze', x: walker.x, z: walker.z },
  ]);
  assert.equal(walker.slowStacks, 0, 'the freeze spends the stacks');
  assert.equal(walker.freezeMs, REACTIONS.deepFreeze.freezeMs);

  const frozen = { x: walker.x, z: walker.z };
  advance(world, Math.floor(REACTIONS.deepFreeze.freezeMs / STEP_MS) - 1);
  assert.ok(walker.freezeMs > 0, 'the ice is still holding');
  assert.equal(walker.x, frozen.x, 'a frozen unit does not move');
  assert.equal(walker.z, frozen.z);
  advance(world, 4);
  assert.ok(walker.z > frozen.z, 'and walks on the moment it cracks');

  // The other half of the freeze: it does not swing either.
  const swinging = createReactionWorld('keep:freeze-core');
  benchPlayer(swinging);
  const attacker = place(swinging, 'cavalry', swinging.state.core.x, swinging.state.core.z, {
    hp: 1000,
    maxHp: 1000,
    attackCdMs: 500,
  });
  for (let index = 0; index < 3; index += 1) strike(swinging, attacker, 'ice', 5);
  assert.equal(
    attacker.freezeMs,
    REACTIONS.deepFreeze.freezeMs,
    'the attacker is frozen on the core'
  );
  const cooldown = attacker.attackCdMs;
  const coreHp = swinging.state.core.hp;
  assert.ok(cooldown > 0, 'it was still winding up when the ice landed');
  // Short of the freeze's own length, so "it did not attack" is the freeze's
  // doing and not the cooldown's.
  advance(swinging, SECOND);
  assert.equal(
    attacker.attackCdMs,
    cooldown,
    'a frozen unit does not even count its cooldown down'
  );
  assert.equal(swinging.state.core.hp, coreHp, 'so the stronghold is untouched');
  assert.ok(attacker.freezeMs > 0, 'while the freeze still holds');
  advance(swinging, 2 * SECOND);
  assert.ok(swinging.state.core.hp < coreHp, 'and it swings as soon as it can');

  // A warlord is too big to hold for long.
  const bossy = createReactionWorld('keep:freeze-boss');
  benchPlayer(bossy);
  const warlord = place(bossy, 'warlord', 0, -6, { hp: 5000, maxHp: 5000, boss: true });
  for (let index = 0; index < 3; index += 1) strike(bossy, warlord, 'ice', 5);
  assert.equal(warlord.freezeMs, REACTIONS.deepFreeze.bossFreezeMs);
  assert.ok(REACTIONS.deepFreeze.bossFreezeMs < REACTIONS.deepFreeze.freezeMs);
});

test('slow stacks fade, so a freeze is three slows in a row and not three ever', () => {
  const world = createReactionWorld('keep:freeze-decay');
  benchPlayer(world);
  const target = place(world, 'ranger', 0, -6, { hp: 1000, maxHp: 1000, speed: 0 });

  strike(world, target, 'ice', 5);
  strike(world, target, 'ice', 5);
  assert.equal(target.slowStacks, 2);
  // Long enough for the slow itself to run out and the stacks to go stale.
  advance(world, Math.ceil((REACTIONS.deepFreeze.stackDecayMs + 2000) / STEP_MS));

  const fresh = strike(world, target, 'ice', 5);
  assert.equal(target.slowStacks, 1, 'the stale pair is gone');
  assert.equal(target.freezeMs, 0);
  assert.equal(reactionsIn(fresh).length, 0, 'so one slow is once again just one slow');

  strike(world, target, 'ice', 5);
  strike(world, target, 'ice', 5);
  assert.equal(target.freezeMs, REACTIONS.deepFreeze.freezeMs, 'while three in a row still freeze');
});

test('immolate: a burning corpse sets its neighbour alight', () => {
  const world = createReactionWorld('keep:immolate');
  benchPlayer(world);
  const corpse = place(world, 'ranger', 0, -4, {
    hp: 1,
    maxHp: 1,
    speed: 0,
    burnMs: 400,
    burnDps: 120,
  });
  const neighbour = place(world, 'ranger', 2, -4, { hp: 1000, maxHp: 1000, speed: 0 });
  const far = place(world, 'ranger', 6, -4, { hp: 1000, maxHp: 1000, speed: 0 });

  world.drainEvents();
  advance(world, 1);
  const events = world.drainEvents();

  assert.ok(!world.state.units.includes(corpse), 'the burn finishes it');
  assert.equal(world.state.stats.burnKills, 1);
  assert.equal(
    neighbour.burnDps,
    120 * REACTIONS.immolate.burnDpsMult,
    "the neighbour catches half the dead unit's fire"
  );
  assert.ok(neighbour.burnMs > 0, 'for what was left of its burn');
  assert.ok(neighbour.burnMs <= 400, 'and no longer than that');
  assert.equal(far.burnDps, 0, 'nothing reaches past the radius');
  assert.equal(far.burnMs, 0);
  assert.deepEqual(reactionsIn(events), [{ type: 'reaction', reaction: 'immolate', x: 0, z: -4 }]);

  // A corpse that was not burning takes nothing with it.
  const plain = createReactionWorld('keep:immolate-plain');
  benchPlayer(plain);
  const quiet = place(plain, 'ranger', 0, -4, { hp: 1, maxHp: 1, speed: 0 });
  const beside = place(plain, 'ranger', 2, -4, { hp: 1000, maxHp: 1000, speed: 0 });
  strike(plain, quiet, 'ice', 50);
  assert.ok(!plain.state.units.includes(quiet), 'a cold bolt finishes the cold corpse');
  assert.equal(beside.burnDps, 0, 'and a cold corpse lights nothing');
  assert.equal(beside.burnMs, 0);
  assert.equal(reactionsIn(plain.drainEvents()).length, 0, 'no immolate, no event');
});

test('the wings swap on a two-and-a-half second cooldown', () => {
  const world = createReactionWorld('keep:swap-cooldown');
  const player = world.state.player;
  assert.equal(player.swapCdMs, 0, 'a fresh run is ready to swap');

  const first = player.element;
  const other = first === 'ice' ? 'fire' : 'ice';
  world.setInput({ swap: other });
  world.step();
  assert.equal(player.element, other, 'the first swap lands at once');
  assert.equal(player.swapCdMs, PLAYER.swapCooldownMs, 'and starts the cooldown');

  // The same breath, back again: the button is dimmed and the request is lost.
  world.drainEvents();
  world.setInput({ swap: first });
  world.step();
  assert.equal(player.element, other, 'a second immediate swap is ignored');
  assert.ok(player.swapCdMs > 0, 'the cooldown is still running');
  assert.equal(world.drainEvents().filter((event) => event.type === 'swap').length, 0);

  // Two and a half seconds of holding the button is what it takes.
  advance(world, Math.ceil(PLAYER.swapCooldownMs / STEP_MS) - 2, { swap: first });
  assert.equal(player.element, other, 'still inside the cooldown');
  advance(world, 2, { swap: first });
  assert.equal(player.element, first, 'and it lands on the far side of two and a half seconds');
  assert.ok(player.swapCdMs > 0, 'with the cooldown running again');

  // A restart hands the new run a fresh cooldown, like every other timer.
  world.setInput({ restart: true });
  world.step();
  assert.equal(world.state.player.swapCdMs, 0);
});

test('the War Council offers three distinct boons after wave three, and none after wave one', () => {
  assert.deepEqual(Object.keys(BOONS).sort(), [
    'emberHeart',
    'frostGrip',
    'goldRush',
    'heavyNova',
    'longReach',
    'quickChain',
    'swiftWings',
    'towerWall',
  ]);
  assert.deepEqual(BOON_ORDER.slice().sort(), Object.keys(BOONS).sort());

  const world = createReactionWorld('keep:draft');
  startNextWave(world);
  const first = clearWave(world);
  assert.equal(first.draftOffered, false, 'the first build phase calls no council');
  assert.equal(first.draftOptions.length, 0);
  assert.equal(first.pendingBoon, null);
  // A pick made when no council is sitting is ignored outright.
  const gold = world.mods.gold;
  world.setInput({ chooseBoon: 'goldRush' });
  world.step();
  assert.deepEqual(world.state.draftPicked, []);
  assert.equal(world.mods.gold, gold);

  startNextWave(world);
  assert.equal(clearWave(world).draftOffered, false, 'nor does the second');

  startNextWave(world);
  const third = clearWave(world);
  assert.equal(third.wave, 3);
  assert.equal(third.draftOffered, true, 'the council sits after wave three');
  assert.equal(third.draftOptions.length, DRAFT.options);
  assert.equal(new Set(third.draftOptions).size, DRAFT.options, 'three distinct boons');
  for (const id of third.draftOptions) assert.ok(BOON_ORDER.includes(id), `${id} is a real boon`);

  // Every boon multiplies keys that the simulation actually reads.
  for (const [id, def] of Object.entries(BOONS)) {
    for (const key of Object.keys(def.mods)) {
      assert.ok(key in world.mods, `${id} multiplies ${key}, which must exist in mods`);
    }
  }

  // The offer lives in the build phase and dies with it if it is not taken.
  startNextWave(world);
  assert.equal(world.state.wave, 4);
  assert.equal(world.state.draftOffered, false);
  assert.equal(world.state.draftOptions.length, 0);
  assert.equal(world.state.pendingBoon, null, 'and nothing was taken');
});

test('the draft follows the wave cadence, and never offers the same boon twice', () => {
  // Campaign: the councils are the third, sixth and ninth waves, and they stop
  // there — a longer table is the only way to watch that hold past nine.
  const campaign = createReactionWorld('keep:draft:cadence');
  jumpToWave(campaign, 9);
  assert.equal(clearWave(campaign).draftOffered, true, 'wave nine earns one in campaign play');

  const longer = createReactionWorld('keep:draft:cadence-long');
  longer.state.wavesTotal = 20;
  jumpToWave(longer, 12);
  assert.equal(clearWave(longer).draftOffered, false, 'wave twelve does not, short of endless');

  // Endless: every third wave, however far it runs.
  const endless = createReactionWorld('keep:draft:cadence-endless', { mode: 'endless' });
  jumpToWave(endless, 3);
  const offered = clearWave(endless);
  assert.equal(offered.draftOffered, true);
  const taken = offered.draftOptions[0];
  endless.setInput({ chooseBoon: taken });
  endless.step();
  assert.deepEqual(endless.state.draftPicked, [taken]);

  jumpToWave(endless, 12);
  const later = clearWave(endless);
  assert.equal(later.draftOffered, true, 'endless keeps calling councils every third wave');
  assert.equal(later.draftOptions.length, DRAFT.options);
  assert.ok(!later.draftOptions.includes(taken), 'and never offers what the run already has');
  assert.equal(later.pendingBoon, null, 'the last toast comes down as the next council opens');

  // Waves in between get nothing at all.
  jumpToWave(endless, 13);
  assert.equal(clearWave(endless).draftOffered, false);
});

test('a boon taken at the council is real: Gold Rush raises what a kill drops', () => {
  // Find a seed whose council puts Gold Rush up, so the pick is a real draft.
  let control = null;
  let seed = '';
  for (let attempt = 0; attempt < 12 && !control; attempt += 1) {
    seed = `keep:draft:gold:${attempt}`;
    const candidate = worldAtCouncil(seed);
    if (candidate.state.draftOptions.includes('goldRush')) control = candidate;
  }
  assert.ok(control, 'some seed offers Gold Rush at the third wave');

  // The same seed offers the same council, so the two runs are one run.
  const picked = worldAtCouncil(seed);
  assert.deepEqual(picked.state.draftOptions, control.state.draftOptions);
  assert.equal(control.state.draftOffered, true);

  const dropValue = (world) => {
    const victim = place(world, 'ranger', 0, -4, { hp: 1, maxHp: 1, speed: 0, tier: 2 });
    world.state.projectiles.length = 0;
    world.state.projectiles.push({
      x: victim.x,
      z: victim.z,
      vx: 0,
      vz: 0,
      ttlMs: 500,
      radius: 0.5,
      damage: 10_000,
      splash: 0,
      element: 'ice',
      owner: 'player',
    });
    world.step();
    return world.state.pickups[world.state.pickups.length - 1];
  };

  const plain = dropValue(control);
  assert.equal(control.state.draftPicked.length, 0, 'the control run never picks');
  picked.setInput({ chooseBoon: 'goldRush' });
  picked.step();

  assert.deepEqual(picked.state.draftPicked, ['goldRush'], 'in the order they were taken');
  assert.equal(picked.state.pendingBoon, 'goldRush', 'and held for the toast');
  assert.equal(picked.state.draftOffered, false, 'the council has risen');
  assert.equal(picked.state.draftOptions.length, 0);
  assert.equal(picked.mods.gold, control.mods.gold * BOONS.goldRush.mods.gold, 'the mods moved');

  // A second pick in the same breath is ignored: no council, no boon.
  picked.setInput({ chooseBoon: 'quickChain' });
  picked.step();
  assert.deepEqual(picked.state.draftPicked, ['goldRush']);
  assert.equal(picked.mods.comboDecay, 1);

  const rich = dropValue(picked);
  assert.equal(rich.value, Math.round(GOLD.byTier[2] * picked.mods.gold));
  assert.ok(rich.value > plain.value, `the same kill drops more (${rich.value} vs ${plain.value})`);
});

test('every boon moves a number the simulation actually reads', () => {
  // One seed, two runs: the only difference is the boon the council handed out.
  const seed = 'keep:boon-effects';
  const pick = (world, id) => {
    assert.equal(world.state.draftOffered, true, 'a council is sitting');
    world.setInput({ chooseBoon: id });
    world.step();
  };

  // Frost Grip lengthens the slow and deepens it.
  {
    const plain = worldAtCouncil(seed);
    const grip = worldAtCouncil(seed);
    pick(grip, 'frostGrip');
    const bare = place(plain, 'ranger', 0, -4, { hp: 1000, maxHp: 1000, speed: 0 });
    const held = place(grip, 'ranger', 0, -4, { hp: 1000, maxHp: 1000, speed: 0 });
    strike(plain, bare, 'ice', 5);
    strike(grip, held, 'ice', 5);
    assert.equal(bare.slowMs, PLAYER.ice.slowMs, 'the stock ice slow');
    assert.equal(held.slowMs, PLAYER.ice.slowMs * BOONS.frostGrip.mods.iceSlow, 'held longer');
    assert.equal(
      held.slowFactor,
      PLAYER.ice.slowFactor / BOONS.frostGrip.mods.iceSlowDepth,
      'and biting deeper'
    );
  }

  // Swift Wings quickens the hero and shortens the dash cooldown.
  {
    const plain = worldAtCouncil(seed);
    const swift = worldAtCouncil(seed);
    pick(swift, 'swiftWings');
    const dash = (world) => {
      world.setInput({ moveX: 1, dash: true });
      world.step();
      return world.state.player.dashCdMs;
    };
    assert.equal(swift.mods.speed, plain.mods.speed * BOONS.swiftWings.mods.speed);
    assert.equal(dash(plain), DASH.cooldownMs, 'the ordinary dash cooldown');
    assert.equal(dash(swift), DASH.cooldownMs * BOONS.swiftWings.mods.dashCd);
  }

  // Heavy Nova hits harder and throws further.
  {
    const plain = worldAtCouncil(seed);
    const heavy = worldAtCouncil(seed);
    pick(heavy, 'heavyNova');
    const victim = (world) => {
      benchPlayer(world);
      Object.assign(world.state.player, { x: 0, z: 12.4 });
      const unit = place(world, 'ranger', 4, 12.4, { hp: 100_000, maxHp: 100_000, speed: 0 });
      world.state.nova.charge = NOVA.maxCharge;
      world.state.nova.ready = true;
      return unit;
    };
    const light = victim(plain);
    const loaded = victim(heavy);
    const nova = (world) => {
      world.setInput({ nova: true });
      world.step();
    };
    nova(plain);
    nova(heavy);
    const shove = NOVA.knockback * 0.35;
    assert.equal(100_000 - light.hp, NOVA.damage, 'the ordinary nova');
    assert.equal(100_000 - loaded.hp, NOVA.damage * BOONS.heavyNova.mods.novaDamage);
    assert.equal(light.x, 4 + shove, 'and its ordinary shove');
    assert.equal(loaded.x, 4 + shove * BOONS.heavyNova.mods.novaKnockback, 'thrown further');
  }

  // Quick Chain hangs on to the chain longer. The chain ticks once in the step
  // the kill lands, so both runs are read one tick in.
  {
    const plain = worldAtCouncil(seed);
    const quick = worldAtCouncil(seed);
    pick(quick, 'quickChain');
    const kill = (world) => {
      const victim = place(world, 'ranger', 0, -4, { hp: 1, maxHp: 1, speed: 0 });
      strike(world, victim, 'ice', 500);
      return world.state.combo.timerMs;
    };
    assert.equal(kill(plain), COMBO.decayMs - STEP_MS);
    assert.equal(kill(quick), COMBO.decayMs * BOONS.quickChain.mods.comboDecay - STEP_MS);
  }

  // Long Reach stretches the spires: a foe outside 8.8 units is reachable only
  // with the boon.
  {
    const plain = worldAtCouncil(seed);
    const reach = worldAtCouncil(seed);
    pick(reach, 'longReach');
    const towerAt = (world) => {
      world.state.gold = 500;
      world.setInput({ buildSocket: 0, buildKind: 'frost' });
      world.step();
      return world.state.towers[0];
    };
    const tower = towerAt(plain);
    towerAt(reach);
    const outOfReach = (world) =>
      place(world, 'ranger', tower.x, tower.z - (TOWERS.frost.range + 1), {
        hp: 1000,
        maxHp: 1000,
        speed: 0,
      });
    const near = outOfReach(plain);
    const far = outOfReach(reach);
    assert.ok(TOWERS.frost.range + 1 < TOWERS.frost.range * reach.mods.towerRange);
    advance(plain, 2 * SECOND);
    advance(reach, 2 * SECOND);
    assert.equal(near.hp, 1000, 'out of range is out of range');
    assert.ok(far.hp < 1000, 'and the spire only reaches it with the boon');
  }

  // Tower Wall raises the ceiling and heals what is standing to it.
  {
    const wall = worldAtCouncil(seed);
    wall.state.gold = 500;
    wall.setInput({ buildSocket: 0, buildKind: 'frost' });
    wall.step();
    const tower = wall.state.towers[0];
    tower.hp = 30;
    pick(wall, 'towerWall');
    assert.equal(tower.maxHp, TOWERS.frost.maxHp * BOONS.towerWall.mods.towerHp);
    assert.equal(tower.hp, tower.maxHp, 'a boon does not arrive as damage taken');
    wall.setInput({ upgradeSocket: 0 });
    wall.step();
    assert.equal(tower.maxHp, towerStats('frost', 2).maxHp * BOONS.towerWall.mods.towerHp);
  }
});

test('the same seed and the same trace, boons included, replay to the same hash', () => {
  const run = (chooser) => {
    const world = createReactionWorld('keep:reactions-determinism');
    startNextWave(world);
    for (let wave = 1; wave <= 3; wave += 1) {
      clearWave(world);
      if (world.state.draftOffered && chooser) {
        world.setInput({ chooseBoon: chooser(world) });
        world.step();
      }
      if (world.state.wave < 3) startNextWave(world);
    }
    // Then fight wave four live: swapped wings, novas and all.
    advance(world, SECOND * 20, (step) => ({
      moveX: Math.sin(step / 50) * 0.4,
      moveZ: Math.cos(step / 70) * 0.2,
      attackHeld: true,
      aimX: Math.sin(step / 33) * 0.5,
      aimZ: -1,
      swap: step % 300 === 0 ? (step % 600 === 0 ? 'ice' : 'fire') : undefined,
      nova: step % 900 === 0,
    }));
    return world;
  };
  const firstChoice = (world) => world.state.draftOptions[0];

  const first = run(firstChoice);
  const second = run(firstChoice);
  assert.ok(first.state.draftPicked.length > 0, 'the trace really did take a boon');
  assert.equal(first.snapshotHash(), second.snapshotHash());
  assert.deepEqual(first.state.draftPicked, second.state.draftPicked);
  assert.equal(first.state.score, second.state.score);
  assert.equal(first.state.stats.burnKills, second.state.stats.burnKills);

  // The boon a run took is part of its identity, not a rendering detail.
  const skipped = run(null);
  assert.equal(skipped.state.draftOffered, false);
  assert.deepEqual(skipped.state.draftPicked, []);
  assert.notEqual(skipped.snapshotHash(), first.snapshotHash());
});
