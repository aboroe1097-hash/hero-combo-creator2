// firebase.js
// Exposes initFirebase() and helpers. Uses modular SDK.
// NOTE: This file is an ES module. It's imported by app.js.

import {
  importFirebaseAnalytics,
  importFirebaseApp,
  importFirebaseAppCheck,
  importFirebaseAuth,
  importFirestore,
} from './firebase-sdk.js';

const [
  { initializeApp },
  { getAuth, signInAnonymously, onAuthStateChanged, setPersistence, browserLocalPersistence },
  { getFirestore },
  { getAnalytics },
  { initializeAppCheck, ReCaptchaEnterpriseProvider },
] = await Promise.all([
  importFirebaseApp(),
  importFirebaseAuth(),
  importFirestore(),
  importFirebaseAnalytics(),
  importFirebaseAppCheck(),
]);

let app = null;
let db = null;
let auth = null;
let analytics = null;
let missingConfigLogged = false;

const viteEnv = import.meta.env || {};
const nodeEnv = typeof process !== 'undefined' ? process.env : {};
const env = { ...nodeEnv, ...viteEnv };
const envValue = (key) => String(env[key] || '').trim();
const firebaseProjectId = envValue('VITE_FIREBASE_PROJECT_ID');
const firebaseAppId = envValue('VITE_FIREBASE_APP_ID');
const firebaseSenderId = envValue('VITE_FIREBASE_MESSAGING_SENDER_ID') || firebaseAppId.match(/^1:(\d+):web:/)?.[1] || '';

export const firebaseConfig = {
  apiKey: envValue('VITE_FIREBASE_API_KEY'),
  authDomain: envValue('VITE_FIREBASE_AUTH_DOMAIN') || (firebaseProjectId ? `${firebaseProjectId}.firebaseapp.com` : ''),
  projectId: firebaseProjectId,
  storageBucket: envValue('VITE_FIREBASE_STORAGE_BUCKET') || (firebaseProjectId ? `${firebaseProjectId}.firebasestorage.app` : ''),
  messagingSenderId: firebaseSenderId,
  appId: firebaseAppId,
  measurementId: envValue('VITE_FIREBASE_MEASUREMENT_ID')
};

export function isFirebaseConfigured() {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);
}

export function initFirebase() {
  if (app) return { app, db, auth, analytics };
  if (!isFirebaseConfigured()) {
    if (!missingConfigLogged) {
      missingConfigLogged = true;
      console.info(
        '[firebase] Cloud sync disabled: create a .env file from .env.example and set VITE_FIREBASE_API_KEY, VITE_FIREBASE_PROJECT_ID, and VITE_FIREBASE_APP_ID to enable Firebase.'
      );
    }
    return { app, db, auth, analytics, configured: false };
  }
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);

  // Initialize App Check with reCAPTCHA Enterprise when a site key is configured.
  // Enforcement is controlled in the Firebase Console; the app still works if unset.
  const recaptchaSiteKey = envValue('VITE_RECAPTCHA_SITE_KEY');
  if (recaptchaSiteKey) {
    try {
      const appCheckDebugToken = envValue('VITE_FIREBASE_APPCHECK_DEBUG_TOKEN');
      if (appCheckDebugToken && typeof globalThis !== 'undefined') {
        globalThis.FIREBASE_APPCHECK_DEBUG_TOKEN = appCheckDebugToken === 'true' ? true : appCheckDebugToken;
      }
      initializeAppCheck(app, {
        provider: new ReCaptchaEnterpriseProvider(recaptchaSiteKey),
        isTokenAutoRefreshEnabled: true
      });
    } catch (e) {
      console.warn("App Check initialization failed; continuing without it.", e);
    }
  }

  // Analytics automatically logs page_view and tracks active users for free without quotas
  try {
    analytics = getAnalytics(app);
  } catch(e) {
    console.warn("Analytics blocked or failed to initialize", e);
  }

  return { app, db, auth, analytics, configured: true };
}

let authInFlight = null;

export async function ensureAnonymousAuth() {
  if (!auth) throw new Error("Firebase not initialized");
  if (auth.currentUser) return auth.currentUser;
  if (authInFlight) return authInFlight;

  try { await setPersistence(auth, browserLocalPersistence); } catch(e) {}

  authInFlight = new Promise((resolve, reject) => {
    let unsubs = () => {};
    const timeout = setTimeout(() => {
      unsubs();
      authInFlight = null;
      reject(new Error("Auth timed out"));
    }, 10000);

    unsubs = onAuthStateChanged(auth, (user) => {
      if (user) {
        clearTimeout(timeout);
        unsubs();
        authInFlight = null;
        resolve(user);
      }
    });

    signInAnonymously(auth).catch((err) => {
      clearTimeout(timeout);
      unsubs();
      authInFlight = null;
      reject(err);
    });
  });

  return authInFlight;
}

export function getDb() { return db; }
export function getAuthInstance() { return auth; }
