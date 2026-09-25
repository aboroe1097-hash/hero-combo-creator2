import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { COMBOS_PLAN_DOC_PATH, COMBOS_PLAN_KEYS } from '../../js/combos-live.js';

const rules = readFileSync('firestore.rules', 'utf8');

function rulesBlock(pattern, label) {
  const match = rules.match(pattern);
  assert.ok(match, `Missing Firestore rules block: ${label}`);
  return match[0];
}

function listIn(block, call) {
  const match = block.match(new RegExp(`${call}\\(\\[([\\s\\S]*?)\\]\\)`));
  assert.ok(match, `Missing ${call} list`);
  return [...match[1].matchAll(/'([^']*)'/g)].map((m) => m[1]);
}

test('the live Combos ranking is readable by any visitor and written by a superadmin only', () => {
  assert.equal(COMBOS_PLAN_DOC_PATH, 'combos_plan/current');
  const block = rulesBlock(
    /match \/combos_plan\/current \{[\s\S]*?\n {4}\}/,
    'combos_plan/current'
  );
  // A direct document get is public, while list remains denied.
  assert.match(block, /allow get: if true;/);
  assert.match(block, /allow list: if false;/);
  assert.match(block, /allow create, update: if isSuperAdmin\(\) && validCombosPlan\(\);/);
  assert.match(block, /allow delete: if false;/);
  assert.doesNotMatch(block, /isAdmin\(\)/);
  assert.doesNotMatch(rules, /match \/combos_plan\/\{/, 'no wildcard opens the collection');
});

test('the validator pins the exact keys, the size, the count, the stamps and the first entry', () => {
  const validator = rulesBlock(
    /function validCombosPlan\(\) \{[\s\S]*?\n {4}\}/,
    'validCombosPlan'
  );
  assert.deepEqual(listIn(validator, 'hasOnly'), [...COMBOS_PLAN_KEYS]);
  assert.deepEqual(listIn(validator, 'hasAll'), [...COMBOS_PLAN_KEYS]);
  assert.match(validator, /data\.entries is list/);
  assert.match(validator, /data\.entries\.size\(\) <= 600/);
  assert.match(validator, /data\.count is int/);
  assert.match(validator, /data\.count == data\.entries\.size\(\)/);
  assert.match(validator, /data\.useShipped is bool/);
  assert.match(validator, /data\.useShipped \|\| data\.entries\.size\(\) > 0/);
  assert.match(validator, /validCombosPlanEntry\(data\.entries\[0\]\)/);
  assert.match(validator, /data\.updatedAt == request\.time/);
  assert.match(validator, /data\.updatedBy == request\.auth\.uid/);

  const entry = rulesBlock(
    /function validCombosPlanEntry\(entry\) \{[\s\S]*?\n {4}\}/,
    'validCombosPlanEntry'
  );
  assert.deepEqual(listIn(entry, 'hasOnly'), ['heroes', 'skin', 'note']);
  assert.match(entry, /entry\.heroes\.size\(\) == 3/);
  for (const i of [0, 1, 2]) assert.match(entry, new RegExp(`entry\\.heroes\\[${i}\\] is string`));
  assert.match(entry, /entry\.skin\.matches\('\^\[123\]\{3\}\$'\)/);
  assert.match(entry, /entry\.note\.size\(\) <= 200/);
});

test('the emulator script covers reads, the superadmin gate and the validator', () => {
  const script = readFileSync('scripts/rules-emulator/combos-plan.mjs', 'utf8');
  for (const name of [
    'anonymous visitor reads',
    'signed-out visitor reads',
    'admin cannot publish',
    'superadmin publishes',
    'extra key refused',
    'count mismatch refused',
    'bad first entry refused',
    'client timestamp refused',
    'someone else as updatedBy refused',
    'useShipped with no entries',
    'empty list without useShipped refused',
    'delete refused',
  ])
    assert.ok(script.includes(`'${name}'`), `missing emulator case: ${name}`);
});
