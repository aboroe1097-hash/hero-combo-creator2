// js/boh-match-results.js
//
// End-of-match BoH team results.
//
// This replaces the All-Star BoH command center. The command center tried to
// run the whole event — signups, drafting, role plans, publication — and almost
// none of that survived contact with how the alliance actually plays. What is
// actually needed is one thing: when a match ends, the team's leader uploads
// the Combat Progress score list for their team and says how the team did.
//
// A record is therefore one team, one match: the roster rows off the scoreboard
// plus the leader's note. Nothing here drafts, balances, or publishes.

import { compactPlayerIdentity, resolveCanonicalPlayerIdentity } from './ocr-name-normalizer.js';

// The six team names the alliance already uses. They were the command center's
// only piece of vocabulary worth keeping.
export const BOH_MATCH_TEAMS = Object.freeze([
  Object.freeze({ id: 'iron-wolves', number: 1, label: 'Iron Wolves' }),
  Object.freeze({ id: 'storm-ravens', number: 2, label: 'Storm Ravens' }),
  Object.freeze({ id: 'ember-lions', number: 3, label: 'Ember Lions' }),
  Object.freeze({ id: 'frost-bears', number: 4, label: 'Frost Bears' }),
  Object.freeze({ id: 'night-falcons', number: 5, label: 'Night Falcons' }),
  Object.freeze({ id: 'thunder-bulls', number: 6, label: 'Thunder Bulls' }),
]);

export const BOH_MATCH_RESULTS_COLLECTION_PATH = 'vts_admin/boh_match_results/records';
export const BOH_MATCH_RESULTS_LOCAL_KEY = 'vts_boh_match_results';

export const BOH_MATCH_MAX_ENTRIES = 60;
const MAX_SCORE = 100_000_000;
const MAX_NOTE = 1000;
const MAX_NAME = 120;

export function getBohMatchTeam(teamId) {
  const id = String(teamId || '')
    .trim()
    .toLowerCase();
  return BOH_MATCH_TEAMS.find((team) => team.id === id) || null;
}

export function bohMatchTeamLabel(teamId) {
  return getBohMatchTeam(teamId)?.label || String(teamId || '');
}

function trimmed(value, max) {
  return String(value ?? '')
    .trim()
    .slice(0, max);
}

