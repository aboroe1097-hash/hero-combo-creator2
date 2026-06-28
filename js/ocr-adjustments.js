import { compactPlayerIdentity, resolveCanonicalPlayerIdentity } from './ocr-name-normalizer.js';

export const R5_ADJUSTMENTS_COLLECTION_PATH = 'vts_admin/conduct_adjustments/records';
export const R5_ADJUSTMENTS_LOCAL_KEY = 'vts_r5_conduct_adjustments';

export const R5_ADJUSTMENT_CATEGORIES = Object.freeze({
  banner_help: Object.freeze({
    key: 'banner_help',
    type: 'merit',
    defaultPoints: 1,
    label: 'Banner help',
  }),
  connected_road: Object.freeze({
    key: 'connected_road',
    type: 'merit',
    defaultPoints: 1,
    label: 'Connected road',
  }),
  extra_effort: Object.freeze({
    key: 'extra_effort',
    type: 'merit',
    defaultPoints: 1,
    label: 'Extra effort',
  }),
  merit_other: Object.freeze({
    key: 'merit_other',
    type: 'merit',
    defaultPoints: 1,
    label: 'Merit - other',
  }),
  path_block: Object.freeze({
    key: 'path_block',
    type: 'penalty',
    defaultPoints: -1,
    label: 'Blocked path',
  }),
  toxicity: Object.freeze({
    key: 'toxicity',
    type: 'penalty',
    defaultPoints: -1,
    label: 'Toxicity',
  }),
  ignored_coordination: Object.freeze({
    key: 'ignored_coordination',
    type: 'penalty',
    defaultPoints: -1,
    label: 'Ignored coordination',
  }),
  penalty_other: Object.freeze({
    key: 'penalty_other',
    type: 'penalty',
    defaultPoints: -1,
    label: 'Penalty - other',
  }),
  forfeit_premium: Object.freeze({
    key: 'forfeit_premium',
    type: 'flag',
    defaultPoints: 0,
    label: 'Forfeit premium reward',
  }),
  grant_premium: Object.freeze({
    key: 'grant_premium',
    type: 'flag',
    defaultPoints: 0,
    label: 'Grant premium reward',
  }),
});

export const R5_ADJUSTMENT_CATEGORY_KEYS = Object.freeze(Object.keys(R5_ADJUSTMENT_CATEGORIES));

const MAX_R5_POINTS = 1000;
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

export function normalizeR5AdjustmentRecords(records = [], options = {}) {
  const normalized = [];
  (Array.isArray(records) ? records : []).forEach((entry) => {
    try {
      normalized.push(
        normalizeR5Adjustment(entry, {
          ...options,
          season: entry?.season || options.season,
        })
      );
    } catch {
      // Ignore malformed historical cloud rows so one bad document cannot
      // hide every valid conduct adjustment for the season.
    }
  });
  return normalized;
}

