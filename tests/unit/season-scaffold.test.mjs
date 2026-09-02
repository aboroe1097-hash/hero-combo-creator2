// tests/unit/season-scaffold.test.mjs
// Guards the X10/X12 season scaffolding: canonical season order, pill colors,
// the POPULATED_HERO_SEASONS derivation (all-selected math must never count an
// empty season), and the seasonX10/seasonX12 i18n coverage.
//
// Stage 2 of the roster landing chain inverts the two emptiness tests once the
// X10/X12 roster lands. A TECH_SEASON_ORDER assertion (ends X12, no X10) lands
// in Stage 4 together with the tech-db X12 import.
//
// js/state.js touches document at module scope, so the DOM stub below is
// installed before the module is imported (same pattern as
// eden-season-picker.test.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';

import { seasonColors, TechseasonColors } from '../../js/constants.js';
import { allHeroesData } from '../../js/heroes-data.js';
import ar from '../../js/i18n/ar.js';
import de from '../../js/i18n/de.js';
import en from '../../js/i18n/en.js';
import es from '../../js/i18n/es.js';
import fr from '../../js/i18n/fr.js';
import id from '../../js/i18n/id.js';
import it from '../../js/i18n/it.js';
import kr from '../../js/i18n/kr.js';
import pt from '../../js/i18n/pt.js';
import ru from '../../js/i18n/ru.js';
import tr from '../../js/i18n/tr.js';
import zh from '../../js/i18n/zh.js';

const FULL_LOCALE_PACKS = { ar, de, en, es, fr, id, it, kr, pt, ru, tr, zh };

globalThis.document = {
  getElementById: () => null,
};
globalThis.localStorage = {
  getItem: () => null,
  setItem: () => {},
};

const { HERO_ATLAS_ALL_SEASONS, POPULATED_HERO_SEASONS, TECH_SEASON_ORDER } =
  await import('../../js/state.js');

test('HERO_ATLAS_ALL_SEASONS keeps canonical order and appends X10 and X12', () => {
  assert.deepEqual(
    HERO_ATLAS_ALL_SEASONS.slice(0, 8),
    ['S0', 'S1', 'S2', 'S3', 'S4', 'X1', 'X2', 'X8'],
    'existing season indexes 0-7 must not shift'
  );
  assert.deepEqual(HERO_ATLAS_ALL_SEASONS.slice(-2), ['X10', 'X12']);
  assert.equal(new Set(HERO_ATLAS_ALL_SEASONS).size, HERO_ATLAS_ALL_SEASONS.length);
});

test('season pill colors carry X10 and X12 in both color maps', () => {
  assert.equal(seasonColors.X10, '#f472b6');
  assert.equal(seasonColors.X12, '#a3e635');
  assert.equal(TechseasonColors.X10, '#f472b6');
  assert.equal(TechseasonColors.X12, '#a3e635');
});

test('POPULATED_HERO_SEASONS derives from the canonical order', () => {
  assert.ok(
    POPULATED_HERO_SEASONS.every((season, index) => {
      const canonicalIndex = HERO_ATLAS_ALL_SEASONS.indexOf(season);
      if (canonicalIndex < 0) return false;
      if (index === 0) return true;
      return canonicalIndex > HERO_ATLAS_ALL_SEASONS.indexOf(POPULATED_HERO_SEASONS[index - 1]);
    }),
    'populated seasons stay a subset of the canonical list, order-preserving'
  );
});

test('X10 and X12 carry no heroes yet (invert in Stage 2)', () => {
  assert.ok(!POPULATED_HERO_SEASONS.includes('X10'), 'X10 must stay empty until its roster lands');
  assert.ok(!POPULATED_HERO_SEASONS.includes('X12'), 'X12 must stay empty until its roster lands');
});

test('the all-selected math covers exactly the populated seasons (invert in Stage 2)', () => {
  assert.equal(POPULATED_HERO_SEASONS.length, 8);
  const emptySeasons = HERO_ATLAS_ALL_SEASONS.filter(
    (season) => !POPULATED_HERO_SEASONS.includes(season)
  );
  for (const season of emptySeasons) {
    assert.equal(
      allHeroesData.filter((hero) => hero.season === season).length,
      0,
      `${season} is excluded because no hero carries it`
    );
  }
});

test('seasonX10 and seasonX12 ship in all twelve full locale packs', () => {
  for (const [locale, pack] of Object.entries(FULL_LOCALE_PACKS)) {
    assert.equal(pack.seasonX10, 'X10', `${locale} seasonX10`);
    assert.equal(pack.seasonX12, 'X12', `${locale} seasonX12`);
  }
  // hr.js is the stub pack by design: the shared loader fills specialist game
  // terminology from canonical English, so the two keys must NOT be there.
  assert.ok(!('hr' in FULL_LOCALE_PACKS), 'the hr stub is not part of the full-pack coverage');
  // The season ladder still tops out at X8 until the tech-db X12 import lands.
  assert.deepEqual(TECH_SEASON_ORDER.slice(-1), ['X8']);
});
