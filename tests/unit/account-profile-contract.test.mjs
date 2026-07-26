import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { normalizeAccountProfile } from '../../js/account-profile-model.js';

const read = (path) => readFileSync(path, 'utf8');
const serviceSource = read('js/account-profile-service.js');
const rulesSource = read('firestore.rules');
const viteSource = read('vite.config.js');

function section(source, start, end) {
  const from = source.indexOf(start);
  assert.notEqual(from, -1, `Missing section start: ${start}`);
  const to = source.indexOf(end, from + start.length);
  assert.notEqual(to, -1, `Missing section end: ${end}`);
  return source.slice(from, to);
}

test('account profiles normalize bounded public fields', () => {
  assert.deepEqual(
    normalizeAccountProfile({
      displayName: '  Velo  ',
      gameName: ' MalakAbo ',
      alliance: ' VTS ',
      countryCode: 'eg',
      bio: ' Player profile ',
      isPublic: true,
    }),
    {
      displayName: 'Velo',
      gameName: 'MalakAbo',
      alliance: 'VTS',
      countryCode: 'EG',
      bio: 'Player profile',
      isPublic: true,
    }
  );

  assert.throws(() => normalizeAccountProfile({ displayName: '' }), /Display name/);
  assert.throws(() => normalizeAccountProfile({ displayName: 'x'.repeat(51) }), /Display name/);
  assert.throws(
    () => normalizeAccountProfile({ displayName: 'Velo', countryCode: 'Egypt' }),
    /Country code/
  );
  assert.throws(
    () => normalizeAccountProfile({ displayName: 'Velo', bio: 'x'.repeat(281) }),
    /Bio/
  );
});

test('registration links the anonymous UID while returning sign-in is explicit', () => {
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

  assert.match(emailUpgrade, /EmailAuthProvider\.credential/);
  assert.match(emailUpgrade, /linkWithCredential\(guest, credential\)/);
  assert.match(googleUpgrade, /linkWithPopup\(guest, new GoogleAuthProvider\(\)\)/);
  assert.match(existingEmail, /signInWithEmailAndPassword/);
  assert.match(existingGoogle, /signInWithPopup\(auth, new GoogleAuthProvider\(\)\)/);
  assert.match(serviceSource, /signOut\(auth\)[\s\S]*ensureAnonymousAuth\(\)/);
  assert.match(serviceSource, /writeBatch\(getDb\(\)\)/);
  assert.match(serviceSource, /batch\.delete\(publicRef\)/);
  assert.match(serviceSource, /await batch\.commit\(\)/);
});

test('Firestore keeps private profiles owner-only and publishes only allowlisted fields', () => {
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
  const userRules = section(rulesSource, 'match /users/{uid}', 'match /public_profiles/{uid}');
  const publicRules = section(
    rulesSource,
    'match /public_profiles/{uid}',
    'match /errors/{errorId}'
  );

  for (const field of [
    'displayName',
    'gameName',
    'alliance',
    'countryCode',
    'bio',
    'isPublic',
    'createdAt',
    'updatedAt',
  ]) {
    assert.match(accountValidator, new RegExp(`['"]${field}['"]`));
  }
  for (const forbidden of ['email', 'admin', 'role', 'claims', 'provider']) {
    assert.doesNotMatch(accountValidator, new RegExp(`['"]${forbidden}['"]`, 'i'));
    assert.doesNotMatch(publicValidator, new RegExp(`['"]${forbidden}['"]`, 'i'));
  }

  assert.match(accountValidator, /displayName\.size\(\) <= 50/);
  assert.match(accountValidator, /bio\.size\(\) <= 280/);
  assert.match(accountValidator, /\^\(\[A-Z\]\{2\}\)\?\$/);
  assert.match(userRules, /allow read: if isOwner\(uid\)/);
  assert.match(userRules, /match \/bestCombos\/\{comboId\}/);
  assert.match(publicRules, /allow read: if signedIn\(\)/);
  assert.match(publicRules, /allow create, update: if isOwner\(uid\)/);
  assert.match(publicRules, /allow delete: if isOwner\(uid\)/);
});

test('profile page is a build entry linked from public Firebase shells only', () => {
  assert.match(viteSource, /profile:\s*resolve\(__dirname,\s*'profile\.html'\)/);

  for (const path of ['index.html', 'arcade.html', 'eden-x1.html']) {
    const html = read(path);
    assert.match(html, /href="profile\.html"/, `${path} should link the account page`);
    assert.doesNotMatch(
      html,
      /css\/account-profile\.css/,
      `${path} should not load profile-only styles`
    );
    assert.match(html, /css\/app\.css/, `${path} should load the shared account-link styles`);
  }
  for (const path of ['admin.html', 'battle-simulator.html', 'specialization-towers.html']) {
    assert.doesNotMatch(read(path), /href="profile\.html"/);
  }

  const profileHtml = read('profile.html');
  assert.match(profileHtml, /css\/account-profile\.css/);
  assert.match(profileHtml, /id="accountAuthForm"/);
  assert.match(profileHtml, /id="accountProfileForm"/);
  assert.match(profileHtml, /id="profileIsPublic"/);
  assert.match(profileHtml, /minlength="8"/);
  assert.match(profileHtml, /meta name="vts-app-version" content="14\.2\.11"/);
  assert.match(profileHtml, /Content-Security-Policy/);
});