export function aggregateR5Bonuses(adjustments = [], season) {
  const seasonKey = normalizeR5Season(season);
  const totals = new Map();

  normalizeR5AdjustmentRecords(adjustments, { season: seasonKey }).forEach((adjustment) => {
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

function canUseLocalStorage() {
  return typeof localStorage !== 'undefined' && localStorage;
}

function readLocalR5AdjustmentRecords() {
  if (!canUseLocalStorage()) return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(R5_ADJUSTMENTS_LOCAL_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalR5AdjustmentRecords(records) {
  if (!canUseLocalStorage()) return;
  localStorage.setItem(
    R5_ADJUSTMENTS_LOCAL_KEY,
    JSON.stringify(Array.isArray(records) ? records : [])
  );
}

function sortR5Adjustments(records) {
  return (Array.isArray(records) ? records : []).sort((a, b) => {
    const aMs =
      typeof a.createdAt?.toMillis === 'function'
        ? a.createdAt.toMillis()
        : Date.parse(a.createdAt || '') || 0;
    const bMs =
      typeof b.createdAt?.toMillis === 'function'
        ? b.createdAt.toMillis()
        : Date.parse(b.createdAt || '') || 0;
    return bMs - aMs;
  });
}

function localR5AdjustmentId() {
  const random =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  return `local_r5_${random}`;
}

function isR5PersistenceUnavailable(err) {
  const text = `${err?.code || ''} ${err?.message || err || ''}`;
  return /firebase is not configured|firebase not initialized|firestore is not available/i.test(
    text
  );
}

export function loadLocalR5Adjustments(season) {
  const seasonKey = normalizeR5Season(season);
  return sortR5Adjustments(
    normalizeR5AdjustmentRecords(readLocalR5AdjustmentRecords(), { season: seasonKey }).filter(
      (entry) => entry?.season === seasonKey
    )
  );
}

export function createLocalR5Adjustment(input) {
  const record = normalizeR5Adjustment({
    ...input,
    id: input?.id || localR5AdjustmentId(),
    createdAt: input?.createdAt || new Date().toISOString(),
    createdBy: input?.createdBy || 'local-admin',
  });
  const records = readLocalR5AdjustmentRecords().filter((entry) => entry?.id !== record.id);
  records.push(record);
  writeLocalR5AdjustmentRecords(records);
  return record;
}

export function updateLocalR5Adjustment(adjustmentId, patch = {}) {
  const id = requireString(adjustmentId, 'R5 adjustment id', 80);
  const records = readLocalR5AdjustmentRecords();
  const index = records.findIndex((entry) => entry?.id === id);
  if (index < 0) throw new Error('R5 adjustment not found');
  const current = records[index];
  const next = { ...current };

  if ('category' in patch) next.category = getR5AdjustmentCategory(patch.category).key;
  if ('points' in patch) {
    next.points = normalizeR5Points(patch.points);
  } else if ('category' in patch && patch.useCategoryDefault === true) {
    next.points = defaultR5PointsForCategory(next.category);
  }
  if ('note' in patch) {
    next.note = String(patch.note || '')
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
    next.playerKey = identity.playerKey;
    next.playerName = identity.playerName;
  }

  records[index] = normalizeR5Adjustment(next, { season: next.season });
  writeLocalR5AdjustmentRecords(records);
  return records[index];
}

export function deleteLocalR5Adjustment(adjustmentId) {
  const id = requireString(adjustmentId, 'R5 adjustment id', 80);
  const records = readLocalR5AdjustmentRecords();
  writeLocalR5AdjustmentRecords(records.filter((entry) => entry?.id !== id));
  return true;
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
  try {
    const { db, firestore } = await ensureR5AdjustmentAdminContext();
    const { collection, getDocs, query, where } = firestore;
    const seasonKey = normalizeR5Season(season);
    const snapshot = await getDocs(
      query(collection(db, R5_ADJUSTMENTS_COLLECTION_PATH), where('season', '==', seasonKey))
    );

    return sortR5Adjustments(
      normalizeR5AdjustmentRecords(
        snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })),
        { season: seasonKey }
      )
    );
  } catch (err) {
    if (isR5PersistenceUnavailable(err)) return loadLocalR5Adjustments(season);
    throw err;
  }
}

export async function createR5Adjustment(input) {
  try {
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
  } catch (err) {
    if (isR5PersistenceUnavailable(err)) return createLocalR5Adjustment(input);
    throw err;
  }
}

export async function updateR5Adjustment(adjustmentId, patch) {
  try {
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
  } catch (err) {
    if (isR5PersistenceUnavailable(err)) return updateLocalR5Adjustment(adjustmentId, patch);
    throw err;
  }
}

export async function deleteR5Adjustment(adjustmentId) {
  try {
    const { db, firestore } = await ensureR5AdjustmentAdminContext();
    const { deleteDoc, doc } = firestore;
    await deleteDoc(
      doc(db, R5_ADJUSTMENTS_COLLECTION_PATH, requireString(adjustmentId, 'R5 adjustment id', 80))
    );
    return true;
  } catch (err) {
    if (isR5PersistenceUnavailable(err)) return deleteLocalR5Adjustment(adjustmentId);
    throw err;
  }
}
