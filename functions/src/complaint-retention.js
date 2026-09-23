// Complaint screenshot retention.
//
// Members can attach up to three screenshots to an Issue or Complaint. They are
// only needed while leadership reviews the report, so they are not kept for
// long: once a day this job deletes every screenshot older than the retention
// window, which keeps the Storage bucket far inside the free tier. The
// complaint's text stays in the superadmin inbox; its `images` list is emptied
// and `imagesExpiredAt` records when, so the inbox can say the screenshots were
// removed instead of failing to load them.
//
// Two passes, both bounded per run:
//   1. complaint documents older than the window that still list images:
//      delete their files and empty the list;
//   2. any file under complaints/ older than the window, which also catches
//      uploads whose complaint write never landed (orphans).
//
// Dependencies are injected so the logic is unit-tested without the Admin SDK.

export const COMPLAINT_IMAGE_RETENTION_DAYS = 30;
export const COMPLAINT_RETENTION_BATCH = 200;
export const COMPLAINT_STORAGE_PREFIX = 'complaints/';
const DAY_MS = 24 * 60 * 60 * 1000;

export function complaintRetentionCutoff(nowMs, days = COMPLAINT_IMAGE_RETENTION_DAYS) {
  return new Date(Number(nowMs) - Math.max(1, Number(days) || 1) * DAY_MS);
}

function fileCreatedMs(file) {
  const raw = file?.metadata?.timeCreated;
  const ms = raw ? Date.parse(raw) : NaN;
  return Number.isFinite(ms) ? ms : NaN;
}

/**
 * @param {object} deps
 * @param {() => number} deps.now
 * @param {(cutoff: Date, limit: number) => Promise<Array<{id: string, images: string[], update: (data: object) => Promise<void>}>>} deps.findExpiredComplaints
 * @param {(prefix: string) => Promise<Array<{name: string, metadata?: object, delete: () => Promise<void>}>>} deps.listFiles
 * @param {(path: string) => Promise<void>} deps.deleteFile
 * @param {() => unknown} deps.serverTimestamp
 * @param {number} [deps.retentionDays]
 */
export async function purgeExpiredComplaintImages(deps) {
  const retentionDays = deps.retentionDays ?? COMPLAINT_IMAGE_RETENTION_DAYS;
  const cutoff = complaintRetentionCutoff(deps.now(), retentionDays);
  const result = { cutoff: cutoff.toISOString(), complaints: 0, files: 0, orphans: 0 };

  const expired = await deps.findExpiredComplaints(cutoff, COMPLAINT_RETENTION_BATCH);
  for (const complaint of expired) {
    const images = Array.isArray(complaint.images) ? complaint.images : [];
    if (!images.length) continue;
    for (const path of images) {
      // Only files that belong to this complaint are ever deleted.
      if (
        typeof path !== 'string' ||
        !path.startsWith(`${COMPLAINT_STORAGE_PREFIX}${complaint.id}/`)
      ) {
        continue;
      }
      await deps.deleteFile(path);
      result.files += 1;
    }
    await complaint.update({ images: [], imagesExpiredAt: deps.serverTimestamp() });
    result.complaints += 1;
  }

  const files = await deps.listFiles(COMPLAINT_STORAGE_PREFIX);
  let removed = 0;
  for (const file of files) {
    if (removed >= COMPLAINT_RETENTION_BATCH) break;
    const created = fileCreatedMs(file);
    if (!Number.isFinite(created) || created >= cutoff.getTime()) continue;
    await file.delete();
    removed += 1;
  }
  result.orphans = removed;
  return result;
}

/** Wires the job to the Admin SDK's Firestore and Storage objects. */
export function createComplaintRetentionJob({ db, bucket, serverTimestamp, now = Date.now }) {
  return () =>
    purgeExpiredComplaintImages({
      now,
      serverTimestamp,
      async findExpiredComplaints(cutoff, limit) {
        // Only complaints that crossed the line in the last week: a daily run
        // always covers them, and complaints cleared on earlier runs are never
        // re-read (the file pass below still sweeps anything older).
        const since = new Date(cutoff.getTime() - 7 * DAY_MS);
        const snapshot = await db
          .collection('complaints')
          .where('createdAt', '>=', since)
          .where('createdAt', '<', cutoff)
          .orderBy('createdAt', 'asc')
          .limit(limit)
          .get();
        return snapshot.docs.map((doc) => ({
          id: doc.id,
          images: doc.get('images'),
          update: (data) => doc.ref.update(data),
        }));
      },
      async listFiles(prefix) {
        const [files] = await bucket.getFiles({ prefix, maxResults: 1000 });
        return files;
      },
      async deleteFile(path) {
        await bucket.file(path).delete({ ignoreNotFound: true });
      },
    });
}
