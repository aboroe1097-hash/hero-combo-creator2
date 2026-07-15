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
const { getPublicVtsPlayerProfile } = await import('../../js/vts-public-players.js');

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

test('curated public aliases share vote families without changing candidate identity', () => {
  const aliases = [
    ['Dr Thunder 293', 'Dr Thunder', 'drthunder293', 'drthunder'],
    ['Lisavetka', 'Lisaveta', 'lisavetka', 'lisaveta'],
    ['Lady Zubbs', 'Zubbs', 'ladyzubbs', 'zubbs'],
    ['TazzBoy', 'Tazz', 'tazzboy', 'tazz'],
    ['Juli Rae', 'Juli', 'julirae', 'juli'],
  ];

  for (const [alias, canonical, expectedPlayerKey, expectedFamily] of aliases) {
    const aliasCandidate = resolveEdenVoteCandidate({ candidateName: alias });
    const canonicalCandidate = resolveEdenVoteCandidate({ candidateName: canonical });

    assert.equal(aliasCandidate.familyKey, expectedFamily);
    assert.equal(aliasCandidate.familyKey, canonicalCandidate.familyKey);
    assert.equal(aliasCandidate.rawName, alias);
    assert.equal(aliasCandidate.playerKey, expectedPlayerKey);
  }
});

test('guild-tagged curated aliases resolve families after display-name cleanup', () => {
  const drThunder = resolveEdenVoteCandidate({ candidateName: '(Vts)Dr Thunder 293' });
  assert.deepEqual(drThunder, {
    rawName: '(Vts)Dr Thunder 293',
    canonicalName: 'Dr Thunder 293',
    playerKey: 'drthunder293',
    familyKey: 'drthunder',
  });

  const lisaveta = resolveEdenVoteCandidate({ candidateName: '(Vts)Lisavetka*' });
  assert.deepEqual(lisaveta, {
    rawName: '(Vts)Lisavetka*',
    canonicalName: '•Lisavetka•',
    playerKey: 'lisavetka',
    familyKey: 'lisaveta',
  });
});

test('public profile matching keeps non-Latin names and avoids partial Kika matches', () => {
  assert.equal(getPublicVtsPlayerProfile('\ua9c1\u0f3a Kika \u0f3b\ua9c2')?.name, 'Kika');
  assert.equal(getPublicVtsPlayerProfile('\u0410\u041b\u0415\u041a\u0421 & Kika'), null);

  const mixedName = resolveEdenVoteCandidate({
    candidateName: '\u0410\u041b\u0415\u041a\u0421 & Kika',
  });
  assert.equal(mixedName.canonicalName, '\u0410\u041b\u0415\u041a\u0421 & Kika');
  assert.equal(mixedName.playerKey, 'a\u043bekckika');
  assert.notEqual(mixedName.familyKey, 'kika');
});
