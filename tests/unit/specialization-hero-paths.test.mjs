// tests/unit/specialization-hero-paths.test.mjs
// The paid-hero catalog is hand-written game data, so these tests guard its
// shape and its coverage rather than any single weight.
import test from 'node:test';
import assert from 'node:assert/strict';
import { allHeroesData } from '../../js/heroes-data.js';
import {
  SPECIALIZATION_LEGION_SKILLS,
  SPECIALIZATION_RESEARCH,
} from '../../js/specialization-towers-v2-data.js';
import {
  F2P_PATH_ID,
  HERO_PATH_MODES,
  HERO_PATH_PRESETS,
  HERO_PATH_TROOPS,
  PAID_HERO_NAMES,
  PAID_HERO_TOWER_PROFILES,
  TOWER_SUPPLY_TAGS,
  getPathPreset,
  getPathPresets,
  getPaidHeroProfile,
  paidHeroesForTroop,
  pathDemandFor,
  rankPathPresets,
  suggestedPathId,
  troopForHero,
} from '../../js/specialization-hero-paths.js';
import { SPECIALIZATION_TOWERS_V2_EN } from '../../js/i18n/specialization-towers-v2/index.js';

const PAID_ROSTER = allHeroesData.filter((hero) => hero.State === 'Paid').map((hero) => hero.name);

test('every paid hero in the roster has a tower profile', () => {
  const missing = PAID_ROSTER.filter((name) => !PAID_HERO_TOWER_PROFILES[name]);
  assert.deepEqual(missing, [], 'no paid hero is left without a tower profile');
  assert.equal(PAID_HERO_NAMES.length, PAID_ROSTER.length);
});

test('profiles only reference real supply tags, columns and researches', () => {
  for (const [name, profile] of Object.entries(PAID_HERO_TOWER_PROFILES)) {
    assert.ok([...HERO_PATH_TROOPS, 'all'].includes(profile.troop), `${name} targets a real tower`);
    assert.ok(profile.siegeBias >= -1 && profile.siegeBias <= 1, `${name} siegeBias in range`);
    assert.ok(profile.note.length > 60, `${name} explains itself`);
    assert.ok(profile.keyMechanics.length > 0, `${name} names its mechanics`);
    for (const tag of Object.keys(profile.demand)) {
      assert.ok(TOWER_SUPPLY_TAGS.includes(tag), `${name} demand tag ${tag} exists`);
    }
    for (const columnId of Object.keys(profile.columns)) {
      assert.ok(
        SPECIALIZATION_LEGION_SKILLS[columnId],
        `${name} references real Column ${columnId}`
      );
      const troop = profile.troop === 'all' ? 'archer' : profile.troop;
      assert.ok(
        SPECIALIZATION_LEGION_SKILLS[columnId][troop],
        `${name} Column ${columnId} has a ${troop} Legion Skill`
      );
    }
    for (const researchId of Object.keys(profile.research)) {
      assert.ok(SPECIALIZATION_RESEARCH[researchId], `${name} references real ${researchId}`);
    }
  }
});

test('the paid hero profile matches the roster troop type', () => {
  const expected = { Cavalry: 'cavalry', Archers: 'archer', Footmen: 'footman', All: 'all' };
  for (const hero of allHeroesData.filter((entry) => entry.State === 'Paid')) {
    assert.equal(
      PAID_HERO_TOWER_PROFILES[hero.name].troop,
      expected[hero.Type],
      `${hero.name} profile troop matches its roster type`
    );
    assert.equal(troopForHero(hero.name), expected[hero.Type]);
  }
});

test('every troop has at least two suggested paths, all localizable', () => {
  assert.deepEqual([...HERO_PATH_MODES], ['siege', 'nonSiege']);
  for (const troop of HERO_PATH_TROOPS) {
    const presets = getPathPresets(troop);
    assert.ok(presets.length >= 2, `${troop} has 1-2+ hero paths`);
    for (const preset of presets) {
      assert.ok(preset.heroes.length > 0, `${preset.id} names its heroes`);
      assert.ok(
        SPECIALIZATION_TOWERS_V2_EN[preset.labelKey],
        `${preset.id} label key ${preset.labelKey} exists in the English pack`
      );
      for (const hero of preset.heroes) {
        const profile = getPaidHeroProfile(hero);
        assert.ok(profile, `${preset.id} hero ${hero} is in the catalog`);
        assert.ok(
          profile.troop === troop || profile.troop === 'all',
          `${preset.id} hero ${hero} can drive the ${troop} tower`
        );
      }
    }
  }
  const ids = HERO_PATH_PRESETS.map((preset) => preset.id);
  assert.equal(new Set(ids).size, ids.length, 'preset ids are unique');
  assert.equal(getPathPreset('not-a-path'), null);
});

