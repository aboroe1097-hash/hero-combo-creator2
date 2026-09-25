import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  MAX_SHARED_ASSIGNED,
  MAX_SHARED_OBJECTIVES,
  sharedObjectiveKeys,
} from '../../js/eden-operations-model.js';

// Contract tests for the shared Ops Lab counters. The alliance's staffing
// numbers only stay trustworthy if nobody can write nonsense and nobody outside
// the alliance reads them, and a browser cannot prove either — Firestore
// evaluates these expressions, so the assertions below pin them word for word.

const rules = readFileSync('firestore.rules', 'utf8');

function rulesBlock(source, pattern) {
  const match = source.match(pattern);
  assert.ok(match, `missing rules block: ${pattern}`);
  return match[0];
}

test('the shared counters are member-readable and admin-writable', () => {
  const block = rulesBlock(rules, /match \/eden_operations\/current \{[\s\S]*?\n {4}\}/);
  assert.match(block, /allow read: if signedIn\(\);/);
  assert.match(block, /allow create, update: if isAdmin\(\) && validEdenOperationsCounts\(\);/);
  assert.match(block, /allow delete: if false;/);
  // A public read and a write without the admin claim are the two ways this
  // could go wrong, so neither expression may appear.
  assert.doesNotMatch(block, /allow read: if true/);
  assert.doesNotMatch(block, /allow (create|update|write): if (?!isAdmin\(\))/);
});

test('the counts validator pins the exact keys, the bounds and the map size', () => {
  const validator = rulesBlock(rules, /function validEdenOperationsCounts\(\) \{[\s\S]*?\n {4}\}/);
  assert.match(validator, /data\.keys\(\)\.hasOnly\(\['counts', 'updatedAt', 'updatedBy'\]\)/);
  assert.match(validator, /data\.updatedAt == request\.time/);
  assert.match(validator, /data\.updatedBy is string/);
  assert.match(validator, /counts is map/);
  assert.match(validator, new RegExp(`counts\\.size\\(\\) <= ${MAX_SHARED_OBJECTIVES}`));
  assert.match(validator, /edenOperationsEntry\(counts\.get\('/);

  const entry = rulesBlock(rules, /function edenOperationsEntry\(value\) \{[\s\S]*?\n {4}\}/);
  assert.match(entry, /value\.keys\(\)\.hasOnly\(\['attackers', 'support'\]\)/);
  assert.match(entry, new RegExp(`value\\.attackers <= ${MAX_SHARED_ASSIGNED}`));
  assert.match(entry, new RegExp(`value\\.support <= ${MAX_SHARED_ASSIGNED}`));
  assert.match(entry, /value\.attackers >= 0/);
  assert.match(entry, /value\.support >= 0/);
});

test('every objective the app can write is allowed by the rules, and nothing else', () => {
  const validator = rulesBlock(rules, /function validEdenOperationsCounts\(\) \{[\s\S]*?\n {4}\}/);
  const allowlist = /counts\.keys\(\)\.hasOnly\(\[([\s\S]*?)\]\)/.exec(validator);
  assert.ok(allowlist, 'the key allowlist is present');
  const allowed = [...allowlist[1].matchAll(/'([^']+)'/g)].map((match) => match[1]);
  assert.deepEqual(allowed, sharedObjectiveKeys(), 'the rules mirror EDEN_STRUCTURES');
  // Each allowed key is also shape-checked, not merely allowed by name.
  assert.equal(
    (validator.match(/edenOperationsEntry\(counts\.get\(/g) || []).length,
    sharedObjectiveKeys().length
  );
});
