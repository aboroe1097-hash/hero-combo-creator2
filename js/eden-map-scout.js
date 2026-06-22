// Eden Map scout mode — optional Firebase intel sync
import { initFirebase, ensureAnonymousAuth, getFirebaseAdminClaim, getAuthInstance } from './firebase.js';
import { importFirestore } from './firebase-sdk.js';

const {
  doc, getDoc, setDoc, onSnapshot, serverTimestamp,
} = await importFirestore();

const INTEL_PATH = ['eden_map', 'shared_intel'];

let _unsub = null;

export async function startScoutSync(onIntel) {
  stopScoutSync();
  try {
    const { db } = initFirebase();
    await ensureAnonymousAuth();
    const ref = doc(db, ...INTEL_PATH);
    _unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) onIntel?.(snap.data());
    }, () => onIntel?.(null));
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err?.message || 'Firebase unavailable' };
  }
}

export function stopScoutSync() {
  _unsub?.();
  _unsub = null;
}

export async function pullScoutIntel() {
  try {
    const { db } = initFirebase();
    await ensureAnonymousAuth();
    const ref = doc(db, ...INTEL_PATH);
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data() : null;
  } catch {
    return null;
  }
}

export async function pushScoutIntel(plan) {
  try {
    const { db } = initFirebase();
    await ensureAnonymousAuth();
    let hasAdminClaim = await getFirebaseAdminClaim(false);
    if (!hasAdminClaim) hasAdminClaim = await getFirebaseAdminClaim(true);
    if (!hasAdminClaim) {
      const uid = getAuthInstance()?.currentUser?.uid || 'unknown';
      return {
        ok: false,
        error: `Firebase admin claim missing for UID ${uid}. Run npm run firebase:admin-claim, then reload.`,
      };
    }
    const ref = doc(db, ...INTEL_PATH);
    await setDoc(ref, {
      guilds: plan.guilds || {},
      status: plan.status || {},
      updatedAt: serverTimestamp(),
      updatedBy: 'eden-map-planner',
    }, { merge: true });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err?.message || 'Push failed' };
  }
}

export function mergeScoutIntel(plan, intel) {
  if (!intel) return plan;
  return {
    ...plan,
    guilds: { ...plan.guilds, ...intel.guilds },
    status: { ...plan.status, ...intel.status },
  };
}
