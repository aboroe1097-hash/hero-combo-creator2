import {
  getAccountState,
  loadAccountProfile,
  loadPublicAccountProfile,
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
const statusMessage = byId('accountStatusMessage');
const authForm = byId('accountAuthForm');
const onboardingForm = byId('accountOnboardingForm');
const profileForm = byId('accountProfileForm');

const accountTabs = document.querySelector('.account-tabs');
const languageSelect = byId('accountLanguage');
const languageControl = byId('accountLanguageControl');
const saveButton = byId('saveProfile');
const saveState = byId('profileSaveState');
const aboutDetails = byId('accountAboutDetails');
const profileFieldSelector = '[data-profile-field]';
const referralValues = new Set([
  'youtube',
  'in_game',
  'vts_1097',
  'alliance_friend',
  'search',
  'other',
]);
let mode = 'create';
let locale = resolveAccountLocale(globalThis.localStorage);
let accountTr = createAccountTranslator(locale);
let currentAccount = null;
let profileBaseline = null;
let profileDirty = false;
let busy = false;
let saveInFlight = false;
let saveJustSucceeded = false;
let statusTimer = 0;

// Same-origin return path (?return=/admin.html): a page that sent the visitor
// here to sign in gets them back after auth. Only absolute same-origin paths
// are accepted — no protocol, no leading double slash, no backslash — so a
// hostile ?return= can never redirect off-site.
function safeAccountReturnPath() {
  const raw = new URL(globalThis.location.href).searchParams.get('return') || '';
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.includes('\\') || raw.includes(':')) {
    return '';
  }
  return raw;
}
const accountReturnPath = safeAccountReturnPath();

function returnToReferringPage() {
  if (!accountReturnPath) return false;
  globalThis.location.replace(accountReturnPath);
  return true;
}

function dismissStatus() {
  globalThis.clearTimeout(statusTimer);
  statusTimer = 0;
  statusMessage.textContent = '';
  status.hidden = true;
  delete status.dataset.kind;
}

