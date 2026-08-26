// js/ocr-conduct-suggestions.js
//
// Admin-suggested bonus team effort points.
//
// Only a superadmin may write a conduct adjustment, but the people who see the
// behaviour worth rewarding or penalising are the ordinary admins. A suggestion
// is the same payload as an adjustment plus who proposed it and where it stands
// in review; approving one is what mints the real adjustment. Suggestions are
// never scored and never reach the public projection, so an unreviewed queue
// cannot move anybody's rank.

import { compactPlayerIdentity } from './ocr-name-normalizer.js';
import {
  defaultR5PointsForCategory,
  ensureR5AdjustmentAdminContext,
  getR5AdjustmentCategory,
  isR5PersistenceUnavailable,
  normalizeR5Points,
  normalizeR5Season,
  resolveR5PlayerIdentity,
} from './ocr-adjustments.js';
import {
  edenWorkspaceFirestorePath,
  edenWorkspaceMutationError,
  edenWorkspaceStorageKey,
  getActiveAdminWorkspaceId,
} from './eden-workspaces.js';

const ACTIVE_SUGGESTIONS_WORKSPACE_ID = getActiveAdminWorkspaceId();

export const CONDUCT_SUGGESTIONS_COLLECTION_PATH = edenWorkspaceFirestorePath(
  ACTIVE_SUGGESTIONS_WORKSPACE_ID,
  'conductSuggestions'
);
export const CONDUCT_SUGGESTIONS_LOCAL_KEY = edenWorkspaceStorageKey(
  'vts_conduct_suggestions',
  ACTIVE_SUGGESTIONS_WORKSPACE_ID
);

export const CONDUCT_SUGGESTION_STATUSES = Object.freeze(['pending', 'approved', 'rejected']);

const MAX_TEXT = 500;
const MAX_LABEL = 160;

function trimmed(value, max) {
  return String(value || '')
    .trim()
    .slice(0, max);
}

export function normalizeConductSuggestionStatus(status) {
  const key = String(status || '')
    .trim()
    .toLowerCase();
  return CONDUCT_SUGGESTION_STATUSES.includes(key) ? key : 'pending';
}

export function normalizeConductSuggestion(input, options = {}) {
  const category = getR5AdjustmentCategory(input?.category || options.defaultCategory).key;
  const points =
    input?.points === undefined || input?.points === null || input?.points === ''
      ? defaultR5PointsForCategory(category)
      : normalizeR5Points(input.points);
  const identity =
    input?.playerKey && input?.playerName
      ? {
          playerKey: compactPlayerIdentity(input.playerKey),
          playerName: trimmed(input.playerName, 120),
        }
      : resolveR5PlayerIdentity(input?.player || input, options);
  if (!identity.playerName) throw new Error('Conduct suggestion player is required');

  const id = trimmed(input?.id, 80);
  const suggestedBy = trimmed(input?.suggestedBy, 128);
  if (!suggestedBy) throw new Error('Conduct suggestion author is required');

  return {
    id,
    season: normalizeR5Season(input?.season ?? options.season),
    playerKey: compactPlayerIdentity(identity.playerKey || identity.playerName),
    playerName: identity.playerName,
    points,
    category,
    note: trimmed(input?.note, MAX_TEXT),
    status: normalizeConductSuggestionStatus(input?.status),
    suggestedBy,
    suggestedByName: trimmed(input?.suggestedByName, MAX_LABEL),
    createdAt: input?.createdAt || null,
    reviewedBy: trimmed(input?.reviewedBy, 128),
    reviewedAtMs: Number.isFinite(Number(input?.reviewedAtMs))
      ? Math.max(0, Math.trunc(Number(input.reviewedAtMs)))
      : 0,
    reviewNote: trimmed(input?.reviewNote, MAX_TEXT),
    adjustmentId: trimmed(input?.adjustmentId, 80),
  };
}

export function normalizeConductSuggestionRecords(records = [], options = {}) {
  const normalized = [];
  (Array.isArray(records) ? records : []).forEach((entry) => {
    try {
      normalized.push(
        normalizeConductSuggestion(entry, { ...options, season: entry?.season || options.season })
      );
    } catch {
      // One malformed cloud row must not hide the rest of the review queue.
    }
  });
  return normalized;
}