test('paidHeroesForTroop lists the tower specialists first and all-troop heroes last', () => {
  const archers = paidHeroesForTroop('archer');
  assert.ok(archers.includes('Ramses II') && archers.includes('Boudica'));
  assert.equal(archers.at(-1), 'Cleopatra VII', 'the all-troop hero sorts last');
  for (const troop of HERO_PATH_TROOPS) {
    assert.ok(paidHeroesForTroop(troop).length >= 4, `${troop} offers a real choice of heroes`);
  }
});

test('a roster picks the best-fitting path and falls back to free-to-play', () => {
  assert.equal(suggestedPathId('archer', ['Ramses II', 'Boudica']), 'archer-fatal-blow');
  assert.equal(suggestedPathId('archer', ['Leonidas']), 'archer-resilient');
  assert.equal(suggestedPathId('cavalry', ['Lancelot']), 'cavalry-prep-skip');
  assert.equal(suggestedPathId('cavalry', ['Caesar', 'Octavius']), 'cavalry-stacked-might');
  assert.equal(suggestedPathId('footman', ['King Arthur']), 'footman-shield-wall');
  assert.equal(suggestedPathId('footman', ['Alexander']), 'footman-bleed-shock');
  // Owning an archer hero says nothing about the cavalry tower.
  assert.equal(suggestedPathId('cavalry', ['Boudica']), F2P_PATH_ID);
  assert.equal(suggestedPathId('archer', []), F2P_PATH_ID);
});

test('rankPathPresets reports the owned share of each path', () => {
  const ranked = rankPathPresets('archer', ['Ramses II', 'Beowulf']);
  assert.equal(ranked[0].preset.id, 'archer-fatal-blow');
  assert.equal(ranked[0].ownedCount, 2);
  assert.equal(ranked[0].total, 3);
  assert.deepEqual([...ranked[0].owned], ['Ramses II', 'Beowulf']);
});

test('path demand sums the owned heroes and folds in the preset emphasis', () => {
  const solo = pathDemandFor('archer', ['Ramses II'], 'archer-fatal-blow');
  const pair = pathDemandFor('archer', ['Ramses II', 'Boudica'], 'archer-fatal-blow');
  assert.ok(pair.demand.skillDamage > solo.demand.skillDamage, 'a second hero adds demand');
  assert.equal(pair.heroCount, 2);
  assert.ok(pair.columns[2] > 0, 'Column II Sniper Archer is demanded');
  assert.equal(pair.notes.length, 2);

  // Off-troop paid heroes contribute nothing; all-troop heroes contribute part.
  const offTroop = pathDemandFor('cavalry', ['Boudica'], F2P_PATH_ID);
  assert.equal(offTroop.heroCount, 0);
  assert.deepEqual(offTroop.demand, {});
  const allTroop = pathDemandFor('cavalry', ['Cleopatra VII'], F2P_PATH_ID);
  assert.equal(allTroop.heroCount, 1);
  assert.ok(allTroop.demand.skillDamage > 0);
});

test('siege bias averages rather than accumulating with roster size', () => {
  const one = pathDemandFor('cavalry', ["Jeanne d'Arc"], F2P_PATH_ID);
  const two = pathDemandFor('cavalry', ["Jeanne d'Arc", 'Lancelot'], F2P_PATH_ID);
  assert.ok(one.siegeBias > 0 && two.siegeBias > 0);
  assert.ok(two.siegeBias <= one.siegeBias, 'a second rally hero does not inflate the bias');
  assert.equal(pathDemandFor('archer', [], F2P_PATH_ID).siegeBias, 0);
});
