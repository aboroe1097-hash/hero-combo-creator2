// Eden Map scout mode — optional Firebase intel sync
let _firebaseMod = null;
let _firestoreMod = null;

async function loadFirebase() {
  if (!_firebaseMod) _firebaseMod = await import('./firebase.js');
  return _firebaseMod;
}

async function loadFirestore() {
  if (!_firestoreMod) {
    const { importFirestore } = await import('./firebase-sdk.js');
    _firestoreMod = await importFirestore();
  }
  return _firestoreMod;
}

const INTEL_PATH = ['eden_map', 'shared_intel'];

let _unsub = null;

export async function startScoutSync(onIntel) {
  stopScoutSync();
  try {
    const fb = await loadFirebase();
    const { db } = fb.initFirebase();
    await fb.ensureAnonymousAuth();
    const { doc, onSnapshot } = await loadFirestore();
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