export function conductSuggestionCreatedAtMs(record) {
  const raw = record?.createdAt;
  if (typeof raw?.toMillis === 'function') return raw.toMillis();
  return Date.parse(raw || '') || 0;
}

export function sortConductSuggestions(records = []) {
  // Pending first — the queue exists to be emptied — then newest to oldest.
  return (Array.isArray(records) ? records : []).slice().sort((a, b) => {
    const aPending = a?.status === 'pending' ? 0 : 1;
    const bPending = b?.status === 'pending' ? 0 : 1;
    if (aPending !== bPending) return aPending - bPending;
    return conductSuggestionCreatedAtMs(b) - conductSuggestionCreatedAtMs(a);
  });
}

export function summarizeConductSuggestions(records = [], season) {
  const seasonKey = String(season || '').trim();
  const summary = { total: 0, pending: 0, approved: 0, rejected: 0, authors: 0 };
  const authors = new Set();
  (Array.isArray(records) ? records : []).forEach((record) => {
    if (seasonKey && record?.season !== seasonKey) return;
    summary.total += 1;
    summary[normalizeConductSuggestionStatus(record?.status)] += 1;
    if (record?.suggestedBy) authors.add(record.suggestedBy);
  });
  summary.authors = authors.size;
  return summary;
}

// The adjustment a superadmin creates when they approve. The note carries the
// suggesting admin forward so the resulting conduct row explains itself in the
// public breakdown without a second lookup.
export function conductSuggestionToAdjustment(suggestion) {
  const record = normalizeConductSuggestion(suggestion, { season: suggestion?.season });
  const author = record.suggestedByName || record.suggestedBy;
  const attribution = author ? `Suggested by ${author}` : '';
  const note = [record.note, attribution].filter(Boolean).join(' - ').slice(0, MAX_TEXT);
  return {
    season: record.season,
    playerKey: record.playerKey,
    playerName: record.playerName,
    category: record.category,
    points: record.points,
    note,
  };
}

// --- Local mirror (used when Firebase is unavailable) ------------------------

function canUseLocalStorage() {
  return typeof localStorage !== 'undefined' && localStorage;
}

function readLocalRecords() {
  if (!canUseLocalStorage()) return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(CONDUCT_SUGGESTIONS_LOCAL_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalRecords(records) {
  const archiveError = edenWorkspaceMutationError(ACTIVE_SUGGESTIONS_WORKSPACE_ID);
  if (archiveError) throw archiveError;
  if (!canUseLocalStorage()) return;
  localStorage.setItem(
    CONDUCT_SUGGESTIONS_LOCAL_KEY,
    JSON.stringify(Array.isArray(records) ? records : [])
  );
}

function localSuggestionId() {
  const random =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  return `local_suggestion_${random}`;
}

export function loadLocalConductSuggestions(season) {
  const seasonKey = normalizeR5Season(season);
  return sortConductSuggestions(
    normalizeConductSuggestionRecords(readLocalRecords(), { season: seasonKey }).filter(
      (entry) => entry.season === seasonKey
    )
  );
}

export function createLocalConductSuggestion(input) {
  const record = normalizeConductSuggestion({
    ...input,
    id: input?.id || localSuggestionId(),
    status: 'pending',
    createdAt: input?.createdAt || new Date().toISOString(),
    suggestedBy: input?.suggestedBy || 'local-admin',
  });
  const records = readLocalRecords().filter((entry) => entry?.id !== record.id);
  records.push(record);
  writeLocalRecords(records);
  return record;
}

export function reviewLocalConductSuggestion(suggestionId, patch = {}) {
  const id = trimmed(suggestionId, 80);
  const records = readLocalRecords();
  const index = records.findIndex((entry) => entry?.id === id);
  if (index < 0) throw new Error('Conduct suggestion not found');
  records[index] = normalizeConductSuggestion(
    {
      ...records[index],
      status: normalizeConductSuggestionStatus(patch.status),
      reviewedBy: patch.reviewedBy || 'local-admin',
      reviewedAtMs: patch.reviewedAtMs || Date.now(),
      reviewNote: patch.reviewNote,
      adjustmentId: patch.adjustmentId || records[index]?.adjustmentId || '',
    },
    { season: records[index]?.season }
  );
  writeLocalRecords(records);
  return records[index];
}

export function deleteLocalConductSuggestion(suggestionId) {
  const id = trimmed(suggestionId, 80);
  writeLocalRecords(readLocalRecords().filter((entry) => entry?.id !== id));
  return true;
}

// --- Cloud -------------------------------------------------------------------

function suggestionsCollectionPath() {
  if (!CONDUCT_SUGGESTIONS_COLLECTION_PATH) {
    throw new Error('This Eden workspace has no conduct suggestion collection');
  }
  return CONDUCT_SUGGESTIONS_COLLECTION_PATH;
}

export async function loadConductSuggestions(season) {
  try {
    const { db, firestore } = await ensureR5AdjustmentAdminContext();
    const { collection, getDocs, query, where } = firestore;
    const seasonKey = normalizeR5Season(season);
    const snapshot = await getDocs(
      query(collection(db, suggestionsCollectionPath()), where('season', '==', seasonKey))
    );
    return sortConductSuggestions(
      normalizeConductSuggestionRecords(
        snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })),
        { season: seasonKey }
      )
    );
  } catch (err) {
    if (isR5PersistenceUnavailable(err)) return loadLocalConductSuggestions(season);
    throw err;
  }
}

