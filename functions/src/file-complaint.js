// file-complaint.js — the only writer of Eden complaints.
//
// The complaint form promises structural anonymity: an anonymous filing must
// leave nothing behind that ties it to the member who sent it. The first
// implementation wrote the complaint and a `complaint_throttle/{uid}` stamp in
// one client batch, both at request.time, so anyone with console access could
// join the two on the timestamp. A hashed per-uid stamp does not fix that
// either: whoever holds the hash key can hash every uid and join again.
//
// So this callable persists NOTHING per member:
//   * The per-member limit (one filing per ten minutes) lives in memory only,
//     keyed by an HMAC under a random key generated at process start. The key
//     never leaves the process, so even a memory dump yields no uid. The
//     function runs as a single instance (maxInstances: 1 in index.js), so the
//     limit holds across requests; a cold start forgets it, which only ever
//     lets an honest member file again sooner.
//   * The only stored counter is a GLOBAL per-day cap
//     (`complaint_rate_limits/{YYYY-MM-DD}`), which bounds abuse and Storage
//     cost without naming anyone.
//   * An anonymous complaint's createdAt is the start of its UTC day, so its
//     time cannot be matched against anything either. Named complaints keep
//     the exact server time.
//
// Images arrive as data: URIs, are checked by their bytes (not the declared
// type), and are written by the Admin SDK under the complaint's own id. The
// Firestore and Storage rules no longer let clients create either.

import { createHmac, randomBytes } from 'node:crypto';

export const COMPLAINT_COLLECTION = 'complaints';
export const COMPLAINT_RATE_LIMIT_COLLECTION = 'complaint_rate_limits';
export const COMPLAINT_STORAGE_ROOT = 'complaints';
export const COMPLAINT_MEMBER_WINDOW_MS = 10 * 60 * 1000;
export const COMPLAINT_DAILY_CAP = 60;
export const COMPLAINT_MAX_IMAGES = 3;
export const COMPLAINT_MAX_IMAGE_BYTES = 2 * 1024 * 1024;
export const COMPLAINT_MIN_DESCRIPTION = 10;
export const COMPLAINT_MAX_DESCRIPTION = 4000;
export const COMPLAINT_MAX_NAME = 80;
export const COMPLAINT_CATEGORIES = Object.freeze([
  'bug',
  'missing',
  'conduct',
  'fair-play',
  'alliance',
  'other',
]);

const DAY_MS = 24 * 60 * 60 * 1000;
const DATA_URI = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/;
const EXTENSION_BY_TYPE = Object.freeze({
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
});

export class FileComplaintError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'FileComplaintError';
    this.code = code;
  }
}

export function complaintDayKey(nowMs) {
  return new Date(Number(nowMs)).toISOString().slice(0, 10);
}

export function startOfUtcDayMs(nowMs) {
  return Math.floor(Number(nowMs) / DAY_MS) * DAY_MS;
}

/** The type the bytes actually are, or '' when they are none of the three. */
export function sniffComplaintImageType(buffer) {
  if (!buffer || buffer.length < 12) return '';
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (png.every((byte, index) => buffer[index] === byte)) return 'image/png';
  if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
    return 'image/webp';
  }
  return '';
}

export function decodeComplaintImage(dataUri) {
  const match = DATA_URI.exec(typeof dataUri === 'string' ? dataUri : '');
  if (!match) return null;
  const buffer = Buffer.from(match[2], 'base64');
  if (!buffer.length || buffer.length > COMPLAINT_MAX_IMAGE_BYTES) return null;
  const contentType = sniffComplaintImageType(buffer);
  if (!contentType || contentType !== match[1]) return null;
  return { buffer, contentType, extension: EXTENSION_BY_TYPE[contentType] };
}

