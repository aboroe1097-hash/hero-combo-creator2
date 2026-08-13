// tests/unit/specialization-hero-plans.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzeHeroMechanics,
  scoreResearchForRoster,
  buildHeroSpecializationPlan,
  MECHANIC_TAGS,
  HERO_PLAN_MODES,
} from '../../js/specialization-hero-plans.js';

test('analyzeHeroMechanics extracts hero skill mechanics correctly', () => {
  const ramses = analyzeHeroMechanics('Ramses II');
  assert.equal(ramses.name, 'Ramses II');
  assert.ok(ramses.tags.length > 0);

  const beowulf = analyzeHeroMechanics('Beowulf');
  assert.ok(beowulf.tags.includes(MECHANIC_TAGS.FATAL_BLOW_CRIT));

  const windWalker = analyzeHeroMechanics('Wind-Walker');
  assert.ok(windWalker.tags.includes(MECHANIC_TAGS.COUNTER_ATTACK));

  const unknown = analyzeHeroMechanics('Unknown Hero');
  assert.equal(unknown.name, 'Unknown Hero');
  assert.ok(unknown.tags.includes(MECHANIC_TAGS.SKILL_DAMAGE));
});

test('scoreResearchForRoster computes synergy score and rationale', () => {
  const score = scoreResearchForRoster('encounter1', ['Ramses II', 'Boudica'], 'balanced');
  assert.equal(score.researchId, 'encounter1');
  assert.ok(score.score > 0);
  assert.ok(Array.isArray(score.rationale));
});

test('buildHeroSpecializationPlan generates complete 32-research order for Ramses & Boudica', () => {
  const plan = buildHeroSpecializationPlan(['Ramses II', 'Boudica'], 'balanced');
  assert.equal(plan.order.length, 32);
  assert.equal(plan.mode, 'balanced');
  assert.equal(plan.heroCount, 2);
  assert.ok(Object.keys(plan.rationale).length > 0);
});

test('buildHeroSpecializationPlan handles empty roster and all modes', () => {
  HERO_PLAN_MODES.forEach((mode) => {
    const plan = buildHeroSpecializationPlan([], mode);
    assert.equal(plan.order.length, 32);
    assert.equal(plan.mode, mode);
    assert.equal(plan.heroCount, 0);
  });
});

test('buildHeroSpecializationPlan handles Lancelot, Theodora, Rozen Blade, mixed, and siege mode', () => {
  const lancelotPlan = buildHeroSpecializationPlan(['Lancelot', 'Theodora'], 'siege');
  assert.equal(lancelotPlan.order.length, 32);
  assert.equal(lancelotPlan.mode, 'siege');

  const rozenPlan = buildHeroSpecializationPlan(['Rozen Blade', 'The Avalanche'], 'rally');
  assert.equal(rozenPlan.order.length, 32);
  assert.equal(rozenPlan.mode, 'rally');
});
