// js/player-profile.js - Roster persistence to localStorage + Firebase
import { getDb } from './firebase.js';
import { getUserId } from './state.js';

const PROFILE_KEY = 'vts_player_profile';

export function loadPlayerProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? JSON.parse(raw) : { roster: [] };
  } catch { return { roster: [] }; }
}

export function savePlayerProfileLocal(profile) {
  try { localStorage.setItem(PROFILE_KEY, JSON.stringify(profile)); } catch {}
}

export async function syncPlayerProfileToCloud(profile) {
  const db = getDb();
  const uid = getUserId();
  if (!db || !uid || uid === 'anonymous') return;
  try {
    const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js');
    await setDoc(doc(db, 'users', uid), { playerProfile: profile }, { merge: true });
  } catch (e) {
    console.warn('Profile cloud sync failed:', e);
  }
}

export async function loadPlayerProfileFromCloud() {
  const db = getDb();
  const uid = getUserId();
  if (!db || !uid || uid === 'anonymous') return null;
  try {
    const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js');
    const snap = await getDoc(doc(db, 'users', uid));
    if (snap.exists() && snap.data().playerProfile) {
      const profile = snap.data().playerProfile;
      savePlayerProfileLocal(profile);
      return profile;
    }
  } catch {}
  return null;
}

export function applyRosterToGenerator(roster, generatorSelectedHeroes) {
  generatorSelectedHeroes.clear();
  roster.forEach(h => generatorSelectedHeroes.add(h));
}
