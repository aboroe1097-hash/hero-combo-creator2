// file-complaint.js — the only writer of Eden complaints.
//
// What anonymity means here, precisely: no stored record ties an anonymous
// complaint to an account. The first implementation broke that — it wrote the
// complaint and a `complaint_throttle/{uid}` stamp in one client batch, both at
// request.time, so the two joined on the timestamp. A hashed per-uid stamp does
// not fix it either: whoever holds the hash key can hash every uid and join.
//
// What it does NOT mean: invisibility to a project owner with console access.
// Firestore's own document createTime, Storage object timeCreated, and Firebase
// Auth account activity keep exact times this code cannot round, so in very
// sparse traffic an owner could still guess by timing. The promise the form
// makes is "leadership reading the inbox cannot see who filed", not more.
//
// So this callable persists NOTHING per member:
//   * Rate limits live in memory only: one filing per member per ten minutes,
//     and a few per network per hour (anonymous Auth makes fresh uids free, so
//     the uid limit alone cannot stop one person draining the daily cap).
//     Both are keyed by an HMAC under a random key generated at process start
//     that never leaves the process. The function runs as a single instance
//     (maxInstances: 1 in index.js); a cold start forgets the limits, which
//     only ever lets an honest member file again sooner. A slot is reserved
//     synchronously before the first await, so concurrent requests cannot all
//     pass the check.
//   * The only stored counter is a GLOBAL per-day cap
//     (`complaint_rate_limits/{YYYY-MM-DD}`), which bounds abuse and Storage
//     cost without naming anyone.
//   * An anonymous complaint's createdAt is the start of its UTC day. Named
//     complaints keep the exact server time.
//   * A failed filing gives everything back: uploaded screenshots are deleted,
//     the daily slot is refunded and the member may retry at once.
//
// Images arrive as data: URIs, are checked by their bytes (not the declared
// type), and are written by the Admin SDK under the complaint's own id. The
// Firestore and Storage rules no longer let clients create either.

import { createHmac, randomBytes } from 'node:crypto';

export const COMPLAINT_COLLECTION = 'complaints';
export const COMPLAINT_RATE_LIMIT_COLLECTION = 'complaint_rate_limits';
export const COMPLAINT_STORAGE_ROOT = 'complaints';
export const COMPLAINT_MEMBER_WINDOW_MS = 10 * 60 * 1000;
export const COMPLAINT_NETWORK_WINDOW_MS = 60 * 60 * 1000;
export const COMPLAINT_NETWORK_MAX = 6;
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
 * In-memory sliding-window limiter: at most `max` reservations per key per
 * `windowMs`. Keys are HMACs under a key that is random per process and never
 * stored, so the map cannot be turned back into uids or addresses.
 * `reserve()` is synchronous, so a burst of concurrent requests cannot all pass
 * before the first one is counted; `release()` hands a reservation back.
 */
export function createWindowLimiter({ windowMs, max = 1, key } = {}) {
  const secret = key || randomBytes(32);
  const byKey = new Map();
  const tag = (id) => createHmac('sha256', secret).update(String(id)).digest('base64url');
  const live = (stamps, nowMs) => stamps.filter((at) => nowMs - at < windowMs);
  return {
    reserve(id, nowMs) {
      // Drop expired entries so the map stays bounded by the window's traffic.
      for (const [entry, stamps] of byKey) {
        const kept = live(stamps, nowMs);
        if (kept.length) byKey.set(entry, kept);
        else byKey.delete(entry);
      }
      const key = tag(id);
      const stamps = byKey.get(key) || [];
      if (stamps.length >= max) return false;
      byKey.set(key, [...stamps, nowMs]);
      return true;
    },
    release(id, nowMs) {
      const key = tag(id);
      const stamps = byKey.get(key) || [];
      const index = stamps.lastIndexOf(nowMs);
      if (index === -1) return;
      stamps.splice(index, 1);
      if (stamps.length) byKey.set(key, stamps);
      else byKey.delete(key);
    },
  };
}

export function createMemberLimiter(options = {}) {
  return createWindowLimiter({ windowMs: COMPLAINT_MEMBER_WINDOW_MS, max: 1, ...options });
}

