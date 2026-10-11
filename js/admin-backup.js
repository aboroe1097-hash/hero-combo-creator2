import {
  EDEN_SNAPSHOT_SCHEMA,
  EDEN_SNAPSHOT_DOC_KEYS,
  EDEN_SNAPSHOT_COLLECTION_KEYS,
} from './eden-seasons.js';

// Explicit coverage prevents a local dashboard export being mistaken for an
// Auth, Storage, infrastructure, or whole-application disaster backup.
export const BACKUP_COVERAGE = Object.freeze({
  cloud: [...EDEN_SNAPSHOT_DOC_KEYS, ...EDEN_SNAPSHOT_COLLECTION_KEYS],
  localOnly: ['roster.names', 'alliances', 'logs'],
  excluded: [
    'Firebase Auth',
    'Storage images',
    'provider secrets',
    'other application collections',
  ],
});

export function fullBackupToSnapshot(backup, workspaceId) {
  if (backup?.schema === EDEN_SNAPSHOT_SCHEMA) {
    if (backup.workspace !== workspaceId)
      throw new Error('This backup belongs to a different season.');
    return backup;
  }
  if (backup?.schema !== 'vts-admin-full-export-v1') throw new Error('Unsupported backup format.');
  if (!backup.workspace)
    throw new Error(
      'This older backup has no season workspace. Use its attack import or a verified workspace snapshot.'
    );
  if (backup.workspace !== workspaceId)
    throw new Error('This backup belongs to a different season.');
  if (!Array.isArray(backup.dashboard?.attacks))
    throw new Error('The backup dashboard is invalid.');
  const docs = {
    ...backup.cloudSnapshot?.docs,
    dashboardData: backup.cloudSnapshot?.docs?.dashboardData || backup.dashboard,
  };
  if (!docs.rosterData && Array.isArray(backup.roster?.snapshots)) {
    docs.rosterData = { snapshots: backup.roster.snapshots, updated: backup.exportedAt };
  }
  return {
    schema: EDEN_SNAPSHOT_SCHEMA,
    workspace: workspaceId,
    label: backup.label || workspaceId,
    exportedAt: backup.exportedAt,
    docs,
  };
}

export function backupRestoreSummary(snapshot) {
  const rows = [];
  for (const key of EDEN_SNAPSHOT_DOC_KEYS) {
    if (snapshot.docs?.[key]) rows.push(`${key}: 1 document`);
  }
  for (const key of EDEN_SNAPSHOT_COLLECTION_KEYS) {
    if (Array.isArray(snapshot.docs?.[key]))
      rows.push(`${key}: ${snapshot.docs[key].length} records`);
  }
  return rows;
}

export function snapshotValuesEqual(a, b) {
  const canonical = (value) => {
    if (value?.toMillis)
      return { seconds: Math.floor(value.toMillis() / 1000), nanoseconds: value.nanoseconds || 0 };
    if (value && typeof value === 'object' && 'seconds' in value && 'nanoseconds' in value) {
      return { seconds: value.seconds, nanoseconds: value.nanoseconds };
    }
    if (Array.isArray(value)) return value.map(canonical);
    if (value && typeof value === 'object')
      return Object.fromEntries(
        Object.keys(value)
          .sort()
          .map((key) => [key, canonical(value[key])])
      );
    return value ?? null;
  };
  return JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
}
