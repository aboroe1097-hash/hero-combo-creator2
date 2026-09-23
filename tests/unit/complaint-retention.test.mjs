import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  COMPLAINT_IMAGE_RETENTION_DAYS,
  complaintRetentionCutoff,
  purgeExpiredComplaintImages,
} from '../../functions/src/complaint-retention.js';

const NOW = Date.parse('2026-10-31T04:00:00Z');
const DAY = 24 * 60 * 60 * 1000;
const iso = (daysAgo) => new Date(NOW - daysAgo * DAY).toISOString();

function fakes({ complaints = [], files = [] } = {}) {
  const deleted = [];
  const updates = [];
  return {
    deleted,
    updates,
    deps: {
      now: () => NOW,
      serverTimestamp: () => 'SERVER_TIME',
      async findExpiredComplaints(cutoff) {
        return complaints
          .filter((c) => c.createdMs < cutoff.getTime())
          .map((c) => ({
            id: c.id,
            images: c.images,
            update: async (data) => updates.push({ id: c.id, data }),
          }));
      },
      async listFiles(prefix) {
        return files
          .filter((f) => f.name.startsWith(prefix) && !deleted.includes(f.name))
          .map((f) => ({
            name: f.name,
            metadata: { timeCreated: f.timeCreated },
            delete: async () => deleted.push(f.name),
          }));
      },
      async deleteFile(path) {
        deleted.push(path);
      },
    },
  };
}

test('screenshots are kept for 30 days, then deleted while the complaint text stays', async () => {
  assert.equal(COMPLAINT_IMAGE_RETENTION_DAYS, 30);
  assert.equal(complaintRetentionCutoff(NOW).toISOString(), iso(30));

  const oldId = 'OldComplaint00000001';
  const newId = 'NewComplaint00000002';
  const { deps, deleted, updates } = fakes({
    complaints: [
      {
        id: oldId,
        createdMs: NOW - 45 * DAY,
        images: [`complaints/${oldId}/a.webp`, `complaints/${oldId}/b.webp`],
      },
      { id: newId, createdMs: NOW - 3 * DAY, images: [`complaints/${newId}/c.webp`] },
    ],
    files: [
      { name: `complaints/${oldId}/a.webp`, timeCreated: iso(45) },
      { name: `complaints/${oldId}/b.webp`, timeCreated: iso(45) },
      { name: `complaints/${newId}/c.webp`, timeCreated: iso(3) },
    ],
  });

  const result = await purgeExpiredComplaintImages(deps);
  assert.deepEqual(deleted.sort(), [`complaints/${oldId}/a.webp`, `complaints/${oldId}/b.webp`]);
  assert.deepEqual(updates, [{ id: oldId, data: { images: [], imagesExpiredAt: 'SERVER_TIME' } }]);
  assert.equal(result.complaints, 1);
  assert.equal(result.files, 2);
  assert.equal(result.orphans, 0, 'already-deleted files are not counted twice');
});

test('orphaned uploads older than the window are removed; recent ones and other paths are kept', async () => {
  const { deps, deleted } = fakes({
    files: [
      { name: 'complaints/Orphan00000000000001/x.png', timeCreated: iso(31) },
      { name: 'complaints/Orphan00000000000002/y.png', timeCreated: iso(29) },
    ],
  });
  const result = await purgeExpiredComplaintImages(deps);
  assert.deepEqual(deleted, ['complaints/Orphan00000000000001/x.png']);
  assert.equal(result.orphans, 1);
});

test('a complaint can never cause a file outside its own folder to be deleted', async () => {
  const id = 'Complaint0000000000A';
  const { deps, deleted, updates } = fakes({
    complaints: [
      {
        id,
        createdMs: NOW - 40 * DAY,
        images: ['complaints/SomeoneElse000000000/z.png', 'avatars/x.png', 42],
      },
    ],
  });
  await purgeExpiredComplaintImages(deps);
  assert.deepEqual(deleted, []);
  assert.equal(updates.length, 1, 'the stale list is still cleared');
});

test('the scheduled function is exported and runs daily', () => {
  const index = readFileSync('functions/index.js', 'utf8');
  assert.match(index, /export const purgeComplaintImages = onSchedule\(/);
  assert.match(index, /schedule: 'every day 04:00'/);
  assert.match(index, /createComplaintRetentionJob\(/);
});
