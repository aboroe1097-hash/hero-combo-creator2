import { THRONE_BUFF_IDS } from './throne-buffs-data.js';
import { normalizeWeekAssignment, isValidWeekKey } from './throne-buffs-model.js';

export const THRONE_HISTORY_PATH = 'vts_admin/throne_buffs/records';

export async function loadThroneHistory({ db, firestore }) {
  const { collection, getDocs, query, orderBy, limit } = firestore;
  const snapshot = await getDocs(
    query(collection(db, THRONE_HISTORY_PATH), orderBy('weekKey', 'desc'), limit(104))
  );
  return snapshot.docs.map((entry) => ({
    ...normalizeWeekAssignment(entry.data(), THRONE_BUFF_IDS),
    syncRevision: entry.data().syncRevision,
  }));
}

export async function saveThroneWeek({ db, firestore, uid, record, expectedRevision = 0 }) {
  const { doc, runTransaction, serverTimestamp } = firestore;
  const normalized = normalizeWeekAssignment(record, THRONE_BUFF_IDS);
  if (!isValidWeekKey(normalized.weekKey)) throw new Error('Choose a valid assignment week.');
  return runTransaction(db, async (tx) => {
    const ref = doc(db, THRONE_HISTORY_PATH, normalized.weekKey);
    const snapshot = await tx.get(ref);
    const revision = snapshot.exists() ? snapshot.data().syncRevision : 0;
    if (revision !== expectedRevision)
      throw new Error('Another Admin changed this week. Refresh and review before saving.');
    const saved = {
      ...normalized,
      syncRevision: revision + 1,
      updatedAtMs: Date.now(),
      updatedBy: uid,
    };
    tx.set(ref, { ...saved, updatedAt: serverTimestamp() });
    return saved;
  });
}