function announce(message, kind = 'info') {
  globalThis.clearTimeout(statusTimer);
  statusMessage.textContent = message;
  status.dataset.kind = kind;
  status.hidden = !message;
  if (message) statusTimer = globalThis.setTimeout(dismissStatus, kind === 'error' ? 5000 : 3500);
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
  const passwordInput = byId('accountPassword');
  passwordInput.autocomplete = mode === 'create' ? 'new-password' : 'current-password';
  passwordInput.minLength = mode === 'create' ? 8 : 0;
  byId('authSubmit').querySelector('span').textContent = accountTr(
    mode === 'create' ? 'action.continue' : 'action.signin'
  );
  byId('googleAuth').querySelector('span').textContent = accountTr(
    mode === 'create' ? 'action.googleCreate' : 'action.googleSignin'
  );
  byId('sessionWarning').hidden = mode !== 'signin' || !onboardingForm.hidden;
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
  const referralSource = profile?.referralSource || '';
  const referralSelect = byId('profileReferralSource');
  referralSelect.querySelector('[data-legacy-referral]')?.remove();
  if (referralSource && !referralValues.has(referralSource)) {
    const legacyOption = document.createElement('option');
    legacyOption.value = referralSource;
    legacyOption.textContent = `${accountTr('referral.other')}: ${referralSource}`;
    legacyOption.dataset.legacyReferral = 'true';
    referralSelect.append(legacyOption);
  }
  referralSelect.value = referralSource;
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

function showAuthStep() {
  accountTabs.hidden = false;
  authForm.hidden = false;
  onboardingForm.hidden = true;
  byId('sessionWarning').hidden = mode !== 'signin' || !onboardingForm.hidden;
}

function showOnboardingStep(account) {
  accountTabs.hidden = true;
  authForm.hidden = true;
  byId('sessionWarning').hidden = true;
  onboardingForm.hidden = false;
  byId('accountGameName').value = account.displayName || '';
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = text;
  return node;
}

// Every field here belongs to *another* player, so none of it may reach the DOM
// as markup. Built with textContent rather than an innerHTML template — inert by
// construction, instead of relying on escaping each interpolation.
function buildPublicProfile(profile) {
  if (!profile) {
    const surface = el('article', 'account-auth-surface');
    surface.append(el('h1', '', 'Profile unavailable'));
    surface.append(el('p', '', 'This profile is private or no longer exists.'));
    const back = el('a', 'account-button', 'Back to tools');
    back.href = 'index.html';
    surface.append(back);
    return [surface];
  }

  const topbar = el('header', 'account-topbar');
  const brand = el('a', 'account-brand');
  brand.href = 'index.html';
  const brandCopy = el('span');
  brandCopy.append(el('strong', '', 'VTS 1097'), el('small', '', 'Public player profile'));
  brand.append(brandCopy);
  const back = el('a', 'account-back', 'My account');
  back.href = 'profile.html';
  topbar.append(brand, back);

  const surface = el('article', 'account-auth-surface');
  surface.append(el('p', 'account-kicker', 'Public player profile'));
  surface.append(el('h1', '', profile.gameName || 'Player'));

  const meta = [
    profile.alliance ? `Alliance: ${profile.alliance}` : '',
    profile.countryCode || '',
  ].filter(Boolean);
  if (meta.length) surface.append(el('p', '', meta.join(' · ')));

  surface.append(el('p', '', profile.bio || 'No public bio yet.'));
  return [topbar, surface];
}

async function renderPublicProfile(uid) {
  const profile = await loadPublicAccountProfile(uid);
  document.querySelector('.account-shell').replaceChildren(...buildPublicProfile(profile));
  document.body.dataset.accountReady = 'true';
}

async function render() {
  const publicUid = new URL(globalThis.location.href).searchParams.get('u');
  if (publicUid) return renderPublicProfile(publicUid);
  const account = await getAccountState();
  currentAccount = account;
  authPanel.hidden = true;
  editorPanel.hidden = true;
  if (account.isGuest) {
    showAuthStep();
    moveLanguageControl(true);
    profileBaseline = null;
    saveJustSucceeded = false;
    setDirty(false);
    authPanel.hidden = false;
    document.body.dataset.accountReady = 'true';
    return;
  }

  const profile = await loadAccountProfile();
  if (!profile) {
    showOnboardingStep(account);
    moveLanguageControl(true);
    authPanel.hidden = false;
    document.body.dataset.accountReady = 'true';
    return;
  }

  renderAccountMeta(account);
  byId('resendVerification').hidden = !account.email || account.emailVerified;
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
        ? upgradeGuestWithEmail(email, password)
        : signInExistingEmail(email, password),
    mode === 'create' ? 'status.authenticated' : 'status.signedIn',
    { refresh: true, onSuccess: returnToReferringPage }
  );
});

byId('googleAuth').addEventListener('click', () => {
  runAction(
    () =>
      mode === 'create'
        ? upgradeGuestWithGoogle({
            confirmExistingAccount: () =>
              globalThis.confirm(accountTr('confirm.googleExistingAccount')),
          })
        : signInExistingGoogle(),
    mode === 'create' ? 'status.authenticated' : 'status.signedIn',
    { refresh: true, onSuccess: returnToReferringPage }
  );
});

onboardingForm.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!onboardingForm.checkValidity()) return;
  runAction(
    () =>
      saveAccountProfile({
        ...collectOnboarding(),
        alliance: '',
        countryCode: '',
        bio: '',
        isPublic: false,
      }),
    'status.created',
    { refresh: true, onSuccess: returnToReferringPage }
  );
});

byId('accountStatusDismiss').addEventListener('click', dismissStatus);
status.addEventListener('click', dismissStatus);
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !status.hidden) dismissStatus();
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
