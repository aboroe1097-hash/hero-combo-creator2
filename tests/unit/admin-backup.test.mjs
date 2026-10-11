import test from 'node:test';
import assert from 'node:assert/strict';
import {
  fullBackupToSnapshot,
  snapshotValuesEqual,
  BACKUP_COVERAGE,
} from '../../js/admin-backup.js';

test('full backups retain every cloud dataset and require a matching workspace', () => {
  const backup = {
    schema: 'vts-admin-full-export-v1',
    workspace: 'eden-x8',
    dashboard: { attacks: [] },
    cloudSnapshot: {
      docs: {
        dashboardData: { attacks: [] },
        rewardSettings: { totalSlots: 10 },
        dutyPointWeights: { weights: {} },
      },
    },
  };
  const snapshot = fullBackupToSnapshot(backup, 'eden-x8');
  assert.deepEqual(snapshot.docs.rewardSettings, backup.cloudSnapshot.docs.rewardSettings);
  assert.deepEqual(snapshot.docs.dutyPointWeights, backup.cloudSnapshot.docs.dutyPointWeights);
  assert.throws(() => fullBackupToSnapshot(backup, 'eden-x9'), /different season/);
  assert.throws(
    () => fullBackupToSnapshot({ ...backup, workspace: null }, 'eden-x8'),
    /no season workspace/
  );
  assert.ok(BACKUP_COVERAGE.excluded.includes('Firebase Auth'));
});

test('restore concurrency comparison normalizes timestamp serialization and key order', () => {
  assert.equal(
    snapshotValuesEqual(
      { a: 1, when: { toMillis: () => 1234, nanoseconds: 234000000 } },
      { when: { type: 'firestore/timestamp/1.0', seconds: 1, nanoseconds: 234000000 }, a: 1 }
    ),
    true
  );
  assert.equal(snapshotValuesEqual({ a: 1 }, { a: 2 }), false);
});