export async function createConductSuggestion(input) {
  const archiveError = edenWorkspaceMutationError(ACTIVE_SUGGESTIONS_WORKSPACE_ID);
  if (archiveError) throw archiveError;
  try {
    const { db, user, firestore } = await ensureR5AdjustmentAdminContext();
    const { collection, doc, serverTimestamp, setDoc } = firestore;
    const ref = doc(collection(db, suggestionsCollectionPath()));
    const record = normalizeConductSuggestion({
      ...input,
      id: ref.id,
      status: 'pending',
      createdAt: serverTimestamp(),
      suggestedBy: user.uid,
      suggestedByName:
        input?.suggestedByName || user.displayName || user.email || user.uid || 'admin',
      reviewedBy: '',
      reviewedAtMs: 0,
      reviewNote: '',
      adjustmentId: '',
    });
    await setDoc(ref, record);
    return record;
  } catch (err) {
    if (isR5PersistenceUnavailable(err)) return createLocalConductSuggestion(input);
    throw err;
  }
}

export async function reviewConductSuggestion(suggestionId, patch = {}) {
  const archiveError = edenWorkspaceMutationError(ACTIVE_SUGGESTIONS_WORKSPACE_ID);
  if (archiveError) throw archiveError;
  const id = trimmed(suggestionId, 80);
  if (!id) throw new Error('Conduct suggestion id is required');
  const status = normalizeConductSuggestionStatus(patch.status);
  if (status === 'pending') throw new Error('Review must approve or reject a suggestion');
  try {
    const { db, user, firestore } = await ensureR5AdjustmentAdminContext();
    const { doc, getDoc, setDoc } = firestore;
    const ref = doc(db, suggestionsCollectionPath(), id);
    const existing = await getDoc(ref);
    if (!existing.exists()) throw new Error('Conduct suggestion not found');
    const record = normalizeConductSuggestion(
      {
        ...existing.data(),
        id,
        status,
        reviewedBy: user.uid,
        reviewedAtMs: Date.now(),
        reviewNote: patch.reviewNote,
        adjustmentId: patch.adjustmentId || '',
      },
      { season: existing.data()?.season }
    );
    await setDoc(ref, record);
    return record;
  } catch (err) {
    if (isR5PersistenceUnavailable(err)) return reviewLocalConductSuggestion(suggestionId, patch);
    throw err;
  }
}

export async function deleteConductSuggestion(suggestionId) {
  const archiveError = edenWorkspaceMutationError(ACTIVE_SUGGESTIONS_WORKSPACE_ID);
  if (archiveError) throw archiveError;
  try {
    const { db, firestore } = await ensureR5AdjustmentAdminContext();
    const { deleteDoc, doc } = firestore;
    await deleteDoc(doc(db, suggestionsCollectionPath(), trimmed(suggestionId, 80)));
    return true;
  } catch (err) {
    if (isR5PersistenceUnavailable(err)) return deleteLocalConductSuggestion(suggestionId);
    throw err;
  }
}
