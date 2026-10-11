import assert from 'node:assert/strict';
import test from 'node:test';
import {
  planBackupSchedule,
  BACKUP_RETENTION_SECONDS,
} from '../../scripts/setup-firestore-backups.mjs';

test('backup setup is idempotent and leaves existing policy changes for review', () => {
  assert.deepEqual(planBackupSchedule([]), { action: 'create' });
  assert.deepEqual(
    planBackupSchedule([{ dailyRecurrence: {}, retention: `${BACKUP_RETENTION_SECONDS}s` }]),
    { action: 'none' }
  );
  assert.deepEqual(planBackupSchedule([{ dailyRecurrence: {}, retention: '604800s' }]), {
    action: 'review',
  });
  assert.deepEqual(planBackupSchedule([{ weeklyRecurrence: {}, retention: '604800s' }]), {
    action: 'create',
  });
  assert.throws(() => planBackupSchedule({}), /Unexpected/);
  assert.throws(
    () => planBackupSchedule([{ dailyRecurrence: {} }, { dailyRecurrence: {} }]),
    /Multiple/
  );
});