export function validateComplaintInput(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new FileComplaintError('invalid_request', 'Invalid complaint.');
  }
  const category = COMPLAINT_CATEGORIES.includes(data.category) ? data.category : 'other';
  const description = typeof data.description === 'string' ? data.description.trim() : '';
  if (
    description.length < COMPLAINT_MIN_DESCRIPTION ||
    description.length > COMPLAINT_MAX_DESCRIPTION
  ) {
    throw new FileComplaintError('invalid_description', 'Invalid description.');
  }
  const anonymous = data.anonymous === true;
  const name = anonymous
    ? ''
    : (typeof data.name === 'string' ? data.name : '').trim().slice(0, COMPLAINT_MAX_NAME);
  if (!anonymous && !name) {
    throw new FileComplaintError('invalid_name', 'A name is required.');
  }
  const rawImages = data.images === undefined ? [] : data.images;
  if (!Array.isArray(rawImages) || rawImages.length > COMPLAINT_MAX_IMAGES) {
    throw new FileComplaintError('invalid_image', 'Too many images.');
  }
  const images = rawImages.map((uri) => {
    const decoded = decodeComplaintImage(uri);
    if (!decoded) throw new FileComplaintError('invalid_image', 'Invalid image.');
    return decoded;
  });
  return { category, description, anonymous, name, images };
}

/**
 * In-memory, per-process limiter. Keys are HMACs under a key that is random per
 * process and never stored, so the map cannot be turned back into uids.
 */
export function createMemberLimiter({ windowMs = COMPLAINT_MEMBER_WINDOW_MS, key } = {}) {
  const secret = key || randomBytes(32);
  const lastByMember = new Map();
  const tag = (uid) => createHmac('sha256', secret).update(String(uid)).digest('base64url');
  return {
    check(uid, nowMs) {
      const last = lastByMember.get(tag(uid));
      return last === undefined || nowMs - last >= windowMs;
    },
    record(uid, nowMs) {
      // Drop expired entries so the map stays bounded by the window's traffic.
      for (const [member, at] of lastByMember) {
        if (nowMs - at >= windowMs) lastByMember.delete(member);
      }
      lastByMember.set(tag(uid), nowMs);
    },
  };
}

async function claimDailySlot(deps, nowMs) {
  const ref = deps.db.doc(`${COMPLAINT_RATE_LIMIT_COLLECTION}/${complaintDayKey(nowMs)}`);
  await deps.db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const count = snapshot.exists ? Number(snapshot.data()?.count) || 0 : 0;
    if (count >= COMPLAINT_DAILY_CAP) {
      throw new FileComplaintError('rate_limited', 'Too many complaints today.');
    }
    transaction.set(ref, { count: count + 1 });
  });
}

/**
 * @param {unknown} data   the callable payload
 * @param {{uid?: string}|undefined} auth   request.auth from the callable
 * @param {object} deps    db, uploadImage, limiter, now, serverTimestamp,
 *                         timestampFromMillis, randomId
 */
export async function fileComplaintHandler(data, auth, deps) {
  const uid = typeof auth?.uid === 'string' ? auth.uid : '';
  if (!uid) throw new FileComplaintError('unauthenticated', 'Sign-in required.');
  const input = validateComplaintInput(data);
  const nowMs = Number(deps.now());
  if (!deps.limiter.check(uid, nowMs)) {
    throw new FileComplaintError('rate_limited', 'Please wait before filing again.');
  }
  await claimDailySlot(deps, nowMs);
  deps.limiter.record(uid, nowMs);

  const complaintRef = deps.db.collection(COMPLAINT_COLLECTION).doc();
  const images = [];
  for (const [index, image] of input.images.entries()) {
    const path = `${COMPLAINT_STORAGE_ROOT}/${complaintRef.id}/${index}-${deps.randomId()}.${image.extension}`;
    await deps.uploadImage(path, image.buffer, image.contentType);
    images.push(path);
  }

  const complaint = {
    category: input.category,
    description: input.description,
    images,
    anonymous: input.anonymous,
    reviewed: false,
    createdAt: input.anonymous
      ? deps.timestampFromMillis(startOfUtcDayMs(nowMs))
      : deps.serverTimestamp(),
  };
  if (!input.anonymous) {
    complaint.submittedBy = uid;
    complaint.submittedByName = input.name;
  }
  await complaintRef.set(complaint);
  // The id only; never echo identity or timing back.
  return { complaintId: complaintRef.id };
}

export function createFileComplaintHandler({
  db,
  bucket,
  serverTimestamp,
  timestampFromMillis,
  now = Date.now,
  limiter = createMemberLimiter(),
  randomId = () => randomBytes(6).toString('hex'),
}) {
  return (data, auth) =>
    fileComplaintHandler(data, auth, {
      db,
      now,
      limiter,
      randomId,
      serverTimestamp,
      timestampFromMillis,
      async uploadImage(path, buffer, contentType) {
        await bucket.file(path).save(buffer, { contentType, resumable: false });
      },
    });
}
