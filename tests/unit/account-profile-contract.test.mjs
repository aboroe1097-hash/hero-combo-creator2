import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  ACCOUNT_PROFILE_LIMITS,
  confirmExistingGoogleAccountSwitch,
  normalizeAccountProfile,
  planExistingGoogleAccountRecovery,
} from '../../js/account-profile-model.js';

const read = (path) => readFileSync(path, 'utf8');
const serviceSource = read('js/account-profile-service.js');
const pageSource = read('js/account-profile-page.js');
const rulesSource = read('firestore.rules');
const viteSource = read('vite.config.js');

function section(source, start, end) {
  const from = source.indexOf(start);
  assert.notEqual(from, -1, `Missing section start: ${start}`);
  const to = source.indexOf(end, from + start.length);
  assert.notEqual(to, -1, `Missing section end: ${end}`);
  return source.slice(from, to);
}

const requiredPrivate = (overrides = {}) => ({
  gameName: 'Velo',
  state: '1097',
  referralSource: 'Alliance friend',
  comments: '',
  ...overrides,
});

test('account profiles normalize canonical names and bounded private onboarding fields', () => {
  assert.deepEqual(ACCOUNT_PROFILE_LIMITS, {
    displayName: 50,
    gameName: 50,
    alliance: 50,
    bio: 280,
    state: 160,
    referralSource: 160,
    comments: 1000,
  });

  assert.deepEqual(
    normalizeAccountProfile({
      displayName: '  Legacy ignored  ',
      gameName: ' MalakAbo ',
      alliance: ' VTS ',
      countryCode: 'eg',
      bio: ' Player profile ',
      state: ' State 1097 ',
      referralSource: ' Discord ',
      comments: ' Looking forward to it. ',
      isPublic: true,
    }),
    {
      displayName: 'MalakAbo',
      gameName: 'MalakAbo',
      alliance: 'VTS',
      countryCode: 'EG',
      bio: 'Player profile',
      state: 'State 1097',
      referralSource: 'Discord',
      comments: 'Looking forward to it.',
      isPublic: true,
    }
  );

  assert.deepEqual(
    normalizeAccountProfile({
      displayName: ' Legacy Name ',
      state: '1097',
      referralSource: 'Friend',
    }),
    {
      displayName: 'Legacy Name',
      gameName: 'Legacy Name',
      alliance: '',
      countryCode: '',
      bio: '',
      state: '1097',
      referralSource: 'Friend',
      comments: '',
      isPublic: false,
    }
  );

  assert.throws(
    () => normalizeAccountProfile(requiredPrivate({ gameName: '' })),
    (error) => error.code === 'account/invalid-game-name'
  );
  assert.throws(
    () => normalizeAccountProfile(requiredPrivate({ state: '' })),
    (error) => error.code === 'account/invalid-state'
  );
  assert.throws(
    () => normalizeAccountProfile(requiredPrivate({ referralSource: 'x'.repeat(161) })),
    (error) => error.code === 'account/invalid-referral-source'
  );
  assert.throws(
    () => normalizeAccountProfile(requiredPrivate({ comments: 'x'.repeat(1001) })),
    (error) => error.code === 'account/comments-too-long'
  );
  assert.equal(
    normalizeAccountProfile(requiredPrivate({ state: 'x'.repeat(160) })).state.length,
    160
  );
  assert.equal(
    normalizeAccountProfile(requiredPrivate({ referralSource: 'x'.repeat(160) })).referralSource
      .length,
    160
  );
  assert.equal(
    normalizeAccountProfile(requiredPrivate({ comments: 'x'.repeat(1000) })).comments.length,
    1000
  );
});

