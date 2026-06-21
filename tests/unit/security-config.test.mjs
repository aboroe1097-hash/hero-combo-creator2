import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('public admin auth config ships without usable default credentials', () => {
  const source = readFileSync('js/admin-auth-config.js', 'utf8');
  assert.match(source, /adminHash:\s*''/);
  assert.doesNotMatch(source, /5994471abb01112afcc18159f6cc74b4f511b99806da59b3caf5a9c173cacfc5/);
});

test('firebase config reads public web config from environment variables', () => {
  const source = readFileSync('js/firebase.js', 'utf8');
  assert.match(source, /VITE_FIREBASE_API_KEY/);
  assert.doesNotMatch(source, /AIza[0-9A-Za-z_-]{20,}/);
});
