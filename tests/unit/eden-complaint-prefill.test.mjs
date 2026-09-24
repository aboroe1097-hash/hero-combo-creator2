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

function nameField(value = '') {
  return Object.assign(new EventTarget(), { value });
}

function typeInto(input, value) {
  input.value = value;
  input.dispatchEvent(new Event('input'));
}

function deferred() {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

test('a failed profile lookup leaves the field to the member', async () => {
  const input = nameField();
  const filled = await prefillComplainantName(input, async () => ({
    peekAccountState: async () => ({ isGuest: false, displayName: 'Auth name' }),
    loadAccountProfile: async () => {
      throw new Error('offline');
    },
  }));

  assert.equal(filled, false);
  assert.equal(input.value, '');
});

test('a name typed while the profile lookup is pending is never overwritten', async () => {
  const input = nameField();
  const profile = deferred();
  let lookupStarted;
  const started = new Promise((resolve) => {
    lookupStarted = resolve;
  });
  const pending = prefillComplainantName(input, async () => ({
    peekAccountState: async () => ({ isGuest: false, displayName: 'Auth name' }),
    loadAccountProfile: () => {
      lookupStarted();
      return profile.promise;
    },
  }));

  await started;
  typeInto(input, 'Someone else');
  profile.resolve({ gameName: 'Account name' });

  assert.equal(await pending, false);
  assert.equal(input.value, 'Someone else');
});

test('a field the member typed in and cleared during the lookup is not refilled', async () => {
  const input = nameField();
  const profile = deferred();
  let lookupStarted;
  const started = new Promise((resolve) => {
    lookupStarted = resolve;
  });
  const pending = prefillComplainantName(input, async () => ({
    peekAccountState: async () => ({ isGuest: false, displayName: 'Auth name' }),
    loadAccountProfile: () => {
      lookupStarted();
      return profile.promise;
    },
  }));

  await started;
  typeInto(input, 'X');
  typeInto(input, '');
  profile.resolve({ gameName: 'Account name' });

  assert.equal(await pending, false);
  assert.equal(input.value, '');
});
