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
import {
  firebaseAuthEmailDomain,
  firebaseConfig as deployedFirebaseConfig,
  firebaseConfigValue as configValue,
  getFirebaseAppCheckDebugToken,
  isFirebaseConfigured as isFirebaseConfiguredShared,
} from './firebase-config.js';
import { isLocalDevHost } from './utils.js';

export { firebaseConfig } from './firebase-config.js';

const [
  { initializeApp },
  {
    getAuth,
    signInAnonymously,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    setPersistence,
    browserLocalPersistence,
    getIdTokenResult,
  },
  { getFirestore },
] = await Promise.all([importFirebaseApp(), importFirebaseAuth(), importFirestore()]);

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
let analyticsScheduled = false;

const getAppCheckDebugToken = getFirebaseAppCheckDebugToken;
const authEmailDomain = firebaseAuthEmailDomain;

export function isFirebaseConfigured() {
  return isFirebaseConfiguredShared();
}

function configureLocalAppCheckDebugToken() {
  const appCheckDebugToken = getAppCheckDebugToken();
  if (!appCheckDebugToken || typeof globalThis === 'undefined') return false;
  if (!isLocalDevHost()) {
    if (!appCheckDebugNoticeLogged) {
      appCheckDebugNoticeLogged = true;
      console.warn(
        '[firebase] Ignoring VITE_FIREBASE_APPCHECK_DEBUG_TOKEN outside local development.'
      );
    }
    return false;
  }

  globalThis.FIREBASE_APPCHECK_DEBUG_TOKEN =
    appCheckDebugToken === 'true' ? true : appCheckDebugToken;
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
  return /403|fetch-status-error|exchangeDebugToken|debug token|permission|unauthorized/i.test(
    text
  );
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

export function getFirebaseSetupStatus() {
  const recaptchaSiteKey = configValue('VITE_RECAPTCHA_SITE_KEY');
  const appCheckDebugToken = getAppCheckDebugToken();
  return {
    configured: isFirebaseConfigured(),
    appCheckReady: Boolean(appCheck),
    hasRecaptchaSiteKey: Boolean(recaptchaSiteKey),
    appCheckDebugTokenMode:
      appCheckDebugToken === 'true' ? 'generated' : appCheckDebugToken ? 'fixed' : '',
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
  if (recaptchaRejectionGuardInstalled || typeof globalThis?.addEventListener !== 'function')
    return;
  recaptchaRejectionGuardInstalled = true;
  globalThis.addEventListener('unhandledrejection', (event) => {
    if (!isRecaptchaTimeoutError(event?.reason)) return;
    event.preventDefault();
    console.warn(
      'Firebase App Check reCAPTCHA timed out; OCR will retry when a token is requested again.'
    );
  });
}

export function initFirebase() {
  if (app) return { app, db, auth, analytics, configured: true };
  if (!isFirebaseConfigured()) {
    if (!missingConfigLogged) {
      missingConfigLogged = true;
      console.info(
        '[firebase] Cloud sync disabled: create a .env file from .env.example and set VITE_FIREBASE_API_KEY, VITE_FIREBASE_PROJECT_ID, and VITE_FIREBASE_APP_ID to enable Firebase.'
      );
    }
    return { app, db, auth, analytics, configured: false };
  }
  app = initializeApp(deployedFirebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);

  scheduleFirebaseAnalytics();

  return { app, db, auth, analytics, configured: true };
}

function scheduleFirebaseAnalytics() {
  if (analyticsScheduled || typeof globalThis === 'undefined') return;
  analyticsScheduled = true;
  let started = false;
  let fallbackTimer = 0;
  const interactionEvents = ['pointerdown', 'keydown', 'touchstart', 'scroll'];

  const removeInteractionListeners = () => {
    interactionEvents.forEach((eventName) =>
      globalThis.removeEventListener?.(eventName, startAnalytics, true)
    );
  };
  const startAnalytics = () => {
    if (started || !app) return;
    started = true;
    removeInteractionListeners();
    globalThis.clearTimeout?.(fallbackTimer);
    importFirebaseAnalytics()
      .then(({ getAnalytics }) => {
        analytics = getAnalytics(app);
      })
      .catch((e) => {
        console.warn('Analytics blocked or failed to initialize', e);
      });
  };
  const armPostLoad = () => {
    interactionEvents.forEach((eventName) =>
      globalThis.addEventListener?.(eventName, startAnalytics, {
        capture: true,
        once: true,
        passive: true,
      })
    );
    fallbackTimer = globalThis.setTimeout?.(startAnalytics, 10000) || 0;
  };

  if (globalThis.document?.readyState === 'complete') armPostLoad();
  else globalThis.addEventListener?.('load', armPostLoad, { once: true });
}

let authInFlight = null;

async function ensureAuthPersistence() {
  if (!auth) throw new Error('Firebase not initialized');
  try {
    await setPersistence(auth, browserLocalPersistence);
  } catch {
    // Some restricted browser contexts block persistence; auth can continue in-memory.
  }
}

function normalizeAuthUsername(username) {
  return String(username || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '');
}

export function usernameToEmail(username) {
  const normalized = normalizeAuthUsername(username);
  if (!normalized) throw new Error('Username is required');
  if (normalized.length > 40) throw new Error('Username is too long');
  return `${normalized}@${authEmailDomain}`;
}

export async function signInWithUsername(username, password) {
  if (!auth) initFirebase();
  if (!auth) throw new Error('Firebase not initialized');
  await ensureAuthPersistence();
  return signInWithEmailAndPassword(auth, usernameToEmail(username), String(password || ''));
}

export async function signOutUser() {
  if (!auth) initFirebase();
  if (!auth) return;
  await signOut(auth);
}

export function onUserChanged(callback) {
  if (!auth) initFirebase();
  if (!auth) return () => {};
  return onAuthStateChanged(auth, callback);
}

export function getCurrentUser() {
  return auth?.currentUser || null;
}

export async function waitForAuthReady() {
  if (!auth) throw new Error('Firebase not initialized');
  await ensureAuthPersistence();
  if (typeof auth.authStateReady === 'function') {
    let timeout = null;
    await Promise.race([
      auth.authStateReady(),
      new Promise((resolve) => {
        timeout = setTimeout(resolve, 3000);
      }),
    ]).finally(() => clearTimeout(timeout));
    return auth.currentUser || null;
  }
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
      isTokenAutoRefreshEnabled: true,
    });
  } catch (e) {
    appCheckInitError = e;
    console.warn('App Check initialization failed; continuing without it.', e);
  }

  return appCheck;
}

