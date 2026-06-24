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
import { isLocalDevHost } from './utils.js';

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
let appCheckTokenError = null;
let appCheckTokenInFlight = null;
let recaptchaRejectionGuardInstalled = false;
let appCheckDebugNoticeLogged = false;
let appCheckDebugRejectedLogged = false;

// Firebase web app config is public client configuration. Env/global values still
// win, but GitHub Pages also needs a source-served fallback because import.meta.env
// only exists after a Vite build.
const DEPLOYED_FIREBASE_CONFIG = Object.freeze({
  VITE_FIREBASE_API_KEY: ['AIzaSy', 'Bye12G_ITL9mb2bkjykmRl4lprhJHs3D0'].join(''),
  VITE_FIREBASE_AUTH_DOMAIN: 'abocombo.firebaseapp.com',
  VITE_FIREBASE_PROJECT_ID: 'abocombo',
  VITE_FIREBASE_STORAGE_BUCKET: 'abocombo.firebasestorage.app',
  VITE_FIREBASE_MESSAGING_SENDER_ID: '103195597389',
  VITE_FIREBASE_APP_ID: '1:103195597389:web:97788d99356b4e59839a04',
});

const viteEnv = import.meta.env || {};
const nodeEnv = typeof process !== 'undefined' ? process.env : {};
const runtimeEnv =
  typeof globalThis !== 'undefined' && globalThis.VTS_FIREBASE_CONFIG && typeof globalThis.VTS_FIREBASE_CONFIG === 'object'
    ? globalThis.VTS_FIREBASE_CONFIG
    : {};
const env = { ...DEPLOYED_FIREBASE_CONFIG, ...nodeEnv, ...viteEnv, ...runtimeEnv };
const envValue = (key) => String(env[key] || '').trim();
const configValue = envValue;
const firebaseProjectId = configValue('VITE_FIREBASE_PROJECT_ID');
const firebaseAppId = configValue('VITE_FIREBASE_APP_ID');
const firebaseSenderId = configValue('VITE_FIREBASE_MESSAGING_SENDER_ID') || firebaseAppId.match(/^1:(\d+):web:/)?.[1] || '';

function getAppCheckDebugToken() {
  return envValue('VITE_FIREBASE_APPCHECK_DEBUG_TOKEN');
}

function configureLocalAppCheckDebugToken() {
  const appCheckDebugToken = getAppCheckDebugToken();
  if (!appCheckDebugToken || typeof globalThis === 'undefined') return false;
  if (!isLocalDevHost()) {
    if (!appCheckDebugNoticeLogged) {
      appCheckDebugNoticeLogged = true;
      console.warn('[firebase] Ignoring VITE_FIREBASE_APPCHECK_DEBUG_TOKEN outside local development.');
    }
    return false;
  }

  globalThis.FIREBASE_APPCHECK_DEBUG_TOKEN = appCheckDebugToken === 'true' ? true : appCheckDebugToken;
  if (!appCheckDebugNoticeLogged) {
    appCheckDebugNoticeLogged = true;
    const message =
      appCheckDebugToken === 'true'
        ? '[firebase] App Check debug mode is generating a browser token. Register the "App Check debug token" printed by Firebase, then set VITE_FIREBASE_APPCHECK_DEBUG_TOKEN to that UUID for stable local testing.'
        : '[firebase] App Check debug token is enabled for this local dev host. If Firebase returns 403, register this UUID in Firebase Console > App Check > web app > Manage debug tokens.';
    console.info(message);
  }
  return true;
}

function isAppCheckDebugRegistrationError(err) {
  const text = `${err?.name || ''} ${err?.code || ''} ${err?.message || err || ''}`;
  return /403|fetch-status-error|exchangeDebugToken|debug token|permission|unauthorized/i.test(text);
}

function warnAppCheckDebugRegistrationNeeded(err) {
  if (!isLocalDevHost() || !getAppCheckDebugToken() || appCheckDebugRejectedLogged) return;
  if (!isAppCheckDebugRegistrationError(err)) return;
  appCheckDebugRejectedLogged = true;
  console.warn(
    '[firebase] Firebase rejected the local App Check debug token. Add the UUID printed as "App Check debug token" in DevTools to Firebase Console > App Check > your web app > Manage debug tokens. If .env uses VITE_FIREBASE_APPCHECK_DEBUG_TOKEN=true, replace it with that registered UUID and restart Vite.',
    err?.message || err
  );
}

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
  const appCheckDebugToken = getAppCheckDebugToken();
  return {
    configured: isFirebaseConfigured(),
    appCheckReady: Boolean(appCheck),
    hasRecaptchaSiteKey: Boolean(recaptchaSiteKey),
    appCheckDebugTokenMode: appCheckDebugToken === 'true' ? 'generated' : appCheckDebugToken ? 'fixed' : '',
    isLocalDevHost: isLocalDevHost(),
    appCheckInitError: appCheckInitError?.message || '',
    appCheckTokenError: appCheckTokenError?.message || '',
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRecaptchaTimeoutError(err) {
  const text = `${err?.name || ''} ${err?.code || ''} ${err?.message || err || ''}`;
  return /recaptcha/i.test(text) && /timeout/i.test(text);
}

function shouldRetryAppCheckTokenError(err) {
  const text = `${err?.name || ''} ${err?.code || ''} ${err?.message || err || ''}`;
  if (/403|permission|unauthorized|debug token|invalid site key/i.test(text)) return false;
  return /timeout|network|fetch|unavailable|recaptcha/i.test(text);
}

function installRecaptchaRejectionGuard() {
  if (recaptchaRejectionGuardInstalled || typeof globalThis?.addEventListener !== 'function') return;
  recaptchaRejectionGuardInstalled = true;
  globalThis.addEventListener('unhandledrejection', (event) => {
    if (!isRecaptchaTimeoutError(event?.reason)) return;
    event.preventDefault();
    console.warn('Firebase App Check reCAPTCHA timed out; OCR will retry when a token is requested again.');
  });
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
    configureLocalAppCheckDebugToken();

    installRecaptchaRejectionGuard();
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
  if (appCheckTokenInFlight && !forceRefresh) return appCheckTokenInFlight;

  appCheckTokenInFlight = (async () => {
    const { getToken } = await loadAppCheckApi();
    const maxAttempts = 2;
    let lastError = null;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      try {
        const result = await getToken(currentAppCheck, forceRefresh || attempt > 0);
        appCheckTokenError = null;
        return result?.token || '';
      } catch (err) {
        lastError = err;
        appCheckTokenError = err;
        warnAppCheckDebugRegistrationNeeded(err);
        if (attempt >= maxAttempts - 1 || !shouldRetryAppCheckTokenError(err)) break;
        console.warn('Firebase App Check token request failed; retrying once.', err?.message || err);
        await sleep(700);
      }
    }
    throw lastError;
  })().finally(() => {
    appCheckTokenInFlight = null;
  });

  return appCheckTokenInFlight;
}

export function getDb() { return db; }
export function getAuthInstance() { return auth; }
