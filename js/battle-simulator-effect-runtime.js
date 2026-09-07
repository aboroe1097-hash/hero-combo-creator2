export const BATTLE_EFFECT_RUNTIME_VERSION = '1.0.0';

export const BATTLE_EFFECT_PHASES = Object.freeze([
  'battle-start',
  'round-start',
  'before-action',
  'after-normal-attack',
  'after-damage',
  'round-end',
]);

export const BATTLE_EFFECT_TYPES = Object.freeze([
  'stat-modifier',
  'damage',
  'heal',
  'status',
  'dot',
  'cleanse',
]);

export const BATTLE_EFFECT_STATUSES = Object.freeze([
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

export const BATTLE_EFFECT_TARGETS = Object.freeze([
  'self',
  'ally-row',
  'enemy-front',
  'random-ally',
  'random-enemy',
  'all-allies',
  'all-enemies',
]);

const SIDES = Object.freeze(['A', 'B']);
const ROWS = Object.freeze(['front', 'middle', 'back']);
const CONTROL_STATUSES = new Set(['silence', 'disarm', 'suppress', 'confuse', 'taunt']);
const HARMFUL_STATUSES = new Set([
  ...CONTROL_STATUSES,
  'burn',
  'bleed',
  'vulnerable',
  'armor-break',
  'recovery-block',
]);
const STATUS_SET = new Set(BATTLE_EFFECT_STATUSES);
const PHASE_SET = new Set(BATTLE_EFFECT_PHASES);
const TYPE_SET = new Set(BATTLE_EFFECT_TYPES);
const TARGET_SET = new Set(BATTLE_EFFECT_TARGETS);
const MAX_STACKS = 100;
const MAX_DURATION = 100;

function assertPlainObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object.`);
  }
  return value;
}

function assertKnownKeys(value, allowed, label) {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) throw new TypeError(`${label} contains unknown field "${key}".`);
  }
}

function requireOwn(value, key, label) {
  if (!Object.hasOwn(value, key)) {
    throw new TypeError(`${label} is missing required field "${key}".`);
  }
  return value[key];
}

function assertString(value, label) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new TypeError(`${label} must be a non-empty string.`);
  }
  return value.trim();
}

function assertEnum(value, allowed, label) {
  if (!allowed.has(value)) throw new RangeError(`${label} has unknown value "${value}".`);
  return value;
}

function assertFinite(value, label, { minimum = -Infinity, maximum = Infinity } = {}) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`${label} must be a finite number.`);
  }
  if (value < minimum || value > maximum) {
    throw new RangeError(`${label} must be between ${minimum} and ${maximum}.`);
  }
  return value;
}

function assertInteger(value, label, options) {
  assertFinite(value, label, options);
  if (!Number.isSafeInteger(value)) throw new TypeError(`${label} must be a safe integer.`);
  return value;
}

function freezeRecord(value) {
  for (const child of Object.values(value)) {
    if (child && typeof child === 'object' && !Object.isFrozen(child)) freezeRecord(child);
  }
  return Object.freeze(value);
}

export function createActorKey(side, id) {
  assertEnum(side, new Set(SIDES), 'Actor side');
  return `${side}:${assertString(id, 'Actor id')}`;
}

function normalizeStatus(rawStatus, label) {
  const status = assertPlainObject(rawStatus, label);
  assertKnownKeys(
    status,
    new Set(['name', 'stacks', 'remainingRounds', 'source', 'amount']),
    label
  );
  const name = assertEnum(requireOwn(status, 'name', label), STATUS_SET, `${label} name`);
  const stacks = assertInteger(requireOwn(status, 'stacks', label), `${label} stacks`, {
    minimum: 1,
    maximum: MAX_STACKS,
  });
  const remainingRounds = assertInteger(
    requireOwn(status, 'remainingRounds', label),
    `${label} remainingRounds`,
    { minimum: 1, maximum: MAX_DURATION }
  );
  const source = assertString(requireOwn(status, 'source', label), `${label} source`);
  const amount =
    name === 'burn' || name === 'bleed'
      ? assertFinite(requireOwn(status, 'amount', label), `${label} amount`, { minimum: 0 })
      : null;
  if (name !== 'burn' && name !== 'bleed' && Object.hasOwn(status, 'amount')) {
    throw new TypeError(`${label} amount is only valid for burn or bleed.`);
  }
  return { name, stacks, remainingRounds, source, ...(amount === null ? {} : { amount }) };
}

function normalizeModifier(rawModifier, label, stats) {
  const modifier = assertPlainObject(rawModifier, label);
  assertKnownKeys(
    modifier,
    new Set(['stat', 'amount', 'stacks', 'remainingRounds', 'source']),
    label
  );
  const stat = assertString(requireOwn(modifier, 'stat', label), `${label} stat`);
  if (!Object.hasOwn(stats, stat))
    throw new RangeError(`${label} references unknown stat "${stat}".`);
  return {
    stat,
    amount: assertFinite(requireOwn(modifier, 'amount', label), `${label} amount`),
    stacks: assertInteger(requireOwn(modifier, 'stacks', label), `${label} stacks`, {
      minimum: 1,
      maximum: MAX_STACKS,
    }),
    remainingRounds: assertInteger(
      requireOwn(modifier, 'remainingRounds', label),
      `${label} remainingRounds`,
      { minimum: 1, maximum: MAX_DURATION }
    ),
    source: assertString(requireOwn(modifier, 'source', label), `${label} source`),
  };
}

function normalizeActor(rawActor, index) {
  const label = `Actor ${index + 1}`;
  const actor = assertPlainObject(rawActor, label);
  assertKnownKeys(
    actor,
    new Set(['id', 'key', 'side', 'row', 'hp', 'maxHp', 'stats', 'statuses', 'modifiers']),
    label
  );
  const id = assertString(requireOwn(actor, 'id', label), `${label} id`);
  const side = assertEnum(requireOwn(actor, 'side', label), new Set(SIDES), `${label} side`);
  const row = assertEnum(requireOwn(actor, 'row', label), new Set(ROWS), `${label} row`);
  const key = createActorKey(side, id);
  if (Object.hasOwn(actor, 'key') && actor.key !== key) {
    throw new RangeError(`${label} key must match its side-qualified identity "${key}".`);
  }
  const maxHp = assertFinite(requireOwn(actor, 'maxHp', label), `${label} maxHp`, { minimum: 1 });
  const hp = assertFinite(requireOwn(actor, 'hp', label), `${label} hp`, {
    minimum: 0,
    maximum: maxHp,
  });
  const rawStats = assertPlainObject(requireOwn(actor, 'stats', label), `${label} stats`);
  if (Object.keys(rawStats).length === 0) throw new RangeError(`${label} stats cannot be empty.`);
  const stats = {};
  for (const [name, value] of Object.entries(rawStats)) {
    stats[assertString(name, `${label} stat name`)] = assertFinite(
      value,
      `${label} stat "${name}"`
    );
  }
  const rawStatuses = requireOwn(actor, 'statuses', label);
  const rawModifiers = requireOwn(actor, 'modifiers', label);
  if (!Array.isArray(rawStatuses)) throw new TypeError(`${label} statuses must be an array.`);
  if (!Array.isArray(rawModifiers)) throw new TypeError(`${label} modifiers must be an array.`);
  return {
    id,
    key,
    side,
    row,
    hp,
    maxHp,
    stats,
    statuses: rawStatuses.map((status, statusIndex) =>
      normalizeStatus(status, `${label} status ${statusIndex + 1}`)
    ),
    modifiers: rawModifiers.map((modifier, modifierIndex) =>
      normalizeModifier(modifier, `${label} modifier ${modifierIndex + 1}`, stats)
    ),
  };
}

export function createEffectState(rawState = {}) {
  const state = assertPlainObject(rawState, 'Effect state');
  assertKnownKeys(state, new Set(['version', 'round', 'actors']), 'Effect state');
  const version = requireOwn(state, 'version', 'Effect state');
  const round = requireOwn(state, 'round', 'Effect state');
  const actors = requireOwn(state, 'actors', 'Effect state');
  if (version !== BATTLE_EFFECT_RUNTIME_VERSION) {
    throw new RangeError(`Unsupported effect runtime version "${version}".`);
  }
  assertInteger(round, 'Effect state round', { minimum: 0, maximum: Number.MAX_SAFE_INTEGER });
  if (!Array.isArray(actors)) throw new TypeError('Effect state actors must be an array.');
  const normalizedActors = actors.map(normalizeActor);
  const keys = new Set();
  for (const actor of normalizedActors) {
    if (keys.has(actor.key)) throw new RangeError(`Duplicate side-qualified actor "${actor.key}".`);
    keys.add(actor.key);
  }
  return freezeRecord({ version, round, actors: normalizedActors });
}

function normalizeTarget(rawTarget, label) {
  const target = assertPlainObject(rawTarget, label);
  assertKnownKeys(target, new Set(['type', 'count', 'range', 'row']), label);
  const type = assertEnum(requireOwn(target, 'type', label), TARGET_SET, `${label} type`);
  const count = requireOwn(target, 'count', label);
  const range = requireOwn(target, 'range', label);
  if (count !== null) assertInteger(count, `${label} count`, { minimum: 1, maximum: 6 });
  if (range !== null) assertInteger(range, `${label} range`, { minimum: 0, maximum: 2 });
  if (type === 'self' && (count !== 1 || range !== 0)) {
    throw new RangeError(`${label} self requires count 1 and range 0.`);
  }
  if ((type === 'random-ally' || type === 'random-enemy') && count === null) {
    throw new TypeError(`${label} random targets require a count.`);
  }
  if (type === 'ally-row') {
    assertEnum(requireOwn(target, 'row', label), new Set(ROWS), `${label} row`);
  } else if (Object.hasOwn(target, 'row')) {
    throw new TypeError(`${label} row is only valid for ally-row.`);
  }
  return { type, count, range, ...(type === 'ally-row' ? { row: target.row } : {}) };
}

function normalizeConditions(rawConditions, label) {
  if (!Array.isArray(rawConditions)) throw new TypeError(`${label} must be an array.`);
  return rawConditions.map((rawCondition, index) => {
    const conditionLabel = `${label} ${index + 1}`;
    const condition = assertPlainObject(rawCondition, conditionLabel);
    assertKnownKeys(condition, new Set(['type', 'value', 'status']), conditionLabel);
    const type = assertEnum(
      requireOwn(condition, 'type', conditionLabel),
      new Set(['target-hp-below', 'target-hp-above', 'target-has-status', 'target-lacks-status']),
      `${conditionLabel} type`
    );
    if (type === 'target-hp-below' || type === 'target-hp-above') {
      return {
        type,
        value: assertFinite(
          requireOwn(condition, 'value', conditionLabel),
          `${conditionLabel} value`,
          {
            minimum: 0,
            maximum: 1,
          }
        ),
      };
    }
    return {
      type,
      status: assertEnum(
        requireOwn(condition, 'status', conditionLabel),
        STATUS_SET,
        `${conditionLabel} status`
      ),
    };
  });
}

export function validateEffectDefinition(rawEffect) {
  const label = 'Effect';
  const effect = assertPlainObject(rawEffect, label);
  assertKnownKeys(
    effect,
    new Set([
      'id',
      'version',
      'phase',
      'source',
      'target',
      'type',
      'chance',
      'conditions',
      'amount',
      'stat',
      'status',
      'duration',
      'stacks',
      'maxStacks',
      'statuses',
    ]),
    label
  );
  if (requireOwn(effect, 'version', label) !== BATTLE_EFFECT_RUNTIME_VERSION) {
    throw new RangeError(`Unsupported effect version "${effect.version}".`);
  }
  const normalized = {
    id: assertString(requireOwn(effect, 'id', label), 'Effect id'),
    version: effect.version,
    phase: assertEnum(requireOwn(effect, 'phase', label), PHASE_SET, 'Effect phase'),
    source: assertString(requireOwn(effect, 'source', label), 'Effect source'),
    target: normalizeTarget(requireOwn(effect, 'target', label), 'Effect target'),
    type: assertEnum(requireOwn(effect, 'type', label), TYPE_SET, 'Effect type'),
    chance: assertFinite(requireOwn(effect, 'chance', label), 'Effect chance', {
      minimum: 0,
      maximum: 1,
    }),
    conditions: normalizeConditions(requireOwn(effect, 'conditions', label), 'Effect conditions'),
  };
  const commonFields = [
    'id',
    'version',
    'phase',
    'source',
    'target',
    'type',
    'chance',
    'conditions',
  ];
  const fieldsByType = {
    damage: ['amount'],
    heal: ['amount'],
    'stat-modifier': ['stat', 'amount', 'duration', 'stacks', 'maxStacks'],
    status: ['status', 'duration', 'stacks', 'maxStacks'],
    dot: ['status', 'amount', 'duration', 'stacks', 'maxStacks'],
    cleanse: ['statuses'],
  };
  assertKnownKeys(effect, new Set([...commonFields, ...fieldsByType[effect.type]]), label);
  if (effect.type === 'damage' || effect.type === 'heal') {
    normalized.amount = assertFinite(requireOwn(effect, 'amount', label), 'Effect amount', {
      minimum: 0,
    });
  } else if (effect.type === 'stat-modifier') {
    normalized.stat = assertString(requireOwn(effect, 'stat', label), 'Effect stat');
    normalized.amount = assertFinite(requireOwn(effect, 'amount', label), 'Effect amount');
    normalized.duration = assertInteger(requireOwn(effect, 'duration', label), 'Effect duration', {
      minimum: 1,
      maximum: MAX_DURATION,
    });
    normalized.stacks = assertInteger(requireOwn(effect, 'stacks', label), 'Effect stacks', {
      minimum: 1,
      maximum: MAX_STACKS,
    });
    normalized.maxStacks = assertInteger(
      requireOwn(effect, 'maxStacks', label),
      'Effect maxStacks',
      { minimum: normalized.stacks, maximum: MAX_STACKS }
    );
  } else if (effect.type === 'status' || effect.type === 'dot') {
    normalized.status = assertEnum(
      requireOwn(effect, 'status', label),
      STATUS_SET,
      'Effect status'
    );
    if (effect.type === 'dot' && effect.status !== 'burn' && effect.status !== 'bleed') {
      throw new RangeError('DoT effects require burn or bleed status.');
    }
    if (effect.type === 'status' && (effect.status === 'burn' || effect.status === 'bleed')) {
      throw new RangeError('Burn and bleed must use the dot effect type.');
    }
    normalized.duration = assertInteger(requireOwn(effect, 'duration', label), 'Effect duration', {
      minimum: 1,
      maximum: MAX_DURATION,
    });
    normalized.stacks = assertInteger(requireOwn(effect, 'stacks', label), 'Effect stacks', {
      minimum: 1,
      maximum: MAX_STACKS,
    });
    normalized.maxStacks = assertInteger(
      requireOwn(effect, 'maxStacks', label),
      'Effect maxStacks',
      { minimum: normalized.stacks, maximum: MAX_STACKS }
    );
    if (effect.type === 'dot') {
      normalized.amount = assertFinite(requireOwn(effect, 'amount', label), 'Effect amount', {
        minimum: 0,
      });
    }
  } else {
    const statuses = requireOwn(effect, 'statuses', label);
    if (!Array.isArray(statuses) || statuses.length === 0) {
      throw new TypeError('Cleanse effect statuses must be a non-empty array.');
    }
    normalized.statuses = statuses.map((status, index) =>
      assertEnum(
        status,
        new Set([...BATTLE_EFFECT_STATUSES, 'harmful']),
        `Cleanse status ${index + 1}`
      )
    );
  }
  return freezeRecord(normalized);
}

function actorRowIndex(actor) {
  return ROWS.indexOf(actor.row);
}

function isInRange(source, target, range) {
  return range === null || Math.abs(actorRowIndex(source) - actorRowIndex(target)) <= range;
}

function stableActors(state) {
  return [...state.actors].sort(
    (left, right) =>
      SIDES.indexOf(left.side) - SIDES.indexOf(right.side) ||
      actorRowIndex(left) - actorRowIndex(right) ||
      left.id.localeCompare(right.id)
  );
}

function selectTargets(state, source, target, random) {
  const actors = stableActors(state).filter((actor) => actor.hp > 0);
  let candidates;
  if (target.type === 'self') return source.hp > 0 ? [source] : [];
  if (target.type === 'ally-row') {
    candidates = actors.filter(
      (actor) =>
        actor.side === source.side &&
        actor.row === target.row &&
        isInRange(source, actor, target.range)
    );
  } else {
    const ally = target.type === 'random-ally' || target.type === 'all-allies';
    const desiredSide = ally ? source.side : source.side === 'A' ? 'B' : 'A';
    candidates = actors.filter(
      (actor) => actor.side === desiredSide && isInRange(source, actor, target.range)
    );
    if (target.type === 'enemy-front') {
      const frontIndex = Math.min(...candidates.map(actorRowIndex));
      candidates = candidates.filter((actor) => actorRowIndex(actor) === frontIndex);
    }
  }
  if (target.type === 'random-ally' || target.type === 'random-enemy') {
    const pool = [...candidates];
    const selected = [];
    while (pool.length > 0 && selected.length < target.count) {
      const roll = drawRandom(random);
      selected.push(pool.splice(Math.floor(roll * pool.length), 1)[0]);
    }
    return selected;
  }
  return target.count === null ? candidates : candidates.slice(0, target.count);
}

function drawRandom(random) {
  if (typeof random !== 'function') {
    throw new TypeError('A random function must be injected for probabilistic behavior.');
  }
  const value = random();
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value >= 1) {
    throw new RangeError('Injected random function must return a number in [0, 1).');
  }
  return value;
}

function hasStatus(actor, status) {
  return actor.statuses.some((entry) => entry.name === status);
}

function conditionsPass(actor, conditions) {
  return conditions.every((condition) => {
    if (condition.type === 'target-hp-below') return actor.hp / actor.maxHp < condition.value;
    if (condition.type === 'target-hp-above') return actor.hp / actor.maxHp > condition.value;
    if (condition.type === 'target-has-status') return hasStatus(actor, condition.status);
    return !hasStatus(actor, condition.status);
  });
}

function withActor(state, key, update) {
  return {
    ...state,
    actors: state.actors.map((actor) => (actor.key === key ? update(actor) : actor)),
  };
}

function applyStackedEntry(entries, incoming, maxStacks, identity) {
  const index = entries.findIndex(identity);
  if (index < 0) return [...entries, incoming];
  const current = entries[index];
  const replacement = {
    ...current,
    stacks: Math.min(maxStacks, current.stacks + incoming.stacks),
    remainingRounds: Math.max(current.remainingRounds, incoming.remainingRounds),
    ...(Object.hasOwn(incoming, 'amount') ? { amount: incoming.amount } : {}),
  };
  return entries.map((entry, entryIndex) => (entryIndex === index ? replacement : entry));
}

function applyOneEffect(state, effect, target) {
  const before = target.hp;
  let event = { effectId: effect.id, source: effect.source, target: target.key, type: effect.type };
  let nextState = state;
  if (effect.type === 'damage') {
    const hp = Math.max(0, target.hp - effect.amount);
    nextState = withActor(state, target.key, (actor) => ({ ...actor, hp }));
    event = { ...event, amount: before - hp, before, after: hp };
  } else if (effect.type === 'heal') {
    if (hasStatus(target, 'recovery-block'))
      return { state, event: { ...event, skipped: 'recovery-block' } };
    const hp = Math.min(target.maxHp, target.hp + effect.amount);
    nextState = withActor(state, target.key, (actor) => ({ ...actor, hp }));
    event = { ...event, amount: hp - before, before, after: hp };
  } else if (effect.type === 'stat-modifier') {
    if (!Object.hasOwn(target.stats, effect.stat)) {
      return { state, event: { ...event, skipped: 'unknown-target-stat' } };
    }
    const incoming = {
      stat: effect.stat,
      amount: effect.amount,
      stacks: effect.stacks,
      remainingRounds: effect.duration,
      source: effect.source,
    };
    nextState = withActor(state, target.key, (actor) => ({
      ...actor,
      modifiers: applyStackedEntry(
        actor.modifiers,
        incoming,
        effect.maxStacks,
        (entry) =>
          entry.stat === incoming.stat &&
          entry.amount === incoming.amount &&
          entry.source === incoming.source
      ),
    }));
    event = { ...event, stat: effect.stat, amount: effect.amount, stacks: effect.stacks };
  } else if (effect.type === 'status' || effect.type === 'dot') {
    if (CONTROL_STATUSES.has(effect.status) && hasStatus(target, 'sober')) {
      return { state, event: { ...event, status: effect.status, skipped: 'control-immunity' } };
    }
    const incoming = {
      name: effect.status,
      stacks: effect.stacks,
      remainingRounds: effect.duration,
      source: effect.source,
      ...(effect.type === 'dot' ? { amount: effect.amount } : {}),
    };
    nextState = withActor(state, target.key, (actor) => ({
      ...actor,
      statuses: applyStackedEntry(
        actor.statuses,
        incoming,
        effect.maxStacks,
        (entry) => entry.name === incoming.name && entry.source === incoming.source
      ),
    }));
    event = { ...event, status: effect.status, stacks: effect.stacks };
  } else {
    const removesHarmful = effect.statuses.includes('harmful');
    let removed = 0;
    nextState = withActor(state, target.key, (actor) => ({
      ...actor,
      statuses: actor.statuses.filter((status) => {
        const remove =
          effect.statuses.includes(status.name) ||
          (removesHarmful && HARMFUL_STATUSES.has(status.name));
        if (remove) removed += 1;
        return !remove;
      }),
    }));
    event = { ...event, removed };
  }
  return { state: nextState, event };
}

function processRoundEnd(state) {
  const events = [];
  let nextState = state;
  for (const actor of stableActors(state)) {
    const current = nextState.actors.find((candidate) => candidate.key === actor.key);
    if (current.hp > 0) {
      for (const status of current.statuses) {
        if (status.name !== 'burn' && status.name !== 'bleed') continue;
        const before = nextState.actors.find((candidate) => candidate.key === actor.key).hp;
        const amount = Math.min(before, status.amount * status.stacks);
        nextState = withActor(nextState, actor.key, (candidate) => ({
          ...candidate,
          hp: candidate.hp - amount,
        }));
        events.push({
          effectId: `dot:${status.name}`,
          source: status.source,
          target: actor.key,
          type: 'dot-tick',
          status: status.name,
          amount,
          before,
          after: before - amount,
        });
      }
    }
    nextState = withActor(nextState, actor.key, (candidate) => ({
      ...candidate,
      statuses: candidate.statuses
        .map((status) => ({ ...status, remainingRounds: status.remainingRounds - 1 }))
        .filter((status) => status.remainingRounds > 0),
      modifiers: candidate.modifiers
        .map((modifier) => ({ ...modifier, remainingRounds: modifier.remainingRounds - 1 }))
        .filter((modifier) => modifier.remainingRounds > 0),
    }));
  }
  return { state: nextState, events };
}

export function getEffectiveStat(actor, stat) {
  assertPlainObject(actor, 'Actor');
  if (!Object.hasOwn(actor.stats, stat)) throw new RangeError(`Actor has no stat "${stat}".`);
  return actor.modifiers
    .filter((modifier) => modifier.stat === stat)
    .reduce((total, modifier) => total + modifier.amount * modifier.stacks, actor.stats[stat]);
}

export function applyEffectPhase(state, rawEffects, phase, { random } = {}) {
  const normalizedState = createEffectState(state);
  assertEnum(phase, PHASE_SET, 'Effect phase');
  if (!Array.isArray(rawEffects)) throw new TypeError('Effects must be an array.');
  const effects = rawEffects.map(validateEffectDefinition);
  const duplicateIds = effects.filter(
    (effect, index) => effects.findIndex((candidate) => candidate.id === effect.id) !== index
  );
  if (duplicateIds.length > 0) throw new RangeError(`Duplicate effect id "${duplicateIds[0].id}".`);

  let nextState = {
    version: normalizedState.version,
    round: normalizedState.round,
    actors: normalizedState.actors.map((actor) => ({
      ...actor,
      stats: { ...actor.stats },
      statuses: actor.statuses.map((status) => ({ ...status })),
      modifiers: actor.modifiers.map((modifier) => ({ ...modifier })),
    })),
  };
  const events = [];
  for (const effect of effects) {
    if (effect.phase !== phase) continue;
    const source = nextState.actors.find((actor) => actor.key === effect.source);
    if (!source)
      throw new RangeError(`Effect "${effect.id}" references unknown source "${effect.source}".`);
    if (source.hp <= 0) {
      events.push({
        effectId: effect.id,
        source: effect.source,
        target: null,
        type: effect.type,
        skipped: 'source-defeated',
      });
      continue;
    }
    const targets = selectTargets(nextState, source, effect.target, random);
    for (const target of targets) {
      if (!conditionsPass(target, effect.conditions)) {
        events.push({
          effectId: effect.id,
          source: effect.source,
          target: target.key,
          type: effect.type,
          skipped: 'condition',
        });
        continue;
      }
      if (effect.chance < 1 && drawRandom(random) >= effect.chance) {
        events.push({
          effectId: effect.id,
          source: effect.source,
          target: target.key,
          type: effect.type,
          skipped: 'chance',
        });
        continue;
      }
      const currentTarget = nextState.actors.find((actor) => actor.key === target.key);
      const result = applyOneEffect(nextState, effect, currentTarget);
      nextState = result.state;
      events.push(result.event);
    }
  }
  if (phase === 'round-end') {
    const lifecycle = processRoundEnd(nextState);
    nextState = lifecycle.state;
    events.push(...lifecycle.events);
  }
  return freezeRecord({
    version: BATTLE_EFFECT_RUNTIME_VERSION,
    phase,
    state: nextState,
    events: events.map((event, index) => ({ id: `${phase}:${index + 1}`, phase, ...event })),
  });
}

export function createBattleEffectRuntime({ random } = {}) {
  if (random !== undefined && typeof random !== 'function') {
    throw new TypeError('Effect runtime random must be a function when provided.');
  }
  return Object.freeze({
    version: BATTLE_EFFECT_RUNTIME_VERSION,
    applyPhase: (state, effects, phase) => applyEffectPhase(state, effects, phase, { random }),
  });
}
