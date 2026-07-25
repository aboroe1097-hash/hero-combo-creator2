import {
  accountErrorMessage,
  getAccountState,
  loadAccountProfile,
  resendAccountVerification,
  saveAccountProfile,
  sendAccountPasswordReset,
  signInExistingEmail,
  signInExistingGoogle,
  signOutToGuest,
  upgradeGuestWithEmail,
  upgradeGuestWithGoogle,
} from './account-profile-service.js';

const byId = (id) => document.getElementById(id);
const authPanel = byId('accountAuthPanel');
const editorPanel = byId('accountEditorPanel');
const status = byId('accountStatus');
const authForm = byId('accountAuthForm');
const profileForm = byId('accountProfileForm');
let mode = 'create';

function announce(message, kind = 'info') {
  status.textContent = message;
  status.dataset.kind = kind;
}

function setBusy(isBusy) {
  document.body.classList.toggle('account-busy', isBusy);
  document.querySelectorAll('button, input, textarea').forEach((control) => {
    control.disabled = isBusy;
  });
  status.setAttribute('aria-busy', String(isBusy));
}

function setMode(nextMode) {
  mode = nextMode;
  document.querySelectorAll('[role="tab"]').forEach((tab) => {
    const selected = tab.dataset.mode === mode;
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
  });
  byId('displayNameField').hidden = mode !== 'create';
  byId('accountDisplayName').required = mode === 'create';
  byId('accountPassword').autocomplete = mode === 'create' ? 'new-password' : 'current-password';
  byId('authSubmit').textContent = mode === 'create' ? 'Create account' : 'Sign in';
  byId('googleAuth').textContent =
    mode === 'create' ? 'Continue with Google' : 'Sign in with Google';
  byId('sessionWarning').hidden = mode !== 'signin';
}

function fillProfile(profile, fallbackName = '') {
  byId('profileDisplayName').value = profile?.displayName || fallbackName;
  byId('profileGameName').value = profile?.gameName || '';
  byId('profileAlliance').value = profile?.alliance || '';
  byId('profileCountryCode').value = profile?.countryCode || '';
  byId('profileBio').value = profile?.bio || '';
  byId('profileIsPublic').checked = profile?.isPublic === true;
}

async function render() {
  const account = await getAccountState();
  authPanel.hidden = !account.isGuest;
  editorPanel.hidden = account.isGuest;
  if (account.isGuest) return;

  byId('accountEmail').textContent = account.email || 'Google account';
  byId('verificationState').textContent = account.email
    ? account.emailVerified
      ? 'Verified'
      : 'Not verified'
    : 'Managed by Google';
  byId('resendVerification').hidden = !account.email || account.emailVerified;
  const profile = await loadAccountProfile();
  fillProfile(profile, account.displayName);
}

async function runAction(action, successMessage) {
  setBusy(true);
  announce('');
  try {
    await action();
    await render();
    announce(successMessage, 'success');
  } catch (error) {
    announce(accountErrorMessage(error), 'error');
  } finally {
    setBusy(false);
  }
}

document.querySelectorAll('[role="tab"]').forEach((tab) => {
  tab.addEventListener('click', () => setMode(tab.dataset.mode));
  tab.addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    setMode(mode === 'create' ? 'signin' : 'create');
    document.querySelector(`[role="tab"][data-mode="${mode}"]`)?.focus();
  });
});

authForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const email = byId('accountEmailInput').value;
  const password = byId('accountPassword').value;
  const displayName = byId('accountDisplayName').value;
  runAction(
    () =>
      mode === 'create'
        ? upgradeGuestWithEmail(email, password, displayName)
        : signInExistingEmail(email, password),
    mode === 'create' ? 'Account created. Your profile is private.' : 'Signed in successfully.'
  );
});

byId('googleAuth').addEventListener('click', () => {
  runAction(
    () => (mode === 'create' ? upgradeGuestWithGoogle() : signInExistingGoogle()),
    mode === 'create' ? 'Account created. Your profile is private.' : 'Signed in successfully.'
  );
});

byId('passwordReset').addEventListener('click', () => {
  const email = byId('accountEmailInput').value;
  if (!email) {
    announce('Enter your email first.', 'error');
    byId('accountEmailInput').focus();
    return;
  }
  runAction(() => sendAccountPasswordReset(email), 'Password reset email sent.');
});

byId('resendVerification').addEventListener('click', () => {
  runAction(resendAccountVerification, 'Verification email sent.');
});

profileForm.addEventListener('submit', (event) => {
  event.preventDefault();
  runAction(
    () =>
      saveAccountProfile({
        displayName: byId('profileDisplayName').value,
        gameName: byId('profileGameName').value,
        alliance: byId('profileAlliance').value,
        countryCode: byId('profileCountryCode').value,
        bio: byId('profileBio').value,
        isPublic: byId('profileIsPublic').checked,
      }),
    'Profile saved.'
  );
});

byId('signOutAccount').addEventListener('click', () => {
  runAction(signOutToGuest, 'Signed out. A fresh guest session is ready.');
});

setMode('create');
setBusy(true);
render()
  .catch((error) => announce(accountErrorMessage(error), 'error'))
  .finally(() => setBusy(false));
