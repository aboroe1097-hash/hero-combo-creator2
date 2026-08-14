// tests/unit/specialization-hero-plans.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  HERO_PLAN_DEFAULT_MODE,
  HERO_PLAN_MODES,
  HERO_PLAN_TROOPS,
  MECHANIC_IDS,
  analyzeHeroMechanics,
  buildHeroPlans,
  getHeroPlanLength,
  getHeroPlanRanking,
  getHeroPlanStep,
  getNextHeroPlanResearch,
} from '../../js/specialization-hero-plans.js';
import { SPECIALIZATION_RESEARCH } from '../../js/specialization-towers-v2-data.js';

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

const SIEGE_CONTEXTS = new Set([
  'siege',
  'siegeAttacks',
  'siegeDefense',
  'reinforcingAllies',
  'initiatingRally',
]);

/** How much of a research's bonus is siege-context, 0..1. */
function siegeShare(researchId) {
  const research = SPECIALIZATION_RESEARCH[researchId];
  let siege = 0;
  let total = 0;
  for (const node of research?.nodes || []) {
    const value = Math.abs(Number(node.bonusValue) || 0);
    total += value;
    if (SIEGE_CONTEXTS.has(node.context || 'general')) siege += value;
  }
  return total ? siege / total : 0;
}

/** Siege-weighted mean position: lower means siege content is funded sooner. */
function siegeWeightedPosition(plan) {
  return plan.researchOrder.reduce(
    (total, researchId, index) => total + siegeShare(researchId) * (index + 1),
    0
  );
}

function columnReasons(result, troop, columnId) {
  return columnSlice(planFor(result, troop), columnId)
    .flatMap((researchId) => reasonsFor(result, troop, researchId))
    .join(' | ');
}

test('there are exactly two paths, and siege is the default', () => {
  assert.deepEqual([...HERO_PLAN_MODES], ['siege', 'nonSiege']);
  assert.equal(HERO_PLAN_DEFAULT_MODE, 'siege');
  for (const mode of HERO_PLAN_MODES) {
    assert.equal(buildHeroPlans({ heroes: ['Boudica'], mode }).mode, mode);
  }
  assert.equal(buildHeroPlans({ heroes: ['Boudica'], mode: 'teleport' }).mode, 'siege');
});

test('analyzeHeroMechanics tags the signature hero mechanics', () => {
  const ramses = analyzeHeroMechanics('Ramses II');
  assert.ok(ramses.mechanics.includes(MECHANIC_IDS.FATAL_BLOW), 'Ramses II has Fatal Blow');
  assert.equal(ramses.type, 'Archers');
  assert.equal(ramses.paid, true);

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
  const result = buildHeroPlans({ heroes: ['Ramses II', 'Boudica'], mode: 'siege' });
  const ranking = getHeroPlanRanking(result.plans);
  assert.equal(ranking[0].troop, 'archer');
  assert.ok(ranking[0].towerScore > ranking[1].towerScore, 'archer tower clearly leads');
});

test('Ramses II + Boudica cites Column II Sniper Archer for Fatal Blow and Destructive Strike', () => {
  const result = buildHeroPlans({ heroes: ['Ramses II', 'Boudica'], mode: 'nonSiege' });
  assert.equal(columnSlice(planFor(result, 'archer'), 2)[0], 'training2');
  const reasons = columnReasons(result, 'archer', 2);
  assert.ok(reasons.includes('Sniper Archer'), 'cites Sniper Archer');
  assert.ok(reasons.includes('Fatal Blow'), 'cites Fatal Blow');
  assert.ok(reasons.includes('Destructive Strike'), 'cites Destructive Strike');
});

test('Boudica combat speed is cited on the Training I speed milestone', () => {
  const result = buildHeroPlans({ heroes: ['Ramses II', 'Boudica'], mode: 'siege' });
  const training1Reasons = reasonsFor(result, 'archer', 'training1').join(' | ');
  assert.ok(training1Reasons.includes('Combat Speed'), 'cites Combat Speed');
  assert.ok(
    training1Reasons.includes('Training I 100% milestone'),
    'points at the speed milestone'
  );
});

test('Theodora ranks Footmen first and cites Impenetrable Formation healing', () => {
  const result = buildHeroPlans({ heroes: ['Theodora'], mode: 'siege' });
  assert.equal(getHeroPlanRanking(result.plans)[0].troop, 'footman');
  assert.ok(
    columnReasons(result, 'footman', 7).includes('Impenetrable Formation'),
    'cites Column VII healing Legion Skill'
  );
});

test('Lancelot ranks Cavalry first and cites Bash From the Back', () => {
  const result = buildHeroPlans({ heroes: ['Lancelot'], mode: 'siege' });
  assert.equal(getHeroPlanRanking(result.plans)[0].troop, 'cavalry');
  assert.ok(
    columnReasons(result, 'cavalry', 7).includes('Bash From the Back'),
    'cites Column VII cavalry Legion Skill'
  );
});

test('Rozen Blade cites Column VIII Headstarter through Combat Speed', () => {
  const result = buildHeroPlans({ heroes: ['Rozen Blade'], mode: 'nonSiege' });
  assert.equal(getHeroPlanRanking(result.plans)[0].troop, 'cavalry');
  assert.ok(
    columnReasons(result, 'cavalry', 8).includes('Headstarter'),
    'cites Column VIII cavalry Legion Skill'
  );
});

