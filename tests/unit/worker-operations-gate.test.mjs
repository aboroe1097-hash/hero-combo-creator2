import assert from 'node:assert/strict';
import test from 'node:test';
import { workerOperationPaused } from '../../workers/operations-gate.js';

test('paid upstream gates honor pauses, expiry, recovery, and unavailable settings', async () => {
  const env = { FIREBASE_PROJECT_ID: 'abocombo' };
  const check = (fields, options = {}) =>
    workerOperationPaused(env, ['uploads'], {
      fetcher: async () => Response.json({ fields }),
      ...options,
    });
  assert.equal(await check({}), false);
  assert.equal(await check({ readOnly: { booleanValue: true } }), true);
  assert.equal(
    await check({ disabledFeatures: { arrayValue: { values: [{ stringValue: 'uploads' }] } } }),
    true
  );
  assert.equal(
    await check(
      { readOnly: { booleanValue: true }, expiresAtMs: { integerValue: '10' } },
      { now: 20 }
    ),
    false
  );
  assert.equal(
    await check({ readOnly: { booleanValue: true } }, { claims: { superadmin: true } }),
    false
  );
  assert.equal(
    await workerOperationPaused(env, ['ai'], {
      fetcher: async () => new Response('', { status: 404 }),
    }),
    false
  );
  assert.equal(
    await workerOperationPaused(env, ['ai'], {
      fetcher: async () => new Response('', { status: 403 }),
    }),
    true
  );
  assert.equal(
    await workerOperationPaused(env, ['ai'], {
      fetcher: async () => {
        throw new Error('offline');
      },
    }),
    true
  );
});

test('gate fetch sends no user secrets and requests bounded status-aware cache TTL', async () => {
  await workerOperationPaused({ FIREBASE_PROJECT_ID: 'abocombo' }, ['ai'], {
    fetcher: async (url, init) => {
      assert.match(url, /projects\/abocombo\/.*operations_config$/);
      assert.equal(init.headers, undefined);
      assert.equal(init.cf.cacheTtlByStatus['200-299'], 30);
      assert.equal(init.cf.cacheTtlByStatus['500-599'], 0);
      return Response.json({ fields: {} });
    },
  });
});
