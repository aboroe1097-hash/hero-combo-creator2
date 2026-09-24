import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const rules = readFileSync('firestore.rules', 'utf8');

function rulesBlock(pattern, label) {
  const match = rules.match(pattern);
  assert.ok(match, `Missing Firestore rules block: ${label}`);
  return match[0];
}

function hasOnlyList(block) {
  const listMatch = block.match(/hasOnly\(\[([\s\S]*?)\]\)/);
  assert.ok(listMatch, 'Missing hasOnly allowlist');
  return [...listMatch[1].matchAll(/'([^']*)'/g)].map((match) => match[1]);
}

test('the Competition #12 growth board is public to read and superadmin-written', () => {
  const board = rulesBlock(
    /match \/boh_allstar_competition\/board \{[\s\S]*?\n {4}\}/,
    'boh_allstar_competition/board'
  );
  assert.match(board, /allow get: if signedIn\(\)/);
  assert.match(board, /allow list: if false/);
  assert.match(board, /allow create, update: if isSuperAdmin\(\)/);
  assert.match(board, /allow delete: if false/);
  assert.deepEqual(hasOnlyList(board), [
    'schemaVersion',
    'seasonId',
    'rows',
    'winners',
    'notRanked',
    'publishedAt',
    'updatedAt',
    'updatedBy',
  ]);
  assert.match(board, /rows is list/);
  assert.match(board, /rows\.size\(\) <= 200/);
  assert.match(board, /winners is list/);
  assert.match(board, /winners\.size\(\) <= 20/);
  assert.match(board, /updatedAt == request\.time/);
  assert.match(board, /updatedBy == request\.auth\.uid/);
  assert.doesNotMatch(board, /hasActiveAllStarBohGrant|isAdmin\(\)/);
  // It sits right after the schedule block it belongs to.
  const schedule = rules.indexOf('match /boh_allstar_competition/current {');
  const boardAt = rules.indexOf('match /boh_allstar_competition/board {');
  assert.ok(schedule > 0 && boardAt > schedule);
  assert.equal(rules.slice(schedule, boardAt).match(/\n {4}match /g), null);
});

test('baseline match decisions are admin-read and superadmin-written only', () => {
  const matches = rulesBlock(
    /match \/boh_allstar_competition\/matches \{[\s\S]*?\n {4}\}/,
    'boh_allstar_competition/matches'
  );
  assert.match(matches, /allow get: if isAdmin\(\)/);
  assert.match(matches, /allow list: if false/);
  assert.match(matches, /allow create, update: if isSuperAdmin\(\)/);
  assert.match(matches, /allow delete: if false/);
  assert.deepEqual(hasOnlyList(matches), [
    'schemaVersion',
    'seasonId',
    'decisions',
    'updatedAt',
    'updatedBy',
  ]);
  assert.match(matches, /decisions is map/);
  assert.match(matches, /decisions\.size\(\) <= 200/);
  assert.match(matches, /updatedBy == request\.auth\.uid/);
  assert.doesNotMatch(matches, /signedIn\(\)/);
});

test('no wildcard opens the rest of boh_allstar_competition', () => {
  assert.doesNotMatch(rules, /match \/boh_allstar_competition\/\{/);
});