function scoreValue(value) {
  // Screenshots hand back "16,279" and "16 279" as often as a bare number.
  const numeric = Number(
    String(value ?? '')
      .replace(/[\s,'`]/g, '')
      .replace(/[^\d.-]/g, '')
  );
  if (!Number.isFinite(numeric)) return 0;
  return Math.min(MAX_SCORE, Math.max(0, Math.round(numeric)));
}

function rankValue(value) {
  const numeric = Number(String(value ?? '').replace(/[^\d]/g, ''));
  return Number.isFinite(numeric) && numeric > 0 ? Math.min(999, Math.trunc(numeric)) : 0;
}

export function normalizeBohMatchEntry(input, index = 0) {
  const rawName = trimmed(input?.playerName ?? input?.name ?? input?.player, MAX_NAME);
  if (!rawName) return null;
  let playerName = rawName;
  let playerKey = '';
  try {
    const identity = resolveCanonicalPlayerIdentity({ name: rawName });
    playerName = trimmed(identity.playerName, MAX_NAME) || rawName;
    playerKey = compactPlayerIdentity(identity.playerKey || playerName);
  } catch {
    playerKey = compactPlayerIdentity(rawName);
  }
  if (!playerKey) return null;
  return {
    rank: rankValue(input?.rank) || index + 1,
    playerKey,
    playerName,
    score: scoreValue(input?.score ?? input?.points ?? input?.value ?? input?.contribution),
  };
}

// Entries are ranked by score, not by whatever order the screenshots arrived
// in: leaders upload two or three scrolled captures and they overlap.
export function normalizeBohMatchEntries(entries = []) {
  const byPlayer = new Map();
  (Array.isArray(entries) ? entries : []).forEach((entry, index) => {
    const normalized = normalizeBohMatchEntry(entry, index);
    if (!normalized) return;
    const existing = byPlayer.get(normalized.playerKey);
    // A duplicate from an overlapping capture keeps the higher score: a row
    // half-scrolled off the top of a screenshot is the one that reads low.
    if (!existing || normalized.score > existing.score)
      byPlayer.set(normalized.playerKey, normalized);
  });
  return [...byPlayer.values()]
    .sort((a, b) => b.score - a.score || a.playerName.localeCompare(b.playerName))
    .slice(0, BOH_MATCH_MAX_ENTRIES)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

export function normalizeBohMatchResult(input, options = {}) {
  const team = getBohMatchTeam(input?.teamId ?? options.teamId);
  if (!team) throw new Error('Pick which team this result is for');
  const entries = normalizeBohMatchEntries(input?.entries);
  const matchDate = /^\d{4}-\d{2}-\d{2}$/.test(String(input?.matchDate || ''))
    ? String(input.matchDate)
    : new Date().toISOString().slice(0, 10);

  return {
    id: trimmed(input?.id, 80),
    teamId: team.id,
    teamName: team.label,
    matchDate,
    opponent: trimmed(input?.opponent, MAX_NAME),
    note: trimmed(input?.note, MAX_NOTE),
    entries,
    totalScore: entries.reduce((sum, entry) => sum + entry.score, 0),
    memberCount: entries.length,
    createdAt: input?.createdAt || null,
    createdBy: trimmed(input?.createdBy, 128),
    createdByName: trimmed(input?.createdByName, 160),
  };
}

export function normalizeBohMatchResultRecords(records = []) {
  const normalized = [];
  (Array.isArray(records) ? records : []).forEach((entry) => {
    try {
      normalized.push(normalizeBohMatchResult(entry));
    } catch {
      // A malformed row must not hide every other team's results.
    }
  });
  return normalized;
}

export function bohMatchResultCreatedAtMs(record) {
  const raw = record?.createdAt;
  if (typeof raw?.toMillis === 'function') return raw.toMillis();
  return Date.parse(raw || '') || 0;
}

export function sortBohMatchResults(records = []) {
  return (Array.isArray(records) ? records : []).slice().sort((a, b) => {
    const dateDiff = String(b?.matchDate || '').localeCompare(String(a?.matchDate || ''));
    if (dateDiff !== 0) return dateDiff;
    return bohMatchResultCreatedAtMs(b) - bohMatchResultCreatedAtMs(a);
  });
}

export function summarizeBohMatchResults(records = []) {
  const rows = Array.isArray(records) ? records : [];
  const teams = new Set();
  let totalScore = 0;
  let members = 0;
  rows.forEach((record) => {
    if (record?.teamId) teams.add(record.teamId);
    totalScore += Number(record?.totalScore || 0);
    members += Number(record?.memberCount || 0);
  });
  return { matches: rows.length, teams: teams.size, totalScore, members };
}

// --- Screenshot / paste input -----------------------------------------------

// The vision model is asked for {entries:[{rank,name,score}]}; this accepts that
// plus the looser shapes it sometimes returns.
export function bohMatchEntriesFromOcr(payload) {
  const list = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.entries)
      ? payload.entries
      : Array.isArray(payload?.rows)
        ? payload.rows
        : [];
  return normalizeBohMatchEntries(list);
}

const MATCH_ROW_RE = /^\s*(?:#?(\d{1,3})[).\s|,]+)?(.+?)[\s|,]+([\d.,']{1,15})\s*$/;

export function bohMatchEntriesFromText(text) {
  const rows = [];
  String(text || '')
    .split(/\r?\n/)
    .forEach((line) => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return;
      const match = MATCH_ROW_RE.exec(trimmedLine);
      if (!match) return;
      const name = match[2].trim();
      if (!name || /^(rank|name|score|player|member)$/i.test(name)) return;
      rows.push({ rank: match[1], name, score: match[3] });
    });
  return normalizeBohMatchEntries(rows);
}

// --- Storage -----------------------------------------------------------------

function canUseLocalStorage() {
  return typeof localStorage !== 'undefined' && localStorage;
}

function readLocalRecords() {
  if (!canUseLocalStorage()) return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(BOH_MATCH_RESULTS_LOCAL_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalRecords(records) {
  if (!canUseLocalStorage()) return;
  localStorage.setItem(
    BOH_MATCH_RESULTS_LOCAL_KEY,
    JSON.stringify(Array.isArray(records) ? records : [])
  );
}

function localRecordId() {
  const random =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  return `local_boh_match_${random}`;
}

export function loadLocalBohMatchResults() {
  return sortBohMatchResults(normalizeBohMatchResultRecords(readLocalRecords()));
}

export function saveLocalBohMatchResult(input) {
  const record = normalizeBohMatchResult({
    ...input,
    id: input?.id || localRecordId(),
    createdAt: input?.createdAt || new Date().toISOString(),
    createdBy: input?.createdBy || 'local-admin',
  });
  const records = readLocalRecords().filter((entry) => entry?.id !== record.id);
  records.push(record);
  writeLocalRecords(records);
  return record;
}

export function deleteLocalBohMatchResult(recordId) {
  const id = trimmed(recordId, 80);
  writeLocalRecords(readLocalRecords().filter((entry) => entry?.id !== id));
  return true;
}

async function ensureBohMatchAdminContext() {
  if (typeof window !== 'undefined' && typeof window.getVtsAdminFirestoreContext === 'function') {
    return window.getVtsAdminFirestoreContext();
  }
  const [{ importFirestore }, firebaseApi] = await Promise.all([
    import('./firebase-sdk.js'),
    import('./firebase.js'),
  ]);
  const firestore = await importFirestore();
  const firebase = firebaseApi.initFirebase();
  if (!firebase?.configured) throw new Error('Firebase is not configured for BoH match results');
  const user = firebaseApi.getCurrentUser?.();
  if (!(await firebaseApi.isPasswordAuthUser?.(user))) {
    throw new Error('Sign in as admin before uploading BoH match results');
  }
  const db = firebaseApi.getDb();
  if (!db) throw new Error('Firestore is not available for BoH match results');
  return { db, user, firestore };
}

function isBohPersistenceUnavailable(err) {
  const text = `${err?.code || ''} ${err?.message || err || ''}`;
  return /firebase is not configured|firebase not initialized|firestore is not available/i.test(
    text
  );
}

export async function loadBohMatchResults() {
  try {
    const { db, firestore } = await ensureBohMatchAdminContext();
    const { collection, getDocs } = firestore;
    const snapshot = await getDocs(collection(db, BOH_MATCH_RESULTS_COLLECTION_PATH));
    return sortBohMatchResults(
      normalizeBohMatchResultRecords(
        snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
      )
    );
  } catch (err) {
    if (isBohPersistenceUnavailable(err)) return loadLocalBohMatchResults();
    throw err;
  }
}

export async function saveBohMatchResult(input) {
  try {
    const { db, user, firestore } = await ensureBohMatchAdminContext();
    const { collection, doc, serverTimestamp, setDoc } = firestore;
    const ref = input?.id
      ? doc(db, BOH_MATCH_RESULTS_COLLECTION_PATH, input.id)
      : doc(collection(db, BOH_MATCH_RESULTS_COLLECTION_PATH));
    const record = normalizeBohMatchResult({
      ...input,
      id: ref.id,
      createdAt: input?.createdAt || serverTimestamp(),
      createdBy: input?.createdBy || user.uid,
      createdByName: input?.createdByName || user.displayName || user.email || user.uid || 'admin',
    });
    await setDoc(ref, record);
    return record;
  } catch (err) {
    if (isBohPersistenceUnavailable(err)) return saveLocalBohMatchResult(input);
    throw err;
  }
}

export async function deleteBohMatchResult(recordId) {
  try {
    const { db, firestore } = await ensureBohMatchAdminContext();
    const { deleteDoc, doc } = firestore;
    await deleteDoc(doc(db, BOH_MATCH_RESULTS_COLLECTION_PATH, trimmed(recordId, 80)));
    return true;
  } catch (err) {
    if (isBohPersistenceUnavailable(err)) return deleteLocalBohMatchResult(recordId);
    throw err;
  }
}
