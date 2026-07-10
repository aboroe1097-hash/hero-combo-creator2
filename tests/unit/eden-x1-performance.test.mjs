import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const eden = read('js/eden-x1.js');
const edenFirebase = read('js/firebase-eden.js');
const sdk = read('js/firebase-sdk.js');

test('Eden boot uses the lightweight Firestore module', () => {
  assert.match(sdk, /firebase-firestore-lite\.js/);
  assert.match(sdk, /export function importFirestoreLite\(\)/);
  assert.match(eden, /import\('\.\/firebase-eden\.js'\)/);
  assert.match(eden, /importFirestoreLite/);
  assert.doesNotMatch(eden, /import\('\.\/firebase\.js'\)/);
  assert.match(edenFirebase, /importFirebaseApp\(\), importFirebaseAuth\(\)/);
  assert.doesNotMatch(edenFirebase, /importFirestore/);
});

test('Eden public dashboard rendering is frame-sliced', () => {
  assert.match(eden, /async function renderPublicDashboard\(/);
  assert.match(eden, /edenX1PublicPrimarySlot/);
  assert.match(eden, /await renderPublicAdvancedAnalyticsSections\(host, token\)/);
  assert.match(eden, /await yieldToBrowser\(\);[\s\S]*edenX1PublicHistorySlot/);
});
