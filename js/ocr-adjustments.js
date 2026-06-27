import { compactPlayerIdentity, resolveCanonicalPlayerIdentity } from './ocr-name-normalizer.js';

export const R5_ADJUSTMENTS_COLLECTION_PATH = 'vts_admin/conduct_adjustments/records';

export const R5_ADJUSTMENT_CATEGORIES = Object.freeze({
  banner_help: Object.freeze({
    key: 'banner_help',
    type: 'merit',
    defaultPoints: 15000,
    label: 'Banner help',
  }),
  connected_road: Object.freeze({
    key: 'connected_road',
    type: 'merit',
    defaultPoints: 20000,
    label: 'Connected road',
  }),
  extra_effort: Object.freeze({
    key: 'extra_effort',
    type: 'merit',
    defaultPoints: 10000,
    label: 'Extra effort',
  }),
  merit_other: Object.freeze({
    key: 'merit_other',
    type: 'merit',
    defaultPoints: 5000,
    label: 'Merit - other',
  }),
  path_block: Object.freeze({
    key: 'path_block',
    type: 'penalty',
    defaultPoints: -20000,
    label: 'Blocked path',
  }),
  toxicity: Object.freeze({
    key: 'toxicity',
    type: 'penalty',
    defaultPoints: -25000,
    label: 'Toxicity',
  }),
  ignored_coordination: Object.freeze({
    key: 'ignored_coordination',
    type: 'penalty',
    defaultPoints: -10000,
    label: 'Ignored coordination',
  }),
  penalty_other: Object.freeze({
    key: 'penalty_other',
    type: 'penalty',
    defaultPoints: -5000,
    label: 'Penalty - other',
  }),
});

export const R5_ADJUSTMENT_CATEGORY_KEYS = Object.freeze(Object.keys(R5_ADJUSTMENT_CATEGORIES));

const MAX_R5_POINTS = 10000000;
const DEFAULT_CATEGORY = 'merit_other';
const TOTAL_FIELDS = ['total_demolition', 'totalDemolition', 'ocrTotal', 'total', 'value'];

function requireString(value, label, maxLength) {
  const text = String(value || '').trim();
  if (!text) throw new Error(`${label} is required`);
  if (text.length > maxLength) throw new Error(`${label} is too long`);
  return text;
}

export function normalizeR5Season(season) {
  return requireString(season, 'R5 adjustment season', 40);
}

export function getR5AdjustmentCategory(categoryKey = DEFAULT_CATEGORY) {
  const key = String(categoryKey || '').trim();
  const category = R5_ADJUSTMENT_CATEGORIES[key];
  if (!category) throw new Error(`Unknown R5 adjustment category: ${key || '(empty)'}`);
  return category;
}

export function defaultR5PointsForCategory(categoryKey) {
  return getR5AdjustmentCategory(categoryKey).defaultPoints;
}

export function normalizeR5Points(points) {
  const numeric = Number(points);
  if (!Number.isFinite(numeric)) throw new Error('R5 adjustment points must be a number');
  const integer = Math.trunc(numeric);
  if (integer !== numeric) throw new Error('R5 adjustment points must be an integer');
  if (integer < -MAX_R5_POINTS || integer > MAX_R5_POINTS) {
    throw new Error(`R5 adjustment points must be between -${MAX_R5_POINTS} and ${MAX_R5_POINTS}`);
  }
  return integer;
}

export function resolveR5PlayerIdentity(player, options = {}) {
  const identity = resolveCanonicalPlayerIdentity(player, {
    attackPlayers: options.attackPlayers || player?.attackPlayers || [],
  });
  return {
    playerKey: identity.playerKey,
    playerName: requireString(identity.playerName, 'Resolved R5 adjustment player', 120),
  };
}

export function normalizeR5Adjustment(input, options = {}) {
  const category = getR5AdjustmentCategory(input?.category || options.defaultCategory).key;
  const points =
    input?.points === undefined || input?.points === null || input?.points === ''
      ? defaultR5PointsForCategory(category)
      : normalizeR5Points(input.points);
  const identity =
    input?.playerKey && input?.playerName
      ? {
          playerKey: requireString(input.playerKey, 'R5 adjustment player key', 120),
          playerName: requireString(input.playerName, 'R5 adjustment player name', 120),
        }
      : resolveR5PlayerIdentity(input?.player || input, options);

  return {
    id: input?.id ? requireString(input.id, 'R5 adjustment id', 80) : '',
    season: normalizeR5Season(input?.season ?? options.season),
    playerKey: compactPlayerIdentity(identity.playerKey || identity.playerName),
    playerName: identity.playerName,
    points,
    category,
    note: String(input?.note || '')
      .trim()
      .slice(0, 500),
    createdAt: input?.createdAt || null,
    createdBy: input?.createdBy ? requireString(input.createdBy, 'R5 adjustment creator', 128) : '',
  };
}

export function aggregateR5Bonuses(adjustments = [], season) {
  const seasonKey = normalizeR5Season(season);
  const totals = new Map();

  (Array.isArray(adjustments) ? adjustments : []).forEach((entry) => {
    let adjustment;
    try {
      adjustment = normalizeR5Adjustment(entry, { season: entry?.season || seasonKey });
    } catch {
      return;
    }
    if (adjustment.season !== seasonKey) return;
    totals.set(adjustment.playerKey, (totals.get(adjustment.playerKey) || 0) + adjustment.points);
  });

  return totals;
}

