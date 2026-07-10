import assert from 'node:assert/strict';
import test from 'node:test';

globalThis.window = { VTS_ADMIN_AUTH: {} };
globalThis.localStorage = { getItem: () => null, setItem: () => {} };
globalThis.document = {
  getElementById: () => null,
  querySelector: () => null,
  querySelectorAll: () => [],
};

const { resolveEdenVoteCandidate } = await import('../../js/eden-vote-candidates.js');

test('Eden vote aliases merge into the same player family', () => {
  const waelFamilies = [
    resolveEdenVoteCandidate({ candidateName: '(Vts)|..WAEL...|' }).familyKey,
    resolveEdenVoteCandidate({ candidateName: '[..WAEL..]' }).familyKey,
  ];
  assert.deepEqual(waelFamilies, ['wael', 'wael']);

  const angelFamilies = [
    resolveEdenVoteCandidate({ candidateName: 'ANG\u018eL' }).familyKey,
    resolveEdenVoteCandidate({ candidateName: 'ANGEL' }).familyKey,
  ];
  assert.deepEqual(angelFamilies, ['angel', 'angel']);
});

test('Kika variants merge while unrelated Malak names stay separate', () => {
  const kikaFamilies = [
    resolveEdenVoteCandidate({ candidateName: 'Kika' }).familyKey,
    resolveEdenVoteCandidate({ candidateName: '\ua9c1\u0f3a Kika \u0f3b\ua9c2' }).familyKey,
    resolveEdenVoteCandidate({ candidateName: '(s)\u2728Kika\u2728' }).familyKey,
  ];
  assert.deepEqual(kikaFamilies, ['kika', 'kika', 'kika']);

  assert.notEqual(
    resolveEdenVoteCandidate({ candidateName: 'MalakAbo' }).familyKey,
    resolveEdenVoteCandidate({ candidateName: 'MalakAdo' }).familyKey
  );
});

test('Sarafino and Sarafina share the configured weighted family', () => {
  assert.equal(
    resolveEdenVoteCandidate({ candidateName: '~Sarafino~' }).familyKey,
    resolveEdenVoteCandidate({ candidateName: '~Sarafina~' }).familyKey
  );
  assert.equal(resolveEdenVoteCandidate({ candidateName: '~Sarafino~' }).familyKey, 'sarafino');
});
