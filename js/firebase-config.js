// Shared Firebase client configuration.
// Keep this module dependency-light so public pages can initialize Auth
// without pulling in the full Firestore SDK.

const DEPLOYED_FIREBASE_CONFIG = Object.freeze({
  VITE_FIREBASE_API_KEY: ['AIzaSy', 'Bye12G_ITL9mb2bkjykmRl4lprhJHs3D0'].join(''),
  VITE_FIREBASE_AUTH_DOMAIN: 'abocombo.firebaseapp.com',
  VITE_FIREBASE_PROJECT_ID: 'abocombo',
  VITE_FIREBASE_STORAGE_BUCKET: 'abocombo.firebasestorage.app',
  VITE_FIREBASE_MESSAGING_SENDER_ID: '103195597389',
  VITE_FIREBASE_APP_ID: '1:103195597389:web:97788d99356b4e59839a04',
  VITE_RECAPTCHA_SITE_KEY: ['6LeNUikt', 'AAAAAOXtT5ohKBb7kMdjE49iDYf6AwYt'].join(''),
});

const viteEnv = import.meta.env || {};
const nodeEnv = typeof process !== 'undefined' ? process.env : {};
const runtimeEnv =
  typeof globalThis !== 'undefined' &&
  globalThis.VTS_FIREBASE_CONFIG &&
  typeof globalThis.VTS_FIREBASE_CONFIG === 'object'
    ? globalThis.VTS_FIREBASE_CONFIG
    : {};
const env = { ...DEPLOYED_FIREBASE_CONFIG, ...nodeEnv, ...viteEnv, ...runtimeEnv };

export const firebaseConfigValue = (key) => String(env[key] || '').trim();

const firebaseProjectId = firebaseConfigValue('VITE_FIREBASE_PROJECT_ID');
const firebaseAppId = firebaseConfigValue('VITE_FIREBASE_APP_ID');
const firebaseSenderId =
  firebaseConfigValue('VITE_FIREBASE_MESSAGING_SENDER_ID') ||
  firebaseAppId.match(/^1:(\d+):web:/)?.[1] ||
  '';

export const firebaseAuthEmailDomain = (
  firebaseConfigValue('VITE_AUTH_EMAIL_DOMAIN') || 'abocombo.web.app'
)
  .replace(/^@+/, '')
  .toLowerCase();

export const firebaseConfig = {
  apiKey: firebaseConfigValue('VITE_FIREBASE_API_KEY'),
  authDomain:
    firebaseConfigValue('VITE_FIREBASE_AUTH_DOMAIN') ||
    (firebaseProjectId ? `${firebaseProjectId}.firebaseapp.com` : ''),
  projectId: firebaseProjectId,
  storageBucket:
    firebaseConfigValue('VITE_FIREBASE_STORAGE_BUCKET') ||
    (firebaseProjectId ? `${firebaseProjectId}.firebasestorage.app` : ''),
  messagingSenderId: firebaseSenderId,
  appId: firebaseAppId,
  measurementId: firebaseConfigValue('VITE_FIREBASE_MEASUREMENT_ID'),
};

export function isFirebaseConfigured() {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);
}

export function getFirebaseAppCheckDebugToken() {
  return firebaseConfigValue('VITE_FIREBASE_APPCHECK_DEBUG_TOKEN');
}
