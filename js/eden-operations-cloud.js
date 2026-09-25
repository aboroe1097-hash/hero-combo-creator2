// Eden Operations Lab — shared staffing counters.
//
// The assigned-player counters are alliance business, so they live in one
// Firestore document that every signed-in member reads and an admin writes
// (rules: eden_operations/current). Firebase stays behind the dynamic imports in
// firebase-sdk.js for the same reason the rest of the site does it: a route that
// never opens the Ops Lab never downloads the SDK, and the chunks Vite builds
// from it are cached like every other asset.
//
// Everything here is best-effort. The lab keeps working offline: the last
// snapshot this device saw is cached in localStorage and read back through
// readCachedSharedCounts(), and a failed save is reported rather than thrown.

import {
  EDEN_OPERATIONS_SHARED_CACHE_KEY,
  EDEN_OPERATIONS_SHARED_PATH,
  normalizeSharedCounts,
  sharedCountsPayload,
} from './eden-operations-model.js';

let _firebaseModule = null;
let _firestoreModule = null;
let _unsubscribe = null;

async function loadFirebase() {
  if (!_firebaseModule) _firebaseModule = await import('./firebase.js');
  return _firebaseModule;
}

async function loadFirestore() {
  if (!_firestoreModule) {
    const { importFirestore } = await import('./firebase-sdk.js');
    _firestoreModule = await importFirestore();
  }
  return _firestoreModule;
}

/** A signed-in session, anonymous or not, so the rules can see a uid. */
async function session() {
  const firebase = await loadFirebase();
  const { db } = firebase.initFirebase();
  await firebase.ensureAnonymousAuth();
  return { firebase, db };
}

/** The last counts this device saw, so the lab still reads with no connection. */
export function readCachedSharedCounts(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem?.(EDEN_OPERATIONS_SHARED_CACHE_KEY);
    return raw ? normalizeSharedCounts(JSON.parse(raw)) : {};
  } catch {
    return {};
  }
}

export function writeCachedSharedCounts(counts, storage = globalThis.localStorage) {
  try {
    storage?.setItem?.(
      EDEN_OPERATIONS_SHARED_CACHE_KEY,
      JSON.stringify(sharedCountsPayload(counts))
    );
  } catch {
    // A device with no storage still reads the live document.
  }
  return counts;
}

/**
 * Whether this viewer may change the counters. The rules decide for real — this
 * only picks which of the two renderings the lab shows, and it is the same admin
 * claim the shared Eden documents use.
 */
export async function viewerCanWriteSharedCounts() {
  try {
    const { firebase } = await session();
    let hasAdminClaim = await firebase.getFirebaseAdminClaim(false);
    if (!hasAdminClaim) hasAdminClaim = await firebase.getFirebaseAdminClaim(true);
    return Boolean(hasAdminClaim);
  } catch {
    return false;
  }
}

/**
 * Watch the shared counters.
 *
 * onCounts receives the counts map, `null` when the document does not exist yet
 * (the alliance has never counted anything) and `undefined` when the sync itself
 * is unavailable, so the caller can tell "empty" from "offline".
 */
export async function startSharedCountsSync({ onCounts } = {}) {
  stopSharedCountsSync();
  try {
    const { db } = await session();
    const { doc, onSnapshot } = await loadFirestore();
    const ref = doc(db, ...EDEN_OPERATIONS_SHARED_PATH);
    _unsubscribe = onSnapshot(
      ref,
      (snap) => onCounts?.(snap.exists() ? normalizeSharedCounts(snap.data().counts) : null),
      () => onCounts?.(undefined)
    );
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error?.message || 'Firebase unavailable' };
  }
}

export function stopSharedCountsSync() {
  _unsubscribe?.();
  _unsubscribe = null;
}

/**
 * Write the counters back. The write is merged, so one objective's change never
 * clears another objective's numbers, and the document is created by the first
 * click if it does not exist yet.
 */
export async function saveSharedCounts(counts) {
  try {
    const { firebase, db } = await session();
    const { doc, serverTimestamp, setDoc } = await loadFirestore();
    const ref = doc(db, ...EDEN_OPERATIONS_SHARED_PATH);
    await setDoc(
      ref,
      {
        counts: sharedCountsPayload(counts),
        updatedAt: serverTimestamp(),
        updatedBy: firebase.getCurrentUser()?.uid || 'unknown',
      },
      { merge: true }
    );
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error?.message || 'Save failed' };
  }
}