test('mixed roster builds all three plans and keeps the deepest tower on top', () => {
  const result = buildHeroPlans({
    heroes: ['Ramses II', 'Boudica', 'Beowulf', 'Theodora'],
    mode: 'siege',
  });
  assert.equal(result.heroCount, 4);
  for (const troop of HERO_PLAN_TROOPS) {
    const plan = planFor(result, troop);
    assert.equal(plan.researchOrder.length, 32, `${troop} plan covers all 32 researches`);
    assert.equal(new Set(plan.researchOrder).size, 32, `${troop} plan has no duplicates`);
    assert.equal(getHeroPlanLength(plan), 32);
  }
  assert.equal(getHeroPlanRanking(result.plans)[0].troop, 'archer');
});

test('All-type heroes boost every tower over the empty-roster baseline', () => {
  const empty = buildHeroPlans({ heroes: [], mode: 'siege' });
  const cleo = buildHeroPlans({ heroes: ['Cleopatra VII'], mode: 'siege' });
  for (const troop of HERO_PLAN_TROOPS) {
    assert.ok(
      planFor(cleo, troop).towerScore > planFor(empty, troop).towerScore,
      `${troop} tower boosted by an All-type hero`
    );
  }
});

test('empty roster still produces a deterministic free-to-play plan without reasons', () => {
  const result = buildHeroPlans({ heroes: [], mode: 'siege' });
  assert.equal(result.heroCount, 0);
  for (const troop of HERO_PLAN_TROOPS) {
    const plan = planFor(result, troop);
    assert.equal(plan.researchOrder.length, 32);
    assert.equal(Object.keys(plan.reasons).length, 0);
    assert.equal(plan.presetId, 'f2p');
    assert.deepEqual([...plan.pathHeroes], []);
  }
});

test('unknown and duplicate hero names are filtered from the roster', () => {
  const result = buildHeroPlans({
    heroes: ['Ramses II', 'Ramses II', 'Not A Hero', ''],
    mode: 'siege',
  });
  assert.deepEqual([...result.roster], ['Ramses II']);
});

test('the two paths reorder every tower differently', () => {
  const heroes = ['Ramses II', 'Boudica', 'Lancelot', 'King Arthur'];
  const siege = buildHeroPlans({ heroes, mode: 'siege' });
  const field = buildHeroPlans({ heroes, mode: 'nonSiege' });
  for (const troop of HERO_PLAN_TROOPS) {
    assert.notDeepEqual(
      [...planFor(siege, troop).researchOrder],
      [...planFor(field, troop).researchOrder],
      `${troop} siege and field paths differ`
    );
  }
  // The siege path funds siege-context researches earlier. Measured across the
  // whole order rather than one pair, so it states the property instead of
  // pinning two ids that any reweighting would move.
  for (const troop of HERO_PLAN_TROOPS) {
    assert.ok(
      siegeWeightedPosition(planFor(siege, troop)) < siegeWeightedPosition(planFor(field, troop)),
      `${troop} funds siege content earlier on the siege path`
    );
  }
});

test('unconditional "general" researches are not penalized on either path', () => {
  // Training I is entirely general-context. If a path treated general as
  // off-path it would sink in both, which is what the ALWAYS_CONTEXTS list
  // prevents — so it never falls to the back of Column I on either path.
  for (const mode of HERO_PLAN_MODES) {
    for (const troop of HERO_PLAN_TROOPS) {
      const plan = planFor(buildHeroPlans({ heroes: [], mode }), troop);
      assert.ok(
        columnSlice(plan, 1).indexOf('training1') <= 2,
        `training1 stays early for ${troop} on ${mode}`
      );
    }
  }
});

test('a preset override is honoured and reshapes the plan', () => {
  const heroes = ['Leonidas', 'Ramses II'];
  const auto = buildHeroPlans({ heroes, mode: 'siege' });
  const forced = buildHeroPlans({
    heroes,
    mode: 'siege',
    presets: { archer: 'archer-resilient' },
  });
  assert.equal(planFor(forced, 'archer').presetId, 'archer-resilient');
  assert.notDeepEqual(
    [...planFor(auto, 'archer').researchOrder],
    [...planFor(forced, 'archer').researchOrder]
  );
  // A preset belonging to another troop is ignored rather than applied.
  const wrong = buildHeroPlans({ heroes, mode: 'siege', presets: { archer: 'cavalry-prep-skip' } });
  assert.equal(planFor(wrong, 'archer').presetId, planFor(auto, 'archer').presetId);
});

test('Alexander pulls the burning-damage milestones forward for Footmen', () => {
  const result = buildHeroPlans({ heroes: ['Alexander'], mode: 'nonSiege' });
  const plan = planFor(result, 'footman');
  assert.equal(plan.presetId, 'footman-bleed-shock');
  // Encounter Battle I ends on "-5% damage taken when subject to burning
  // status", and his own mitigation skill takes +300% burning damage.
  assert.equal(columnSlice(plan, 1)[0], 'encounter1');
  assert.ok(plan.heroNotes.some((entry) => entry.hero === 'Alexander' && entry.note.length > 40));
});

test('plan step helpers walk the ordered plan and find the next research', () => {
  const result = buildHeroPlans({ heroes: ['Ramses II', 'Boudica'], mode: 'siege' });
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
  assert.equal(getHeroPlanLength(null), 0);
});
