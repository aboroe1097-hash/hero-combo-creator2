import { test } from 'node:test';
import assert from 'node:assert/strict';

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { allHeroesData } from '../../js/heroes-data.js';

// R2 guard (inverted form, post Lane-2 roster landing). The L96 X10/X12 names
// left the exclusion queue and landed as rows in the same commit sequence as
// Lane 2's roster commit. This test now asserts the landed state: no
// future-roster entries remain queued, and the eight L96-sourced X10/X12 names
// are present as rows (canonical names) plus their two spelling aliases.

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

test('the exclusion queue carries no future-roster entries (they landed as rows)', () => {
  const excluded = parseRows('excluded-noncanonical.txt');
  const futureRoster = excluded.filter((row) => row.reason === 'future-roster');
  assert.deepEqual(futureRoster, []);
});

test('the eight L96-sourced X10/X12 names are present as codex rows and aliases', () => {
  const heroes = new Set(parseRows('heroes-codex.txt').map((row) => row.heroName));
  for (const name of [
    'Healer',
    'Hellfire',
    'Poison Master',
    'Arslan',
    'Farah',
    'El Cid',
    'Pepin',
    'Belisarius',
  ]) {
    assert.ok(heroes.has(name), `heroes-codex missing landed ${name}`);
  }
  const aliases = parseRows('name-aliases.txt').map((row) => `${row.canonicalName}|${row.alias}`);
  assert.ok(aliases.includes('Arslan|Arslam'), 'name-aliases missing Arslam -> Arslan');
  assert.ok(aliases.includes('Farah|Farrah'), 'name-aliases missing Farrah -> Farah');
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
