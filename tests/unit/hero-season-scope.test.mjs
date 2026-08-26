import test from 'node:test';
import assert from 'node:assert/strict';

import { allHeroesData } from '../../js/heroes-data.js';

const EXPECTED_X8_CATCHUP_HEROES = [
  ['Bjorn', 'X4'],
  ['Skanda', 'X4'],
  ['Liberator', 'X5'],
  ['Ashen Verdict', 'X5'],
  ['Warden', 'X6'],
  ['Warhammer', 'X6'],
  ['Eidolon', 'X7'],
  ['Scarlet Reaver', 'X7'],
  ['Rainforest Ranger', 'X8'],
  ['Fortuneteller', 'X8'],
  ['Ragnar', 'X8'],
  ['Cyrus', 'SP'],
];

const FUTURE_HEROES = [
  'Achilles',
  'Al-Hawra',
  'Alberich',
  'Arslan',
  'Belisarius',
  'Darius',
  'Don Quixote',
  'El Cid',
  'Eselfred',
  'Farah',
  'Frederick I',
  'Galahad',
  'Geraint',
  'Gustav',
  'Harald',
  'Hasdrubal',
  'Healer',
  'Hector',
  'Hellfire',
  'Henry V',
  'Henry II',
  'Julian',
  'La Hire',
  'Lagertha',
  'Lilith',
  'Nevsky',
  'Nicolas Flamel',
  'Oliver',
  'Penthesilea',
  'Percival',
  'Poison Master',
  'Robin Hood',
  'Roland',
  'Sundiata',
  'Tura Cartel',
  'Vikram',
  'Zhao Yun',
  'Zhuge Liang',
];

test('hero roster exposes only the intentional X8 catch-up wave', () => {
  assert.deepEqual(
    allHeroesData
      .filter(({ season }) => season === 'X8')
      .map(({ name, releaseSeason }) => [name, releaseSeason]),
    EXPECTED_X8_CATCHUP_HEROES
  );
});

test('Cyrus keeps its SP release metadata and appears once in the hero data', () => {
  const cyrusEntries = allHeroesData.filter(({ name }) => name === 'Cyrus');

  assert.equal(cyrusEntries.length, 1);
  assert.equal(cyrusEntries[0]?.releaseSeason, 'SP');
});

test('future hero batch stays out of the active roster until its seasons are supported', () => {
  const activeNames = new Set(allHeroesData.map(({ name }) => name));
  assert.deepEqual(
    FUTURE_HEROES.filter((name) => activeNames.has(name)),
    []
  );
});
