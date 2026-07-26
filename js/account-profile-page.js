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
import { registerServiceWorker } from './pwa-register.js';

const byId = (id) => document.getElementById(id);
const authPanel = byId('accountAuthPanel');
const editorPanel = byId('accountEditorPanel');
const status = byId('accountStatus');
const authForm = byId('accountAuthForm');
const profileForm = byId('accountProfileForm');
const onboardingFields = byId('accountOnboardingFields');
const languageSelect = byId('accountLanguage');
const languageControl = byId('accountLanguageControl');
const saveButton = byId('saveProfile');
const saveState = byId('profileSaveState');
const aboutDetails = byId('accountAboutDetails');
const profileFieldSelector = '[data-profile-field]';
let mode = 'create';
let locale = resolveAccountLocale(globalThis.localStorage);
let accountTr = createAccountTranslator(locale);
let currentAccount = null;
let profileBaseline = null;
let profileDirty = false;
let busy = false;
let saveInFlight = false;
let saveJustSucceeded = false;

function announce(message, kind = 'info') {
  status.textContent = message;
  status.dataset.kind = kind;
}

function updateSaveState() {
  saveButton.disabled = busy || !profileDirty || profileBaseline === null;
  saveButton.setAttribute('aria-disabled', String(saveButton.disabled));
  const stateKey = saveInFlight
    ? 'save.saving'
    : profileDirty
      ? 'save.unsaved'
      : saveJustSucceeded
        ? 'status.saved'
        : 'save.clean';
  saveState.textContent = accountTr(stateKey);
  saveState.dataset.state = stateKey.split('.').at(-1);
}

function setDirty(nextDirty) {
  profileDirty = Boolean(nextDirty);
  if (profileDirty) saveJustSucceeded = false;
  document.body.classList.toggle('account-dirty', profileDirty);
  updateSaveState();
}

function setBusy(isBusy) {
  busy = isBusy;
  document.body.classList.toggle('account-busy', isBusy);
  document
    .querySelectorAll('button, input, textarea, select')
    .forEach((control) => (control.disabled = isBusy));
  if (!isBusy) {
    document
      .querySelectorAll('button, input, textarea, select')
      .forEach((control) => (control.disabled = false));
    setMode(mode);
  }
  status.setAttribute('aria-busy', String(isBusy));
  updateSaveState();
}

function moveLanguageControl(isGuest) {
  const destination = byId(isGuest ? 'accountLanguageTopbarSlot' : 'accountLanguageSettingsSlot');
  destination.append(languageControl);
  languageControl.hidden = false;
}

function formatCount(value) {
  return new Intl.NumberFormat(locale).format(value);
}

function updateCounters() {
  byId('profileBioCount').textContent =
    `${formatCount(byId('profileBio').value.length)} / ${formatCount(280)}`;
  byId('profileCommentsCount').textContent =
    `${formatCount(byId('profileComments').value.length)} / ${formatCount(1000)}`;
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
  updateCounters();
  updateSaveState();
  if (currentAccount && !currentAccount.isGuest) renderAccountMeta(currentAccount);
}

function setMode(nextMode) {
  mode = nextMode;
  document.querySelectorAll('.account-tabs [role="tab"]').forEach((tab) => {
    const selected = tab.dataset.mode === mode;
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
  });
  onboardingFields.hidden = mode !== 'create';
  onboardingFields.disabled = mode !== 'create' || busy;
  const passwordInput = byId('accountPassword');
  passwordInput.autocomplete = mode === 'create' ? 'new-password' : 'current-password';
  passwordInput.minLength = mode === 'create' ? 8 : 0;
  byId('authSubmit').querySelector('span').textContent = accountTr(
    mode === 'create' ? 'action.create' : 'action.signin'
  );
  byId('googleAuth').querySelector('span').textContent = accountTr(
    mode === 'create' ? 'action.googleCreate' : 'action.googleSignin'
  );
  byId('sessionWarning').hidden = mode !== 'signin';
}

function collectProfile() {
  return {
    gameName: byId('profileGameName').value,
    state: byId('profileState').value,
    referralSource: byId('profileReferralSource').value,
    comments: byId('profileComments').value,
    alliance: byId('profileAlliance').value,
    countryCode: byId('profileCountryCode').value,
    bio: byId('profileBio').value,
    isPublic: byId('profileIsPublic').checked,
  };
}

function profileSnapshot() {
  return JSON.stringify(collectProfile());
}

function setProfileBaseline(saved = false) {
  profileBaseline = profileSnapshot();
  saveJustSucceeded = saved;
  setDirty(false);
}

function updateDirtyState() {
  if (profileBaseline === null) {
    setDirty(false);
    return;
  }
  setDirty(profileSnapshot() !== profileBaseline);
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
  updateCounters();
}

