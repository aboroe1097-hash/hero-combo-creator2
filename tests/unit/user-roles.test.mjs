import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ASSIGNABLE_ROLES,
  ROLE_AUDIT_COLLECTION,
  createSetUserRoleHandler,
  nextClaimsFor,
} from '../../functions/src/user-roles.js';

function stubDeps({ existingClaims = {}, userExists = true } = {}) {
  const calls = { setClaims: [], audit: [] };
  const auth = {
    async getUser(uid) {
      if (!userExists) throw new Error('no such user');
      return { uid, customClaims: existingClaims };
    },
    async setCustomUserClaims(uid, claims) {
      calls.setClaims.push({ uid, claims });
    },
  };
  const db = {
    collection(path) {
      return {
        async add(record) {
          calls.audit.push({ path, record });
        },
      };
    },
  };
  return { auth, db, calls, now: () => 1_700_000_000_000 };
}

const superadminCaller = { uid: 'caller-1', token: { admin: true, superadmin: true } };

async function expectCode(promise, code) {
  await assert.rejects(promise, (error) => {
    assert.equal(error.name, 'RoleError');
    assert.equal(error.code, code);
    return true;
  });
}

test('only the two levels are assignable', () => {
  assert.deepEqual([...ASSIGNABLE_ROLES], ['admin', 'superadmin']);
});

test('granting superadmin also grants admin', () => {
  assert.deepEqual(nextClaimsFor({}, 'superadmin', true), { superadmin: true, admin: true });
});

test('revoking admin also clears superadmin', () => {
  // Otherwise the account keeps a claim the tightened collections still honour
  // while the UI refuses to let it in.
  assert.deepEqual(nextClaimsFor({ admin: true, superadmin: true }, 'admin', false), {
    admin: false,
    superadmin: false,
  });
});

test('revoking superadmin leaves admin intact', () => {
  assert.deepEqual(nextClaimsFor({ admin: true, superadmin: true }, 'superadmin', false), {
    admin: true,
    superadmin: false,
  });
});

test('unrelated existing claims survive a role change', () => {
  const next = nextClaimsFor({ admin: true, someOtherClaim: 'keep-me' }, 'superadmin', true);
  assert.equal(next.someOtherClaim, 'keep-me');
});

test('a caller without the superadmin claim is refused', async () => {
  const deps = stubDeps();
  const handler = createSetUserRoleHandler(deps);
  await expectCode(
    handler({
      auth: { uid: 'caller-1', token: { admin: true } },
      data: { targetUid: 'target-1', role: 'admin', granted: true },
    }),
    'permission-denied'
  );
  assert.equal(deps.calls.setClaims.length, 0, 'no claim is written on refusal');
});

test('an unauthenticated caller is refused', async () => {
  const deps = stubDeps();
  const handler = createSetUserRoleHandler(deps);
  await expectCode(
    handler({ data: { targetUid: 'target-1', role: 'admin', granted: true } }),
    'permission-denied'
  );
});

test('a role claimed in the payload grants nothing', async () => {
  // The payload is data, never authority: a caller asserting their own role
  // must still be refused.
  const deps = stubDeps();
  const handler = createSetUserRoleHandler(deps);
  await expectCode(
    handler({
      auth: { uid: 'caller-1', token: {} },
      data: { targetUid: 't', role: 'superadmin', granted: true, superadmin: true },
    }),
    'permission-denied'
  );
});

test('malformed arguments are rejected before any write', async () => {
  const deps = stubDeps();
  const handler = createSetUserRoleHandler(deps);
  const bad = [
    { targetUid: '', role: 'admin', granted: true },
    { targetUid: '   ', role: 'admin', granted: true },
    { targetUid: 'x'.repeat(129), role: 'admin', granted: true },
    { targetUid: 't', role: 'owner', granted: true },
    { targetUid: 't', role: 'admin', granted: 'yes' },
  ];
  for (const data of bad) {
    await expectCode(handler({ auth: superadminCaller, data }), 'invalid-argument');
  }
  assert.equal(deps.calls.setClaims.length, 0);
});

test('a superadmin cannot remove their own superadmin access', async () => {
  const deps = stubDeps();
  const handler = createSetUserRoleHandler(deps);
  await expectCode(
    handler({
      auth: superadminCaller,
      data: { targetUid: 'caller-1', role: 'superadmin', granted: false },
    }),
    'failed-precondition'
  );
  assert.equal(deps.calls.setClaims.length, 0);
});

test('a superadmin may still change their own admin claim and others freely', async () => {
  const deps = stubDeps({ existingClaims: { admin: true, superadmin: true } });
  const handler = createSetUserRoleHandler(deps);
  const result = await handler({
    auth: superadminCaller,
    data: { targetUid: 'someone-else', role: 'superadmin', granted: false },
  });
  assert.equal(result.ok, true);
  assert.deepEqual(result.claims, { admin: true, superadmin: false });
});

test('an unknown account fails opaquely without revealing existence', async () => {
  const deps = stubDeps({ userExists: false });
  const handler = createSetUserRoleHandler(deps);
  await expectCode(
    handler({ auth: superadminCaller, data: { targetUid: 'ghost', role: 'admin', granted: true } }),
    'not-found'
  );
  assert.equal(deps.calls.setClaims.length, 0);
});

test('a successful grant writes the claim and one audit record', async () => {
  const deps = stubDeps({ existingClaims: {} });
  const handler = createSetUserRoleHandler(deps);
  const result = await handler({
    auth: superadminCaller,
    data: { targetUid: 'target-1', role: 'superadmin', granted: true },
  });

  assert.deepEqual(result, { ok: true, claims: { superadmin: true, admin: true } });
  assert.deepEqual(deps.calls.setClaims, [
    { uid: 'target-1', claims: { superadmin: true, admin: true } },
  ]);
  assert.equal(deps.calls.audit.length, 1);
  assert.equal(deps.calls.audit[0].path, ROLE_AUDIT_COLLECTION);
  assert.deepEqual(deps.calls.audit[0].record, {
    targetUid: 'target-1',
    role: 'superadmin',
    granted: true,
    changedBy: 'caller-1',
    changedAtMs: 1_700_000_000_000,
  });
});

test('the audit record carries only the five allowlisted fields', async () => {
  // The rules allowlist rejects anything else, so an extra field here would
  // fail the write in production while passing locally.
  const deps = stubDeps();
  const handler = createSetUserRoleHandler(deps);
  await handler({
    auth: superadminCaller,
    data: { targetUid: 'target-1', role: 'admin', granted: false },
  });
  assert.deepEqual(Object.keys(deps.calls.audit[0].record).sort(), [
    'changedAtMs',
    'changedBy',
    'granted',
    'role',
    'targetUid',
  ]);
});
