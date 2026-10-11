import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeOperationsConfig, isOperationPaused } from '../../js/operations-config.js';
import { createListUserRolesHandler } from '../../functions/src/user-roles.js';

test('operation settings fail open when missing and reject unknown feature names', () => {
  assert.equal(isOperationPaused(undefined, 'uploads'), false);
  assert.deepEqual(
    normalizeOperationsConfig({ disabledFeatures: ['uploads', 'evil', 'uploads'] })
      .disabledFeatures,
    ['uploads']
  );
});
test('expiry restores operation including notices, and Super Admin recovery bypasses pauses', () => {
  const config = { notice: 'Pause', readOnly: true, disabledFeatures: ['votes'], expiresAtMs: 100 };
  assert.equal(isOperationPaused(config, 'votes', { now: 99 }), true);
  assert.equal(isOperationPaused(config, 'votes', { now: 100 }), false);
  assert.equal(normalizeOperationsConfig(config, 100).notice, '');
  assert.equal(isOperationPaused(config, 'votes', { now: 99, superadmin: true }), false);
});
test('authoritative role listing uses Auth claims and only profile labels', async () => {
  const auth = {
    getUser: async () => ({ customClaims: { superadmin: true } }),
    listUsers: async (size, cursor) => {
      assert.equal(size, 50);
      assert.equal(cursor, 'cursor');
      return {
        users: [{ uid: 'u1', customClaims: { admin: true, superadmin: false } }],
        pageToken: 'next',
      };
    },
  };
  const db = {
    doc: (path) => path,
    getAll: async () => [
      { data: () => ({ accountProfile: { displayName: 'Member' }, superadmin: true }) },
    ],
  };
  const result = await createListUserRolesHandler({ auth, db })({
    auth: { uid: 'sa', token: { superadmin: true } },
    data: { pageSize: 50, pageToken: 'cursor' },
  });
  assert.deepEqual(result, {
    members: [
      { uid: 'u1', displayName: 'Member', admin: true, superadmin: false, disabled: false },
    ],
    nextPageToken: 'next',
  });
});
test('role listing rejects a revoked operator despite their old token', async () => {
  const handler = createListUserRolesHandler({
    auth: { getUser: async () => ({ customClaims: { superadmin: false } }) },
    db: {},
  });
  await assert.rejects(handler({ auth: { uid: 'sa', token: { superadmin: true } } }), {
    code: 'permission-denied',
  });
});
