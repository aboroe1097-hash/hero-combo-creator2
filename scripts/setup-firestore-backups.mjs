import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export const BACKUP_PROJECT = 'abocombo';
export const BACKUP_DATABASE = '(default)';
export const BACKUP_RETENTION_SECONDS = 8467200;

export function planBackupSchedule(schedules) {
  if (!Array.isArray(schedules)) throw new Error('Unexpected backup schedule response.');
  const daily = schedules.filter((schedule) => schedule.dailyRecurrence !== undefined);
  if (daily.length > 1) throw new Error('Multiple daily schedules found; review in Cloud Console.');
  if (!daily.length) return { action: 'create' };
  if (daily[0].retention === `${BACKUP_RETENTION_SECONDS}s`) return { action: 'none' };
  return { action: 'review' };
}

function gcloud(args) {
  // Arguments are fixed by this file, never interpolated from user input.
  const safeArgs = process.platform === 'win32' ? args.map((arg) => `"${arg}"`) : args;
  const result = spawnSync('gcloud', safeArgs, {
    encoding: 'utf8',
    shell: process.platform === 'win32',
    windowsHide: true,
  });
  if (result.error || result.status !== 0) {
    throw new Error('gcloud failed. Verify installation, login, project access and billing.');
  }
  return result.stdout;
}

export function main(args = process.argv.slice(2)) {
  if (args.some((arg) => arg !== '--apply'))
    throw new Error('Usage: node scripts/setup-firestore-backups.mjs [--apply]');
  const target = [`--project=${BACKUP_PROJECT}`, `--database=${BACKUP_DATABASE}`];
  const list = () =>
    JSON.parse(gcloud(['firestore', 'backups', 'schedules', 'list', ...target, '--format=json']));
  const plan = planBackupSchedule(list());
  console.log(`Target: ${BACKUP_PROJECT}/${BACKUP_DATABASE}. Daily backup retention: 14 weeks.`);
  if (plan.action === 'none') {
    console.log('Daily backup schedule already matches; no changes.');
    return;
  }
  if (plan.action === 'review')
    throw new Error(
      'An existing daily schedule has different retention. Review it manually; nothing changed.'
    );
  if (!args.includes('--apply')) {
    console.log(
      'Dry run: would create one daily backup schedule. Re-run with --apply to enable billable managed backups.'
    );
    return;
  }
  gcloud([
    'firestore',
    'backups',
    'schedules',
    'create',
    ...target,
    '--recurrence=daily',
    '--retention=14w',
    '--quiet',
  ]);
  if (planBackupSchedule(list()).action !== 'none')
    throw new Error('Backup schedule verification failed. Inspect Cloud Console.');
  console.log(
    'Daily backup schedule created and verified. Check a completed backup and rehearse isolated recovery.'
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
