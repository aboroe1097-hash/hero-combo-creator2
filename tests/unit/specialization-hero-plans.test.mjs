// tests/unit/specialization-hero-plans.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  HERO_PLAN_MODES,
  HERO_PLAN_TROOPS,
  MECHANIC_IDS,
  analyzeHeroMechanics,
  buildHeroPlans,
  getHeroPlanRanking,
  getHeroPlanStep,
  getNextHeroPlanResearch,
} from '../../js/specialization-hero-plans.js';

function planFor(result, troop) {
  return result.plans[troop];
}

function columnSlice(plan, columnId) {
  const start = (columnId - 1) * 4;
  return plan.researchOrder.slice(start, start + 4);
}

function reasonsFor(result, troop, researchId) {
  return planFor(result, troop).reasons[researchId] || [];
}

test('analyzeHeroMechanics tags the signature hero mechanics', () => {
  const ramses = analyzeHeroMechanics('Ramses II');
  assert.ok(ramses.mechanics.includes(MECHANIC_IDS.FATAL_BLOW), 'Ramses II has Fatal Blow');
  assert.equal(ramses.type, 'Archers');

  const boudica = analyzeHeroMechanics('Boudica');
  assert.ok(
    boudica.mechanics.includes(MECHANIC_IDS.DESTRUCTIVE_STRIKE),
    'Boudica has Destructive Strike'
  );
  assert.ok(boudica.mechanics.includes(MECHANIC_IDS.COMBAT_SPEED), 'Boudica has Combat Speed');

  const rozen = analyzeHeroMechanics('Rozen Blade');
  assert.ok(rozen.mechanics.includes(MECHANIC_IDS.COMBAT_SPEED), 'Rozen Blade has Combat Speed');

  const lancelot = analyzeHeroMechanics('Lancelot');
  assert.ok(lancelot.mechanics.includes(MECHANIC_IDS.PREP_SKIP), 'Lancelot has Prep skip');
});

test('analyzeHeroMechanics falls back gracefully for heroes without skill text', () => {
  const kublai = analyzeHeroMechanics('Kublai');
  assert.equal(kublai.hasSkillText, false);
  assert.equal(kublai.mechanics.length, 0);
  assert.equal(kublai.type, 'All');
});

test('Ramses II + Boudica ranks the Archer tower first', () => {
  const result = buildHeroPlans({ heroes: ['Ramses II', 'Boudica'], mode: 'balanced' });
  const ranking = getHeroPlanRanking(result.plans);
  assert.equal(ranking[0].troop, 'archer');
  assert.ok(ranking[0].towerScore > ranking[1].towerScore, 'archer tower clearly leads');
});

test('Ramses II + Boudica cites Column II Sniper Archer for Fatal Blow and Destructive Strike', () => {
  const result = buildHeroPlans({ heroes: ['Ramses II', 'Boudica'], mode: 'balanced' });
  const c2 = columnSlice(planFor(result, 'archer'), 2);
  assert.equal(c2[0], 'training2', 'archer damage milestones lead Column II');
  const training2Reasons = reasonsFor(result, 'archer', 'training2').join(' | ');
  assert.ok(training2Reasons.includes('Sniper Archer'), 'cites Sniper Archer');
  assert.ok(training2Reasons.includes('Fatal Blow'), 'cites Fatal Blow');
  assert.ok(training2Reasons.includes('Destructive Strike'), 'cites Destructive Strike');
});

test('Boudica combat speed is cited on the Training I speed milestone', () => {
  const result = buildHeroPlans({ heroes: ['Ramses II', 'Boudica'], mode: 'balanced' });
  const training1Reasons = reasonsFor(result, 'archer', 'training1').join(' | ');
  assert.ok(training1Reasons.includes('Combat Speed'), 'cites Combat Speed');
  assert.ok(
    training1Reasons.includes('Training I 100% milestone'),
    'points at the speed milestone'
  );
});

test('Theodora ranks Footmen first and cites Impenetrable Formation healing', () => {
  const result = buildHeroPlans({ heroes: ['Theodora'], mode: 'balanced' });
  assert.equal(getHeroPlanRanking(result.plans)[0].troop, 'footman');
  const c7Reasons = columnSlice(planFor(result, 'footman'), 7)
    .flatMap((rid) => reasonsFor(result, 'footman', rid))
    .join(' | ');
  assert.ok(c7Reasons.includes('Impenetrable Formation'), 'cites Column VII healing Legion Skill');
});

