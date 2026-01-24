// firebase.js
// Exposes initFirebase() and helpers. Uses modular SDK.
// NOTE: This file is an ES module. It's imported by app.js.

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

let app = null;
let db = null;
let auth = null;

// Move your firebase config here. It's safe to keep this public client config,
// but use Firestore Rules to protect data (rules provided below).
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

// firebase.js - Updated Auth Logic
export async function ensureAnonymousAuth() {
  if (!auth) throw new Error("Firebase not initialized");
  
  // 1. Resolve immediately if already authed
  if (auth.currentUser) return auth.currentUser;

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Auth timed out")), 10000);
    
    const unsubs = onAuthStateChanged(auth, async (user) => {
      if (user) {
        clearTimeout(timeout);
        unsubs();
        resolve(user);
      } else {
        try {
          const cred = await signInAnonymously(auth);
          clearTimeout(timeout);
          unsubs();
          resolve(cred.user);
        } catch (err) {
          clearTimeout(timeout);
          reject(err);
        }
      }
    });
  });
}

export function getDb() { return db; }
export function getAuthInstance() { return auth; }

