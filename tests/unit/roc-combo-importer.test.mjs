import test from 'node:test';
import assert from 'node:assert/strict';

import {
  auditComboDataset,
  convertSkinFlagsToCode,
  createDuplicateIndex,
  createHeroResolver,
  normalizeExternalCombo,
  normalizeHeroKey,
  normalizeImportSeason,
} from '../../scripts/roc-combo-importer.mjs';

const fixtureHeroes = [
  { name: 'King Arthur' },
  { name: 'Ramses II' },
  { name: 'Bleeding Steed' },
  { name: 'Rozen Blade' },
  { name: 'Jade Eagle' },
  { name: 'Theodora' },
  { name: 'Cleopatra VII' },
  { name: 'Alexander' },
  { name: 'Beowulf' },
  { name: 'Charles the Great' },
  { name: 'Rokuboshuten' },
];

test('external hero names resolve through normalized names and aliases', () => {
  const resolveHero = createHeroResolver(fixtureHeroes);

  assert.equal(resolveHero('ARTHUR'), 'King Arthur');
  assert.equal(resolveHero('RAMSES'), 'Ramses II');
  assert.equal(resolveHero('STEED'), 'Bleeding Steed');
  assert.equal(resolveHero('JADEEAGLE'), 'Jade Eagle');
  assert.equal(resolveHero('CHARLES'), 'Charles the Great');
  assert.equal(resolveHero('ROKU'), 'Rokuboshuten');
  assert.equal(resolveHero('Cleopatra VII'), 'Cleopatra VII');
  assert.equal(resolveHero('MISSING HERO'), null);
});

test('hero key normalization removes punctuation and casing differences', () => {
  assert.equal(normalizeHeroKey("Jeanne d'Arc"), 'JEANNEDARC');
  assert.equal(normalizeHeroKey('Al-Fatih'), 'ALFATIH');
  assert.equal(normalizeHeroKey(' Jade Eagle '), 'JADEEAGLE');
});

test('season normalization keeps only S0-X8 supported buckets', () => {
  assert.equal(normalizeImportSeason('S04'), 'S4');
  assert.equal(normalizeImportSeason('X01'), 'X1');
  assert.equal(normalizeImportSeason('X02'), 'X2');
  assert.equal(normalizeImportSeason('X03'), 'X8');
  assert.equal(normalizeImportSeason('X08'), 'X8');
  assert.equal(normalizeImportSeason('X09'), null);
  assert.equal(normalizeImportSeason('X22'), null);
});

test('skin flags become recommended-only slot codes', () => {
  assert.equal(convertSkinFlagsToCode([true, false, true]), '202');
  assert.equal(convertSkinFlagsToCode([true, true, true]), '222');
  assert.equal(convertSkinFlagsToCode([false, false, false]), '');
  assert.equal(convertSkinFlagsToCode(null), '');
});

test('external combo normalization accepts fully mapped S0-X8 records', () => {
  const result = normalizeExternalCombo(
    {
      tier: 'S',
      score: 342.1,
      troop: 'FOOTMEN',
      h: ['ARTHUR', 'CLEOPATRA VII', 'THEDORA'],
      season: 'X08',
      orig_rank: '7',
      has_skin: [true, false, true],
      purpose: 'attack',
    },
    {
      source: 'skin',
      resolveHero: createHeroResolver(fixtureHeroes, {
        ARTHUR: 'King Arthur',
        THEDORA: 'Theodora',
      }),
      duplicateIndex: createDuplicateIndex([
        { heroes: ['King Arthur', 'Cleopatra VII', 'Theodora'] },
      ]),
    }
  );

  assert.equal(result.ok, true);
  assert.deepEqual(result.combo.heroes, ['King Arthur', 'Cleopatra VII', 'Theodora']);
  assert.equal(result.combo.season, 'X8');
  assert.equal(result.combo.skin, '202');
  assert.equal(result.combo.duplicate.exactRank, 1);
});

test('external combo normalization rejects unsupported seasons and unknown heroes', () => {
  const resolveHero = createHeroResolver(fixtureHeroes);

  assert.deepEqual(
    normalizeExternalCombo(
      { h: ['ARTHUR', 'CLEOPATRA VII', 'THEDORA'], season: 'X10' },
      { resolveHero }
    ).reason,
    'unsupportedSeason'
  );

  const unknownResult = normalizeExternalCombo(
    { h: ['ARTHUR', 'CLEOPATRA VII', 'UNKNOWN'], season: 'X01' },
    { resolveHero }
  );

  assert.equal(unknownResult.reason, 'unknownHeroes');
  assert.deepEqual(unknownResult.missingHeroes, ['UNKNOWN']);
});

test('dataset audit reports candidates, skips, missing aliases, and unordered duplicates', () => {
  const audit = auditComboDataset(
    [
      { h: ['ARTHUR', 'CLEOPATRA VII', 'THEDORA'], season: 'X01', score: 10 },
      { h: ['THEDORA', 'CLEOPATRA VII', 'ARTHUR'], season: 'X01', score: 9 },
      { h: ['ARTHUR', 'MISSING', 'THEDORA'], season: 'X01', score: 8 },
      { h: ['ARTHUR', 'CLEOPATRA VII', 'THEDORA'], season: 'X22', score: 7 },
    ],
    {
      source: 'noskin',
      resolveHero: createHeroResolver(fixtureHeroes, {
        ARTHUR: 'King Arthur',
        THEDORA: 'Theodora',
      }),
      duplicateIndex: createDuplicateIndex([
        { heroes: ['King Arthur', 'Cleopatra VII', 'Theodora'] },
      ]),
    }
  );

  assert.equal(audit.candidates.length, 2);
  assert.equal(audit.report.skipped.unknownHeroes, 1);
  assert.equal(audit.report.skipped.unsupportedSeason, 1);
  assert.equal(audit.report.duplicates.exact, 1);
  assert.equal(audit.report.duplicates.sameHeroesDifferentOrder, 1);
  assert.deepEqual(audit.report.missingAliases, [{ name: 'MISSING', count: 1 }]);
});
