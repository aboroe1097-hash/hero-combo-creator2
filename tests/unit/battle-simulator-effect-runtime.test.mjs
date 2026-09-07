import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BATTLE_EFFECT_PHASES,
  BATTLE_EFFECT_RUNTIME_VERSION,
  BATTLE_EFFECT_STATUSES,
  applyEffectPhase,
  createActorKey,
  createBattleEffectRuntime,
  createEffectState,
  getEffectiveStat,
  validateEffectDefinition,
} from '../../js/battle-simulator-effect-runtime.js';

const actor = (side, id, row, hp = 100, statuses = [], modifiers = []) => ({
  id,
  side,
  row,
  hp,
  maxHp: 100,
  stats: { attack: 10, defense: 10 },
  statuses,
  modifiers,
});

const state = (...actors) =>
  createEffectState({ version: BATTLE_EFFECT_RUNTIME_VERSION, round: 1, actors });

const effect = (overrides = {}) => {
  const definition = {
    id: 'effect-1',
    version: BATTLE_EFFECT_RUNTIME_VERSION,
    phase: 'before-action',
    source: 'A:front',
    target: { type: 'self', count: 1, range: 0 },
    type: 'damage',
    chance: 1,
    conditions: [],
    amount: 10,
    ...overrides,
  };
  if (
    (definition.type === 'status' || definition.type === 'cleanse') &&
    !Object.hasOwn(overrides, 'amount')
  ) {
    delete definition.amount;
  }
  return definition;
};

test('deterministic effects preserve side-qualified actor identity and side isolation', () => {
  const input = state(actor('A', 'front', 'front'), actor('B', 'front', 'front'));
  const definition = effect({
    target: { type: 'all-enemies', count: null, range: null },
    amount: 12,
  });
  const first = applyEffectPhase(input, [definition], 'before-action');
  const second = applyEffectPhase(input, [definition], 'before-action');
  assert.deepEqual(first, second);
  assert.equal(createActorKey('A', 'front'), 'A:front');
  assert.equal(createActorKey('B', 'front'), 'B:front');
  assert.equal(first.state.actors.find((entry) => entry.key === 'A:front').hp, 100);
  assert.equal(first.state.actors.find((entry) => entry.key === 'B:front').hp, 88);
});

test('target count and range use stable row order', () => {
  const input = state(
    actor('A', 'front', 'front'),
    actor('B', 'front', 'front'),
    actor('B', 'middle', 'middle'),
    actor('B', 'back', 'back')
  );
  const result = applyEffectPhase(
    input,
    [
      effect({
        target: { type: 'all-enemies', count: 2, range: 1 },
        amount: 5,
      }),
    ],
    'before-action'
  );
  assert.deepEqual(
    result.state.actors.filter((entry) => entry.side === 'B').map((entry) => entry.hp),
    [95, 95, 100]
  );
  assert.deepEqual(
    result.events.map((entry) => entry.target),
    ['B:front', 'B:middle']
  );
});

test('ally selectors and enemy-front remain side-scoped', () => {
  const input = state(
    actor('A', 'front', 'front'),
    actor('A', 'middle', 'middle'),
    actor('A', 'back', 'back'),
    actor('B', 'front', 'front'),
    actor('B', 'middle', 'middle')
  );
  const definitions = [
    effect({
      id: 'ally-row',
      target: { type: 'ally-row', count: 1, range: 2, row: 'middle' },
      amount: 1,
    }),
    effect({
      id: 'all-allies',
      target: { type: 'all-allies', count: 1, range: null },
      amount: 2,
    }),
    effect({
      id: 'enemy-front',
      target: { type: 'enemy-front', count: 1, range: null },
      amount: 3,
    }),
    effect({
      id: 'random-ally',
      target: { type: 'random-ally', count: 1, range: null },
      amount: 4,
    }),
  ];
  const rolls = [0.99];
  const result = applyEffectPhase(input, definitions, 'before-action', {
    random: () => rolls.shift(),
  });
  assert.deepEqual(
    result.events.map(({ effectId, target }) => [effectId, target]),
    [
      ['ally-row', 'A:middle'],
      ['all-allies', 'A:front'],
      ['enemy-front', 'B:front'],
      ['random-ally', 'A:back'],
    ]
  );
});

test('duration expiry and stack caps are deterministic', () => {
  const input = state(actor('A', 'front', 'front'), actor('B', 'front', 'front'));
  const buff = effect({
    id: 'might',
    type: 'stat-modifier',
    stat: 'attack',
    amount: 3,
    duration: 2,
    stacks: 2,
    maxStacks: 3,
  });
  const once = applyEffectPhase(input, [buff], 'before-action').state;
  const twice = applyEffectPhase(once, [buff], 'before-action').state;
  const source = twice.actors.find((entry) => entry.key === 'A:front');
  assert.equal(source.modifiers[0].stacks, 3);
  assert.equal(getEffectiveStat(source, 'attack'), 19);
  const afterOneEnd = applyEffectPhase(twice, [], 'round-end').state;
  assert.equal(afterOneEnd.actors[0].modifiers[0].remainingRounds, 1);
  const afterTwoEnds = applyEffectPhase(afterOneEnd, [], 'round-end').state;
  assert.deepEqual(afterTwoEnds.actors[0].modifiers, []);
});

