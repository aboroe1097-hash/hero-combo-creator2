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