test('Google conflict recovery requires explicit confirmation before leaving the guest UID', async () => {
  const emailUpgrade = section(
    serviceSource,
    'export async function upgradeGuestWithEmail',
    'export async function signInExistingEmail'
  );
  const googleUpgrade = section(
    serviceSource,
    'export async function upgradeGuestWithGoogle',
    'export async function signInExistingGoogle'
  );
  const existingEmail = section(
    serviceSource,
    'export async function signInExistingEmail',
    'export async function upgradeGuestWithGoogle'
  );
  const existingGoogle = section(
    serviceSource,
    'export async function signInExistingGoogle',
    'export async function sendAccountPasswordReset'
  );

  assert.ok(
    emailUpgrade.indexOf('normalizeInitialProfile') < emailUpgrade.indexOf('linkWithCredential')
  );
  assert.match(emailUpgrade, /EmailAuthProvider\.credential/);
  assert.match(emailUpgrade, /linkWithCredential\(guest, credential\)/);
  assert.ok(
    googleUpgrade.indexOf('normalizeInitialProfile') < googleUpgrade.indexOf('linkWithPopup')
  );
  assert.match(googleUpgrade, /linkWithPopup\(guest, provider\)/);
  assert.match(googleUpgrade, /auth\/credential-already-in-use/);
  assert.match(googleUpgrade, /GoogleAuthProvider\.credentialFromError\?\.\(error\)/);
  assert.match(googleUpgrade, /error\?\.credential/);
  assert.match(googleUpgrade, /signInWithCredential\(auth, credential\)/);
  assert.match(googleUpgrade, /signedInExisting: true/);
  assert.match(googleUpgrade, /account\/google-credential-unavailable/);
  assert.ok(
    googleUpgrade.indexOf('confirmExistingGoogleAccountSwitch') <
      googleUpgrade.indexOf('result = await signInWithCredential'),
    'confirmation must happen before the anonymous UID is replaced'
  );
  assert.match(
    googleUpgrade,
    /if \(!confirmed\) return \{ user: guest, canceled: true, signedInExisting: false \}/
  );
  assert.equal(await confirmExistingGoogleAccountSwitch(), false);
  assert.equal(await confirmExistingGoogleAccountSwitch(() => false), false);
  assert.equal(await confirmExistingGoogleAccountSwitch(() => true), true);
  assert.match(existingEmail, /signInWithEmailAndPassword/);
  assert.match(existingGoogle, /signInWithPopup\(auth, new GoogleAuthProvider\(\)\)/);
  assert.match(pageSource, /confirmExistingAccount:\s*\(\) =>/);
  assert.match(pageSource, /globalThis\.confirm\(accountTr\('confirm\.googleExistingAccount'\)\)/);
  assert.match(pageSource, /result\?\.canceled/);
  assert.match(pageSource, /status\.googleSwitchCanceled/);
  assert.match(pageSource, /result\?\.signedInExisting \? 'status\.signedIn' : successKey/);
});

