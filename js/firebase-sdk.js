// Firebase CDN module loader.
// Raw gh-pages modules can be loaded from cached HTML without Vite's resolver,
// so avoid bare package specifiers like "firebase/app" in browser-facing code.

export const FIREBASE_CDN_VERSION = '11.6.1';

const FIREBASE_CDN_BASE = `https://www.gstatic.com/firebasejs/${FIREBASE_CDN_VERSION}`;

export const FIREBASE_MODULE_URLS = Object.freeze({
  app: `${FIREBASE_CDN_BASE}/firebase-app.js`,
  auth: `${FIREBASE_CDN_BASE}/firebase-auth.js`,
  firestore: `${FIREBASE_CDN_BASE}/firebase-firestore.js`,
  firestoreLite: `${FIREBASE_CDN_BASE}/firebase-firestore-lite.js`,
  analytics: `${FIREBASE_CDN_BASE}/firebase-analytics.js`,
  appCheck: `${FIREBASE_CDN_BASE}/firebase-app-check.js`,
});

const IMPORT_RETRY_DELAYS_MS = [800, 2000];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// A failed dynamic import is cached in the browser's module map for the exact
// URL, so bare re-imports of the same URL rethrow instantly. Retries append a
// cache-busting query instead; the module's internal relative imports keep
// their plain URLs, so Firebase's shared internal state is unaffected.
async function importWithRetry(url) {
  let lastError;
  for (let attempt = 0; attempt <= IMPORT_RETRY_DELAYS_MS.length; attempt += 1) {
    const attemptUrl = attempt === 0 ? url : `${url}?cdnretry=${attempt}`;
    try {
      return await import(/* @vite-ignore */ attemptUrl);
    } catch (err) {
      lastError = err;
      if (attempt < IMPORT_RETRY_DELAYS_MS.length) {
        console.warn(`[firebase-sdk] import failed (attempt ${attempt + 1}), retrying:`, url);
        await sleep(IMPORT_RETRY_DELAYS_MS[attempt]);
      }
    }
  }
  throw lastError;
}

export function importFirebaseApp() {
  return importWithRetry(FIREBASE_MODULE_URLS.app);
}

export function importFirebaseAuth() {
  return importWithRetry(FIREBASE_MODULE_URLS.auth);
}

export function importFirestore() {
  return importWithRetry(FIREBASE_MODULE_URLS.firestore);
}

export function importFirestoreLite() {
  return importWithRetry(FIREBASE_MODULE_URLS.firestoreLite);
}

export function importFirebaseAnalytics() {
  return importWithRetry(FIREBASE_MODULE_URLS.analytics);
}

export function importFirebaseAppCheck() {
  return importWithRetry(FIREBASE_MODULE_URLS.appCheck);
}