function readOcrTotal(row) {
  for (const field of TOTAL_FIELDS) {
    if (row?.[field] === undefined || row?.[field] === null) continue;
    const value = Number(row[field]);
    if (Number.isFinite(value)) return value;
  }
  return 0;
}

export function applyR5AdjustmentsToPlayerTotals(playerRows = [], adjustments = [], season) {
  const bonusMap = aggregateR5Bonuses(adjustments, season);

  return (Array.isArray(playerRows) ? playerRows : []).map((row) => {
    const identity =
      row?.playerKey && row?.name
        ? { playerKey: compactPlayerIdentity(row.playerKey), playerName: row.name }
        : resolveR5PlayerIdentity(row || {});
    const bonusR5 = bonusMap.get(identity.playerKey) || 0;
    const ocrTotal = readOcrTotal(row);
    return {
      ...row,
      playerKey: identity.playerKey,
      bonusR5,
      adjustedTotal: ocrTotal + bonusR5,
    };
  });
}

export function buildAdjustedGiftRanking(playerRows = [], adjustments = [], season, options = {}) {
  const limit = Number.isFinite(Number(options.limit)) ? Number(options.limit) : 20;
  return applyR5AdjustmentsToPlayerTotals(playerRows, adjustments, season)
    .sort(
      (a, b) =>
        b.adjustedTotal - a.adjustedTotal ||
        String(a.name || '').localeCompare(String(b.name || ''))
    )
    .slice(0, Math.max(0, limit))
    .map((row, index) => ({ ...row, adjustedRank: index + 1 }));
}

async function loadFirestoreApi() {
  const [{ importFirestore }, firebaseApi] = await Promise.all([
    import('./firebase-sdk.js'),
    import('./firebase.js'),
  ]);
  return { firestore: await importFirestore(), firebaseApi };
}

async function ensureR5AdjustmentAdminContext() {
  const { firestore, firebaseApi } = await loadFirestoreApi();
  const firebase = firebaseApi.initFirebase();
  if (!firebase?.configured) throw new Error('Firebase is not configured for R5 adjustments');

  const user = firebaseApi.getCurrentUser?.();
  if (!user || user.isAnonymous) {
    throw new Error('Sign in as admin before changing R5 conduct adjustments');
  }
  const isAdmin = await firebaseApi.getFirebaseAdminClaim(true);
  if (!isAdmin) throw new Error('Admin claim is required for R5 conduct adjustments');

  const db = firebaseApi.getDb();
  if (!db) throw new Error('Firestore is not available for R5 adjustments');
  return { db, user, firestore };
}

export async function loadR5Adjustments(season) {
  const { db, firestore } = await ensureR5AdjustmentAdminContext();
  const { collection, getDocs, query, where } = firestore;
  const seasonKey = normalizeR5Season(season);
  const snapshot = await getDocs(
    query(collection(db, R5_ADJUSTMENTS_COLLECTION_PATH), where('season', '==', seasonKey))
  );

  return snapshot.docs
    .map((docSnap) => normalizeR5Adjustment({ id: docSnap.id, ...docSnap.data() }))
    .sort((a, b) => {
      const aMs = typeof a.createdAt?.toMillis === 'function' ? a.createdAt.toMillis() : 0;
      const bMs = typeof b.createdAt?.toMillis === 'function' ? b.createdAt.toMillis() : 0;
      return bMs - aMs;
    });
}

export async function createR5Adjustment(input) {
  const { db, user, firestore } = await ensureR5AdjustmentAdminContext();
  const { collection, doc, serverTimestamp, setDoc } = firestore;
  const ref = doc(collection(db, R5_ADJUSTMENTS_COLLECTION_PATH));
  const record = normalizeR5Adjustment({
    ...input,
    id: ref.id,
    createdAt: serverTimestamp(),
    createdBy: user.uid,
  });

  await setDoc(ref, record);
  return record;
}

export async function updateR5Adjustment(adjustmentId, patch) {
  const { db, firestore } = await ensureR5AdjustmentAdminContext();
  const { doc, updateDoc } = firestore;
  const updates = {};

  if ('category' in patch) {
    updates.category = getR5AdjustmentCategory(patch.category).key;
  }
  if ('points' in patch) {
    updates.points = normalizeR5Points(patch.points);
  } else if ('category' in updates && patch.useCategoryDefault === true) {
    updates.points = defaultR5PointsForCategory(updates.category);
  }
  if ('note' in patch) {
    updates.note = String(patch.note || '')
      .trim()
      .slice(0, 500);
  }
  if ('player' in patch || ('playerName' in patch && 'playerKey' in patch)) {
    const identity =
      patch.playerName && patch.playerKey
        ? {
            playerKey: compactPlayerIdentity(patch.playerKey),
            playerName: requireString(patch.playerName, 'R5 adjustment player name', 120),
          }
        : resolveR5PlayerIdentity(patch.player);
    updates.playerKey = identity.playerKey;
    updates.playerName = identity.playerName;
  }

  if (!Object.keys(updates).length) return {};
  await updateDoc(
    doc(db, R5_ADJUSTMENTS_COLLECTION_PATH, requireString(adjustmentId, 'R5 adjustment id', 80)),
    updates
  );
  return updates;
}

export async function deleteR5Adjustment(adjustmentId) {
  const { db, firestore } = await ensureR5AdjustmentAdminContext();
  const { deleteDoc, doc } = firestore;
  await deleteDoc(
    doc(db, R5_ADJUSTMENTS_COLLECTION_PATH, requireString(adjustmentId, 'R5 adjustment id', 80))
  );
  return true;
}