test('existing Google account recovery fills only missing required private fields', () => {
  const completePrivate = {
    displayName: 'Existing Display',
    gameName: 'Existing Game',
    alliance: 'VTS',
    countryCode: 'EG',
    bio: 'Existing bio',
    state: '1097',
    referralSource: 'Existing source',
    comments: 'Existing comments',
    isPublic: true,
    createdAt: 'created',
    updatedAt: 'updated',
  };
  const onboarding = {
    gameName: 'Signup Name',
    state: 'Signup state',
    referralSource: 'Signup source',
    comments: 'Signup comments',
  };

  assert.deepEqual(
    planExistingGoogleAccountRecovery(completePrivate, { gameName: 'Public Name' }, onboarding),
    { kind: 'none' },
    'a complete existing profile must not be rewritten'
  );

  const missingRequired = {
    ...completePrivate,
    gameName: '',
    state: '',
    referralSource: undefined,
  };
  assert.deepEqual(
    planExistingGoogleAccountRecovery(missingRequired, { gameName: 'Public Name' }, onboarding),
    {
      kind: 'update',
      patch: {
        gameName: 'Existing Display',
        state: 'Signup state',
        referralSource: 'Signup source',
      },
    }
  );

  const fromPublic = planExistingGoogleAccountRecovery(
    null,
    {
      displayName: 'Public Display',
      gameName: 'Public Game',
      alliance: 'PUBLIC',
      countryCode: 'US',
      bio: 'Public bio',
    },
    onboarding
  );
  assert.deepEqual(fromPublic, {
    kind: 'create',
    profile: {
      displayName: 'Public Game',
      gameName: 'Public Game',
      alliance: 'PUBLIC',
      countryCode: 'US',
      bio: 'Public bio',
      state: 'Signup state',
      referralSource: 'Signup source',
      comments: '',
      isPublic: true,
    },
  });

  const recoveryWriter = section(
    serviceSource,
    'async function fillMissingExistingAccountProfile',
    'export async function getAccountState'
  );
  assert.match(recoveryWriter, /batch\.update\(privateRef, updates\)/);
  assert.match(recoveryWriter, /batch\.set\(\s*privateRef/);
  assert.doesNotMatch(recoveryWriter, /batch\.(?:set|update|delete)\(publicRef/);
  assert.doesNotMatch(recoveryWriter, /saveAccountProfile/);
  assert.doesNotMatch(recoveryWriter, /updateProfile/);
});

test('private onboarding never reaches the public profile payload', () => {
  const saveProfile = section(serviceSource, 'export async function saveAccountProfile', '\n}');
  const publicWrite = section(saveProfile, 'batch.set(publicRef', '} else {');
  for (const field of ['displayName', 'gameName', 'alliance', 'countryCode', 'bio', 'updatedAt']) {
    assert.match(publicWrite, new RegExp(`\\b${field}(?::|,)`));
  }
  for (const forbidden of [
    'state',
    'referralSource',
    'comments',
    'email',
    'isPublic',
    'createdAt',
  ]) {
    assert.doesNotMatch(publicWrite, new RegExp(`\\b${forbidden}\\b`));
  }
  assert.doesNotMatch(publicWrite, /\.\.\./);
  assert.match(serviceSource, /batch\.delete\(publicRef\)/);
  assert.match(serviceSource, /stored\.gameName \|\| stored\.displayName \|\| user\.displayName/);
  assert.match(serviceSource, /state: cleanText\(stored\.state\)/);
});

test('Firestore requires new onboarding and permits legacy invalid values only while unchanged', () => {
  const accountValidator = section(
    rulesSource,
    'function validAccountProfile',
    'function validUserProfile'
  );
  const publicValidator = section(
    rulesSource,
    'function validPublicProfile',
    'function validBestCombo'
  );
  const privateHasAll = section(accountValidator, 'data.keys().hasAll([', '])');
  const newAccountValidator = section(
    rulesSource,
    'function validNewAccountProfile',
    'function validAccountNameTransition'
  );
  const nameTransition = section(
    rulesSource,
    'function validAccountNameTransition',
    'function validAccountStateTransition'
  );
  const stateTransition = section(
    rulesSource,
    'function validAccountStateTransition',
    'function validAccountReferralTransition'
  );
  const referralTransition = section(
    rulesSource,
    'function validAccountReferralTransition',
    'function validAccountProfileUpdate'
  );
  const userCreate = section(
    rulesSource,
    'function validUserProfileCreate',
    'function validUserProfileUpdate'
  );
  const userUpdate = section(
    rulesSource,
    'function validUserProfileUpdate',
    'function validPublicProfile'
  );
  const userRules = section(rulesSource, 'match /users/{uid}', 'match /public_profiles/{uid}');
  const publicRules = section(
    rulesSource,
    'match /public_profiles/{uid}',
    'match /errors/{errorId}'
  );

  for (const field of ['state', 'referralSource', 'comments']) {
    assert.match(accountValidator, new RegExp(`['"]${field}['"]`));
    assert.doesNotMatch(privateHasAll, new RegExp(`['"]${field}['"]`));
    assert.doesNotMatch(publicValidator, new RegExp(`['"]${field}['"]`));
  }
  assert.match(accountValidator, /data\.state\.size\(\) <= 160/);
  assert.match(accountValidator, /data\.referralSource\.size\(\) <= 160/);
  assert.match(
    accountValidator,
    /!\('comments' in data\)[\s\S]*data\.comments is string[\s\S]*data\.comments\.size\(\) <= 1000/
  );
  assert.match(newAccountValidator, /validCanonicalAccountName\(data\)/);
  assert.match(newAccountValidator, /validRequiredAccountState\(data\)/);
  assert.match(newAccountValidator, /validRequiredAccountReferral\(data\)/);
  assert.match(nameTransition, /!validCanonicalAccountName\(before\)/);
  assert.match(nameTransition, /after\.displayName == before\.displayName/);
  assert.match(nameTransition, /after\.gameName == before\.gameName/);
  assert.match(stateTransition, /!validRequiredAccountState\(before\)/);
  assert.match(stateTransition, /after\.state == before\.state/);
  assert.match(referralTransition, /!validRequiredAccountReferral\(before\)/);
  assert.match(referralTransition, /after\.referralSource == before\.referralSource/);
  assert.match(userCreate, /validNewAccountProfile\(request\.resource\.data\.accountProfile\)/);
  assert.match(userUpdate, /validAccountProfileUpdate\(/);
  assert.match(userUpdate, /validNewAccountProfile\(request\.resource\.data\.accountProfile\)/);
  assert.match(
    publicValidator,
    /hasOnly\(\[\s*'displayName', 'gameName', 'alliance', 'countryCode', 'bio', 'updatedAt'\s*\]\)/
  );
  for (const forbidden of ['email', 'admin', 'role', 'claims', 'provider']) {
    assert.doesNotMatch(accountValidator, new RegExp(`['"]${forbidden}['"]`, 'i'));
    assert.doesNotMatch(publicValidator, new RegExp(`['"]${forbidden}['"]`, 'i'));
  }
  assert.match(userRules, /allow read: if isOwner\(uid\)/);
  assert.match(userRules, /allow create: if isOwner\(uid\) && validUserProfileCreate\(\)/);
  assert.match(userRules, /allow update: if isOwner\(uid\) && validUserProfileUpdate\(\)/);
  assert.match(publicRules, /allow read: if signedIn\(\)/);
  assert.match(publicRules, /allow create, update: if isOwner\(uid\)/);
});

test('profile page has one name concept and required onboarding controls for both create methods', () => {
  assert.match(viteSource, /profile:\s*resolve\(__dirname,\s*'profile\.html'\)/);
  const profileHtml = read('profile.html');
  assert.match(profileHtml, /id="accountOnboardingFields"/);
  assert.match(profileHtml, /id="accountGameName"[\s\S]*?required[\s\S]*?maxlength="50"/);
  assert.match(profileHtml, /id="profileGameName"[^>]*required[^>]*maxlength="50"/);
  assert.doesNotMatch(profileHtml, /id="(?:account|profile)DisplayName"|>Display name</i);
  for (const [prefix, required] of [
    ['account', true],
    ['profile', true],
  ]) {
    const state = new RegExp(`id="${prefix}State"[^>]*required[^>]*maxlength="160"`);
    const referral = new RegExp(`id="${prefix}ReferralSource"[^>]*required[^>]*maxlength="160"`);
    const comments = new RegExp(`id="${prefix}Comments"[^>]*maxlength="1000"`);
    assert.match(profileHtml, state);
    assert.match(profileHtml, referral);
    assert.match(profileHtml, comments);
    assert.equal(required, true);
  }
  assert.match(pageSource, /onboardingFields\.hidden = mode !== 'create'/);
  assert.match(pageSource, /onboardingFields\.disabled = mode !== 'create'/);
  assert.match(pageSource, /upgradeGuestWithEmail\(email, password, collectOnboarding\(\)\)/);
  assert.match(pageSource, /upgradeGuestWithGoogle\(collectOnboarding\(\), \{/);
  assert.match(pageSource, /reportOnboardingValidity\(\)/);
  assert.doesNotMatch(profileHtml, /Optional cloud account/);
  assert.match(profileHtml, /meta name="vts-app-version" content="\d+\.\d+\.\d+"/);
});

test('profile settings use real anchor sections and preserve every profile field contract', () => {
  const profileHtml = read('profile.html');
  const settingsNav = section(profileHtml, '<nav', '</nav>');
  const profileSection = section(profileHtml, 'id="profileSection"', 'id="privacySection"');
  const details = section(profileSection, '<details id="accountAboutDetails"', '</details>');

  for (const target of ['profileSection', 'privacySection', 'accountSection']) {
    assert.match(settingsNav, new RegExp(`href="#${target}"`));
  }
  assert.doesNotMatch(settingsNav, /role="tab"|role="tablist"/);
  assert.match(profileHtml, /id="accountAuthPanel"[^>]*hidden/);
  assert.match(profileHtml, /id="accountEditorPanel"[^>]*hidden/);
  assert.match(profileHtml, /id="profileBioCount"[^>]*>0 \/ 280</);
  assert.match(profileHtml, /id="profileCommentsCount"[^>]*>0 \/ 1,000</);
  assert.match(profileHtml, /id="profileSaveState"[^>]*data-i18n="save\.clean"/);
  assert.match(
    details,
    /id="profileReferralSource"[^>]*name="referralSource"[^>]*required[^>]*maxlength="160"/
  );
  assert.match(details, /id="profileComments"[^>]*name="comments"[^>]*maxlength="1000"/);

  for (const [id, name] of [
    ['profileGameName', 'gameName'],
    ['profileState', 'state'],
    ['profileAlliance', 'alliance'],
    ['profileCountryCode', 'countryCode'],
    ['profileBio', 'bio'],
    ['profileIsPublic', 'isPublic'],
  ]) {
    assert.match(profileHtml, new RegExp(`id="${id}"[^>]*name="${name}"[^>]*data-profile-field`));
  }
  assert.match(profileHtml, /id="accountEmailInput"[^>]*dir="ltr"[^>]*spellcheck="false"/);
  assert.match(
    profileHtml,
    /id="profileCountryCode"[^>]*dir="ltr"[^>]*autocapitalize="characters"[^>]*spellcheck="false"/
  );
});

test('profile dirty state is success-bound and protects navigation without affecting settings anchors', () => {
  const runActionSource = section(
    pageSource,
    'async function runAction',
    'document.querySelectorAll(\'.account-tabs [role="tab"]\')'
  );
  const busySource = section(pageSource, 'function setBusy', 'function moveLanguageControl');

  assert.match(pageSource, /let profileBaseline = null/);
  assert.match(
    pageSource,
    /const profile = await loadAccountProfile\(\);[\s\S]*setProfileBaseline\(\)/
  );
  assert.match(pageSource, /onSuccess: \(\) => setProfileBaseline\(true\)/);
  assert.match(runActionSource, /const result = await action\(\)/);
  assert.match(runActionSource, /onSuccess\?\.\(result\)/);
  assert.match(runActionSource, /catch \(error\)[\s\S]*return false/);
  assert.doesNotMatch(runActionSource, /catch \(error\)[\s\S]*setProfileBaseline/);
  assert.match(pageSource, /addEventListener\('beforeunload',[\s\S]*if \(!profileDirty\) return/);
  assert.match(
    pageSource,
    /profileDirty && !globalThis\.confirm\(accountTr\('confirm\.dirtySignout'\)\)/
  );
  assert.match(pageSource, /event\.target\.matches\(profileFieldSelector\)/);
  assert.match(pageSource, /passwordInput\.minLength = mode === 'create' \? 8 : 0/);
  assert.match(
    pageSource,
    /saveInFlight[\s\S]*'save\.saving'[\s\S]*'save\.unsaved'[\s\S]*'save\.clean'/
  );
  const renderStart = pageSource.indexOf('async function render');
  const profileLoad = pageSource.indexOf('const profile = await loadAccountProfile()', renderStart);
  const baseline = pageSource.indexOf('setProfileBaseline();', profileLoad);
  const editorReveal = pageSource.indexOf('editorPanel.hidden = false', profileLoad);
  assert.ok(profileLoad < baseline && baseline < editorReveal);
  assert.doesNotMatch(busySource, /querySelectorAll\([^)]*\ba\b/);
});

test('hidden required onboarding details are revealed and account page registers for offline caching', () => {
  const metadataSource = read('scripts/update-build-metadata.mjs');
  const entryFiles = section(metadataSource, 'const entryHtmlFiles = [', '];');
  const shellFiles = section(metadataSource, 'const baseAppShellFiles = [', '];');

  assert.match(pageSource, /profileForm\.addEventListener\('invalid', revealFirstInvalid, true\)/);
  assert.match(pageSource, /if \(aboutDetails\.contains\(invalid\)\) aboutDetails\.open = true/);
  assert.match(pageSource, /invalid\.focus\(\)/);
  assert.match(pageSource, /invalid\.reportValidity\(\)/);
  assert.equal([...pageSource.matchAll(/\bregisterServiceWorker\(\)/g)].length, 1);
  assert.match(pageSource, /import \{ registerServiceWorker \} from '\.\/pwa-register\.js'/);
  assert.match(entryFiles, /'profile\.html'/);
  assert.match(shellFiles, /'\/profile\.html'/);
});

test('account profile CSS includes responsive, safe-area, focus, and RTL safeguards', () => {
  const css = read('css/account-profile.css');
  assert.match(css, /min-height:\s*100dvh/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
  assert.match(css, /\.account-save-bar\s*\{[\s\S]*position:\s*sticky/);
  assert.match(css, /\.account-settings-section\s*\{[\s\S]*scroll-margin-top/);
  assert.match(css, /font:\s*500 16px/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /@media \(max-width: 390px\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /html\[dir='rtl'\]/);
});
