import {
  ensureAnonymousAuth,
  getCurrentUser,
  getDb,
  initFirebase,
  waitForAuthReady,
} from './firebase.js';
import { importFirebaseAuth, importFirestore } from './firebase-sdk.js';
import { ACCOUNT_PROFILE_LIMITS, normalizeAccountProfile } from './account-profile-model.js';

export { normalizeAccountProfile } from './account-profile-model.js';

function cleanText(value) {
  return String(value ?? '').trim();
}

function accountActionSettings() {
  return {
    url: new URL('profile.html', globalThis.location?.href || 'https://roc-vts.com/').href,
  };
}

async function requireFirebase() {
  const context = initFirebase();
  if (!context.configured || !context.auth || !getDb()) {
    throw new Error('Firebase is not configured.');
  }
  await waitForAuthReady();
  return context;
}

function requireLinkedUser() {
  const user = getCurrentUser();
  if (!user || user.isAnonymous) throw new Error('A linked account is required.');
  return user;
}

async function saveInitialPrivateProfile(user, requestedName = '') {
  const displayName = cleanText(requestedName || user.displayName || 'VTS Player').slice(
    0,
    ACCOUNT_PROFILE_LIMITS.displayName
  );
  return saveAccountProfile({
    displayName: displayName || 'VTS Player',
    gameName: '',
    alliance: '',
    countryCode: '',
    bio: '',
    isPublic: false,
  });
}

export async function getAccountState() {
  await requireFirebase();
  const user = getCurrentUser() || (await ensureAnonymousAuth());
  return {
    user,
    isGuest: !user || user.isAnonymous,
    email: user?.isAnonymous ? '' : user?.email || '',
    displayName: user?.displayName || '',
    emailVerified: Boolean(user?.emailVerified),
  };
}

export async function upgradeGuestWithEmail(email, password, displayName) {
  await requireFirebase();
  const guest = getCurrentUser() || (await ensureAnonymousAuth());
  if (!guest?.isAnonymous) throw new Error('The current session is already linked to an account.');

  const { EmailAuthProvider, linkWithCredential, sendEmailVerification, updateProfile } =
    await importFirebaseAuth();
  const normalizedName = normalizeAccountProfile({ displayName }).displayName;
  const credential = EmailAuthProvider.credential(cleanText(email), String(password || ''));
  const result = await linkWithCredential(guest, credential);
  await updateProfile(result.user, { displayName: normalizedName });
  await saveInitialPrivateProfile(result.user, normalizedName);

  let verificationSent = false;
  try {
    await sendEmailVerification(result.user, accountActionSettings());
    verificationSent = true;
  } catch {
    // Account creation succeeds even if verification delivery is temporarily unavailable.
  }
  return { user: result.user, verificationSent };
}

export async function signInExistingEmail(email, password) {
  const { auth } = await requireFirebase();
  const { signInWithEmailAndPassword } = await importFirebaseAuth();
  return signInWithEmailAndPassword(auth, cleanText(email), String(password || ''));
}

export async function upgradeGuestWithGoogle() {
  await requireFirebase();
  const guest = getCurrentUser() || (await ensureAnonymousAuth());
  if (!guest?.isAnonymous) throw new Error('The current session is already linked to an account.');

  const { GoogleAuthProvider, linkWithPopup } = await importFirebaseAuth();
  const result = await linkWithPopup(guest, new GoogleAuthProvider());
  await saveInitialPrivateProfile(result.user);
  return result;
}

export async function signInExistingGoogle() {
  const { auth } = await requireFirebase();
  const { GoogleAuthProvider, signInWithPopup } = await importFirebaseAuth();
  return signInWithPopup(auth, new GoogleAuthProvider());
}

export async function sendAccountPasswordReset(email) {
  const { auth } = await requireFirebase();
  const { sendPasswordResetEmail } = await importFirebaseAuth();
  await sendPasswordResetEmail(auth, cleanText(email), accountActionSettings());
}

export async function resendAccountVerification() {
  await requireFirebase();
  const user = requireLinkedUser();
  if (!user.email || user.emailVerified) throw new Error('Email verification is not required.');
  const { sendEmailVerification } = await importFirebaseAuth();
  await sendEmailVerification(user, accountActionSettings());
}

export async function signOutToGuest() {
  const { auth } = await requireFirebase();
  const { signOut } = await importFirebaseAuth();
  await signOut(auth);
  return ensureAnonymousAuth();
}

export async function loadAccountProfile() {
  await requireFirebase();
  const user = requireLinkedUser();
  const { doc, getDoc } = await importFirestore();
  const snapshot = await getDoc(doc(getDb(), 'users', user.uid));
  if (!snapshot.exists() || !snapshot.data().accountProfile) return null;
  return snapshot.data().accountProfile;
}

export async function saveAccountProfile(input) {
  await requireFirebase();
  const user = requireLinkedUser();
  const profile = normalizeAccountProfile(input);
  const { updateProfile } = await importFirebaseAuth();
  const { doc, getDoc, serverTimestamp, writeBatch } = await importFirestore();
  const privateRef = doc(getDb(), 'users', user.uid);
  const publicRef = doc(getDb(), 'public_profiles', user.uid);
  const existing = await getDoc(privateRef);
  const createdAt = existing.data()?.accountProfile?.createdAt || serverTimestamp();
  const updatedAt = serverTimestamp();
  const batch = writeBatch(getDb());

  batch.set(
    privateRef,
    {
      accountProfile: {
        ...profile,
        createdAt,
        updatedAt,
      },
    },
    { merge: true }
  );

  if (profile.isPublic) {
    const { isPublic: _isPublic, ...publicProfile } = profile;
    batch.set(publicRef, { ...publicProfile, updatedAt });
  } else {
    batch.delete(publicRef);
  }
  await batch.commit();

  if (user.displayName !== profile.displayName) {
    await updateProfile(user, { displayName: profile.displayName });
  }
  return profile;
}

export function accountErrorMessage(error) {
  const code = String(error?.code || '');
  const messages = {
    'auth/email-already-in-use': 'That email is already registered. Use the Sign in tab.',
    'auth/credential-already-in-use':
      'That Google account already exists. Use the Sign in tab to open it.',
    'auth/invalid-credential': 'The email or password is incorrect.',
    'auth/invalid-email': 'Enter a valid email address.',
    'auth/popup-blocked': 'The browser blocked the Google sign-in window.',
    'auth/popup-closed-by-user': 'Google sign-in was cancelled.',
    'auth/requires-recent-login': 'Please sign in again before continuing.',
    'auth/too-many-requests': 'Too many attempts. Please wait and try again.',
    'auth/weak-password': 'Use a stronger password with at least eight characters.',
  };
  return messages[code] || error?.message || 'Something went wrong. Please try again.';
}
