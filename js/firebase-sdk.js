// Firebase CDN module loader.
// Raw gh-pages modules can be loaded from cached HTML without Vite's resolver,
// so avoid bare package specifiers like "firebase/app" in browser-facing code.

export const FIREBASE_CDN_VERSION = '11.6.1';

const FIREBASE_CDN_BASE = `https://www.gstatic.com/firebasejs/${FIREBASE_CDN_VERSION}`;

export const FIREBASE_MODULE_URLS = Object.freeze({
  app: `${FIREBASE_CDN_BASE}/firebase-app.js`,
  auth: `${FIREBASE_CDN_BASE}/firebase-auth.js`,
  firestore: `${FIREBASE_CDN_BASE}/firebase-firestore.js`,
  analytics: `${FIREBASE_CDN_BASE}/firebase-analytics.js`,
  appCheck: `${FIREBASE_CDN_BASE}/firebase-app-check.js`,
});

export function importFirebaseApp() {
  return import(/* @vite-ignore */ FIREBASE_MODULE_URLS.app);
}

export function importFirebaseAuth() {
  return import(/* @vite-ignore */ FIREBASE_MODULE_URLS.auth);
}

export function importFirestore() {
  return import(/* @vite-ignore */ FIREBASE_MODULE_URLS.firestore);
}

export function importFirebaseAnalytics() {
  return import(/* @vite-ignore */ FIREBASE_MODULE_URLS.analytics);
}

export function importFirebaseAppCheck() {
  return import(/* @vite-ignore */ FIREBASE_MODULE_URLS.appCheck);
}
