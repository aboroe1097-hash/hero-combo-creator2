import { test } from 'node:test';
import assert from 'node:assert/strict';

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const envelope = JSON.parse(
  readFileSync(resolve(repoRoot, 'js', 'codex-payload.json'), 'utf8')
);
const payload = JSON.parse(
  gunzipSync(Buffer.from(envelope.payload, 'base64')).toString('utf8')
);

const versions = payload.datasets['hero-versions'] || [];

test('version rows chain via previousVersionId', () => {
  const byId = new Map(versions.map((version) => [version.heroVersionId, version]));
  for (const version of versions) {
    if (!version.previousVersionId) continue;
    assert.ok(byId.has(version.previousVersionId), `${version.heroVersionId} backlink missing`);
  }
});

test('at most one version per hero has an open effectiveTo', () => {
  const open = new Map();
  for (const version of versions) {
    if (version.effectiveTo) continue;
    assert.ok(!open.has(version.heroName), `${version.heroName} has multiple open versions`);
    open.set(version.heroName, version.heroVersionId);
  }
});

test('currentVersions index matches the open-ended version rows', () => {
  const open = new Map();
  for (const version of versions) {
    if (!version.effectiveTo) open.set(version.heroName, version.heroVersionId);
  }
  assert.deepEqual(payload.currentVersions, Object.fromEntries(open));
});

test('every version row carries a full provenance object', () => {
  for (const version of versions) {
    assert.ok(version.provenance, `${version.heroVersionId}: missing provenance`);
    assert.equal(typeof version.heroName, 'string');
    assert.notEqual(version.heroName, '');
  }
});
