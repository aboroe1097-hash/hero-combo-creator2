import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BATTLE_HERO_RUNTIME_VERSION,
  adaptHeroAssignmentsToEffects,
  createHeroEffectDefinitions,
} from '../../js/battle-simulator-hero-runtime.js';

const stats = () => ({
  unit: { attack: 70, defense: 70, hp: 20 },
  battle: {
    might: 100,
    resistance: 100,
    hp: 100,
    tacticalMight: 0,
    tacticalResistance: 0,
    damage: 0,
    damageMitigation: 0,
    combatSpeed: 0,
  },
});

function row(type, heroName, skillIds, troops = 1_000) {
  return {
    type,
    tier: 9,
    troops,
    stats: stats(),
    ...(heroName ? { heroName, skillIds } : {}),
  };
}

function formation(assignedRow, rowId = 'front') {
  const rows = [row('footmen'), row('footmen'), row('footmen')];
  rows[['front', 'middle', 'back'].indexOf(rowId)] = assignedRow;
  return {
    sideA: { rows },
    sideB: { rows: [row('footmen'), row('footmen'), row('footmen')] },
  };
}

test('empty hero assignments preserve an empty immutable adapter contract', () => {
  const result = adaptHeroAssignmentsToEffects(formation(row('footmen'), 'front'));

  assert.equal(result.version, BATTLE_HERO_RUNTIME_VERSION);
  assert.deepEqual(result.definitions, []);
  assert.deepEqual(result.diagnostics, []);
  assert.equal(Object.isFrozen(result), true);
  assert.equal(createHeroEffectDefinitions, adaptHeroAssignmentsToEffects);
});

test('a known modeled skill maps phase, target range/count, chance, and magnitude separately', () => {
  const config = formation(row('footmen', 'Jiguang Qi', [2]), 'front');
  const before = structuredClone(config);
  const result = adaptHeroAssignmentsToEffects(config);

  assert.deepEqual(result.diagnostics, []);
  assert.deepEqual(result.definitions, [
    {
      id: 'A:front:2:damage:1',
      version: '1.0.0',
      phase: 'before-action',
      source: 'A:front',
      target: { type: 'random-enemy', count: 3, range: 2 },
      chance: 0.4,
      conditions: [],
      type: 'damage',
      amount: 134,
    },
  ]);
  assert.deepEqual(config, before);
});

test('partial, excluded, unknown, and incompatible skills fail closed as diagnostics', () => {
  const partial = adaptHeroAssignmentsToEffects(
    formation(row('footmen', 'Jiguang Qi', [5, 8, 999]), 'front')
  );
  assert.deepEqual(partial.definitions, []);
  assert.ok(partial.diagnostics.some(({ code }) => code === 'skill-not-executable'));
  assert.ok(partial.diagnostics.some(({ code }) => code === 'unknown-skill'));

  const wrongPlacement = adaptHeroAssignmentsToEffects(
    formation(row('footmen', 'Jiguang Qi', [2]), 'back')
  );
  assert.deepEqual(wrongPlacement.definitions, []);
  assert.equal(wrongPlacement.diagnostics[0].code, 'hero-placement-mismatch');

  const unknownHero = adaptHeroAssignmentsToEffects(
    formation(row('footmen', 'Nobody', [2]), 'front')
  );
  assert.equal(unknownHero.diagnostics[0].code, 'unknown-hero');
});

test('modeled healing remains a heal and never reuses recovery magnitude as chance', () => {
  const result = adaptHeroAssignmentsToEffects(
    formation(row('cavalry', 'Army Breaker', [2]), 'middle')
  );

  assert.equal(result.definitions.length, 1);
  assert.equal(result.definitions[0].phase, 'before-action');
  assert.equal(result.definitions[0].type, 'heal');
  assert.equal(result.definitions[0].chance, 0.55);
  assert.equal(result.definitions[0].amount, 840);
  assert.deepEqual(result.definitions[0].target, {
    type: 'random-ally',
    count: 2,
    range: 2,
  });
});

test('explicit options select only canonical skills, remain side-qualified, and do not mutate input', () => {
  const config = formation(row('footmen'), 'front');
  const options = {
    heroSkills: [
      {
        heroName: 'Jiguang Qi',
        skillId: 2,
        amount: 999_999,
        description: 'Untrusted replacement semantics',
      },
    ],
    heroAssignments: {
      A: { front: { heroName: 'Jiguang Qi' } },
      B: {},
    },
  };
  const before = structuredClone({ config, options });
  const result = adaptHeroAssignmentsToEffects({ ...config, ...options });

  assert.equal(result.definitions.length, 1);
  assert.equal(result.definitions[0].id, 'A:front:2:damage:1');
  assert.equal(result.definitions[0].source, 'A:front');
  assert.equal(result.definitions[0].amount, 134);
  assert.deepEqual(result.diagnostics, []);
  assert.deepEqual({ config, options }, before);
});

