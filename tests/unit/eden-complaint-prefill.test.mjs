import assert from 'node:assert/strict';
import test from 'node:test';

import { EDEN_COMPLAINT_MAX_NAME, prefillComplainantName } from '../../js/eden-complaints.js';

test('a missing private profile falls back to the signed-in Auth display name', async () => {
  const input = { value: '' };
  const filled = await prefillComplainantName(input, async () => ({
    peekAccountState: async () => ({ isGuest: false, displayName: 'Auth display name' }),
    loadAccountProfile: async () => null,
  }));

  assert.equal(filled, true);
  assert.equal(input.value, 'Auth display name');
});

test('guest accounts are not loaded and never prefill a complaint identity', async () => {
  const input = { value: '' };
  let profileLoads = 0;
  const filled = await prefillComplainantName(input, async () => ({
    peekAccountState: async () => ({ isGuest: true, displayName: 'Anonymous' }),
    loadAccountProfile: async () => {
      profileLoads += 1;
      return { gameName: 'Must not be used' };
    },
  }));

  assert.equal(filled, false);
  assert.equal(profileLoads, 0);
  assert.equal(input.value, '');
});

test('the account game name wins, is bounded, and an already typed name is preserved', async () => {
  const longName = 'A'.repeat(EDEN_COMPLAINT_MAX_NAME + 10);
  const input = { value: '' };
  let serviceLoads = 0;
  const loadAccountServices = async () => {
    serviceLoads += 1;
    return {
      peekAccountState: async () => ({ isGuest: false, displayName: 'Auth name' }),
      loadAccountProfile: async () => ({ gameName: longName, displayName: 'Profile name' }),
    };
  };

  assert.equal(await prefillComplainantName(input, loadAccountServices), true);
  assert.equal(input.value.length, EDEN_COMPLAINT_MAX_NAME);
  assert.equal(
    await prefillComplainantName({ value: 'Already typed' }, loadAccountServices),
    false
  );
  assert.equal(serviceLoads, 1);
});
