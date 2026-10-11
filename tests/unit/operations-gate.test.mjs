import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertOperationAvailable,
  withOperationGate,
} from '../../functions/src/operations-gate.js';

const dbFor = (config) => ({ doc: () => ({ get: async () => ({ data: () => config }) }) });
test('server pause blocks Admin SDK writes, honors expiry and recovery leadership', async () => {
  await assert.rejects(
    assertOperationAvailable({ db: dbFor({ readOnly: true }), feature: 'competition' }),
    /paused/
  );
  await assert.rejects(
    assertOperationAvailable({
      db: dbFor({ disabledFeatures: ['comments'] }),
      feature: 'comments',
    }),
    /paused/
  );
  await assertOperationAvailable({
    db: dbFor({ disabledFeatures: ['comments'] }),
    feature: 'competition',
  });
  await assertOperationAvailable({ db: dbFor({ readOnly: true, expiresAtMs: 10 }), now: 20 });
  await assertOperationAvailable({ db: dbFor({ readOnly: true }), claims: { superadmin: true } });
});

test('HTTP operation gate keeps reads available and refuses paused writes before handler', async () => {
  let handled = 0;
  const handler = withOperationGate(
    () => {
      handled += 1;
    },
    {
      db: dbFor({ readOnly: true }),
      auth: { verifyIdToken: async () => ({ uid: 'admin', admin: true }) },
      feature: 'competition',
    }
  );
  const response = {
    set() {},
    status(code) {
      this.code = code;
      return this;
    },
    json(data) {
      this.body = data;
    },
  };
  await handler({ method: 'GET' }, response);
  assert.equal(handled, 1);
  await handler({ method: 'POST', headers: { authorization: 'Bearer token' } }, response);
  assert.equal(handled, 1);
  assert.equal(response.code, 503);
  assert.equal(response.body.error, 'operation_paused');
});
