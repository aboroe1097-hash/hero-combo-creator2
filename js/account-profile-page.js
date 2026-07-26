import {
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
import {
  ACCOUNT_LANGUAGE_STORAGE_KEY,
  accountErrorMessage,
  applyAccountDocumentPreferences,
  createAccountTranslator,
  resolveAccountLocale,
} from './account-profile-i18n.js';

const byId = (id) => document.getElementById(id);
const authPanel = byId('accountAuthPanel');
const editorPanel = byId('accountEditorPanel');
const status = byId('accountStatus');
const authForm = byId('accountAuthForm');
const profileForm = byId('accountProfileForm');
const onboardingFields = byId('accountOnboardingFields');
const languageSelect = byId('accountLanguage');
let mode = 'create';
let locale = resolveAccountLocale(globalThis.localStorage);
let accountTr = createAccountTranslator(locale);
let currentAccount = null;

function announce(message, kind = 'info') {
  status.textContent = message;
  status.dataset.kind = kind;
}

function setBusy(isBusy) {
  document.body.classList.toggle('account-busy', isBusy);
  document.querySelectorAll('button, input, textarea, select').forEach((control) => {
    control.disabled = isBusy;
  });
  status.setAttribute('aria-busy', String(isBusy));
}

function applyTranslations() {
  applyAccountDocumentPreferences(document, locale);
  document.title = accountTr('document.title');
  document.querySelectorAll('[data-i18n]').forEach((element) => {
    element.textContent = accountTr(element.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-aria-label]').forEach((element) => {
    element.setAttribute('aria-label', accountTr(element.dataset.i18nAriaLabel));
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((element) => {
    element.setAttribute('placeholder', accountTr(element.dataset.i18nPlaceholder));
  });
  document.querySelectorAll('[data-i18n-content]').forEach((element) => {
    element.setAttribute('content', accountTr(element.dataset.i18nContent));
  });
  languageSelect.value = locale;
  setMode(mode);
  if (currentAccount && !currentAccount.isGuest) renderAccountMeta(currentAccount);
}

function setMode(nextMode) {
  mode = nextMode;
  document.querySelectorAll('[role="tab"]').forEach((tab) => {
    const selected = tab.dataset.mode === mode;
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
  });
  onboardingFields.hidden = mode !== 'create';
  onboardingFields.disabled = mode !== 'create';
  byId('accountPassword').autocomplete = mode === 'create' ? 'new-password' : 'current-password';
  byId('authSubmit').querySelector('span').textContent = accountTr(
    mode === 'create' ? 'action.create' : 'action.signin'
  );
  byId('googleAuth').querySelector('span').textContent = accountTr(
    mode === 'create' ? 'action.googleCreate' : 'action.googleSignin'
  );
  byId('sessionWarning').hidden = mode !== 'signin';
}

function fillProfile(profile, fallbackName = '') {
  byId('profileGameName').value = profile?.gameName || profile?.displayName || fallbackName;
  byId('profileState').value = profile?.state || '';
  byId('profileReferralSource').value = profile?.referralSource || '';
  byId('profileComments').value = profile?.comments || '';
  byId('profileAlliance').value = profile?.alliance || '';
  byId('profileCountryCode').value = profile?.countryCode || '';
  byId('profileBio').value = profile?.bio || '';
  byId('profileIsPublic').checked = profile?.isPublic === true;
}

function renderAccountMeta(account) {
  byId('accountEmail').textContent = account.email || accountTr('verification.google');
  byId('verificationState').textContent = account.email
    ? accountTr(account.emailVerified ? 'verification.verified' : 'verification.unverified')
    : accountTr('verification.google');
}

async function render() {
  const account = await getAccountState();
  currentAccount = account;
  authPanel.hidden = !account.isGuest;
  editorPanel.hidden = account.isGuest;
  if (account.isGuest) return;

  renderAccountMeta(account);
  byId('resendVerification').hidden = !account.email || account.emailVerified;
  const profile = await loadAccountProfile();
  fillProfile(profile, account.displayName);
}

async function runAction(action, successKey) {
  setBusy(true);
  announce('');
  try {
    const result = await action();
    await render();
    if (result?.canceled) {
      announce(accountTr('status.googleSwitchCanceled'));
      return;
    }
    announce(accountTr(result?.signedInExisting ? 'status.signedIn' : successKey), 'success');
  } catch (error) {
    announce(accountErrorMessage(error, accountTr), 'error');
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

languageSelect.addEventListener('change', () => {
  locale = languageSelect.value;
  accountTr = createAccountTranslator(locale);
  try {
    globalThis.localStorage?.setItem(ACCOUNT_LANGUAGE_STORAGE_KEY, locale);
  } catch {
    /* unavailable storage */
  }
  applyTranslations();
  globalThis.dispatchEvent(new CustomEvent('vts:language-change', { detail: { locale } }));
});

function collectOnboarding() {
  return {
    gameName: byId('accountGameName').value,
    state: byId('accountState').value,
    referralSource: byId('accountReferralSource').value,
    comments: byId('accountComments').value,
  };
}

function reportOnboardingValidity() {
  const invalid = onboardingFields.querySelector(':invalid');
  if (!invalid) return true;
  invalid.reportValidity();
  return false;
}

authForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const email = byId('accountEmailInput').value;
  const password = byId('accountPassword').value;
  runAction(
    () =>
      mode === 'create'
        ? upgradeGuestWithEmail(email, password, collectOnboarding())
        : signInExistingEmail(email, password),
    mode === 'create' ? 'status.created' : 'status.signedIn'
  );
});

byId('googleAuth').addEventListener('click', () => {
  if (mode === 'create' && !reportOnboardingValidity()) return;
  runAction(
    () =>
      mode === 'create'
        ? upgradeGuestWithGoogle(collectOnboarding(), {
            confirmExistingAccount: () =>
              globalThis.confirm(accountTr('confirm.googleExistingAccount')),
          })
        : signInExistingGoogle(),
    mode === 'create' ? 'status.created' : 'status.signedIn'
  );
});

byId('passwordReset').addEventListener('click', () => {
  const email = byId('accountEmailInput').value;
  if (!email) {
    announce(accountTr('status.enterEmail'), 'error');
    byId('accountEmailInput').focus();
    return;
  }
  runAction(() => sendAccountPasswordReset(email), 'status.resetSent');
});

byId('resendVerification').addEventListener('click', () => {
  runAction(resendAccountVerification, 'status.verificationSent');
});

profileForm.addEventListener('submit', (event) => {
  event.preventDefault();
  runAction(
    () =>
      saveAccountProfile({
        gameName: byId('profileGameName').value,
        state: byId('profileState').value,
        referralSource: byId('profileReferralSource').value,
        comments: byId('profileComments').value,
        alliance: byId('profileAlliance').value,
        countryCode: byId('profileCountryCode').value,
        bio: byId('profileBio').value,
        isPublic: byId('profileIsPublic').checked,
      }),
    'status.saved'
  );
});

byId('signOutAccount').addEventListener('click', () => {
  runAction(signOutToGuest, 'status.signedOut');
});

applyTranslations();
setBusy(true);
render()
  .catch((error) => announce(accountErrorMessage(error, accountTr), 'error'))
  .finally(() => setBusy(false));
