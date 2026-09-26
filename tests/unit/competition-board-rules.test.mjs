import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const rules = readFileSync('firestore.rules', 'utf8');

test('legacy published boards and manual match decisions have no client access', () => {
  assert.doesNotMatch(rules, /match \/boh_allstar_competition\/board \{/);
  assert.doesNotMatch(rules, /match \/boh_allstar_competition\/matches \{/);
});

test('no wildcard opens the rest of boh_allstar_competition', () => {
  assert.doesNotMatch(rules, /match \/boh_allstar_competition\/\{/);
});