export function createNetworkLimiter(options = {}) {
  return createWindowLimiter({
    windowMs: COMPLAINT_NETWORK_WINDOW_MS,
    max: COMPLAINT_NETWORK_MAX,
    ...options,
  });
}

function dailySlotRef(deps, nowMs) {
  return deps.db.doc(`${COMPLAINT_RATE_LIMIT_COLLECTION}/${complaintDayKey(nowMs)}`);
}

async function claimDailySlot(deps, nowMs) {
  const ref = dailySlotRef(deps, nowMs);
  await deps.db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const count = snapshot.exists ? Number(snapshot.data()?.count) || 0 : 0;
    if (count >= COMPLAINT_DAILY_CAP) {
      throw new FileComplaintError('rate_limited', 'Too many complaints today.');
    }
    transaction.set(ref, { count: count + 1 });
  });
}

async function refundDailySlot(deps, nowMs) {
  const ref = dailySlotRef(deps, nowMs);
  await deps.db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const count = snapshot.exists ? Number(snapshot.data()?.count) || 0 : 0;
    if (count > 0) transaction.set(ref, { count: count - 1 });
  });
}

/**
 * @param {unknown} data   the callable payload
 * @param {{uid?: string}|undefined} auth   request.auth from the callable
 * @param {object} deps    db, uploadImage, deleteImage, memberLimiter,
 *                         networkLimiter, now, serverTimestamp,
 *                         timestampFromMillis, randomId
 * @param {{clientIp?: string}} [context]   used only as an in-memory limiter key
 */
export async function fileComplaintHandler(data, auth, deps, context = {}) {
  const uid = typeof auth?.uid === 'string' ? auth.uid : '';
  if (!uid) throw new FileComplaintError('unauthenticated', 'Sign-in required.');
  const input = validateComplaintInput(data);
  const nowMs = Number(deps.now());
  const network =
    typeof context.clientIp === 'string' && context.clientIp ? `ip:${context.clientIp}` : '';

  // Reserve before the first await: see createWindowLimiter().
  if (!deps.memberLimiter.reserve(uid, nowMs)) {
    throw new FileComplaintError('rate_limited', 'Please wait before filing again.');
  }
  if (network && !deps.networkLimiter.reserve(network, nowMs)) {
    deps.memberLimiter.release(uid, nowMs);
    throw new FileComplaintError('rate_limited', 'Please wait before filing again.');
  }

  let slotClaimed = false;
  const uploaded = [];
  try {
    await claimDailySlot(deps, nowMs);
    slotClaimed = true;

    const complaintRef = deps.db.collection(COMPLAINT_COLLECTION).doc();
    for (const [index, image] of input.images.entries()) {
      const path = `${COMPLAINT_STORAGE_ROOT}/${complaintRef.id}/${index}-${deps.randomId()}.${image.extension}`;
      await deps.uploadImage(path, image.buffer, image.contentType);
      uploaded.push(path);
    }

    const complaint = {
      category: input.category,
      description: input.description,
      images: uploaded,
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
  } catch (error) {
    // Give everything back so a transient failure costs the member nothing.
    deps.memberLimiter.release(uid, nowMs);
    if (network) deps.networkLimiter.release(network, nowMs);
    await Promise.allSettled(uploaded.map((path) => deps.deleteImage(path)));
    if (slotClaimed) await refundDailySlot(deps, nowMs).catch(() => {});
    throw error;
  }
}

export function createFileComplaintHandler({
  db,
  bucket,
  serverTimestamp,
  timestampFromMillis,
  now = Date.now,
  memberLimiter = createMemberLimiter(),
  networkLimiter = createNetworkLimiter(),
  randomId = () => randomBytes(6).toString('hex'),
}) {
  return (data, auth, context) =>
    fileComplaintHandler(
      data,
      auth,
      {
        db,
        now,
        memberLimiter,
        networkLimiter,
        randomId,
        serverTimestamp,
        timestampFromMillis,
        async uploadImage(path, buffer, contentType) {
          await bucket.file(path).save(buffer, { contentType, resumable: false });
        },
        async deleteImage(path) {
          await bucket.file(path).delete({ ignoreNotFound: true });
        },
      },
      context
    );
}
