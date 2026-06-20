// firebase.js
// Exposes initFirebase() and helpers. Uses modular SDK.
// NOTE: This file is an ES module. It's imported by app.js.

import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";

let app = null;
let db = null;
let auth = null;
let analytics = null;

const viteEnv = import.meta.env || {};
const nodeEnv = typeof process !== 'undefined' ? process.env : {};
const env = { ...nodeEnv, ...viteEnv };
const envValue = (key) => String(env[key] || '').trim();

export const firebaseConfig = {
  apiKey: envValue('VITE_FIREBASE_API_KEY'),
  authDomain: envValue('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: envValue('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: envValue('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: envValue('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: envValue('VITE_FIREBASE_APP_ID'),
  measurementId: envValue('VITE_FIREBASE_MEASUREMENT_ID')
};

export function initFirebase() {
  if (app) return { app, db, auth, analytics };
  if (!firebaseConfig.apiKey) {
    throw new Error(
      'Firebase API key is missing. ' +
      'Create a .env file from .env.example and set VITE_FIREBASE_API_KEY.'
    );
  }
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);

  // Initialize App Check with reCAPTCHA Enterprise when a site key is configured.
  // Enforcement is controlled in the Firebase Console; the app still works if unset.
  const recaptchaSiteKey = envValue('VITE_RECAPTCHA_SITE_KEY');
  if (recaptchaSiteKey) {
    try {
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

  return { app, db, auth, analytics };
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
