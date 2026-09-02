import { test } from 'node:test';
import assert from 'node:assert/strict';

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';

import { allHeroesData } from '../../js/heroes-data.js';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const payloadPath = resolve(repoRoot, 'js', 'codex-payload.json');
const envelope = JSON.parse(readFileSync(payloadPath, 'utf8'));
assert.equal(envelope.encoding, 'gzip-base64');
const payload = JSON.parse(
  gunzipSync(Buffer.from(envelope.payload, 'base64')).toString('utf8')
);

const canonicalNames = new Set(allHeroesData.map((hero) => hero.name));

test('every alias key is a canonical hero name', () => {
  for (const key of Object.keys(payload.aliases)) {
    assert.ok(canonicalNames.has(key), `alias key not canonical: ${key}`);
  }
});

test('every alias entry is well-formed', () => {
  for (const [canonical, entries] of Object.entries(payload.aliases)) {
    assert.ok(Array.isArray(entries));
    for (const entry of entries) {
      assert.equal(typeof entry.alias, 'string');
      assert.notEqual(entry.alias, '');
      assert.equal(typeof entry.externalGame, 'string');
      assert.equal(typeof entry.sourceRef, 'string');
    }
  }
});

test('no alias string maps to two different canonical heroes', () => {
  const aliasToCanonical = new Map();
  for (const [canonical, entries] of Object.entries(payload.aliases)) {
    for (const entry of entries) {
      if (!aliasToCanonical.has(entry.alias)) aliasToCanonical.set(entry.alias, new Set());
      aliasToCanonical.get(entry.alias).add(canonical);
    }
  }
  for (const [alias, canonicals] of aliasToCanonical) {
    assert.equal(canonicals.size, 1, `ambiguous alias '${alias}' resolves to ${[...canonicals]}`);
  }
});

test('every hero reference in every payload record resolves to exactly one canonical name', () => {
  const heroFields = {
    'heroes-codex': ['heroName'],
    'hero-versions': ['heroName'],
    'name-aliases': ['canonicalName'],
    'combo-snapshots': ['heroes'],
  };
  for (const [datasetId, fields] of Object.entries(heroFields)) {
    for (const record of payload.datasets[datasetId] || []) {
      for (const field of fields) {
        if (!record[field]) continue;
        const references = field === 'heroes' ? record[field].split(';') : [record[field]];
        for (const ref of references) {
          assert.ok(canonicalNames.has(ref), `${datasetId} references non-canonical '${ref}'`);
        }
      }
    }
  }
});

test('externalGameAliases can be derived from the payload shape', () => {
  const externalGameAliases = {};
  for (const [canonical, entries] of Object.entries(payload.aliases)) {
    for (const entry of entries) {
      if (entry.externalGame) {
        (externalGameAliases[canonical] = externalGameAliases[canonical] || []).push(entry);
      }
    }
  }
  for (const entries of Object.values(externalGameAliases)) {
    for (const entry of entries) assert.notEqual(entry.externalGame, '');
  }
});

test('quarantine entries are well-formed', () => {
  for (const entry of payload.quarantine) {
    assert.equal(typeof entry.datasetId, 'string');
    assert.equal(typeof entry.ref, 'string');
    assert.ok(['no-canonical-match', 'ambiguous-alias'].includes(entry.reason));
  }
});
