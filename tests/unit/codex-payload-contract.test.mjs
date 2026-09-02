import { test } from 'node:test';
import assert from 'node:assert/strict';

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';

import { VERIFICATION_STATUSES } from '../../js/codex-provenance.js';
import { allHeroesData } from '../../js/heroes-data.js';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const payloadPath = resolve(repoRoot, 'js', 'codex-payload.json');
const envelope = JSON.parse(readFileSync(payloadPath, 'utf8'));
const gzipBytes = Math.floor((envelope.payload.length * 3) / 4);
const payload = JSON.parse(
  gunzipSync(Buffer.from(envelope.payload, 'base64')).toString('utf8')
);
const rawBytes = Buffer.byteLength(JSON.stringify(payload), 'utf8');

const canonicalNames = new Set(allHeroesData.map((hero) => hero.name));

test('payload decodes under the ratified budget (800 KiB raw / 80 KiB gzip)', () => {
  assert.ok(rawBytes <= 819200, `raw ${rawBytes} exceeds 819200`);
  assert.ok(gzipBytes <= 81920, `gzip ${gzipBytes} exceeds 81920`);
});

test('every record in every dataset carries a complete provenance object', () => {
  const fields = ['source', 'credit', 'captureDate', 'gameVersionScope', 'verificationStatus'];
  for (const [datasetId, records] of Object.entries(payload.datasets)) {
    for (const record of records) {
      assert.ok(record.provenance, `${datasetId}: missing provenance`);
      for (const field of fields) {
        assert.ok(
          record.provenance[field],
          `${datasetId}: provenance.${field} empty`
        );
      }
      assert.ok(
        VERIFICATION_STATUSES.includes(record.provenance.verificationStatus),
        `${datasetId}: invalid verificationStatus ${record.provenance.verificationStatus}`
      );
    }
  }
});

test('the decoded payload contains no http(s):// URLs anywhere (text and numbers only)', () => {
  assert.ok(!/https?:\/\//i.test(JSON.stringify(payload)));
});

test('quarantine is empty for the landed datasets', () => {
  assert.deepEqual(payload.quarantine, []);
});

test('builtAt is RFC3339', () => {
  assert.ok(!Number.isNaN(Date.parse(payload.builtAt)), `builtAt not parseable: ${payload.builtAt}`);
});

test('X12 research tree totals match the in-repo source package', () => {
  const byTree = new Map();
  for (const record of payload.datasets['research-costs']) {
    if (record.season !== 'X12') continue;
    byTree.set(record.treeName, (byTree.get(record.treeName) || 0) + record.totalMedals);
  }
  assert.equal(byTree.get('Melee Legion - Defense'), 4998500);
  assert.equal(byTree.get('Melee Legion - Charge'), 4763500);
});

test('prerequisite lists are resolved node ids within the same tree - never raw positions', () => {
  const nodeIdsByTree = new Map();
  for (const record of payload.datasets['research-costs']) {
    if (!nodeIdsByTree.has(record.treeName)) nodeIdsByTree.set(record.treeName, new Set());
    nodeIdsByTree.get(record.treeName).add(record.nodeId);
  }
  for (const record of payload.datasets['research-costs']) {
    const ids = nodeIdsByTree.get(record.treeName);
    assert.ok(ids.has(record.nodeId));
    if (record.requirements) {
      assert.ok(Array.isArray(record.requirements));
      for (const nodeId of record.requirements) {
        assert.ok(ids.has(nodeId), `${record.nodeId} requirement '${nodeId}' not in tree`);
        assert.ok(!/^\d+;\d+$/.test(nodeId), `raw position leaked: ${nodeId}`);
      }
      assert.ok(!record.requirementGroups, `${record.nodeId} carries both requirements and requirementGroups`);
    }
    if (record.requirementGroups) {
      assert.ok(Array.isArray(record.requirementGroups));
      for (const group of record.requirementGroups) {
        assert.ok(Array.isArray(group) && group.length > 0);
        for (const nodeId of group) {
          assert.ok(ids.has(nodeId), `${record.nodeId} group member '${nodeId}' not in tree`);
          assert.ok(!/^\d+;\d+$/.test(nodeId), `raw position leaked: ${nodeId}`);
        }
      }
    }
  }
});

test('every research node id is unique within its tree', () => {
  const seen = new Map();
  for (const record of payload.datasets['research-costs']) {
    const key = `${record.treeName}:${record.nodeId}`;
    assert.ok(!seen.has(key), `duplicate node id ${key}`);
    seen.set(key, true);
  }
});

test('hero references in live hero datasets are canonical', () => {
  for (const record of payload.datasets['heroes-codex']) {
    assert.ok(canonicalNames.has(record.heroName), `heroes-codex: ${record.heroName}`);
    assert.ok(['', 'standard', 'paid', 'royal'].includes(record.access), `access enum: ${record.heroName}`);
  }
  for (const record of payload.datasets['hero-versions']) {
    assert.ok(canonicalNames.has(record.heroName), `hero-versions: ${record.heroName}`);
  }
});

test('pending datasets ship zero rows and stay hidden-ready', () => {
  for (const entry of payload.catalog) {
    if (entry.status === 'pending') {
      assert.equal(entry.recordCount, 0, `${entry.id} pending dataset has rows`);
    }
  }
});
