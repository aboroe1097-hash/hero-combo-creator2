import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import test from 'node:test';

import { filterMembers, projectRoles, shortenUid } from '../../js/admin-roles-controller.js';

test('uids shorten to something comparable but keep the full value available', () => {
  assert.equal(shortenUid('short'), 'short');
  const long = 'PlNSCsIC5XVn6hBp6gEfwgAxNi63';
  const short = shortenUid(long);
  assert.ok(short.length < long.length);
  assert.ok(short.startsWith('PlNSCsIC'));
  assert.ok(short.endsWith('Ni63'));
  assert.equal(shortenUid(null), '');
});

test('search matches display name and uid, case-insensitively', () => {
  const members = [
    { uid: 'aaa111', displayName: 'MalakAbo' },
    { uid: 'bbb222', displayName: 'Kika' },
  ];
  assert.deepEqual(
    filterMembers(members, 'malak').map((m) => m.uid),
    ['aaa111']
  );
  assert.deepEqual(
    filterMembers(members, 'BBB').map((m) => m.uid),
    ['bbb222']
  );
  assert.equal(filterMembers(members, '').length, 2);
  assert.equal(filterMembers(members, '   ').length, 2);
  assert.equal(filterMembers(members, 'nobody').length, 0);
  assert.deepEqual(filterMembers(null, 'x'), []);
});

test('granting superadmin also shows admin, matching what the server writes', () => {
  const member = { admin: false, superadmin: false };
  assert.deepEqual(projectRoles(member, 'superadmin', true), { admin: true, superadmin: true });
});

test('revoking admin also clears superadmin', () => {
  const member = { admin: true, superadmin: true };
  assert.deepEqual(projectRoles(member, 'admin', false), { admin: false, superadmin: false });
});

test('revoking superadmin leaves admin alone', () => {
  const member = { admin: true, superadmin: true };
  assert.deepEqual(projectRoles(member, 'superadmin', false), { admin: true, superadmin: false });
});

test('projection never mutates the member it was given', () => {
  const member = { admin: true, superadmin: false };
  projectRoles(member, 'superadmin', true);
  assert.deepEqual(member, { admin: true, superadmin: false });
});

test('a member with no role flags projects cleanly', () => {
  assert.deepEqual(projectRoles({}, 'admin', true), { admin: true, superadmin: false });
  assert.deepEqual(projectRoles(undefined, 'admin', false), { admin: false, superadmin: false });
});

test('every Firebase SDK surface loads from the bundled package, never a CDN', () => {
  // "Service functions is not available" on every role grant came from
  // callSetUserRole importing firebase-functions from the gstatic CDN while
  // `app` was built by the bundled SDK. A CDN module is a separate instance of
  // @firebase/app: it registers its components into its own container, so
  // getFunctions(app) looks in the bundled container and finds nothing. Version
  // pinning cannot fix that — only loading from the same instance can.
  const sdk = readFileSync('js/firebase-sdk.js', 'utf8');
  assert.match(
    sdk,
    /export function importFirebaseFunctions\(\) \{\s*return import\('firebase\/functions'\);/
  );

  const firebase = readFileSync('js/firebase.js', 'utf8');
  assert.match(
    firebase,
    /const \{ getFunctions, httpsCallable \} = await importFirebaseFunctions\(\);/
  );

  // No module may reach for a Firebase SDK over the network. firebase-sdk.js is
  // the single door, and Vite turns each import behind it into a same-origin,
  // content-hashed chunk the service worker already covers.
  for (const file of readdirSync('js').filter((name) => name.endsWith('.js'))) {
    assert.doesNotMatch(
      readFileSync(`js/${file}`, 'utf8'),
      /gstatic\.com\/firebasejs/,
      `${file} loads a Firebase SDK from the CDN`
    );
  }
});