test('sober blocks control while heal caps and recovery-block prevents recovery', () => {
  const sober = { name: 'sober', stacks: 1, remainingRounds: 2, source: 'A:front' };
  const blocked = { name: 'recovery-block', stacks: 1, remainingRounds: 2, source: 'B:front' };
  const input = state(
    actor('A', 'front', 'front', 80, [sober, blocked]),
    actor('B', 'front', 'front')
  );
  const silence = effect({
    id: 'silence',
    source: 'B:front',
    target: { type: 'enemy-front', count: 1, range: null },
    type: 'status',
    status: 'silence',
    duration: 1,
    stacks: 1,
    maxStacks: 1,
  });
  const heal = effect({ id: 'heal', type: 'heal', amount: 50 });
  const result = applyEffectPhase(input, [silence, heal], 'before-action');
  assert.equal(result.state.actors[0].hp, 80);
  assert.equal(
    result.state.actors[0].statuses.some((entry) => entry.name === 'silence'),
    false
  );
  assert.deepEqual(
    result.events.map((entry) => entry.skipped),
    ['control-immunity', 'recovery-block']
  );
  const unblocked = state(actor('A', 'front', 'front', 80), actor('B', 'front', 'front'));
  assert.equal(applyEffectPhase(unblocked, [heal], 'before-action').state.actors[0].hp, 100);
});

test('DoT ticks at round end and cleanse removes harmful statuses only', () => {
  const burn = {
    name: 'burn',
    stacks: 2,
    remainingRounds: 2,
    source: 'B:front',
    amount: 7,
  };
  const evasion = { name: 'evasion', stacks: 1, remainingRounds: 2, source: 'A:front' };
  const input = state(
    actor('A', 'front', 'front', 100, [burn, evasion]),
    actor('B', 'front', 'front')
  );
  const ticked = applyEffectPhase(input, [], 'round-end');
  assert.equal(ticked.state.actors[0].hp, 86);
  assert.equal(ticked.state.actors[0].statuses[0].remainingRounds, 1);
  assert.equal(ticked.events[0].type, 'dot-tick');
  const cleanse = effect({
    id: 'cleanse',
    type: 'cleanse',
    statuses: ['harmful'],
  });
  const cleansed = applyEffectPhase(ticked.state, [cleanse], 'before-action');
  assert.deepEqual(
    cleansed.state.actors[0].statuses.map((entry) => entry.name),
    ['evasion']
  );
});

test('random targeting and chance consume only the injected random source', () => {
  const input = state(
    actor('A', 'front', 'front'),
    actor('B', 'front', 'front'),
    actor('B', 'middle', 'middle'),
    actor('B', 'back', 'back')
  );
  const rolls = [0.99, 0.49];
  const definition = effect({
    target: { type: 'random-enemy', count: 1, range: null },
    chance: 0.5,
    amount: 9,
  });
  const result = applyEffectPhase(input, [definition], 'before-action', {
    random: () => rolls.shift(),
  });
  assert.equal(result.events[0].target, 'B:back');
  assert.equal(result.events[0].after, 91);
  assert.deepEqual(rolls, []);
  assert.throws(() => applyEffectPhase(input, [definition], 'before-action'), /injected/);
});

test('validators fail closed for unknown or incomplete values', () => {
  assert.throws(() => validateEffectDefinition(effect({ phase: 'sometimes' })), /unknown value/);
  assert.throws(() => validateEffectDefinition(effect({ type: 'mystery' })), /unknown value/);
  assert.throws(
    () => validateEffectDefinition(effect({ target: { type: 'enemy', count: 1, range: 1 } })),
    /unknown value/
  );
  assert.throws(
    () => validateEffectDefinition({ ...effect(), chance: undefined }),
    /finite number/
  );
  assert.throws(() => validateEffectDefinition({ ...effect(), surprise: true }), /unknown field/);
  assert.throws(
    () => validateEffectDefinition({ ...effect(), status: 'silence' }),
    /unknown field/
  );
  assert.throws(
    () =>
      createEffectState({
        version: BATTLE_EFFECT_RUNTIME_VERSION,
        round: 1,
        actors: [],
        surprise: true,
      }),
    /unknown field/
  );
  assert.throws(
    () =>
      createEffectState({
        version: BATTLE_EFFECT_RUNTIME_VERSION,
        round: 1,
        actors: [actor('A', 'same', 'front'), actor('A', 'same', 'back')],
      }),
    /Duplicate/
  );
});

test('runtime publishes an explicit versioned phase/status contract', () => {
  assert.deepEqual(BATTLE_EFFECT_PHASES, [
    'battle-start',
    'round-start',
    'before-action',
    'after-normal-attack',
    'after-damage',
    'round-end',
  ]);
  assert.deepEqual(BATTLE_EFFECT_STATUSES, [
    'silence',
    'disarm',
    'suppress',
    'confuse',
    'sober',
    'taunt',
    'burn',
    'bleed',
    'vulnerable',
    'armor-break',
    'evasion',
    'counterattack',
    'recovery-block',
  ]);
  const runtime = createBattleEffectRuntime({ random: () => 0 });
  assert.equal(runtime.version, BATTLE_EFFECT_RUNTIME_VERSION);
  assert.ok(Object.isFrozen(runtime));
  assert.throws(() => createBattleEffectRuntime({ random: 1 }), /must be a function/);
});

test('input is not mutated and returned state/events are deeply immutable', () => {
  const raw = {
    version: BATTLE_EFFECT_RUNTIME_VERSION,
    round: 1,
    actors: [actor('A', 'front', 'front'), actor('B', 'front', 'front')],
  };
  const snapshot = structuredClone(raw);
  const input = createEffectState(raw);
  const result = applyEffectPhase(input, [effect()], 'before-action');
  assert.deepEqual(raw, snapshot);
  assert.equal(input.actors[0].hp, 100);
  assert.equal(result.state.actors[0].hp, 90);
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.state.actors[0].statuses));
  assert.ok(Object.isFrozen(result.events));
  assert.throws(() => {
    result.state.actors[0].hp = 0;
  }, TypeError);
});
