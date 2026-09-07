import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BATTLE_HERO_SKILL_ASSUMPTIONS,
  BATTLE_HERO_SKILL_COVERAGE,
  MISSING_EXTENDED_HEROES,
  battleHeroSkillCatalog,
  battleHeroSkills,
  getBattleHeroSkill,
  getBattleHeroSkillCatalogEntry,
  normalizeHeroSkillTarget,
} from '../../js/battle-simulator-hero-skills.js';
import { allHeroesData } from '../../js/heroes-data.js';
import { heroesExtendedData } from '../../js/heroes-info.js';

test('catalog is a deterministic projection of all canonical heroes and descriptions', () => {
  assert.equal(battleHeroSkillCatalog.length, 89);
  assert.equal(new Set(battleHeroSkillCatalog.map((hero) => hero.id)).size, 89);
  assert.deepEqual(
    battleHeroSkillCatalog.map((hero) => hero.name),
    allHeroesData.map((hero) => hero.name)
  );
  assert.equal(battleHeroSkills.length, 208);
  assert.equal(BATTLE_HERO_SKILL_COVERAGE.rosterHeroes, 89);
  assert.equal(BATTLE_HERO_SKILL_COVERAGE.extendedHeroes, 68);
  assert.equal(BATTLE_HERO_SKILL_COVERAGE.descriptions, 208);
  assert.equal(
    Object.values(BATTLE_HERO_SKILL_COVERAGE.classifications).reduce(
      (total, count) => total + count,
      0
    ),
    208
  );
  assert.deepEqual(BATTLE_HERO_SKILL_COVERAGE.missingExtendedHeroes, MISSING_EXTENDED_HEROES);
  assert.deepEqual(
    MISSING_EXTENDED_HEROES,
    allHeroesData.map((hero) => hero.name).filter((name) => !heroesExtendedData[name])
  );
  assert.equal(BATTLE_HERO_SKILL_ASSUMPTIONS.failClosed, true);
});

test('catalog preserves canonical descriptions and structured range/target evidence', () => {
  for (const [heroName, extended] of Object.entries(heroesExtendedData)) {
    for (const sourceSkill of extended.skills) {
      const skill = getBattleHeroSkill(heroName, sourceSkill.id);
      assert.ok(skill, `${heroName}:${sourceSkill.id}`);
      assert.equal(skill.description, sourceSkill.desc);
      assert.equal(skill.range, sourceSkill.range);
      assert.equal(skill.target.raw, sourceSkill.target);
      assert.equal(skill.id, `${heroName}:${sourceSkill.id}`);
    }
  }
});

test('Mary Tudor retains base and conditional damage as separate clauses', () => {
  const skill = getBattleHeroSkill('Mary Tudor', 2);
  assert.equal(skill.type.value, 'combat');
  assert.equal(skill.projection.activation, 'triggered');
  assert.equal(skill.target.side, 'enemy');
  assert.equal(skill.target.count, 1);
  assert.equal(skill.range, 5);
  assert.deepEqual(
    skill.projection.damage.map(({ ratePct }) => ratePct),
    [325, 195]
  );
  assert.equal(skill.projection.damage[0].conditional, false);
  assert.equal(skill.projection.damage[1].conditional, true);
});

test('Cicero keeps trigger chance separate from guaranteed evasion chance', () => {
  const skill = getBattleHeroSkill('Cicero', 8);
  assert.deepEqual(
    skill.projection.percentages.map(({ value, kind }) => [value, kind]),
    [
      [50, 'chance'],
      [100, 'chance'],
    ]
  );
  assert.match(skill.projection.percentages[1].context, /evasion/iu);
  assert.equal(skill.projection.activation, 'triggered');
});

test('Caesar retains multi-clause chance and additive stat evidence', () => {
  const skill = getBattleHeroSkill('Caesar', 2);
  const percentageValues = skill.projection.percentages.map(({ value }) => value);
  assert.deepEqual(percentageValues, [40, 200, 60, 20, 20]);
  assert.ok(
    skill.projection.statModifiers.some(
      (modifier) => modifier.stat === 'might' && modifier.amountPct === 200
    )
  );
  assert.ok(
    skill.projection.statModifiers.some(
      (modifier) => modifier.stat === 'resistance' && modifier.amountPct === 200
    )
  );
  assert.ok(
    skill.projection.statModifiers.some(
      (modifier) => modifier.stat === 'damage' && modifier.amountPct === 60
    )
  );
});

test('Immortal range and normalization are preserved without target inference', () => {
  const immortal = getBattleHeroSkillCatalogEntry('Immortal');
  assert.deepEqual(immortal.placement.rows, ['back']);
  assert.equal(immortal.troopType.value, 'cavalry');
  assert.equal(getBattleHeroSkill('Immortal', 2).range, 5);
  assert.deepEqual(normalizeHeroSkillTarget('unknown'), {
    raw: 'unknown',
    count: null,
    side: null,
    selection: null,
    known: false,
  });
});
