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
  { getAuth, signInAnonymously, onAuthStateChanged, setPersistence, browserLocalPersistence, getIdTokenResult },
  { getFirestore },
  { getAnalytics },
] = await Promise.all([
  importFirebaseApp(),
  importFirebaseAuth(),
  importFirestore(),
  importFirebaseAnalytics(),
]);

let appCheckApiPromise = null;

function loadAppCheckApi() {
  if (!appCheckApiPromise) appCheckApiPromise = importFirebaseAppCheck();
  return appCheckApiPromise;
}

let app = null;
let db = null;
let auth = null;
let analytics = null;
let appCheck = null;
let missingConfigLogged = false;
let appCheckInitError = null;

// Public Firebase web app config is injected by Vite from VITE_FIREBASE_*
// environment variables. Do not commit Firebase API keys in source.
const viteEnv = import.meta.env || {};
const nodeEnv = typeof process !== 'undefined' ? process.env : {};
const runtimeEnv =
  typeof globalThis !== 'undefined' && globalThis.VTS_FIREBASE_CONFIG && typeof globalThis.VTS_FIREBASE_CONFIG === 'object'
    ? globalThis.VTS_FIREBASE_CONFIG
    : {};
const env = { ...nodeEnv, ...viteEnv, ...runtimeEnv };
const envValue = (key) => String(env[key] || '').trim();
const configValue = envValue;
const firebaseProjectId = configValue('VITE_FIREBASE_PROJECT_ID');
const firebaseAppId = configValue('VITE_FIREBASE_APP_ID');
const firebaseSenderId = configValue('VITE_FIREBASE_MESSAGING_SENDER_ID') || firebaseAppId.match(/^1:(\d+):web:/)?.[1] || '';

export const firebaseConfig = {
  apiKey: configValue('VITE_FIREBASE_API_KEY'),
  authDomain: configValue('VITE_FIREBASE_AUTH_DOMAIN') || (firebaseProjectId ? `${firebaseProjectId}.firebaseapp.com` : ''),
  projectId: firebaseProjectId,
  storageBucket: configValue('VITE_FIREBASE_STORAGE_BUCKET') || (firebaseProjectId ? `${firebaseProjectId}.firebasestorage.app` : ''),
  messagingSenderId: firebaseSenderId,
  appId: firebaseAppId,
  measurementId: configValue('VITE_FIREBASE_MEASUREMENT_ID')
};

export function isFirebaseConfigured() {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);
}

export function getFirebaseSetupStatus() {
  const recaptchaSiteKey = configValue('VITE_RECAPTCHA_SITE_KEY');
  return {
    configured: isFirebaseConfigured(),
    appCheckReady: Boolean(appCheck),
    hasRecaptchaSiteKey: Boolean(recaptchaSiteKey),
    appCheckInitError: appCheckInitError?.message || '',
  };
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

  try {
    await setPersistence(auth, browserLocalPersistence);
  } catch {
    // Some restricted browser contexts block persistence; anonymous auth can continue.
  }

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

async function ensureFirebaseAppCheck() {
  if (!app) initFirebase();
  if (!app || appCheck) return appCheck;

  const recaptchaSiteKey = configValue('VITE_RECAPTCHA_SITE_KEY');
  if (!recaptchaSiteKey) return null;

  try {
    const appCheckDebugToken = envValue('VITE_FIREBASE_APPCHECK_DEBUG_TOKEN');
    if (appCheckDebugToken && typeof globalThis !== 'undefined') {
      globalThis.FIREBASE_APPCHECK_DEBUG_TOKEN = appCheckDebugToken === 'true' ? true : appCheckDebugToken;
    }

    const { initializeAppCheck, ReCaptchaEnterpriseProvider } = await loadAppCheckApi();
    appCheckInitError = null;
    appCheck = initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(recaptchaSiteKey),
      isTokenAutoRefreshEnabled: true
    });
  } catch (e) {
    appCheckInitError = e;
    console.warn("App Check initialization failed; continuing without it.", e);
  }

  return appCheck;
}

export async function getFirebaseAdminClaim(forceRefresh = false) {
  if (!auth) throw new Error("Firebase not initialized");
  const user = auth.currentUser || await ensureAnonymousAuth();
  const token = await getIdTokenResult(user, forceRefresh);
  return token?.claims?.admin === true;
}

export async function getFirebaseAppCheckToken(forceRefresh = false) {
  const currentAppCheck = await ensureFirebaseAppCheck();
  if (!currentAppCheck) return '';
  const { getToken } = await loadAppCheckApi();
  const result = await getToken(currentAppCheck, forceRefresh);
  return result?.token || '';
}

export function getDb() { return db; }
export function getAuthInstance() { return auth; }
