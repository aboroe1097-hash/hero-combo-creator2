import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  COMPLAINT_DAILY_CAP,
  COMPLAINT_MEMBER_WINDOW_MS,
  createMemberLimiter,
  decodeComplaintImage,
  fileComplaintHandler,
  startOfUtcDayMs,
} from '../../functions/src/file-complaint.js';

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1, 1]);
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d]);
const jpegUri = `data:image/jpeg;base64,${JPEG.toString('base64')}`;
const NOW = Date.UTC(2026, 8, 28, 15, 42, 7);

function fakeDeps({ now = NOW, dailyCount = 0 } = {}) {
  const writes = new Map();
  const uploads = [];
  let counter = dailyCount;
  let nextId = 0;
  const db = {
    doc: (path) => ({ path }),
    collection: (name) => ({
      doc: () => {
        const id = `C${String(++nextId).padStart(19, '0')}`;
        return { id, set: async (data) => writes.set(`${name}/${id}`, data) };
      },
    }),
    runTransaction: async (fn) =>
      fn({
        get: async () => ({ exists: counter > 0, data: () => ({ count: counter }) }),
        set: (ref, data) => {
          counter = data.count;
          writes.set(ref.path, data);
        },
      }),
  };
  return {
    writes,
    uploads,
    deps: {
      db,
      now: () => now,
      limiter: createMemberLimiter({ key: Buffer.alloc(32, 7) }),
      randomId: () => 'abc123',
      serverTimestamp: () => 'SERVER_TIME',
      timestampFromMillis: (ms) => ({ ms }),
      uploadImage: async (path, buffer, contentType) => uploads.push({ path, contentType }),
    },
  };
}

const valid = { category: 'conduct', description: 'Something happened at the gate.' };

test('an anonymous filing stores no identity and only a day-level time', async () => {
  const { deps, writes } = fakeDeps();
  const result = await fileComplaintHandler(
    { ...valid, anonymous: true, name: 'Mo' },
    { uid: 'u1' },
    deps
  );
  assert.deepEqual(Object.keys(result), ['complaintId']);
  const stored = writes.get(`complaints/${result.complaintId}`);
  assert.equal(stored.anonymous, true);
  assert.ok(!('submittedBy' in stored) && !('submittedByName' in stored));
  assert.deepEqual(stored.createdAt, { ms: startOfUtcDayMs(NOW) });
  // Nothing written anywhere carries the uid.
  for (const [path, data] of writes) {
    assert.doesNotMatch(`${path} ${JSON.stringify(data)}`, /u1/);
  }
});

test('a named filing is attributed to the caller with the exact server time', async () => {
  const { deps, writes } = fakeDeps();
  const { complaintId } = await fileComplaintHandler(
    { ...valid, anonymous: false, name: '  Banner ' },
    { uid: 'u2' },
    deps
  );
  const stored = writes.get(`complaints/${complaintId}`);
  assert.equal(stored.submittedBy, 'u2');
  assert.equal(stored.submittedByName, 'Banner');
  assert.equal(stored.createdAt, 'SERVER_TIME');
});

test('the only stored counter is the global per-day cap', async () => {
  const { deps, writes } = fakeDeps();
  await fileComplaintHandler({ ...valid, anonymous: true }, { uid: 'u3' }, deps);
  const counters = [...writes.keys()].filter((path) => path.startsWith('complaint_rate_limits/'));
  assert.deepEqual(counters, ['complaint_rate_limits/2026-09-28']);
  assert.deepEqual(writes.get(counters[0]), { count: 1 });

  const full = fakeDeps({ dailyCount: COMPLAINT_DAILY_CAP });
  await assert.rejects(
    fileComplaintHandler({ ...valid, anonymous: true }, { uid: 'u4' }, full.deps),
    { code: 'rate_limited' }
  );
});

test('one member is limited to one filing per window, others are not', async () => {
  const { deps } = fakeDeps();
  await fileComplaintHandler({ ...valid, anonymous: true }, { uid: 'u5' }, deps);
  await assert.rejects(fileComplaintHandler({ ...valid, anonymous: true }, { uid: 'u5' }, deps), {
    code: 'rate_limited',
  });
  await fileComplaintHandler({ ...valid, anonymous: true }, { uid: 'u6' }, deps);
  deps.now = () => NOW + COMPLAINT_MEMBER_WINDOW_MS;
  await fileComplaintHandler({ ...valid, anonymous: true }, { uid: 'u5' }, deps);
});

test('sign-in is required and bad input is refused before anything is written', async () => {
  const { deps, writes } = fakeDeps();
  await assert.rejects(fileComplaintHandler(valid, undefined, deps), { code: 'unauthenticated' });
  await assert.rejects(
    fileComplaintHandler({ ...valid, description: 'short' }, { uid: 'u7' }, deps),
    { code: 'invalid_description' }
  );
  await assert.rejects(
    fileComplaintHandler({ ...valid, anonymous: false, name: '  ' }, { uid: 'u7' }, deps),
    { code: 'invalid_name' }
  );
  await assert.rejects(
    fileComplaintHandler(
      { ...valid, anonymous: true, images: [jpegUri, jpegUri, jpegUri, jpegUri] },
      { uid: 'u7' },
      deps
    ),
    { code: 'invalid_image' }
  );
  assert.equal(writes.size, 0);
});

test('images are checked by their bytes and stored under the filing id', async () => {
  assert.equal(decodeComplaintImage(jpegUri).contentType, 'image/jpeg');
  // Declared type must match the bytes.
  assert.equal(decodeComplaintImage(`data:image/png;base64,${JPEG.toString('base64')}`), null);
  assert.equal(
    decodeComplaintImage(`data:image/png;base64,${PNG.toString('base64')}`).extension,
    'png'
  );
  assert.equal(decodeComplaintImage('data:image/jpeg;base64,PHNjcmlwdD4='), null);
  assert.equal(decodeComplaintImage('data:text/html;base64,PGgxPg=='), null);

  const { deps, uploads, writes } = fakeDeps();
  const { complaintId } = await fileComplaintHandler(
    { ...valid, anonymous: true, images: [jpegUri] },
    { uid: 'u8' },
    deps
  );
  assert.deepEqual(uploads, [
    { path: `complaints/${complaintId}/0-abc123.jpg`, contentType: 'image/jpeg' },
  ]);
  assert.deepEqual(writes.get(`complaints/${complaintId}`).images, [uploads[0].path]);
});

test('the limiter keeps no uid in memory', () => {
  const limiter = createMemberLimiter({ key: Buffer.alloc(32, 1) });
  limiter.record('member-uid-123', NOW);
  assert.equal(limiter.check('member-uid-123', NOW + 1), false);
  assert.equal(limiter.check('someone-else', NOW + 1), true);
});

test('the deployed callable is a single instance with no secret and no App Check gate', () => {
  const index = readFileSync('functions/index.js', 'utf8');
  const block = index.slice(index.indexOf('export const fileComplaint'));
  assert.match(block, /maxInstances: 1,/);
  assert.doesNotMatch(index, /COMPLAINT_RATE_LIMIT_SALT/);
  assert.doesNotMatch(block, /enforceAppCheck/);
});