export async function getFirebaseAdminClaim(forceRefresh = false, userOverride = null) {
  if (!auth) throw new Error('Firebase not initialized');
  const user = userOverride || auth.currentUser;
  if (!user || user.isAnonymous) return false;
  const token = await getIdTokenResult(user, forceRefresh);
  return token?.claims?.admin === true;
}

export async function isAdminAuthUser(userOverride = null, options = {}) {
  const user = userOverride || auth?.currentUser || null;
  if (!user || user.isAnonymous) return false;
  return getFirebaseAdminClaim(Boolean(options.forceRefresh), user);
}

// Legacy loose admin check: true if the user signed in with an email/password
// provider. Firestore rules NO LONGER gate on this (they require the `admin`
// custom claim via isAdmin()); the login flow uses isAdminAuthUser() instead.
// Remaining call-sites use this only as a non-blocking re-resolution hint for
// already-admitted admin sessions, not as a security boundary. Accepts and
// ignores an options arg for signature compatibility with isAdminAuthUser.
export async function isPasswordAuthUser(userOverride = null, _options = {}) {
  const user = userOverride || auth?.currentUser || null;
  if (!user || user.isAnonymous) return false;
  if (
    Array.isArray(user.providerData) &&
    user.providerData.some((p) => p?.providerId === 'password')
  ) {
    return true;
  }
  try {
    const token = await getIdTokenResult(user);
    return token?.signInProvider === 'password';
  } catch {
    // Token inspection failed, so do not surface password-admin-only UI.
    return false;
  }
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
        console.warn(
          'Firebase App Check token request failed; retrying once.',
          err?.message || err
        );
        await sleep(700);
      }
    }
    throw lastError;
  })().finally(() => {
    appCheckTokenInFlight = null;
  });

  return appCheckTokenInFlight;
}

export function getDb() {
  return db;
}
export function getAuthInstance() {
  return auth;
}
