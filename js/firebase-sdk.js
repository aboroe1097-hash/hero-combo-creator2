// Keep Firebase behind small dynamic import helpers so each consumer loads only
// the SDK surface it needs. Vite turns these package imports into same-origin,
// content-hashed chunks that are covered by the app's normal asset recovery and
// service-worker caching instead of depending on an unbounded third-party CDN
// module request during startup.

export function importFirebaseApp() {
  return import('firebase/app');
}

export function importFirebaseAuth() {
  return import('firebase/auth');
}

export function importFirestore() {
  return import('firebase/firestore');
}

export function importFirestoreLite() {
  return import('firebase/firestore/lite');
}

export function importFirebaseAnalytics() {
  return import('firebase/analytics');
}

export function importFirebaseAppCheck() {
  return import('firebase/app-check');
}
