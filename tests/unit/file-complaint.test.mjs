import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  COMPLAINT_DAILY_CAP,
  COMPLAINT_MEMBER_WINDOW_MS,
  COMPLAINT_NETWORK_MAX,
  createMemberLimiter,
  createNetworkLimiter,
  createWindowLimiter,
  decodeComplaintImage,
  fileComplaintHandler,
  startOfUtcDayMs,
} from '../../functions/src/file-complaint.js';
import { purgeExpiredComplaintImages } from '../../functions/src/complaint-retention.js';

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1, 1]);
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d]);
const jpegUri = `data:image/jpeg;base64,${JPEG.toString('base64')}`;
const NOW = Date.UTC(2026, 8, 28, 15, 42, 7);

function fakeDeps({ now = NOW, dailyCount = 0, failSet = false, failUploadAt = -1 } = {}) {
  const writes = new Map();
  const uploads = [];
  const deleted = [];
  const state = { counter: dailyCount };
  let nextId = 0;
  const db = {
    doc: (path) => ({ path }),
    collection: (name) => ({
      doc: () => {
        const id = `C${String(++nextId).padStart(19, '0')}`;
        return {
          id,
          set: async (data) => {
            if (failSet) throw new Error('firestore unavailable');
            writes.set(`${name}/${id}`, data);
          },
        };
      },
    }),
    runTransaction: async (fn) =>
      fn({
        get: async () => ({ exists: state.counter > 0, data: () => ({ count: state.counter }) }),
        set: (ref, data) => {
          state.counter = data.count;
          writes.set(ref.path, data);
        },
      }),
  };
  return {
    writes,
    uploads,
    deleted,
    state,
    deps: {
      db,
      now: () => now,
      memberLimiter: createMemberLimiter({ key: Buffer.alloc(32, 7) }),
      networkLimiter: createNetworkLimiter({ key: Buffer.alloc(32, 8) }),
      randomId: () => 'abc123',
      serverTimestamp: () => 'SERVER_TIME',
      timestampFromMillis: (ms) => ({ ms }),
      uploadImage: async (path, buffer, contentType) => {
        if (uploads.length === failUploadAt) throw new Error('storage unavailable');
        uploads.push({ path, contentType });
      },
      deleteImage: async (path) => deleted.push(path),
    },
  };
}

const valid = { category: 'conduct', description: 'Something happened at the gate.' };
const anon = { ...valid, anonymous: true };

