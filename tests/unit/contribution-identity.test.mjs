import assert from 'node:assert/strict';
import test from 'node:test';

import {
  addContributionAliasMatch,
  collapseContributionOcrDuplicates,
  getContributionAliasMatch,
  getContributionCanonicalName,
  getContributionSnapshotIdentity,
  normalizeContributionMemberName,
  removeContributionAliasMatch,
} from '../../js/contribution-identity.js';

test('contribution member normalization removes accidental trailing CSV separators', () => {
  assert.equal(normalizeContributionMemberName('(Vts)MalakAbo,'), '(Vts)MalakAbo');
  assert.equal(normalizeContributionMemberName('Family, Given'), 'Family, Given');
});

test('contribution identity can apply the normal VTS guild when an optional guild is omitted', () => {
  assert.equal(
    getContributionSnapshotIdentity({ name: 'MalakAbo', guild: '' }, null, {
      defaultGuild: 'VTS X1',
    }),
    getContributionSnapshotIdentity({ name: 'MalakAbo', guild: 'VTS X1' }, null)
  );
});

test('overlapping OCR screenshots collapse duplicate rank and score fragments', () => {
  const rows = collapseContributionOcrDuplicates([
    { rank: 126, name: 'kaZenaBanner', guild: 'VTS X1', contribution: 68150 },
    { rank: 126, name: 's)MalikaZenaBanner', guild: 'VTS X1', contribution: 68150 },
    { rank: 126, name: '(Vts)MalikaZenaBar', guild: 'VTS X1', contribution: 68150 },
    { rank: 127, name: 'Another player', guild: 'VTS X1', contribution: 67900 },
  ]);

  assert.equal(rows.length, 2);
  assert.equal(rows.find((row) => row.rank === 126)?.name, 's)MalikaZenaBanner');
});

test('OCR collapse does not merge rows with different contribution values', () => {
  const rows = collapseContributionOcrDuplicates([
    { rank: 10, name: 'Player one', guild: 'VTS X1', contribution: 1000 },
    { rank: 10, name: 'Player two', guild: 'VTS X1', contribution: 999 },
  ]);

  assert.equal(rows.length, 2);
});

test('manual contribution aliases reconcile a renamed player across snapshots', () => {
  const registry = addContributionAliasMatch(null, '(Vts)Old Name', '(Vts)New Name');

  assert.equal(
    getContributionSnapshotIdentity({ name: '(Vts)Old Name', guild: 'VTS X1' }, registry),
    getContributionSnapshotIdentity({ name: '(Vts)New Name', guild: 'VTS X1' }, registry)
  );
  assert.equal(registry.players[0].canonical, '(Vts)Old Name');
  assert.deepEqual(registry.players[0].aliases, ['(Vts)Old Name', '(Vts)New Name']);
  assert.equal(getContributionAliasMatch(registry, '(Vts)New Name').canonical, '(Vts)Old Name');
});

test('contribution matching resolves an old snapshot alias to its canonical player first', () => {
  const original = {
    players: [{ canonical: 'Actual Player', aliases: ['Actual Player', 'Old OCR Name'] }],
  };
  const registry = addContributionAliasMatch(original, 'Old OCR Name', 'New Screenshot Name');

  assert.equal(getContributionCanonicalName('Old OCR Name', registry), 'Actual Player');
  assert.equal(getContributionCanonicalName('New Screenshot Name', registry), 'Actual Player');
  assert.equal(
    getContributionAliasMatch(registry, 'New Screenshot Name').canonical,
    'Actual Player'
  );
});

test('saved contribution matches can be undone without removing trusted aliases', () => {
  const original = {
    players: [
      {
        canonical: 'Actual Player',
        aliases: ['Actual Player', 'Trusted Old Alias'],
      },
    ],
  };
  const matched = addContributionAliasMatch(original, 'Trusted Old Alias', 'Wrong New Name');
  const undone = removeContributionAliasMatch(matched, 'Wrong New Name');

  assert.equal(getContributionAliasMatch(undone, 'Wrong New Name'), null);
  assert.equal(getContributionCanonicalName('Wrong New Name', undone), 'Wrong New Name');
  assert.equal(getContributionCanonicalName('Trusted Old Alias', undone), 'Actual Player');
});

test('contribution aliases do not merge same-name players from different guilds', () => {
  const registry = addContributionAliasMatch(null, 'Old Name', 'New Name');

  assert.notEqual(
    getContributionSnapshotIdentity({ name: 'Old Name', guild: 'VTS X1' }, registry),
    getContributionSnapshotIdentity({ name: 'New Name', guild: 'VTS X2' }, registry)
  );
});

test('manual contribution aliases reject an identity already owned by another player', () => {
  const registry = {
    players: [
      { canonical: 'First Player', aliases: ['First Player', 'First Old'] },
      { canonical: 'Second Player', aliases: ['Second Player', 'Second New'] },
    ],
  };

  assert.throws(
    () => addContributionAliasMatch(registry, 'First Old', 'Second New'),
    /already belongs to another player identity/
  );
});
