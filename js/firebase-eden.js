// Lightweight Firebase bootstrap for the public Eden X1 page.
// Firestore is intentionally not imported here; Eden loads Firestore Lite
// after Auth is ready so the initial page stays responsive.

import { importFirebaseApp, importFirebaseAuth } from './firebase-sdk.js';
import { firebaseConfig, isFirebaseConfigured } from './firebase-config.js';

const [
  { initializeApp },
  { getAuth, signInAnonymously, onAuthStateChanged, setPersistence, browserLocalPersistence },
] = await Promise.all([importFirebaseApp(), importFirebaseAuth()]);

let app = null;
let auth = null;
let authInFlight = null;
let missingConfigLogged = false;

export function initFirebase() {
  if (app) return { app, auth, configured: true };
  if (!isFirebaseConfigured()) {
    if (!missingConfigLogged) {
      missingConfigLogged = true;
      console.info('[firebase-eden] Cloud sync is not configured; using the local fallback.');
    }
    return { app: null, auth: null, configured: false };
  }
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  return { app, auth, configured: true };
}

async function ensureAuthPersistence() {
  if (!auth) throw new Error('Firebase not initialized');
  try {
    await setPersistence(auth, browserLocalPersistence);
  } catch {
    // Some restricted browser contexts block persistence; auth can continue in-memory.
  }
}

export async function waitForAuthReady() {
  if (!auth) throw new Error('Firebase not initialized');
  if (typeof auth.authStateReady === 'function') {
    let timeout = null;
    await Promise.race([
      (async () => {
        await ensureAuthPersistence();
        await auth.authStateReady();
      })(),
      new Promise((resolve) => {
        timeout = setTimeout(resolve, 3000);
      }),
    ]);
    if (timeout) clearTimeout(timeout);
    return auth.currentUser || null;
  }
  await ensureAuthPersistence();
  return new Promise((resolve) => {
    let settled = false;
    let unsubscribe = () => {};
    let timeout = null;
    const finish = (user = null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      unsubscribe();
      resolve(user || auth.currentUser || null);
    };
    timeout = setTimeout(() => finish(auth.currentUser), 1500);
    unsubscribe = onAuthStateChanged(auth, finish);
  });
}

export async function ensureAnonymousAuth() {
  if (!auth) throw new Error('Firebase not initialized');
  if (auth.currentUser) return auth.currentUser;
  if (authInFlight) return authInFlight;

  authInFlight = (async () => {
    try {
      const restoredUser = await waitForAuthReady();
      if (restoredUser) return restoredUser;
      const credential = await signInAnonymously(auth);
      return credential.user;
    } finally {
      authInFlight = null;
    }
  })();

  return authInFlight;
}
