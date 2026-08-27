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

// The alliance's five teams, named the way people actually call them in chat.
// The command center shipped six invented names (Iron Wolves, Storm Ravens, …)
// that nobody used.
export const BOH_MATCH_TEAMS = Object.freeze([
  Object.freeze({ id: 'v1s-wolves', number: 1, code: 'V1S', label: 'V1S - Wolves' }),
  Object.freeze({ id: 'v2s-tigers', number: 2, code: 'V2S', label: 'V2S - Tigers' }),
  Object.freeze({ id: 'v3s-falcons', number: 3, code: 'V3S', label: 'V3S - Falcons' }),
  Object.freeze({ id: 'v4s-phoenix', number: 4, code: 'V4S', label: 'V4S - Phoenix' }),
  Object.freeze({ id: 'v5s-bulls', number: 5, code: 'V5S', label: 'V5S - Bulls' }),
]);

// Results were already saved under the old names before the rename. Each maps
// to its obvious successor so historical records keep counting for the right
// team; anything unrecognised is preserved as a read-only legacy team rather
// than dropped, so a record can never silently vanish from the list.
const LEGACY_BOH_TEAM_ALIASES = Object.freeze({
  'iron-wolves': 'v1s-wolves',
  'ember-lions': 'v2s-tigers',
  'night-falcons': 'v3s-falcons',
  'storm-ravens': 'v4s-phoenix',
  'thunder-bulls': 'v5s-bulls',
  'frost-bears': 'v5s-bulls',
});

// Fixtures the alliance has already scheduled. Picking one fills the date, so a
// leader uploading at 2am does not have to work out which match they were in.
export const BOH_MATCH_FIXTURES = Object.freeze([
  Object.freeze({ id: 'top32-2026-08-26', date: '2026-08-26', label: 'Top 32 Qualification' }),
  Object.freeze({ id: 'top16-2026-08-28', date: '2026-08-28', label: 'Top 16 Qualification' }),
  Object.freeze({ id: 'top8-2026-08-31', date: '2026-08-31', label: 'Top 8 Qualification' }),
]);

export function getBohMatchFixture(fixtureId) {
  const id = String(fixtureId || '').trim();
  return BOH_MATCH_FIXTURES.find((fixture) => fixture.id === id) || null;
}

export const BOH_MATCH_RESULTS_COLLECTION_PATH = 'vts_admin/boh_match_results/records';
export const BOH_MATCH_RESULTS_LOCAL_KEY = 'vts_boh_match_results';

export const BOH_MATCH_MAX_ENTRIES = 60;
export const BOH_MATCH_MAX_RATING = 10;
const MAX_SCORE = 100_000_000;
const MAX_NOTE = 1000;
const MAX_ENTRY_NOTE = 300;
const MAX_NAME = 120;

export function getBohMatchTeam(teamId) {
  const raw = String(teamId || '')
    .trim()
    .toLowerCase();
  if (!raw) return null;
  const id = LEGACY_BOH_TEAM_ALIASES[raw] || raw;
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

// Optional, and null is meaningful: "not rated" is not the same as a zero.
function ratingValue(value) {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return Math.min(BOH_MATCH_MAX_RATING, Math.max(0, Math.round(numeric * 10) / 10));
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
    note: trimmed(input?.note, MAX_ENTRY_NOTE),
    rating: ratingValue(input?.rating),
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
    if (!existing) {
      byPlayer.set(normalized.playerKey, normalized);
      return;
    }
    // A duplicate from an overlapping capture keeps the higher score: a row
    // half-scrolled off the top of a screenshot is the one that reads low. The
    // leader's note and rating are kept from whichever copy carries them, so
    // merging two captures never discards typed-in judgement.
    byPlayer.set(normalized.playerKey, {
      ...(normalized.score > existing.score ? normalized : existing),
      note: existing.note || normalized.note,
      rating: existing.rating ?? normalized.rating,
    });
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
  const fixture = getBohMatchFixture(input?.fixtureId);
  // A picked fixture sets the date; a typed date still wins if it disagrees, so
  // a rescheduled match is never silently filed under the original day.
  const explicitDate = /^\d{4}-\d{2}-\d{2}$/.test(String(input?.matchDate || ''))
    ? String(input.matchDate)
    : '';
  const matchDate = explicitDate || fixture?.date || new Date().toISOString().slice(0, 10);

  return {
    id: trimmed(input?.id, 80),
    teamId: team.id,
    teamName: team.label,
    fixtureId: fixture?.id || '',
    matchDate,
    opponent: trimmed(input?.opponent, MAX_NAME),
    // The scoreboard headline, e.g. 90,842 vs 12,647. Kept separate from the
    // per-player rows because a leader who missed the screenshots can still
    // report the result and a note.
    teamScore: scoreValue(input?.teamScore),
    opponentScore: scoreValue(input?.opponentScore),
    note: trimmed(input?.note, MAX_NOTE),
    entries,
    totalScore: entries.reduce((sum, entry) => sum + entry.score, 0),
    memberCount: entries.length,
    createdAt: input?.createdAt || null,
    createdBy: trimmed(input?.createdBy, 128),
    createdByName: trimmed(input?.createdByName, 160),
    updatedAt: input?.updatedAt || null,
    updatedBy: trimmed(input?.updatedBy, 128),
    updatedByName: trimmed(input?.updatedByName, 160),
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
  const editing = Boolean(input?.id);
  const existing = editing ? readLocalRecords().find((entry) => entry?.id === input.id) : null;
  const record = normalizeBohMatchResult({
    ...input,
    id: input?.id || localRecordId(),
    createdAt: existing?.createdAt || input?.createdAt || new Date().toISOString(),
    createdBy: existing?.createdBy || input?.createdBy || 'local-admin',
    createdByName: existing?.createdByName || input?.createdByName || '',
    updatedAt: editing ? new Date().toISOString() : null,
    updatedBy: editing ? 'local-admin' : '',
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
    const editing = Boolean(input?.id);
    const ref = editing
      ? doc(db, BOH_MATCH_RESULTS_COLLECTION_PATH, input.id)
      : doc(collection(db, BOH_MATCH_RESULTS_COLLECTION_PATH));
    const who = user.displayName || user.email || user.uid || 'admin';
    // An edit re-reads the stored row so createdAt/createdBy survive: the rules
    // freeze both, and a leader correcting a date must not be recorded as the
    // person who filed the result.
    let existing = null;
    if (editing) {
      const { getDoc } = firestore;
      const snapshot = await getDoc(ref);
      existing = snapshot.exists() ? snapshot.data() : null;
    }
    const record = normalizeBohMatchResult({
      ...input,
      id: ref.id,
      createdAt: existing?.createdAt || input?.createdAt || serverTimestamp(),
      createdBy: existing?.createdBy || input?.createdBy || user.uid,
      createdByName: existing?.createdByName || input?.createdByName || who,
      updatedAt: editing ? serverTimestamp() : null,
      updatedBy: editing ? user.uid : '',
      updatedByName: editing ? who : '',
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
