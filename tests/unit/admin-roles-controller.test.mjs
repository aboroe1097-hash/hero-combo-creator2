import assert from 'node:assert/strict';
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
