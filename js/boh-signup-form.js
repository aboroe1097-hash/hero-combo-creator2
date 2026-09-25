// js/boh-signup-form.js
//
// The 2027 Eden registration, as the member writes it.
//
// The retired All-Star BoH hub was the last thing that wrote
// `boh_allstar/{season}/submissions/{uid}`. Its rules never changed: only the
// owner may write their own signup, and only while they hold an active member
// grant and registration is open. This module therefore does exactly the write
// the old form did — through `runTransaction` so a concurrent edit cannot
// silently clobber a revision — and nothing here carries member privileges of
// its own.
//
// It holds no copy: every failure surfaces as a code, and the page (which owns
// the six-language catalogue) decides the words.

import { getDb, initFirebase } from './firebase.js';
import {
  BohSignupDocumentError,
  buildBohSignupDocument,
  mergeRetiredBohSignupFields,
  getBohSignupDocumentPath,
  readBohSignupFormValues,
  readBohSignupSubmission,
  writeBohSignupFormValues,
} from './boh-signup-document.js';

export const BOH_SIGNUP_SAVE_ERROR = Object.freeze({
  accessDenied: 'signup_access_denied',
  closed: 'signup_closed',
  invalidInput: 'signup_invalid_input',
  network: 'signup_network',
  session: 'signup_session',
});

/** Failure codes a Firestore write can produce, mapped to this module's contract. */
const FIRESTORE_ERROR_CODES = Object.freeze({
  'permission-denied': BOH_SIGNUP_SAVE_ERROR.accessDenied,
  unauthenticated: BOH_SIGNUP_SAVE_ERROR.session,
  unavailable: BOH_SIGNUP_SAVE_ERROR.network,
  'deadline-exceeded': BOH_SIGNUP_SAVE_ERROR.network,
  'network-request-failed': BOH_SIGNUP_SAVE_ERROR.network,
  aborted: BOH_SIGNUP_SAVE_ERROR.session,
  'failed-precondition': BOH_SIGNUP_SAVE_ERROR.closed,
  'not-found': BOH_SIGNUP_SAVE_ERROR.closed,
});

export class BohSignupSaveError extends Error {
  constructor(code, reason = '', problems = []) {
    super(reason || code);
    this.name = 'BohSignupSaveError';
    this.code = code;
    this.reason = reason;
    this.problems = Array.isArray(problems) ? problems : [];
  }
}

function firestoreErrorCode(error) {
  const raw = String(error?.code || '');
  return raw.replace(/^firestore\//u, '').replace(/^auth\//u, '');
}

/**
 * Resolves the Firestore surface this page already authenticates with. The
 * signup write is an ordinary owner-only client write, so it reuses the page's
 * anonymous session rather than any privileged channel.
 */
export async function loadBohSignupFirestore(initFirebaseImpl = initFirebase) {
  const initialized = initFirebaseImpl();
  if (!initialized?.configured) {
    throw new BohSignupSaveError(BOH_SIGNUP_SAVE_ERROR.session, 'Firebase is not configured.');
  }
  const { importFirestore } = await import('./firebase-sdk.js');
  const firestore = await importFirestore();
  const db = initialized.db || getDb();
  if (!db) throw new BohSignupSaveError(BOH_SIGNUP_SAVE_ERROR.session, 'Firestore is unavailable.');
  return { firestore, db };
}

/**
 * One season, one member account. `season` is the season the member unlocked
 * (the unlock response is the only season a member can see), `uid` is the
 * signed-in Firebase account the document belongs to.
 */
export function createBohSignupSession(options = {}) {
  const uid = String(options.uid || '').trim();
  const season = String(options.season || '').trim();
  const loadFirestore = options.loadFirestore || loadBohSignupFirestore;
  let context = null;

  if (!uid || !season) {
    throw new BohSignupSaveError(
      BOH_SIGNUP_SAVE_ERROR.session,
      'A season and member are required.'
    );
  }

  async function firestoreContext() {
    if (!context) context = await loadFirestore();
    return context;
  }

  function documentRef(firestore, db) {
    return firestore.doc(db, getBohSignupDocumentPath(season, uid));
  }

  /** The member's own signup for this season, or null when they have not signed up. */
  async function load() {
    const { firestore, db } = await firestoreContext();
    try {
      const snapshot = await firestore.getDoc(documentRef(firestore, db));
      const raw = snapshot?.exists?.() ? snapshot.data() : null;
      return readBohSignupSubmission(raw, { seasonId: season, uid });
    } catch (error) {
      const code =
        FIRESTORE_ERROR_CODES[firestoreErrorCode(error)] || BOH_SIGNUP_SAVE_ERROR.network;
      throw new BohSignupSaveError(code, 'The signup could not be read.');
    }
  }

  /**
   * Creates or updates the signup. The transaction re-reads the stored
   * revision, so a member who submits twice in two tabs gets a revision bump
   * instead of a lost write, exactly as the retired store behaved.
   */
  async function save(values, options2 = {}) {
    const { firestore, db } = await firestoreContext();
    const ref = documentRef(firestore, db);
    let saved = null;
    try {
      await firestore.runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(ref);
        const stored = snapshot?.exists?.() ? snapshot.data() : null;
        const serverTimestamp = firestore.serverTimestamp();
        const revision =
          Number.isInteger(stored?.revision) && stored.revision > 0 ? stored.revision + 1 : 1;
        const document = buildBohSignupDocument({
          // Questions the member form no longer asks keep their stored value.
          values: mergeRetiredBohSignupFields(values, stored),
          uid,
          seasonId: season,
          status: options2.status || 'submitted',
          ocr: options2.ocr,
          revision,
          createdAt: stored?.createdAt || serverTimestamp,
          updatedAt: serverTimestamp,
          updatedBy: uid,
        });
        saved = document;
        transaction.set(ref, document);
      });
    } catch (error) {
      if (error instanceof BohSignupSaveError) throw error;
      if (error instanceof BohSignupDocumentError) {
        throw new BohSignupSaveError(
          BOH_SIGNUP_SAVE_ERROR.invalidInput,
          error.message,
          error.problems || [error.code]
        );
      }
      const code = FIRESTORE_ERROR_CODES[firestoreErrorCode(error)];
      throw new BohSignupSaveError(
        code || BOH_SIGNUP_SAVE_ERROR.session,
        'The signup was not saved.'
      );
    }
    return saved;
  }

  return Object.freeze({
    season,
    uid,
    load,
    save,
    readForm: (root) => readBohSignupFormValues(root),
    fillForm: (root, signup) => writeBohSignupFormValues(root, signup),
  });
}
