// firebase.js
// Exposes initFirebase() and helpers. Uses modular SDK.
// NOTE: This file is an ES module. It's imported by app.js.

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

let app = null;
let db = null;
let auth = null;

export const firebaseConfig = {
  apiKey: "AIzaSyDO0WZf1-T9OIX-Rxa1EUj1HPOI9ey5wWY",
  authDomain: "abocombo.firebaseapp.com",
  projectId: "abocombo",
  storageBucket: "abocombo.firebasestorage.app",
  messagingSenderId: "103195597389",
  appId: "1:103195597389:web:97788d99356b4e59839a04",
  measurementId: "G-ZV9X180WLS"
};

export function initFirebase() {
  if (app) return { app, db, auth };
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  return { app, db, auth };
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