test('Lancelot ranks Cavalry first and cites Bash From the Back', () => {
  const result = buildHeroPlans({ heroes: ['Lancelot'], mode: 'balanced' });
  assert.equal(getHeroPlanRanking(result.plans)[0].troop, 'cavalry');
  const c7Reasons = columnSlice(planFor(result, 'cavalry'), 7)
    .flatMap((rid) => reasonsFor(result, 'cavalry', rid))
    .join(' | ');
  assert.ok(c7Reasons.includes('Bash From the Back'), 'cites Column VII cavalry Legion Skill');
});

test('Rozen Blade cites Column VIII Headstarter through Combat Speed', () => {
  const result = buildHeroPlans({ heroes: ['Rozen Blade'], mode: 'balanced' });
  assert.equal(getHeroPlanRanking(result.plans)[0].troop, 'cavalry');
  const c8Reasons = columnSlice(planFor(result, 'cavalry'), 8)
    .flatMap((rid) => reasonsFor(result, 'cavalry', rid))
    .join(' | ');
  assert.ok(c8Reasons.includes('Headstarter'), 'cites Column VIII cavalry Legion Skill');
});

test('mixed roster builds all three plans and keeps archers on top', () => {
  const result = buildHeroPlans({
    heroes: ['Ramses II', 'Theodora', 'Octavius'],
    mode: 'balanced',
  });
  assert.equal(result.heroCount, 3);
  for (const troop of HERO_PLAN_TROOPS) {
    const plan = planFor(result, troop);
    assert.equal(plan.researchOrder.length, 32, `${troop} plan covers all 32 researches`);
    assert.equal(new Set(plan.researchOrder).size, 32, `${troop} plan has no duplicates`);
  }
  assert.equal(getHeroPlanRanking(result.plans)[0].troop, 'archer');
});

test('All-type heroes boost every tower over the empty-roster baseline', () => {
  const empty = buildHeroPlans({ heroes: [], mode: 'balanced' });
  const cleo = buildHeroPlans({ heroes: ['Cleopatra VII'], mode: 'balanced' });
  for (const troop of HERO_PLAN_TROOPS) {
    assert.ok(
      planFor(cleo, troop).towerScore > planFor(empty, troop).towerScore,
      `${troop} tower boosted by an All-type hero`
    );
  }
});

test('empty roster still produces a deterministic generic plan without reasons', () => {
  const result = buildHeroPlans({ heroes: [], mode: 'balanced' });
  assert.equal(result.heroCount, 0);
  for (const troop of HERO_PLAN_TROOPS) {
    assert.equal(planFor(result, troop).researchOrder.length, 32);
    assert.equal(Object.keys(planFor(result, troop).reasons).length, 0);
  }
});

test('unknown and duplicate hero names are filtered from the roster', () => {
  const result = buildHeroPlans({
    heroes: ['Ramses II', 'Ramses II', 'Not A Hero', ''],
    mode: 'balanced',
  });
  assert.deepEqual([...result.roster], ['Ramses II']);
});

test('siege mode reweights contexts: Column II siege research rises', () => {
  const balanced = buildHeroPlans({ heroes: ['Ramses II', 'Boudica'], mode: 'balanced' });
  const siege = buildHeroPlans({ heroes: ['Ramses II', 'Boudica'], mode: 'siege' });
  assert.equal(columnSlice(planFor(balanced, 'archer'), 2)[0], 'training2');
  assert.equal(columnSlice(planFor(siege, 'archer'), 2)[0], 'siege1');
});

test('mode and hero plans honor HERO_PLAN_MODES and reject invalid modes', () => {
  for (const mode of HERO_PLAN_MODES) {
    const result = buildHeroPlans({ heroes: ['Boudica'], mode });
    assert.equal(result.mode, mode);
  }
  const invalid = buildHeroPlans({ heroes: ['Boudica'], mode: 'teleport' });
  assert.equal(invalid.mode, 'balanced');
});

test('plan step helpers walk the ordered plan and find the next research', () => {
  const result = buildHeroPlans({ heroes: ['Ramses II', 'Boudica'], mode: 'balanced' });
  const plan = planFor(result, 'archer');
  assert.equal(getHeroPlanStep(plan, plan.researchOrder[0]), 1);
  assert.equal(getHeroPlanStep(plan, plan.researchOrder[31]), 32);
  const done = new Set(plan.researchOrder.slice(0, 5));
  const next = getNextHeroPlanResearch(plan, (rid) => done.has(rid));
  assert.equal(next, plan.researchOrder[5]);
  assert.equal(
    getNextHeroPlanResearch(null, () => false),
    null
  );
});
