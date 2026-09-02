import { test } from 'node:test';
import assert from 'node:assert/strict';

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { allHeroesData } from '../../js/heroes-data.js';

// R2 guard. Before Lane 2's roster landing commit, no hero-referencing codex
// row may reference a name outside the current js/heroes-data.js roster, and
// the excluded-noncanonical queue must carry the L96 names of the 11 X10/X12
// heroes present in the L96 archive. After the roster lands and the follow-up
// codex commit adds the rows, this test is inverted: the future-roster entries
// leave the queue and appear as rows.

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const codexDir = resolve(repoRoot, 'database', 'codex');

const canonicalNames = new Set(allHeroesData.map((hero) => hero.name));

function parseRows(file) {
  const lines = readFileSync(resolve(codexDir, file), 'utf8').split(/\r?\n/);
  const rows = [];
  let header = null;
  for (const line of lines) {
    if (!line.trim() || line.startsWith('#')) continue;
    if (header === null) {
      header = line.split('|').map((name) => name.trim());
      continue;
    }
    const fields = line.split('|');
    const row = {};
    header.forEach((name, index) => {
      row[name] = index < fields.length ? fields[index].trim() : '';
    });
    rows.push(row);
  }
  return rows;
}

test('no heroes-codex / hero-versions / name-aliases row references a non-canonical name', () => {
  for (const row of parseRows('heroes-codex.txt')) {
    assert.ok(canonicalNames.has(row.heroName), `heroes-codex: ${row.heroName}`);
  }
  for (const row of parseRows('hero-versions.txt')) {
    assert.ok(canonicalNames.has(row.heroName), `hero-versions: ${row.heroName}`);
  }
  for (const row of parseRows('name-aliases.txt')) {
    assert.ok(canonicalNames.has(row.canonicalName), `name-aliases: ${row.canonicalName}`);
  }
});

test('the exclusion queue carries every L96 X10/X12 name with a future-roster reason', () => {
  const expectedFutureRoster = {
    Hellfire: 'Hellfire (X10)',
    Healer: 'Healer (X10)',
    'Poison Master': 'Poison Master (X12)',
    Arslam: 'Arslan (X12)',
    Farrah: 'Farah (X12)',
    'El Cid': 'El Cid (X12)',
    Pepin: 'Pepin (X12)',
    Belisarius: 'Belisarius (X12)',
  };
  const excluded = parseRows('excluded-noncanonical.txt');
  const byName = new Map(excluded.map((row) => [row.l96Name, row]));
  for (const [l96Name, hint] of Object.entries(expectedFutureRoster)) {
    assert.ok(byName.has(l96Name), `exclusion queue missing ${l96Name}`);
    assert.equal(byName.get(l96Name).reason, 'future-roster');
    assert.equal(byName.get(l96Name).canonicalHint, hint);
  }
});

test('the exclusion queue has no duplicate names', () => {
  const rows = parseRows('excluded-noncanonical.txt');
  const names = rows.map((row) => row.l96Name);
  assert.equal(new Set(names).size, names.length);
});

test('ambiguous names stay excluded with a do-not-guess reason', () => {
  const excluded = parseRows('excluded-noncanonical.txt');
  const sonOfRagnar = excluded.find((row) => row.l96Name === 'Son of Ragnar');
  assert.ok(sonOfRagnar, 'Son of Ragnar must be excluded');
  assert.equal(sonOfRagnar.reason, 'ambiguous-no-guess');
});
