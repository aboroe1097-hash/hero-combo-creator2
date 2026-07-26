import {
  ensureAnonymousAuth,
  getCurrentUser,
  getDb,
  initFirebase,
  waitForAuthReady,
} from './firebase.js';
import { importFirebaseAuth, importFirestore } from './firebase-sdk.js';
import {
  confirmExistingGoogleAccountSwitch,
  normalizeAccountProfile,
  planExistingGoogleAccountRecovery,
} from './account-profile-model.js';

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

function normalizeInitialProfile(onboarding) {
  return normalizeAccountProfile({
    ...onboarding,
    alliance: '',
    countryCode: '',
    bio: '',
    isPublic: false,
  });
}

async function saveInitialPrivateProfile(profile) {
  return saveAccountProfile(profile);
}

async function fillMissingExistingAccountProfile(user, onboarding) {
  const { doc, getDoc, serverTimestamp, writeBatch } = await importFirestore();
  const privateRef = doc(getDb(), 'users', user.uid);
  const publicRef = doc(getDb(), 'public_profiles', user.uid);
  const [privateSnapshot, publicSnapshot] = await Promise.all([
    getDoc(privateRef),
    getDoc(publicRef),
  ]);
  const privateProfile = privateSnapshot.data()?.accountProfile || null;
  const publicProfile = publicSnapshot.exists() ? publicSnapshot.data() : null;
  const recovery = planExistingGoogleAccountRecovery(privateProfile, publicProfile, onboarding);
  if (recovery.kind === 'none') return recovery;

  const updatedAt = serverTimestamp();
  const batch = writeBatch(getDb());
  if (recovery.kind === 'update') {
    const updates = { 'accountProfile.updatedAt': updatedAt };
    for (const [field, value] of Object.entries(recovery.patch)) {
      updates[`accountProfile.${field}`] = value;
    }
    batch.update(privateRef, updates);
  } else {
    batch.set(
      privateRef,
      {
        accountProfile: {
          ...recovery.profile,
          createdAt: updatedAt,
          updatedAt,
        },
      },
      { merge: true }
    );
  }
  await batch.commit();
  return recovery;
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

export async function upgradeGuestWithEmail(email, password, onboarding) {
  const initialProfile = normalizeInitialProfile(onboarding);
  await requireFirebase();
  const guest = getCurrentUser() || (await ensureAnonymousAuth());
  if (!guest?.isAnonymous) throw new Error('The current session is already linked to an account.');

  const { EmailAuthProvider, linkWithCredential, sendEmailVerification, updateProfile } =
    await importFirebaseAuth();
  const credential = EmailAuthProvider.credential(cleanText(email), String(password || ''));
  const result = await linkWithCredential(guest, credential);
  await updateProfile(result.user, { displayName: initialProfile.gameName });
  await saveInitialPrivateProfile(initialProfile);

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

export async function upgradeGuestWithGoogle(onboarding, { confirmExistingAccount } = {}) {
  const initialProfile = normalizeInitialProfile(onboarding);
  const { auth } = await requireFirebase();
  const guest = getCurrentUser() || (await ensureAnonymousAuth());
  if (!guest?.isAnonymous) throw new Error('The current session is already linked to an account.');

  const { GoogleAuthProvider, linkWithPopup, signInWithCredential, updateProfile } =
    await importFirebaseAuth();
  const provider = new GoogleAuthProvider();
  let result;
  try {
    result = await linkWithPopup(guest, provider);
  } catch (error) {
    if (error?.code !== 'auth/credential-already-in-use') throw error;
    const credential = GoogleAuthProvider.credentialFromError?.(error) || error?.credential || null;
    if (!credential) {
      const credentialError = new Error('Google credential unavailable.');
      credentialError.code = 'account/google-credential-unavailable';
      throw credentialError;
    }

    const confirmed = await confirmExistingGoogleAccountSwitch(confirmExistingAccount);
    if (!confirmed) return { user: guest, canceled: true, signedInExisting: false };

    result = await signInWithCredential(auth, credential);
    await fillMissingExistingAccountProfile(result.user, initialProfile);
    return { user: result.user, signedInExisting: true };
  }

  await updateProfile(result.user, { displayName: initialProfile.gameName });
  await saveInitialPrivateProfile(initialProfile);
  return { user: result.user, signedInExisting: false };
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
  const stored = snapshot.data().accountProfile;
  const gameName = cleanText(stored.gameName || stored.displayName || user.displayName);
  return {
    ...stored,
    displayName: gameName,
    gameName,
    state: cleanText(stored.state),
    referralSource: cleanText(stored.referralSource),
    comments: cleanText(stored.comments),
  };
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
    batch.set(publicRef, {
      displayName: profile.displayName,
      gameName: profile.gameName,
      alliance: profile.alliance,
      countryCode: profile.countryCode,
      bio: profile.bio,
      updatedAt,
    });
  } else {
    batch.delete(publicRef);
  }
  await batch.commit();

  if (user.displayName !== profile.gameName) {
    await updateProfile(user, { displayName: profile.gameName });
  }
  return profile;
}