test('malformed, unknown, and mismatched explicit options fail closed with diagnostics', () => {
  const config = formation(row('footmen'), 'front');
  const result = adaptHeroAssignmentsToEffects({
    ...config,
    heroSkills: [
      { heroName: 'Nobody', skillId: 2 },
      { heroName: 'Jiguang Qi', skillId: 2 },
    ],
    heroAssignments: {
      A: {
        front: { heroName: 'Jiguang Qi', skillIds: [5] },
        nowhere: { heroName: 'Jiguang Qi', skillIds: [2] },
      },
    },
  });

  assert.deepEqual(result.definitions, []);
  assert.ok(result.diagnostics.some(({ code }) => code === 'unknown-explicit-hero-skill'));
  assert.ok(result.diagnostics.some(({ code }) => code === 'explicit-skill-assignment-mismatch'));
  assert.ok(result.diagnostics.some(({ code }) => code === 'invalid-explicit-assignment-slot'));
  assert.ok(result.diagnostics.every(({ source }) => source === 'explicit-options'));
});

test('an explicit assignment duplicating a row assignment emits one exact definition', () => {
  const config = formation(row('footmen', 'Jiguang Qi', [2]), 'front');
  const result = adaptHeroAssignmentsToEffects({
    ...config,
    heroSkills: ['Jiguang Qi:2'],
    heroAssignments: { A: { front: 'Jiguang Qi' } },
  });

  assert.equal(result.definitions.length, 1);
  assert.equal(result.definitions[0].id, 'A:front:2:damage:1');
});

test('explicit canonical skills constrain a matching embedded hero without embedded skill IDs', () => {
  const sakura = row('archers');
  sakura.heroName = 'Sakura';
  const config = formation(sakura, 'middle');
  const options = {
    heroSkills: ['Sakura:2'],
    heroAssignments: { A: { middle: 'Sakura' } },
  };
  const before = structuredClone({ config, options });
  const result = adaptHeroAssignmentsToEffects({ ...config, ...options });

  assert.deepEqual(
    result.definitions.map(({ id }) => id),
    ['A:middle:2:damage:1']
  );
  assert.deepEqual(result.diagnostics, []);
  assert.deepEqual({ config, options }, before);
});

test('conflicting explicit heroes for A:middle invalidate the slot deterministically', () => {
  const config = formation(row('footmen'), 'middle');
  const input = {
    ...config,
    heroSkills: ['Jiguang Qi:2', 'Cao Cao:2'],
    heroAssignments: [
      { side: 'A', rowId: 'middle', heroName: 'Jiguang Qi' },
      { side: 'A', rowId: 'middle', heroName: 'Cao Cao' },
    ],
  };

  let result;
  assert.doesNotThrow(() => {
    result = adaptHeroAssignmentsToEffects(input);
  });

  assert.deepEqual(result.definitions, []);
  assert.deepEqual(result.diagnostics, [
    {
      code: 'conflicting-explicit-assignment',
      message:
        'Conflicting explicit heroes targeted the same side and row; that explicit slot was ignored.',
      source: 'explicit-options',
      side: 'A',
      rowId: 'middle',
      heroNames: ['Cao Cao', 'Jiguang Qi'],
    },
  ]);
});

test('embedded row hero wins explicit conflict while identical canonical selections dedupe', () => {
  const embedded = formation(row('footmen', 'Jiguang Qi', [2]), 'middle');
  const conflict = adaptHeroAssignmentsToEffects({
    ...embedded,
    heroSkills: ['Cao Cao:2'],
    heroAssignments: { A: { middle: 'Cao Cao' } },
  });

  assert.deepEqual(
    conflict.definitions.map(({ id }) => id),
    ['A:middle:2:damage:1']
  );
  assert.equal(conflict.diagnostics[0].code, 'embedded-explicit-hero-conflict');
  assert.equal(conflict.diagnostics[0].embeddedHeroName, 'Jiguang Qi');
  assert.equal(conflict.diagnostics[0].explicitHeroName, 'Cao Cao');

  const duplicate = adaptHeroAssignmentsToEffects({
    ...formation(row('footmen'), 'middle'),
    heroSkills: ['Jiguang Qi:2', 'Jiguang Qi:2'],
    heroAssignments: [
      { side: 'A', rowId: 'middle', heroName: 'Jiguang Qi' },
      { side: 'A', rowId: 'middle', heroName: 'Jiguang Qi', skillIds: [2, 2] },
    ],
  });
  assert.deepEqual(
    duplicate.definitions.map(({ id }) => id),
    ['A:middle:2:damage:1']
  );
  assert.deepEqual(duplicate.diagnostics, []);
});
