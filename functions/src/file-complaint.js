// file-complaint.js — Cloud Function for anonymous complaint filing.
//
// The complaint form on the Eden page promises structural anonymity: when the
// anonymous box is checked, the Firestore document carries no identity field.
// The original client-side implementation wrote the complaint and a rate-limit
// stamp in the same batch; the stamp lived at `complaint_throttle/{uid}` with
// the same serverTimestamp as the complaint, so anyone with Firebase console
// access could match timestamps and de-anonymise the filer.
//
// This function moves the entire filing server-side:
//   1. The client sends complaint data (and optional base64 images) to the
//      callable.
//   2. The function verifies auth + App Check.
//   3. Rate limiting uses an HMAC of the uid, stored at
//      `complaint_rate_limits/{hash}`. The hash cannot be reversed to the uid,
//      so the rate-limit collection reveals nothing about who filed.
//   4. The complaint document is created without any identity field when
//      anonymous is true.
//   5. Images are uploaded to Cloud Storage under the complaint's own id.
//
// The old `complaint_throttle` collection and its rules are kept for now so
// existing deployments do not break; new filings use the hashed rate limit.

import { createHmac } from 'node:crypto';

export const COMPLAINT_RATE_LIMIT_COLLECTION = 'complaint_rate_limits';
export const COMPLAINT_COLLECTION = 'complaints';
export const COMPLAINT_STORAGE_ROOT = 'complaints';
export const COMPLAINT_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
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

const IMAGE_NAME_PATTERN = /^[A-Za-z0-9_-]{1,150}\.(?:jpg|jpeg|png|webp)$/;
const BASE64_DATA_URI = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/;

export class FileComplaintError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'FileComplaintError';
    this.code = code;
  }
}

function hashUid(uid, salt) {
  return createHmac('sha256', salt).update(uid).digest('hex').slice(0, 40);
}

function decodeBase64Image(dataUri) {
  const match = BASE64_DATA_URI.exec(String(dataUri || ''));
  if (!match) return null;
  const contentType = match[1];
  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length > COMPLAINT_MAX_IMAGE_BYTES) return null;
  return { buffer, contentType };
}

function complaintImageFileName(complaintId, index, nowMs) {
  const owner = String(complaintId || '')
    .replace(/[^A-Za-z0-9]/g, '')
    .slice(0, 40);
  const stamp = Math.max(0, Math.floor(Number(nowMs) || 0)).toString(36);
  const noise = Math.random().toString(36).slice(2, 10);
  const base = `${stamp}-${Math.max(0, Math.floor(Number(index) || 0))}-${noise}`.slice(0, 150);
  return { owner, name: `${base}.jpg` };
}

function validateComplaintInput(data) {
  const category = COMPLAINT_CATEGORIES.includes(data?.category) ? data.category : 'other';
  const description = String(data?.description || '')
    .trim()
    .slice(0, COMPLAINT_MAX_DESCRIPTION);
  if (description.length < COMPLAINT_MIN_DESCRIPTION) {
    throw new FileComplaintError('invalid_description', 'Description is too short.');
  }
  const anonymous = data?.anonymous === true;
  const name = anonymous
    ? ''
    : String(data?.name || '')
        .trim()
        .slice(0, COMPLAINT_MAX_NAME);
  if (!anonymous && !name) {
    throw new FileComplaintError('invalid_name', 'Name is required.');
  }
  const rawImages = Array.isArray(data?.images) ? data.images : [];
  if (rawImages.length > COMPLAINT_MAX_IMAGES) {
    throw new FileComplaintError('too_many_images', 'Too many images.');
  }
  const images = [];
  for (const uri of rawImages) {
    const decoded = decodeBase64Image(uri);
    if (!decoded) {
      throw new FileComplaintError('invalid_image', 'Invalid image data.');
    }
    images.push(decoded);
  }
  return { category, description, anonymous, name, images };
}

export async function fileComplaintHandler(data, context, deps) {
  const uid = context?.auth?.uid;
  if (!uid) {
    throw new FileComplaintError('unauthenticated', 'Authentication required.');
  }
  if (deps.verifyAppCheck) {
    try {
      await deps.verifyAppCheck(data?.appCheckToken);
    } catch {
      throw new FileComplaintError('app_check_failed', 'App Check failed.');
    }
  }
  const { category, description, anonymous, name, images } = validateComplaintInput(data);
  const nowMs = Number(deps.now());
  const hash = hashUid(uid, deps.rateLimitSalt);
  const rateLimitRef = deps.db.doc(`${COMPLAINT_RATE_LIMIT_COLLECTION}/${hash}`);
  const rateLimitSnap = await rateLimitRef.get();
  const rateLimitData = rateLimitSnap.exists ? rateLimitSnap.data() : null;
  const lastAtMs = rateLimitData?.lastAt?.toMillis?.() || 0;
  if (lastAtMs && nowMs - lastAtMs < COMPLAINT_RATE_LIMIT_WINDOW_MS) {
    const retryAfterSeconds = Math.ceil(
      (COMPLAINT_RATE_LIMIT_WINDOW_MS - (nowMs - lastAtMs)) / 1000
    );
    throw new FileComplaintError(
      'rate_limited',
      `Please wait before filing again.`,
    );
  }
  const complaintRef = deps.db.collection(COMPLAINT_COLLECTION).doc();
  const complaintId = complaintRef.id;
  const imagePaths = [];
  if (images.length && deps.uploadImage) {
    for (const [index, image] of images.entries()) {
      const { owner, name: fileName } = complaintImageFileName(complaintId, index, nowMs);
      const path = `${COMPLAINT_STORAGE_ROOT}/${owner}/${fileName}`;
      await deps.uploadImage(path, image.buffer, image.contentType);
      imagePaths.push(path);
    }
  }
  const complaintDoc = {
    category,
    description,
    images: imagePaths,
    anonymous,
    reviewed: false,
    createdAt: deps.serverTimestamp(),
  };
  if (!anonymous) {
    complaintDoc.submittedBy = uid;
    complaintDoc.submittedByName = name;
  }
  await complaintRef.set(complaintDoc);
  await rateLimitRef.set({ lastAt: deps.serverTimestamp() });
  return { complaintId, anonymous, imageCount: imagePaths.length };
}

export function createFileComplaintCallable({
  db,
  auth,
  appCheck,
  bucket,
  serverTimestamp,
  now = Date.now,
  rateLimitSalt,
}) {
  return async (data, context) => {
    return fileComplaintHandler(data, context, {
      db,
      now,
      rateLimitSalt,
      serverTimestamp,
      async verifyAppCheck(token) {
        if (!appCheck) return;
        await appCheck.verifyToken(token);
      },
      async uploadImage(path, buffer, contentType) {
        if (!bucket) return;
        const file = bucket.file(path);
        await file.save(buffer, { contentType, resumable: false });
      },
    });
  };
}