function renderAccountMeta(account) {
  const email = account.email || accountTr('verification.google');
  const verification = account.email
    ? accountTr(account.emailVerified ? 'verification.verified' : 'verification.unverified')
    : accountTr('verification.google');
  byId('accountEmail').textContent = email;
  byId('verificationState').textContent = verification;
  byId('profileEmailSummary').textContent = email;
  byId('profileVerificationSummary').textContent = verification;
}

async function render() {
  const account = await getAccountState();
  currentAccount = account;
  authPanel.hidden = true;
  editorPanel.hidden = true;
  if (account.isGuest) {
    moveLanguageControl(true);
    profileBaseline = null;
    saveJustSucceeded = false;
    setDirty(false);
    authPanel.hidden = false;
    document.body.dataset.accountReady = 'true';
    return;
  }

  renderAccountMeta(account);
  byId('resendVerification').hidden = !account.email || account.emailVerified;
  const profile = await loadAccountProfile();
  fillProfile(profile, account.displayName);
  setProfileBaseline();
  moveLanguageControl(false);
  editorPanel.hidden = false;
  document.body.dataset.accountReady = 'true';
}

async function runAction(action, successKey, options = {}) {
  const { refresh = false, onSuccess, saving = false } = options;
  saveInFlight = saving;
  setBusy(true);
  announce('');
  try {
    const result = await action();
    if (result?.canceled) {
      announce(accountTr('status.googleSwitchCanceled'));
      return false;
    }
    if (refresh) await render();
    onSuccess?.(result);
    announce(accountTr(result?.signedInExisting ? 'status.signedIn' : successKey), 'success');
    return true;
  } catch (error) {
    announce(accountErrorMessage(error, accountTr), 'error');
    return false;
  } finally {
    saveInFlight = false;
    setBusy(false);
  }
}

document.querySelectorAll('.account-tabs [role="tab"]').forEach((tab) => {
  tab.addEventListener('click', () => setMode(tab.dataset.mode));
  tab.addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    setMode(mode === 'create' ? 'signin' : 'create');
    document.querySelector(`.account-tabs [role="tab"][data-mode="${mode}"]`)?.focus();
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

function revealFirstInvalid() {
  const invalid = profileForm.querySelector(':invalid');
  if (!invalid) return;
  if (aboutDetails.contains(invalid)) aboutDetails.open = true;
  globalThis.requestAnimationFrame(() => {
    invalid.focus();
    invalid.reportValidity();
  });
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
    mode === 'create' ? 'status.created' : 'status.signedIn',
    { refresh: true }
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
    mode === 'create' ? 'status.created' : 'status.signedIn',
    { refresh: true }
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

profileForm.addEventListener('input', (event) => {
  if (!event.target.matches(profileFieldSelector)) return;
  updateCounters();
  updateDirtyState();
});
profileForm.addEventListener('change', (event) => {
  if (event.target.matches(profileFieldSelector)) updateDirtyState();
});
profileForm.addEventListener('invalid', revealFirstInvalid, true);
profileForm.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!profileForm.checkValidity()) {
    revealFirstInvalid();
    return;
  }
  runAction(() => saveAccountProfile(collectProfile()), 'status.saved', {
    saving: true,
    onSuccess: () => setProfileBaseline(true),
  });
});

byId('signOutAccount').addEventListener('click', () => {
  if (profileDirty && !globalThis.confirm(accountTr('confirm.dirtySignout'))) return;
  runAction(signOutToGuest, 'status.signedOut', { refresh: true });
});

globalThis.addEventListener('beforeunload', (event) => {
  if (!profileDirty) return;
  event.preventDefault();
  event.returnValue = '';
});

const settingsAnchors = [...document.querySelectorAll('[data-settings-anchor]')];
function setCurrentAnchor(hash) {
  settingsAnchors.forEach((anchor) => {
    if (anchor.hash === hash) anchor.setAttribute('aria-current', 'true');
    else anchor.removeAttribute('aria-current');
  });
}
settingsAnchors.forEach((anchor) =>
  anchor.addEventListener('click', () => setCurrentAnchor(anchor.hash))
);
if ('IntersectionObserver' in globalThis) {
  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) setCurrentAnchor(`#${visible.target.id}`);
    },
    { rootMargin: '-20% 0px -65%', threshold: [0, 0.25, 0.5] }
  );
  document
    .querySelectorAll('.account-settings-section')
    .forEach((section) => observer.observe(section));
}

applyTranslations();
setBusy(true);
render()
  .catch((error) => announce(accountErrorMessage(error, accountTr), 'error'))
  .finally(() => setBusy(false));
registerServiceWorker();