test('an anonymous filing stores no identity and only a day-level time', async () => {
  const { deps, writes } = fakeDeps();
  const result = await fileComplaintHandler({ ...anon, name: 'Mo' }, { uid: 'u1' }, deps, {
    clientIp: '203.0.113.9',
  });
  assert.deepEqual(Object.keys(result), ['complaintId']);
  const stored = writes.get(`complaints/${result.complaintId}`);
  assert.equal(stored.anonymous, true);
  assert.ok(!('submittedBy' in stored) && !('submittedByName' in stored));
  assert.deepEqual(stored.createdAt, { ms: startOfUtcDayMs(NOW) });
  // Nothing written anywhere carries the uid or the client address.
  for (const [path, data] of writes) {
    assert.doesNotMatch(`${path} ${JSON.stringify(data)}`, /u1|203\.0\.113/);
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
  await fileComplaintHandler(anon, { uid: 'u3' }, deps);
  const counters = [...writes.keys()].filter((path) => path.startsWith('complaint_rate_limits/'));
  assert.deepEqual(counters, ['complaint_rate_limits/2026-09-28']);
  assert.deepEqual(writes.get(counters[0]), { count: 1 });

  const full = fakeDeps({ dailyCount: COMPLAINT_DAILY_CAP });
  await assert.rejects(fileComplaintHandler(anon, { uid: 'u4' }, full.deps), {
    code: 'rate_limited',
  });
});

test('one member is limited to one filing per window, others are not', async () => {
  const { deps } = fakeDeps();
  await fileComplaintHandler(anon, { uid: 'u5' }, deps);
  await assert.rejects(fileComplaintHandler(anon, { uid: 'u5' }, deps), {
    code: 'rate_limited',
  });
  await fileComplaintHandler(anon, { uid: 'u6' }, deps);
  deps.now = () => NOW + COMPLAINT_MEMBER_WINDOW_MS;
  await fileComplaintHandler(anon, { uid: 'u5' }, deps);
});

test('a concurrent burst from one member files once', async () => {
  const { deps, state } = fakeDeps();
  const burst = await Promise.allSettled(
    Array.from({ length: 5 }, () => fileComplaintHandler(anon, { uid: 'u9' }, deps))
  );
  assert.equal(burst.filter((result) => result.status === 'fulfilled').length, 1);
  assert.equal(state.counter, 1);
});

test('fresh anonymous uids from one network cannot drain the daily cap', async () => {
  const { deps, state } = fakeDeps();
  const context = { clientIp: '198.51.100.7' };
  for (let index = 0; index < COMPLAINT_NETWORK_MAX; index += 1) {
    await fileComplaintHandler(anon, { uid: `churn-${index}` }, deps, context);
  }
  await assert.rejects(fileComplaintHandler(anon, { uid: 'churn-next' }, deps, context), {
    code: 'rate_limited',
  });
  assert.equal(state.counter, COMPLAINT_NETWORK_MAX);
  // Another network is unaffected.
  await fileComplaintHandler(anon, { uid: 'elsewhere' }, deps, { clientIp: '192.0.2.1' });
});

test('a failed filing deletes its screenshots, refunds the slot and lets the member retry', async () => {
  const failing = fakeDeps({ failSet: true });
  await assert.rejects(
    fileComplaintHandler({ ...anon, images: [jpegUri, jpegUri] }, { uid: 'u10' }, failing.deps, {
      clientIp: '198.51.100.8',
    }),
    /firestore unavailable/
  );
  assert.equal(failing.uploads.length, 2);
  assert.deepEqual(
    failing.deleted,
    failing.uploads.map((upload) => upload.path)
  );
  assert.equal(failing.state.counter, 0);

  const halfway = fakeDeps({ failUploadAt: 1 });
  await assert.rejects(
    fileComplaintHandler({ ...anon, images: [jpegUri, jpegUri] }, { uid: 'u11' }, halfway.deps),
    /storage unavailable/
  );
  assert.deepEqual(halfway.deleted, [halfway.uploads[0].path]);
  // The reservation was handed back: the same member may retry immediately.
  halfway.deps.uploadImage = async () => {};
  await fileComplaintHandler(anon, { uid: 'u11' }, halfway.deps);
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
      { ...anon, images: [jpegUri, jpegUri, jpegUri, jpegUri] },
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
    { ...anon, images: [jpegUri] },
    { uid: 'u8' },
    deps
  );
  assert.deepEqual(uploads, [
    { path: `complaints/${complaintId}/0-abc123.jpg`, contentType: 'image/jpeg' },
  ]);
  assert.deepEqual(writes.get(`complaints/${complaintId}`).images, [uploads[0].path]);
});

test('the limiter keeps no uid in memory and hands reservations back', () => {
  const limiter = createWindowLimiter({ windowMs: 1000, max: 2, key: Buffer.alloc(32, 1) });
  assert.equal(limiter.reserve('member-uid-123', NOW), true);
  assert.equal(limiter.reserve('member-uid-123', NOW + 1), true);
  assert.equal(limiter.reserve('member-uid-123', NOW + 2), false);
  limiter.release('member-uid-123', NOW + 1);
  assert.equal(limiter.reserve('member-uid-123', NOW + 3), true);
  assert.equal(limiter.reserve('someone-else', NOW + 3), true);
  assert.equal(limiter.reserve('member-uid-123', NOW + 1000), true, 'the window slides');
});

test('the retention job deletes the retired uid-keyed throttle stamps', async () => {
  let asked = 0;
  const result = await purgeExpiredComplaintImages({
    now: () => NOW,
    serverTimestamp: () => 'T',
    findExpiredComplaints: async () => [],
    listFiles: async () => [],
    deleteFile: async () => {},
    deleteRetiredThrottleDocs: async (limit) => {
      asked = limit;
      return 3;
    },
  });
  assert.ok(asked > 0);
  assert.equal(result.retiredThrottle, 3);
});

test('the deployed callable is one sized instance with no secret and no App Check gate', () => {
  const index = readFileSync('functions/index.js', 'utf8');
  const block = index.slice(index.indexOf('export const fileComplaint'));
  assert.match(block, /maxInstances: 1,/);
  assert.match(block, /memory: '512MiB',/);
  assert.match(block, /concurrency: 4,/);
  assert.match(block, /clientIp: request\.rawRequest\?\.ip/);
  assert.doesNotMatch(index, /COMPLAINT_RATE_LIMIT_SALT/);
  assert.doesNotMatch(block, /enforceAppCheck/);
});
