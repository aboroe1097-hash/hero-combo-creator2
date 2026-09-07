// js/vts-score-store.js
//
// Read-only Firestore access for the VtsScore admin leader board.
//
// Race scores are written by the authenticated `vtsScore` Cloud Function, never
// by a browser — `firestore.rules` keeps `boh_allstar/{season}/raceScores`
// admin-read/write precisely so a client cannot forge another player's final
// value or bypass the OCR audit. The admin surface therefore only ever reads,
// which is why this module is a few getDocs calls rather than the validating
// store the removed command center carried.

const SEASON_PATTERN = /^[a-z0-9_-]{1,80}$/iu;

export const ALL_STAR_BOH_CONFIG_PATH = 'boh_allstar_config/current';

export function normalizeVtsScoreSeasonId(value) {
  const season = String(value ?? '').trim();
  return SEASON_PATTERN.test(season) ? season : '';
}

export function getVtsScoreSeasonPath(seasonId) {
  const season = normalizeVtsScoreSeasonId(seasonId);
  if (!season) throw new Error('A VtsScore season id is required');
  return `boh_allstar/${season}`;
}

export function getVtsScoreSubmissionsPath(seasonId) {
  return `${getVtsScoreSeasonPath(seasonId)}/submissions`;
}

export function getVtsScoreRaceScoresPath(seasonId) {
  return `${getVtsScoreSeasonPath(seasonId)}/raceScores`;
}

export function getVtsScoreRaceScorePath(seasonId, submissionUid) {
  const uid = String(submissionUid ?? '').trim();
  if (!uid) throw new Error('A VtsScore submission id is required');
  return `${getVtsScoreRaceScoresPath(seasonId)}/${uid}`;
}

async function adminContext() {
  if (typeof window !== 'undefined' && typeof window.getVtsAdminFirestoreContext === 'function') {
    return window.getVtsAdminFirestoreContext();
  }
  const [{ importFirestore }, firebaseApi] = await Promise.all([
    import('./firebase-sdk.js'),
    import('./firebase.js'),
  ]);
  const firestore = await importFirestore();
  const firebase = firebaseApi.initFirebase();
  if (!firebase?.configured) throw new Error('Firebase is not configured for VtsScore');
  const user = firebaseApi.getCurrentUser?.();
  if (!(await firebaseApi.isPasswordAuthUser?.(user))) {
    throw new Error('Sign in as admin before opening VtsScore');
  }
  const db = firebaseApi.getDb();
  if (!db) throw new Error('Firestore is not available for VtsScore');
  return { db, user, firestore };
}

export async function loadVtsScoreActiveSeason() {
  const { db, firestore } = await adminContext();
  const { doc, getDoc } = firestore;
  const snapshot = await getDoc(doc(db, ALL_STAR_BOH_CONFIG_PATH));
  const season = normalizeVtsScoreSeasonId(
    (snapshot?.exists?.() ? snapshot.data() : null)?.activeSeason
  );
  if (!season) throw new Error('The active VtsScore season is not configured.');
  return season;
}

// The admin rows builder is defensive about record shape, so documents are
// handed over as stored rather than re-validated here: a single malformed
// historical row must not blank the whole leader board.
export async function loadVtsScoreSnapshot(seasonId) {
  const season = normalizeVtsScoreSeasonId(seasonId) || (await loadVtsScoreActiveSeason());
  const { db, firestore } = await adminContext();
  const { collection, getDocs } = firestore;
  const [submissionDocs, raceScoreDocs] = await Promise.all([
    getDocs(collection(db, getVtsScoreSubmissionsPath(season))),
    getDocs(collection(db, getVtsScoreRaceScoresPath(season))),
  ]);
  return {
    season,
    submissions: submissionDocs.docs.map((entry) => ({
      submissionUid: entry.id,
      ...entry.data(),
    })),
    raceScores: raceScoreDocs.docs.map((entry) => ({
      submissionUid: entry.id,
      ...entry.data(),
    })),
  };
}
